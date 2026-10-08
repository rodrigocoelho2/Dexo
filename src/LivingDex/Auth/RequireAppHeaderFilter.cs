namespace LivingDex.Auth;

/// <summary>
/// CSRF guard for the cookie-authenticated API: every request that changes something must carry
/// the X-LivingDex header. Another website can't add a custom header to a cross-site request
/// without a CORS preflight, which this app never allows.
/// </summary>
public sealed class RequireAppHeaderFilter : IEndpointFilter
{
    public const string HeaderName = "X-LivingDex";

    public ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var request = context.HttpContext.Request;
        if (HttpMethods.IsGet(request.Method) || HttpMethods.IsHead(request.Method) || request.Headers.ContainsKey(HeaderName))
            return next(context);

        return ValueTask.FromResult<object?>(
            Results.Problem($"Missing the {HeaderName} header.", statusCode: StatusCodes.Status400BadRequest));
    }
}
