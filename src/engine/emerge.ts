// ---------------------------------------------------------------------------
// THE EMERGENCE GRAMMAR — a body ARRIVES as a drawing (the dissolution
// grammar's mirror; design: docs/design/show-dont-tell.md §3b, the M-EMERGE
// movement; engine doc: docs/engine/emergence.md).
//
// Before this a body arrived the same way everywhere: it stood at its seat,
// a pale ring flashed, and a caption told you what you did not see — "the
// sand shifts…", "the dead wake!", "something skitters out!". The grammar
// makes the arrival a MOTION chosen by the GROUND under the seat and the HOST
// it leaves: the body RISES through the ground's own flung grains, BURSTS OUT
// of a breaking host, CONDENSES from light, SURFACES through water, DROPS
// from above, or STIRS where it already stood — held and untargetable for
// the motion's life (drawn == tested: a half-risen body is not yet there),
// then released. One engine, six motions, every arrival a consumer by one
// call (World.emergeBody). The caption retires where the motion lands.
//
// This is the PURE LEAF: the spec, the ground defaults (the MATERIAL_NATURE
// idiom), the open motion registry with its pure pose + grain laws, the ONE
// resolver, and the ground derivation — no World, no canvas; the render half
// (render/vis/emergeLayer.ts) and the headless probe (balance/probe_emerge.ts)
// read the same numbers.
//
// THE LAWS (probe-pinned):
//   1. DRAWN == TESTED — a held body is untargetable and does not think for
//      exactly the motion's life; the renderer draws it through the pose for
//      exactly that long; release and the standing body coincide.
//   2. NO TEXT — an arrival that plays a motion speaks no caption.
//   3. DETERMINISM — every pose and grain is a pure function of (seed, t).
//   4. PERF-CAPPED — EMERGE_CFG.maxLive; past it the body simply stands (the
//      renderer's spawn-in grow still plays — the honest degrade).
//   5. ONE ACCENT CHANNEL — the arrival's flash speaks THE EFFECT VOICE.
//
// All numbers are DIALS (unblessed — her walk blesses).
// ---------------------------------------------------------------------------

import { hash01 } from './hash';

export type EmergeMotionId = 'rise' | 'burstout' | 'condense' | 'surface' | 'drop' | 'stir' | (string & {});
export type EmergeGroundId =
  | 'earth' | 'sand' | 'snow' | 'mire' | 'ash' | 'stone' | 'verdure' | 'flesh'
  | 'water' | 'lava' | 'blood' | 'light' | 'canopy'
  | (string & {});
/** The grain painter's shapes (render/vis/emergeLayer.ts). */
export type EmergeGrainShape = 'grit' | 'clod' | 'flake' | 'drop' | 'ember' | 'mote' | 'leaf' | (string & {});

/** ONE DATA ROW PER ARRIVAL (MonsterDef.emerge / AmbushSpec.emerge / a
 *  consumer's override). A row names only its motion, or only its ground,
 *  and inherits the rest. Precedence: the row > the ground row > the motion
 *  def > EMERGE_CFG.base. */
export interface EmergeSpec {
  motion?: EmergeMotionId;
  /** The ground the body comes through — the grain palette + the default
   *  motion (absent = derived from the seat: region kind → biome). */
  ground?: EmergeGroundId;
  /** Seconds the arrival plays (the hold). */
  life?: number;
  /** Flung ground grains [lo, hi] (seeded inside). */
  grains?: [number, number];
  /** Grain reach in body radii. */
  fling?: number;
  grainColor?: string;
  grainShape?: EmergeGrainShape;
  /** The effect voice the arrival's flash speaks; false = none. */
  voice?: string | false;
  /** A heat-haze ring on the flash (the condense cue). */
  haze?: number;
  /** Hold the body (untargetable, no thinking) for the life. Default true. */
  hold?: boolean;
  /** rise / surface: how deep the body starts, in radii. */
  lift?: number;
  /** drop: how high the body starts, in radii. */
  dropFrom?: number;
}

export interface ResolvedEmerge {
  motion: EmergeMotionId;
  ground: EmergeGroundId | null;
  life: number;
  grains: [number, number];
  fling: number;
  grainColor: string;
  grainShape: EmergeGrainShape;
  voice: string | false;
  haze: number;
  hold: boolean;
  lift: number;
  dropFrom: number;
}

/** One arriving body's drawn pose at time t: world-unit offsets, anisotropic
 *  scale, alpha, a sideways shear, the contact shadow's strength, and the
 *  body-local y (before the pose's own offset) BELOW which nothing of the
 *  body draws — the ground line a rising body climbs through (null = no
 *  clip). */
export interface EmergePose {
  dx: number; dy: number; sx: number; sy: number; alpha: number; shear: number;
  shadow: number; clipBelow: number | null;
}
export interface EmergePoseInput { seed: number; t: number; life: number; r: number; spec: ResolvedEmerge }
/** One flung grain at time t (world-unit offsets from the seat). */
export interface EmergeGrain { x: number; y: number; alpha: number; size: number }

export interface EmergeMotionDef {
  life: number;
  grains: [number, number];
  fling: number;
  voice: string | false;
  haze?: number;
  hold: boolean;
  lift: number;
  dropFrom: number;
  /** THE KINEMATICS — the body's pure pose law (f(seed, t)). */
  pose: (k: EmergePoseInput) => EmergePose;
  /** THE GRAINS — the ground's pure scatter law (f(seed, i, t)). */
  grain: (k: EmergePoseInput, i: number, n: number) => EmergeGrain | null;
}

// --- THE DIALS ---------------------------------------------------------------

export const EMERGE_CFG = {
  /** Concurrency cap on LIVE arrivals; past it the body simply stands (THE
   *  HONEST DEGRADE — the renderer's spawn-in grow still plays). */
  maxLive: 16,
  base: {
    life: 0.55,
    grains: [6, 10] as [number, number],
    fling: 1.6,
    grainColor: '#6a5a44',
    grainShape: 'grit' as EmergeGrainShape,
    voice: 'dust' as string | false,
    haze: 0,
    hold: true,
    lift: 1.6,
    dropFrom: 6,
  },
  /** THE SLIT (rise / surface): the dark opening at the feet — width in
   *  radii at full gape, and how far into the life it stays open. */
  slit: { width: 1.15, height: 0.38, peak: 0.45 },
} as const;

const TAU = Math.PI * 2;
const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOut = (v: number): number => 1 - (1 - v) * (1 - v);
const easeIn = (v: number): number => v * v;
/** Deterministic [0,1) per (seed, i, salt) — the effect-voice sv idiom. */
function sv(seed: number, i: number, salt: number): number { return hash01(i + 1, salt + 1, seed); }

// --- THE MOTIONS (pure kinematics + grain laws) ----------------------------

const MOTIONS: Record<string, EmergeMotionDef> = {};
export function registerEmergeMotion(id: string, def: EmergeMotionDef): void { MOTIONS[id] = def; }
export function emergeMotionOf(id: string): EmergeMotionDef | undefined { return MOTIONS[id]; }
export function emergeMotionIds(): string[] { return Object.keys(MOTIONS); }

/** The shared GROUND SCATTER: grains fling outward and up, then fall — an
 *  arc per grain, fading over the life; the first half of the life throws,
 *  the second settles. */
const groundScatter = ({ seed, t, life, r, spec }: EmergePoseInput, i: number): EmergeGrain | null => {
  const v = clamp01(t / life);
  const born = 0.05 + 0.35 * sv(seed, i, 1);
  if (v < born) return null;
  const u = clamp01((v - born) / Math.max(0.05, 1 - born));
  const ang = sv(seed, i, 2) * TAU;
  const reach = spec.fling * r * (0.35 + 0.75 * sv(seed, i, 3));
  const d = reach * easeOut(u);
  const lift = r * (0.5 + 0.7 * sv(seed, i, 4)) * Math.sin(Math.PI * Math.min(1, u * 1.05));
  return { x: Math.cos(ang) * d, y: Math.sin(ang) * d * 0.55 - lift, alpha: (1 - u) * (1 - u) * 0.9, size: 1.4 + 2.2 * sv(seed, i, 5) };
};

/** RISE — the body climbs up through the ground line (clipped below it),
 *  squashed wide then standing; the ground's grains fly. */
registerEmergeMotion('rise', {
  life: 0.6, grains: [7, 11], fling: 1.6, voice: 'dust', hold: true, lift: 1.6, dropFrom: 6,
  pose: ({ t, life, r, spec }) => {
    const v = clamp01(t / life);
    const e = easeOut(v);
    return { dx: 0, dy: r * spec.lift * (1 - e), sx: 1.18 - 0.18 * e, sy: 0.78 + 0.22 * e, alpha: 1, shear: 0, shadow: e, clipBelow: r * 0.45 };
  },
  grain: groundScatter,
});

/** SURFACE — the rise through a liquid: shallower, a bob as it breaks the
 *  skin; droplets instead of clods (the ground row says so). */
registerEmergeMotion('surface', {
  life: 0.55, grains: [6, 10], fling: 1.3, voice: 'wetpop', hold: true, lift: 1.2, dropFrom: 6,
  pose: ({ t, life, r, spec }) => {
    const v = clamp01(t / life);
    const e = easeOut(v);
    const bob = Math.sin(v * TAU) * r * 0.08 * (1 - v);
    return { dx: 0, dy: r * spec.lift * (1 - e) + bob, sx: 1.1 - 0.1 * e, sy: 0.85 + 0.15 * e, alpha: 1, shear: 0, shadow: e, clipBelow: r * 0.4 };
  },
  grain: groundScatter,
});

/** BURST-OUT — out of a breaking host: the body pops from small past full
 *  and settles; no grains of its own (the host's own burst is the scatter). */
registerEmergeMotion('burstout', {
  life: 0.42, grains: [0, 0], fling: 1, voice: false, hold: true, lift: 0, dropFrom: 0,
  pose: ({ t, life }) => {
    const v = clamp01(t / life);
    const s = v < 0.7 ? 0.25 + 0.95 * (v / 0.7) : 1.2 - 0.2 * ((v - 0.7) / 0.3);
    return { dx: 0, dy: 0, sx: s, sy: s, alpha: Math.min(1, v * 3), shear: 0, shadow: v, clipBelow: null };
  },
  grain: () => null,
});

/** CONDENSE — light/heat gathers into the body: alpha in under a sideways
 *  heat-lean (the mirage law run backward); motes drift INWARD. */
registerEmergeMotion('condense', {
  life: 0.7, grains: [8, 12], fling: 1.8, voice: false, haze: 1, hold: true, lift: 0, dropFrom: 0,
  pose: ({ seed, t, life }) => {
    const v = clamp01(t / life);
    return { dx: 0, dy: 0, sx: 0.86 + 0.14 * v, sy: 1.05 - 0.05 * v, alpha: Math.pow(v, 1.4), shear: Math.sin(t * 7 + seed * 0.37) * 0.12 * (1 - v), shadow: v, clipBelow: null };
  },
  grain: ({ seed, t, life, r, spec }, i) => {
    const v = clamp01(t / life);
    const ang = sv(seed, i, 6) * TAU;
    const reach = spec.fling * r * (0.6 + 0.6 * sv(seed, i, 7));
    const d = reach * (1 - easeIn(v));
    return { x: Math.cos(ang) * d, y: Math.sin(ang) * d * 0.7 - r * 0.2 * sv(seed, i, 8), alpha: 0.7 * Math.sin(Math.PI * v), size: 1.2 + 1.6 * sv(seed, i, 9) };
  },
});

/** DROP — from above the frame: an ease-in fall, a landing squash, a dust
 *  puff only at the landing; the shadow grows as it nears. */
registerEmergeMotion('drop', {
  life: 0.5, grains: [5, 8], fling: 1.2, voice: 'dust', hold: true, lift: 0, dropFrom: 6,
  pose: ({ t, life, r, spec }) => {
    const v = clamp01(t / life);
    const fall = v < 0.8 ? 1 - easeIn(v / 0.8) : 0;
    const land = v < 0.8 ? 0 : Math.sin(((v - 0.8) / 0.2) * Math.PI);
    return { dx: 0, dy: -r * spec.dropFrom * fall, sx: 1 + 0.22 * land, sy: 1 - 0.25 * land, alpha: 1, shear: 0, shadow: Math.max(0.15, 1 - fall), clipBelow: null };
  },
  grain: (k, i) => {
    const v = clamp01(k.t / k.life);
    if (v < 0.78) return null;
    const sub = { ...k, t: (v - 0.78) / 0.22 * k.life, life: k.life };
    return groundScatter(sub, i);
  },
});

/** STIR — a visible body that was never asleep: a shudder and a breath,
 *  no hold, a few specks. */
registerEmergeMotion('stir', {
  life: 0.45, grains: [2, 4], fling: 0.8, voice: false, hold: false, lift: 0, dropFrom: 0,
  pose: ({ seed, t, life, r }) => {
    const v = clamp01(t / life);
    return { dx: Math.sin(t * 40 + seed) * r * 0.06 * (1 - v), dy: 0, sx: 1, sy: 1 - 0.08 * Math.sin(v * TAU), alpha: 1, shear: 0, shadow: 1, clipBelow: null };
  },
  grain: groundScatter,
});

// --- THE GROUND DEFAULTS (the MATERIAL_NATURE idiom) ------------------------

/** A row names only its ground (or the seat derives one) and inherits the
 *  motion, the grain palette and the voice. */
export const EMERGE_GROUNDS: Record<string, Partial<EmergeSpec> & { motion: EmergeMotionId }> = {
  earth:   { motion: 'rise', grainColor: '#5a4a34', grainShape: 'clod', voice: 'dust' },
  sand:    { motion: 'rise', grainColor: '#d8c088', grainShape: 'grit', voice: 'dust' },
  snow:    { motion: 'rise', grainColor: '#e8f0f8', grainShape: 'flake', voice: 'sparkle' },
  mire:    { motion: 'rise', grainColor: '#3a4a2a', grainShape: 'drop', voice: 'wetpop' },
  ash:     { motion: 'rise', grainColor: '#6a6058', grainShape: 'grit', voice: 'dust' },
  stone:   { motion: 'rise', grainColor: '#8a8276', grainShape: 'clod', voice: 'dust' },
  verdure: { motion: 'rise', grainColor: '#4a662a', grainShape: 'leaf', voice: 'dust' },
  flesh:   { motion: 'rise', grainColor: '#8a3848', grainShape: 'drop', voice: 'wetpop' },
  water:   { motion: 'surface', grainColor: '#9ad8e8', grainShape: 'drop', voice: 'wetpop' },
  lava:    { motion: 'surface', grainColor: '#ff8a3a', grainShape: 'ember', voice: 'dust' },
  blood:   { motion: 'surface', grainColor: '#8a1a22', grainShape: 'drop', voice: 'wetpop' },
  light:   { motion: 'condense', grainColor: '#fff0c0', grainShape: 'mote', voice: false, haze: 1 },
  canopy:  { motion: 'drop', grainColor: '#4a662a', grainShape: 'leaf', voice: 'dust' },
};

// --- THE RESOLVER -----------------------------------------------------------

/** Fold a row through its ground + motion defaults to a whole spec; null for
 *  a row that names no motion and no ground (nothing to play). */
export function resolveEmerge(row: EmergeSpec | undefined | null): ResolvedEmerge | null {
  if (!row) return null;
  const g = row.ground ? EMERGE_GROUNDS[row.ground] : undefined;
  const motionId = row.motion ?? g?.motion;
  if (!motionId) return null;
  const mo = MOTIONS[motionId];
  if (!mo) return null;
  const B = EMERGE_CFG.base;
  const pick = <K extends keyof EmergeSpec>(k: K): EmergeSpec[K] | undefined =>
    row[k] !== undefined ? row[k] : g && g[k] !== undefined ? g[k] : undefined;
  return {
    motion: motionId,
    ground: row.ground ?? null,
    life: pick('life') ?? mo.life ?? B.life,
    grains: pick('grains') ?? mo.grains ?? B.grains,
    fling: pick('fling') ?? mo.fling ?? B.fling,
    grainColor: pick('grainColor') ?? B.grainColor,
    grainShape: pick('grainShape') ?? B.grainShape,
    voice: pick('voice') ?? mo.voice,
    haze: pick('haze') ?? mo.haze ?? B.haze,
    hold: pick('hold') ?? mo.hold,
    lift: pick('lift') ?? mo.lift ?? B.lift,
    dropFrom: pick('dropFrom') ?? mo.dropFrom ?? B.dropFrom,
  };
}

/** THE ONE READ every consumer makes: the arriving body's spec from its
 *  authored rows (the instance/ambush row wins, then the def's), the seat's
 *  derived ground, and whether it leaves a HOST (a breaking body — burst-out
 *  by default). A body with no row still arrives by its ground. */
export function emergeFor(rows: (EmergeSpec | undefined)[], ground: EmergeGroundId | null, host: boolean): ResolvedEmerge | null {
  const row: Record<string, unknown> = {};
  for (const r of rows) if (r) for (const [k, v] of Object.entries(r)) if (v !== undefined && row[k] === undefined) row[k] = v;
  const spec = row as EmergeSpec;
  if (spec.motion === undefined && spec.ground === undefined) {
    if (host) spec.motion = 'burstout';
    else if (ground) spec.ground = ground;
  } else if (spec.ground === undefined && ground && spec.motion !== 'burstout' && spec.motion !== 'stir') {
    spec.ground = ground; // the motion was named; the seat still paints the grains
  }
  return resolveEmerge(spec);
}

/** THE GROUND DERIVATION — pure: the region kind under the seat first (a
 *  body on water surfaces whatever country it is in), else the country's own
 *  ground (desert sand, tundra snow, marsh mire…), else earth. */
export function emergeGroundFor(biome: string | undefined, region: string | undefined): EmergeGroundId {
  if (region) {
    if (/water|lake|tide_pool|brine_sink|soul_water|sulphur|prism_pool|deep_water/.test(region)) return 'water';
    if (/lava|magma/.test(region)) return 'lava';
    if (/blood|chyme|gore/.test(region)) return 'blood';
    if (/bog|swamp|mud|scald_sheen/.test(region)) return 'mire';
    if (/ice|snow/.test(region)) return 'snow';
    if (/sand|hardpan/.test(region)) return 'sand';
    if (/ash/.test(region)) return 'ash';
    if (/scree/.test(region)) return 'stone';
    if (/brush|reeds|berry|regrowth|web|tentacle/.test(region)) return 'verdure';
  }
  const b = biome ?? '';
  if (/^aether|courtland/.test(b)) return 'light';
  if (/desert|beach|littoral|isle|butteland|steppes/.test(b)) return 'sand';
  if (/tundra|taiga|highland/.test(b)) return 'snow';
  if (/marsh|mycelia/.test(b)) return 'mire';
  if (/flesh|caul/.test(b)) return 'flesh';
  if (/volcanic|flame|warfront|scald/.test(b)) return 'ash';
  if (/cavern|crystal|karst|durance|ruin|sepulcher|ossuary|rift|soulway|metropolis|manor/.test(b)) return 'stone';
  if (/jungle|grove|forest|gloamwood|garden/.test(b)) return 'verdure';
  if (/deepsea|ocean|river/.test(b)) return 'water';
  return 'earth';
}

// --- THE SEED + THE PURE READS ---------------------------------------------

/** THE SEED — pure f(seat, id): seats and resumes play the same arrival. */
export function emergeSeedOf(x: number, y: number, id: number): number {
  let h = (Math.imul(Math.round(x * 4), 374761393) ^ Math.imul(Math.round(y * 4), 668265263) ^ Math.imul(id | 0, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return h >>> 0;
}

export function emergeRollBand(seed: number, band: readonly [number, number], salt: number): number {
  const lo = Math.round(band[0]), hi = Math.round(band[1]);
  if (hi <= lo) return lo;
  return lo + Math.floor(sv(seed, 0, salt) * (hi - lo + 1));
}

/** The body's pose at t seconds after the arrival — pure. */
export function emergePose(spec: ResolvedEmerge, seed: number, t: number, r: number): EmergePose {
  const mo = MOTIONS[spec.motion];
  if (!mo) return { dx: 0, dy: 0, sx: 1, sy: 1, alpha: 1, shear: 0, shadow: 1, clipBelow: null };
  return mo.pose({ seed, t, life: spec.life, r, spec });
}

/** The grain count of one arrival (seeded inside the band). */
export function emergeGrainCount(spec: ResolvedEmerge, seed: number): number {
  return Math.max(0, emergeRollBand(seed, spec.grains, 11));
}

/** One grain's place at t — pure; null while it has not been born (or never). */
export function emergeGrain(spec: ResolvedEmerge, seed: number, i: number, n: number, t: number, r: number): EmergeGrain | null {
  const mo = MOTIONS[spec.motion];
  if (!mo) return null;
  return mo.grain({ seed, t, life: spec.life, r, spec }, i, n);
}

/** THE SLIT's gape (0..1) at t — the dark opening a rising body climbs
 *  through: opens fast, holds, closes as the body stands. */
export function emergeSlit(spec: ResolvedEmerge, t: number): number {
  if (spec.motion !== 'rise' && spec.motion !== 'surface') return 0;
  const v = clamp01(t / spec.life);
  const p = EMERGE_CFG.slit.peak;
  return v < p ? easeOut(v / p) : 1 - easeIn((v - p) / Math.max(1e-3, 1 - p));
}
