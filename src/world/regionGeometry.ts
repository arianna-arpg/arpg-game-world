import type { MapCoord } from './coords';

/** Inputs to the native weighted region solver. The caller owns field selection:
 * climate bands, existence floors and source snapshots do not belong to geometry.
 * Supply stable callbacks and readonly policy data for a frozen field. */
export interface RegionGeometryPolicy {
  readonly cellSpan: number;
  readonly jitter: number;
  readonly regionScale: {
    readonly default: readonly [number, number];
    readonly min: number;
    readonly max: number;
    readonly search: number;
  };
  readonly biomeAtCell: (gx: number, gy: number, site: Readonly<MapCoord>, seed: number) => string;
  readonly scaleForBiome: (biome: string) => readonly [number, number] | undefined;
}

export interface RegionGeometryWinner {
  biome: string;
  gx: number;
  gy: number;
  scale: number;
  score: number;
  depth: number;
}

/** The original native integer hash. Cell identities retain its signed 32-bit
 * coercion; callers mapping other coordinate domains must define their bounds. */
export function regionCellHash(a: number, b: number, seed: number): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (a | 0), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (b | 0), 0xc2b2ae35) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f) >>> 0; h ^= h >>> 15;
  return h >>> 0;
}

/** Native multiplicatively weighted, jittered Voronoi ownership and depth.
 * Candidate order, strict ties and the different-biome pruning bound are part
 * of the source contract. Depth uses only the configured search neighborhood;
 * it is one when no opposing biome is found. No cache or global random stream.
 * The shipping policy's bounded winner proof does not cover arbitrary policies. */
export function regionGeometry(coord: Readonly<MapCoord>, seed: number, policy: RegionGeometryPolicy): RegionGeometryWinner {
  const span = policy.cellSpan, cfg = policy.regionScale;
  const cx = Math.floor(coord.x / span), cy = Math.floor(coord.y / span);
  let best = { biome: 'grove', gx: cx, gy: cy, scale: 1, score: Infinity };
  let other = Infinity;
  for (let dx = -cfg.search; dx <= cfg.search; dx++) for (let dy = -cfg.search; dy <= cfg.search; dy++) {
    const gx = cx + dx, gy = cy + dy, h = regionCellHash(gx, gy, seed);
    const x = (gx + 0.5 + ((h & 0xffff) / 0xffff - 0.5) * policy.jitter) * span;
    const y = (gy + 0.5 + ((h >>> 16) / 0xffff - 0.5) * policy.jitter) * span;
    const distance = (x - coord.x) ** 2 + (y - coord.y) ** 2;
    if (distance / (cfg.max ** 2) >= other) continue;
    const biome = policy.biomeAtCell(gx, gy, { x, y }, seed);
    const band = policy.scaleForBiome(biome) ?? cfg.default;
    const scale = Math.max(cfg.min, Math.min(cfg.max, band[0] + (band[1] - band[0]) * regionCellHash(gx, gy, seed ^ 0x72ad1) / 0x100000000));
    const score = distance / (scale * scale);
    if (score < best.score) {
      if (biome !== best.biome) other = best.score;
      best = { biome, gx, gy, scale, score };
    } else if (biome !== best.biome && score < other) other = score;
  }
  return { ...best, depth: Number.isFinite(other) ? Math.max(0, 1 - Math.sqrt(best.score / Math.max(other, 1e-9))) : 1 };
}
