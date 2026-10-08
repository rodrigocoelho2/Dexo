using System.Security.Claims;
using System.Text.Json;
using LivingDex.Auth;
using Microsoft.Extensions.Options;

namespace LivingDex.State;

public sealed record StateResponse(long Revision, string UpdatedAt, JsonElement Data);

public sealed record SaveStateRequest(long Revision, JsonElement Data, string? Client);

public sealed record HistoryItem(long Revision, string UpdatedAt, string? Client, int Caught);

public static class StateEndpoints
{
    public static RouteGroupBuilder MapStateEndpoints(this RouteGroupBuilder api)
    {
        var group = api.MapGroup("").RequireAuthorization();

        group.MapGet("/state", async (ClaimsPrincipal user, StateRepository repo, CancellationToken ct) =>
            Results.Ok(ToResponse(await repo.GetAsync(user.RequiredUserId(), ct))));

        group.MapPut("/state", async (SaveStateRequest body, ClaimsPrincipal user, StateRepository repo, IOptions<LivingDexOptions> options, CancellationToken ct) =>
        {
            if (body.Data.ValueKind != JsonValueKind.Object)
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["data"] = ["Must be a JSON object."] });

            var json = body.Data.GetRawText();
            if (json.Length > options.Value.MaxStateBytes)
                return Results.Problem($"Progress document is larger than {options.Value.MaxStateBytes} bytes.", statusCode: StatusCodes.Status413PayloadTooLarge);

            var result = await repo.SaveAsync(user.RequiredUserId(), body.Revision, json, body.Client, ct);
            return result.Outcome == SaveOutcome.Saved
                ? Results.Ok(ToResponse(result.Current))
                : Results.Conflict(ToResponse(result.Current));
        });

        group.MapGet("/history", async (ClaimsPrincipal user, StateRepository repo, int? take, CancellationToken ct) =>
        {
            var rows = await repo.GetHistoryAsync(user.RequiredUserId(), take ?? 30, ct);
            return Results.Ok(rows.Select(r => new HistoryItem(r.Revision, r.UpdatedAt, r.Client, CountCaught(r.Data))));
        });

        group.MapPost("/history/{revision:long}/restore", async (long revision, ClaimsPrincipal user, StateRepository repo, CancellationToken ct) =>
        {
            var userId = user.RequiredUserId();
            var entry = await repo.GetHistoryEntryAsync(userId, revision, ct);
            if (entry is null)
                return Results.NotFound();

            // Restoring writes the old document as a brand-new revision, so the restore itself can be undone.
            var current = await repo.GetAsync(userId, ct);
            var result = await repo.SaveAsync(userId, current.Revision, entry.Data, $"restore of r{revision}", ct);
            return result.Outcome == SaveOutcome.Saved
                ? Results.Ok(ToResponse(result.Current))
                : Results.Conflict(ToResponse(result.Current));
        });

        return api;
    }

    internal static StateResponse ToResponse(StateRow row)
    {
        using var doc = JsonDocument.Parse(row.Data);
        return new StateResponse(row.Revision, row.UpdatedAt, doc.RootElement.Clone());
    }

    /// <summary>Total marked entries across every game and variant (data.caught is { "game|variant": [keys...] }).</summary>
    internal static int CountCaught(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.ValueKind != JsonValueKind.Object ||
                !doc.RootElement.TryGetProperty("caught", out var caught) ||
                caught.ValueKind != JsonValueKind.Object)
                return 0;

            var total = 0;
            foreach (var slot in caught.EnumerateObject())
                if (slot.Value.ValueKind == JsonValueKind.Array)
                    total += slot.Value.GetArrayLength();
            return total;
        }
        catch (JsonException)
        {
            return 0;
        }
    }

    /// <summary>Number of marked entries in one "game|variant" list, e.g. "home|normal".</summary>
    internal static int CountSlot(string json, string slot)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.ValueKind == JsonValueKind.Object &&
                   doc.RootElement.TryGetProperty("caught", out var caught) &&
                   caught.ValueKind == JsonValueKind.Object &&
                   caught.TryGetProperty(slot, out var list) &&
                   list.ValueKind == JsonValueKind.Array
                ? list.GetArrayLength()
                : 0;
        }
        catch (JsonException)
        {
            return 0;
        }
    }
}
