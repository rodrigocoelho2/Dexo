namespace LivingDex.WebApi.Features.Assets.Models.DTOs;

/// <summary>
/// Download-all-assets request. The page sends the list (it knows every species, form and track).
/// </summary>
public sealed class AssetDownloadDTO
{
    /// <summary>
    /// Gets or sets the items. Each item is a fallback chain of "kind/path" strings
    /// (e.g. ["sprites/other/home/10033.png", "sprites/10033.png"]): the first one that exists upstream is kept.
    /// </summary>
    public string[][]? Items { get; set; }
}
