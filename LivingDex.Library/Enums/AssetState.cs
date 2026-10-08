namespace LivingDex.Library.Enums;

/// <summary>
/// The outcome of making sure one asset is available.
/// </summary>
public enum AssetState
{
    /// <summary>Already on disk (shipped with the app or cached earlier).</summary>
    Cached,

    /// <summary>Downloaded just now.</summary>
    Downloaded,

    /// <summary>Does not exist upstream.</summary>
    Missing,

    /// <summary>The download failed (network or upstream error).</summary>
    Failed,

    /// <summary>Not an allowed path.</summary>
    Rejected,
}
