# LivingDex.Assets

Sprites, cries and battle backgrounds shipped with the app, so a new server needs nothing from the internet.
The Dockerfile copies this folder to `/app/assets`; the app serves a file from here first, then from the
download cache (`/data/cache`), and only then fetches it once from upstream.

| Folder | Served at | Source |
|---|---|---|
| `sprites/` | `/assets/sprites/…` | [PokeAPI/sprites](https://github.com/PokeAPI/sprites) (`sprites/pokemon/`) |
| `cries/` | `/assets/cries/…` | [PokeAPI/cries](https://github.com/PokeAPI/cries) (`cries/pokemon/`) |
| `battlebg/fx/` | `/assets/battle/fx/…` | [Pokémon Showdown client](https://github.com/smogon/pokemon-showdown-client) (`play.pokemonshowdown.com/fx/`) |
| `music/` | `/assets/music/…` | play.pokemonshowdown.com/audio — empty here; copy the server's `/data/cache/music` in to ship it |

To refresh: run **Download all assets** as the admin, then copy the server's cache over this folder
(skipping the `*.missing` markers):

```bash
docker cp livingdex:/data/cache/. ./LivingDex.Assets/ && find LivingDex.Assets -name '*.missing' -delete
```

Pokémon sprites, cries and music are © Nintendo / Creatures / GAME FREAK; this is a personal, non-commercial fan project.
