using Api_Almoxarifado.Models;

namespace Api_Almoxarifado.DTO
{
    public class RequisicaoItemDTO
    {
        public int idItem { get; set; }

        public int idRequisicao { get; set; }

        public int quantidadeS { get; set; }

        public ItemPostDTO Item { get; set; } = null!;

        public RequisicaoPostDTO Requisicao { get; set; } = null!;
    }
}
