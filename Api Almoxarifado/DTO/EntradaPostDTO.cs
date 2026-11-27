namespace Api_Almoxarifado.DTO
{
    public class EntradaPostDTO
    {
        public int idEntrada { get; set; }

        public int idItem { get; set; }

        public int idFuncionario { get; set; }

        public int idFornecedor { get; set; }

        public string? NumLote { get; set; }

        public int quantidadeE { get; set; }

        public DateTime dataHoraE { get; set; }

        public string? tipoE { get; set; }

        public DateOnly? dataValidade { get; set; }
    }
}
