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

/** Monotonic counter bumped by clearBakes() so external weak memos know when
 *  unlinked bakes were flushed even at BAKE_SCALE 1. */
export let bakeEpoch = 0;

let shadowRef: HTMLCanvasElement | null = null;
let shadowScale = 0;
let lastGlowColor = '';
let lastGlowRef: HTMLCanvasElement | null = null;
let lastGlowScale = 0;
let lastShadowDir = NaN;
let lastShadowCos = 1;
let lastShadowSin = 0;

/** THE BAKE SCALE (capture rigs only — render/vis/bakeScale.ts): bakes made
 *  while this exceeds 1 carry that many device pixels per world unit, so a
 *  close camera keeps bodies crisp. Each such canvas still REPORTS its
 *  logical size (width/height getters) and is tagged with `__bake`, and the
 *  drawImage shim maps every draw of it back to logical units, so no painter
 *  or consumer sees a difference. 1 = the live game's bakes, untouched. */
export const BAKE_SCALE = { value: 1 };
/** The native size accessors, read on first use: headless rigs import this
 *  module before any canvas exists (and never bake above scale 1). */
let nativeSize: { w?: PropertyDescriptor; h?: PropertyDescriptor } | null = null;
const canvasSize = (): { w?: PropertyDescriptor; h?: PropertyDescriptor } => nativeSize ??= {
  w: Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'width'),
  h: Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'height'),
};

/** A canvas whose bitmap is `s`× its logical size (see BAKE_SCALE). */
function scaledCanvas(w: number, h: number, s: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  const native = canvasSize();
  let lw = w, lh = h;
  c.width = Math.max(2, Math.ceil(w * s));
  c.height = Math.max(2, Math.ceil(h * s));
  Object.defineProperty(c, 'width', {
    configurable: true,
    get: () => lw,
    set: (v: number) => { lw = v; native.w?.set?.call(c, Math.ceil(v * s)); },
  });
  Object.defineProperty(c, 'height', {
    configurable: true,
    get: () => lh,
    set: (v: number) => { lh = v; native.h?.set?.call(c, Math.ceil(v * s)); },
  });
  (c as HTMLCanvasElement & { __bake?: number }).__bake = s;
  return c;
}

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
    if (oldest === 'shadow') shadowRef = null;
    else if (victim && victim === lastGlowRef) { lastGlowRef = null; lastGlowColor = ''; }
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
    // LRU touch only above 75% capacity to avoid 3,000+/frame Map tombstone churn.
    if (cache.size > ((VIS_CFG.sprite.maxEntries * 3) >> 2)) {
      cache.delete(key);
      cache.set(key, hit);
    }
    return hit;
  }
  const s = BAKE_SCALE.value;
  let c: HTMLCanvasElement;
  if (s > 1) c = scaledCanvas(Math.max(2, Math.ceil(w)), Math.max(2, Math.ceil(h)), s);
  else {
    c = document.createElement('canvas');
    c.width = Math.max(2, Math.ceil(w));
    c.height = Math.max(2, Math.ceil(h));
  }
  const ctx = c.getContext('2d')!;
  if (s > 1) ctx.scale(s, s);   // BAKE_SCALE: painters keep drawing in logical units
  ctx.translate(c.width / 2, c.height / 2);
  paint(ctx, c.width, c.height);
  cache.set(key, c);
  if (cache.size > VIS_CFG.sprite.maxEntries) {
    // Evict the stalest entry (Map preserves insertion order) and release
    // its backing store NOW: every hit near cap LRU-touches, so a victim is
    // stale — nothing still draws it. A crown-dense forest churns
    // this cache by the hundreds; left to the GC, the evicted pixels were
    // the last standing source of the position-4 collection spike.
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) {
      const victim = cache.get(oldest);
      if (victim) releaseCanvas(victim);
      cache.delete(oldest);
      if (oldest === 'shadow') shadowRef = null;
      else if (victim && victim === lastGlowRef) { lastGlowRef = null; lastGlowColor = ''; }
    }
  }
  return c;
}

/** Drop every bake (dev/HMR hook; zone loads do NOT need this). Entries are
 *  only unlinked, never released — a painter-side hold on a baked sprite
 *  across this flush must keep drawing, not throw on a zeroed canvas. */
export function clearBakes(): void {
  cache.clear();
  bakeEpoch++;
  shadowRef = null;
  shadowScale = 0;
  lastGlowRef = null;
  lastGlowColor = '';
  lastGlowScale = 0;
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
  const s = BAKE_SCALE.value;
  if (lastGlowRef && lastGlowRef.width > 0 && lastGlowColor === color && lastGlowScale === s) {
    return lastGlowRef;
  }
  const spr = baked(`glow|${color}`, 64, 64, (ctx) => {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 31);
    g.addColorStop(0, withAlpha(color, 0.9));
    g.addColorStop(0.35, withAlpha(color, 0.38));
    g.addColorStop(1, withAlpha(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-32, -32, 64, 64);
  });
  lastGlowColor = color;
  lastGlowRef = spr;
  lastGlowScale = s;
  return spr;
}

/** The universal soft shadow blob (black radial falloff, squashed at draw). */
export function shadowSprite(): HTMLCanvasElement {
  if (shadowRef && shadowRef.width > 0 && shadowScale === BAKE_SCALE.value) return shadowRef;
  shadowScale = BAKE_SCALE.value;
  shadowRef = baked('shadow', 64, 64, (ctx) => {
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 30);
    g.addColorStop(0, 'rgba(0,0,0,0.85)');
    g.addColorStop(0.6, 'rgba(0,0,0,0.45)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-32, -32, 64, 64);
  });
  return shadowRef;
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
  if (dir !== lastShadowDir) {
    lastShadowDir = dir;
    lastShadowCos = Math.cos(dir);
    lastShadowSin = Math.sin(dir);
  }
  ctx.save();
  ctx.transform(lastShadowCos, lastShadowSin, -lastShadowSin, lastShadowCos, x, y);
  ctx.globalAlpha = alpha;
  const reach = radius * (0.8 + len);
  ctx.drawImage(s, -radius * 0.8, -radius * 0.62, radius * 0.8 + reach, radius * 1.24);
  ctx.restore();
  ctx.globalAlpha = 1;
}

/** Batch variant of drawLongShadow that captures the base transform once and
 *  applies direct setTransform per body, avoiding per-body save/restore. */
export function drawLongShadowBatch(ctx: CanvasRenderingContext2D,
  items: readonly { pos: { x: number; y: number }; radius: number }[],
  radiusMul: number, dir: number, len: number, alpha: number,
  gate?: { left: number; minR: number }): void {
  if (!items.length || (gate && gate.left <= 0)) return;
  const base = typeof ctx.getTransform === 'function' ? ctx.getTransform() : null;
  if (!base) {
    for (const d of items) {
      if (gate) {
        if (d.radius < gate.minR) continue;
        if (gate.left <= 0) break;
        gate.left--;
      }
      drawLongShadow(ctx, d.pos.x, d.pos.y, d.radius * radiusMul, dir, len, alpha);
    }
    return;
  }
  const s = shadowSprite();
  if (dir !== lastShadowDir) {
    lastShadowDir = dir;
    lastShadowCos = Math.cos(dir);
    lastShadowSin = Math.sin(dir);
  }
  const ba = base.a, bb = base.b, bc = base.c, bd = base.d, be = base.e, bf = base.f;
  const a = ba * lastShadowCos + bc * lastShadowSin;
  const b = bb * lastShadowCos + bd * lastShadowSin;
  const c = -ba * lastShadowSin + bc * lastShadowCos;
  const dMat = -bb * lastShadowSin + bd * lastShadowCos;
  const wMul = 1.6 + len;
  let drew = false;
  ctx.globalAlpha = alpha;
  for (const item of items) {
    if (gate) {
      if (item.radius < gate.minR) continue;
      if (gate.left <= 0) break;
      gate.left--;
    }
    const r = item.radius * radiusMul;
    const ox = item.pos.x, oy = item.pos.y;
    ctx.setTransform(a, b, c, dMat, ba * ox + bc * oy + be, bb * ox + bd * oy + bf);
    ctx.drawImage(s, -r * 0.8, -r * 0.62, r * wMul, r * 1.24);
    drew = true;
  }
  if (drew) ctx.setTransform(ba, bb, bc, bd, be, bf);
  ctx.globalAlpha = 1;
}

/** Blit a color glow centered at (x, y) with world radius r. Additive when
 *  `lighter` is true (the emissive look); normal alpha otherwise. */
export function drawGlow(ctx: CanvasRenderingContext2D, x: number, y: number,
  r: number, color: string, alpha: number, lighter = true): void {
  const s = glowSprite(color);
  const prevAlpha = ctx.globalAlpha;
  const prevOp = ctx.globalCompositeOperation;
  if (lighter && prevOp !== 'lighter') ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;
  ctx.drawImage(s, x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = prevAlpha;
  if (lighter && prevOp !== 'lighter') ctx.globalCompositeOperation = prevOp;
}
