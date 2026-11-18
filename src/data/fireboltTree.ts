import { mod } from '../engine/stats';
import { tree, n, type Node } from './skillTreeBuilder';
import type { ProjectileArtsSpec } from '../engine/projectileArtsSpec';
const art = (node: Node, projectileArts: ProjectileArtsSpec): Node => ({ ...node, projectileArts });

/** Stable allocation IDs, new composable disciplines. All tuning lives here. */
export const FIREBOLT_TREE = tree([
  art(n('ember_satellites', 'Ember Satellites', 'Fires 1 additional flame orb. Orbs orbit you for 6 seconds and pierce all enemies, hitting each enemy at most once every 0.65 seconds. Deals 20% less damage.',
    [mod('projectileCount', 'flat', 1), mod('damage', 'more', -0.2)], { tags: { add: ['duration', 'satellite'] } }),
    { orbit: { radius: 64, turnSpeed: 0.65, duration: 6, rehit: 0.65, visual: 'ember_satellite' } }),
  [art(n('dense_constellation', 'Dense Constellation', 'Fires 1 additional orb for each equipped item that grants a satellite effect.'), { equippedSatelliteProjectiles: 1 }),
    art(n('passing_embers', 'Kindled Attendants', 'Orbs count as satellites and benefit from satellite modifiers. Each orb fires a smaller Firebolt at a nearby enemy every 1.1 seconds for 28% damage.'),
      { satellite: true, emit: { interval: 1.1, range: 280, power: 0.28, radius: 4.5 } }),
    art(n('broad_embers', 'Gathering Inferno', 'Orbit speed increases by 18% per second. When an orb expires, it explodes for 65% damage in a 72 radius.'),
      { orbitGrowth: 0.18, expireBurst: { radius: 72, power: 0.65, fx: 'ember_nova' } })],
  [art(n('searing_orbit', 'Searing Orbit', 'Each orb pulses a fire nova every 1.6 seconds, dealing 35% damage in a 70 radius.', undefined, { tags: { add: ['aoe'] } }),
    { nova: { interval: 1.6, radius: 70, power: 0.35, fx: 'ember_nova' } }),
    art(n('clinging_cinders', 'Parting Cinders', 'When their orbit ends, orbs launch outward from you as standard Firebolts.'), { release: true }),
    art(n('wildfire_sparks', 'Wildfire Sparks', 'Orbs seek out nearby enemies within 110 distance of their orbit, returning when no enemies are near.'),
      { wander: { leash: 110, speed: 155, turnSpeed: 4, jitter: 1.8 } })],
], [
  art(n('cinder_lance', 'Cinder Lance', 'Pierces 2 additional targets. Each cast grants +15% chance to ignite on subsequent casts (up to 100%), resetting when you ignite an enemy.'),
    { pierce: 2, ailmentRamp: { status: 'burn', perCast: 0.15, max: 1 } }),
  [art(n('white_heat', 'White Heat', 'Ignites inflicted by Firebolt treat enemy base fire resistance as 0% before penetration and resistance reductions.'),
    { whiteHeat: { status: 'burn', element: 'fire', visual: 'white_heat' } }),
    art(n('focused_flame', 'Pyreheart', 'The strongest enemy hit is marked for 4 seconds, pulling ignites from enemies within 180 radius onto itself every 0.4 seconds (up to 48 ignites).'),
      { attract: { status: 'burn', radius: 180, duration: 4, interval: 0.4, maxWounds: 48, mark: 'ignite_attractor', fx: 'ember_siphon' } }),
    art(n('incandescent_point', 'Incandescent Pillar', 'Hitting an ignited enemy raises a flame pillar at their location for 3 seconds that deals 35% damage in a 48 radius every 0.5 seconds (5s cooldown).', undefined, { tags: { add: ['aoe', 'duration'] } }),
      { pillar: { status: 'burn', cooldown: 5, radius: 48, duration: 3, interval: 0.5, power: 0.35, visual: 'incandescent_pillar', fx: 'ember_nova' } })],
  [art(n('slow_combustion', 'Cinder Rupture', 'Hitting an ignited enemy consumes 25% of their remaining ignite damage in a fiery burst within 60 radius.', undefined, { tags: { add: ['aoe'] } }),
    { rupture: { status: 'burn', fraction: 0.25, radius: 60, fx: 'ember_nova' } }),
    art(n('lasting_cinders', 'Forking Cinders', 'On hit, splits into 2 Firebolts behind the target that deal 55% damage. Can split up to 3 times (up to 96 split bolts per cast).'),
      { cascade: { count: 2, spreadDeg: 32, power: 0.55, maxDepth: 3, budget: 96 } }),
    art(n('far_flight', 'Unbound Comet', 'Firebolts start at 40% speed, accelerate by 45% per second, pierce all targets, and last 5 seconds. Rebounds off screen edges, gaining 8% more damage per rebound.', undefined, { tags: { add: ['duration'] } }),
      { flight: { duration: 5, speed: 0.4, acceleration: 0.45, bounceMore: 0.08 } })],
], n('flame_studies', 'Flame Studies', '15% increased fire damage.', [mod('damage', 'increased', 0.15, ['fire'])]));
