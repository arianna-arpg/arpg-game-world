// ---------------------------------------------------------------------------
// LIGHT SIGHTLINES — the lit-region polygon of a point source against the
// walk grid's sight-blocking cells (wall/rampart/flesh_wall/…): rays march
// outward and stop where a blocksSight region stands, so a hearth's glow
// POOLS at the wall instead of bleeding through it. Windows and parapets
// don't block sight, so an arrow-slit spills light — for free, by data.
//
// Returns null when nothing blocks within reach (the overwhelmingly common
// case) so every caller keeps its cheap plain-disc path. Consumers: the
// light layer's darkness punches and any painter's warm ground halo.
// ---------------------------------------------------------------------------

import type { World } from '../../engine/world';
import { GridWalkField } from '../../world/gridWalk';
import { regionKind } from '../../world/regions';

const RAYS = 48;

/** Does the region cell at world (x, y) stop light? Out-of-grid counts as
 *  blocking (matches the ground baker's convention). */
function blocksAt(wf: GridWalkField, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= wf.cols * wf.cell || y >= wf.rows * wf.cell) return true;
  return !!regionKind(wf.regionAt(x, y))?.blocksSight;
}

/** The polygon of points a light at (x, y) actually reaches within r — or
 *  null when no sight-blocker stands inside the disc (use the plain disc).
 *  Rays overshoot the hit by a third of a cell so the wall's NEAR face still
 *  catches the glow; only the far side stays dark. */
export function litPolygon(world: World, x: number, y: number, r: number):
  { x: number; y: number }[] | null {
  const wf = world.walk instanceof GridWalkField ? world.walk : null;
  if (!wf || r <= 0) return null;
  const cell = wf.cell;

  // Prescan the bounding box: most lights stand in open ground — bail fast.
  let any = false;
  for (let sy = y - r; sy <= y + r + cell && !any; sy += cell) {
    for (let sx = x - r; sx <= x + r + cell; sx += cell) {
      if (blocksAt(wf, sx, sy)) { any = true; break; }
    }
  }
  if (!any) return null;

  const pts: { x: number; y: number }[] = [];
  const step = cell * 0.45;
  let hitAny = false;
  for (let i = 0; i < RAYS; i++) {
    const a = (i / RAYS) * Math.PI * 2;
    const dx = Math.cos(a), dy = Math.sin(a);
    let end = r;
    for (let t = step * 0.5; t <= r; t += step) {
      if (blocksAt(wf, x + dx * t, y + dy * t)) {
        end = Math.min(r, t + cell * 0.3);
        hitAny = true;
        break;
      }
    }
    pts.push({ x: x + dx * end, y: y + dy * end });
  }
  return hitAny ? pts : null;
}

/** Build a clip path from a lit polygon under an (optional) point transform —
 *  shared by the light buffer (screen space) and world-space painters. */
export function polygonPath(poly: { x: number; y: number }[],
  fx: (x: number) => number = x => x, fy: (y: number) => number = y => y): Path2D {
  const path = new Path2D();
  for (let i = 0; i < poly.length; i++) {
    const px = fx(poly[i].x), py = fy(poly[i].y);
    if (i === 0) path.moveTo(px, py); else path.lineTo(px, py);
  }
  path.closePath();
  return path;
}
