import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { AlertaModel } from '../models/alerta.model';
import { CategoriaModel } from '../models/categoria.model';
import { FornecedorModel } from '../models/fornecedor.model';
import { FuncionarioModel } from '../models/funcionario.model';
import { EntradaModel } from '../models/entrada.model';
import { ItemModel } from '../models/item.model';
import { LocalizacaoModel } from '../models/localizacao.model';
import { RequisicaoModel } from '../models/requisicao.model';
import { SetorModel } from '../models/setor.model';

export interface BancoLocal {
  setores: SetorModel[];
  categorias: CategoriaModel[];
  funcionarios: FuncionarioModel[];
  fornecedores: FornecedorModel[];
  itens: ItemModel[];
  localizacoes: LocalizacaoModel[];
  requisicoes: RequisicaoModel[];
  entradas: EntradaModel[];
  alertas?: AlertaModel[];
}

const CHAVE_STORAGE = 'almoxarifado.crud.local.v1';

function clonar<T>(valor: T): T {
  if (valor === undefined || valor === null) return valor;
  return JSON.parse(JSON.stringify(valor)) as T;
}

function dadosIniciais(): BancoLocal {
  const localizacoes: LocalizacaoModel[] = [
    { idLocalizacao: 1, sala: 'Almoxarifado', andar: 'Térreo', statusL: 'A', posicao: 'A-01' },
    { idLocalizacao: 2, sala: 'Almoxarifado', andar: 'Térreo', statusL: 'A', posicao: 'A-02' },
  ];
  const setores: SetorModel[] = [
    { idSetor: 1, nomeSetor: 'Administrativo' },
    { idSetor: 2, nomeSetor: 'Manutenção' },
  ];
  const categorias: CategoriaModel[] = [
    { idCategoria: 1, tipo: 'Material de expediente' },
    { idCategoria: 2, tipo: 'Material de limpeza' },
  ];
  const funcionarios: FuncionarioModel[] = [
    { idFuncionario: 1, idSetor: 2, nomeFu: 'Carlos Almeida', cargo: 'Almoxarife', statusFu: 'A' },
    { idFuncionario: 2, idSetor: 1, nomeFu: 'Mariana Santos', cargo: 'Solicitante', statusFu: 'A' },
    { idFuncionario: 3, idSetor: 2, nomeFu: 'Pedro Oliveira', cargo: 'Técnico de manutenção', statusFu: 'A' },
  ];
  const itens: ItemModel[] = [
    {
      idItem: 1, idCategoria: 1, descricaoItem: 'Papel A4', unidade: 'PC', statusIt: 'A',
      estoques: [
        { idItem: 1, idLocalizacao: 1, saldo: 25, eMinimo: 5, eMaximo: 100, localizacao: localizacoes[0] },
      ], saldoTotal: 25,
    },
    {
      idItem: 2, idCategoria: 2, descricaoItem: 'Detergente neutro', unidade: 'UN', statusIt: 'A',
      estoques: [
        { idItem: 2, idLocalizacao: 2, saldo: 12, eMinimo: 3, eMaximo: 40, localizacao: localizacoes[1] },
      ], saldoTotal: 12,
    },
  ];
  return { setores, categorias, funcionarios, fornecedores: [], itens, localizacoes, requisicoes: [], entradas: [], alertas: [] };
}

/** Armazenamento local para prototipagem. Não faz chamadas HTTP nem acessa MySQL. */
@Injectable({ providedIn: 'root' })
export class BancoLocalService {
  private dados: BancoLocal = this.carregarDoNavegador();

  ler<T>(seletor: (dados: BancoLocal) => T): Observable<T> {
    try {
      return of(clonar(seletor(this.dados)));
    } catch (erro) {
      return throwError(() => erro instanceof Error ? erro : new Error('Não foi possível ler os dados locais.'));
    }
  }

  alterar<T>(operacao: (dados: BancoLocal) => T, exigirPersistencia = false): Observable<T> {
    const anterior = clonar(this.dados);
    try {
      const resultado = operacao(this.dados);
      this.salvarNoNavegador(exigirPersistencia);
      return of(clonar(resultado));
    } catch (erro) {
      this.dados = anterior;
      return throwError(() => erro instanceof Error ? erro : new Error('Não foi possível alterar os dados locais.'));
    }
  }

  private carregarDoNavegador(): BancoLocal {
    try {
      if (typeof localStorage !== 'undefined') {
        const salvo = localStorage.getItem(CHAVE_STORAGE);
        if (salvo) {
          const dados = JSON.parse(salvo) as Partial<BancoLocal>;
          const mesclados: BancoLocal = { ...dadosIniciais(), ...dados };
          // Não há conversão de perfil ou permissão. Funcionários permanecem
          // como cadastros comuns; o papel na requisição é informado nos campos.
          // Migração dos registros criados antes da inclusão do almoxarife responsável.
          mesclados.requisicoes = (mesclados.requisicoes ?? []).map(requisicao => ({
            ...requisicao,
            // Para dados antigos sem o segundo responsável, não inferir cargo/perfil.
            idAlmoxarife: requisicao.idAlmoxarife ?? requisicao.idFuncionario,
          }));
          return mesclados;
        }
      }
    } catch {
      // Em navegação privada/restrita, mantém a cópia em memória durante a execução.
    }
    return dadosIniciais();
  }

  private salvarNoNavegador(exigirPersistencia = false): void {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(CHAVE_STORAGE, JSON.stringify(this.dados));
      else if (exigirPersistencia) throw new Error('Armazenamento indisponível.');
    } catch {
      if (exigirPersistencia) throw new Error('Não foi possível salvar a movimentação no navegador. Nenhuma alteração foi registrada.');
      // A aplicação continua utilizável em memória mesmo se o navegador bloquear o localStorage.
    }
  }
}
