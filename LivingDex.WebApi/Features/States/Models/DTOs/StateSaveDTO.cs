using System.Text.Json;

namespace LivingDex.WebApi.Features.States.Models.DTOs;

/// <summary>
/// Save-progress request.
/// </summary>
public sealed class StateSaveDTO
{
    /// <summary>Gets or sets the revision the page loaded (0 before the first save).</summary>
    public long Revision { get; set; }

    /// <summary>Gets or sets the progress document; must be a JSON object.</summary>
    public JsonElement Data { get; set; }

    /// <summary>Gets or sets a short description of the device, kept in the history.</summary>
    public string? Client { get; set; }
}
