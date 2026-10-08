using System.Text.Json;
using LivingDex.WebApi.Features.Battles.Models.Entities;

namespace LivingDex.WebApi.Features.Battles.Models.DTOs;

/// <summary>
/// Everything needed to replay a finished battle.
/// </summary>
public sealed class BattleReplayDTO
{
    /// <summary>
    /// Initializes an empty DTO (serialization).
    /// </summary>
    public BattleReplayDTO()
    {
    }

    /// <summary>
    /// Maps a battle read with its log.
    /// </summary>
    /// <param name="entity">The battle.</param>
    public BattleReplayDTO(SavedBattle entity)
    {
        Id = entity.BattleID;
        Format = entity.Format;
        P1Name = entity.P1Name;
        P2Name = entity.P2Name;
        P1UserId = entity.P1UserID;
        P2UserId = entity.P2UserID;
        Cpu = entity.IsCpu;
        Winner = entity.Winner;
        Reason = entity.Reason;
        Turns = entity.Turns;
        P1Left = entity.P1Left;
        P2Left = entity.P2Left;
        Background = entity.Background;
        StartedAt = entity.StartedAt;
        EndedAt = entity.EndedAt;
        if (entity.Teams is not null)
        {
            using var document = JsonDocument.Parse(entity.Teams);
            Teams = document.RootElement.Clone();
        }

        Log = entity.Log ?? string.Empty;
    }

    /// <summary>Gets or sets the battle identifier.</summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>Gets or sets the format.</summary>
    public string Format { get; set; } = string.Empty;

    /// <summary>Gets or sets the player 1 name.</summary>
    public string P1Name { get; set; } = string.Empty;

    /// <summary>Gets or sets the player 2 name.</summary>
    public string P2Name { get; set; } = string.Empty;

    /// <summary>Gets or sets the player 1 account.</summary>
    public long? P1UserId { get; set; }

    /// <summary>Gets or sets the player 2 account.</summary>
    public long? P2UserId { get; set; }

    /// <summary>Gets or sets a value indicating whether one side was the CPU.</summary>
    public bool Cpu { get; set; }

    /// <summary>Gets or sets the winning side: 0 draw, 1 or 2.</summary>
    public int Winner { get; set; }

    /// <summary>Gets or sets how it ended.</summary>
    public string Reason { get; set; } = string.Empty;

    /// <summary>Gets or sets the number of turns.</summary>
    public int Turns { get; set; }

    /// <summary>Gets or sets the Pokémon player 1 had left.</summary>
    public int P1Left { get; set; }

    /// <summary>Gets or sets the Pokémon player 2 had left.</summary>
    public int P2Left { get; set; }

    /// <summary>Gets or sets the battle background.</summary>
    public string? Background { get; set; }

    /// <summary>Gets or sets when it started (UTC).</summary>
    public DateTime StartedAt { get; set; }

    /// <summary>Gets or sets when it ended (UTC).</summary>
    public DateTime EndedAt { get; set; }

    /// <summary>Gets or sets both teams at the end.</summary>
    public JsonElement? Teams { get; set; }

    /// <summary>Gets or sets the spectator log.</summary>
    public string Log { get; set; } = string.Empty;
}
