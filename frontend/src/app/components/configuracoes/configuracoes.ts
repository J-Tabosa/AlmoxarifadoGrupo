import { Component, HostListener, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Grupo, PlantaService, Posicao } from '../../services/planta';

type Aba = 'enderecamento' | 'aparencia' | 'usuarios' | 'seguranca' | 'backup';

@Component({
    selector: 'app-configuracoes',
    imports: [FormsModule, RouterLink],
    templateUrl: './configuracoes.html',
    styleUrl: './configuracoes.css'
})
export class Configuracoes {
    readonly planta = inject(PlantaService);
    readonly tabs: { key: Aba; label: string }[] = [
        { key: 'enderecamento', label: 'Grupos e posições' },
        { key: 'aparencia', label: 'Aparência' },
        { key: 'usuarios', label: 'Usuários e perfis' },
        { key: 'seguranca', label: 'Segurança' },
        { key: 'backup', label: 'Cópia de segurança' }
    ];

    tab: Aba = 'enderecamento';
    groupKey = this.planta.activeGroup.key;
    name = '';
    rows = 8;
    cols = 8;
    defaultCount = this.planta.defaultShelfCount;
    disabled = new Set<string>();
    brush: 'block' | 'restore' = 'block';
    painting = false;
    notice = '';
    globalNotice = '';
    dirty = false;
    dark = document.body.classList.contains('dark');

    constructor() { this.loadGroup(this.planta.activeGroup); }

    get group(): Grupo { return this.planta.groups.find(g => g.key === this.groupKey)!; }

    get validSize(): boolean {
        return Number.isInteger(this.rows) && this.rows >= 1 && this.rows <= 15 &&
            Number.isInteger(this.cols) && this.cols >= 1 && this.cols <= 16;
    }

    get cells() {
        if (!this.validSize) return [];
        const old = new Map([...this.group.slots, ...this.group.archived].map(s => [this.planta.coord(s.r, s.c), s]));
        return Array.from({ length: this.rows * this.cols }, (_, i) => {
            const r = Math.floor(i / this.cols) + 1, c = i % this.cols + 1;
            const key = this.planta.coord(r, c);
            return { r, c, key, slot: old.get(key), blocked: this.disabled.has(key) };
        });
    }

    get blockedCount(): number { return this.cells.filter(c => c.blocked).length; }
    get enabledCount(): number { return this.cells.length - this.blockedCount; }
    pad(n: number): string { return String(n).padStart(2, '0'); }

    private loadGroup(group: Grupo): void {
        this.groupKey = group.key;
        this.name = group.name;
        this.rows = group.rows;
        this.cols = group.cols;
        this.disabled = new Set([...group.slots, ...group.archived].filter(s => s.blocked).map(s => this.planta.coord(s.r, s.c)));
        this.dirty = false;
        this.notice = '';
    }

    changeGroup(key: string): void {
        const next = this.planta.groups.find(g => g.key === key);
        if (next) this.loadGroup(next);
    }

    changed(): void { this.dirty = true; this.notice = ''; }

    /** Pincel trabalha na prévia; somente Aplicar mapa grava no serviço. */
    paint(r: number, c: number): void {
        const key = this.planta.coord(r, c);
        const slot = [...this.group.slots, ...this.group.archived].find(s => s.r === r && s.c === c);
        if (this.brush === 'block' && slot?.contents.length) {
            this.notice = 'Não é permitido bloquear uma posição com materiais vinculados.';
            return;
        }
        const shouldBlock = this.brush === 'block';
        if (this.disabled.has(key) === shouldBlock) return;
        if (shouldBlock) this.disabled.add(key);
        else this.disabled.delete(key);
        this.changed();
    }

    beginPaint(event: PointerEvent, r: number, c: number): void {
        if (event.button !== 0) return;
        this.painting = true;
        this.paint(r, c);
    }

    movePaint(event: PointerEvent): void {
        if (!this.painting) return;
        const cell = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-paint-cell]');
        if (!cell) return;
        const r = Number(cell.dataset['r']), c = Number(cell.dataset['c']);
        if (Number.isInteger(r) && Number.isInteger(c)) this.paint(r, c);
    }

    @HostListener('document:pointerup')
    endPaint(): void { this.painting = false; }

    @HostListener('document:pointercancel')
    cancelPaint(): void { this.endPaint(); }

    corridor(): void {
        if (!this.validSize) return;
        const previous = this.brush;
        this.brush = 'block';
        const column = Math.ceil(this.cols / 2);
        for (let r = 1; r <= this.rows; r++) this.paint(r, column);
        this.brush = previous;
    }

    restoreAll(): void { this.disabled.clear(); this.changed(); }

    save(): boolean {
        const error = this.planta.saveGroup(this.groupKey, this.name, this.rows, this.cols, this.disabled);
        if (error) { this.notice = error; return false; }
        this.loadGroup(this.group);
        this.notice = this.planta.avisoPersistencia || 'Mapa aplicado e salvo neste navegador.';
        return true;
    }

    newGroup(): void {
        const group = this.planta.createGroup();
        if (!group) { this.notice = 'Limite de 12 grupos no protótipo.'; return; }
        this.loadGroup(group);
        this.notice = this.planta.avisoPersistencia || 'Novo grupo criado com planta padrão 8 × 8.';
    }

    viewPlant(): void { this.planta.selectGroup(this.groupKey); }
    saveDefault(all = false): void {
        const error = this.planta.setDefault(this.defaultCount, all);
        this.globalNotice = error || this.planta.avisoPersistencia || 'Padrão salvo: ' + this.planta.defaultShelfCount + ' prateleiras.';
    }

    setTheme(dark: boolean): void { this.dark = dark; this.planta.setTheme(dark); }
    state(slot: Posicao | undefined): string { return slot ? this.planta.situacao(slot) : 'empty'; }
}
