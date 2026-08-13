// ---------------------------------------------------------------------------
// THE CELL FOLD — the partition law's pure geometry (M1.5).
//
// Her ruling (2026-08-12): the map's nodes drive the WHERE — zones "slot into
// entirely non-overlapping indices", generation "pushing off of each other",
// with the bleed between adjacent zones doing the blending. This module is
// the WHERE made precise: every seat claims an axis-aligned cell, cut at the
// midpoint toward each near seat and clamped at PARTITION_CFG.cellMaxHalfPx.
//
// THE NON-OVERLAP PROOF (why cells tile by construction): for any two seats,
// the cut axis is the pair's dominant separation axis — a property computed
// identically from both ends (|dx| vs |dy| with signs flipped) — and both
// cells clip at the SAME midpoint line from opposite sides, so no pair
// within reach can overlap; pairs beyond reach are separated by the clamp
// squares themselves. Cuts only ever shrink a cell, so adding more seats
// never re-opens an overlap. Pure f(seats) — no rng, no engine imports
// (the coords.ts leaf discipline); the fold is recomputed whenever the web
// moves (settling, new mints) by whoever consumes it.
// ---------------------------------------------------------------------------

import { PARTITION_CFG, type CellRect } from './seamless';

export interface CellSeat { id: string; x: number; y: number }

/** The cell one seat claims against a roster of near seats. `others` must
 *  include every seat within 2×cellMaxHalfPx on either axis (Chebyshev) —
 *  the caller's net; farther seats cannot touch the clamp square and are
 *  free to omit. Total: a degenerate axis (cuts crossing — webs the
 *  occupancy law forbids, but the fold never throws) clamps to a
 *  minCellSpanPx band centered between the cuts. */
export function cellForSeat(seat: CellSeat, others: readonly CellSeat[]): CellRect {
  const m = PARTITION_CFG.cellMaxHalfPx;
  let x0 = seat.x - m, x1 = seat.x + m, y0 = seat.y - m, y1 = seat.y + m;
  for (const o of others) {
    if (o.id === seat.id) continue;
    const dx = o.x - seat.x, dy = o.y - seat.y;
    if (dx === 0 && dy === 0) continue; // co-seated twin — the occupancy law's job, not ours
    if (Math.abs(dx) >= Math.abs(dy)) {
      const cut = seat.x + dx / 2;
      if (dx > 0) x1 = Math.min(x1, cut); else x0 = Math.max(x0, cut);
    } else {
      const cut = seat.y + dy / 2;
      if (dy > 0) y1 = Math.min(y1, cut); else y0 = Math.max(y0, cut);
    }
  }
  if (x1 - x0 < PARTITION_CFG.minCellSpanPx) {
    const c = (x0 + x1) / 2;
    x0 = c - PARTITION_CFG.minCellSpanPx / 2; x1 = c + PARTITION_CFG.minCellSpanPx / 2;
  }
  if (y1 - y0 < PARTITION_CFG.minCellSpanPx) {
    const c = (y0 + y1) / 2;
    y0 = c - PARTITION_CFG.minCellSpanPx / 2; y1 = c + PARTITION_CFG.minCellSpanPx / 2;
  }
  return { x0, y0, x1, y1 };
}

/** The whole fold: every seat's cell against the roster. The map the fitted
 *  mint and the border blend both read — ONE derivation, no drift. */
export function foldCells(seats: readonly CellSeat[]): Map<string, CellRect> {
  const out = new Map<string, CellRect>();
  const reach = PARTITION_CFG.cellMaxHalfPx * 2;
  for (const s of seats) {
    const near = seats.filter(o => o.id !== s.id
      && Math.abs(o.x - s.x) < reach && Math.abs(o.y - s.y) < reach);
    out.set(s.id, cellForSeat(s, near));
  }
  return out;
}

/** Do two cells share a border segment (touch along an edge with positive
 *  overlap on the other axis)? The open-border carve and the blend band both
 *  ask this of linked neighbors. */
export function cellsShareBorder(a: CellRect, b: CellRect, eps = 0.01): boolean {
  const xTouch = Math.abs(a.x1 - b.x0) < eps || Math.abs(b.x1 - a.x0) < eps;
  const yTouch = Math.abs(a.y1 - b.y0) < eps || Math.abs(b.y1 - a.y0) < eps;
  const xOverlap = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > eps;
  const yOverlap = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > eps;
  return (xTouch && yOverlap) || (yTouch && xOverlap);
}
