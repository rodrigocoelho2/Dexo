using System.Text.Json;
using LivingDex.Library.Enums;
using LivingDex.Library.Services;
using LivingDex.WebApi.Extensions.Globalization;
using LivingDex.WebApi.Features.States.Models.DTOs;
using LivingDex.WebApi.Features.States.Repositories;
using Microsoft.Extensions.Options;

namespace LivingDex.WebApi.Features.States.Services;

/// <summary>
/// Per-user progress with optimistic concurrency: a save must name the revision it was based on,
/// and every accepted save becomes a new revision that is also kept in the history.
/// </summary>
/// <param name="stateRepository">Progress data access.</param>
/// <param name="globalizationHelper">Translations.</param>
/// <param name="options">The LivingDex options.</param>
internal sealed class StateService(
    IStateRepository stateRepository,
    IGlobalizationHelper globalizationHelper,
    IOptions<LivingDexOptions> options) : IStateService
{
    private const int MaxClientLength = 80;

    private readonly IStateRepository _stateRepository = stateRepository;
    private readonly IGlobalizationHelper _globalizationHelper = globalizationHelper;
    private readonly IOptions<LivingDexOptions> _options = options;

    /// <inheritdoc />
    public async Task<ServiceApiResponse<StateDTO>> GetAsync(long userId) =>
        ServiceApiResponse<StateDTO>.Success(new StateDTO(await _stateRepository.GetAsync(userId)));

    /// <inheritdoc />
    public async Task<ServiceApiResponse<StateDTO>> SaveAsync(long userId, StateSaveDTO request)
    {
        if (request.Data.ValueKind != JsonValueKind.Object)
        {
            return await _globalizationHelper.ValidationProblemAsync<StateDTO>("data", nameof(TranslationKeys.MustBeJsonObject));
        }

        var json = request.Data.GetRawText();
        if (json.Length > _options.Value.MaxStateBytes)
        {
            return ServiceApiResponse<StateDTO>.PayloadTooLarge(
                await _globalizationHelper.TranslateAsync(nameof(TranslationKeys.StateTooLarge), _options.Value.MaxStateBytes));
        }

        return await SaveDocumentAsync(userId, request.Revision, json, request.Client);
    }

    /// <inheritdoc />
    public async Task<ServiceApiResponse<List<HistoryItemDTO>>> ListHistoryAsync(long userId, int? take)
    {
        var history = await _stateRepository.ListHistoryAsync(userId, Math.Clamp(take ?? 30, 1, 500));
        return ServiceApiResponse<List<HistoryItemDTO>>.Success(history.Select(static entry => new HistoryItemDTO(entry)).ToList());
    }

    /// <inheritdoc />
    public async Task<ServiceApiResponse<StateDTO>> RestoreAsync(long userId, long revision)
    {
        var entry = await _stateRepository.GetHistoryAsync(userId, revision);
        if (entry is null)
        {
            return await _globalizationHelper.NotFoundAsync<StateDTO>($"r{revision}");
        }

        var current = await _stateRepository.GetAsync(userId);
        return await SaveDocumentAsync(userId, current.Revision, entry.Data, $"restore of r{revision}");
    }

    private async Task<ServiceApiResponse<StateDTO>> SaveDocumentAsync(long userId, long revision, string json, string? client)
    {
        var result = await _stateRepository.SaveAsync(userId, revision, json, Truncate(client, MaxClientLength), Math.Max(1, _options.Value.HistoryLimit));
        var dto = new StateDTO(result.Current);
        return result.Saved ? ServiceApiResponse<StateDTO>.Success(dto) : ServiceApiResponse<StateDTO>.Conflict(dto);
    }

    private static string? Truncate(string? value, int max) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Length <= max ? value : value[..max];
}
