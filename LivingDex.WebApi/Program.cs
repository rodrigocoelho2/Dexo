using LivingDex.WebApi;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddLivingDex(builder.Configuration, builder.Environment);

var app = builder.Build();
await app.UseLivingDexAsync();
await app.RunAsync();

/// <summary>
/// The entry point; public so the integration tests can host the app with WebApplicationFactory.
/// </summary>
public partial class Program
{
}
