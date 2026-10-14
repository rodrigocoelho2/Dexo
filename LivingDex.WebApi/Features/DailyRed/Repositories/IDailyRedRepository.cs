using LivingDex.WebApi.Features.DailyRed.Models.Entities;

namespace LivingDex.WebApi.Features.DailyRed.Repositories;

/// <summary>
/// Data access for Daily Red: the team of each day and the official battles.
/// </summary>
internal interface IDailyRedRepository
{
    /// <summary>
    /// Gets the stored team of a day (dbo.DailyRedDayGet).
    /// </summary>
    /// <param name="day">The day.</param>
    /// <returns>The team JSON, or null.</returns>
    Task<string?> GetDayAsync(DateTime day);

    /// <summary>
    /// Stores the team of a day unless one is stored already (dbo.DailyRedDaySave).
    /// </summary>
    /// <param name="day">The day.</param>
    /// <param name="team">The team JSON.</param>
    /// <returns>The stored team JSON (the first one saved).</returns>
    Task<string> SaveDayAsync(DateTime day, string team);

    /// <summary>
    /// Claims a trainer's official battle of the day (dbo.DailyRedResultStart).
    /// </summary>
    /// <param name="userId">The trainer.</param>
    /// <param name="day">The day.</param>
    /// <param name="battleId">The battle.</param>
    /// <param name="startedAt">When it started (UTC).</param>
    /// <returns>False when the day already has an official battle.</returns>
    Task<bool> StartAsync(long userId, DateTime day, string battleId, DateTime startedAt);

    /// <summary>
    /// Records how the official battle ended (dbo.DailyRedResultFinish).
    /// </summary>
    /// <param name="result">The result.</param>
    /// <returns>A task that completes when saved.</returns>
    Task FinishAsync(DailyRedResult result);

    /// <summary>
    /// Gives the day back after an official battle stopped without a result (dbo.DailyRedResultRelease).
    /// </summary>
    /// <param name="userId">The trainer.</param>
    /// <param name="day">The day.</param>
    /// <param name="battleId">The battle.</param>
    /// <returns>A task that completes when done.</returns>
    Task ReleaseAsync(long userId, DateTime day, string battleId);

    /// <summary>
    /// Every official battle of a trainer, oldest day first (dbo.DailyRedResultListByUser).
    /// </summary>
    /// <param name="userId">The trainer.</param>
    /// <returns>The battles.</returns>
    Task<List<DailyRedResult>> ListByUserAsync(long userId);

    /// <summary>
    /// Every trainer with their official battle of a day, if any (dbo.DailyRedResultListByDay).
    /// </summary>
    /// <param name="day">The day.</param>
    /// <returns>One row per trainer.</returns>
    Task<List<DailyRedResult>> ListByDayAsync(DateTime day);
}
