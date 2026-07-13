// ---------------------------------------------------------------------------
// ATTENTION POINTER REGISTRY — generic IN-ZONE "it's over there" edge chevrons.
//
// The world map (mapMarkers.ts) answers "which ZONE is it in"; this fabric
// answers the next question — "where in THIS zone" — for anything live that the
// player must find before a clock or an opportunity runs out. Every pointer is
// an AttentionSource: a pure function of world state, resolved fresh each frame
// by the renderer's single generic pass, which draws a screen-edge chevron (+
// glyph + label) toward any point currently OFF-screen and nothing at all when
// the target is visible (the in-world visuals own it then). Adding one is
// `registerAttentionSource(...)` from the feature's own module — NO renderer
// edit per feature (the mapMarkers contract, in-zone).
//
// First rider: the Fracture run (a diverted fracture surfaces across a zone the
// player hasn't crossed yet — without a pointer, a timer they can't find reads
// as "it never spawned"). Built for the Hunt beast, a Descent shaft, or any
// future must-find event to join with one registration.
// ---------------------------------------------------------------------------

import type { World } from '../engine/world';

export interface AttentionPoint {
  /** Stable id (dedup/debug; one live pointer per id). */
  id: string;
  /** WORLD-space position the chevron points toward. */
  pos: { x: number; y: number };
  /** Chevron + disc + label colour (the owning event's palette). */
  color: string;
  /** Short glyph inside the edge disc (matches the event's map-marker glyph). */
  glyph: string;
  /** Small text under the disc (what it is / what to do). Keep it short. */
  label?: string;
  /** Draw/priority order when over the cap (higher wins). */
  z?: number;
}

export type AttentionSource = (world: World) => AttentionPoint[];

/** Fabric levers (the renderer reads these — one place to tune, never inline). */
export const ATTENTION_CFG = {
  /** Most pointers shown at once (highest-z win; beyond this is noise). */
  max: 4,
  /** Screen-edge inset the chevron disc hugs (px, screen-space). */
  margin: 34,
  /** Points within this many px of the viewport edge (world-space, projected)
   *  count as "visible" and draw no pointer — the world visuals own them. */
  onScreenSlack: 24,
};

const SOURCES: AttentionSource[] = [];

/** Register an attention source (called once at boot per feature). */
export function registerAttentionSource(s: AttentionSource): void { SOURCES.push(s); }

/** Resolve every source into a capped, priority-ordered pointer list (a source
 *  that throws is skipped so one bad source can't blank the pass). */
export function collectAttention(world: World): AttentionPoint[] {
  const out: AttentionPoint[] = [];
  for (const s of SOURCES) {
    try { out.push(...s(world)); } catch { /* a bad source never blanks the pass */ }
  }
  return out.sort((a, b) => (b.z ?? 0) - (a.z ?? 0)).slice(0, ATTENTION_CFG.max);
}
