// ---------------------------------------------------------------------------
// THE LAIRS — the true natives' claims on the land, as data.
//
// Each entry here is one native's whole footprint, composed from standing
// registries (the lair fabric adds NO new machinery beyond the seat fold —
// engine/lairs.ts):
//   · registerLair        — WHERE the land qualifies (biome × cave-depth
//                           strata × level × chance; engine/lairs.ts folds
//                           it into the two mint chokepoints),
//   · registerLandmark    — WHAT stands at the seat (a den_mouth apron with
//                           spoor dress, or a whole in-zone lair like the
//                           giant's cairn on the pit builder),
//   · registerDoodadRule  — the mouth's placement/trigger row,
//   · registerSidezone    — the minted den country behind the mouth (forced
//                           tileset, authored name/objective/fauna, noDeeper,
//                           gateway ledger — the wane_arch pattern),
//   · registerDormantTag  — wardens that stand as statuary until struck.
//
// A lair's den is REPEATABLE geography: every mouth keeps its own den
// forever (position-hash seed), the alpha respawns with the den's memory
// laws, and the hoard pays the lean lair_hoard faucet (loottables.ts).
// Docs: docs/engine/lairs.md. Probe: balance/probe_lairs.ts.
// ---------------------------------------------------------------------------

import { registerLair } from '../engine/lairs';
import { registerDoodadRule, registerLandmark } from '../engine/levelgen';
import { registerDormantTag, registerRouseRule } from '../engine/ai';
import { registerSidezone } from './sidezones';
import { mintCave } from '../engine/worldgen';

// === THE FROSTMAW (the yeti den) =============================================
// "Only in the deepest recesses of the mountains": the maw seats INSIDE the
// highland cave ladder — full weight at depths 1–2, fading out by 3, never
// on the open surface — once the world is ready to feed what lives there.
// Behind it: the larder. Blue ice, stacked bone, a pantry of live hares the
// residents hunt through their own hunger drives, and the Rimefather at the
// bottom of the cold (the boss objective seals the arena; the chest banks).

registerDoodadRule('frostmaw_maw', { overlap: 'trigger', spacing: 60 });

registerLandmark({
  id: 'frostmaw_lair_mouth', builder: 'den_mouth', size: [200, 280],
  clearSite: true, poi: true, mustReach: true,
  params: {
    mouthKind: 'frostmaw_maw',
    dress: [
      { kind: 'bone_pile', count: [3, 5], radius: [10, 16] },
      { kind: 'rock', count: [2, 4], radius: [12, 22] },
      { kind: 'bone', count: [1, 2], radius: [12, 18] },
    ],
  },
});

registerSidezone({
  kind: 'frostmaw_maw',
  dwell: 0.7,
  ledgerOnEnter: 'frostmaw_entered',
  mint: ({ parent, seed, id }) => {
    const def = mintCave(parent, seed, id, 'frostmaw_hollow', {
      rollVariant: true,
      name: 'the Frostmaw',
      objective: { kind: 'boss', id: 'yeti_alpha' },
      noDeeper: true,
    });
    // The pantry (the NEST_FAUNA lesson): without authored fauna a minted
    // pocket falls back to plains wildlife, and the Rimefather's larder
    // grows meadow hares. These are SNOW hares. He is particular.
    def.fauna = [
      { id: 'snow_hare', chance: 0.9, count: [3, 6] },
    ];
    return def;
  },
});

registerLair({
  id: 'frostmaw',
  landmark: 'frostmaw_lair_mouth',
  seat: {
    biomes: ['highland'],
    place: 'cave',
    // fadeOut 2, not 1: integer depths make a 1-wide ramp a hard cliff —
    // this way depth 3 still whispers (half weight) before 4 refuses.
    strata: { from: 1, to: 2, fadeOut: 2 },
    level: { from: 5, fadeIn: 3 },
    chance: 0.35,
  },
});

// === THE GIANT'S CAIRN (the in-zone lair lane) ===============================
// No door, no mint — the lair IS the landmark: a stone cairn ring dug into
// the high country, a cookfire, the midden of everything the giant caught,
// and the giant asleep beside it. The ambush arm makes the sleep REAL (the
// gnasher pen's law): visible, targetable, sprung as one event when you
// stray into the ring or put an arrow in him. The same def is stampable
// anywhere else a giant should squat — the seat row is just this fabric's
// claim on the downs and the fells.

registerLandmark({
  id: 'giants_cairn', builder: 'pit', size: [260, 340],
  clearSite: true, poi: true, mustReach: true,
  params: {
    rimRegion: 'wall', floorKind: 'mud', gapArc: 0.7,
    inner: [
      { kind: 'campfire', count: [1, 1], radius: [12, 14] },
      { kind: 'bone_pile', count: [2, 4], radius: [10, 16] },
      { kind: 'hay_bale', count: [0, 1], radius: [11, 14] },
    ],
  },
  spawns: {
    table: [
      { id: 'hill_giant', weight: 1 },
    ],
    count: [1, 1], where: 'interior',
    ambush: { radius: 170, visible: true, pack: 320, announce: 'the cairn stirs — the giant wakes!' },
  },
});

registerLair({
  id: 'giants_cairn',
  landmark: 'giants_cairn',
  seat: {
    biomes: ['highland', 'downs'],
    place: 'surface',
    level: { from: 6, fadeIn: 3 },
    chance: 0.16,
  },
});

// === THE HAG'S HOVEL (the marsh den) =========================================
// The fen's crone keeps a stilted door in the reeds — fetish stakes, hung
// pots, a wisp or two pretending to be a path — and a root-cellar hollow
// beneath it where the light goes wrong. One rung deep by design; the hag
// holds the bottom (boss objective) with her court of wisps and weavers.

registerDoodadRule('hovel_door', { overlap: 'trigger', spacing: 60 });

registerLandmark({
  id: 'hag_hovel', builder: 'den_mouth', size: [180, 250],
  clearSite: true, poi: true, mustReach: true,
  params: {
    mouthKind: 'hovel_door',
    floorKind: 'mud',
    dress: [
      { kind: 'feeding_stake', count: [2, 4], radius: [8, 11] },
      { kind: 'pot_cluster', count: [1, 2], radius: [10, 14] },
      { kind: 'web', count: [1, 3], radius: [12, 18] },
    ],
  },
});

registerSidezone({
  kind: 'hovel_door',
  dwell: 0.7,
  ledgerOnEnter: 'hag_hollow_entered',
  mint: ({ parent, seed, id }) => {
    const def = mintCave(parent, seed, id, 'hag_hollow', {
      rollVariant: true,
      name: "the Hag's Hollow",
      objective: { kind: 'boss', id: 'mire_hag' },
      noDeeper: true,
    });
    // The hovel keeps its own small lives: rats in the walls, moths at the
    // tallow — texture past the wisp court the packs field.
    def.fauna = [
      { id: 'gutter_rat', chance: 0.6, count: [2, 4] },
      { id: 'glow_moth', chance: 0.4, count: [2, 3] },
    ];
    return def;
  },
});

registerLair({
  id: 'hag_hovel',
  landmark: 'hag_hovel',
  seat: {
    biomes: ['marsh'],
    place: 'surface',
    level: { from: 4, fadeIn: 2 },
    chance: 0.2,
  },
});

// === THE RIDDLE VAULT (the deep desert's asking) =============================
// A half-buried stone gate — columns, a plinth, sand reclaiming the steps —
// standing on the erg's surface AND inside the first two caves under it
// (place 'both'; the strata envelope thins the deep end). Behind it: the
// vault, whose ask is a PUZZLE, not a body count — the riddle objective
// banks the chest, the roads never seal, and the sphinx watches you work.
// She is a dormant warden (tag 'vault_warden', latched-once, no reset:
// stone does not forgive) — violence is a CHOICE, priced accordingly.

registerDormantTag('vault_warden'); // no reset row — roused is roused
// Any landed wound wakes HER alone (radius 0 — there is only ever one).
registerRouseRule('vault_warden', () => ({
  woundFrac: 1, radius: 0,
  toast: 'The stone remembers how to move.', color: '#f0d078', size: 14,
}));

registerDoodadRule('sphinx_gate', { overlap: 'trigger', spacing: 60 });

registerLandmark({
  id: 'riddle_vault_gate', builder: 'den_mouth', size: [190, 260],
  clearSite: true, poi: true, mustReach: true,
  params: {
    mouthKind: 'sphinx_gate',
    dress: [
      { kind: 'broken_column', count: [2, 4], radius: [10, 15] },
      { kind: 'ruin_plinth', count: [1, 2], radius: [12, 16] },
      { kind: 'rubble', count: [2, 4], radius: [12, 18] },
    ],
  },
});

registerSidezone({
  kind: 'sphinx_gate',
  dwell: 0.7,
  ledgerOnEnter: 'riddle_vault_entered',
  mint: ({ parent, seed, id }) => {
    const def = mintCave(parent, seed, id, 'riddle_vault', {
      rollVariant: true,
      name: 'the Vault of the Asking',
      objective: { kind: 'puzzle' },
      noDeeper: true,
    });
    // The warden is AUTHORED TENANCY (the lady_of_the_house lane): one
    // sphinx, always, planted at her post — dormant statuary until struck.
    def.fauna = [
      { id: 'vault_sphinx', chance: 1, count: [1, 1] },
      { id: 'horned_viper', chance: 0.4, count: [1, 2] },
    ];
    return def;
  },
});

registerLair({
  id: 'riddle_vault',
  landmark: 'riddle_vault_gate',
  seat: {
    biomes: ['desert'],
    place: 'both',
    strata: { to: 2, fadeOut: 1 },
    level: { from: 7, fadeIn: 3 },
    chance: 0.16,
  },
});

// === THE BARROW WATCH (the watch fabric's debut ground — engine/watch.ts) ====
// A sunken grave-ring on the downs, its lanterns still kept: the Watchman
// sweeps a lantern-cone at the gap, Barrow Hounds prowl for your trail, and
// Gorged Ghouls sleep dark on the spoil heaps. Nothing here SPRINGS (the
// cairn's law is ambush; this ground's law is the LADDER) — everything
// climbs where you can see it climb: skirt the cone, creep the hearing
// ring, wade a stream to gap your scent — or loose an arrow and skip the
// lesson, because pain never needs the ladder.

registerLandmark({
  id: 'barrow_watch', builder: 'pit', size: [240, 320],
  clearSite: true, poi: true, mustReach: true,
  params: {
    rimRegion: 'wall', floorKind: 'mud', gapArc: 0.85,
    inner: [
      { kind: 'lantern_post', count: [2, 3], radius: [9, 11] },
      { kind: 'bone_pile', count: [2, 4], radius: [10, 15] },
      { kind: 'rock', count: [1, 3], radius: [10, 18] },
    ],
  },
  spawns: {
    table: [
      { id: 'barrow_watchman', weight: 2 },
      { id: 'gorged_ghoul', weight: 2 },
      { id: 'barrow_hound', weight: 2 },
    ],
    count: [4, 6], where: 'interior',
  },
});

registerLair({
  id: 'barrow_watch',
  landmark: 'barrow_watch',
  seat: {
    biomes: ['downs', 'field'],
    place: 'surface',
    level: { from: 3, fadeIn: 2 },
    chance: 0.22,
  },
});

// === THE GNOLL MOOT (the pack layer's ground — engine/pack.ts) ===============
// Where the packs gather between hunts: a trampled moot-ring under a ridge
// pyre, the matron at its heart, her court around her, the bonepickers at
// the litter. This ground exists so the SOCIAL STRUCTURE stands assembled
// where you can read it before anything moves: the ochre ropes of the
// matron's favor, the drilled court wearing her lift, the cowards at the
// edge already sagging when the odds turn. Kill her first, or cut through
// her favored with a Bondbreaker, or rout the pickers with pressure alone —
// the moot is the pack layer's whole argument staged as one landmark.
// ZERO new machinery, ZERO new doodad kinds: the pit builder (the barrow
// watch's law), pyre/hide_rack/feeding_stake/bone_pile dress, and spawns
// whose defs already wear the layer.

registerLandmark({
  id: 'gnoll_moot', builder: 'pit', size: [230, 310],
  clearSite: true, poi: true, mustReach: true,
  params: {
    rimRegion: 'wall', floorKind: 'mud', gapArc: 0.95,
    inner: [
      { kind: 'pyre', count: [1, 1], radius: [13, 16] },
      { kind: 'hide_rack', count: [1, 2], radius: [10, 13] },
      { kind: 'feeding_stake', count: [1, 2], radius: [8, 11] },
      { kind: 'bone_pile', count: [2, 4], radius: [10, 15] },
    ],
  },
  spawns: {
    table: [
      { id: 'gnoll_matron', weight: 2 },
      { id: 'gnoll_prowler', weight: 3 },
      { id: 'gnoll_butcher', weight: 1 },
      { id: 'gnoll_bonepicker', weight: 2 },
    ],
    count: [5, 8], where: 'interior',
  },
});

registerLair({
  id: 'gnoll_moot',
  landmark: 'gnoll_moot',
  seat: {
    biomes: ['downs', 'butteland', 'grove'],
    place: 'surface',
    level: { from: 6, fadeIn: 3 },
    chance: 0.2,
  },
});

// ============================================================================
// WAVE TWO — LAIRS OF MANY LAWS. Four more natives, each lair seating ONE
// landed fabric as its whole argument (the gnasher-pen doctrine): the scent
// hunt, the sleeper's ember, the colony court, the rooted river.
// ============================================================================

// === THE MAZE (the bull's labyrinth) =========================================
// Karst surface: a gore-stained gate into a labyrinth-ONLY den. The law is
// the WATCH fabric's scent posture — the bull hunts your trail through the
// walls, and the maze's standing water is the fabric's own counterplay
// (wading breaks the print line). Boss ask; the chest banks past the horns.

registerDoodadRule('maze_gate', { overlap: 'trigger', spacing: 60 });

registerLandmark({
  id: 'maze_gate_site', builder: 'den_mouth', size: [190, 260],
  clearSite: true, poi: true, mustReach: true,
  params: {
    mouthKind: 'maze_gate',
    dress: [
      { kind: 'broken_column', count: [2, 3], radius: [10, 15] },
      { kind: 'bone_pile', count: [2, 4], radius: [10, 15] },
      { kind: 'gore', count: [1, 3], radius: [14, 20] },
    ],
  },
});

registerSidezone({
  kind: 'maze_gate',
  dwell: 0.7,
  ledgerOnEnter: 'maze_entered',
  mint: ({ parent, seed, id }) => {
    const def = mintCave(parent, seed, id, 'bull_maze', {
      rollVariant: true,
      name: 'the Maze',
      objective: { kind: 'boss', id: 'maze_bull' },
      noDeeper: true,
    });
    // Rats in the walls — prints of their own, which is the scent law's
    // gentle chaff: the bull's nose is good, not perfect.
    def.fauna = [
      { id: 'gutter_rat', chance: 0.6, count: [2, 4] },
    ];
    return def;
  },
});

registerLair({
  id: 'bull_maze',
  landmark: 'maze_gate_site',
  seat: {
    biomes: ['karst'],
    place: 'surface',
    level: { from: 8, fadeIn: 3 },
    chance: 0.14,
  },
});

// === THE WYRM BARROW (the sleeping hoard) ====================================
// Volcanic country, surface and the first two caves (the sphinx's 'both'
// posture in fire). TWO laws behind one door: the sleeper (watch sleep —
// the hearing ring is the whole game of robbing the floor caches) and the
// ember (a finite reserve both fire verbs spend — wake it and its opening
// minute is the worst minute; outlast the burn and it visibly gutters).

registerDoodadRule('wyrm_barrow_mouth', { overlap: 'trigger', spacing: 60 });

registerLandmark({
  id: 'wyrm_barrow_site', builder: 'den_mouth', size: [200, 270],
  clearSite: true, poi: true, mustReach: true,
  params: {
    mouthKind: 'wyrm_barrow_mouth',
    dress: [
      { kind: 'obsidian', count: [2, 4], radius: [12, 18] },
      { kind: 'cinder', count: [2, 4], radius: [14, 20] },
      { kind: 'bone_pile', count: [1, 3], radius: [10, 15] },
    ],
  },
});

registerSidezone({
  kind: 'wyrm_barrow_mouth',
  dwell: 0.7,
  ledgerOnEnter: 'wyrm_barrow_entered',
  mint: ({ parent, seed, id }) => {
    const def = mintCave(parent, seed, id, 'wyrm_barrow', {
      rollVariant: true,
      name: 'the Emberwyrm Barrow',
      objective: { kind: 'boss', id: 'emberwyrm' },
      noDeeper: true,
    });
    // THE HOARD FLOOR: breakable gem caches strewn where it sleeps — the
    // robbery is authored tenancy (passive treasure bodies), so the choice
    // is real: tiptoe the hearing ring and leave rich, or wake the furnace.
    def.fauna = [
      { id: 'gem_cache', chance: 1, count: [3, 5] },
    ];
    return def;
  },
});

registerLair({
  id: 'wyrm_barrow',
  landmark: 'wyrm_barrow_site',
  seat: {
    biomes: ['volcanic'],
    place: 'both',
    strata: { to: 2, fadeOut: 2 },
    level: { from: 9, fadeIn: 3 },
    chance: 0.16,
  },
});

// === THE SPINNEY (the matron's silk court) ===================================
// Old-forest surface: a silk-shrouded bole into the web hollow. The laws
// are the LITE COLONY (her brood is a pooled tide that regrows while she
// stands — the exterminator's true target) and the PACK LAYER's drawn
// bonds (the weaver court hangs on visible silk ropes: kill order is
// hanging in the air, literally).

registerDoodadRule('spinney_bole', { overlap: 'trigger', spacing: 60 });

registerLandmark({
  id: 'spinney_bole_site', builder: 'den_mouth', size: [180, 250],
  clearSite: true, poi: true, mustReach: true,
  params: {
    mouthKind: 'spinney_bole',
    dress: [
      { kind: 'web', count: [3, 5], radius: [12, 18] },
      { kind: 'drained_husk', count: [2, 4], radius: [12, 16] },
      { kind: 'briarwood', count: [1, 2], radius: [14, 20] },
    ],
  },
});

registerSidezone({
  kind: 'spinney_bole',
  dwell: 0.7,
  ledgerOnEnter: 'spinney_entered',
  mint: ({ parent, seed, id }) => {
    const def = mintCave(parent, seed, id, 'spinney_hollow', {
      rollVariant: true,
      name: 'the Spinney',
      objective: { kind: 'boss', id: 'spinney_matron' },
      noDeeper: true,
    });
    def.fauna = [
      { id: 'glow_moth', chance: 0.5, count: [2, 4] },
    ];
    return def;
  },
});

registerLair({
  id: 'spinney',
  landmark: 'spinney_bole_site',
  seat: {
    biomes: ['forest'],
    place: 'surface',
    level: { from: 6, fadeIn: 3 },
    chance: 0.15,
  },
});

// === THE WELLSPRING (the naiad's pool — the courses seat axis) ===============
// The in-zone lane, seated ON THE RIVERS THEMSELVES: the seat's `courses`
// row keys to the relief fabric's traced surface rivers ('rivers'), so the
// spring stands only where a river actually runs — whatever country it is
// crossing (the biome list is the local-ground gate). The law is ROOTED
// ground: in her water she is the river's argument; haul her out — or bait
// her out — and the wilt is drawn. Her undertow reels you IN, because all
// of her numbers live where the water is.

registerLandmark({
  id: 'naiad_spring', builder: 'lake', size: [260, 360], liquid: 'water',
  clearSite: true, poi: true, mustReach: true,
  params: {
    rim: { kind: 'flowers', count: [4, 7], radius: [10, 15] },
  },
  spawns: {
    table: [{ id: 'river_naiad', weight: 1 }],
    count: [1, 1], where: 'interior',
  },
});

registerLair({
  id: 'wellspring',
  landmark: 'naiad_spring',
  seat: {
    biomes: ['forest', 'downs', 'farmland', 'highland', 'marsh', 'karst'],
    place: 'surface',
    courses: ['rivers'],
    level: { from: 5, fadeIn: 2 },
    chance: 0.22,
  },
});
