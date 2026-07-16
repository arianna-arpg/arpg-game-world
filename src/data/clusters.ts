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

// THE HAVEN COURT: an inhabited oasis pocket — water at the heart, palms
// and awnings ringing it (real SHADE: the swelter loop's mercy, placeable),
// green only where the water's reach argues for it. The desert's one
// bargain: everything alive in the erg knows where this is. Geometry keeps
// the ruin-court contract (centerpieces ≤ 52 inside the pre-clearing).
registerCluster({
  id: 'haven_court',
  anchor: { radius: 30 },
  pieces: [
    { kind: 'water', radius: [58, 78], count: [1, 1], ring: [0, 1], centerpiece: true },
    // The damp margin (ONE broad mud lobe, not 'shallows' — that's a stamp
    // macro, not a piece kind; and not a ring of small discs — near-touch
    // pairs read as fuse misses to genqa): the pool's reach on the ground.
    { kind: 'mud', radius: [36, 50], count: [1, 1], ring: [44, 66], centerpiece: true },
    { kind: 'palm', radius: [16, 24], count: [3, 5], ring: [96, 150], rot: true },
    { kind: 'sun_awning', radius: [26, 34], count: [1, 2], ring: [110, 170], rot: true },
    { kind: 'grass', radius: [22, 34], count: [2, 3], ring: [90, 150] },
    { kind: 'reeds', radius: [12, 18], count: [2, 4], ring: [64, 100] },
    { kind: 'campfire', radius: [9, 11], count: [0, 1], ring: [118, 165] },
  ],
  poi: true,
});

// THE SUNKEN COURT: a village square the sands kept — column stubs and
// urns around the one lintel still holding a doorway DOWN (vault_gate =
// the sidezone mouth; 'vault_entered' is the gateway ledger).
registerCluster({
  id: 'sunken_court',
  anchor: { radius: 28, kind: 'vault_gate' },
  pieces: [
    { kind: 'vault_gate', radius: [26, 30], count: [1, 1], ring: [0, 1], centerpiece: true },
    { kind: 'burial_urn', radius: [11, 15], count: [1, 3], ring: [36, 52], rot: true, centerpiece: true },
    { kind: 'broken_column', radius: [12, 17], count: [3, 5], ring: [104, 170], rot: true },
    { kind: 'ruin_plinth', radius: [12, 16], count: [1, 2], ring: [108, 172], rot: true },
    { kind: 'rubble', radius: [12, 20], count: [2, 4], ring: [108, 178], rot: true },
    { kind: 'bone_pile', radius: [10, 16], count: [1, 3], ring: [112, 180] },
    { kind: 'sun_awning', radius: [24, 30], count: [0, 1], ring: [120, 176], rot: true },
  ],
  poi: true,
});

// THE SEPULCHER COURT: a tomb-dynasty forecourt the dunes never quite took —
// a processional of plinths and braziers converging on the gilt stair DOWN
// (sepulcher_gate = the sidezone mouth; 'sepulcher_entered' is the gateway
// ledger). Reads RICHER than the sunken court on purpose: somebody's rank
// survived the sand, and the votives are still lit.
registerCluster({
  id: 'sepulcher_court',
  anchor: { radius: 28, kind: 'sepulcher_gate' },
  pieces: [
    { kind: 'sepulcher_gate', radius: [26, 30], count: [1, 1], ring: [0, 1], centerpiece: true },
    { kind: 'brazier', radius: [8, 11], count: [2, 2], ring: [42, 56], rot: true, centerpiece: true },
    { kind: 'ruin_plinth', radius: [12, 16], count: [2, 4], ring: [96, 156], rot: true },
    { kind: 'broken_column', radius: [12, 17], count: [2, 4], ring: [110, 176], rot: true },
    { kind: 'burial_urn', radius: [11, 15], count: [2, 4], ring: [64, 110], rot: true },
    { kind: 'bone_pile', radius: [10, 16], count: [1, 3], ring: [118, 184] },
    { kind: 'sand', radius: [22, 34], count: [1, 2], ring: [120, 190] },
  ],
  poi: true,
});

// THE HEART COURT (the Sanguine's set-piece): the country's own heart at
// chamber scale — ONE colossal heart dead center, the blood it still pumps
// pooled at its foot (ONE broad lobe — the haven_court mud lesson), veins
// lacing the ground toward it, standing arteries paying out around it, and
// the pods that grew fat on the supply line.
registerCluster({
  id: 'heart_court',
  anchor: { radius: 48 },
  pieces: [
    { kind: 'colossal_heart', radius: [44, 56], count: [1, 1], ring: [0, 1], centerpiece: true },
    { kind: 'blood_pool', radius: [38, 52], count: [1, 1], ring: [58, 84], centerpiece: true },
    { kind: 'vein_cluster', radius: [24, 36], count: [3, 5], ring: [78, 130] },
    { kind: 'artery_stalk', radius: [11, 15], count: [2, 4], ring: [104, 156], rot: true },
    { kind: 'flesh_pod', radius: [18, 26], count: [2, 3], ring: [118, 168], rot: true },
    { kind: 'clot_mound', radius: [16, 24], count: [1, 3], ring: [122, 170], rot: true },
  ],
  poi: true,
});

// THE WEIR COURT (the Gutworks' set-piece): the tract's dam — a standing
// pool of bile banked behind a line of teeth breaking the surface, villi
// thick on the banks, polyps queued along the spill line, and the bones of
// what didn't finish dissolving.
registerCluster({
  id: 'weir_court',
  anchor: { radius: 40 },
  pieces: [
    { kind: 'chyme_pool', radius: [44, 60], count: [1, 1], ring: [0, 1], centerpiece: true },
    { kind: 'tooth_row', radius: [20, 28], count: [2, 3], ring: [64, 92], rot: true, centerpiece: true },
    { kind: 'villus_bed', radius: [24, 38], count: [2, 4], ring: [84, 140] },
    { kind: 'gas_polyp', radius: [10, 14], count: [2, 4], ring: [96, 150], rot: true },
    { kind: 'bone', radius: [12, 18], count: [1, 3], ring: [90, 148], rot: true },
    { kind: 'gut_knuckle', radius: [18, 28], count: [0, 2], ring: [110, 168], rot: true },
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

// THE BREACH COURT: the Sundering's mouth — the standing tear into the
// Underworld at dead center (hell_breach = the dimension gate the underworld
// entry's gateDoodad scan turns live), the Legion's tending-lights ringing
// it close, and the war's toll furniture starting where the clearing ends.
// Geometry contract with the_sundering's clearing (60-80): centerpiece
// rings ≤ 52; litter rings ≥ 104 (80 + piece ~22).
registerCluster({
  id: 'breach_court',
  anchor: { radius: 30, kind: 'hell_breach' },
  pieces: [
    { kind: 'hell_breach', radius: [28, 32], count: [1, 1], ring: [0, 1], centerpiece: true },
    { kind: 'hate_brazier', radius: [8, 10], count: [3, 4], ring: [38, 50], centerpiece: true },
    { kind: 'impaler_stake', radius: [10, 14], count: [3, 5], ring: [108, 170], rot: true },
    { kind: 'soul_cage', radius: [11, 15], count: [1, 3], ring: [112, 176], rot: true },
    { kind: 'bone_pile', radius: [12, 18], count: [2, 4], ring: [108, 178] },
    { kind: 'hate_glass', radius: [14, 22], count: [1, 3], ring: [116, 182], rot: true },
    { kind: 'demon_banner', radius: [11, 15], count: [0, 2], ring: [120, 180], rot: true },
  ],
  poi: true,
});
