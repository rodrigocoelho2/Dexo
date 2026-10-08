using LivingDex.WebApi.Features.Accounts.Models.Entities;
using LivingDex.WebApi.Features.States.Services;

namespace LivingDex.WebApi.Features.Accounts.Models.DTOs;

/// <summary>
/// One account in Manage users.
/// </summary>
public sealed class UserListItemDTO
{
    /// <summary>
    /// Initializes an empty DTO (serialization).
    /// </summary>
    public UserListItemDTO()
    {
    }

    /// <summary>
    /// Maps a list row.
    /// </summary>
    /// <param name="entity">The row.</param>
    public UserListItemDTO(UserAccountListItem entity)
    {
        Id = entity.UserID;
        Username = entity.Username;
        IsAdmin = entity.IsAdmin;
        CreatedAt = entity.CreatedAt;
        LastLoginAt = entity.LastLoginAt;
        Caught = entity.Data is null ? 0 : ProgressDocument.CountCaught(entity.Data);
    }

    /// <summary>Gets or sets the account identifier.</summary>
    public long Id { get; set; }

    /// <summary>Gets or sets the username.</summary>
    public string Username { get; set; } = string.Empty;

    /// <summary>Gets or sets a value indicating whether the account is the server admin.</summary>
    public bool IsAdmin { get; set; }

    /// <summary>Gets or sets when the account was created (UTC).</summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>Gets or sets the last sign-in (UTC).</summary>
    public DateTime? LastLoginAt { get; set; }

    /// <summary>Gets or sets the number of marked entries across every game.</summary>
    public int Caught { get; set; }
}
