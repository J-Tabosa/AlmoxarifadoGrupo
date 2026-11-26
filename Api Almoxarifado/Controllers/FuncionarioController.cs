using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Api_Almoxarifado.Models;
using Api_Almoxarifado.DTO;

namespace Api_Almoxarifado.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FuncionarioController: ControllerBase
    {
        private readonly BdAlmoxarifadoContext _context;

        public FuncionarioController(BdAlmoxarifadoContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<FuncionarioDTO>>> GetFuncionarios()
        {
            var funcionario = await _context.Funcionarios
                .Select(f => new FuncionarioDTO
                {
                    idFuncionario = f.Idfuncionario,
                    idSetor = f.Idsetor,
                    nomeFu = f.NomeFu,
                    Cargo = f.Cargo,
                    Senha = f.Senha,
                    statusFu = f.StatusFu,

                    nomeSetor = f.Setor != null ? f.Setor.NomeSetor : null

                }).ToListAsync();

            return Ok(funcionario);
        } // Fim do método GetAll

        [HttpGet("{id}")]
        public async Task<ActionResult<FuncionarioDTO>> GetFuncionario(int id)
        {
            var funcionario = await _context.Funcionarios
                .Where(f => f.Idfuncionario == id)
                .Select(f => new FuncionarioDTO
                {
                    idFuncionario = f.Idfuncionario,
                    idSetor = f.Idsetor,
                    nomeFu = f.NomeFu,
                    Cargo = f.Cargo,
                    Senha = f.Senha,
                    statusFu = f.StatusFu,

                    nomeSetor = f.Setor != null ? f.Setor.NomeSetor : null
                }).ToListAsync();

            if (funcionario == null)
            {
                return NotFound($"Funcionario não encontrado.");
            }

            return Ok(funcionario);
        } // Fim do método GetFuncionario

        [HttpPost]
        public async Task<ActionResult<FuncionarioPostDTO>> PostFuncionario(FuncionarioPostDTO dto)
        {
            var funcionario = new Funcionario
            {
                Idfuncionario = dto.idFuncionario,
                Idsetor = dto.idSetor,
                NomeFu = dto.nomeFu,
                Cargo = dto.Cargo,
                StatusFu = dto.statusFu,
                Senha = dto.Senha,
            };

            if (dto.Senha.Length < 8 || dto.Senha.Length > 20)
            {
                return BadRequest($"A senha deve ter no mínimo 8 e no máximo 20 caractéres.");
            }

            if (dto.nomeFu == null || dto.Senha == null || dto.Cargo == null || dto.statusFu == null || dto.idSetor == 0)
            {
                return BadRequest($"Todos os atributos devem ser preenchidos.");
            }

            _context.Funcionarios.Add( funcionario );

            await _context.SaveChangesAsync();

            var response = new FuncionarioPostDTO
            {
                idFuncionario = dto.idFuncionario,
                idSetor = dto.idSetor,
                nomeFu = dto.nomeFu,
                Cargo = dto.Cargo,
                statusFu = dto.statusFu,
                Senha = dto.Senha,
            };

            return CreatedAtAction(
                nameof(GetFuncionarios),
                new {id = funcionario.Idfuncionario,
                response});
        } // Fim do método PostFuncionario

        [HttpPut("{id}")]
        public async Task<ActionResult<FuncionarioDTO>> PutFuncionario(FuncionarioDTO dto, int id)
        {
            var funcionario = await _context.Funcionarios
                .FirstOrDefaultAsync(f => f.Idfuncionario == id);

            if (funcionario == null)
            {
                NotFound($"Funcionário não encontrado.");
            }

            funcionario.Idfuncionario = dto.idFuncionario;
            funcionario.Idsetor = dto.idSetor;
            funcionario.NomeFu = dto.nomeFu;
            funcionario.Cargo = dto.Cargo;
            funcionario.StatusFu = dto.statusFu;
            funcionario.Senha = dto.Senha;

            if (dto.nomeFu == null || dto.idSetor == 0 || dto.Cargo == null || dto.statusFu == null || dto.Senha == null || dto.idFuncionario == 0)
            {
                return BadRequest($"Os campos não devem estar vazios.");
            }

            if(dto.Senha.Length < 8 || dto.Senha.Length > 20)
            {
                return BadRequest($"A senha deve ter no mínimo 8 e no máximo 20 caractéres.");
            }

            await _context.SaveChangesAsync();


            return NoContent();
        } // Fim do método PutFuncionario

        [HttpDelete("{id}")]
        public async Task<ActionResult<FuncionarioPostDTO>> DeleteFuncionario(int id)
        {
            var funcionario = await _context.Funcionarios
                .FirstOrDefaultAsync(f => f.Idfuncionario == id);

            if (funcionario == null) 
            { 
                return BadRequest($"Este funcionário não existe"); 
            }

            _context.Funcionarios.Remove(funcionario);

            await _context.SaveChangesAsync();

            return NoContent(); 
        } // Fim do método Delete
    }
}
