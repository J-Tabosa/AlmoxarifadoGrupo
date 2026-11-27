import { Component, HostListener, OnInit, inject } from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { mensagemErro } from '../../core/app-error';
import { DialogoService } from '../../core/dialogo.service';
import { FuncionarioModel } from '../../models/funcionario.model';
import { InventarioDivergenciaPayload, InventarioModel, InventarioPosicaoSnapshot } from '../../models/inventario.model';
import { ItemModel } from '../../models/item.model';
import { FuncionariosService } from '../../services/funcionarios.service';
import { InventariosService } from '../../services/inventarios.service';
import { ItensService } from '../../services/itens.service';
import { Grupo, PlantaService, Posicao } from '../../services/planta';

interface PrateleiraOpcao {
  chave: string;
  grupoKey: string;
  grupoNome: string;
  idEstante: number;
  nomeEstante: string;
  nivel: number;
  itens: number;
  unidades: number;
}

interface DivergenciaForm {
  chavePrateleira: string;
  posicao: number | null;
  idItem: number | null;
  descricaoItem: string;
  quantidadeContada: number | null;
  observacao: string;
  justificativa: string;
}

@Component({
  selector: 'app-conferencia',
  standalone: true,
  imports: [FormsModule, DatePipe, NgTemplateOutlet],
  styleUrl: './conferencia.css',
  templateUrl: './conferencia.html',
})
export class Conferencia implements OnInit {
  readonly planta = inject(PlantaService);
  private readonly inventariosApi = inject(InventariosService);
  private readonly funcionariosApi = inject(FuncionariosService);
  private readonly itensApi = inject(ItensService);
  private readonly dialogo = inject(DialogoService);

  inventarios: InventarioModel[] = [];
  funcionarios: FuncionarioModel[] = [];
  itens: ItemModel[] = [];

  modalInicioAberto = false;
  modalFinalizacaoAberto = false;
  modalCancelamentoAberto = false;
  inventarioDetalhe: InventarioModel | null = null;
  inventarioFinalizando: InventarioModel | null = null;
  inventarioCancelando: InventarioModel | null = null;
  motivoCancelamento = '';
  salvando = false;
  erro = '';

  idResponsavel: number | null = null;
  idsContadores: number[] = [];
  prateleirasSelecionadas: string[] = [];
  divergenciasForm: DivergenciaForm[] = [];
  private ocorrenciasSalvas = '[]';
  rascunho: DivergenciaForm | null = null;
  indiceEdicao: number | null = null;
  modalMaterialAberto = false;
  pesquisaMaterial = '';
  mapaSelecao: 'inicio' | 'divergencia' | null = null;
  mapaGrupoKey = '';
  mapaEstanteId: number | null = null;
  mapaLinha: number | null = null;

  ngOnInit(): void {
    this.planta.refreshStock();
    this.carregar();
  }

  @HostListener('document:keydown.escape')
  fecharComEscape(): void {
    if (this.dialogo.estado()) return;
    if (this.modalMaterialAberto) { this.modalMaterialAberto = false; return; }
    if (this.mapaSelecao) { this.fecharMapaSelecao(); return; }
    if (this.rascunho) { this.cancelarEdicaoDivergencia(); return; }
    if (this.modalCancelamentoAberto && !this.salvando) { this.fecharCancelamento(); return; }
    if (this.inventarioDetalhe) {
      this.inventarioDetalhe = null;
      return;
    }
    if (this.modalFinalizacaoAberto && !this.salvando) {
      this.fecharFinalizacao();
      return;
    }
    if (this.modalInicioAberto && !this.salvando) this.fecharInicio();
  }

  carregar(): void {
    this.inventariosApi.listar().subscribe({
      next: dados => this.inventarios = dados,
      error: e => this.dialogo.erro(mensagemErro(e), 'Erro ao carregar inventários'),
    });
    this.funcionariosApi.listar().subscribe({
      next: dados => this.funcionarios = dados.filter(f => f.statusFu === 'A'),
      error: e => this.dialogo.erro(mensagemErro(e), 'Erro ao carregar funcionários'),
    });
    this.itensApi.listar().subscribe({
      next: dados => this.itens = dados,
      error: e => this.dialogo.erro(mensagemErro(e), 'Erro ao carregar materiais'),
    });
  }

  get inventarioAtivo(): InventarioModel | undefined {
    return this.inventarios.find(i => i.status === 'em_andamento');
  }

  get opcoesPrateleiras(): PrateleiraOpcao[] {
    const resultado: PrateleiraOpcao[] = [];
    for (const grupo of this.planta.groups) {
      for (const estante of grupo.slots) {
        if (estante.blocked) continue;
        const nomeEstante = this.nomeEstante(estante);
        for (let nivel = 1; nivel <= this.planta.shelfCount(estante); nivel++) {
          const conteudos = estante.contents.filter(p => p.level === nivel && p.qty > 0);
          resultado.push({
            chave: this.inventariosApi.chavePrateleira(grupo.key, estante.idlocalizacao, nivel),
            grupoKey: grupo.key,
            grupoNome: grupo.name,
            idEstante: estante.idlocalizacao,
            nomeEstante,
            nivel,
            itens: new Set(conteudos.map(p => p.itemCode)).size,
            unidades: conteudos.reduce((total, p) => total + p.qty, 0),
          });
        }
      }
    }
    return resultado;
  }

  prateleirasDoGrupo(grupo: Grupo): PrateleiraOpcao[] {
    return this.opcoesPrateleiras.filter(p => p.grupoKey === grupo.key);
  }

  get gruposMapa(): Grupo[] {
    return this.planta.groups.filter(g => this.mapaSelecao !== 'divergencia' ||
      this.inventarioFinalizando?.prateleiras.some(p => p.grupoKey === g.key));
  }

  get grupoMapa(): Grupo | undefined {
    return this.gruposMapa.find(g => g.key === this.mapaGrupoKey);
  }

  abrirMapaSelecao(modo: 'inicio' | 'divergencia', indice: number | null = null): void {
    if (this.salvando || (modo === 'divergencia' && !this.inventarioFinalizando)) return;
    this.mapaSelecao = modo;
    this.mapaLinha = indice;
    const anterior = indice === null ? undefined : this.inventarioFinalizando?.prateleiras
      .find(p => p.chave === this.divergenciasForm[indice]?.chavePrateleira);
    this.mapaGrupoKey = anterior?.grupoKey ??
      (this.gruposMapa.some(g => g.key === this.planta.activeGroup.key) ? this.planta.activeGroup.key : this.gruposMapa[0]?.key ?? '');
    this.mapaEstanteId = anterior?.idEstante ?? null;
  }

  fecharMapaSelecao(): void {
    this.mapaSelecao = null;
    this.mapaEstanteId = null;
    this.mapaLinha = null;
  }

  trocarGrupoMapa(key: string): void {
    this.mapaGrupoKey = key;
    this.mapaEstanteId = null;
  }

  niveisMapa(g: Grupo, s: Posicao): { chave: string; nivel: number }[] {
    if (s.blocked) return [];
    if (this.mapaSelecao === 'divergencia') return (this.inventarioFinalizando?.prateleiras ?? [])
      .filter(p => p.grupoKey === g.key && p.idEstante === s.idlocalizacao && this.prateleiraDisponivel(p.chave))
      .map(p => ({ chave: p.chave, nivel: p.nivel })).sort((a, b) => a.nivel - b.nivel);
    return Array.from({ length: this.planta.shelfCount(s) }, (_, i) => ({
      chave: this.inventariosApi.chavePrateleira(g.key, s.idlocalizacao, i + 1), nivel: i + 1
    }));
  }

  get estanteMapa(): Posicao | undefined {
    return this.grupoMapa?.slots.find(s => s.idlocalizacao === this.mapaEstanteId && !s.blocked);
  }

  get niveisEstanteMapa() {
    const g = this.grupoMapa, s = this.estanteMapa;
    return g && s ? this.niveisMapa(g, s) : [];
  }

  quantidadeMarcada(g: Grupo, s: Posicao): number {
    return this.niveisMapa(g, s).filter(p => this.prateleirasSelecionadas.includes(p.chave)).length;
  }

  clicarEstanteMapa(g: Grupo, s: Posicao): void {
    const niveis = this.niveisMapa(g, s);
    if (!niveis.length) return;
    this.mapaEstanteId = s.idlocalizacao;
    if (this.mapaSelecao === 'inicio') {
      const marcar = !niveis.every(p => this.prateleirasSelecionadas.includes(p.chave));
      for (const p of niveis) this.alternarPrateleira(p.chave, marcar);
    } else if (niveis.length === 1) this.escolherLocalDivergencia(niveis[0].chave);
  }

  escolherLocalDivergencia(chave: string): void {
    if (!this.prateleiraDisponivel(chave)) return;
    const p = this.inventarioFinalizando?.prateleiras.find(p => p.chave === chave);
    if (!p) return;
    this.indiceEdicao = this.mapaLinha;
    this.rascunho = { chavePrateleira: chave, posicao: null, idItem: null, descricaoItem: '',
      quantidadeContada: null, observacao: '', justificativa: '' };
    this.fecharMapaSelecao();
    this.abrirSeletorMaterial();
  }

  private posicaoUsada(chave: string, posicao: number): boolean {
    return this.divergenciasForm.some((linha, i) => i !== this.indiceEdicao &&
      linha.chavePrateleira === chave && linha.posicao === posicao);
  }

  prateleiraDisponivel(chave: string): boolean {
    const p = this.inventarioFinalizando?.prateleiras.find(p => p.chave === chave);
    return !!p && p.posicoesSistema !== undefined &&
      (!p.posicoesSistema.length || p.posicoesSistema.some(x => !this.posicaoUsada(chave, x.posicao)));
  }

  get prateleiraRascunho() {
    return this.inventarioFinalizando?.prateleiras.find(p => p.chave === this.rascunho?.chavePrateleira);
  }

  get materiaisDisponiveis(): InventarioPosicaoSnapshot[] {
    const p = this.prateleiraRascunho;
    return (p?.posicoesSistema ?? []).filter(x => !this.posicaoUsada(p!.chave, x.posicao));
  }

  get materiaisFiltrados(): InventarioPosicaoSnapshot[] {
    const q = this.planta.normalize(this.pesquisaMaterial);
    return this.materiaisDisponiveis.filter(x => this.planta.normalize([x.idItem, x.descricaoItem, x.posicao, x.unidade].join(' ')).includes(q));
  }

  abrirSeletorMaterial(): void {
    if (!this.rascunho) return;
    this.pesquisaMaterial = '';
    this.modalMaterialAberto = true;
  }

  escolherMaterial(item: InventarioPosicaoSnapshot | null): void {
    if (!this.rascunho) return;
    if (item && !this.materiaisDisponiveis.some(x => x.posicao === item.posicao && x.idItem === item.idItem)) return;
    if (!item && this.prateleiraRascunho?.posicoesSistema?.length !== 0) return;
    this.rascunho.idItem = item?.idItem ?? null;
    this.rascunho.descricaoItem = item?.descricaoItem ?? 'Nenhum material';
    this.rascunho.posicao = item?.posicao ?? null;
    this.rascunho.quantidadeContada = null;
    this.modalMaterialAberto = false;
  }

  editarDivergencia(indice: number): void {
    if (this.rascunho || this.mapaSelecao || !this.divergenciasForm[indice]) return;
    this.indiceEdicao = indice;
    this.rascunho = { ...this.divergenciasForm[indice] };
  }

  cancelarEdicaoDivergencia(): void {
    this.fecharMapaSelecao();
    this.rascunho = null;
    this.indiceEdicao = null;
    this.modalMaterialAberto = false;
    this.erro = '';
  }

  get posicaoRascunhoOcupada(): boolean {
    const linha = this.rascunho;
    return !!linha && linha.posicao !== null && this.posicaoUsada(linha.chavePrateleira, linha.posicao);
  }

  get referenciaIncompleta(): boolean {
    return !!this.inventarioFinalizando?.prateleiras.some(p => p.posicoesSistema === undefined);
  }

  get podeSalvarDivergencia(): boolean {
    return !!this.rascunho && this.linhaValida(this.rascunho) && !this.modalMaterialAberto;
  }

  salvarDivergencia(): void {
    if (!this.rascunho || !this.podeSalvarDivergencia) return;
    const linha = { ...this.rascunho };
    if (this.indiceEdicao === null) this.divergenciasForm = [...this.divergenciasForm, linha];
    else this.divergenciasForm = this.divergenciasForm.map((x, i) => i === this.indiceEdicao ? linha : x);
    this.cancelarEdicaoDivergencia();
  }

  // Mesmo que uma planta antiga não exista mais, a referência congelada continua acessível.
  get locaisSemMapa() {
    if (this.mapaSelecao !== 'divergencia') return [];
    return (this.inventarioFinalizando?.prateleiras ?? []).filter(p => {
      const g = this.planta.groups.find(g => g.key === p.grupoKey);
      return this.prateleiraDisponivel(p.chave) && !g?.slots.some(s => !s.blocked && s.idlocalizacao === p.idEstante);
    });
  }

  rotuloDivergencia(chave: string): string {
    const p = this.inventarioFinalizando?.prateleiras.find(p => p.chave === chave);
    return p ? this.rotuloPrateleiraRegistro(p) : 'Selecionar localização';
  }

  nomeEstante(estante: Posicao): string {
    return estante.descricao?.trim() ||
      String(estante.r).padStart(2, '0') + '-' + String(estante.c).padStart(2, '0');
  }

  rotuloPrateleira(prateleira: PrateleiraOpcao): string {
    return prateleira.grupoNome + ' / Estante ' + prateleira.nomeEstante + ' / Prateleira ' + prateleira.nivel;
  }

  rotuloPrateleiraRegistro(prateleira: InventarioModel['prateleiras'][number]): string {
    return prateleira.grupoNome + ' / Estante ' + prateleira.nomeEstante + ' / Prateleira ' + prateleira.nivel;
  }

  estoqueCompleto(inventario: InventarioModel): boolean {
    if (inventario.estoqueCompleto !== undefined) return inventario.estoqueCompleto;
    if (inventario.status !== 'em_andamento') return false;
    const chaves = new Set(inventario.prateleiras.map(p => p.chave));
    const atuais = this.opcoesPrateleiras;
    return atuais.length > 0 && atuais.length === chaves.size && atuais.every(p => chaves.has(p.chave));
  }

  nomesContadores(inventario: InventarioModel): string {
    return inventario.contadores.map(contador => contador.nomeFu).join(', ');
  }

  abrirModalInicio(): void {
    if (this.inventarioAtivo) {
      this.dialogo.erro('Finalize ou cancele o inventário #' + this.inventarioAtivo.idInventario + ' antes de iniciar outro.');
      return;
    }
    this.fecharMapaSelecao();
    this.idResponsavel = null;
    this.idsContadores = [];
    this.prateleirasSelecionadas = [];
    this.erro = '';
    this.modalInicioAberto = true;
  }

  fecharInicio(): void {
    if (this.salvando) return;
    this.modalInicioAberto = false;
    this.fecharMapaSelecao();
    this.erro = '';
  }

  alternarPrateleira(chave: string, marcada: boolean): void {
    if (marcada && !this.prateleirasSelecionadas.includes(chave)) {
      this.prateleirasSelecionadas = [...this.prateleirasSelecionadas, chave];
    } else if (!marcada) {
      this.prateleirasSelecionadas = this.prateleirasSelecionadas.filter(x => x !== chave);
    }
  }

  selecionarPrateleirasDoGrupo(grupo: Grupo, marcar: boolean): void {
    const chaves = this.prateleirasDoGrupo(grupo).map(p => p.chave);
    this.prateleirasSelecionadas = marcar
      ? [...new Set([...this.prateleirasSelecionadas, ...chaves])]
      : this.prateleirasSelecionadas.filter(chave => !chaves.includes(chave));
  }

  alterarResponsavel(id: number | null): void {
    this.idResponsavel = id;
    if (id !== null) this.idsContadores = this.idsContadores.filter(contador => contador !== id);
  }

  alternarContador(idFuncionario: number, marcado: boolean): void {
    if (idFuncionario === this.idResponsavel) return;
    if (marcado && !this.idsContadores.includes(idFuncionario)) {
      this.idsContadores = [...this.idsContadores, idFuncionario];
    } else if (!marcado) {
      this.idsContadores = this.idsContadores.filter(id => id !== idFuncionario);
    }
  }

  get podeIniciar(): boolean {
    const validas = new Set(this.opcoesPrateleiras.map(p => p.chave));
    return !this.salvando && !this.inventarioAtivo &&
      this.idResponsavel !== null &&
      this.funcionarios.some(f => f.idFuncionario === this.idResponsavel) &&
      this.idsContadores.length > 0 &&
      this.idsContadores.every(id => id !== this.idResponsavel && this.funcionarios.some(f => f.idFuncionario === id)) &&
      this.prateleirasSelecionadas.length > 0 &&
      this.prateleirasSelecionadas.every(chave => validas.has(chave));
  }

  iniciarInventario(): void {
    if (!this.podeIniciar) return;
    const selecionadas = this.opcoesPrateleiras
      .filter(p => this.prateleirasSelecionadas.includes(p.chave))
      .map(p => ({ grupoKey: p.grupoKey, idEstante: p.idEstante, nivel: p.nivel }));
    this.salvando = true;
    this.erro = '';
    this.inventariosApi.iniciar({
      idResponsavel: this.idResponsavel!,
      idsContadores: [...this.idsContadores],
      prateleiras: selecionadas,
    }).subscribe({
      next: inventario => {
        this.salvando = false;
        this.modalInicioAberto = false;
        this.fecharMapaSelecao();
        this.dialogo.sucesso(
          'Inventário #' + inventario.idInventario + ' iniciado. Entradas, saídas e alterações de estoque estão bloqueadas até o encerramento.',
          'Inventário iniciado',
        );
        this.carregar();
      },
      error: e => {
        this.salvando = false;
        this.dialogo.erro(mensagemErro(e), 'Não foi possível iniciar o inventário');
      },
    });
  }

  abrirModalCancelamento(inventario: InventarioModel): void {
    if (inventario.status !== 'em_andamento' || this.salvando) return;
    this.fecharMapaSelecao();
    this.inventarioCancelando = inventario;
    this.motivoCancelamento = '';
    this.erro = '';
    this.modalCancelamentoAberto = true;
  }

  fecharCancelamento(): void {
    if (this.salvando) return;
    this.modalCancelamentoAberto = false;
    this.inventarioCancelando = null;
    this.motivoCancelamento = '';
    this.erro = '';
  }

  get podeConfirmarCancelamento(): boolean {
    const motivo = this.motivoCancelamento.trim();
    return !!this.inventarioCancelando &&
      this.inventarioCancelando.status === 'em_andamento' &&
      !this.salvando &&
      motivo.length >= 5 &&
      motivo.length <= 600;
  }

  confirmarCancelamento(): void {
    if (!this.podeConfirmarCancelamento || !this.inventarioCancelando) {
      this.erro = 'Informe a justificativa do cancelamento (pelo menos 5 caracteres).';
      return;
    }

    const id = this.inventarioCancelando.idInventario;
    const justificativa = this.motivoCancelamento.trim();
    this.salvando = true;
    this.erro = '';
    this.inventariosApi.cancelar(id, justificativa).subscribe({
      next: inventario => {
        this.salvando = false;
        this.modalCancelamentoAberto = false;
        this.inventarioCancelando = null;
        this.motivoCancelamento = '';
        this.dialogo.sucesso(
          'Inventário #' + inventario.idInventario + ' cancelado. Justificativa registrada e movimentações de estoque liberadas.',
          'Inventário cancelado',
        );
        this.carregar();
      },
      error: e => {
        this.salvando = false;
        this.dialogo.erro(mensagemErro(e), 'Não foi possível cancelar o inventário');
      },
    });
  }

  abrirFinalizacao(inventario: InventarioModel): void {
    if (inventario.status !== 'em_andamento') return;
    this.fecharMapaSelecao();
    this.inventarioFinalizando = inventario;
    this.cancelarEdicaoDivergencia();
    this.divergenciasForm = inventario.divergencias.map(d => ({
      chavePrateleira: d.chavePrateleira,
      posicao: d.posicao ?? null,
      idItem: d.idItem,
      descricaoItem: d.descricaoItem,
      quantidadeContada: d.quantidadeContada,
      observacao: d.observacao,
      justificativa: d.justificativa
    }));
    this.ocorrenciasSalvas = JSON.stringify(this.divergenciasForm);
    this.erro = '';
    this.modalFinalizacaoAberto = true;
  }

  get ocorrenciasAlteradas(): boolean {
    return JSON.stringify(this.divergenciasForm) !== this.ocorrenciasSalvas;
  }

  async fecharFinalizacao(): Promise<void> {
    if (this.salvando || this.dialogo.estado()) return;
    if ((this.ocorrenciasAlteradas || this.rascunho) &&
        !await this.dialogo.confirmar('Há alterações não salvas. Deseja descartá-las e fechar?', 'Fechar ocorrências', 'Descartar')) return;
    this.modalFinalizacaoAberto = false;
    this.cancelarEdicaoDivergencia();
    this.inventarioFinalizando = null;
    this.divergenciasForm = [];
    this.ocorrenciasSalvas = '[]';
    this.erro = '';
  }

  adicionarDivergencia(): void {
    if (this.rascunho || this.mapaSelecao) return;
    this.indiceEdicao = null;
    this.abrirMapaSelecao('divergencia');
  }

  async removerDivergencia(indice: number): Promise<void> {
    if (this.rascunho || this.mapaSelecao || !this.divergenciasForm[indice]) return;
    const linha = this.divergenciasForm[indice];
    if (await this.dialogo.confirmar('Excluir esta divergência de ' + linha.descricaoItem + '? A posição ficará disponível novamente.')) {
      this.divergenciasForm = this.divergenciasForm.filter(x => x !== linha);
    }
  }

  saldoSistemaDivergencia(linha: DivergenciaForm): number {
    return this.inventarioFinalizando?.prateleiras.find(p => p.chave === linha.chavePrateleira)
      ?.posicoesSistema?.find(p => p.posicao === linha.posicao && p.idItem === linha.idItem)?.saldo ?? 0;
  }

  unidadeDivergencia(linha: DivergenciaForm): string {
    return this.inventarioFinalizando?.prateleiras.find(p => p.chave === linha.chavePrateleira)
      ?.posicoesSistema?.find(p => p.posicao === linha.posicao && p.idItem === linha.idItem)?.unidade ?? '';
  }

  diferencaDivergencia(linha: DivergenciaForm): number | null {
    return linha.quantidadeContada === null ? null : linha.quantidadeContada - this.saldoSistemaDivergencia(linha);
  }

  private linhaValida(linha: DivergenciaForm): boolean {
    const p = this.inventarioFinalizando?.prateleiras.find(p => p.chave === linha.chavePrateleira);
    if (!p?.posicoesSistema || linha.posicao === null || !Number.isSafeInteger(linha.posicao) || linha.posicao < 1 ||
        !linha.descricaoItem || linha.quantidadeContada === null || !Number.isSafeInteger(linha.quantidadeContada) ||
        linha.quantidadeContada < 0 || linha.quantidadeContada === this.saldoSistemaDivergencia(linha)) return false;
    if (linha.idItem === null ? p.posicoesSistema.length !== 0 :
        !p.posicoesSistema.some(x => x.posicao === linha.posicao && x.idItem === linha.idItem)) return false;
    return !this.divergenciasForm.some((x, i) => x !== linha && i !== this.indiceEdicao &&
      x.chavePrateleira === linha.chavePrateleira && x.posicao === linha.posicao);
  }

  get quantidadeDivergenciasForm(): number { return this.divergenciasForm.length; }
  get quantidadeJustificadasForm(): number { return this.divergenciasForm.filter(linha => !!linha.justificativa.trim()).length; }

  get podeFinalizar(): boolean {
    return !!this.inventarioFinalizando && !this.referenciaIncompleta && !this.salvando && !this.rascunho && !this.mapaSelecao &&
      this.inventarioFinalizando.status === 'em_andamento' && this.divergenciasForm.every(linha => this.linhaValida(linha));
  }

  private payloadOcorrencias(): InventarioDivergenciaPayload[] {
    return this.divergenciasForm.map(linha => ({
      chavePrateleira: linha.chavePrateleira,
      posicao: linha.posicao!,
      idItem: linha.idItem,
      descricaoItem: linha.descricaoItem,
      quantidadeContada: linha.quantidadeContada!,
      observacao: linha.observacao,
      justificativa: linha.justificativa,
    }));
  }

  salvarOcorrencias(): void {
    if (!this.podeFinalizar || !this.inventarioFinalizando || !this.ocorrenciasAlteradas) return;
    this.salvando = true;
    this.inventariosApi.registrarOcorrencias(this.inventarioFinalizando.idInventario, this.payloadOcorrencias()).subscribe({
      next: inventario => {
        this.salvando = false;
        this.inventarioFinalizando = inventario;
        this.ocorrenciasSalvas = JSON.stringify(this.divergenciasForm);
        this.carregar();
        this.dialogo.sucesso('Ocorrências salvas. O inventário continua em andamento e o estoque permanece bloqueado.');
      },
      error: e => {
        this.salvando = false;
        this.dialogo.erro(mensagemErro(e), 'Não foi possível salvar as ocorrências');
      },
    });
  }

  finalizarInventario(): void {
    if (!this.podeFinalizar || !this.inventarioFinalizando) {
      this.dialogo.erro('Confira as divergências: informe a prateleira, o material e uma quantidade diferente do saldo registrado no início.');
      return;
    }
    this.salvando = true;
    this.inventariosApi.finalizar(this.inventarioFinalizando.idInventario, this.payloadOcorrencias()).subscribe({
      next: inventario => {
        this.salvando = false;
        this.modalFinalizacaoAberto = false;
        this.fecharMapaSelecao();
        this.inventarioFinalizando = null;
        this.divergenciasForm = [];
        this.ocorrenciasSalvas = '[]';
        this.dialogo.sucesso(
          'Inventário #' + inventario.idInventario + ' encerrado com ' +
          inventario.quantidadeDivergencias + ' divergência(s), sendo ' +
          inventario.quantidadeJustificadas + ' justificada(s). Consulte as ocorrências em Alertas (F8). O saldo não foi alterado automaticamente.',
          'Inventário finalizado',
        );
        this.carregar();
      },
      error: e => {
        this.salvando = false;
        this.dialogo.erro(mensagemErro(e), 'Não foi possível finalizar o inventário');
      },
    });
  }

  abrirDetalhes(inventario: InventarioModel): void {
    this.inventarioDetalhe = inventario;
  }

  get totalDivergencias(): number {
    return this.inventarios.reduce((total, inventario) => total + inventario.quantidadeDivergencias, 0);
  }

  get totalPrateleirasContadas(): number {
    return this.inventarios
      .filter(inventario => inventario.status === 'finalizado')
      .reduce((total, inventario) => total + inventario.prateleiras.length, 0);
  }
}
