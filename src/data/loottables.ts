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

  // THE LAIR HOARD (the lair fabric, data/lairs.ts): what the den's victims
  // carried, paid by every fallen alpha — the Rimefather, the cairn giant,
  // the hag, a sphinx who chose poorly. REPEATABLE faucet, so it runs a
  // half-step over boss_gear, never near the one-shot capstone hoards: one
  // elevated find with honest rare odds, plus a scavenged side pour.
  {
    id: 'lair_hoard',
    rolls: [
      {
        count: [1, 2],
        entries: [
          {
            weight: 75, kind: 'item', ilvlBonus: 1,
            rarityWeights: { common: 10, magic: 40, rare: 42, unique: 8 },
          },
          { weight: 25, kind: 'table', table: 'world_gear' },
        ],
      },
      {
        count: 1,
        entries: [
          { weight: 30, kind: 'gem' },
          { weight: 25, kind: 'table', table: 'jewelry_cache' },
          { weight: 10, kind: 'vestige' },
          { weight: 35, kind: 'nothing' },
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

  // --- THE SOVEREIGN HOARDS (the Primeval — packages/defs/worldboss.ts) ------
  //
  // A world boss is a RARE, NAMED cataclysm: one abroad at a time, minutes of
  // map warning, a long cooldown after each slaying. So a sovereign pays at
  // CAPSTONE heat (the regent's band) rather than the repeatable boss faucet —
  // and it pays it as ITSELF. Every sovereign names its own table, because a
  // named force of nature whose spoils are indistinguishable from a warlord's
  // isn't a sovereign, it's a health bar.
  //
  // All five drink from ONE spine (primeval_spoil), so the tier retunes in a
  // single row; each face then carries only the character its body earned —
  // how MANY pulls it pays, what the land it ate is made of, and which side
  // currency it spills. (These stack ON TOP of the ordinary boss drop path:
  // every primeval root wears MonsterDef.boss, so boss_gear already fired.)
  //
  // WHERE THE TIER SITS, measured at ilvl 20 (`sim audit drops --table …`):
  // the spine pays ~1 item at ~15% unique — roughly THREE TIMES a lair
  // alpha's 4.7% and a boss's 3.0%, and well under HALF the one-shot
  // regent_hoard's 33.7%. A sovereign is rare but it is still a FAUCET (an
  // apparition can breach again inside the quarter hour), so it is priced as
  // the best repeatable kill in the world — never as a dynasty's grave.
  {
    id: 'primeval_spoil',
    rolls: [{
      count: 1,
      entries: [
        {
          weight: 72, kind: 'item', ilvlBonus: 2,
          rarityWeights: { common: 0, magic: 34, rare: 58, unique: 8 },
        },
        { weight: 8, kind: 'unique', ilvlBonus: 2 },
        { weight: 20, kind: 'table', table: 'world_gear' },
      ],
    }],
  },

  // VHORUN, THE SUNDER-WYRM — a chain of strangled roads went down its throat.
  // The WIDEST haul of the five (3.3 pieces — a season of travellers, all at
  // once), earned by the longest arc in the package: it must wake, slither a
  // chain of nodes and settle before it can even be fought. The only sovereign
  // that pays ARMOUR by name — the plates you tore off its length.
  {
    id: 'sunderwyrm_hoard',
    rolls: [
      { count: [2, 3], entries: [{ weight: 100, kind: 'table', table: 'primeval_spoil' }] },
      {
        count: [1, 2],
        entries: [
          { weight: 30, kind: 'item', category: 'chest', ilvlBonus: 2, rarityWeights: { common: 0, magic: 32, rare: 58, unique: 10 } },
          { weight: 24, kind: 'item', category: 'belt', ilvlBonus: 2, rarityWeights: { common: 0, magic: 32, rare: 58, unique: 10 } },
          { weight: 26, kind: 'gem' },
          { weight: 20, kind: 'vestige' },
        ],
      },
    ],
  },

  // CRAGMAW, THE OROGENY — a walking mountain, and mountains are where the
  // stones come from. The RICHEST GEM pour of the five (0.69/kill): what you
  // crack out of it is worth more than what it was wearing.
  {
    id: 'orogeny_hoard',
    rolls: [
      { count: [1, 2], entries: [{ weight: 100, kind: 'table', table: 'primeval_spoil' }] },
      {
        count: [1, 2],
        entries: [
          { weight: 46, kind: 'gem' },
          { weight: 22, kind: 'item', category: 'helmet', ilvlBonus: 1, rarityWeights: { common: 0, magic: 40, rare: 55, unique: 5 } },
          { weight: 22, kind: 'item', category: 'boots', ilvlBonus: 1, rarityWeights: { common: 0, magic: 40, rare: 55, unique: 5 } },
          { weight: 10, kind: 'vestige' },
        ],
      },
    ],
  },

  // ASHVEIN, THE FURNACE BELOW — hell's own sovereign, and the surface never
  // sees it. The FEWEST pieces of the five and the HOTTEST unique odds among
  // them (21.6%): what the furnace pours was never mined, it was made — and
  // it cools into slag worth socketing.
  {
    id: 'furnace_hoard',
    rolls: [
      { count: [1, 2], entries: [{ weight: 100, kind: 'table', table: 'primeval_spoil' }] },
      {
        count: 1,
        entries: [
          { weight: 20, kind: 'unique', ilvlBonus: 3 },
          { weight: 44, kind: 'vestige', count: [1, 2] },
          { weight: 36, kind: 'item', category: 'gloves', ilvlBonus: 2, rarityWeights: { common: 0, magic: 30, rare: 58, unique: 12 } },
        ],
      },
    ],
  },

  // DOLMOURN, THE IRON BELL — a walking mausoleum carrying a cast bell. The
  // VESTIGE-richest table in the whole economy (0.98/kill, over twice the
  // tidebound hold's 0.45): it is made of the one thing sockets want, and
  // every grave it walked over hung something on a chain.
  {
    id: 'iron_bell_hoard',
    rolls: [
      { count: [1, 2], entries: [{ weight: 100, kind: 'table', table: 'primeval_spoil' }] },
      {
        count: [1, 2],
        entries: [
          { weight: 44, kind: 'vestige', count: [1, 2] },
          { weight: 30, kind: 'item', category: 'amulet', ilvlBonus: 2, rarityWeights: { common: 0, magic: 30, rare: 58, unique: 12 } },
          { weight: 26, kind: 'table', table: 'jewelry_cache' },
        ],
      },
    ],
  },

  // VELKETH, THE ENTHRONED HUSK — the throne kept its regalia long after it
  // stopped keeping its king. Grave goods: jewelled, elevated, and the only
  // sovereign hoard whose SIDE pour can be a second dynasty's worth of rings.
  {
    id: 'husk_throne_hoard',
    rolls: [
      { count: [1, 2], entries: [{ weight: 100, kind: 'table', table: 'primeval_spoil' }] },
      {
        count: [1, 2],
        entries: [
          { weight: 38, kind: 'table', table: 'jewelry_cache' },
          { weight: 26, kind: 'item', category: 'ring', ilvlBonus: 3, rarityWeights: { common: 0, magic: 20, rare: 62, unique: 18 } },
          { weight: 20, kind: 'gem' },
          { weight: 16, kind: 'vestige' },
        ],
      },
    ],
  },

  // --- THE RIDDLE SPOILS (the puzzle fabric's diversified pay, 2026-08-07) ---
  //
  // A resolved riddle pays through PuzzleRewardSpec.table (engine/puzzles.ts;
  // World.completePuzzle resolves it through THIS fabric — never a bespoke
  // payout path). Riddles are repeatable per-zone DISCOVERIES (≤ two a zone,
  // solved once per zone instance, no combat toll), so the tier prices between
  // the world droplet and the lair faucet — one honest find plus a themed side
  // pour, with gems kept RICHEST where the theme is the crystal itself (the
  // chord, the founding pay's true heir). The flat 2-gem pay of the first
  // iterations becomes variety at comparable value.
  // ⚠ EVERY weight / count / rarity split / ilvl bonus in this block is my
  // pick (puzzle-rewards pass), flagged for Arianna as one unit.

  // THE RIDDLE TROVE — the shared spine: what "a riddle's worth" means in
  // gear, retuned in one row (the primeval_spoil idiom). The themed faces
  // nest it; it pays exactly one find.
  {
    id: 'puzzle_trove',
    rolls: [{
      count: 1,
      entries: [
        {
          weight: 70, kind: 'item', ilvlBonus: 1,
          rarityWeights: { common: 15, magic: 45, rare: 35, unique: 5 },
        },
        { weight: 30, kind: 'table', table: 'world_gear' },
      ],
    }],
  },

  // THE SONGLINE SPOILS (refrain / tempo / accord — the sung riddles): the
  // singer's own jewelry first, and the song keeps a little of the crystal's
  // coin on the side.
  {
    id: 'songline_spoils',
    rolls: [
      {
        count: 1,
        entries: [
          { weight: 40, kind: 'table', table: 'jewelry_cache' },
          { weight: 25, kind: 'item', category: 'amulet', ilvlBonus: 1 },
          { weight: 35, kind: 'table', table: 'puzzle_trove' },
        ],
      },
      {
        count: 1,
        entries: [
          { weight: 35, kind: 'gem' },
          { weight: 20, kind: 'vestige' },
          { weight: 45, kind: 'nothing' },
        ],
      },
    ],
  },

  // THE CHORD SPOILS (the attunement riddles): the gem-riddle proper — the
  // crystals pay in their own stone. The richest gem lane of the riddle
  // tables, on purpose: where the theme IS the gem, the gems stay.
  {
    id: 'chord_spoils',
    rolls: [{
      count: [1, 2],
      entries: [
        { weight: 60, kind: 'gem' },
        { weight: 25, kind: 'table', table: 'puzzle_trove' },
        { weight: 15, kind: 'vestige' },
      ],
    }],
  },

  // THE LATTICE SPOILS (the charged boards, shaped or plain): storm-caught
  // kit — the Stormlit words ride their magic-only family (forced magic so
  // the promise never silently degrades to an unworded rare), the board's
  // charge keeps a gem lane second only to the chord's.
  {
    id: 'lattice_spoils',
    rolls: [
      {
        count: 1,
        entries: [
          { weight: 30, kind: 'item', withFamily: 'proc_stormlit', rarityWeights: { common: 0, magic: 100, rare: 0 } },
          { weight: 45, kind: 'table', table: 'puzzle_trove' },
          { weight: 25, kind: 'gem' },
        ],
      },
      {
        count: 1,
        entries: [
          { weight: 25, kind: 'gem' },
          { weight: 15, kind: 'vestige' },
          { weight: 60, kind: 'nothing' },
        ],
      },
    ],
  },

  // THE EMBER SPOILS (the tended ring): forge-goods — the smith's wear off
  // the coals, the Concussive words where a blue can carry them, and slag
  // worth socketing (the furnace's own doctrine: the richest vestige side
  // of the riddle tables).
  {
    id: 'ember_spoils',
    rolls: [
      {
        count: 1,
        entries: [
          { weight: 20, kind: 'item', category: 'gloves', ilvlBonus: 1 },
          { weight: 15, kind: 'item', category: 'belt', ilvlBonus: 1 },
          { weight: 15, kind: 'item', withFamily: 'proc_concussive', rarityWeights: { common: 0, magic: 100, rare: 0 } },
          { weight: 50, kind: 'table', table: 'puzzle_trove' },
        ],
      },
      {
        count: 1,
        entries: [
          { weight: 30, kind: 'vestige', count: [1, 2] },
          { weight: 20, kind: 'gem' },
          { weight: 50, kind: 'nothing' },
        ],
      },
    ],
  },

  // THE RINK SPOILS (the pushed blocks): deepwinter kit — footing first
  // (boots, the Icewalker's own Traction words), the cold's wear second,
  // the trove behind.
  {
    id: 'iceslide_spoils',
    rolls: [
      {
        count: 1,
        entries: [
          { weight: 25, kind: 'item', category: 'boots', ilvlBonus: 1 },
          { weight: 15, kind: 'item', category: 'boots', withFamily: 'traction' },
          { weight: 20, kind: 'item', category: 'chest', ilvlBonus: 1 },
          { weight: 40, kind: 'table', table: 'puzzle_trove' },
        ],
      },
      {
        count: 1,
        entries: [
          { weight: 25, kind: 'gem' },
          { weight: 15, kind: 'vestige' },
          { weight: 60, kind: 'nothing' },
        ],
      },
    ],
  },

  // THE EXHUMATION GOODS (the lone crypt's ring): grave-goods, and LEAN by
  // her ruling (2026-08-05 — the sealed crypt this ring opens is the real
  // pay): exactly ONE thing, always, valued near the old single gem — the
  // stone's coin, the dead's jewelry, or a grave chain worth socketing.
  {
    id: 'exhumation_goods',
    rolls: [{
      count: 1,
      entries: [
        { weight: 40, kind: 'gem' },
        { weight: 15, kind: 'item', category: 'ring' },
        { weight: 15, kind: 'item', category: 'amulet' },
        { weight: 30, kind: 'vestige' },
      ],
    }],
  },
];

export const LOOT_TABLES: Record<string, LootTableDef> =
  Object.fromEntries(TABLE_LIST.map(t => [t.id, t]));
