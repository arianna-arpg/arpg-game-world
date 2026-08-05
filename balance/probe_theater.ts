// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE THEATER FABRIC (engine/theater.ts + data/theater.ts):
// the on-entry zone-event lane's re-founding, live on the real engine.
//
// Pins: THE DRAW LAW (pure keyed streams — same seed, same beats, byte-equal
// replay across two worlds; ZERO global-die consumption by the draw phase),
// THE ANTI-STARVATION LAW (each kind draws its OWN stream — a later kind
// seats on a beat the earlier kind's draw lost; the old one-shared-roll
// first-bite cascade is dead, and the probe recomputes the engine's exact
// draw to prove drawn == tested), kind priority (sieges before patrols, as
// ever — registration order pinned), THE RESIDENT LAW's gates (arcless: no
// reward verb anywhere on the run surface and payEventReward is GONE from
// World; unannounced: the fabric's two modules are source-scanned for omen/
// bulletin surfaces; quiet ground: safe zones stamp theaterQuiet at boot),
// THE POUR LEDGER (an additive QA kind stops cleanly AT its cap; a
// replacement QA kind pours its entry cast whole — the parity floor — then
// the spent band refuses every dwell re-pour: THE FARM LAW), THE DWELL
// CADENCE (standing on un-quiet ground fires beats on the lattice), THE
// CONCURRENCY LEVER (ground default + the external-writer seam folding UP,
// proven with a QA writer and unregistered clean; the per-kind singleton
// spends extra seats on kind DIVERSITY), THE PASS-THROUGH MARCH (a QA
// column enters, crosses, and LEAVES — silent departure, no corpses, the
// ground returns to its baseline), THE LEGACY SIEGE re-founded (today's
// 5-on-4 cast forms whole at entry; a spent siege ends with no payout arc),
// and THE CAST (movement two): the TROOP MARCH's exits-pair true walk, the
// FUNERAL's paced cortege (speedMul stands, lifts on dissolve), the HUNTING
// PARTY's additive burst (standing 'critter' tag + the capped pour), the
// CART GUARD's road-walked column wheeling its driven cart, and the WATCH
// CHANGE's bodiless reversible lean (offstage + endWhen 'rowCond' — seats
// stream-silent, leans draw-free, reverts byte-exact on its closing tick).
// Run: npx tsx balance/probe_theater.ts
// ---------------------------------------------------------------------------

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { dist, vec } from '../src/core/math';
import { updateAI } from '../src/engine/ai';
import {
  ActiveTheaterRun, THEATER_CFG, registerTheaterConcurrency, registerTheaterKind,
  swapTheaterRows, theaterKindDef, theaterKinds, theaterNeedsMet,
  theaterRng, theaterRowEligible, theaterRows, unregisterTheaterConcurrency,
  marchSpawn, marchTick,
  type TheaterContext, type TheaterRow, type TheaterSpots,
} from '../src/engine/theater';
import { FACTIONS, factionStance } from '../src/data/monsters';
import type { World } from '../src/engine/world';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x7e47e2);

const step = (w: World, seconds: number): void => {
  const dt = 1 / 60;
  for (let t = 0; t < seconds - 1e-9; t += dt) {
    w.applyInputs(new Map(), dt);
    for (const a of [...w.actors]) updateAI(a, w, dt);
    w.update(dt);
  }
};

/** A rich fabricated context (the zone's standing truth, handed — the same
 *  seam eventqa always drove, now against the live beat engine). */
const ctxOf = (over: Partial<TheaterContext> = {}): TheaterContext => ({
  owner: 'goblin', ownerPower: 60, biome: undefined, contestants: ['goblin'],
  invader: null, hasCamps: true, hasRoute: true, nearHome: true, ...over,
});

const SPOTS: TheaterSpots = {
  camps: [vec(400, 300), vec(1200, 300)],
  pois: [vec(400, 900), vec(1200, 900), vec(800, 200)],
};

// --- 1) The registry + kind priority (sieges before patrols, as ever; the
// cast between the legacy pair and the war column — data/theater registers
// whole before data/warfront, so registration order IS import order) -------
{
  const ids = theaterKinds().map(k => k.id);
  const CAST = ['troop_march', 'funeral', 'hunting_party', 'cart_guard', 'watch_change'];
  check('registry: the legacy pair keeps the head of the order',
    ids[0] === 'siege' && ids[1] === 'patrol', `order [${ids.slice(0, 2).join(', ')}]`);
  check('registry: the cast stands registered (movement two shipped)',
    CAST.every(k => ids.includes(k)));
  check('registry: the war column still marches with its country — after the cast',
    CAST.every(k => ids.indexOf('war_column') > ids.indexOf(k)));
  check('registry: night/day rows stand for the legacy three (the literals died into rows)',
    ['siege', 'patrol', 'war_column'].every(k =>
      theaterRows().filter(r => r.kind === k).length === 2));
  check('registry: the hunting party alone ships additive (the burst IS the supply)',
    theaterKinds().filter(k => !k.id.startsWith('qa_')).every(k =>
      k.posture === (k.id === 'hunting_party' ? 'additive' : 'replacement')));
  check('registry: the watch change alone ships offstage + endWhen (the bodiless lean)',
    theaterKinds().filter(k => !k.id.startsWith('qa_')).every(k =>
      (k.offstage === true) === (k.id === 'watch_change')
      && (k.endWhen === 'rowCond') === (k.id === 'watch_change')));
}

// --- 2) Eligibility + needs (the pure gates) ---------------------------------
{
  const siege = theaterKindDef('siege')!;
  const hostile = Object.keys(FACTIONS).find(f => f !== 'goblin' && factionStance(f, 'goblin') === 'hostile');
  if (hostile) {
    check('needs: the siege wants a genuinely hostile invader',
      theaterNeedsMet(siege, ctxOf({ invader: hostile }), factionStance)
      && !theaterNeedsMet(siege, ctxOf(), factionStance)
      && !theaterNeedsMet(siege, ctxOf({ invader: 'goblin' }), factionStance));
  } else {
    check('needs: no faction hostile to goblins this build — siege needs untestable, skipped', true);
  }
  const patrol = theaterKindDef('patrol')!;
  check('needs: the patrol wants owned home ground with a route',
    theaterNeedsMet(patrol, ctxOf(), factionStance)
    && !theaterNeedsMet(patrol, ctxOf({ owner: null }), factionStance)
    && !theaterNeedsMet(patrol, ctxOf({ nearHome: false }), factionStance)
    && !theaterNeedsMet(patrol, ctxOf({ hasRoute: false }), factionStance));
  const row: TheaterRow = { id: 'x', kind: 'x', chance: 1, biomes: ['warfront'], factions: ['demon'], grounds: ['invaded'] };
  check('rows: authored axes AND together (biome × faction × ground × hour)',
    theaterRowEligible(row, ctxOf({ biome: 'warfront', owner: 'demon', invader: 'sylvan' }), () => true)
    && !theaterRowEligible(row, ctxOf({ biome: 'grove', owner: 'demon', invader: 'sylvan' }), () => true)
    && !theaterRowEligible(row, ctxOf({ biome: 'warfront', owner: 'goblin', invader: 'sylvan' }), () => true)
    && !theaterRowEligible(row, ctxOf({ biome: 'warfront', owner: 'demon' }), () => true)
    && !theaterRowEligible(row, ctxOf({ biome: 'warfront', owner: 'demon', invader: 'sylvan' }), () => false));
}

// --- 3) The resident law, structural -----------------------------------------
{
  const w = makeSimWorld('warrior', 0x7e47e2);
  check('arcless: payEventReward is GONE from World (no payout verb exists)',
    (w as unknown as Record<string, unknown>).payEventReward === undefined);
  check('arcless: the run surface has no reward verb',
    !('reward' in ActiveTheaterRun.prototype));
  const here = path.dirname(fileURLToPath(import.meta.url));
  const src = (p: string): string => fs.readFileSync(path.join(here, '..', 'src', p), 'utf8');
  const fabric = src('engine/theater.ts') + src('data/theater.ts');
  check('unannounced: the fabric imports no omen/bulletin/sounding surface',
    !/from ['"][^'"]*omens['"]/.test(fabric)
    && !/from ['"][^'"]*bulletins['"]/.test(fabric)
    && !/registerOmenSource|postBulletin|requestSoundings/.test(fabric));
  check('quiet ground: the safe arena boots theaterQuiet (no entry beat, no cadence)',
    w.theaterQuiet === true && w.theaterRuns.length === 0);
  check('boot: the visit ordinal stamped (the stash block runs ungated)',
    w.theaterVisit === 1);
}

// --- 4) The draw law: keyed purity + zero global-die consumption -------------
{
  const w = makeSimWorld('warrior', 0x7e47e2);
  const a = theaterRng(1234, 'zone_x', 1, 'patrol', 7).next();
  const b = theaterRng(1234, 'zone_x', 1, 'patrol', 7).next();
  const c = theaterRng(1234, 'zone_x', 1, 'siege', 7).next();
  const d = theaterRng(1234, 'zone_x', 2, 'patrol', 7).next();
  check('draws: pure keyed replay (same key same float; kind and visit fork the stream)',
    a === b && a !== c && a !== d);
  // Rowless ground consumes NOTHING from the global die (absent == silent).
  const prior = swapTheaterRows([]);
  seedGlobalRandom(0xd1e001);
  const ref = Math.random();
  seedGlobalRandom(0xd1e001);
  w.theaterSpots = SPOTS;
  w.theaterRunBeat(0, ctxOf());
  const after = Math.random();
  check('absent: a rowless beat seats nothing and consumes no global draw',
    after === ref && w.theaterRuns.length === 0 && w.theaterPour.size === 0);
  swapTheaterRows(prior);
  // A LOSING draw (rows present, chance too small at this key) also consumes
  // no global randomness — the whole draw phase lives on keyed streams.
  const prior2 = swapTheaterRows([{ id: 'qa_never', kind: 'patrol', chance: 1e-9 }]);
  seedGlobalRandom(0xd1e002);
  const ref2 = Math.random();
  seedGlobalRandom(0xd1e002);
  w.theaterRunBeat(1, ctxOf());
  check('draws: a losing beat consumes no global draw either',
    Math.random() === ref2 && w.theaterRuns.length === 0);
  swapTheaterRows(prior2);
}

// --- QA kinds (registered AFTER the priority pin — probe-process only) -------
const qaSeats: { kind: string; beat: number }[] = [];
registerTheaterKind({
  id: 'qa_theater_a', posture: 'additive', pourCap: 999,
  cast: () => ({ primary: 'goblin' }),
  spawn: (_w, run) => { qaSeats.push({ kind: run.kind, beat: run.beat }); },
  tick: (_w, run) => { run.done = true; },
});
registerTheaterKind({
  id: 'qa_theater_b', posture: 'additive', pourCap: 999,
  cast: () => ({ primary: 'goblin' }),
  spawn: (_w, run) => { qaSeats.push({ kind: run.kind, beat: run.beat }); },
  tick: (_w, run) => { run.done = true; },
});

// --- 5) Anti-starvation: the first-bite cascade is dead ----------------------
{
  const w = makeSimWorld('warrior', 0x7e47e2);
  w.theaterSpots = SPOTS;
  w.theaterAmbientBudget = 40;
  const prior = swapTheaterRows([
    { id: 'qa_a_row', kind: 'qa_theater_a', chance: 0.5 },
    { id: 'qa_b_row', kind: 'qa_theater_b', chance: 0.95 },
  ]);
  // Recompute the engine's own draws (drawn == tested): find a beat where
  // the FIRST kind's draw loses and the SECOND's wins — under the old
  // shared roll the second could never fire there (its threshold was the
  // same die); under per-kind streams it seats.
  const seed = w.manifest.seed, zid = w.zone.id, visit = w.theaterVisit;
  let starvedBeat = -1;
  for (let beat = 0; beat < 64 && starvedBeat < 0; beat++) {
    const aWins = theaterRng(seed, zid, visit, 'qa_theater_a', beat).next() < 0.5;
    const bWins = theaterRng(seed, zid, visit, 'qa_theater_b', beat).next() < 0.95;
    if (!aWins && bWins) starvedBeat = beat;
  }
  check('anti-starvation: a beat exists where the first kind loses and the second wins',
    starvedBeat >= 0, `beat ${starvedBeat}`);
  if (starvedBeat >= 0) {
    qaSeats.length = 0;
    w.theaterRuns.length = 0;
    w.theaterPour.clear();
    w.theaterRunBeat(starvedBeat, ctxOf());
    check('anti-starvation: the second kind SEATS on that beat (the cascade is dead)',
      qaSeats.length === 1 && qaSeats[0].kind === 'qa_theater_b');
  }
  swapTheaterRows(prior);
}

// --- 6) Determinism: two worlds, one seed, byte-equal seat sequence ----------
{
  const prior = swapTheaterRows([
    { id: 'qa_a_row', kind: 'qa_theater_a', chance: 0.5 },
    { id: 'qa_b_row', kind: 'qa_theater_b', chance: 0.5 },
  ]);
  const runSeq = (): string => {
    const w = makeSimWorld('warrior', 0xbead77);
    w.theaterSpots = SPOTS;
    w.theaterAmbientBudget = 40;
    qaSeats.length = 0;
    for (let beat = 0; beat < 24; beat++) {
      w.theaterRuns.length = 0;
      w.theaterPour.clear();
      w.theaterRunBeat(beat, ctxOf());
    }
    return qaSeats.map(s => `${s.kind}@${s.beat}`).join(',');
  };
  const s1 = runSeq(), s2 = runSeq();
  check('determinism: same seed, same walk ⇒ identical seat sequence', s1 === s2, s1 || '(empty)');
  check('determinism: the window exercises both outcomes (seats and misses)',
    s1.length > 0 && s1.split(',').length < 24 * 2);
  swapTheaterRows(prior);
}

// --- 7) The concurrency lever + the writer seam ------------------------------
{
  const w = makeSimWorld('warrior', 0x7e47e2);
  const base = w.theaterConcurrencyNow();
  check('concurrency: unowned small ground holds the base seat', base === 1, `got ${base}`);
  registerTheaterConcurrency('qa_odyssey', () => 4);
  check('concurrency: an external writer PUSHES the fold up (the Odyssey seam)',
    w.theaterConcurrencyNow() === 4);
  registerTheaterConcurrency('qa_low', () => 0);
  check('concurrency: a writer can never shrink the ground\'s own law',
    w.theaterConcurrencyNow() === 4);
  unregisterTheaterConcurrency('qa_odyssey');
  unregisterTheaterConcurrency('qa_low');
  check('concurrency: unregistered writers restore the ground default',
    w.theaterConcurrencyNow() === 1);
  // The per-kind singleton spends extra seats on kind DIVERSITY: with a live
  // qa_a run standing and room for more, a qa_a row is skipped and qa_b seats.
  const prior = swapTheaterRows([
    { id: 'qa_a_row', kind: 'qa_theater_a', chance: 1 },
    { id: 'qa_b_row', kind: 'qa_theater_b', chance: 1 },
  ]);
  registerTheaterConcurrency('qa_wide', () => 4);
  w.theaterSpots = SPOTS;
  qaSeats.length = 0;
  w.theaterRunBeat(1, ctxOf());
  const firstSeat = qaSeats[0]?.kind;
  // Hold the first run live (undone) so the singleton gate can bite.
  const held = new ActiveTheaterRun(w, 'qa_theater_a', { id: 'qa_a_row', kind: 'qa_theater_a', chance: 1 }, 'goblin', null, 1);
  w.theaterRuns.length = 0;
  w.theaterRuns.push(held);
  qaSeats.length = 0;
  w.theaterPour.clear();
  w.theaterRunBeat(2, ctxOf());
  check('concurrency: the per-kind singleton spends spare seats on kind diversity',
    firstSeat === 'qa_theater_a' && qaSeats.length === 1 && qaSeats[0].kind === 'qa_theater_b');
  unregisterTheaterConcurrency('qa_wide');
  swapTheaterRows(prior);
}

// --- 8) The pour ledger: additive caps stop cleanly (THE FARM LAW, new lane) --
{
  const w = makeSimWorld('warrior', 0x7e47e2);
  registerTheaterKind({
    id: 'qa_theater_burst', posture: 'additive', pourCap: 5,
    cast: () => ({ primary: 'goblin' }),
    spawn: (world, run) => {
      for (let i = 0; i < 3; i++) {
        if (!world.theaterSpawn(run, FACTIONS.goblin.table, 1, 'goblin', 'qa_burst')) break;
      }
    },
    tick: (_w, run) => { run.done = true; },
  });
  const prior = swapTheaterRows([{ id: 'qa_burst_row', kind: 'qa_theater_burst', chance: 1 }]);
  w.theaterSpots = SPOTS;
  const before = w.actors.length;
  for (let beat = 0; beat < 4; beat++) {
    w.theaterRuns.length = 0; // each burst completes instantly (tick done)
    w.theaterRunBeat(beat, ctxOf());
  }
  const poured = w.theaterPour.get('qa_theater_burst') ?? 0;
  const bodies = w.actors.filter(a => a.tag === 'qa_burst').length;
  check('pour: the additive cap stops the pour cleanly AT the cap',
    poured === 5 && bodies === 5 && w.actors.length === before + 5,
    `poured ${poured}, bodies ${bodies}`);
  swapTheaterRows(prior);
}

// --- 9) The replacement band: entry pours whole, the spent band refuses ------
{
  const w = makeSimWorld('warrior', 0x7e47e2);
  registerTheaterKind({
    id: 'qa_theater_repl', posture: 'replacement',
    cast: () => ({ primary: 'goblin' }),
    spawn: (world, run) => {
      for (let i = 0; i < 9; i++) {
        if (!world.theaterSpawn(run, FACTIONS.goblin.table, 1, 'goblin', 'qa_repl')) break;
      }
    },
    tick: (_w, run) => { run.done = true; },
  });
  const prior = swapTheaterRows([{ id: 'qa_repl_row', kind: 'qa_theater_repl', chance: 1 }]);
  w.theaterSpots = SPOTS;
  w.theaterAmbientBudget = 12; // band = max(4, round(0.5 × 12)) = 6
  w.theaterRunBeat(0, ctxOf());
  const entryPour = w.theaterPour.get('qa_theater_repl') ?? 0;
  w.theaterRuns.length = 0;
  w.theaterRunBeat(1, ctxOf());
  const afterDwell = w.theaterPour.get('qa_theater_repl') ?? 0;
  check('pour: the ENTRY beat pours its cast whole (the parity floor)…',
    entryPour === 9, `entry poured ${entryPour}`);
  check('pour: …and the spent band refuses every dwell re-pour (THE FARM LAW)',
    afterDwell === 9 && w.theaterRuns.length === 0);
  swapTheaterRows(prior);
}

// --- 10) The dwell cadence: lingering draws the world's life -----------------
{
  const w = makeSimWorld('warrior', 0x7e47e2);
  const prior = swapTheaterRows([{ id: 'qa_a_row', kind: 'qa_theater_a', chance: 1 }]);
  w.theaterSpots = SPOTS;
  w.theaterQuiet = false; // the arena stamps quiet (rig 3) — flip to drive the lattice
  qaSeats.length = 0;
  step(w, THEATER_CFG.dwell.everySec + 1);
  check('cadence: standing on un-quiet ground fires the dwell beat on the lattice',
    w.theaterBeatIdx >= 1 && qaSeats.some(s => s.beat >= 1),
    `beatIdx ${w.theaterBeatIdx}, seats [${qaSeats.map(s => s.beat).join(',')}]`);
  const w2 = makeSimWorld('warrior', 0x7e47e2);
  w2.theaterSpots = SPOTS;
  qaSeats.length = 0;
  step(w2, THEATER_CFG.dwell.everySec + 1);
  check('cadence: quiet ground never beats (the safe arena stays silent)',
    w2.theaterBeatIdx === 0 && qaSeats.length === 0);
  swapTheaterRows(prior);
}

// --- 11) The pass-through march: enter, cross, LEAVE -------------------------
{
  const w = makeSimWorld('warrior', 0x7e47e2);
  w.player.pos = vec(100, 100); // far out of the column's perception
  registerTheaterKind({
    id: 'qa_theater_march', posture: 'additive', pourCap: 12,
    cast: () => ({ primary: 'goblin' }),
    spawn: (world, run) => {
      marchSpawn(world, run, {
        table: FACTIONS.goblin.table, followers: 2, tag: 'qa_march',
        from: vec(250, 1080), to: vec(1350, 1080),
      });
    },
    tick: (world, run) => { marchTick(world, run); },
  });
  const prior = swapTheaterRows([{ id: 'qa_march_row', kind: 'qa_theater_march', chance: 1 }]);
  w.theaterSpots = SPOTS;
  const actorsBefore = w.actors.length;
  const corpsesBefore = w.corpses.length;
  w.theaterRunBeat(0, ctxOf());
  const marching = w.actors.filter(a => a.tag === 'qa_march').length;
  let crossed = false;
  for (let s = 0; s < 60 && !crossed; s++) {
    step(w, 1);
    crossed = !w.actors.some(a => !a.dead && a.tag === 'qa_march');
  }
  check('march: a leader + escort clump stands up at the entry edge',
    marching === 3, `stood ${marching}`);
  check('march: the column crosses and LEAVES — silent departure, no corpses',
    crossed && w.actors.length === actorsBefore && w.corpses.length === corpsesBefore
    && w.theaterRuns.length === 0);
  swapTheaterRows(prior);
}

// --- 12) The legacy siege, live: today's cast, no payout arc -----------------
{
  const hostile = Object.keys(FACTIONS).find(f => f !== 'goblin' && factionStance(f, 'goblin') === 'hostile');
  if (!hostile) {
    check('siege live: no hostile pair this build — skipped', true);
  } else {
    const w = makeSimWorld('warrior', 0x7e47e2);
    w.theaterSpots = SPOTS;
    const prior = swapTheaterRows([{ id: 'qa_siege_force', kind: 'siege', chance: 1 }]);
    w.theaterRunBeat(0, ctxOf({ invader: hostile }));
    const atk = w.actors.filter(a => a.tag === 'siege_atk').length;
    const def = w.actors.filter(a => a.tag === 'siege_def').length;
    check('siege live: today\'s 5-on-4 cast forms whole at entry',
      atk === 5 && def === 4 && w.theaterRuns.length === 1, `${atk} on ${def}`);
    for (const a of w.actors) if (a.tag === 'siege_atk') a.dead = true;
    step(w, 0.1);
    const texts = (w as unknown as { texts: { text?: string }[] }).texts ?? [];
    check('siege live: a spent siege ENDS — no reward, no favor toast (arcless)',
      w.theaterRuns.length === 0 && !texts.some(t => String(t.text ?? '').includes('favor')));
    swapTheaterRows(prior);
  }
}

// --- 13) THE TROOP MARCH: the true walk — exits-pair endpoints, cross, leave --
{
  const w = makeSimWorld('warrior', 0x7e47e2);
  w.player.pos = vec(100, 100); // far off the walked line
  // The arena has no exits — stand a pair so marchEndpoints walks the real
  // exits-pair lane (rig 11 already proved the edge fallback).
  w.exits.push(
    { pos: vec(250, 1080), radius: 24, to: 'qa_a', label: '', defIndex: 0 },
    { pos: vec(1350, 1080), radius: 24, to: 'qa_b', label: '', defIndex: 1 });
  const prior = swapTheaterRows([{ id: 'qa_troop_row', kind: 'troop_march', chance: 1 }]);
  w.theaterSpots = SPOTS;
  w.theaterAmbientBudget = 40;
  const actorsBefore = w.actors.length;
  const corpsesBefore = w.corpses.length;
  w.theaterRunBeat(0, ctxOf());
  const marchers = w.actors.filter(a => a.tag === 'troop_march');
  const lead = marchers.find(a => a.patrolRoute && a.patrolRoute.length >= 2);
  const exitSeats = [vec(250, 1080), vec(1350, 1080)];
  const nearAnExit = (p: { x: number; y: number }): boolean =>
    exitSeats.some(e => Math.hypot(p.x - e.x, p.y - e.y) < 90);
  check('troop march: a lead + 4 kin stand up in the owner\'s colors',
    marchers.length === 5 && !!lead && marchers.every(a => a.faction === 'goblin'),
    `stood ${marchers.length}`);
  check('troop march: the walk runs exit to exit (the world.exits pair)',
    !!lead && nearAnExit(lead.patrolRoute![0]) && nearAnExit(lead.patrolRoute![lead.patrolRoute!.length - 1])
    && lead.patrolIdx === 1);
  let crossed = false;
  for (let s = 0; s < 90 && !crossed; s++) {
    step(w, 1);
    crossed = !w.actors.some(a => !a.dead && a.tag === 'troop_march');
  }
  check('troop march: the column crosses and LEAVES — no corpses, ground restored',
    crossed && w.actors.length === actorsBefore && w.corpses.length === corpsesBefore
    && w.theaterRuns.length === 0);
  w.exits.length = 0;
  swapTheaterRows(prior);
}

// --- 14) THE FUNERAL: the slow cortege — speedMul stands, the walk completes --
{
  const w = makeSimWorld('warrior', 0x7e47e2);
  w.player.pos = vec(100, 100);
  w.exits.push(
    { pos: vec(250, 1080), radius: 24, to: 'qa_a', label: '', defIndex: 0 },
    { pos: vec(1350, 1080), radius: 24, to: 'qa_b', label: '', defIndex: 1 });
  const prior = swapTheaterRows([
    { id: 'qa_funeral_row', kind: 'funeral', chance: 1, params: { faction: 'undead' } }]);
  w.theaterSpots = SPOTS;
  w.theaterAmbientBudget = 40;
  w.theaterRunBeat(0, ctxOf({ owner: null }));
  const cortege = w.actors.filter(a => a.tag === 'funeral');
  const lead = cortege.find(a => a.defId === 'thurible_bearer');
  check('funeral: the censer-bearer leads 4 mourners (the authored cortege)',
    cortege.length === 5 && !!lead && cortege.every(a => a.faction === 'undead'),
    `stood ${cortege.length}`);
  // The slow walk: the paced lead moves at speedMul of an unpaced twin.
  const ctrl = w.spawnEventActor([{ id: 'thurible_bearer', weight: 1 }], 1, 'enemy', 'undead', 'qa_ctrl');
  const paced = lead ? lead.sheet.get('moveSpeed') : 0;
  const full = ctrl.sheet.get('moveSpeed');
  check('funeral: the cortege WALKS — speedMul stands on every member',
    full > 0 && paced > 0 && Math.abs(paced / full - 0.55) < 0.02,
    `paced ${paced.toFixed(1)} vs full ${full.toFixed(1)}`);
  ctrl.dead = true;
  let crossed = false;
  for (let s = 0; s < 120 && !crossed; s++) {
    step(w, 1);
    crossed = !w.actors.some(a => !a.dead && a.tag === 'funeral');
  }
  check('funeral: the procession winds across and leaves whole',
    crossed && w.theaterRuns.length === 0);
  w.exits.length = 0;
  swapTheaterRows(prior);
}

// --- 15) THE HUNTING PARTY: the additive burst — standing tags, capped pour ---
{
  const w = makeSimWorld('warrior', 0x7e47e2);
  w.player.pos = vec(100, 100);
  w.exits.push(
    { pos: vec(250, 1080), radius: 24, to: 'qa_a', label: '', defIndex: 0 },
    { pos: vec(1350, 1080), radius: 24, to: 'qa_b', label: '', defIndex: 1 });
  const prior = swapTheaterRows([{
    id: 'qa_hunt_row', kind: 'hunting_party', chance: 1,
    params: {
      prey: [{ id: 'meadow_hare', weight: 1 }],
      hunters: [{ id: 'plains_wolf', weight: 1 }],
    },
  }]);
  w.theaterSpots = SPOTS;
  w.theaterRunBeat(0, ctxOf());
  const hares = w.actors.filter(a => a.defId === 'meadow_hare');
  const wolves = w.actors.filter(a => a.tag === 'hunting_party');
  check('hunt: the herd bursts in with hunters on its heels (two clumps, one run)',
    hares.length === 4 && wolves.length === 2 && w.theaterRuns.length === 1,
    `${hares.length} prey, ${wolves.length} hunters`);
  check('hunt: the prey wears the STANDING \'critter\' tag — the zone\'s own predators read it free',
    hares.every(a => a.tag === 'critter' && a.faction === 'beast'));
  // The farm law: the additive cap prices the whole visit (6 poured, cap 10 —
  // further beats trim, then refuse).
  for (let beat = 1; beat < 4; beat++) {
    w.theaterRuns.length = 0;
    w.theaterRunBeat(beat, ctxOf());
  }
  const poured = w.theaterPour.get('hunting_party') ?? 0;
  check('hunt: the pour stops AT the kind\'s cap — the burst never floods',
    poured === 10, `poured ${poured}`);
  w.exits.length = 0;
  swapTheaterRows(prior);
}

// --- 16) THE CART GUARD: the road route, the wheeled cart, the clean leave ----
{
  const w = makeSimWorld('warrior', 0x7e47e2);
  w.player.pos = vec(100, 100);
  // Lay a farmland lane: a chain of road bodies across the arena floor
  // (the fields recipe's own doodad kind — roadWaypoints walks these).
  for (let x = 260; x <= 1340; x += 54) {
    w.doodads.push({ pos: vec(x, 1080), radius: 12, kind: 'road', rot: 0 });
  }
  const prior = swapTheaterRows([{ id: 'qa_cart_row', kind: 'cart_guard', chance: 1 }]);
  w.theaterSpots = SPOTS;
  w.theaterAmbientBudget = 40;
  const actorsBefore = w.actors.length;
  const corpsesBefore = w.corpses.length;
  w.theaterRunBeat(0, ctxOf());
  const crew = w.actors.filter(a => a.tag === 'cart_guard');
  const cart = crew.find(a => a.defId === 'caravan_cart');
  const lead = crew.find(a => a.defId === 'village_warden');
  check('cart guard: a warden, 3 kin and the cart take the lane',
    crew.length === 5 && !!cart && !!lead, `stood ${crew.length}`);
  check('cart guard: the route WALKS THE ROAD (via waypoints between the road\'s ends)',
    !!lead && !!lead.patrolRoute && lead.patrolRoute.length >= 4
    && lead.patrolRoute.every(pt => Math.abs(pt.y - 1080) < 40));
  const cartStart = cart ? vec(cart.pos.x, cart.pos.y) : vec(0, 0);
  step(w, 6);
  check('cart guard: the driven cart ROLLS at the column\'s heel (the kind\'s tick wheels it)',
    !!cart && dist(cart.pos, cartStart) > 30, cart ? `rolled ${dist(cart.pos, cartStart).toFixed(0)}px` : '');
  let crossed = false;
  for (let s = 0; s < 90 && !crossed; s++) {
    step(w, 1);
    crossed = !w.actors.some(a => !a.dead && a.tag === 'cart_guard');
  }
  check('cart guard: cart and guard cross together and leave — no corpses, ground restored',
    crossed && w.actors.length === actorsBefore && w.corpses.length === corpsesBefore
    && w.theaterRuns.length === 0);
  swapTheaterRows(prior);
}

// --- 17) THE WATCH CHANGE: the bodiless lean — reversible, stream-silent, ----
// offstage, and expired by its own hour (endWhen 'rowCond')
{
  const w = makeSimWorld('warrior', 0x7e47e2);
  w.time = 150; // deep night (PHASE_WHEEL: night spans [120, 216) of 240)
  const folk = [
    w.spawnEventActor([{ id: 'crofter', weight: 1 }], 1, 'enemy', 'freehold', 'qa_folk'),
    w.spawnEventActor([{ id: 'crofter', weight: 1 }], 1, 'enemy', 'freehold', 'qa_folk'),
  ];
  const warden = w.spawnEventActor([{ id: 'village_warden', weight: 1 }], 1, 'enemy', 'freehold', 'qa_folk');
  const priorSlack = folk[0].postSpec?.slack;
  const prior = swapTheaterRows([
    {
      id: 'qa_watch_row', kind: 'watch_change', chance: 1, when: { phases: ['night'] },
      params: {
        faction: 'freehold',
        leans: [
          { defs: ['crofter'], at: 'camps', hold: false },
          { defs: ['village_warden'], at: 'pois', hold: true },
        ],
      },
    },
    { id: 'qa_a_row', kind: 'qa_theater_a', chance: 1 },
  ]);
  w.theaterSpots = SPOTS;
  const actorsBefore = w.actors.length;
  // The seat itself is stream-silent: a bodiless kind spawns nothing and
  // draws nothing from the global die even when it SEATS.
  seedGlobalRandom(0xd1e003);
  const ref = Math.random();
  seedGlobalRandom(0xd1e003);
  w.theaterRunBeat(1, ctxOf());
  const run = w.theaterRuns.find(r => r.kind === 'watch_change');
  check('watch change: seats while its hour holds — and touches NOTHING (bodiless + stream-silent)',
    !!run && !run.done && w.actors.length === actorsBefore && Math.random() === ref);
  // OFFSTAGE: the standing lean holds no concurrency seat — the ground's
  // one texture seat is still open for a real kind.
  qaSeats.length = 0;
  w.theaterRunBeat(2, ctxOf());
  check('watch change: offstage — a staged kind still seats beside the standing lean',
    qaSeats.length === 1 && qaSeats[0].kind === 'qa_theater_a');
  w.theaterRuns = w.theaterRuns.filter(r => r.kind === 'watch_change');
  // The lean lands on the sweep tick — reversibly, and without one global draw.
  seedGlobalRandom(0xd1e004);
  const ref2 = Math.random();
  seedGlobalRandom(0xd1e004);
  run!.tick(1 / 60);
  const leanHeld = folk.every(a => a.aiPost !== undefined && a.postSpec?.hold === false)
    && warden.aiPost !== undefined && warden.postSpec?.hold === true;
  check('watch change: the SAME standing bodies shift roles (folk homebound, watch posted) — draw-free',
    leanHeld && Math.random() === ref2,
    `folk posts [${folk.map(a => a.aiPost ? '✓' : '·').join('')}], warden ${warden.aiPost ? '✓' : '·'}`);
  check('watch change: the posts are REAL spots (camps for the folk, POIs for the watch)',
    folk.every(a => !!a.aiPost && SPOTS.camps.some(c => dist(a.aiPost!, c) < 60))
    && !!warden.aiPost && SPOTS.pois.some(c => dist(warden.aiPost!, c) < 60));
  // Dawn: endWhen 'rowCond' expires the run and the CLOSING TICK reverts
  // every lean byte-exact — nobody poofs, everybody walks home.
  w.time = 30; // day
  run!.tick(1 / 60);
  check('watch change: the hour turns — the run expires by its own row cond (endWhen)',
    run!.done === true);
  check('watch change: the closing tick REVERTS the lean (no poof, no residue)',
    folk.every(a => a.aiPost === undefined && a.postSpec?.slack === priorSlack)
    && warden.aiPost === undefined);
  swapTheaterRows(prior);
}

console.log(failed ? `probe_theater: ${failed} FAILURE(S)` : 'probe_theater: all checks passed');
process.exit(failed ? 1 : 0);
