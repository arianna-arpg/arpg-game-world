// ---------------------------------------------------------------------------
// RARE-MONSTER NAMES — the D2-style nomenclature mill, as data.
//
// A randomly-rolled elite pack leader deserves a NAME: prefix + suffix welded
// into a compound ("Goresnap", "Wartgristle"), sometimes trailed by an epithet
// ("Bonechew the Tax Collector"). Distinct names make foes MEMORABLE — and
// memorability compounds through the Nemesis system: the named rare that
// kills you enters the saga AS ITSELF and comes back wearing the same name.
//
// Pools are deliberately huge and freely mixable (~70×70 compounds × ~50
// epithets ≈ a quarter-million names) and expanding any of them is appending
// a string. `byFaction` overrides let a faction bring its own tongue —
// absent factions fall through to the defaults, so new factions cost nothing.
// Authored set-piece bosses (the Unmade, Balor…) are never renamed — only
// the random elite rolls opt into the mill (World.promoteRarity's
// distinctName option).
// ---------------------------------------------------------------------------

import type { MonsterRarity } from '../engine/rarity';

export const MONSTER_NAME_CFG = {
  /** Tiers whose RANDOM pack-leader roll mints a distinct name (magic stays
   *  a plain "Magic X" — names are for foes worth remembering). */
  namedRarities: ['rare', 'champion', 'crowned'] as MonsterRarity[],
  /** Chance the compound gains an epithet ("Goresnap the Bilious"). */
  epithetChance: 0.4,
} as const;

export const MONSTER_NAMES = {
  prefixes: [
    'Gore', 'Bone', 'Blood', 'Rot', 'Grim', 'Ash', 'Mud', 'Snot', 'Pus', 'Wart',
    'Fang', 'Skull', 'Dread', 'Doom', 'Bile', 'Rust', 'Foul', 'Murk', 'Gloom', 'Shade',
    'Storm', 'Frost', 'Ember', 'Cinder', 'Soot', 'Grave', 'Tomb', 'Crypt', 'Worm', 'Maggot',
    'Spite', 'Scorn', 'Wrath', 'Gash', 'Scar', 'Stitch', 'Splinter', 'Shard', 'Flint', 'Iron',
    'Copper', 'Lead', 'Tar', 'Grease', 'Slop', 'Gristle', 'Marrow', 'Knuckle', 'Gnash', 'Chew',
    'Drool', 'Stink', 'Reek', 'Musk', 'Damp', 'Mold', 'Hex', 'Curse', 'Void', 'Night',
    'Dusk', 'Pale', 'Sallow', 'Craven', 'Bleak', 'Sour', 'Grudge', 'Spleen', 'Gut', 'Thorn',
    'Briar', 'Nettle', 'Fester', 'Blister', 'Scab',
  ],
  suffixes: [
    'fang', 'maw', 'claw', 'snap', 'belly', 'howl', 'shriek', 'gnaw', 'bite', 'chew',
    'spit', 'drool', 'wart', 'boil', 'stump', 'shank', 'gash', 'rend', 'rip', 'tear',
    'flay', 'husk', 'hide', 'pelt', 'snout', 'gob', 'jowl', 'skull', 'spine', 'rib',
    'knuckle', 'fist', 'grip', 'choke', 'throttle', 'wring', 'stomp', 'tread', 'crush', 'grind',
    'mangle', 'wrack', 'wreck', 'crack', 'snarl', 'growl', 'hiss', 'wheeze', 'cough', 'hack',
    'retch', 'gurgle', 'slobber', 'squelch', 'ooze', 'seep', 'leak', 'drip', 'crawl', 'scuttle',
    'skitter', 'lurk', 'loom', 'stalk', 'creep', 'shamble', 'trudge', 'slog', 'wallow', 'burrow',
  ],
  epithets: [
    'the Unstill', 'the Bilious', 'the Twice-Boiled', 'the Unwashed', 'of the Red Mist',
    'the Patient', 'the Impatient', 'the Tax Collector', 'the Bureaucrat', 'Thrice-Banished',
    'the Widowmaker', 'the Damp', 'the Moist', 'of the Shallow Grave', 'the Punctual',
    'the Overfed', 'the Underfed', 'Who Chews', 'the Whimperer', 'the Bellower',
    'of Nine Stomachs', 'the Left-Handed', 'the Unlicensed', 'the Auditor', 'the Landlord',
    'the Debt-Keeper', 'of the Long Tuesday', 'the Almost-Dead', 'the Twice-Dead', 'the Polite',
    'the Uninvited', 'the Recently Promoted', 'the Unsalted', 'of the Wrong Cave', 'the Borrower',
    'the Gnawer of Roots', 'the Back-Biter', 'the Toe-Taker', 'the Candle-Eater', 'the Sleepless',
    'the Half-Remembered', 'the Regrettable', 'of the Sixth Ditch', 'the Loud', 'the Quiet',
    'the Third-Born', 'the Un-Third-Born', 'the Splendid', 'the Adequate', 'the Extremely Cross',
    'Who Waits Behind Doors', 'the Well-Rested', 'the Once-Bitten', 'the Under-Baked',
  ],
  /** Per-faction pool overrides (absent → defaults). A faction with its own
   *  tongue is one entry here — e.g. depthkin all-hiss suffixes. */
  byFaction: {
    // The Caulborn speak in wet anatomy: names that sound like something a
    // surgeon would rather not have found.
    caulborn: {
      prefixes: ['Vor', 'Chryss', 'Amn', 'Umbil', 'Sinew', 'Ichor', 'Pale', 'Marrow', 'Vein', 'Chit'],
      suffixes: ['ax', 'ule', 'ion', 'ith', 'urge', 'ome', 'ist', 'od', 'yx', 'ara'],
      epithets: [
        'the Firstgrown', 'the Still-Wet', 'of the Inner Skin', 'the Unborn Twice',
        'the Quiet Pulse', 'Who Grew Wrong', 'the Graft', 'of the Black Amnion',
        'the Patient Meat', 'the Latterborn', 'Who Remembers Hands', 'the Sutured',
      ],
    },
    // The Sarcophate's elites wake with their throne names intact — dry
    // dynastic syllables and titles straight off the tomb registers.
    sarcophate: {
      prefixes: ['Nefer', 'Seth', 'Ankh', 'Kham', 'Osor', 'Amen', 'Ra', 'Merit', 'Sokh', 'Udja'],
      suffixes: ['kha', 'amun', 'esir', 'uret', 'neb', 'hotem', 'seth', 'aris', 'hor', 'min'],
      epithets: [
        'the Unentombed', 'of the Sealed Vault', 'Twice-Wrapped', 'the Sun-Denied',
        'the Gilded', 'Dust-Crowned', 'Keeper of Jars', 'the Provisioned',
        'of the Older Dynasty', 'Who Kept the Lid', 'the Well-Preserved', 'Lord of the Fourth Hall',
      ],
    },
    // The Coilborn speak in wet sibilants — river-hiss syllables, titles
    // measured in coils and tides.
    coilborn: {
      prefixes: ['Ssa', 'Zsir', 'Hess', 'Viss', 'Seth', 'Ophi', 'Nagh', 'Szol', 'Yss', 'Thress'],
      suffixes: ['vezh', 'ath', 'ala', 'arion', 'liss', 'issa', 'essa', 'vane', 'irel', 'ek'],
      epithets: [
        'the Slack-Tide', 'of the Seventh Coil', 'Brine-Tongued', 'the Slow Squeeze',
        'Who Swallows the Ford', 'Fang-Tithed', 'the Patient Current', 'the Molt-Crowned',
        'of the Drowned Root', 'Who Sings the Shallows', 'the Unblinking Below', 'of the Old Meander',
      ],
    },
  } as Record<string, { prefixes?: string[]; suffixes?: string[]; epithets?: string[] }>,
};

/** Weld a distinct monster name: compound (+ epithet at the config chance).
 *  `rand` is any 0..1 source — spawn paths pass the global RNG, seeded paths
 *  their own, so determinism follows the caller. */
export function rollMonsterName(rand: () => number, faction?: string): string {
  const pools = (faction && MONSTER_NAMES.byFaction[faction]) || {};
  const pick = (arr: string[]): string => arr[Math.floor(rand() * arr.length)] ?? arr[0];
  const prefixes = pools.prefixes?.length ? pools.prefixes : MONSTER_NAMES.prefixes;
  const suffixes = pools.suffixes?.length ? pools.suffixes : MONSTER_NAMES.suffixes;
  const epithets = pools.epithets?.length ? pools.epithets : MONSTER_NAMES.epithets;
  const compound = `${pick(prefixes)}${pick(suffixes)}`;
  return rand() < MONSTER_NAME_CFG.epithetChance ? `${compound} ${pick(epithets)}` : compound;
}
