using System.Data;
using Dapper;
using LivingDex.WebApi.Extensions.Data;
using LivingDex.WebApi.Features.States.Models;
using LivingDex.WebApi.Features.States.Models.Entities;

namespace LivingDex.WebApi.Features.States.Repositories;

/// <summary>
/// Progress documents through the dbo.UserState* stored procedures.
/// </summary>
/// <param name="connectionFactory">Opens database connections.</param>
internal sealed class StateRepository(ISqlConnectionFactory connectionFactory) : RepositoryBase(connectionFactory), IStateRepository
{
    /// <inheritdoc />
    public async Task<UserState> GetAsync(long userId) =>
        await QuerySingleOrDefaultAsync<UserState>("[dbo].[UserStateGet]", new { UserID = userId })
        ?? new UserState { UserID = userId };

    /// <inheritdoc />
    public async Task<StateSaveResult> SaveAsync(long userId, long revision, string data, string? client, int historyLimit)
    {
        var parameters = new DynamicParameters(new
        {
            UserID = userId,
            Revision = revision,
            Data = data,
            Client = client,
            HistoryLimit = historyLimit,
        });
        parameters.Add("Saved", dbType: DbType.Boolean, direction: ParameterDirection.Output);

        var current = await QuerySingleOrDefaultAsync<UserState>("[dbo].[UserStateSave]", parameters) ?? new UserState { UserID = userId };
        return new StateSaveResult(parameters.Get<bool>("Saved"), current);
    }

    /// <inheritdoc />
    public Task<List<UserStateHistory>> ListHistoryAsync(long userId, int take) =>
        QueryAsync<UserStateHistory>("[dbo].[UserStateHistoryList]", new { UserID = userId, Take = take });

    /// <inheritdoc />
    public Task<UserStateHistory?> GetHistoryAsync(long userId, long revision) =>
        QuerySingleOrDefaultAsync<UserStateHistory>("[dbo].[UserStateHistoryGet]", new { UserID = userId, Revision = revision });
}
