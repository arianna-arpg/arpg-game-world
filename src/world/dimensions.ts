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
}

const DIMENSIONS: Record<string, DimensionDef> = {};

export function registerDimension(def: DimensionDef): void {
  if (DIMENSIONS[def.id]) console.warn(`[dimensions] re-registering '${def.id}' — overriding`);
  DIMENSIONS[def.id] = def;
}

export function dimensionDef(id: string | undefined): DimensionDef {
  return DIMENSIONS[id ?? 'surface'] ?? DIMENSIONS.surface;
}

export function dimensionIds(): string[] { return Object.keys(DIMENSIONS); }

registerDimension({ id: 'surface', label: 'The Surface', color: '#8fb86a' });
registerDimension({
  id: 'underworld', label: 'The Underworld', color: '#d84a2a',
  // Hell's palette: rift country (river-of-flame riverlands + siege castles),
  // volcanic cauldrons (spiral over lava), flesh warrens — all existing biome
  // rows; the dimension only re-weights WHERE the world grows from them.
  biomes: [
    { biome: 'rift', weight: 4 },
    { biome: 'volcanic', weight: 3 },
    { biome: 'flesh', weight: 2 },
    { biome: 'grave', weight: 1 },
  ],
  levelBonus: 3,
});

function hashCell(a: number, b: number, seed: number): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (a | 0), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (b | 0), 0xc2b2ae35) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f) >>> 0; h ^= h >>> 15;
  return h >>> 0;
}

/** A dimension's biome at a coordinate — the same jittered-Voronoi idiom as
 *  the surface heat map, drawn over the DIMENSION'S palette. Pure/deterministic. */
export function dimensionBiomeAt(dimId: string, coord: MapCoord, seed: number): string {
  const def = dimensionDef(dimId);
  const table = def.biomes;
  if (!table?.length) return 'grove';
  const span = 260, jit = 0.45;
  const cx = Math.floor(coord.x / span), cy = Math.floor(coord.y / span);
  let bestGx = cx, bestGy = cy, bd = Infinity;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const gx = cx + dx, gy = cy + dy;
      const h = hashCell(gx, gy, seed);
      const px = (gx + 0.5 + (((h & 0xffff) / 0xffff) - 0.5) * jit) * span;
      const py = (gy + 0.5 + ((((h >>> 16) & 0xffff) / 0xffff) - 0.5) * jit) * span;
      const d = (px - coord.x) ** 2 + (py - coord.y) ** 2;
      if (d < bd) { bd = d; bestGx = gx; bestGy = gy; }
    }
  }
  const total = table.reduce((a, e) => a + e.weight, 0);
  let r = (hashCell(bestGx, bestGy, (seed ^ 0x5bd1e995) >>> 0) / 0x100000000) * total;
  for (const e of table) { r -= e.weight; if (r <= 0) return e.biome; }
  return table[0].biome;
}
