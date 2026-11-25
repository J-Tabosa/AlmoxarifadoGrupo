import { Injectable, signal } from '@angular/core';

export type TipoDialogo = 'sucesso' | 'erro' | 'confirmacao';

export interface DialogoEstado {
  tipo: TipoDialogo;
  titulo: string;
  mensagem: string;
  textoConfirmar: string;
  textoCancelar: string;
}

/**
 * Centraliza avisos e confirmações em um modal estilizado no padrão visual
 * do sistema. O componente raiz é responsável apenas por apresentar o modal.
 */
@Injectable({ providedIn: 'root' })
export class DialogoService {
  private readonly estadoInterno = signal<DialogoEstado | null>(null);
  readonly estado = this.estadoInterno.asReadonly();

  private resolverAtual: ((confirmado: boolean) => void) | null = null;

  sucesso(mensagem: string, titulo = 'Operação concluída'): void {
    this.abrir({
      tipo: 'sucesso',
      titulo,
      mensagem,
      textoConfirmar: 'Entendi',
      textoCancelar: 'Fechar',
    });
  }

  erro(mensagem: string, titulo = 'Não foi possível concluir'): void {
    this.abrir({
      tipo: 'erro',
      titulo,
      mensagem,
      textoConfirmar: 'Entendi',
      textoCancelar: 'Fechar',
    });
  }

  confirmar(
    mensagem: string,
    titulo = 'Confirmar exclusão',
    textoConfirmar = 'Excluir',
  ): Promise<boolean> {
    this.encerrarConfirmacaoPendente();

    return new Promise<boolean>(resolve => {
      this.resolverAtual = resolve;
      this.estadoInterno.set({
        tipo: 'confirmacao',
        titulo,
        mensagem,
        textoConfirmar,
        textoCancelar: 'Cancelar',
      });
    });
  }

  fechar(confirmado = false): void {
    const resolver = this.resolverAtual;
    this.resolverAtual = null;
    this.estadoInterno.set(null);
    resolver?.(confirmado);
  }

  private abrir(estado: DialogoEstado): void {
    this.encerrarConfirmacaoPendente();
    this.estadoInterno.set(estado);
  }

  private encerrarConfirmacaoPendente(): void {
    const resolver = this.resolverAtual;
    this.resolverAtual = null;
    resolver?.(false);
  }
}
