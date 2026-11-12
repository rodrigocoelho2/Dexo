namespace LivingDex.WebApi.Features;

/// <summary>
/// Settings of the "LivingDex" configuration section (env <c>LivingDex__Name</c>).
/// Relative folders are resolved from the content root at startup.
/// </summary>
public sealed class LivingDexOptions
{
    /// <summary>The configuration section name.</summary>
    public const string SectionName = "LivingDex";

    /// <summary>Gets or sets the folder for the login keys, the downloaded asset cache and the old SQLite database (imported once).</summary>
    public string DataDirectory { get; set; } = "data";

    /// <summary>Gets or sets the folder with the bundled sprites, cries, battle backgrounds and music (LivingDex.Assets).</summary>
    public string AssetsDirectory { get; set; } = "assets";

    /// <summary>Gets or sets a value indicating whether people can create their own account. The first account can always be created, and becomes the admin.</summary>
    public bool AllowRegistration { get; set; } = true;

    /// <summary>Gets or sets the Discord application's client id (DISCORD_CLIENT_ID; empty: no Discord sign-in).</summary>
    public string DiscordClientId { get; set; } = string.Empty;

    /// <summary>Gets or sets the Discord application's client secret (DISCORD_CLIENT_SECRET).</summary>
    public string DiscordClientSecret { get; set; } = string.Empty;

    /// <summary>Gets a value indicating whether "Sign in with Discord" is on (both Discord settings are set).</summary>
    public bool DiscordEnabled => !string.IsNullOrWhiteSpace(DiscordClientId) && !string.IsNullOrWhiteSpace(DiscordClientSecret);

    /// <summary>Gets or sets a value indicating whether X-Forwarded-For / X-Forwarded-Proto from a reverse proxy are trusted.</summary>
    public bool BehindProxy { get; set; }

    /// <summary>Gets or sets the sign-in, sign-up and password attempts allowed per minute from one address.</summary>
    public int AuthAttemptsPerMinute { get; set; } = 10;

    /// <summary>Gets or sets how many past revisions of each user's progress are kept for restore.</summary>
    public int HistoryLimit { get; set; } = 200;

    /// <summary>Gets or sets a value indicating whether assets missing from the bundle are downloaded once and served from the cache (otherwise the browser is redirected upstream).</summary>
    public bool CacheAssets { get; set; } = true;

    /// <summary>Gets or sets the largest accepted progress document, in bytes.</summary>
    public int MaxStateBytes { get; set; } = 8 * 1024 * 1024;

    /// <summary>Gets or sets a value indicating whether the Showdown battle room is on (needs Node.js and the Simulator folder; the Docker image has both).</summary>
    public bool ShowdownEnabled { get; set; } = true;

    /// <summary>Gets or sets the Node.js executable used to run the Pokémon Showdown simulator.</summary>
    public string NodePath { get; set; } = "node";

    /// <summary>Gets or sets the folder holding bridge.js and its node_modules.</summary>
    public string SimDirectory { get; set; } = "Simulator";

    /// <summary>Gets or sets the seconds each player has to pick a move before the game picks one for them.</summary>
    public int TurnSeconds { get; set; } = 60;

    /// <summary>
    /// Makes the folders absolute.
    /// </summary>
    /// <param name="contentRoot">The content root path.</param>
    public void ResolvePaths(string contentRoot)
    {
        DataDirectory = Path.GetFullPath(string.IsNullOrWhiteSpace(DataDirectory) ? "data" : DataDirectory, contentRoot);
        AssetsDirectory = Path.GetFullPath(string.IsNullOrWhiteSpace(AssetsDirectory) ? "assets" : AssetsDirectory, contentRoot);
        SimDirectory = Path.GetFullPath(string.IsNullOrWhiteSpace(SimDirectory) ? "Simulator" : SimDirectory, contentRoot);
    }
}
