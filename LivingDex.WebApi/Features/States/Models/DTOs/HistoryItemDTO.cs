using LivingDex.WebApi.Features.States.Models.Entities;
using LivingDex.WebApi.Features.States.Services;

namespace LivingDex.WebApi.Features.States.Models.DTOs;

/// <summary>
/// One past revision in the History window.
/// </summary>
public sealed class HistoryItemDTO
{
    /// <summary>
    /// Initializes an empty DTO (serialization).
    /// </summary>
    public HistoryItemDTO()
    {
    }

    /// <summary>
    /// Maps a history entry.
    /// </summary>
    /// <param name="entity">The entry.</param>
    public HistoryItemDTO(UserStateHistory entity)
    {
        Revision = entity.Revision;
        UpdatedAt = entity.UpdatedAt;
        Client = entity.Client;
        Caught = ProgressDocument.CountCaught(entity.Data);
    }

    /// <summary>Gets or sets the revision.</summary>
    public long Revision { get; set; }

    /// <summary>Gets or sets when it was saved (UTC).</summary>
    public DateTime UpdatedAt { get; set; }

    /// <summary>Gets or sets which device saved it.</summary>
    public string? Client { get; set; }

    /// <summary>Gets or sets the number of marked entries in that revision.</summary>
    public int Caught { get; set; }
}
