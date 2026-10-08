using System.Text.Json;
using LivingDex.WebApi.Features.States.Models.Entities;

namespace LivingDex.WebApi.Features.States.Models.DTOs;

/// <summary>
/// A trainer's progress as the page reads it.
/// </summary>
public sealed class StateDTO
{
    /// <summary>
    /// Initializes an empty DTO (serialization).
    /// </summary>
    public StateDTO()
    {
    }

    /// <summary>
    /// Maps the stored progress.
    /// </summary>
    /// <param name="entity">The stored progress.</param>
    public StateDTO(UserState entity)
    {
        Revision = entity.Revision;
        UpdatedAt = entity.UpdatedAt;
        using var document = JsonDocument.Parse(entity.Data);
        Data = document.RootElement.Clone();
    }

    /// <summary>Gets or sets the revision (send it back with the next save).</summary>
    public long Revision { get; set; }

    /// <summary>Gets or sets when it was saved (UTC), or null before the first save.</summary>
    public DateTime? UpdatedAt { get; set; }

    /// <summary>Gets or sets the progress document (null before the first save).</summary>
    public JsonElement Data { get; set; }
}
