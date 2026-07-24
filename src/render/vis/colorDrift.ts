// ---------------------------------------------------------------------------
// THE COLOR DRIFT — bodies whose color is WEATHER, not identity. A look may
// name a registered drift palette (LookDef.drift); the drawn body's base
// color then MORPHS through the palette's stops on a slow clock, and the
// whole derived look (part ramps, glows, outlines, live parts) follows,
// because everything downstream already derives from the ONE base color.
//
// The morph is QUANTIZED (VIS_CFG.colorDrift.steps ticks per palette leg) so
// the sprite bake cache sees a small bounded set of colors per look — after
// one full period every tick is baked and the drift costs nothing but blits.
// Texture stipple stays put while the ink changes (body.ts seeds placement
// color-blind), so a starfield shimmers without its stars dancing.
//
// Palettes are an OPEN REGISTRY: the vesperkin debut 'nightsky' / 'aurora' /
// 'starlight', and 'prismatic' stands pre-registered as the lever for a
// future rainbow-keyed faction — one LookDef word away.
// ---------------------------------------------------------------------------

import { hash01 } from '../../engine/hash';
import { mix } from './color';
import type { LookDrift } from './parts';
import { VIS_CFG } from './visConfig';

export interface ColorDriftDef {
  /** Palette stops, cycled first → … → last → first. Two minimum. */
  stops: string[];
  /** Seconds for one full cycle through every stop. */
  periodSec: number;
  /** Per-body phase scatter as a fraction of the period (0 = the whole
   *  faction breathes as one sky; 1 = every body keeps its own hour). */
  desync?: number;
}

/** The drift vocabulary. Keys are open — a look may name any of these, and
 *  new skies join by adding a row (or registerColorDrift from a package). */
export const COLOR_DRIFTS: Record<string, ColorDriftDef> = {
  /** Deep space passing overhead — indigo, violet, nebula, star-blue. */
  nightsky: { periodSec: 22, desync: 0.25, stops: ['#3c3470', '#6a4fae', '#9a5fc8', '#4a5fb8', '#2e3f8e'] },
  /** The polar lights — green through violet to rose, restless. */
  aurora: { periodSec: 14, desync: 0.35, stops: ['#4fd8a8', '#5f9fe8', '#9a6fe0', '#e08fd0'] },
  /** Bright star-stuff — white heat through gold to lilac. */
  starlight: { periodSec: 10, desync: 0.5, stops: ['#f2eeff', '#ffe9c8', '#d8d2ff'] },
  /** The full wheel — the rainbow-keyed lever, standing ready. */
  prismatic: { periodSec: 18, desync: 0.3, stops: ['#e05f5f', '#e0a84f', '#b8d84f', '#4fd8a8', '#4f9fe8', '#a86fe0'] },
};

/** Extend the vocabulary (content packages register their own skies). */
export function registerColorDrift(id: string, def: ColorDriftDef): void {
  COLOR_DRIFTS[id] = def;
}

/** Resolve a drift binding to its CURRENT quantized color. Pure: (binding,
 *  clock, seed) → hex, where the seed desyncs bodies within the shared sky.
 *  Unknown or degenerate palettes fall back to the base color, so a look
 *  can name a drift before its palette ships. */
export function driftColor(drift: LookDrift, base: string, tSec: number, seed = 0): string {
  const def = COLOR_DRIFTS[drift.palette];
  if (!def || def.stops.length < 2) return base;
  const period = Math.max(0.5, drift.period ?? def.periodSec);
  const desync = drift.desync ?? def.desync ?? 0;
  const phase = hash01(seed, 977) * desync * period;
  const n = def.stops.length;
  const steps = Math.max(2, VIS_CFG.colorDrift.steps);
  // Position in the cycle, quantized to (stops × steps) ticks — the bake
  // cache meets a bounded palette rather than a new color every frame.
  const u = (((tSec + phase) / period) % 1 + 1) % 1;
  const q = Math.floor(u * n * steps) / (n * steps);
  const leg = Math.floor(q * n);
  const f = q * n - leg;
  return mix(def.stops[leg], def.stops[(leg + 1) % n], f);
}
