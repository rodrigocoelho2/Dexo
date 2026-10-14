using System.Collections.Concurrent;
using System.ComponentModel;
using System.Diagnostics;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace LivingDex.WebApi.Features.Battles.Services;

/// <summary>
/// Runs the Pokémon Showdown simulator (Simulator/bridge.js on Node.js) as a child process and talks to it
/// with one JSON object per line. Every battle lives inside that one process. If it crashes it is
/// started again, and the battles that were running are reported as aborted.
/// </summary>
/// <param name="options">The LivingDex options.</param>
/// <param name="env">The hosting environment.</param>
/// <param name="logger">Logger.</param>
internal sealed class SimulatorHost(IOptions<LivingDexOptions> options, IHostEnvironment env, ILogger<SimulatorHost> logger) : BackgroundService
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private readonly SemaphoreSlim _writeGate = new(1, 1);
    private readonly ConcurrentDictionary<string, TaskCompletionSource<JsonElement>> _requests = new(StringComparer.Ordinal);
    private Process? _process;
    private volatile bool _ready;

    /// <summary>True while the simulator process is running and has said it's ready.</summary>
    public bool Available => _ready;

    /// <summary>Why the simulator isn't running, for the status endpoint and the logs.</summary>
    public string? Problem { get; private set; }

    /// <summary>Called for every message from the simulator, one at a time and in order.</summary>
    public Func<JsonElement, Task>? OnMessage { get; set; }

    /// <summary>Called after the simulator process died, so running battles can be closed.</summary>
    public Func<Task>? OnRestart { get; set; }

    /// <inheritdoc />
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!options.Value.ShowdownEnabled)
        {
            Problem = "Showdown is turned off (LivingDex:ShowdownEnabled=false).";
            return;
        }

        var simDirectory = Path.GetFullPath(options.Value.SimDirectory, env.ContentRootPath);
        var bridge = Path.Combine(simDirectory, "bridge.js");
        if (!File.Exists(bridge) || !Directory.Exists(Path.Combine(simDirectory, "node_modules", "pokemon-showdown")))
        {
            Problem = $"Simulator not found in {simDirectory} (run 'npm ci' there, or use the Docker image).";
            logger.LogWarning("Showdown disabled: {Problem}", Problem);
            return;
        }

        var failures = 0;
        while (!stoppingToken.IsCancellationRequested)
        {
            var started = DateTimeOffset.UtcNow;
            try
            {
                await RunOnceAsync(simDirectory, stoppingToken);
            }
            catch (Win32Exception ex)
            {
                Problem = $"Could not start Node.js ('{options.Value.NodePath}'): {ex.Message}";
                logger.LogWarning("Showdown disabled: {Problem}", Problem);
                return;
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Simulator bridge failed");
            }

            _ready = false;
            if (stoppingToken.IsCancellationRequested)
                return;

            if (OnRestart is not null)
            {
                try { await OnRestart(); }
                catch (Exception ex) { logger.LogError(ex, "Could not close battles after a simulator crash"); }
            }

            failures = DateTimeOffset.UtcNow - started > TimeSpan.FromMinutes(1) ? 1 : failures + 1;
            var delay = TimeSpan.FromSeconds(Math.Min(60, 2 * failures));
            logger.LogWarning("Simulator stopped; starting it again in {Delay}s", delay.TotalSeconds);
            await Task.Delay(delay, stoppingToken);
        }
    }

    private async Task RunOnceAsync(string simDirectory, CancellationToken ct)
    {
        var psi = new ProcessStartInfo(options.Value.NodePath)
        {
            WorkingDirectory = simDirectory,
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            StandardOutputEncoding = Encoding.UTF8,
            StandardErrorEncoding = Encoding.UTF8,
        };
        psi.ArgumentList.Add("--max-old-space-size=384");
        psi.ArgumentList.Add("bridge.js");
        psi.Environment["NODE_ENV"] = "production";

        using var process = Process.Start(psi) ?? throw new InvalidOperationException("Node.js did not start.");
        process.StandardInput.AutoFlush = true;
        _process = process;

        using var registration = ct.Register(() => { try { process.Kill(entireProcessTree: true); } catch { /* already gone */ } });

        _ = Task.Run(async () =>
        {
            while (await process.StandardError.ReadLineAsync(ct) is { } line)
                logger.LogWarning("sim: {Line}", line);
        }, ct);

        while (await process.StandardOutput.ReadLineAsync(ct) is { } line)
        {
            if (string.IsNullOrWhiteSpace(line))
                continue;

            JsonDocument doc;
            try { doc = JsonDocument.Parse(line); }
            catch (JsonException) { logger.LogWarning("sim (not json): {Line}", line); continue; }

            using (doc)
            {
                var root = doc.RootElement;
                var type = root.TryGetProperty("type", out var t) ? t.GetString() : null;
                if (type == "ready")
                {
                    _ready = true;
                    Problem = null;
                    logger.LogInformation("Showdown simulator ready");
                    continue;
                }
                if (type == "error")
                    logger.LogWarning("sim error: {Message}", root.TryGetProperty("message", out var m) ? m.GetString() : line);

                // The answer to a RequestAsync call goes back to its caller, not to the battles.
                if (root.TryGetProperty("id", out var idElement) && idElement.ValueKind == JsonValueKind.String &&
                    idElement.GetString() is { } requestId && _requests.TryRemove(requestId, out var waiting))
                {
                    waiting.TrySetResult(root.Clone());
                    continue;
                }

                if (OnMessage is not null)
                {
                    try { await OnMessage(root); }
                    catch (Exception ex) { logger.LogError(ex, "Error handling simulator message {Type}", type); }
                }
            }
        }

        await process.WaitForExitAsync(CancellationToken.None);
        _process = null;
        Problem = $"Simulator exited with code {process.ExitCode}.";
    }

    /// <summary>
    /// Sends a message and waits for the simulator's answer with the same id (not a battle id).
    /// </summary>
    /// <param name="id">A unique id for this request; the message must carry it as "id".</param>
    /// <param name="message">The message.</param>
    /// <param name="timeout">How long to wait.</param>
    /// <returns>The answer.</returns>
    /// <exception cref="TimeoutException">The simulator did not answer in time.</exception>
    public async Task<JsonElement> RequestAsync(string id, object message, TimeSpan timeout)
    {
        var waiting = new TaskCompletionSource<JsonElement>(TaskCreationOptions.RunContinuationsAsynchronously);
        _requests[id] = waiting;
        try
        {
            await SendAsync(message);
            return await waiting.Task.WaitAsync(timeout);
        }
        finally
        {
            _requests.TryRemove(id, out _);
        }
    }

    /// <summary>
    /// Sends one message to the simulator.
    /// </summary>
    /// <param name="message">The message (serialized as one JSON line).</param>
    /// <returns>A task that completes when written.</returns>
    public async Task SendAsync(object message)
    {
        var process = _process;
        if (process is null || !_ready)
            throw new InvalidOperationException("The battle simulator isn't running.");

        var line = JsonSerializer.Serialize(message, Json);
        await _writeGate.WaitAsync();
        try
        {
            await process.StandardInput.WriteLineAsync(line);
        }
        finally
        {
            _writeGate.Release();
        }
    }
}
