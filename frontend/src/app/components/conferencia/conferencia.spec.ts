import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Conferencia } from './conferencia';

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

  it('habilita iniciar somente com responsável, contador e prateleira', () => {
    expect(component.podeIniciar).toBe(false);
    component.idResponsavel = component.funcionarios[0].idFuncionario;
    component.alternarContador(component.funcionarios[1].idFuncionario, true);
    component.alternarPrateleira(component.opcoesPrateleiras[0].chave, true);
    expect(component.podeIniciar).toBe(true);
  });
});
