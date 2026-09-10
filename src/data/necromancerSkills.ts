import type { SkillDef, AuraSpec } from '../engine/skills';
import { mod, type DamageType } from '../engine/stats';
import { NECROMANCER_TREES, SKELETAL_MAGE_POOL } from './necromancerTrees';

const bolt = (id: string, name: string, type: DamageType, color: string): SkillDef => ({
  id, name, description: `A skeletal caster's ${type} bolt.`, noDrop: true,
  tags: ['spell', 'projectile', type], color, manaCost: 0, cooldown: 0, useTime: 1.1,
  baseDamage: { [type]: [6, 10] },
  delivery: { type: 'projectile', speed: 380, radius: 7, range: 500 },
  effects: [{ type: 'damage' }], ai: { range: 450, weight: 2, keepDistance: 270 },
});
const aura = (id: string, name: string, spec: AuraSpec): SkillDef => ({
  id, name, description: 'An innate aura carried by a summoned guardian.', noDrop: true,
  tags: ['spell', 'aura', 'buff', 'aoe'], color: '#c8d8b0', manaCost: 0, cooldown: 0, useTime: 0,
  delivery: { type: 'aura', mode: 'toggle', aura: spec }, effects: [],
});
export const NECROMANCER_SKILLS: Record<string, SkillDef> = {
  summon_skeleton_mage: {
    id: 'summon_skeleton_mage', name: 'Summon Skeleton Mage',
    description: 'Raise two random elemental mages, up to four. Their tree can fuse them into one Lich or teach the cohort an expanding repertoire of area spells.',
    tags: ['spell', 'summon', 'minion'], color: '#b6a2de', manaCost: 30, cooldown: 3, useTime: 1.1,
    delivery: { type: 'summon', pool: SKELETAL_MAGE_POOL, count: 2, maxActive: 4 }, effects: [],
    tree: NECROMANCER_TREES.summon_skeleton_mage,
    requirements: { willpower: 14, intelligence: 14 }, minDropLevel: 5,
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.15), mod('minionLife', 'increased', 0.15)] },
    ai: { range: 400, weight: 2, keepDistance: 300 },
  },
  skeletal_fire_bolt: bolt('skeletal_fire_bolt', 'Ember Bone', 'fire', '#ed985a'),
  skeletal_cold_bolt: bolt('skeletal_cold_bolt', 'Rime Bone', 'cold', '#8bd6ed'),
  skeletal_lightning_bolt: bolt('skeletal_lightning_bolt', 'Storm Bone', 'lightning', '#c5b6fa'),
  skeletal_chaos_bolt: bolt('skeletal_chaos_bolt', 'Venom Bone', 'chaos', '#a8ce72'),
  skeletal_arrowfall: {
    id: 'skeletal_arrowfall', name: 'Rain of Bones', description: 'A volley of bone arrows rains over the target area.', noDrop: true,
    tags: ['attack', 'projectile', 'physical', 'aoe', 'storm'], color: '#d8d0b0', manaCost: 0, cooldown: 8, useTime: 0.7,
    baseDamage: { physical: [5, 8] }, delivery: { type: 'storm', count: [6, 8], interval: 0.09, areaRadius: 110, hitRadius: 35, castRange: 470 },
    effects: [{ type: 'damage' }], ai: { range: 440, weight: 6, keepDistance: 270 },
  },
  skeletal_cinder_rain: {
    id: 'skeletal_cinder_rain', name: 'Cinder Rain', description: 'Rain embers across a distant patch of ground.', noDrop: true,
    tags: ['spell', 'fire', 'aoe', 'storm'], color: '#ef9c64', manaCost: 0, cooldown: 8, useTime: 0.8,
    baseDamage: { fire: [5, 9] }, delivery: { type: 'storm', count: [4, 6], interval: 0.18, areaRadius: 100, hitRadius: 45, castRange: 450 },
    effects: [{ type: 'damage' }], ai: { range: 420, weight: 5, keepDistance: 260 },
  },
  skeletal_winter_ring: {
    id: 'skeletal_winter_ring', name: 'Winter Ring', description: 'An icy ring freezes encroaching foes for one second.', noDrop: true,
    tags: ['spell', 'cold', 'aoe'], color: '#8bd6ed', manaCost: 0, cooldown: 7, useTime: 0.5,
    baseDamage: { cold: [9, 15] }, delivery: { type: 'nova', radius: 190 },
    effects: [{ type: 'damage' }, { type: 'status', status: 'frozen', chance: 1, durationOverride: 1 }], ai: { range: 180, weight: 6 },
  },
  skeletal_grave_thunder: {
    id: 'skeletal_grave_thunder', name: 'Grave Thunder', description: 'Strike the target ground with a burst of lightning.', noDrop: true,
    tags: ['spell', 'lightning', 'aoe'], color: '#c5b6fa', manaCost: 0, cooldown: 6, useTime: 0.7,
    baseDamage: { lightning: [5, 25] }, delivery: { type: 'ground', radius: 100, castRange: 460 },
    effects: [{ type: 'damage' }], ai: { range: 430, weight: 5, keepDistance: 260 },
  },
  skeletal_plague_ring: {
    id: 'skeletal_plague_ring', name: 'Plague Ring', description: 'A foul ring poisons encroaching foes.', noDrop: true,
    tags: ['spell', 'chaos', 'aoe'], color: '#a8ce72', manaCost: 0, cooldown: 9, useTime: 0.6,
    baseDamage: { chaos: [8, 14] }, delivery: { type: 'nova', radius: 220 },
    effects: [{ type: 'damage' }, { type: 'status', status: 'poison', chance: 1 }], ai: { range: 210, weight: 5 },
  },
  marrow_sweep: {
    id: 'marrow_sweep', name: 'Marrow Sweep', description: 'A heavy sweep of jointed bone.', noDrop: true,
    tags: ['attack', 'melee', 'physical', 'aoe'], color: '#d8d0b0', manaCost: 0, cooldown: 5, useTime: 0.6,
    baseDamage: { physical: [14, 23] }, delivery: { type: 'cone', range: 145, arcDeg: 160 },
    effects: [{ type: 'damage' }], ai: { range: 140, weight: 5 },
  },
  warding_sweep: {
    id: 'warding_sweep', name: 'Warding Sweep', description: 'A ring of bone draws nearby enemies to the guardian.', noDrop: true,
    tags: ['attack', 'physical', 'aoe'], color: '#d8d0b0', manaCost: 0, cooldown: 6, useTime: 0.5,
    baseDamage: { physical: [8, 12] }, delivery: { type: 'nova', radius: 160 },
    effects: [{ type: 'damage' }, { type: 'status', status: 'taunted', chance: 1, durationOverride: 2 }], ai: { range: 150, weight: 6 },
  },
  ossuary_command: aura('ossuary_command', 'Ossuary Command', { radius: 220,
    allyMods: [mod('damage', 'increased', 0.2), mod('attackSpeed', 'increased', 0.15), mod('castSpeed', 'increased', 0.15)] }),
  ossuary_aegis: aura('ossuary_aegis', 'Ossuary Aegis', { radius: 115, allyMods: [mod('damageTaken', 'more', -0.2)] }),
  ossuary_mending: aura('ossuary_mending', 'Ossuary Mending', { radius: 180, pulse: { interval: 1, healAllies: { base: 'maxLife', amount: 0.02 } } }),
};
