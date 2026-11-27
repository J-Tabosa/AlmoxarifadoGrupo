using Api_Almoxarifado.Models;

namespace Api_Almoxarifado.DTO
{
    public class EstoqueDTO
    {
        public int idItem { get; set; }

        public int idLocalizacao { get; set; }

        public uint Saldo { get; set;}

        public int eMinimo { get; set;}

        public int eMaximo { get; set;}

        public ItemPostDTO Item { get; set; } = new ();

        public LocalizacaoDTO Localizacao { get; set; } = new();
    }
}