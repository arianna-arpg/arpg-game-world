import type { CosmeticDef } from '../engine/cosmetics';

export const ARACHNID_LEGACY: CosmeticDef = {
  id: 'legacy_spiders', name: 'Legacy Spiders', slot: 'skillSkin',
  description: 'The original Spiderling, Broodmother, Orb Weaver, Widow Matron and Spider Nest appearances for bonded spiders and brood-egg hatchlings.',
  collection: 'Legacy Wardrobe', author: 'Hollow Wake', acquire: { kind: 'starter' },
  skills: ['lay_brood_egg', 'tame_beast'],
  paint: { summonBodies: {
    spiderling: { look: 'spider_small', color: '#6a5a48' },
    broodmother: { look: 'spider_big', color: '#7a6a52' },
    orb_weaver: { look: 'orb_weaver', color: '#b0a878', material: 'chitin' },
    widow_matron: { look: 'widow_matron', color: '#4a3a48', material: 'chitin' },
    spider_nest: { look: 'spider_nest', color: '#9a8a70' },
  } },
};
