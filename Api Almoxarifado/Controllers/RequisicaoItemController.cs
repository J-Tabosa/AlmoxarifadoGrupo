using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Api_Almoxarifado.Models;
using Api_Almoxarifado.DTO;

namespace Api_Almoxarifado.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RequisicaoItemController: ControllerBase
    {
        private readonly BdAlmoxarifadoContext _context;

        public RequisicaoItemController(BdAlmoxarifadoContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<List<RequisicaoItemDTO>>> GetRequisicoesItem()
        {
            var requisicaoitem = await _context.RequisicaoItems
                .Select(ri => new RequisicaoItemDTO
                {
                    idRequisicao = ri.Idrequisicao,
                    idItem = ri.Iditem,
                    quantidadeS = ri.QuantidadeS,

                    Item = new ItemPostDTO
                    {
                        idItem = ri.Iditem,
                        idCategoria = ri.Item.Idcategoria,
                        descricaoItem = ri.Item.DescricaoItem,
                        Unidade = ri.Item.Unidade,
                        statusIt = ri.Item.StatusIt
                    },

                    Requisicao = new RequisicaoPostDTO
                    {
                        idRequisicao = ri.Idrequisicao,
                        idFuncionario = ri.Requisicao.Idfuncionario,
                        datahoraS = ri.Requisicao.DatahoraS,
                        tipoS = ri.Requisicao.TipoS,
                        Justificativa = ri.Requisicao.Justificativa,
                    }
                }).ToListAsync();
            
            if (requisicaoitem == null)
            {
                return NotFound($"Nenhum item de Requisição encontrado.");
            }

            return Ok(requisicaoitem);

        } // Fim do método GetRequisicoes

        [HttpGet("{id}")]
        public async Task<ActionResult<RequisicaoItemDTO>> GetRequisicaoItem(int id)
        {
            var requisicaoitem = await _context.RequisicaoItems
                .Where(ri => ri.Idrequisicao == id)
                .Select(ri => new RequisicaoItemDTO
                {
                    idRequisicao = ri.Idrequisicao,
                    idItem = ri.Iditem,
                    quantidadeS = ri.QuantidadeS,

                    Item = new ItemPostDTO
                    {
                        idItem = ri.Iditem,
                        idCategoria = ri.Item.Idcategoria,
                        descricaoItem = ri.Item.DescricaoItem,
                        Unidade = ri.Item.Unidade,
                        statusIt = ri.Item.StatusIt
                    },

                    Requisicao = new RequisicaoPostDTO
                    {
                        idRequisicao = ri.Idrequisicao,
                        idFuncionario = ri.Requisicao.Idfuncionario,
                        datahoraS = ri.Requisicao.DatahoraS,
                        tipoS = ri.Requisicao.TipoS,
                        Justificativa = ri.Requisicao.Justificativa,
                    }
                }).ToListAsync();

            if (requisicaoitem == null)
            {
                return NotFound($"Nenhum item de Requisição encontrado.");
            }

            return Ok(requisicaoitem);
        } // fim do método GetRequisicaoItem

        [HttpPost]
        public async Task<ActionResult<RequisicaoItemPostDTO>> PostRequisicaoItem(RequisicaoItemPostDTO dto)
        {
            var requisicaoitem = new RequisicaoItem
            {
                Iditem = dto.idItem,
                Idrequisicao = dto.idRequisicao,
                QuantidadeS = dto.quantidadeS,
            };

            if (dto.idItem == 0 || dto.idRequisicao == 0 || dto.quantidadeS == 0)
            {
                return BadRequest($"Informe todos os atributos.");
            }

            var existe = await _context.RequisicaoItems
                .AnyAsync(ri => ri.Idrequisicao == dto.idRequisicao && ri.Iditem == dto.idItem);

            if (existe)
            {
                return Conflict("Esse item já existe nessa requisição.");
            }

            _context.RequisicaoItems.Add(requisicaoitem);

            await _context.SaveChangesAsync();

            var response = new RequisicaoItemPostDTO
            {
                idRequisicao = dto.idRequisicao,
                idItem = dto.idItem,
                quantidadeS = dto.quantidadeS,
            };

            return CreatedAtAction(
                nameof(GetRequisicoesItem),
                new { id = requisicaoitem.Idrequisicao },
                response);
        } // Fim do método PostRequisicaoItem

        [HttpPut("{idRequisicao}/{idItem}")]
        public async Task<ActionResult<RequisicaoItemPostDTO>> PutRequisicaoItem(int idRequisicao, int idItem, RequisicaoItemPostDTO dto)
        {
            if (dto.quantidadeS <= 0)
                return BadRequest("Informe a quantidade.");

            var requisicaoitem = await _context.RequisicaoItems
                .FirstOrDefaultAsync(ri => ri.Idrequisicao == idRequisicao && ri.Iditem == idItem);

            if (requisicaoitem == null)
                return NotFound("Item de Requisição não encontrado.");

            requisicaoitem.QuantidadeS = dto.quantidadeS;

            await _context.SaveChangesAsync();

            return NoContent();
        } // Fim do método PutRequisicaoItem

        [HttpDelete("{idRequisicao}/{idItem}")]
        public async Task<IActionResult> DeleteRequisicaoItem(int idRequisicao, int idItem)
        {
            var requisicaoitem = await _context.RequisicaoItems
                .FirstOrDefaultAsync(ri => ri.Idrequisicao == idRequisicao
                                        && ri.Iditem == idItem);

            if (requisicaoitem == null)
            {
                return NotFound("Item de Requisição não encontrado.");
            }

            _context.RequisicaoItems.Remove(requisicaoitem);
            await _context.SaveChangesAsync();

            return NoContent();
        } // Fim do método DeleteRequisicaoItem
    }
}