using System.Net.Http.Json;
using System.Text.Json;
using LivingDex.WebApi.Extensions.Authentication;
using LivingDex.WebApi.Features.Accounts.Models.DTOs;
using LivingDex.WebApi.Features.States.Models.DTOs;
using Microsoft.Data.Sqlite;

namespace LivingDex.UnitTest.Integration;

/// <summary>The one-time move from the previous versions' SQLite database.</summary>
public sealed class SqliteImporterTests
{
    // The schema of the SQLite version, before the best-knockout columns were added.
    private const string OldSchema = """
        CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL COLLATE NOCASE UNIQUE, password_hash TEXT NOT NULL,
                            is_admin INTEGER NOT NULL DEFAULT 0, security_stamp TEXT NOT NULL, created_at TEXT NOT NULL, last_login_at TEXT NULL);
        CREATE TABLE user_state (user_id INTEGER PRIMARY KEY, revision INTEGER NOT NULL, data TEXT NOT NULL, updated_at TEXT NOT NULL);
        CREATE TABLE user_state_history (user_id INTEGER NOT NULL, revision INTEGER NOT NULL, data TEXT NOT NULL, updated_at TEXT NOT NULL, client TEXT NULL,
                                         PRIMARY KEY (user_id, revision));
        CREATE TABLE trainer_profiles (user_id INTEGER PRIMARY KEY, partner INTEGER NOT NULL DEFAULT 25, partner_shiny INTEGER NOT NULL DEFAULT 0, last_seen_at TEXT NULL);
        CREATE TABLE battles (id TEXT PRIMARY KEY, format TEXT NOT NULL, p1_user_id INTEGER NULL, p2_user_id INTEGER NULL, p1_name TEXT NOT NULL, p2_name TEXT NOT NULL,
                              cpu INTEGER NOT NULL DEFAULT 0, winner INTEGER NOT NULL DEFAULT 0, reason TEXT NOT NULL DEFAULT 'normal', turns INTEGER NOT NULL DEFAULT 0,
                              p1_left INTEGER NOT NULL DEFAULT 0, p2_left INTEGER NOT NULL DEFAULT 0, teams TEXT NULL, log TEXT NULL, background TEXT NULL,
                              started_at TEXT NOT NULL, ended_at TEXT NOT NULL);
        """;

    private static void Run(SqliteConnection connection, string sql, params (string Name, object? Value)[] parameters)
    {
        using var command = connection.CreateCommand();
        command.CommandText = sql;
        foreach (var (name, value) in parameters)
        {
            command.Parameters.AddWithValue(name, value ?? DBNull.Value);
        }

        command.ExecuteNonQuery();
    }

    private static void CreateOldDatabase(string dataDirectory)
    {
        using var connection = new SqliteConnection($"Data Source={Path.Combine(dataDirectory, "livingdex.db")}");
        connection.Open();
        Run(connection, OldSchema);
        const string Created = "2026-01-02T03:04:05.6789012+00:00";
        // Account 2 was deleted in the old app, so identifiers have a gap.
        Run(connection, "INSERT INTO users VALUES (1, 'Rodas', $hash, 1, 'stamp-1', $created, $created)", ("$hash", PasswordHasher.Hash("pikachu123")), ("$created", Created));
        Run(connection, "INSERT INTO users VALUES (3, 'Ana', $hash, 0, 'stamp-3', $created, NULL)", ("$hash", PasswordHasher.Hash("eevee1234")), ("$created", Created));
        Run(connection, """INSERT INTO user_state VALUES (1, 7, '{"caught":{"home|normal":["s:1","s:2","s:3"]}}', $created)""", ("$created", Created));
        Run(connection, """INSERT INTO user_state_history VALUES (1, 6, '{"caught":{"home|normal":["s:1","s:2"]}}', $created, 'iPhone')""", ("$created", Created));
        Run(connection, """INSERT INTO user_state_history VALUES (1, 7, '{"caught":{"home|normal":["s:1","s:2","s:3"]}}', $created, NULL)""", ("$created", Created));
        Run(connection, "INSERT INTO trainer_profiles VALUES (1, 6, 1, $created)", ("$created", Created));
        Run(connection, """
            INSERT INTO battles VALUES ('0123456789abcdef', 'gen4randombattle', 1, 3, 'Rodas', 'Ana', 0, 1, 'forfeit', 12, 2, 0,
                                        '[[],[]]', '|turn|1', 'beach', $created, $created)
            """, ("$created", Created));
    }

    [SqlFact]
    public async Task OldDatabase_IsImportedOnce_AndKeepsAccountsProgressAndBattles()
    {
        var data = TestSupport.NewFolder();
        CreateOldDatabase(data.Path);
        using var app = new TestApp(data: data);
        var rodas = app.NewClient();

        // The first request starts the app, which imports the file.
        var login = await rodas.PostAsJsonAsync("/api/auth/login", new { username = "rodas", password = "pikachu123" });
        login.EnsureSuccessStatusCode();
        var me = (await login.Content.ReadFromJsonAsync<MeDTO>())!;
        Assert.Equal(1, me.Id);
        Assert.True(me.IsAdmin);
        Assert.False(File.Exists(Path.Combine(app.DataDirectory, "livingdex.db")));
        Assert.True(File.Exists(Path.Combine(app.DataDirectory, "livingdex.db.imported")));

        var state = await rodas.GetFromJsonAsync<StateDTO>("/api/state");
        Assert.Equal(7, state!.Revision);
        // DATETIME2(3) keeps milliseconds (rounded).
        var expected = new DateTime(2026, 1, 2, 3, 4, 5, 679, DateTimeKind.Utc);
        Assert.InRange((state.UpdatedAt!.Value.ToUniversalTime() - expected).Duration(), TimeSpan.Zero, TimeSpan.FromMilliseconds(1));
        Assert.Equal(3, state.Data.GetProperty("caught").GetProperty("home|normal").GetArrayLength());
        var history = await rodas.GetFromJsonAsync<List<HistoryItemDTO>>("/api/history");
        Assert.Equal([7L, 6L], history!.Select(entry => entry.Revision));
        Assert.Equal("iPhone", history![1].Client);

        var card = await rodas.GetFromJsonAsync<JsonElement>("/api/showdown/trainers/1");
        Assert.Equal(6, card.GetProperty("partner").GetInt32());
        Assert.True(card.GetProperty("partnerShiny").GetBoolean());
        Assert.Equal(3, card.GetProperty("livingDex").GetInt32());
        Assert.Equal(1, card.GetProperty("wins").GetInt32());

        var replay = await rodas.GetFromJsonAsync<JsonElement>("/api/showdown/battles/0123456789abcdef");
        Assert.Equal("forfeit", replay.GetProperty("reason").GetString());
        Assert.Equal(3, replay.GetProperty("p2UserId").GetInt64());

        var ana = await app.NewClient().PostAsJsonAsync("/api/auth/login", new { username = "Ana", password = "eevee1234" });
        Assert.Equal(3, (await ana.Content.ReadFromJsonAsync<MeDTO>())!.Id);

        // New accounts continue after the highest imported identifier.
        var zed = await app.NewClient().PostAsJsonAsync("/api/auth/register", new { username = "Zed", password = "pikachu123" });
        Assert.Equal(4, (await zed.Content.ReadFromJsonAsync<MeDTO>())!.Id);
    }
}
