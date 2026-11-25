import { CategoriaModel } from './categoria.model';
import { EstoqueModel, EstoqueConfiguracaoPayload } from './estoque.model';

export type UnidadeItem = 'UN' | 'CX' | 'PC' | 'L' | 'KG';

export interface ItemModel {
  idItem: number;
  idCategoria: number;
  descricaoItem: string;
  unidade: string;
  statusIt: string;
  categoria?: CategoriaModel | null;
  estoques?: EstoqueModel[];
  saldoTotal?: number;
}

export interface ItemPayload {
  idCategoria: number;
  descricaoItem: string;
  unidade: UnidadeItem | string;
  statusIt: string;
  estoques: EstoqueConfiguracaoPayload[];
}
