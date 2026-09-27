import type { CosmeticDef } from '../engine/cosmetics';

/** Preserve the old crowned lich composition and its exact school palettes. */
export const SKELETAL_MAGE_LEGACY: CosmeticDef = {
  id: 'legacy_skeletal_mages', name: 'Legacy Skeletal Mages', slot: 'skillSkin',
  description: 'The original crowned lich designs for the four skeletal mage schools and the Ossuary Lich, including mages raised through the Skeleton Archer tree.',
  collection: 'Legacy Wardrobe', author: 'Hollow Wake', acquire: { kind: 'starter' },
  skills: ['summon_skeleton_mage', 'summon_skeleton_archer'],
  paint: { summonBodies: {
    skeletal_pyromancer: { look: 'lich', color: '#ed985a', material: 'bone' },
    skeletal_cryomancer: { look: 'lich', color: '#8bd6ed', material: 'bone' },
    skeletal_stormcaller: { look: 'lich', color: '#c5b6fa', material: 'bone' },
    skeletal_venomancer: { look: 'lich', color: '#a8ce72', material: 'bone' },
    ossuary_lich: { look: 'lich', color: '#bc9be8', material: 'bone' },
  } },
};
