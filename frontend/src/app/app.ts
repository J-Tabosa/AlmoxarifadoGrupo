import { Component, HostListener, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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

  @HostListener('document:keydown.escape')
  fecharDialogoComEscape(): void {
    if (this.dialogo.estado()) this.dialogo.fechar(false);
  }
}
