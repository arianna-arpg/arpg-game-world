// ---------------------------------------------------------------------------
// CLIMATE — the world's macro-weather as composable scalar FIELDS (axes).
//
// The biome heat map's structural backbone: every axis (temperature, moisture,
// wildness, maritime…) is a named 0..1 field over node space, built from a
// stack of DATA layers — smooth value noise, a radial gradient from home, an
// ocean-adjacency probe, a per-landmass flavor bias, flat constants. Biomes
// declare AFFINITY envelopes over these axes (the presence-envelope math from
// engine/presence.ts, evaluated on axis values instead of levels), and the
// biome field multiplies seed weight × affinity per Voronoi cell — so deserts
// coalesce where it runs hot and dry, tundra claims the frigid distances,
// hazard biomes bloom in the deep wild, and a far continent reached by voyage
// carries its own hash-flavored signature (a scorched landmass, a drowned one).
//
// Dimensions register their own axis OVERRIDES (the Underworld runs hot and
// arid), so one machinery drives the surface heat map, every parallel
// worldmass, and any future plane — adding an axis, a band, a biome affinity,
// or a dimension override is pure data. Everything is deterministic per
// (coord, seed): same world on every machine, every reload.
//
// Pure leaf: imports only the coord type, the continent field (a sibling
// leaf), and engine/presence (itself a zero-import leaf, shared by design).
// ---------------------------------------------------------------------------

import type { MapCoord } from './coords';
import { continentCellAt, continentSeedFrom } from './continents';
import { presenceMul, type LevelEnvelope } from '../engine/presence';

// --- layers -----------------------------------------------------------------

/** One additive contribution to an axis. All fields are data; add a layer kind
 *  by extending this union + one case in `layerValue`. */
export type ClimateLayer =
  /** Smooth 2-lattice value noise, centered: contributes ±amp. `cell` is the
   *  feature size in node units; `salt` decorrelates two noise layers on the
   *  same axis. */
  | { kind: 'noise'; cell: number; amp: number; salt?: number }
  /** Radial gradient from the world origin (home): 0 inside `innerRadius`,
   *  rising to +amp over `span`. The "danger geography" tie — the same shape
   *  as the level field's floor. */
  | { kind: 'radial'; innerRadius: number; span: number; amp: number }
  /** Ocean adjacency: probes the continent field around the point; contributes
   *  up to +amp when the sea is near (1 when ON open water — islands read as
   *  fully maritime). `probe` is the sampling reach in node units. */
  | { kind: 'coastal'; probe: number; amp: number }
  /** Per-LANDMASS flavor: a stable hash bias in ±spread for the continent the
   *  point belongs to. The HOME landmass is pinned to 0 so the starting
   *  continent stays the baseline; every voyage landfall inherits a coherent
   *  signature instead of the same mix everywhere. */
  | { kind: 'landmass'; spread: number }
  /** A flat push — dimension overrides mostly ride this. */
  | { kind: 'const'; value: number };

export interface ClimateAxisDef {
  id: string;
  label: string;
  /** Resting value before layers stack (clamped 0..1 after). */
  base: number;
  layers: ClimateLayer[];
}

/** The AXES registry — open; packages/dimensions may add their own axes
 *  (a 'corruption' axis an event pumps, a 'depth' axis for an abyss plane). */
export const CLIMATE_AXES: Record<string, ClimateAxisDef> = {};

export function registerClimateAxis(def: ClimateAxisDef, overwrite = false): void {
  if (!overwrite && CLIMATE_AXES[def.id] !== undefined) return;
  CLIMATE_AXES[def.id] = def;
}

// The default surface axes. Feature sizes sit an octave above the biome
// Voronoi (cellSpan 260) so one climate region spans several biome blobs —
// the heat map reads as REGIONS of desert, not desert confetti.
registerClimateAxis({
  id: 'temperature', label: 'Temperature', base: 0.5,
  layers: [
    { kind: 'noise', cell: 1500, amp: 0.32 },
    { kind: 'noise', cell: 520, amp: 0.1, salt: 0x7e39 },
    { kind: 'landmass', spread: 0.28 },
  ],
});
registerClimateAxis({
  id: 'moisture', label: 'Moisture', base: 0.5,
  layers: [
    { kind: 'noise', cell: 1200, amp: 0.3, salt: 0x11c1 },
    { kind: 'noise', cell: 430, amp: 0.08, salt: 0x2f77 },
    { kind: 'coastal', probe: 700, amp: 0.22 },
    { kind: 'landmass', spread: 0.22 },
  ],
});
registerClimateAxis({
  // How far from the SETTLED world a point sits — the exotic/hazard gradient.
  // Near home it reads ~base (settled); it saturates in the far wilds, so
  // flesh/crystal/volcanic country blooms with distance and a far voyage
  // landfall skews strange. The radial twin of the level field.
  id: 'wildness', label: 'Wildness', base: 0.12,
  layers: [
    { kind: 'radial', innerRadius: 100, span: 520, amp: 0.85 },
    { kind: 'noise', cell: 800, amp: 0.15, salt: 0x5abd },
  ],
});
registerClimateAxis({
  // Ocean adjacency as its own axis, so coastal biomes (beach/isle) hug real
  // shores instead of rolling anywhere the flat weights allowed.
  id: 'maritime', label: 'Maritime', base: 0,
  layers: [
    { kind: 'coastal', probe: 620, amp: 1 },
  ],
});

/** Structural tunables. `origin` anchors radial layers (home = the town's
 *  canonical map coord — the world grows outward from it). */
export const CLIMATE_CFG = { origin: { x: 0, y: 0 } as MapCoord };

/** Anchor radial layers on home. Called once at boot by WorldSim with the
 *  town's STATIC canonical map coord (the level field's exact pattern) —
 *  static data, so host and clients agree without any replication. */
export function setClimateOrigin(c: MapCoord): void {
  CLIMATE_CFG.origin = { x: c.x, y: c.y };
}

// --- bands ------------------------------------------------------------------

/** What a biome affinity carries per axis: an inline envelope over the axis'
 *  0..1 value, or the name of a registered band for that axis. */
export type ClimateSpec = string | LevelEnvelope;

/** Named affinity bands PER AXIS — the shared climate vocabulary ('desert is
 *  hot + arid' reads at a glance and retunes in one place). Open registry. */
export const CLIMATE_BANDS: Record<string, Record<string, LevelEnvelope>> = {
  temperature: {
    frigid: { to: 0.18, fadeOut: 0.14 },
    cold: { to: 0.35, fadeOut: 0.15 },
    mild: { from: 0.25, fadeIn: 0.15, to: 0.7, fadeOut: 0.15 },
    warm: { from: 0.5, fadeIn: 0.15 },
    hot: { from: 0.62, fadeIn: 0.14 },
    scorching: { from: 0.75, fadeIn: 0.12 },
  },
  moisture: {
    arid: { to: 0.25, fadeOut: 0.12 },
    dry: { to: 0.45, fadeOut: 0.15 },
    damp: { from: 0.4, fadeIn: 0.18 },
    wet: { from: 0.6, fadeIn: 0.15 },
    drowned: { from: 0.8, fadeIn: 0.1 },
  },
  wildness: {
    settled: { to: 0.3, fadeOut: 0.18 },
    frontier: { from: 0.12, fadeIn: 0.12, to: 0.72, fadeOut: 0.18 },
    deepwild: { from: 0.55, fadeIn: 0.18 },
  },
  maritime: {
    inland: { to: 0.12, fadeOut: 0.15 },
    shorebound: { from: 0.4, fadeIn: 0.25 },
  },
};

export function registerClimateBand(
  axis: string, name: string, env: LevelEnvelope, overwrite = false,
): void {
  const bands = (CLIMATE_BANDS[axis] ??= {});
  if (!overwrite && bands[name] !== undefined) return;
  bands[name] = env;
}

// --- dimension overrides ------------------------------------------------------

export interface DimensionAxisOverride {
  /** Replaces the axis' resting value in this dimension. */
  base?: number;
  /** Replaces the axis' layer stack in this dimension (omit = keep surface layers). */
  layers?: ClimateLayer[];
}

/** Per-dimension axis overrides, registered by dimensions.ts at boot (kept as
 *  a registry HERE so this leaf never imports the dimension registry). */
const DIMENSION_CLIMATE: Record<string, Record<string, DimensionAxisOverride>> = {};

export function registerDimensionClimate(
  dimId: string, axes: Record<string, DimensionAxisOverride>,
): void {
  DIMENSION_CLIMATE[dimId] = { ...DIMENSION_CLIMATE[dimId], ...axes };
}

export function dimensionClimateOf(dimId: string): Record<string, DimensionAxisOverride> | undefined {
  return DIMENSION_CLIMATE[dimId];
}

// --- sampling ----------------------------------------------------------------

/** Integer hash (Rng's family) → deterministic across host / client / reload. */
function hashCell(a: number, b: number, seed: number): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (a | 0), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (b | 0), 0xc2b2ae35) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f) >>> 0; h ^= h >>> 15;
  return h >>> 0;
}

const hash01 = (x: number, y: number, seed: number): number => hashCell(x, y, seed) / 0x100000000;

/** Smooth (smoothstep-bilinear) value noise, 0..1 — the level field's idiom. */
function valueNoise(x: number, y: number, cell: number, seed: number): number {
  const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
  const fx = x / cell - gx, fy = y / cell - gy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash01(gx, gy, seed), b = hash01(gx + 1, gy, seed);
  const c = hash01(gx, gy + 1, seed), d = hash01(gx + 1, gy + 1, seed);
  return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
}

/** Stable per-axis salt so axes decorrelate on the shared world seed. */
function axisSalt(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 0x01000193) >>> 0;
  return h >>> 0;
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Continent info shared across an axis stack's layers (probed lazily, once). */
interface ContinentProbe {
  cell: { gx: number; gy: number; kind: 'land' | 'ocean' | 'bridge' } | null;
  coastal: number | null;
}

function layerValue(
  layer: ClimateLayer, coord: MapCoord, seed: number, salt: number, probe: ContinentProbe,
): number {
  switch (layer.kind) {
    case 'noise':
      return (valueNoise(coord.x, coord.y, layer.cell, (seed ^ salt ^ (layer.salt ?? 0)) >>> 0) - 0.5) * 2 * layer.amp;
    case 'radial': {
      const dx = coord.x - CLIMATE_CFG.origin.x, dy = coord.y - CLIMATE_CFG.origin.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      return clamp01((d - layer.innerRadius) / layer.span) * layer.amp;
    }
    case 'coastal': {
      if (probe.coastal === null) {
        const center = (probe.cell ??= continentCellAt(coord, seed));
        if (center.kind !== 'land') probe.coastal = 1;
        else {
          let sea = 0;
          for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2;
            const c = continentCellAt(
              { x: coord.x + Math.cos(a) * layer.probe, y: coord.y + Math.sin(a) * layer.probe }, seed,
            );
            if (c.kind !== 'land') sea++;
          }
          probe.coastal = clamp01((sea / 4) * 1.6);
        }
      }
      return probe.coastal * layer.amp;
    }
    case 'landmass': {
      const cell = (probe.cell ??= continentCellAt(coord, seed));
      // The home landmass (the origin's cell) is the unbiased baseline.
      if (cell.gx === 0 && cell.gy === 0) return 0;
      return (hash01(cell.gx, cell.gy, (seed ^ salt ^ 0x1a4d) >>> 0) - 0.5) * 2 * layer.spread;
    }
    case 'const':
      return layer.value;
  }
}

// The coastal/landmass layers read the CONTINENT field (seed derived once via
// continentSeedFrom); noise/radial layers use the biome-field seed directly.

/** Every axis sampled at a coordinate, honoring the dimension's overrides.
 *  Pure + deterministic per (coord, fieldSeed, dimension). */
export function climateAt(
  coord: MapCoord, fieldSeed: number, dimension = 'surface',
): Record<string, number> {
  const out: Record<string, number> = {};
  const overrides = DIMENSION_CLIMATE[dimension];
  const contSeed = continentSeedFrom(fieldSeed);
  const probe: ContinentProbe = { cell: null, coastal: null };
  for (const axis of Object.values(CLIMATE_AXES)) {
    const ov = overrides?.[axis.id];
    let v = ov?.base ?? axis.base;
    const salt = axisSalt(axis.id);
    for (const layer of ov?.layers ?? axis.layers) {
      v += layerValue(
        layer, coord,
        layer.kind === 'coastal' || layer.kind === 'landmass' ? contSeed : fieldSeed,
        salt, probe,
      );
    }
    out[axis.id] = clamp01(v);
  }
  return out;
}

// --- affinity ----------------------------------------------------------------

const warnedBands = new Set<string>();

/** Resolve a spec to its envelope (unknown band → warn once, always-on). */
export function climateEnvelope(axis: string, spec: ClimateSpec): LevelEnvelope {
  if (typeof spec !== 'string') return spec;
  const env = CLIMATE_BANDS[axis]?.[spec];
  if (env) return env;
  const key = `${axis}:${spec}`;
  if (!warnedBands.has(key)) {
    warnedBands.add(key);
    console.warn(`[climate] unknown band '${spec}' on axis '${axis}' — treating as always-on`);
  }
  return {};
}

/** The affinity multiplier for a climate-spec map at sampled axis values —
 *  envelopes multiply across axes (all conditions must hold). Unknown axes
 *  are ignored here; validateClimate flags them at boot. */
export function climateAffinity(
  spec: Record<string, ClimateSpec> | undefined, climate: Record<string, number>,
): number {
  if (!spec) return 1;
  let m = 1;
  for (const axis in spec) {
    const v = climate[axis];
    if (v === undefined) continue;
    m *= presenceMul(climateEnvelope(axis, spec[axis]), v);
    if (m <= 0) return 0;
  }
  return m;
}

// --- validation ---------------------------------------------------------------

/** Boot validator: every climate-spec map references registered axes and (for
 *  string specs) registered bands. `specs` = [ownerLabel, spec] pairs from the
 *  caller (biomes, voyage islands, …) so this leaf stays source-agnostic. */
export function validateClimateSpecs(
  specs: [string, Record<string, ClimateSpec> | undefined][],
): string[] {
  const bad: string[] = [];
  for (const [owner, spec] of specs) {
    if (!spec) continue;
    for (const [axis, s] of Object.entries(spec)) {
      if (!CLIMATE_AXES[axis]) bad.push(`${owner}: unknown axis '${axis}'`);
      else if (typeof s === 'string' && !CLIMATE_BANDS[axis]?.[s]) {
        bad.push(`${owner}: unknown band '${s}' on axis '${axis}'`);
      }
    }
  }
  return bad;
}
