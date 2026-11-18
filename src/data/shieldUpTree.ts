import { tree, n, type Node } from './skillTreeBuilder';
import { mod } from '../engine/stats';
import type { GuardArtsSpec } from '../engine/guardArtsSpec';

const art = (node: Node, guardArts: GuardArtsSpec): Node => ({ ...node, guardArts });

/** All gameplay numbers are authored here; the shared engine reads capabilities. */
export const SHIELD_UP_TREE = tree([
  art(n('iron_shelter', 'Iron Shelter', 'Adds 25% of your armor to base guard health. Your block chance also applies to hits taken while guarding, halving their damage on a block.'),
    { armorRatio: 0.25, passiveBlockReduction: 0.5 }),
  [art(n('reinforced_plate', 'Reinforced Plate', 'While guarding, gain 1 Reinforced Plate every 2 seconds (up to 3). Each plate grants 8% less damage taken, and taking a hit while guarding consumes 1 plate. Plates are lost when you lower your guard.'),
    { plates: { interval: 2, max: 3, reduction: 0.08, label: 'Reinforced Plate' } }),
    art(n('broad_shelter', 'Mending Plate', 'Consuming a plate restores 12% of missing guard health if the hit does not break your guard.'), { plateRestore: 0.12 }),
    art(n('shared_shelter', 'Sheltering Pulse', 'Gaining a plate (including at maximum stacks) heals you and allies within 140 radius for 3% of maximum life.'), { plateHeal: { radius: 140, lifeFraction: 0.03 } })],
  [art(n('ready_watch', 'Battering March', 'Walking into enemies while guarding pushes them back and deals 4 physical damage plus 60% of thorns and 4% of weight, followed by 35% of that damage every 0.3 seconds while remaining in contact.'),
    { ram: { base: 4, thorns: 0.6, weight: 0.04, interval: 0.3, repeat: 0.35, reset: 1, reach: 12, arc: 110, push: 12 } }),
    art(n('shield_pump', 'Bash Wake', 'Shield bashes release a piercing shockwave that travels 260 distance and deals 45% of bash damage.', undefined, { tags: { add: ['projectile', 'aoe'] } }),
      { bashWave: { power: 0.45, delivery: { type: 'projectile', speed: 330, radius: 22, range: 260, shape: 'wave', pierce: 99 } } }),
    art(n('sheltered_thrust', 'Rising Answer', 'Raising your guard immediately triggers a full-power shield bash at no extra cost, in addition to the normal release bash.'), { raiseBash: 1 })],
], [
  art(n('measured_riposte', 'Measured Shelter', 'Converts Shield Up into an instant cast (8s cooldown) that grants a shield equal to 40% of your guard health for 3 seconds, allowing you to move and act freely.', undefined,
    { tags: { remove: ['channel'], add: ['buff'] } }), { absorb: { fraction: 0.4, duration: 3, cooldown: 8 } }),
  [art(n('patient_hand', 'Patient Hand', 'Casting Shield Up at least 12 seconds after the previous cast doubles its shield capacity, duration, and explosion damage.'), { patience: { seconds: 12, multiplier: 2 } }),
    art(n('punishing_reply', 'Unbroken Orbit', 'When your shield expires without breaking, gain an orbiting barrier satellite for 25 seconds that reflects enemy projectiles (up to 3).'),
      { intactSatellite: { family: 'shelter_barrier', max: 3, duration: 25 } }),
    art(n('resetting_stance', 'Last Shelter', 'Taking fatal damage automatically triggers your shield at no cost to absorb the hit (5m cooldown).'),
      { intervention: { cooldown: 300, label: 'Last Shelter Recovery' } })],
  [art(n('loaded_bash', 'Gathering Answer', 'After 2 seconds, unleashes an explosion around you for 80% of full shield bash damage in a 110 radius, even if the shield breaks early.'),
    { detonation: { delay: 2, radius: 110, power: 0.8 } }),
    art(n('unbroken_answer', 'Splinter Orbit', 'When your shield is broken by damage, gain an orbiting thorns satellite for 25 seconds (up to 3) that deals 20% of full bash damage on contact (up to once every 0.65s per target).'),
      { brokenSatellite: { family: 'shelter_thorns', max: 3, duration: 25, power: 0.2 } }),
    art(n('hollow_counter', 'Hollow Counter', 'When your shield breaks, it bursts for 70% of full shield bash damage in a 100 radius.'),
      { breakBurst: { radius: 100, power: 0.7 } })],
], n('shield_drill', 'Shield Drill', '15% increased guard strength.', [mod('guardStrength', 'increased', 0.15)]));
