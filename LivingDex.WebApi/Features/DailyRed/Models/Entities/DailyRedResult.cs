namespace LivingDex.WebApi.Features.DailyRed.Models.Entities;

/// <summary>
/// One row of dbo.DailyRedResult: a trainer's official battle of one day. Property names are the stored procedure columns — do not rename.
/// </summary>
public sealed class DailyRedResult
{
    /// <summary>Status of a battle that is still being played.</summary>
    public const byte Playing = 0;

    /// <summary>Status of a battle the trainer won.</summary>
    public const byte Won = 1;

    /// <summary>Status of a battle the trainer lost (or forfeited).</summary>
    public const byte Lost = 2;

    /// <summary>Gets or sets the trainer.</summary>
    public long UserID { get; set; }

    /// <summary>Gets or sets the trainer's name (only filled by DailyRedResultListByDay).</summary>
    public string? Username { get; set; }

    /// <summary>Gets or sets the day (the trainer's own local date); null when the trainer has not played that day.</summary>
    public DateTime? DayKey { get; set; }

    /// <summary>Gets or sets the battle identifier.</summary>
    public string? BattleID { get; set; }

    /// <summary>Gets or sets the status: 0 playing, 1 won, 2 lost.</summary>
    public byte? Status { get; set; }

    /// <summary>Gets or sets the number of turns.</summary>
    public int? Turns { get; set; }

    /// <summary>Gets or sets how many of the trainer's Pokémon were still standing at the end.</summary>
    public int? MonsLeft { get; set; }

    /// <summary>Gets or sets how many of Red's Pokémon were still standing at the end.</summary>
    public int? RedLeft { get; set; }

    /// <summary>Gets or sets one character per Pokémon in battle order: 1 still standing, 0 fainted.</summary>
    public string? Grid { get; set; }

    /// <summary>Gets or sets when the battle started (UTC).</summary>
    public DateTime? StartedAt { get; set; }

    /// <summary>Gets or sets when the battle ended (UTC).</summary>
    public DateTime? EndedAt { get; set; }
}
