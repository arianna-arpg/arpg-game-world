// ---------------------------------------------------------------------------
// THE LIGHTWELL FABRIC — light sources as SURVIVAL infrastructure.
//
// A lightwell is a doodad whose drawn glow is a gameplay contract: stand
// inside the lit reach and it FEEDS your LIGHT survival meter; pooled wells
// are DRAINED by their residents (per resident — two heroes empty one well
// twice as fast), DIM in proportion to what's left, and dissipate at zero.
// Rows are open data over doodad kinds (registerLightwell): the Gloaming's
// spawned kindles and a zone's ambient campfires are the same fabric wearing
// different rows — per-kind data decides who holds a finite pool and who
// burns weak but steady.
//
// DRAWN == TESTED: lightReach() below is THE resolver. The render light
// layer resolves each well's glow through it, and the engine's residence /
// feed test resolves through it, so the pool of light the player SEES is
// exactly the ground that feeds them. (Flicker remains a render-side shimmer
// about this tested mean — well kinds keep their flicker low by convention.)
//
// This module is a PURE LEAF: doodad + visual data types only, no World —
// both the renderer (render/vis/lights.ts) and the engine (world.ts sweep)
// import it without a cycle. Docs: docs/engine/gloaming.md.
// ---------------------------------------------------------------------------

import { clamp } from '../core/math';
import type { Doodad } from './levelgen';
import { DOODAD_VISUALS } from '../data/doodadVisuals';

export interface LightwellDef {
  /** Doodad kind this row governs (open string — runtime kinds welcome). */
  kind: string;
  /** LIGHT meter refill per second granted to EACH resident inside the reach.
   *  Required for residence rows (validated > 0); absent on burst rows —
   *  a flare is drunk in one gulp, never sipped. */
  feed?: number;
  /** Finite power pool in resident-seconds. Omit = STEADY: burns forever,
   *  never dims, never dissipates (the ambient campfire row). */
  pool?: number;
  /** Pool drained per RESIDENT per second (default 1 — the pool reads as
   *  resident-seconds). Two heroes drain one well twice as fast: the
   *  emergent co-op pressure is the point, not a bug. */
  drainPerResident?: number;
  /** Passive pool loss per second, residents or not — an ABANDONED well
   *  gutters on its own clock instead of hogging the event's well cap
   *  forever. Omit = 0: resident-drain only (the kindled wick — a player's
   *  investment never rots). Meaningful only with a pool. */
  decayPerSec?: number;
  /** BURST row — the Descent's light-spot grammar as data: the first body
   *  to trigger it drinks `grant` LIGHT in one gulp and the well is
   *  CONSUMED (flash + text). Bursts are pickups, not shelter: they never
   *  count as light COVER (a spot's glow does not stop the dark's drain —
   *  descent canon), only bodies already CARRYING a light meter pop one
   *  (no flare is wasted in peacetime), and a full meter still consumes
   *  the spot (sloppy routing pays — the descent economy). `on` picks the
   *  trigger surface: 'touch' = the doodad's own body (+BURST_TOUCH_PAD —
   *  run over the crystals), 'reach' = the drawn glow via lightReach
   *  (drawn == tested). Exclusive with feed/pool/decay (validated). */
  burst?: { grant: number; on: 'touch' | 'reach'; text?: string; color?: string };
  /** Dim curve exponent: reach + intensity scale by powerFrac^dimExp
   *  (default 0.5 — area-honest, the glow visibly wanes from the first sip). */
  dimExp?: number;
  /** Reach floor while ANY power remains — a guttering stub still casts a
   *  readable pool (default 0.22). */
  minReachFrac?: number;
  /** Dissipation dressing when a pooled well empties. */
  out?: { text?: string; color?: string };
}

/** The 'touch' trigger's grace pad (px past body-on-body) — the Descent's
 *  own run-over reach, kept byte-identical through the generalization. */
export const BURST_TOUCH_PAD = 4;

/** The open registry: kind → row. Data files register at import time. */
export const LIGHTWELLS: Record<string, LightwellDef> = {};

export function registerLightwell(def: LightwellDef): void {
  if (LIGHTWELLS[def.kind]) console.warn(`[lightwells] re-registering '${def.kind}' — overriding`);
  LIGHTWELLS[def.kind] = def;
}

export function lightwellOf(kind: string): LightwellDef | undefined { return LIGHTWELLS[kind]; }

/** A pooled well's remaining-power fraction (1 for steady rows / non-wells). */
export function wellPowerFrac(d: Doodad): number {
  const w = d.well;
  if (!w) return 1;
  return w.max > 0 ? clamp(w.power / w.max, 0, 1) : 0;
}

/** The dim scalar applied to BOTH reach and intensity: powerFrac^dimExp,
 *  floored at minReachFrac while any power remains. Steady rows return 1. */
export function wellDimScale(d: Doodad): number {
  const w = d.well;
  if (!w) return 1;
  const def = LIGHTWELLS[d.kind];
  const frac = wellPowerFrac(d);
  if (frac <= 0) return 0;
  return Math.max(def?.minReachFrac ?? 0.22, Math.pow(frac, def?.dimExp ?? 0.5));
}

/** THE light-reach resolver — the drawn glow and the tested residence are
 *  this one number. Reads the kind's LightSpec through the visual fabric's
 *  own grammar (negative radius = multiple of the doodad's radius), scaled
 *  by the well's dim. Null = the kind carries no light at all. */
export function lightReach(d: Doodad): number | null {
  const spec = DOODAD_VISUALS[d.kind]?.light;
  if (!spec) return null;
  const base = spec.radius < 0 ? -spec.radius * d.radius : spec.radius;
  return base * wellDimScale(d);
}
