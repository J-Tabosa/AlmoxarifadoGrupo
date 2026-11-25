import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { mensagemErro } from '../../core/app-error';
import { DialogoService } from '../../core/dialogo.service';
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

  constructor(
    private readonly api: CategoriasService,
    private readonly dialogo: DialogoService,
  ) {}

  ngOnInit(): void { this.carregar(); }

  carregar(): void {
    this.carregando = true;
    this.api.listar().subscribe({
      next: (dados) => { this.categorias = dados; this.carregando = false; },
      error: (e) => { this.dialogo.erro(mensagemErro(e), 'Erro ao carregar categorias'); this.carregando = false; },
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
        const estavaEditando = this.idEditando !== null;
        this.dialogo.sucesso(
          estavaEditando ? 'Categoria atualizada.' : 'Categoria cadastrada.',
          estavaEditando ? 'Categoria atualizada' : 'Categoria cadastrada',
        );
        this.salvando = false;
        this.limpar();
        this.carregar();
      },
      error: (e) => { this.dialogo.erro(mensagemErro(e), 'Erro ao salvar categoria'); this.salvando = false; },
    });
  }

  editar(categoria: CategoriaModel): void {
    this.idEditando = categoria.idCategoria;
    this.tipo = categoria.tipo;
  }

  async excluir(categoria: CategoriaModel): Promise<void> {
    const confirmado = await this.dialogo.confirmar(
      `Deseja realmente excluir a categoria "${categoria.tipo}"?`,
      'Excluir categoria',
    );
    if (!confirmado) return;

    this.api.excluir(categoria.idCategoria).subscribe({
      next: () => { this.dialogo.sucesso('Categoria excluída.', 'Categoria excluída'); this.carregar(); },
      error: (e) => this.dialogo.erro(mensagemErro(e), 'Erro ao excluir categoria'),
    });
  }

  limpar(): void {
    this.idEditando = null;
    this.tipo = '';
  }
}
