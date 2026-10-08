"""Builds LivingDex.Client/src/data2.json (species, forms, games, dexes, evolutions, moves) from the
PokeAPI CSV exports in csv/ and Pokémon Showdown's data files in sd/.
Usage:  python3 LivingDex.Client/data-build/build_data.py   (then python3 LivingDex.Client/assemble.py)"""
import csv, json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE); sys.path.insert(0, HERE)
from sdparse import parse
D = "csv"
OUT = os.path.join(HERE, "..", "src", "data2.json")
def rows(n): return list(csv.DictReader(open(f"{D}/{n}.csv", encoding="utf-8")))
norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())

species = {int(r["id"]): r for r in rows("pokemon_species")}
names = {}
for r in rows("pokemon_species_names"):
    if r["local_language_id"] in ("9", "1"):
        names.setdefault(int(r["pokemon_species_id"]), {})[r["local_language_id"]] = r["name"]
pokemon = {int(r["id"]): r for r in rows("pokemon")}
ptypes = {}
for r in rows("pokemon_types"):
    ptypes.setdefault(int(r["pokemon_id"]), []).append((int(r["slot"]), int(r["type_id"])))
types_of = lambda pid: [t for _, t in sorted(ptypes.get(pid, []))]
default_pid = {int(p["species_id"]): pid for pid, p in pokemon.items() if p["is_default"] == "1"}
en_name = {sid: names[sid]["9"] for sid in species}
by_name = {norm(v): k for k, v in en_name.items()}

# ---------- availability per game (Showdown legality = can exist in that game) ----------
GAMES = ["za", "sv", "pla", "bdsp", "swsh", "lgpe"]
SD = {"za": parse("sd/za_formats-data.ts"), "sv": parse("sd/formats-data.ts"), "bdsp": parse("sd/mods_gen8bdsp_formats-data.ts"),
      "swsh": parse("sd/mods_gen8_formats-data.ts"), "lgpe": parse("sd/mods_gen7letsgo_formats-data.ts")}
SDDEX = set(parse("sd/pokedex.ts").keys())
def sdid(ident):
    s = ident
    s = re.sub(r"^pikachu-(.*)-cap$", r"pikachu-\1", s)
    s = re.sub(r"-breed$", "", s)
    s = s.replace("darmanitan-galar-standard", "darmanitan-galar")
    s = s.replace("necrozma-dusk", "necrozma-dusk-mane").replace("necrozma-dawn", "necrozma-dawn-wings")
    s = re.sub(r"-plumage$", "", s); s = re.sub(r"-mask$", "", s)
    s = re.sub(r"-female$", "-f", s)
    s = s.replace("maushold-family-of-three", "maushold")
    return norm(s)
def avail(game, ident, sid, region=""):
    k = sdid(ident)
    base = norm(species[sid]["identifier"])
    if game == "pla":
        if region and region != "hisui": return False
        if ident.startswith("pikachu-") or ident == "pichu-spiky-eared": return False
        return True
    m = SD[game]
    if k in m: return m[k] is None
    if k in SDDEX and k != base: return False      # real forme missing from this game
    return base in m and m[base] is None           # cosmetic form follows its species
species_mask = {}
for sid in species:
    mk = 0
    for i, g in enumerate(GAMES):
        if g == "pla": continue
        if avail(g, species[sid]["identifier"], sid): mk |= 1 << i
    species_mask[sid] = mk

# ---------- evolutions ----------
items = {int(r["id"]): r["identifier"] for r in rows("items")}
iname = {int(r["item_id"]): r["name"] for r in rows("item_names") if r["local_language_id"] == "9"}
moves = {int(r["id"]): r["identifier"] for r in rows("moves")}
mname = {int(r["move_id"]): r["name"] for r in rows("move_names") if r["local_language_id"] == "9"}
types = {int(r["id"]): r["identifier"].title() for r in rows("types")}
it = lambda i: iname.get(int(i), items.get(int(i), "item").replace("-", " ").title())
mv = lambda i: mname.get(int(i), moves.get(int(i), "move").replace("-", " ").title())
evo_rows = {}
for r in rows("pokemon_evolution"):
    evo_rows.setdefault(int(r["evolved_species_id"]), []).append(r)
def method(r):
    t = r["evolution_trigger_id"]; parts = []
    if t == "1":
        if r["minimum_level"]: parts.append(f"Lv. {r['minimum_level']}")
        if r["minimum_happiness"]: parts.append("High friendship")
        if r["minimum_affection"]: parts.append("High affection")
        if r["minimum_beauty"]: parts.append("High beauty")
        if r["held_item_id"]: parts.append(f"holding {it(r['held_item_id'])}")
        if r["known_move_id"]: parts.append(f"knowing {mv(r['known_move_id'])}")
        if r["known_move_type_id"]: parts.append(f"knowing a {types[int(r['known_move_type_id'])]} move")
        if r["location_id"]: parts.append("at a special location")
        if r["party_species_id"]: parts.append(f"with {en_name[int(r['party_species_id'])]} in party")
        if r["party_type_id"]: parts.append(f"with a {types[int(r['party_type_id'])]} type in party")
        if r["needs_overworld_rain"] == "1": parts.append("in rain")
        if r["turn_upside_down"] == "1": parts.append("console upside down")
        if r["relative_physical_stats"]: parts.append({"1": "Atk > Def", "-1": "Atk < Def", "0": "Atk = Def"}.get(r["relative_physical_stats"], ""))
        if r["minimum_steps"]: parts.append(f"after {r['minimum_steps']} steps (Let's Go)")
        if r["gender_id"]: parts.append("♀ only" if r["gender_id"] == "1" else "♂ only")
        if r["time_of_day"]: parts.append(f"at {r['time_of_day']}")
        if not parts: parts.append("Level up")
        if not r["minimum_level"] and parts[0] != "Level up": parts.insert(0, "Level up")
    elif t == "2":
        parts.append("Trade")
        if r["held_item_id"]: parts.append(f"holding {it(r['held_item_id'])}")
        if r["trade_species_id"]: parts.append(f"for {en_name[int(r['trade_species_id'])]}")
    elif t == "3":
        parts.append(it(r["trigger_item_id"]))
        if r["gender_id"]: parts.append("♀ only" if r["gender_id"] == "1" else "♂ only")
    else:
        parts.append({"4": "Free slot + Poké Ball", "5": "Spin holding a Sweet", "6": "Scroll of Darkness", "7": "Scroll of Waters",
                      "8": "3 critical hits in one battle", "9": "Take 49+ damage, walk under stone arch", "10": "Lv. 25 (battle)",
                      "11": "Use Barb Barrage (Agile) ×20", "12": "Use Barb Barrage (Strong) ×20", "13": "Take 294 recoil damage",
                      "14": f"Use {mv(r['used_move_id'])} ×20" if r["used_move_id"] else "Use move ×20", "15": "Defeat 3 Bisharp leaders",
                      "16": "999 Gimmighoul Coins", "17": "400 Meltan Candy (GO)"}.get(t, "Special"))
    return ", ".join(p for p in parts if p)
EVO = {}
for sid, s in species.items():
    if not s["evolves_from_species_id"]: continue
    rs = evo_rows.get(sid, [])
    rs = sorted(rs, key=lambda r: (r["evolved_pokemon_form_id"] == "" or r["evolved_pokemon_form_id"] == str(default_pid.get(sid)), r["is_default"] == "1", int(r["version_group_id"])), reverse=True)
    m = method(rs[0]) if rs else "Special"
    trade = any(r["evolution_trigger_id"] == "2" for r in rs)
    EVO[sid] = [int(s["evolves_from_species_id"]), m, 1 if trade else 0]

S = []
for sid in sorted(species):
    s = species[sid]; t = types_of(default_pid[sid])
    flags = (1 if s["is_legendary"] == "1" else 0) | (2 if s["is_mythical"] == "1" else 0) | (4 if s["is_baby"] == "1" else 0)
    S.append([sid, en_name[sid], names[sid].get("1", ""), int(s["generation_id"]), t[0], t[1] if len(t) > 1 else 0,
              int(s["gender_rate"]), flags, int(s["evolution_chain_id"] or 0), species_mask[sid]])

# ---------- forms ----------
fnames = {int(r["pokemon_form_id"]): r["form_name"] for r in rows("pokemon_form_names") if r["local_language_id"] == "9"}
EXCL = re.compile(r"(^scatterbug-|^spewpa-|^mothim-|gmax|totem|-starter|rock-star|belle|pop-star|phd|libre|cosplay|eternamax|power-construct|own-tempo|-meteor$|zen-galar|-busted|-hangry|crowned|-primal|ultra$|-stellar|-terastal|-build$|-mode$|-noice$|-gulping|-gorging|-blade$|-school$|-pirouette|-sunshine$|-ash$|-battle-bond|-hero$|-low-key-gmax)")
F = []; seen = set()
for r in rows("pokemon_forms"):
    pid = int(r["pokemon_id"]); sid = int(pokemon[pid]["species_id"]); ident = r["identifier"]
    if r["is_battle_only"] == "1" or r["is_mega"] == "1": continue
    if pid == default_pid[sid] and r["is_default"] == "1": continue
    if EXCL.search(ident) or ident in seen: continue
    seen.add(ident)
    label = fnames.get(int(r["id"]), "") or r["form_identifier"].replace("-", " ").title()
    sk = str(pid) if (pid >= 10000 and r["is_default"] == "1") else (f"{pid}-{r['form_identifier']}" if r["form_identifier"] else str(pid))
    t = types_of(pid)
    reg = next((k for k in ("alola", "galar", "hisui", "paldea") if re.search(rf"-{k}(-|$)", ident)), "")
    mk = 0
    for i, g in enumerate(GAMES):
        if avail(g, ident, sid, reg): mk |= 1 << i
    F.append([ident, sid, label, sk, t[0], t[1] if len(t) > 1 else 0, mk, int(r['introduced_in_version_group_id'])])
F.sort(key=lambda f: (f[1], f[0]))
female_forms = {f[1] for f in F if "female" in f[0]}
G = [sid for sid in sorted(species) if species[sid]["has_gender_differences"] == "1" and sid not in female_forms]

# ---------- regional dexes ----------
dex = {}
for r in rows("pokemon_dex_numbers"):
    dex.setdefault(int(r["pokedex_id"]), []).append((int(r["pokedex_number"]), int(r["species_id"])))
X = {}
for did, name in {2: "kantoc", 3: "johto", 7: "johtohg", 4: "hoenn", 15: "hoennoras", 6: "sinnohpt", 8: "unova", 9: "unova2", 12: "kalosc", 13: "kalosco", 14: "kalosm", 16: "alola", 17: "melemele", 18: "akala", 19: "ulaula", 20: "poni", 21: "alolau", 22: "melemeleu", 23: "akalau", 24: "ulaulau", 25: "poniu", 5: "sinnoh", 26: "kanto", 27: "galar", 28: "armor", 29: "tundra", 30: "hisui", 31: "paldea", 32: "kitakami", 33: "blueberry", 34: "lumiose"}.items():
    X[name] = [s for _, s in sorted(dex[did])]; X[name + "#"] = [n for n, _ in sorted(dex[did])]
HYPER = """Mankey Primeape Annihilape Meowth Persian Perrserker Farfetch'd Sirfetch'd Cubone Marowak Porygon Porygon2 Porygon-Z Capsakid Scovillain Tinkatink Tinkatuff Tinkaton Cyclizar Glimmet Glimmora Rotom Greavard Houndstone Sandygast Palossand Kecleon Flamigo Cryogonal Dondozo Tatsugiri Frigibax Arctibax Baxcalibur Gimmighoul Gholdengo Qwilfish Overqwil Treecko Grovyle Sceptile Torchic Combusken Blaziken Mudkip Marshtomp Swampert Feebas Milotic Chingling Chimecho Indeedee Purrloin Liepard Munna Musharna Throh Sawk Yamask Cofagrigus Runerigus Wimpod Golisopod Nickit Thievul Clobbopus Grapploct Mimikyu Kleavor Morpeko Golett Golurk Rookidee Corvisquire Corviknight Igglybuff Jigglypuff Wigglytuff Fidough Dachsbun Starly Staravia Staraptor Spoink Grumpig Squawkabilly Crabrawler Crabominable Nacli Naclstack Garganacl Gulpin Swalot Zubat Golbat Crobat Charcadet Armarouge Ceruledge Maschiff Mabosstiff Toxel Toxtricity Shroodle Grafaiai Zangoose Seviper Mime_Jr. Mr._Mime Mr._Rime Foongus Amoonguss Heatran Volcanion Cobalion Terrakion Virizion Keldeo Meloetta Genesect Hoopa Marshadow Meltan Melmetal Darkrai Latias Latios Kyogre Groudon Rayquaza Magearna Zeraora""".split()
X["hyperspace"] = [by_name[norm(n.replace("_", " "))] for n in HYPER]; X["hyperspace#"] = list(range(1, len(HYPER) + 1))
assert len(X["hyperspace"]) == 132

# ---------- version exclusives ----------
EXC_SRC = {
 "sv": {"Scarlet": "Vulpix Ninetales Gligar Larvitar Pupitar Tyranitar Cranidos Rampardos Drifloon Drifblim Stunky Skuntank Gliscor Deino Zweilous Hydreigon Skrelp Dragalge Oranguru Cramorant Stonjourner Armarouge Great_Tusk Scream_Tail Brute_Bonnet Flutter_Mane Slither_Wing Sandy_Shocks Roaring_Moon Koraidon Walking_Wake Gouging_Fire Raging_Bolt Raikou Entei Suicune Ho-Oh Latios Groudon Reshiram Solgaleo Glastrier",
        "Violet": "Sandshrew Sandslash Aipom Misdreavus Gulpin Swalot Bagon Shelgon Salamence Shieldon Bastiodon Ambipom Mismagius Clauncher Clawitzer Passimian Morpeko Dreepy Drakloak Dragapult Eiscue Ceruledge Iron_Treads Iron_Bundle Iron_Hands Iron_Jugulis Iron_Moth Iron_Thorns Iron_Valiant Miraidon Iron_Leaves Iron_Boulder Iron_Crown Cobalion Terrakion Virizion Lugia Latias Kyogre Zekrom Lunala Spectrier"},
 "swsh": {"Sword": "Farfetch'd Darumaka Darmanitan Flapple Sirfetch'd Stonjourner Seedot Nuzleaf Shiftry Mawile Solrock Scraggy Scrafty Gothita Gothorita Gothitelle Rufflet Braviary Deino Zweilous Hydreigon Swirlix Slurpuff Passimian Turtonator Jangmo-o Hakamo-o Kommo-o Zacian Pinsir Sawk Clauncher Clawitzer Omanyte Omastar Ho-Oh Bagon Shelgon Salamence Latios Groudon Dialga Tornadus Reshiram Xerneas Solgaleo",
          "Shield": "Ponyta Rapidash Corsola Appletun Cursola Eiscue Larvitar Pupitar Tyranitar Lotad Lombre Ludicolo Sableye Lunatone Croagunk Toxicroak Solosis Duosion Reuniclus Vullaby Mandibuzz Spritzee Aromatisse Goomy Sliggoo Goodra Oranguru Drampa Zamazenta Heracross Throh Skrelp Dragalge Kabuto Kabutops Lugia Latias Kyogre Gible Gabite Garchomp Palkia Thundurus Zekrom Yveltal Lunala"},
 "bdsp": {"Brilliant Diamond": "Caterpie Metapod Butterfree Ekans Arbok Growlithe Arcanine Seel Dewgong Scyther Electabuzz Murkrow Gligar Scizor Elekid Raikou Entei Suicune Larvitar Pupitar Tyranitar Ho-Oh Seedot Nuzleaf Shiftry Mawile Zangoose Solrock Kecleon Cranidos Rampardos Honchkrow Stunky Skuntank Electivire Gliscor Dialga",
          "Shining Pearl": "Weedle Kakuna Beedrill Sandshrew Sandslash Vulpix Ninetales Slowpoke Slowbro Magmar Pinsir Articuno Zapdos Moltres Slowking Misdreavus Teddiursa Ursaring Stantler Magby Lugia Lotad Lombre Ludicolo Sableye Seviper Lunatone Bagon Shelgon Salamence Shieldon Bastiodon Mismagius Glameow Purugly Magmortar Palkia"},
 "lgpe": {"Let's Go Pikachu": "Sandshrew Sandslash Oddish Gloom Vileplume Mankey Primeape Growlithe Grimer Muk Scyther",
          "Let's Go Eevee": "Ekans Arbok Vulpix Ninetales Meowth Persian Bellsprout Weepinbell Victreebel Koffing Weezing Pinsir"},
}
OLD = {
 "rby": {"Red": "Ekans, Arbok, Oddish, Gloom, Vileplume, Mankey, Primeape, Growlithe, Arcanine, Scyther, Electabuzz", "Blue": "Sandshrew, Sandslash, Vulpix, Ninetales, Meowth, Persian, Bellsprout, Weepinbell, Victreebel, Magmar, Pinsir"},
 "gsc": {"Gold": "Mankey, Primeape, Growlithe, Arcanine, Spinarak, Ariados, Gligar, Teddiursa, Ursaring, Mantine", "Silver": "Vulpix, Ninetales, Meowth, Persian, Ledyba, Ledian, Delibird, Skarmory, Phanpy, Donphan"},
 "rse": {"Ruby": "Seedot, Nuzleaf, Shiftry, Mawile, Zangoose, Solrock, Groudon", "Sapphire": "Lotad, Lombre, Ludicolo, Sableye, Seviper, Lunatone, Kyogre"},
 "frlg": {"FireRed": "Ekans, Arbok, Oddish, Gloom, Vileplume, Psyduck, Golduck, Growlithe, Arcanine, Shellder, Cloyster, Scyther, Electabuzz, Bellossom, Wooper, Quagsire, Murkrow, Qwilfish, Scizor, Delibird, Skarmory, Elekid",
          "LeafGreen": "Sandshrew, Sandslash, Vulpix, Ninetales, Bellsprout, Weepinbell, Victreebel, Slowpoke, Slowbro, Staryu, Starmie, Magmar, Pinsir, Marill, Azumarill, Slowking, Misdreavus, Sneasel, Remoraid, Octillery, Mantine, Magby, Azurill"},
 "dppt": {"Diamond": "Cranidos, Rampardos, Honchkrow, Stunky, Skuntank, Dialga, Seel, Dewgong, Scyther, Murkrow, Scizor, Larvitar, Pupitar, Tyranitar, Poochyena, Mightyena, Aron, Lairon, Aggron, Kecleon",
          "Pearl": "Shieldon, Bastiodon, Mismagius, Glameow, Purugly, Palkia, Slowpoke, Slowbro, Pinsir, Slowking, Misdreavus, Houndour, Houndoom, Stantler, Spheal, Sealeo, Walrein, Bagon, Shelgon, Salamence"},
 "hgss": {"HeartGold": "Mankey, Primeape, Growlithe, Arcanine, Omanyte, Omastar, Spinarak, Ariados, Gligar, Mantine, Phanpy, Donphan, Sableye, Baltoy, Claydol, Anorith, Armaldo, Kyogre, Mantyke, Gliscor",
          "SoulSilver": "Vulpix, Ninetales, Meowth, Persian, Kabuto, Kabutops, Ledyba, Ledian, Teddiursa, Ursaring, Delibird, Skarmory, Mawile, Gulpin, Swalot, Lileep, Cradily, Groudon"},
 "bw": {"Black": "Cottonee, Whimsicott, Gothita, Gothorita, Gothitelle, Vullaby, Mandibuzz, Tornadus, Reshiram, Weedle, Kakuna, Beedrill, Murkrow, Houndour, Houndoom, Shroomish, Breloom, Plusle, Volbeat, Honchkrow",
        "White": "Petilil, Lilligant, Solosis, Duosion, Reuniclus, Rufflet, Braviary, Thundurus, Zekrom, Caterpie, Metapod, Butterfree, Paras, Parasect, Misdreavus, Poochyena, Mightyena, Minun, Illumise, Mismagius"},
 "b2w2": {"Black 2": "Cottonee, Whimsicott, Gothita, Gothorita, Gothitelle, Vullaby, Mandibuzz, Zekrom, Magmar, Sudowoodo, Heracross, Magby, Plusle, Volbeat, Spoink, Grumpig, Registeel, Latios, Buneary, Lopunny, Bonsly, Magmortar",
          "White 2": "Petilil, Lilligant, Solosis, Duosion, Reuniclus, Rufflet, Braviary, Reshiram, Mr. Mime, Electabuzz, Pinsir, Elekid, Skitty, Delcatty, Minun, Illumise, Numel, Camerupt, Regice, Latias, Mime Jr., Electivire"},
 "xy": {"X": "Swirlix, Slurpuff, Clauncher, Clawitzer, Xerneas, Staryu, Starmie, Pinsir, Houndour, Houndoom, Poochyena, Mightyena, Aron, Lairon, Aggron, Lileep, Cradily, Anorith, Armaldo, Sawk",
        "Y": "Spritzee, Aromatisse, Skrelp, Dragalge, Yveltal, Shellder, Cloyster, Omanyte, Omastar, Kabuto, Kabutops, Heracross, Larvitar, Pupitar, Tyranitar, Electrike, Manectric, Purrloin, Liepard, Throh"},
 "oras": {"Omega Ruby": "Seedot, Nuzleaf, Shiftry, Mawile, Zangoose, Solrock, Groudon, Kabuto, Kabutops, Ho-oh, Shieldon, Bastiodon, Palkia, Throh, Archen, Archeops, Tornadus, Reshiram, Skrelp, Dragalge",
          "Alpha Sapphire": "Lotad, Lombre, Ludicolo, Sableye, Seviper, Lunatone, Kyogre, Omanyte, Omastar, Lugia, Cranidos, Rampardos, Dialga, Sawk, Tirtouga, Carracosta, Thundurus, Zekrom, Clauncher, Clawitzer"},
 "sm": {"Sun": "Vulpix, Ninetales, Passimian, Turtonator, Cranidos, Rampardos, Cottonee, Whimsicott, Tirtouga, Carracosta, Rufflet, Braviary, Solgaleo, Buzzwole, Kartana",
        "Moon": "Sandshrew, Sandslash, Oranguru, Drampa, Shieldon, Bastiodon, Petilil, Lilligant, Archen, Archeops, Vullaby, Mandibuzz, Lunala, Pheromosa, Celesteela"},
 "usum": {"Ultra Sun": "Vulpix, Ninetales, Passimian, Turtonator, Buzzwole, Kartana, Blacephalon, Omanyte, Omastar, Houndour, Houndoom, Raikou, Ho-oh, Anorith, Armaldo, Latios, Groudon, Cranidos, Rampardos, Dialga, Heatran, Cottonee, Whimsicott, Tirtouga, Carracosta, Golett, Golurk, Rufflet, Braviary, Tornadus, Reshiram, Clauncher, Clawitzer, Tyrunt, Tyrantrum, Xerneas",
          "Ultra Moon": "Sandshrew, Sandslash, Oranguru, Drampa, Pheromosa, Celesteela, Stakataka, Kabuto, Kabutops, Entei, Lugia, Electrike, Manectric, Baltoy, Claydol, Lileep, Cradily, Latias, Kyogre, Shieldon, Bastiodon, Palkia, Regigigas, Petilil, Lilligant, Archen, Archeops, Vullaby, Mandibuzz, Thundurus, Zekrom, Skrelp, Dragalge, Amaura, Aurorus, Yveltal"},
}
for g, vs in OLD.items():
    EXC_SRC[g] = {ver: " ".join(n.strip().replace(" ", "_") for n in txt.split(",")) for ver, txt in vs.items()}
EXC = {}
for g, vs in EXC_SRC.items():
    EXC[g] = {}
    for ver, txt in vs.items():
        for n in txt.split():
            EXC[g][by_name[norm(n.replace("_", " "))]] = ver
NOTE = {"b2w2|646": "Black Kyurem in Black 2, White Kyurem in White 2", "usum|800": "Dusk Mane in Ultra Sun, Dawn Wings in Ultra Moon", "sm|37": "Alolan form in Sun", "sm|38": "Alolan form in Sun", "sm|27": "Alolan form in Moon", "sm|28": "Alolan form in Moon", "usum|37": "Alolan form in Ultra Sun", "usum|38": "Alolan form in Ultra Sun", "usum|27": "Alolan form in Ultra Moon", "usum|28": "Alolan form in Ultra Moon", "sv|128": "Paldean Tauros: Blaze breed in Scarlet, Aqua breed in Violet", "swsh|550": "Red-Striped in Sword, Blue-Striped in Shield",
        "swsh|876": "Male in Sword, Female in Shield", "swsh|554": "Galarian form in Sword", "swsh|555": "Galarian form in Sword", "swsh|83": "Galarian form in Sword", "swsh|77": "Galarian form in Shield", "swsh|78": "Galarian form in Shield", "swsh|222": "Galarian form in Shield",
        "sv|646": "White Kyurem in Scarlet, Black Kyurem in Violet", "sv|800": "Dusk Mane in Scarlet, Dawn Wings in Violet"}

out = {"s": S, "f": F, "g": G, "x": X, "e": EVO, "xc": EXC, "xn": NOTE}
# heights (decimetres) of the default form of every species, used to size battle sprites
import csv as _csv
_H={int(r["species_id"]):int(r["height"]) for r in _csv.DictReader(open("csv/pokemon.csv")) if r["is_default"]=="1"}
out["ht"]=[_H.get(i,10) for i in range(1,1026)]
# where each Pokémon is found, for the games that have a map (GSC, HGSS)
import encounters
_SPEC={int(r["id"]):int(r["species_id"]) for r in _csv.DictReader(open("csv/pokemon.csv"))}
out["enc"]=encounters.build(rows,_SPEC)
json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print("wrote", os.path.normpath(OUT))
print(len(S), len(F), len(G), len(EVO), sum(len(v) for v in EXC.values()))
fm = {f[0]: f[6] for f in F}
for k in ["vulpix-alola", "pikachu-original-cap", "unown-b", "rotom-wash", "arceus-fairy", "tauros-paldea-blaze-breed", "floette-eternal", "basculin-white-striped", "zygarde-10", "necrozma-dusk", "meowth-galar", "pichu-spiky-eared", "vivillon-fancy", "alcremie-ruby-cream-strawberry-sweet"]:
    if k in fm: print(k, {g: bool(fm[k] >> i & 1) for i, g in enumerate(GAMES)})
print("evo", EVO.get(2), EVO.get(26), EVO.get(68), EVO.get(462), EVO.get(1000))
