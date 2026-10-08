using LivingDex.WebApi.Features.Trainers.Models.Entities;

namespace LivingDex.WebApi.Features.Trainers.Repositories;

/// <summary>
/// Data access for trainer cards.
/// </summary>
internal interface ITrainerRepository
{
    /// <summary>
    /// Lists every trainer's profile (dbo.TrainerProfileList).
    /// </summary>
    /// <returns>The profiles, by username.</returns>
    Task<List<TrainerProfile>> ListAsync();

    /// <summary>
    /// Gets one trainer's profile (dbo.TrainerProfileGet).
    /// </summary>
    /// <param name="userId">The account identifier.</param>
    /// <returns>The profile, or null when the account does not exist.</returns>
    Task<TrainerProfile?> GetAsync(long userId);

    /// <summary>
    /// Sets the partner Pokémon (dbo.TrainerProfileSetPartner).
    /// </summary>
    /// <param name="userId">The account identifier.</param>
    /// <param name="partner">The national dex number.</param>
    /// <param name="shiny">Whether it is shiny.</param>
    /// <returns>A task that completes when saved.</returns>
    Task SetPartnerAsync(long userId, int partner, bool shiny);

    /// <summary>
    /// Records that the trainer was online (dbo.TrainerProfileTouch).
    /// </summary>
    /// <param name="userId">The account identifier.</param>
    /// <returns>A task that completes when saved.</returns>
    Task TouchAsync(long userId);

    /// <summary>
    /// Lists the trainer's decided battles, oldest first (dbo.BattleTrainerRecord).
    /// </summary>
    /// <param name="userId">The account identifier.</param>
    /// <returns>The battles.</returns>
    Task<List<TrainerBattle>> ListDecidedBattlesAsync(long userId);
}
