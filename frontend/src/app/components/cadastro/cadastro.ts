import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { mensagemErro } from '../../core/app-error';
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
  selector: 'app-cadastro',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './cadastro.html',
  styleUrl: './cadastro.css',
})
export class Cadastro implements OnInit {
  itens: ItemModel[] = [];
  categorias: CategoriaModel[] = [];
  localizacoes: LocalizacaoModel[] = [];
  idEditando: number | null = null;
  idCategoria: number | null = null;
  descricaoItem = '';
  unidade: UnidadeItem = 'UN';
  statusIt = 'A';
  estoques: EstoqueLinhaForm[] = [];
  carregando = false;
  salvando = false;
  mensagem = '';
  erro = '';

  readonly unidades: UnidadeItem[] = ['UN', 'CX', 'PC', 'L', 'KG'];

  constructor(
    private readonly api: ItensService,
    private readonly categoriasApi: CategoriasService,
  ) {}

  ngOnInit(): void {
    this.carregarCategorias();
    this.carregarLocalizacoes();
    this.carregar();
  }

  carregarCategorias(): void {
    this.categoriasApi.listar().subscribe({
      next: (dados) => this.categorias = dados,
      error: (e) => this.erro = mensagemErro(e),
    });
  }

  carregarLocalizacoes(): void {
    this.api.listarLocalizacoes().subscribe({
      next: (dados) => this.localizacoes = dados.filter(x => x.statusL === 'A'),
      error: (e) => this.erro = mensagemErro(e),
    });
  }

  carregar(): void {
    this.carregando = true;
    this.api.listar().subscribe({
      next: (dados) => { this.itens = dados; this.carregando = false; },
      error: (e) => { this.erro = mensagemErro(e); this.carregando = false; },
    });
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
    const usados = this.estoques.filter(x => x.idLocalizacao !== null);
    const ids = usados.map(x => Number(x.idLocalizacao));
    if (new Set(ids).size !== ids.length) {
      this.erro = 'Selecione cada localização apenas uma vez para este item.';
      return;
    }
    if (usados.some(x => x.eMinimo < 0 || x.eMaximo < x.eMinimo)) {
      this.erro = 'Confira os limites: o máximo deve ser maior ou igual ao mínimo.';
      return;
    }

    const configuracoes: EstoqueConfiguracaoPayload[] = usados.map(x => ({
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

    this.salvando = true;
    this.erro = '';
    const chamada = this.idEditando === null
      ? this.api.criar(payload)
      : this.api.atualizar(this.idEditando, payload);

    chamada.subscribe({
      next: () => {
        this.mensagem = this.idEditando === null ? 'Item cadastrado.' : 'Item atualizado.';
        this.salvando = false;
        this.limpar(false);
        this.carregar();
      },
      error: (e) => { this.erro = mensagemErro(e); this.salvando = false; },
    });
  }

  editar(item: ItemModel): void {
    this.idEditando = item.idItem;
    this.idCategoria = item.idCategoria;
    this.descricaoItem = item.descricaoItem;
    this.unidade = this.unidades.includes(item.unidade as UnidadeItem) ? item.unidade as UnidadeItem : 'UN';
    this.statusIt = item.statusIt;
    this.estoques = (item.estoques || []).map((e: EstoqueModel) => ({
      idLocalizacao: e.idLocalizacao,
      eMinimo: e.eMinimo,
      eMaximo: e.eMaximo,
      saldo: e.saldo,
    }));
    this.mensagem = '';
    this.erro = '';
  }

  excluir(item: ItemModel): void {
    if (!window.confirm(`Excluir o item "${item.descricaoItem}"?`)) return;
    this.api.excluir(item.idItem).subscribe({
      next: () => {
        this.mensagem = 'Item excluído.';
        if (this.idEditando === item.idItem) this.limpar(false);
        this.carregar();
      },
      error: (e) => this.erro = mensagemErro(e),
    });
  }

  saldoItem(item: ItemModel): number {
    return item.saldoTotal ?? (item.estoques || []).reduce((soma, e) => soma + e.saldo, 0);
  }

  limpar(limparMensagens = true): void {
    this.idEditando = null;
    this.idCategoria = null;
    this.descricaoItem = '';
    this.unidade = 'UN';
    this.statusIt = 'A';
    this.estoques = [];
    if (limparMensagens) { this.mensagem = ''; this.erro = ''; }
  }
}
