import type { Vec2 } from '../core/math';
import type { SavedPlayerSpot } from '../meta/worldstate';

/** A run-owned round trip. World coordinates and cave ladders are saved,
 *  never screen positions or transient actor ids. One passage per seat. */
export interface TownPortal {
  owner: string;
  origin: SavedPlayerSpot;
  originTier: number;
  sourcePos: Vec2;
  sourceSeed: number;
  sourceEntryFrom?: string;
  destination: string;
  destinationPos?: Vec2;
  returning: boolean;
}
export interface TownPortalView { pos: Vec2; tier: number; label: string; owner: string; frac: number }

export function readTownPortals(raw: unknown): TownPortal[] {
  if (!Array.isArray(raw)) return [];
  const pos = (p: Vec2 | undefined): boolean => !!p && Number.isFinite(p.x) && Number.isFinite(p.y);
  return raw.filter((p): p is TownPortal => !!p && typeof p.owner === 'string'
    && typeof p.destination === 'string' && typeof p.origin?.zoneId === 'string'
    && Number.isFinite(p.origin.x) && Number.isFinite(p.origin.y)
    && Number.isFinite(p.originTier) && Number.isFinite(p.sourceSeed) && pos(p.sourcePos)
    && (p.sourceEntryFrom === undefined || typeof p.sourceEntryFrom === 'string')
    && (!p.returning || pos(p.destinationPos)))
    .map(p => structuredClone(p));
}
