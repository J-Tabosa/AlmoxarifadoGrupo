import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Painel } from './painel';
import { provideRouter } from '@angular/router';
import { BancoLocalService } from '../../core/banco-local.service';
import { InventariosService } from '../../services/inventarios.service';

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

  it('destaca apenas as estantes auditadas e restaura a cor ao concluir ou cancelar', () => {
    const banco = TestBed.inject(BancoLocalService);
    const api = TestBed.inject(InventariosService);
    const g = component.group;
    const [alvo, outra] = g.slots.filter(x => !x.blocked);
    const anterior = component.planta.situacao(alvo);
    const tile = (id: number) => fixture.nativeElement.querySelector('[data-rack-id="' + id + '"]') as HTMLElement;
    let id = 0;
    let originais!: import('../../models/inventario.model').InventarioModel[];
    banco.ler(d => d.inventarios).subscribe(i => originais = i);
    try {
      banco.alterar(d => { d.inventarios = []; }).subscribe();
      const payload = { idResponsavel: 1, idsContadores: [2],
        prateleiras: [{ grupoKey: g.key, idEstante: alvo.idlocalizacao, nivel: 1 }] };
      api.iniciar(payload).subscribe(i => id = i.idInventario);
      fixture.detectChanges();
      expect(tile(alvo.idlocalizacao).classList.contains('review')).toBe(true);
      expect(tile(outra.idlocalizacao).classList.contains('review')).toBe(false);
      expect(component.status(alvo)).toBe('Em inventário');
      api.finalizar(id, []).subscribe();
      fixture.detectChanges();
      expect(tile(alvo.idlocalizacao).classList.contains('review')).toBe(false);
      api.iniciar(payload).subscribe(i => id = i.idInventario);
      api.cancelar(id, 'Contagem cancelada para teste').subscribe();
      fixture.detectChanges();
      expect(tile(alvo.idlocalizacao).classList.contains('review')).toBe(false);
    } finally {
      banco.alterar(d => { d.inventarios = originais; }).subscribe();
      expect(component.planta.situacao(alvo)).toBe(anterior);
    }
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

  it('abre a ficha pelo ID digitado e mantém aviso para IDs inválidos', () => {
    fixture.detectChanges();
    const slot = component.group.slots.find(s => !s.blocked)!;
    const caps = new KeyboardEvent('keydown', { key: 'CapsLock', bubbles: true, cancelable: true });
    document.body.dispatchEvent(caps);
    expect(caps.defaultPrevented).toBe(true);
    expect(component.rackLookup).toBe(true);
    component.rackId = '999999999';
    component.goToRack();
    expect(component.rackLookupError).toContain('não encontrada');
    const input = fixture.nativeElement.querySelector('#rackLookupId') as HTMLInputElement;
    input.value = String(slot.idlocalizacao);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(component.rackLookup).toBe(false);
    expect(component.rack).toBe(slot);
    component.escape();
    expect(component.rack).toBeNull();
  });

  it('busca pelo nome quando o ID está oculto e pelo número visual quando todos os campos estão ocultos', () => {
    const planta = component.planta;
    const campos = planta.camposEstante;
    const slot = component.group.slots.find(s => !s.blocked)!;
    const nome = slot.descricao;
    try {
      slot.descricao = 'Expedição Teste Único';
      planta.setCampoEstante('id', false);
      planta.setCampoEstante('nome', true);
      component.openRackLookup();
      expect(component.rackLookupMode).toBe('nome');
      component.rackId = 'expedicao teste unico';
      component.goToRack();
      expect(component.rack).toBe(slot);
      component.closeRack();
      planta.setCampoEstante('nome', false);
      planta.setCampoEstante('quantidade', false);
      component.openRackLookup();
      expect(component.rackLookupMode).toBe('numero');
      component.rackId = String(planta.numeroVisual(component.group, slot));
      component.goToRack();
      expect(component.rack).toBe(slot);
    } finally {
      component.closeRack();
      slot.descricao = nome;
      planta.setCampoEstante('nome', campos.nome);
      planta.setCampoEstante('id', campos.id);
      planta.setCampoEstante('quantidade', campos.quantidade);
    }
  });

  it('navega pelos resultados com setas e abre a ficha com Enter', () => {
    const slots = component.group.slots.filter(s => !s.blocked).slice(0, 2);
    const old = slots.map(s => s.contents);
    const code = 'TESTE-ATALHO';
    component.planta.materials.push({ code, name: 'Produto teste atalhos', category: 'Teste', unit: 'UN', stock: 2, min: 0 });
    try {
      slots.forEach(s => s.contents = [{ level: 1, position: 1, itemCode: code, qty: 1 }]);
      fixture.detectChanges();
      component.searchText = 'Produto teste atalhos';
      component.search();
      expect(component.selected).toBe(slots[0]);
      const key = (value: string) => {
        const tile = fixture.nativeElement.querySelector('.address-tile.chosen') as HTMLElement;
        tile.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true }));
      };
      key('ArrowRight');
      expect(component.selected).toBe(slots[1]);
      key('ArrowDown');
      expect(component.selected).toBe(slots[0]);
      key('Enter');
      expect(component.rack).toBe(slots[0]);
      component.escape();
      key('Tab');
      expect(document.activeElement).toBe(fixture.nativeElement.querySelector('.map-search-field input'));
    } finally {
      slots.forEach((s, i) => s.contents = old[i]);
      const index = component.planta.materials.findIndex(m => m.code === code);
      if (index >= 0) component.planta.materials.splice(index, 1);
      component.closeRack();
      component.clearSearch();
    }
  });

  it('navega pelas prateleiras e posições e mantém a preferência de visualização', () => {
    const storageKey = 'pqn-angular-rack-view';
    const previous = localStorage.getItem(storageKey);
    const slot = component.selected!;
    const old = slot.contents;
    const code = 'ITEM-999999';
    component.planta.materials.push({ code, name: 'Teste teclado', category: 'Teste', unit: 'UN', stock: 3, min: 0 });
    try {
      slot.contents = [{ level: 2, position: 1, itemCode: code, qty: 1 }, { level: 2, position: 3, itemCode: code, qty: 2 }];
      component.openRackLookup();
      component.rackId = String(slot.idlocalizacao);
      component.goToRack();
      expect(component.level).toBe(1);
      const key = (target: HTMLElement, value: string) => target.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true }));
      key(fixture.nativeElement.querySelector('[data-rack-level="1"]'), 'ArrowDown');
      expect(component.level).toBe(2);
      key(fixture.nativeElement.querySelector('[data-rack-level="2"]'), 'Enter');
      expect(component.rackFocus).toBe('items');
      expect(component.isFocusedEntry(slot.contents[0])).toBe(true);
      const buttons = fixture.nativeElement.querySelectorAll('[data-rack-entry]') as NodeListOf<HTMLElement>;
      key(buttons[0], 'ArrowDown');
      expect(component.isFocusedEntry(slot.contents[1])).toBe(true);
      component.escape();
      expect(component.rackFocus).toBe('shelves');
      component.setRackView('list');
      expect(localStorage.getItem(storageKey)).toBe('list');
      component.closeRack();
      component.openRack(slot);
      expect(component.rackView).toBe('list');
    } finally {
      component.closeRack();
      slot.contents = old;
      const index = component.planta.materials.findIndex(m => m.code === code);
      if (index >= 0) component.planta.materials.splice(index, 1);
      if (previous === null) localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, previous);
    }
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
