// ---------------------------------------------------------------------------
// THE COUNTERS AND THE JOURNAL on the wire (docs/engine/shard.md "The pieces"):
// the rows of a hosted world's snapshot that carry one seat's quests, boards
// and harvest rite to that seat alone (THE OWN ENTRY: snapshot.ts
// SEAT_OWN_ROWS names `jn` and `hv`, so ShardTransport.sendState splices each
// into its own socket's frame and strikes it from every other).
//
//   journalRowOf      the host's half: a seat's JOURNAL ROW (SeatW.jn): its
//                     quest log, the offers and rewards waiting for it, the
//                     completed ids, the pins its map draws (its quests and its
//                     own remembered bodies) and the bounty boards standing in
//                     its zone as it reads them. Recomputed every
//                     JOURNAL_WIRE_CFG.everySnapshots or after the seat's own
//                     act, shipped on a change and on the beat (the memoryAccess
//                     idiom); absent = unchanged, a client keeps the last row.
//   harvestRowOf      the host's half: the seat's rite view (SeatW.hv) while it
//                     stands near a node or works a rite; absent = none.
//   applyCounterRows  the client's half: the shell's quest reads, its board
//                     panel, its map pins and its rite prompt answer from the
//                     rows (World.netJournal, World.netHarvest).
//
// Hosted worlds alone (the keeper seat stands): a co-op host never builds a
// row and a co-op client never reads one (THE SOLO INVARIANT).
// ---------------------------------------------------------------------------

import type { Seat, World } from '../engine/world';
import { FEATURE } from '../meta/account';
import { questMarkers, registerMarkerSource, type MapMarker } from '../world/mapMarkers';
import { massQuestPins, type MassQuestPin } from '../worldmass/quests';
import type { StateSnapshot, ZoneMsg } from './snapshot';

/** THE KEEPER'S GATE for a client's counters: the station features whose verdict a render
 *  shell reads off the zone message (World.counterOwned), never off its own account. */
export const COUNTER_FEATURES: readonly string[] = [FEATURE.SALVAGE_STATION, FEATURE.BOUNTY_BOARD, FEATURE.TRACKER, FEATURE.ORACLE_STONE];

/** THE CLIENT'S COUNTERS on the zone message (hosted worlds alone): the station pieces'
 *  anchors (World.stationAnchor finds a station by them) with their story, the Sacrificial
 *  Fonts, and the counters the host owns. Absent everywhere else. */
export type CounterZoneW = Pick<ZoneMsg, 'anchors' | 'fonts' | 'counters'>;
const r2 = (n: number): number => Math.round(n * 100) / 100;
export function counterZoneOf(world: World): CounterZoneW {
  if (!world.localSeat.keeper) return {};
  const anchors: NonNullable<ZoneMsg['anchors']> = [];
  for (const d of world.doodads) if (d.anchor && !d.gone) anchors.push({ p: [r2(d.pos.x), r2(d.pos.y)], a: d.anchor, ...(d.tier ? { t: d.tier } : {}) });
  return {
    anchors,
    fonts: world.fonts.map(f => ({ p: [r2(f.pos.x), r2(f.pos.y)], ...(f.tier ? { t: f.tier } : {}) })),
    counters: COUNTER_FEATURES.filter(f => world.account.features.has(f)),
  };
}

/** The client's half of the zone message (after applyZone): the anchors land on the doodads
 *  standing at their spots, the Fonts stand, and the counters' verdicts are the host's. A
 *  message without the rows (a co-op host's) leaves the shell as it was. */
export function applyCounterZone(world: World, msg: ZoneMsg): void {
  if (!msg.counters) { world.netCounters = undefined; return; } // not a hosted world's message: the shell lingers at nothing
  const at = new Map<string, { a: string; t?: number }>();
  for (const r of msg.anchors ?? []) at.set(r.p[0] + ',' + r.p[1], { a: r.a, t: r.t });
  for (const d of world.doodads) {
    const hit = at.get(d.pos.x + ',' + d.pos.y);
    if (hit) { d.anchor = hit.a; if (hit.t) d.tier = hit.t; }
  }
  world.fonts = (msg.fonts ?? []).map(f => ({ pos: { x: f.p[0], y: f.p[1] }, ...(f.t ? { tier: f.t } : {}) }));
  world.netCounters = new Set(msg.counters);
}

/** The dials (docs/engine/shard.md "Dials"). */
export const JOURNAL_WIRE_CFG = {
  /** Snapshots between a seat's journal recomputes (10 at 20 Hz = 0.5 s); its own act recomputes at once. */
  everySnapshots: 10,
  /** Snapshots between re-ships of an unchanged row (30 = 1.5 s, the meta heartbeat's cadence). */
  beat: 30,
  /** A seat's harvest row ships while a standing node lies within this many px of its body. */
  harvestReach: 240,
  /** A bounty board's view rides a seat's journal while the seat stands within this many px of
   *  it (three of the board's dwell discs: the view lands before the client's linger opens it). */
  boardReach: 360,
  /** Beats an emptied journal still rides before it rests (a client that skipped the change
   *  hears it on a beat); an empty journal is otherwise absent, the quiet snapshot's shape. */
  emptyBeats: 2,
};

/** One contract offered to this seat (World.questOfferChoices). */
export interface JournalOfferW {
  questId: string; label: string; giver: string; target: string; returnTo: string | null;
  xp: number; passivePoints: number; rewards: string[];
}
/** One imbue waiting for this seat (World.questImbueOffers): its own magic pieces and their options. */
export interface JournalImbueW {
  questId: string; level: number; near: boolean; giver: string; prompt: string;
  items: { uid: number; name: string; current: string[]; options: { id: string; lines: string[]; unstudied: boolean }[] }[];
}
type BoardView = ReturnType<World['bountyBoardView']>;
/** A bounty board as this seat reads it (World.bountyBoardView): the countdown rides as the
 *  host's absolute restock time, so a client's ticker runs it down on the shared clock. */
export type BoardViewW = Omit<BoardView, 'countdown'> & { restockAt: number };

/** THE JOURNAL ROW (SeatW.jn). */
export interface JournalW {
  log: ReturnType<World['questLog']>;
  offers: JournalOfferW[];
  rewards: ReturnType<World['questRewardOffers']>;
  imbues: JournalImbueW[];
  /** Completed quest ids (the shell's completedQuests). */
  done: string[];
  /** The seat's own map pins: its quests' targets and turn-ins, its own remembered bodies. */
  pins: MapMarker[];
  /** The bounty boards standing in the seat's zone, by board id (absent = none here). */
  boards?: Record<string, BoardViewW>;
  /** On the Unbroken Wilds: the seat's own quest and bounty pins on the surface (the map's
   *  pins and the HUD's quest compass, worldmass/quests.ts massQuestPins). */
  mpins?: MassQuestPin[];
}

/** The seat's rite view (SeatW.hv): World.harvestView's own shape, cut to the nodes in
 *  this seat's reach, its own arming or offer, and its own rite. */
export type HarvestW = NonNullable<ReturnType<World['harvestView']>>;

/** The journal as the host judges it for one seat (THE QUEST HAND's scope). */
export function journalViewOf(world: World, seat: Seat): JournalW {
  return world.withQuestHand(seat, () => {
    const boards: Record<string, BoardViewW> = {};
    for (const b of world.bountyBoardsHere()) {
      if (Math.hypot(seat.actor.pos.x - b.pos.x, seat.actor.pos.y - b.pos.y) > JOURNAL_WIRE_CFG.boardReach) continue;
      const { countdown, ...rest } = world.bountyBoardView(b.id);
      boards[b.id] = { ...rest, restockAt: Math.round((world.time + countdown) * 100) / 100 };
    }
    const pins = questMarkers(world);
    for (const c of world.seatCorpseMarks?.(seat) ?? []) {
      const node = world.zoneMap[c.zoneId];
      const at = node ? { x: node.map.x, y: node.map.y } : c.map;
      pins.push({
        id: `shard-corpse-${c.zoneId}-${pins.length}`, zoneId: c.zoneId, ...(at ? { coord: { x: at.x, y: at.y } } : {}),
        glyph: '☠', fill: '#1a0e12', stroke: '#d05050', text: '#e8a0a0', r: 9, fog: 'always', z: 10,
        title: `Your ${c.classId} ${c.name} (lv ${c.level}) fell here`, detail: 'reclaim your gear from the corpse',
      });
    }
    const mpins = massQuestPins(world);
    return {
      ...(mpins.length ? { mpins } : {}),
      log: world.questLog(),
      offers: world.questOfferChoices(),
      rewards: world.questRewardOffers(),
      imbues: world.questImbueOffers(),
      done: [...world.completedQuests],
      pins,
      ...(Object.keys(boards).length ? { boards } : {}),
    };
  });
}

/** Nothing to tell: no quest held or done, nothing offered or owed, no pin, no board near. */
function journalEmpty(j: JournalW): boolean {
  return !j.log.active.length && !j.log.completed.length && !j.offers.length && !j.rewards.length
    && !j.imbues.length && !j.done.length && !j.pins.length && !j.boards && !j.mpins;
}

interface JournalMemo { json: string; row: JournalW; at: number; empty: boolean; emptySince: number }
const JOURNAL_MEMOS = new WeakMap<Seat, JournalMemo>();

/** The seat's journal row for this snapshot (SeatW.jn), or undefined. Recomputed on its
 *  cadence or after its own act (World.journalDirty); shipped when it changed, after its own
 *  act, and on the beat. An empty journal is absent (a shell starts empty, and a quiet
 *  snapshot keeps its shape): an emptied one rides JOURNAL_WIRE_CFG.emptyBeats beats more,
 *  then rests. Hosted worlds alone. */
export function journalRowOf(world: World, seat: Seat, tick: number): JournalW | undefined {
  if (!world.localSeat.keeper || seat.keeper) return undefined;
  const cfg = JOURNAL_WIRE_CFG;
  let memo = JOURNAL_MEMOS.get(seat);
  const forced = world.journalDirty.delete(seat.id);
  if (!memo || forced || tick - memo.at >= cfg.everySnapshots) {
    const row = journalViewOf(world, seat);
    const json = JSON.stringify(row);
    const empty = journalEmpty(row);
    const was = memo;
    // A row empty from the first is the shell's own state already (it never rides); one that
    // emptied after it held something rides the beat a little while.
    memo = { json, row, at: tick, empty, emptySince: !empty ? -1 : !was ? -Infinity : was.empty ? was.emptySince : tick };
    JOURNAL_MEMOS.set(seat, memo);
    if (was ? json !== was.json || (forced && !empty) : !empty) return row;
  }
  if (tick % cfg.beat !== 1) return undefined;
  return !memo.empty || tick - memo.emptySince <= cfg.beat * cfg.emptyBeats ? memo.row : undefined;
}

/** The seat's rite view for this snapshot (SeatW.hv), or undefined. Hosted worlds alone. */
export function harvestRowOf(world: World, seat: Seat): HarvestW | undefined {
  if (!world.localSeat.keeper || seat.keeper) return undefined;
  return world.seatHarvestView(seat, JOURNAL_WIRE_CFG.harvestReach) ?? undefined;
}

/** The client's half (after applySnapshot): the own seat's journal row (kept until the next
 *  one; a client that skipped a change heals on the beat) and, on a hosted world's shell, its
 *  rite row (every snapshot; absent = none). A new reward waiting at the giver opens the
 *  journal, as the host's own dwell asks (World.questRewardRequested). */
export function applyCounterRows(world: World, snap: StateSnapshot): void {
  const own = snap.seats[world.clientSeatId];
  if (!own) return;
  if (own.jn) {
    const was = new Set(world.netJournal?.rewards.map(r => r.questId) ?? []);
    world.netJournal = own.jn;
    world.completedQuests = new Set(own.jn.done);
    if (own.jn.rewards.some(r => !was.has(r.questId))) world.questRewardRequested = true;
  }
  if (world.netCounters) world.netHarvest = own.hv ?? null; // a hosted world's shell (its zone message shipped the counters)
}

// The shell's map draws its own pins from the row (the built-in sources read world state a
// render shell never holds, so they add nothing there).
registerMarkerSource(world => (world.clientActionHook ? world.netJournal?.pins ?? [] : []));
