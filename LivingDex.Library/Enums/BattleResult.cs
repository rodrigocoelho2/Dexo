namespace LivingDex.Library.Enums;

/// <summary>
/// How a finished battle ended for one trainer. Serialized in lower case ("win", "loss", "draw") for the page.
/// </summary>
public enum BattleResult
{
    /// <summary>Nobody won (both sides out, or the battle was stopped).</summary>
    Draw,

    /// <summary>The trainer won.</summary>
    Win,

    /// <summary>The trainer lost.</summary>
    Loss,
}
