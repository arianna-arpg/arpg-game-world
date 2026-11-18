import type { TreeBuffPatch } from '../engine/skills';
import { tree, n, type Node } from './skillTreeBuilder';
import { mod } from '../engine/stats';

const buff = (node: Node, patch: TreeBuffPatch): Node => ({ ...node, buffs: [patch] });

/** Native command economies use stable node ids, independently of supports. */
export const ASSAULT_TREE = tree([
  buff(n('killing_signal', 'Killing Signal', 'Empowers commanded minions for 6 seconds, causing their next hit to deal 20% more damage and impale for 20% of hit damage.', undefined, { tags: { add: ['buff', 'duration'] } }), { id: 'assault_preparation', affects: 'minions', duration: 6, mods: [mod('damage', 'more', 0.2)] }),
  [n('sure_signal', 'Unerring Signal', 'Empowered minion hits cannot be evaded or dodged.'),
    n('stunning_signal', 'Inescapable Signal', 'Empowered minion melee attacks lock onto their target and hit even if the target moves out of range.'),
    n('finishing_signal', 'Dooming Signal', 'Minion hits also apply Doom, storing 40% of hit damage as chaos damage toward a lethal burst.')],
  [n('rapid_signals', 'Rapid Signals', 'Minion hits have a 20% chance to reduce Command: Assault\'s cooldown by 0.25 seconds.'),
    n('patient_signal', 'Banked Orders', 'While Assault is off cooldown, Rapid Signals store cooldown reduction to empower up to 5 additional hits per minion on your next Assault.'),
    n('rushing_signal', 'Rising Tempo', 'Consuming an empowered hit grants that minion 10% increased movement, attack, and cast speed for 4 seconds (up to 5 stacks).')],
], [
  buff(n('sheltered_advance', 'Sheltered Advance', 'Grants each commanded minion 1 temporary protective ply for 6 seconds that bursts for physical area damage when shattered.', undefined, { tags: { add: ['buff', 'duration'] } }), { id: 'assault_shelter', affects: 'minions', duration: 6, mods: [] }),
  [n('scattered_advance', 'Orbiting Advance', 'On cast, all protective plies on commanded minions also become orbiting blades for 6 seconds that damage enemies on contact.'),
    n('iron_advance', 'Convoking Advance', 'Recalling your minions teleports them to you and triggers a physical aftershock at each minion\'s previous location.'),
    n('flowing_advance', 'Returning Bulwark', 'After losing a ply during Assault, 3 orbiting blade hits restore 1 temporary ply (up to once per minion per Assault).')],
  [n('renewed_advance', 'Defensive Formation', 'While Assault is off cooldown, minions within 200 radius form a defensive ring and evenly split 30% of the life damage you take from hits.'),
    n('mending_advance', 'Nourishing Formation', 'Minions inside your defensive ring regenerate 4 life per second, scaled by your minion damage modifiers.'),
    n('lasting_advance', 'Offensive Formation', 'While Assault is on cooldown, your minions deal 10% more damage.')],
], n('clear_orders', 'Clear Orders', '8% increased cooldown recovery per point. Commanded minions gain 10% increased movement and action speed and 3% increased damage for 6 seconds.', [mod('cooldownRecovery', 'increased', 0.08)]));
