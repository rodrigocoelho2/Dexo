using System.Net;
using System.Net.Mime;
using LivingDex.Library.Validation;
using LivingDex.WebApi.Extensions.Authentication;
using LivingDex.WebApi.Extensions.Mvc;
using LivingDex.WebApi.Extensions.Services;
using LivingDex.WebApi.Features.Battles.Models.DTOs;
using LivingDex.WebApi.Features.Battles.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;

namespace LivingDex.WebApi.Features.Battles.Controllers;

/// <summary>
/// The Showdown room: status, recent battles, replays and per-format records.
/// </summary>
/// <param name="battleService">Battle business logic.</param>
[Authorize]
[Route("api/showdown")]
[ApiController]
[Produces(MediaTypeNames.Application.Json)]
[ProducesErrorResponseType(typeof(ApiValidationProblemDetails))]
[ProducesResponseType((int)HttpStatusCode.Unauthorized)]
internal sealed class BattleController(IBattleService battleService) : InternalControllerBase
{
    private readonly IBattleService _battleService = battleService;

    /// <summary>
    /// Whether battles can be played, and with what.
    /// </summary>
    /// <returns>The status.</returns>
    [HttpGet("status")]
    [ProducesResponseType<BattleStatusDTO>((int)HttpStatusCode.OK)]
    [SwaggerOperation(Summary = "BattleStatus", OperationId = "BattleStatus")]
    public async Task<ActionResult<BattleStatusDTO>> BattleStatusAsync()
    {
        var apiResponse = await _battleService.StatusAsync();
        return apiResponse.ToActionResult();
    }

    /// <summary>
    /// The signed-in trainer's recent battles.
    /// </summary>
    /// <returns>The battles.</returns>
    [HttpGet("battles")]
    [ProducesResponseType<List<BattleListItemDTO>>((int)HttpStatusCode.OK)]
    [SwaggerOperation(Summary = "BattleList", OperationId = "BattleList")]
    public async Task<ActionResult<List<BattleListItemDTO>>> BattleListAsync()
    {
        var apiResponse = await _battleService.ListRecentAsync(User.RequiredUserID());
        return apiResponse.ToActionResult();
    }

    /// <summary>
    /// A finished battle with its log, for the replay viewer.
    /// </summary>
    /// <param name="battleId">The battle identifier.</param>
    /// <returns>The replay.</returns>
    [HttpGet("battles/{battleId}")]
    [ProducesResponseType<BattleReplayDTO>((int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.NotFound)]
    [SwaggerOperation(Summary = "BattleReplay", OperationId = "BattleReplay")]
    public async Task<ActionResult<BattleReplayDTO>> BattleReplayAsync(string battleId)
    {
        var apiResponse = await _battleService.GetReplayAsync(battleId);
        return apiResponse.ToActionResult();
    }

    /// <summary>
    /// The signed-in trainer's wins and losses per format.
    /// </summary>
    /// <returns>One row per format played.</returns>
    [HttpGet("me/stats")]
    [ProducesResponseType<List<FormatRecordDTO>>((int)HttpStatusCode.OK)]
    [SwaggerOperation(Summary = "BattleFormatRecords", OperationId = "BattleFormatRecords")]
    public async Task<ActionResult<List<FormatRecordDTO>>> BattleFormatRecordsAsync()
    {
        var apiResponse = await _battleService.ListFormatRecordsAsync(User.RequiredUserID());
        return apiResponse.ToActionResult();
    }
}
