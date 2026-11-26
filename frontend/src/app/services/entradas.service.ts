import { Injectable, inject } from '@angular/core';
import { tap, throwError } from 'rxjs';
import { BancoLocalService, validarMovimentacaoPermitida } from '../core/banco-local.service';
import { EntradaModel, EntradaPayload } from '../models/entrada.model';
import { LocalizacaoModel } from '../models/localizacao.model';
import { PlantaService } from './planta';

@Injectable({ providedIn: 'root' })
export class EntradasService {
  private readonly banco = inject(BancoLocalService);
  private readonly planta = inject(PlantaService);

  listar() {
    return this.banco.ler(d => [...d.entradas].sort((a, b) => b.idEntrada - a.idEntrada));
  }

  registrar(payload: EntradaPayload) {
    // Valide o endereço no mapa real do navegador, não apenas no formulário.
    this.planta.refreshStock();
    const grupo = this.planta.groups.find(g => g.key === payload.grupoKey);
    const estante = grupo?.slots.find(s => s.idlocalizacao === payload.idEstante && !s.blocked);
    if (!grupo || !estante) return throwError(() => new Error('Selecione uma estante ativa.'));
    if (!Number.isInteger(payload.prateleira) || payload.prateleira < 1 ||
        payload.prateleira > this.planta.shelfCount(estante) ||
        !Number.isSafeInteger(payload.posicao) || payload.posicao < 1) {
      return throwError(() => new Error('Informe uma prateleira existente e uma posição inteira positiva.'));
    }
    if (!Number.isSafeInteger(payload.quantidade) || payload.quantidade < 1)
      return throwError(() => new Error('Informe uma quantidade inteira maior que zero.'));
    if (!payload.dataHoraE || Number.isNaN(Date.parse(payload.dataHoraE)))
      return throwError(() => new Error('Informe a data e hora da entrada.'));
    if (payload.validade && (Number.isNaN(Date.parse(payload.validade)) || payload.validade < payload.dataHoraE.slice(0, 10)))
      return throwError(() => new Error('A validade deve ser igual ou posterior à data de entrada.'));
    try { this.planta.ensureSaved(); }
    catch (erro) { return throwError(() => erro); }

    const coord = String(estante.r).padStart(2, '0') + '-' + String(estante.c).padStart(2, '0');
    const nome = estante.descricao?.trim() || coord;
    const endereco = grupo.name + ' / ' + nome + ' / P' + payload.prateleira + ' / Pos. ' + payload.posicao;

    // Uma única transação local registra histórico, endereço e saldo.
    return this.banco.alterar(d => {
      validarMovimentacaoPermitida(d);
      const item = d.itens.find(i => i.idItem === payload.idItem && i.statusIt === 'A');
      if (!item) throw new Error('Selecione um item ativo do catálogo.');
      const fornecedor = d.fornecedores.find(f => f.idFornecedor === payload.idFornecedor && f.statusFo === 'A');
      if (payload.idFornecedor !== null && !fornecedor) throw new Error('Fornecedor inválido ou inativo.');

      let local = d.localizacoes.find(l => l.grupoKey === grupo.key && l.idEstante === estante.idlocalizacao &&
        l.prateleira === payload.prateleira && l.posicaoInterna === payload.posicao);
      if (!local) {
        // O ID interno não é o ID do quadrado da planta. Evita colisões com localizações antigas.
        const idLocalizacao = Math.max(0, ...d.localizacoes.map(l => l.idLocalizacao),
          ...d.itens.flatMap(i => (i.estoques ?? []).map(e => e.idLocalizacao))) + 1;
        const nova: LocalizacaoModel = {
          idLocalizacao, sala: grupo.name, andar: '', statusL: 'A',
          posicao: nome + ' / P' + payload.prateleira + ' / Pos. ' + payload.posicao,
          grupoKey: grupo.key, idEstante: estante.idlocalizacao,
          prateleira: payload.prateleira, posicaoInterna: payload.posicao
        };
        d.localizacoes.push(nova);
        local = nova;
      }
      if (local.statusL !== 'A') throw new Error('Esta localização interna está inativa.');
      const id = local.idLocalizacao;
      if (d.itens.some(i => i.idItem !== item.idItem && (i.estoques ?? []).some(e => e.idLocalizacao === id && e.saldo > 0)))
        throw new Error('A posição já contém outro material. Escolha outra posição.');
      local.sala = grupo.name;
      local.posicao = nome + ' / P' + payload.prateleira + ' / Pos. ' + payload.posicao;
      const stocks = item.estoques ?? (item.estoques = []);
      let stock = stocks.find(e => e.idLocalizacao === id);
      if (!stock) {
        const eMinimo = payload.eMinimo ?? 0;
        const eMaximo = payload.eMaximo ?? 0;
        if (!Number.isSafeInteger(eMinimo) || !Number.isSafeInteger(eMaximo) ||
            eMinimo < 0 || eMaximo < eMinimo) {
          throw new Error('Informe limites inteiros e não negativos. O estoque máximo deve ser igual ou superior ao mínimo.');
        }
        stock = { idItem: item.idItem, idLocalizacao: id, saldo: 0, eMinimo, eMaximo };
        stocks.push(stock);
      }
      const novoSaldo = stock.saldo + payload.quantidade;
      if (!Number.isSafeInteger(novoSaldo)) throw new Error('Quantidade excede o limite permitido.');
      if (stock.eMaximo > 0 && novoSaldo > stock.eMaximo) throw new Error('O saldo ultrapassaria o máximo configurado para a posição.');
      stock.saldo = novoSaldo;
      item.saldoTotal = stocks.reduce((total, e) => total + e.saldo, 0);
      const registro: EntradaModel = {
        ...payload, eMinimo: stock.eMinimo, eMaximo: stock.eMaximo,
        lote: payload.lote.trim(), idEntrada: Math.max(0, ...d.entradas.map(e => e.idEntrada)) + 1,
        idLocalizacao: id, descricaoItem: item.descricaoItem, unidade: item.unidade,
        nomeFornecedor: fornecedor?.nomeFo ?? 'Não informado', endereco
      };
      d.entradas.push(registro);
      return registro;
    }, true).pipe(tap(() => this.planta.refreshStock()));
  }
}
