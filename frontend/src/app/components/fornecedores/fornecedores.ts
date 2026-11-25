import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { mensagemErro } from '../../core/app-error';
import { EnderecoModel } from '../../models/endereco.model';
import { FornecedorModel, FornecedorPayload } from '../../models/fornecedor.model';
import { FornecedoresService } from '../../services/fornecedores.service';

@Component({
  selector: 'app-fornecedores',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './fornecedores.html',
  styleUrl: './fornecedores.css',
})
export class Fornecedores implements OnInit {
  fornecedores: FornecedorModel[] = [];
  idEditando: number | null = null;
  nomeFo = '';
  cnpj = '';
  contato = '';
  statusFo = 'A';
  endereco: EnderecoModel = this.enderecoVazio();
  carregando = false;
  salvando = false;
  mensagem = '';
  erro = '';

  constructor(private readonly api: FornecedoresService) {}

  ngOnInit(): void { this.carregar(); }

  private enderecoVazio(): EnderecoModel {
    return {
      cep: '', logradouro: '', numero: '', complemento: '',
      cidade: '', bairro: '', estado: '', pais: 'Brasil',
    };
  }

  carregar(): void {
    this.carregando = true;
    this.api.listar().subscribe({
      next: (dados) => { this.fornecedores = dados; this.carregando = false; },
      error: (e) => { this.erro = mensagemErro(e); this.carregando = false; },
    });
  }

  salvar(): void {
    if (this.salvando) return;
    const somenteNumeros = this.cnpj.replace(/\D/g, '');
    if (somenteNumeros.length !== 14) {
      this.erro = 'O CNPJ deve conter 14 números.';
      return;
    }

    const payload: FornecedorPayload = {
      nomeFo: this.nomeFo.trim(),
      cnpj: somenteNumeros,
      contato: this.contato.trim(),
      statusFo: this.statusFo,
      endereco: { ...this.endereco },
    };

    this.salvando = true;
    this.erro = '';
    const chamada = this.idEditando === null
      ? this.api.criar(payload)
      : this.api.atualizar(this.idEditando, payload);

    chamada.subscribe({
      next: () => {
        this.mensagem = this.idEditando === null ? 'Fornecedor cadastrado.' : 'Fornecedor atualizado.';
        this.salvando = false;
        this.limpar(false);
        this.carregar();
      },
      error: (e) => { this.erro = mensagemErro(e); this.salvando = false; },
    });
  }

  editar(fornecedor: FornecedorModel): void {
    this.idEditando = fornecedor.idFornecedor;
    this.nomeFo = fornecedor.nomeFo;
    this.cnpj = fornecedor.cnpj;
    this.contato = fornecedor.contato;
    this.statusFo = fornecedor.statusFo;
    this.endereco = fornecedor.endereco ? { ...fornecedor.endereco } : this.enderecoVazio();
    this.mensagem = '';
    this.erro = '';
  }

  excluir(fornecedor: FornecedorModel): void {
    if (!window.confirm(`Excluir o fornecedor "${fornecedor.nomeFo}"?`)) return;
    this.api.excluir(fornecedor.idFornecedor).subscribe({
      next: () => {
        this.mensagem = 'Fornecedor excluído.';
        if (this.idEditando === fornecedor.idFornecedor) this.limpar(false);
        this.carregar();
      },
      error: (e) => this.erro = mensagemErro(e),
    });
  }

  limpar(limparMensagens = true): void {
    this.idEditando = null;
    this.nomeFo = '';
    this.cnpj = '';
    this.contato = '';
    this.statusFo = 'A';
    this.endereco = this.enderecoVazio();
    if (limparMensagens) { this.mensagem = ''; this.erro = ''; }
  }
}
