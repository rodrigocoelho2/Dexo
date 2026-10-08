"""Where each Pokémon is found in the games that have a map (Where to get → map).
Reads PokeAPI's encounter CSVs and returns a compact table for data2.json:
  {"L": [[location id, name], ...], "A": [area labels], "N": [notes], "M": [methods],
   "g": {game: {species: [[loc, area, method, min lv, max lv, rate %, times, versions, note], ...]}}}
times: 1 morning, 2 day, 4 night (7 = any time). versions: one bit per version of the game, in GAMES order.
rate 0 = unknown (Let's Go overworld spawns)."""
import csv, re
from collections import defaultdict

# app game → PokeAPI versions (bit order = the order shown in the app)
GAMES = {"rby": [("1", "R"), ("45", "G"), ("2", "B"), ("3", "Y")],          # 45 = Japanese Green
         "gsc": [("4", "G"), ("5", "S"), ("6", "C")],
         "frlg": [("10", "FR"), ("11", "LG")],
         "hgss": [("15", "HG"), ("16", "SS")],
         "lgpe": [("31", "P"), ("32", "E")]}
METHOD = {"walk": "grass", "surf": "surf", "old-rod": "old-rod", "good-rod": "good-rod", "super-rod": "super-rod",
          "headbutt": "headbutt", "headbutt-low": "headbutt", "headbutt-normal": "headbutt", "headbutt-high": "headbutt",
          "rock-smash": "rock-smash", "gift": "gift", "gift-egg": "egg", "npc-trade": "trade", "static": "static",
          "roaming-grass": "roaming", "pokeflute": "special", "squirt-bottle": "special", "pokemon-ranger": "special",
          # Let's Go: Pokémon walk around in the overworld (PokeAPI gives every spawn the same weight, so no rate)
          "overworld": "wild", "overworld-water": "water", "overworld-flying": "flying",
          "overworld-special": "rare", "overworld-flying-special": "rare-flying", "overworld-water-special": "rare"}
NO_RATE = {"wild", "water", "flying", "rare", "rare-flying"}
SKIP_LOC = {"unknown-all-bugs", "unknown-all-poliwag", "unknown-all-rattata"}   # PokeAPI placeholder areas
TIME = {"time-morning": 1, "time-day": 2, "time-night": 4}
IGNORE = {"swarm-no", "radio-off", "bug-catching-contest-no", "johto-safari-blocks-inactive", "headbutt-tree-common"}
STORY = {"national-dex": "After the National Dex", "before-national-dex": "Before the National Dex", "beat-red": "After beating Red",
         "awakened-beasts": "After the legendary beasts awaken", "zephyr-badge": "After the Zephyr Badge",
         "returned-machine-part": "After returning the Machine Part", "vermilion-copycat": "After helping Copycat",
         "receive-tm-from-claire": "After Clair's TM",
         "beat-elite-four-round-two": "After the Elite Four rematch"}
OTHER = {"correct-password": "With the correct password", "received-kanto-starter": "After receiving a Kanto starter",
         "event-arceus-in-party": "With an event Arceus in the party", "snorlax-11-beat-league": "After the League",
         "virtual-console": "Virtual Console only"}
FIRST = {"first-party-pokemon-high-friendship": "Lead Pokémon must be very friendly"}
FOSSIL = {"helix": "Helix", "dome": "Dome", "old-amber": "Old Amber", "root": "Root", "claw": "Claw", "skull": "Skull", "armor": "Armor"}


def note_of(cond):
    """A short note for one non-default encounter condition, or None."""
    if cond in IGNORE or cond in TIME:
        return None
    if cond in FIRST: return FIRST[cond]
    if cond == "swarm-yes": return "Swarm"
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


def area_label(prose, loc_name, ident):
    if not ident or ident == "area":
        return ""
    m = re.search(r"\(([^)]*)\)", prose or "")
    if m:
        return m.group(1)
    p = (prose or "").replace(loc_name, "").strip(" -")
    return p or ident.replace("-", " ").upper()


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

    groups = {}
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
        name = loc_name.get(lid) or {"johto-pokemart": "Poké Mart", "roaming-johto": "Roaming Johto",
                                     "roaming-kanto": "Roaming Kanto"}.get(ident, ident)
        li = idx(L, Li, ident, [ident, name])
        ai = idx(A, Ai, area_label(area_prose.get(area["id"], ""), name, area["identifier"]))
        cs = conds.get(r["id"], [])
        tmask = sum(TIME[c] for c in cs if c in TIME) or 7
        notes = sorted({n for n in (note_of(c) for c in cs) if n})
        ni = idx(N, Ni, " · ".join(notes))
        g = groups.setdefault((game, sid, li, ai, meth, ni), {"min": 99, "max": 0, "rate": defaultdict(int), "ver": 0})
        g["min"] = min(g["min"], int(r["min_level"])); g["max"] = max(g["max"], int(r["max_level"]))
        g["ver"] |= 1 << vbit
        for t in (1, 2, 4):
            if tmask & t:
                # per version, time and original table (the three GSC headbutt tables are separate trees)
                g["rate"][(vbit, t, raw)] += int(slots[r["encounter_slot_id"]]["rarity"])

    M = ["grass", "surf", "old-rod", "good-rod", "super-rod", "headbutt", "rock-smash", "gift", "egg", "trade", "static", "roaming", "special",
         "wild", "water", "flying", "rare", "rare-flying"]
    out = {g: {} for g in GAMES}
    for (game, sid, li, ai, meth, ni), g in groups.items():
        times = 0
        for (v, t, _), n in g["rate"].items():
            if n: times |= t
        rate = 0 if meth in NO_RATE else min(100, max(g["rate"].values() or [0]))
        out[game].setdefault(sid, []).append([li, ai, M.index(meth), g["min"], g["max"], rate, times or 7, g["ver"], ni])
    for game in out:
        for sid in out[game]:
            out[game][sid].sort(key=lambda e: (e[2], -e[5], e[0]))
    return {"L": L, "A": A, "N": N, "M": M, "v": {g: [s for _, s in vs] for g, vs in GAMES.items()}, "g": out}
