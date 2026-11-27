import type { BancoLocal } from './banco-local.service';

/** Uma ocorrência por divergência finalizada; reaplicar não duplica nem reabre alertas. */
export function sincronizarAlertasInventario(d: BancoLocal): void {
  const alertas = d.alertas ?? (d.alertas = []);
  let nextId = Math.max(0, ...alertas.map(a => a.id)) + 1;
  const chaves = new Set(alertas.map(a => a.chave));
  for (const inventario of d.inventarios ?? []) {
    if (inventario.status !== 'finalizado' || !inventario.dataFim) continue;
    for (const divergencia of inventario.divergencias ?? []) {
      if (!divergencia.diferenca) continue;
      const chave = 'inventario:' + inventario.idInventario + ':' + divergencia.id;
      if (chaves.has(chave)) continue;
      const p = inventario.prateleiras.find(p => p.chave === divergencia.chavePrateleira);
      // Falta/sobra não prova erro de entrada ou saída: a causa permanece a investigar.
      alertas.push({
        id: nextId++, chave, tipo: 'divergencia_inventario',
        gravidade: divergencia.diferenca < 0 ? 'critico' : 'atencao',
        estado: 'aberto', detectadoEm: inventario.dataFim,
        titulo: divergencia.diferenca < 0 ? 'Falta identificada no inventário' : 'Sobra identificada no inventário',
        descricao: divergencia.descricaoItem + ' · Inventário #' + inventario.idInventario +
          ' · Sistema: ' + divergencia.saldoSistema + ' / Físico: ' + divergencia.quantidadeContada,
        idInventario: inventario.idInventario, idDivergencia: divergencia.id,
        idItem: divergencia.idItem ?? undefined, grupoKey: p?.grupoKey, idEstante: p?.idEstante,
        prateleira: p?.nivel, posicao: divergencia.posicao, idLocalizacao: divergencia.idLocalizacao,
        endereco: divergencia.prateleira, unidade: divergencia.unidade,
        saldoSistema: divergencia.saldoSistema, quantidadeContada: divergencia.quantidadeContada,
        diferenca: divergencia.diferenca, observacaoInventario: divergencia.observacao,
        justificativaInventario: divergencia.justificativa, contramedidas: []
      });
      chaves.add(chave);
    }
  }
}
