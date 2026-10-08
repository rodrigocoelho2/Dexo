using LivingDex.WebApi.Features.Battles.Models.Entities;

namespace LivingDex.WebApi.Features.Battles.Repositories;

/// <summary>
/// Data access for finished battles.
/// </summary>
internal interface IBattleRepository
{
    /// <summary>
    /// Saves a finished battle (dbo.BattleSave).
    /// </summary>
    /// <param name="battle">The battle.</param>
    /// <returns>A task that completes when saved.</returns>
    Task SaveAsync(SavedBattle battle);

    /// <summary>
    /// Gets one battle (dbo.BattleGet).
    /// </summary>
    /// <param name="battleId">The battle identifier.</param>
    /// <param name="withLog">Include the log (replays).</param>
    /// <returns>The battle, or null.</returns>
    Task<SavedBattle?> GetAsync(string battleId, bool withLog);

    /// <summary>
    /// Lists a trainer's most recent battles (dbo.BattleListRecent).
    /// </summary>
    /// <param name="userId">The trainer.</param>
    /// <param name="take">How many.</param>
    /// <returns>The battles, newest first.</returns>
    Task<List<SavedBattle>> ListRecentAsync(long userId, int take);

    /// <summary>
    /// Wins and losses per format against other trainers (dbo.BattleFormatRecords).
    /// </summary>
    /// <param name="userId">The trainer.</param>
    /// <returns>One row per format played.</returns>
    Task<List<FormatRecord>> ListFormatRecordsAsync(long userId);
}
