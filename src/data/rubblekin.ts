import type { SkillDef } from '../engine/skills';
import type { MonsterDef } from './monsters';
import type { LookDef } from '../render/vis/parts';
import { mod } from '../engine/stats';
import { RUBBLEKIN_TREE, rubbleRelease } from './rubblekinTree';

const flight = (id: string, name: string, extra: Partial<SkillDef> = {}): SkillDef => ({
  id, name, description: 'A released living stone carries its own minion investment into flight.', noDrop: true, tags: ['attack', 'projectile', 'physical'], color: '#b5a58b',
  manaCost: 0, cooldown: 0, useTime: 0,
  baseDamage: { physical: [12, 18] },
  delivery: { type: 'projectile', speed: 510, radius: 9, range: 550, shape: 'octagon' },
  effects: [{ type: 'damage' }],
  leveling: { perLevel: [mod('damage', 'increased', 0.12)] },
  ...extra,
});

export const RUBBLEKIN_SKILLS: Record<string, SkillDef> = {
  summon_rubblekin: {
    id: 'summon_rubblekin', name: 'Gather Rubblekin', tree: RUBBLEKIN_TREE,
    description: 'TOGGLE a flock of four little living stones, reserving 8 mana per slot.'
      + ' They guard the ground ahead of you and rebuild after 4 seconds when destroyed.'
      + ' Strike your stones with a melee attack to launch them as physical projectiles;'
      + ' they gather again in place after 4 seconds, keeping their wounds and reserved slots.'
      + ' Rubblekin have their own capacity and can accompany a major golem.'
      + ' Resonance lets compatible supports modify their attacks and launched stones.',
    tags: ['spell', 'summon', 'minion', 'physical', 'persistent'], color: '#b5a58b',
    manaCost: 12, cooldown: 3, useTime: 0.8,
    delivery: { type: 'summon', monsterId: 'rubblekin', count: 4, maxActive: 4,
      persistent: { reserve: 8, respawnTime: 4, toggle: true },
      escort: { distance: 42 }, strikeRelease: rubbleRelease('rubble_flight') },
    effects: [], requirements: { willpower: 12 }, ai: { range: 400, weight: 1, keepDistance: 200 },
    leveling: { perLevel: [mod('minionDamage', 'increased', 0.15), mod('minionLife', 'increased', 0.15)] },
  },
  rubble_nudge: {
    id: 'rubble_nudge', name: 'Stone Nudge', noDrop: true,
    description: 'A small stone bumps its enemy with a physical melee blow.',
    tags: ['attack', 'melee', 'physical'], color: '#b5a58b',
    manaCost: 0, cooldown: 0.5, useTime: 0.45, baseDamage: { physical: [4, 7] },
    delivery: { type: 'melee', range: 24, arcDeg: 65 }, effects: [{ type: 'damage' }],
    ai: { range: 40, weight: 1 }, leveling: { perLevel: [mod('damage', 'increased', 0.1)] },
  },
  rubble_flight: flight('rubble_flight', 'Living Stone'),
  rubble_flint: flight('rubble_flint', 'Flying Flint', {
    delivery: { type: 'projectile', speed: 570, radius: 8, range: 620, shape: 'triangle', pierce: 2 },
    effects: [{ type: 'damage' }, { type: 'status', status: 'bleed', chance: 1 }],
  }),
  rubble_burst: flight('rubble_burst', 'Bursting Stone', {
    tags: ['attack', 'projectile', 'physical', 'aoe'],
    delivery: { type: 'projectile', speed: 440, radius: 10, range: 500, shape: 'octagon', explode: { radius: 72, damageScale: 0.8 } },
  }),
  rubble_conduit: flight('rubble_conduit', 'Rolling Conduit', {
    tags: ['attack', 'projectile', 'physical', 'aoe', 'duration'],
    delivery: { type: 'projectile', speed: 190, radius: 11, range: 550, duration: 2.4, shape: 'octagon',
      rehit: 0.6, zap: { interval: 0.3, radius: 65, damageScale: 0.3 }, explode: { radius: 72, damageScale: 0.8 } },
  }),
};

export const RUBBLEKIN_MONSTERS: Record<string, MonsterDef> = {
  rubblekin: { id: 'rubblekin', name: 'Rubblekin', color: '#b5a58b', material: 'stone',
    shape: 'octagon', radius: 9, look: 'rubblekin',
    base: { life: 38, armor: 22, moveSpeed: 155, accuracy: 100, mana: 40, manaRegen: 4 },
    skills: ['rubble_nudge'], xp: 0 },
};

export const RUBBLEKIN_LOOKS: Record<string, LookDef> = {
  rubblekin: { parts: [
    { kind: 'torso', scale: 0.9 },
    { kind: 'torso', x: -0.45, y: -0.55, scale: 0.4, mirror: true },
    { kind: 'torso', x: 0.48, y: -0.62, scale: 0.32, mirror: true },
    { kind: 'eyes', x: 0.28, scale: 0.65, params: { size: 0.13, spread: 0.38 } },
  ], shadowScale: 0.85 },
};
