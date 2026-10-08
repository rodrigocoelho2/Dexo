using LivingDex.Library.Enums;
using LivingDex.WebApi.Features.Assets.Models;

namespace LivingDex.WebApi.Features.Assets.Services;

/// <summary>
/// Sprites, cries, battle backgrounds and music: from the bundle (LivingDex.Assets), then the download cache,
/// then upstream (downloaded once).
/// </summary>
internal interface IAssetStore
{
    /// <summary>
    /// Gets a value indicating whether assets missing from the bundle are downloaded and cached.
    /// </summary>
    bool CacheEnabled { get; }

    /// <summary>
    /// Parses the "kind" part of a "kind/path" string.
    /// </summary>
    /// <param name="key">"sprites", "cries", "battlebg" or "music".</param>
    /// <param name="kind">The kind.</param>
    /// <returns>True when known.</returns>
    bool TryParseKind(string key, out AssetKind kind);

    /// <summary>
    /// Finds where to serve an asset from, downloading it the first time when caching is on.
    /// </summary>
    /// <param name="kind">The kind.</param>
    /// <param name="path">The path below the kind's root.</param>
    /// <returns>The lookup.</returns>
    Task<AssetLookup> ResolveAsync(AssetKind kind, string path);

    /// <summary>
    /// Makes sure one asset is on disk (bundled, cached, or downloaded now).
    /// </summary>
    /// <param name="kind">The kind.</param>
    /// <param name="path">The path below the kind's root.</param>
    /// <param name="cancellationToken">Stops the download.</param>
    /// <returns>The outcome and the bytes on disk.</returns>
    Task<(AssetState State, long Bytes)> EnsureAsync(AssetKind kind, string path, CancellationToken cancellationToken);
}
