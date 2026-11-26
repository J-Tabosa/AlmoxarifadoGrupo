import { Component, HostListener, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { mensagemErro } from '../../core/app-error';
import { AlertaModel, ContramedidaPayload, TipoAlerta } from '../../models/alerta.model';
import { AlertasService } from '../../services/alertas.service';

@Component({
  imports: [FormsModule, DatePipe, RouterLink],
  selector: 'app-divergencias',
  styleUrl: './divergencias.css',
  templateUrl: './divergencias.html',
})
export class Divergencias implements OnInit {
  private readonly api = inject(AlertasService);
  alertas: AlertaModel[] = [];
  pesquisa = '';
  filtroTipo: 'todos' | TipoAlerta = 'todos';
  filtroEstado: 'aberto' | 'resolvido' | 'todos' = 'aberto';
  filtroGravidade: 'todas' | 'critico' | 'atencao' = 'todas';
  selecionado: AlertaModel | null = null;
  erro = '';
  carregando = false;
  salvando = false;
  editandoMedida = false;
  mensagem = '';
  medida: ContramedidaPayload = this.medidaVazia();

  ngOnInit(): void { this.carregar(); }

  get abertos() { return this.alertas.filter(a => a.estado === 'aberto'); }
  get criticos() { return this.abertos.filter(a => a.gravidade === 'critico').length; }
  get resolvidos() { return this.alertas.filter(a => a.estado === 'resolvido').length; }
  get comContramedida() { return this.abertos.filter(a => a.contramedidas.length > 0).length; }

  contar(tipo: TipoAlerta): number { return this.abertos.filter(a => a.tipo === tipo).length; }

  tipoNome(tipo: TipoAlerta): string {
    return {
      estoque_minimo: 'Estoque mínimo',
      divergencia_entrada: 'Divergência de entrada',
      divergencia_saida: 'Divergência de saída',
      divergencia_inventario: 'Divergência de inventário'
    }[tipo];
  }

  private normalizar(v: string): string {
    return v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  get filtrados(): AlertaModel[] {
    const q = this.normalizar(this.pesquisa);
    return this.alertas.filter(a =>
      (this.filtroEstado === 'todos' || a.estado === this.filtroEstado) &&
      (this.filtroTipo === 'todos' || a.tipo === this.filtroTipo) &&
      (this.filtroGravidade === 'todas' || a.gravidade === this.filtroGravidade) &&
      (!q || this.normalizar([a.id, a.idItem, a.idLocalizacao, a.idEstante, a.titulo, a.descricao, a.endereco, this.tipoNome(a.tipo)].join(' ')).includes(q)));
  }

  carregar(): void {
    this.carregando = true;
    this.erro = '';
    this.api.listar().subscribe({
      next: dados => {
        this.alertas = dados;
        this.carregando = false;
        if (this.selecionado) this.selecionado = dados.find(a => a.id === this.selecionado?.id) ?? null;
      },
      error: e => { this.erro = mensagemErro(e); this.carregando = false; }
    });
  }

  filtrar(tipo: 'todos' | TipoAlerta): void {
    this.filtroTipo = tipo;
    this.filtroEstado = 'aberto';
    this.filtroGravidade = 'todas';
  }

  abrir(a: AlertaModel): void {
    this.selecionado = a;
    this.editandoMedida = false;
    this.medida = this.medidaVazia();
    this.mensagem = '';
    this.erro = '';
  }

  fechar(): void {
    if (this.salvando) return;
    this.selecionado = null;
    this.editandoMedida = false;
    this.erro = '';
    this.mensagem = '';
  }

  @HostListener('document:keydown.escape')
  escape(): void {
    if (!this.selecionado || this.salvando) return;
    if (this.editandoMedida) this.editandoMedida = false;
    else this.fechar();
  }

  private medidaVazia(): ContramedidaPayload {
    return { descricao: '', responsavel: '', prazo: null, situacao: 'planejada' };
  }

  get sugestao(): string {
    if (!this.selecionado) return '';
    const a = this.selecionado;
    return a.tipo === 'estoque_minimo'
      ? 'Verificar o saldo físico e a demanda. Providenciar reposição de pelo menos ' +
        Math.max(0, (a.minimo ?? 0) - (a.saldo ?? 0)) + ' ' + (a.unidade ?? '') +
        ' na localização indicada; registrar a entrada após o recebimento.'
      : 'Conferir a documentação e o saldo físico, identificar a causa e registrar a correção autorizada.';
  }

  iniciarMedida(): void {
    this.medida = this.medidaVazia();
    this.editandoMedida = true;
    this.erro = '';
    this.mensagem = '';
  }

  salvarMedida(): void {
    if (!this.selecionado || this.salvando || !this.medida.descricao.trim() || !this.medida.responsavel.trim()) return;
    this.salvando = true;
    this.erro = '';
    this.api.registrarContramedida(this.selecionado.id, this.medida).subscribe({
      next: dados => {
        this.alertas = dados;
        this.selecionado = dados.find(a => a.id === this.selecionado?.id) ?? null;
        this.salvando = false;
        this.editandoMedida = false;
        this.mensagem = 'Contramedida registrada. O alerta permanece aberto até a condição ser regularizada.';
      },
      error: e => { this.erro = mensagemErro(e); this.salvando = false; }
    });
  }
}
