// ---------------------------------------------------------------------------
// THE INTENT LAYER: a slow decision about what a body wants to do next, so its feet
// can go where that skill works. docs/design/npc-ai-direction.md is the plan.
//
// Off-stream by law: every roll here comes from the body's own die, never the global
// one, so a body thinking can never re-deal another system's rolls. A body without an
// `intent` axis never reaches this module.
// ---------------------------------------------------------------------------

import { INTENT_CFG, type IntentSpec } from '../data/aiIntent';
import type { Actor } from './actor';
import type { World } from './world';

/** THE BODY'S DIE: a mulberry32 step on the actor's own state, seeded from the run's
 *  seed and the body's id. The id alone would deal every episode the same minds, since
 *  actor ids restart per episode. */
export function bodyRoll(actor: Actor, world: World): number {
  let t = (actor.aiDie ?? ((world.manifest.seed ^ Math.imul(actor.id, 0x9e3779b1) ^ 0x1e7e17) >>> 0)) >>> 0;
  t = (t + 0x6d2b79f5) >>> 0;
  actor.aiDie = t;
  let x = Math.imul(t ^ (t >>> 15), t | 1);
  x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
}

/** A value between lo and hi on the body's die. */
export const bodyRange = (actor: Actor, world: World, lo: number, hi: number): number =>
  lo + bodyRoll(actor, world) * (hi - lo);

/** THE THINK CLOCK: is it time to decide again? The first beat is staggered by an id
 *  hash (the aiRescanAt idiom), and each later gap is drawn on the body's die. */
export function thinkDue(actor: Actor, world: World, spec: IntentSpec): boolean {
  const [lo, hi] = spec.think ?? INTENT_CFG.think;
  if (actor.aiThinkAt < 0) {
    const stagger = (((actor.id * 2654435761) >>> 13) & 1023) / 1023;
    actor.aiThinkAt = world.time + lo * stagger;
  }
  if (world.time < actor.aiThinkAt) return false;
  actor.aiThinkAt = world.time + bodyRange(actor, world, lo, hi);
  return true;
}
