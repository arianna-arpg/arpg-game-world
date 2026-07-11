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
//   tempo       HOW its clock breathes (movement duty cycles, the kite budget)
//   behavior    HOW its MIND works (aim leading/scatter, reaction lag, the
//               body-aim pivot gate, encircle ring discipline, elbow room) —
//               spectrum LEVERS, composable like the projectile flight axes
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

import type { Vec2 } from '../core/math';
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
  | 'turtle'      // stand ground and face AWAY — present the shell (rear guards)
  | 'retreat'     // run directly away from the target (morale breaks)
  | 'skitter'     // darting bursts with dead-stop pauses (sand-leaper scuttle)
  | 'charge'      // stalk in, then a LOCKED headlong sprint (goring beasts)
  | 'juke'        // erratic flight: random hooks + dead-stop freezes (prey)
  | 'lurk'        // hold off and watch; COMMIT the moment the target looks away
  | (string & {});

/** Locomotion spec: a kernel + knobs. Each kernel reads only what it needs;
 *  unspecified knobs use the kernel's defaults, so specs stay terse. */
export interface MoveSpec {
  /** The locomotion kernel (default 'approach') — optional so a layer can
   *  shift ONE knob (a rule flips pace, a def sets pathing) without
   *  restating the preset's style; mergeTuning folds partial layers. */
  style?: MoveStyleId;
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
  /** HOW the feet find the way (the pathfinding lever, machine-shiftable
   *  like every move knob): 'route' (default) follows the zone's walkable
   *  flow-field — around warren walls AND plains cliff pockets alike
   *  (World.pathField); 'none' steers straight and piles up at whatever
   *  stands in the way — MINDLESSNESS as an authored trait (shamblers
   *  smearing along a wall while the clever thing walks around it). */
  pathing?: 'route' | 'none';
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

// --- BEHAVIOR: the cognition levers -------------------------------------------

/** HOW the mind behind the body works — orthogonal SPECTRUM levers, composable
 *  the way projectile flight axes are: each knob independent, absent = the
 *  classic conduct, and every one shiftable live by the machines (an enraged
 *  phase can gain foresight; a 'bewilder' curse can scatter a sniper's aim,
 *  since the aim knobs read through the stat sheet — see BEHAVIOR_STATS).
 *
 *  The difficulty curve BAKED INTO THE ENTITY, not its numbers: a goblin and
 *  a sylvan can share a kit and feel nothing alike.
 *
 *    aimLead     the marksman's mind: -1 trails where you WERE, 0 aims where
 *                you ARE (the classic), 1 solves where you WILL be (cast time
 *                + flight time against your live velocity)
 *    aimLeadChance  "leads on occasion" — the roll happens PER CAST
 *    aimJitter   sloppy hands: each cast's bearing wobbles by up to ±this
 *    reaction    dim wits: seconds between first sighting and the first cast
 *    castArc     the BODY aims, not the mind: casts hold until the (turn-
 *                clamped) facing bears within this half-arc, and the aim
 *                projects along the body's facing — pair with a low
 *                MonsterDef.turnSpeed and circling the lumberer is the play
 *    encircle    ring discipline: the first `front` claim their approach
 *                bearing; the rest wrap the LARGEST GAP — flanks, then the
 *                back. The anti-conga: a pack that surrounds instead of
 *                shoving its own front rank out of cast range
 *    spacing     elbow room: kin-repulsion while closing, so the charge
 *                arrives as a crescent instead of a bead chain */
export interface BehaviorSpec {
  /** Intercept fraction applied when aiming a cast (default 0 = none;
   *  negative = trailing shots; >1 = overleads). Reads through the sheet as
   *  'aiAimLead', so statuses/auras can bend a mind. */
  aimLead?: number;
  /** Chance PER CAST that the lead is applied at all (default 1). */
  aimLeadChance?: number;
  /** Aim scatter in radians: each cast's bearing wobbles ±this (rolled per
   *  cast; sheet stat 'aiAimJitter'). */
  aimJitter?: number;
  /** BODY-AIMED CASTS: the half-arc (radians) the facing must bear within
   *  before a cast fires — and the aim then projects along the body's actual
   *  facing (bearing error ≤ the arc). Absent = the mind aims, instantly. */
  castArc?: number;
  /** Seconds (rolled per FRESH engagement) between sighting and the first
   *  cast — movement is unaffected; the blade hesitates, not the feet. */
  reaction?: [number, number];
  /** ENGAGEMENT RING: melee slot discipline around one victim.
   *  `front` = how many claim their own approach bearing before later
   *  arrivals wrap to the emptiest arc (default 2); `ring` = bite distance
   *  (default: touching). Claims are per-victim across ALL its attackers,
   *  so mixed mobs coordinate; slots free themselves on death/retarget. */
  encircle?: { front?: number; ring?: number };
  /** Kin elbow-room (px) while closing on a target: a soft repulsion from
   *  the nearest packmate, so approaches fan instead of conga-lining. */
  spacing?: number;
  /** READING THE CAST: a player-brained sidestep out of incoming telegraphs
   *  — un-exploded hostile blast zones covering this body, and enemy CAST
   *  BARS whose stamped ground-aim (or nova reach) covers it. Rolled ONCE
   *  per telegraph (`chance`), the feet move after `reaction` (rolled) —
   *  a dim brute reads the flash too late; a fey reads the wind-up. The
   *  dive is a commitment: a dodging body neither casts nor schemes, and a
   *  body mid-cast of its own CANNOT dive (its commitment is the player's
   *  punish window — castArc lumberers eat what they started). */
  dodge?: {
    /** Chance to read a given telegraph at all (rolled once; default 1). */
    chance?: number;
    /** Seconds between the telegraph appearing and the feet moving
     *  (rolled; default [0.15, 0.35]). */
    reaction?: [number, number];
    /** Clearance beyond the blast edge (default BEHAVIOR_CFG.dodgePad). */
    pad?: number;
    /** Exit geometry: 'nearest' rim point (default), 'away' — out the far
     *  side from the CASTER (ranged minds open distance as they clear),
     *  'lateral' — perpendicular to the caster's line (the player-strafe
     *  dodge: clear the disc, keep your own range). */
    exit?: 'nearest' | 'away' | 'lateral';
  };
  /** POST-CAST RHYTHM: chance, rolled per cast, that the body PLANTS —
   *  feet frozen (hands stay free) until the next cast decision (or
   *  `plantFor`, rolled). The monotony spectrum: 0/absent = always moves
   *  off the shot (the classic weave), 1 = a metronome that stands its
   *  ground and fires — PREDICTABILITY ITSELF as an authored trait — and
   *  everything between breaks the rhythm a player would otherwise learn
   *  in three exchanges. */
  plantChance?: number;
  plantFor?: [number, number];
  /** THE FEINT: chance, rolled per would-be cast (bar casts only), that
   *  the bar is a LIE — begun, held `hold` seconds (rolled), then dropped
   *  with no payload, and the real decision follows fast. Bait for
   *  everything that reads casts: player dodges, dodge minds (their
   *  once-per-telegraph read is SPENT on the fake), punish rules. The
   *  cost is still paid — bluffing isn't free. */
  feint?: { chance: number; hold?: [number, number] };
  /** LIVE AIM — the Puppet-Strings hand: while a target is held, this
   *  actor's aimPos refreshes EVERY TICK onto it (plus `lead` × the
   *  intercept horizon), so guided flights (guidePower — innate or a
   *  granted support like puppet_strings) curve after the prey mid-flight:
   *  a monster dragging its cursor exactly the way the player does. */
  steerAim?: { lead?: number };
  /** DRIVE-DRIVEN IDLE LIFE: with no foe in sight, the body drifts toward
   *  the nearest thing it WANTS — 'prey' walks at its resolved prey list
   *  far beyond sight reach (scent), 'loot' at unclaimed ground shinies
   *  (the scavenger's nose). Layer it from a drive rule and hunger
   *  MIGRATES a pack toward prey-rich ground instead of milling in place;
   *  the fantasy reads even when nobody is fighting. */
  seek?: { what: 'prey' | 'loot'; pace?: number; range?: number };
  /** THE UNWATCHED ADVANCE: while its quarry's FACING bears on this body
   *  (within `arcDeg` of dead-on, default BEHAVIOR_CFG.stalkArc) and the
   *  line of sight is open, every closing step multiplies by `creep`
   *  (default BEHAVIOR_CFG.stalkCreep — 0, a statue). Look away, and it
   *  comes. Facing is the aim-desire every actor already wears, so no new
   *  perception is invented; MOVEMENT only — a watched stalker in reach
   *  still bites, and a broken gaze resumes the advance mid-stride. Pair
   *  with low `turnSpeed` and a lurk style for the full dread. */
  stalk?: { arcDeg?: number; creep?: number };
}

/** The behavior fabric's modular thresholds (avoid-hardcoding: tune here). */
export const BEHAVIOR_CFG = {
  /** Longest future (secs) a leading mind solves for — beyond this even a
   *  perfect shot is a guess not worth making. */
  leadHorizonMax: 1.25,
  /** Hard cap (px) on the lead displacement — no aiming a screen away. */
  leadCap: 300,
  /** Velocity-estimate smoothing rate (per second, EMA) — how fast the
   *  marksman's read of your motion converges. */
  velEmaRate: 6,
  /** Per-frame velocity sample clamp (px/s): teleports read as a blink,
   *  not a ballistic launch. */
  velSampleMax: 900,
  /** Ring slots: minimum angular separation between claims (radians). */
  ringSep: 0.55,
  /** Ring slots: default bite-ring padding beyond touching radii (px). */
  ringPad: 6,
  /** Ring transit: bearing error (radians) beyond which the approach routes
   *  AROUND the ring instead of cutting through the victim. */
  detourArc: 0.7,
  /** Ring transit: how far (radians) each detour waypoint steps toward the
   *  slot, and the transit radius as a fraction of the bite ring. */
  detourStep: 0.85,
  detourRadiusMul: 1.35,
  /** Ring transit: detours apply only within this × the bite ring — from
   *  farther out the chaser heads STRAIGHT for its slot (spiraling around
   *  a moving target is a tail-chase that never closes). */
  detourWithinMul: 2.6,
  /** Spacing: repulsion gain at zero distance (falls off linearly). */
  spacingGain: 0.9,
  /** Stalk: default watched-cone width (degrees, full width) and the
   *  closing-step multiplier while watched (0 = the statue). */
  stalkArc: 70,
  stalkCreep: 0,
  /** Dodge: default clearance beyond a blast's edge (px). */
  dodgePad: 26,
  /** Dodge: default read-to-feet delay window (seconds, rolled). */
  dodgeReaction: [0.15, 0.35] as [number, number],
  /** Dodge: ignore telegraphs further out than this from landing (secs) —
   *  nothing worth diving from announces itself that far ahead. */
  dodgeHorizon: 2.2,
  /** Dodge: the dive itself may not outlive this (secs) — a body that
   *  hasn't cleared the disc by then resumes its own mind. */
  dodgeWindowMax: 1.1,
  /** PET MELEE catches movers: the default intercept fraction PLAYER-SIDE
   *  melee (minions, companions, mercenaries) solves with when its brain
   *  declares no aimLead — the swing stamped where the prey WILL be at
   *  bar's end. Without it, an idly-strafing enemy is immune to a slow pet
   *  as a free baseline (the tamed wolf that never lands a claw). ONE-SIDED
   *  by design: enemy melee prediction stays an authored per-def lever, so
   *  the fairness fix never doubles as a global difficulty bump. Bewilder's
   *  aiAimLead kill zeroes this too: cursed pets flail at ghosts. */
  meleeLead: 0.85,
  /** Feint: default bar-hold before the drop (secs, rolled). */
  feintHold: [0.25, 0.45] as [number, number],
  /** Feint: only bars at least this long can bluff (instants just fire). */
  feintMinBar: 0.15,
  /** Plant: slack past the next cast decision when plantFor is unset. */
  plantPad: 0.15,
  /** steerAim: the intercept horizon (secs) its lead fraction scales. */
  steerHorizon: 0.45,
  /** seek: default nose reach (px) — far past any sight cone. */
  seekRange: 1500,
};

/** The behavior knobs that read THROUGH the actor's stat sheet at cast time
 *  (spec value = the innate base), so mods — curses, auras, ground — can bend
 *  an enemy's mind the way they bend its body. Registered in stats.ts. */
export const BEHAVIOR_STATS = { aimLead: 'aiAimLead', aimJitter: 'aiAimJitter' } as const;

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
   *  an assassin biases 'player' (default 1 each; 'companion' = tamed pets). */
  kindBias?: Partial<Record<'player' | 'minion' | 'mercenary' | 'monster' | 'companion', number>>;
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
  /** SEES THROUGH WALLS (tremor-sense, the burrower's ear to the ground):
   *  perception skips the line-of-sight gate entirely — this mind acquires
   *  and holds prey through any stone. Casting still respects firing lines
   *  (knowing where you are doesn't let a ray through masonry). */
  xray?: boolean;
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
   *  `radius` of the prey — blood up (life < bloodiedAt) commits early.
   *  A muster is a TACTIC, not a lock: the requirement caps at the kin
   *  actually alive to answer (a lone survivor hunts alone), and `patience`
   *  seconds after first sighting the hunger wins and it commits anyway —
   *  no more wolves strafing a slow player to the horizon forever. */
  muster?: { count: number; radius: number; bloodiedAt?: number; patience?: number };
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
   *  'mixed'   a stable per-member split: some stand vigil, some wander
   *  'siege'   the GARRISON posture: the leader stands anchor, RANGED
   *            members claim free structure slots (towers crewed before a
   *            shot is fired — a claim persists into combat), and the
   *            melee rank takes a picket ring around the anchor, eyes OUT */
  idle?: {
    style: 'drill' | 'loose' | 'circle' | 'wander' | 'mixed' | 'siege';
    /** circle/siege: orbit / picket-ring distance (default spacing × 2.4). */
    ring?: number;
    /** loose: fraction of members who straggle (default 0.35). */
    stragglerChance?: number;
    /** siege: slot-claim reach for the ranged rank (default 620). */
    garrisonWithin?: number;
  };
}

// --- DRIVES: the wants layer ---------------------------------------------------

/** A DRIVE is a slow internal METER (0..1) — hunger, wrath, dread, greed —
 *  that drifts on its own clock (`rise` per second, SIGNED: hunger grows,
 *  wrath cools) and JUMPS on events (a kill feeds; a wound stings). A drive
 *  does nothing by itself: RULES read it (AICondition.drive) and shift
 *  conduct at thresholds, machines and the {do:'drive'} verb shove it, and
 *  every layer composes with every other axis. The reward-function seam,
 *  as data: conduct chases what the meter wants — the sated wolf ambles
 *  past the hare it would have run down an hour hungrier. Individual by
 *  default; `share` propagates event jumps to squad kin, so a pack that
 *  eats together sates together (the group-goal lever). */
export interface DriveSpec {
  /** Per-second drift, signed (hunger +0.01 grows; wrath -0.05 cools). */
  rise?: number;
  /** Spawn value, rolled (default [0, 0]). */
  start?: [number, number];
  /** Event jumps, signed: a kill I land (the meal), a wound I take (the
   *  sting), a wound I deal (the taste), a squadmate's death within
   *  earshot (the fear that spreads down a line). */
  onKill?: number;
  onHurt?: number;
  onDealt?: number;
  onAllyDeath?: number;
  /** PACK APPETITE: fraction of my event jumps echoed to squad kin within
   *  earshot — one kill feeds the pack, one wound angers the line. */
  share?: number;
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
  /** READING THE CAST, as a trigger: true = the target is mid-cast (a bar
   *  running or a channel held); a number = ...with at least that many
   *  seconds of bar left. The punish vocabulary — "when he commits, rush"
   *  (rules), "when he commits, shield" (reserves). False = not casting. */
  targetCasting?: boolean | number;
  /** THE WANTS trigger: a named meter sits in the band. Default scope reads
   *  this ACTOR's own drives (BrainDef.drives) — "hunger above 0.6, hunt".
   *  Scope 'faction' reads the actor's FACTION meter and 'global' the world
   *  meter (world/drives.ts via sim.drives) — "while my people's dread runs
   *  high, my nerve thins": one kill feed changes a whole warband's conduct. */
  drive?: { id: string; above?: number; below?: number; scope?: 'faction' | 'global' };
  /** At least this many seconds since the CURRENT engagement began. */
  sinceEngaged?: number;
  /** Gate each FIRING by this chance (rolled when everything else passes). */
  chance?: number;
  /** PACKAGE-EXTENDED conditions: each key names a predicate registered via
   *  registerAICondition (its value rides along as the arg). The last
   *  closed seam of the DSL, opened: new trigger vocabulary is a registry
   *  entry, never an engine edit. Unknown keys are FALSE — a missing
   *  package fails closed, not open. */
  ext?: Record<string, unknown>;
}

/** A package-registered condition predicate (AICondition.ext). */
export type AIConditionFn =
  (actor: Actor, target: Actor | null, ctx: AICtx, arg: unknown) => boolean;

const EXT_CONDITIONS = new Map<string, AIConditionFn>();

/** Open the condition DSL: packages add trigger vocabulary here — the same
 *  contract as registerMoveStyle / registerCommandKind / registerAIAction. */
export function registerAICondition(id: string, fn: AIConditionFn): void {
  EXT_CONDITIONS.set(id, fn);
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
  /** BURROW: if standing on a doodad of `kinds`, submerge and travel
   *  underground to the qualifying patch nearest the target, then ERUPT
   *  (telegraphed emergence AoE = maxLife × damageFrac). The counterplay
   *  is the GROUND: stay off its kinds and the worm can't reach you. */
  | { do: 'burrow'; kinds: string[]; range?: number; damageFrac?: number; emergeRadius?: number; announce?: string }
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
  | { do: 'dismount' }
  /** Shove a WANT (BrainDef.drives): choreography starves, enrages, or
   *  calms — "the ritual feeds the hunger", "the roar spends the wrath". */
  | { do: 'drive'; id: string; add: number }
  /** PACKAGE-EXTENDED verbs: `x_`-prefixed ids dispatch through the open
   *  registry (aiActions.ts registerAIAction) — new choreography is a
   *  registry entry, never an engine edit. Unknown ids no-op with a warn. */
  | { do: `x_${string}`; [key: string]: unknown };

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
  // Every object axis accepts NULL as "CLEAR this axis wholesale" — a later
  // layer stripping even what the preset supplied (mergeTuning). undefined
  // merely abstains (the preset/earlier layer shows through); null erases.
  // The wave frenzy is the first consumer: tempo/morale null = a wave that
  // never pauses and never routs, whatever archetype its bodies came from.
  move?: MoveSpec | null;
  target?: TargetSpec | null;
  perception?: PerceptionSpec | null;
  skillUse?: SkillPolicy | null;
  morale?: MoraleSpec | null;
  squad?: SquadSpec | null;
  /** The RHYTHM layer: movement duty cycles + the kite budget (TempoSpec). */
  tempo?: TempoSpec | null;
  /** The COGNITION layer: aim leading/scatter, reaction lag, the body-aim
   *  pivot gate, encircle ring discipline, elbow room (BehaviorSpec). */
  behavior?: BehaviorSpec | null;
  /** OBEDIENCE (0..1): the chance this actor ACCEPTS an order from the
   *  command fabric (CommandMinionsEffect → ai.ts issueCommand). Unset = 1:
   *  a player's summoned court obeys utterly. An unruly wild pack dials it
   *  low — the warcaller barks and only SOME of the pack heeds. A tuning
   *  knob like any other, so machines shift it live (an enraged phase can
   *  go deaf to orders), and the ISSUER presses against it with the
   *  effect's `discipline` plus its commandDiscipline stat. */
  obedience?: number;
}

/** A STANDING ORDER an actor is under (the command fabric): `kind` names a
 *  handler in the open COMMAND_KINDS registry (ai.ts) that drives the actor
 *  each tick until the order is fulfilled or `until` expires. Issue through
 *  ai.ts issueCommand — it drops the current agenda so the order actually
 *  overrides; a cast already in flight resolves first (moveActor gates the
 *  feet, canUse gates fresh casts). */
export interface CommandState {
  kind: string;
  /** THE MARK: where the order points. */
  pos: Vec2;
  /** World-clock expiry — no order outlives its moment. */
  until: number;
  /** Engagement radius around the mark, kind-interpreted (default
   *  COMMAND_CFG.markRadius): how wide "whatever holds it" reads. */
  radius?: number;
  /** A PINNED QUARRY: the specific foe the order names (point AT a monster
   *  and the whole court converges on THAT one, not the ground it stood on). */
  targetId?: number;
  /** Who gave the order (feedback, future rescind/countermand mechanics). */
  issuerId?: number;
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
  /** THE WANTS (DriveSpec): named slow meters — hunger, wrath — that drift
   *  on their clocks and jump on events; rules read them (AICondition
   *  .drive) and the {do:'drive'} verb shoves them. Conduct chases what
   *  the meters want. */
  drives?: Record<string, DriveSpec>;
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
    // The wait RESOLVES: capped by living kin, and six seconds of circling
    // is all the patience a predator has — then hunger wins.
    squad: { muster: { count: 3, radius: 380, bloodiedAt: 0.9, patience: 6 } },
    // RING DISCIPLINE: two press the face; the rest wrap the flanks and the
    // back instead of shoving their own front rank out of cast range.
    behavior: { encircle: { front: 2 } },
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
  drives?: Record<string, DriveSpec>;
  fuseRange?: number;
  fuseTime?: number;
}

/** Shallow-merge tuning layers per AXIS KNOB (later layers win knob-by-knob,
 *  so a phase tweaking only `skillUse.cadence` keeps the preset's mode).
 *  NULL on an axis CLEARS it wholesale — later layers can strip even what an
 *  archetype preset supplied (undefined merely abstains). The resolved
 *  tuning never carries null: a cleared axis reads as plain absent. */
export function mergeTuning(...layers: (BrainTuning | undefined)[]): BrainTuning {
  const out: BrainTuning = {};
  for (const layer of layers) {
    if (!layer) continue;
    if (layer.type) out.type = layer.type;
    if (layer.move === null) out.move = undefined;
    else if (layer.move) out.move = { ...out.move, ...layer.move };
    if (layer.target === null) out.target = undefined;
    else if (layer.target) out.target = { ...out.target, ...layer.target,
      threat: layer.target.threat ? { ...out.target?.threat, ...layer.target.threat } : out.target?.threat };
    if (layer.perception === null) out.perception = undefined;
    else if (layer.perception) out.perception = { ...out.perception, ...layer.perception };
    if (layer.skillUse === null) out.skillUse = undefined;
    else if (layer.skillUse) out.skillUse = { ...out.skillUse, ...layer.skillUse };
    if (layer.morale === null) out.morale = undefined;
    else if (layer.morale) out.morale = { ...out.morale, ...layer.morale };
    if (layer.squad === null) out.squad = undefined;
    else if (layer.squad) out.squad = { ...out.squad, ...layer.squad };
    if (layer.tempo === null) out.tempo = undefined;
    else if (layer.tempo) out.tempo = { ...out.tempo, ...layer.tempo };
    if (layer.behavior === null) out.behavior = undefined;
    else if (layer.behavior) out.behavior = { ...out.behavior, ...layer.behavior,
      encircle: layer.behavior.encircle
        ? { ...out.behavior?.encircle, ...layer.behavior.encircle } : out.behavior?.encircle };
    if (layer.obedience !== undefined) out.obedience = layer.obedience;
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
    drives: def.drives,
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
  /** FACTION/WORLD WANTS read (world/drives.ts via sim.drives): faction
   *  undefined reads the global meter. */
  factionDrive: (id: string, faction: string | undefined) => number;
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
    || c.targetHasStatus !== undefined || c.los !== undefined
    || c.targetCasting !== undefined) {
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
    if (c.targetCasting !== undefined) {
      // A held channel is an open-ended commitment; a bar has a countdown.
      const cs = target.casting;
      const rem = !cs ? 0
        : cs.mode === 'channel' ? (cs.held ? 999 : 0)
        : Math.max(0, cs.total - cs.elapsed);
      if (c.targetCasting === false && rem > 0) return false;
      if (c.targetCasting === true && rem <= 0) return false;
      if (typeof c.targetCasting === 'number' && rem < c.targetCasting) return false;
    }
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
  if (c.drive) {
    const v = c.drive.scope === 'faction' ? ctx.factionDrive(c.drive.id, actor.faction)
      : c.drive.scope === 'global' ? ctx.factionDrive(c.drive.id, undefined)
      : (actor.drives.get(c.drive.id) ?? 0);
    if (c.drive.above !== undefined && !(v >= c.drive.above)) return false;
    if (c.drive.below !== undefined && !(v <= c.drive.below)) return false;
  }
  if (c.ext) {
    for (const key of Object.keys(c.ext)) {
      const fn = EXT_CONDITIONS.get(key);
      if (!fn || !fn(actor, target, ctx, c.ext[key])) return false;
    }
  }
  return true;
}
