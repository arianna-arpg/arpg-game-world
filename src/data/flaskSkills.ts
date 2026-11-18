import type { SkillDef } from '../engine/skills';

/** Payloads belong to their drinker; tree/support investment is inherited at
 * dispatch. None supplies charges, orbs, or further follow-ups. */
export const FLASK_SKILLS: Record<string, SkillDef> = {
  flask_blood_bloom: {
    id: 'flask_blood_bloom', name: 'Blood Bloom', noDrop: true,
    description: 'Release a nova of physical damage around you that inflicts bleed.',
    tags: ['spell', 'physical', 'aoe'], color: '#d04848',
    manaCost: 0, cooldown: 0, useTime: 0, baseDamage: { physical: [34, 42] },
    delivery: { type: 'nova', radius: 145 },
    effects: [{ type: 'damage' }, { type: 'status', status: 'bleed', chance: 1 }],
  },
  flask_mana_lance: {
    id: 'flask_mana_lance', name: 'Galvanic Decant', noDrop: true,
    description: 'Fire a piercing bolt of lightning toward your target.',
    tags: ['spell', 'lightning', 'projectile'], color: '#779eff',
    manaCost: 0, cooldown: 0, useTime: 0, baseDamage: { lightning: [40, 60] },
    delivery: { type: 'projectile', speed: 640, radius: 9, range: 700, pierce: 2 },
    effects: [{ type: 'damage' }],
  },
  flask_volatile_bomb: {
    id: 'flask_volatile_bomb', name: 'Volatile Retort', noDrop: true,
    description: 'Lob a fiery explosive at the target area that scales with flask charges spent.',
    tags: ['spell', 'fire', 'aoe'], color: '#e4a443',
    manaCost: 0, cooldown: 0, useTime: 0, baseDamage: { fire: [18, 24] },
    delivery: { type: 'ground', radius: 120, castRange: 440, delay: 0.55 },
    effects: [{ type: 'damage' }],
  },
  flask_cold_wake: {
    id: 'flask_cold_wake', name: 'Mercury Wake', noDrop: true,
    description: 'Leave a lingering pool of cold at your feet for 4 seconds that damages and chills enemies.',
    tags: ['spell', 'cold', 'aoe', 'duration'], color: '#b8e8ef',
    manaCost: 0, cooldown: 0, useTime: 0, baseDamage: { cold: [7, 10] },
    delivery: { type: 'ground', radius: 95, castRange: 0, lingerDuration: 4, tickInterval: 0.5 },
    effects: [{ type: 'damage' }, { type: 'status', status: 'chill', chance: 1 }],
  },
  flask_fault: {
    id: 'flask_fault', name: 'Fault in the Bottle', noDrop: true,
    description: 'Trigger a delayed physical rupture at your feet that damages enemies and has a 50% chance to stun.',
    tags: ['spell', 'physical', 'aoe'], color: '#ba9875',
    manaCost: 0, cooldown: 0, useTime: 0, baseDamage: { physical: [72, 92] },
    delivery: { type: 'ground', radius: 155, castRange: 0, delay: 0.8 },
    effects: [{ type: 'damage' }, { type: 'status', status: 'stun', chance: 0.5 }],
  },
  flask_venom_bed: {
    id: 'flask_venom_bed', name: 'Bitter Garden', noDrop: true,
    description: 'Create a lingering poisonous patch at the target area for 5 seconds that deals chaos damage and poisons enemies.',
    tags: ['spell', 'chaos', 'aoe', 'duration'], color: '#8fbe59',
    manaCost: 0, cooldown: 0, useTime: 0, baseDamage: { chaos: [6, 9] },
    delivery: { type: 'ground', radius: 100, castRange: 360, lingerDuration: 5, tickInterval: 1 },
    effects: [{ type: 'damage' }, { type: 'status', status: 'poison', chance: 1, magnitude: 0.25 }],
  },
  flask_clean_company: {
    id: 'flask_clean_company', name: 'Clean Company', noDrop: true,
    description: 'Cleanse up to 2 harmful statuses from yourself and nearby allies.',
    tags: ['spell', 'aoe'], color: '#b9e8ae',
    manaCost: 0, cooldown: 0, useTime: 0,
    delivery: { type: 'nova', radius: 200 }, effects: [{ type: 'cleanse', count: 2 }],
  },
};
