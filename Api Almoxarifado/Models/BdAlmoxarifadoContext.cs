using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using Pomelo.EntityFrameworkCore.MySql.Scaffolding.Internal;

namespace Api_Almoxarifado.Models;

public partial class BdAlmoxarifadoContext : DbContext
{
    public BdAlmoxarifadoContext()
    {
    }

    public BdAlmoxarifadoContext(DbContextOptions<BdAlmoxarifadoContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Categorium> Categoria { get; set; }

    public virtual DbSet<Endereco> Enderecos { get; set; }

    public virtual DbSet<Entradum> Entrada { get; set; }

    public virtual DbSet<Estoque> Estoques { get; set; }

    public virtual DbSet<Fornecedor> Fornecedors { get; set; }

    public virtual DbSet<Funcionario> Funcionarios { get; set; }

    public virtual DbSet<Item> Items { get; set; }

    public virtual DbSet<Localizacao> Localizacaos { get; set; }

    public virtual DbSet<Requisicao> Requisicaos { get; set; }

    public virtual DbSet<RequisicaoItem> RequisicaoItems { get; set; }

    public virtual DbSet<Setor> Setors { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see https://go.microsoft.com/fwlink/?LinkId=723263.
        => optionsBuilder.UseMySql("server=localhost;port=3306;database=bd_almoxarifado;user=root;password=root", Microsoft.EntityFrameworkCore.ServerVersion.Parse("8.2.0-mysql"));

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder
            .UseCollation("utf8mb3_general_ci")
            .HasCharSet("utf8mb3");

        modelBuilder.Entity<Categorium>(entity =>
        {
            entity.HasKey(e => e.Idcategoria).HasName("PRIMARY");

            entity.ToTable("categoria");

            entity.Property(e => e.Idcategoria).HasColumnName("idcategoria");
            entity.Property(e => e.Tipo)
                .HasMaxLength(45)
                .HasColumnName("tipo");
        });

        modelBuilder.Entity<Endereco>(entity =>
        {
            entity.HasKey(e => e.Idendereco).HasName("PRIMARY");

            entity.ToTable("endereco");

            entity.HasIndex(e => e.Idfornecedor, "fk_endereco_fornecedor1_idx");

            entity.Property(e => e.Idendereco).HasColumnName("idendereco");
            entity.Property(e => e.Idfornecedor).HasColumnName("idfornecedor");
            entity.Property(e => e.Bairro)
                .HasMaxLength(45)
                .HasColumnName("bairro");
            entity.Property(e => e.Cep)
                .HasMaxLength(8)
                .IsFixedLength()
                .HasColumnName("cep");
            entity.Property(e => e.Cidade)
                .HasMaxLength(45)
                .HasColumnName("cidade");
            entity.Property(e => e.Complemento)
                .HasMaxLength(60)
                .HasColumnName("complemento");
            entity.Property(e => e.Estado)
                .HasMaxLength(45)
                .HasColumnName("estado");
            entity.Property(e => e.Logradouro)
                .HasMaxLength(45)
                .HasColumnName("logradouro");
            entity.Property(e => e.Numero)
                .HasMaxLength(5)
                .IsFixedLength()
                .HasColumnName("numero");
            entity.Property(e => e.Pais)
                .HasMaxLength(45)
                .HasColumnName("pais");

            entity.HasOne(d => d.Fornecedor).WithMany(p => p.Endereco)
                .HasForeignKey(d => d.Idfornecedor)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_endereco_fornecedor1");
        });

        modelBuilder.Entity<Entradum>(entity =>
        {
            entity.HasKey(e => new { e.Identrada, e.Iditem })
                .HasName("PRIMARY")
                .HasAnnotation("MySql:IndexPrefixLength", new[] { 0, 0 });

            entity.ToTable("entrada");

            entity.HasIndex(e => e.Idfornecedor, "fk_entrada_estoque_fornecedor1_idx");

            entity.HasIndex(e => e.Iditem, "fk_entrada_estoque_item1_idx");

            entity.HasIndex(e => e.Idfuncionario, "fk_entrada_funcionario1_idx");

            entity.Property(e => e.Identrada)
                .ValueGeneratedOnAdd()
                .HasColumnName("identrada");
            entity.Property(e => e.Iditem).HasColumnName("iditem");
            entity.Property(e => e.DataValidade).HasColumnName("data_validade");
            entity.Property(e => e.DatahoraE)
                .HasColumnType("datetime")
                .HasColumnName("datahora_e");
            entity.Property(e => e.Idfornecedor).HasColumnName("idfornecedor");
            entity.Property(e => e.Idfuncionario).HasColumnName("idfuncionario");
            entity.Property(e => e.NumLote)
                .HasMaxLength(45)
                .HasColumnName("num_lote");
            entity.Property(e => e.QuantidadeE).HasColumnName("quantidade_e");
            entity.Property(e => e.TipoE)
                .HasMaxLength(45)
                .HasColumnName("tipo_e");

            entity.HasOne(d => d.Fornecedor).WithMany(p => p.Entrada)
                .HasForeignKey(d => d.Idfornecedor)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_entrada_estoque_fornecedor1");

            entity.HasOne(d => d.Item).WithMany(p => p.Entrada)
                .HasForeignKey(d => d.Iditem)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_entrada_estoque_item1");
        });

        modelBuilder.Entity<Estoque>(entity =>
        {
            entity.HasKey(e => new { e.Iditem, e.Idlocalizacao })
                .HasName("PRIMARY")
                .HasAnnotation("MySql:IndexPrefixLength", new[] { 0, 0 });

            entity.ToTable("estoque");

            entity.HasIndex(e => e.Iditem, "fk_estoque_item_idx");

            entity.HasIndex(e => e.Idlocalizacao, "fk_estoque_localizacao1_idx");

            entity.Property(e => e.Iditem).HasColumnName("iditem");
            entity.Property(e => e.Idlocalizacao).HasColumnName("idlocalizacao");
            entity.Property(e => e.EMaximo).HasColumnName("e_maximo");
            entity.Property(e => e.EMinimo).HasColumnName("e_minimo");
            entity.Property(e => e.Saldo).HasColumnName("saldo");

            entity.HasOne(d => d.Item).WithMany(p => p.Estoques)
                .HasForeignKey(d => d.Iditem)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_estoque_item");

            entity.HasOne(d => d.Localizacao).WithMany(p => p.Estoques)
                .HasForeignKey(d => d.Idlocalizacao)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_estoque_localizacao1");
        });

        modelBuilder.Entity<Fornecedor>(entity =>
        {
            entity.HasKey(e => e.Idfornecedor).HasName("PRIMARY");

            entity.ToTable("fornecedor");

            entity.Property(e => e.Idfornecedor).HasColumnName("idfornecedor");
            entity.Property(e => e.Cnpj)
                .HasMaxLength(14)
                .HasColumnName("cnpj");
            entity.Property(e => e.Contato)
                .HasMaxLength(60)
                .HasColumnName("contato");
            entity.Property(e => e.NomeFo)
                .HasMaxLength(45)
                .HasColumnName("nome_fo");
            entity.Property(e => e.StatusFo)
                .HasMaxLength(1)
                .IsFixedLength()
                .HasColumnName("status_fo");
        });

        modelBuilder.Entity<Funcionario>(entity =>
        {
            entity.HasKey(e => new { e.Idfuncionario, e.Idsetor })
                .HasName("PRIMARY")
                .HasAnnotation("MySql:IndexPrefixLength", new[] { 0, 0 });

            entity.ToTable("funcionario");

            entity.HasIndex(e => e.Idsetor, "fk_funcionario_setor1_idx");

            entity.Property(e => e.Idfuncionario)
                .ValueGeneratedOnAdd()
                .HasColumnName("idfuncionario");
            entity.Property(e => e.Idsetor).HasColumnName("idsetor");
            entity.Property(e => e.Cargo)
                .HasMaxLength(45)
                .HasColumnName("cargo");
            entity.Property(e => e.NomeFu)
                .HasMaxLength(50)
                .HasColumnName("nome_fu");
            entity.Property(e => e.Senha)
                .HasMaxLength(20)
                .HasColumnName("senha");
            entity.Property(e => e.StatusFu)
                .HasMaxLength(1)
                .IsFixedLength()
                .HasColumnName("status_fu");

            entity.HasOne(d => d.Setor).WithMany(p => p.Funcionarios)
                .HasForeignKey(d => d.Idsetor)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_funcionario_setor1");
        });

        modelBuilder.Entity<Item>(entity =>
        {
            entity.HasKey(e => e.Iditem).HasName("PRIMARY");

            entity.ToTable("item");

            entity.HasIndex(e => e.Idcategoria, "fk_item_categoria1_idx");

            entity.Property(e => e.Iditem).HasColumnName("iditem");
            entity.Property(e => e.DescricaoItem)
                .HasMaxLength(100)
                .HasColumnName("descricao_item");
            entity.Property(e => e.Idcategoria).HasColumnName("idcategoria");
            entity.Property(e => e.StatusIt)
                .HasMaxLength(1)
                .IsFixedLength()
                .HasColumnName("status_it");
            entity.Property(e => e.Unidade)
                .HasMaxLength(2)
                .IsFixedLength()
                .HasComment("UN, CX, PC, L e KG")
                .HasColumnName("unidade");

            entity.HasOne(d => d.Categoria).WithMany(p => p.Items)
                .HasForeignKey(d => d.Idcategoria)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_item_categoria1");
        });

        modelBuilder.Entity<Localizacao>(entity =>
        {
            entity.HasKey(e => e.Idlocalizacao).HasName("PRIMARY");

            entity.ToTable("localizacao");

            entity.Property(e => e.Idlocalizacao).HasColumnName("idlocalizacao");
            entity.Property(e => e.Sala)
                .HasMaxLength(4)
                .IsFixedLength()
                .HasColumnName("sala");
            entity.Property(e => e.Posicao)
                .HasMaxLength(4)
                .IsFixedLength()
                .HasColumnName("posicao");
            entity.Property(e => e.Andar)
                .HasMaxLength(4)
                .IsFixedLength()
                .HasColumnName("andar");
            entity.Property(e => e.StatusL)
                .HasMaxLength(1)
                .IsFixedLength()
                .HasColumnName("status_l");
        });

        modelBuilder.Entity<Requisicao>(entity =>
        {
            entity.HasKey(e => new { e.Idrequisicao, e.Idfuncionario })
                .HasName("PRIMARY")
                .HasAnnotation("MySql:IndexPrefixLength", new[] { 0, 0 });

            entity.ToTable("requisicao");

            entity.HasIndex(e => e.Idfuncionario, "fk_saida_funcionario1_idx");

            entity.Property(e => e.Idrequisicao)
                .ValueGeneratedOnAdd()
                .HasColumnName("idrequisicao");
            entity.Property(e => e.Idfuncionario).HasColumnName("idfuncionario");
            entity.Property(e => e.DatahoraS)
                .HasColumnType("datetime")
                .HasColumnName("datahora_s");
            entity.Property(e => e.Justificativa)
                .HasMaxLength(100)
                .HasColumnName("justificativa");
            entity.Property(e => e.TipoS)
                .HasMaxLength(45)
                .HasColumnName("tipo_s");
        });

        modelBuilder.Entity<RequisicaoItem>(entity =>
        {
            entity.HasKey(e => new { e.Iditem, e.Idrequisicao })
                .HasName("PRIMARY")
                .HasAnnotation("MySql:IndexPrefixLength", new[] { 0, 0 });

            entity.ToTable("requisicao_item");

            entity.HasIndex(e => e.Idrequisicao, "fk_movimentacao_item_movimentacao1_idx");

            entity.Property(e => e.Iditem).HasColumnName("iditem");
            entity.Property(e => e.Idrequisicao).HasColumnName("idrequisicao");
            entity.Property(e => e.QuantidadeS).HasColumnName("quantidade_s");

            entity.HasOne(d => d.Item).WithMany(p => p.RequisicaoItems)
                .HasForeignKey(d => d.Iditem)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_movimentacao_item_item1");
        });

        modelBuilder.Entity<Setor>(entity =>
        {
            entity.HasKey(e => e.Idsetor).HasName("PRIMARY");

            entity.ToTable("setor");

            entity.Property(e => e.Idsetor).HasColumnName("idsetor");
            entity.Property(e => e.NomeSetor)
                .HasMaxLength(45)
                .HasColumnName("nome_setor");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
