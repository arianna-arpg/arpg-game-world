// ---------------------------------------------------------------------------
// THE GROVE KIT — content for the Grove country (the FIRST country: the
// starter wood whose thesis is the DAY/NIGHT INVERSION — a gentle sunlit
// grove that KINDLES at dusk: firefly tides rising, lantern-flora opening,
// the glimmerkin out dancing, and one light in the low country that lies).
//
// Everything here is registry rows on existing fabrics (the garden.ts
// doctrine): doodad rules + stamps, one formation, set-piece clusters and
// compositions. No engine edits. Painters live in render/vis/
// paintersGrove.ts (the paintersGarden contract); visuals in
// data/doodadVisuals.ts; the faces in data/tilesets.ts; the glimmerkin in
// data/monsters.ts; the den door in data/sidezones.ts; the night machinery
// (conditioned pours, breathing lights, the fireflies ambient) rides the
// generic levers in engine/lite.ts, render/vis/lights.ts and
// render/vis/ambientFx.ts.
// ---------------------------------------------------------------------------

import {
  registerCluster, registerComposition, registerDoodadRule, registerFormation,
  registerStamp, stampSingle,
} from '../engine/levelgen';

// --- THE LANTERN FLORA --------------------------------------------------------
// The lantern bloom: a knee-high paper-lantern flower that opens for the
// dark — by day a shut green bud, by night a true LIGHT on the light layer
// (the radiance-breathing visuals row: at1 ≈ 0 — noon puts it out). The
// grove's paths after dusk are these, and everything they attract.
registerDoodadRule('lantern_bloom', {
  overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 26,
  mutable: true, fuel: 'kindling',
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp', 'ice'],
});
registerStamp('lantern_bloom', stampSingle('lantern_bloom', [10, 16]));

// The hollow bole: a great dead tree open at the root — the grove's way
// DOWN (the glowworm_hollow composition plants it; data/sidezones.ts
// registers the door into the gleamhollow). Trigger, not terrain.
registerDoodadRule('hollow_bole', { overlap: 'trigger', spacing: 300 });
registerStamp('hollow_bole', stampSingle('hollow_bole', [26, 34]));

// --- FORMATIONS ---------------------------------------------------------------
// A lantern ring: blooms and glow-caps pacing a loose round — the grove's
// own street lighting, grown where nobody planted it. Dark by day; the
// dusk switches the whole formation ON through the light layer.
registerFormation({
  id: 'lantern_ring', arrange: 'orbit', span: [110, 170], step: 48,
  params: { rings: 1 },
  pieces: [
    { kind: 'lantern_bloom', radius: [10, 15], jitter: 12 },
    { kind: 'glow_cap', radius: [8, 12], every: 2, jitter: 12 },
    { kind: 'fern', radius: [10, 16], every: 3, jitter: 16 },
  ],
});

// --- SET-PIECE CLUSTERS -------------------------------------------------------
// The lantern tree: one elder crown over a courtyard of lights — where the
// vale's tides roost out the day and rise at dusk. Ring contract: clearing
// [56,76] + fattest ring piece (16) → rings start ≥ 100.
registerCluster({
  id: 'lantern_tree_court',
  anchor: { radius: 40 },
  pieces: [
    { kind: 'ancient_tree', count: [1, 1], radius: [30, 38], ring: [0, 6], centerpiece: true },
    { kind: 'lantern_bloom', count: [4, 6], radius: [10, 16], ring: [100, 150] },
    { kind: 'glow_cap', count: [2, 4], radius: [8, 12], ring: [96, 150] },
    { kind: 'log', count: [0, 1], radius: [16, 24], ring: [104, 150], rot: true },
  ],
  poi: true,
});
// The bole court: the hollow way down and the lights that keep its door.
registerCluster({
  id: 'bole_court',
  anchor: { radius: 40 },
  pieces: [
    { kind: 'hollow_bole', count: [1, 1], radius: [26, 34], ring: [0, 6], centerpiece: true },
    { kind: 'glow_cap', count: [3, 5], radius: [8, 12], ring: [100, 150] },
    { kind: 'fern', count: [2, 3], radius: [10, 16], ring: [96, 148] },
    { kind: 'lantern_bloom', count: [1, 3], radius: [10, 14], ring: [102, 152] },
  ],
  poi: true,
});

// --- COMPOSITIONS -------------------------------------------------------------
// THE LANTERN GLADE: the vale's commons — one elder tree in a cleared
// round, its court of blooms, and drifted lights beyond. Where a night
// pour lands nearby, this is the dance floor.
registerComposition({
  id: 'lantern_glade',
  sites: [{ id: 'glade', radius: [130, 170], hard: true }],
  pre: [{ kind: 'clearing', at: 'glade', count: [1, 1], radius: [56, 76] }],
  post: [
    { kind: 'cluster', cluster: 'lantern_tree_court', at: 'glade', count: [1, 1] },
    { kind: 'formation', formation: 'lantern_ring', count: [0, 1] },
    { kind: 'glow_cap', count: [1, 3], where: { field: 'noise', max: 0.4, params: { scale: 380, seed: 23 } } },
  ],
});
// THE GLOWWORM HOLLOW: where the country goes DOWN — the dead bole in its
// cleared court, silk-lit; the door mints the gleamhollow (sidezones.ts),
// and the False Sovereign holds the bottom of the light.
registerComposition({
  id: 'glowworm_hollow',
  sites: [{ id: 'bole', radius: [130, 170], hard: true }],
  pre: [{ kind: 'clearing', at: 'bole', count: [1, 1], radius: [56, 76] }],
  post: [
    { kind: 'cluster', cluster: 'bole_court', at: 'bole', count: [1, 1] },
    { kind: 'glow_cap', count: [1, 2], where: { field: 'noise', max: 0.38, params: { scale: 420, seed: 31 } } },
  ],
});
