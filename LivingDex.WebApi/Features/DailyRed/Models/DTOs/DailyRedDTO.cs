using System.Text.Json;

namespace LivingDex.WebApi.Features.DailyRed.Models.DTOs;

/// <summary>
/// Everything the Daily Red page shows for one day: the team, Red, the trainer's battle and stats, and the other trainers.
/// </summary>
public sealed class DailyRedDTO
{
    /// <summary>Gets or sets the Daily Red number (No. 1 was 14 October 2026).</summary>
    public int No { get; set; }

    /// <summary>Gets or sets the day (yyyy-MM-dd, the trainer's own date).</summary>
    public string Date { get; set; } = string.Empty;

    /// <summary>Gets or sets a value indicating whether battles can be played right now (the simulator is running).</summary>
    public bool Available { get; set; }

    /// <summary>Gets or sets the day's six Pokémon (sets as shown on the page), or null if the team could not be made.</summary>
    public JsonElement? Team { get; set; }

    /// <summary>Gets or sets Red's six Pokémon, lead first.</summary>
    public JsonElement? Red { get; set; }

    /// <summary>Gets or sets how hard each of the day's Pokémon hits each of Red's, and back.</summary>
    public JsonElement? Matchups { get; set; }

    /// <summary>Gets or sets the trainer's official battle of the day.</summary>
    public DailyRedOfficialDTO Official { get; set; } = new();

    /// <summary>Gets or sets the Daily Red battle the trainer has running (official or practice), if any.</summary>
    public string? RunningBattleId { get; set; }

    /// <summary>Gets or sets a value indicating whether the running battle is the official one.</summary>
    public bool RunningOfficial { get; set; }

    /// <summary>Gets or sets the trainer's stats over every official battle.</summary>
    public DailyRedStatsDTO Stats { get; set; } = new();

    /// <summary>Gets or sets every trainer on the server and how their battle of the day went.</summary>
    public List<DailyRedTrainerDTO> Trainers { get; set; } = [];
}

/// <summary>
/// The trainer's official battle of the day.
/// </summary>
public sealed class DailyRedOfficialDTO
{
    /// <summary>Gets or sets "none", "playing", "won" or "lost".</summary>
    public string Status { get; set; } = "none";

    /// <summary>Gets or sets the battle identifier.</summary>
    public string? BattleId { get; set; }

    /// <summary>Gets or sets the number of turns.</summary>
    public int Turns { get; set; }

    /// <summary>Gets or sets how many of the trainer's Pokémon were left.</summary>
    public int Left { get; set; }

    /// <summary>Gets or sets how many of Red's Pokémon were left.</summary>
    public int RedLeft { get; set; }

    /// <summary>Gets or sets one character per Pokémon in battle order: 1 standing, 0 fainted.</summary>
    public string? Grid { get; set; }
}

/// <summary>
/// Stats over every official Daily Red battle of a trainer.
/// </summary>
public sealed class DailyRedStatsDTO
{
    /// <summary>Gets or sets the official battles finished.</summary>
    public int Played { get; set; }

    /// <summary>Gets or sets the official battles won.</summary>
    public int Wins { get; set; }

    /// <summary>Gets or sets the share won, 0–100.</summary>
    public int WinPct { get; set; }

    /// <summary>Gets or sets the current run of wins on consecutive days.</summary>
    public int Streak { get; set; }

    /// <summary>Gets or sets the longest run of wins on consecutive days.</summary>
    public int BestStreak { get; set; }

    /// <summary>Gets or sets the current run of consecutive days played.</summary>
    public int DayStreak { get; set; }
}

/// <summary>
/// One trainer in "Trainers today".
/// </summary>
public sealed class DailyRedTrainerDTO
{
    /// <summary>Gets or sets the trainer.</summary>
    public long UserId { get; set; }

    /// <summary>Gets or sets the trainer's name.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Gets or sets "none", "playing", "played" (result hidden until you play yours), "won" or "lost".</summary>
    public string Status { get; set; } = "none";

    /// <summary>Gets or sets the number of turns (0 when hidden).</summary>
    public int Turns { get; set; }

    /// <summary>Gets or sets how many of their Pokémon were left (0 when hidden).</summary>
    public int Left { get; set; }

    /// <summary>Gets or sets the Pokémon of Red still standing when they lost (0 when hidden).</summary>
    public int RedLeft { get; set; }
}
