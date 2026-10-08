using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;

namespace LivingDex.Auth;

public static class AuthSetup
{
    public const string AdminPolicy = "admin";
    private const string StampClaim = "stamp";
    private const string AdminClaim = "admin";

    public static IServiceCollection AddLivingDexAuth(this IServiceCollection services, string dataDirectory)
    {
        // Login cookies are encrypted with these keys; keeping them in the data volume means
        // people stay signed in across container restarts and image updates.
        services.AddDataProtection()
            .SetApplicationName("LivingDex")
            .PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(dataDirectory, "keys")));

        services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
            .AddCookie(o =>
            {
                o.Cookie.Name = "livingdex.auth";
                o.Cookie.HttpOnly = true;
                o.Cookie.SameSite = SameSiteMode.Lax;
                o.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;   // works on plain http inside the LAN
                o.ExpireTimeSpan = TimeSpan.FromDays(60);
                o.SlidingExpiration = true;

                // This is an API for a single page: answer with status codes instead of redirecting to a login page.
                o.Events.OnRedirectToLogin = ctx => { ctx.Response.StatusCode = StatusCodes.Status401Unauthorized; return Task.CompletedTask; };
                o.Events.OnRedirectToAccessDenied = ctx => { ctx.Response.StatusCode = StatusCodes.Status403Forbidden; return Task.CompletedTask; };
                o.Events.OnValidatePrincipal = ValidatePrincipalAsync;
            });

        services.AddAuthorizationBuilder()
            .AddPolicy(AdminPolicy, p => p.RequireAuthenticatedUser().RequireClaim(AdminClaim, "1"));

        return services;
    }

    /// <summary>
    /// Runs on every authenticated request: a deleted account, or one whose password was changed or reset
    /// elsewhere, no longer matches its cookie and is signed out.
    /// </summary>
    private static async Task ValidatePrincipalAsync(CookieValidatePrincipalContext ctx)
    {
        var principal = ctx.Principal;
        var id = principal?.UserId();
        var users = ctx.HttpContext.RequestServices.GetRequiredService<UserRepository>();
        var user = id is null ? null : await users.GetAsync(id.Value, ctx.HttpContext.RequestAborted);

        if (principal is null || user is null || user.SecurityStamp != principal.FindFirstValue(StampClaim))
        {
            ctx.RejectPrincipal();
            await ctx.HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return;
        }

        // Admin rights can move to another account when the admin deletes theirs.
        if (user.IsAdmin != principal.IsAdmin() || user.Username != principal.Identity?.Name)
        {
            ctx.ReplacePrincipal(CreatePrincipal(user));
            ctx.ShouldRenew = true;
        }
    }

    public static ClaimsPrincipal CreatePrincipal(UserRow user)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString(System.Globalization.CultureInfo.InvariantCulture)),
            new(ClaimTypes.Name, user.Username),
            new(StampClaim, user.SecurityStamp),
        };
        if (user.IsAdmin)
            claims.Add(new Claim(AdminClaim, "1"));

        return new ClaimsPrincipal(new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme));
    }

    public static Task SignInAsync(HttpContext http, UserRow user, bool remember) =>
        http.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, CreatePrincipal(user),
            new AuthenticationProperties { IsPersistent = remember });

    public static Task SignOutAsync(HttpContext http) =>
        http.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);

    public static long? UserId(this ClaimsPrincipal principal) =>
        long.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    /// <summary>For endpoints that already require authorization.</summary>
    public static long RequiredUserId(this ClaimsPrincipal principal) =>
        principal.UserId() ?? throw new InvalidOperationException("No signed-in user.");

    public static bool IsAdmin(this ClaimsPrincipal principal) => principal.HasClaim(AdminClaim, "1");
}
