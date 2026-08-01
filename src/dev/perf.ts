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
}

export interface PerfSweepReport {
  control: PerfZoneStats;
  zones: PerfZoneStats[];
  canvas: { w: number; h: number };
  dpr: number;
  sampleSeconds: number;
  matrix: string[];
  skipped: string[];
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

type FrameDump = { gap: number[]; sim: number[]; ren: number[] };

function reduceFrames(f: FrameDump, entryWorstGap: number, meta: {
  tileset: string; zone: string; variant: string | null; layout: string;
  doodads: number; actors: number; lite: number;
  snowBakes: number; groundBakes: number; snowCover: number;
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
  };
}

export async function perfSweep(opts: PerfSweepOpts = {}): Promise<PerfSweepReport> {
  const g = window.__game;
  if (!g) throw new Error('perfSweep: window.__game missing — game not booted');
  const raf = (): Promise<number> => new Promise(r => requestAnimationFrame(r));
  const sampleMs = (opts.seconds ?? 6) * 1000;
  const settleMs = (opts.settleSeconds ?? 1.5) * 1000;

  // A fresh probe run through the REAL start path (menus dismissed).
  g.devStartRun(opts.classId);

  // THE GATE PINS SCALE 1 (render/renderScale.ts): the sweep judges the
  // authored render bill — an auto-governor stepping the buffer down mid-
  // sample would gate a moving target and flatter every heavy zone.
  g.settings().renderScale = 1;

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
  const walkPhase = async (ms: number, dir0 = 0.6): Promise<{ worst: number; held: boolean }> => {
    const homeZid = g.world().zone.id;
    let dir = dir0, worst = 0;
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
      const rayFree = (a: number, reach: number): boolean =>
        !zw.fallHazardAt(zw.player, at.x + Math.cos(a) * reach * 0.5, at.y + Math.sin(a) * reach * 0.5)
        && !zw.fallHazardAt(zw.player, at.x + Math.cos(a) * reach, at.y + Math.sin(a) * reach);
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
      const gap = now - prev;
      worst = Math.max(worst, gap);
      prev = now;
      dir += WALK_TURN_RATE * Math.min(gap, WALK_DT_CLAMP_MS) / 1000;
      if (g.world().zone.id !== homeZid) return { worst, held: false };
    }
    return { worst, held: true };
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
    const homeZid = g.world().zone.id;
    // Worst entry gap across ALL attempts: the first attempt carries the
    // mint's true load burst — a retry's cheaper re-entry must not launder
    // the row's entry-burst verdict.
    let entryWorst = 0;
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
      entryWorst = Math.max(entryWorst, entry.worst);
      if (!entry.held) { if (!returnHome()) break; continue; }
      // Drain the zone-hop garbage NOW, inside the discarded window: a sweep
      // hops zones at a rate no player ever will, and V8's collection storm
      // otherwise lands mid-sample on whichever zone holds the window when
      // the threshold trips — the breach wears an innocent zone's name
      // (tundra 2026-07-12; gutworks 2026-07-16, clean twice solo). The
      // launcher exposes gc for --perf-test only; normal play never has it.
      (window as unknown as { gc?: () => void }).gc?.();
      g.perfFrames(true); // discard the entry burst; the steady window begins
      VIS_TELEMETRY.snowBakes = 0;
      VIS_TELEMETRY.groundBakes = 0;
      const steady = await walkPhase(sampleMs, dir0);
      if (!steady.held) { if (!returnHome()) break; continue; }
      const zw2 = g.world();
      return reduceFrames(g.perfFrames(false), entryWorst, {
        tileset: tilesetId, zone: zw2.zone.name,
        variant: zw2.zone.variantName ?? null,
        layout: zw2.zone.layoutType ?? 'plains',
        doodads: zw2.doodads.length, actors: zw2.actors.length,
        lite: zw2.lite.liveCount,
        snowBakes: VIS_TELEMETRY.snowBakes, groundBakes: VIS_TELEMETRY.groundBakes,
        snowCover: +zw2.snowCover.toFixed(2),
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
  const skipped: string[] = [];
  for (const id of matrix) {
    const idx = fullMatrix.indexOf(id);
    const pin = opts.mintPins?.[id] ?? opts.mintPins?.['*'];
    const zid = g.world().devMintTileset(id, PERF_SPREAD_BASE + idx, 8, {
      ...(pin?.seed !== undefined ? { seed: pin.seed }
        : opts.mintSeed !== undefined ? { seed: mintSeedFor(opts.mintSeed, id) } : {}),
      ...(pin?.variant ? { variant: pin.variant } : {}),
      ...(pin?.layout ? { layoutType: pin.layout } : {}),
    });
    if (!zid) { skipped.push(id); continue; }
    if (g.world().zone.id !== zid) {
      // The mint minted but the LOAD fell back (spread-coordinate collision,
      // refused layout): without this guard the row samples whatever zone
      // the walker is still standing in and wears its numbers as a pass —
      // snowcrown wore the TOWN's row (2026-07-19).
      skipped.push(`${id} (load fell back to '${g.world().zone.name}')`);
      continue;
    }
    pinWeather(); // re-pin on the fresh zone's own node
    const stats = await sampleCurrentZone(id);
    if (!stats) {
      // The walker could not hold one clean window pair in HOLD_ATTEMPTS
      // tries (the restart law above) — a row that did not stay home is not
      // a measurement of its tileset. Report-only skip, the same lane as an
      // unmintable id.
      skipped.push(`${id} (walker could not hold the zone in ${HOLD_ATTEMPTS} attempts)`);
      continue;
    }
    zones.push(stats);
  }
  g.fakePad(null);
  setVisAblate([]);

  const cv = document.getElementById('game') as HTMLCanvasElement | null;
  return {
    control, zones,
    canvas: { w: cv?.width ?? 0, h: cv?.height ?? 0 },
    dpr: window.devicePixelRatio || 1,
    sampleSeconds: opts.seconds ?? 6,
    matrix, skipped,
    weather: opts.weather ?? '',
    ablate: opts.ablate ?? [],
  };
}
