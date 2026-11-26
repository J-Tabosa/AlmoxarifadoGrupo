import { Component, HostListener, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { mensagemErro } from '../../core/app-error';
import { DialogoService } from '../../core/dialogo.service';
import { EntradaModel, EntradaPayload } from '../../models/entrada.model';
import { ItemModel } from '../../models/item.model';
import { FornecedorModel } from '../../models/fornecedor.model';
import { ItensService } from '../../services/itens.service';
import { FornecedoresService } from '../../services/fornecedores.service';
import { EntradasService } from '../../services/entradas.service';
import { PlantaService, Posicao } from '../../services/planta';

@Component({
  selector: 'app-entradas',
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './entradas.html',
  styleUrl: './entradas.css'
})
export class Entradas implements OnInit {
  readonly planta = inject(PlantaService);
  private readonly api = inject(EntradasService);
  private readonly itensApi = inject(ItensService);
  private readonly fornecedoresApi = inject(FornecedoresService);
  private readonly dialogo = inject(DialogoService);
  private readonly route = inject(ActivatedRoute);

  itens: ItemModel[] = [];
  fornecedores: FornecedorModel[] = [];
  entradas: EntradaModel[] = [];
  idItem: number | null = null;
  idFornecedor: number | null = null;
  quantidade: number | null = null;
  eMinimo: number | null = 0;
  eMaximo: number | null = 0;
  dataHoraE = this.agora();
  lote = '';
  validade = '';
  grupoKey = '';
  idEstante: number | null = null;
  prateleira: number | null = null;
  posicao: number | null = null;
  mapaAberto = false;
  salvando = false;
  erro = '';

  ngOnInit(): void {
    this.planta.refreshStock();
    this.carregar();
    const params = this.route.snapshot.queryParamMap;
    const id = Number(params.get('item'));
    if (this.itens.some(i => i.idItem === id)) this.idItem = id;
    const grupo = params.get('grupo');
    if (grupo && this.planta.groups.some(g => g.key === grupo)) {
      this.grupoKey = grupo;
      const rack = this.grupo?.slots.find(s => !s.blocked && s.idlocalizacao === Number(params.get('estante')));
      const level = Number(params.get('prateleira'));
      const position = Number(params.get('posicao'));
      if (rack && this.idItem !== null && Number.isInteger(level) && level >= 1 &&
          level <= this.planta.shelfCount(rack) && Number.isSafeInteger(position) && position >= 1 &&
          rack.contents.some(p => p.itemCode === 'ITEM-' + this.idItem && p.level === level && p.position === position)) {
        this.idEstante = rack.idlocalizacao;
        this.prateleira = level;
        this.posicao = position;
      } else {
        this.abrirMapa();
      }
    }
  }

  carregar(): void {
    this.itensApi.listar().subscribe({ next: d => this.itens = d.filter(i => i.statusIt === 'A'),
      error: e => this.erro = mensagemErro(e) });
    this.fornecedoresApi.listar().subscribe({ next: d => this.fornecedores = d.filter(f => f.statusFo === 'A'),
      error: e => this.erro = mensagemErro(e) });
    this.api.listar().subscribe({ next: d => this.entradas = d, error: e => this.erro = mensagemErro(e) });
  }

  private agora(): string {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }

  get item() { return this.itens.find(i => i.idItem === this.idItem); }
  get grupo() { return this.planta.groups.find(g => g.key === this.grupoKey); }
  get estante() { return this.grupo?.slots.find(s => s.idlocalizacao === this.idEstante && !s.blocked); }
  get niveis(): number[] {
    return this.estante ? Array.from({ length: this.planta.shelfCount(this.estante) }, (_, i) => i + 1) : [];
  }
  get conteudoNivel() {
    return (this.estante?.contents ?? []).filter(p => p.level === this.prateleira && p.qty > 0);
  }
  get ocupante() {
    return this.conteudoNivel.find(p => p.position === this.posicao);
  }
  get conflito(): boolean {
    return !!this.ocupante && this.ocupante.itemCode !== 'ITEM-' + this.idItem;
  }
  // Um estoque zerado continua sendo um vínculo existente, com seus limites originais.
  get estoqueDestino() {
    return this.item?.estoques?.find(e => {
      const l = e.localizacao;
      return l?.grupoKey === this.grupoKey && l.idEstante === this.idEstante &&
        l.prateleira === this.prateleira && l.posicaoInterna === this.posicao;
    });
  }

  get novaConfiguracao(): boolean {
    return !!this.item && !!this.estante && this.prateleira !== null &&
      this.niveis.includes(this.prateleira) && this.posicao !== null &&
      Number.isSafeInteger(this.posicao) && this.posicao > 0 && !this.conflito && !this.estoqueDestino;
  }

  get limitesValidos(): boolean {
    return this.eMinimo !== null && this.eMaximo !== null &&
      Number.isSafeInteger(this.eMinimo) && Number.isSafeInteger(this.eMaximo) &&
      this.eMinimo >= 0 && this.eMaximo >= this.eMinimo;
  }

  get saldoPrevisto(): number {
    return (this.estoqueDestino?.saldo ?? 0) + (this.quantidade ?? 0);
  }

  get ultrapassaMaximo(): boolean {
    const maximo = this.estoqueDestino?.eMaximo ?? (this.novaConfiguracao ? this.eMaximo : null);
    return maximo !== null && maximo !== undefined && maximo > 0 && this.saldoPrevisto > maximo;
  }

  private limparLimites(): void { this.eMinimo = this.eMaximo = 0; }

  trocarItem(id: number | null): void {
    if (this.idItem !== id) this.limparLimites();
    this.idItem = id;
  }

  escolherPosicao(n: number | null): void {
    if (this.posicao !== n) this.limparLimites();
    this.posicao = n;
  }

  get endereco(): string {
    return this.grupo && this.estante && this.prateleira && this.posicao
      ? this.grupo.name + ' / ' + this.nomeEstante(this.estante) + ' / P' + this.prateleira + ' / Pos. ' + this.posicao
      : '';
  }
  nomeEstante(s: Posicao): string {
    return s.descricao?.trim() || String(s.r).padStart(2, '0') + '-' + String(s.c).padStart(2, '0');
  }
  trocarGrupo(key: string): void {
    this.grupoKey = key;
    this.idEstante = this.prateleira = this.posicao = null;
    this.limparLimites();
    if (this.grupo) this.abrirMapa();
  }
  abrirMapa(): void { if (this.grupo) this.mapaAberto = true; }
  fecharMapa(): void { this.mapaAberto = false; }
  @HostListener('document:keydown.escape')
  escape(): void { this.fecharMapa(); }
  escolherEstante(slot: Posicao): void {
    if (slot.blocked) return;
    this.idEstante = slot.idlocalizacao;
    this.prateleira = this.posicao = null;
    this.limparLimites();
    this.fecharMapa();
  }
  escolherPrateleira(n: number | null): void {
    this.prateleira = n;
    this.posicao = null;
    this.limparLimites();
  }
  get podeSalvar(): boolean {
    return !!this.item && !!this.estante && this.prateleira !== null && this.niveis.includes(this.prateleira) &&
      this.posicao !== null && Number.isSafeInteger(this.posicao) && this.posicao > 0 &&
      this.quantidade !== null && Number.isSafeInteger(this.quantidade) && this.quantidade > 0 &&
      !!this.dataHoraE && !this.conflito && !this.salvando &&
      (!this.novaConfiguracao || this.limitesValidos) && !this.ultrapassaMaximo;
  }
  salvar(): void {
    if (!this.podeSalvar || !this.estante || !this.grupo) return;
    const payload: EntradaPayload = {
      idItem: this.idItem!, idFornecedor: this.idFornecedor, quantidade: this.quantidade!,
      dataHoraE: this.dataHoraE, lote: this.lote, validade: this.validade || null,
      grupoKey: this.grupo.key, idEstante: this.estante.idlocalizacao,
      prateleira: this.prateleira!, posicao: this.posicao!,
      ...(this.novaConfiguracao ? { eMinimo: this.eMinimo!, eMaximo: this.eMaximo! } : {})
    };
    this.salvando = true;
    this.erro = '';
    this.api.registrar(payload).subscribe({
      next: entrada => {
        this.salvando = false;
        this.limpar();
        this.carregar();
        this.dialogo.sucesso('Entrada #' + entrada.idEntrada + ' registrada. O saldo e o mapa foram atualizados.', 'Entrada registrada');
      },
      error: e => { this.salvando = false; this.erro = mensagemErro(e); }
    });
  }
  limpar(): void {
    this.idItem = this.idFornecedor = this.quantidade = null;
    this.limparLimites();
    this.idEstante = this.prateleira = this.posicao = null;
    this.grupoKey = this.lote = this.validade = this.erro = '';
    this.dataHoraE = this.agora();
    this.fecharMapa();
  }
}
