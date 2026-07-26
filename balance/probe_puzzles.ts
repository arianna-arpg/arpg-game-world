// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE PUZZLE FABRIC's grown repertoire on the real engine
// (docs/engine/puzzles.md): the preset/fixture census over the OPEN
// registries, the three new kinds (tempo / accord / ember) driven through
// their host contract, THE GRAIN (PuzzleKindDef.quantize — paired kinds
// never mint an orphan voice), the placer lifecycle through World's REAL
// bootPuzzles (objective birth, memory re-entry SOLVED), and THE HUM AT
// BLOW GRAIN through the real knock queue + per-frame drain (a fan-out's
// echo swallowed whole; the aim grain byte-identical to the old law).
// Siblings: balance/probe_attunement.ts (tones, pulses, the original three
// kinds, spill/knock dial routing). Run: npx tsx balance/probe_puzzles.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { mulberry32 } from '../src/sim/rng';
import type { Actor } from '../src/engine/actor';
import type { Vec2 } from '../src/core/math';
import { angleTo } from '../src/core/math';
import { attunedStatus, TUNE_CFG } from '../src/engine/tuning';
import { ELEMENTAL_TYPES } from '../src/engine/stats';
import {
  PUZZLE_CFG, PUZZLE_KINDS, puzzleSpillOf,
  type PuzzleHost, type PuzzleRun,
} from '../src/engine/puzzles';
import { PUZZLES } from '../src/data/puzzles';
import { MONSTERS } from '../src/data/monsters';
import { TILESETS } from '../src/data/tilesets';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
const world = makeSimWorld('warrior', 90417);
const p = world.player;
p.invulnerable = true;
const step = (s: number): void => {
  const dt = 1 / 60;
  for (let t = 0; t < s; t += dt) world.update(dt);
};
const kindledOn = (a: Actor): boolean =>
  a.statuses.some(s => s.id === PUZZLE_CFG.kindleStatus);

// --- A) THE CENSUS — presets, kinds, fixtures, kind-level law ---------------
{
  for (const [id, spec] of Object.entries(PUZZLES)) {
    const kind = PUZZLE_KINDS[spec.kind];
    check(`census: preset '${id}' names a registered kind`, !!kind, spec.kind);
    if (!kind) continue;
    const nodeDef = MONSTERS[spec.node ?? kind.nodeMonster];
    check(`census: '${id}' fixture stands on the object-actor contract`,
      !!nodeDef && !!nodeDef.passive && !!nodeDef.immortal && !!nodeDef.noObjective,
      spec.node ?? kind.nodeMonster);
  }
  check('census: the three new kinds are registered',
    !!PUZZLE_KINDS.tempo && !!PUZZLE_KINDS.accord && !!PUZZLE_KINDS.ember);
  check("law: the accord is the shipped spill:'all' consumer",
    PUZZLE_KINDS.accord.spill === 'all');
  check("law: the ember ring fans wide too", PUZZLE_KINDS.ember.spill === 'all');
  check('law: the accord quantizes its ring to whole pairs',
    PUZZLE_KINDS.accord.quantize === 2
    && (PUZZLE_KINDS.accord.count?.[0] ?? 0) >= 2);
  check('law: all three answer to the PLAYER side',
    PUZZLE_KINDS.tempo.who === 'player' && PUZZLE_KINDS.accord.who === 'player'
    && PUZZLE_KINDS.ember.who === 'player');
  // The new presets are OFFERED somewhere: at least one tileset row each
  // (a kind with no door into the world is a museum piece).
  for (const pid of ['rising_tempo', 'twin_accord', 'ember_ring']) {
    const offered = Object.values(TILESETS).some(t =>
      (t.puzzles ?? []).some(r => r.id === pid));
    check(`census: '${pid}' is offered by at least one tileset`, offered);
  }
}

// --- helpers: stub host + court minting --------------------------------------
const mkHost = (seed = 7): PuzzleHost & { completed: PuzzleRun[]; near: boolean } => {
  const done: PuzzleRun[] = [];
  const host: PuzzleHost & { completed: PuzzleRun[]; near: boolean } = {
    completed: done,
    near: true,
    now: () => world.time,
    rng: mulberry32(seed),
    flash: () => { /* silent probe */ },
    say: () => { /* silent probe */ },
    setTone: (n, tone) => {
      if (n.tone === tone) return;
      if (n.tone) n.endStatus(attunedStatus(n.tone));
      n.tone = tone;
      n.applyStatus(attunedStatus(tone), 0, TUNE_CFG.holdScale, 'attunement');
    },
    kindle: (n, secs) => n.applyStatus(PUZZLE_CFG.kindleStatus, 0, secs, 'the refrain'),
    quench: n => n.endStatus(PUZZLE_CFG.kindleStatus),
    heroNear: () => host.near,
    complete: run => { run.done = true; done.push(run); },
  };
  return host;
};
const mkCourt = (defId: string, runId: string, n: number, at: Vec2, ringR = 112): Actor[] => {
  const out: Actor[] = [];
  for (let i = 0; i < n; i++) {
    const m = world.createMonster(defId, 8, 'enemy');
    const ang = (i / n) * Math.PI * 2;
    m.pos = { x: at.x + Math.cos(ang) * ringR, y: at.y + Math.sin(ang) * ringR };
    m.puzzleNode = { id: runId, idx: i };
    world.actors.push(m);
    out.push(m);
  }
  return out;
};
const mkRun = (id: string, spec: PuzzleRun['spec'], nodes: Actor[], at: Vec2): PuzzleRun => ({
  id, spec, kind: PUZZLE_KINDS[spec.kind], at, nodes,
  state: {}, hums: new Map(), done: false, isObjective: false,
});

// --- B) TEMPO — the rising measure, read never memorized --------------------
{
  const host = mkHost(11);
  const at = { x: p.pos.x + 500, y: p.pos.y };
  const nodes = mkCourt('tempo_crystal', 'probe_tempo#0', 5, at);
  const run = mkRun('probe_tempo#0', { kind: 'tempo' }, nodes, at);
  run.kind.boot(run, host);
  const order = run.state.order as number[];
  check('tempo: boots a full shuffled measure (a permutation of the ring)',
    order.length === 5 && [...order].sort((a, b) => a - b).join(',') === '0,1,2,3,4',
    `order=[${order}]`);
  const host2 = mkHost(11);
  const run2 = mkRun('probe_tempo#1', { kind: 'tempo' },
    mkCourt('tempo_crystal', 'probe_tempo#1', 5, { x: at.x, y: at.y + 400 }), at);
  run2.kind.boot(run2, host2);
  check('tempo: the measure is deterministic on the host stream',
    (run2.state.order as number[]).join(',') === order.join(','));
  const bar = [...(run.state.pulseAt as number[])];
  check('tempo: the opening bar is SYNCED (every voice on one clock)',
    bar.every(v => Math.abs(v - bar[0]) < 1e-9));

  // Cross the bar: every voice pulses once, then drifts to its own period —
  // the rescheduled clocks READ OUT the measure (slowest = latest next pulse).
  for (let guard = 0; guard < 200 && (run.state.pulseAt as number[]).every(v => v === bar[0]); guard++) {
    run.kind.tick!(run, host, 1 / 60);
    step(1 / 60);
  }
  for (let f = 0; f < 4; f++) { run.kind.tick!(run, host, 1 / 60); step(1 / 60); }
  const after = run.state.pulseAt as number[];
  const byRank = order.map(idx => after[idx]);
  check('tempo: after the bar, next-pulse clocks DESCEND with rank (slowest waits longest)',
    byRank.every((v, i) => i === 0 || v < byRank[i - 1] + 1e-9),
    `byRank=[${byRank.map(v => v.toFixed(2))}]`);

  // The earshot hold: with nobody watching, every phase shifts in lockstep.
  host.near = false;
  const before = [...(run.state.pulseAt as number[])];
  for (let f = 0; f < 30; f++) { run.kind.tick!(run, host, 1 / 60); step(1 / 60); }
  const held = run.state.pulseAt as number[];
  check('tempo: out of earshot the bar HOLDS (all phases shift in lockstep)',
    held.every((v, i) => Math.abs((v - before[i]) - 0.5) < 0.02),
    `shift=${(held[0] - before[0]).toFixed(3)}`);
  host.near = true;

  // A wrong voice breaks the measure: progress home, lights out, bar re-synced.
  run.kind.struck!(run, nodes[order[1]], host, p);
  check('tempo: striking ahead of the measure breaks it (progress home, bar re-synced)',
    run.state.progress === 0
    && (run.state.pulseAt as number[]).every((v, _i, arr) => Math.abs(v - arr[0]) < 1e-9)
    && nodes.every(n => !kindledOn(n)));

  // Answer in measure: slowest to fastest resolves; settled re-taps stay quiet.
  run.kind.struck!(run, nodes[order[0]], host, p);
  check('tempo: the slowest voice settles first', run.state.progress === 1
    && kindledOn(nodes[order[0]]));
  run.kind.struck!(run, nodes[order[0]], host, p);
  check('tempo: re-tapping a settled voice is QUIET (no falter, no advance)',
    run.state.progress === 1);
  for (let r = 1; r < 5; r++) run.kind.struck!(run, nodes[order[r]], host, p);
  check('tempo: the full measure resolves the riddle',
    run.done && host.completed.length === 1);
  check('tempo: the status line reads the measure',
    run.kind.status(run).includes('5/5'));
}

// --- C) ACCORD — twin voices, bound inside the linger ------------------------
{
  const host = mkHost(23);
  const at = { x: p.pos.x + 500, y: p.pos.y + 900 };
  const nodes = mkCourt('accord_crystal', 'probe_accord#0', 6, at, 128);
  const run = mkRun('probe_accord#0', { kind: 'accord' }, nodes, at);
  run.kind.boot(run, host);
  check('accord: partners sit OPPOSITE and share a color',
    nodes[0].tone === nodes[3].tone && nodes[1].tone === nodes[4].tone
    && nodes[2].tone === nodes[5].tone,
    `tones=[${nodes.map(n => n.tone)}]`);
  check('accord: three pairs wear three DISTINCT pool colors',
    new Set([nodes[0].tone, nodes[1].tone, nodes[2].tone]).size === 3);
  check('accord: the pool is the elements by default',
    [nodes[0].tone, nodes[1].tone, nodes[2].tone]
      .every(t => (ELEMENTAL_TYPES as readonly string[]).includes(t as string)));

  // One half rings: it holds for exactly the linger, worn as light.
  run.kind.struck!(run, nodes[0], host, p);
  const pend = (run.state.pending as ({ half: number; until: number } | null)[])[0];
  check('accord: a lone half HOLDS for the linger window (drawn == tested)',
    !!pend && pend.half === 0 && Math.abs(pend.until - (world.time + 3)) < 1e-6
    && kindledOn(nodes[0]));

  // Its partner follows inside the window: the pair binds for good.
  step(1.0);
  run.kind.tick!(run, host, 1 / 60);
  run.kind.struck!(run, nodes[3], host, p);
  const bound = run.state.bound as boolean[];
  check('accord: the partner inside the window BINDS the pair',
    bound[0] === true && kindledOn(nodes[0]) && kindledOn(nodes[3]));
  run.kind.struck!(run, nodes[0], host, p);
  check('accord: a bound pair holds — re-strikes are quiet',
    bound[0] === true && (run.state.pending as unknown[])[0] === null);

  // A lapsed window SLIPS: the lone light goes out, nothing binds.
  run.kind.struck!(run, nodes[1], host, p);
  step(3.2);
  run.kind.tick!(run, host, 1 / 60);
  check('accord: a lapsed window slips (pending cleared, light quenched)',
    (run.state.pending as unknown[])[1] === null && !kindledOn(nodes[1])
    && bound[1] === false);

  // The remaining pairs bind; the last bind resolves the riddle.
  run.kind.struck!(run, nodes[1], host, p);
  run.kind.struck!(run, nodes[4], host, p);
  run.kind.struck!(run, nodes[2], host, p);
  run.kind.struck!(run, nodes[5], host, p);
  check('accord: every pair bound resolves the riddle',
    run.done && host.completed.length === 1 && bound.every(v => v));
  check('accord: the status line counts accords',
    run.kind.status(run).includes('3/3'));
}

// --- D) EMBER — the tended ring ----------------------------------------------
{
  const host = mkHost(31);
  const at = { x: p.pos.x + 500, y: p.pos.y + 1800 };
  const nodes = mkCourt('ember_crystal', 'probe_ember#0', 5, at);
  const run = mkRun('probe_ember#0', { kind: 'ember', gutter: 1.5 }, nodes, at);
  run.kind.boot(run, host);
  check('ember: boots dark', (run.state.litUntil as number[]).every(v => v === 0)
    && run.kind.status(run).includes('0/5'));
  for (let i = 0; i < 4; i++) run.kind.struck!(run, nodes[i], host, p);
  check('ember: struck coals are alight, worn as the gutter window',
    run.kind.status(run).includes('4/5') && kindledOn(nodes[0]) && !run.done);
  // The gutter: past the window the coals go out (tick lets them fall).
  step(1.6);
  run.kind.tick!(run, host, 1 / 60);
  check('ember: past the gutter the coals go out', run.kind.status(run).includes('0/5'));
  // Refresh law: re-striking a lit coal extends it; the LAST coal completes.
  for (let i = 0; i < 4; i++) run.kind.struck!(run, nodes[i], host, p);
  step(0.5);
  run.kind.struck!(run, nodes[0], host, p); // refresh, not a double-light
  check('ember: a re-struck coal refreshes (still 4/5, no falter)',
    run.kind.status(run).includes('4/5') && !run.done);
  run.kind.struck!(run, nodes[4], host, p);
  check('ember: the last coal alight resolves the riddle',
    run.done && host.completed.length === 1 && run.kind.status(run).includes('5/5'));
}

// --- E) THE PLACER — bootPuzzles birth, the grain, memory re-entry -----------
{
  type WorldGuts = {
    puzzles: PuzzleRun[];
    puzzleHost(): PuzzleHost;
    puzzleStruck(node: Actor, striker: Actor | null, wounding: boolean): void;
    bootPuzzles(def: unknown, pois: Vec2[], memory?: { puzzlesDone?: string[] } | null): void;
  };
  const guts = world as unknown as WorldGuts;
  const pois: Vec2[] = [{ x: p.pos.x + 700, y: p.pos.y + 200 }];
  const mkDef = (preset: string): unknown => ({
    id: 'probe_puzzle_zone', level: 8, spoils: undefined,
    objective: { kind: 'puzzle', puzzle: preset }, puzzles: [],
  });

  guts.bootPuzzles(mkDef('twin_accord'), pois);
  const born = guts.puzzles[0];
  check('placer: a pinned objective preset stands its run up',
    guts.puzzles.length === 1 && !!born && born.isObjective && !born.done,
    `${guts.puzzles.length} runs`);
  check('placer: the accord minted WHOLE pairs (even count, ≥4)',
    !!born && born.nodes.length % 2 === 0 && born.nodes.length >= 4,
    `${born?.nodes.length} nodes`);
  check('placer: heartless kinds owe no heart', !!born && !born.heart);
  check('placer: every fixture is enrolled under the run id',
    !!born && born.nodes.every((n, i) =>
      n.puzzleNode?.id === born.id && n.puzzleNode?.idx === i));

  // THE GRAIN pinned exactly: a [5,5] accord roll floors to 4 voices.
  PUZZLES['probe_odd_accord'] = { kind: 'accord', count: [5, 5] };
  guts.bootPuzzles(mkDef('probe_odd_accord'), pois);
  const odd = guts.puzzles[0];
  check('grain: an odd accord roll floors to whole pairs (5 → 4)',
    !!odd && odd.nodes.length === 4, `${odd?.nodes.length} nodes`);
  delete PUZZLES['probe_odd_accord'];

  // Memory re-entry: a remembered solve re-boots SOLVED, dressing and all
  // (proof, not homework) — the ember stands all-alight forever.
  guts.bootPuzzles(mkDef('ember_ring'), pois, { puzzlesDone: ['ember_ring#0'] });
  const recalled = guts.puzzles[0];
  check('memory: a remembered solve re-enters SOLVED (done + dressing)',
    !!recalled && recalled.done
    && (recalled.state.litUntil as number[]).every(v => v === Infinity)
    && recalled.nodes.every(n => kindledOn(n)),
    recalled ? recalled.kind.status(recalled) : 'no run');

  // An unknown preset stands NOTHING up (warned, skipped — the objective
  // watcher completes vacuously rather than wedge the zone).
  guts.bootPuzzles(mkDef('no_such_riddle'), pois);
  check('placer: an unknown preset stands nothing up', guts.puzzles.length === 0);
}

// --- F) THE HUM AT BLOW GRAIN — the real knock queue + drain ------------------
{
  type WorldGuts = {
    puzzles: PuzzleRun[];
    puzzleHost(): PuzzleHost;
    puzzleStruck(node: Actor, striker: Actor | null, wounding: boolean): void;
    bootPuzzles(def: unknown, pois: Vec2[], memory?: { puzzlesDone?: string[] } | null): void;
  };
  const guts = world as unknown as WorldGuts;
  guts.puzzles.length = 0; // a bare stage for hand-built runs

  // F1: the AIM grain is byte-identical to the old law — one blow fanning
  // two coals judges only the FACED one, and the ledger holds ONE hum.
  const at1 = { x: p.pos.x + 300, y: p.pos.y + 2600 };
  const aimNodes = mkCourt('ember_crystal', 'probe_hum#0', 3, at1);
  const aimRun = mkRun('probe_hum#0', { kind: 'ember', spill: 'aim', gutter: 30 }, aimNodes, at1);
  aimRun.kind.boot(aimRun, guts.puzzleHost());
  guts.puzzles.push(aimRun);
  check("hum/aim: the dial override reads back 'aim'", puzzleSpillOf(aimRun) === 'aim');
  p.facing = angleTo(p.pos, aimNodes[0].pos);
  guts.puzzleStruck(aimNodes[1], p, true);
  guts.puzzleStruck(aimNodes[0], p, true);
  world.update(1 / 60);
  const aimLit = aimRun.state.litUntil as number[];
  check('hum/aim: one blow, one bell — only the FACED coal lights',
    aimLit[0] > 0 && aimLit[1] === 0 && aimLit[2] === 0,
    `lit=[${aimLit.map(v => v > 0 ? 1 : 0)}]`);
  check('hum/aim: the ledger holds exactly the one rung bell',
    aimRun.hums.size === 1 && (aimRun.hums.get(aimNodes[0].id) ?? 0) > world.time);

  // F2: the ALL grain hums the whole blow — the fan's echo one frame later
  // is swallowed WHOLE (no refresh), and a LATER fresh bell claims the
  // ledger for the new blow.
  const at2 = { x: p.pos.x + 300, y: p.pos.y + 3400 };
  const fanNodes = mkCourt('ember_crystal', 'probe_hum#1', 4, at2);
  const fanRun = mkRun('probe_hum#1', { kind: 'ember', gutter: 30 }, fanNodes, at2);
  fanRun.kind.boot(fanRun, guts.puzzleHost());
  guts.puzzles.push(fanRun);
  guts.puzzleStruck(fanNodes[0], p, true);
  guts.puzzleStruck(fanNodes[1], p, true);
  guts.puzzleStruck(fanNodes[2], p, true);
  world.update(1 / 60);
  const fanLit = fanRun.state.litUntil as number[];
  check("hum/all: a three-bell blow rings all three and hums all three",
    fanLit[0] > 0 && fanLit[1] > 0 && fanLit[2] > 0 && fanRun.hums.size === 3,
    `hums=${fanRun.hums.size}`);
  const litSnapshot = [...fanLit];
  guts.puzzleStruck(fanNodes[0], p, true); // the echo re-fan, one frame later
  guts.puzzleStruck(fanNodes[1], p, true);
  world.update(1 / 60);
  check('hum/all: the echo re-fan is swallowed WHOLE (no refresh, no re-judge)',
    (fanRun.state.litUntil as number[])[0] === litSnapshot[0]
    && (fanRun.state.litUntil as number[])[1] === litSnapshot[1]);
  guts.puzzleStruck(fanNodes[3], p, true); // a FRESH bell — a new blow
  world.update(1 / 60);
  check('hum/all: a fresh bell claims the ledger (cleared to the new blow)',
    fanRun.hums.size === 1 && (fanRun.hums.get(fanNodes[3].id) ?? 0) > world.time);
  check('hum/all: and the fresh bell was the LAST coal — the ring resolves',
    fanRun.done);

  // F3: the accord binds THROUGH the real drain — both halves of a pair in
  // one blow (one group, spill 'all') bind on the spot.
  const at3 = { x: p.pos.x + 300, y: p.pos.y + 4200 };
  const acNodes = mkCourt('accord_crystal', 'probe_hum#2', 4, at3, 128);
  const acRun = mkRun('probe_hum#2', { kind: 'accord' }, acNodes, at3);
  acRun.kind.boot(acRun, guts.puzzleHost());
  guts.puzzles.push(acRun);
  guts.puzzleStruck(acNodes[0], p, true);
  guts.puzzleStruck(acNodes[2], p, true); // idx 0's opposite partner (pairs=2)
  world.update(1 / 60);
  check('drain/accord: one wide blow binds a whole pair (same drained group)',
    (acRun.state.bound as boolean[])[0] === true);

  // THE WHO GATE still stands for the new kinds: an enemy's knock is refused.
  const foe = world.createMonster('zombie', 8, 'enemy');
  foe.pos = { x: at3.x, y: at3.y };
  world.actors.push(foe);
  guts.puzzleStruck(acNodes[1], foe, true);
  world.update(1 / 60);
  check('who gate: an enemy knock never plays the accord',
    (acRun.state.pending as unknown[])[1] === null
    && (acRun.state.bound as boolean[])[1] === false);
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
