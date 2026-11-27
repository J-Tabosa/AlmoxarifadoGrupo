import { TestBed } from '@angular/core/testing';
import { BancoLocal, BancoLocalService, removerEstoquesDemonstrativos } from './banco-local.service';
import { ItensService } from '../services/itens.service';

describe('Limpeza de estoques de demonstração', () => {
  const key = 'almoxarifado.crud.local.v1';
  let anterior: string | null;

  beforeEach(() => {
    anterior = localStorage.getItem(key);
    localStorage.removeItem(key);
  });
  afterEach(() => anterior === null ? localStorage.removeItem(key) : localStorage.setItem(key, anterior));

  function legado(): BancoLocal {
    let dados!: BancoLocal;
    TestBed.inject(BancoLocalService).ler(d => d).subscribe(d => dados = d);
    dados.localizacoes = [
      { idLocalizacao: 1, sala: 'Almoxarifado', andar: 'Térreo', statusL: 'A', posicao: 'A-01' },
      { idLocalizacao: 3, sala: 'Depósito Principal', andar: '', statusL: 'A', posicao: '01-01 / P1 / Pos. 1',
        grupoKey: 'central', idEstante: 1, prateleira: 1, posicaoInterna: 1 }
    ];
    dados.itens[0].estoques = [
      { idItem: 1, idLocalizacao: 1, saldo: 25, eMinimo: 5, eMaximo: 100 },
      { idItem: 1, idLocalizacao: 3, saldo: 50, eMinimo: 0, eMaximo: 0 }
    ];
    dados.itens[0].saldoTotal = 75;
    return dados;
  }

  it('inicia sem saldos fictícios e cadastra novos itens sem estoque', () => {
    const api = TestBed.inject(ItensService);
    api.listar().subscribe(itens => expect(itens.every(i => i.saldoTotal === 0 && !i.estoques?.length)).toBe(true));
    api.listarLocalizacoes().subscribe(locais => expect(locais).toEqual([]));
    api.criar({ idCategoria: 1, descricaoItem: 'Material novo', unidade: 'UN', statusIt: 'A', estoques: [] })
      .subscribe(item => { expect(item.estoques).toEqual([]); expect(item.saldoTotal).toBe(0); });
  });

  it('remove o saldo demonstrativo de 25 e conserva as 50 unidades reais', () => {
    const dados = legado();
    expect(removerEstoquesDemonstrativos(dados)).toBe(true);
    expect(dados.itens[0].saldoTotal).toBe(50);
    expect(dados.itens[0].estoques!.map(e => e.idLocalizacao)).toEqual([3]);
    expect(dados.localizacoes.map(l => l.idLocalizacao)).toEqual([3]);
    expect(removerEstoquesDemonstrativos(dados)).toBe(false);
  });

  it('preserva saldos modificados ou vinculados a movimentações', () => {
    const dados = legado();
    dados.itens[0].estoques![0].saldo = 20;
    expect(removerEstoquesDemonstrativos(dados)).toBe(false);
    dados.itens[0].estoques![0].saldo = 25;
    dados.requisicoes.push({ idRequisicao: 1, idFuncionario: 2, idAlmoxarife: 1, dataHoraS: '2026-11-26',
      justificativa: '', tipoS: 'consumo', itens: [{ idItem: 1, idLocalizacao: 1, quantidadeS: 1 }] });
    expect(removerEstoquesDemonstrativos(dados)).toBe(false);
  });
});
