using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LivingDex.WebApi.Features.Accounts.Models.DTOs;
using LivingDex.WebApi.Features.States.Models.DTOs;

namespace LivingDex.UnitTest.Integration;

/// <summary>The page's API end to end, against SQL Server. Each test gets its own app and database.</summary>
public sealed class ApiTests
{
    private static object Progress(params string[] caught) =>
        new { caught = new Dictionary<string, string[]> { ["home|normal"] = caught }, det = new { }, log = Array.Empty<object>() };

    private static async Task<MeDTO> Register(HttpClient client, string username, string password = "pikachu123")
    {
        var response = await client.PostAsJsonAsync("/api/auth/register", new { username, password });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<MeDTO>())!;
    }

    [SqlFact]
    public async Task Health_ReportsFirstRunUntilTheFirstAccount()
    {
        using var app = new TestApp(allowRegistration: false);
        var client = app.NewClient();

        var before = await client.GetFromJsonAsync<JsonElement>("/api/health");
        Assert.Equal("ok", before.GetProperty("status").GetString());
        Assert.True(before.GetProperty("firstRun").GetBoolean());
        Assert.True(before.GetProperty("registration").GetBoolean());
        Assert.False(before.GetProperty("showdown").GetBoolean());

        await Register(client, "Rodas");

        var after = await client.GetFromJsonAsync<JsonElement>("/api/health");
        Assert.False(after.GetProperty("firstRun").GetBoolean());
        Assert.False(after.GetProperty("registration").GetBoolean());
    }

    [SqlFact]
    public async Task Progress_RequiresASignedInUser()
    {
        using var app = new TestApp();
        Assert.Equal(HttpStatusCode.Unauthorized, (await app.NewClient().GetAsync("/api/state")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await app.NewClient().GetAsync("/api/auth/me")).StatusCode);
    }

    [SqlFact]
    public async Task Writes_WithoutTheAppHeader_AreRejected()
    {
        using var app = new TestApp();
        var client = app.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/register", new { username = "Rodas", password = "pikachu123" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("Missing the X-LivingDex header.", (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("detail").GetString());
    }

    [SqlTheory]
    [InlineData("ab", "pikachu123")]
    [InlineData("bad name", "pikachu123")]
    [InlineData("Rodas", "short")]
    public async Task InvalidUsernamesAndPasswords_AreRejected(string username, string password)
    {
        using var app = new TestApp();
        var response = await app.NewClient().PostAsJsonAsync("/api/auth/register", new { username, password });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.False(string.IsNullOrEmpty((await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("detail").GetString()));
    }

    [SqlFact]
    public async Task FirstAccount_IsAdmin_LaterOnesAreNot()
    {
        using var app = new TestApp();
        Assert.True((await Register(app.NewClient(), "Rodas")).IsAdmin);
        Assert.False((await Register(app.NewClient(), "Ana")).IsAdmin);
    }

    [SqlFact]
    public async Task Usernames_AreUniqueIgnoringCase_AndLoginIgnoresCase()
    {
        using var app = new TestApp();
        await Register(app.NewClient(), "Rodas");

        var duplicate = await app.NewClient().PostAsJsonAsync("/api/auth/register", new { username = "rodas", password = "pikachu123" });
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);

        var login = await app.NewClient().PostAsJsonAsync("/api/auth/login", new { username = "RODAS", password = "pikachu123" });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        Assert.Equal("Rodas", (await login.Content.ReadFromJsonAsync<MeDTO>())!.Username);
    }

    [SqlFact]
    public async Task WrongPasswordAndUnknownUser_LookTheSame()
    {
        using var app = new TestApp();
        await Register(app.NewClient(), "Rodas");

        var wrong = await app.NewClient().PostAsJsonAsync("/api/auth/login", new { username = "Rodas", password = "nope-nope" });
        var unknown = await app.NewClient().PostAsJsonAsync("/api/auth/login", new { username = "Nobody", password = "nope-nope" });

        Assert.Equal(HttpStatusCode.Unauthorized, wrong.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, unknown.StatusCode);
        Assert.Equal(await wrong.Content.ReadAsStringAsync(), await unknown.Content.ReadAsStringAsync());
    }

    [SqlFact]
    public async Task EachUser_HasTheirOwnProgress()
    {
        using var app = new TestApp();
        var rodas = app.NewClient();
        var ana = app.NewClient();
        await Register(rodas, "Rodas");
        await Register(ana, "Ana");

        (await rodas.PutAsJsonAsync("/api/state", new { revision = 0, data = Progress("s:1", "s:4") })).EnsureSuccessStatusCode();

        var mine = await rodas.GetFromJsonAsync<StateDTO>("/api/state");
        var hers = await ana.GetFromJsonAsync<StateDTO>("/api/state");
        Assert.Equal(1, mine!.Revision);
        Assert.NotNull(mine.UpdatedAt);
        Assert.Equal(2, mine.Data.GetProperty("caught").GetProperty("home|normal").GetArrayLength());
        Assert.Equal(0, hers!.Revision);
        Assert.Equal(JsonValueKind.Null, hers.Data.ValueKind);
    }

    [SqlFact]
    public async Task StaleRevision_IsRejectedWithTheCurrentState()
    {
        using var app = new TestApp();
        var client = app.NewClient();
        await Register(client, "Rodas");
        (await client.PutAsJsonAsync("/api/state", new { revision = 0, data = Progress("s:1") })).EnsureSuccessStatusCode();

        var stale = await client.PutAsJsonAsync("/api/state", new { revision = 0, data = Progress("s:2") });

        Assert.Equal(HttpStatusCode.Conflict, stale.StatusCode);
        var current = await stale.Content.ReadFromJsonAsync<StateDTO>();
        Assert.Equal(1L, current!.Revision);
        Assert.Equal("s:1", current.Data.GetProperty("caught").GetProperty("home|normal")[0].GetString());
    }

    [SqlFact]
    public async Task Progress_ThatIsNotAnObject_IsRejected()
    {
        using var app = new TestApp();
        var client = app.NewClient();
        await Register(client, "Rodas");

        var response = await client.PutAsJsonAsync("/api/state", new { revision = 0, data = new[] { 1, 2 } });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [SqlFact]
    public async Task History_KeepsTheConfiguredNumberOfRevisions_AndCanRestore()
    {
        using var app = new TestApp();
        var client = app.NewClient();
        await Register(client, "Rodas");
        for (var revision = 0; revision < 5; revision++)
        {
            (await client.PutAsJsonAsync("/api/state", new { revision, client = "test", data = Progress(Enumerable.Range(1, revision + 1).Select(i => $"s:{i}").ToArray()) }))
                .EnsureSuccessStatusCode();
        }

        var history = await client.GetFromJsonAsync<List<HistoryItemDTO>>("/api/history");
        Assert.Equal([5L, 4L, 3L], history!.Select(entry => entry.Revision));
        Assert.Equal(5, history![0].Caught);
        Assert.Equal("test", history[0].Client);

        var restored = await client.PostAsync("/api/history/3/restore", null);
        restored.EnsureSuccessStatusCode();
        var state = await restored.Content.ReadFromJsonAsync<StateDTO>();
        Assert.Equal(6L, state!.Revision);
        Assert.Equal(3, state.Data.GetProperty("caught").GetProperty("home|normal").GetArrayLength());
        Assert.Equal("restore of r3", (await client.GetFromJsonAsync<List<HistoryItemDTO>>("/api/history?take=1"))![0].Client);

        Assert.Equal(HttpStatusCode.NotFound, (await client.PostAsync("/api/history/1/restore", null)).StatusCode);
    }

    [SqlFact]
    public async Task ChangingThePassword_SignsOutOtherDevicesOnly()
    {
        using var app = new TestApp();
        var phone = app.NewClient();
        var pc = app.NewClient();
        await Register(phone, "Rodas");
        (await pc.PostAsJsonAsync("/api/auth/login", new { username = "Rodas", password = "pikachu123" })).EnsureSuccessStatusCode();

        var change = await phone.PostAsJsonAsync("/api/auth/password", new { currentPassword = "pikachu123", newPassword = "charizard99" });
        Assert.Equal(HttpStatusCode.NoContent, change.StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await phone.GetAsync("/api/state")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await pc.GetAsync("/api/state")).StatusCode);
    }

    [SqlFact]
    public async Task Admin_CanResetAPassword_AndOthersCannotUseAdminEndpoints()
    {
        using var app = new TestApp();
        var admin = app.NewClient();
        var ana = app.NewClient();
        await Register(admin, "Rodas");
        var anaMe = await Register(ana, "Ana");

        Assert.Equal(HttpStatusCode.Forbidden, (await ana.GetAsync("/api/admin/users")).StatusCode);

        var users = await admin.GetFromJsonAsync<List<UserListItemDTO>>("/api/admin/users");
        Assert.Equal(["Rodas", "Ana"], users!.Select(user => user.Username));

        var reset = await admin.PostAsync($"/api/admin/users/{anaMe.Id}/reset-password", null);
        reset.EnsureSuccessStatusCode();
        var temporary = (await reset.Content.ReadFromJsonAsync<TemporaryPasswordDTO>())!.TemporaryPassword;

        Assert.Equal(HttpStatusCode.Unauthorized, (await ana.GetAsync("/api/state")).StatusCode);
        var login = await app.NewClient().PostAsJsonAsync("/api/auth/login", new { username = "Ana", password = temporary });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
    }

    [SqlFact]
    public async Task DeletingTheAdmin_PromotesTheOldestRemainingAccount()
    {
        using var app = new TestApp();
        var admin = app.NewClient();
        await Register(admin, "Rodas");
        await Register(app.NewClient(), "Ana");
        await Register(app.NewClient(), "Zed");

        var deleted = await admin.PostAsJsonAsync("/api/auth/delete-account", new { password = "pikachu123" });
        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);

        var login = await app.NewClient().PostAsJsonAsync("/api/auth/login", new { username = "Ana", password = "pikachu123" });
        Assert.True((await login.Content.ReadFromJsonAsync<MeDTO>())!.IsAdmin);
    }

    [SqlFact]
    public async Task ClosedRegistration_StillAllowsTheFirstAccount()
    {
        using var app = new TestApp(allowRegistration: false);
        await Register(app.NewClient(), "Rodas");

        var second = await app.NewClient().PostAsJsonAsync("/api/auth/register", new { username = "Ana", password = "pikachu123" });
        Assert.Equal(HttpStatusCode.Forbidden, second.StatusCode);
    }

    [SqlTheory]
    [InlineData("/assets/sprites/../livingdex.db")]
    [InlineData("/assets/sprites/1.exe")]
    [InlineData("/assets/other/1.png")]
    public async Task AssetRoute_OnlyServesKnownPaths(string url)
    {
        using var app = new TestApp();
        var response = await app.NewClient().GetAsync(url);

        Assert.NotEqual(HttpStatusCode.OK, response.StatusCode);
        Assert.NotEqual(HttpStatusCode.Redirect, response.StatusCode);
    }

    [SqlFact]
    public async Task AssetRoute_RedirectsUpstream_WhenCachingIsOffAndTheFileIsNotBundled()
    {
        using var app = new TestApp();
        var response = await app.NewClient().GetAsync("/assets/cries/latest/99999.ogg");

        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        Assert.StartsWith("https://raw.githubusercontent.com/PokeAPI/cries/", response.Headers.Location!.ToString());
    }

    [SqlFact]
    public async Task ThePage_IsServedAtTheRoot()
    {
        using var app = new TestApp();
        var response = await app.CreateClient().GetAsync("/");

        response.EnsureSuccessStatusCode();
        Assert.Contains("HOME Living Dex", await response.Content.ReadAsStringAsync());
        Assert.Equal("no-cache", response.Headers.CacheControl!.ToString());
    }

    [SqlFact]
    public async Task ThePagesFiles_AreCachedForGood_WhenVersioned()
    {
        using var app = new TestApp();
        var client = app.CreateClient();
        var page = await client.GetStringAsync("/");
        var script = System.Text.RegularExpressions.Regex.Match(page, "src=\"(/js/app\\.js\\?v=[0-9a-f]+)\"").Groups[1].Value;

        Assert.NotEmpty(script);
        var versioned = await client.GetAsync(script);
        versioned.EnsureSuccessStatusCode();
        var cache = versioned.Headers.CacheControl!;
        Assert.True(cache.Public);
        Assert.Equal(TimeSpan.FromDays(365), cache.MaxAge);
        Assert.Contains(cache.Extensions, e => e.Name == "immutable");

        var plain = await client.GetAsync("/js/app.js");
        plain.EnsureSuccessStatusCode();
        Assert.Null(plain.Headers.CacheControl);
    }

    [SqlFact]
    public async Task TrainerCards_ShowPartnerAndLivingDexCount()
    {
        using var app = new TestApp();
        var rodas = app.NewClient();
        var me = await Register(rodas, "Rodas");
        await Register(app.NewClient(), "Ana");

        Assert.Equal(HttpStatusCode.Unauthorized, (await app.NewClient().GetAsync("/api/showdown/trainers")).StatusCode);

        (await rodas.PutAsJsonAsync("/api/state", new { revision = 0, data = Progress("s:1", "s:4", "s:7") })).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.NoContent, (await rodas.PutAsJsonAsync("/api/showdown/me/partner", new { partner = 169, shiny = true })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await rodas.PutAsJsonAsync("/api/showdown/me/partner", new { partner = 0, shiny = false })).StatusCode);

        var cards = await rodas.GetFromJsonAsync<List<JsonElement>>("/api/showdown/trainers");
        Assert.Equal(2, cards!.Count);
        var card = cards.Single(c => c.GetProperty("id").GetInt64() == me.Id);
        Assert.Equal(169, card.GetProperty("partner").GetInt32());
        Assert.True(card.GetProperty("partnerShiny").GetBoolean());
        Assert.Equal(3, card.GetProperty("livingDex").GetInt32());
        Assert.Equal(0, card.GetProperty("wins").GetInt32());
        Assert.Equal(JsonValueKind.Array, card.GetProperty("badges").ValueKind);

        var one = await rodas.GetFromJsonAsync<JsonElement>($"/api/showdown/trainers/{me.Id}");
        Assert.Equal("Rodas", one.GetProperty("name").GetString());
        Assert.Equal(HttpStatusCode.NotFound, (await rodas.GetAsync("/api/showdown/trainers/999")).StatusCode);

        var status = await rodas.GetFromJsonAsync<JsonElement>("/api/showdown/status");
        Assert.False(status.GetProperty("available").GetBoolean());
        Assert.Equal(60, status.GetProperty("turnSeconds").GetInt32());
        Assert.Empty((await rodas.GetFromJsonAsync<List<JsonElement>>("/api/showdown/battles"))!);
        Assert.Empty((await rodas.GetFromJsonAsync<List<JsonElement>>("/api/showdown/me/stats"))!);
        Assert.Equal(HttpStatusCode.NotFound, (await rodas.GetAsync("/api/showdown/battles/0123456789abcdef")).StatusCode);
    }
}
