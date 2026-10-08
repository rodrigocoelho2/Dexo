using LivingDex.Library.Services;
using LivingDex.WebApi.Features.Battles.Models.DTOs;

namespace LivingDex.WebApi.Features.Battles.Services;

/// <summary>
/// Business logic for the Showdown room's REST side (live play goes through the hub).
/// </summary>
internal interface IBattleService
{
    /// <summary>
    /// Whether battles can be played, and with what.
    /// </summary>
    /// <returns>The status.</returns>
    Task<ServiceApiResponse<BattleStatusDTO>> StatusAsync();

    /// <summary>
    /// The trainer's 12 most recent battles.
    /// </summary>
    /// <param name="userId">The signed-in account.</param>
    /// <returns>The battles, newest first.</returns>
    Task<ServiceApiResponse<List<BattleListItemDTO>>> ListRecentAsync(long userId);

    /// <summary>
    /// A finished battle with its log. Replays are visible to every signed-in trainer, like watching live.
    /// </summary>
    /// <param name="battleId">The battle identifier.</param>
    /// <returns>The replay, or 404.</returns>
    Task<ServiceApiResponse<BattleReplayDTO>> GetReplayAsync(string battleId);

    /// <summary>
    /// Wins and losses per format against other trainers, for the profile.
    /// </summary>
    /// <param name="userId">The signed-in account.</param>
    /// <returns>One row per format played.</returns>
    Task<ServiceApiResponse<List<FormatRecordDTO>>> ListFormatRecordsAsync(long userId);
}
