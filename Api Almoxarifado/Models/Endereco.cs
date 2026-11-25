using System;
using System.Collections.Generic;

namespace Api_Almoxarifado.Models;

public partial class Endereco
{
    public int Idendereco { get; set; }

    public string Cep { get; set; } = null!;

    public int Idfornecedor { get; set; }

    public string Logradouro { get; set; } = null!;

    public string Numero { get; set; } = null!;

    public string? Complemento { get; set; }

    public string Cidade { get; set; } = null!;

    public string Bairro { get; set; } = null!;

    public string Estado { get; set; } = null!;

    public string Pais { get; set; } = null!;

    public virtual Fornecedor Fornecedor { get; set; } = null!;
}
