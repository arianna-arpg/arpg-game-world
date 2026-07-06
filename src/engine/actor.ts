// ---------------------------------------------------------------------------
// Actor — the ONE entity model shared by the player, monsters, and minions.
// All of them carry a StatSheet, a skill bar, cooldowns, buffs and statuses,
// and act through the same skill pipeline. The only differences are who
// controls them (input vs AI) and which team they fight for.
// ---------------------------------------------------------------------------

import { chance, vec, type Vec2 } from '../core/math';
import {
  StatSheet, attributeModifiers,
  type Attributes, type ConditionId, type DamageType, type Modifier, type SkillTag,
} from './stats';
import { DEFENSE_CFG } from './defense';
import {
  instanceMods, skillContextTags, instanceGates, instanceChargeCost, instanceChargeGain,
  type SkillInstance, type BuffEffect, type CastMode, type ConstructKind, type AuraSpec,
  type EchoRiderSpec, type LedgerSpec,
} from './skills';
import { CHARGE_DEFS } from './charges';
import type { MonsterRarity } from './rarity';
import type { DeathBurstDef } from '../data/monsters';

/** A cast in progress (also drives the cast bar above the actor's head). */
export interface CastingState {
  inst: SkillInstance;
  mode: CastMode;
  aim: Vec2;               // updated each frame when the mode tracks aim
  elapsed: number;
  total: number;           // bar length (cast modes) / pulse interval (channel)
  held: boolean;           // channel / charge: button still down
  /** Damage multiplier banked at press (consumed charges etc.). */
  baseMult: number;
  targetInfo?: unknown;    // ResolvedTarget, revalidated at execution
  // channel state
  channelTime?: number;
  pulseTimer?: number;
  /** trackAim:false / anchored channels: the aim STAMPED at press — pulses
   *  fire at this point, not the live cursor (a black hole doesn't move). */
  lockedAim?: Vec2;
  /** Landed hits banked during THIS unbroken channel (channelHitSpool). */
  hitSpool?: number;
  // overcharge state: banked stages + seconds since the last bar completed
  // (the spark-release window clock)
  stage?: number;
  sinceStage?: number;
  /** Effective spark window (sparkWindow stat, stamped at press) — the
   *  release check and the renderer's golden border both read it. */
  sparkWindow?: number;
  // channel-support timers (eruption / tempest while channeling or guarding)
  burstTimer?: number;
  stormTimer?: number;
  // guard state: the shield's remaining and starting health
  shield?: number;
  maxShield?: number;
  // charge state — uses elapsed/total as the charge fraction
  // perfect / timed / multitude state
  empowered?: number;
  indicatorAt?: number;
  pressUsed?: boolean;
  presses?: number;
  /** AI: how long a monster holds a channel/charge before letting go. */
  aiHold?: number;
  /** AI FINESSE (perfect/timed bars): the bar fraction where the monster
   *  "clicks" (castPress), pre-rolled once per cast from its brain's
   *  skillUse.finesse — inside the window on a made roll, a fumble outside
   *  on a miss. -1 = this monster never presses. */
  aiClickAt?: number;
  /** Spirit-Totem placement bar: resolution PLANTS the totem instead of
   *  casting the skill (the doubled inherited cast — totemPlaceTime). */
  plantTotem?: boolean;
  /** What the press ACTUALLY PAID — the resource-as-damage honesty datum.
   *  Absent = unpaid execution (echo riders, totems, constructs): no bonus. */
  paidCost?: { mana: number; life: number };
  /** Combo charges the press CONSUMED (chargeCost) — perCharge effects
   *  (flask pours, Soul Glut's fragments) scale with it at resolution. */
  chargesSpent?: number;
  /** INVOCATION weave clock: held channels bank one rune per second. */
  runeTick?: number;
  /** RITUAL GROUND: this cast bar PLANTS a channeler construct at the aim
   *  instead of resolving the skill (the channel-to-cast conversion). */
  plantChannel?: boolean;
  /** THE AMALGAM: minions consumed so far by this held channel. */
  amalgamFed?: number;
}

/** One OVERDRIVE lane's ledger: the toggle instance that opened it, the
 *  outstanding debt (mirrored into reservedMana/reservedLife), and the
 *  idle countdown to the repayment window (refreshed by every overdraft). */
export interface OverdriveState {
  inst: SkillInstance;
  debt: number;
  idle: number;
}

/** Stance windows for the `stationary`/`moving` conditions: planted after
 *  standing this long, "on the move" within a step's breath. The renderer
 *  reads PLANT_TIME to fade the stance ring in as the feet set. */
export const STANCE_PLANT_TIME = 0.5;
export const STANCE_MOVE_WINDOW = 0.15;
/** Seconds a staggered wound takes to finish landing (staggerFrac /
 *  Mortis Seal) — the drain re-levels to clear on this schedule. */
export const STAGGER_WINDOW = 3;
import { STATUS_DEFS, type ActiveStatus } from './status';

/** Behavior of a deployed construct (totem / sentry / trap / mine / pylon). */
export interface ConstructState {
  kind: ConstructKind;
  /** The skill this construct casts (carries the deployer's gems & level). */
  castInst?: SkillInstance;
  range: number;
  /** Trap arming countdown; pylon cast-interval timer. */
  timer: number;
  /** Eruptors: seconds between spews (charge-scaled at spawn). */
  castInterval?: number;
  /** HOLD-ONCE channeler (Ritual Ground): the vessel holds ONE complete
   *  channel and is spent when it ends — never a re-cast, never a
   *  cooldown-laundering loop (the Amalgam re-consume exploit). */
  holdOnce?: boolean;
  /** holdOnce bookkeeping: the single cast has been started. */
  started?: boolean;
  /** FOLLOWER construct (Holy Relic): glides at the owner's shoulder. */
  follows?: boolean;
  /** THE BELL: casts its skill at itself when struck; next ring's clock. */
  castOnStruck?: boolean;
  bellReadyAt?: number;
  /** Dome: projectile-interception radius and what happens on contact. */
  domeRadius?: number;
  domeMode?: 'dissolve' | 'deflect' | 'slow';
  /** Dome 'slow': the stall factor worn by enemy projectiles inside. */
  domeSlow?: number;
  /** kind 'pod' (Broodpod / Nitrocask): the payload hatched when the
   *  incubation (= the construct's lifespan) matures — and, with onBreak
   *  'hatch', when the pod is broken early. */
  hatch?: { skillId: string; onBreak?: 'fizzle' | 'hatch' };
  // kind 'echo' — the ghost's act model and bookkeeping:
  /** Behavior flags (hover turret / strike ghost / mimic clone). */
  echo?: EchoRiderSpec;
  /** Rider-family key (caps, refresh, and eviction are per-spec). */
  echoKey?: string;
  /** The echo's damage factor × the owner's mirageDamage, stamped at
   *  spawn/refresh (mimic clones apply it per replayed use). */
  echoPower?: number;
  /** strike: swings left before fading. */
  echoCasts?: number;
  /** strike: the locked prey's actor id. */
  echoPrey?: number;
  /** hover: shoulder-slot index so twin archers fan instead of stack. */
  echoSlot?: number;
  /** mimic: world-time when this clone may replay the next use. */
  echoReadyAt?: number;
  // kind 'tree' (Tree of Life) — the banked-violence heal reservoir:
  /** The burst spec (stamped from the delivery at deploy). */
  healBurst?: { ratio: number; cap: number; radius: number };
  /** Damage banked so far (drives the visible swelling). */
  stored?: number;
  /** The sapling's radius at deploy (growth scales from it). */
  baseRadius?: number;
  // kind 'embed' — the lodged object (see EmbedSpec):
  /** Behaviors stamped at deploy (effective icd resolved from the stat). */
  embed?: import('./skills').EmbedSpec;
  /** World time the run-over trigger re-arms (icd embeds). */
  embedReadyAt?: number;
  /** Next sibling-beam / self-emission times (world clocks). */
  beamAt?: number;
  emitAt?: number;
  // CONSTRUCT FX (innate or support-grafted): the standing pulse's clock.
  fx?: import('./skills').ConstructFxSpec;
  fxAt?: number;
}

/** A running aura on its bearer. */
export interface ActiveAura {
  inst: SkillInstance;
  spec: AuraSpec;
  radius: number;          // resolved with area modifiers at activation
  /** Area shape (the aoeShape stat at activation) — sigils shape auras too. */
  shape: number;
  /** Ally modifiers resolved at activation (spec mods + support-injected
   *  extras like Capacitor's recharge bonus). Falls back to spec.allyMods. */
  allyMods?: Modifier[];
  /** Seconds left (duration mode); Infinity while toggled on. */
  remaining: number;
  reserved: number;        // mana locked while active
  /** The reservation sits on the LIFE pool (the blood-pact graft). */
  lifeLane?: boolean;
  pulseTimer: number;
  /** Actors currently carrying this aura's modifier source. */
  affected: Set<number>;
  /** World time the toggle came ON — Seals & Forms read the held span
   *  (upkeep ramps, deactivation payloads, the maxDuration fuse). */
  since?: number;
  /** Last seal-DR value synced into the sheet (skip no-op setSource). */
  sealVal?: number;
  /** THE LEDGER's running balance (AuraDelivery.ledger — Arrears' deferred
   *  wound, Reclamation's suppressed regen). Settles on the lapse. */
  ledger?: { balance: number };
}

export type Team = 'player' | 'enemy';

/** Role axis, ORTHOGONAL to `team` (friend/foe). Distinguishes the controllable
 *  hero seats from owned allies and ordinary monsters, so the party UI, death
 *  rules, and future mercenaries can reason about WHAT an actor is without
 *  conflating it with WHICH SIDE it fights for. `undefined` ⇒ treat as 'monster'.
 *  The authoritative MINION test stays `isMinion()`/`owner`; `kind` is for
 *  UI / attribution / roster lifecycle only. */
export type UnitKind = 'player' | 'minion' | 'mercenary' | 'monster';

/** Body silhouettes — the shape IS the enemy-type language. */
export type ActorShape =
  | 'circle' | 'diamond' | 'triangle' | 'square'
  | 'pentagon' | 'hexagon' | 'octagon' | 'star' | 'cross'
  | 'trapezoid' | 'rhombus' | 'oval' | 'kite' | 'rectangle'
  | 'ribcage';

/** Silhouette accents layered ON TOP of the body shape — goblin ears,
 *  orc horns, briar spikes, demon wings. Readable at a glance, like the shapes. */
export type ActorAdorn = 'ears' | 'horns' | 'spikes' | 'wings' | 'tentacles';

// The AI vocabulary (BrainDef, archetypes, phases, rules, scripts, actions)
// lives in brain.ts — re-exported here so the bestiary and the world keep
// their historical import path.
export type { BrainDef, BrainType, BrainPhase, BrainImpulse } from './brain';
import type { BrainDef, BrainType } from './brain';

/** A worm/snake body: trailing segments that follow the head. */
export interface WormBody {
  /** Number of trailing segments. */
  length: number;
  /** Distance kept between segments (default radius × 1.1). */
  spacing: number;
  /** Radius multiplier from one segment to the next (default 0.88). */
  taper: number;
  segments: Vec2[];
}

/** Airborne leap in flight (leap delivery); resolved by the world. */
export interface LeapState {
  from: Vec2;
  dest: Vec2;
  total: number;
  timer: number;
  radius: number;
  inst: SkillInstance;
  dmgMult: number;
  wasUntargetable: boolean;
}

export interface ActiveBuff {
  def: BuffEffect;
  remaining: number;
  stacks: number;
  /** INDEPENDENT stack clocks (BuffEffect.stackTimers 'independent'):
   *  one expiry per stack; stacks = expiries.length. `remaining` mirrors
   *  the LONGEST-lived stack for display. */
  expiries?: number[];
}

let nextActorId = 1;

export class Actor {
  id = nextActorId++;
  name: string;
  team: Team;
  pos: Vec2;
  facing = 0;
  radius = 14;
  color = '#cccccc';
  shape: ActorShape = 'circle';
  /** Silhouette accent (goblin ears, orc horns, briar spikes). */
  adorn?: ActorAdorn;

  sheet = new StatSheet();
  level = 1;

  /** The AI archetype driving this actor (from its monster definition). */
  brain?: BrainDef;
  /** Worm/snake bodies: trailing segments updated by the world. */
  worm?: WormBody;
  /** Bomber fuse: armed countdown to self-detonation (renderer flashes it). */
  fuse?: number;
  /** Airborne leap in flight. */
  leap?: LeapState;
  /** Swarm/bomber brains: once they've seen you, they never stop coming. */
  aggroed = false;
  /** Generic brain state-machine scratch (skirmish/assassin phases). */
  aiPhase = '';
  aiTimer = 0;
  /** Strafe direction casters use to reopen a firing lane. */
  aiSign = 0;
  /** AI-PACKAGE state. Deepest HP-phase entered (-1 = base, one-way). */
  aiPhaseIdx = -1;
  /** Active impulse override + its window (world.time). */
  aiImpulseType?: BrainType;
  aiImpulseUntil = 0;
  aiImpulseNext = 0;
  /** TRANSIENT retreat: true from when a flee phase opens until the actor reaches
   *  its exit (overrides the archetype with 'flee'). Cleared on escape/respawn so
   *  a migrated beast FIGHTS in the next zone rather than fleeing forever. */
  aiFleeing = false;
  /** Where a fleeing actor is running (an exit) — set when a flee phase opens. */
  aiFleeGoal?: Vec2;
  /** THREAT CHART: aggro booked per enemy actor id — damage this actor TAKES
   *  and heals landed on its prey (world.resolveHit / applyHeal feed it; the
   *  AI tick decays it). Only `prefer: 'highestThreat'` brains READ it. */
  threat = new Map<number, number>();
  /** The locked target's actor id (stickiness + engagement freshness). */
  aiTargetId?: number;
  /** Where the locked target was last seen (perception-memory investigation). */
  aiLastSeen?: Vec2;
  /** World time the current engagement began (-1 = never engaged). */
  aiEngagedAt = -1;
  /** ATTENTION SPAN (dim brains): the lock lapses at this world time — the
   *  actor forgets its target and shuffles off in a DAZE (detection collapses
   *  until aiDazeUntil) unless a landed hit re-stimulates it (aiDazeFrom
   *  marks the daze onset so a fresh wound can clear it). */
  aiAttendUntil = 0;
  aiDazeUntil = 0;
  aiDazeFrom = 0;
  /** SCRIPT FSM: current phase index (-1 = not entered), entry time, and the
   *  per-cadence next-fire clocks (shared by script and ladder phases). */
  aiScriptIdx = -1;
  aiPhaseAt = 0;
  aiCadenceAt?: number[];
  /** Rule-engine state, one slot per BrainRule (lazily sized in ai.ts). */
  aiRuleState?: { until: number; readyAt: number; fired: boolean }[];
  /** Skill-policy state: the rotation cursor + last cast (combo windows). */
  aiRotIdx = 0;
  aiLastSkill?: { id: string; at: number };
  /** MORALE: routing (broken) until this world time — retreats, never casts. */
  aiMoraleUntil = 0;
  /** One rout per wound-crossing: latched when breakAtLife trips, re-armed
   *  only once life recovers above the threshold — a coward that already
   *  ran and got cornered turns desperate instead of fleeing forever. */
  aiMoraleBroke = false;
  /** Squad identity, stamped at spawn by GROUP spawners (packs, camps,
   *  garrisons, bands). Leaders anchor focus-fire and on-death reactions. */
  squadId?: number;
  squadLeader?: boolean;
  /** Engage-token stamp: the token key held + when it was last re-asserted
   *  (world prunes stale holders, so tokens free themselves). */
  aiTokenKey?: string;
  aiTokenAt = 0;
  /** WARD (the add-gate): untargetable until no live actor carries this tag;
   *  the note is announced when the ward shatters. */
  aiWardTag?: string;
  aiWardNote?: string;
  /** Spawn anchor for arena-relative choreography (stamped on the first AI
   *  tick, so it reflects the PLACED position, not the factory's 0,0). */
  aiAnchor?: Vec2;
  /** Minted skill instances for scripted casts (aiActions), by skill id. */
  aiActionInsts?: Map<string, SkillInstance>;
  /** Whether the AI shroud source is currently applied (so a tuning swap
   *  away from a shrouded style reliably de-cloaks). */
  aiShrouded = false;
  /** TEMPO duty cycle: the current window's end + whether it's a pause. */
  aiTempoUntil = 0;
  aiTempoPaused = false;
  /** KITE BUDGET: seconds of retreat accrued, the winded window, and the
   *  tick's effective spec (stamped by updateAI so moveAway can read it). */
  aiKiteAcc = 0;
  aiWindedUntil = 0;
  aiLastRetreatAt = -1;
  aiKiteSpec?: { kite: number; windedFor?: [number, number] };
  /** CYCLE machine: current step + when it rolls over. */
  aiCycleIdx = 0;
  aiCycleAt = 0;
  /** JUKE flight: next hook time, the current bearing offset, and any
   *  dead-stop freeze in progress. */
  aiJukeAt = 0;
  aiJukeAng = 0;
  aiJukeFreezeUntil = 0;
  /** MOUNTS: the beast I ride (my position pins to it) / the rider on my
   *  back (one slot). World.updateMounts sweeps both links every frame. */
  mountId?: number;
  riderId?: number;
  /** CONCLAVE: a ritual cultist is combat-DORMANT (chanting, no targeting/movement)
   *  until a wounding hit rouses it past its threshold (set in World.resolveHit).
   *  Per-actor, so only the wounded retaliate while the rest keep the rite going. */
  aiAwakened = false;
  /** ELDRITCH INCURSION: this foe has been corrupted by the blight (tentacle adorn +
   *  a buff source). One-way latch so the corruption event never re-stacks. */
  corrupted = false;
  /** MEAT SHIELD: a minion in guard stance keeps a short leash on its owner —
   *  set at summon from the owner's minionGuard stat, read by the AI heel. */
  guardMode = false;
  /** The actor's LIVE aim point in world space — refreshed per frame for
   *  player seats (input aim), per cast for monsters. Guided projectiles
   *  (guidePower) steer toward it; constructs fall through to their owner's. */
  aimPos: Vec2 | null = null;
  /** ALERT state (stealth tactics): struck from the shadows, this actor
   *  watches ALL AROUND at heightened range until `alertUntil` (world time),
   *  stalking toward `alertFrom` — where the blow came from. */
  alertUntil = 0;
  alertFrom: Vec2 | null = null;
  /** Per-proc internal-cooldown clocks (world time each proc is next
   *  ready) — the hard frequency limit under stacked chance (ProcDef.icd). */
  procReadyAt = new Map<string, number>();
  /** oncePerCast bookkeeping: the world time each proc last ROLLED — one
   *  roll per tick, so a multi-target swing can't inflate the chance. */
  procFiredAt = new Map<string, number>();
  /** PPM clocks: world time of each ppm-proc's last roll ATTEMPT — the
   *  per-attempt chance scales with the gap, so fast and slow skills
   *  converge on the same procs-per-minute (ProcDef.ppm). */
  procAttemptAt = new Map<string, number>();
  /** GAIN EVENTS (the chargeGain/buffGain proc triggers): every charge or
   *  buff actually gained this frame, with its CHAIN DEPTH — 0 for gains
   *  from real play, +1 per proc-payload link, so Frenzy→Rage→Bloodlust
   *  chains are governed by the same procDepth/falloff rules as hit chains
   *  and a loop back into Frenzy dies at the lid. Swept by the world each
   *  frame (the expiredStatuses pattern); capped so nothing can flood it. */
  gainEvents: { kind: 'charge' | 'buff'; id: string; depth: number }[] = [];
  /** LIFE BOND (BuffEffect.bond): the ally this actor's damage feeds as
   *  healing (bondShare × the skill's bondFeed) — held while the named
   *  buff still rides the target; one bond per caster, newest wins. */
  bond?: { targetId: number; buffId: string };
  /** CAST CYCLES (SkillDef.castCycle): completed real uses counted per
   *  skill id toward the every-Nth-cast grant. */
  castCycles = new Map<string, number>();
  /** Minion life-cycle rites, baked at summon from the OWNER's stats:
   *  on death, the flock heals (deathHealPct × max life + flat); expiry
   *  may count as death (the raging-spirits lever). */
  deathHealPct = 0;
  deathHealFlat = 0;
  expiryTriggersDeath = false;
  /** DAMAGE POOLS (DamagePoolSpec): banked fuel keyed by pool id — fed by
   *  the damage this actor deals, spent by its pool skills. */
  pools = new Map<string, number>();
  /** Pool ids currently VENTING (the leaking aura); ticked by the world. */
  venting = new Set<string>();
  /** Vent damage-tick accumulator (chunked like tethers). */
  ventTick = 0;
  /** STATIC DISCHARGE clocks per skill id (DischargeSpec — next zap time). */
  dischargeAt = new Map<string, number>();
  /** TOGGLED SUMMON CONTRACTS by skill id (PoE2 Spirit style): the skill —
   *  not the minion — owns the reservation, held across every death. */
  summonToggles = new Map<string, { inst: SkillInstance; reserved: number }>();
  /** EXPONENTIAL UNLIFE (decay minions): stamped at spawn; life drains at
   *  dps0 × growth^t once t > 0 — a survival meter, not damage. */
  decay?: { t: number; dps0: number; growth: number };
  /** Leash-recall scratch: progress sampling + re-port cooldown. */
  recallTimer = 0;
  lastProgress?: { x: number; y: number; at: number };
  /** OVERDRIVE lanes (debt-as-reservation, the inverted energy shield):
   *  idle counts DOWN to the repayment window; debt melts in updateTimers. */
  overdrive: { mana?: OverdriveState; life?: OverdriveState } = {};
  /** Life borrowed from the top of the pool (the blood mortgage). */
  reservedLife = 0;
  /** Seconds since the last step (the stationary/moving conditions). */
  idleFor = 0;
  /** Idle wander heading — the world doesn't stand at attention. */
  wanderDir?: number;
  /** Patrol route (world points) marched between when no foe is in sight. */
  patrolRoute?: Vec2[];
  patrolIdx?: number;
  /** Actor id of the patrol leader a follower heels to. */
  patrolFollow?: number;
  /** Event/role marker: 'patrol' | 'caravan' | 'ambush' | 'siege_atk' | 'siege_def' | 'warlord'. */
  tag?: string;
  /** Spawned as part of a zone's BASE population (packs/boss/spawners/camps/
   *  garrisons/faction-war) — NOT an overlay/event spawn. Zone Memory snapshots
   *  exactly these so a re-entered zone restores what you left. */
  fromZoneGen?: boolean;
  /** A BREAKABLE structure door's guard-body: killing it splinters the door
   *  (World.kill → setDoorState 'broken'). Excluded from zone-memory capture —
   *  door persistence is owned solely by ZoneMemory.doorState. */
  doorId?: string;
  /** GARRISON: the structure slot this actor holds (a tower core). While set,
   *  the actor is anchored + wears the slot's mods ('garrison' sheet source);
   *  cleared by World.releaseGarrison (death / verb release). `pending` =
   *  claimed an entry:'walk' slot and is still marching to the perch (the
   *  kernel finalizes anchor + mods on arrival). */
  garrison?: { slotId: string; pending?: boolean };
  /** losStrafe's blocked-lane patience clock — its OWN field, because aiTimer
   *  is owned by the kernels' phase machines (stomping it froze strafers). */
  aiLosTimer = 0;
  /** Elite tier (magic/rare/champion/crowned) — buffed stats + affixes + drops.
   *  Undefined = a normal monster. A 'crowned' kill drives the Warbands unlock. */
  rarity?: MonsterRarity;

  /** Momentum (units/s) — meaningful when traction < 1 (ice). */
  vel: Vec2 = vec(0, 0);
  /** World time of the last deliberate move (for coasting detection). */
  lastMoveAt = -1;
  /** World time this actor last dealt OR took a hit (combat-recency). Drives the
   *  neutral-rouse COOLDOWN: a roused dormant-tag neutral (toll warden / migrant /
   *  brigand) re-dormants after it's been out of combat long enough AND no player is
   *  near (NEUTRAL_RESET). -1 = never in combat. */
  lastCombatAt = -1;
  /** The terrain kind underfoot last frame (entry effects like bog poison). */
  groundKind?: string;
  /** The GRID region kind underfoot last frame (Phase 3 void/deep_water/air). */
  gridRegion?: string;
  /** World time of the last boundary recovery (fall/eject) — debounces repeated
   *  fall damage while held against a void edge. */
  lastFall?: number;
  /** World time of the last drown 'gasping!' text — throttles the warning. */
  lastGaspAt?: number;
  /** World time the actor STARTED drowning (breath empty); drives the drown-damage
   *  RAMP. Cleared the moment breath is regained (air pocket / leaving deep water). */
  drowningSince?: number;
  /** Environmental-survival meters (breath, …) — generic, data-driven (NOT a
   *  hardcoded breath field). Lazily created; regenerates toward each resource's max. */
  survival?: Map<string, number>;

  /** Scenery with a health bar: never acts, never walks, never counted. */
  passive = false;
  /** Rooted in place: never walks, never pushed (spawners, townsfolk).
   *  Passive things WITHOUT this (barrels) can still be shoved around. */
  anchored = false;
  /** Monster faction — cross-faction hostility ignites in war zones. */
  faction?: string;

  life: number;
  mana: number;

  /** Energy shield: soaked before mana shield and life. Recharges fast,
   *  but only after going untouched for esRechargeDelay seconds. */
  es = 0;
  /** Seconds until the energy shield may begin recharging. */
  esDelay = 0;
  /** POISE — the break-bar (Fortitude's pool): while it stands, hits are
   *  reduced by poiseDR and hard CC is shrugged at poiseCcAvoid; every hit
   *  drains it. At zero it BREAKS (benefits lost, `sundered` worn) until it
   *  recovers past the re-arm line. See DEFENSE_CFG.poise for the rules. */
  poise = 0;
  /** Seconds until poise may begin recovering (reset by every drain). */
  poiseDelay = 0;
  /** Broken until the pool climbs back past the re-arm fraction. */
  poiseBroken = false;
  /** INSIGHT — the momentum-fed avoidance pool (Charisma's lane): spent by
   *  incoming hits to slip the brunt, refilled only while MOVING. The live
   *  reduction is insightDR × insightMomentum() (the velocity taper). */
  insight = 0;
  /** ENDURANCE — the break-less pool (D4-Fortify shape): flat enduranceDR
   *  while ANY of it holds, spending what it prevents; empty = nothing.
   *  No break state, no status — the deliberate contrast with poise. */
  endurance = 0;
  /** Seconds until endurance may begin recovering (reset by every spend). */
  enduranceDelay = 0;
  /** EVASION ENTROPY: the deterministic dodge accumulator (each incoming
   *  attack adds its chance-to-hit; a crossing of 1 lands and pays 1 back)
   *  plus the freshness window that re-seeds it between fights. */
  evadeEntropy = 0;
  evadeWindow = 0;
  /** TRANSIENT: the energy shield was emptied since the world last looked —
   *  set by the soak chain, consumed by the world's esBreak proc roll
   *  (the expiredStatuses pattern). */
  esBroke = false;
  /** Absorption shield: temporary pool eaten before EVERYTHING else. */
  absorb = 0;
  absorbTimer = 0;
  /** WARD: the DECAYING shield — soaked before even absorb, uncapped, and
   *  held down only by its own decay (wardDecay/wardGain stats). Balance
   *  accumulation against depletion; gain through gainWard ONLY. */
  ward = 0;
  /** STAGGERED damage (staggerFrac / seal.stagger): post-mitigation life
   *  damage spread over a short window instead of landing at once. Drains
   *  in updateTimers; drainPerSec re-levels on each addition. */
  stagger?: { amount: number; perSec: number };
  /** RESTORE STREAMS (restoreOverTime — the flask pours): each entry
   *  trickles a resource until spent. Life flows through healBy. */
  restoreStreams: { resource: 'life' | 'mana' | 'es'; perSec: number; remaining: number }[] = [];
  /** USE-CHARGE banks per skill id (SkillDef.useCharges): the count and
   *  the running recovery timer. Lazily seeded FULL on first query. */
  skillChargeState = new Map<string, { count: number; timer: number }>();
  /** LIFE SEAL (Mortis Seal): while set, healBy cannot raise life above
   *  this value — the toggle stamps it on, clears it off. */
  lifeSealAt?: number;
  /** INVOCATION RUNES: the ordered sequence banked by elemental casts
   *  while an invoking skill sits on the bar (see SkillDef.invokes) —
   *  order matters; the invoke consumes the lot. */
  runes: string[] = [];
  /** Distance walked since the last 'move' charge-tap sweep (fed by
   *  World.moveActor; consumed in updateCharges). */
  moveAcc = 0;
  /** Fingerprint of the last-synced equipMods loadout (skip no-op syncs —
   *  setSource clears the stat cache). */
  private equipKey = '';

  /** Skill bar. For the player, index = slot; for AI, the whole repertoire. */
  skills: (SkillInstance | null)[] = [];
  cooldowns = new Map<string, number>();
  /** Time until the actor can act again (set by a skill's use time). */
  useLock = 0;

  statuses: ActiveStatus[] = [];
  buffs = new Map<string, ActiveBuff>();

  /** Set while dashing: overrides normal movement. */
  dash: { dir: number; speed: number; remaining: number } | null = null;
  /** Knockback in flight: a decaying VELOCITY that impulses ADD to — so
   *  overlapping blasts batter a target around instead of teleport-sliding
   *  it (see World.pushActor). Collision-respecting. */
  push: { vx: number; vy: number;
    /** The attacker + skill behind this knockback, so a collision can roll the
     *  caster's 'collision' procs (the knockback-collision-damage support). */
    caster?: Actor; inst?: import('./skills').SkillInstance; collided?: boolean } | null = null;
  /** Set while a cast bar is running / a channel is held. */
  casting: CastingState | null = null;

  /** Role axis (player / minion / mercenary / monster). undefined ⇒ 'monster'.
   *  Orthogonal to `team`; see UnitKind. Set only at spawn, never per-frame. */
  kind?: UnitKind;
  /** Downed-but-not-dead — a co-op player seat awaiting revival. Single-player
   *  never sets this (a lone death ends the run). Drives the downed/revive flow
   *  and keeps the body out of enemy target lists. */
  downed = false;

  // Monster / minion bookkeeping
  defId?: string;
  xpValue = 0;
  owner?: Actor;          // set for minions
  aiCooldown = 0;         // small delay between AI decisions
  hitFlash = 0;           // render feedback timer

  // Minion explosion payloads, baked from the owner's stats at summon time.
  // Values are the fraction of the minion's max life dealt as fire damage.
  explodeOnDeath = 0;
  explodeOnLowLife = 0;
  /** Telegraphed coalesce-burst config (from MonsterDef.deathBurst) — an enemy's death
   *  gathers into a spore/orb before detonating, so the player can escape. */
  deathBurst?: DeathBurstDef;

  // Minion lifecycle
  /** Seconds until natural expiry (0 = permanent until killed). */
  lifespan = 0;
  /** Cannot be damaged (hits report immune). */
  invulnerable = false;
  /** Cannot be hit or targeted — projectiles pass through, AI ignores it. */
  untargetable = false;
  /** Floats over fall hazards: void/chasm 'fall' recovery is SKIPPED (no fall damage,
   *  no eject) — so a knockback can't shove this actor into the void for a free kill.
   *  Pathing still treats void as non-walkable, so it naturally keeps off the pits. */
  levitates = false;
  /** Which skill summoned this minion (caps are per-skill, not per-monster). */
  sourceSkillId?: string;
  /** The summoning instance, kept for persistent respawns. */
  summonInst?: SkillInstance;
  /** Max mana this minion's contract reserves on its owner. */
  manaReserved = 0;
  /** Total max mana locked out by persistent minions and toggled auras. */
  reservedMana = 0;

  /** Set on deployed constructs; they never move and act via the world. */
  construct?: ConstructState;
  /** Auras currently emanating from this actor. */
  activeAuras = new Map<string, ActiveAura>();
  /** Combo resources (charges) by name. Mutate through gainCharge /
   *  spendCharge so registry personalities (per-charge mods, decay,
   *  drains) stay in sync — raw map writes leave stale sheet sources. */
  charges = new Map<string, number>();
  /** Meta-action payload instances, cached per HOST skill id (a Detonate
   *  minted for Fire Mine's slot; re-minted when the host levels). */
  metaInsts = new Map<string, SkillInstance>();
  /** The DURATION each running cooldown was set with — the HUD's sweep
   *  denominator (an Apotheosis-imposed clock has def.cooldown 0). */
  cooldownTotals = new Map<string, number>();
  /** High-water mark of `lifespan` — the denominator for hire-clock bars
   *  (the Amalgam's deterioration sliver). Self-maintained in updateTimers
   *  so no lifespan assignment site needs to remember it. */
  lifespanTotal = 0;
  /** COMMANDED (minions): march on this mark until arrival or expiry. */
  aiCommandPos?: Vec2;
  aiCommandUntil = 0;
  /** DEVOURER (the apex economy): the spec stamped at spawn (innate or a
   *  Ravenous Pact graft) and the world clock of the next meal. */
  devour?: { spec: import('./skills').DevourSpec; next: number };
  /** APEX PRESENCE keys this minion currently wears (`presence:<skillId>`
   *  sheet sources) — the world's minion sweep diffs against it. */
  wornPresence?: string[];
  /** IRON WARD: banked incoming damage awaiting its detonation. */
  ironWard?: { stored: number; cap: number; until: number; ratio: number; radius: number };
  /** Charge bookkeeping: seconds since last gain (decay clock), the
   *  fractional decay/drain accumulator, the per-second tap accumulator,
   *  and an active drain rate (Bloodlust's one-way burn). */
  private chargeState = new Map<string, { idle: number; acc: number; tick: number; drain?: number }>();
  /** Last charge count synced into the sheet, per charge (skip no-op syncs
   *  — setSource clears the stat cache, so sync only on real change). */
  private chargeModCount = new Map<string, number>();
  /** Shared summon-cap group this minion counts against (golems). */
  sourcePoolGroup?: string;
  /** Enemies prefer taunting actors over other targets (decoys). */
  taunt = false;
  /** Gate constructs: actor id of the paired gate. */
  gateLink?: number;
  /** Statuses that expired naturally this frame (world handles ruptures). */
  expiredStatuses: ActiveStatus[] = [];
  /** Undying Loyalty: seconds of unlife granted after a lethal blow. */
  undyingTime = 0;
  undyingSpent = false;

  dead = false;

  constructor(name: string, team: Team, pos: Vec2) {
    this.name = name;
    this.team = team;
    this.pos = vec(pos.x, pos.y);
    this.life = 1;
    this.mana = 1;
  }

  maxLife(): number { return this.sheet.get('life'); }
  maxMana(): number { return this.sheet.get('mana'); }
  maxEs(): number { return this.sheet.get('energyShield'); }
  maxPoise(): number { return this.sheet.get('poise'); }
  maxInsight(): number { return this.sheet.get('insight'); }
  maxEndurance(): number { return this.sheet.get('endurance'); }

  /** FORTIFY: bank endurance (the pool's real refill — proc payloads and
   *  skill effects call this). Capped at max; a 0-max sheet banks nothing. */
  gainEndurance(amount: number): number {
    if (amount <= 0 || this.dead) return 0;
    const max = this.maxEndurance();
    const before = this.endurance;
    this.endurance = Math.min(max, this.endurance + amount);
    return this.endurance - before;
  }

  /** The insight VELOCITY TAPER: 1 while moving (within the grace window),
   *  easing to 0 over the insightTaper stat's seconds once planted. Dashes,
   *  leaps, and live knockback all count as motion (they zero idleFor), so
   *  the momentum window survives a dodge-roll through the pack. */
  insightMomentum(): number {
    const idle = this.idleFor - DEFENSE_CFG.insight.graceWindow;
    if (idle <= 0) return 1;
    return Math.max(0, 1 - idle / Math.max(0.1, this.sheet.get('insightTaper')));
  }

  /** Drain the poise bar (damage.ts mitigation + any future data source).
   *  Resets the recovery delay; at the bottom the bar BREAKS — the break
   *  status (DEFENSE_CFG.poise.breakStatus) lands and the benefits lapse
   *  until the pool recovers past the re-arm fraction (updateTimers).
   *  The BREAKER's sunderDuration stat stretches the Sundered they inflict
   *  (the poise-breaker specialization dial); their effectDuration does
   *  not — sunder is its own investment, not a free rider.
   *  Returns true only on the breaking drain (for the world's fanfare). */
  damagePoise(amount: number, breaker?: Actor, tags?: Set<SkillTag>, extra?: readonly Modifier[]): boolean {
    if (amount <= 0 || this.maxPoise() <= 0) return false;
    this.poiseDelay = this.sheet.get('poiseRegenDelay');
    const before = this.poise;
    this.poise = Math.max(0, this.poise - amount);
    if (this.poise <= 0 && before > 0 && !this.poiseBroken) {
      this.poiseBroken = true;
      const bs = DEFENSE_CFG.poise.breakStatus;
      if (bs && STATUS_DEFS[bs]) {
        const durScale = breaker ? breaker.sheet.get('sunderDuration', tags, extra) : 1;
        this.applyStatus(bs, 0, durScale, breaker?.name ?? 'Poise Break');
      }
      return true;
    }
    return false;
  }

  /** The one WEIGHT read (pushes, crowd separation): the weight stat,
   *  anchored by CURRENT unbroken poise (DEFENSE_CFG.weight.perPoise) — a
   *  poised colossus holds its ground; break the bar and it moves. */
  effectiveWeight(): number {
    let w = this.sheet.get('weight');
    if (this.poise > 0 && !this.poiseBroken) {
      w *= 1 + this.poise * DEFENSE_CFG.weight.perPoise;
    }
    return Math.max(DEFENSE_CFG.weight.min, w);
  }

  /** THE one gate every life heal flows through: scaled by the healTaken
   *  stat (seared wounds halve it — a status is all it takes) and capped
   *  at the life CEILING (overdrive debt borrows the top of the pool).
   *  Returns what actually landed. */
  healBy(amount: number): number {
    if (amount <= 0 || this.dead) return 0;
    const before = this.life;
    // A LIFE SEAL (Mortis Seal) locks the top of the pool below even the
    // ceiling: heals pour against the seal and spill away.
    const cap = this.lifeSealAt !== undefined
      ? Math.min(this.lifeCeiling(), this.lifeSealAt)
      : this.lifeCeiling();
    this.life = Math.min(cap,
      this.life + amount * this.sheet.get('healTaken'));
    return this.life - before;
  }

  /** THE one gate ward flows through: × the wardGain stat. The pool is
   *  uncapped — its decay (wardDecay, ticked in updateTimers) is the cap. */
  gainWard(amount: number): number {
    if (amount <= 0 || this.dead) return 0;
    const gained = amount * this.sheet.get('wardGain');
    this.ward += gained;
    return gained;
  }

  /** STAGGER (staggerFrac / Mortis Seal / the monk-stagger toggle): bank
   *  post-mitigation life damage to drain over the staggerWindow stat's
   *  span instead of landing at once. The
   *  drain rate re-levels so stacked wounds still clear on schedule. */
  staggerDamage(amount: number): void {
    if (amount <= 0) return;
    const s = (this.stagger ??= { amount: 0, perSec: 0 });
    s.amount += amount;
    s.perSec = s.amount / this.sheet.get('staggerWindow');
  }

  fillResources(): void {
    this.life = this.maxLife();
    this.mana = this.maxMana();
    this.es = this.maxEs();
    this.poise = this.maxPoise();
    this.insight = this.maxInsight();
    this.endurance = this.maxEndurance();
    this.poiseBroken = false;
  }

  isMinion(): boolean { return !!this.owner; }

  /** Book threat against an enemy (the chart decays in the AI tick). */
  addThreat(id: number, amount: number): void {
    if (amount <= 0) return;
    this.threat.set(id, (this.threat.get(id) ?? 0) + amount);
  }

  /** A controllable hero seat (local player, co-op ally). Distinct from minions
   *  (owned) and mercenaries — used by the party UI and the dead-sweep. */
  isPlayerKind(): boolean { return this.kind === 'player'; }

  isStunned(): boolean {
    return this.statuses.some(s => STATUS_DEFS[s.id]?.hardCC);
  }

  /** Holding a guard stance right now? */
  isGuarding(): boolean { return this.casting?.mode === 'guard'; }

  /** Channeling in any form (channels and guard stances both count). */
  isChanneling(): boolean {
    return this.casting?.mode === 'channel' || this.casting?.mode === 'guard';
  }

  canAct(): boolean {
    return !this.dead && this.useLock <= 0 && !this.isStunned()
      && !this.dash && !this.casting;
  }

  /** Apply an attribute spread as the 'attributes' modifier source. */
  setAttributes(attrs: Attributes): void {
    this.sheet.setSource('attributes', attributeModifiers(attrs));
  }

  /** `chainDepth`: proc links behind this application (0 = real play) —
   *  the buffGain event carries it so buff→buff chains obey depth rules. */
  addBuff(def: BuffEffect, durationScale = 1, chainDepth = 0): void {
    // Every application — fresh, stacking, or refresh — counts as GAINING
    // the buff (the buffGain trigger's event).
    if (this.gainEvents.length < 64) {
      this.gainEvents.push({ kind: 'buff', id: def.id, depth: chainDepth });
    }
    const existing = this.buffs.get(def.id);
    const duration = def.duration * durationScale;
    const grant = def.stacksOnApply ?? 1;
    // INDEPENDENT stack clocks (Deep Carve): each application ADDS a stack
    // on its own timer — nothing refreshes; old cuts close as new ones open.
    if (def.stackTimers === 'independent' && (def.maxStacks ?? 1) > 1) {
      const buff = existing ?? { def, remaining: 0, stacks: 0, expiries: [] as number[] };
      buff.expiries ??= [];
      for (let i = 0; i < grant && buff.expiries.length < (def.maxStacks ?? 1); i++) {
        buff.expiries.push(duration);
      }
      buff.stacks = buff.expiries.length;
      buff.remaining = Math.max(...buff.expiries);
      this.buffs.set(def.id, buff);
      this.syncBuffSource(def.id);
      return;
    }
    if (existing && (def.maxStacks ?? 1) > 1) {
      existing.stacks = Math.min(def.maxStacks ?? 1, existing.stacks + grant);
      existing.remaining = duration;
      existing.def = def; // dynamic-value buffs re-price on refresh
      this.buffs.set(def.id, existing);
    } else if (existing) {
      existing.remaining = duration;
      // DYNAMIC-VALUE refresh (Echoing Might): the newest application's
      // def replaces the old, so computed mod values re-price each grant.
      existing.def = def;
      this.buffs.set(def.id, existing);
    } else {
      this.buffs.set(def.id, {
        def, remaining: duration,
        stacks: Math.min(def.maxStacks ?? grant, grant),
      });
    }
    this.syncBuffSource(def.id);
  }

  /** Spend `n` stacks of a buff (ammunition rounds); at zero it ends. */
  consumeBuffStacks(id: string, n = 1): void {
    const buff = this.buffs.get(id);
    if (!buff) return;
    buff.stacks -= n;
    if (buff.stacks <= 0) this.buffs.delete(id);
    this.syncBuffSource(id);
  }

  // ------------------------------------------------------------- charges ---

  /** Bank charges, honoring the registry: refused outright while the
   *  charge is DRAINING (the one-way valve), capped at max + the owner's
   *  chargeCap stat (queried with the granting skill's tags — "+2 max Rage
   *  on melee skills" is a tag filter), and per-charge mods re-synced.
   *  `chainDepth`: how many proc links produced this gain (0 = real play) —
   *  stamped onto the gain EVENT so chargeGain procs obey the depth rules. */
  gainCharge(charge: string, amount: number, max: number, inst?: SkillInstance, chainDepth = 0): void {
    const st = this.chargeState.get(charge);
    if (st?.drain !== undefined) return;
    const cap = Math.max(0, Math.round(max + this.sheet.get('chargeCap',
      inst ? skillContextTags(inst.def) : undefined,
      inst ? instanceMods(inst) : undefined)));
    const cur = this.charges.get(charge) ?? 0;
    const next = Math.min(cap, cur + amount);
    this.charges.set(charge, next);
    // An ACTUAL increase is a gain event (a full bank refreshing isn't).
    if (next > cur && this.gainEvents.length < 64) {
      this.gainEvents.push({ kind: 'charge', id: charge, depth: chainDepth });
    }
    // A fresh gain resets the decay clock.
    const state = st ?? { idle: 0, acc: 0, tick: 0 };
    state.idle = 0;
    this.chargeState.set(charge, state);
    this.syncChargeMods(charge);
  }

  /** Spend charges (floored at zero) and re-sync per-charge mods. */
  spendCharge(charge: string, amount: number): void {
    const cur = this.charges.get(charge) ?? 0;
    this.charges.set(charge, Math.max(0, cur - amount));
    this.syncChargeMods(charge);
  }

  /** Begin a charge DRAIN: the bank burns at perSec and cannot be fed
   *  until it empties (drainCharge effect — Bloodlust's descent). */
  startChargeDrain(charge: string, perSec: number): void {
    const state = this.chargeState.get(charge) ?? { idle: 0, acc: 0, tick: 0 };
    state.drain = perSec;
    this.chargeState.set(charge, state);
  }

  /** Is this charge currently draining (gains refused)? */
  isChargeDraining(charge: string): boolean {
    return this.chargeState.get(charge)?.drain !== undefined;
  }

  /** Sync the `charge:<id>` sheet source to the live count × the
   *  registry's per-charge mods. No-op when the count hasn't moved. */
  private syncChargeMods(charge: string): void {
    const def = CHARGE_DEFS[charge];
    const per = def?.perCharge;
    if (!per) return;
    // Drain-gated personalities (Bloodlust): the bank is mute POTENTIAL —
    // an effective count of 0 until the drain opens the tap.
    const count = def.modsWhileDraining && !this.isChargeDraining(charge)
      ? 0 : this.charges.get(charge) ?? 0;
    if (this.chargeModCount.get(charge) === count) return;
    this.chargeModCount.set(charge, count);
    if (count <= 0) { this.sheet.removeSource('charge:' + charge); return; }
    this.sheet.setSource('charge:' + charge,
      per.map(m => ({ ...m, value: m.value * count })));
  }

  /** Tick charge personalities: drains burn the bank (and release when it
   *  empties), unattended decay bleeds it, per-second taps feed it. */
  private updateCharges(dt: number): void {
    // Registry decay clocks (also covers charges with no live state yet).
    for (const [id, def] of Object.entries(CHARGE_DEFS)) {
      if (!def.decay || (this.charges.get(id) ?? 0) <= 0) continue;
      const st = this.chargeState.get(id) ?? { idle: 0, acc: 0, tick: 0 };
      this.chargeState.set(id, st);
      if (st.drain === undefined) {
        st.idle += dt;
        if (st.idle >= (def.decay.delay ?? 0)) st.acc += def.decay.perSec * dt;
      }
    }
    // Drains burn regardless of decay clocks.
    for (const [id, st] of this.chargeState) {
      if (st.drain !== undefined) st.acc += st.drain * dt;
      while (st.acc >= 1) {
        st.acc -= 1;
        const cur = this.charges.get(id) ?? 0;
        if (cur > 0) this.charges.set(id, cur - 1);
      }
      if (st.drain !== undefined && (this.charges.get(id) ?? 0) <= 0) {
        st.drain = undefined; // spent: the valve reopens
        st.acc = 0;
      }
      this.syncChargeMods(id);
    }
    // Per-second / per-distance / per-channel-second taps on equipped
    // skills (chargeGain, skill-innate AND support-grafted — the merged
    // instanceChargeGain list). Move taps share the frame's walked
    // distance (moveAcc, fed by World.moveActor), each on its own meter;
    // channelSecond clocks only advance while a channel/guard is HELD.
    const walked = this.moveAcc;
    for (const inst of this.skills) {
      if (!inst) continue;
      const specs = instanceChargeGain(inst);
      for (const spec of specs) {
        if (spec.on !== 'second' && spec.on !== 'move' && spec.on !== 'channelSecond') continue;
        if (spec.whileToggled && !this.activeAuras.has(inst.def.id)
          && !this.summonToggles.has(inst.def.id)) continue;
        // Distinct meters per (skill, charge, tap): a 'second' clock and a
        // 'move' odometer on the same charge must never share an accumulator.
        const key = spec.charge + ':' + spec.on + ':' + inst.def.id;
        const st = this.chargeState.get(key) ?? { idle: 0, acc: 0, tick: 0 };
        this.chargeState.set(key, st);
        if (spec.on === 'channelSecond') {
          // The meditative tap: the clock runs only while the hold is real
          // — and only while THIS skill is the one being held.
          if (this.isChanneling() && this.casting?.inst.def.id === inst.def.id) {
            st.tick += dt;
          }
        } else {
          st.tick += spec.on === 'second' ? dt : walked;
        }
        const unit = spec.on === 'move' ? (spec.perDistance ?? 60)
          : (spec.everySeconds ?? 1);
        while (st.tick >= unit) {
          st.tick -= unit;
          this.gainCharge(spec.charge, spec.amount, spec.max, inst);
        }
      }
    }
    this.moveAcc = 0;
  }

  private syncBuffSource(id: string): void {
    const buff = this.buffs.get(id);
    if (!buff) { this.sheet.removeSource('buff:' + id); return; }
    const mods: Modifier[] = buff.def.mods.map(m => ({ ...m, value: m.value * buff.stacks }));
    this.sheet.setSource('buff:' + id, mods);
  }

  applyStatus(
    id: string, dps: number, durationScale: number, sourceName: string,
    opts?: {
      propagates?: boolean; rupture?: number; ruptureType?: ActiveStatus['ruptureType'];
      /** Applier-side bonus to the stacking cap (the ailmentStacks stat). */
      stacksBonus?: number;
      /** The applier's actor id (brood attribution and kin). */
      casterId?: number;
      /** BROOD clause from the applying skill's graft (BroodSpec). */
      brood?: ActiveStatus['brood'];
      /** DOT-LEECH fraction (the applier's dotLeech_<id> stat). */
      leech?: number;
    },
  ): void {
    const def = STATUS_DEFS[id];
    if (!def) return;
    // POISE holds the line: while the break-bar stands, incoming HARD CC
    // may be shrugged outright (the poiseCcAvoid stat). One gate for every
    // stun path — hit effects, pulls, chill's freeze buildup alike.
    if (def.hardCC && !def.beneficial && this.poise > 0.5 && !this.poiseBroken
      && chance(this.sheet.get('poiseCcAvoid'))) {
      return;
    }
    // SELECTIVE CC INTERRUPT: a forbidsTags status landing MID-CAST cuts
    // the forbidden cast short — silence doesn't wait for the next press.
    if (def.forbidsTags && this.casting
      && def.forbidsTags.some(t => this.casting!.inst.def.tags.includes(t))) {
      this.casting = null;
    }
    // AFFLICTION RECOVERY (victim-side): hostile statuses run out faster —
    // the defender's twin of the attacker's effectDuration.
    const expiry = def.beneficial ? 1 : this.sheet.get('afflictionExpiry');
    const duration = def.duration * durationScale / expiry;
    const existing = this.statuses.find(s => s.id === id);
    // ARMED (rupture-bearing) statuses run a FIXED FUSE: re-application never
    // postpones the blast — the timer set when the keg was armed runs down no
    // matter how often the victim is re-struck. Fresh rupture payloads PUMP
    // the keg instead (they ADD — see the opts merge below).
    const fixedFuse = existing !== undefined && existing.rupture !== undefined;
    // The stacking cap is INVESTABLE: the applier's ailmentStacks stat rides
    // in via opts (chill's freeze-buildup threshold moves with it too).
    const cap = (def.maxStacks ?? 99) + (opts?.stacksBonus ?? 0);
    if (existing && def.stacking) {
      if (existing.stacks < cap) existing.stacks++;
      if (!fixedFuse) existing.remaining = duration;
      existing.dps = Math.max(existing.dps, dps);
      // Per-stack mods (Vulnerable): each stack opens the victim wider.
      if (def.modsPerStack && def.mods) {
        this.sheet.setSource('status:' + id,
          def.mods.map(m => ({ ...m, value: m.value * existing.stacks })));
      }
      // BUILDUP (chill → frozen): at peak intensity the stacks are consumed
      // into the declared successor status. Any stacking status can declare
      // a buildup — the ladder is data, not code.
      if (def.buildup && existing.stacks >= cap) {
        const i = this.statuses.indexOf(existing);
        if (i !== -1) this.statuses.splice(i, 1);
        this.sheet.removeSource('status:' + id);
        this.applyStatus(def.buildup.into, 0, durationScale, sourceName);
      }
    } else if (existing && def.stackPolicy === 'strongest' && !fixedFuse) {
      // STRONGEST-WINS (ignite): a mightier application seizes the ailment
      // wholesale — dps AND timer; a weaker one fizzles against what already
      // burns. (Armed kegs fall through to the fixed-fuse path instead.)
      if (dps > existing.dps) {
        existing.dps = dps;
        existing.remaining = duration;
      }
    } else if (existing) {
      if (!fixedFuse) existing.remaining = Math.max(existing.remaining, duration);
      existing.dps = Math.max(existing.dps, dps);
    } else {
      this.statuses.push({
        id, remaining: duration, stacks: 1, dps, sourceName,
        propagates: opts?.propagates || def.propagateOnDeath,
        rupture: opts?.rupture,
        ruptureType: opts?.ruptureType,
        casterId: opts?.casterId,
        brood: opts?.brood,
        leech: opts?.leech,
        total: duration,
        // WEAK SPOT: the window paints just below the CURRENT wound.
        window: def.weakSpot ? (() => {
          const frac = this.life / Math.max(1, this.maxLife());
          const hi = Math.max(0.02, frac - def.weakSpot.gap);
          return { hi, lo: Math.max(0, hi - def.weakSpot.size) };
        })() : undefined,
      });
      if (def.mods) this.sheet.setSource('status:' + id, def.mods);
      return;
    }
    if (existing && opts) {
      existing.propagates = existing.propagates || opts.propagates || def.propagateOnDeath;
      // Rupture payloads ADD (pumping the keg on its fixed fuse) rather than
      // max — hitting harder and hitting often both matter.
      existing.rupture = ((existing.rupture ?? 0) + (opts.rupture ?? 0)) || undefined;
      existing.ruptureType = existing.ruptureType ?? opts.ruptureType;
      existing.casterId = existing.casterId ?? opts.casterId;
      existing.brood = existing.brood ?? opts.brood;
      if (opts.leech) existing.leech = Math.max(existing.leech ?? 0, opts.leech);
    }
  }

  /** Remove a named buff (consumed remnants, broken wards). */
  removeBuff(id: string): void {
    if (this.buffs.delete(id)) this.syncBuffSource(id);
  }

  /** True if any equipped skill carries a modifier keyed to this condition
   *  (innate or socketed) — the renderer's cue to SURFACE the state: an
   *  invisible ±28% stance swing needs a visible plant (Colossus Stance). */
  hasConditionalMods(when: ConditionId): boolean {
    for (const inst of this.skills) {
      if (!inst) continue;
      if (inst.def.innateMods?.some(m => m.when === when)) return true;
      for (const s of inst.sockets) {
        if (s?.def.mods.some(m => m.when === when)) return true;
      }
    }
    return false;
  }

  /** Recompute the actor-state conditions conditional modifiers test. */
  private refreshConditions(): void {
    const maxLife = this.maxLife();
    const maxMana = this.maxMana();
    const maxEs = this.maxEs();
    const active: ConditionId[] = [];
    if (this.life < maxLife * 0.35) active.push('lowLife');
    if (this.life >= maxLife * 0.95) active.push('fullLife');
    if (maxMana > 0 && this.mana < maxMana * 0.25) active.push('lowMana');
    if (maxMana > 0 && this.mana >= maxMana * 0.95) active.push('fullMana');
    if (this.es > 0.5) active.push('hasEs');
    if (maxEs > 0 && this.es >= maxEs * 0.99) active.push('fullEs');
    if (maxEs > 0 && this.es < maxEs * 0.35) active.push('lowEs');
    if (this.casting?.mode === 'guard') active.push('guarding');
    // The break-bar stands: "while poised" mods hold (lapse on the break).
    if (this.poise > 0.5 && !this.poiseBroken) active.push('poised');
    // Planted vs on the move (Colossus Stance): idleFor accrues in
    // updateTimers and is zeroed by every deliberate step. Between the two
    // windows sits a NEUTRAL transition band — neither bonus nor malus.
    if (this.idleFor > STANCE_PLANT_TIME) active.push('stationary');
    else if (this.idleFor < STANCE_MOVE_WINDOW) active.push('moving');
    this.sheet.setConditions(active);

    // LIVE GAUGES for gauge-scaled modifiers ("2% increased damage per
    // poison stack on you"): own status stacks + banked charges. Integer,
    // event-driven quantities ONLY — per-frame floats would churn the stat
    // cache every tick (the gauge golden rule).
    const gauges: [string, number][] = [];
    for (const s of this.statuses) {
      if (s.stacks > 0) gauges.push(['status:' + s.id, s.stacks]);
    }
    for (const [id, n] of this.charges) {
      if (n > 0) gauges.push(['charge:' + id, n]);
    }
    this.sheet.setGauges(gauges);
  }

  /** Tick durations; returns the frame's DoT damage to inflict, BY DAMAGE
   *  TYPE (statuses without a dotType pool under 'untyped') — so the DoT
   *  pipeline can honour element-tagged interactions (esDotBypass per
   *  element, tagged damageTaken). Null when nothing ticked. */
  updateTimers(dt: number): Partial<Record<DamageType | 'untyped', number>> | null {
    this.refreshConditions();
    // Hire-clock high-water mark (the lifespan sliver's denominator).
    if (this.lifespan > this.lifespanTotal) this.lifespanTotal = this.lifespan;
    // Cooldowns tick faster with cooldownRecovery.
    const cdr = this.sheet.get('cooldownRecovery');
    for (const [id, t] of this.cooldowns) {
      const left = t - dt * cdr;
      if (left <= 0) this.cooldowns.delete(id); else this.cooldowns.set(id, left);
    }
    if (this.useLock > 0) this.useLock -= dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.aiCooldown > 0) this.aiCooldown -= dt;
    // Evasion-entropy freshness: unattacked long enough, the accumulator
    // re-seeds on the next check (a fresh fight reads fresh).
    if (this.evadeWindow > 0) this.evadeWindow -= dt;

    // Charge personalities: decay clocks, drains, per-second taps.
    this.updateCharges(dt);

    // Buffs
    for (const [id, buff] of this.buffs) {
      // Independent stack clocks: cull each expiry on its own, re-sync
      // when the count moves; the buff ends when the last stack closes.
      if (buff.expiries) {
        let moved = false;
        for (let i = buff.expiries.length - 1; i >= 0; i--) {
          buff.expiries[i] -= dt;
          if (buff.expiries[i] <= 0) { buff.expiries.splice(i, 1); moved = true; }
        }
        if (buff.expiries.length === 0) {
          this.buffs.delete(id);
          this.syncBuffSource(id);
        } else if (moved) {
          buff.stacks = buff.expiries.length;
          buff.remaining = Math.max(...buff.expiries);
          this.syncBuffSource(id);
        } else {
          buff.remaining -= dt;
        }
        continue;
      }
      buff.remaining -= dt;
      if (buff.remaining <= 0) {
        this.buffs.delete(id);
        this.syncBuffSource(id);
      }
    }

    // Statuses + DoT accumulation, pooled BY TYPE (the status's dotType).
    let dot: Partial<Record<DamageType | 'untyped', number>> | null = null;
    for (let i = this.statuses.length - 1; i >= 0; i--) {
      const s = this.statuses[i];
      s.remaining -= dt;
      if (s.dps > 0) {
        const sdef = STATUS_DEFS[s.id];
        const key = sdef?.dotType ?? 'untyped';
        // DPS CURVES (Curse-of-Agony ramps, dying tapers): the tick scales
        // 0→2 or 2→0 across the status's span — same flat total either way.
        let curve = 1;
        if (sdef?.dpsCurve && s.total) {
          const prog = Math.min(1, Math.max(0, 1 - s.remaining / s.total));
          curve = sdef.dpsCurve === 'ramp' ? 2 * prog : 2 * (1 - prog);
        }
        const tick = s.dps * s.stacks * curve * dt;
        dot ??= {};
        dot[key] = (dot[key] ?? 0) + tick;
        // BROOD clauses bank the tick toward the world's hatch roll.
        if (s.brood) s.broodAcc = (s.broodAcc ?? 0) + tick;
        // DOT LEECH banks toward the applier's healing (world pays it).
        if (s.leech) s.leechAcc = (s.leechAcc ?? 0) + tick * s.leech;
      }
      if (s.remaining <= 0) {
        this.statuses.splice(i, 1);
        this.expiredStatuses.push(s); // world processes ruptures
        if (!this.statuses.some(o => o.id === s.id)) this.sheet.removeSource('status:' + s.id);
      }
    }

    // Absorption shield expiry
    if (this.absorb > 0) {
      this.absorbTimer -= dt;
      if (this.absorbTimer <= 0) this.absorb = 0;
    }

    // WARD DECAY: the pool bleeds a fraction of itself per second (plus a
    // small flat floor so slivers finish evaporating) — retention
    // investment lowers wardDecay; nothing raises a ceiling that isn't there.
    if (this.ward > 0) {
      const rate = this.sheet.get('wardDecay');
      this.ward = Math.max(0, this.ward - Math.max(this.ward * rate, 2) * dt);
      if (this.ward < 0.5) this.ward = 0;
    }

    // STAGGERED damage drains on its own schedule — already-mitigated LIFE
    // damage, applied raw (never re-soaked, never re-staggered). It CAN
    // finish a kill; the world's post-tick sweep collects the body.
    if (this.stagger && this.stagger.amount > 0 && !this.dead) {
      const drain = Math.min(this.stagger.amount, this.stagger.perSec * dt);
      this.stagger.amount -= drain;
      this.life -= drain;
      if (this.stagger.amount <= 0.1) this.stagger = undefined;
    }

    // RESTORE STREAMS (the flask pours): each trickles until spent. Life
    // rides healBy (healTaken gates the flask like every other heal).
    for (let i = this.restoreStreams.length - 1; i >= 0; i--) {
      const st = this.restoreStreams[i];
      const step = Math.min(st.remaining, st.perSec * dt);
      st.remaining -= step;
      if (st.resource === 'life') this.healBy(step);
      else if (st.resource === 'mana') {
        this.mana = Math.min(this.availableMaxMana(), this.mana + step);
      } else {
        this.es = Math.min(this.maxEs(), this.es + step);
      }
      if (st.remaining <= 0) this.restoreStreams.splice(i, 1);
    }

    // USE-CHARGE recovery (SkillDef.useCharges): one charge back per
    // `recharge` seconds (÷ skillChargeRate), per equipped bank, until full.
    for (const inst of this.skills) {
      const uc = inst?.def.useCharges;
      if (!uc) continue;
      const st = this.skillChargeBank(inst!);
      const cap = this.skillChargeCap(inst!);
      if (st.count >= cap) { st.timer = 0; continue; }
      st.timer += dt * this.sheet.get('skillChargeRate',
        skillContextTags(inst!.def), instanceMods(inst!));
      if (st.timer >= uc.recharge) {
        st.timer -= uc.recharge;
        st.count = Math.min(cap, st.count + 1);
        if (st.count >= cap) st.timer = 0;
      }
    }

    // EQUIP MODS (SkillDef.equipMods): worn while the skill sits on the
    // bar. Fingerprint the loadout so the sheet source (and its cache
    // flush) only moves when the bar actually changed.
    {
      let key = '';
      for (const inst of this.skills) {
        if (inst?.def.equipMods) key += inst.def.id + ':' + inst.level + ';';
      }
      if (key !== this.equipKey) {
        this.equipKey = key;
        if (!key) {
          this.sheet.removeSource('equipped');
        } else {
          const merged: Modifier[] = [];
          for (const inst of this.skills) {
            if (inst?.def.equipMods) merged.push(...inst.def.equipMods);
          }
          this.sheet.setSource('equipped', merged);
        }
      }
    }

    // Stationary/moving conditions ride this accumulator (moveActor zeroes
    // it; dashes, leaps, and live knockback are motion too — a Colossus
    // can't stay 'planted' mid-flight).
    if (this.dash || this.leap
      || (this.push && Math.hypot(this.push.vx, this.push.vy) > 40)) {
      this.idleFor = 0;
    } else {
      this.idleFor += dt;
    }

    // Regeneration (mana caps at what reservations leave available).
    // lifeRegenToEs diverts a fraction of life regen into the energy
    // shield — flat regen that ignores the recharge delay entirely.
    // A DOWNED co-op seat never self-heals (it stays at 0 until revived).
    if (!this.dead && !this.downed) {
      const maxLife = this.maxLife();
      const maxMana = this.availableMaxMana();
      // Flat regen plus a fraction of the MAX pool (percent-regen passives).
      const regen = this.sheet.get('lifeRegen') + this.sheet.get('lifeRegenPct') * maxLife;
      let manaRegen = this.sheet.get('manaRegen') + this.sheet.get('manaRegenPct') * maxMana;
      // THE LEDGER, mana lane (Reclamation): a slice of regeneration is
      // SUPPRESSED and banks on the toggle's account instead of flowing —
      // the vent pays it back (see World.updateLedgers for the settle).
      if (manaRegen > 0) {
        for (const aura of this.activeAuras.values()) {
          const dv = aura.inst.def.delivery;
          const led = dv.type === 'aura' ? dv.ledger : undefined;
          if (!led || led.source !== 'manaRegen' || !aura.ledger) continue;
          const skim = manaRegen * Math.min(1, led.rate);
          const room = this.ledgerCap(led) - aura.ledger.balance;
          const banked = Math.max(0, Math.min(skim * dt, room));
          aura.ledger.balance += banked;
          manaRegen -= skim;
        }
      }
      const toEs = Math.min(1, Math.max(0, this.sheet.get('lifeRegenToEs')));
      // Life fills only to the CEILING (overdrive debt borrows from the
      // top) — and regeneration is HEALING: seared wounds slow it too.
      this.healBy(regen * (1 - toEs) * dt);
      this.mana = Math.min(maxMana, this.mana + manaRegen * dt);

      // OVERDRIVE repayment: each lane melts its debt once the breather
      // (idleDelay since the last OVERDRAFT) has passed — or early, at the
      // overdriveFlow fraction (Controlled Burn's always-trickle).
      for (const lane of ['mana', 'life'] as const) {
        const od = this.overdrive[lane];
        if (!od) continue;
        od.idle -= dt;
        if (od.debt <= 0) continue;
        const tags = skillContextTags(od.inst.def);
        const extra = instanceMods(od.inst);
        const spec = od.inst.def.delivery.type === 'aura'
          ? od.inst.def.delivery.overdrive : undefined;
        const flowing = od.idle <= 0 ? 1 : this.sheet.get('overdriveFlow', tags, extra);
        if (flowing <= 0) continue;
        const rate = lane === 'mana'
          ? od.debt * this.sheet.get('overdriveRecovery', tags, extra, spec?.recoveryPct ?? 0.15)
            + this.sheet.get('overdriveRecoveryFlat', tags, extra, spec?.recoveryFlat ?? 2)
          : regen * this.sheet.get('overdriveLifeFactor', tags, extra, spec?.regenFactor ?? 0.75)
            * this.sheet.get('attackSpeed')
            // Repayment-% modifiers (Controlled Burn's −25% MORE) tax the
            // life lane too — queried at base 1 so only the mods bite.
            * this.sheet.get('overdriveRecovery', tags, extra, 1);
        const repaid = Math.min(od.debt, rate * flowing * dt);
        od.debt -= repaid;
        if (lane === 'mana') this.reservedMana = Math.max(0, this.reservedMana - repaid);
        else this.reservedLife = Math.max(0, this.reservedLife - repaid);
      }

      const maxEs = this.maxEs();
      if (maxEs > 0) {
        if (toEs > 0) this.es = Math.min(maxEs, this.es + regen * toEs * dt);
        // The delay-gated recharge: fast, but any damage resets the gate.
        if (this.esDelay > 0) this.esDelay -= dt;
        else if (this.es < maxEs) {
          this.es = Math.min(maxEs, this.es + maxEs * this.sheet.get('esRechargeRate') * dt);
        }
      } else if (this.es > 0) {
        this.es = 0; // the granting buff expired
      }
      if (this.es > maxEs) this.es = maxEs;

      // POISE recovery: delay-gated like the energy shield — a fraction of
      // max per second once the drains stop. A broken bar RE-ARMS when the
      // pool climbs back past the re-arm line (DEFENSE_CFG.poise.rearmFrac).
      const maxPoise = this.maxPoise();
      if (maxPoise > 0) {
        if (this.poiseDelay > 0) this.poiseDelay -= dt;
        else if (this.poise < maxPoise) {
          this.poise = Math.min(maxPoise,
            this.poise + maxPoise * this.sheet.get('poiseRegenPct') * dt);
        }
        if (this.poiseBroken && this.poise >= maxPoise * DEFENSE_CFG.poise.rearmFrac) {
          this.poiseBroken = false;
        }
        if (this.poise > maxPoise) this.poise = maxPoise;
      } else if (this.poise > 0 || this.poiseBroken) {
        this.poise = 0;
        this.poiseBroken = false;
      }

      // INSIGHT refills with MOTION only: the regen rides the same momentum
      // taper as the reduction, so a sprint refills briskly, the lingering
      // window trickles, and a statue reads nothing.
      const maxInsight = this.maxInsight();
      if (maxInsight > 0) {
        const momentum = this.insightMomentum();
        if (momentum > 0 && this.insight < maxInsight) {
          this.insight = Math.min(maxInsight,
            this.insight + maxInsight * this.sheet.get('insightRegenPct') * momentum * dt);
        }
        if (this.insight > maxInsight) this.insight = maxInsight;
      } else if (this.insight > 0) {
        this.insight = 0;
      }

      // ENDURANCE trickles back after its delay — deliberately lean; the
      // fortify effects are the real refill (gainEndurance).
      const maxEnd = this.maxEndurance();
      if (maxEnd > 0) {
        if (this.enduranceDelay > 0) this.enduranceDelay -= dt;
        else if (this.endurance < maxEnd) {
          this.endurance = Math.min(maxEnd,
            this.endurance + maxEnd * this.sheet.get('enduranceRegenPct') * dt);
        }
        if (this.endurance > maxEnd) this.endurance = maxEnd;
      } else if (this.endurance > 0) {
        this.endurance = 0;
      }
    }
    return dot;
  }

  // -------------------------------------------------------- use-charges ---

  /** The live use-charge bank for a skill (seeded FULL on first touch —
   *  a fresh bar starts loaded). */
  skillChargeBank(inst: SkillInstance): { count: number; timer: number } {
    let st = this.skillChargeState.get(inst.def.id);
    if (!st) {
      st = { count: this.skillChargeCap(inst), timer: 0 };
      this.skillChargeState.set(inst.def.id, st);
    }
    return st;
  }

  /** Effective use-charge maximum: spec max + the skillCharges stat
   *  (queried with the skill's tags — "+1 melee skill charge" is a filter). */
  skillChargeCap(inst: SkillInstance): number {
    const uc = inst.def.useCharges;
    if (!uc) return 0;
    return Math.max(1, Math.round(uc.max + this.sheet.get('skillCharges',
      skillContextTags(inst.def), instanceMods(inst))));
  }

  /** Spend one use-charge (the press's pacing cost — see useSkill). */
  spendSkillCharge(inst: SkillInstance): void {
    const st = this.skillChargeBank(inst);
    st.count = Math.max(0, st.count - 1);
  }

  /** Attack or cast speed factor for a skill (by tag), with skill-local mods. */
  speedFactor(inst: SkillInstance): number {
    const tags = skillContextTags(inst.def);
    const extra = instanceMods(inst);
    return tags.has('attack') ? this.sheet.get('attackSpeed', tags, extra)
      : this.sheet.get('castSpeed', tags, extra);
  }

  /** Cast time of a skill after attack/cast speed. 0 = instant. */
  skillUseTime(inst: SkillInstance): number {
    return inst.def.useTime / this.speedFactor(inst);
  }

  /**
   * Actual cost after supports, cost modifiers, and resource conversion.
   * costToLife moves the mana portion onto life; costToMana the reverse.
   */
  skillCost(inst: SkillInstance): { mana: number; life: number } {
    const tags = skillContextTags(inst.def);
    const extra = instanceMods(inst);
    // Flat adders (Mana Feeder's teeth on cheap skills) and pool-scaled
    // costs (Archmage: ceil(pct × max)) join the BASE, so the multiplier
    // and lane conversion below apply to everything uniformly.
    const cs = inst.def.costScaling;
    const baseMana = inst.def.manaCost
      + this.sheet.get('addedManaCost', tags, extra)
      + (cs?.manaPctMax ? this.maxMana() * cs.manaPctMax : 0);
    const baseLife = (inst.def.lifeCost ?? 0)
      + this.sheet.get('addedLifeCost', tags, extra)
      + (cs?.lifePctMax ? this.maxLife() * cs.lifePctMax : 0)
      // The marrow price (Bonespray): a cut of CURRENT life — cheap when
      // bleeding out, dear at full blood (floored so it always costs).
      + (cs?.lifePctCur ? Math.max(1, this.life * cs.lifePctCur) : 0);
    if (baseMana <= 0 && baseLife <= 0) return { mana: 0, life: 0 };
    const mult = this.sheet.get('manaCost', tags, extra);
    const toLife = this.sheet.get('costToLife', tags, extra);
    const toMana = this.sheet.get('costToMana', tags, extra);
    const mana = baseMana * mult * (1 - toLife) + baseLife * mult * toMana;
    const life = baseLife * mult * (1 - toMana) + baseMana * mult * toLife;
    return {
      mana: mana > 0 ? Math.ceil(mana) : 0,
      life: life > 0 ? Math.ceil(life) : 0,
    };
  }

  /** Max mana actually available after persistent-minion reservations. */
  availableMaxMana(): number {
    return Math.max(0, this.maxMana() - this.reservedMana);
  }

  /** Max life after overdrive debt borrows the top of the pool. */
  lifeCeiling(): number {
    return Math.max(1, this.maxLife() - this.reservedLife);
  }

  /** How much MORE a lane may overdraft right now (0 = no overdrive/full). */
  private overdraftHeadroom(lane: 'mana' | 'life'): number {
    const od = this.overdrive[lane];
    if (!od) return 0;
    const d = od.inst.def.delivery;
    const spec = d.type === 'aura' ? d.overdrive : undefined;
    if (!spec) return 0;
    const tags = skillContextTags(od.inst.def);
    const extra = instanceMods(od.inst);
    const cap = this.sheet.get('overdriveCap', tags, extra, spec.cap)
      * (lane === 'mana' ? this.maxMana() : this.maxLife());
    const room = cap - od.debt;
    // Never over-reserve the pool (contracts/auras share reservedMana).
    return lane === 'mana'
      ? Math.max(0, Math.min(room, this.maxMana() - this.reservedMana))
      : Math.max(0, room);
  }

  /** Can the cost be paid — counting the esToMana FRACTION of the energy
   *  shield as a battery, and OVERDRIVE debt headroom when a lane's toggle
   *  is running? */
  canAfford(cost: { mana: number; life: number }): boolean {
    const esMana = this.es * this.sheet.get('esToMana');
    const manaOk = this.mana + esMana >= cost.mana
      || cost.mana - (this.mana + esMana) <= this.overdraftHeadroom('mana');
    const lifeOk = this.life > cost.life
      || cost.life <= this.overdraftHeadroom('life');
    return manaOk && lifeOk;
  }

  /** Pay a cost: mana first, then energy shield (Thought Siphon — only the
   *  esToMana FRACTION of the pool is usable), then life — and, under
   *  OVERDRIVE, any shortfall books as DEBT (reservation). */
  payCost(cost: { mana: number; life: number }): void {
    let due = cost.mana;
    const fromMana = Math.min(this.mana, due);
    this.mana -= fromMana;
    due -= fromMana;
    if (due > 0) {
      const usable = this.es * this.sheet.get('esToMana');
      const fromEs = Math.min(usable, due);
      if (fromEs > 0) {
        this.es -= fromEs;
        due -= fromEs;
      }
    }
    if (due > 0) {
      const od = this.overdrive.mana;
      if (od) {
        const booked = Math.min(due, this.overdraftHeadroom('mana'));
        od.debt += booked;
        this.reservedMana += booked;
        this.mana = Math.min(this.mana, this.availableMaxMana());
        od.idle = this.overdriveIdleDelay(od);
      }
    }
    // Life: pay in blood when you can; when you can't, the WHOLE cost
    // borrows the ceiling (readable, and it can never kill you).
    if (cost.life > 0) {
      const odL = this.overdrive.life;
      if (odL && this.life <= cost.life) {
        const booked = Math.min(cost.life, this.overdraftHeadroom('life'));
        odL.debt += booked;
        this.reservedLife += booked;
        this.life = Math.min(this.life, this.lifeCeiling());
        odL.idle = this.overdriveIdleDelay(odL);
      } else {
        this.life -= cost.life;
      }
    }
  }

  /** The lane's repayment delay (spec base, investable). */
  private overdriveIdleDelay(od: OverdriveState): number {
    const d = od.inst.def.delivery;
    const spec = d.type === 'aura' ? d.overdrive : undefined;
    return this.sheet.get('overdriveIdleDelay',
      skillContextTags(od.inst.def), instanceMods(od.inst), spec?.idleDelay ?? 2.5);
  }

  /** A ledger's balance ceiling — flat plus pool-contingent fractions. */
  ledgerCap(spec: LedgerSpec): number {
    if (!spec.cap) return Infinity;
    return (spec.cap.flat ?? 0)
      + (spec.cap.maxLifePct ?? 0) * this.maxLife()
      + (spec.cap.maxManaPct ?? 0) * this.maxMana();
  }

  /** Are every gate's thresholds met (SkillDef.gate + socketed levies)?
   *  All actor-local, so the HUD, the AI, and the press agree. */
  gatesMet(inst: SkillInstance): boolean {
    for (const g of instanceGates(inst)) {
      if (g.charge && (this.charges.get(g.charge.id) ?? 0) < g.charge.amount) return false;
      if (g.buff && !this.buffs.has(g.buff)) return false;
      if (g.resource) {
        const cur = g.resource.kind === 'mana' ? this.mana
          : g.resource.kind === 'life' ? this.life
          : g.resource.kind === 'es' ? this.es : this.ward;
        if (cur < g.resource.amount) return false;
      }
      if (g.guard && this.casting?.mode !== 'guard') return false;
      if (g.active && !this.activeAuras.has(g.active) && !this.summonToggles.has(g.active)) return false;
    }
    return true;
  }

  /** SELECTIVE CC (StatusDef.forbidsTags): any carried status that forbids
   *  one of the skill's tags locks it — Silenced spells, Disarmed attacks,
   *  Rooted movement. One gate for player, monster, and minion alike. */
  private tagsForbidden(inst: SkillInstance): boolean {
    for (const s of this.statuses) {
      const forbids = STATUS_DEFS[s.id]?.forbidsTags;
      if (!forbids) continue;
      for (const t of forbids) if (inst.def.tags.includes(t)) return true;
    }
    return false;
  }

  canUse(inst: SkillInstance): boolean {
    if (this.tagsForbidden(inst)) return false;
    // HOLD COMBOS: a held cast (guard / channel / charge / overcharge) is
    // not "busy" for everything —
    //  - a usableWhileGuarding skill fires around the hold (Transgression,
    //    Bastion Thrust; requiresGuard still demands the guard where declared);
    //  - the HELD skill's OWN meta payload fires through it (Phalanx while
    //    Shield Up: hostSkillId names the hold that spawned the button).
    // Instant payloads only — a cast bar would clobber the running hold.
    const heldMode = !!this.casting
      && ['guard', 'channel', 'charge', 'overcharge'].includes(this.casting.mode);
    const holdCombo = heldMode
      && this.skillUseTime(inst) <= 0.001
      && (!!inst.def.usableWhileGuarding
        || (inst.hostSkillId !== undefined
          && this.casting!.inst.def.id === inst.hostSkillId));
    if (holdCombo) {
      if (this.dead || this.useLock > 0 || this.isStunned()) return false;
    } else if (!this.canAct()) return false;
    if (this.cooldowns.has(inst.def.id)) return false;
    // Guard-locked skills (Transgression) demand a raised stance.
    if (inst.def.requiresGuard && this.casting?.mode !== 'guard') return false;
    // Toggling an active aura OFF must always be possible, even at 0 mana —
    // EXCEPT an overdrive toggle with debt outstanding: the mortgage LOCKS
    // until the pool is repaid ("I need this NOW" has a bill).
    const d0 = inst.def.delivery;
    if (d0.type === 'aura' && d0.mode === 'toggle' && this.activeAuras.has(inst.def.id)) {
      if (d0.overdrive && (this.overdrive[d0.overdrive.lane]?.debt ?? 0) > 0) return false;
      // Life-locked toggles (Berserk) hold fast while the host is healthy.
      if (d0.lockAboveLife !== undefined
        && this.life > d0.lockAboveLife * this.maxLife()) return false;
      return true;
    }
    // Same rule for toggled summon contracts — dismissal FREES mana, so a
    // reservation squeeze must never softlock the off-switch.
    if (d0.type === 'summon' && d0.persistent?.toggle && this.summonToggles.has(inst.def.id)) {
      return true;
    }
    // USE-CHARGES: an empty bank is the dry spell (recovery ticks it back).
    if (inst.def.useCharges && this.skillChargeBank(inst).count <= 0) return false;
    // INVOCATION: nothing woven, nothing to release.
    if (inst.def.invokes && this.runes.length === 0) return false;
    const cost = this.skillCost(inst);
    if (!this.canAfford(cost)) return false;
    // PREREQUISITE GATES (SkillDef.gate + every socketed levy): unmet =
    // "not ready" — the bar greys, the press refuses.
    if (!this.gatesMet(inst)) return false;
    // Combo resources: consuming skills need their charges banked — unless
    // the cost is OPTIONAL (Reckoning swings bare-handed, scaled by zero).
    // `minimum` also gates numeric costs, so a skill can DEMAND a bank it
    // doesn't consume (Bloodlust unleashes at 5+, spends none — the drain
    // effect burns them instead). A socketed SPENDER graft (Ravening /
    // Embargo) supplies the economy when the skill has none of its own.
    const cc = instanceChargeCost(inst);
    if (cc && !cc.optional) {
      const have = this.charges.get(cc.charge) ?? 0;
      const need = cc.amount === 'all'
        ? (cc.minimum ?? 1)
        : Math.max(cc.amount, cc.minimum ?? 0);
      if (have < need) return false;
    }
    // Pool skills gate on their bank (toggling a live vent OFF is always
    // allowed — you can stop leaking whenever).
    const pl = inst.def.pool;
    if (pl && !this.venting.has(pl.id) && (this.pools.get(pl.id) ?? 0) < (pl.min ?? 1)) {
      return false;
    }
    // Persistent summons must also be able to afford their reservation,
    // unless casting will evict an existing contract anyway. Toggled
    // contracts price the WHOLE slot block (reserve × effective maxActive).
    const d = inst.def.delivery;
    if (d.type === 'summon' && d.persistent) {
      const tags2 = skillContextTags(inst.def);
      const extra2 = instanceMods(inst);
      const slots = d.persistent.toggle
        ? Math.max(1, Math.round(this.sheet.get('minionMaxCount', tags2, extra2, d.maxActive)))
        : 1;
      const reserve = d.persistent.reserve * slots
        * this.sheet.get('manaCost', tags2, extra2);
      // A one-press pool swap DISMISSES rival same-poolGroup contracts —
      // count their reservation as freed, or the swap greys out forever.
      let freed = 0;
      if (d.persistent.toggle && d.poolGroup) {
        for (const t of this.summonToggles.values()) {
          const td = t.inst.def.delivery;
          if (td.type === 'summon' && td.poolGroup === d.poolGroup) freed += t.reserved;
        }
      }
      if (this.reservedMana - freed + reserve > this.maxMana() && this.manaReserved === 0) {
        // (Eviction-funded recasts are resolved in spawnMinion.)
        return false;
      }
    }
    return true;
  }
}
