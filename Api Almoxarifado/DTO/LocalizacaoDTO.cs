namespace Api_Almoxarifado.DTO
{
    public class LocalizacaoDTO
    {
        public int idLocalizacao { get; set; }

        public string Andar { get; set; }

        public string Sala { get; set; }

        public string Posicao { get; set;}

        public string statusL { get; set; }

        public string? descricaoL { get; set; }
    }
}