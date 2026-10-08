using LivingDex.Library.Enums;

namespace LivingDex.WebApi.Features.Assets.Models;

/// <summary>
/// Where to serve an asset from.
/// </summary>
/// <param name="State">Whether it is available.</param>
/// <param name="FilePath">The file on disk (when available).</param>
/// <param name="ContentType">Its media type (when available).</param>
/// <param name="RedirectUrl">The upstream URL, when caching is off and the asset isn't bundled.</param>
public sealed record AssetLookup(AssetState State, string? FilePath = null, string? ContentType = null, string? RedirectUrl = null);
