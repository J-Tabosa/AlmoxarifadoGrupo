import { TestBed } from '@angular/core/testing';
import { validarMovimentacaoPermitida } from '../core/banco-local.service';
import { InventarioModel } from '../models/inventario.model';
import { InventariosService } from './inventarios.service';
import { PlantaService } from './planta';

describe('InventariosService', () => {
  let service: InventariosService;
  let planta: PlantaService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [InventariosService] });
    service = TestBed.inject(InventariosService);
    planta = TestBed.inject(PlantaService);
  });

  function payload() {
    const grupo = planta.groups[0];
    const estante = grupo.slots.find(s => !s.blocked)!;
    return {
      idResponsavel: 1,
      idsContadores: [2],
      prateleiras: [{ grupoKey: grupo.key, idEstante: estante.idlocalizacao, nivel: 1 }],
    };
  }

  it('inicia inventário com equipe e níveis selecionados', () => {
    let criado: InventarioModel | undefined;
    service.iniciar(payload()).subscribe(registro => criado = registro);
    expect(criado?.status).toBe('em_andamento');
    expect(criado?.responsavel.nomeFu).toBe('Carlos Almeida');
    expect(criado?.contadores.map(c => c.nomeFu)).toEqual(['Mariana Santos']);
    expect(criado?.prateleiras.length).toBe(1);
    expect(criado?.dataInicio).toBeTruthy();
  });

  it('não permite iniciar dois inventários simultaneamente', () => {
    service.iniciar(payload()).subscribe();
    let mensagem = '';
    service.iniciar(payload()).subscribe({ error: erro => mensagem = erro.message });
    expect(mensagem).toContain('Já existe um inventário em andamento');
  });

  it('calcula total de divergências e justificadas a partir das contagens', () => {
    let criado: InventarioModel | undefined;
    service.iniciar(payload()).subscribe(registro => criado = registro);
    const chavePrateleira = criado!.prateleiras[0].chave;
    let finalizado: InventarioModel | undefined;
    service.finalizar(criado!.idInventario, [
      { chavePrateleira, idItem: null, descricaoItem: 'Material não cadastrado', quantidadeContada: 3, justificativa: 'Conferido com a nota fiscal.' },
      { chavePrateleira, idItem: 1, descricaoItem: '', quantidadeContada: 1, justificativa: '' },
    ]).subscribe(registro => finalizado = registro);
    expect(finalizado?.status).toBe('finalizado');
    expect(finalizado?.dataFim).toBeTruthy();
    expect(finalizado?.quantidadeDivergencias).toBe(2);
    expect(finalizado?.quantidadeJustificadas).toBe(1);
    expect(finalizado?.divergencias[0].diferenca).toBe(3);
    expect(finalizado?.divergencias[0].justificativa).toContain('nota fiscal');
  });

  it('não permite registrar como divergência uma quantidade igual ao saldo de referência', () => {
    let criado: InventarioModel | undefined;
    service.iniciar(payload()).subscribe(registro => criado = registro);
    let mensagem = '';
    service.finalizar(criado!.idInventario, [
      { chavePrateleira: criado!.prateleiras[0].chave, idItem: null, descricaoItem: 'Material', quantidadeContada: 0 },
    ]).subscribe({ error: erro => mensagem = erro.message });
    expect(mensagem).toContain('igual ao saldo de referência');
  });

  it('bloqueia movimentos de estoque enquanto existe inventário aberto', () => {
    const inventario = { idInventario: 9, status: 'em_andamento' } as InventarioModel;
    expect(() => validarMovimentacaoPermitida({ inventarios: [inventario] })).toThrowError(/bloqueadas durante o inventário/);
    expect(() => validarMovimentacaoPermitida({ inventarios: [] })).not.toThrow();
  });
});
