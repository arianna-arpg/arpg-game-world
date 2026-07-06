// ---------------------------------------------------------------------------
// LOOT TABLE DATA — the drop economy, as entries.
//
// Referenced by id from DROP_CFG (kill-path defaults), MonsterDef.loot
// (per-monster overrides), and each other (kind:'table' nesting). Adding a
// boss hoard, a themed cache, or a "this monster favors belts" quirk is a
// row here — never a world.ts edit.
// ---------------------------------------------------------------------------

import type { LootTableDef } from '../engine/loot';

const TABLE_LIST: LootTableDef[] = [
  // The baseline gear droplet: one item at zone ilvl, config-weighted rarity.
  {
    id: 'world_gear',
    rolls: [{ count: 1, entries: [{ weight: 100, kind: 'item' }] }],
  },

  // A jewelry-flavored cache — demonstrates category-constrained NESTED pulls.
  {
    id: 'jewelry_cache',
    rolls: [{
      count: [1, 2],
      entries: [
        { weight: 45, kind: 'item', category: 'ring' },
        { weight: 25, kind: 'item', category: 'amulet' },
        { weight: 20, kind: 'item', category: 'belt' },
        { weight: 10, kind: 'nothing' },
      ],
    }],
  },

  // Bosses: an elevated-rarity item (a level over the zone), a shot at the
  // world droplet, and a side chance of a gem or nothing.
  {
    id: 'boss_gear',
    rolls: [
      {
        count: [1, 2],
        entries: [
          {
            weight: 70, kind: 'item', ilvlBonus: 1,
            rarityWeights: { common: 20, magic: 40, rare: 32, unique: 8 },
          },
          { weight: 30, kind: 'table', table: 'world_gear' },
        ],
      },
      {
        count: 1,
        entries: [
          { weight: 35, kind: 'gem' },
          { weight: 25, kind: 'table', table: 'jewelry_cache' },
          { weight: 40, kind: 'nothing' },
        ],
      },
    ],
  },

  // Crowned warband leaders: rare-or-better, real unique odds, deep ilvl push.
  {
    id: 'crowned_gear',
    rolls: [{
      count: 1,
      entries: [
        {
          weight: 80, kind: 'item', ilvlBonus: 2,
          rarityWeights: { common: 0, magic: 25, rare: 60, unique: 15 },
        },
        { weight: 20, kind: 'unique', ilvlBonus: 2 },
      ],
    }],
  },
];

export const LOOT_TABLES: Record<string, LootTableDef> =
  Object.fromEntries(TABLE_LIST.map(t => [t.id, t]));
