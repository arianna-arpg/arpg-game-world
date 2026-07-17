// ---------------------------------------------------------------------------
// EDGE OVERLAYS — the one shape every full-screen wash shares, baked.
//
// The status vignettes, the pall wash, the blind iris, the frost rim, the
// low-life seep and the spore-bloom vignette are all the SAME drawing: a
// radial gradient from a clear centre to a coloured screen edge, pulsing by
// alpha. Each used to mint a fresh full-screen CanvasGradient and rasterize
// it EVERY FRAME — an allocation per frame per overlay, and a whole-surface
// gradient fill per frame (cheap on some GPUs, a real per-frame tax on
// others; on top of a fight's churn it reads as "statuses stutter").
//
// Here the profile bakes ONCE per (shape × palette) into a SMALL sprite —
// radial falloffs are resolution-independent, so a bakeH-tall sprite
// stretched to the canvas is pixel-equivalent to the direct fill (output
// quantization, the only banding source, is unchanged) — and the per-frame
// cost becomes one drawImage with globalAlpha carrying the pulse (the
// per-disc bake lesson from vis/painters.ts, applied to the screen itself).
//
// Sprites live in the shared bake LRU (vis/sprites.ts): evicted, released
// and censused like every other bake. Animated shapes (a tightening iris, a
// systole pressing inward) QUANTIZE their moving parameter into the key —
// the quantum is a visConfig lever; the LRU absorbs the handful of steps a
// beat sweeps through.
//
// Callers describe the overlay as DATA (stops + centre fraction); nothing
// here knows any status, weather or field by name.
// ---------------------------------------------------------------------------

import { baked } from './sprites';
import { VIS_CFG } from './visConfig';

export interface EdgeOverlaySpec {
  /** Stable identity for the bake (quantize every moving input into it). */
  key: string;
  /** Clear-centre radius as a fraction of min(w, h) — 0 floods the middle. */
  innerFrac: number;
  /** Gradient stops, colours carrying their OWN alpha (rgba/#rrggbbaa) —
   *  the live pulse rides ctx.globalAlpha at draw, scaling all of them. */
  stops: readonly (readonly [number, string])[];
  /** Outer radius as a fraction of hypot(w, h)/2 (default 1 — the corner). */
  outerFrac?: number;
}

/** Quantize a 0..1 parameter for key-building (default grain in visConfig). */
export function qFrac(v: number, step: number = VIS_CFG.overlays.quantum): number {
  return Math.round(v / step) * step;
}

/** Quantize one rgb channel for key-building. */
export function qChan(v: number, step: number = VIS_CFG.overlays.colorQuantum): number {
  return Math.min(255, Math.round(v / step) * step);
}

/** Draw the overlay over the whole canvas. One blit; alpha is the pulse. */
export function drawEdgeOverlay(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  spec: EdgeOverlaySpec, alpha: number,
): void {
  if (alpha <= 0.004 || w <= 0 || h <= 0) return;
  const C = VIS_CFG.overlays;
  // Aspect-bucketed bake: the gradient is scale-free, so only the FRAME
  // SHAPE needs to match. Buckets keep a resize/zoom from minting sprites
  // per pixel of width.
  const aspect = Math.max(0.5, Math.min(4, w / h));
  const aq = Math.round(aspect * C.aspectQ) / C.aspectQ;
  const bh = C.bakeH;
  const bw = Math.max(2, Math.round(bh * aq));
  const spr = baked(`ovl|${spec.key}|${aq}`, bw, bh, (c) => {
    // baked() centres the origin; the overlay bakes in top-left space.
    c.translate(-bw / 2, -bh / 2);
    const inner = Math.max(0, spec.innerFrac) * Math.min(bw, bh);
    const outer = (spec.outerFrac ?? 1) * Math.hypot(bw, bh) / 2;
    const g = c.createRadialGradient(bw / 2, bh / 2, Math.min(inner, outer),
      bw / 2, bh / 2, Math.max(outer, inner + 0.5));
    for (const [at, col] of spec.stops) g.addColorStop(at, col);
    c.fillStyle = g;
    c.fillRect(0, 0, bw, bh);
  });
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.drawImage(spr, 0, 0, w, h);
  ctx.globalAlpha = prev;
}
