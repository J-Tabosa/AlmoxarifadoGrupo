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
                .FirstOrDefaultAsync();

            return Ok(endereco);
        } // Fim do método GetEnderecos

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
                return BadRequest($"O cep deve cconter apenas digitos");
            } 

            _context.Enderecos.Add(endereco);

            await _context.SaveChangesAsync();

            
        }
    }
}
/*
 public async Task<ActionResult<CategoriumDTO>> PostCategoria(CategoriumDTO dto)
        {
            var categoria = new Categorium
            {
                Idcategoria = dto.idCategoria,
                Tipo = dto.Tipo
            };

            if (dto.Tipo == null)
            {
                return BadRequest($"Os atributos devem ser preenchidos.");
            }

            _context.Categoria.Add(categoria);

            await _context.SaveChangesAsync();

            var response = new CategoriumDTO
            {
                idCategoria = dto.idCategoria,
                Tipo = dto.Tipo
            };

            return CreatedAtAction(
                nameof(GetCategorias),
                new {id = categoria.Idcategoria,
                response});
        } // Fim do método PostCategoria
 */