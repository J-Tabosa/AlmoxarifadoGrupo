import { Injectable } from '@angular/core';
import { BancoLocalService } from '../core/banco-local.service';
import { SetorModel, SetorPayload } from '../models/setor.model';

@Injectable({ providedIn: 'root' })
export class SetoresService {
  constructor(private readonly banco: BancoLocalService) {}

  listar() { return this.banco.ler(d => d.setores); }

  criar(payload: SetorPayload) {
    return this.banco.alterar(d => {
      const nome = payload.nomeSetor.trim();
      if (d.setores.some(s => s.nomeSetor.toLowerCase() === nome.toLowerCase())) throw new Error('Já existe um setor com este nome.');
      const registro: SetorModel = { idSetor: this.proximoId(d.setores.map(x => x.idSetor)), nomeSetor: nome };
      d.setores.push(registro);
      return registro;
    });
  }

  atualizar(id: number, payload: SetorPayload) {
    return this.banco.alterar(d => {
      const registro = d.setores.find(x => x.idSetor === id);
      if (!registro) throw new Error('Setor não encontrado.');
      const nome = payload.nomeSetor.trim();
      if (d.setores.some(x => x.idSetor !== id && x.nomeSetor.toLowerCase() === nome.toLowerCase())) throw new Error('Já existe um setor com este nome.');
      registro.nomeSetor = nome;
      return registro;
    });
  }

  excluir(id: number) {
    return this.banco.alterar(d => {
      if (d.funcionarios.some(f => f.idSetor === id)) throw new Error('Não é possível excluir: há funcionários vinculados a este setor.');
      const antes = d.setores.length;
      d.setores = d.setores.filter(x => x.idSetor !== id);
      if (d.setores.length === antes) throw new Error('Setor não encontrado.');
    });
  }

  private proximoId(ids: number[]): number { return ids.length ? Math.max(...ids) + 1 : 1; }
}
