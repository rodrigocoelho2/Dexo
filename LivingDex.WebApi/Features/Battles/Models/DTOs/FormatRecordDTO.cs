using LivingDex.WebApi.Features.Battles.Models.Entities;

namespace LivingDex.WebApi.Features.Battles.Models.DTOs;

/// <summary>
/// Wins and losses in one format against other trainers.
/// </summary>
public sealed class FormatRecordDTO
{
    /// <summary>
    /// Initializes an empty DTO (serialization).
    /// </summary>
    public FormatRecordDTO()
    {
    }

    /// <summary>
    /// Maps a format record.
    /// </summary>
    /// <param name="entity">The record.</param>
    public FormatRecordDTO(FormatRecord entity)
    {
        Format = entity.Format;
        Wins = entity.Wins;
        Losses = entity.Losses;
    }

    /// <summary>Gets or sets the format.</summary>
    public string Format { get; set; } = string.Empty;

    /// <summary>Gets or sets the wins.</summary>
    public int Wins { get; set; }

    /// <summary>Gets or sets the losses.</summary>
    public int Losses { get; set; }
}
