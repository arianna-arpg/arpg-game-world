// ---------------------------------------------------------------------------
// AI RUNTIME — drives monsters AND player minions through the same skill
// pipeline the player uses. Conduct is DATA (see brain.ts): a BrainDef bundles
// orthogonal axes (move / target / perception / skillUse / morale / squad /
// tempo / behavior) and the machines (HP-ladder phases, the script FSM,
// condition rules, the cycle). The 13 classic archetypes are presets
// expressed in that vocabulary.
//
// Each tick, an actor resolves its EFFECTIVE tuning (base ← ladder phase ←
// script phase ← active rules ← impulse), then runs the pipeline:
//
//   gates → machines → morale → reserves → orders → perception/threat →
//   idle life (heel, patrol, formation, wander) → squad gates → the
//   movement KERNEL (which owns the cast/move interleave, like the old
//   brains did — kernels are a REGISTRY, extensible by packages).
//
// All of it reads skills' `ai` hints from data, so any catalog skill works
// on any brain with zero AI changes.
// ---------------------------------------------------------------------------

import { angleDiff, angleTo, dist, rand, vec, type Vec2 } from '../core/math';
import { MONSTERS } from '../data/monsters';
import { mod } from './stats';
import type { Actor } from './actor';
import {
  alertScale, ARCHETYPES, BEHAVIOR_CFG, BEHAVIOR_STATS, evalCondition, FLOCK_CFG, mergeTuning,
  normalizeBrain, POST_CFG, tuningOf,
  type AICtx, type BehaviorSpec, type BrainDef, type BrainTuning, type CommandState,
  type MoveSpec, type NormalizedBrain, type PhaseCadence, type SkillPolicy,
} from './brain';
import { erraticTurn, weaveVel } from './flight';
import { runAIActions } from './aiActions';
import { nearestBody, segsHittable } from './segments';
import { LOS_CFG } from './los';
import { socketSpec, type SkillInstance } from './skills';
import type { World } from './world';
import { PATH_CFG } from '../world/regions';

/** Scratch for moveToward's spacing neighbor query (single-threaded AI
 *  loop; never held across calls). */
const spacingScratch: Actor[] = [];

/** Scratch for the flock steer's neighbor query + weave velocity (same
 *  single-threaded contract as spacingScratch). */
const flockScratch: Actor[] = [];
const flockVecScratch = vec(0, 0);

/** Tags whose actor stays NEUTRAL — no targeting, movement, or casting — until a
 *  wounding strike ROUSES it (World.resolveHit sets the per-actor aiAwakened latch).
 *  An OPEN registry: the engine seeds the built-in five (Conclave cultists,
 *  Migration herds, the Holdfast toll-wardens, Brigand bands, Wayfarers); a
 *  package adds its own species with registerDormantTag(tag, reset?) — never
 *  by editing this list. (A new species usually also wants a rouse rule —
 *  World.rouseRules in world.ts — which decides HOW a wounding hit wakes it.) */
export const DORMANT_TAGS = new Set<string>([
  'ritual_cultist', 'migrant', 'toll_bandit', 'brigand', 'wayfarer',
  // Extraction dispersal walkers: 'extraction_leaver' wakes on a wound (its
  // rouse rule in world.ts — the WARY temper); the '_resolute' variant has no
  // rouse rule and never wakes — skittish bodies and spent expeditions keep
  // walking even under fire.
  'extraction_leaver', 'extraction_leaver_resolute',
]);

/** A roused neutral COOLS BACK to dormant after disengagement. */
export interface NeutralResetRule {
  /** Seconds out of combat (no hit dealt OR taken) before it may re-dormant. */
  coolDownSecs: number;
  /** ...AND the nearest live player must be beyond this distance (you must RETREAT). */
  disengageDist: number;
}
/** LEASH-RECALL tunables: when a heeling minion is stuck or hopelessly far,
 *  it teleports home instead of perpetually locking its reservation away. */
const RECALL = {
  /** "No progress" = moved less than this since the window started. */
  stuckEps: 30,
  /** Seconds of no progress before the port. */
  stuckAfter: 3.0,
  /** Beyond this distance from the owner, port immediately. */
  hardDist: 2200,
  /** Per-minion re-port cooldown. */
  cooldown: 5,
};

/** Returns true when the minion was just recalled (skip normal heeling). */
function updateRecall(actor: Actor, world: World, dt: number): boolean {
  const owner = actor.owner;
  if (!owner || MONSTERS[actor.defId ?? '']?.noRecall) return false;
  actor.recallTimer -= dt;
  const port = (): boolean => {
    if (actor.recallTimer > 0) return false;
    actor.recallTimer = RECALL.cooldown;
    actor.lastProgress = undefined;
    const ang = rand(0, Math.PI * 2);
    world.teleportActor(actor, vec(
      owner.pos.x + Math.cos(ang) * 50, owner.pos.y + Math.sin(ang) * 50), '#b8a0e0');
    return true;
  };
  if (dist(actor.pos, owner.pos) > RECALL.hardDist) return port();
  const lp = actor.lastProgress;
  if (!lp) {
    actor.lastProgress = { x: actor.pos.x, y: actor.pos.y, at: world.time };
    return false;
  }
  if (Math.hypot(actor.pos.x - lp.x, actor.pos.y - lp.y) >= RECALL.stuckEps) {
    actor.lastProgress = { x: actor.pos.x, y: actor.pos.y, at: world.time };
    return false;
  }
  if (world.time - lp.at >= RECALL.stuckAfter) return port();
  return false;
}

/** Per-tag rouse-RESET rules (World.updateNeutralCooldown reads these generically). A
 *  DORMANT_TAGS tag ABSENT here NEVER cools down — latched-once (a betrayed ritual
 *  cultist never forgives). The toll wardens / migration herd / brigands lose interest
 *  if you back off without a fight — their aim is profit / passage, not slaughter. */
export const NEUTRAL_RESET: Record<string, NeutralResetRule> = {
  toll_bandit: { coolDownSecs: 8, disengageDist: 360 }, // wardens settle back to the gate (parley re-opens)
  migrant: { coolDownSecs: 6, disengageDist: 320 },     // the herd calms and resumes the march
  brigand: { coolDownSecs: 7, disengageDist: 420 },     // the band loses interest if you outrun them (must exceed aggroRadius)
  wayfarer: { coolDownSecs: 6, disengageDist: 300 },    // travelers FORGIVE — back off and they return to the road
  // ritual_cultist intentionally omitted — a roused cultist stays hostile.
};

/** Register a NEW dormant species: `tag` joins the dormancy gate (updateAI
 *  holds the body until aiAwakened), and `reset` — when given — lets a roused
 *  one cool back to neutral (omit it for latched-once hostility, the ritual-
 *  cultist temperament). Idempotent per tag: a Set membership carries no
 *  payload to fight over, and re-registering a reset simply retunes it (a
 *  package hot-reloading its own row must not warn). Call at module init from
 *  the package's own def file — the seed lists above never grow again. */
export function registerDormantTag(tag: string, reset?: NeutralResetRule): void {
  DORMANT_TAGS.add(tag);
  if (reset) NEUTRAL_RESET[tag] = reset;
}

/** DORMANT = tag-gated neutral that hasn't been roused. THE predicate every
 *  fabric reads (one definition, never re-derived): the AI gate holds the
 *  brain, and the world's displacement physics — wind drift, knockback/pull
 *  shoves, the sky's own strikes (Zone.spareDormant) — treat the body as
 *  PLANTED: nothing environmental may scatter or provoke a sentry the player
 *  hasn't brought into play. Rousing (aiAwakened) lifts all of it at once. */
export function isDormant(a: Actor): boolean {
  return a.tag !== undefined && DORMANT_TAGS.has(a.tag) && !a.aiAwakened;
}

// === THE DUTY POST =============================================================
// PostSpec (brain.ts): a posted body belongs at a spot — a spawner's exact
// stamp (Actor.aiPost) or its first-tick anchor — and walks back whenever it
// strays, whether it was shoved, gale-blown, or roused and then reset. Pure
// conduct: no engine system needs to know WHY it moved.

/** The post itself: a spawner's exact stamp wins; else the first-tick anchor. */
function postOf(actor: Actor): Vec2 | undefined {
  return actor.postSpec ? (actor.aiPost ?? actor.aiAnchor) : undefined;
}

/** Walk a strayed posted body home. Hysteresis: the walk STARTS past the
 *  spec's slack and ENDS at POST_CFG.arrive (never jitters at the line);
 *  arriving re-plants the posted facing. Returns true while the walk owns
 *  the tick. Runs for dormant AND awake bodies — anchored ones never walk. */
function updatePostReturn(actor: Actor, world: World, dt: number): boolean {
  const home = postOf(actor);
  if (!home || actor.anchored) return false;
  const spec = actor.postSpec!;
  const d = dist(actor.pos, home);
  if (actor.postHoming ? d <= POST_CFG.arrive : d <= (spec.slack ?? POST_CFG.slack)) {
    if (actor.postHoming) {
      actor.postHoming = false;
      // Re-plant: the watch bearing is part of the post.
      if (actor.aiPostFacing !== undefined) actor.facing = actor.aiPostFacing;
    }
    return false;
  }
  actor.postHoming = true;
  actor.facing = angleTo(actor.pos, home);
  moveToward(actor, world, home, dt * (spec.pace ?? POST_CFG.pace));
  return true;
}

/** The idle-life step: the walk home when strayed; at the post, a `hold`
 *  spec (the default) consumes the tick standing the watch — posted facing
 *  held, no wander, no squad drill — while hold:false falls through (the
 *  body merely ORBITS home, milling like anyone else until it strays). */
function updatePost(actor: Actor, world: World, dt: number): boolean {
  if (!actor.postSpec) return false;
  if (updatePostReturn(actor, world, dt)) return true;
  if (actor.postSpec.hold === false) return false;
  if (postOf(actor) === undefined) return false;
  if (actor.aiPostFacing !== undefined) actor.facing = actor.aiPostFacing;
  return true; // stands the watch — the idle tick is consumed
}

// === THE COMMAND FABRIC ========================================================
// Orders are open, data-driven VERBS an actor can be put UNDER: `kind` names a
// handler in this registry, and while the order stands the handler owns the
// actor's agenda each tick — marching it, posting it, or AIMING the normal
// pipeline at the order's quarry. New order verbs are new entries here (or
// registerCommandKind calls from packages), never engine edits. Who issues,
// to whom, and whether each recipient LISTENS is the caller's business
// (CommandMinionsEffect rolls obedienceOf + discipline before issuing).

/** Command-fabric tunables — the modular thresholds. Effect fields override
 *  per skill (CommandMinionsEffect.duration/markRadius/radius). */
export const COMMAND_CFG = {
  /** Seconds a default order stands. */
  duration: 6,
  /** Engagement radius around the MARK — how wide "whatever holds it" reads. */
  markRadius: 180,
  /** Close enough to the mark to count as arrived. */
  arriveDist: 55,
  /** Squad orders carry this far without an explicit radius (a howl is
   *  literal earshot). */
  earshot: 640,
  /** An aim point within this of a live foe PINS that foe (focus fire). */
  pinRadius: 52,
};

export interface CommandKindDef {
  id: string;
  /** Drive one tick under the order. Returns:
   *  - 'consumed': the handler moved/acted — skip the pipeline this tick;
   *  - 'done':     fulfilled — clear the order, the actor's own mind resumes;
   *  - an Actor:   fight THIS through the normal pipeline (the kernels own
   *                the cast/move interleave — the order only aims them);
   *  - undefined:  nothing to impose this tick — fall through unaimed. */
  step(actor: Actor, world: World, cmd: CommandState, dt: number):
    'consumed' | 'done' | Actor | undefined;
}

/** The open order registry — a new command verb is a new entry, not engine. */
export const COMMAND_KINDS: Record<string, CommandKindDef> = {};
export function registerCommandKind(def: CommandKindDef): void {
  COMMAND_KINDS[def.id] = def;
}
export function hasCommandKind(id: string): boolean { return !!COMMAND_KINDS[id]; }

/** Put an actor UNDER an order, now: the current agenda drops (target lock +
 *  grudge ledger cleared) so the order actually overrides — a cast already in
 *  flight resolves on its own and the actor obeys from its next free tick.
 *  Obedience is the CALLER's to roll (obedienceOf + issuer discipline). */
export function issueCommand(actor: Actor, cmd: CommandState): void {
  actor.aiCommand = cmd;
  actor.aiTargetId = undefined;
  actor.threat.clear();
  actor.wanderDir = undefined;
}

/** The chance this actor ACCEPTS an order: last tick's RESOLVED tuning when
 *  it has one (machines shift it live — an enraged phase can go deaf), else
 *  the brain's own base. Unset = 1: a player's court obeys utterly; unruly
 *  packs dial it down in their MonsterDef brains. */
export function obedienceOf(actor: Actor): number {
  return actor.aiObedience
    ?? normalizeBrain(actor.brain ?? DEFAULT_BRAIN).base.obedience
    ?? 1;
}

/** Nearest live foe within `r` of `at` — what "whatever holds the mark" means. */
function foeNear(actor: Actor, world: World, at: Vec2, r: number): Actor | undefined {
  let best: Actor | undefined, bd = r;
  for (const e of world.enemiesOf(actor)) {
    if (e.passive || e.sheet.get('invisible') > 0) continue;
    const d = dist(e.pos, at);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

// ASSAULT — the flagship order (Command: Assault / a warcaller's bark): march
// on the mark and kill whatever holds it. The pinned quarry outranks
// geography; an empty mark, reached, means the order is fulfilled.
registerCommandKind({
  id: 'assault',
  step(actor, world, cmd, dt) {
    const pinned = cmd.targetId !== undefined ? world.actorById(cmd.targetId) : undefined;
    if (pinned && !pinned.dead && !pinned.downed && !pinned.untargetable
      && pinned.team !== actor.team && pinned.sheet.get('invisible') <= 0) {
      return pinned;
    }
    const foe = foeNear(actor, world, cmd.pos, cmd.radius ?? COMMAND_CFG.markRadius);
    if (foe) return foe;
    if (dist(actor.pos, cmd.pos) > COMMAND_CFG.arriveDist) {
      actor.facing = angleTo(actor.pos, cmd.pos);
      moveToward(actor, world, cmd.pos, dt);
      return 'consumed';
    }
    return 'done';
  },
});

// HOLD — stand the mark and repel what comes: assault's geometry, but an
// empty mark is a POST, not a finish line — held until the order expires.
registerCommandKind({
  id: 'hold',
  step(actor, world, cmd, dt) {
    const foe = foeNear(actor, world, cmd.pos, cmd.radius ?? COMMAND_CFG.markRadius);
    if (foe) return foe;
    if (dist(actor.pos, cmd.pos) > COMMAND_CFG.arriveDist) {
      actor.facing = angleTo(actor.pos, cmd.pos);
      moveToward(actor, world, cmd.pos, dt);
    }
    return 'consumed';
  },
});

/** Default frontal sight-cone width (degrees) and rear-hearing fraction of
 *  detection range — PerceptionSpec / MonsterDef.vision override per monster. */
const VISION_ARC_DEG = 150;
const VISION_REAR_MUL = 0.35;
/** How hard stealth charges shroud their bearer (× detection reach). */
const STEALTH_DETECT_MUL = 0.35;
/** Brainless actors run the plain approach-and-attack bundle. */
const DEFAULT_BRAIN: BrainDef = {};

// === THE PIPELINE ==============================================================

export function updateAI(actor: Actor, world: World, dt: number): void {
  // Skip ANY player seat (the local hero AND co-op allies) — they're driven by
  // World.applyInputs (OS / scripted / remote intent), never the monster brain.
  // A DOWNED body (a felled companion awaiting revival) doesn't scheme either.
  if (actor.dead || actor.downed || world.seatOf(actor)) return;
  // THE TIMEFLOW GATE (engine/timeflow.ts): a held body doesn't scheme —
  // stasis and a paused world skip the brain outright; fractional time
  // thinks (and so paces its cadences and kernels) in slow motion. Gated
  // HERE so every caller — the live loop, the balance sim — inherits it.
  const tf = world.timeflow.scaleFor(actor);
  if (tf <= 0) return;
  if (tf !== 1) dt *= tf;
  // Constructs (decoys included) act through the world, not the brain.
  if (actor.construct) return;
  // A stalk-creep stamp lives one combat tick only — cleared here so idle
  // wander, orders and heel moves never pay a stale watched-freeze.
  actor.aiStalkCreep = undefined;
  // The spawn ANCHOR: stamped on the FIRST tick (the PLACED position), so
  // arena-relative choreography (teleport-to-anchor, anchored rings) has a
  // home. Stamped ABOVE every hold-still early-out below (ambush, burrow,
  // passive, dormant) — a dormant sentry shoved off its mark must remember
  // where the mark WAS, not where it happened to stand when it woke.
  actor.aiAnchor ??= vec(actor.pos.x, actor.pos.y);
  // A posted body's watch bearing is part of the post (updatePostReturn
  // re-wears it on every re-plant).
  if (actor.postSpec) actor.aiPostFacing ??= actor.facing;
  // An ARMED ambusher IS scenery — no scheming until the world springs it.
  if (actor.ambushArmed) return;
  // A BURROWED body is underground — stepBurrow owns it until the eruption.
  if (actor.burrow) return;
  // Scenery doesn't scheme: barrels, caches and townsfolk hold still.
  if (actor.passive) return;
  // DRIVEN actors (the caravan cart) are wheeled by an event tick, not a brain.
  if (actor.defId && MONSTERS[actor.defId]?.driven) return;
  // NEUTRAL-until-roused (Conclave cultists chanting in place, Migration herds ambling
  // through — wheeled by World.updateMigrants — and the Holdfast toll-wardens holding
  // the gate): dormant until a wounding hit sets aiAwakened (World.resolveHit). Per-
  // actor + tag-keyed (DORMANT_TAGS), so only the provoked one wakes and its kin hold,
  // and it's inert to every other actor. Once roused it falls through to its own brain.
  // A POSTED dormant body (a toll warden) that finds itself off its mark —
  // gale-drift from before it was planted, a shove, a rouse-and-retreat —
  // walks back and re-plants WITHOUT waking: the parley the player finds is
  // the one that was authored, wherever the sky has been in the meantime.
  if (isDormant(actor)) {
    updatePostReturn(actor, world, dt);
    return;
  }

  // An armed fuse burns down no matter what else is happening.
  if (actor.fuse !== undefined) {
    actor.fuse -= dt;
    if (actor.fuse <= 0) {
      actor.fuse = undefined;
      world.kill(actor); // a real death: xp, and the explodeOnDeath payload
    }
    return;
  }
  if (actor.leap) return; // airborne

  // WARD WATCHER (the add-gate): the moment no live actor carries the ward
  // tag, the ward SHATTERS — targetable again, with the promised announce.
  if (actor.aiWardTag && !world.actors.some(x => !x.dead && x.tag === actor.aiWardTag)) {
    actor.untargetable = false;
    if (actor.aiWardNote) {
      world.text(vec(actor.pos.x, actor.pos.y - 50), actor.aiWardNote, '#ffd060', 20);
    }
    world.flashes.push({
      pos: vec(actor.pos.x, actor.pos.y), radius: 170,
      color: '#ffd060', life: 0.7, maxLife: 0.7,
    });
    actor.aiWardTag = undefined;
    actor.aiWardNote = undefined;
  }

  // A FEINT mid-flight drops its bar at the appointed beat — no payload,
  // just the bait (the stun-interrupt idiom: clearing casting is enough).
  // Every mind that read the bar spent its read on a lie.
  if (actor.aiFeintAt > 0 && world.time >= actor.aiFeintAt) {
    actor.aiFeintAt = 0;
    if (actor.casting && actor.casting.mode !== 'channel') actor.casting = null;
  }

  // Resolve the EFFECTIVE tuning this tick and run the machines (ladder,
  // script, rules, impulses) — phase transitions, cadences and rule actions
  // all fire in here.
  const norm = normalizeBrain(actor.brain ?? DEFAULT_BRAIN);
  const tuning = resolveMachines(actor, world, norm);

  // Threat is a LEDGER, not a grudge: entries melt while unfed.
  if (actor.threat.size) {
    const decay = tuning.target?.threat?.decay ?? 0.08;
    for (const [id, v] of actor.threat) {
      const left = v * (1 - decay * dt);
      if (left < 0.5) actor.threat.delete(id); else actor.threat.set(id, left);
    }
  }

  // TEMPO bookkeeping: stamp this tick's kite spec (the retreat gate reads
  // it), and let the wind RECOVER while the actor isn't backpedaling.
  actor.aiKiteSpec = tuning.tempo?.kite !== undefined
    ? { kite: tuning.tempo.kite, windedFor: tuning.tempo.windedFor }
    : undefined;
  // Stamp the RESOLVED obedience so the command roll (world.ts, an event —
  // not a tick) reads live machine layers: an enraged phase can go deaf.
  actor.aiObedience = tuning.obedience;
  // Stamp the RESOLVED prey so the hostility gate (World.isPrey) sees what
  // the machines see — a hunger rule can switch predation on and off live.
  actor.aiPrey = tuning.target?.prey;
  // Elbow room re-stamps below once a target locks; idle/ordered movement
  // never pays for it.
  actor.aiSpacing = undefined;
  // PATHING (MoveSpec.pathing): stamped every tick so the machines can
  // shift it live (a panicked phase can go 'none'); moveToward reads it.
  actor.aiPathing = tuning.move?.pathing;
  // HAZARD MIND (MoveSpec.hazards): stamped beside it — the wayfaring
  // fabric's lever; moveToward's pricing and the steering veto read it.
  actor.aiHazardMode = tuning.move?.hazards;
  // THE MURMURATION (BehaviorSpec.flock): stamped every tick — idle and
  // combat alike, a flock murmurates with nobody watching — and machine-
  // shiftable, so an aloft phase wears heavy coupling and a grounded
  // feeding window sheds it. steerMove folds it into every self-directed
  // step; undefined = not a flock body, one branch of cost.
  actor.aiFlock = tuning.behavior?.flock;

  // THE WANTS (BrainDef.drives): meters drift on their clocks — events jump
  // them elsewhere (World.bumpDrives: kills feed, wounds sting). Seeded on
  // first sight of each spec, so every spawn path rolls its own appetites.
  if (norm.drives) {
    for (const id in norm.drives) {
      const spec = norm.drives[id];
      let v = actor.drives.get(id);
      if (v === undefined) {
        const s = spec.start ?? [0, 0];
        v = rand(s[0], s[1]);
      }
      if (spec.rise) v += spec.rise * dt;
      actor.drives.set(id, Math.max(0, Math.min(1, v)));
    }
  }
  if (actor.aiKiteAcc > 0 && world.time - actor.aiLastRetreatAt > 0.15) {
    actor.aiKiteAcc = Math.max(0, actor.aiKiteAcc - dt * 0.6);
  }
  // The movement DUTY CYCLE: locomotion breathes in bursts with dead stops
  // between (animal hesitation, human repositioning). A paused entity still
  // CASTS — the pause is your window, not its disarmament.
  let tempoPaused = false;
  const tp = tuning.tempo;
  if (tp?.moveFor && tp.pauseFor) {
    if (world.time >= actor.aiTempoUntil) {
      actor.aiTempoPaused = !actor.aiTempoPaused;
      const win = actor.aiTempoPaused ? tp.pauseFor : tp.moveFor;
      actor.aiTempoUntil = world.time + rand(win[0], win[1]);
    }
    tempoPaused = actor.aiTempoPaused;
  }

  // A flee is a TRANSIENT retreat (the flag) OR a whole disposition (the
  // 'flee' archetype: roused calves bolting down the herd's march line) —
  // either way it overrides everything until the actor escapes, then it
  // FIGHTS in the next zone.
  if (actor.aiFleeing || tuning.type === 'flee') return fleeStep(actor, world, dt);

  // MORALE: a broken actor routs — no casts, no schemes, just distance.
  if (updateMorale(actor, world, tuning, dt)) return;

  // READING THE CAST (BehaviorSpec.dodge): a player-brained sidestep out of
  // incoming telegraphs — a reflex that outranks every scheme below, but
  // never interrupts this body's OWN committed cast (that commitment is the
  // player's punish window, and fair is fair).
  if (updateDodge(actor, world, tuning, dt)) return;

  // MENDER PRE-PASS + RESERVES: an ally-targeted kit piece (clerics, spirit
  // menders) outranks the fight, and policy-reserved skills fire the moment
  // their condition holds. Actors without either fall through instantly.
  if (tryReserves(actor, world, tuning)) return;

  // COMMANDED (the order fabric): a standing order OWNS the agenda. The
  // kind's handler (COMMAND_KINDS — open registry) marches the actor, posts
  // it, or AIMS the pipeline at the order's quarry; its own hunt resumes
  // only when the order is fulfilled or expires. A cast already in flight
  // resolves untouched (moveActor gates rooted feet, canUse gates fresh
  // casts): the troops finish the swing, THEN obey. Any commanded actor
  // qualifies — your court, or a warcaller's pack (obedience was rolled at
  // issue; a deaf packmate never got the order at all).
  let ordered: Actor | undefined;
  if (actor.aiCommand) {
    const cmd = actor.aiCommand;
    const kindDef = COMMAND_KINDS[cmd.kind];
    if (!kindDef || cmd.until <= world.time) {
      actor.aiCommand = undefined;
    } else {
      const r = kindDef.step(actor, world, cmd, dt);
      if (r === 'done') actor.aiCommand = undefined;
      else if (r === 'consumed') return;
      else if (r) ordered = r;
    }
  }

  // ---- PERCEPTION → the threat chart → a target --------------------------
  let { target, d: best } = acquireTarget(actor, world, tuning);

  // The order's quarry OVERRIDES the actor's own pick — the commander aims
  // the pack; perception still ran its bookkeeping, but the blade goes
  // where it is pointed (an order is shared information: no sight required).
  if (ordered) {
    target = ordered;
    best = dist(actor.pos, ordered.pos);
    actor.aiTargetId = ordered.id;
  }

  // TAUNTED (the challenge fabric) — a LIVE taunt outranks the actor's own
  // pick AND any standing order: attention is the whole point of the
  // status, and no sight is required (the challenge was heard, not seen).
  // The taunter must still be a legal mark (alive, hostile, targetable);
  // ignoreTaunt brains — the un-cheesable bosses — shrug the retarget
  // exactly as they shrug decoys (the off-target damage penalty still
  // bites them at the damage chokepoint).
  if (!tuning.target?.ignoreTaunt) {
    const ts = actor.statuses.find(s => s.id === 'taunted' && s.casterId !== undefined);
    const taunter = ts ? world.actorById(ts.casterId!) : undefined;
    if (taunter && !taunter.dead && !taunter.untargetable
      && world.hostileTo(actor, taunter)) {
      target = taunter;
      best = dist(actor.pos, taunter.pos);
      actor.aiTargetId = taunter.id;
      actor.aggroed = true;
    }
  }

  // LEASH (TargetSpec.leash): guardians give up the marathon. Beyond the
  // tether they drop the lock and walk home (with hysteresis, so the edge
  // reads as straining at the chain, not flip-flop) — mending en route when
  // the data says so.
  const leash = tuning.target?.leash;
  if (leash && actor.aiAnchor && !actor.isMinion()) {
    const dHome = dist(actor.pos, actor.aiAnchor);
    if (actor.aiPhase === 'leash_home') {
      if (dHome < leash.radius * 0.55) {
        actor.aiPhase = '';
      } else {
        if (leash.heal) actor.healBy(actor.maxLife() * dt * 0.25);
        actor.facing = angleTo(actor.pos, actor.aiAnchor);
        moveToward(actor, world, actor.aiAnchor, dt);
        return;
      }
    } else if (dHome > leash.radius) {
      actor.aiPhase = 'leash_home';
      actor.aiTargetId = undefined;
      actor.aggroed = false;
      actor.threat.clear();
      actor.facing = angleTo(actor.pos, actor.aiAnchor);
      moveToward(actor, world, actor.aiAnchor, dt);
      return;
    }
  }

  // Minions with nothing to fight heel back to their owner. Guard-stance
  // minions (Meat Shield) keep a SHORT leash — they disengage anything that
  // would drag them off their master's flank. An ORDERED quarry is exempt
  // from both leashes: the commander explicitly sent them.
  if (!target || (actor.isMinion() && !ordered && best > (actor.guardMode ? 260 : 700))) {
    if (actor.owner && dist(actor.pos, actor.owner.pos) > 90) {
      // LEASH RECALL: a minion that can't make progress home (snagged on
      // terrain) or fell impossibly far behind TELEPORTS to its owner —
      // a reserved golem must never rot in a wall. Safe by construction:
      // this branch only runs with NO target, and an armed bomber fuse
      // early-returns long before the heel.
      if (actor.isMinion() && updateRecall(actor, world, dt)) return;
      actor.facing = angleTo(actor.pos, actor.owner.pos);
      moveToward(actor, world, actor.owner.pos, dt);
    }
    if (!target) {
      // Idle stalkers fade back into their shroud.
      if (tuning.move?.shroud) setShroud(actor, true);
      // ALERTED but blind: stalk toward where the blow came from, searching.
      if (world.time < actor.alertUntil && actor.alertFrom && !actor.isMinion()) {
        if (dist(actor.pos, actor.alertFrom) > 40) {
          actor.facing = angleTo(actor.pos, actor.alertFrom);
          moveToward(actor, world, actor.alertFrom, dt);
        } else {
          actor.alertFrom = null; // arrived — nothing here; back to the watch
        }
        return;
      }
      // PATROL: route-followers march their loop, camp to camp, until they
      // sight a foe (then they fall through to their brain and fight).
      if (actor.patrolRoute && actor.patrolRoute.length >= 2) {
        const node = actor.patrolRoute[actor.patrolIdx ?? 0];
        if (dist(actor.pos, node) < 40) {
          actor.patrolIdx = ((actor.patrolIdx ?? 0) + 1) % actor.patrolRoute.length;
        }
        actor.facing = angleTo(actor.pos, node);
        moveToward(actor, world, node, dt); // a full march, not the idle stroll
        return;
      }
      // Patrol rank-and-file heel to their leader — in FORMATION when the
      // squad drills one (ring / line / wedge / column / loose).
      if (actor.patrolFollow !== undefined) {
        const lead = world.actorById(actor.patrolFollow);
        if (lead && !lead.dead) {
          const post = formationPost(actor, world, lead, tuning) ?? lead.pos;
          if (dist(actor.pos, post) > (tuning.squad?.formation ? 24 : 60)) {
            actor.facing = angleTo(actor.pos, post);
            moveToward(actor, world, post, dt);
          }
        }
        return;
      }
      // THE DUTY POST (PostSpec): a posted body strayed past its slack walks
      // home; standing ON it, a `hold` post consumes the idle tick (the
      // sentry at attention, watch bearing held) while hold:false merely
      // orbits (folk mill about the hearth, walked back when they stray).
      // Deliberately BELOW patrol routes and ABOVE lure/drives/wander: a
      // route or an order outranks the post; duty outranks curiosity.
      if (!actor.isMinion() && updatePost(actor, world, dt)) return;
      // LURE FABRIC (World.setLure/lureFor): a live lure — a charging survey
      // spire, a future bait or noise — DRAWS the unaware toward its point.
      // Idle-only by construction (this branch is targetless), so combat,
      // orders, morale and fear all outrank the pull; drives and squad
      // demeanor DEFER to it (a supernatural glow beats hunger's amble).
      // The standoff ring keeps the drawn milling around the light instead
      // of stacking onto it.
      if (!actor.isMinion()) {
        const lure = world.lureFor(actor);
        if (lure && dist(actor.pos, lure.pos) > lure.standoff) {
          actor.facing = angleTo(actor.pos, lure.pos);
          moveToward(actor, world, lure.pos, dt * lure.pace);
          return;
        }
      }
      // DRIVE-DRIVEN IDLE LIFE (BehaviorSpec.seek): wants pull the idle
      // body — hunger walks toward prey it can't yet see (scent outranges
      // the sight cone), greed toward unclaimed shinies. A drive rule
      // layers this on, so the pack MIGRATES when the meter runs high and
      // merely mills about when it doesn't.
      const seek = tuning.behavior?.seek;
      if (seek && !actor.isMinion()) {
        const range = seek.range ?? BEHAVIOR_CFG.seekRange;
        const goal = seek.what === 'prey'
          ? world.seekPrey(actor, range)?.pos
          : world.seekLoot(actor, range);
        if (goal && dist(actor.pos, goal) > 40) {
          actor.facing = angleTo(actor.pos, goal);
          moveToward(actor, world, goal, dt * (seek.pace ?? 0.55));
          return;
        }
      }
      // Squad IDLE DEMEANOR: how the group carries itself with no foe in
      // sight — the militant drill, the lackadaisical amble with stragglers,
      // the idol-circling vigil, the stable stand/wander mix. Consumes the
      // tick when the demeanor moved (or deliberately stilled) this member.
      // CARRION FEEDING (MonsterDef.carrion): hurt and unbothered, the
      // scavenger noses to the nearest raisable corpse and eats it back to
      // health — and the corpse is GONE, denied to every spectre-reader and
      // corpse-raiser sharing the larder. OUTRANKS the squad's idle
      // demeanor: a wounded scavenger eats before it drills, or a pack
      // brain's amble would own every idle tick and the part would never
      // fire on exactly the kinds that pack.
      if (updateCarrion(actor, world, dt)) return;
      if (squadIdle(actor, world, tuning, dt)) return;
      // Idle WANDER: the zone lives whether or not you're watching.
      if (!actor.isMinion()) {
        actor.aiTimer -= dt;
        if (actor.aiTimer <= 0) {
          actor.aiTimer = rand(1.5, 4.5);
          // An AIRBORNE FLOCK BODY never parks (a locust can't hover-stand):
          // its idle always draws a bearing, so the fold's pull reaches it
          // every tick and the murmuration reads as perpetual motion.
          // Grounded and flockless idles keep their classic 35% dead stops.
          const restless = actor.aiFlock && actor.flying;
          actor.wanderDir = (!restless && Math.random() < 0.35) ? undefined : rand(0, Math.PI * 2);
        }
        if (actor.wanderDir !== undefined) {
          actor.facing = actor.wanderDir;
          // a stroll, not a march
          steerMove(actor, world, Math.cos(actor.wanderDir), Math.sin(actor.wanderDir), dt * 0.35);
        }
      }
      return;
    }
    // A minion whose only prey sits BEYOND its leash heels and lets it go —
    // it does not tug two ways at once (the v1 double-move quirk, retired).
    return;
  }
  actor.wanderDir = undefined; // combat focuses the mind

  // ELBOW ROOM (BehaviorSpec.spacing): closing movement repels off the
  // nearest packmate this tick — moveToward reads the stamp.
  actor.aiSpacing = tuning.behavior?.spacing;

  // THE UNWATCHED ADVANCE (BehaviorSpec.stalk): "watched" = the quarry's
  // facing bears on this body within the arc AND the sight line is open.
  // Stamped per combat tick; moveToward folds the creep into every closing
  // step. Movement only — a watched stalker in reach still bites.
  const stalk = tuning.behavior?.stalk;
  if (stalk) {
    const off = Math.abs(angleDiff(target.facing, angleTo(target.pos, actor.pos)));
    const halfArc = ((stalk.arcDeg ?? BEHAVIOR_CFG.stalkArc) * Math.PI / 180) / 2;
    if (off <= halfArc && world.lineOfSight(target.pos, actor.pos)) {
      actor.aiStalkCreep = stalk.creep ?? BEHAVIOR_CFG.stalkCreep;
    }
  }

  // LIVE AIM (BehaviorSpec.steerAim): the monster's "cursor" rides the prey
  // every tick — guided flights (guidePower, innate or a granted support
  // like puppet_strings) curve after it mid-flight, the player's own
  // marionette hand extended into the bestiary.
  const steer = tuning.behavior?.steerAim;
  if (steer && target) {
    const h = BEHAVIOR_CFG.steerHorizon * (steer.lead ?? 0);
    actor.aimPos = vec(target.pos.x + target.velEst.x * h, target.pos.y + target.velEst.y * h);
  }

  // A stalker that swapped to an unshrouded style de-cloaks.
  if (!tuning.move?.shroud && actor.aiShrouded) setShroud(actor, false);

  actor.facing = angleTo(actor.pos, target.pos);

  // FUSE ARMING: ordnance arms at range regardless of archetype — the bomber
  // preset carries the defaults; ANY brain can declare fuseRange and become
  // a walking bomb.
  const fuseActive = tuning.type === 'bomber' || norm.fuseRange !== undefined;
  if (fuseActive) {
    const trigger = (norm.fuseRange ?? 50) + actor.radius + target.radius;
    if (best <= trigger) {
      actor.fuse = norm.fuseTime ?? 0.7;
      world.text(vec(actor.pos.x, actor.pos.y - 14), '!!', '#ff5050', 16);
      return;
    }
  }

  // ---- SQUAD GATES ---------------------------------------------------------
  const squad = tuning.squad;
  if (squad && target) {
    // Focus fire: the rank-and-file adopt the leader's prey.
    if (squad.focusLeader && !actor.squadLeader && actor.squadId !== undefined) {
      const lead = world.actors.find(x =>
        !x.dead && x.squadId === actor.squadId && x.squadLeader);
      const lt = lead?.aiTargetId !== undefined ? world.actorById(lead.aiTargetId) : undefined;
      if (lt && !lt.dead && !lt.passive && lt.team !== actor.team
        && lt.sheet.get('invisible') <= 0) {
        target = lt;
        best = segsHittable(target)
          ? dist(actor.pos, nearestBody(target, actor.pos).pos)
          : dist(actor.pos, target.pos);
        actor.aiTargetId = lt.id;
        actor.facing = angleTo(actor.pos, target.pos);
      }
    }
    // MUSTER: hold the prowl ring until the band has numbers (blood up
    // commits early). Squadless muster counts nearby KIN, like the old
    // pack brain, so summoned hunters still coordinate. A muster is a
    // TACTIC, not a lock: the requirement caps at the kin actually ALIVE
    // to answer (the last wolf hunts alone), and past `patience` seconds
    // of unfulfilled waiting the hunger wins — no more prowling a slow
    // player to the horizon forever.
    if (squad.muster) {
      const m = squad.muster;
      let engaged = 0;
      let kin = 0;
      for (const a of world.actors) {
        if (a.dead || a.team !== actor.team) continue;
        if (actor.squadId !== undefined
          ? a.squadId !== actor.squadId
          : (a.faction !== actor.faction || a === actor)) continue;
        kin++;
        if (dist(a.pos, target.pos) < m.radius) engaged++;
      }
      if (actor.squadId === undefined) { kin++; engaged++; } // self, kin-counted implicitly above otherwise
      const bloodied = actor.life < actor.maxLife() * (m.bloodiedAt ?? 0.9);
      const need = Math.min(m.count, Math.max(1, kin));
      const patienceSpent = m.patience !== undefined && actor.aiEngagedAt >= 0
        && world.time - actor.aiEngagedAt >= m.patience;
      if (engaged < need && !bloodied && !patienceSpent) {
        // not yet: prowl a wide circle around the prey — and no casting;
        // a waiting wolf doesn't spend its teeth.
        runKernel('prowl', makeCtx(actor, world, target, best, dt, tuning, norm, true, tempoPaused));
        return;
      }
    }
    // ENGAGE TOKENS: only so many blades in the target's face at once; the
    // unlucky orbit the ring, casting what reaches, until a slot frees.
    if (squad.tokens && actor.squadId !== undefined
      && !world.requestEngage(actor, target.id, squad.tokens)) {
      const ctx = makeCtx(actor, world, target, best, dt, tuning, norm, false, tempoPaused);
      ctx.spec = { ...ctx.spec, style: 'orbit', ring: Math.max(190, standoff(actor).desired + 90) };
      runKernel('orbit', ctx);
      return;
    }
  }

  // ---- THE KERNEL: cast/move interleave, per style ---------------------------
  // A MOUNTED rider doesn't steer — the beast carries it (updateMounts pins
  // the saddle); it holds and casts, a walking tower's teeth. This is the
  // ENGAGED path — the only one that claims encircle ring slots.
  const ctx = makeCtx(actor, world, target, best, dt, tuning, norm, false, tempoPaused, true);
  runKernel(actor.mountId !== undefined ? 'hold' : ctx.spec.style ?? 'approach', ctx);
}

// === MACHINES ==================================================================
// Ladder phases (v1, kept one-way), the script FSM (re-entrant, goto-driven),
// rules (condition→behavior), impulses (periodic sugar) — resolved into ONE
// effective tuning per tick; scripted beats fire from in here.

function aiCtxOf(world: World): AICtx {
  return {
    time: world.time,
    actors: world.actors,
    lineOfSight: (a, b) => world.lineOfSight(vec(a.x, a.y), vec(b.x, b.y)),
    factionDrive: (id, faction) => world.sim.drives.get(id, faction),
  };
}

function resolveMachines(actor: Actor, world: World, norm: NormalizedBrain): BrainTuning {
  const t = world.time;
  const lastTarget = actor.aiTargetId !== undefined
    ? (world.actorById(actor.aiTargetId) ?? null) : null;
  const ctx = aiCtxOf(world);
  const layers: (BrainTuning | undefined)[] = [norm.base];

  // --- the CYCLE: a strict looping duty cycle of tunings --------------------
  // "Hold off, rush, hold off" — exact alternation on rolled windows, never
  // drifting. Beneath phases/rules, so sharper machines override it.
  if (norm.cycle && norm.cycle.length) {
    if (actor.aiCycleAt === 0) {
      actor.aiCycleIdx = 0;
      actor.aiCycleAt = t + rand(norm.cycle[0].for[0], norm.cycle[0].for[1]);
    } else if (t >= actor.aiCycleAt) {
      actor.aiCycleIdx = (actor.aiCycleIdx + 1) % norm.cycle.length;
      const step = norm.cycle[actor.aiCycleIdx];
      actor.aiCycleAt = t + rand(step.for[0], step.for[1]);
    }
    layers.push(norm.cycle[actor.aiCycleIdx % norm.cycle.length].use);
  }

  // --- the HP LADDER (v1): one-way, deepest-entered wins -------------------
  if (!norm.script && norm.phases && norm.phases.length) {
    const frac = actor.life / Math.max(1, actor.maxLife());
    let deepest = -1;
    for (let i = 0; i < norm.phases.length; i++) if (frac <= norm.phases[i].atLifeFrac) deepest = i;
    if (deepest > actor.aiPhaseIdx) {
      actor.aiPhaseIdx = deepest;
      const ph = norm.phases[deepest];
      actor.sheet.setSource('aiPhase', ph.mods ?? []);
      world.onBrainPhaseEnter(actor, ph); // sets aiFleeing for flee phases
      if (ph.onEnter) runAIActions(world, actor, ph.onEnter, lastTarget);
      resetCadences(actor, ph.cadences, t);
    }
    const phase = actor.aiPhaseIdx >= 0 ? norm.phases[actor.aiPhaseIdx] : undefined;
    if (phase) {
      tickCadences(actor, world, phase.cadences, lastTarget);
      layers.push(phase.use ?? (phase.type ? { type: phase.type } : undefined));
    }
  }

  // --- the SCRIPT FSM: explicit goto transitions, re-entrant phases ---------
  if (norm.script && norm.script.length) {
    if (actor.aiScriptIdx < 0) {
      enterScriptPhase(actor, world, norm, 0, lastTarget);
    } else {
      const cur = norm.script[actor.aiScriptIdx];
      for (const g of cur.goto ?? []) {
        if (g.atLifeFrac !== undefined
          && actor.life / Math.max(1, actor.maxLife()) > g.atLifeFrac) continue;
        if (g.after !== undefined && t - actor.aiPhaseAt < g.after) continue;
        if (g.tagCleared !== undefined
          && world.actors.some(x => !x.dead && x.tag === g.tagCleared)) continue;
        if (g.when !== undefined && !evalCondition(g.when, actor, lastTarget, ctx)) continue;
        if (g.when?.chance !== undefined && Math.random() >= g.when.chance) continue;
        const to = typeof g.to === 'number'
          ? g.to : norm.script.findIndex(p => p.id === g.to);
        if (to >= 0 && to < norm.script.length) {
          if (cur.onExit) runAIActions(world, actor, cur.onExit, lastTarget);
          enterScriptPhase(actor, world, norm, to, lastTarget);
        }
        break;
      }
    }
    const cur = norm.script[actor.aiScriptIdx];
    if (cur) {
      tickCadences(actor, world, cur.cadences, lastTarget);
      layers.push(cur.use);
    }
  }

  // --- RULES: the condition→behavior DSL ------------------------------------
  if (norm.rules.length) {
    const states = actor.aiRuleState ??= [];
    for (let i = 0; i < norm.rules.length; i++) {
      const rule = norm.rules[i];
      const st = states[i] ??= { until: 0, readyAt: 0, fired: false };
      let active: boolean;
      if (rule.once && st.fired) {
        // A fired once-rule LATCHES its overrides forever (the enrage that
        // never cools) — its actions never repeat.
        active = !!rule.use;
      } else {
        const holdActive = st.until > t;
        const level = evalCondition(rule.when, actor, lastTarget, ctx);
        // Plain rules are LEVEL-triggered (active while true); hold/every
        // rules are WINDOW-triggered (active only inside their hold).
        active = holdActive || (!rule.every && !rule.hold && level);
        if (level && !holdActive && t >= st.readyAt) {
          if (rule.when.chance === undefined || Math.random() < rule.when.chance) {
            st.fired = true;
            const hold = rule.hold ? rand(rule.hold[0], rule.hold[1]) : 0;
            st.until = t + hold;
            st.readyAt = rule.every
              ? st.until + rand(rule.every[0], rule.every[1])
              : t + (rule.cooldown ?? 1);
            if (rule.announce) {
              world.text(vec(actor.pos.x, actor.pos.y - 20), rule.announce, '#e8d44a', 13);
            }
            if (rule.actions) runAIActions(world, actor, rule.actions, lastTarget);
            if (hold > 0) active = true;
          } else {
            st.readyAt = t + (rule.cooldown ?? 1); // failed the roll: try again later
          }
        }
      }
      if (active && rule.use) layers.push(rule.use);
    }
  }

  // --- IMPULSES (v1 sugar): periodic archetype bursts ------------------------
  if (norm.impulses && norm.impulses.length && !actor.aiFleeing) {
    if (actor.aiImpulseType && t >= actor.aiImpulseUntil) actor.aiImpulseType = undefined;
    if (!actor.aiImpulseType && t >= actor.aiImpulseNext) {
      const imp = norm.impulses[Math.floor(Math.random() * norm.impulses.length)];
      actor.aiImpulseType = imp.type;
      actor.aiImpulseUntil = t + rand(imp.duration[0], imp.duration[1]);
      actor.aiImpulseNext = actor.aiImpulseUntil + rand(imp.every[0], imp.every[1]);
      if (imp.announce) world.text(vec(actor.pos.x, actor.pos.y - 20), imp.announce, '#e8d44a', 13);
    }
  } else if (actor.aiImpulseType) {
    actor.aiImpulseType = undefined; // a flee cancels any active impulse
  }
  if (actor.aiImpulseType) layers.push({ type: actor.aiImpulseType });

  // --- the TUNING GRAFT: the per-BODY layer stamped by events/skills --------
  // (Actor.aiTuning). Merged LAST — the world's hand outranks the body's own
  // machines while the graft stands; clearing it restores the native brain.
  if (actor.aiTuning) layers.push(actor.aiTuning);

  // Resolve each layer's preset (its `type`) into axes, then merge in order.
  return mergeTuning(...layers.map(l => (l ? tuningOf(l) : undefined)));
}

function enterScriptPhase(
  actor: Actor, world: World, norm: NormalizedBrain, idx: number, lastTarget: Actor | null,
): void {
  const ph = norm.script![idx];
  actor.aiScriptIdx = idx;
  actor.aiPhaseAt = world.time;
  actor.sheet.setSource('aiPhase', ph.mods ?? []);
  if (ph.announce) world.text(vec(actor.pos.x, actor.pos.y - 26), ph.announce, '#ffd700', 16);
  if (ph.rewardGems) for (let i = 0; i < ph.rewardGems; i++) world.dropGemAt(actor.pos);
  if (ph.onEnter) runAIActions(world, actor, ph.onEnter, lastTarget);
  resetCadences(actor, ph.cadences, world.time);
}

function resetCadences(actor: Actor, cadences: PhaseCadence[] | undefined, t: number): void {
  actor.aiCadenceAt = cadences?.map(c => t + (c.first ?? c.every) + rand(0, c.jitter ?? 0));
}

function tickCadences(
  actor: Actor, world: World, cadences: PhaseCadence[] | undefined, lastTarget: Actor | null,
): void {
  if (!cadences || !actor.aiCadenceAt) return;
  for (let i = 0; i < cadences.length && i < actor.aiCadenceAt.length; i++) {
    if (world.time < actor.aiCadenceAt[i]) continue;
    actor.aiCadenceAt[i] = world.time + cadences[i].every
      + rand(-(cadences[i].jitter ?? 0), cadences[i].jitter ?? 0);
    runAIActions(world, actor, cadences[i].actions, lastTarget);
  }
}

// === MORALE ====================================================================

/** Whether it dares. Returns true while ROUTING (the tick is consumed: run). */
function updateMorale(actor: Actor, world: World, tuning: BrainTuning, dt: number): boolean {
  const m = tuning.morale;
  /** The nearest thing worth fleeing: enemies normally; for the SKITTISH,
   *  ANY non-kin body counts — a hare doesn't check allegiances. */
  const nearestThreat = (): Vec2 | null => {
    let from: Vec2 | null = null;
    let bd = Infinity;
    if (m?.skittish) {
      for (const a of world.actors) {
        if (a === actor || a.dead || a.passive || a.construct || a.untargetable) continue;
        if (a.defId === actor.defId) continue; // kin don't spook kin
        if (actor.squadId !== undefined && a.squadId === actor.squadId) continue;
        if (a.sheet.get('invisible') > 0) continue;
        const d = dist(actor.pos, a.pos);
        if (d < bd) { bd = d; from = a.pos; }
      }
      return from ?? actor.aiLastSeen ?? null;
    }
    for (const e of world.enemiesOf(actor)) {
      if (e.passive || e.sheet.get('invisible') > 0) continue;
      const d = dist(actor.pos, e.pos);
      if (d < bd) { bd = d; from = e.pos; }
    }
    return from ?? actor.aiLastSeen ?? null;
  };
  const rout = (): boolean => {
    // REFUGE (MonsterDef.refuge): a routed creature with a bolt-hole makes
    // FOR it instead of merely running — and slips away on arrival (the
    // frog's dive). Falls through to the ordinary rout when none is near.
    if (actor.refuge && refugeStep(actor, world, dt)) return true;
    // Run from the nearest visible threat (memory of the last target serves
    // when nothing is in sight — panic doesn't reason). JUKE-movers flee in
    // hooks and freezes (the hare's flight); everyone else runs straight.
    const from = nearestThreat();
    if (from) {
      if (tuning.move?.style === 'juke') {
        jukeAway(actor, world, from, dt, tuning.move);
      } else {
        actor.facing = angleTo(actor.pos, from);
        moveAway(actor, world, from, dt);
      }
    }
    return true;
  };
  if (actor.aiMoraleUntil > world.time) return rout();
  // PANIC (StatusDef.panic — the fear CC class): a status-driven rout that
  // overrides the body's own courage spec entirely — the bravest wall flees
  // while horrified. Rides the SAME rout (refuges, jukes, squad dynamics),
  // so fear composes with every flight behavior already authored.
  if (actor.isPanicked()) return rout();
  if (!m || (m.breakAtLife === undefined && !m.breakOutnumbered && !m.skittish)) return false;
  // SKITTISH: anything non-kin inside the bubble is reason enough to bolt.
  if (m.skittish) {
    for (const a of world.actors) {
      if (a === actor || a.dead || a.passive || a.construct || a.untargetable) continue;
      if (a.defId === actor.defId) continue;
      if (actor.squadId !== undefined && a.squadId === actor.squadId) continue;
      if (a.sheet.get('invisible') > 0) continue;
      if (dist(actor.pos, a.pos) > m.skittish.radius) continue;
      const dur = m.skittish.duration ?? [1.2, 2.2];
      actor.aiMoraleUntil = world.time + rand(dur[0], dur[1]);
      return rout();
    }
  }
  // Courage holds while the squad leader stands close.
  if (m.boldNearLeader && actor.squadId !== undefined && !actor.squadLeader) {
    const lead = world.actors.find(x =>
      !x.dead && x.squadId === actor.squadId && x.squadLeader);
    if (lead && dist(actor.pos, lead.pos) <= m.boldNearLeader) return false;
  }
  let breaks = false;
  if (m.breakAtLife !== undefined) {
    const frac = actor.life / Math.max(1, actor.maxLife());
    if (frac >= m.breakAtLife) {
      actor.aiMoraleBroke = false; // recovered above the line: courage re-arms
    } else if (!actor.aiMoraleBroke) {
      // ONE rout per crossing — a coward that already ran and is still
      // cornered turns desperate rather than fleeing forever.
      actor.aiMoraleBroke = true;
      breaks = true;
    }
  }
  if (!breaks && m.breakOutnumbered) {
    const { deficit, radius } = m.breakOutnumbered;
    let foes = 0, friends = 0;
    for (const a of world.actors) {
      if (a.dead || a.passive || a.construct) continue;
      if (dist(a.pos, actor.pos) > radius) continue;
      if (a.team === actor.team) friends++; else foes++;
    }
    if (foes - friends >= deficit) breaks = true;
  }
  if (!breaks) return false;
  actor.aiMoraleUntil = world.time + (m.rallyAfter ?? 3);
  world.text(vec(actor.pos.x, actor.pos.y - 18), '!!', '#e8d44a', 14);
  return rout();
}

// === READING THE CAST ===========================================================

/** The telegraph-evade reflex (BehaviorSpec.dodge). Watches the world's
 *  imminent threats to this body (un-exploded blast discs; enemy cast bars
 *  stamped onto the ground it stands on), rolls the READ once per telegraph,
 *  waits out the reaction, then DIVES radially clear. The dive owns the tick
 *  (no casting, no scheming — dodging is a commitment); a body mid-cast of
 *  its own never dives. Returns true while it consumed the tick. */
function updateDodge(actor: Actor, world: World, tuning: BrainTuning, dt: number): boolean {
  // A dive in progress runs to its exit (or its window's end).
  if (actor.aiDodgeExit) {
    if (world.time >= actor.aiDodgeUntil || dist(actor.pos, actor.aiDodgeExit) < 14) {
      actor.aiDodgeExit = undefined;
    } else {
      actor.facing = angleTo(actor.pos, actor.aiDodgeExit);
      moveToward(actor, world, actor.aiDodgeExit, dt);
      return true;
    }
  }
  const spec = tuning.behavior?.dodge;
  if (!spec) return false;
  const threat = world.imminentThreatTo(actor, spec.pad ?? BEHAVIOR_CFG.dodgePad);
  if (!threat) {
    actor.aiDodgeRef = undefined;
    return false;
  }
  if (threat.ref !== actor.aiDodgeRef) {
    // A FRESH telegraph: one roll decides whether this mind reads it at
    // all, and the reaction window decides how late the feet answer. The
    // READ happens even mid-swing — busy hands don't blind the eyes.
    actor.aiDodgeRef = threat.ref;
    actor.aiDodgeRead = Math.random() < (spec.chance ?? 1);
    const rw = spec.reaction ?? BEHAVIOR_CFG.dodgeReaction;
    actor.aiDodgeAt = world.time + rand(rw[0], rw[1]);
  }
  if (!actor.aiDodgeRead || world.time < actor.aiDodgeAt) return false;
  // The BODY may still be locked: mid-cast of its own (a commitment the
  // player can punish — it finishes the swing or eats the blast), mid-dash
  // (the world carries it), or anchored on a garrison perch. The mind has
  // read the threat; the feet answer the moment they're free.
  if (actor.casting || actor.dash || actor.garrison) return false;
  // EXIT GEOMETRY (dodge.exit): 'nearest' takes the shortest line out;
  // 'away' clears through the far side from the CASTER (ranged minds open
  // distance as they dive); 'lateral' crosses perpendicular to the
  // caster's line — the player-strafe dodge that keeps its own range.
  let out: number;
  if (dist(threat.pos, actor.pos) < 1) {
    out = rand(0, Math.PI * 2);
  } else if (spec.exit === 'away' && threat.casterPos) {
    out = angleTo(threat.casterPos, actor.pos);
  } else if (spec.exit === 'lateral' && threat.casterPos) {
    const line = angleTo(threat.casterPos, actor.pos);
    const side = angleDiff(line, angleTo(threat.pos, actor.pos)) >= 0 ? 1 : -1;
    out = line + side * (Math.PI / 2);
  } else {
    out = angleTo(threat.pos, actor.pos);
  }
  const clear = threat.radius + actor.radius + 8;
  actor.aiDodgeExit = vec(
    threat.pos.x + Math.cos(out) * clear,
    threat.pos.y + Math.sin(out) * clear);
  actor.aiDodgeUntil = world.time + Math.min(BEHAVIOR_CFG.dodgeWindowMax, threat.eta + 0.25);
  actor.facing = angleTo(actor.pos, actor.aiDodgeExit);
  moveToward(actor, world, actor.aiDodgeExit, dt);
  return true;
}

// === PERCEPTION & THE THREAT CHART =============================================

/** Score a candidate — bigger is better; all scores are positive so kind
 *  bias and stickiness compose multiplicatively. */
function scoreTarget(
  prefer: NonNullable<import('./brain').TargetSpec['prefer']>,
  actor: Actor, e: Actor, d: number,
): number {
  switch (prefer) {
    case 'nearest': return 1 / (d + 24);
    case 'farthest': return d + 1;
    case 'highestThreat': return (actor.threat.get(e.id) ?? 0) + 1 / (d + 24);
    case 'lowestLife': return (1 - e.life / Math.max(1, e.maxLife())) + 0.05 / (d + 24);
    case 'highestLife': return e.life / Math.max(1, e.maxLife()) + 0.05 / (d + 24);
    case 'random': {
      // Stable per-pair pseudo-random: preference without per-tick thrash.
      const h = Math.sin(actor.id * 374761.393 + e.id * 668265.263) * 43758.5453;
      return 0.1 + (h - Math.floor(h));
    }
  }
}

function acquireTarget(
  actor: Actor, world: World, tuning: BrainTuning,
): { target: Actor | null; d: number } {
  // Sight is a CONE: full detection range inside the frontal arc, a short
  // all-around HEARING radius behind it — so flanking and backstabs are real
  // tactics, not wishes. Stealth charges SHROUD their bearer hard on top;
  // `invisible` removes them entirely. An ALERTED actor (struck from the
  // shadows, or its kin was) watches all around at heightened range instead.
  const per = tuning.perception;
  // ATTENTION SPAN (dim brains): the lock LAPSES — forget the target and
  // stumble into a short daze. A landed hit since the daze began snaps the
  // actor out of it (pain is a great teacher, briefly).
  if (per?.attentionSpan && actor.aiTargetId !== undefined
    && world.time >= actor.aiAttendUntil) {
    actor.aiTargetId = undefined;
    actor.aggroed = false;
    actor.aiDazeFrom = world.time;
    actor.aiDazeUntil = world.time + rand(1.5, 3);
  }
  if (actor.aiDazeUntil > world.time && actor.lastCombatAt >= actor.aiDazeFrom) {
    actor.aiDazeUntil = 0; // re-stimulated: the haze lifts
  }
  const dazed = actor.aiDazeUntil > world.time;
  let detect = actor.sheet.get('detectionRange') * (tuning.target?.detectMul ?? 1);
  if (tuning.target?.relentless && actor.aggroed) detect = Infinity;
  // The daze is a HARD lapse — the thread is gone even with the quarry at
  // arm's length; only pain (the re-stimulation above) or its passing
  // restores the eyes. Walk on; it has forgotten you.
  if (dazed) detect = 0;
  const vis = actor.defId ? MONSTERS[actor.defId]?.vision : undefined;
  const arcHalf = ((per?.arcDeg ?? vis?.arcDeg ?? VISION_ARC_DEG) * Math.PI / 180) / 2;
  const rearMul = per?.rearMul ?? vis?.rearMul ?? VISION_REAR_MUL;
  const alerted = world.time < actor.alertUntil;
  const prefer = tuning.target?.prefer ?? 'nearest';
  const bias = tuning.target?.kindBias;
  // WALLS BLIND (LOS_CFG.perception): a FRESH lock needs an actual sight
  // line — stone between you and it, and you are not there. A HELD lock
  // survives blindness for the chase-memory window (the hunter rounds the
  // corner after you — pathing does the walking) before the thread snaps;
  // relentless bonds never let go, and xray minds (tremor-sense) read
  // through anything. Rays ride the world's memo so this stays event-rate.
  const losGated = LOS_CFG.perception && per?.xray !== true;

  let target: Actor | null = null;
  let bestScore = -Infinity;
  let bestD = Infinity;
  let current: Actor | null = null;
  let currentScore = 0;
  let currentD = 0;
  let tauntTarget: Actor | null = null;
  let tauntBest = Infinity;
  for (const e of world.enemiesOf(actor)) {
    if (e.sheet.get('invisible') > 0) continue;
    // Scenery is not prey: nobody dedicates their life to a barrel,
    // and the townsfolk are not on the menu.
    if (e.passive) continue;
    // SEGMENT FABRIC: a segmented creature is engaged by its NEAREST
    // hittable body — the coil beside you counts, not only the far head.
    // Detection, range gates and kiting all inherit this d. Perception
    // LoS below stays head-based (you SEE the creature by its head);
    // plain monsters take the classic center distance, byte-identical.
    const d = segsHittable(e)
      ? dist(actor.pos, nearestBody(e, actor.pos).pos)
      : dist(actor.pos, e.pos);
    let reach = detect * e.sheet.get('detectability');
    if ((e.charges.get('stealth') ?? 0) > 0) reach *= STEALTH_DETECT_MUL;
    if (alerted) reach *= 1.5;
    else if (Math.abs(angleDiff(actor.facing, angleTo(actor.pos, e.pos))) > arcHalf) reach *= rearMul;
    if (d > reach) continue;
    if (losGated) {
      if (e.id !== actor.aiTargetId) {
        if (!world.losCached(actor, e)) continue; // unseen strangers don't exist
      } else if (!world.losCached(actor, e)
        && !(tuning.target?.relentless && actor.aggroed)) {
        const holdFor = Math.max(per?.memory ?? 0, LOS_CFG.chaseMemory);
        if (world.time - actor.aiLosSeenAt > holdFor) continue; // the thread snaps
      }
    }
    if (e.taunt && d < tauntBest) { tauntBest = d; tauntTarget = e; }
    let score = scoreTarget(prefer, actor, e, d);
    if (bias) score *= bias[e.kind ?? 'monster'] ?? 1;
    if (e.id === actor.aiTargetId) { current = e; currentScore = score; currentD = d; }
    if (score > bestScore) { bestScore = score; target = e; bestD = d; }
  }
  // STICKINESS: a challenger must beat the held lock by the margin, or the
  // lock holds (taunts still override below).
  const stick = tuning.target?.stickiness ?? 1;
  if (current && target && target !== current && bestScore <= currentScore * stick) {
    target = current;
    bestD = currentD;
  }
  if (tauntTarget && !tuning.target?.ignoreTaunt) { target = tauntTarget; bestD = tauntBest; }
  if (target && tuning.target?.relentless) actor.aggroed = true;
  // Fighting resets the leash-recall stuck window — a stationary brawl must
  // never read as "snagged on terrain" the moment it ends.
  if (target) actor.lastProgress = undefined;

  if (target) {
    if (actor.aiTargetId === undefined) {
      // A FRESH engagement (openers key off it) — and the sentry's CALLOUT:
      // kin within the shout radius go on alert toward the prey.
      if (actor.aiEngagedAt < 0
        || world.time - Math.max(actor.lastCombatAt, actor.aiEngagedAt) > 8) {
        actor.aiEngagedAt = world.time;
        // REACTION (BehaviorSpec.reaction): dim wits take a beat between
        // sighting and the first cast — the feet close, the blade waits.
        const react = tuning.behavior?.reaction;
        if (react) actor.aiReactAt = world.time + rand(react[0], react[1]);
      }
      // Dim brains roll how long this lock can HOLD their attention.
      if (per?.attentionSpan) {
        actor.aiAttendUntil = world.time + rand(per.attentionSpan[0], per.attentionSpan[1]);
      }
      const shout = tuning.perception?.alertShout;
      if (shout) {
        for (const a of world.actors) {
          if (a.dead || a === actor || a.team !== actor.team || a.passive || a.construct) continue;
          if (dist(a.pos, actor.pos) > shout) continue;
          a.alertUntil = Math.max(a.alertUntil, world.time + 5 * alertScale(a));
          a.alertFrom ??= vec(target.pos.x, target.pos.y);
        }
      }
    }
    actor.aiTargetId = target.id;
    // The last-SEEN ledger stays honest: position and clock refresh only
    // while the eye actually reaches (a blind chase stalks a stale spot).
    if (!losGated || world.losCached(actor, target)) {
      actor.aiLosSeenAt = world.time;
      actor.aiLastSeen = vec(target.pos.x, target.pos.y);
    }
  } else if (actor.aiTargetId !== undefined) {
    // LOST the lock: with perception memory, stalk the last-seen position
    // (rides the alert-investigate walk); without, shrug back to the watch.
    actor.aiTargetId = undefined;
    const memory = tuning.perception?.memory ?? 0;
    if (memory > 0 && actor.aiLastSeen && !actor.isMinion()) {
      actor.alertUntil = Math.max(actor.alertUntil, world.time + memory);
      actor.alertFrom = vec(actor.aiLastSeen.x, actor.aiLastSeen.y);
    }
  }
  return { target, d: bestD };
}

// === SKILL POLICY ===============================================================

/** Weighted / priority / rotation pick among usable skills (in range, off
 *  cooldown, affordable), honoring openers, combos, reserves, and the
 *  commander's support range. */
function pickSkill(
  actor: Actor, world: World, best: number, tuning: BrainTuning,
  target?: Actor,
): SkillInstance | null {
  if (actor.aiCooldown > 0) return null;
  // GUARD COMBOS: a raised shield is not "busy" for the skills drilled to
  // work around it (usableWhileGuarding / requiresGuard — Bastion and
  // Phalanx Thrust). The pick narrows to exactly those while guarding;
  // canUse's guardCombo path clears the cast itself.
  const guarding = actor.isGuarding();
  if (!actor.canAct() && !guarding) return null;
  const policy: SkillPolicy = tuning.skillUse ?? {};
  const reserved = policy.reserve?.length
    ? new Set(policy.reserve.map(r => r.skill)) : undefined;
  const rangeOf = (s: SkillInstance): number => {
    if (policy.supportRange) {
      const support = s.def.tags.includes('buff') || s.def.delivery.type === 'summon';
      if (support) return Math.max(s.def.ai!.range, policy.supportRange);
    }
    return s.def.ai!.range;
  };
  // HOLD FIRE without a firing line (occlusion): skills whose delivery a
  // wall would eat are unusable while the line is blocked — the caster
  // keeps closing/pathing instead of pumping rays into stone. PER SKILL,
  // so a meteor caster ('free' occlusion) still bombards from behind its
  // wall while its rays wait. One lazy ray per pick.
  let fire: boolean | undefined;
  const fireLine = (): boolean =>
    fire ??= !target || world.lineOfFire(actor.pos, target.pos);
  // pressUsable, not raw canUse: a convert-held press is judged as the
  // face it would cast — an empty magazine still gets pressed (the press
  // IS the reload, and the standing-there-racking window is the player's
  // opening; the gunner walks into weapon range to do it).
  const usable = actor.skills.filter((s): s is SkillInstance =>
    !!s && !!s.def.ai && !reserved?.has(s.def.id)
    // Mid-stance the menu narrows to the combo verbs — def-declared or
    // socket-granted (Guarded Casting makes any carried spell one).
    && (!guarding || !!s.def.usableWhileGuarding || !!s.def.requiresGuard
      || !!socketSpec(s, 'guardCast'))
    && world.pressUsable(actor, s) && best <= rangeOf(s)
    && !(s.def.delivery.type === 'aura' && actor.activeAuras.has(s.def.id))
    && (!world.aiNeedsFireLine(actor, s) || fireLine()));
  if (!usable.length) return null;
  // OPENER: the first cast of a fresh engagement, when it reaches.
  if (policy.opener && (!actor.aiLastSkill || actor.aiLastSkill.at < actor.aiEngagedAt)) {
    const open = usable.find(s => s.def.id === policy.opener);
    if (open) return open;
  }
  // COMBOS: a landed `after` begs its `then` within the window.
  const last = actor.aiLastSkill;
  if (policy.combos && last) {
    for (const c of policy.combos) {
      if (c.after !== last.id || world.time - last.at > (c.window ?? 4)) continue;
      const then = usable.find(s => s.def.id === c.then);
      if (then) return then;
    }
  }
  if (policy.mode === 'priority' && policy.order) {
    for (const id of policy.order) {
      const s = usable.find(u => u.def.id === id);
      if (s) return s;
    }
    return null;
  }
  if (policy.mode === 'rotation' && policy.order?.length) {
    const order = policy.order;
    for (let k = 0; k < order.length; k++) {
      const idx = (actor.aiRotIdx + k) % order.length;
      const s = usable.find(u => u.def.id === order[idx]);
      if (s) { actor.aiRotIdx = idx + 1; return s; }
    }
    return null;
  }
  // WEIGHTED (the default): each skill's declared ai.weight.
  let totalWeight = 0;
  for (const s of usable) totalWeight += s.def.ai!.weight;
  let roll = rand(0, totalWeight);
  for (const s of usable) {
    roll -= s.def.ai!.weight;
    if (roll <= 0) return s;
  }
  return usable[usable.length - 1];
}

function useOn(
  actor: Actor, world: World, inst: SkillInstance, target: Actor, tuning?: BrainTuning,
): void {
  // Resolved tuning never carries a null axis (mergeTuning clears it), but a
  // RAW layer can — coalesce for the aim path's plain-optional signature.
  world.useSkill(actor, inst, aimPointFor(actor, inst, target, tuning?.behavior ?? undefined));
  const cad = tuning?.skillUse?.cadence ?? [0.15, 0.4];
  actor.aiCooldown = rand(cad[0], cad[1]);
  actor.aiLastSkill = { id: inst.def.id, at: world.time };
}

/** Where the cast actually POINTS (BehaviorSpec, the aim knobs): the classic
 *  conduct aims at the victim's live position; a LEADING mind solves the
 *  intercept over cast time + projectile flight against the victim's read
 *  velocity (per-cast chance); SLOPPY hands scatter the bearing; a BODY-AIMED
 *  caster (castArc) fires along its turn-clamped facing, so an incomplete
 *  pivot is a real whiff. The lead/jitter knobs read through the stat sheet
 *  (spec = innate base) so curses and auras can bend an enemy's mind. */
function aimPointFor(
  actor: Actor, inst: SkillInstance, target: Actor, beh?: BehaviorSpec,
): Vec2 {
  // No early-out on a missing spec: the sheet is ALWAYS consulted (innate
  // base 0), so a Bewilder curse scatters even a mind that was never
  // authored to have one. Two stat reads per cast — event-rate, not tick-rate.
  let ax = target.pos.x, ay = target.pos.y;
  // PET MELEE catches movers by default: with no authored aimLead, a
  // PLAYER-SIDE melee bar (minions, companions, mercenaries) solves the
  // intercept at BEHAVIOR_CFG.meleeLead — the swing stamped where the prey
  // WILL be at bar's end. Without it, any idly-strafing enemy is immune to
  // a slow pet as a free baseline (the tamed wolf that never lands). The
  // default is deliberately ONE-SIDED: enemy melee prediction stays an
  // AUTHORED lever (dim things keep whiffing at strafing players), so the
  // fix never smuggles in a global difficulty bump.
  const petSide = !!actor.owner || actor.kind === 'minion'
    || actor.kind === 'companion' || actor.kind === 'mercenary';
  const innate = beh?.aimLead
    ?? (petSide && inst.def.delivery.type === 'melee' ? BEHAVIOR_CFG.meleeLead : 0);
  const lead = actor.sheet.get(BEHAVIOR_STATS.aimLead, undefined, undefined, innate);
  if (lead !== 0 && target !== actor && Math.random() < (beh?.aimLeadChance ?? 1)) {
    const del = inst.def.delivery;
    const flight = del.type === 'projectile'
      ? dist(actor.pos, target.pos) / Math.max(60, del.speed) : 0;
    const horizon = Math.min(BEHAVIOR_CFG.leadHorizonMax, actor.skillUseTime(inst) + flight);
    let lx = target.velEst.x * horizon * lead;
    let ly = target.velEst.y * horizon * lead;
    const mag = Math.hypot(lx, ly);
    if (mag > BEHAVIOR_CFG.leadCap) {
      lx *= BEHAVIOR_CFG.leadCap / mag;
      ly *= BEHAVIOR_CFG.leadCap / mag;
    }
    ax += lx; ay += ly;
  }
  const jitter = actor.sheet.get(BEHAVIOR_STATS.aimJitter, undefined, undefined, beh?.aimJitter ?? 0);
  const bodyAimed = beh?.castArc !== undefined;
  if (jitter > 0 || bodyAimed) {
    // Bearing errors rotate about the CASTER: the reach is kept, the line moves.
    const dx = ax - actor.pos.x, dy = ay - actor.pos.y;
    const reach = Math.hypot(dx, dy);
    if (reach > 1) {
      // Body-aimed casts fire along the CLAMPED facing (facingPrev — see the
      // castArc gate): mid-pivot, the blow lands where the mass points.
      let bearing = bodyAimed ? (actor.facingPrev ?? actor.facing) : Math.atan2(dy, dx);
      if (jitter > 0) bearing += rand(-jitter, jitter);
      ax = actor.pos.x + Math.cos(bearing) * reach;
      ay = actor.pos.y + Math.sin(bearing) * reach;
    }
  }
  return vec(ax, ay);
}

/** The healer's instinct + policy RESERVES. Ally-targeted kit pieces mend the
 *  most wounded friend in reach (below 85%) before any fighting; reserved
 *  skills fire the moment their declared condition holds. Returns true when
 *  a cast was made this tick. */
function tryReserves(actor: Actor, world: World, tuning: BrainTuning): boolean {
  if (actor.aiCooldown > 0 || !actor.canAct()) return false;
  const reserves = tuning.skillUse?.reserve;
  const reservedIds = reserves?.length ? new Set(reserves.map(r => r.skill)) : undefined;
  // Policy reserves first — the sharper intent wins.
  if (reserves) {
    const ctx = aiCtxOf(world);
    const lastTarget = actor.aiTargetId !== undefined
      ? (world.actorById(actor.aiTargetId) ?? null) : null;
    for (const r of reserves) {
      const inst = actor.skills.find(s => s?.def.id === r.skill);
      if (!inst?.def.ai || !actor.canUse(inst)) continue;
      if (!evalCondition(r.when, actor, lastTarget, ctx)) continue;
      if (r.when.chance !== undefined && Math.random() >= r.when.chance) continue;
      if (inst.def.targeting?.target === 'ally') {
        const sick = mostWoundedAlly(actor, world, inst, 1.01); // any ally in reach
        if (!sick) continue;
        useOn(actor, world, inst, sick, tuning);
        return true;
      }
      if (lastTarget && !lastTarget.dead
        && dist(actor.pos, lastTarget.pos) <= inst.def.ai.range) {
        useOn(actor, world, inst, lastTarget, tuning);
        return true;
      }
      // Self-shaped skills (novas, buffs, guards) fire in place.
      if (inst.def.tags.includes('buff') || inst.def.delivery.type === 'nova'
        || inst.def.delivery.type === 'aura') {
        useOn(actor, world, inst, actor, tuning);
        return true;
      }
    }
  }
  // The generic mender pre-pass: any ally-targeted skill NOT explicitly
  // reserved mends the most wounded friend below 85% — owner included.
  for (const s of actor.skills) {
    if (!s?.def.ai || s.def.targeting?.target !== 'ally') continue;
    if (reservedIds?.has(s.def.id)) continue;
    if (!actor.canUse(s)) continue;
    const sick = mostWoundedAlly(actor, world, s, 0.85);
    if (!sick) continue;
    useOn(actor, world, s, sick, tuning);
    return true;
  }
  return false;
}

function mostWoundedAlly(
  actor: Actor, world: World, inst: SkillInstance, below: number,
): Actor | null {
  const reach = inst.def.targeting?.castRange ?? inst.def.ai!.range;
  let sick: Actor | null = null;
  let worst = below;
  for (const a of world.actors) {
    if (a.dead || a === actor || a.team !== actor.team
      || a.construct || a.untargetable) continue;
    if (dist(actor.pos, a.pos) > reach) continue;
    const frac = a.life / Math.max(1, a.maxLife());
    if (frac < worst) { worst = frac; sick = a; }
  }
  return sick;
}

// === CARRION FEEDING (MonsterDef.carrion) ========================================

/** The feeding loop's modular thresholds (avoid-hardcoding: tune here). */
export const CARRION_CFG = {
  /** Default corpse-scent reach (px) when the spec names none. */
  radius: 340,
  /** Approach pace as a fraction of full stride (a saunter, not a charge). */
  pace: 0.55,
  /** Muzzle reach beyond the body's own radius (px) to start eating. */
  biteReach: 16,
  /** Default heal per second, as a fraction of max life. */
  rate: 0.06,
  /** Default seconds of eating that CONSUME the corpse outright. */
  time: 2.2,
  /** Seconds of zero approach progress before the meal is SNUBBED (the
   *  unreachable-corpse wedge guard) and how long the snub holds. */
  stallAfter: 1.5,
  snubFor: 6,
};

/** Hurt + idle + a corpse in scent range → walk to it and eat: life back per
 *  second while feeding, and after the spec's `time` the corpse is REMOVED —
 *  the same `World.corpses` larder spectre corpse-reads and raise skills
 *  draw from, so the scavenger literally eats the necromancer's material.
 *  Returns true while the meal (or the walk to it) owns this idle tick. */
function updateCarrion(actor: Actor, world: World, dt: number): boolean {
  const spec = actor.defId ? MONSTERS[actor.defId]?.carrion : undefined;
  if (!spec || actor.life >= actor.maxLife() - 0.5) { actor.carrionEatT = 0; return false; }
  // A snubbed larder (an unreachable meal, below) stays off the menu long
  // enough for ordinary idle life to move the body somewhere new.
  if (world.time < actor.carrionSnubUntil) return false;
  const reach = spec.radius ?? CARRION_CFG.radius;
  let best: { pos: Vec2 } | null = null;
  let bd = reach;
  for (const c of world.corpses) {
    const d = dist(actor.pos, c.pos);
    if (d < bd) { bd = d; best = c; }
  }
  if (!best) { actor.carrionEatT = 0; return false; }
  actor.facing = angleTo(actor.pos, best.pos);
  if (bd > actor.radius + CARRION_CFG.biteReach) {
    actor.carrionEatT = 0;
    // STALL GUARD: a meal it cannot actually close on (across water, behind
    // a cliff lip) must not wedge the feeder into walking-in-place — no
    // progress for stallAfter seconds snubs the larder and frees the tick.
    if (bd >= actor.carrionStallD - 1) {
      actor.carrionStallT += dt;
      if (actor.carrionStallT >= CARRION_CFG.stallAfter) {
        actor.carrionSnubUntil = world.time + CARRION_CFG.snubFor;
        actor.carrionStallT = 0;
        actor.carrionStallD = Infinity;
        return false;
      }
    } else {
      actor.carrionStallT = 0;
      actor.carrionStallD = bd;
    }
    moveToward(actor, world, best.pos, dt * CARRION_CFG.pace);
    return true;
  }
  actor.carrionStallT = 0;
  actor.carrionStallD = Infinity;
  actor.carrionEatT += dt;
  actor.life = Math.min(actor.maxLife(),
    actor.life + (spec.rate ?? CARRION_CFG.rate) * actor.maxLife() * dt);
  if (actor.carrionEatT >= (spec.time ?? CARRION_CFG.time)) {
    const i = world.corpses.indexOf(best as (typeof world.corpses)[number]);
    if (i !== -1) world.corpses.splice(i, 1);
    actor.carrionEatT = 0;
    world.text(vec(actor.pos.x, actor.pos.y - 16), 'feeds', '#a8c87a', 11);
  }
  return true;
}

// === SHARED MOVEMENT HELPERS =====================================================

/** THE SELF-PRESERVATION GATE: every SELF-DIRECTED step in this file lands
 *  through here — knockback, pulls and scripted displacement never do, so
 *  shoving a body over a pit's lip stays the payoff it always was. A step
 *  about to carry the body into a fall/self-destruct boundary
 *  (World.fallHazardAt — void, abyss, chasm, open sky; insurance-aware, the
 *  airborne exempt) is REFUSED: slide along the rim on whichever axis still
 *  stands, else hold ground — a mind at the abyss paces the lip instead of
 *  grinding itself dead against the fall recovery (the old lemming loop:
 *  fall, re-orient, fall, ~18% max life a pop). 'lemming' minds
 *  (MoveSpec.hazards) opt out — authored self-destruction, one word away
 *  and machine-shiftable (bait a charge phase off a cliff by DESIGN). */
function steerMove(actor: Actor, world: World, dx: number, dy: number, dt: number): void {
  // THE MURMURATION (BehaviorSpec.flock, stamped as aiFlock): boid steering
  // folded into the desire BEFORE the self-preservation veto — the flock
  // bends the mind's bearing, the veto still refuses the rim. Composable
  // with every kernel and every idle conduct: an orbiting flock wheels as
  // one vortex, a fleeing one drives as a herd.
  if (actor.aiFlock && dt > 0) {
    const v = flockSteer(actor, world, dx, dy, dt);
    dx = v.x; dy = v.y;
  }
  if (actor.aiHazardMode !== 'lemming' && (dx !== 0 || dy !== 0)) {
    const m = Math.hypot(dx, dy) || 1;
    const look = actor.radius + PATH_CFG.vetoLookahead;
    const px = actor.pos.x, py = actor.pos.y;
    if (world.fallHazardAt(actor, px + (dx / m) * look, py + (dy / m) * look)) {
      if (dx !== 0 && !world.fallHazardAt(actor, px + Math.sign(dx) * look, py)) dy = 0;
      else if (dy !== 0 && !world.fallHazardAt(actor, px, py + Math.sign(dy) * look)) dx = 0;
      else return; // rim-pinned: stand, don't step off
    }
  }
  world.moveActor(actor, dx, dy, dt);
}

/** THE FLOCK STEER — the classic boid triad (separation / cohesion /
 *  alignment) plus the trajectory axes (weave / erratic — engine/flight.ts,
 *  the projectile integrator's own math), blended into a unit-space desire.
 *  Flockmates are actors that THEMSELVES wear a flock spec and match the
 *  kin rule — a drone is never dragged into its cousins' wheeling, and two
 *  packs that drift together merge into one murmuration. Neighbors come
 *  from the actor grid (one O(local) query per carrier tick), contributions
 *  capped at FLOCK_CFG.maxNeighbors — a starling tracks its seven nearest,
 *  and so do we. moveActor normalizes the result: direction is all that
 *  leaves here. */
function flockSteer(
  actor: Actor, world: World, dx: number, dy: number, dt: number,
): { x: number; y: number } {
  const fl = actor.aiFlock!;
  const R = fl.radius ?? FLOCK_CFG.radius;
  const m = Math.hypot(dx, dy);
  let ux = m > 0.001 ? dx / m : 0;
  let uy = m > 0.001 ? dy / m : 0;
  const sepR = R * FLOCK_CFG.sepFrac;
  const kin = fl.kin ?? 'def';
  let n = 0, cx = 0, cy = 0, ax = 0, ay = 0, sx = 0, sy = 0;
  for (const b of world.actorsNear(actor.pos.x, actor.pos.y, R, flockScratch)) {
    if (b === actor || b.dead || b.team !== actor.team || !b.aiFlock) continue;
    if (kin === 'def' ? b.defId !== actor.defId
      : kin === 'squad' ? (actor.squadId === undefined || b.squadId !== actor.squadId)
      : b.faction !== actor.faction) continue;
    const d = dist(actor.pos, b.pos);
    if (d > R) continue;
    n++;
    cx += b.pos.x; cy += b.pos.y;
    // Alignment reads the world-maintained velocity estimate — headings,
    // not speeds, so a paused straggler doesn't drag the mean to zero.
    const bm = Math.hypot(b.velEst.x, b.velEst.y);
    if (bm > 20) { ax += b.velEst.x / bm; ay += b.velEst.y / bm; }
    if (d < sepR && d > 0.01) {
      const w = 1 - d / sepR;
      sx += ((actor.pos.x - b.pos.x) / d) * w;
      sy += ((actor.pos.y - b.pos.y) / d) * w;
    }
    if (n >= FLOCK_CFG.maxNeighbors) break;
  }
  if (n > 0) {
    // WILL-THINNING: in company, the individual whim dilutes — the fold's
    // terms below outrank a lone body's own bearing, which is what turns
    // eight wanderers into one shape instead of a loose acquaintance.
    const will = Math.max(FLOCK_CFG.willFloor, 1 - n * FLOCK_CFG.willThin);
    ux *= will; uy *= will;
    const coh = (fl.cohesion ?? 1) * FLOCK_CFG.cohesionGain;
    const ali = (fl.alignment ?? 1) * FLOCK_CFG.alignmentGain;
    const sep = (fl.separation ?? 1) * FLOCK_CFG.separationGain;
    const gx = cx / n - actor.pos.x, gy = cy / n - actor.pos.y;
    const gm = Math.hypot(gx, gy);
    // Centroid pull at FULL strength until the body is inside the fold —
    // the ease knees at the separation reach (sepR), not the sense radius,
    // or mid-range cohesion is strangled and wander noise wins: the flock
    // breathes without ever condensing.
    if (gm > 1 && coh > 0) {
      const w = coh * Math.min(1, gm / sepR);
      ux += (gx / gm) * w; uy += (gy / gm) * w;
    }
    const am = Math.hypot(ax, ay);
    if (am > 0.01 && ali > 0) { ux += (ax / am) * ali; uy += (ay / am) * ali; }
    ux += sx * sep; uy += sy * sep;
  }
  // TRAJECTORY-WORN FLIGHT: erratic random-walks a mean-reverting bearing
  // offset (the integrator's own increment, bounded for a long-lived body);
  // weave folds the figure-eight's velocity form across the blended bearing
  // — the same lissajous the projectile's offset draws, phase-seeded by
  // actor id like every body rhythm in the engine.
  if (fl.erratic) {
    actor.aiFlockErr = actor.aiFlockErr * Math.max(0, 1 - FLOCK_CFG.erraticDecay * dt)
      + erraticTurn(fl.erratic, dt);
  } else if (actor.aiFlockErr !== 0) {
    actor.aiFlockErr = 0;
  }
  const um = Math.hypot(ux, uy);
  if (fl.weave || actor.aiFlockErr !== 0) {
    let head = um > 0.001 ? Math.atan2(uy, ux) : (actor.facingPrev ?? actor.facing);
    if (actor.aiFlockErr !== 0) {
      head += actor.aiFlockErr;
      const hm = um > 0.001 ? um : 1;
      ux = Math.cos(head) * hm; uy = Math.sin(head) * hm;
    }
    if (fl.weave) {
      const amp = fl.amplitude ?? FLOCK_CFG.amplitude;
      weaveVel(fl.weave, amp, world.time + actor.id * 1.7, head, flockVecScratch);
      ux += flockVecScratch.x / FLOCK_CFG.weaveRefSpeed;
      uy += flockVecScratch.y / FLOCK_CFG.weaveRefSpeed;
    }
  }
  return { x: ux, y: uy };
}

function moveToward(actor: Actor, world: World, to: { x: number; y: number }, dt: number): void {
  // Steer toward the next cell along the zone's walkable flow-field instead
  // of straight at the target — around warren walls AND plains cliff pockets
  // alike (World.pathField lazily rakes a nav grid over a convex zone's
  // blocking doodads). FLIERS cross everything and steer straight; 'none'
  // minds (MoveSpec.pathing) beeline and pile at walls — authored
  // mindlessness. An unreachable goal falls back to the straight steer.
  let goal = to;
  if (!actor.flying && actor.aiPathing !== 'none') {
    const pf = world.pathField();
    if (pf?.pathStep) {
      // ANY-ANGLE shortcut, PRICED (the wayfaring fabric): beeline while the
      // straight line is walkable AND no crossed ground costs this body more
      // than plain floor (linePreferred; profiles fold insurance and
      // MonsterDef.pathCosts) — open ground keeps its beelines, and a lava
      // lake in the line now consults the weighted flow field exactly like a
      // wall would. Models without costs keep the classic walkable-only gate.
      const profile = world.pathProfileFor(actor);
      const clean = pf.linePreferred
        ? pf.linePreferred(actor.pos, to, profile)
        : (pf.lineWalkable?.(actor.pos, to) ?? false);
      if (!clean) {
        const step = pf.pathStep(actor.pos, to, profile);
        if (step) goal = step;
      }
    }
  }
  let dx = goal.x - actor.pos.x, dy = goal.y - actor.pos.y;
  // ELBOW ROOM (BehaviorSpec.spacing, stamped per combat tick): a soft
  // repulsion off the nearest packmate folds into the goal bearing, so a
  // closing band arrives as a crescent instead of a conga line shoving its
  // own front rank out of cast range. Idle/ordered movement never pays.
  const room = actor.aiSpacing;
  if (room && room > 0) {
    let nx = 0, ny = 0, nd = room;
    // Only packmates within `room` can matter — a spatial-grid query, not a
    // world sweep (every moving band member paid O(actors) here per frame).
    for (const b of world.actorsNear(actor.pos.x, actor.pos.y, room, spacingScratch)) {
      if (b === actor || b.dead || b.team !== actor.team || b.passive || b.construct) continue;
      const bd = dist(actor.pos, b.pos);
      if (bd < nd) { nd = bd; nx = actor.pos.x - b.pos.x; ny = actor.pos.y - b.pos.y; }
    }
    if (nd < room) {
      const gm = Math.hypot(dx, dy) || 1;
      const nm = Math.hypot(nx, ny) || 1;
      const w = (1 - nd / room) * BEHAVIOR_CFG.spacingGain;
      dx = dx / gm + (nx / nm) * w;
      dy = dy / gm + (ny / nm) * w;
    }
  }
  // Worms slither: the approach weaves side to side.
  if (actor.worm) {
    const wob = Math.sin(world.time * 4 + actor.id * 1.3) * 0.55;
    const cos = Math.cos(wob), sin = Math.sin(wob);
    [dx, dy] = [dx * cos - dy * sin, dx * sin + dy * cos];
  }
  // THE UNWATCHED ADVANCE: a stamped stalk-creep scales the step (0 = a
  // statue while watched). Everything above still ran, so the body resumes
  // mid-stride the instant the gaze breaks.
  steerMove(actor, world, dx, dy, dt * (actor.aiStalkCreep ?? 1));
}

/** THE RETREAT GATE: every backpedal flows through here. A WINDED actor
 *  (kite budget spent — TempoSpec.kite) cannot retreat at all until the
 *  breath returns; otherwise the retreat runs AND drains the budget. This
 *  is what turns kiters from an exercise in futility into a rhythm: chase,
 *  wind them, capitalize. Returns true when movement actually happened. */
function retreatMove(actor: Actor, world: World, dx: number, dy: number, dt: number): boolean {
  if (actor.aiWindedUntil > world.time) return false; // the legs gave out
  const ks = actor.aiKiteSpec;
  if (ks && dt > 0) {
    actor.aiKiteAcc += dt;
    actor.aiLastRetreatAt = world.time;
    if (actor.aiKiteAcc >= ks.kite) {
      actor.aiKiteAcc = 0;
      const w = ks.windedFor ?? [1.0, 1.6];
      actor.aiWindedUntil = world.time + rand(w[0], w[1]);
      world.text(vec(actor.pos.x, actor.pos.y - 16), 'winded!', '#e8d44a', 12);
      return false;
    }
  }
  steerMove(actor, world, dx, dy, dt);
  return true;
}

function moveAway(actor: Actor, world: World, from: { x: number; y: number }, dt: number): void {
  retreatMove(actor, world, actor.pos.x - from.x, actor.pos.y - from.y, dt);
}

/** The thrown-off-the-scent flight: run FROM a point while HOOKING the
 *  bearing at random beats — sometimes freezing dead for a blink — so
 *  pursuit is theater instead of a solved straight line. Shares the retreat
 *  gate: juking prey TIRES, pants, and can be caught (which is what makes a
 *  faster-than-you creature fair). Used by the 'juke' kernel in combat and
 *  by the morale rout when the mover's style is 'juke'. */
function jukeAway(
  actor: Actor, world: World, from: { x: number; y: number }, dt: number, spec: MoveSpec,
): void {
  const t = world.time;
  if (actor.aiWindedUntil > t) return;       // panting — the catch window
  if (t < actor.aiJukeFreezeUntil) return;   // frozen mid-flight
  if (t >= actor.aiJukeAt) {
    const he = spec.hookEvery ?? [0.35, 0.8];
    actor.aiJukeAt = t + rand(he[0], he[1]);
    if (Math.random() < (spec.freezeChance ?? 0.18)) {
      const fz = spec.freeze ?? [0.2, 0.5];
      actor.aiJukeFreezeUntil = t + rand(fz[0], fz[1]);
      return;
    }
    const arc = spec.hookArc ?? 1.2;
    actor.aiJukeAng = rand(-arc, arc);
  }
  const ang = angleTo(from, actor.pos) + actor.aiJukeAng;
  if (retreatMove(actor, world, Math.cos(ang), Math.sin(ang), dt)) {
    actor.facing = ang; // it looks where it runs, not over its shoulder
  }
}

/**
 * The standoff distance the actor's KIT asks for: kiters honor their
 * largest keepDistance; everyone else closes to their SHORTEST-range
 * skill — a warden whose Shield Up rests still walks in to Cleave.
 */
function standoff(actor: Actor): { keep: number; desired: number } {
  let keep = 0;
  let minRange = Infinity;
  for (const s of actor.skills) {
    if (!s?.def.ai) continue;
    keep = Math.max(keep, s.def.ai.keepDistance ?? 0);
    minRange = Math.min(minRange, s.def.ai.range);
  }
  if (minRange === Infinity) minRange = 40;
  return { keep, desired: keep > 0 ? keep : Math.max(20, minRange * 0.8) };
}

function setShroud(actor: Actor, on: boolean): void {
  actor.aiShrouded = on;
  actor.sheet.setSource('shroud', on ? [mod('invisible', 'flat', 1)] : []);
}

/** FLEE: bolt for the exit chosen when the flee phase opened (the world set the
 *  goal + the speed/damage-reduction mods). On arrival the world removes the
 *  actor from the zone (and, for the Hunt beast, migrates it to the next zone
 *  with its health preserved). */
function fleeStep(actor: Actor, world: World, dt: number): void {
  const goal = actor.aiFleeGoal;
  if (!goal) return; // the world assigns it when the flee phase opens
  actor.facing = angleTo(actor.pos, goal);
  moveToward(actor, world, goal, dt);
  if (dist(actor.pos, goal) < 70) world.onFleeArrive(actor);
}

/** REFUGE (MonsterDef.refuge): the routed creature runs FOR its bolt-hole —
 *  the nearest matching doodad, found ONCE and cached (ponds don't move) —
 *  and SLIPS AWAY on reaching its rim. Returns false when none is in seek
 *  range, letting the ordinary rout run. */
function refugeStep(actor: Actor, world: World, dt: number): boolean {
  const r = actor.refuge;
  if (!r) return false;
  if (actor.refugeGoal === undefined) {
    let best: { x: number; y: number; r: number } | null = null;
    let bd = r.seek ?? 900;
    for (const d of world.doodads) {
      if (d.kind !== r.kind || d.gone) continue;
      const dd = dist(actor.pos, d.pos);
      if (dd < bd) { bd = dd; best = { x: d.pos.x, y: d.pos.y, r: d.radius }; }
    }
    actor.refugeGoal = best; // null = searched, nothing near — rout normally
  }
  const goal = actor.refugeGoal;
  if (!goal) return false;
  if (dist(actor.pos, vec(goal.x, goal.y)) <= Math.max(16, goal.r * 0.6)) {
    world.slipAway(actor, `${actor.name} ${r.text ?? 'slips away!'}`);
    return true;
  }
  actor.facing = angleTo(actor.pos, vec(goal.x, goal.y));
  moveToward(actor, world, vec(goal.x, goal.y), dt);
  return true;
}

/** The blocked-lane strafe: circle the blocker, biased toward the target so
 *  the arc eventually rounds the corner; flip direction if it isn't working.
 *  Returns true while the lane is blocked (the tick is consumed). */
function losStrafe(ctx: KernelCtx): boolean {
  const { a, world, target, dt } = ctx;
  // IMPLICIT LOS-seek in GRID zones for kits with ANY projectile: once masonry
  // can stop shots (rampart walls), a basic-brained shooter must reposition
  // instead of dumping arrows into a wall forever. Mixed kits strafe too — a
  // blocked archer-with-a-dagger rounding the corner beats one idling at the
  // wall (LOS regained exits the strafe instantly, so the melee answer still
  // fires the moment the lane opens). Pure-melee kits keep their old conduct;
  // data losSeek behaves exactly as before; convex zones (no grid) untouched.
  const implicit = !ctx.spec.losSeek && !!world.walk
    && a.skills.some(s => s?.def.delivery.type === 'projectile');
  if (!ctx.spec.losSeek && !implicit) return false;
  if (world.lineOfSight(a.pos, target.pos)) {
    a.aiLosTimer = rand(1.4, 2.2); // LOS regained: reset the patience clock
    return false;
  }
  // The strafe patience clock lives on ITS OWN field — a.aiTimer is owned by
  // the kernels' phase machines (slideCast's slide/withdraw), and stomping it
  // on every LOS-clear tick froze strafers solid after their first cast.
  if (a.aiSign === 0) a.aiSign = Math.random() < 0.5 ? 1 : -1;
  a.aiLosTimer -= dt;
  if (a.aiLosTimer <= 0) {
    a.aiSign = -a.aiSign;
    a.aiLosTimer = rand(1.4, 2.2);
  }
  const ang = angleTo(a.pos, target.pos) + a.aiSign * 1.15;
  moveToward(a, world, vec(
    a.pos.x + Math.cos(ang) * 80 + (target.pos.x - a.pos.x) * 0.15,
    a.pos.y + Math.sin(ang) * 80 + (target.pos.y - a.pos.y) * 0.15), dt);
  return true;
}

/** The SURROUND slot: squadmates fan their approach bearings around the prey
 *  instead of forming a conga line. Stable world-absolute slots by member
 *  order, so the ring doesn't churn. */
function surroundGoal(actor: Actor, world: World, target: Actor, ring: number): Vec2 {
  const mates: number[] = [];
  for (const a of world.actors) {
    if (!a.dead && a.squadId === actor.squadId) mates.push(a.id);
  }
  mates.sort((x, y) => x - y);
  const i = Math.max(0, mates.indexOf(actor.id));
  const n = Math.max(1, mates.length);
  const ang = (i / n) * Math.PI * 2;
  return vec(target.pos.x + Math.cos(ang) * ring, target.pos.y + Math.sin(ang) * ring);
}

/** Stable per-actor pseudo-random in [0,1) — demeanor rolls that never
 *  reshuffle frame to frame. */
function stableRoll(id: number, salt: number): number {
  const h = Math.sin(id * 127.1 + salt * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

/** SQUAD IDLE DEMEANOR (SquadSpec.idle): the group's out-of-combat carriage.
 *  Returns true when it consumed this member's idle tick (moved it into
 *  place, or deliberately stilled it); false lets the generic wander run. */
function squadIdle(actor: Actor, world: World, tuning: BrainTuning, dt: number): boolean {
  const sq = tuning.squad;
  if (!sq || actor.squadId === undefined) return false;
  // Legacy sugar: a formation with no idle spec drills (the old behavior).
  const style = sq.idle?.style ?? (sq.formation ? 'drill' : undefined);
  if (!style || style === 'wander') return false;
  const spacing = sq.spacing ?? 46;
  if (actor.squadLeader) {
    // The IDOL stands its ground (circle) and the siege ANCHOR holds the
    // yard; drill/loose leaders wander normally and the band dresses on them.
    return style === 'circle' || style === 'siege';
  }
  const lead = world.actors.find(x =>
    !x.dead && x.squadId === actor.squadId && x.squadLeader);
  if (!lead) return false;
  switch (style) {
    case 'drill': {
      // The militant column: tight posts, full march to keep them.
      const post = formationPost(actor, world, lead, tuning, 'column') ?? lead.pos;
      if (dist(actor.pos, post) > 24) {
        actor.facing = angleTo(actor.pos, post);
        moveToward(actor, world, post, dt);
      } else {
        actor.facing = lead.facing; // dressed: face the line of march
      }
      return true;
    }
    case 'loose': {
      // The lackadaisical amble: a wide slack bubble, STRAGGLERS wider
      // still — members only bestir themselves when truly left behind,
      // and inside the bubble they mill about (the generic wander).
      const straggler = stableRoll(actor.id, 3.7) < (sq.idle?.stragglerChance ?? 0.35);
      const slack = spacing * (straggler ? 5 : 2.6);
      const d = dist(actor.pos, lead.pos);
      if (d > slack * 1.7) {
        actor.facing = angleTo(actor.pos, lead.pos);
        moveToward(actor, world, lead.pos, dt); // the catch-up jog
        return true;
      }
      if (d > slack) {
        actor.facing = angleTo(actor.pos, lead.pos);
        steerMove(actor, world,
          lead.pos.x - actor.pos.x, lead.pos.y - actor.pos.y, dt * 0.4); // the amble
        return true;
      }
      return false; // close enough: mill about
    }
    case 'circle': {
      // The vigil: a slow orbit around the standing idol.
      if (actor.aiSign === 0) actor.aiSign = Math.random() < 0.5 ? 1 : -1;
      const ring = sq.idle?.ring ?? spacing * 2.4;
      const d = dist(actor.pos, lead.pos);
      const toMe = angleTo(lead.pos, actor.pos);
      const tangent = toMe + actor.aiSign * (Math.PI / 2);
      const radial = d > ring * 1.2 ? -0.9 : d < ring * 0.8 ? 0.9 : 0;
      steerMove(actor, world,
        Math.cos(tangent) + Math.cos(toMe) * radial,
        Math.sin(tangent) + Math.sin(toMe) * radial, dt * 0.35);
      actor.facing = angleTo(actor.pos, lead.pos); // eyes on the idol
      return true;
    }
    case 'mixed':
      // A stable split: some stand vigil where they are, some drift.
      return stableRoll(actor.id, 9.13) < 0.5;
    case 'siege': {
      // THE GARRISON POSTURE: towers crewed before a shot is fired. The
      // ranged rank claims free structure slots (the claim + its anchor/mods
      // persist into combat — the fight starts with the walls already
      // manned); everyone else takes a picket ring around the anchor, eyes
      // OUT. Garrison state is sticky by design: a siege doesn't march.
      if (actor.garrison) {
        if (actor.garrison.pending) {
          // March the pending claim to its perch (the combat kernel's walk,
          // mirrored here so the crewing happens while the yard is quiet).
          const slot = world.garrisonSlotById(actor.garrison.slotId);
          if (!slot) { actor.garrison = undefined; return true; }
          if (dist(actor.pos, slot.pos) > 22) {
            actor.facing = angleTo(actor.pos, slot.pos);
            moveToward(actor, world, slot.pos, dt);
            return true;
          }
          world.finalizeGarrison(actor);
        }
        actor.facing = angleTo(lead.pos, actor.pos); // watch the approaches
        return true;
      }
      const ranged = actor.skills.some(s => s && ((s.def.ai?.keepDistance ?? 0) >= 120
        || s.def.delivery.type === 'projectile' || s.def.delivery.type === 'storm'));
      if (ranged && world.claimGarrisonSlot(actor, sq.idle?.garrisonWithin ?? 620)) return true;
      // The picket: a stable ring post around the anchor, facing outward.
      if (actor.aiSign === 0) actor.aiSign = Math.random() < 0.5 ? 1 : -1;
      const ring = sq.idle?.ring ?? spacing * 2.4;
      const slot = stableRoll(actor.id, 6.29) * Math.PI * 2;
      const post = vec(lead.pos.x + Math.cos(slot) * ring, lead.pos.y + Math.sin(slot) * ring);
      if (dist(actor.pos, post) > 26) {
        actor.facing = angleTo(actor.pos, post);
        moveToward(actor, world, post, dt);
      } else {
        actor.facing = angleTo(lead.pos, actor.pos); // eyes out of the ring
      }
      return true;
    }
  }
  return false;
}

/** A follower's drilled post relative to its leader (null = no formation).
 *  `fallback` names the shape when the squad drills but declares none. */
function formationPost(
  actor: Actor, world: World, lead: Actor, tuning: BrainTuning,
  fallback?: 'ring' | 'line' | 'wedge' | 'column' | 'loose',
): Vec2 | null {
  const f = tuning.squad?.formation ?? fallback;
  if (!f) return null;
  const spacing = tuning.squad?.spacing ?? 46;
  const mates: number[] = [];
  for (const a of world.actors) {
    if (!a.dead && a.squadId === actor.squadId && !a.squadLeader) mates.push(a.id);
  }
  mates.sort((x, y) => x - y);
  const i = Math.max(0, mates.indexOf(actor.id));
  const n = Math.max(1, mates.length);
  const fx = Math.cos(lead.facing), fy = Math.sin(lead.facing);
  const px = -fy, py = fx; // perpendicular
  switch (f) {
    case 'ring': {
      const ang = (i / n) * Math.PI * 2;
      const r = Math.max(spacing * 1.4, spacing * n * 0.35);
      return vec(lead.pos.x + Math.cos(ang) * r, lead.pos.y + Math.sin(ang) * r);
    }
    case 'line': {
      const off = (i - (n - 1) / 2) * spacing;
      return vec(lead.pos.x + px * off - fx * spacing, lead.pos.y + py * off - fy * spacing);
    }
    case 'wedge': {
      const row = Math.floor(i / 2) + 1;
      const side = i % 2 === 0 ? 1 : -1;
      return vec(
        lead.pos.x - fx * row * spacing + px * side * row * spacing * 0.8,
        lead.pos.y - fy * row * spacing + py * side * row * spacing * 0.8);
    }
    case 'column':
      return vec(lead.pos.x - fx * (i + 1) * spacing, lead.pos.y - fy * (i + 1) * spacing);
    case 'loose': {
      // Stable per-member jitter around the leader — a rabble, not a drill.
      const h = Math.sin(actor.id * 127.1) * 43758.5453;
      const j = h - Math.floor(h);
      const ang = j * Math.PI * 2;
      const r = spacing * (1 + j * 1.6);
      return vec(lead.pos.x + Math.cos(ang) * r, lead.pos.y + Math.sin(ang) * r);
    }
  }
}

// === MOVEMENT KERNELS ===========================================================
// Each kernel owns its cast/move interleave, exactly like the v1 brains did —
// a REGISTRY, so packages can add locomotion styles without touching this file.

export interface KernelCtx {
  a: Actor;
  world: World;
  target: Actor;
  /** Distance to the target this tick. */
  d: number;
  dt: number;
  spec: MoveSpec;
  tuning: BrainTuning;
  norm: NormalizedBrain;
  /** True when a squad gate forbids casting this tick (mustering prowl). */
  noCast: boolean;
  /** True while the TEMPO duty cycle holds the feet still (casting stays
   *  free) — runKernel zeroes the movement dt. */
  paused: boolean;
  /** The point to close on — the target, or the surround slot when drilled. */
  goal: Vec2;
  pick(): SkillInstance | null;
  cast(inst: SkillInstance): void;
}

export type MoveKernel = (ctx: KernelCtx) => void;

function makeCtx(
  actor: Actor, world: World, target: Actor, d: number, dt: number,
  tuning: BrainTuning, norm: NormalizedBrain, noCast: boolean, paused = false,
  engaged = false,
): KernelCtx {
  const spec = tuning.move ?? { style: 'approach' };
  const beh = tuning.behavior;
  let goal: Vec2;
  if (engaged && beh?.encircle && !target.passive) {
    // THE ENGAGEMENT RING (BehaviorSpec.encircle): claim a bite bearing —
    // the first `front` take their approach, later arrivals wrap the widest
    // arc. A claimant whose bearing is still far from its slot routes
    // AROUND the ring (a closing spiral), never through the victim.
    const ring = beh.encircle.ring
      ?? (target.radius + actor.radius + BEHAVIOR_CFG.ringPad);
    const slotAng = world.claimRingSlot(actor, target, beh.encircle.front ?? 2);
    const myAng = angleTo(target.pos, actor.pos);
    const err = angleDiff(myAng, slotAng);
    // Detour ONLY inside the close ring, where cutting the chord would shove
    // the victim's body: from farther out, head STRAIGHT for the slot point
    // — a spiral waypoint around a MOVING target re-rotates as fast as the
    // chaser walks it, and the pursuit stalls into a tail-chase orbit.
    if (Math.abs(err) > BEHAVIOR_CFG.detourArc && d < ring * BEHAVIOR_CFG.detourWithinMul) {
      const step = myAng + Math.sign(err) * BEHAVIOR_CFG.detourStep;
      const rr = Math.max(ring * BEHAVIOR_CFG.detourRadiusMul, d * 0.8);
      goal = vec(target.pos.x + Math.cos(step) * rr, target.pos.y + Math.sin(step) * rr);
    } else {
      goal = vec(target.pos.x + Math.cos(slotAng) * ring, target.pos.y + Math.sin(slotAng) * ring);
    }
  } else if (tuning.squad?.surround && actor.squadId !== undefined) {
    goal = surroundGoal(actor, world, target,
      Math.max(40, target.radius + actor.radius + 4));
  } else {
    // SEGMENT FABRIC: close on the creature's NEAREST hittable body — a
    // melee hound bites the coil beside it instead of marching the whole
    // length of a colossus to its head. Plain targets: the head, as ever.
    goal = segsHittable(target) ? nearestBody(target, actor.pos).pos : target.pos;
  }
  return {
    a: actor, world, target, d, dt, spec, tuning, norm, noCast, paused, goal,
    pick: () => {
      if (noCast) return null;
      // REACTION: the first cast of a fresh engagement waits out the wits.
      if (world.time < actor.aiReactAt) return null;
      // BODY-AIMED (castArc): hold fire until the BODY bears. The pipeline
      // writes `facing` as this tick's DESIRE (the world clamp runs after
      // the AI tick) — `facingPrev` is the last clamped truth, the body.
      if (beh?.castArc !== undefined && Math.abs(angleDiff(
        actor.facingPrev ?? actor.facing,
        angleTo(actor.pos, target.pos))) > beh.castArc) return null;
      return pickSkill(actor, world, d, tuning, target);
    },
    cast: inst => {
      // THE FEINT (kernel casts only — reserves/menders never bluff): the
      // bar begins for real, drops at the beat, and the next real decision
      // follows fast. Instants can't bluff — there's no bar to fake.
      const f = beh?.feint;
      if (f && actor.skillUseTime(inst) > BEHAVIOR_CFG.feintMinBar
        && Math.random() < f.chance) {
        if (world.useSkill(actor, inst, aimPointFor(actor, inst, target, beh))) {
          const hw = f.hold ?? BEHAVIOR_CFG.feintHold;
          actor.aiFeintAt = world.time + rand(hw[0], hw[1]);
          actor.aiCooldown = rand(0.08, 0.2); // the real blow follows fast
        }
        return;
      }
      useOn(actor, world, inst, target, tuning);
      // POST-CAST RHYTHM (plantChance): sometimes the feet stay planted
      // into the next skill — the monotony spectrum, rolled per cast.
      if (beh?.plantChance && Math.random() < beh.plantChance) {
        actor.aiPlantUntil = world.time + (beh.plantFor
          ? rand(beh.plantFor[0], beh.plantFor[1])
          : actor.aiCooldown + BEHAVIOR_CFG.plantPad);
      }
    },
  };
}

function runKernel(style: string, ctx: KernelCtx): void {
  const pace = ctx.spec.pace;
  if (pace !== undefined && pace !== 1) {
    // Paced locomotion rides a scaled dt for MOVEMENT only (casting reads
    // the real clock elsewhere) — a stalking prowl at 0.6, a frenzy at 1.
    ctx = { ...ctx, dt: ctx.dt * Math.max(0, pace) };
  }
  // A tempo PAUSE stills the feet, not the hands: movement dt collapses to
  // zero, the pick/cast path keeps its real clock. A post-cast PLANT
  // (BehaviorSpec.plantChance) is the same stillness on a per-cast roll.
  if (ctx.paused || ctx.a.aiPlantUntil > ctx.world.time) ctx = { ...ctx, dt: 0 };
  (MOVE_KERNELS[style] ?? MOVE_KERNELS.approach)(ctx);
}

/** approach — the original generic conduct: close to the kit's standoff,
 *  attack what reaches, kite when the kit keeps distance. */
function approachKernel(ctx: KernelCtx): void {
  const { a, world, target, d, dt } = ctx;
  if (losStrafe(ctx)) return;
  const chosen = ctx.pick();
  if (chosen) return ctx.cast(chosen);
  const { keep, desired } = standoff(a);
  if (d > desired) {
    moveToward(a, world, ctx.goal, dt);
  } else if (keep > 0 && d < keep * 0.65) {
    moveAway(a, world, target.pos, dt);
  }
}

/** direct — relentless closing: casts on the move, never disengages. */
function directKernel(ctx: KernelCtx): void {
  const { a, world, d, dt } = ctx;
  const chosen = ctx.pick();
  if (chosen) {
    ctx.cast(chosen);
    // The juggernaut's discipline: strike, THEN step (v1 returned here);
    // pressers (swarm, closeFrac < 1) keep crowding through the swing.
    if ((ctx.spec.closeFrac ?? 1) >= 1) return;
  }
  const { desired } = standoff(a);
  if (d > desired * (ctx.spec.closeFrac ?? 1)) moveToward(a, world, ctx.goal, dt);
}

/** orbit — strafing melee: circle the prey at blade's length, cutting as
 *  you go. */
function orbitKernel(ctx: KernelCtx): void {
  const { a, world, target, d, dt, spec } = ctx;
  const chosen = ctx.pick();
  if (chosen) ctx.cast(chosen);
  if (a.aiSign === 0) a.aiSign = Math.random() < 0.5 ? 1 : -1;
  a.aiTimer -= dt;
  if (a.aiTimer <= 0) {
    const fe = spec.flipEvery ?? [1.2, 2.8];
    a.aiTimer = rand(fe[0], fe[1]);
    if (Math.random() < (spec.flipChance ?? 0.4)) a.aiSign = -a.aiSign;
  }
  const { desired } = standoff(a);
  const ring = spec.ring ?? Math.max(desired, 46);
  // spiral: orbit tangent + a radial correction toward the ring
  const toMe = angleTo(target.pos, a.pos);
  const tangent = toMe + a.aiSign * (Math.PI / 2);
  const radial = d > ring * 1.15 ? -1 : d < ring * 0.8 ? 1 : 0;
  steerMove(a, world,
    Math.cos(tangent) + Math.cos(toMe) * radial * 0.9,
    Math.sin(tangent) + Math.sin(toMe) * radial * 0.9, dt);
  a.facing = angleTo(a.pos, target.pos);
}

/** weave — the lunatic zigzag: wobbles in hard (bombers arm their fuse
 *  before this ever reaches blade range). */
function weaveKernel(ctx: KernelCtx): void {
  const { a, world, dt, spec } = ctx;
  const chosen = ctx.pick();
  if (chosen) ctx.cast(chosen);
  const wob = Math.sin(world.time * (spec.weaveFreq ?? 9) + a.id * 1.7) * (spec.weaveAmp ?? 0.9);
  const ang = angleTo(a.pos, ctx.goal) + wob;
  steerMove(a, world, Math.cos(ang), Math.sin(ang), dt);
}

/** hitAndRun — one strike, then break away before the answer comes. */
function hitAndRunKernel(ctx: KernelCtx): void {
  const { a, world, target, dt, spec } = ctx;
  if (a.aiPhase === 'withdraw') {
    a.aiTimer -= dt;
    moveAway(a, world, target.pos, dt);
    if (a.aiTimer <= 0) a.aiPhase = '';
    return;
  }
  const chosen = ctx.pick();
  if (chosen) {
    ctx.cast(chosen);
    a.aiPhase = 'withdraw';
    const w = spec.withdraw ?? [1.6, 1.6];
    a.aiTimer = rand(w[0], w[1]);
    return;
  }
  moveToward(a, world, ctx.goal, dt);
}

/** slideCast — the strafer's fire-and-SLIDE cycle: casting roots the body,
 *  so a true strafer holds its spells back to keep its feet moving. */
function slideCastKernel(ctx: KernelCtx): void {
  const { a, world, target, d, dt, spec } = ctx;
  if (losStrafe(ctx)) return;
  if (a.aiSign === 0) a.aiSign = Math.random() < 0.5 ? 1 : -1;
  // Sliding: spells stay holstered until the step finishes. The clock only
  // runs once the cast that triggered it lets go of the feet.
  if (a.aiPhase === 'slide') {
    if (a.useLock > 0 || a.casting) return;
    a.aiTimer -= dt;
    if (a.aiTimer <= 0) {
      a.aiPhase = '';
      if (Math.random() < 0.5) a.aiSign = -a.aiSign;
    }
    const { keep } = standoff(a);
    const ring = spec.ring ?? (keep > 0 ? keep : 240);
    const toMe = angleTo(target.pos, a.pos);
    const tangent = toMe + a.aiSign * (Math.PI / 2);
    const radial = d > ring * 1.2 ? -1 : d < ring * 0.7 ? 1 : 0;
    steerMove(a, world,
      Math.cos(tangent) + Math.cos(toMe) * radial,
      Math.sin(tangent) + Math.sin(toMe) * radial, dt);
    a.facing = angleTo(a.pos, target.pos);
    return;
  }
  const chosen = ctx.pick();
  const slide = spec.slide ?? [0.5, 1.0];
  if (chosen) {
    ctx.cast(chosen);
    a.aiPhase = 'slide';
    a.aiTimer = rand(slide[0], slide[1]);
    return;
  }
  // Nothing castable yet: slide anyway, toward the ring.
  a.aiPhase = 'slide';
  a.aiTimer = rand(slide[0] * 0.8, slide[1] * 0.8);
}

/** holdRange — artillery: extreme range, and it does NOT let you close the
 *  gap. Too close means HOLD FIRE and run — a rooted cast is a death
 *  sentence with the enemy at the muzzle. */
function holdRangeKernel(ctx: KernelCtx): void {
  const { a, world, target, d, dt, spec } = ctx;
  const { keep } = standoff(a);
  const hold = spec.hold ?? Math.max(keep, 380);
  const [panicF, approachF] = spec.band ?? [0.75, 1.4];
  // The panic band OUTRANKS the sight-line: cornered artillery flees first —
  // circling a blocker at the player's feet is the opposite of its contract.
  if (d < hold * panicF) {
    moveAway(a, world, target.pos, dt);
    a.facing = angleTo(a.pos, target.pos);
    return;
  }
  // Artillery behind castle masonry repositions too (implicit in grid zones).
  if (losStrafe(ctx)) return;
  const chosen = ctx.pick();
  if (chosen) return ctx.cast(chosen);
  if (d < hold) {
    moveAway(a, world, target.pos, dt);
    a.facing = angleTo(a.pos, target.pos);
  } else if (d > hold * approachF) {
    moveToward(a, world, ctx.goal, dt);
  }
}

/** backstab — the stealth assassin: shrouded stalk to the target's back,
 *  strike, melt away. */
function backstabKernel(ctx: KernelCtx): void {
  const { a, world, target, dt, spec } = ctx;
  if (a.aiPhase === 'withdraw') {
    a.aiTimer -= dt;
    moveAway(a, world, target.pos, dt);
    if (a.aiTimer <= 0) {
      a.aiPhase = '';
      if (spec.shroud) setShroud(a, true); // gone again
    }
    return;
  }
  // Stalking: shrouded, circling toward the victim's back.
  if (spec.shroud) setShroud(a, true);
  const chosen = ctx.pick();
  if (chosen) {
    if (spec.shroud) setShroud(a, false); // the strike reveals them
    ctx.cast(chosen);
    a.aiPhase = 'withdraw';
    const w = spec.withdraw ?? [1.5, 1.5];
    a.aiTimer = rand(w[0], w[1]);
    return;
  }
  const behind = vec(
    target.pos.x + Math.cos(target.facing + Math.PI) * (target.radius + a.radius + 6),
    target.pos.y + Math.sin(target.facing + Math.PI) * (target.radius + a.radius + 6));
  moveToward(a, world, behind, dt);
}

/** interpose — the bodyguard: put yourself between the threat and your ward. */
function interposeKernel(ctx: KernelCtx): void {
  const { a, world, target, dt } = ctx;
  const chosen = ctx.pick();
  if (chosen) return ctx.cast(chosen);
  // The ward: nearest same-faction ally, weighted by how worth guarding it is —
  // MonsterDef.wardPriority when declared, else commanders rank above casters
  // above the line troops. Data decides who gets a bodyguard.
  let ward: Actor | null = null;
  let bd = 600;
  for (const x of world.actors) {
    if (x === a || x.dead || x.team !== a.team || x.construct || x.passive) continue;
    if (a.faction && x.faction !== a.faction) continue;
    const d = dist(a.pos, x.pos);
    const worth = (x.defId ? MONSTERS[x.defId]?.wardPriority : undefined)
      ?? (x.brain?.type === 'commander' ? 2 : x.brain?.type === 'caster' ? 1 : 0);
    const priority = worth > 0 ? d * (1 - Math.min(0.5, worth * 0.25)) : d;
    if (priority < bd) { bd = priority; ward = x; }
  }
  if (ward) {
    // stand on the line between the threat and the ward
    const ang = angleTo(ward.pos, target.pos);
    const post = vec(
      ward.pos.x + Math.cos(ang) * Math.min(120, dist(ward.pos, target.pos) * 0.4),
      ward.pos.y + Math.sin(ang) * Math.min(120, dist(ward.pos, target.pos) * 0.4));
    if (dist(a.pos, post) > 26) moveToward(a, world, post, dt);
    a.facing = angleTo(a.pos, target.pos);
  } else {
    approachKernel(ctx);
  }
}

/** hoverAllies — the commander: hangs behind the warband, blessing and
 *  reinforcing it (support skills fire from way back — see SkillPolicy
 *  .supportRange, which the commander preset carries). */
function hoverAlliesKernel(ctx: KernelCtx): void {
  const { a, world, target, d, dt } = ctx;
  const chosen = ctx.pick();
  if (chosen) return ctx.cast(chosen);
  // Positioning: stay out of the brawl, but keep the warband in reach.
  if (d < 340) {
    moveAway(a, world, target.pos, dt);
  } else if (d > 520) {
    moveToward(a, world, ctx.goal, dt);
  } else {
    const allies = world.actors.filter(x =>
      x !== a && !x.dead && x.team === a.team && !x.construct
      && dist(a.pos, x.pos) < 700);
    if (allies.length) {
      let cx = 0, cy = 0;
      for (const x of allies) { cx += x.pos.x; cy += x.pos.y; }
      const centroid = vec(cx / allies.length, cy / allies.length);
      if (dist(a.pos, centroid) > 240) moveToward(a, world, centroid, dt);
    }
  }
}

/** prowl — the waiting circle: wide, patient, no teeth spent (pack hunters
 *  mustering; token-less wolves ride orbit instead so they can still cast). */
function prowlKernel(ctx: KernelCtx): void {
  const { a, world, target, d, dt, spec } = ctx;
  if (a.aiSign === 0) a.aiSign = Math.random() < 0.5 ? 1 : -1;
  const ring = spec.ring ?? 270;
  const width = 50;
  const toMe = angleTo(target.pos, a.pos);
  const tangent = toMe + a.aiSign * (Math.PI / 2);
  const radial = d > ring + width ? -0.8 : d < ring - width ? 0.8 : 0;
  steerMove(a, world,
    Math.cos(tangent) + Math.cos(toMe) * radial,
    Math.sin(tangent) + Math.sin(toMe) * radial, dt);
  a.facing = angleTo(a.pos, target.pos);
}

/** hold — stand ground: face and fight, feet planted. */
function holdKernel(ctx: KernelCtx): void {
  const chosen = ctx.pick();
  if (chosen) ctx.cast(chosen);
  ctx.a.facing = angleTo(ctx.a.pos, ctx.target.pos);
}

/** retreat — run straight away (morale breaks, cowards, juveniles). */
function retreatKernel(ctx: KernelCtx): void {
  const { a, world, target, dt } = ctx;
  a.facing = angleTo(a.pos, target.pos);
  moveAway(a, world, target.pos, dt);
}

/** skitter — darting bursts with dead-stop pauses: the sand-leaper scuttle.
 *  Each dart re-rolls a jitter bearing, so the approach crackles sideways. */
function skitterKernel(ctx: KernelCtx): void {
  const { a, world, dt, spec } = ctx;
  const chosen = ctx.pick();
  if (chosen) ctx.cast(chosen);
  const dart = spec.dart ?? [0.28, 0.5];
  const pause = spec.pause ?? [0.15, 0.45];
  if (a.aiPhase !== 'dart' && a.aiPhase !== 'skitter_rest') {
    a.aiPhase = 'dart';
    a.aiTimer = rand(dart[0], dart[1]);
    a.aiSign = rand(-0.8, 0.8); // this dart's sideways lean
  }
  a.aiTimer -= dt;
  if (a.aiPhase === 'skitter_rest') {
    if (a.aiTimer <= 0) {
      a.aiPhase = 'dart';
      a.aiTimer = rand(dart[0], dart[1]);
      a.aiSign = rand(-0.8, 0.8);
    }
    a.facing = angleTo(a.pos, ctx.goal);
    return; // dead stop between darts
  }
  if (a.aiTimer <= 0) {
    a.aiPhase = 'skitter_rest';
    a.aiTimer = rand(pause[0], pause[1]);
    return;
  }
  const ang = angleTo(a.pos, ctx.goal) + a.aiSign;
  steerMove(a, world, Math.cos(ang), Math.sin(ang), dt * 1.55);
  a.facing = angleTo(a.pos, ctx.goal);
}

/** charge — stalk into range, then a LOCKED headlong sprint (a dash the
 *  world resolves with collision), a breather, and again. Goring beasts. */
function chargeKernel(ctx: KernelCtx): void {
  const { a, world, target, d, dt, spec } = ctx;
  if (a.dash) return; // mid-charge: the world carries us
  if (a.aiPhase === 'charge_recover') {
    a.aiTimer -= dt;
    if (a.aiTimer <= 0) a.aiPhase = '';
    // winded: shoulder slowly toward the prey, swinging what reaches
    const chosen = ctx.pick();
    if (chosen) return ctx.cast(chosen);
    if (d > standoff(a).desired) moveToward(a, world, ctx.goal, dt * 0.45);
    return;
  }
  const chosen = ctx.pick();
  if (chosen) return ctx.cast(chosen);
  const commit = spec.commitRange ?? 320;
  const { desired } = standoff(a);
  // A tempo-paused beast doesn't LAUNCH (dt 0 = its feet are planted).
  if (dt > 0 && d <= commit && d > desired * 1.2) {
    // LOCK AND GO: overshoot a touch past the prey's position.
    const speed = a.sheet.get('moveSpeed') * (spec.chargeSpeed ?? 2.4);
    a.dash = {
      dir: angleTo(a.pos, target.pos),
      speed,
      remaining: Math.min(1.2, (d + 70) / Math.max(1, speed)),
    };
    const cd = spec.chargeCooldown ?? [2.5, 4.5];
    a.aiPhase = 'charge_recover';
    a.aiTimer = rand(cd[0], cd[1]);
    return;
  }
  if (d > desired) moveToward(a, world, ctx.goal, dt);
}

/** juke — combat-flight: hooks and freezes away from the target (prey whose
 *  whole fight IS the flight; the retreat gate makes it tire and be caught). */
function jukeKernel(ctx: KernelCtx): void {
  const chosen = ctx.pick();
  if (chosen) ctx.cast(chosen); // a cornered thing still bites
  jukeAway(ctx.a, ctx.world, ctx.target.pos, ctx.dt, ctx.spec);
}

/** lurk — patience with teeth: hold the ring and WATCH; commit the moment
 *  the target's eyes leave you (or it strays into your lap). The pounce
 *  holds until you face it down at distance. */
function lurkKernel(ctx: KernelCtx): void {
  const { a, world, target, d, dt, spec } = ctx;
  const chosen = ctx.pick();
  if (chosen) ctx.cast(chosen);
  const unseenArc = spec.unseenArc ?? 1.75;
  const unseen = Math.abs(angleDiff(target.facing, angleTo(target.pos, a.pos))) > unseenArc;
  const commit = spec.commitRange ?? 260;
  if (a.aiPhase === 'lurk_rush') {
    if (!unseen && d > commit) {
      a.aiPhase = ''; // stared down at range: break off, resume the watch
    } else {
      moveToward(a, world, ctx.goal, dt);
      a.facing = angleTo(a.pos, target.pos);
      return;
    }
  }
  if (unseen || d <= commit * 0.5) {
    a.aiPhase = 'lurk_rush';
    moveToward(a, world, ctx.goal, dt);
    a.facing = angleTo(a.pos, target.pos);
    return;
  }
  // Watched: sidle the ring at a creep, all eyes and patience.
  if (a.aiSign === 0) a.aiSign = Math.random() < 0.5 ? 1 : -1;
  const ring = spec.ring ?? Math.max(commit, 240);
  const toMe = angleTo(target.pos, a.pos);
  const tangent = toMe + a.aiSign * (Math.PI / 2);
  const radial = d > ring * 1.2 ? -0.8 : d < ring * 0.85 ? 0.8 : 0;
  steerMove(a, world,
    Math.cos(tangent) + Math.cos(toMe) * radial,
    Math.sin(tangent) + Math.sin(toMe) * radial, dt * 0.4);
  a.facing = angleTo(a.pos, target.pos);
}

/** garrison — hold a claimed structure slot (a tower core): face the prey and
 *  cast what reaches from the perch (parapets pass shots + sight, so the fire
 *  rains out while feet stay unreachable). A PENDING walk-entry claim marches
 *  to the perch first and finalizes (anchor + mods) on arrival. Without a
 *  claimed slot (none free / released), behaves as approach — never idle. */
function garrisonKernel(ctx: KernelCtx): void {
  const { a, world, target, dt } = ctx;
  if (!a.garrison) return approachKernel(ctx);
  if (a.garrison.pending) {
    const slot = world.garrisonSlotById(a.garrison.slotId);
    if (!slot) { a.garrison = undefined; return approachKernel(ctx); }
    if (dist(a.pos, slot.pos) > 22) { moveToward(a, world, slot.pos, dt); return; }
    world.finalizeGarrison(a);
  }
  a.facing = angleTo(a.pos, target.pos);
  const chosen = ctx.pick();
  if (chosen) ctx.cast(chosen);
}

/** turtle — PRESENT THE SHELL: hold ground and face AWAY from the threat so
 *  a rear shellGuard eats the exchange. Slow-turning bodies telegraph the
 *  pivot (the turn clamp), so circling a turtled shell is real play. Casts
 *  still fire — a mortar needs no eyes — but most turtled kits just endure
 *  their rules window. */
function turtleKernel(ctx: KernelCtx): void {
  const { a, target } = ctx;
  a.facing = angleTo(target.pos, a.pos); // away from the threat
  const chosen = ctx.pick();
  if (chosen) ctx.cast(chosen);
}

export const MOVE_KERNELS: Record<string, MoveKernel> = {
  approach: approachKernel,
  direct: directKernel,
  orbit: orbitKernel,
  weave: weaveKernel,
  hitAndRun: hitAndRunKernel,
  slideCast: slideCastKernel,
  holdRange: holdRangeKernel,
  backstab: backstabKernel,
  interpose: interposeKernel,
  hoverAllies: hoverAlliesKernel,
  prowl: prowlKernel,
  hold: holdKernel,
  retreat: retreatKernel,
  skitter: skitterKernel,
  charge: chargeKernel,
  turtle: turtleKernel,
  garrison: garrisonKernel,
  juke: jukeKernel,
  lurk: lurkKernel,
};

/** Packages register new locomotion styles here — a MoveSpec.style naming it
 *  brings it to any monster, no engine changes. */
export function registerMoveStyle(id: string, kernel: MoveKernel): void {
  MOVE_KERNELS[id] = kernel;
}

// Re-export the vocabulary's preset table for tooling/dev inspection.
export { ARCHETYPES };
