namespace LivingDex.WebApi.Features.States.Models.Entities;

/// <summary>
/// One row of dbo.UserStateHistory: a past revision of a trainer's progress.
/// </summary>
public sealed class UserStateHistory
{
    /// <summary>Gets or sets the revision.</summary>
    public long Revision { get; set; }

    /// <summary>Gets or sets when it was saved (UTC).</summary>
    public DateTime UpdatedAt { get; set; }

    /// <summary>Gets or sets which device saved it ("iPhone · Safari", "restore of r12"…).</summary>
    public string? Client { get; set; }

    /// <summary>Gets or sets the progress document.</summary>
    public string Data { get; set; } = "null";
}
