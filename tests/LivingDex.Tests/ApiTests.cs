using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LivingDex.Auth;
using LivingDex.State;
using Microsoft.AspNetCore.Mvc.Testing;

namespace LivingDex.Tests;

/// <summary>Each test gets its own app instance and its own empty data folder.</summary>
public sealed class TestApp : WebApplicationFactory<Program>
{
    private readonly string _dataDir = Path.Combine(Path.GetTempPath(), "livingdex-tests", Guid.NewGuid().ToString("N"));
    private readonly bool _allowRegistration;

    public TestApp(bool allowRegistration = true) => _allowRegistration = allowRegistration;

    protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
    {
        builder.UseSetting("LivingDex:DataDirectory", _dataDir);
        builder.UseSetting("LivingDex:AllowRegistration", _allowRegistration ? "true" : "false");
        builder.UseSetting("LivingDex:HistoryLimit", "3");
        builder.UseSetting("LivingDex:AuthAttemptsPerMinute", "1000");
        builder.UseSetting("LivingDex:CacheAssets", "false");
        builder.UseSetting("LivingDex:ShowdownEnabled", "false");   // no Node.js process in tests
    }

    /// <summary>A client with its own cookie jar and the header the API requires on writes.</summary>
    public HttpClient NewClient()
    {
        var client = CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        client.DefaultRequestHeaders.Add(RequireAppHeaderFilter.HeaderName, "1");
        return client;
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
        try { Directory.Delete(_dataDir, recursive: true); } catch (IOException) { }
    }
}

public sealed class ApiTests
{
    private static object Progress(params string[] caught) =>
        new { caught = new Dictionary<string, string[]> { ["home|normal"] = caught }, det = new { }, log = Array.Empty<object>() };

    private static async Task<MeResponse> Register(HttpClient client, string username, string password = "pikachu123")
    {
        var res = await client.PostAsJsonAsync("/api/auth/register", new { username, password });
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        return (await res.Content.ReadFromJsonAsync<MeResponse>())!;
    }

    [Fact]
    public async Task Progress_requires_a_signed_in_user()
    {
        using var app = new TestApp();
        Assert.Equal(HttpStatusCode.Unauthorized, (await app.NewClient().GetAsync("/api/state")).StatusCode);
    }

    [Fact]
    public async Task Writes_without_the_app_header_are_rejected()
    {
        using var app = new TestApp();
        var client = app.CreateClient();
        var res = await client.PostAsJsonAsync("/api/auth/register", new { username = "Rodas", password = "pikachu123" });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Theory]
    [InlineData("a!", "pikachu123")]
    [InlineData("Rodas", "short")]
    public async Task Invalid_usernames_and_passwords_are_rejected(string username, string password)
    {
        using var app = new TestApp();
        var res = await app.NewClient().PostAsJsonAsync("/api/auth/register", new { username, password });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task First_account_is_admin_and_later_ones_are_not()
    {
        using var app = new TestApp();
        Assert.True((await Register(app.NewClient(), "Rodas")).IsAdmin);
        Assert.False((await Register(app.NewClient(), "Ana")).IsAdmin);
    }

    [Fact]
    public async Task Usernames_are_unique_ignoring_case_and_login_ignores_case()
    {
        using var app = new TestApp();
        await Register(app.NewClient(), "Rodas");

        var dup = await app.NewClient().PostAsJsonAsync("/api/auth/register", new { username = "rodas", password = "pikachu123" });
        Assert.Equal(HttpStatusCode.Conflict, dup.StatusCode);

        var login = await app.NewClient().PostAsJsonAsync("/api/auth/login", new { username = "RODAS", password = "pikachu123" });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
    }

    [Fact]
    public async Task Wrong_password_and_unknown_user_look_the_same()
    {
        using var app = new TestApp();
        await Register(app.NewClient(), "Rodas");

        var wrong = await app.NewClient().PostAsJsonAsync("/api/auth/login", new { username = "Rodas", password = "nope12345" });
        var unknown = await app.NewClient().PostAsJsonAsync("/api/auth/login", new { username = "Ghost", password = "nope12345" });
        Assert.Equal(HttpStatusCode.Unauthorized, wrong.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, unknown.StatusCode);
    }

    [Fact]
    public async Task Each_user_has_their_own_progress()
    {
        using var app = new TestApp();
        var rodas = app.NewClient(); var ana = app.NewClient();
        await Register(rodas, "Rodas"); await Register(ana, "Ana");

        (await rodas.PutAsJsonAsync("/api/state", new { revision = 0, data = Progress("s:1") })).EnsureSuccessStatusCode();

        var anaState = await ana.GetFromJsonAsync<StateResponse>("/api/state");
        Assert.Equal(0L, anaState!.Revision);
        Assert.Equal(JsonValueKind.Null, anaState.Data.ValueKind);
    }

    [Fact]
    public async Task Stale_revision_is_rejected_with_the_current_state()
    {
        using var app = new TestApp();
        var client = app.NewClient();
        await Register(client, "Rodas");
        (await client.PutAsJsonAsync("/api/state", new { revision = 0, data = Progress("s:1") })).EnsureSuccessStatusCode();

        var stale = await client.PutAsJsonAsync("/api/state", new { revision = 0, data = Progress("s:7") });

        Assert.Equal(HttpStatusCode.Conflict, stale.StatusCode);
        var current = await stale.Content.ReadFromJsonAsync<StateResponse>();
        Assert.Equal(1L, current!.Revision);
    }

    [Fact]
    public async Task History_keeps_the_configured_number_of_revisions_and_can_restore()
    {
        using var app = new TestApp();
        var client = app.NewClient();
        await Register(client, "Rodas");
        for (var r = 0; r < 5; r++)
            (await client.PutAsJsonAsync("/api/state", new { revision = r, data = Progress(Enumerable.Range(1, r + 1).Select(i => $"s:{i}").ToArray()) }))
                .EnsureSuccessStatusCode();

        var history = await client.GetFromJsonAsync<List<HistoryItem>>("/api/history");
        Assert.Equal(new long[] { 5, 4, 3 }, history!.Select(h => h.Revision));

        var restored = await client.PostAsync("/api/history/3/restore", null);
        restored.EnsureSuccessStatusCode();
        var state = await restored.Content.ReadFromJsonAsync<StateResponse>();
        Assert.Equal(6L, state!.Revision);
        Assert.Equal(3, state.Data.GetProperty("caught").GetProperty("home|normal").GetArrayLength());
    }

    [Fact]
    public async Task Changing_the_password_signs_out_other_devices_only()
    {
        using var app = new TestApp();
        var phone = app.NewClient(); var pc = app.NewClient();
        await Register(phone, "Rodas");
        (await pc.PostAsJsonAsync("/api/auth/login", new { username = "Rodas", password = "pikachu123" })).EnsureSuccessStatusCode();

        var change = await phone.PostAsJsonAsync("/api/auth/password", new { currentPassword = "pikachu123", newPassword = "charizard99" });
        Assert.Equal(HttpStatusCode.NoContent, change.StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await phone.GetAsync("/api/state")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await pc.GetAsync("/api/state")).StatusCode);
    }

    [Fact]
    public async Task Admin_can_reset_a_password_and_others_cannot_use_admin_endpoints()
    {
        using var app = new TestApp();
        var admin = app.NewClient(); var ana = app.NewClient();
        await Register(admin, "Rodas");
        var anaMe = await Register(ana, "Ana");

        Assert.Equal(HttpStatusCode.Forbidden, (await ana.GetAsync("/api/admin/users")).StatusCode);

        var reset = await admin.PostAsync($"/api/admin/users/{anaMe.Id}/reset-password", null);
        reset.EnsureSuccessStatusCode();
        var temp = (await reset.Content.ReadFromJsonAsync<TemporaryPasswordResponse>())!.TemporaryPassword;

        Assert.Equal(HttpStatusCode.Unauthorized, (await ana.GetAsync("/api/state")).StatusCode);
        var login = await app.NewClient().PostAsJsonAsync("/api/auth/login", new { username = "Ana", password = temp });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
    }

    [Fact]
    public async Task Deleting_the_admin_promotes_the_oldest_remaining_account()
    {
        using var app = new TestApp();
        var admin = app.NewClient();
        await Register(admin, "Rodas");
        await Register(app.NewClient(), "Ana");

        var del = await admin.PostAsJsonAsync("/api/auth/delete-account", new { password = "pikachu123" });
        Assert.Equal(HttpStatusCode.NoContent, del.StatusCode);

        var login = await app.NewClient().PostAsJsonAsync("/api/auth/login", new { username = "Ana", password = "pikachu123" });
        Assert.True((await login.Content.ReadFromJsonAsync<MeResponse>())!.IsAdmin);
    }

    [Fact]
    public async Task Closed_registration_still_allows_the_first_account()
    {
        using var app = new TestApp(allowRegistration: false);
        await Register(app.NewClient(), "Rodas");

        var second = await app.NewClient().PostAsJsonAsync("/api/auth/register", new { username = "Ana", password = "pikachu123" });
        Assert.Equal(HttpStatusCode.Forbidden, second.StatusCode);
    }

    [Theory]
    [InlineData("/assets/sprites/../livingdex.db")]
    [InlineData("/assets/sprites/1.exe")]
    [InlineData("/assets/other/1.png")]
    public async Task Asset_route_only_serves_known_sprite_and_cry_paths(string url)
    {
        using var app = new TestApp();
        var res = await app.CreateClient().GetAsync(url);
        Assert.NotEqual(HttpStatusCode.OK, res.StatusCode);
        Assert.NotEqual(HttpStatusCode.Redirect, res.StatusCode);
    }

    [Fact]
    public async Task The_page_is_served_at_the_root()
    {
        using var app = new TestApp();
        var res = await app.CreateClient().GetAsync("/");
        res.EnsureSuccessStatusCode();
        Assert.Contains("HOME Living Dex", await res.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Trainer_cards_show_partner_and_living_dex_count()
    {
        using var app = new TestApp();
        var rodas = app.NewClient();
        var me = await Register(rodas, "Rodas");
        await Register(app.NewClient(), "Ana");

        Assert.Equal(HttpStatusCode.Unauthorized, (await app.NewClient().GetAsync("/api/showdown/trainers")).StatusCode);

        (await rodas.PutAsJsonAsync("/api/state", new { revision = 0, data = Progress("s:1", "s:4", "s:7") })).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.NoContent, (await rodas.PutAsJsonAsync("/api/showdown/me/partner", new { partner = 169, shiny = true })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await rodas.PutAsJsonAsync("/api/showdown/me/partner", new { partner = 0, shiny = false })).StatusCode);

        var cards = await rodas.GetFromJsonAsync<List<System.Text.Json.JsonElement>>("/api/showdown/trainers");
        Assert.Equal(2, cards!.Count);
        var card = cards.Single(c => c.GetProperty("id").GetInt64() == me.Id);
        Assert.Equal(169, card.GetProperty("partner").GetInt32());
        Assert.True(card.GetProperty("partnerShiny").GetBoolean());
        Assert.Equal(3, card.GetProperty("livingDex").GetInt32());
        Assert.Equal(0, card.GetProperty("wins").GetInt32());

        var status = await rodas.GetFromJsonAsync<System.Text.Json.JsonElement>("/api/showdown/status");
        Assert.False(status.GetProperty("available").GetBoolean());
        Assert.Empty((await rodas.GetFromJsonAsync<List<System.Text.Json.JsonElement>>("/api/showdown/battles"))!);
    }
}
