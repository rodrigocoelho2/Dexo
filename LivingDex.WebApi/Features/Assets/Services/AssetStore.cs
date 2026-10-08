using System.Collections.Concurrent;
using System.Net;
using System.Text.RegularExpressions;
using LivingDex.Library.Enums;
using LivingDex.WebApi.Features.Assets.Models;
using Microsoft.Extensions.Options;

namespace LivingDex.WebApi.Features.Assets.Services;

/// <summary>
/// Serves assets from the bundled folder first (LivingDex.Assets, copied into the image), then from the
/// download cache in the data folder, and otherwise fetches them once from the public PokeAPI / Pokémon Showdown
/// repositories. Only image and audio paths under known roots are accepted, so this is not an open proxy.
/// </summary>
/// <param name="httpClientFactory">Creates the download client.</param>
/// <param name="options">The LivingDex options.</param>
/// <param name="logger">Logger.</param>
internal sealed partial class AssetStore(
    IHttpClientFactory httpClientFactory,
    IOptions<LivingDexOptions> options,
    ILogger<AssetStore> logger) : IAssetStore
{
    /// <summary>The name of the download HttpClient.</summary>
    public const string HttpClientName = "pokeapi-assets";

    private static readonly IReadOnlyDictionary<AssetKind, (string Folder, string Upstream)> Kinds = new Dictionary<AssetKind, (string, string)>
    {
        [AssetKind.Sprites] = ("sprites", "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/"),
        [AssetKind.Cries] = ("cries", "https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/"),
        // Battle backgrounds and move-animation sprites from the Pokémon Showdown client (only fx/<name>.png|jpg).
        [AssetKind.BattleBg] = ("battlebg", "https://raw.githubusercontent.com/smogon/pokemon-showdown-client/master/play.pokemonshowdown.com/"),
        // Battle music from the Pokémon Showdown site (only <name>.mp3; the tracks aren't in the client repository).
        [AssetKind.Music] = ("music", "https://play.pokemonshowdown.com/audio/"),
    };

    private static readonly IReadOnlyDictionary<string, string> ContentTypes = new Dictionary<string, string>(StringComparer.Ordinal)
    {
        [".png"] = "image/png",
        [".gif"] = "image/gif",
        [".ogg"] = "audio/ogg",
        [".jpg"] = "image/jpeg",
        [".mp3"] = "audio/mpeg",
    };

    private readonly IHttpClientFactory _httpClientFactory = httpClientFactory;
    private readonly IOptions<LivingDexOptions> _options = options;
    private readonly ILogger<AssetStore> _logger = logger;
    private readonly ConcurrentDictionary<string, SemaphoreSlim> _locks = new();

    /// <inheritdoc />
    public bool CacheEnabled => _options.Value.CacheAssets;

    /// <inheritdoc />
    public bool TryParseKind(string key, out AssetKind kind)
    {
        foreach (var (candidate, (folder, _)) in Kinds)
        {
            if (string.Equals(folder, key, StringComparison.Ordinal))
            {
                kind = candidate;
                return true;
            }
        }

        kind = default;
        return false;
    }

    /// <inheritdoc />
    public async Task<AssetLookup> ResolveAsync(AssetKind kind, string path)
    {
        if (!Allowed(kind, path))
        {
            return new AssetLookup(AssetState.Rejected);
        }

        if (BundledFile(kind, path) is { } bundled && File.Exists(bundled))
        {
            return Found(AssetState.Cached, bundled, path);
        }

        if (!CacheEnabled)
        {
            return new AssetLookup(AssetState.Missing, RedirectUrl: Kinds[kind].Upstream + path);
        }

        var (state, _) = await EnsureDownloadedAsync(kind, path, CancellationToken.None);
        return state is AssetState.Cached or AssetState.Downloaded
            ? Found(state, CacheFile(kind, path)!, path)
            : new AssetLookup(state);
    }

    /// <inheritdoc />
    public async Task<(AssetState State, long Bytes)> EnsureAsync(AssetKind kind, string path, CancellationToken cancellationToken)
    {
        if (!Allowed(kind, path))
        {
            return (AssetState.Rejected, 0);
        }

        if (BundledFile(kind, path) is { } bundled && File.Exists(bundled))
        {
            return (AssetState.Cached, new FileInfo(bundled).Length);
        }

        return await EnsureDownloadedAsync(kind, path, cancellationToken);
    }

    [GeneratedRegex(@"^[a-z0-9][a-z0-9\-/]{0,120}\.(png|gif|ogg|jpg|mp3)$")]
    private static partial Regex SafePath();

    [GeneratedRegex(@"^fx/[a-z0-9\-]{1,40}\.(png|jpg)$")]
    private static partial Regex BattleBackground();

    [GeneratedRegex(@"^[a-z0-9\-]{1,40}\.mp3$")]
    private static partial Regex MusicTrack();

    private static bool Allowed(AssetKind kind, string path)
    {
        if (!Kinds.ContainsKey(kind) || !SafePath().IsMatch(path) || path.Contains("//", StringComparison.Ordinal))
        {
            return false;
        }

        var isMp3 = Path.GetExtension(path).Equals(".mp3", StringComparison.Ordinal);
        return kind switch
        {
            AssetKind.BattleBg => BattleBackground().IsMatch(path),
            AssetKind.Music => isMp3 && MusicTrack().IsMatch(path),
            _ => !isMp3,
        };
    }

    private static AssetLookup Found(AssetState state, string file, string path) =>
        new(state, file, ContentTypes[Path.GetExtension(path)]);

    private static string? Within(string root, string path)
    {
        var fullRoot = Path.GetFullPath(root);
        var file = Path.GetFullPath(Path.Combine(fullRoot, path));
        return file.StartsWith(fullRoot + Path.DirectorySeparatorChar, StringComparison.Ordinal) ? file : null;
    }

    private string? BundledFile(AssetKind kind, string path) => Within(Path.Combine(_options.Value.AssetsDirectory, Kinds[kind].Folder), path);

    private string? CacheFile(AssetKind kind, string path) => Within(Path.Combine(_options.Value.DataDirectory, "cache", Kinds[kind].Folder), path);

    /// <summary>
    /// Makes sure one asset is in the cache, downloading it the first time. Misses are remembered with a ".missing"
    /// marker so a fallback chain doesn't ask upstream again.
    /// </summary>
    private async Task<(AssetState State, long Bytes)> EnsureDownloadedAsync(AssetKind kind, string path, CancellationToken cancellationToken)
    {
        if (CacheFile(kind, path) is not { } file)
        {
            return (AssetState.Rejected, 0);
        }

        var missingMarker = file + ".missing";
        if (File.Exists(file))
        {
            return (AssetState.Cached, new FileInfo(file).Length);
        }

        if (File.Exists(missingMarker))
        {
            return (AssetState.Missing, 0);
        }

        var gate = _locks.GetOrAdd(file, static _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(cancellationToken);
        try
        {
            if (File.Exists(file))
            {
                return (AssetState.Cached, new FileInfo(file).Length);
            }

            if (File.Exists(missingMarker))
            {
                return (AssetState.Missing, 0);
            }

            if (!await DownloadAsync(Kinds[kind].Upstream + path, file, missingMarker, cancellationToken))
            {
                return (AssetState.Failed, 0);
            }
        }
        finally
        {
            gate.Release();
            _locks.TryRemove(file, out _);
        }

        return File.Exists(file) ? (AssetState.Downloaded, new FileInfo(file).Length) : (AssetState.Missing, 0);
    }

    /// <returns>False when the download failed (network or upstream error); true when the file or a miss marker is now on disk.</returns>
    private async Task<bool> DownloadAsync(string url, string file, string missingMarker, CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(file)!);
        var client = _httpClientFactory.CreateClient(HttpClientName);

        try
        {
            using var response = await client.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, cancellationToken);

            if (response.StatusCode == HttpStatusCode.NotFound)
            {
                await File.WriteAllTextAsync(missingMarker, string.Empty, cancellationToken);
                return true;
            }

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Upstream returned {Status} for {Url}", (int)response.StatusCode, url);
                return false;
            }

            var temp = $"{file}.{Guid.NewGuid():N}.tmp";
            await using (var output = File.Create(temp))
            {
                await response.Content.CopyToAsync(output, cancellationToken);
            }

            File.Move(temp, file, overwrite: true);
            return true;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Could not download {Url}", url);
            return false;
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning("Timed out downloading {Url}", url);
            return false;
        }
    }
}
