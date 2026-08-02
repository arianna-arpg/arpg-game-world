// ---------------------------------------------------------------------------
// PERF SWEEP — the generative frame-cost probe behind `npm run perf`.
//
// Measures what the PLAYER'S frame does: a fresh run is started through the
// real startGame path, one zone per tileset is minted through the real
// placeZoneAt → loadZone pipeline (World.devMintTileset), and the hero WALKS
// each zone under real requestAnimationFrame pacing — steered by the fake pad
// through the true input path, invulnerable but TARGETABLE so combat pressure
// stays honest. Telemetry comes from the main-loop ring buffers
// (__game.perfFrames: rAF gap = pacing/jitter, sim ms, render ms); each zone
// reports its ENTRY BURST (the first settleSeconds after the load, where
// chunk prefetch front-loads) separately from steady state, plus hitch counts
// at two thresholds.
//
// This module only MEASURES. Budgets and the exit-2 gate live in the launcher
// perf mode (launcher/main.cjs) reading balance/perf.config.json — data, not
// code, decides what "too slow" means. Every knob rides PerfSweepOpts, and the
// default matrix derives from the tileset registry (frontier-eligible, not
// boundless), so new biomes join the sweep the day they're authored.
// ---------------------------------------------------------------------------

import { TILESETS } from '../data/tilesets';
import { START_ZONE } from '../data/zones';
import { FluxPhase } from '../engine/flux';
import { setVisAblate, VIS_TELEMETRY } from '../render/vis/visConfig';
import { quantile } from '../sim/metrics';

export interface PerfSweepOpts {
  /** Steady-state sample window per zone, seconds (default 6). */
  seconds?: number;
  /** Entry window per zone, seconds — measured separately, then discarded
   *  from steady stats (default 1.5). */
  settleSeconds?: number;
  /** Comma-separable substring filter on tileset ids ('' = all). */
  filter?: string;
  /** Explicit matrix override (tileset ids); default = every
   *  frontier-eligible, non-boundless tileset in the registry. */
  tilesets?: string[];
  /** Class the probe run starts with (default: the first class). */
  classId?: string;
  /** DETERMINISTIC SKY: stop random front births, clear the live sky, and
   *  (unless 'clear') PIN one full-intensity front of this kind over every
   *  minted zone. Weather RNG was the biggest run-to-run variance in the
   *  gate — a snow front parked on a frozen zone is a different frame than
   *  a clear sky. Undefined = today's natural, rolled sky. */
  weather?: string;
  /** Render passes to SKIP (vis forensics — setVisAblate): attribute a
   *  GPU-side cost by turning one pass off per run at real resolution. */
  ablate?: string[];
  /** DETERMINISTIC MINTS: each tileset mints from Rng(mintSeed + its index
   *  in the FULL unfiltered matrix) — variant, name, size and layout stop
   *  re-rolling per run/world seed, so two gate runs measure the SAME zones,
   *  and a --filter run reproduces the full sweep's mints exactly (the seed
   *  index never shifts with the filter). Undefined = today's rolls. */
  mintSeed?: number;
  /** Force a tileset's FACE and/or LAYOUT GENERATOR (key '*' = every swept
   *  tileset): the gate measures a committed worst case instead of whatever
   *  the dice serve — a tileset's heavy scene is often a LAYOUT roll
   *  (jungle × the sealed-forest roof), not just a variant. `seed` pins the
   *  WHOLE mint for one tileset (outranks mintSeed + index) — the worst-case
   *  lever for tilesets whose heavy scene is a COUNT roll, not a face. */
  mintPins?: Record<string, { variant?: string; layout?: string; seed?: number }>;
  /** THE LITE STRESS (forensics — engine/lite.ts): pour this many packed-
   *  pool bodies around the hero in EVERY sampled zone (control included)
   *  before its walk. The tide chases the walking hero, so the whole
   *  steady window wades through the crowd. Deterministic (the dev pour
   *  rolls no dice); compare against a bare run of the same filter for the
   *  pool's true frame cost. Never one of the gate's own settings. */
  lite?: number;
}

export interface PerfZoneStats {
  tileset: string;
  zone: string;
  variant: string | null;
  layout: string;
  doodads: number;
  actors: number;
  /** Live LITE-TIER pool rows when the window closed (engine/lite.ts —
   *  the tide's census beside the actor count it undercuts). */
  lite: number;
  frames: number;
  /** rAF-gap percentiles/extreme (ms) — the pacing the player feels. */
  gapP50: number; gapP95: number; gapP99: number; gapMax: number;
  /** Sim (input + AI + world.update) percentiles (ms) + the window MAX —
   *  a SINGLE synchronous stall frame hides from any percentile (479 clean
   *  frames bury one 7-second fill at p99; the 2026-07-20 strand stall), so
   *  the max is what attributes a gapMax catastrophe to sim vs render vs
   *  the compositor. */
  simP50: number; simP99: number; simMax: number;
  /** Render (renderer.render, JS side) percentiles (ms) + window max. */
  renP50: number; renP99: number; renMax: number;
  /** Frames over 40 / 70 ms in the steady window (hitches). */
  hitch40: number; hitch70: number;
  /** Worst rAF gap inside the ENTRY window (zone-load burst). */
  entryWorstGap: number;
  /** Chunk-canvas bakes inside the steady window (vis telemetry): each is a
   *  fresh chunk-sized canvas alloc + GPU upload the JS timers barely see. */
  snowBakes: number; groundBakes: number;
  /** World.snowCover when the window closed (was the wash live/moving?). */
  snowCover: number;
  /** THE FRAME-TASK MARK (steady window): worst whole rAF-TASK ms — frame
   *  timestamp → the sampler's own continuation, which runs after the
   *  game's frame callback returned, so the mark covers sim + render AND
   *  the post-perfPush tail (net broadcast, hostTail) that the sim/ren
   *  brackets cannot see by position (the 2026-08-01 triad acquittal's
   *  blind spot). taskMax ≈ gapMax says the stall lived in the frame's own
   *  JS; taskMax small under a big gapMax says it lived OUTSIDE the frame
   *  task (idle/timer/GC task — cross-read ltWorst — or the compositor).
   *  Coarse by construction: a foreign task overhanging the vsync tick
   *  inflates the mark (the rAF timestamp is the frame time, not callback
   *  start), so read it beside the longtask ledger, never alone. */
  taskMax: number;
  /** Steady hitches (>40ms sampler-clock gap) whose OWNING frame's OWN
   *  work stayed ≤40ms — stalls no frame's own work explains: the systemic
   *  / off-task ledger (run-age GC, deferred idle work, compositor). Kin
   *  of hitch40 but measured at the sampler's clock, not the ring's —
   *  near, not a strict subset. THE FINE ANCHOR (2026-08-02): the owning
   *  mark anchors at tick-callback ENTRY (__game.perfTickT0), not the
   *  vsync timestamp — the coarse anchor let a foreign >40ms overhang
   *  inflate the frame's mark past 40 and ABSTAIN on exactly the stall it
   *  existed to count (gloamwood ablA: one 40.3ms pre-overhang stall,
   *  off40 0). taskMax keeps the coarse anchor deliberately (read beside
   *  the 'pre' slab); only the abstention test reads fine. */
  offTask40: number;
  /** Long Tasks API ledger over the steady window: main-thread tasks over
   *  50ms (count + worst duration ms), WHATEVER task they were — frame
   *  tasks, deferred idle autosaves, timers, GC-as-task. Attribute-free
   *  but bracket-honest: a big ltWorst with a small taskMax convicts the
   *  space BETWEEN frames. -1 = this runtime lacks 'longtask'. */
  ltCount: number; ltWorst: number;
  /** THE PHASE LEDGER's window-worst slab (src/main.ts): the NAME of the
   *  frame's single worst section over 'pre' (vsync→callback overhang —
   *  the taskMax coarse-anchor disambiguator: a foreign task wearing the
   *  frame's name lands HERE), 'head' (pad/pointer/couch before the sim
   *  bracket), 'sim'/'ren' (the standing brackets), 'tail' (post-perfPush
   *  net + hostTail, carried ≤1 frame late by position) — plus its ms.
   *  A gapMax ≈ taskMax row with sim99/ren99 tiny self-attributes here.
   *  '' = no slab marked (an empty window). */
  slabName: string; slabMs: number;
  /** Frames the steady window PUSHED but the ring no longer held when it
   *  closed (0 = clean). The rings are sized to the window up front
   *  (perfRingSize — seconds × measured refresh + margin), so any nonzero
   *  here is a sizing failure worth shouting about: the dropped frames are
   *  the window's OLDEST, exactly where bakes cluster, and h40/gapMax
   *  silently undercount (the 2026-08-02 gloamwood base2 lesson). */
  ringWrap: number;
  /** THE ENTRY ANNOTATION (2026-08-02): '' or one sentence naming a >500ms
   *  stall inside the entry window and whether the frame's OWN work explains
   *  it. A foreign machine-wide freeze landing in the 1.5s entry window
   *  once minted caul entry=2117 (solo: 63ms, same bytes) and cost a solo
   *  re-run to acquit — the artifact now documents itself on the row. */
  entryNote: string;
}

/** One row the sweep could not measure — and WHY, as data the gate can
 *  route (launcher/main.cjs): 'unmintable' (the registry has no such id)
 *  and 'load-fallback' (minted but the load fell back — spread collision,
 *  refused layout) are mint-machinery refusals and stay report-only;
 *  'hold' (the walker stood in the zone and could not keep one clean
 *  window pair in HOLD_ATTEMPTS tries) GATES like a breach — a shipping
 *  zone that cannot be measured is a verdict to read, not a silence.
 *  'wedge' (2026-08-02) is minted LAUNCHER-SIDE by the perf deadman
 *  (launcher/perfdeadman.cjs) — a renderer wedged inside one endless
 *  World.update cannot report its own death, so the watchdog names the
 *  seat that held the window when the beats stopped and files this row
 *  into the partial report; it ALWAYS gates, no waiver exists. The union
 *  lives here so the report vocabulary has one home; the sampler itself
 *  never produces it. */
export interface PerfSkipRow {
  id: string;
  class: 'unmintable' | 'load-fallback' | 'hold' | 'wedge';
  note: string;
}

export interface PerfSweepReport {
  control: PerfZoneStats;
  /** THE AGED CONTROL: the SAME town, re-sampled after the last matrix row
   *  (the 2026-08-01 acquittal: a run-global stall GROWS with sweep age and
   *  wears whichever zone holds the window — the growth bracket had to be
   *  reconstructed by hand from seat medians). start-town vs end-town is
   *  the run's own aging, machine-independent, printed beside the zones.
   *  Evidence only — it gates nothing. Null if the aged walk could not
   *  hold its window (report-only; the START control's throw still guards
   *  sweep validity). */
  controlEnd: PerfZoneStats | null;
  zones: PerfZoneStats[];
  canvas: { w: number; h: number };
  dpr: number;
  sampleSeconds: number;
  matrix: string[];
  skipped: PerfSkipRow[];
  /** Forensics provenance: the pinned sky ('' = natural) + ablated passes. */
  weather: string;
  ablate: string[];
}

const PERF_SPREAD_BASE = 11; // staggers mint coordinates across the sweep

/** Fake-pad turn rate, radians per SECOND of wall clock. 1.2 rad/s IS the
 *  old per-frame `dir += 0.02` at the gate machine's 60Hz vsync (0.02 ×
 *  60fps) — committed zones walk the same arcs their budgets were
 *  calibrated on; only the framerate dependence is gone. */
const WALK_TURN_RATE = 1.2;
/** Turn-integration dt ceiling (ms) — mirrors the main loop's own sim
 *  clamp (`Math.min(0.05, dt)`, main.ts): through a stall frame the hero
 *  moves at most 50ms of ground, so the stick turns at most 50ms of arc —
 *  curvature stays constant in SPACE, and one 7-second stall frame cannot
 *  whip the heading a full lap between samples. */
const WALK_DT_CLAMP_MS = 50;
/** Window-pair restarts before a row gives up as skipped. Each retry
 *  rotates the starting heading by RETRY_TURN (~137°), so the walker
 *  sweeps a different arc instead of marching deterministically back into
 *  the same sinkhole or span gap. */
const HOLD_ATTEMPTS = 3;
const RETRY_TURN = 2.4;
/** THE HAZARD WHISKER's probe horizons (units ahead of the hero), longest
 *  first — a fine chasm maze that rings every long ray still usually opens
 *  a short one down a corridor — and the deflection fan: candidate
 *  headings swing ±WHISKER_STEP × 1..WHISKER_FAN (≈±160°) alternating
 *  sides, so the walker turns as little as needed and can turn around at
 *  a dead end. */
const WHISKER_REACH = [72, 36];
const WHISKER_STEP = 0.35;
const WHISKER_FAN = 8;
/** THE RHYTHM WHISKER (galestream 2026-08-02: the walker could not hold the
 *  gate's flux artery in 3 attempts — three re-mints, three falls to the
 *  world below). The blind spot was TEMPORAL, not spatial: fallHazardAt
 *  reads the LIVE grid, but flux ground (engine/flux.ts) is walkable NOW
 *  and gone LATER on a pure clock — the 6s warmup holds everything solid
 *  through the settle window and into the steady walk, then the drift
 *  begins MID-WINDOW (t=6 < 1.5+8) and ~half the pad area evaporates under
 *  a walker that strolled onto it while every probe honestly read "safe".
 *  (Gusts are innocent: the first fires at warmup+18..28s, past every gate
 *  window.) The fix asks the exact question the AI's own x_ride_flux
 *  steering asks — the pad's phase, which is a PURE FUNCTION of the clock,
 *  so the probe reads the FUTURE truth at arrival time: a pad must hold
 *  from arrival through a crossing margin or the ray refuses it, and lane
 *  ground (raft-run — solid only where a moving carrier stands) is never
 *  boarded blind. Reading the rhythm IS the zone's design thesis; the
 *  walker still walks the pads, meets the packs, faults the chunks and
 *  pays the flux layer's render bill — it just stops stepping onto ground
 *  that will not outlast the step. */
const FLUX_WALK_SPEED = 120; // rough hero stride, u/s — probe-eta conversion
const FLUX_CROSS_SEC = 1.2; // ground must outlast arrival by a crossing
/** THE ENTRY ANNOTATION threshold: a gap past this inside the entry window
 *  gets attributed on the row (foreign freeze vs the zone's own load). The
 *  2026-08-02 full sweep minted caul entry=2117 from a machine-wide ~2s
 *  freeze (solo re-run: 63ms, same bytes) — the row now names such an
 *  artifact itself instead of costing the acquittal run. */
const ENTRY_FOREIGN_MS = 500;

/** One sentence attributing an over-threshold entry stall, '' below it.
 *  Discrimination rides walkPhase's fine own-task mark: a giant gap whose
 *  owning frame's OWN work stayed tiny is a foreign (machine/compositor)
 *  stall wearing the zone's name; own work ≈ the gap is the zone's honest
 *  load burst; the window's FIRST gap has no seen owner and says so. */
function entryStallNote(e: { worst: number; worstOwn: number }): string {
  if (e.worst <= ENTRY_FOREIGN_MS) return '';
  const gapMs = e.worst.toFixed(0);
  if (!Number.isFinite(e.worstOwn)) {
    return `entry gap ${gapMs}ms owned by the window's first frame (own work unseen) — cross-check solo before billing the zone`;
  }
  const own = e.worstOwn.toFixed(0);
  return e.worstOwn <= 50
    ? `FOREIGN ${gapMs}ms stall in the entry window (own frame task ${own}ms) — a machine-wide freeze, not this zone's bill`
    : `heavy entry frame: ${gapMs}ms gap, own work ${own}ms`;
}

/** ID-STABLE mint seed: fold the tileset id (FNV-1a) into mintSeed, so a
 *  row's mint can NEVER re-roll because the registry grew or reordered.
 *  The old index-derived seed re-rolled every later row each time a pass
 *  inserted a tileset — variant roulette silently swapped sandsea's judged
 *  face from 'whaleback swell' (sim-heavy, breaching) to a light face and
 *  crypt's from 'plague pit' between sweeps (2026-07-19). One-time re-roll
 *  of every row on adoption; insertion-proof forever after. Coordinates
 *  keep the index spread — a forced seed owns all content rolls. */
function mintSeedFor(base: number, id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (base + (h >>> 0)) >>> 0;
}

type FrameDump = {
  gap: number[]; sim: number[]; ren: number[];
  pushed: number;
  phase: { name: string; ms: number };
};

function reduceFrames(f: FrameDump, entryWorstGap: number, meta: {
  tileset: string; zone: string; variant: string | null; layout: string;
  doodads: number; actors: number; lite: number;
  snowBakes: number; groundBakes: number; snowCover: number;
  taskMax: number; offTask40: number; ltCount: number; ltWorst: number;
  slabName: string; slabMs: number; entryNote: string;
}): PerfZoneStats {
  const gap = [...f.gap].sort((a, b) => a - b);
  const sim = [...f.sim].sort((a, b) => a - b);
  const ren = [...f.ren].sort((a, b) => a - b);
  const q = (s: number[], p: number): number => (s.length ? +quantile(s, p).toFixed(1) : 0);
  return {
    ...meta, frames: gap.length,
    gapP50: q(gap, 0.5), gapP95: q(gap, 0.95), gapP99: q(gap, 0.99),
    gapMax: gap.length ? +gap[gap.length - 1].toFixed(1) : 0,
    simP50: q(sim, 0.5), simP99: q(sim, 0.99),
    simMax: sim.length ? +sim[sim.length - 1].toFixed(1) : 0,
    renP50: q(ren, 0.5), renP99: q(ren, 0.99),
    renMax: ren.length ? +ren[ren.length - 1].toFixed(1) : 0,
    hitch40: f.gap.filter(g => g > 40).length,
    hitch70: f.gap.filter(g => g > 70).length,
    entryWorstGap: +entryWorstGap.toFixed(1),
    ringWrap: Math.max(0, f.pushed - f.gap.length),
  };
}

export async function perfSweep(opts: PerfSweepOpts = {}): Promise<PerfSweepReport> {
  const g = window.__game;
  if (!g) throw new Error('perfSweep: window.__game missing — game not booted');
  const raf = (): Promise<number> => new Promise(r => requestAnimationFrame(r));
  const sampleMs = (opts.seconds ?? 6) * 1000;
  const settleMs = (opts.settleSeconds ?? 1.5) * 1000;

  // THE DEADMAN BEAT (launcher/perfdeadman.cjs): under the desktop perf
  // harness the perf-only preload (launcher/perf-preload.cjs) exposes
  // window.__perfBeat → ipc 'perf:beat', and the launcher's watchdog reads
  // the pulse — beats silent past its dial mean the renderer's main thread
  // is WEDGED (one endless World.update starves rAF, saves and stdout all
  // at once; two 2026-08-01 verdict sweeps died as 19-minute silent
  // freezes). Boundary beats also CARRY each completed row, so a killed
  // run still yields a partial report and the launcher can print live
  // progress. In dev-browser play the bridge doesn't exist and every call
  // no-ops. beatWalk pulses ~1/s from the walk loop's continuation — after
  // the frame-task mark, beside the whisker work, so its sub-ms cost bills
  // the sampler, never the game's own frame.
  const beatFn = (window as unknown as { __perfBeat?: (p: unknown) => void }).__perfBeat;
  let beatTileset = '(sweep)';
  let beatWalkAt = 0;
  const beat = (at: string, extra?: Record<string, unknown>): void => {
    if (!beatFn) return;
    try { beatFn({ at, tileset: beatTileset, t: Math.round(performance.now()), ...extra }); }
    catch { /* beat-wire rot must never fail a measurement */ }
  };
  const beatWalk = (): void => {
    const nw = performance.now();
    if (nw - beatWalkAt < 1000) return;
    beatWalkAt = nw;
    beat('walk');
  };

  // THE LONGTASK LEDGER: one PerformanceObserver for the whole sweep, its
  // counts windowed per zone at the steady boundaries. Long Tasks catch
  // what NO in-frame bracket can: >50ms main-thread tasks whoever ran them
  // — frame tasks (cross-check taskMax), the idle-deferred autosave, timer
  // work, GC-as-task. Delivery is async, so window boundaries drain
  // synchronously via takeRecords(); a task that STARTED before the window
  // opened but ended inside it lands in-window — coarse and bracket-honest.
  const ltLedger = { count: 0, worst: 0 };
  let ltObs: PerformanceObserver | null = null;
  try {
    if (PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
      ltObs = new PerformanceObserver(list => {
        for (const e of list.getEntries()) {
          ltLedger.count++;
          if (e.duration > ltLedger.worst) ltLedger.worst = e.duration;
        }
      });
      ltObs.observe({ entryTypes: ['longtask'] });
    }
  } catch { ltObs = null; }
  /** Fold any not-yet-delivered entries into the ledger, synchronously. */
  const ltDrain = (): void => {
    if (!ltObs) return;
    for (const e of ltObs.takeRecords()) {
      ltLedger.count++;
      if (e.duration > ltLedger.worst) ltLedger.worst = e.duration;
    }
  };
  /** Open a window: discard everything observed so far (delivered or
   *  pending) — the mint/travel/gc debt between windows is nobody's row. */
  const ltReset = (): void => {
    if (!ltObs) return;
    ltObs.takeRecords();
    ltLedger.count = 0; ltLedger.worst = 0;
  };

  // A fresh probe run through the REAL start path (menus dismissed).
  g.devStartRun(opts.classId);
  beat('start');

  // THE GATE PINS SCALE 1 (render/renderScale.ts): the sweep judges the
  // authored render bill — an auto-governor stepping the buffer down mid-
  // sample would gate a moving target and flatter every heavy zone.
  g.settings().renderScale = 1;

  // THE RING FIT (2026-08-02): size the main-loop frame rings to THIS
  // sweep's window before anything samples. The old constant 2048 slots
  // filled in ~8.5s at 240Hz — a --seconds=12 window WRAPPED, dropping its
  // OLDEST frames (exactly where bakes cluster) so h40/gapMax silently
  // undercounted while the sampler-side off40 kept counting (gloamwood
  // base2: off40 5 vs h40 0 at frames=2048 exact). Sized STATICALLY to a
  // 400Hz worst case, never to measured pacing: the first fit measured a
  // boot-time median (12.6ms — the machine still hot from its own rebuild)
  // and the aged-town window then ran at 7.3ms, wrapping a 2049-slot ring
  // by 672 frames (perf_20260802183456 — the backstop's first catch, same
  // hour it was built). Pacing shifts per zone and per run-age; a static
  // ceiling cannot undersize on any real display and costs ~100KB at 20s.
  // Every row's ringWrap stays the loud backstop regardless.
  g.perfRingSize(Math.ceil((sampleMs / 1000) * 400) + 64);

  setVisAblate(opts.ablate ?? []);
  /** DETERMINISTIC SKY (opts.weather): silence the random sky, then pin one
   *  plateau-intensity front on the CURRENT zone's node (age mid-life keeps
   *  the lifecycle ramp at 1 for the whole run; vel 0 parks it). 'clear'
   *  pins an empty sky. Undefined leaves today's rolled weather alone. */
  const pinWeather = (): void => {
    if (opts.weather === undefined) return;
    const zw = g.world();
    const field = zw.sim.weather;
    field.spawnScale = 0;
    field.fronts.length = 0;
    if (opts.weather && opts.weather !== 'clear') {
      field.fronts.push({
        kind: opts.weather, pos: { x: zw.zone.map.x, y: zw.zone.map.y },
        vel: { x: 0, y: 0 }, radius: 5000, intensity: 1,
        age: 500_000, life: 1_000_000,
      });
    }
  };

  /** Steer the left stick in a slow arc for `ms` — real input path, real
   *  movement, real chunk faults at the camera edge. THE TIME-BASED ARC:
   *  the heading advances by wall time (WALK_TURN_RATE × the frame gap,
   *  sim-clamped), never per frame — the old `dir += 0.02` made the PATH a
   *  function of framerate: a hitching zone turned the stick slower in wall
   *  time while the hero kept full dt-driven speed, so exactly the zones
   *  under load straightened their arcs, ranged wider, and were likeliest
   *  to walk out of their own sample (karst_reach / aether_vesper /
   *  galestream all skipped whole windows, 2026-08-01). THE ZONE GUARD:
   *  every frame checks the zone id and the phase aborts the moment the
   *  walker leaves, so no window ever mixes two zones' frames. Returns the
   *  worst rAF gap seen (the entry-burst readout) + whether the walk
   *  stayed home; the caller owns the travel back and the restart. */
  const walkPhase = async (ms: number, dir0 = 0.6): Promise<{
    worst: number; held: boolean; taskMax: number; offTask40: number;
    /** The OWN-work mark of the frame that owned the worst gap — the entry
     *  annotation's discriminator (foreign freeze vs honest heavy frame). */
    worstOwn: number;
  }> => {
    const homeZid = g.world().zone.id;
    let dir = dir0, worst = 0, worstOwn = Infinity;
    // THE STALL LEDGER (the 2026-08-01 triad acquittal): the run-global
    // stall lived AFTER perfPush by position — in neither the sim nor the
    // ren bracket — and the meta pass then moved the autosave into idle
    // tasks, where no in-frame bracket can ever see it. Close the seam
    // POSITIONALLY from the sampler's own seat: this continuation runs
    // after the game's whole rAF callback (the pump re-arms at its end, so
    // its callback always precedes our resolver in the frame's batch),
    // which makes (performance.now() − rAF timestamp) a coarse mark over
    // the ENTIRE frame task — sim, render, perfPush, and the tail behind
    // it. Captured before the walker's own whisker/steer work, so the
    // sampler's sub-ms cost bills itself, not the game. THE FINE ANCHOR
    // (2026-08-02): the same subtraction from tick-callback ENTRY
    // (__game.perfTickT0 — stamped by the game's tick, which ran earlier
    // in THIS frame's batch) is the frame's OWN work with the foreign
    // vsync→callback overhang excluded; the off40 abstention reads it, so
    // a foreign >40ms overhang can no longer eat its own evidence.
    let taskMax = 0, offTask40 = 0, prevTask = Infinity, prevOwn = Infinity;
    let prev = performance.now();
    const t0 = prev;
    while (performance.now() - t0 < ms) {
      // THE HAZARD WHISKER (karst_reach 2026-08-01: the blind arc found the
      // chasm maze's gulfs on every heading — three restarts, zero clean
      // windows): probe the ray ahead through World.fallHazardAt — THE
      // self-preservation probe, the exact question the AI steering veto
      // asks — so the walker refuses fall/skyfall/descend/eject/instakill
      // region cells (chasms, the aether void) AND fall-able pit doodads
      // precisely where a steered mind would, and deflects to the nearest
      // safe heading before stepping. Honest traversal in gulf country IS
      // walking around the gulfs; only the fake pad was suicidal. On
      // hazard-free ground every probe reads safe at the first ray and the
      // arc is untouched. Condition-TIMED drops (a span standing down
      // UNDERFOOT, collapse, flux) stay the zone guard's to catch — no
      // static probe can see ground that was held when stepped on.
      const zw = g.world();
      const at = zw.player.pos;
      // THE RHYTHM WHISKER (see FLUX_CROSS_SEC): flux ground answers for
      // its FUTURE, not just its present — a pad must read walkable at
      // probe-arrival AND still at arrival + the crossing margin (both via
      // padPhase, the pure clock function the drift itself runs on), and
      // lane cells refuse always (solid only where a raft happens to
      // stand; a walker that boards one blind is marooned when it slides).
      // Non-flux zones take the zw.flux null fast path — zero new work.
      const fx = zw.flux;
      const fluxHolds = (x: number, y: number, eta: number): boolean => {
        if (!fx) return true;
        if (!fx.ownedAt(x, y)) return true; // stable paint, portal clears, slivers
        const pad = fx.padAt(x, y);
        if (!pad) return false; // lane ground — raft-run, never boarded blind
        const holdsAt = (t: number): boolean => {
          const s = fx.padPhase(pad, t).s;
          return s === FluxPhase.Solid || s === FluxPhase.Fraying;
        };
        const arrive = fx.clock + eta;
        return holdsAt(arrive) && holdsAt(arrive + FLUX_CROSS_SEC);
      };
      const rayFree = (a: number, reach: number): boolean => {
        const mx = at.x + Math.cos(a) * reach * 0.5, my = at.y + Math.sin(a) * reach * 0.5;
        const ex = at.x + Math.cos(a) * reach, ey = at.y + Math.sin(a) * reach;
        return !zw.fallHazardAt(zw.player, mx, my) && !zw.fallHazardAt(zw.player, ex, ey)
          && fluxHolds(mx, my, reach * 0.5 / FLUX_WALK_SPEED)
          && fluxHolds(ex, ey, reach / FLUX_WALK_SPEED);
      };
      for (const reach of WHISKER_REACH) {
        if (rayFree(dir, reach)) break;
        let turned = false;
        for (let k = 1; k <= WHISKER_FAN && !turned; k++) {
          const off = WHISKER_STEP * k;
          if (rayFree(dir + off, reach)) { dir += off; turned = true; }
          else if (rayFree(dir - off, reach)) { dir -= off; turned = true; }
        }
        if (turned) break;
        // Every heading at this reach ends in a drop — fall through to the
        // shorter horizon; ringed even there, hold course and let the
        // guard own whatever follows.
      }
      g.fakePad({ axes: [Math.cos(dir), Math.sin(dir), 0, 0], buttons: [] });
      const now = await raf();
      const taskEnd = performance.now(); // first thing after the frame's task
      const gap = now - prev;
      if (gap > worst) { worst = gap; worstOwn = prevOwn; }
      // A hitch gap covers the interval SINCE the previous frame — the frame
      // task inside that interval is the PREVIOUS iteration's mark. A >40ms
      // gap whose owning frame's OWN work stayed ≤40ms is a stall no frame's
      // own work explains (the first gap of a window abstains: its task is
      // unseen). The abstention reads the FINE mark (tick-entry anchored):
      // the coarse mark folds the vsync→callback overhang in, so a foreign
      // >40ms task inflated it past 40 and the metric ate its own evidence
      // (gloamwood ablA, 2026-08-02 — one 40.3ms stall, off40 0).
      if (gap > 40 && prevOwn <= 40) offTask40++;
      prevTask = taskEnd - now;
      prevOwn = taskEnd - g.perfTickT0();
      if (prevTask > taskMax) taskMax = prevTask;
      prev = now;
      beatWalk(); // the deadman's ~1/s pulse (sampler-side, post-mark)
      dir += WALK_TURN_RATE * Math.min(gap, WALK_DT_CLAMP_MS) / 1000;
      if (g.world().zone.id !== homeZid) return { worst, held: false, taskMax, offTask40, worstOwn };
    }
    return { worst, held: true, taskMax, offTask40, worstOwn };
  };

  // THE MID-WALK EXIT + THE RESTART LAW (aether_vesper 2026-07-28: a
  // skyfall off a void-realm isle whose spans stood down landed the walker
  // in a mournstead forest, which wore the vesper row's budget and gated
  // the sweep — report perf_20260728052558; the post-hoc skip that replaced
  // it then let karst_reach/aether_vesper/galestream silently SKIP whole
  // windows, 2026-08-01): when the walk leaves its zone — a sinkhole
  // DESCENDS the walker (pit fabric), a span stands down into skyfall, a
  // portal step — the guard travels back and RESTARTS the interrupted
  // window pair from scratch on a rotated heading, instead of either
  // gating a foreign zone's frames or giving the row up unmeasured. THE
  // PIT RULING: a descend is leave-and-return, never sample-continue — the
  // row's meta and budget describe ONE zone, a pit cave is a different
  // tileset at cave scale, and resuming a half window would mix the
  // descend stitch + foreign frames into a steady state the gate
  // calibrated on home ground alone. The travel back reproduces the mint's
  // own landing (loadZone + landPartyAt arena center — world.ts
  // devTravelTo), and the re-entry chunk burst lands in the DISCARDED
  // settle window, exactly like the original entry burst. A row that
  // cannot hold one clean window pair in HOLD_ATTEMPTS tries returns null
  // and skips — measured never trumps honest.
  const sampleCurrentZone = async (tilesetId: string): Promise<PerfZoneStats | null> => {
    beatTileset = tilesetId; // the deadman's holder: who owns the window now
    beat('sample');
    const homeZid = g.world().zone.id;
    // Worst entry gap across ALL attempts: the first attempt carries the
    // mint's true load burst — a retry's cheaper re-entry must not launder
    // the row's entry-burst verdict. The annotation follows the worst gap
    // (the value the gate judges), so the note always explains the number
    // on the row.
    let entryWorst = 0;
    let entryNote = '';
    const returnHome = (): boolean => {
      const ok = g.world().devTravelTo(homeZid); // false only off-graph — cannot happen for minted/START zones
      if (ok) pinWeather(); // the pinned front re-parks on the home node
      return ok;
    };
    for (let attempt = 0; attempt < HOLD_ATTEMPTS; attempt++) {
      const zw = g.world();
      zw.player.invulnerable = true; // unkillable but TARGETABLE: combat stays real
      // THE LITE STRESS: the tide pours before the entry walk, so both the
      // burst and the steady window carry the full crowd. Re-poured after a
      // guard restart (the travel back reloads the zone); lite.spawn refuses
      // past the pool cap, so a surviving tide tops up instead of doubling.
      if (opts.lite) zw.devLitePour('vermin_tide', opts.lite);
      const dir0 = 0.6 + attempt * RETRY_TURN;
      const entry = await walkPhase(settleMs, dir0);
      if (entry.worst > entryWorst) {
        entryWorst = entry.worst;
        entryNote = entryStallNote(entry);
      }
      if (!entry.held) { if (!returnHome()) break; continue; }
      // Drain the zone-hop garbage NOW, inside the discarded window: a sweep
      // hops zones at a rate no player ever will, and V8's collection storm
      // otherwise lands mid-sample on whichever zone holds the window when
      // the threshold trips — the breach wears an innocent zone's name
      // (tundra 2026-07-12; gutworks 2026-07-16, clean twice solo). The
      // launcher exposes gc for --perf-test only; normal play never has it.
      (window as unknown as { gc?: () => void }).gc?.();
      // One discarded frame between the gc and the window: a longtask entry
      // is minted when its TASK ends, and the gc above runs inside OUR
      // current task — resetting the ledger in the same task would let our
      // own window-opening pause deliver INTO the fresh window. The raf
      // closes our task first; its entry (if any) dies in ltReset's drain.
      await raf();
      ltReset();
      g.perfFrames(true); // discard the entry burst; the steady window begins
      VIS_TELEMETRY.snowBakes = 0;
      VIS_TELEMETRY.groundBakes = 0;
      const steady = await walkPhase(sampleMs, dir0);
      if (!steady.held) { if (!returnHome()) break; continue; }
      ltDrain(); // pending in-window entries, folded before the snapshot
      const zw2 = g.world();
      const dump = g.perfFrames(false); // rings + the PHASE LEDGER's window slab
      return reduceFrames(dump, entryWorst, {
        tileset: tilesetId, zone: zw2.zone.name,
        variant: zw2.zone.variantName ?? null,
        layout: zw2.zone.layoutType ?? 'plains',
        doodads: zw2.doodads.length, actors: zw2.actors.length,
        lite: zw2.lite.liveCount,
        snowBakes: VIS_TELEMETRY.snowBakes, groundBakes: VIS_TELEMETRY.groundBakes,
        snowCover: +zw2.snowCover.toFixed(2),
        taskMax: +steady.taskMax.toFixed(1), offTask40: steady.offTask40,
        ltCount: ltObs ? ltLedger.count : -1,
        ltWorst: ltObs ? +ltLedger.worst.toFixed(1) : -1,
        slabName: dump.phase.name, slabMs: +dump.phase.ms.toFixed(1),
        entryNote,
      });
    }
    return null;
  };

  // CONTROL: the town — every relative budget compares against this, so the
  // verdict travels across machines (a slow laptop slows both sides). A
  // pinned sky applies here too: the control must not be hostage to a front
  // that happened to drift over town.
  g.world().devTravelTo(START_ZONE);
  pinWeather();
  const control = await sampleCurrentZone('(town)');
  if (!control) throw new Error('perfSweep: the town control could not hold its window — sweep aborted');
  beat('control', { row: control });

  // THE MATRIX: frontier-eligible tilesets first (registry order — their
  // mint-seed indices are calibration state and must not shift), then the
  // perfProbe OPT-INS appended (caves and minted interiors: walkable steady
  // states the frontier:false proxy was hiding from the gate). Realm
  // tilesets stay out BY THE REGISTRY's own word: a launch-gated melting
  // shelf has no steady state for a blind probe walk (the floor dissolves,
  // the walker falls into a random zone, and the row measures the stitch);
  // boundless streamers need package context a bare mint cannot supply. An
  // explicit opts.tilesets override can still name anything for forensics.
  const wants = (opts.filter ?? '').split(',').map(s => s.trim()).filter(Boolean);
  const registry = Object.values(TILESETS);
  const fullMatrix = opts.tilesets ?? [
    ...registry.filter(t => t.frontier !== false && !t.boundless),
    ...registry.filter(t => t.frontier === false && t.perfProbe && !t.boundless),
  ].map(t => t.id);
  // The filter selects WHICH rows run; seed and spread always derive from
  // the FULL matrix position, so a filtered run mints the exact zones the
  // full sweep gates (any subset reproduces, not just index-preserving
  // prefixes).
  const matrix = fullMatrix.filter(id => !wants.length || wants.some(f => id.includes(f)));

  const zones: PerfZoneStats[] = [];
  const skipped: PerfSkipRow[] = [];
  for (const id of matrix) {
    const idx = fullMatrix.indexOf(id);
    const pin = opts.mintPins?.[id] ?? opts.mintPins?.['*'];
    // Name the holder BEFORE the synchronous mint: a wedge inside the mint
    // path itself then wears the right tileset in the deadman's row.
    beatTileset = id;
    beat('mint');
    const zid = g.world().devMintTileset(id, PERF_SPREAD_BASE + idx, 8, {
      ...(pin?.seed !== undefined ? { seed: pin.seed }
        : opts.mintSeed !== undefined ? { seed: mintSeedFor(opts.mintSeed, id) } : {}),
      ...(pin?.variant ? { variant: pin.variant } : {}),
      ...(pin?.layout ? { layoutType: pin.layout } : {}),
    });
    if (!zid) {
      const skip: PerfSkipRow = { id, class: 'unmintable', note: 'the registry has no such tileset' };
      skipped.push(skip);
      beat('skip', { skip });
      continue;
    }
    if (g.world().zone.id !== zid) {
      // The mint minted but the LOAD fell back (spread-coordinate collision,
      // refused layout): without this guard the row samples whatever zone
      // the walker is still standing in and wears its numbers as a pass —
      // snowcrown wore the TOWN's row (2026-07-19).
      const skip: PerfSkipRow = { id, class: 'load-fallback', note: `load fell back to '${g.world().zone.name}'` };
      skipped.push(skip);
      beat('skip', { skip });
      continue;
    }
    pinWeather(); // re-pin on the fresh zone's own node
    const stats = await sampleCurrentZone(id);
    if (!stats) {
      // The walker could not hold one clean window pair in HOLD_ATTEMPTS
      // tries (the restart law above) — a row that did not stay home is not
      // a measurement of its tileset. NOT the unmintable lane: this zone
      // ships and players will walk it, so the harness GATES a hold skip
      // like a breach (launcher/main.cjs skip gate; the committed waiver
      // for a deliberately unholdable row is overrides[<id>].allowSkip in
      // balance/perf.config.json — the 2026-08-01 ratified policy).
      const skip: PerfSkipRow = { id, class: 'hold', note: `walker could not hold the zone in ${HOLD_ATTEMPTS} attempts` };
      skipped.push(skip);
      beat('skip', { skip });
      continue;
    }
    zones.push(stats);
    beat('row', { row: stats });
  }

  // THE AGED CONTROL: the same town, the same window pair, at the sweep's
  // END — the pair (control vs controlEnd) brackets what the RUN's age
  // costs, on the one zone whose bill cannot have changed. The 2026-08-01
  // acquittal had to reconstruct this bracket by hand from seat medians to
  // exonerate three zones; now every report carries it. Evidence only —
  // the launcher prints both rows and their delta, and gates nothing on it.
  g.world().devTravelTo(START_ZONE);
  pinWeather();
  const controlEnd = await sampleCurrentZone('(town aged)');
  beat('aged', { row: controlEnd });

  g.fakePad(null);
  setVisAblate([]);
  ltObs?.disconnect();

  const cv = document.getElementById('game') as HTMLCanvasElement | null;
  return {
    control, controlEnd, zones,
    canvas: { w: cv?.width ?? 0, h: cv?.height ?? 0 },
    dpr: window.devicePixelRatio || 1,
    sampleSeconds: opts.seconds ?? 6,
    matrix, skipped,
    weather: opts.weather ?? '',
    ablate: opts.ablate ?? [],
  };
}
