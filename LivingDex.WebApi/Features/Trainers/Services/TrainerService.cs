using LivingDex.Library.Enums;
using LivingDex.Library.Services;
using LivingDex.WebApi.Extensions.Globalization;
using LivingDex.WebApi.Features.Trainers.Models;
using LivingDex.WebApi.Features.Trainers.Models.DTOs;
using LivingDex.WebApi.Features.Trainers.Repositories;

namespace LivingDex.WebApi.Features.Trainers.Services;

/// <summary>
/// Trainer cards: profile, living dex number, battle record and badges.
/// </summary>
/// <param name="trainerRepository">Trainer data access.</param>
/// <param name="globalizationHelper">Translations.</param>
internal sealed class TrainerService(ITrainerRepository trainerRepository, IGlobalizationHelper globalizationHelper) : ITrainerService
{
    private const int MinPartner = 1;
    private const int MaxPartner = 1025;

    private readonly ITrainerRepository _trainerRepository = trainerRepository;
    private readonly IGlobalizationHelper _globalizationHelper = globalizationHelper;

    /// <inheritdoc />
    public async Task<ServiceApiResponse<List<TrainerCardDTO>>> ListAsync()
    {
        var profiles = await _trainerRepository.ListAsync();
        var cards = new List<TrainerCardDTO>(profiles.Count);
        foreach (var profile in profiles)
        {
            cards.Add(new TrainerCardDTO(profile, await RecordAsync(profile.UserID)));
        }

        return ServiceApiResponse<List<TrainerCardDTO>>.Success(cards);
    }

    /// <inheritdoc />
    public async Task<ServiceApiResponse<TrainerCardDTO>> GetAsync(long userId)
    {
        var profile = await _trainerRepository.GetAsync(userId);
        return profile is null
            ? await _globalizationHelper.NotFoundAsync<TrainerCardDTO>(userId)
            : ServiceApiResponse<TrainerCardDTO>.Success(new TrainerCardDTO(profile, await RecordAsync(userId)));
    }

    /// <inheritdoc />
    public async Task<ServiceApiResponse<string>> SetPartnerAsync(long userId, PartnerDTO request)
    {
        if (request.Partner is < MinPartner or > MaxPartner)
        {
            return await _globalizationHelper.ValidationProblemAsync<string>("partner", nameof(TranslationKeys.InvalidPartner));
        }

        await _trainerRepository.SetPartnerAsync(userId, request.Partner, request.Shiny);
        return ServiceApiResponse<string>.Success();
    }

    /// <inheritdoc />
    public Task TouchAsync(long userId) => _trainerRepository.TouchAsync(userId);

    /// <inheritdoc />
    public async Task<TrainerRecord> RecordAsync(long userId) =>
        TrainerRecordCalculator.Calculate(userId, await _trainerRepository.ListDecidedBattlesAsync(userId));
}
