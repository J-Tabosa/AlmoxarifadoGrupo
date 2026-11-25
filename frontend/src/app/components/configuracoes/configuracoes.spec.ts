import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Configuracoes } from './configuracoes';

describe('Configuracoes', () => {
    let component: Configuracoes;
    let fixture: ComponentFixture<Configuracoes>;
    let previous: string | null;
    const storageKey = 'pqn-angular-planta-v1';

    beforeEach(async () => {
        previous = localStorage.getItem(storageKey);
        localStorage.removeItem(storageKey);
        await TestBed.configureTestingModule({
            imports: [Configuracoes],
            providers: [provideRouter([])]
        }).compileComponents();
        fixture = TestBed.createComponent(Configuracoes);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
    });

    afterEach(() => {
        if (previous === null) localStorage.removeItem(storageKey);
        else localStorage.setItem(storageKey, previous);
    });

    it('cria o editor e lista os grupos', () => {
        expect(component).toBeTruthy();
        expect(fixture.nativeElement.querySelectorAll('.group-option').length).toBe(1);
    });

    it('renomeia e redimensiona um grupo sem trocar os IDs existentes', () => {
        const id = component.group.slots[0].idlocalizacao;
        component.name = 'Novo nome';
        component.rows = 7;
        component.changed();
        expect(component.save()).toBe(true);
        expect(component.group.name).toBe('Novo nome');
        expect(component.group.slots.length).toBe(56);
        expect(component.group.slots[0].idlocalizacao).toBe(id);
    });

    it('cria um grupo nomeado com 64 estantes', () => {
        component.startCreate();
        component.newName = 'Ferramentas';
        component.newGroup();
        expect(component.group.name).toBe('Ferramentas');
        expect(component.group.slots.length).toBe(64);
    });

    it('descarta a edição sem alterar a planta salva', () => {
        const original = component.group.name;
        component.name = 'Rascunho';
        component.changed();
        component.cancelEdit();
        expect(component.name).toBe(original);
        expect(component.dirty).toBe(false);
    });

    it('exclui um grupo vazio somente após confirmação', () => {
        component.startCreate();
        component.newName = 'Grupo temporário';
        component.newGroup();
        const key = component.groupKey;
        component.deleteGroup();
        expect(component.planta.groups.length).toBe(2);
        component.requestDelete();
        component.deleteGroup();
        expect(component.planta.groups.length).toBe(1);
        expect(component.planta.groups.some(g => g.key === key)).toBe(false);
        expect(component.group).toBeTruthy();
    });

    it('nomeia uma estante sem alterar o ID e restaura o nome padrão', () => {
        const id = component.group.slots[0].idlocalizacao;
        component.selectCell(1, 1);
        component.editDescription('1:1', 'Papelaria');
        expect(component.group.slots[0].descricao).toBe('');
        expect(component.save()).toBe(true);
        expect(component.group.slots[0].descricao).toBe('Papelaria');
        expect(component.group.slots[0].idlocalizacao).toBe(id);
        component.selectCell(1, 1);
        component.editDescription('1:1', '');
        expect(component.save()).toBe(true);
        expect(component.group.slots[0].descricao).toBe('');
    });

    it('protege grupos com materiais e o último grupo', () => {
        const group = component.group;
        group.slots[0].contents.push({ level: 1, position: 1, itemCode: 'REAL', qty: 1 });
        component.startCreate();
        component.newName = 'Outro grupo';
        component.newGroup();
        expect(component.planta.deleteGroup(group.key)).not.toBe('');
        for (const other of [...component.planta.groups].filter(g => g.key !== group.key)) {
            expect(component.planta.deleteGroup(other.key)).toBe('');
        }
        group.slots[0].contents = [];
        expect(component.planta.deleteGroup(group.key)).not.toBe('');
    });
});
