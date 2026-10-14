using LivingDex.WebApi.Features.DailyRed.Models.Entities;
using LivingDex.WebApi.Features.DailyRed.Services;

namespace LivingDex.UnitTest.DailyRed;

public sealed class DailyRedStatsTests
{
    private static readonly DateTime Today = new(2026, 10, 20);

    private static DailyRedResult Day(int daysAgo, byte status) => new()
    {
        UserID = 1,
        DayKey = Today.AddDays(-daysAgo),
        BattleID = "b" + daysAgo,
        Status = status,
    };

    [Fact]
    public void NoBattles_AllZero()
    {
        var stats = DailyRedStats.Compute([], Today);

        Assert.Equal((0, 0, 0, 0, 0, 0), (stats.Played, stats.Wins, stats.WinPct, stats.Streak, stats.BestStreak, stats.DayStreak));
    }

    [Fact]
    public void WinsOnConsecutiveDays_MakeTheStreak_AndALossEndsIt()
    {
        var stats = DailyRedStats.Compute(
        [
            Day(6, DailyRedResult.Won), Day(5, DailyRedResult.Won), Day(4, DailyRedResult.Won), Day(3, DailyRedResult.Lost),
            Day(2, DailyRedResult.Won), Day(1, DailyRedResult.Won),
        ], Today);

        Assert.Equal(6, stats.Played);
        Assert.Equal(5, stats.Wins);
        Assert.Equal(83, stats.WinPct);
        Assert.Equal(2, stats.Streak);       // yesterday and the day before; today isn't played yet
        Assert.Equal(3, stats.BestStreak);
        Assert.Equal(6, stats.DayStreak);
    }

    [Fact]
    public void AMissedDay_EndsBothStreaks()
    {
        var stats = DailyRedStats.Compute([Day(4, DailyRedResult.Won), Day(3, DailyRedResult.Won), Day(1, DailyRedResult.Won), Day(0, DailyRedResult.Won)], Today);

        Assert.Equal(2, stats.Streak);
        Assert.Equal(2, stats.BestStreak);
        Assert.Equal(2, stats.DayStreak);
    }

    [Fact]
    public void LastPlayedTwoDaysAgo_NoCurrentStreak()
    {
        var stats = DailyRedStats.Compute([Day(3, DailyRedResult.Won), Day(2, DailyRedResult.Won)], Today);

        Assert.Equal(0, stats.Streak);
        Assert.Equal(2, stats.BestStreak);
        Assert.Equal(0, stats.DayStreak);
    }

    [Fact]
    public void BattlesStillPlaying_DoNotCount()
    {
        var stats = DailyRedStats.Compute([Day(1, DailyRedResult.Won), Day(0, DailyRedResult.Playing)], Today);

        Assert.Equal(1, stats.Played);
        Assert.Equal(1, stats.Streak);
        Assert.Equal(1, stats.DayStreak);
    }

    [Theory]
    [InlineData("2026-10-20", true)]
    [InlineData("2026-10-19", true)]
    [InlineData("2026-10-21", true)]
    [InlineData("2026-10-22", false)]
    [InlineData("2026-10-18", false)]
    [InlineData("20/10/2026", false)]
    [InlineData(null, false)]
    public void TheDate_MustBeSomebodysToday(string? date, bool ok)
    {
        Assert.Equal(ok, DailyRedService.TryParseDay(date, new DateTime(2026, 10, 20, 12, 0, 0, DateTimeKind.Utc), out _));
    }

    [Fact]
    public void DailyRedNumbers_StartAtOne()
    {
        Assert.Equal(1, DailyRedService.NumberOf(new DateTime(2026, 10, 14)));
        Assert.Equal(7, DailyRedService.NumberOf(new DateTime(2026, 10, 20)));
        Assert.Equal(1, DailyRedService.NumberOf(new DateTime(2026, 10, 13)));
    }
}
