using LivingDex.Library.Services;
using LivingDex.WebApi.Features.Accounts.Models.DTOs;

namespace LivingDex.WebApi.Features.Accounts.Services;

/// <summary>
/// Business logic for Manage users (admin only).
/// </summary>
internal interface IUserAdminService
{
    /// <summary>
    /// Lists every account with its number of marked entries.
    /// </summary>
    /// <returns>The accounts, oldest first.</returns>
    Task<ServiceApiResponse<List<UserListItemDTO>>> ListAsync();

    /// <summary>
    /// Gives another account a temporary password (signing it out everywhere).
    /// </summary>
    /// <param name="adminUserId">The signed-in admin.</param>
    /// <param name="userId">The account to reset.</param>
    /// <returns>The temporary password, or why not.</returns>
    Task<ServiceApiResponse<TemporaryPasswordDTO>> ResetPasswordAsync(long adminUserId, long userId);

    /// <summary>
    /// Deletes another account and its progress.
    /// </summary>
    /// <param name="adminUserId">The signed-in admin.</param>
    /// <param name="userId">The account to delete.</param>
    /// <returns>No content, or why not.</returns>
    Task<ServiceApiResponse<string>> DeleteAsync(long adminUserId, long userId);
}
