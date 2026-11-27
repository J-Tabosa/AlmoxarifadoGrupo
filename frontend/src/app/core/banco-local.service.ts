import { Injectable, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { AlertaModel } from '../models/alerta.model';
import { CategoriaModel } from '../models/categoria.model';
import { FornecedorModel } from '../models/fornecedor.model';
import { FuncionarioModel } from '../models/funcionario.model';
import { EntradaModel } from '../models/entrada.model';
import { InventarioModel } from '../models/inventario.model';
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
  inventarios: InventarioModel[];
  alertas?: AlertaModel[];
}

const CHAVE_STORAGE = 'almoxarifado.crud.local.v1';

/** Impede alterações do catálogo e movimentos de estoque durante uma contagem aberta. */
export function validarMovimentacaoPermitida(dados: Pick<BancoLocal, 'inventarios'>): void {
  const ativo = (dados.inventarios ?? []).find(i => i.status === 'em_andamento');
  if (ativo) throw new Error('Movimentações e alterações de estoque estão bloqueadas durante o inventário #' + ativo.idInventario + '. Finalize o inventário para liberar o estoque.');
}

function clonar<T>(valor: T): T {
  if (valor === undefined || valor === null) return valor;
  return JSON.parse(JSON.stringify(valor)) as T;
}

function dadosIniciais(): BancoLocal {
  const localizacoes: LocalizacaoModel[] = [];
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
      estoques: [], saldoTotal: 0,
    },
    {
      idItem: 2, idCategoria: 2, descricaoItem: 'Detergente neutro', unidade: 'UN', statusIt: 'A',
      estoques: [], saldoTotal: 0,
    },
  ];
  return { setores, categorias, funcionarios, fornecedores: [], itens, localizacoes, requisicoes: [], entradas: [], inventarios: [], alertas: [] };
}

/** Remove somente os vínculos demonstrativos originais, sem inferir endereços reais. */
export function removerEstoquesDemonstrativos(dados: BancoLocal): boolean {
  let alterado = false;
  const exemplos = [
    { id: 1, descricao: 'Papel A4', categoria: 1, unidade: 'PC', posicao: 'A-01', saldo: 25, minimo: 5, maximo: 100 },
    { id: 2, descricao: 'Detergente neutro', categoria: 2, unidade: 'UN', posicao: 'A-02', saldo: 12, minimo: 3, maximo: 40 }
  ];
  for (const exemplo of exemplos) {
    const local = dados.localizacoes.find(l => l.idLocalizacao === exemplo.id);
    if (!local || local.sala !== 'Almoxarifado' || local.andar !== 'Térreo' ||
        local.posicao !== exemplo.posicao || local.statusL !== 'A' || local.grupoKey != null ||
        local.idEstante != null || local.prateleira != null || local.posicaoInterna != null) continue;

    // Qualquer histórico vinculado impede a limpeza automática.
    const usado = (dados.entradas ?? []).some(e => e.idLocalizacao === local.idLocalizacao) ||
      (dados.requisicoes ?? []).some(r => r.itens.some(x =>
        x.idLocalizacao === local.idLocalizacao || (x.idLocalizacao == null && x.idItem === exemplo.id))) ||
      (dados.alertas ?? []).some(a => a.idLocalizacao === local.idLocalizacao) ||
      (dados.inventarios ?? []).some(i =>
        i.prateleiras.some(p => p.posicoesSistema?.some(x => x.idLocalizacao === local.idLocalizacao)) ||
        i.divergencias.some(x => x.idLocalizacao === local.idLocalizacao));
    if (usado) continue;

    const item = dados.itens.find(i => i.idItem === exemplo.id && i.descricaoItem === exemplo.descricao &&
      i.idCategoria === exemplo.categoria && i.unidade === exemplo.unidade && i.statusIt === 'A');
    const stock = item?.estoques?.find(e => e.idLocalizacao === local.idLocalizacao &&
      e.idItem === exemplo.id && e.saldo === exemplo.saldo && e.eMinimo === exemplo.minimo && e.eMaximo === exemplo.maximo);
    if (item && stock) {
      item.estoques = item.estoques!.filter(e => e !== stock);
      item.saldoTotal = item.estoques.reduce((total, e) => total + e.saldo, 0);
      alterado = true;
    }

    if (!dados.itens.some(i => i.estoques?.some(e => e.idLocalizacao === local.idLocalizacao))) {
      dados.localizacoes = dados.localizacoes.filter(l => l !== local);
      alterado = true;
    }
  }
  return alterado;
}

/** Armazenamento local para prototipagem. Não faz chamadas HTTP nem acessa MySQL. */
@Injectable({ providedIn: 'root' })
export class BancoLocalService {
  private dados: BancoLocal = this.carregarDoNavegador();
  private readonly estantesEmContagem = signal(this.idsEmContagem());

  private idsEmContagem(): Set<number> {
    return new Set((this.dados.inventarios ?? []).filter(i => i.status === 'em_andamento')
      .flatMap(i => i.prateleiras.map(p => p.idEstante)));
  }

  estanteEmInventario(idEstante: number): boolean {
    return this.estantesEmContagem().has(idEstante);
  }

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
      const copia = clonar(resultado);
      this.estantesEmContagem.set(this.idsEmContagem());
      return of(copia);
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
          const mesclados: BancoLocal = { ...dadosIniciais(), ...dados, inventarios: dados.inventarios ?? [] };
          // Não há conversão de perfil ou permissão. Funcionários permanecem
          // como cadastros comuns; o papel na requisição é informado nos campos.
          // Migração dos registros criados antes da inclusão do almoxarife responsável.
          mesclados.requisicoes = (mesclados.requisicoes ?? []).map(requisicao => ({
            ...requisicao,
            // Para dados antigos sem o segundo responsável, não inferir cargo/perfil.
            idAlmoxarife: requisicao.idAlmoxarife ?? requisicao.idFuncionario,
          }));
          if (removerEstoquesDemonstrativos(mesclados)) {
            // Conserva uma cópia dos dados anteriores à limpeza, sem limpar o LocalStorage.
            try {
              const backupKey = CHAVE_STORAGE + '.antes-limpeza-demo';
              if (localStorage.getItem(backupKey) === null) localStorage.setItem(backupKey, salvo);
              localStorage.setItem(CHAVE_STORAGE, JSON.stringify(mesclados));
            } catch { /* A limpeza permanece disponível em memória. */ }
          }
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
