import { mod } from '../engine/stats';
import { tree, n, type Node } from './skillTreeBuilder';
import type { AttackSequenceSpec } from '../engine/attackSequenceSpec';
const sequence = (node: Node, attackSequence: AttackSequenceSpec): Node => ({ ...node, attackSequence });

/** Two exclusive identities, with independently composable investments. */
export const CLEAVE_TREE = tree([
    sequence(n('readied_cleave', 'Readied Cleave', 'Landed Cleaves build a separate cycle on each target: 10% increased damage per stack, up to 4. The fourth hit receives its full bonus, then resets that target’s stacks.'),
      { hitCycle: { max: 4, increasedPerStack: 0.1 } }),
    [sequence(n('deep_notches', 'Deep Notches', 'Reaching maximum Readied Cleave stacks grants Berserk for 4 seconds: 15% more attack damage, 10% increased attack speed and 3% life leech.'),
      { cycleBuff: { type: 'buff', id: 'berserk', label: 'Berserk', duration: 4,
        mods: [mod('damage', 'more', 0.15, ['attack']), mod('attackSpeed', 'increased', 0.1), mod('lifeLeech', 'flat', 0.03)] } }),
      { ...n('barbed_edge', 'Barbed Edge', 'Toggle to arm Cleave. Your next landed melee attack from another skill releases it toward the victim. Stays armed, with 4 seconds of recovery and 20% less damage. Each release pays the normal mana cost. Starts off.',
        [mod('addedCooldown', 'flat', 4), mod('damage', 'more', -0.2)]),
        trigger: { on: 'meleeHit', guaranteed: true, maxUseTime: 0.7, startsOff: true } },
      sequence(n('splitting_armor', 'Splitting Armor', 'Replace Readied Cleave’s personal damage ramp with vulnerability: after each landed hit, the target takes 10% increased damage from all sources per stored stack. Lasts 8 seconds; the maximum-stack hit benefits before clearing it.'),
        { vulnerability: { perStack: 0.1, duration: 8, label: 'Split Armor' } })],
    [sequence(n('steady_cuts', 'Ready Rhythm', 'Odd Readied Cleave hits apply Bleed at 30% of hit damage per second. Even hits lodge 30% of physical damage as Impale.'),
      { rhythm: { bleed: 0.3, impale: 0.3 } }),
      sequence(n('close_quarters', 'Close Quarters', 'Each stack of the aimed target’s upcoming Readied Cleave hit grants 20% more radius and 20% more arc width. At the fourth hit: 80% more radius and width. Resets with the cycle.'),
        { cycleArea: { radiusPerStack: 0.2, arcPerStack: 0.2 } }),
      sequence(n('finishing_cut', 'Finishing Cut', 'Readied Cleave’s cycle now ends on hit 5. Ready Rhythm’s Impales wait for the finisher. The fifth hit consumes only your Ready Rhythm Bleeds and Impales on that target, dealing 150% of their remaining damage in one physical burst.'),
        { cycleMax: 5, consumeRhythm: { multiplier: 1.5 } })],
  ], [
    sequence(n('unbound_cleave', 'Unbound Cleave', 'Throw an axe for 120% more projectile damage. It lodges in the first enemy hit, holding Cleave’s recovery until you approach within melee reach. Pulling it free inflicts Bleed at 30% of the strike’s damage per second. A dead or missing target returns the axe; a missed throw recovers after 1 second.',
      [mod('damage', 'more', 1.2, ['projectile'])], { tags: { add: ['projectile', 'duration'], remove: ['melee'] } }),
      { thrown: { type: 'projectile', speed: 520, radius: 11, range: 480 },
        recovery: { meleeRange: 55, bleed: 0.3, missCooldown: 1, look: 'construct_axe_catch' } }),
    [sequence(n('long_edge', 'Long Edge', 'The hit immediately inflicts the retrieval Bleed and grants 1 Gyre (up to 5). The axe bounces toward a nearby glyph, taking 2 seconds to land. Enter its glyph before landing to catch it and fire an 8-axe nova at half damage. Fallen axes must still be retrieved; nova axes do not lodge or bounce.'),
      { bounce: { seconds: 2, distance: 100, radius: 26, charge: 'gyre', amount: 1, cap: 5, airLook: 'construct_recovery_glyph', nova: { count: 8, power: 0.5 } } }),
      sequence(n('wide_front', 'Wide Front', 'Each airborne catch adds a Caught Rhythm stack, up to 3. Each stack repeats the next throw once. Catching at least one axe maintains the rhythm; letting every axe land without a catch clears it. Retrieve every outstanding axe to recover Cleave.'),
        { catchBuff: { max: 3, label: 'Caught Rhythm', repeatInterval: 0.16 } }),
      sequence(n('driving_front', 'Driving Front', 'While flying or bouncing, each thrown axe sheds a smaller axe in a random direction every 0.25 seconds, at 18% damage. These smaller axes inherit projectile investment but do not lodge, bounce or shed more axes.'),
        { flightRain: { interval: 0.25, power: 0.18, range: 220, radius: 5 } })],
    [sequence(n('tempered_wave', 'Serrated Wave', 'On cast, immediately sweep a broad strip in front of you while preparing the axe throw. The sweep deals Cleave’s normal melee damage; the axe follows when the cast completes.'),
      { opening: { delivery: { type: 'melee', range: 65, arcDeg: 140, shape: 'band', fx: 'serratedSweep' }, power: 1 } }),
      sequence(n('razor_horizon', 'Spreading Wounds', 'Serrated Wave sweeps back from the opposite side after 0.25 seconds, dealing its damage again. The axe throw still follows the cast.'),
        { backswing: { delay: 0.25, fx: 'serratedBackswing' } }),
      sequence(n('heavy_wave', 'Heavy Wave', 'The main thrown axes erupt in blood on impact: enemies within 75 units take 35% of the strike’s damage and Bleed at 15% per second. Catch novas and shed axes cannot trigger this explosion.'),
        { impactBleed: { radius: 75, power: 0.35, bleed: 0.15 } })],
  ], n('practiced_edge', 'Practiced Edge', '15% more damage.', [mod('damage', 'more', 0.15)]));
