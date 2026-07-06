// ---------------------------------------------------------------------------
// QUEST FRAMEWORK — declarative, chain-capable directives (DATA).
//
// A QuestDef is offered by a town NPC and, when accepted, GENERATES a zone at an
// approximate coordinate / direction (via worldgen.placeZoneAt), wired into the
// explored graph. The player travels there and completes the zone's objective
// to earn the reward; a quest's reward can flip a ledger key that GATES the next
// quest in the chain (requiresLedger), so "go slay the undead south" → "…then
// the rift east" is pure data. Bounty boards are the same primitive with a
// different giver. Pure leaf: imports only data TYPES, never the engine.
// ---------------------------------------------------------------------------

import type { ObjectiveSpec, PackSpec } from '../data/zones';

/** What KIND of quest this is — drives how many may be held at once (the giver only
 *  hands out a category while it's under its cap). Extensible: add a kind + a cap row.
 *   • campaign — the authored main/side chains (no cap by default).
 *   • bounty   — repeatable board work (future Bounty Boards): a small cap.
 *   • odyssey  — a grand questline (future): only ONE may run at a time.
 *   • vocation — a specialization chain (data/vocations.ts). A FRESH chain is
 *     never auto-accepted — the giver opens the CHOICE menu instead; engaged
 *     chains auto-continue like any quest. One active vocation step at a time. */
export type QuestCategory = 'campaign' | 'bounty' | 'odyssey' | 'vocation';

/** How many quests of each category may be ACTIVE at once. null = no limit. Pure,
 *  configurable data — retune without touching the dwell logic. */
export const QUEST_CATEGORY_CAPS: Record<QuestCategory, number | null> = {
  campaign: null, // the authored chains aren't capped
  bounty: 2,      // board work: hold a couple at a time (configurable default)
  odyssey: 1,     // one grand questline at a time
  vocation: 1,    // one vocation step in flight at a time (the chain is sequential anyway)
};

/** Badge colour per category (journal UI). Typed against QuestCategory so a
 *  new category forces a colour row here. */
export const QUEST_CATEGORY_COLORS: Record<QuestCategory, string> = {
  campaign: '#c8a8e8',
  bounty: '#e0b060',
  odyssey: '#6ad8c0',
  vocation: '#e8c860',
};

/** The default category when a QuestDef omits one. */
export const DEFAULT_QUEST_CATEGORY: QuestCategory = 'campaign';

/** Describes the zone a quest spawns — a directional, biome-forced objective. */
export interface QuestZoneSpec {
  /** Tileset id → biome/theme/name pools (e.g. 'crypt' → grave biome). */
  tileset: string;
  /** Cardinal direction from town the zone is placed toward. */
  direction: 'n' | 's' | 'e' | 'w';
  /** Cardinal steps from town (default 1). */
  distance?: number;
  /** Where the directional projection starts: 'town' (default — today's
   *  behavior) or 'accept' — the zone the player STOOD IN when accepting, so
   *  a field-given chain (a secret vocation's heartwood) unfolds around its
   *  discovery site instead of teleporting home. */
  anchor?: 'town' | 'accept';
  /** 'character' = the player's current level when accepted; or a fixed level. */
  level: 'character' | number;
  objective: ObjectiveSpec;
  /** Forced roster (the quest's horde) — overrides the tileset packs. */
  packsOverride?: PackSpec;
  /** Carry a waypoint home (true for most quests). Set FALSE for a no-fast-travel
   *  arena (e.g. an anti-farm boss the player must trek to each run). */
  forceWaypoint?: boolean;
  /** FOG-OF-WAR find-it: mint the zone UNCHARTED + DISCONNECTED so the player must
   *  explore toward the "?" marker; a road forms on approach. Absent = connected. */
  floating?: boolean;
  /** Force a set-piece arena layout (e.g. 'unmade_vault') regardless of biome. */
  layoutType?: string;
  /** Suppress waypoints within this node-unit radius of the spawned zone (forces a
   *  multi-zone trek to a boss arena — Mephisto-run style). */
  wpExclusionRadius?: number;
  /** A hand-authored SPECIAL arena: fixed theme, no biome doodads / ambient packs /
   *  overlay events / faction spawns (see ZoneDef.special). */
  special?: boolean;
  /** Place the zone where the radial LEVEL field ≈ `level` (a NUMBER), in a seeded
   *  direction — so the arena sits in its proper difficulty BAND (surrounded by
   *  same-level zones), not a fixed cardinal distance from town. Overrides
   *  direction/distance for placement. Requires a numeric `level`. */
  bandPlacement?: boolean;
}

export interface QuestReward {
  xp?: number;
  gems?: number;
  /** Skill/passive points granted on completion (paid into the player's meta,
   *  the same pool a level-up grants). Optional → existing quests unaffected. */
  passivePoints?: number;
  /** VOCATION points granted on completion — the separate currency spent on
   *  vocation mini-trees (data/vocations.ts). Any quest may pay them (the
   *  extensible seam for future point sources beyond the chains themselves). */
  vocationPoints?: number;
  /** GRANT this vocation to the character on completion (the chain's final
   *  step). Routed through world.grantVocation: allocates the free root crest,
   *  writes the account-wide unlock key, respects the per-character cap. */
  grantVocation?: string;
  /** Counters bumped on completion (per-run → per-account on death). Drives the
   *  chain: a later quest's requiresLedger points at one of these keys. */
  ledger?: Record<string, number>;
}

/** Everything a QuestDef.gate predicate may consult — a read-only slice of the
 *  run handed in by the engine (quests stay a pure data leaf; no World import).
 *  Extend this ctx rather than importing engine state into quest defs. */
export interface QuestGateCtx {
  /** The local hero's class id. */
  classId: string;
  /** Vocations already GRANTED to this character. */
  vocations: readonly string[];
  /** Per-run trigger counters (world.ledger). */
  runLedger: Readonly<Record<string, number>>;
  /** Lifetime account counters (account.ledger). */
  accountLedger: Readonly<Record<string, number>>;
}

/** The optional RETURN leg of a quest — town as a hub. After the zone objective
 *  clears, the reward is WITHHELD until the player dwells beside this giver back
 *  home. Absent = the reward pays the moment the zone clears (today's behavior).
 *  A quest/giver concern, kept off the zone's terrain ObjectiveSpec by design. */
export interface QuestTurnIn {
  /** Monster defId(s) of the NPC the player returns to — ANY listed giver
   *  present pays out (a secret chain turns in at its field shrine OR home
   *  at the quartermaster). */
  giver: string | string[];
  /** Bulletin shown when the field objective completes ("Return to …"). */
  prompt?: string;
}

export interface QuestDef {
  id: string;
  /** Monster defId(s) of the giver NPC that offers this — ANY listed giver
   *  present may offer (e.g. a secret chain's field shrine plus, once the
   *  discovery gate passes, the quartermaster back home). */
  giver: string | string[];
  offerLabel: string;
  /** Quest kind → the active-cap it counts against (default 'campaign'). */
  category?: QuestCategory;
  /** Character level the giver starts offering it at. */
  offerAtLevel: number;
  /** Ledger key (per-run OR per-account) that must be ≥1 to offer this — the
   *  chain mechanism (a follow-up quest requires a prior quest's reward key). */
  requiresLedger?: string;
  /** Arbitrary extra availability predicate over the run's read-only gate ctx —
   *  the seam for gates requiresLedger can't express (class checks, RUN-only
   *  step chains, per-character caps). ANDed with every other gate. */
  gate?: (ctx: QuestGateCtx) => boolean;
  /** The vocation chain this quest belongs to (generated vocation steps only).
   *  Drives the choice-menu routing: a FRESH chain's step is offered through
   *  the vocation menu, an ENGAGED chain's next step auto-accepts. */
  vocation?: string;
  zone: QuestZoneSpec;
  reward: QuestReward;
  /** Optional return-to-giver leg: the reward is held until the player comes home
   *  and dwells by the giver (showcasing town as a hub). Absent = pay on clear. */
  turnIn?: QuestTurnIn;
  /** Forward pointer to the next quest in the chain (informational). */
  next?: string;
}
