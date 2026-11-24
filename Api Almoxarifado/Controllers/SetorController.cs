using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Api_Almoxarifado.Models;
using Api_Almoxarifado.DTO;

namespace Api_Almoxarifado.Controllers
{

    [Route("api/[controller]")]
    [ApiController]
    public class SetorController : ControllerBase
    {
        private readonly BdAlmoxarifadoContext _context;

        public SetorController(BdAlmoxarifadoContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Setor>>> GetSetores()
        {
            var setor = await _context.Setors
                .Select(s => new Setor
                {
                    Idsetor = s.Idsetor,
                    NomeSetor = s.NomeSetor,

                    Funcionarios = s.Funcionarios.Select(s => new Funcionario
                    {
                        Idfuncionario = s.Idfuncionario,
                        Idsetor = s.Idsetor,
                        NomeFu = s.NomeFu,
                        Cargo = s.Cargo,
                        StatusFu = s.StatusFu,
                        Senha = s.Senha,
                    }).ToList()
                }).ToListAsync();

            return Ok(setor);
        } // Fim do método GetSetores

        [HttpGet("{id}")]
        public async Task<ActionResult<SetorPostDTO>> GetSetor(int id)
        {
            var setor = await _context.Setors
                .Where(s => s.Idsetor == id)
                .Select(s => new SetorPostDTO
                {
                    idSetor = s.Idsetor,
                    NomeSetor = s.NomeSetor,
                }).FirstOrDefaultAsync();

            return Ok(setor);
        } // Fim do método GetSetorirstOrDefaultAsync();

        [HttpPost]
        public async Task<ActionResult<SetorPostDTO>> PostSetor(SetorPostDTO dto)
        {
            var setor = new Setor
            {
                Idsetor = dto.idSetor,
                NomeSetor = dto.NomeSetor
            };

            if(string.IsNullOrWhiteSpace(dto.NomeSetor) )
            {
                return BadRequest("Informe o nome do setor corretamente.");
            }

            _context.Setors.Add(setor);

            await _context.SaveChangesAsync();

            var response = new SetorPostDTO
            {
                idSetor = dto.idSetor,
                NomeSetor = dto.NomeSetor
            };

            return CreatedAtAction(
                nameof(GetSetores),
                new {id = setor.Idsetor, 
                response });
        } // Fim do método PostSetor

        [HttpPut("{id}")]
        public async Task<ActionResult<SetorPostDTO>> PutSetor(int id, SetorPostDTO dto)
        {
            var setor = await _context.Setors
                .FirstOrDefaultAsync(s => s.Idsetor == id);

            if(setor == null)
            {
                NotFound($"Setor não encontrado.");
            }

            setor.Idsetor = dto.idSetor;
            setor.NomeSetor = dto.NomeSetor;

            await _context.SaveChangesAsync();

            return NoContent();
        } // Fim do método Put

        [HttpDelete("{id}")]
        public async Task<ActionResult<SetorPostDTO>> DeleteSetor(int id)
        {
            var setor = await _context.Setors
                .FirstOrDefaultAsync(s => s.Idsetor == id);

            if(setor == null)
            {
                return NotFound($"Setor não encontrado.");
            }

            _context.Setors.Remove(setor);

            await _context.SaveChangesAsync();

            return NoContent();
        } // Fim do método DeleteSetor
    }
}
