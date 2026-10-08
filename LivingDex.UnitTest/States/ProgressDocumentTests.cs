using LivingDex.WebApi.Features.States.Services;

namespace LivingDex.UnitTest.States;

public sealed class ProgressDocumentTests
{
    [Theory]
    [InlineData("""{"caught":{"home|normal":["1","2"],"sv|shiny":["3"],"x":"not a list"}}""", 3)]
    [InlineData("""{"caught":[]}""", 0)]
    [InlineData("""{"det":{}}""", 0)]
    [InlineData("[]", 0)]
    [InlineData("not json", 0)]
    public void CountCaught_AddsEveryList(string json, int expected) => Assert.Equal(expected, ProgressDocument.CountCaught(json));
}
