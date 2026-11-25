using System;
using System.Collections.Generic;

namespace Api_Almoxarifado.Models;

public partial class Localizacao
{
    public int Idlocalizacao { get; set; }

    public string Andar { get; set; } = null!;

    public string Sala { get; set; } = null!;

    public string Posicao { get; set; } = null!;

    public string StatusL { get; set; } = null!;

    public string DescricaoL { get; set; }

    public virtual ICollection<Estoque> Estoques { get; set; } = new List<Estoque>();
}
