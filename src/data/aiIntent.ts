// ---------------------------------------------------------------------------
// THE INTENT LAYER's numbers: how a body decides what it wants to do next, as data.
// docs/design/npc-ai-direction.md is the plan (sections 4 and 6). A body opts in
// with the ordinary `intent` brain axis; one without it keeps the plain ready ring
// and picker, byte-identical. Every number below is a starting point for tuning.
// ---------------------------------------------------------------------------

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
  /** THE KITER'S CHOICE (the owner's ruling, 2 November 2026): a body whose ready ranged
   *  skill keeps a distance mostly keeps it once its prey comes inside, as the plain ring
   *  did, but now and then stands and fights instead. Rolled on the body's own die while
   *  the prey is inside that distance, and held for a draw from `holdSec` before it rolls
   *  again, so the pace of a fight changes without flip-flop. Kiting, a body does not walk
   *  in for a skill that works only inside the distance it keeps. */
  kite: { standChance: 0.35, holdSec: [2.5, 5] as [number, number] },
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
  buckets: ['direct', 'approach'],
};

/** A body's own intent settings, over INTENT_CFG. `intent: null` opts a body out, its
 *  kernel bucket's default included. */
export interface IntentSpec {
  /** Override the think range for this body. */
  think?: [number, number];
  /** Override the floor cut for this body. */
  floor?: number;
}
