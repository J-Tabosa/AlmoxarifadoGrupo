import { ChangeDetectorRef, Component, HostListener, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
    private readonly router = inject(Router);
    private readonly cdr = inject(ChangeDetectorRef);
    mapZoom = 100;
    readonly tabs: { key: Aba; label: string }[] = [
        { key: 'enderecamento', label: 'Grupos e posições' },
        { key: 'aparencia', label: 'Aparência' },
        { key: 'usuarios', label: 'Usuários e perfis' },
        { key: 'seguranca', label: 'Segurança' },
        { key: 'backup', label: 'Exportar/Importar Backup' }
    ];

    tab: Aba = 'enderecamento';
    groupKey = this.planta.activeGroup.key;
    name = '';
    rows = 8;
    cols = 8;
    defaultCount = this.planta.defaultShelfCount;
    disabled = new Set<string>();
    descriptions = new Map<string, string>();
    selectedKey = '';
    private drag: { pointerId: number; block: boolean; x: number; y: number; grid: HTMLElement; visited: Set<string>; protectedCount: number } | null = null;
    notice = '';
    globalNotice = '';
    dirty = false;
    creating = false;
    newName = '';
    createError = '';
    confirmDelete = false;
    noticeError = false;
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
            return { r, c, key, slot: old.get(key), blocked: this.disabled.has(key), descricao: this.descriptions.get(key) ?? '' };
        });
    }

    get selectedCell() {
        return this.cells.find(cell => cell.key === this.selectedKey);
    }

    selectCell(r: number, c: number): void {
        const key = this.planta.coord(r, c);
        if (this.cells.some(cell => cell.key === key)) this.selectedKey = key;
    }

    selectWithContextMenu(event: MouseEvent, r: number, c: number): void {
        event.preventDefault();
        this.selectCell(r, c);
    }

    editDescription(key: string, value: string): void {
        if (!this.cells.some(cell => cell.key === key)) return;
        this.descriptions.set(key, value.slice(0, 60));
        this.changed();
    }

    countActive(group: Grupo): number {
        return group.slots.filter(s => !s.blocked).length;
    }

    get removalError(): string { return this.planta.groupRemovalError(this.groupKey); }

    get blockedCount(): number { return this.cells.filter(c => c.blocked).length; }
    get enabledCount(): number { return this.cells.length - this.blockedCount; }
    pad(n: number): string { return String(n).padStart(2, '0'); }

    private loadGroup(group: Grupo): void {
        this.endDrag();
        this.groupKey = group.key;
        this.name = group.name;
        this.rows = group.rows;
        this.cols = group.cols;
        this.disabled = new Set([...group.slots, ...group.archived].filter(s => s.blocked).map(s => this.planta.coord(s.r, s.c)));
        this.descriptions = new Map([...group.slots, ...group.archived].map(s => [this.planta.coord(s.r, s.c), s.descricao ?? '']));
        this.selectedKey = '';
        this.dirty = false;
        this.notice = '';
        this.noticeError = false;
        this.confirmDelete = false;
        this.creating = false;
        this.createError = '';
    }

    /** Evita perder uma planta ainda não salva ao trocar de grupo ou sair da tela. */
    canLeave(): boolean {
        return (!this.dirty && !(this.creating && this.newName.trim())) ||
            window.confirm('Há alterações não salvas. Deseja descartá-las?');
    }

    changeTab(tab: Aba): void {
        if (tab === this.tab) return;
        if (!this.canLeave()) return;
        if (this.dirty || this.creating) this.loadGroup(this.group);
        this.tab = tab;
    }

    changeGroup(key: string): void {
        if (key === this.groupKey) return;
        const next = this.planta.groups.find(g => g.key === key);
        if (next && this.canLeave()) this.loadGroup(next);
    }

    changed(): void {
        this.dirty = true;
        this.notice = '';
        this.noticeError = false;
        this.confirmDelete = false;
    }

    cancelEdit(): void {
        this.loadGroup(this.group);
        this.notice = 'Alterações descartadas. A planta salva foi restaurada.';
    }

    /** Zoom restrito à prévia, mantendo o ponto sob o cursor sempre que houver espaço para rolar. */
    zoomMap(event: WheelEvent): void {
        if (event.deltaY === 0 || event.ctrlKey || event.metaKey) return;
        event.preventDefault();
        if (this.drag) return;
        const next = Math.max(50, Math.min(250, this.mapZoom + (event.deltaY < 0 ? 10 : -10)));
        const viewport = event.currentTarget as HTMLElement;
        this.setMapZoom(next, viewport, event.clientX, event.clientY);
    }

    resetMapZoom(viewport: HTMLElement): void {
        const rect = viewport.getBoundingClientRect();
        this.setMapZoom(100, viewport, rect.left + viewport.clientWidth / 2, rect.top + viewport.clientHeight / 2);
    }

    private setMapZoom(next: number, viewport: HTMLElement, x: number, y: number): void {
        if (next === this.mapZoom || this.drag) return;
        const grid = viewport.querySelector<HTMLElement>('.preview-location-grid');
        if (!grid) return;
        const before = grid.getBoundingClientRect();
        const fx = before.width ? (x - before.left) / before.width : 0;
        const fy = before.height ? (y - before.top) / before.height : 0;
        this.mapZoom = next;
        // Atualiza o tamanho real da grade antes de reposicionar as barras de rolagem.
        this.cdr.detectChanges();
        const after = grid.getBoundingClientRect();
        viewport.scrollLeft += after.left + fx * after.width - x;
        viewport.scrollTop += after.top + fy * after.height - y;
    }

    /** Clique simples pelo teclado ou por tecnologias assistivas. O mouse e toque
     * são tratados no pointerdown para permitir pintar sem alternar duas vezes. */
    toggleCell(r: number, c: number): void {
        const cell = this.cells.find(p => p.r === r && p.c === c);
        if (cell) this.applyCellState(r, c, !cell.blocked);
    }

    onCellClick(event: MouseEvent, r: number, c: number): void {
        if (event.detail === 0) this.toggleCell(r, c);
    }

    private applyCellState(r: number, c: number, block: boolean): boolean {
        const cell = this.cells.find(p => p.r === r && p.c === c);
        if (!cell || cell.blocked === block) return true;
        if (block && cell.slot?.contents.length) {
            this.notice = 'Não é permitido desativar uma estante com materiais vinculados.';
            this.noticeError = true;
            return false;
        }
        if (block) this.disabled.add(cell.key);
        else this.disabled.delete(cell.key);
        this.changed();
        return true;
    }

    /** O primeiro quadrado determina a ação do gesto inteiro. */
    beginDrag(event: PointerEvent, r: number, c: number): void {
        if (event.button !== 0 || this.drag) return;
        const cell = this.cells.find(p => p.r === r && p.c === c);
        const grid = (event.currentTarget as HTMLElement | null)?.closest<HTMLElement>('.preview-location-grid');
        if (!cell || !grid) return;
        this.drag = { pointerId: event.pointerId, block: !cell.blocked,
            x: event.clientX, y: event.clientY, grid, visited: new Set(), protectedCount: 0 };
        this.dragToCell(event.pointerId, r, c);
        // A captura mantém o gesto mesmo sobre os espaços entre os quadrados.
        try { grid.setPointerCapture(event.pointerId); } catch { /* Pointer sintético ou já encerrado. */ }
    }

    dragToCell(pointerId: number, r: number, c: number): void {
        const drag = this.drag;
        if (!drag || drag.pointerId !== pointerId) return;
        const key = this.planta.coord(r, c);
        if (drag.visited.has(key)) return;
        drag.visited.add(key);
        if (!this.applyCellState(r, c, drag.block)) drag.protectedCount++;
        if (drag.protectedCount) {
            this.notice = drag.protectedCount + ' estante(s) com materiais permaneceram ativas.';
            this.noticeError = true;
        }
    }

    moveDrag(event: PointerEvent): void {
        const drag = this.drag;
        if (!drag || drag.pointerId !== event.pointerId) return;
        if (event.pointerType === 'mouse' && !(event.buttons & 1)) {
            this.endDrag(event);
            return;
        }
        // Amostra o caminho para não pular células quando o mouse se move rapidamente.
        const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
        const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 12));
        for (let i = 1; i <= steps; i++) {
            const hit = document.elementFromPoint(drag.x + dx * i / steps, drag.y + dy * i / steps);
            const tile = hit?.closest<HTMLElement>('[data-drag-cell]');
            if (tile && drag.grid.contains(tile)) {
                this.dragToCell(event.pointerId, Number(tile.dataset['r']), Number(tile.dataset['c']));
            }
        }
        drag.x = event.clientX;
        drag.y = event.clientY;
    }

    @HostListener('document:pointerup', ['$event'])
    @HostListener('document:pointercancel', ['$event'])
    endDrag(event?: PointerEvent): void {
        const drag = this.drag;
        if (!drag || (event && event.pointerId !== drag.pointerId)) return;
        this.drag = null;
        try {
            if (drag.grid.hasPointerCapture(drag.pointerId)) drag.grid.releasePointerCapture(drag.pointerId);
        } catch { /* O navegador pode ter liberado a captura. */ }
    }

    @HostListener('window:blur')
    cancelDrag(): void { this.endDrag(); }

    /** Se houver células desativadas, ativa todas. Caso contrário, desativa as vazias. */
    toggleAll(): void {
        if (!this.validSize) return;
        const cells = this.cells;
        const activate = cells.some(cell => cell.blocked);
        let protectedCount = 0;
        let modified = false;
        for (const cell of cells) {
            if (activate) {
                if (this.disabled.delete(cell.key)) modified = true;
            } else if (cell.slot?.contents.length) {
                protectedCount++;
            } else {
                this.disabled.add(cell.key);
                modified = true;
            }
        }
        if (modified) this.changed();
        if (protectedCount) {
            this.notice = protectedCount + ' estante(s) com materiais permaneceram ativas.';
            this.noticeError = true;
        }
    }

    save(): boolean {
        const error = this.planta.saveGroup(this.groupKey, this.name, this.rows, this.cols, this.disabled, this.descriptions);
        if (error) { this.notice = error; this.noticeError = true; return false; }
        this.loadGroup(this.group);
        this.notice = this.planta.avisoPersistencia || 'Mapa aplicado e salvo neste navegador.';
        return true;
    }

    startCreate(): void {
        if (this.creating) return;
        if (!this.canLeave()) return;
        if (this.dirty) this.loadGroup(this.group);
        this.creating = true;
        this.confirmDelete = false;
        this.newName = '';
        this.createError = '';
    }

    cancelCreate(): void {
        this.creating = false;
        this.newName = '';
        this.createError = '';
    }

    newGroup(): void {
        const name = this.newName.trim();
        if (!name || name.length > 45) { this.createError = 'Informe um nome de até 45 caracteres.'; return; }
        if (this.planta.groups.some(g => this.planta.normalize(g.name) === this.planta.normalize(name))) {
            this.createError = 'Já existe um grupo com esse nome.';
            return;
        }
        const group = this.planta.createGroup(name);
        if (!group) { this.createError = 'Limite de 12 grupos atingido.'; return; }
        this.loadGroup(group);
        this.notice = this.planta.avisoPersistencia || 'Grupo criado. Personalize a planta 8 × 8 e salve as alterações.';
    }

    requestDelete(): void {
        if (this.removalError) return;
        this.confirmDelete = true;
        this.notice = '';
    }

    deleteGroup(): void {
        if (!this.confirmDelete) return;
        const error = this.planta.deleteGroup(this.groupKey);
        if (error) {
            this.confirmDelete = false;
            this.noticeError = true;
            this.notice = error;
            return;
        }
        this.loadGroup(this.planta.activeGroup);
        this.notice = this.planta.avisoPersistencia || 'Grupo excluído.';
    }

    viewPlant(): void {
        if (this.dirty || this.creating) return;
        this.planta.selectGroup(this.groupKey);
        void this.router.navigate(['/painel']);
    }
    saveDefault(all = false): void {
        if (all && !window.confirm('Todas as estantes passarão a usar o padrão geral. Continuar?')) return;
        const error = this.planta.setDefault(this.defaultCount, all);
        this.globalNotice = error || this.planta.avisoPersistencia || 'Padrão salvo: ' + this.planta.defaultShelfCount + ' prateleiras.';
    }

    setTheme(dark: boolean): void { this.dark = dark; this.planta.setTheme(dark); }
    state(slot: Posicao | undefined): string { return slot ? this.planta.situacao(slot) : 'empty'; }
}
