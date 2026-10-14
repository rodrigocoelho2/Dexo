<p align="center">
  <img src="docs/images/banner.png" alt="Dexo — Catch them. Box them. Battle them." width="100%">
</p>

<p align="center">
  A self-hosted <b>Pokémon HOME living dex tracker</b> for every game from Red/Blue to Legends: Z-A, dressed as the Black 2 summary screen,<br>
  with <b>where to get</b> maps, <b>Showdown</b> battles against your friends and a <b>daily battle against Red</b>.
</p>

<p align="center">
  <img alt=".NET 10" src="https://img.shields.io/badge/.NET-10-512BD4?logo=dotnet&logoColor=white">
  <img alt="SQL Server" src="https://img.shields.io/badge/SQL%20Server-Dapper%20%2B%20stored%20procedures-CC2927?logo=microsoftsqlserver&logoColor=white">
  <img alt="Pokémon Showdown" src="https://img.shields.io/badge/Pok%C3%A9mon%20Showdown-battle%20simulator-e3363a">
  <img alt="PWA" src="https://img.shields.io/badge/PWA-installs%20on%20the%20phone-3355FF">
  <img alt="Docker" src="https://img.shields.io/badge/Docker-UGREEN%20NAS-2496ED?logo=docker&logoColor=white">
  <img alt="CI" src="https://github.com/rodrigocoelho2/home-living-dex/actions/workflows/ci.yml/badge.svg?branch=main">
</p>

<p align="center">
  <a href="#features">Features</a> ·
  <a href="#screenshots">Screenshots</a> ·
  <a href="#quick-start-docker">Quick start</a> ·
  <a href="#showdown-in-detail">Showdown</a> ·
  <a href="#daily-red-in-detail">Daily Red</a> ·
  <a href="#development">Development</a> ·
  <a href="#api">API</a>
</p>

<p align="center">
  <img src="docs/images/hero.png" alt="Dexo: the boxes on the computer and Daily Red on the phone" width="100%">
</p>

> Dexo used to be called HOME Living Dex. The code (projects, namespaces, containers, the `LivingDex` database and the volumes)
> keeps the old name, so updates never lose anything.

---

## Features

**Living dex tracker**

- All **1025** Pokémon in boxes of 30, with every form, gender difference, shiny and origin-mark variant, for **Pokémon HOME and every game from Red/Blue to Legends: Z-A** (plus the upcoming Gen X, marked *soon*).
- Click to inspect, double-click (or Space) to mark, arrow keys to move. Record the **OT game, ball and date** for each catch; the evolution line, where to get it and the details sit under the summary.
- **Overview** shows every Pokémon in colour; **Highlight missing** makes the gaps stand out; search by name or number from anywhere.
- **Accounts and sync** – everyone has their own dex, saved in SQL Server and synced across devices, with a 200-revision history you can restore.
- **Themes** – eight colours for the boxes and panels, sound effects and cries.
- **Dex badges** – 24 badges for filling your boxes: every region, 100/250/500/1025 caught, shinies, full Unown/Vivillon/Alcremie/Furfrou sets and a few specials, with a "Badge get!" moment on the phone.
- **Trainer profile** – on the PC, *View profile* in the account menu shows your card, the living dex by region, the dex badges, your battle record by generation and your latest catches.

**Where to get**

- Every game's **region map**, from Kanto to Galar with the Sevii Islands, the Isle of Armor and the Crown Tundra: the routes and areas where a Pokémon appears, with the method, rate, time of day, season and weather.

**Showdown arena**

- Random battles in **Gen 1 to Gen 5** against the other trainers on your server or the CPU, simulated by the real [Pokémon Showdown](https://github.com/smogon/pokemon-showdown) engine.
- **Draft mode** – a pool of 16 sets, snake picks, then pick your lead.
- **One look per generation** – Red/Blue on a white Game Boy screen, Silver, Ruby/Sapphire on the GBA fields, Diamond/Pearl, and the animated Black/White sprites, each with its own HP boxes, text and wording.
- **Battle music** from each generation, **930+ move animations**, weather, crits and super-effective shakes.
- Trainer cards with record, streak, **eight badges**, a partner Pokémon and **replays** of every battle. Spectators can watch live.

**Daily Red**

- **One team a day for everyone**: six fully evolved Gen 1–3 Pokémon at level 100 with Gen 3 sets, and **one official battle a day** against Red on Mt. Silver (Pikachu, Espeon, Snorlax, Venusaur, Charizard, Blastoise). Practice runs are unlimited.
- A FireRed/LeafGreen-style battle in **one big window** with the log beside it, a Red who plays by expected damage, a share grid, stats and streaks.

**Built to self-host**

- Three containers from one `docker-compose.yml`, made for a UGREEN NAS: **SQL Server 2022 Express**, a one-shot **database deploy** (tables and stored procedures from `LivingDex.Database`) and the **app** (ASP.NET Core + Node.js for the simulator).
- **Nothing to fetch at runtime**: about 16,000 sprites, cries and battle backgrounds ship in the repository (`LivingDex.Assets`) and the fonts are self-hosted. Anything missing is downloaded once and cached; the admin can **download all assets** in one go.
- **Phone layout** – an app-style design under 700 px (tab bar, swipeable boxes, sheets, full-screen battles); the desktop design is untouched.
- **Installs as an app** on iPhone and Android: home-screen icon, full screen, launch screen and an offline page.

## Screenshots

### Collect
<img src="docs/images/collect.png" alt="Phone: the boxes, a Pokémon's card with its evolutions, and the trainer card with the dex badges">

### Battle
<img src="docs/images/battle.png" alt="Phone: the Showdown lobby, Daily Red, a battle against Red and the switch list">

### One look per generation
<img src="docs/images/showdown-generations.png" alt="The same battle screen in Gen 1, 2, 3, 4 and 5 styles">

### Draft mode
<img src="docs/images/draft.png" alt="Draft: snake picks with the set on the top screen, then the team preview to choose a lead">

### On the computer
<table>
<tr>
<td width="50%"><b>Boxes</b><br><img src="docs/images/desktop-boxes.png" alt="Box 1 of the National Dex with Charizard selected"></td>
<td width="50%"><b>Showdown</b><br><img src="docs/images/desktop-showdown.png" alt="The Showdown lobby: your trainer card, the trainers on the server and the CPU"></td>
</tr>
<tr>
<td width="50%"><b>Daily Red</b><br><img src="docs/images/desktop-daily-red.png" alt="Daily Red: today's six, the lead, Red's team and your stats"></td>
<td width="50%"><b>Battle against Red</b><br><img src="docs/images/desktop-battle.png" alt="The battle window on Mt. Silver with the moves menu and the battle log"></td>
</tr>
</table>

<details id="design-mocks">
<summary>Design mocks</summary>

Every screen was designed as a clickable HTML mock before it was built. The sources are in [`docs/mocks`](docs/mocks) (open them in a browser; most are interactive).

<table>
<tr>
<td colspan="2"><b>Phone app</b> · <a href="docs/mocks/phone-app.html">phone-app.html</a><br><img src="docs/images/mock-phone-app.png" alt="Mock of the phone layout: sign in, boxes, Pokémon sheet, game list and Showdown lobby"></td>
</tr>
<tr>
<td colspan="2"><b>iPhone app</b> · <a href="docs/mocks/iphone-app.html">iphone-app.html</a><br><img src="docs/images/mock-iphone-app.png" alt="Mock of the installed web app: install card, home-screen icon, launch screen, full-screen app and offline page"></td>
</tr>
<tr>
<td width="50%"><b>A look per generation</b> · <a href="docs/mocks/showdown-generations.html">showdown-generations.html</a><br><img src="docs/images/mock-generations.png" alt="Mock of the Gen 1 Red/Blue battle style"></td>
<td width="50%"><b>Draft mode</b> · <a href="docs/mocks/showdown-draft.html">showdown-draft.html</a><br><img src="docs/images/mock-draft.png" alt="Mock of the draft pick screen"></td>
</tr>
<tr>
<td width="50%"><b>Black 2 battle menu</b> · <a href="docs/mocks/battle-menu.html">battle-menu.html</a><br><img src="docs/images/mock-battle-menu.png" alt="Mock of the Black 2 style touch menu"></td>
<td width="50%" valign="top"><b>How the mocks became the app</b><br><br>Mocks use sample data and are drawn at their own size, so they differ in small ways from the finished screens above (for example, the Gen 3 and Gen 4 HP boxes lost their EXP bar, and the lobby's Mode row sits under Format). The <a href="#screenshots">screenshots</a> show the real app.</td>
</tr>
<tr>
<td width="50%"><b>Showdown lobby</b> · <a href="docs/mocks/showdown.html">showdown.html</a><br><img src="docs/images/mock-showdown.png" alt="Mock of the Showdown header button, lobby with trainer cards, battle and result"></td>
<td width="50%"><b>Sign in</b> · <a href="docs/mocks/login.html">login.html</a><br><img src="docs/images/mock-login.png" alt="Mock of the sign in and create account screen"></td>
</tr>
<tr>
<td width="50%"><b>Filters and list view</b> · <a href="docs/mocks/filters.html">filters.html</a><br><img src="docs/images/mock-filters.png" alt="Mock of the filters panel and the list view"></td>
<td width="50%"><b>Inspector card</b> · <a href="docs/mocks/b2-card.html">b2-card.html</a><br><img src="docs/images/mock-b2-card.png" alt="Mock of the Black 2 style Pokémon inspector card"></td>
</tr>
<tr>
<td width="50%"><b>Compact header</b> · <a href="docs/mocks/compact-header.html">compact-header.html</a><br><img src="docs/images/mock-compact-header.png" alt="Mock of the compact game bar, toolbar and view options"></td>
<td width="50%"><b>Battle plates</b> · <a href="docs/mocks/battle-plates.html">battle-plates.html</a><br><img src="docs/images/mock-battle-plates.png" alt="Mock of the battle bottom screen with inspector-style plates"></td>
</tr>
<tr>
<td width="50%"><b>Battle effects, ranking and badges</b> · <a href="docs/mocks/battle-fx.html">battle-fx.html</a><br><img src="docs/images/mock-battle-fx.png" alt="Mock of the move animations, ranking, badges, MVP and battle log"></td>
<td width="50%"><b>Dex badges</b> · <a href="docs/mocks/dex-badges.html">dex-badges.html</a><br><img src="docs/images/mock-dex-badges.png" alt="Mock of the living dex badges on the trainer card and the phone"></td>
</tr>
<tr>
<td width="50%"><b>Trainer profile</b> · <a href="docs/mocks/profile.html">profile.html</a><br><img src="docs/images/mock-profile.png" alt="Mock of the trainer profile window"></td>
<td width="50%"><b>Where to get → map</b> · <a href="docs/mocks/where-to-get-map.html">where-to-get-map.html</a><br><img src="docs/images/mock-where-to-get-map.png" alt="Mock of the region map opened from the Catch in numbers"></td>
</tr>
<tr>
<td width="50%"><b>Hoenn map (RSE)</b> · <a href="docs/mocks/hoenn-map.html">hoenn-map.html</a><br><img src="docs/images/mock-hoenn-map.png" alt="Mock of the Hoenn map for Ruby, Sapphire and Emerald, drawn with the real map code and data"></td>
<td width="50%"><b>Sinnoh map (DPPt)</b> · <a href="docs/mocks/sinnoh-map.html">sinnoh-map.html</a><br><img src="docs/images/mock-sinnoh-map.png" alt="Mock of the Sinnoh map for Diamond, Pearl and Platinum, drawn with the real map code and data"></td>
</tr>
<tr>
<td width="50%"><b>Unova map (BW · B2W2)</b> · <a href="docs/mocks/unova-map.html">unova-map.html</a><br><img src="docs/images/mock-unova-map.png" alt="Mock of the Unova map for Black / White and Black 2 / White 2, drawn with the real map code and data"></td>
<td width="50%"><b>Kalos map (XY)</b> · <a href="docs/mocks/kalos-map.html">kalos-map.html</a><br><img src="docs/images/mock-kalos-map.png" alt="Mock of the Kalos map for X and Y, drawn with the real map code and data"></td>
</tr>
<tr>
<td width="50%"><b>Alola map (SM · USUM)</b> · <a href="docs/mocks/alola-map.html">alola-map.html</a><br><img src="docs/images/mock-alola-map.png" alt="Mock of the Alola map for Sun / Moon and Ultra Sun / Ultra Moon, drawn with the real map code and data"></td>
<td width="50%"><b>Galar maps (SwSh)</b> · <a href="docs/mocks/galar-map.html">galar-map.html</a><br><img src="docs/images/mock-galar-map.png" alt="Mock of the Galar, Isle of Armor and Crown Tundra maps for Sword and Shield, drawn with the real map code and data"></td>
</tr>
<tr>
<td colspan="2"><b>Daily Red</b> · <a href="docs/mocks/daily-red.html">daily-red.html</a><br><img src="docs/images/mock-daily-red.png" alt="Mock of Daily Red: the header button, the day's team, Red's team, the battle window with the log, the switch list and the result"></td>
</tr>
</table>

</details>

## Quick start (Docker)

```bash
git clone <this repo> livingdex && cd livingdex
cp .env.example .env          # then set SQL_SA_PASSWORD
docker compose up -d --build
# open http://<server>:8085
```

The app also joins `nas-net`, the NAS's shared Docker network (for the reverse proxy); create it once with `docker network create nas-net` if it doesn't exist.

`docker compose up` starts three things in order: **SQL Server** (`livingdex-sql`), the **database deploy** (`livingdex-db-deploy`, which creates the `LivingDex` database or brings its tables and stored procedures up to date, then exits) and the **app** (`livingdex`). Run the same command after every `git pull`.

Open the page and create the first account: it becomes the **admin**. Everyone else creates their own account, then you close sign-up.

Data lives in two volumes. Never run `docker compose down -v`, which deletes them.

| Volume | In the container | Holds |
|---|---|---|
| `livingdex-sql` | `/var/opt/mssql` | the SQL Server database (accounts, progress, history, trainer cards, battles) |
| `livingdex-data` | `/data` | `keys/` (the keys that sign login cookies), `cache/` (assets downloaded on demand) |

Settings go in the `.env` file next to `docker-compose.yml` (see [`.env.example`](.env.example)):

```
SQL_SA_PASSWORD=...                  # required; 8+ characters with upper, lower, digits or symbols (no ; or quotes)
LIVINGDEX_ALLOW_REGISTRATION=false   # after everyone has an account
LIVINGDEX_BEHIND_PROXY=true          # if a reverse proxy (nginx, Traefik…) is in front
LIVINGDEX_TURN_SECONDS=60            # time per battle turn
LIVINGDEX_SHOWDOWN=true              # false turns the battle room off
SQL_PORT=1433                        # where SQL Server listens on the NAS (for SSMS / Azure Data Studio)
SQL_MEMORY_LIMIT_MB=1024             # memory cap for SQL Server
```

With sign-up closed, the admin can still help people from **Manage users** (reset a forgotten password, delete an account).

**UGREEN NAS:** in the *Docker* app, create a *Project* from this folder (it picks up `docker-compose.yml` and `.env`). SQL Server needs an **Intel/AMD (x86-64) NAS** and about **2 GB of free memory**; the ARM models can't run it. If a reverse proxy sits in front (Nginx Proxy Manager, Traefik…), turn on WebSocket support for it so battles use WebSockets (they fall back to long polling otherwise), and set `LIVINGDEX_BEHIND_PROXY=true`. In Nginx Proxy Manager, that is **Websockets Support** on the proxy host.

If you bind-mount a host folder instead of the `livingdex-data` volume, make it writable by UID 1654 (the `app` user of the .NET images):

```bash
mkdir -p ./data && sudo chown 1654 ./data
```

### Upgrading from the SQLite version

Keep the same folder and the same `livingdex-data` volume, add `SQL_SA_PASSWORD` to `.env`, and run `docker compose up -d --build`. On its first start the app finds the old `/data/livingdex.db` and copies every account (with the same identifiers and passwords), progress document, history entry, trainer card and battle into SQL Server, then renames the file to `livingdex.db.imported` and keeps it as a backup. Everyone stays signed in. The import only runs while SQL Server has no accounts, so it can't happen twice.

## On a phone

Screens up to 700 px wide get a layout of their own (the PC one doesn't change): a tab bar at the bottom (Dex · Battle · Trainer · More), the game you track as one card (tap it for the game list), the variants as chips that scroll sideways, the box at full width (swipe to change boxes) and sheets that slide up for a Pokémon's details, the game list and the Pokédex. Battles go full screen, with the touch screen taking the rest of the height. Trainer shows your card, badges and battles with their replays; More has the theme, sound and music, your account, the admin tools and the backup. Add it to the home screen for an app icon.

### Install it as an app (iPhone and Android)

The page is a web app, so it can live on the home screen with its own icon and open full screen, without the browser bars:

- **iPhone:** open the site in Safari, tap **Share** (under **⋯** on newer iPhones) and choose **Add to Home Screen**. The first time you open the site on an iPhone, a small card explains this; close it and it doesn't come back.
- **Android:** Chrome offers **Install app** in its menu.

The app shows a launch screen while your boxes load, keeps you signed in like the browser does (60 days with "Keep me signed in"), and updates itself: a new version on the server shows up the next time you open it. When the server can't be reached it shows a "Can't reach your server" page that retries on its own.

That offline page needs a service worker, which browsers only allow over **HTTPS** (or on `localhost`). Over plain `http://<nas-ip>:8085` the app still installs and opens full screen; you just get the browser's own error page when the NAS is unreachable. To use it from outside your home, put it behind a reverse proxy with a certificate (and set `LIVINGDEX_BEHIND_PROXY=true`) or use a VPN such as Tailscale.

## Dex badges and the trainer profile

Dex badges are earned by filling your boxes, not by battling. They're worked out from your Pokémon HOME progress, so everything you've already marked counts the first time you open the app:

| Group | Badges | Counts |
|---|---|---|
| Regions | Kanto, Johto, Hoenn, Sinnoh, Unova, Kalos, Alola, Galar, Hisui, Paldea complete | HOME · Normal |
| Milestones | 100, 250, 500 caught, and the full Living Dex (1025) | HOME · Normal |
| Shiny | First shiny, 25 and 100 shinies | HOME · Shiny |
| Forms | All Unown (28), Vivillon (20), Alcremie (63), Furfrou (10) | HOME · Forms |
| Special | Gender Gap (both versions of every gender difference), Game Clear (any game's Pokédex at 100%), Back to the Roots (50 with an OT game from their own generation) | |

On the phone they sit under the battle badges in the **Trainer** tab; tap one for what it asks and how far you are, and marking the last Pokémon a badge needs shows a **Badge get!** card. On the PC, **View profile** in the account menu opens your profile: trainer card, battle record by generation with the last replay, the living dex by region, the dex badges (click one for its details) and your latest catches. Badges keep the date you first earned them, sync across devices, and stay if you later unmark something.

## Download all assets

Sprites, cries and battle backgrounds ship with the app in `LivingDex.Assets`, which `docker-compose.yml` mounts into the container read-only (they are not copied into the image, so builds stay fast), so a new server has them from the start. Anything not in that folder (battle music, new forms) is fetched the first time someone needs it and kept in `/data/cache`. To get everything in one go, open the account menu as the admin and choose **Download all assets**: the server downloads every sprite (box, animated, shiny, female, back, icons and the Gen 1–4 battle sprites), every cry, the battle effects and backgrounds and the battle music, about 16,000 files and a few hundred MB, in the background with a progress bar. You can close the page while it runs. Files already cached are skipped, so running it again later only fetches what is new.

## Showdown in detail

The crossed-swords button in the header opens the battle room. Each battle gives both players a random team of six (Pokémon Showdown's random battle sets) in the chosen generation, Gen 1 to Gen 5.

- **Lobby** – your trainer card (record, win streak, living dex count from Pokémon HOME · Normal, and a partner Pokémon you pick from your living dex), the other trainers with their status, and your recent battles.
- **Challenges** – challenge anyone who is online. They see a pop-up wherever they are in the app (and a yellow number on the battle button) and can accept or decline. Challenges expire after 90 seconds.
- **Battle** – the Black 2 style top screen with a random battlefield, and FIGHT / POKÉMON / INFO / FORFEIT below. You can switch mid-battle, and you choose who comes in when one faints. Each turn has a timer (60 s by default). When it runs out the game picks a move for you, and after three timeouts in a row you forfeit.
- **Reconnects** – closing the tab or losing the connection doesn't end the battle. Open the page again and you are back where you were.
- **Watching and replays** – anyone signed in can watch a battle in progress, and every finished battle can be replayed from the result screen or the recent-battles list.
- **CPU** – practice battles against a simple AI that picks strong moves and switches out of bad match-ups. They don't count for the win/loss record.
- **Battle effects** – every move plays its Pokémon Showdown animation (930+ moves, with Showdown's effect sprites), the screen flashes in the move's type colour, super-effective hits shake the screen, critical hits flash white, stat changes and status conditions have their own effects, and rain, sun, sandstorm and hail stay on screen while they last. A LOG button on the bottom screen lists every turn.
- **Draft mode** – in the lobby, under Format, pick the Mode: **Random** (six random Pokémon each) or **Draft**. In a draft, the server rolls a pool of 16 random-battle Pokémon of that generation with their sets (moves, ability, item, level). The two trainers pick in a snake (1 · 2 2 · 1 1 · …) until each has six, 30 seconds per pick (time out = a random pick). Tap a Pokémon on the bottom screen to see its set on the top screen. Then both choose their lead and the battle starts. Against the CPU it works too: the CPU takes the strongest set left. Spectators can watch the draft.
- **A look for each generation** – Gen 1 battles use the Pokémon Red/Blue sprites on a plain white Game Boy screen, Gen 2 the Silver sprites, Gen 3 Ruby/Sapphire on the GBA fields, Gen 4 Diamond/Pearl on the DS fields, and Gen 5 the animated Black/White sprites. The HP boxes, text box and wording ("Enemy GENGAR", "Foe GENGAR", "The foe's GENGAR") follow each era. Gen 1–2 keep the Game Boy effects (screen shake and blink) instead of the modern move animations. The bottom touch screen is the same in every generation.
- **Battle music** – each battle plays a track from its generation, picked at random and looped: the HGSS Kanto and Johto trainer themes for Gen 1 and 2, Ruby/Sapphire (ORAS), Colosseum and XD for Gen 3, Diamond/Pearl for Gen 4 and Black/White and B2W2 for Gen 5. The ♪ button on the bottom screen turns it off (remembered on that device).
- **Badges** – eight badges on the trainer card, earned in battles against other trainers: First Win, Ten Wins, On Fire (5 in a row), Last Stand (win with 1 Pokémon left), Sweeper (3 KOs with one Pokémon), Flawless (win without losing one), Veteran (50 battles) and Time Traveller (win in Gen 1 to Gen 5).

## Daily Red in detail

The snowy-mountain button next to the crossed swords (on the phone: **Battle › Daily Red**) opens Daily Red. It has a yellow dot until you've played today.

- **The day's team** – six fully evolved Gen 1–3 Pokémon, no Ubers and nothing too weak to stand a chance, with Pokémon Showdown's Gen 3 random-battle sets, all at level 100. The team comes from a generator seeded with the date, and the server stores it the first time a date is asked for, so everyone with the same date gets the same six. The day is **your own date**: the team changes at your midnight. Pick your lead before you battle.
- **Red** – always the same six, lead Pikachu (Light Ball), all level 100 with perfect IVs and held items (Charcoal, Mystic Water, Miracle Seed…), four attacks each; *Show Red's moves and items* on the page lists them. He knocks out what he can before it moves, switches away from a Pokémon that would be knocked out first when a teammate takes the hit much better, and otherwise uses the move with the most expected damage (a Gen 3 damage formula with the real stats, abilities, items and weather).
- **One official battle a day** – enforced by the server. If you close the page, the battle waits for you (on any device); one left alone for 6 hours is forfeited. A simulator restart gives the day back. **Practice runs** use the same team and don't count.
- **Matchups** – a table of how hard each of your Pokémon hits each of Red's, and back, with who is faster.
- **Result** – a share grid (one square per Pokémon, standing or fainted) to copy, and your stats: played, win %, win streak and day streak (both count consecutive days). Daily Red doesn't count for the Showdown record or battle badges.
- **The battle** – one window: the Mt. Silver field with the Ruby/Sapphire sprites and GBA HP boxes, the moves menu (arrow keys and Enter, or the mouse) with PP, type, power, accuracy and effectiveness beside it, POKéMON for the switch list and RUN to give up, and the battle log on the right (a tap-to-open row on the phone). Text speed NORMAL or FAST.

How it runs: `LivingDex.WebApi/Simulator/bridge.js` loads the `pokemon-showdown` npm package and hosts all battles in one Node.js process, which the app starts and supervises (it is restarted if it crashes; battles that were running end as "stopped"). The page talks to the server over SignalR (`/hubs/showdown`): WebSockets if your reverse proxy allows them, long polling otherwise. In Nginx Proxy Manager, tick **Websockets Support** on the proxy host.

Battle backgrounds and move-animation sprites come from the [Pokémon Showdown client](https://github.com/smogon/pokemon-showdown-client) repository and ship in `LivingDex.Assets` like the sprites.

## Development

### Solution layout

The solution (`LivingDex.slnx`) follows a feature-folder layout: every feature has its controllers, services, repositories, models (DTOs and entities) and `.http` request files side by side, and every database access goes through a stored procedure.

```
LivingDex.slnx
Directory.Build.props         shared settings (.NET 10, nullable, implicit usings)
Directory.Packages.props      central package versions
docker-compose.yml            SQL Server + database deploy + app
LivingDex.Library/            shared contracts: ServiceApiResponse, validation problems, TranslationKeys, enums
LivingDex.Database/           SQL Server database project (SDK-style .sqlproj → LivingDex.Database.dacpac)
  Tables/                     dbo.User, dbo.UserState, dbo.UserStateHistory, dbo.TrainerProfile, dbo.Battle
  StoredProcedures/           Users/, States/, Trainers/, Battles/ (one dbo.{Name}.sql per procedure)
  Scripts/                    post-deployment script, deploy.sh (sqlpackage publish)
  Dockerfile                  the db-deploy container
LivingDex.WebApi/             ASP.NET Core app
  Program.cs                  → LivingDexStartup.cs (service registration and pipeline)
  Extensions/
    Authentication/           cookie login, admin policy, rate limit, X-LivingDex header filter, password hashing
    Data/                     SQL connection factory, RepositoryBase (stored procedure calls), one-time SQLite import
    Globalization/            GlobalizationHelper: every user-facing message, by TranslationKeys
    Json/                     camelCase, enums as strings, UTC timestamps
    Mvc/                      InternalControllerBase + feature provider (controllers are internal)
    Services/                 ServiceApiResponse → HTTP result
  Features/
    Accounts/                 sign-up, sign-in, password, delete; Manage users (admin)
    States/                   progress documents, history and restore
    Trainers/                 trainer cards, partner, record and battle badges
    Battles/                  Showdown: SignalR hub, live battle state, simulator process, history and replays
    Assets/                   sprite/cry/background/music store and the "download all" job
    Health/                   /api/health
  Simulator/                  bridge.js + package.json for the Pokémon Showdown simulator (Node.js)
  wwwroot/                    the page:
    index.html, css/app.css   built by LivingDex.Client/build.py (do not edit by hand)
    js/                       app.js, sd.js, dexbadges.js, profile.js, where.js, mob.js, boot.js (edited here)
    data/                     pokedex.js and encounters.json (built by data-build/build_data.py)
                              fonts/, lib/, manifest.json, sw.js, offline.html, icons/, splash/
  Dockerfile                  the app container
LivingDex.UnitTest/           xunit: services with in-memory fakes, and API integration tests on SQL Server
LivingDex.Assets/             sprites/, cries/, battlebg/, music/ shipped with the app
LivingDex.Client/             what the page is built from
  src/                        body.html (the markup), css/*.css, icons.py (favicons)
  build.py                    writes wwwroot/index.html and wwwroot/css/app.css
  splash.py                   renders the iPhone launch images into wwwroot/splash
  psfx/                       move-animation sources + build.sh (esbuild bundle → wwwroot/lib)
  data-build/                 build_data.py + encounters.py: PokeAPI CSVs + Showdown data → wwwroot/data
docs/                         README images and the HTML design mocks
```

Conventions: services return `ServiceApiResponse<T>` (never HTTP codes), controllers call `ToActionResult()`, actions are named `{Feature}{Operation}Async` with a matching `SwaggerOperation`, classes are `internal sealed` with primary constructors, and repositories only call `[dbo].[...]` procedures.

### Run locally

```bash
docker compose up -d sqlserver db-deploy                          # SQL Server on localhost:1433 with the schema
(cd LivingDex.WebApi/Simulator && npm ci --omit=optional --ignore-scripts)   # battle simulator (Node.js 18+)
dotnet user-secrets set "ConnectionStrings:LivingDex" \
  "Server=localhost,1433;Database=LivingDex;User Id=sa;Password=<SQL_SA_PASSWORD>;TrustServerCertificate=True" \
  --project LivingDex.WebApi
dotnet run --project LivingDex.WebApi                             # http://localhost:5080, Swagger at /swagger
```

Requires the .NET 10 SDK. Without Node.js the tracker works as usual and the battle button stays hidden. Each feature has `.http` files under `Features/<Feature>/Http` for Visual Studio / Rider / VS Code.

### Tests

```bash
dotnet test LivingDex.UnitTest                                       # unit tests
LIVINGDEX_TEST_SQL="Server=localhost,1433;User Id=sa;Password=<SQL_SA_PASSWORD>;TrustServerCertificate=True" \
  dotnet test LivingDex.UnitTest                                     # + integration tests on SQL Server
```

The integration tests create a throw-away database per test from the scripts in `LivingDex.Database` and drop it afterwards. GitHub Actions runs everything on every push: build (including the dacpac), a publish of the dacpac to SQL Server, the tests, and a `docker compose up` of the whole stack with a smoke test and screenshots.

### Change the web client

The page is a small HTML shell that loads one stylesheet, the Pokédex data and the scripts. The scripts in `LivingDex.WebApi/wwwroot/js` are edited in place; the markup and the stylesheets live in `LivingDex.Client/src`. After changing anything, rebuild the shell:

```bash
python3 LivingDex.Client/build.py         # → wwwroot/index.html + wwwroot/css/app.css
```

`build.py` concatenates the stylesheets in a fixed order (base → tracker → Showdown → generations → draft → toolbar → profile → map → phone), recolours the blue hues into `hsl(var(--h) …)` so the theme picker can tint them, and links every file as `/file?v=<content hash>`. The server keeps those versioned files cached for good and never caches `index.html`, so a deploy shows up on the next load and nothing else is downloaded again. The scripts are plain scripts sharing one global scope, loaded in order (`app.js` first, `boot.js` last). The map encounters (`data/encounters.json`) are only fetched the first time a map opens. Everything for phones lives in `mob.css` (inside `@media (max-width:700px)`) and `mob.js`, so desktop changes and phone changes stay apart.

### Rebuild the Pokédex data

```bash
python3 LivingDex.Client/data-build/build_data.py   # → wwwroot/data/pokedex.js + encounters.json, then run build.py
```

It reads the [PokeAPI](https://github.com/PokeAPI/pokeapi) CSV exports in `LivingDex.Client/data-build/csv` and Pokémon Showdown's `formats-data`/`pokedex` files in `LivingDex.Client/data-build/sd` (which decide what exists in each game). Drop in newer copies of those files to update.

### Rebuild the iPhone launch images

```bash
python3 LivingDex.Client/splash.py           # needs Playwright + Chromium; → wwwroot/splash/*.png
```

They are screenshots of the phone loading screen at each iPhone size, so run it after changing that screen. The app icons are `wwwroot/apple-touch-icon.png` and `wwwroot/icons/`; `wwwroot/manifest.json`, `sw.js` and `offline.html` make up the rest of the web app.

### Rebuild the move animations

```bash
LivingDex.Client/psfx/build.sh               # needs Node.js; → wwwroot/lib/psanims.js and psfx.js
```

## Database

`LivingDex.Database` is an SDK-style SQL Server database project: open it in Visual Studio (SQL Server Data Tools), Azure Data Studio or VS Code (SQL Database Projects) to browse the tables and stored procedures. It builds to `LivingDex.Database.dacpac`, which the `db-deploy` container publishes with `sqlpackage` on every `docker compose up`, so a change to a table or procedure reaches the NAS with the next deploy (changes that would lose data are refused).

| Table | Holds |
|---|---|
| `dbo.User` | accounts: `UserID` (identity), `UserUniqueID` (GUID), username (unique, case-insensitive), password hash, admin flag, security stamp |
| `dbo.UserState` | each trainer's current progress document (JSON) and its revision |
| `dbo.UserStateHistory` | past revisions for restore (the newest 200 per trainer) |
| `dbo.TrainerProfile` | partner Pokémon and last time online in Showdown |
| `dbo.Battle` | finished battles: players, result, teams and the full log for replays |
| `dbo.DailyRedDay` | the Daily Red team of each date (stored once, never changes) |
| `dbo.DailyRedResult` | each trainer's official Daily Red battle per date: playing, won or lost, turns, Pokémon left and the share grid |

Stored procedures are named `{Entity}{Operation}` (`UserCreate`, `UserStateSave`, `TrainerProfileList`, `BattleListRecent`…); each sets `NOCOUNT`, its transaction isolation level and, for writes, `XACT_ABORT`. To look at the data, connect SSMS or Azure Data Studio to `<nas-ip>,1433` with user `sa` and the password from `.env`.

## Configuration

All settings are under `LivingDex` (env vars use `LivingDex__Name`):

| Setting | Default | Meaning |
|---|---|---|
| `ConnectionStrings:LivingDex` | – | SQL Server connection string (env `ConnectionStrings__LivingDex`; set by `docker-compose.yml`) |
| `DataDirectory` | `data` | Login keys, the asset download cache and (until imported) the old SQLite database |
| `AssetsDirectory` | `assets` | Bundled sprites, cries, backgrounds and music (`/app/assets` in the container, mounted from `LivingDex.Assets`) |
| `AllowRegistration` | `true` | Let people create their own account (the first account is always allowed) |
| `BehindProxy` | `false` | Trust `X-Forwarded-For` / `X-Forwarded-Proto` from a reverse proxy |
| `AuthAttemptsPerMinute` | `10` | Sign-in / sign-up / password attempts per minute from one address |
| `HistoryLimit` | `200` | Saved revisions kept for restore |
| `CacheAssets` | `true` | Download assets missing from the bundle once and cache them; `false` redirects to GitHub |
| `MaxStateBytes` | `8388608` | Largest accepted progress document |
| `ShowdownEnabled` | `true` | Turn the battle room on or off |
| `TurnSeconds` | `60` | Time per turn in battles (15–600) |
| `NodePath` | `node` | Node.js executable for the simulator |
| `SimDirectory` | `Simulator` | Folder with `bridge.js` and its `node_modules` |

## API

Every request that changes something must send the header `X-LivingDex: 1` (CSRF protection for the cookie login). Failed requests answer with `{ title, detail, status, errors: [{ field, message }] }`; `detail` is the message to show. In Development, Swagger is at `/swagger`.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | Always open. `{ status, firstRun, registration, showdown }` |
| POST | `/api/auth/register` | `{ username, password, remember? }` → signs in. 409 if taken, 403 if sign-up is closed |
| POST | `/api/auth/login` | `{ username, password, remember? }` → signs in (cookie `livingdex.auth`) |
| POST | `/api/auth/logout` | |
| GET | `/api/auth/me` | `{ id, username, isAdmin }` or 401 |
| POST | `/api/auth/password` | `{ currentPassword, newPassword }`. Signs out the account's other devices |
| POST | `/api/auth/delete-account` | `{ password }`. Deletes the account and its progress |
| GET | `/api/admin/users` | Admin only. Accounts with marked count and last sign-in |
| POST | `/api/admin/users/{id}/reset-password` | Admin only. Returns `{ temporaryPassword }` |
| DELETE | `/api/admin/users/{id}` | Admin only |
| GET | `/api/state` | Signed-in user's `{ revision, updatedAt, data }` (revision 0 and `data: null` when empty) |
| PUT | `/api/state` | Body `{ revision, data, client? }`. `revision` is the one you loaded; a stale one returns **409** with the current state |
| GET | `/api/history?take=30` | Recent revisions with a count of marked entries |
| POST | `/api/history/{revision}/restore` | Saves that revision again as the newest one |
| GET | `/api/showdown/status` | `{ available, problem, formats, backgrounds, turnSeconds }` |
| GET | `/api/showdown/trainers` | Every trainer card: record, streak, living dex count, partner, last seen |
| PUT | `/api/showdown/me/partner` | `{ partner, shiny }` (national dex number 1–1025) |
| GET | `/api/showdown/battles` | Your 12 most recent battles |
| GET | `/api/showdown/me/stats` | Your wins and losses per format against other trainers (for the profile) |
| GET | `/api/showdown/battles/{id}` | One battle with teams and the full log, for replays |
| GET | `/api/dailyred?date=yyyy-MM-dd` | Daily Red for your date: team, Red, matchups, your battle of the day, stats and trainers today |
| WS | `/hubs/showdown` | SignalR hub: presence, challenges, battle messages and choices (`DailyRedStart` starts a Daily Red battle) |
| GET | `/assets/sprites/{path}` · `/assets/cries/{path}` | PokeAPI files (`.png`, `.gif`, `.ogg` only): bundled, then cached, then downloaded once |
| GET | `/assets/battle/fx/{file}` | Battle backgrounds and move-effect sprites |
| GET | `/assets/music/{file}.mp3` | Battle music |
| POST | `/api/admin/assets/download` | Admin: download a list of assets into the cache in the background |
| GET | `/api/admin/assets/status` | Admin: progress of that download |
| POST | `/api/admin/assets/cancel` | Admin: stop it |

### How accounts are protected

- Passwords are stored as PBKDF2-HMAC-SHA512 hashes (210,000 iterations, random salt), never in plain text.
- The login cookie is HttpOnly and SameSite=Lax; it lasts 60 days when "Keep me signed in" is ticked, and is renewed while you use the app.
- Changing or resetting a password signs that account out on every other device.
- Sign-in attempts are rate-limited per address, and a wrong username answers exactly like a wrong password.
- If the app is reachable from the internet, put it behind HTTPS (a reverse proxy with a certificate) and set `LIVINGDEX_BEHIND_PROXY=true`.

### How sync behaves

- The page saves to the browser right away and uploads about a second later.
- It checks the server when the tab becomes visible again and once a minute while open.
- If two devices save at the same time, the server rejects the older one (409). The page then merges both sides: marks from either device are kept, and for capture details the most recently edited version wins. It uploads the result.
- One trade-off of that merge: if you *unmark* something on one device while another device has unsynced changes, the unmark can come back. Fix it once and it stays fixed.
- The browser keeps a copy of the signed-in user's progress for speed. When a different person signs in on the same browser, that copy is cleared first, so two people's boxes are never mixed.

## Credits

Pokédex data: [PokeAPI](https://github.com/PokeAPI/pokeapi). Form availability and the battle simulator: [Pokémon Showdown](https://github.com/smogon/pokemon-showdown) (MIT). Battle backgrounds and move animations: [Pokémon Showdown client](https://github.com/smogon/pokemon-showdown-client). Battle music is fetched once from play.pokemonshowdown.com/audio and cached on the server (copy `/data/cache/music` into `LivingDex.Assets/music` to ship it too). Sprites and cries: [PokeAPI/sprites](https://github.com/PokeAPI/sprites) and [PokeAPI/cries](https://github.com/PokeAPI/cries), copied into `LivingDex.Assets`. Fonts: DotGothic16, Silkscreen and Press Start 2P (SIL Open Font License 1.1), self-hosted in `wwwroot/fonts` from the [Fontsource](https://fontsource.org) packages.

`wwwroot/lib/psanims.js` bundles Showdown's move animations: the animation engine pieces are MIT, the per-move animations and most effect images are CC0. Of the effect images, `icicle.png` and `lightning.png` (Clint Bellanger) are GPLv2/GPLv3/CC-BY-SA-3.0 and `rocks.png`/`rock1.png`/`rock2.png` (PO user "Gilad") are GPLv3. `wwwroot/lib/psfx.js` is the small adapter that runs them on this app's battle screen; jQuery (MIT) drives the animation queues.

Pokémon and all related names, images, music and designs are © Nintendo / Creatures / GAME FREAK. This is a personal, non-commercial fan project, not affiliated with or endorsed by them.

<br>
<p align="center">
  <img src="docs/images/dexo-box.png" alt="A box of the living dex: eight slots filled and the last one under the cursor" width="120">
</p>
<p align="center"><sub><i>Thirty-five boxes, 1025 slots. There is always one more to fill.</i></sub></p>
