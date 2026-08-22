// ---------------------------------------------------------------------------
// THE BOIL LAYER — the drawn half of THE GROUNDED STRIKE (StormDelivery.onGround;
// the Cistern Crone's `cistern_boil`, charter docs/design/scald-basin.md §8 /
// §13 M3; data/cistern.ts). THE BROIL LAW as a boss verb: the water visibly
// BROILS through the telegraph window and then it scalds — a warning that is
// the environment itself, never a floater. A grounded strike's telegraph is
// not the disc: it is the disc's cells that WEAR one of the strike's ground
// kinds, and this layer draws the geyser fabric's ONE roil (geyserLayer.ts
// drawRoil — the vent's telegraph, the lake's permanent deep, now the crone's
// cistern: never a second roil) over exactly those cells, the ramp rising as
// the countdown runs out. The shore inside the ring stays unroiled because
// the shore inside the ring stays dry (World.updateZones — the same cells).
//
// DRAWN == TESTED BY CONSTRUCTION: `groundedCellsIn` is the pure seat
// resolver the renderer draws from and a probe can hold against the engine's
// own gate (a victim standing on a returned cell is inside the disc AND on a
// named kind; a victim on any other cell in the disc is spared). Stateless,
// viewport-clipped, cheap (a boil is a few dozen cells). Layer-honest: the
// renderer calls it only when the viewer stands on the caster's own story
// (a surface walker over the cistern sees a lid, never the water below).
// ---------------------------------------------------------------------------

import type { GridWalkField } from '../../world/gridWalk';
import { drawRoil } from './geyserLayer';

export const BOIL_CFG = {
  /** The roil's mouth radius as a fraction of the cell (one roil per cell,
   *  jittered inside it by hash so the pool reads as one broil, not tiles). */
  mouthFrac: 0.42,
  /** Seat jitter inside the cell (fraction of the cell, ± each axis). */
  jitter: 0.22,
  /** The ramp's floor at the first frame of the telegraph (the water is
   *  already uneasy the moment the verb starts) and its shape (>1 = the
   *  broil stays gentle longer and piles up at the end — the burst reads
   *  imminent exactly when it is). */
  rampFloor: 0.12,
  rampPow: 1.35,
  /** The faint disc outline kept under the roil — the honest extent of
   *  the strike's reach, at a whisper (the roil is the word). */
  ringAlpha: 0.18,
} as const;

export interface BoilCell { x: number; y: number; seed: number }

function h01(a: number, b: number): number {
  let h = (Math.imul(a | 0, 0x9E3779B1) ^ Math.imul(b | 0, 0x85EBCA77)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2C1B3C6D) >>> 0;
  h = Math.imul(h ^ (h >>> 12), 0x297A2D39) >>> 0;
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

/** THE SEAT RESOLVER (pure): every grid cell whose CENTER lies inside the
 *  disc (pos, radius) and whose region kind is one of `kinds` — the exact
 *  set the grounded strike will bite (World.updateZones reads each victim's
 *  own cell through the same `regionAt`; a body's centre decides its cell
 *  there too). Clipped to an optional world rect for the renderer. */
export function groundedCellsIn(
  wf: GridWalkField, pos: { x: number; y: number }, radius: number, kinds: readonly string[],
  clip?: { x0: number; y0: number; x1: number; y1: number },
): BoilCell[] {
  const cell = wf.cell;
  const out: BoilCell[] = [];
  const x0 = Math.max(pos.x - radius, clip?.x0 ?? -Infinity);
  const y0 = Math.max(pos.y - radius, clip?.y0 ?? -Infinity);
  const x1 = Math.min(pos.x + radius, clip?.x1 ?? Infinity);
  const y1 = Math.min(pos.y + radius, clip?.y1 ?? Infinity);
  const gx0 = Math.max(0, Math.floor(x0 / cell)), gx1 = Math.min(wf.cols - 1, Math.floor(x1 / cell));
  const gy0 = Math.max(0, Math.floor(y0 / cell)), gy1 = Math.min(wf.rows - 1, Math.floor(y1 / cell));
  const r2 = radius * radius;
  for (let gy = gy0; gy <= gy1; gy++) {
    for (let gx = gx0; gx <= gx1; gx++) {
      const x = (gx + 0.5) * cell, y = (gy + 0.5) * cell;
      const dx = x - pos.x, dy = y - pos.y;
      if (dx * dx + dy * dy > r2) continue;
      if (!kinds.includes(wf.regionAt(x, y))) continue;
      out.push({ x, y, seed: (gx * 73856093) ^ (gy * 19349663) });
    }
  }
  return out;
}

/** The broil ramp for a telegraph `left` seconds from landing out of a
 *  `fuse`-second window: 0..1, floored so the water is never still during
 *  the verb, piling toward 1 as the burst nears. Pure. */
export function boilRamp(left: number, fuse: number): number {
  if (!(fuse > 0)) return 1;
  const t = Math.max(0, Math.min(1, 1 - left / fuse));
  return BOIL_CFG.rampFloor + (1 - BOIL_CFG.rampFloor) * Math.pow(t, BOIL_CFG.rampPow);
}

/** Draw the roil over the cells a grounded strike will bite — one
 *  `drawRoil` per cell, hash-jittered inside it, at the ramp `b`. Leaves
 *  globalAlpha dirty (the caller's save/restore, like drawRoil). */
export function drawBoilCells(
  ctx: CanvasRenderingContext2D, cells: readonly BoilCell[], cell: number, b: number, t: number,
): void {
  const mouthR = cell * BOIL_CFG.mouthFrac;
  const j = cell * BOIL_CFG.jitter;
  for (const c of cells) {
    const x = c.x + (h01(c.seed, 0x11) * 2 - 1) * j;
    const y = c.y + (h01(c.seed, 0x22) * 2 - 1) * j;
    drawRoil(ctx, x, y, mouthR, b, t, c.seed);
  }
}
