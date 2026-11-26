namespace Api_Almoxarifado.DTO
{
    public class EnderecoDTO
    {
        public int idEndereco { get; set; }

        public int idFornecedor { get; set; }

        public string Cep { get; set; }

        public string Logradouro { get; set;}

        public string Numero { get; set; }

        public string? Complemento { get; set; }

        public string Cidade { get; set; }

        public string Bairro { get; set; }

        public string Estado { get; set; }

        public string Pais { get; set; }
    }
}