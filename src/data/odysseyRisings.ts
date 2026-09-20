import type { DoodadKind } from '../engine/levelgen';
import type { DayPhase } from '../world/daynight';

/** Reusable scenery-born Odyssey pressure. Arrays are indexed by leaders
 * defeated, so surviving factions escalate without changing ambient stats. */
export interface OdysseyRisingDef {
  id: string; faction: string; name: string; phases: DayPhase[];
  startsAfter: number; everySec: number[]; preparedInterval: number;
  batch: number; fieldCap: number; warningSec: number; entryGraceSec: number;
  retrySec: number; sourceRange: [number, number]; abandonRange: number;
  sourceKinds: DoodadKind[]; roster: string[];
  spawnRing: number; placementAttempts: number; portalClear: number;
  orderSec: number;
  /** Registered effect voices; each cue marks an actual reserved birth site. */
  cue: { fx: string; color: string; radiusMul: number; settleFx: string; settleSec: number };
}

export const ODYSSEY_RISINGS: OdysseyRisingDef[] = [{
  id: 'undead_nights', faction: 'undead', name: 'Undead nights', phases: ['night'],
  startsAfter: 0, everySec: [32, 24, 16, 10], preparedInterval: 2,
  batch: 2, fieldCap: 10, warningSec: 4, entryGraceSec: 8, retrySec: 3,
  sourceRange: [180, 520], abandonRange: 650,
  sourceKinds: ['tombstone', 'bone_pile', 'bone_cairn', 'burial_urn', 'dead_tree', 'stump', 'rubble'],
  roster: ['zombie', 'skeleton_warrior', 'skeleton_archer'],
  spawnRing: 36, placementAttempts: 12, portalClear: 90, orderSec: 12,
  cue: { fx: 'earth_rising', color: '#b49b78', radiusMul: 2.2, settleFx: 'earth_settle', settleSec: 0.65 },
}];

export function risingInterval(def: OdysseyRisingDef, defeated: number, prepared: boolean): number {
  return def.everySec[Math.min(def.everySec.length - 1, Math.max(0, defeated))]
    * (prepared ? def.preparedInterval : 1);
}

export const risingTag = (id: string): string => `odyssey_rising:${id}`;
