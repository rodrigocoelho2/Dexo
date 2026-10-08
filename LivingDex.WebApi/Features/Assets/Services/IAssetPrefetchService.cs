using LivingDex.Library.Services;
using LivingDex.WebApi.Features.Assets.Models.DTOs;

namespace LivingDex.WebApi.Features.Assets.Services;

/// <summary>
/// "Download all assets" (admin): fills the cache in the background.
/// </summary>
internal interface IAssetPrefetchService
{
    /// <summary>
    /// Starts a download run. One run at a time; it keeps going if the admin closes the page.
    /// </summary>
    /// <param name="request">The items.</param>
    /// <returns>The progress (202), or why not.</returns>
    Task<ServiceApiResponse<AssetDownloadStatusDTO>> StartAsync(AssetDownloadDTO request);

    /// <summary>
    /// The progress of the current or last run.
    /// </summary>
    /// <returns>The progress.</returns>
    Task<ServiceApiResponse<AssetDownloadStatusDTO>> StatusAsync();

    /// <summary>
    /// Stops the running download.
    /// </summary>
    /// <returns>No content, or 404 when nothing is running.</returns>
    Task<ServiceApiResponse<string>> CancelAsync();
}
