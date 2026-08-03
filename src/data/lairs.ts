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
//   · registerDormantTag  — wardens that stand as statuary until struck,
//   · registerTenantKind  — the ring-tenant lane (engine/massif.ts): a court
//                           ring whose OCCUPANT is the door (wave six, the
//                           lair mouth tenant, at the file's foot).
//
// A lair's den is REPEATABLE geography: every mouth keeps its own den
// forever (position-hash seed), the alpha respawns with the den's memory
// laws, and the hoard pays the lean lair_hoard faucet (loottables.ts).
// Docs: docs/engine/lairs.md. Probe: balance/probe_lairs.ts.
// ---------------------------------------------------------------------------

import { LAIR_CFG, lairOf, registerLair } from '../engine/lairs';
import {
  landmarkDefs, layTraveledWay, registerCluster, registerComposition,
  registerDoodadRule, registerLandmark, registerLandmarkBuilder,
  type DoodadKind,
} from '../engine/levelgen';
import { registerDormantTag, registerRouseRule } from '../engine/ai';
import { registerSidezone, sidezoneOf } from './sidezones';
import { mintCave } from '../engine/worldgen';
import { registerTenantKind, tenantKindOf } from '../engine/massif';
import { registerZoneInfoSource } from '../world/zoneInfo';
import { linePath, registerTrackRider, ringPath } from '../engine/tracks';
import { Mask, disc } from '../engine/genkit';
import { registerGenPin } from '../engine/genPins';
import { vec } from '../core/math';
import type { World } from '../engine/world';

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
    ambush: { radius: 170, visible: true, pack: 320, announce: 'the cairn stirs; the giant wakes!' },
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
    // THE LIQUID SEAT, not 'interior': a lake builder's interior is its SHORE
    // (the dry complement — POIs and mustReach anchors need standable ground),
    // and seated there she boots WILTED with her off-water sheet, which is the
    // exact opposite of this lair's thesis. Measured 30-in/30-out of 60 layouts
    // before this word existed.
    count: [1, 1], where: 'liquid',
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

// === THE DRAKE ROOST (wave three — the ladder's crown) =======================
// The horizontal-progression thesis made flesh: the mountain country now
// READS as a ladder — cairns at its border (level 6+), the frostmaw under
// its slopes (5+, caves), and THIS at its high deep heart (14+, interior
// ≥ ~0.55, elevation ≥ 0.55): a crag mouth into an OPEN-SKY shelf (the
// mint stamps def.sky — weather reaches the perch) where Old Scald keeps
// his hoard. The lair's law is the ANATOMY GAMUT: the wings are a real
// part; break them and both wing verbs die with them — the sky stops
// helping him, and the fight becomes a walk he has to make at you.

registerDoodadRule('roost_crag', { overlap: 'trigger', spacing: 60 });

registerLandmark({
  id: 'roost_crag_site', builder: 'den_mouth', size: [200, 270],
  clearSite: true, poi: true, mustReach: true,
  params: {
    mouthKind: 'roost_crag',
    dress: [
      { kind: 'rock', count: [2, 4], radius: [14, 24] },
      { kind: 'bone_pile', count: [2, 4], radius: [10, 16] },
      { kind: 'cinder', count: [2, 3], radius: [14, 20] },
    ],
  },
});

registerSidezone({
  kind: 'roost_crag',
  dwell: 0.7,
  ledgerOnEnter: 'drake_roost_entered',
  mint: ({ parent, seed, id }) => {
    const def = mintCave(parent, seed, id, 'drake_roost', {
      rollVariant: true,
      name: 'the Drake Roost',
      objective: { kind: 'boss', id: 'roost_dragon' },
      noDeeper: true,
    });
    // THE OPEN-SKY POCKET: skyOf honors an explicit def sky over the
    // caveDepth derivation — the shelf stands under real weather, and the
    // wind on the perch is not a metaphor.
    def.sky = 'open';
    // The hoard floor, cache by cache — richer than the wyrm's barrow:
    // this is the ladder's crown, and the wager should read like it.
    def.fauna = [
      { id: 'gem_cache', chance: 1, count: [5, 8] },
    ];
    return def;
  },
});

registerLair({
  id: 'drake_roost',
  landmark: 'roost_crag_site',
  seat: {
    biomes: ['highland'],
    place: 'surface',
    // THE LADDER'S TOP RUNG: real levels, the country's deep heart, and
    // high ground only — a low zone or a border zone structurally cannot
    // host it, so meeting the roost MEANS the world has already deepened.
    level: { from: 14, fadeIn: 2 },
    interior: { from: 0.55, fadeIn: 0.15 },
    climate: { elevation: [0.55, 1] },
    chance: 0.35,
  },
});

// ============================================================================
// WAVE FOUR — THE CROWN LAIRS: the trench and the barrow, nothing held back.
// ============================================================================

// === THE LEVIATHAN TRENCH (the deep sea's heart) =============================
// The interior axis pointed at the ocean: the maw seats only where the deep
// sea is at its DEEPEST (biomeDepth ≥ 0.6 — the marine sampler that already
// splits shallow isles from true deeps), at real levels. Behind it: the
// hadal hollow, and the Fathomking — the segment fabric at full reach. His
// coils are the dungeon: spread your damage along the animal or drown
// beside an unhurt one.

registerDoodadRule('trench_maw', { overlap: 'trigger', spacing: 60 });

registerLandmark({
  id: 'trench_maw_site', builder: 'den_mouth', size: [200, 270],
  clearSite: true, poi: true, mustReach: true,
  params: {
    mouthKind: 'trench_maw',
    dress: [
      { kind: 'sea_rock', count: [2, 4], radius: [16, 30] },
      { kind: 'coral', count: [2, 3], radius: [12, 20] },
      { kind: 'bone_pile', count: [1, 3], radius: [10, 16] },
    ],
  },
});

registerSidezone({
  kind: 'trench_maw',
  dwell: 0.7,
  ledgerOnEnter: 'leviathan_trench_entered',
  mint: ({ parent, seed, id }) => {
    const def = mintCave(parent, seed, id, 'leviathan_trench', {
      rollVariant: true,
      name: 'the Leviathan Trench',
      objective: { kind: 'boss', id: 'trench_leviathan' },
      noDeeper: true,
    });
    // What the coil pulled down and did not finish: the trench's own small
    // lives (texture past the thresher packs).
    def.fauna = [
      { id: 'land_crab', chance: 0.6, count: [2, 4] },
    ];
    return def;
  },
});

registerLair({
  id: 'leviathan_trench',
  landmark: 'trench_maw_site',
  seat: {
    biomes: ['deepsea'],
    place: 'surface',
    interior: { from: 0.6, fadeIn: 0.15 },
    level: { from: 16, fadeIn: 2 },
    chance: 0.3,
  },
});

// === THE KING'S BARROW (the downs' unquiet mound) ============================
// THE CONDITIONED DOOR's debut: the mound stands all day — dressed, marked,
// refusing — and ANSWERS only after dusk (SidezoneDef.when; the refusal
// floater reads the schedule to anyone who stands on it at noon). Inside:
// the lich under his own nocturne hours, scarcely killable while the
// phylactery stands ANYWHERE in the halls — and the bond's drawn beam
// crossing the dark is both the reason and the map. Break the jar, break
// the king.

registerDoodadRule('barrow_door', { overlap: 'trigger', spacing: 60 });

registerLandmark({
  id: 'barrow_door_site', builder: 'den_mouth', size: [190, 260],
  clearSite: true, poi: true, mustReach: true,
  params: {
    mouthKind: 'barrow_door',
    dress: [
      { kind: 'tombstone', count: [2, 4], radius: [10, 15] },
      { kind: 'standing_stone', count: [1, 2], radius: [13, 18] },
      { kind: 'bone_pile', count: [1, 3], radius: [10, 15] },
    ],
  },
});

registerSidezone({
  kind: 'barrow_door',
  dwell: 0.8,
  ledgerOnEnter: 'kings_barrow_entered',
  when: {
    cond: { phases: ['dusk', 'night'] },
    refusal: 'the barrow sleeps until dark…',
  },
  mint: ({ parent, seed, id }) => {
    const def = mintCave(parent, seed, id, 'kings_barrow', {
      rollVariant: true,
      name: "the King's Barrow",
      objective: { kind: 'boss', id: 'barrow_lich' },
      noDeeper: true,
    });
    // AUTHORED TENANCY, twice: the jar stands somewhere in the halls (ONE,
    // always — following the beam to it is the fight's own exploration),
    // and the walls keep their rats.
    def.fauna = [
      { id: 'kings_phylactery', chance: 1, count: [1, 1] },
      { id: 'gutter_rat', chance: 0.5, count: [2, 4] },
    ];
    return def;
  },
});

registerLair({
  id: 'kings_barrow',
  landmark: 'barrow_door_site',
  seat: {
    biomes: ['downs'],
    place: 'surface',
    level: { from: 12, fadeIn: 2 },
    chance: 0.18,
  },
});

// ============================================================================
// WAVE FIVE — THE DROWNED WALLOW: the composite framework's own exemplar,
// finally given ground to stand on.
// ============================================================================

// === THE DROWNED WALLOW (the fen's crown — the anatomy gamut at lair scale) ==
// The Marsh Leviathan was authored as the PROOF of MonsterDef.parts — one
// creature, five hitboxes (body, head, two claws, tail), each part a full
// monster-actor anchored in the root's facing frame and breaking on its own —
// and then never placed. No pack row, no landmark, no den, no objective: the
// exemplar of the composite framework was unreachable in ordinary play. This
// is its door.
//
// WHY THIS LANE, and not the other three:
//   · a PACK-TABLE weight row would roll a boss-tier body as ordinary trash,
//     and costs a tileset edit besides;
//   · a DEN (den_mouth + sidezone) costs a whole new den TILESET — its own
//     packs, variants, caveLayouts, perf + genqa enrollment: by far the most
//     authoring of the four for a beast that wants no rooms;
//   · an authored OBJECTIVE costs a directed mint to hang it on.
// The in-zone landmark lane costs TWO registry rows and no engine work at
// all: the `lake` builder already pours the pool, `where: 'liquid'` (the
// wellspring's LIQUID SEAT) already seats a dweller IN it rather than on the
// shore, and the seat row below carries its own level envelope — so the def
// needs no `presence` block either.
//
// The beast IS the landmark: a slow armored hulk lying in its own churned
// water, the head shelling from the middle of the pool while claws and tail
// keep the reeds honest. Nothing springs — no ambush arm here, deliberately:
// a composite's parts attach as ordinary actors AFTER the spawn, so arming
// only the root would leave its limbs awake beside a sleeping body.

registerLandmark({
  id: 'leviathan_wallow', builder: 'lake', size: [300, 400], liquid: 'water',
  clearSite: true, poi: true, mustReach: true,
  params: {
    rim: { kind: 'reeds', count: [5, 9], radius: [10, 16] },
  },
  spawns: {
    table: [{ id: 'marsh_leviathan', weight: 1 }],
    // THE LIQUID SEAT (the naiad's hard-won word): a lake builder's
    // `interior` is its SHORE, and a leviathan beached on the bank is a
    // different animal entirely.
    count: [1, 1], where: 'liquid',
  },
});

registerLair({
  id: 'marsh_leviathan',
  landmark: 'leviathan_wallow',
  seat: {
    biomes: ['marsh'],
    place: 'surface',
    // THE BAND IS ARGUED, never inherited. The fen already reads as a ladder
    // at its low end — the hag's hovel from level 4 — and this is its crown:
    // ~1650 effective life (700 on the root, 1.35× of it again spread across
    // four breakable parts), 40 armor, 420 xp. On the shipped seat ladder
    // that sits between the Emberwyrm's barrow (9) and the Fathomking's
    // trench (16), so: silent below 11, whispering 11→14, full weight from 14
    // (`from` is the first FULL level and `fadeIn` the ramp BELOW it — the
    // roost's idiom). The chance matches the King's Barrow, the other crown
    // lair standing on a common surface biome, where a generous roll would
    // wear the country out.
    level: { from: 14, fadeIn: 3 },
    chance: 0.18,
  },
});

// ============================================================================
// WAVE SIX — THE LAIR MOUTH TENANT: the ring that is somebody's door.
// ============================================================================
// Every lair above claims ZONES by predicate (the seat fold). This lane
// claims RINGS by occupancy: the massif fabric's ring-tenant registry
// (engine/massif.ts — one weighted draw per court on the TENANT_SALT fork)
// may name 'lair_mouth' in any court kind's tenants table, and the winning
// ring grows spoor and a den mouth on its own floor — walk in expecting
// stock and find something's home; the real prize is below. No LairSeatRow,
// deliberately: the TABLE is the claim.
//
// THE SEAM: the handler plants an ordinary REGISTERED-SIDEZONE doodad and
// stops — everything after arrives from standing law, unforked:
//   · the dwell, the mint, and the position-hash seed (same mouth, same den
//     forever): loadZone's entrance sweep adopts ANY doodad wearing a
//     registered sidezone kind, however it was placed;
//   · noDeeper pockets refuse — generateLayout's finished-grid strip eats
//     every entrance stray, tenant-planted ones included;
//   · the door joins the universal reachability net (ctx.mustReach — the
//     den_mouth landmark's own channel);
//   · THE FORK LAW: every draw below rides the tenant fork, so the carve —
//     masses, weave, every skirt draw — is byte-identical with the row
//     present or absent (probe rig L).
// WHICH den is ROW DATA, two grains: `params.den` names a registered LAIR
// (the standing registry's key — 'wyrm_barrow', 'drake_roost'…) and the
// ring inherits that den's whole identity (door kind, its own spoor, its
// radius) from its den_mouth landmark row, so per-biome tables seat
// per-biome residents with one field; `params.mouth` is the bare-door lane
// (any registered sidezone kind — a graveland mausoleum_door, a city
// sewer_grate) with row/default dress. Misauthored rows DEGRADE to the
// vacant tenant (warn once, never throw). Seat geometry is parameterized
// (`params.floorFrac` — the court ring's law is only the default), so
// grander host bodies ride the same seam without inheriting ring
// assumptions. The default den is the courtlands' own modest one below.

// === THE SCORPION WELL (the courtlands' undercourt den) ======================
// The well_court's vacant row is the DRY WELL — the ring whose water failed.
// This is its darker sibling: the ring whose well didn't just fail —
// something hollowed it. Bone spoor on the floor, the broken wellhead
// breathing venom-light, and below, the brood in the dynasty's old plumbing:
// standing kin only (the sand scorpion the courtland wildlife already
// fields, ant files in the galleries). One rung deep by design (the
// gleamhollow's law); NO forced tileset, deliberately (the crevice_shaft
// lane): the face rolls from the strata pool under the parent's anchor, so
// a burrow beneath this country looks like this country's caves. The
// classic clear stands as the ask.

registerDoodadRule('scorpion_well', { overlap: 'trigger', spacing: 60 });

registerSidezone({
  kind: 'scorpion_well',
  dwell: 0.7,
  ledgerOnEnter: 'scorpion_well_entered',
  mint: ({ parent, seed, id }) => {
    const def = mintCave(parent, seed, id, undefined, {
      name: 'the Scorpion Well',
      noDeeper: true,
    });
    // The brood is AUTHORED (the NEST_FAUNA lesson): without it a minted
    // pocket falls back to plains wildlife and the well grows meadow hares.
    def.fauna = [
      { id: 'sand_scorpion', chance: 1, count: [4, 7] },
      { id: 'ant_trail', chance: 0.35, count: [1, 2] },
    ];
    return def;
  },
});

/** One spoor dress row (the den_mouth builder's own shape). */
type SpoorRow = { kind: string; count: [number, number]; radius: [number, number] };

/** The default spoor ring (rows may override via `params.dress`): the floor
 *  confesses the door from across the ring, in standing kinds only. */
const LAIR_MOUTH_SPOOR: SpoorRow[] = [
  { kind: 'bone_pile', count: [2, 4], radius: [10, 16] },
  { kind: 'bone', count: [1, 2], radius: [12, 18] },
  { kind: 'scree', count: [1, 3], radius: [12, 20] },
];

const warnedMouths = new Set<string>();

registerTenantKind('lair_mouth', (ctx, def, grid, cm, rng, kd, row) => {
  // Dress-class under the aerial (the stock/cache idiom): a lite mint is
  // never played, so no door needs to stand in it — and the landmark lane's
  // own den mouths skip lite mints the same way.
  if (ctx.lite || !cm.interior) return;
  const p = (row.params ?? {}) as {
    /** THE DEN KEY: a registered LAIR id whose landmark is a den_mouth —
     *  the ring inherits that den's WHOLE identity (its door kind, its own
     *  spoor, its mouth radius) from the standing registry, so per-biome
     *  tables read `den: 'wyrm_barrow'` and a volcanic ring grows the
     *  barrow's actual door into the barrow's actual country. */
    den?: string;
    /** Bare-door lane: any registered sidezone kind (no lair row needed). */
    mouth?: string;
    mouthRadius?: number;
    /** Usable-floor fraction of the host body's r. Default = the court
     *  ring's law ((ringInner ?? 0.6) × 0.9); hosts beyond the court pool
     *  (grander bodies, other shapes) parameterize instead of inheriting a
     *  ring assumption. */
    floorFrac?: number;
    dress?: SpoorRow[];
  };
  // A misauthored row degrades to the vacant tenant (warn once, seat
  // nothing, never throw) — the registry language stays pure and genqa
  // meets a quiet ring, not a crash.
  const degrade = (why: string): void => {
    if (!warnedMouths.has(why)) {
      warnedMouths.add(why);
      console.warn(`[lairs] lair_mouth tenant: ${why} — degrading to vacant`);
    }
    tenantKindOf('vacant')?.(ctx, def, grid, cm, rng, kd, row);
  };
  // Resolve the den key against the standing registries: lair row → its
  // landmark → the den_mouth builder's own params. A lair with no den door
  // (an in-zone lair like the giant's cairn) has nothing to hang on a ring.
  let denMouth: string | undefined;
  let denDress: SpoorRow[] | undefined;
  let denMouthR: number | undefined;
  if (p.den !== undefined) {
    const lair = lairOf(p.den);
    const lm = lair ? landmarkDefs().find(d => d.id === lair.landmark) : undefined;
    const lp = (lm?.params ?? {}) as { mouthKind?: string; mouthRadius?: number; dress?: SpoorRow[] };
    if (!lair || lm?.builder !== 'den_mouth' || !lp.mouthKind) {
      degrade(`den '${p.den}' is no registered den (no lair row, or no den_mouth door)`);
      return;
    }
    denMouth = lp.mouthKind; denDress = lp.dress; denMouthR = lp.mouthRadius;
  }
  // Row grain outranks the den's own kit (the massif `over` doctrine).
  const mouthKind = p.mouth ?? denMouth ?? 'scorpion_well';
  // A door that cannot open must not stand: the mouth kind has to be a
  // registered sidezone or the dwell sweep would never adopt it.
  if (!sidezoneOf(mouthKind)) {
    degrade(`mouth '${mouthKind}' is no registered sidezone`);
    return;
  }
  // The cache knot's floor law (engine/massif.ts): the host's usable floor,
  // and the 42px POI-seat standoff the knot honors — a floor too tight for
  // standoff + door honestly seats nothing.
  const floorR = cm.r * (p.floorFrac ?? (kd.ringInner ?? 0.6) * 0.9);
  const seat = cm.interior;
  const mouthR = p.mouthRadius ?? denMouthR ?? LAIR_CFG.mouth.radius;
  if (floorR < 42 + mouthR * 2 + 8) return;
  const clearOfReserved = (x: number, y: number, r: number): boolean => {
    for (const res of ctx.reserved) {
      if ('pos' in res) {
        if (Math.hypot(x - res.pos.x, y - res.pos.y) < res.radius + r) return false;
      } else {
        const m = (res.margin ?? 0) + r;
        if (x > res.rect.x - m && x < res.rect.x + res.rect.w + m
          && y > res.rect.y - m && y < res.rect.y + res.rect.h + m) return false;
      }
    }
    return true;
  };
  // Seat the door past the standoff, on walkable floor (a few bearings
  // tried; every draw rides the fork, so tries cost the world nothing).
  let mx = 0, my = 0, seated = false;
  for (let t = 0; t < 8 && !seated; t++) {
    const a = rng.range(0, Math.PI * 2);
    const d = rng.range(42 + mouthR, Math.max(42 + mouthR + 1, floorR - mouthR));
    mx = seat.x + Math.cos(a) * d; my = seat.y + Math.sin(a) * d;
    seated = grid.isWalkable(mx, my) && clearOfReserved(mx, my, mouthR);
  }
  if (!seated) return;
  ctx.doodads.push({ pos: vec(mx, my), radius: mouthR, kind: mouthKind as DoodadKind, rot: 0 });
  (ctx.mustReach ??= []).push(vec(mx, my));
  // The spoor, mouth-anchored (the den_mouth builder's grammar on a court
  // floor): never crowding the door, never the POI seat, never the wall.
  for (const srow of p.dress ?? denDress ?? LAIR_MOUTH_SPOOR) {
    for (let i = 0, k = rng.int(srow.count[0], srow.count[1]); i < k; i++) {
      for (let t = 0; t < 4; t++) {
        const a = rng.range(0, Math.PI * 2);
        const d = rng.range(mouthR + 12, mouthR + 70);
        const gx = mx + Math.cos(a) * d, gy = my + Math.sin(a) * d;
        const dd = Math.hypot(gx - seat.x, gy - seat.y);
        if (dd < 42 || dd > floorR - 8) continue;
        if (!grid.isWalkable(gx, gy)) continue;
        ctx.doodads.push({
          pos: vec(gx, gy), radius: rng.range(srow.radius[0], srow.radius[1]),
          kind: srow.kind as DoodadKind, rot: rng.range(0, Math.PI * 2),
        });
        break;
      }
    }
  }
});

// ============================================================================
// WAVE SEVEN — THE KILNHOARD (the colossal massif's resident): the first den
// whose ONLY door is a tenant's. No landmark-lane seat, deliberately — the
// claim below is TENANT-ONLY (biomes [], chance 0: the fold structurally
// never offers it), because the den's whole identity is the body above it:
// the wyrm_caldera anchor (data/massifs.ts) whose ring floor may grow this
// maw when the tenant draw says so. Persistent geography arrives from the
// standing seam (position-hash seeds — same caldera, same hoard forever);
// the world map never marks it (the zone's own information may murmur).
// ============================================================================

// === THE URNFATHER'S KILN ====================================================
// Under the caldera: a fired gallery stacked with the wyrm's treasury —
// urn on urn of it, gem-caches banked between — and the Urnfather himself,
// a colossal worm-file DEAD ASLEEP through the middle of everything he owns
// (dormant, planted; the sphinx's latch, not the emberwyrm's drowse — this
// sleep is centuries deep and no footfall reaches it). THE SURGEON'S
// ROBBERY: his hittable coils thread the trove, so careful single blows
// strip the floor bare while one greedy cleave that clips a coil wakes the
// mountain — how you SWING is the stealth, not where you step. The spilled
// coals (kiln_urn's brittle tenants) press the same question: fight the
// embers beside the sleeping file, and mind every arc.

registerDormantTag('kiln_sleeper'); // no reset row — a woken landlord stays woken
// Any landed wound — a coil clipped by a careless sweep included — wakes
// him alone (radius 0: there is only ever one of him).
registerRouseRule('kiln_sleeper', () => ({
  woundFrac: 1, radius: 0,
  toast: 'The hoard shifts. The coils were never stone.', color: '#ff9a3a', size: 14,
}));

registerDoodadRule('kiln_maw', { overlap: 'trigger', spacing: 60 });

registerLandmark({
  id: 'kilnhoard_maw_site', builder: 'den_mouth', size: [200, 270],
  clearSite: true, poi: true, mustReach: true,
  params: {
    mouthKind: 'kiln_maw',
    // No cinder in the spoor: the spoor loop carries no spacing law, and
    // cinder is poured ground the fuse guard measures — bone keeps the
    // den-mouth grammar (the LAIR_MOUTH_SPOOR citizen) without the sliver.
    dress: [
      { kind: 'kiln_urn', count: [2, 4], radius: [12, 16] },
      { kind: 'obsidian', count: [2, 4], radius: [12, 18] },
      { kind: 'bone_pile', count: [1, 3], radius: [10, 15] },
    ],
  },
});

registerSidezone({
  kind: 'kiln_maw',
  dwell: 0.7,
  ledgerOnEnter: 'kilnhoard_entered',
  mint: ({ parent, seed, id }) => {
    const def = mintCave(parent, seed, id, 'kilnhoard', {
      rollVariant: true,
      name: "the Urnfather's Kiln",
      objective: { kind: 'boss', id: 'urnfather' },
      noDeeper: true,
    });
    // THE TROVE'S BANKED HALF (the NEST_FAUNA lesson): gem-caches among the
    // urn rows — the urn floor itself rides the tileset's layout, but the
    // caches are AUTHORED TENANCY, so the hoard's richest seats exist on
    // every mint. Richer than the emberwyrm's barrow, at the drake roost's
    // crown scale: this is the biggest sleeper in the world's bestiary.
    def.fauna = [
      { id: 'gem_cache', chance: 1, count: [4, 6] },
    ];
    return def;
  },
});

registerLair({
  id: 'kilnhoard',
  landmark: 'kilnhoard_maw_site',
  // THE TENANT-ONLY CLAIM: an empty biome list matches no ground and chance
  // 0 falls under minChance — the seat fold skips this row without burning
  // a draw (both gates are pure). The row exists so the lair_mouth tenant's
  // `den: 'kilnhoard'` key resolves the den's WHOLE identity (door kind,
  // spoor, radius) from the standing registries — the caldera's ring is the
  // one door there is.
  seat: {
    biomes: [],
    place: 'both',
    chance: 0,
  },
});

// THE OMINOUS LINE — the zone pane's ONLY word about the colossal (no map
// mark, no world-graph node: the ratified law). Ground whose baked mint
// carries a colossal anchor pool (ZoneDef.layoutParams.massifAnchors — the
// wyrmfields today, any future colossal country for free) murmurs one
// mechanics-quiet condition row on CHARTED ground: it never says whether the
// caldera seated, and never what the ring draw put in it — a den mouth, a
// treasury, a garrison, or nothing is exactly what the walk is for.
registerZoneInfoSource((world: World, zoneId: string) => {
  if (!world.visited.has(zoneId)) return [];
  const def = world.zoneMap[zoneId];
  const anchors = (def?.layoutParams as { massifAnchors?: unknown[] } | undefined)?.massifAnchors;
  if (!Array.isArray(anchors) || !anchors.length) return [];
  return [{
    kind: 'condition' as const, icon: '§', color: '#c96a2e',
    label: 'something vast dens here',
    detail: 'the ground is shaped around a sleeper older than the roads',
    z: -1,
  }];
});

// ============================================================================
// WAVE EIGHT — THE HOMED KIN: five more natives with front doors, spread
// across the biomes that had none (jungle, taiga, tundra, gloamwood,
// littoral — the coverage census in the pass record). Every resident is NEW
// (data/monsters.ts, the ratified law), every den seats ONE landed fabric as
// its whole argument (the gnasher-pen doctrine), and every mint rides the
// Scorpion Well's lane — NO forced tileset, the face rolls from the strata
// pool under the parent's anchor, so a burrow beneath each country looks
// like that country's caves and no tileset row was needed.
// ============================================================================

// === THE SCYTHE COURT (the readers' schoolhouse) =============================
// Jungle surface: a silk-hung bower gate into the mantid school's own hall.
// The law is THE READERS (the mind-layer arc): every body inside telegraphs,
// half of them lie LAWFULLY (the readable-bluff license — a feint always
// flares the guard), and the Abbess at the bottom reads YOU back — her
// antennae ride your cast bar the way your eyes ride her arms. The
// discriminating pairs are staged in one hall so the lesson is learnable
// before the final exam asks it.

registerDoodadRule('bower_gate', { overlap: 'trigger', spacing: 60 });

registerLandmark({
  id: 'bower_gate_site', builder: 'den_mouth', size: [190, 260],
  clearSite: true, poi: true, mustReach: true,
  params: {
    mouthKind: 'bower_gate',
    dress: [
      { kind: 'web', count: [2, 4], radius: [12, 18] },
      { kind: 'drained_husk', count: [1, 3], radius: [12, 16] },
      { kind: 'fern', count: [1, 2], radius: [12, 18] },
    ],
  },
});

registerSidezone({
  kind: 'bower_gate',
  dwell: 0.7,
  ledgerOnEnter: 'scythe_court_entered',
  mint: ({ parent, seed, id }) => {
    const def = mintCave(parent, seed, id, undefined, {
      name: 'the Scythe Court',
      objective: { kind: 'boss', id: 'mantis_abbess' },
      noDeeper: true,
    });
    // THE COURT IN SESSION (authored tenancy): the school's discriminating
    // pairs staged in one hall — duelist beside headsman (the bluff and the
    // body that cannot), augur beside penitent (one trigger, two opposite
    // answers) — with the first arrival prowling the aisles.
    def.fauna = [
      { id: 'mantid_duelist', chance: 1, count: [1, 2] },
      { id: 'mantid_headsman', chance: 1, count: [1, 2] },
      { id: 'mantid_augur', chance: 0.8, count: [1, 2] },
      { id: 'mantid_penitent', chance: 0.8, count: [1, 2] },
      { id: 'emerald_mantis', chance: 0.6, count: [1, 2] },
    ];
    return def;
  },
});

registerLair({
  id: 'scythe_court',
  landmark: 'bower_gate_site',
  seat: {
    // The school claims its HOME country's surface too (2026-08-02, the
    // undergrowth pass's coda): jungle keeps the wave-eight seat, garden
    // gains the mantid halls above the brood that breeds them below (the
    // undergrowth's court dividend covers the BELOW half).
    biomes: ['jungle', 'garden'],
    place: 'surface',
    level: { from: 8, fadeIn: 3 },
    chance: 0.15,
  },
});

// === THE STAMPING GROUND (the mass fabric's winter yard) =====================
// Taiga surface: a trampled gap under a windthrow, stamped earth going down
// to where the herd yards against the cold. The law is THE MASS FABRIC: the
// Great Aurochs outweighs everything in the hall including the argument —
// his charge BOWLS bodies through bodies (the bowling lane), the walls end
// arrested flights the hard way (momentum wounds), and his own herd is
// ammunition standing around him. Bring your own weight, or borrow his.

registerDoodadRule('stamping_gap', { overlap: 'trigger', spacing: 60 });

registerLandmark({
  id: 'stamping_gap_site', builder: 'den_mouth', size: [190, 260],
  clearSite: true, poi: true, mustReach: true,
  params: {
    mouthKind: 'stamping_gap',
    dress: [
      { kind: 'log', count: [1, 3], radius: [12, 18] },
      { kind: 'rock', count: [2, 4], radius: [12, 20] },
      { kind: 'bone_pile', count: [1, 2], radius: [10, 15] },
    ],
  },
});

registerSidezone({
  kind: 'stamping_gap',
  dwell: 0.7,
  ledgerOnEnter: 'stamping_ground_entered',
  mint: ({ parent, seed, id }) => {
    const def = mintCave(parent, seed, id, undefined, {
      name: 'the Stamping Ground',
      objective: { kind: 'boss', id: 'great_aurochs' },
      noDeeper: true,
    });
    // The herd he yards (the NEST_FAUNA lesson): elk in the hollow — the
    // standing wildlife with its own juvenile law, so the calves flee where
    // the cows stand, and every one of them is a pin in his bowling lane.
    def.fauna = [
      { id: 'taiga_elk', chance: 1, count: [3, 5] },
      { id: 'snow_hare', chance: 0.5, count: [1, 3] },
    ];
    return def;
  },
});

registerLair({
  id: 'stamping_ground',
  landmark: 'stamping_gap_site',
  seat: {
    biomes: ['taiga'],
    place: 'surface',
    level: { from: 6, fadeIn: 3 },
    chance: 0.18,
  },
});

// === THE RIMEVAULT (the ply fabric under the ice) ============================
// Tundra, surface AND the first caves under it (the sphinx's 'both' posture
// in ice). The law is THE PLY FABRIC: the Rimeclad Elder's mail eats twelve
// landed blows magnitude-blind — cadence beats magnitude at this door, and
// the burn beats both (DoTs pierce the mail by the fabric's own law). It
// stands frozen (dormant, the sphinx's latch) until the first chip; the
// larder the ice kept stands frozen around it.

registerDormantTag('rime_sleeper'); // no reset row — thawed is thawed
// The first chip wakes it alone (radius 0 — the glacier kept only one).
registerRouseRule('rime_sleeper', () => ({
  woundFrac: 1, radius: 0,
  toast: 'The ice CRACKS. The mountain under it turns.', color: '#8ed0ec', size: 14,
}));

registerDoodadRule('glacier_mouth', { overlap: 'trigger', spacing: 60 });

registerLandmark({
  id: 'glacier_mouth_site', builder: 'den_mouth', size: [200, 270],
  clearSite: true, poi: true, mustReach: true,
  params: {
    mouthKind: 'glacier_mouth',
    dress: [
      { kind: 'ice_spike', count: [2, 4], radius: [12, 18] },
      { kind: 'icicle_cluster', count: [1, 2], radius: [12, 16] },
      { kind: 'bone_pile', count: [1, 3], radius: [10, 15] },
    ],
  },
});

registerSidezone({
  kind: 'glacier_mouth',
  dwell: 0.7,
  ledgerOnEnter: 'rimevault_entered',
  mint: ({ parent, seed, id }) => {
    const def = mintCave(parent, seed, id, undefined, {
      name: 'the Rimevault',
      objective: { kind: 'boss', id: 'rimeclad_elder' },
      noDeeper: true,
    });
    // What the glacier kept beside it: hares it never ate (the larder law),
    // and the white wake that moved in under the drifts.
    def.fauna = [
      { id: 'snow_hare', chance: 0.8, count: [2, 4] },
      { id: 'snow_swimmer', chance: 0.4, count: [1, 2] },
    ];
    return def;
  },
});

registerLair({
  id: 'rimevault',
  landmark: 'glacier_mouth_site',
  seat: {
    biomes: ['tundra'],
    place: 'both',
    strata: { to: 2, fadeOut: 1 },
    level: { from: 9, fadeIn: 3 },
    chance: 0.16,
  },
});

// === THE HUNT'S REST (the mount fabric's kennel) =============================
// Gloamwood surface: a trophy-hung gate into the old Hunt's lodge. The law
// is THE MOUNT FABRIC as a duel — true cavalry at den scale: the Hollow
// Huntsman and his courser are two sovereign bodies stacked, the kill ORDER
// is the whole strategy, and the Rest stables a SPARE, so unhorsing him
// buys a window, not a win (the remount rule — the Hunt does not walk).

registerDoodadRule('hunt_gate', { overlap: 'trigger', spacing: 60 });

registerLandmark({
  id: 'hunt_gate_site', builder: 'den_mouth', size: [190, 260],
  clearSite: true, poi: true, mustReach: true,
  params: {
    mouthKind: 'hunt_gate',
    dress: [
      { kind: 'lantern_post', count: [1, 2], radius: [9, 11] },
      { kind: 'hide_rack', count: [1, 2], radius: [10, 13] },
      { kind: 'bone_pile', count: [2, 4], radius: [10, 15] },
    ],
  },
});

registerSidezone({
  kind: 'hunt_gate',
  dwell: 0.7,
  ledgerOnEnter: 'hunts_rest_entered',
  mint: ({ parent, seed, id }) => {
    const def = mintCave(parent, seed, id, undefined, {
      name: "the Hunt's Rest",
      objective: { kind: 'boss', id: 'hollow_huntsman' },
      noDeeper: true,
    });
    // The kennel and the stable (authored tenancy): the Hunt's footmen and
    // bats — and THE SPARE, a riderless courser saddled in its stall (the
    // bone steed's law: an unhorsed master whistles the next horse under
    // himself, so the stable is part of the fight).
    def.fauna = [
      { id: 'gloam_courser', chance: 0.8, count: [1, 1] },
      { id: 'night_hunter', chance: 1, count: [2, 3] },
      { id: 'crimson_bat', chance: 0.5, count: [2, 3] },
    ];
    return def;
  },
});

registerLair({
  id: 'hunts_rest',
  landmark: 'hunt_gate_site',
  seat: {
    biomes: ['gloamwood'],
    place: 'surface',
    level: { from: 10, fadeIn: 3 },
    chance: 0.16,
  },
});

// === THE TIDEWOMB (the heart pump's sea cave) ================================
// Littoral surface: a sea-cave throat at the wrack line, breathing brine.
// The law is THE HEART PUMP (creepSource.cadence — the vessel-bore lane
// made a DESTINATION): the tide inside has a heartbeat — the Tideheart
// Matron's chambered shell squeezes a brinesurge through the galleries
// every dozen-odd seconds, aimed at whoever the womb hates — and the whole
// tide is BOUND to her body. Wade the beats, or still the heart.

registerDoodadRule('tide_hollow', { overlap: 'trigger', spacing: 60 });

registerLandmark({
  id: 'tide_hollow_site', builder: 'den_mouth', size: [190, 260],
  clearSite: true, poi: true, mustReach: true,
  params: {
    mouthKind: 'tide_hollow',
    dress: [
      { kind: 'kelp_wrack', count: [2, 4], radius: [12, 18] },
      { kind: 'sea_rock', count: [1, 3], radius: [14, 24] },
      { kind: 'bone_pile', count: [1, 2], radius: [10, 15] },
    ],
  },
});

registerSidezone({
  kind: 'tide_hollow',
  dwell: 0.7,
  ledgerOnEnter: 'tidewomb_entered',
  mint: ({ parent, seed, id }) => {
    const def = mintCave(parent, seed, id, undefined, {
      name: 'the Tidewomb',
      objective: { kind: 'boss', id: 'tideheart_matron' },
      noDeeper: true,
    });
    // The womb's small lives (the NEST_FAUNA lesson): skitters in the
    // galleries and the shore's walking pebbles — none of them mind the
    // tide; you will.
    def.fauna = [
      { id: 'tide_skitter', chance: 1, count: [3, 5] },
      { id: 'shore_crab', chance: 0.7, count: [2, 4] },
    ];
    return def;
  },
});

registerLair({
  id: 'tidewomb',
  landmark: 'tide_hollow_site',
  seat: {
    biomes: ['littoral'],
    place: 'surface',
    level: { from: 6, fadeIn: 2 },
    chance: 0.18,
  },
});

// ============================================================================
// WAVE NINE — THE HOMED KIN continue: two more countries claimed (the
// archipelago's beach/isle pair and hell's outer marches), the wave-eight
// law verbatim — new residents (data/monsters.ts), ONE landed fabric per
// den as its whole argument, and the Scorpion Well's undefined-tileset mint
// lane (the face rolls from the strata pool under the parent's anchor —
// zero tileset rows). Garden ground is deferred to wave ten by commission.
// ============================================================================

// === THE DRUMSHELL (the combo grammar's tide-hall) ===========================
// Beach/isle surface: a drummed burrow at the dune lip, going down into a
// shell-chambered hall where the surf keeps time. The law is THE COMBO
// GRAMMAR (engine/sequence.ts): every body inside DRUMS a rule players can
// earn — the Patriarch's two unmatched claws close TWIN MEASURES (two
// different blows back-to-back; the Red Cadence wing's notable), his
// congregation raps DRUMBEAT (the same blow, thrice; battle cadence), and
// the beat pips over every shell say who keeps which time before a single
// measure lands. The discriminating pair staged in one hall (the scythe
// court's staging law): varied-beat beside same-beat — watching the hall
// IS the tutorial, and the payoff text over the duel names the rule.

registerDoodadRule('drum_burrow', { overlap: 'trigger', spacing: 60 });

registerLandmark({
  id: 'drum_burrow_site', builder: 'den_mouth', size: [190, 260],
  clearSite: true, poi: true, mustReach: true,
  params: {
    mouthKind: 'drum_burrow',
    dress: [
      { kind: 'kelp_wrack', count: [2, 4], radius: [12, 18] },
      { kind: 'sea_rock', count: [1, 3], radius: [14, 22] },
      { kind: 'bone_pile', count: [1, 2], radius: [10, 15] },
    ],
  },
});

registerSidezone({
  kind: 'drum_burrow',
  dwell: 0.7,
  ledgerOnEnter: 'drumshell_entered',
  mint: ({ parent, seed, id }) => {
    const def = mintCave(parent, seed, id, undefined, {
      name: 'the Drumshell',
      objective: { kind: 'boss', id: 'drumclaw_patriarch' },
      noDeeper: true,
    });
    // The drum circle (authored tenancy): the congregation rapping the
    // OTHER grammar around the patriarch's varied measure, and the shore's
    // ordinary shells underfoot — the front-guard critter and the skitter
    // that never learned an instrument.
    def.fauna = [
      { id: 'strand_drummer', chance: 1, count: [2, 4] },
      { id: 'shore_crab', chance: 0.7, count: [2, 4] },
      { id: 'tide_skitter', chance: 0.4, count: [1, 3] },
    ];
    return def;
  },
});

registerLair({
  id: 'drumshell',
  landmark: 'drum_burrow_site',
  seat: {
    biomes: ['beach', 'isle'],
    place: 'surface',
    level: { from: 5, fadeIn: 2 },
    chance: 0.16,
  },
});

// === THE CHAINWORKS (the track fabric's turning den) =========================
// Steppes surface (hell's outer marches — the Underworld's scorched plains
// of abandoned hellworks): an iron works gate into a hall the legions left
// and the Chainwright never stopped winding. The law is THE TRACK FABRIC
// (engine/tracks.ts) — the faces the Glacial Heart doesn't show: a chained
// HARROW CIRCUIT grinding its carved groove (loop lane, clockwork-pure
// poses), a shuttle sled resting and running on its pause cadence
// (pingpong + dwell plateaus), and THE SWEEPER GRAIN (push 'along') that
// CARRIES a caught body around the route toward the stake rows collecting
// what arrives at speed (gore_stakes' minSpeed gate — the launch and the
// collector are one composed argument). Every lane wears the wright's
// ownerTag (the Winter King's court law): the wheel is his second hand.

// The lane sled: a spiked iron drag-bar on the works' chains. Its rect
// surface mirrors the chain_harrow visual's beam params EXACTLY (the
// agreement contract, validation-pinned); the works spare their own crew
// (notFactions — the shear disc's rimebound law).
registerTrackRider({
  id: 'chain_harrow',
  kind: 'chain_harrow',
  surface: { kind: 'rect', hw: 30, hh: 12 },
  orient: 'lane',
  payload: {
    hit: { base: 20, perLevel: 6, type: 'physical' },
    status: { id: 'bleed', chance: 0.5 },
    impulse: 430,
    push: 'along',
    icdSec: 0.8,
    notFactions: ['demon'],
  },
  warnAhead: 150,
  color: '#ff8a3a',
});

// The works floor: a builder in the glacial heart's idiom (ordinary
// TrackSpecs any landmark may author), registered from data — no engine
// edits. Circuit + shuttle + stakes + hub braziers; every count a param.
registerLandmarkBuilder('windlass_ring', (b) => {
  const { rng, r, ctx } = b;
  const cx = b.center.x, cy = b.center.y;
  // THE CIRCUIT — the harrow ring on its carved groove.
  const laneR = r * (b.param('laneFrac', 0.62) as number);
  const circuitRiders = b.param('circuitRiders', 3) as number;
  const circuitPts = ringPath(cx, cy, laneR, 28, rng.range(0, Math.PI * 2));
  (ctx.tracks ??= []).push({
    path: circuitPts, closed: true, mode: 'loop',
    speed: b.param('circuitSpeed', 80) as number,
    riders: Array.from({ length: circuitRiders },
      (_, i) => ({ kind: 'chain_harrow', phase: i / circuitRiders })),
    groove: true, ownerTag: 'chainwright',
  });
  layTraveledWay(ctx, [...circuitPts, circuitPts[0]],
    { kind: 'track_groove', band: [13, 17], step: 26, overgrowth: 0 });
  // THE SHUTTLE — one sled crossing the works on a chord, resting at each
  // end (the cadence-gate face: pauses are part of the lane's language).
  const sa = rng.range(0, Math.PI * 2);
  const off = laneR * 0.38, reach = laneR * 0.82;
  const px = Math.cos(sa + Math.PI / 2) * off, py = Math.sin(sa + Math.PI / 2) * off;
  const shuttlePts = linePath(
    vec(cx + px - Math.cos(sa) * reach, cy + py - Math.sin(sa) * reach),
    vec(cx + px + Math.cos(sa) * reach, cy + py + Math.sin(sa) * reach));
  (ctx.tracks ??= []).push({
    path: shuttlePts, mode: 'pingpong',
    speed: b.param('shuttleSpeed', 130) as number,
    pauses: [{ at: 0, sec: 1.2 }, { at: 1, sec: 1.2 }],
    riders: [{ kind: 'chain_harrow' }],
    groove: true, ownerTag: 'chainwright',
  });
  layTraveledWay(ctx, shuttlePts,
    { kind: 'track_groove', band: [13, 17], step: 26, overgrowth: 0 });
  // THE STAKE ROWS — the collectors, seated OUTSIDE the circuit where the
  // sweeper grain delivers (speed-gated: careful feet pick through free).
  const stakeN = rng.int(...(b.param('stakes', [4, 6]) as [number, number]));
  const placed: { x: number; y: number }[] = [];
  for (let tries = 0; placed.length < stakeN && tries < 80; tries++) {
    const a = rng.range(0, Math.PI * 2);
    const rr = rng.range(laneR + 44, Math.max(laneR + 52, r * 0.92));
    const p = { x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr };
    if (placed.some(q => Math.hypot(q.x - p.x, q.y - p.y) < 90)) continue;
    placed.push(p);
    ctx.doodads.push({ pos: vec(p.x, p.y), radius: rng.range(12, 15), kind: 'gore_stakes', rot: rng.range(0, Math.PI * 2) });
  }
  // THE HUB — the wright's forge-light at the eye of the wheel.
  for (let i = 0, k = rng.int(1, 2); i < k; i++) {
    const a = rng.range(0, Math.PI * 2), d = rng.range(20, Math.max(24, laneR - 70));
    ctx.doodads.push({ pos: vec(cx + Math.cos(a) * d, cy + Math.sin(a) * d), radius: 11, kind: 'brazier' });
  }
  const floor = Mask.forRect(b.rect.x, b.rect.y, b.rect.w, b.rect.h);
  disc(floor, cx, cy, r * 0.88);
  b.interior = floor;
});

// The ring is named by NO static roll — only the Chainworks mint closure
// appends it — so the orphan census reads it through an ENGINE PIN (the
// sanctioned road for references no data row carries), and the call sites
// below USE the pin (never a literal beside it).
const WINDLASS_RING = registerGenPin('landmark', 'windlass_ring',
  'the Chainworks den mint appends its wheel at chance 1 (data/lairs.ts wave nine)');

registerLandmark({
  id: WINDLASS_RING, builder: 'windlass_ring', size: [210, 270],
  clearSite: true, poi: true, mustReach: true,
});

registerDoodadRule('windlass_gate', { overlap: 'trigger', spacing: 60 });

registerLandmark({
  id: 'windlass_gate_site', builder: 'den_mouth', size: [190, 260],
  clearSite: true, poi: true, mustReach: true,
  params: {
    mouthKind: 'windlass_gate',
    dress: [
      { kind: 'brazier', count: [1, 2], radius: [10, 12] },
      { kind: 'rock', count: [2, 4], radius: [12, 20] },
      { kind: 'bone_pile', count: [1, 3], radius: [10, 15] },
    ],
  },
});

registerSidezone({
  kind: 'windlass_gate',
  dwell: 0.7,
  ledgerOnEnter: 'chainworks_entered',
  mint: ({ parent, seed, id }) => {
    const def = mintCave(parent, seed, id, undefined, {
      // ONE GREAT HALL (the descent's forced-layout precedent): a wheel
      // needs a floor — 'plains' is the open convex cavern, so the ring's
      // ground exists on EVERY mint (a rooms-warren's walk lattice starves
      // the landmark sitter; measured, not guessed). The FACE still rolls
      // from the strata pool — palette, packs and name stay the country's.
      layoutType: 'plains',
      name: 'the Chainworks',
      objective: { kind: 'boss', id: 'chainwright' },
      noDeeper: true,
    });
    // The works floor is AUTHORED TENANCY at landmark grain: the windlass
    // ring rolls at chance 1 (appended — the rolled face keeps its own
    // rows), so every mint of this den turns its wheel.
    def.landmarks = [...(def.landmarks ?? []), { landmark: WINDLASS_RING, chance: 1 }];
    // The works' crew (the NEST_FAUNA lesson): the hounds the legions
    // chained here and the vermin every furnace breeds — all demon-kin,
    // all spared by their own blades (the payload's notFactions).
    def.fauna = [
      { id: 'hellhound', chance: 1, count: [2, 3] },
      { id: 'imp', chance: 0.8, count: [2, 4] },
    ];
    return def;
  },
});

registerLair({
  id: 'chainworks',
  landmark: 'windlass_gate_site',
  seat: {
    biomes: ['steppes'],
    place: 'surface',
    level: { from: 12, fadeIn: 3 },
    chance: 0.16,
  },
});

// ============================================================================
// WAVE TEN — THE HOMED KIN reach the freshest ground: four claims where the
// den census ran thinnest and the newest fabric work landed — the crystal
// country (THE ATTUNEMENT FABRIC), the windchill mountains (THE SURVIVAL
// FABRIC's cold half), the wind reaches (THE FLOCKING FABRIC), and the
// garden's root tier (THE SYMPATHY FABRIC). The wave-eight law verbatim:
// new residents (data/monsters.ts), one landed fabric per den as its whole
// argument. Three lanes, each picked by measurement: the sett and the fold
// MINT (a forced grotto face; the Scorpion Well's undefined lane down the
// garden ladder), the clutch is an IN-ZONE lair (the cairn's lane — its
// argument needs the zone's own windchill), and the roost's door rides the
// COMPOSITION lane (the wind faces starve the landmark sitter — see its
// block).
// ============================================================================

// === THE GEODE SETT (the attunement fabric's den) ============================
// Crystal country, surface and its first caves: a split in the riven shell,
// badger-dug, going down into a grotto where the country's voices stand
// thick. The law is THE ATTUNEMENT FABRIC (engine/tuning.ts): the sett's
// brocks are OPEN re-tuners — every blow you land re-colors them and pulses
// its tone over friend and foe alike (your own type arms the room against
// it; the wash that buffs you also feeds the court) — and the Matriarch is
// the heart's riddle at boss scale: ONE rolled note, locked, worn as her
// tint. The resonant pillars stud the hall (authored scenery — the crystal
// surface's own voices, concentrated), so no fight here is ever one color.

registerDoodadRule('geode_crack', { overlap: 'trigger', spacing: 60 });

registerLandmark({
  id: 'geode_crack_site', builder: 'den_mouth', size: [190, 260],
  clearSite: true, poi: true, mustReach: true,
  params: {
    mouthKind: 'geode_crack',
    dress: [
      { kind: 'crystal_cluster', count: [2, 4], radius: [11, 15] },
      { kind: 'scree', count: [1, 3], radius: [12, 18] },
      { kind: 'bone_pile', count: [1, 2], radius: [10, 15] },
    ],
  },
});

registerSidezone({
  kind: 'geode_crack',
  dwell: 0.7,
  ledgerOnEnter: 'geode_sett_entered',
  mint: ({ parent, seed, id }) => {
    const def = mintCave(parent, seed, id, 'cavern', {
      // THE FORCED FACE (the named-variant lane mintCave carries for
      // authored gates): the sett is ALWAYS the crystal grotto — the
      // country's own cave face at its most crystal — because the den's
      // whole argument is staged on crystal ground. The undefined lane
      // would deal the mixed crawl five mints in six.
      variant: 'crystal grotto',
      name: 'the Geode Sett',
      objective: { kind: 'boss', id: 'prismbrock_matriarch' },
      noDeeper: true,
    });
    // The court (the NEST_FAUNA lesson): open re-tuners around the locked
    // heart, and the shards that shatter (the country's own glitter).
    def.fauna = [
      { id: 'prism_brock', chance: 1, count: [3, 5] },
      { id: 'resonant_shardling', chance: 0.6, count: [2, 4] },
    ];
    // THE VOICES (the crystal surface's scenery law, concentrated): strike
    // one with an element and the pulse washes everyone — the fight bends
    // around them, which is the whole lesson plan.
    def.scenery = [{ monster: 'resonant_crystal', count: [3, 5] }];
    return def;
  },
});

registerLair({
  id: 'geode_sett',
  landmark: 'geode_crack_site',
  seat: {
    biomes: ['crystal'],
    place: 'both',
    strata: { to: 2, fadeOut: 1 },
    level: { from: 8, fadeIn: 3 },
    chance: 0.16,
  },
});

// === THE RIMEWICK CLUTCH (the windchill fabric's lair) =======================
// The in-zone lane (the cairn's law), because the argument IS the zone's own
// weather: a wind-heaped ring on the cold faces, one banked ember at its
// heart, and the wicks crowding it — the ground that would warm you is
// exactly the ground the teeth hold. The rim is the counterplay geometry the
// fabric already owns: duck behind the ring wall and the lee sheds your
// stacks (windAt's shelter probe), touch the stone the wicks are starving
// and carry its glow away (hearthglow — the mountain hearth's law on the
// clutch's own coal). Seat pinned by ALLOWLIST to the faces that carry the
// windchill dial: a lair whose argument is the cold never seats where the
// cold isn't (foothills stays out by design).

// The clutch's banked coal — the hearth_crystal's law on a lair-owned kind
// (its own name, so the mountain-hearth kit's censuses stay untouched):
// warms == the visual light's radius (THE ONE NUMBER — what glows is what
// warms), and brushing it stamps hearthglow through the contact grammar.
registerDoodadRule('smolderstone', {
  overlap: 'solid', blocksMove: true, blocksShot: false, blocksSight: false,
  spacing: 46,
  warms: 110,
  contact: { status: { id: 'hearthglow' }, icdSec: 1.5 },
});

registerLandmark({
  id: 'rimewick_clutch', builder: 'pit', size: [230, 300],
  clearSite: true, poi: true, mustReach: true,
  params: {
    rimRegion: 'wall', gapArc: 0.8,
    inner: [
      { kind: 'smolderstone', count: [1, 1], radius: [13, 16] },
      { kind: 'ice_spike', count: [1, 3], radius: [12, 17] },
      { kind: 'bone_pile', count: [2, 4], radius: [10, 15] },
    ],
  },
  spawns: {
    table: [
      { id: 'rimewick', weight: 3 },
      { id: 'rimewick_matron', weight: 1 },
    ],
    count: [5, 8], where: 'interior',
  },
});

registerLair({
  id: 'rimewick_clutch',
  landmark: 'rimewick_clutch',
  seat: {
    biomes: ['highland'],
    place: 'surface',
    // THE ARGUING-GROUND ALLOWLIST: faces whose theme carries the windchill
    // dial (probe-pinned — a face that drops the dial must leave this list
    // or the lair's argument goes silent under it) AND whose ground seats
    // the ring (measured 40/40 each; the overpass carries the dial but its
    // span-riddled floor starved the sitter 6/40 — the pass keeps its cold
    // to itself).
    tilesets: ['highland', 'snowcrown', 'stonecrown', 'pinnacle'],
    level: { from: 7, fadeIn: 3 },
    chance: 0.2,
  },
});

// === THE VANE ROOST (the flocking fabric's den) ==============================
// The wind reaches (galestream + the Driftways): a nest-knoll on the isles,
// and through its hollow the flock's OWN sky — a minted open-sky drift
// pocket where the murmuration wheels. The law is THE FLOCKING FABRIC
// (BehaviorSpec.flock at full weave): aloft the roost is a boiling shape —
// pure motion, nothing to reach — its dives are telegraphed rings (the leap
// lever), the grounded beat after each stoop is the melee window, and the
// wheel's STRUCTURE is attackable: the front of the V falls and the flock
// scatters (squad onLeaderDeath). Zephyrid on galekin ground: the sky
// already hunts them (standing diplomacy), so the roost reads as what it is
// — the herd's one fortress.
//
// THE DOOR RIDES THE COMPOSITION LANE, measured, not preferred: the wind
// faces are ~10% walkable archipelago, and the landmark sitter's uniform
// darts starve there (40-seed sweeps: a pit ring sited 12-21/40 across
// every footprint down to [110,150] — the warren-starved class, terrain
// grain). Compositions carry the one standing walk-aware anchor
// (CompositionSite.siteWalk — authored FOR the Driftways' isles), and a
// cluster is a proven mouth-vehicle (the sunken ruin's gate, the Breach's
// tear), so the knoll plants the hollow the way the ruin plants its court —
// and loadZone's entrance sweep adopts any registered-sidezone doodad
// however it was placed (the tenant lane's own law). No lair row: the
// composition IS the claim (the wane-arch family), rolled on the two wind
// faces' own composition tables.

registerDoodadRule('roost_hollow', { overlap: 'trigger', spacing: 60 });

// The knoll: the hollow at heart, a vane and wind-chimes over it, the
// wheel's leavings ringing the rim (the ring contract: clearing [45,60] →
// centerpiece rings ≤ 40, litter past 82).
registerCluster({
  id: 'roost_knoll',
  anchor: { radius: 26, kind: 'roost_hollow' },
  pieces: [
    { kind: 'roost_hollow', radius: [24, 28], count: [1, 1], ring: [0, 1], centerpiece: true },
    { kind: 'gale_vane', radius: [11, 14], count: [1, 2], ring: [30, 40], centerpiece: true },
    { kind: 'bone_pile', radius: [10, 15], count: [2, 4], ring: [84, 130], rot: true },
    { kind: 'chime_stand', radius: [10, 13], count: [0, 1], ring: [88, 132], rot: true },
  ],
  poi: true,
});

registerComposition({
  id: 'vane_roost_site',
  // siteWalk: the wind faces are isles in open air — the knoll needs one
  // (the vane court's own word for the same ground).
  sites: [{ id: 'knoll', radius: [110, 150], siteWalk: true }],
  pre: [{ kind: 'clearing', at: 'knoll', count: [1, 1], radius: [45, 60] }],
  post: [{ kind: 'cluster', cluster: 'roost_knoll', at: 'knoll', count: [1, 1] }],
});

registerSidezone({
  kind: 'roost_hollow',
  dwell: 0.7,
  ledgerOnEnter: 'vane_roost_entered',
  mint: ({ parent, seed, id }) => {
    const def = mintCave(parent, seed, id, 'aether_drift', {
      // The flock's own sky: a private drift-archipelago pocket (the realm's
      // standing face — no new tileset), rolled through its variants.
      rollVariant: true,
      name: 'the Vane Roost',
      objective: { kind: 'boss', id: 'stream_shrike' },
      noDeeper: true,
    });
    // THE OPEN-SKY POCKET (the drake roost's law): skyOf honors an explicit
    // def sky over the cave derivation — the murmuration wheels under real
    // weather, and the gusts on the isles are not a metaphor.
    def.sky = 'open';
    // The wheel, guaranteed (the NEST_FAUNA lesson): a full murmuration in
    // residence — and the ambient sky is the flock's ALONE (packs override:
    // the face's galekin packs would hunt the herd out of its own den
    // before the player ever saw the shape).
    def.fauna = [
      { id: 'gale_swift', chance: 1, count: [7, 11] },
    ];
    // Light satellite wheels only (def packSize already fields each rolled
    // pack as a true flock — a generous count here trebled the sky to ~85
    // bodies, measured; the argument wants ONE readable shape).
    def.packs = {
      count: [1, 2], size: [2, 3],
      table: [
        { id: 'gale_swift', weight: 4 },
        { id: 'stream_shrike', weight: 0.5 },
      ],
    };
    return def;
  },
});

// === THE HONEYFOLD (the sympathy fabric's den) ===============================
// The garden's root tier: a waxed comb-arch INSIDE the undergrowth (the
// seat's cave place + strata band — full at depth 1, whispering into the
// rootways below), going down to the gallery where the colony milks its
// herd. The law is THE SYMPATHY FABRIC (engine/sympathy.ts): the Replete
// Foldmother is the colony's living cask, and her born matrons_draught link
// is the den's whole tactical text — she drinks, and every formic body near
// her drinks with her. Kill the wet-nurse first, or fight a hall that
// drinks as one. The aphid fold stands around the fight (the frostmaw's
// larder law): the herd is what the gallery is FOR.

registerDoodadRule('wax_gate', { overlap: 'trigger', spacing: 60 });

registerLandmark({
  id: 'wax_gate_site', builder: 'den_mouth', size: [180, 250],
  clearSite: true, poi: true, mustReach: true,
  params: {
    mouthKind: 'wax_gate',
    dress: [
      { kind: 'comb_wax', count: [2, 4], radius: [12, 16] },
      { kind: 'egg_clutch', count: [1, 2], radius: [11, 15] },
      { kind: 'bone_pile', count: [1, 2], radius: [10, 15] },
    ],
  },
});

registerSidezone({
  kind: 'wax_gate',
  dwell: 0.7,
  ledgerOnEnter: 'honeyfold_entered',
  mint: ({ parent, seed, id }) => {
    const def = mintCave(parent, seed, id, undefined, {
      // The Scorpion Well's lane, one story down: the parent is already the
      // undergrowth, so the strata pool under the garden anchor deals the
      // rootways face — the fold's gallery looks like the country below
      // the country, which is where it is.
      name: 'the Honeyfold',
      objective: { kind: 'boss', id: 'replete_foldmother' },
      noDeeper: true,
    });
    // The milking crew and the herd (the NEST_FAUNA lesson): tenders bond
    // to the fold they keep, soldiers stand the wall, and the aphids ARE
    // the point of the room — the draught waters the colony, never the
    // livestock (the link's own faction law, read at the table).
    def.fauna = [
      { id: 'formic_tender', chance: 1, count: [2, 3] },
      { id: 'formic_soldier', chance: 0.6, count: [1, 2] },
      { id: 'wool_aphid', chance: 0.7, count: [3, 6] },
    ];
    return def;
  },
});

registerLair({
  id: 'honeyfold',
  landmark: 'wax_gate_site',
  seat: {
    biomes: ['garden'],
    place: 'cave',
    // Full weight in the first cave under the garden (the undergrowth —
    // the root tier the fold farms), whispering into the rootways at 2
    // (the frostmaw's ramp law: a hard cliff reads as a bug), silent
    // below.
    strata: { from: 1, to: 1, fadeOut: 2 },
    level: { from: 6, fadeIn: 3 },
    chance: 0.22,
  },
});
