import { tree, n, type Node } from './skillTreeBuilder';
import { mod } from '../engine/stats';
import type { GuardArtsSpec } from '../engine/guardArtsSpec';

const art = (node: Node, guardArts: GuardArtsSpec): Node => ({ ...node, guardArts });

/** All gameplay numbers are authored here; the shared engine reads capabilities. */
export const SHIELD_UP_TREE = tree([
  art(n('iron_shelter', 'Iron Shelter', 'Add 25% of your armor to base guard health, before guard-strength scaling. Passive block chance also rolls against incoming guard hits, halving their damage on success.'),
    { armorRatio: 0.25, passiveBlockReduction: 0.5 }),
  [art(n('reinforced_plate', 'Reinforced Plate', 'While guarding, gain a plate every 2 seconds, up to 3. Each plate grants 8% less damage taken. A damaging guard hit consumes one plate and is reduced by 8% per plate held. Plates fall away when you lower the guard.'),
    { plates: { interval: 2, max: 3, reduction: 0.08, label: 'Reinforced Plate' } }),
    art(n('broad_shelter', 'Mending Plate', 'Consuming a plate restores 12% of missing guard health, provided the hit did not break the guard.'), { plateRestore: 0.12 }),
    art(n('shared_shelter', 'Sheltering Pulse', 'Each plate gained, or that would be gained at the cap, heals you and nearby allies for 3% of their maximum life within 140 base radius.'), { plateHeal: { radius: 140, lifeFraction: 0.03 } })],
  [art(n('ready_watch', 'Battering March', 'Walking into enemies in front of your guard deals 4 physical damage plus 60% of thorns and 4% of weight, and pushes them. Continued pressure deals 35% of that damage every 0.3 seconds. The opening strike returns after 1 second out of contact.'),
    { ram: { base: 4, thorns: 0.6, weight: 0.04, interval: 0.3, repeat: 0.35, reset: 1, reach: 12, arc: 110, push: 12 } }),
    art(n('shield_pump', 'Bash Wake', 'Each shield bash projects a piercing wave for 45% of its damage. The wave travels 260 base distance.', undefined, { tags: { add: ['projectile', 'aoe'] } }),
      { bashWave: { power: 0.45, delivery: { type: 'projectile', speed: 330, radius: 22, range: 260, shape: 'wave', pierce: 99 } } }),
    art(n('sheltered_thrust', 'Rising Answer', 'Raising the guard immediately bashes at full guard power for no additional cost. Hold and release as usual to earn a second bash.'), { raiseBash: 1 })],
], [
  art(n('measured_riposte', 'Measured Shelter', 'Convert Shield Up into an instant cast with an 8-second cooldown. Gain an absorb shield worth 40% of guard health for 3 seconds. You can move and use other skills freely.', undefined,
    { tags: { remove: ['channel'], add: ['buff'] } }), { absorb: { fraction: 0.4, duration: 3, cooldown: 8 } }),
  [art(n('patient_hand', 'Patient Hand', 'Casting at least 12 seconds after the previous cast doubles shield capacity, duration and explosion damage. Your first cast is empowered.'), { patience: { seconds: 12, multiplier: 2 } }),
    art(n('punishing_reply', 'Unbroken Orbit', 'Each absorb shield that expires intact grants a projectile-reflecting barrier satellite for 25 seconds, up to 3. Each satellite expires independently; a new one at the cap replaces the oldest.'),
      { intactSatellite: { family: 'shelter_barrier', max: 3, duration: 25 } }),
    art(n('resetting_stance', 'Last Shelter', 'A lethal wound automatically casts your absorb shield, free and even on cooldown, to absorb as much of that wound as it can. This can occur once every 5 minutes.'),
      { intervention: { cooldown: 300, label: 'Last Shelter Recovery' } })],
  [art(n('loaded_bash', 'Gathering Answer', 'Casting begins a visible 2-second build-up, then explodes around you for 80% of full shield-bash damage within 110 base radius. The explosion still occurs if the shield breaks.'),
    { detonation: { delay: 2, radius: 110, power: 0.8 } }),
    art(n('unbroken_answer', 'Splinter Orbit', 'Each absorb shield broken by damage grants a thorns satellite for 25 seconds, up to 3. It deals 20% of full bash damage on contact, at most once per target every 0.65 seconds. Each expires independently.'),
      { brokenSatellite: { family: 'shelter_thorns', max: 3, duration: 25, power: 0.2 } }),
    art(n('hollow_counter', 'Hollow Counter', 'When your absorb shield breaks, it bursts around you for 70% of full shield-bash damage within 100 base radius.'),
      { breakBurst: { radius: 100, power: 0.7 } })],
], n('shield_drill', 'Shield Drill', '15% increased guard strength.', [mod('guardStrength', 'increased', 0.15)]));
