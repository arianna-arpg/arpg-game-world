// ---------------------------------------------------------------------------
// THE BLEND FABRIC — two tilesets sharing one zone, as DATA.
//
// Where a MELD (data/melds.ts) dresses an exit-facing EDGE BAND with a
// neighbor's kit, a BLEND is the whole-zone generalization: a zone minted
// from tileset A carries a partner tileset B and a WEIGHT FIELD w(x,y) in
// 0..1 — 0 reads fully as A, 1 fully as B, the run between them a true
// transition. Every consumer samples the SAME compiled field:
//
//  - the GROUND bake mixes the two themes' floors/palettes/walls per
//    mottle cell (render/vis/ground.ts) — rasterized blending;
//  - the LAYOUT interleaves both kits: composed rows are tagged with the
//    side they belong to, and findSpot dither-gates each siting against
//    w at the candidate (engine/levelgen.ts) — tessellated scatter;
//  - the PACK table merges both rosters by the partner's share (folded at
//    mint, so spawn plumbing downstream never changes);
//  - WHERE bands may reference the field by name (`where:{field:'blend'}`)
//    for authored set-pieces that belong to one end of the gradient.
//
// FIELD SHAPES are an open registry (axisX/axisY ramps for transition
// bands, radial for core/rim, pockets for jittered-Voronoi tessellation,
// noise for organic patchwork) — a new shape is one registerBlendField
// call. Every shape folds the same post-ops: domain WARP (organic
// boundaries), BAND remap (soften/harden the run), INVERT. All pure math
// off (arena, zone seed): deterministic across revisits, reloads, co-op
// clients, and the headless harnesses.
//
// No pair is hardcoded anywhere: tilesets/mints DECLARE partners as data
// (TilesetDef.blend, ZoneDef.blend), and this module only compiles what
// the data says. Pure leaf — imports types only; never the World.
// ---------------------------------------------------------------------------

import type { BlendFieldSpec, BlendSpec, PackSpec, StampSpec, ZoneTheme } from '../data/zones';

/** A compiled blend weight field: 0 = fully the BASE tileset, 1 = fully the
 *  PARTNER, sampled in arena coordinates. */
export type BlendSampler = (x: number, y: number) => number;

/** Everything a field shape may read — pure, no rng (determinism across the
 *  try-loop's samples and both co-op sides is the WHERE-band contract). */
export interface BlendFieldEnv {
  w: number;
  h: number;
  /** The zone's layout seed (0 for seedless zones — macro shape repeats
   *  across visits while the scatter inside reshuffles; accepted, exactly
   *  the gen-field 'noise' precedent). */
  seed: number;
}

export interface BlendFieldKind {
  /** Compile the RAW shape (pre warp/band/invert). */
  factory: (params: Record<string, unknown>, env: BlendFieldEnv) => BlendSampler;
  /** Nominal mean coverage of the raw shape (the pack-share default when the
   *  spec doesn't say). Absent = 0.5. */
  mean?: (params: Record<string, unknown>) => number;
}

const BLEND_FIELDS: Record<string, BlendFieldKind> = {};

export function registerBlendField(id: string, kind: BlendFieldKind): void {
  if (BLEND_FIELDS[id]) console.warn(`[blend] re-registering field '${id}' — overriding`);
  BLEND_FIELDS[id] = kind;
}

export function hasBlendField(id: string): boolean { return id in BLEND_FIELDS; }

/** Every registered field-shape id (the generation-QA harness sweeps them). */
export function blendFieldIds(): string[] { return Object.keys(BLEND_FIELDS); }

/** Integer hash (the biome-field family) — deterministic across host/client/
 *  reload, lattice-free: the dither gate and the pocket tessellation ride it. */
function hashCell(a: number, b: number, seed: number): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (a | 0), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (b | 0), 0xc2b2ae35) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f) >>> 0; h ^= h >>> 15;
  return h >>> 0;
}

/** 0..1 dither at a WORLD position — the acceptance roll the layout gate and
 *  the speckle vocab pick use (pure: never draws from the layout rng, so a
 *  gated entry keeps every other entry's stream byte-identical). */
export function blendDither(x: number, y: number, seed: number): number {
  return hashCell(Math.round(x), Math.round(y), seed) / 0x100000000;
}

/** Smooth value noise in 0..1 (bilinear over hashed lattice corners) — the
 *  warp source and the 'noise' shape. Mirrors genkit's valueNoise2 so the
 *  fabric stays a pure leaf (no engine import from the render side). */
export function blendNoise(x: number, y: number, scale: number, seed: number): number {
  const fx = x / scale, fy = y / scale;
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const tx = fx - x0, ty = fy - y0;
  const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const c00 = hashCell(x0, y0, seed) / 0x100000000;
  const c10 = hashCell(x0 + 1, y0, seed) / 0x100000000;
  const c01 = hashCell(x0, y0 + 1, seed) / 0x100000000;
  const c11 = hashCell(x0 + 1, y0 + 1, seed) / 0x100000000;
  const a = c00 + (c10 - c00) * sx;
  const b = c01 + (c11 - c01) * sx;
  return a + (b - a) * sy;
}

const num = (params: Record<string, unknown>, key: string, dflt: number): number => {
  const v = params[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : dflt;
};

/** Modular defaults — every tunable the shapes/post-ops fall back to. */
export const BLEND_CFG = {
  /** Domain-warp defaults: amplitude (world units) + noise feature size. */
  warpAmp: 90, warpScale: 340,
  /** 'pockets' tessellation cell span + jitter (the biome-field idiom). */
  pocketSpan: 320, pocketJitter: 0.45,
  /** 'noise' patchwork feature size. */
  noiseScale: 520,
  /** Soft edge (fraction of the pocket span) pockets feather across. */
  pocketFeather: 0.22,
} as const;

// --- THE STOCK SHAPES ---------------------------------------------------------

/** West→east ramp: 0 before `from`, 1 past `to` (arena-width fractions,
 *  default the whole span) — THE transition band. */
registerBlendField('axisX', {
  factory: (params, env) => {
    const from = num(params, 'from', 0) * env.w, to = num(params, 'to', 1) * env.w;
    const span = Math.max(1, to - from);
    return (x) => Math.max(0, Math.min(1, (x - from) / span));
  },
  mean: (params) => 1 - (num(params, 'from', 0) + num(params, 'to', 1)) / 2,
});

/** North→south ramp (axisX turned). */
registerBlendField('axisY', {
  factory: (params, env) => {
    const from = num(params, 'from', 0) * env.h, to = num(params, 'to', 1) * env.h;
    const span = Math.max(1, to - from);
    return (_x, y) => Math.max(0, Math.min(1, (y - from) / span));
  },
  mean: (params) => 1 - (num(params, 'from', 0) + num(params, 'to', 1)) / 2,
});

/** 0 at the arena center → 1 on the border (rect-normalized max metric, the
 *  gen-field 'radial' contract) — partner claims the rim; invert for the core. */
registerBlendField('radial', {
  factory: (params, env) => {
    const from = num(params, 'from', 0), to = num(params, 'to', 1);
    const span = Math.max(0.001, to - from);
    const cx = env.w / 2, cy = env.h / 2;
    return (x, y) => {
      const d = Math.max(Math.abs(x - cx) / Math.max(1, cx), Math.abs(y - cy) / Math.max(1, cy));
      return Math.max(0, Math.min(1, (d - from) / span));
    };
  },
});

/** Jittered-Voronoi TESSELLATION: each cell wholly belongs to one side
 *  (`coverage` = partner share of cells), edges feathered then warped —
 *  interleaved patches of foreign country, the Minecraft-ish read.
 *  params: span (cell size, default BLEND_CFG.pocketSpan), coverage (0..1,
 *  default 0.5), feather (edge softness as a span fraction). */
registerBlendField('pockets', {
  factory: (params, env) => {
    const span = Math.max(40, num(params, 'span', BLEND_CFG.pocketSpan));
    const coverage = Math.max(0, Math.min(1, num(params, 'coverage', 0.5)));
    const feather = Math.max(0.01, num(params, 'feather', BLEND_CFG.pocketFeather)) * span;
    const jit = BLEND_CFG.pocketJitter;
    const seed = env.seed;
    return (x, y) => {
      // Nearest + runner-up jittered seed points (3×3 neighborhood): the cell
      // pick decides the side, the margin to the runner-up feathers the edge.
      const cx = Math.floor(x / span), cy = Math.floor(y / span);
      let bd = Infinity, b2 = Infinity, bh = 0, b2h = 0;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const gx = cx + dx, gy = cy + dy;
          const h = hashCell(gx, gy, seed);
          const px = (gx + 0.5 + (((h & 0xffff) / 0xffff) - 0.5) * jit) * span;
          const py = (gy + 0.5 + ((((h >>> 16) & 0xffff) / 0xffff) - 0.5) * jit) * span;
          const d = Math.hypot(px - x, py - y);
          if (d < bd) { b2 = bd; b2h = bh; bd = d; bh = h; }
          else if (d < b2) { b2 = d; b2h = h; }
        }
      }
      const side = (h: number): number => ((h >>> 8) / 0x1000000 % 1) < coverage ? 1 : 0;
      const s1 = side(bh), s2 = side(b2h);
      if (s1 === s2) return s1;
      // Edge zone: lerp toward the neighbor across the feather margin.
      const t = Math.max(0, Math.min(1, (b2 - bd) / (2 * feather)));
      return s1 + (s2 - s1) * (0.5 - t * 0.5);
    };
  },
  mean: (params) => Math.max(0, Math.min(1, num(params, 'coverage', 0.5))),
});

/** Organic PATCHWORK: smooth value noise thresholded around `coverage` —
 *  drifting lobes of the partner country. params: scale (feature size),
 *  coverage (partner share, default 0.5), soft (transition width in noise
 *  units, default 0.18). */
registerBlendField('noise', {
  factory: (params, env) => {
    const scale = Math.max(60, num(params, 'scale', BLEND_CFG.noiseScale));
    const coverage = Math.max(0, Math.min(1, num(params, 'coverage', 0.5)));
    const soft = Math.max(0.02, num(params, 'soft', 0.18));
    const seed = env.seed ^ 0x51ed;
    // Threshold sits where the noise CDF ≈ coverage (value noise clusters
    // near 0.5; a linear map is close enough for authoring).
    const th = 1 - coverage;
    return (x, y) => {
      const n = blendNoise(x, y, scale, seed);
      return Math.max(0, Math.min(1, (n - (th - soft / 2)) / soft));
    };
  },
  mean: (params) => Math.max(0, Math.min(1, num(params, 'coverage', 0.5))),
});

// --- COMPILE ------------------------------------------------------------------

const unknownWarned = new Set<string>();

/** Compile a spec into the one sampler every consumer shares. Unknown kinds
 *  warn once and read as 0 (fully the base tileset — a safe no-op). */
export function compileBlendField(
  spec: BlendFieldSpec, arena: { w: number; h: number }, seed: number,
): BlendSampler {
  const kind = BLEND_FIELDS[spec.kind];
  if (!kind) {
    if (!unknownWarned.has(spec.kind)) {
      unknownWarned.add(spec.kind);
      console.warn(`[blend] unregistered blend field '${spec.kind}' — reading as base tileset`);
    }
    return () => 0;
  }
  const env: BlendFieldEnv = { w: arena.w, h: arena.h, seed: seed >>> 0 };
  const raw = kind.factory(spec.params ?? {}, env);
  // DOMAIN WARP: wobble the sample coordinate through low-freq noise so every
  // shape's boundary runs organic instead of ruler-straight. warp:{amp:0}
  // disables; absent = the modular default.
  const amp = spec.warp?.amp ?? BLEND_CFG.warpAmp;
  const wScale = spec.warp?.scale ?? BLEND_CFG.warpScale;
  const wSeed = (env.seed ^ 0x77a3) >>> 0;
  const warped: BlendSampler = amp > 0
    ? (x, y) => raw(
      x + (blendNoise(x, y, wScale, wSeed) - 0.5) * 2 * amp,
      y + (blendNoise(x + 4096, y - 4096, wScale, wSeed) - 0.5) * 2 * amp)
    : raw;
  // BAND remap: re-run the shape's 0..1 through [lo, hi] (harden a ramp into
  // a front line, or soften a tessellation's plateaus).
  const band = spec.band;
  const banded: BlendSampler = band
    ? (x, y) => {
      const span = Math.max(0.001, band[1] - band[0]);
      return Math.max(0, Math.min(1, (warped(x, y) - band[0]) / span));
    }
    : warped;
  return spec.invert ? (x, y) => 1 - banded(x, y) : banded;
}

/** The spec's nominal partner share in 0..1 — the pack-merge default. */
export function blendMean(spec: BlendSpec): number {
  const m = spec.packs ?? BLEND_FIELDS[spec.field.kind]?.mean?.(spec.field.params ?? {}) ?? 0.5;
  const v = spec.field.invert ? 1 - m : m;
  return Math.max(0, Math.min(1, v));
}

// --- MINT-TIME COMPOSITION ------------------------------------------------------
// The two folds a mint applies when a blend resolves. Both are pure data→data
// (no rng): revisits, saves, co-op clients, and the headless harnesses all
// replay the identical composition off the persisted ZoneDef.blend.

/** The structural slice of a tileset the composition reads (kept structural so
 *  this leaf never imports the tileset registry). */
export interface BlendPartnerKit {
  theme: ZoneTheme;
  layout: StampSpec[];
  common?: StampSpec[];
  packs: PackSpec;
}

/** Interleave the two kits: base rows tagged 'base', the partner's common +
 *  layout rows tagged 'with' — every layout generator then scatters the union,
 *  and findSpot's dither gate sorts the sides spatially. Rows that already
 *  declare a side (incl. 'any' opt-outs) keep it. */
export function composeBlendLayout(baseRows: StampSpec[], partner: BlendPartnerKit): StampSpec[] {
  const tag = (rows: StampSpec[], side: 'base' | 'with'): StampSpec[] =>
    rows.map(r => r.blend ? r : { ...r, blend: side });
  return [
    ...tag(baseRows, 'base'),
    ...tag([...(partner.common ?? []), ...partner.layout], 'with'),
  ];
}

/** Merge the partner's pack table into the base's at `share` (0..1 of total
 *  weight). Count/size/archetypes stay the base tileset's — the partner adds
 *  VARIETY, not density. Presence envelopes ride each entry untouched. */
export function mergeBlendPacks(base: PackSpec, partner: PackSpec, share: number): PackSpec {
  const s = Math.max(0, Math.min(0.95, share));
  if (s <= 0 || !partner.table.length) return base;
  const sum = (t: { weight: number }[]): number => t.reduce((a, e) => a + e.weight, 0);
  const baseSum = sum(base.table), partSum = sum(partner.table);
  if (baseSum <= 0 || partSum <= 0) return base;
  const scale = (s / (1 - s)) * (baseSum / partSum);
  return {
    ...base,
    table: [
      ...base.table,
      ...partner.table.map(e => ({ ...e, weight: e.weight * scale })),
    ],
  };
}
