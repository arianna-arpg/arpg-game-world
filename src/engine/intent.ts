// ---------------------------------------------------------------------------
// THE INTENT LAYER: a slow decision about what a body wants to do next, so its feet
// can go where that skill works. docs/design/npc-ai-direction.md is the plan.
//
// Off-stream by law: every roll here comes from the body's own die, never the global
// one, so a body thinking can never re-deal another system's rolls. A body that carries
// no intent (its own axis or its kernel bucket's default) never reaches this module.
// ---------------------------------------------------------------------------

import {
  CHAOS_BUDGETS, INTENT_CFG, STANCE_IDS, STANCE_MIX, STANCE_TELLS, STANCES, TEMPERAMENTS,
  type ChaosBudget, type IntentSpec, type StanceDef, type StanceId,
} from '../data/aiIntent';
import type { MonsterDef } from '../data/monsters';
import { SKILLS } from '../data/skills';
import type { Actor } from './actor';
import type { BrainTuning, SkillPolicy } from './brain';
import type { SkillDef, SkillInstance } from './skills';
import { tellSpecsOf, type TellSpec } from './tells';
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
  /** How long after its press its first blow can land (windupOf): what a player sees coming. */
  bar(inst: SkillInstance): number;
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
  /** Chosen off book (the chaos budget): its cast pays extra recovery. */
  offBook?: boolean;
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
  host: IntentHost, previous?: string, chaos?: ChaosBudget,
): StandingIntent | null {
  const now = world.time;
  const cfg = INTENT_CFG;
  const opts: { id: string; rank: number; situation: number; weight: number; readable: boolean }[] = [];
  const last = a.aiLastSkill;
  const fires = host.options.filter(inst => host.canFire(inst));
  const stance = a.aiStance ? STANCES[a.aiStance] : undefined;
  // THE KITER'S CHOICE, now the stance's: with a ranged skill that keeps its distance ready,
  // and something that works only inside that distance, a body whose stance does not close
  // keeps kiting, as does a body with no stance at all (the plain ring's way).
  let keep = 0;
  for (const inst of fires) keep = Math.max(keep, inst.def.ai!.keepDistance ?? 0);
  const kiting = keep > 0 && !stance?.closes && fires.some(inst => host.range(inst) < keep);
  a.aiKiteKeep = kiting ? keep : 0;
  for (const inst of fires) {
    const ai = inst.def.ai!;
    const range = host.range(inst);
    const gap = Math.max(0, d - range);
    if (gap > 0 && !host.follows) continue;
    if (kiting && gap > 0 && range < keep) continue;
    const reach = 1 / (1 + gap / Math.max(40, host.speed) / cfg.reach.halfCostSec);
    const comfort = host.comfort(inst, gap > 0 ? range * cfg.ring.meleeFrac : d);
    // What the stance would rather use, by the band the skill works in. It is part of the
    // situation, so a pressing body cuts a far shot when its blade is as well placed.
    const band = stance && !cfg.placeless.includes(inst.def.delivery.type) ? stanceBand(stance, range) : 1;
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
    const situation = reach * comfort * need * setup * repeat * band;
    opts.push({
      id: inst.def.id, rank: intentRank(a, inst.def.id, policy, now), situation, weight: ai.weight * situation,
      readable: !!chaos && readable(inst, host),
    });
  }
  const live = opts.filter(o => o.weight > 0);
  if (!live.length) return waitFor(a, world, host);
  const top = Math.max(...live.map(o => o.rank));
  const best = Math.max(...live.filter(o => o.rank === top).map(o => o.situation));
  const floor = spec.floor ?? cfg.floor;
  const onBook = (o: (typeof live)[number]): boolean => o.rank === top && o.situation >= floor * best;
  // THE CHAOS BUDGET: now and then both cuts relax for one decision, so an option this body
  // would normally cut, by its author's order or by the floor, and that a player could still
  // read coming, may win (INTENT_CFG.chaos.pick 'join'), or does ('cut'). A token is spent,
  // and the prey's ledger claimed, only if one does. The die is asked only when such an
  // option exists, so a body with nothing to surprise anyone with rolls nothing.
  // An ordered kit's hands only ever press its order (pickSkill), so only its order is offered.
  const ordered = (policy.mode === 'priority' || policy.mode === 'rotation') && policy.order?.length ? policy.order : undefined;
  const lowered = (chaos?.floor ?? 0) * best;
  const offered = (o: (typeof live)[number]): boolean =>
    !onBook(o) && o.readable && o.situation >= lowered && (!ordered || ordered.includes(o.id));
  const offRoll = !!chaos && live.some(offered) && mayGoOffBook(a, world, target, chaos);
  const pool = offRoll && cfg.chaos.pick === 'cut' ? live.filter(offered) : live.filter(o => onBook(o) || (offRoll && offered(o)));
  for (const o of pool) if (o.id === previous) o.weight *= cfg.commit.inertia;
  let chosen = pool[0];
  if (pool.length > 1) {
    const total = pool.reduce((s, o) => s + o.weight, 0);
    let roll = bodyRoll(a, world) * total;
    for (const o of pool) { roll -= o.weight; if (roll <= 0) { chosen = o; break; } }
  }
  const offBook = offRoll && !onBook(chosen);
  if (offBook) {
    a.aiChaosTokens -= 1;
    offBookLive(target, now);
    (target.aiOffBookClaims ??= []).push(now + cfg.chaos.claimSec);
  }
  const scores = [...live].sort((p, q) => q.weight - p.weight).slice(0, 3).map(o => [o.id, Math.round(o.weight * 100) / 100] as [string, number]);
  const until = now + bodyRange(a, world, cfg.commit.maxSec[0], cfg.commit.maxSec[1]);
  return offBook ? { id: chosen.id, until, scores, offBook } : { id: chosen.id, until, scores };
}

/** A stance's score multiplier for a skill that works out to `range`. */
function stanceBand(s: StanceDef, range: number): number {
  const b = INTENT_CFG.stance.bands;
  return range <= b.near ? s.near : range <= b.mid ? s.mid : s.far;
}

// --- THE CHAOS BUDGET (phase 8) --------------------------------------------------------------

/** The budget a body spends from: its intent's own row, else INTENT_CFG.chaos.default, and
 *  'none' for a dim mind. Undefined when it holds no tokens or the lever is off. */
export function chaosBudgetOf(spec: IntentSpec, dim: boolean): ChaosBudget | undefined {
  const cfg = INTENT_CFG.chaos;
  if (!cfg.enabled) return undefined;
  const row = CHAOS_BUDGETS[spec.chaos ?? (dim ? 'none' : cfg.default)];
  return row && row.tokens > 0 ? row : undefined;
}

/** Tokens in hand now. A body starts full and regains one every `regenSec`, sooner for a
 *  volatile temperament. */
export function chaosTokens(a: Actor, now: number, chaos: ChaosBudget): number {
  if (a.aiChaosAt < 0) a.aiChaosTokens = chaos.tokens;
  else if (chaos.regenSec) {
    const regained = (now - a.aiChaosAt) * (1 + (a.aiTemper?.volatile ?? 0)) / chaos.regenSec;
    a.aiChaosTokens = Math.min(chaos.tokens, a.aiChaosTokens + regained);
  }
  a.aiChaosAt = now;
  return a.aiChaosTokens;
}

/** Off-book acts live against a prey, its expired entries swept in place: the burst
 *  ledger's shape (ai.ts burstClaimsLive), so a pack cannot all surprise one hero at once. */
export function offBookLive(prey: Actor, now: number): number {
  const claims = prey.aiOffBookClaims;
  if (!claims?.length) return 0;
  let n = 0;
  for (let i = claims.length - 1; i >= 0; i--) {
    if (claims[i] <= now) { claims[i] = claims[claims.length - 1]; claims.pop(); }
    else n++;
  }
  return n;
}

/** May this decision go off book? A token in hand, then the body's die, then room in the
 *  prey's ledger. */
function mayGoOffBook(a: Actor, world: World, target: Actor, chaos: ChaosBudget): boolean {
  if (chaosTokens(a, world.time, chaos) < 1) return false;
  if (bodyRoll(a, world) >= (chaos.rollPerThink ?? 0)) return false;
  return offBookLive(target, world.time) < (chaos.perPrey ?? 1);
}

/** How long after its press a skill's first blow can land, as a player reads it: its bar,
 *  or a channel's spool-up. A mode whose blow lands during the bar or on a held release
 *  (multitude, charge, guard, overcharge, concentration, timed) reads 0. */
export function windupOf(a: Actor, inst: SkillInstance): number {
  const mode = inst.def.castMode ?? 'cast';
  if (mode === 'cast' || mode === 'perfect') return a.skillUseTime(inst);
  if (mode === 'channel' && inst.def.channel) {
    const ch = inst.def.channel;
    return (ch.windup ?? ch.interval) / Math.max(1e-6, a.speedFactor(inst));
  }
  return 0;
}

/** Can a player read this skill coming: a wind-up, or a ground footprint that warns, at
 *  least INTENT_CFG.chaos.minBar long? Only such a skill may be picked off book. */
function readable(inst: SkillInstance, host: IntentHost): boolean {
  const min = INTENT_CFG.chaos.minBar;
  const d = inst.def.delivery;
  return host.bar(inst) >= min || (d.type === 'ground' && (d.delay ?? 0) >= min);
}

// --- THE STANCE (phase 7) ------------------------------------------------------------------

const KIT_KEEP = new WeakMap<object, number>();

/** Does a skill act where its prey stands? A placeless delivery works wherever the body
 *  stands, and so does a burst that touches only its own side (a rallying howl); a skill
 *  aimed at an ally, a minion or a corpse is placed by them, not by the prey. */
export function actsOnPrey(def: SkillDef): boolean {
  const d = def.delivery;
  if (INTENT_CFG.placeless.includes(d.type) || (d.type === 'nova' && d.affects === 'allies')) return false;
  const target = def.targeting?.target;
  return !target || target === 'enemy';
}

/** THE DISTANCE CHOICE: the distance a kind's kit keeps, when the kit also holds something
 *  that acts on the prey only inside it; 0 when it has no such choice to make. Read from
 *  the def, so the stance a body may roll and the tells it wears agree, on the host and on
 *  a co-op client alike. An ally-only howl once gave a summoner a stance whose press only
 *  walked it at the hero while its dead did the work. */
export function kitKeepChoice(def: Pick<MonsterDef, 'skills'> | undefined): number {
  if (!def) return 0;
  let keep = KIT_KEEP.get(def);
  if (keep === undefined) {
    keep = 0;
    const kit = (def.skills ?? []).map(id => SKILLS[id]).filter(s => !!s?.ai);
    for (const s of kit) keep = Math.max(keep, s.ai!.keepDistance ?? 0);
    const inside = kit.some(s => actsOnPrey(s) && s.ai!.range < keep!);
    if (!inside) keep = 0;
    KIT_KEEP.set(def, keep);
  }
  return keep;
}

/** The tells a body wears: its kind's own, plus the stance vocabulary when its kit has a
 *  distance choice to make (STANCE_TELLS read zero until it holds a stance and a prey). */
export function bodyTellSpecs(def: MonsterDef | undefined, variant?: number): TellSpec[] | undefined {
  const own = tellSpecsOf(def, variant);
  if (!kitKeepChoice(def)) return own;
  return own?.length ? [...own, ...STANCE_TELLS] : STANCE_TELLS;
}

/** THE STANCE: how this body prefers to fight right now. Rolled on its own die from its mix
 *  (its intent's own, else its archetype's) on a fresh engagement, held for the stance's
 *  own time and rolled again when that runs out, or early on a real event: hit hard, its
 *  legs winded, its distance skill run dry. Only a body whose kit has the choice and whose
 *  feet follow its decisions holds one (`choice`); any other body holds none, rolls nothing
 *  and fights as before. A roll that changes the stance opens the shift beat. Returns
 *  whether it changed, so the standing decision is taken afresh. */
export function stepStance(
  a: Actor, world: World, spec: IntentSpec, type: string | undefined, host: IntentHost, choice: boolean,
): boolean {
  const cfg = INTENT_CFG.stance;
  if (!choice || !cfg.enabled) { a.aiStance = undefined; return false; }
  const now = world.time;
  const fresh = !a.aiStance || a.aiStanceAt < a.aiEngagedAt;
  a.aiStanceLife = Math.max(a.aiStanceLife, a.life);
  // Events fire on their edge, so a body winded for two seconds rolls once, not every beat.
  let saw = now < a.aiWindedUntil ? 1 : 0;
  if (host.options.some(o => (o.def.ai!.keepDistance ?? 0) > 0 && !a.cooldowns.has(o.def.id) && !a.canAfford(a.skillCost(o)))) saw |= 2;
  const rose = saw & ~a.aiStanceSaw;
  a.aiStanceSaw = saw;
  const struck = a.aiStanceLife - a.life >= cfg.struckFrac * a.maxLife();
  const due = fresh || now >= a.aiStanceUntil || ((rose !== 0 || struck) && now - a.aiStanceAt >= cfg.minHoldSec);
  if (!due) return false;
  const was = fresh ? undefined : a.aiStance;
  const held = a.aiStance;
  const next = rollStance(a, world, spec.stances ?? STANCE_MIX[type ?? 'basic'] ?? STANCE_MIX.basic, temperOf(a, world, spec));
  a.aiStance = next;
  // The posture changes with the roll, not a sweep later (the WIND_PUFF idiom).
  if (next !== held) a.tellNextAt = 0;
  if (!next) return false;
  const hold = STANCES[next].holdSec;
  a.aiStanceAt = now;
  a.aiStanceLife = a.life;
  a.aiStanceUntil = now + bodyRange(a, world, hold[0], hold[1]);
  if (!was || was === next) return false;
  a.aiShiftUntil = now + bodyRange(a, world, cfg.shiftBeat[0], cfg.shiftBeat[1]);
  return true;
}

/** Its temperament, drawn once on its own die inside its row. */
function temperOf(a: Actor, world: World, spec: IntentSpec): { bold: number; nerve: number; volatile: number } {
  if (!a.aiTemper) {
    const row = TEMPERAMENTS[spec.temperament ?? 'plain'] ?? TEMPERAMENTS.plain;
    const bold = bodyRange(a, world, row.bold[0], row.bold[1]);
    const nerve = bodyRange(a, world, row.nerve[0], row.nerve[1]);
    const volatile = bodyRange(a, world, row.volatile[0], row.volatile[1]);
    a.aiTemper = { bold, nerve, volatile };
  }
  return a.aiTemper;
}

const STANCE_W = [0, 0, 0];

/** One stance from a mix, on the body's die: a volatile body's weights flatten toward each
 *  other, and a bold one's lean toward the stances that close. Undefined: the mix is empty. */
function rollStance(
  a: Actor, world: World, mix: Partial<Record<StanceId, number>>, t: { bold: number; volatile: number },
): StanceId | undefined {
  const cfg = INTENT_CFG.stance;
  let total = 0;
  for (let i = 0; i < STANCE_IDS.length; i++) {
    const id = STANCE_IDS[i], w = mix[id] ?? 0;
    STANCE_W[i] = w > 0 ? Math.pow(w, 1 - t.volatile) * Math.exp(cfg.daringMul * t.bold * STANCES[id].daring) : 0;
    total += STANCE_W[i];
  }
  if (!(total > 0)) return undefined;
  let roll = bodyRoll(a, world) * total;
  let last: StanceId | undefined;
  for (let i = 0; i < STANCE_IDS.length; i++) {
    if (STANCE_W[i] <= 0) continue;
    last = STANCE_IDS[i];
    roll -= STANCE_W[i];
    if (roll <= 0) break;
  }
  return last;
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
