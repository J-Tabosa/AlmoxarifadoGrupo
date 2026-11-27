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
        public async Task<ActionResult<RequisicaoItemDTO>> GetRequisicoesItem()
        {
            var requisicaoitem = await _context.RequisicaoItems
                .Select(ri => new RequisicaoItemDTO
                {
                    idrequisicao = ri.Idrequisicao,
                    iditem = ri.Iditem,
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
                        idrequisicao = ri.Idrequisicao,
                        idfuncionario = ri.Requisicao.Idfuncionario,
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
                    idrequisicao = ri.Idrequisicao,
                    iditem = ri.Iditem,
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
                        idrequisicao = ri.Idrequisicao,
                        idfuncionario = ri.Requisicao.Idfuncionario,
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
    }
}