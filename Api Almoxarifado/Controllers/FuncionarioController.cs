using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Api_Almoxarifado.Models;
using Api_Almoxarifado.DTO;

namespace Api_Almoxarifado.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FuncionarioController: ControllerBase
    {
        private readonly BdAlmoxarifadoContext _context;

        public FuncionarioController(BdAlmoxarifadoContext context)
        {
            _context = context;
        }
        /*
         *  var pessoas = await _context.Pessoas
                .Where(p => p.Funcionario != null)
                .Select(p => new PessoaFuncionarioDTO
                {
                    IdPessoa = p.Idpessoa,
                    Nome = p.Nome,
                    CPF = p.Cpf,
                    DataNascimento = p.DataNascimento,
                    Sexo = p.Sexo,
                    Email = p.Email,
                    Telefone = p.Telefone,
                    AtivoPessoa = p.AtivoPessoa,

                    Enderecos = p.Enderecos.Select(e => new EnderecoDTO
                    {
                        IdEndereco = e.Idendereco,
                        IdPessoa = e.Idpessoa,
                        Cep = e.Cep,
                        Numero = e.Numero,
                        Complemento = e.Complemento,
                    }).ToList(),

                    Funcionario = p.Funcionario == null ? null : new FuncionarioDTO
                    {
                        IdPessoa = p.Funcionario.Idpessoa,
                        Cargo = p.Funcionario.Cargo,
                        DataAdmissao = p.Funcionario.DataAdmissao
                    },

                }).ToListAsync();

            return Ok(pessoas);
         */

        [HttpGet]
        public async Task<ActionResult<IEnumerable<FuncionarioDTO>>> GetAll()
        {
            var funcionario = await _context.Funcionarios
                .Select(f => new FuncionarioDTO
                {
                    idFuncionario = f.Idfuncionario,
                    idSetor = f.Idsetor,
                    nomeFu = f.NomeFu,
                    Cargo = f.Cargo,
                    Senha = f.Senha,
                    statusFu = f.StatusFu,

                    Setor = f.Setor == null ? null : new FuncionarioDTO
                    {
                        idSetor = f.Setor.Idsetor,
                        nomeSetor = f.Setor.NomeSetor
                    },
                }).ToListAsync();

            return Ok(funcionario);
        } // Fim do método GetAll

        [HttpGet("{id}")]
        public async Task<ActionResult<FuncionarioDTO>> GetFuncionario(int id)
        {
            var funcionario = await _context.Funcionarios
                .Where(f => f.Idfuncionario == id)
                .ToListAsync();

            if (funcionario == null)
            {
                return NotFound($"Funcionario não encontrado.");
            }

            return Ok(funcionario);
        } // Fim do método GetFuncionario
    }
}
