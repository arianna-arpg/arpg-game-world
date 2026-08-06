// ---------------------------------------------------------------------------
// GROUND CLAIMS — THE EATS-PLAGUE SEAM (stubbed registry; Movement I of the
// mycelia/contagion differentiation pass).
//
// THE CONTRACT (ratified 2026-08-06 — the containment asymmetry, her words
// near-verbatim: mycelia can be eaten FROM because it HAS A FOUNDATION; the
// contagion is more transient BECAUSE it is mobile):
//
//   An ANCHORED vector (a place-network with a foundation — mycelia's spore
//   front is the debut) PUBLISHES its per-zone grip here. A MOBILE vector
//   (the contagion's plague ball) CONSUMES the fold in its own lifecycle:
//   where anchored ground stands, the mobile sickness is EATEN —
//
//     · SPREAD REFUSAL: the plague's spread step must not infect a zone whose
//       folded grip is at/above its own threshold (a dial the consumer owns);
//     · STANDING WANE: infection already on ground a network later claims
//       wanes on the consumer's clock (the network eats it back);
//     · never the reverse — the plague neither blocks nor drains a claim
//       (mobility is its whole nature; it flows around, not through).
//
// MOVEMENT I wired the ANCHORED half (mycelia registers its grip source —
// packages/overlays/mycelia.ts, beside its event-front source). MOVEMENT II
// wired the CONSUMER: the contagion folds gripAt through its ONE infection
// gate (every road in — ignition, the pre-spread ball, a carrier's step —
// refuses ground held at/above its threshold) and its standing-wane clock
// (overlays/contagion.ts, dials on ContagionSurge.grip; the sim hands the
// accessor in at the composition root, world/sim.ts setGripRead). Keep
// sources PURE READS of live overlay state (the registerEventFront cheapness
// law — a consumer may fold every zone it touches, every step).
// ---------------------------------------------------------------------------

import type { WorldSim } from '../world/sim';

/** One anchored vector's per-zone grip — a pure read of live overlay state. */
export interface GroundClaimSource {
  id: string;
  /** 0..1 — how firmly this vector's network holds `zoneId` (0 = no claim). */
  gripAt(sim: WorldSim, zoneId: string): number;
}

const SOURCES: GroundClaimSource[] = [];

/** Register an anchored vector's grip source (module scope, once per vector —
 *  HMR-safe re-register, the registerEventFront pattern). */
export function registerGroundClaim(src: GroundClaimSource): void {
  const i = SOURCES.findIndex(s => s.id === src.id);
  if (i >= 0) SOURCES[i] = src;
  else SOURCES.push(src);
}

/** Registered source ids (probes / dev introspection). */
export function groundClaimSourceIds(): string[] { return SOURCES.map(s => s.id); }

/** THE FOLD a mobile vector consumes: the strongest anchored grip over a zone
 *  (0 = unclaimed ground). `excludeId` lets a vector that is BOTH kinds one
 *  day skip its own claim. A source that throws is skipped (one bad source
 *  never breaks a consumer's lifecycle — the event-front tolerance law). */
export function groundClaimGripAt(sim: WorldSim, zoneId: string, excludeId?: string): number {
  let best = 0;
  for (const s of SOURCES) {
    if (excludeId && s.id === excludeId) continue;
    try {
      const g = s.gripAt(sim, zoneId);
      if (g > best) best = Math.min(1, g);
    } catch { /* tolerated */ }
  }
  return best;
}
