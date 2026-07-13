// ---------------------------------------------------------------------------
// THE TRAVERSAL FABRIC — vertical crossings as a data-driven cinematic.
//
// A traversal is a short, input-locked passage between two standings of the
// world: a geyser hurling the hero up through the cloud deck, the floor
// falling away and dropping them back to the land below. Each KIND is one
// registered row — phase timings, sprite scale/lift/spin, the veil color that
// whites (or blacks) the crossing, wind streaks, landing status — and the
// world runs them all through ONE small state machine: windup → rise (veil
// closes; the ZONE SWAP fires at its end, hidden behind the veil) → land
// (veil clears over the new ground).
//
// The fabric moves ONE actor (the player) between zones the World already
// knows how to load; it never invents travel. Anything vertical later — a
// dive into a maelstrom, a burrow, a wind-ride between shelves — is a new
// row + a call to World.beginTraversal, not a new mechanism.
//
// Pure data + types: no engine imports (the World drives; the renderer reads).
// ---------------------------------------------------------------------------

export interface TraversalStreaks {
  count: number;
  color: string;
  /** 1 = streaks rush DOWNWARD past the camera (you are rising);
   *  -1 = they rush upward (you are falling). */
  dir: 1 | -1;
}

export interface TraversalDef {
  id: string;
  /** Phase seconds. The zone swap fires at the END of `rise`, behind the veil. */
  windup: number;
  rise: number;
  land: number;
  /** Full-screen veil at the crossing (cloud-white for the sky, dusk for a
   *  burrow). Alpha ramps 0→peak across `rise`, peak→0 across `land`. */
  veil: string;
  veilPeak: number;
  /** Player sprite scale at the end of `rise` (toward camera >1 = rising;
   *  <1 = sinking away). Eased from 1. */
  scaleTo: number;
  /** Sprite lift in px at the end of `rise` (negative = dropping into the
   *  hole). The contact shadow stays put and thins — the body leaves it. */
  lift: number;
  /** Radians of body spin across `rise` (a tumbling fall). */
  spin?: number;
  streaks?: TraversalStreaks;
  /** Peak screen shake during `windup` (a geyser gathering its breath). */
  shake?: number;
  /** Status granted as the veil clears (windswept boots, winded knees). */
  status?: { id: string; duration?: number };
  /** Floating text at departure. */
  text?: string;
  textColor?: string;
}

export const TRAVERSALS: Record<string, TraversalDef> = {};

export function registerTraversal(def: TraversalDef): void {
  if (TRAVERSALS[def.id]) console.warn(`[traversal] re-registering '${def.id}' — overriding`);
  TRAVERSALS[def.id] = def;
}

export function traversalDef(id: string): TraversalDef | undefined { return TRAVERSALS[id]; }

export type TraversalPhase = 'windup' | 'rise' | 'land';

/** A capture request for the renderer: while the DEPARTURE zone is still
 *  live, snapshot the given world-rect of it as the destination's understory
 *  (the ground seen far below through the clouds). Keyed by the destination
 *  zone id; the renderer honors it before the swap hides the old ground. */
export interface TraversalCapture {
  key: string;
  ox: number;
  oy: number;
  w: number;
  h: number;
}

/** The live crossing on the World. `swap` performs the actual zone change
 *  (enter the shelf, drop to the land below); `done` runs as the veil clears. */
export interface TraversalState {
  def: TraversalDef;
  phase: TraversalPhase;
  t: number;
  swap?: () => void;
  done?: () => void;
  capture?: TraversalCapture;
  /** Set once `swap` has fired (the state machine's own latch). */
  swapped?: boolean;
}

/** Veil alpha for a live crossing (renderer). 0 during windup, ramps to
 *  `veilPeak` across rise, back to 0 across land. */
export function traversalVeil(s: TraversalState): number {
  const d = s.def;
  if (s.phase === 'windup') return 0;
  if (s.phase === 'rise') {
    const f = Math.min(1, s.t / Math.max(0.01, d.rise));
    return d.veilPeak * f * f; // ease-in: the sky takes you all at once
  }
  const f = Math.min(1, s.t / Math.max(0.01, d.land));
  return d.veilPeak * (1 - f * f * (3 - 2 * f)); // smooth clear
}

/** Sprite transform for the traveling actor (renderer): scale, lift, spin. */
export function traversalPose(s: TraversalState): { scale: number; lift: number; spin: number; shadow: number } {
  const d = s.def;
  if (s.phase === 'windup') {
    // A gathering tremble: the pose barely moves; the shake sells it.
    const f = Math.min(1, s.t / Math.max(0.01, d.windup));
    return { scale: 1 + 0.06 * f, lift: 2 * f, spin: 0, shadow: 1 };
  }
  if (s.phase === 'rise') {
    const f = Math.min(1, s.t / Math.max(0.01, d.rise));
    const e = f * f; // accelerate away
    return {
      scale: 1 + (d.scaleTo - 1) * e,
      lift: d.lift * e,
      spin: (d.spin ?? 0) * e,
      shadow: Math.max(0, 1 - e * 1.15),
    };
  }
  // Landing: arrive from a shallow remnant of the pose back to true.
  const f = Math.min(1, s.t / Math.max(0.01, d.land));
  const e = 1 - (1 - f) * (1 - f); // decelerate in
  const from = 1 + (d.scaleTo - 1) * 0.35;
  return {
    scale: from + (1 - from) * e,
    lift: d.lift * 0.25 * (1 - e),
    spin: 0,
    shadow: e,
  };
}
