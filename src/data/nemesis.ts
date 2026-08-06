// ---------------------------------------------------------------------------
// NEMESIS DATA — the vocabulary of the world's memory, as data.
//
// Everything a remembered foe can BE lives here: the promotion ladder (what a
// rank does to its bearer), the naming vocabulary (a nemesis is minted a name
// the moment the world decides to remember it), the deed marks it can carry,
// and the grudge tiers a whole faction climbs as a NAME keeps killing its
// kind. The engine consumes these tables through meta/nemesis.ts — adding a
// rank, a tier, an epithet, or a faction-flavored name pool is one entry.
//
// THE KIN TONGUES: a tongue is ONE authored voice; the byFaction map seats
// it, often on several banners at once (the monster-name mill in
// data/monsterNames.ts seats the SAME kin map, so a faction's elites and its
// grudges speak alike). Re-pointing a banner is a one-line edit in the map;
// the tongue census in data/validate.ts warns whenever a fielded faction
// falls back to the shared default pools.
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

/** One tongue for the saga: either pool left absent falls to the defaults. */
type SagaPools = { first?: string[]; epithets?: string[] };

// --- THE TONGUES ------------------------------------------------------------

// The Night Court remembers its own in the old courtly tongue — half a
// saint's calendar, half a wine list.
const NIGHTKIN_KIN: SagaPools = {
  first: [
    'Veszara', 'Karmilla', 'Ostrov', 'Bathoria', 'Vlasco', 'Serezha',
    'Malvolia', 'Draguta', 'Corvin', 'Lucziya', 'Stryga', 'Amaranthe',
  ],
  epithets: [
    'the Unbled', 'of the Long Table', 'the Last Course', 'Moth-Kept',
    'the Velvet', 'of the Ninth Toast', 'Candle-Eyed', 'the Thirst',
    'Grave-Sweet', 'the Uninvited', 'Dawn-Debtor', 'the Decanted',
  ],
};

// The Carven Court names itself out of the almanac and the furrow —
// hedge-names, feast-names, whatever the field overheard. The chattel of
// the sacked acres low in the same farm-gothic voice.
const CARVEN_KIN: SagaPools = {
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
};

// The Sand Sarcophate remembers itself in dynastic regnal style — throne
// names and funerary titles, every epithet an entry from the tomb ledger.
const SARCOPHATE_KIN: SagaPools = {
  first: [
    'Neferkha', 'Sethamun', 'Ankhesir', 'Khamuret', 'Osorneb', 'Tiyanet',
    'Rahotem', 'Meritseth', 'Sokharis', 'Udjahor', 'Nakhtmin', 'Baketra',
  ],
  epithets: [
    'the Unentombed', 'of the Sealed Vault', 'Twice-Wrapped', 'the Sun-Denied',
    'Keeper of the Fourth Jar', 'the Gilded', 'of the Long Interment', 'Dust-Crowned',
    'the Provisioned', 'Who Kept the Lid', 'the Embalmer\'s Regret', 'of the Older Dynasty',
  ],
};

// The Coilborn hiss their great ones in long wet sibilants — names like
// water moving under roots, titled by coil, tide and venom.
const COILBORN_KIN: SagaPools = {
  first: [
    'Ssavezh', 'Zsirath', 'Hessala', 'Vissarion', 'Sethliss', 'Ophissa',
    'Naghessa', 'Szolvane', 'Yssirel', 'Cazsissa', 'Thressek', 'Ilssavane',
  ],
  epithets: [
    'the Slack-Tide', 'of the Seventh Coil', 'Brine-Tongued', 'the Unblinking Below',
    'Who Swallows the Ford', 'the Slow Squeeze', 'of the Drowned Root', 'Fang-Tithed',
    'the Patient Current', 'Who Sings the Shallows', 'the Molt-Crowned', 'of the Old Meander',
  ],
};

// THE INFERNAL TONGUE — the Legion names its grudges in rank and debt
// (a nemesis in hell is a career). The War Below's eight host factions
// alias these pools at boot (one tongue, nine banners).
const INFERNAL_KIN: SagaPools = {
  first: [
    'Baalgoth', 'Malzebul', 'Gorakh', 'Azhiel', 'Krevozar', 'Vexuk',
    'Zarathor', 'Thalax', 'Urgoveth', 'Skarnozul', 'Mordraal', 'Ozgorath',
  ],
  epithets: [
    'of the Ninth Rank', 'the Twice-Damned', 'Pit-Tithed', 'the Unransomed',
    'Who Broke the Gate', 'the Flame-Sworn', 'of the Long March', 'the Lash-Bearer',
    'Who Counts the Fallen', 'the Throne-Hungry', 'of the Burning Column', 'the Oathless',
  ],
};

// The Unrusted speak in maker's-marks and duty-rolls — a name here is a
// catalogue entry that refused to be struck off. The hollowborn panoply
// answers to the same inventory.
const UNRUSTED_KIN: SagaPools = {
  first: [
    'Gnomon', 'Ferrule', 'Tessella', 'Mandrel', 'Pinion', 'Cotterin',
    'Verdigran', 'Lathion', 'Burnisa', 'Templum', 'Calliprax', 'Astrolan',
  ],
  epithets: [
    'the Still-Bright', 'of the Ninth Winding', 'Rust-Refused', 'the Unoiled',
    'Keeper of the Long Inventory', 'the Overwound', 'of the Sealed Foundry', 'Patina-Crowned',
    'the Load-Bearing', 'Who Kept the Rounds', 'the Uncounted Cog', 'of the Old Tolerances',
  ],
};

// The Gilded Compact names its terrors the way it names its accounts —
// counting-house christenings, epithets straight off the ledger's edge.
const COMPACT_KIN: SagaPools = {
  first: [
    'Aurelio', 'Salvestra', 'Brocard', 'Vindemia', 'Ottaline', 'Fiorenz',
    'Cambial', 'Solidor', 'Argentel', 'Ducatessa', 'Perpetua', 'Florin',
  ],
  epithets: [
    'the Solvent', 'of the Fourth Ledger', 'Debt-Remembered', 'the Underwriter',
    'Gold-Sworn', 'Who Holds the Note', 'the Compounding', 'of the Long Margin',
    'Tariff-Tongued', 'the Escrowed', 'Half-Interest', 'the Foreclosed',
  ],
};

// The Caulborn's grudges are remembered in wet anatomy — the same slab
// voice the elite mill speaks, worn by all four vivisect banners.
const CAULBORN_KIN: SagaPools = {
  first: [
    'Voraxis', 'Chryssara', 'Amnithule', 'Umbilod', 'Sinewyx', 'Ichorine',
    'Palegraft', 'Marrowist', 'Veinurge', 'Chitome', 'Vorulith', 'Amnara',
  ],
  epithets: [
    'the Firstgrown', 'the Still-Wet', 'of the Inner Skin', 'the Unborn Twice',
    'the Quiet Pulse', 'Who Grew Wrong', 'the Graft', 'of the Black Amnion',
    'the Patient Meat', 'the Latterborn', 'Who Remembers Hands', 'the Sutured',
  ],
};

// The warband remembers its terrors by scrap-name and rank bitten for.
const GOBLIN_KIN: SagaPools = {
  first: [
    'Ghorzag', 'Snagwort', 'Grubmok', 'Zoggrash', 'Skabnark', 'Wugbash',
    'Kriglug', 'Bragtusk', 'Narksnik', 'Mokdreg', 'Zargob', 'Ghashwug',
  ],
  epithets: [
    'the Toll-Taker', 'Wolf-Fed', 'of the Burned Bridge', 'the Loot-Heavy',
    'Three-Teeth', 'Whip-Promoted', 'of the Powder Cart', 'the Ear-Counter',
    'Half-Pay', 'Who Rides Anything', 'the Boss-Biter', 'Twice-Demoted',
  ],
};

// The Risen Host's grudges are parish records kept too long — barrow,
// shroud and bell.
const GRAVE_KIN: SagaPools = {
  first: [
    'Ossric', 'Mortewald', 'Knellgard', 'Palliver', 'Dirgemund', 'Biernhard',
    'Shrouda', 'Wightmoor', 'Gravesend', 'Mournevere', 'Cryptillia', 'Sextimus',
  ],
  epithets: [
    'the Unburied', 'Twice-Interred', 'of the Broken Bell', 'the Shroud-Torn',
    'Coffin-Cramped', 'Who Kept the Vigil', 'of the Wrong Grave', 'the Pallid Verger',
    'Six-Feet-Short', 'the Late', 'Bell-Tongued', 'of the Shallow Parish',
  ],
};

// THE VOID TONGUE — the eldritch orders and what leaks in through them:
// syllables with the wrong number of corners.
const VOID_KIN: SagaPools = {
  first: [
    'Vhalqireth', 'Xulnaal', 'Ythkoth', 'Zsavereth', 'Ngaixul', 'Ulthessh',
    'Qirzhul', 'Osshvekar', 'Ihlmaroth', 'Vekyth', 'Xisserrat', 'Ulthanai',
  ],
  epithets: [
    'the Unfolded', 'of the Eleventh Angle', 'Never-Was', 'the Convergent',
    'Who Is Also Elsewhere', 'the Null Choir', 'of the Outer Meridian', 'the Unwitnessed',
    'Thrice-Impossible', 'the Hollow Equation', 'Who Dreams the Door', 'of No Fixed Shape',
  ],
};

// The choir's registry — rank-names in -iel and -on, grudges read off
// the wheel and the law.
const CHOIR_KIN: SagaPools = {
  first: [
    'Aurathiel', 'Zadkanon', 'Ophaniel', 'Cassumel', 'Hadriel', 'Sandaluel',
    'Rammiah', 'Uzzion', 'Camaeth', 'Seraphon', 'Aurieth', 'Zadkuel',
  ],
  epithets: [
    'of the Wheel', 'the Law Intoned', 'Thrice-Crowned in Light', 'of the Ninth Choir',
    'Who Weighs the Heart', 'the Trumpet-Sworn', 'of the Burning Court', 'the Aureoled',
    'Who Guards the Gate', 'the Psalm Unending', 'of the First Dawn', 'the Unblinking Above',
  ],
};

// The Crusade's martial liturgy — mortal zealots, sainthood pursued at
// lance-point.
const ZEAL_KIN: SagaPools = {
  first: [
    'Aldemar', 'Cressada', 'Bohemund', 'Ysolde', 'Tancrede', 'Gaufrid',
    'Hierona', 'Baldric', 'Clermonde', 'Amalric', 'Sybilla', 'Odorick',
  ],
  epithets: [
    'the Unbowed', 'Oath-Scarred', 'of the Ninth Vigil', 'the Relic-Bearer',
    'Twice-Shriven', 'Who Burned the Ford', 'the Banner-Wed', 'of the Long Pilgrimage',
    'the Flagellant', 'Creed-Blind', 'the Indulgenced', 'Saint-in-Waiting',
  ],
};

// THE BYNAME TONGUE — mortal road-and-croft monikers, shared by the
// bandit companies and the freehold folk they rob.
const BYNAME_KIN: SagaPools = {
  first: [
    'Gallows Jack', 'Copper Moll', 'Hedgerow Tam', 'Turnpike Bess', 'Mutton Ned', 'Powder Meg',
    'Ditchwater Sal', 'Cudgel Rab', 'Tally Wat', 'Halfpenny Kit', 'Crooked Davey', 'Lantern Bet',
  ],
  epithets: [
    'the Twice-Hanged', 'of the Sunken Road', 'Toll-Free', 'Who Robbed the Reeve',
    'the Hedge-Lawyer', 'Short-Weight', 'of the Crooked Mile', 'the Pardoned',
    'the Unpardoned', 'Ale-Sworn', 'the Poacher Royal', 'of Nothing Lane',
  ],
};

// THE HEX TONGUE — coven crones and the goetic orders: names knotted
// widdershins, grudges that read like village-trial accusations.
const HEX_KIN: SagaPools = {
  first: [
    'Grizzelmara', 'Hexeba', 'Mandragorn', 'Widdrenne', 'Tallowmeg', 'Henbanna',
    'Birchmara', 'Toadflax', 'Newtilda', 'Cowlene', 'Sootmarn', 'Nightshade Nan',
  ],
  epithets: [
    'the Thrice-Sworn', 'of the Bent Path', 'Moon-Contrary', 'the Curdler',
    'Who Signs in Soot', 'the Nine-Knotted', 'of the Hollow Oak', 'the Misfortune',
    'Salt-Shy', 'Widdershins-Wed', 'of the Sunken Coven', 'the Goetic',
  ],
};

// THE BESTIAL TONGUE — the hunt's ledger: names a hunter would carve on
// a lodge wall, worn by everything that stalks.
const BESTIAL_KIN: SagaPools = {
  first: [
    'Old Rakejaw', 'Threetoe', 'Lamefang', 'Redmuzzle', 'Broketusk', 'Sowbane',
    'Hollowflank', 'Manytines', 'Blackhackle', 'Longwinter', 'Dustmane', 'Gorehoof',
  ],
  epithets: [
    'the Man-Tester', 'Winter-Lean', 'of the Red Season', 'the Herd-Breaker',
    'Who Walks at Dusk', 'the Long-Hungered', 'Scar-Muzzled', 'of the High Kill',
    'the Snare-Wise', 'Trap-Scarred', 'Who Outran the Fire', 'Last of the Litter',
  ],
};

// THE WINTER-THEGN TONGUE — the jotun halls and the rimebound court in
// one old cold language.
const WINTERTHEGN_KIN: SagaPools = {
  first: [
    'Hrimthur', 'Jokulvald', 'Fimbulgrim', 'Thrymhild', 'Vindulf', 'Isarnbjorn',
    'Skjaldmund', 'Hailrik', 'Bergstein', 'Drangmar', 'Frosthild', 'Jokulbrand',
  ],
  epithets: [
    'the Winter-Sworn', 'of the Elder Snow', 'Avalanche-Voiced', 'the Unthawed',
    'of the Long Dark', 'Who Ate the Sun', 'the Glacier-Patient', 'Frost-Bearded',
    'of the Nine Winters', 'the Cairn-Builder', 'Who Wrestled the Sea', 'Hall-Burner',
  ],
};

// THE CINDER TONGUE — the furnace congregation: names struck at the
// anvil, grudges from the firing ledger.
const CINDER_KIN: SagaPools = {
  first: [
    'Slagvar', 'Charnessa', 'Kilnrick', 'Pyrestra', 'Smeltibor', 'Bellowsmar',
    'Crucia', 'Tinderrak', 'Ashferrin', 'Scorion', 'Igniva', 'Fluewell',
  ],
  epithets: [
    'the Half-Quenched', 'of the First Firing', 'Bellows-Born', 'the Twice-Fired',
    'Who Kept the Coals', 'of the Cold Forge', 'the Cinder-Tithed', 'Slag-Crowned',
    'the Unquenched', 'of the Ninth Furnace', 'Ash-Salted', 'the Last Ember',
  ],
};

// THE WINDS TONGUE — every air that owns a name: gale djinn, the
// zephyrid rookeries, the sirocco's mirage courts.
const WINDS_KIN: SagaPools = {
  first: [
    'Sirroquell', 'Khamseen', 'Zephyrion', 'Mistralle', 'Boraviel', 'Aeolssa',
    'Simoomad', 'Harmattine', 'Squallia', 'Gustavane', 'Derechelle', 'Scirocca',
  ],
  epithets: [
    'the Four-Quartered', 'of the High Calm', 'Who Unroofed the Town', 'the Contrary Wind',
    'Sail-Sworn', 'the Doldrum', 'of the Glass Desert', 'the Weathervane',
    'Thrice-Becalmed', 'Who Carries Voices', 'the Long Sigh', 'of the Upper Air',
  ],
};

// THE VERDANT TONGUE — the green courts: patient names, verdicts
// measured in growth rings.
const VERDANT_KIN: SagaPools = {
  first: [
    'Vinewreathe', 'Thornessa', 'Boughwald', 'Loamella', 'Burlgrim', 'Mistletane',
    'Frondessa', 'Pithwyn', 'Gallmara', 'Mossverin', 'Seedrick', 'Bractwen',
  ],
  epithets: [
    'the Deep-Rooted', 'of the Old Growth', 'Sap-Sworn', 'the Pruned',
    'Who Outgrew the Wall', 'the Evergreen', 'of the Strangler Court', 'Ring-Counted',
    'the Deciduous', 'Who Blooms at Funerals', 'the Slow Verdict', 'of the Hundred Springs',
  ],
};

// THE BLIGHT TONGUE — spore and pestilence in one damp voice: myconid
// sovereignties and the plague's bell-led processions.
const BLIGHT_KIN: SagaPools = {
  first: [
    'Murrainne', 'Poxwell', 'Sporathe', 'Cankerbeth', 'Ergotha', 'Mildewain',
    'Bloatrice', 'Smutterly', 'Whealfred', 'Gillifer', 'Pockmara', 'Frothgar',
  ],
  epithets: [
    'the Quarantine-Breaker', 'of the Third Ring', 'the Fruiting', 'Who Coughs Twice',
    'the Unlanced', 'of the Damp Parish', 'the Spore-Tithed', 'Miasma-Sweet',
    'the Incurable', 'of the Closed Well', 'the Blooming Sickness', 'Thrice-Quarantined',
  ],
};

// THE WARREN TONGUE — the gutter kingdoms: rat piper-courts and the
// magpie snatch-gangs.
const WARREN_KIN: SagaPools = {
  first: [
    'Gratchen', 'Filchibald', 'Scritchen', 'Middenmas', 'Sumpkin', 'Tatterly',
    'Pilferene', 'Cellarine', 'Squeakwell', 'Whiskermund', 'Snatchery', 'Hoardwick',
  ],
  epithets: [
    'the Under-Stair', 'of the Ninth Cellar', 'Crumb-Sworn', 'the Twice-Trapped',
    'Who Owns the Walls', 'the Shiny-Eyed', 'of the Drowned Sewer', 'the Unpoisoned',
    'Tail-Taxed', 'Who Hears the Cat', 'the Uncatchable', 'King Under the Floor',
  ],
};

// THE HIVE TONGUE — chitin and formic castes click one language: names
// like stridulation, grudges counted in instars.
const HIVE_KIN: SagaPools = {
  first: [
    'Krikitix', 'Zikkazz', 'Tchatarit', 'Vritilik', 'Chirrazik', 'Thrixitt',
    'Katakazz', 'Ozzikirr', 'Ithikk', 'Skitterix', 'Kriktcha', 'Zikarit',
  ],
  epithets: [
    'of the Third Instar', 'the Queen\'s Hundredth', 'Fifth-Molted', 'the Replete',
    'Who Digs the Sixth Gallery', 'the Swarm-Remembered', 'of the Royal Cell', 'the Frass-Builder',
    'Wax-Sealed', 'the Winged Once', 'of the Deep Comb', 'Who Counts by Touch',
  ],
};

// THE FATHOM TONGUE — the drowned courts, the hadal depthkin and the
// riverbound shades: one pressure-flattened voice.
const FATHOM_KIN: SagaPools = {
  first: [
    'Fathomere', 'Brinemoor', 'Wrackline', 'Trenchard', 'Siltessa', 'Ballastine',
    'Moorlock', 'Draughtwen', 'Undertowe', 'Keelvara', 'Hullwyn', 'Lornessa',
  ],
  epithets: [
    'the Thrice-Drowned', 'of the Sounding Line', 'Keel-Hauled', 'the Undertow',
    'Who Signs No Manifest', 'the Pressure-Blessed', 'of the Anchor Court', 'Salt-Sworn',
    'the Last Bubble', 'Who Waits Under Keels', 'of the Ninth Fathom', 'the Unsalvaged',
  ],
};

// THE TELLURIC TONGUE — the land's own myth-voice: stone elementals, the
// primeval world-titans, the old wyrms in the strata.
const TELLURIC_KIN: SagaPools = {
  first: [
    'Basaltus', 'Gneissa', 'Marlstone', 'Scarpath', 'Stratavar', 'Lodemara',
    'Torquar', 'Cragvenna', 'Quartzimund', 'Knapvern', 'Faultessa', 'Quakemar',
  ],
  epithets: [
    'the Orebound', 'of the First Bedrock', 'Slow as Mountains', 'the Unweathered',
    'Who Remembers the Flood', 'the Vein-Father', 'of the Deep Pressure', 'Chime-Voiced',
    'the Subsiding', 'Older Than the River', 'the Half-Eroded', 'of the Ninth Stratum',
  ],
};

// THE LANTERN TONGUE — the lit courts: glimmerkin lamp-gardens and the
// wax court's votive processions.
const LANTERN_KIN: SagaPools = {
  first: [
    'Taperine', 'Wickham', 'Sconcetta', 'Lumenna', 'Prismond', 'Chandelle',
    'Glimmermund', 'Votiva', 'Beamwell', 'Halowyn', 'Shimmerlyn', 'Snuffield',
  ],
  epithets: [
    'the Well-Trimmed', 'of the Thousand Candles', 'Moth-Beloved', 'the Unsnuffed',
    'Who Lights the Last Lamp', 'of the Bright Court', 'Half-Melted', 'the Vigil Flame',
    'Who Reads by Their Own Light', 'the Waxen', 'of the Glass Gallery', 'the Chandled',
  ],
};

// THE DUSK TONGUE — the House of Dusk's murmuring parliament and the
// gloamborn wick-keepers.
const DUSK_KIN: SagaPools = {
  first: [
    'Hushmond', 'Murmura', 'Gloamwick', 'Curfewell', 'Umbermoor', 'Owlhurst',
    'Dimity', 'Eavesmond', 'Whistlow', 'Duskellen', 'Mutewell', 'Stillbourne',
  ],
  epithets: [
    'the Soft-Spoken', 'of the House of Dusk', 'Curfew-Sworn', 'the Unlit',
    'Who Votes in Whispers', 'the Adjourned', 'of the Last Lamplight', 'Shutter-Eyed',
    'the Overheard', 'Who Closes the Day', 'the Tabled Motion', 'of the Quiet Quorum',
  ],
};

// THE FIRMAMENT TONGUE — the vesperkin sky-fauna and the starfall
// shards: names charted, not given.
const FIRMAMENT_KIN: SagaPools = {
  first: [
    'Zenithra', 'Nadirion', 'Syzygia', 'Aphelmar', 'Cometis', 'Novalis',
    'Wanessa', 'Orreria', 'Eclipsen', 'Meridienne', 'Perigrine', 'Occulta',
  ],
  epithets: [
    'the Retrograde', 'of the Outer Orbit', 'Thrice-Eclipsed', 'the Waning',
    'Who Charts the Fall', 'the Perihelion', 'of the Silent Sphere', 'Star-Counted',
    'the Long Ellipse', 'Who Missed the Sky', 'the Occulted', 'of the Tenth House',
  ],
};

/** Name halves. `byFaction` overrides let a faction speak its own tongue —
 *  absent factions fall to the default pools, so new factions cost nothing.
 *  THE SEAT MAP mirrors data/monsterNames.ts: kin families share a tongue
 *  deliberately, and re-pointing a banner is a one-line edit here. */
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
    nightkin: NIGHTKIN_KIN,
    // The farm-gothic pair: the Carven Court and the livestock it broke.
    carven: CARVEN_KIN,
    chattel: CARVEN_KIN,
    sarcophate: SARCOPHATE_KIN,
    coilborn: COILBORN_KIN,
    demon: INFERNAL_KIN,
    // The inventory kin: the Unrusted rolls and the unworn panoply.
    unrusted: UNRUSTED_KIN,
    hollowborn: UNRUSTED_KIN,
    compact: COMPACT_KIN,
    // The vivisect kin — one slab, four banners.
    caulborn: CAULBORN_KIN,
    flesh: CAULBORN_KIN,
    amalgam: CAULBORN_KIN,
    marrowdrawn: CAULBORN_KIN,
    goblin: GOBLIN_KIN,
    undead: GRAVE_KIN,
    // Everything the outside leaks through: the orders, the rifts, the
    // doubles, the empty shells.
    eldritch: VOID_KIN,
    abyssal: VOID_KIN,
    breach: VOID_KIN,
    mirrorkin: VOID_KIN,
    vacant: VOID_KIN,
    seraphic: CHOIR_KIN,
    crusade: ZEAL_KIN,
    // Mortal folk, both sides of the hedge.
    bandit: BYNAME_KIN,
    freehold: BYNAME_KIN,
    coven: HEX_KIN,
    occult: HEX_KIN,
    // The hunt's ledger.
    beast: BESTIAL_KIN,
    wild: BESTIAL_KIN,
    predator: BESTIAL_KIN,
    gnoll: BESTIAL_KIN,
    beastkin: BESTIAL_KIN,
    jotun: WINTERTHEGN_KIN,
    rimebound: WINTERTHEGN_KIN,
    emberkin: CINDER_KIN,
    smoulder: CINDER_KIN,
    galekin: WINDS_KIN,
    zephyrid: WINDS_KIN,
    sirocco: WINDS_KIN,
    sylvan: VERDANT_KIN,
    bloomkin: VERDANT_KIN,
    junglekin: VERDANT_KIN,
    fungal: BLIGHT_KIN,
    plague: BLIGHT_KIN,
    vermin: WARREN_KIN,
    magpie: WARREN_KIN,
    chitin: HIVE_KIN,
    formic: HIVE_KIN,
    deep: FATHOM_KIN,
    depthkin: FATHOM_KIN,
    riverbound: FATHOM_KIN,
    elemental: TELLURIC_KIN,
    primeval: TELLURIC_KIN,
    wyrmkin: TELLURIC_KIN,
    glimmerkin: LANTERN_KIN,
    // The moonlit mere's fey speak the lit courts' tongue (data/merelake.ts).
    merefolk: LANTERN_KIN,
    wax: LANTERN_KIN,
    umbral: DUSK_KIN,
    gloamborn: DUSK_KIN,
    vesperkin: FIRMAMENT_KIN,
    starfall: FIRMAMENT_KIN,
  } as Record<string, SagaPools>,
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
