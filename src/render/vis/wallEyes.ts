// ---------------------------------------------------------------------------
// WALL EYES — the watching shell (RegionVisualSpec.eyes): eyes grown INTO the
// wall mass itself. Two halves, one geometry:
//   • the ground baker lays the SOCKETS (rim, sclera, lid crease — static,
//     chunk-baked, in the wall's own ramp: ground.ts bakeWallEyes);
//   • this pass gives the sockets their PUPILS, live — every iris drearily
//     SEEKING the hero (the ocularKnot lag idiom: aim wobbles around the
//     true bearing), blinking on its own clock.
// Parity by construction: both halves call wallEyeSockets() with the same
// grid indices, so a pupil never drifts off its white. Seeded on grid
// coordinates ONLY (never a baker seed) for exactly that reason.
//
// Cost: one regionAt lookup per visible cell (a view is ~1.5k cells), then
// work only on the sparse eye-flagged patches the generator laid.
// ---------------------------------------------------------------------------

import type { World } from '../../engine/world';
import { GridWalkField } from '../../world/gridWalk';
import { regionKind } from '../../world/regions';
import { withAlpha } from './color';
import { VIS_CFG } from './visConfig';

const hash01 = (a: number, b: number): number => {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
};

export interface WallEyeSocket { x: number; y: number; r: number }

/** The sockets one wall cell grows (0–2; many cells stay blind so a patch
 *  reads as flesh that HAPPENS to have opened, not wallpaper). World-space
 *  centers from grid indices — bake and live pass agree byte-for-byte. */
export function wallEyeSockets(gx: number, gy: number, cell: number): WallEyeSocket[] {
  const out: WallEyeSocket[] = [];
  const gate = hash01(gx, gy * 31 + 7);
  if (gate < 0.45) return out;
  const n = gate > 0.86 ? 2 : 1;
  for (let i = 0; i < n; i++) {
    out.push({
      x: (gx + 0.22 + 0.56 * hash01(gx * 3 + i, gy)) * cell,
      y: (gy + 0.22 + 0.56 * hash01(gx, gy * 5 + i + 3)) * cell,
      r: cell * (0.13 + 0.11 * hash01(gx + i * 7, gy + 11)),
    });
  }
  return out;
}

export class WallEyes {
  /** Draw under the caller's world-space camera transform, over the baked
   *  floor/walls, under doodads and actors. */
  draw(ctx: CanvasRenderingContext2D, world: World, camX: number, camY: number, vw: number, vh: number): void {
    const C = VIS_CFG.wallEyes;
    const walk = world.walk;
    if (!(walk instanceof GridWalkField)) return;
    const hero = world.player;
    const t = world.time;
    const cell = walk.cell;
    const x0 = Math.max(0, Math.floor(camX / cell));
    const y0 = Math.max(0, Math.floor(camY / cell));
    const x1 = Math.min(walk.cols - 1, Math.floor((camX + vw) / cell));
    const y1 = Math.min(walk.rows - 1, Math.floor((camY + vh) / cell));
    for (let gy = y0; gy <= y1; gy++) {
      for (let gx = x0; gx <= x1; gx++) {
        const vis = regionKind(walk.regionAt(gx * cell + 1, gy * cell + 1))?.visual;
        if (!vis?.eyes) continue;
        for (const s of wallEyeSockets(gx, gy, cell)) {
          // Dreary pursuit: the pupil meanders around the hero's true bearing.
          const la = Math.atan2(hero.pos.y - s.y, hero.pos.x - s.x);
          const aim = la + Math.sin(t * 0.3 + gx * 1.7 + gy * 2.3) * 0.24;
          const blinkCyc = (t * C.blinkRate + hash01(gx * 5, gy * 3)) % 1;
          const lid = blinkCyc > 0.9 ? Math.sin(((blinkCyc - 0.9) / 0.1) * Math.PI) : 0;
          if (lid > 0.85) continue; // the crease is baked; a full blink just empties it
          const px = s.x + Math.cos(aim) * s.r * 0.3;
          const py = s.y + Math.sin(aim) * s.r * 0.3;
          ctx.fillStyle = withAlpha(C.iris, C.alpha * (1 - lid));
          ctx.beginPath();
          ctx.arc(px, py, s.r * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = withAlpha(C.pupil, C.alpha * (1 - lid));
          ctx.beginPath();
          ctx.arc(px, py, s.r * 0.24, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}
