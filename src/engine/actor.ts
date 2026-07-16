// ---------------------------------------------------------------------------
// Actor — the ONE entity model shared by the player, monsters, and minions.
// All of them carry a StatSheet, a skill bar, cooldowns, buffs and statuses,
// and act through the same skill pipeline. The only differences are who
// controls them (input vs AI) and which team they fight for.
// ---------------------------------------------------------------------------

import { chance, vec, type Vec2 } from '../core/math';
import {
  FULL_ES_FRAC, FULL_LIFE_FRAC, FULL_MANA_FRAC,
  LOW_ES_FRAC, LOW_MANA_FRAC, StatSheet, attributeModifiers,
  type Attributes, type ConditionId, type DamageType, type Modifier, type SkillTag,
} from './stats';
import { DEFENSE_CFG } from './defense';
import {
  hostSockets, instanceMods, skillContextTags, instanceGates, instanceChargeCost, instanceChargeGain,
  instanceUseCharges, socketSpec, instanceSelfStack, instanceConduits, CONDUIT_CFG, REFLEX_CFG,
  type SkillInstance, type BuffEffect, type CastMode, type ConstructKind, type AuraSpec,
  type EchoRiderSpec, type LedgerSpec, type ChannelSpec, type BrimSpec, type ConduitSpec,
  type ConduitPool, type GateSpec,
} from './skills';
import { evalCurve, type CurveKind } from './curves';
import { CHARGE_DEFS } from './charges';
import type { MonsterRarity } from './rarity';
import type { ItemInstance } from './items';
import type { DeathBurstDef } from '../data/monsters';
import type { PartSpec } from '../render/vis/parts';

/** One entry of Actor.gainEvents — a gain that landed this frame. The proc
 *  triggers read kind/id/depth; the SYMPATHY FABRIC reads the payload tail
 *  to replay the gain on kin (docs/engine/sympathy.md). */
export interface GainEvent {
  kind: 'charge' | 'buff' | 'orb' | 'restore' | 'heal';
  /** charge id / buff id / orb kind / restored resource / 'life' for heals. */
  id: string;
  depth: number;
  /** Amount payload: charges actually banked, restore-stream total, heal
   *  landed, orb amount poured. */
  n?: number;
  /** 'buff': the applied effect, so an echo can wear the same one. */
  buff?: BuffEffect;
  /** 'restore': the pour window in seconds (echoes pour over the same). */
  dur?: number;
  /** Tags of the source skill, when one drove the gain (flask filters). */
  tags?: SkillTag[];
}

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
  /** GuardSpec.pulse clock — seconds until the held stance next tolls its
   *  component skill (Defiant Bulwark's rolling challenge). */
  guardPulseT?: number;
  // charge state — uses elapsed/total as the charge fraction
  // perfect / timed / multitude state
  empowered?: number;
  indicatorAt?: number;
  pressUsed?: boolean;
  presses?: number;
  /** AI: how long a monster holds a channel/charge before letting go. */
  aiHold?: number;
  /** AI: seconds this channel's firing line has been WALLED (occlusion) —
   *  past LOS_CFG.channelGrace the grip releases and the caster repositions
   *  instead of gnawing stone. */
  losLost?: number;
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
  /** CAST-WHILE-HOLDING metronome: counts down to the next channelBeat /
   *  guardBeat trigger event while the stance is held (TRIGGER_CFG
   *  .channelInterval / .guardInterval — one field serves both: a single
   *  casting state never runs two stances). */
  trigBeat?: number;
  /** RITUAL GROUND: this cast bar PLANTS a channeler construct at the aim
   *  instead of resolving the skill (the channel-to-cast conversion). */
  plantChannel?: boolean;
  // concentration state (the precision cast — ConcentrationSpec)
  /** The QUARRY the bar is focused on: the actor resolved at press. */
  quarryId?: number;
  /** True on frames where focus is broken (cursor off the quarry) — the
   *  renderer's "refocus!" cue; 'drain' policy bleeds while it holds. */
  focusBroken?: boolean;
  /** THE AMALGAM: minions consumed so far by this held channel. */
  amalgamFed?: number;
  /** CAPPED CHANNEL / BRIM: the hold reached TRUE COMPLETION this cast —
   *  maxHold's ceiling or a filled brim (release.requireFull reads it). */
  hitCap?: boolean;
  /** The 'channelFinish' trigger already rolled this cast (once per
   *  unbroken channel, however the completion arrived). */
  finishRolled?: boolean;
  /** GATHERED CASTING (SupportDef.gather): the SYNTHESIZED channel spec a
   *  converted bar-cast runs on — brim, release and beats alike. When set
   *  it is THE spec (updateCasting and the renderer read it over
   *  def.channel, which a converted cast doesn't have). */
  gather?: ChannelSpec;
}

/** One OVERDRIVE lane's ledger: the toggle instance that opened it, the
 *  outstanding debt (mirrored into reservedMana/reservedLife), and the
 *  idle countdown to the repayment window (refreshed by every overdraft). */
export interface OverdriveState {
  inst: SkillInstance;
  debt: number;
  idle: number;
}

/** The BREATHING shell's live arc factor (shellGuard.breathe): coverage
 *  swells and wanes on its period — minFrac at the trough (the opening
 *  you TIME your blows into), full at the crest. Directional shells only
 *  ('all' shells ignore it — no arc to breathe). ONE helper shared by the
 *  block test and the renderer's glyph, so what you read is what blocks. */
export function shellArcFactor(
  sg: { breathe?: { period: number; minFrac?: number; curve?: CurveKind } },
  time: number,
): number {
  const b = sg.breathe;
  if (!b) return 1;
  const period = Math.max(0.5, b.period);
  const t = (time % period) / period;
  const min = b.minFrac ?? 0.35;
  return min + (1 - min) * evalCurve(b.curve ?? 'breath', t);
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
  /** BREAKABLE BY DESIGN (ConstructDelivery.breakable / the Load-Bearing
   *  Flaw graft, stamped at spawn): the OWNER's hits demolish this object
   *  at ownerMult × damage (affinity tags harder still). */
  breakable?: { ownerMult: number; affinityTags?: SkillTag[]; affinityMult?: number };
  /** DEATH BURST (ConstructDelivery.deathBurst): the object detonates
   *  however it ends — fired once through the kill artery. */
  deathBurst?: { radius: number; damageScale?: number; fraction?: number; damageType?: DamageType };
  burstFired?: boolean;
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
  /** Fractional charge-upkeep owed (AuraDelivery.upkeep.charges) — paid
   *  in whole charges when it crosses 1. */
  chargeAcc?: number;
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
export type UnitKind = 'player' | 'minion' | 'mercenary' | 'monster' | 'companion';

/** Body silhouettes — the shape IS the enemy-type language. */
export type ActorShape =
  | 'circle' | 'diamond' | 'triangle' | 'square'
  | 'pentagon' | 'hexagon' | 'octagon' | 'star' | 'cross'
  | 'trapezoid' | 'rhombus' | 'oval' | 'kite' | 'rectangle'
  | 'ribcage';

/** Silhouette accents layered ON TOP of the body shape — goblin ears,
 *  orc horns, briar spikes, demon wings. Readable at a glance, like the shapes. */
export type ActorAdorn = 'ears' | 'horns' | 'spikes' | 'wings' | 'tentacles';

/** One hitbox of a COMPOSITE MONSTER (MonsterDef.parts): its own monster def
 *  (body, life, skills, look) anchored in the root's facing frame. Breaking
 *  it wounds/weakens the root — plural hitboxes, one creature. Offsets are
 *  in ROOT RADII (+x = ahead of the root), so one part list scales with any
 *  body size. */
export interface MonsterPartDef {
  /** The part's own monster def id — parts are full actors (skills, brains,
   *  statuses all work), so a claw can swing and a head can spit. */
  monster: string;
  /** Anchor offset in root radii, in the root's facing frame. */
  dx: number;
  dy: number;
  /** Facing offset for INERT parts (a tail points backward); parts with
   *  skills aim freely once aggroed. */
  rot?: number;
  /** Part life pool = frac × the ROOT's max life (omit: the part def's own). */
  lifeFrac?: number;
  /** Fraction of the root's max life dealt to it when this part breaks. */
  breakDamage?: number;
  /** Mods layered onto the root while this part is broken (armor torn…). */
  breakMods?: Modifier[];
  /** Root skill ids removed once this part is broken (disarm the sweep). */
  breakDisables?: string[];
}

// The AI vocabulary (BrainDef, archetypes, phases, rules, scripts, actions)
// lives in brain.ts — re-exported here so the bestiary and the world keep
// their historical import path.
export type { BrainDef, BrainType, BrainPhase, BrainImpulse, PostSpec } from './brain';
import type { BrainDef, BrainType, BrainTuning, CommandState, PostSpec } from './brain';

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
  /** Surface material (render/vis/materials.ts registry key) — shapes the
   *  shading ramp/texture the renderer bakes. Omitted = the flesh default. */
  material?: string;
  /** Part-grammar portrait (data/looks.ts registry key) — the composed
   *  top-down body (skull + ribs + scythe…). Omitted = legacy shape body. */
  look?: string;
  /** RUNTIME TACK: extra look parts worn OVER the body/look — the tamed
   *  collar (TAME_CFG.claimParts), future brands and harnesses. Pure data:
   *  ANY system may stamp it; the renderer bakes it into the body sprite
   *  (part of the bake key) and co-op replicates it (snapshot `ep`). Draws
   *  on part-grammar and legacy bodies alike. */
  extraParts?: PartSpec[];

  sheet = new StatSheet();
  level = 1;

  /** The AI archetype driving this actor (from its monster definition). */
  brain?: BrainDef;
  /** Worm/snake bodies: trailing segments updated by the world. */
  worm?: WormBody;
  /** MULTI-PART MONSTERS — this actor IS a part, rigidly anchored to its
   *  root's facing frame. Its own life/skills/statuses work normally; its
   *  death fires the part-break effects on the root instead of the loot
   *  ladder (see World.updateParts / onPartBroken). */
  partLink?: { root: Actor; def: MonsterPartDef };
  /** The live part actors attached to this root (composite monsters). */
  partActors?: Actor[];
  /** Lazy-spawn latch: parts attach on the root's first update tick, so
   *  every spawn path (packs, events, zone-memory restore) grows them. */
  partsSpawned?: boolean;
  /** Creep-heart latch (MonsterDef.creepSource): the membrane plants on the
   *  first update tick — after every spawn path has settled the body's true
   *  position — and the planted source is bound to this life. */
  creepPlanted?: boolean;
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
  /** THE TUNING GRAFT: a per-BODY brain layer stamped by the world's hand —
   *  an extraction swarm fixating on the seep, a leashed expedition, a skill
   *  that rewrites one monster's priorities. Merged LAST in resolveMachines
   *  (over base/cycle/phases/rules/impulses), so the graft outranks the
   *  body's own machines while it stands. Clear it and the native brain
   *  resumes untouched. Null-cost when absent. */
  aiTuning?: BrainTuning;
  /** The locked target's actor id (stickiness + engagement freshness). */
  aiTargetId?: number;
  /** Where the locked target was last seen (perception-memory investigation). */
  aiLastSeen?: Vec2;
  /** World time the locked target was last actually SEEN (line of sight) —
   *  a held lock survives blindness for the chase-memory window (the hunter
   *  rounds the corner after you), then the thread snaps. */
  aiLosSeenAt = 0;
  /** MoveSpec.pathing, stamped per AI tick — moveToward reads it. 'none' =
   *  straight-line steer (mindless things pile at walls, an authored trait);
   *  absent/'route' = follow the zone's walkable flow-field. */
  aiPathing?: 'none' | 'route';
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
  /** ENGAGEMENT RING (BehaviorSpec.encircle): the victim whose ring slot
   *  this actor holds + the last re-assert (same prune contract as tokens). */
  aiRingTarget?: number;
  aiRingAt = 0;
  /** REACTION (BehaviorSpec.reaction): casts hold until this world time —
   *  rolled once per FRESH engagement; the feet never wait, only the blade. */
  aiReactAt = 0;
  /** ELBOW ROOM (BehaviorSpec.spacing): this tick's kin-repulsion radius,
   *  stamped by updateAI while closing on a target (undefined = none). */
  aiSpacing?: number;
  /** READING THE CAST (BehaviorSpec.dodge): the telegraph currently being
   *  tracked (zone / casting-state identity — the read rolls ONCE per
   *  telegraph), whether the read succeeded, when the feet may move, and
   *  the dive in progress (exit point + expiry). */
  aiDodgeRef?: object;
  aiDodgeRead = false;
  aiDodgeAt = 0;
  aiDodgeExit?: Vec2;
  aiDodgeUntil = 0;
  /** THE FEINT (BehaviorSpec.feint): world time the bluffed bar drops
   *  (0 = no feint in flight). */
  aiFeintAt = 0;
  /** THE WANTS (BrainDef.drives): named slow meters, 0..1 — seeded on the
   *  first AI tick, drifted per tick, jumped by World.bumpDrives events. */
  drives = new Map<string, number>();
  /** THE SACK (MonsterDef.looter): actual snatched drop payloads. A solid
   *  blow shakes one loose; death spills all — never lost, only chased. */
  lootSack?: import('./world').DropItem[];
  /** Last shakedown spill (its 0.4s icd). */
  lastSpillAt = -999;
  /** THE PURSE (MonsterDef.essenceSpill): landed damage banked toward the
   *  next shed packet, packets shed so far (against the body's fixed
   *  budget), and the last shed's throttle stamp. */
  spillBank = 0;
  essenceSpilled = 0;
  lastEssenceSpillAt = -999;
  /** This tick's RESOLVED prey list (rules can gate predation — the hungry
   *  wolf hunts, the sated one ambles past). World.isPrey reads the stamp,
   *  falling back to the brain's base when no AI tick has stamped one. */
  aiPrey?: string[];
  /** POST-CAST PLANT (BehaviorSpec.plantChance): feet frozen until this
   *  world time — the hands stay free (runKernel zeroes movement dt). */
  aiPlantUntil = 0;
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
  /** THE UNWATCHED ADVANCE (BehaviorSpec.stalk, stamped per combat tick):
   *  closing-step multiplier while the quarry's gaze holds this body
   *  (0 = a statue); undefined = unwatched or no stalk in the mind. */
  aiStalkCreep?: number;
  /** CARRION FEEDING (MonsterDef.carrion): seconds spent eating the current
   *  corpse — the meal completes (and the corpse vanishes) at the spec's
   *  time. Reset whenever the feeder moves off or is interrupted. */
  carrionEatT = 0;
  /** Carrion STALL GUARD: last measured distance-to-meal + seconds spent
   *  making no progress toward it (a corpse across water would otherwise
   *  wedge the feeder into walking-in-place forever), and the snub clock —
   *  while world.time < snubUntil the larder is ignored and ordinary idle
   *  life resumes. */
  carrionStallD = Infinity;
  carrionStallT = 0;
  carrionSnubUntil = 0;
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
  /** GAIN EVENTS (the chargeGain/buffGain/orbPickup proc triggers AND the
   *  sympathy fabric's spine): every charge, buff, orb, restore stream, or
   *  direct heal actually gained this frame, with its CHAIN DEPTH — 0 for
   *  gains from real play, +1 per proc-payload/sympathy-echo link, so
   *  Frenzy→Rage→Bloodlust chains are governed by the same procDepth/
   *  falloff rules as hit chains and a loop back into Frenzy dies at the
   *  lid. Swept by the world each frame (the expiredStatuses pattern);
   *  capped so nothing can flood it. Payload fields carry what an echo
   *  needs to REPLAY the gain (docs/engine/sympathy.md). */
  gainEvents: GainEvent[] = [];
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
  /** TOGGLED STROBE STANCES by skill id (GroundDelivery.strobe): the
   *  stance re-casts its placement on a world-driven beat while it burns;
   *  `reserved` max mana is locked out, refunded on release or death. */
  strobes = new Map<string, { inst: SkillInstance; timer: number; reserved: number }>();
  /** DRAWN HEXES by skill id (SupportDef.curseOnHit — Hexbrand): while a
   *  curse is drawn, the owner's top-level hits deliver it; `reserved`
   *  max mana is locked out, refunded on sheathing or death. */
  hexToggles = new Map<string, { inst: SkillInstance; reserved: number }>();
  /** TRIGGER GEM round-robin cursors by TriggerKind: the hotbar slot the
   *  LAST event fired, so the next event takes the next armed gem in slot
   *  order — one cast per event, taken in turn (trigger golden rule 1). */
  triggerRR = new Map<string, number>();
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
  /** Seconds since last TAKING damage (GateSpec.recentDamage — the
   *  counter-blow's license; zeroed at both damage seams). */
  recentHurt = 999;
  /** Idle wander heading — the world doesn't stand at attention. */
  wanderDir?: number;
  /** Patrol route (world points) marched between when no foe is in sight. */
  patrolRoute?: Vec2[];
  patrolIdx?: number;
  /** Actor id of the patrol leader a follower heels to. */
  patrolFollow?: number;
  /** DUTY POST conduct (brain.ts PostSpec): stamped from MonsterDef.post at
   *  creation or by a spawner (a holdfast's gate crew). The post itself is
   *  aiPost when a spawner wrote one, else the first-tick aiAnchor. */
  postSpec?: PostSpec;
  /** A spawner's site-exact post (wins over the aiAnchor default). */
  aiPost?: Vec2;
  /** The watch bearing re-worn on re-planting (stamped on the first AI tick
   *  from the placed facing, or site-exact by a spawner). */
  aiPostFacing?: number;
  /** Walking home right now — the hysteresis latch between a post's slack
   *  (walk starts) and POST_CFG.arrive (walk ends). */
  postHoming = false;
  /** Event/role marker: 'patrol' | 'caravan' | 'ambush' | 'siege_atk' | 'siege_def' | 'warlord'. */
  tag?: string;
  /** The event INSTANCE this actor belongs to (a writ id, a rift id, …) — the
   *  generic key a tag-matched kill row resolves back to its event with, so
   *  per-instance events never lean on zone identity to find their kill. */
  eventKey?: string;
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
  /** NEMESIS (meta/nemesis.ts): set on a MANIFESTED remembered foe — the saga
   *  it haunts + its record id (fate resolution on kill) + rank tint (the
   *  renderer's ring and title label). */
  nemesis?: { sagaKey: string; id: string; tint: string };
  /** The world noticed this foe trade blows with a named hero — the survivor
   *  trigger's eligibility stamp (transient; set by resolveHit both ways). */
  grudgeMark?: boolean;

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
  /** ACTS in a direction — the renderer's aim tick rides this. Furniture
   *  constructs (bone walls, embeds, armed mines: CONSTRUCT_KIND_AIMS) and
   *  aims:false monsters clear it — a frozen facing means nothing. */
  aims = true;
  /** Monster faction — cross-faction hostility ignites in war zones. */
  faction?: string;

  life: number;
  mana: number;

  /** Energy shield: soaked before mana shield and life. Recharges fast,
   *  but only after going untouched for esRechargeDelay seconds — and the
   *  recharge is a running STATE that damage interrupts (soakDamage
   *  restamps the delay unless esRechargeSteadfast holds). */
  es = 0;
  /** Seconds until the energy shield may begin recharging. */
  esDelay = 0;
  /** The recharge is actively FLOWING this frame (delay elapsed, pool
   *  below max) — read by soakDamage's steadfast gate, the 'esRecharging'
   *  condition, and the HUD. Maintained by updateTimers. */
  esRecharging = false;
  /** POISE — the break-bar (Fortitude's pool): ARMED, hits are reduced by
   *  poiseDR and hard CC is shrugged at poiseCcAvoid, and every hit drains
   *  the bar. At zero it BREAKS (benefits lost, `sundered` worn) and lies
   *  INERT — hits can neither drain it nor delay it — while it recovers,
   *  re-arming at the poiseRearmAt line. See DEFENSE_CFG.poise. */
  poise = 0;
  /** Seconds until a BROKEN bar begins its recovery climb — stamped once,
   *  at the break (never reset by further hits: recovery is a promise). */
  poiseDelay = 0;
  /** Broken (inert, recovering) until the pool climbs to the re-arm line. */
  poiseBroken = false;
  /** Seconds since the last poise drain — the calm gate: an ARMED, dented
   *  bar refills only once this passes the poiseCalmDelay stat. */
  poiseCalm = 0;
  /** INSIGHT — the momentum-fed avoidance pool (Charisma's lane): spent by
   *  incoming hits to slip the brunt, refilled only while MOVING. The live
   *  reduction is insightDR × insightMomentum() (the velocity taper). */
  insight = 0;
  /** WORN CONDUITS — actor-level resource pumps granted by ALLOCATIONS
   *  (PassiveChoiceOption.conduit; monster boons ride the same seam), not
   *  sockets: no gem slot spent, no skill binding. DERIVED state — the
   *  meta recalc rebuilds it, never saved. Ticked every frame at the tail
   *  of updateConduits; the pool adapters are the whole engagement gate
   *  (a guard endpoint reads 0/0 off-stance and idles; an always-valid
   *  pair genuinely runs always — that is what WORN means). */
  wornConduits?: ConduitSpec[];
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
  // DEFENSE-EVENT TRANSIENTS (the same expiredStatuses pattern, consumed
  // together by World.sweepDefenseEvents): set wherever the state machine
  // flips, harvested after damage resolutions AND once per frame — so
  // timer-driven flips (a re-arm, a recharge starting) fire their hooks
  // even when no wound is in flight.
  /** The poise bar BROKE (victim-side 'poiseBroken' procs + the fanfare). */
  poiseJustBroke = false;
  /** A broken bar climbed past the re-arm line ('poiseRearmed' procs). */
  poiseJustRearmed = false;
  /** Bracket rungs (fractions of max) the bar was drained THROUGH since
   *  the last sweep — each raises a 'poiseBracket' proc event. */
  poiseBracketHits: number[] = [];
  /** The ES recharge began flowing ('esRechargeStart' procs). */
  esRechargeJustStarted = false;
  /** The ES recharge (or a gain through gainEs) topped the pool off
   *  ('esFilled' procs — the crest-of-the-wave hook). */
  esJustFilled = false;
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
   *  the running recovery timer. Lazily seeded FULL on first query.
   *  `reloading` marks a magazine mid-cycle (the emptying press stamped
   *  the skill's cooldown) — expiry pours the refill and clears it. */
  skillChargeState = new Map<string, { count: number; timer: number; reloading?: boolean }>();
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
  /** Pacing between PIERCED reflex presses (REFLEX_CFG.lock) — the wrist's
   *  own beat, independent of useLock so a reflex never extends what the
   *  body is doing (and a held flask key drinks at a cadence, not 60/s). */
  reflexLock = 0;

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
  /** WANING PRESENCE (0..1): a generic render-only fade channel — the body
   *  pulses toward transparent as it rises (VIS_CFG.body.waneDepth/waneRate).
   *  The OWNING system re-stamps it every frame (the Haunting's dawn-wane);
   *  it never gates gameplay. */
  wane = 0;

  // Minion explosion payloads, baked from the owner's stats at summon time.
  // Values are the fraction of the minion's max life dealt as fire damage.
  explodeOnDeath = 0;
  explodeOnLowLife = 0;
  /** Telegraphed coalesce-burst config (from MonsterDef.deathBurst) — an enemy's death
   *  gathers into a spore/orb before detonating, so the player can escape. */
  deathBurst?: DeathBurstDef;
  /** BOLT-HOLE (MonsterDef.refuge): when routed, run FOR the nearest doodad of
   *  this kind and slip away on arrival (the frog's dive). */
  refuge?: { kind: string; seek?: number; text?: string };
  /** The rout's cached bolt-hole (found once — ponds don't move). */
  refugeGoal?: { x: number; y: number; r: number } | null;
  /** TERRAIN-BOUND spec (MonsterDef.habitat) — carried so any spawn path
   *  (packs, zone-memory restores, summons) can lazily derive `confine`
   *  from the nearest matching doodad. */
  habitat?: { kind: string; minRadius?: number; grace?: number };
  /** BODY WAKE spec (MonsterDef.wake): the body itself sheds its ground
   *  payload as it travels. */
  wake?: { skillId: string; everyDist: number; dmgMult?: number };
  /** GROUND IMMUNITY (MonsterDef.immuneGround): region kinds whose
   *  standDamage and heat wash this body ignores — the magma bestiary
   *  swims its own melt (habitat-matched bodies are exempt implicitly). */
  immuneGround?: string[];
  /** THE BRIM LEDGER (ChannelSpec.brim): per-skill persistent gauge fill.
   *  The live instance rides along so decay/payoff stat queries see
   *  socketed support mods, and the SPEC rides so converted gathers
   *  (SupportDef.gather — no def.channel to look up) decay correctly.
   *  Fed by held channels, drained by the decay sweep, spent by
   *  releases. Lazy — most bodies never brim. */
  brims?: Map<string, { fill: number; inst: SkillInstance; spec: BrimSpec }>;
  /** The wake's runtime ledger: travel accrued toward the next shed, last
   *  frame's position (the displacement source), and the payload instance
   *  minted lazily at first shed. */
  wakeOdo?: number;
  wakePrev?: Vec2;
  wakeInst?: SkillInstance;
  /** VOLATILE spec (MonsterDef.volatile): the struck body ANSWERS with a
   *  free-cast payload, ICD-throttled — the poked wasp nest. */
  volatile?: { skillId: string; chance: number; icd?: number; dmgMult?: number };
  /** The volatile answer's next-ready clock (world seconds). */
  volatileReadyAt = 0;
  /** CONTAGION release throttle (ContagionSpec): this body may host at
   *  most one release per CONTAGION_CFG.actorIcd, whatever the lineages. */
  contagionReadyAt = 0;
  /** The volatile payload instance, minted lazily at the first answer. */
  volatileInst?: SkillInstance;
  /** BODY ELEMENT RESPONSES (MonsterDef.onHitByType): what this body DOES
   *  when a landed hit carries a damage type — the reaction matrix worn as
   *  anatomy (wax runs from fire, sets brittle under cold; shadow lights up). */
  onHitByType?: Partial<Record<string, { status?: string; chance?: number; skillId?: string; dmgMult?: number }>>;
  /** Shared next-ready clock for the element responses (world seconds). */
  onHitTypeReadyAt = 0;
  /** Seconds between response firings (from the def; default 0.8). */
  onHitTypeIcd?: number;
  /** Response payload instances, minted lazily per skill id. */
  onHitTypeInsts?: Map<string, SkillInstance>;
  /** CARRIED GEAR (MonsterDef.carry — the Hollowborn): a REAL rolled item the
   *  body walked in wearing. The kill path drops exactly this piece INSTEAD
   *  of a table roll — the walking loot beacon's whole contract. */
  carriedGear?: ItemInstance;
  /** TERRAIN CONFINEMENT (derived from habitat): a disc this body can never
   *  leave — clamped every frame, whatever moved it (walk, dash, knockback).
   *  The lake horror's pond; the root wraith's trunk. */
  confine?: { x: number; y: number; r: number };
  /** ARMED AMBUSH (MonsterDef.ambush): hidden + untargetable until an enemy
   *  strays inside the wake radius — then the reveal. */
  ambushArmed = false;
  /** SHELL GUARD (MonsterDef.shellGuard, a toggled rear-guard aura, or a
   *  guard-skill graft): the directional absorb pool + its break/regrow
   *  state. `fromAura` names the installing skill so the toggle-off (or
   *  the stance dropping) removes ONLY its own shell. `breathe` makes the
   *  covered ARC swell and wane on a period — the opening you time. */
  shellGuard?: {
    side: 'rear' | 'front' | 'all';
    arcDeg: number;
    max: number;
    pool: number;
    regenDelay: number;
    regenRate: number;
    lastHitAt: number;
    broken: boolean;
    color: string;
    fromAura?: string;
    breathe?: { period: number; minFrac?: number; curve?: CurveKind };
  };
  /** TURN SPEED (rad/s): the per-frame facing clamp. 0 = instant (players). */
  turnSpeed = 0;
  /** Last frame's clamped facing (the turn clamp's reference). */
  facingPrev?: number;
  /** VELOCITY ESTIMATE (px/s): an EMA of actual per-frame displacement,
   *  world-maintained beside the turn clamp — what shot-leading minds
   *  (BehaviorSpec.aimLead) read to solve their intercepts. */
  velEst = { x: 0, y: 0 };
  /** Last frame's position (the velocity estimate's reference). */
  posPrev?: { x: number; y: number };
  /** FLIER (MonsterDef.flier): moves on the noclip displacement policy —
   *  over rocks, walls, chasms and water — and the renderer lifts + bobs the
   *  body off its shadow so flight READS at a glance. */
  flying = false;
  /** PACK BOND transition tracker (MonsterDef.bond) — the sheet source only
   *  moves on held/dropped edges, never per frame. */
  bondHeld = false;
  /** PHASE-WORN MODS transition tracker (MonsterDef.nocturne) — the sheet
   *  source only moves when the day wheel crosses the def's hours. */
  nocturneHeld = false;
  /** NO BOUNTY: this body was CONJURED mid-fight (an enemy's summon verb,
   *  summon delivery, brood hatch, split, spew) — killing it pays no xp, no
   *  drops, no orbs. The summoner is the prize; its spawn is just weather.
   *  Closes the leave-the-summoner-alive farming exploit. */
  noBounty = false;
  /** LIVE BURROW (the {do:'burrow'} verb): submerge → travel underground as
   *  a dust line → telegraphed EMERGENCE hit. Untargetable throughout. */
  burrow?: {
    phase: 'submerge' | 'travel' | 'emerge';
    t: number;
    to: { x: number; y: number };
    speed: number;
    damageFrac: number;
    emergeRadius: number;
    dustAcc: number;
    color: string;
  };
  /** World-clock stamp of this body's creation — the renderer's spawn-in
   *  scale-up reads it (mid-play arrivals only; zone-load population is
   *  exempted against the zone's own entry stamp). */
  spawnedAt = -1;

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
  /** COMMANDED (the order fabric): the standing order this actor is under.
   *  COMMAND_KINDS[kind] (ai.ts, open registry) drives it each AI tick until
   *  fulfilled or expired. Set via ai.ts issueCommand — never by hand, so
   *  receipt reliably drops the current agenda and the order OVERRIDES. */
  aiCommand?: CommandState;
  /** A TAMED COMPANION (the Hunter's bond — World.tameCompanion): fights at
   *  its keeper's side like a minion, but DOWNS instead of dying — revived
   *  by a lingering ally seat or its keeper's whistle. Sweep-exempt via its
   *  '__companion:' sourceSkillId marker; released only at the Tracker. */
  companion = false;
  /** BOND UNIT: companions sharing a bondGroup count as ONE held bond (a
   *  future pack of hounds fills one kennel slot together). Solo tames
   *  group under their own actor id; pack-style claims stamp a shared key. */
  bondGroup?: string;
  /** Revive dwell accrued beside this downed companion (any standing, idle
   *  ally seat feeds it — the seat-revive idiom, one accumulator). */
  companionReviveDwell = 0;
  /** THE LIFELINE (borrowed unlife): while set, this actor stands only as
   *  long as the named actor does — World's lifeline sweep UNMAKES it
   *  (quietly: no bounty, drops, bursts, or rattles) the moment its keeper
   *  is dead or gone. Stamped by World.conjurationLifeline at every mint a
   *  player-side NON-SEAT conjurer performs (a spectre'd grave shaman's
   *  risen, a raised broodmother's nests): what it held together lets go
   *  when it falls. Enemy/wild conjurers never stamp it — their risen
   *  outlive the caller. */
  lifelineId?: number;
  /** Last AI tick's RESOLVED obedience tuning (machines can shift it live) —
   *  the command roll reads this so an enraged phase can go deaf to orders. */
  aiObedience?: number;
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
  /** ATTUNEMENT progress per DoodadAttunementDef id (seconds stood near a
   *  resonant doodad; resets out of range). Transient — never serialized. */
  attuneProgress?: Record<string, number>;
  /** TERRAFORM growth countdowns per TerraformDef id. Transient. */
  terraformCd?: Record<string, number>;

  dead = false;

  /** This actor's index in world.actors at the last actor-grid build — the
   *  order-stability handle for spatial queries (see engine/actorGrid.ts).
   *  Transient bookkeeping, never serialized. */
  gridSeq = 0;

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
   *  the momentum window survives a dodge-roll through the pack.
   *  THE INVERSION (insightInversion, 0..1): a CONTINUOUS blend toward the
   *  opposite reading — stillness ramps momentum IN over the (deliberately
   *  longer) insightStillTaper stat's seconds, and motion reads as 0. At 1
   *  the curves swap outright (the rooted duelist: plant, settle, trade);
   *  between, both flows contribute their share — a dial, not a flag, so
   *  half-inverted hybrids and "inverted while guarding" conditionals are
   *  all ordinary modifiers. Refill rides this same value (updateTimers),
   *  so an inverted pool genuinely FILLS while planted. */
  insightMomentum(): number {
    const idle = this.idleFor - DEFENSE_CFG.insight.graceWindow;
    const moving = idle <= 0 ? 1
      : Math.max(0, 1 - idle / Math.max(0.1, this.sheet.get('insightTaper')));
    const inv = Math.min(1, this.sheet.get('insightInversion'));
    if (inv <= 0) return moving;
    const still = idle <= 0 ? 0
      : Math.min(1, idle / Math.max(0.1, this.sheet.get('insightStillTaper')));
    return moving * (1 - inv) + still * inv;
  }

  /** Drain the poise bar (damage.ts mitigation + any future data source).
   *  A BROKEN bar is INERT: the drain is a no-op (recovery can be neither
   *  damaged nor delayed) — it only re-marks combat for the calm gate.
   *  Rungs of DEFENSE_CFG.poise.brackets the drain carries the bar through
   *  raise 'poiseBracket' events; at the bottom the bar BREAKS — the break
   *  status (DEFENSE_CFG.poise.breakStatus) lands, the benefits lapse, and
   *  poiseRegenDelay is stamped ONCE (the recovery countdown; updateTimers
   *  owns the climb and the re-arm).
   *  The BREAKER's sunderDuration stat stretches the Sundered they inflict
   *  (the poise-breaker specialization dial); their effectDuration does
   *  not — sunder is its own investment, not a free rider.
   *  Returns true only on the breaking drain (for the world's fanfare). */
  damagePoise(amount: number, breaker?: Actor, tags?: Set<SkillTag>, extra?: readonly Modifier[]): boolean {
    const max = this.maxPoise();
    if (amount <= 0 || max <= 0) return false;
    this.poiseCalm = 0;
    if (this.poiseBroken) return false;
    const before = this.poise;
    this.poise = Math.max(0, this.poise - amount);
    for (const frac of DEFENSE_CFG.poise.brackets) {
      const rung = max * frac;
      if (before > rung && this.poise <= rung) this.poiseBracketHits.push(frac);
    }
    if (this.poise <= 0 && before > 0) {
      this.poiseBroken = true;
      this.poiseJustBroke = true;
      this.poiseDelay = this.sheet.get('poiseRegenDelay');
      const bs = DEFENSE_CFG.poise.breakStatus;
      if (bs && STATUS_DEFS[bs]) {
        const durScale = breaker ? breaker.sheet.get('sunderDuration', tags, extra) : 1;
        this.applyStatus(bs, 0, durScale, breaker?.name ?? 'Poise Break');
      }
      return true;
    }
    return false;
  }

  /** THE one gate for explicit poise gains (poiseOnHit, restores, proc
   *  payloads): capped at max × (1 + poiseOvercharge) — an un-invested
   *  bearer simply caps at max. Gains flow even while BROKEN (they speed
   *  the recovery climb; updateTimers still owns the re-arm check, so a
   *  fed bar re-arms sooner rather than instantly). Natural recovery never
   *  routes through here — only deliberate, sourced gains may overcharge. */
  gainPoise(amount: number): number {
    if (amount <= 0 || this.dead) return 0;
    const max = this.maxPoise();
    if (max <= 0) return 0;
    const cap = max * (1 + this.sheet.get('poiseOvercharge'));
    const before = this.poise;
    this.poise = Math.min(cap, this.poise + amount);
    return this.poise - before;
  }

  /** THE one gate for energy shield GAINS (on-hit/leech, restores, proc
   *  payloads, the lifeRegenToEs trickle — everything except the recharge
   *  itself, which updateTimers owns): caps at max and flags the esFilled
   *  seam when a gain tops the pool off. Spends (esToMana) don't come
   *  through here — they are withdrawals, not gains. */
  gainEs(amount: number): number {
    if (amount <= 0 || this.dead) return 0;
    const max = this.maxEs();
    if (max <= 0) return 0;
    const before = this.es;
    this.es = Math.min(max, this.es + amount);
    if (before < max - 0.001 && this.es >= max - 0.001) this.esJustFilled = true;
    return this.es - before;
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
    this.poiseDelay = 0;
    this.poiseCalm = 0;
    this.esDelay = 0;
    this.esRecharging = false;
  }

  isMinion(): boolean { return !!this.owner; }

  /** True when this actor sits anywhere under `lord`'s ownership chain — a
   *  raised zombie answers the summoner who raised its raiser (commands,
   *  court-wide sweeps). Loop-guarded; direct minions are hop one. */
  ownedBy(lord: Actor): boolean {
    let r: Actor | undefined = this.owner;
    for (let hops = 0; r && hops < 8; hops++) {
      if (r === lord) return true;
      r = r.owner;
    }
    return false;
  }

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
   *  the buffGain event carries it so buff→buff chains obey depth rules.
   *  `tags`: the granting skill's tags, when one drove the grant — the
   *  sympathy fabric's flask/tag filters read them off the event. */
  addBuff(def: BuffEffect, durationScale = 1, chainDepth = 0, tags?: SkillTag[]): void {
    // Every application — fresh, stacking, or refresh — counts as GAINING
    // the buff (the buffGain trigger's event).
    if (this.gainEvents.length < 64) {
      this.gainEvents.push({ kind: 'buff', id: def.id, depth: chainDepth, buff: def, tags });
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
    // Cap = the gain path's own max + the skill-scoped chargeCap stat
    // + the charge-scoped chargeCap_<id> family (which reaches every
    // path, including skill-less orb pours and passive accrual).
    const cap = Math.max(0, Math.round(max + this.sheet.get('chargeCap',
      inst ? skillContextTags(inst.def) : undefined,
      inst ? instanceMods(inst) : undefined)
      + this.sheet.get('chargeCap_' + charge)));
    const cur = this.charges.get(charge) ?? 0;
    const next = Math.min(cap, cur + amount);
    this.charges.set(charge, next);
    // An ACTUAL increase is a gain event (a full bank refreshing isn't).
    if (next > cur && this.gainEvents.length < 64) {
      this.gainEvents.push({
        kind: 'charge', id: charge, depth: chainDepth,
        n: next - cur, tags: inst?.def.tags,
      });
    }
    // A fresh gain resets the decay clock.
    const state = st ?? { idle: 0, acc: 0, tick: 0 };
    state.idle = 0;
    this.chargeState.set(charge, state);
    this.syncChargeMods(charge);
  }

  /** The folded CAP for a charge as seen from a skill: the largest of the
   *  skill's own gain-tap maxes for it (or the registry baseCap when the
   *  skill carries no tap), raised by the skill-scoped chargeCap stat and
   *  the chargeCap_<id> family — the same math gainCharge caps by, so the
   *  HUD's pips and Mireille's refills never lie about the ceiling. */
  chargeCapFor(charge: string, inst?: SkillInstance): number {
    let base = 0;
    if (inst) {
      for (const cg of instanceChargeGain(inst)) {
        if (cg.charge === charge) base = Math.max(base, cg.max);
      }
    }
    if (base <= 0) base = CHARGE_DEFS[charge]?.baseCap ?? 0;
    return Math.max(0, Math.round(base + this.sheet.get('chargeCap',
      inst ? skillContextTags(inst.def) : undefined,
      inst ? instanceMods(inst) : undefined)
      + this.sheet.get('chargeCap_' + charge)));
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
    // PASSIVE ACCRUAL (chargeRegen_<id>, charges per 10s — passive nodes,
    // affixes, buffs). Sampled on a 1s cadence so idle actors don't pay a
    // registry of stat queries every frame. Accrual without a bank banks
    // nothing: the cap is the def's baseCap plus invested chargeCap stats.
    const rst = this.chargeState.get('__regen') ?? { idle: 0, acc: 0, tick: 0 };
    this.chargeState.set('__regen', rst);
    rst.tick += dt;
    if (rst.tick >= 1) {
      rst.tick -= 1;
      for (const [id, def] of Object.entries(CHARGE_DEFS)) {
        const q = this.sheet.get('chargeRegen_' + id);
        if (q <= 0) continue;
        const st = this.chargeState.get(id + ':regen') ?? { idle: 0, acc: 0, tick: 0 };
        this.chargeState.set(id + ':regen', st);
        st.acc += q / 10;
        while (st.acc >= 1) {
          st.acc -= 1;
          this.gainCharge(id, 1, def.baseCap ?? 0);
        }
      }
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

  /** THE CONDUIT TICK (see ConduitSpec): every equipped skill's pumps — innate
   *  plus socket-grafted — run while that skill is ENGAGED: a held STANCE
   *  mode (HELD_PUMP_MODES — plain/perfect/timed bars also carry `held`
   *  while the button is down, and a bar-cast must never pump) or its
   *  toggle burning (aura — toggle and duration both — or a summon
   *  contract). The hold matches by DEF ID, the updateCharges
   *  channelSecond precedent: meta-minted holds of the same skill count;
   *  a convert's foreign face deliberately does not.
   *  Feeds route the canonical gain gates; drains honor floors; the pump
   *  draws only what the destination has room for. Stats are read per host
   *  (tags + instance mods), so investment reaches every seat — and a gem's
   *  own perLevel mods scale the very pump it grafts. */
  private updateConduits(dt: number): void {
    for (const inst of this.skills) {
      if (!inst) continue;
      const specs = instanceConduits(inst);
      if (specs.length === 0) continue;
      const cs = this.casting;
      const engaged = (!!cs?.held && HELD_PUMP_MODES.has(cs.mode)
          && cs.inst.def.id === inst.def.id)
        || this.activeAuras.has(inst.def.id)
        || this.summonToggles.has(inst.def.id);
      if (!engaged) continue;
      const tags = skillContextTags(inst.def);
      const extra = instanceMods(inst);
      const rate = this.sheet.get('conduitRate', tags, extra);
      const eff = this.sheet.get('conduitEfficiency', tags, extra);
      if (rate <= 0 || eff <= 0) continue;
      for (const spec of specs) this.tickConduit(spec, dt, rate, eff);
    }
    // WORN pumps (allocation-granted, no socket): stats read UNTAGGED —
    // they belong to no skill, so skill-tag-filtered investment stays with
    // the skill lane while gear-wide dials reach both.
    if (this.wornConduits?.length) {
      const rate = this.sheet.get('conduitRate');
      const eff = this.sheet.get('conduitEfficiency');
      if (rate > 0 && eff > 0) {
        for (const spec of this.wornConduits) this.tickConduit(spec, dt, rate, eff);
      }
    }
  }

  /** One pump, one frame: draw from the source (never past its floor, never
   *  more than the destination can hold at the exchange rate), deliver
   *  through the destination's gain gate. A source that yields nothing (a
   *  BROKEN poise bar is drain-inert) feeds nothing — no free lunches
   *  through dead pools. */
  private tickConduit(spec: ConduitSpec, dt: number, rate: number, eff: number): void {
    const src = CONDUIT_POOLS[spec.from];
    const dst = CONDUIT_POOLS[spec.to];
    const srcMax = src.max(this);
    if (srcMax <= 0) return;                     // endpoint absent (no guard raised)
    const room = dst.room(this);
    if (room < CONDUIT_CFG.minRoom) return;       // destination full: the pump idles
    const perPoint = spec.ratio * eff;
    const want = ((spec.drainPct ?? 0) * srcMax + (spec.drainFlat ?? 0)) * rate * dt;
    if (perPoint <= 0 || want <= 0) return;
    const avail = src.cur(this) - srcMax * (spec.floor ?? CONDUIT_CFG.floor);
    if (avail <= 0) return;                      // source resting at its floor
    const drained = src.drain(this, Math.min(want, avail, room / perPoint));
    if (drained <= 0) return;
    dst.feed(this, drained * perPoint);
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
      /** POP scaling from the applier (the popPower_<id> stat) — additive to
       *  the StatusDef.pop fraction's implicit 1× (0.5 = 50% bigger pops). */
      popBonus?: number;
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
    } else if (existing && def.pop && !fixedFuse) {
      // POP-ON-REAPPLY (Hemorrhage): detonate a fraction of the REMAINING
      // banked DoT — paid out by the next tick through the ordinary typed
      // pipeline — then the NEW application takes the wound over wholesale
      // (dps AND timer replaced: reload, not top-up).
      const owed = existing.dps * existing.stacks * existing.remaining;
      const frac = def.pop.fraction * (1 + Math.max(0, opts?.popBonus ?? 0));
      if (owed > 0 && frac > 0) existing.popAcc = (existing.popAcc ?? 0) + owed * frac;
      existing.dps = dps;
      existing.remaining = duration;
      existing.total = duration;
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
      // FIRST APPLIER holds the credit by default (DoT attribution never
      // migrates mid-burn) — but refreshCaster statuses hand it to the
      // NEWEST applier: a taunt answered by a louder taunt must turn.
      existing.casterId = def.refreshCaster && opts.casterId !== undefined
        ? opts.casterId
        : existing.casterId ?? opts.casterId;
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
      for (const s of hostSockets(inst)) {
        if (s.def.mods.some(m => m.when === when)) return true;
      }
    }
    return false;
  }

  /** Change detectors for refreshConditions' no-change fast path: the last
   *  condition BITMASK and gauge CHECKSUM pushed into the sheet (plus which
   *  sheet they were pushed into — a rebuilt sheet must be re-primed).
   *  This runs per actor per frame; the old form allocated two arrays and a
   *  string per gauge every frame just to let the sheet discover that
   *  nothing changed. */
  private condMask = -1;
  private gaugeHashA = -1;
  private gaugeHashB = -1;
  private condSheet: StatSheet | null = null;

  /** THE ACTOR'S OWN lowLife line — where "on low life" begins for THIS
   *  body (the lowLifeLine stat: base stats.LOW_LIFE_FRAC, so a pact belt
   *  moves the wearer's line and minion-lane mods move a minion's). Every
   *  lowLife test asks the actor it concerns — the condition mask below,
   *  Unstable Flesh detonation, the hit-while-low surge, the blood
   *  vignette — so lines may diverge per ACTOR, never per SYSTEM. */
  lowLifeLine(): number { return this.sheet.get('lowLifeLine'); }

  /** Recompute the actor-state conditions conditional modifiers test. */
  private refreshConditions(): void {
    const maxLife = this.maxLife();
    const maxMana = this.maxMana();
    const maxEs = this.maxEs();
    let mask = 0;
    if (this.life < maxLife * this.lowLifeLine()) mask |= 1;          // lowLife
    if (this.life >= maxLife * FULL_LIFE_FRAC) mask |= 2;              // fullLife
    if (maxMana > 0 && this.mana < maxMana * LOW_MANA_FRAC) mask |= 4; // lowMana
    if (maxMana > 0 && this.mana >= maxMana * FULL_MANA_FRAC) mask |= 8; // fullMana
    if (this.es > 0.5) mask |= 16;                                     // hasEs
    if (maxEs > 0 && this.es >= maxEs * FULL_ES_FRAC) mask |= 32;      // fullEs
    if (maxEs > 0 && this.es < maxEs * LOW_ES_FRAC) mask |= 64;        // lowEs
    if (this.casting?.mode === 'guard') mask |= 128;                   // guarding
    // The break-bar stands: "while poised" mods hold (lapse on the break).
    if (this.poise > 0.5 && !this.poiseBroken) mask |= 256;            // poised
    // ...and its inverse: the broken-and-recovering window is a stance of
    // its own (the berserker's "while your poise is broken" hook).
    if (this.poiseBroken) mask |= 512;                                 // poiseBroken
    // The ES recharge is FLOWING — "while recharging" mods ride the stream.
    if (this.esRecharging) mask |= 1024;                               // esRecharging
    // Planted vs on the move (Colossus Stance): idleFor accrues in
    // updateTimers and is zeroed by every deliberate step. Between the two
    // windows sits a NEUTRAL transition band — neither bonus nor malus.
    if (this.idleFor > STANCE_PLANT_TIME) mask |= 2048;                // stationary
    else if (this.idleFor < STANCE_MOVE_WINDOW) mask |= 4096;          // moving
    const sheetChanged = this.condSheet !== this.sheet;
    if (mask !== this.condMask || sheetChanged) {
      this.condMask = mask;
      const active: ConditionId[] = [];
      if (mask & 1) active.push('lowLife');
      if (mask & 2) active.push('fullLife');
      if (mask & 4) active.push('lowMana');
      if (mask & 8) active.push('fullMana');
      if (mask & 16) active.push('hasEs');
      if (mask & 32) active.push('fullEs');
      if (mask & 64) active.push('lowEs');
      if (mask & 128) active.push('guarding');
      if (mask & 256) active.push('poised');
      if (mask & 512) active.push('poiseBroken');
      if (mask & 1024) active.push('esRecharging');
      if (mask & 2048) active.push('stationary');
      if (mask & 4096) active.push('moving');
      this.sheet.setConditions(active);
    }

    // LIVE GAUGES for gauge-scaled modifiers ("2% increased damage per
    // poison stack on you"): own status stacks + banked charges. Integer,
    // event-driven quantities ONLY — per-frame floats would churn the stat
    // cache every tick (the gauge golden rule). Two mixed 32-bit checksum
    // lanes detect change without building the entries (collision odds are
    // lottery-grade; a collision would only defer a conditional-mod refresh
    // to the next gauge change).
    let ha = 0x9e3779b9 | 0, hb = 0x85ebca6b | 0;
    const mixStr = (s: string): void => {
      for (let i = 0; i < s.length; i++) {
        ha = Math.imul(ha ^ s.charCodeAt(i), 0x01000193);
        hb = (Math.imul(hb, 31) + s.charCodeAt(i)) | 0;
      }
    };
    for (const s of this.statuses) {
      if (s.stacks <= 0) continue;
      mixStr(s.id);
      ha = Math.imul(ha ^ s.stacks, 0x01000193); hb = (Math.imul(hb, 31) + s.stacks) | 0;
    }
    for (const [id, n] of this.charges) {
      if (n <= 0) continue;
      mixStr(id);
      ha = Math.imul(ha ^ n, 0x01000193); hb = (Math.imul(hb, 31) + n) | 0;
    }
    // Brim fills publish as INTEGER pips (0–5) — the quantized bar honors
    // the gauge golden rule (a raw float would churn the cache per frame),
    // and "damage per brim pip" affix lines become authorable for free.
    if (this.brims) {
      for (const [id, b] of this.brims) {
        const pips = Math.round(b.fill * 5);
        if (pips <= 0) continue;
        mixStr(id);
        ha = Math.imul(ha ^ pips, 0x01000193); hb = (Math.imul(hb, 31) + pips) | 0;
      }
    }
    if (ha !== this.gaugeHashA || hb !== this.gaugeHashB || sheetChanged) {
      this.gaugeHashA = ha; this.gaugeHashB = hb;
      const gauges: [string, number][] = [];
      for (const s of this.statuses) {
        if (s.stacks > 0) gauges.push(['status:' + s.id, s.stacks]);
      }
      for (const [id, n] of this.charges) {
        if (n > 0) gauges.push(['charge:' + id, n]);
      }
      if (this.brims) {
        for (const [id, b] of this.brims) {
          const pips = Math.round(b.fill * 5);
          if (pips > 0) gauges.push(['brim:' + id, pips]);
        }
      }
      this.sheet.setGauges(gauges);
    }
    if (sheetChanged) this.condSheet = this.sheet;
  }

  /** RAW-CLOCK status tick for a body whose OWN time is fully held
   *  (engine/timeflow.ts, actorScale 0 — the world skips its update
   *  wholesale): only CHRONO statuses — the ones bending this body's time
   *  (StatusDef.timeScale) — burn down, on unbent seconds, so a stasis
   *  always expires out of the very freeze it causes. Everything else on
   *  the body waits, exactly as frozen time should have it. */
  tickChronoStatuses(rawDt: number): void {
    for (let i = this.statuses.length - 1; i >= 0; i--) {
      const s = this.statuses[i];
      if (STATUS_DEFS[s.id]?.timeScale === undefined) continue;
      s.remaining -= rawDt;
      if (s.remaining <= 0) {
        this.statuses.splice(i, 1);
        this.expiredStatuses.push(s); // world processes ruptures
        if (!this.statuses.some(o => o.id === s.id)) this.sheet.removeSource('status:' + s.id);
      }
    }
  }

  /** Tick durations; returns the frame's DoT damage to inflict, BY DAMAGE
   *  TYPE (statuses without a dotType pool under 'untyped') — so the DoT
   *  pipeline can honour element-tagged interactions (esDotBypass per
   *  element, tagged damageTaken). Null when nothing ticked.
   *  `chronoDt` is the UNBENT frame time (engine/timeflow.ts): statuses
   *  that bend this body's clock (StatusDef.timeScale) burn their own
   *  duration on it, so a temporal drag lasts its authored seconds — never
   *  stretched by the very slow-motion it causes. Callers outside the
   *  timeflow bend omit it (defaults to dt). */
  updateTimers(dt: number, chronoDt = dt): Partial<Record<DamageType | 'untyped', number>> | null {
    this.refreshConditions();
    // The RECENT-WOUND clock (GateSpec.recentDamage — Reprisal's license):
    // seconds since this actor last took damage; the world zeroes it at
    // both damage seams (hits and DoT alike).
    this.recentHurt = Math.min(999, this.recentHurt + dt);
    // Hire-clock high-water mark (the lifespan sliver's denominator).
    if (this.lifespan > this.lifespanTotal) this.lifespanTotal = this.lifespan;
    // Cooldowns tick faster with cooldownRecovery.
    const cdr = this.sheet.get('cooldownRecovery');
    for (const [id, t] of this.cooldowns) {
      const left = t - dt * cdr;
      if (left <= 0) this.cooldowns.delete(id); else this.cooldowns.set(id, left);
    }
    // SELF-STACKS bleed (SelfStackSpec): each skill's own pile fades while
    // the skill rests — peel one stack per lapsed duration (default) or
    // drop the lot ('all'). The stamp side lives in executeSkill.
    for (const inst of this.skills) {
      const st = inst?.state;
      if (!st?.stackN) continue;
      const spec = instanceSelfStack(inst!);
      if (!spec) { st.stackN = 0; continue; }
      st.stackT = (st.stackT ?? spec.duration) - dt;
      if (st.stackT <= 0) {
        if ((spec.decay ?? 'peel') === 'all') st.stackN = 0;
        else { st.stackN -= 1; st.stackT = spec.duration; }
      }
    }
    if (this.useLock > 0) this.useLock -= dt;
    if (this.reflexLock > 0) this.reflexLock -= dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.aiCooldown > 0) this.aiCooldown -= dt;
    // Evasion-entropy freshness: unattacked long enough, the accumulator
    // re-seeds on the next check (a fresh fight reads fresh).
    if (this.evadeWindow > 0) this.evadeWindow -= dt;

    // Charge personalities: decay clocks, drains, per-second taps.
    this.updateCharges(dt);

    // Resource pumps: every engaged skill's conduits, innate + grafted.
    this.updateConduits(dt);

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
      // Chrono statuses expire on the unbent clock (see chronoDt above).
      s.remaining -= STATUS_DEFS[s.id]?.timeScale !== undefined ? chronoDt : dt;
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
      // POP payout (StatusDef.pop): a reapplication's banked burst lands NOW,
      // one-shot, through the same typed pool as the ticks themselves.
      if (s.popAcc) {
        const key = STATUS_DEFS[s.id]?.dotType ?? 'untyped';
        dot ??= {};
        dot[key] = (dot[key] ?? 0) + s.popAcc;
        if (s.leech) s.leechAcc = (s.leechAcc ?? 0) + s.popAcc * s.leech;
        s.popAcc = 0;
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
        this.gainEs(step);
      }
      if (st.remaining <= 0) this.restoreStreams.splice(i, 1);
    }

    // USE-CHARGE recovery (SkillDef.useCharges), per equipped bank:
    //  - MAGAZINE lane: the emptying press stamped the skill's cooldown and
    //    flagged the bank; expiry pours the refill back in ONE go (an active
    //    reload — restoreSkillCharges — beats it by wiping clock and flag).
    //  - TRICKLE lane (recharge): one round back per `recharge` seconds
    //    (÷ skillChargeRate), until full.
    //  - Neither: manual ammunition — nothing here moves the bank.
    for (const inst of this.skills) {
      const uc = inst ? instanceUseCharges(inst) : undefined;
      if (!uc) continue;
      const st = this.skillChargeBank(inst!);
      const cap = this.skillChargeCap(inst!);
      if (st.reloading && !this.cooldowns.has(inst!.def.id)) {
        st.reloading = false;
        const refill = uc.magazine && uc.magazine !== true
          ? (uc.magazine.refill ?? cap) : cap;
        st.count = Math.min(cap, st.count + refill);
      }
      if (st.count >= cap) { st.timer = 0; continue; }
      if (!uc.recharge) continue;
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
        if (toEs > 0) this.gainEs(regen * toEs * dt);
        // The delay-gated RECHARGE — a running STATE, not a one-shot
        // promise: a wound restamps the delay (soakDamage, unless
        // esRechargeSteadfast holds), stalling the flow until the wait
        // passes again. The rising edge and the top-off feed the
        // esRechargeStart / esFilled proc seams.
        if (this.esDelay > 0) this.esDelay -= dt;
        if (this.esDelay <= 0 && this.es < maxEs - 0.001) {
          if (!this.esRecharging) {
            this.esRecharging = true;
            this.esRechargeJustStarted = true;
          }
          this.es = Math.min(maxEs, this.es + maxEs * this.sheet.get('esRechargeRate') * dt);
          if (this.es >= maxEs - 0.001) {
            this.es = maxEs;
            this.esRecharging = false;
            this.esJustFilled = true;
          }
        } else {
          this.esRecharging = false;
        }
      } else if (this.es > 0 || this.esRecharging) {
        this.es = 0; // the granting buff expired
        this.esRecharging = false;
      }
      if (this.es > maxEs) this.es = maxEs;

      // POISE, the break-bar state machine. BROKEN: the stamped countdown,
      // then the UNINTERRUPTIBLE climb (drains are no-ops while broken —
      // damagePoise gates them out), re-arming at the poiseRearmAt line.
      // ARMED but dented: mid-fight the bar is a wearing resource — it
      // refills only once the drains have stopped past the calm gate.
      const maxPoise = this.maxPoise();
      if (maxPoise > 0) {
        this.poiseCalm += dt;
        const rate = maxPoise * this.sheet.get('poiseRegenPct') * dt;
        if (this.poiseBroken) {
          if (this.poiseDelay > 0) this.poiseDelay -= dt;
          else if (this.poise < maxPoise) {
            this.poise = Math.min(maxPoise, this.poise + rate);
          }
          // Gains (gainPoise) may beat the climb to the line — the re-arm
          // check reads the POOL, not the clock, so feeding the bar counts.
          if (this.poise >= maxPoise * this.sheet.get('poiseRearmAt') - 0.001) {
            this.poiseBroken = false;
            this.poiseJustRearmed = true;
            this.poiseDelay = 0;
          }
        } else if (this.poise < maxPoise
          && this.poiseCalm >= this.sheet.get('poiseCalmDelay')) {
          this.poise = Math.min(maxPoise, this.poise + rate);
        }
        // OVERCHARGE is a crest, not a plateau: the overage sheds toward
        // max (and the ceiling re-clamps if the granting investment lapsed).
        if (this.poise > maxPoise) {
          const ceil = maxPoise * (1 + this.sheet.get('poiseOvercharge'));
          this.poise = Math.min(ceil, Math.max(maxPoise,
            this.poise - (this.poise - maxPoise) * DEFENSE_CFG.poise.overDecay * dt));
        }
      } else if (this.poise > 0 || this.poiseBroken) {
        this.poise = 0;
        this.poiseBroken = false;
      }

      // INSIGHT refills along its MOMENTUM: the regen rides the same taper
      // as the reduction, so a sprint refills briskly, the lingering window
      // trickles, and a statue reads nothing — unless the INVERSION dial is
      // set, in which case the statue is the one being paid (the rooted
      // stance fills while planted; insightMomentum owns the blend).
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
  skillChargeBank(inst: SkillInstance): { count: number; timer: number; reloading?: boolean } {
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
    const uc = instanceUseCharges(inst); // graft-aware: a chambered cast banks too
    if (!uc) return 0;
    return Math.max(1, Math.round(uc.max + this.sheet.get('skillCharges',
      skillContextTags(inst.def), instanceMods(inst))));
  }

  /** Spend one use-charge (the press's pacing cost — see useSkill). */
  spendSkillCharge(inst: SkillInstance): void {
    const st = this.skillChargeBank(inst);
    st.count = Math.max(0, st.count - 1);
  }

  /** Attack or cast speed factor for a skill (by tag), with skill-local mods.
   *  'reload'-tagged skills ALSO ride the reloadSpeed stat — the racking
   *  hand speeds up on top of whichever base speed applies. */
  speedFactor(inst: SkillInstance): number {
    const tags = skillContextTags(inst.def);
    const extra = instanceMods(inst);
    const base = tags.has('attack') ? this.sheet.get('attackSpeed', tags, extra)
      : this.sheet.get('castSpeed', tags, extra);
    return tags.has('reload')
      ? base * this.sheet.get('reloadSpeed', tags, extra) : base;
  }

  /** Cast time of a skill after attack/cast speed. 0 = instant. */
  skillUseTime(inst: SkillInstance): number {
    // GUARDED CASTING (SupportDef.guardCast): the socketed press is INSTANT
    // — the held stance is the wind-up, so the bar collapses to the
    // Lance-Thrust-style combo blow (and the hold-combo gate's instant
    // requirement passes by construction).
    if (socketSpec(inst, 'guardCast')) return 0;
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

  /** The first UNMET gate (SkillDef.gate + socketed levies), or null when
   *  every threshold holds. All actor-local, so the HUD, the AI, and the
   *  press agree — and the refusal can speak the gate's own `note`. */
  unmetGate(inst: SkillInstance): GateSpec | null {
    for (const g of instanceGates(inst)) {
      if (g.charge && (this.charges.get(g.charge.id) ?? 0) < g.charge.amount) return g;
      if (g.buff && !this.buffs.has(g.buff)) return g;
      if (g.resource) {
        const cur = g.resource.kind === 'mana' ? this.mana
          : g.resource.kind === 'life' ? this.life
          : g.resource.kind === 'es' ? this.es : this.ward;
        if (cur < g.resource.amount) return g;
      }
      // THIRST (GateSpec.missing): a brimming pool refuses the drink —
      // unless the `thirstless` stat waives it (the drink-for-the-rider
      // lane: supports, passives and statuses all reach it per-skill).
      if (g.missing && this.sheet.get('thirstless',
        skillContextTags(inst.def), instanceMods(inst)) <= 0) {
        const maxOf = (kind: 'life' | 'mana' | 'es'): number =>
          kind === 'life' ? this.maxLife()
          : kind === 'mana' ? this.availableMaxMana() : this.maxEs();
        const short = (kind: 'life' | 'mana' | 'es'): number =>
          maxOf(kind) - (kind === 'life' ? this.life
            : kind === 'mana' ? this.mana : this.es);
        // The floor: a flat dent, or pct of the pool — whichever is larger
        // (pct is what lets one gate spec fit every body size).
        const need = (kind: 'life' | 'mana' | 'es'): number =>
          Math.max(g.missing!.amount ?? 1, (g.missing!.pct ?? 0) * maxOf(kind));
        const met = g.missing.kind === 'any'
          ? short('life') >= need('life') || short('mana') >= need('mana')
          : short(g.missing.kind) >= need(g.missing.kind);
        if (!met) return g;
      }
      if (g.guard && this.casting?.mode !== 'guard') return g;
      if (g.active && !this.activeAuras.has(g.active) && !this.summonToggles.has(g.active)) return g;
      // RECENT-DAMAGE window (Reprisal): the counter-blow answers only
      // wounds — usable within `within` seconds of last taking damage.
      if (g.recentDamage && this.recentHurt > g.recentDamage.within) return g;
    }
    return null;
  }

  /** Are every gate's thresholds met? (unmetGate, as the yes/no.) */
  gatesMet(inst: SkillInstance): boolean {
    return this.unmetGate(inst) === null;
  }

  /** SELECTIVE CC (StatusDef.forbidsTags): any carried status that forbids
   *  one of the skill's tags locks it — Silenced spells, Disarmed attacks,
   *  Rooted movement. One gate for player, monster, and minion alike
   *  (public: the trigger artery consults it without the canUse casting
   *  gate — a Silenced hero's Cast-on-Crit stays silenced too). */
  tagsForbidden(inst: SkillInstance): boolean {
    for (const s of this.statuses) {
      const forbids = STATUS_DEFS[s.id]?.forbidsTags;
      if (!forbids) continue;
      for (const t of forbids) if (inst.def.tags.includes(t)) return true;
    }
    return false;
  }

  /** Is this skill a REFLEX in this actor's hands — an instant press that
   *  may pierce their own commitment? Innate (SkillDef.reflex) or granted
   *  from outside (the `reflex` stat: supports, passives, statuses —
   *  tag-scopable). Plain instant casts only: a skill that needs a bar or
   *  a hold of its own can never ride the wrist. */
  isReflex(inst: SkillInstance): boolean {
    const def = inst.def;
    if ((def.castMode ?? 'cast') !== 'cast' || def.channel || def.concentration) return false;
    if (this.skillUseTime(inst) > 0.001) return false;
    return def.reflex === true
      || this.sheet.get('reflex', skillContextTags(def), instanceMods(inst)) > 0;
  }

  /** Does REFLEX_CFG leave every commitment this actor is CURRENTLY under
   *  open to a reflex press? Chosen states (casts by mode, dash, recovery)
   *  default open; suffered ones (stun) default closed. Dead never opens. */
  private reflexOpen(): boolean {
    const d = REFLEX_CFG.during;
    if (this.dead) return false;
    if (this.casting && d[this.casting.mode] === false) return false;
    if (this.dash && d.dash === false) return false;
    if (this.useLock > 0 && d.useLock === false) return false;
    if (this.isStunned() && d.stun !== true) return false;
    return true;
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
        || !!socketSpec(inst, 'guardCast')
        || (inst.hostSkillId !== undefined
          && this.casting!.inst.def.id === inst.hostSkillId));
    // THE REFLEX LANE (the flask rule): a reflex press pierces ANY open
    // commitment — a running cast bar included, which no hold combo ever
    // covered — paced by its own reflexLock instead of the body's clocks.
    // Broader than holdCombo where both apply, so it's weighed first
    // (reflexOpen already carries the dead/stun/dash/recovery policy).
    const reflex = !this.canAct() && this.reflexLock <= 0
      && this.isReflex(inst) && this.reflexOpen();
    if (!reflex) {
      if (holdCombo) {
        if (this.dead || this.useLock > 0 || this.isStunned()) return false;
      } else if (!this.canAct()) return false;
    }
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
    // And for strobe stances (Restless Earth): the off-press frees its
    // reserve — never let an empty pool softlock the release.
    if (d0.type === 'ground' && d0.strobe && this.strobes.has(inst.def.id)) {
      return true;
    }
    // USE-CHARGES: an empty bank is the dry spell (recovery ticks it back) —
    // graft-aware, so a chambered cast runs dry exactly like a native gun
    // (the PRESS still converts to the reload upstream of this refusal).
    if (instanceUseCharges(inst) && this.skillChargeBank(inst).count <= 0) return false;
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

/** The cast modes whose `held` means a STANCE is genuinely up. Plain,
 *  perfect, timed and totem-plant bars all carry `held: true` while the
 *  button is down — a bar-cast must never pump, so the conduit tick gates
 *  on THIS set (the validator's engages() mirrors it). */
const HELD_PUMP_MODES: ReadonlySet<CastMode> =
  new Set<CastMode>(['guard', 'channel', 'charge', 'overcharge']);

/** One endpoint per pumpable pool — the registry the conduit tick walks
 *  (see ConduitSpec). cur/max define the working pool (ward, uncapped,
 *  reads its CURRENT as the %-base); room is the space a feed may still
 *  fill; drain returns what actually LEFT (a broken poise bar yields 0);
 *  feed routes THE canonical gain gate so every conduit obeys the same law
 *  as every other source in the game. A new pumpable pool is one entry
 *  here plus its name in the ConduitPool union — no other code. */
const CONDUIT_POOLS: Record<ConduitPool, {
  cur(a: Actor): number;
  max(a: Actor): number;
  room(a: Actor): number;
  drain(a: Actor, amount: number): number;
  feed(a: Actor, amount: number): number;
}> = {
  life: {
    cur: a => a.life,
    max: a => a.maxLife(),
    // healBy owns the true cap (ceiling, seals, healTaken) — room here only
    // pre-gates the draw; a seared bearer genuinely wastes transfused blood.
    room: a => Math.max(0, a.lifeCeiling() - a.life),
    drain: (a, amt) => {
      // The hard safety under any spec: a pump bleeds you white, never dead.
      const take = Math.min(amt,
        Math.max(0, a.life - a.maxLife() * CONDUIT_CFG.lifeFloor));
      a.life -= take;
      return take;
    },
    feed: (a, amt) => a.healBy(amt),
  },
  mana: {
    // The WORKING pool is the UNRESERVED band (availableMaxMana), the same
    // ceiling every other mana-gain path honors (leech, restores, the
    // regen clamp): feeds cap there — reserved space is not room, and
    // anything poured into it would be confiscated by the regen clamp a
    // few lines later; %-drains and floors read it as their base, so a
    // heavy reservation shrinks the pump instead of starving it against a
    // phantom maximum; a fully-reserved bar reads max 0 and pumps idle.
    cur: a => a.mana,
    max: a => a.availableMaxMana(),
    room: a => Math.max(0, a.availableMaxMana() - a.mana),
    drain: (a, amt) => {
      const take = Math.min(amt, Math.max(0, a.mana));
      a.mana -= take;
      return take;
    },
    feed: (a, amt) => {
      const before = a.mana;
      a.mana = Math.min(a.availableMaxMana(), a.mana + amt);
      return a.mana - before;
    },
  },
  es: {
    // Drains are WITHDRAWALS (the esToMana rule): no recharge interruption,
    // no break events — the shield is spent, not wounded.
    cur: a => a.es,
    max: a => a.maxEs(),
    room: a => Math.max(0, a.maxEs() - a.es),
    drain: (a, amt) => {
      const take = Math.min(amt, Math.max(0, a.es));
      a.es -= take;
      return take;
    },
    feed: (a, amt) => a.gainEs(amt),
  },
  poise: {
    // Drains route damagePoise: brackets RING on the way down and a floor-0
    // pump BREAKS its own bar (drain-inert while broken — the recovery
    // climb can't be farmed). Feeds route gainPoise: they speed a broken
    // bar's climb and may crest into overcharge headroom.
    cur: a => a.poise,
    max: a => a.maxPoise(),
    room: a => Math.max(0,
      a.maxPoise() * (1 + a.sheet.get('poiseOvercharge')) - a.poise),
    drain: (a, amt) => {
      const before = a.poise;
      a.damagePoise(amt, a);
      return before - a.poise;
    },
    feed: (a, amt) => a.gainPoise(amt),
  },
  insight: {
    // The momentum pool: absent (max 0) on the uninvested... except insight
    // ships with a universal base — most actors CAN pump it. Drains touch
    // only the METER, never the momentum taper (stillness/motion stays the
    // bearer's business); feeds clamp at max — there is no gain gate to
    // route (the refill in updateTimers writes directly, and so do we).
    cur: a => a.insight,
    max: a => a.maxInsight(),
    room: a => Math.max(0, a.maxInsight() - a.insight),
    drain: (a, amt) => {
      const take = Math.min(amt, Math.max(0, a.insight));
      a.insight -= take;
      return take;
    },
    feed: (a, amt) => {
      const before = a.insight;
      a.insight = Math.min(a.maxInsight(), a.insight + amt);
      return a.insight - before;
    },
  },
  ward: {
    // Uncapped pool: its decay is its cap. %-drains read the CURRENT as
    // their base (exponential draw-down); feeds always have room.
    cur: a => a.ward,
    max: a => a.ward,
    room: () => Number.POSITIVE_INFINITY,
    drain: (a, amt) => {
      const take = Math.min(amt, Math.max(0, a.ward));
      a.ward -= take;
      return take;
    },
    feed: (a, amt) => a.gainWard(amt),
  },
  guard: {
    // The HELD stance's shield: absent (0/0) unless a guard is raised, so
    // guard-endpoint pumps idle off-stance by construction. Feeds cap at
    // the stance's live maximum (a Transgression crest may have raised
    // it); drains floor by spec — a default-floor pump never eats the
    // wall out from under its bearer.
    cur: a => a.casting?.mode === 'guard' ? (a.casting.shield ?? 0) : 0,
    max: a => a.casting?.mode === 'guard' ? (a.casting.maxShield ?? 0) : 0,
    room: a => a.casting?.mode === 'guard'
      ? Math.max(0, (a.casting.maxShield ?? 0) - (a.casting.shield ?? 0))
      : 0,
    drain: (a, amt) => {
      const cs = a.casting;
      if (cs?.mode !== 'guard') return 0;
      const take = Math.min(amt, Math.max(0, cs.shield ?? 0));
      cs.shield = (cs.shield ?? 0) - take;
      return take;
    },
    feed: (a, amt) => {
      const cs = a.casting;
      if (cs?.mode !== 'guard') return 0;
      const fed = Math.min(amt,
        Math.max(0, (cs.maxShield ?? 0) - (cs.shield ?? 0)));
      cs.shield = (cs.shield ?? 0) + fed;
      return fed;
    },
  },
};
