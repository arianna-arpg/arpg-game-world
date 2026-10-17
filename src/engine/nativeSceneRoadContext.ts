/** Exact native road derivations with an explicit actual area state owner.
 * Replaces only the original World-keyed STATE/roadState selections; it never
 * presents a structural facade as a World WeakMap key. */
import {vec,type Vec2} from '../core/math';
import {sidezoneOf} from '../data/sidezones';
import {WORLDSTATE_CFG,type SavedPlayerSpot} from '../meta/worldstate';
import type {CaveRung,RoadTicket} from './shardUnits';
import type {Seat,World} from './world';
import type {SeatLadder} from './shardRoads';
export interface NativeSceneRoadHost {zone:World['zone'];zoneMap:World['zoneMap'];caveMap:World['caveMap'];entryFrom:World['entryFrom'];caveReturn:World['caveReturn'];time:World['time'];shardRoadHost():{readonly caveStack:readonly CaveRung[]}}
export interface NativeSceneRoadDwell {key:string;kind:string;pos:Vec2;start:number;need:number}
export interface NativeSceneRoadState {dwell:Map<string,NativeSceneRoadDwell>;door:Map<string,string|null>;ladder:Map<string,SeatLadder>;grace:Set<string>;heard:Map<string,Set<string>>;parley:Set<string>}
export function freshNativeSceneRoadState():NativeSceneRoadState{return {dwell:new Map(),door:new Map(),ladder:new Map(),grace:new Set(),heard:new Map(),parley:new Set()};}
const copyRung = (r: CaveRung): CaveRung => ({ ...r, pos: vec(r.pos.x, r.pos.y) });
const copyLadder = (l: SeatLadder): SeatLadder => ({ caveReturn: l.caveReturn ? copyRung(l.caveReturn) : null, caveStack: l.caveStack.map(copyRung) });

export function nativeRoadSeatDoorOf(w:NativeSceneRoadHost,state:NativeSceneRoadState, seat: Seat): string | null {
  const st = state;
  return st?.door.has(seat.id) ? st.door.get(seat.id)! : w.entryFrom;
}

export function nativeRoadSeatLadderOf(w:NativeSceneRoadHost,state:NativeSceneRoadState, seat: Seat): SeatLadder {
  const own = state?.ladder.get(seat.id);
  return own ?? { caveReturn: w.caveReturn, caveStack: [...w.shardRoadHost().caveStack] };
}

export function nativeRoadShardSpotOf(w:NativeSceneRoadHost,state:NativeSceneRoadState, seat: Seat): SavedPlayerSpot | undefined {
  const ladder = nativeRoadSeatLadderOf(w,state, seat), door = nativeRoadSeatDoorOf(w,state, seat), at = seat.actor.pos;
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

export function nativeRoadShardRoadArrive(_w:NativeSceneRoadHost,state:NativeSceneRoadState, seat: Seat, t: Pick<RoadTicket,'seatId'|'ladder'|'grace'>, from: string | null): void {
  const st = state, id = seat.id;
  st.door.set(id, from);
  if (t.ladder) st.ladder.set(id, copyLadder(t.ladder)); else st.ladder.delete(id);
  if (t.grace === 'caveExit') st.grace.add(id); else st.grace.delete(id);
  st.dwell.delete(id); st.heard.delete(id); st.parley.delete(id);
}

export function nativeRoadShardRoadDepart(_w:NativeSceneRoadHost,state:NativeSceneRoadState, seatId: string): void {
  const st = state;
  if (!st) return;
  st.dwell.delete(seatId); st.door.delete(seatId); st.ladder.delete(seatId);
  st.grace.delete(seatId); st.heard.delete(seatId); st.parley.delete(seatId);
}

export function nativeRoadRoadDwellRow(w:NativeSceneRoadHost,state:NativeSceneRoadState, seat: Seat): [number, number, number, string] | undefined {
  const d = state?.dwell.get(seat.id);
  if (!d) return undefined;
  const frac = Math.min(1, Math.max(0, (w.time - d.start) / Math.max(0.01, d.need)));
  return [Math.round(d.pos.x), Math.round(d.pos.y), Math.floor(frac * 100) / 100, d.kind];
}
