using System.Net;
using System.Net.Mime;
using LivingDex.Library.Validation;
using LivingDex.WebApi.Extensions.Authentication;
using LivingDex.WebApi.Extensions.Mvc;
using LivingDex.WebApi.Extensions.Services;
using LivingDex.WebApi.Features.Accounts.Models.DTOs;
using LivingDex.WebApi.Features.Accounts.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;

namespace LivingDex.WebApi.Features.Accounts.Controllers;

/// <summary>
/// Manage users (admin only).
/// </summary>
/// <param name="logger">Logger.</param>
/// <param name="userAdminService">Manage-users business logic.</param>
[Authorize(Policy = AuthPolicies.Admin)]
[Route("api/admin/users")]
[ApiController]
[Produces(MediaTypeNames.Application.Json)]
[ProducesErrorResponseType(typeof(ApiValidationProblemDetails))]
[ProducesResponseType((int)HttpStatusCode.BadRequest)]
[ProducesResponseType((int)HttpStatusCode.Unauthorized)]
[ProducesResponseType((int)HttpStatusCode.Forbidden)]
internal sealed class UserAdminController(
    ILogger<UserAdminController> logger,
    IUserAdminService userAdminService) : InternalControllerBase
{
    private readonly ILogger<UserAdminController> _logger = logger;
    private readonly IUserAdminService _userAdminService = userAdminService;

    /// <summary>
    /// Lists every account.
    /// </summary>
    /// <returns>The accounts.</returns>
    [HttpGet]
    [ProducesResponseType<List<UserListItemDTO>>((int)HttpStatusCode.OK)]
    [SwaggerOperation(Summary = "UserAdminList", OperationId = "UserAdminList")]
    public async Task<ActionResult<List<UserListItemDTO>>> UserAdminListAsync()
    {
        var apiResponse = await _userAdminService.ListAsync();
        return apiResponse.ToActionResult();
    }

    /// <summary>
    /// Gives another account a temporary password.
    /// </summary>
    /// <param name="userId">The account.</param>
    /// <returns>The temporary password.</returns>
    [HttpPost("{userId:long}/reset-password")]
    [ProducesResponseType<TemporaryPasswordDTO>((int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.NotFound)]
    [SwaggerOperation(Summary = "UserAdminResetPassword", OperationId = "UserAdminResetPassword")]
    public async Task<ActionResult<TemporaryPasswordDTO>> UserAdminResetPasswordAsync(long userId)
    {
        if (_logger.IsEnabled(LogLevel.Information))
            _logger.LogInformation("UserAdminResetPassword {UserID}", userId);

        var apiResponse = await _userAdminService.ResetPasswordAsync(User.RequiredUserID(), userId);
        return apiResponse.ToActionResult();
    }

    /// <summary>
    /// Deletes another account and its progress.
    /// </summary>
    /// <param name="userId">The account.</param>
    /// <returns>No content.</returns>
    [HttpDelete("{userId:long}")]
    [ProducesResponseType((int)HttpStatusCode.NoContent)]
    [ProducesResponseType((int)HttpStatusCode.NotFound)]
    [SwaggerOperation(Summary = "UserAdminDelete", OperationId = "UserAdminDelete")]
    public async Task<ActionResult<string>> UserAdminDeleteAsync(long userId)
    {
        if (_logger.IsEnabled(LogLevel.Information))
            _logger.LogInformation("UserAdminDelete {UserID}", userId);

        var apiResponse = await _userAdminService.DeleteAsync(User.RequiredUserID(), userId);
        return apiResponse.ToActionResult();
    }
}
