namespace LivingDex.WebApi.Features.Trainers.Models.DTOs;

/// <summary>
/// Set-partner request.
/// </summary>
public sealed class PartnerDTO
{
    /// <summary>Gets or sets the partner Pokémon (national dex number 1–1025).</summary>
    public int Partner { get; set; }

    /// <summary>Gets or sets a value indicating whether it is shown shiny.</summary>
    public bool Shiny { get; set; }
}
