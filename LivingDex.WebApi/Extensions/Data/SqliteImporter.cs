using System.Data;
using System.Globalization;
using Dapper;
using LivingDex.WebApi.Features;
using Microsoft.Data.SqlClient;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Options;

namespace LivingDex.WebApi.Extensions.Data;

/// <summary>
/// One-time move from the SQLite database of the previous versions (data/livingdex.db) to SQL Server.
/// </summary>
internal interface ISqliteImporter
{
    /// <summary>
    /// Copies every account, progress document, history entry, trainer profile and battle into SQL Server,
    /// then renames the file to livingdex.db.imported. Does nothing when there is no file, and refuses
    /// (leaving the file alone) when SQL Server already has accounts.
    /// </summary>
    /// <returns>A task that completes when the import is done or skipped.</returns>
    Task ImportAsync();
}

/// <summary>
/// Reads the SQLite tables and bulk-copies them, inside one transaction, into the SQL Server tables
/// (account identifiers are kept, so progress and battles stay attached to the same trainers).
/// This is the only place that touches tables directly instead of through stored procedures:
/// it runs once, on an empty database.
/// </summary>
/// <param name="connectionFactory">Opens SQL Server connections.</param>
/// <param name="options">The LivingDex options.</param>
/// <param name="logger">Logger.</param>
internal sealed class SqliteImporter(
    ISqlConnectionFactory connectionFactory,
    IOptions<LivingDexOptions> options,
    ILogger<SqliteImporter> logger) : ISqliteImporter
{
    /// <summary>The file name of the old database inside the data folder.</summary>
    public const string FileName = "livingdex.db";

    private readonly ISqlConnectionFactory _connectionFactory = connectionFactory;
    private readonly IOptions<LivingDexOptions> _options = options;
    private readonly ILogger<SqliteImporter> _logger = logger;

    /// <inheritdoc />
    public async Task ImportAsync()
    {
        var file = Path.Combine(_options.Value.DataDirectory, FileName);
        if (!File.Exists(file))
        {
            return;
        }

        await using var target = await _connectionFactory.OpenAsync();
        var existing = await target.ExecuteScalarAsync<int>("[dbo].[UserCount]", commandType: CommandType.StoredProcedure);
        if (existing > 0)
        {
            _logger.LogWarning("Found {File}, but SQL Server already has {Count} accounts: the old database was not imported.", file, existing);
            return;
        }

        var connectionString = new SqliteConnectionStringBuilder { DataSource = file, Mode = SqliteOpenMode.ReadOnly }.ToString();
        await using (var source = new SqliteConnection(connectionString))
        {
            await source.OpenAsync();
            var tables = (await source.QueryAsync<string>("SELECT name FROM sqlite_master WHERE type = 'table'")).ToHashSet(StringComparer.OrdinalIgnoreCase);
            if (!tables.Contains("users"))
            {
                _logger.LogWarning("{File} has no users table (single-user version?): nothing was imported.", file);
                return;
            }

            await using var transaction = (SqlTransaction)await target.BeginTransactionAsync();

            var users = await CopyAsync(source, target, transaction, "User", """
                SELECT id, username, password_hash, is_admin, security_stamp, created_at, last_login_at FROM users ORDER BY id
                """,
                table =>
                {
                    table.Columns.Add("UserID", typeof(long));
                    table.Columns.Add("UserUniqueID", typeof(Guid));
                    table.Columns.Add("Username", typeof(string));
                    table.Columns.Add("PasswordHash", typeof(string));
                    table.Columns.Add("IsAdmin", typeof(bool));
                    table.Columns.Add("SecurityStamp", typeof(string));
                    table.Columns.Add("CreatedAt", typeof(DateTime));
                    table.Columns.Add("LastLoginAt", typeof(DateTime));
                },
                row => [row.GetInt64(0), Guid.NewGuid(), row.GetString(1), row.GetString(2), row.GetInt64(3) != 0, row.GetString(4),
                        Utc(row.GetString(5)), row.IsDBNull(6) ? DBNull.Value : Utc(row.GetString(6))]);

            // Account identifiers were copied as they were: move the identity past them for the next sign-up.
            if (users > 0)
            {
                await target.ExecuteAsync("DBCC CHECKIDENT ('[dbo].[User]', RESEED) WITH NO_INFOMSGS;", transaction: transaction);
            }

            var states = !tables.Contains("user_state") ? 0 : await CopyAsync(source, target, transaction, "UserState", """
                SELECT user_id, revision, data, updated_at FROM user_state
                """,
                table =>
                {
                    table.Columns.Add("UserID", typeof(long));
                    table.Columns.Add("Revision", typeof(long));
                    table.Columns.Add("Data", typeof(string));
                    table.Columns.Add("UpdatedAt", typeof(DateTime));
                },
                row => [row.GetInt64(0), row.GetInt64(1), row.GetString(2), Utc(row.GetString(3))]);

            var history = !tables.Contains("user_state_history") ? 0 : await CopyAsync(source, target, transaction, "UserStateHistory", """
                SELECT user_id, revision, data, updated_at, client FROM user_state_history
                """,
                table =>
                {
                    table.Columns.Add("UserID", typeof(long));
                    table.Columns.Add("Revision", typeof(long));
                    table.Columns.Add("Data", typeof(string));
                    table.Columns.Add("UpdatedAt", typeof(DateTime));
                    table.Columns.Add("Client", typeof(string));
                },
                row => [row.GetInt64(0), row.GetInt64(1), row.GetString(2), Utc(row.GetString(3)),
                        row.IsDBNull(4) ? DBNull.Value : Truncate(row.GetString(4), 80)]);

            var profiles = !tables.Contains("trainer_profiles") ? 0 : await CopyAsync(source, target, transaction, "TrainerProfile", """
                SELECT user_id, partner, partner_shiny, last_seen_at FROM trainer_profiles
                """,
                table =>
                {
                    table.Columns.Add("UserID", typeof(long));
                    table.Columns.Add("Partner", typeof(int));
                    table.Columns.Add("PartnerShiny", typeof(bool));
                    table.Columns.Add("LastSeenAt", typeof(DateTime));
                },
                row => [row.GetInt64(0), (int)Math.Clamp(row.GetInt64(1), 1, 1025), row.GetInt64(2) != 0,
                        row.IsDBNull(3) ? DBNull.Value : Utc(row.GetString(3))]);

            var battles = 0;
            if (tables.Contains("battles"))
            {
                var columns = (await source.QueryAsync<string>("SELECT name FROM pragma_table_info('battles')")).ToHashSet(StringComparer.OrdinalIgnoreCase);
                var bestKo = columns.Contains("p1_best_ko") ? "p1_best_ko, p2_best_ko" : "0, 0";
                battles = await CopyAsync(source, target, transaction, "Battle", $"""
                    SELECT id, format, p1_user_id, p2_user_id, p1_name, p2_name, cpu, winner, reason, turns,
                           p1_left, p2_left, {bestKo}, teams, log, background, started_at, ended_at
                    FROM battles
                    """,
                    table =>
                    {
                        table.Columns.Add("BattleID", typeof(string));
                        table.Columns.Add("Format", typeof(string));
                        table.Columns.Add("P1UserID", typeof(long));
                        table.Columns.Add("P2UserID", typeof(long));
                        table.Columns.Add("P1Name", typeof(string));
                        table.Columns.Add("P2Name", typeof(string));
                        table.Columns.Add("IsCpu", typeof(bool));
                        table.Columns.Add("Winner", typeof(int));
                        table.Columns.Add("Reason", typeof(string));
                        table.Columns.Add("Turns", typeof(int));
                        table.Columns.Add("P1Left", typeof(int));
                        table.Columns.Add("P2Left", typeof(int));
                        table.Columns.Add("P1BestKo", typeof(int));
                        table.Columns.Add("P2BestKo", typeof(int));
                        table.Columns.Add("Teams", typeof(string));
                        table.Columns.Add("Log", typeof(string));
                        table.Columns.Add("Background", typeof(string));
                        table.Columns.Add("StartedAt", typeof(DateTime));
                        table.Columns.Add("EndedAt", typeof(DateTime));
                    },
                    row => [row.GetString(0), row.GetString(1), row.IsDBNull(2) ? DBNull.Value : row.GetInt64(2), row.IsDBNull(3) ? DBNull.Value : row.GetInt64(3),
                            Truncate(row.GetString(4), 32), Truncate(row.GetString(5), 32), row.GetInt64(6) != 0, (int)Math.Clamp(row.GetInt64(7), 0, 2),
                            Truncate(row.GetString(8), 16), (int)row.GetInt64(9), (int)row.GetInt64(10), (int)row.GetInt64(11), (int)row.GetInt64(12), (int)row.GetInt64(13),
                            row.IsDBNull(14) ? DBNull.Value : row.GetString(14), row.IsDBNull(15) ? DBNull.Value : row.GetString(15),
                            row.IsDBNull(16) ? DBNull.Value : row.GetString(16), Utc(row.GetString(17)), Utc(row.GetString(18))]);
            }

            await transaction.CommitAsync();
            _logger.LogInformation(
                "Imported {File}: {Users} accounts, {States} progress documents, {History} history entries, {Profiles} trainer profiles, {Battles} battles.",
                file, users, states, history, profiles, battles);
        }

        // Keep the old file (and its WAL side files) as a backup, under a name the importer no longer looks for.
        SqliteConnection.ClearAllPools();
        foreach (var suffix in new[] { "", "-wal", "-shm" })
        {
            if (File.Exists(file + suffix))
            {
                File.Move(file + suffix, file + ".imported" + suffix, overwrite: true);
            }
        }
    }

    private static async Task<int> CopyAsync(
        SqliteConnection source,
        SqlConnection target,
        SqlTransaction transaction,
        string tableName,
        string query,
        Action<DataTable> defineColumns,
        Func<SqliteDataReader, object[]> readRow)
    {
        using var table = new DataTable(tableName);
        defineColumns(table);

        await using (var command = source.CreateCommand())
        {
            command.CommandText = query;
            await using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                table.Rows.Add(readRow(reader));
            }
        }

        if (table.Rows.Count == 0)
        {
            return 0;
        }

        using var bulkCopy = new SqlBulkCopy(target, SqlBulkCopyOptions.KeepIdentity | SqlBulkCopyOptions.CheckConstraints, transaction)
        {
            DestinationTableName = $"[dbo].[{tableName}]",
            BulkCopyTimeout = 600,
        };
        foreach (DataColumn column in table.Columns)
        {
            bulkCopy.ColumnMappings.Add(column.ColumnName, column.ColumnName);
        }

        await bulkCopy.WriteToServerAsync(table);
        return table.Rows.Count;
    }

    /// <summary>The old database stored timestamps as ISO 8601 text ("2026-10-07T09:31:12.3456789+00:00").</summary>
    private static DateTime Utc(string value) =>
        DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsed)
            ? parsed.UtcDateTime
            : DateTime.UtcNow;

    private static string Truncate(string value, int max) => value.Length <= max ? value : value[..max];
}
