// ---------------------------------------------------------------------------
// HOLDFAST — the locked-bonus-exit registry (DATA).
//
// On entering an UNCHARTED zone there's a chance a fortified, LOCKED bonus exit is
// raised in addition to the normal exits — a side path you must EARN. A guardian
// faction holds the gate (the Bandit toll-wardens are the first), and an UNLOCK
// condition opens it (pay Mortal Essence, surrender a gem, cull a faction, clear an
// adjacent event…). Each guardian + condition + reward is one HoldfastDef literal, so
// a new holdfast (a Goblin camp on a cave, a temple gate, a seraphic vigil) is PURE DATA.
//
// THE POCKET MODEL: what a paid gate opens onto is a purchased CUL-DE-SAC — a fresh
// zone minted through the ordinary placement primitive (worldgen placeZoneAt,
// ZoneSpec.pocket) whose ONLY road leads back through the gate. It rides the same
// chart timing as every frontier (eager under EAGER_WORLD_WEB, on-travel otherwise);
// the LOCK gates travel, never the mint. Each def's PocketSpec declares what makes
// its ground worth the toll: a loot BOUNTY (ZoneDef.bounty) and FEATURE floors
// (guaranteed layout rows — a cave mouth, a sky-geyser).
//
// Pure leaf: only declarative types + the registry literals. The engine runtime
// (placeHoldfast / the dwell-pay / the unlock) lives on World; the persistent
// per-zone lock state lives on the HoldfastField overlay. Mirrors encounters.ts.
// ---------------------------------------------------------------------------

import type { ExitRoadSpec } from '../data/zones';
import type { PostSpec } from '../engine/brain';

/** HOW a holdfast opens. Implemented: 'pay-currency' (currency 'mortal') and
 *  'pay-gem' (random-take); the rest are typed for the data model (a future
 *  entry fills in one resolver branch, no type churn). Unimplemented kinds
 *  never roll (the overlay's pickDef fails SAFE — see unlockImplemented). */
export type UnlockKind = 'pay-gem' | 'pay-currency' | 'cull-faction' | 'event-adjacent';

export interface UnlockSpec {
  kind: UnlockKind;
  /** pay-gem: 'random-take' — a warden seizes one loose gem at random. (The old
   *  drop-to-choose bargain retired with the pocket model: the pocket may mint
   *  before the toll is paid, so payment can no longer steer the mint.) */
  payment?: 'random-take';
  /** pay-gem: which loose gem pool to take from (default 'support'). */
  gemKind?: 'support' | 'skill';
  /** pay-currency: which purse pays. 'mortal' = the ACCOUNT's Mortal Essence
   *  (the roguelite meta-currency — a true mid-run essence dump); 'offerings'/
   *  'echoes' typed for future tolls. Toll = cost + costPerLevel × zoneLevel
   *  (holdfastTollCost — the whole curve is data on the def). */
  currency?: 'mortal' | 'offerings' | 'echoes';
  cost?: number;
  costPerLevel?: number;
  /** cull-faction (future): slay N of this faction IN this zone to open. */
  cullFaction?: string; cullCount?: number;
  /** event-adjacent (future): a charted adjacent zone must carry this ledger key. */
  requiresLedger?: string;
}

/** Is this unlock's resolver actually wired in the engine? Only implemented
 *  kinds may roll at a gate — a half-authored future guardian stays dormant
 *  rather than failing open. ONE predicate, shared by the overlay's pickDef
 *  and validation, so "implemented" can never drift between them. */
export function unlockImplemented(u: UnlockSpec): boolean {
  if (u.kind === 'pay-gem') return true;
  if (u.kind === 'pay-currency') return u.currency === 'mortal';
  return false;
}

/** The Mortal-Essence toll a pay-currency guardian asks at a zone level:
 *  cost + costPerLevel × level, floored at 1. Pure def math — the prompt,
 *  the pay path, and the zone-info panel all price through this one gate. */
export function holdfastTollCost(def: HoldfastDef, zoneLevel: number): number {
  const u = def.unlock;
  return Math.max(1, Math.round((u.cost ?? 0) + (u.costPerLevel ?? 0) * Math.max(1, zoneLevel)));
}

export interface RewardSpec {
  /** v1 implements 'open-exit'; the rest are typed for the data model. */
  kind: 'open-exit' | 'open-cave-sidezone' | 'temp-vendor';
  /** open-exit: bias the pocket's level vs the heat-map field (default 0 = obey). */
  destLevelDelta?: number;
  /** temp-vendor (future): a guard who stands a stall instead of barring a path. */
  vendorMonsterId?: string;
  vendorStock?: { supportId?: string; skillId?: string }[];
}

/** WHAT the earned ground is like — the pocket's mint-time enrichment, all
 *  data. Consumed by World.mintHoldfastPocket when the locked frontier
 *  resolves (eagerly or on travel). */
export interface PocketSpec {
  /** LOOT RICHNESS stamped on the minted zone (ZoneDef.bounty): a multiplier
   *  on the kill-path drop-chance gates. 2 = twice the drop events. */
  bounty?: number;
  /** SIDE-FEATURE floors: raise the pocket's layout to at least `min` (up to
   *  `max`) rows of `kind` — lifting an existing row's count range, or adding
   *  the row when the tileset carries none. Any registered doodad-row kind
   *  works ('cave' here, 'sky_geyser' for an aetherial guardian). 'cave' is a
   *  HARD guarantee: the cave-ladder force in generateLayout carves a mouth
   *  even under bespoke generators that never walk def.layout (the field
   *  expanse); other kinds are honest raised rolls through the row grammar. */
  features?: { kind: string; min: number; max?: number }[];
  /** Force the pocket's tileset (default: the heat-map biome at its coord —
   *  the hidden road grows from its own country). */
  tileset?: string;
}

/** WHO holds the gate. The guards are NEUTRAL until provoked — a wounding strike
 *  (past woundFrac) rouses the whole gang within rouseRadius (so accidental splash
 *  never starts a fight). The keeper is the designated dwell-target you pay. */
export interface GuardianSpec {
  factionId: string;
  keeperId: string;
  /** Extra guards posted around the gate (rolled from the faction roster if omitted). */
  rosterIds?: string[];
  count: [number, number];
  /** Actor tag → the AI dormancy gate + the resolveHit rouse (DORMANT_TAGS). */
  neutralTag: string;
  rouseRadius: number;
  woundFrac: number;
  /** DUTY POSTS (brain.ts PostSpec): omitted/true — the default — each warden
   *  keeps the exact stand it was housed at (a gate crew is ON DUTY: shoved,
   *  gale-blown or roused-and-reset, it walks back and re-plants, so the
   *  band — and the parley — is always found AT its gate). `false` = a
   *  drifter crew; a spec tunes slack/pace/hold per guardian. */
  post?: PostSpec | boolean;
}

/** One guardian-at-a-gate definition — the extensible unit. */
export interface HoldfastDef {
  id: string;
  name: string;
  /** BOUNDARY-GATE row (data/boundaryGates.ts) raised INTO the zone's generated
   *  terrain at the bonus-exit portal — the Durance fabric: façade, throat,
   *  arch, posts, braziers and camp dressing are all LAYOUT, directionally
   *  aligned to the exit's own wall (where the hidden road leads on the world
   *  map). The runtime adds only the sealed bar + the wardens. */
  gate: string;
  /** The DIMENSIONS this guardian holds ground in (ZoneDef.dimension ids;
   *  'surface' = the overworld). A zone only rolls guardians whose band lists
   *  its plane — where no def claims a dimension, no holdfast ever rises
   *  (bandits never camp in hell; hell fields its own tithe-gates). Default
   *  ['surface']. */
  dims?: string[];
  /** The sealed-mouth BARRIER doodads raised across the throat while locked
   *  (spliced on unlock). Default 'wall' — the palisade-post painter; '' = an
   *  unbarred, purely warded mouth (the lock alone seals the portal). */
  barKind?: string;
  /** The KEPT ROAD: chance (rolled once per holdfast, stable across re-musters)
   *  that generation carves a traveled way from a source portal to the gate —
   *  the lived-in read. The remaining knobs are the ExitRoadSpec the layout
   *  pipeline consumes verbatim (source portal, gauge, wander). */
  road?: { chance: number } & ExitRoadSpec;
  /** What the earned ground is like (bounty + feature floors) — see PocketSpec. */
  pocket?: PocketSpec;
  guardian: GuardianSpec;
  unlock: UnlockSpec;
  reward: RewardSpec;
  /** Bulletin shown when the player nears the sealed exit. */
  sealedHint: string;
  /** Relative likelihood this guardian is the one rolled at a hosting zone
   *  (weighed only against defs sharing the zone's dimension + level band). */
  weight: number;
  /** Zone-level band this guardian appears in (bandits = low; a temple = high). */
  minLevel: number; maxLevel?: number;
  /** On the LAST guard's death while unpaid: chance the gate bursts open (0 = always
   *  reroute / stays sealed; a small value = a risk/reward gamble). */
  slaughterOpensChance: number;
  /** Map marker for a sealed holdfast (fog:'charted'). */
  marker?: { glyph: string; color: string };
}

/** Global Holdfast knobs carried by the package (the gate config + the registry). */
export interface HoldfastSurge {
  /** Per uncharted-zone base chance a holdfast is raised (×ignitionMul ×encounterDensity). */
  openChance: number;
  /** The OFF-CENTER locales the bonus exit may roll along its wall (fractions
   *  of the side's span — deliberately never 0.5, so a holdfast reads as a
   *  side path, not the main road). */
  exitLocales: number[];
  /** The guardian registry — add an entry, get a new holdfast (pure data). */
  defs: HoldfastDef[];
}

// --- the BANDIT TOLL-GATE: the surface guardian ---------------------------------

const BANDIT_GUARDIAN: GuardianSpec = {
  factionId: 'bandit', keeperId: 'bandit_keeper',
  rosterIds: ['bandit_cutthroat', 'bandit_bruiser'],
  count: [2, 3], neutralTag: 'toll_bandit',
  rouseRadius: 230, woundFrac: 0.66, // only a real wound rouses them — and then the whole gang
};

const BANDIT_MARKER = { glyph: '⚑', color: '#c8a04a' };

/** The wardens ask MORTAL ESSENCE for passage — the account purse, mid-run.
 *  What they guard is worth it: a rich dead-end pocket with a cave under it. */
export const BANDIT_TOLLGATE: HoldfastDef = {
  id: 'bandit_tollgate', name: 'Roadwarden Toll',
  gate: 'toll_gate', guardian: BANDIT_GUARDIAN,
  // The wardens usually keep a road (the lived-in read); the odd toll on raw
  // ground reads as freshly raised. Sourced at the layout's entry anchor, so
  // arriving travelers walk in ON the way that leads to the gate.
  road: { chance: 0.8, from: 'entry' },
  unlock: { kind: 'pay-currency', currency: 'mortal', cost: 15, costPerLevel: 3 },
  reward: { kind: 'open-exit', destLevelDelta: 0 },
  // The earned ground: markedly richer kills, and the wardens always camp
  // over something worth hiding — a cave mouth floors the feature roll.
  pocket: { bounty: 2.25, features: [{ kind: 'cave', min: 1 }] },
  sealedHint: 'the toll-gate bars the way — pay the wardens, or find another road',
  weight: 2, minLevel: 1, slaughterOpensChance: 0.1, marker: BANDIT_MARKER,
};

// --- the DURANCE TITHE-GATE: the underworld guardian ----------------------------
//
// Hell's own toll: a fiend crew squatting a durance-masonry gate, asking the
// only coin a mortal carries that demons want — Mortal Essence, by the point.
// Same fabric as the bandits (dormant-neutral tag, wound-rouse, slaughter
// gamble), different plane, steeper price, richer ground.

const DURANCE_GUARDIAN: GuardianSpec = {
  factionId: 'durance_toll', keeperId: 'brimstone_cantor',
  rosterIds: ['hellhound', 'dread_fiend'],
  count: [2, 3], neutralTag: 'toll_fiend',
  rouseRadius: 250, woundFrac: 0.66,
};

export const DURANCE_TITHEGATE: HoldfastDef = {
  id: 'durance_tithegate', name: 'Durance Tithe-Gate',
  gate: 'durance_gate', guardian: DURANCE_GUARDIAN,
  dims: ['underworld'],
  road: { chance: 0.6, from: 'entry' },
  unlock: { kind: 'pay-currency', currency: 'mortal', cost: 30, costPerLevel: 4 },
  reward: { kind: 'open-exit', destLevelDelta: 1 },
  pocket: { bounty: 2.75, features: [{ kind: 'cave', min: 1 }] },
  sealedHint: 'the tithe-gate stands sealed — the cantor weighs your essence, or your corpse',
  weight: 1, minLevel: 8, slaughterOpensChance: 0.08,
  marker: { glyph: '⚑', color: '#7de84a' },
};

/** The guardian registry (the open seam — a Goblin cave-camp, a temple gate, or
 *  a seraphic VIGIL over a sky-geyser pocket (dims:['aetherial'], features:
 *  [{kind:'sky_geyser',min:1}]) are future literals here, each pure data once
 *  its gate row + guardian roster exist). */
export const HOLDFAST_DEFS: HoldfastDef[] = [BANDIT_TOLLGATE, DURANCE_TITHEGATE];

export const HOLDFAST_SURGE: HoldfastSurge = {
  // RARE by design: a holdfast is a find, not furniture — ~1 in 11 uncharted
  // zones raises one (×density ×pressure; was 0.22 when the toll was a gem).
  openChance: 0.09,
  exitLocales: [0.2, 0.32, 0.68, 0.8],
  defs: HOLDFAST_DEFS,
};
