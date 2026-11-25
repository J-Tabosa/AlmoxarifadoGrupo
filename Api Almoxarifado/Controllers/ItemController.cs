using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Api_Almoxarifado.Models;
using Api_Almoxarifado.DTO;
using Pomelo.EntityFrameworkCore.MySql.Query.Internal;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.OpenApi.Writers;

namespace Api_Almoxarifado.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ItemController : ControllerBase
    {
        private readonly BdAlmoxarifadoContext _context;

        public ItemController(BdAlmoxarifadoContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ItemDTO>>> GetItens()
        {
            var item = await _context.Items
                .Select(i => new ItemDTO
                {
                    idItem = i.Iditem,
                    idCategoria = i.Idcategoria,
                    descricaoItem = i.DescricaoItem,
                    Unidade = i.Unidade,
                    statusIt = i.StatusIt,

                    Categoria = i.Categoria != null ? i.Categoria.Tipo : null,

                    Estoque = i.Estoques.Select(e => new Estoque
                    {
                        Iditem = e.Iditem,
                        Idlocalizacao = e.Idlocalizacao,
                        Saldo = e.Saldo,
                    }).ToList()

                }).ToListAsync();

            return Ok(item);
        } // Fim do método GetItens

        [HttpGet("{id}")]
        public async Task<ActionResult<ItemDTO>> GetItem(int id)
        {
            var item = await _context.Items
                .Where(i => i.Iditem == id)
                .Select(i => new ItemDTO
                {
                    idItem = i.Iditem,
                    idCategoria = i.Idcategoria,
                    descricaoItem = i.DescricaoItem,
                    Unidade = i.Unidade,
                    statusIt = i.StatusIt,

                    Categoria = i.Categoria != null ? i.Categoria.Tipo : null,

                    Estoque = i.Estoques.Select(e => new Estoque
                    {
                        Iditem = e.Iditem,
                        Idlocalizacao = e.Idlocalizacao,
                        Saldo = e.Saldo,
                    }).ToList()

                }).ToListAsync();

            return Ok(item);
        }

        [HttpPost]
        public async Task<ActionResult<ItemDTO>> ItemPost(ItemPostDTO dto)
        {
            var item = new Item
            {
                Iditem = dto.idItem,
                Idcategoria = dto.idCategoria,
                DescricaoItem = dto.descricaoItem,
                Unidade = dto.Unidade,
                StatusIt = dto.statusIt,
            };

            if (dto.statusIt == null || dto.idCategoria == 0 || dto.descricaoItem == null || dto.Unidade == null)
            {
                return BadRequest($"Todos atributos devem ser preenchidos.");
            }

            _context.Items.Add(item);

            await _context.SaveChangesAsync();

            var response = new ItemPostDTO
            {
                idItem = dto.idItem,
                idCategoria = dto.idCategoria,
                descricaoItem = dto.descricaoItem,
                Unidade = dto.Unidade,
                statusIt = dto.statusIt,
            };

            return CreatedAtAction(
                nameof(GetItens),
                new
                {
                    id = item.Iditem,
                    response
                });
        } // Fim do método Post

        [HttpPut("{id}")]
        public async Task<ActionResult<ItemDTO>> PutItem(ItemDTO dto, int id)
        {
            var item = await _context.Items
                .FirstOrDefaultAsync(i => i.Iditem == id);

            if (item == null)
            {
                return NotFound($"Item não encontrado.");
            }

            item.Iditem = dto.idItem;
            item.Idcategoria = dto.idCategoria;
            item.DescricaoItem = dto.descricaoItem;
            item.Unidade = dto.Unidade;
            item.StatusIt = dto.statusIt;

            await _context.SaveChangesAsync();

            return NoContent();
        } // Fim do método PutItem

        [HttpDelete("{id}")]
        public async Task<ActionResult<ItemDTO>> DeleteItem(int id)
        {
            var item = await _context.Items
                .FirstOrDefaultAsync(i => i.Iditem == id);

            if (item == null)
            {
                return NotFound($"Item não encontrado.");
            }

            _context.Items.Remove(item);

            await _context.SaveChangesAsync();

            return NoContent();
        } // Fim do método DeleteItem

    } // Fim do da controller ItemController

} // Fim do NameSpace