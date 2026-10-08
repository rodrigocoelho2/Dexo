using LivingDex.Library.Constants;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace LivingDex.UnitTest.Integration;

/// <summary>The whole WebApi on its own throw-away database and data folder.</summary>
internal sealed class TestApp : WebApplicationFactory<Program>
{
    private readonly bool _allowRegistration;
    private readonly TempFolder _data;

    public TestApp(bool allowRegistration = true, TempFolder? data = null)
    {
        _allowRegistration = allowRegistration;
        _data = data ?? TestSupport.NewFolder();
    }

    public TestDatabase Database { get; } = new();

    public string DataDirectory => _data.Path;

    /// <summary>A client with its own cookie jar and the header the API requires on writes.</summary>
    public HttpClient NewClient()
    {
        var client = CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true, AllowAutoRedirect = false });
        client.DefaultRequestHeaders.Add(ApiHeaders.App, "1");
        return client;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("ConnectionStrings:LivingDex", Database.ConnectionString);
        builder.UseSetting("LivingDex:DataDirectory", _data.Path);
        builder.UseSetting("LivingDex:AllowRegistration", _allowRegistration ? "true" : "false");
        builder.UseSetting("LivingDex:HistoryLimit", "3");
        builder.UseSetting("LivingDex:AuthAttemptsPerMinute", "1000");
        builder.UseSetting("LivingDex:CacheAssets", "false");
        builder.UseSetting("LivingDex:ShowdownEnabled", "false");   // no Node.js process in tests
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
        {
            Database.Dispose();
            _data.Dispose();
        }
    }
}
