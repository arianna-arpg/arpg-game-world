// ---------------------------------------------------------------------------
// THE GEYSER FABRIC — terrain that keeps a beat (the Scald Basin's spine).
//
// A GEYSER is a stationary timed emitter: safe almost always, lethal on
// schedule. The whole law is borrowed from the track fabric's pure clock
// (engine/tracks.ts trackPose): eruption state at time t is a PURE FUNCTION
// of the synced clock and mint-rolled parameters —
//
//     read = ventReadAt(field, vent, world.time, mode)
//
// No integration, no re-rolls, no rng stream at runtime. Host, every co-op
// seat, and a resumed save all read the same broil at the same millimetre.
// This is deliberately the ANTI-BOMBARD: BombardSpec.cadence re-rolls per
// shot to feel "nearly random" — a geyser clock NEVER re-rolls. The
// looseness her walk asked for comes from GENERATION (the band layout and
// the band-clock rolls), never from dice at runtime, so the field stays
// learnable and co-op/resumes agree by construction.
//
// THE CURRENT BANDS (her second-walk shape, charter §3): generation
// partitions the zone into literal in-zone BANDS — wobbled stripes across a
// mint-rolled bearing, the fiction of underground currents — and every vent
// seated in a band erupts ON THE BAND'S CLOCK: a current surges and its
// whole line of geysers goes up together, while the next band keeps its own
// count. Cross-band stagger is EMERGENT from the independent period/phase
// rolls; great vents are each their OWN band anchor (the metronomes stand).
// The per-vent polyrhythm survives as (a) the bandless authored-vent
// fallback and (b) the dev A/B lever's other face (World.geyserMode
// 'solo') — BOTH clock parameter sets are rolled at mint, so flipping the
// lever mid-zone re-rolls nothing and stays pure.
//
// THE BROIL LAW (ruled): the eruption warning is the water ITSELF beginning
// to broil at the vent ~2s before it bursts — drawn phenomena only, no
// countdown rings or floaters (the show-don't-tell law). The drawn half
// lives in render/vis/geyserLayer.ts and reads THIS resolver; the engine
// half (World.bootGeysers / updateGeysers / the imminentThreatTo read)
// samples the same one — drawn == tested by construction.
//
// THE COLUMN: at the beat, a strike at the vent's own seat — mitigated
// typed fire through the one hazard-payload grammar (sweepHazardSurface)
// plus an AUTHORLESS radial shove (engine/mass.ts names "wind, geysers" as
// the authorless push case — the law was reserved for exactly this).
// Uncredited environment, faction-blind, sleepers spared (the payload
// grammar's own defaults). Downstream in M0 is SPECTACLE ONLY: render-side
// lob comets out of the plume and drying scald pocks (plantImpactDress —
// the transience doctrine). Burn rain and runoff are M2's.
//
// NAMESPACE LAW: the timed fixture is the NEW doodad kind 'beat_vent'. The
// static 'geyser' doodad (marsh/tundra scenery, solid, forbidOn water) and
// the Ascent's 'sky_geyser' traversal trigger are unrelated citizens and
// stay untouched; beat_vent carries its own placement law (it MAY stand in
// shallows — Southsun's water-borne spouts).
//
// This module is a PURE LEAF (the tracks.ts idiom): config, types, the
// band partition, and the pure resolver only. Every number is a DIAL
// (unblessed — she blesses via playthroughs, charter law).
// Docs: docs/engine/geysers.md. Probe: balance/probe_geysers.ts.
// ---------------------------------------------------------------------------

import type { Vec2 } from '../core/math';
import type { Rng } from '../core/rng';

// --- config (ALL DIAL) ------------------------------------------------------

export const GEYSER_CFG = {
  /** Salt for the zone-load placement stream (the fog/creep discipline:
   *  never moves layout/spawn rng; distinct from every other fabric's). */
  salt: 0x6e75f3,
  /** THE BROIL window (seconds of drawn roil before the burst — her
   *  "two-seconds early"). One number for every class: the warn is a
   *  LANGUAGE, learned once and read everywhere (charter §3). */
  telegraph: 2.0,
  /** Column sweep cadence, seconds (the track fabric's applyEvery beat —
   *  the column is stationary, so no swept-beat substeps are needed). */
  applyEvery: 0.05,
  /** Seconds after the burst before lob comets LAND (the throw arrives —
   *  splashes + pocks trail the column by this much). */
  rainDelay: 0.8,
  /** THE BURN RAIN (charter §4a — card 2: reserved to GREAT vents; the
   *  trebuchet grammar with NO GUN): droplets per eruption, the landing
   *  annulus (distance out from the vent), the downwind bias (0 = an even
   *  ring, 1 = every drop flies with the wind; `spread` = the half-arc of
   *  the downwind lobe in radians — reads World.windAt at the burst, the
   *  standing wind fabric, so weather and rain agree), the splash disc,
   *  and the scorch units each landing feeds a grounded body (M-HEAT's
   *  "the burn rain's hits" source). The droplet's delivery body is a
   *  catalog skill (data/skills.ts scald_rain_drop); the zone pipeline's
   *  sky posture (hitAll / spareDormant / spareRoofed) makes it weather,
   *  and the lob comet + landing ring + scald pock ride as pure data. */
  rain: {
    count: [4, 9] as const, range: [120, 260] as const, downwind: 0.6, spread: 1.25,
    dropletR: 34, skillId: 'scald_rain_drop', scorchUnits: 0.6, pockDwell: [10, 22] as const,
  },
  /** THE RUNOFF (charter §4c): a great vent's spent water poured from its
   *  SPILL SIDE as a finite scald run (data/scald.ts scald_runoff — travel
   *  + flow + convert.fade). The spill bearing is a pure hash of the vent's
   *  seat (spillBearing) — STRICT periodicity: the same side every
   *  eruption, never a per-beat roll. `reach` = the run's section reach
   *  roll; `offset` = where along the spill bearing the run is born, as a
   *  multiple of the mouth radius. */
  runoff: { kind: 'scald_runoff', reach: [44, 70] as const, offset: 1.4 },
  /** Per-class DOWNSTREAM defaults (DownstreamSpec): spectacle is
   *  UNCONDITIONAL (every class shows); the burn rain is the GREAT vents'
   *  privilege and the runoff follows them by default — authored vents
   *  (GeyserSpec.downstream) override per row. */
  downstream: {
    hiss: { show: true } as DownstreamSpec,
    geyser: { show: true } as DownstreamSpec,
    great: { show: true, rain: true, runoff: true } as DownstreamSpec,
  },
  /** Per-class identity: clock band (solo/bandless vents), column radius,
   *  column-live window, the typed hit, the authorless shove, and the
   *  spectacle allotment (comet count range; hiss is column-only —
   *  "small vents are ONLY this", charter §4b). */
  classes: {
    // eruptSec = THE FIRE WINDOW (the column-live duration — drawn column,
    // tested column and the probe all read it). Eased ~12% at her fourth
    // walk's trim note ("reduce the fire times slightly": 0.7/0.9/1.3 →
    // 0.6/0.8/1.15); if she meant CADENCE, the number is bandPeriod /
    // the class `period` bands below — a one-number flip either way.
    hiss: { period: [12, 18] as const, columnR: 24, eruptSec: 0.6, hit: { base: 4, perLevel: 0.6 }, impulse: 120, comets: [0, 0] as const },
    geyser: { period: [25, 50] as const, columnR: 44, eruptSec: 0.8, hit: { base: 11, perLevel: 1.6 }, impulse: 260, comets: [2, 4] as const },
    great: { period: [70, 110] as const, columnR: 62, eruptSec: 1.15, hit: { base: 18, perLevel: 2.4 }, impulse: 360, comets: [5, 8] as const },
  },
  /** The CURRENT BANDS' shared clock band: a band's period rolls here (the
   *  field's signature tempo — the geyser class band; per-class tempo
   *  identity lives in SOLO mode and on bandless one-offs). */
  bandPeriod: [25, 50] as const,
  /** Band geometry: stripe width in world units (a current's breadth) and
   *  the low-frequency edge wobble that keeps band lines from reading as
   *  ruler cuts (amplitude in units, wavelength in units). */
  band: { stripeW: 560, wobbleAmp: 150, wobbleLen: 700 },
  /** Comet landing annulus (distance out from the vent) and splash radius
   *  (feeds plantImpactDress's own radius clamp). */
  comet: { range: [90, 240] as const, splashR: 34, pockDwell: [10, 22] as const },
  /** Per-body re-hit grace beyond the column's live window: one eruption =
   *  one hit per body (the next beat is ≥ the hiss floor away anyway). */
  icdPad: 1.2,
  /** Vent-mouth doodad radii per class (the drawn fixture's footprint —
   *  drawn == tested: the column's hit disc is columnR, the mouth is the
   *  pool it rises from). */
  mouthR: { hiss: 16, geyser: 26, great: 38 },
  /** Placement: min separation between vent seats; scatter radius around a
   *  cluster heart; tries per vent before the count quietly shrinks (the
   *  count is a dial, not a promise). */
  place: { minSep: 64, scatter: [50, 190] as const, tries: 14, heartReach: 560, portalClear: 200, greatClear: 280 },
  /** THE SURGE HOUR (charter §0 seventh walk — her cascade shape; M3 coda):
   *  a window in which the basin's vents RUN HOT — the bands ALIGN (the
   *  zone-wide surge the bands law named as emergent becomes SCHEDULED),
   *  periods shorten, great vents rain more — UNANNOUNCED (no omen, no map
   *  mark, no floater: the broils quicken, the steam thickens — the
   *  show-don't-tell law). TIMING IS PURE: windows are f(world clock, the
   *  zone's mint key) — surgeWindowNear — so every seat and every resume
   *  agree whether the hour holds, exactly as they agree on the bands.
   *  Inside the window a vent rides THE ALIGNED TIDE (surgeTideRead): one
   *  zone-wide beat schedule T_j = t0 + lead + j·surgePeriod that EVERY
   *  vent strikes on (greats every `greatEvery`-th beat — the metronome law
   *  under the tide), JOINED and LEFT only at quiet moments of the vent's
   *  own clock, so no broil is ever cut, no burst ever un-broiled, and
   *  after the window the read is the base clock BYTE-IDENTICAL (the
   *  field stays learnable — the surge borrows the beat, never bends it).
   *  `every`/`dwell`/`jitter` (seconds of world clock) shape the long
   *  clock; `lead` (≥ telegraph + the longest join wait) is the first
   *  tide-beat's lead-in; `periodMul` × the field's mean shared-band period
   *  = the tide's period (floored at `minPeriod`); `rainMul` scales the
   *  great vents' burn-rain fan on tide beats. All DIAL. */
  surge: {
    every: 600, dwell: 90, jitter: 120, lead: 6,
    periodMul: 0.6, minPeriod: 8, greatEvery: 2, rainMul: 1.5,
    salt: 0x5e7a9d,
  },
} as const;

/** Seconds past a window's close a vent may still be finishing its last
 *  tide beat or waiting for its own clock's quiet hand-back moment (≤ one
 *  telegraph + the longest column + a breath). Windows are spaced so no
 *  spill ever reaches the next window (surgeWindowOf clamps the jitter). */
const SURGE_SPILL = 6;
/** Tide-beat cycle ordinals live far above any base ordinal (a base k is
 *  ~clock/period — days of play stay under 1e5): unique per beat, the same
 *  on every seat, never colliding with the band clock's own count. THE K
 *  LAW under the surge: `k` is unique per burst and monotone WITHIN a
 *  regime, but a join/leave hand-off STEPS it — detect burst edges by
 *  VentRead.burstAt (World.updateGeysers does), never by k alone. */
const SURGE_K_BASE = 0x200000;

export type GeyserClassId = keyof typeof GEYSER_CFG.classes;

// --- authoring --------------------------------------------------------------

/** One AUTHORED vent (the bandless one-off lane — a marsh set-piece, a
 *  lair's metronome, a future landmark builder). Zone-space. A bandless
 *  vent carries its own clock; absent fields roll from the class band. */
export interface GeyserSpec {
  pos: Vec2;
  cls: GeyserClassId;
  /** Own period, seconds (bandless vents). */
  period?: number;
  /** Own phase, 0..1 of period. */
  phase?: number;
  /** Seat on the zone's SHARED current-band partition (the stripe clock —
   *  seatVent) instead of a private anchor band: an authored vent that
   *  belongs to the field's tide, not a metronome. Ignored when the row
   *  carries its own period/phase (an authored clock is an anchor). */
  shared?: true;
  /** What this vent does DOWNSTREAM of its column (absent = the class
   *  defaults, GEYSER_CFG.downstream). */
  downstream?: DownstreamSpec;
}

/** DOWNSTREAM OF THE ERUPTION (charter §4 — card 2, ratified): what a vent
 *  does after the column. `show` is documentary — spectacle (the plume,
 *  the lob comets, the pocks) is UNCONDITIONAL and no row can turn it off
 *  ("the basin must be beautiful before it is dangerous"); `rain` lobs THE
 *  BURN RAIN (real landings — the trebuchet grammar ownerless; legal ONLY
 *  on the 'great' class: resolveDownstream refuses a lesser class with a
 *  warn); `runoff` pours the scald run from the vent's spill side. Absent
 *  fields take the class defaults. */
export interface DownstreamSpec {
  show?: true;
  rain?: boolean;
  runoff?: boolean;
}

/** The resolved per-vent downstream read (class defaults ∘ the authored
 *  row ∘ the great-only rain law) — stamped on PlacedVent at seat time so
 *  the burst edge reads one truth. */
export interface ResolvedDownstream { rain: boolean; runoff: boolean }

export function resolveDownstream(cls: GeyserClassId, own?: DownstreamSpec): ResolvedDownstream {
  const base = GEYSER_CFG.downstream[cls];
  if (own?.rain && cls !== 'great') {
    console.warn(`[geysers] downstream.rain on a '${cls}' vent — the burn rain is the great vents' privilege (charter card 2); refused`);
  }
  return {
    rain: (own?.rain ?? base.rain ?? false) && cls === 'great',
    runoff: own?.runoff ?? base.runoff ?? false,
  };
}

/** A vent's downstream read — the seated stamp, or the class defaults for a
 *  vent built without one (absent == identical; pure). */
export function ventDownstream(v: PlacedVent): ResolvedDownstream {
  return v.downstream ?? resolveDownstream(v.cls);
}

/** A vent's spill side — the seated stamp, or the seat's own hash. */
export function ventSpill(v: PlacedVent): number {
  return v.spill ?? spillBearing(v.pos);
}

/** THE SPILL SIDE: the bearing a vent's runoff pours along — a pure hash
 *  of its seat (no rng stream, no state: every seat and every resume pour
 *  the same side, every eruption — the anti-bombard law applied to the
 *  runoff's geography). */
export function spillBearing(pos: Vec2): number {
  let v = Math.imul((Math.round(pos.x) + 7919) | 0, 2654435761) >>> 0;
  v = (v ^ Math.imul((Math.round(pos.y) + 104729) | 0, 0x9e3779b1)) >>> 0;
  v = Math.imul(v ^ (v >>> 15), 2246822519) >>> 0;
  return ((v ^ (v >>> 13)) >>> 0) / 4294967296 * Math.PI * 2;
}

/** The ZoneTheme row (data/zones.ts `theme.geysers`) — how many vents of
 *  each class a zone stands up at LOAD on the salted stream, and how many
 *  current bands the mint deals. All DIAL. */
export interface ZoneGeyserSpec {
  hiss?: [number, number];
  geyser?: [number, number];
  great?: [number, number];
  /** Current-band count range (great vents anchor their own EXTRA bands
   *  beyond this — the metronome law). Default [2, 4]. */
  bands?: [number, number];
}

// --- placed field (runtime, rebuilt per load from the zone seed) ------------

/** One current band's clock, rolled at mint. Index IS the band id. */
export interface GeyserBand { period: number; phase: number }

/** The band partition's geometry — rolled once at mint; bandIndexAt is a
 *  pure function of it. Kept on the field for the dev tab + probes. */
export interface GeyserBanding {
  /** Current bearing (radians): stripes run ALONG this direction. */
  theta: number;
  stripeW: number;
  /** Wobble stream seed (pure hash noise — no rng at read time). */
  wobbleSeed: number;
  /** How many SHARED bands the stripes cycle through. */
  n: number;
}

export interface PlacedVent {
  pos: Vec2;
  cls: GeyserClassId;
  /** Band index into GeyserField.bands. Every vent has one: shared vents
   *  by the stripe partition, greats + authored one-offs each a private
   *  anchor band of their own. */
  band: number;
  /** THE SOLO CLOCK (the A/B lever's other face): this vent's own
   *  polyrhythm parameters, rolled at mint from the class band. Authored
   *  bandless vents carry their authored clock here AND in their private
   *  band, so both modes agree on one-offs by construction. */
  period: number;
  phase: number;
  /** THE DOWNSTREAM READ (resolveDownstream at seat time): burn rain on /
   *  off, runoff on / off — the burst edge's one truth. Optional so a
   *  hand-built vent (probes, a package's literal) resolves to its CLASS
   *  defaults through ventDownstream — absent == identical. */
  downstream?: ResolvedDownstream;
  /** THE SPILL SIDE (spillBearing): where the runoff pours. Pure per seat;
   *  absent = derived from the seat through ventSpill. */
  spill?: number;
  /** Per-body re-hit gate for the column sweep (runtime, never persisted). */
  gate: Map<number, number>;
  /** Runtime burst-edge memory for the burst spectacle (the tracks
   *  `resting` precedent: cosmetic, never persisted — a resume inits to
   *  the burst in flight, so no retroactive bursts fire). The CLOCK TIME of
   *  the last burst whose edge fired (VentRead.burstAt) — time-keyed rather
   *  than ordinal-keyed because the surge's tide hand-offs step `k` (THE K
   *  LAW); a burst is a burst whatever regime struck it. */
  lastBurstAt?: number;
}

export interface GeyserField {
  vents: PlacedVent[];
  bands: GeyserBand[];
  banding: GeyserBanding;
  /** THE SURGE HOUR's zone key (the mint seed — rollGeyserField's third
   *  argument): the long clock's per-zone phase + jitter hash from. Absent
   *  = this field never surges (hand-built probe fields, a package's
   *  literal — absent == identical to the pre-surge fabric). */
  surgeKey?: number;
  /** THE ALIGNED TIDE's period — GEYSER_CFG.surge.periodMul × the mean
   *  shared-band period, floored at minPeriod; derived at roll time (no
   *  draw of its own — the stream's shape is sacred). Optional so a hand-
   *  built field literal (probes, a package) stays three lines; absent,
   *  fieldSurgePeriod derives the same number from the bands. */
  surgePeriod?: number;
  /** DEV ONLY (the A/B lever's sibling — solo play never sets it): a forced
   *  open window; the dev Geysers tab toggles it so her walk can meet the
   *  tide at will. Host-local, never persisted, never wired. */
  surgeForce?: SurgeWindow | null;
}

// --- THE SURGE HOUR's long clock (pure) ------------------------------------

/** One surge window of a zone: ordinal `c` on the long clock, open at t0,
 *  closed at t1 (= t0 + dwell). */
export interface SurgeWindow { c: number; t0: number; t1: number }

/** The zone-level surge read (World.geyserSurge): whether the hour HOLDS
 *  now, the near window's edges when one stands (else 0/0), whether it is
 *  the dev force, and — between windows — the next open's clock time. */
export interface GeyserSurgeRead {
  held: boolean;
  t0: number;
  t1: number;
  forced: boolean;
  next: number | null;
}

/** Unit-float hash of (key, a, b) — the band wobble's integer discipline. */
function h01s(key: number, a: number, b: number): number {
  let v = Math.imul((key | 0) + 0x3c6ef35f, 2654435761) >>> 0;
  v = (v ^ Math.imul(a + 1, 0x9e3779b1) ^ Math.imul(b + 7, 0x85ebca6b)) >>> 0;
  v = Math.imul(v ^ (v >>> 15), 2246822519) >>> 0;
  return ((v ^ (v >>> 13)) >>> 0) / 4294967296;
}

/** The per-zone phase of the long clock (seconds into `every`). */
function surgePhaseOf(key: number): number {
  return h01s(key, 0x51, 0x17) * GEYSER_CFG.surge.every;
}

/** Window `c` of the zone keyed `key` — pure: start = c·every + the zone's
 *  phase + a per-window jitter (clamped so no window's spill can ever
 *  reach the next one). */
export function surgeWindowOf(key: number, c: number): SurgeWindow {
  const S = GEYSER_CFG.surge;
  const jitMax = Math.max(0, Math.min(S.jitter, S.every - S.dwell - SURGE_SPILL * 5));
  const t0 = c * S.every + surgePhaseOf(key) + h01s(key, c, 0x2f) * jitMax;
  return { c, t0, t1: t0 + S.dwell };
}

/** The window NEAR clock second t — open, or closed within the spill (a
 *  vent may still be finishing its last tide beat / waiting for its quiet
 *  hand-back) — else null. `t < w.t1` is "the hour HOLDS" (the zone-level
 *  truth the wisp pour, the steam front and the HUD-less readout all
 *  consult through World.geyserSurge). */
export function surgeWindowNear(key: number, t: number): SurgeWindow | null {
  const S = GEYSER_CFG.surge;
  const c = Math.floor((t - surgePhaseOf(key)) / S.every);
  const w = surgeWindowOf(key, c);
  return t >= w.t0 && t < w.t1 + SURGE_SPILL ? w : null;
}

/** The first window opening at or after t (the dev tab's countdown). */
export function nextSurgeAfter(key: number, t: number): SurgeWindow {
  const c = Math.floor((t - surgePhaseOf(key)) / GEYSER_CFG.surge.every);
  const w = surgeWindowOf(key, c);
  return w.t0 >= t ? w : surgeWindowOf(key, c + 1);
}

/** The window a field reads at t: the dev force when set, else the long
 *  clock's (null for key-less fields — they never surge). */
export function fieldSurgeWindow(field: GeyserField, t: number): SurgeWindow | null {
  if (field.surgeForce) return field.surgeForce;
  return field.surgeKey === undefined ? null : surgeWindowNear(field.surgeKey, t);
}

/** THE ALIGNED TIDE's period for a field: the roll-time stamp, else the
 *  same derivation off the SHARED bands (mean × periodMul, floored at
 *  minPeriod) — one number, whichever road built the field. */
export function fieldSurgePeriod(field: GeyserField): number {
  if (field.surgePeriod !== undefined) return Math.max(GEYSER_CFG.surge.minPeriod, field.surgePeriod);
  const n = Math.max(1, Math.min(field.banding.n, field.bands.length));
  let mean = 0;
  for (let i = 0; i < n; i++) mean += field.bands[i]?.period ?? GEYSER_CFG.bandPeriod[0];
  mean /= n;
  return Math.max(GEYSER_CFG.surge.minPeriod, mean * GEYSER_CFG.surge.periodMul);
}

// --- the band partition (pure) ----------------------------------------------

/** Cheap seeded 1D value noise (hash-lerp) — the band edges' wobble. Pure
 *  integer hashing, no rng stream (the rideCapOf family's discipline). */
function noise1d(seed: number, x: number): number {
  const xi = Math.floor(x);
  const xf = x - xi;
  const h = (i: number): number => {
    let v = Math.imul(i + 1, 2654435761) ^ seed;
    v = Math.imul(v ^ (v >>> 15), 2246822519);
    v = (v ^ (v >>> 13)) >>> 0;
    return v / 4294967296;
  };
  const s = xf * xf * (3 - 2 * xf); // smoothstep
  return h(xi) * (1 - s) + h(xi + 1) * s;
}

/** Which SHARED band claims this ground — a pure function of position and
 *  the mint-rolled banding (the literal in-zone partition: wobbled stripes
 *  across the current bearing, cycling through the n rolled clocks). */
export function bandIndexAt(banding: GeyserBanding, x: number, y: number): number {
  const cos = Math.cos(banding.theta), sin = Math.sin(banding.theta);
  const across = x * cos + y * sin;         // distance across the currents
  const along = -x * sin + y * cos;         // distance along a current
  const wob = (noise1d(banding.wobbleSeed, along / GEYSER_CFG.band.wobbleLen) - 0.5) * 2 * GEYSER_CFG.band.wobbleAmp;
  const idx = Math.floor((across + wob) / banding.stripeW);
  return ((idx % banding.n) + banding.n) % banding.n;
}

// --- the pure resolver ------------------------------------------------------

export type GeyserPhase = 'quiet' | 'broil' | 'erupt';

/** One vent's whole story at a clock second — the ONE truth the column
 *  sweep, the drawn broil/column, the dodge-AI read, and the probes all
 *  sample. Pure: same clock in, same read out, on every seat and resume. */
export interface VentRead {
  phase: GeyserPhase;
  /** Seconds since this cycle's burst (the erupt/comet animation clock). */
  sinceBurst: number;
  /** Seconds until the NEXT burst. */
  toBurst: number;
  /** Broil ramp 0..1 (0 outside the telegraph window) — the roil's rise. */
  broil: number;
  /** Cycle ordinal (per-cycle pure hashes: comet fans). Unique per burst;
   *  monotone within a clock regime — THE K LAW: a surge hand-off steps it,
   *  so burst EDGES key on `burstAt`, never on k. */
  k: number;
  period: number;
  /** Clock time of this cycle's opening burst (t − sinceBurst): the
   *  burst-edge key (World.updateGeysers), exact on every seat. */
  burstAt: number;
  /** THE SURGE HOUR: this read rides THE ALIGNED TIDE (the zone-wide beat
   *  schedule) — the renderer thickens the steam, the burst edge rains
   *  more on a great vent. False on the base clock. */
  surge: boolean;
}

/** Which clock rules this vent under the given mode — 'bands' reads the
 *  band's rolled clock (her ruled default), 'solo' the vent's own
 *  polyrhythm roll (the A/B lever's comparison face). Both parameter sets
 *  exist from mint, so the lever never re-rolls anything. */
export function ventClockOf(field: GeyserField, vent: PlacedVent, mode: 'bands' | 'solo'): { period: number; phase: number } {
  if (mode === 'solo') return { period: vent.period, phase: vent.phase };
  const b = field.bands[vent.band];
  return b ? { period: b.period, phase: b.phase } : { period: vent.period, phase: vent.phase };
}

/** The broil never overlaps its own eruption on degenerate dials: the
 *  window is clipped to the quiet stretch between erupt-end and the beat. */
function teleOf(period: number, eruptSec: number): number {
  return Math.min(GEYSER_CFG.telegraph, Math.max(0, period - eruptSec) * 0.8);
}

/** THE BASE CLOCK — the band/solo read. The cycle opens with the burst:
 *  local 0 = the column going up, the last `telegraph` seconds of the
 *  cycle are the broil. Pure in (period, phase, class, t). */
function baseReadAt(period: number, phase: number, cls: GeyserClassId, timeSec: number): VentRead {
  const p = Math.max(1, period);
  const shifted = timeSec + phase * p;
  const local = ((shifted % p) + p) % p;
  const k = Math.floor(shifted / p);
  const c = GEYSER_CFG.classes[cls];
  const toBurst = p - local;
  const tele = teleOf(p, c.eruptSec);
  const burstAt = timeSec - local;
  if (local < c.eruptSec) {
    return { phase: 'erupt', sinceBurst: local, toBurst, broil: 0, k, period: p, burstAt, surge: false };
  }
  if (toBurst <= tele) {
    return { phase: 'broil', sinceBurst: local, toBurst, broil: 1 - toBurst / Math.max(0.001, tele), k, period: p, burstAt, surge: false };
  }
  return { phase: 'quiet', sinceBurst: local, toBurst, broil: 0, k, period: p, burstAt, surge: false };
}

/** Seconds from clock `t` until this clock's current broil-or-column has
 *  fully resolved (0 when quiet with a whole telegraph ahead) — the JOIN /
 *  LEAVE wait: a vent steps onto or off the tide only at a moment its own
 *  clock is quiet, so no broil is ever cut and no burst ever un-broiled. */
function quietWaitFrom(period: number, phase: number, cls: GeyserClassId, t: number): number {
  const r = baseReadAt(period, phase, cls, t);
  const eruptSec = GEYSER_CFG.classes[cls].eruptSec;
  if (r.phase === 'quiet') return 0;
  if (r.phase === 'broil') return r.toBurst + eruptSec;
  return Math.max(0, eruptSec - r.sinceBurst);
}

/** THE ALIGNED TIDE — one vent's read inside a surge window, or null when
 *  this vent is not on the tide at t (read the base clock). The tide is one
 *  zone-wide schedule, T_j = t0 + lead + j·surgePeriod; a vent strikes
 *  every `stride`-th beat (greats: GEYSER_CFG.surge.greatEvery), joining at
 *  the first beat it can broil in full after its own quiet moment, leaving
 *  after its last whole beat inside the window at its clock's next quiet
 *  moment. Pure in (field, vent, t, mode, window). */
function surgeTideRead(field: GeyserField, vent: PlacedVent, t: number,
  mode: 'bands' | 'solo', win: SurgeWindow): VentRead | null {
  const S = GEYSER_CFG.surge;
  const cls = GEYSER_CFG.classes[vent.cls];
  const { period, phase } = ventClockOf(field, vent, mode);
  const p = Math.max(1, period);
  const stride = vent.cls === 'great' ? Math.max(1, S.greatEvery) : 1;
  const ps = fieldSurgePeriod(field) * stride;
  const tele = teleOf(ps, cls.eruptSec);
  const beat = (j: number): number => win.t0 + S.lead + j * ps;
  // JOIN: the vent's own clock must be quiet first.
  const joinAt = win.t0 + quietWaitFrom(p, phase, vent.cls, win.t0);
  if (t < joinAt) return null;
  // First beat it can broil in full; last beat whose column completes inside the window.
  const jf = Math.max(0, Math.ceil((joinAt + tele - win.t0 - S.lead) / ps - 1e-9));
  const jl = Math.floor((win.t1 - cls.eruptSec - win.t0 - S.lead) / ps + 1e-9);
  if (jl < jf) return null;                      // no whole beat for this vent
  const Tl = beat(jl);
  // LEAVE: after the last beat's column, hand back at the clock's next quiet moment.
  const leaveAt = Number.isFinite(Tl)
    ? Tl + cls.eruptSec + quietWaitFrom(p, phase, vent.cls, Tl + cls.eruptSec)
    : Infinity;
  if (t >= leaveAt) return null;
  // The beat in play: the smallest j ≥ jf whose column has not yet ended.
  const j = Math.max(jf, Math.floor((t - cls.eruptSec - win.t0 - S.lead) / ps + 1e-9) + 1);
  const kOf = (jj: number): number => SURGE_K_BASE + ((win.c & 0xfff) << 8) + (jj & 0xff);
  if (j > jl) {
    // The tide is spent for this vent: idling quiet until its hand-back, the
    // next burst being the base clock's first after leaveAt.
    const after = baseReadAt(p, phase, vent.cls, leaveAt);
    return {
      phase: 'quiet', sinceBurst: t - Tl, toBurst: (leaveAt - t) + after.toBurst, broil: 0,
      k: kOf(jl), period: ps, burstAt: Tl, surge: true,
    };
  }
  const Tj = beat(j);
  if (t >= Tj) {
    const next = j + 1 <= jl ? beat(j + 1) - t
      : (leaveAt - t) + baseReadAt(p, phase, vent.cls, leaveAt).toBurst;
    return { phase: 'erupt', sinceBurst: t - Tj, toBurst: next, broil: 0, k: kOf(j), period: ps, burstAt: Tj, surge: true };
  }
  const toBurst = Tj - t;
  const prev = j > jf ? beat(j - 1) : joinAt;
  if (toBurst <= tele) {
    return { phase: 'broil', sinceBurst: t - prev, toBurst, broil: 1 - toBurst / Math.max(0.001, tele), k: kOf(j - 1), period: ps, burstAt: prev, surge: true };
  }
  return { phase: 'quiet', sinceBurst: t - prev, toBurst, broil: 0, k: kOf(j - 1), period: ps, burstAt: prev, surge: true };
}

/** THE resolver. The band/solo base clock — unless THE SURGE HOUR holds over
 *  this field and the vent is on THE ALIGNED TIDE (surgeTideRead), in which
 *  case the tide's schedule is the read. Outside a window, and for a field
 *  with no surge key, this is the base clock byte-identical. */
export function ventReadAt(field: GeyserField, vent: PlacedVent, timeSec: number, mode: 'bands' | 'solo'): VentRead {
  const win = fieldSurgeWindow(field, timeSec);
  if (win) {
    const tide = surgeTideRead(field, vent, timeSec, mode, win);
    if (tide) return tide;
  }
  const { period, phase } = ventClockOf(field, vent, mode);
  return baseReadAt(period, phase, vent.cls, timeSec);
}

// --- the comet fan (pure per-cycle hash — no rng, no state) -----------------

/** Where cycle `k`'s lob comets land for vent `ventIdx` — a pure integer
 *  hash of (vent ordinal, cycle ordinal, comet ordinal), the rideCapOf
 *  family's discipline: every seat and every resume deal the same fan.
 *  Count comes from the class band, hashed per cycle. Landing legality
 *  (walkable ground, the per-zone pock cap) is the planter's concern. */
export function cometFanOf(vent: PlacedVent, ventIdx: number, k: number): { x: number; y: number }[] {
  const cls = GEYSER_CFG.classes[vent.cls];
  const [lo, hi] = cls.comets;
  if (hi <= 0) return [];
  const h32 = (a: number, b: number, c: number): number => {
    let v = Math.imul(a + 1, 2654435761) >>> 0;
    v = (v ^ Math.imul(b + 1, 0x9e3779b1) ^ Math.imul(c + 1, 0x85ebca6b)) >>> 0;
    v = Math.imul(v ^ (v >>> 15), 2246822519) >>> 0;
    return ((v ^ (v >>> 13)) >>> 0) / 4294967296;
  };
  const n = lo + Math.floor(h32(ventIdx, k, 0) * (hi - lo + 1));
  const out: { x: number; y: number }[] = [];
  const [rLo, rHi] = GEYSER_CFG.comet.range;
  for (let j = 1; j <= n; j++) {
    const ang = h32(ventIdx, k, j * 2) * Math.PI * 2;
    const d = rLo + h32(ventIdx, k, j * 2 + 1) * (rHi - rLo);
    out.push({ x: vent.pos.x + Math.cos(ang) * d, y: vent.pos.y + Math.sin(ang) * d });
  }
  return out;
}

// --- the burn rain's fan (pure per-cycle hash, downwind-biased) ------------

/** Where cycle `k`'s BURN RAIN lands for vent `ventIdx` — cometFanOf's
 *  sibling for the great vents' teeth: `count` droplets hashed per cycle
 *  (the rideCapOf family's discipline — every seat deals the same fan),
 *  seated in the rain annulus and BIASED DOWNWIND: with `wind` standing,
 *  a `downwind` share of the drops fly within ±`spread` of the wind's
 *  bearing and the rest ring evenly; calm air rings evenly. The wind is
 *  the caller's read at the burst (World.windAt — the standing wind
 *  fabric, so weather and rain agree); the landing legality (walkable
 *  pocks, roofed seats spared) is the zone pipeline's. */
export function rainFanOf(vent: PlacedVent, ventIdx: number, k: number,
  wind: { x: number; y: number; strength: number } | null, countMul = 1): { x: number; y: number }[] {
  const R = GEYSER_CFG.rain;
  const h32 = (a: number, b: number, c: number): number => {
    let v = Math.imul(a + 11, 2654435761) >>> 0;
    v = (v ^ Math.imul(b + 5, 0x9e3779b1) ^ Math.imul(c + 3, 0x85ebca6b)) >>> 0;
    v = Math.imul(v ^ (v >>> 15), 2246822519) >>> 0;
    return ((v ^ (v >>> 13)) >>> 0) / 4294967296;
  };
  const [lo, hi] = R.count;
  // `countMul` > 1 = THE SURGE HOUR's "great vents rain more" (the tide
  // beats' GEYSER_CFG.surge.rainMul): the rolled count scales, the hashed
  // seats for the extra drops come from the same per-cycle stream.
  const n = Math.round((lo + Math.floor(h32(ventIdx, k, 0) * (hi - lo + 1))) * Math.max(0, countMul));
  const windAng = wind && wind.strength > 0.05 ? Math.atan2(wind.y, wind.x) : null;
  const bias = windAng === null ? 0 : R.downwind * Math.min(1, wind!.strength);
  const out: { x: number; y: number }[] = [];
  for (let j = 1; j <= n; j++) {
    const u = h32(ventIdx, k, j * 3);
    const ang = windAng !== null && u < bias
      ? windAng + (h32(ventIdx, k, j * 3 + 1) - 0.5) * 2 * R.spread
      : h32(ventIdx, k, j * 3 + 1) * Math.PI * 2;
    const d = R.range[0] + h32(ventIdx, k, j * 3 + 2) * (R.range[1] - R.range[0]);
    out.push({ x: vent.pos.x + Math.cos(ang) * d, y: vent.pos.y + Math.sin(ang) * d });
  }
  return out;
}

// --- field construction (mint-time; the World's boot hands in the stream) ---

/** Roll the field's SHARED shape from the zone's salted stream: the band
 *  partition + the shared band clocks. Vent seating stays the World's
 *  (walkability, POIs, door clearance are its knowledge); it appends vents
 *  via seatVent/anchorVent below so the clock bookkeeping stays one law. */
export function rollGeyserField(rng: Rng, spec: ZoneGeyserSpec, surgeKey?: number): GeyserField {
  const n = Math.max(1, rng.int(spec.bands?.[0] ?? 2, spec.bands?.[1] ?? 4));
  const banding: GeyserBanding = {
    theta: rng.range(0, Math.PI),
    stripeW: GEYSER_CFG.band.stripeW,
    wobbleSeed: (rng.next() * 0xffffffff) >>> 0,
    n,
  };
  const bands: GeyserBand[] = [];
  for (let i = 0; i < n; i++) {
    bands.push({ period: rng.range(GEYSER_CFG.bandPeriod[0], GEYSER_CFG.bandPeriod[1]), phase: rng.next() });
  }
  // THE SURGE HOUR's tide period: derived from the dealt bands (no draw of
  // its own — the stream's shape stays sacred); the key is the caller's
  // (the zone seed) — absent, the field never surges.
  let mean = 0;
  for (const b of bands) mean += b.period;
  mean /= bands.length;
  const surgePeriod = Math.max(GEYSER_CFG.surge.minPeriod, mean * GEYSER_CFG.surge.periodMul);
  const field: GeyserField = { vents: [], bands, banding, surgePeriod };
  if (surgeKey !== undefined) field.surgeKey = surgeKey >>> 0;
  return field;
}

/** Seat one SHARED-band vent (hiss/geyser): band by the stripe partition,
 *  solo clock rolled from the class band (the A/B lever's other face). */
export function seatVent(field: GeyserField, rng: Rng, pos: Vec2, cls: GeyserClassId): PlacedVent {
  const band = bandIndexAt(field.banding, pos.x, pos.y);
  const [pLo, pHi] = GEYSER_CFG.classes[cls].period;
  const v: PlacedVent = {
    pos, cls, band,
    period: rng.range(pLo, pHi), phase: rng.next(),
    downstream: resolveDownstream(cls), spill: spillBearing(pos),
    gate: new Map(),
  };
  field.vents.push(v);
  return v;
}

/** Seat an ANCHOR vent — its OWN private band (the great metronomes; also
 *  the authored bandless one-off, whose given clock lands in BOTH faces so
 *  the A/B lever cannot move it). */
export function anchorVent(field: GeyserField, rng: Rng, pos: Vec2, cls: GeyserClassId,
  own?: { period?: number; phase?: number; downstream?: DownstreamSpec }): PlacedVent {
  const [pLo, pHi] = GEYSER_CFG.classes[cls].period;
  const period = own?.period ?? rng.range(pLo, pHi);
  const phase = own?.phase ?? rng.next();
  field.bands.push({ period, phase });
  const v: PlacedVent = {
    pos, cls, band: field.bands.length - 1,
    period, phase,
    downstream: resolveDownstream(cls, own?.downstream), spill: spillBearing(pos),
    gate: new Map(),
  };
  field.vents.push(v);
  return v;
}

/** The column's hazard payload — the ONE moving-hazard grammar
 *  (sweepHazardSurface): mitigated typed FIRE + the authorless radial
 *  shove. No owner is ever passed: uncredited environment (the track
 *  fabric's credit-absent law; the trapworks doctrine — the dead build no
 *  allegiance). Dormant sleepers + airborne bodies spared by the payload
 *  grammar's own defaults (the sentry law). ICD outlasts the live window,
 *  so one eruption is one hit per body. */
export function columnPayload(cls: GeyserClassId): {
  hit: { base: number; perLevel: number; type: 'fire' };
  impulse: number; icdSec: number;
} {
  const c = GEYSER_CFG.classes[cls];
  return {
    hit: { base: c.hit.base, perLevel: c.hit.perLevel, type: 'fire' },
    impulse: c.impulse,
    icdSec: c.eruptSec + GEYSER_CFG.icdPad,
  };
}

// --- validation (the flock-dial doctrine: dials stay physical) --------------

/** Human-readable gripes for a theme row; empty = sane. */
export function lintGeyserSpec(spec: ZoneGeyserSpec, where: string): string[] {
  const out: string[] = [];
  for (const cls of ['hiss', 'geyser', 'great'] as const) {
    const band = spec[cls];
    if (!band) continue;
    if (band[0] > band[1] || band[0] < 0) out.push(`${where}: ${cls} count [${band[0]},${band[1]}] malformed`);
    if (band[1] > 24) out.push(`${where}: ${cls} count cap ${band[1]} > 24 — a puddle field, not a country`);
  }
  if (spec.bands && (spec.bands[0] < 1 || spec.bands[0] > spec.bands[1] || spec.bands[1] > 8)) {
    out.push(`${where}: bands [${spec.bands[0]},${spec.bands[1]}] outside [1,8] lo≤hi`);
  }
  return out;
}
