import { mod } from '../engine/stats';
import { tree, n, type Node } from './skillTreeBuilder';
import type { AttackSequenceSpec } from '../engine/attackSequenceSpec';
const sequence = (node: Node, attackSequence: AttackSequenceSpec): Node => ({ ...node, attackSequence });

/** Two exclusive identities, with independently composable investments. */
export const CLEAVE_TREE = tree([
    sequence(n('readied_cleave', 'Readied Cleave', 'Hits build up to 4 stacks on each target, granting 10% increased damage per stack. The 4th hit gains the full bonus and resets the stacks on that target.'),
      { hitCycle: { max: 4, increasedPerStack: 0.1 } }),
    [sequence(n('deep_notches', 'Deep Notches', 'Reaching maximum Readied Cleave stacks grants Berserk for 4 seconds: 15% more attack damage, 10% increased attack speed, and 3% life leech.'),
      { cycleBuff: { type: 'buff', id: 'berserk', label: 'Berserk', duration: 4,
        mods: [mod('damage', 'more', 0.15, ['attack']), mod('attackSpeed', 'increased', 0.1), mod('lifeLeech', 'flat', 0.03)] } }),
      { ...n('barbed_edge', 'Barbed Edge', 'Toggle to prime Cleave. Your next melee hit with another skill triggers Cleave toward the target (4s cooldown, costs mana as normal). Deals 20% less damage.',
        [mod('addedCooldown', 'flat', 4), mod('damage', 'more', -0.2)]),
        trigger: { on: 'meleeHit', guaranteed: true, maxUseTime: 0.7, startsOff: true } },
      sequence(n('splitting_armor', 'Splitting Armor', 'Instead of increasing Cleave\'s damage per stack, targets take 10% increased damage from all sources per Readied Cleave stack for 8 seconds. Resets after the maximum-stack hit.'),
        { vulnerability: { perStack: 0.1, duration: 8, label: 'Split Armor' } })],
    [sequence(n('steady_cuts', 'Ready Rhythm', 'Odd-numbered Readied Cleave hits inflict bleed for 30% of hit damage per second. Even-numbered hits impale for 30% of physical hit damage.'),
      { rhythm: { bleed: 0.3, impale: 0.3 } }),
      sequence(n('close_quarters', 'Close Quarters', 'Grants 20% more area radius and arc width per Readied Cleave stack on your primary target (up to 80% more on the 4th hit).'),
        { cycleArea: { radiusPerStack: 0.2, arcPerStack: 0.2 } }),
      sequence(n('finishing_cut', 'Finishing Cut', 'Increases Readied Cleave\'s cycle to 5 hits. Ready Rhythm impales are stored until the 5th hit, which consumes all of your Ready Rhythm bleeds and impales on the target to deal 150% of their remaining damage immediately.'),
        { cycleMax: 5, consumeRhythm: { multiplier: 1.5 } })],
  ], [
    sequence(n('unbound_cleave', 'Unbound Cleave', 'Throws your axe for 120% more projectile damage, lodging in the first enemy hit. Approach within melee range to pull the axe free, readying the skill and inflicting bleed for 30% of hit damage per second (recovers after 1s if missed, or immediately if the target dies).',
      [mod('damage', 'more', 1.2, ['projectile'])], { tags: { add: ['projectile', 'duration'], remove: ['melee'] } }),
      { thrown: { type: 'projectile', speed: 520, radius: 11, range: 480 },
        recovery: { meleeRange: 55, bleed: 0.3, missCooldown: 1, look: 'construct_axe_catch' } }),
    [sequence(n('long_edge', 'Long Edge', 'Hits immediately inflict the retrieval bleed, grant 1 Gyre (up to 5), and cause the axe to ricochet toward a nearby landing mark over 2 seconds. Catching the axe at the mark before it lands fires a nova of 8 axes at 50% damage.', undefined),
      { bounce: { seconds: 2, distance: 100, radius: 26, charge: 'gyre', amount: 1, cap: 5, airLook: 'construct_recovery_glyph', nova: { count: 8, power: 0.5 } } }),
      sequence(n('wide_front', 'Wide Front', 'Catching a ricocheting axe grants a stack of Caught Rhythm (up to 3), causing your next throw to repeat once per stack. Letting all axes land without catching one clears your stacks.'),
        { catchBuff: { max: 3, label: 'Caught Rhythm', repeatInterval: 0.16 } }),
      sequence(n('driving_front', 'Driving Front', 'While airborne, each thrown axe fires a smaller axe in a random direction every 0.25 seconds for 18% damage.'),
        { flightRain: { interval: 0.25, power: 0.18, range: 220, radius: 5 } })],
    [sequence(n('heavy_wave', 'Heavy Wave', 'Thrown axes burst on impact, dealing 35% of hit damage and inflicting bleed for 15% of hit damage per second to enemies within 75 radius.'),
      { impactBleed: { radius: 75, power: 0.35, bleed: 0.15 } }),
      sequence(n('razor_horizon', 'Spreading Wounds', 'Performs a wide melee backswing 0.25 seconds into the throw for 100% of Cleave\'s melee damage.'),
        { castSweeps: [{ delay: 0.25, delivery: { type: 'melee', range: 65, arcDeg: 140, shape: 'band', fx: 'serratedBackswing' }, power: 1 }] }),
      sequence(n('tempered_wave', 'Serrated Wave', 'Performs a wide melee slash at the start of the throw for 100% of Cleave\'s melee damage.'),
        { castSweeps: [{ delay: 0, delivery: { type: 'melee', range: 65, arcDeg: 140, shape: 'band', fx: 'serratedSweep' }, power: 1 }] })],
  ], n('practiced_edge', 'Practiced Edge', '15% more damage.', [mod('damage', 'more', 0.15)]));
