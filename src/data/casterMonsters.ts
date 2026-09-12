import type { MonsterDef } from './monsters';
import { mod } from '../engine/stats';

/** Small-roster additions. Ordinary skills and brains keep these usable by
 * enemies, summons and Forge creations through the same engine pipeline. */
export const CASTER_MONSTERS: Record<string, MonsterDef> = {
  river_obol_cantor: {
    id: 'river_obol_cantor', name: 'Obol Cantor',
    color: '#7aa9b5', shape: 'pentagon', radius: 12, material: 'ethereal', look: 'river_obol_cantor',
    base: { life: 48, energyShield: 24, moveSpeed: 112, mana: 110, manaRegen: 8, phasing: 1 },
    mods: [mod('chaosRes', 'flat', 0.4), mod('coldRes', 'flat', 0.3)],
    // The unpaid dead carry their passage money as a chime-rack. The fan of
    // souls feeds the singer; the lament punishes passengers who close in.
    skills: ['soul_volley', 'keening_shriek'],
    brain: { type: 'strafer' },
    xp: 26, faction: 'riverbound', tags: ['undead'], detection: 1.15,
    presence: { from: 7, fadeIn: 3 },
    scaling: { life: { incPerLevel: 0.1 } },
  },
  bloom_scentweaver: {
    id: 'bloom_scentweaver', name: 'Scentweaver',
    color: '#cf9cbd', shape: 'pentagon', radius: 12, material: 'verdant', look: 'bloom_scentweaver',
    base: { life: 58, moveSpeed: 112, mana: 130, manaRegen: 9 },
    mods: [mod('chaosRes', 'flat', 0.45), mod('fireRes', 'flat', -0.2)],
    // Fan-shaped leaves waft the bed's perfume. Root control precedes a
    // short-range pollen burst; unlike the chorister, this one wants you near.
    skills: ['root_grasp', 'pollen_puff'],
    brain: { type: 'strafer' },
    xp: 28, faction: 'bloomkin', tags: ['plant'], detection: 1.1,
    presence: { from: 8, fadeIn: 4 },
    scaling: { life: { incPerLevel: 0.1 } },
  },
  starfall_ephemerist: {
    id: 'starfall_ephemerist', name: 'Ephemerist',
    color: '#90b7df', shape: 'star', radius: 13, material: 'ethereal', look: 'starfall_ephemerist',
    base: { life: 44, energyShield: 50, moveSpeed: 105, mana: 150, manaRegen: 10 },
    mods: [mod('coldRes', 'flat', 0.5)],
    // A walking orbital instrument: holds one target outside time, then
    // threads the Court's cold shards through its measured sightline.
    skills: ['stasis_lock', 'starfall_shard'],
    brain: { type: 'artillery' },
    xp: 32, faction: 'starfall', tags: ['construct', 'elemental'], detection: 1.1,
    presence: { from: 10, fadeIn: 4 },
    gemBias: ['cold', 'spell'],
    scaling: { life: { incPerLevel: 0.1 } },
  },
};
