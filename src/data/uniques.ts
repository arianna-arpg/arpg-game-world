// ---------------------------------------------------------------------------
// UNIQUE ITEMS — pinned legends on base families.
//
// A unique is a UniqueDef: a base family id + RangedLineDefs. Because bases
// resolve tier from the drop's item level, every line's range scales by
// tierScale per tier (ITEM_CFG.uniqueTierScale default) — the same Emberbrand
// looted in the deep world IS the leveling Emberbrand, bigger. There is no
// separate "leveling unique" category; scaling is the category.
//
// Lines are full Modifier shapes, so uniques reach every seam the engine
// already owns: tag filters (melee-only damage), actor conditions (while
// moving / on low mana), stat LINKS (gain X% of life regen as thorns —
// single-hop rule enforced by the stats engine), the generated apply_/
// damageVs_/minionApply_<status> families, and negative ranges (downsides).
// Gameplay-warping uniques (procs, skill grants) get their hooks the day
// those lines are registered as stats/registries — no new item machinery.
// ---------------------------------------------------------------------------

import type { UniqueDef } from '../engine/items';

export const UNIQUE_LIST: UniqueDef[] = [
  {
    id: 'wanderers_wake', name: "Wanderer's Wake", baseId: 'boots_evasion', weight: 100,
    flavor: 'The road never asked her name; it simply made room.',
    lines: [
      { stat: 'moveSpeed', kind: 'increased', range: [0.12, 0.18] },
      { stat: 'evasion', kind: 'increased', range: [0.25, 0.4] },
      { stat: 'insight', kind: 'flat', range: [20, 35] },
      { stat: 'damage', kind: 'increased', range: [0.08, 0.12], when: 'moving' },
    ],
  },
  {
    id: 'emberbrand', name: 'The Emberbrand', baseId: 'ring_ruby', weight: 100,
    flavor: 'It remembers every fire it has started.',
    lines: [
      { stat: 'addedFire', kind: 'flat', range: [4, 7] },
      { stat: 'apply_burn', kind: 'flat', range: [0.12, 0.2] },
      { stat: 'damageVs_burn', kind: 'flat', range: [0.1, 0.18] },
      { stat: 'fireRes', kind: 'flat', range: [0.1, 0.15] },
    ],
  },
  // THE FUSE BUILD's anchor: shorter fuses, far harder verdicts — worn by
  // anyone running Time Fuse / Doomsayer's arrears (the gather family).
  {
    id: 'slowmatch_coil', name: 'The Slowmatch Coil', baseId: 'ring_ruby', weight: 70,
    minIlvl: 8,
    flavor: 'Light it, then live long enough to hear the answer.',
    lines: [
      { stat: 'fusePower', kind: 'increased', range: [0.35, 0.55] },
      { stat: 'fuseDelay', kind: 'increased', range: [-0.3, -0.18] },
      { stat: 'damage', kind: 'increased', range: [0.08, 0.14] },
      // The coil takes its time — a real downside line.
      { stat: 'castSpeed', kind: 'increased', range: [-0.08, -0.05] },
    ],
  },
  {
    id: 'gravebloom', name: 'Gravebloom', baseId: 'helmet_es', weight: 100,
    flavor: 'What you plant in sorrow you may harvest in service.',
    lines: [
      { stat: 'minionDamage', kind: 'increased', range: [0.2, 0.3] },
      { stat: 'minionLife', kind: 'increased', range: [0.2, 0.3] },
      { stat: 'minionRegen', kind: 'flat', range: [2, 4] },
      { stat: 'minionApply_poison', kind: 'flat', range: [0.1, 0.18] },
    ],
  },
  {
    id: 'bloodletters_girdle', name: "Bloodletter's Girdle", baseId: 'belt_poise', weight: 100,
    flavor: 'Cinched tight, so nothing spills that was not meant to.',
    lines: [
      { stat: 'poise', kind: 'flat', range: [30, 50] },
      { stat: 'life', kind: 'flat', range: [25, 40] },
      { stat: 'apply_bleed', kind: 'flat', range: [0.15, 0.25] },
      { stat: 'damageVs_bleed', kind: 'flat', range: [0.1, 0.2] },
    ],
  },
  {
    id: 'hollow_sovereign', name: 'The Hollow Sovereign', baseId: 'chest_es', weight: 80,
    minIlvl: 9,
    flavor: 'A crown for the body once the body agrees to leave.',
    lines: [
      { stat: 'energyShield', kind: 'increased', range: [0.4, 0.6] },
      { stat: 'esRechargeRate', kind: 'increased', range: [0.2, 0.3] },
      { stat: 'mana', kind: 'flat', range: [30, 50] },
      // The bargain — a real downside line (negative range, scales too).
      { stat: 'life', kind: 'increased', range: [-0.15, -0.1], tierScale: 0 },
    ],
  },
  {
    id: 'stormcall', name: 'Stormcall', baseId: 'amulet_opal', weight: 100,
    flavor: 'Wear it high on the chest, where the thunder can find it.',
    lines: [
      { stat: 'addedLightning', kind: 'flat', range: [5, 9] },
      { stat: 'apply_shock', kind: 'flat', range: [0.15, 0.22] },
      { stat: 'castSpeed', kind: 'increased', range: [0.08, 0.12] },
      { stat: 'lightningRes', kind: 'flat', range: [0.15, 0.25] },
    ],
  },
  {
    id: 'aegis_of_the_drowned', name: 'Aegis of the Drowned', baseId: 'chest_armor', weight: 90,
    flavor: 'The hull held. The crew did not. The hull held.',
    lines: [
      { stat: 'armor', kind: 'increased', range: [0.5, 0.8] },
      { stat: 'thorns', kind: 'flat', range: [15, 25] },
      // A stat LINK line: thorns fed by life regen (single-hop by engine rule).
      { stat: 'thorns', kind: 'link', fromStat: 'lifeRegen', range: [1.5, 2.5], tierScale: 0 },
      { stat: 'lifeRegen', kind: 'flat', range: [2, 4] },
    ],
  },
  {
    id: 'fleetfeather', name: 'Fleetfeather Treads', baseId: 'boots_armor_evasion', weight: 110,
    flavor: 'Stitched from a bird that refused to be caught twice.',
    lines: [
      { stat: 'moveSpeed', kind: 'increased', range: [0.1, 0.15] },
      { stat: 'attackSpeed', kind: 'increased', range: [0.08, 0.12] },
      { stat: 'evasion', kind: 'flat', range: [60, 100] },
    ],
  },
  {
    id: 'misers_loop', name: "The Miser's Loop", baseId: 'ring_lapis', weight: 100,
    flavor: 'Spend it all, it whispers. See what happens.',
    lines: [
      { stat: 'mana', kind: 'increased', range: [0.25, 0.4] },
      { stat: 'manaRegen', kind: 'flat', range: [2, 3.5] },
      { stat: 'cooldownRecovery', kind: 'increased', range: [0.08, 0.12] },
      { stat: 'damage', kind: 'increased', range: [0.15, 0.2], when: 'lowMana' },
    ],
  },
  {
    id: 'titans_grasp', name: "Titan's Grasp", baseId: 'gloves_armor', weight: 100,
    flavor: 'The mountain does not strike quickly. It strikes once.',
    lines: [
      { stat: 'addedPhysical', kind: 'flat', range: [4, 8] },
      { stat: 'damage', kind: 'increased', range: [0.15, 0.25], tags: ['melee'] },
      { stat: 'strength', kind: 'flat', range: [8, 14] },
      { stat: 'accuracy', kind: 'flat', range: [60, 100] },
    ],
  },
];

export const UNIQUES: Record<string, UniqueDef> =
  Object.fromEntries(UNIQUE_LIST.map(u => [u.id, u]));
