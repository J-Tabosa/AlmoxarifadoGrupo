import { ChangeDetectorRef, Component, HostListener, inject, OnDestroy } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Busca, Conteudo, Grupo, PlantaService, Posicao } from '../../services/planta';
import { ItensService } from '../../services/itens.service';
import { ItemModel } from '../../models/item.model';
import { FichaItem } from '../ficha-item/ficha-item';
import { MapPan } from '../../shared/map-pan';

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

    search(): void {
        this.query = this.planta.normalize(this.searchText);
        this.mode = this.searchMode;
        if (this.query && !this.countMatches(this.group)) {
            const other = this.planta.groups.find(g => this.countMatches(g) > 0);
            if (other) this.selectGroup(other);
        }
    }

    clearSearch(): void { this.searchText = ''; this.query = ''; }

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
    }

    @HostListener('document:keydown.escape')
    escape(): void {
        if (this.fichaItem) this.fecharFichaItem();
        else this.closeRack();
    }
    ngOnDestroy(): void { this.closeRack(); }

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
