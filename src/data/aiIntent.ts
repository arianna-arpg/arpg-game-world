// ---------------------------------------------------------------------------
// THE INTENT LAYER's numbers: how a body decides what it wants to do next, as data.
// docs/design/npc-ai-direction.md is the plan (sections 4 and 6). A body opts in
// with the ordinary `intent` brain axis; one without it keeps the plain ready ring
// and picker, byte-identical. Every number below is a starting point for tuning.
// ---------------------------------------------------------------------------

import type { TellSpec } from '../engine/tells';

export const INTENT_CFG = {
  /** The A/B lever. Off, every body plays as if no brain carried an intent axis. The
   *  dev lens flips it live, so a person can feel the difference in the same fight. */
  enabled: true,
  /** How often a body may decide again, in seconds. Each think draws its gap from this
   *  range on the body's own die, and the first is staggered by id, so a pack never
   *  thinks in step. */
  think: [0.55, 0.95] as [number, number],
  /** How long a decision may stand before it lapses (a blocked approach, an intent
   *  that never comes into reach), and how much the standing one is favoured when
   *  the body decides again. */
  commit: { maxSec: [2.2, 3.4] as [number, number], inertia: 1.25 },
  /** Options whose situation (walk, distance, need, setup, repeat) is under this share
   *  of the best are cut before the roll. `ai.weight` is not part of the cut, so a skill
   *  authored rare still fires as often as its weight says. */
  floor: 0.35,
  /** Walking this many seconds to fire halves a skill's appeal. */
  reach: { halfCostSec: 1.2 },
  /** A blow is worth 1. A curse or buff the target or body lacks is worth `nonHit` (as
   *  much as a blow: the fight calls for it), and much less when what it would apply is
   *  already there. */
  need: { nonHit: 1, worn: 0.15 },
  /** A skill used this recently is worth less, so a kit gets used. */
  repeat: { within: 4, mul: 0.6 },
  /** A skill that applies what a payoff in the kit needs is worth this much more while
   *  the target lacks it. */
  setup: 1.5,
  /** Where the feet go for an intent: a ranged one rests inside this share of its own
   *  range, and a melee one at this share of its reach. */
  ring: { rangedMax: 0.9, meleeFrac: 0.8 },
  /** Deliveries that work wherever the body stands: on itself, around it, beside it.
   *  Their AI range says when to use them, not where to stand, so deciding one gives
   *  the feet no place to go and the plain ring keeps them where the rest of the kit
   *  works. A guard's 240 px range once parked melee bodies out of their own reach. */
  placeless: ['self', 'aura', 'summon'],
  /** THE STANCE (phase 7): how a body prefers to fight right now, rolled on its own die
   *  from its mix (STANCE_MIX) and biased by its temperament. Only a body whose feet follow
   *  its decisions, and whose kit keeps a distance with something that works inside it,
   *  has the choice; it absorbs the kiter's choice you ruled (2 November 2026), so a body
   *  in `keep` kites and one that closes stands and fights. A roll holds for its stance's
   *  own time, then the body rolls again; a real event (hit hard, its legs winded, its
   *  distance skill run dry) rolls early, never sooner than `minHoldSec` after the last. */
  stance: {
    /** The A/B lever. Off, no body carries a stance and every kiter keeps its distance. */
    enabled: true,
    /** A skill's reach band, for the stance's score multipliers: near to 90 px, mid to
     *  260, far beyond, as the farm's band_near/mid/far read it. */
    bands: { near: 90, mid: 260 },
    /** Temperament on the roll: each stance's weight is raised to (1 − volatile), so an
     *  unsettled body strays from its kind's habit, and scaled by e^(daringMul × bold ×
     *  daring), so a bold one presses more and a timid one keeps away more. */
    daringMul: 2,
    /** A real event never rolls again sooner than this after the last roll. */
    minHoldSec: 2,
    /** Life lost since the roll, as a share of the whole, that counts as hit hard. */
    struckFrac: 0.15,
    /** THE SHIFT BEAT: a body whose stance changes plants and squares up to its prey for
     *  this long, wearing its new posture, before its feet change direction or its hands
     *  start anything new. */
    shiftBeat: [0.22, 0.38] as [number, number],
  },
  /** THE CHAOS BUDGET (phase 8): now and then a decision may go off book. A body carries a
   *  few tokens (CHAOS_BUDGETS) that refill slowly; when it takes a fresh decision its die
   *  may relax both cuts, its author's order and the floor, for that one decision, and a
   *  token is spent only if a cut option is chosen. Off book means a legal skill from its
   *  own kit at its normal cost and wind-up, never a changed warning or footprint (the
   *  plan's section 5, rule 1), and the prey's ledger caps how many such acts are live
   *  against it. */
  chaos: {
    /** The A/B lever. Off, no decision goes off book. */
    enabled: true,
    /** The budget a body carries unless its intent names one. A dim mind, one whose
     *  brain authors mindless feet (`move.pathing: 'none'`), carries 'none'. */
    default: 'steady',
    /** What a roll that goes off book chooses from. 'join', the plan's words: the cut
     *  options join the normal ones and must win the weighted roll, so they seldom do.
     *  'cut': the cut options alone, so every such roll is a surprise. */
    pick: 'join' as 'join' | 'cut',
    /** An off-book pick must be readable: a wind-up this long (windupOf), or a ground
     *  footprint that warns this long, so the window to answer it is never shorter (the
     *  plan's reaction window, 0.35 s). */
    minBar: 0.35,
    /** SURPRISE PAYS: the extra recovery an off-book cast adds to its own, on the body's
     *  die, planted and with idle hands. */
    extraRecovery: [0.2, 0.3] as [number, number],
    /** How long an off-book act holds its place in the prey's ledger, in seconds. */
    claimSec: 3,
  },
  /** Once its intent can fire, a body presses only that skill (or an instant). While it
   *  waits on a cooldown, or is still more than this many seconds of walking from its
   *  intent's reach, it may press anything else that can fire from where it stands. A
   *  shorter walk is cheaper than a swing and its recovery, so the decision is kept. A
   *  body already in reach that still cannot press its intent (no line of fire, nothing
   *  to target) keeps nothing back: in duels that left hands idle beside a ready claw. */
  enRouteSec: 0.6,
  /** The kernels whose ring follows the intent. The others keep their authored bands,
   *  and their intent chooses only among skills that reach from where they stand. */
  followers: ['approach', 'direct', 'orbit', 'slideCast', 'crossfire', 'charge'],
  /** THE BUCKET ROLLOUT (phase 6): an enemy whose kernel is listed carries the intent
   *  axis without authoring one. Its brain's own `intent` overrides these defaults, and
   *  `intent: null` keeps it on the plain ready ring and picker. */
  buckets: ['direct', 'approach', 'hoverAllies', 'orbit', 'holdRange', 'slideCast'],
};

/** A body's own intent settings, over INTENT_CFG. `intent: null` opts a body out, its
 *  kernel bucket's default included. */
export interface IntentSpec {
  /** Override the think range for this body. */
  think?: [number, number];
  /** Override the floor cut for this body. */
  floor?: number;
  /** Its stance mix, as weights. Absent: its archetype's row in STANCE_MIX. */
  stances?: Partial<Record<StanceId, number>>;
  /** The TEMPERAMENTS row its own temperament is drawn from. Absent: `plain`. */
  temperament?: string;
  /** The CHAOS_BUDGETS row it spends from. Absent: INTENT_CFG.chaos.default, or 'none'
   *  for a dim mind. A rule may raise it by body level, so chaos is earned. */
  chaos?: string;
}

// --- THE CHAOS BUDGETS ---------------------------------------------------------------------
// At think beats of about 0.75 s and one token per 16 s, `steady` keeps off-book decisions
// to about one in twenty, so normal conduct stays learnable (the plan's section 5, rule 4).

export interface ChaosBudget {
  /** Tokens it holds at most; it starts full. 0: no decision ever goes off book. */
  tokens: number;
  /** Seconds to regain one token; a volatile temperament regains them faster. */
  regenSec?: number;
  /** Chance per decision, with a token in hand, that the floor drops. */
  rollPerThink?: number;
  /** The floor that decision uses instead of INTENT_CFG.floor. */
  floor?: number;
  /** Off-book acts live against one prey at once, across every body that fights it. */
  perPrey?: number;
}

export const CHAOS_BUDGETS: Record<string, ChaosBudget> = {
  none: { tokens: 0 },
  steady: { tokens: 1, regenSec: 16, rollPerThink: 0.15, floor: 0.12, perPrey: 1 },
  restless: { tokens: 2, regenSec: 10, rollPerThink: 0.2, floor: 0.08, perPrey: 2 },
  feral: { tokens: 3, regenSec: 5, rollPerThink: 0.35, floor: 0.02, perPrey: 3 },
};

// --- THE STANCES -------------------------------------------------------------------------
// One vocabulary for every body, like the watch rungs: a forward lean means the same on
// any of them, so a player learns it once (the plan's section 5, rule 3).

export type StanceId = 'keep' | 'harry' | 'press';
/** The roll's fixed order, so a body's die always reads the same way. */
export const STANCE_IDS: readonly StanceId[] = ['keep', 'harry', 'press'];

export interface StanceDef {
  /** Score multipliers by a skill's reach band (INTENT_CFG.stance.bands): what this
   *  stance would rather use. A placeless skill (self, aura, summon) is never scaled. */
  near: number; mid: number; far: number;
  /** The share of a ranged decision's keepDistance its feet keep. */
  keepMul: number;
  /** Whether it walks in for a skill that works only inside the distance its kit keeps.
   *  One that does not keeps its distance from a prey who comes inside: it kites. */
  closes: boolean;
  /** Which way a bold temperament tips the roll toward it: −1 away, +1 at the prey. */
  daring: number;
  /** The posture it wears, as a signed lean (data/aiIntent.ts STANCE_TELLS): forward
   *  toward the prey, back off it. */
  lean: number;
  /** How long one roll holds, in seconds, before the body rolls again. */
  holdSec: [number, number];
}

export const STANCES: Record<StanceId, StanceDef> = {
  /** Leans back and drifts out: kites, and throws what reaches. */
  keep: { near: 0.5, mid: 1, far: 1.3, keepMul: 1, closes: false, daring: -1, lean: -0.35, holdSec: [6, 12] },
  /** Weight centred: circles in mid range, walks in for a blow and out for a shot. */
  harry: { near: 1, mid: 1.2, far: 0.8, keepMul: 0.6, closes: true, daring: 0, lean: 0, holdSec: [4, 8] },
  /** Leans in and walks at you: fights at arm's length, and shoots from there. */
  press: { near: 1.6, mid: 1, far: 0.35, keepMul: 0.2, closes: true, daring: 1, lean: 0.6, holdSec: [5, 10] },
};

/** The stance mix by archetype (BrainTuning.type), for a body whose own intent names no
 *  mix. `basic` is every type not listed: the kiter's choice as you ruled it, a kiter that
 *  mostly keeps its distance and now and then stands and fights (decision C18). The others
 *  lean from it the way decision 2 asked: casters close about one fight in four, flankers
 *  and juggernauts in most. They lean rather than override, because an archetype names how
 *  a body moves, not what its kit is: flanker-typed casters and juggernaut-typed bosses
 *  whose damage is ranged lost up to nine tenths of it closing nine fights in ten. Swarm
 *  and pack brains keep `basic`: the ones with a choice to make spit and claw, like the
 *  imp, whose volleys and dry-out rush are its identity; swarming is the closer tokens'
 *  business (decision C19), not a stance. */
export const STANCE_MIX: Record<string, Partial<Record<StanceId, number>>> = {
  basic: { keep: 13, harry: 4, press: 3 },
  caster: { keep: 15, harry: 3, press: 2 },
  strafer: { keep: 15, harry: 3, press: 2 },
  commander: { keep: 13, harry: 3, press: 4 },
  flanker: { keep: 7, harry: 9, press: 4 },
  juggernaut: { keep: 7, harry: 5, press: 8 },
};

// --- TEMPERAMENT ---------------------------------------------------------------------------
// A small stable personality per body, drawn once from its own die inside a named row. In
// this phase it biases the stance roll; the cornered curve (nerve) and the chaos budget
// (volatile) read it later, which is why all three are drawn now: a later reader then
// re-deals nothing.

export interface TemperamentRow {
  bold: [number, number];
  nerve: [number, number];
  volatile: [number, number];
}

export const TEMPERAMENTS: Record<string, TemperamentRow> = {
  plain: { bold: [-0.15, 0.15], nerve: [-0.1, 0.1], volatile: [0, 0.1] },
  veteran: { bold: [0, 0.3], nerve: [0, 0.3], volatile: [0, 0.1] },
  feral: { bold: [-0.3, 0.4], nerve: [-0.4, 0.2], volatile: [0.2, 0.6] },
};

/** What a stance and a temperament wear (engine/tells.ts). Every body carries these rows;
 *  they read zero unless the body holds a stance and a prey, so the rest stay quiet. The
 *  stance's lean snaps with the roll, which the shift beat shows standing still, and a
 *  bold body stands a little larger while a timid one sinks a little, so a player can read
 *  which way it tends before it rolls. */
export const STANCE_TELLS: TellSpec[] = [
  ...STANCE_IDS.filter(id => STANCES[id].lean !== 0).map((id): TellSpec =>
    ({ source: `stance:${id}`, steps: 1, portrait: 0, channel: { kind: 'lean', amp: STANCES[id].lean } })),
  { source: 'temper:bold', band: [0, 0.3], steps: 3, portrait: 0, channel: { kind: 'scale', amp: 0.08 } },
  { source: 'temper:timid', band: [0, 0.3], steps: 3, portrait: 0, channel: { kind: 'scale', amp: -0.06 } },
];
