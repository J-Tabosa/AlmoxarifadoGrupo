import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { mensagemErro } from '../../core/app-error';
import { DialogoService } from '../../core/dialogo.service';
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

  constructor(
    private readonly api: SetoresService,
    private readonly dialogo: DialogoService,
  ) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando = true;
    this.api.listar().subscribe({
      next: (dados) => {
        this.setores = dados;
        this.carregando = false;
      },
      error: (e) => {
        this.dialogo.erro(mensagemErro(e), 'Erro ao carregar setores');
        this.carregando = false;
      },
    });
  }

  salvar(): void {
    const nome = this.nomeSetor.trim();
    if (!nome || this.salvando) return;

    this.salvando = true;
    const payload = { nomeSetor: nome };
    const chamada = this.idEditando === null
      ? this.api.criar(payload)
      : this.api.atualizar(this.idEditando, payload);

    chamada.subscribe({
      next: () => {
        const estavaEditando = this.idEditando !== null;
        this.dialogo.sucesso(
          estavaEditando ? 'Setor atualizado.' : 'Setor cadastrado.',
          estavaEditando ? 'Setor atualizado' : 'Setor cadastrado',
        );
        this.salvando = false;
        this.limpar();
        this.carregar();
      },
      error: (e) => {
        this.dialogo.erro(mensagemErro(e), 'Erro ao salvar setor');
        this.salvando = false;
      },
    });
  }

  editar(setor: SetorModel): void {
    this.idEditando = setor.idSetor;
    this.nomeSetor = setor.nomeSetor;
  }

  async excluir(setor: SetorModel): Promise<void> {
    const confirmado = await this.dialogo.confirmar(
      `Deseja realmente excluir o setor "${setor.nomeSetor}"?`,
      'Excluir setor',
    );
    if (!confirmado) return;

    this.api.excluir(setor.idSetor).subscribe({
      next: () => {
        this.dialogo.sucesso('Setor excluído.', 'Setor excluído');
        if (this.idEditando === setor.idSetor) this.limpar();
        this.carregar();
      },
      error: (e) => this.dialogo.erro(mensagemErro(e), 'Erro ao excluir setor'),
    });
  }

  limpar(): void {
    this.idEditando = null;
    this.nomeSetor = '';
  }
}
