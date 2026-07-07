// ---------------------------------------------------------------------------
// The sprite bake cache. Every expensive look (shaded bodies, radial glows,
// soft shadows) is painted ONCE into an offscreen canvas and blitted forever
// after — the runtime cost of the whole facelift is drawImage calls.
//
// Keys are plain strings that encode everything the bake depends on; anything
// that changes the pixels must be in the key. LRU-capped so runaway variant
// spaces (per-color glows, per-radius bodies) can't leak.
// ---------------------------------------------------------------------------

import { withAlpha } from './color';
import { VIS_CFG } from './visConfig';

// (bodies bake through vis/body.ts; this module owns the cache + primitives)

const cache = new Map<string, HTMLCanvasElement>();

/** Fetch-or-bake. `paint` runs once with the canvas's 2d context, origin at
 *  the canvas CENTER (translate applied), then the result is cached under
 *  `key`. Width/height are ceil'd; contexts are untransformed otherwise. */
export function baked(key: string, w: number, h: number,
  paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): HTMLCanvasElement {
  const hit = cache.get(key);
  if (hit) {
    // LRU touch: re-insert at the tail.
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.ceil(w));
  c.height = Math.max(2, Math.ceil(h));
  const ctx = c.getContext('2d')!;
  ctx.translate(c.width / 2, c.height / 2);
  paint(ctx, c.width, c.height);
  cache.set(key, c);
  if (cache.size > VIS_CFG.sprite.maxEntries) {
    // Evict the stalest entry (Map preserves insertion order).
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  return c;
}

/** Drop every bake (dev/HMR hook; zone loads do NOT need this). */
export function clearBakes(): void {
  cache.clear();
}

// --- Shared primitive sprites ------------------------------------------------

/** A soft radial glow disc in `color` — THE additive underlay for projectiles,
 *  emissive doodads and light bloom. Unit sprite: blit scaled. */
export function glowSprite(color: string): HTMLCanvasElement {
  return baked(`glow|${color}`, 64, 64, (ctx) => {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 31);
    g.addColorStop(0, withAlpha(color, 0.9));
    g.addColorStop(0.35, withAlpha(color, 0.38));
    g.addColorStop(1, withAlpha(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-32, -32, 64, 64);
  });
}

/** The universal soft shadow blob (black radial falloff, squashed at draw). */
export function shadowSprite(): HTMLCanvasElement {
  return baked('shadow', 64, 64, (ctx) => {
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 30);
    g.addColorStop(0, 'rgba(0,0,0,0.85)');
    g.addColorStop(0.6, 'rgba(0,0,0,0.45)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-32, -32, 64, 64);
  });
}

/** Blit a soft contact shadow under a body of `radius` at (x, y). */
export function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number,
  radius: number, alphaMul = 1): void {
  const s = shadowSprite();
  const w = radius * 2 * VIS_CFG.shadow.scale;
  const h = w * VIS_CFG.shadow.squash;
  ctx.globalAlpha = VIS_CFG.shadow.alpha * alphaMul;
  ctx.drawImage(s, x - w / 2, y + radius * VIS_CFG.shadow.dropY - h / 2, w, h);
  ctx.globalAlpha = 1;
}

/** Blit a color glow centered at (x, y) with world radius r. Additive when
 *  `lighter` is true (the emissive look); normal alpha otherwise. */
export function drawGlow(ctx: CanvasRenderingContext2D, x: number, y: number,
  r: number, color: string, alpha: number, lighter = true): void {
  const s = glowSprite(color);
  ctx.save();
  if (lighter) ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;
  ctx.drawImage(s, x - r, y - r, r * 2, r * 2);
  ctx.restore();
}
