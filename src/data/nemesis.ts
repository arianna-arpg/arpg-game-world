// ---------------------------------------------------------------------------
// NEMESIS DATA — the vocabulary of the world's memory, as data.
//
// Everything a remembered foe can BE lives here: the promotion ladder (what a
// rank does to its bearer), the naming vocabulary (a nemesis is minted a name
// the moment the world decides to remember it), the deed marks it can carry,
// and the grudge tiers a whole faction climbs as a NAME keeps killing its
// kind. The engine consumes these tables through meta/nemesis.ts — adding a
// rank, a tier, an epithet, or a faction-flavored name pool is one entry.
// ---------------------------------------------------------------------------

/** One rung of the promotion ladder (index = NemesisRecord.rank). A nemesis
 *  climbs by slaying the name's bearers and by surviving them. */
export interface NemesisRankDef {
  /** Title woven into the display name ("Gorfang the Wretched, Bane of…"). */
  title: string;
  /** Stat swell (sheet 'more' mods) — the promotion made flesh. */
  lifeMore: number;
  damageMore: number;
  /** Visual growth (actor radius multiplier) — reads at a glance. */
  sizeMult: number;
  /** Ring/label tint in the renderer. */
  tint: string;
  /** Guaranteed gem drops when it TRULY dies at this rank (the bounty). */
  gemDrops: number;
}

export const NEMESIS_RANKS: NemesisRankDef[] = [
  { title: 'the Marked',    lifeMore: 0.25, damageMore: 0.10, sizeMult: 1.10, tint: '#d0b070', gemDrops: 1 },
  { title: 'the Risen',     lifeMore: 0.60, damageMore: 0.22, sizeMult: 1.18, tint: '#e0a050', gemDrops: 1 },
  { title: 'the Dreaded',   lifeMore: 1.10, damageMore: 0.38, sizeMult: 1.28, tint: '#e07840', gemDrops: 2 },
  { title: 'the Tyrant',    lifeMore: 1.80, damageMore: 0.55, sizeMult: 1.38, tint: '#e05050', gemDrops: 2 },
  { title: 'the Deathless', lifeMore: 2.80, damageMore: 0.75, sizeMult: 1.50, tint: '#c050e0', gemDrops: 3 },
];

/** Name halves. `byFaction` overrides let a faction speak its own tongue —
 *  absent factions fall to the default pools, so new factions cost nothing. */
export const NEMESIS_NAMES = {
  first: [
    'Gorfang', 'Skarn', 'Vrutha', 'Molgur', 'Ashrek', 'Thassa', 'Krev', 'Ulmog',
    'Dreth', 'Harrow', 'Sczara', 'Bulgo', 'Ferrik', 'Onda', 'Mawgrim', 'Yezz',
  ],
  epithets: [
    'the Wretched', 'Iron-Tooth', 'the Whisper', 'Red-Hand', 'the Patient',
    'Bone-Counter', 'the Unblinking', 'Ash-Eater', 'the Lantern', 'Grave-Polite',
    'the Stitched', 'Half-Smile', 'the Debtor', 'Winter-Born', 'the Locust',
  ],
  byFaction: {
    // The Night Court remembers its own in the old courtly tongue — half a
    // saint's calendar, half a wine list. First faction to speak for itself;
    // every other kin still falls to the default pools at zero cost.
    nightkin: {
      first: [
        'Veszara', 'Karmilla', 'Ostrov', 'Bathoria', 'Vlasco', 'Serezha',
        'Malvolia', 'Draguta', 'Corvin', 'Lucziya', 'Stryga', 'Amaranthe',
      ],
      epithets: [
        'the Unbled', 'of the Long Table', 'the Last Course', 'Moth-Kept',
        'the Velvet', 'of the Ninth Toast', 'Candle-Eyed', 'the Thirst',
        'Grave-Sweet', 'the Uninvited', 'Dawn-Debtor', 'the Decanted',
      ],
    },
    // The Carven Court names itself out of the almanac and the furrow —
    // hedge-names, feast-names, whatever the field overheard. Epithets read
    // like weather entries in a farmer's year that went wrong.
    carven: {
      first: [
        'Barleysere', 'Mawkin', 'Tatterhood', 'Gourdred', 'Hobfellow',
        'Rattlewick', 'Summergone', 'Chaffrey', 'Hollowvine', 'Stubblejack',
        'Merrowmast', 'Winnowill',
      ],
      epithets: [
        'the Unharvested', 'of the Last Furrow', 'Straw-Ribbed', 'the Grinning',
        'Field-Sworn', 'the Carved', 'Wick-Hearted', 'of the Long Stubble',
        'Frost-Bitten', 'the Scything', 'Crow-Fed', 'the Vined',
      ],
    },
    // The Sand Sarcophate remembers itself in dynastic regnal style — throne
    // names and funerary titles, every epithet an entry from the tomb ledger.
    sarcophate: {
      first: [
        'Neferkha', 'Sethamun', 'Ankhesir', 'Khamuret', 'Osorneb', 'Tiyanet',
        'Rahotem', 'Meritseth', 'Sokharis', 'Udjahor', 'Nakhtmin', 'Baketra',
      ],
      epithets: [
        'the Unentombed', 'of the Sealed Vault', 'Twice-Wrapped', 'the Sun-Denied',
        'Keeper of the Fourth Jar', 'the Gilded', 'of the Long Interment', 'Dust-Crowned',
        'the Provisioned', 'Who Kept the Lid', 'the Embalmer\'s Regret', 'of the Older Dynasty',
      ],
    },
    // The Coilborn hiss their great ones in long wet sibilants — names like
    // water moving under roots, titled by coil, tide and venom.
    coilborn: {
      first: [
        'Ssavezh', 'Zsirath', 'Hessala', 'Vissarion', 'Sethliss', 'Ophissa',
        'Naghessa', 'Szolvane', 'Yssirel', 'Cazsissa', 'Thressek', 'Ilssavane',
      ],
      epithets: [
        'the Slack-Tide', 'of the Seventh Coil', 'Brine-Tongued', 'the Unblinking Below',
        'Who Swallows the Ford', 'the Slow Squeeze', 'of the Drowned Root', 'Fang-Tithed',
        'the Patient Current', 'Who Sings the Shallows', 'the Molt-Crowned', 'of the Old Meander',
      ],
    },
    // THE INFERNAL TONGUE — the Legion names its grudges in rank and debt
    // (a nemesis in hell is a career). The War Below's eight host factions
    // alias these pools at boot (one tongue, nine banners).
    demon: {
      first: [
        'Baalgoth', 'Malzebul', 'Gorakh', 'Azhiel', 'Krevozar', 'Vexuk',
        'Zarathor', 'Thalax', 'Urgoveth', 'Skarnozul', 'Mordraal', 'Ozgorath',
      ],
      epithets: [
        'of the Ninth Rank', 'the Twice-Damned', 'Pit-Tithed', 'the Unransomed',
        'Who Broke the Gate', 'the Flame-Sworn', 'of the Long March', 'the Lash-Bearer',
        'Who Counts the Fallen', 'the Throne-Hungry', 'of the Burning Column', 'the Oathless',
      ],
    },
  } as Record<string, { first?: string[]; epithets?: string[] }>,
};

/** Deed marks a nemesis can carry (its history, worn as titles). The `{name}`
 *  token is the saga's display name at the time of the deed. */
export const NEMESIS_MARKS: Record<string, string> = {
  slayer: 'Slayer of {name}',
  escaped: 'Escaped {name}',
  cheated_death: 'Cheated Death',
  felled_hireling: 'Felled {name}’s hireling',
};

/** FACTION GRUDGE tiers — what a whole people feels about a NAME, climbed by
 *  that name's lifetime kills against them. Ascending by `kills`; the highest
 *  met tier applies. Effects: a flat 'more damage' edge on that faction's
 *  fielded members against the run (small, legible), a bonus to how eagerly
 *  the faction's nemeses MANIFEST, and the entry line whispered on zone load. */
export interface GrudgeTierDef {
  kills: number;
  label: string;
  damageMore: number;
  manifestBonus: number;
  entryLine: string;
}

export const GRUDGE_TIERS: GrudgeTierDef[] = [
  { kills: 25,  label: 'known',  damageMore: 0.04, manifestBonus: 0.10,
    entryLine: 'The {faction} here know the name {name}.' },
  { kills: 80,  label: 'hated',  damageMore: 0.08, manifestBonus: 0.22,
    entryLine: 'The {faction} hate the name {name}.' },
  { kills: 200, label: 'hunted', damageMore: 0.12, manifestBonus: 0.38,
    entryLine: 'The {faction} tell their young that {name} is coming.' },
];
