export type TipoAlerta = 'estoque_minimo' | 'divergencia_entrada' | 'divergencia_saida' | 'divergencia_inventario';
export type GravidadeAlerta = 'critico' | 'atencao';
export type EstadoAlerta = 'aberto' | 'resolvido';

export interface ContramedidaAlerta {
  id: number;
  descricao: string;
  responsavel: string;
  prazo: string | null;
  situacao: 'planejada' | 'executada';
  registradaEm: string;
}

export interface AlertaModel {
  id: number;
  chave: string;
  tipo: TipoAlerta;
  gravidade: GravidadeAlerta;
  estado: EstadoAlerta;
  detectadoEm: string;
  resolvidoEm?: string;
  motivoEncerramento?: string;
  titulo: string;
  descricao: string;
  idItem?: number;
  idLocalizacao?: number;
  grupoKey?: string;
  idEstante?: number;
  prateleira?: number;
  posicao?: number;
  endereco: string;
  unidade?: string;
  saldo?: number;
  minimo?: number;
  maximo?: number;
  idInventario?: number;
  idDivergencia?: number;
  saldoSistema?: number;
  quantidadeContada?: number;
  diferenca?: number;
  observacaoInventario?: string;
  justificativaInventario?: string;
  contramedidas: ContramedidaAlerta[];
}

export type ContramedidaPayload = Omit<ContramedidaAlerta, 'id' | 'registradaEm'>;
