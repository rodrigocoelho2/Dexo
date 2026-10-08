using LivingDex.WebApi.Extensions.Authentication;
using LivingDex.WebApi.Extensions.Data;
using LivingDex.WebApi.Extensions.Globalization;
using LivingDex.WebApi.Extensions.Json;
using LivingDex.WebApi.Extensions.Mvc;
using LivingDex.WebApi.Features;
using LivingDex.WebApi.Features.Accounts.Repositories;
using LivingDex.WebApi.Features.Accounts.Services;
using LivingDex.WebApi.Features.Assets.Services;
using LivingDex.WebApi.Features.Battles.Hubs;
using LivingDex.WebApi.Features.Battles.Repositories;
using LivingDex.WebApi.Features.Battles.Services;
using LivingDex.WebApi.Features.Health.Services;
using LivingDex.WebApi.Features.States.Repositories;
using LivingDex.WebApi.Features.States.Services;
using LivingDex.WebApi.Features.Trainers.Repositories;
using LivingDex.WebApi.Features.Trainers.Services;
using Microsoft.AspNetCore.HttpOverrides;

namespace LivingDex.WebApi;

/// <summary>
/// Service registration and request pipeline of the WebApi.
/// </summary>
internal static class LivingDexStartup
{
    /// <summary>
    /// Registers every service. Services and repositories are singletons; each repository is registered before its service.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <param name="configuration">The configuration.</param>
    /// <param name="environment">The hosting environment.</param>
    /// <returns>The service collection.</returns>
    public static IServiceCollection AddLivingDex(this IServiceCollection services, IConfiguration configuration, IWebHostEnvironment environment)
    {
        var section = configuration.GetSection(LivingDexOptions.SectionName);
        var settings = section.Get<LivingDexOptions>() ?? new LivingDexOptions();
        settings.ResolvePaths(environment.ContentRootPath);
        Directory.CreateDirectory(settings.DataDirectory);

        services.AddOptions<LivingDexOptions>()
            .Bind(section)
            .PostConfigure(options => options.ResolvePaths(environment.ContentRootPath));

        services.AddControllers(static options => options.Filters.Add<AppHeaderFilter>())
            .ConfigureApplicationPartManager(static manager => manager.FeatureProviders.Add(new InternalControllerFeatureProvider()))
            .AddJsonOptions(static options => JsonSetup.Apply(options.JsonSerializerOptions));

        services.AddSignalR(static options => options.MaximumReceiveMessageSize = 16 * 1024)
            .AddJsonProtocol(static options => JsonSetup.Apply(options.PayloadSerializerOptions));

        services.AddLivingDexAuthentication(settings);
        services.AddProblemDetails();
        services.AddResponseCompression(static options => options.EnableForHttps = true);

        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(static options =>
        {
            options.EnableAnnotations();
            var xml = Path.Combine(AppContext.BaseDirectory, "LivingDex.WebApi.xml");
            if (File.Exists(xml))
            {
                options.IncludeXmlComments(xml);
            }
        });

        // Infrastructure
        services.AddSingleton(TimeProvider.System);
        services.AddSingleton<ISqlConnectionFactory, SqlConnectionFactory>();
        services.AddSingleton<ISqliteImporter, SqliteImporter>();
        services.AddSingleton<IGlobalizationHelper, GlobalizationHelper>();
        services.AddHttpClient(AssetStore.HttpClientName, static client =>
        {
            client.Timeout = TimeSpan.FromSeconds(20);
            client.DefaultRequestHeaders.UserAgent.ParseAdd("LivingDex/1.0");
        });

        // Accounts
        services.AddSingleton<IUserRepository, UserRepository>();
        services.AddSingleton<IAccountService, AccountService>();
        services.AddSingleton<IUserAdminService, UserAdminService>();

        // States
        services.AddSingleton<IStateRepository, StateRepository>();
        services.AddSingleton<IStateService, StateService>();

        // Trainers
        services.AddSingleton<ITrainerRepository, TrainerRepository>();
        services.AddSingleton<ITrainerService, TrainerService>();

        // Battles: the simulator process, the live battle state (both background services) and the REST side.
        services.AddSingleton<IBattleRepository, BattleRepository>();
        services.AddSingleton<SimulatorHost>();
        services.AddHostedService(static provider => provider.GetRequiredService<SimulatorHost>());
        services.AddSingleton<BattleManager>();
        services.AddHostedService(static provider => provider.GetRequiredService<BattleManager>());
        services.AddSingleton<IBattleService, BattleService>();

        // Assets
        services.AddSingleton<IAssetStore, AssetStore>();
        services.AddSingleton<IAssetPrefetchService, AssetPrefetchService>();

        // Health
        services.AddSingleton<IHealthService, HealthService>();

        return services;
    }

    /// <summary>
    /// Imports the old SQLite database once, then configures the request pipeline.
    /// </summary>
    /// <param name="app">The application.</param>
    /// <returns>The application.</returns>
    public static async Task<WebApplication> UseLivingDexAsync(this WebApplication app)
    {
        await app.Services.GetRequiredService<ISqliteImporter>().ImportAsync();

        var settings = app.Services.GetRequiredService<Microsoft.Extensions.Options.IOptions<LivingDexOptions>>().Value;
        if (settings.BehindProxy)
        {
            var forwarded = new ForwardedHeadersOptions { ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto };
            forwarded.KnownIPNetworks.Clear();
            forwarded.KnownProxies.Clear();
            app.UseForwardedHeaders(forwarded);
        }

        app.UseExceptionHandler();
        app.UseResponseCompression();
        app.UseDefaultFiles();
        app.UseStaticFiles(new StaticFileOptions
        {
            // The page, the service worker and the app manifest must never be cached, so a new deploy shows up on the next launch.
            OnPrepareResponse = static context =>
            {
                var name = context.File.Name;
                if (name.EndsWith(".html", StringComparison.OrdinalIgnoreCase) || name is "sw.js" or "manifest.json")
                {
                    context.Context.Response.Headers.CacheControl = "no-cache";
                }
            },
        });

        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        app.UseAuthentication();
        app.UseAuthorization();
        app.UseRateLimiter();

        app.MapControllers();
        app.MapHub<ShowdownHub>(ShowdownHub.Path);

        return app;
    }
}
