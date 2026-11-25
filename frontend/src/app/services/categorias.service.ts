import { Injectable } from '@angular/core';
import { BancoLocalService } from '../core/banco-local.service';
import { CategoriaModel, CategoriaPayload } from '../models/categoria.model';

@Injectable({ providedIn: 'root' })
export class CategoriasService {
  constructor(private readonly banco: BancoLocalService) {}
  listar() { return this.banco.ler(d => d.categorias); }

  criar(payload: CategoriaPayload) {
    return this.banco.alterar(d => {
      const tipo = payload.tipo.trim();
      if (d.categorias.some(c => c.tipo.toLowerCase() === tipo.toLowerCase())) throw new Error('Já existe uma categoria com este nome.');
      const registro: CategoriaModel = { idCategoria: this.proximoId(d.categorias.map(x => x.idCategoria)), tipo };
      d.categorias.push(registro);
      return registro;
    });
  }

  atualizar(id: number, payload: CategoriaPayload) {
    return this.banco.alterar(d => {
      const registro = d.categorias.find(x => x.idCategoria === id);
      if (!registro) throw new Error('Categoria não encontrada.');
      const tipo = payload.tipo.trim();
      if (d.categorias.some(x => x.idCategoria !== id && x.tipo.toLowerCase() === tipo.toLowerCase())) throw new Error('Já existe uma categoria com este nome.');
      registro.tipo = tipo;
      return registro;
    });
  }

  excluir(id: number) {
    return this.banco.alterar(d => {
      if (d.itens.some(i => i.idCategoria === id)) throw new Error('Não é possível excluir: há itens vinculados a esta categoria.');
      const antes = d.categorias.length;
      d.categorias = d.categorias.filter(x => x.idCategoria !== id);
      if (d.categorias.length === antes) throw new Error('Categoria não encontrada.');
    });
  }

  private proximoId(ids: number[]): number { return ids.length ? Math.max(...ids) + 1 : 1; }
}
