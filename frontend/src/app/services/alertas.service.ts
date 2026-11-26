import { Injectable, inject } from '@angular/core';
import { BancoLocal, BancoLocalService } from '../core/banco-local.service';
import { AlertaModel, ContramedidaPayload } from '../models/alerta.model';
import { PlantaService } from './planta';

@Injectable({ providedIn: 'root' })
export class AlertasService {
  private readonly banco = inject(BancoLocalService);
  private readonly planta = inject(PlantaService);

  listar() {
    return this.banco.alterar(d => this.sincronizar(d), true);
  }

  registrarContramedida(id: number, dados: ContramedidaPayload) {
    return this.banco.alterar(d => {
      const alertas = this.sincronizar(d);
      const alerta = alertas.find(a => a.id === id);
      if (!alerta || alerta.estado !== 'aberto') throw new Error('O alerta não está mais aberto. Atualize a consulta.');
      const descricao = dados.descricao.trim(), responsavel = dados.responsavel.trim();
      if (!descricao || descricao.length > 600 || !responsavel || responsavel.length > 100)
        throw new Error('Informe a contramedida e o responsável, respeitando os limites dos campos.');
      if (dados.situacao !== 'planejada' && dados.situacao !== 'executada')
        throw new Error('Selecione uma situação válida para a contramedida.');
      if (dados.prazo && (!/^\d{4}-\d{2}-\d{2}$/.test(dados.prazo) || Number.isNaN(Date.parse(dados.prazo))))
        throw new Error('Informe um prazo válido.');
      alerta.contramedidas.push({
        id: Math.max(0, ...alerta.contramedidas.map(c => c.id)) + 1,
        descricao, responsavel, prazo: dados.prazo || null, situacao: dados.situacao,
        registradaEm: new Date().toISOString()
      });
      return alertas;
    }, true);
  }

  // A fonte do alerta é o saldo real de cada vínculo, inclusive posições zeradas.
  // O inventário poderá fornecer outras categorias sem modificar o fluxo abaixo.
  private sincronizar(d: BancoLocal): AlertaModel[] {
    const alertas = d.alertas ?? (d.alertas = []);
    const agora = new Date().toISOString();
    const atuais = new Set<string>();
    let nextId = Math.max(0, ...alertas.map(a => a.id)) + 1;

    for (const item of d.itens) {
      if (item.statusIt !== 'A') continue;
      for (const estoque of item.estoques ?? []) {
        const local = d.localizacoes.find(l => l.idLocalizacao === estoque.idLocalizacao);
        if (!local || local.statusL !== 'A' || !(estoque.eMinimo > 0) || !(estoque.saldo < estoque.eMinimo)) continue;
        const chave = 'min:' + item.idItem + ':' + estoque.idLocalizacao;
        atuais.add(chave);
        const grupo = this.planta.groups.find(g => g.key === local.grupoKey);
        const estante = grupo?.slots.find(s => s.idlocalizacao === local.idEstante);
        const nome = estante?.descricao?.trim() || (estante ? String(estante.r).padStart(2, '0') + '-' + String(estante.c).padStart(2, '0') : '');
        const endereco = grupo && estante
          ? grupo.name + ' / ' + nome + ' / P' + local.prateleira + ' / Pos. ' + local.posicaoInterna
          : [local.sala, local.andar, local.posicao].filter(Boolean).join(' / ') || '#' + local.idLocalizacao;
        const dados = {
          gravidade: estoque.saldo <= 0 ? 'critico' as const : 'atencao' as const,
          titulo: estoque.saldo <= 0 ? 'Estoque zerado' : 'Estoque abaixo do mínimo',
          descricao: item.descricaoItem + ': saldo ' + estoque.saldo + ' ' + item.unidade + ' abaixo do mínimo de ' + estoque.eMinimo + '.',
          idItem: item.idItem, idLocalizacao: local.idLocalizacao, grupoKey: local.grupoKey,
          idEstante: local.idEstante, prateleira: local.prateleira, posicao: local.posicaoInterna,
          endereco, unidade: item.unidade, saldo: estoque.saldo, minimo: estoque.eMinimo, maximo: estoque.eMaximo
        };
        const existente = alertas.find(a => a.chave === chave && a.estado === 'aberto');
        if (existente) Object.assign(existente, dados);
        else alertas.push({
          ...dados, id: nextId++, chave, tipo: 'estoque_minimo', estado: 'aberto',
          detectadoEm: agora, contramedidas: []
        });
      }
    }

    for (const alerta of alertas) {
      if (alerta.tipo !== 'estoque_minimo' || alerta.estado !== 'aberto' || atuais.has(alerta.chave)) continue;
      const item = d.itens.find(i => i.idItem === alerta.idItem && i.statusIt === 'A');
      const estoque = item?.estoques?.find(e => e.idLocalizacao === alerta.idLocalizacao);
      const local = d.localizacoes.find(l => l.idLocalizacao === alerta.idLocalizacao && l.statusL === 'A');
      alerta.estado = 'resolvido';
      alerta.resolvidoEm = agora;
      if (estoque && local && estoque.eMinimo > 0 && estoque.saldo >= estoque.eMinimo) {
        alerta.saldo = estoque.saldo;
        alerta.minimo = estoque.eMinimo;
        alerta.maximo = estoque.eMaximo;
        alerta.motivoEncerramento = 'Saldo regularizado ou limite ajustado: saldo igual ou superior ao mínimo.';
      } else {
        alerta.motivoEncerramento = 'O vínculo deixou de estar ativo ou o limite mínimo deixou de ser configurado.';
      }
    }

    return [...alertas].sort((a, b) =>
      Number(b.estado === 'aberto') - Number(a.estado === 'aberto') ||
      Number(b.gravidade === 'critico') - Number(a.gravidade === 'critico') || b.id - a.id);
  }
}
