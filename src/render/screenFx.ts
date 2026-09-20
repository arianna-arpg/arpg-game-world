// ---------------------------------------------------------------------------
// STATUS → SCREEN-FX registry — a full-screen visual per ailment, as data.
//
// When the player is afflicted, the renderer draws an EDGE-hugging overlay so
// you know at a glance what's on you: a pulsing coloured vignette for DoTs, a
// frosty/snowflake wash when chilled or frozen, circling stars when stunned.
//
// Extensible: StatusDef.screenCue selects/opts out of an independent layer;
// DoTs and armed culls inherit a fallback. This registry keeps specialized
// control cues. The vignette channel dispatches material layers in afflictionEdge.ts.
// Combat ailments only —
// terrain statuses (mired/sodden/…) and blessings are intentionally absent so
// the screen never flickers from standing in a swamp.
// ---------------------------------------------------------------------------

import { STATUS_DEFS, type ActiveStatus } from '../engine/status';

export type ScreenFxKind = 'vignette' | 'frost' | 'stars' | 'pall' | 'darken' | 'spin' | 'framecage';

export interface ScreenFxDef {
  kind: ScreenFxKind;
  /** Shape family from AFFLICTION_MOTIFS; unknown families use a neutral notch. */
  motif?: string;
  /** Colour override; defaults to the status's STATUS_DEFS colour. */
  color?: string;
  /** 0..1 strength of the overlay. */
  intensity?: number;
  /** Scale strength by the status's CURRENT stack fraction (stacks/maxStacks)
   *  — a buildup ladder reads as pressure rising, not a binary flicker. */
  stacksScale?: true;
  /** THE FALTER — 0..1 strength of the DELIBERATE simulated stutter (scaled
   *  by this fx's live k like every other channel). While worn, the
   *  renderer HOLDS whole presented frames on a jittered cadence
   *  (VIS_CFG.statusFx.falter dials): the game itself seems to lag — a
   *  fake, bounded hitch, the vasovagal skip. THIS IS INTENDED BEHAVIOR,
   *  designed and documented (docs/render/falter.md), not a performance
   *  defect: a light-headed hero is MEANT to make the player doubt their
   *  frame rate for a beat. Presentation-only by construction — the sim,
   *  inputs and the co-op wire never falter — and settings.statusFalter is
   *  the player's off switch. Any status may wear it; it debuts on the
   *  faintness ladder. */
  falter?: number;
}

export const STATUS_FX_REGISTRY: Record<string, ScreenFxDef> = {
  burn:   { kind: 'vignette', intensity: 0.85, motif: 'fire' },
  poison: { kind: 'vignette', intensity: 0.7, motif: 'toxin' },
  bleed:  { kind: 'vignette', intensity: 0.7, motif: 'wound' },
  shock:  { kind: 'vignette', intensity: 0.6 },
  decay:  { kind: 'vignette', intensity: 0.6 },
  chill:  { kind: 'frost', intensity: 0.55 },
  frozen: { kind: 'frost', intensity: 1.0 },
  stun:   { kind: 'stars', intensity: 0.9 },
  // THE FRAME CAGE (the fourth wall — StatusDef.frameLock): the sealed
  // edge of vision reads as a thin glassy rim — the wall you are about to
  // bank off, drawn ON the wall itself. Screen-anchored BY LAW and by
  // SUBJECT: this is the one overlay whose referent literally is the
  // screen's edge. Any frameLock-bearing status may wear it.
  caroming: { kind: 'framecage', intensity: 0.9 },
  // THE FLESH COUNTRY's ladders. The PALL is the vasovagal read: the world
  // desaturates and pales as faintness climbs (stack-scaled), and a swoon is
  // the full white-out drag. Deliberately beatless — the low-life vignette
  // owns the heartbeat; a faint is STILLNESS. Both wear THE FALTER: the
  // frame itself skips as the head goes light (deliberate fake lag — see
  // the falter field above; a swoon stutters at full press). Queasy/
  // retching wear the sour edge; blind closes the room in; seen is the
  // amber of being LOOKED AT.
  faintness: { kind: 'pall', intensity: 0.55, stacksScale: true, falter: 0.55 },
  swoon:     { kind: 'pall', intensity: 1.0, falter: 1 },
  queasy:    { kind: 'vignette', intensity: 0.4, stacksScale: true },
  retching:  { kind: 'vignette', intensity: 0.7 },
  blind:     { kind: 'darken', intensity: 0.9 },
  seen:      { kind: 'vignette', intensity: 0.4 },
  // THE CONFUSION FAMILY (status.ts invertMove/scrambleChance — these rows
  // are only the READS): the building maze is a teal edge wash climbing
  // with the stacks; WIDDERSHINS is the SPIN — a chevron orbit running
  // COUNTERCLOCKWISE, the one overlay whose motion IS the mechanic (your
  // steps run contrary too); the addled hand is a gold flicker at the rim.
  disoriented: { kind: 'vignette', intensity: 0.45, stacksScale: true },
  widdershins: { kind: 'spin', intensity: 0.9 },
  addled:      { kind: 'vignette', intensity: 0.45 },
  // THE KARST ladder: stone climbing the body reads as the world draining
  // toward limestone grey (the pall's desaturate, stack-scaled), and full
  // petrification is stone-grey stillness — beatless like the swoon, because
  // a statue does not have a pulse.
  petrifying: { kind: 'pall', color: '#8f8a80', intensity: 0.5, stacksScale: true },
  petrified:  { kind: 'pall', color: '#b8b2a4', intensity: 0.9 },
  // THE FEAR ladder (the Gloamwood country): nerve draining reads as a cold
  // violet pall climbing with the stacks; a broken nerve is the same pall at
  // full press with the edges closing in — dread, not damage.
  harrowing: { kind: 'pall', color: '#9a86c8', intensity: 0.45, stacksScale: true },
  horrified: { kind: 'pall', color: '#b8a4e8', intensity: 0.85 },
};

export interface ActiveFx { id: string; def: ScreenFxDef; color: string; k: number; }

/** Shared empty result — the statusless frame (the overwhelming common case)
 *  allocates nothing. Callers never mutate collectActiveFx results. */
const EMPTY_FX: ActiveFx[] = [];

/** The screen effects to draw for the player's current statuses (combat only). */
export function collectActiveFx(statuses: ActiveStatus[]): ActiveFx[] {
  if (!statuses.length) return EMPTY_FX;
  let out: ActiveFx[] | null = null;
  const seen = new Set<string>();
  for (const s of statuses) {
    if (s.remaining <= 0 || seen.has(s.id)) continue;
    const status = STATUS_DEFS[s.id];
    if (status?.screenCue === false || status?.beneficial) continue;
    const authored = status?.screenCue;
    const inherited = Object.hasOwn(STATUS_FX_REGISTRY, s.id) ? STATUS_FX_REGISTRY[s.id] : undefined;
    const def: ScreenFxDef | undefined = authored ? { kind: 'vignette', ...authored }
      : inherited ?? (status?.dotType || status?.cullsAtLethal || s.dps > 0 || s.screenDot
        ? { kind: 'vignette', intensity: 0.7, motif: status?.cullsAtLethal ? 'doom'
          : status?.dotType === 'fire' ? 'fire' : 'generic' } : undefined);
    if (!def) continue;
    seen.add(s.id);
    const cap = status?.maxStacks ?? 1;
    const k = def.stacksScale ? Math.min(1, Math.max(0, (s.stacks || 1) / cap)) : 1;
    (out ??= []).push({ id: s.id, def, color: def.color ?? STATUS_DEFS[s.id]?.color ?? '#ffffff', k });
  }
  return out ?? EMPTY_FX;
}

/** The strongest live falter strength across the active fx (0 = none): each
 *  row's authored `falter` scaled by its k, so a climbing faintness ladder
 *  stutters harder as it climbs. The renderer's hold gate is the one reader. */
export function collectFalterK(fx: ActiveFx[]): number {
  let k = 0;
  for (const f of fx) if (f.def.falter) k = Math.max(k, f.def.falter * f.k);
  return k;
}
