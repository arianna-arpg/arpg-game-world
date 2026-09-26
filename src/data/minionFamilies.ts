import { registerMinionFamily } from '../engine/skillScopes';

/** Open, overlapping memberships. Variant identity uses body:<monster id>. */
export const MINION_FAMILIES = {
  swarm: ['swarmling', 'gnatling', 'hive_royal_guard'],
  golem: ['stone_golem', 'bone_golem', 'fire_golem', 'ice_golem', 'blood_golem'],
  rubblekin: ['rubblekin'],
  earthborn: ['stone_golem', 'rubblekin'],
  skeleton: ['skeleton_warrior', 'skeleton_archer', 'skeletal_sentinel', 'skeletal_duelist',
    'skeletal_pyromancer', 'skeletal_cryomancer', 'skeletal_stormcaller', 'skeletal_venomancer', 'ossuary_lich'],
  skeletal_mage: ['skeletal_pyromancer', 'skeletal_cryomancer', 'skeletal_stormcaller', 'skeletal_venomancer', 'ossuary_lich'],
} as const;
for (const [family, bodies] of Object.entries(MINION_FAMILIES)) registerMinionFamily(family, bodies);
