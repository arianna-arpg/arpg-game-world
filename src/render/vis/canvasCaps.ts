// ---------------------------------------------------------------------------
// CANVAS CAPABILITY PROBE — measure the browser, never sniff it.
//
// Canvas 2D features do not cost the same everywhere: the non-separable
// blend modes ('saturation', 'hue', …) are GPU-composited in some engines
// and a full-surface software fallback in others (the classic Firefox
// cliff), and what is free on one machine is a per-frame stall on another.
// Any visual that leans on such a feature per frame needs an honest answer
// to "is this fast HERE?" — so this module times each feature ONCE on a
// small offscreen surface (forced to completion with a 1×1 readback; a
// deferred command queue otherwise reports every op as free) and compares
// it against a plain source-over fill of the same area.
//
// Everything is DATA: a feature is a CapProbe row (id + how to exercise
// it), the slow/fast verdict is a per-probe multiplier in
// VIS_CFG.caps.slowFactor, and consumers ask `canvasCap(id)` — true means
// "fast here, use the pretty path". Adding a future probe (ctx.filter,
// shadowBlur, …) is one row + one consumer branch. Render-only: the sim
// never imports this, so verdicts can never move a baseline.
//
// Verdicts are per-SESSION (probed lazily on first ask, ~2-4ms total):
// drivers and browsers change under us, so nothing is persisted.
// ---------------------------------------------------------------------------

import { VIS_CFG } from './visConfig';

interface CapProbe {
  /** Exercise the feature over the whole probe surface once. */
  run: (ctx: CanvasRenderingContext2D, size: number) => void;
}

/** The probe registry. Each row must paint ~the same pixel count as the
 *  baseline fill so ms-per-op compares apples to apples. */
const CAP_PROBES: Record<string, CapProbe> = {
  /** Plain fill — the normalizer every verdict divides by. */
  baseline: {
    run: (ctx, size) => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(120,124,132,0.5)';
      ctx.fillRect(0, 0, size, size);
    },
  },
  /** Non-separable blend (the pall's desaturate). Slow engines drop the
   *  whole surface to a software compositor for these. */
  blendSaturation: {
    run: (ctx, size) => {
      ctx.globalCompositeOperation = 'saturation';
      ctx.fillStyle = 'rgba(128,128,128,0.5)';
      ctx.fillRect(0, 0, size, size);
      ctx.globalCompositeOperation = 'source-over';
    },
  },
};

let results: Record<string, number> | null = null;

/** Time one probe: reps × run + a 1×1 readback per rep (the readback forces
 *  the deferred queue to completion — without it a GPU-backed canvas reports
 *  every op as ~0ms and the probe learns nothing). */
function timeProbe(ctx: CanvasRenderingContext2D, size: number, probe: CapProbe, reps: number): number {
  probe.run(ctx, size); // warm (shader compile, surface promotion)
  ctx.getImageData(0, 0, 1, 1);
  const t0 = performance.now();
  for (let i = 0; i < reps; i++) probe.run(ctx, size);
  ctx.getImageData(0, 0, 1, 1);
  return (performance.now() - t0) / reps;
}

function ensureProbed(): Record<string, number> {
  if (results) return results;
  results = {};
  try {
    const C = VIS_CFG.caps;
    const c = document.createElement('canvas');
    c.width = C.probeSize; c.height = C.probeSize;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (!ctx) return results;
    for (const id in CAP_PROBES) {
      results[id] = timeProbe(ctx, C.probeSize, CAP_PROBES[id], C.probeReps);
    }
    // Release the probe surface eagerly (the steward doctrine).
    c.width = 0; c.height = 0;
  } catch {
    // A refused context or a throwing readback leaves `results` sparse —
    // canvasCap() then answers true (never withhold the authored look on
    // a probe failure; the fallback exists for measured slowness only).
  }
  return results;
}

/** Is `feature` FAST here? True = use the authored path. Unknown features
 *  and failed probes answer true — the fallback is for measured slowness. */
export function canvasCap(feature: string): boolean {
  const r = ensureProbed();
  const base = r.baseline;
  const own = r[feature];
  if (base === undefined || own === undefined || base <= 0) return true;
  return own <= base * (VIS_CFG.caps.slowFactor[feature] ?? VIS_CFG.caps.slowFactorDefault);
}

/** Dev/QA readout: raw per-probe ms and the verdicts. */
export function canvasCapsReport(): { ms: Record<string, number>; verdict: Record<string, boolean> } {
  const r = ensureProbed();
  const verdict: Record<string, boolean> = {};
  for (const id in r) if (id !== 'baseline') verdict[id] = canvasCap(id);
  return { ms: { ...r }, verdict };
}
