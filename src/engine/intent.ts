// ---------------------------------------------------------------------------
// THE INTENT LAYER: a slow decision about what a body wants to do next, so its feet
// can go where that skill works. docs/design/npc-ai-direction.md is the plan.
//
// Off-stream by law: every roll here comes from the body's own die, never the global
// one, so a body thinking can never re-deal another system's rolls. A body that carries
// no intent (its own axis or its kernel bucket's default) never reaches this module.
// ---------------------------------------------------------------------------

import { INTENT_CFG, type IntentSpec } from '../data/aiIntent';
import type { Actor } from './actor';
import type { BrainTuning, SkillPolicy } from './brain';
import type { SkillInstance } from './skills';
import type { World } from './world';

const BUCKET_INTENT: IntentSpec = Object.freeze({});

/** The intent axis a tuning carries: its own, else its kernel bucket's default
 *  (INTENT_CFG.buckets). `intent: null` opts a body out of both. */
export function intentOf(tuning: BrainTuning): IntentSpec | undefined {
  if (tuning.intent !== undefined) return tuning.intent ?? undefined;
  return INTENT_CFG.buckets.includes(tuning.move?.style ?? 'approach') ? BUCKET_INTENT : undefined;
}

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

/** What the decision needs from the brain that runs it: the kit's options and the
 *  brain's own reads of them, so this module never reaches back into ai.ts. */
export interface IntentHost {
  /** The kit's hinted skills, minus banned and reserve-only ones. */
  options: SkillInstance[];
  /** The truth gate: could it fire at this target from somewhere? */
  canFire(inst: SkillInstance): boolean;
  /** Its targeting alone: is there anything for it to act on, ready or not? */
  hasTarget(inst: SkillInstance): boolean;
  /** How far it reaches, as the picker reads it. */
  range(inst: SkillInstance): number;
  /** Does it hurt anything, directly or through what it brings? */
  hurts(inst: SkillInstance): boolean;
  /** The authored distance comfort (SkillPolicy.bands, ai.minRange) at a distance. */
  comfort(inst: SkillInstance, at: number): number;
  /** Walking speed, for what reaching a skill costs. */
  speed: number;
  /** May the feet go where a skill works? A fixed-band kernel chooses only among
   *  skills that reach from where it stands. */
  follows: boolean;
}

export interface StandingIntent {
  id: string;
  until: number;
  scores: [string, number][];
  /** Nothing could fire, so this is the skill coming back soonest, and the body only
   *  places itself for it. */
  waiting?: boolean;
  /** Cast. It still places the feet while the body's hands are busy, as the ready ring
   *  keeps its last read, and the body decides again the moment it can act. */
  spent?: boolean;
}

/** What a skill would put on its target or wear itself, for need and setup. */
function applies(inst: SkillInstance): { statuses: string[]; buffs: string[] } {
  const statuses: string[] = [], buffs: string[] = [];
  for (const e of inst.def.effects) {
    if (e.type === 'status') statuses.push(e.status);
    else if (e.type === 'buff') buffs.push(e.id);
  }
  return { statuses, buffs };
}

/** A skill's authored rank right now: an opener on a fresh engagement 3, a live combo's
 *  follow-up 2, a priority kit by its order between 1 and 2, the rotation's next step 1,
 *  and 0 for everything else. The picker reads it too, so a higher rank that can fire
 *  goes before a standing intent. */
export function intentRank(a: Actor, id: string, policy: SkillPolicy, now: number): number {
  const last = a.aiLastSkill;
  if (policy.opener === id && (!last || last.at < a.aiEngagedAt)) return 3;
  if (last && policy.combos?.some(c => c.after === last.id && c.then === id && now - last.at <= (c.window ?? 4))) return 2;
  if (policy.mode === 'priority' && policy.order?.includes(id)) return 1 + (policy.order.length - policy.order.indexOf(id)) / (policy.order.length + 1);
  if (policy.mode === 'rotation' && policy.order?.length && policy.order[a.aiRotIdx % policy.order.length] === id) return 1;
  return 0;
}

/** THE DECISION (section 4 of the plan): keep skills that can fire, score each from
 *  its own hints, keep the top authored rank, cut what stands far worse placed than the
 *  best, and roll among the rest on the body's die. The cut reads the situation alone
 *  (walk, distance, need, setup, repeat), never `ai.weight`, so a skill its author made
 *  rare stays rare rather than vanishing. Never called every tick: only on the think
 *  clock, or when the last intent was spent. */
export function decideIntent(
  a: Actor, world: World, target: Actor, d: number, spec: IntentSpec, policy: SkillPolicy,
  host: IntentHost, previous?: string,
): StandingIntent | null {
  const now = world.time;
  const cfg = INTENT_CFG;
  const opts: { id: string; rank: number; situation: number; weight: number }[] = [];
  const last = a.aiLastSkill;
  const fires = host.options.filter(inst => host.canFire(inst));
  // THE KITER'S CHOICE: with a ranged skill that keeps its distance ready, and something
  // in the kit that works only inside that distance, the body keeps kiting unless its
  // roll says it stands. Rolling only once the prey was inside left it walking in from
  // the edge and backing out again.
  let keep = 0;
  for (const inst of fires) keep = Math.max(keep, inst.def.ai!.keepDistance ?? 0);
  const kiting = keep > 0 && fires.some(inst => host.range(inst) < keep) && !kiterStands(a, world);
  a.aiKiteKeep = kiting ? keep : 0;
  for (const inst of fires) {
    const ai = inst.def.ai!;
    const range = host.range(inst);
    const gap = Math.max(0, d - range);
    if (gap > 0 && !host.follows) continue;
    if (kiting && gap > 0 && range < keep) continue;
    const reach = 1 / (1 + gap / Math.max(40, host.speed) / cfg.reach.halfCostSec);
    const comfort = host.comfort(inst, gap > 0 ? range * cfg.ring.meleeFrac : d);
    const { statuses, buffs } = applies(inst);
    let need = 1;
    if (!host.hurts(inst)) {
      const worn = statuses.some(s => target.statuses.some(t => t.id === s)) || buffs.some(b => a.buffs.has(b));
      need = worn ? cfg.need.worn : cfg.need.nonHit;
    }
    // Setup: this skill applies what a payoff in the kit needs, and the target lacks it.
    let setup = 1;
    for (const s of statuses) {
      if (target.statuses.some(t => t.id === s)) continue;
      const pays = host.options.some(o => {
        const req = o.def.targeting?.requiresStatus;
        return o !== inst && !!req && (Array.isArray(req) ? req.includes(s) : req === s);
      });
      if (pays) { setup = cfg.setup; break; }
    }
    const repeat = last && last.id === inst.def.id && now - last.at < cfg.repeat.within ? cfg.repeat.mul : 1;
    const situation = reach * comfort * need * setup * repeat;
    opts.push({ id: inst.def.id, rank: intentRank(a, inst.def.id, policy, now), situation, weight: ai.weight * situation });
  }
  const live = opts.filter(o => o.weight > 0);
  if (!live.length) return waitFor(a, world, host);
  const top = Math.max(...live.map(o => o.rank));
  let pool = live.filter(o => o.rank === top);
  const best = Math.max(...pool.map(o => o.situation));
  pool = pool.filter(o => o.situation >= (spec.floor ?? cfg.floor) * best);
  for (const o of pool) if (o.id === previous) o.weight *= cfg.commit.inertia;
  let chosen = pool[0];
  if (pool.length > 1) {
    const total = pool.reduce((s, o) => s + o.weight, 0);
    let roll = bodyRoll(a, world) * total;
    for (const o of pool) { roll -= o.weight; if (roll <= 0) { chosen = o; break; } }
  }
  const scores = [...live].sort((p, q) => q.weight - p.weight).slice(0, 3).map(o => [o.id, Math.round(o.weight * 100) / 100] as [string, number]);
  return { id: chosen.id, until: now + bodyRange(a, world, cfg.commit.maxSec[0], cfg.commit.maxSec[1]), scores };
}

/** Does this kiter stand and fight right now? Rolled on its own die when the last roll
 *  has run out, and held for a draw from INTENT_CFG.kite.holdSec. */
export function kiterStands(a: Actor, world: World): boolean {
  if (world.time >= (a.aiStandUntil ?? -Infinity)) {
    const { standChance, holdSec } = INTENT_CFG.kite;
    a.aiStanding = bodyRoll(a, world) < standChance;
    a.aiStandUntil = world.time + bodyRange(a, world, holdSec[0], holdSec[1]);
  }
  return !!a.aiStanding;
}

/** Nothing can fire: place the body for whichever skill comes back soonest. */
function waitFor(a: Actor, world: World, host: IntentHost): StandingIntent | null {
  let soonest: SkillInstance | undefined, left = Infinity;
  for (const inst of host.options) {
    if (!host.hasTarget(inst)) continue;
    const cd = a.cooldowns.get(inst.def.id) ?? 0;
    if (cd < left) { left = cd; soonest = inst; }
  }
  if (!soonest) return null;
  return { id: soonest.def.id, until: world.time + Math.max(0.3, Math.min(left, INTENT_CFG.commit.maxSec[0])), scores: [], waiting: true };
}
