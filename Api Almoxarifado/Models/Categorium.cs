using System;
using System.Collections.Generic;

namespace Api_Almoxarifado.Models;

public partial class Categorium
{
    public int Idcategoria { get; set; }

    public string Tipo { get; set; } = null!;

    public virtual ICollection<Item> Items { get; set; } = new List<Item>();
}
