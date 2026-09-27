import type { CosmeticDef } from '../engine/cosmetics';

export const STALKER_LEGACY: CosmeticDef = {
  id: 'legacy_stalkers', name: 'Legacy Stalkers', slot: 'skillSkin',
  description: 'The original Steppe Strider and Veilstalker appearances for your bonded longlimbs.',
  collection: 'Legacy Wardrobe', author: 'Hollow Wake', acquire: { kind: 'starter' },
  skills: ['tame_beast'],
  paint: { summonBodies: {
    migration_strider: { look: 'stalker', color: '#c8a85e', material: 'fur' },
    veilstalker: { look: 'stalker', color: '#9a86c8', material: 'fur' },
  } },
};
