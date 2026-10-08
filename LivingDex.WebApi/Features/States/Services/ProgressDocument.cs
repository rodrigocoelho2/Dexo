using System.Text.Json;

namespace LivingDex.WebApi.Features.States.Services;

/// <summary>
/// Reads numbers out of a progress document (data.caught is { "game|variant": [keys…] }).
/// </summary>
internal static class ProgressDocument
{
    /// <summary>
    /// Counts the marked entries across every game and variant.
    /// </summary>
    /// <param name="json">The progress document.</param>
    /// <returns>The total, or 0 for anything that isn't a progress document.</returns>
    public static int CountCaught(string json)
    {
        try
        {
            using var document = JsonDocument.Parse(json);
            if (document.RootElement.ValueKind != JsonValueKind.Object ||
                !document.RootElement.TryGetProperty("caught", out var caught) ||
                caught.ValueKind != JsonValueKind.Object)
            {
                return 0;
            }

            var total = 0;
            foreach (var slot in caught.EnumerateObject())
            {
                if (slot.Value.ValueKind == JsonValueKind.Array)
                {
                    total += slot.Value.GetArrayLength();
                }
            }

            return total;
        }
        catch (JsonException)
        {
            return 0;
        }
    }
}
