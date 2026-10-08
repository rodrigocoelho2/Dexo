namespace LivingDex.WebApi.Features.Accounts.Models.Entities;

/// <summary>
/// One row of dbo.UserList: an account with its progress document.
/// </summary>
public sealed class UserAccountListItem
{
    /// <summary>Gets or sets the account identifier.</summary>
    public long UserID { get; set; }

    /// <summary>Gets or sets the account's stable public identifier.</summary>
    public Guid UserUniqueID { get; set; }

    /// <summary>Gets or sets the username.</summary>
    public string Username { get; set; } = string.Empty;

    /// <summary>Gets or sets a value indicating whether the account is the server admin.</summary>
    public bool IsAdmin { get; set; }

    /// <summary>Gets or sets when the account was created (UTC).</summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>Gets or sets the last sign-in (UTC).</summary>
    public DateTime? LastLoginAt { get; set; }

    /// <summary>Gets or sets the progress document (null before the first save).</summary>
    public string? Data { get; set; }
}
