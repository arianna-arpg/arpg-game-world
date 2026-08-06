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
//
// THE KIN TONGUES: a tongue is ONE authored voice; the byFaction map seats
// it, often on several banners at once (kin families share a tongue the way
// the War Below's eight hosts share the Infernal one). Re-pointing a banner
// is a one-line edit in the map; the tongue census in data/validate.ts warns
// whenever a fielded faction falls back to the shared default jar.
// ---------------------------------------------------------------------------

import type { MonsterRarity } from '../engine/rarity';

export const MONSTER_NAME_CFG = {
  /** Tiers whose RANDOM pack-leader roll mints a distinct name (magic stays
   *  a plain "Magic X" — names are for foes worth remembering). */
  namedRarities: ['rare', 'champion', 'crowned'] as MonsterRarity[],
  /** Chance the compound gains an epithet ("Goresnap the Bilious"). */
  epithetChance: 0.4,
} as const;

/** One tongue: any pool left absent falls to the defaults per-array. */
type TonguePools = { prefixes?: string[]; suffixes?: string[]; epithets?: string[] };

// --- THE TONGUES ------------------------------------------------------------

// The Caulborn speak in wet anatomy: names that sound like something a
// surgeon would rather not have found. The vivisect kin — flesh's oozes,
// the Bonewright's amalgams, the marrow parasites — are named off the
// same slab.
const CAULBORN_TONGUE: TonguePools = {
  prefixes: ['Vor', 'Chryss', 'Amn', 'Umbil', 'Sinew', 'Ichor', 'Pale', 'Marrow', 'Vein', 'Chit'],
  suffixes: ['ax', 'ule', 'ion', 'ith', 'urge', 'ome', 'ist', 'od', 'yx', 'ara'],
  epithets: [
    'the Firstgrown', 'the Still-Wet', 'of the Inner Skin', 'the Unborn Twice',
    'the Quiet Pulse', 'Who Grew Wrong', 'the Graft', 'of the Black Amnion',
    'the Patient Meat', 'the Latterborn', 'Who Remembers Hands', 'the Sutured',
  ],
};

// The Sarcophate's elites wake with their throne names intact — dry
// dynastic syllables and titles straight off the tomb registers.
const SARCOPHATE_TONGUE: TonguePools = {
  prefixes: ['Nefer', 'Seth', 'Ankh', 'Kham', 'Osor', 'Amen', 'Ra', 'Merit', 'Sokh', 'Udja'],
  suffixes: ['kha', 'amun', 'esir', 'uret', 'neb', 'hotem', 'seth', 'aris', 'hor', 'min'],
  epithets: [
    'the Unentombed', 'of the Sealed Vault', 'Twice-Wrapped', 'the Sun-Denied',
    'the Gilded', 'Dust-Crowned', 'Keeper of Jars', 'the Provisioned',
    'of the Older Dynasty', 'Who Kept the Lid', 'the Well-Preserved', 'Lord of the Fourth Hall',
  ],
};

// The Coilborn speak in wet sibilants — river-hiss syllables, titles
// measured in coils and tides.
const COILBORN_TONGUE: TonguePools = {
  prefixes: ['Ssa', 'Zsir', 'Hess', 'Viss', 'Seth', 'Ophi', 'Nagh', 'Szol', 'Yss', 'Thress'],
  suffixes: ['vezh', 'ath', 'ala', 'arion', 'liss', 'issa', 'essa', 'vane', 'irel', 'ek'],
  epithets: [
    'the Slack-Tide', 'of the Seventh Coil', 'Brine-Tongued', 'the Slow Squeeze',
    'Who Swallows the Ford', 'Fang-Tithed', 'the Patient Current', 'the Molt-Crowned',
    'of the Drowned Root', 'Who Sings the Shallows', 'the Unblinking Below', 'of the Old Meander',
  ],
};

// THE INFERNAL TONGUE — the Legion's own, harsh-voweled and rank-obsessed
// (hell is a hierarchy before it is anything else). The War Below's eight
// host factions ALIAS these pools at boot (packages/defs/underworldWar.ts)
// — one tongue, nine banners; the lords conscript demons, they don't
// invent a language.
const INFERNAL_TONGUE: TonguePools = {
  prefixes: ['Baal', 'Mal', 'Gor', 'Azh', 'Krev', 'Vex', 'Zar', 'Thal', 'Urgo', 'Skar'],
  suffixes: ['goth', 'zebul', 'akh', 'ash', 'iel', 'ozar', 'uk', 'ath', 'or', 'ax'],
  epithets: [
    'of the Ninth Rank', 'the Twice-Damned', 'Pit-Tithed', 'the Unransomed',
    'Who Broke the Gate', 'the Flame-Sworn', 'of the Long March', 'the Lash-Bearer',
    'Who Counts the Fallen', 'the Throne-Hungry', 'of the Burning Column', 'the Oathless',
  ],
};

// The Night Court's elites keep their courtly names — half a saint's
// calendar, half a wine list (the voice the nemesis saga already speaks
// for them in data/nemesis.ts).
const NIGHTKIN_TONGUE: TonguePools = {
  prefixes: ['Vesz', 'Karm', 'Ostro', 'Batho', 'Vlas', 'Drag', 'Corv', 'Lucz', 'Stryg', 'Malvo'],
  suffixes: ['ara', 'illa', 'via', 'esca', 'uta', 'ov', 'ina', 'iya', 'anthe', 'oria'],
  epithets: [
    'the Unbled', 'of the Long Table', 'the Last Course', 'Moth-Kept',
    'the Velvet', 'of the Ninth Toast', 'Candle-Eyed', 'the Thirst',
    'Grave-Sweet', 'the Uninvited', 'Dawn-Debtor', 'the Decanted',
  ],
};

// The Carven Court names itself out of the almanac and the furrow —
// hedge-names, feast-names, whatever the field overheard. The chattel —
// the broken livestock of the sacked acres — low in the same farm-gothic
// voice, so they share the tongue.
const CARVEN_TONGUE: TonguePools = {
  prefixes: ['Barley', 'Mawk', 'Tatter', 'Gourd', 'Hob', 'Rattle', 'Chaff', 'Stubble', 'Winnow', 'Merrow'],
  suffixes: ['sere', 'kin', 'hood', 'wick', 'fellow', 'jack', 'mast', 'vine', 'rey', 'shock'],
  epithets: [
    'the Unharvested', 'of the Last Furrow', 'Straw-Ribbed', 'the Grinning',
    'Field-Sworn', 'the Carved', 'Wick-Hearted', 'of the Long Stubble',
    'Frost-Bitten', 'the Scything', 'Crow-Fed', 'the Vined',
  ],
};

// The Unrusted speak in maker's-marks and duty-rolls — a name here is a
// catalogue entry that refused to be struck off. The hollowborn panoply
// (armor with no one inside, still on parade) answers to the same
// inventory.
const UNRUSTED_TONGUE: TonguePools = {
  prefixes: ['Gnom', 'Ferrul', 'Tessel', 'Mandrel', 'Pinion', 'Cotter', 'Patin', 'Lathe', 'Burnish', 'Templ'],
  suffixes: ['on', 'ule', 'ella', 'in', 'ern', 'um', 'ion', 'isa', 'rax', 'olan'],
  epithets: [
    'the Still-Bright', 'of the Ninth Winding', 'Rust-Refused', 'the Unoiled',
    'Keeper of the Long Inventory', 'the Overwound', 'of the Sealed Foundry', 'Patina-Crowned',
    'the Load-Bearing', 'Who Kept the Rounds', 'the Uncounted Cog', 'of the Old Tolerances',
  ],
};

// The Gilded Compact names its terrors the way it names its accounts —
// counting-house christenings, epithets straight off the ledger's edge.
const COMPACT_TONGUE: TonguePools = {
  prefixes: ['Aurel', 'Salv', 'Broc', 'Vindem', 'Ottal', 'Fioren', 'Cambi', 'Solid', 'Argent', 'Ducat'],
  suffixes: ['io', 'estra', 'ard', 'ia', 'ine', 'enz', 'al', 'or', 'ella', 'essa'],
  epithets: [
    'the Solvent', 'of the Fourth Ledger', 'Debt-Remembered', 'the Underwriter',
    'Gold-Sworn', 'Who Holds the Note', 'the Compounding', 'of the Long Margin',
    'Tariff-Tongued', 'the Escrowed', 'Half-Interest', 'the Foreclosed',
  ],
};

// The warband's own bark — scrap-names won in the mob, epithets counted
// in loot, ears and promotions (Ghorvane's kin never met a rank they
// wouldn't bite for).
const GOBLIN_TONGUE: TonguePools = {
  prefixes: ['Snag', 'Grub', 'Ghor', 'Zog', 'Skab', 'Wug', 'Nark', 'Brag', 'Krig', 'Mok'],
  suffixes: ['gob', 'snik', 'bash', 'dreg', 'wort', 'tusk', 'nab', 'grot', 'zag', 'lug'],
  epithets: [
    'the Toll-Taker', 'Wolf-Fed', 'of the Burned Bridge', 'the Loot-Heavy',
    'Three-Teeth', 'Whip-Promoted', 'of the Powder Cart', 'the Ear-Counter',
    'Half-Pay', 'Who Rides Anything', 'the Boss-Biter', 'Twice-Demoted',
  ],
};

// The Risen Host's grave-liturgy — barrow, shroud and bell; every epithet
// an entry in a parish register kept too long.
const GRAVE_TONGUE: TonguePools = {
  prefixes: ['Barrow', 'Shroud', 'Pall', 'Mourn', 'Knell', 'Sexton', 'Bier', 'Dirge', 'Ossuar', 'Charnel'],
  suffixes: ['shank', 'moan', 'bone', 'shade', 'mold', 'hush', 'grip', 'tread', 'wisp', 'toll'],
  epithets: [
    'the Unburied', 'Twice-Interred', 'of the Broken Bell', 'the Shroud-Torn',
    'Coffin-Cramped', 'Who Kept the Vigil', 'of the Wrong Grave', 'the Pallid Verger',
    'Six-Feet-Short', 'the Late', 'Bell-Tongued', 'of the Shallow Parish',
  ],
};

// THE VOID TONGUE — the eldritch orders and everything that leaks in
// through them: rift vessels, the abyssal ascetics, the mirror doubles,
// the vacant shells. Syllables with the wrong number of corners; epithets
// about geometry that shouldn't close.
const VOID_TONGUE: TonguePools = {
  prefixes: ['Vhal', 'Xul', 'Ythk', 'Zsa', 'Ngai', 'Ulth', 'Qir', 'Ossh', 'Vek', 'Ihl'],
  suffixes: ['oth', 'ith', 'zhul', 'qar', 'naal', 'esh', 'urr', 'ai', 'xis', 'om'],
  epithets: [
    'the Unfolded', 'of the Eleventh Angle', 'Never-Was', 'the Convergent',
    'Who Is Also Elsewhere', 'the Null Choir', 'of the Outer Meridian', 'the Unwitnessed',
    'Thrice-Impossible', 'the Hollow Equation', 'Who Dreams the Door', 'of No Fixed Shape',
  ],
};

// The choir's own registry — rank-names in -iel and -on, epithets read
// off the wheel and the law ('the Unblinking Above' answers the
// Coilborn's Below on purpose).
const CHOIR_TONGUE: TonguePools = {
  prefixes: ['Aur', 'Zadk', 'Ophan', 'Ramm', 'Uzz', 'Cass', 'Hadr', 'Sandal', 'Cam', 'Seraph'],
  suffixes: ['iel', 'ael', 'on', 'im', 'eth', 'oth', 'iah', 'ai', 'uel', 'ion'],
  epithets: [
    'of the Wheel', 'the Law Intoned', 'Thrice-Crowned in Light', 'of the Ninth Choir',
    'Who Weighs the Heart', 'the Trumpet-Sworn', 'of the Burning Court', 'the Aureoled',
    'Who Guards the Gate', 'the Psalm Unending', 'of the First Dawn', 'the Unblinking Above',
  ],
};

// The Crusade's martial liturgy — mortal zealots named in oaths, vigils
// and banners; sainthood pursued at lance-point.
const ZEAL_TONGUE: TonguePools = {
  prefixes: ['Oath', 'Vigil', 'Banner', 'Creed', 'Litany', 'Penance', 'Relic', 'Psalter', 'Censer', 'Martyr'],
  suffixes: ['brand', 'march', 'helm', 'ward', 'scar', 'voice', 'step', 'burn', 'shield', 'knell'],
  epithets: [
    'the Unbowed', 'Oath-Scarred', 'of the Ninth Vigil', 'the Relic-Bearer',
    'Twice-Shriven', 'Who Burned the Ford', 'the Banner-Wed', 'of the Long Pilgrimage',
    'the Flagellant', 'Creed-Blind', 'the Indulgenced', 'Saint-in-Waiting',
  ],
};

// THE BYNAME TONGUE — mortal road-and-croft monikers, shared by the
// bandit companies and the freehold folk they rob: gallows humor from
// both sides of the hedge.
const BYNAME_TONGUE: TonguePools = {
  prefixes: ['Gallows', 'Ditch', 'Hedge', 'Copper', 'Tally', 'Powder', 'Turnpike', 'Mutton', 'Cudgel', 'Halfpenny'],
  suffixes: ['jack', 'moll', 'crow', 'knife', 'purse', 'boot', 'tooth', 'whistle', 'shanks', 'nail'],
  epithets: [
    'the Twice-Hanged', 'of the Sunken Road', 'Toll-Free', 'Who Robbed the Reeve',
    'the Hedge-Lawyer', 'Short-Weight', 'of the Crooked Mile', 'the Pardoned',
    'the Unpardoned', 'Ale-Sworn', 'the Poacher Royal', 'of Nothing Lane',
  ],
};

// THE HEX TONGUE — the coven crones and the goetic orders: hedge-witch
// names knotted widdershins, epithets that read like accusations at a
// village trial.
const HEX_TONGUE: TonguePools = {
  prefixes: ['Hex', 'Crone', 'Widder', 'Toad', 'Birch', 'Newt', 'Cowl', 'Tallow', 'Henbane', 'Mand'],
  suffixes: ['wife', 'shins', 'root', 'crook', 'spit', 'eye', 'knot', 'bane', 'cackle', 'charm'],
  epithets: [
    'the Thrice-Sworn', 'of the Bent Path', 'Moon-Contrary', 'the Curdler',
    'Who Signs in Soot', 'the Nine-Knotted', 'of the Hollow Oak', 'the Misfortune',
    'Salt-Shy', 'Widdershins-Wed', 'of the Sunken Coven', 'the Goetic',
  ],
};

// THE BESTIAL TONGUE — the hunt's own ledger, shared by everything that
// stalks on four legs or wishes it did: beasts, the wild packs, the
// gnoll clans and the beastkin hordes. Names a hunter would carve on a
// lodge wall.
const BESTIAL_TONGUE: TonguePools = {
  prefixes: ['Rake', 'Howl', 'Lope', 'Haunch', 'Pounce', 'Ravin', 'Carrion', 'Antler', 'Roar', 'Slaver'],
  suffixes: ['jaw', 'hackle', 'flank', 'hoof', 'pad', 'mane', 'gullet', 'wither', 'tine', 'muzzle'],
  epithets: [
    'the Man-Tester', 'Winter-Lean', 'of the Red Season', 'the Herd-Breaker',
    'Who Walks at Dusk', 'the Long-Hungered', 'Scar-Muzzled', 'of the High Kill',
    'the Snare-Wise', 'Trap-Scarred', 'Who Outran the Fire', 'Last of the Litter',
  ],
};

// THE WINTER-THEGN TONGUE — the jotun halls and the rimebound court
// speak one old cold language: thegn-names, cairns, the long dark.
const WINTERTHEGN_TONGUE: TonguePools = {
  prefixes: ['Hrim', 'Jokul', 'Fimbul', 'Thrym', 'Vind', 'Berg', 'Isarn', 'Hail', 'Skjald', 'Drang'],
  suffixes: ['grim', 'thegn', 'ulf', 'bjorn', 'hild', 'mund', 'rik', 'vald', 'stein', 'frost'],
  epithets: [
    'the Winter-Sworn', 'of the Elder Snow', 'Avalanche-Voiced', 'the Unthawed',
    'of the Long Dark', 'Who Ate the Sun', 'the Glacier-Patient', 'Frost-Bearded',
    'of the Nine Winters', 'the Cairn-Builder', 'Who Wrestled the Sea', 'Hall-Burner',
  ],
};

// THE CINDER TONGUE — the furnace congregation (emberkin and the
// smoulder): names struck at the anvil, epithets from the firing ledger.
const CINDER_TONGUE: TonguePools = {
  prefixes: ['Slag', 'Clinker', 'Forge', 'Bellows', 'Crucible', 'Pyre', 'Char', 'Smelt', 'Kiln', 'Tinder'],
  suffixes: ['spark', 'choke', 'glow', 'melt', 'scorch', 'sinter', 'flue', 'coal', 'brand', 'ingot'],
  epithets: [
    'the Half-Quenched', 'of the First Firing', 'Bellows-Born', 'the Twice-Fired',
    'Who Kept the Coals', 'of the Cold Forge', 'the Cinder-Tithed', 'Slag-Crowned',
    'the Unquenched', 'of the Ninth Furnace', 'Ash-Salted', 'the Last Ember',
  ],
};

// THE WINDS TONGUE — every air that owns a name: the gale djinn, the sky
// fauna of the zephyrid rookeries, the sirocco's mirage courts. Named
// for what the weather did.
const WINDS_TONGUE: TonguePools = {
  prefixes: ['Sirr', 'Kham', 'Zeph', 'Mistral', 'Bora', 'Squall', 'Simoom', 'Harmat', 'Aeol', 'Gale'],
  suffixes: ['wail', 'gust', 'eddy', 'shear', 'lull', 'veer', 'scud', 'whorl', 'breath', 'drift'],
  epithets: [
    'the Four-Quartered', 'of the High Calm', 'Who Unroofed the Town', 'the Contrary Wind',
    'Sail-Sworn', 'the Doldrum', 'of the Glass Desert', 'the Weathervane',
    'Thrice-Becalmed', 'Who Carries Voices', 'the Long Sigh', 'of the Upper Air',
  ],
};

// THE VERDANT TONGUE — the green courts: sylvan wardens, the bloomkin
// petal-dancers, the junglekin's strangler shrines. Patient names;
// verdicts measured in growth rings.
const VERDANT_TONGUE: TonguePools = {
  prefixes: ['Bough', 'Bract', 'Loam', 'Tendril', 'Petal', 'Sap', 'Gall', 'Mistle', 'Catkin', 'Burl'],
  suffixes: ['root', 'vine', 'thorn', 'graft', 'bloom', 'frond', 'bark', 'moss', 'seed', 'pith'],
  epithets: [
    'the Deep-Rooted', 'of the Old Growth', 'Sap-Sworn', 'the Pruned',
    'Who Outgrew the Wall', 'the Evergreen', 'of the Strangler Court', 'Ring-Counted',
    'the Deciduous', 'Who Blooms at Funerals', 'the Slow Verdict', 'of the Hundred Springs',
  ],
};

// THE BLIGHT TONGUE — spore and pestilence share one damp voice: the
// myconid sovereignties and the plague's bell-led processions.
const BLIGHT_TONGUE: TonguePools = {
  prefixes: ['Spore', 'Murrain', 'Pox', 'Bloat', 'Blight', 'Mildew', 'Canker', 'Smut', 'Ergot', 'Bubo'],
  suffixes: ['cap', 'gill', 'froth', 'pock', 'weep', 'swell', 'spot', 'wheal', 'mote', 'bell'],
  epithets: [
    'the Quarantine-Breaker', 'of the Third Ring', 'the Fruiting', 'Who Coughs Twice',
    'the Unlanced', 'of the Damp Parish', 'the Spore-Tithed', 'Miasma-Sweet',
    'the Incurable', 'of the Closed Well', 'the Blooming Sickness', 'Thrice-Quarantined',
  ],
};

// THE WARREN TONGUE — the gutter kingdoms: rat piper-courts and the
// magpie snatch-gangs, everything that owns the walls and taxes the
// crumbs.
const WARREN_TONGUE: TonguePools = {
  prefixes: ['Scritch', 'Nib', 'Filch', 'Skulk', 'Midden', 'Sump', 'Grate', 'Cellar', 'Pilfer', 'Scrump'],
  suffixes: ['whisker', 'tail', 'nip', 'scrab', 'squeak', 'snatch', 'patter', 'scurry', 'hoard', 'nose'],
  epithets: [
    'the Under-Stair', 'of the Ninth Cellar', 'Crumb-Sworn', 'the Twice-Trapped',
    'Who Owns the Walls', 'the Shiny-Eyed', 'of the Drowned Sewer', 'the Unpoisoned',
    'Tail-Taxed', 'Who Hears the Cat', 'the Uncatchable', 'King Under the Floor',
  ],
};

// THE HIVE TONGUE — chitin and formic castes click one language: names
// like stridulation, epithets counted in instars and galleries.
const HIVE_TONGUE: TonguePools = {
  prefixes: ['Krik', 'Zik', 'Tcha', 'Vrit', 'Chirr', 'Thrix', 'Skit', 'Katak', 'Ozz', 'Ith'],
  suffixes: ['tik', 'ikk', 'acha', 'arit', 'ixi', 'ekk', 'itch', 'azz', 'irr', 'axi'],
  epithets: [
    'of the Third Instar', 'the Queen\'s Hundredth', 'Fifth-Molted', 'the Replete',
    'Who Digs the Sixth Gallery', 'the Swarm-Remembered', 'of the Royal Cell', 'the Frass-Builder',
    'Wax-Sealed', 'the Winged Once', 'of the Deep Comb', 'Who Counts by Touch',
  ],
};

// THE FATHOM TONGUE — the drowned courts, the hadal depthkin and the
// riverbound shades: one pressure-flattened voice, salt-sworn, keel-wise.
const FATHOM_TONGUE: TonguePools = {
  prefixes: ['Fathom', 'Brine', 'Silt', 'Wrack', 'Trench', 'Keel', 'Ballast', 'Lorn', 'Weed', 'Sound'],
  suffixes: ['wash', 'drown', 'gill', 'fin', 'tide', 'wake', 'draught', 'moor', 'hull', 'sink'],
  epithets: [
    'the Thrice-Drowned', 'of the Sounding Line', 'Keel-Hauled', 'the Undertow',
    'Who Signs No Manifest', 'the Pressure-Blessed', 'of the Anchor Court', 'Salt-Sworn',
    'the Last Bubble', 'Who Waits Under Keels', 'of the Ninth Fathom', 'the Unsalvaged',
  ],
};

// THE TELLURIC TONGUE — the land's own myth-voice: elementals of stone
// and resonance, the primeval world-titans, the old wyrms sleeping in
// the strata. Slow names; epithets older than the rivers.
const TELLURIC_TONGUE: TonguePools = {
  prefixes: ['Basalt', 'Shale', 'Marl', 'Scarp', 'Fault', 'Magma', 'Strata', 'Lode', 'Tor', 'Crag'],
  suffixes: ['spar', 'vein', 'shelf', 'fold', 'seam', 'core', 'slide', 'quake', 'chime', 'knap'],
  epithets: [
    'the Orebound', 'of the First Bedrock', 'Slow as Mountains', 'the Unweathered',
    'Who Remembers the Flood', 'the Vein-Father', 'of the Deep Pressure', 'Chime-Voiced',
    'the Subsiding', 'Older Than the River', 'the Half-Eroded', 'of the Ninth Stratum',
  ],
};

// THE LANTERN TONGUE — the lit courts: glimmerkin lamp-gardens and the
// wax court's votive processions, everything that keeps a flame on
// purpose.
const LANTERN_TONGUE: TonguePools = {
  prefixes: ['Taper', 'Wick', 'Sconce', 'Lumen', 'Prism', 'Chandler', 'Snuff', 'Glim', 'Votive', 'Lantern'],
  suffixes: ['flicker', 'gleam', 'shine', 'beam', 'halo', 'lume', 'ray', 'glint', 'shimmer', 'bright'],
  epithets: [
    'the Well-Trimmed', 'of the Thousand Candles', 'Moth-Beloved', 'the Unsnuffed',
    'Who Lights the Last Lamp', 'of the Bright Court', 'Half-Melted', 'the Vigil Flame',
    'Who Reads by Their Own Light', 'the Waxen', 'of the Glass Gallery', 'the Chandled',
  ],
};

// THE DUSK TONGUE — the House of Dusk's murmuring parliament and the
// gloamborn wick-keepers: soft names, epithets in parliamentary hush.
const DUSK_TONGUE: TonguePools = {
  prefixes: ['Hush', 'Murmur', 'Gloam', 'Dim', 'Curfew', 'Shutter', 'Eave', 'Umber', 'Owl', 'Even'],
  suffixes: ['whist', 'soft', 'fall', 'close', 'veil', 'mute', 'faint', 'still', 'late', 'hood'],
  epithets: [
    'the Soft-Spoken', 'of the House of Dusk', 'Curfew-Sworn', 'the Unlit',
    'Who Votes in Whispers', 'the Adjourned', 'of the Last Lamplight', 'Shutter-Eyed',
    'the Overheard', 'Who Closes the Day', 'the Tabled Motion', 'of the Quiet Quorum',
  ],
};

// THE FIRMAMENT TONGUE — the vesperkin's patient sky-fauna and the
// starfall shards: names charted, not given; epithets in orbits.
const FIRMAMENT_TONGUE: TonguePools = {
  prefixes: ['Zenith', 'Nadir', 'Syzygy', 'Aphel', 'Comet', 'Nova', 'Wane', 'Vesper', 'Astral', 'Merid'],
  suffixes: ['arc', 'wheel', 'sphere', 'fall', 'rise', 'set', 'glide', 'count', 'chart', 'dial'],
  epithets: [
    'the Retrograde', 'of the Outer Orbit', 'Thrice-Eclipsed', 'the Waning',
    'Who Charts the Fall', 'the Perihelion', 'of the Silent Sphere', 'Star-Counted',
    'the Long Ellipse', 'Who Missed the Sky', 'the Occulted', 'of the Tenth House',
  ],
};

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
  /** Per-faction pool overrides (absent → defaults). THE SEAT MAP: every
   *  fielded faction points at a tongue const above — kin families share
   *  deliberately, and re-pointing a banner is a one-line edit here. The
   *  tongue census in data/validate.ts keeps this map honest against the
   *  monster registry. */
  byFaction: {
    // The vivisect kin — one slab, four banners.
    caulborn: CAULBORN_TONGUE,
    flesh: CAULBORN_TONGUE,
    amalgam: CAULBORN_TONGUE,
    marrowdrawn: CAULBORN_TONGUE,
    sarcophate: SARCOPHATE_TONGUE,
    coilborn: COILBORN_TONGUE,
    demon: INFERNAL_TONGUE,
    nightkin: NIGHTKIN_TONGUE,
    // The farm-gothic pair: the Carven Court and the livestock it broke.
    carven: CARVEN_TONGUE,
    chattel: CARVEN_TONGUE,
    // The inventory kin: the Unrusted rolls and the unworn panoply.
    unrusted: UNRUSTED_TONGUE,
    hollowborn: UNRUSTED_TONGUE,
    compact: COMPACT_TONGUE,
    goblin: GOBLIN_TONGUE,
    undead: GRAVE_TONGUE,
    // Everything the outside leaks through: the orders, the rifts, the
    // doubles, the empty shells.
    eldritch: VOID_TONGUE,
    abyssal: VOID_TONGUE,
    breach: VOID_TONGUE,
    mirrorkin: VOID_TONGUE,
    vacant: VOID_TONGUE,
    seraphic: CHOIR_TONGUE,
    crusade: ZEAL_TONGUE,
    // Mortal folk, both sides of the hedge.
    bandit: BYNAME_TONGUE,
    freehold: BYNAME_TONGUE,
    coven: HEX_TONGUE,
    occult: HEX_TONGUE,
    // The hunt's ledger.
    beast: BESTIAL_TONGUE,
    wild: BESTIAL_TONGUE,
    predator: BESTIAL_TONGUE,
    gnoll: BESTIAL_TONGUE,
    beastkin: BESTIAL_TONGUE,
    jotun: WINTERTHEGN_TONGUE,
    rimebound: WINTERTHEGN_TONGUE,
    emberkin: CINDER_TONGUE,
    smoulder: CINDER_TONGUE,
    galekin: WINDS_TONGUE,
    zephyrid: WINDS_TONGUE,
    sirocco: WINDS_TONGUE,
    sylvan: VERDANT_TONGUE,
    bloomkin: VERDANT_TONGUE,
    junglekin: VERDANT_TONGUE,
    fungal: BLIGHT_TONGUE,
    plague: BLIGHT_TONGUE,
    vermin: WARREN_TONGUE,
    magpie: WARREN_TONGUE,
    chitin: HIVE_TONGUE,
    formic: HIVE_TONGUE,
    deep: FATHOM_TONGUE,
    depthkin: FATHOM_TONGUE,
    riverbound: FATHOM_TONGUE,
    elemental: TELLURIC_TONGUE,
    primeval: TELLURIC_TONGUE,
    wyrmkin: TELLURIC_TONGUE,
    glimmerkin: LANTERN_TONGUE,
    // The moonlit mere's fey speak the lit courts' tongue (data/merelake.ts).
    merefolk: LANTERN_TONGUE,
    wax: LANTERN_TONGUE,
    umbral: DUSK_TONGUE,
    gloamborn: DUSK_TONGUE,
    vesperkin: FIRMAMENT_TONGUE,
    starfall: FIRMAMENT_TONGUE,
  } as Record<string, TonguePools>,
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
