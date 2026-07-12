// ---------------------------------------------------------------------------
// DIMENSIONS — parallel worldmasses the run can breach into. The SURFACE is
// dimension zero; delving cave-within-cave-within-cave breaches the
// UNDERWORLD: its own zone web, its own biome palette (rivers of flame,
// black fortresses, pandemonium sprawls — the hell recipes are the same
// registered layouts/landmarks pouring demon materials), flipped through on
// the world map as a TAB once discovered (the PoE Acts pattern). A dimension
// is a registry row: palette + level pressure + label — everything else rides
// the one generation infrastructure.
// ---------------------------------------------------------------------------

import type { MapCoord } from './coords';
import { BIOME_FIELD_CFG, fieldBiomePick } from './biomes';
import { registerDimensionClimate, type DimensionAxisOverride } from './climate';
import type { CourseSpec } from './courses';

/** How a dimension is ENTERED — data, not a bespoke function. 'cave_breach' =
 *  delving minDepth caves deep tears a breach whose realm gate mints the
 *  dimension's GATE ZONE (the Underworld's ladder). New entry KINDS are engine
 *  seams (a shrine rite, a stormfront, a death); WHICH dimension uses which —
 *  and its gate's name/biome/seed — is declared here, so a heaven or limbo
 *  layer is a registry row away. */
export interface DimensionEntry {
  kind: 'cave_breach' | (string & {});
  /** cave_breach: nesting depth at which the breach may tear (parent caves
   *  in a dimensioned world never re-breach — hell's caves are just caves). */
  minDepth?: number;
  /** The minted GATE ZONE — the one legal cross-dimension road. */
  gate: {
    /** Stable zone id (mint-once; the waypoint home). */
    id: string;
    name: string;
    /** The gate zone's tileset resolves from this biome's frontier pool. */
    biome: string;
    /** Gate seed = manifest.seed ^ seedSalt (deterministic across clients). */
    seedSalt: number;
  };
}

export interface DimensionDef {
  id: string;
  label: string;
  /** Map-tab accent + node fallback tint. */
  color: string;
  /** The dimension's biome palette (weighted) — what its frontiers mint.
   *  Undefined = the surface heat map rules (only the surface does this). */
  biomes?: { biome: string; weight: number }[];
  /** Flat level pressure on top of the radial field (hell runs hot). */
  levelBonus?: number;
  /** CLIMATE AXIS OVERRIDES for this dimension (world/climate.ts): replace an
   *  axis' resting value and/or layer stack, so the SAME biome-affinity
   *  machinery paints a structurally different world below (the Underworld
   *  runs hot and arid — volcanic country pools in its hottest reaches while
   *  gravelands keep the cooler marches). Registered into the climate leaf at
   *  registerDimension time; everything else rides the shared field pick. */
  climate?: Record<string, DimensionAxisOverride>;
  /** PER-DIMENSION EVENT TEMPO — this world-state's own frequency levers.
   *  densityMul scales every package overlay's ignition here (default 1);
   *  packages[id] overrides per package (demonic incursions ×2.5 below the
   *  world, ×0.75 above it). Composed into the GATE each per-dimension
   *  overlay instance is constructed with (sim.ts), so no overlay code ever
   *  reads this directly — the biomeEventDensity lesson, one tier up. */
  events?: { densityMul?: number; packages?: Record<string, number> };
  /** How this dimension is entered (see DimensionEntry). Omitted = no entry
   *  of its own (the surface — you start there). */
  entry?: DimensionEntry;
  /** Winding biome THROUGHLINES across this dimension's heat map (world/
   *  courses.ts): each paints its biome along a seeded polyline springing at
   *  its anchor, guarantees onward frontiers so the artery can be FOLLOWED,
   *  and can hold terminus rolls at its far end. A course-only biome (listed
   *  in no palette) exists exclusively along its line — a PLACE, not patches. */
  courses?: CourseSpec[];
}

/** The event-tempo multiplier a package's overlay runs at inside a dimension. */
export function dimensionPackageTempo(dimId: string, pkgId: string): number {
  const ev = dimensionDef(dimId).events;
  return ev?.packages?.[pkgId] ?? ev?.densityMul ?? 1;
}

/** Every registered dimension whose entry is the given kind — the engine seam
 *  (mintCave's breach roll) scans this instead of naming any dimension. */
export function dimensionsEnteredBy(kind: string): DimensionDef[] {
  return Object.values(DIMENSIONS).filter(d => d.entry?.kind === kind);
}

const DIMENSIONS: Record<string, DimensionDef> = {};

export function registerDimension(def: DimensionDef): void {
  if (DIMENSIONS[def.id]) console.warn(`[dimensions] re-registering '${def.id}' — overriding`);
  DIMENSIONS[def.id] = def;
  if (def.climate) registerDimensionClimate(def.id, def.climate);
}

export function dimensionDef(id: string | undefined): DimensionDef {
  return DIMENSIONS[id ?? 'surface'] ?? DIMENSIONS.surface;
}

export function dimensionIds(): string[] { return Object.keys(DIMENSIONS); }

registerDimension({ id: 'surface', label: 'The Surface', color: '#8fb86a' });
registerDimension({
  id: 'underworld', label: 'The Underworld', color: '#d84a2a',
  // Hell's palette: rift country (river-of-flame riverlands + siege castles),
  // the OUTER STEPPES (open marches cut by ruined hellwork walls + abyssal
  // maws — the gate-terrace descent), volcanic cauldrons (spiral over lava),
  // flesh warrens — all biome rows; the dimension only re-weights WHERE the
  // world grows from them.
  biomes: [
    { biome: 'rift', weight: 4 },
    { biome: 'steppes', weight: 4 },
    { biome: 'volcanic', weight: 3 },
    { biome: 'flesh', weight: 2 },
    // THE DURANCE — the hate-citadel: rare ENCLAVE regions (BiomeInfo.enclave)
    // that wall themselves behind boundary gates; interiors, not country.
    { biome: 'durance', weight: 1.5 },
    { biome: 'grave', weight: 1 },
  ],
  levelBonus: 3,
  // Hell's own climate: hot and arid, with its own slow heat swells — so the
  // shared affinity machinery pools volcanic country in the hottest reaches
  // (temperature crests past 'scorching') while gravelands keep the cooler
  // marches. No seas below: the maritime axis reads 0 everywhere.
  climate: {
    temperature: { base: 0.72, layers: [{ kind: 'noise', cell: 900, amp: 0.22, salt: 0x0661 }] },
    moisture: { base: 0.16, layers: [{ kind: 'noise', cell: 1100, amp: 0.14, salt: 0x0662 }] },
    maritime: { base: 0, layers: [] },
  },
  // Hell's TEMPO: demonic incursions erupt two-and-a-half times as often below
  // the world as above it — the same package, a different world-state's pulse.
  events: { packages: { demon_invasion: 2.5 } },
  // THE RIVER OF FLAME — hell's artery (the D2 Act 4 throughline made real):
  // a winding course springing at the Hellgate's doorstep, painting the
  // course-only 'flame' biome down a ~2200-unit meander. Zones minted on it
  // chain into one followable river (worldgen guarantees onward frontiers +
  // hands the recipe its up/downstream edges), and the HELLFORGE stands
  // guaranteed where the river ends. All shape numbers are course data —
  // tune the meander here, never in engine code.
  courses: [{
    id: 'river_of_flame', biome: 'flame', anchor: 'gate',
    length: 2200, halfWidth: 150, feather: 80, seedSalt: 0xf1a8e,
    label: 'The River of Flame',
    terminus: { radius: 260, compositions: [{ composition: 'hellforge_landing', chance: 1 }] },
  }],
  // Entered by delving: a surface cave ladder three deep tears a breach whose
  // realm gate mints The Hellgate (the one marked cross-dimension road).
  entry: {
    kind: 'cave_breach', minDepth: 3,
    gate: { id: 'uw_gate', name: 'The Hellgate', biome: 'rift', seedSalt: 0x4e11 },
  },
});

function hashCell(a: number, b: number, seed: number): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (a | 0), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (b | 0), 0xc2b2ae35) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f) >>> 0; h ^= h >>> 15;
  return h >>> 0;
}

/** A dimension's biome at a coordinate — the same jittered-Voronoi idiom as
 *  the surface heat map, drawn over the DIMENSION'S palette and picked through
 *  the SHARED weight × climate-affinity machinery (fieldBiomePick), under the
 *  dimension's own axis overrides. Pure/deterministic. */
export function dimensionBiomeAt(dimId: string, coord: MapCoord, seed: number): string {
  const def = dimensionDef(dimId);
  const table = def.biomes;
  if (!table?.length) return 'grove';
  const span = BIOME_FIELD_CFG.cellSpan, jit = BIOME_FIELD_CFG.jitter;
  const cx = Math.floor(coord.x / span), cy = Math.floor(coord.y / span);
  let bestGx = cx, bestGy = cy, bestPx = coord.x, bestPy = coord.y, bd = Infinity;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const gx = cx + dx, gy = cy + dy;
      const h = hashCell(gx, gy, seed);
      const px = (gx + 0.5 + (((h & 0xffff) / 0xffff) - 0.5) * jit) * span;
      const py = (gy + 0.5 + ((((h >>> 16) & 0xffff) / 0xffff) - 0.5) * jit) * span;
      const d = (px - coord.x) ** 2 + (py - coord.y) ** 2;
      if (d < bd) { bd = d; bestGx = gx; bestGy = gy; bestPx = px; bestPy = py; }
    }
  }
  return fieldBiomePick(table, bestGx, bestGy, { x: bestPx, y: bestPy }, seed, dimId);
}
