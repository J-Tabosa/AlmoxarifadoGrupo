using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Api_Almoxarifado.Models;
using Api_Almoxarifado.DTO;

namespace Api_Almoxarifado.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CategoriumController : ControllerBase
    {
        private readonly BdAlmoxarifadoContext _context;

        public CategoriumController(BdAlmoxarifadoContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<CategoriumDTO>> GetAll()
        {
            var categoria = await _context.Categoria.FirstOrDefaultAsync();

            return Ok(categoria);
        } // Fim do método GetAll

        [HttpGet("{id}")]
        public async Task<ActionResult<CategoriumDTO>> GetCategoria(int id)
        {
            var categoria = await _context.Categoria
                .Where(c => c.Idcategoria == id)
                .Select(c => new CategoriumDTO
                {
                    idCategoria = c.Idcategoria,
                    Tipo = c.Tipo
                }).ToListAsync();

            return Ok(categoria);
        } // Fim do método GetCategoria

        [HttpPost]
        public async Task<ActionResult<CategoriumDTO>> PostCategoria(CategoriumDTO dto)
        {
            var categoria = new Categorium
            {
                Idcategoria = dto.idCategoria,
                Tipo = dto.Tipo
            };

            if (dto.Tipo == null)
            {
                return BadRequest($"Os atributos devem ser preenchidos.");
            }

            _context.Categoria.Add(categoria);

            await _context.SaveChangesAsync();

            var response = new CategoriumDTO
            {
                idCategoria = dto.idCategoria,
                Tipo = dto.Tipo
            };

            return CreatedAtAction(
                nameof(GetAll),
                new {id = categoria.Idcategoria,
                response});
        } // Fim do método PostCategoria

        [HttpPut("{id}")]
        public async Task<ActionResult<CategoriumDTO>> PutCategoria(CategoriumDTO dto, int id)
        {
            var categoria = await _context.Categoria
                .FirstOrDefaultAsync(c => c.Idcategoria == id);

            if (categoria == null)
            {
                return NotFound($"Categoria não encontrada.");
            }

            categoria.Idcategoria = dto.idCategoria;
            categoria.Tipo = dto.Tipo;

            if(dto.Tipo == null)
            {
                return BadRequest($"Os atributos devem ser preenchindos.");
            }

            await _context.SaveChangesAsync();

            return NoContent();
        } // Fim do método PostCategoria

        [HttpDelete("{id}")]
        public async Task<ActionResult<CategoriumDTO>> Delete(int id)
        {
            var categoria = await _context.Categoria
                .FirstOrDefaultAsync(c => c.Idcategoria == id);

            if (categoria == null)
            {
                return NotFound($"Categoria não encontrada.");
            }

            _context.Categoria.Remove(categoria);

            await _context.SaveChangesAsync();

            return NoContent();
        } // Fim do método Delete
    }
}