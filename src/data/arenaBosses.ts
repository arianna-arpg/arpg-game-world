import type { MonsterDef } from './monsters';
import type { SkillDef } from '../engine/skills';
import type { AIAction, PhaseDef } from '../engine/brain';
import type { AttackPattern } from '../engine/attackPatterns';
import type { LookDef } from '../render/vis/parts';
import { mod, type SkillTag } from '../engine/stats';

/** Arena geometry is content. Each row can be reused by any actor's brain;
 * skill identity owns damage, ailments, scaling, credit and part bans. */
const ranks = [110, 250, 390, 530];
const files = [-280, -140, 0, 140, 280];
const grid = (columns: readonly number[], step = 0, reverse = false) =>
  columns.flatMap((y, i) => ranks.map(x => ({ x, y,
    after: (reverse ? columns.length - 1 - i : i) * step })));

export const ARENA_BOSS_PATTERNS = {
  bass: { points: grid([-240, -120]), radius: 72, delay: 1.35 },
  treble: { points: grid([120, 240]), radius: 72, delay: 1.35 },
  sweep: { points: grid(files, 0.38), radius: 48, delay: 1.4 },
  backwash: { points: grid(files, 0.38, true), radius: 48, delay: 1.4 },
  banks: { points: grid([-280, 280]), radius: 90, delay: 1.5, linger: 3, tickInterval: 1 },
  channel: { points: grid([0]), radius: 95, delay: 1.5, linger: 3, tickInterval: 1 },
} satisfies Record<string, AttackPattern>;

const pattern = (skill: string, p: AttackPattern): AIAction =>
  ({ do: 'attackPattern', skill, pattern: p, at: 'anchor', bearing: Math.PI / 2 });

const art = (id: string, name: string, color: string, damage: SkillDef['baseDamage'],
  description: string): SkillDef => ({
  id, name, color, description, noDrop: true,
  tags: ['spell', 'aoe', ...Object.keys(damage ?? {}) as SkillTag[]], manaCost: 0, cooldown: 5, useTime: 0.8,
  baseDamage: damage, effects: [{ type: 'damage' }],
  delivery: { type: 'ground', radius: 72, castRange: 900, delay: 1.25 },
  ai: { range: 850, weight: 1 },
});

export const ARENA_BOSS_SKILLS: Record<string, SkillDef> = {
  arena_boss_bass: art('arena_boss_bass', 'Grave Bass', '#c5ac80', { physical: [17, 23] },
    'The bass pipes sound across one half of the court. Break their pipe to silence the marks.'),
  arena_boss_treble: art('arena_boss_treble', 'Grave Treble', '#9fbbcf', { cold: [15, 21] },
    'The treble pipes frost the other half of the court. Their warning fixes every impact in place.'),
  arena_boss_requiem: art('arena_boss_requiem', 'Last Note', '#d7c59a', { physical: [13, 19] },
    'A single marked note lands after a generous warning. Step off the mark and keep attacking.'),
  arena_boss_furnace: art('arena_boss_furnace', 'Furnace Sweep', '#ee945c', { fire: [18, 25] },
    'Five files ignite in order. Cross behind the first impacts, or use the gaps between ranks.'),
  arena_boss_ember: art('arena_boss_ember', 'Spat Ember', '#eeb477', { fire: [12, 18] },
    'A furnace ember marks a distant intruder. Its landing position stops following at the warning.'),
  arena_boss_seep: art('arena_boss_seep', 'Black Seep', '#a8bc69', { chaos: [7, 10] },
    'Marked ground seeps for three seconds. Its banks and central channel alternate, leaving dry approaches.'),
  arena_boss_pulse: art('arena_boss_pulse', 'Heart Spasm', '#b9d08a', { physical: [12, 18] },
    'The rooted heart heaves beneath a marked intruder. Leave the swelling ground before it bursts.'),
};

const breath = (next: string, hot?: string): PhaseDef => ({
  id: 'breath', announce: 'The furnace opens — strike!',
  mods: [mod('damageTaken', 'increased', 0.25)],
  goto: [...(hot ? [{ to: hot, atLifeFrac: 0.4 }] : []), { to: next, after: 3 }],
});
const common = {
  boss: true, noNemesis: true, loot: 'lair_hoard', packSize: [1, 1] as [number, number],
  detection: 2.4, vision: { arcDeg: 360, rearMul: 1 }, turnSpeed: 0, spawnFacing: Math.PI / 2,
  ambush: { radius: 620, visible: true, emerge: { motion: 'stir' as const } },
  scaling: { life: { incPerLevel: 0.12 } },
};

export const ARENA_BOSS_MONSTERS: Record<string, MonsterDef> = {
  arena_boss_organ: {
    ...common, id: 'arena_boss_organ', name: 'The Ossuary Organ',
    color: '#bca886', shape: 'square', radius: 58, material: 'bone', look: 'arena_boss_organ',
    base: { life: 1050, moveSpeed: 0, armor: 25, mana: 100, manaRegen: 8, weight: 12 },
    skills: ['arena_boss_requiem'], xp: 320, faction: 'carven',
    parts: [
      { monster: 'arena_boss_bass_pipe', dx: 0, dy: -1.6, lifeFrac: 0.19, breakDamage: 0.08,
        breakDisables: ['arena_boss_bass'], breakMods: [mod('damageTaken', 'increased', 0.1)] },
      { monster: 'arena_boss_treble_pipe', dx: 0, dy: 1.6, lifeFrac: 0.19, breakDamage: 0.08,
        breakDisables: ['arena_boss_treble'], breakMods: [mod('damageTaken', 'increased', 0.1)] },
    ],
    brain: { type: 'artillery', script: [
      { id: 'antiphon', announce: 'Break the pipes to silence their half of the court.',
        cadences: [
          { every: 8, first: 2, actions: [pattern('arena_boss_bass', ARENA_BOSS_PATTERNS.bass)] },
          { every: 8, first: 6, actions: [pattern('arena_boss_treble', ARENA_BOSS_PATTERNS.treble)] },
        ], goto: [{ to: 'requiem', atLifeFrac: 0.4 }] },
      { id: 'requiem', announce: 'The remaining pipes sound together!',
        cadences: [{ every: 6.5, first: 2, actions: [
          pattern('arena_boss_bass', ARENA_BOSS_PATTERNS.bass),
          pattern('arena_boss_treble', ARENA_BOSS_PATTERNS.treble),
        ] }] },
    ] },
  },
  arena_boss_bass_pipe: {
    id: 'arena_boss_bass_pipe', name: 'Bass Pipe', color: '#c5ac80', shape: 'square', radius: 23,
    material: 'bone', look: 'arena_boss_pipe', faction: 'carven', noNemesis: true,
    base: { life: 160, moveSpeed: 0, mana: 0 }, skills: [], xp: 0,
  },
  arena_boss_treble_pipe: {
    id: 'arena_boss_treble_pipe', name: 'Treble Pipe', color: '#9fbbcf', shape: 'square', radius: 23,
    material: 'bone', look: 'arena_boss_pipe', faction: 'carven', noNemesis: true,
    base: { life: 160, moveSpeed: 0, mana: 0 }, skills: [], xp: 0,
  },
  arena_boss_crucible: {
    ...common, id: 'arena_boss_crucible', name: 'The Cinder Crucible',
    color: '#c9653c', shape: 'hexagon', radius: 63, material: 'ember', look: 'arena_boss_crucible',
    base: { life: 1250, moveSpeed: 0, armor: 38, mana: 100, manaRegen: 8, weight: 15 },
    mods: [mod('fireRes', 'flat', 0.35)], skills: ['arena_boss_ember'], xp: 400,
    brain: { type: 'artillery', script: [
      { id: 'sweep', announce: 'Follow the fire across the floor.',
        onEnter: [pattern('arena_boss_furnace', ARENA_BOSS_PATTERNS.sweep)],
        goto: [{ to: 'hot', atLifeFrac: 0.4, after: 4 }, { to: 'backwash', after: 4.5 }] },
      { id: 'backwash', onEnter: [pattern('arena_boss_furnace', ARENA_BOSS_PATTERNS.backwash)],
        goto: [{ to: 'breath', after: 4.5 }] },
      breath('sweep', 'hot'),
      { id: 'hot', announce: 'The crucible cracks — the heat returns faster!',
        onEnter: [pattern('arena_boss_furnace', ARENA_BOSS_PATTERNS.sweep)],
        goto: [{ to: 'hot_backwash', after: 4 }] },
      { id: 'hot_backwash', onEnter: [pattern('arena_boss_furnace', ARENA_BOSS_PATTERNS.backwash)],
        goto: [{ to: 'hot_breath', after: 4 }] },
      { ...breath('hot'), id: 'hot_breath' },
    ] },
  },
  arena_boss_mireheart: {
    ...common, id: 'arena_boss_mireheart', name: 'The Mire Heart',
    color: '#7c9455', shape: 'oval', radius: 61, material: 'verdant', look: 'arena_boss_mireheart',
    base: { life: 1150, moveSpeed: 0, armor: 16, mana: 100, manaRegen: 8, weight: 12 },
    mods: [mod('chaosRes', 'flat', 0.3)], skills: ['arena_boss_pulse'], xp: 360, faction: 'coven',
    brain: { type: 'artillery', script: [
      { id: 'banks', announce: 'The banks seep — approach along the dry channel.',
        onEnter: [pattern('arena_boss_seep', ARENA_BOSS_PATTERNS.banks)],
        goto: [{ to: 'channel', after: 6 }] },
      { id: 'channel', announce: 'The channel swells — take the banks.',
        onEnter: [pattern('arena_boss_seep', ARENA_BOSS_PATTERNS.channel)],
        goto: [{ to: 'drained', after: 6 }] },
      { id: 'drained', announce: 'The heart drains — strike the exposed flesh!',
        mods: [mod('damageTaken', 'increased', 0.3)],
        goto: [{ to: 'bloom_banks', atLifeFrac: 0.4, after: 3 }, { to: 'banks', after: 4 }] },
      { id: 'bloom_banks', announce: 'The wounded heart quickens its tide.',
        onEnter: [pattern('arena_boss_seep', ARENA_BOSS_PATTERNS.banks)],
        goto: [{ to: 'bloom_channel', after: 5 }] },
      { id: 'bloom_channel', onEnter: [pattern('arena_boss_seep', ARENA_BOSS_PATTERNS.channel)],
        goto: [{ to: 'bloom_drained', after: 5 }] },
      { id: 'bloom_drained', mods: [mod('damageTaken', 'increased', 0.3)],
        goto: [{ to: 'bloom_banks', after: 3 }] },
    ] },
  },
};

/** Existing anatomy painters, composed into broad, rooted silhouettes. */
export const ARENA_BOSS_LOOKS: Record<string, LookDef> = {
  arena_boss_organ: { parts: [
    { kind: 'ribs', scale: 1.3 }, { kind: 'skull', x: 0.25, scale: 0.65 },
    { kind: 'horns', x: -0.3, scale: 1.05 },
  ], shadowScale: 1.3 },
  arena_boss_pipe: { parts: [{ kind: 'ribs', scale: 0.9 }, { kind: 'skull', x: 0.5, scale: 0.4 }] },
  arena_boss_crucible: { parts: [
    { kind: 'armorPlates', scale: 1.15 }, { kind: 'bellowsLung', x: -0.4, scale: 0.7 },
    { kind: 'disc', scale: 0.75, color: '#e78a46' },
    { kind: 'mortarMaw', x: 0.2, scale: 0.85 }, { kind: 'lavaCracks', scale: 1.05 },
  ], live: [{ kind: 'emberSparks', scale: 0.6 }], shadowScale: 1.4 },
  arena_boss_mireheart: { parts: [
    { kind: 'hookCreepers', scale: 1.25 }, { kind: 'barkPlates', scale: 1.1 },
    { kind: 'splitSeedcase', scale: 0.8 }, { kind: 'disc', scale: 0.4, color: '#ad7281' },
  ], live: [{ kind: 'sporeVents', scale: 0.6 }], shadowScale: 1.35 },
};
