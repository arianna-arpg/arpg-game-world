import type { MonsterDef } from './monsters';
import { mod } from '../engine/stats';

/** Location-bound hunters. Their attacks remain ordinary attributable skills;
 * the cord itself is a restraint, never an invisible damage surface. */
export const TETHERED_MONSTERS: Record<string, MonsterDef> = {
  rootlash_snapper: {
    id: 'rootlash_snapper', name: 'Rootlash Snapper',
    color: '#91bb50', shape: 'hexagon', radius: 15, material: 'verdant', look: 'maw_bloom',
    base: { life: 105, moveSpeed: 210, accuracy: 100, mana: 30, manaRegen: 3 },
    skills: ['claw'], xp: 22, faction: 'sylvan', packSize: [1, 2], noRecall: true,
    mods: [mod('fireRes', 'flat', -0.25)],
    brain: { type: 'basic', behavior: { castArc: 0.7 } },
    movementTether: { length: 190, rest: 0.22, returnSpeed: 265,
      style: 'vine', color: '#659b45', width: 5, anchorSize: 12 },
  },
  gravebound_shade: {
    id: 'gravebound_shade', name: 'Gravebound Shade',
    color: '#a7c4df', shape: 'diamond', radius: 13, material: 'ethereal', look: 'wraith',
    base: { life: 85, energyShield: 25, moveSpeed: 175, accuracy: 100, mana: 40, manaRegen: 4 },
    skills: ['shadow_slash'], xp: 26, faction: 'undead', packSize: [1, 2], noRecall: true,
    mods: [mod('coldRes', 'flat', 0.3)],
    brain: { type: 'basic', behavior: { castArc: 0.8 } },
    movementTether: { length: 270, rest: 0.45, returnSpeed: 135,
      style: 'spirit', color: '#a7c4df', width: 3, anchorSize: 11 },
  },
  stakebound_hound: {
    id: 'stakebound_hound', name: 'Stakebound Hound',
    color: '#df6d3c', shape: 'rhombus', radius: 14, material: 'fur', look: 'hellhound',
    base: { life: 145, armor: 18, moveSpeed: 285, accuracy: 105, mana: 30, manaRegen: 3 },
    skills: ['cinder_bite'], xp: 30, faction: 'demon', packSize: [1, 1], noRecall: true,
    mods: [mod('fireRes', 'flat', 0.3)],
    brain: { type: 'basic', behavior: { castArc: 0.65 } },
    movementTether: { length: 235, rest: 0.18, returnSpeed: 320,
      style: 'chain', color: '#c88a61', width: 4, anchorSize: 10 },
  },
};
