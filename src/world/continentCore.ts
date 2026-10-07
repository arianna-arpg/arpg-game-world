/** Exact native continent arithmetic with explicit policy.
 * Provenance 67d9c290684f06ba2bda8a7694def1e9e4448381:src/world/continents.ts. No worldmass mapping/save activation. */
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

export interface ContinentInfo {
  kind: 'land' | 'ocean' | 'bridge';
  /** Stable landmass label (`cont_<gx>_<gy>` of the winning land seed) — the
   *  port-routing key. null on open ocean. */
  landmass: string | null;
}

export interface ContinentCell {
  gx: number;
  gy: number;
  kind: 'land' | 'ocean' | 'bridge';
}

export const NATIVE_CONTINENT_ALGORITHM = 'native-continent-v1' as const;

export function nativeContinentSeedFrom(fieldSeed: number): number {
  return (fieldSeed ^ 0x0cea11) >>> 0;
}

export function nativeContinentHash(a: number, b: number, seed: number): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (a | 0), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (b | 0), 0xc2b2ae35) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f) >>> 0; h ^= h >>> 15;
  return h >>> 0;
}

function nativeContinentCellIsLand(config: Readonly<ContinentCfg>, gx: number, gy: number, seed: number): boolean {
  // The HOME NEIGHBORHOOD is always land — the town must never sit mid-ocean.
  // The town's canonical coord lives near the corner of macro-cells
  // (-1..0, -1..0) (cellSpan 1150, jitter 0.42), so ANY of those four can win
  // the Voronoi at its coordinate depending on the seed; pinning only (0,0)
  // left seeds where the town's actual winning cell rolled OCEAN (the map
  // washed the town blue, frontiers gated into ports at the doorstep).
  if (gx >= -1 && gx <= 0 && gy >= -1 && gy <= 0) return true;
  return (nativeContinentHash(gx, gy, (seed ^ 0x51ed270b) >>> 0) / 0x100000000) >= config.oceanFrac;
}

export function nativeContinentCellKind(config: Readonly<ContinentCfg>, gx: number, gy: number, seed: number): 'land' | 'ocean' | 'bridge' {
  if (nativeContinentCellIsLand(config, gx, gy, seed)) return 'land';
  // Bridge test: an ocean cell with land on OPPOSITE sides (either axis) may
  // firm into an isthmus — hashed per cell so the bridge is stable world-wide.
  const flanked =
    (nativeContinentCellIsLand(config, gx - 1, gy, seed) && nativeContinentCellIsLand(config, gx + 1, gy, seed))
    || (nativeContinentCellIsLand(config, gx, gy - 1, seed) && nativeContinentCellIsLand(config, gx, gy + 1, seed));
  if (flanked && (nativeContinentHash(gx, gy, (seed ^ 0x2545f491) >>> 0) / 0x100000000) < config.bridgeChance) {
    return 'bridge';
  }
  return 'ocean';
}

export function nativeContinentCellSite(config: Readonly<ContinentCfg>, gx: number, gy: number, seed: number): MapCoord {
  const span = config.cellSpan, jit = config.jitter;
  const h = nativeContinentHash(gx, gy, seed);
  return {
    x: (gx + 0.5 + (((h & 0xffff) / 0xffff) - 0.5) * jit) * span,
    y: (gy + 0.5 + ((((h >>> 16) & 0xffff) / 0xffff) - 0.5) * jit) * span,
  };
}

export function nativeContinentCellAt(config: Readonly<ContinentCfg>, coord: MapCoord, seed: number): ContinentCell {
  const span = config.cellSpan;
  const cx = Math.floor(coord.x / span), cy = Math.floor(coord.y / span);
  let bestD = Infinity, bestGx = 0, bestGy = 0;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const gx = cx + dx, gy = cy + dy;
      const s = nativeContinentCellSite(config, gx, gy, seed);
      const d = (s.x - coord.x) ** 2 + (s.y - coord.y) ** 2;
      if (d < bestD) { bestD = d; bestGx = gx; bestGy = gy; }
    }
  }
  return { gx: bestGx, gy: bestGy, kind: nativeContinentCellKind(config, bestGx, bestGy, seed) };
}

export function nativeContinentAt(config: Readonly<ContinentCfg>, coord: MapCoord, seed: number): ContinentInfo {
  const cell = nativeContinentCellAt(config, coord, seed);
  switch (cell.kind) {
    case 'land': return { kind: 'land', landmass: `cont_${cell.gx}_${cell.gy}` };
    case 'bridge': return { kind: 'bridge', landmass: `bridge_${cell.gx}_${cell.gy}` };
    case 'ocean': return { kind: 'ocean', landmass: null };
  }
}

export function nativeContinentLandfallFrom(config: Readonly<ContinentCfg>, from: MapCoord, angle: number, seed: number, maxSteps = 30): MapCoord | null {
  const step = config.cellSpan * 0.45;
  let sawOcean = false;
  for (let i = 1; i <= maxSteps; i++) {
    const c = { x: from.x + Math.cos(angle) * step * i, y: from.y + Math.sin(angle) * step * i };
    const info = nativeContinentAt(config, c, seed);
    if (info.kind !== 'land') { sawOcean = true; continue; }
    if (sawOcean) {
      // One more step inland so the landfall zone isn't itself a shoreline
      // sliver — but only if the nudged point is STILL land (a thin island's
      // far side is ocean again; landing on the verified coast beats sailing
      // clean over the isle).
      const inland = { x: c.x + Math.cos(angle) * step * 0.5, y: c.y + Math.sin(angle) * step * 0.5 };
      return nativeContinentAt(config, inland, seed).kind === 'land' ? inland : c;
    }
  }
  return null;
}

/** Immutable readers close over a complete per-instance copy of native config.
 * Seeds remain explicit, including the original field-to-continent seed salt.
 * No climate origin is accepted: the native home pin is fixed at (-1..0,-1..0).
 * Native operations intentionally allocate fresh mutable result objects, as
 * the classic functions do. Only the source and reader container are frozen.
 * This typed factory adds no source schema or runtime sanitization. */
export function createNativeContinentReader(input: Readonly<ContinentCfg>) {
  const config: Readonly<ContinentCfg> = Object.freeze({ ...input });
  return Object.freeze({
    algorithm: NATIVE_CONTINENT_ALGORITHM, config,
    continentSeedFrom: nativeContinentSeedFrom,
    cellKind: (gx: number, gy: number, seed: number) => nativeContinentCellKind(config, gx, gy, seed),
    cellSite: (gx: number, gy: number, seed: number) => nativeContinentCellSite(config, gx, gy, seed),
    continentCellAt: (coord: MapCoord, seed: number) => nativeContinentCellAt(config, coord, seed),
    continentAt: (coord: MapCoord, seed: number) => nativeContinentAt(config, coord, seed),
    landfallFrom: (from: MapCoord, angle: number, seed: number, maxSteps = 30) => nativeContinentLandfallFrom(config, from, angle, seed, maxSteps),
  });
}
export type NativeContinentReader = ReturnType<typeof createNativeContinentReader>;
