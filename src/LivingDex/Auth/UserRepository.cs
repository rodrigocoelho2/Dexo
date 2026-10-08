using System.Globalization;
using Dapper;
using LivingDex.Data;
using Microsoft.Data.Sqlite;

namespace LivingDex.Auth;

public sealed class UserRow
{
    public long Id { get; set; }
    public string Username { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public long IsAdminFlag { get; set; }
    public string SecurityStamp { get; set; } = "";
    public string CreatedAt { get; set; } = "";
    public string? LastLoginAt { get; set; }

    public bool IsAdmin => IsAdminFlag != 0;
}

public sealed class UserListRow
{
    public long Id { get; set; }
    public string Username { get; set; } = "";
    public long IsAdminFlag { get; set; }
    public string CreatedAt { get; set; } = "";
    public string? LastLoginAt { get; set; }
    public string? Data { get; set; }
}

public enum CreateUserOutcome { Created, UsernameTaken, RegistrationClosed }

public sealed record CreateUserResult(CreateUserOutcome Outcome, UserRow? User, bool ClaimedLegacyProgress);

public sealed class UserRepository(SqliteConnectionFactory db, DbWriteLock writeLock, TimeProvider clock)
{
    private const string SelectUser = """
        SELECT id AS Id, username AS Username, password_hash AS PasswordHash, is_admin AS IsAdminFlag,
               security_stamp AS SecurityStamp, created_at AS CreatedAt, last_login_at AS LastLoginAt
        FROM users
        """;

    private string Now() => clock.GetUtcNow().ToString("O", CultureInfo.InvariantCulture);

    private static string NewStamp() => Guid.NewGuid().ToString("N");

    public async Task<long> CountAsync(CancellationToken ct = default)
    {
        await using var connection = await db.OpenAsync(ct);
        return await connection.QuerySingleAsync<long>(new CommandDefinition("SELECT COUNT(*) FROM users", cancellationToken: ct));
    }

    public async Task<UserRow?> GetAsync(long id, CancellationToken ct = default)
    {
        await using var connection = await db.OpenAsync(ct);
        return await connection.QuerySingleOrDefaultAsync<UserRow>(
            new CommandDefinition(SelectUser + " WHERE id = @id", new { id }, cancellationToken: ct));
    }

    public async Task<UserRow?> FindByUsernameAsync(string username, CancellationToken ct = default)
    {
        await using var connection = await db.OpenAsync(ct);
        // The column is COLLATE NOCASE, so "rodas" finds "Rodas".
        return await connection.QuerySingleOrDefaultAsync<UserRow>(
            new CommandDefinition(SelectUser + " WHERE username = @username", new { username }, cancellationToken: ct));
    }

    /// <summary>
    /// Creates an account. The first account is always allowed, becomes the admin, and takes over the
    /// progress saved by the single-user version of the app, if there is any.
    /// </summary>
    public async Task<CreateUserResult> CreateAsync(string username, string passwordHash, bool allowRegistration, CancellationToken ct = default)
    {
        using var _ = await writeLock.AcquireAsync(ct);
        await using var connection = await db.OpenAsync(ct);
        await using var tx = connection.BeginTransaction(deferred: false);

        var count = await connection.QuerySingleAsync<long>(new CommandDefinition("SELECT COUNT(*) FROM users", transaction: tx, cancellationToken: ct));
        if (count > 0 && !allowRegistration)
            return new CreateUserResult(CreateUserOutcome.RegistrationClosed, null, false);

        var taken = await connection.QuerySingleAsync<long>(new CommandDefinition(
            "SELECT COUNT(*) FROM users WHERE username = @username", new { username }, tx, cancellationToken: ct));
        if (taken > 0)
            return new CreateUserResult(CreateUserOutcome.UsernameTaken, null, false);

        var user = new UserRow
        {
            Username = username,
            PasswordHash = passwordHash,
            IsAdminFlag = count == 0 ? 1 : 0,
            SecurityStamp = NewStamp(),
            CreatedAt = Now(),
        };
        user.Id = await connection.QuerySingleAsync<long>(new CommandDefinition("""
            INSERT INTO users (username, password_hash, is_admin, security_stamp, created_at)
            VALUES (@Username, @PasswordHash, @IsAdminFlag, @SecurityStamp, @CreatedAt)
            RETURNING id
            """, user, tx, cancellationToken: ct));

        var claimed = count == 0 && await ClaimLegacyProgressAsync(connection, tx, user.Id, ct);

        await tx.CommitAsync(ct);
        return new CreateUserResult(CreateUserOutcome.Created, user, claimed);
    }

    private static async Task<bool> ClaimLegacyProgressAsync(SqliteConnection connection, SqliteTransaction tx, long userId, CancellationToken ct)
    {
        var legacyTables = (await connection.QueryAsync<string>(new CommandDefinition(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('app_state', 'state_history')",
            transaction: tx, cancellationToken: ct))).ToHashSet(StringComparer.Ordinal);

        if (!legacyTables.Contains("app_state"))
            return false;

        var moved = await connection.ExecuteAsync(new CommandDefinition("""
            INSERT INTO user_state (user_id, revision, data, updated_at)
            SELECT @userId, revision, data, updated_at FROM app_state WHERE id = 1
            """, new { userId }, tx, cancellationToken: ct));

        if (legacyTables.Contains("state_history"))
        {
            await connection.ExecuteAsync(new CommandDefinition("""
                INSERT INTO user_state_history (user_id, revision, data, updated_at, client)
                SELECT @userId, revision, data, updated_at, client FROM state_history
                """, new { userId }, tx, cancellationToken: ct));
            await connection.ExecuteAsync(new CommandDefinition("DROP TABLE state_history", transaction: tx, cancellationToken: ct));
        }

        await connection.ExecuteAsync(new CommandDefinition("DROP TABLE app_state", transaction: tx, cancellationToken: ct));
        return moved > 0;
    }

    public async Task TouchLoginAsync(long id, CancellationToken ct = default)
    {
        using var _ = await writeLock.AcquireAsync(ct);
        await using var connection = await db.OpenAsync(ct);
        await connection.ExecuteAsync(new CommandDefinition(
            "UPDATE users SET last_login_at = @now WHERE id = @id", new { id, now = Now() }, cancellationToken: ct));
    }

    /// <summary>Sets a new password and a new security stamp, which signs the account out everywhere else.</summary>
    public async Task<UserRow?> SetPasswordAsync(long id, string passwordHash, CancellationToken ct = default)
    {
        using (await writeLock.AcquireAsync(ct))
        {
            await using var connection = await db.OpenAsync(ct);
            await connection.ExecuteAsync(new CommandDefinition(
                "UPDATE users SET password_hash = @passwordHash, security_stamp = @stamp WHERE id = @id",
                new { id, passwordHash, stamp = NewStamp() }, cancellationToken: ct));
        }
        return await GetAsync(id, ct);
    }

    /// <summary>Deletes the account and its progress. If that leaves no admin, the oldest remaining account becomes admin.</summary>
    public async Task<bool> DeleteAsync(long id, CancellationToken ct = default)
    {
        using var _ = await writeLock.AcquireAsync(ct);
        await using var connection = await db.OpenAsync(ct);
        await using var tx = connection.BeginTransaction(deferred: false);

        // Explicit deletes as well as ON DELETE CASCADE, so nothing is left behind even if foreign keys are off.
        await connection.ExecuteAsync(new CommandDefinition("""
            DELETE FROM user_state_history WHERE user_id = @id;
            DELETE FROM user_state WHERE user_id = @id;
            DELETE FROM trainer_profiles WHERE user_id = @id;
            UPDATE battles SET p1_user_id = NULL WHERE p1_user_id = @id;
            UPDATE battles SET p2_user_id = NULL WHERE p2_user_id = @id;
            """, new { id }, tx, cancellationToken: ct));
        var deleted = await connection.ExecuteAsync(new CommandDefinition("DELETE FROM users WHERE id = @id", new { id }, tx, cancellationToken: ct));
        await connection.ExecuteAsync(new CommandDefinition("""
            UPDATE users SET is_admin = 1
            WHERE id = (SELECT id FROM users ORDER BY id LIMIT 1)
              AND NOT EXISTS (SELECT 1 FROM users WHERE is_admin = 1)
            """, transaction: tx, cancellationToken: ct));

        await tx.CommitAsync(ct);
        return deleted > 0;
    }

    public async Task<IReadOnlyList<UserListRow>> ListAsync(CancellationToken ct = default)
    {
        await using var connection = await db.OpenAsync(ct);
        var rows = await connection.QueryAsync<UserListRow>(new CommandDefinition("""
            SELECT u.id AS Id, u.username AS Username, u.is_admin AS IsAdminFlag,
                   u.created_at AS CreatedAt, u.last_login_at AS LastLoginAt, s.data AS Data
            FROM users u LEFT JOIN user_state s ON s.user_id = u.id
            ORDER BY u.id
            """, cancellationToken: ct));
        return rows.AsList();
    }
}
