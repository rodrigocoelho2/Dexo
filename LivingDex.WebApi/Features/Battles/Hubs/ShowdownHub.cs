using LivingDex.WebApi.Extensions.Authentication;
using LivingDex.WebApi.Features.Accounts.Repositories;
using LivingDex.WebApi.Features.Battles.Services;
using LivingDex.WebApi.Features.DailyRed.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace LivingDex.WebApi.Features.Battles.Hubs;

/// <summary>
/// Real-time channel for Showdown (/hubs/showdown): presence, challenges and battle messages. Signed-in users only.
/// Methods return an error text (or null) instead of throwing, so the page can show it as is.
/// Method names are the page's contract — do not rename.
/// </summary>
/// <param name="battleManager">The live battle state.</param>
/// <param name="userRepository">Account data access (challenge targets).</param>
/// <param name="dailyRedService">Daily Red (battles against Red with the day's team).</param>
[Authorize]
internal sealed class ShowdownHub(BattleManager battleManager, IUserRepository userRepository, IDailyRedService dailyRedService) : Hub
{
    /// <summary>The URL the hub is mapped to.</summary>
    public const string Path = "/hubs/showdown";

    private readonly BattleManager _battleManager = battleManager;
    private readonly IUserRepository _userRepository = userRepository;
    private readonly IDailyRedService _dailyRedService = dailyRedService;

    private long UserID => Context.User!.RequiredUserID();

    private string Name => Context.User!.Username();

    /// <inheritdoc />
    public override async Task OnConnectedAsync()
    {
        // The login cookie is SameSite=Lax, but a WebSocket from another site could still carry it on some
        // browsers; only accept connections opened by this site's own page.
        var http = Context.GetHttpContext();
        if (http is not null && http.Request.Headers.Origin is { Count: > 0 } origin &&
            Uri.TryCreate(origin.ToString(), UriKind.Absolute, out var originUri) &&
            !string.Equals(originUri.Host, http.Request.Host.Host, StringComparison.OrdinalIgnoreCase))
        {
            Context.Abort();
            return;
        }

        await base.OnConnectedAsync();
    }

    /// <inheritdoc />
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (Context.User?.UserID() is not null)
        {
            await _battleManager.DisconnectedAsync(UserID);
        }

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// First call after connecting (and after every reconnect).
    /// </summary>
    /// <returns>Presence, open challenges and the running battle or match.</returns>
    public Task<BattleManager.Snapshot> Hello() => _battleManager.ConnectedAsync(UserID, Name);

    /// <summary>
    /// Challenges another trainer.
    /// </summary>
    /// <param name="userId">The trainer to challenge.</param>
    /// <param name="format">The format.</param>
    /// <returns>Null, or the error to show.</returns>
    public async Task<string?> Challenge(long userId, string format)
    {
        var target = await _userRepository.GetAsync(userId);
        if (target is null)
        {
            return "That trainer doesn't exist.";
        }

        return await _battleManager.ChallengeAsync(UserID, Name, target.UserID, target.Username, format);
    }

    /// <summary>
    /// Withdraws a challenge this trainer sent.
    /// </summary>
    /// <param name="id">The challenge.</param>
    /// <returns>Null, or the error to show.</returns>
    public Task<string?> CancelChallenge(string id) => _battleManager.CancelChallengeAsync(UserID, id, decline: false);

    /// <summary>
    /// Declines a challenge this trainer received.
    /// </summary>
    /// <param name="id">The challenge.</param>
    /// <returns>Null, or the error to show.</returns>
    public Task<string?> DeclineChallenge(string id) => _battleManager.CancelChallengeAsync(UserID, id, decline: true);

    /// <summary>
    /// Accepts a challenge; both trainers go to the ready room.
    /// </summary>
    /// <param name="id">The challenge.</param>
    /// <returns>{ error, matchId }.</returns>
    public async Task<object> AcceptChallenge(string id)
    {
        var (error, matchId) = await _battleManager.AcceptChallengeAsync(UserID, id);
        return new { error, matchId };
    }

    /// <summary>
    /// Starts a practice battle against the CPU.
    /// </summary>
    /// <param name="format">The format.</param>
    /// <returns>{ error, battleId }.</returns>
    public async Task<object> StartCpu(string format)
    {
        var (error, battleId) = await _battleManager.StartCpuAsync(UserID, Name, format);
        return new { error, battleId };
    }

    /// <summary>
    /// Marks this trainer ready (or not) in the ready room.
    /// </summary>
    /// <param name="matchId">The match.</param>
    /// <param name="ready">Ready or not.</param>
    /// <returns>Null, or the error to show.</returns>
    public Task<string?> SetReady(string matchId, bool ready) => _battleManager.SetReadyAsync(UserID, matchId, ready);

    /// <summary>
    /// Leaves the ready room (closes the match).
    /// </summary>
    /// <param name="matchId">The match.</param>
    /// <returns>Null, or the error to show.</returns>
    public Task<string?> LeaveMatch(string matchId) => _battleManager.LeaveMatchAsync(UserID, matchId);

    /// <summary>
    /// Opens a battle as a player or a spectator.
    /// </summary>
    /// <param name="battleId">The battle.</param>
    /// <returns>Everything needed to draw it.</returns>
    public Task<BattleManager.JoinResult> JoinBattle(string battleId) => _battleManager.JoinAsync(UserID, Context.ConnectionId, battleId);

    /// <summary>
    /// Stops receiving a battle's messages.
    /// </summary>
    /// <param name="battleId">The battle.</param>
    /// <returns>A task that completes when done.</returns>
    public Task LeaveBattle(string battleId) => _battleManager.LeaveAsync(Context.ConnectionId, battleId);

    /// <summary>
    /// Sends this trainer's choice for the turn ("move 1", "switch 3", "default").
    /// </summary>
    /// <param name="battleId">The battle.</param>
    /// <param name="choice">The choice.</param>
    /// <returns>Null, or the error to show.</returns>
    public Task<string?> Choose(string battleId, string choice) => _battleManager.ChooseAsync(UserID, battleId, choice);

    /// <summary>
    /// Forfeits the battle.
    /// </summary>
    /// <param name="battleId">The battle.</param>
    /// <returns>Null, or the error to show.</returns>
    public Task<string?> Forfeit(string battleId) => _battleManager.ForfeitAsync(UserID, battleId);

    /// <summary>
    /// Picks a Pokémon from the draft pool.
    /// </summary>
    /// <param name="battleId">The battle.</param>
    /// <param name="index">The pool index.</param>
    /// <returns>Null, or the error to show.</returns>
    public Task<string?> DraftPick(string battleId, int index) => _battleManager.DraftPickAsync(UserID, battleId, index);

    /// <summary>
    /// Chooses the lead Pokémon of the drafted team.
    /// </summary>
    /// <param name="battleId">The battle.</param>
    /// <param name="index">The pool index.</param>
    /// <returns>Null, or the error to show.</returns>
    public Task<string?> DraftLead(string battleId, int index) => _battleManager.DraftLeadAsync(UserID, battleId, index);

    /// <summary>
    /// Starts a Daily Red battle against Red with the day's team, or goes back to the one running.
    /// </summary>
    /// <param name="date">The trainer's today on their device, yyyy-MM-dd.</param>
    /// <param name="practice">A practice run (doesn't count) instead of the official battle of the day.</param>
    /// <param name="lead">Which of the six (0–5) goes first.</param>
    /// <returns>{ error, battleId }.</returns>
    public async Task<object> DailyRedStart(string date, bool practice, int lead)
    {
        var (error, battleId) = await _dailyRedService.StartAsync(UserID, Name, date, practice, lead);
        return new { error, battleId };
    }
}
