import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { mensagemErro } from '../../core/app-error';
import { DialogoService } from '../../core/dialogo.service';
import { EnderecoModel } from '../../models/endereco.model';
import { FornecedorModel, FornecedorPayload } from '../../models/fornecedor.model';
import { FornecedoresService } from '../../services/fornecedores.service';

@Component({
  selector: 'app-fornecedor',
  standalone: true,
  imports: [FormsModule],
  styleUrl: './fornecedor.css',
  templateUrl: './fornecedor.html',
})
export class Fornecedor implements OnInit {
  fornecedores: FornecedorModel[] = [];
  pesquisaFornecedores = '';
  modalFornecedorAberto = false;
  idFornecedorEditando: number | null = null;
  nomeFo = '';
  razaoSocial = '';
  cnpj = '';
  contato = '';
  statusFo = 'A';
  endereco: EnderecoModel = this.enderecoVazio();
  carregandoFornecedores = false;
  salvandoFornecedor = false;

  constructor(
    private readonly fornecedoresApi: FornecedoresService,
    private readonly dialogo: DialogoService,
  ) {}

  ngOnInit(): void {
    this.carregarFornecedores();
  }

  @HostListener('document:keydown.escape')
  fecharComEscape(): void {
    if (this.modalFornecedorAberto && !this.salvandoFornecedor) this.fecharModalFornecedor();
  }

  get fornecedoresFiltrados(): FornecedorModel[] {
    const termo = this.normalizar(this.pesquisaFornecedores);
    if (!termo) return this.fornecedores;
    const termoNumerico = termo.replace(/\D/g, '');

    return this.fornecedores.filter((fornecedor) => {
      const dadosTexto = [fornecedor.nomeFo, fornecedor.razaoSocial || ''].some((valor) =>
        this.normalizar(valor).includes(termo),
      );
      const cnpj = (fornecedor.cnpj || '').replace(/\D/g, '');
      return dadosTexto || (!!termoNumerico && cnpj.includes(termoNumerico));
    });
  }

  private normalizar(valor: string): string {
    return valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
      .trim();
  }

  formatarCnpj(valor: string): string {
    const numeros = (valor || '').replace(/\D/g, '');
    if (numeros.length !== 14) return valor;
    return numeros.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }

  carregarFornecedores(): void {
    this.carregandoFornecedores = true;
    this.fornecedoresApi.listar().subscribe({
      next: (dados) => {
        this.fornecedores = dados;
        this.carregandoFornecedores = false;
      },
      error: (e) => {
        this.dialogo.erro(mensagemErro(e), 'Erro ao carregar fornecedores');
        this.carregandoFornecedores = false;
      },
    });
  }

  private enderecoVazio(): EnderecoModel {
    return {
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      cidade: '',
      bairro: '',
      estado: '',
      pais: 'Brasil',
    };
  }

  abrirModalNovoFornecedor(): void {
    this.limparFornecedor();
    this.modalFornecedorAberto = true;
  }

  abrirModalEdicaoFornecedor(fornecedor: FornecedorModel): void {
    this.idFornecedorEditando = fornecedor.idFornecedor;
    this.nomeFo = fornecedor.nomeFo;
    this.razaoSocial = fornecedor.razaoSocial || '';
    this.cnpj = fornecedor.cnpj;
    this.contato = fornecedor.contato;
    this.statusFo = fornecedor.statusFo;
    this.endereco = fornecedor.endereco ? { ...fornecedor.endereco } : this.enderecoVazio();
    this.modalFornecedorAberto = true;
  }

  fecharModalFornecedor(): void {
    if (this.salvandoFornecedor) return;
    this.modalFornecedorAberto = false;
    this.limparFornecedor();
  }

  salvarFornecedor(): void {
    if (this.salvandoFornecedor) return;
    const cnpjNumerico = this.cnpj.replace(/\D/g, '');
    if (cnpjNumerico.length !== 14) {
      this.dialogo.erro('O CNPJ deve conter 14 números.', 'CNPJ inválido');
      return;
    }

    const payload: FornecedorPayload = {
      nomeFo: this.nomeFo.trim(),
      razaoSocial: this.razaoSocial.trim(),
      cnpj: cnpjNumerico,
      contato: this.contato.trim(),
      statusFo: this.statusFo,
      endereco: { ...this.endereco },
    };

    const estavaEditando = this.idFornecedorEditando !== null;
    const chamada = estavaEditando
      ? this.fornecedoresApi.atualizar(this.idFornecedorEditando!, payload)
      : this.fornecedoresApi.criar(payload);
    this.salvandoFornecedor = true;

    chamada.subscribe({
      next: () => {
        this.salvandoFornecedor = false;
        this.modalFornecedorAberto = false;
        this.limparFornecedor();
        this.dialogo.sucesso(
          estavaEditando
            ? 'Fornecedor atualizado com sucesso.'
            : 'Fornecedor cadastrado com sucesso.',
          estavaEditando ? 'Fornecedor atualizado' : 'Fornecedor cadastrado',
        );
        this.carregarFornecedores();
      },
      error: (e) => {
        this.dialogo.erro(mensagemErro(e), 'Erro ao salvar fornecedor');
        this.salvandoFornecedor = false;
      },
    });
  }

  async excluirFornecedor(fornecedor: FornecedorModel): Promise<void> {
    const confirmado = await this.dialogo.confirmar(
      `Deseja realmente excluir o fornecedor "${fornecedor.nomeFo}"?`,
      'Excluir fornecedor',
    );
    if (!confirmado) return;

    this.fornecedoresApi.excluir(fornecedor.idFornecedor).subscribe({
      next: () => {
        this.dialogo.sucesso('Fornecedor excluído com sucesso.', 'Fornecedor excluído');
        if (this.idFornecedorEditando === fornecedor.idFornecedor) this.fecharModalFornecedor();
        this.carregarFornecedores();
      },
      error: (e) => this.dialogo.erro(mensagemErro(e), 'Erro ao excluir fornecedor'),
    });
  }

  limparFornecedor(): void {
    this.idFornecedorEditando = null;
    this.nomeFo = '';
    this.razaoSocial = '';
    this.cnpj = '';
    this.contato = '';
    this.statusFo = 'A';
    this.endereco = this.enderecoVazio();
  }
}
