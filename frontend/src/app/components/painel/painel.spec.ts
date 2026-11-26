import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Painel } from './painel';
import { provideRouter } from '@angular/router';

describe('Painel', () => {
  let component: Painel;
  let fixture: ComponentFixture<Painel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Painel],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Painel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renderiza um grupo sem estantes ativas e não abre ficha', () => {
    const group = component.group;
    const old = group.slots.map(s => s.blocked);
    const selection = component.selected;
    try {
      group.slots.forEach(s => s.blocked = true);
      component.selected = null;
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('button.address-tile').length).toBe(0);
      expect(fixture.nativeElement.querySelector('.detail-console').textContent).toContain('não possui estantes ativas');
      component.openRack(null);
      expect(component.rack).toBeNull();
    } finally {
      group.slots.forEach((s, i) => s.blocked = old[i]);
      component.selected = selection;
    }
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

  it('ajusta apenas o zoom do mapa e preserva seleção e coordenadas', () => {
    fixture.detectChanges();
    const viewport = fixture.nativeElement.querySelector('.map-viewport') as HTMLElement;
    const selected = component.selected;
    const ids = component.group.slots.map(s => s.idlocalizacao);
    const wheel = (deltaY: number, target: HTMLElement = viewport) => {
      const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY });
      target.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(wheel(-100)).toBe(true);
    expect(component.mapZoom).toBe(110);
    expect(viewport.style.getPropertyValue('--map-zoom')).toBe('1.1');
    expect(wheel(-100, fixture.nativeElement.querySelector('.detail-console'))).toBe(false);
    expect(component.mapZoom).toBe(110);
    for (let i = 0; i < 30; i++) wheel(-100);
    expect(component.mapZoom).toBe(250);
    for (let i = 0; i < 30; i++) wheel(100);
    expect(component.mapZoom).toBe(50);
    (fixture.nativeElement.querySelector('.panel-map-zoom') as HTMLButtonElement).click();
    expect(component.mapZoom).toBe(100);
    expect(component.selected).toBe(selected);
    expect(component.group.slots.map(s => s.idlocalizacao)).toEqual(ids);
  });

  it('mostra o nome personalizado como título da ficha lateral', () => {
    const original = component.selected!.descricao;
    try {
      component.selected!.descricao = 'Papelaria';
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.rack-main-name').textContent.trim()).toBe('Papelaria');
      component.selected!.descricao = '';
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.rack-main-name').textContent.trim()).toBe(component.displayName(component.selected!));
    } finally {
      component.selected!.descricao = original;
    }
  });

  it('mantém as ações operacionais na barra de pesquisa', () => {
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('.map-searchbar .panel-quick-actions button');
    expect(buttons.length).toBe(1);
    expect(buttons[0].type).toBe('button');
    expect(buttons[0].textContent).toContain('Nova entrada');
    expect(fixture.nativeElement.querySelectorAll('.panel-search-controls > .btn').length).toBe(2);
    expect(fixture.nativeElement.querySelector('.desktop-heading')).toBeNull();
  });

  it('calcula materiais distintos e prateleiras com saldo sem duplicar níveis', () => {
    const original = component.selected!.contents;
    try {
      component.selected!.contents = [
        { level: 1, position: 1, itemCode: 'A', qty: 3 },
        { level: 1, position: 2, itemCode: 'B', qty: 2 },
        { level: 2, position: 1, itemCode: 'A', qty: 1 },
        { level: 3, position: 1, itemCode: 'C', qty: 0 }
      ];
      expect(component.distinctMaterials).toBe(3);
      expect(component.occupiedLevels).toBe(2);
    } finally {
      component.selected!.contents = original;
    }
  });

  it('exibe a ficha somente leitura e fecha sem perder a estante', () => {
    component.openRack(component.selected);
    component.fichaItem = {
      idItem: 999, idCategoria: 1, descricaoItem: 'Material de teste', unidade: 'UN', statusIt: 'A',
      estoques: [{ idItem: 999, idLocalizacao: 99, saldo: 4, eMinimo: 1, eMaximo: 10 }]
    };
    component.fichaOrigem = { level: 1, position: 1, itemCode: 'ITEM-999', qty: 4 };
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('app-ficha-item');
    expect(dialog).toBeTruthy();
    expect(dialog.querySelectorAll('input:not([readonly])').length).toBe(0);
    expect((dialog.querySelector('#fichaDescricao') as HTMLInputElement).value).toBe('Material de teste');
    expect(dialog.textContent).toContain('Realizar entrada');
    expect(dialog.textContent).toContain('Realizar saída');
    component.escape();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-ficha-item')).toBeNull();
    expect(component.rack).toBe(component.selected);
    component.closeRack();
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
