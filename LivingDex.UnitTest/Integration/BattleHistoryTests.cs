using System.Net.Http.Json;
using System.Text.Json;
using LivingDex.WebApi.Features.Accounts.Models.DTOs;
using LivingDex.WebApi.Features.Battles.Models.Entities;
using LivingDex.WebApi.Features.Battles.Repositories;
using Microsoft.Extensions.DependencyInjection;

namespace LivingDex.UnitTest.Integration;

/// <summary>Finished battles as the simulator side saves them, read back through the API.</summary>
public sealed class BattleHistoryTests
{
    private static SavedBattle Battle(string id, long p1, long? p2, int winner, int p1Left, int p2Left, int p1BestKo = 1, string format = "gen5randombattle", int minutesAgo = 0) => new()
    {
        BattleID = id,
        Format = format,
        P1UserID = p1,
        P2UserID = p2,
        P1Name = "Rodas",
        P2Name = p2 is null ? "CPU" : "Ana",
        IsCpu = p2 is null,
        Winner = winner,
        Reason = "normal",
        Turns = 20,
        P1Left = p1Left,
        P2Left = p2Left,
        P1BestKo = p1BestKo,
        Teams = """[[{"species":"Zekrom","fainted":false}],[{"species":"Gyarados","fainted":true}]]""",
        Log = "|turn|1\n|win|Rodas",
        Background = "forest",
        StartedAt = DateTime.UtcNow.AddMinutes(-minutesAgo - 10),
        EndedAt = DateTime.UtcNow.AddMinutes(-minutesAgo),
    };

    [SqlFact]
    public async Task SavedBattles_ShowUpInRecordsReplaysAndCards()
    {
        using var app = new TestApp();
        var rodas = app.NewClient();
        var me = (await (await rodas.PostAsJsonAsync("/api/auth/register", new { username = "Rodas", password = "pikachu123" })).Content.ReadFromJsonAsync<MeDTO>())!;
        var ana = (await (await app.NewClient().PostAsJsonAsync("/api/auth/register", new { username = "Ana", password = "pikachu123" })).Content.ReadFromJsonAsync<MeDTO>())!;

        var battles = app.Services.GetRequiredService<IBattleRepository>();
        await battles.SaveAsync(Battle("aaaaaaaaaaaaaaa1", me.Id, ana.Id, winner: 1, p1Left: 1, p2Left: 0, p1BestKo: 3, minutesAgo: 30));
        await battles.SaveAsync(Battle("aaaaaaaaaaaaaaa2", me.Id, ana.Id, winner: 2, p1Left: 0, p2Left: 2, minutesAgo: 20));
        await battles.SaveAsync(Battle("aaaaaaaaaaaaaaa3", me.Id, null, winner: 1, p1Left: 6, p2Left: 0, minutesAgo: 10));
        // Saving the same battle again replaces it.
        await battles.SaveAsync(Battle("aaaaaaaaaaaaaaa3", me.Id, null, winner: 1, p1Left: 6, p2Left: 0, minutesAgo: 10));

        var recent = await rodas.GetFromJsonAsync<List<JsonElement>>("/api/showdown/battles");
        Assert.Equal(["aaaaaaaaaaaaaaa3", "aaaaaaaaaaaaaaa2", "aaaaaaaaaaaaaaa1"], recent!.Select(battle => battle.GetProperty("id").GetString()));
        Assert.Equal("win", recent[0].GetProperty("result").GetString());
        Assert.True(recent[0].GetProperty("cpu").GetBoolean());
        Assert.Equal("loss", recent[1].GetProperty("result").GetString());
        Assert.Equal("Ana", recent[1].GetProperty("opponent").GetString());
        Assert.Equal(2, recent[1].GetProperty("opponentLeft").GetInt32());
        Assert.EndsWith("Z", recent[0].GetProperty("endedAt").GetString());

        var stats = await rodas.GetFromJsonAsync<List<JsonElement>>("/api/showdown/me/stats");
        var gen5 = Assert.Single(stats!);
        Assert.Equal(1, gen5.GetProperty("wins").GetInt32());
        Assert.Equal(1, gen5.GetProperty("losses").GetInt32());

        var card = await rodas.GetFromJsonAsync<JsonElement>($"/api/showdown/trainers/{me.Id}");
        Assert.Equal(1, card.GetProperty("wins").GetInt32());
        Assert.Equal(1, card.GetProperty("losses").GetInt32());
        Assert.Equal(0, card.GetProperty("streak").GetInt32());
        Assert.Equal(1, card.GetProperty("cpuWins").GetInt32());
        var badges = card.GetProperty("badges").EnumerateArray().Select(badge => badge.GetString()).ToList();
        Assert.Contains("first-win", badges);
        Assert.Contains("last-stand", badges);
        Assert.Contains("sweeper", badges);
        Assert.DoesNotContain("flawless", badges);   // the 6-left win was against the CPU

        var replay = await rodas.GetFromJsonAsync<JsonElement>("/api/showdown/battles/aaaaaaaaaaaaaaa1");
        Assert.Equal("|turn|1\n|win|Rodas", replay.GetProperty("log").GetString());
        Assert.Equal(me.Id, replay.GetProperty("p1UserId").GetInt64());
        Assert.Equal("Zekrom", replay.GetProperty("teams")[0][0].GetProperty("species").GetString());
        Assert.Equal("forest", replay.GetProperty("background").GetString());

        // Deleting an account keeps the other trainer's battles.
        var admin = rodas;
        await admin.DeleteAsync($"/api/admin/users/{ana.Id}");
        Assert.Equal(3, (await rodas.GetFromJsonAsync<List<JsonElement>>("/api/showdown/battles"))!.Count);
        var orphan = await rodas.GetFromJsonAsync<JsonElement>("/api/showdown/battles/aaaaaaaaaaaaaaa2");
        Assert.Equal(JsonValueKind.Null, orphan.GetProperty("p2UserId").ValueKind);
    }
}
