// ---------------------------------------------------------------------------
// THE PLY FABRIC — hit-counted durability, the Pikmin/Overlord damage model.
//
// A body with PLIES does not bleed by magnitude: each landed hit TEARS ONE
// PLY and moves no life at all, however hard it struck — a swarm creature
// eats N blows, full stop. Underneath, the ordinary life pool still stands
// UNTOUCHED and fully live, so everything that trades in life keeps
// working: DoTs drip it directly (the anti-swarm counterplay lane — burns
// and poisons ignore plies by design), self-destruction spends it
// (Martyrdom, Detonate Minions, the amalgam's consumption — kill() never
// consults plies), and a body whose plies are spent is EXPOSED: hits wound
// life normally from then on. Dual-model by construction, exactly so a
// keeper who wants to detonate their beautiful swarm still can.
//
// Everything is data:
//   - MonsterDef.plies?: PlySpec — any kind can wear the model (the throng
//     kinds first; enemy hordes are one data entry each — a 1-ply "fake"
//     body dies in one hit with zero life math, the horde-tier substrate).
//   - The `minionPlies` owner stat — flat extra plies on minted/claimed
//     minions. QUANTA LAW: plies never fraction and never batch-scale
//     (the sympathy charge rule) — durability scales linearly with count,
//     never quadratically, and +1 ply means one more real hit eaten.
//   - PLY_CFG — the modular thresholds (tune HERE, never inline).
//
// Deliberate identities (probe-pinned):
//   - MAGNITUDE-BLIND: a colossus slam and a gnat nip each cost one ply.
//     That IS the fantasy; a future 'swarmbane' support that pierces plies
//     is the damage-side lever, never a magnitude rule here.
//   - EVASION FIRST: a dodged hit eats nothing (a dodge is a dodge).
//   - POISE STILL CHIPS: mitigation runs before the gate, so poise-break
//     remains honest counterplay against a plied wall.
//   - SUB-FLOOR THUDS: while plies remain, a hit under the floor tears
//     nothing and wounds nothing — chip-spam can neither farm plies nor
//     sneak past them.
//   - NO LEECH FOOD: an eaten hit landed 0 — you cannot drink from armor.
//
// THE BRACKET SEAM (documented, minimal v1): PlySpec.spentStatus fires the
// moment the LAST ply tears — the 'worn open' tell. Richer brackets
// (every-Nth-tear effects, tear-fed procs) belong on this spec as rows
// when a design asks; the tear site in damage.ts is the one chokepoint.
// Docs: docs/engine/plies.md. Probe: balance/probe_plies.ts.
// ---------------------------------------------------------------------------

import type { Actor } from './actor';

/** Hit-counted durability worn by a monster kind (MonsterDef.plies →
 *  stamped onto the Actor at mint; re-derived idempotently by the minion
 *  rebake so owner investment stays live). */
export interface PlySpec {
  /** Hits this body eats before its life pool is exposed. */
  count: number;
  /** Extra plies per level (floored) — the scaling lever for kinds that
   *  should stay count-durable deep into the game. Default 0. */
  perLevel?: number;
  /** Post-mitigation damage below this neither tears a ply nor wounds —
   *  the thud floor (default PLY_CFG.floor). */
  floor?: number;
  /** Status stamped on the body the moment its LAST ply tears — the
   *  'worn open' moment, and the bracket seam's first rider. */
  spentStatus?: string;
}

/** THE PLY FABRIC's modular thresholds — tune HERE, never inline. */
export const PLY_CFG = {
  /** Default thud floor (post-mitigation damage that can tear a ply). */
  floor: 1,
  /** HUD pips (renderer): dot radius and spacing of the ply row drawn in
   *  place of a plied body's life bar (life bars return once exposed). */
  pip: { r: 1.7, gap: 4.6, color: '#e8d8a0', spentColor: 'rgba(232,216,160,0.28)' },
} as const;

/** The resolved ply count a body of this spec carries at `level`. */
export function plyCountOf(spec: PlySpec, level: number): number {
  return Math.max(0, spec.count + Math.floor((spec.perLevel ?? 0) * Math.max(0, level - 1)));
}

/** The thud floor for a body (spec override → config default). */
export function plyFloorOf(a: Actor): number {
  return a.plySpec?.floor ?? PLY_CFG.floor;
}
