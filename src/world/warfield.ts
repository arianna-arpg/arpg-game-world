// ---------------------------------------------------------------------------
// THE WARFIELD FABRIC — shared math for living TERRITORIAL FIELDS.
//
// A territorial overlay (the Underworld's eternal war, a surface Crusade, any
// future campaign) is an ANALYTIC FIELD: per-seat influence at a coordinate is
// a PURE FUNCTION of (seeded identity, coord, time) — drifting value noise ×
// live power × an anchor well — so the warfront exists at every coordinate the
// moment it is asked about, animates on its own clock, and snapshots as a
// handful of scalars (the field cannot be corrupted, only re-asked). Player
// acts are DECAYING LOCAL MODIFIERS that heal.
//
// This module is the fabric those overlays compose — the noise, the drift, the
// well, the modifier discs, and the map's world-anchored render lattice — so a
// new campaign is authored from these pieces, never a re-implementation. It is
// PURE: no engine imports, no state, deterministic in its arguments.
// ---------------------------------------------------------------------------

import type { MapCoord } from './coords';

/** A decaying local field modifier — one seat's influence multiplied inside a
 *  disc that fades back to 1 as it expires (a slain marshal's suppression, a
 *  rift-lord's door, a liberated crusade hold). `key` names the seat it
 *  belongs to (a seat index, a crusade id — whatever the overlay keys by). */
export interface FieldMod {
  key: number | string;
  at: MapCoord;
  radius: number;
  mul: number;
  from: number;
  until: number;
}

/** Deterministic 2D value noise in [0,1]: hashed lattice corners, smoothstep
 *  bilinear blend, two octaves. Pure in (salt, x, y) — the fields' fabric. */
export function fieldNoise01(salt: number, x: number, y: number): number {
  const h = (gx: number, gy: number): number => {
    let v = (salt ^ 0x9e3779b9) >>> 0;
    v = Math.imul(v ^ (gx | 0), 0x85ebca6b) >>> 0;
    v = Math.imul(v ^ (gy | 0), 0xc2b2ae35) >>> 0;
    v ^= v >>> 13; v = Math.imul(v, 0x27d4eb2f) >>> 0; v ^= v >>> 15;
    return (v >>> 0) / 4294967296;
  };
  const sample = (px: number, py: number): number => {
    const gx = Math.floor(px), gy = Math.floor(py);
    const fx = px - gx, fy = py - gy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = h(gx, gy), b = h(gx + 1, gy), c = h(gx, gy + 1), d = h(gx + 1, gy + 1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  };
  return 0.66 * sample(x, y) + 0.34 * sample(x * 2.13 + 51.7, y * 2.13 - 17.3);
}

/** Where a seat's influence noise is LOOKING right now: velocity along a
 *  heading that slowly wheels (`wheel` radians of swing over `turnPeriod`
 *  seconds) — the fronts crawl forever; nobody marches one way for good. */
export function driftOffset(
  heading: number, turnPeriod: number, vel: number, t: number, wheel = 1.2,
): { x: number; y: number } {
  const ang = heading + Math.sin((t / turnPeriod) * Math.PI * 2) * wheel;
  return { x: Math.cos(ang) * vel * t, y: Math.sin(ang) * vel * t };
}

/** The anchor well: influence multiplier at a seat-of-power coordinate, easing
 *  out over `range` — each seat is strongest around its own throne/heart. */
export function anchorWell(coord: MapCoord, at: MapCoord, amp: number, range: number): number {
  return 1 + amp * Math.exp(-Math.hypot(coord.x - at.x, coord.y - at.y) / range);
}

/** Fold every live modifier disc belonging to `key` into one multiplier at a
 *  coordinate. A modifier eases back to 1 as it expires — the field HEALS.
 *  Zero-allocation (hot: called per lattice cell); pass `key` = undefined to
 *  apply every mod regardless of seat. */
export function decayingModsMul(
  mods: readonly FieldMod[], coord: MapCoord, t: number, key?: number | string,
): number {
  let mul = 1;
  for (const m of mods) {
    if ((key !== undefined && m.key !== key) || t >= m.until) continue;
    const d = Math.hypot(coord.x - m.at.x, coord.y - m.at.y);
    if (d > m.radius) continue;
    const life = (m.until - t) / (m.until - m.from);   // 1 → 0 as it fades
    mul *= 1 + (m.mul - 1) * Math.min(1, life * 1.4);
  }
  return mul;
}

/** THE WORLD-ANCHORED RENDER LATTICE: a wash-cell window over the given extent
 *  points (+pad), on a cell ladder (base × 2^k) so growth never re-tiles —
 *  the map's paint is a WINDOW onto the infinite field, never the field. */
export function latticeWindow(
  pts: ReadonlyArray<MapCoord>, pad: number, cellBase: number, maxCellsPerAxis: number,
): { ox: number; oy: number; cell: number; maxX: number; maxY: number } | null {
  if (!pts.length) return null;
  let minX = pts[0].x, maxX = pts[0].x, minY = pts[0].y, maxY = pts[0].y;
  for (const p of pts) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  minX -= pad; maxX += pad; minY -= pad; maxY += pad;
  let cell = cellBase;
  while (Math.max(maxX - minX, maxY - minY) / cell > maxCellsPerAxis) cell *= 2;
  const ox = Math.floor(minX / cell) * cell, oy = Math.floor(minY / cell) * cell;
  return { ox, oy, cell, maxX, maxY };
}

/** The advance direction of a seat's influence at a point — the field gradient
 *  by central finite difference, normalized. `downhill` (default) points INTO
 *  the rival (the way the push is headed). */
export function influenceGrad(
  f: (c: MapCoord) => number, at: MapCoord, e = 14, downhill = true,
): { ux: number; uy: number } {
  const gx = f({ x: at.x + e, y: at.y }) - f({ x: at.x - e, y: at.y });
  const gy = f({ x: at.x, y: at.y + e }) - f({ x: at.x, y: at.y - e });
  const len = Math.hypot(gx, gy) || 1;
  const s = downhill ? -1 : 1;
  return { ux: s * gx / len, uy: s * gy / len };
}

/** One thrust arrow (shaft + head) as SVG — the map's "who is gaining here". */
export function thrustArrowSvg(
  x: number, y: number, ux: number, uy: number, color: string,
  len = 26, width = 2.2, opacity = 0.85,
): string {
  const x2 = x + ux * len, y2 = y + uy * len;
  return `<path d="M ${x.toFixed(0)} ${y.toFixed(0)} L ${x2.toFixed(0)} ${y2.toFixed(0)}" stroke="${color}" stroke-width="${width}" opacity="${opacity}"/>` +
    `<path d="M ${x2.toFixed(0)} ${y2.toFixed(0)} l ${(-ux * 7 - uy * 4).toFixed(1)} ${(-uy * 7 + ux * 4).toFixed(1)} l ${(uy * 8).toFixed(1)} ${(-ux * 8).toFixed(1)} Z" fill="${color}" opacity="${opacity}"/>`;
}
