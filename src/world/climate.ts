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
import type { LevelEnvelope } from '../engine/presence';
import { NativeClimate, captureClimateSourceData, type NativeClimateSource } from './climateCore';

// --- layers -----------------------------------------------------------------

/** One additive contribution to an axis. All fields are data; add a layer kind
 *  by extending this union + one case in `layerValue`. */
export type ClimateLayer =
  /** Smooth 2-lattice value noise, centered: contributes ±amp. `cell` is the
   *  feature size in node units; `salt` decorrelates two noise layers on the
   *  same axis. */
  | { kind: 'noise'; cell: number; amp: number; salt?: number }
  /** RIDGED noise: (1 − |2n − 1|)², 0..1 — sharp crests along the noise
   *  lattice's mid-lines (mountain-range spines, not blobs). Contributes
   *  0..+amp. The elevation axis' backbone. */
  | { kind: 'ridge'; cell: number; amp: number; salt?: number }
  /** Radial gradient from a NAMED anchor (default: the world origin, home):
   *  0 inside `innerRadius`, rising to +amp over `span`. The "danger
   *  geography" tie — the same shape as the level field's floor. An anchor
   *  that is not (yet) installed reads FAR — the layer contributes its full
   *  amp — so an axis like 'civic' safely means "no capital anywhere" until
   *  the pole is derived at world boot, instead of misfiring at (0,0). */
  | { kind: 'radial'; innerRadius: number; span: number; amp: number; anchor?: string }
  /** Radial DEPRESSION around a named anchor: subtracts up to `amp` at the
   *  anchor, fading to 0 over `span` — how a SECOND heart of civilization
   *  tames its surroundings without moving home's own gradient (the capital
   *  pole rides this on wildness). Missing anchor = no contribution. */
  | { kind: 'basin'; anchor: string; span: number; amp: number; innerRadius?: number }
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
    // THE CAPITAL TAMES ITS COUNTRY: a second heart of civilization presses
    // wildness back down around the capital pole (world/civics.ts derives it
    // per seed; the sim installs the 'capital' anchor at boot). Sized against
    // the radial above: at the pole the far-wilds ~0.97 dips to ~0 — so the
    // settled biomes' own wildness affinities (metropolis ≤~0.4, farmland
    // ≤~0.58, downs ≤~0.82) LIVE there and stage city → crofts → sheep downs
    // → wilds outward with no extra machinery: at span 850 the city rows die
    // ~365 out, crops ~520, downs ~700 — the capital ring's worked country
    // gets real acreage before the wilds resume. A near-rolled pole's basin
    // can overlap home's calm and read as one settled vale; a far roll
    // leaves a wild march between — deliberate per-seed world character. No
    // anchor (menus, pole-less contexts) = no basin: the old field,
    // byte-identical.
    { kind: 'basin', anchor: 'capital', span: 850, amp: 1.0 },
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
registerClimateAxis({
  // PURE distance-from-home, noise-free BY DESIGN: wildness carries ±0.15
  // noise with ~800-unit features, so a whole world's near-home readings
  // shift together — any absolute wildness threshold is seed-shifty. The
  // hearth axis is the deterministic geometry lever for anything that must
  // hold at home in EVERY world (the home-shire field tilt rides it; future
  // near-home event gates can too). 0 at the town, 1 by ~640 map units.
  id: 'hearth', label: 'Hearth', base: 0,
  layers: [
    { kind: 'radial', innerRadius: 0, span: 640, amp: 1 },
  ],
});
registerClimateAxis({
  // THE LAND'S VERTICAL TRUTH — the relief fabric's backbone (world/relief.ts
  // traces rivers DOWN this field; mountain biomes claim its heights, marsh
  // its hollows). Seam-free and lazy like every axis: ridged crests give
  // ranges their spines, the coastal layer pulls the land DOWN toward every
  // shore (rivers seek the sea for free), and the noise octaves break the
  // slopes. Sampled hot via climateAxisAt — keep this stack lean.
  id: 'elevation', label: 'Elevation', base: 0.52,
  layers: [
    { kind: 'noise', cell: 1700, amp: 0.3, salt: 0xe1e1 },
    { kind: 'noise', cell: 560, amp: 0.1, salt: 0xe1e2 },
    { kind: 'ridge', cell: 980, amp: 0.26, salt: 0xe1e3 },
    { kind: 'coastal', probe: 700, amp: -0.55 },
  ],
});
registerClimateAxis({
  // Distance-from-the-CAPITAL: hearth's civic twin — 0 at the capital pole
  // (world/civics.ts derives it per seed; the sim installs the anchor at
  // boot), 1 by ~640 units out, and 1 EVERYWHERE while no pole is installed
  // (an absent anchor reads far, so the capital field bands go inert instead
  // of misfiring at the world origin). Noise-free for hearth's reason: band
  // radii must be true geometry in every world.
  id: 'civic', label: 'Civic', base: 0,
  layers: [
    { kind: 'radial', anchor: 'capital', innerRadius: 0, span: 640, amp: 1 },
  ],
});

/** Structural tunables. `origin` anchors un-named radial layers (home = the
 *  town's canonical map coord — the world grows outward from it); `anchors`
 *  are NAMED points radial/basin layers key on by `anchor` (the capital pole
 *  installs 'capital' at world boot). */
export const CLIMATE_CFG = {
  origin: { x: 0, y: 0 } as MapCoord,
  anchors: {} as Record<string, MapCoord | null>,
};

/** Downstream caches keyed on climate readings (the biome field's cell-pick
 *  memo) register here; any origin/anchor change flushes them. Boot-time
 *  events only — the cost is a rare re-fill, the win is that a re-anchored
 *  world can never serve picks computed under the old geometry. */
const invalidationListeners: (() => void)[] = [];
export function registerClimateInvalidation(cb: () => void): void {
  invalidationListeners.push(cb);
}
function invalidateClimate(): void {
  classicClimate.resetHome(); // the home landmass derives from the origin — re-resolve
  for (const cb of invalidationListeners) cb();
}

/** Anchor radial layers on home. Called once at boot by WorldSim with the
 *  town's STATIC canonical map coord (the level field's exact pattern) —
 *  static data, so host and clients agree without any replication. */
export function setClimateOrigin(c: MapCoord): void {
  CLIMATE_CFG.origin = { x: c.x, y: c.y };
  invalidateClimate();
}

/** Install (or clear) a NAMED anchor for radial/basin layers. Same law as the
 *  origin: derived from static/seed data only — never replicated, so host,
 *  clients and reloads agree by construction. */
export function setClimateAnchor(name: string, c: MapCoord | null): void {
  CLIMATE_CFG.anchors[name] = c ? { x: c.x, y: c.y } : null;
  invalidateClimate();
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

const classicClimate = new NativeClimate({ axes: CLIMATE_AXES, bands: CLIMATE_BANDS,
  dimensions: DIMENSION_CLIMATE, climate: CLIMATE_CFG, continentCellAt, continentSeedFrom });
export function climateAt(coord: MapCoord, fieldSeed: number, dimension = 'surface'): Record<string, number> {
  return classicClimate.at(coord, fieldSeed, dimension);
}
export function climateAxisAt(coord: MapCoord, fieldSeed: number, axisId: string, dimension = 'surface'): number {
  return classicClimate.axisAt(coord, fieldSeed, axisId, dimension);
}
export function climateEnvelope(axis: string, spec: ClimateSpec): LevelEnvelope { return classicClimate.envelope(axis, spec); }
export function climateAffinity(spec: Record<string, ClimateSpec> | undefined, climate: Record<string, number>): number {
  return classicClimate.affinity(spec, climate);
}
/** Capture HERE: only this owner can enumerate the actual private override registry. */
export function captureNativeClimateSource(): NativeClimateSource {
  return captureClimateSourceData({ axes: CLIMATE_AXES, bands: CLIMATE_BANDS,
    dimensions: DIMENSION_CLIMATE, climate: CLIMATE_CFG });
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
