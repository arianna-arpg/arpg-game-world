import type {NativeAreaDirectoryView} from '../worldmass/nativeAreaDirectoryView';
/** Native per-seat road scan over the exact area-owned road state. */
import {vec,type Vec2} from '../core/math';
import {dwellOf} from '../data/sidezones';
import {transitDwell} from '../data/transit';
import type {NativeAreaRoadDestination} from '../worldmass/nativeAreaRoadDestination';
import type {ShardWorldLink} from './shardUnits';
import type {ShardRoadHost} from './shardRoads';
import type {Actor} from './actor';
import type {World,Seat} from './world';
import type {RoadTicket} from './shardUnits';
import {SHARD_ROADS_CFG,type RealmGateRow} from './shardRoads';
import type {NativeSceneRoadState} from './nativeSceneRoadContext';
interface Road { key: string; kind: string; pos: Vec2; need: number; make?: (s: Seat) => RoadTicket<NativeAreaRoadDestination> | null; act?: () => void }
export interface NativeSceneRoadScanHost {
 seatDoorOf(seat:Seat):string|null;
 applyAction:World["applyAction"];
 exitLockHint:World["exitLockHint"];
 exitUnder:World["exitUnder"];
 gateUnder(a:Actor,gates:readonly RealmGateRow<NativeAreaRoadDestination>[]):RealmGateRow<NativeAreaRoadDestination>|null;
 holdfastNear:World["holdfastNear"];
 mouthRefusalUnder:World["mouthRefusalUnder"];
 mouthUnder:World["mouthUnder"];
 realmGates():RealmGateRow<NativeAreaRoadDestination>[];
 seatIdle:World["seatIdle"];
 readonly seats:readonly Seat[];
 shardRoadHost():ShardRoadHost<NativeAreaRoadDestination>;
 shardWorld:ShardWorldLink<NativeAreaRoadDestination,NativeAreaDirectoryView>|undefined;
 time:World["time"];
 wardSealUnder:World["wardSealUnder"];
}

export function scanNativeSceneRoads(w:NativeSceneRoadScanHost,state:NativeSceneRoadState): void {
  const link = w.shardWorld;
  if (!link) return;
  const st = state, host = w.shardRoadHost();
  // Rows of seats no longer here (a leave, a fall) fall away (self-healing).
  const here = new Set<string>();
  for (const s of w.seats) here.add(s.id);
  for (const m of [st.dwell, st.door, st.ladder, st.heard] as Map<string, unknown>[]) for (const id of [...m.keys()]) if (!here.has(id)) m.delete(id);
  for (const set of [st.grace, st.parley]) for (const id of [...set]) if (!here.has(id)) set.delete(id);
  let gates: RealmGateRow<NativeAreaRoadDestination>[] | null = null;
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
      const { onExit, lockedExit } = w.exitUnder(a, w.seatDoorOf(seat));
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
