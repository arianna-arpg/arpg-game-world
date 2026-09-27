import type { CosmeticDef } from '../engine/cosmetics';

export const AVIAN_LEGACY: CosmeticDef = {
  id: 'legacy_hunting_falcon', name: 'Legacy Hunting Falcon', slot: 'skillSkin',
  description: 'The original broad-winged Hunting Falcon. Restore its former appearance for Cast the Falcon.',
  collection: 'Legacy Wardrobe', author: 'Hollow Wake', acquire: { kind: 'starter' },
  skills: ['cast_falcon'],
  paint: { summonBodies: {
    hunting_falcon: { look: 'vulture', color: '#c8a86a', material: 'flesh' },
  } },
};
