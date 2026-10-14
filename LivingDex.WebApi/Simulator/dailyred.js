'use strict';
// Daily Red: the team of the day, Red's team on Mt. Silver and how Red picks his moves.
// The day's team is the same for everyone: Gen 3 random-battle sets (fully evolved Gen 1–3 Pokémon,
// no Ubers) from a generator seeded with the date, all at level 100. The WebApi stores the team the
// first time a date is asked for, so a simulator update never changes a team people already played.
const crypto = require('crypto');
const { Dex, Teams } = require('pokemon-showdown');

const dex = Dex.forGen(3);
const FORMAT = 'gen3customgame';
const STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
const EVS = { hp: 85, atk: 85, def: 85, spa: 85, spd: 85, spe: 85 };
const IVS = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
const SKIP = new Set(['unown', 'ditto', 'wobbuffet', 'shedinja', 'smeargle']);
const MIN_BST = 440; // no hopeless picks (Delibird, Luvdisc…) against a level 100 Red

// Red on Mt. Silver: always the same six, lead first. Perfect IVs, items, Gen 3 moves.
const RED_TEAM = [
  { species: 'Pikachu', item: 'Light Ball', ability: 'Static', nature: 'Timid', moves: ['thunderbolt', 'irontail', 'quickattack', 'thunder'] },
  { species: 'Espeon', item: 'Leftovers', ability: 'Synchronize', nature: 'Timid', moves: ['psychic', 'shadowball', 'bite', 'quickattack'] },
  { species: 'Snorlax', item: 'Leftovers', ability: 'Immunity', nature: 'Adamant', moves: ['bodyslam', 'earthquake', 'shadowball', 'rockslide'] },
  { species: 'Venusaur', item: 'Miracle Seed', ability: 'Overgrow', nature: 'Modest', moves: ['gigadrain', 'sludgebomb', 'earthquake', 'razorleaf'] },
  { species: 'Charizard', item: 'Charcoal', ability: 'Blaze', nature: 'Mild', moves: ['flamethrower', 'dragonclaw', 'earthquake', 'aerialace'] },
  { species: 'Blastoise', item: 'Mystic Water', ability: 'Torrent', nature: 'Modest', moves: ['surf', 'icebeam', 'earthquake', 'brickbreak'] },
].map(s => ({ name: s.species, level: 100, gender: '', evs: { ...EVS }, ivs: { ...IVS }, ...s }));

function seedOf(date) {
  const h = crypto.createHash('sha256').update('daily-red:' + date).digest();
  return [h.readUInt16BE(0), h.readUInt16BE(2), h.readUInt16BE(4), h.readUInt16BE(6)];
}

function allowed(set, seen) {
  const sp = dex.species.get(set.species);
  if (!sp.exists || sp.nfe || sp.num < 1 || sp.num > 386 || seen.has(sp.baseSpecies)) return false;
  if (SKIP.has(toID(sp.baseSpecies)) || sp.tier === 'Uber' || /Uber/.test(sp.tier || '')) return false;
  if (STATS.reduce((a, s) => a + sp.baseStats[s], 0) < MIN_BST) return false;
  return (set.moves || []).length >= 2;
}

// Gen 3: a move is physical or special by its type (Hidden Power too, once its type is known).
const SPECIAL = new Set(['Fire', 'Water', 'Grass', 'Electric', 'Ice', 'Psychic', 'Dragon', 'Dark']);
const categoryOf = (mv, type) => mv.category === 'Status' ? 'Status' : SPECIAL.has(type) ? 'Special' : 'Physical';
const TYPE_ITEMS = { charcoal: 'Fire', mysticwater: 'Water', miracleseed: 'Grass', magnet: 'Electric', nevermeltice: 'Ice', twistedspoon: 'Psychic',
  dragonfang: 'Dragon', blackglasses: 'Dark', blackbelt: 'Fighting', sharpbeak: 'Flying', softsand: 'Ground', hardstone: 'Rock', silverpowder: 'Bug',
  spelltag: 'Ghost', poisonbarb: 'Poison', metalcoat: 'Steel', silkscarf: 'Normal' };
const toID = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** The six sets of a date ("2026-10-14"), lead first, each at level 100. */
function teamOf(date) {
  const generator = Teams.getGenerator('gen3randombattle', seedOf(date));
  const seen = new Set(), team = [];
  for (let tries = 0; team.length < 6 && tries < 40; tries++) {
    for (const set of generator.getTeam()) {
      if (!allowed(set, seen)) continue;
      seen.add(dex.species.get(set.species).baseSpecies);
      team.push({ ...set, name: dex.species.get(set.species).baseSpecies, level: 100, shiny: false });
      if (team.length >= 6) break;
    }
  }
  return team;
}

// ---------- stats and display ----------
function statsOf(set) {
  const sp = dex.species.get(set.species), nature = dex.natures.get(set.nature || 'Serious'), out = {};
  for (const s of STATS) {
    const base = sp.baseStats[s], iv = (set.ivs && set.ivs[s] != null ? set.ivs[s] : 31), ev = (set.evs && set.evs[s] != null ? set.evs[s] : 0), L = set.level || 100;
    const core = Math.floor((2 * base + iv + Math.floor(ev / 4)) * L / 100);
    if (s === 'hp') out.hp = sp.baseStats.hp === 1 ? 1 : core + L + 10;
    else out[s] = Math.floor((core + 5) * (nature.plus === s ? 1.1 : nature.minus === s ? 0.9 : 1));
  }
  return out;
}

function hpTypeOf(set) {
  const m = (set.moves || []).map(toID).find(id => id.startsWith('hiddenpower') && id.length > 11);
  if (m) return dex.moves.get(m).type;
  return set.hpType || dex.getHiddenPower(set.ivs || IVS).type;
}

function moveView(id, set) {
  const mv = dex.moves.get(id);
  let type = mv.type;
  if (mv.id.startsWith('hiddenpower')) type = hpTypeOf(set);
  return { id: mv.id, name: mv.exists ? (mv.id.startsWith('hiddenpower') ? 'Hidden Power' : mv.name) : id, type, category: categoryOf(mv, type),
    power: mv.id.startsWith('hiddenpower') ? 70 : mv.basePower, accuracy: mv.accuracy === true ? 0 : mv.accuracy, pp: Math.floor((mv.pp || 5) * 8 / 5),
    desc: mv.shortDesc || mv.desc || '' };
}

function view(set) {
  const sp = dex.species.get(set.species);
  return {
    species: sp.name, baseSpecies: sp.baseSpecies, num: sp.num, types: sp.types, level: set.level || 100,
    item: set.item ? dex.items.get(set.item).name : '', ability: set.ability ? dex.abilities.get(set.ability).name : '',
    abilityDesc: set.ability ? (dex.abilities.get(set.ability).shortDesc || '') : '',
    nature: set.nature || '', stats: statsOf(set), base: { ...sp.baseStats }, bst: STATS.reduce((a, s) => a + sp.baseStats[s], 0),
    moves: (set.moves || []).map(id => moveView(id, set)),
  };
}

// ---------- damage estimate (Gen 3 formula, average roll, no crits) ----------
// A "fighter" is a plain object, so the same code rates the day's matchups and live battle positions.
const BOOST = [2 / 8, 2 / 7, 2 / 6, 2 / 5, 2 / 4, 2 / 3, 1, 1.5, 2, 2.5, 3, 3.5, 4];
const boosted = (f, s) => f.stats[s] * BOOST[6 + Math.max(-6, Math.min(6, (f.boosts && f.boosts[s]) || 0))];

function fighterFromSet(set) {
  const v = view(set);
  return { species: v.species, types: v.types, stats: v.stats, boosts: {}, item: toID(set.item), ability: toID(set.ability), status: '',
    hp: v.stats.hp, maxhp: v.stats.hp, level: set.level || 100, hpType: hpTypeOf(set), moves: (set.moves || []).map(toID).map(m => m.startsWith('hiddenpower') ? 'hiddenpower' : m) };
}

function fighterFromMon(mon) {
  if (!mon) return null;
  return { species: mon.species.name, types: mon.getTypes(), stats: { ...mon.storedStats, hp: mon.maxhp }, boosts: { ...mon.boosts }, item: toID(mon.item),
    ability: toID(mon.ability), status: mon.status || '', hp: mon.hp, maxhp: mon.maxhp, level: mon.level, hpType: mon.hpType || 'Dark',
    moves: mon.moveSlots.map(s => s.id), volatiles: Object.keys(mon.volatiles || {}), side: mon.side };
}

function moveType(mv, att) { return mv.id === 'hiddenpower' ? att.hpType : mv.type; }

function basePower(mv, att, def, weather) {
  switch (mv.id) {
    case 'hiddenpower': return 70;
    case 'return': case 'frustration': return 102;
    case 'lowkick': { const w = dex.species.get(def.species).weightkg; return w >= 200 ? 120 : w >= 100 ? 100 : w >= 50 ? 80 : w >= 25 ? 60 : w >= 10 ? 40 : 20; }
    case 'flail': case 'reversal': { const p = Math.floor(48 * att.hp / att.maxhp); return p <= 1 ? 200 : p <= 4 ? 150 : p <= 9 ? 100 : p <= 16 ? 80 : p <= 32 ? 40 : 20; }
    case 'eruption': case 'waterspout': return Math.max(1, Math.floor(150 * att.hp / att.maxhp));
    case 'facade': return att.status && att.status !== 'slp' ? 140 : 70;
    case 'weatherball': return weather && weather !== 'none' ? 100 : 50;
  }
  return mv.basePower || 0;
}

const FIXED = { seismictoss: f => f.level, nightshade: f => f.level, dragonrage: () => 40, sonicboom: () => 20 };

/** Average damage of one move, in HP (0 for status moves and moves that can't work here). */
function damage(att, def, moveId, weather, screens) {
  const mv = dex.moves.get(moveId);
  if (!mv.exists || mv.category === 'Status') return 0;
  const type = moveType(mv, att);
  if (!dex.getImmunity(type, def.types)) return 0;
  const ab = def.ability;
  if ((type === 'Ground' && ab === 'levitate') || (type === 'Fire' && ab === 'flashfire') || (type === 'Electric' && ab === 'voltabsorb') || (type === 'Water' && ab === 'waterabsorb')) return 0;
  const eff = Math.pow(2, dex.getEffectiveness(type, def.types));
  if (ab === 'wonderguard' && eff <= 1) return 0;
  if (FIXED[mv.id]) return FIXED[mv.id](att);
  if (mv.id === 'superfang') return Math.floor(def.hp / 2);
  if (mv.id === 'endeavor') return Math.max(0, def.hp - att.hp);
  if (mv.ohko || mv.id === 'counter' || mv.id === 'mirrorcoat' || mv.id === 'bide') return 0;
  let bp = basePower(mv, att, def, weather);
  if (!bp) return 0;
  const special = categoryOf(mv, type) === 'Special';
  let A = boosted(att, special ? 'spa' : 'atk'), D = boosted(def, special ? 'spd' : 'def');
  if (mv.id === 'explosion' || mv.id === 'selfdestruct') D /= 2;
  if (!special && att.item === 'choiceband') A *= 1.5;
  if (!special && (att.ability === 'hugepower' || att.ability === 'purepower')) A *= 2;
  if (!special && att.ability === 'hustle') A *= 1.5;
  if (!special && att.ability === 'guts' && att.status) A *= 1.5;
  if (special && att.item === 'lightball' && toID(att.species) === 'pikachu') A *= 2;
  if (TYPE_ITEMS[att.item] === type) bp *= 1.1;
  if (!special && def.ability === 'marvelscale' && def.status) D *= 1.5;
  if (def.ability === 'thickfat' && (type === 'Fire' || type === 'Ice')) A /= 2;
  if (att.hp <= att.maxhp / 3 && ((type === 'Grass' && att.ability === 'overgrow') || (type === 'Fire' && att.ability === 'blaze') || (type === 'Water' && att.ability === 'torrent') || (type === 'Bug' && att.ability === 'swarm'))) bp *= 1.5;
  let d = Math.floor(Math.floor(Math.floor(2 * att.level / 5 + 2) * bp * A / Math.max(1, D)) / 50);
  if (!special && att.status === 'brn' && att.ability !== 'guts') d = Math.floor(d / 2);
  if (screens && ((special && screens.lightscreen) || (!special && screens.reflect))) d = Math.floor(d / 2);
  if (weather === 'RainDance') { if (type === 'Water') d *= 1.5; else if (type === 'Fire') d *= 0.5; }
  if (weather === 'SunnyDay') { if (type === 'Fire') d *= 1.5; else if (type === 'Water') d *= 0.5; }
  d += 2;
  if (att.types.includes(type)) d *= 1.5;
  d *= eff;
  let hits = 1;
  if (mv.multihit) hits = Array.isArray(mv.multihit) ? (att.ability === 'skilllink' ? mv.multihit[1] : 3) : mv.multihit;
  return Math.floor(d * 0.925) * hits;
}

function bestHit(att, def, weather, screens, usable) {
  let best = { id: null, dmg: 0, exp: 0, acc: 1 };
  for (const id of usable || att.moves) {
    const mv = dex.moves.get(id), d = damage(att, def, id, weather, screens);
    const acc = mv.accuracy === true ? 1 : mv.accuracy / 100;
    if (d * acc > best.exp) best = { id, dmg: d, exp: d * acc, acc, priority: mv.priority };
  }
  return best;
}

function speedOf(f, weather) {
  let s = boosted(f, 'spe');
  if (f.status === 'par') s /= 4;
  if ((weather === 'RainDance' && f.ability === 'swiftswim') || (weather === 'SunnyDay' && f.ability === 'chlorophyll')) s *= 2;
  return s;
}

/** For the team page: how hard each of today's Pokémon hits each of Red's, and the other way round (in % of HP). */
function matchups(team) {
  const mine = team.map(fighterFromSet), red = RED_TEAM.map(fighterFromSet);
  return red.map(r => ({
    species: r.species,
    rows: mine.map(m => {
      const out = bestHit(m, r), back = bestHit(r, m);
      return { species: m.species, deal: Math.min(100, Math.round(out.dmg / r.maxhp * 100)), dealMove: out.id ? dex.moves.get(out.id).name : '',
        take: Math.min(100, Math.round(back.dmg / m.maxhp * 100)), takeMove: back.id ? dex.moves.get(back.id).name : '',
        faster: speedOf(m) > speedOf(r) ? 1 : speedOf(m) < speedOf(r) ? -1 : 0 };
    }),
  }));
}

// ---------- Red's choices ----------
const SETUP = new Set(['calmmind', 'curse', 'swordsdance', 'dragondance', 'bulkup', 'agility', 'growth', 'nastyplot', 'bellydrum']);
const HEAL = new Set(['morningsun', 'synthesis', 'moonlight', 'recover', 'softboiled', 'milkdrink', 'slackoff']);
const STATUS_MOVES = new Set(['sleeppowder', 'spore', 'hypnosis', 'toxic', 'thunderwave', 'willowisp', 'stunspore', 'glare', 'lovelykiss', 'sing']);

/**
 * Picks Red's choice for a request: knock out what he can, switch away from a Pokémon that would be knocked
 * out first when a teammate takes the hit much better, set up or heal when it's safe, otherwise hit hardest.
 */
function redChoose(b, side, req) {
  const battle = b.stream.battle;
  const me = battle.sides[side === 'p1' ? 0 : 1];
  const foeMon = me.foe.active[0];
  const weather = battle.field.weather || '';
  const myScreens = { reflect: !!me.sideConditions.reflect, lightscreen: !!me.sideConditions.lightscreen };
  const foeScreens = { reflect: !!me.foe.sideConditions.reflect, lightscreen: !!me.foe.sideConditions.lightscreen };
  const party = req.side.pokemon;
  const bench = party.map((p, i) => ({ p, slot: i + 1, mon: me.pokemon[i] })).filter(x => !x.p.active && !x.p.condition.endsWith(' fnt'));
  const foe = fighterFromMon(foeMon);
  b.ai = b.ai || {};
  const memo = b.ai[side] = b.ai[side] || { lastSwitchTurn: -5 };

  // How a benched Pokémon would fare coming in now: damage it deals minus damage it takes, both in % of HP.
  const rateIn = x => {
    const f = fighterFromMon(x.mon);
    if (!foe || !f) return 0;
    const take = bestHit(foe, f, weather, myScreens).exp / f.maxhp, deal = bestHit(f, foe, weather, foeScreens).exp / Math.max(1, foe.hp);
    return Math.min(1, deal) - take * 1.2 + (speedOf(f, weather) > speedOf(foe, weather) ? 0.15 : 0) + f.hp / f.maxhp * 0.2;
  };

  if (req.forceSwitch) {
    if (!bench.length) return 'pass';
    bench.sort((a, c) => rateIn(c) - rateIn(a));
    return 'switch ' + bench[0].slot;
  }
  if (!req.active) return 'default';

  const act = req.active[0], meMon = me.active[0], self = fighterFromMon(meMon);
  const usable = act.moves.map((m, i) => ({ m, i })).filter(x => !x.m.disabled && !(x.m.pp !== undefined && x.m.pp <= 0));
  if (!usable.length || !foe || !self) return 'default';
  const only = usable.length === 1 && act.moves.length === 1; // Struggle or a locked move
  if (only) return 'move 1';

  const faster = speedOf(self, weather) > speedOf(foe, weather);
  const threat = bestHit(foe, self, weather, myScreens);
  const dies = threat.dmg >= self.hp;
  const choices = usable.map(({ m, i }) => {
    const id = toID(m.id), mv = dex.moves.get(id), d = damage(self, foe, id, weather, foeScreens);
    const acc = mv.accuracy === true ? 1 : mv.accuracy / 100;
    return { slot: i + 1, id, mv, dmg: d, exp: d * acc, acc, kos: d >= foe.hp, priority: mv.priority || 0 };
  });
  const pick = c => 'move ' + c.slot;
  const attacks = choices.filter(c => c.dmg > 0).sort((a, c) => c.exp - a.exp);

  // 1. A knockout that lands before the foe moves.
  const kos = attacks.filter(c => c.kos && (faster || c.priority > 0 || !dies)).sort((a, c) => (c.priority - a.priority) || (c.acc - a.acc));
  if (kos.length) return pick(kos[0]);

  // 2. About to be knocked out first: switch to a teammate that takes it well, unless Red just switched.
  const turn = battle.turn;
  if (dies && !faster && !act.trapped && bench.length && turn - memo.lastSwitchTurn > 1) {
    const rated = bench.map(x => ({ x, r: rateIn(x), take: bestHit(foe, fighterFromMon(x.mon), weather, myScreens).exp / x.mon.maxhp })).sort((a, c) => c.r - a.r);
    if (rated[0] && rated[0].take < 0.45 && Math.random() < 0.8) { memo.lastSwitchTurn = turn; return 'switch ' + rated[0].x.slot; }
  }

  const safe = threat.exp < self.hp * 0.3;
  const hpPct = self.hp / self.maxhp;
  // 3. Heal when low and the foe can't undo it.
  const heal = choices.find(c => HEAL.has(c.id));
  if (heal && hpPct < 0.5 && threat.exp < self.maxhp * 0.45) return pick(heal);
  const rest = choices.find(c => c.id === 'rest');
  if (rest && hpPct < 0.4 && self.status !== 'slp' && threat.dmg < self.maxhp) return pick(rest);
  // 4. Set up while the foe barely scratches him.
  const setup = choices.find(c => SETUP.has(c.id));
  const boosts = (self.boosts.spa || 0) + (self.boosts.atk || 0);
  if (setup && safe && hpPct > 0.6 && boosts < 4 && !(setup.id === 'curse' && self.types.includes('Ghost'))) return pick(setup);
  // 5. Put the foe to sleep, poison or paralyse it if it has no status yet and Red can't hit it hard.
  const status = choices.find(c => STATUS_MOVES.has(c.id));
  const bestPct = attacks.length ? attacks[0].exp / foe.hp : 0;
  if (status && !foe.status && bestPct < 0.55 && !(status.id === 'toxic' && (foe.types.includes('Poison') || foe.types.includes('Steel')))
    && !(status.id === 'thunderwave' && foe.types.includes('Ground')) && !foe.volatiles.includes('substitute') && Math.random() < 0.75) return pick(status);
  // 6. Hit hardest (a little variety between close options).
  if (attacks.length) {
    const top = attacks.filter(c => c.exp >= attacks[0].exp * 0.9);
    return pick(top[Math.floor(Math.random() * top.length)]);
  }
  const any = choices.filter(c => !(c.id === 'rest' && hpPct > 0.7));
  return pick(any.length ? any[Math.floor(Math.random() * any.length)] : choices[0]);
}

module.exports = { FORMAT, RED_TEAM, teamOf, view, matchups, redChoose, seedOf };
