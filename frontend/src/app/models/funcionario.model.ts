export interface FuncionarioModel {
  idFuncionario: number;
  idSetor: number;
  nomeFu: string;
  cargo: string;
  statusFu: string;
  setor?: { idSetor: number; nomeSetor: string } | null;
}

export interface FuncionarioPayload {
  idSetor: number;
  nomeFu: string;
  cargo: string;
  statusFu: string;
  // Campo reservado para futura autenticação; não é preenchido nesta versão local.
  senha?: string;
}
