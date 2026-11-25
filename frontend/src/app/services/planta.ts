import { Injectable } from '@angular/core';

export type Busca = 'all' | 'name' | 'id' | 'category';
export type Situacao = 'good' | 'low' | 'empty' | 'review';

export interface Material {
    code: string;
    name: string;
    category: string;
    unit: string;
    stock: number;
    min: number;
}

export interface Conteudo {
    level: number;
    position: number;
    itemCode: string;
    qty: number;
}

export interface Posicao {
    idlocalizacao: number;
    r: number;
    c: number;
    blocked: boolean;
    review: boolean;
    shelfCount?: number;
    descricao?: string;
    contents: Conteudo[];
}

export interface Grupo {
    key: string;
    name: string;
    rows: number;
    cols: number;
    slots: Posicao[];
    // Posições fora das dimensões atuais conservam seus IDs ao ampliar novamente.
    archived: Posicao[];
}

interface Estado {
    groups: Grupo[];
    nextId: number;
    defaultShelfCount: number;
    activeKey: string;
}

/** Estado demonstrativo compartilhado entre Painel e Configurações.
 * A API substituirá a persistência local quando os controllers estiverem prontos.
 */
@Injectable({ providedIn: 'root' })
export class PlantaService {
    private readonly storageKey = 'pqn-angular-planta-v1';
    // O catálogo começa vazio; será preenchido pela API.
    readonly materials: Material[] = [];
    private state: Estado;
    avisoPersistencia = '';

    constructor() {
        this.state = this.load() ?? this.createInitial();
        this.removeDemoData();
        try {
            document.body.classList.toggle('dark', localStorage.getItem('pqn-angular-tema') === 'dark');
        } catch { /* O tema padrão permanece disponível. */ }
    }

    get groups(): Grupo[] { return this.state.groups; }
    get defaultShelfCount(): number { return this.state.defaultShelfCount; }
    get activeGroup(): Grupo {
        return this.groups.find(g => g.key === this.state.activeKey) ?? this.groups[0];
    }

    private load(): Estado | null {
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (!raw) return null;
            const data = JSON.parse(raw) as Estado;
            if (!Array.isArray(data.groups) || !data.groups.length ||
                !Number.isInteger(data.nextId) || !this.validCount(data.defaultShelfCount) ||
                !data.groups.every(g => Array.isArray(g.slots) && Array.isArray(g.archived) &&
                    g.slots.length === g.rows * g.cols && g.slots.some(s => !s.blocked))) return null;
            return data;
        } catch { return null; }
    }

    /** Remove somente os registros fictícios da versão anterior, sem apagar a planta salva. */
    private removeDemoData(): void {
        const demoCodes = new Set(['MAT-001', 'MAT-015', 'MAT-021', 'MAT-032', 'MAT-044', 'MAT-053']);
        let changed = false;

        for (const group of this.groups) {
            for (const slot of [...group.slots, ...group.archived]) {
                const contents = slot.contents.filter(p => !demoCodes.has(p.itemCode));
                if (contents.length !== slot.contents.length) {
                    slot.contents = contents;
                    changed = true;
                }

                // A única marca de conferência simulada era a posição 01-05 do grupo central.
                if (group.key === 'central' && slot.idlocalizacao === 5 &&
                    slot.r === 1 && slot.c === 5 && slot.review && !slot.contents.length) {
                    slot.review = false;
                    changed = true;
                }
            }
        }

        if (changed) this.persist();
    }

    private persist(): void {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.state));
            this.avisoPersistencia = '';
        } catch {
            this.avisoPersistencia = 'Não foi possível gravar no navegador. As alterações valem apenas nesta sessão.';
        }
    }

    private newSlot(r: number, c: number, id: number): Posicao {
        return { idlocalizacao: id, r, c, blocked: false, review: false, descricao: '', contents: [] };
    }

    private createInitial(): Estado {
        let nextId = 1;
        const groups = [
            ['central', 'Depósito Principal']
        ].map(([key, name]): Grupo => ({
            key, name, rows: 8, cols: 8, archived: [],
            slots: Array.from({ length: 64 }, (_, i) =>
                this.newSlot(Math.floor(i / 8) + 1, i % 8 + 1, nextId++))
        }));

        return { groups, nextId, defaultShelfCount: 5, activeKey: 'central' };
    }

    selectGroup(key: string): void {
        if (this.groups.some(g => g.key === key)) {
            this.state.activeKey = key;
            this.persist();
        }
    }

    material(code: string): Material | undefined {
        return this.materials.find(m => m.code === code);
    }

    shelfCount(slot: Posicao): number {
        return slot.shelfCount ?? this.defaultShelfCount;
    }

    situacao(slot: Posicao): Situacao {
        if (slot.review) return 'review';
        if (slot.contents.some(p => p.qty > 0 && (this.material(p.itemCode)?.stock ?? 0) < (this.material(p.itemCode)?.min ?? 0))) return 'low';
        return slot.contents.some(p => p.qty > 0) ? 'good' : 'empty';
    }

    normalize(value: string): string {
        return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    }

    matches(item: Material, query: string, mode: Busca): boolean {
        const q = this.normalize(query);
        if (!q) return true;
        const id = String(Number(item.code.slice(4)));
        const values = mode === 'name' ? [item.name] : mode === 'id' ? [item.code, id] :
            mode === 'category' ? [item.category] : [item.name, item.code, id, item.category];
        return values.some(v => this.normalize(v).includes(q));
    }

    matchingRack(slot: Posicao, query: string, mode: Busca): boolean {
        return !slot.blocked && !!this.normalize(query) &&
            slot.contents.some(p => {
                const item = this.material(p.itemCode);
                return !!item && this.matches(item, query, mode);
            });
    }

    private validCount(n: number): boolean { return Number.isInteger(n) && n >= 1 && n <= 30; }
    private minimum(slot: Posicao): number {
        return Math.max(1, ...slot.contents.map(p => p.level));
    }

    setShelfCount(slot: Posicao, n: number | null): string {
        const count = n ?? this.defaultShelfCount;
        if (!this.validCount(count)) return 'Informe de 1 a 30 prateleiras.';
        if (count < this.minimum(slot)) return 'Não é possível remover prateleiras com materiais vinculados.';
        if (n === null) delete slot.shelfCount;
        else slot.shelfCount = n;
        this.persist();
        return '';
    }

    setDefault(n: number, all: boolean): string {
        if (!this.validCount(n)) return 'Informe de 1 a 30 prateleiras.';
        const affected = this.groups.flatMap(g => [...g.slots, ...g.archived]).filter(s => all || s.shelfCount == null);
        if (affected.some(s => this.minimum(s) > n)) return 'Há materiais acima desse limite. Realocação necessária.';
        this.state.defaultShelfCount = n;
        if (all) affected.forEach(s => delete s.shelfCount);
        this.persist();
        return '';
    }

    /** Alterações são validadas antes de trocar a planta ou consumir novos IDs. */
    saveGroup(key: string, name: string, rows: number, cols: number, disabled: Set<string>, descriptions: ReadonlyMap<string, string> = new Map()): string {
        const group = this.groups.find(g => g.key === key);
        name = name.trim();
        if (!group || !name || name.length > 45 || !Number.isInteger(rows) || !Number.isInteger(cols) ||
            rows < 1 || rows > 15 || cols < 1 || cols > 16) return 'Informe nome, 1–15 linhas e 1–16 colunas.';
        if (this.groups.some(g => g.key !== key && this.normalize(g.name) === this.normalize(name))) {
            return 'Já existe um grupo com esse nome.';
        }
        if ([...descriptions.values()].some(value => value.trim().length > 60)) {
            return 'A descrição da estante deve ter até 60 caracteres.';
        }
        const existing = [...group.slots, ...group.archived];
        if (existing.some(s => s.contents.length && (s.r > rows || s.c > cols || disabled.has(this.coord(s.r, s.c))))) {
            return 'Não é possível remover ou bloquear posições com material vinculado.';
        }
        const coordinates = Array.from({ length: rows * cols }, (_, i) => ({ r: Math.floor(i / cols) + 1, c: i % cols + 1 }));
        if (coordinates.every(p => disabled.has(this.coord(p.r, p.c)))) return 'Deixe pelo menos uma posição ativa.';
        const byCoord = new Map(existing.map(s => [this.coord(s.r, s.c), s]));
        group.slots = coordinates.map(({ r, c }) => {
            const old = byCoord.get(this.coord(r, c));
            const slot = old ?? this.newSlot(r, c, this.state.nextId++);
            const key = this.coord(r, c);
            return { ...slot, blocked: disabled.has(key), descricao: (descriptions.get(key) ?? slot.descricao ?? '').trim() };
        });
        group.archived = existing.filter(s => s.r > rows || s.c > cols).map(slot => ({
            ...slot, descricao: (descriptions.get(this.coord(slot.r, slot.c)) ?? slot.descricao ?? '').trim()
        }));
        group.name = name;
        group.rows = rows;
        group.cols = cols;
        this.state.activeKey = key;
        this.persist();
        return '';
    }

    coord(r: number, c: number): string { return r + ':' + c; }

    createGroup(name: string): Grupo | null {
        name = name.trim();
        if (this.groups.length >= 12 || !name || name.length > 45 ||
            this.groups.some(g => this.normalize(g.name) === this.normalize(name))) return null;
        const group: Grupo = {
            key: 'grupo-' + this.state.nextId, name,
            rows: 8, cols: 8, archived: [],
            slots: Array.from({ length: 64 }, (_, i) => this.newSlot(Math.floor(i / 8) + 1, i % 8 + 1, this.state.nextId++))
        };
        this.groups.push(group);
        this.selectGroup(group.key);
        return group;
    }

    /** Um grupo ocupado ou o último grupo não pode ser removido.
     * O contador de IDs permanece intacto para não reutilizar localizações excluídas.
     */
    groupRemovalError(key: string): string {
        const group = this.groups.find(g => g.key === key);
        if (!group) return 'Grupo não encontrado.';
        if ([...group.slots, ...group.archived].some(s => s.contents.length > 0)) {
            return 'Este grupo possui materiais vinculados. Realocação necessária antes de excluir.';
        }
        if (this.groups.length <= 1) return 'Mantenha pelo menos um grupo para o painel.';
        return '';
    }

    deleteGroup(key: string): string {
        const error = this.groupRemovalError(key);
        if (error) return error;
        const index = this.groups.findIndex(g => g.key === key);
        this.groups.splice(index, 1);
        if (this.state.activeKey === key) {
            this.state.activeKey = this.groups[Math.min(index, this.groups.length - 1)].key;
        }
        this.persist();
        return '';
    }

    setTheme(dark: boolean): void {
        document.body.classList.toggle('dark', dark);
        try { localStorage.setItem('pqn-angular-tema', dark ? 'dark' : 'light'); } catch { }
    }
}
