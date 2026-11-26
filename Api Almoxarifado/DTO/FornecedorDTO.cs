using Api_Almoxarifado.Models;

namespace Api_Almoxarifado.DTO
{
    public class FornecedorDTO
    {
        public int idFornecedor { get; set; }

        public string Contato { get; set; }

        public string nomeFo {  get; set; }

        public string Cnpj { get; set; }

        public string statusFo { get; set; }

        public List<Endereco> Endereco { get; set; } = new ();
    }
}