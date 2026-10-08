using LivingDex.Library.Services;
using LivingDex.WebApi.Features.Trainers.Models;
using LivingDex.WebApi.Features.Trainers.Models.DTOs;

namespace LivingDex.WebApi.Features.Trainers.Services;

/// <summary>
/// Business logic for trainer cards.
/// </summary>
internal interface ITrainerService
{
    /// <summary>
    /// Lists every trainer card (a household-sized list, so it is computed on the fly).
    /// </summary>
    /// <returns>The cards, by name.</returns>
    Task<ServiceApiResponse<List<TrainerCardDTO>>> ListAsync();

    /// <summary>
    /// Gets one trainer card.
    /// </summary>
    /// <param name="userId">The trainer.</param>
    /// <returns>The card, or 404.</returns>
    Task<ServiceApiResponse<TrainerCardDTO>> GetAsync(long userId);

    /// <summary>
    /// Sets the signed-in trainer's partner Pokémon.
    /// </summary>
    /// <param name="userId">The signed-in account.</param>
    /// <param name="request">The partner.</param>
    /// <returns>No content, or why not.</returns>
    Task<ServiceApiResponse<string>> SetPartnerAsync(long userId, PartnerDTO request);

    /// <summary>
    /// Records that the trainer was online in Showdown.
    /// </summary>
    /// <param name="userId">The trainer.</param>
    /// <returns>A task that completes when saved.</returns>
    Task TouchAsync(long userId);

    /// <summary>
    /// Calculates a trainer's battle record (sent with the end of every battle).
    /// </summary>
    /// <param name="userId">The trainer.</param>
    /// <returns>The record.</returns>
    Task<TrainerRecord> RecordAsync(long userId);
}
