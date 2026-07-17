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
import { DAY_LENGTH, dayCycle } from '../../world/daynight';
import { VIS_CFG } from './visConfig';
import { registerVisCache } from './caches';

// (bodies bake through vis/body.ts; this module owns the cache + primitives)

const cache = new Map<string, HTMLCanvasElement>();

/** Shrink the LRU to its `keep` NEWEST entries, releasing every evicted
 *  backing store (the steward's zone-swap floor: a session that walks many
 *  biomes must not hold every biome's bestiary and crowns forever — the
 *  next zone re-bakes what it actually fields, the floor keeps the
 *  biome-agnostic working set warm). Same safety argument as the in-cap
 *  eviction below: eviction takes the LRU-STALEST first, and every draw
 *  re-fetches through baked(). */
export function trimBakes(keep: number): void {
  while (cache.size > Math.max(0, keep)) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    const victim = cache.get(oldest);
    if (victim) releaseCanvas(victim);
    cache.delete(oldest);
  }
}

registerVisCache({
  id: 'sprites',
  count: () => cache.size,
  bytes: () => { let b = 0; for (const c of cache.values()) b += c.width * c.height * 4; return b; },
  onZoneSwap: () => trimBakes(VIS_CFG.memory.spriteFloorOnSwap),
  onRunSwap: () => trimBakes(0),
});

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
    // Evict the stalest entry (Map preserves insertion order) and release
    // its backing store NOW: every hit LRU-touches, so a victim is ≥cap
    // bakes stale — nothing still draws it. A crown-dense forest churns
    // this cache by the hundreds; left to the GC, the evicted pixels were
    // the last standing source of the position-4 collection spike.
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) {
      const victim = cache.get(oldest);
      if (victim) releaseCanvas(victim);
      cache.delete(oldest);
    }
  }
  return c;
}

/** Drop every bake (dev/HMR hook; zone loads do NOT need this). Entries are
 *  only unlinked, never released — a painter-side hold on a baked sprite
 *  across this flush must keep drawing, not throw on a zeroed canvas. */
export function clearBakes(): void {
  cache.clear();
}

/** Release a cache-owned canvas's backing store NOW (zero its dimensions)
 *  instead of leaving ~800KB of pixels to the GC's leisure. A zone hop
 *  discards a whole chunk cache (60 × chunk²) — left to garbage collection,
 *  several zones' worth piles up in the GPU process and the collection storm
 *  lands mid-sample on whatever zone runs NEXT (the perf sweep read that as
 *  a "heavy biome" at a fixed matrix position). Callers must drop every
 *  reference to the canvas right after. */
export function releaseCanvas(c: HTMLCanvasElement): void {
  c.width = 0;
  c.height = 0;
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

/** THE SUN'S CAST for a moment of the day: shadow direction SPINS through
 *  the daylight hours (morning shadows point west, evening east), length
 *  stretches when the sun rides low, and night retires the effect. Null =
 *  no directional shadows right now. */
export function sunCast(time: number): { dir: number; len: number; alpha: number } | null {
  const cyc = dayCycle(time);
  if (cyc.light <= 0.12) return null; // night — the moon is too shy for this
  const dayFrac = ((time % DAY_LENGTH) + DAY_LENGTH) % DAY_LENGTH / DAY_LENGTH;
  // The sweep: dawn → dusk rotates the cast half a turn (west → east),
  // biased slightly south so noon shadows still exist.
  const dir = Math.PI * (1.15 - dayFrac * 1.0);
  const low = 1 - cyc.light; // 0 at high noon, →1 toward the horizon
  return {
    dir,
    len: VIS_CFG.shadow.longMin + (VIS_CFG.shadow.longMax - VIS_CFG.shadow.longMin) * low,
    alpha: VIS_CFG.shadow.longAlpha * (0.55 + 0.45 * cyc.light),
  };
}

/** An elongated soft shadow cast along `dir` from a standing body — anchored
 *  at the base so the object stays planted while its shadow reaches. */
export function drawLongShadow(ctx: CanvasRenderingContext2D, x: number, y: number,
  radius: number, dir: number, len: number, alpha: number): void {
  const s = shadowSprite();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(dir);
  ctx.globalAlpha = alpha;
  const reach = radius * (0.8 + len);
  ctx.drawImage(s, -radius * 0.8, -radius * 0.62, radius * 0.8 + reach, radius * 1.24);
  ctx.restore();
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
