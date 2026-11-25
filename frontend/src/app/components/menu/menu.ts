import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/** Cabeçalho e navegação principal da aplicação. */
@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './menu.html',
  styleUrl: './menu.css',
})
export class Menu {}
