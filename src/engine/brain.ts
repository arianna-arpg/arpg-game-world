// ---------------------------------------------------------------------------
// THE BEHAVIOR VOCABULARY — AI as data, with full player-grade composability.
//
// A monster's conduct decomposes into ORTHOGONAL AXES, each a small spec:
//
//   move        HOW it locomotes (a kernel id + knobs: orbit, weave, hold...)
//   target      WHO it fights (threat chart, preference, stickiness, taunt)
//   perception  WHAT it notices (sight cone, hearing, callouts, memory)
//   skillUse    WHEN it casts (weighted / priority / rotation, combos, reserves)
//   morale      WHETHER it dares (breaks, panics, rallies, courage near leaders)
//   squad       HOW the group fights (muster, engage tokens, surround, formation)
//
// A BrainDef is a bundle of axes plus three MACHINES layered on top:
//
//   phases   the HP LADDER — one-way threshold descents (kept from v1)
//   script   the PHASE FSM — Sirus/Mephisto-grade fights: explicit goto
//            transitions (HP gates, timers, cleared-adds, conditions), phase
//            cadences, scripted AIAction choreography. Loops welcome.
//   rules    the condition→behavior DSL — "below half life, become a strafer",
//            "outnumbered, fall back", "every 6-9s, rush in" (impulses v2)
//
// The 13 legacy archetypes survive as PRESETS (ARCHETYPES below) expressed in
// this vocabulary — `brain: { type: 'flanker' }` still works and now means
// "start from the flanker bundle", with every axis overridable per monster.
// NOTHING here imports the world; ai.ts owns the runtime, aiActions.ts the
// choreography verbs. New movement styles / actions are REGISTRY entries.
// ---------------------------------------------------------------------------

import { mod, type Modifier } from './stats';
import type { BuffEffect } from './skills';
import type { MonsterRarity } from './rarity';
import type { Actor } from './actor';

/** Named archetype presets the vocabulary ships with. ('basic' is the default
 *  when no brain is set; 'flee' runs to the nearest exit and leaves the zone.) */
export type BrainType = 'basic'
  | 'swarm' | 'skirmish' | 'caster' | 'bomber' | 'juggernaut' | 'assassin' | 'commander'
  | 'flanker'   // strafing melee: orbits the target at blade's length
  | 'strafer'   // strafing caster: never stops side-stepping while it casts
  | 'pack'      // hangs back until enough packmates surround the prey
  | 'artillery' // extreme range, retreats HARD when approached
  | 'protector' // bodyguard: stays between the threat and its ward
  | 'flee';     // break for the nearest exit and leave the zone (the Beast's retreat)

// --- MOVEMENT ----------------------------------------------------------------

/** The locomotion kernels ai.ts ships. Open-ended: packages may register more
 *  via registerMoveStyle — the `(string & {})` keeps custom ids type-legal
 *  without losing completion on the built-ins. */
export type MoveStyleId =
  | 'approach'    // close to the kit's standoff; kite when keep-distance crowded
  | 'direct'      // relentless closing, never retreats (swarm / juggernaut)
  | 'orbit'       // circle the target at ring distance (flanker)
  | 'weave'       // zigzag approach (bomber's drunken sprint)
  | 'hitAndRun'   // strike once, withdraw, come back around (skirmish)
  | 'slideCast'   // cast → sidestep → cast (strafer's fire-and-slide)
  | 'holdRange'   // stay in a band; HOLD FIRE and run when crowded (artillery)
  | 'backstab'    // stalk to the target's rear arc (assassin)
  | 'interpose'   // stand between the threat and a ward (protector)
  | 'hoverAllies' // hang behind the warband's centroid (commander)
  | 'prowl'       // wide waiting circle around the prey (pack)
  | 'hold'        // stand ground (turrets, ritualists that CAN move but won't)
  | 'retreat'     // run directly away from the target (morale breaks)
  | 'skitter'     // darting bursts with dead-stop pauses (sand-leaper scuttle)
  | 'charge'      // stalk in, then a LOCKED headlong sprint (goring beasts)
  | 'juke'        // erratic flight: random hooks + dead-stop freezes (prey)
  | 'lurk'        // hold off and watch; COMMIT the moment the target looks away
  | (string & {});

/** Locomotion spec: a kernel + knobs. Each kernel reads only what it needs;
 *  unspecified knobs use the kernel's defaults, so specs stay terse. */
export interface MoveSpec {
  style: MoveStyleId;
  /** Movement input multiplier (1 = full march; wanders stroll at 0.35). */
  pace?: number;
  /** orbit/prowl ring distance (default: kit standoff / 270 for prowl). */
  ring?: number;
  /** direct: keep closing while d > desired × closeFrac (swarm presses at 0.8). */
  closeFrac?: number;
  /** holdRange: the range held (default max(kit keepDistance, 380)). */
  hold?: number;
  /** holdRange: [panic, approach] fractions of hold (defaults 0.75 / 1.4). */
  band?: [number, number];
  /** weave: wobble amplitude in radians (default 0.9) and frequency (default 9). */
  weaveAmp?: number;
  weaveFreq?: number;
  /** hitAndRun/backstab: seconds spent withdrawing after a strike. */
  withdraw?: [number, number];
  /** slideCast: seconds of sliding between casts (default [0.5, 1.0]). */
  slide?: [number, number];
  /** orbit: seconds between direction-reroll windows (default [1.2, 2.8]);
   *  chance the reroll actually flips (default 0.4). */
  flipEvery?: [number, number];
  flipChance?: number;
  /** Strafe to reopen a blocked firing lane before anything else (casters). */
  losSeek?: boolean;
  /** Stealth-shroud while stalking; strikes reveal, withdrawal re-cloaks. */
  shroud?: boolean;
  /** skitter: seconds per DART burst (default [0.28, 0.5]) and per dead-stop
   *  PAUSE between darts (default [0.15, 0.45]). */
  dart?: [number, number];
  pause?: [number, number];
  /** charge/lurk: begin the committed rush within this range (default 320;
   *  lurk defaults 260). */
  commitRange?: number;
  /** charge: sprint speed multiplier (default 2.4) and the recovery window
   *  before the next charge (default [2.5, 4.5]). */
  chargeSpeed?: number;
  chargeCooldown?: [number, number];
  /** juke: seconds between random HOOKS (default [0.35, 0.8]), the hook's
   *  half-arc in radians (default 1.2), the chance a hook is instead a
   *  dead-stop FREEZE (default 0.18), and the freeze length (default
   *  [0.2, 0.5]) — the thrown-off-the-scent flight. */
  hookEvery?: [number, number];
  hookArc?: number;
  freezeChance?: number;
  freeze?: [number, number];
  /** lurk: the target counts as LOOKING AWAY beyond this facing offset in
   *  radians (default 1.75 ≈ 100°). */
  unseenArc?: number;
}

// --- TEMPO: the rhythm layer -------------------------------------------------

/** HOW an entity's locomotion BREATHES — orthogonal to the style. Two knobs:
 *
 *  DUTY CYCLE (moveFor/pauseFor): movement runs in bursts with dead stops
 *  between — the hesitation of animals, the repositioning of humans. A paused
 *  entity still CASTS (its clock, not its nerve, stopped) — the pause is the
 *  opening the player capitalizes on.
 *
 *  KITE BUDGET (kite/windedFor): sustained RETREATING movement drains a
 *  stamina window; empty, the entity is WINDED — it cannot backpedal for a
 *  breath (announced tell) though it still fights. Kiters stop being an
 *  exercise in futility, and a monster genuinely FASTER than its pursuer is
 *  finally justified: its legs give out on a rhythm you can learn. */
export interface TempoSpec {
  /** Seconds of movement per burst (rolled; absent = moves freely). */
  moveFor?: [number, number];
  /** Seconds of dead stop between bursts (rolled; requires moveFor). */
  pauseFor?: [number, number];
  /** Seconds of cumulative RETREAT movement before the wind gives out
   *  (recovers at ~0.6/s while not retreating; absent = tireless). */
  kite?: number;
  /** Seconds spent winded when the budget empties (default [1.0, 1.6]). */
  windedFor?: [number, number];
}

// --- TARGETING & THE THREAT CHART ---------------------------------------------

/** Target selection + the aggro ledger. Damage dealt to an actor books threat
 *  against the attacker (world.resolveHit feeds it); healing my prey books
 *  threat against the healer (applyHeal feeds it). The chart is per-victim
 *  bookkeeping — `prefer: 'highestThreat'` is what makes a monster READ it. */
export interface TargetSpec {
  /** The comparator that ranks visible candidates (default 'nearest'). */
  prefer?: 'nearest' | 'farthest' | 'highestThreat' | 'lowestLife' | 'highestLife' | 'random';
  /** A challenger must beat the current target's score × this to steal the
   *  lock (default 1 = free switching; 1.3 = loyal; taunt still overrides). */
  stickiness?: number;
  /** Once aggroed, detection becomes infinite — it NEVER loses you (swarm). */
  relentless?: boolean;
  /** Bosses that cannot be decoy-cheesed ignore taunting actors. */
  ignoreTaunt?: boolean;
  /** Detection-range multiplier while this tuning holds (swarm's 1.4). */
  detectMul?: number;
  /** Score multipliers by unit kind — a minion-hating brute biases 'minion',
   *  an assassin biases 'player' (default 1 each). */
  kindBias?: Partial<Record<'player' | 'minion' | 'mercenary' | 'monster', number>>;
  /** PREDATION: extra hunt-candidates beyond team enemies, matched against a
   *  candidate's tag, faction, or defId (kin — same defId or squad — never
   *  count). ONE-DIRECTIONAL: World.hostileTo makes the predator hostile to
   *  its prey; the prey never wars back — it runs (MoraleSpec.skittish).
   *  Wolves list ['critter']; the meadow does the rest. */
  prey?: string[];
  /** LEASH: beyond this distance from its spawn anchor, the hunter gives up
   *  the chase — drops its lock and walks home (optionally mending on the
   *  way). Guardians guard; they don't marathon. */
  leash?: { radius: number; heal?: boolean };
  /** The chart's bookkeeping weights. */
  threat?: {
    /** Threat booked per point of damage this actor TAKES (default 1). */
    damage?: number;
    /** Threat booked per point an enemy heals this actor's PREY for (default 0.5). */
    heal?: number;
    /** Fraction of every entry that melts per second (default 0.08). */
    decay?: number;
  };
}

// --- PERCEPTION ----------------------------------------------------------------

/** What the actor notices. Extends the v1 cone (MonsterDef.vision still
 *  honored as the legacy spelling; this one wins where both appear). */
export interface PerceptionSpec {
  /** Frontal sight-cone width in degrees (default 150). */
  arcDeg?: number;
  /** All-around hearing as a fraction of detection range (default 0.35). */
  rearMul?: number;
  /** On FRESH acquire, put kin within this radius on alert toward the prey —
   *  the sentry's callout. 0/absent = fights alone. */
  alertShout?: number;
  /** Seconds it remembers a LOST target's last position and stalks it
   *  (default 0 = shrugs and goes back to the watch). */
  memory?: number;
  /** ATTENTION SPAN: the lock LAPSES after this long (rolled) — the actor
   *  simply FORGETS its target and shuffles off in a dim daze (detection
   *  collapses for a breath) unless a landed hit re-stimulates it. The
   *  shambling-zombie stupidity knob; absent = never forgets. */
  attentionSpan?: [number, number];
  /** Scales every alert DURATION imposed on this actor (the stealth-strike
   *  alarm, kin callouts, shouts). 0 = OBLIVIOUS — struck from the shadows,
   *  it forgets the wound the moment you vanish. Default 1. */
  alertMul?: number;
}

// --- MORALE ---------------------------------------------------------------------

/** Whether it dares. A broken actor turns tail (move: retreat, no casting)
 *  until it rallies — distinct from a flee PHASE (which leaves the zone). */
export interface MoraleSpec {
  /** Break below this life fraction. */
  breakAtLife?: number;
  /** Break when enemies outnumber allies by `deficit` within `radius`. */
  breakOutnumbered?: { deficit: number; radius: number };
  /** An ally dying within `radius` panics this actor for `duration` seconds
   *  (chance per death, default 1). */
  panicOnAllyDeath?: { radius: number; duration: number; chance?: number };
  /** Seconds a break lasts before courage returns (default 3). */
  rallyAfter?: number;
  /** Never breaks while its squad leader lives within this radius. */
  boldNearLeader?: number;
  /** SKITTISH (ambient wildlife): panics whenever ANY non-kin actor comes
   *  within radius — hares, songbirds, everything that exists to be chased.
   *  Routs for `duration` (rolled, default [1.2, 2.2]) from the intruder. */
  skittish?: { radius: number; duration?: [number, number] };
}

// --- SKILL POLICY ----------------------------------------------------------------

/** WHEN to cast what. The default stays v1's weighted roll over usable skills
 *  (each skill's `ai.weight`); the other modes give kits a spine. */
export interface SkillPolicy {
  mode?: 'weighted' | 'priority' | 'rotation';
  /** priority: first usable wins; rotation: cycle, skipping the unusable. */
  order?: string[];
  /** Always opened with on a FRESH engagement (falls through if unusable). */
  opener?: string;
  /** After casting `after`, favor `then` within `window` secs (default 4). */
  combos?: { after: string; then: string; window?: number }[];
  /** Held OUT of normal selection; cast the moment `when` holds (checked
   *  against self/target) — "save the heal", "shield at low life". */
  reserve?: { skill: string; when: AICondition }[];
  /** Seconds between cast decisions (default [0.15, 0.4]; swarm hungers at
   *  [0.08, 0.2]). */
  cadence?: [number, number];
  /** Buff/summon skills fire from at least this range (the commander's
   *  bless-from-the-back-line trick). */
  supportRange?: number;
  /** FINESSE: the AI's simulated hand on PLAYER timing mechanics (perfect /
   *  timed cast bars — Snipe's golden window). It always commits the press;
   *  with `chance` the press lands INSIDE the window (the same Perfect! /
   *  Flawless! empower the player earns), otherwise it fumbles outside —
   *  a sniper you can hear practicing. Absent = never presses (a plain cast). */
  finesse?: { chance: number };
}

// --- SQUADS ----------------------------------------------------------------------

/** Group tactics. Squad identity is stamped at spawn (world.spawnPacks and
 *  kin assign squadId/squadLeader); everything here reads it. */
export interface SquadSpec {
  /** Hold at the prowl ring until `count` members (self included) are within
   *  `radius` of the prey — blood up (life < bloodiedAt) commits early. */
  muster?: { count: number; radius: number; bloodiedAt?: number };
  /** At most this many squadmates ENGAGE one target at once; the rest orbit
   *  the ring waiting for a slot — the classic attack-token dance. */
  tokens?: number;
  /** Members fan their approach bearings around the target instead of
   *  forming a conga line. */
  surround?: boolean;
  /** Adopt the squad leader's target (focus fire) while the leader lives. */
  focusLeader?: boolean;
  /** Formation kept while heeling to a live leader out of combat. */
  formation?: 'ring' | 'line' | 'wedge' | 'column' | 'loose';
  /** Formation spacing (default 46). */
  spacing?: number;
  /** The band's answer to its leader falling. */
  onLeaderDeath?: 'scatter' | 'frenzy' | 'none';
  /** IDLE DEMEANOR — how the group carries itself with no foe in sight:
   *  'drill'   the militant column: tight formation march on the leader
   *  'loose'   lackadaisical amble near the leader, with STRAGGLERS who lag
   *            and jog to catch up (stragglerChance per member, stable roll)
   *  'circle'  the leader stands as an IDOL; the rest orbit it slowly
   *  'wander'  everyone drifts independently (the default zone life)
   *  'mixed'   a stable per-member split: some stand vigil, some wander */
  idle?: {
    style: 'drill' | 'loose' | 'circle' | 'wander' | 'mixed';
    /** circle: orbit distance (default spacing × 2.4). */
    ring?: number;
    /** loose: fraction of members who straggle (default 0.35). */
    stragglerChance?: number;
  };
}

// --- THE CONDITION DSL --------------------------------------------------------------

/** One condition bundle — every present field must hold (AND). Rules, phase
 *  gotos, and skill reserves all speak this. */
export interface AICondition {
  /** Own life fraction bounds. */
  lifeBelow?: number;
  lifeAbove?: number;
  /** Current target's life fraction bounds (false when target-less). */
  targetLifeBelow?: number;
  targetLifeAbove?: number;
  /** Distance to the current target (false when target-less). */
  distOver?: number;
  distUnder?: number;
  /** At least `count` living allies within `radius` (kin = same defId only). */
  alliesWithin?: { count: number; radius: number; kin?: boolean };
  /** At least `count` living enemies within `radius`. */
  enemiesWithin?: { count: number; radius: number };
  /** Status / buff / charge state on self or target. */
  hasStatus?: string;
  targetHasStatus?: string;
  hasBuff?: string;
  lacksBuff?: string;
  hasCharge?: { charge: string; min: number };
  /** Line of sight to the current target. */
  los?: boolean;
  /** At least this many seconds since the CURRENT engagement began. */
  sinceEngaged?: number;
  /** Gate each FIRING by this chance (rolled when everything else passes). */
  chance?: number;
}

// --- ACTIONS: the choreography verbs ---------------------------------------------

/** One scripted beat. Fired by phase onEnter/onExit, phase cadences, and
 *  tripped rules — the vocabulary boss fights are WRITTEN in. Implemented in
 *  aiActions.ts (a registry keyed by `do`); positions resolve against the
 *  actor, its current target, and its spawn ANCHOR (stamped at creation). */
/** A radius that may be ABSOLUTE units or a FRACTION of the arena's short
 *  half-extent (floored) — so one collapse spec fits vaults of any size. */
export type ArenaRadius = number | { frac: number; min: number };

export type AIAction =
  | { do: 'announce'; text: string; color?: string; size?: number }
  /** Cast a skill by id THROUGH the normal pipeline (the actor's level, its
   *  stats, its costs — full player parity). `force` skips cost + cast bar
   *  for choreography that must never fizzle. */
  | { do: 'cast'; skill: string; at?: 'target' | 'self' | 'anchor' | 'behindTarget' | 'awayFromTarget' | 'randomNear'; force?: boolean; mult?: number }
  /** Raise minions/adds in a ring around self (or the spawn anchor). `tag`
   *  marks them (ward gates + goto tagCleared read it); `lifespan` for
   *  waves that expire. */
  | { do: 'summon'; monster: string; count?: number; ring?: number; at?: 'self' | 'anchor'; tag?: string; lifespan?: number; rarity?: MonsterRarity; announce?: string }
  | { do: 'teleport'; to: 'awayFromTarget' | 'behindTarget' | 'anchor' | 'nearTarget'; range?: number }
  /** Become UNTARGETABLE until no live actor carries `tag` — the add-gate
   *  (P4 Unmade, every "kill the adds" ward). Announce fires on shatter. */
  | { do: 'ward'; tag: string; announce?: string }
  | { do: 'buff'; buff: BuffEffect }
  /** Alert + aggro kin within radius onto my current target (the callout). */
  | { do: 'shout'; radius: number; duration?: number }
  /** Radial knockback burst — from self, or from the spawn ANCHOR (the
   *  toward-the-void shove); inward = suction. */
  | { do: 'push'; radius: number; strength: number; inward?: boolean; from?: 'self' | 'anchor' }
  /** Telegraphed ground-blast ring(s) around a point — the meteor-volley
   *  pattern, attributed to the ACTOR (its stats scale the damage). `push`
   *  adds an impact knockback radiating from each blast. */
  | { do: 'ring'; skill: string; radius: number; count: number; waves?: number; waveGap?: number; delay?: number; at?: 'self' | 'anchor' | 'target'; zoneRadius?: number; push?: { strength: number; inward?: boolean } }
  /** One telegraphed blast zone at a point (`push` = impact knockback). */
  | { do: 'nova'; skill: string; at?: 'self' | 'anchor' | 'target'; delay?: number; zoneRadius?: number; push?: { strength: number; inward?: boolean } }
  | { do: 'heal'; frac: number }
  | { do: 'shake'; amount: number }
  /** Arena screen-tint (sticky until the next wash; intensity 0 clears). */
  | { do: 'wash'; color: string; intensity: number }
  | { do: 'reward'; gems: number }
  /** Enter the transient flee-to-exit retreat (the Hunt beast's escape). */
  | { do: 'flee' }
  | { do: 'dash'; toward: 'target' | 'away'; speed?: number; duration?: number }
  // --- ARENA TERRAIN (grid zones only; graceful no-ops elsewhere) ------------
  /** COLLAPSE the floor to a disc around the anchor: outside becomes void,
   *  inside becomes `mode`; a dry dais survives at the anchor; optional
   *  air-pocket relief ring (the drowning flood). Repaints on re-sink, so a
   *  fight can shrink its arena phase over phase. */
  | { do: 'arenaSink'; radius: ArenaRadius; mode: 'ground' | 'deep_water'; rectRadius?: number; dais?: number; pockets?: { count: number; radius: number; ringFrac?: number } }
  /** Punch PERMANENT void cracks at a ring around the anchor (never under
   *  the actor); they survive later sinks — the compounding hazard. */
  | { do: 'voidCrack'; count: number; ring: ArenaRadius; radius?: number }
  /** Shrink every air pocket by `by` (floored at `min`) and repaint. */
  | { do: 'shrinkPockets'; by: number; min: number }
  /** Restore the sunken arena to solid ground (exits re-carved) — the
   *  victory beat, usually in onDeath. */
  | { do: 'arenaRestore' }
  /** CLAIM a free structure garrison slot (a tower core) within reach: teleport/
   *  walk in, become anchored, wear the slot's mods while holding it — the
   *  Arreat-plateau imp. `kinds` filters slot kinds (default: any). Pair with
   *  `use: { move: { style: 'garrison' } }` so the holder casts from the perch.
   *  Graceful no-op when no slot is free in range. */
  | { do: 'garrison'; within?: number; kinds?: string[] }
  /** MOUNT the nearest free same-team beast whose MonsterDef.mountSlot
   *  accepts this actor (within reach): teleport to the saddle and RIDE —
   *  carried, casting freely — until dismounted or either party dies. The
   *  D2 siege-beast pattern; graceful no-op with nothing to ride. */
  | { do: 'mount'; within?: number }
  | { do: 'dismount' };

// --- RULES ------------------------------------------------------------------------

/** Condition→behavior. While `when` holds, `use` overrides the tuning; on the
 *  RISING EDGE (or each re-arm for periodic rules) `actions` fire. Impulses
 *  are the periodic special case and remain as sugar. */
export interface BrainRule {
  when: AICondition;
  /** Axis overrides while the rule is active (shallow-merged per axis). */
  use?: BrainTuning;
  /** One-shot beats fired when the rule TRIPS. */
  actions?: AIAction[];
  announce?: string;
  /** Once tripped, stays active this long (rolled) even if `when` lapses. */
  hold?: [number, number];
  /** Re-arm period AFTER a hold ends — makes the rule PERIODIC (impulse v2). */
  every?: [number, number];
  /** Min seconds between edge-firings for aperiodic rules (default 1). */
  cooldown?: number;
  /** Fires a single time, ever (the enrage latch). */
  once?: boolean;
}

// --- THE PHASE MACHINES --------------------------------------------------------------

/** v1 HP-LADDER phase (kept intact: one-way, deepest-threshold wins) — now
 *  optionally carrying axis overrides, entry actions, and cadences. */
export interface BrainPhase {
  /** Entered ONCE life drops to/below this fraction of max (sorted descending). */
  atLifeFrac: number;
  /** Archetype to run while in this phase (omit = keep the base type). */
  type?: BrainType;
  /** Axis overrides while in this phase (richer than `type` alone). */
  use?: BrainTuning;
  /** Stat mods applied while in this phase (e.g. faster + damage-reduced flee). */
  mods?: Modifier[];
  /** Floating text on entry. */
  announce?: string;
  /** Minor reward (gems) dropped on entry. */
  rewardGems?: number;
  /** This phase is a RETREAT: drive the actor to an exit + leave the zone (the
   *  Hunt beast's migration hooks this — it preserves its health across zones). */
  flee?: boolean;
  /** Scripted beats fired on entry. */
  onEnter?: AIAction[];
  /** Recurring beats while the phase holds. */
  cadences?: PhaseCadence[];
}

/** A periodic archetype OVERRIDE layered on the base brain — e.g. a strafer that
 *  rushes the player in a swarm every few seconds. (Sugar for a BrainRule with
 *  `every`; kept for the existing bestiary.) */
export interface BrainImpulse {
  type: BrainType;
  /** Seconds between impulses (rolled in this range). */
  every: [number, number];
  /** Seconds an impulse lasts (rolled in this range). */
  duration: [number, number];
  /** Floating text when it fires. */
  announce?: string;
}

/** A recurring scripted beat while a phase holds. */
export interface PhaseCadence {
  /** Seconds between beats. */
  every: number;
  /** Delay before the FIRST beat (default: `every`). */
  first?: number;
  /** ± random seconds on each beat. */
  jitter?: number;
  actions: AIAction[];
}

/** One explicit transition out of a script phase. ALL present fields must
 *  hold (AND); the array order is the priority. */
export interface PhaseGoto {
  /** Destination: a script index or a PhaseDef.id. */
  to: number | string;
  /** Fires when life ≤ this fraction. */
  atLifeFrac?: number;
  /** Fires after this many seconds IN this phase. */
  after?: number;
  /** Fires when no LIVE actor carries this tag (the adds are dead). */
  tagCleared?: string;
  /** Arbitrary condition gate. */
  when?: AICondition;
}

/** One phase of the SCRIPT FSM — the full boss-fight grammar. Unlike the
 *  ladder, script phases are RE-ENTRANT: `goto` loops express Sirus-style
 *  rotations (volley → melee → volley…) with HP gates that interrupt them. */
export interface PhaseDef {
  /** Optional name for `goto.to` (indexes work too; names read better). */
  id?: string;
  /** Axis overrides while this phase holds (shallow-merged per axis). */
  use?: BrainTuning;
  /** Stat mods applied while this phase holds (sheet source 'aiPhase'). */
  mods?: Modifier[];
  announce?: string;
  rewardGems?: number;
  onEnter?: AIAction[];
  onExit?: AIAction[];
  cadences?: PhaseCadence[];
  /** Transitions, checked in order every tick this phase is current. A phase
   *  with no goto holds forever (the apex). */
  goto?: PhaseGoto[];
}

// --- THE BRAIN -------------------------------------------------------------------------

/** The overridable axis bundle. Every layer of the system (presets, defs,
 *  phases, rules) speaks this shape; resolution shallow-merges per axis. */
export interface BrainTuning {
  /** Archetype preset to START from (each axis individually overridable). */
  type?: BrainType;
  move?: MoveSpec;
  target?: TargetSpec;
  perception?: PerceptionSpec;
  skillUse?: SkillPolicy;
  morale?: MoraleSpec;
  squad?: SquadSpec;
  /** The RHYTHM layer: movement duty cycles + the kite budget (TempoSpec). */
  tempo?: TempoSpec;
}

/**
 * An AI archetype, declared on the monster definition. `type` picks a preset;
 * every axis is overridable; the machines (phases / script / rules / impulses)
 * layer behavior change over time and state on top. The legacy v1 knobs
 * (fuseRange, withdraw, enrage) remain as sugar the normalizer expands.
 */
export interface BrainDef extends BrainTuning {
  /** bomber: arm the fuse within this range of the target (default 50).
   *  Orthogonal to the archetype — ANY brain can be ordnance. */
  fuseRange?: number;
  /** bomber: seconds of armed flashing before the blast (default 0.7). */
  fuseTime?: number;
  /** skirmish / assassin: seconds spent backing off after a strike. */
  withdraw?: number;
  /** juggernaut: enrage below this life fraction (omit = never). Sugar for a
   *  once-rule with a buff action. */
  enrage?: number;
  /** HP-threshold archetype swaps + on-enter hooks (the v1 ladder — kept). */
  phases?: BrainPhase[];
  /** The script FSM. When present it OWNS phase behavior (don't mix with
   *  `phases` — the script wins). */
  script?: PhaseDef[];
  /** Periodic archetype overrides layered on top (sugar; see BrainRule.every). */
  impulses?: BrainImpulse[];
  /** The condition→behavior DSL. */
  rules?: BrainRule[];
  /** DEATH RATTLE: beats fired when this actor dies — vengeance summons,
   *  reward bursts, arena restoration. Runs through the same verb registry
   *  as everything else (kill() invokes it with the corpse as author). */
  onDeath?: AIAction[];
  /** THE CYCLE: a strict LOOPING duty cycle of tuning steps — "hold off,
   *  then rush, then hold off again", each for its rolled window. Lighter
   *  than a script (no gotos, no beats), stricter than rules (exact
   *  alternation, never drifting clocks). Layered UNDER phases/rules, so
   *  sharper machines still override it. */
  cycle?: { use: BrainTuning; for: [number, number] }[];
}

// --- ARCHETYPE PRESETS ------------------------------------------------------------------
//
// The 13 v1 brains, expressed in the vocabulary — the parity proof. A monster
// declaring `brain: { type: 'artillery' }` gets exactly the old conduct; one
// declaring `brain: { type: 'artillery', move: { hold: 500 } }` starts there
// and holds a longer line. Every preset is ordinary data — new archetypes are
// new entries, not new code.

export const ARCHETYPES: Record<BrainType, BrainTuning> = {
  basic: {
    move: { style: 'approach' },
  },
  swarm: {
    move: { style: 'direct', closeFrac: 0.8 },
    target: { relentless: true, detectMul: 1.4 },
    skillUse: { cadence: [0.08, 0.2] },
  },
  skirmish: {
    move: { style: 'hitAndRun', withdraw: [1.6, 1.6] },
  },
  caster: {
    move: { style: 'approach', losSeek: true },
    // Kiting has a WIND: ~3s of backpedal, then it must plant and fight.
    tempo: { kite: 2.8, windedFor: [0.9, 1.4] },
  },
  bomber: {
    move: { style: 'weave' },
    target: { relentless: true, detectMul: 1.4 },
  },
  juggernaut: {
    move: { style: 'direct' },
  },
  assassin: {
    move: { style: 'backstab', shroud: true, withdraw: [1.5, 1.5] },
  },
  commander: {
    move: { style: 'hoverAllies' },
    skillUse: { supportRange: 620 },
    // The commander repositions in composed steps, not a perpetual backpedal.
    tempo: { kite: 2.2, windedFor: [1.0, 1.6] },
  },
  flanker: {
    move: { style: 'orbit' },
  },
  strafer: {
    // The slide cycle is already pausy; the budget only bites its retreats.
    move: { style: 'slideCast', losSeek: true },
    tempo: { kite: 3.2, windedFor: [0.8, 1.2] },
  },
  pack: {
    // The COMMITTED hunt (swarm-hungry): the muster gate forces the waiting
    // prowl until the band has numbers — v1's packBrain → swarmBrain handoff.
    move: { style: 'direct', closeFrac: 0.8 },
    skillUse: { cadence: [0.08, 0.2] },
    squad: { muster: { count: 3, radius: 380, bloodiedAt: 0.9 } },
  },
  artillery: {
    move: { style: 'holdRange' },
    // Even the long gun runs out of legs: ~2.4s of retreat, then WINDED —
    // it plants and fires (still deadly), and you get your window.
    tempo: { kite: 2.4, windedFor: [1.1, 1.7] },
  },
  protector: {
    move: { style: 'interpose' },
  },
  flee: {
    move: { style: 'retreat' },
  },
};

// --- NORMALIZATION ------------------------------------------------------------------------

/** A BrainDef flattened for the runtime: preset + def-level axes pre-merged,
 *  legacy knobs expanded into the vocabulary. Cached per def object. */
export interface NormalizedBrain {
  base: BrainTuning;
  rules: BrainRule[];
  phases?: BrainPhase[];
  script?: PhaseDef[];
  impulses?: BrainImpulse[];
  onDeath?: AIAction[];
  cycle?: { use: BrainTuning; for: [number, number] }[];
  fuseRange?: number;
  fuseTime?: number;
}

/** Shallow-merge tuning layers per AXIS KNOB (later layers win knob-by-knob,
 *  so a phase tweaking only `skillUse.cadence` keeps the preset's mode). */
export function mergeTuning(...layers: (BrainTuning | undefined)[]): BrainTuning {
  const out: BrainTuning = {};
  for (const layer of layers) {
    if (!layer) continue;
    if (layer.type) out.type = layer.type;
    if (layer.move) out.move = { ...out.move, ...layer.move };
    if (layer.target) out.target = { ...out.target, ...layer.target,
      threat: layer.target.threat ? { ...out.target?.threat, ...layer.target.threat } : out.target?.threat };
    if (layer.perception) out.perception = { ...out.perception, ...layer.perception };
    if (layer.skillUse) out.skillUse = { ...out.skillUse, ...layer.skillUse };
    if (layer.morale) out.morale = { ...out.morale, ...layer.morale };
    if (layer.squad) out.squad = { ...out.squad, ...layer.squad };
    if (layer.tempo) out.tempo = { ...out.tempo, ...layer.tempo };
  }
  return out;
}

/** Resolve a tuning LAYER that may name a preset: the preset's axes first,
 *  the layer's own axes over them. */
export function tuningOf(layer: BrainTuning | undefined): BrainTuning {
  if (!layer) return {};
  const preset = layer.type ? ARCHETYPES[layer.type] : undefined;
  return mergeTuning(preset, layer);
}

/** How hard alerts BITE this actor: its brain's perception.alertMul (0 =
 *  oblivious — it forgets the wound the moment you vanish). World.resolveHit
 *  and every shout path scale imposed alert durations through this. */
export function alertScale(actor: Actor): number {
  if (!actor.brain) return 1;
  return normalizeBrain(actor.brain).base.perception?.alertMul ?? 1;
}

const normalized = new WeakMap<BrainDef, NormalizedBrain>();

/** Flatten a BrainDef once: preset + overrides merged, legacy knobs expanded.
 *  WeakMap-cached so per-tick resolution never re-allocates. */
export function normalizeBrain(def: BrainDef): NormalizedBrain {
  const hit = normalized.get(def);
  if (hit) return hit;
  const base = tuningOf({ ...def, type: def.type ?? 'basic' });
  // Legacy knob: withdraw seconds ride into the move spec wholesale.
  if (def.withdraw !== undefined && base.move) {
    base.move = { ...base.move, withdraw: [def.withdraw, def.withdraw] };
  }
  const rules = def.rules ? [...def.rules] : [];
  // Legacy knob: enrage → a once-rule with the canonical fury buff.
  if (def.enrage !== undefined) {
    rules.push({
      when: { lifeBelow: def.enrage },
      once: true,
      announce: 'ENRAGED!',
      actions: [{
        do: 'buff',
        buff: {
          type: 'buff', id: 'enrage', duration: 999,
          mods: [
            mod('damage', 'more', 0.25),
            mod('attackSpeed', 'more', 0.3),
            mod('moveSpeed', 'more', 0.35),
          ],
        },
      }],
    });
  }
  const norm: NormalizedBrain = {
    base,
    rules,
    phases: def.phases,
    script: def.script,
    impulses: def.impulses,
    onDeath: def.onDeath,
    cycle: def.cycle,
    fuseRange: def.fuseRange,
    fuseTime: def.fuseTime,
  };
  normalized.set(def, norm);
  return norm;
}

// --- CONDITION EVALUATION --------------------------------------------------------------------

/** What evalCondition needs from the world — a narrow view so this module
 *  stays runtime-free (ai.ts passes the real thing). */
export interface AICtx {
  time: number;
  actors: readonly Actor[];
  lineOfSight: (a: { x: number; y: number }, b: { x: number; y: number }) => boolean;
}

/** Evaluate one condition bundle (AND semantics). `chance` is NOT rolled here
 *  — it gates discrete FIRINGS and is rolled by the rule/goto runner, so a
 *  per-frame evaluation can't turn 20% into near-certainty. */
export function evalCondition(
  c: AICondition, actor: Actor, target: Actor | null, ctx: AICtx,
): boolean {
  const lifeFrac = actor.life / Math.max(1, actor.maxLife());
  if (c.lifeBelow !== undefined && !(lifeFrac <= c.lifeBelow)) return false;
  if (c.lifeAbove !== undefined && !(lifeFrac >= c.lifeAbove)) return false;
  if (c.targetLifeBelow !== undefined || c.targetLifeAbove !== undefined
    || c.distOver !== undefined || c.distUnder !== undefined
    || c.targetHasStatus !== undefined || c.los !== undefined) {
    if (!target) return false;
    const tFrac = target.life / Math.max(1, target.maxLife());
    if (c.targetLifeBelow !== undefined && !(tFrac <= c.targetLifeBelow)) return false;
    if (c.targetLifeAbove !== undefined && !(tFrac >= c.targetLifeAbove)) return false;
    const d = Math.hypot(target.pos.x - actor.pos.x, target.pos.y - actor.pos.y);
    if (c.distOver !== undefined && !(d >= c.distOver)) return false;
    if (c.distUnder !== undefined && !(d <= c.distUnder)) return false;
    if (c.targetHasStatus !== undefined
      && !target.statuses.some(s => s.id === c.targetHasStatus)) return false;
    if (c.los !== undefined
      && ctx.lineOfSight(actor.pos, target.pos) !== c.los) return false;
  }
  if (c.alliesWithin) {
    let n = 0;
    for (const a of ctx.actors) {
      if (a === actor || a.dead || a.team !== actor.team || a.construct || a.passive) continue;
      if (c.alliesWithin.kin && a.defId !== actor.defId) continue;
      if (Math.hypot(a.pos.x - actor.pos.x, a.pos.y - actor.pos.y) <= c.alliesWithin.radius) n++;
    }
    if (n < c.alliesWithin.count) return false;
  }
  if (c.enemiesWithin) {
    let n = 0;
    for (const a of ctx.actors) {
      if (a.dead || a.team === actor.team || a.passive || a.untargetable) continue;
      if (Math.hypot(a.pos.x - actor.pos.x, a.pos.y - actor.pos.y) <= c.enemiesWithin.radius) n++;
    }
    if (n < c.enemiesWithin.count) return false;
  }
  if (c.hasStatus !== undefined && !actor.statuses.some(s => s.id === c.hasStatus)) return false;
  if (c.hasBuff !== undefined && !actor.buffs.has(c.hasBuff)) return false;
  if (c.lacksBuff !== undefined && actor.buffs.has(c.lacksBuff)) return false;
  if (c.hasCharge && (actor.charges.get(c.hasCharge.charge) ?? 0) < c.hasCharge.min) return false;
  if (c.sinceEngaged !== undefined) {
    if (actor.aiEngagedAt < 0 || ctx.time - actor.aiEngagedAt < c.sinceEngaged) return false;
  }
  return true;
}
