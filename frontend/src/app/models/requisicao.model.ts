export interface RequisicaoItemPayload {
  idItem: number;
  quantidadeS: number;
  idLocalizacao?: number;
}

/**
 * idFuncionario representa o solicitante.
 * idAlmoxarife representa o funcionário do almoxarifado que registrou a requisição.
 */
export interface RequisicaoPayload {
  idFuncionario: number;
  idAlmoxarife: number;
  dataHoraS: string;
  justificativa: string;
  tipoS: string;
  itens: RequisicaoItemPayload[];
}

export interface RequisicaoItemModel extends RequisicaoItemPayload {
  descricaoItem?: string;
  unidade?: string;
  saldoTotal?: number;
  endereco?: string;
}

export interface RequisicaoModel {
  idRequisicao: number;
  idFuncionario: number;
  idAlmoxarife: number;
  dataHoraS: string;
  justificativa: string;
  tipoS: string;
  funcionario?: FuncionarioResumo;
  almoxarife?: FuncionarioResumo;
  itens: RequisicaoItemModel[];
  /** Ausente em requisições antigas, que não movimentavam estoque. */
  baixaAplicada?: boolean;
}

export interface FuncionarioResumo {
  idFuncionario: number;
  nomeFu: string;
  cargo?: string;
  idSetor: number;
  setor?: { idSetor: number; nomeSetor: string } | null;
}
