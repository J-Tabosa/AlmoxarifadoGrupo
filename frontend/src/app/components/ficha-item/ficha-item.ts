import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ItemModel } from '../../models/item.model';
import { EstoqueModel } from '../../models/estoque.model';

@Component({
  selector: 'app-ficha-item',
  imports: [RouterLink],
  templateUrl: './ficha-item.html',
  styleUrls: ['../item/item.css', './ficha-item.css']
})
export class FichaItem {
  readonly item = input.required<ItemModel>();
  readonly grupoKey = input.required<string>();
  readonly idEstante = input.required<number>();
  readonly prateleira = input.required<number>();
  readonly posicao = input.required<number>();
  readonly fechar = output<void>();

  get saldoTotal(): number {
    return (this.item().estoques ?? []).reduce((n, e) => n + e.saldo, 0);
  }

  origem(e: EstoqueModel): boolean {
    const l = e.localizacao;
    return !!l && l.grupoKey === this.grupoKey() && l.idEstante === this.idEstante() &&
      l.prateleira === this.prateleira() && l.posicaoInterna === this.posicao();
  }

  endereco(e: EstoqueModel): string {
    const l = e.localizacao;
    return l ? [l.sala, l.andar, l.posicao].filter(Boolean).join(' · ') : 'Localização #' + e.idLocalizacao;
  }

  get entradaParams() {
    return { item: this.item().idItem, grupo: this.grupoKey(), estante: this.idEstante(),
      prateleira: this.prateleira(), posicao: this.posicao() };
  }
}
