import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { mensagemErro } from '../../core/app-error';
import { DialogoService } from '../../core/dialogo.service';
import { CategoriaModel } from '../../models/categoria.model';
import { EstoqueModel, EstoqueConfiguracaoPayload } from '../../models/estoque.model';
import { ItemModel, ItemPayload, UnidadeItem } from '../../models/item.model';
import { LocalizacaoModel } from '../../models/localizacao.model';
import { CategoriasService } from '../../services/categorias.service';
import { ItensService } from '../../services/itens.service';

interface EstoqueLinhaForm {
  idLocalizacao: number | null;
  eMinimo: number;
  eMaximo: number;
  saldo?: number;
}

@Component({
  selector: 'app-item',
  standalone: true,
  imports: [FormsModule],
  styleUrl: './item.css',
  templateUrl: './item.html',
})
export class Item implements OnInit {
  itens: ItemModel[] = [];
  categorias: CategoriaModel[] = [];
  localizacoes: LocalizacaoModel[] = [];
  pesquisaItens = '';

  modalAberto = false;
  idEditando: number | null = null;
  idCategoria: number | null = null;
  descricaoItem = '';
  unidade: UnidadeItem = 'UN';
  statusIt = 'A';
  estoques: EstoqueLinhaForm[] = [];
  carregando = false;
  salvando = false;

  readonly unidades: UnidadeItem[] = ['UN', 'CX', 'PC', 'L', 'KG'];

  constructor(
    private readonly api: ItensService,
    private readonly categoriasApi: CategoriasService,
    private readonly dialogo: DialogoService,
  ) {}

  ngOnInit(): void {
    this.carregarCategorias();
    this.carregarLocalizacoes();
    this.carregar();
  }

  @HostListener('document:keydown.escape')
  fecharComEscape(): void {
    if (this.modalAberto && !this.salvando) this.fecharModal();
  }

  carregarCategorias(): void {
    this.categoriasApi.listar().subscribe({
      next: (dados) => (this.categorias = dados),
      error: (e) => this.dialogo.erro(mensagemErro(e), 'Erro ao carregar categorias'),
    });
  }

  carregarLocalizacoes(): void {
    this.api.listarLocalizacoes().subscribe({
      next: (dados) => (this.localizacoes = dados.filter((x) => x.statusL === 'A')),
      error: (e) => this.dialogo.erro(mensagemErro(e), 'Erro ao carregar localizações'),
    });
  }

  carregar(): void {
    this.carregando = true;
    this.api.listar().subscribe({
      next: (dados) => {
        this.itens = dados;
        this.carregando = false;
      },
      error: (e) => {
        this.dialogo.erro(mensagemErro(e), 'Erro ao carregar itens');
        this.carregando = false;
      },
    });
  }

  get itensFiltrados(): ItemModel[] {
    const termo = this.normalizar(this.pesquisaItens);
    if (!termo) return this.itens;

    return this.itens.filter((item) => {
      const localizacoes = (item.estoques || [])
        .map((estoque) => {
          const local = estoque.localizacao;
          return [
            estoque.idLocalizacao,
            local?.idLocalizacao,
            local?.sala,
            local?.andar,
            local?.posicao,
          ].join(' ');
        })
        .join(' ');

      const atributos = [
        item.idItem,
        item.descricaoItem,
        item.categoria?.tipo,
        item.unidade,
        item.statusIt,
        localizacoes,
      ];
      return atributos.some((valor) => this.normalizar(String(valor ?? '')).includes(termo));
    });
  }

  private normalizar(valor: string): string {
    return valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
      .trim();
  }

  localizacaoItem(item: ItemModel): string {
    const locais = (item.estoques || []).map((estoque) => {
      const local = estoque.localizacao;
      if (!local) return `Localização #${estoque.idLocalizacao}`;
      return `Sala ${local.sala} · ${local.andar} · ${local.posicao}`;
    });
    return locais.length ? [...new Set(locais)].join(' / ') : 'Não configurada';
  }

  abrirModalNovo(): void {
    this.limpar();
    this.modalAberto = true;
  }

  abrirModalEdicao(item: ItemModel): void {
    this.idEditando = item.idItem;
    this.idCategoria = item.idCategoria;
    this.descricaoItem = item.descricaoItem;
    this.unidade = this.unidades.includes(item.unidade as UnidadeItem)
      ? (item.unidade as UnidadeItem)
      : 'UN';
    this.statusIt = item.statusIt;
    this.estoques = (item.estoques || []).map((estoque: EstoqueModel) => ({
      idLocalizacao: estoque.idLocalizacao,
      eMinimo: estoque.eMinimo,
      eMaximo: estoque.eMaximo,
      saldo: estoque.saldo,
    }));
    this.modalAberto = true;
  }

  fecharModal(): void {
    if (this.salvando) return;
    this.modalAberto = false;
    this.limpar();
  }

  adicionarLocalizacao(): void {
    this.estoques.push({ idLocalizacao: null, eMinimo: 0, eMaximo: 0 });
  }

  removerLocalizacao(index: number): void {
    this.estoques.splice(index, 1);
  }

  localizacaoLabel(localizacao: LocalizacaoModel): string {
    return `ID ${localizacao.idLocalizacao} · sala ${localizacao.sala} · andar ${localizacao.andar} · posição ${localizacao.posicao}`;
  }

  salvar(): void {
    if (this.salvando || this.idCategoria === null) return;

    const usados = this.estoques.filter((x) => x.idLocalizacao !== null);
    const ids = usados.map((x) => Number(x.idLocalizacao));
    if (new Set(ids).size !== ids.length) {
      this.dialogo.erro(
        'Selecione cada localização apenas uma vez para este item.',
        'Localização duplicada',
      );
      return;
    }
    if (usados.some((x) => x.eMinimo < 0 || x.eMaximo < x.eMinimo)) {
      this.dialogo.erro(
        'Confira os limites: o máximo deve ser maior ou igual ao mínimo.',
        'Limites de estoque inválidos',
      );
      return;
    }

    const configuracoes: EstoqueConfiguracaoPayload[] = usados.map((x) => ({
      idLocalizacao: Number(x.idLocalizacao),
      eMinimo: Number(x.eMinimo),
      eMaximo: Number(x.eMaximo),
    }));

    const payload: ItemPayload = {
      idCategoria: Number(this.idCategoria),
      descricaoItem: this.descricaoItem.trim(),
      unidade: this.unidade,
      statusIt: this.statusIt,
      estoques: configuracoes,
    };

    const estavaEditando = this.idEditando !== null;
    const id = this.idEditando;
    this.salvando = true;

    const chamada =
      estavaEditando && id !== null ? this.api.atualizar(id, payload) : this.api.criar(payload);

    chamada.subscribe({
      next: () => {
        this.salvando = false;
        this.modalAberto = false;
        this.limpar();
        this.dialogo.sucesso(
          estavaEditando ? 'Item atualizado com sucesso.' : 'Item cadastrado com sucesso.',
          estavaEditando ? 'Item atualizado' : 'Item cadastrado',
        );
        this.carregar();
      },
      error: (e) => {
        this.dialogo.erro(mensagemErro(e), 'Erro ao salvar item');
        this.salvando = false;
      },
    });
  }

  async excluir(item: ItemModel): Promise<void> {
    const confirmado = await this.dialogo.confirmar(
      `Deseja realmente excluir o item "${item.descricaoItem}"?`,
      'Excluir item',
    );
    if (!confirmado) return;

    this.api.excluir(item.idItem).subscribe({
      next: () => {
        this.dialogo.sucesso('Item excluído com sucesso.', 'Item excluído');
        if (this.idEditando === item.idItem) this.fecharModal();
        this.carregar();
      },
      error: (e) => this.dialogo.erro(mensagemErro(e), 'Erro ao excluir item'),
    });
  }

  saldoItem(item: ItemModel): number {
    return (
      item.saldoTotal ?? (item.estoques || []).reduce((soma, estoque) => soma + estoque.saldo, 0)
    );
  }

  limpar(): void {
    this.idEditando = null;
    this.idCategoria = null;
    this.descricaoItem = '';
    this.unidade = 'UN';
    this.statusIt = 'A';
    this.estoques = [];
  }
}
