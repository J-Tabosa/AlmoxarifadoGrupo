export function mensagemErro(erro: unknown): string {
  if (erro instanceof Error && erro.message) return erro.message;
  return 'Não foi possível concluir a operação local.';
}
