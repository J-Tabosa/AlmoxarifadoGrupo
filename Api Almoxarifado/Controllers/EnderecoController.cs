using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Api_Almoxarifado.Models;
using Api_Almoxarifado.DTO;

namespace Api_Almoxarifado.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EnderecoController: ControllerBase
    {
        private readonly BdAlmoxarifadoContext _context;

        public EnderecoController(BdAlmoxarifadoContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<EnderecoDTO>> GetEnderecos()
        {
            var endereco = await _context.Enderecos
                .ToListAsync();

            return Ok(endereco);
        } // Fim do método GetEnderecos

        [HttpGet("{id}")]
        public async Task<ActionResult<EnderecoDTO>> PutEndereco(int id)
        {
            var endereco = await _context.Enderecos
                .Where(e => e.Idendereco == id)
                .Select(e => new EnderecoDTO
                {
                    idEndereco = e.Idendereco,
                    idFornecedor = e.Idfornecedor,
                    Cep = e.Cep,
                    Logradouro = e.Logradouro,
                    Numero = e.Numero,
                    Complemento = e.Complemento,
                    Cidade = e.Cidade,
                    Bairro = e.Bairro,
                    Estado = e.Estado,
                    Pais = e.Pais,
                }).FirstOrDefaultAsync();

            if (endereco == null)
            {
                return BadRequest($"Endereço não encontrado.");
            }

            return Ok(endereco);
        }

        [HttpPost]
        public async Task<ActionResult<EnderecoDTO>> PostEndereco(EnderecoDTO dto)
        {
            var endereco = new Endereco
            {
                Idendereco = dto.idEndereco,
                Idfornecedor = dto.idFornecedor,
                Cep = dto.Cep,
                Logradouro = dto.Logradouro,
                Numero = dto.Numero,
                Complemento = dto.Complemento,
                Cidade = dto.Cidade,
                Bairro = dto.Bairro,
                Estado = dto.Estado,
                Pais = dto.Pais,
            };

            if (dto.idFornecedor == 0 || dto.Cep == null || dto.Logradouro == null || dto.Numero == null || dto.Cidade == null || dto.Bairro == null || dto.Estado == null || dto.Pais == null)
            {
                return BadRequest($"Os atributos devem estar preenchidos");
            }

            if (!dto.Cep.All(char.IsDigit) || dto.Cep.Length != 8){
                return BadRequest($"O cep deve conter 8 digitos");
            } 

            _context.Enderecos.Add(endereco);

            await _context.SaveChangesAsync();

            var response = new Endereco
            {
                Idendereco = dto.idEndereco,
                Idfornecedor = dto.idFornecedor,
                Cep = dto.Cep,
                Logradouro = dto.Logradouro,
                Numero = dto.Numero,
                Complemento = dto.Complemento,
                Cidade = dto.Cidade,
                Bairro = dto.Bairro,
                Estado = dto.Estado,
                Pais = dto.Pais,
            };

            return CreatedAtAction(
                nameof(GetEnderecos),
                new { id = endereco.Idendereco },
                response);
        } // Fim do método PostEndereco

        [HttpPut("{id}")]
        public async Task<ActionResult<EnderecoDTO>> PutEndereco(int id, EnderecoDTO dto)
        {
            var endereco = await _context.Enderecos
                .FirstOrDefaultAsync(e => e.Idendereco == id);

            if (endereco == null)
            {
                return BadRequest($"Endereço não encontrado.");
            }

            endereco.Idendereco = dto.idEndereco;
            endereco.Idfornecedor = dto.idFornecedor;
            endereco.Cep = dto.Cep;
            endereco.Logradouro = dto.Logradouro;
            endereco.Numero = dto.Numero;
            endereco.Complemento = dto.Complemento;
            endereco.Cidade = dto.Cidade;
            endereco.Bairro = dto.Bairro;
            endereco.Estado = dto.Estado;
            endereco.Pais = dto.Pais;


            if (dto.idFornecedor == 0 || dto.Cep == null || dto.Logradouro == null || dto.Numero == null || dto.Cidade == null || dto.Bairro == null || dto.Estado == null || dto.Pais == null)
            {
                return BadRequest($"Os atributos devem estar preenchidos");
            }

            if (!dto.Cep.All(char.IsDigit) || dto.Cep.Length != 8)
            {
                return BadRequest($"O cep deve conter 8 digitos");
            }


            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<EnderecoDTO>> DeleteEndereco(int id)
        {
            var endereco = await _context.Enderecos
                .FirstOrDefaultAsync(e => e.Idendereco == id);

            if (endereco == null) 
            {
                return BadRequest($"Endereço não encontrado.");
            }

            _context.Enderecos.Remove(endereco);

            await _context.SaveChangesAsync();

            return NoContent();
        } // Fim do método DeleteEndereco
    }
}