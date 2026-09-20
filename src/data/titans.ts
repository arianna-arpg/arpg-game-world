import type { TitanTuning } from '../packages/overlays/titans';
import type { MonsterDef } from './monsters';
import type { SkillDef } from '../engine/skills';
import type { DoodadVisualDef } from '../render/vis/painters';
import type { DoodadRule } from '../engine/levelgen';
import type { LookDef } from '../render/vis/parts';
import { mod } from '../engine/stats';
import { WORLDBOSS_ENCOUNTER_PATTERNS as P } from './worldBossEncounters';

export const TITAN_TUNING: TitanTuning = {
  firstDelay: 360, cooldown: 900, chancePerSecond: 0.004,
  maxConcurrent: 1, secondsPerZone: 100, pathLength: [4, 6],
  warningSeconds: 2.5, discoveryRadius: 750,
  combatHoldSeconds: 12, combatRadius: 1000,
  seat: { range: { min: 220, max: 800 }, knownMul: 0.25, unknownMul: 4, veiledMul: 2, prefer: 'far' },
  defs: [
    { id: 'vhorun', name: 'Vhorun, the Sunder-Wyrm', monster: 'primeval_wyrm_head',
      color: '#9fbf72', glyph: '🐍', minLevel: 10, levelBonus: 3,
      body: { kind: 'titan_sunder_body', radius: 94, spacing: 64, length: 1.7 },
      wake: [{ kind: 'titan_rift', radius: 82, spacing: 62, gaps: [0.32, 0.7], gapWidth: 250 }],
      reward: { xp: 1500, gems: 6, tables: ['sunderwyrm_hoard'] },
      description: 'A country-long body plows through the land. Follow the torn earth to its head; natural crossings survive between the rifts.' },
    { id: 'cindergait', name: 'Cindergait, the Walking Caldera', monster: 'titan_cindergait',
      color: '#f39a4c', glyph: '☄', minLevel: 12, levelBonus: 3,
      body: { kind: 'titan_cinder_body', radius: 116, spacing: 76, length: 0.18 },
      wake: [{ kind: 'titan_fire', radius: 105, spacing: 76 }],
      reward: { xp: 1500, gems: 6, tables: ['furnace_hoard'] },
      description: 'A walking volcano leaves a continuous river of embers. The wake burns creatures of every allegiance; skirt it or brave the heat.' },
    { id: 'istral', name: 'Istral, the White Procession', monster: 'titan_istral',
      color: '#a9e5ef', glyph: '❄', minLevel: 14, levelBonus: 4,
      body: { kind: 'titan_rime_body', radius: 100, spacing: 65, length: 1.1 },
      wake: [
        { kind: 'titan_ice', radius: 85, spacing: 64, gaps: [0.27, 0.67], gapWidth: 260 },
        { kind: 'titan_storm', radius: 68, spacing: 400, drift: { radius: 140, period: 14 } },
      ],
      reward: { xp: 1650, gems: 7, tables: ['orogeny_hoard'] },
      description: 'A glacial leviathan raises ice ramparts. Wandering white cyclones sweep the crossings; read their motion before committing.' },
  ],
};

const plated: LookDef = { parts: [
  { kind: 'blob', params: { irr: 0.05, seed: 914 } },
  { kind: 'sinterPlates', role: 'base', params: { n: 6 } },
  { kind: 'stalactites', scale: 0.65, role: 'base', params: { n: 3 } },
] };
export const TITAN_DOODAD_VISUALS: Record<string, DoodadVisualDef> = {
  titan_sunder_body: { painter: 'creatureTerrain', order: 58, shadow: 0.45,
    params: { look: 'wyrm_plate', color: '#7b9b5d', material: 'chitin' } },
  titan_cinder_body: { painter: 'creatureTerrain', order: 58, shadow: 0.45,
    params: { look: plated, color: '#9c5335', material: 'stone' } },
  titan_rime_body: { painter: 'creatureTerrain', order: 58, shadow: 0.45,
    params: { look: 'wyrm_sail', color: '#a2d8e3', material: 'crystal' } },
  titan_rift: { painter: 'chasmPit', order: 39, params: {
    rim: { color: '#766348', alpha: 0.9, grow: 10 }, core: { color: '#06070a' },
    cracks: { color: '#342d2b' }, ledges: { color: '#5c5147' }, mist: { color: '#b6a483', alpha: 0.13 },
  } },
  titan_fire: { painter: 'liquid', order: 22, params: {
    liveBody: true,
    rim: { color: '#fabc5b', alpha: 0.8, grow: 5 }, core: { color: '#b63812', alpha: 0.9 },
    melt: { hot: '#ffbc58', crust: '#38160c' }, crawl: { color: '#ffe18a' },
  }, light: { radius: -2, color: '#ff7033', intensity: 0.5, flicker: 2 } },
  titan_ice: { painter: 'creatureTerrain', order: 49, shadow: 0.45,
    params: { look: plated, color: '#b7edf5', material: 'crystal' } },
  titan_storm: { painter: 'creatureTerrain', order: 57,
    params: { vortex: true, color: '#cff6ff' } },
  titan_warning: { painter: 'creatureTerrain', order: 38,
    params: { warning: true, color: '#f9d486' } },
};
export const TITAN_DOODAD_RULES: Record<string, DoodadRule> = {
  titan_sunder_body: { overlap: 'inert', blocksMove: true, blocksShot: true, blocksSight: false, fell: false },
  titan_cinder_body: { overlap: 'inert', blocksMove: true, blocksShot: true, blocksSight: false, fell: false },
  titan_rime_body: { overlap: 'inert', blocksMove: true, blocksShot: true, blocksSight: false, fell: false },
  titan_rift: { overlap: 'inert', blocksMove: true, blocksShot: false, fell: false, fall: { region: 'chasm' } },
  titan_ice: { overlap: 'inert', blocksMove: true, blocksShot: true, blocksSight: false, fell: false },
  titan_fire: { overlap: 'ground', fell: false, contact: { hit: { base: 8, perLevel: 0.8, type: 'fire' }, icdSec: 1 } },
  titan_storm: { overlap: 'ground', fell: false, contact: { hit: { base: 7, perLevel: 0.7, type: 'cold' }, impulse: 90, icdSec: 1 } },
  titan_warning: { overlap: 'ground', fell: false },
};

const titanArt = (id: string, name: string, color: string, damage: SkillDef['baseDamage']): SkillDef => ({
  id, name, color, description: 'A colossal strike: leave the fixed warning before impact.',
  noDrop: true, tags: ['spell', 'aoe'], manaCost: 0, cooldown: 6, useTime: 1,
  baseDamage: damage, effects: [{ type: 'damage' }],
  delivery: { type: 'ground', radius: 90, castRange: 1100, delay: 2 }, ai: { range: 1000, weight: 1 },
});
export const TITAN_SKILLS: Record<string, SkillDef> = {
  titan_caldera: titanArt('titan_caldera', 'Caldera Breach', '#f99548', { fire: [18, 25] }),
  titan_whiteout: titanArt('titan_whiteout', 'White Procession', '#b0eafa', { cold: [18, 25] }),
  sovereign_rimeheart: titanArt('sovereign_rimeheart', 'Glasswinter', '#c5efff', { cold: [17, 24] }),
  sovereign_stormcrown: titanArt('sovereign_stormcrown', 'Heavenfall', '#d6b9ff', { lightning: [14, 29] }),
};
function colossus(id: string, name: string, color: string, look: string, radius: number,
  skill: string, pattern: typeof P.upheaval | typeof P.fault, at: 'self' | 'target' = 'self'): MonsterDef {
  return { id, name, color, look, radius, shape: 'octagon', material: 'stone',
    base: { life: 1400, moveSpeed: 35, accuracy: 130, armor: 65, mana: 280, manaRegen: 14, weight: 20 },
    mods: [mod('damage', 'increased', 0.3)], skills: [], xp: 900,
    boss: true, noNemesis: true, faction: 'primeval', tags: ['primeval'], rampage: true,
    detection: 2, vision: { arcDeg: 360, rearMul: 1 }, turnSpeed: 0.7,
    brain: { type: 'juggernaut', script: [
      { id: 'strike', announce: `${name} gathers its strength — watch the ground!`,
        use: { move: { style: 'hold' } }, onEnter: [{ do: 'attackPattern', skill, pattern, at, bearing: 'actor' }],
        goto: [{ to: 'exposed', after: 4 }] },
      { id: 'exposed', announce: 'Its strength ebbs — strike!', use: { move: { style: 'hold' } },
        mods: [mod('damageTaken', 'increased', 0.35)], goto: [{ to: 'stride', after: 4 }] },
      { id: 'stride', goto: [{ to: 'strike', after: 5 }] },
    ] },
  };
}
export const TITAN_MONSTERS: Record<string, MonsterDef> = {
  titan_cindergait: colossus('titan_cindergait', 'Cindergait, the Walking Caldera', '#d9713d', 'titan_caldera', 116, 'titan_caldera', P.upheaval),
  titan_istral: colossus('titan_istral', 'Istral, the White Procession', '#abdce7', 'titan_glacier', 100, 'titan_whiteout', P.fault),
  sovereign_rimeheart: colossus('sovereign_rimeheart', 'Thessara, the Rimeheart', '#b7e1f5', 'sovereign_rimeheart', 98, 'sovereign_rimeheart', P.upheaval),
  sovereign_stormcrown: colossus('sovereign_stormcrown', 'Orun, the Stormcrowned', '#be9fde', 'sovereign_stormcrown', 104, 'sovereign_stormcrown', P.fault),
};

export const TITAN_LOOKS: Record<string, LookDef> = {
  titan_caldera: { parts: [...plated.parts,
    { kind: 'lavaCracks', color: '#ffb74d', scale: 0.95 },
    { kind: 'runes', color: '#ffe5a0', scale: 0.6, params: { n: 3 } },
    { kind: 'eyes', color: '#fff1a2', params: { spread: 0.4, dist: 0.7, size: 0.09 } },
  ], shadowScale: 1.5 },
  titan_glacier: { parts: [
    { kind: 'blob', scale: 1 },
    { kind: 'crystalGrowths', role: 'base', scale: 1.3, params: { n: 9 } },
    { kind: 'horns', color: '#e2ffff', scale: 1.1 },
    { kind: 'eyes', color: '#87c4ff', params: { spread: 0.3, dist: 0.7, size: 0.08 } },
  ] },
  sovereign_rimeheart: { parts: [
    { kind: 'blob', color: '#396175' },
    { kind: 'crystalGrowths', color: '#c6f3ff', scale: 1.45, params: { n: 12 } },
    { kind: 'crown', color: '#e4fbff', scale: 0.85 },
    { kind: 'runes', color: '#fff4cb', scale: 0.4, params: { n: 4 } },
    { kind: 'eyes', color: '#f0ffff', params: { spread: 0.2, dist: 0.6, size: 0.07 } },
  ] },
  sovereign_stormcrown: { parts: [
    { kind: 'blob', color: '#454057' },
    { kind: 'sinterPlates', color: '#797186', params: { n: 4 } },
    { kind: 'horns', color: '#c6ace8', scale: 1.4 },
    { kind: 'crown', color: '#e5cafa', scale: 1.2 },
    { kind: 'lavaCracks', color: '#e8ceff', scale: 0.9 },
    { kind: 'eyes', color: '#ffffff', params: { spread: 0.3, dist: 0.6, size: 0.1 } },
  ] },
};
