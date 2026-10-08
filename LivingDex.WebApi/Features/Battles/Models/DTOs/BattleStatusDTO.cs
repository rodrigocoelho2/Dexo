namespace LivingDex.WebApi.Features.Battles.Models.DTOs;

/// <summary>
/// Whether battles can be played, and with what.
/// </summary>
public sealed class BattleStatusDTO
{
    /// <summary>Gets or sets a value indicating whether the simulator is running.</summary>
    public bool Available { get; set; }

    /// <summary>Gets or sets why the simulator is not running.</summary>
    public string? Problem { get; set; }

    /// <summary>Gets or sets the playable formats.</summary>
    public string[] Formats { get; set; } = [];

    /// <summary>Gets or sets the battle backgrounds.</summary>
    public string[] Backgrounds { get; set; } = [];

    /// <summary>Gets or sets the seconds per turn.</summary>
    public int TurnSeconds { get; set; }
}
