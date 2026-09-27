import type { CosmeticDef } from '../engine/cosmetics';

/** Exact pre-refresh bodies; unmapped base summons retain their own looks. */
export const UNDEAD_COURT_LEGACY: CosmeticDef = {
  id: 'legacy_undead_courts', name: 'Legacy Undead Courts', slot: 'skillSkin',
  description: 'The original Sentinel, Duelist, Stitched Abomination, Frenzied Ember, Vigil Flame, Hexwoven Shade and Soul Reaver. Includes embers raised through Spirit Pyre.',
  collection: 'Legacy Wardrobe', author: 'Hollow Wake', acquire: { kind: 'starter' },
  skills: ['summon_skeleton', 'raise_dead', 'summon_raging_spirit', 'spirit_pyre', 'summon_wraith'],
  paint: { summonBodies: {
    skeletal_sentinel: { look: 'skeleton_warrior', color: '#bfc9be', material: 'bone' },
    skeletal_duelist: { look: 'skeleton_warrior', color: '#dfd7c8', material: 'bone' },
    court_abomination: { look: 'zombie', color: '#aa8475', material: 'flesh' },
    court_ember: { look: 'spirit', color: '#ff8a4a', material: 'ethereal' },
    court_vigil_flame: { look: 'spirit', color: '#ffb46a', material: 'ethereal' },
    court_hex_wraith: { look: 'wraith', color: '#9a7ac8', material: 'ethereal' },
    court_reaper_wraith: { look: 'blade_wraith', color: '#b296da', material: 'ethereal' },
  } },
};
