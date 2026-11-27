using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Api_Almoxarifado.Models;
using Api_Almoxarifado.DTO;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Formatters;

namespace Api_Almoxarifado.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EstoqueController : ControllerBase
    {
        private readonly BdAlmoxarifadoContext _context;

        public EstoqueController(BdAlmoxarifadoContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<EstoqueDTO>>> GetEstoques()
        {
            var estoque = await _context.Estoques
                .Select(e => new EstoqueDTO
                {
                    idItem = e.Iditem,
                    idLocalizacao = e.Idlocalizacao,
                    Saldo = e.Saldo,
                    eMaximo = e.EMaximo,
                    eMinimo = e.EMinimo,

                    Item = new ItemPostDTO
                    {
                        idItem = e.Iditem,
                        idCategoria = e.Item.Idcategoria,
                        descricaoItem = e.Item.DescricaoItem,
                        Unidade = e.Item.Unidade,
                        statusIt = e.Item.StatusIt,
                    },

                    Localizacao = new LocalizacaoDTO
                    {
                        idLocalizacao = e.Idlocalizacao,
                        Sala = e.Localizacao.Sala,
                        Andar = e.Localizacao.Andar,
                        Posicao = e.Localizacao.Posicao,
                        statusL = e.Localizacao.StatusL,
                        descricaoL = e.Localizacao.DescricaoL,
                    }
                }).ToListAsync();

            return Ok(estoque);
        } // Fim do método GetEstoques

        [HttpGet("{idItem}/{idLocalizacao}")]
        public async Task<ActionResult<EstoqueDTO>> GetEstoque(int idItem, int idLocalizacao)
        {
            var estoque = await _context.Estoques
                .Where(e => e.Iditem == idItem && e.Idlocalizacao == idLocalizacao)
                .Select(e => new EstoqueDTO
                {
                    idItem = e.Iditem,
                    idLocalizacao = e.Idlocalizacao,
                    Saldo = e.Saldo,
                    eMaximo = e.EMaximo,
                    eMinimo = e.EMinimo,

                    Item = new ItemPostDTO
                    {
                        idItem = e.Iditem,
                        idCategoria = e.Item.Idcategoria,
                        descricaoItem = e.Item.DescricaoItem,
                        Unidade = e.Item.Unidade,
                        statusIt = e.Item.StatusIt,
                    },

                    Localizacao = new LocalizacaoDTO
                    {
                        idLocalizacao = e.Idlocalizacao,
                        Sala = e.Localizacao.Sala,
                        Andar = e.Localizacao.Andar,
                        Posicao = e.Localizacao.Posicao,
                        statusL = e.Localizacao.StatusL,
                        descricaoL = e.Localizacao.DescricaoL,
                    }
                }).FirstOrDefaultAsync();

            if (estoque == null)
            {
                return BadRequest($"Estoque não encontrado.");
            }

            return Ok(estoque);
        } // Fim do método GetEstoque

        [HttpPost]
        public async Task<ActionResult<EstoquePostDTO>> PostEstoque(EstoquePostDTO dto)
        {
            var estoque = new Estoque
            {
                Iditem = dto.idItem,
                Idlocalizacao = dto.idLocalizacao,
                Saldo = dto.Saldo,
                EMaximo = dto.eMaximo,
                EMinimo = dto.eMinimo,
            };

            if (dto.eMinimo == 0 || dto.eMaximo == 0 || dto.idLocalizacao == 0 || dto.idItem == 0)
            {
                return BadRequest($"Todos os campos devem ser preenchidos");
            }

            _context.Estoques.Add(estoque);

            await _context.SaveChangesAsync();

            var response = new EstoquePostDTO
            {
                idItem = dto.idItem,
                idLocalizacao = dto.idLocalizacao,
                Saldo = dto.Saldo,
                eMaximo = dto.eMaximo,
                eMinimo = dto.eMinimo,
            };

            return CreatedAtAction(
                nameof(GetEstoques),
                new { id = estoque.Iditem, estoque.Idlocalizacao },
                response);
        } // Fim do método PostEstoque

        [HttpPut("{idItem}/{idLocalizacao}")]
        public async Task<ActionResult<EstoquePostDTO>> PutEstoque(int idItem, int idLocalizacao, EstoquePostDTO dto)
        {
            var estoque = await _context.Estoques
                .FirstOrDefaultAsync(e => e.Iditem == idItem && e.Idlocalizacao == idLocalizacao);

            if (estoque == null)
            {
                return NotFound($"Estoque não encontrado.");
            }

            estoque.Iditem = dto.idItem;
            estoque.Idlocalizacao = dto.idLocalizacao;
            estoque.Saldo = dto.Saldo;
            estoque.EMaximo = dto.eMaximo;
            estoque.EMinimo = dto.eMinimo;

            if (dto.eMinimo == 0 || dto.eMaximo == 0 || dto.idLocalizacao == 0 || dto.idItem == 0)
            {
                return BadRequest($"Todos os campos devem ser preenchidos");
            }

            await _context.SaveChangesAsync();

            return NoContent();
        } // Fim do método PutEstoque

        [HttpDelete("{idItem}/{idLocalizacao}")]
        public async Task<ActionResult<EstoquePostDTO>> DelteEstoque(int idItem, int idLocalizacao)
        {
            var estoque = await _context.Estoques
                .FirstOrDefaultAsync(e => e.Iditem == idItem && e.Idlocalizacao == idLocalizacao);

            if (estoque == null)
            {
                return NotFound($"Estoque não encontrado.");
            }

            _context.Estoques.Remove(estoque);

            await _context.SaveChangesAsync();  

            return NoContent();
        } // Fim do método DeleteEstoque
    }
}
