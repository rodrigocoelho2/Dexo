using LivingDex.WebApi.Features.Battles.Services;

namespace LivingDex.UnitTest.Battles;

public sealed class BestKnockoutsTests
{
    [Fact]
    public void FaintIsCreditedToTheLastOpposingAttacker()
    {
        string[] log =
        [
            "|move|p1a: Zekrom|Bolt Strike|p2a: Gyarados\n|-damage|p2a: Gyarados|0 fnt\n|faint|p2a: Gyarados\n|upkeep",
            "|turn|2\n|move|p1a: Zekrom|Bolt Strike|p2a: Pelipper\n|-damage|p2a: Pelipper|0 fnt\n|faint|p2a: Pelipper",
            "|turn|3\n|move|p2a: Garchomp|Earthquake|p1a: Zekrom\n|-damage|p1a: Zekrom|10/100\n|upkeep",
            // Residual damage keeps the last attacker's credit.
            "|turn|4\n|-damage|p1a: Zekrom|0 fnt|[from] Sandstorm\n|faint|p1a: Zekrom",
        ];

        var (p1, p2) = BattleManager.BestKnockouts(log);

        Assert.Equal(2, p1);
        Assert.Equal(1, p2);
    }

    [Fact]
    public void NoFaints_IsZero() => Assert.Equal((0, 0), BattleManager.BestKnockouts(["|turn|1\n|move|p1a: Pikachu|Growl|p2a: Eevee"]));
}
