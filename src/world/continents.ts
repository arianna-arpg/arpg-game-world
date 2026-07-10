// ---------------------------------------------------------------------------
// CONTINENTS — the world's LANDMASS field: a low-frequency jittered Voronoi
// over node space (the biome field's idiom, an octave up) that partitions the
// infinite map into continents separated by OCEAN, with occasional LAND
// BRIDGES tying neighbours together. Pure + deterministic per (coord, seed):
// the same coordinate is the same shore on every machine, every reload.
//
//   land    zones mint normally (a continent holds many biome regions)
//   ocean   zones DON'T mint — a frontier reaching in becomes a PORT, and
//           travel onward is by SEA (the Sail menu; Lost Ark port-hopping)
//   bridge  a rare tested isthmus through the ocean between two landmasses —
//           the walkable back door
//
// Every knob is data (CONTINENT_CFG): ocean spans, landmass scale, bridge
// frequency — the "configurable size spans of flexible ocean" lever.
// ---------------------------------------------------------------------------

import type { MapCoord } from './coords';

export interface ContinentCfg {
  /** Macro-cell span in node units — the landmass scale (biome cells are 260;
   *  a continent spans several biome regions). */
  cellSpan: number;
  /** Voronoi seed jitter (0..0.5) — organic coastlines, not squares. */
  jitter: number;
  /** Fraction of macro cells that are OCEAN — the sea-span lever. */
  oceanFrac: number;
  /** Chance an ocean cell wedged between two land cells firms into a BRIDGE. */
  bridgeChance: number;
}

export const CONTINENT_CFG: ContinentCfg = {
  cellSpan: 1150,
  jitter: 0.42,
  oceanFrac: 0.38,
  bridgeChance: 0.3,
};

export interface ContinentInfo {
  kind: 'land' | 'ocean' | 'bridge';
  /** Stable landmass label (`cont_<gx>_<gy>` of the winning land seed) — the
   *  port-routing key. null on open ocean. */
  landmass: string | null;
}

/** THE one derivation of the continent seed from the biome-field seed — the
 *  landmass and biome layers are independent layouts of the same world, and
 *  every sampler (world, biomes, panels) must salt identically. */
export function continentSeedFrom(fieldSeed: number): number {
  return (fieldSeed ^ 0x0cea11) >>> 0;
}

function hashCell(a: number, b: number, seed: number): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (a | 0), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (b | 0), 0xc2b2ae35) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f) >>> 0; h ^= h >>> 15;
  return h >>> 0;
}

function cellIsLand(gx: number, gy: number, seed: number): boolean {
  // The HOME NEIGHBORHOOD is always land — the town must never sit mid-ocean.
  // The town's canonical coord lives near the corner of macro-cells
  // (-1..0, -1..0) (cellSpan 1150, jitter 0.42), so ANY of those four can win
  // the Voronoi at its coordinate depending on the seed; pinning only (0,0)
  // left seeds where the town's actual winning cell rolled OCEAN (the map
  // washed the town blue, frontiers gated into ports at the doorstep).
  if (gx >= -1 && gx <= 0 && gy >= -1 && gy <= 0) return true;
  return (hashCell(gx, gy, (seed ^ 0x51ed270b) >>> 0) / 0x100000000) >= CONTINENT_CFG.oceanFrac;
}

/** The WINNING macro cell at a coordinate — the landmass field's raw unit,
 *  exposed so sibling fields (climate's coastal/landmass-flavor layers) can
 *  key stable per-continent values without parsing label strings. */
export interface ContinentCell {
  gx: number;
  gy: number;
  kind: 'land' | 'ocean' | 'bridge';
}

/** The landmass field's winning cell at a node-space coordinate. Same 3×3
 *  jittered-Voronoi search as biomeAt; the winning seed's land/ocean roll
 *  decides. An ocean winner wedged directly between two land seeds may firm
 *  into a BRIDGE. */
export function continentCellAt(coord: MapCoord, seed: number): ContinentCell {
  const span = CONTINENT_CFG.cellSpan, jit = CONTINENT_CFG.jitter;
  const cx = Math.floor(coord.x / span), cy = Math.floor(coord.y / span);
  let bestD = Infinity, bestGx = 0, bestGy = 0;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const gx = cx + dx, gy = cy + dy;
      const h = hashCell(gx, gy, seed);
      const px = (gx + 0.5 + (((h & 0xffff) / 0xffff) - 0.5) * jit) * span;
      const py = (gy + 0.5 + ((((h >>> 16) & 0xffff) / 0xffff) - 0.5) * jit) * span;
      const d = (px - coord.x) ** 2 + (py - coord.y) ** 2;
      if (d < bestD) { bestD = d; bestGx = gx; bestGy = gy; }
    }
  }
  if (cellIsLand(bestGx, bestGy, seed)) return { gx: bestGx, gy: bestGy, kind: 'land' };
  // Bridge test: an ocean cell with land on OPPOSITE sides (either axis) may
  // firm into an isthmus — hashed per cell so the bridge is stable world-wide.
  const flanked =
    (cellIsLand(bestGx - 1, bestGy, seed) && cellIsLand(bestGx + 1, bestGy, seed))
    || (cellIsLand(bestGx, bestGy - 1, seed) && cellIsLand(bestGx, bestGy + 1, seed));
  if (flanked && (hashCell(bestGx, bestGy, (seed ^ 0x2545f491) >>> 0) / 0x100000000) < CONTINENT_CFG.bridgeChance) {
    return { gx: bestGx, gy: bestGy, kind: 'bridge' };
  }
  return { gx: bestGx, gy: bestGy, kind: 'ocean' };
}

/** The landmass field at a node-space coordinate (label form of the cell). */
export function continentAt(coord: MapCoord, seed: number): ContinentInfo {
  const cell = continentCellAt(coord, seed);
  switch (cell.kind) {
    case 'land': return { kind: 'land', landmass: `cont_${cell.gx}_${cell.gy}` };
    case 'bridge': return { kind: 'bridge', landmass: `bridge_${cell.gx}_${cell.gy}` };
    case 'ocean': return { kind: 'ocean', landmass: null };
  }
}

/** March from a port coordinate across the ocean along a bearing until LAND —
 *  the "chart a course" landfall picker. Returns the first land coord (a
 *  little inland), or null if no land within `maxSteps`. Pure. */
export function landfallFrom(
  from: MapCoord, angle: number, seed: number, maxSteps = 30,
): MapCoord | null {
  const step = CONTINENT_CFG.cellSpan * 0.45;
  let sawOcean = false;
  for (let i = 1; i <= maxSteps; i++) {
    const c = { x: from.x + Math.cos(angle) * step * i, y: from.y + Math.sin(angle) * step * i };
    const info = continentAt(c, seed);
    if (info.kind !== 'land') { sawOcean = true; continue; }
    if (sawOcean) {
      // One more step inland so the landfall zone isn't itself a shoreline
      // sliver — but only if the nudged point is STILL land (a thin island's
      // far side is ocean again; landing on the verified coast beats sailing
      // clean over the isle).
      const inland = { x: c.x + Math.cos(angle) * step * 0.5, y: c.y + Math.sin(angle) * step * 0.5 };
      return continentAt(inland, seed).kind === 'land' ? inland : c;
    }
  }
  return null;
}
