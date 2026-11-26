export interface LocalizacaoModel {
  idLocalizacao: number;
  sala: string;
  andar: string;
  statusL: string;
  posicao: string;
  // Endereçamento físico do editor da planta (opcional para registros antigos).
  grupoKey?: string;
  idEstante?: number;
  prateleira?: number;
  posicaoInterna?: number;
}
