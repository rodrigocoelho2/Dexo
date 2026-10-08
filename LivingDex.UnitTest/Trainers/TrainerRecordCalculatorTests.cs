using LivingDex.WebApi.Features.Trainers.Models;
using LivingDex.WebApi.Features.Trainers.Models.Entities;
using LivingDex.WebApi.Features.Trainers.Services;

namespace LivingDex.UnitTest.Trainers;

public sealed class TrainerRecordCalculatorTests
{
    private const long Me = 1;
    private const long Ana = 2;

    private static TrainerBattle Win(string format = "gen5randombattle", int left = 3, int bestKo = 1, bool asP2 = false, bool cpu = false) => new()
    {
        Format = format,
        P1UserID = asP2 ? Ana : Me,
        P2UserID = cpu ? null : asP2 ? Me : Ana,
        IsCpu = cpu,
        Winner = asP2 ? 2 : 1,
        P1Left = asP2 ? 0 : left,
        P2Left = asP2 ? left : 0,
        P1BestKo = asP2 ? 0 : bestKo,
        P2BestKo = asP2 ? bestKo : 0,
    };

    private static TrainerBattle Loss(bool cpu = false) => new()
    {
        Format = "gen5randombattle",
        P1UserID = Me,
        P2UserID = cpu ? null : Ana,
        IsCpu = cpu,
        Winner = 2,
        P2Left = 2,
    };

    [Fact]
    public void NoBattles_NoBadges()
    {
        var record = TrainerRecordCalculator.Calculate(Me, []);

        Assert.Equal((0, 0, 0, 0, 0, 0), (record.Wins, record.Losses, record.Streak, record.CpuWins, record.CpuLosses, record.Played));
        Assert.Empty(record.Badges);
    }

    [Fact]
    public void CpuBattles_CountSeparately_AndEarnNothing()
    {
        var record = TrainerRecordCalculator.Calculate(Me, [Win(cpu: true), Win(cpu: true, left: 6, bestKo: 4), Loss(cpu: true)]);

        Assert.Equal(2, record.CpuWins);
        Assert.Equal(1, record.CpuLosses);
        Assert.Equal(0, record.Played);
        Assert.Empty(record.Badges);
    }

    [Fact]
    public void Streak_ResetsOnALoss_OnFireNeedsFiveInARow()
    {
        var record = TrainerRecordCalculator.Calculate(Me, [Win(), Win(), Win(), Win(), Win(asP2: true), Loss(), Win()]);

        Assert.Equal(6, record.Wins);
        Assert.Equal(1, record.Losses);
        Assert.Equal(1, record.Streak);
        Assert.Equal(7, record.Played);
        Assert.Contains(TrainerBadges.FirstWin, record.Badges);
        Assert.Contains(TrainerBadges.OnFire, record.Badges);
        Assert.DoesNotContain(TrainerBadges.TenWins, record.Badges);
    }

    [Fact]
    public void LastStandFlawlessAndSweeper()
    {
        var record = TrainerRecordCalculator.Calculate(Me, [Win(left: 1), Win(left: 6, asP2: true), Win(bestKo: 3)]);

        Assert.Contains(TrainerBadges.LastStand, record.Badges);
        Assert.Contains(TrainerBadges.Flawless, record.Badges);
        Assert.Contains(TrainerBadges.Sweeper, record.Badges);
    }

    [Fact]
    public void TimeTraveller_NeedsAWinInEveryGeneration()
    {
        var four = Enumerable.Range(1, 4).Select(gen => Win($"gen{gen}randombattle")).ToList();
        Assert.DoesNotContain(TrainerBadges.TimeTraveller, TrainerRecordCalculator.Calculate(Me, four).Badges);

        four.Add(Win("gen5draft"));
        Assert.Contains(TrainerBadges.TimeTraveller, TrainerRecordCalculator.Calculate(Me, four).Badges);
    }

    [Fact]
    public void VeteranAndTenWins()
    {
        var battles = Enumerable.Range(0, 40).Select(_ => Loss()).Concat(Enumerable.Range(0, 10).Select(_ => Win())).ToList();

        var record = TrainerRecordCalculator.Calculate(Me, battles);

        Assert.Contains(TrainerBadges.Veteran, record.Badges);
        Assert.Contains(TrainerBadges.TenWins, record.Badges);
    }
}
