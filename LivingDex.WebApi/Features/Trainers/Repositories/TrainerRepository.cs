using LivingDex.WebApi.Extensions.Data;
using LivingDex.WebApi.Features.Trainers.Models.Entities;

namespace LivingDex.WebApi.Features.Trainers.Repositories;

/// <summary>
/// Trainer cards through the dbo.TrainerProfile* stored procedures.
/// </summary>
/// <param name="connectionFactory">Opens database connections.</param>
internal sealed class TrainerRepository(ISqlConnectionFactory connectionFactory) : RepositoryBase(connectionFactory), ITrainerRepository
{
    /// <inheritdoc />
    public Task<List<TrainerProfile>> ListAsync() => QueryAsync<TrainerProfile>("[dbo].[TrainerProfileList]");

    /// <inheritdoc />
    public Task<TrainerProfile?> GetAsync(long userId) =>
        QuerySingleOrDefaultAsync<TrainerProfile>("[dbo].[TrainerProfileGet]", new { UserID = userId });

    /// <inheritdoc />
    public Task SetPartnerAsync(long userId, int partner, bool shiny) =>
        ExecuteAsync("[dbo].[TrainerProfileSetPartner]", new { UserID = userId, Partner = partner, PartnerShiny = shiny });

    /// <inheritdoc />
    public Task TouchAsync(long userId) => ExecuteAsync("[dbo].[TrainerProfileTouch]", new { UserID = userId });

    /// <inheritdoc />
    public Task<List<TrainerBattle>> ListDecidedBattlesAsync(long userId) =>
        QueryAsync<TrainerBattle>("[dbo].[BattleTrainerRecord]", new { UserID = userId });
}
