using System.Security.Claims;
using Dapper;
using LivingDex.Auth;
using LivingDex.Data;

namespace LivingDex.Showdown;

public static class ShowdownEndpoints
{
    public sealed record TrainerCard(long Id, string Name, int Wins, int Losses, int Streak, int CpuWins, int CpuLosses,
        int LivingDex, int Partner, bool PartnerShiny, string? LastSeen, int Played, string[] Badges);

    public sealed record PartnerRequest(int Partner, bool Shiny);

    public sealed record BattleItem(string Id, string Format, string Opponent, bool Cpu, string Result, int Left, int OpponentLeft,
        int Turns, string Reason, string EndedAt);

    private sealed class UserNameRow
    {
        public long Id { get; set; }
        public string Username { get; set; } = "";
    }

    public static IEndpointRouteBuilder MapShowdownEndpoints(this IEndpointRouteBuilder api)
    {
        var group = api.MapGroup("/showdown").RequireAuthorization();

        group.MapGet("/status", (BattleManager battles, Microsoft.Extensions.Options.IOptions<LivingDexOptions> options) =>
            Results.Ok(new
            {
                available = battles.Available,
                problem = battles.Problem,
                formats = BattleManager.Formats,
                backgrounds = BattleManager.Backgrounds,
                turnSeconds = Math.Clamp(options.Value.TurnSeconds, 15, 600),
            }));

        // Every trainer's card. A household-sized list, so it's computed on the fly.
        group.MapGet("/trainers", async (BattleRepository repo, SqliteConnectionFactory db, CancellationToken ct) =>
        {
            await using var connection = await db.OpenAsync(ct);
            var people = (await connection.QueryAsync<UserNameRow>(new CommandDefinition(
                "SELECT id AS Id, username AS Username FROM users ORDER BY username", cancellationToken: ct))).AsList();
            var profiles = await repo.AllProfilesAsync(ct);
            var cards = new List<TrainerCard>(people.Count);
            foreach (var u in people)
                cards.Add(await CardAsync(repo, u.Id, u.Username, profiles.GetValueOrDefault(u.Id), ct));
            return Results.Ok(cards);
        });

        group.MapGet("/trainers/{id:long}", async (long id, BattleRepository repo, UserRepository users, CancellationToken ct) =>
        {
            var user = await users.GetAsync(id, ct);
            return user is null ? Results.NotFound() : Results.Ok(await CardAsync(repo, user.Id, user.Username, null, ct));
        });

        group.MapPut("/me/partner", async (PartnerRequest body, ClaimsPrincipal user, BattleRepository repo, CancellationToken ct) =>
        {
            if (body.Partner is < 1 or > 1025)
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["partner"] = ["Pick a Pokémon from #1 to #1025."] });
            await repo.SetPartnerAsync(user.RequiredUserId(), body.Partner, body.Shiny, ct);
            return Results.NoContent();
        });

        group.MapGet("/battles", async (ClaimsPrincipal user, BattleRepository repo, CancellationToken ct) =>
        {
            var me = user.RequiredUserId();
            var rows = await repo.RecentAsync(me, 12, ct);
            return Results.Ok(rows.Select(r =>
            {
                var mine = r.P1UserId == me ? 1 : 2;
                return new BattleItem(r.Id, r.Format, mine == 1 ? r.P2Name : r.P1Name, r.Cpu != 0,
                    r.Winner == 0 ? "draw" : r.Winner == mine ? "win" : "loss",
                    (int)(mine == 1 ? r.P1Left : r.P2Left), (int)(mine == 1 ? r.P2Left : r.P1Left),
                    (int)r.Turns, r.Reason, r.EndedAt);
            }));
        });

        group.MapGet("/me/stats", async (ClaimsPrincipal user, BattleRepository repo, CancellationToken ct) =>
            Results.Ok(await repo.FormatRecordsAsync(user.RequiredUserId(), ct)));

        // Replays are visible to every signed-in trainer on this server, like watching live.
        group.MapGet("/battles/{id}", async (string id, BattleRepository repo, CancellationToken ct) =>
        {
            var row = await repo.GetAsync(id, withLog: true, ct);
            return row is null
                ? Results.NotFound()
                : Results.Ok(new
                {
                    row.Id, row.Format, row.P1Name, row.P2Name, row.P1UserId, row.P2UserId, cpu = row.Cpu != 0,
                    row.Winner, row.Reason, row.Turns, row.P1Left, row.P2Left, row.Background, row.StartedAt, row.EndedAt,
                    teams = row.Teams is null ? (System.Text.Json.JsonElement?)null : System.Text.Json.JsonDocument.Parse(row.Teams).RootElement.Clone(),
                    log = row.Log ?? "",
                });
        });

        return api;
    }

    private static async Task<TrainerCard> CardAsync(BattleRepository repo, long id, string name, ProfileRow? profile, CancellationToken ct)
    {
        profile ??= await repo.GetProfileAsync(id, ct);
        var record = await repo.RecordAsync(id, ct);
        var dex = await repo.LivingDexCountAsync(id, ct);
        return new TrainerCard(id, name, record.Wins, record.Losses, record.Streak, record.CpuWins, record.CpuLosses,
            dex, (int)profile.Partner, profile.PartnerShiny != 0, profile.LastSeenAt, record.Played, record.Badges);
    }
}
