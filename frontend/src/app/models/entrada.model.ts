/** Entrada local: o ID da localização interna é distinto do ID da estante. */
export interface EntradaPayload {
  idItem: number;
  idFornecedor: number | null;
  quantidade: number;
  dataHoraE: string;
  lote: string;
  validade: string | null;
  grupoKey: string;
  idEstante: number;
  prateleira: number;
  posicao: number;
  // Limites aplicados apenas ao criar o vínculo item/localização.
  eMinimo?: number;
  eMaximo?: number;
}

export interface EntradaModel extends EntradaPayload {
  idEntrada: number;
  idLocalizacao: number;
  descricaoItem: string;
  unidade: string;
  nomeFornecedor: string;
  endereco: string;
}
