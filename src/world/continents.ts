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
import { nativeContinentSeedFrom, nativeContinentCellKind, nativeContinentCellSite, nativeContinentCellAt, nativeContinentAt, nativeContinentLandfallFrom } from './continentCore';

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
  return nativeContinentSeedFrom(fieldSeed);
}

/** The WINNING macro cell at a coordinate — the landmass field's raw unit,
 *  exposed so sibling fields (climate's coastal/landmass-flavor layers) can
 *  key stable per-continent values without parsing label strings. */
export interface ContinentCell {
  gx: number;
  gy: number;
  kind: 'land' | 'ocean' | 'bridge';
}

/** The RAW kind of one macro cell by its lattice address — the SEA FABRIC's
 *  fill substrate (world/seas.ts): continentCellAt answers "which cell wins
 *  at a coordinate"; this answers "what is cell (gx,gy)". Identical rolls to
 *  the winner path (one source of truth — continentCellAt delegates here).
 *  A bridge counts as NOT-water for sailing: its span blocks the boat, so
 *  two waters joined only under a bridge are separate SEAS. */
export function cellKind(gx: number, gy: number, seed: number): 'land' | 'ocean' | 'bridge' {
  return nativeContinentCellKind(CONTINENT_CFG, gx, gy, seed);
}

/** The JITTERED SITE of a macro cell (its Voronoi seed point) — exported so
 *  the sea fabric's centroids/orderings share the exact geometry the winner
 *  search uses. */
export function cellSite(gx: number, gy: number, seed: number): MapCoord {
  return nativeContinentCellSite(CONTINENT_CFG, gx, gy, seed);
}

/** The landmass field's winning cell at a node-space coordinate. Same 3×3
 *  jittered-Voronoi search as biomeAt; the winning seed's land/ocean roll
 *  decides (cellKind — the one source of truth). */
export function continentCellAt(coord: MapCoord, seed: number): ContinentCell {
  return nativeContinentCellAt(CONTINENT_CFG, coord, seed);
}

/** The landmass field at a node-space coordinate (label form of the cell). */
export function continentAt(coord: MapCoord, seed: number): ContinentInfo {
  return nativeContinentAt(CONTINENT_CFG, coord, seed);
}

/** March from a port coordinate across the ocean along a bearing until LAND —
 *  the "chart a course" landfall picker. Returns the first land coord (a
 *  little inland), or null if no land within `maxSteps`. Pure. */
export function landfallFrom(
  from: MapCoord, angle: number, seed: number, maxSteps = 30,
): MapCoord | null {
  return nativeContinentLandfallFrom(CONTINENT_CFG, from, angle, seed, maxSteps);
}
