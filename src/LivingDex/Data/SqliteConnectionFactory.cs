using Dapper;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Options;

namespace LivingDex.Data;

public sealed class SqliteConnectionFactory
{
    private const string Schema = """
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS users (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            username        TEXT    NOT NULL COLLATE NOCASE UNIQUE,
            password_hash   TEXT    NOT NULL,
            is_admin        INTEGER NOT NULL DEFAULT 0,
            security_stamp  TEXT    NOT NULL,
            created_at      TEXT    NOT NULL,
            last_login_at   TEXT    NULL
        );

        CREATE TABLE IF NOT EXISTS user_state (
            user_id     INTEGER PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
            revision    INTEGER NOT NULL,
            data        TEXT    NOT NULL,
            updated_at  TEXT    NOT NULL
        );

        CREATE TABLE IF NOT EXISTS user_state_history (
            user_id     INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
            revision    INTEGER NOT NULL,
            data        TEXT    NOT NULL,
            updated_at  TEXT    NOT NULL,
            client      TEXT    NULL,
            PRIMARY KEY (user_id, revision)
        );

        CREATE TABLE IF NOT EXISTS trainer_profiles (
            user_id         INTEGER PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
            partner         INTEGER NOT NULL DEFAULT 25,
            partner_shiny   INTEGER NOT NULL DEFAULT 0,
            last_seen_at    TEXT    NULL
        );

        CREATE TABLE IF NOT EXISTS battles (
            id          TEXT    PRIMARY KEY,
            format      TEXT    NOT NULL,
            p1_user_id  INTEGER NULL REFERENCES users (id) ON DELETE SET NULL,
            p2_user_id  INTEGER NULL REFERENCES users (id) ON DELETE SET NULL,
            p1_name     TEXT    NOT NULL,
            p2_name     TEXT    NOT NULL,
            cpu         INTEGER NOT NULL DEFAULT 0,
            winner      INTEGER NOT NULL DEFAULT 0,
            reason      TEXT    NOT NULL DEFAULT 'normal',
            turns       INTEGER NOT NULL DEFAULT 0,
            p1_left     INTEGER NOT NULL DEFAULT 0,
            p2_left     INTEGER NOT NULL DEFAULT 0,
            teams       TEXT    NULL,
            log         TEXT    NULL,
            background  TEXT    NULL,
            started_at  TEXT    NOT NULL,
            ended_at    TEXT    NOT NULL
        );
        CREATE INDEX IF NOT EXISTS ix_battles_p1 ON battles (p1_user_id, ended_at);
        CREATE INDEX IF NOT EXISTS ix_battles_p2 ON battles (p2_user_id, ended_at);
        """;

    private readonly string _connectionString;

    public SqliteConnectionFactory(IOptions<LivingDexOptions> options, IHostEnvironment env)
    {
        DataDirectory = LivingDexOptions.ResolveDataDirectory(options.Value.DataDirectory, env.ContentRootPath);
        Directory.CreateDirectory(DataDirectory);

        _connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = Path.Combine(DataDirectory, "livingdex.db"),
            Mode = SqliteOpenMode.ReadWriteCreate,
            ForeignKeys = true,
        }.ToString();
    }

    /// <summary>Absolute path of the data folder (database, login keys, asset cache).</summary>
    public string DataDirectory { get; }

    public async Task<SqliteConnection> OpenAsync(CancellationToken ct = default)
    {
        var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(ct);
        return connection;
    }

    /// <summary>
    /// Creates the tables. Databases from the single-user version keep their old app_state/state_history
    /// tables until the first account is created; that account then receives the old progress
    /// (see <see cref="Auth.UserRepository.CreateAsync"/>).
    /// </summary>
    public async Task MigrateAsync(CancellationToken ct = default)
    {
        await using var connection = await OpenAsync(ct);
        await connection.ExecuteAsync(new CommandDefinition(Schema, cancellationToken: ct));

        // Columns added after the first Showdown release.
        await AddColumnAsync(connection, "battles", "p1_best_ko", "INTEGER NOT NULL DEFAULT 0", ct);
        await AddColumnAsync(connection, "battles", "p2_best_ko", "INTEGER NOT NULL DEFAULT 0", ct);
    }

    private static async Task AddColumnAsync(SqliteConnection connection, string table, string column, string definition, CancellationToken ct)
    {
        var columns = await connection.QueryAsync<string>(new CommandDefinition(
            $"SELECT name FROM pragma_table_info('{table}')", cancellationToken: ct));
        if (!columns.Contains(column, StringComparer.OrdinalIgnoreCase))
            await connection.ExecuteAsync(new CommandDefinition($"ALTER TABLE {table} ADD COLUMN {column} {definition}", cancellationToken: ct));
    }
}
