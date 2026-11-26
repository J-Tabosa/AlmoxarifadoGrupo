import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { Saidas } from './saidas';
import { ItensService } from '../../services/itens.service';
import { FuncionariosService } from '../../services/funcionarios.service';
import { RequisicoesService } from '../../services/requisicoes.service';
import { DialogoService } from '../../core/dialogo.service';
import { ItemModel } from '../../models/item.model';

describe('Saidas', () => {
  let component: Saidas;
  let fixture: ComponentFixture<Saidas>;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let catalogo: Subject<ItemModel[]>;
  let erros: string[];
  const ativo: ItemModel = { idItem: 12, idCategoria: 1, descricaoItem: 'Papel A4', unidade: 'PC', statusIt: 'A', saldoTotal: 10 };
  const inativo: ItemModel = { ...ativo, idItem: 13, statusIt: 'I' };
  const outro: ItemModel = { ...ativo, idItem: 14, descricaoItem: 'Caneta' };

  beforeEach(async () => {
    params = new BehaviorSubject(convertToParamMap({}));
    catalogo = new Subject<ItemModel[]>();
    erros = [];
    await TestBed.configureTestingModule({
      imports: [Saidas],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: params, get snapshot() { return { queryParamMap: params.value }; } } },
        { provide: ItensService, useValue: { listar: () => catalogo } },
        { provide: FuncionariosService, useValue: { listar: () => of([]) } },
        { provide: RequisicoesService, useValue: { listar: () => of([]) } },
        { provide: DialogoService, useValue: { erro: (msg: string) => erros.push(msg) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(Saidas);
    component = fixture.componentInstance;
  });

  it('cria a tela', () => {
    fixture.detectChanges();
    catalogo.next([ativo]);
    expect(component).toBeTruthy();
  });

  it('preenche a requisição da ficha após o catálogo carregar', () => {
    params.next(convertToParamMap({ item: '12' }));
    fixture.detectChanges();
    expect(component.linhas[0].idItem).toBeNull();
    catalogo.next([ativo, inativo]);
    fixture.detectChanges();
    expect(component.linhas).toEqual([{ idItem: 12, quantidadeS: 1 }]);
    expect(component.modalItensAberto).toBe(false);
    expect(fixture.nativeElement.querySelector('.request-selected-item').textContent).toContain('Papel A4');
  });

  it('não inclui item inativo pelo atalho', () => {
    params.next(convertToParamMap({ item: '13' }));
    fixture.detectChanges();
    catalogo.next([ativo, inativo]);
    expect(component.linhas[0].idItem).toBeNull();
    expect(erros.length).toBe(1);
  });

  it('mantém o novo seletor e impede duplicatas', () => {
    fixture.detectChanges();
    catalogo.next([ativo, inativo, outro]);
    component.abrirModalSelecaoItem(0);
    component.selecionarItem(ativo);
    component.adicionarLinha();
    component.selecionarItem(ativo);
    expect(component.linhas[1].idItem).toBeNull();
    expect(component.modalItensAberto).toBe(true);
    component.selecionarItem(outro);
    expect(component.linhas[1].idItem).toBe(14);
    expect(component.modalItensAberto).toBe(false);
  });
});
