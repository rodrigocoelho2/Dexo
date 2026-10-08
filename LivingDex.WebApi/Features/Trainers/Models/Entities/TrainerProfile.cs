namespace LivingDex.WebApi.Features.Trainers.Models.Entities;

/// <summary>
/// One row of dbo.TrainerProfileList / dbo.TrainerProfileGet: an account with its trainer card settings.
/// </summary>
public sealed class TrainerProfile
{
    /// <summary>Gets or sets the account identifier.</summary>
    public long UserID { get; set; }

    /// <summary>Gets or sets the username.</summary>
    public string Username { get; set; } = string.Empty;

    /// <summary>Gets or sets the partner Pokémon (national dex number; Pikachu until changed).</summary>
    public int Partner { get; set; } = 25;

    /// <summary>Gets or sets a value indicating whether the partner is shown shiny.</summary>
    public bool PartnerShiny { get; set; }

    /// <summary>Gets or sets when the trainer was last online in Showdown (UTC).</summary>
    public DateTime? LastSeenAt { get; set; }

    /// <summary>Gets or sets the entries marked in Pokémon HOME · Normal (the living dex number).</summary>
    public int LivingDex { get; set; }
}
