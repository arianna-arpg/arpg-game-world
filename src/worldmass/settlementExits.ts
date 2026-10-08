import type { Vec2 } from '../core/math';
import { regionKind } from '../world/regions';
export type SettlementEdge = 'north' | 'east' | 'south' | 'west';
export interface SettlementFoundation {
  zone: {size: {w: number; h: number}}; grid: {cellSize: number};
  foundationRegion(x: number, y: number): string | undefined;
}
/** The road and its fence opening choose the same immutable native edge. */
export function settlementDeparture(town: SettlementFoundation, edge: SettlementEdge): Vec2 {
  const {w, h} = town.zone.size, cs = town.grid.cellSize;
  const horizontal = edge === 'east' || edge === 'west', extent = horizontal ? h : w;
  const candidates: {pos: Vec2; score: number}[] = [];
  for (let t = cs * 2.5; t < extent - cs * 2; t += cs) {
    const pos = horizontal ? {x: edge === 'east' ? w - cs / 2 : cs / 2, y: t}
      : {x: t, y: edge === 'south' ? h - cs / 2 : cs / 2};
    const kind = town.foundationRegion(pos.x, pos.y);
    if (!kind || !regionKind(kind)?.walkable) continue;
    candidates.push({pos, score: Math.abs(t - extent / 2) + (kind === 'path' || kind === 'road' ? -extent : 0)});
  }
  candidates.sort((a, b) => a.score - b.score);
  if (!candidates.length) throw Error('Settlement has no traversable frontier edge');
  return candidates[0].pos;
}
