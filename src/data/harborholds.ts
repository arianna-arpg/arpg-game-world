// ---------------------------------------------------------------------------
// THE HARBORHOLD FABRIC — ports as BESIEGED RESIDENCES, every dial.
//
// A mainland port is no longer a dock and a board on an empty shore: it is a
// HARBORHOLD — a walled quay-town found UNDER SIEGE. Break the siege (the
// MUSTER: a triggered wave-defense where the sea's own kin pour at the
// gate-ward) and the hold OPENS into a living town — keeper folk, the harbor
// board, a chandler, a merc captain — with the dock at its quay. Fail, or
// lose a later siege, and the hold BURNS: gates sealed, fires on the walls, a
// long rebuild clock (or a Mortal Essence restoration, paid at the wreckage).
//
// EVERYTHING here is data on two ladders:
//   HOLD_CLASSES — what a hold IS (structure plan, siege tables, timers,
//                  services, prosperity cap) — add a row, get a new kind of
//                  harbor town.
//   HARBORHOLD_CFG.assign — WHICH sea class × port tier wears which hold
//                  class. Islands never assign (bare quays by design — the
//                  isles stay small locales, not towns).
//
// THE PATRONAGE LADDER: each defended siege raises the hold's PROSPERITY;
// service rows activate at prosperity rungs (`at`), so finding a harbor opens
// the map and defending it opens the town — the find-AND-defend incentive is
// the same ladder. A fall knocks prosperity down; the town remembers being
// saved and remembers burning.
//
// Engine half: world/harborholds.ts (pure state helpers + omen source) and
// the World runtime (mint stamp, muster, dress, services). Structures:
// data/structures.ts 'harborhold_*' plans. Probe: balance/probe_harborholds.ts.
// Docs: docs/engine/harborholds.md.
// ---------------------------------------------------------------------------

import type { PresenceEntry } from '../engine/presence';

/** THE PERSISTED STATE — rides ZoneDef.harborhold verbatim into the world
 *  save (pure JSON; the zones array is the store). IDENTITY (which class,
 *  what services) re-derives from data each read — only the MUTABLE facts
 *  persist. Times are WORLD time (World.time — persists with the save). */
export interface HarborholdState {
  /** HOLD_CLASSES row id (re-validated against data at load — a foreign
   *  save's unknown class degrades to the assign default, never crashes). */
  cls: string;
  /** besieged = found/re-besieged: gates sealed, camp at the walls, the
   *  muster horn arms the defense. open = the town lives. fallen = burned:
   *  fires, sealed gates, a rebuild clock (or an essence restoration).
   *  The LIVE defense (waves in flight) is deliberately TRANSIENT — never
   *  persisted; a resume folds back to 'besieged' (the transience law). */
  state: 'besieged' | 'open' | 'fallen';
  /** THE PATRONAGE LADDER (0..cls.prosperityCap): +1 per defended siege,
   *  −HARBORHOLD_CFG.fallPenalty per fall. Gates service rows via `at`. */
  prosperity: number;
  /** Lifetime defended sieges here (flavor + the hold panel's history). */
  defenses: number;
  /** Lifetime falls here. */
  falls: number;
  /** fallen → besieged at this world time (the rebuild clock). */
  rebuildAt?: number;
  /** open: the next recurring siege lands at this world time. */
  siegeAt?: number;
  /** besieged with a DEADLINE (a recurring siege in progress): unbroken by
   *  this world time, the hold falls on its own. Absent on a first-found or
   *  freshly-rebuilt hold — an unfound harbor is never punished. */
  fallAt?: number;
  /** THE BOUNTY BOARD's next posting window (world time) — the plaza posts
   *  writs on the coast's living foes, then rests (HARBORHOLD_CFG.writs). */
  writsAt?: number;
}

/** One activatable town SERVICE — an open registry row. `id` keys any engine
 *  behavior that wants special wiring ('board' relocates the harbor board
 *  inside the walls, 'mercs' arms the port hiring sheet); unknown ids still
 *  plant their npc/doodad — a future service is one row, no engine edit
 *  required until it needs a verb. */
export interface HoldServiceRow {
  id: string;
  /** Min prosperity to activate (0 = with the town itself). */
  at: number;
  /** Friendly scenery NPC seated when active (townsfolk shape). */
  npc?: string;
  /** Service doodad planted when active (a board, a bench, a stall). */
  doodad?: string;
  /** PLAN ANCHOR: the structure plan's legend char this service seats at
   *  (the def's own plan is the single source of placement truth — scan it,
   *  never author coordinates twice). */
  seat: string;
}

/** THE MUSTER — the wave-defense, per hold class. The spawn/aim half rides
 *  the extraction swarm director's proven grammar (rim entry, the fixation
 *  graft onto the gate-ward); the cadence half is DISCRETE WAVES (the classic
 *  'survive N' read), not the seam's continuous pour. */
export interface HoldSiegeSpec {
  /** Survive this many waves and the hold opens. */
  waves: number;
  /** Bodies in wave 1 (rolled), growing +perWave each wave after. */
  batch: [number, number];
  perWave: number;
  /** Living-besieger cap — a stand, not a drowning (extraction's law). */
  fieldCap: number;
  /** Breather between a cleared wave and the next (rolled, seconds). */
  breatherSec: [number, number];
  /** Muster-to-first-wave countdown (positioning time, seconds). */
  armSec: number;
  /** Besieger level over zone level. */
  levelBonus: number;
  /** Rim entry ring off the gate-ward (rolled; never on top of it). */
  entryRadius: [number, number];
  /** THE TIDE — who comes off the water (leveled rows, weightedPick). */
  table: PresenceEntry[];
  /** Chance a body draws from the ZONE'S own population instead (the local
   *  coast joins its sea's siege — biome flavor for free). */
  mixNative: number;
  // --- the FIXATION numbers (the extraction graft, verbatim grammar) --------
  seedThreat: number;
  pulseThreat: number;
  beaconSec: number;
  decay: number;
  stickiness: number;
  // --- THE GATE-WARD (the defended heart at the sealed gate) ----------------
  wardLife: number;
  wardLifePerLevel: number;
  /** THE CAMP WATCH: dormant besiegers PLANTED at the siege camp while the
   *  hold stands besieged (the sentry fabric — texture that wakes: roused by
   *  wounds, mustered into wave 1 when the horn sounds). Drawn from the
   *  class's own tide table at zone level. */
  campWatch: number;
}

/** WHAT A HOLD IS — one row per kind of harbor town (ascending in weight,
 *  keyed by id; the assign map picks per sea class × port tier). */
export interface HoldClassDef {
  id: string;
  /** The town word surfaces speak ("a landing", "a freeport"). */
  label: string;
  /** data/structures.ts plan def raised in the port zone (the walled town). */
  structure: string;
  siege: HoldSiegeSpec;
  /** fallen → besieged after this many world-seconds (the rebuild clock). */
  rebuildSec: number;
  /** open: the next siege lands this long after opening/defending (rolled). */
  siegeEverySec: [number, number];
  /** A recurring siege left unbroken this long fells the hold (seconds from
   *  the siege landing; 0 = a siege never fells it on its own). */
  fallAfterSec: number;
  /** MORTAL ESSENCE restoration price: base + perLevel × zone level. */
  restoreCostBase: number;
  restoreCostPerLevel: number;
  /** Prosperity ceiling — the ladder's top rung for this class. */
  prosperityCap: number;
  services: HoldServiceRow[];
  /** THE SPOILS of a broken siege: xp (× zone level curve) + reward caches
   *  (crackable, each rolls its own loot) at the gate. */
  reward: { xpBase: number; xpPerLevel: number; caches: number };
  /** Port merc hiring (the 'mercs' service): offer count band. Offers are
   *  TEMPLATE-ONLY — the baseline archetypes, the "lower tier" that survives
   *  the level-normalization contract. Veterans and RETIREMENT stay a wilds
   *  exclusive (meta/mercs.ts outposts). */
  mercOffers: [number, number];
}

// --- THE TIDE TABLES (shared rungs, composed per class) ----------------------
// The sea sends what the sea has: shore fauna first, the Drowned Court as the
// water deepens, corsairs where the trade is worth robbing. Envelope levels
// ride the PORT ZONE's level — a high-level coast sends a harder tide.

const TIDE_SHALLOWS: PresenceEntry[] = [
  { id: 'shore_crab', weight: 3 },
  { id: 'tide_skitter', weight: 3 },
  { id: 'drowned_oarsman', weight: 2 },
  { id: 'salt_husk', weight: 2 },
  { id: 'reef_lurcher', weight: 2, presence: { from: 6, fadeIn: 3 } },
];

const TIDE_COURT: PresenceEntry[] = [
  { id: 'tidewrack_shambler', weight: 2, presence: { from: 7, fadeIn: 3 } },
  { id: 'barnacle_knight', weight: 2, presence: { from: 8, fadeIn: 4 } },
  { id: 'tide_vicar', weight: 1, presence: { from: 12, fadeIn: 4 } },
  { id: 'bandit_cutthroat', weight: 2 },
  { id: 'bandit_bruiser', weight: 1, presence: { from: 5, fadeIn: 3 } },
];

const TIDE_DEEPS: PresenceEntry[] = [
  { id: 'anchor_wight', weight: 2, presence: { from: 14, fadeIn: 4 } },
  { id: 'sunken_courtier', weight: 1, presence: { from: 14, fadeIn: 4 } },
  { id: 'deep_thresher', weight: 1, presence: { from: 16, fadeIn: 5 } },
  { id: 'deep_tidecaller', weight: 1, presence: { from: 18, fadeIn: 5 } },
];

// --- SERVICE ROWS (shared shapes; per-class `at` rungs) ----------------------
// Seats are PLAN ANCHOR chars — each harborhold_* structure plan marks them
// ('1' the board, '2' the chandler's counter, '3' the captain's post, '4' the
// harbormaster). The plan is the one source of placement truth.

const SERVICES_CORE: HoldServiceRow[] = [
  { id: 'harbormaster', at: 0, npc: 'townsfolk_harbormaster', seat: '4' },
  { id: 'board', at: 0, doodad: 'harbor_board', seat: '1' },
  { id: 'chandler', at: 1, npc: 'townsfolk_chandler', seat: '2' },
  { id: 'bounty_board', at: 1, doodad: 'bounty_board', seat: '5' },
  { id: 'mercs', at: 2, npc: 'merc_captain', seat: '3' },
];

/** The rows a LANDING is too small to keep (no captain's post, no writ
 *  board — one street, one counter). */
const LANDING_EXCLUDES = new Set(['mercs', 'bounty_board']);

// --- THE FIXATION GRAFT (shared numbers — the extraction idiom) --------------

const FIXATION = {
  seedThreat: 60, pulseThreat: 25, beaconSec: 4, decay: 0.5, stickiness: 1.6,
} as const;

/** THE HOLD CLASSES — what each kind of harbor town is. */
export const HOLD_CLASSES: Record<string, HoldClassDef> = {
  /** A LANDING — a palisade hamlet on a small water: one street, one
   *  counter, a horn on a post. */
  landing: {
    id: 'landing', label: 'landing', structure: 'harborhold_landing',
    siege: {
      waves: 2, batch: [3, 5], perWave: 1, fieldCap: 10,
      breatherSec: [6, 9], armSec: 8, levelBonus: 0, entryRadius: [340, 470],
      table: [...TIDE_SHALLOWS],
      mixNative: 0.25, ...FIXATION,
      wardLife: 240, wardLifePerLevel: 26,
      campWatch: 2,
    },
    rebuildSec: 420, siegeEverySec: [900, 1500], fallAfterSec: 600,
    restoreCostBase: 90, restoreCostPerLevel: 8,
    prosperityCap: 3,
    services: SERVICES_CORE.filter(s => !LANDING_EXCLUDES.has(s.id)),
    reward: { xpBase: 30, xpPerLevel: 8, caches: 2 },
    mercOffers: [0, 0],
  },
  /** A HARBOR TOWN — the working port: walls, a plaza, the board, a
   *  chandler, and a captain mustering blades for coin. */
  harbortown: {
    id: 'harbortown', label: 'harbor town', structure: 'harborhold_town',
    siege: {
      waves: 3, batch: [4, 6], perWave: 1, fieldCap: 14,
      breatherSec: [6, 10], armSec: 10, levelBonus: 0, entryRadius: [360, 500],
      table: [...TIDE_SHALLOWS, ...TIDE_COURT],
      mixNative: 0.25, ...FIXATION,
      wardLife: 320, wardLifePerLevel: 30,
      campWatch: 3,
    },
    rebuildSec: 600, siegeEverySec: [1100, 1800], fallAfterSec: 720,
    restoreCostBase: 140, restoreCostPerLevel: 10,
    prosperityCap: 5,
    services: [...SERVICES_CORE],
    reward: { xpBase: 45, xpPerLevel: 10, caches: 3 },
    mercOffers: [2, 3],
  },
  /** A FREEPORT — the ocean haven's crown: the biggest walls, the deepest
   *  tide against them, the richest ladder above them. */
  freeport: {
    id: 'freeport', label: 'freeport', structure: 'harborhold_freeport',
    siege: {
      waves: 4, batch: [5, 7], perWave: 2, fieldCap: 18,
      breatherSec: [7, 11], armSec: 12, levelBonus: 1, entryRadius: [380, 540],
      table: [...TIDE_SHALLOWS, ...TIDE_COURT, ...TIDE_DEEPS],
      mixNative: 0.2, ...FIXATION,
      wardLife: 420, wardLifePerLevel: 34,
      campWatch: 4,
    },
    rebuildSec: 780, siegeEverySec: [1400, 2200], fallAfterSec: 900,
    restoreCostBase: 220, restoreCostPerLevel: 12,
    prosperityCap: 7,
    services: [...SERVICES_CORE],
    reward: { xpBase: 65, xpPerLevel: 12, caches: 4 },
    mercOffers: [3, 4],
  },
};

/** One RUIN/CAMP dress row — pieces rolled around the town by the pure
 *  roller in world/harborholds.ts. `where` anchors the band: 'rect' inside
 *  the walls, 'rim' the wall line, 'gate' the gate apron. */
export interface HoldDressRow {
  kind: string;
  radius: [number, number];
  count: [number, number];
  where: 'rect' | 'rim' | 'gate';
}

export const HARBORHOLD_CFG = {
  /** WHICH hold class a sea class × port tier wears. Missing tier = that
   *  tier keeps a BARE QUAY (no town — the pre-fabric port). Islands never
   *  consult this (they mint outside the sea-spot path by construction). */
  assign: {
    pond: { cove: 'landing' },
    lagoon: { cove: 'landing' },
    sea: { haven: 'harbortown', cove: 'landing' },
    great_sea: { haven: 'harbortown', cove: 'landing' },
    ocean: { haven: 'freeport', cove: 'harbortown' },
  } as Record<string, { haven?: string; cove?: string }>,
  /** Unknown sea class rows (future ladder growth) default here. */
  assignDefault: { haven: 'harbortown', cove: 'landing' } as { haven?: string; cove?: string },

  /** THE MUSTER HORN: dwell within reach arms the defense (the caravanner
   *  latch discipline). Planted on the gate apron at load. */
  muster: { radius: 96, dwellSec: 0.9 },

  /** THE QUAY (the harbor pair's port half — SEA_CFG.pair): the unwalled
   *  harbor village raised in the PORT zone by the harborcove recipe.
   *  Service seats live in ITS plan (the anchor's walled town keeps the war
   *  and the state); the causeway exit on the ANCHOR side wears
   *  `lock: 'harborhold'` and surfaces these hints while sealed. */
  quay: {
    structure: 'quay_village',
    lockHint: {
      besieged: 'the quay causeway is barred — break the siege at the hold',
      fallen: 'the hold lies in ashes — the causeway waits for its rebuild',
    },
  },

  /** Lifecycle sweep cadence (seconds) — rebuild clocks, siege scheduling,
   *  deadline enforcement. */
  sweepSec: 5,
  /** No recurring siege lands this soon after a hold opens/defends (grace). */
  graceAfterOpenSec: 300,
  /** Prosperity lost on a fall (floored at 0). */
  fallPenalty: 2,
  /** A fallen hold rebuilds to 'besieged' — the coast's foes crept back
   *  while the masons worked; defend it again to reopen. (The one honest
   *  alternative, 'open', is a data flip away.) */
  rebuildTo: 'besieged' as 'besieged' | 'open',

  /** THE WRECKAGE dress (state 'fallen'): fires in the shell, rubble at the
   *  walls, ash at the gate. Deterministic per zone (salted stream). */
  ruinDress: [
    { kind: 'cinder', radius: [10, 16], count: [4, 7], where: 'rect' },
    { kind: 'ember_fissure', radius: [8, 12], count: [2, 4], where: 'rim' },
    { kind: 'rubble', radius: [12, 18], count: [3, 5], where: 'rim' },
    { kind: 'ashfield', radius: [18, 26], count: [2, 3], where: 'gate' },
  ] as HoldDressRow[],
  /** THE SIEGE CAMP dress (state 'besieged'): the tide's beachhead at the
   *  gate — fire, spoil, a raised standard. */
  siegeDress: [
    { kind: 'campfire', radius: [13, 15], count: [1, 1], where: 'gate' },
    { kind: 'hay_bale', radius: [12, 15], count: [1, 3], where: 'gate' },
    { kind: 'firewood_pile', radius: [11, 14], count: [1, 2], where: 'gate' },
    { kind: 'banner_post', radius: [9, 11], count: [1, 2], where: 'gate' },
  ] as HoldDressRow[],
  /** Dress band width outside the wall line ('rim'/'gate' pieces sit within
   *  this of their anchor). */
  dressBand: 70,
  /** Salt for the per-zone dress stream (never the layout's). */
  dressSalt: 0x4a6b0c1d,

  /** THE OMEN (world/omens.ts): a hold under a DEADLINE siege murmurs — and
   *  ages louder — until found. The fabric's one findability channel. */
  omen: {
    lines: [
      'smoke on the water {bearing} — a harbor fights for its walls',
      'sailors speak of fires {bearing}, {dist} out — a port besieged',
      'gulls wheel {bearing} over burning rigging, {dist} away',
    ],
    whisper: 700, reveal: 260, widenPerMin: 30,
  },

  /** Port merc sheet reroll cadence (world-seconds) — the captain finds new
   *  blades while you sail. */
  mercRerollSec: 600,

  /** THE BOUNTY BOARD (service 'bounty_board'): a dwell at the plaza board
   *  posts writs on the coast's LIVING foes — named, rarity-promoted marks
   *  paying the standard writ claim (the bounty fabric's tag-keyed kill
   *  row + bounty_writs_claimed). Then the board rests. */
  writs: { count: [2, 3] as [number, number], cooldownSec: 420, rarity: 'rare', stacks: 1 },

  /** THE LOCAL TIDE (per-biome seasoning rows folded into every siege table
   *  when the port stands on that coast — a gloaming shore sends gloamborn;
   *  weights lean LIGHT: the sea's kin stay the tide's spine). Extensible:
   *  a new coast is one row; dimension seasoning can join the same map. */
  tideBiomes: {
    gloamwood: [
      { id: 'gloomling', weight: 2 }, { id: 'murk_prowler', weight: 1, presence: { from: 8, fadeIn: 3 } },
    ],
    tundra: [
      { id: 'frost_witch', weight: 1, presence: { from: 8, fadeIn: 3 } }, { id: 'ice_golem', weight: 1, presence: { from: 12, fadeIn: 4 } },
    ],
    taiga: [
      { id: 'plains_wolf', weight: 2 }, { id: 'frost_elemental', weight: 1, presence: { from: 9, fadeIn: 3 } },
    ],
    desert: [
      { id: 'dune_stalker', weight: 2 }, { id: 'sand_skitterer', weight: 2 }, { id: 'dune_vulture', weight: 1 },
    ],
    marsh: [
      { id: 'fen_hound', weight: 2 }, { id: 'marsh_toad', weight: 1 },
    ],
  } as Record<string, PresenceEntry[]>,
} as const;

// --- PURE HELPERS (data-side; no engine imports — the leaf stays a leaf) -----

/** The hold class a sea class × port tier wears — null = bare quay. */
export function holdClassFor(seaClsId: string, tier: 'haven' | 'cove'): HoldClassDef | null {
  const row = HARBORHOLD_CFG.assign[seaClsId] ?? HARBORHOLD_CFG.assignDefault;
  const id = row[tier];
  return id ? HOLD_CLASSES[id] ?? null : null;
}

/** Resolve a persisted state's class row — a foreign/renamed id degrades to
 *  the smallest registered class rather than crashing the load. */
export function holdClassOf(state: HarborholdState): HoldClassDef {
  return HOLD_CLASSES[state.cls] ?? HOLD_CLASSES.landing;
}

/** A fresh hold state — found besieged, the discovery beat. */
export function mintHoldState(cls: HoldClassDef): HarborholdState {
  return { cls: cls.id, state: 'besieged', prosperity: 0, defenses: 0, falls: 0 };
}

/** The Mortal Essence restoration price at a zone level. */
export function holdRestoreCost(cls: HoldClassDef, zoneLevel: number): number {
  return Math.round(cls.restoreCostBase + cls.restoreCostPerLevel * Math.max(1, zoneLevel));
}

/** Service rows ACTIVE at a prosperity rung (the patronage ladder read). */
export function holdActiveServices(cls: HoldClassDef, prosperity: number): HoldServiceRow[] {
  return cls.services.filter(s => prosperity >= s.at);
}

/** TOLERANT SANITIZER for a persisted state (foreign saves, hand edits):
 *  null = drop the field entirely (an old save's port stays a bare quay
 *  until its sea re-mints — never a crash). */
export function sanitizeHoldState(raw: unknown): HarborholdState | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.cls !== 'string' || !HOLD_CLASSES[r.cls]) return null;
  const state = r.state === 'besieged' || r.state === 'open' || r.state === 'fallen' ? r.state : 'besieged';
  const num = (v: unknown): number | undefined => typeof v === 'number' && Number.isFinite(v) ? v : undefined;
  const cap = HOLD_CLASSES[r.cls].prosperityCap;
  return {
    cls: r.cls, state,
    prosperity: Math.max(0, Math.min(cap, Math.round(num(r.prosperity) ?? 0))),
    defenses: Math.max(0, Math.round(num(r.defenses) ?? 0)),
    falls: Math.max(0, Math.round(num(r.falls) ?? 0)),
    ...(num(r.rebuildAt) !== undefined ? { rebuildAt: num(r.rebuildAt) } : {}),
    ...(num(r.siegeAt) !== undefined ? { siegeAt: num(r.siegeAt) } : {}),
    ...(num(r.fallAt) !== undefined ? { fallAt: num(r.fallAt) } : {}),
    ...(num(r.writsAt) !== undefined ? { writsAt: num(r.writsAt) } : {}),
  };
}
