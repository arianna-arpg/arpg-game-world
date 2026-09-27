import type { CosmeticDef } from '../engine/cosmetics';

export const CANINE_LEGACY: CosmeticDef = {
  id: 'legacy_hounds', name: 'Legacy Hounds', slot: 'skillSkin',
  description: 'The original Pain Hound and bonded Plains Wolf, Gravemaw Hound and Hound That Was Never Wild appearances.',
  collection: 'Legacy Wardrobe', author: 'Hollow Wake', acquire: { kind: 'starter' },
  skills: ['pain_hounds', 'tame_beast'],
  paint: { summonBodies: {
    pain_hound: { look: 'hound', color: '#d05a3a', material: 'fur' },
    plains_wolf: { look: 'hound', color: '#9a9088' },
    shepherds_hound: { look: 'hound', color: '#7a6a55', material: 'fur' },
    gravemaw_hound: { look: 'hound', color: '#6d6a58' },
  } },
};
