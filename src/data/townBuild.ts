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

/** Where the Salvage Station's bench stands — shared by the fixture and the
 *  World's nearSalvage dwell check. Beside the blacksmith (Brandt at ~450,320):
 *  break your loot, then spend it at his counter three steps away. */
export const SALVAGE_SITE = { x: 620, y: 250 };

/** Where the Tracker pitches camp — the town's west edge, half in the wilds
 *  (a huntsman sleeps closest to what he studies). Shared by the fixture,
 *  the NPC spawn, and the World's nearTracker dwell check. */
export const TRACKER_SITE = { x: 230, y: 600 };

/** Where the Oracle's standing stones rise — shared by the fixture and the
 *  World's nearOracle dwell check. The expanded south, past the campfire:
 *  magic happens at the town's quiet edge. */
export const ORACLE_SITE = { x: 1080, y: 1010 };

/** Where the Mercenary Recruiter's table stands — the east quarter, on the
 *  coin-changing side of town between the Caravan camp and the quartermaster.
 *  Shared by the World's officer spawn + banner (no structure of its own:
 *  a table, a banner, a body). */
export const RECRUITER_SITE = { x: 1350, y: 560 };

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
  // The Salvage Station — beside the blacksmith. Dwell at the bench for the
  // salvage/craft menu (the World reads proximity to SALVAGE_SITE).
  {
    feature: FEATURE.SALVAGE_STATION,
    fixtures: [{ structure: 'salvage_bench', x: SALVAGE_SITE.x, y: SALVAGE_SITE.y }],
  },
  // The Tracker's camp — the west edge. Dwell by the fire for the BESTIARY
  // (the World reads proximity to TRACKER_SITE; the NPC spawns there too).
  {
    feature: FEATURE.TRACKER,
    fixtures: [{ structure: 'wayside_camp', x: TRACKER_SITE.x, y: TRACKER_SITE.y }],
    grow: { w: 1700, h: 1200 },
  },
  // The Oracle Stone — the expanded south edge. Dwell among the stones for
  // the communion (reroll) menu (the World reads proximity to ORACLE_SITE).
  {
    feature: FEATURE.ORACLE_STONE,
    fixtures: [{ structure: 'oracle_site', x: ORACLE_SITE.x, y: ORACLE_SITE.y }],
    grow: { w: 1700, h: 1200 },
  },
  // The Mercenary Recruiter — the east quarter. No structure of his own
  // (the World seats the officer + banner at RECRUITER_SITE and arms the
  // locked market); the town GROWS so his corner exists.
  {
    feature: FEATURE.MERC_RECRUITER,
    fixtures: [],
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
