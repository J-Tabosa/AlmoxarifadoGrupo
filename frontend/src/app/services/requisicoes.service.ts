import { Injectable } from '@angular/core';
import { BancoLocalService, BancoLocal } from '../core/banco-local.service';
import { FuncionarioModel } from '../models/funcionario.model';
import { RequisicaoModel, RequisicaoPayload } from '../models/requisicao.model';

@Injectable({ providedIn: 'root' })
export class RequisicoesService {
  constructor(private readonly banco: BancoLocalService) {}

  listar() {
    return this.banco.ler(d => d.requisicoes
      .slice()
      .sort((a, b) => b.idRequisicao - a.idRequisicao)
      .map(r => this.comDetalhes(r, d)));
  }

  consultar(idRequisicao: number, idFuncionario: number) {
    return this.banco.ler(d => {
      const r = d.requisicoes.find(x => x.idRequisicao === idRequisicao && x.idFuncionario === idFuncionario);
      if (!r) throw new Error('Requisição não encontrada.');
      return this.comDetalhes(r, d);
    });
  }

  criar(payload: RequisicaoPayload) {
    return this.banco.alterar(d => {
      this.validarFuncionarios(payload, d);
      const itens = this.validarItens(payload, d);
      const registro: RequisicaoModel = {
        idRequisicao: this.proximoId(d.requisicoes.map(r => r.idRequisicao)),
        idFuncionario: payload.idFuncionario,
        idAlmoxarife: payload.idAlmoxarife,
        dataHoraS: payload.dataHoraS,
        justificativa: payload.justificativa,
        tipoS: payload.tipoS,
        itens,
      };
      d.requisicoes.push(registro);
      return this.comDetalhes(registro, d);
    });
  }

  atualizar(idRequisicao: number, idFuncionarioOriginal: number, payload: RequisicaoPayload) {
    return this.banco.alterar(d => {
      const registro = d.requisicoes.find(r => r.idRequisicao === idRequisicao && r.idFuncionario === idFuncionarioOriginal);
      if (!registro) throw new Error('Requisição não encontrada.');
      if (payload.idFuncionario !== idFuncionarioOriginal) {
        throw new Error('O solicitante não pode ser alterado nesta edição porque compõe a chave da requisição no modelo atual.');
      }
      this.validarFuncionarios(payload, d);
      registro.idAlmoxarife = payload.idAlmoxarife;
      registro.dataHoraS = payload.dataHoraS;
      registro.justificativa = payload.justificativa;
      registro.tipoS = payload.tipoS;
      registro.itens = this.validarItens(payload, d);
      return this.comDetalhes(registro, d);
    });
  }

  excluir(idRequisicao: number, idFuncionario: number) {
    return this.banco.alterar(d => {
      const antes = d.requisicoes.length;
      d.requisicoes = d.requisicoes.filter(r => !(r.idRequisicao === idRequisicao && r.idFuncionario === idFuncionario));
      if (d.requisicoes.length === antes) throw new Error('Requisição não encontrada.');
    });
  }

  private validarFuncionarios(payload: RequisicaoPayload, d: BancoLocal): void {
    this.funcionarioAtivo(payload.idFuncionario, d, 'solicitante');
    this.funcionarioAtivo(payload.idAlmoxarife, d, 'almoxarife responsável');
  }

  private funcionarioAtivo(id: number, d: BancoLocal, papel: string): FuncionarioModel {
    const funcionario = d.funcionarios.find(f => f.idFuncionario === id && f.statusFu === 'A');
    if (!funcionario) throw new Error(`Selecione um ${papel} ativo.`);
    return funcionario;
  }

  private validarItens(payload: RequisicaoPayload, d: BancoLocal) {
    if (!payload.itens.length) throw new Error('Adicione pelo menos um item.');
    const ids = payload.itens.map(i => i.idItem);
    if (new Set(ids).size !== ids.length) throw new Error('Não repita o mesmo item na requisição.');
    return payload.itens.map(linha => {
      const item = d.itens.find(i => i.idItem === linha.idItem && i.statusIt === 'A');
      if (!item) throw new Error(`O item #${linha.idItem} não está disponível.`);
      if (!Number.isInteger(linha.quantidadeS) || linha.quantidadeS < 1) throw new Error('A quantidade solicitada deve ser um número inteiro positivo.');
      return {
        idItem: item.idItem,
        quantidadeS: linha.quantidadeS,
        descricaoItem: item.descricaoItem,
        unidade: item.unidade,
        saldoTotal: item.saldoTotal ?? 0,
      };
    });
  }

  private comDetalhes(registro: RequisicaoModel, d: BancoLocal): RequisicaoModel {
    const resumo = (idFuncionario: number) => {
      const funcionario = d.funcionarios.find(f => f.idFuncionario === idFuncionario);
      if (!funcionario) return undefined;
      const setor = d.setores.find(s => s.idSetor === funcionario.idSetor);
      return {
        idFuncionario: funcionario.idFuncionario,
        nomeFu: funcionario.nomeFu,
        cargo: funcionario.cargo,
        idSetor: funcionario.idSetor,
        setor: setor ?? null,
      };
    };

    return {
      ...registro,
      funcionario: resumo(registro.idFuncionario),
      almoxarife: resumo(registro.idAlmoxarife),
      itens: registro.itens.map(linha => {
        const item = d.itens.find(i => i.idItem === linha.idItem);
        return {
          ...linha,
          descricaoItem: item?.descricaoItem ?? linha.descricaoItem,
          unidade: item?.unidade ?? linha.unidade,
          saldoTotal: item?.saldoTotal ?? linha.saldoTotal,
        };
      }),
    };
  }

  private proximoId(ids: number[]): number {
    return ids.length ? Math.max(...ids) + 1 : 1;
  }
}
