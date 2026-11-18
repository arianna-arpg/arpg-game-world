import type { CompanionBondSpec } from '../engine/companionSpec';
import { mod } from '../engine/stats';
import { tree, n, type Node } from './skillTreeBuilder';
const bond = (node: Node, companionBond: CompanionBondSpec): Node => ({ ...node, companionBond });

export const TAME_BEAST_TREE = tree([
  bond(n('gentle_claim', 'Sovereign Bond', 'Always claims normal beasts at any life threshold, and rare beasts at or below 50% life.'), { normalSure: 1, rareSure: 0.5 }),
  [bond(n('focused_claim', 'Guardian Beast', 'Your beast generates 100% more threat and learns Defiant Roar to taunt nearby enemies (18s cooldown).'), { beastMods: [mod('threatGen', 'more', 1)], beastSkills: ['beast_defiant_roar'] }),
    bond(n('frugal_claim', 'Bend the Apex', 'Allows you to claim boss beasts at or below 10% life.'), { bossSure: 0.1 }),
    bond(n('returning_claim', 'Ancestral Art', 'Unlocks your beast\'s signature family ability.'), { familyArt: true })],
  [bond(n('gentle_pour', 'Abundant Bond', '+100% flask and orb sharing effectiveness with your beast. Beast hits have a 15% chance to drop a life orb (2s cooldown).', [mod('sympathy_bond_flask', 'flat', 1), mod('sympathy_bond_orb', 'flat', 1)]), { attackOrb: { chance: 0.15, cooldown: 2, kind: 'life' } }),
    bond(n('gentle_instinct', 'Shared Instinct', 'You and your beast share Fury, Frenzy, and Rage charges gained. Beast attacks have a 20% chance to grant a Frenzy charge (1s cooldown).', [mod('sympathy_companion_charges_out', 'flat', 1), mod('sympathy_companion_charges_in', 'flat', 1)]), { attackCharge: { chance: 0.2, cooldown: 1, id: 'frenzy' } }),
    bond(n('gentle_return', 'Living Lifeline', 'Your beast gains 5% life leech, and 50% of its leech and healing is also applied to you.', [mod('sympathy_feral_reciprocity', 'flat', 1.25)]), { beastMods: [mod('lifeLeech', 'flat', 0.05)] })],
], [
  bond(n('swift_claim', 'Growing Litter', '+1 maximum beast companion. Downed beasts automatically revive at full life after 20 seconds.'), { slotsAdd: 1, reviveSeconds: 20 }),
  [bond(n('repeat_claim', 'Dread Pack', 'Each beast deals 4 base chaos damage per second to enemies within 110 radius, increasing by 25% for each consecutive second (up to 5 stacks).'), { dread: { radius: 110, interval: 1, damage: 4, ramp: 0.25, maxStacks: 5 } }),
    bond(n('light_claim', 'Third of the Litter', '+1 maximum beast companion.'), { slotsAdd: 1 }),
    bond(n('steady_claim', 'Rallying Whistle', 'At full companion capacity, Whistle becomes Rallying Whistle, reviving, healing, and recalling all beasts before ordering them toward your cursor while pulsing physical damage every second for 5 seconds.'), { whistle: { skillId: 'beast_rallying_whistle', pulseSkill: 'beast_rally_pulse', duration: 5, interval: 1 } })],
  [bond(n('swift_instinct', 'Hunting Partners', 'Your beast\'s hits grant you 10% increased attack damage on your next hit, and your hits grant your beasts the same bonus (up to 3 stacks for 8s).'), { rally: { maxStacks: 3, damagePerStack: 0.1, duration: 8 } }),
    bond(n('swift_pour', 'Learned Blows', 'Your beasts mirror your melee attacks from their position for 60% damage (6s cooldown).'), { mimicMelee: { cooldown: 6, power: 0.6 } }),
    bond(n('swift_return', 'Pack Crescendo', '+2 maximum Hunting Partners stacks. Consuming all 5 stacks grants the other side 35% increased attack speed for 5 seconds and causes beasts to leap toward the target.'), { rallyCapAdd: 2, frenzy: { duration: 5, attackSpeed: 0.35, gapCloser: 'beast_pursuit' } })],
], n('claim_practice', 'Practiced Keeping', '15% increased companion life and damage.', [mod('minionLife', 'increased', 0.15), mod('minionDamage', 'increased', 0.15)]));
