using System.Globalization;
using Dapper;
using LivingDex.Data;
using Microsoft.Extensions.Options;

namespace LivingDex.State;

/// <summary>A stored copy of one user's tracker progress (caught lists, capture details, catch log) as raw JSON.</summary>
public sealed class StateRow
{
    public long Revision { get; set; }
    public string Data { get; set; } = "null";
    public string UpdatedAt { get; set; } = "";
}

public sealed class HistoryRow
{
    public long Revision { get; set; }
    public string UpdatedAt { get; set; } = "";
    public string? Client { get; set; }
    public string Data { get; set; } = "null";
}

public enum SaveOutcome { Saved, Conflict }

public sealed record SaveResult(SaveOutcome Outcome, StateRow Current);

/// <summary>
/// Per-user progress store with optimistic concurrency: a write must name the revision it was based on,
/// and every accepted write becomes a new revision that is also kept in the user's history.
/// </summary>
public sealed class StateRepository(SqliteConnectionFactory db, DbWriteLock writeLock, IOptions<LivingDexOptions> options, TimeProvider clock)
{
    private const string SelectCurrent = """
        SELECT revision AS Revision, data AS Data, updated_at AS UpdatedAt
        FROM user_state WHERE user_id = @userId
        """;

    public async Task<StateRow> GetAsync(long userId, CancellationToken ct = default)
    {
        await using var connection = await db.OpenAsync(ct);
        return await connection.QuerySingleOrDefaultAsync<StateRow>(new CommandDefinition(SelectCurrent, new { userId }, cancellationToken: ct))
               ?? new StateRow();
    }

    public async Task<SaveResult> SaveAsync(long userId, long baseRevision, string json, string? client, CancellationToken ct = default)
    {
        using var _ = await writeLock.AcquireAsync(ct);
        await using var connection = await db.OpenAsync(ct);
        await using var tx = connection.BeginTransaction(deferred: false);

        var current = await connection.QuerySingleOrDefaultAsync<StateRow>(
                          new CommandDefinition(SelectCurrent, new { userId }, tx, cancellationToken: ct))
                      ?? new StateRow();

        if (current.Revision != baseRevision)
        {
            await tx.RollbackAsync(ct);
            return new SaveResult(SaveOutcome.Conflict, current);
        }

        var next = new StateRow
        {
            Revision = current.Revision + 1,
            Data = json,
            UpdatedAt = clock.GetUtcNow().ToString("O", CultureInfo.InvariantCulture),
        };

        await connection.ExecuteAsync(new CommandDefinition("""
            INSERT INTO user_state (user_id, revision, data, updated_at)
            VALUES (@UserId, @Revision, @Data, @UpdatedAt)
            ON CONFLICT (user_id) DO UPDATE SET
                revision = excluded.revision,
                data = excluded.data,
                updated_at = excluded.updated_at;

            INSERT INTO user_state_history (user_id, revision, data, updated_at, client)
            VALUES (@UserId, @Revision, @Data, @UpdatedAt, @Client);

            DELETE FROM user_state_history WHERE user_id = @UserId AND revision <= @Revision - @Keep;
            """,
            new
            {
                UserId = userId,
                next.Revision,
                next.Data,
                next.UpdatedAt,
                Client = Truncate(client, 80),
                Keep = Math.Max(1, options.Value.HistoryLimit),
            },
            tx, cancellationToken: ct));

        await tx.CommitAsync(ct);
        return new SaveResult(SaveOutcome.Saved, next);
    }

    public async Task<IReadOnlyList<HistoryRow>> GetHistoryAsync(long userId, int take, CancellationToken ct = default)
    {
        await using var connection = await db.OpenAsync(ct);
        var rows = await connection.QueryAsync<HistoryRow>(new CommandDefinition("""
            SELECT revision AS Revision, updated_at AS UpdatedAt, client AS Client, data AS Data
            FROM user_state_history
            WHERE user_id = @userId
            ORDER BY revision DESC
            LIMIT @take
            """, new { userId, take = Math.Clamp(take, 1, 500) }, cancellationToken: ct));
        return rows.AsList();
    }

    public async Task<HistoryRow?> GetHistoryEntryAsync(long userId, long revision, CancellationToken ct = default)
    {
        await using var connection = await db.OpenAsync(ct);
        return await connection.QuerySingleOrDefaultAsync<HistoryRow>(new CommandDefinition("""
            SELECT revision AS Revision, updated_at AS UpdatedAt, client AS Client, data AS Data
            FROM user_state_history WHERE user_id = @userId AND revision = @revision
            """, new { userId, revision }, cancellationToken: ct));
    }

    private static string? Truncate(string? value, int max) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Length <= max ? value : value[..max];
}
