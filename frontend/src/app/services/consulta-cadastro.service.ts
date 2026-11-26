import { Injectable } from '@angular/core';

export interface ConsultaEmpresa {
  cnpj?: string;
  nome_fantasia?: string;
  razao_social?: string;
  ddd_telefone_1?: string;
  email?: string;
  cep?: string;
  descricao_tipo_de_logradouro?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
}

export interface ConsultaCep {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean | string;
}

@Injectable({ providedIn: 'root' })
export class ConsultaCadastroService {
  consultarCnpj(cnpj: string, signal: AbortSignal): Promise<ConsultaEmpresa> {
    if (!/^\d{14}$/.test(cnpj)) return Promise.reject(new Error('Informe os 14 números do CNPJ.'));
    return this.buscar<ConsultaEmpresa>('https://brasilapi.com.br/api/cnpj/v1/' + cnpj, signal, 'CNPJ');
  }

  async consultarCep(cep: string, signal: AbortSignal): Promise<ConsultaCep> {
    if (!/^\d{8}$/.test(cep)) throw new Error('Informe os oito números do CEP.');
    const dados = await this.buscar<ConsultaCep>('https://viacep.com.br/ws/' + cep + '/json/', signal, 'CEP');
    if (dados.erro === true || dados.erro === 'true') throw new Error('CEP não encontrado.');
    return dados;
  }

  private async buscar<T>(url: string, signal: AbortSignal, campo: string): Promise<T> {
    const resposta = await fetch(url, { signal, headers: { Accept: 'application/json' }, credentials: 'omit' });
    if (resposta.status === 404) throw new Error(campo + ' não encontrado.');
    if (resposta.status === 429) throw new Error('Limite de consultas atingido. Tente novamente em instantes.');
    if (!resposta.ok) throw new Error('Não foi possível consultar o ' + campo + '. Preencha manualmente ou tente novamente.');
    return await resposta.json() as T;
  }
}
