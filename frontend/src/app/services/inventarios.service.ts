import { Injectable, inject } from '@angular/core';
import { BancoLocal, BancoLocalService } from '../core/banco-local.service';
import { sincronizarAlertasInventario } from '../core/alertas-inventario';
import {
  InventarioDivergenciaPayload,
  InventarioFuncionario,
  InventarioModel,
  InventarioPrateleira,
  InventarioPosicaoSnapshot,
  InventarioInicioPayload,
} from '../models/inventario.model';
import { PlantaService } from './planta';

@Injectable({ providedIn: 'root' })
export class InventariosService {
  private readonly banco = inject(BancoLocalService);
  private readonly planta = inject(PlantaService);

  listar() {
    return this.banco.ler(d => (d.inventarios ?? []).map(i => i.status === 'em_andamento'
      ? { ...i, prateleiras: i.prateleiras.map(p => ({ ...p, posicoesSistema: this.posicoesReferencia(d, p) })) }
      : i).sort((a, b) => b.idInventario - a.idInventario));
  }

  iniciar(payload: InventarioInicioPayload) {
    return this.banco.alterar(d => {
      if ((d.inventarios ?? []).some(i => i.status === 'em_andamento')) {
        throw new Error('Já existe um inventário em andamento. Finalize ou cancele-o antes de iniciar outro.');
      }

      const responsavel = this.funcionarioAtivo(payload.idResponsavel, d.funcionarios, 'responsável');
      const idsContadores = [...new Set(payload.idsContadores ?? [])];
      if (!idsContadores.length) throw new Error('Selecione pelo menos um contador.');
      if (idsContadores.includes(responsavel.idFuncionario)) {
        throw new Error('O responsável deve ser diferente dos contadores.');
      }
      const contadores = idsContadores.map(id => this.funcionarioAtivo(id, d.funcionarios, 'contador'));
      if (!payload.prateleiras?.length) throw new Error('Selecione ao menos uma prateleira para contar.');

      const chaves = new Set<string>();
      const prateleiras: InventarioPrateleira[] = payload.prateleiras.map(selecao => {
        const grupo = this.planta.groups.find(g => g.key === selecao.grupoKey);
        const estante = grupo?.slots.find(s => s.idlocalizacao === selecao.idEstante && !s.blocked);
        if (!grupo || !estante || !Number.isSafeInteger(selecao.nivel) ||
            selecao.nivel < 1 || selecao.nivel > this.planta.shelfCount(estante)) {
          throw new Error('Uma das prateleiras selecionadas não existe ou está inativa. Atualize a tela e tente novamente.');
        }
        const chave = this.chavePrateleira(grupo.key, estante.idlocalizacao, selecao.nivel);
        if (chaves.has(chave)) throw new Error('Não selecione a mesma prateleira mais de uma vez.');
        chaves.add(chave);

        const locais = d.localizacoes.filter(l => l.statusL === 'A' &&
          l.grupoKey === grupo.key && l.idEstante === estante.idlocalizacao && l.prateleira === selecao.nivel);
        const idsLocais = new Set(locais.map(l => l.idLocalizacao));
        const itensSistema = d.itens.flatMap(item => {
          const estoques = (item.estoques ?? []).filter(e => idsLocais.has(e.idLocalizacao));
          if (!estoques.length) return [];
          return [{
            idItem: item.idItem,
            descricaoItem: item.descricaoItem,
            unidade: item.unidade,
            saldo: estoques.reduce((total, e) => total + e.saldo, 0),
          }];
        }).sort((a, b) => a.descricaoItem.localeCompare(b.descricaoItem, 'pt-BR'));

        const coordenada = String(estante.r).padStart(2, '0') + '-' + String(estante.c).padStart(2, '0');
        const referencia: InventarioPrateleira = {
          chave,
          grupoKey: grupo.key,
          grupoNome: grupo.name,
          idEstante: estante.idlocalizacao,
          nomeEstante: estante.descricao?.trim() || coordenada,
          nivel: selecao.nivel,
          itensSistema,
        };
        const posicoes = this.posicoesReferencia(d, referencia);
        if (!posicoes) throw new Error('Há materiais sem posição física válida na prateleira selecionada. Confira o cadastro.');
        return { ...referencia, posicoesSistema: posicoes };
      });

      const registro: InventarioModel = {
        idInventario: Math.max(0, ...(d.inventarios ?? []).map(i => i.idInventario)) + 1,
        dataInicio: new Date().toISOString(),
        dataFim: null,
        status: 'em_andamento',
        responsavel: this.resumo(responsavel),
        contadores: contadores.map(f => this.resumo(f)),
        prateleiras,
        estoqueCompleto: this.estoqueCompleto(chaves),
        divergencias: [],
        quantidadeDivergencias: 0,
        quantidadeJustificadas: 0,
      };
      d.inventarios ??= [];
      d.inventarios.push(registro);
      return registro;
    }, true);
  }

  cancelar(idInventario: number, motivo: string) {
    return this.banco.alterar(d => {
      const inventario = (d.inventarios ?? []).find(i => i.idInventario === idInventario);
      if (!inventario || inventario.status !== 'em_andamento') {
        throw new Error('Este inventário não está mais em andamento. Atualize a tela.');
      }

      const justificativa = (motivo ?? '').trim();
      if (justificativa.length < 5 || justificativa.length > 600) {
        throw new Error('Informe uma justificativa com pelo menos 5 e no máximo 600 caracteres.');
      }

      inventario.estoqueCompleto ??= this.estoqueCompleto(new Set(inventario.prateleiras.map(p => p.chave)));
      inventario.status = 'cancelado';
      inventario.dataFim = new Date().toISOString();
      inventario.motivoCancelamento = justificativa;
      return inventario;
    }, true);
  }

  finalizar(idInventario: number, payload: InventarioDivergenciaPayload[]) {
    return this.banco.alterar(d => {
      const inventario = (d.inventarios ?? []).find(i => i.idInventario === idInventario);
      if (!inventario || inventario.status !== 'em_andamento') {
        throw new Error('Este inventário não está mais em andamento. Atualize a tela.');
      }

      const chavesPermitidas = new Set(inventario.prateleiras.map(p => p.chave));
      if (inventario.prateleiras.some(p => this.posicoesReferencia(d, p) === undefined)) {
        throw new Error('Não foi possível reconstruir todas as posições do inventário antigo. Cancele e inicie uma nova contagem.');
      }
      const duplicadas = new Set<string>();
      const divergencias = (payload ?? []).map((linha, index) => {
        const prateleira = inventario.prateleiras.find(p => p.chave === linha.chavePrateleira);
        if (!prateleira || !chavesPermitidas.has(linha.chavePrateleira)) {
          throw new Error('Cada divergência deve pertencer a uma prateleira selecionada neste inventário.');
        }
        if (!Number.isSafeInteger(linha.quantidadeContada) || linha.quantidadeContada < 0) {
          throw new Error('Informe uma quantidade física inteira e não negativa para cada divergência.');
        }

        if (!Number.isSafeInteger(linha.posicao) || linha.posicao < 1)
          throw new Error('Informe uma posição física inteira e positiva.');
        const chaveLocal = prateleira.chave + '|pos:' + linha.posicao;
        if (duplicadas.has(chaveLocal)) throw new Error('Esta localização já possui uma divergência.');
        duplicadas.add(chaveLocal);
        const posicoes = this.posicoesReferencia(d, prateleira);
        if (!posicoes) throw new Error('Não foi possível reconstruir a referência por posição deste inventário antigo. Cancele e inicie uma nova contagem.');
        const snapshot = posicoes.find(p => p.posicao === linha.posicao && p.idItem === linha.idItem);
        if (linha.idItem !== null && !snapshot)
          throw new Error('O material não pertence à posição auditada no início.');
        if (linha.idItem === null && (posicoes.length > 0))
          throw new Error('Selecione um material vinculado a esta prateleira. Nenhum material só é permitido em prateleira sem vínculos.');
        const descricaoItem = snapshot?.descricaoItem ?? 'Nenhum material';
        const saldoSistema = snapshot?.saldo ?? 0;
        if (linha.quantidadeContada === saldoSistema) {
          throw new Error('A quantidade contada é igual ao saldo de referência. Remova essa linha: ela não é uma divergência.');
        }

        const observacao = (linha.observacao ?? '').trim();
        const justificativa = (linha.justificativa ?? '').trim();
        if (observacao.length > 500 || justificativa.length > 800) {
          throw new Error('A observação aceita até 500 caracteres e a justificativa até 800.');
        }
        return {
          id: index + 1,
          chavePrateleira: prateleira.chave,
          prateleira: this.rotuloPrateleira(prateleira) + ' / Pos. ' + linha.posicao,
          posicao: linha.posicao,
          idLocalizacao: snapshot?.idLocalizacao,
          idItem: snapshot?.idItem ?? null,
          descricaoItem,
          unidade: snapshot?.unidade ?? '',
          saldoSistema,
          quantidadeContada: linha.quantidadeContada,
          diferenca: linha.quantidadeContada - saldoSistema,
          observacao,
          justificativa,
        };
      });

      inventario.estoqueCompleto ??= this.estoqueCompleto(chavesPermitidas);
      inventario.prateleiras = inventario.prateleiras.map(p => ({ ...p, posicoesSistema: this.posicoesReferencia(d, p) }));
      inventario.divergencias = divergencias;
      inventario.quantidadeDivergencias = divergencias.length;
      inventario.quantidadeJustificadas = divergencias.filter(dvg => !!dvg.justificativa).length;
      inventario.dataFim = new Date().toISOString();
      inventario.status = 'finalizado';
      sincronizarAlertasInventario(d);
      return inventario;
    }, true);
  }

  chavePrateleira(grupoKey: string, idEstante: number, nivel: number): string {
    return grupoKey + '|' + idEstante + '|' + nivel;
  }

  private funcionarioAtivo(id: number, funcionarios: Array<{ idFuncionario: number; nomeFu: string; cargo: string; statusFu: string }>, papel: string) {
    const funcionario = funcionarios.find(f => f.idFuncionario === id && f.statusFu === 'A');
    if (!funcionario) throw new Error('Selecione um ' + papel + ' ativo.');
    return funcionario;
  }

  private resumo(funcionario: { idFuncionario: number; nomeFu: string; cargo: string }): InventarioFuncionario {
    return {
      idFuncionario: funcionario.idFuncionario,
      nomeFu: funcionario.nomeFu,
      cargo: funcionario.cargo,
    };
  }

  private estoqueCompleto(chaves: Set<string>): boolean {
    const ativas = this.planta.groups.flatMap(g => g.slots.filter(s => !s.blocked).flatMap(s =>
      Array.from({ length: this.planta.shelfCount(s) }, (_, i) => this.chavePrateleira(g.key, s.idlocalizacao, i + 1))));
    return ativas.length > 0 && chaves.size === ativas.length && ativas.every(chave => chaves.has(chave));
  }

  private posicoesAtuais(d: BancoLocal, grupoKey: string, idEstante: number, nivel: number): InventarioPosicaoSnapshot[] {
    const locais = d.localizacoes.filter(l => l.statusL === 'A' && l.grupoKey === grupoKey &&
      l.idEstante === idEstante && l.prateleira === nivel && Number.isSafeInteger(l.posicaoInterna) && l.posicaoInterna! > 0);
    return locais.flatMap(l => d.itens.flatMap(item => (item.estoques ?? [])
      .filter(e => e.idLocalizacao === l.idLocalizacao)
      .map(e => ({ posicao: l.posicaoInterna!, idLocalizacao: l.idLocalizacao, idItem: item.idItem,
        descricaoItem: item.descricaoItem, unidade: item.unidade, saldo: e.saldo }))))
      .sort((a, b) => a.posicao - b.posicao || a.idItem - b.idItem);
  }

  // Inventários anteriores congelavam apenas o total por prateleira. Enquanto o
  // estoque estiver bloqueado, recupera as posições somente se os totais conferirem.
  private posicoesReferencia(d: BancoLocal, p: InventarioPrateleira): InventarioPosicaoSnapshot[] | undefined {
    if (p.posicoesSistema !== undefined) return p.posicoesSistema;
    const atuais = this.posicoesAtuais(d, p.grupoKey, p.idEstante, p.nivel);
    const totais = new Map<number, number>();
    atuais.forEach(a => totais.set(a.idItem, (totais.get(a.idItem) ?? 0) + a.saldo));
    if (totais.size !== p.itensSistema.length || !p.itensSistema.every(i => totais.get(i.idItem) === i.saldo)) return undefined;
    return atuais.map(a => {
      const anterior = p.itensSistema.find(i => i.idItem === a.idItem)!;
      return { ...a, descricaoItem: anterior.descricaoItem, unidade: anterior.unidade };
    });
  }

  private rotuloPrateleira(p: InventarioPrateleira): string {
    return p.grupoNome + ' / Estante ' + p.nomeEstante + ' / Prateleira ' + p.nivel;
  }
}
