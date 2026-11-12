using System.Net;
using System.Text;
using LivingDex.WebApi.Extensions.Authentication;
using LivingDex.WebApi.Extensions.Globalization;
using LivingDex.WebApi.Features;
using LivingDex.WebApi.Features.Accounts.Models;
using LivingDex.WebApi.Features.Accounts.Models.Entities;
using LivingDex.WebApi.Features.Accounts.Repositories;
using LivingDex.WebApi.Features.States.Models;
using LivingDex.WebApi.Features.States.Models.Entities;
using LivingDex.WebApi.Features.States.Repositories;
using LivingDex.WebApi.Features.Trainers.Models.Entities;
using LivingDex.WebApi.Features.Trainers.Repositories;
using Microsoft.Extensions.Options;

namespace LivingDex.UnitTest;

/// <summary>Shared helpers for the unit tests.</summary>
internal static class TestSupport
{
    public static readonly IGlobalizationHelper Globalization = new GlobalizationHelper();

    public static IOptions<LivingDexOptions> Options(Action<LivingDexOptions>? configure = null)
    {
        var options = new LivingDexOptions();
        configure?.Invoke(options);
        return Microsoft.Extensions.Options.Options.Create(options);
    }

    /// <summary>A throw-away folder, deleted on dispose.</summary>
    public static TempFolder NewFolder() => new();
}

internal sealed class TempFolder : IDisposable
{
    public string Path { get; } = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "livingdex-tests", Guid.NewGuid().ToString("N"));

    public TempFolder() => Directory.CreateDirectory(Path);

    public void Dispose()
    {
        try
        {
            Directory.Delete(Path, recursive: true);
        }
        catch (IOException)
        {
        }
    }
}

/// <summary>Accounts in memory, with the same rules as the stored procedures.</summary>
internal sealed class FakeUserRepository : IUserRepository
{
    public List<UserAccount> Users { get; } = [];

    public Dictionary<long, string> Data { get; } = [];

    public Task<int> CountAsync() => Task.FromResult(Users.Count);

    public Task<UserAccount?> GetAsync(long userId) => Task.FromResult(Users.FirstOrDefault(user => user.UserID == userId));

    public Task<UserAccount?> GetByNameAsync(string username) =>
        Task.FromResult(Users.FirstOrDefault(user => string.Equals(user.Username, username, StringComparison.OrdinalIgnoreCase)));

    public Task<List<UserAccountListItem>> ListAsync() => Task.FromResult(Users.Select(user => new UserAccountListItem
    {
        UserID = user.UserID,
        UserUniqueID = user.UserUniqueID,
        Username = user.Username,
        IsAdmin = user.IsAdmin,
        CreatedAt = user.CreatedAt,
        LastLoginAt = user.LastLoginAt,
        Data = Data.GetValueOrDefault(user.UserID),
    }).ToList());

    public Task<UserCreateResult> CreateAsync(string username, string passwordHash, string securityStamp, bool allowRegistration)
    {
        if (Users.Count > 0 && !allowRegistration)
        {
            return Task.FromResult(new UserCreateResult(UserCreateOutcome.RegistrationClosed, null));
        }

        if (Users.Any(user => string.Equals(user.Username, username, StringComparison.OrdinalIgnoreCase)))
        {
            return Task.FromResult(new UserCreateResult(UserCreateOutcome.UsernameTaken, null));
        }

        var created = new UserAccount
        {
            UserID = Users.Count == 0 ? 1 : Users.Max(user => user.UserID) + 1,
            UserUniqueID = Guid.NewGuid(),
            Username = username,
            PasswordHash = passwordHash,
            IsAdmin = Users.Count == 0,
            SecurityStamp = securityStamp,
            CreatedAt = DateTime.UtcNow,
        };
        Users.Add(created);
        return Task.FromResult(new UserCreateResult(UserCreateOutcome.Created, created));
    }

    public Task<UserAccount?> SetPasswordAsync(long userId, string passwordHash, string securityStamp)
    {
        var user = Users.FirstOrDefault(candidate => candidate.UserID == userId);
        if (user is not null)
        {
            user.PasswordHash = passwordHash;
            user.SecurityStamp = securityStamp;
        }

        return Task.FromResult(user);
    }

    public Task<UserAccount?> GetByDiscordAsync(string discordId) => Task.FromResult(Users.FirstOrDefault(user => user.DiscordID == discordId));

    public Task<bool> SetDiscordAsync(long userId, string? discordId, string? discordName)
    {
        if (discordId is not null && Users.Any(user => user.DiscordID == discordId && user.UserID != userId))
        {
            return Task.FromResult(false);
        }

        if (Users.FirstOrDefault(candidate => candidate.UserID == userId) is { } user)
        {
            user.DiscordID = discordId;
            user.DiscordName = discordId is null ? null : discordName;
        }

        return Task.FromResult(true);
    }

    public Task TouchLoginAsync(long userId)
    {
        var user = Users.FirstOrDefault(candidate => candidate.UserID == userId);
        if (user is not null)
        {
            user.LastLoginAt = DateTime.UtcNow;
        }

        return Task.CompletedTask;
    }

    public Task<bool> DeleteAsync(long userId)
    {
        var deleted = Users.RemoveAll(user => user.UserID == userId) > 0;
        if (Users.Count > 0 && !Users.Any(user => user.IsAdmin))
        {
            Users.MinBy(user => user.UserID)!.IsAdmin = true;
        }

        return Task.FromResult(deleted);
    }
}

/// <summary>Records sign-ins and sign-outs instead of writing cookies.</summary>
internal sealed class FakeUserSession : IUserSession
{
    public UserAccount? SignedIn { get; private set; }

    public bool SignedOut { get; private set; }

    public Task SignInAsync(UserAccount user, bool remember)
    {
        SignedIn = user;
        SignedOut = false;
        return Task.CompletedTask;
    }

    public Task SignOutAsync()
    {
        SignedIn = null;
        SignedOut = true;
        return Task.CompletedTask;
    }
}

/// <summary>Progress documents in memory, with the same rules as dbo.UserStateSave.</summary>
internal sealed class FakeStateRepository : IStateRepository
{
    private readonly Dictionary<long, UserState> _current = [];
    private readonly List<(long UserID, UserStateHistory Entry)> _history = [];

    public Task<UserState> GetAsync(long userId) =>
        Task.FromResult(_current.TryGetValue(userId, out var state) ? state : new UserState { UserID = userId });

    public Task<StateSaveResult> SaveAsync(long userId, long revision, string data, string? client, int historyLimit)
    {
        var current = _current.TryGetValue(userId, out var state) ? state : new UserState { UserID = userId };
        if (current.Revision != revision)
        {
            return Task.FromResult(new StateSaveResult(false, current));
        }

        var next = new UserState { UserID = userId, Revision = revision + 1, Data = data, UpdatedAt = DateTime.UtcNow };
        _current[userId] = next;
        _history.Add((userId, new UserStateHistory { Revision = next.Revision, Data = data, UpdatedAt = next.UpdatedAt.Value, Client = client }));
        _history.RemoveAll(entry => entry.UserID == userId && entry.Entry.Revision <= next.Revision - historyLimit);
        return Task.FromResult(new StateSaveResult(true, next));
    }

    public Task<List<UserStateHistory>> ListHistoryAsync(long userId, int take) =>
        Task.FromResult(_history.Where(entry => entry.UserID == userId).Select(entry => entry.Entry).OrderByDescending(entry => entry.Revision).Take(take).ToList());

    public Task<UserStateHistory?> GetHistoryAsync(long userId, long revision) =>
        Task.FromResult(_history.Where(entry => entry.UserID == userId && entry.Entry.Revision == revision).Select(entry => entry.Entry).FirstOrDefault());
}

/// <summary>Trainer profiles and decided battles in memory.</summary>
internal sealed class FakeTrainerRepository : ITrainerRepository
{
    public List<TrainerProfile> Profiles { get; } = [];

    public List<TrainerBattle> Battles { get; } = [];

    public Task<List<TrainerProfile>> ListAsync() => Task.FromResult(Profiles.OrderBy(profile => profile.Username).ToList());

    public Task<TrainerProfile?> GetAsync(long userId) => Task.FromResult(Profiles.FirstOrDefault(profile => profile.UserID == userId));

    public Task SetPartnerAsync(long userId, int partner, bool shiny)
    {
        var profile = Profiles.First(candidate => candidate.UserID == userId);
        profile.Partner = partner;
        profile.PartnerShiny = shiny;
        return Task.CompletedTask;
    }

    public Task TouchAsync(long userId)
    {
        Profiles.First(candidate => candidate.UserID == userId).LastSeenAt = DateTime.UtcNow;
        return Task.CompletedTask;
    }

    public Task<List<TrainerBattle>> ListDecidedBattlesAsync(long userId) =>
        Task.FromResult(Battles.Where(battle => (battle.P1UserID == userId || battle.P2UserID == userId) && battle.Winner > 0).ToList());
}

/// <summary>Answers every request with the given status and body, and records the URLs asked for.</summary>
internal sealed class FakeHttpMessageHandler(HttpStatusCode status, string body = "") : HttpMessageHandler
{
    public List<Uri> Requests { get; } = [];

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        Requests.Add(request.RequestUri!);
        return Task.FromResult(new HttpResponseMessage(status) { Content = new ByteArrayContent(Encoding.UTF8.GetBytes(body)) });
    }
}

/// <summary>An IHttpClientFactory that always hands out a client over the given handler.</summary>
internal sealed class FakeHttpClientFactory(HttpMessageHandler handler) : IHttpClientFactory
{
    public HttpClient CreateClient(string name) => new(handler, disposeHandler: false);
}
