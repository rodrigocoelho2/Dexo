namespace LivingDex;

public sealed class LivingDexOptions
{
    public const string Section = "LivingDex";

    /// <summary>Folder for the SQLite database, the login keys and the sprite/cry cache. Relative paths are resolved from the content root.</summary>
    public string DataDirectory { get; set; } = "data";

    /// <summary>Whether people can create their own account. The very first account can always be created, and becomes the admin.</summary>
    public bool AllowRegistration { get; set; } = true;

    /// <summary>Trust X-Forwarded-For / X-Forwarded-Proto from a reverse proxy (nginx, Traefik…).</summary>
    public bool BehindProxy { get; set; }

    /// <summary>Sign-in, sign-up and password attempts allowed per minute from one address.</summary>
    public int AuthAttemptsPerMinute { get; set; } = 10;

    /// <summary>How many past revisions of each user's progress are kept for restore.</summary>
    public int HistoryLimit { get; set; } = 200;

    /// <summary>Download sprites and cries once from PokeAPI and serve them from disk afterwards.</summary>
    public bool CacheAssets { get; set; } = true;

    /// <summary>Largest accepted progress document, in bytes.</summary>
    public int MaxStateBytes { get; set; } = 8 * 1024 * 1024;

    /// <summary>Turns on the Showdown battle room (needs Node.js and the sim folder; the Docker image has both).</summary>
    public bool ShowdownEnabled { get; set; } = true;

    /// <summary>Node.js executable used to run the Pokémon Showdown simulator.</summary>
    public string NodePath { get; set; } = "node";

    /// <summary>Folder holding bridge.js and its node_modules. Relative paths are resolved from the content root.</summary>
    public string SimDirectory { get; set; } = "sim";

    /// <summary>Seconds each player has to pick a move before the game picks one for them.</summary>
    public int TurnSeconds { get; set; } = 60;

    public static string ResolveDataDirectory(string? configured, string contentRoot) =>
        Path.GetFullPath(string.IsNullOrWhiteSpace(configured) ? "data" : configured, contentRoot);
}
