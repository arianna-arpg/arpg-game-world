// ---------------------------------------------------------------------------
// THE SEAT FABRIC — one data-driven answer to "WHERE does this event land".
//
// Before this, every overlay hand-rolled its own candidate loop over
// view.nodes, and the copies drifted: eight of them quietly filtered to
// view.visited — so events only ever landed on ground the player had already
// cleared, and "stumbling onto" anything was structurally impossible. With
// the forechart (world/forechart.ts) minting a veiled halo many steps out,
// the candidate pool finally IS the world — and this module is the one
// weighted picker every overlay seats through:
//
//   pickSeat(view, spec, rng)
//
// A SeatSpec is pure data on the event's own surge config: a distance
// envelope from the player (min keeps it off their boots, max keeps it
// findable), multipliers for known/unknown/veiled ground (the stumble-upon
// pressure), a near/far tilt, and the call site's own extra filter. The
// structural floor stays zonePolicy.eventTargetable — never re-rolled here.
//
// The FINDABILITY contract this fabric assumes: a seat placed on unknown
// ground should either announce itself through the OMEN fabric
// (world/omens.ts), walk toward the player on its own (fronts, marches), or
// press the player's own surfaces (town pressure) — pick one per event.
// ---------------------------------------------------------------------------

import type { Rng } from '../core/rng';
import type { ZoneDef } from '../data/zones';
import { coordDist } from './coords';
import type { OverlayView } from './overlay';
import { eventTargetable } from './zonePolicy';

export interface SeatSpec {
  /** The overlay id the per-biome policy gates on (zonePolicy eventAllowed). */
  event: string;
  /** Node-unit distance envelope from the reference zone (the player's
   *  standing zone). Absent bound = unbounded on that side. When the
   *  reference can't resolve (the player is underground in an off-graph
   *  cave), the envelope is waived for that pick — a rare, transient case. */
  range?: { min?: number; max?: number };
  /** Weight on ground the player KNOWS (visited ∪ surveyed). Default 1. */
  knownMul?: number;
  /** Weight on UNKNOWN ground — the stumble-upon pressure. Default 1;
   *  0 restores the old known-only behavior (a legitimate design choice for
   *  events that are ABOUT familiar ground turning strange). */
  unknownMul?: number;
  /** Extra multiplier on VEILED ground specifically (stacks over unknownMul)
   *  — a thumb on the deep frontier. Default 1. */
  veiledMul?: number;
  /** A gentle linear tilt across the distance band. Default 'flat'. */
  prefer?: 'near' | 'far' | 'flat';
  /** The call site's own extras (needs packs, not-already-taken, biome
   *  tests…) — everything that used to live in the hand-rolled loop. */
  filter?: (z: ZoneDef) => boolean;
  /** BESPOKE weighing escape hatch: multiply a candidate's weight by any
   *  curve of (zone, distance) — verminfall's press-the-town falloff rides
   *  here instead of forking the picker. Composes with the muls above. */
  weigh?: (z: ZoneDef, d: number) => number;
}

/** The DATA half of a SeatSpec — what an event's surge config declares (all
 *  dials, no code): the overlay supplies event/filter/weigh at the call site
 *  and spreads this in. One more row on any surge config = a tuned seat. */
export type SeatTuning = Pick<SeatSpec, 'range' | 'knownMul' | 'unknownMul' | 'veiledMul' | 'prefer'>;

/** The filtered candidate list (unweighted) — exposed for QA/probes and for
 *  callers that need a count ("is anywhere left to claim?"). */
export function seatCandidates(view: OverlayView, spec: SeatSpec): ZoneDef[] {
  const ref = view.byId[view.currentZoneId]?.map;
  const min = spec.range?.min ?? 0;
  const max = spec.range?.max ?? Infinity;
  const out: ZoneDef[] = [];
  for (const z of view.nodes) {
    if (!eventTargetable(spec.event, z)) continue;
    if (ref) {
      const d = coordDist(z.map, ref);
      if (d < min || d > max) continue;
    }
    if (spec.filter && !spec.filter(z)) continue;
    out.push(z);
  }
  return out;
}

/** ONE weighted draw over the candidates (a single rng value — fixed-draw
 *  friendly). Returns null when nothing qualifies. */
export function pickSeat(view: OverlayView, spec: SeatSpec, rng: Rng): ZoneDef | null {
  const cands = seatCandidates(view, spec);
  if (!cands.length) return null;
  const ref = view.byId[view.currentZoneId]?.map;
  const min = spec.range?.min ?? 0;
  const max = spec.range?.max ?? Infinity;
  const span = Number.isFinite(max) ? Math.max(1, max - min) : 0;
  const weights = cands.map(z => {
    const d = ref ? coordDist(z.map, ref) : 0;
    const known = view.visited.has(z.id) || view.surveyed.has(z.id);
    let w = known ? (spec.knownMul ?? 1) : (spec.unknownMul ?? 1);
    if (z.veiled) w *= spec.veiledMul ?? 1;
    if (ref && span > 0 && spec.prefer && spec.prefer !== 'flat') {
      const t = Math.min(1, Math.max(0, (d - min) / span)); // 0 = near edge, 1 = far edge
      w *= spec.prefer === 'far' ? 0.35 + 0.65 * t : 1 - 0.65 * t;
    }
    if (spec.weigh) w *= Math.max(0, spec.weigh(z, d));
    return Math.max(0, w);
  });
  let total = 0;
  for (const w of weights) total += w;
  if (total <= 0) return null;
  let r = rng.next() * total;
  for (let i = 0; i < cands.length; i++) {
    r -= weights[i];
    if (r <= 0) return cands[i];
  }
  return cands[cands.length - 1];
}
