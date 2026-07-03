// ---------------------------------------------------------------------------
// TOWN-BUILDING FRAMEWORK — the roguelite town as data.
//
// Each account-unlocked town FEATURE may add structures to Lastlight (and grow
// its footprint to fit). A future town feature (bounty board, temple, stash) is
// ONE more TOWN_ADDITIONS entry. Applied at World construction by CLONE-replace
// of the per-run town def — never mutating the static ZONES (cloneZones shares
// the fixtures array by reference, so we always build a fresh one).
// ---------------------------------------------------------------------------

import { FEATURE, type Account } from '../meta/account';
import type { ZoneDef } from './zones';

export interface TownAddition {
  /** The account FEATURE flag that enables this addition. */
  feature: string;
  fixtures: { structure: string; x: number; y: number }[];
  /** Minimum arena size once this addition is present (maxed in). */
  grow?: { w: number; h: number };
}

/** Where the Training Dummy's yard stands in the expanded town — shared by the
 *  fixture (the visual yard) and the World's dummy spawn so they line up. */
export const TRAINING_YARD = { x: 360, y: 880 };

/** Where the Campfire sits in the expanded town — shared by the fixture (the
 *  visual fire) and the World's dwell check so the resting site lines up. */
export const CAMPFIRE_SITE = { x: 850, y: 1010 };

/** Where the Caravan camps in the expanded town — shared by the fixture and the
 *  World's nearCaravan proximity check. Set to the NORTH quarter, clear of the eastern
 *  exit portal to Wayfarer's Crossroads (and the other townsfolk). */
export const CARAVAN_SITE = { x: 1300, y: 220 };

export const TOWN_ADDITIONS: TownAddition[] = [
  // The Quest Package: a quartermaster's house raised in the town's expanded
  // south-east quarter (clear of the original cottages so it never walls one in).
  {
    feature: FEATURE.QUEST_GIVER,
    fixtures: [{ structure: 'quest_house', x: 1300, y: 880 }],
    grow: { w: 1700, h: 1200 },
  },
  // The Training Dummy's yard — the town's expanded south-west quarter. Grows the
  // town to fit so the yard exists even without the Quest Package.
  {
    feature: FEATURE.TARGET_DUMMY,
    fixtures: [{ structure: 'training_yard', x: TRAINING_YARD.x, y: TRAINING_YARD.y }],
    grow: { w: 1700, h: 1200 },
  },
  // The Campfire — the town's expanded south-centre. Dwell here to refresh the
  // wilds (the World reads proximity to CAMPFIRE_SITE).
  {
    feature: FEATURE.CAMPFIRE,
    fixtures: [{ structure: 'campfire_site', x: CAMPFIRE_SITE.x, y: CAMPFIRE_SITE.y }],
    grow: { w: 1700, h: 1200 },
  },
  // The Caravan — the town's expanded east edge. Dwell by the Caravanner for the
  // band-travel menu (the World reads proximity to the caravanner actor). Gated on
  // the BASE Caravan tier; higher tiers only widen the menu, not the town.
  {
    feature: FEATURE.CARAVAN,
    fixtures: [{ structure: 'caravan', x: CARAVAN_SITE.x, y: CARAVAN_SITE.y }],
    grow: { w: 1700, h: 1200 },
  },
];

/** Build the per-run town def: clone the base, append every account-enabled
 *  addition's fixtures into a FRESH array, and grow to fit. Returns a NEW def. */
export function expandedTown(account: Account, base: ZoneDef): ZoneDef {
  let fixtures = base.fixtures ? [...base.fixtures] : [];
  let size = { ...base.size };
  for (const add of TOWN_ADDITIONS) {
    if (!account.features.has(add.feature)) continue;
    fixtures = [...fixtures, ...add.fixtures];
    if (add.grow) size = { w: Math.max(size.w, add.grow.w), h: Math.max(size.h, add.grow.h) };
  }
  return { ...base, size, fixtures };
}
