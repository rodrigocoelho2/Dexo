using System.Net;
using System.Net.Mime;
using LivingDex.Library.Validation;
using LivingDex.WebApi.Extensions.Authentication;
using LivingDex.WebApi.Extensions.Mvc;
using LivingDex.WebApi.Extensions.Services;
using LivingDex.WebApi.Features.States.Models.DTOs;
using LivingDex.WebApi.Features.States.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;

namespace LivingDex.WebApi.Features.States.Controllers;

/// <summary>
/// The signed-in trainer's progress and its history.
/// </summary>
/// <param name="logger">Logger.</param>
/// <param name="stateService">Progress business logic.</param>
[Authorize]
[Route("api")]
[ApiController]
[Produces(MediaTypeNames.Application.Json)]
[ProducesErrorResponseType(typeof(ApiValidationProblemDetails))]
[ProducesResponseType((int)HttpStatusCode.BadRequest)]
[ProducesResponseType((int)HttpStatusCode.Unauthorized)]
internal sealed class StateController(
    ILogger<StateController> logger,
    IStateService stateService) : InternalControllerBase
{
    private readonly ILogger<StateController> _logger = logger;
    private readonly IStateService _stateService = stateService;

    /// <summary>
    /// Gets the current progress.
    /// </summary>
    /// <returns>The progress.</returns>
    [HttpGet("state")]
    [ProducesResponseType<StateDTO>((int)HttpStatusCode.OK)]
    [SwaggerOperation(Summary = "StateGet", OperationId = "StateGet")]
    public async Task<ActionResult<StateDTO>> StateGetAsync()
    {
        var apiResponse = await _stateService.GetAsync(User.RequiredUserID());
        return apiResponse.ToActionResult();
    }

    /// <summary>
    /// Saves the progress (409 with the current progress when another device saved first).
    /// </summary>
    /// <param name="request">The revision it is based on and the document.</param>
    /// <returns>The saved progress.</returns>
    [HttpPut("state")]
    [Consumes(MediaTypeNames.Application.Json)]
    [RequestSizeLimit(64 * 1024 * 1024)]
    [ProducesResponseType<StateDTO>((int)HttpStatusCode.OK)]
    [ProducesResponseType<StateDTO>((int)HttpStatusCode.Conflict)]
    [ProducesResponseType((int)HttpStatusCode.RequestEntityTooLarge)]
    [SwaggerOperation(Summary = "StateSave", OperationId = "StateSave")]
    public async Task<ActionResult<StateDTO>> StateSaveAsync([FromBody] StateSaveDTO request)
    {
        var apiResponse = await _stateService.SaveAsync(User.RequiredUserID(), request);
        return apiResponse.ToActionResult();
    }

    /// <summary>
    /// Lists the newest revisions.
    /// </summary>
    /// <param name="take">How many (default 30).</param>
    /// <returns>The revisions.</returns>
    [HttpGet("history")]
    [ProducesResponseType<List<HistoryItemDTO>>((int)HttpStatusCode.OK)]
    [SwaggerOperation(Summary = "StateHistoryList", OperationId = "StateHistoryList")]
    public async Task<ActionResult<List<HistoryItemDTO>>> StateHistoryListAsync([FromQuery] int? take)
    {
        var apiResponse = await _stateService.ListHistoryAsync(User.RequiredUserID(), take);
        return apiResponse.ToActionResult();
    }

    /// <summary>
    /// Restores an old revision as a new revision.
    /// </summary>
    /// <param name="revision">The revision to restore.</param>
    /// <returns>The saved progress.</returns>
    [HttpPost("history/{revision:long}/restore")]
    [ProducesResponseType<StateDTO>((int)HttpStatusCode.OK)]
    [ProducesResponseType<StateDTO>((int)HttpStatusCode.Conflict)]
    [ProducesResponseType((int)HttpStatusCode.NotFound)]
    [SwaggerOperation(Summary = "StateHistoryRestore", OperationId = "StateHistoryRestore")]
    public async Task<ActionResult<StateDTO>> StateHistoryRestoreAsync(long revision)
    {
        if (_logger.IsEnabled(LogLevel.Information))
            _logger.LogInformation("StateHistoryRestore {UserID} r{Revision}", User.UserID(), revision);

        var apiResponse = await _stateService.RestoreAsync(User.RequiredUserID(), revision);
        return apiResponse.ToActionResult();
    }
}
