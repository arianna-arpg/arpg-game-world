import type { CosmeticDef } from '../engine/cosmetics';

/** Original authored bodies retained intact, independent of future native art. */
export const SUMMON_LEGACY_COSMETICS: CosmeticDef[] = [
  { id: 'legacy_amalgam', name: 'Legacy Amalgamation', slot: 'skillSkin',
    description: 'The original many-eyed grave-maw appearance for The Amalgam.',
    collection: 'Legacy Wardrobe', author: 'Hollow Wake', acquire: { kind: 'starter' },
    skills: ['the_amalgam'], paint: { summonBodies: {
      amalgam_horror: { look: 'gravemaw', color: '#8ac0a0', material: 'flesh' },
    } },
  },
  { id: 'legacy_spirit_companions', name: 'Legacy Spirit Companions', slot: 'skillSkin',
    description: 'The original Familiar, Cherub, Spirit Mender, Raging Spirit and Flame Sprite designs. Choose them together or for one skill.',
    collection: 'Legacy Wardrobe', author: 'Hollow Wake', acquire: { kind: 'starter' },
    skills: ['bind_familiar', 'summon_cherub', 'spirit_mender', 'summon_raging_spirit', 'spirit_pyre', 'summon_flame_sprite'],
    paint: { summonBodies: {
      arcane_familiar: { look: 'spirit', color: '#b08ae8', material: 'ethereal' },
      cherub: { look: 'spirit', color: '#f8e8c8', material: 'ethereal' },
      mender_sprite: { look: 'spirit', color: '#a8f0c8', material: 'ethereal' },
      raging_spirit: { look: 'spirit', color: '#ff8a4a', material: 'ethereal' },
      flame_sprite: { look: 'flame_elemental', color: '#ffb05a', material: 'ember' },
    } },
  },
];
