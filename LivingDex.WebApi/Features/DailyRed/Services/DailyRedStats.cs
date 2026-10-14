using LivingDex.WebApi.Features.DailyRed.Models.DTOs;
using LivingDex.WebApi.Features.DailyRed.Models.Entities;

namespace LivingDex.WebApi.Features.DailyRed.Services;

/// <summary>
/// Works out a trainer's Daily Red stats from their official battles.
/// </summary>
internal static class DailyRedStats
{
    /// <summary>
    /// Played, wins, win % and streaks. Streaks count consecutive days: a day without a finished battle ends them,
    /// except today while it hasn't been played yet.
    /// </summary>
    /// <param name="rows">The trainer's official battles.</param>
    /// <param name="today">The trainer's today.</param>
    /// <returns>The stats.</returns>
    public static DailyRedStatsDTO Compute(IEnumerable<DailyRedResult> rows, DateTime today)
    {
        today = today.Date;
        var done = rows.Where(static r => r.DayKey is not null && r.Status is DailyRedResult.Won or DailyRedResult.Lost)
            .Select(static r => (Day: r.DayKey!.Value.Date, Won: r.Status == DailyRedResult.Won))
            .Where(r => r.Day <= today)
            .DistinctBy(static r => r.Day)
            .OrderBy(static r => r.Day)
            .ToList();

        int best = 0, run = 0;
        DateTime? previous = null;
        foreach (var (day, won) in done)
        {
            run = !won ? 0 : previous is { } p && (day - p).Days == 1 && run > 0 ? run + 1 : 1;
            best = Math.Max(best, run);
            previous = day;
        }

        var last = done.Count > 0 ? done[^1].Day : (DateTime?)null;
        var current = last is { } l && (today - l).Days <= 1 ? run : 0;

        var days = done.Select(static r => r.Day).ToHashSet();
        var dayStreak = 0;
        for (var d = days.Contains(today) ? today : today.AddDays(-1); days.Contains(d); d = d.AddDays(-1))
        {
            dayStreak++;
        }

        var wins = done.Count(static r => r.Won);
        return new DailyRedStatsDTO
        {
            Played = done.Count,
            Wins = wins,
            WinPct = done.Count == 0 ? 0 : (int)Math.Round(100.0 * wins / done.Count),
            Streak = current,
            BestStreak = best,
            DayStreak = dayStreak,
        };
    }
}
