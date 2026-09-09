/** Run-locked geography algorithms. Unversioned saved runs use the old field. */
export const GEOGRAPHY_VERSION = 2;
const versions = new Map<number, number>();
export function installGeography(seed: number, version: number): void {
  versions.set(seed >>> 0, version === GEOGRAPHY_VERSION ? version : 1);
}
export const geographyVersion = (seed: number): number => versions.get(seed >>> 0) ?? 1;
