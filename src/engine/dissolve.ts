// ---------------------------------------------------------------------------
// THE DISSOLUTION GRAMMAR — a break is a sentence the drawing speaks.
//
// Design authority: docs/design/dissolution.md (her commission 2026-08-22,
// urns first); engine doc: docs/engine/dissolution.md. This is the PURE LEAF
// of the fabric — the spec, the material + motion defaults, the open
// registries, the ONE resolver, and the pure geometry (the fragment CUTS and
// the fragment KINEMATICS) — no World import, no canvas: the render half
// (render/vis/dissolveLayer.ts) draws off these numbers and the headless probe
// (balance/probe_dissolve.ts) pins the same numbers the renderer draws.
//
// THE FIVE MOTIONS (each a registered DissolveMotionDef — open by design):
//   crumble  — strata/facets SLUMP down and outward a little (rock, earth,
//              the harvest nodes, the saltbloom later);
//   giveway  — the seam CRACKS FIRST (the drawn pre-crack over the dwell),
//              then the pieces DROP inward/down (secret walls, cracked faces,
//              the rotten span — the carve/pit law fires at the instant as
//              ever; the motion is after-image);
//   shatter  — radial FLING + spin + fall, pieces skitter and stop (urns,
//              pots, glass, crystal, ice);
//   burst    — an outward PUFF, lobes fly a short way (pods, sacs, caps —
//              the fume/spawn payloads fire at the instant as ever);
//   dissolve — alpha fade under a sideways SHEAR + the haze ring (the mirage
//              trio; later THE PHANTOM EVENTS' per-body vanish).
//
// THE LAWS (charter §3f — probe-pinned):
//   1. DRAWN == TESTED AT THE INSTANT — the kind swap, carve, splice, the
//      blocking trio, spawn/fume/collapse all fire at the break tick exactly
//      as before; the debris doodad EXISTS from the instant (non-blocking,
//      non-occluding); nothing tested waits for an animation.
//   2. NO TEXT — a kind that adopts a motion drops its brittle text/warn in
//      the same commit (THE RETIREMENT CENSUS is the executable law).
//   3. FADE, NEVER POP — debris leaves through Doodad.evap with the soft-dry
//      ease (render/vis/dressFade.ts); per-kind `fade: false` for dust that
//      must outlast the visit.
//   4. DETERMINISM — every fragment path is a pure function of
//      (seed = position hash, t since the break): seats and resumes agree,
//      nothing new on the wire.
//   5. PERF-CAPPED — DISSOLVE_CFG.maxLive; past it a break snaps straight to
//      its debris (the honest degrade, never a stall); zero idle cost.
//   6. ONE ACCENT CHANNEL — the break's flash speaks through THE EFFECT VOICE
//      (render/vis/effectVoice.ts); the grammar adds voices, never a second
//      flash system.
//
// All numbers below are DIALS (unblessed — her gauge walk blesses; see
// memory dissolution-d0-pass).
// ---------------------------------------------------------------------------

import { hash01 } from './hash';
import { doodadRuleOf, type DoodadKind } from './levelgen';

/** The five built-in motions; the union stays OPEN (registerDissolveMotion). */
export type DissolveMotionId = 'crumble' | 'giveway' | 'shatter' | 'burst' | 'dissolve' | (string & {});
/** The five built-in cuts; open likewise (registerDissolveCut). */
export type DissolveCutId = 'shards' | 'strata' | 'facets' | 'lobes' | 'none' | (string & {});
/** The material vocabulary DISSOLVE_MATERIALS speaks (open — a row may name
 *  any key a future pass registers into the table). */
export type DissolveMaterialId =
  | 'ceramic' | 'glass' | 'crystal' | 'ice' | 'stone' | 'earth' | 'wood' | 'bone' | 'salt' | 'pod' | 'light'
  | (string & {});

/** The debris dwell-then-dry (Doodad.evap): `after` = seconds standing
 *  before the contraction starts (seeded inside the band — no global rng
 *  draw), `rate` = units/sec the evap sweep shrinks at. */
export interface DissolveFade { after: [number, number]; rate?: number }

/** ONE DATA ROW PER CONSUMER (DoodadRule.dissolve). A kind names only its
 *  motion (or only its material) and inherits the rest — THE MATERIAL_NATURE
 *  IDIOM. Precedence at resolution: the row > the material row > the motion
 *  def > DISSOLVE_CFG.base. */
export interface DissolveSpec {
  /** The motion (absent = the material's own default motion). */
  motion?: DissolveMotionId;
  /** The material default row this kind inherits from. */
  material?: DissolveMaterialId;
  /** The fragment mask. */
  cut?: DissolveCutId;
  /** Fragment count band [lo, hi] — seeded inside. */
  pieces?: [number, number];
  /** Seconds the fragments move before they are the debris. */
  life?: number;
  /** Outward fling speed, in body RADII per second (shatter/burst). */
  fling?: number;
  /** Fake-2D fall (px/s²) the flung pieces sag under. */
  gravity?: number;
  /** Max spin (rad/s) a flung piece turns at. */
  spin?: number;
  /** The debris kind pushed AT THE INSTANT (`false` = light leaves no dust;
   *  a row with `remains` adopts its remains doodad as the debris instead). */
  debris?: string | false;
  /** Debris radius as a fraction of the body radius. */
  debrisRadius?: number;
  /** The debris' dwell-then-dry; `false` = the pile outlasts the visit. */
  fade?: DissolveFade | false;
  /** The effect voice the break's flash speaks; `false` = the classic body
   *  (or the haze ring where `haze` stands). */
  voice?: string | false;
  /** A heat-haze ring on the flash (the mirage law) — also read by the
   *  dissolve motion's render as the shear's cue. 0 = none. */
  haze?: number;
  /** THE PRE-CRACK: a dwell-gated break draws a growing crack at the stand/
   *  strike point over its dwell (replaces every `warn` line). */
  preCrack?: boolean;
  /** Bitmap reach as a multiple of the body radius (the fragment engine's
   *  one-shot paint canvas — painters whose dressing fans wide raise it). */
  scope?: number;
}

/** A fully folded row — every field present (what dissolveFor returns). */
export interface ResolvedDissolve {
  motion: DissolveMotionId;
  material: DissolveMaterialId | null;
  cut: DissolveCutId;
  pieces: [number, number];
  life: number;
  fling: number;
  gravity: number;
  spin: number;
  debris: string | false;
  debrisRadius: number;
  fade: DissolveFade | false;
  voice: string | false;
  haze: number;
  preCrack: boolean;
  scope: number;
}

/** One fragment cell of a cut, in BODY UNITS (1 = the body radius, screen
 *  axes: +y is down). `pts` is the clip polygon; (cx, cy) its pivot. */
export interface DissolveCell { pts: { x: number; y: number }[]; cx: number; cy: number }

/** A cutter: seeded cells for `n` pieces around the strike point (body
 *  units, clamped inside the body) over a bitmap reaching `scope` radii. */
export type DissolveCutter = (seed: number, n: number, strike: { x: number; y: number }, scope: number) => DissolveCell[];

/** What a kinematics law reads for one fragment at time t. */
export interface PoseInput {
  seed: number; i: number; n: number;
  /** Seconds since the break. */
  t: number;
  /** The motion's life (seconds). */
  life: number;
  /** Body radius (world units). */
  r: number;
  /** The cell's pivot (body units) and the strike point (body units). */
  cell: DissolveCell; strike: { x: number; y: number };
  spec: ResolvedDissolve;
}

/** One fragment's drawn pose: world-unit offsets from the cell pivot, a
 *  rotation about the pivot, anisotropic scale, alpha, and an optional
 *  sideways shear (the dissolve motion's heat-lean). */
export interface FragmentPose { dx: number; dy: number; rot: number; sx: number; sy: number; alpha: number; shear: number }

export interface DissolveMotionDef {
  cut: DissolveCutId;
  pieces: [number, number];
  life: number;
  fling: number;
  gravity: number;
  spin: number;
  debris: string | false;
  voice: string | false;
  haze?: number;
  /** THE KINEMATICS — the pure pose law (f(seed, i, t) — no state). */
  pose: (k: PoseInput) => FragmentPose;
}

// --- THE DIALS ---------------------------------------------------------------

export const DISSOLVE_CFG = {
  /** Concurrency cap on LIVE motions; past it a break lands its debris and
   *  its voice but plays no fragments (THE HONEST DEGRADE). */
  maxLive: 12,
  /** The fold's floor — every field a motion/material/row may leave unsaid. */
  base: {
    pieces: [6, 10] as [number, number],
    life: 0.9,
    fling: 2.6,
    gravity: 260,
    spin: 5,
    debrisRadius: 0.85,
    fade: { after: [45, 75] as [number, number], rate: 10 },
    scope: 2.2,
    haze: 0,
    preCrack: false,
  },
  /** The strike point clamps inside this fraction of the radius (a strike
   *  landing past the rim still radiates from inside the body). */
  strikeInset: 0.62,
  /** THE SETTLE: the debris fades IN over this fraction band of the motion's
   *  life (render-side; 0.55 → 1 = the last 45% of the flight). */
  settle: [0.55, 1] as [number, number],
  /** THE PRE-CRACK: drawn reach (fraction of the radius) at full dwell, the
   *  number of crack arms, and the pre-crack seam count per arm. */
  crack: { reach: 0.95, arms: [3, 5] as [number, number], segs: 3 },
} as const;

// --- THE CUTS (pure geometry) -----------------------------------------------

const CUTS: Record<string, DissolveCutter> = {};

export function registerDissolveCut(id: string, cutter: DissolveCutter): void {
  CUTS[id] = cutter;
}

export function dissolveCutOf(id: string): DissolveCutter | undefined { return CUTS[id]; }

export function dissolveCutIds(): string[] { return Object.keys(CUTS); }

const TAU = Math.PI * 2;

/** Deterministic [0,1) per (seed, i, salt) — the effect-voice sv idiom. */
function sv(seed: number, i: number, salt: number): number {
  return hash01(i + 1, salt + 1, seed);
}

/** SHARDS — seeded wedges radiating from the STRIKE point (ceramic, glass,
 *  ice): each wedge reaches past the bitmap's rim so the silhouette's own
 *  alpha does the true clipping. */
registerDissolveCut('shards', (seed, n, strike, scope) => {
  const cells: DissolveCell[] = [];
  const base = sv(seed, 0, 1) * TAU;
  const R = scope * 1.1;
  const angs: number[] = [];
  for (let i = 0; i < n; i++) {
    angs.push(base + (i / n) * TAU + (sv(seed, i, 2) - 0.5) * (TAU / n) * 0.55);
  }
  for (let i = 0; i < n; i++) {
    const a0 = angs[i], a1 = i + 1 < n ? angs[i + 1] : angs[0] + TAU;
    const am = (a0 + a1) / 2;
    const pts = [
      { x: strike.x, y: strike.y },
      { x: strike.x + Math.cos(a0) * R, y: strike.y + Math.sin(a0) * R },
      { x: strike.x + Math.cos(am) * R * 1.08, y: strike.y + Math.sin(am) * R * 1.08 },
      { x: strike.x + Math.cos(a1) * R, y: strike.y + Math.sin(a1) * R },
    ];
    // The pivot sits where the body's mass is — ~0.55 radii out along the
    // wedge's axis, clamped inside the unit disc.
    const px = strike.x + Math.cos(am) * 0.55, py = strike.y + Math.sin(am) * 0.55;
    const pl = Math.hypot(px, py);
    const k = pl > 0.92 ? 0.92 / pl : 1;
    cells.push({ pts, cx: px * k, cy: py * k });
  }
  return cells;
});

/** STRATA — horizontal slabs with jittered seams (rock, earth, masonry,
 *  wood): every seam is ONE polyline shared by its two slabs, so the slabs
 *  tile without gaps or overlaps. */
registerDissolveCut('strata', (seed, n, _strike, scope) => {
  const cells: DissolveCell[] = [];
  const xs = [-scope * 1.1, -0.36, 0.36, scope * 1.1];
  const seams: { x: number; y: number }[][] = [];
  for (let k = 0; k <= n; k++) {
    const y0 = -1.12 + (2.24 * k) / n;
    const row = xs.map((x, j) => ({
      x,
      y: (k === 0) ? -scope * 1.1 : (k === n) ? scope * 1.1
        : y0 + (sv(seed, k * 4 + j, 3) - 0.5) * (1.6 / n),
    }));
    seams.push(row);
  }
  for (let k = 0; k < n; k++) {
    const top = seams[k], bot = seams[k + 1];
    const pts = [...top, ...[...bot].reverse()];
    const cy = (top[1].y + top[2].y + bot[1].y + bot[2].y) / 4;
    cells.push({ pts, cx: (sv(seed, k, 4) - 0.5) * 0.3, cy: Math.max(-0.95, Math.min(0.95, cy)) });
  }
  return cells;
});

/** FACETS — radial facets around the body's AXIS with an inner ring
 *  (crystal, geodes, the saltbloom): an inner core of m pieces, n−m outer. */
registerDissolveCut('facets', (seed, n, _strike, scope) => {
  const cells: DissolveCell[] = [];
  const m = Math.max(1, Math.round(n / 3));
  const outer = Math.max(2, n - m);
  const R = scope * 1.1, r1 = 0.5;
  const base = sv(seed, 0, 5) * TAU;
  for (let i = 0; i < outer; i++) {
    const a0 = base + (i / outer) * TAU + (sv(seed, i, 6) - 0.5) * (TAU / outer) * 0.4;
    const a1 = base + ((i + 1) / outer) * TAU + (sv(seed, i + 1, 6) - 0.5) * (TAU / outer) * 0.4;
    const am = (a0 + a1) / 2;
    const pts = [
      { x: Math.cos(a0) * r1, y: Math.sin(a0) * r1 },
      { x: Math.cos(a0) * R, y: Math.sin(a0) * R },
      { x: Math.cos(am) * R * 1.08, y: Math.sin(am) * R * 1.08 },
      { x: Math.cos(a1) * R, y: Math.sin(a1) * R },
      { x: Math.cos(a1) * r1, y: Math.sin(a1) * r1 },
    ];
    cells.push({ pts, cx: Math.cos(am) * 0.72, cy: Math.sin(am) * 0.72 });
  }
  const ib = base + sv(seed, 1, 7) * TAU;
  for (let i = 0; i < m; i++) {
    const a0 = ib + (i / m) * TAU, a1 = ib + ((i + 1) / m) * TAU;
    const am = (a0 + a1) / 2;
    const pts = [{ x: 0, y: 0 }];
    const segs = 4;
    for (let s = 0; s <= segs; s++) {
      const a = a0 + ((a1 - a0) * s) / segs;
      pts.push({ x: Math.cos(a) * r1 * 1.02, y: Math.sin(a) * r1 * 1.02 });
    }
    cells.push({ pts, cx: m === 1 ? 0 : Math.cos(am) * 0.22, cy: m === 1 ? 0 : Math.sin(am) * 0.22 });
  }
  return cells;
});

/** LOBES — 2–4 soft rounded pieces (pods, sacs, caps): sectors with a
 *  round outer arc — they tile exactly and read as lobes once they fly. */
registerDissolveCut('lobes', (seed, n, _strike, scope) => {
  const cells: DissolveCell[] = [];
  const k = Math.max(2, Math.min(4, n));
  const R = scope * 1.1;
  const base = sv(seed, 0, 8) * TAU;
  for (let i = 0; i < k; i++) {
    const a0 = base + (i / k) * TAU + (sv(seed, i, 9) - 0.5) * 0.5;
    const a1 = base + ((i + 1) / k) * TAU + (sv(seed, i + 1, 9) - 0.5) * 0.5;
    const am = (a0 + a1) / 2;
    const pts = [{ x: 0, y: 0 }];
    const segs = 6;
    for (let s = 0; s <= segs; s++) {
      const a = a0 + ((a1 - a0) * s) / segs;
      pts.push({ x: Math.cos(a) * R, y: Math.sin(a) * R });
    }
    cells.push({ pts, cx: Math.cos(am) * 0.45, cy: Math.sin(am) * 0.45 });
  }
  return cells;
});

/** NONE — the whole body is one piece (dissolves: light leaves no shards). */
registerDissolveCut('none', (_seed, _n, _strike, scope) => {
  const R = scope * 1.1;
  return [{ pts: [{ x: -R, y: -R }, { x: R, y: -R }, { x: R, y: R }, { x: -R, y: R }], cx: 0, cy: 0 }];
});

// --- THE MOTIONS (pure kinematics) -----------------------------------------

const MOTIONS: Record<string, DissolveMotionDef> = {};

export function registerDissolveMotion(id: string, def: DissolveMotionDef): void {
  MOTIONS[id] = def;
}

export function dissolveMotionOf(id: string): DissolveMotionDef | undefined { return MOTIONS[id]; }

export function dissolveMotionIds(): string[] { return Object.keys(MOTIONS); }

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOut = (v: number): number => 1 - (1 - v) * (1 - v);
const smooth = (a: number, b: number, v: number): number => {
  const u = clamp01((v - a) / Math.max(1e-6, b - a));
  return u * u * (3 - 2 * u);
};

/** CRUMBLE — pieces SLUMP down and a little outward, lower strata first,
 *  squashing as they settle; the whole thing comes in on itself. */
registerDissolveMotion('crumble', {
  cut: 'strata', pieces: [6, 9], life: 0.9, fling: 0.9, gravity: 220, spin: 1.2,
  debris: 'debris_rubble', voice: 'dust',
  pose: ({ seed, i, t, life, r, cell }) => {
    // Lower pieces let go first (cy > 0 is down-screen).
    const lag = life * (0.28 * clamp01(0.5 - cell.cy * 0.5) + 0.08 * sv(seed, i, 20));
    const v = clamp01((t - lag) / Math.max(0.05, life - lag));
    const e = easeOut(v);
    const out = (cell.cx + (sv(seed, i, 21) - 0.5) * 0.6) * 0.22;
    return {
      dx: out * r * e,
      dy: r * (0.28 + 0.22 * sv(seed, i, 22)) * e * e,
      rot: (sv(seed, i, 23) - 0.5) * 0.5 * e,
      sx: 1 - 0.1 * e, sy: 1 - 0.38 * e,
      alpha: 1 - 0.9 * smooth(0.62, 1, v),
      shear: 0,
    };
  },
});

/** GIVE WAY — the seam drops INWARD and down with dust; top rows a beat
 *  behind the bottom (the pre-crack already spoke over the dwell). */
registerDissolveMotion('giveway', {
  cut: 'strata', pieces: [5, 8], life: 0.8, fling: 0.8, gravity: 300, spin: 1.6,
  debris: 'debris_rubble', voice: 'dust',
  pose: ({ seed, i, t, life, r, cell, spec }) => {
    const lag = life * (0.22 * clamp01(0.5 - cell.cy * 0.5) + 0.06 * sv(seed, i, 30));
    const tt = Math.max(0, t - lag);
    const v = clamp01(tt / Math.max(0.05, life - lag));
    const fall = Math.min(r * (0.45 + 0.35 * sv(seed, i, 31)), 0.5 * spec.gravity * tt * tt);
    return {
      dx: -cell.cx * r * 0.18 * easeOut(v),
      dy: fall,
      rot: (sv(seed, i, 32) - 0.5) * 0.7 * v,
      sx: 1 - 0.08 * v, sy: 1 - 0.3 * v * v,
      alpha: 1 - 0.9 * smooth(0.66, 1, v),
      shear: 0,
    };
  },
});

/** SHATTER — radial FLING from the strike + spin + a fake-2D fall; the
 *  pieces decelerate, skitter and stop. */
registerDissolveMotion('shatter', {
  cut: 'shards', pieces: [7, 12], life: 0.75, fling: 3.2, gravity: 260, spin: 6,
  debris: 'debris_rubble', voice: 'dust',
  pose: ({ seed, i, t, life, r, cell, strike, spec }) => {
    const v = clamp01(t / life);
    const ang = Math.atan2(cell.cy - strike.y, cell.cx - strike.x) + (sv(seed, i, 40) - 0.5) * 0.5;
    const speed = spec.fling * r * (0.55 + 0.9 * sv(seed, i, 41));
    const kf = 3.4; // friction — the skitter dies out
    const travel = speed * (1 - Math.exp(-kf * t)) / kf;
    const sag = Math.min(r * 0.45 * (0.6 + sv(seed, i, 42)), 0.5 * spec.gravity * t * t);
    const spin = spec.spin * (sv(seed, i, 43) - 0.5) * 2 * (1 - Math.exp(-kf * t)) / kf;
    return {
      dx: Math.cos(ang) * travel,
      dy: Math.sin(ang) * travel + sag,
      rot: spin,
      sx: 1 - 0.15 * v, sy: 1 - 0.15 * v,
      alpha: 1 - 0.92 * smooth(0.62, 1, v),
      shear: 0,
    };
  },
});

/** BURST — an outward PUFF: lobes fly a short way, swell, and are gone. */
registerDissolveMotion('burst', {
  cut: 'lobes', pieces: [3, 4], life: 0.55, fling: 1.4, gravity: 120, spin: 2.5,
  debris: 'debris_pulp', voice: 'wetpop',
  pose: ({ seed, i, t, life, r, cell, spec }) => {
    const v = clamp01(t / life);
    const e = easeOut(v);
    const ang = Math.atan2(cell.cy, cell.cx) + (sv(seed, i, 50) - 0.5) * 0.4;
    const reach = spec.fling * r * 0.42 * (0.7 + 0.6 * sv(seed, i, 51));
    return {
      dx: Math.cos(ang) * reach * e,
      dy: Math.sin(ang) * reach * e - r * 0.14 * e + 0.5 * spec.gravity * t * t * 0.4,
      rot: (sv(seed, i, 52) - 0.5) * spec.spin * 0.4 * e,
      sx: 1 + 0.3 * e, sy: 1 + 0.3 * e,
      alpha: (1 - v) * (1 - v),
      shear: 0,
    };
  },
});

/** DISSOLVE — no cut; the body thins under a sideways heat-lean and lifts a
 *  hair (the mirageGhost law) — light leaves no dust. */
registerDissolveMotion('dissolve', {
  cut: 'none', pieces: [1, 1], life: 0.85, fling: 0, gravity: 0, spin: 0,
  debris: false, voice: false, haze: 1,
  pose: ({ seed, t, life, r }) => {
    const v = clamp01(t / life);
    return {
      dx: 0,
      dy: -r * 0.12 * v,
      rot: 0,
      sx: 1 - 0.14 * v, sy: 1 - 0.05 * v,
      alpha: Math.pow(1 - v, 1.25),
      shear: 0.05 + Math.sin(t * 6 + seed * 0.37) * 0.12 * (1 - v * 0.5),
    };
  },
});

// --- THE MATERIAL DEFAULTS (the MATERIAL_NATURE idiom) ---------------------

/** A kind names only its material (or its motion) and inherits the rest.
 *  `motion` here is the material's DEFAULT motion (a row's own wins). */
export const DISSOLVE_MATERIALS: Record<string, Partial<DissolveSpec> & { motion: DissolveMotionId }> = {
  ceramic: { motion: 'shatter', cut: 'shards', pieces: [7, 11], debris: 'debris_clay', voice: 'dust' },
  glass:   { motion: 'shatter', cut: 'shards', pieces: [8, 13], fling: 3.6, debris: 'debris_glass', voice: 'sparkle' },
  crystal: { motion: 'shatter', cut: 'facets', pieces: [8, 12], fling: 2.8, debris: 'debris_glass', voice: 'sparkle' },
  ice:     { motion: 'shatter', cut: 'shards', pieces: [7, 11], fling: 3.0, debris: 'debris_rime', voice: 'sparkle' },
  stone:   { motion: 'crumble', cut: 'strata', debris: 'debris_rubble', voice: 'dust' },
  earth:   { motion: 'crumble', cut: 'strata', debris: 'debris_rubble', voice: 'dust' },
  bone:    { motion: 'crumble', cut: 'strata', debris: 'debris_rubble', voice: 'dust' },
  salt:    { motion: 'crumble', cut: 'facets', debris: 'debris_rubble', voice: 'dust' },
  wood:    { motion: 'giveway', cut: 'strata', debris: 'debris_splinters', voice: 'dust' },
  pod:     { motion: 'burst', cut: 'lobes', debris: 'debris_pulp', voice: 'wetpop' },
  light:   { motion: 'dissolve', cut: 'none', debris: false, voice: false, haze: 1 },
};

/** Back-compat alias the charter names (`DISSOLVE_DEFAULTS[material]`). */
export const DISSOLVE_DEFAULTS = DISSOLVE_MATERIALS;

// --- THE RESOLVER -----------------------------------------------------------

/** Fold a row through its material + motion defaults to a full spec. Returns
 *  null for an absent row, and for a row whose motion is unregistered (an
 *  unknown motion is a data error — the probe census names it; the engine
 *  simply plays no motion, the debris/flash laws still land through the
 *  classic pop). */
export function resolveDissolve(row: DissolveSpec | undefined | null): ResolvedDissolve | null {
  if (!row) return null;
  const mat = row.material ? DISSOLVE_MATERIALS[row.material] : undefined;
  const motionId = row.motion ?? mat?.motion;
  if (!motionId) return null;
  const mo = MOTIONS[motionId];
  if (!mo) return null;
  const B = DISSOLVE_CFG.base;
  const pick = <K extends keyof DissolveSpec>(k: K): DissolveSpec[K] | undefined =>
    row[k] !== undefined ? row[k] : mat && mat[k] !== undefined ? mat[k] : undefined;
  return {
    motion: motionId,
    material: row.material ?? null,
    cut: pick('cut') ?? mo.cut,
    pieces: pick('pieces') ?? mo.pieces ?? B.pieces,
    life: pick('life') ?? mo.life ?? B.life,
    fling: pick('fling') ?? mo.fling ?? B.fling,
    gravity: pick('gravity') ?? mo.gravity ?? B.gravity,
    spin: pick('spin') ?? mo.spin ?? B.spin,
    debris: pick('debris') ?? mo.debris,
    debrisRadius: pick('debrisRadius') ?? B.debrisRadius,
    fade: pick('fade') ?? B.fade,
    voice: pick('voice') ?? mo.voice,
    haze: pick('haze') ?? mo.haze ?? B.haze,
    preCrack: pick('preCrack') ?? B.preCrack,
    scope: pick('scope') ?? B.scope,
  };
}

/** THE ONE READ every consumer makes: the folded spec for a doodad kind
 *  (DoodadRule.dissolve), null for kinds that break the classic way. */
export function dissolveFor(kind: DoodadKind): ResolvedDissolve | null {
  return resolveDissolve(doodadRuleOf(kind).dissolve);
}

// --- THE SEED + THE PURE READS ---------------------------------------------

/** THE POSITION HASH — the break's seed: pure f(rounded seat, kind), so
 *  every seat and every resume cut and fling the same pieces. */
export function dissolveSeedOf(x: number, y: number, kind: string): number {
  let h = (Math.imul(Math.round(x * 4), 374761393) ^ Math.imul(Math.round(y * 4), 668265263)) | 0;
  for (let i = 0; i < kind.length; i++) h = (Math.imul(h ^ kind.charCodeAt(i), 16777619)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Seeded integer inside a [lo, hi] band (inclusive). */
export function dissolveRollBand(seed: number, band: readonly [number, number], salt: number): number {
  const lo = Math.round(band[0]), hi = Math.round(band[1]);
  if (hi <= lo) return lo;
  return lo + Math.floor(sv(seed, 0, salt) * (hi - lo + 1));
}

/** Seeded real inside a [lo, hi] band. */
export function dissolveRollRange(seed: number, band: readonly [number, number], salt: number): number {
  return band[0] + sv(seed, 0, salt) * (band[1] - band[0]);
}

/** The strike point in BODY units, clamped inside DISSOLVE_CFG.strikeInset
 *  (a blow that landed past the rim still radiates from within the body). */
export function dissolveStrikeUnit(bodyX: number, bodyY: number, r: number,
  strikeX: number, strikeY: number): { x: number; y: number } {
  const rr = Math.max(1e-3, r);
  let ux = (strikeX - bodyX) / rr, uy = (strikeY - bodyY) / rr;
  const l = Math.hypot(ux, uy);
  const cap = DISSOLVE_CFG.strikeInset;
  if (l > cap) { ux *= cap / l; uy *= cap / l; }
  return { x: ux, y: uy };
}

/** The cells of one break — pure f(spec, seed, strike). The piece count is
 *  rolled inside the spec's band off the seed. */
export function dissolveCells(spec: ResolvedDissolve, seed: number,
  strike: { x: number; y: number }): DissolveCell[] {
  const cutter = CUTS[spec.cut] ?? CUTS.none;
  const n = Math.max(1, dissolveRollBand(seed, spec.pieces, 11));
  return cutter(seed, n, strike, spec.scope);
}

/** One fragment's pose at `t` seconds after the break — pure. */
export function dissolvePose(spec: ResolvedDissolve, cells: readonly DissolveCell[], i: number,
  seed: number, t: number, r: number, strike: { x: number; y: number }): FragmentPose {
  const mo = MOTIONS[spec.motion];
  if (!mo) return { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, alpha: 1, shear: 0 };
  return mo.pose({ seed, i, n: cells.length, t, life: spec.life, r, cell: cells[i], strike, spec });
}

/** THE SETTLE ramp — the debris' drawn alpha while the fragments fly:
 *  0 at the break, 1 by the end of DISSOLVE_CFG.settle's band of the life
 *  (pure f(t) — the renderer multiplies the debris' face by it). */
export function dissolveSettleAlpha(t: number, life: number): number {
  const [a, b] = DISSOLVE_CFG.settle;
  return smooth(a * life, b * life, t);
}

/** THE PRE-CRACK — the crack arms drawn over a dwell-gated breakable at
 *  `frac` of its dwell (0..1): seeded polylines in BODY units growing from
 *  the stand/strike point outward. Pure, so the probe pins determinism. */
export function dissolveCrackLines(seed: number, frac: number,
  from: { x: number; y: number }): { x: number; y: number }[][] {
  const C = DISSOLVE_CFG.crack;
  const arms = dissolveRollBand(seed, C.arms, 61);
  const lines: { x: number; y: number }[][] = [];
  const grow = clamp01(frac);
  for (let a = 0; a < arms; a++) {
    const pts: { x: number; y: number }[] = [{ x: from.x, y: from.y }];
    let ang = (a / arms) * TAU + sv(seed, a, 62) * (TAU / arms);
    let x = from.x, y = from.y;
    // Each arm reaches its full span at grow = 1; segments appear in turn.
    const span = C.reach * (0.6 + 0.4 * sv(seed, a, 63));
    for (let s = 0; s < C.segs; s++) {
      const segStart = s / C.segs, segEnd = (s + 1) / C.segs;
      if (grow <= segStart) break;
      const part = clamp01((grow - segStart) / (segEnd - segStart));
      ang += (sv(seed, a * 7 + s, 64) - 0.5) * 1.1;
      const len = (span / C.segs) * part;
      x += Math.cos(ang) * len;
      y += Math.sin(ang) * len;
      const l = Math.hypot(x, y);
      if (l > 1.02) { x *= 1.02 / l; y *= 1.02 / l; }
      pts.push({ x, y });
    }
    if (pts.length > 1) lines.push(pts);
  }
  return lines;
}
