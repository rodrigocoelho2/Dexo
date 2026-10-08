using LivingDex.Library.Services;
using LivingDex.WebApi.Features.States.Models.DTOs;

namespace LivingDex.WebApi.Features.States.Services;

/// <summary>
/// Business logic for a trainer's progress: optimistic-concurrency saves and the revision history.
/// </summary>
internal interface IStateService
{
    /// <summary>
    /// Gets the current progress.
    /// </summary>
    /// <param name="userId">The signed-in account.</param>
    /// <returns>The progress.</returns>
    Task<ServiceApiResponse<StateDTO>> GetAsync(long userId);

    /// <summary>
    /// Saves the progress. A save based on an old revision is refused with 409 and the current progress, so the page can merge.
    /// </summary>
    /// <param name="userId">The signed-in account.</param>
    /// <param name="request">The revision it is based on and the document.</param>
    /// <returns>The saved progress, the current one (conflict), or why not.</returns>
    Task<ServiceApiResponse<StateDTO>> SaveAsync(long userId, StateSaveDTO request);

    /// <summary>
    /// Lists the newest revisions.
    /// </summary>
    /// <param name="userId">The signed-in account.</param>
    /// <param name="take">How many (1–500, default 30).</param>
    /// <returns>The revisions, newest first.</returns>
    Task<ServiceApiResponse<List<HistoryItemDTO>>> ListHistoryAsync(long userId, int? take);

    /// <summary>
    /// Restores an old revision by saving it as a brand-new revision, so the restore itself can be undone.
    /// </summary>
    /// <param name="userId">The signed-in account.</param>
    /// <param name="revision">The revision to restore.</param>
    /// <returns>The saved progress, or why not.</returns>
    Task<ServiceApiResponse<StateDTO>> RestoreAsync(long userId, long revision);
}
