// ---------------------------------------------------------------------------
// THE LAKE LAYER — the drawn half of THE DEEP-MIDDLE REFUSAL (engine/lake.ts;
// charter docs/design/scald-basin.md §3 THE BROIL LAW + §6 THE LAKE).
//
// A lake's refused deep wears THE BROIL PERMANENTLY: the same drawn roil a
// vent wears for ~2s before it bursts (render/vis/geyserLayer.ts drawRoil —
// the ONE function, never a second roil), held forever at a simmer — a
// warning that never resolves is a refusal; nobody asks why they can't swim
// water that is cooking. No floaters, no labels (the show-don't-tell law).
//
// DRAWN == TESTED BY CONSTRUCTION: the roil seats are a pure function of
// the walk grid's OWN region cells — `broilSeatsIn` walks the view's cells
// and seats a roil wherever a cell wears a region whose visual animates
// 'broil' (world/regions.ts — data, never an id compare) and is INTERIOR
// (its four neighbours share it, so no seat straddles the drop-off).
// The same `regionAt` read is what movement refuses and what the renderer's
// drawAnimatedRegions washes; a probe can hold every seat against the grid.
//
// Stateless: one seat per S×S cell block on a hash-jittered lattice, each
// simmering on its own world-anchored phase — no particle state, no rng.
// Called from the renderer's animated-region pass (under actors, with the
// wash; the sight veil composites above). Every number is a DIAL.
// ---------------------------------------------------------------------------

import { GridWalkField } from '../../world/gridWalk';
import { regionKind } from '../../world/regions';
import { drawRoil } from './geyserLayer';

export const LAKE_BROIL_CFG = {
  /** Seat lattice: one roil per S×S block of walk cells (cell 30 → S 3 is a
   *  seat every ~90 world units — a boiling field, not a puddle grid). */
  blockCells: 3,
  /** Roil seat radius band (the vent mouthR idiom: hiss 16 … great 38). */
  r: [20, 34] as const,
  /** THE SIMMER: the broil ramp the deep holds — never the vent's full 1
   *  (that is "imminent now"); it breathes between these on a slow cycle. */
  simmer: [0.35, 0.8] as const,
  cycleSec: 7,
} as const;

/** Deterministic per-(a,b) unit float — the seat jitter/phase hash (the
 *  rideCapOf family's discipline: no rng stream, no state). */
function h01(a: number, b: number): number {
  let v = Math.imul(a + 1, 2654435761) >>> 0;
  v = (v ^ Math.imul(b + 1, 0x9e3779b1)) >>> 0;
  v = Math.imul(v ^ (v >>> 15), 2246822519) >>> 0;
  return ((v ^ (v >>> 13)) >>> 0) / 4294967296;
}

/** Does the region painted at this cell wear the permanent broil? Pure data
 *  read: the row's visual declares `animate: 'broil'`. */
export function broilRegionAt(wf: GridWalkField, gx: number, gy: number): boolean {
  if (gx < 0 || gy < 0 || gx >= wf.cols || gy >= wf.rows) return false;
  const id = wf.regionAt((gx + 0.5) * wf.cell, (gy + 0.5) * wf.cell);
  return regionKind(id)?.visual?.animate === 'broil';
}

export interface BroilSeat { x: number; y: number; r: number; seed: number; phase: number }

/** THE SEAT RESOLVER (pure): every roil seat whose block intersects the
 *  world rect — one per S×S cell block, jittered inside the block by hash,
 *  kept only on an INTERIOR broil cell (the cell and its four neighbours all
 *  wear a broil region). The renderer draws exactly these; a probe can ask
 *  for the whole grid's seats and hold each against `regionAt`. */
export function broilSeatsIn(wf: GridWalkField, x0: number, y0: number, x1: number, y1: number): BroilSeat[] {
  const S = LAKE_BROIL_CFG.blockCells;
  const cell = wf.cell;
  const out: BroilSeat[] = [];
  const bx0 = Math.max(0, Math.floor(x0 / (cell * S))), bx1 = Math.min(Math.ceil(wf.cols / S), Math.ceil(x1 / (cell * S)));
  const by0 = Math.max(0, Math.floor(y0 / (cell * S))), by1 = Math.min(Math.ceil(wf.rows / S), Math.ceil(y1 / (cell * S)));
  for (let by = by0; by < by1; by++) {
    for (let bx = bx0; bx < bx1; bx++) {
      const gx = bx * S + Math.floor(h01(bx, by) * S);
      const gy = by * S + Math.floor(h01(bx, by ^ 0x55) * S);
      if (!broilRegionAt(wf, gx, gy)) continue;
      if (!broilRegionAt(wf, gx - 1, gy) || !broilRegionAt(wf, gx + 1, gy)
        || !broilRegionAt(wf, gx, gy - 1) || !broilRegionAt(wf, gx, gy + 1)) continue;
      const seed = (gx * 73856093) ^ (gy * 19349663);
      const [rLo, rHi] = LAKE_BROIL_CFG.r;
      out.push({
        x: (gx + 0.5) * cell, y: (gy + 0.5) * cell,
        r: rLo + (rHi - rLo) * h01(seed, 0x11),
        seed,
        phase: h01(seed, 0x22),
      });
    }
  }
  return out;
}

/** The simmer at a seat — the broil ramp the deep holds at time t. */
export function broilSimmerAt(seat: BroilSeat, t: number): number {
  const [lo, hi] = LAKE_BROIL_CFG.simmer;
  const w = 0.5 + 0.5 * Math.sin((t / LAKE_BROIL_CFG.cycleSec + seat.phase) * Math.PI * 2);
  return lo + (hi - lo) * w;
}

/** UNDER-ACTOR PASS (the renderer's animated-region sweep calls it once a
 *  broil region is in view): the deep's permanent roil off the grid. */
export function drawLakeBroil(ctx: CanvasRenderingContext2D, wf: GridWalkField, t: number,
  camX: number, camY: number, vw: number, vh: number): void {
  const pad = LAKE_BROIL_CFG.r[1] * 2;
  const seats = broilSeatsIn(wf, camX - pad, camY - pad, camX + vw + pad, camY + vh + pad);
  if (!seats.length) return;
  ctx.save();
  for (const s of seats) drawRoil(ctx, s.x, s.y, s.r, broilSimmerAt(s, t), t, s.seed);
  ctx.restore();
}
