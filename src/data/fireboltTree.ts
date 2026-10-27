import { mod } from '../engine/stats';
import { tree, n, type Node } from './skillTreeBuilder';
import type { ProjectileArtsSpec } from '../engine/projectileArtsSpec';
const art = (node: Node, projectileArts: ProjectileArtsSpec): Node => ({ ...node, projectileArts });

/** Stable allocation IDs, new composable disciplines. All tuning lives here. */
export const FIREBOLT_TREE = tree([
  art(n('ember_satellites', 'Ember Satellites', 'Cast an additional flame orb. Orbs circle you slowly for 6 seconds and pierce freely, striking each enemy at most once per 0.65 seconds. 20% less damage.',
    [mod('projectileCount', 'flat', 1), mod('damage', 'more', -0.2)], { tags: { add: ['duration', 'satellite'] } }),
    { orbit: { radius: 64, turnSpeed: 0.65, duration: 6, rehit: 0.65, visual: 'ember_satellite' } }),
  [art(n('dense_constellation', 'Dense Constellation', 'Cast one additional orb for each equipped item that grants a satellite effect. Each item counts once, regardless of its satellite quantity or families.'), { equippedSatelliteProjectiles: 1 }),
    art(n('passing_embers', 'Kindled Attendants', 'Your orbs become flame satellites: additional satellite count, orbit radius and speed investment apply. Each orb fires a smaller Firebolt at a nearby visible enemy every 1.1 seconds, dealing 28% damage. Contact still pierces.'),
      { satellite: true, emit: { interval: 1.1, range: 280, power: 0.28, radius: 4.5 } }),
    art(n('broad_embers', 'Gathering Inferno', 'Orbit speed compounds by 18% per second. Each orb explodes at the end of its duration, dealing 65% damage within 72 base radius.'),
      { orbitGrowth: 0.18, expireBurst: { radius: 72, power: 0.65, fx: 'ember_nova' } })],
  [art(n('searing_orbit', 'Searing Orbit', 'Each orb pulses a fire nova every 1.6 seconds, dealing 35% damage within 70 base radius. Orbs have staggered, independent pulse clocks.', undefined, { tags: { add: ['aoe'] } }),
    { nova: { interval: 1.6, radius: 70, power: 0.35, fx: 'ember_nova' } }),
    art(n('clinging_cinders', 'Parting Cinders', 'At the end of their duration, your orbs launch directly away from you as ordinary Firebolts. They retain projectile investment and can combine this departure with an expiry explosion.'), { release: true }),
    art(n('wildfire_sparks', 'Wildfire Sparks', 'Orbs roam erratically toward nearby enemies, leashed within 110 units of their moving orbital home. They remain satellites and return toward that home when no enemy is near.'),
      { wander: { leash: 110, speed: 155, turnSpeed: 4, jitter: 1.8 } })],
], [
  art(n('cinder_lance', 'Cinder Lance', 'Firebolt pierces 2 additional targets. Each completed cast adds 15 percentage points to the next cast’s ignite chance, up to guaranteed ignition. Applying an ignite resets the bonus.'),
    { pierce: 2, ailmentRamp: { status: 'burn', perCast: 0.15, max: 1 } }),
  [art(n('white_heat', 'White Heat', 'Firebolt ignites with white flame. Its ignite treats fire resistance as zero before resistance reductions and penetration; the projectile hit keeps normal resistance rules.'),
    { whiteHeat: { status: 'burn', element: 'fire', visual: 'white_heat' } }),
    art(n('focused_flame', 'Pyreheart', 'The strongest enemy struck becomes an ignite attractor for 4 seconds. Every 0.4 seconds it draws nearby ignites within 180 base radius onto itself. Each transferred ignite retains its remaining damage, duration and original source; up to 48 gathered wounds.'),
      { attract: { status: 'burn', radius: 180, duration: 4, interval: 0.4, maxWounds: 48, mark: 'ignite_attractor', fx: 'ember_siphon' } }),
    art(n('incandescent_point', 'Incandescent Pillar', 'Hitting an already ignited enemy raises a flame pillar at its location for 3 seconds. It strikes every 0.5 seconds for 35% damage in 48 base radius. Shared 5-second cooldown per caster and Firebolt instance.', undefined, { tags: { add: ['aoe', 'duration'] } }),
      { pillar: { status: 'burn', cooldown: 5, radius: 48, duration: 3, interval: 0.5, power: 0.35, visual: 'incandescent_pillar', fx: 'ember_nova' } })],
  [art(n('slow_combustion', 'Cinder Rupture', 'Hitting an already ignited enemy spends 25% of its remaining ignite damage in a fire explosion, striking it and enemies within 60 base radius. The unspent ignite continues.', undefined, { tags: { add: ['aoe'] } }),
    { rupture: { status: 'burn', fraction: 0.25, radius: 60, fx: 'ember_nova' } }),
    art(n('lasting_cinders', 'Forking Cinders', 'Each landed projectile hit, including pierced targets, sends two Firebolts onward behind the victim at 55% damage. Descendants can repeat this for 3 generations, up to 96 descendants per cast. Each inherits your projectile investment.'),
      { cascade: { count: 2, spreadDeg: 32, power: 0.55, maxDepth: 3, budget: 96 } }),
    art(n('far_flight', 'Unbound Comet', 'Firebolts begin at 40% speed, accelerate by 45% per second, pierce infinitely and last 5 seconds instead of a fixed distance. They rebound from your view’s edges, gaining 8% more damage per rebound. Duration and projectile speed investment still apply.', undefined, { tags: { add: ['duration'] } }),
      { flight: { duration: 5, speed: 0.4, acceleration: 0.45, bounceMore: 0.08 } })],
], n('flame_studies', 'Flame Studies', '15% increased fire damage.', [mod('damage', 'increased', 0.15, ['fire'])]));
