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
