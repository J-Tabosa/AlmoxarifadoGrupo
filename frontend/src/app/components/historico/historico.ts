import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { mensagemErro } from '../../core/app-error';
import { DialogoService } from '../../core/dialogo.service';
import { RequisicaoModel } from '../../models/requisicao.model';
import { RequisicoesService } from '../../services/requisicoes.service';

@Component({
  selector: 'app-historico',
  standalone: true,
  imports: [FormsModule, DatePipe],
  styleUrl: './historico.css',
  templateUrl: './historico.html',
})
export class Historico implements OnInit {
  requisicoes: RequisicaoModel[] = [];
  pesquisa = '';
  carregando = false;

  constructor(
    private readonly requisicoesService: RequisicoesService,
    private readonly dialogo: DialogoService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void { this.carregar(); }

  get requisicoesFiltradas(): RequisicaoModel[] {
    const termo = this.pesquisa.trim().toLocaleLowerCase();
    if (!termo) return this.requisicoes;
    return this.requisicoes.filter(requisicao => {
      const campos = [
        String(requisicao.idRequisicao),
        String(requisicao.idAlmoxarife),
        String(requisicao.idFuncionario),
        requisicao.almoxarife?.nomeFu ?? '',
        requisicao.funcionario?.nomeFu ?? '',
        ...requisicao.itens.flatMap(item => [String(item.idItem), item.descricaoItem ?? '']),
      ];
      return campos.some(campo => campo.toLocaleLowerCase().includes(termo));
    });
  }

  carregar(): void {
    this.carregando = true;
    this.requisicoesService.listar().subscribe({
      next: dados => { this.requisicoes = dados; this.carregando = false; },
      error: erro => { this.dialogo.erro(mensagemErro(erro), 'Erro ao carregar histórico'); this.carregando = false; },
    });
  }

  editar(requisicao: RequisicaoModel): void {
    this.router.navigate(['/saidas'], { queryParams: { editar: requisicao.idRequisicao } });
  }

  async excluir(requisicao: RequisicaoModel): Promise<void> {
    const confirmado = await this.dialogo.confirmar(
      `Deseja realmente excluir a requisição #${requisicao.idRequisicao}? ${requisicao.baixaAplicada ? 'O saldo será devolvido às localizações originais.' : 'Este registro antigo não realizou baixa; não haverá devolução de saldo.'}`,
      'Excluir requisição',
    );
    if (!confirmado) return;
    this.requisicoesService.excluir(requisicao.idRequisicao, requisicao.idFuncionario).subscribe({
      next: () => { this.dialogo.sucesso('Requisição excluída.', 'Requisição excluída'); this.carregar(); },
      error: erro => this.dialogo.erro(mensagemErro(erro), 'Erro ao excluir requisição'),
    });
  }
}
