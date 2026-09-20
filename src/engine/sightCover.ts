/** Optical thickness of foliage along a ray. Overlapping plants use the
 * strongest density, so duplicate dressing cannot multiply concealment. */
export interface SightCoverSpan { from: number; to: number; density: number }
export const SIGHT_COVER_CFG = { depth: 48 } as const;

/** Distance at which foliage exhausts the sight budget, or Infinity. */
export function sightCoverClip(spans: SightCoverSpan[], depth = SIGHT_COVER_CFG.depth): number {
  const points = spans.flatMap(s => [s.from, s.to]).sort((a, b) => a - b);
  let remaining: number = depth;
  for (let i = 1; i < points.length; i++) {
    const lo = points[i - 1], hi = points[i];
    if (hi <= lo) continue;
    let density = 0;
    for (const s of spans) if (s.from <= lo && s.to >= hi) density = Math.max(density, s.density);
    if (density <= 0) continue;
    const cost = (hi - lo) * density;
    if (cost >= remaining) return lo + remaining / density;
    remaining -= cost;
  }
  return Infinity;
}
