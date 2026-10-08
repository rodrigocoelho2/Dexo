using LivingDex.Library.Services;
using LivingDex.WebApi.Features.Health.Models.DTOs;

namespace LivingDex.WebApi.Features.Health.Services;

/// <summary>
/// Business logic for the health check.
/// </summary>
internal interface IHealthService
{
    /// <summary>
    /// Gets the server status.
    /// </summary>
    /// <returns>The status.</returns>
    Task<ServiceApiResponse<HealthDTO>> GetAsync();
}
