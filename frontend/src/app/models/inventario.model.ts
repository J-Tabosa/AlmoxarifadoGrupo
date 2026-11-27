export interface InventarioFuncionario {
  idFuncionario: number;
  nomeFu: string;
  cargo: string;
}

export interface InventarioItemSnapshot {
  idItem: number;
  descricaoItem: string;
  unidade: string;
  saldo: number;
}

export interface InventarioPosicaoSnapshot extends InventarioItemSnapshot {
  posicao: number;
  idLocalizacao: number;
}

export interface InventarioPrateleira {
  chave: string;
  grupoKey: string;
  grupoNome: string;
  idEstante: number;
  nomeEstante: string;
  nivel: number;
  itensSistema: InventarioItemSnapshot[];
  posicoesSistema?: InventarioPosicaoSnapshot[];
}

export interface InventarioDivergencia {
  id: number;
  chavePrateleira: string;
  prateleira: string;
  posicao?: number;
  idLocalizacao?: number;
  idItem: number | null;
  descricaoItem: string;
  unidade: string;
  saldoSistema: number;
  quantidadeContada: number;
  diferenca: number;
  observacao: string;
  justificativa: string;
}

export interface InventarioModel {
  idInventario: number;
  dataInicio: string;
  dataFim: string | null;
  status: 'em_andamento' | 'finalizado' | 'cancelado';
  motivoCancelamento?: string;
  estoqueCompleto?: boolean;
  responsavel: InventarioFuncionario;
  contadores: InventarioFuncionario[];
  prateleiras: InventarioPrateleira[];
  divergencias: InventarioDivergencia[];
  quantidadeDivergencias: number;
  quantidadeJustificadas: number;
}

export interface InventarioInicioPayload {
  idResponsavel: number;
  idsContadores: number[];
  prateleiras: Array<{
    grupoKey: string;
    idEstante: number;
    nivel: number;
  }>;
}

export interface InventarioDivergenciaPayload {
  chavePrateleira: string;
  posicao: number;
  idItem: number | null;
  descricaoItem: string;
  quantidadeContada: number;
  observacao?: string;
  justificativa?: string;
}
