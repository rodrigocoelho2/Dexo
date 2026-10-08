using System.Text.Json;
using System.Text.Json.Serialization;

namespace LivingDex.WebApi.Extensions.Json;

/// <summary>
/// The JSON settings shared by the controllers and the Showdown hub: camelCase names, enums as
/// camelCase strings ("win", "loss") and UTC timestamps.
/// </summary>
internal static class JsonSetup
{
    /// <summary>
    /// Applies the shared settings.
    /// </summary>
    /// <param name="options">The serializer options to change.</param>
    public static void Apply(JsonSerializerOptions options)
    {
        options.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
        options.Converters.Add(new UtcDateTimeJsonConverter());
    }
}
