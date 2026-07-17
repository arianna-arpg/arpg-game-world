// ---------------------------------------------------------------------------
// THE FOG LAYER — the render half of the fog fabric (engine/fog.ts).
//
// Draws each bank's LIVE lobe states — the exact same states the gameplay
// hit-test reads, so what you see is what veils you. Two passes:
//   'under' (before actors, after terrain): the body of the fog, hugging the
//           ground, misting doodads/chests/exits while combat telegraphs and
//           bodies stay readable above it;
//   'over'  (after canopies, before roofs): the tall share of each bank —
//           a looser, lifted echo that wraps actors walking deep inside.
// Each lobe is two blits of one BAKED soft radial sprite (per-color cache,
// the fogCloud billow lesson: blits, not per-frame gradient allocations).
// View-culled by bank bound; ablatable as pass 'fog' (VIS_ABLATE).
// ---------------------------------------------------------------------------

import type { FogField } from '../../engine/fog';
import { VIS_CFG } from './visConfig';
import { registerVisCache } from './caches';
import { releaseCanvas } from './sprites';

const SPRITES = new Map<string, HTMLCanvasElement>();

registerVisCache({
  id: 'fogBillows',
  count: () => SPRITES.size,
  bytes: () => { let b = 0; for (const c of SPRITES.values()) b += c.width * c.height * 4; return b; },
  onZoneSwap: () => { if (VIS_CFG.memory.billowClearOnSwap) { for (const c of SPRITES.values()) releaseCanvas(c); SPRITES.clear(); } },
  onRunSwap: () => { for (const c of SPRITES.values()) releaseCanvas(c); SPRITES.clear(); },
});

/** One soft billow sprite per fog color: dense heart, long dissolving rim.
 *  The rim's zero-stop is what sells dissipation — lobes thin into nothing
 *  rather than ending at a circle. */
function billowSprite(color: string): HTMLCanvasElement {
  let spr = SPRITES.get(color);
  if (spr) return spr;
  const size = VIS_CFG.fog.sprite;
  spr = document.createElement('canvas');
  spr.width = size;
  spr.height = size;
  const c = spr.getContext('2d')!;
  const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, color + 'd9');
  g.addColorStop(0.45, color + '8c');
  g.addColorStop(0.78, color + '38');
  g.addColorStop(1, color + '00');
  c.fillStyle = g;
  c.fillRect(0, 0, size, size);
  SPRITES.set(color, spr);
  return spr;
}

/** Draw one pass of the living fog. Runs inside the world transform. */
export function drawFogLayer(
  ctx: CanvasRenderingContext2D,
  fog: FogField,
  pass: 'under' | 'over',
  camX: number,
  camY: number,
  vw: number,
  vh: number,
): void {
  const cfg = VIS_CFG.fog;
  const pad = cfg.cullPad;
  const weatherLift = 1 + fog.weatherK * cfg.weatherAlphaBoost;
  for (const b of fog.banks) {
    if (b.fade <= 0.01) continue;
    // View cull on the bank's live bound.
    if (b.pos.x + b.bound < camX - pad || b.pos.x - b.bound > camX + vw + pad
      || b.pos.y + b.bound < camY - pad || b.pos.y - b.bound > camY + vh + pad) continue;
    const def = b.def;
    const overFrac = def.overFrac ?? 0.35;
    const share = pass === 'over' ? overFrac * cfg.overMul : (1 - overFrac) * cfg.underMul;
    if (share <= 0.01) continue;
    const peak = (def.alpha ?? 0.34) * share * weatherLift;
    const spr = billowSprite(def.color ?? '#aab6c2');
    for (const l of b.live) {
      if (l.a <= 0.02) continue;
      // The over pass lifts and loosens: taller, softer, slightly northward
      // (the fake-2D "up" of every crown/roof in the scene).
      const r = pass === 'over' ? l.r * 1.2 : l.r;
      const y = pass === 'over' ? l.y - l.r * 0.16 : l.y;
      const a = Math.min(1, l.a * peak);
      if (a <= 0.01) continue;
      // Two blits: a wide dissolving skirt + the denser heart riding it.
      ctx.globalAlpha = a * 0.5;
      ctx.drawImage(spr, l.x - r * 1.5, y - r * 1.5, r * 3, r * 3);
      ctx.globalAlpha = a;
      ctx.drawImage(spr, l.x - r * 0.95, y - r * 0.95, r * 1.9, r * 1.9);
    }
  }
  ctx.globalAlpha = 1;
}
