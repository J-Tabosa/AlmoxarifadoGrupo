import { LocalizacaoModel } from './localizacao.model';

export interface EstoqueModel {
  idItem: number;
  idLocalizacao: number;
  saldo: number;
  eMinimo: number;
  eMaximo: number;
  localizacao?: LocalizacaoModel | null;
}

export interface EstoqueConfiguracaoPayload {
  idLocalizacao: number;
  eMinimo: number;
  eMaximo: number;
}
