// ---------------------------------------------------------------------------
// DISC SPATIAL INDEX — O(1) point lookups over the zone's doodad discs.
//
// Every hot query in the sim used to scan the FULL doodad list: movement
// clamping (per actor per frame, ×3 passes), projectile flight (per
// projectile per frame), and ground sensing (per actor per frame). A zone
// whose landmark pours a liquid (a caldera's lava pool is emitted as one
// disc per walk-grid cell — hundreds of discs) multiplied all of that into
// real frame drops.
//
// The index is COVERAGE-inserted: each disc is registered in every cell its
// circle overlaps, grown by `queryPad`. A point query therefore reads
// EXACTLY ONE bucket and still sees every disc that could matter for any
// query body whose radius ≤ queryPad (the fattest boss/projectile bodies) —
// no neighbor-cell walks, no dedup, no misses.
//
// Buckets live in a Map keyed by cell coordinates, so unbounded worlds (the
// Descent's boundless abyss) index as cheaply as walled arenas. Rebuild is
// O(discs × covered cells) — microseconds at zone scale; the owner rebuilds
// lazily whenever the doodad list changes (see World.doodadsAt).
// ---------------------------------------------------------------------------

export interface SpatialDisc { pos: { x: number; y: number }; radius: number }

/** Tuning: cell size trades bucket fan-out vs bucket length; queryPad must
 *  stay ≥ the fattest query body (boss radii, colossal projectiles). */
export const SPATIAL_CFG = {
  cell: 128,
  queryPad: 96,
};

/** Cell key packing: ±32768 cells (±4.2M world units at cell 128) per axis. */
const KEY_OFF = 32768;
const keyOf = (cx: number, cy: number): number => (cx + KEY_OFF) * 65536 + (cy + KEY_OFF);

export class DiscIndex<T extends SpatialDisc> {
  private buckets = new Map<number, T[]>();
  private readonly empty: readonly T[] = [];

  build(items: readonly T[]): void {
    const cell = SPATIAL_CFG.cell;
    const pad = SPATIAL_CFG.queryPad;
    this.buckets.clear();
    for (const it of items) {
      const r = it.radius + pad;
      const x0 = Math.floor((it.pos.x - r) / cell), x1 = Math.floor((it.pos.x + r) / cell);
      const y0 = Math.floor((it.pos.y - r) / cell), y1 = Math.floor((it.pos.y + r) / cell);
      for (let cy = y0; cy <= y1; cy++) {
        for (let cx = x0; cx <= x1; cx++) {
          const k = keyOf(cx, cy);
          const b = this.buckets.get(k);
          if (b) b.push(it); else this.buckets.set(k, [it]);
        }
      }
    }
  }

  /** Every disc whose circle (grown by queryPad) covers this point — the
   *  complete candidate set for any body of radius ≤ queryPad at (x, y). */
  at(x: number, y: number): readonly T[] {
    const cell = SPATIAL_CFG.cell;
    return this.buckets.get(keyOf(Math.floor(x / cell), Math.floor(y / cell))) ?? this.empty;
  }

  /** Every disc whose circle could intersect a query circle of radius
   *  `reach` at (x, y) — the AREA sibling of at(): the bucket sweep over
   *  the query's bounding box, deduped (a disc spans many cells). This is
   *  the CANDIDATE set; the precise overlap test is the caller's business.
   *  Single-bucket queries return the bucket itself, allocation-free. */
  near(x: number, y: number, reach: number): readonly T[] {
    const cell = SPATIAL_CFG.cell;
    const x0 = Math.floor((x - reach) / cell), x1 = Math.floor((x + reach) / cell);
    const y0 = Math.floor((y - reach) / cell), y1 = Math.floor((y + reach) / cell);
    if (x0 === x1 && y0 === y1) return this.buckets.get(keyOf(x0, y0)) ?? this.empty;
    const seen = new Set<T>();
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const b = this.buckets.get(keyOf(cx, cy));
        if (b) for (const it of b) seen.add(it);
      }
    }
    return [...seen];
  }
}
