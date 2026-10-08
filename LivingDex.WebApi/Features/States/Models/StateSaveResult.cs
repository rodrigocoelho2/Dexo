using LivingDex.WebApi.Features.States.Models.Entities;

namespace LivingDex.WebApi.Features.States.Models;

/// <summary>
/// The result of saving progress.
/// </summary>
/// <param name="Saved">False when another device saved first (the revision did not match).</param>
/// <param name="Current">The progress now stored.</param>
public sealed record StateSaveResult(bool Saved, UserState Current);
