namespace LivingDex.WebApi.Features.Battles.Models.Entities;

/// <summary>
/// One row of dbo.Battle: a finished battle. Property names are the stored procedure columns — do not rename.
/// </summary>
public sealed class SavedBattle
{
    /// <summary>Gets or sets the battle identifier (16 hex characters).</summary>
    public string BattleID { get; set; } = string.Empty;

    /// <summary>Gets or sets the format ("gen5randombattle", "gen3draft"…).</summary>
    public string Format { get; set; } = string.Empty;

    /// <summary>Gets or sets the player 1 account (null for the CPU or a deleted account).</summary>
    public long? P1UserID { get; set; }

    /// <summary>Gets or sets the player 2 account.</summary>
    public long? P2UserID { get; set; }

    /// <summary>Gets or sets the player 1 name.</summary>
    public string P1Name { get; set; } = string.Empty;

    /// <summary>Gets or sets the player 2 name.</summary>
    public string P2Name { get; set; } = string.Empty;

    /// <summary>Gets or sets a value indicating whether one side was the CPU.</summary>
    public bool IsCpu { get; set; }

    /// <summary>Gets or sets the winning side: 0 draw, 1 or 2.</summary>
    public int Winner { get; set; }

    /// <summary>Gets or sets how it ended ("normal", "forfeit", "timeout", "aborted").</summary>
    public string Reason { get; set; } = "normal";

    /// <summary>Gets or sets the number of turns.</summary>
    public int Turns { get; set; }

    /// <summary>Gets or sets the Pokémon player 1 had left.</summary>
    public int P1Left { get; set; }

    /// <summary>Gets or sets the Pokémon player 2 had left.</summary>
    public int P2Left { get; set; }

    /// <summary>Gets or sets the most knockouts by one of player 1's Pokémon.</summary>
    public int P1BestKo { get; set; }

    /// <summary>Gets or sets the most knockouts by one of player 2's Pokémon.</summary>
    public int P2BestKo { get; set; }

    /// <summary>Gets or sets both teams at the end (JSON array of two arrays).</summary>
    public string? Teams { get; set; }

    /// <summary>Gets or sets the spectator log (only when asked for).</summary>
    public string? Log { get; set; }

    /// <summary>Gets or sets the battle background.</summary>
    public string? Background { get; set; }

    /// <summary>Gets or sets when the battle started (UTC).</summary>
    public DateTime StartedAt { get; set; }

    /// <summary>Gets or sets when the battle ended (UTC).</summary>
    public DateTime EndedAt { get; set; }
}
