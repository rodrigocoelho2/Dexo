using System.Net;
using System.Net.Mime;
using LivingDex.Library.Validation;
using LivingDex.WebApi.Extensions.Authentication;
using LivingDex.WebApi.Extensions.Mvc;
using LivingDex.WebApi.Extensions.Services;
using LivingDex.WebApi.Features.Trainers.Models.DTOs;
using LivingDex.WebApi.Features.Trainers.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;

namespace LivingDex.WebApi.Features.Trainers.Controllers;

/// <summary>
/// Trainer cards of the Showdown room and the PC profile.
/// </summary>
/// <param name="logger">Logger.</param>
/// <param name="trainerService">Trainer business logic.</param>
[Authorize]
[Route("api/showdown")]
[ApiController]
[Produces(MediaTypeNames.Application.Json)]
[ProducesErrorResponseType(typeof(ApiValidationProblemDetails))]
[ProducesResponseType((int)HttpStatusCode.BadRequest)]
[ProducesResponseType((int)HttpStatusCode.Unauthorized)]
internal sealed class TrainerController(
    ILogger<TrainerController> logger,
    ITrainerService trainerService) : InternalControllerBase
{
    private readonly ILogger<TrainerController> _logger = logger;
    private readonly ITrainerService _trainerService = trainerService;

    /// <summary>
    /// Lists every trainer card.
    /// </summary>
    /// <returns>The cards.</returns>
    [HttpGet("trainers")]
    [ProducesResponseType<List<TrainerCardDTO>>((int)HttpStatusCode.OK)]
    [SwaggerOperation(Summary = "TrainerList", OperationId = "TrainerList")]
    public async Task<ActionResult<List<TrainerCardDTO>>> TrainerListAsync()
    {
        var apiResponse = await _trainerService.ListAsync();
        return apiResponse.ToActionResult();
    }

    /// <summary>
    /// Gets one trainer card.
    /// </summary>
    /// <param name="userId">The trainer.</param>
    /// <returns>The card.</returns>
    [HttpGet("trainers/{userId:long}")]
    [ProducesResponseType<TrainerCardDTO>((int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.NotFound)]
    [SwaggerOperation(Summary = "TrainerGet", OperationId = "TrainerGet")]
    public async Task<ActionResult<TrainerCardDTO>> TrainerGetAsync(long userId)
    {
        var apiResponse = await _trainerService.GetAsync(userId);
        return apiResponse.ToActionResult();
    }

    /// <summary>
    /// Sets the signed-in trainer's partner Pokémon.
    /// </summary>
    /// <param name="request">The partner.</param>
    /// <returns>No content.</returns>
    [HttpPut("me/partner")]
    [Consumes(MediaTypeNames.Application.Json)]
    [ProducesResponseType((int)HttpStatusCode.NoContent)]
    [SwaggerOperation(Summary = "TrainerSetPartner", OperationId = "TrainerSetPartner")]
    public async Task<ActionResult<string>> TrainerSetPartnerAsync([FromBody] PartnerDTO request)
    {
        if (_logger.IsEnabled(LogLevel.Information))
            _logger.LogInformation("TrainerSetPartner {UserID} #{Partner}", User.UserID(), request.Partner);

        var apiResponse = await _trainerService.SetPartnerAsync(User.RequiredUserID(), request);
        return apiResponse.ToActionResult();
    }
}
