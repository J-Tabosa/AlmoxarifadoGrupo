import { TestBed } from '@angular/core/testing';
import { BancoLocalService } from '../core/banco-local.service';
import { AlertasService } from './alertas.service';

describe('AlertasService', () => {
  const keys = ['almoxarifado.crud.local.v1', 'pqn-angular-planta-v1'];
  let previous: (string | null)[];
  let banco: BancoLocalService;
  let api: AlertasService;

  beforeEach(() => {
    previous = keys.map(k => localStorage.getItem(k));
    keys.forEach(k => localStorage.removeItem(k));
    banco = TestBed.inject(BancoLocalService);
    banco.alterar(d => {
      d.localizacoes.push({ idLocalizacao: 1, sala: 'Depósito de teste', andar: '', posicao: 'P1 / Pos. 1',
        statusL: 'A', grupoKey: 'central', idEstante: 1, prateleira: 1, posicaoInterna: 1 });
      d.itens[0].estoques!.push({ idItem: 1, idLocalizacao: 1, saldo: 25, eMinimo: 5, eMaximo: 100 });
    }).subscribe();
    api = TestBed.inject(AlertasService);
  });
  afterEach(() => keys.forEach((k, i) => previous[i] === null ? localStorage.removeItem(k) : localStorage.setItem(k, previous[i]!)));

  it('detecta por localização, mantém contramedidas e encerra apenas quando regularizado', () => {
    banco.alterar(d => { d.itens[0].estoques![0].saldo = 0; }).subscribe();
    let id = 0;
    api.listar().subscribe(a => {
      expect(a.length).toBe(1);
      expect(a[0].gravidade).toBe('critico');
      expect(a[0].idLocalizacao).toBe(1);
      id = a[0].id;
    });
    api.registrarContramedida(id, { descricao: 'Repor material', responsavel: 'Almoxarife', prazo: null, situacao: 'executada' }).subscribe(a => {
      expect(a[0].estado).toBe('aberto');
      expect(a[0].contramedidas.length).toBe(1);
    });
    api.listar().subscribe(a => { expect(a.length).toBe(1); expect(a[0].id).toBe(id); });
    banco.alterar(d => { d.itens[0].estoques![0].saldo = 5; }).subscribe();
    api.listar().subscribe(a => {
      expect(a[0].estado).toBe('resolvido');
      expect(a[0].contramedidas.length).toBe(1);
    });
    banco.alterar(d => { d.itens[0].estoques![0].saldo = 2; }).subscribe();
    api.listar().subscribe(a => {
      expect(a.length).toBe(2);
      expect(a[0].id).not.toBe(id);
      expect(a[0].estado).toBe('aberto');
      expect(a[0].gravidade).toBe('atencao');
    });
  });

  it('não cria divergências fictícias nem alertas sem mínimo configurado', () => {
    banco.alterar(d => { d.itens[0].estoques![0].saldo = 0; d.itens[0].estoques![0].eMinimo = 0; }).subscribe();
    api.listar().subscribe(a => expect(a.length).toBe(0));
  });
});
