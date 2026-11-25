using System;
using System.Collections.Generic;

namespace Api_Almoxarifado.Models;

public partial class Entradum
{
    public int Identrada { get; set; }

    public int Iditem { get; set; }

    public int Idfuncionario { get; set; }

    public int Idfornecedor { get; set; }

    public string NumLote { get; set; } = null!;

    public int QuantidadeE { get; set; }

    public DateTime DatahoraE { get; set; }

    public string TipoE { get; set; } = null!;

    public DateOnly? DataValidade { get; set; }

    public virtual Fornecedor Fornecedor { get; set; } = null!;

    public virtual Item Item { get; set; } = null!;
}
