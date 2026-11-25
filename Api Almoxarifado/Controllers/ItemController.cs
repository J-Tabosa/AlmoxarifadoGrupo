using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Api_Almoxarifado.Models;
using Api_Almoxarifado.DTO;
using Pomelo.EntityFrameworkCore.MySql.Query.Internal;

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
        /*
          Funcionarios = s.Funcionarios.Select(s => new Funcionario
                    {
                        Idfuncionario = s.Idfuncionario,
                        Idsetor = s.Idsetor,
                        NomeFu = s.NomeFu,
                        Cargo = s.Cargo,
                        StatusFu = s.StatusFu,
                        Senha = s.Senha,
                    }).ToList()

         nomeSetor = f.Setor != null ? f.Setor.NomeSetor : null
         */

        [HttpGet]
        public async Task<ActionResult<ItemDTO>> GetItens()
        {
            var item = await _context.Items
                .Select(i => new ItemDTO
                {
                    idItem = i.Iditem,
                    idCategoria = i.Idcategoria,
                    descricaoItem = i.DescricaoItem,
                    Unidade = i.Unidade,
                    statusIt = i.StatusIt,

                    Categoria = i.

                }).ToListAsync();

            return Ok(item);
        } // Fim do método GetItens

        [HttpGet("{id}")]
        public async Task<ActionResult<ItemDTO>> GetItem()
        {


            return null;
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

    }
}