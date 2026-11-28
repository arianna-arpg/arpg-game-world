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

export interface SpatialDisc {
  pos: { x: number; y: number };
  radius: number;
  /** Broad-phase override when the item's true surface pokes past `radius`
   *  (a door slab's rect corners — see levelgen.normalizeDoodadBound).
   *  Insertion coverage uses max of the two; queries are unchanged. */
  boundR?: number;
}

/** Tuning: cell size trades bucket fan-out vs bucket length; queryPad must
 *  stay ≥ the fattest query body (boss radii, colossal projectiles). */
export const SPATIAL_CFG = {
  cell: 128,
  queryPad: 96,
};

/** Cell key packing: ±16384 cells (±2.1M world units at cell 128) per axis.
 *  Packed into a non-negative 30-bit integer so keys stay V8 Smis (zero
 *  HeapNumber allocations on pointer-compressed 64-bit V8). */
const KEY_OFF = 16384;
const keyOf = (cx: number, cy: number): number =>
  (((cx + KEY_OFF) & 0x7fff) << 15) | ((cy + KEY_OFF) & 0x7fff);

export class DiscIndex<T extends SpatialDisc> {
  private buckets = new Map<number, T[]>();
  private activeBuckets: T[][] = [];
  private readonly empty: readonly T[] = [];
  private readonly seen = new Set<T>();
  private readonly nearSeen = new Set<T>();
  private readonly nearBuf: T[] = [];
  private forEachBusy = false;

  constructor(
    private readonly cell = SPATIAL_CFG.cell,
    private readonly pad = SPATIAL_CFG.queryPad,
  ) {}

  build(items: readonly T[]): void {
    if (this.buckets.size > 16384) {
      this.buckets.clear();
      this.activeBuckets.length = 0;
    } else {
      for (let i = 0; i < this.activeBuckets.length; i++) {
        this.activeBuckets[i].length = 0;
      }
      this.activeBuckets.length = 0;
    }
    this.insertFrom(items, 0);
  }

  /** Incrementally index `items[startIdx .. items.length - 1]` into existing buckets
   *  (used when pure appends occur without mutating earlier items). */
  insertFrom(items: readonly T[], startIdx: number): void {
    const cell = this.cell;
    const pad = this.pad;
    for (let idx = startIdx, len = items.length; idx < len; idx++) {
      const it = items[idx];
      const r = (it.boundR !== undefined && it.boundR > it.radius ? it.boundR : it.radius) + pad;
      const x0 = Math.floor((it.pos.x - r) / cell), x1 = Math.floor((it.pos.x + r) / cell);
      const y0 = Math.floor((it.pos.y - r) / cell), y1 = Math.floor((it.pos.y + r) / cell);
      for (let cy = y0; cy <= y1; cy++) {
        for (let cx = x0; cx <= x1; cx++) {
          const k = keyOf(cx, cy);
          let b = this.buckets.get(k);
          if (!b) {
            b = [];
            this.buckets.set(k, b);
          }
          if (b.length === 0) this.activeBuckets.push(b);
          b.push(it);
        }
      }
    }
  }

  /** Every disc whose circle (grown by queryPad) covers this point — the
   *  complete candidate set for any body of radius ≤ queryPad at (x, y). */
  at(x: number, y: number): readonly T[] {
    const cell = this.cell;
    return this.buckets.get(keyOf(Math.floor(x / cell), Math.floor(y / cell))) ?? this.empty;
  }

  /** Allocation-free callback walk over the deduped candidate set within `reach`. */
  forEachNear(x: number, y: number, reach: number, fn: (item: T) => void): void {
    const cell = this.cell;
    const x0 = Math.floor((x - reach) / cell), x1 = Math.floor((x + reach) / cell);
    const y0 = Math.floor((y - reach) / cell), y1 = Math.floor((y + reach) / cell);
    if (x0 === x1 && y0 === y1) {
      const b = this.buckets.get(keyOf(x0, y0));
      if (b) for (let i = 0, len = b.length; i < len; i++) fn(b[i]);
      return;
    }
    const useShared = !this.forEachBusy;
    const seen = useShared ? this.seen : new Set<T>();
    if (useShared) {
      this.forEachBusy = true;
      seen.clear();
    }
    try {
      for (let cy = y0; cy <= y1; cy++) {
        for (let cx = x0; cx <= x1; cx++) {
          const b = this.buckets.get(keyOf(cx, cy));
          if (!b) continue;
          for (let i = 0, len = b.length; i < len; i++) {
            const it = b[i];
            if (!seen.has(it)) {
              seen.add(it);
              fn(it);
            }
          }
        }
      }
    } finally {
      if (useShared) {
        seen.clear();
        this.forEachBusy = false;
      }
    }
  }

  /** Every disc whose circle could intersect a query circle of radius
   *  `reach` at (x, y) — the AREA sibling of at(): the bucket sweep over
   *  the query's bounding box, deduped (a disc spans many cells). This is
   *  the CANDIDATE set; the precise overlap test is the caller's business.
   *  Single-bucket queries return the bucket itself, allocation-free. */
  near(x: number, y: number, reach: number): readonly T[] {
    const cell = this.cell;
    const x0 = Math.floor((x - reach) / cell), x1 = Math.floor((x + reach) / cell);
    const y0 = Math.floor((y - reach) / cell), y1 = Math.floor((y + reach) / cell);
    if (x0 === x1 && y0 === y1) return this.buckets.get(keyOf(x0, y0)) ?? this.empty;
    const seen = this.forEachBusy ? new Set<T>() : this.seen;
    seen.clear();
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const b = this.buckets.get(keyOf(cx, cy));
        if (b) for (let i = 0, len = b.length; i < len; i++) seen.add(b[i]);
      }
    }
    if (seen.size === 0) return this.empty;
    const out = Array.from(seen);
    if (seen === this.seen) seen.clear();
    return out;
  }

  /** Zero-allocation sibling of `near()` for synchronous single-loop callers
   *  (movement sweeps) that consume the returned slice before the next call. */
  nearScratch(x: number, y: number, reach: number): readonly T[] {
    const cell = this.cell;
    const x0 = Math.floor((x - reach) / cell), x1 = Math.floor((x + reach) / cell);
    const y0 = Math.floor((y - reach) / cell), y1 = Math.floor((y + reach) / cell);
    if (x0 === x1 && y0 === y1) return this.buckets.get(keyOf(x0, y0)) ?? this.empty;
    const seen = this.nearSeen;
    const out = this.nearBuf;
    seen.clear();
    out.length = 0;
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const b = this.buckets.get(keyOf(cx, cy));
        if (!b) continue;
        for (let i = 0; i < b.length; i++) {
          const it = b[i];
          if (!seen.has(it)) {
            seen.add(it);
            out.push(it);
          }
        }
      }
    }
    seen.clear();
    return out;
  }
}
