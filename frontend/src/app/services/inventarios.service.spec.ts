import { TestBed } from '@angular/core/testing';
import { validarMovimentacaoPermitida } from '../core/banco-local.service';
import { InventarioModel } from '../models/inventario.model';
import { InventariosService } from './inventarios.service';
import { PlantaService } from './planta';
import { AlertasService } from './alertas.service';
import { BancoLocalService } from '../core/banco-local.service';

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

  it('integra divergências finalizadas aos alertas sem duplicar ou alterar o saldo', () => {
    const alertas = TestBed.inject(AlertasService);
    const banco = TestBed.inject(BancoLocalService);
    let criado!: InventarioModel;
    service.iniciar(payload()).subscribe(r => criado = r);
    alertas.listar().subscribe(a => expect(a.filter(x => x.tipo === 'divergencia_inventario').length).toBe(0));
    service.finalizar(criado.idInventario, [{
      chavePrateleira: criado.prateleiras[0].chave, idItem: 1, descricaoItem: '', quantidadeContada: 3
    }]).subscribe();
    let id = 0;
    banco.ler(d => d.alertas ?? []).subscribe(a => {
      const ocorrencias = a.filter(x => x.tipo === 'divergencia_inventario');
      expect(ocorrencias.length).toBe(1);
      id = ocorrencias[0].id;
      expect(ocorrencias[0].diferenca).toBe(3);
    });
    alertas.listar().subscribe(a => expect(a.filter(x => x.tipo === 'divergencia_inventario').length).toBe(1));
    alertas.registrarContramedida(id, { descricao: 'Conferir saldo físico', responsavel: 'Almoxarife', prazo: null, situacao: 'executada' }).subscribe();
    alertas.encerrarDivergencia(id, 'Conferência concluída e autorizada.').subscribe();
    alertas.listar().subscribe(a => {
      const ocorrencias = a.filter(x => x.tipo === 'divergencia_inventario');
      expect(ocorrencias.length).toBe(1);
      expect(ocorrencias[0].estado).toBe('resolvido');
      expect(ocorrencias[0].contramedidas.length).toBe(1);
    });
    banco.ler(d => d.itens[0].estoques![0].saldo).subscribe(s => expect(s).toBe(25));
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

  it('cancela inventário aberto, preserva histórico e libera movimentações', () => {
    let criado!: InventarioModel;
    service.iniciar(payload()).subscribe(registro => criado = registro);

    let cancelado!: InventarioModel;
    service.cancelar(criado.idInventario, 'Cliquei errado ao iniciar o inventário.').subscribe(registro => cancelado = registro);

    expect(cancelado.status).toBe('cancelado');
    expect(cancelado.dataFim).toBeTruthy();
    expect(cancelado.motivoCancelamento).toBe('Cliquei errado ao iniciar o inventário.');
    expect(cancelado.quantidadeDivergencias).toBe(0);

    service.listar().subscribe(registros => {
      expect(registros.length).toBe(1);
      expect(registros[0].status).toBe('cancelado');
      expect(() => validarMovimentacaoPermitida({ inventarios: registros })).not.toThrow();
    });
  });

  it('exige justificativa de pelo menos cinco caracteres para cancelar', () => {
    let criado!: InventarioModel;
    service.iniciar(payload()).subscribe(registro => criado = registro);
    let mensagem = '';
    service.cancelar(criado.idInventario, 'ops').subscribe({ error: erro => mensagem = erro.message });
    expect(mensagem).toContain('justificativa');
    service.listar().subscribe(registros => expect(registros[0].status).toBe('em_andamento'));
  });

  it('não permite cancelar inventário já finalizado', () => {
    let criado!: InventarioModel;
    service.iniciar(payload()).subscribe(registro => criado = registro);
    service.finalizar(criado.idInventario, []).subscribe();
    let mensagem = '';
    service.cancelar(criado.idInventario, 'Cliquei errado.').subscribe({ error: erro => mensagem = erro.message });
    expect(mensagem).toContain('não está mais em andamento');
  });

  it('bloqueia movimentos de estoque enquanto existe inventário aberto', () => {
    const inventario = { idInventario: 9, status: 'em_andamento' } as InventarioModel;
    expect(() => validarMovimentacaoPermitida({ inventarios: [inventario] })).toThrowError(/bloqueadas durante o inventário/);
    expect(() => validarMovimentacaoPermitida({ inventarios: [] })).not.toThrow();
  });
});
