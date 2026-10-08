using LivingDex.Library.Enums;
using LivingDex.Library.Services;
using LivingDex.WebApi.Extensions.Globalization;
using LivingDex.WebApi.Features.Assets.Models.DTOs;

namespace LivingDex.WebApi.Features.Assets.Services;

/// <summary>
/// Downloads a list of assets into the cache in the background. Each item is a fallback chain of "kind/path"
/// strings: the first one that exists upstream is kept. Stops when the app shuts down.
/// </summary>
/// <param name="assetStore">The asset store.</param>
/// <param name="globalizationHelper">Translations.</param>
/// <param name="lifetime">Stops the run on shutdown.</param>
/// <param name="timeProvider">Clock.</param>
/// <param name="logger">Logger.</param>
internal sealed class AssetPrefetchService(
    IAssetStore assetStore,
    IGlobalizationHelper globalizationHelper,
    IHostApplicationLifetime lifetime,
    TimeProvider timeProvider,
    ILogger<AssetPrefetchService> logger) : IAssetPrefetchService
{
    /// <summary>Most items in one run.</summary>
    public const int MaxItems = 60_000;

    /// <summary>Longest fallback chain.</summary>
    public const int MaxChain = 5;

    private const int Parallelism = 6;

    private readonly IAssetStore _assetStore = assetStore;
    private readonly IGlobalizationHelper _globalizationHelper = globalizationHelper;
    private readonly IHostApplicationLifetime _lifetime = lifetime;
    private readonly TimeProvider _timeProvider = timeProvider;
    private readonly ILogger<AssetPrefetchService> _logger = logger;

    private readonly Lock _gate = new();
    private CancellationTokenSource? _cts;
    private int _total, _done, _downloaded, _cached, _missing, _failed;
    private long _bytes;
    private DateTime? _startedAt, _finishedAt;
    private bool _running, _cancelled;

    /// <inheritdoc />
    public async Task<ServiceApiResponse<AssetDownloadStatusDTO>> StartAsync(AssetDownloadDTO request)
    {
        var items = request.Items ?? [];
        if (!_assetStore.CacheEnabled)
        {
            return await ProblemAsync(nameof(TranslationKeys.AssetDownloadDisabled));
        }

        if (items.Length == 0)
        {
            return await ProblemAsync(nameof(TranslationKeys.AssetNothingToDownload));
        }

        if (items.Length > MaxItems)
        {
            return await ProblemAsync(nameof(TranslationKeys.AssetTooManyItems), MaxItems);
        }

        var parsed = new List<(AssetKind Kind, string Path)[]>(items.Length);
        foreach (var chain in items)
        {
            if (chain is null || chain.Length is 0 or > MaxChain)
            {
                return await ProblemAsync(nameof(TranslationKeys.AssetBadChain), MaxChain);
            }

            var links = new (AssetKind, string)[chain.Length];
            for (var i = 0; i < chain.Length; i++)
            {
                var slash = chain[i]?.IndexOf('/') ?? -1;
                if (slash <= 0 || !_assetStore.TryParseKind(chain[i]![..slash], out var kind))
                {
                    return await ProblemAsync(nameof(TranslationKeys.AssetUnknown), chain[i] ?? string.Empty);
                }

                links[i] = (kind, chain[i]![(slash + 1)..]);
            }

            parsed.Add(links);
        }

        CancellationToken token;
        lock (_gate)
        {
            if (_running)
            {
                token = CancellationToken.None;
            }
            else
            {
                _running = true;
                _cancelled = false;
                _total = parsed.Count;
                _done = _downloaded = _cached = _missing = _failed = 0;
                _bytes = 0;
                _startedAt = _timeProvider.GetUtcNow().UtcDateTime;
                _finishedAt = null;
                _cts = CancellationTokenSource.CreateLinkedTokenSource(_lifetime.ApplicationStopping);
                token = _cts.Token;
            }
        }

        if (!token.CanBeCanceled)
        {
            return await ProblemAsync(nameof(TranslationKeys.AssetAlreadyRunning));
        }

        _ = Task.Run(() => RunAsync(parsed, token));
        return ServiceApiResponse<AssetDownloadStatusDTO>.Accepted(Snapshot());
    }

    /// <inheritdoc />
    public Task<ServiceApiResponse<AssetDownloadStatusDTO>> StatusAsync() =>
        Task.FromResult(ServiceApiResponse<AssetDownloadStatusDTO>.Success(Snapshot()));

    /// <inheritdoc />
    public async Task<ServiceApiResponse<string>> CancelAsync()
    {
        lock (_gate)
        {
            if (_running && _cts is not null)
            {
                _cancelled = true;
                _cts.Cancel();
                return ServiceApiResponse<string>.Success();
            }
        }

        return await _globalizationHelper.NotFoundAsync<string>("download");
    }

    private AssetDownloadStatusDTO Snapshot()
    {
        lock (_gate)
        {
            return new AssetDownloadStatusDTO
            {
                Running = _running,
                Total = _total,
                Done = Volatile.Read(ref _done),
                Downloaded = Volatile.Read(ref _downloaded),
                Cached = Volatile.Read(ref _cached),
                Missing = Volatile.Read(ref _missing),
                Failed = Volatile.Read(ref _failed),
                Bytes = Interlocked.Read(ref _bytes),
                StartedAt = _startedAt,
                FinishedAt = _finishedAt,
                Cancelled = _cancelled,
            };
        }
    }

    private async Task<ServiceApiResponse<AssetDownloadStatusDTO>> ProblemAsync(string messageKey, params object[] arguments) =>
        await _globalizationHelper.ValidationProblemAsync<AssetDownloadStatusDTO>("items", messageKey, arguments);

    private async Task RunAsync(List<(AssetKind Kind, string Path)[]> items, CancellationToken cancellationToken)
    {
        try
        {
            await Parallel.ForEachAsync(items, new ParallelOptions { MaxDegreeOfParallelism = Parallelism, CancellationToken = cancellationToken }, async (chain, token) =>
            {
                var outcome = AssetState.Missing;
                foreach (var (kind, path) in chain)
                {
                    var (state, bytes) = await _assetStore.EnsureAsync(kind, path, token);
                    if (state is AssetState.Missing or AssetState.Rejected)
                    {
                        continue;
                    }

                    outcome = state;
                    if (state == AssetState.Downloaded)
                    {
                        Interlocked.Add(ref _bytes, bytes);
                    }

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
        catch (OperationCanceledException)
        {
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Asset download stopped");
        }
        finally
        {
            lock (_gate)
            {
                _running = false;
                _finishedAt = _timeProvider.GetUtcNow().UtcDateTime;
                _cts?.Dispose();
                _cts = null;
            }

            var status = Snapshot();
            _logger.LogInformation(
                "Asset download finished: {Downloaded} downloaded, {Cached} already on disk, {Missing} not upstream, {Failed} failed",
                status.Downloaded, status.Cached, status.Missing, status.Failed);
        }
    }
}
