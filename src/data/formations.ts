// ---------------------------------------------------------------------------
// FORMATIONS — patterned arrangements as data (engine/levelgen
// registerFormation). The grammar layer above clusters: a cluster huddles
// around a point, a formation marches along an ANCHOR CHAIN a registered
// arranger lays (line / meander / arc / ring — open registry), so terrain
// reads as COMPOSED — a windbreak of pines, a boulder train down a slope,
// gravestone rows, a reed shoreline — instead of uniform confetti.
//
// Adding one is a def here + a `{kind:'formation', formation: id}` layout
// entry on any tileset (optionally with a WHERE band: shore reeds, rim
// dunes). No engine changes, ever. Pieces honor every placement gate the
// scatter honors (portal clears, reservations, walk-gating, forbidOn) and
// pack freely among themselves — a windrow's crowns are supposed to knit.
// ---------------------------------------------------------------------------

import { registerFormation } from '../engine/levelgen';

// A WINDBREAK: conifers marching in a line, brush huddled at their feet.
registerFormation({
  id: 'windrow_pines', arrange: 'line', span: [320, 620], step: 44,
  pieces: [
    { kind: 'conifer', radius: [13, 22], jitter: 10, rot: true },
    { kind: 'brush', radius: [14, 24], every: 2, jitter: 26, rot: true },
  ],
});

// A HEDGEROW: broadleafs and berry bushes along an old field line.
registerFormation({
  id: 'oak_hedgerow', arrange: 'line', span: [300, 560], step: 48,
  pieces: [
    { kind: 'tree', radius: [13, 20], jitter: 12, rot: true },
    { kind: 'berry_bush', radius: [16, 26], every: 2, jitter: 22, rot: true },
    { kind: 'brush', radius: [14, 22], every: 3, jitter: 24, rot: true },
  ],
});

// A BOULDER TRAIN: stones strung down an old slide, scree spilling between.
registerFormation({
  id: 'boulder_train', arrange: 'meander', span: [340, 640], step: 52,
  params: { wobble: 34 },
  pieces: [
    { kind: 'rock', radius: [16, 34], jitter: 16, rot: true },
    { kind: 'scree', radius: [20, 32], every: 2, jitter: 30 },
  ],
});

// CEMETERY ROWS: aligned headstones — one row per formation; a tileset rolls
// several for the churchyard grid.
registerFormation({
  id: 'gravestone_rows', arrange: 'line', span: [220, 420], step: 52,
  pieces: [
    { kind: 'tombstone', radius: [11, 16], jitter: 6 },
    { kind: 'bone_pile', radius: [12, 18], every: 4, jitter: 20 },
  ],
});

// A PROCESSIONAL AVENUE: standing stones pacing a dead-straight old road.
registerFormation({
  id: 'standing_avenue', arrange: 'line', span: [360, 640], step: 88,
  pieces: [
    { kind: 'standing_stone', radius: [12, 20], jitter: 8, rot: true },
    { kind: 'grass', radius: [18, 30], every: 2, jitter: 30 },
  ],
});

// A REED SHORELINE: rushes tracing the waterline, drowned logs among them.
// Ride it with a `where: {field:'shore', …}` band so the meander hugs the
// liquid an earlier entry poured.
registerFormation({
  id: 'reed_shoreline', arrange: 'meander', span: [280, 520], step: 40,
  params: { wobble: 40 },
  pieces: [
    { kind: 'reeds', radius: [14, 26], jitter: 18, rot: true },
    { kind: 'sunken_log', radius: [16, 24], every: 4, jitter: 22, rot: true },
  ],
});

// A KELP CURTAIN: a drifting wall of fronds, stipe trees anchoring it.
registerFormation({
  id: 'kelp_curtain', arrange: 'meander', span: [320, 600], step: 42,
  params: { wobble: 30 },
  pieces: [
    { kind: 'kelp', radius: [16, 30], jitter: 16, rot: true },
    { kind: 'giant_kelp', radius: [26, 40], every: 3, jitter: 12 },
  ],
});

// A CINDER VEIN: an ash-choked flow line, cooled glass jutting along it.
// (Obsidian, not ember_vent: formation pieces are plain discs — a vent kind
// placed here would LOOK live but never erupt, since the eruption effect is
// attached by the vent's own dedicated stamp. No fake-inert hazards.)
registerFormation({
  id: 'cinder_vein', arrange: 'meander', span: [320, 560], step: 40,
  params: { wobble: 36 },
  pieces: [
    { kind: 'cinder', radius: [22, 36], jitter: 14 },
    { kind: 'obsidian', radius: [16, 26], every: 5, jitter: 18, rot: true },
  ],
});

// ICE TEETH: a frost-heave arc of spikes over wind-packed drift.
registerFormation({
  id: 'ice_teeth', arrange: 'arc', span: [110, 200], step: 46,
  params: { sweep: 0.45 },
  pieces: [
    { kind: 'ice_spike', radius: [11, 20], jitter: 12, rot: true },
    { kind: 'snowdrift', radius: [22, 34], every: 2, jitter: 26 },
  ],
});

// A FIN PROCESSION: the steppes' horn-blades marching down an old scar, bone
// heaped at their roots (all inert — the formations doctrine: look-alike
// hazards never ride a formation).
registerFormation({
  id: 'fin_procession', arrange: 'meander', span: [340, 620], step: 64,
  params: { wobble: 30 },
  pieces: [
    { kind: 'hell_fin', radius: [16, 30], jitter: 14, rot: true },
    { kind: 'bone_pile', radius: [12, 20], every: 3, jitter: 24 },
  ],
});

// THE IMPALED ROAD: stakes pacing a dead-straight legion road, cinders
// drifting along it — the warning the steppes post for free.
registerFormation({
  id: 'stake_line', arrange: 'line', span: [360, 640], step: 92,
  pieces: [
    { kind: 'impaler_stake', radius: [10, 14], jitter: 8, rot: true },
    { kind: 'cinder', radius: [20, 30], every: 2, jitter: 28 },
  ],
});

// AN IMPALER RING: the court's warning circle. Sized to ring a composition
// clearing (inner ring 128×0.94−6 = 114 stays outside a reserved court of
// ≤78 + piece 13 = 91 — tune BOTH sides together; see impaler_court).
registerFormation({
  id: 'impaler_ring', arrange: 'orbit', span: [128, 175], step: 58,
  params: { rings: [1, 1], innerFrac: 0.94 },
  pieces: [
    { kind: 'impaler_stake', radius: [10, 13], jitter: 6, rot: true },
    { kind: 'bone_pile', radius: [12, 18], every: 3, jitter: 18 },
  ],
});

// DUNE RIDGES: a crescent of wind-combed sand (the discs fuse into a ridge).
registerFormation({
  id: 'dune_ridges', arrange: 'arc', span: [130, 240], step: 38,
  params: { sweep: 0.4 },
  pieces: [
    { kind: 'sand', radius: [24, 38], jitter: 10 },
  ],
});

// A CRYSTAL RUN: a lode line breaking the surface — brittle lattices strung
// between standing spires. (crystal_cluster/rock_spire, not the 'crystal'
// hazard kind: its laser is attached by its dedicated stamp, and a formation
// disc would be a beam-less fake. No fake-inert hazards.)
registerFormation({
  id: 'crystal_run', arrange: 'meander', span: [280, 520], step: 50,
  params: { wobble: 24 },
  pieces: [
    { kind: 'crystal_cluster', radius: [14, 20], jitter: 14 },
    { kind: 'rock_spire', radius: [14, 24], every: 3, jitter: 16, rot: true },
  ],
});

// A FUNGAL PROCESSION: glow-caps filing through the dark, toadstools between.
registerFormation({
  id: 'fungal_procession', arrange: 'meander', span: [260, 480], step: 42,
  params: { wobble: 30 },
  pieces: [
    { kind: 'glow_cap', radius: [9, 14], jitter: 12 },
    { kind: 'toadstool', radius: [11, 18], every: 2, jitter: 18, rot: true },
  ],
});

// A PALM STRAND: shade trees arcing along the swash line. Pair with a
// `where: {field:'shore', …}` band on the tileset entry.
registerFormation({
  id: 'palm_strand', arrange: 'arc', span: [140, 260], step: 56,
  params: { sweep: 0.35 },
  pieces: [
    { kind: 'palm', radius: [16, 26], jitter: 14, rot: true },
    { kind: 'brush', radius: [14, 22], every: 2, jitter: 24, rot: true },
  ],
});

// A BONE TRAIL: something dragged its kills the same way for years.
registerFormation({
  id: 'bone_trail', arrange: 'meander', span: [260, 460], step: 46,
  params: { wobble: 38 },
  pieces: [
    { kind: 'bone_pile', radius: [12, 20], jitter: 16, rot: true },
    { kind: 'web', radius: [18, 30], every: 3, jitter: 22 },
  ],
});

// --- GRID / ORBIT / BRAID (the second arranger wave) --------------------------

// AN ORCHARD: planted rows — someone tends these trees, or someone did.
// Serpentine grid anchors; the berry bushes fill every third plot.
registerFormation({
  id: 'orchard_grid', arrange: 'grid', span: [260, 420], step: 64,
  params: { rowGap: 68, aspect: 0.7 },
  pieces: [
    { kind: 'tree', radius: [13, 19], jitter: 8, rot: true },
    { kind: 'berry_bush', radius: [16, 24], every: 3, jitter: 20, rot: true },
  ],
});

// A TOMB LATTICE: the ordered quarter of a graveyard — plots in ranks, the
// bone piles where the ranks were disturbed.
registerFormation({
  id: 'tomb_lattice', arrange: 'grid', span: [200, 340], step: 54,
  params: { rowGap: 56, rows: [2, 4] },
  pieces: [
    { kind: 'tombstone', radius: [11, 15], jitter: 5 },
    { kind: 'bone_pile', radius: [12, 18], every: 5, jitter: 16, rot: true },
  ],
});

// A MENHIR ORBIT: concentric standing-stone rings — a worked sanctum, not a
// scatter. Sized to ring a composition clearing (inner ring stays OUTSIDE a
// reserved glade of ≤85 + piece slop; see data/compositions.ts stone_sanctum).
registerFormation({
  id: 'menhir_orbit', arrange: 'orbit', span: [125, 185], step: 62,
  params: { rings: [1, 2], innerFrac: 0.92 },
  pieces: [
    { kind: 'standing_stone', radius: [12, 20], jitter: 6, rot: true },
    { kind: 'grass', radius: [18, 28], every: 2, jitter: 22, rot: true },
  ],
});

// A TOADSTOOL COURT: fairy rings within rings, glow-caps holding the lanterns.
registerFormation({
  id: 'toadstool_court', arrange: 'orbit', span: [110, 155], step: 44,
  params: { rings: [1, 2], innerFrac: 0.95 },
  pieces: [
    { kind: 'toadstool', radius: [10, 16], jitter: 8, rot: true },
    { kind: 'glow_cap', radius: [8, 12], every: 2, jitter: 12 },
  ],
});

// A REED BRAID: two reed strands plaited down a waterline, drowned logs at
// the crossings. Pair with a `where: {field:'shore', …}` band.
registerFormation({
  id: 'reed_braid', arrange: 'braid', span: [300, 540], step: 40,
  params: { weave: 34, wavelength: 240 },
  pieces: [
    { kind: 'reeds', radius: [13, 22], jitter: 10, rot: true },
    { kind: 'sunken_log', radius: [15, 22], every: 5, jitter: 14, rot: true },
  ],
});

// A KELP BRAID: current-combed ropes of kelp, giant stalks where the strands
// cross.
registerFormation({
  id: 'kelp_braid', arrange: 'braid', span: [320, 560], step: 44,
  params: { weave: 40, wavelength: 260, strands: 3 },
  pieces: [
    { kind: 'kelp', radius: [15, 26], jitter: 10, rot: true },
    { kind: 'giant_kelp', radius: [24, 36], every: 4, jitter: 10 },
  ],
});

// A FULGURITE SCAR: the memory of a strike — glassed ground wandering under
// branched fulgurite, charged shards still lit, blooms sparking at the rim.
// All inert look-alikes (the no-fake-inert-hazards rule): the storm is over.
registerFormation({
  id: 'fulgurite_scar', arrange: 'meander', span: [300, 560], step: 46,
  params: { wobble: 30 },
  pieces: [
    { kind: 'storm_glass', radius: [16, 26], every: 2, jitter: 10, rot: true },
    { kind: 'fulgurite', radius: [11, 17], jitter: 9, rot: true },
    { kind: 'charged_crystal', radius: [9, 14], every: 2, jitter: 16, rot: true },
    { kind: 'static_bloom', radius: [10, 15], every: 2, jitter: 24 },
  ],
});
