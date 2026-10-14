// The nested records below are the SignalR wire format the page reads; they are described where they are built.
#pragma warning disable CS1591

using System.Text.Json;
using System.Text.RegularExpressions;
using LivingDex.WebApi.Features.Battles.Hubs;
using LivingDex.WebApi.Features.Battles.Models.Entities;
using LivingDex.WebApi.Features.Battles.Repositories;
using LivingDex.WebApi.Features.DailyRed.Models.Entities;
using LivingDex.WebApi.Features.DailyRed.Repositories;
using LivingDex.WebApi.Features.Trainers.Models;
using LivingDex.WebApi.Features.Trainers.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Options;

namespace LivingDex.WebApi.Features.Battles.Services;

/// <summary>
/// Everything live about Showdown: who is online, open challenges and running battles. State is kept in
/// memory (finished battles are written to the database) and every change goes through one async lock,
/// so messages from the simulator and from players are handled strictly one after another.
/// </summary>
internal sealed partial class BattleManager : BackgroundService
{
    public static readonly string[] Formats = ["gen5randombattle", "gen4randombattle", "gen3randombattle", "gen2randombattle", "gen1randombattle",
        "gen5draft", "gen4draft", "gen3draft", "gen2draft", "gen1draft"];

    /// <summary>Draft formats pick their teams from a shared pool before the battle; the battle itself runs as that gen's random battle.</summary>
    public static bool IsDraft(string format) => format.EndsWith("draft", StringComparison.Ordinal);
    private static string SimFormat(string format) => IsDraft(format) ? format[..^5] + "randombattle" : format;

    public static readonly string[] Backgrounds =
        ["beach", "city", "dampcave", "deepsea", "desert", "earthycave", "forest", "icecave", "meadow", "mountain", "river", "route", "thunderplains", "volcanocave"];

    private static readonly TimeSpan ChallengeLifetime = TimeSpan.FromSeconds(90);
    private static readonly TimeSpan OfflineGrace = TimeSpan.FromSeconds(20);
    private static readonly TimeSpan KeepFinished = TimeSpan.FromMinutes(10);
    private const int MaxAutoMoves = 3;

    /// <summary>Daily Red formats (not challengeable; the battle runs as a Gen 3 custom game against Red).</summary>
    public const string DailyFormat = "dailyred";

    /// <summary>A Daily Red practice run: same team, doesn't count.</summary>
    public const string DailyPracticeFormat = "dailyredpractice";

    // Daily Red has no turn timer (a battle can be continued later, on any device); one left alone this long is forfeited.
    private static readonly TimeSpan DailyIdle = TimeSpan.FromHours(6);

    private readonly SimulatorHost _sim;
    private readonly IHubContext<ShowdownHub> _hub;
    private readonly IBattleRepository _battleRepository;
    private readonly ITrainerService _trainerService;
    private readonly IDailyRedRepository _dailyRedRepository;
    private readonly IOptions<LivingDexOptions> _options;
    private readonly ILogger<BattleManager> _logger;
    private readonly TimeProvider _clock;
    private readonly SemaphoreSlim _gate = new(1, 1);

    private readonly Dictionary<long, Presence> _presence = [];
    private readonly Dictionary<string, Challenge> _challenges = [];
    private readonly Dictionary<string, Battle> _battles = [];

    /// <summary>
    /// Wires the manager to the simulator process.
    /// </summary>
    /// <param name="sim">The simulator process.</param>
    /// <param name="hub">The Showdown hub, to push messages to the pages.</param>
    /// <param name="battleRepository">Saves finished battles.</param>
    /// <param name="trainerService">Last-seen times and battle records.</param>
    /// <param name="dailyRedRepository">Saves Daily Red results.</param>
    /// <param name="options">The LivingDex options.</param>
    /// <param name="logger">Logger.</param>
    /// <param name="clock">Clock.</param>
    public BattleManager(SimulatorHost sim, IHubContext<ShowdownHub> hub, IBattleRepository battleRepository, ITrainerService trainerService,
        IDailyRedRepository dailyRedRepository, IOptions<LivingDexOptions> options, ILogger<BattleManager> logger, TimeProvider clock)
    {
        _sim = sim;
        _hub = hub;
        _battleRepository = battleRepository;
        _trainerService = trainerService;
        _dailyRedRepository = dailyRedRepository;
        _options = options;
        _logger = logger;
        _clock = clock;
        sim.OnMessage = OnSimMessageAsync;
        sim.OnRestart = OnSimRestartAsync;
    }

    private DateTimeOffset Now => _clock.GetUtcNow();
    private int TurnSeconds => Math.Clamp(_options.Value.TurnSeconds, 15, 600);

    public bool Available => _sim.Available;
    public string? Problem => _sim.Problem;

    // ------------------------------------------------------------------ models

    private sealed class Presence
    {
        public string Name = "";
        public int Connections;
        public DateTimeOffset? OfflineSince;
        public string? BattleId;
        public string? MatchId;
    }

    /// <summary>An accepted challenge: both trainers are in the room and press READY; the battle starts 3 s after both are ready.</summary>
    private sealed class Match
    {
        public required string Id;
        public required string Format;
        public required long[] Users;
        public required string[] Names;
        public readonly bool[] Ready = new bool[2];
        public required DateTimeOffset Created;
        public DateTimeOffset? StartsAt;
        public int Generation;
        public int Index(long userId) => Users[0] == userId ? 0 : Users[1] == userId ? 1 : -1;
    }

    public sealed record MatchPlayer(long UserId, string Name, bool Ready);
    public sealed record MatchItem(string Id, string Format, MatchPlayer[] Players, long StartsInMs);

    private static readonly TimeSpan ReadyCountdown = TimeSpan.FromSeconds(3);
    private static readonly TimeSpan MatchLifetime = TimeSpan.FromMinutes(10);
    private readonly Dictionary<string, Match> _matches = [];

    private MatchItem ToItem(Match m) => new(m.Id, m.Format,
        [new MatchPlayer(m.Users[0], m.Names[0], m.Ready[0]), new MatchPlayer(m.Users[1], m.Names[1], m.Ready[1])],
        m.StartsAt is { } t ? (long)Math.Max(0, (t - Now).TotalMilliseconds) : 0);

    private Task SendMatchAsync(Match m) =>
        _hub.Clients.Users(m.Users[0].ToString(), m.Users[1].ToString()).SendAsync("match", ToItem(m));

    private async Task CloseMatchAsync(Match m, string why, string? by)
    {
        _matches.Remove(m.Id);
        foreach (var u in m.Users)
            if (_presence.TryGetValue(u, out var p) && p.MatchId == m.Id) p.MatchId = null;
        await _hub.Clients.Users(m.Users[0].ToString(), m.Users[1].ToString()).SendAsync("matchClosed", new { id = m.Id, why, by });
        await BroadcastPresenceAsync();
    }

    private sealed record Challenge(string Id, long From, string FromName, long To, string ToName, string Format, DateTimeOffset Created);

    private sealed class Side
    {
        public required string Id;            // "p1" / "p2"
        public long? UserId;
        public required string Name;
        public bool Cpu;
        public readonly List<string> Log = [];
        public JsonElement? Request;
        public bool Pending;
        public DateTimeOffset? Deadline;
        public int AutoMoves;
    }

    private sealed class Battle
    {
        public required string Id;
        public required string Format;
        public required string Background;
        public required DateTime StartedAt;
        public required Side[] Sides;
        public readonly List<string> SpectatorLog = [];
        public int Turn;
        public bool Ended;
        public DateTimeOffset? EndedAt;
        public string? ForcedReason;
        public object? Result;
        public Draft? Draft;
        public DailyInfo? Daily;

        public Side? SideOf(long userId) => Sides.FirstOrDefault(s => s.UserId == userId);
        public Side Other(Side s) => Sides[s.Id == "p1" ? 1 : 0];
    }

    /// <summary>A Daily Red battle: one trainer against Red, official (counts, once a day) or practice.</summary>
    private sealed class DailyInfo
    {
        public required long UserId;
        public required DateTime Day;
        public required bool Official;
        public DateTimeOffset LastActive;
    }

    /// <summary>The Daily Red battle a trainer has running.</summary>
    /// <param name="BattleId">The battle.</param>
    /// <param name="Official">The official battle of the day (or a practice run).</param>
    /// <param name="Day">The trainer's day it belongs to.</param>
    public sealed record DailyRun(string BattleId, bool Official, DateTime Day);

    private readonly Dictionary<long, string> _daily = [];

    // ------------------------------------------------------------------ draft state

    private const int PoolSize = 16;
    private static readonly string[] PickOrder = ["p1", "p2", "p2", "p1", "p1", "p2", "p2", "p1", "p1", "p2", "p2", "p1"];
    private static readonly TimeSpan PickTime = TimeSpan.FromSeconds(30);
    private static readonly TimeSpan LeadTime = TimeSpan.FromSeconds(20);
    private static readonly TimeSpan CpuThink = TimeSpan.FromMilliseconds(1500);

    private sealed class Draft
    {
        public string Phase = "loading";          // loading → pick → lead → done
        public List<JsonElement> Pool = [];
        public int[] Owner = [];                  // 0 free, 1 p1, 2 p2
        public readonly List<int> Picks = [];
        public readonly int?[] Lead = new int?[2];
        public DateTimeOffset? Deadline;
        public string Turn => Picks.Count < PickOrder.Length ? PickOrder[Picks.Count] : "";
        public List<int> TeamOf(int side) => Picks.Where(i => Owner[i] == side + 1).ToList();
    }

    public sealed record PresenceItem(long UserId, string Status, string? BattleId);
    public sealed record ChallengeItem(string Id, long From, string FromName, long To, string ToName, string Format, long ExpiresInMs);
    public sealed record PlayerInfo(string Side, long? UserId, string Name, bool Cpu);

    // ------------------------------------------------------------------ helpers

    private static string Group(string battleId, string who) => $"battle:{battleId}:{who}";

    private async Task<T> Locked<T>(Func<Task<T>> body)
    {
        await _gate.WaitAsync();
        try { return await body(); }
        finally { _gate.Release(); }
    }

    private Task Locked(Func<Task> body) => Locked(async () => { await body(); return true; });

    private List<PresenceItem> PresenceList() =>
        _presence.Where(p => p.Value.Connections > 0 || p.Value.BattleId is not null)
            .Select(p => new PresenceItem(p.Key,
                p.Value.Connections == 0 ? "away" : p.Value.BattleId is not null ? "battle" : p.Value.MatchId is not null ? "match" : "online",
                p.Value.BattleId))
            .ToList();

    private Task BroadcastPresenceAsync() => _hub.Clients.All.SendAsync("presence", PresenceList());

    private ChallengeItem ToItem(Challenge c) =>
        new(c.Id, c.From, c.FromName, c.To, c.ToName, c.Format, (long)Math.Max(0, (c.Created + ChallengeLifetime - Now).TotalMilliseconds));

    private static PlayerInfo[] Players(Battle b) => b.Sides.Select(s => new PlayerInfo(s.Id, s.UserId, s.Name, s.Cpu)).ToArray();

    [GeneratedRegex(@"^(move [1-4]|switch [1-6]|default)$")]
    private static partial Regex ValidChoice();

    private static string NewId() => Guid.NewGuid().ToString("N")[..16];

    private bool IsBusy(long userId) => _presence.TryGetValue(userId, out var p) && (p.BattleId is not null || p.MatchId is not null);

    private bool IsOnline(long userId) => _presence.TryGetValue(userId, out var p) && p.Connections > 0;

    // ------------------------------------------------------------------ connections

    public sealed record Snapshot(bool Available, string? Problem, string[] Formats, int TurnSeconds, List<PresenceItem> Presence, List<ChallengeItem> Challenges, string? BattleId, MatchItem? Match);

    public Task<Snapshot> ConnectedAsync(long userId, string name) => Locked(async () =>
    {
        if (!_presence.TryGetValue(userId, out var p))
            _presence[userId] = p = new Presence();
        p.Name = name;
        p.Connections++;
        p.OfflineSince = null;
        await BroadcastPresenceAsync();
        var mine = _challenges.Values.Where(c => c.From == userId || c.To == userId).Select(ToItem).ToList();
        var match = p.MatchId is not null && _matches.TryGetValue(p.MatchId, out var mm) ? ToItem(mm) : null;
        return new Snapshot(Available, Problem, Formats, TurnSeconds, PresenceList(), mine, p.BattleId, match);
    });

    public Task DisconnectedAsync(long userId) => Locked(async () =>
    {
        if (!_presence.TryGetValue(userId, out var p))
            return;
        p.Connections = Math.Max(0, p.Connections - 1);
        if (p.Connections == 0)
        {
            p.OfflineSince = Now;
            try { await _trainerService.TouchAsync(userId); }
            catch (Exception ex) { _logger.LogWarning(ex, "Could not store last-seen time"); }
        }
        await BroadcastPresenceAsync();
    });

    // ------------------------------------------------------------------ challenges

    public Task<string?> ChallengeAsync(long from, string fromName, long to, string toName, string format) => Locked(async () =>
    {
        if (!Available) return "The battle simulator isn't running.";
        if (from == to) return "You can't challenge yourself.";
        if (!Formats.Contains(format)) return "Unknown format.";
        if (!IsOnline(to)) return $"{toName} isn't online.";
        if (IsBusy(from)) return "Finish your current battle first.";
        if (IsBusy(to)) return $"{toName} is in a battle.";
        if (_challenges.Values.Any(c => (c.From == from && c.To == to) || (c.From == to && c.To == from)))
            return "There's already a challenge between you two.";
        if (_challenges.Values.Count(c => c.From == from) >= 3)
            return "You have too many open challenges.";

        var c = new Challenge(NewId(), from, fromName, to, toName, format, Now);
        _challenges[c.Id] = c;
        var item = ToItem(c);
        await _hub.Clients.Users(from.ToString(), to.ToString()).SendAsync("challenge", item);
        return null;
    });

    private async Task DropChallengeAsync(Challenge c, string why)
    {
        _challenges.Remove(c.Id);
        await _hub.Clients.Users(c.From.ToString(), c.To.ToString()).SendAsync("challengeClosed", new { id = c.Id, why });
    }

    public Task<string?> CancelChallengeAsync(long userId, string id, bool decline) => Locked(async () =>
    {
        if (!_challenges.TryGetValue(id, out var c) || (c.From != userId && c.To != userId))
            return "That challenge is gone.";
        await DropChallengeAsync(c, decline && c.To == userId ? "declined" : "cancelled");
        return null;
    });

    public Task<(string? Error, string? BattleId)> AcceptChallengeAsync(long userId, string id) => Locked<(string?, string?)>(async () =>
    {
        if (!_challenges.TryGetValue(id, out var c) || c.To != userId)
            return ("That challenge is gone.", null);
        if (!Available) return ("The battle simulator isn't running.", null);
        if (!IsOnline(c.From))
        {
            await DropChallengeAsync(c, "offline");
            return ($"{c.FromName} went offline.", null);
        }
        if (IsBusy(c.From) || IsBusy(c.To))
            return ("One of you is already in a battle.", null);

        // Anything else either player had open is cancelled: they're busy now.
        foreach (var other in _challenges.Values.Where(x => x.Id != c.Id && (x.From == c.From || x.To == c.From || x.From == c.To || x.To == c.To)).ToList())
            await DropChallengeAsync(other, "busy");
        _challenges.Remove(c.Id);
        await _hub.Clients.Users(c.From.ToString(), c.To.ToString()).SendAsync("challengeClosed", new { id = c.Id, why = "accepted" });

        // Both go to the room: the battle starts once both press READY.
        var match = new Match { Id = NewId(), Format = c.Format, Users = [c.From, c.To], Names = [c.FromName, c.ToName], Created = Now };
        _matches[match.Id] = match;
        foreach (var u in match.Users)
        {
            if (!_presence.TryGetValue(u, out var pr)) _presence[u] = pr = new Presence { Name = u == c.From ? c.FromName : c.ToName };
            pr.MatchId = match.Id;
        }
        await SendMatchAsync(match);
        await BroadcastPresenceAsync();
        return (null, match.Id);
    });

    public Task<(string? Error, string? BattleId)> StartCpuAsync(long userId, string name, string format) => Locked<(string?, string?)>(async () =>
    {
        if (!Available) return ("The battle simulator isn't running.", null);
        if (!Formats.Contains(format)) return ("Unknown format.", null);
        if (_presence.TryGetValue(userId, out var p) && p.BattleId is not null)
            return (null, p.BattleId);   // already battling: go back to it
        if (p?.MatchId is not null) return ("Leave the battle room first.", null);
        foreach (var other in _challenges.Values.Where(x => x.From == userId || x.To == userId).ToList())
            await DropChallengeAsync(other, "busy");

        var cpuName = string.Equals(name, "CPU", StringComparison.OrdinalIgnoreCase) ? "CPU 2" : "CPU";
        var battle = await StartBattleAsync(format,
            new Side { Id = "p1", UserId = userId, Name = name },
            new Side { Id = "p2", UserId = null, Name = cpuName, Cpu = true });
        return (null, battle.Id);
    });

    public Task<string?> SetReadyAsync(long userId, string matchId, bool ready) => Locked<string?>(async () =>
    {
        if (!_matches.TryGetValue(matchId, out var m)) return "That room is closed.";
        var i = m.Index(userId);
        if (i < 0) return "You're not in this room.";
        if (!Available) return "The battle simulator isn't running.";
        m.Ready[i] = ready;
        m.Generation++;
        m.StartsAt = m.Ready[0] && m.Ready[1] ? Now + ReadyCountdown : null;
        await SendMatchAsync(m);
        if (m.StartsAt is not null)
        {
            var generation = m.Generation;
            _ = Task.Run(async () =>
            {
                await Task.Delay(ReadyCountdown);
                await Locked(async () =>
                {
                    if (!_matches.TryGetValue(matchId, out var mm) || mm.Generation != generation || !(mm.Ready[0] && mm.Ready[1])) return;
                    _matches.Remove(mm.Id);
                    foreach (var u in mm.Users)
                        if (_presence.TryGetValue(u, out var p) && p.MatchId == mm.Id) p.MatchId = null;
                    try
                    {
                        await StartBattleAsync(mm.Format,
                            new Side { Id = "p1", UserId = mm.Users[0], Name = mm.Names[0] },
                            new Side { Id = "p2", UserId = mm.Users[1], Name = mm.Names[1] });
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Could not start the battle for room {Id}", mm.Id);
                        await _hub.Clients.Users(mm.Users[0].ToString(), mm.Users[1].ToString()).SendAsync("matchClosed", new { id = mm.Id, why = "error", by = (string?)null });
                    }
                });
            });
        }
        return null;
    });

    public Task<string?> LeaveMatchAsync(long userId, string matchId) => Locked<string?>(async () =>
    {
        if (!_matches.TryGetValue(matchId, out var m) || m.Index(userId) < 0) return null;
        await CloseMatchAsync(m, "left", m.Names[m.Index(userId)]);
        return null;
    });

    // ------------------------------------------------------------------ Daily Red

    private DailyRun? DailyOf(long userId) =>
        _daily.TryGetValue(userId, out var id) && _battles.TryGetValue(id, out var b) && !b.Ended && b.Daily is { } d ? new DailyRun(id, d.Official, d.Day) : null;

    /// <summary>
    /// The Daily Red battle a trainer has running, if any.
    /// </summary>
    /// <param name="userId">The trainer.</param>
    /// <returns>The battle, or null.</returns>
    public Task<DailyRun?> DailyBattleOfAsync(long userId) => Locked(() => Task.FromResult(DailyOf(userId)));

    /// <summary>
    /// Starts a Daily Red battle: the trainer with the day's team (lead first) against Red. Daily Red doesn't make
    /// the trainer busy in Showdown, so they can still be challenged, and it has no turn timer.
    /// </summary>
    /// <param name="battleId">The new battle's identifier.</param>
    /// <param name="userId">The trainer.</param>
    /// <param name="name">The trainer's name.</param>
    /// <param name="day">The trainer's day.</param>
    /// <param name="official">The official battle of the day (or a practice run).</param>
    /// <param name="team">The six sets, in battle order.</param>
    /// <returns>The error, or the battle (the one already running, if there is one).</returns>
    public Task<(string? Error, string? BattleId)> StartDailyAsync(string battleId, long userId, string name, DateTime day, bool official, JsonElement[] team) =>
        Locked<(string?, string?)>(async () =>
        {
            if (!Available) return ("The battle simulator isn't running.", null);
            if (DailyOf(userId) is { } running) return (null, running.BattleId);

            // The simulator tells the winner by name: the trainer can't be called RED too.
            var playerName = string.Equals(name, "RED", StringComparison.OrdinalIgnoreCase) ? name + " (you)" : name;
            var battle = new Battle
            {
                Id = battleId,
                Format = official ? DailyFormat : DailyPracticeFormat,
                Background = "mtsilver",
                StartedAt = Now.UtcDateTime,
                Sides = [new Side { Id = "p1", UserId = userId, Name = playerName }, new Side { Id = "p2", UserId = null, Name = "RED", Cpu = true }],
                Daily = new DailyInfo { UserId = userId, Day = day.Date, Official = official, LastActive = Now },
            };
            _battles[battle.Id] = battle;
            _daily[userId] = battle.Id;
            try
            {
                await _sim.SendAsync(new
                {
                    op = "start",
                    id = battle.Id,
                    format = "gen3customgame",
                    p1 = new { name = playerName, cpu = false },
                    p2 = new { name = "RED", cpu = true, ai = "red" },
                    teams = new { p1 = team },
                });
            }
            catch (InvalidOperationException ex)
            {
                _battles.Remove(battle.Id);
                _daily.Remove(userId);
                return (ex.Message, null);
            }

            return (null, battle.Id);
        });

    private async Task FinishDailyAsync(Battle b, DailyInfo daily, JsonElement? msg)
    {
        var winnerName = msg?.TryGetProperty("winner", out var wn) == true ? wn.GetString() ?? "" : "";
        var winner = winnerName == "" ? 0 : b.Sides[0].Name == winnerName ? 1 : b.Sides[1].Name == winnerName ? 2 : 0;
        var turns = msg?.TryGetProperty("turns", out var tn) == true ? tn.GetInt32() : b.Turn;
        JsonElement? teams = msg?.TryGetProperty("teams", out var tm) == true ? tm.Clone() : null;
        int Left(int i) => teams is { } t && t.GetArrayLength() > i ? t[i].EnumerateArray().Count(p => !p.GetProperty("fainted").GetBoolean()) : 0;
        var grid = teams is { } tt && tt.GetArrayLength() > 0
            ? string.Concat(tt[0].EnumerateArray().Select(p => p.GetProperty("fainted").GetBoolean() ? '0' : '1'))
            : null;
        var reason = msg is null ? "aborted" : b.ForcedReason ?? "normal";

        if (daily.Official)
        {
            try
            {
                if (msg is null)
                    await _dailyRedRepository.ReleaseAsync(daily.UserId, daily.Day, b.Id);
                else
                    await _dailyRedRepository.FinishAsync(new DailyRedResult
                    {
                        UserID = daily.UserId,
                        DayKey = daily.Day,
                        BattleID = b.Id,
                        Status = winner == 1 ? DailyRedResult.Won : DailyRedResult.Lost,
                        Turns = turns,
                        MonsLeft = Left(0),
                        RedLeft = Left(1),
                        Grid = grid,
                        EndedAt = Now.UtcDateTime,
                    });
            }
            catch (Exception ex) { _logger.LogError(ex, "Could not save the Daily Red result of battle {Id}", b.Id); }
        }

        if (_daily.TryGetValue(daily.UserId, out var current) && current == b.Id)
            _daily.Remove(daily.UserId);

        b.Result = new
        {
            battleId = b.Id,
            format = b.Format,
            winner,
            reason,
            turns,
            cpu = true,
            players = Players(b),
            left = new[] { Left(0), Left(1) },
            teams,
            records = (object?)null,
            daily = new { official = daily.Official, day = daily.Day.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture), grid },
        };

        await _hub.Clients.Groups(Group(b.Id, "p1"), Group(b.Id, "spec")).SendAsync("battleEnd", b.Result);
        try { if (_sim.Available) await _sim.SendAsync(new { op = "end", id = b.Id }); }
        catch (InvalidOperationException) { /* simulator gone */ }
    }

    private async Task<Battle> StartBattleAsync(string format, Side p1, Side p2)
    {
        var battle = new Battle
        {
            Id = NewId(),
            Format = format,
            Background = Backgrounds[Random.Shared.Next(Backgrounds.Length)],
            StartedAt = Now.UtcDateTime,
            Sides = [p1, p2],
        };
        _battles[battle.Id] = battle;
        foreach (var s in battle.Sides.Where(s => s.UserId is not null))
        {
            if (!_presence.TryGetValue(s.UserId!.Value, out var p))
                _presence[s.UserId.Value] = p = new Presence { Name = s.Name };
            p.BattleId = battle.Id;
        }

        if (IsDraft(format))
        {
            battle.Draft = new Draft();
            await _sim.SendAsync(new { op = "pool", id = battle.Id, format = SimFormat(format), size = PoolSize });
        }
        else
            await _sim.SendAsync(new
            {
                op = "start",
                id = battle.Id,
                format,
                p1 = new { name = p1.Name, cpu = p1.Cpu },
                p2 = new { name = p2.Name, cpu = p2.Cpu },
            });

        var users = battle.Sides.Where(s => s.UserId is not null).Select(s => s.UserId!.Value.ToString()).ToList();
        await _hub.Clients.Users(users).SendAsync("battleStart", new { battleId = battle.Id, format, players = Players(battle) });
        await BroadcastPresenceAsync();
        return battle;
    }

    // ------------------------------------------------------------------ in battle

    public sealed record JoinResult(
        string? Error, string? BattleId, string? Role, string? Format, string? Background, PlayerInfo[]? Players,
        List<string>? Log, JsonElement? Request, bool Pending, long DeadlineMs, bool Ended, object? Result, bool OpponentChoosing = false,
        object? Draft = null);

    public Task<JoinResult> JoinAsync(long userId, string connectionId, string battleId) => Locked(async () =>
    {
        if (!_battles.TryGetValue(battleId, out var b))
            return new JoinResult("That battle has finished.", battleId, null, null, null, null, null, null, false, 0, true, null);

        var side = b.SideOf(userId);
        var role = side?.Id ?? "spectator";
        if (b.Daily is { } daily && side is not null) daily.LastActive = Now;
        await _hub.Groups.AddToGroupAsync(connectionId, Group(b.Id, side?.Id ?? "spec"));
        var log = side?.Log ?? b.SpectatorLog;
        return new JoinResult(null, b.Id, role, b.Format, b.Background, Players(b), [.. log],
            side?.Request, side?.Pending ?? false, DeadlineMs(side), b.Ended, b.Result,
            side is not null && b.Other(side) is { Cpu: false, Pending: true },
            b.Draft is { Phase: not "done" } ? DraftView(b, side?.Id) : null);
    });

    public Task LeaveAsync(string connectionId, string battleId) =>
        Task.WhenAll(
            _hub.Groups.RemoveFromGroupAsync(connectionId, Group(battleId, "spec")),
            _hub.Groups.RemoveFromGroupAsync(connectionId, Group(battleId, "p1")),
            _hub.Groups.RemoveFromGroupAsync(connectionId, Group(battleId, "p2")));

    private long DeadlineMs(Side? s) =>
        s?.Deadline is { } d ? (long)Math.Max(0, (d - Now).TotalMilliseconds) : 0;

    public Task<string?> ChooseAsync(long userId, string battleId, string choice) => Locked(async () =>
    {
        if (!_battles.TryGetValue(battleId, out var b) || b.Ended) return "That battle has finished.";
        var side = b.SideOf(userId);
        if (side is null) return "You're not in this battle.";
        if (b.Draft is { Phase: not "done" }) return "The draft isn't over yet.";
        if (!side.Pending) return "It's not your turn to choose.";
        if (!ValidChoice().IsMatch(choice ?? "")) return "That isn't a valid choice.";
        side.AutoMoves = 0;
        if (b.Daily is { } daily) daily.LastActive = Now;
        await _sim.SendAsync(new { op = "choose", id = b.Id, side = side.Id, choice });
        return null;
    });

    public Task<string?> ForfeitAsync(long userId, string battleId) => Locked(async () =>
    {
        if (!_battles.TryGetValue(battleId, out var b) || b.Ended) return "That battle has finished.";
        var side = b.SideOf(userId);
        if (side is null) return "You're not in this battle.";
        b.ForcedReason ??= "forfeit";
        if (b.Draft is { Phase: not "done" })
        {
            // No battle in the simulator yet: the other side simply wins.
            using var doc = JsonDocument.Parse(JsonSerializer.Serialize(new { winner = b.Other(side).Name, turns = 0 }));
            await FinishAsync(b, doc.RootElement.Clone());
            return null;
        }
        await _sim.SendAsync(new { op = "forfeit", id = b.Id, side = side.Id });
        return null;
    });

    // ------------------------------------------------------------------ draft

    private object DraftView(Battle b, string? who)
    {
        var d = b.Draft!;
        var mine = who switch { "p1" => d.Lead[0], "p2" => d.Lead[1], _ => null };
        return new
        {
            phase = d.Phase,
            pool = d.Pool,
            owner = d.Owner,
            order = PickOrder,
            pick = d.Picks.Count,
            picks = d.Picks,
            turn = d.Turn,
            deadlineMs = d.Deadline is { } t ? (long)Math.Max(0, (t - Now).TotalMilliseconds) : 0,
            lead = mine,
            leadReady = new[] { d.Lead[0] is not null, d.Lead[1] is not null },
        };
    }

    private async Task SendDraftAsync(Battle b)
    {
        foreach (var who in new[] { "p1", "p2", "spec" })
            await _hub.Clients.Group(Group(b.Id, who)).SendAsync("draft", new { battleId = b.Id, draft = DraftView(b, who == "spec" ? null : who) });
    }

    private void NextDeadline(Battle b)
    {
        var d = b.Draft!;
        var cpuTurn = d.Phase == "pick" && b.Sides[d.Turn == "p1" ? 0 : 1].Cpu;
        d.Deadline = d.Phase switch { "pick" => Now + (cpuTurn ? CpuThink : PickTime), "lead" => Now + LeadTime, _ => null };
    }

    private async Task PickAsync(Battle b, int index)
    {
        var d = b.Draft!;
        d.Owner[index] = d.Turn == "p1" ? 1 : 2;
        d.Picks.Add(index);
        if (d.Picks.Count >= PickOrder.Length)
        {
            d.Phase = "lead";
            for (var i = 0; i < 2; i++)
                if (b.Sides[i].Cpu) d.Lead[i] = d.TeamOf(i)[0];
        }
        NextDeadline(b);
        await SendDraftAsync(b);
        if (d.Phase == "lead" && d.Lead[0] is not null && d.Lead[1] is not null)
            await BeginDraftBattleAsync(b);
    }

    /// <summary>The CPU (and anyone who runs out of time) takes the strongest set left: random battles give stronger Pokémon lower levels.</summary>
    private static int AutoPick(Draft d, bool best)
    {
        var free = Enumerable.Range(0, d.Pool.Count).Where(i => d.Owner[i] == 0).ToList();
        if (!best) return free[Random.Shared.Next(free.Count)];
        return free.OrderBy(i => d.Pool[i].GetProperty("level").GetInt32() + Random.Shared.NextDouble() * 5).First();
    }

    public Task<string?> DraftPickAsync(long userId, string battleId, int index) => Locked<string?>(async () =>
    {
        if (!_battles.TryGetValue(battleId, out var b) || b.Ended || b.Draft is not { Phase: "pick" } d) return "The draft is over.";
        var side = b.SideOf(userId);
        if (side is null) return "You're not in this battle.";
        if (d.Turn != side.Id) return "It's not your pick.";
        if (index < 0 || index >= d.Pool.Count || d.Owner[index] != 0) return "That Pokémon is already taken.";
        await PickAsync(b, index);
        return null;
    });

    public Task<string?> DraftLeadAsync(long userId, string battleId, int index) => Locked<string?>(async () =>
    {
        if (!_battles.TryGetValue(battleId, out var b) || b.Ended || b.Draft is not { Phase: "lead" } d) return "The draft is over.";
        var side = b.SideOf(userId);
        if (side is null) return "You're not in this battle.";
        var i = side.Id == "p1" ? 0 : 1;
        if (!d.TeamOf(i).Contains(index)) return "That Pokémon isn't on your team.";
        d.Lead[i] = index;
        await SendDraftAsync(b);
        if (d.Lead[0] is not null && d.Lead[1] is not null)
            await BeginDraftBattleAsync(b);
        return null;
    });

    private async Task BeginDraftBattleAsync(Battle b)
    {
        var d = b.Draft!;
        if (d.Phase == "done") return;
        d.Phase = "done";
        d.Deadline = null;
        object Team(int i)
        {
            var team = d.TeamOf(i);
            var lead = d.Lead[i] ?? team[0];
            return team.OrderBy(x => x == lead ? 0 : 1).Select(x => d.Pool[x].GetProperty("set")).ToArray();
        }
        await _sim.SendAsync(new
        {
            op = "start",
            id = b.Id,
            format = SimFormat(b.Format),
            p1 = new { name = b.Sides[0].Name, cpu = b.Sides[0].Cpu },
            p2 = new { name = b.Sides[1].Name, cpu = b.Sides[1].Cpu },
            teams = new { p1 = Team(0), p2 = Team(1) },
        });
        await SendDraftAsync(b);
    }

    private async Task DraftTickAsync(Battle b)
    {
        var d = b.Draft!;
        if (d.Deadline is not { } t || Now < t) return;
        if (d.Phase == "pick")
        {
            var cpu = b.Sides[d.Turn == "p1" ? 0 : 1].Cpu;
            await PickAsync(b, AutoPick(d, best: cpu));
        }
        else if (d.Phase == "lead")
        {
            for (var i = 0; i < 2; i++) d.Lead[i] ??= d.TeamOf(i)[0];
            await BeginDraftBattleAsync(b);
        }
    }

    // ------------------------------------------------------------------ simulator → players

    private Task OnSimMessageAsync(JsonElement msg) => Locked(async () =>
    {
        if (!msg.TryGetProperty("id", out var idEl) || idEl.GetString() is not { } id || !_battles.TryGetValue(id, out var b))
            return;
        var type = msg.GetProperty("type").GetString();

        switch (type)
        {
            case "chunk":
            {
                var stream = msg.GetProperty("stream").GetString();
                var data = msg.GetProperty("data").GetString() ?? "";
                if (stream == "spectator")
                {
                    b.SpectatorLog.Add(data);
                    var turn = TurnRegex().Matches(data).LastOrDefault();
                    if (turn is not null) b.Turn = int.Parse(turn.Groups[1].Value, System.Globalization.CultureInfo.InvariantCulture);
                    await _hub.Clients.Group(Group(b.Id, "spec")).SendAsync("chunk", new { battleId = b.Id, data });
                }
                else if (stream is "p1" or "p2")
                {
                    var side = b.Sides[stream == "p1" ? 0 : 1];
                    side.Log.Add(data);
                    if (!side.Cpu)
                        await _hub.Clients.Group(Group(b.Id, stream)).SendAsync("chunk", new { battleId = b.Id, data });
                }
                break;
            }
            case "request":
            {
                var side = b.Sides[msg.GetProperty("side").GetString() == "p2" ? 1 : 0];
                var request = msg.GetProperty("request").Clone();
                var wait = request.TryGetProperty("wait", out var w) && w.ValueKind == JsonValueKind.True;
                side.Request = request;
                side.Pending = !wait;
                side.Deadline = !wait && !side.Cpu && b.Daily is null ? Now.AddSeconds(TurnSeconds) : null;
                if (!side.Cpu)
                {
                    await _hub.Clients.Group(Group(b.Id, side.Id)).SendAsync("request",
                        new { battleId = b.Id, request, pending = side.Pending, deadlineMs = DeadlineMs(side) });
                    if (side.Pending)
                        await _hub.Clients.Group(Group(b.Id, b.Other(side).Id)).SendAsync("opponent", new { battleId = b.Id, choosing = true });
                }
                break;
            }
            case "ack":
            {
                var side = b.Sides[msg.GetProperty("side").GetString() == "p2" ? 1 : 0];
                var ok = msg.GetProperty("ok").GetBoolean();
                if (ok)
                {
                    side.Pending = false;
                    side.Deadline = null;
                }
                if (!side.Cpu)
                    await _hub.Clients.Group(Group(b.Id, side.Id)).SendAsync("ack",
                        new { battleId = b.Id, ok, error = msg.TryGetProperty("error", out var e) ? e.GetString() : "" });
                if (ok)
                    await _hub.Clients.Group(Group(b.Id, b.Other(side).Id)).SendAsync("opponent", new { battleId = b.Id, choosing = false });
                break;
            }
            case "pool" when b.Draft is { Phase: "loading" } d:
            {
                d.Pool = msg.GetProperty("pool").EnumerateArray().Select(e => e.Clone()).ToList();
                if (d.Pool.Count < PickOrder.Length)
                {
                    _logger.LogWarning("Draft {Id}: pool too small ({Count})", b.Id, d.Pool.Count);
                    await FinishAsync(b, null);
                    break;
                }
                d.Owner = new int[d.Pool.Count];
                d.Phase = "pick";
                NextDeadline(b);
                await SendDraftAsync(b);
                break;
            }
            case "end":
                await FinishAsync(b, msg);
                break;
            case "error":
                _logger.LogWarning("Battle {Id}: {Message}", b.Id, msg.TryGetProperty("message", out var m) ? m.GetString() : "?");
                break;
        }
    });

    [GeneratedRegex(@"\|turn\|(\d+)")]
    private static partial Regex TurnRegex();

    private async Task FinishAsync(Battle b, JsonElement? msg)
    {
        if (b.Ended) return;
        b.Ended = true;
        b.EndedAt = Now;
        foreach (var s in b.Sides) { s.Pending = false; s.Deadline = null; }
        if (b.Daily is { } daily)
        {
            await FinishDailyAsync(b, daily, msg);
            return;
        }

        var winnerName = msg?.TryGetProperty("winner", out var wn) == true ? wn.GetString() ?? "" : "";
        var winner = winnerName == "" ? 0 : b.Sides[0].Name == winnerName ? 1 : b.Sides[1].Name == winnerName ? 2 : 0;
        var turns = msg?.TryGetProperty("turns", out var tn) == true ? tn.GetInt32() : b.Turn;
        JsonElement? teams = msg?.TryGetProperty("teams", out var tm) == true ? tm.Clone() : null;
        int Left(int i) => teams is { } t && t.GetArrayLength() > i ? t[i].EnumerateArray().Count(p => !p.GetProperty("fainted").GetBoolean()) : 0;
        var reason = msg is null ? "aborted" : b.ForcedReason ?? "normal";

        var row = new SavedBattle
        {
            BattleID = b.Id,
            Format = b.Format,
            P1UserID = b.Sides[0].UserId,
            P2UserID = b.Sides[1].UserId,
            P1Name = b.Sides[0].Name,
            P2Name = b.Sides[1].Name,
            IsCpu = b.Sides.Any(s => s.Cpu),
            Winner = winner,
            Reason = reason,
            Turns = turns,
            P1Left = Left(0),
            P2Left = Left(1),
            Teams = teams?.GetRawText(),
            Log = string.Join("\n", b.SpectatorLog),
            Background = b.Background,
            StartedAt = b.StartedAt,
            EndedAt = Now.UtcDateTime,
        };

        var (ko1, ko2) = BestKnockouts(b.SpectatorLog);
        row.P1BestKo = ko1;
        row.P2BestKo = ko2;
        try { await _battleRepository.SaveAsync(row); }
        catch (Exception ex) { _logger.LogError(ex, "Could not save battle {Id}", b.Id); }

        var records = new Dictionary<string, TrainerRecord>();
        foreach (var s in b.Sides.Where(s => s.UserId is not null))
        {
            try { records[s.Id] = await _trainerService.RecordAsync(s.UserId!.Value); }
            catch (Exception ex) { _logger.LogWarning(ex, "Could not read record"); }
        }

        b.Result = new
        {
            battleId = b.Id,
            format = b.Format,
            winner,
            reason,
            turns,
            cpu = row.IsCpu,
            players = Players(b),
            left = new[] { row.P1Left, row.P2Left },
            teams,
            records,
        };

        foreach (var s in b.Sides.Where(s => s.UserId is not null))
            if (_presence.TryGetValue(s.UserId!.Value, out var p) && p.BattleId == b.Id)
            {
                p.BattleId = null;
                if (p.Connections == 0) p.OfflineSince ??= Now;
            }

        await _hub.Clients.Groups(Group(b.Id, "p1"), Group(b.Id, "p2"), Group(b.Id, "spec")).SendAsync("battleEnd", b.Result);
        await BroadcastPresenceAsync();
        try { if (_sim.Available) await _sim.SendAsync(new { op = "end", id = b.Id }); }
        catch (InvalidOperationException) { /* simulator gone */ }
    }

    /// <summary>
    /// Most knockouts by a single Pokémon on each side, read from the battle log: a faint is credited to the
    /// last opposing Pokémon whose move hit the fainted one (residual damage keeps the last attacker's credit).
    /// </summary>
    internal static (int P1, int P2) BestKnockouts(IEnumerable<string> chunks)
    {
        static string Who(string ident) { var i = ident.IndexOf(':'); return i < 0 ? ident : ident[..2] + ident[i..]; }
        var lastHitBy = new Dictionary<string, string>(StringComparer.Ordinal);
        var kos = new Dictionary<string, int>(StringComparer.Ordinal);
        string? mover = null;
        foreach (var chunk in chunks)
        foreach (var line in chunk.Split('\n'))
        {
            var a = line.Split('|');
            if (a.Length < 3) continue;
            switch (a[1])
            {
                case "move":
                    mover = Who(a[2]);
                    break;
                case "-damage" when mover is not null && !line.Contains("[from]", StringComparison.Ordinal):
                {
                    var target = Who(a[2]);
                    if (target[..2] != mover[..2]) lastHitBy[target] = mover;
                    break;
                }
                case "faint":
                {
                    var target = Who(a[2]);
                    if (lastHitBy.TryGetValue(target, out var by)) kos[by] = kos.GetValueOrDefault(by) + 1;
                    break;
                }
                case "turn":
                case "upkeep":
                    mover = null;
                    break;
            }
        }
        int Best(string side) => kos.Where(k => k.Key.StartsWith(side, StringComparison.Ordinal)).Select(k => k.Value).DefaultIfEmpty(0).Max();
        return (Best("p1"), Best("p2"));
    }

    private Task OnSimRestartAsync() => Locked(async () =>
    {
        foreach (var b in _battles.Values.Where(b => !b.Ended).ToList())
            await FinishAsync(b, null);
    });

    // ------------------------------------------------------------------ timers

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(1));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try { await TickAsync(); }
            catch (Exception ex) { _logger.LogError(ex, "Showdown timer failed"); }
        }
    }

    private Task TickAsync() => Locked(async () =>
    {
        var now = Now;

        bool Gone(long userId) =>
            !_presence.TryGetValue(userId, out var p) || (p.Connections == 0 && (p.OfflineSince is null || now - p.OfflineSince > OfflineGrace));

        foreach (var c in _challenges.Values.ToList())
        {
            if (now - c.Created > ChallengeLifetime)
                await DropChallengeAsync(c, "expired");
            else if (Gone(c.From) || Gone(c.To))
                await DropChallengeAsync(c, "offline");
        }

        foreach (var m in _matches.Values.ToList())
        {
            if (Gone(m.Users[0]) || Gone(m.Users[1]))
                await CloseMatchAsync(m, "offline", m.Names[Gone(m.Users[0]) ? 0 : 1]);
            else if (now - m.Created > MatchLifetime && m.StartsAt is null)
                await CloseMatchAsync(m, "expired", null);
        }

        // People who closed the page and didn't come back within the grace period.
        foreach (var (userId, p) in _presence.Where(x => x.Value.Connections == 0 && x.Value.BattleId is null && x.Value.MatchId is null && Gone(x.Key)).ToList())
            _presence.Remove(userId);

        foreach (var b in _battles.Values.ToList())
        {
            if (b.Ended)
            {
                if (now - b.EndedAt > KeepFinished) _battles.Remove(b.Id);
                continue;
            }
            if (b.Draft is { Phase: "pick" or "lead" })
            {
                await DraftTickAsync(b);
                continue;
            }
            if (b.Daily is { } daily)
            {
                if (now - daily.LastActive > DailyIdle)
                {
                    daily.LastActive = now;
                    b.ForcedReason ??= "timeout";
                    await _sim.SendAsync(new { op = "forfeit", id = b.Id, side = "p1" });
                }
                continue;
            }
            foreach (var s in b.Sides)
            {
                if (s.Cpu || !s.Pending || s.Deadline is not { } d || now < d)
                    continue;
                s.AutoMoves++;
                s.Deadline = null;
                if (s.AutoMoves >= MaxAutoMoves)
                {
                    b.ForcedReason ??= "timeout";
                    await _sim.SendAsync(new { op = "forfeit", id = b.Id, side = s.Id });
                    break;
                }
                await _hub.Clients.Group(Group(b.Id, s.Id)).SendAsync("timeout", new { battleId = b.Id, left = MaxAutoMoves - s.AutoMoves });
                await _sim.SendAsync(new { op = "choose", id = b.Id, side = s.Id, choice = "default" });
            }
        }
    });

    public Task<List<PresenceItem>> PresenceAsync() => Locked(() => Task.FromResult(PresenceList()));
}
