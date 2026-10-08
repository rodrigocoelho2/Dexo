namespace LivingDex.Assets;

/// <summary>
/// Downloads a list of assets into the cache in the background (admin "Download all assets").
/// Each item is a fallback chain of "kind/path" strings: the first one that exists upstream is kept.
/// One run at a time; it keeps going if the admin closes the page and stops when the app shuts down.
/// </summary>
public sealed class AssetPrefetcher(AssetCache cache, IHostApplicationLifetime lifetime, TimeProvider time, ILogger<AssetPrefetcher> logger)
{
    public const int MaxItems = 60_000;
    public const int MaxChain = 5;
    private const int Parallelism = 6;

    public sealed record Status(bool Running, int Total, int Done, int Downloaded, int Cached, int Missing, int Failed,
        long Bytes, string? StartedAt, string? FinishedAt, bool Cancelled);

    private readonly Lock _gate = new();
    private CancellationTokenSource? _cts;
    private int _total, _done, _downloaded, _cached, _missing, _failed;
    private long _bytes;
    private string? _startedAt, _finishedAt;
    private bool _running, _cancelled;

    public Status Snapshot()
    {
        lock (_gate)
            return new Status(_running, _total, Volatile.Read(ref _done), Volatile.Read(ref _downloaded), Volatile.Read(ref _cached),
                Volatile.Read(ref _missing), Volatile.Read(ref _failed), Interlocked.Read(ref _bytes), _startedAt, _finishedAt, _cancelled);
    }

    /// <returns>Null when started, otherwise why not.</returns>
    public string? Start(IReadOnlyList<string[]> items)
    {
        if (!cache.Enabled) return "Asset caching is turned off (LivingDex__CacheAssets), so there is nothing to download.";
        if (items.Count == 0) return "Nothing to download.";
        if (items.Count > MaxItems) return $"At most {MaxItems} items per run.";

        var parsed = new List<(string Kind, string Path)[]>(items.Count);
        var kinds = AssetCache.Kinds.ToHashSet();
        foreach (var chain in items)
        {
            if (chain is null || chain.Length is 0 or > MaxChain) return "Each item needs 1 to 5 paths.";
            var links = new (string, string)[chain.Length];
            for (var i = 0; i < chain.Length; i++)
            {
                var slash = chain[i]?.IndexOf('/') ?? -1;
                if (slash <= 0 || !kinds.Contains(chain[i]![..slash])) return $"Unknown asset: {chain[i]}";
                links[i] = (chain[i]![..slash], chain[i]![(slash + 1)..]);
            }
            parsed.Add(links);
        }

        lock (_gate)
        {
            if (_running) return "A download is already running.";
            _running = true; _cancelled = false;
            _total = parsed.Count; _done = _downloaded = _cached = _missing = _failed = 0; _bytes = 0;
            _startedAt = time.GetUtcNow().ToString("O"); _finishedAt = null;
            _cts = CancellationTokenSource.CreateLinkedTokenSource(lifetime.ApplicationStopping);
        }

        var token = _cts.Token;
        _ = Task.Run(() => RunAsync(parsed, token));
        return null;
    }

    public bool Cancel()
    {
        lock (_gate)
        {
            if (!_running || _cts is null) return false;
            _cancelled = true; _cts.Cancel(); return true;
        }
    }

    private async Task RunAsync(List<(string Kind, string Path)[]> items, CancellationToken ct)
    {
        try
        {
            await Parallel.ForEachAsync(items, new ParallelOptions { MaxDegreeOfParallelism = Parallelism, CancellationToken = ct }, async (chain, token) =>
            {
                var outcome = AssetState.Missing;
                foreach (var (kind, path) in chain)
                {
                    var (state, bytes) = await cache.EnsureAsync(kind, path, token);
                    if (state is AssetState.Missing or AssetState.Rejected) continue;
                    outcome = state;
                    if (state == AssetState.Downloaded) Interlocked.Add(ref _bytes, bytes);
                    break;
                }
                switch (outcome)
                {
                    case AssetState.Downloaded: Interlocked.Increment(ref _downloaded); break;
                    case AssetState.Cached: Interlocked.Increment(ref _cached); break;
                    case AssetState.Failed: Interlocked.Increment(ref _failed); break;
                    default: Interlocked.Increment(ref _missing); break;
                }
                Interlocked.Increment(ref _done);
            });
        }
        catch (OperationCanceledException) { }
        catch (Exception ex) { logger.LogError(ex, "Asset download stopped"); }
        finally
        {
            lock (_gate)
            {
                _running = false; _finishedAt = time.GetUtcNow().ToString("O");
                _cts?.Dispose(); _cts = null;
            }
            var s = Snapshot();
            logger.LogInformation("Asset download finished: {Downloaded} downloaded, {Cached} already cached, {Missing} not upstream, {Failed} failed",
                s.Downloaded, s.Cached, s.Missing, s.Failed);
        }
    }
}
