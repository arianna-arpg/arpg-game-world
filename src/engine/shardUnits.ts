// ---------------------------------------------------------------------------
// THE SIM UNITS (shard M1, W1 THE UNIT FABRIC): one World per live zone on a
// hosted world. The plan is docs/design/shard-m1-plan.md; the contract is
// docs/engine/shard.md "THE SIM UNITS, W1". This file is the engine half and
// stays browser-safe (no node imports): the dials, the contract types the host
// (server/simUnits.ts) and the waves after it share, THE ALIAS CENSUS as data
// (SHARD_UNIT_FIELDS, pinned by balance/probe_shardunits.ts A), THE PIN, and
// THE HAND-OFF's two halves (detachSeat in the unit a seat leaves, attachSeat
// in the unit it enters).
//
//   THE KEEPER     the World a shard always had: the chart, the WorldSim, the
//                  clock, the account and the world sweeps are its own.
//   A UNIT         a fresh World booted into one zone, the keeper's
//                  world-level fields PINNED onto it, its own parked warden
//                  as p0. THE PRIMARY GATE (World.update) skips the keeper's
//                  world sweeps in a unit.
//   THE PIN        world-level fields are copied keeper to unit at every
//                  entry into a unit and back at its exit (counters both
//                  ways, clocks in only), so a runtime reassignment in either
//                  World is never lost and one counter never collides.
//   THE HAND-OFF   a seat moves between units as the SAME Actor objects:
//                  detachSeat lifts the hero, its carried court and the
//                  seat's own rows out of one World; attachSeat lands them
//                  in another through the one landing law.
//
// Off a shard nothing here runs: a World with no `shardWorld` link never reads
// these tables, and every seam it touches is a no-op (THE SOLO INVARIANT).
// ---------------------------------------------------------------------------

import type { Vec2 } from '../core/math';
import type { Actor } from './actor';
import type { BuffEffect } from './skills';
import type { Seat, World } from './world';

/** The unit fabric's dials (unblessed; docs/engine/shard.md "THE SIM UNITS, W1"). */
export const UNIT_CFG = {
  /** THE LINGER: world seconds a unit with no seat stays awake before it sleeps,
   *  its zone memory captured exactly as a departure captures it. A seat that
   *  turns back within the linger walks into the same live zone. The keeper
   *  (the hearth) never sleeps. */
  unitLinger: 30,
  /** THE SOFT CAP: awake units (the keeper not counted) past this many put the
   *  longest-seatless unit to sleep at once. A wake is never refused. */
  maxUnits: 32,
  /** THE SPAWN GRACE at a hand-off arrival: seconds a hero that walked into a
   *  unit stands untargetable, unless its first willed input ends it sooner.
   *  A join keeps SHARD_CFG.spawnGraceSec. */
  arrivalGraceSec: 3,
};

/** 'keeper' | a zone id | `${zoneId}#${instance}` (instances are W4's). */
export type UnitKey = string;

/** One rung of a pocket's way home (World.caveReturn's own shape). */
export type CaveRung = NonNullable<World['caveReturn']>;

/** Where a hand-off lands a seat. 'entry' applies loadZone's back-portal rule
 *  to the destination's live exits (the arrival edge is the ticket's `from`). */
export type RoadLanding = 'entry' | { at: Vec2; spread?: number; band?: [number, number]; tier?: number };

/** THE TICKET (plan 3.1): a road's decision for ONE seat, carried to the host.
 *  Roads, intents and the muster enqueue; the host executes every ticket after
 *  all units ticked (THE HAND-OFF QUEUE). W1 builds the executor and the direct
 *  `travel` door; the roads that emit tickets are W2's. */
export interface RoadTicket {
  seatId: string;
  /** A zoneMap or caveMap id (the host resolves its unit). */
  dest: string;
  /** The arrival edge: loadZone's back-portal rule. Absent = the source zone. */
  from?: string;
  /** Card 25 B's instance key (W4). */
  instance?: string;
  /** A pocket's way home, installed on the unit a wake boots. */
  ladder?: { caveReturn: CaveRung | null; caveStack: CaveRung[] };
  /** A realm arena's context (W4). */
  context?: unknown;
  landing?: RoadLanding;
  /** The per-seat re-descent grace (W2's scanner). */
  grace?: 'caveExit';
  /** Runs once, in the destination, after a wake's load (W4: the realm's boss). */
  onFirstWake?: (w: World) => void;
  /** THE MUSTER RING (W4). */
  muster?: { party: string; at: Vec2 };
}

/** THE LINK (World.shardWorld, HOST class): published by the host into every
 *  World a shard runs. Its role is THE PRIMARY GATE's read. */
export interface ShardWorldLink {
  role: 'keeper' | 'unit';
  key: UnitKey;
  /** THE HAND-OFF QUEUE's door: a road enqueues a ticket, never travels. */
  enqueue(t: RoadTicket): void;
  /** THE SPLIT DISPATCH's door: run `fn` on the unit hosting `zoneId` (dropped
   *  when none is awake). World.atZone's shard branch is W3's. */
  dispatch(zoneId: string, fn: (w: World) => void): void;
}

/** The clocks THE ONE CLOCK pins into a unit at every entry. */
export interface UnitClocks { time: number; inputClock: number }

// ---------------------------------------------------------------------------
// THE ALIAS CENSUS (plan section 1): every World field a detector finds (its
// own container is a string-keyed Map/Set/Record, a WorldSim, a Ledger or an
// Account; THE SAVE LAW, the fields serializeWorldState/adoptWorldState touch;
// THE SWEEP LAW, the fields the gated sweeps write one call deep) carries a
// row here, and so does every field a mechanism moves. Everything else is
// UNIT by default (it dies with its unit). The probe (balance/probe_shardunits
// A) derives all three detectors from the source each run: a field added next
// month is aliased, marked or named unit-local the day it is written.
// ---------------------------------------------------------------------------

/** The seven classes. alias / counter / clock ride THE PIN; seat rides THE
 *  HAND-OFF; keeper, host and unit are documentation the probe holds honest. */
export type UnitFieldClass = 'alias' | 'counter' | 'clock' | 'keeper' | 'host' | 'seat' | 'unit';
/** Why a field is per unit (the closed vocabulary). `shell` is a render
 *  shell's mirror, never set on a host World. */
export type UnitReason = 'per-visit' | 'zone-local' | 'memo' | 'seat-keyed' | 'warden-only' | 'dev' | 'shell';
/** How THE HAND-OFF treats a seat row: MOVE it into the destination or DROP it
 *  in the source, keyed by the seat id, the Seat object, each carried actor's
 *  id or each carried Actor object; `custom` rows have their own code below. */
export type SeatHand =
  | 'move-seat-id' | 'move-seat' | 'move-actor-id' | 'move-actor'
  | 'drop-seat-id' | 'drop-seat' | 'drop-actor-id' | 'drop-actor' | 'custom';

export type UnitFieldRow =
  | { cls: 'alias' | 'counter' | 'clock' | 'keeper' | 'host'; note?: string }
  | { cls: 'seat'; hand: SeatHand; note?: string }
  | { cls: 'unit'; why: UnitReason; note?: string };

const A = (note?: string): UnitFieldRow => ({ cls: 'alias', ...(note ? { note } : {}) });
const K = (note?: string): UnitFieldRow => ({ cls: 'keeper', ...(note ? { note } : {}) });
const S = (hand: SeatHand, note?: string): UnitFieldRow => ({ cls: 'seat', hand, ...(note ? { note } : {}) });
const U = (why: UnitReason, note?: string): UnitFieldRow => ({ cls: 'unit', why, ...(note ? { note } : {}) });

/** THE ALIAS CENSUS as data. Field names are World's own (THE PIN and THE
 *  HAND-OFF reach them through an index cast; the probe proves every name). */
export const SHARD_UNIT_FIELDS: Readonly<Record<string, UnitFieldRow>> = {
  // ---- ALIAS: one truth for the shard (THE PIN copies in, and back when reassigned)
  zoneMap: A('the chart'), caveMap: A('every pocket def'), visited: A(), surveyed: A(),
  discoveredWaypoints: A(), zoneMemory: A('the shared memory rows (THE PERSIST CAPTURE writes into it)'),
  sim: A('the WorldSim: nothing in it reaches back into a World'), manifest: A('the same frozen object by construction'),
  accountSource: A('THE KEEPER\'S GATE until M2'), activeQuests: A(), completedQuests: A(),
  questImbues: A('reassigned by claimQuestImbue'), questRewardItems: A('the reward menu is the counters wave\'s'),
  completedObjectives: A(), mercSheets: A(), vendorHolds: A(),
  bountyOffers: A('reassigned by armBountyBoard and reconcileBounties'),
  bountyHands: A('reassigned by the slate verbs'), bountyBoardState: A(), chartsBought: A(),
  townPortals: A('reassigned by the portal verbs; a seat\'s own row rides it'), townPortalDestination: A(),
  ledger: A('the run ledger'), throngClaimed: A(), annexFound: A(),
  discoveredDimensions: A('a per-run once-latch'), seasSeen: A('a per-run once-latch (seas_found)'),
  manifestedThisRun: A('a per-run once-latch (one grudge per run)'), descentSpent: A('a per-run once-latch'),
  materializedSwarmings: A('run-long, never cleared: a unit copy would re-bulletin and re-ledger each flight'),
  soundings: A(), omenWhisperedAt: A(), omenWhisperN: A(), omenRevealed: A(),
  notices: A('THE NOTICE FEED: one feed, its audiences decide who hears'), pickupFeed: A(),
  newsLog: A('the speech grammar\'s world news'), slainLog: A('the speech grammar\'s credited kills'),
  massSideareaRoots: A('keeper-meaningful'), massCaveIds: A('keeper-meaningful'),
  descentStocks: A('the Descent stays sealed in M1'), descentDeepest: A('the Descent stays sealed in M1'),
  theaterVisitSeq: A('PLAUSIBLE world-level: the per-zone visit ordinal salts the theater\'s draws'),
  // ---- COUNTER: one shared scalar, pinned both ways
  nextGenId: { cls: 'counter', note: 'gen_<n>: two units minting in one tick never collide' },
  accountDirty: { cls: 'counter', note: 'a shared dirty flag, pinned both ways' },
  // ---- CLOCK: the keeper owns it; units enter at the keeper's tick-start reading
  time: { cls: 'clock' }, inputClock: { cls: 'clock', note: 'THE TIME BUDGET refills from it' },
  // ---- KEEPER: the keeper's own copy is the one its sweeps and its save read;
  //      a unit's copy is its own and the pin never copies it
  forechartNextAt: K(), mintVeil: K(), omenNextAt: K(), webSettleNextAt: K(), webSettleSeenSeq: K(),
  classClaimNextAt: K(), warpSweepAcc: K(), holdSweepAt: K(), bountyWatchAccum: K(), quickenSweepAcc: K(),
  deepwinterWarped: K(), deepwinterEyeWarped: K(), longNightWarped: K(),
  gloamPrevPhase: K('until W3 the gloaming_survived edge may bump once per awake unit'),
  odyssey: K('a this-bound runtime whose update never runs in a unit'),
  zonesSaveMemo: K(), zonesRowMemo: K(), memorySaveMemo: K(), memoryRowMemo: K(),
  zonesSaveRowDerives: K('the save memo\'s own tally'), memorySaveRowDerives: K('the save memo\'s own tally'),
  zone: K('the save\'s own place: a unit\'s zone is its own and is saved through THE PERSIST CAPTURE'),
  caveReturn: K('the save\'s own place (a unit\'s ladder is its own)'), caveStack: K('the save\'s own place'),
  entryFrom: K('the save\'s own place'), massRuntime: K('the wilds\' surface is the keeper\'s'),
  massAway: K('the wilds\' surface is the keeper\'s'),
  adoptedZonePending: K('the adopt\'s latch; THE WAKE sets a unit\'s own'),
  questRescues: K('the adopt reconciles the keeper\'s; each unit updates its own'),
  townTierIdx: K('the hearth\'s tier; a unit never hosts the hearth'), townStationKey: K('the hearth\'s station fold'),
  vendorArmedBeat: K('the adopt clears the keeper\'s; a unit\'s copy arms its own shelf (the plan\'s zone-local)'),
  // ---- HOST: published by the host into every World the shard runs
  shardWorld: { cls: 'host', note: 'the link and THE PRIMARY GATE' },
  partyMates: { cls: 'host' }, partyRows: { cls: 'host' }, partyRev: { cls: 'host' },
  timeflow: { cls: 'host', note: 'each World\'s own; the host sets allowHold and chronoScope' },
  // ---- SEAT: moved or dropped by THE HAND-OFF (the seat-keyed reason)
  lastInputSeq: S('move-seat-id', 'the ack continues'), spentPresses: S('move-seat-id', 'a press a gate spent never fires in B'),
  seatKillTally: S('move-seat', 'the fall\'s reckoning'), townPortalArrival: S('move-seat-id'),
  pendingTreePips: S('move-seat-id'), wornThrongInsts: S('move-actor-id'),
  chillTimers: S('move-actor-id'), douseTimers: S('move-actor-id'), gazeTimers: S('move-actor-id'),
  strikeReleaseBodies: S('move-actor'),
  companionBonds: S('custom', 'exportBond / importBond'), companionGrants: S('custom', 'lift / seat'),
  replenishment: S('custom', 'lift / seat'), treeBuffSources: S('custom', 'keyed by the carried bodies\' buffs'),
  traceRests: S('custom', 'keyed by the seat\'s own writ uids'),
  engageTokens: S('custom', 'the leaver\'s ids pruned'), ringClaims: S('custom', 'the leaver\'s ids pruned'),
  losMemo: S('custom', 'the leaver\'s pairs pruned'),
  metaDirty: S('drop-seat-id', 'marked dirty again in B'), moveBudget: S('drop-seat-id', 'a fresh row at graceSec'),
  townPortalDwell: S('drop-seat-id'), pingClocks: S('drop-seat-id', 'pings stay unit-local'),
  harvestDwell: S('drop-seat-id'), harvestOffer: S('drop-seat-id'),
  seatHud: S('drop-seat'), seatNoteAt: S('drop-seat'), speechFocus: S('drop-seat'),
  dotAccum: S('drop-actor-id'), comboCursors: S('drop-actor'),
  // ---- UNIT: dies with its unit (a row only where a detector looks)
  openedHollows: U('zone-local'), annexOpen: U('zone-local'), lures: U('zone-local'), theaterPour: U('zone-local'),
  holdMissingWarned: U('zone-local'), crossDimWarned: U('zone-local'), brittleWarnAt: U('zone-local'),
  failNoteAt: U('zone-local', 'the unit\'s world floats'), liteKills: U('zone-local', 'flushed by its own sweep'),
  doorPressIntents: U('zone-local', 'one frame\'s door presses'), structures: U('zone-local'),
  encRng: U('zone-local', 'the zone\'s encounter stream'),
  wbWalls: U('per-visit'), stationArmed: U('per-visit'),
  massNativeEffectOwners: U('per-visit'), massNativeBrittleOwners: U('per-visit'),
  materializedEpicenters: U('per-visit'), materializedHellWar: U('per-visit'), materializedCrusades: U('per-visit'),
  materializedDeadwakes: U('per-visit'), materializedHaunts: U('per-visit'), materializedStrayings: U('per-visit'),
  materializedDroves: U('per-visit'), materializedWisplights: U('per-visit'), materializedLongNights: U('per-visit'),
  materializedMigrations: U('per-visit'), materializedWorldBoss: U('per-visit'), materializedBrigands: U('per-visit'),
  materializedContagion: U('per-visit'), materializedInfestation: U('per-visit'), materializedBroods: U('per-visit'),
  materializedSwarmWake: U('per-visit'), materializedCandle: U('per-visit'), materializedStarfall: U('per-visit'),
  materializedMycelia: U('per-visit'), materializedDeepwinter: U('per-visit'), materializedHoldfasts: U('per-visit'),
  materializedUnsealing: U('per-visit'), materializedHunts: U('per-visit'), materializedFractures: U('per-visit'),
  materializedRituals: U('per-visit'), materializedAmalgam: U('per-visit'), materializedAmalgamMobs: U('per-visit'),
  materializedObservers: U('per-visit'), materializedDocks: U('per-visit'), materializedWrits: U('per-visit'),
  soulriverLaneMemo: U('memo'), grantedPocketCache: U('memo'), pathProfiles: U('memo'),
  terrainDrainScratch: U('memo'), liteKindIdxMap: U('memo'),
  stashedCompanions: U('warden-only', 'the local resume\'s stash'), kills: U('warden-only', 'the objective latch\'s delta'),
  combatDeeds: U('warden-only', 'the local hero\'s deed tracker'),
  netContainerBoards: U('shell'),
};

/** Fields THE PIN copies both ways (alias + counter), in table order. */
export const PINNED_FIELDS: readonly string[] = Object.entries(SHARD_UNIT_FIELDS)
  .filter(([, r]) => r.cls === 'alias' || r.cls === 'counter').map(([f]) => f);

// ---------------------------------------------------------------------------
// THE PIN (plan D1, D4): ~40 reference copies per entry, exact under the
// shard's single thread. Reached through an index cast (`sim` is readonly at
// compile time only); the census proves every name is a World field.
// ---------------------------------------------------------------------------

type Fields = Record<string, unknown>;
const fields = (w: World): Fields => w as unknown as Fields;

/** THE PIN's entry ledger: the keeper's values a unit entered with. */
export interface PinEntry { readonly at: unknown[] }

/** THE ONE CLOCK's reading of a World (the keeper's, at tick start). */
export function unitClocks(w: World): UnitClocks {
  return { time: w.time, inputClock: fields(w).inputClock as number };
}

/** THE PIN in: the keeper's world-level values onto the unit, the clocks at
 *  the given reading (never copied back). */
export function pinIn(keeper: World, unit: World, clocks: UnitClocks): PinEntry {
  const k = fields(keeper), u = fields(unit);
  const at: unknown[] = new Array(PINNED_FIELDS.length);
  for (let i = 0; i < PINNED_FIELDS.length; i++) {
    const f = PINNED_FIELDS[i], v = k[f];
    at[i] = v;
    u[f] = v;
  }
  u.time = clocks.time;
  u.inputClock = clocks.inputClock;
  return { at };
}

/** THE PIN out: every pinned field the unit reassigned (or counted on) goes
 *  back to the keeper; one the unit left alone is never written. */
export function pinOut(keeper: World, unit: World, entry: PinEntry): void {
  const k = fields(keeper), u = fields(unit);
  for (let i = 0; i < PINNED_FIELDS.length; i++) {
    const f = PINNED_FIELDS[i], v = u[f];
    if (v !== entry.at[i]) k[f] = v;
  }
}

// ---------------------------------------------------------------------------
// THE UNIT HOST VIEW (World.shardUnitHost, beside the native host views): the
// private reaches THE HAND-OFF and THE WAKE need, typed.
// ---------------------------------------------------------------------------

export interface ShardUnitHost {
  indexSeats(): void;
  grabRelease(a: Actor): void;
  releaseContract(minion: Actor, scheduleRespawn: boolean): void;
  liteOpenAt(x: number, y: number): boolean;
  readonly relayStatus: NonNullable<Actor['statusRelay']>;
  readonly zoneEntry: Vec2;
  adoptedZonePending: boolean;
  caveStack: CaveRung[];
  readonly harvestSessions: readonly { seatId: string }[];
  readonly traceRuns: readonly { seatId: string }[];
  readonly pendingBursts: { owner: Actor }[];
  readonly pendingContagions: { caster: Actor; host: Actor }[];
  readonly companionGrants: { lift(owner: Actor): unknown; seat(owner: Actor, rows: unknown): void };
  readonly replenishment: { lift(actor: Actor): unknown; seat(actor: Actor, clocks: unknown): void };
}

// ---------------------------------------------------------------------------
// THE HAND-OFF (plan section 3)
// ---------------------------------------------------------------------------

/** One moved row: a field, its key in the source, its value. */
export interface MovedRow { field: string; key: unknown; value: unknown }

/** THE SEAT PACKET (plan 3.3): what leaves one World for another. */
export interface SeatPacket {
  seat: Seat;
  /** The seat's own hero (seatHero after the eject). */
  hero: Actor;
  /** THE CARRY SET: the hero first, then its court (the same objects, ids kept). */
  carry: Actor[];
  /** The zone the seat left: the arrival edge for an 'entry' landing. */
  from: string;
  rows: MovedRow[];
  bonds: [Actor, unknown][];
  grants: [Actor, unknown][];
  clocks: [Actor, unknown][];
  buffSources: [BuffEffect, unknown][];
  traceRests: [number, number][];
  /** Lite-tier throng rows, freed in the source and re-spawned in the
   *  destination (pool rows never move: they hold owner ids, never bodies). */
  lite: { defId: string; plies: number }[];
}
