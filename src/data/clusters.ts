// ---------------------------------------------------------------------------
// CLUSTER DEFS — composite set-pieces as pure data.
//
// A cluster is an ANCHOR (placed by the normal findSpot rules) plus PIECES
// scattered on a radial band around it, each piece obeying its own
// DOODAD_RULES row. One registerCluster call = a new multi-doodad formation
// any tileset/zone layout can roll via `{ kind: 'cluster', cluster: '<id>' }`
// — the data-driven generalization of the bespoke grove/thicket stamps.
// Rocks never generate inside one another here: pieces reject overlap with
// solids placed before them (the `packed` flag relaxes that only within the
// cluster's own pieces, for canopies that should read as one mass).
// ---------------------------------------------------------------------------

import { registerCluster } from '../engine/levelgen';

// A boulder field: a big anchor stone ringed by smaller shards — spread, never
// intersecting (the "rocks should not generate within one another" contract).
registerCluster({
  id: 'boulder_field',
  anchor: { radius: 30, kind: 'rock' },
  pieces: [
    { kind: 'rock', radius: [16, 34], count: [4, 7], ring: [40, 130], rot: true },
    { kind: 'rock', radius: [8, 14], count: [2, 5], ring: [60, 160], rot: true },
  ],
  poi: false,
});

// A pine stand: trees packed into one canopy mass over a brush understory.
registerCluster({
  id: 'stand_of_pines',
  anchor: { radius: 60, kind: 'tree' },
  pieces: [
    { kind: 'tree', radius: [14, 24], count: [5, 9], ring: [20, 95], packed: true, rot: true },
    { kind: 'brush', radius: [22, 38], count: [2, 4], ring: [30, 110], rot: true },
    { kind: 'grass', radius: [18, 30], count: [2, 4], ring: [50, 130] },
  ],
});

// A menhir ring: standing stones around a bare center worth fighting over.
registerCluster({
  id: 'menhir_ring',
  anchor: { radius: 90, kind: 'rock' },
  pieces: [
    { kind: 'rock', radius: [12, 18], count: [5, 8], ring: [78, 96], rot: true },
    { kind: 'grass', radius: [24, 40], count: [1, 2], ring: [0, 20] },
  ],
  poi: true,
});

// A KELP FOREST: giant stipes packed into one swaying canopy mass over an
// understory of frond beds — the thresher forest. Bodies weave between the
// stalks; the layered crowns above break sight both ways. Walk in, vanish.
registerCluster({
  id: 'kelp_forest',
  anchor: { radius: 36, kind: 'giant_kelp' },
  pieces: [
    { kind: 'giant_kelp', radius: [24, 38], count: [4, 7], ring: [30, 130], packed: true, rot: true },
    { kind: 'kelp', radius: [18, 30], count: [3, 5], ring: [40, 160], rot: true },
    { kind: 'sea_rock', radius: [14, 22], count: [0, 2], ring: [60, 170], rot: true },
  ],
});

// THE HELLFORGE WORKS: the demons' great forge-altar on its swept court —
// the monument at dead center (a composition CENTERPIECE: it stands inside
// the clearing that exists for it), braziers ringing the court's edge, the
// litter of the work (bone, titan chain) kept outside the sweep. Geometry
// contract with hellforge_landing's clearing (≤78): anvil ≤46 fits well
// inside; braziers ride ring 62-82 as centerpieces; litter starts ≥ 92.
registerCluster({
  id: 'hellforge_works',
  anchor: { radius: 64, kind: 'hellforge_anvil' },
  pieces: [
    { kind: 'hellforge_anvil', radius: [40, 46], count: [1, 1], ring: [0, 1], centerpiece: true },
    { kind: 'brazier', radius: [11, 14], count: [3, 4], ring: [62, 82], rot: true, centerpiece: true },
    { kind: 'bone_pile', radius: [13, 20], count: [2, 4], ring: [92, 150], rot: true },
    { kind: 'hell_chain', radius: [16, 24], count: [2, 3], ring: [92, 140], rot: true },
  ],
  poi: true,
});

// THE COLOSSUS CROWN: the fallen head itself, half-buried in what it shed
// coming down — the centerpiece stands inside the clearing minted for it
// (fallen_colossus composition; geometry contract with its pre-clearing).
registerCluster({
  id: 'colossus_crown',
  anchor: { radius: 24, kind: 'colossus_head' },
  pieces: [
    { kind: 'colossus_head', radius: [20, 26], count: [1, 1], ring: [0, 1], centerpiece: true },
    { kind: 'rubble', radius: [8, 14], count: [3, 5], ring: [34, 74], rot: true },
    { kind: 'scree', radius: [10, 16], count: [2, 4], ring: [44, 92], rot: true },
    { kind: 'broken_column', radius: [10, 15], count: [1, 3], ring: [50, 100], rot: true },
  ],
  poi: true,
});

// THE RUIN COURT (the jungle's sunken-ruin doorstep): the root-split descent
// at dead center — a SIDEZONE mouth (dwell to enter the halls below) — with
// the swallowed court's furniture around it: a toppled head, urns that
// sometimes answer, the colonnade's bones starting where the clearing ends.
// Geometry contract with sunken_ruin_site / temple_of_the_green clearings
// (max 84): centerpieces stay ≤ 52; litter rings start ≥ 104 (84 + piece 19).
registerCluster({
  id: 'ruin_court',
  anchor: { radius: 28, kind: 'ruin_gate' },
  pieces: [
    // The anchor names the SITING profile; the gate itself is the
    // centerpiece piece (the hellforge-anvil idiom).
    { kind: 'ruin_gate', radius: [26, 30], count: [1, 1], ring: [0, 1], centerpiece: true },
    { kind: 'colossus_head', radius: [16, 21], count: [1, 2], ring: [40, 52], rot: true, centerpiece: true },
    { kind: 'burial_urn', radius: [11, 15], count: [1, 3], ring: [34, 50], rot: true, centerpiece: true },
    { kind: 'broken_column', radius: [12, 17], count: [2, 4], ring: [104, 165], rot: true },
    { kind: 'ruin_plinth', radius: [12, 16], count: [1, 2], ring: [108, 170], rot: true },
    { kind: 'rubble', radius: [12, 20], count: [1, 3], ring: [108, 175], rot: true },
    { kind: 'jungle_bloom', radius: [10, 13], count: [0, 2], ring: [110, 180] },
  ],
  poi: true,
});
