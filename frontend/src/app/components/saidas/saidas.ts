import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { mensagemErro } from '../../core/app-error';
import { DialogoService } from '../../core/dialogo.service';
import { FuncionarioModel } from '../../models/funcionario.model';
import { ItemModel } from '../../models/item.model';
import { RequisicaoModel, RequisicaoPayload } from '../../models/requisicao.model';
import { FuncionariosService } from '../../services/funcionarios.service';
import { ItensService } from '../../services/itens.service';
import { RequisicoesService } from '../../services/requisicoes.service';

interface LinhaRequisicaoForm {
  idItem: number | null;
  quantidadeS: number;
}

@Component({
  selector: 'app-saidas',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './saidas.html',
  styleUrl: './saidas.css',
})
export class Saidas implements OnInit {
  funcionarios: FuncionarioModel[] = [];
  itensCatalogo: ItemModel[] = [];
  requisicoes: RequisicaoModel[] = [];

  idSolicitanteForm: number | null = null;
  idAlmoxarifeForm: number | null = null;
  idEditando: number | null = null;
  idSolicitanteEditando: number | null = null;

  dataHoraS = this.dataHoraLocalAtual();
  justificativa = 'Consumo interno';
  tipoS = 'consumo';
  linhas: LinhaRequisicaoForm[] = [{ idItem: null, quantidadeS: 1 }];

  carregando = false;
  salvando = false;

  constructor(
    private readonly api: RequisicoesService,
    private readonly funcionariosApi: FuncionariosService,
    private readonly itensApi: ItensService,
    private readonly dialogo: DialogoService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.carregarFuncionarios();
    this.carregarItens();
    this.route.queryParamMap.subscribe(params => {
      const idEdicao = Number(params.get('editar'));
      if (!idEdicao) {
        const idItem = Number(params.get('item'));
        if (this.idEditando === null && this.itensCatalogo.some(i => i.idItem === idItem)) {
          this.linhas = [{ idItem, quantidadeS: 1 }];
        }
        return;
      }
      this.api.listar().subscribe({
        next: dados => {
          const requisicao = dados.find(item => item.idRequisicao === idEdicao);
          if (requisicao) this.editar(requisicao);
          else this.dialogo.erro(`A requisição #${idEdicao} não foi encontrada.`, 'Requisição não encontrada');
        },
        error: e => this.dialogo.erro(mensagemErro(e), 'Erro ao carregar requisição'),
      });
    });
  }

  private dataHoraLocalAtual(): string {
    const agora = new Date();
    const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  private carregarFuncionarios(): void {
    this.funcionariosApi.listar().subscribe({
      next: dados => {
        this.funcionarios = dados.filter(x => x.statusFu === 'A');
        // Os dois campos são seleções independentes. Não há perfil, permissão
        // ou filtragem por cargo nesta etapa local.
        const funcionarioPadrao = this.funcionarios[0]?.idFuncionario ?? null;
        this.idSolicitanteForm ??= funcionarioPadrao;
        this.idAlmoxarifeForm ??= funcionarioPadrao;
      },
      error: e => this.dialogo.erro(mensagemErro(e), 'Erro ao carregar funcionários'),
    });
  }

  private carregarItens(): void {
    this.itensApi.listar().subscribe({
      next: dados => this.itensCatalogo = dados.filter(x => x.statusIt === 'A'),
      error: e => this.dialogo.erro(mensagemErro(e), 'Erro ao carregar itens'),
    });
  }


  iniciarNova(): void {
    this.limparFormulario();
    const funcionarioPadrao = this.funcionarios[0]?.idFuncionario ?? null;
    this.idSolicitanteForm = funcionarioPadrao;
    this.idAlmoxarifeForm = funcionarioPadrao;
  }

  adicionarLinha(): void {
    this.linhas.push({ idItem: null, quantidadeS: 1 });
  }

  removerLinha(index: number): void {
    if (this.linhas.length > 1) this.linhas.splice(index, 1);
  }

  itensDisponiveis(index: number): ItemModel[] {
    const selecionados = new Set(
      this.linhas
        .filter((linha, i) => i !== index && linha.idItem !== null)
        .map(linha => linha.idItem),
    );
    return this.itensCatalogo.filter(item => !selecionados.has(item.idItem));
  }

  itemSelecionado(idItem: number | null): ItemModel | undefined {
    return this.itensCatalogo.find(item => item.idItem === idItem);
  }

  nomeFuncionario(idFuncionario: number | null | undefined): string {
    if (idFuncionario == null) return 'Não informado';
    return this.funcionarios.find(x => x.idFuncionario === idFuncionario)?.nomeFu
      || `Funcionário #${idFuncionario}`;
  }

  nomeSetorFuncionario(idFuncionario: number | null): string {
    const funcionario = this.funcionarios.find(x => x.idFuncionario === idFuncionario);
    return funcionario?.setor?.nomeSetor || (funcionario ? `Setor #${funcionario.idSetor}` : 'Não informado');
  }

  editar(requisicao: RequisicaoModel): void {
    this.idEditando = requisicao.idRequisicao;
    this.idSolicitanteEditando = requisicao.idFuncionario;
    this.idSolicitanteForm = requisicao.idFuncionario;
    this.idAlmoxarifeForm = requisicao.idAlmoxarife;
    this.dataHoraS = this.paraDateTimeLocal(requisicao.dataHoraS);
    this.tipoS = requisicao.tipoS || 'consumo';
    this.justificativa = requisicao.justificativa || '';
    this.linhas = (requisicao.itens || []).map(item => ({
      idItem: item.idItem,
      quantidadeS: item.quantidadeS,
    }));
    if (this.linhas.length === 0) this.linhas = [{ idItem: null, quantidadeS: 1 }];
  }

  private paraDateTimeLocal(valor: string): string {
    if (!valor) return this.dataHoraLocalAtual();
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return valor.slice(0, 16);
    const local = new Date(data.getTime() - data.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  salvar(): void {
    if (this.salvando) return;
    if (this.idAlmoxarifeForm === null) {
      this.dialogo.erro('Selecione o almoxarife responsável pelo registro da requisição.', 'Almoxarife obrigatório');
      return;
    }
    if (this.idSolicitanteForm === null) {
      this.dialogo.erro('Selecione o funcionário solicitante.', 'Solicitante obrigatório');
      return;
    }
    const validas = this.linhas.filter(x => x.idItem !== null && Number(x.quantidadeS) > 0);
    if (validas.length === 0) {
      this.dialogo.erro('Adicione pelo menos um item com quantidade maior que zero.', 'Itens da requisição');
      return;
    }
    if (validas.length !== this.linhas.length) {
      this.dialogo.erro('Preencha o item e a quantidade de todas as linhas ou remova as linhas vazias.', 'Linhas incompletas');
      return;
    }
    if (new Set(validas.map(x => x.idItem)).size !== validas.length) {
      this.dialogo.erro('O mesmo item não pode aparecer duas vezes na requisição. Ajuste a quantidade em uma única linha.', 'Item duplicado');
      return;
    }
    if (this.tipoS !== 'consumo' && !this.justificativa.trim()) {
      this.dialogo.erro('Informe a justificativa para perda ou avaria.', 'Justificativa obrigatória');
      return;
    }

    const payload: RequisicaoPayload = {
      idAlmoxarife: Number(this.idAlmoxarifeForm),
      idFuncionario: Number(this.idSolicitanteForm),
      dataHoraS: this.dataHoraS,
      justificativa: this.justificativa.trim() || 'Consumo interno',
      tipoS: this.tipoS,
      itens: validas.map(x => ({ idItem: Number(x.idItem), quantidadeS: Number(x.quantidadeS) })),
    };

    this.salvando = true;
    const chamada = this.idEditando === null
      ? this.api.criar(payload)
      : this.api.atualizar(this.idEditando, this.idSolicitanteEditando ?? Number(this.idSolicitanteForm), payload);

    chamada.subscribe({
      next: () => {
        const estavaEditando = this.idEditando !== null;
        this.dialogo.sucesso(
          estavaEditando ? 'Requisição atualizada.' : 'Requisição cadastrada.',
          estavaEditando ? 'Requisição atualizada' : 'Requisição cadastrada',
        );
        this.salvando = false;
        this.limparFormulario();
        this.router.navigate([], { relativeTo: this.route, queryParams: { editar: null, item: null }, queryParamsHandling: 'merge' });
      },
      error: e => {
        this.dialogo.erro(mensagemErro(e), 'Erro ao salvar requisição');
        this.salvando = false;
      },
    });
  }


  limparFormulario(): void {
    this.idEditando = null;
    this.idSolicitanteEditando = null;
    this.dataHoraS = this.dataHoraLocalAtual();
    this.justificativa = 'Consumo interno';
    this.tipoS = 'consumo';
    this.linhas = [{ idItem: null, quantidadeS: 1 }];
  }
}
