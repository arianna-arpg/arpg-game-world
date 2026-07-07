// ---------------------------------------------------------------------------
// SIM TAP — the one observation seam for headless simulation & balance tooling.
//
// The balance harness (src/sim/ + balance/cli.ts) needs to SEE combat without
// changing it: every hit that lands (or is evaded/blocked/shrugged), every DoT
// tick, every death, every skill execution. Rather than scatter bespoke
// counters through the engine, the chokepoints each make ONE optional call
// into whatever tap is installed here.
//
// Rules of the seam:
//   - Null by default: when no tap is installed the cost is one nullable read
//     per event — no allocation, no branching beyond the `?.`.
//   - OBSERVE ONLY: a tap must never mutate actors, packets, or results. The
//     engine hands it live references for cheapness, not for editing.
//   - One consumer at a time (module-level singleton): the game runs one World
//     per process, and sim episodes install/uninstall around each run. Fan-out
//     to multiple listeners belongs inside the consumer, not here.
//
// Chokepoints wired (keep this list honest when adding more):
//   - damage.ts applyHit   → onHit   (every exit: evade/immune/block/landed)
//   - damage.ts applyDot   → onDot   (post-mitigation life drain; ES soak not
//                                     split out — see docs/balance/README.md)
//   - world.ts   kill      → onDeath (after the actor is truly dead; undying
//                                     rescues and dummy resets never reach it)
//   - world.ts   executeSkill → onCast (real executions; scheduledRepeat=true
//                                     for echo/repeat re-fires, so presses and
//                                     mechanical re-casts stay separable)
// ---------------------------------------------------------------------------

import type { Actor } from './actor';
import type { DamagePacket, HitResult } from './damage';
import type { DamageType } from './stats';
import type { SkillInstance } from './skills';

export interface SimTap {
  /** Every hit resolution, INCLUDING whiffs — result.evaded/immune/blocked
   *  distinguish them; result.total is what actually reached life. */
  onHit?(attacker: Actor, target: Actor, result: HitResult, packet: DamagePacket): void;
  /** A damage-over-time tick's post-mitigation life drain (0 = fully soaked). */
  onDot?(target: Actor, landed: number, type?: DamageType): void;
  /** An actor truly died (dead flag committed). killer is the credited blow's
   *  source when known. Player seats reach here too (before the downed flow). */
  onDeath?(actor: Actor, killer?: Actor): void;
  /** A skill EXECUTION (not a bar press — triggers, echoes and totem casts land
   *  here too). scheduledRepeat marks mechanical re-fires of one press. */
  onCast?(caster: Actor, inst: SkillInstance, scheduledRepeat: boolean): void;
}

/** The installed tap. Read via `SIM_TAP.current?.…` at each chokepoint. */
export const SIM_TAP: { current: SimTap | null } = { current: null };

/** Install (or clear, with null) the process-wide sim tap. */
export function setSimTap(tap: SimTap | null): void {
  SIM_TAP.current = tap;
}
