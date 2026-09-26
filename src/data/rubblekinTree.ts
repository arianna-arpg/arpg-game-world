import type { SkillTreeSpec, SummonDelivery } from '../engine/skills';
import { mod } from '../engine/stats';
import { tree, n, body, cap, count, life, damage, speed } from './skillTreeBuilder';

export const rubbleRelease = (skill: string): NonNullable<SummonDelivery['strikeRelease']> => ({ skill, tags: ['attack', 'melee'], reformTime: 4 });

export const RUBBLEKIN_TREE: SkillTreeSpec = tree([
  n('flint_children', 'Flint Children', 'Released stones become sharp flint: pierce two enemies and always bleed.', undefined,
    { summon: { strikeRelease: rubbleRelease('rubble_flint') } }),
  [n('serrated_strata', 'Serrated Strata', 'Released flint causes 50% stronger physical ailments.', undefined,
    body(mod('statusMagnitude', 'increased', 0.5, ['physical', 'projectile']))),
    n('through_the_ranks', 'Through the Ranks', 'Released stones pierce three additional enemies.', undefined, body(mod('pierceCount', 'flat', 3, ['projectile']))),
    n('lodged_shale', 'Lodged Shale', 'Released stones lodge 25% of physical hit damage as Impale.', undefined, body(mod('impalePower', 'flat', 0.25, ['projectile'])))],
  [n('little_avalanche', 'Little Avalanche', 'Two more reserved Rubblekin slots and two more bodies on activation. Each slot retains its mana cost.', [cap(2), count(2)]),
    n('quarry_legs', 'Quarry Legs', 'Rubblekin move 35% faster and gain 30% increased life.', [speed(0.35), life(0.3)]),
    n('split_strata', 'Split Strata', 'Each release throws one additional stone fragment. Fragments never create extra living bodies.', undefined, body(mod('projectileCount', 'flat', 1, ['projectile'])))],
], [
  n('bursting_seams', 'Bursting Seams', 'Released stones burst on impact or at the end of their flight, striking a 72-base-radius area.', undefined,
    { summon: { strikeRelease: rubbleRelease('rubble_burst') } }),
  [n('restless_earth', 'Restless Earth', '35% faster reconstruction after launching or dying.', [mod('minionRespawnTime', 'more', -0.35)]),
    n('fault_pressure', 'Fault Pressure', 'Released stone explosions have 35% increased radius.', undefined, body(mod('aoeRadius', 'increased', 0.35, ['projectile']))),
    n('rolling_detonations', 'Rolling Detonations', 'Released stones pierce twice and explode at each impact as well as when their flight ends.', undefined,
      body(mod('pierceCount', 'flat', 2, ['projectile']), mod('projHitDetonate', 'flat', 1, ['projectile'])))],
  [n('singing_shale', 'Singing Shale', 'Released stones become slower, explosive conduits that pulse physical hits in a 65-base-radius area every 0.3 seconds.', undefined,
    { summon: { strikeRelease: rubbleRelease('rubble_conduit') } }),
    n('long_echo', 'Long Echo', 'Conduits last 50% longer.', undefined, body(mod('effectDuration', 'increased', 0.5, ['projectile']))),
    n('gathering_weight', 'Gathering Weight', 'Released stones deal 40% more damage but travel 20% slower.', undefined,
      body(mod('damage', 'more', 0.4, ['projectile']), mod('projectileSpeed', 'more', -0.2, ['projectile'])))],
], n('patient_stones', 'Patient Stones', 'Rubblekin gain 15% increased life and damage.', [life(0.15), damage(0.15)]));
