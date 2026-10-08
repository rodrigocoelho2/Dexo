namespace LivingDex.Library.Enums;

/// <summary>
/// The kinds of file the asset store serves. The name is also the folder under the assets and cache folders.
/// </summary>
public enum AssetKind
{
    /// <summary>Pokémon sprites (PokeAPI/sprites).</summary>
    Sprites,

    /// <summary>Pokémon cries (PokeAPI/cries).</summary>
    Cries,

    /// <summary>Battle backgrounds and move-effect images (Pokémon Showdown client).</summary>
    BattleBg,

    /// <summary>Battle music tracks.</summary>
    Music,
}
