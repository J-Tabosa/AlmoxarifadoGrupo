import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { mensagemErro } from '../../core/app-error';
import { CategoriaModel } from '../../models/categoria.model';
import { CategoriasService } from '../../services/categorias.service';

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './categorias.html',
  styleUrl: './categorias.css',
})
export class Categorias implements OnInit {
  categorias: CategoriaModel[] = [];
  tipo = '';
  idEditando: number | null = null;
  carregando = false;
  salvando = false;
  mensagem = '';
  erro = '';

  constructor(private readonly api: CategoriasService) {}

  ngOnInit(): void { this.carregar(); }

  carregar(): void {
    this.carregando = true;
    this.api.listar().subscribe({
      next: (dados) => { this.categorias = dados; this.carregando = false; },
      error: (e) => { this.erro = mensagemErro(e); this.carregando = false; },
    });
  }

  salvar(): void {
    const valor = this.tipo.trim();
    if (!valor || this.salvando) return;
    this.salvando = true;
    const chamada = this.idEditando === null
      ? this.api.criar({ tipo: valor })
      : this.api.atualizar(this.idEditando, { tipo: valor });

    chamada.subscribe({
      next: () => {
        this.mensagem = this.idEditando === null ? 'Categoria cadastrada.' : 'Categoria atualizada.';
        this.salvando = false;
        this.limpar(false);
        this.carregar();
      },
      error: (e) => { this.erro = mensagemErro(e); this.salvando = false; },
    });
  }

  editar(categoria: CategoriaModel): void {
    this.idEditando = categoria.idCategoria;
    this.tipo = categoria.tipo;
  }

  excluir(categoria: CategoriaModel): void {
    if (!window.confirm(`Excluir a categoria "${categoria.tipo}"?`)) return;
    this.api.excluir(categoria.idCategoria).subscribe({
      next: () => { this.mensagem = 'Categoria excluída.'; this.carregar(); },
      error: (e) => this.erro = mensagemErro(e),
    });
  }

  limpar(limparMensagens = true): void {
    this.idEditando = null;
    this.tipo = '';
    if (limparMensagens) { this.mensagem = ''; this.erro = ''; }
  }
}
