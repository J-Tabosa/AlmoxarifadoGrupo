using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Api_Almoxarifado.Models;
using Api_Almoxarifado.DTO;
using NuGet.Common;
using System.Security.Cryptography;

namespace Api_Almoxarifado.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FornecedorController: ControllerBase
    {
        private readonly BdAlmoxarifadoContext _context;

        public FornecedorController(BdAlmoxarifadoContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<FornecedorDTO>>> GetFornecedores()
        {
            var fornecedor = await _context.Fornecedors.Select(f => new FornecedorDTO
            {
                idFornecedor = f.Idfornecedor,
                Contato = f.Contato,
                nomeFo = f.NomeFo,
                Cnpj = f.Cnpj,
                statusFo = f.StatusFo,
                

                Endereco = f.Endereco.Select(e => new Endereco
                {
                    Idendereco = e.Idendereco,
                    Idfornecedor = e.Idfornecedor,
                    Cep = e.Cep,
                    Logradouro = e.Logradouro,
                    Numero = e.Numero,
                    Complemento = e.Complemento,
                    Cidade = e.Cidade,
                    Bairro = e.Bairro,
                    Estado = e.Estado,
                    Pais = e.Pais,
                }).ToList(),
            }).FirstOrDefaultAsync();

            return Ok(fornecedor);
        } // Fim do método GetFornecedores

        [HttpGet("{id}")]
        public async Task<ActionResult<FornecedorDTO>> GetFornecedor(int id)
        {
            var fornecedor = await _context.Fornecedors
                .Where(f => f.Idfornecedor == id)
                .Select(f => new Fornecedor
                {
                    Idfornecedor = f.Idfornecedor,
                    Contato = f.Contato,
                    NomeFo = f.NomeFo,
                    Cnpj = f.Cnpj,
                    StatusFo = f.StatusFo,

                    Endereco = f.Endereco.Select(e => new Endereco
                    {
                        Idendereco = e.Idendereco,
                        Idfornecedor = e.Idfornecedor,
                        Cep = e.Cep,
                        Logradouro = e.Logradouro,
                        Numero = e.Numero,
                        Complemento = e.Complemento,
                        Cidade = e.Cidade,
                        Bairro = e.Bairro,
                        Estado = e.Estado,
                        Pais = e.Pais,
                    }).ToList(),
                }).FirstOrDefaultAsync();

            return Ok(fornecedor);
        } // Fim do método GetFornecedor

        [HttpPost]
        public async Task<ActionResult<FornecedorPostDTO>> PostFornecedor(FornecedorPostDTO dto)
        {
            var fornecedor = new Fornecedor
            {
                Idfornecedor = dto.idFornecedor,
                Contato = dto.Contato,
                NomeFo = dto.nomeFo,
                Cnpj = dto.Cnpj,
                StatusFo = dto.statusFo
            };

            if (dto.Contato == null || dto.nomeFo == null || dto.Cnpj == null || dto.statusFo == null)
            {
                return BadRequest($"Todas as informações do fornecedor deve ser preenchidas.");
            }

            if (dto.Cnpj.Length != 14 && !dto.Cnpj.All(char.IsDigit))
            {
                return BadRequest($"O CNPJ deve ter 14 dígitos");
            }

            _context.Add( fornecedor );

            await _context.SaveChangesAsync();

            var response = new FornecedorPostDTO
            {
                idFornecedor = dto.idFornecedor,
                Contato = dto.Contato,
                nomeFo = dto.nomeFo,
                Cnpj = dto.Cnpj,
                statusFo = dto.statusFo
            };

            return CreatedAtAction(
                nameof(GetFornecedores),
                new {id = fornecedor.Idfornecedor,
                response});
        } // Fim do método PostFornecedor

        [HttpPut("{id}")]
        public async Task<ActionResult<FornecedorPostDTO>> PutFornecedor(int id, FornecedorPostDTO dto)
        {
            var fornecedor = await _context.Fornecedors
                .FirstOrDefaultAsync(f => f.Idfornecedor == id);

            if (fornecedor == null) 
            {
                return BadRequest($"Forncecedor não encontrado.");
            }

            fornecedor.Idfornecedor = dto.idFornecedor;
            fornecedor.Contato = dto.Contato;
            fornecedor.NomeFo = dto.nomeFo;
            fornecedor.Cnpj = dto.Cnpj;
            fornecedor.StatusFo = dto.statusFo;

            if (dto.Contato == null || dto.nomeFo == null || dto.Cnpj == null || dto.statusFo == null)
            {
                return BadRequest($"Todas as informações do fornecedor deve ser preenchidas.");
            }

            if (dto.Cnpj.Length != 14 && !dto.Cnpj.All(char.IsDigit))
            {
                return BadRequest($"O CNPJ deve ter 14 dígitos");
            }

            await _context.SaveChangesAsync();

            return NoContent();
        } // Fim do método PutFornecedor

        [HttpDelete("{id}")]
        public async Task<ActionResult<FornecedorPostDTO>> DeleteFornecedor(int id)
        {
            var fornecedor = await _context.Fornecedors
                .FirstOrDefaultAsync(f => f.Idfornecedor == id);

            if (fornecedor == null)
            {
                return BadRequest($"Fornecedor não encontrado.");
            }

            _context.Fornecedors.Remove( fornecedor );

            await _context.SaveChangesAsync();

            return NoContent();
        } // Fim do método DeleteFornecedor
    }
}