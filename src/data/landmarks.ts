// ---------------------------------------------------------------------------
// LANDMARK RECIPES — the geographic vocabulary as pure data over the six
// parametric builders (engine/landmarkBuilders.ts). Every entry composes:
// a builder, its knobs, and a LIQUID — so a coast is a water coast, a lava
// coast, a poison-bog shore, or a frozen strand by swapping one field, and a
// caldera pours lava or void without new code. Rolled into zones via
// tileset/biome landmark chances (LandmarkRoll) or stamped directly
// (`{ kind: 'landmark', landmark: 'fjord_coast' }`).
// ---------------------------------------------------------------------------

import { registerLandmark } from '../engine/levelgen';

// --- COAST FAMILY -------------------------------------------------------------
registerLandmark({
  id: 'coast', builder: 'coast', size: [700, 1100], liquid: 'water',
  params: { edgeAmp: 0.2 },
});
registerLandmark({
  id: 'cove', builder: 'coast', size: [600, 900], liquid: 'water',
  params: { coves: [1, 2], edgeAmp: 0.14 },
});
registerLandmark({
  id: 'secluded_cove', builder: 'coast', size: [640, 940], liquid: 'water',
  params: { coves: [1, 1], cliff: true, cliffGap: 0.5, edgeAmp: 0.12 }, poi: true,
});
registerLandmark({
  id: 'fjord_coast', builder: 'coast', size: [800, 1200], liquid: 'water',
  params: { fjords: [2, 3], edgeAmp: 0.1 },
});
registerLandmark({
  id: 'coastal_island', builder: 'coast', size: [700, 1000], liquid: 'water',
  params: { islands: [1, 2], edgeAmp: 0.18 },
});
registerLandmark({
  id: 'cliff_coast', builder: 'coast', size: [700, 1000], liquid: 'water',
  params: { cliff: true, cliffGap: 0.7, edgeAmp: 0.24 },
});
// The same shore, different blood: molten, venomous, frozen.
registerLandmark({
  id: 'lava_coast', builder: 'coast', size: [700, 1000], liquid: 'lava',
  params: { coves: [0, 1], edgeAmp: 0.2 },
});
registerLandmark({
  id: 'bog_shore', builder: 'coast', size: [640, 940], liquid: 'bog',
  params: { coves: [1, 2], edgeAmp: 0.22 },
});
registerLandmark({
  id: 'frozen_strand', builder: 'coast', size: [640, 960], liquid: 'ice',
  params: { edgeAmp: 0.18 },
});

// --- LANDFORM FAMILY -----------------------------------------------------------
registerLandmark({
  id: 'peninsula', builder: 'landform', size: [700, 1000], liquid: 'water',
  params: { shape: 'peninsula' }, poi: true, mustReach: true,
});
registerLandmark({
  id: 'isthmus', builder: 'landform', size: [740, 1040], liquid: 'water',
  params: { shape: 'isthmus' }, mustReach: true,
});
registerLandmark({
  id: 'tombolo', builder: 'landform', size: [700, 980], liquid: 'water',
  params: { shape: 'tombolo' }, poi: true, mustReach: true,
});
registerLandmark({
  id: 'lava_isthmus', builder: 'landform', size: [700, 980], liquid: 'lava',
  params: { shape: 'isthmus' }, mustReach: true,
});

// --- CRATER FAMILY -------------------------------------------------------------
registerLandmark({
  id: 'crater', builder: 'crater', size: [520, 820],
  params: { fill: 'ground', gapArc: 0.5 }, poi: true, mustReach: true,
});
registerLandmark({
  // The caldera's spiral is WALLS on purpose (magma_core — impassable
  // slag): traversal means walking the ramp, not wading the melt. Plain
  // 'lava' elsewhere is the crossable liquid that merely cooks you.
  id: 'caldera', builder: 'crater', size: [620, 940], liquid: 'magma_core',
  params: { fill: 'magma_core', spiralRamp: true, turns: 1.4, gapArc: 0.45 }, poi: true, mustReach: true,
});
registerLandmark({
  id: 'sinkhole', builder: 'crater', size: [420, 640],
  params: { fill: 'void', rimWidth: 0.1, gapArc: 0.4 },
});
registerLandmark({
  id: 'cirque', builder: 'crater', size: [560, 860],
  params: { fill: 'ground', arcSpan: 3.6, gapArc: 0.9 }, poi: true,
});
registerLandmark({
  id: 'flooded_caldera', builder: 'crater', size: [620, 920], liquid: 'deep_water',
  params: { fill: 'deep_water', spiralRamp: true, turns: 1.2, gapArc: 0.5 }, poi: true,
});

// --- VALLEY FAMILY -------------------------------------------------------------
registerLandmark({
  id: 'valley', builder: 'valley', size: [740, 1100],
  params: { floorWidth: 130, wallWidth: 50 },
});
registerLandmark({
  id: 'canyon', builder: 'valley', size: [760, 1140],
  params: { floorWidth: 76, wallWidth: 80 },
});
registerLandmark({
  id: 'secluded_valley', builder: 'valley', size: [640, 940],
  params: { secluded: true, mouthArc: 0.4 }, poi: true, mustReach: true,
});

// --- PEAK FAMILY ---------------------------------------------------------------
registerLandmark({
  id: 'lone_mountain', builder: 'peak', size: [640, 980],
  params: { rings: 3, gapArc: 0.42 }, poi: true, mustReach: true,
});
registerLandmark({
  id: 'swamp_hill', builder: 'peak', size: [520, 780],
  params: { rings: 1, gapArc: 0.6, skirt: 'swamp' }, poi: true, mustReach: true,
});

// --- LAKE FAMILY ---------------------------------------------------------------
registerLandmark({
  id: 'lake', builder: 'lake', size: [520, 900], liquid: 'water',
});
registerLandmark({
  id: 'great_lake', builder: 'lake', size: [900, 1300], liquid: 'water',
  params: { rim: { kind: 'rock', count: [5, 9], radius: [14, 30] } },
});
registerLandmark({
  id: 'lake_island', builder: 'lake', size: [640, 1000], liquid: 'water',
  params: { island: true }, poi: true,
});
registerLandmark({
  id: 'frozen_lake', builder: 'lake', size: [560, 920], liquid: 'ice',
});
// THE GLACIAL HEART — the Winter King's frozen-lake boss arena (deepwinter
// grafts this onto the heart zone instead of the plain lake): an ice disc
// hanging over a chasm moat, causeway-crossed, ground by carved hazard lanes
// (the track fabric) and studded with rime bumpers. Never rolled ambiently —
// the heart is the only door it enters by; ordinary winters keep their
// ordinary lakes.
registerLandmark({
  id: 'glacial_heart', builder: 'glacial_heart', size: [900, 1150], liquid: 'ice',
  poi: true, mustReach: true, clearSite: true,
});
registerLandmark({
  // clearSite: the water table clears its own ground — desert scatter runs
  // dense enough (fulgurites, shimmer, glass) that a poured pool otherwise
  // drowns earlier solids on their own forbidOn ground (genqa's catch).
  id: 'oasis', builder: 'lake', size: [420, 640], liquid: 'water', clearSite: true,
  params: { rim: { kind: 'palm', count: [4, 7], radius: [14, 24] } }, poi: true,
});
registerLandmark({
  id: 'tar_pool', builder: 'lake', size: [420, 680], liquid: 'bog', clearSite: true,
});

// --- POCKETS & PITS --------------------------------------------------------------
// Pillars of Arun: island pockets across a void gulf — jump/blink-only ground
// (the `pocket` flag exempts them from the reachability invariant), each held
// by ranged dead who rain arrows across the gap.
registerLandmark({
  id: 'void_pillars', builder: 'pillars', size: [700, 1050],
  params: { pillars: [3, 5], gulf: 'void' },
  pocket: true,
  spawns: { table: [{ id: 'skeleton_archer', weight: 3 }, { id: 'gnoll_longshot', weight: 1 }], count: [3, 6], where: 'interior' },
});
// A demon warren pit: broken rim, ember floor, imps boiling out of it.
registerLandmark({
  id: 'demon_pit', builder: 'pit', size: [480, 760],
  params: { floorKind: 'cinder', gapArc: 0.6 },
  spawns: { table: [{ id: 'imp', weight: 4 }, { id: 'cinder_fiend', weight: 1 }], count: [4, 8], where: 'interior' },
  poi: true, mustReach: true,
});
// THE MAGGOT LAIR (the D2 homage): a churned burrow-pit crawling with the
// queen's brood — her clutches keep hatching if you let them incubate.
registerLandmark({
  id: 'maggot_burrow', builder: 'pit', size: [460, 720],
  params: { floorKind: 'mud', gapArc: 0.55 },
  spawns: {
    table: [
      { id: 'maggot_queen', weight: 1 },
      { id: 'giant_maggot', weight: 5 },
      { id: 'rockgrub', weight: 2, presence: { to: 14, fadeOut: 6 } },
    ],
    count: [5, 9], where: 'interior',
  },
  poi: true, mustReach: true,
});
// THE GNASHER PEN (the warband's livestock, penned): a palisade ring dug
// around churned mud, seething with the herd — VISIBLE, waiting, and sprung
// as ONE event when you stray to the fence or put an arrow through it (the
// ambush fabric's pack law; the same kinds roam free everywhere else). The
// rim gap is the gate the herd pours through; the pit builder's palisade rim
// IS the pen doodad-work. Seated in goblin camps by the warren composition,
// and stampable anywhere goblins keep livestock.
registerLandmark({
  id: 'gnasher_pen', builder: 'pit', size: [220, 300], clearSite: true,
  params: { rimRegion: 'palisade', floorKind: 'mud', gapArc: 0.55 },
  spawns: {
    table: [
      { id: 'cave_gnasher', weight: 5 },
      { id: 'great_gnasher', weight: 1, presence: { from: 8, fadeIn: 3 } },
    ],
    count: [4, 7], where: 'interior',
    ambush: { radius: 150, visible: true, pack: 400, announce: 'the pen springs!' },
  },
  poi: true,
});
// THE STOCK FOLD (the worked country's pen): a post-and-rail ring around
// churned mud — trough, bale, and the fold's own heads grazing in and about
// it. The gnasher pen's honest civilian cousin (fence_ring carpentry vs the
// pit's war palisade): rolled ambiently across farmland faces, seated by the
// harvest steading — and the very thing the Drove borrows when a pen like
// this one gives way. Livestock keep their own posted graze brains; no
// ambush arm — nothing here is waiting for you.
registerLandmark({
  id: 'stock_fold', builder: 'fence_ring', size: [150, 210], clearSite: true,
  params: {
    floorKind: 'mud', gapArc: 0.5,
    inner: [
      { kind: 'feeding_trough', count: [1, 1], radius: [13, 16] },
      { kind: 'hay_bale', count: [0, 2], radius: [11, 14] },
    ],
  },
  spawns: {
    table: [
      { id: 'wool_sheep', weight: 5 },
      { id: 'dooryard_hen', weight: 2 },
      { id: 'greylag_goose', weight: 1 },
      { id: 'plow_ox', weight: 1 },
    ],
    count: [3, 6], where: 'interior',
  },
  poi: true,
});

// A hive sink: the warren's open throat — a stamped pit boiling with the
// brood, the sand packed glossy where ten thousand feet turned.
registerLandmark({
  id: 'hive_sink', builder: 'pit', size: [500, 780],
  params: { floorKind: 'mud', gapArc: 0.5 },
  spawns: {
    table: [
      { id: 'chitin_drone', weight: 5 },
      { id: 'chitin_lancer', weight: 2, presence: { from: 3, fadeIn: 2 } },
      { id: 'chitin_broodtender', weight: 1, presence: { from: 9, fadeIn: 4 } },
    ],
    count: [5, 9], where: 'interior',
  },
  poi: true, mustReach: true,
});
// --- THE ABYSS (the Underworld's pits) -------------------------------------------
// An abyssal maw: a tear in the steppes floor — the 'abyss' region does the
// fall (ember-rimmed dark; shots and sight cross, bodies drop), dead stone
// crowds the lip. No POI, no mustReach: the hole is the point.
registerLandmark({
  id: 'abyssal_maw', builder: 'lake', size: [460, 780], liquid: 'abyss',
  params: { rim: { kind: 'rock', count: [4, 8], radius: [13, 24] } },
});
// An abyssal gulf: pocket crags marooned over the drop — jump/blink-only
// ground (void_pillars' hell twin), a far battery raining fire across the gap.
registerLandmark({
  id: 'abyssal_gulf', builder: 'pillars', size: [680, 1020],
  params: { pillars: [3, 5], gulf: 'abyss' },
  pocket: true,
  spawns: { table: [{ id: 'imp', weight: 3 }, { id: 'cinder_fiend', weight: 2 }], count: [3, 6], where: 'interior' },
});
