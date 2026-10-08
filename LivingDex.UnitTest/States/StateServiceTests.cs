using System.Text.Json;
using LivingDex.Library.Services;
using LivingDex.WebApi.Features.States.Models.DTOs;
using LivingDex.WebApi.Features.States.Services;

namespace LivingDex.UnitTest.States;

public sealed class StateServiceTests
{
    private readonly FakeStateRepository _states = new();

    private StateService Service(int historyLimit = 200, int maxStateBytes = 8 * 1024 * 1024) =>
        new(_states, TestSupport.Globalization, TestSupport.Options(options =>
        {
            options.HistoryLimit = historyLimit;
            options.MaxStateBytes = maxStateBytes;
        }));

    private static StateSaveDTO Save(long revision, string json, string? client = null) =>
        new() { Revision = revision, Data = JsonDocument.Parse(json).RootElement.Clone(), Client = client };

    private static string Progress(int caught) =>
        JsonSerializer.Serialize(new { caught = new Dictionary<string, string[]> { ["home|normal"] = Enumerable.Range(1, caught).Select(i => $"s:{i}").ToArray() } });

    [Fact]
    public async Task Get_BeforeTheFirstSave_IsRevisionZeroAndNull()
    {
        var response = await Service().GetAsync(1);

        Assert.Equal(0, response.Result!.Revision);
        Assert.Null(response.Result.UpdatedAt);
        Assert.Equal(JsonValueKind.Null, response.Result.Data.ValueKind);
    }

    [Theory]
    [InlineData("[1,2,3]")]
    [InlineData("\"text\"")]
    [InlineData("null")]
    public async Task Save_NotAnObject_IsAValidationProblem(string json)
    {
        var response = await Service().SaveAsync(1, Save(0, json));

        Assert.Equal(ServiceApiResponseStatus.ValidationProblems, response.Status);
        Assert.Equal("data", response.Problems!.Errors[0].Field);
    }

    [Fact]
    public async Task Save_TooLarge_IsPayloadTooLarge()
    {
        var response = await Service(maxStateBytes: 10).SaveAsync(1, Save(0, Progress(5)));

        Assert.Equal(ServiceApiResponseStatus.PayloadTooLarge, response.Status);
    }

    [Fact]
    public async Task Save_StaleRevision_IsAConflictWithTheCurrentState()
    {
        await Service().SaveAsync(1, Save(0, Progress(1)));

        var stale = await Service().SaveAsync(1, Save(0, Progress(2)));

        Assert.Equal(ServiceApiResponseStatus.Conflict, stale.Status);
        Assert.Null(stale.Problems);
        Assert.Equal(1, stale.Result!.Revision);
    }

    [Fact]
    public async Task Save_EachUserHasTheirOwnRevisions()
    {
        await Service().SaveAsync(1, Save(0, Progress(1)));

        var other = await Service().SaveAsync(2, Save(0, Progress(3)));

        Assert.Equal(ServiceApiResponseStatus.Success, other.Status);
        Assert.Equal(1, other.Result!.Revision);
    }

    [Fact]
    public async Task History_KeepsTheLimit_AndRestoreSavesANewRevision()
    {
        for (var revision = 0; revision < 5; revision++)
        {
            await Service(historyLimit: 3).SaveAsync(1, Save(revision, Progress(revision + 1), "iPhone"));
        }

        var history = await Service(historyLimit: 3).ListHistoryAsync(1, null);
        Assert.Equal([5L, 4L, 3L], history.Result!.Select(entry => entry.Revision));
        Assert.Equal(3, history.Result![2].Caught);

        var restored = await Service(historyLimit: 3).RestoreAsync(1, 3);
        Assert.Equal(6, restored.Result!.Revision);
        Assert.Equal(3, restored.Result.Data.GetProperty("caught").GetProperty("home|normal").GetArrayLength());
        Assert.Equal("restore of r3", (await Service().ListHistoryAsync(1, 1)).Result![0].Client);

        Assert.Equal(ServiceApiResponseStatus.NotFound, (await Service().RestoreAsync(1, 1)).Status);
    }

    [Fact]
    public async Task Save_LongClientName_IsCut()
    {
        await Service().SaveAsync(1, Save(0, Progress(1), new string('x', 200)));

        Assert.Equal(80, (await Service().ListHistoryAsync(1, 1)).Result![0].Client!.Length);
    }
}
