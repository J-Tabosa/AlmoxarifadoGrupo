import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { mensagemErro } from '../../core/app-error';
import { FuncionarioModel, FuncionarioPayload } from '../../models/funcionario.model';
import { SetorModel } from '../../models/setor.model';
import { FuncionariosService } from '../../services/funcionarios.service';
import { SetoresService } from '../../services/setores.service';

@Component({
  selector: 'app-funcionarios',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './funcionarios.html',
  styleUrl: './funcionarios.css',
})
export class Funcionarios implements OnInit {
  funcionarios: FuncionarioModel[] = [];
  setores: SetorModel[] = [];
  idEditando: number | null = null;
  idSetorOriginal: number | null = null;
  idSetor: number | null = null;
  nomeFu = '';
  cargo = '';
  statusFu = 'A';
  carregando = false;
  salvando = false;
  mensagem = '';
  erro = '';

  constructor(
    private readonly api: FuncionariosService,
    private readonly setoresApi: SetoresService,
  ) {}

  ngOnInit(): void {
    this.carregarSetores();
    this.carregar();
  }

  carregarSetores(): void {
    this.setoresApi.listar().subscribe({
      next: (dados) => this.setores = dados,
      error: (e) => this.erro = mensagemErro(e),
    });
  }

  carregar(): void {
    this.carregando = true;
    this.api.listar().subscribe({
      next: (dados) => { this.funcionarios = dados; this.carregando = false; },
      error: (e) => { this.erro = mensagemErro(e); this.carregando = false; },
    });
  }

  salvar(): void {
    if (this.salvando || this.idSetor === null) return;

    const payload: FuncionarioPayload = {
      idSetor: Number(this.idSetor),
      nomeFu: this.nomeFu.trim(),
      cargo: this.cargo.trim(),
      statusFu: this.statusFu,
    };

    this.salvando = true;
    this.erro = '';
    const chamada = this.idEditando === null
      ? this.api.criar(payload)
      : this.api.atualizarChave(this.idEditando, this.idSetorOriginal ?? this.idSetor, payload);

    chamada.subscribe({
      next: () => {
        this.mensagem = this.idEditando === null ? 'Funcionário cadastrado.' : 'Funcionário atualizado.';
        this.salvando = false;
        this.limpar(false);
        this.carregar();
      },
      error: (e) => { this.erro = mensagemErro(e); this.salvando = false; },
    });
  }

  editar(funcionario: FuncionarioModel): void {
    this.idEditando = funcionario.idFuncionario;
    this.idSetorOriginal = funcionario.idSetor;
    this.idSetor = funcionario.idSetor;
    this.nomeFu = funcionario.nomeFu;
    this.cargo = funcionario.cargo;
    this.statusFu = funcionario.statusFu;
    this.mensagem = '';
    this.erro = '';
  }

  excluir(funcionario: FuncionarioModel): void {
    if (!window.confirm(`Excluir o funcionário "${funcionario.nomeFu}"?`)) return;
    this.api.excluirChave(funcionario.idFuncionario, funcionario.idSetor).subscribe({
      next: () => {
        this.mensagem = 'Funcionário excluído.';
        if (this.idEditando === funcionario.idFuncionario) this.limpar(false);
        this.carregar();
      },
      error: (e) => this.erro = mensagemErro(e),
    });
  }

  limpar(limparMensagens = true): void {
    this.idEditando = null;
    this.idSetorOriginal = null;
    this.idSetor = null;
    this.nomeFu = '';
    this.cargo = '';
    this.statusFu = 'A';
    if (limparMensagens) { this.mensagem = ''; this.erro = ''; }
  }
}
