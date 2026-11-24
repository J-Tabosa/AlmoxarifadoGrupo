using System;
using System.Collections.Generic;

namespace Api_Almoxarifado.Models;

public partial class Funcionario
{
    public int Idfuncionario { get; set; }

    public int Idsetor { get; set; }

    public string NomeFu { get; set; } = null!;

    public string Cargo { get; set; } = null!;

    public string StatusFu { get; set; } = null!;

    public string Senha { get; set; } = null!;

    public virtual Setor Setor { get; set; } = null!;
}
