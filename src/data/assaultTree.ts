import type { TreeBuffPatch } from '../engine/skills';
import { tree, n, type Node } from './skillTreeBuilder';
import { mod } from '../engine/stats';

const buff = (node: Node, patch: TreeBuffPatch): Node => ({ ...node, buffs: [patch] });

/** Native command economies use stable node ids, independently of supports. */
export const ASSAULT_TREE = tree([
  buff(n('killing_signal', 'Killing Signal', 'Prepare each commanded minion for 6 base seconds. Its next landed hit deals 20% more damage and impales for 20% of each damage type dealt. Each impale is released by a later hit of its own damage type.', undefined, { tags: { add: ['buff', 'duration'] } }), { id: 'assault_preparation', affects: 'minions', duration: 6, mods: [mod('damage', 'more', 0.2)] }),
  [n('sure_signal', 'Unerring Signal', 'Prepared hits cannot be evaded or dodged. Immunity, armor and protective plies still apply.'),
    n('stunning_signal', 'Inescapable Signal', 'Prepared melee swings lock their target when the swing begins. The strike reaches that target when the swing finishes, even if it has moved out of reach. Projectiles retain their normal flight.'),
    n('finishing_signal', 'Dooming Signal', 'Every landed minion hit also applies Doom, banking 40% of its damage as chaos Doom. Repeated hits accumulate toward a lethal sentence.')],
  [n('rapid_signals', 'Rapid Signals', 'Each landed minion hit has a 20% chance to remove 0.25 seconds from Command: Assault’s remaining cooldown.'),
    n('patient_signal', 'Banked Orders', 'While Assault is ready, Rapid Signals bank their cooldown reductions. Each full cooldown banked prepares one extra hit on the next Assault, up to five hits per minion. Unused progress carries forward.'),
    n('rushing_signal', 'Rising Tempo', 'Spending a prepared hit grants that minion 10% increased movement, attack and cast speed for 4 seconds. Stacks five times; each hit refreshes the rhythm.')],
], [
  buff(n('sheltered_advance', 'Sheltered Advance', 'Assault grants each commanded minion one temporary protective ply for 6 base seconds. Enemy-shattered plies burst for minor physical area damage during this blessing.', undefined, { tags: { add: ['buff', 'duration'] } }), { id: 'assault_shelter', affects: 'minions', duration: 6, mods: [] }),
  [n('scattered_advance', 'Orbiting Advance', 'On Assault, all of each commanded minion’s plies also become orbiting blades for 6 base seconds. They retain their protection and damage enemies on contact. Shattered plies lose their orbiting blade.'),
    n('iron_advance', 'Convoking Advance', 'Recall teleports your minions home in rapid succession, completing the court’s return within half a second. Each leaves a physical aftershock at its old position.'),
    n('flowing_advance', 'Returning Bulwark', 'During each Assault, three successful orbiting-blade contacts after losing a ply rebuild one temporary protective ply per minion. Each minion can rebuild once per Assault; the restored blade shares the blessing’s expiry.')],
  [n('renewed_advance', 'Defensive Formation', 'While Assault is equipped and ready, a 200-radius aura gathers your minions into a defensive ring. Minions inside share 30% of your incoming life damage evenly.'),
    n('mending_advance', 'Nourishing Formation', 'Minions in your ready aura regenerate 4 life per second, scaled by your minion damage multiplier.'),
    n('lasting_advance', 'Offensive Formation', 'While Assault is on cooldown, your minions instead deal 10% more damage. The ready aura resumes when the cooldown ends.')],
], n('clear_orders', 'Clear Orders', 'Per point: 8% increased cooldown recovery. Commanded minions gain 10% increased movement and action speed and 3% increased damage for 6 base seconds.', [mod('cooldownRecovery', 'increased', 0.08)]));
