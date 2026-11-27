using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Api_Almoxarifado.Models;
using Api_Almoxarifado.DTO;

namespace Api_Almoxarifado.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class LocalizacaoController: ControllerBase
    {
        private readonly BdAlmoxarifadoContext _context;

        public LocalizacaoController(BdAlmoxarifadoContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<LocalizacaoDTO>> GetLocalizacoes()
        {
            var localizacao = await _context.Localizacaos
                .Select(l => new LocalizacaoDTO
                {
                    idLocalizacao = l.Idlocalizacao,
                    Andar = l.Andar,
                    Sala = l.Sala,
                    Posicao = l.Posicao,
                    statusL = l.StatusL,
                    descricaoL = l.DescricaoL,
                }).ToListAsync();

            if (localizacao == null)
            {
                return NotFound($"Localizações não encontradas.");
            }

            return Ok(localizacao);
        } // Fim do método GetLocalizacoes

        [HttpGet("{id}")]
        public async Task<ActionResult<LocalizacaoDTO>> GetLocalizacao(int id)
        {
            var localizacao = await _context.Localizacaos
                .FirstOrDefaultAsync(l => l.Idlocalizacao == id);

            if (localizacao == null)
            {
                return NotFound($"Localização não encontrada.");
            }

            return Ok(localizacao);
        } // Fim do método GetLocalizacao

        [HttpPost]
        public async Task<ActionResult<LocalizacaoDTO>> PostLocalizacao(LocalizacaoDTO dto)
        {
            var localizacao = new Localizacao
            {
                Idlocalizacao = dto.idLocalizacao,
                Andar = dto.Andar,
                Sala = dto.Sala,
                Posicao = dto.Posicao,
                StatusL = dto.statusL,
                DescricaoL = dto.descricaoL,
            };

            if (dto.idLocalizacao == 0 || dto.Andar == null || dto.Sala == null || dto.Posicao == null || dto.statusL == null)
            {
                return BadRequest($"Preencha todos os campos ");
            }

            _context.Localizacaos.Add(localizacao);

            await _context.SaveChangesAsync();

            var response = new LocalizacaoDTO
            {
                idLocalizacao = dto.idLocalizacao,
                Andar = dto.Andar,
                Sala= dto.Sala,
                Posicao = dto.Posicao,
                statusL = dto.statusL,
                descricaoL = dto.descricaoL,
            };

            return CreatedAtAction(
                nameof(GetLocalizacoes),
                new {id = localizacao.Idlocalizacao},
                response);
        } // Fim do método PostLocalizacao

        [HttpDelete("{id}")]
        public async Task<ActionResult<LocalizacaoDTO>> DeleteLocalizacao(int id)
        {
            var localizacao = await _context.Localizacaos
                .FirstOrDefaultAsync(l => l.Idlocalizacao == id);

            if (localizacao == null)
            {
                return NotFound($"Localização não encontrada.");
            }

            _context.Localizacaos.Remove(localizacao);

            await _context.SaveChangesAsync();

            return NoContent();
        } // Fim do método DeleteLocalizacao
    }
}