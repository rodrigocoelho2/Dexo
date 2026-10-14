using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LivingDex.WebApi.Features.Accounts.Models.DTOs;
using LivingDex.WebApi.Features.DailyRed.Models.Entities;
using LivingDex.WebApi.Features.DailyRed.Repositories;
using Microsoft.Extensions.DependencyInjection;

namespace LivingDex.UnitTest.Integration;

/// <summary>Daily Red results as the battle side saves them, read back through the API (no simulator in tests).</summary>
public sealed class DailyRedTests
{
    private static async Task<MeDTO> Register(HttpClient client, string username) =>
        (await (await client.PostAsJsonAsync("/api/auth/register", new { username, password = "pikachu123" })).Content.ReadFromJsonAsync<MeDTO>())!;

    [SqlFact]
    public async Task OfficialBattles_OncePerDay_ShowUpInStatsAndTrainersToday()
    {
        using var app = new TestApp();
        var rodas = app.NewClient();
        var ana = app.NewClient();
        var me = await Register(rodas, "Rodas");
        var her = await Register(ana, "Ana");
        var today = DateTime.UtcNow.Date;
        var date = today.ToString("yyyy-MM-dd");

        var repo = app.Services.GetRequiredService<IDailyRedRepository>();

        // The day's team is stored once: a second save keeps the first.
        Assert.Equal("""{"a":1}""", await repo.SaveDayAsync(today, """{"a":1}"""));
        Assert.Equal("""{"a":1}""", await repo.SaveDayAsync(today, """{"a":2}"""));
        Assert.Equal("""{"a":1}""", await repo.GetDayAsync(today));

        // Yesterday Rodas won; today Ana won and Rodas hasn't played yet.
        Assert.True(await repo.StartAsync(me.Id, today.AddDays(-1), "r1", DateTime.UtcNow));
        await repo.FinishAsync(new DailyRedResult { UserID = me.Id, DayKey = today.AddDays(-1), BattleID = "r1", Status = DailyRedResult.Won, Turns = 20, MonsLeft = 2, RedLeft = 0, Grid = "110000" });
        Assert.True(await repo.StartAsync(her.Id, today, "a1", DateTime.UtcNow));
        Assert.False(await repo.StartAsync(her.Id, today, "a2", DateTime.UtcNow));
        await repo.FinishAsync(new DailyRedResult { UserID = her.Id, DayKey = today, BattleID = "a1", Status = DailyRedResult.Won, Turns = 14, MonsLeft = 3, RedLeft = 0, Grid = "111000" });
        // Finishing again (or another battle id) changes nothing.
        await repo.FinishAsync(new DailyRedResult { UserID = her.Id, DayKey = today, BattleID = "a1", Status = DailyRedResult.Lost, Turns = 99 });

        var page = await rodas.GetFromJsonAsync<JsonElement>($"/api/dailyred?date={date}");
        Assert.False(page.GetProperty("available").GetBoolean());   // no simulator in tests
        Assert.Equal("none", page.GetProperty("official").GetProperty("status").GetString());
        var stats = page.GetProperty("stats");
        Assert.Equal(1, stats.GetProperty("played").GetInt32());
        Assert.Equal(1, stats.GetProperty("streak").GetInt32());
        var trainers = page.GetProperty("trainers").EnumerateArray().ToList();
        Assert.Equal(2, trainers.Count);
        var anaRow = trainers.Single(t => t.GetProperty("name").GetString() == "Ana");
        Assert.Equal("played", anaRow.GetProperty("status").GetString());   // hidden until Rodas plays his
        Assert.Equal(0, anaRow.GetProperty("turns").GetInt32());

        var hers = await ana.GetFromJsonAsync<JsonElement>($"/api/dailyred?date={date}");
        Assert.Equal("won", hers.GetProperty("official").GetProperty("status").GetString());
        Assert.Equal("111000", hers.GetProperty("official").GetProperty("grid").GetString());
        Assert.Equal(14, hers.GetProperty("official").GetProperty("turns").GetInt32());

        // A battle still marked as playing with no live battle (a restart) gives the day back.
        Assert.True(await repo.StartAsync(me.Id, today, "r2", DateTime.UtcNow));
        var again = await rodas.GetFromJsonAsync<JsonElement>($"/api/dailyred?date={date}");
        Assert.Equal("none", again.GetProperty("official").GetProperty("status").GetString());
        Assert.True(await repo.StartAsync(me.Id, today, "r3", DateTime.UtcNow));

        var bad = await rodas.GetAsync("/api/dailyred?date=2001-01-01");
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
    }
}
