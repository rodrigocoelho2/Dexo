using System.Data;
using Dapper;
using LivingDex.WebApi.Extensions.Data;
using LivingDex.WebApi.Features.DailyRed.Models.Entities;

namespace LivingDex.WebApi.Features.DailyRed.Repositories;

/// <summary>
/// Daily Red through the dbo.DailyRed* stored procedures.
/// </summary>
/// <param name="connectionFactory">Opens database connections.</param>
internal sealed class DailyRedRepository(ISqlConnectionFactory connectionFactory) : RepositoryBase(connectionFactory), IDailyRedRepository
{
    /// <inheritdoc />
    public Task<string?> GetDayAsync(DateTime day) =>
        ExecuteScalarAsync<string?>("[dbo].[DailyRedDayGet]", Day(new DynamicParameters(), day));

    /// <inheritdoc />
    public Task<string> SaveDayAsync(DateTime day, string team)
    {
        var parameters = Day(new DynamicParameters(new { Team = team }), day);
        return ExecuteScalarAsync<string>("[dbo].[DailyRedDaySave]", parameters);
    }

    /// <inheritdoc />
    public async Task<bool> StartAsync(long userId, DateTime day, string battleId, DateTime startedAt)
    {
        var parameters = Day(new DynamicParameters(new { UserID = userId, BattleID = battleId, StartedAt = startedAt }), day);
        parameters.Add("Started", dbType: DbType.Boolean, direction: ParameterDirection.Output);

        await ExecuteAsync("[dbo].[DailyRedResultStart]", parameters);
        return parameters.Get<bool>("Started");
    }

    /// <inheritdoc />
    public Task FinishAsync(DailyRedResult result) => ExecuteAsync("[dbo].[DailyRedResultFinish]", Day(new DynamicParameters(new
    {
        result.UserID,
        result.BattleID,
        Status = result.Status ?? DailyRedResult.Lost,
        Turns = result.Turns ?? 0,
        MonsLeft = result.MonsLeft ?? 0,
        RedLeft = result.RedLeft ?? 0,
        result.Grid,
        EndedAt = result.EndedAt ?? DateTime.UtcNow,
    }), result.DayKey ?? DateTime.UtcNow.Date));

    /// <inheritdoc />
    public Task ReleaseAsync(long userId, DateTime day, string battleId) =>
        ExecuteAsync("[dbo].[DailyRedResultRelease]", Day(new DynamicParameters(new { UserID = userId, BattleID = battleId }), day));

    /// <inheritdoc />
    public Task<List<DailyRedResult>> ListByUserAsync(long userId) =>
        QueryAsync<DailyRedResult>("[dbo].[DailyRedResultListByUser]", new { UserID = userId });

    /// <inheritdoc />
    public Task<List<DailyRedResult>> ListByDayAsync(DateTime day) =>
        QueryAsync<DailyRedResult>("[dbo].[DailyRedResultListByDay]", Day(new DynamicParameters(), day));

    // The day is a DATE column: send it as one, without a time.
    private static DynamicParameters Day(DynamicParameters parameters, DateTime day)
    {
        parameters.Add("DayKey", day.Date, DbType.Date);
        return parameters;
    }
}
