using LivingDex.Library.Services;
using LivingDex.WebApi.Features.Accounts.Repositories;
using LivingDex.WebApi.Features.Battles.Services;
using LivingDex.WebApi.Features.Health.Models.DTOs;
using Microsoft.Extensions.Options;

namespace LivingDex.WebApi.Features.Health.Services;

/// <summary>
/// The health check: also proves the database answers.
/// </summary>
/// <param name="userRepository">Account data access.</param>
/// <param name="battleManager">The live battle state.</param>
/// <param name="options">The LivingDex options.</param>
internal sealed class HealthService(
    IUserRepository userRepository,
    BattleManager battleManager,
    IOptions<LivingDexOptions> options) : IHealthService
{
    private readonly IUserRepository _userRepository = userRepository;
    private readonly BattleManager _battleManager = battleManager;
    private readonly IOptions<LivingDexOptions> _options = options;

    /// <inheritdoc />
    public async Task<ServiceApiResponse<HealthDTO>> GetAsync()
    {
        var count = await _userRepository.CountAsync();
        return ServiceApiResponse<HealthDTO>.Success(new HealthDTO
        {
            FirstRun = count == 0,
            Registration = count == 0 || _options.Value.AllowRegistration,
            Discord = _options.Value.DiscordEnabled,
            Showdown = _battleManager.Available,
        });
    }
}
