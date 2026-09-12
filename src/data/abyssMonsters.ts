import type { MonsterDef } from './monsters';
import { mod } from '../engine/stats';

/** Fracture-only specialist; the existing package and rift tables field it. */
export const ABYSS_MONSTERS: Record<string, MonsterDef> = {
  abyssal_foldwright: {
    id: 'abyssal_foldwright', name: 'Abyssal Foldwright',
    color: '#7795c3', shape: 'diamond', radius: 14, material: 'void', look: 'abyssal_foldwright',
    base: { life: 68, energyShield: 32, moveSpeed: 100, mana: 125, manaRegen: 10 },
    mods: [mod('coldRes', 'flat', 0.35)],
    // Its panels part around the seam: linger punishes a held position,
    // while the narrow lance rewards moving across its facing.
    skills: ['null_verge', 'umbral_lance'], brain: { type: 'artillery' },
    xp: 30, faction: 'abyssal', detection: 1.15,
    presence: { from: 16, fadeIn: 5 }, gemBias: ['chaos', 'spell'],
    scaling: { life: { incPerLevel: 0.1 } },
  },
};
