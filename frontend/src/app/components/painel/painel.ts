import { ChangeDetectorRef, Component, ElementRef, HostListener, inject, OnDestroy } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Busca, Conteudo, Grupo, PlantaService, Posicao } from '../../services/planta';
import { ItensService } from '../../services/itens.service';
import { ItemModel } from '../../models/item.model';
import { FichaItem } from '../ficha-item/ficha-item';
import { MapPan } from '../../shared/map-pan';
import { DialogoService } from '../../core/dialogo.service';

@Component({
    selector: 'app-painel',
    imports: [FormsModule, NgClass, RouterLink, FichaItem, MapPan],
    templateUrl: './painel.html',
    styleUrl: './painel.css'
})
export class Painel implements OnDestroy {
    readonly planta = inject(PlantaService);
    private readonly itensApi = inject(ItensService);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly host: HTMLElement = inject(ElementRef<HTMLElement>).nativeElement;
    private readonly dialogo = inject(DialogoService);
    rackLookup = false;
    rackId = '';
    rackLookupError = '';
    private lookupPrevious: HTMLElement | null = null;
    private keyboardRack = false;
    mapZoom = 100;
    group = this.planta.activeGroup;

    constructor() { this.planta.refreshStock(); }
    selected: Posicao | null = this.group.slots.find(s => !s.blocked) ?? null;

    // A busca do mapa é aplicada somente quando o usuário confirma.
    searchText = '';
    searchMode: Busca = 'all';
    query = '';
    mode: Busca = 'all';
    notice = '';

    // Estado do modal de estante: busca independente, nível e visualização.
    rack: Posicao | null = null;
    level = 1;
    rackQuery = '';
    rackMode: Busca = 'name';
    rackView: 'grid' | 'list' = 'grid';
    rackCount = 5;
    rackNotice = '';
    fichaItem: ItemModel | null = null;
    fichaOrigem: Conteudo | null = null;
    private previousOverflow = '';

    pad(n: number): string { return String(n).padStart(2, '0'); }
    rackName(s: Posicao): string { return 'L' + this.pad(s.r) + ' · C' + this.pad(s.c); }

    // A descrição substitui apenas o nome visual; coordenadas e ID continuam estáveis.
    displayName(s: Posicao): string {
        return s.descricao?.trim() || this.pad(s.r) + '-' + this.pad(s.c);
    }

    selectGroup(g: Grupo): void {
        this.group = g;
        this.planta.selectGroup(g.key);
        this.selected = g.slots.find(s => !s.blocked) ?? null;
    }

    /** A escala é relativa ao tamanho responsivo normal da planta. */
    zoomMap(event: WheelEvent): void {
        if (event.deltaY === 0 || event.ctrlKey || event.metaKey) return;
        event.preventDefault();
        const next = Math.max(50, Math.min(250, this.mapZoom + (event.deltaY < 0 ? 10 : -10)));
        this.setMapZoom(next, event.currentTarget as HTMLElement, event.clientX, event.clientY);
    }

    resetMapZoom(viewport: HTMLElement): void {
        const rect = viewport.getBoundingClientRect();
        this.setMapZoom(100, viewport, rect.left + viewport.clientWidth / 2, rect.top + viewport.clientHeight / 2);
    }

    private setMapZoom(next: number, viewport: HTMLElement, x: number, y: number): void {
        if (next === this.mapZoom) return;
        const grid = viewport.querySelector<HTMLElement>('#addressGrid');
        if (!grid) return;
        const before = grid.getBoundingClientRect();
        const fx = before.width ? (x - before.left) / before.width : 0;
        const fy = before.height ? (y - before.top) / before.height : 0;
        this.mapZoom = next;
        this.cdr.detectChanges();
        const after = grid.getBoundingClientRect();
        viewport.scrollLeft += after.left + fx * after.width - x;
        viewport.scrollTop += after.top + fy * after.height - y;
    }

    match(s: Posicao): boolean { return this.planta.matchingRack(s, this.query, this.mode); }
    countMatches(g: Grupo): number { return g.slots.filter(s => this.match(s)).length; }
    get totalMatches(): number { return this.planta.groups.reduce((n, g) => n + this.countMatches(g), 0); }
    get activeCount(): number { return this.group.slots.filter(s => !s.blocked).length; }

    // Indicadores locais: não misturam quantidades de materiais com unidades diferentes.
    get distinctMaterials(): number {
        return new Set((this.selected?.contents ?? []).map(item => item.itemCode)).size;
    }

    get occupiedLevels(): number {
        if (!this.selected) return 0;
        const total = this.planta.shelfCount(this.selected);
        return new Set(this.selected.contents.filter(item => item.qty > 0 &&
            item.level >= 1 && item.level <= total).map(item => item.level)).size;
    }
    get searchStatus(): string {
        if (!this.query) return 'Pesquise para localizar estantes';
        if (!this.totalMatches) return 'Nenhuma estante encontrada';
        return this.totalMatches + ' estante(s) em ' + this.planta.groups.filter(g => this.countMatches(g)).length +
            ' grupo(s) · ' + this.countMatches(this.group) + ' neste grupo';
    }

    /** Resultados ordenados por grupo, linha e coluna, com os mesmos critérios do destaque. */
    get searchResults(): { group: Grupo; slot: Posicao }[] {
        return this.planta.groups.flatMap(group => group.slots
            .filter(slot => this.match(slot))
            .sort((a, b) => a.r - b.r || a.c - b.c)
            .map(slot => ({ group, slot })));
    }

    get resultIndex(): number {
        return this.searchResults.findIndex(result => result.group.key === this.group.key &&
            result.slot.idlocalizacao === this.selected?.idlocalizacao);
    }

    search(): void {
        this.query = this.planta.normalize(this.searchText);
        this.mode = this.searchMode;
        const results = this.searchResults;
        const first = results.find(result => result.group.key === this.group.key) ?? results[0];
        if (first) this.focusResult(first);
    }

    clearSearch(): void { this.searchText = ''; this.query = ''; }

    private focusResult(result: { group: Grupo; slot: Posicao }): void {
        if (this.group.key !== result.group.key) this.selectGroup(result.group);
        this.selectPosition(result.slot);
        this.cdr.detectChanges();
        this.focusSelectedTile();
    }

    /** Só a área interna do mapa rola para mostrar o resultado, inclusive com zoom. */
    private focusSelectedTile(): void {
        if (!this.selected) return;
        const viewport = this.host.querySelector<HTMLElement>('.map-viewport');
        const tile = viewport?.querySelector<HTMLElement>('[data-rack-id="' + this.selected.idlocalizacao + '"]');
        if (!viewport || !tile) return;
        tile.focus({ preventScroll: true });
        const v = viewport.getBoundingClientRect();
        const t = tile.getBoundingClientRect();
        const left = v.left + viewport.clientLeft, top = v.top + viewport.clientTop;
        const right = left + viewport.clientWidth, bottom = top + viewport.clientHeight;
        if (t.left < left) viewport.scrollLeft += t.left - left - 4;
        else if (t.right > right) viewport.scrollLeft += t.right - right + 4;
        if (t.top < top) viewport.scrollTop += t.top - top - 4;
        else if (t.bottom > bottom) viewport.scrollTop += t.bottom - bottom + 4;
    }

    openRackLookup(): void {
        if (this.rack || this.rackLookup || this.dialogo.estado()) return;
        this.lookupPrevious = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        this.rackId = '';
        this.rackLookupError = '';
        this.rackLookup = true;
        this.cdr.detectChanges();
        this.host.querySelector<HTMLInputElement>('#rackLookupId')?.focus();
    }

    closeRackLookup(restoreFocus = true): void {
        this.rackLookup = false;
        this.rackLookupError = '';
        this.cdr.detectChanges();
        if (restoreFocus) this.lookupPrevious?.focus({ preventScroll: true });
        this.lookupPrevious = null;
    }

    goToRack(): void {
        const raw = this.rackId.trim().replace(/^#/, '');
        if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw)) || Number(raw) < 1) {
            this.rackLookupError = 'Informe o ID numérico da estante.';
            return;
        }
        const id = Number(raw);
        const group = this.planta.groups.find(g => g.slots.some(s => s.idlocalizacao === id && !s.blocked));
        const slot = group?.slots.find(s => s.idlocalizacao === id && !s.blocked);
        if (!group || !slot) {
            this.rackLookupError = 'Estante #' + id + ' não encontrada ou desativada.';
            return;
        }
        this.closeRackLookup(false);
        this.clearSearch();
        this.focusResult({ group, slot });
        this.openRackByKeyboard(slot);
    }

    private openRackByKeyboard(slot: Posicao): void {
        this.keyboardRack = true;
        this.openRack(slot);
        this.cdr.detectChanges();
        this.host.querySelector<HTMLElement>('.estante-modal .dialog-head button')?.focus({ preventScroll: true });
    }

    @HostListener('document:keydown', ['$event'])
    handlePanelShortcut(event: KeyboardEvent): void {
        if (event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey || this.dialogo.estado() || this.rack || this.rackLookup) return;
        const target = event.target instanceof HTMLElement ? event.target : document.activeElement;
        const editing = !!target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])');
        // Não captura Caps Lock enquanto o usuário digita, nem impede Tab nos outros campos.
        if (event.key === 'CapsLock' && !editing && !event.repeat) {
            event.preventDefault();
            this.openRackLookup();
            return;
        }
        const mapFocus = !!target?.closest('.map-viewport') || target === document.body || !target;
        if (event.key === 'Tab' && !event.shiftKey && !editing && mapFocus) {
            event.preventDefault();
            const input = this.host.querySelector<HTMLInputElement>('.map-search-field input');
            input?.focus();
            input?.select();
            return;
        }
        if (editing || !mapFocus || !this.query) return;
        const results = this.searchResults;
        if (!results.length) return;
        const index = this.resultIndex;
        if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) {
            event.preventDefault();
            const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
            const next = index < 0 ? (step > 0 ? 0 : results.length - 1) : (index + step + results.length) % results.length;
            this.focusResult(results[next]);
        } else if (event.key === 'Enter' && index >= 0 && !event.repeat) {
            event.preventDefault();
            this.openRackByKeyboard(results[index].slot);
        }
    }

    status(slot: Posicao): string {
        return { good: 'Em dia', low: 'Requer atenção', empty: 'Sem saldo / vazia', review: 'Conferência' }[this.planta.situacao(slot)];
    }

    tag(slot: Posicao): string {
        return { good: 'ok', low: 'bad', empty: 'neutral', review: 'warn' }[this.planta.situacao(slot)];
    }

    // Selecionar uma estante não abre a ficha: apenas atualiza os dados ao lado.
    selectPosition(slot: Posicao): void {
        if (!slot.blocked) this.selected = slot;
    }

    openRack(slot: Posicao | null): void {
        if (!slot || slot.blocked) return;
        this.selectPosition(slot);
        this.rack = slot;
        this.level = 1;
        this.rackMode = this.match(slot) ? this.mode : 'name';
        this.rackQuery = this.match(slot) ? this.searchText : '';
        this.rackCount = this.planta.shelfCount(slot);
        this.rackNotice = '';
        this.previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
    }

    closeRack(): void {
        if (!this.rack) return;
        this.fecharFichaItem();
        this.rack = null;
        document.body.style.overflow = this.previousOverflow;
        if (this.keyboardRack) {
            this.keyboardRack = false;
            this.cdr.detectChanges();
            this.focusSelectedTile();
        }
    }

    @HostListener('document:keydown.escape')
    escape(): void {
        if (this.dialogo.estado()) return;
        if (this.rackLookup) this.closeRackLookup();
        else if (this.fichaItem) this.fecharFichaItem();
        else this.closeRack();
    }
    ngOnDestroy(): void {
        // Destruição da rota não deve tentar focar elementos que estão saindo da tela.
        this.keyboardRack = false;
        this.closeRack();
    }

    get levels(): number[] {
        return this.rack ? Array.from({ length: this.planta.shelfCount(this.rack) }, (_, i) => i + 1) : [];
    }

    get entries() {
        if (!this.rack) return [];
        const query = this.planta.normalize(this.rackQuery);
        return this.rack.contents.map(p => ({ ...p, item: this.planta.material(p.itemCode)! }))
            .filter(p => p.item && (query ? this.planta.matches(p.item, query, this.rackMode) : p.level === this.level))
            .sort((a, b) => a.level - b.level || a.position - b.position);
    }

    levelCount(n: number): number { return this.rack?.contents.filter(p => p.level === n).length ?? 0; }
    selectLevel(n: number): void { this.level = n; this.rackQuery = ''; }
    entryLabel(qty: number, stock: number, min: number): string {
        return qty === 0 ? 'Zerado' : stock < min ? 'Abaixo do mínimo' : 'Regular';
    }
    entryTag(qty: number, stock: number, min: number): string {
        return qty === 0 ? 'neutral' : stock < min ? 'warn' : 'ok';
    }

    applyRackCount(reset = false): void {
        if (!this.rack) return;
        const error = this.planta.setShelfCount(this.rack, reset ? null : this.rackCount);
        this.rackNotice = error || this.planta.avisoPersistencia || 'Configuração salva.';
        this.rackCount = this.planta.shelfCount(this.rack);
        this.level = Math.min(this.level, this.rackCount);
    }

    abrirFichaItem(posicao: Conteudo): void {
        const id = Number(posicao.itemCode.split('-').pop());
        const rack = this.rack;
        if (!rack || !Number.isSafeInteger(id) || id < 1) return;
        this.itensApi.listar().subscribe({
            next: itens => {
                if (this.rack !== rack) return;
                const item = itens.find(i => i.idItem === id);
                if (!item) {
                    this.rackNotice = 'Item não encontrado no catálogo.';
                    return;
                }
                this.fichaOrigem = posicao;
                this.fichaItem = item;
            },
            error: () => this.rackNotice = 'Não foi possível consultar a ficha do item.'
        });
    }

    fecharFichaItem(): void {
        this.fichaItem = null;
        this.fichaOrigem = null;
    }

    construction(feature: string): void {
        const message = feature + ' — em construção.';
        if (this.rack) this.rackNotice = message;
        else this.notice = message;
    }
}
