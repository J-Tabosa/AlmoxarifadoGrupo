export interface RequisicaoItemPayload {
  idItem: number;
  quantidadeS: number;
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
}

export interface FuncionarioResumo {
  idFuncionario: number;
  nomeFu: string;
  cargo?: string;
  idSetor: number;
  setor?: { idSetor: number; nomeSetor: string } | null;
}
