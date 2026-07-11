// ---------------------------------------------------------------------------
// ACTOR SPATIAL GRID — the actor analogue of DiscIndex (spatial.ts): a
// frame-rebuilt uniform grid over the LIVE actor list, so radius queries
// (collision pairs, aura occupancy, zone victims, projectile proximity, heat
// bands, AI neighbor scans) read a few buckets instead of sweeping every
// actor. Rebuilds are O(actors) and run a few times per frame at world-fixed
// seams (see World.actorsNear) — cheap enough that correctness never has to
// lean on a stale index.
//
// DETERMINISM CONTRACT — the reason this file is careful:
//   1. Queries return a SUPERSET of the true radius set (cell coverage plus
//      the fattest body plus a staleness pad); the CALLER applies its exact
//      predicate, so results match what the full-list scan produced.
//   2. `near` returns candidates sorted by `gridSeq` — the actor's index in
//      the source array at build time — so consumers that roll rng or apply
//      float nudges per candidate iterate in EXACTLY the order the full
//      scan iterated (the balance baseline gates on those streams).
// ---------------------------------------------------------------------------

import type { Actor } from './actor';

/** Tuning: cell trades bucket fan-out vs bucket length; slop covers actor
 *  motion between a grid rebuild and a query within the same frame segment
 *  (dash/knockback integration ≤ ~60px per frame at the dt clamp). */
export const ACTOR_GRID_CFG = {
  cell: 192,
  slop: 96,
};

const KEY_OFF = 32768;
const keyOf = (cx: number, cy: number): number => (cx + KEY_OFF) * 65536 + (cy + KEY_OFF);

export class ActorGrid {
  private buckets = new Map<number, Actor[]>();
  private maxR = 0;

  /** Index the live members of `actors` by center cell, stamping each with
   *  its array index (`gridSeq`) for order-stable candidate sorts. */
  build(actors: readonly Actor[]): void {
    const cell = ACTOR_GRID_CFG.cell;
    this.buckets.clear();
    this.maxR = 0;
    for (let i = 0; i < actors.length; i++) {
      const a = actors[i];
      a.gridSeq = i;
      if (a.dead) continue;
      if (a.radius > this.maxR) this.maxR = a.radius;
      const k = keyOf(Math.floor(a.pos.x / cell), Math.floor(a.pos.y / cell));
      const b = this.buckets.get(k);
      if (b) b.push(a); else this.buckets.set(k, [a]);
    }
  }

  /** Every live actor whose BODY could reach within `r` of (x, y) — a
   *  superset (padded by the fattest body + the staleness slop), written
   *  into `out` (cleared first) and sorted by build-time array order. The
   *  caller filters exactly; out is caller-owned scratch (non-reentrant). */
  near(x: number, y: number, r: number, out: Actor[]): Actor[] {
    out.length = 0;
    const cell = ACTOR_GRID_CFG.cell;
    const reach = r + this.maxR + ACTOR_GRID_CFG.slop;
    const x0 = Math.floor((x - reach) / cell), x1 = Math.floor((x + reach) / cell);
    const y0 = Math.floor((y - reach) / cell), y1 = Math.floor((y + reach) / cell);
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const b = this.buckets.get(keyOf(cx, cy));
        if (b) for (const a of b) out.push(a);
      }
    }
    // Order-stable: consumers iterate exactly as the full array scan did.
    out.sort((a, b) => a.gridSeq - b.gridSeq);
    return out;
  }
}
