using LivingDex.WebApi.Extensions.Authentication;

namespace LivingDex.UnitTest.Accounts;

public sealed class PasswordHasherTests
{
    [Fact]
    public void Hash_VerifiesOnlyTheSamePassword()
    {
        var hash = PasswordHasher.Hash("pikachu123");

        Assert.StartsWith("pbkdf2-sha512$", hash);
        Assert.True(PasswordHasher.Verify("pikachu123", hash));
        Assert.False(PasswordHasher.Verify("Pikachu123", hash));
    }

    [Fact]
    public void Hash_UsesANewSaltEveryTime() =>
        Assert.NotEqual(PasswordHasher.Hash("pikachu123"), PasswordHasher.Hash("pikachu123"));

    [Theory]
    [InlineData("")]
    [InlineData("plain")]
    [InlineData("pbkdf2-sha512$x$abc$def")]
    [InlineData("pbkdf2-sha512$1000$not-base64!$def")]
    public void Verify_MalformedHash_IsFalse(string stored) => Assert.False(PasswordHasher.Verify("pikachu123", stored));

    [Fact]
    public void GenerateTemporary_IsReadable()
    {
        var password = PasswordHasher.GenerateTemporary();

        Assert.Equal(12, password.Length);
        Assert.DoesNotContain(password, character => "0O1lI".Contains(character));
    }
}
