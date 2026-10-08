using LivingDex.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace LivingDex.Showdown;

/// <summary>
/// Real-time channel for Showdown: presence, challenges and battle messages. Signed-in users only.
/// Methods return an error text (or null) instead of throwing, so the page can show it as is.
/// </summary>
[Authorize]
public sealed class ShowdownHub(BattleManager battles, UserRepository users) : Hub
{
    private long UserId => Context.User!.RequiredUserId();
    private string Name => Context.User!.Identity?.Name ?? "Trainer";

    public override async Task OnConnectedAsync()
    {
        // The login cookie is SameSite=Lax, but a WebSocket from another site could still carry it on some
        // browsers; only accept connections opened by this site's own page.
        var http = Context.GetHttpContext();
        if (http is not null && http.Request.Headers.Origin is { Count: > 0 } origin &&
            Uri.TryCreate(origin.ToString(), UriKind.Absolute, out var o) &&
            !string.Equals(o.Host, http.Request.Host.Host, StringComparison.OrdinalIgnoreCase))
        {
            Context.Abort();
            return;
        }
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (Context.User?.UserId() is not null)
            await battles.DisconnectedAsync(UserId);
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>First call after connecting (and after every reconnect).</summary>
    public Task<BattleManager.Snapshot> Hello() => battles.ConnectedAsync(UserId, Name);

    public async Task<string?> Challenge(long userId, string format)
    {
        var target = await users.GetAsync(userId);
        if (target is null) return "That trainer doesn't exist.";
        return await battles.ChallengeAsync(UserId, Name, target.Id, target.Username, format);
    }

    public Task<string?> CancelChallenge(string id) => battles.CancelChallengeAsync(UserId, id, decline: false);

    public Task<string?> DeclineChallenge(string id) => battles.CancelChallengeAsync(UserId, id, decline: true);

    public async Task<object> AcceptChallenge(string id)
    {
        var (error, matchId) = await battles.AcceptChallengeAsync(UserId, id);
        return new { error, matchId };
    }

    public async Task<object> StartCpu(string format)
    {
        var (error, battleId) = await battles.StartCpuAsync(UserId, Name, format);
        return new { error, battleId };
    }

    public Task<string?> SetReady(string matchId, bool ready) => battles.SetReadyAsync(UserId, matchId, ready);

    public Task<string?> LeaveMatch(string matchId) => battles.LeaveMatchAsync(UserId, matchId);

    public Task<BattleManager.JoinResult> JoinBattle(string battleId) => battles.JoinAsync(UserId, Context.ConnectionId, battleId);

    public Task LeaveBattle(string battleId) => battles.LeaveAsync(Context.ConnectionId, battleId);

    public Task<string?> Choose(string battleId, string choice) => battles.ChooseAsync(UserId, battleId, choice);

    public Task<string?> Forfeit(string battleId) => battles.ForfeitAsync(UserId, battleId);

    public Task<string?> DraftPick(string battleId, int index) => battles.DraftPickAsync(UserId, battleId, index);

    public Task<string?> DraftLead(string battleId, int index) => battles.DraftLeadAsync(UserId, battleId, index);
}
