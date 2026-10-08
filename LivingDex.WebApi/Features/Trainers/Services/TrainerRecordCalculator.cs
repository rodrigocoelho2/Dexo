using LivingDex.WebApi.Features.Trainers.Models;
using LivingDex.WebApi.Features.Trainers.Models.Entities;

namespace LivingDex.WebApi.Features.Trainers.Services;

/// <summary>
/// Works out a trainer's record, streak and battle badges from their decided battles.
/// </summary>
internal static class TrainerRecordCalculator
{
    private static readonly string[] Generations = ["gen1", "gen2", "gen3", "gen4", "gen5"];

    /// <summary>
    /// Calculates the record.
    /// </summary>
    /// <param name="userId">The trainer.</param>
    /// <param name="battles">The trainer's decided battles, oldest first.</param>
    /// <returns>The record.</returns>
    public static TrainerRecord Calculate(long userId, IEnumerable<TrainerBattle> battles)
    {
        int wins = 0, losses = 0, streak = 0, best = 0, cpuWins = 0, cpuLosses = 0, played = 0;
        bool lastStand = false, flawless = false, sweeper = false;
        var generationWins = new HashSet<string>(StringComparer.Ordinal);

        foreach (var battle in battles)
        {
            var mine = battle.P1UserID == userId ? 1 : 2;
            var won = battle.Winner == mine;
            if (battle.IsCpu)
            {
                if (won)
                {
                    cpuWins++;
                }
                else
                {
                    cpuLosses++;
                }

                continue;
            }

            played++;
            if ((mine == 1 ? battle.P1BestKo : battle.P2BestKo) >= 3)
            {
                sweeper = true;
            }

            if (!won)
            {
                losses++;
                streak = 0;
                continue;
            }

            wins++;
            streak++;
            best = Math.Max(best, streak);
            var left = mine == 1 ? battle.P1Left : battle.P2Left;
            if (left == 1)
            {
                lastStand = true;
            }

            if (left >= 6)
            {
                flawless = true;
            }

            generationWins.Add(battle.Format.Length > 4 ? battle.Format[..4] : battle.Format);
        }

        var badges = new List<string>();
        if (wins >= 1) badges.Add(TrainerBadges.FirstWin);
        if (wins >= 10) badges.Add(TrainerBadges.TenWins);
        if (best >= 5) badges.Add(TrainerBadges.OnFire);
        if (lastStand) badges.Add(TrainerBadges.LastStand);
        if (sweeper) badges.Add(TrainerBadges.Sweeper);
        if (flawless) badges.Add(TrainerBadges.Flawless);
        if (played >= 50) badges.Add(TrainerBadges.Veteran);
        if (Generations.All(generationWins.Contains)) badges.Add(TrainerBadges.TimeTraveller);

        return new TrainerRecord(wins, losses, streak, cpuWins, cpuLosses, played, [.. badges]);
    }
}
