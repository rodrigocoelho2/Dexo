namespace LivingDex.WebApi.Features.Trainers.Models;

/// <summary>
/// The numbers on a trainer card. Only battles against other people count for the record and the badges;
/// CPU practice is counted separately.
/// </summary>
/// <param name="Wins">Wins against people.</param>
/// <param name="Losses">Losses against people.</param>
/// <param name="Streak">Current winning streak.</param>
/// <param name="CpuWins">Wins against the CPU.</param>
/// <param name="CpuLosses">Losses against the CPU.</param>
/// <param name="Played">Decided battles against people.</param>
/// <param name="Badges">Earned battle badges (<see cref="TrainerBadges"/>).</param>
public sealed record TrainerRecord(int Wins, int Losses, int Streak, int CpuWins, int CpuLosses, int Played, string[] Badges);

/// <summary>
/// Battle badge keys, as the page knows them.
/// </summary>
public static class TrainerBadges
{
    /// <summary>First win against a person.</summary>
    public const string FirstWin = "first-win";

    /// <summary>Ten wins.</summary>
    public const string TenWins = "ten-wins";

    /// <summary>Five wins in a row.</summary>
    public const string OnFire = "on-fire";

    /// <summary>A win with one Pokémon left.</summary>
    public const string LastStand = "last-stand";

    /// <summary>One Pokémon knocked out three.</summary>
    public const string Sweeper = "sweeper";

    /// <summary>A win without losing a Pokémon.</summary>
    public const string Flawless = "flawless";

    /// <summary>Fifty battles played.</summary>
    public const string Veteran = "veteran";

    /// <summary>A win in every generation 1–5.</summary>
    public const string TimeTraveller = "time-traveller";
}
