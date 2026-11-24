using System;
using System.Collections.Generic;

namespace Api_Almoxarifado.Models;

public partial class Fornecedor
{
    public int Idfornecedor { get; set; }

    public int Idendereco { get; set; }

    public string Contato { get; set; } = null!;

    public string NomeFo { get; set; } = null!;

    public string Cnpj { get; set; } = null!;

    public string StatusFo { get; set; } = null!;

    public virtual ICollection<Entradum> Entrada { get; set; } = new List<Entradum>();

    public virtual Endereco IdenderecoNavigation { get; set; } = null!;
}
