import { Injectable } from '@angular/core';
import { BancoLocalService } from '../core/banco-local.service';
import { FuncionarioModel, FuncionarioPayload } from '../models/funcionario.model';

@Injectable({ providedIn: 'root' })
export class FuncionariosService {
  constructor(private readonly banco: BancoLocalService) {}

  listar() {
    return this.banco.ler(d => d.funcionarios.map(f => ({
      ...f,
      setor: d.setores.find(s => s.idSetor === f.idSetor) ?? null,
    })));
  }

  consultarChave(idFuncionario: number, idSetor: number) {
    return this.banco.ler(d => {
      const f = d.funcionarios.find(x => x.idFuncionario === idFuncionario && x.idSetor === idSetor);
      if (!f) throw new Error('Funcionário não encontrado.');
      return { ...f, setor: d.setores.find(s => s.idSetor === f.idSetor) ?? null };
    });
  }

  criar(payload: FuncionarioPayload) {
    return this.banco.alterar(d => {
      if (!d.setores.some(s => s.idSetor === payload.idSetor)) throw new Error('Selecione um setor válido.');
      const registro: FuncionarioModel = {
        idFuncionario: this.proximoId(d.funcionarios.map(f => f.idFuncionario)),
        idSetor: payload.idSetor, nomeFu: payload.nomeFu.trim(), cargo: payload.cargo.trim(), statusFu: payload.statusFu,
      };
      d.funcionarios.push(registro);
      return registro;
    });
  }

  atualizarChave(idFuncionario: number, idSetorOriginal: number, payload: FuncionarioPayload) {
    return this.banco.alterar(d => {
      const registro = d.funcionarios.find(f => f.idFuncionario === idFuncionario && f.idSetor === idSetorOriginal);
      if (!registro) throw new Error('Funcionário não encontrado.');
      if (!d.setores.some(s => s.idSetor === payload.idSetor)) throw new Error('Selecione um setor válido.');
      registro.idSetor = payload.idSetor;
      registro.nomeFu = payload.nomeFu.trim();
      registro.cargo = payload.cargo.trim();
      registro.statusFu = payload.statusFu;
      return registro;
    });
  }

  excluirChave(idFuncionario: number, idSetor: number) {
    return this.banco.alterar(d => {
      if (d.requisicoes.some(r => r.idFuncionario === idFuncionario || r.idAlmoxarife === idFuncionario)) throw new Error('Não é possível excluir: o funcionário está vinculado a requisições como solicitante ou almoxarife responsável.');
      const antes = d.funcionarios.length;
      d.funcionarios = d.funcionarios.filter(f => !(f.idFuncionario === idFuncionario && f.idSetor === idSetor));
      if (d.funcionarios.length === antes) throw new Error('Funcionário não encontrado.');
    });
  }

  private proximoId(ids: number[]): number { return ids.length ? Math.max(...ids) + 1 : 1; }
}
