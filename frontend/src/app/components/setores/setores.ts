import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { mensagemErro } from '../../core/app-error';
import { SetorModel } from '../../models/setor.model';
import { SetoresService } from '../../services/setores.service';

@Component({
  selector: 'app-setores',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './setores.html',
  styleUrl: './setores.css',
})
export class Setores implements OnInit {
  setores: SetorModel[] = [];
  nomeSetor = '';
  idEditando: number | null = null;
  carregando = false;
  salvando = false;
  mensagem = '';
  erro = '';

  constructor(private readonly api: SetoresService) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando = true;
    this.erro = '';
    this.api.listar().subscribe({
      next: (dados) => {
        this.setores = dados;
        this.carregando = false;
      },
      error: (e) => {
        this.erro = mensagemErro(e);
        this.carregando = false;
      },
    });
  }

  salvar(): void {
    const nome = this.nomeSetor.trim();
    if (!nome || this.salvando) return;

    this.salvando = true;
    this.mensagem = '';
    this.erro = '';
    const payload = { nomeSetor: nome };
    const chamada = this.idEditando === null
      ? this.api.criar(payload)
      : this.api.atualizar(this.idEditando, payload);

    chamada.subscribe({
      next: () => {
        this.mensagem = this.idEditando === null ? 'Setor cadastrado.' : 'Setor atualizado.';
        this.salvando = false;
        this.limpar(false);
        this.carregar();
      },
      error: (e) => {
        this.erro = mensagemErro(e);
        this.salvando = false;
      },
    });
  }

  editar(setor: SetorModel): void {
    this.idEditando = setor.idSetor;
    this.nomeSetor = setor.nomeSetor;
    this.mensagem = '';
    this.erro = '';
  }

  excluir(setor: SetorModel): void {
    if (!window.confirm(`Excluir o setor "${setor.nomeSetor}"?`)) return;
    this.api.excluir(setor.idSetor).subscribe({
      next: () => {
        this.mensagem = 'Setor excluído.';
        if (this.idEditando === setor.idSetor) this.limpar(false);
        this.carregar();
      },
      error: (e) => this.erro = mensagemErro(e),
    });
  }

  limpar(limparMensagens = true): void {
    this.idEditando = null;
    this.nomeSetor = '';
    if (limparMensagens) {
      this.mensagem = '';
      this.erro = '';
    }
  }
}
