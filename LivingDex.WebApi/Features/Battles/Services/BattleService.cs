using LivingDex.Library.Services;
using LivingDex.WebApi.Extensions.Globalization;
using LivingDex.WebApi.Features.Battles.Models.DTOs;
using LivingDex.WebApi.Features.Battles.Repositories;
using Microsoft.Extensions.Options;

namespace LivingDex.WebApi.Features.Battles.Services;

/// <summary>
/// Status, recent battles, replays and per-format records.
/// </summary>
/// <param name="battleManager">The live battle state.</param>
/// <param name="battleRepository">Battle data access.</param>
/// <param name="globalizationHelper">Translations.</param>
/// <param name="options">The LivingDex options.</param>
internal sealed class BattleService(
    BattleManager battleManager,
    IBattleRepository battleRepository,
    IGlobalizationHelper globalizationHelper,
    IOptions<LivingDexOptions> options) : IBattleService
{
    private const int RecentBattles = 12;

    private readonly BattleManager _battleManager = battleManager;
    private readonly IBattleRepository _battleRepository = battleRepository;
    private readonly IGlobalizationHelper _globalizationHelper = globalizationHelper;
    private readonly IOptions<LivingDexOptions> _options = options;

    /// <inheritdoc />
    public Task<ServiceApiResponse<BattleStatusDTO>> StatusAsync() =>
        Task.FromResult(ServiceApiResponse<BattleStatusDTO>.Success(new BattleStatusDTO
        {
            Available = _battleManager.Available,
            Problem = _battleManager.Problem,
            Formats = BattleManager.Formats,
            Backgrounds = BattleManager.Backgrounds,
            TurnSeconds = Math.Clamp(_options.Value.TurnSeconds, 15, 600),
        }));

    /// <inheritdoc />
    public async Task<ServiceApiResponse<List<BattleListItemDTO>>> ListRecentAsync(long userId)
    {
        var battles = await _battleRepository.ListRecentAsync(userId, RecentBattles);
        return ServiceApiResponse<List<BattleListItemDTO>>.Success(battles.Select(battle => new BattleListItemDTO(battle, userId)).ToList());
    }

    /// <inheritdoc />
    public async Task<ServiceApiResponse<BattleReplayDTO>> GetReplayAsync(string battleId)
    {
        var battle = await _battleRepository.GetAsync(battleId, withLog: true);
        return battle is null
            ? await _globalizationHelper.NotFoundAsync<BattleReplayDTO>(battleId)
            : ServiceApiResponse<BattleReplayDTO>.Success(new BattleReplayDTO(battle));
    }

    /// <inheritdoc />
    public async Task<ServiceApiResponse<List<FormatRecordDTO>>> ListFormatRecordsAsync(long userId)
    {
        var records = await _battleRepository.ListFormatRecordsAsync(userId);
        return ServiceApiResponse<List<FormatRecordDTO>>.Success(records.Select(static record => new FormatRecordDTO(record)).ToList());
    }
}
