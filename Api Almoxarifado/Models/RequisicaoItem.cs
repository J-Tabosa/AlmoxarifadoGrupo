using System;
using System.Collections.Generic;

namespace Api_Almoxarifado.Models;

public partial class RequisicaoItem
{
    public int Iditem { get; set; }

    public int Idrequisicao { get; set; }

    public int QuantidadeS { get; set; }

    public virtual Item Item { get; set; } = null!;
}
