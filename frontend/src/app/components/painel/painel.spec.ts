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

  it('exibe ou oculta as posições desativadas sem mudar suas coordenadas', async () => {
    const slot = component.group.slots.find(s => !s.blocked && s !== component.selected)!;
    const original = slot.blocked;
    const preference = component.planta.showBlocked;
    try {
      slot.blocked = true;
      component.planta.setShowBlocked(false);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('.address-tile.masked').length).toBe(0);
      component.planta.setShowBlocked(true);
      fixture.detectChanges();
      const masked = Array.from(fixture.nativeElement.querySelectorAll('.address-tile.masked') as NodeListOf<HTMLElement>)
        .find(el => el.style.gridRow === String(slot.r) && el.style.gridColumn === String(slot.c));
      expect(masked).toBeTruthy();
      expect(masked?.tagName).toBe('DIV');
    } finally {
      slot.blocked = original;
      component.planta.setShowBlocked(preference);
    }
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
