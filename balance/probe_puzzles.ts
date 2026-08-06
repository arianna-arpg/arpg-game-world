// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE PUZZLE FABRIC's grown repertoire on the real engine
// (docs/engine/puzzles.md): the preset/fixture census over the OPEN
// registries, the three new kinds (tempo / accord / ember) driven through
// their host contract, THE GRAIN (PuzzleKindDef.quantize — paired kinds
// never mint an orphan voice), the placer lifecycle through World's REAL
// bootPuzzles (objective birth, memory re-entry SOLVED), and THE HUM AT
// BLOW GRAIN through the real knock queue + per-frame drain (a fan-out's
// echo swallowed whole; the aim grain byte-identical to the old law), and
// THE COURT SHRINE (G) — the ring-tenant seam end-to-end: a gen-time
// 'shrine' tenant mints its zone-keyed preset + appends its def row, the
// REAL bootPuzzles stands the riddle ON the recorded court circle, knocks
// animate it, and the discipline laws hold (same seed → same seat; THE
// COEXISTENCE GATE — authored-riddle zones are never appended to, and an
// authored riddle's salted rolls are byte-identical whatever tenant holds
// the court; the REPLACEMENT law; the stand-down gates; one shrine per
// zone). Batch-35 grows THE SHAPED LATTICES (H — the format census, the
// wheel's re-seat + neighbor math + a full replay solve, and the
// formatless board's byte-identical old path) and THE ICE SLIDE (I — a
// scripted solve on a pinned rink, the catch law, the bump, the one-block
// law, a 40-seed deal sweep re-proved by an INDEPENDENT reachability
// implementation, and the real placer end-to-end incl. memory re-entry).
// Siblings: balance/probe_attunement.ts (tones, pulses, the original three
// kinds, spill/knock dial routing). Run: npx tsx balance/probe_puzzles.ts
// ---------------------------------------------------------------------------

// Side-effect registries the shrine rigs generate against (the probe_massif
// set's relevant pair; the sim arena below loads the rest).
import '../src/engine/layoutRecipes';
import '../src/data/massifs';

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { mulberry32 } from '../src/sim/rng';
import type { Actor } from '../src/engine/actor';
import type { Vec2 } from '../src/core/math';
import { angleTo, vec } from '../src/core/math';
import { Rng } from '../src/core/rng';
import { generateLayout, type GenCtx, type GeneratedLayout } from '../src/engine/levelgen';
import { carveMassifs, type TenantRow } from '../src/engine/massif';
import type { ZoneDef } from '../src/data/zones';
import {
  COURT_SHRINE_KIND, COURT_SHRINE_PRESET_PREFIX, type CourtShrineSpec,
} from '../src/data/puzzles';
import { attunedStatus, TUNE_CFG } from '../src/engine/tuning';
import { ELEMENTAL_TYPES } from '../src/engine/stats';
import {
  ICESLIDE_CFG, LATTICE_FORMATS, latticeFormatGrid,
  PUZZLE_CFG, PUZZLE_KINDS, puzzleSpillOf,
  type IceSlideBoard, type PuzzleHost, type PuzzleRun,
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
  // (a kind with no door into the world is a museum piece). The batch-35
  // wave (shaped lattices + the ice slides) joins the same census.
  for (const pid of ['rising_tempo', 'twin_accord', 'ember_ring',
    'kindled_wheel', 'crossed_lattice', 'diamond_lattice', 'hollow_lattice',
    'ice_slide', 'glacial_slide']) {
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

// --- G) THE COURT SHRINE — the ring-tenant seam, end-to-end -------------------
{
  type WorldGuts = {
    puzzles: PuzzleRun[];
    farPointDraws: number;
    puzzleStruck(node: Actor, striker: Actor | null, wounding: boolean): void;
    bootPuzzles(def: unknown, pois: Vec2[], memory?: { puzzlesDone?: string[] } | null): void;
  };
  const guts = world as unknown as WorldGuts;
  // Every real bootPuzzles follows loadZone's seeded-fallback reset
  // (world.farPointDraws = 0) — the direct-call rigs must replay it, or a
  // dry poi pool draws its far points from a drifted counter.
  const boot = (def: ZoneDef, pois: Vec2[]): void => {
    guts.farPointDraws = 0;
    guts.bootPuzzles(def, pois);
  };
  const A = { w: 3200, h: 2400 };
  const gEntry = vec(140, A.h / 2);
  const gExits = [vec(A.w - 140, A.h / 2)];
  const THEME = { floor: '#161616', grid: '#222', border: '#555', obstacle: '#333', obstacleEdge: '#666', accent: '#999' };
  const defOf = (id: string, tenants: TenantRow[], extra?: Partial<ZoneDef>): ZoneDef => ({
    id, name: `QA ${id}`, level: 8, size: { w: A.w, h: A.h },
    theme: THEME, layout: [], objective: { kind: 'clear' }, exits: [], map: { x: 0, y: 0 },
    layoutType: 'massif',
    layoutParams: {
      massifMasses: [{ kind: 'well_court', weight: 1, sizeR: [200, 240], over: { tenants } }],
      massifCoverage: [0.12, 0.16],
    },
    ...extra,
  });
  // BY REFERENCE, the real chain's shape (world.ts loadZone hands the zoneMap
  // def itself down to the recipe): the handler's copy-on-write append must
  // land on the SAME def bootPuzzles later reads — a spread here would test a
  // different game (and did, in this rig's first draft).
  const gen = (def: ZoneDef, seed: number): GeneratedLayout => {
    def.seed = seed;
    return generateLayout(def, A, new Rng(seed), gEntry, gExits.map(e => vec(e.x, e.y)));
  };
  // Single-court params for the parity rigs: with several courts, the
  // non-shrine courts legitimately fall back to stock (dress of their own) —
  // court-vs-court comparisons are only byte-clean one court at a time.
  const ONE_COURT = {
    massifCoverage: [0.04, 0.05] as [number, number],
    massifMaxMasses: 1, massifMinMasses: 1,
  };
  const bareCtx = (seed: number): GenCtx => ({
    rng: new Rng(seed), arena: A, entry: gEntry, exits: gExits.map(e => vec(e.x, e.y)),
    doodads: [], pois: [], camps: [], breakables: [], npcs: [], garrisons: [],
    caveSeeds: [], reserved: [], seed,
  });
  const SHRINE_TABLE: TenantRow[] = [{ kind: 'shrine', weight: 1, params: { kinds: ['ember'] } }];
  const keyOf = (id: string): string => `${COURT_SHRINE_PRESET_PREFIX}${id}`;
  const specOf = (id: string): CourtShrineSpec | undefined =>
    PUZZLES[keyOf(id)] as CourtShrineSpec | undefined;
  const seatFacts = (s: CourtShrineSpec | undefined): string => s
    ? JSON.stringify({ x: s.shrine.x, y: s.shrine.y, r: s.shrine.ringR, a0: s.shrine.a0, k: s.shrine.kind, n: s.count })
    : 'no spec';
  const SEED = 424243;

  // G1 — THE SEAM: gen mints the zone-keyed preset + appends the row; the
  // REAL placer stands the riddle ON the recorded circle; knocks animate it.
  {
    const def = defOf('probe_shrine_g1', SHRINE_TABLE);
    const layout = gen(def, SEED);
    const spec = specOf('probe_shrine_g1');
    check('shrine/seam: generation minted the zone-keyed preset', !!spec, seatFacts(spec));
    check('shrine/seam: the def row appended (chance 1, prefix-keyed)',
      (def.puzzles ?? []).some(r => r.id === keyOf('probe_shrine_g1') && r.chance === 1)
      && (def.puzzles ?? []).length === 1);
    if (spec) {
      check("shrine/seam: params.kinds pinned the inner ('ember')",
        spec.shrine.kind === 'ember' && spec.node === 'ember_crystal');
      check('shrine/seam: the seat IS a court interior (a generation POI)',
        layout.pois.some(p => Math.hypot(p.x - spec.shrine.x, p.y - spec.shrine.y) < 1));
      check('shrine/seam: the count is pinned exact and in the ember band',
        spec.count?.[0] === spec.count?.[1] && (spec.count?.[0] ?? 0) >= 5 && (spec.count?.[0] ?? 0) <= 6);
      const altar = layout.doodads.find(d => d.kind === 'wayshrine');
      const altarD = altar
        ? Math.hypot(altar.pos.x - spec.shrine.x, altar.pos.y - spec.shrine.y) : NaN;
      check('shrine/seam: the votive stone stands INSIDE the ring, off the court poi',
        !!altar && altarD > 20 && altarD < spec.shrine.ringR, `d=${altarD.toFixed(1)}`);
      check('shrine/seam: rim plinths dressed the yard',
        layout.doodads.some(d => d.kind === 'ruin_plinth'));

      boot(def, [...layout.pois]);
      const run = guts.puzzles[0];
      check('shrine/boot: the placer stood the shrine run up under its zone key',
        guts.puzzles.length === 1 && !!run && run.id === `${keyOf('probe_shrine_g1')}#0`);
      if (run) {
        check('shrine/boot: run.at re-seated onto the recorded court seat',
          Math.hypot(run.at.x - spec.shrine.x, run.at.y - spec.shrine.y) < 0.001);
        check('shrine/boot: every crystal stands on the recorded circle',
          run.nodes.length === spec.count?.[0]
          && run.nodes.every(nd =>
            Math.abs(Math.hypot(nd.pos.x - spec.shrine.x, nd.pos.y - spec.shrine.y) - spec.shrine.ringR) < 0.5));
        check('shrine/boot: the run REBOUND to the inner riddle (ember)',
          run.kind.id === 'ember' && run.nodes.every(nd => nd.defId === 'ember_crystal'));
        // THE ANIMATION: knocks through the real queue + drain move the state.
        guts.puzzleStruck(run.nodes[0], p, true);
        world.update(1 / 60);
        check('shrine/knock: a landed blow lights the courtyard coal',
          ((run.state.litUntil as number[]) ?? [])[0] > world.time);
        for (let i = 1; i < run.nodes.length; i++) {
          guts.puzzleStruck(run.nodes[i], p, true);
          world.update(1 / 60);
        }
        check('shrine/knock: the whole ring alight resolves the courtyard riddle',
          run.done);
      }
    }
  }

  // G2 — DETERMINISM: same seed → same minted seat, same appended row, and
  // byte-identical crystal positions through the real placer, twice over.
  {
    const d1 = defOf('probe_shrine_g2', SHRINE_TABLE);
    const l1 = gen(d1, SEED);
    const facts1 = seatFacts(specOf('probe_shrine_g2'));
    const d2 = defOf('probe_shrine_g2', SHRINE_TABLE);
    const l2 = gen(d2, SEED);
    const facts2 = seatFacts(specOf('probe_shrine_g2'));
    check('shrine/determinism: two generations mint the identical seat ledger',
      facts1 !== 'no spec' && facts1 === facts2, facts1);
    check('shrine/determinism: the appended rows agree',
      JSON.stringify(d1.puzzles) === JSON.stringify(d2.puzzles));
    boot(d1, [...l1.pois]);
    const pos1 = guts.puzzles[0]?.nodes.map(nd => `${nd.pos.x.toFixed(3)},${nd.pos.y.toFixed(3)}`).join(' ');
    boot(d2, [...l2.pois]);
    const pos2 = guts.puzzles[0]?.nodes.map(nd => `${nd.pos.x.toFixed(3)},${nd.pos.y.toFixed(3)}`).join(' ');
    check('shrine/determinism: two boots seat the crystals byte-identically',
      !!pos1 && pos1 === pos2);
  }

  // G3 — THE COEXISTENCE GATE: a zone authoring its OWN puzzles rows is
  // never appended to (the placer draws all selections before any placement,
  // so a coexisting appended row would shift the authored riddle's seat —
  // the shrine yields instead, structurally). The authored riddle's
  // salted-stream rolls are then BYTE-IDENTICAL whatever tenant holds the
  // court — pinned shrine-vs-vacant. (The song itself, state.seq, rides the
  // host's GLOBAL die by standing design — a fresh refrain every re-entry —
  // so the compare pins the salted truths: seat + crystal ring.)
  {
    const mkAuthored = (): Partial<ZoneDef> =>
      ({ puzzles: [{ id: 'singing_refrain', chance: 1 }] });
    const dA = defOf('probe_shrine_g3', SHRINE_TABLE, mkAuthored());
    dA.layoutParams = { ...dA.layoutParams, ...ONE_COURT };
    const lA = gen(dA, SEED);
    const dB = defOf('probe_shrine_g3', [{ kind: 'vacant', weight: 1 }], mkAuthored());
    dB.layoutParams = { ...dB.layoutParams, ...ONE_COURT };
    const lB = gen(dB, SEED);
    check('shrine/coexist: an authored-riddle zone is never appended to (no key, no row)',
      (dA.puzzles ?? []).length === 1 && dA.puzzles?.[0]?.id === 'singing_refrain'
      && !specOf('probe_shrine_g3'));
    check('shrine/coexist: the yielded court fell back to STOCK (dress of its own, no votive)',
      !lA.doodads.some(d => d.kind === 'wayshrine')
      && lA.doodads.some(d => d.kind === 'stone_cistern' || d.kind === 'palm'
        || d.kind === 'clay_pots' || d.kind === 'flowers'));
    const streamFacts = (r: PuzzleRun | undefined): string => r ? JSON.stringify({
      at: r.at, nodes: r.nodes.map(nd => [nd.pos.x, nd.pos.y]),
    }) : 'missing';
    boot(dA, [...lA.pois]);
    const factsA = streamFacts(guts.puzzles.find(r => r.id.startsWith('singing_refrain')));
    const runsA = guts.puzzles.length;
    boot(dB, [...lB.pois]);
    const factsB = streamFacts(guts.puzzles.find(r => r.id.startsWith('singing_refrain')));
    check('shrine/coexist: the authored riddle stands ALONE, either tenant',
      runsA === 1 && guts.puzzles.length === 1);
    check('shrine/coexist: its salted-stream rolls are BYTE-IDENTICAL either way',
      factsA !== 'missing' && factsA === factsB);
  }

  // G4 — THE REPLACEMENT LAW: a shrine table silences the kind's independent
  // garrison/inner lanes (the tenant fork owns the court's whole occupancy).
  {
    const rows = [{
      kind: 'well_court', weight: 1, sizeR: [200, 240] as [number, number],
      over: {
        garrison: { chance: 1, faction: 'gnoll' },
        innerChance: 1,
        tenants: SHRINE_TABLE,
      },
    }];
    const def = defOf('probe_shrine_g4', SHRINE_TABLE);
    def.layoutParams = { ...def.layoutParams, ...ONE_COURT, massifMasses: rows };
    const ctx = bareCtx(SEED);
    carveMassifs(ctx, def);
    check('shrine/replacement: the chance-1 garrison lane stayed SILENT',
      ctx.garrisons.length === 0);
    check('shrine/replacement: the inner dress lane stayed silent (no cistern/palm)',
      !ctx.doodads.some(d => d.kind === 'stone_cistern' || d.kind === 'palm'));
    check('shrine/replacement: the shrine still minted its ledger',
      !!specOf('probe_shrine_g4'));
  }

  // G5 — THE STAND-DOWN GATES: puzzle-objective zones and row-full zones are
  // never appended to; many shrine-drawing courts mint ONE shrine.
  {
    const dObj = defOf('probe_shrine_g5a', SHRINE_TABLE,
      { objective: { kind: 'puzzle', puzzle: 'ember_ring' } });
    const lObj = gen(dObj, SEED);
    check('shrine/gates: a puzzle-OBJECTIVE zone is never appended to',
      !(dObj.puzzles ?? []).length && !specOf('probe_shrine_g5a')
      && !lObj.doodads.some(d => d.kind === 'wayshrine'));
    const dFull = defOf('probe_shrine_g5b', SHRINE_TABLE, {
      puzzles: [{ id: 'ember_ring', chance: 0.5 }, { id: 'twin_accord', chance: 0.5 }],
    });
    gen(dFull, SEED);
    check('shrine/gates: the coexistence gate holds at any authored row count',
      (dFull.puzzles ?? []).length === 2 && !specOf('probe_shrine_g5b'));
    const dMany = defOf('probe_shrine_g5c', SHRINE_TABLE);
    (def => { (def.layoutParams as Record<string, unknown>).massifCoverage = [0.3, 0.35]; })(dMany);
    const lMany = gen(dMany, SEED);
    const shrineRows = (dMany.puzzles ?? []).filter(r => r.id.startsWith(COURT_SHRINE_PRESET_PREFIX));
    check('shrine/gates: many shrine-drawing courts mint ONE shrine (rest fall back)',
      shrineRows.length === 1 && lMany.doodads.filter(d => d.kind === 'wayshrine').length === 1,
      `${shrineRows.length} rows, ${lMany.doodads.filter(d => d.kind === 'wayshrine').length} altars`);
  }

  // Hygiene: dynamic ledger entries out (the E-section idiom), the stage bare.
  for (const k of Object.keys(PUZZLES)) {
    if (k.startsWith(COURT_SHRINE_PRESET_PREFIX)) delete PUZZLES[k];
  }
  guts.puzzles.length = 0;
  check('shrine/census: the wrapper kind is registered', !!PUZZLE_KINDS[COURT_SHRINE_KIND]);
}

// --- H) THE SHAPED LATTICES — formats as data, the rectangle untouched --------
{
  // H1 — the format census: seats == adjacency rows, symmetric maps with no
  // self-flips, and every format's grid pin ([cells, 1]) over-reserves its
  // own drawn spread (the placer's line footprint law). Shaped presets pin
  // their grid THROUGH latticeFormatGrid, so authored census can't drift.
  const fids = Object.keys(LATTICE_FORMATS);
  check('format census: the four house shapes are registered',
    ['wheel', 'cross', 'diamond', 'gapped'].every(f => fids.includes(f)), fids.join(','));
  for (const [fid, fmt] of Object.entries(LATTICE_FORMATS)) {
    check(`format census: '${fid}' seats and neighbor rows agree`,
      fmt.seats.length === fmt.adj.length,
      `${fmt.seats.length} seats, ${fmt.adj.length} rows`);
    check(`format census: '${fid}' neighbor map is symmetric, no self-flips`,
      fmt.adj.every((ns, i) => ns.every(j => j !== i && fmt.adj[j].includes(i))));
    // The grid pin: a validator-legal ≥2×2 rect whose product is the
    // census (house censuses are composite by design), whose reserved
    // line footprint covers the drawn spread through the placer's own
    // +90px grace (node radius 13 spent from it → 77px to spare).
    const grid = latticeFormatGrid(fid);
    const extent = Math.max(...fmt.seats.map(s => Math.max(Math.abs(s.x), Math.abs(s.y))));
    check(`format census: '${fid}' grid pin is a legal rect of the exact census`,
      grid[0] * grid[1] === fmt.seats.length && grid[0] >= grid[1] && grid[1] >= 2,
      `[${grid}] for ${fmt.seats.length} seats`);
    check(`format census: '${fid}' reserved footprint covers the drawn spread`,
      (extent - (grid[0] - 1) / 2) * 66 <= 77 + 1e-9,
      `extent ${extent.toFixed(2)} vs grid [${grid}]`);
  }
  for (const [pid, spec] of Object.entries(PUZZLES)) {
    if (!spec.format) continue;
    const fmt = LATTICE_FORMATS[spec.format];
    const pin = fmt ? latticeFormatGrid(spec.format) : [0, 0];
    check(`format census: preset '${pid}' pins its format's exact grid`,
      !!fmt && spec.kind === 'lattice' && !!spec.grid
      && spec.grid[0] === pin[0] && spec.grid[1] === pin[1],
      `${spec.format} → grid [${spec.grid}]`);
  }
  // The iceslide presets ride the same product law: grid is the body
  // budget (both dims ≥ 2 for the validator), the rect's reserve covers
  // the rink, and the block band always keeps its catch stones.
  for (const [pid, spec] of Object.entries(PUZZLES)) {
    if (spec.kind !== 'iceslide') continue;
    const bodies = (spec.grid?.[0] ?? 0) * (spec.grid?.[1] ?? 0);
    const [bw, bh] = spec.board ?? ICESLIDE_CFG.board;
    const bBand = spec.blocks ?? ICESLIDE_CFG.blocks;
    check(`slide census: preset '${pid}' grid is a legal body budget`,
      !!spec.grid && spec.grid[0] >= 2 && spec.grid[1] >= 2 && bodies >= 4);
    check(`slide census: preset '${pid}' reserve covers its rink`,
      (Math.max(bw, bh) - Math.max(spec.grid?.[0] ?? 0, spec.grid?.[1] ?? 0)) * ICESLIDE_CFG.pitch
        <= 154 + 1e-9,
      `board [${bw},${bh}] vs grid [${spec.grid}]`);
    check(`slide census: preset '${pid}' blocks keep their catch stones`,
      bBand[1] <= Math.floor(bodies / 2) && bBand[0] >= 1);
  }

  // H2 — the wheel end-to-end: boot re-seats the minted line onto the drawn
  // ring, the neighbor math is the ring's own 3-flip, a repeat strike is an
  // involution, and REPLAYING the boot's scramble strikes solves the board
  // (the strike set XORs to nothing — the scramble-from-solved guarantee
  // read backwards).
  const host = mkHost(41);
  const at = { x: p.pos.x + 300, y: p.pos.y + 5000 };
  const wheelGrid = latticeFormatGrid('wheel');
  const N = wheelGrid[0] * wheelGrid[1];
  const nodes = mkCourt('lattice_crystal', 'probe_wheel#0', N, at);
  const run = mkRun('probe_wheel#0',
    { kind: 'lattice', format: 'wheel', grid: wheelGrid }, nodes, at);
  run.kind.boot(run, host);
  const pitch = 66; // the lattice kind's own spacing — the format scales by it
  check('wheel: boot re-seats the minted line onto the drawn ring',
    nodes.every(n => Math.abs(Math.hypot(n.pos.x - at.x, n.pos.y - at.y) - 1.9 * pitch) < 0.5));
  check('wheel: the format neighbor map is installed', Array.isArray(run.state.adj));
  check('wheel: boots scrambled, never solved', !(run.state.lit as boolean[]).every(v => v));
  const before = [...(run.state.lit as boolean[])];
  run.kind.struck!(run, nodes[4], host, p);
  const after = run.state.lit as boolean[];
  const flipped = before.map((v, i) => (v !== after[i] ? i : -1)).filter(i => i >= 0);
  check('wheel: a strike flips its seat + its two ring neighbors, nothing else',
    flipped.join(',') === '3,4,5', `flipped=[${flipped}]`);
  run.kind.struck!(run, nodes[4], host, p);
  check('wheel: the same strike undoes itself (the lights-out involution)',
    (run.state.lit as boolean[]).join() === before.join());
  // Replay the scramble: mirror the boot's own draws off an identical
  // stream — rollBand([3,6]) then k node picks. (If the boot's anti-solved
  // re-roll ever fired here, this desyncs and fails LOUDLY — pick a seed.)
  const replay = mulberry32(41);
  const k = 3 + Math.floor(replay() * 4);
  for (let s = 0; s < k; s++) {
    run.kind.struck!(run, nodes[Math.floor(replay() * N)], host, p);
  }
  check('wheel: replaying the scramble strikes SOLVES the board',
    run.done && (run.state.lit as boolean[]).every(v => v)
    && host.completed.length === 1,
    run.kind.status(run));

  // H3 — absent == identical: a formatless board is never re-seated, gets
  // no neighbor map, and keeps the rectangle's verbatim five-flip.
  const host3 = mkHost(43);
  const at3 = { x: p.pos.x + 300, y: p.pos.y + 5600 };
  const nodes3 = mkCourt('lattice_crystal', 'probe_plainlat#0', 9, at3);
  const posBefore = nodes3.map(n => `${n.pos.x.toFixed(3)},${n.pos.y.toFixed(3)}`).join(' ');
  const run3 = mkRun('probe_plainlat#0', { kind: 'lattice' }, nodes3, at3);
  run3.kind.boot(run3, host3);
  check('plain lattice: boot never re-seats a formatless board',
    nodes3.map(n => `${n.pos.x.toFixed(3)},${n.pos.y.toFixed(3)}`).join(' ') === posBefore);
  check('plain lattice: no neighbor map is installed (the old path, verbatim)',
    run3.state.adj === undefined);
  const b3 = [...(run3.state.lit as boolean[])];
  run3.kind.struck!(run3, nodes3[4], host3, p);
  const f3 = b3.map((v, i) => (v !== (run3.state.lit as boolean[])[i] ? i : -1)).filter(i => i >= 0);
  check('plain lattice: the rectangle keeps its orthogonal five-flip',
    f3.join(',') === '1,3,4,5,7', `flipped=[${f3}]`);
}

// --- I) THE ICE SLIDE — the pushed block, proved honest ------------------------
// An INDEPENDENT reachability proof (written fresh here, engine untouched):
// forward slide-graph flood + a reverse flood from the solved set — the
// engine's own verifier must never be its own witness.
const probeSlideProof = (w: number, h: number, rocks: number[], sockets: number[],
  start: number[]): { solvable: boolean; trap: boolean } => {
  const solved = (b: number[]): boolean => sockets.every(s => b.includes(s));
  const keyOf = (b: number[]): string => [...b].sort((x, y) => x - y).join('|');
  const moves = (b: number[]): number[][] => {
    const out: number[][] = [];
    for (let i = 0; i < b.length; i++) {
      const solid = new Set([...rocks, ...b.filter((_, j) => j !== i)]);
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        let x = b[i] % w, y = Math.floor(b[i] / w);
        let landed = -1;
        for (;;) {
          x += dc; y += dr;
          if (x < 0 || x >= w || y < 0 || y >= h) { landed = -1; break; } // uncaught — refuses
          if (solid.has(y * w + x)) { landed = (y - dr) * w + (x - dc); break; }
        }
        if (landed < 0 || landed === b[i]) continue;
        const nb = [...b];
        nb[i] = landed;
        out.push(nb);
      }
    }
    return out;
  };
  const seen = new Map<string, number[]>([[keyOf(start), start]]);
  const outs = new Map<string, string[]>();
  const frontier = [keyOf(start)];
  while (frontier.length) {
    const kk = frontier.pop()!;
    const b = seen.get(kk)!;
    if (solved(b)) { outs.set(kk, []); continue; } // completion locks the rink
    const links: string[] = [];
    for (const nb of moves(b)) {
      const nk = keyOf(nb);
      links.push(nk);
      if (!seen.has(nk)) { seen.set(nk, nb); frontier.push(nk); }
    }
    outs.set(kk, links);
  }
  const solvedKeys = [...seen.entries()].filter(([, b]) => solved(b)).map(([kk]) => kk);
  const canFinish = new Set(solvedKeys);
  const rev = new Map<string, string[]>();
  for (const [kk, ls] of outs) for (const l of ls) rev.set(l, [...(rev.get(l) ?? []), kk]);
  const back = [...solvedKeys];
  while (back.length) {
    const kk = back.pop()!;
    for (const pk of rev.get(kk) ?? []) {
      if (!canFinish.has(pk)) { canFinish.add(pk); back.push(pk); }
    }
  }
  return {
    solvable: solvedKeys.length > 0,
    trap: [...seen.keys()].some(kk => !canFinish.has(kk)),
  };
};

{
  const pitch = ICESLIDE_CFG.pitch;
  const seatOf = (at: Vec2, w: number, h: number, cx: number, cy: number): Vec2 =>
    ({ x: at.x + (cx - (w - 1) / 2) * pitch, y: at.y + (cy - (h - 1) / 2) * pitch });

  // I1 — the scripted solve on a PINNED rink: one block at (3,1), its
  // socket at (1,1) with the catch stone at (0,1). A blow from the east
  // pushes it west; it glides two cells and SNAPS onto the socket; the
  // rink resolves. A stone answers no push (quiet), drawn == tested at
  // every rest.
  const PIN: IceSlideBoard = {
    board: [5, 4],
    rocks: [[0, 1], [4, 3]],
    blocks: [[3, 1]],
    sockets: [[1, 1]],
  };
  const host = mkHost(51);
  const at = { x: p.pos.x + 300, y: p.pos.y + 6200 };
  const nodes = mkCourt('lattice_crystal', 'probe_slide#0', 3, at);
  const run = mkRun('probe_slide#0', { kind: 'iceslide', pinned: PIN }, nodes, at);
  run.kind.boot(run, host);
  const cells = run.state.blockCells as number[];
  check('slide/pin: the pinned rink boots as authored (block, stones, socket)',
    Array.isArray(cells) && cells[0] === 1 * 5 + 3
    && (run.state.rocks as number[]).join(',') === `${1 * 5 + 0},${3 * 5 + 4}`
    && (run.state.sockets as number[])[0] === 1 * 5 + 1);
  check('slide/pin: the block wears the ice, the stones wear stone',
    nodes[0].tone === 'cold' && nodes[1].tone === 'physical' && nodes[2].tone === 'physical');
  const blockSeat = seatOf(at, 5, 4, 3, 1);
  check('slide/pin: the block stands on its authored cell (drawn == tested)',
    Math.hypot(nodes[0].pos.x - blockSeat.x, nodes[0].pos.y - blockSeat.y) < 0.01);
  run.kind.struck!(run, nodes[1], host, p);
  check('slide/stone: a struck stopper stone never budges the rink',
    !run.state.sliding && cells[0] === 1 * 5 + 3);
  // The push: strike from the EAST — the blow's bearing squares to west.
  p.pos = { x: nodes[0].pos.x + 60, y: nodes[0].pos.y };
  run.kind.struck!(run, nodes[0], host, p);
  check('slide/push: the loosed block claims its landing the moment it moves',
    !!run.state.sliding && cells[0] === 1 * 5 + 1);
  for (let f = 0; f < 60 && !run.done; f++) {
    run.kind.tick!(run, host, 1 / 60);
    step(1 / 60);
  }
  const socketSeat = seatOf(at, 5, 4, 1, 1);
  check('slide/seat: the block snapped onto the drawn socket and kindled',
    Math.hypot(nodes[0].pos.x - socketSeat.x, nodes[0].pos.y - socketSeat.y) < 0.01
    && kindledOn(nodes[0]));
  check('slide/seat: every socket seated resolves the rink',
    run.done && host.completed.length === 1 && run.kind.status(run).includes('1/1'));

  // I2 — THE CATCH LAW + the one-block law on a fresh deal of the same pin:
  // a push whose ray leaves the rink uncaught refuses outright; a block
  // already gliding swallows further pushes until it rests.
  const host2 = mkHost(52);
  const at2 = { x: p.pos.x + 300, y: p.pos.y + 6800 };
  const nodes2 = mkCourt('lattice_crystal', 'probe_slide#1', 3, at2);
  const run2 = mkRun('probe_slide#1', { kind: 'iceslide', pinned: PIN }, nodes2, at2);
  run2.kind.boot(run2, host2);
  const cells2 = run2.state.blockCells as number[];
  p.pos = { x: nodes2[0].pos.x, y: nodes2[0].pos.y - 60 }; // strike from the north — push south
  run2.kind.struck!(run2, nodes2[0], host2, p);
  check('slide/catch: an uncaught ray REFUSES the push (the block stands)',
    !run2.state.sliding && cells2[0] === 1 * 5 + 3);
  p.pos = { x: nodes2[0].pos.x + 60, y: nodes2[0].pos.y }; // now the honest west push
  run2.kind.struck!(run2, nodes2[0], host2, p);
  run2.kind.tick!(run2, host2, 1 / 60);
  step(1 / 60);
  run2.kind.struck!(run2, nodes2[0], host2, p); // mid-glide — the ice is busy
  check('slide/one-block: a gliding rink swallows further pushes',
    !!run2.state.sliding && cells2[0] === 1 * 5 + 1);
  for (let f = 0; f < 60 && !run2.done; f++) {
    run2.kind.tick!(run2, host2, 1 / 60);
    step(1 / 60);
  }
  check('slide/one-block: the glide still finishes the seat honestly', run2.done);

  // I3 — the bump: shoved square into an adjacent stopper, the block holds
  // its cell; the south lane (socket + its catcher) still solves.
  const PIN3: IceSlideBoard = {
    board: [5, 4],
    rocks: [[0, 1], [1, 3], [2, 2]],
    blocks: [[1, 1]],
    sockets: [[1, 2]],
  };
  const host3 = mkHost(53);
  const at3 = { x: p.pos.x + 300, y: p.pos.y + 7400 };
  const nodes3 = mkCourt('lattice_crystal', 'probe_slide#2', 4, at3);
  const run3 = mkRun('probe_slide#2', { kind: 'iceslide', pinned: PIN3 }, nodes3, at3);
  run3.kind.boot(run3, host3);
  const cells3 = run3.state.blockCells as number[];
  p.pos = { x: nodes3[0].pos.x + 60, y: nodes3[0].pos.y }; // push west into the adjacent stone
  run3.kind.struck!(run3, nodes3[0], host3, p);
  check('slide/bump: square into an adjacent stopper, the block holds its cell',
    !run3.state.sliding && cells3[0] === 1 * 5 + 1);
  p.pos = { x: nodes3[0].pos.x, y: nodes3[0].pos.y - 60 }; // push south onto the socket
  run3.kind.struck!(run3, nodes3[0], host3, p);
  for (let f = 0; f < 60 && !run3.done; f++) {
    run3.kind.tick!(run3, host3, 1 / 60);
    step(1 / 60);
  }
  check('slide/bump: the caught lane still seats and resolves', run3.done);

  // I4 — THE DEAL SWEEP: forty seeded two-block deals through the real
  // boot; every one must stand (zero degrades), keep an honest census
  // (bounds, disjoint bodies, a catch stone beside every socket, roles
  // dressed by seat order, bodies on the drawn lattice), boot UNSOLVED,
  // and pass the independent reachability proof: solvable, and NO
  // reachable state is a dead end — solvability BY CONSTRUCTION, proved
  // from outside the engine.
  let degrades = 0;
  const flaws: string[] = [];
  for (let sd = 0; sd < 40; sd++) {
    const hostS = mkHost(9100 + sd);
    const atS = { x: p.pos.x + 320, y: p.pos.y + 8000 + sd * 4 };
    const nodesS = mkCourt('lattice_crystal', `probe_deal#${sd}`, 10, atS);
    const runS = mkRun(`probe_deal#${sd}`,
      { kind: 'iceslide', grid: [5, 2], board: [7, 5], blocks: [2, 2] }, nodesS, atS);
    runS.kind.boot(runS, hostS);
    const cS = runS.state.blockCells as number[] | undefined;
    if (!cS) { degrades++; continue; }
    const w = runS.state.w as number, hh = runS.state.h as number;
    const rocksS = runS.state.rocks as number[];
    const socketsS = runS.state.sockets as number[];
    const all = [...rocksS, ...cS];
    const flaw = (msg: string): void => { flaws.push(`#${sd}: ${msg}`); };
    if (rocksS.length + cS.length !== 10 || cS.length !== 2 || socketsS.length !== 2) flaw('census');
    if (!all.every(c => c >= 0 && c < w * hh) || !socketsS.every(c => c >= 0 && c < w * hh)) flaw('bounds');
    if (new Set(all).size !== all.length || socketsS.some(s => rocksS.includes(s))) flaw('overlap');
    if (!socketsS.every(s => {
      const sx = s % w, sy = Math.floor(s / w);
      return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, dr]) => {
        const nx = sx + dc, ny = sy + dr;
        return nx >= 0 && nx < w && ny >= 0 && ny < hh && rocksS.includes(ny * w + nx);
      });
    })) flaw('catcherless socket');
    if (socketsS.every(s => cS.includes(s))) flaw('dealt solved');
    if (!(nodesS[0].tone === 'cold' && nodesS[1].tone === 'cold'
      && nodesS.slice(2).every(n => n.tone === 'physical'))) flaw('dress');
    const seatsTrue = nodesS.every((n, i) => {
      const cell = i < 2 ? cS[i] : rocksS[i - 2];
      const seat = seatOf(atS, w, hh, cell % w, Math.floor(cell / w));
      return Math.hypot(n.pos.x - seat.x, n.pos.y - seat.y) < 0.01;
    });
    if (!seatsTrue) flaw('off-lattice body');
    const proof = probeSlideProof(w, hh, rocksS, socketsS, cS);
    if (!proof.solvable) flaw('unsolvable');
    if (proof.trap) flaw('reachable dead end');
  }
  check('slide/sweep: forty deals, zero degrades', degrades === 0, `${degrades} degraded`);
  check('slide/sweep: every deal honest and provably trap-free',
    flaws.length === 0, flaws.slice(0, 4).join(' · '));

  // I5 — the REAL PLACER end-to-end: a pinned ice_slide objective stands
  // the rink through bootPuzzles (grid [7,1] mints exactly seven bodies,
  // roles by seat order), and zone memory re-enters it SOLVED with every
  // block seated on its socket.
  type WorldGuts = {
    puzzles: PuzzleRun[];
    farPointDraws: number;
    bootPuzzles(def: unknown, pois: Vec2[], memory?: { puzzlesDone?: string[] } | null): void;
  };
  const guts = world as unknown as WorldGuts;
  guts.puzzles.length = 0;
  guts.farPointDraws = 0;
  const mkDef = (): unknown => ({
    id: 'probe_slide_zone', level: 8, spoils: undefined,
    objective: { kind: 'puzzle', puzzle: 'ice_slide' }, puzzles: [],
  });
  guts.bootPuzzles(mkDef(), [{ x: p.pos.x + 700, y: p.pos.y + 9000 }]);
  const placed = guts.puzzles[0];
  check('slide/placer: the pinned objective stands the rink up',
    guts.puzzles.length === 1 && !!placed && placed.isObjective && placed.kind.id === 'iceslide');
  if (placed) {
    const pc = placed.state.blockCells as number[] | undefined;
    check('slide/placer: the deal stood through the real placer (no degrade)', !!pc);
    check('slide/placer: eight bodies minted — the preset body budget honored',
      placed.nodes.length === 8);
    if (pc) {
      check('slide/placer: one block, seven stones, dressed by seat order',
        pc.length === 1 && (placed.state.rocks as number[]).length === 7
        && placed.nodes[0].tone === 'cold'
        && placed.nodes.slice(1).every(n => n.tone === 'physical'));
      check('slide/placer: the status line reads the rink',
        placed.kind.status(placed).includes('0/1'));
    }
  }
  guts.farPointDraws = 0;
  guts.bootPuzzles(mkDef(), [{ x: p.pos.x + 700, y: p.pos.y + 9600 }],
    { puzzlesDone: ['ice_slide#0'] });
  const recalled = guts.puzzles[0];
  const rc = recalled?.state.blockCells as number[] | undefined;
  const rs = recalled?.state.sockets as number[] | undefined;
  check('slide/memory: a remembered solve re-enters SOLVED, blocks seated + kindled',
    !!recalled && recalled.done && !!rc && !!rs
    && rc.every((c, i) => c === rs[i]) && kindledOn(recalled.nodes[0]),
    recalled ? recalled.kind.status(recalled) : 'no run');
  guts.puzzles.length = 0;
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
