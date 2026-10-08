using LivingDex.WebApi.Features.Trainers.Models.Entities;

namespace LivingDex.WebApi.Features.Trainers.Models.DTOs;

/// <summary>
/// A trainer card: who, partner, living dex number, battle record and badges.
/// </summary>
public sealed class TrainerCardDTO
{
    /// <summary>
    /// Initializes an empty DTO (serialization).
    /// </summary>
    public TrainerCardDTO()
    {
    }

    /// <summary>
    /// Maps a profile and its record.
    /// </summary>
    /// <param name="profile">The profile.</param>
    /// <param name="record">The battle record.</param>
    public TrainerCardDTO(TrainerProfile profile, TrainerRecord record)
    {
        Id = profile.UserID;
        Name = profile.Username;
        Wins = record.Wins;
        Losses = record.Losses;
        Streak = record.Streak;
        CpuWins = record.CpuWins;
        CpuLosses = record.CpuLosses;
        LivingDex = profile.LivingDex;
        Partner = profile.Partner;
        PartnerShiny = profile.PartnerShiny;
        LastSeen = profile.LastSeenAt;
        Played = record.Played;
        Badges = record.Badges;
    }

    /// <summary>Gets or sets the account identifier.</summary>
    public long Id { get; set; }

    /// <summary>Gets or sets the username.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Gets or sets the wins against people.</summary>
    public int Wins { get; set; }

    /// <summary>Gets or sets the losses against people.</summary>
    public int Losses { get; set; }

    /// <summary>Gets or sets the current winning streak.</summary>
    public int Streak { get; set; }

    /// <summary>Gets or sets the wins against the CPU.</summary>
    public int CpuWins { get; set; }

    /// <summary>Gets or sets the losses against the CPU.</summary>
    public int CpuLosses { get; set; }

    /// <summary>Gets or sets the living dex number (Pokémon HOME · Normal).</summary>
    public int LivingDex { get; set; }

    /// <summary>Gets or sets the partner Pokémon.</summary>
    public int Partner { get; set; }

    /// <summary>Gets or sets a value indicating whether the partner is shiny.</summary>
    public bool PartnerShiny { get; set; }

    /// <summary>Gets or sets when the trainer was last online (UTC).</summary>
    public DateTime? LastSeen { get; set; }

    /// <summary>Gets or sets the decided battles against people.</summary>
    public int Played { get; set; }

    /// <summary>Gets or sets the earned battle badges.</summary>
    public string[] Badges { get; set; } = [];
}
