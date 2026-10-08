using LivingDex.WebApi.Features.States.Models;
using LivingDex.WebApi.Features.States.Models.Entities;

namespace LivingDex.WebApi.Features.States.Repositories;

/// <summary>
/// Data access for progress documents and their history.
/// </summary>
internal interface IStateRepository
{
    /// <summary>
    /// Gets the current progress (dbo.UserStateGet).
    /// </summary>
    /// <param name="userId">The account identifier.</param>
    /// <returns>The progress; revision 0 when nothing was saved yet.</returns>
    Task<UserState> GetAsync(long userId);

    /// <summary>
    /// Saves the progress if <paramref name="revision"/> is still the current one, keeping it in the history (dbo.UserStateSave).
    /// </summary>
    /// <param name="userId">The account identifier.</param>
    /// <param name="revision">The revision the save is based on.</param>
    /// <param name="data">The progress document.</param>
    /// <param name="client">The device description.</param>
    /// <param name="historyLimit">How many revisions to keep.</param>
    /// <returns>Whether it was saved, and the progress now stored.</returns>
    Task<StateSaveResult> SaveAsync(long userId, long revision, string data, string? client, int historyLimit);

    /// <summary>
    /// Lists the newest revisions (dbo.UserStateHistoryList).
    /// </summary>
    /// <param name="userId">The account identifier.</param>
    /// <param name="take">How many.</param>
    /// <returns>The revisions, newest first.</returns>
    Task<List<UserStateHistory>> ListHistoryAsync(long userId, int take);

    /// <summary>
    /// Gets one revision (dbo.UserStateHistoryGet).
    /// </summary>
    /// <param name="userId">The account identifier.</param>
    /// <param name="revision">The revision.</param>
    /// <returns>The revision, or null.</returns>
    Task<UserStateHistory?> GetHistoryAsync(long userId, long revision);
}
