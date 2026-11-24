using System;
using System.Collections.Generic;

namespace Api_Almoxarifado.Models;

public partial class Item
{
    public int Iditem { get; set; }

    public int Idcategoria { get; set; }

    public string DescricaoItem { get; set; } = null!;

    /// <summary>
    /// UN, CX, PC, L e KG
    /// </summary>
    public string Unidade { get; set; } = null!;

    public string StatusIt { get; set; } = null!;

    public virtual ICollection<Entradum> Entrada { get; set; } = new List<Entradum>();

    public virtual ICollection<Estoque> Estoques { get; set; } = new List<Estoque>();

    public virtual Categorium IdcategoriaNavigation { get; set; } = null!;

    public virtual ICollection<RequisicaoItem> RequisicaoItems { get; set; } = new List<RequisicaoItem>();
}
