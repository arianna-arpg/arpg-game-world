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

// A POWDER CACHE: an abandoned munitions dump in a scratched-out clearing —
// kegs racked in a ring, shot pyramided, charge bundles still strapped. The
// kegs are brittle 'hit' bombs (their fume mints infernal_rift's eruption),
// so the cache is terrain-as-wager: cover that shoots back if you graze it.
registerComposition({
  id: 'powder_cache',
  sites: [{ id: 'dump', radius: [90, 130] }],
  pre: [{ kind: 'clearing', at: 'dump', count: [1, 1], radius: [42, 58] }],
  post: [{ kind: 'formation', formation: 'powder_cache', at: 'dump', count: [1, 1] }],
});

// A WAR CAMP: a muster ground stamped into its own clearing — a spiked
// fence punctuated by standards, and inside it the furniture of drill and
// mess (dummies that burst into straw, racks that clatter, a drum, a fire).
// The set dresses the fiction the packages act: warbands march OUT of
// grounds like these. The fence ring's step is generous by design — the
// gaps are the gates, so reachability never hinges on luck.
registerComposition({
  id: 'war_camp',
  sites: [{ id: 'muster', radius: [150, 200] }],
  pre: [{ kind: 'clearing', at: 'muster', count: [1, 1], radius: [95, 130] }],
  post: [
    { kind: 'formation', formation: 'muster_fence', at: 'muster', count: [1, 1] },
    { kind: 'formation', formation: 'camp_goods', at: 'muster', count: [1, 1] },
  ],
});

// THE HELLFORGE LANDING: where the River of Flame ends, the demons' great
// forge stands on its swept court — the terminus reward the underworld's
// course GUARANTEES (dimensions.ts rolls it at chance 1 on terminus zones;
// any hell tileset may also roll it rare). The clearing is the court; the
// hellforge_works cluster plants the monument INSIDE it (centerpiece
// pieces); a banner road walks the approach and the river's toll hangs in
// its galleries. Geometry contract with hellforge_works — tune together.
registerComposition({
  id: 'hellforge_landing',
  sites: [{ id: 'forge', radius: [150, 200] }],
  pre: [{ kind: 'clearing', at: 'forge', count: [1, 1], radius: [62, 78] }],
  post: [
    { kind: 'cluster', cluster: 'hellforge_works', at: 'forge', count: [1, 1] },
    { kind: 'formation', formation: 'banner_row', count: [1, 1] },
    { kind: 'formation', formation: 'soul_gallery', count: [0, 1] },
    { kind: 'bone_pile', count: [2, 4], where: { field: 'noise', max: 0.45, params: { scale: 420, seed: 41 } } },
  ],
});

// AN ENERGIST CACHE: a battery row in a swept work-yard — capacitor pylons
// strung in a line, live cells racked between them (brittle: struck, they
// spill their keeping as orbs), dead ones shed along the bank (the
// formation's own every-3 litter). The arcane sibling of the powder
// cache: terrain that PAYS when grazed instead of burning.
registerComposition({
  id: 'energist_cache',
  sites: [{ id: 'yard', radius: [100, 140] }],
  pre: [{ kind: 'clearing', at: 'yard', count: [1, 1], radius: [46, 62] }],
  post: [
    { kind: 'formation', formation: 'capacitor_bank', at: 'yard', count: [1, 1] },
  ],
});
