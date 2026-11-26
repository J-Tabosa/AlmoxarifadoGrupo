import { Routes } from '@angular/router';
import { Painel } from './components/painel/painel';
import { Item } from './components/item/item';
import { Fornecedor } from './components/fornecedor/fornecedor';
import { Entradas } from './components/entradas/entradas';
import { Saidas } from './components/saidas/saidas';
import { Historico } from './components/historico/historico';
import { Conferencia } from './components/conferencia/conferencia';
import { Divergencias } from './components/divergencias/divergencias';
import { Relatorios } from './components/relatorios/relatorios';
import { Configuracoes } from './components/configuracoes/configuracoes';

// Cada rota renderiza uma página independente no router-outlet principal.
export const routes: Routes = [
  { path: '', redirectTo: 'painel', pathMatch: 'full' },
  { path: 'painel', component: Painel },
  { path: 'item', component: Item },
  { path: 'fornecedor', component: Fornecedor },
  // Compatibilidade com links antigos: as páginas antigas apontam para suas novas telas.
  { path: 'consulta', redirectTo: 'item', pathMatch: 'full' },
  { path: 'fornecedores', redirectTo: 'fornecedor', pathMatch: 'full' },
  { path: 'entradas', component: Entradas },
  { path: 'saidas', component: Saidas },
  { path: 'historico', component: Historico },
  { path: 'conferencia', component: Conferencia },
  { path: 'divergencias', component: Divergencias },
  { path: 'relatorios', component: Relatorios },
  { path: 'configuracoes', component: Configuracoes, canDeactivate: [(component: Configuracoes) => component.canLeave()] },
  { path: '**', redirectTo: 'painel' },
];
