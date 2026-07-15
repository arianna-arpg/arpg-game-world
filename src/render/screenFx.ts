// ---------------------------------------------------------------------------
// STATUS → SCREEN-FX registry — a full-screen visual per ailment, as data.
//
// When the player is afflicted, the renderer draws an EDGE-hugging overlay so
// you know at a glance what's on you: a pulsing coloured vignette for DoTs, a
// frosty/snowflake wash when chilled or frozen, circling stars when stunned.
//
// Extensible: add a status id → ScreenFxDef entry (and, for a brand-new look, a
// `kind` + one draw branch in renderer.drawStatusFx). Combat ailments only —
// terrain statuses (mired/sodden/…) and blessings are intentionally absent so
// the screen never flickers from standing in a swamp.
// ---------------------------------------------------------------------------

import { STATUS_DEFS, type ActiveStatus } from '../engine/status';

export type ScreenFxKind = 'vignette' | 'frost' | 'stars' | 'pall' | 'darken';
// Future kinds (one entry + one draw branch each): 'spin' (daze).

export interface ScreenFxDef {
  kind: ScreenFxKind;
  /** Colour override; defaults to the status's STATUS_DEFS colour. */
  color?: string;
  /** 0..1 strength of the overlay. */
  intensity?: number;
  /** Scale strength by the status's CURRENT stack fraction (stacks/maxStacks)
   *  — a buildup ladder reads as pressure rising, not a binary flicker. */
  stacksScale?: true;
}

export const STATUS_FX_REGISTRY: Record<string, ScreenFxDef> = {
  burn:   { kind: 'vignette', intensity: 0.85 },
  poison: { kind: 'vignette', intensity: 0.7 },
  bleed:  { kind: 'vignette', intensity: 0.7 },
  shock:  { kind: 'vignette', intensity: 0.6 },
  decay:  { kind: 'vignette', intensity: 0.6 },
  chill:  { kind: 'frost', intensity: 0.55 },
  frozen: { kind: 'frost', intensity: 1.0 },
  stun:   { kind: 'stars', intensity: 0.9 },
  // THE FLESH COUNTRY's ladders. The PALL is the vasovagal read: the world
  // desaturates and pales as faintness climbs (stack-scaled), and a swoon is
  // the full white-out drag. Deliberately beatless — the low-life vignette
  // owns the heartbeat; a faint is STILLNESS. Queasy/retching wear the sour
  // edge; blind closes the room in; seen is the amber of being LOOKED AT.
  faintness: { kind: 'pall', intensity: 0.55, stacksScale: true },
  swoon:     { kind: 'pall', intensity: 1.0 },
  queasy:    { kind: 'vignette', intensity: 0.4, stacksScale: true },
  retching:  { kind: 'vignette', intensity: 0.7 },
  blind:     { kind: 'darken', intensity: 0.9 },
  seen:      { kind: 'vignette', intensity: 0.4 },
};

export interface ActiveFx { def: ScreenFxDef; color: string; k: number; }

/** The screen effects to draw for the player's current statuses (combat only). */
export function collectActiveFx(statuses: ActiveStatus[]): ActiveFx[] {
  const out: ActiveFx[] = [];
  for (const s of statuses) {
    const def = STATUS_FX_REGISTRY[s.id];
    if (!def) continue;
    const cap = STATUS_DEFS[s.id]?.maxStacks ?? 1;
    const k = def.stacksScale ? Math.min(1, Math.max(0, (s.stacks || 1) / cap)) : 1;
    out.push({ def, color: def.color ?? STATUS_DEFS[s.id]?.color ?? '#ffffff', k });
  }
  return out;
}
