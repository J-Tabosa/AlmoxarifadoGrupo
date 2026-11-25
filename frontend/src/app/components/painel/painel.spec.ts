import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Painel } from './painel';

describe('Painel', () => {
  let component: Painel;
  let fixture: ComponentFixture<Painel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Painel],
    }).compileComponents();

    fixture = TestBed.createComponent(Painel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('deve selecionar a estante sem abrir o modal', async () => {
    const tile = fixture.nativeElement.querySelector('.address-tile') as HTMLButtonElement;
    tile.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.rack).toBeNull();
    expect(tile.classList.contains('chosen')).toBe(true);
    expect(fixture.nativeElement.querySelector('.drawer-overlay')).toBeNull();
  });

  it('deve abrir a ficha somente pelo botão da ficha e fechá-la', async () => {
    const button = fixture.nativeElement.querySelector('.console-actions .btn') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.rack).toBe(component.selected);
    expect(fixture.nativeElement.querySelector('.shelf-list .shelf-btn')).toBeTruthy();

    const close = fixture.nativeElement.querySelector('.dialog-actions > .btn') as HTMLButtonElement;
    close.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.rack).toBeNull();
  });
});
