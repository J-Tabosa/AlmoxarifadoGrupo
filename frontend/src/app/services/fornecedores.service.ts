import { Injectable } from '@angular/core';
import { BancoLocalService } from '../core/banco-local.service';
import { FornecedorModel, FornecedorPayload } from '../models/fornecedor.model';

@Injectable({ providedIn: 'root' })
export class FornecedoresService {
  constructor(private readonly banco: BancoLocalService) {}
  listar() { return this.banco.ler(d => d.fornecedores); }

  criar(payload: FornecedorPayload) {
    return this.banco.alterar(d => {
      if (d.fornecedores.some(f => f.cnpj === payload.cnpj)) throw new Error('Já existe fornecedor com este CNPJ.');
      const enderecoId = this.proximoId(d.fornecedores.map(f => f.endereco?.idEndereco ?? f.idEndereco));
      const idFornecedor = this.proximoId(d.fornecedores.map(f => f.idFornecedor));
      const registro: FornecedorModel = {
        idFornecedor, idEndereco: enderecoId, nomeFo: payload.nomeFo.trim(), cnpj: payload.cnpj,
        contato: payload.contato.trim(), statusFo: payload.statusFo,
        endereco: { ...payload.endereco, idEndereco: enderecoId },
      };
      d.fornecedores.push(registro);
      return registro;
    });
  }

  atualizar(id: number, payload: FornecedorPayload) {
    return this.banco.alterar(d => {
      const registro = d.fornecedores.find(f => f.idFornecedor === id);
      if (!registro) throw new Error('Fornecedor não encontrado.');
      if (d.fornecedores.some(f => f.idFornecedor !== id && f.cnpj === payload.cnpj)) throw new Error('Já existe fornecedor com este CNPJ.');
      registro.nomeFo = payload.nomeFo.trim();
      registro.cnpj = payload.cnpj;
      registro.contato = payload.contato.trim();
      registro.statusFo = payload.statusFo;
      registro.endereco = { ...payload.endereco, idEndereco: registro.idEndereco };
      return registro;
    });
  }

  excluir(id: number) {
    return this.banco.alterar(d => {
      const antes = d.fornecedores.length;
      d.fornecedores = d.fornecedores.filter(f => f.idFornecedor !== id);
      if (d.fornecedores.length === antes) throw new Error('Fornecedor não encontrado.');
    });
  }

  private proximoId(ids: number[]): number { return ids.length ? Math.max(...ids) + 1 : 1; }
}
