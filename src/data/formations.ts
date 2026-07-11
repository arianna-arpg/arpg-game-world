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
