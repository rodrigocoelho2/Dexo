using System.Net;
using System.Net.Mime;
using LivingDex.Library.Validation;
using LivingDex.WebApi.Extensions.Authentication;
using LivingDex.WebApi.Extensions.Mvc;
using LivingDex.WebApi.Extensions.Services;
using LivingDex.WebApi.Features.DailyRed.Models.DTOs;
using LivingDex.WebApi.Features.DailyRed.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;

namespace LivingDex.WebApi.Features.DailyRed.Controllers;

/// <summary>
/// Daily Red: the day's team, Red, the trainer's battle of the day and stats. Battles start through the Showdown hub (DailyRedStart).
/// </summary>
/// <param name="dailyRedService">Daily Red business logic.</param>
[Authorize]
[Route("api/dailyred")]
[ApiController]
[Produces(MediaTypeNames.Application.Json)]
[ProducesErrorResponseType(typeof(ApiValidationProblemDetails))]
[ProducesResponseType((int)HttpStatusCode.Unauthorized)]
internal sealed class DailyRedController(IDailyRedService dailyRedService) : InternalControllerBase
{
    private readonly IDailyRedService _dailyRedService = dailyRedService;

    /// <summary>
    /// The Daily Red page for the trainer's today.
    /// </summary>
    /// <param name="date">The trainer's today on their device, yyyy-MM-dd.</param>
    /// <returns>The day.</returns>
    [HttpGet]
    [ProducesResponseType<DailyRedDTO>((int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.BadRequest)]
    [SwaggerOperation(Summary = "DailyRedGet", OperationId = "DailyRedGet")]
    public async Task<ActionResult<DailyRedDTO>> DailyRedGetAsync([FromQuery] string? date)
    {
        var apiResponse = await _dailyRedService.GetAsync(User.RequiredUserID(), date);
        return apiResponse.ToActionResult();
    }
}
