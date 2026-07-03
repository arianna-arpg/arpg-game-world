// ---------------------------------------------------------------------------
// THE CARAVAN — level-band escorted travel (data).
//
// The Caravanner in town offers a menu of 10-level BRACKETS. Picking band N mints
// (once) a fixed route into that difficulty BAND on the map (via the level field,
// like the Unmade arena — a lvl-50 band sits far out, NOT near town) and escorts the
// player there along a connecting TRAIL of waystations. Re-picking band N in the same
// world always returns to that same minted destination (a fixed route, not effortless
// re-rolling). Round-trip: a Caravanner waits at each destination to ferry you home.
//
// Each band is gated by a Vault TIER (a FEATURE flag); the far tiers also require the
// Unmade slain. Band → tier is pure data here so adding a band is one row.
// ---------------------------------------------------------------------------

import { FEATURE } from '../meta/account';

export interface CaravanBand {
  /** Bracket index (1 = lvl 1-10, 2 = 11-20, …). */
  band: number;
  /** The zone level minted for this band (top of the bracket; the level field then
   *  reads ~this ± a little, so the route genuinely sits in the band). */
  level: number;
  /** The Vault FEATURE flag that must be owned for this band to appear in the menu. */
  feature: string;
}

/** The bands the Caravanner can run, lowest first. Grouped under the four broad Vault
 *  tiers (Caravan / Deep Roads / Far Roads / World Roads). */
export const CARAVAN_BANDS: CaravanBand[] = [
  { band: 1, level: 10, feature: FEATURE.CARAVAN },
  { band: 2, level: 20, feature: FEATURE.CARAVAN },
  { band: 3, level: 30, feature: FEATURE.CARAVAN_DEEP },
  { band: 4, level: 40, feature: FEATURE.CARAVAN_FAR },
  { band: 5, level: 50, feature: FEATURE.CARAVAN_FAR },
  { band: 6, level: 60, feature: FEATURE.CARAVAN_WORLD },
  { band: 7, level: 70, feature: FEATURE.CARAVAN_WORLD },
  { band: 8, level: 80, feature: FEATURE.CARAVAN_WORLD },
  { band: 9, level: 90, feature: FEATURE.CARAVAN_WORLD },
  { band: 10, level: 100, feature: FEATURE.CARAVAN_WORLD },
];

export function caravanBand(band: number): CaravanBand | undefined {
  return CARAVAN_BANDS.find(b => b.band === band);
}

/** Label for the bracket, e.g. band 2 → "lvl 11–20". */
export function caravanBandLabel(band: number): string {
  return `lvl ${(band - 1) * 10 + 1}–${band * 10}`;
}
