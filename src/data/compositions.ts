// ---------------------------------------------------------------------------
// COMPOSITIONS — whole-zone coordinated bundles: one authored IDEA that several
// generation systems execute together around shared SITES. Where a formation
// is "stones in a ring", a composition is "a glade, ringed by standing stones,
// where the world runs cold" — the clearing (negative space), the orbit
// (formation), and the climate gate land as ONE pick, not three independent
// rolls that happen to miss each other.
//
// Grammar recap (engine/levelgen registerComposition):
//   sites   — named anchors resolved once per pick; entries reference them
//             via `at` (site-aware stamps: clearing/formation/cluster).
//   pre     — stamped BEFORE the zone's base layout (clearings first: the
//             reservation suppresses the whole scatter that follows).
//   post    — stamped AFTER the base layout + landmark/structure rolls, so
//             shore bands measure every liquid and pieces route around every
//             reservation.
//   when    — gates on the zone's BAKED geography (def.geo biomeDepth /
//             climate axes); zones missing the datum pass neutrally.
//
// Geometry note: a clearing at a site RESERVES its disc — an orbit at the
// same site must keep its inner ring OUTSIDE clearing radius + piece slop, or
// the ring's pieces reject. The paired defs below are tuned together (see
// menhir_orbit / toadstool_court in formations.ts).
//
// Wired via TilesetDef.compositions / BiomeInfo.compositions rolls; this
// module is side-effect imported by main.ts, sim/arena.ts, and balance/
// genqa.ts (the three-way "same game headless" contract).
// ---------------------------------------------------------------------------

import { registerComposition } from '../engine/levelgen';

// A STONE SANCTUM: an open glade ringed by worked menhirs — a fight arena the
// composition promises (the clearing keeps the scatter out; the stones keep
// the sightlines honest).
registerComposition({
  id: 'stone_sanctum',
  sites: [{ id: 'heart', radius: [170, 215] }],
  pre: [{ kind: 'clearing', at: 'heart', count: [1, 1], radius: [60, 85] }],
  post: [{ kind: 'formation', formation: 'menhir_orbit', at: 'heart', count: [1, 1] }],
});

// A FAIRY COURT: a hushed glade ringed by toadstools, glow-caps drifting in
// the dark patches beyond it.
registerComposition({
  id: 'fairy_court',
  sites: [{ id: 'glade', radius: [130, 170] }],
  pre: [{ kind: 'clearing', at: 'glade', count: [1, 1], radius: [50, 68] }],
  post: [
    { kind: 'formation', formation: 'toadstool_court', at: 'glade', count: [1, 1] },
    { kind: 'glow_cap', count: [2, 4], where: { field: 'noise', max: 0.4, params: { scale: 380, seed: 7 } } },
  ],
});

// ORCHARD ROWS: tended ground — planted ranks, a hedgerow windbreak, and a
// working lane kept clear of the wild scatter.
registerComposition({
  id: 'orchard_rows',
  pre: [{ kind: 'clearing', count: [1, 1], radius: [80, 120] }],
  post: [
    { kind: 'formation', formation: 'orchard_grid', count: [1, 2] },
    { kind: 'formation', formation: 'oak_hedgerow', count: [1, 1] },
  ],
});

// A BONEYARD COURT: the graveyard's ordered quarter — ranked plots around a
// bare ritual ground, a drag-trail leading away from it.
registerComposition({
  id: 'boneyard_court',
  sites: [{ id: 'court', radius: [150, 190] }],
  pre: [{ kind: 'clearing', at: 'court', count: [1, 1], radius: [55, 75] }],
  post: [
    { kind: 'formation', formation: 'tomb_lattice', at: 'court', count: [1, 1] },
    { kind: 'formation', formation: 'bone_trail', count: [1, 1] },
  ],
});

// A FROST HOLLOW: where the WORLD runs cold, a wind-scoured hollow rimmed by
// frost-heave teeth, drifts banked in the coldest folds. The `when` gate reads
// the climate baked at mint — the same tileset skips this bundle on its warm
// frontier and grows it deep in the cold.
// KNOWN-GOOD genqa warn: a drift seam can thread BETWEEN the arc's standing
// ice spikes and stay split a few px — the fuse correctly refuses to pour
// ground through a solid cluster (the desert war-camp precedent).
registerComposition({
  id: 'frost_hollow',
  when: { temperature: { max: 0.42 } },
  sites: [{ id: 'hollow', radius: [140, 180] }],
  // Clearing capped at 75 so the ice_teeth arc (radius ≥ 110, spike jitter
  // 12, r ≤ 20) always clears the reservation: 110−12 = 98 ≥ 75+20. The
  // drift pieces bank OUTWARD by design (their inward jitter still rejects —
  // the glade stays a glade).
  pre: [{ kind: 'clearing', at: 'hollow', count: [1, 1], radius: [60, 75] }],
  post: [
    { kind: 'formation', formation: 'ice_teeth', at: 'hollow', count: [1, 1] },
    { kind: 'snowdrift', count: [2, 4], where: { field: 'climate', params: { axis: 'temperature' }, max: 0.45 } },
  ],
});

// A DROWNED PROCESSION: braided reed-lines plaited down the waterline, wisps
// keeping their lights over the wet ground. Gated on a WET world; the braids
// themselves band to the shore of whatever water the zone actually poured.
registerComposition({
  id: 'drowned_procession',
  when: { moisture: { min: 0.45 } },
  post: [
    {
      kind: 'formation', formation: 'reed_braid', count: [1, 2],
      where: { field: 'shore', max: 0.6, params: { kinds: ['water', 'bog', 'swamp'], reach: 160 } },
    },
    {
      kind: 'marsh_wisp', count: [2, 4],
      where: { field: 'shore', max: 0.5, params: { kinds: ['water', 'bog', 'swamp'], reach: 140 } },
    },
  ],
});

// A KELP GYRE: current-plaited kelp ropes sweeping the open floor.
registerComposition({
  id: 'kelp_gyre',
  post: [{ kind: 'formation', formation: 'kelp_braid', count: [1, 2] }],
});

// AN IMPALER COURT: a bare ritual ground the legions keep swept — ringed by
// their warnings, titan chains crawling toward it out of the scorch. The
// clearing IS the arena; the stakes keep the sightlines honest.
registerComposition({
  id: 'impaler_court',
  sites: [{ id: 'court', radius: [150, 190] }],
  pre: [{ kind: 'clearing', at: 'court', count: [1, 1], radius: [58, 78] }],
  post: [
    { kind: 'formation', formation: 'impaler_ring', at: 'court', count: [1, 1] },
    { kind: 'hell_chain', count: [2, 4], where: { field: 'noise', max: 0.45, params: { scale: 420, seed: 13 } } },
  ],
});

// A CHARNEL ROTUNDA: the ossuary's swept ceremonial round — ribcage arches
// ringing a bare court (the boss ground the Necropolis keeps clear), bone
// drifts feathering off wherever the noise runs shallow. Geometry contract
// with rib_rotunda's inner ring — tune BOTH sides together.
registerComposition({
  id: 'charnel_rotunda',
  sites: [{ id: 'court', radius: [140, 180] }],
  pre: [{ kind: 'clearing', at: 'court', count: [1, 1], radius: [52, 70] }],
  post: [
    { kind: 'formation', formation: 'rib_rotunda', at: 'court', count: [1, 1] },
    { kind: 'bone_pile', count: [3, 5], where: { field: 'noise', max: 0.45, params: { scale: 420, seed: 29 } } },
  ],
});
