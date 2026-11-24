import { Routes } from '@angular/router';
import { Painel } from './components/painel/painel';
import { Consulta } from './components/consulta/consulta';
import { Cadastro } from './components/cadastro/cadastro';
import { Fornecedores } from './components/fornecedores/fornecedores';
import { Entradas } from './components/entradas/entradas';
import { Saidas } from './components/saidas/saidas';
import { Historico } from './components/historico/historico';
import { Conferencia } from './components/conferencia/conferencia';
import { Divergencias } from './components/divergencias/divergencias';
import { Relatorios } from './components/relatorios/relatorios';
import { Configuracoes } from './components/configuracoes/configuracoes';

// Cada rota renderiza uma página no router-outlet do layout principal.
export const routes: Routes = [
    { path: '', redirectTo: 'painel', pathMatch: 'full' },
    { path: 'painel', component: Painel },
    { path: 'consulta', component: Consulta },
    { path: 'cadastro', component: Cadastro },
    { path: 'fornecedores', component: Fornecedores },
    { path: 'entradas', component: Entradas },
    { path: 'saidas', component: Saidas },
    { path: 'historico', component: Historico },
    { path: 'conferencia', component: Conferencia },
    { path: 'divergencias', component: Divergencias },
    { path: 'relatorios', component: Relatorios },
    { path: 'configuracoes', component: Configuracoes },
    { path: '**', redirectTo: 'painel' }
];
