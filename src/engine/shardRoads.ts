// ---------------------------------------------------------------------------
// THE ROADS PER PLAYER (shard M1, W2): every road off a zone judged per seat
// on a hosted world. The plan is docs/design/shard-m1-plan.md section 4; the
// contract is docs/engine/shard.md "THE ROADS PER PLAYER". This file is the
// engine half and stays browser-safe (no node imports).
//
//   THE SHARD SCANNER  scanShardRoads(w), one gated call at the end of
//                      World.update()'s road block: every standing player seat
//                      holds at most one road dwell at a time, read through
//                      THE LIFT's scans with the seat's own body and built only
//                      while the seat is idle and unshoved. A finished dwell
//                      builds the road's ticket in the source (World's
//                      shardExitRoad / shardMouthRoad, a realm gate's `road`)
//                      and enqueues it; a road never loads a zone on a shard.
//   THE MUSTER RING    (W4) a finished travel road is first offered to the
//                      seat's party's muster (ShardWorldLink.muster): a party
//                      with another member standing in the unit waits at a
//                      ring for the party (server/muster.ts); while its ring
//                      stands, the party's members in the unit take no road
//                      of their own (standing on the ring is joining it).
//   THE SEAT'S DOOR    THE RETREAT LAW per seat: the edge a seat came in by,
//                      written at arrival from its ticket. The seal of a
//                      sealing objective spares each seat its own way back.
//   THE SEAT'S LADDER  a pocket's way home per seat (two seats may share a
//                      span pocket from two members, or a pocket from two doors).
//   THE EXIT GRACE     a climbed-out seat standing on the mouth never dwells
//                      straight back down; it lifts once the seat stands clear.
//   THE SEALED WORDS   the dock, the voyage, the Wraithsail and the Descent's
//                      shaft stay sealed on a hosted world (each owns a
//                      per-World singleton run), and so does a realm gate whose
//                      road this world cannot build (THE REALM ROADS, W4: a
//                      dimension's crossing on the Unbroken Wilds, the
//                      Wraithsail at sea); each answers a seat idle at it once
//                      per approach on the seat's own note row (THE ACTING
//                      SEAT), and builds no dwell, so no ring.
//   THE ROAD RING      SeatW.rd: the dwell the host is filling, shipped to its
//                      own seat (THE OWN ENTRY), drawn by its client.
//
// Off a shard nothing here runs: a World with no `shardWorld` link never
// calls the scanner, and every read below falls back to the World's own
// fields (THE SOLO INVARIANT).
// ---------------------------------------------------------------------------

import { vec, type Vec2 } from '../core/math';
import { dwellOf, sidezoneOf } from '../data/sidezones';
import { transitDwell } from '../data/transit';
import type { ZoneDef } from '../data/zones';
import { WORLDSTATE_CFG, type SavedPlayerSpot } from '../meta/worldstate';
import type { Actor } from './actor';
import type { Doodad, PlacedStructure } from './levelgen';
import type { CaveRung, RoadTicket } from './shardUnits';
import type { Seat, World, ZoneExit } from './world';

/** The roads that stay sealed on a hosted world in M1 (plan 4.8). */
export type SealedRoadKind = 'dock' | 'voyage' | 'wraithsail' | 'descent';

/** The roads' dials (unblessed; docs/engine/shard.md "Dials"). */
export const SHARD_ROADS_CFG = {
  /** THE SEALED WORDS (placeholders: the words are hers). One line each, heard
   *  once per approach on the seat's own note row. Keys are the sealed road
   *  kinds World.sealedRoadUnder names (the dock's cast-off, the harbor
   *  board's passage, the Wraithsail lying alongside, the Delver's shaft),
   *  plus `realm` for a realm gate whose road is not built yet (W4). */
  words: {
    dock: 'the quay is still at this world\'s edge',
    voyage: 'no ship sails from this world yet',
    wraithsail: 'the Wraithsail does not answer here',
    descent: 'the shaft is sealed on this world',
    realm: 'this gate does not open on this world yet', // a realm road this world cannot build (W4)
  } as Record<SealedRoadKind | 'realm', string>,
};

/** One mouth of the zone (World.caveEntrances' own row shape). */
export interface CaveMouthRow {
  pos: Vec2; seed: number; kind: string;
  massOwner?: string; nativeParent?: ZoneDef;
  roof?: PlacedStructure | null; underSpan?: string; mouthTier?: number;
}

/** A realm gate of the zone (World.realmGates, THE LIFT): its spot, transit
 *  kind and dwell key, the solo enter action, and the shard's road. */
export interface RealmGateRow {
  pos: Vec2; kind: string; key: string;
  enter: () => void;
  /** THE ROADS PER PLAYER: the road one seat takes through this gate (THE
   *  REALM ROADS, W4: the per-gate prep in the source, then a ticket whose
   *  first wake raises the realm). Absent = sealed on a hosted world, with its word. */
  road?: (seat: Seat) => RoadTicket | null;
}

/** A pocket's way home, per seat (World.caveReturn + caveStack's shape). */
export interface SeatLadder { caveReturn: CaveRung | null; caveStack: CaveRung[] }

/** THE ROADS' host view (World.shardRoadHost): the private reaches the scanner needs. */
export interface ShardRoadHost {
  readonly caveEntrances: readonly CaveMouthRow[];
  readonly caveStack: readonly CaveRung[];
  readonly currentZoneSeed: number;
  /** enterSidezone's shard twin: the mouth's source half, then its ticket. */
  mouthRoad(seat: Seat, cm: CaveMouthRow): RoadTicket | null;
  /** travelThrough's shard twin: the exit's source half, then its ticket. */
  exitRoad(seat: Seat, e: ZoneExit): RoadTicket | null;
  breakArenaSeal(seal: Doodad): void;
  failNote(a: Actor, key: string, msg: string): void;
  /** The sealed road a seat stands at (within its own dwell reach), or null. */
  sealedRoadUnder(seat: Seat): { kind: SealedRoadKind; pos: Vec2 } | null;
}

/** One seat's road dwell (the scanner's per-seat row; THE ROAD RING ships it). */
interface RoadDwell { key: string; kind: string; pos: Vec2; start: number; need: number }

/** A unit's per-seat road state. Keyed by World (never a World field), so it
 *  lives and dies with its unit and THE PIN never sees it. */
interface RoadState {
  dwell: Map<string, RoadDwell>;
  door: Map<string, string | null>;
  ladder: Map<string, SeatLadder>;
  grace: Set<string>;
  /** The words each seat heard on its current approach (keyed per road). */
  heard: Map<string, Set<string>>;
  /** The holdfast's consumed parley, per seat (re-armed once it steps out). */
  parley: Set<string>;
}
const STATE = new WeakMap<World, RoadState>();
function roadState(w: World): RoadState {
  let st = STATE.get(w);
  if (!st) STATE.set(w, st = { dwell: new Map(), door: new Map(), ladder: new Map(), grace: new Set(), heard: new Map(), parley: new Set() });
  return st;
}

const copyRung = (r: CaveRung): CaveRung => ({ ...r, pos: vec(r.pos.x, r.pos.y) });
const copyLadder = (l: SeatLadder): SeatLadder => ({ caveReturn: l.caveReturn ? copyRung(l.caveReturn) : null, caveStack: l.caveStack.map(copyRung) });

/** THE SEAT'S DOOR: the edge this seat came into the unit's zone by (THE
 *  RETREAT LAW). A seat with no row (a join at the hearth, THE DIRECT ROAD)
 *  reads the zone's own entry, as every World always did. */
export function seatDoorOf(w: World, seat: Seat): string | null {
  const st = STATE.get(w);
  return st?.door.has(seat.id) ? st.door.get(seat.id)! : w.entryFrom;
}

/** THE SEAT'S LADDER: this seat's way home from the unit's pocket; a seat with
 *  no row reads the unit's own ladder (the one its wake installed). */
export function seatLadderOf(w: World, seat: Seat): SeatLadder {
  const own = STATE.get(w)?.ladder.get(seat.id);
  return own ?? { caveReturn: w.caveReturn, caveStack: [...w.shardRoadHost().caveStack] };
}

/** The executor's arrival (server/simUnits.ts, after attachSeat, in the
 *  destination under its pin): THE SEAT'S DOOR (the ticket's edge), THE SEAT'S
 *  LADDER (the ticket's; none = the unit's own, the one its wake installed),
 *  THE EXIT GRACE, and a fresh dwell. */
export function shardRoadArrive(w: World, seat: Seat, t: RoadTicket, from: string | null): void {
  const st = roadState(w), id = seat.id;
  st.door.set(id, from);
  if (t.ladder) st.ladder.set(id, copyLadder(t.ladder)); else st.ladder.delete(id);
  if (t.grace === 'caveExit') st.grace.add(id); else st.grace.delete(id);
  st.dwell.delete(id); st.heard.delete(id); st.parley.delete(id);
}

/** The executor's departure (in the source, after detachSeat): the seat's
 *  road rows leave the unit with it. */
export function shardRoadDepart(w: World, seatId: string): void {
  const st = STATE.get(w);
  if (!st) return;
  st.dwell.delete(seatId); st.door.delete(seatId); st.ladder.delete(seatId);
  st.grace.delete(seatId); st.heard.delete(seatId); st.parley.delete(seatId);
}

/** THE ROAD RING (SeatW.rd, THE OWN ENTRY): the dwell the host is filling for
 *  this seat as [x, y, fill, transit kind], or undefined (the common case). */
export function roadDwellRow(w: World, seat: Seat): [number, number, number, string] | undefined {
  const d = STATE.get(w)?.dwell.get(seat.id);
  if (!d) return undefined;
  const frac = Math.min(1, Math.max(0, (w.time - d.start) / Math.max(0.01, d.need)));
  return [Math.round(d.pos.x), Math.round(d.pos.y), Math.floor(frac * 100) / 100, d.kind];
}

/** A seat's SAVED SPOT (the world save's player block, for one seat): the
 *  on-graph zone underfoot, or underground the ladder's surface anchor at the
 *  outermost mouth plus the re-mintable descent. The town portal's origin on a
 *  hosted world (serializeWorldState would serialize the whole unit and spot
 *  its warden). Mirrors World.serializeWorldState's derivation rung for rung. */
export function shardSpotOf(w: World, seat: Seat): SavedPlayerSpot | undefined {
  const ladder = seatLadderOf(w, seat), door = seatDoorOf(w, seat), at = seat.actor.pos;
  const onGraph = !!w.zoneMap[w.zone.id];
  const outermost = ladder.caveStack[0] ?? ladder.caveReturn;
  const anchored = !!outermost && !!w.zoneMap[outermost.zoneId];
  const zoneId = onGraph ? w.zone.id : anchored ? outermost!.zoneId : null;
  const pos = onGraph ? at : anchored ? outermost!.pos : null;
  if (!zoneId || !pos) return undefined;
  const entryFrom = onGraph ? door : outermost?.entryFrom;
  const rungs = ladder.caveReturn ? [...ladder.caveStack, ladder.caveReturn] : [];
  const laddered = !!w.caveMap[w.zone.id] && rungs.length > 0 && rungs.length <= WORLDSTATE_CFG.caveRungCap
    && rungs.every(r => r.kind !== undefined && sidezoneOf(r.kind) !== undefined && typeof r.seed === 'number' && Number.isFinite(r.seed));
  return {
    zoneId, x: pos.x, y: pos.y,
    ...(entryFrom != null ? { entryFrom } : {}),
    ...(laddered ? {
      cave: {
        zoneId: w.zone.id, x: at.x, y: at.y,
        rungs: rungs.map(r => ({
          zoneId: r.zoneId, x: r.pos.x, y: r.pos.y,
          ...(r.entryFrom !== null ? { entryFrom: r.entryFrom } : {}),
          kind: r.kind!, seed: r.seed!,
          ...(r.underSpan ? { underSpan: r.underSpan } : {}),
          ...(r.tier ? { tier: r.tier } : {}),
        })),
      },
    } : {}),
  };
}

/** A saved descent as a ladder (the town portal's way back down). */
export function ladderOfSpot(spot: SavedPlayerSpot): SeatLadder {
  const rungs: CaveRung[] = (spot.cave?.rungs ?? []).map(r => ({
    zoneId: r.zoneId, pos: vec(r.x, r.y), entryFrom: r.entryFrom ?? null, kind: r.kind, seed: r.seed,
    ...(r.underSpan ? { underSpan: r.underSpan } : {}), ...(r.tier ? { tier: r.tier } : {}),
  }));
  const caveReturn = rungs.pop() ?? null;
  return { caveReturn, caveStack: rungs };
}

/** One road a seat stands on this frame: the dwell it builds, and what fires.
 *  A TRAVEL road `make`s its ticket for any seat (THE MUSTER RING fires it for
 *  every member standing on the ring); an ACT (a ward seal, the holdfast's
 *  parley) acts in place and moves nobody. */
interface Road { key: string; kind: string; pos: Vec2; need: number; make?: (s: Seat) => RoadTicket | null; act?: () => void }

/** THE SHARD SCANNER (plan 4.1): every standing player seat's roads, read with
 *  its own body through THE LIFT. Called once per frame at the end of the road
 *  block, on a hosted world alone. */
export function scanShardRoads(w: World): void {
  const link = w.shardWorld;
  if (!link) return;
  const st = roadState(w), host = w.shardRoadHost();
  // Rows of seats no longer here (a leave, a fall) fall away (self-healing).
  const here = new Set<string>();
  for (const s of w.seats) here.add(s.id);
  for (const m of [st.dwell, st.door, st.ladder, st.heard] as Map<string, unknown>[]) for (const id of [...m.keys()]) if (!here.has(id)) m.delete(id);
  for (const set of [st.grace, st.parley]) for (const id of [...set]) if (!here.has(id)) set.delete(id);
  let gates: RealmGateRow[] | null = null;
  for (const seat of w.seats) {
    if (seat.keeper || seat.merc || seat.couch) continue;
    const a = seat.actor, id = seat.id;
    if (a.dead || a.downed) { st.dwell.delete(id); continue; }
    const idle = w.seatIdle(seat) && !a.push;
    // THE MUSTER RING (W4): while its party's ring stands in this unit, a member's roads wait for the party.
    const bound = !!link.mustering?.(id);
    /** The words this seat stands at this frame: [key, word, needs idle]. */
    const words: [string, string, boolean][] = [];
    let road: Road | null = null;
    const mouthIdx = w.mouthUnder(a);
    // THE EXIT GRACE: a climbed-out seat on its mouth holds no road but the
    // exits until it stands clear (the solo block's caveExitGrace, per seat).
    if (st.grace.has(id) && mouthIdx < 0) st.grace.delete(id);
    if (!st.grace.has(id)) {
      if (mouthIdx >= 0) {
        const cm = host.caveEntrances[mouthIdx];
        road = { key: `mouth:${cm.kind}:${Math.round(cm.pos.x)},${Math.round(cm.pos.y)}`, kind: `sidezone:${cm.kind}`, pos: cm.pos, need: dwellOf(cm.kind),
          make: s => host.mouthRoad(s, cm) };
      } else {
        // THE CONDITIONED DOOR and THE SEALED MOUTH speak on the seat's own row.
        const shut = w.mouthRefusalUnder(a);
        if (shut) words.push([`door:${Math.round(shut.pos.x)},${Math.round(shut.pos.y)}`, shut.text, false]);
      }
      if (!road) {
        const g = w.gateUnder(a, gates ??= w.realmGates());
        if (g?.road) {
          road = { key: `gate:${g.key}`, kind: `realm_gate:${g.kind}`, pos: g.pos, need: transitDwell(`realm_gate:${g.kind}`),
            make: g.road };
        } else if (g) words.push([`gate:${g.key}`, SHARD_ROADS_CFG.words.realm, true]);
      }
      if (!road) {
        const seal = w.wardSealUnder(a);
        if (seal) road = { key: `ward:${Math.round(seal.pos.x)},${Math.round(seal.pos.y)}`, kind: `ward_seal:${seal.kind}`, pos: seal.pos,
          need: transitDwell(`ward_seal:${seal.kind}`), act: () => host.breakArenaSeal(seal) };
      }
      if (!road) {
        // HOLDFAST: the parley is consumed per approach (the solo latch, per seat).
        const keeper = w.holdfastNear(a);
        if (!keeper) st.parley.delete(id);
        else if (!st.parley.has(id)) {
          road = { key: 'holdfast', kind: 'holdfast', pos: vec(keeper.pos.x, keeper.pos.y), need: transitDwell('holdfast'),
            act: () => { st.parley.add(id); w.applyAction(seat, { t: 'payToll', index: -1 }); } };
        }
      }
    }
    if (!road) {
      // THE RETREAT LAW: the exits judged from the seat's own door.
      const { onExit, lockedExit } = w.exitUnder(a, seatDoorOf(w, seat));
      if (onExit) {
        const e = onExit, kind = e.boundary ? `zone_exit:${e.boundary}` : 'zone_exit';
        road = { key: `exit:${e.defIndex}`, kind, pos: e.pos, need: transitDwell(kind),
          make: s => host.exitRoad(s, e) };
      } else if (lockedExit) words.push([`lock:${lockedExit.defIndex}`, w.exitLockHint(lockedExit).text, false]);
    }
    // THE SEALED WORDS: the roads this world does not run yet.
    const sealed = host.sealedRoadUnder(seat);
    if (sealed) words.push([`sealed:${sealed.kind}`, SHARD_ROADS_CFG.words[sealed.kind], true]);
    // THE MUSTER RING: a bound member builds no travel dwell (the ring is its road now).
    if (bound && road?.make) road = null;
    // The dwell: one road at a time, built only while idle and unshoved.
    let cur = st.dwell.get(id);
    if (road && idle) {
      if (!cur || cur.key !== road.key) st.dwell.set(id, cur = { key: road.key, kind: road.kind, pos: vec(road.pos.x, road.pos.y), start: w.time, need: road.need });
      if (w.time - cur.start >= cur.need) {
        st.dwell.delete(id);
        if (road.act) road.act();
        else if (road.make) {
          // THE MUSTER RING (W4): the party's muster takes the road first; an
          // independent's (and a party alone in its unit) leaves at once.
          const make = road.make;
          if (!link.muster?.(seat, { key: road.key, kind: road.kind, pos: vec(road.pos.x, road.pos.y), make })) {
            const t = make(seat);
            if (t) link.enqueue(t);
          }
        }
      }
    } else st.dwell.delete(id);
    // The words: once per approach, on the seat's own note row.
    let heard = st.heard.get(id);
    const standing = new Set<string>();
    for (const [key, word, needsIdle] of words) {
      standing.add(key);
      if (heard?.has(key) || (needsIdle && !idle)) continue;
      host.failNote(a, `road:${key}`, word);
      if (!heard) st.heard.set(id, heard = new Set());
      heard.add(key);
    }
    if (heard) for (const key of [...heard]) if (!standing.has(key)) heard.delete(key);
  }
}
