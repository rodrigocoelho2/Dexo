namespace LivingDex.WebApi.Features.States.Models.Entities;

/// <summary>
/// One row of dbo.UserState: a trainer's current progress (caught lists, capture details, catch log) as raw JSON.
/// </summary>
public sealed class UserState
{
    /// <summary>Gets or sets the account identifier.</summary>
    public long UserID { get; set; }

    /// <summary>Gets or sets the revision; every save adds one. 0 means nothing was saved yet.</summary>
    public long Revision { get; set; }

    /// <summary>Gets or sets the progress document (JSON object), or "null" before the first save.</summary>
    public string Data { get; set; } = "null";

    /// <summary>Gets or sets when this revision was saved (UTC), or null before the first save.</summary>
    public DateTime? UpdatedAt { get; set; }
}
