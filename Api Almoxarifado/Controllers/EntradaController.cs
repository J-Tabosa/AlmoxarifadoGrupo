using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Api_Almoxarifado.Models;
using Api_Almoxarifado.DTO;

namespace Api_Almoxarifado.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EntradaController: ControllerBase
    {
        private readonly BdAlmoxarifadoContext _context;

        public EntradaController(BdAlmoxarifadoContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<EntradaDTO>>> GetEntradas()
        {
            var entrada = await _context.Entrada
                .Select(e => new EntradaDTO
                {
                    idEntrada = e.Identrada,
                    idFornecedor = e.Idfornecedor,
                    idFuncionario = e.Idfuncionario,
                    NumLote = e.NumLote,
                    quantidadeE = e.QuantidadeE,
                    dataHoraE = e.DatahoraE,
                    tipoE = e.TipoE,
                    dataValidade = e.DataValidade,

                    nomeFornecedor = e.Fornecedor.NomeFo,
                    descricaoItem = e.Item.DescricaoItem,
                }).ToListAsync();

            if (entrada == null)
            {
                return BadRequest($"Entradas não encontradas.");
            }

            return Ok(entrada);
        } // Fim do método GetEntradas

        [HttpGet("{id}")]
        public async Task<ActionResult<EntradaDTO>> GetEntrada(int id)
        {
            var entrada = await _context.Entrada
                .Where(e => e.Identrada == id)
                .Select(e => new EntradaDTO
                {
                    idEntrada = e.Identrada,
                    idFornecedor = e.Idfornecedor,
                    idFuncionario = e.Idfuncionario,
                    idItem = e.Iditem,
                    NumLote = e.NumLote,
                    quantidadeE = e.QuantidadeE,
                    dataHoraE = e.DatahoraE,
                    tipoE = e.TipoE,
                    dataValidade = e.DataValidade,

                    nomeFornecedor = e.Fornecedor.NomeFo,
                    descricaoItem = e.Item.DescricaoItem,
                }).ToListAsync();

            if (entrada == null)
            {
                return BadRequest($"Entrada não encontrada.");
            }

            return Ok(entrada);
        } // Fim do método GetEntrada

        [HttpPost]
        public async Task<ActionResult<EntradaPostDTO>> PostEntrada(EntradaPostDTO dto)
        {
            if (dto.idFornecedor == 0 || dto.idFuncionario == 0 || dto.NumLote == null || dto.quantidadeE == 0 || dto.tipoE == null)
            {
                return BadRequest($"Preencha todos os atributos.");
            }

            var entrada = new Entradum
            {
                Identrada = dto.idEntrada,
                Iditem = dto.idItem,
                Idfornecedor = dto.idFornecedor,
                Idfuncionario = dto.idFuncionario,
                NumLote = dto.NumLote,
                QuantidadeE = dto.quantidadeE,
                DatahoraE = dto.dataHoraE,
                TipoE = dto.tipoE,
                DataValidade = dto.dataValidade
            };

            _context.Entrada.Add(entrada);

            await _context.SaveChangesAsync();

            return Ok(entrada);
        } // Fim do método PostEntrada

        [HttpPut("{id}")]
        public async Task<ActionResult<EntradaPostDTO>> PutEntrada(int id, EntradaPostDTO dto)
        {
            var entrada = await _context.Entrada
                .FirstOrDefaultAsync(e => e.Identrada == id);

            if (dto.idFornecedor == 0 || dto.idFuncionario == 0 || dto.NumLote == null || dto.quantidadeE == 0 || dto.tipoE == null)
            {
                return BadRequest($"Preencha todos os atributos.");
            }

            if (entrada == null)
            {
                return NotFound($"Entrada não encontrada.");
            }

            entrada.Identrada = dto.idEntrada;
            entrada.Idfornecedor = dto.idFornecedor;
            entrada.Iditem = dto.idItem;
            entrada.Idfuncionario = dto.idFuncionario;
            entrada.NumLote = dto.NumLote;
            entrada.QuantidadeE = dto.quantidadeE;
            entrada.DatahoraE = dto.dataHoraE;
            entrada.TipoE = dto.tipoE;
            entrada.DataValidade = dto.dataValidade;

            await _context.SaveChangesAsync();

            return NoContent();
        } // Fim do método PutEntrada

        [HttpDelete("{id}")]
        public async Task<ActionResult<EntradaPostDTO>> DeleteEntrada(int id)
        {
            var entrada = await _context.Entrada
                .FirstOrDefaultAsync(e => e.Identrada == id);

            if (entrada == null)
            {
                return BadRequest($"Entrada não encontrada.");
            }

            _context.Entrada.Remove(entrada);

            await _context.SaveChangesAsync();

            return NoContent();
        } // Fim do método DeleteEntrada
    }
}