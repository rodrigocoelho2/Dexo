using LivingDex.WebApi.Extensions.Data;
using LivingDex.WebApi.Features.Battles.Models.Entities;

namespace LivingDex.WebApi.Features.Battles.Repositories;

/// <summary>
/// Finished battles through the dbo.Battle* stored procedures.
/// </summary>
/// <param name="connectionFactory">Opens database connections.</param>
internal sealed class BattleRepository(ISqlConnectionFactory connectionFactory) : RepositoryBase(connectionFactory), IBattleRepository
{
    /// <inheritdoc />
    public Task SaveAsync(SavedBattle battle) => ExecuteAsync("[dbo].[BattleSave]", new
    {
        battle.BattleID,
        battle.Format,
        battle.P1UserID,
        battle.P2UserID,
        battle.P1Name,
        battle.P2Name,
        battle.IsCpu,
        battle.Winner,
        battle.Reason,
        battle.Turns,
        battle.P1Left,
        battle.P2Left,
        battle.P1BestKo,
        battle.P2BestKo,
        battle.Teams,
        battle.Log,
        battle.Background,
        battle.StartedAt,
        battle.EndedAt,
    });

    /// <inheritdoc />
    public Task<SavedBattle?> GetAsync(string battleId, bool withLog) =>
        QuerySingleOrDefaultAsync<SavedBattle>("[dbo].[BattleGet]", new { BattleID = battleId, WithLog = withLog });

    /// <inheritdoc />
    public Task<List<SavedBattle>> ListRecentAsync(long userId, int take) =>
        QueryAsync<SavedBattle>("[dbo].[BattleListRecent]", new { UserID = userId, Take = take });

    /// <inheritdoc />
    public Task<List<FormatRecord>> ListFormatRecordsAsync(long userId) =>
        QueryAsync<FormatRecord>("[dbo].[BattleFormatRecords]", new { UserID = userId });
}
