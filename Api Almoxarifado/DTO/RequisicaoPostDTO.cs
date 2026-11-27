namespace Api_Almoxarifado.DTO
{
    public class RequisicaoPostDTO
    {
        public int idrequisicao { get; set; }

        public int idfuncionario { get; set; }

        public DateTime datahoraS { get; set; }

        public string Justificativa { get; set; } = null!;

        public string tipoS { get; set; } = null!;
    }
}
