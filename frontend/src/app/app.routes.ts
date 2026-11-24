import { Routes } from '@angular/router';
import { Painel } from './components/painel/painel';
import { Consulta } from './components/consulta/consulta';
import { Cadastro } from './components/cadastro/cadastro';

export const routes: Routes = [
  { path: '', redirectTo: 'painel', pathMatch: 'full' },
  { path: 'painel', component: Painel },
  { path: 'consulta', component: Consulta },
  { path: 'cadastro', component: Cadastro }
];