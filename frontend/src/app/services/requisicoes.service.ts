import { Injectable } from '@angular/core';
import { BancoLocalService, BancoLocal, validarMovimentacaoPermitida } from '../core/banco-local.service';
import { FuncionarioModel } from '../models/funcionario.model';
import { RequisicaoItemModel, RequisicaoModel, RequisicaoPayload } from '../models/requisicao.model';
import { PlantaService } from './planta';
import { tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RequisicoesService {
  constructor(private readonly banco: BancoLocalService, private readonly planta: PlantaService) {}

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
      validarMovimentacaoPermitida(d);
      this.validarFuncionarios(payload, d);
      const itens = this.validarItens(payload, d);
      this.movimentar([], itens, d);
      const registro: RequisicaoModel = {
        idRequisicao: this.proximoId(d.requisicoes.map(r => r.idRequisicao)),
        idFuncionario: payload.idFuncionario,
        idAlmoxarife: payload.idAlmoxarife,
        dataHoraS: payload.dataHoraS,
        justificativa: payload.justificativa,
        tipoS: payload.tipoS,
        itens,
        baixaAplicada: true,
      };
      d.requisicoes.push(registro);
      return this.comDetalhes(registro, d);
    }, true).pipe(tap(() => this.planta.refreshStock()));
  }

  atualizar(idRequisicao: number, idFuncionarioOriginal: number, payload: RequisicaoPayload) {
    return this.banco.alterar(d => {
      validarMovimentacaoPermitida(d);
      const registro = d.requisicoes.find(r => r.idRequisicao === idRequisicao && r.idFuncionario === idFuncionarioOriginal);
      if (!registro) throw new Error('Requisição não encontrada.');
      if (payload.idFuncionario !== idFuncionarioOriginal) {
        throw new Error('O solicitante não pode ser alterado nesta edição porque compõe a chave da requisição no modelo atual.');
      }
      this.validarFuncionarios(payload, d);
      const novos = this.validarItens(payload, d);
      this.movimentar(registro.baixaAplicada ? registro.itens : [], novos, d);
      registro.idAlmoxarife = payload.idAlmoxarife;
      registro.dataHoraS = payload.dataHoraS;
      registro.justificativa = payload.justificativa;
      registro.tipoS = payload.tipoS;
      registro.itens = novos;
      registro.baixaAplicada = true;
      return this.comDetalhes(registro, d);
    }, true).pipe(tap(() => this.planta.refreshStock()));
  }

  excluir(idRequisicao: number, idFuncionario: number) {
    return this.banco.alterar(d => {
      validarMovimentacaoPermitida(d);
      const registro = d.requisicoes.find(r => r.idRequisicao === idRequisicao && r.idFuncionario === idFuncionario);
      if (!registro) throw new Error('Requisição não encontrada.');
      if (registro.baixaAplicada) this.movimentar(registro.itens, [], d);
      d.requisicoes = d.requisicoes.filter(r => r !== registro);
    }, true).pipe(tap(() => this.planta.refreshStock()));
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
      if (!Number.isSafeInteger(linha.quantidadeS) || linha.quantidadeS < 1) throw new Error('A quantidade solicitada deve ser um número inteiro positivo.');
      const local = d.localizacoes.find(l => l.idLocalizacao === linha.idLocalizacao && l.statusL === 'A');
      if (!local || !(item.estoques ?? []).some(e => e.idLocalizacao === local.idLocalizacao)) {
        throw new Error('Selecione uma localização de origem válida para ' + item.descricaoItem + '.');
      }
      return {
        idItem: item.idItem,
        idLocalizacao: local.idLocalizacao,
        endereco: [local.sala, local.andar, local.posicao].filter(Boolean).join(' / '),
        quantidadeS: linha.quantidadeS,
        descricaoItem: item.descricaoItem,
        unidade: item.unidade,
        saldoTotal: item.saldoTotal ?? 0,
      };
    });
  }

  /** Aplica somente a diferença entre a baixa anterior e a nova.
   * BancoLocalService reverte toda a operação se qualquer linha falhar.
   */
  private movimentar(anteriores: RequisicaoItemModel[], novos: RequisicaoItemModel[], d: BancoLocal): void {
    const deltas = new Map<string, { idItem: number; idLocalizacao: number; delta: number }>();
    const acumular = (linha: RequisicaoItemModel, sinal: number) => {
      if (linha.idLocalizacao == null || !Number.isSafeInteger(linha.quantidadeS) || linha.quantidadeS < 1) {
        throw new Error('Registro de movimentação inválido. Não foi possível ajustar o estoque.');
      }
      const key = linha.idItem + ':' + linha.idLocalizacao;
      const atual = deltas.get(key) ?? { idItem: linha.idItem, idLocalizacao: linha.idLocalizacao, delta: 0 };
      atual.delta += sinal * linha.quantidadeS;
      deltas.set(key, atual);
    };
    anteriores.forEach(l => acumular(l, 1));
    novos.forEach(l => acumular(l, -1));

    // Primeiro calcula todos os saldos; somente depois valida conflitos de ocupação.
    for (const movimento of deltas.values()) {
      if (!movimento.delta) continue;
      const item = d.itens.find(i => i.idItem === movimento.idItem);
      const local = d.localizacoes.find(l => l.idLocalizacao === movimento.idLocalizacao);
      const estoque = item?.estoques?.find(e => e.idLocalizacao === movimento.idLocalizacao);
      if (!item || !local || local.statusL !== 'A' || !estoque) {
        throw new Error('A localização original não está disponível. Regularize o endereço antes de movimentar.');
      }
      if (local.idEstante != null) {
        const grupo = this.planta.groups.find(g => g.key === local.grupoKey);
        const estante = grupo?.slots.find(s => s.idlocalizacao === local.idEstante && !s.blocked);
        if (!estante || !local.prateleira || local.prateleira < 1 ||
            local.prateleira > this.planta.shelfCount(estante) || !local.posicaoInterna) {
          throw new Error('A estante ou prateleira original não está ativa. Regularize a planta antes de movimentar.');
        }
      }
      const saldo = estoque.saldo + movimento.delta;
      if (!Number.isSafeInteger(saldo) || saldo < 0) {
        throw new Error('Saldo insuficiente de ' + item.descricaoItem + ' na localização #' + local.idLocalizacao + '. Disponível: ' + estoque.saldo + '.');
      }
      if (movimento.delta > 0 && estoque.eMaximo > 0 && saldo > estoque.eMaximo) {
        throw new Error('O estorno ultrapassaria o estoque máximo da localização #' + local.idLocalizacao + '.');
      }
      estoque.saldo = saldo;
      item.saldoTotal = (item.estoques ?? []).reduce((total, e) => total + e.saldo, 0);
    }

    for (const movimento of deltas.values()) {
      if (movimento.delta <= 0) continue;
      const local = d.localizacoes.find(l => l.idLocalizacao === movimento.idLocalizacao);
      if (local?.idEstante != null && d.itens.some(i => i.idItem !== movimento.idItem &&
          (i.estoques ?? []).some(e => e.idLocalizacao === movimento.idLocalizacao && e.saldo > 0))) {
        throw new Error('Não é possível estornar: a posição física já contém outro material.');
      }
    }
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
