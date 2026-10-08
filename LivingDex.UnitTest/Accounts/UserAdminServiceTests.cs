using LivingDex.Library.Services;
using LivingDex.WebApi.Extensions.Authentication;
using LivingDex.WebApi.Features.Accounts.Services;

namespace LivingDex.UnitTest.Accounts;

public sealed class UserAdminServiceTests
{
    private readonly FakeUserRepository _users = new();
    private readonly UserAdminService _service;

    public UserAdminServiceTests()
    {
        _service = new UserAdminService(_users, TestSupport.Globalization);
        _users.CreateAsync("Rodas", PasswordHasher.Hash("pikachu123"), "stamp-1", true).Wait();
        _users.CreateAsync("Ana", PasswordHasher.Hash("pikachu123"), "stamp-2", true).Wait();
        _users.Data[1] = """{"caught":{"home|normal":["1","2"],"sv|shiny":["3"]}}""";
    }

    [Fact]
    public async Task List_CountsMarkedEntriesAcrossGames()
    {
        var response = await _service.ListAsync();

        Assert.Equal(3, response.Result!.Single(user => user.Username == "Rodas").Caught);
        Assert.Equal(0, response.Result!.Single(user => user.Username == "Ana").Caught);
    }

    [Fact]
    public async Task ResetPassword_OwnAccountOrUnknown_IsRefused()
    {
        Assert.Equal(ServiceApiResponseStatus.ValidationProblems, (await _service.ResetPasswordAsync(1, 1)).Status);
        Assert.Equal(ServiceApiResponseStatus.NotFound, (await _service.ResetPasswordAsync(1, 99)).Status);
    }

    [Fact]
    public async Task ResetPassword_SetsATemporaryPasswordAndNewStamp()
    {
        var response = await _service.ResetPasswordAsync(1, 2);

        var ana = _users.Users.Single(user => user.UserID == 2);
        Assert.True(PasswordHasher.Verify(response.Result!.TemporaryPassword, ana.PasswordHash));
        Assert.NotEqual("stamp-2", ana.SecurityStamp);
    }

    [Fact]
    public async Task Delete_OwnAccountIsRefused_OthersAreDeleted()
    {
        Assert.Equal(ServiceApiResponseStatus.ValidationProblems, (await _service.DeleteAsync(1, 1)).Status);
        Assert.Equal(ServiceApiResponseStatus.Success, (await _service.DeleteAsync(1, 2)).Status);
        Assert.Equal(ServiceApiResponseStatus.NotFound, (await _service.DeleteAsync(1, 2)).Status);
    }
}
