using System.Collections.Concurrent;
using System.Globalization;
using System.Text.Json;
using LivingDex.Library.Enums;
using LivingDex.Library.Services;
using LivingDex.WebApi.Extensions.Globalization;
using LivingDex.WebApi.Features.Battles.Services;
using LivingDex.WebApi.Features.DailyRed.Models.DTOs;
using LivingDex.WebApi.Features.DailyRed.Models.Entities;
using LivingDex.WebApi.Features.DailyRed.Repositories;

namespace LivingDex.WebApi.Features.DailyRed.Services;

/// <summary>
/// Daily Red. The day is each trainer's own local date (the page sends it), so the team changes at their
/// midnight; everyone with the same date gets the same team. Battles run in the Showdown simulator.
/// </summary>
/// <param name="dailyRedRepository">Daily Red data access.</param>
/// <param name="sim">The simulator (makes the day's team).</param>
/// <param name="battleManager">The live battles.</param>
/// <param name="globalizationHelper">Translations.</param>
/// <param name="clock">Clock.</param>
/// <param name="logger">Logger.</param>
internal sealed class DailyRedService(
    IDailyRedRepository dailyRedRepository,
    SimulatorHost sim,
    BattleManager battleManager,
    IGlobalizationHelper globalizationHelper,
    TimeProvider clock,
    ILogger<DailyRedService> logger) : IDailyRedService
{
    /// <summary>Daily Red No. 1.</summary>
    public static readonly DateTime FirstDay = new(2026, 10, 14, 0, 0, 0, DateTimeKind.Unspecified);

    private readonly IDailyRedRepository _dailyRedRepository = dailyRedRepository;
    private readonly SimulatorHost _sim = sim;
    private readonly BattleManager _battleManager = battleManager;
    private readonly IGlobalizationHelper _globalizationHelper = globalizationHelper;
    private readonly TimeProvider _clock = clock;
    private readonly ILogger<DailyRedService> _logger = logger;
    private readonly ConcurrentDictionary<DateTime, JsonElement> _days = new();
    private readonly ConcurrentDictionary<DateTime, JsonElement> _views = new();
    private readonly SemaphoreSlim _making = new(1, 1);

    /// <summary>
    /// Reads the date the page sent. Clocks around the world are at most a day ahead of or behind UTC.
    /// </summary>
    /// <param name="date">yyyy-MM-dd.</param>
    /// <param name="utcNow">The current UTC time.</param>
    /// <param name="day">The day.</param>
    /// <returns>False when it isn't anybody's today.</returns>
    public static bool TryParseDay(string? date, DateTime utcNow, out DateTime day)
    {
        day = default;
        if (!DateTime.TryParseExact(date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
        {
            return false;
        }

        var today = utcNow.Date;
        if (parsed.Date < today.AddDays(-1) || parsed.Date > today.AddDays(1))
        {
            return false;
        }

        day = parsed.Date;
        return true;
    }

    /// <summary>
    /// The Daily Red number of a day.
    /// </summary>
    /// <param name="day">The day.</param>
    /// <returns>1 for the first day.</returns>
    public static int NumberOf(DateTime day) => Math.Max(1, (int)(day.Date - FirstDay).TotalDays + 1);

    /// <inheritdoc />
    public async Task<ServiceApiResponse<DailyRedDTO>> GetAsync(long userId, string? date)
    {
        if (!TryParseDay(date, _clock.GetUtcNow().UtcDateTime, out var day))
        {
            return await _globalizationHelper.ValidationProblemAsync<DailyRedDTO>("date", nameof(TranslationKeys.InvalidDailyDate));
        }

        var team = await TeamAsync(day);
        var view = await ViewAsync(day, team);
        var mine = await _dailyRedRepository.ListByUserAsync(userId);
        var running = await _battleManager.DailyBattleOfAsync(userId);
        var today = mine.FirstOrDefault(r => r.DayKey?.Date == day);

        // An official battle that has no live battle any more was stopped by a restart: the day is free again.
        if (today is { Status: DailyRedResult.Playing } && running?.BattleId != today.BattleID)
        {
            await _dailyRedRepository.ReleaseAsync(userId, day, today.BattleID ?? string.Empty);
            mine.Remove(today);
            today = null;
        }

        var dto = new DailyRedDTO
        {
            No = NumberOf(day),
            Date = day.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            Available = _sim.Available,
            Team = Part(team, "team"),
            Red = Part(view, "red") ?? Part(team, "red"),
            Matchups = Part(view, "matchups") ?? Part(team, "matchups"),
            Official = Official(today),
            RunningBattleId = running?.BattleId,
            RunningOfficial = running?.Official ?? false,
            Stats = DailyRedStats.Compute(mine, day),
        };

        var finished = today is { Status: DailyRedResult.Won or DailyRedResult.Lost };
        foreach (var row in await _dailyRedRepository.ListByDayAsync(day))
        {
            var status = Status(row.Status, row.BattleID);
            var hidden = row.UserID != userId && !finished && status is "won" or "lost";
            dto.Trainers.Add(new DailyRedTrainerDTO
            {
                UserId = row.UserID,
                Name = row.Username ?? string.Empty,
                Status = hidden ? "played" : status,
                Turns = hidden ? 0 : row.Turns ?? 0,
                Left = hidden ? 0 : row.MonsLeft ?? 0,
                RedLeft = hidden ? 0 : row.RedLeft ?? 0,
            });
        }

        return ServiceApiResponse<DailyRedDTO>.Success(dto);
    }

    /// <inheritdoc />
    public async Task<(string? Error, string? BattleId)> StartAsync(long userId, string name, string? date, bool practice, int lead)
    {
        if (!TryParseDay(date, _clock.GetUtcNow().UtcDateTime, out var day))
        {
            return (await _globalizationHelper.TranslateAsync(nameof(TranslationKeys.InvalidDailyDate)), null);
        }

        if (!_sim.Available)
        {
            return ("The battle simulator isn't running.", null);
        }

        if (await _battleManager.DailyBattleOfAsync(userId) is { } running)
        {
            return (null, running.BattleId);   // finish the one in progress first
        }

        var team = await TeamAsync(day);
        if (team is not { } t || !t.TryGetProperty("sets", out var sets) || sets.GetArrayLength() == 0)
        {
            return ("Today's team isn't ready. Try again in a moment.", null);
        }

        var all = sets.EnumerateArray().ToList();
        lead = Math.Clamp(lead, 0, all.Count - 1);
        var ordered = all.Skip(lead).Take(1).Concat(all.Where((_, i) => i != lead)).ToArray();

        var battleId = Guid.NewGuid().ToString("N")[..16];
        if (!practice)
        {
            var today = (await _dailyRedRepository.ListByUserAsync(userId)).FirstOrDefault(r => r.DayKey?.Date == day);
            if (today is { Status: DailyRedResult.Won or DailyRedResult.Lost })
            {
                return ("You already battled Red today. Practice runs are unlimited.", null);
            }

            if (today is not null)
            {
                await _dailyRedRepository.ReleaseAsync(userId, day, today.BattleID ?? string.Empty);
            }

            if (!await _dailyRedRepository.StartAsync(userId, day, battleId, _clock.GetUtcNow().UtcDateTime))
            {
                return ("You already battled Red today.", null);
            }
        }

        var (error, id) = await _battleManager.StartDailyAsync(battleId, userId, name, day, !practice, ordered);
        if (!practice && (error is not null || id != battleId))
        {
            await _dailyRedRepository.ReleaseAsync(userId, day, battleId);
        }

        return (error, id);
    }

    private static JsonElement? Part(JsonElement? team, string name) =>
        team is { ValueKind: JsonValueKind.Object } t && t.TryGetProperty(name, out var part) ? part : null;

    private static string Status(byte? status, string? battleId) => battleId is null ? "none" : status switch
    {
        DailyRedResult.Won => "won",
        DailyRedResult.Lost => "lost",
        _ => "playing",
    };

    private static DailyRedOfficialDTO Official(DailyRedResult? row) => row is null ? new DailyRedOfficialDTO() : new DailyRedOfficialDTO
    {
        Status = Status(row.Status, row.BattleID),
        BattleId = row.BattleID,
        Turns = row.Turns ?? 0,
        Left = row.MonsLeft ?? 0,
        RedLeft = row.RedLeft ?? 0,
        Grid = row.Grid,
    };

    /// <summary>
    /// Red's team and the matchups as the simulator has them now (a stored day keeps the sets it was made with,
    /// but Red's sets can change with an update). Null when the simulator isn't there: the stored copy is used.
    /// </summary>
    private async Task<JsonElement?> ViewAsync(DateTime day, JsonElement? team)
    {
        if (_views.TryGetValue(day, out var cached))
        {
            return cached;
        }

        if (!_sim.Available || Part(team, "sets") is not { } sets)
        {
            return null;
        }

        try
        {
            var id = "dayview-" + Guid.NewGuid().ToString("N")[..10];
            var reply = await _sim.RequestAsync(id, new { op = "dayview", id, sets }, TimeSpan.FromSeconds(10));
            if (reply.GetProperty("type").GetString() != "dayview")
            {
                return null;
            }

            foreach (var old in _views.Keys.Where(k => k < day.AddDays(-3)).ToList())
            {
                _views.TryRemove(old, out _);
            }

            _views[day] = reply;
            return reply;
        }
        catch (Exception ex) when (ex is TimeoutException or InvalidOperationException or KeyNotFoundException)
        {
            _logger.LogWarning(ex, "Could not read Red's team for {Day}", day);
            return null;
        }
    }

    /// <summary>The day's team: from memory, then the database, otherwise made by the simulator and stored.</summary>
    private async Task<JsonElement?> TeamAsync(DateTime day)
    {
        if (_days.TryGetValue(day, out var cached))
        {
            return cached;
        }

        var stored = await _dailyRedRepository.GetDayAsync(day);
        if (stored is null)
        {
            if (!_sim.Available)
            {
                return null;
            }

            await _making.WaitAsync();
            try
            {
                stored = await _dailyRedRepository.GetDayAsync(day) ?? await MakeAsync(day);
            }
            catch (Exception ex) when (ex is TimeoutException or InvalidOperationException or KeyNotFoundException or JsonException)
            {
                _logger.LogWarning(ex, "Could not make the Daily Red team for {Day}", day);
                return null;
            }
            finally
            {
                _making.Release();
            }

            if (stored is null)
            {
                return null;
            }
        }

        using var document = JsonDocument.Parse(stored);
        var team = document.RootElement.Clone();
        foreach (var old in _days.Keys.Where(k => k < day.AddDays(-3)).ToList())
        {
            _days.TryRemove(old, out _);
        }

        _days[day] = team;
        return team;
    }

    private async Task<string?> MakeAsync(DateTime day)
    {
        var id = "daily-" + Guid.NewGuid().ToString("N")[..10];
        var reply = await _sim.RequestAsync(id, new { op = "dailyteam", id, date = day.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) }, TimeSpan.FromSeconds(20));
        if (reply.GetProperty("type").GetString() != "dailyteam")
        {
            return null;
        }

        var json = JsonSerializer.Serialize(new
        {
            sets = reply.GetProperty("sets"),
            team = reply.GetProperty("team"),
            red = reply.GetProperty("red"),
            matchups = reply.GetProperty("matchups"),
        });
        return await _dailyRedRepository.SaveDayAsync(day, json);
    }
}
