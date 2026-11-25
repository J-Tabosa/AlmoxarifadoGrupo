import { EnderecoModel } from './endereco.model';

export interface FornecedorModel {
  idFornecedor: number;
  idEndereco: number;
  nomeFo: string;
  cnpj: string;
  contato: string;
  statusFo: string;
  endereco: EnderecoModel;
}

export interface FornecedorPayload {
  nomeFo: string;
  cnpj: string;
  contato: string;
  statusFo: string;
  endereco: EnderecoModel;
}
