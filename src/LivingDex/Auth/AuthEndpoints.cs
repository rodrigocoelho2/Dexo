using System.Security.Claims;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;

namespace LivingDex.Auth;

public sealed record CredentialsRequest(string? Username, string? Password, bool Remember = true);

public sealed record ChangePasswordRequest(string? CurrentPassword, string? NewPassword);

public sealed record DeleteAccountRequest(string? Password);

public sealed record MeResponse(long Id, string Username, bool IsAdmin);

public sealed record AssetDownloadRequest(string[][]? Items);

public sealed record AdminUserItem(long Id, string Username, bool IsAdmin, string CreatedAt, string? LastLoginAt, int Caught);

public sealed record TemporaryPasswordResponse(string TemporaryPassword);

public static partial class AuthEndpoints
{
    public const string RateLimitPolicy = "auth";
    public const int MinPasswordLength = 8;
    public const int MaxPasswordLength = 128;

    [GeneratedRegex(@"^[A-Za-z0-9_.\-]{3,24}$")]
    private static partial Regex UsernamePattern();

    public static RouteGroupBuilder MapAuthEndpoints(this RouteGroupBuilder api)
    {
        var auth = api.MapGroup("/auth");

        auth.MapGet("/me", (ClaimsPrincipal user) =>
            Results.Ok(new MeResponse(user.RequiredUserId(), user.Identity!.Name!, user.IsAdmin())))
            .RequireAuthorization();

        auth.MapPost("/register", async (CredentialsRequest body, UserRepository users, IOptions<LivingDexOptions> options, HttpContext http, CancellationToken ct) =>
        {
            var username = body.Username?.Trim() ?? "";
            var password = body.Password ?? "";

            if (!UsernamePattern().IsMatch(username))
                return Problem("Username must be 3–24 letters, numbers, dots, dashes or underscores.", StatusCodes.Status400BadRequest);
            if (PasswordError(password) is { } passwordError)
                return Problem(passwordError, StatusCodes.Status400BadRequest);

            var result = await users.CreateAsync(username, PasswordHasher.Hash(password), options.Value.AllowRegistration, ct);
            switch (result.Outcome)
            {
                case CreateUserOutcome.RegistrationClosed:
                    return Problem("New accounts are turned off on this server. Ask the admin to create one for you.", StatusCodes.Status403Forbidden);
                case CreateUserOutcome.UsernameTaken:
                    return Problem("That username is taken.", StatusCodes.Status409Conflict);
            }

            var user = result.User!;
            await users.TouchLoginAsync(user.Id, ct);
            await AuthSetup.SignInAsync(http, user, body.Remember);
            return Results.Created("/api/auth/me", new MeResponse(user.Id, user.Username, user.IsAdmin));
        }).RequireRateLimiting(RateLimitPolicy);

        auth.MapPost("/login", async (CredentialsRequest body, UserRepository users, HttpContext http, CancellationToken ct) =>
        {
            var username = body.Username?.Trim() ?? "";
            var password = body.Password ?? "";
            var user = username.Length is > 0 and <= 64 ? await users.FindByUsernameAsync(username, ct) : null;

            if (user is null)
            {
                PasswordHasher.VerifyAgainstDummy(password);
                return Problem("Wrong username or password.", StatusCodes.Status401Unauthorized);
            }
            if (password.Length > MaxPasswordLength || !PasswordHasher.Verify(password, user.PasswordHash))
                return Problem("Wrong username or password.", StatusCodes.Status401Unauthorized);

            await users.TouchLoginAsync(user.Id, ct);
            await AuthSetup.SignInAsync(http, user, body.Remember);
            return Results.Ok(new MeResponse(user.Id, user.Username, user.IsAdmin));
        }).RequireRateLimiting(RateLimitPolicy);

        auth.MapPost("/logout", async (HttpContext http) =>
        {
            await AuthSetup.SignOutAsync(http);
            return Results.NoContent();
        });

        auth.MapPost("/password", async (ChangePasswordRequest body, ClaimsPrincipal principal, UserRepository users, HttpContext http, CancellationToken ct) =>
        {
            var user = await users.GetAsync(principal.RequiredUserId(), ct);
            if (user is null)
                return Results.Unauthorized();
            if (!PasswordHasher.Verify(body.CurrentPassword ?? "", user.PasswordHash))
                return Problem("Your current password is not correct.", StatusCodes.Status400BadRequest);
            if (PasswordError(body.NewPassword ?? "") is { } passwordError)
                return Problem(passwordError, StatusCodes.Status400BadRequest);

            var updated = await users.SetPasswordAsync(user.Id, PasswordHasher.Hash(body.NewPassword!), ct);
            // The new stamp signs out every other device; give this one a fresh cookie so it stays in.
            await AuthSetup.SignInAsync(http, updated!, remember: true);
            return Results.NoContent();
        }).RequireAuthorization().RequireRateLimiting(RateLimitPolicy);

        auth.MapPost("/delete-account", async (DeleteAccountRequest body, ClaimsPrincipal principal, UserRepository users, HttpContext http, CancellationToken ct) =>
        {
            var user = await users.GetAsync(principal.RequiredUserId(), ct);
            if (user is null)
                return Results.Unauthorized();
            if (!PasswordHasher.Verify(body.Password ?? "", user.PasswordHash))
                return Problem("Your password is not correct.", StatusCodes.Status400BadRequest);

            await users.DeleteAsync(user.Id, ct);
            await AuthSetup.SignOutAsync(http);
            return Results.NoContent();
        }).RequireAuthorization().RequireRateLimiting(RateLimitPolicy);

        return api;
    }

    public static RouteGroupBuilder MapAdminEndpoints(this RouteGroupBuilder api)
    {
        var admin = api.MapGroup("/admin").RequireAuthorization(AuthSetup.AdminPolicy);

        admin.MapGet("/users", async (UserRepository users, CancellationToken ct) =>
        {
            var rows = await users.ListAsync(ct);
            return Results.Ok(rows.Select(r => new AdminUserItem(
                r.Id, r.Username, r.IsAdminFlag != 0, r.CreatedAt, r.LastLoginAt,
                r.Data is null ? 0 : State.StateEndpoints.CountCaught(r.Data))));
        });

        admin.MapPost("/users/{id:long}/reset-password", async (long id, ClaimsPrincipal principal, UserRepository users, CancellationToken ct) =>
        {
            if (id == principal.RequiredUserId())
                return Problem("Use Change password for your own account.", StatusCodes.Status400BadRequest);

            var temporary = PasswordHasher.GenerateTemporary();
            var updated = await users.SetPasswordAsync(id, PasswordHasher.Hash(temporary), ct);
            return updated is null ? Results.NotFound() : Results.Ok(new TemporaryPasswordResponse(temporary));
        });

        admin.MapDelete("/users/{id:long}", async (long id, ClaimsPrincipal principal, UserRepository users, CancellationToken ct) =>
        {
            if (id == principal.RequiredUserId())
                return Problem("Delete your own account from the account menu instead.", StatusCodes.Status400BadRequest);

            return await users.DeleteAsync(id, ct) ? Results.NoContent() : Results.NotFound();
        });

        // "Download all assets": the page sends the list (it knows every species, form and track), the server fetches it.
        admin.MapPost("/assets/download", (AssetDownloadRequest body, Assets.AssetPrefetcher prefetcher) =>
        {
            var error = prefetcher.Start(body.Items ?? []);
            return error is null ? Results.Accepted("/api/admin/assets/status", prefetcher.Snapshot()) : Problem(error, StatusCodes.Status400BadRequest);
        });
        admin.MapGet("/assets/status", (Assets.AssetPrefetcher prefetcher) => Results.Ok(prefetcher.Snapshot()));
        admin.MapPost("/assets/cancel", (Assets.AssetPrefetcher prefetcher) => prefetcher.Cancel() ? Results.NoContent() : Results.NotFound());

        return api;
    }

    internal static string? PasswordError(string password) => password.Length switch
    {
        < MinPasswordLength => $"Password must have at least {MinPasswordLength} characters.",
        > MaxPasswordLength => $"Password can have at most {MaxPasswordLength} characters.",
        _ => null,
    };

    private static IResult Problem(string detail, int status) => Results.Problem(detail: detail, statusCode: status);
}
