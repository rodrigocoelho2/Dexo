namespace LivingDex.WebApi.Features.Assets.Models.DTOs;

/// <summary>
/// Progress of the current (or last) asset download.
/// </summary>
public sealed class AssetDownloadStatusDTO
{
    /// <summary>Gets or sets a value indicating whether a download is running.</summary>
    public bool Running { get; set; }

    /// <summary>Gets or sets the number of items.</summary>
    public int Total { get; set; }

    /// <summary>Gets or sets the items handled so far.</summary>
    public int Done { get; set; }

    /// <summary>Gets or sets the items downloaded.</summary>
    public int Downloaded { get; set; }

    /// <summary>Gets or sets the items already on disk.</summary>
    public int Cached { get; set; }

    /// <summary>Gets or sets the items that don't exist upstream.</summary>
    public int Missing { get; set; }

    /// <summary>Gets or sets the items whose download failed.</summary>
    public int Failed { get; set; }

    /// <summary>Gets or sets the bytes downloaded.</summary>
    public long Bytes { get; set; }

    /// <summary>Gets or sets when the download started (UTC).</summary>
    public DateTime? StartedAt { get; set; }

    /// <summary>Gets or sets when it finished (UTC).</summary>
    public DateTime? FinishedAt { get; set; }

    /// <summary>Gets or sets a value indicating whether it was cancelled.</summary>
    public bool Cancelled { get; set; }
}
