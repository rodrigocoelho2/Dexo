using LivingDex.Library.Services;
using LivingDex.WebApi.Features.DailyRed.Models.DTOs;

namespace LivingDex.WebApi.Features.DailyRed.Services;

/// <summary>
/// Daily Red: one team a day for everyone, one official battle a day against Red, unlimited practice.
/// </summary>
internal interface IDailyRedService
{
    /// <summary>
    /// The page for one day.
    /// </summary>
    /// <param name="userId">The signed-in trainer.</param>
    /// <param name="date">The trainer's today, yyyy-MM-dd.</param>
    /// <returns>The day.</returns>
    Task<ServiceApiResponse<DailyRedDTO>> GetAsync(long userId, string? date);

    /// <summary>
    /// Starts (or goes back to) a battle against Red with the day's team.
    /// </summary>
    /// <param name="userId">The trainer.</param>
    /// <param name="name">The trainer's name.</param>
    /// <param name="date">The trainer's today, yyyy-MM-dd.</param>
    /// <param name="practice">A practice run (doesn't count) instead of the official battle.</param>
    /// <param name="lead">Which of the six (0–5) goes first.</param>
    /// <returns>The error to show, or the battle to open.</returns>
    Task<(string? Error, string? BattleId)> StartAsync(long userId, string name, string? date, bool practice, int lead);
}
