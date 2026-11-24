using System;
using System.Collections.Generic;

namespace Api_Almoxarifado.Models;

public partial class Requisicao
{
    public int Idrequisicao { get; set; }

    public int Idfuncionario { get; set; }

    public DateTime DatahoraS { get; set; }

    public string Justificativa { get; set; } = null!;

    public string TipoS { get; set; } = null!;
}
