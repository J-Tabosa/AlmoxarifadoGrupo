export interface EnderecoModel {
  idEndereco?: number;
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string | null;
  cidade: string;
  bairro: string;
  estado: string;
  pais: string;
}
