// ---------------------------------------------------------------------------
// PERF SWEEP — the generative frame-cost probe behind `npm run perf`.
//
// Measures what the PLAYER'S frame does: a fresh run is started through the
// real startGame path, one zone per tileset is minted through the real
// placeZoneAt recipe and retained preparation/transfer, and the hero WALKS
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

import { retainedPerfTravel, withPerfProfile, assertPerfWalk, assertPerfFrames } from './nativePerfTravel';
import { heapMB, rampListFor, rampSlopes, regimeOf, validateResidencyCourse, validateResidencyMatrix, residencyError, residencyWindowIssues, residencyRowIssues, type PerfResidencyBoundary, type PerfResidencyWindow, RAMP_DEFAULT_STEPS, RESIDENCY_COURSE_NOTES, type PerfCourse, type PerfFreshRow, type PerfMintReceipt, type PerfRampReport, type PerfRampStep, type PerfRuntimeIdentity } from './perfResidency';
import { sidezoneOf } from '../data/sidezones';
import { TILESETS } from '../data/tilesets';
import { skyOf, START_ZONE } from '../data/zones';
import { FluxPhase } from '../engine/flux';
import { suppressSaves } from '../meta/persistence';
import { setVisAblate, VIS_TELEMETRY } from '../render/vis/visConfig';
import { quantile } from '../sim/metrics';
import { DAY_LENGTH } from '../world/daynight';
import { radianceCondHeld, type RadianceCond } from '../world/radiance';

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
  /** THE RESIDENCY INSTRUMENT (src/dev/perfResidency.ts; docs/design/
   *  desktop-residency.md): 'fresh' = one fresh run per matrix row (the town
   *  control at one resident area, the zone at two: an UNMATCHED residency
   *  contrast, read from the actual census, recorded as such, never judged
   *  against the cumulative caps); 'ramp' = one run, the town re-sampled
   *  after each visit while the residency grows. Both are report-only and
   *  run in their own launcher invocation; the request is validated before
   *  any start. Undefined = the original cumulative course, untouched. */
  course?: PerfCourse;
  /** THE MATCHED START: the manifest seed every fresh start of an additive
   *  course uses (devStartRun(classId, seed)), so each row's world deals the
   *  same town. Required with a course; undefined = today's rolled seed (the
   *  original course). */
  seed?: number;
  /** Ramp length in steps, step 0 (the town alone) included; default 8. */
  rampSteps?: number;
  /** The ramp's visited order (steps 1..K-1); default rampListFor: the
   *  pinned heavy faces first, then light tilesets in matrix order, or the
   *  whole matrix in sweep order when K covers it. */
  rampList?: string[];
  /** THE AGE CONTROL: a ramp that visits nothing, so the residency stays at
   *  one while the run ages. A comparison under unmatched ages, not an
   *  isolation (the report says so beside its steps). */
  rampAgeControl?: boolean;
}

export interface PerfZoneStats {
  tileset: string;
  zone: string;
  variant: string | null;
  layout: string;
  doodads: number;
  actors: number;
  /** Whole retained campaign census, sampled after this window. */
  residentAreas: number; residentActors: number;
  worldSeconds: number; walkDistance: number; pausedFrames: number;
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
  /** Which hold attempt produced this row (1 = the walker held its first
   *  window pair; >1 = the restart law spent retries first). The hold-proof
   *  ledger for the flap class the 2026-08-03 close retired — a row that
   *  keeps arriving on attempt 3 is a flap the skip gate cannot see. */
  attempts: number;
  /** Additive instrument only: all attempts, including discarded windows. */
  residency?: { windows: PerfResidencyWindow[]; issues: string[]; valid: boolean };
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
  runtime: 'retained-native';
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
  /** THE RESIDENCY INSTRUMENT's fields (src/dev/perfResidency.ts): absent on
   *  the original cumulative course, whose report is unchanged. */
  course?: PerfCourse;
  startSeed?: number | null;
  saves?: { suppressed: boolean; reason: string | null };
  fresh?: PerfFreshRow<PerfZoneStats>[];
  ramp?: PerfRampReport<PerfZoneStats>;
  residencyWindows?: PerfResidencyWindow[];
  selectedMatrix?: { ids: string[]; explicitOverride: boolean };
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
 *  headings swing ±WHISKER_STEP × 1..WHISKER_FAN (±180° — the FULL circle)
 *  alternating sides, so the walker turns as little as needed and can turn
 *  around at a dead end. Full circle since 2026-08-03: the old 8-step fan
 *  (±160°) left a rear dead-zone — a walker pinned at an isle rim facing
 *  the void, its only safe ground DIRECTLY BEHIND, rang every ray it could
 *  see and marched forward off the edge (one of the hold-flap's three
 *  legs; see THE PATIENT RING in walkPhase for the other exit). */
const WHISKER_REACH = [72, 36];
const WHISKER_STEP = 0.35;
const WHISKER_FAN = 9;
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
/** THE SKY WHISKER (the hold-class close, 2026-08-03: the two committed
 *  allowSkip waivers — galestream + aether_vesper — traced to arrival-state
 *  roulette, not the mints: mintSeed pins the same 'Racing Passage' /
 *  'Midnight Walk' zones solo and at matrix scale, but a full sweep runs
 *  ~19 minutes ≈ 4.75 of the 240s day wheels, so WHERE a row lands on the
 *  wheel is the cumulative duration of every prior row — dice a solo run
 *  never rolls, arriving at its fixed benign phase ~90s after boot). Span
 *  ground (engine/spans.ts) is the flux blind spot's CONDITIONAL sibling:
 *  walkable NOW and gone LATER on the SKY's clock. Radiance is a pure
 *  function of (world time, front kind, shelter), so the probe projects
 *  the future exactly as padPhase does: span ground must hold its
 *  RadianceCond at arrival AND arrival + this crossing margin, and FADING
 *  ground (the 3.2s shimmer a reading player runs off) is never boarded at
 *  all. Under the gate's pinned sky the projection is exact; a natural-sky
 *  forensics run projects the current front kind forward — honest at
 *  whisker horizons. The margin is generous because the sky's clock is
 *  slow (DAY_LENGTH 240s, light slope ≈0.013/s at the span boundaries): it
 *  refuses only boundary-adjacent boarding, so the walker keeps to the
 *  isles through a twilight crossing exactly as a player does — "the
 *  crossing thins twice a day" is the zone's own design text. */
const SPAN_CROSS_SEC = 4.5;
/** THE MEASURED STRIDE (the eta model's honesty): FLUX_WALK_SPEED assumes
 *  a clear road, but at matrix scale the pack roll rides the LIVE spawn
 *  stream plus the day wheel's night bias (countMul 1.4) — the same mint
 *  fields 28..41 actors across sweeps — and a crowd-slowed hero arrives
 *  LATE on ground the whisker approved for on-time arrival. Etas now
 *  divide by an EMA of the stride actually being made good (sim-clock
 *  measured, so hitch pacing — where the flux clock and the hero dilate
 *  together — never skews it; only true obstruction does), clamped so a
 *  momentary wall-press can't zero it. */
const STRIDE_FLOOR = 60; // u/s — half nominal; keeps etas finite and sane
const STRIDE_EMA = 0.1; // per-frame blend toward the measured stride
/** THE STREAK DODGE (aether_vesper's second killer, 2026-08-03): the night's
 *  cometfall lanes (data/creeps.ts — front.speed 235, drag.accel 210) are
 *  narrow marching sections that streak the VOIDS, and their wake CARRIES
 *  covered bodies along the bearing — forced displacement, which
 *  fallHazardAt exempts BY DESIGN, so a comet crossing the walker drags it
 *  over a void lip no whisker ray ever approved. The creep doctrine's own
 *  text names the counterplay — "stepping aside is always the cheaper
 *  answer" — so the walker now does what a player does: any point inside
 *  the swept corridor of a fast marching front (speed past the threshold;
 *  slow washes stay walkable weather) within the horizon refuses rays and
 *  the stand, and a hero already inside the corridor steers PERPENDICULAR
 *  out of it, fall/flux/span refusals still honored (never dodge into the
 *  void). Corridor width rides the source's own broad-phase bound — the
 *  drawn skin IS the hit surface, read conservatively. */
const STREAK_DODGE_SPEED = 150; // u/s — fronts at least this fast are dodged
const STREAK_HORIZON_SEC = 2.5; // corridor lookahead when deciding to dodge
const STREAK_SLACK = 24; // extra corridor half-width beyond the source bound
/** THE DOOR CLEARANCE (the patient ring's own hazard, 2026-08-03): sidezone
 *  mouths travel on a DWELL — stand idle inside transitRadius (28 default)
 *  + reach for dwellOf seconds (wane_arch: 0.7s) and the world politely
 *  descends you. Running over a mouth never triggers (the dwell demands
 *  playerIdle), so only the stand-still branch is exposed: the walker never
 *  PARKS within this clearance of any mouth doodad (cave_entrance or a
 *  registered sidezone kind); ringed on a mouth it keeps walking instead. */
const MOUTH_STAND_CLEAR = 64;
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
  residentAreas: number; residentActors: number;
  worldSeconds: number; walkDistance: number; pausedFrames: number;
  snowBakes: number; groundBakes: number; snowCover: number;
  taskMax: number; offTask40: number; ltCount: number; ltWorst: number;
  slabName: string; slabMs: number; entryNote: string; attempts: number;
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

  try {
  // A fresh probe run through the REAL start path (menus dismissed).
  // THE REQUEST VALIDATION (src/dev/perfResidency.ts): a malformed or
  // contradictory residency request is refused here, before any start and
  // before the save suppression; the original course carries no residency
  // option and passes untouched.
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

  const courseFaults = [...validateResidencyCourse(opts), ...validateResidencyMatrix(opts, fullMatrix, registry.map(t => t.id))];
  if (courseFaults.length) throw new Error('perfSweep: residency course refused: ' + courseFaults.join('; '));
  await g.hydrated();
  const course: PerfCourse = opts.course ?? 'cumulative';
  // THE SUPPRESSION (the residency instrument's one side effect, taken away):
  // an additive course runs in ITS OWN launcher invocation and writes nothing
  // durable: every later account/run save is refused with one console line
  // (meta/persistence.ts); the original course is untouched by construction.
  if (course !== 'cumulative') suppressSaves(RESIDENCY_COURSE_NOTES.saveReason);
  const sweepStartedAt = { wall: performance.now(), iso: new Date().toISOString() };
  withPerfProfile(g.account(), () => g.devStartRun(opts.classId, opts.seed), () => g.saveAccount());
  const initialStartupMs = +(performance.now() - sweepStartedAt.wall).toFixed(1);
  const runtime = g.retained();
  if (!runtime) throw new Error('perfSweep: retained native startup is missing');
  let travel = retainedPerfTravel(runtime);
  let selectedRuntime = runtime;
  let startOrdinal = 0;
  const residencyWindows: PerfResidencyWindow[] = [];
  const objectIds = new WeakMap<object, number>();
  let nextObjectId = 1;
  const objectId = (value: object): number => { let id = objectIds.get(value); if (id === undefined) { id = nextObjectId++; objectIds.set(value, id); } return id; };
  const residencyBoundary = (): PerfResidencyBoundary => {
    const actual = g.retained();
    if (!actual) throw new Error('perfSweep: residency boundary has no retained runtime');
    const area = actual.current; // preserve the native readiness/current ownership check
    const census = travel.census(); // retains the selected receiver's native check
    return { wallMs: performance.now(), wallAt: new Date().toISOString(), campaignSec: g.world().time,
      runtime: objectId(actual), expectedRuntime: objectId(selectedRuntime), writer: objectId(actual.writer), area: objectId(area),
      zone: area.assembly.input.scene.zone.id, writerMatchesWorld: actual.writer === g.world(), ready: actual.ready, census };
  };
  if (g.world().scene) throw new Error('perfSweep: a cinematic is still active');
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
    worldSeconds: number; walkDistance: number; pausedFrames: number;
    /** The OWN-work mark of the frame that owned the worst gap — the entry
     *  annotation's discriminator (foreign freeze vs honest heavy frame). */
    worstOwn: number;
    /** THE EXIT STORY (hold forensics, 2026-08-03): where an unheld walk
     *  LANDED and when — the difference between a span dying underfoot at a
     *  wheel crossing, a shove into the void, and a strolled-through door
     *  is invisible in a bare held:false, and the hold-class close spent a
     *  full A/B run learning that the hard way. Report-only provenance. */
    exit?: { atMs: number; zone: string; tileset: string; time: number; snap: string };
  }> => {
    const homeZid = g.world().zone.id;
    let dir = dir0, worst = 0, worstOwn = Infinity;
    const worldStart = g.world().time;
    let walkDistance = 0, pausedFrames = 0;
    let walkPrevious = { ...g.world().player.pos };
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
    // THE SKY WHISKER's ledger (see SPAN_CROSS_SEC): the HOME zone's span
    // rows keyed by the region kind their cells wear — held kinds carry
    // their RadianceCond for the future read, fading twins carry the
    // refuse-always mark (the shimmer IS the leaving telegraph; regionAt
    // returns the fabric's own paint, so the paint is the state). Built
    // once per phase: the zone guard aborts the phase the frame the walker
    // leaves, so the ledger never describes foreign ground for longer than
    // the guard's own check. Zones without a live span fabric leave it
    // empty — the probe's null fast path, zero new work.
    const spanLedger = new Map<string, { when: RadianceCond; dying: boolean }>();
    {
      const zw0 = g.world();
      if (zw0.spans) {
        for (const s of zw0.zone.theme.spans ?? []) {
          spanLedger.set(s.region, { when: s.when, dying: false });
          spanLedger.set(s.fadeRegion ?? `${s.region}_fading`, { when: s.when, dying: true });
        }
      }
    }
    const sheltered = skyOf(g.world().zone) === 'sheltered';
    // THE DOOR CLEARANCE's ledger (see MOUTH_STAND_CLEAR): every mouth the
    // dwell gate could open under an idle stander. Doodads never move; once
    // per phase is the honest cost.
    const mouthSpots: { x: number; y: number }[] = [];
    for (const d of g.world().doodads) {
      if (d.kind === 'cave_entrance' || sidezoneOf(d.kind)) mouthSpots.push({ x: d.pos.x, y: d.pos.y });
    }
    const mouthNear = (x: number, y: number): boolean => {
      for (const m of mouthSpots) {
        const dx = x - m.x, dy = y - m.y;
        if (dx * dx + dy * dy < MOUTH_STAND_CLEAR * MOUTH_STAND_CLEAR) return true;
      }
      return false;
    };
    // THE MEASURED STRIDE (see STRIDE_FLOOR): the eta denominator, blended
    // toward the stride actually made good over frames the walker COMMANDED
    // movement (sim-clock displacement — commanded stand-stills and menu
    // holds never sample).
    let strideNow = FLUX_WALK_SPEED;
    let stridePrev: { x: number; y: number; t: number } | null = null;
    // THE EXIT SNAPSHOT (hold forensics): the guard fires AFTER the zone
    // swapped — player pos, actors, creep are already the DESTINATION's —
    // so the last frame's view of the HOME zone is kept here and the exit
    // story reads it: where the walker stood, whether a forced push was
    // live (knockback/drag — the fall probe exempts forced displacement BY
    // DESIGN, so a shove into the void is invisible to every whisker),
    // how many bodies crowded it, and the nearest fast streak.
    let lastSnap = { x: 0, y: 0, push: false, foes: 0, streak: -1 };
    let pushAgo = Infinity; // sim-seconds since a push was last live
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
      // arc is untouched. Clock-TIMED drops are the whiskers' own business
      // now — flux pads through padPhase (THE RHYTHM WHISKER) and span
      // ground through the projected sky (THE SKY WHISKER) — leaving only
      // one-way collapse melt to the zone guard, the single fabric whose
      // future no pure clock can read.
      const zw = g.world();
      const fallHazardAt = travel.hazards();
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
      // THE SKY WHISKER (see SPAN_CROSS_SEC): span ground answers for its
      // future exactly as flux pads do — the sky's clock instead of the
      // drift's. One skyFront read per frame, and only on span ground.
      const skyKind = spanLedger.size ? (zw.skyFront()?.kind ?? null) : null;
      const spanHolds = (x: number, y: number, eta: number): boolean => {
        if (!spanLedger.size) return true;
        const k = zw.walk?.regionAt?.(x, y);
        const row = k !== undefined ? spanLedger.get(k) : undefined;
        if (!row) return true; // permanent ground — the fall probe's business
        if (row.dying) return false; // fading: never board a failing span
        const arrive = zw.time + eta;
        return radianceCondHeld(row.when, arrive, skyKind, sheltered)
          && radianceCondHeld(row.when, arrive + SPAN_CROSS_SEC, skyKind, sheltered);
      };
      // THE STREAK DODGE's threat read (see STREAK_DODGE_SPEED): the first
      // fast marching front whose swept corridor covers (x,y) within the
      // horizon — bearing + which side of its line the point sits on, the
      // exact geometry the perpendicular exit needs. Null = no threat.
      const streakThreat = (x: number, y: number, horizon: number): { dx: number; dy: number; across: number } | null => {
        const cf = zw.creep;
        if (!cf) return null;
        for (const s of cf.sources) {
          const fr = s.front;
          if (!fr) continue;
          const spd = s.def.front?.speed ?? 0;
          if (spd < STREAK_DODGE_SPEED) continue;
          const rx = x - s.pos.x, ry = y - s.pos.y;
          const along = rx * fr.dx + ry * fr.dy;
          const across = -rx * fr.dy + ry * fr.dx;
          const width = s.bound + STREAK_SLACK;
          if (Math.abs(across) > width) continue;
          if (along < -width) continue; // the streak already passed this point
          if (along > spd * horizon + width) continue; // not imminent yet
          return { dx: fr.dx, dy: fr.dy, across };
        }
        return null;
      };
      // THE RIM REFUSAL (the hold-class close's true killer, 2026-08-03 —
      // exit stories perf_20260803021827: all three vesper deaths at x≈15,
      // foes 0, push none, streak 1745u — the walker pressed the zone's own
      // WEST RIM): regionAt answers 'wall' OFF-GRID, and walls are not fall
      // hazards, so a ray pointed past the rim reads BENIGN while the thin
      // in-grid void band slips between the hero and the 18u mid sample —
      // then the confine arrests the press against the void edge and the
      // boundary law ("you cannot lean on the sky", the 0.6s debounce)
      // resolves the skyfall the whisker never saw. Off-grid samples now
      // refuse the ray outright: walking into a wall is never progress, and
      // in rim-void country the off-grid answer was a lie. Costs nothing in
      // walled zones (the fan deflects along the wall the confine would
      // have ground against) and closes the rim death spiral in every
      // aetherial recipe.
      const inField = (x: number, y: number): boolean =>
        x >= 0 && y >= 0 && x < zw.arena.w && y < zw.arena.h;
      const rayFree = (a: number, reach: number, blindToStreaks = false): boolean => {
        const mx = at.x + Math.cos(a) * reach * 0.5, my = at.y + Math.sin(a) * reach * 0.5;
        const ex = at.x + Math.cos(a) * reach, ey = at.y + Math.sin(a) * reach;
        return inField(mx, my) && inField(ex, ey)
          && !fallHazardAt(zw.player, mx, my) && !fallHazardAt(zw.player, ex, ey)
          && fluxHolds(mx, my, reach * 0.5 / strideNow)
          && fluxHolds(ex, ey, reach / strideNow)
          && spanHolds(mx, my, reach * 0.5 / strideNow)
          && spanHolds(ex, ey, reach / strideNow)
          && (blindToStreaks
            || (!streakThreat(mx, my, reach * 0.5 / strideNow + 0.8)
              && !streakThreat(ex, ey, reach / strideNow + 0.8)));
      };
      // THE STREAK DODGE: already inside an imminent corridor — steer
      // PERPENDICULAR out (the shortest exit, preferring the side already
      // held), corridor-blind (crossing the remaining width IS the escape)
      // but fall/flux/span-honest: never dodge into the void. Overrides the
      // arc for exactly as long as the corridor covers the hero.
      let dodged = false;
      {
        const threat = streakThreat(at.x, at.y, STREAK_HORIZON_SEC);
        if (threat) {
          const side = threat.across >= 0 ? 1 : -1;
          const outs = [
            Math.atan2(side * threat.dx, -side * threat.dy),
            Math.atan2(-side * threat.dx, side * threat.dy),
          ];
          outer: for (const base of outs) {
            for (const off of [0, 0.5, -0.5]) {
              if (rayFree(base + off, WHISKER_REACH[1], true)) { dir = base + off; dodged = true; break outer; }
            }
          }
        }
      }
      let open = false;
      if (!dodged) for (const reach of WHISKER_REACH) {
        if (rayFree(dir, reach)) { open = true; break; }
        let turned = false;
        for (let k = 1; k <= WHISKER_FAN && !turned; k++) {
          const off = WHISKER_STEP * k;
          if (rayFree(dir + off, reach)) { dir += off; turned = true; }
          else if (rayFree(dir - off, reach)) { dir -= off; turned = true; }
        }
        if (turned) { open = true; break; }
        // Every heading at this reach ends in refused ground — fall through
        // to the shorter horizon.
      }
      let moving = true;
      if (!dodged && !open) {
        // THE PATIENT RING (2026-08-03 — the marooning residual the true-
        // meters pass named): every heading at every reach refuses. The old
        // fallback held course and MARCHED into exactly the ground the fan
        // had just refused — on a dying flux island or a twilight isle rim
        // that is the fall, and at matrix scale the arrival-state dice roll
        // it often enough to spend all three attempts (the hold-class flap;
        // the whole diagnosis lives on SPAN_CROSS_SEC's banner). A reader
        // of the rhythm STANDS on ground that holds: pads alternate half a
        // period apart and spans re-rise, so a waiter's ray opens within
        // seconds — the walker keeps meeting packs and paying the frame
        // bill where it stands (the fakePad below keeps feeding the real
        // input path; only the stick is centered). On ground that is itself
        // dying, standing buys nothing: sprint for any heading that at
        // least stays out of the void — along the fading span toward its
        // end is exactly what a player caught mid-crossing does.
        const ownSafe = fluxHolds(at.x, at.y, 0) && spanHolds(at.x, at.y, 0)
          && !fallHazardAt(zw.player, at.x, at.y)
          && !streakThreat(at.x, at.y, STREAK_HORIZON_SEC) // never stand in a comet's path
          && !mouthNear(at.x, at.y); // never PARK inside a door's dwell disc
        if (ownSafe) {
          moving = false; // stand and read the rhythm — re-probed next frame
        } else {
          const r = WHISKER_REACH[WHISKER_REACH.length - 1];
          for (let k = 0; k <= WHISKER_FAN * 2; k++) {
            const a2 = dir + (k % 2 ? 1 : -1) * WHISKER_STEP * Math.ceil(k / 2);
            const mx = at.x + Math.cos(a2) * r * 0.5, my = at.y + Math.sin(a2) * r * 0.5;
            const ex = at.x + Math.cos(a2) * r, ey = at.y + Math.sin(a2) * r;
            if (inField(mx, my) && inField(ex, ey)
              && !fallHazardAt(zw.player, mx, my) && !fallHazardAt(zw.player, ex, ey)) {
              dir = a2;
              break;
            }
          }
          // Ringed even by void on every side: hold course — nothing can
          // save this seat, and the guard owns whatever follows.
        }
      }
      g.fakePad(moving
        ? { axes: [Math.cos(dir), Math.sin(dir), 0, 0], buttons: [] }
        : { axes: [0, 0, 0, 0], buttons: [] });
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
      // THE MEASURED STRIDE's sample: displacement per SIM second across the
      // frame that just ran — the pad set above drove it, so `moving` is the
      // honest gate. Sim-clock division makes hitch pacing a non-event (the
      // hero AND every fabric clock dilate together under the dt clamp);
      // only true obstruction — a pack wall, a shoreline press — reads as a
      // shorter stride, and the whisker's etas lengthen to match.
      const w2 = g.world();
      if (w2.timeflow.worldScale() <= 0) pausedFrames++;
      if (w2.zone.id === homeZid && moving)
        walkDistance += Math.hypot(w2.player.pos.x - walkPrevious.x, w2.player.pos.y - walkPrevious.y);
      walkPrevious = { ...w2.player.pos };
      if (moving && stridePrev) {
        const dtSim = w2.time - stridePrev.t;
        if (dtSim > 1e-3) {
          const sp = Math.hypot(w2.player.pos.x - stridePrev.x, w2.player.pos.y - stridePrev.y) / dtSim;
          strideNow += STRIDE_EMA * (Math.min(FLUX_WALK_SPEED, Math.max(STRIDE_FLOOR, sp)) - strideNow);
        }
      }
      stridePrev = { x: w2.player.pos.x, y: w2.player.pos.y, t: w2.time };
      if (moving) dir += WALK_TURN_RATE * Math.min(gap, WALK_DT_CLAMP_MS) / 1000;
      if (w2.zone.id !== homeZid) {
        return {
          worst, held: false, taskMax, offTask40, worstOwn,
          worldSeconds: w2.time - worldStart, walkDistance, pausedFrames,
          exit: {
            atMs: performance.now() - t0, zone: w2.zone.name,
            tileset: w2.zone.tileset ?? '?', time: w2.time,
            snap: `@(${lastSnap.x},${lastSnap.y}) foes80=${lastSnap.foes}`
              + ` push=${pushAgo < 9 ? pushAgo.toFixed(1) + 's' : 'no'}`
              + (lastSnap.streak >= 0 ? ` streak=${lastSnap.streak}u` : ''),
          },
        };
      }
      // The exit snapshot (still HOME here — the guard above returned if not).
      {
        const p2 = w2.player;
        if (p2.push) pushAgo = 0; else pushAgo += Math.min(gap, 200) / 1000;
        let foes = 0;
        for (const m of w2.actors) {
          if (m === p2 || m.dead) continue;
          const ddx = m.pos.x - p2.pos.x, ddy = m.pos.y - p2.pos.y;
          if (ddx * ddx + ddy * ddy <= 80 * 80) foes++;
        }
        let streak = -1;
        const cf2 = w2.creep;
        if (cf2) {
          for (const s of cf2.sources) {
            if (!s.front || (s.def.front?.speed ?? 0) < STREAK_DODGE_SPEED) continue;
            const d2 = Math.hypot(s.pos.x - p2.pos.x, s.pos.y - p2.pos.y);
            if (streak < 0 || d2 < streak) streak = Math.round(d2);
          }
        }
        lastSnap = { x: Math.round(p2.pos.x), y: Math.round(p2.pos.y), push: !!p2.push, foes, streak };
      }
    }
    return { worst, held: true, taskMax, offTask40, worstOwn,
      worldSeconds: g.world().time - worldStart, walkDistance, pausedFrames };
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
  // THE EXIT STORIES' hand-off: sampleCurrentZone fills this on a give-up so
  // the caller's skip row can NAME the three deaths (report provenance only).
  let lastHoldStories: string[] = [];
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
    // THE EXIT STORIES (hold forensics): one line per unheld phase — where
    // the walker landed, how deep into the phase, and the day wheel's
    // position (world.time is the global clock; travel never resets it, so
    // the exit's own timestamp carries the phase). A hold skip's note now
    // NAMES its three deaths instead of shrugging.
    const holdStories: string[] = [];
    lastHoldStories = holdStories; // visible to the caller's skip row
    const storyOf = (attempt: number, phase: string, e: { atMs: number; zone: string; tileset: string; time: number; snap: string }): string => {
      const wheel = (((e.time % DAY_LENGTH) + DAY_LENGTH) % DAY_LENGTH) / DAY_LENGTH;
      return `a${attempt + 1} ${phase}+${(e.atMs / 1000).toFixed(1)}s -> '${e.zone}' (${e.tileset}) wheel ${wheel.toFixed(2)} ${e.snap}`;
    };
    const returnHome = (): boolean => {
      const ok = travel.travelTo(homeZid); // false only off-graph — cannot happen for minted/START zones
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
      if (opts.lite) travel.pourLite('vermin_tide', opts.lite);
      const dir0 = 0.6 + attempt * RETRY_TURN;
      const entry = await walkPhase(settleMs, dir0);
      if (entry.worst > entryWorst) {
        entryWorst = entry.worst;
        entryNote = entryStallNote(entry);
      }
      if (!entry.held) {
        if (entry.exit) holdStories.push(storyOf(attempt, 'entry', entry.exit));
        if (!returnHome()) break;
        continue;
      }
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
      if (!steady.held) {
        if (steady.exit) holdStories.push(storyOf(attempt, 'steady', steady.exit));
        if (!returnHome()) break;
        continue;
      }

      ltDrain(); // pending in-window entries, folded before the snapshot
      const zw2 = g.world();
      const dump = g.perfFrames(false); // rings + the PHASE LEDGER's window slab
      assertPerfFrames(dump.gap.length, g.crash().fatal);
      assertPerfWalk(steady.worldSeconds, steady.walkDistance, steady.pausedFrames);
      return reduceFrames(dump, entryWorst, {
        tileset: tilesetId, zone: zw2.zone.name,
        variant: zw2.zone.variantName ?? null,
        layout: zw2.zone.layoutType ?? 'plains',
        doodads: zw2.doodads.length, actors: zw2.actors.length,
        ...travel.census(),
        worldSeconds: steady.worldSeconds, walkDistance: steady.walkDistance, pausedFrames: steady.pausedFrames,
        lite: zw2.lite.liveCount,
        snowBakes: VIS_TELEMETRY.snowBakes, groundBakes: VIS_TELEMETRY.groundBakes,
        snowCover: +zw2.snowCover.toFixed(2),
        taskMax: +steady.taskMax.toFixed(1), offTask40: steady.offTask40,
        ltCount: ltObs ? ltLedger.count : -1,
        ltWorst: ltObs ? +ltLedger.worst.toFixed(1) : -1,
        slabName: dump.phase.name, slabMs: +dump.phase.ms.toFixed(1),
        entryNote,
        attempts: attempt + 1,
      });
    }
    return null;
  };

  // Additive-only boundary instrumentation. Each callback keeps its original
  // exception; a failed egress read is separate evidence and cannot replace it.
  const recordResidencyWindow = <T extends { held: boolean }>(tileset: string, attempt: number,
    phase: PerfResidencyWindow['phase'], ingress: PerfResidencyBoundary, value: T | undefined,
    failed: boolean, firstError: unknown): void => {
    let egress: PerfResidencyBoundary | null = null, egressError: PerfResidencyWindow['egressError'] = null;
    let readFailure: unknown;
    try { egress = residencyBoundary(); } catch (error) { readFailure = error; egressError = residencyError(error); }
    const row: PerfResidencyWindow = { index: residencyWindows.length, tileset, attempt, phase, ingress, egress,
      held: value?.held ?? null, error: failed ? residencyError(firstError) : null, egressError, issues: [], valid: false };
    row.issues = residencyWindowIssues(row); row.valid = row.issues.length === 0;
    residencyWindows.push(row); beat('residency-window', { window: row });
    if (failed) throw firstError;
    if (egressError) throw readFailure;
  };
  const residencyWalk = async (tileset: string, attempt: number, phase: 'entry' | 'steady' | 'visit-entry', ms: number, dir: number): Promise<Awaited<ReturnType<typeof walkPhase>>> => {
    const ingress = residencyBoundary();
    let value: Awaited<ReturnType<typeof walkPhase>> | undefined, failed = false, firstError: unknown;
    try { value = await walkPhase(ms, dir); } catch (error) { failed = true; firstError = error; }
    recordResidencyWindow(tileset, attempt, phase, ingress, value, failed, firstError);
    return value!;
  };
  const residencyRetryReturn = (tileset: string, attempt: number, operation: () => boolean): boolean => {
    const ingress = residencyBoundary();
    let value: boolean | undefined, failed = false, firstError: unknown;
    try { value = operation(); } catch (error) { failed = true; firstError = error; }
    recordResidencyWindow(tileset, attempt, 'retry-return', ingress, value === undefined ? undefined : { held: value }, failed, firstError);
    return value!;
  };
  const sampleResidencyZone = async (tilesetId: string): Promise<PerfZoneStats | null> => {
    const windowStart = residencyWindows.length;
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
    // THE EXIT STORIES (hold forensics): one line per unheld phase — where
    // the walker landed, how deep into the phase, and the day wheel's
    // position (world.time is the global clock; travel never resets it, so
    // the exit's own timestamp carries the phase). A hold skip's note now
    // NAMES its three deaths instead of shrugging.
    const holdStories: string[] = [];
    lastHoldStories = holdStories; // visible to the caller's skip row
    const storyOf = (attempt: number, phase: string, e: { atMs: number; zone: string; tileset: string; time: number; snap: string }): string => {
      const wheel = (((e.time % DAY_LENGTH) + DAY_LENGTH) % DAY_LENGTH) / DAY_LENGTH;
      return `a${attempt + 1} ${phase}+${(e.atMs / 1000).toFixed(1)}s -> '${e.zone}' (${e.tileset}) wheel ${wheel.toFixed(2)} ${e.snap}`;
    };
    const returnHome = (): boolean => {
      const ok = travel.travelTo(homeZid); // false only off-graph — cannot happen for minted/START zones
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
      if (opts.lite) travel.pourLite('vermin_tide', opts.lite);
      const dir0 = 0.6 + attempt * RETRY_TURN;
      const entry = await residencyWalk(tilesetId, attempt + 1, 'entry', settleMs, dir0);
      if (entry.worst > entryWorst) {
        entryWorst = entry.worst;
        entryNote = entryStallNote(entry);
      }
      if (!entry.held) {
        if (entry.exit) holdStories.push(storyOf(attempt, 'entry', entry.exit));
        if (!residencyRetryReturn(tilesetId, attempt + 1, returnHome)) break;
        continue;
      }
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
      const steady = await residencyWalk(tilesetId, attempt + 1, 'steady', sampleMs, dir0);
      if (!steady.held) {
        if (steady.exit) holdStories.push(storyOf(attempt, 'steady', steady.exit));
        if (!residencyRetryReturn(tilesetId, attempt + 1, returnHome)) break;
        continue;
      }

      ltDrain(); // pending in-window entries, folded before the snapshot
      const zw2 = g.world();
      const dump = g.perfFrames(false); // rings + the PHASE LEDGER's window slab
      assertPerfFrames(dump.gap.length, g.crash().fatal);
      assertPerfWalk(steady.worldSeconds, steady.walkDistance, steady.pausedFrames);
      const stats = reduceFrames(dump, entryWorst, {
        tileset: tilesetId, zone: zw2.zone.name,
        variant: zw2.zone.variantName ?? null,
        layout: zw2.zone.layoutType ?? 'plains',
        doodads: zw2.doodads.length, actors: zw2.actors.length,
        ...travel.census(),
        worldSeconds: steady.worldSeconds, walkDistance: steady.walkDistance, pausedFrames: steady.pausedFrames,
        lite: zw2.lite.liveCount,
        snowBakes: VIS_TELEMETRY.snowBakes, groundBakes: VIS_TELEMETRY.groundBakes,
        snowCover: +zw2.snowCover.toFixed(2),
        taskMax: +steady.taskMax.toFixed(1), offTask40: steady.offTask40,
        ltCount: ltObs ? ltLedger.count : -1,
        ltWorst: ltObs ? +ltLedger.worst.toFixed(1) : -1,
        slabName: dump.phase.name, slabMs: +dump.phase.ms.toFixed(1),
        entryNote,
        attempts: attempt + 1,
      });
      const windows = residencyWindows.slice(windowStart);
      const issues = residencyRowIssues(windows);
      return { ...stats, residency: { windows, issues, valid: issues.length === 0 } };
    }
    return null;
  };

  // CONTROL: the town — every relative budget compares against this, so the
  // verdict travels across machines (a slow laptop slows both sides). A
  // pinned sky applies here too: the control must not be hostage to a front
  // that happened to drift over town.
  const initialReturnStartedAt = performance.now();
  travel.travelTo(START_ZONE);
  pinWeather();
  const initialReturnSyncMs = +(performance.now() - initialReturnStartedAt).toFixed(1);
  const control = await (course === 'cumulative' ? sampleCurrentZone('(town)') : sampleResidencyZone('(town)'));
  if (!control) throw new Error('perfSweep: the town control could not hold its window — sweep aborted');
  beat('control', { row: control });


  const zones: PerfZoneStats[] = [];
  const skipped: PerfSkipRow[] = [];
  // ---- THE RESIDENCY INSTRUMENT (src/dev/perfResidency.ts; docs/design/desktop-residency.md) ----
  // Her ruling (2026-10-16, policy D): the original cumulative course above
  // and below keeps its control, matrix, aged bracket, budgets and gate; two
  // ADDITIVE courses measure the residency itself, each in its own launcher
  // invocation (THE SUPPRESSION at the start: nothing durable is written),
  // each REPORT-ONLY (no cap is applied to these rows and no verdict is
  // implied; the launcher prints them as their own tables). They reuse the
  // sweep's own walker, windows, mint levers and census through the closures
  // above; the course branch returns before the original matrix loop runs.
  const heapNow = (): number | null => heapMB(performance as unknown as { memory?: { usedJSHeapSize?: unknown } });
  /** THE RUNTIME IDENTITY of the run a sample belongs to: its ordinal (0 = the
   *  sweep's own start), wall start, startup cost and manifest seed. */
  const identity = (startupMs: number, startedAt: string): PerfRuntimeIdentity => ({ ordinal: startOrdinal, startedAt, startupMs, manifestSeed: g.world().manifest.seed });
  /** THE MATCHED START (every fresh run after the sweep's own): the same call
   *  sequence as the start above under the one seed, then the PREVIOUS
   *  runtime proven retired (NativeClientStart.begin retires it synchronously;
   *  a stale callback reaching it latches the fatal, so resurrection is loud,
   *  never silent), no cinematic, the fatal latch read. The travel receiver
   *  re-binds to the new runtime; walkPhase and sampleCurrentZone read it
   *  live. Returns the new run's identity. */
  const freshStart = (): PerfRuntimeIdentity => {
    const previous = g.retained();
    const t0 = performance.now();
    const startedAt = new Date().toISOString();
    withPerfProfile(g.account(), () => g.devStartRun(opts.classId, opts.seed), () => g.saveAccount());
    // Same endpoint as first start: timestamp + native call/profile restoration.
    const startupMs = +(performance.now() - t0).toFixed(1);
    const next = g.retained();
    if (!next) throw new Error('perfSweep: retained native startup is missing after a fresh start');
    if (previous === next) throw new Error('perfSweep: the fresh start returned the previous runtime');
    if (previous && previous.ready) throw new Error('perfSweep: the previous retained runtime was not retired by the fresh start');
    travel = retainedPerfTravel(next);
    selectedRuntime = next;
    if (g.world().scene) throw new Error('perfSweep: a cinematic is still active after a fresh start');
    const fatal = g.crash().fatal;
    if (fatal) throw new Error('perfSweep: game failed during a fresh start: ' + fatal.msg + (fatal.stack ? ' | ' + fatal.stack : ''));
    beat('start');
    startOrdinal++;
    return identity(startupMs, startedAt);
  };
  /** THE MINT RECEIPT: one tileset minted through the original course's own
   *  levers (FULL-matrix spread index, id-stable seed, committed pins, the
   *  load guard, the weather re-pin), with the exact seed and pins recorded
   *  on the row and the synchronous mint + load cost measured apart from the
   *  rAF entry burst that follows it. */
  const mintRow = (id: string): { zid: string; mint: PerfMintReceipt; mintSyncMs: number } | PerfSkipRow => {
    const idx = fullMatrix.indexOf(id);
    if (idx < 0) throw new Error('perfSweep: residency mint id is outside the selected matrix: ' + id);
    const pin = opts.mintPins?.[id] ?? opts.mintPins?.['*'];
    beatTileset = id;
    beat('mint');
    const mint: PerfMintReceipt = {
      seed: pin?.seed !== undefined ? pin.seed : opts.mintSeed !== undefined ? mintSeedFor(opts.mintSeed, id) : null,
      variant: pin?.variant || null,
      layout: pin?.layout || null,
    };
    const t0 = performance.now();
    const zid = travel.mintTileset(id, PERF_SPREAD_BASE + idx, 8, {
      ...(mint.seed !== null ? { seed: mint.seed } : {}),
      ...(mint.variant ? { variant: mint.variant } : {}),
      ...(mint.layout ? { layoutType: mint.layout } : {}),
    });
    const mintSyncMs = +(performance.now() - t0).toFixed(1);
    if (!zid) return { id, class: 'unmintable', note: 'the registry has no such tileset' };
    if (g.world().zone.id !== zid) return { id, class: 'load-fallback', note: `load fell back to '${g.world().zone.name}'` };
    pinWeather();
    return { zid, mint, mintSyncMs };
  };
  /** The synchronous travel home (the mint's own landing recipe), its cost measured apart from the town window. */
  const returnHome = (): number => {
    const t0 = performance.now();
    travel.travelTo(START_ZONE);
    pinWeather();
    return +(performance.now() - t0).toFixed(1);
  };
  const holdSkip = (id: string): PerfSkipRow => ({
    id, class: 'hold',
    note: `walker could not hold the zone in ${HOLD_ATTEMPTS} attempts` + (lastHoldStories.length ? `: ${lastHoldStories.join('; ')}` : ''),
  });
  const skipRow = (skip: PerfSkipRow): void => { skipped.push(skip); beat('skip', { skip }); };
  const courseReport = (ctl: PerfZoneStats): PerfSweepReport => {
    const cv = document.getElementById('game') as HTMLCanvasElement | null;
    const suppressed = g.crash().suppressed;
    return {
      runtime: 'retained-native', control: ctl, controlEnd: null, zones: [],
      canvas: { w: cv?.width ?? 0, h: cv?.height ?? 0 }, dpr: window.devicePixelRatio || 1,
      sampleSeconds: opts.seconds ?? 6, matrix, skipped,
      weather: opts.weather ?? '', ablate: opts.ablate ?? [],
      course, startSeed: opts.seed ?? null,
      saves: { suppressed: suppressed !== null, reason: suppressed },
      residencyWindows: [...residencyWindows], selectedMatrix: { ids: [...fullMatrix], explicitOverride: opts.tilesets !== undefined },
    };
  };
  /** THE FRESH-SESSION ROWS: one fresh run per matrix row, its town CONTROL
   *  (the first row rides the sweep's own start and the control already
   *  sampled), then the zone. The regime is READ from the census each held
   *  window carried (expected 1 then 2) and recorded, unexpected or not; the
   *  row is never judged against the cumulative caps. */
  const freshCourse = async (first: PerfZoneStats): Promise<PerfSweepReport> => {
    const fresh: PerfFreshRow<PerfZoneStats>[] = [];
    let firstRow = true;
    for (const id of matrix) {
      let runtimeId: PerfRuntimeIdentity, controlReturnSyncMs = initialReturnSyncMs;
      let ctl: PerfZoneStats | null;
      if (firstRow) { firstRow = false; ctl = first; runtimeId = identity(initialStartupMs, sweepStartedAt.iso); }
      else {
        runtimeId = freshStart();
        controlReturnSyncMs = returnHome();
        ctl = await sampleResidencyZone('(town)');
      }
      const afterControl = heapNow();
      if (!ctl) { skipRow({ id, class: 'hold', note: 'the fresh town control could not hold its window' }); continue; }
      const minted = mintRow(id);
      if ('class' in minted) { skipRow(minted); continue; }
      const stats = await sampleResidencyZone(id);
      if (!stats) { skipRow(holdSkip(id)); continue; }
      const controlCensus = { residentAreas: ctl.residentAreas, residentActors: ctl.residentActors };
      const zoneCensus = { residentAreas: stats.residentAreas, residentActors: stats.residentActors };
      const regime = regimeOf(controlCensus, zoneCensus);
      const issues = [...residencyRowIssues(ctl.residency?.windows ?? [], 1), ...residencyRowIssues(stats.residency?.windows ?? [], 2)];
      if (!regime.expected) issues.push(regime.regime);
      const row: PerfFreshRow<PerfZoneStats> = {
        tileset: id, runtime: runtimeId,
        control: ctl, controlCensus, controlReturnSyncMs,
        mint: minted.mint, mintSyncMs: minted.mintSyncMs,
        zone: stats, zoneCensus,
        heapMB: { afterControl, afterZone: heapNow() },
        valid: issues.length === 0, issues,
        regime: issues.length ? `${regime.regime} INVALID (${issues.join('; ')})` : regime.regime, expectedRegime: regime.expected && issues.length === 0,
        contrast: RESIDENCY_COURSE_NOTES.freshContrast,
      };
      fresh.push(row);
      beat('fresh', { row });
    }
    return { ...courseReport(first), fresh };
  };
  /** THE RESIDENCY RAMP: one run; step 0 is the control already sampled; each
   *  later step mints and ENTERS one more tileset (its synchronous mint + load
   *  cost and its rAF load burst recorded apart, never a steady row), travels
   *  home and re-samples the TOWN with the full window pair, the census that
   *  window carried, THE AGES (wall and campaign) and THE COMPLETED HISTORY
   *  beside it. THE AGE CONTROL (opts.rampAgeControl) visits nothing: each
   *  step walks the town's own entry window and reloads it, so the residency
   *  stays one while the run ages; it is a comparison under unmatched ages,
   *  not an isolation, and its report says so. */
  const rampCourse = async (first: PerfZoneStats): Promise<PerfSweepReport> => {
    const stepsWanted = Math.max(1, Math.floor(opts.rampSteps ?? RAMP_DEFAULT_STEPS));
    const pinnedIds = Object.keys(opts.mintPins ?? {}).filter(k => k !== '*');
    const list = opts.rampAgeControl ? [] : (opts.rampList ?? rampListFor(fullMatrix, pinnedIds, stepsWanted - 1));
    const steps: PerfRampStep<PerfZoneStats>[] = [];
    const visitedSoFar: string[] = [], skippedSoFar: string[] = [];
    const ages = (): { wallMs: number; campaignSec: number } => ({ wallMs: +(performance.now() - sweepStartedAt.wall).toFixed(0), campaignSec: +g.world().time.toFixed(1) });
    const push = (step: PerfRampStep<PerfZoneStats>): void => { steps.push(step); beat('ramp', { step }); };
    const initialIssues = residencyRowIssues(first.residency?.windows ?? [], opts.rampAgeControl ? 1 : undefined);
    push({ valid: initialIssues.length === 0, issues: initialIssues, step: 0, visited: null, mint: null, mintSyncMs: null, visitEntryWorstGap: null, visitHeld: null, returnSyncMs: initialReturnSyncMs, town: first, residentAreas: first.residentAreas, residentActors: first.residentActors, heapMB: heapNow(), ...ages(), history: { visited: [], skipped: [] } });
    const count = opts.rampAgeControl ? stepsWanted - 1 : list.length;
    for (let i = 1; i <= count; i++) {
      let visited: string | null = null, mint: PerfMintReceipt | null = null, mintSyncMs: number | null = null;
      if (!opts.rampAgeControl) {
        const id = list[i - 1];
        const minted = mintRow(id);
        if ('class' in minted) { skipRow(minted); skippedSoFar.push(id); continue; }
        visited = id; mint = minted.mint; mintSyncMs = minted.mintSyncMs; visitedSoFar.push(id);
      }
      beatTileset = visited ?? '(town)';
      g.world().player.invulnerable = true;
      const visitWindowStart = residencyWindows.length;
      const entry = await residencyWalk(visited ?? '(town)', 1, 'visit-entry', settleMs, 0.6);
      const returnSyncMs = returnHome();
      const town = await sampleResidencyZone('(town)');
      const fatal = g.crash().fatal;
      if (fatal) throw new Error(`perfSweep: game failed at ramp step ${i}: ` + fatal.msg + (fatal.stack ? ' | ' + fatal.stack : ''));
      const census = town ? { residentAreas: town.residentAreas, residentActors: town.residentActors } : travel.census();
      const issues = residencyRowIssues(residencyWindows.slice(visitWindowStart), opts.rampAgeControl ? 1 : undefined);
      if (!town) issues.push('town window not held');
      push({ valid: issues.length === 0, issues, step: i, visited, mint, mintSyncMs, visitEntryWorstGap: +entry.worst.toFixed(1), visitHeld: entry.held, returnSyncMs, town, ...census, heapMB: heapNow(), ...ages(), history: { visited: [...visitedSoFar], skipped: [...skippedSoFar] } });
    }
    const held = steps.filter(s => s.town !== null && s.valid);
    const ramp: PerfRampReport<PerfZoneStats> = {
      steps, ageControl: !!opts.rampAgeControl, list,
      slopes: rampSlopes(held.map(s => ({ residentAreas: s.residentAreas, residentActors: s.residentActors, gapP50: s.town!.gapP50, gapP99: s.town!.gapP99, simP99: s.town!.simP99, taskMax: s.town!.taskMax }))),
      slopesNote: RESIDENCY_COURSE_NOTES.slopes,
      comparisonNote: opts.rampAgeControl ? RESIDENCY_COURSE_NOTES.ageControl : null,
    };
    return { ...courseReport(first), matrix: list, ramp };
  };
  if (course !== 'cumulative') return course === 'fresh' ? await freshCourse(control) : await rampCourse(control);
  for (const id of matrix) {
    const idx = fullMatrix.indexOf(id);
    const pin = opts.mintPins?.[id] ?? opts.mintPins?.['*'];
    // Name the holder BEFORE the synchronous mint: a wedge inside the mint
    // path itself then wears the right tileset in the deadman's row.
    beatTileset = id;
    beat('mint');
    const zid = travel.mintTileset(id, PERF_SPREAD_BASE + idx, 8, {
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
      const skip: PerfSkipRow = {
        id, class: 'hold',
        note: `walker could not hold the zone in ${HOLD_ATTEMPTS} attempts`
          + (lastHoldStories.length ? ` — ${lastHoldStories.join('; ')}` : ''),
      };
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
  travel.travelTo(START_ZONE);
  pinWeather();
  const controlEnd = await sampleCurrentZone('(town aged)');
  beat('aged', { row: controlEnd });

  const cv = document.getElementById('game') as HTMLCanvasElement | null;
  return {
    runtime: 'retained-native',
    control, controlEnd, zones,
    canvas: { w: cv?.width ?? 0, h: cv?.height ?? 0 },
    dpr: window.devicePixelRatio || 1,
    sampleSeconds: opts.seconds ?? 6,
    matrix, skipped,
    weather: opts.weather ?? '',
    ablate: opts.ablate ?? [],
  };
  } finally {
    g.fakePad(null);
    setVisAblate([]);
    ltObs?.disconnect();
  }
}
