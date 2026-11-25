using Api_Almoxarifado.Models;

namespace Api_Almoxarifado.DTO
{
    public class ItemDTO
    {
        public int idItem { get; set; }

        public int idCategoria { get; set; }

        public string descricaoItem { get; set; }

        public string Unidade { get; set; }

        public string statusIt { get; set; }

        public List<Estoque> Estoque { get; set; } = new();

        public string Categoria { get; set; }
    }
}