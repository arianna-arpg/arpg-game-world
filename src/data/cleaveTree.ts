import { mod } from '../engine/stats';
import { tree, n, type Node } from './skillTreeBuilder';
const graft = (node: Node, support: string): Node => ({ ...node, graft: { support, level: 1 } });

/** Cleave's exclusive combat identities; all investments use shared skill systems. */
export const CLEAVE_TREE = tree([
    { ...n('readied_cleave', 'Readied Cleave', 'Toggle on to arm Cleave. Your next landed melee attack releases it instantly toward the victim, then it recovers for 2.25 seconds. Stays armed. Each release pays Cleave’s own cost: 50% more mana, 40% more damage. Starts off.', [mod('addedCooldown', 'flat', 2.25), mod('manaCost', 'more', 0.5), mod('damage', 'more', 0.4)]), trigger: { on: 'meleeHit', guaranteed: true, maxUseTime: 0.7, startsOff: true } },
    [n('deep_notches', 'Deep Notches', 'Cleave lodges 30% of physical hit damage as impale. Later hits from any of your skills can discharge it.', [mod('impalePower', 'flat', 0.3)]),
      n('barbed_edge', 'Barbed Edge', 'Cleave always attempts to bleed. Its physical ailments gain 25% increased magnitude.', [mod('apply_bleed', 'flat', 1), mod('statusMagnitude', 'increased', 0.25, ['physical'])]),
      n('splitting_armor', 'Splitting Armor', 'Ignore 15% of enemy armor.', [mod('armorPen', 'flat', 0.15)])],
    [n('steady_cuts', 'Ready Rhythm', '50% increased Cleave cooldown recovery. Faster melee skills can deliver the next release sooner after it recovers.', [mod('cooldownRecovery', 'increased', 0.5)]),
      n('close_quarters', 'Close Quarters', 'Each enemy Cleave hits restores 3 life.', [mod('lifeOnHit', 'flat', 3)]),
      n('finishing_cut', 'Finishing Cut', 'Cull enemies below 8% life.', [mod('cullThreshold', 'flat', 0.08)])],
  ], [
    graft(n('unbound_cleave', 'Unbound Cleave', 'Throw the arc as a traveling crescent, striking each enemy once. 20% less damage and 35% more mana cost.'), 'sweeping_blow'),
    [n('long_edge', 'Long Edge', '35% increased sweep travel and 20% increased duration.', [mod('sweepRange', 'increased', 0.35), mod('effectDuration', 'increased', 0.2)]),
      n('wide_front', 'Wide Front', '30% increased area radius and 25% increased arc width.', [mod('aoeRadius', 'increased', 0.3), mod('swingArc', 'increased', 0.25)]),
      n('driving_front', 'Driving Front', 'Hits gain 45 knockback strength.', [mod('knockback', 'flat', 45)])],
    [n('tempered_wave', 'Serrated Wave', 'The traveling crescent always attempts to bleed enemies it crosses.', [mod('apply_bleed', 'flat', 1)]),
      n('razor_horizon', 'Spreading Wounds', 'Bleeds spread when their victim dies. 25% increased physical ailment magnitude.', [mod('dotPropagates', 'flat', 1), mod('statusMagnitude', 'increased', 0.25, ['physical'])]),
      n('heavy_wave', 'Heavy Wave', '35% more damage at 15% less attack speed.', [mod('damage', 'more', 0.35), mod('attackSpeed', 'more', -0.15)])],
  ], n('practiced_edge', 'Practiced Edge', '15% increased damage.', [mod('damage', 'increased', 0.15)]));
