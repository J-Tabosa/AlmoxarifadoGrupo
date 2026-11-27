import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Conferencia } from './conferencia';
import { InventariosService } from '../../services/inventarios.service';

describe('Conferencia', () => {
  let component: Conferencia;
  let fixture: ComponentFixture<Conferencia>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [Conferencia] }).compileComponents();
    fixture = TestBed.createComponent(Conferencia);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('cria a tela de inventário', () => {
    expect(component).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Inventários realizados');
  });

  it('disponibiliza níveis individuais das estantes ativas', () => {
    expect(component.opcoesPrateleiras.length).toBeGreaterThan(0);
    const primeira = component.opcoesPrateleiras[0];
    expect(primeira.nivel).toBe(1);
    expect(primeira.chave).toContain('|');
  });

  it('seleciona estantes no pop-up sem perder os níveis individuais', () => {
    component.abrirModalInicio();
    component.abrirMapaSelecao('inicio');
    const g = component.grupoMapa!;
    const s = g.slots.find(s => !s.blocked)!;
    component.clicarEstanteMapa(g, s);
    expect(component.prateleirasSelecionadas.length).toBe(component.planta.shelfCount(s));
    const p = component.niveisEstanteMapa[0];
    component.alternarPrateleira(p.chave, false);
    expect(component.quantidadeMarcada(g, s)).toBe(component.planta.shelfCount(s) - 1);
    component.fecharComEscape();
    expect(component.mapaSelecao).toBeNull();
    expect(component.modalInicioAberto).toBe(true);
  });

  it('preenche a localização da divergência apenas com níveis auditados', () => {
    const g = component.planta.groups[0];
    const slots = g.slots.filter(s => !s.blocked);
    TestBed.inject(InventariosService).iniciar({
      idResponsavel: component.funcionarios[0].idFuncionario,
      idsContadores: [component.funcionarios[1].idFuncionario],
      prateleiras: [{ grupoKey: g.key, idEstante: slots[0].idlocalizacao, nivel: 2 }]
    }).subscribe(inventario => {
      component.abrirFinalizacao(inventario);
      component.adicionarDivergencia();
      component.clicarEstanteMapa(g, slots[1]);
      expect(component.divergenciasForm.length).toBe(0);
      component.clicarEstanteMapa(g, slots[0]);
      expect(component.divergenciasForm.length).toBe(1);
      expect(component.divergenciasForm[0].chavePrateleira).toBe(inventario.prateleiras[0].chave);
      expect(component.mapaSelecao).toBeNull();
      expect(component.podeFinalizar).toBe(false);
    });
  });

  it('habilita iniciar somente com responsável, contador e prateleira', () => {
    expect(component.podeIniciar).toBe(false);
    component.idResponsavel = component.funcionarios[0].idFuncionario;
    component.alternarContador(component.funcionarios[1].idFuncionario, true);
    component.alternarPrateleira(component.opcoesPrateleiras[0].chave, true);
    expect(component.podeIniciar).toBe(true);
  });
});
