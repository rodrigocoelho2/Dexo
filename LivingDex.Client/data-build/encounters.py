"""Where each Pokémon is found in the games that have a map (Where to get → map).
Reads PokeAPI's encounter CSVs and returns a compact table (wwwroot/data/encounters.json):
  {"L": [[location id, name], ...], "A": [area labels], "N": [notes], "M": [methods],
   "g": {game: {species: [[loc, area, method, min lv, max lv, rate %, times, versions, note], ...]}}}
times: 1 morning, 2 day, 4 night (7 = any time). versions: one bit per version of the game, in GAMES order.
rate 0 = unknown (Let's Go overworld spawns)."""
import csv, re
from collections import defaultdict

# app game → PokeAPI versions (bit order = the order shown in the app)
GAMES = {"rby": [("1", "R"), ("45", "G"), ("2", "B"), ("3", "Y")],          # 45 = Japanese Green
         "gsc": [("4", "G"), ("5", "S"), ("6", "C")],
         "rse": [("7", "R"), ("8", "S"), ("9", "E")],
         "frlg": [("10", "FR"), ("11", "LG")],
         "dppt": [("12", "D"), ("13", "P"), ("14", "Pt")],
         "bw": [("17", "B"), ("18", "W")],
         "hgss": [("15", "HG"), ("16", "SS")],
         "b2w2": [("21", "B2"), ("22", "W2")],
         "swsh": [("33", "Sw"), ("34", "Sh")],
         "xy": [("23", "X"), ("24", "Y")],
         "sm": [("27", "S"), ("28", "M")],
         "usum": [("29", "US"), ("30", "UM")],
         "lgpe": [("31", "P"), ("32", "E")]}
METHOD = {"walk": "grass", "surf": "surf", "old-rod": "old-rod", "good-rod": "good-rod", "super-rod": "super-rod",
          "headbutt": "headbutt", "headbutt-low": "headbutt", "headbutt-normal": "headbutt", "headbutt-high": "headbutt",
          "rock-smash": "rock-smash", "gift": "gift", "gift-egg": "egg", "npc-trade": "trade", "static": "static",
          "roaming-grass": "roaming", "pokeflute": "special", "squirt-bottle": "special", "pokemon-ranger": "special",
          # Let's Go: Pokémon walk around in the overworld (PokeAPI gives every spawn the same weight, so no rate)
          "overworld": "wild", "overworld-water": "water", "overworld-flying": "flying",
          # Ruby / Sapphire / Emerald
          "seaweed": "dive", "devon-scope": "static", "wailmer-pail": "static", "feebas-tile-fishing": "any-rod",
          "roaming-water": "roaming",
          # Diamond / Pearl / Platinum
          "honey-tree": "honey",
          # Black / White and Black 2 / White 2
          "dark-grass": "dark-grass", "grass-spots": "phenomenon", "cave-spots": "phenomenon", "surf-spots": "phenomenon",
          "super-rod-spots": "phenomenon", "bridge-spots": "phenomenon", "hidden-grotto": "grotto",
          # X / Y
          "horde": "horde", "yellow-flowers": "flowers", "red-flowers": "flowers", "purple-flowers": "flowers",
          "rough-terrain": "rough", "berry-trees": "berry", "ceiling-ambush": "ambush", "trash-can-ambush": "ambush",
          "rustling-bush-ambush": "ambush", "ground-ambush": "ambush", "sky-ambush": "ambush",
          # Sun / Moon and Ultra Sun / Ultra Moon
          "sos": "sos", "sos-from-bubbling-spot": "sos", "bubbling-spots": "bubbles", "island-scan": "scan",
          # Sword / Shield (+ Isle of Armor, Crown Tundra)
          "overworld-dirt": "dirt", "wanderer": "wanderer", "wanderer-water": "wanderer", "chase-water": "water",
          "max-raid": "raid", "dynamax-adventure": "adventure",
          # event distributions (handed out at a Pokémon Center)
          "colosseum-bonus-disc-jpn": "event", "colosseum-bonus-disc-us": "event", "pokemon-channel-pal": "event",
          "overworld-special": "rare", "overworld-flying-special": "rare-flying", "overworld-water-special": "rare"}
# The Sword / Shield expansions are their own PokeAPI versions: count them as Sword or Shield
VERSION_ALIAS = {"35": "33", "36": "33", "50": "34", "51": "34"}
# a note that comes from how the Pokémon is found, not from a condition
METHOD_NOTE = {"devon-scope": "Invisible: needs the Devon Scope", "wailmer-pail": "Water it with the Wailmer Pail",
               "feebas-tile-fishing": "Only on 6 random water tiles",
               "pokemon-ranger": "Egg sent from Pokémon Ranger",
               "grass-spots": "Rustling grass", "cave-spots": "Dust cloud", "surf-spots": "Rippling water (surf)",
               "super-rod-spots": "Rippling water (Super Rod)", "bridge-spots": "Shadow on the bridge",
               "yellow-flowers": "Yellow flowers", "red-flowers": "Red flowers", "purple-flowers": "Purple flowers",
               "ceiling-ambush": "Drops from the ceiling", "trash-can-ambush": "Hides in trash cans",
               "rustling-bush-ambush": "Jumps out of rustling bushes", "ground-ambush": "Pops out of the ground",
               "sky-ambush": "Swoops down from the sky", "sos-from-bubbling-spot": "Called from a bubbling spot",
               "wanderer-water": "On the water", "chase-water": "Chases you on the water",
               "colosseum-bonus-disc-jpn": "Pokémon Colosseum bonus disc (Japan)",
               "colosseum-bonus-disc-us": "Pokémon Colosseum bonus disc (US)", "pokemon-channel-pal": "Pokémon Channel (Europe)"}
NO_RATE = {"wild", "water", "flying", "rare", "rare-flying", "dirt", "wanderer", "raid", "adventure"}
# PokeAPI files Black / White's roaming Tornadus and Thundurus under a Kalos location
FIX_LOC = {("bw", "team-flare-secret-hq"): ("roaming-unova", "Roaming Unova", "roaming"),
           ("xy", "roaming-kalos"): ("roaming-kalos", "Roaming Kalos", "roaming"),
           ("swsh", "roaming-galar-wild-area"): ("roaming-galar-wild-area", "Roaming the Wild Area", "roaming"),
           ("swsh", "roaming-isle-of-armor"): ("roaming-isle-of-armor", "Roaming the Isle of Armor", "roaming"),
           ("swsh", "roaming-crown-tundra"): ("roaming-crown-tundra", "Roaming the Crown Tundra", "roaming")}   # X / Y's roaming bird is filed as a one-time encounter
SKIP_LOC = {"unknown-all-bugs", "unknown-all-poliwag", "unknown-all-rattata"}   # PokeAPI placeholder areas
TIME = {"time-morning": 1, "time-day": 2, "time-night": 4}
SEASON = {"season-spring": 1, "season-summer": 2, "season-autumn": 4, "season-winter": 8}
WEATHER = {"weather-normal": 1, "weather-overcast": 2, "weather-raining": 4, "weather-thunderstorm": 8, "weather-intense-sun": 16,
           "weather-snowing": 32, "weather-snowstorm": 64, "weather-sandstorm": 128, "weather-fog": 256}
WEATHER_NAME = ["Clear", "Overcast", "Rain", "Thunderstorm", "Intense sun", "Snow", "Snowstorm", "Sandstorm", "Fog"]
RAID_RARITY = {"max-den-rarity-common": 1, "max-den-rarity-rare": 2, "max-den-rarity-special": 4}


def weather_note(mask, seen):
    """Sword / Shield: which weathers it shows up in, when not in all the weathers its area has."""
    if not mask or mask & seen == seen: return ""
    have = [n for i, n in enumerate(WEATHER_NAME) if mask >> i & 1]
    miss = [n for i, n in enumerate(WEATHER_NAME) if seen >> i & 1 and not mask >> i & 1]
    return ("Not in " + ", ".join(miss)) if len(miss) <= 2 and len(have) > len(miss) else ", ".join(have) + " only"


def raid_note(stars, rarity):
    lo = min(i for i in range(5) if stars >> i & 1) + 1; hi = max(i for i in range(5) if stars >> i & 1) + 1
    s = f"\u2605{lo}" if lo == hi else f"\u2605{lo}\u2013{hi}"
    return s + (" · rare dens" if rarity == 2 else " · special dens" if rarity == 4 else "")


def season_note(mask):
    if mask in (0, 15): return ""
    if mask == 7: return "Not in winter"
    return ", ".join(n for b, n in ((1, "Spring"), (2, "Summer"), (4, "Autumn"), (8, "Winter")) if mask & b) + " only"
IGNORE = {"swarm-no", "radio-off", "bug-catching-contest-no", "johto-safari-blocks-inactive", "headbutt-tree-common",
          "radar-off", "slot2-none", "honey-tree-group-a", "honey-tree-group-b", "great-marsh-daily-slot-none", "backlot-not-mentioned"}
SLOT2 = {"ruby": "Ruby", "sapphire": "Sapphire", "emerald": "Emerald", "firered": "FireRed", "leafgreen": "LeafGreen"}
STORY = {"national-dex": "After the National Dex", "before-national-dex": "Before the National Dex", "beat-red": "After beating Red",
         "awakened-beasts": "After the legendary beasts awaken", "zephyr-badge": "After the Zephyr Badge",
         "returned-machine-part": "After returning the Machine Part", "vermilion-copycat": "After helping Copycat",
         "receive-tm-from-claire": "After Clair's TM",
         "beat-elite-four-round-two": "After the Elite Four rematch", "hall-of-fame": "After the Hall of Fame",
         "oak-eterna-city": "After meeting Oak in Eterna City", "beat-galactic-coronet": "After Team Galactic at Mt. Coronet",
         "cure-eldritch-nightmares": "After the Canalave nightmare", "beat-team-galactic-iron-island": "After Team Galactic on Iron Island",
         "defeat-mars": "After defeating Mars", "defeat-jupiter": "After defeating Jupiter",
         "juniper-cave-of-being": "After meeting Juniper at the Cave of Being", "quake-badge": "After the Quake Badge",
         "finished-looker-sidequest": "After Looker's Ultra Beast missions", "beat-olivias-trial": "After Olivia's grand trial",
         "master-dojo-complete-first-trial": "After the first Master Dojo trial",
         "master-dojo-complete-third-trial": "After the third Master Dojo trial",
         "save-village-from-glastrier-spectrier": "After saving Freezington", "catch-five-ultra-beasts": "After catching five Ultra Beasts"}
OTHER = {"correct-password": "With the correct password", "received-kanto-starter": "After receiving a Kanto starter",
         "event-arceus-in-party": "With an event Arceus in the party", "snorlax-11-beat-league": "After the League",
         "virtual-console": "Virtual Console only",
         "regirock-regice-registeel-in-party": "With Regirock, Regice and Registeel in the party",
         "talked-to-32-people-underground": "After talking to 32 people in the Underground",
         "talk-to-cynthias-grandmother": "After talking to Cynthia's grandmother",
         "giratina-not-caught-in-distortion-world": "If Giratina got away in the Distortion World",
         "captured-reshiram-or-zekrom": "After catching Reshiram or Zekrom",
         "found-11-times-roaming": "After meeting it 11 times while it roams",
         "captured-all-ultra-beasts": "After catching every Ultra Beast", "scan-qr-code": "After scanning a QR code",
         "witness-galarian-bird-fight": "After seeing the Galarian birds fight", "talked-to-32-people": "After talking to 32 people",
         "eat-curry-with-cobalion-terrakion-virizion": "After eating curry with Cobalion, Terrakion and Virizion"}
FIRST = {"first-party-pokemon-high-friendship": "Lead Pokémon must be very friendly"}
FOSSIL = {"helix": "Helix", "dome": "Dome", "old-amber": "Old Amber", "root": "Root", "claw": "Claw", "skull": "Skull", "armor": "Armor"}


def note_of(cond):
    """A short note for one non-default encounter condition, or None."""
    if cond in IGNORE or cond in TIME or cond in SEASON or cond in WEATHER or cond.startswith("max-den-") \
            or cond == "story-progress-before-hall-of-fame":
        return None
    if cond in FIRST: return FIRST[cond]
    if cond == "defeated-ghetsis": return "After defeating Ghetsis"
    m = re.match(r"other-(.+)-in-party$", cond)
    if m and cond[6:] not in OTHER:
        names = [x.capitalize() for x in m.group(1).split("-")]
        return "With " + (", ".join(names[:-1]) + " and " + names[-1] if len(names) > 1 else names[0]) + " in the party"
    m = re.match(r"alolan-diglett-found-(\d+)", cond)
    if m: return f"After finding {m.group(1)} Alolan Diglett"
    m = re.match(r"other-find-50-(.+)-footprints", cond)
    if m: return f"After finding 50 {m.group(1).replace('-', ' ')} footprints"
    m = re.match(r"other-choose-(\w+)-pattern", cond)
    if m: return f"Choose the {m.group(1).capitalize()} pattern"
    m = re.match(r"other-grow-(\w+)-carrot", cond)
    if m: return f"After growing a {m.group(1).capitalize()} Carrot"
    m = re.match(r"save-data-from-(.+)", cond)
    if m: return "With " + m.group(1).replace("lets-go-", "Let's Go ").replace("-", " ").title().replace("Let'S", "Let's") + " save data"
    if cond == "item-reins-of-unity": return "With the Reins of Unity"
    m = re.match(r"friend-safari-slot-(\d)", cond)
    if m: return f"Friend Safari: slot {m.group(1)}" + (" (friend has beaten the League)" if m.group(1) == "3" else "")
    m = re.match(r"berry-tree-type-(\w+)", cond)
    if m: return f"{m.group(1).capitalize()} berry trees"
    m = re.match(r"trash-can-type-(\w+)", cond)
    if m: return "Trash cans: " + ("any day" if m.group(1) == "daily" else m.group(1).capitalize() + "s")
    if cond == "special-encounter-couldnt-capture-before": return "If you didn't catch it the first time"
    m = re.match(r"item-(.+-(key|wing|stone))$", cond)
    if m: return "With the " + m.group(1).replace("-", " ").title()
    if cond == "radar-on": return "Poké Radar"
    if cond == "honey-tree-group-c": return "Munchlax trees only"
    if cond == "backlot-mentioned": return "When Mr. Backlot mentions it (daily)"
    if cond.startswith("great-marsh-daily-slot-"): return "Daily species (look through the binoculars)"
    if cond in ("item-adamant-orb", "item-lustrous-orb"): return "With the " + cond[5:].replace("-", " ").title()
    m = re.match(r"slot2-(\w+)", cond)
    if m: return f"With {SLOT2.get(m.group(1), m.group(1))} in the GBA slot"
    if cond == "swarm-yes": return "Swarm"
    m = re.match(r"tv-option-(\w+)", cond)
    if m: return f"Tell Mom the Pokémon on TV was {m.group(1)}"
    m = re.match(r"starter-(\w+)", cond)
    if m: return f"If you chose {m.group(1).capitalize()}"
    m = re.match(r"other-caught-(\w+)", cond)
    if m: return f"After catching {m.group(1).capitalize()}"
    if cond == "radio-hoenn": return "Hoenn Sound on the radio"
    if cond == "radio-sinnoh": return "Sinnoh Sound on the radio"
    if cond == "bug-catching-contest-yes": return "Bug-Catching Contest"
    if cond == "headbutt-tree-rare": return "Rare trees"
    if cond == "headbutt-tree-secret": return "Secret trees"
    m = re.match(r"weekday-(\w+)", cond)
    if m: return m.group(1).capitalize() + "s only"
    m = re.match(r"johto-safari-blocks-(\w+)-min-(\d+)", cond)
    if m: return f"Safari: {m.group(1)} objects {m.group(2)}+ days"
    m = re.match(r"story-progress-(.+)", cond)
    if m: return STORY.get(m.group(1), m.group(1).replace("-", " ").capitalize())
    m = re.match(r"other-(.+)", cond)
    if m: return OTHER.get(m.group(1), m.group(1).replace("-", " ").capitalize())
    m = re.match(r"trade-(.+)", cond)
    if m: return "For your " + ("any Pokémon" if m.group(1) == "any-pokemon" else m.group(1).capitalize())
    m = re.match(r"coins-(\d+)", cond)
    if m: return f"{int(m.group(1)):,} coins"
    m = re.match(r"item-(.+?)(-fossil)?$", cond)
    if m: return "From the " + FOSSIL.get(m.group(1), m.group(1).replace("-", " ").title()) + (" Fossil" if m.group(2) else "")
    return cond.replace("-", " ").capitalize()


STORY_AREAS = {"before Galactic intervention", "after Galactic intervention"}   # Lake Verity / Valor: same encounters


def area_label(prose, loc_name, ident):
    if not ident or ident == "area":
        return ""
    m = re.search(r"\(([^)]*)\)", prose or "")
    label = m.group(1) if m else (prose or "").replace(loc_name, "").strip(" -") or ident.replace("-", " ").upper()
    # Lake Verity's story halves and the Great Marsh's six areas share one list
    return "" if label in STORY_AREAS or label == "MAIN" or re.fullmatch(r"(unknown )?area \d+|max den \w+", label, re.I) else label


def build(rows, species_of_pokemon):
    """rows(name) -> list of dicts for a PokeAPI CSV; species_of_pokemon: pokemon id -> species id."""
    slots = {r["id"]: r for r in rows("encounter_slots")}
    methods = {r["id"]: r["identifier"] for r in rows("encounter_methods")}
    areas = {r["id"]: r for r in rows("location_areas")}
    locs = {r["id"]: r["identifier"] for r in rows("locations")}
    loc_name = {r["location_id"]: r["name"] for r in rows("location_names") if r["local_language_id"] == "9"}
    area_prose = {r["location_area_id"]: r["name"] for r in rows("location_area_prose") if r["local_language_id"] == "9"}
    cond_value = {r["id"]: r["identifier"] for r in rows("encounter_condition_values")}
    version_game = {v: (g, i) for g, vs in GAMES.items() for i, (v, _) in enumerate(vs)}
    version_game.update({a: version_game[v] for a, v in VERSION_ALIAS.items()})

    wanted = [r for r in rows("encounters") if r["version_id"] in version_game]
    ids = {r["id"] for r in wanted}
    conds = defaultdict(list)
    for r in rows("encounter_condition_value_map"):
        if r["encounter_id"] in ids:
            conds[r["encounter_id"]].append(cond_value[r["encounter_condition_value_id"]])

    L, Li, A, Ai, N, Ni = [], {}, [""], {"": 0}, [""], {"": 0}
    def idx(table, index, key, value=None):
        if key not in index:
            index[key] = len(table); table.append(value if value is not None else key)
        return index[key]

    groups, recs = {}, []
    for r in wanted:
        area = areas[r["location_area_id"]]; lid = area["location_id"]; ident = locs[lid]
        if ident in SKIP_LOC:
            continue
        raw = methods[slots[r["encounter_slot_id"]]["encounter_method_id"]]
        meth = METHOD.get(raw)
        if meth is None:
            continue
        game, vbit = version_game[r["version_id"]]
        sid = species_of_pokemon[int(r["pokemon_id"])]
        if (game, ident) in FIX_LOC:
            ident, name, meth = FIX_LOC[(game, ident)]
        else:
            name = loc_name.get(lid) or {"johto-pokemart": "Poké Mart", "roaming-johto": "Roaming Johto",
                                     "roaming-kanto": "Roaming Kanto", "roaming-hoenn": "Roaming Hoenn",
                                     "kanto-pokecenter": "Pokémon Center", "hoenn-pokecenter": "Pokémon Center",
                                     "sinnoh-pokemart": "Poké Mart", "roaming-sinnoh": "Roaming Sinnoh",
                                     "roaming-kalos": "Roaming Kalos", "kalos-berry-fields": "Berry Fields"}.get(ident, ident)
        li = idx(L, Li, ident, [ident, name])
        ai = idx(A, Ai, area_label(area_prose.get(area["id"], ""), name, area["identifier"]))
        cs = conds.get(r["id"], [])
        tmask = sum(TIME[c] for c in cs if c in TIME) or 7
        smask = sum(SEASON[c] for c in cs if c in SEASON) or 15
        wmask = sum(WEATHER[c] for c in cs if c in WEATHER)
        notes = {n for n in (note_of(c) for c in cs) if n} | ({METHOD_NOTE[raw]} if raw in METHOD_NOTE else set())
        raid = None
        if meth == "raid":   # a den's stars and rarity become one note; the badge count before / after the League doesn't matter here
            notes.discard("After the Hall of Fame")
            stars = sum(1 << (int(re.search(r"(\d)", c).group(1)) - 1) for c in cs if c.startswith("max-den-rating-"))
            raid = (stars or 31, sum(RAID_RARITY.get(c, 0) for c in cs) or 1)
        recs.append((game, sid, li, ai, meth, notes, vbit, tmask, (raw, area["id"], smask, wmask), int(r["min_level"]), int(r["max_level"]),
                     int(slots[r["encounter_slot_id"]]["rarity"]), raid))
    area_weather = defaultdict(int)          # the weathers each area has (Sword / Shield)
    for rec in recs:
        area_weather[rec[8][1]] |= rec[8][3]

    # PokeAPI splits a roamer into grass and water tables with different conditions: a version's notes apply to both
    roam = defaultdict(set)
    for game, sid, li, ai, meth, notes, vbit, *_ in recs:
        if meth == "roaming":
            roam[(game, sid, li, vbit)] |= notes
    # the GBA-slot and Poké Radar tables repeat most of the normal ones: only keep a Pokémon there when they add it
    # (Sword / Shield: the after-the-League tables mostly repeat the earlier ones at higher levels)
    def extra(n, game): return n.startswith("With ") and n.endswith("GBA slot") or n == "Poké Radar" or (game == "swsh" and n == "After the Hall of Fame")
    have = {(game, sid, li, ai, meth, frozenset(roam[(game, sid, li, vbit)] if meth == "roaming" else notes))
            for game, sid, li, ai, meth, notes, vbit, *_ in recs}
    for game, sid, li, ai, meth, notes, vbit, tmask, raw, lo, hi, rarity, raid in recs:
        if meth == "roaming":
            notes = roam[(game, sid, li, vbit)]
        base = frozenset(n for n in notes if not extra(n, game))
        if base != notes and (game, sid, li, ai, meth, base) in have:
            continue
        ni = idx(N, Ni, " · ".join(sorted(notes)))
        g = groups.setdefault((game, sid, li, ai, meth, ni), {"min": 99, "max": 0, "rate": defaultdict(int), "ver": 0, "seas": 0,
                                                            "wea": 0, "wseen": 0, "stars": 0, "rar": 0})
        g["seas"] |= raw[2]
        g["wea"] |= raw[3]; g["wseen"] |= area_weather[raw[1]]
        if raid: g["stars"] |= raid[0]; g["rar"] |= raid[1]
        g["min"] = min(g["min"], lo); g["max"] = max(g["max"], hi)
        g["ver"] |= 1 << vbit
        for t in (1, 2, 4):
            if tmask & t:
                # per version, time and original table (the three GSC headbutt tables are separate trees)
                g["rate"][(vbit, t, raw)] += rarity

    M = ["grass", "surf", "old-rod", "good-rod", "super-rod", "headbutt", "rock-smash", "gift", "egg", "trade", "static", "roaming", "special",
         "wild", "water", "flying", "rare", "rare-flying",
         "dive", "any-rod", "event", "honey", "dark-grass", "phenomenon", "grotto",
         "horde", "flowers", "rough", "berry", "ambush",
         "sos", "bubbles", "scan",
         "dirt", "wanderer", "raid", "adventure"]
    out = {g: {} for g in GAMES}
    for (game, sid, li, ai, meth, ni), g in groups.items():
        times = 0
        for (v, t, _), n in g["rate"].items():
            if n: times |= t
        rate = 0 if meth in NO_RATE else min(100, max(g["rate"].values() or [0]))
        # Black / White: only when it isn't there all year; Sword / Shield: weather, and a Max Raid den's stars
        extras = [season_note(g["seas"]), weather_note(g["wea"], g["wseen"]), raid_note(g["stars"], g["rar"]) if g["stars"] else ""]
        if any(extras):
            ni = idx(N, Ni, " · ".join(x for x in [N[ni]] + extras if x))
        out[game].setdefault(sid, []).append([li, ai, M.index(meth), g["min"], g["max"], rate, times or 7, g["ver"], ni])
    for game in out:
        for sid in out[game]:
            out[game][sid].sort(key=lambda e: (e[2], -e[5], e[0]))
    return {"L": L, "A": A, "N": N, "M": M, "v": {g: [s for _, s in vs] for g, vs in GAMES.items()}, "g": out}
