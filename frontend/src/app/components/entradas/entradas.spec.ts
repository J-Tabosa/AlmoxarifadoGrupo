import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Entradas } from './entradas';
import { EntradasService } from '../../services/entradas.service';
import { EntradaPayload } from '../../models/entrada.model';
import { ItensService } from '../../services/itens.service';

describe('Entradas', () => {
  let component: Entradas;
  let fixture: ComponentFixture<Entradas>;
  const keys = ['almoxarifado.crud.local.v1', 'pqn-angular-planta-v1'];
  let previous: (string | null)[];

  beforeEach(async () => {
    previous = keys.map(key => localStorage.getItem(key));
    keys.forEach(key => localStorage.removeItem(key));
    await TestBed.configureTestingModule({ imports: [Entradas], providers: [provideRouter([])] }).compileComponents();
    fixture = TestBed.createComponent(Entradas);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => keys.forEach((key, i) => {
    if (previous[i] === null) localStorage.removeItem(key);
    else localStorage.setItem(key, previous[i]!);
  }));

  it('abre mapa ao escolher grupo e exige prateleira e posição', () => {
    component.trocarGrupo(component.planta.groups[0].key);
    expect(component.mapaAberto).toBe(true);
    component.escolherEstante(component.grupo!.slots[0]);
    expect(component.mapaAberto).toBe(false);
    expect(component.niveis.length).toBe(5);
    expect(component.podeSalvar).toBe(false);
  });

  it('mostra limites editáveis somente para um novo vínculo e valida o máximo', () => {
    component.trocarItem(component.itens[0].idItem);
    component.quantidade = 5;
    component.trocarGrupo(component.planta.groups[0].key);
    component.escolherEstante(component.grupo!.slots[0]);
    component.escolherPrateleira(1);
    component.escolherPosicao(1);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#entradaMinimo')).toBeTruthy();
    component.eMinimo = 2;
    component.eMaximo = 4;
    expect(component.podeSalvar).toBe(false);
    component.eMaximo = 10;
    expect(component.podeSalvar).toBe(true);
    component.salvar();
    component.trocarItem(component.itens[0].idItem);
    component.trocarGrupo(component.planta.groups[0].key);
    component.escolherEstante(component.grupo!.slots[0]);
    component.escolherPrateleira(1);
    component.escolherPosicao(1);
    fixture.detectChanges();
    expect(component.novaConfiguracao).toBe(false);
    expect(component.estoqueDestino?.eMinimo).toBe(2);
    expect(component.estoqueDestino?.eMaximo).toBe(10);
    expect(fixture.nativeElement.querySelector('#entradaMinimo')).toBeNull();
  });

  it('registra entrada, atualiza saldo e não duplica a localização', () => {
    const api = TestBed.inject(EntradasService);
    const g = component.planta.groups[0];
    const slot = g.slots[0];
    const item = component.itens[0];
    const before = item.saldoTotal ?? 0;
    const p: EntradaPayload = { idItem: item.idItem, idFornecedor: null, quantidade: 3, dataHoraE: '2026-11-25T12:00', lote: '', validade: null,
      grupoKey: g.key, idEstante: slot.idlocalizacao, prateleira: 2, posicao: 7, eMinimo: 2, eMaximo: 10 };
    let id = 0;
    api.registrar(p).subscribe(e => id = e.idLocalizacao);
    api.registrar({ ...p, eMinimo: 0, eMaximo: 0 }).subscribe(e => expect(e.idLocalizacao).toBe(id));
    expect(slot.contents.length).toBe(1);
    expect(slot.contents[0].qty).toBe(6);
    expect(slot.contents[0].level).toBe(2);
    expect(slot.contents[0].position).toBe(7);
    TestBed.inject(ItensService).listar().subscribe(itens => {
      const atualizado = itens.find(i => i.idItem === item.idItem)!;
      expect(atualizado.saldoTotal).toBe(before + 6);
      const stock = atualizado.estoques!.find(e => e.idLocalizacao === id)!;
      expect(stock.eMinimo).toBe(2);
      expect(stock.eMaximo).toBe(10);
    });
    let excesso = false;
    api.registrar({ ...p, quantidade: 5 }).subscribe({ error: () => excesso = true });
    expect(excesso).toBe(true);
    expect(slot.contents[0].qty).toBe(6);
    component.planta.refreshStock();
    expect(slot.contents[0].qty).toBe(6);
    let rejected = false;
    api.registrar({ ...p, idItem: component.itens[1].idItem }).subscribe({ error: () => rejected = true });
    expect(rejected).toBe(true);
  });
});
