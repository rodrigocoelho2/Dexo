namespace LivingDex.WebApi.Features.Battles.Models.Entities;

/// <summary>
/// One row of dbo.BattleFormatRecords: wins and losses in one format against other trainers.
/// </summary>
public sealed class FormatRecord
{
    /// <summary>Gets or sets the format.</summary>
    public string Format { get; set; } = string.Empty;

    /// <summary>Gets or sets the wins.</summary>
    public int Wins { get; set; }

    /// <summary>Gets or sets the losses.</summary>
    public int Losses { get; set; }
}
