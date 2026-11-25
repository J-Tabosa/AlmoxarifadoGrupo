import { Component, HostListener, inject, OnDestroy } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Busca, Grupo, PlantaService, Posicao } from '../../services/planta';

@Component({
    selector: 'app-painel',
    imports: [FormsModule, NgClass],
    templateUrl: './painel.html',
    styleUrl: './painel.css'
})
export class Painel implements OnDestroy {
    readonly planta = inject(PlantaService);
    group = this.planta.activeGroup;
    selected = this.group.slots.find(s => !s.blocked)!;

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
    private previousOverflow = '';

    pad(n: number): string { return String(n).padStart(2, '0'); }
    rackName(s: Posicao): string { return 'L' + this.pad(s.r) + ' · C' + this.pad(s.c); }

    selectGroup(g: Grupo): void {
        this.group = g;
        this.planta.selectGroup(g.key);
        this.selected = g.slots.find(s => !s.blocked)!;
    }

    match(s: Posicao): boolean { return this.planta.matchingRack(s, this.query, this.mode); }
    countMatches(g: Grupo): number { return g.slots.filter(s => this.match(s)).length; }
    get totalMatches(): number { return this.planta.groups.reduce((n, g) => n + this.countMatches(g), 0); }
    get activeCount(): number { return this.group.slots.filter(s => !s.blocked).length; }
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

    openRack(slot: Posicao): void {
        if (slot.blocked) return;
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
        this.rack = null;
        document.body.style.overflow = this.previousOverflow;
    }

    @HostListener('document:keydown.escape')
    escape(): void { this.closeRack(); }
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

    construction(feature: string): void {
        const message = feature + ' — em construção.';
        if (this.rack) this.rackNotice = message;
        else this.notice = message;
    }
}
