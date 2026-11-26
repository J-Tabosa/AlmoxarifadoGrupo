import { Injectable } from '@angular/core';
import { BancoLocalService } from '../core/banco-local.service';
import { EstoqueModel, EstoqueConfiguracaoPayload } from '../models/estoque.model';
import { ItemModel, ItemPayload } from '../models/item.model';
import { LocalizacaoModel } from '../models/localizacao.model';

@Injectable({ providedIn: 'root' })
export class ItensService {
  constructor(private readonly banco: BancoLocalService) {}

  listar() {
    return this.banco.ler(d => d.itens.map(item => ({
      ...item,
      categoria: d.categorias.find(c => c.idCategoria === item.idCategoria) ?? null,
      estoques: (item.estoques ?? []).map(e => ({
        ...e,
        localizacao: d.localizacoes.find(l => l.idLocalizacao === e.idLocalizacao) ?? null,
      })),
      saldoTotal: (item.estoques ?? []).reduce((total, e) => total + e.saldo, 0),
    })));
  }

  listarLocalizacoes() { return this.banco.ler(d => d.localizacoes); }

  criar(payload: ItemPayload) {
    return this.banco.alterar(d => {
      if (!d.categorias.some(c => c.idCategoria === payload.idCategoria)) throw new Error('Selecione uma categoria válida.');
      const idItem = this.proximoId(d.itens.map(x => x.idItem));
      const estoques = this.montarEstoques(payload.estoques, idItem, d.localizacoes, []);
      const registro: ItemModel = {
        idItem, idCategoria: payload.idCategoria, descricaoItem: payload.descricaoItem.trim(),
        unidade: payload.unidade, statusIt: payload.statusIt, estoques,
        saldoTotal: estoques.reduce((s, e) => s + e.saldo, 0),
      };
      d.itens.push(registro);
      return registro;
    });
  }

  atualizar(id: number, payload: ItemPayload) {
    return this.banco.alterar(d => {
      const registro = d.itens.find(x => x.idItem === id);
      if (!registro) throw new Error('Item não encontrado.');
      if (!d.categorias.some(c => c.idCategoria === payload.idCategoria)) throw new Error('Selecione uma categoria válida.');
      if ((registro.estoques ?? []).some(e => e.saldo > 0 &&
          d.localizacoes.some(l => l.idLocalizacao === e.idLocalizacao && l.idEstante != null) &&
          !payload.estoques.some(c => c.idLocalizacao === e.idLocalizacao))) {
        throw new Error('Não é possível remover uma localização física com saldo. Realocação necessária.');
      }
      registro.idCategoria = payload.idCategoria;
      registro.descricaoItem = payload.descricaoItem.trim();
      registro.unidade = payload.unidade;
      registro.statusIt = payload.statusIt;
      registro.estoques = this.montarEstoques(payload.estoques, id, d.localizacoes, registro.estoques ?? []);
      registro.saldoTotal = registro.estoques.reduce((s, e) => s + e.saldo, 0);
      return registro;
    });
  }

  excluir(id: number) {
    return this.banco.alterar(d => {
      if (d.entradas.some(e => e.idItem === id)) throw new Error('Não é possível excluir: o item possui entradas registradas.');
      if (d.requisicoes.some(r => r.itens.some(i => i.idItem === id))) throw new Error('Não é possível excluir: o item está vinculado a uma requisição.');
      const antes = d.itens.length;
      d.itens = d.itens.filter(x => x.idItem !== id);
      if (d.itens.length === antes) throw new Error('Item não encontrado.');
    });
  }

  private montarEstoques(
    configuracoes: EstoqueConfiguracaoPayload[],
    idItem: number,
    localizacoes: LocalizacaoModel[],
    anteriores: EstoqueModel[],
  ): EstoqueModel[] {
    return configuracoes.map(config => {
      const localizacao = localizacoes.find(l => l.idLocalizacao === config.idLocalizacao);
      if (!localizacao) throw new Error('Uma das localizações selecionadas não existe.');
      const anterior = anteriores.find(e => e.idLocalizacao === config.idLocalizacao);
      return {
        idItem, idLocalizacao: config.idLocalizacao, saldo: anterior?.saldo ?? 0,
        eMinimo: config.eMinimo, eMaximo: config.eMaximo, localizacao,
      };
    });
  }

  private proximoId(ids: number[]): number { return ids.length ? Math.max(...ids) + 1 : 1; }
}
