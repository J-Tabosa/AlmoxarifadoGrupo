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
            var fornecedor = await _context.Fornecedors.Select(f => new FornecedorDTO
            {
                idFornecedor = f.Idfornecedor,
                Contato = f.Contato,
                nomeFo = f.NomeFo,
                Cnpj = f.Cnpj,
                statusFo = f.StatusFo,
                idEndereco = f.Idendereco,

                Endereco = f.Endereco.(e => new Endereco
                {

                }).tolist()
            }).FirstOrDefaultAsync();

            return Ok(fornecedor);
        }
    }
}
/*      public int idFornecedor { get; set; }

        public int idEndereco { get; set; }

        public string Contato { get; set; }

        public string nomeFo {  get; set; }

        public string Cnpj { get; set; }

        public string statusFo { get; set; }

        public List<Endereco> Endereco { get; set; } = new ();
    }
}
 */