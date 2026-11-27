import { Injectable, inject } from '@angular/core';
import { BancoLocalService } from '../core/banco-local.service';
import { sincronizarAlertasInventario } from '../core/alertas-inventario';
import {
  InventarioDivergenciaPayload,
  InventarioFuncionario,
  InventarioModel,
  InventarioPrateleira,
  InventarioInicioPayload,
} from '../models/inventario.model';
import { PlantaService } from './planta';

@Injectable({ providedIn: 'root' })
export class InventariosService {
  private readonly banco = inject(BancoLocalService);
  private readonly planta = inject(PlantaService);

  listar() {
    return this.banco.ler(d => [...(d.inventarios ?? [])]
      .sort((a, b) => b.idInventario - a.idInventario));
  }

  iniciar(payload: InventarioInicioPayload) {
    return this.banco.alterar(d => {
      if ((d.inventarios ?? []).some(i => i.status === 'em_andamento')) {
        throw new Error('Já existe um inventário em andamento. Finalize-o antes de iniciar outro.');
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
        return {
          chave,
          grupoKey: grupo.key,
          grupoNome: grupo.name,
          idEstante: estante.idlocalizacao,
          nomeEstante: estante.descricao?.trim() || coordenada,
          nivel: selecao.nivel,
          itensSistema,
        };
      });

      const registro: InventarioModel = {
        idInventario: Math.max(0, ...(d.inventarios ?? []).map(i => i.idInventario)) + 1,
        dataInicio: new Date().toISOString(),
        dataFim: null,
        status: 'em_andamento',
        responsavel: this.resumo(responsavel),
        contadores: contadores.map(f => this.resumo(f)),
        prateleiras,
        divergencias: [],
        quantidadeDivergencias: 0,
        quantidadeJustificadas: 0,
      };
      d.inventarios ??= [];
      d.inventarios.push(registro);
      return registro;
    }, true);
  }

  finalizar(idInventario: number, payload: InventarioDivergenciaPayload[]) {
    return this.banco.alterar(d => {
      const inventario = (d.inventarios ?? []).find(i => i.idInventario === idInventario);
      if (!inventario || inventario.status !== 'em_andamento') {
        throw new Error('Este inventário não está mais em andamento. Atualize a tela.');
      }

      const chavesPermitidas = new Set(inventario.prateleiras.map(p => p.chave));
      const duplicadas = new Set<string>();
      const divergencias = (payload ?? []).map((linha, index) => {
        const prateleira = inventario.prateleiras.find(p => p.chave === linha.chavePrateleira);
        if (!prateleira || !chavesPermitidas.has(linha.chavePrateleira)) {
          throw new Error('Cada divergência deve pertencer a uma prateleira selecionada neste inventário.');
        }
        if (!Number.isSafeInteger(linha.quantidadeContada) || linha.quantidadeContada < 0) {
          throw new Error('Informe uma quantidade física inteira e não negativa para cada divergência.');
        }

        const item = linha.idItem === null ? null : d.itens.find(i => i.idItem === linha.idItem);
        if (linha.idItem !== null && !item) throw new Error('Um dos materiais da divergência não existe mais no catálogo.');
        const descricaoItem = item?.descricaoItem.trim() || (linha.descricaoItem ?? '').trim();
        if (!descricaoItem || descricaoItem.length > 120) {
          throw new Error('Informe o material da divergência (até 120 caracteres).');
        }

        if (linha.idItem === null && d.itens.some(i => this.normalizar(i.descricaoItem) === this.normalizar(descricaoItem))) {
          throw new Error('Este material já existe no catálogo. Selecione-o pelo cadastro para usar o saldo de referência correto.');
        }

        const chaveItem = linha.idItem !== null
          ? prateleira.chave + '|item:' + linha.idItem
          : prateleira.chave + '|manual:' + this.normalizar(descricaoItem);
        if (duplicadas.has(chaveItem)) throw new Error('O mesmo material foi registrado mais de uma vez na mesma prateleira.');
        duplicadas.add(chaveItem);

        const snapshot = linha.idItem === null
          ? undefined
          : prateleira.itensSistema.find(i => i.idItem === linha.idItem);
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
          prateleira: this.rotuloPrateleira(prateleira),
          idItem: item?.idItem ?? null,
          descricaoItem,
          unidade: snapshot?.unidade ?? item?.unidade ?? '',
          saldoSistema,
          quantidadeContada: linha.quantidadeContada,
          diferenca: linha.quantidadeContada - saldoSistema,
          observacao,
          justificativa,
        };
      });

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

  private normalizar(valor: string): string {
    return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
  }

  private rotuloPrateleira(p: InventarioPrateleira): string {
    return p.grupoNome + ' / Estante ' + p.nomeEstante + ' / Prateleira ' + p.nivel;
  }
}
