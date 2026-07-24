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
  // world droplet, and a side chance of a gem or nothing. Unique odds sit a
  // step under the crowned tier's — REPEATABLE faucets run lean; only the
  // one-shot capstone hoards (regent_hoard, tidebound_hoard) pour rich.
  {
    id: 'boss_gear',
    rolls: [
      {
        count: [1, 2],
        entries: [
          {
            weight: 70, kind: 'item', ilvlBonus: 1,
            rarityWeights: { common: 22, magic: 42, rare: 31, unique: 5 },
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
          weight: 85, kind: 'item', ilvlBonus: 2,
          rarityWeights: { common: 0, magic: 30, rare: 60, unique: 10 },
        },
        { weight: 15, kind: 'unique', ilvlBonus: 2 },
      ],
    }],
  },

  // THE REGENT'S HOARD (the Unsealing's payout): four talismans of work
  // deserve a dynasty's grave goods — a fistful of elevated gear with real
  // unique odds, and a gem-or-jewel side pour. Loot to match full strength.
  {
    id: 'regent_hoard',
    rolls: [
      {
        count: [2, 3],
        entries: [
          {
            weight: 72, kind: 'item', ilvlBonus: 2,
            rarityWeights: { common: 0, magic: 20, rare: 60, unique: 20 },
          },
          { weight: 28, kind: 'unique', ilvlBonus: 2 },
        ],
      },
      {
        count: [1, 2],
        entries: [
          { weight: 45, kind: 'gem' },
          { weight: 30, kind: 'table', table: 'jewelry_cache' },
          { weight: 25, kind: 'vestige' },
        ],
      },
    ],
  },

  // THE ROYAL REGISTER's one distribution: a single item FORCED to carry one
  // of the Swarming's three families (equal thirds), never common. Both the
  // cache and the replete drink from this one table — the register stays in
  // one place, retuned in one line.
  {
    id: 'royal_jelly_pick',
    rolls: [{
      count: 1,
      entries: [
        { weight: 34, kind: 'item', withFamily: 'royal_jelly', rarityWeights: { common: 0, magic: 60, rare: 40 } },
        { weight: 33, kind: 'item', withFamily: 'chitin_plate', rarityWeights: { common: 0, magic: 60, rare: 40 } },
        { weight: 33, kind: 'item', withFamily: 'swarm_tempo', rarityWeights: { common: 0, magic: 60, rare: 40 } },
      ],
    }],
  },

  // A ROYAL-JELLY CACHE (the Swarming's wake): 1-2 register pieces, plus a
  // side taste of the wider economy — a find, not a piñata.
  {
    id: 'royal_jelly_cache',
    rolls: [
      { count: [1, 2], entries: [{ weight: 100, kind: 'table', table: 'royal_jelly_pick' }] },
      {
        count: 1,
        entries: [
          { weight: 22, kind: 'vestige' },
          { weight: 16, kind: 'gem' },
          { weight: 62, kind: 'nothing' },
        ],
      },
    ],
  },

  // A slain JELLY REPLETE sometimes spills a register piece mid-flight — the
  // living larder pays a taste of what the wake pays in full.
  {
    id: 'royal_jelly_taste',
    rolls: [{
      count: 1,
      entries: [
        { weight: 22, kind: 'table', table: 'royal_jelly_pick' },
        { weight: 78, kind: 'nothing' },
      ],
    }],
  },

  // THE DROWNED REGISTER's one distribution (the Royal Register's grammar at
  // sea): a single item FORCED to carry one of the Wraithsail's three
  // families, never common. Every drowned cache drinks from this one table.
  {
    id: 'drowned_register_pick',
    rolls: [{
      count: 1,
      entries: [
        { weight: 34, kind: 'item', withFamily: 'drowned_regalia', rarityWeights: { common: 0, magic: 60, rare: 40 } },
        { weight: 33, kind: 'item', withFamily: 'barnacle_crust', rarityWeights: { common: 0, magic: 60, rare: 40 } },
        { weight: 33, kind: 'item', withFamily: 'tideworn', rarityWeights: { common: 0, magic: 60, rare: 40 } },
      ],
    }],
  },

  // A WRECK-HOLD COFFER (the Wraithsail's below-decks): 1-2 register pieces,
  // and the sea keeps its VESTIGES — drowned holds run the richest vestige
  // side-roll of any themed cache (30 vs the royal wake's 22).
  {
    id: 'wraithsail_hold_cache',
    rolls: [
      { count: [1, 2], entries: [{ weight: 100, kind: 'table', table: 'drowned_register_pick' }] },
      {
        count: 1,
        entries: [
          { weight: 30, kind: 'vestige' },
          { weight: 14, kind: 'gem' },
          { weight: 56, kind: 'nothing' },
        ],
      },
    ],
  },

  // THE TIDEBOUND HOARD — the Regent's great-cabin spoils (the regent_hoard
  // mold, register-flavored): a dynasty's gear at heat, a third of it forced
  // through the register, and the vestige share a hold deserves.
  {
    id: 'tidebound_hoard',
    rolls: [
      {
        count: [2, 3],
        entries: [
          {
            weight: 55, kind: 'item', ilvlBonus: 2,
            rarityWeights: { common: 0, magic: 20, rare: 60, unique: 20 },
          },
          { weight: 25, kind: 'table', table: 'drowned_register_pick' },
          { weight: 20, kind: 'unique', ilvlBonus: 2 },
        ],
      },
      {
        count: [1, 2],
        entries: [
          { weight: 40, kind: 'gem' },
          { weight: 30, kind: 'vestige' },
          { weight: 30, kind: 'table', table: 'jewelry_cache' },
        ],
      },
    ],
  },

  // THE PASTORAL REGISTER's one distribution (the Royal Register's grammar in
  // the worked country): a single item FORCED to carry one of the Drove's
  // three families — and deliberately MAGIC-LED (the reeve pays a day's honest
  // herding, never a king's ransom: the low-rarity lean is the event's voice,
  // and the register words are what make the modest piece worth turning over).
  {
    id: 'pastoral_register_pick',
    rolls: [{
      count: 1,
      entries: [
        { weight: 34, kind: 'item', withFamily: 'oxdrawn', rarityWeights: { common: 0, magic: 70, rare: 30 } },
        { weight: 33, kind: 'item', withFamily: 'fleecebound', rarityWeights: { common: 0, magic: 70, rare: 30 } },
        { weight: 33, kind: 'item', withFamily: 'foldkept', rarityWeights: { common: 0, magic: 70, rare: 30 } },
      ],
    }],
  },

  // THE REEVE'S PURSE (the Drove gathered — packages/defs/drove.ts): 1-2
  // register pieces and a thin taste of the wider economy. The flawless-drove
  // bonus (every head penned ALIVE) rolls pastoral_register_pick once more on
  // top — the engine's beat, not this table's.
  {
    id: 'drove_purse',
    rolls: [
      { count: [1, 2], entries: [{ weight: 100, kind: 'table', table: 'pastoral_register_pick' }] },
      {
        count: 1,
        entries: [
          { weight: 16, kind: 'vestige' },
          { weight: 10, kind: 'gem' },
          { weight: 74, kind: 'nothing' },
        ],
      },
    ],
  },
];

export const LOOT_TABLES: Record<string, LootTableDef> =
  Object.fromEntries(TABLE_LIST.map(t => [t.id, t]));
