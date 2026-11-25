using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Api_Almoxarifado.Models;
using Api_Almoxarifado.DTO;

namespace Api_Almoxarifado.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FornecedorController: ControllerBase
    {
        private readonly BdAlmoxarifadoContext _context;

        public FornecedorController(BdAlmoxarifadoContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<FornecedorDTO>> GetFornecedor()
        {
            var fornecedor = await _context.Fornecedors
                .FirstOrDefaultAsync();

            return null;
        }
    }
}
