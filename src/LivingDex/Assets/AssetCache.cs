using System.Collections.Concurrent;
using System.Net;
using System.Text.RegularExpressions;
using LivingDex.Data;
using Microsoft.Extensions.Options;

namespace LivingDex.Assets;

/// <summary>
/// Fetches sprite, cry and battle-background files from the public PokeAPI repositories the first time they are asked for,
/// keeps them on disk and serves them locally afterwards. Only image and audio paths under the two
/// known roots are accepted, so this is not an open proxy.
/// </summary>
public sealed partial class AssetCache(
    IHttpClientFactory httpClientFactory,
    SqliteConnectionFactory db,
    IOptions<LivingDexOptions> options,
    ILogger<AssetCache> logger)
{
    public const string HttpClientName = "pokeapi-assets";

    private static readonly IReadOnlyDictionary<string, string> Upstream = new Dictionary<string, string>
    {
        ["sprites"] = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/",
        ["cries"] = "https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/",
        // Battle backgrounds and move-animation sprites from the Pokémon Showdown client (only fx/<name>.png|jpg).
        ["battlebg"] = "https://raw.githubusercontent.com/smogon/pokemon-showdown-client/master/play.pokemonshowdown.com/",
        // Battle music from the Pokémon Showdown site (only <name>.mp3; the tracks aren't in the client repository).
        ["music"] = "https://play.pokemonshowdown.com/audio/",
    };

    private static readonly IReadOnlyDictionary<string, string> ContentTypes = new Dictionary<string, string>
    {
        [".png"] = "image/png",
        [".gif"] = "image/gif",
        [".ogg"] = "audio/ogg",
        [".jpg"] = "image/jpeg",
        [".mp3"] = "audio/mpeg",
    };

    private readonly ConcurrentDictionary<string, SemaphoreSlim> _locks = new();

    [GeneratedRegex(@"^[a-z0-9][a-z0-9\-/]{0,120}\.(png|gif|ogg|jpg|mp3)$")]
    private static partial Regex SafePath();

    [GeneratedRegex(@"^fx/[a-z0-9\-]{1,40}\.(png|jpg)$")]
    private static partial Regex BattleBackground();

    [GeneratedRegex(@"^[a-z0-9\-]{1,40}\.mp3$")]
    private static partial Regex MusicTrack();

    public bool Enabled => options.Value.CacheAssets;

    /// <summary>The kinds of cached asset, as used in "kind/path" strings.</summary>
    public static IEnumerable<string> Kinds => Upstream.Keys;

    private static bool Allowed(string kind, string path)
    {
        if (!Upstream.ContainsKey(kind) || !SafePath().IsMatch(path) || path.Contains("//"))
            return false;
        var isMp3 = Path.GetExtension(path).Equals(".mp3", StringComparison.Ordinal);
        return kind switch
        {
            "battlebg" => BattleBackground().IsMatch(path),
            "music" => isMp3 && MusicTrack().IsMatch(path),
            _ => !isMp3,
        };
    }

    private string? FileFor(string kind, string path)
    {
        var root = Path.GetFullPath(Path.Combine(db.DataDirectory, "cache", kind));
        var file = Path.GetFullPath(Path.Combine(root, path));
        return file.StartsWith(root + Path.DirectorySeparatorChar, StringComparison.Ordinal) ? file : null;
    }

    public async Task<IResult> ServeAsync(string kind, string path, HttpContext http, CancellationToken ct)
    {
        if (!Allowed(kind, path))
            return Results.NotFound();

        if (!Enabled)
            return Results.Redirect(Upstream[kind] + path);

        var (state, _) = await EnsureAsync(kind, path, ct);
        switch (state)
        {
            case AssetState.Rejected or AssetState.Missing:
                return Results.NotFound();
            case AssetState.Failed:
                return Results.StatusCode(StatusCodes.Status502BadGateway);
        }

        // Sprites, cries, backgrounds and music never change for a given path.
        http.Response.Headers.CacheControl = "public, max-age=2592000, immutable";
        return TypedResults.PhysicalFile(FileFor(kind, path)!, ContentTypes[Path.GetExtension(path)], enableRangeProcessing: true);
    }

    /// <summary>
    /// Makes sure one asset is on disk, downloading it the first time. Misses are remembered with a ".missing"
    /// marker so a fallback chain doesn't ask upstream again.
    /// </summary>
    public async Task<(AssetState State, long Bytes)> EnsureAsync(string kind, string path, CancellationToken ct)
    {
        if (!Allowed(kind, path) || FileFor(kind, path) is not { } file)
            return (AssetState.Rejected, 0);

        var missingMarker = file + ".missing";
        if (File.Exists(file))
            return (AssetState.Cached, new FileInfo(file).Length);
        if (File.Exists(missingMarker))
            return (AssetState.Missing, 0);

        var gate = _locks.GetOrAdd(file, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(ct);
        try
        {
            if (File.Exists(file))
                return (AssetState.Cached, new FileInfo(file).Length);
            if (File.Exists(missingMarker))
                return (AssetState.Missing, 0);
            if (!await DownloadAsync(Upstream[kind] + path, file, missingMarker, ct))
                return (AssetState.Failed, 0);
        }
        finally
        {
            gate.Release();
            _locks.TryRemove(file, out _);
        }

        return File.Exists(file) ? (AssetState.Downloaded, new FileInfo(file).Length) : (AssetState.Missing, 0);
    }

    /// <returns>False when the download failed (network or upstream error); true when the file or a miss marker is now on disk.</returns>
    private async Task<bool> DownloadAsync(string url, string file, string missingMarker, CancellationToken ct)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(file)!);
        var client = httpClientFactory.CreateClient(HttpClientName);

        try
        {
            using var response = await client.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct);

            if (response.StatusCode == HttpStatusCode.NotFound)
            {
                await File.WriteAllTextAsync(missingMarker, "", ct);
                return true;
            }

            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Upstream returned {Status} for {Url}", (int)response.StatusCode, url);
                return false;
            }

            var temp = $"{file}.{Guid.NewGuid():N}.tmp";
            await using (var output = File.Create(temp))
            {
                await response.Content.CopyToAsync(output, ct);
            }
            File.Move(temp, file, overwrite: true);
            return true;
        }
        catch (HttpRequestException ex)
        {
            logger.LogWarning(ex, "Could not download {Url}", url);
            return false;
        }
        catch (TaskCanceledException) when (!ct.IsCancellationRequested)
        {
            logger.LogWarning("Timed out downloading {Url}", url);
            return false;
        }
    }
}

public enum AssetState { Cached, Downloaded, Missing, Failed, Rejected }
