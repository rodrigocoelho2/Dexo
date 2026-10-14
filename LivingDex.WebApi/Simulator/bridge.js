'use strict';
// Living Dex ⇄ Pokémon Showdown bridge.
// One long-lived process hosts many battles. It speaks JSON lines:
//   stdin : {op:"start", id, format, p1:{name,cpu}, p2:{name,cpu}, teams?:{p1:[set],p2:[set]}}
//           {op:"pool", id, format, size}     (draft: random-battle sets to pick from)
//           {op:"dailyteam", id, date}        (Daily Red: the day's team, Red's team and their matchups)
//           {op:"choose", id, side:"p1"|"p2", choice:"move 1"|"switch 3"|"default"}
//           {op:"forfeit", id, side}
//           {op:"end", id}
//   stdout: {id, type:"chunk", stream:"p1"|"p2"|"spectator", data}
//           {id, type:"request", side, request, deadlineHint}
//           {id, type:"ack", side, ok, error}
//           {id, type:"end", winner, turns, teams}
//           {id, type:"pool", pool:[{set, species, num, types, level, item, ability, moves:[{name,type}]}]}
//           {id, type:"dailyteam", sets:[set], team:[view], red:[view], matchups:[…]}
// Daily Red battles start with format "gen3customgame", the day's team as teams.p1 and p2.ai = "red"
// (Red's fixed team and his damage-based choices, see dailyred.js).
//           {type:"ready"} / {id, type:"error", message}
const readline = require('readline');
const { BattleStream, getPlayerStreams, Dex, Teams } = require('pokemon-showdown');
const daily = require('./dailyred');

const FORMATS = new Set(['gen1randombattle', 'gen2randombattle', 'gen3randombattle', 'gen4randombattle', 'gen5randombattle', daily.FORMAT]);
const battles = new Map();
// SIM_NO_DELAY=1 makes CPU players answer at once (for scripted test runs).
const NO_DELAY = process.env.SIM_NO_DELAY === '1';

function out(obj) { process.stdout.write(JSON.stringify(obj) + '\n'); }

function sideOf(b, side) { return b.stream.battle && b.stream.battle.sides[side === 'p1' ? 0 : 1]; }

// Adds type / category / power / effectiveness to each move, and types to each party member,
// computed with the battle's own dex so every generation gets its own rules.
function enrich(b, side, req) {
  const battle = b.stream.battle;
  if (!battle) return req;
  const me = sideOf(b, side);
  const foe = me.foe;
  const dex = battle.dex;
  const target = foe && foe.active[0] && !foe.active[0].fainted ? foe.active[0] : null;
  if (req.side && req.side.pokemon) {
    req.side.pokemon.forEach((p, i) => {
      const mon = me.pokemon[i];
      if (mon) {
        p.types = mon.getTypes(); p.speciesId = mon.species.id; p.baseSpecies = mon.species.baseSpecies; p.num = mon.species.num;
        p.moveNames = mon.moveSlots.map(s => s.move);
        if (p.item) p.itemName = dex.items.get(p.item).name;
        if (p.baseAbility) p.abilityName = dex.abilities.get(p.baseAbility).name;
      }
    });
  }
  if (req.active) {
    req.active.forEach((a, ai) => {
      const user = me.active[ai];
      (a.moves || []).forEach(m => {
        const mv = dex.moves.get(m.id);
        if (!mv.exists) return;
        let type = mv.type;
        if (mv.id.startsWith('hiddenpower') && user) type = user.hpType || type;
        m.type = type;
        // Gens 1–3: physical or special by type, which matters for Hidden Power.
        m.category = battle.gen <= 3 && mv.category !== 'Status' ? (['Fire', 'Water', 'Grass', 'Electric', 'Ice', 'Psychic', 'Dragon', 'Dark'].includes(type) ? 'Special' : 'Physical') : mv.category;
        m.basePower = mv.basePower;
        m.accuracy = mv.accuracy === true ? 0 : mv.accuracy;
        m.desc = mv.shortDesc || mv.desc || '';
        if (target && mv.category !== 'Status') {
          if (!dex.getImmunity(type, target.getTypes())) m.eff = 0;
          else m.eff = Math.pow(2, dex.getEffectiveness(type, target.getTypes()));
        }
      });
    });
  }
  if (target) req.foe = { species: target.species.name, types: target.getTypes() };
  return req;
}

// ---------- CPU opponent ----------
function cpuChoose(b, side, req) {
  const battle = b.stream.battle;
  const me = sideOf(b, side);
  const foe = me.foe.active[0];
  const dex = battle.dex;
  const party = req.side.pokemon;
  const switchable = party.map((p, i) => ({ p, slot: i + 1 })).filter(x => !x.p.active && !x.p.condition.endsWith(' fnt'));
  const scoreMon = x => {
    const mon = me.pokemon[x.slot - 1];
    if (!foe || !mon) return Math.random();
    let s = 0;
    for (const t of foe.getTypes()) s -= dex.getEffectiveness(t, mon.getTypes());
    for (const t of mon.getTypes()) s += dex.getEffectiveness(t, foe.getTypes()) * 0.5;
    return s + Math.random() * 0.6 + (mon.hp / mon.maxhp) * 0.5;
  };
  if (req.forceSwitch) {
    if (!switchable.length) return 'pass';
    switchable.sort((a, c) => scoreMon(c) - scoreMon(a));
    return 'switch ' + switchable[0].slot;
  }
  if (!req.active) return 'default';
  const act = req.active[0];
  const user = me.active[0];
  const options = [];
  act.moves.forEach((m, i) => {
    if (m.disabled || (m.pp !== undefined && m.pp <= 0 && !act.trapped && act.moves.length > 1)) return;
    const mv = dex.moves.get(m.id);
    let score;
    if (!mv.exists || mv.category === 'Status') {
      score = 35 + Math.random() * 40;
      if (mv.id === 'protect' || mv.id === 'detect') score = 15;
      if (mv.status && foe && foe.status) score = 2;
      if (mv.boosts && mv.target === 'self' && user && user.hp < user.maxhp / 2) score = 10;
      if (mv.heal && user && user.hp > user.maxhp * 0.7) score = 5;
    } else {
      let type = mv.type;
      if (mv.id.startsWith('hiddenpower') && user) type = user.hpType || type;
      let bp = mv.basePower || 60;
      if (mv.multihit) bp *= Array.isArray(mv.multihit) ? 3 : mv.multihit;
      if (mv.ohko) bp = 70;
      let eff = 1;
      if (foe) {
        if (!dex.getImmunity(type, foe.getTypes())) eff = 0;
        else eff = Math.pow(2, dex.getEffectiveness(type, foe.getTypes()));
      }
      const stab = user && user.getTypes().includes(type) ? 1.5 : 1;
      const acc = mv.accuracy === true ? 1 : mv.accuracy / 100;
      score = bp * eff * stab * acc * (0.85 + Math.random() * 0.3);
      if (mv.selfdestruct && user && user.hp > user.maxhp / 3) score *= 0.3;
    }
    options.push({ choice: 'move ' + (i + 1), score });
  });
  const best = options.sort((a, c) => c.score - a.score)[0];
  // Switch out when every attack is weak and a better partner exists.
  if (!act.trapped && switchable.length && (!best || best.score < 25) && Math.random() < 0.6) {
    switchable.sort((a, c) => scoreMon(c) - scoreMon(a));
    return 'switch ' + switchable[0].slot;
  }
  return best ? best.choice : 'default';
}

function choose(b, side, choice) {
  const s = sideOf(b, side);
  if (!s) return;
  b.streams[side].write(choice);
  // BattleStream processes writes synchronously, so the side's state is final here, and the
  // ack goes out before any request the choice produced (those arrive via the async pumps).
  const err = s.choice && s.choice.error;
  out({ id: b.id, type: 'ack', side, ok: !err, error: err || '' });
}

function teamSummary(side) {
  return side.pokemon.map(p => ({
    species: p.species.name,
    baseSpecies: p.species.baseSpecies,
    num: p.species.num,
    speciesId: p.species.id,
    level: p.level,
    gender: p.gender || '',
    shiny: !!p.set.shiny,
    hp: p.hp, maxhp: p.maxhp,
    fainted: p.fainted || p.hp <= 0,
  }));
}

function finish(b) {
  if (b.finished) return;
  const battle = b.stream.battle;
  if (!battle || !battle.ended) return;
  b.finished = true;
  out({
    id: b.id, type: 'end',
    winner: battle.winner || '',
    turns: battle.turn,
    teams: battle.sides.map(teamSummary),
  });
}

async function pump(b, name) {
  const stream = b.streams[name];
  for await (const chunk of stream) {
    if (name === 'omniscient') { setImmediate(() => finish(b)); continue; }
    const lines = chunk.split('\n');
    const rest = [];
    for (const line of lines) {
      if (line.startsWith('|request|')) {
        let req;
        try { req = JSON.parse(line.slice(9)); } catch { continue; }
        enrich(b, name, req);
        out({ id: b.id, type: 'request', side: name, request: req });
        if (b.cpu[name] && !req.wait && !req.teamPreview) {
          const pickFor = b.smart[name] ? daily.redChoose : cpuChoose;
          setTimeout(() => {
            if (b.finished) return;
            let c;
            try { c = pickFor(b, name, req); } catch (e) { out({ id: b.id, type: 'error', message: 'ai: ' + String(e && e.stack || e) }); c = cpuChoose(b, name, req); }
            choose(b, name, c);
          }, (NO_DELAY ? 0 : 600 + Math.random() * 900));
        } else if (b.cpu[name] && req.teamPreview) {
          setTimeout(() => choose(b, name, 'default'), 300);
        }
      } else rest.push(line);
    }
    const data = rest.join('\n').trim();
    if (data) out({ id: b.id, type: 'chunk', stream: name, data });
  }
}

// Draft pool: sets from the format's own random-battle generator, one per species line.
function pool(msg) {
  const format = FORMATS.has(msg.format) ? msg.format : 'gen5randombattle';
  const gen = +format[3] || 5, dex = Dex.forGen(gen), size = Math.max(4, Math.min(24, msg.size | 0 || 16));
  const generator = Teams.getGenerator(format), seen = new Set(), sets = [];
  for (let tries = 0; sets.length < size && tries < 20; tries++) {
    for (const set of generator.getTeam()) {
      const sp = dex.species.get(set.species);
      if (!sp.exists || seen.has(sp.baseSpecies)) continue;
      seen.add(sp.baseSpecies); sets.push(set);
      if (sets.length >= size) break;
    }
  }
  out({
    id: msg.id, type: 'pool',
    pool: sets.map(set => {
      const sp = dex.species.get(set.species);
      return {
        set, species: sp.name, baseSpecies: sp.baseSpecies, speciesId: sp.id, num: sp.num, types: sp.types,
        level: set.level || 100, gender: set.gender || '', shiny: !!set.shiny,
        item: set.item ? dex.items.get(set.item).name : '',
        ability: set.ability && set.ability !== 'No Ability' ? dex.abilities.get(set.ability).name : '',
        moves: set.moves.map(id => { const mv = dex.moves.get(id); let type = mv.type;
          if (mv.id.startsWith('hiddenpower')) type = mv.id.length > 11 ? mv.type : 'Normal';
          return { name: mv.exists ? mv.name : id, type }; }),
      };
    }),
  });
}

function start(msg) {
  if (battles.has(msg.id)) return out({ id: msg.id, type: 'error', message: 'duplicate id' });
  const format = FORMATS.has(msg.format) ? msg.format : 'gen5randombattle';
  const stream = new BattleStream();
  const streams = getPlayerStreams(stream);
  const b = { id: msg.id, stream, streams, cpu: { p1: !!msg.p1.cpu, p2: !!msg.p2.cpu }, finished: false,
    smart: { p1: !!msg.p1.ai, p2: !!msg.p2.ai } };
  battles.set(msg.id, b);
  for (const n of ['p1', 'p2', 'spectator', 'omniscient']) {
    pump(b, n).catch(e => out({ id: b.id, type: 'error', message: String(e && e.stack || e) }));
  }
  const spec = { formatid: format };
  streams.omniscient.write(
    `>start ${JSON.stringify(spec)}\n` +
    `>player p1 ${JSON.stringify(player(msg, 'p1'))}\n` +
    `>player p2 ${JSON.stringify(player(msg, 'p2'))}`
  );
}

// Draft battles bring their own teams (already in battle order, lead first); others are generated.
function player(msg, side) {
  const p = { name: msg[side].name };
  const team = msg[side].ai === 'red' ? daily.RED_TEAM : msg.teams && msg.teams[side];
  if (Array.isArray(team) && team.length) p.team = Teams.pack(team);
  return p;
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', line => {
  line = line.trim();
  if (!line) return;
  let msg;
  try { msg = JSON.parse(line); } catch { return out({ type: 'error', message: 'bad json' }); }
  try {
    if (msg.op === 'start') return start(msg);
    if (msg.op === 'ping') return out({ type: 'pong' });
    if (msg.op === 'pool') return pool(msg);
    if (msg.op === 'dailyteam') {
      const sets = daily.teamOf(String(msg.date || ''));
      return out({ id: msg.id, type: 'dailyteam', sets, team: sets.map(daily.view), red: daily.RED_TEAM.map(daily.view), matchups: daily.matchups(sets) });
    }
    const b = battles.get(msg.id);
    if (!b) return out({ id: msg.id, type: 'error', message: 'unknown battle' });
    if (msg.op === 'choose') {
      if (b.finished) return;
      const c = String(msg.choice || '');
      if (!/^(move [1-4]|switch [1-6]|default|pass)$/.test(c)) return out({ id: b.id, type: 'ack', side: msg.side, ok: false, error: 'invalid choice' });
      return choose(b, msg.side === 'p2' ? 'p2' : 'p1', c);
    }
    if (msg.op === 'forfeit') {
      if (b.finished) return;
      b.streams.omniscient.write(`>forcelose ${msg.side === 'p2' ? 'p2' : 'p1'}`);
      return;
    }
    if (msg.op === 'end') {
      b.finished = true;
      try { b.stream.destroy(); } catch { }
      battles.delete(msg.id);
      return;
    }
  } catch (e) {
    out({ id: msg.id, type: 'error', message: String(e && e.stack || e) });
  }
});
rl.on('close', () => process.exit(0));
out({ type: 'ready', formats: [...FORMATS] });
