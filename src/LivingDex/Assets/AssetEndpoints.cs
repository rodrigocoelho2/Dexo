namespace LivingDex.Assets;

public static class AssetEndpoints
{
    public static IEndpointRouteBuilder MapAssetEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/assets/sprites/{**path}", (string path, AssetCache cache, HttpContext http, CancellationToken ct) =>
            cache.ServeAsync("sprites", path, http, ct));

        app.MapGet("/assets/cries/{**path}", (string path, AssetCache cache, HttpContext http, CancellationToken ct) =>
            cache.ServeAsync("cries", path, http, ct));

        app.MapGet("/assets/battle/{**path}", (string path, AssetCache cache, HttpContext http, CancellationToken ct) =>
            cache.ServeAsync("battlebg", path, http, ct));
        app.MapGet("/assets/music/{file}", (string file, AssetCache cache, HttpContext http, CancellationToken ct) =>
            cache.ServeAsync("music", file, http, ct));

        return app;
    }
}
