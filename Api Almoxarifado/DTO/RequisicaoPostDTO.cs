namespace Api_Almoxarifado.DTO
{
    public class RequisicaoPostDTO
    {
        public int idRequisicao { get; set; }

        public int idFuncionario { get; set; }

        public DateTime datahoraS { get; set; }

        public string Justificativa { get; set; } = null!;

        public string tipoS { get; set; } = null!;
    }
}
