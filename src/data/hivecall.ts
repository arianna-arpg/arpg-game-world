import type { SkillDef } from '../engine/skills';
import type { MonsterDef } from './monsters';
import { mod } from '../engine/stats';
import { tree, n } from './skillTreeBuilder';

export const HIVECALL_TREE = tree([
  n('teeming_contract', 'Teeming Contract', '+2 maximum Swarmlings and +1 ply. A Swarmling death fully heals the surviving swarm and grants each survivor another ply.', [mod('minionMaxCount', 'flat', 2), mod('minionPlies', 'flat', 1)]),
  [n('crowded_cells', 'Crowded Cells', '+5 maximum Swarmlings. After the resurrection wait, missing bodies hatch sequentially every 0.2 seconds. 20% less minion life and size.', [mod('minionMaxCount', 'flat', 5), mod('minionLife', 'more', -0.2), mod('minionSize', 'more', -0.2)]),
    n('overflowing_cells', 'Venomous Remains', 'Dying Swarmlings leave a poison pool for 4 seconds, damaging and poisoning enemies within it.'),
    n('sacrificial_chitin', 'Sacrificial Chitin', 'Enrage instead detonates each Swarmling for area chaos damage, immediately replacing the detonated bodies at full life. Costs 8 mana; 8-second cooldown.')],
  [n('scurrying_tide', 'Royal Guard', '50% fewer maximum Swarmlings, rounded to the nearest whole body. They become Royal Guards with 200% more life, 100% more damage, 50% more size and 35% more action speed.', [mod('minionMaxCount', 'more', -0.5), mod('minionLife', 'more', 2), mod('minionDamage', 'more', 1), mod('minionSize', 'more', 0.5), mod('minionHaste', 'more', 0.35)], { summon: { monsterId: 'hive_royal_guard' } }),
    n('needle_mandibles', 'Needle Mandibles', 'Royal Guard melee attacks impale for 20% of physical damage. Guards also learn ranged Poison Spit.', undefined, { summon: { crewMods: [mod('impalePower', 'flat', 0.2, ['melee'])], crewSkills: ['hive_poison_spit'] } }),
    n('brood_nourishment', 'Brood Wardens', 'Royal Guards hatch two ordinary Swarmlings after surviving 10 seconds, repeating every 10 seconds. Offspring last 8 seconds and do not fuel Sovereignty or inherit Royal Guard bonuses.')],
], [
  n('royal_guard', 'Swarm Sovereign', 'Gain 2 Sovereignty per second while at least one base Swarmling lives, plus 20 per base Swarmling death, up to 100. Enrage spends it to become a Swarm Sovereign for up to 18 seconds with a separate health pool, Venom Mandibles and Poison Spit. Form death empties the bar and returns you to your body. Press Enrage again to return. 4-second transformation cooldown.'),
  [n('royal_carapace', 'Royal Carapace', 'While transformed, a 180-radius aura enrages you and allies that take damage for 3 seconds: 30% more damage and 40% increased action speed. Nearby base Swarmlings share 60% of incoming life damage.'),
    n('barbed_regents', 'Crown of Ruin', 'Unleash a chaos nova on transformation and on voluntary or timed return. Transformation cooldown becomes 2 seconds.'),
    n('knitted_regents', 'Deathless Succession', 'A lethal wound with more than 20 Sovereignty automatically transforms you. Return restores 40% of maximum life. Repeated rescues within a refreshing 20-second window halve form duration, form life and recovery each time (down to 1/256).')],
  [n('royal_ferocity', 'Royal Ferocity', 'The Sovereign gains 30% more damage, 25% more action speed and the Royal Cataclysm ultimate: a vast lingering poison storm.'),
    n('crushing_mandibles', 'Crushing Mandibles', 'Sovereign Venom Mandibles and Poison Spit deal 100% more damage and gain 50% increased area. Poison Spit fires two additional projectiles.'),
    n('regal_execution', 'Perpetual Reign', 'Transformation immediately hatches up to two missing base Swarmlings. Living Swarmlings and their deaths now generate Sovereignty while transformed, extending the form by 0.36 seconds per second with a living Swarmling and 3.6 seconds per death (up to 18 seconds remaining).')],
], { ...n('hive_tending', 'Hive Tending', '15% increased minion life and damage. +1 maximum Swarmling. Deal 15% increased damage while transformed by Hivecall.', [mod('minionLife', 'increased', 0.15), mod('minionDamage', 'increased', 0.15), mod('minionMaxCount', 'flat', 1)]), hivecallFormDamage: 0.15 });

const poison: SkillDef['effects'] = [{ type: 'damage' }, { type: 'status', status: 'poison', chance: 1, magnitude: 0.5 }];
export const HIVECALL_SKILLS: Record<string, SkillDef> = {
  hive_poison_spit: {
    id: 'hive_poison_spit', name: 'Poison Spit', description: 'Spit venom at distant enemies.', noDrop: true,
    tags: ['spell', 'projectile', 'chaos'], color: '#a5d44d', manaCost: 0, cooldown: 2, useTime: 0.4,
    baseDamage: { chaos: [7, 10] }, delivery: { type: 'projectile', speed: 400, radius: 5, range: 600, spreadDeg: 24 }, effects: poison,
    ai: { range: 450, weight: 3 },
  },
  hive_venom_mandibles: {
    id: 'hive_venom_mandibles', name: 'Venom Mandibles', description: 'Tear and poison enemies in a broad sweep.', noDrop: true,
    tags: ['attack', 'melee', 'aoe', 'chaos'], color: '#bdd658', manaCost: 0, cooldown: 0, useTime: 0.5,
    baseDamage: { physical: [10, 15], chaos: [8, 12] }, delivery: { type: 'melee', range: 90, arcDeg: 140 }, effects: poison, ai: { range: 90, weight: 2 },
  },
  hive_death_pool: {
    id: 'hive_death_pool', name: 'Spilled Brood', description: 'A dying Swarmling spills a lingering poison pool.', noDrop: true,
    tags: ['spell', 'chaos', 'aoe', 'duration'], color: '#79ac42', manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { chaos: [4, 6] }, delivery: { type: 'ground', radius: 52, castRange: 0, lingerDuration: 4, tickInterval: 0.5, noImpact: true }, effects: poison,
  },
  hive_detonation: {
    id: 'hive_detonation', name: 'Sacrificial Chitin', description: 'Detonate a Swarmling in a burst of chaos.', noDrop: true,
    tags: ['spell', 'chaos', 'aoe'], color: '#ccdd60', manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { chaos: [20, 30] }, delivery: { type: 'ground', radius: 85, castRange: 0 }, effects: [{ type: 'damage' }],
  },
  hive_royal_nova: {
    id: 'hive_royal_nova', name: 'Regent Nova', description: 'A regal wave of chaos.', noDrop: true,
    tags: ['spell', 'chaos', 'aoe'], color: '#a1df68', manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { chaos: [30, 45] }, delivery: { type: 'ground', radius: 170, castRange: 0 }, effects: [{ type: 'damage' }],
  },
  hive_royal_cataclysm: {
    id: 'hive_royal_cataclysm', name: 'Royal Cataclysm', description: 'Unleash a vast poison storm for 4 seconds. 10-second cooldown.', noDrop: true,
    tags: ['spell', 'chaos', 'aoe', 'duration'], color: '#afec45', manaCost: 0, cooldown: 10, useTime: 0.65,
    baseDamage: { chaos: [18, 26] }, delivery: { type: 'ground', radius: 230, castRange: 400, lingerDuration: 4, tickInterval: 0.5 }, effects: poison,
  },
};
export const HIVECALL_MONSTERS: Record<string, MonsterDef> = {
  hive_royal_guard: {
    id: 'hive_royal_guard', name: 'Royal Guard', material: 'chitin', look: 'swarm_bug', shape: 'pentagon', color: '#c8c768', radius: 7,
    base: { life: 12, moveSpeed: 200, accuracy: 70, evasion: 60, mana: 0 }, skills: ['claw'], xp: 0, brain: { type: 'swarm' },
  },
  hive_sovereign: {
    id: 'hive_sovereign', name: 'Swarm Sovereign', material: 'chitin', look: 'swarm_bug', shape: 'pentagon', color: '#abd050', radius: 24,
    base: { life: 150, moveSpeed: 210, accuracy: 160, evasion: 60, mana: 100 }, skills: ['hive_venom_mandibles', 'hive_poison_spit'], xp: 0,
  },
};
