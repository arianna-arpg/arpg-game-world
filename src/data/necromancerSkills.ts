import { BONE_GOLEM_SKILLS } from './boneGolemSkills';
import { SKELETON_MAGE_SKILLS } from './skeletonMageSkills';
import { SKELETON_ARCHER_SKILLS } from './skeletonArcherSkills';
import { UNDEAD_COURT_SKILLS } from './necromancerCourts';
import type { SkillDef, AuraSpec } from '../engine/skills';
import { mod, type DamageType } from '../engine/stats';
import { NECROMANCER_TREES, SKELETAL_MAGE_POOL } from './necromancerTrees';

const bolt = (id: string, name: string, type: DamageType, color: string): SkillDef => ({
  id, name, description: `Fire a projectile of ${type} damage at an enemy.`, noDrop: true,
  tags: ['spell', 'projectile', type], color, manaCost: 0, cooldown: 0, useTime: 1.1,
  baseDamage: { [type]: [6, 10] },
  delivery: { type: 'projectile', speed: 380, radius: 7, range: 500 },
  effects: [{ type: 'damage' }], ai: { range: 450, weight: 2, keepDistance: 270 },
});
const aura = (id: string, name: string, spec: AuraSpec): SkillDef => ({
  id, name, description: 'Project an aura that strengthens or protects nearby allies.', noDrop: true,
  tags: ['spell', 'aura', 'buff', 'aoe'], color: '#c8d8b0', manaCost: 0, cooldown: 0, useTime: 0,
  delivery: { type: 'aura', mode: 'toggle', aura: spec }, effects: [],
});
export const NECROMANCER_SKILLS: Record<string, SkillDef> = {
  ...BONE_GOLEM_SKILLS,
  ...UNDEAD_COURT_SKILLS,
  ...SKELETON_ARCHER_SKILLS,
  ...SKELETON_MAGE_SKILLS,
  summon_skeleton_mage: {
    id: 'summon_skeleton_mage', name: 'Summon Skeleton Mage',
    description: 'Summon a random elemental skeleton mage, up to 2 active at once. Its skill tree can specialize into a commanding Lich or a coordinated Conclave of elemental mages.',
    tags: ['spell', 'summon', 'minion'], color: '#b6a2de', manaCost: 30, cooldown: 3, useTime: 1.1,
    delivery: { type: 'summon', pool: SKELETAL_MAGE_POOL, count: 1, maxActive: 2, crewRules: [{ monsterIds: ['skeletal_cryomancer'], replace: [{ from: 'skeletal_cold_bolt', to: 'skeletal_ice_spear' }] }] }, effects: [],
    tree: NECROMANCER_TREES.summon_skeleton_mage,
    requirements: { willpower: 14, intelligence: 14 }, minDropLevel: 5,
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.15), mod('minionLife', 'increased', 0.15)] },
    ai: { range: 400, weight: 2, keepDistance: 300 },
  },
  skeletal_fire_bolt: bolt('skeletal_fire_bolt', 'Ember Bone', 'fire', '#ed985a'),
  skeletal_cold_bolt: bolt('skeletal_cold_bolt', 'Rime Bone', 'cold', '#8bd6ed'),
  skeletal_lightning_bolt: bolt('skeletal_lightning_bolt', 'Storm Bone', 'lightning', '#c5b6fa'),
  skeletal_chaos_bolt: bolt('skeletal_chaos_bolt', 'Venom Bone', 'chaos', '#a8ce72'),
  skeletal_lich_fireball: {
    id: 'skeletal_lich_fireball', name: 'Lich Fireball', description: 'Launch a fireball that explodes on impact, dealing fire damage in an area.', noDrop: true,
    tags: ['spell', 'fire', 'projectile', 'aoe'], color: '#ef9c64', manaCost: 0, cooldown: 0, useTime: 1,
    baseDamage: { fire: [10, 15] }, delivery: { type: 'projectile', speed: 380, radius: 10, range: 460, explode: { radius: 75, damageScale: 0.6 } },
    effects: [{ type: 'damage' }], ai: { range: 430, weight: 2, keepDistance: 270 },
  },
  skeletal_ice_spear: {
    id: 'skeletal_ice_spear', name: 'Skeletal Ice Spear', description: 'Fire an icy spear that chills on hit and shatters into two cold shards.', noDrop: true,
    tags: ['spell', 'cold', 'projectile'], color: '#8bd6ed', manaCost: 0, cooldown: 0, useTime: 1.1,
    baseDamage: { cold: [5, 8] }, delivery: { type: 'projectile', speed: 480, radius: 8, range: 460, shape: 'triangle', shatter: { skillId: 'skeletal_ice_shard', count: 2, spreadDeg: 55 } },
    effects: [{ type: 'damage' }, { type: 'status', status: 'chill', chance: 0.35 }], ai: { range: 430, weight: 2, keepDistance: 270 },
  },
  skeletal_greater_ice_spear: {
    id: 'skeletal_greater_ice_spear', name: 'Greater Skeletal Ice Spear', description: 'Fire an icy spear that chills on hit and shatters into five cold shards.', noDrop: true,
    tags: ['spell', 'cold', 'projectile'], color: '#8bd6ed', manaCost: 0, cooldown: 6, useTime: 1.1,
    baseDamage: { cold: [5, 8] }, delivery: { type: 'projectile', speed: 480, radius: 8, range: 460, shape: 'triangle', shatter: { skillId: 'skeletal_ice_shard', count: 5, spreadDeg: 70 } },
    effects: [{ type: 'damage' }, { type: 'status', status: 'chill', chance: 1 }], ai: { range: 430, weight: 6, keepDistance: 270 },
  },
  skeletal_ice_shard: {
    id: 'skeletal_ice_shard', name: 'Skeletal Ice Shard', description: 'A cold splinter released when a skeletal ice spear shatters.', noDrop: true,
    tags: ['spell', 'cold', 'projectile'], color: '#8bd6ed', manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { cold: [2, 3] }, delivery: { type: 'projectile', speed: 410, radius: 4, range: 180, shape: 'triangle' }, effects: [{ type: 'damage' }],
  },
  skeletal_ignite: {
    id: 'skeletal_ignite', name: 'Skeletal Ignite', description: 'Ignite a target enemy with a strong burn.', noDrop: true,
    tags: ['spell', 'fire', 'targeted', 'instant'], color: '#ef9c64', manaCost: 0, cooldown: 5, useTime: 0,
    baseDamage: { fire: [4, 6] }, targeting: { target: 'enemy', castRange: 380 }, delivery: { type: 'target' },
    effects: [{ type: 'damage' }, { type: 'status', status: 'burn', chance: 1, magnitude: 1.4 }], ai: { range: 360, weight: 6, keepDistance: 270 },
  },
  skeletal_chain_lightning: {
    id: 'skeletal_chain_lightning', name: 'Skeletal Chain Lightning', description: 'Fire a lightning bolt that chains between up to three enemies and can shock.', noDrop: true,
    tags: ['spell', 'lightning', 'projectile'], color: '#c5b6fa', manaCost: 0, cooldown: 5, useTime: 0.7,
    baseDamage: { lightning: [4, 12] }, innateMods: [mod('chainCount', 'flat', 2)], delivery: { type: 'projectile', speed: 640, radius: 7, range: 460 },
    effects: [{ type: 'damage' }, { type: 'status', status: 'shock', chance: 0.3 }], ai: { range: 430, weight: 6, keepDistance: 270 },
  },
  skeletal_essence_drain: {
    id: 'skeletal_essence_drain', name: 'Skeletal Essence Drain', description: 'Fire a chaos bolt that inflicts a strong decay over time.', noDrop: true,
    tags: ['spell', 'projectile', 'chaos', 'duration'], color: '#a8ce72', manaCost: 0, cooldown: 6, useTime: 0.7,
    baseDamage: { chaos: [4, 7] }, delivery: { type: 'projectile', speed: 220, radius: 8, range: 480 },
    effects: [{ type: 'damage' }, { type: 'status', status: 'decay', chance: 1, magnitude: 1.6 }], ai: { range: 440, weight: 6, keepDistance: 270 },
  },
  skeletal_arrowfall: {
    id: 'skeletal_arrowfall', name: 'Rain of Bones', description: 'Rain a volley of bone arrows over the target area, dealing physical damage and inflicting rattled bones.', noDrop: true,
    tags: ['attack', 'projectile', 'physical', 'aoe', 'storm'], color: '#d8d0b0', manaCost: 0, cooldown: 8, useTime: 0.7,
    baseDamage: { physical: [5, 8] }, delivery: { type: 'storm', count: [6, 8], interval: 0.09, areaRadius: 110, hitRadius: 35, castRange: 470 },
    effects: [{ type: 'damage' }, { type: 'status', status: 'rattled_bones', chance: 1 }], ai: { range: 440, weight: 6, keepDistance: 270 },
  },
  skeletal_cinder_rain: {
    id: 'skeletal_cinder_rain', name: 'Cinder Rain', description: 'Rain burning embers across the target area, dealing fire damage.', noDrop: true,
    tags: ['spell', 'fire', 'aoe', 'storm'], color: '#ef9c64', manaCost: 0, cooldown: 8, useTime: 0.8,
    baseDamage: { fire: [5, 9] }, delivery: { type: 'storm', count: [4, 6], interval: 0.18, areaRadius: 100, hitRadius: 45, castRange: 450 },
    effects: [{ type: 'damage' }], ai: { range: 420, weight: 5, keepDistance: 260 },
  },
  skeletal_winter_ring: {
    id: 'skeletal_winter_ring', name: 'Winter Ring', description: 'Release an icy nova that deals cold damage and freezes nearby enemies for 1 second.', noDrop: true,
    tags: ['spell', 'cold', 'aoe'], color: '#8bd6ed', manaCost: 0, cooldown: 7, useTime: 0.5,
    baseDamage: { cold: [9, 15] }, delivery: { type: 'nova', radius: 190 },
    effects: [{ type: 'damage' }, { type: 'status', status: 'frozen', chance: 1, durationOverride: 1 }], ai: { range: 180, weight: 6 },
  },
  skeletal_grave_thunder: {
    id: 'skeletal_grave_thunder', name: 'Grave Thunder', description: 'Strike the target area with a burst of lightning damage.', noDrop: true,
    tags: ['spell', 'lightning', 'aoe'], color: '#c5b6fa', manaCost: 0, cooldown: 6, useTime: 0.7,
    baseDamage: { lightning: [5, 25] }, delivery: { type: 'ground', radius: 100, castRange: 460 },
    effects: [{ type: 'damage' }], ai: { range: 430, weight: 5, keepDistance: 260 },
  },
  skeletal_plague_ring: {
    id: 'skeletal_plague_ring', name: 'Plague Ring', description: 'Release a nova of chaos damage that poisons nearby enemies.', noDrop: true,
    tags: ['spell', 'chaos', 'aoe'], color: '#a8ce72', manaCost: 0, cooldown: 9, useTime: 0.6,
    baseDamage: { chaos: [14, 22] }, delivery: { type: 'nova', radius: 220 },
    effects: [{ type: 'damage' }, { type: 'status', status: 'poison', chance: 1, magnitude: 1.5 }], ai: { range: 210, weight: 5 },
  },
  marrow_sweep: {
    id: 'marrow_sweep', name: 'Marrow Sweep', description: 'Sweep a wide cone in front of the caster, dealing physical damage.', noDrop: true,
    tags: ['attack', 'melee', 'physical', 'aoe'], color: '#d8d0b0', manaCost: 0, cooldown: 5, useTime: 0.6,
    baseDamage: { physical: [14, 23] }, delivery: { type: 'cone', range: 145, arcDeg: 160 },
    effects: [{ type: 'damage' }], ai: { range: 140, rangeStat: 'aoeRadius', weight: 5 },
  },
  warding_sweep: {
    id: 'warding_sweep', name: 'Warding Sweep', description: 'Release a ring of bone around the caster that deals physical damage, taunts for 2 seconds, knocks enemies back, and inflicts bleed.', noDrop: true,
    tags: ['attack', 'physical', 'aoe'], color: '#d8d0b0', manaCost: 0, cooldown: 6, useTime: 0.5,
    baseDamage: { physical: [8, 12] }, delivery: { type: 'nova', radius: 160 },
    effects: [{ type: 'damage' }, { type: 'status', status: 'taunted', chance: 1, durationOverride: 2 }, { type: 'knockback', strength: 45 }, { type: 'status', status: 'bleed', chance: 1, durationOverride: 3, magnitude: 0.5 }], ai: { range: 150, rangeStat: 'aoeRadius', weight: 6 },
  },
  ossuary_command: aura('ossuary_command', 'Ossuary Command', { radius: 220,
    allyMods: [mod('damage', 'increased', 0.2), mod('attackSpeed', 'increased', 0.15), mod('castSpeed', 'increased', 0.15)] }),
  ossuary_aegis: aura('ossuary_aegis', 'Ossuary Aegis', { radius: 115, allyMods: [mod('damageTaken', 'more', -0.2)] }),
  ossuary_mending: aura('ossuary_mending', 'Ossuary Mending', { radius: 180, pulse: { interval: 1, healAllies: { base: 'maxLife', amount: 0.02 } } }),
};
