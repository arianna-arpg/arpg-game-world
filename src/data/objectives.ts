// ---------------------------------------------------------------------------
// OBJECTIVE UI TUNABLES — the cross-kind knobs objectives share, as data.
//
// STRAGGLER CHEVRONS: the bounty pass taught us the shape — a hunt stays a
// hunt, but the last stragglers must never become pixel-hunting. The same
// mercy now covers the core kinds: the last few counted enemies of a 'clear'
// and the last spawner of a 'spawners' get edge chevrons, named. Thresholds
// per kind, one row each.
//
// THE OFFERING (kind 'offering'): the altar system (data/shrines.ts) as an
// objective — an altar from the registry stands at a POI and must be FED:
// kills within its field power it, `need` deep. ANY death inside counts —
// credited or not, ambient or not — so a migration herd stampeding through
// the field, or the storm altar's own bolts, do your work for you (the
// interlock is the point). If nothing lives in the zone before the altar is
// sated, the objective STALLS — not lost, just hungry — and any world event
// that spawns new bodies (a migration, a warband, a demon storm) revives it:
// the stall is derived from the living population each frame, never latched.
// ---------------------------------------------------------------------------

import type { World } from '../engine/world';
import { registerAttentionSource, type AttentionPoint } from '../world/attention';
import { lairRows } from '../engine/lairs';
import { landmarkOf, type GeneratedLayout } from '../engine/levelgen';
import { sidezoneOf } from './sidezones';
import type { ObjectiveSpec, ZoneDef } from './zones';

/** THE CONTEST LAW — one contested-presence discipline for every hold-the-
 *  ground objective fixture (survey spires, rift seals, pyre kindlings, dig
 *  sites…): a fixture's progress only BUILDS on ground that is truly held.
 *  Any live counted enemy inside the contest ring STALLS the work (the same
 *  `objectiveCountable` predicate the cull's scoreboard runs, so "cleared"
 *  can never disagree with "counting"); a CROWD (`drainAt`+) actively DRAINS
 *  banked progress — walk away from a half-charged stone and the wilds
 *  smother it back down. Per-kind configs spread these defaults; a zone's
 *  ObjectiveTuning.contest overrides any dial (or `false` waives the law). */
export interface ContestSpec {
  /** Contest ring radius (world units) around the fixture. */
  radius: number;
  /** Live counted enemies at/above this STALL the work (progress freezes). */
  stallAt: number;
  /** …at/above this the crowd DRAINS banked progress (attended or not). */
  drainAt: number;
  /** Banked seconds lost per second while drained (floors at 0). */
  drainPerSec: number;
  /** THE RECOUP (ContestRecoupSpec below) — `false` waives it: contested
   *  time on this ground is simply lost. */
  recoup?: ContestRecoupSpec | false;
}

/** THE RECOUP — the contest law's answer to the perpetual siege: contested
 *  time is not LOST time. While the keeper STANDS the ground but the contest
 *  stalls the work (or an attended crowd drains it), a ghost clock banks the
 *  seconds the stand WOULD have built had the ground been clear — plus the
 *  attended drain's own losses; once the ground truly clears, the build runs
 *  at `boost`× until that debt is repaid. The bar visibly sprints back
 *  toward where the uncontested stand would have put it — never a snap from
 *  empty to full — so a stone besieged in perpetuity still gets somewhere,
 *  while walking away banks nothing (abandonment keeps its full cost). */
export interface ContestRecoupSpec {
  /** Build-rate multiplier while owed seconds remain (≤1 disables repayment). */
  boost: number;
  /** Owed-bank ceiling as a fraction of the fixture's full need — the ghost
   *  never leads the real bar by more than this share of the whole ask. */
  capFrac: number;
  /** Share of ATTENDED drain losses banked on top of the stall's own
   *  seconds (0..1). Unattended drain never banks. */
  drainRefund: number;
}

export const CONTEST_CFG: ContestSpec = {
  radius: 150,
  stallAt: 1,
  drainAt: 4,
  drainPerSec: 0.35,
  recoup: { boost: 2, capFrac: 1, drainRefund: 1 },
} as const;

/** THE CULL (kind 'clear'): the ask is a SHARE of the ground's counted
 *  population — "kill N here", never "find the last body" (that hunt is the
 *  bounty writ's identity). These dials shape the DERIVED ask on ground whose
 *  spec authored nothing; ObjectiveSpec `need` (flat or [min,max] band) and
 *  `frac` override per zone, and the derived ask never exceeds what actually
 *  stands (asking more than the floor holds is just the old full-clear
 *  wearing a broken scoreboard). The EMPTY FLOOR still completes regardless
 *  of the tally — the mercy rule, and the whole law on `all: true` ground. */
export const CLEAR_CFG = {
  /** Share of the FRESH counted population the cull asks for. */
  frac: 0.6,
  /** Clamp band on the derived ask: a hamlet still asks a real fight, a
   *  teeming megazone never asks a hundred heads. */
  min: 4,
  max: 40,
} as const;

export const STRAGGLER_CFG = {
  /** Per-kind chevron thresholds: the pointer wakes when this few remain. */
  clear: { remaining: 3, glyph: '⚔' },
  spawners: { remaining: 1, glyph: '☗' },
  /** Shared straggler tint (the writ accent's quieter cousin). */
  color: '#c8b47a',
} as const;

export const OFFERING_CFG = {
  /** How many offerings sate the altar (rolled off the layout rng — the same
   *  band every re-entry of a remembered seed). ObjectiveSpec.need overrides. */
  need: [8, 12] as [number, number],
  /** Palette + chevron for the hungering altar. */
  accent: '#d8a8ff',
  glyph: '✛',
} as const;

/** THE PRESSURE RAMP — the growth curve of the objective family's spawn-
 *  pressure lanes (the spire operation's reinforcement bleed, the rifts'
 *  pours): a multiplier over BATCH sizes and live CAPS read off the zone's
 *  LIVE level (a Quickened surge rides free), with the arrival cadence
 *  tightening on its own gentler share. A trickle of two bodies is a fight
 *  at level 4 and a nuisance at 50 — the waves objective already scales per
 *  level (WAVE_CFG count.perLevel); this is that law for the trickle lanes.
 *  Piecewise-linear between knots, flat outside them; the ramp stands at
 *  exactly 1 through the opening levels, so low ground keeps today's
 *  numbers to the byte. Per-lane `levelScale: false` (on the config, or an
 *  ObjectiveSpec override) opts a lane out. */
export const PRESSURE_RAMP = {
  /** [zoneLevel, multiplier] knots, ascending. */
  knots: [[6, 1], [15, 1.4], [25, 1.9], [40, 2.6], [60, 3.4]] as ReadonlyArray<readonly [number, number]>,
  /** Share of (mul − 1) applied to arrival CADENCE (interval divisor):
   *  more bodies per beat first, faster beats second — never a spam faucet. */
  cadence: 0.5,
} as const;

/** The ramp's fold: spawn-pressure multiplier at a zone level. */
export function pressureRampAt(level: number): number {
  const k = PRESSURE_RAMP.knots;
  if (level <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) {
    if (level <= k[i][0]) {
      const [l0, m0] = k[i - 1];
      const [l1, m1] = k[i];
      return m0 + (m1 - m0) * ((level - l0) / Math.max(1, l1 - l0));
    }
  }
  return k[k.length - 1][1];
}

/** The cadence divisor at a ramp multiplier (PRESSURE_RAMP.cadence's share
 *  of the climb): arrival intervals divide by this. */
export function pressureRampCadence(mul: number): number {
  return 1 + Math.max(0, mul - 1) * PRESSURE_RAMP.cadence;
}

// ---------------------------------------------------------------------------
// THE ADOPTIVE LANE — the objective reads what the mint actually stood up.
//
// THE LAW (Arianna, 2026-08-03): ADOPTION, NEVER DEPENDENCY. The world mints
// what it mints — lairs by their own predicate rows, den mouths by their own
// chance draws — and the zone's ask then MAY adopt a standing feature as its
// own ("brave the Emberwyrm Barrow" on volcanic ground whose mint actually
// stood the barrow's door). Never the reverse: no spawn is ever forced to
// satisfy an objective, and a zone with nothing adoptable simply never wears
// the adopted kind — structurally weight 0, not a failed promise. The 'lair'
// kind therefore has NO tileset weight row (validate refuses one) and NO
// placement arm of its own: its availability IS the lair fabric's geography.
//
// THE SEAM: worldgen's roll is untouched (byte-identical streams). At zone
// LOAD, after generateLayout has answered every chance draw, World.loadZone
// calls `maybeAdoptObjective(def, layout)` — a PURE, rng-free read (seeded
// hash off the def's own seed, the salted-fork idiom) — and stamps the
// returned spec over a BARE rolled 'clear'. Deterministic per zone: every
// re-entry, save restore and co-op seat re-derives the same verdict. One
// honest consequence, documented: pre-walk map intel shows the minted ask;
// ground a claim stands on re-negotiates at first entry, the same way every
// time (THE CHART'S PROVISO).
//
// TWO ADOPTABLE CLASSES ship (the registry-derived kind — no hand lists):
//   · DEN — a lair row whose landmark is a 'den_mouth' (the standing door's
//     doodad kind = the sidezone kind). The ask is the den country behind
//     the door; completion = that pocket's own objective done, read off the
//     derived pocket id (zero new persistence — completedObjectives and the
//     gateway ledger already carry everything). Conditioned doors
//     (SidezoneDef.when — the King's Barrow's dusk gate) are never adopted:
//     a schedule is destination content, not a zone ask.
//   · HUNT — a lair row whose landmark seeds resident bodies in the zone
//     itself (the Giant's Cairn, the Gnoll Moot). The ask is the claim's
//     kin, pure population state (any death counts; wounded keepers ride
//     Zone Memory free). A claim whose kin also ride the zone's own pack
//     table is NOT offered — the ask must never leak zone-wide.
// ---------------------------------------------------------------------------

export const ADOPT_CFG = {
  /** Kinds the lane may adopt over — only ever the BARE roll of these (no
   *  authored need/frac/all/seal; `adopt: false` waives per zone). */
  overrides: ['clear'] as readonly string[],
  /** Seeded per-zone coin: the share of candidate-bearing ground whose bare
   *  cull re-negotiates into the claim's own ask. `ObjectiveTuning.adopt:
   *  true` skips the coin (adopt whatever stands, always — still never
   *  forcing a spawn). */
  chance: 0.55,
  /** THE PACKAGE CLASS's coin (registerPackageAsk rows below): the share of
   *  guest-bearing loads whose bare cull re-negotiates into the standing
   *  guest's ask. Hashed per (zone, GUEST) — every fresh visitation gets its
   *  own coin ("upon spawning can have a chance", her words 2026-08-03) —
   *  and a row's own `chance` overrides. Runs only where the lair classes
   *  stood aside (a resident claim beats a passing guest). */
  packageChance: 0.5,
  /** THE VENTURE CLASS's coin (registerVentureAsk rows below): the share of
   *  venture-bearing loads whose bare cull re-negotiates into the standing
   *  venture's ask ("open the holdfast"). Hashed per (zone, row, KEY) — a
   *  re-raised venture rolls its own coin — and a row's own `chance`
   *  overrides. Runs after the package guests (a now-or-never window beats
   *  a standing gate) and before the patient riddles. */
  ventureChance: 0.5,
  /** Chevron face for the adopted venture's pointer (the warded prize). */
  ventureGlyph: '⚑',
  /** THE RESOLUTION LATCH (her ruling, 2026-08-07): a resolved venture's own
   *  prose (wonText/lostText) HOLDS the objective HUD line — "the text
   *  remains in sight for a player to see" — released only once BOTH gates
   *  pass: `sec` seconds since the resolution instant AND `kills` credited
   *  kills SINCE it (snapshotted at resolution — the warden murders that
   *  CAUSED a loss never count). Her numbers ("something like ten seconds" /
   *  "at least one entity"), both tweakable dials. Display state only: the
   *  hand-back and the completion bank stay instant (World.objectiveLatch). */
  resolveLinger: { sec: 10, kills: 1 },
  /** THE PUZZLE CLASS's coin (registerPuzzleAsk rows below): the share of
   *  candidate-bearing loads (the row's door standing + the ring authored)
   *  whose bare cull re-negotiates into the riddle's own ask. Hashed per
   *  (zone, row) — standing ground, standing verdict. Runs LAST of the
   *  classes (lair → package → venture → puzzle). */
  puzzleChance: 0.5,
  /** Per-tileset coin overrides, KEYED BY TILESET ID — the ratified rate
   *  lever (a dial here, never a TilesetDef field: tilesets stay mint-pure).
   *  The arithmetic: effective ask share = the table's bare-'clear' share ×
   *  this coin. Ratified 2026-08-04 (Arianna's ~1-in-7): crypt 0.575 ×
   *  (clear 3 / total 11.5) = 15% of graveland zones ask the exhumation;
   *  mournstead 0.44 × (3/11) = 12%. probe_lonecrypt pins the arithmetic
   *  against the LIVE tables so a table retune re-surfaces the dial. */
  puzzleChanceByTileset: { crypt: 0.575, mournstead: 0.44 } as Record<string, number>,
  /** The salted fork's name (hashed with the zone id + seed — no rng stream
   *  anywhere near the draw). */
  salt: 'adopt',
  /** Chevron face for the adopted ask's pointer. */
  glyph: '☖',
  accent: '#d8b46a',
  /** Prose names per lair row (id-prose fallback covers unlisted rows — a
   *  new lair is adoptable the moment it registers, named or not).
   *  THE UNTITLED CLAIM (her ruling, 2026-08-07): LAIR titles left ALL
   *  player-facing objective prose — the pane read, the HUD line, the
   *  completion floater and the chevron label all speak title-free; a
   *  claim's identity lives in its mouth's own distinct visual. These names
   *  remain DATA (the stamp's `title` field, dev surfaces, and the package/
   *  venture classes' pattern) — do not re-wire them into prose casually. */
  titles: {
    frostmaw: 'the Frostmaw',
    giants_cairn: "the Giant's Cairn",
    hag_hovel: "the Hag's Hovel",
    riddle_vault: 'the Riddle Vault',
    barrow_watch: 'the Barrow Watch',
    gnoll_moot: 'the Gnoll Moot',
    bull_maze: 'the Maze',
    wyrm_barrow: 'the Emberwyrm Barrow',
    spinney: 'the Spinney',
    wellspring: 'the Wellspring',
    drake_roost: 'the Drake Roost',
    leviathan_trench: 'the Leviathan Trench',
    kings_barrow: "the King's Barrow",
    marsh_leviathan: 'the Drowned Wallow',
    kilnhoard: 'the Kilnhoard',
    scythe_court: 'the Scythe Court',
    stamping_ground: 'the Stamping Ground',
    rimevault: 'the Rimevault',
    hunts_rest: "the Hunt's Rest",
    tidewomb: 'the Tidewomb',
    drumshell: 'the Drumshell',
    chainworks: 'the Chainworks',
    geode_sett: 'the Geode Sett',
    rimewick_clutch: 'the Rimewick Clutch',
    honeyfold: 'the Honeyfold',
  } as Record<string, string>,
} as const;

/** The claim's prose name (ADOPT_CFG.titles, id-prose fallback). */
export function adoptTitle(lairId: string): string {
  return ADOPT_CFG.titles[lairId] ?? `the ${lairId.replace(/_/g, ' ')}`;
}

/** One adoptable feature the loaded ground actually stands. */
export interface AdoptableCandidate {
  lairId: string;
  title: string;
  mode: 'den' | 'hunt';
  /** DEN: the standing door's doodad kind (= its sidezone kind). */
  mouthKind?: string;
  /** HUNT: the claim's resident def ids (the landmark's spawn table). */
  kin?: string[];
}

// FNV-1a (the holdfast-overlay idiom — a local copy keeps the lane leaf-pure).
function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

// The two class derivations, computed once on first use (all registries have
// settled by the first loadZone). DERIVED, never hand-listed: a lair row is
// adoptable by construction the moment it registers.
let denKindsCache: Map<string, string> | null = null;
/** DEN class derivation: mouth doodad kind → lair id, for every lair row
 *  whose landmark is a den_mouth with a registered, UNCONDITIONED sidezone. */
export function adoptDenMouthKinds(): Map<string, string> {
  if (denKindsCache) return denKindsCache;
  const out = new Map<string, string>();
  for (const row of lairRows()) {
    const lm = landmarkOf(row.landmark);
    if (!lm || lm.builder !== 'den_mouth') continue;
    const mouthKind = typeof lm.params?.mouthKind === 'string' ? lm.params.mouthKind : undefined;
    if (!mouthKind) continue;
    const sz = sidezoneOf(mouthKind);
    // No registered door = no den; a CONDITIONED door (when) keeps its own
    // schedule — destination content, never a zone ask.
    if (!sz || sz.when) continue;
    out.set(mouthKind, row.id);
  }
  denKindsCache = out;
  return out;
}

let huntRowsCache: { lairId: string; kin: string[] }[] | null = null;
/** HUNT class derivation: lair rows whose landmark seeds resident bodies in
 *  the zone itself (spawns table, non-den). */
export function adoptHuntRows(): { lairId: string; kin: string[] }[] {
  if (huntRowsCache) return huntRowsCache;
  const out: { lairId: string; kin: string[] }[] = [];
  for (const row of lairRows()) {
    const lm = landmarkOf(row.landmark);
    if (!lm || !lm.spawns?.table.length) continue;
    if (lm.builder === 'den_mouth' && typeof lm.params?.mouthKind === 'string') continue; // the DEN class owns doors
    out.push({ lairId: row.id, kin: lm.spawns.table.map(e => e.id) });
  }
  huntRowsCache = out;
  return out;
}

// ---------------------------------------------------------------------------
// THE PACKAGE CLASS — content packages as adoptable presences (Arianna,
// 2026-08-03: "an actual applicable content package BE a zone objective …
// the content packages appear as normal, and upon spawning can have a chance
// to become the zone objective").
//
// A package REGISTERS what "a spawned <thing> stands here" means — a presence
// read over its own seat state, a title, and a live view the driver watches —
// and the lane then treats the standing guest exactly like a standing lair:
// adoption at zone load, by hash, never a dependency (the package's own
// spawn/seat logic is byte-untouched; nothing is ever placed FOR the ask).
// Registry-derived like the lair classes: no hand lists anywhere — a package
// is adoptable the moment its overlay module registers a row (the
// registerMarkerSource idiom; overlays/fractures.ts is the debut).
//
// THE SURVIVE CONTRACT (her clause, mechanized in World.updateObjective's
// 'package' case): the ask completes when the player ENGAGED the guest and
// the guest's run then ENDED — success or fail, the package's own verdict is
// its own business — while the player still lives. Dying out from under it
// banks nothing. THE HAND-BACK (the transience doctrine — events borrow the
// world, never own it): a guest that leaves unanswered (idled out, ended
// over a dead player, package uninstalled) REVERTS the ask to the bare cull
// it adopted over — the zone is always completable, and a later guest may
// adopt afresh on its own coin.
// ---------------------------------------------------------------------------

/** The live state of a standing package ask, as the row's own view reads it.
 *  Pure reads over the package's seat + the zone-local run — never writes. */
export interface PackageAskState {
  /** The bound guest still stands in this zone (keyed presence). */
  standing: boolean;
  /** The player has ENGAGED the guest (the fracture's run-over trigger). */
  engaged: boolean;
  /** Where the ask looks right now (HUD/debug; the package's own attention
   *  pointers remain the in-zone chevrons — no second pointer is drawn). */
  pos: { x: number; y: number } | null;
  /** The HUD line while the ask is live (authored capitalized). */
  label: string;
}

/** One package's adoptable presence — registered by the package's own module
 *  (never listed by hand here). */
export interface PackageAskRow {
  /** The package id (keys the row; stamped on the spec as `pkg`). */
  pkg: string;
  /** The ask's prose title (the map pane + HUD speak it; stamped on the
   *  spec so every reader names the guest without a registry in hand). */
  title: string;
  /** THE PRESENCE READ: the standing adoptable guest in this zone as a
   *  STABLE key (null = nothing adoptable stands). Read the package's own
   *  seat state — never force one. The key feeds the per-guest coin and is
   *  stamped on the spec (`key`), so a replaced guest reads stale and the
   *  ask hands back / re-rolls rather than silently rebinding. */
  standing: (world: World, def: ZoneDef) => string | null;
  /** THE LIVE VIEW the driver + HUD watch (World.packageAskView wraps it). */
  view: (world: World, def: ZoneDef, key: string) => PackageAskState;
  /** Adoption coin override (absent = ADOPT_CFG.packageChance). */
  chance?: number;
}

const PACKAGE_ASKS: PackageAskRow[] = [];

/** Register a package's adoptable presence (call at module scope from the
 *  package's overlay file — the registerMarkerSource contract: zero edits
 *  here). Rows are consulted in registration-independent order (sorted by
 *  pkg id) so the verdict never depends on import order. */
export function registerPackageAsk(row: PackageAskRow): void {
  PACKAGE_ASKS.push(row);
}

export function packageAskRow(pkg: string): PackageAskRow | undefined {
  return PACKAGE_ASKS.find(r => r.pkg === pkg);
}

export function packageAskRows(): readonly PackageAskRow[] {
  return [...PACKAGE_ASKS].sort((a, b) => (a.pkg < b.pkg ? -1 : a.pkg > b.pkg ? 1 : 0));
}

/** The package tail of the adoption read: offered only where the lair
 *  classes stood aside. One hash per (zone, guest) — a fresh visitation gets
 *  a fresh coin — rng-free like everything else in the lane. */
function maybePackageAsk(
  def: ZoneDef,
  bare: ObjectiveSpec,
  world: World,
): ObjectiveSpec | null {
  for (const row of packageAskRows()) {
    const key = row.standing(world, def);
    if (!key) continue;
    const h = hashStr(`${ADOPT_CFG.salt}:pkg:${row.pkg}:${def.id}:${def.seed ?? 0}:${key}`);
    if (bare.adopt !== true && (h % 10000) / 10000 >= (row.chance ?? ADOPT_CFG.packageChance)) continue;
    return { kind: 'package', pkg: row.pkg, key, title: row.title };
  }
  return null;
}

// ---------------------------------------------------------------------------
// THE VENTURE CLASS — a standing winnable-or-LOSABLE feature as an adoptable
// ask, THE FAIL ARM's home (Arianna's ruling, 2026-08-04: "OPENING A HOLDFAST
// would work as a zone objective, because a Holdfast can be explicitly failed
// if the player murders the wardens. But if that occurs, and the objective
// actually falls back to its plain cull — no completion — then we actually
// cohere the entire objective a bit better and leave it up to player agency
// once more").
//
// A fabric REGISTERS what "a standing venture" means — a presence read over
// its own durable state, a title, and a live TRI-STATE view the driver
// watches — and the lane then treats the standing venture exactly like a
// standing lair: adoption at zone load, by hash, never a dependency (the
// fabric's spawn/lifecycle logic is byte-untouched; nothing is ever placed
// FOR the ask). Registry-derived like every class (the registerPackageAsk
// contract: rows registered from the fabric's own module — the holdfast
// overlay is the debut, and any HoldfastDef is adoptable the moment it
// registers, def-blind).
//
// THE FAIL ARM (the class's defining grammar, in World.updateObjective's
// 'venture' case): the ask completes ONLY through the venture's own standing
// verbs (verdict 'won' — the toll paid, the gate unbarred, read off the
// fabric's own resolved state; drawn == tested). The player's own actions
// may explicitly FAIL it (verdict 'lost' — the wardens murdered, the gamble
// held), and a lost venture HANDS THE ASK BACK to the bare cull it adopted
// over, IN-VISIT: no completion, no punishment — the zone completes the
// ordinary way (this visit on the empty-floor law, the next load re-deriving
// the cull stamp). This is the package class's guest-gone hand-back grown an
// explicit-failure read: the guest's absence is circumstance, the venture's
// loss is authored by the player's own hand — agency, priced honestly.
// ---------------------------------------------------------------------------

/** The fabric's live verdict for a BOUND venture (the stamped key), as the
 *  row's own view reads it. Pure reads over the fabric's durable state —
 *  never writes; the view must speak the SAME state the fabric's runtime
 *  resolves (the holdfast's `resolved` ledger), never a parallel one. */
export interface VentureAskState {
  /** 'standing' — the venture holds and the ask waits; 'won' — it resolved
   *  through its own verbs (the driver completes); 'lost' — the player's
   *  own actions failed it (THE FAIL ARM: the driver hands the ask back to
   *  the bare cull — no completion, no punishment). A key that no longer
   *  matches the standing venture also reads 'lost' (stale bindings hand
   *  back, never rebind). */
  verdict: 'standing' | 'won' | 'lost';
  /** Where the ask points (the chevron + HUD anchor); null = no pointer. */
  pos: { x: number; y: number } | null;
  /** The HUD line while the ask stands (authored capitalized). */
  label: string;
  /** Completion floater override (absent = "<title> is won!"). */
  wonText?: string;
  /** Hand-back floater override (absent = the class's forfeit line). */
  lostText?: string;
}

/** One fabric's adoptable venture — registered by the fabric's own module
 *  (packages/overlays/holdfast.ts is the debut; never listed by hand here). */
export interface VentureAskRow {
  /** Row id (keys the row + the stamp's `venture`; rows consult sorted —
   *  import-order-proof, the package class's law). */
  id: string;
  /** THE PRESENCE READ: the standing adoptable venture in this zone as a
   *  STABLE key (null = nothing adoptable stands). THE STANDING CONTRACT:
   *  candidacy is only ever the STANDING state — a venture whose view would
   *  read 'won' or 'lost' MUST read null here, so a resolved or failed
   *  venture can never (re-)offer itself and the hand-back converges to the
   *  bare cull instead of flip-flopping. */
  standing: (world: World, def: ZoneDef) => string | null;
  /** The ask's prose title for this stand (resolved once, stamped on the
   *  spec — the holdfast speaks its guardian's own name). */
  title: (world: World, def: ZoneDef, key: string) => string;
  /** THE LIVE VIEW the driver + HUD watch (World.ventureAskView wraps it):
   *  the tri-state verdict for the BOUND key, off the fabric's own state. */
  view: (world: World, def: ZoneDef, key: string) => VentureAskState;
  /** Adoption coin override (absent = ADOPT_CFG.ventureChance). */
  chance?: number;
}

const VENTURE_ASKS: VentureAskRow[] = [];

/** Register a fabric's adoptable venture (call at module scope from the
 *  fabric's own file — the registerPackageAsk contract: zero edits here). */
export function registerVentureAsk(row: VentureAskRow): void {
  VENTURE_ASKS.push(row);
}

export function ventureAskRow(id: string): VentureAskRow | undefined {
  return VENTURE_ASKS.find(r => r.id === id);
}

export function ventureAskRows(): readonly VentureAskRow[] {
  return [...VENTURE_ASKS].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** The venture tail of the adoption read: offered only where the lair
 *  classes AND the package guests stood aside. One hash per (zone, row,
 *  key) — rng-free like the whole lane; the verdict never moves while the
 *  same venture stands. */
function maybeVentureAsk(
  def: ZoneDef,
  bare: ObjectiveSpec,
  world: World,
): ObjectiveSpec | null {
  for (const row of ventureAskRows()) {
    const key = row.standing(world, def);
    if (!key) continue;
    const h = hashStr(`${ADOPT_CFG.salt}:ven:${row.id}:${def.id}:${def.seed ?? 0}:${key}`);
    if (bare.adopt !== true && (h % 10000) / 10000 >= (row.chance ?? ADOPT_CFG.ventureChance)) continue;
    return { kind: 'venture', venture: row.id, key, title: row.title(world, def, key) };
  }
  return null;
}

// ---------------------------------------------------------------------------
// THE PUZZLE CLASS — standing riddle ground as an adoptable ask (Arianna's
// ruling, 2026-08-04: the graveland exhumation asks at ~1-in-7, and the lane
// is THE ADOPTIVE one — "the method that allows more extensibility"; the
// weight-row alternative is DEAD, because a 'puzzle' weight in a table
// shifts its weighted TOTAL and re-rolls every mint of the country — the
// weighted-total cascade — while a registry row here draws NOTHING).
//
// A kit REGISTERS what "the riddle's ground" means — a standing DOOR doodad
// (the den class's detection idiom: the generated layout is the truth) plus
// the PUZZLES preset the ground authors — and the lane then MAY stamp the
// STANDING 'puzzle' objective kind over a bare rolled cull: the placer
// (World.bootPuzzles) stands the pinned ring up as the objective run, the
// standing 'puzzle' driver completes it, and the chest/seals/pane rows all
// already exist. Zero new engine words — the ask is the standing kind,
// aimed.
//
// THE NO-CONJURE LAW: candidacy needs BOTH reads — the row's doodad standing
// in the layout AND the preset in the zone's own `ZoneDef.puzzles` rows (the
// ground authored the riddle as content; the ask adopts it, never conjures
// one the country never wrote). Precedence runs LAST of the classes (lair →
// package → venture → puzzle): a resident claim beats a passing guest beats
// a standing venture beats the patient dead — standing ground can afford to
// wait for a load the others stood aside from, and once stamped the ask is
// permanent (idempotent, like every adopted kind; the ground never leaves,
// so no hand-back arm exists).
// ---------------------------------------------------------------------------

/** One kit's adoptable riddle ground — registered by the kit's own module
 *  (data/lonecrypt.ts is the debut; never listed by hand here). */
export interface PuzzleAskRow {
  /** Row id (keys the row + the probe census; rows consult sorted by id —
   *  import-order-proof, the package class's law). */
  id: string;
  /** THE DETECTION: the standing doodad kind whose presence in the generated
   *  layout marks candidate ground (the sealed grave's own door). */
  doodad: string;
  /** The PUZZLES preset the stamped ask pins ({ kind: 'puzzle', puzzle }) —
   *  the ask names THE ring, never "whatever the placer draws". */
  puzzle: string;
  /** Adoption coin override (absent = ADOPT_CFG.puzzleChance; a tileset row
   *  in ADOPT_CFG.puzzleChanceByTileset OUTRANKS both — the ratified
   *  effective rates are per-country dials). */
  chance?: number;
}

const PUZZLE_ASKS: PuzzleAskRow[] = [];

/** Register a kit's adoptable riddle ground (call at module scope from the
 *  kit's own file — the registerPackageAsk contract: zero edits here). */
export function registerPuzzleAsk(row: PuzzleAskRow): void {
  PUZZLE_ASKS.push(row);
}

export function puzzleAskRows(): readonly PuzzleAskRow[] {
  return [...PUZZLE_ASKS].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** The coin for a row on this ground: the per-tileset dial (the ratified
 *  rate lever) outranks the row's own chance outranks the class default —
 *  explicit undefined-checks so a dial of 0 (a country opted OUT) holds. */
function puzzleAskChance(def: ZoneDef, row: PuzzleAskRow): number {
  const byTs = def.tileset !== undefined ? ADOPT_CFG.puzzleChanceByTileset[def.tileset] : undefined;
  return byTs !== undefined ? byTs : (row.chance !== undefined ? row.chance : ADOPT_CFG.puzzleChance);
}

/** The puzzle tail of the adoption read: offered only where the lair classes
 *  AND the package guests stood aside. One hash per (zone, row) — pure and
 *  rng-free like the whole lane; the verdict never moves. */
function maybePuzzleAsk(
  def: ZoneDef,
  layout: Pick<GeneratedLayout, 'doodads' | 'landmarkSpawns'>,
  bare: ObjectiveSpec,
): ObjectiveSpec | null {
  for (const row of puzzleAskRows()) {
    if (!layout.doodads.some(d => d.kind === row.doodad)) continue;    // no door, no ask
    if (!(def.puzzles ?? []).some(r => r.id === row.puzzle)) continue; // THE NO-CONJURE LAW
    const h = hashStr(`${ADOPT_CFG.salt}:puz:${row.id}:${def.id}:${def.seed ?? 0}`);
    if (bare.adopt !== true && (h % 10000) / 10000 >= puzzleAskChance(def, row)) continue;
    return { kind: 'puzzle', puzzle: row.puzzle };
  }
  return null;
}

/** THE ADOPTION READ — pure and rng-free: given a zone def and its generated
 *  layout, decide whether this ground's BARE rolled cull re-negotiates into a
 *  standing claim's own ask. Null = the roll stands untouched (no candidate,
 *  a non-bare or waived spec, or the seeded coin said no — the CAN, never
 *  MUST, half of the law). Deterministic per (def.id, def.seed).
 *
 *  `world` (optional — the engine's loadZone passes it) opens THE PACKAGE
 *  CLASS: a stamped package ask is re-validated against its guest's presence
 *  (standing ⇒ the stamp holds; gone ⇒ THE HAND-BACK reverts it to the bare
 *  cull, and the load may adopt afresh), and a standing guest may be adopted
 *  where the lair classes stood aside. Without `world` the lair half is
 *  byte-identical to its pre-package behavior. */
export function maybeAdoptObjective(
  def: ZoneDef,
  layout: Pick<GeneratedLayout, 'doodads' | 'landmarkSpawns'>,
  world?: World,
): ObjectiveSpec | null {
  let o = def.objective;
  let reverted: ObjectiveSpec | null = null;
  // THE HAND-BACK: a stamped package ask re-validates its guest every load.
  if (o.kind === 'package') {
    if (!world) return null; // no presence read here (a bare layout probe) — the stamp stands
    const row = packageAskRow(o.pkg);
    if (row && row.standing(world, def) === o.key) return null; // the guest stands — idempotent
    // The guest left unanswered (or was replaced): the bare cull returns, and
    // the rest of the read may adopt afresh — a new guest on its own coin.
    o = reverted = { kind: 'clear' };
  }
  // THE FAIL ARM's load half: a stamped venture ask re-validates its verdict
  // every load. 'standing' and 'won' both hold the stamp (a won-but-unbanked
  // edge completes on the driver's first frame; a banked zone keeps its
  // name on the pane); 'lost' — or the row's fabric gone from this world —
  // hands the ask back to the bare cull, and the rest of the read may adopt
  // afresh (the failed venture itself never re-offers: candidacy reads only
  // the STANDING state — THE STANDING CONTRACT on VentureAskRow.standing).
  if (o.kind === 'venture') {
    if (!world) return null; // no fabric read here (a bare layout probe) — the stamp stands
    const row = ventureAskRow(o.venture);
    if (row && row.view(world, def, o.key).verdict !== 'lost') return null;
    o = reverted = { kind: 'clear' };
  }
  // Only the BARE roll of an override kind — authored asks are sovereign.
  if (!ADOPT_CFG.overrides.includes(o.kind) || def.special) return reverted;
  if (o.kind === 'clear' && (o.all || o.need !== undefined || o.frac !== undefined)) return reverted;
  if (o.seal !== undefined || o.adopt === false) return reverted;

  // What actually STANDS, from the generated layout alone (pure data).
  const candidates: AdoptableCandidate[] = [];
  const dens = adoptDenMouthKinds();
  const seenKinds = new Set<string>();
  for (const d of layout.doodads) {
    const lairId = dens.get(d.kind);
    if (!lairId || seenKinds.has(d.kind)) continue;
    seenKinds.add(d.kind);
    candidates.push({ lairId, title: adoptTitle(lairId), mode: 'den', mouthKind: d.kind });
  }
  const spawnedIds = new Set((layout.landmarkSpawns ?? []).map(s => s.id));
  const packIds = new Set((def.packs?.table ?? []).map(p => p.id));
  for (const row of adoptHuntRows()) {
    if (!row.kin.some(id => spawnedIds.has(id))) continue; // nothing of it stands
    // Kin that also ride the zone's own pack table would leak the ask
    // zone-wide ("fell every gnoll on the downs") — structurally not offered.
    if (row.kin.some(id => packIds.has(id))) continue;
    candidates.push({ lairId: row.lairId, title: adoptTitle(row.lairId), mode: 'hunt', kin: row.kin });
  }
  if (candidates.length) {
    // ONE seeded verdict per zone: the coin, then the pick — both off the same
    // salted hash (no rng stream moves; every load re-derives byte-identically).
    const h = hashStr(`${ADOPT_CFG.salt}:${def.id}:${def.seed ?? 0}`);
    if (o.adopt === true || (h % 10000) / 10000 < ADOPT_CFG.chance) {
      candidates.sort((a, b) => (a.lairId < b.lairId ? -1 : a.lairId > b.lairId ? 1 : 0));
      const pick = candidates[Math.floor(h / 10000) % candidates.length];
      return pick.mode === 'den'
        ? { kind: 'lair', lairId: pick.lairId, title: pick.title, mouthKind: pick.mouthKind }
        : { kind: 'lair', lairId: pick.lairId, title: pick.title, kin: pick.kin };
    }
  }
  // THE PACKAGE CLASS tail (maybePackageAsk) — a standing guest may take the
  // ask only where the lair classes stood aside (a resident beats a guest).
  const guest = world ? maybePackageAsk(def, o, world) : null;
  if (guest) return guest;
  // THE VENTURE CLASS tail (maybeVentureAsk) — a standing winnable-or-losable
  // venture waits behind the guests: its gate stands the whole run where a
  // guest's window is now-or-never, but ahead of the riddles — a venture's
  // candidacy can END (a toll paid un-asked, a slaughter), the grave keeps
  // forever. The more patient, the later (the precedence law: lair →
  // package → venture → puzzle).
  const venture = world ? maybeVentureAsk(def, o, world) : null;
  if (venture) return venture;
  // THE PUZZLE CLASS tail (maybePuzzleAsk) — the patient dead wait LAST: a
  // passing guest's window is now-or-never, standing riddle ground keeps.
  // (Same hash every load — ground the earlier classes stood aside from
  // converges on the same verdict whenever it is finally consulted.)
  const riddle = maybePuzzleAsk(def, layout, o);
  return riddle ?? reverted;
}

// The adopted ask's pointer: the den's door, or the nearest standing keeper —
// the destination is visible the whole hunt (the offering's doctrine).
registerAttentionSource((world: World): AttentionPoint[] => {
  const v = world.lairAskView();
  if (!v || v.done || !v.pos) return [];
  return [{
    id: 'lair_adopt', pos: v.pos, color: ADOPT_CFG.accent, glyph: ADOPT_CFG.glyph,
    label: v.label, z: 2,
  }];
});

// The adopted venture's pointer: the warded gate itself — the destination is
// visible the whole ask (the offering's doctrine); a resolved venture drops
// the chevron the same frame the driver acts on the verdict.
registerAttentionSource((world: World): AttentionPoint[] => {
  const v = world.ventureAskView();
  if (!v || v.verdict !== 'standing' || !v.pos) return [];
  return [{
    id: 'venture_adopt', pos: v.pos, color: ADOPT_CFG.accent, glyph: ADOPT_CFG.ventureGlyph,
    label: v.label, z: 2,
  }];
});

// The core kinds' straggler chevrons (clear / spawners), named — parity with
// the bounty's stragglers-by-name treatment.
registerAttentionSource((world: World): AttentionPoint[] => {
  const v = world.objectiveStragglersView();
  if (!v) return [];
  const cfg = STRAGGLER_CFG[v.kind];
  return v.points.map((p, i) => ({
    id: `straggler_${v.kind}_${i}`, pos: p.pos, color: STRAGGLER_CFG.color,
    glyph: cfg.glyph, label: p.name, z: 1,
  }));
});

// The offering altar's pointer: the objective's anchor, visible the whole
// hunt (a hungering altar is the destination, not a spoiler).
registerAttentionSource((world: World): AttentionPoint[] => {
  const v = world.offeringView();
  if (!v || v.done) return [];
  return [{
    id: 'offering_altar', pos: v.pos, color: OFFERING_CFG.accent, glyph: OFFERING_CFG.glyph,
    label: v.stalled ? 'the altar hungers' : `feed the altar — ${v.offered}/${v.need}`, z: 2,
  }];
});
