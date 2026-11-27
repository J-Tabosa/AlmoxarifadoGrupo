import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { BancoLocalService } from '../core/banco-local.service';
import { RequisicoesService } from './requisicoes.service';
import { PlantaService } from './planta';
import { RequisicaoPayload } from '../models/requisicao.model';

describe('RequisicoesService: baixa local', () => {
  const keys = ['almoxarifado.crud.local.v1', 'pqn-angular-planta-v1'];
  let previous: (string | null)[];
  let banco: BancoLocalService;
  let api: RequisicoesService;
  let planta: PlantaService;
  let p: RequisicaoPayload;
  let local: number;

  beforeEach(async () => {
    previous = keys.map(k => localStorage.getItem(k));
    keys.forEach(k => localStorage.removeItem(k));
    banco = TestBed.inject(BancoLocalService);
    planta = TestBed.inject(PlantaService);
    api = TestBed.inject(RequisicoesService);
    const g = planta.groups[0], s = g.slots[0];
    local = 99;
    await firstValueFrom(banco.alterar(d => {
      d.localizacoes.push({ idLocalizacao: local, sala: g.name, andar: '', statusL: 'A', posicao: 'P1 / Pos. 1',
        grupoKey: g.key, idEstante: s.idlocalizacao, prateleira: 1, posicaoInterna: 1 });
      d.itens[0].estoques!.push({ idItem: d.itens[0].idItem, idLocalizacao: local, saldo: 10, eMinimo: 0, eMaximo: 20 });
      d.localizacoes.push({ idLocalizacao: 100, sala: g.name, andar: '', statusL: 'A', posicao: 'P1 / Pos. 2',
        grupoKey: g.key, idEstante: s.idlocalizacao, prateleira: 1, posicaoInterna: 2 });
      d.itens[1].estoques!.push({ idItem: 2, idLocalizacao: 100, saldo: 12, eMinimo: 0, eMaximo: 40 });
    }));
    planta.refreshStock();
    p = { idFuncionario: 2, idAlmoxarife: 1, dataHoraS: '2026-11-25T21:00', justificativa: 'Teste', tipoS: 'consumo',
      itens: [{ idItem: 1, idLocalizacao: local, quantidadeS: 3 }] };
  });

  afterEach(() => keys.forEach((k, i) => previous[i] === null ? localStorage.removeItem(k) : localStorage.setItem(k, previous[i]!)));

  const saldo = () => firstValueFrom(banco.ler(d => d.itens[0].estoques!.find(e => e.idLocalizacao === local)!.saldo));

  it('desconta a origem correta, atualiza a planta e persiste', async () => {
    const r = await firstValueFrom(api.criar(p));
    expect(r.baixaAplicada).toBe(true);
    expect(await saldo()).toBe(7);
    expect(planta.groups[0].slots[0].contents[0].qty).toBe(7);
    expect(await firstValueFrom(banco.ler(d => d.itens[0].estoques!.length))).toBe(1);
    const persistido = JSON.parse(localStorage.getItem(keys[0])!);
    expect(persistido.itens[0].estoques.find((e: {idLocalizacao: number}) => e.idLocalizacao === local).saldo).toBe(7);
  });

  it('aplica apenas a diferença ao editar e devolve ao excluir', async () => {
    const r = await firstValueFrom(api.criar(p));
    await firstValueFrom(api.atualizar(r.idRequisicao, r.idFuncionario, { ...p, itens: [{ ...p.itens[0], quantidadeS: 5 }] }));
    expect(await saldo()).toBe(5);
    await firstValueFrom(api.atualizar(r.idRequisicao, r.idFuncionario, { ...p, itens: [{ ...p.itens[0], quantidadeS: 2 }] }));
    expect(await saldo()).toBe(8);
    await firstValueFrom(api.excluir(r.idRequisicao, r.idFuncionario));
    expect(await saldo()).toBe(10);
  });

  it('reverte todas as linhas quando uma delas excede o saldo', async () => {
    await expect(firstValueFrom(api.criar({ ...p, itens: [...p.itens, { idItem: 2, idLocalizacao: 100, quantidadeS: 999 }] }))).rejects.toThrow();
    expect(await saldo()).toBe(10);
    expect((await firstValueFrom(api.listar())).length).toBe(0);
  });

  it('não devolve saldo ao excluir requisição anterior à implementação', async () => {
    await firstValueFrom(banco.alterar(d => d.requisicoes.push({ ...p, idRequisicao: 77, itens: [{ idItem: 1, quantidadeS: 3 }] })));
    await firstValueFrom(api.excluir(77, p.idFuncionario));
    expect(await saldo()).toBe(10);
  });

  it('remove o conteúdo do mapa ao zerar a posição', async () => {
    await firstValueFrom(api.criar({ ...p, itens: [{ ...p.itens[0], quantidadeS: 10 }] }));
    expect(await saldo()).toBe(0);
    expect(planta.groups[0].slots[0].contents.some(x => x.itemCode === 'ITEM-1')).toBe(false);
  });
});
