using System.Net;
using LivingDex.Library.Enums;
using LivingDex.WebApi.Features.Assets.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace LivingDex.UnitTest.Assets;

public sealed class AssetStoreTests : IDisposable
{
    private readonly TempFolder _data = TestSupport.NewFolder();
    private readonly TempFolder _bundle = TestSupport.NewFolder();

    public void Dispose()
    {
        _data.Dispose();
        _bundle.Dispose();
    }

    private AssetStore Store(FakeHttpMessageHandler handler, bool cacheAssets = true) =>
        new(new FakeHttpClientFactory(handler), TestSupport.Options(options =>
        {
            options.DataDirectory = _data.Path;
            options.AssetsDirectory = _bundle.Path;
            options.CacheAssets = cacheAssets;
        }), NullLogger<AssetStore>.Instance);

    [Theory]
    [InlineData(AssetKind.Sprites, "../livingdex.db")]
    [InlineData(AssetKind.Sprites, "1.exe")]
    [InlineData(AssetKind.Sprites, "a//b.png")]
    [InlineData(AssetKind.Sprites, "theme.mp3")]
    [InlineData(AssetKind.Music, "../x.mp3")]
    [InlineData(AssetKind.BattleBg, "bg-forest.png")]
    public async Task UnknownPaths_AreRejectedWithoutAskingUpstream(AssetKind kind, string path)
    {
        var handler = new FakeHttpMessageHandler(HttpStatusCode.OK, "x");

        var lookup = await Store(handler).ResolveAsync(kind, path);

        Assert.Equal(AssetState.Rejected, lookup.State);
        Assert.Empty(handler.Requests);
    }

    [Fact]
    public async Task BundledFile_IsServedFirst_EvenWithCachingOff()
    {
        Directory.CreateDirectory(Path.Combine(_bundle.Path, "sprites", "other", "home"));
        await File.WriteAllTextAsync(Path.Combine(_bundle.Path, "sprites", "other", "home", "25.png"), "png");
        var handler = new FakeHttpMessageHandler(HttpStatusCode.OK, "x");

        var lookup = await Store(handler, cacheAssets: false).ResolveAsync(AssetKind.Sprites, "other/home/25.png");

        Assert.Equal(AssetState.Cached, lookup.State);
        Assert.Equal("image/png", lookup.ContentType);
        Assert.Null(lookup.RedirectUrl);
        Assert.Empty(handler.Requests);
    }

    [Fact]
    public async Task UnreadableBundledFile_IsDownloadedInstead()
    {
        if (OperatingSystem.IsWindows())
        {
            return;
        }

        var file = Path.Combine(_bundle.Path, "cries", "latest", "25.ogg");
        Directory.CreateDirectory(Path.GetDirectoryName(file)!);
        await File.WriteAllTextAsync(file, "bundled");
        File.SetUnixFileMode(file, UnixFileMode.None);
        try
        {
            using (File.OpenHandle(file, FileMode.Open, FileAccess.Read))
            {
                return;   // running as root: every file is readable, nothing to test
            }
        }
        catch (UnauthorizedAccessException)
        {
        }

        var handler = new FakeHttpMessageHandler(HttpStatusCode.OK, "downloaded");
        var lookup = await Store(handler).ResolveAsync(AssetKind.Cries, "latest/25.ogg");

        Assert.Equal(AssetState.Downloaded, lookup.State);
        Assert.Single(handler.Requests);
        File.SetUnixFileMode(file, UnixFileMode.UserRead | UnixFileMode.UserWrite);
    }

    [Fact]
    public async Task CachingOff_RedirectsUpstream()
    {
        var lookup = await Store(new FakeHttpMessageHandler(HttpStatusCode.OK), cacheAssets: false).ResolveAsync(AssetKind.Cries, "latest/25.ogg");

        Assert.Equal("https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/25.ogg", lookup.RedirectUrl);
    }

    [Fact]
    public async Task MissingFile_IsDownloadedOnce_ThenServedFromTheCache()
    {
        var handler = new FakeHttpMessageHandler(HttpStatusCode.OK, "ogg");
        var store = Store(handler);

        var first = await store.ResolveAsync(AssetKind.Cries, "latest/25.ogg");
        var second = await store.ResolveAsync(AssetKind.Cries, "latest/25.ogg");

        Assert.Equal(AssetState.Downloaded, first.State);
        Assert.Equal(AssetState.Cached, second.State);
        Assert.Single(handler.Requests);
        Assert.Equal("ogg", await File.ReadAllTextAsync(Path.Combine(_data.Path, "cache", "cries", "latest", "25.ogg")));
    }

    [Fact]
    public async Task NotUpstream_IsRememberedAsMissing()
    {
        var handler = new FakeHttpMessageHandler(HttpStatusCode.NotFound);
        var store = Store(handler);

        Assert.Equal(AssetState.Missing, (await store.EnsureAsync(AssetKind.Sprites, "10999.png", CancellationToken.None)).State);
        Assert.Equal(AssetState.Missing, (await store.EnsureAsync(AssetKind.Sprites, "10999.png", CancellationToken.None)).State);
        Assert.Single(handler.Requests);
    }

    [Fact]
    public async Task UpstreamError_IsAFailure_AndNotRemembered()
    {
        var handler = new FakeHttpMessageHandler(HttpStatusCode.InternalServerError);
        var store = Store(handler);

        Assert.Equal(AssetState.Failed, (await store.ResolveAsync(AssetKind.Music, "bw-trainer.mp3")).State);
        Assert.Equal(AssetState.Failed, (await store.ResolveAsync(AssetKind.Music, "bw-trainer.mp3")).State);
        Assert.Equal(2, handler.Requests.Count);
    }

    [Theory]
    [InlineData("sprites", AssetKind.Sprites)]
    [InlineData("battlebg", AssetKind.BattleBg)]
    public void TryParseKind_KnowsTheFolders(string key, AssetKind expected)
    {
        Assert.True(Store(new FakeHttpMessageHandler(HttpStatusCode.OK)).TryParseKind(key, out var kind));
        Assert.Equal(expected, kind);
    }
}
