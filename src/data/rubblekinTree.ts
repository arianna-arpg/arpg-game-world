import type { SkillTreeSpec, SummonDelivery } from '../engine/skills';
import { mod } from '../engine/stats';
import { tree, n, body, cap, count, life, damage, speed } from './skillTreeBuilder';

export const rubbleRelease = (skill: string): NonNullable<SummonDelivery['strikeRelease']> => ({ skill, tags: ['attack', 'melee'], reformTime: 4 });

export const RUBBLEKIN_TREE: SkillTreeSpec = tree([
  n('flint_children', 'Flint Children', 'Launched Rubblekin pierce 2 enemies and always inflict bleed.', undefined,
    { summon: { strikeRelease: rubbleRelease('rubble_flint') } }),
  [n('serrated_strata', 'Serrated Strata', 'Launched Rubblekin have 50% increased physical ailment magnitude.', undefined,
    body(mod('statusMagnitude', 'increased', 0.5, ['physical', 'projectile']))),
    n('through_the_ranks', 'Through the Ranks', 'Launched Rubblekin pierce 3 additional enemies.', undefined, body(mod('pierceCount', 'flat', 3, ['projectile']))),
    n('lodged_shale', 'Lodged Shale', 'Launched Rubblekin impale enemies for 25% of physical hit damage.', undefined, body(mod('impalePower', 'flat', 0.25, ['projectile'])))],
  [n('little_avalanche', 'Little Avalanche', '+2 maximum Rubblekin and +2 Rubblekin summoned on activation.', [cap(2), count(2)]),
    n('quarry_legs', 'Quarry Legs', '35% increased minion movement speed and 30% increased minion life.', [speed(0.35), life(0.3)]),
    n('split_strata', 'Split Strata', 'Launching a Rubblekin fires 1 additional stone projectile.', undefined, body(mod('projectileCount', 'flat', 1, ['projectile'])))],
], [
  n('bursting_seams', 'Bursting Seams', 'Launched Rubblekin explode on impact or at the end of their flight, dealing damage in a 72 radius.', undefined,
    { summon: { strikeRelease: rubbleRelease('rubble_burst') } }),
  [n('restless_earth', 'Restless Earth', '35% faster Rubblekin reconstruction.', [mod('minionRespawnTime', 'more', -0.35)]),
    n('fault_pressure', 'Fault Pressure', '35% increased explosion radius.', undefined, body(mod('aoeRadius', 'increased', 0.35, ['projectile']))),
    n('rolling_detonations', 'Rolling Detonations', 'Launched Rubblekin pierce 2 enemies and explode on each hit as well as at the end of their flight.', undefined,
      body(mod('pierceCount', 'flat', 2, ['projectile']), mod('projHitDetonate', 'flat', 1, ['projectile'])))],
  [n('singing_shale', 'Singing Shale', 'Launched Rubblekin become slower conduits that pulse physical damage in a 65 radius every 0.3 seconds.', undefined,
    { summon: { strikeRelease: rubbleRelease('rubble_conduit') } }),
    n('long_echo', 'Long Echo', '50% increased conduit duration.', undefined, body(mod('effectDuration', 'increased', 0.5, ['projectile']))),
    n('gathering_weight', 'Gathering Weight', 'Launched Rubblekin deal 40% more damage, but have 20% less projectile speed.', undefined,
      body(mod('damage', 'more', 0.4, ['projectile']), mod('projectileSpeed', 'more', -0.2, ['projectile'])))],
], n('patient_stones', 'Patient Stones', '15% increased minion life and damage.', [life(0.15), damage(0.15)]));
