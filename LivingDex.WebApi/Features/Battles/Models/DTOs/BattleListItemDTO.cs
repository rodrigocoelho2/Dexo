using LivingDex.Library.Enums;
using LivingDex.WebApi.Features.Battles.Models.Entities;

namespace LivingDex.WebApi.Features.Battles.Models.DTOs;

/// <summary>
/// One of the signed-in trainer's recent battles, seen from their side.
/// </summary>
public sealed class BattleListItemDTO
{
    /// <summary>
    /// Initializes an empty DTO (serialization).
    /// </summary>
    public BattleListItemDTO()
    {
    }

    /// <summary>
    /// Maps a battle from one trainer's side.
    /// </summary>
    /// <param name="entity">The battle.</param>
    /// <param name="userId">The trainer.</param>
    public BattleListItemDTO(SavedBattle entity, long userId)
    {
        var mine = entity.P1UserID == userId ? 1 : 2;
        Id = entity.BattleID;
        Format = entity.Format;
        Opponent = mine == 1 ? entity.P2Name : entity.P1Name;
        Cpu = entity.IsCpu;
        Result = entity.Winner == 0 ? BattleResult.Draw : entity.Winner == mine ? BattleResult.Win : BattleResult.Loss;
        Left = mine == 1 ? entity.P1Left : entity.P2Left;
        OpponentLeft = mine == 1 ? entity.P2Left : entity.P1Left;
        Turns = entity.Turns;
        Reason = entity.Reason;
        EndedAt = entity.EndedAt;
    }

    /// <summary>Gets or sets the battle identifier.</summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>Gets or sets the format.</summary>
    public string Format { get; set; } = string.Empty;

    /// <summary>Gets or sets the opponent's name.</summary>
    public string Opponent { get; set; } = string.Empty;

    /// <summary>Gets or sets a value indicating whether the opponent was the CPU.</summary>
    public bool Cpu { get; set; }

    /// <summary>Gets or sets the result for this trainer.</summary>
    public BattleResult Result { get; set; }

    /// <summary>Gets or sets this trainer's Pokémon left.</summary>
    public int Left { get; set; }

    /// <summary>Gets or sets the opponent's Pokémon left.</summary>
    public int OpponentLeft { get; set; }

    /// <summary>Gets or sets the number of turns.</summary>
    public int Turns { get; set; }

    /// <summary>Gets or sets how it ended.</summary>
    public string Reason { get; set; } = string.Empty;

    /// <summary>Gets or sets when it ended (UTC).</summary>
    public DateTime EndedAt { get; set; }
}
