import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { mensagemErro } from '../../core/app-error';
import { DialogoService } from '../../core/dialogo.service';
import { EnderecoModel } from '../../models/endereco.model';
import { FornecedorModel, FornecedorPayload } from '../../models/fornecedor.model';
import { FornecedoresService } from '../../services/fornecedores.service';
import { ConsultaCadastroService } from '../../services/consulta-cadastro.service';

@Component({
  selector: 'app-fornecedor',
  standalone: true,
  imports: [FormsModule],
  styleUrl: './fornecedor.css',
  templateUrl: './fornecedor.html',
})
export class Fornecedor implements OnInit, OnDestroy {
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
  consultando: 'cnpj' | 'cep' | null = null;
  consultaMensagem = '';
  consultaErro = false;
  private consulta: AbortController | null = null;

  constructor(
    private readonly fornecedoresApi: FornecedoresService,
    private readonly dialogo: DialogoService,
    private readonly consultaApi: ConsultaCadastroService,
    private readonly cdr: ChangeDetectorRef,
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

  get cnpjNumerico(): string { return this.cnpj.replace(/\D/g, ''); }
  get cepNumerico(): string { return this.endereco.cep.replace(/\D/g, ''); }

  alterarCnpj(valor: string): void {
    if (valor !== this.cnpj) this.cancelarConsulta();
    this.cnpj = valor;
  }

  alterarCep(valor: string): void {
    if (valor !== this.endereco.cep) this.cancelarConsulta();
    this.endereco.cep = valor;
  }

  private cancelarConsulta(): void {
    this.consulta?.abort();
    this.consulta = null;
    this.consultando = null;
    this.consultaMensagem = '';
    this.consultaErro = false;
  }

  ngOnDestroy(): void { this.cancelarConsulta(); }

  async consultarCadastro(tipo: 'cnpj' | 'cep'): Promise<void> {
    if (!this.modalFornecedorAberto || this.consultando || this.salvandoFornecedor) return;
    const codigo = tipo === 'cnpj' ? this.cnpjNumerico : this.cepNumerico;
    if (codigo.length !== (tipo === 'cnpj' ? 14 : 8) ||
        (tipo === 'cnpj' && /[a-z]/i.test(this.cnpj))) {
      this.consultaErro = true;
      this.consultaMensagem = tipo === 'cnpj' ? 'Informe os 14 números do CNPJ.' : 'Informe os oito números do CEP.';
      return;
    }
    const controller = new AbortController();
    this.consulta = controller;
    this.consultando = tipo;
    this.consultaErro = false;
    this.consultaMensagem = '';
    let expirou = false;
    const prazo = setTimeout(() => { expirou = true; controller.abort(); }, 12000);
    // Não modifica campos que o usuário tenha editado enquanto aguarda a consulta.
    const antes = { nomeFo: this.nomeFo, razaoSocial: this.razaoSocial, contato: this.contato, endereco: { ...this.endereco } };
    const texto = (v: unknown): string => typeof v === 'string' ? v.trim() : '';
    const avisos: string[] = [];
    const limitar = (v: unknown, tamanho: number): string => {
      const t = texto(v);
      if (t.length > tamanho) avisos.push('Há campos abreviados para respeitar o tamanho do cadastro.');
      return t.slice(0, tamanho);
    };
    try {
      if (tipo === 'cnpj') {
        const d = await this.consultaApi.consultarCnpj(codigo, controller.signal);
        if (this.consulta !== controller || !this.modalFornecedorAberto || this.cnpjNumerico !== codigo) return;
        if (!texto(d.razao_social)) throw new Error('A consulta não retornou dados cadastrais válidos.');
        if (this.nomeFo === antes.nomeFo) this.nomeFo = limitar(d.nome_fantasia || d.razao_social, 45);
        if (this.razaoSocial === antes.razaoSocial) this.razaoSocial = limitar(d.razao_social, 100);
        if (this.contato === antes.contato) this.contato = limitar(d.ddd_telefone_1 || d.email || antes.contato, 60);
        this.cnpj = this.formatarCnpj(codigo);
        const tipoRua = texto(d.descricao_tipo_de_logradouro);
        const rua = texto(d.logradouro);
        const logradouro = tipoRua && rua && !rua.toLocaleLowerCase('pt-BR').startsWith(tipoRua.toLocaleLowerCase('pt-BR') + ' ')
          ? tipoRua + ' ' + rua : rua;
        const cep = texto(d.cep).replace(/\D/g, '');
        this.aplicarEndereco({
          cep: cep.length === 8 ? cep : '',
          logradouro: limitar(logradouro, 45), numero: limitar(d.numero, 5),
          complemento: limitar(d.complemento, 60), bairro: limitar(d.bairro, 45),
          cidade: limitar(d.municipio, 45), estado: limitar(d.uf, 45), pais: 'Brasil'
        }, antes.endereco);
      } else {
        const d = await this.consultaApi.consultarCep(codigo, controller.signal);
        if (this.consulta !== controller || !this.modalFornecedorAberto || this.cepNumerico !== codigo) return;
        if (!texto(d.localidade) || !texto(d.uf)) throw new Error('A consulta não retornou um endereço válido.');
        this.aplicarEndereco({
          cep: codigo, logradouro: limitar(d.logradouro, 45), bairro: limitar(d.bairro, 45),
          cidade: limitar(d.localidade, 45), estado: limitar(d.uf, 45), pais: 'Brasil'
        }, antes.endereco);
      }
      this.consultaMensagem = (tipo === 'cnpj' ? 'Dados da empresa consultados.' : 'Endereço consultado.') +
        ' Revise os campos antes de salvar.' + (avisos.length ? ' ' + avisos[0] : '');
    } catch (erro) {
      if (this.consulta !== controller) return;
      this.consultaErro = true;
      this.consultaMensagem = expirou ? 'A consulta demorou demais. Tente novamente ou preencha manualmente.' :
        erro instanceof Error && !(erro instanceof TypeError) ? erro.message :
        'Serviço de consulta indisponível. Você pode preencher os dados manualmente.';
    } finally {
      clearTimeout(prazo);
      if (this.consulta === controller) {
        this.consulta = null;
        this.consultando = null;
        this.cdr.markForCheck();
      }
    }
  }

  private aplicarEndereco(dados: Partial<EnderecoModel>, antes: EnderecoModel): void {
    const campos = ['cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'estado', 'pais'] as const;
    for (const campo of campos) {
      const valor = dados[campo];
      if (typeof valor === 'string' && this.endereco[campo] === antes[campo]) this.endereco[campo] = valor;
    }
  }

  confirmarConsulta(evento: Event, tipo: 'cnpj' | 'cep'): void {
    evento.preventDefault();
    evento.stopPropagation();
    void this.consultarCadastro(tipo);
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
    this.cancelarConsulta();
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
    if (this.salvandoFornecedor || this.consultando) return;
    const cnpjNumerico = this.cnpjNumerico;
    if (cnpjNumerico.length !== 14 || /[a-z]/i.test(this.cnpj)) {
      this.dialogo.erro('O CNPJ deve conter 14 números.', 'CNPJ inválido');
      return;
    }

    const payload: FornecedorPayload = {
      nomeFo: this.nomeFo.trim(),
      razaoSocial: this.razaoSocial.trim(),
      cnpj: cnpjNumerico,
      contato: this.contato.trim(),
      statusFo: this.statusFo,
      endereco: { ...this.endereco, cep: this.cepNumerico },
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
    this.cancelarConsulta();
    this.idFornecedorEditando = null;
    this.nomeFo = '';
    this.razaoSocial = '';
    this.cnpj = '';
    this.contato = '';
    this.statusFo = 'A';
    this.endereco = this.enderecoVazio();
  }
}
