import { Component, HostListener, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Menu } from './components/menu/menu';
import { DialogoService } from './core/dialogo.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Menu],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly dialogo = inject(DialogoService);
  private readonly router = inject(Router);
  private readonly atalhos = ['painel', 'item', 'fornecedor', 'entradas', 'saidas', 'historico', 'conferencia', 'divergencias', 'relatorios'];

  @HostListener('document:keydown', ['$event'])
  navegarPorAtalho(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey || !/^F[1-9]$/.test(event.key)) return;
    event.preventDefault();
    // Não abandona formulários em modal nem confirmações pendentes.
    if (event.repeat || this.dialogo.estado() || document.querySelector('[aria-modal="true"]')) return;
    const rota = this.atalhos[Number(event.key.slice(1)) - 1];
    void this.router.navigate(['/' + rota]);
  }

  @HostListener('document:keydown.escape')
  fecharDialogoComEscape(): void {
    if (this.dialogo.estado()) this.dialogo.fechar(false);
  }
}
