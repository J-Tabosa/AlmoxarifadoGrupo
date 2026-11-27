using Api_Almoxarifado.Models;

namespace Api_Almoxarifado.DTO
{
    public class RequisicaoDTO
    {
        public int idRequisicao { get; set; }

        public int idFuncionario { get; set; }

        public DateTime datahoraS { get; set; }

        public string Justificativa { get; set; } = null!;

        public string tipoS { get; set; } = null!;

        public List<RequisicaoItemDTO> RequisicaoItems { get; set; } = new ();
    }
}
