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

  it('registra entrada, atualiza saldo e não duplica a localização', () => {
    const api = TestBed.inject(EntradasService);
    const g = component.planta.groups[0];
    const slot = g.slots[0];
    const item = component.itens[0];
    const before = item.saldoTotal ?? 0;
    const p: EntradaPayload = { idItem: item.idItem, idFornecedor: null, quantidade: 3, dataHoraE: '2026-11-25T12:00', lote: '', validade: null,
      grupoKey: g.key, idEstante: slot.idlocalizacao, prateleira: 2, posicao: 7 };
    let id = 0;
    api.registrar(p).subscribe(e => id = e.idLocalizacao);
    api.registrar(p).subscribe(e => expect(e.idLocalizacao).toBe(id));
    expect(slot.contents.length).toBe(1);
    expect(slot.contents[0].qty).toBe(6);
    expect(slot.contents[0].level).toBe(2);
    expect(slot.contents[0].position).toBe(7);
    TestBed.inject(ItensService).listar().subscribe(itens => expect(itens.find(i => i.idItem === item.idItem)?.saldoTotal).toBe(before + 6));
    component.planta.refreshStock();
    expect(slot.contents[0].qty).toBe(6);
    let rejected = false;
    api.registrar({ ...p, idItem: component.itens[1].idItem }).subscribe({ error: () => rejected = true });
    expect(rejected).toBe(true);
  });
});
