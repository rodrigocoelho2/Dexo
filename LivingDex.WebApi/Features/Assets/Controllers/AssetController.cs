using System.Net;
using LivingDex.Library.Enums;
using LivingDex.WebApi.Extensions.Mvc;
using LivingDex.WebApi.Features.Assets.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;

namespace LivingDex.WebApi.Features.Assets.Controllers;

/// <summary>
/// Sprites, cries, battle backgrounds and music for the page. Public, like any static file.
/// </summary>
/// <param name="assetStore">The asset store.</param>
[AllowAnonymous]
[Route("assets")]
[ApiController]
internal sealed class AssetController(IAssetStore assetStore) : InternalControllerBase
{
    /// <summary>Sprites, cries, backgrounds and music never change for a given path.</summary>
    private const string ImmutableCache = "public, max-age=2592000, immutable";

    private readonly IAssetStore _assetStore = assetStore;

    /// <summary>
    /// A Pokémon sprite (PokeAPI/sprites layout).
    /// </summary>
    /// <param name="path">The path below sprites/pokemon/.</param>
    /// <returns>The file.</returns>
    [HttpGet("sprites/{**path}")]
    [ProducesResponseType((int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.NotFound)]
    [SwaggerOperation(Summary = "AssetSprite", OperationId = "AssetSprite")]
    public Task<IActionResult> AssetSpriteAsync(string path) => ServeAsync(AssetKind.Sprites, path);

    /// <summary>
    /// A Pokémon cry (PokeAPI/cries layout).
    /// </summary>
    /// <param name="path">The path below cries/pokemon/.</param>
    /// <returns>The file.</returns>
    [HttpGet("cries/{**path}")]
    [ProducesResponseType((int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.NotFound)]
    [SwaggerOperation(Summary = "AssetCry", OperationId = "AssetCry")]
    public Task<IActionResult> AssetCryAsync(string path) => ServeAsync(AssetKind.Cries, path);

    /// <summary>
    /// A battle background or move-effect image (fx/name.png|jpg).
    /// </summary>
    /// <param name="path">The path.</param>
    /// <returns>The file.</returns>
    [HttpGet("battle/{**path}")]
    [ProducesResponseType((int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.NotFound)]
    [SwaggerOperation(Summary = "AssetBattle", OperationId = "AssetBattle")]
    public Task<IActionResult> AssetBattleAsync(string path) => ServeAsync(AssetKind.BattleBg, path);

    /// <summary>
    /// A battle music track.
    /// </summary>
    /// <param name="file">The track (name.mp3).</param>
    /// <returns>The file.</returns>
    [HttpGet("music/{file}")]
    [ProducesResponseType((int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.NotFound)]
    [SwaggerOperation(Summary = "AssetMusic", OperationId = "AssetMusic")]
    public Task<IActionResult> AssetMusicAsync(string file) => ServeAsync(AssetKind.Music, file);

    private async Task<IActionResult> ServeAsync(AssetKind kind, string path)
    {
        var lookup = await _assetStore.ResolveAsync(kind, path);
        if (lookup.RedirectUrl is not null)
        {
            return Redirect(lookup.RedirectUrl);
        }

        switch (lookup.State)
        {
            case AssetState.Cached or AssetState.Downloaded:
                Response.Headers.CacheControl = ImmutableCache;
                return PhysicalFile(lookup.FilePath!, lookup.ContentType!, enableRangeProcessing: true);
            case AssetState.Failed:
                return StatusCode((int)HttpStatusCode.BadGateway);
            default:
                return NotFound();
        }
    }
}
