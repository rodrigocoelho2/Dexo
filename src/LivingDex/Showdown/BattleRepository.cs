using System.Globalization;
using Dapper;
using LivingDex.Data;
using LivingDex.State;

namespace LivingDex.Showdown;

public sealed class BattleRow
{
    public string Id { get; set; } = "";
    public string Format { get; set; } = "";
    public long? P1UserId { get; set; }
    public long? P2UserId { get; set; }
    public string P1Name { get; set; } = "";
    public string P2Name { get; set; } = "";
    public long Cpu { get; set; }
    public long Winner { get; set; }
    public string Reason { get; set; } = "normal";
    public long Turns { get; set; }
    public long P1Left { get; set; }
    public long P2Left { get; set; }
    public string? Teams { get; set; }
    public string? Log { get; set; }
    public string? Background { get; set; }
    public string StartedAt { get; set; } = "";
    public string EndedAt { get; set; } = "";
    public long P1BestKo { get; set; }
    public long P2BestKo { get; set; }
}

public sealed class ProfileRow
{
    public long UserId { get; set; }
    public long Partner { get; set; } = 25;
    public long PartnerShiny { get; set; }
    public string? LastSeenAt { get; set; }
}

/// <summary>
/// Numbers for a trainer card. Only battles against other people count for the record and badges;
/// CPU practice is counted separately.
/// </summary>
public sealed record FormatRecord(string Format, long Wins, long Losses);

public sealed record TrainerRecord(int Wins, int Losses, int Streak, int CpuWins, int CpuLosses, int Played, string[] Badges);

public static class Badges
{
    public const string FirstWin = "first-win", TenWins = "ten-wins", OnFire = "on-fire", LastStand = "last-stand",
        Sweeper = "sweeper", Flawless = "flawless", Veteran = "veteran", TimeTraveller = "time-traveller";
}

public sealed class BattleRepository(SqliteConnectionFactory db, DbWriteLock writeLock, TimeProvider clock)
{
    private const string SelectBattle = """
        SELECT id AS Id, format AS Format, p1_user_id AS P1UserId, p2_user_id AS P2UserId, p1_name AS P1Name, p2_name AS P2Name,
               cpu AS Cpu, winner AS Winner, reason AS Reason, turns AS Turns, p1_left AS P1Left, p2_left AS P2Left,
               teams AS Teams, background AS Background, started_at AS StartedAt, ended_at AS EndedAt
        FROM battles
        """;

    public string Now() => clock.GetUtcNow().ToString("O", CultureInfo.InvariantCulture);

    /// <summary>Saves a finished battle.</summary>
    public async Task SaveBattleAsync(BattleRow row, CancellationToken ct = default)
    {
        using var _ = await writeLock.AcquireAsync(ct);
        await using var connection = await db.OpenAsync(ct);
        await using var tx = connection.BeginTransaction(deferred: false);

        await connection.ExecuteAsync(new CommandDefinition("""
            INSERT OR REPLACE INTO battles (id, format, p1_user_id, p2_user_id, p1_name, p2_name, cpu, winner, reason, turns,
                                            p1_left, p2_left, teams, log, background, started_at, ended_at, p1_best_ko, p2_best_ko)
            VALUES (@Id, @Format, @P1UserId, @P2UserId, @P1Name, @P2Name, @Cpu, @Winner, @Reason, @Turns,
                    @P1Left, @P2Left, @Teams, @Log, @Background, @StartedAt, @EndedAt, @P1BestKo, @P2BestKo)
            """, row, tx, cancellationToken: ct));
        await tx.CommitAsync(ct);
    }

    public async Task<IReadOnlyList<BattleRow>> RecentAsync(long userId, int limit, CancellationToken ct = default)
    {
        await using var connection = await db.OpenAsync(ct);
        var rows = await connection.QueryAsync<BattleRow>(new CommandDefinition(
            SelectBattle + " WHERE p1_user_id = @userId OR p2_user_id = @userId ORDER BY ended_at DESC LIMIT @limit",
            new { userId, limit }, cancellationToken: ct));
        return rows.AsList();
    }

    /// <summary>Wins and losses per format against other trainers (CPU battles and draws left out), for the profile.</summary>
    public async Task<IReadOnlyList<FormatRecord>> FormatRecordsAsync(long userId, CancellationToken ct = default)
    {
        await using var connection = await db.OpenAsync(ct);
        var rows = await connection.QueryAsync<FormatRecord>(new CommandDefinition("""
            SELECT format AS Format,
                   SUM(CASE WHEN (p1_user_id = @userId AND winner = 1) OR (p2_user_id = @userId AND winner = 2) THEN 1 ELSE 0 END) AS Wins,
                   SUM(CASE WHEN (p1_user_id = @userId AND winner = 2) OR (p2_user_id = @userId AND winner = 1) THEN 1 ELSE 0 END) AS Losses
            FROM battles
            WHERE (p1_user_id = @userId OR p2_user_id = @userId) AND cpu = 0
            GROUP BY format
            """, new { userId }, cancellationToken: ct));
        return rows.AsList();
    }

    public async Task<BattleRow?> GetAsync(string id, bool withLog, CancellationToken ct = default)
    {
        await using var connection = await db.OpenAsync(ct);
        var sql = withLog ? SelectBattle.Replace("background AS Background", "background AS Background, log AS Log", StringComparison.Ordinal) : SelectBattle;
        return await connection.QuerySingleOrDefaultAsync<BattleRow>(new CommandDefinition(sql + " WHERE id = @id", new { id }, cancellationToken: ct));
    }

    public async Task<TrainerRecord> RecordAsync(long userId, CancellationToken ct = default)
    {
        await using var connection = await db.OpenAsync(ct);
        var rows = (await connection.QueryAsync<BattleRow>(new CommandDefinition("""
            SELECT p1_user_id AS P1UserId, p2_user_id AS P2UserId, cpu AS Cpu, winner AS Winner, format AS Format,
                   p1_left AS P1Left, p2_left AS P2Left, p1_best_ko AS P1BestKo, p2_best_ko AS P2BestKo, teams AS Teams
            FROM battles WHERE (p1_user_id = @userId OR p2_user_id = @userId) AND winner > 0 ORDER BY ended_at
            """, new { userId }, cancellationToken: ct))).AsList();

        int wins = 0, losses = 0, streak = 0, best = 0, cpuWins = 0, cpuLosses = 0, played = 0;
        bool lastStand = false, flawless = false, sweeper = false;
        var genWins = new HashSet<string>(StringComparer.Ordinal);
        foreach (var r in rows)
        {
            var mine = r.P1UserId == userId ? 1 : 2;
            var won = r.Winner == mine;
            if (r.Cpu != 0) { if (won) cpuWins++; else cpuLosses++; continue; }
            played++;
            if ((mine == 1 ? r.P1BestKo : r.P2BestKo) >= 3) sweeper = true;
            if (!won) { losses++; streak = 0; continue; }
            wins++; streak++; best = Math.Max(best, streak);
            var left = mine == 1 ? r.P1Left : r.P2Left;
            if (left == 1) lastStand = true;
            if (left >= 6) flawless = true;
            genWins.Add(r.Format.Length > 4 ? r.Format[..4] : r.Format);
        }

        var badges = new List<string>();
        if (wins >= 1) badges.Add(Badges.FirstWin);
        if (wins >= 10) badges.Add(Badges.TenWins);
        if (best >= 5) badges.Add(Badges.OnFire);
        if (lastStand) badges.Add(Badges.LastStand);
        if (sweeper) badges.Add(Badges.Sweeper);
        if (flawless) badges.Add(Badges.Flawless);
        if (played >= 50) badges.Add(Badges.Veteran);
        if (new[] { "gen1", "gen2", "gen3", "gen4", "gen5" }.All(genWins.Contains)) badges.Add(Badges.TimeTraveller);

        return new TrainerRecord(wins, losses, streak, cpuWins, cpuLosses, played, [.. badges]);
    }

    public async Task<ProfileRow> GetProfileAsync(long userId, CancellationToken ct = default)
    {
        await using var connection = await db.OpenAsync(ct);
        return await connection.QuerySingleOrDefaultAsync<ProfileRow>(new CommandDefinition(
                   "SELECT user_id AS UserId, partner AS Partner, partner_shiny AS PartnerShiny, last_seen_at AS LastSeenAt FROM trainer_profiles WHERE user_id = @userId",
                   new { userId }, cancellationToken: ct))
               ?? new ProfileRow { UserId = userId };
    }

    public async Task<IReadOnlyDictionary<long, ProfileRow>> AllProfilesAsync(CancellationToken ct = default)
    {
        await using var connection = await db.OpenAsync(ct);
        var rows = await connection.QueryAsync<ProfileRow>(new CommandDefinition(
            "SELECT user_id AS UserId, partner AS Partner, partner_shiny AS PartnerShiny, last_seen_at AS LastSeenAt FROM trainer_profiles",
            cancellationToken: ct));
        return rows.ToDictionary(r => r.UserId);
    }

    public async Task SetPartnerAsync(long userId, int partner, bool shiny, CancellationToken ct = default)
    {
        using var _ = await writeLock.AcquireAsync(ct);
        await using var connection = await db.OpenAsync(ct);
        await connection.ExecuteAsync(new CommandDefinition("""
            INSERT INTO trainer_profiles (user_id, partner, partner_shiny) VALUES (@userId, @partner, @shiny)
            ON CONFLICT (user_id) DO UPDATE SET partner = excluded.partner, partner_shiny = excluded.partner_shiny
            """, new { userId, partner, shiny = shiny ? 1 : 0 }, cancellationToken: ct));
    }

    public async Task TouchSeenAsync(long userId, CancellationToken ct = default)
    {
        using var _ = await writeLock.AcquireAsync(ct);
        await using var connection = await db.OpenAsync(ct);
        await connection.ExecuteAsync(new CommandDefinition("""
            INSERT INTO trainer_profiles (user_id, last_seen_at) VALUES (@userId, @now)
            ON CONFLICT (user_id) DO UPDATE SET last_seen_at = excluded.last_seen_at
            """, new { userId, now = Now() }, cancellationToken: ct));
    }

    /// <summary>How many Pokémon are marked in Pokémon HOME · Normal, i.e. the living dex number on the trainer card.</summary>
    public async Task<int> LivingDexCountAsync(long userId, CancellationToken ct = default)
    {
        await using var connection = await db.OpenAsync(ct);
        var data = await connection.QuerySingleOrDefaultAsync<string>(new CommandDefinition(
            "SELECT data FROM user_state WHERE user_id = @userId", new { userId }, cancellationToken: ct));
        return data is null ? 0 : StateEndpoints.CountSlot(data, "home|normal");
    }
}
