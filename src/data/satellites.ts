import { registerSatellite } from '../engine/satelliteSpec';
import type { SkillDef } from '../engine/skills';

registerSatellite({
  id: 'iron_wake', name: 'Iron Wake',
  description: 'An untargetable hollow iron orb revolves around you, striking enemies on contact. Additional grants add orbs. Scales with physical and satellite damage, not minion damage.',
  skill: 'satellite_iron_wake', tags: ['satellite', 'satellite:iron_wake', 'physical'],
  orbit: 42, radius: 9, turnSpeed: 1.6, armTime: 0.9, rehit: 0.65,
  color: '#c5c9d2', core: '#525d73',
});

registerSatellite({
  id: 'cinder_wake', name: 'Cinder Wake',
  description: 'An orbiting ember lobs fire mortars at nearby enemies. Additional grants add orbs. Scales with fire, area and satellite damage.',
  skill: 'satellite_cinder_wake', tags: ['satellite', 'satellite:cinder_wake', 'fire', 'aoe'],
  orbit: 48, radius: 8, turnSpeed: 1.1, armTime: 1.1,
  emit: { mode: 'lob', interval: 2.4, range: 330, flight: 0.8, arc: 0.38, flash: 0.28 },
  color: '#f4a15b', core: '#ffdc83',
});

registerSatellite({
  id: 'storm_wake', name: 'Storm Wake',
  description: 'An orbiting relic fires lightning orbs. Additional grants add satellites; lightning, projectile and satellite damage scale the payload.',
  skill: 'satellite_storm_wake', tags: ['satellite', 'satellite:storm_wake', 'lightning', 'projectile'],
  orbit: 46, radius: 8, turnSpeed: 1.3, armTime: 1,
  emit: { mode: 'projectile', interval: 1.8, range: 360 },
  orbPaint: { fill: 0.18, rim: 0.9, spark: true }, color: '#8cbcff', core: '#e3f3ff',
});

registerSatellite({
  id: 'rime_wake', name: 'Rime Wake',
  description: 'A cold satellite lines up distant enemies, then fires a swift piercing needle. Additional grants add satellites; cold, projectile and satellite damage scale its hits.',
  skill: 'satellite_rime_wake', tags: ['satellite', 'satellite:rime_wake', 'cold', 'projectile'],
  orbit: 50, radius: 7, turnSpeed: 0.8, armTime: 0.9,
  emit: { mode: 'projectile', interval: 1.5, range: 480, windup: 0.28, target: 'farthest' },
  orbPaint: { fill: 0.12, rim: 0.95 }, color: '#b7e8f2', core: '#efffff',
});

/** The ordinary damage/effect pipeline owns scaling, mitigation, procs and credit. */
export const SATELLITE_SKILLS: Record<string, SkillDef> = {
  satellite_rime_wake: {
    id: 'satellite_rime_wake', name: 'Rime Wake', noDrop: true,
    description: 'A fine cold needle pierces one additional enemy along its firing line.', color: '#b7e8f2',
    tags: ['satellite', 'satellite:rime_wake', 'cold', 'projectile'],
    manaCost: 0, cooldown: 0, useTime: 0, baseDamage: { cold: [5, 7] },
    delivery: { type: 'projectile', speed: 920, radius: 3, range: 540, shape: 'line', pierce: 1 },
    effects: [{ type: 'damage' }],
  },
  satellite_storm_wake: {
    id: 'satellite_storm_wake', name: 'Storm Wake', noDrop: true,
    description: 'A carried relic fires an orb of lightning.', color: '#8cbcff',
    tags: ['satellite', 'satellite:storm_wake', 'lightning', 'projectile'],
    manaCost: 0, cooldown: 0, useTime: 0, baseDamage: { lightning: [3, 9] },
    delivery: { type: 'projectile', speed: 290, radius: 7, range: 420,
      orbPaint: { fill: 0.15, rim: 0.9, spark: true } },
    effects: [{ type: 'damage' }],
  },
  satellite_cinder_wake: {
    id: 'satellite_cinder_wake', name: 'Cinder Wake', noDrop: true,
    description: 'An orbiting ember lobs a mortar that bursts for fire damage.', color: '#f4a15b',
    tags: ['satellite', 'satellite:cinder_wake', 'fire', 'aoe'],
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { fire: [5, 8] },
    delivery: { type: 'ground', radius: 38, castRange: 330, delay: 0 },
    effects: [{ type: 'damage' }],
  },
  satellite_iron_wake: {
    id: 'satellite_iron_wake', name: 'Iron Wake', noDrop: true,
    description: 'A carried hollow iron orb strikes an enemy on contact.', color: '#c5c9d2',
    tags: ['satellite', 'satellite:iron_wake', 'physical'],
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { physical: [4, 6] },
    delivery: { type: 'ground', radius: 9, castRange: 0, delay: 0 },
    effects: [{ type: 'damage' }],
  },
};
