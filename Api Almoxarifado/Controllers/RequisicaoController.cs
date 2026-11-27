using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Api_Almoxarifado.Models;
using Api_Almoxarifado.DTO;

namespace Api_Almoxarifado.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RequisicaoController: ControllerBase
    {
        private readonly BdAlmoxarifadoContext _context;

        public RequisicaoController(BdAlmoxarifadoContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<RequisicaoDTO>> GetRequisicoes()
        {
            var requisicao = await _context.Requisicaos
                .Include(r => r.RequisicaoItems)
                .Select(r => new RequisicaoDTO
                {
                    idrequisicao = r.Idrequisicao,
                    idfuncionario = r.Idfuncionario,
                    datahoraS = r.DatahoraS,
                    Justificativa = r.Justificativa,
                    tipoS = r.TipoS,

                    RequisicaoItems = r.RequisicaoItems.Select(ri => new RequisicaoItemDTO
                    {
                        iditem = ri.Iditem,
                        idrequisicao = ri.Idrequisicao,
                        quantidadeS = ri.QuantidadeS,

                        Item = new ItemPostDTO {
                            idItem = ri.Iditem,
                            idCategoria = ri.Item.Idcategoria,
                            descricaoItem = ri.Item.DescricaoItem,
                            Unidade = ri.Item.Unidade,
                            statusIt = ri.Item.StatusIt,
                        }
                    }).ToList()
                }).ToListAsync();

            if (requisicao == null)
            {
                return BadRequest($"Nenhuma requisição feita.");
            }

            return Ok(requisicao);
        } // Fim do método GetRequisicoes

        [HttpGet("{id}")]
        public async Task<ActionResult<RequisicaoDTO>> GetRequisicao(int id)
        {
            var requisicao = await _context.Requisicaos
                .Where(r => r.Idrequisicao == id)
                .Include(r => r.RequisicaoItems)
                .Select(r => new RequisicaoDTO
                {
                    idrequisicao = r.Idrequisicao,
                    idfuncionario = r.Idfuncionario,
                    datahoraS = r.DatahoraS,
                    Justificativa = r.Justificativa,
                    tipoS = r.TipoS,

                    RequisicaoItems = r.RequisicaoItems.Select(ri => new RequisicaoItemDTO
                    {
                        iditem = ri.Iditem,
                        idrequisicao = ri.Idrequisicao,
                        quantidadeS = ri.QuantidadeS,

                        Item = new ItemPostDTO
                        {
                            idItem = ri.Iditem,
                            idCategoria = ri.Item.Idcategoria,
                            descricaoItem = ri.Item.DescricaoItem,
                            Unidade = ri.Item.Unidade,
                            statusIt = ri.Item.StatusIt,
                        }
                    }).ToList()
                }).ToListAsync();

            if (requisicao == null)
            {
                return BadRequest($"Requisição não encontrada.");
            }

            return Ok(requisicao);
        } // Fim do método GetRequisicao

        [HttpPost]
        public async Task<ActionResult<RequisicaoPostDTO>> PostRequisicao(RequisicaoPostDTO dto)
        {
            var requisicao = new Requisicao
            {
                Idrequisicao = dto.idrequisicao,
                Idfuncionario = dto.idfuncionario,
                DatahoraS = dto.datahoraS,
                Justificativa = dto.Justificativa,
                TipoS = dto.tipoS,
            };

            if (dto.idfuncionario == 0)
            {
                return BadRequest($"O funcionário deve ser informado.");
            } 
            if  (dto.Justificativa == null)
            {
                return BadRequest($"Justifique a requisição.");
            }
            if (dto.tipoS == null)
            {
                return BadRequest($"Informe o tipo da requisição.");
            }

            _context.Requisicaos.Add(requisicao);

            await _context.SaveChangesAsync();

            return Ok(dto);
        } // Fim do método PostRequisicao

        [HttpPut("{id}")]
        public async Task<ActionResult<RequisicaoPostDTO>> PutRequisicao(int id, RequisicaoPostDTO dto)
        {
            var requisicao = await _context.Requisicaos
                .FirstOrDefaultAsync(r => r.Idrequisicao == id);

            if (requisicao == null)
            {
                return BadRequest($"Requisição não encontrada.");
            }

            requisicao.Idrequisicao = dto.idrequisicao;
            requisicao.Idfuncionario = dto.idfuncionario;
            requisicao.DatahoraS = dto.datahoraS;
            requisicao.Justificativa = dto.Justificativa;
            requisicao.TipoS = dto.tipoS;

            if (dto.idfuncionario == 0)
            {
                return BadRequest($"O funcionário deve ser informado.");
            }
            if (dto.Justificativa == null)
            {
                return BadRequest($"Justifique a requisição.");
            }
            if (dto.tipoS == null)
            {
                return BadRequest($"Informe o tipo da requisição.");
            }

            await _context.SaveChangesAsync();

            return NoContent();
        } // Fim do método PutRequisicao

        [HttpDelete("{id}")]
        public async Task<ActionResult<RequisicaoPostDTO>> DeleteRequisicao(int id)
        {
            var requisicao = await _context.Requisicaos
                .FirstOrDefaultAsync(r => r.Idrequisicao == id);

            if ( requisicao == null)
            {
                return BadRequest($"Requisição não encontrada.");
            }

            _context.Requisicaos.Remove(requisicao);

            await _context.SaveChangesAsync();

            return NoContent();
        } // Fim do método DeleteRequisicao
    }
}