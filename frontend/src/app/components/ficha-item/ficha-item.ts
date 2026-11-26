import { Component, ElementRef, HostListener, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ItemModel } from '../../models/item.model';
import { EstoqueModel } from '../../models/estoque.model';
import { DialogoService } from '../../core/dialogo.service';

@Component({
  selector: 'app-ficha-item',
  imports: [RouterLink],
  templateUrl: './ficha-item.html',
  styleUrls: ['../item/item.css', './ficha-item.css']
})
export class FichaItem {
  private readonly host: HTMLElement = inject(ElementRef<HTMLElement>).nativeElement;
  private readonly dialogo = inject(DialogoService);

  // Os atalhos acionam os mesmos botões, preservando os parâmetros e bloqueios existentes.
  @HostListener('document:keydown', ['$event'])
  movimentarPorAtalho(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.repeat || event.isComposing || event.ctrlKey ||
        event.altKey || event.metaKey || this.dialogo.estado()) return;
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target?.closest('input:not([readonly]), textarea:not([readonly]), select, [contenteditable]:not([contenteditable="false"])')) return;
    const tecla = event.key.toLowerCase();
    if (tecla !== 'i' && tecla !== 'o') return;
    const botao = this.host.querySelector<HTMLButtonElement>(tecla === 'i' ? '.ficha-entrada' : '.ficha-saida');
    if (!botao || botao.disabled) return;
    event.preventDefault();
    botao.click();
  }

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

  get origemEstoque(): EstoqueModel | undefined {
    return (this.item().estoques ?? []).find(e => this.origem(e));
  }

  get saidaParams() {
    return { item: this.item().idItem, localizacao: this.origemEstoque?.idLocalizacao };
  }

  get entradaParams() {
    return { item: this.item().idItem, grupo: this.grupoKey(), estante: this.idEstante(),
      prateleira: this.prateleira(), posicao: this.posicao() };
  }
}
