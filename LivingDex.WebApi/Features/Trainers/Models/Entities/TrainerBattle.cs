namespace LivingDex.WebApi.Features.Trainers.Models.Entities;

/// <summary>
/// One row of dbo.BattleTrainerRecord: a decided battle, with what the record and badges need.
/// </summary>
public sealed class TrainerBattle
{
    /// <summary>Gets or sets the format ("gen5randombattle", "gen3draft"…).</summary>
    public string Format { get; set; } = string.Empty;

    /// <summary>Gets or sets the player 1 account (null for the CPU or a deleted account).</summary>
    public long? P1UserID { get; set; }

    /// <summary>Gets or sets the player 2 account.</summary>
    public long? P2UserID { get; set; }

    /// <summary>Gets or sets a value indicating whether one side was the CPU.</summary>
    public bool IsCpu { get; set; }

    /// <summary>Gets or sets the winning side (1 or 2).</summary>
    public int Winner { get; set; }

    /// <summary>Gets or sets the Pokémon player 1 had left.</summary>
    public int P1Left { get; set; }

    /// <summary>Gets or sets the Pokémon player 2 had left.</summary>
    public int P2Left { get; set; }

    /// <summary>Gets or sets the most knockouts by one of player 1's Pokémon.</summary>
    public int P1BestKo { get; set; }

    /// <summary>Gets or sets the most knockouts by one of player 2's Pokémon.</summary>
    public int P2BestKo { get; set; }
}
