import { FEATURE } from '../meta/account';
import { FIXTURE_IDS } from './monsters';

/** One authored range for normal town arrivals and immediate developer unlocks. */
export const TRAINING_YARD = {
  feature: FEATURE.TARGET_DUMMY,
  site: 'training_yard' as const,
  targets: [
    { id: 'post', monster: FIXTURE_IDS.target_dummy, x: 0, y: 0 },
    ...[FIXTURE_IDS.target_dummy_pyre, FIXTURE_IDS.target_dummy_rime, FIXTURE_IDS.target_dummy_storm,
      FIXTURE_IDS.target_dummy_void, FIXTURE_IDS.target_dummy_colossus]
      .map((monster, i) => ({ id: monster, monster, x: 52 * (i + 1), y: 0 })),
    ...Array.from({ length: 3 }, (_, i) => ({ id: `gauntlet_${i}`, monster: FIXTURE_IDS.target_dummy, x: 340 + 130 * i, y: 0 })),
  ],
  backstops: [{ x: 690, y: -16, radius: 26 }, { x: 690, y: 18, radius: 26 }],
};
