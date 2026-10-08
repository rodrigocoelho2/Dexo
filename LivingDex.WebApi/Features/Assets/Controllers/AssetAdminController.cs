using System.Net;
using System.Net.Mime;
using LivingDex.Library.Validation;
using LivingDex.WebApi.Extensions.Authentication;
using LivingDex.WebApi.Extensions.Mvc;
using LivingDex.WebApi.Extensions.Services;
using LivingDex.WebApi.Features.Assets.Models.DTOs;
using LivingDex.WebApi.Features.Assets.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;

namespace LivingDex.WebApi.Features.Assets.Controllers;

/// <summary>
/// Download all assets (admin only).
/// </summary>
/// <param name="logger">Logger.</param>
/// <param name="assetPrefetchService">Download business logic.</param>
[Authorize(Policy = AuthPolicies.Admin)]
[Route("api/admin/assets")]
[ApiController]
[Produces(MediaTypeNames.Application.Json)]
[ProducesErrorResponseType(typeof(ApiValidationProblemDetails))]
[ProducesResponseType((int)HttpStatusCode.BadRequest)]
[ProducesResponseType((int)HttpStatusCode.Unauthorized)]
[ProducesResponseType((int)HttpStatusCode.Forbidden)]
internal sealed class AssetAdminController(
    ILogger<AssetAdminController> logger,
    IAssetPrefetchService assetPrefetchService) : InternalControllerBase
{
    private readonly ILogger<AssetAdminController> _logger = logger;
    private readonly IAssetPrefetchService _assetPrefetchService = assetPrefetchService;

    /// <summary>
    /// Starts downloading every listed asset into the cache.
    /// </summary>
    /// <param name="request">The items.</param>
    /// <returns>The progress.</returns>
    [HttpPost("download")]
    [Consumes(MediaTypeNames.Application.Json)]
    [RequestSizeLimit(16 * 1024 * 1024)]
    [ProducesResponseType<AssetDownloadStatusDTO>((int)HttpStatusCode.Accepted)]
    [SwaggerOperation(Summary = "AssetAdminDownload", OperationId = "AssetAdminDownload")]
    public async Task<ActionResult<AssetDownloadStatusDTO>> AssetAdminDownloadAsync([FromBody] AssetDownloadDTO request)
    {
        if (_logger.IsEnabled(LogLevel.Information))
            _logger.LogInformation("AssetAdminDownload {Count} items", request.Items?.Length ?? 0);

        var apiResponse = await _assetPrefetchService.StartAsync(request);
        return apiResponse.ToActionResult("/api/admin/assets/status");
    }

    /// <summary>
    /// The progress of the current or last download.
    /// </summary>
    /// <returns>The progress.</returns>
    [HttpGet("status")]
    [ProducesResponseType<AssetDownloadStatusDTO>((int)HttpStatusCode.OK)]
    [SwaggerOperation(Summary = "AssetAdminStatus", OperationId = "AssetAdminStatus")]
    public async Task<ActionResult<AssetDownloadStatusDTO>> AssetAdminStatusAsync()
    {
        var apiResponse = await _assetPrefetchService.StatusAsync();
        return apiResponse.ToActionResult();
    }

    /// <summary>
    /// Stops the running download.
    /// </summary>
    /// <returns>No content.</returns>
    [HttpPost("cancel")]
    [ProducesResponseType((int)HttpStatusCode.NoContent)]
    [ProducesResponseType((int)HttpStatusCode.NotFound)]
    [SwaggerOperation(Summary = "AssetAdminCancel", OperationId = "AssetAdminCancel")]
    public async Task<ActionResult<string>> AssetAdminCancelAsync()
    {
        var apiResponse = await _assetPrefetchService.CancelAsync();
        return apiResponse.ToActionResult();
    }
}
