import type { ChallengeSpec } from '../engine/challengeSpec';
import { mod } from '../engine/stats';
import { tree, n, type Node } from './skillTreeBuilder';
const challenge = (node: Node, spec: ChallengeSpec): Node => ({ ...node, challenge: spec });

export const GOAD_TREE = tree([
  n('barbed_challenge', 'Barbed Challenge', 'Hits always inflict bleed.', [mod('apply_bleed', 'flat', 1)]),
  [challenge(n('deep_barb', 'Splintering Barb', 'Primary hits split into 2 splinters that deal 45% damage and inherit Goad\'s bleed and taunt.'), { splinters: { count: 2, power: 0.45, spread: 55 } }),
    challenge(n('patient_barb', 'Orbiting Ballast', 'Hits leave a stone orbiting the target for 3 seconds (up to 12) that deals 30% of projectile damage to nearby enemies (up to once every 0.65s per enemy).'), { ballast: { duration: 3, radius: 52, power: 0.3, rehit: 0.65, cap: 12 } }),
    n('feeding_barb', 'Feeding Barb', 'Recover life equal to 6% of bleed damage dealt by this skill.', [mod('dotLeech_bleed', 'flat', 0.06)])],
  [challenge(n('ready_challenge', 'Reopening Challenge', 'Casting has a 35% chance to reset Goad\'s cooldown and empower the next cast to consume existing bleeds on the target for 50% of their remaining damage, applying a fresh bleed and Hemorrhage.'), { resetChance: 0.35, bleedPop: 0.5 }),
    challenge(n('cheap_challenge', 'Measured Reopening', 'Guarantees a cooldown reset and empowered follow-up once every 10 seconds.'), { guaranteedResetEvery: 10 }),
    challenge(n('swift_challenge', 'Driven Barb', 'Impales enemies for 35% of physical hit damage. Impales inflicted on bleeding targets are 50% stronger.', [mod('impalePower', 'flat', 0.35)]), { bleedingImpaleMore: 0.5 })],
], [
  challenge(n('pack_challenge', 'Goading Effigy', 'Lobs a stone to the target location, raising a destructible effigy for 6 seconds (+3s cooldown). The effigy taunts enemies within 180 radius every second and has thorns equal to 150% of Goad\'s average hit damage.', [mod('addedCooldown', 'flat', 3)], { tags: { add: ['aoe', 'minion', 'duration'], remove: ['projectile'] } }), { device: { look: 'object_goad_effigy', duration: 6, radius: 180, life: 100, thornsRatio: 1.5, interval: 1, range: 420 } }),
  [challenge(n('seeking_challenge', 'Resonant Provocation', 'Enemies taunted by the effigy have a 45% chance to trigger an aftershock beneath them after 0.55 seconds, dealing 55% damage in a 65 radius.'), { aftershock: { chance: 0.45, delay: 0.55, radius: 65, power: 0.55 } }),
    challenge(n('large_challenge', 'Rolling Upheaval', 'Aftershocks have a 30% chance to become a greater aftershock, dealing 100% damage in a 110 radius and triggering 3 standard aftershocks.'), { greaterShock: { chance: 0.3, radius: 110, power: 1, echoes: 3 } }),
    challenge(n('piercing_challenge', 'Burrowing Pursuer', 'Each effigy spawns an untargetable burrowing pursuer that hunts enemies within the effigy\'s radius, leaving a damaging wake and striking its target every 0.8 seconds.'), { creeper: { look: 'object_burrowing_pursuer', speed: 180, trailRadius: 24, trailDuration: 1.2, trailPower: 0.12, strikePower: 0.4, strikeInterval: 0.8 } })],
  [challenge(n('certain_challenge', 'Lodged Contagion', 'Allied hits against enemies within the effigy\'s radius also impale other enemies within 110 radius of the target for 20% of hit damage.'), { impaleField: { ratio: 0.2, radius: 110 } }),
    challenge(n('paid_challenge', 'Field of Wounds', 'Enemies within the effigy\'s radius bleed for 25% of Goad\'s average damage per second, stacking across multiple effigies.'), { bleedingField: { power: 0.25 } }),
    challenge(n('lasting_challenge', 'Standing Provocation', '40% increased effect duration and +4 maximum active Goading Effigies (up to 5).', [mod('effectDuration', 'increased', 0.4)]), { deviceCap: 5 })],
], n('goad_practice', 'Practiced Goad', '15% increased damage.', [mod('damage', 'increased', 0.15)]));
