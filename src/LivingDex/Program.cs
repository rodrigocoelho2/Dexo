using System.Threading.RateLimiting;
using LivingDex;
using LivingDex.Assets;
using LivingDex.Auth;
using LivingDex.Data;
using LivingDex.Showdown;
using LivingDex.State;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

var settings = builder.Configuration.GetSection(LivingDexOptions.Section).Get<LivingDexOptions>() ?? new LivingDexOptions();
var dataDirectory = LivingDexOptions.ResolveDataDirectory(settings.DataDirectory, builder.Environment.ContentRootPath);
Directory.CreateDirectory(dataDirectory);

builder.Services.Configure<LivingDexOptions>(builder.Configuration.GetSection(LivingDexOptions.Section));
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<SqliteConnectionFactory>();
builder.Services.AddSingleton<DbWriteLock>();
builder.Services.AddSingleton<UserRepository>();
builder.Services.AddSingleton<StateRepository>();
builder.Services.AddSingleton<AssetCache>();
builder.Services.AddSingleton<AssetPrefetcher>();
builder.Services.AddHttpClient(AssetCache.HttpClientName, client =>
{
    client.Timeout = TimeSpan.FromSeconds(20);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("LivingDex/1.0");
});

builder.Services.AddLivingDexAuth(dataDirectory);

// Showdown: the simulator process, the live battle state and its SignalR hub.
builder.Services.AddSingleton<BattleRepository>();
builder.Services.AddSingleton<SimHost>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<SimHost>());
builder.Services.AddSingleton<BattleManager>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<BattleManager>());
builder.Services.AddSignalR(o => o.MaximumReceiveMessageSize = 16 * 1024);

// Slows down password guessing: a few sign-in / sign-up attempts per minute per address.
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy(AuthEndpoints.RateLimitPolicy, http => RateLimitPartition.GetFixedWindowLimiter(
        http.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = Math.Max(1, settings.AuthAttemptsPerMinute), Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
});

builder.Services.AddProblemDetails();
builder.Services.AddResponseCompression(o => o.EnableForHttps = true);

var app = builder.Build();

await app.Services.GetRequiredService<SqliteConnectionFactory>().MigrateAsync();

if (settings.BehindProxy)
{
    var forwarded = new ForwardedHeadersOptions { ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto };
    forwarded.KnownIPNetworks.Clear();
    forwarded.KnownProxies.Clear();
    app.UseForwardedHeaders(forwarded);
}

app.UseResponseCompression();
app.UseDefaultFiles();
app.UseStaticFiles(new StaticFileOptions
{
    // The page, the service worker and the app manifest must never be cached, so a new deploy shows up on the next launch.
    OnPrepareResponse = ctx =>
    {
        var name = ctx.File.Name;
        if (name.EndsWith(".html", StringComparison.OrdinalIgnoreCase) || name is "sw.js" or "manifest.json")
            ctx.Context.Response.Headers.CacheControl = "no-cache";
    }
});

app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

// Unprotected on purpose: the page calls it to find out whether it runs on the server and whether sign-up is open.
app.MapGet("/api/health", async (UserRepository users, BattleManager battles, IOptions<LivingDexOptions> options, CancellationToken ct) =>
{
    var count = await users.CountAsync(ct);
    return Results.Ok(new { status = "ok", firstRun = count == 0, registration = count == 0 || options.Value.AllowRegistration, showdown = battles.Available });
});

var api = app.MapGroup("/api").AddEndpointFilter<RequireAppHeaderFilter>();
api.MapAuthEndpoints();
api.MapAdminEndpoints();
api.MapStateEndpoints();
api.MapShowdownEndpoints();
app.MapHub<ShowdownHub>("/hubs/showdown");

app.MapAssetEndpoints();

app.Run();

// Exposed for WebApplicationFactory in the test project.
public partial class Program { }
