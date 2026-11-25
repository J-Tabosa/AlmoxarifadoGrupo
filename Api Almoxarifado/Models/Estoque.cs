using System;
using System.Collections.Generic;

namespace Api_Almoxarifado.Models;

public partial class Estoque
{
    public int Iditem { get; set; }

    public int Idlocalizacao { get; set; }

    public uint Saldo { get; set; }

    public int EMinimo { get; set; }

    public int EMaximo { get; set; }

    public virtual Item Item { get; set; } = null!;

    public virtual Localizacao Localizacao { get; set; } = null!;
}
