import type { MassProvenance, MassTerrain } from './contracts';

/** Ownership proves only
 * an internally constructed frozen ordinary record with own data properties.
 * It never proves dependency freedom or permits skipping recursive work limits. */
const ownedTerrainRecords = new WeakSet<object>();
function ownTerrainRecord<T extends object>(value: T): Readonly<T> {
  Object.freeze(value);
  ownedTerrainRecords.add(value);
  return value;
}
export function isOwnedTerrainRecord(value: object): boolean {
  return ownedTerrainRecords.has(value);
}
export function ownedTerrainSource(generator: string, version: number, rule: string,
  source: string, stream: string): Readonly<MassProvenance> {
  return ownTerrainRecord({ generator, version, rule, source, stream });
}
export function ownedBaseTerrain(region: string, color: string, biome: string,
  fields: Readonly<Record<string, number>>, source: MassProvenance): Readonly<MassTerrain> {
  return ownTerrainRecord({ region, color, biome, fields, source });
}
export function ownedSampleEntry(terrain: MassTerrain, revision: number):
  Readonly<{ terrain: MassTerrain; revision: number }> {
  return ownTerrainRecord({ terrain, revision });
}
