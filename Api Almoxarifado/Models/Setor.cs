using System;
using System.Collections.Generic;

namespace Api_Almoxarifado.Models;

public partial class Setor
{
    public int Idsetor { get; set; }

    public string NomeSetor { get; set; } = null!;

    public virtual ICollection<Funcionario> Funcionarios { get; set; } = new List<Funcionario>();
}
