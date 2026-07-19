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

// A WEALD COURT: a clearing ringed by watcher stones — the gaze fabric's
// set-piece in the petrified wood (stone_sanctum's grammar, but the stones
// LOOK BACK: theme.gaze lists watcher_stone, so standing in this court is
// the petrify pressure at its worst — and bursting a watcher TOLLS).
// Numeric contract: watcher_ring 130·0.92−6 = 113 ≥ clearing 80 + piece 19.
registerComposition({
  id: 'weald_court',
  sites: [{ id: 'court', radius: [150, 200] }],
  pre: [{ kind: 'clearing', at: 'court', count: [1, 1], radius: [55, 80] }],
  post: [{ kind: 'formation', formation: 'watcher_ring', at: 'court', count: [1, 1] }],
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

// --- The spelunker set-pieces (strata fabric — cave-face bundles) -----------
// A DRIPSTONE CATHEDRAL: a cleared nave under columns where floor met ceiling
// and fused — the cave granting itself one grand room (clearing 55–72 vs the
// column_ring orbit: 125·0.92−6 = 109 ≥ 72+22 — the menhir numeric contract).
registerComposition({
  id: 'dripstone_cathedral',
  sites: [{ id: 'nave', radius: [150, 195] }],
  pre: [{ kind: 'clearing', at: 'nave', count: [1, 1], radius: [55, 72] }],
  post: [{ kind: 'formation', formation: 'column_ring', at: 'nave', count: [1, 1] }],
});
// A GLOWWORM GROTTO: a still mere ringed by lure-light colonies — the dark's
// one lit commons, and everything in the cave knows the way to it.
registerComposition({
  id: 'glowworm_grotto',
  sites: [{ id: 'mere', radius: [130, 165] }],
  pre: [{ kind: 'clearing', at: 'mere', count: [1, 1], radius: [48, 62] }],
  post: [
    { kind: 'formation', formation: 'glowworm_court', at: 'mere', count: [1, 1] },
    { kind: 'glowworm_veil', count: [1, 3], where: { field: 'noise', max: 0.38, params: { scale: 420, seed: 11 } } },
  ],
});
// A HERMIT'S CAMP: some delver made a life down here, briefly — a fire ring
// and stores in a scraped-flat pocket, the kit still waiting.
registerComposition({
  id: 'hermits_camp',
  sites: [{ id: 'camp', radius: [95, 125] }],
  pre: [{ kind: 'clearing', at: 'camp', count: [1, 1], radius: [28, 36] }],
  post: [{ kind: 'formation', formation: 'hermits_rest', at: 'camp', count: [1, 1] }],
});

// THE MUMMERS' CAMP: a traveling show pitched at the wayside — cart, fire,
// benches toward the boards, mirror-glass practice shards, the troupe's
// colors up (the mimicry fabric's set-piece; the players themselves seat
// from the tileset table's Mummers rows). Clearing 30–40 vs the ring span
// 72–96: 72 − 14 = 58 ≥ 40 + 19 — the menhir numeric contract holds.
registerComposition({
  id: 'mummers_camp',
  sites: [{ id: 'stage', radius: [105, 140] }],
  pre: [{ kind: 'clearing', at: 'stage', count: [1, 1], radius: [30, 40] }],
  post: [{ kind: 'formation', formation: 'mummers_ring', at: 'stage', count: [1, 1] }],
});

// THE VACANT YARD: a cold effigy court where the empty kin drift — the
// possession seam's set-piece (data/formations 'vacant_ring'; the shells
// themselves seat from the tileset table's Vacant rows). Clearing 28–36 vs
// the ring span 76–100 per the menhir numeric contract on the formation.
registerComposition({
  id: 'vacant_yard',
  sites: [{ id: 'yard', radius: [100, 135] }],
  pre: [{ kind: 'clearing', at: 'yard', count: [1, 1], radius: [28, 36] }],
  post: [{ kind: 'formation', formation: 'vacant_ring', at: 'yard', count: [1, 1] }],
});

// A HIVE POCKET: the Seethe's brood ground — a stamped-flat court ringed by
// waxed spires, the insect country showing its crown. Clearing 58–72 vs the
// hive_ring orbit: 125·0.92−6 = 109 ≥ 72+22 — the menhir numeric contract.
registerComposition({
  id: 'hive_pocket',
  sites: [{ id: 'brood', radius: [170, 215] }],
  pre: [{ kind: 'clearing', at: 'brood', count: [1, 1], radius: [58, 72] }],
  post: [{ kind: 'formation', formation: 'hive_ring', at: 'brood', count: [1, 1] }],
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

// A RESONANCE COURT: swept ground ringed by a tuning circle — the crystal
// country's ritual set-piece; whoever tuned here kept the floor clean.
// Numeric contract: tuning_circle 130·0.92−8 = 112 ≥ clearing 85 + piece 20.
// (Pure decor — the ACTIVITY riddles are actor fixtures the puzzle placer
// stands up at load, engine/puzzles.ts; this composition is the country
// remembering that crystals get tuned.)
registerComposition({
  id: 'resonance_court',
  sites: [{ id: 'court', radius: [150, 200] }],
  pre: [{ kind: 'clearing', at: 'court', count: [1, 1], radius: [60, 85] }],
  post: [{ kind: 'formation', formation: 'tuning_circle', at: 'court', count: [1, 1] }],
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

// THE SUNDERING: the rare place the war never closed — a torn way STANDING
// OPEN into the Underworld. The breach court holds the tear (dwell it to
// cross; the underworld entry's gateDoodad scan makes it a true dimension
// gate), the Legion keeps the mouth lit and posted, and the titan chains
// crawl toward it out of the scorch. Deep-wound country only (biomeDepth) —
// and rare even there (the wasteland rolls it at 0.1): the surface rift is
// already a rare find, so the stacked odds make this a once-a-run story.
registerComposition({
  id: 'the_sundering',
  when: { biomeDepth: { min: 0.15 } },
  sites: [{ id: 'mouth', radius: [160, 200] }],
  pre: [{ kind: 'clearing', at: 'mouth', count: [1, 1], radius: [60, 80] }],
  post: [
    { kind: 'cluster', cluster: 'breach_court', at: 'mouth', count: [1, 1] },
    { kind: 'hell_chain', count: [2, 4], where: { field: 'noise', max: 0.45, params: { scale: 420, seed: 31 } } },
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

// THE FALLEN COLOSSUS: something vast broke here, long before the map had
// a name — the head half-buried in its own rubble at dead center, the
// colonnade it once crowned collapsed in a line across the wreck-field.
// The breaker pass's monument: everything with a bar breaks, given time.
registerComposition({
  id: 'fallen_colossus',
  sites: [{ id: 'wreck', radius: [150, 200] }],
  pre: [{ kind: 'clearing', at: 'wreck', count: [1, 1], radius: [85, 115] }],
  post: [
    { kind: 'cluster', cluster: 'colossus_crown', at: 'wreck', count: [1, 1] },
    { kind: 'formation', formation: 'colossus_wreck', at: 'wreck', count: [1, 1] },
  ],
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

// THE CISTERN COURT: the old blood-plumbing of barrow country — a stone
// cistern holding court over votive basins and offering urns, the dry
// runnels that once fed it ringing the yard. Someone built the dead a
// PUMP: the conduit pass's set dressing (the wardens that still tend such
// courts spawn from the same graves the fiction says they would). The
// runnel ring is inert glow, so the yard stays fully walkable by design.
registerComposition({
  id: 'cistern_court',
  sites: [{ id: 'court', radius: [120, 160] }],
  pre: [{ kind: 'clearing', at: 'court', count: [1, 1], radius: [70, 95] }],
  post: [
    { kind: 'formation', formation: 'cistern_ring', at: 'court', count: [1, 1] },
    { kind: 'formation', formation: 'runnel_ring', at: 'court', count: [1, 1] },
  ],
});

// THE BEASTWARDENS' STEADING: a working kennel yard out in wolf country —
// huts ringing the feed troughs, tether posts and pelt racks between, the
// whelping dens dug in out back. Nobody said the wardens still hold it:
// den_matron packs roam these same biomes (the tileset tables), and a
// matron denned in a steading is exactly the fight the fiction promises —
// she drinks, the pack drinks (MonsterDef.sympathy).
registerComposition({
  id: 'beastwardens_steading',
  sites: [
    { id: 'yard', radius: [110, 150] },
    { id: 'dens', radius: [70, 100] },
  ],
  pre: [{ kind: 'clearing', at: 'yard', count: [1, 1], radius: [70, 95] }],
  post: [
    { kind: 'formation', formation: 'wardens_kennels', at: 'yard', count: [1, 1] },
    { kind: 'formation', formation: 'whelping_hollow', at: 'dens', count: [1, 1] },
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

// HANGMAN'S HILL: a bare rise where the wood keeps its sentences — the drop
// cleared at the heart, gibbets (and the gallows among them) ringing it,
// the graves of the sentenced in rows somewhere below. The Gloamwood's
// court; geometry pairs gallows_court's orbit with the ≤72 clearing.
registerComposition({
  id: 'hangmans_hill',
  sites: [{ id: 'drop', radius: [150, 200] }],
  pre: [{ kind: 'clearing', at: 'drop', count: [1, 1], radius: [55, 72] }],
  post: [
    { kind: 'formation', formation: 'gallows_court', at: 'drop', count: [1, 1] },
    { kind: 'formation', formation: 'gravestone_rows', count: [1, 2] },
  ],
});

// THE WITCH'S CROFT: a worked plot the wood grew back over — pumpkin ranks
// around a swept yard, bales and a cart nobody hitched again, lanterns
// someone STILL carves. Wrong in the way tended things are wrong where no
// tender lives.
registerComposition({
  id: 'witchs_croft',
  pre: [{ kind: 'clearing', count: [1, 1], radius: [70, 100] }],
  post: [
    { kind: 'formation', formation: 'pumpkin_rows', count: [1, 2] },
    { kind: 'scarecrow', count: [1, 2] },
    { kind: 'hay_bale', count: [1, 3] },
    { kind: 'broken_cart', count: [0, 1] },
    { kind: 'jack_o_lantern', count: [1, 3] },
    { kind: 'mushroom_ring', count: [0, 1] },
  ],
});

// THE CHOIR RING (the Aetherial): a cleared court of bowed marble ringing
// whatever the Host still mourns — statues facing the center, crystals
// gleaming between them, a bell to mark hours nobody keeps anymore.
registerComposition({
  id: 'choir_ring',
  sites: [{ id: 'court', radius: [140, 190] }],
  pre: [{ kind: 'clearing', at: 'court', count: [1, 1], radius: [60, 85] }],
  post: [
    { kind: 'formation', formation: 'choir_statues', at: 'court', count: [1, 1] },
    { kind: 'prayer_bell', count: [1, 2] },
  ],
});

// THE HARP GALLERY (the Aetherial): a strung arcade crossing the shelf,
// dream-blossoms drifting along its feet — the wind's own instrument.
registerComposition({
  id: 'harp_gallery',
  sites: [{ id: 'walk', radius: [150, 210] }],
  pre: [{ kind: 'clearing', at: 'walk', count: [1, 1], radius: [55, 75] }],
  post: [
    { kind: 'formation', formation: 'harp_arcade', at: 'walk', count: [1, 2] },
    { kind: 'flowers', count: [1, 2] },
  ],
});

// THE VAULT OF DAWN (the Firmament): the sanctum's crowned court — statues
// and crystal ringing the treasure the crossing was for.
registerComposition({
  id: 'vault_of_dawn',
  sites: [{ id: 'vault', radius: [150, 200] }],
  pre: [{ kind: 'clearing', at: 'vault', count: [1, 1], radius: [70, 95] }],
  post: [
    { kind: 'formation', formation: 'choir_statues', at: 'vault', count: [1, 1] },
    { kind: 'formation', formation: 'harp_arcade', at: 'vault', count: [0, 1] },
    { kind: 'aether_crystal', count: [2, 4] },
  ],
});

// THE VANE COURT (the Driftways): the drift-folk's compass rose — totems
// ringing a cleared reading of the wind, crystal glinting between them.
registerComposition({
  id: 'vane_court',
  sites: [{ id: 'court', radius: [130, 180] }],
  pre: [{ kind: 'clearing', at: 'court', count: [1, 1], radius: [55, 80] }],
  post: [
    { kind: 'formation', formation: 'totem_ring', at: 'court', count: [1, 1] },
    { kind: 'aether_crystal', count: [1, 2] },
  ],
});

// THE CHIME GALLERY (the Driftways): a wandering walk of aeolian chimes on
// an anchor isle — stand here long enough and the gusts announce themselves
// in song before they ever reach you.
registerComposition({
  id: 'chime_gallery',
  sites: [{ id: 'walk', radius: [140, 200] }],
  pre: [{ kind: 'clearing', at: 'walk', count: [1, 1], radius: [50, 70] }],
  post: [
    { kind: 'formation', formation: 'chime_walk', at: 'walk', count: [1, 2] },
    { kind: 'sky_lantern', count: [1, 2] },
  ],
});

// THE SUNKEN RUIN: the jungle swallowed a civilization, and sometimes a court
// of it stays chewable — a cleared old floor, the root-split GATE down into
// its halls (a sidezone mouth: linger to descend), idols and urns the roots
// kept, the collapsed colonnade marching off down the road the green ate.
registerComposition({
  id: 'sunken_ruin_site',
  sites: [{ id: 'court', radius: [150, 190] }],
  pre: [{ kind: 'clearing', at: 'court', count: [1, 1], radius: [56, 72] }],
  post: [
    { kind: 'cluster', cluster: 'ruin_court', at: 'court', count: [1, 1] },
    { kind: 'formation', formation: 'colossus_wreck', count: [1, 1] },
  ],
});

// THE TEMPLE OF THE GREEN: DEEP in the jungle's heart (the biomeDepth gate —
// the region's rim keeps its modest courts), the ruin is a PRECINCT: a wider
// sanctum floor, colonnades in two runs, urn stores against the growth. The
// deeper you push, the more of the old city the green admits to keeping.
registerComposition({
  id: 'temple_of_the_green',
  when: { biomeDepth: { min: 0.45 } },
  sites: [{ id: 'precinct', radius: [170, 215] }],
  pre: [{ kind: 'clearing', at: 'precinct', count: [1, 1], radius: [66, 84] }],
  post: [
    { kind: 'cluster', cluster: 'ruin_court', at: 'precinct', count: [1, 1] },
    { kind: 'formation', formation: 'colossus_wreck', count: [1, 2] },
    { kind: 'burial_urn', count: [2, 4], where: { field: 'radial', max: 0.55 } },
    { kind: 'rubble', count: [1, 3], where: { field: 'noise', max: 0.4, params: { scale: 420, seed: 11 } } },
  ],
});

// --- THE DESERT'S LOST PLACES ------------------------------------------------
// Three pocket stories the sands tell (the dune country's compositions —
// every one a cleared site the dunefield recipe's ridge masks route around).

// THE OASIS HAVEN: the inhabited pocket — water, palms, cloth shade (real
// relief: the swelter loop reads the awnings and crowns), a cold campfire
// whose owners are a matter of timing. Where there is water there is an
// ambush eventually; the packs know the bargain too.
registerComposition({
  id: 'oasis_haven',
  sites: [{ id: 'well', radius: [150, 190] }],
  pre: [{ kind: 'clearing', at: 'well', count: [1, 1], radius: [58, 76] }],
  post: [
    { kind: 'cluster', cluster: 'haven_court', at: 'well', count: [1, 1] },
    // The green STOPS where the water's argument does (shore strata).
    { kind: 'grass', count: [1, 3], where: { field: 'shore', max: 0.5, params: { kinds: ['water'], reach: 260 } } },
    { kind: 'palm', count: [0, 2], where: { field: 'shore', max: 0.4, params: { kinds: ['water'], reach: 240 } } },
  ],
});

// THE BURIED VILLAGE: a settlement the sands took back — column stubs, urns,
// and one lintel still holding its doorway DOWN (the vault_gate sidezone;
// entering sets the 'vault_entered' ledger — the desert's gateway seam).
// Deeper country remembers more of it (the biomeDepth gate).
registerComposition({
  id: 'buried_village',
  when: { biomeDepth: { min: 0.35 } },
  sites: [{ id: 'square', radius: [160, 200] }],
  pre: [{ kind: 'clearing', at: 'square', count: [1, 1], radius: [60, 80] }],
  post: [
    { kind: 'cluster', cluster: 'sunken_court', at: 'square', count: [1, 1] },
    { kind: 'rubble', count: [2, 4], where: { field: 'radial', max: 0.6 } },
    { kind: 'broken_column', count: [1, 3], where: { field: 'noise', max: 0.42, params: { scale: 380, seed: 23 } } },
  ],
});

// THE SEPULCHER SITE: a tomb-dynasty forecourt the deep desert never buried
// all the way — plinth processional, tended votives, and the gilt stair DOWN
// into the Sepulcher Sands (the sepulcher_gate sidezone; entering sets
// 'sepulcher_entered' — the dynasty's gateway seam, and the Unsealing's).
// Deeper country than the buried village: the dynasty interred its estates
// where the erg runs oldest.
registerComposition({
  id: 'sepulcher_site',
  when: { biomeDepth: { min: 0.45 } },
  sites: [{ id: 'forecourt', radius: [160, 200] }],
  pre: [{ kind: 'clearing', at: 'forecourt', count: [1, 1], radius: [60, 80] }],
  post: [
    { kind: 'cluster', cluster: 'sepulcher_court', at: 'forecourt', count: [1, 1] },
    { kind: 'bone_pile', count: [1, 3], where: { field: 'radial', max: 0.6 } },
    { kind: 'ruin_plinth', count: [1, 2], where: { field: 'noise', max: 0.4, params: { scale: 360, seed: 41 } } },
  ],
});

// --- THE MOUNTAIN'S REST -----------------------------------------------------

// THE DROVER WAYSTATION: the climb's rest stop — a cleared bench, the
// sheltering stone and its FIRE. From the foothills up, warmth is a PLACE
// (the windchill loop reads the campfire's warms rule): the composition
// teaches the counterplay the crown will demand, one waystation at a time.
registerComposition({
  id: 'drover_waystation',
  sites: [{ id: 'rest', radius: [110, 150] }],
  pre: [{ kind: 'clearing', at: 'rest', count: [1, 1], radius: [50, 66] }],
  post: [
    { kind: 'cluster', cluster: 'waystation_court', at: 'rest', count: [1, 1] },
  ],
});

// THE CARAVAN GRAVEYARD: the trade that stopped mid-stride — a wreck line
// keeled over in file, urns spilled between (brittle: looting pays, and
// sometimes objects), vultures' leavings everywhere. No gate, no relief:
// just the road's argument, lost.
registerComposition({
  id: 'caravan_graveyard',
  sites: [{ id: 'span', radius: [120, 160] }],
  pre: [{ kind: 'clearing', at: 'span', count: [1, 1], radius: [44, 60] }],
  post: [
    { kind: 'formation', formation: 'caravan_wreck', at: 'span', count: [1, 1] },
    { kind: 'bone_pile', count: [1, 3], where: { field: 'radial', max: 0.6 } },
  ],
});

// THE HEART CHAMBER (the Sanguine's lost place): somewhere in the middle
// depths, the reason the whole country beats — the colossal heart in its
// court, gore trailing off toward wherever the supply line ran. Stand and
// listen, or kill your way through the court that grew fat beside it.
registerComposition({
  id: 'heart_chamber',
  sites: [{ id: 'chamber', radius: [140, 180] }],
  pre: [{ kind: 'clearing', at: 'chamber', count: [1, 1], radius: [70, 90] }],
  post: [
    { kind: 'cluster', cluster: 'heart_court', at: 'chamber', count: [1, 1] },
    { kind: 'gore', count: [1, 3], where: { field: 'radial', max: 0.6 } },
  ],
});

// THE CHYME WEIR (the Gutworks' lost place): where the tract's flow banks
// up behind a dam of teeth — the waterline strewn with what didn't finish
// dissolving (shore strata off the weir's own standing bile; a SECOND pool
// on the band read as a fuse miss to genqa — the haven_court mud lesson,
// relearned in bile: one body of standing liquid per court).
registerComposition({
  id: 'chyme_weir',
  sites: [{ id: 'weir', radius: [130, 170] }],
  pre: [{ kind: 'clearing', at: 'weir', count: [1, 1], radius: [64, 84] }],
  post: [
    { kind: 'cluster', cluster: 'weir_court', at: 'weir', count: [1, 1] },
    { kind: 'bone', count: [1, 3], where: { field: 'shore', max: 0.5, params: { kinds: ['chyme_pool'], reach: 200 } } },
  ],
});

// THE CARVEN RING: the harvest-folk's festival ground found lit and swept —
// the wicker patron and its lantern ring (carven_court's numeric contract:
// clearing ≤76, outer pieces from 102), a procession of carved totems
// wandering off toward whatever the court walks to at dusk.
registerComposition({
  id: 'carven_ring',
  sites: [{ id: 'ring', radius: [140, 180] }],
  pre: [{ kind: 'clearing', at: 'ring', count: [1, 1], radius: [60, 76] }],
  post: [
    { kind: 'cluster', cluster: 'carven_court', at: 'ring', count: [1, 1] },
    { kind: 'formation', formation: 'lantern_procession', count: [0, 1] },
  ],
});

// THE MANOR GROUNDS: the estate whole, as ONE authored idea — the house
// seated on the composition's own site (the structure stamp is site-aware
// for exactly this), its yard held open by the pre-clearing, the wrought
// boundary and the garden walks laid around it. Fence pieces landing inside
// the house's reserved rect stand down piece by piece — the boundary decays
// exactly where the manor already won the ground, which is how hundred-year
// fences read.
registerComposition({
  id: 'manor_grounds',
  sites: [{ id: 'grounds', radius: [200, 250], hard: true }],
  pre: [{ kind: 'clearing', at: 'grounds', count: [1, 1], radius: [150, 190] }],
  post: [
    { kind: 'structure', structure: 'gloam_manor', at: 'grounds', count: [1, 1] },
    { kind: 'formation', formation: 'iron_boundary', at: 'grounds', count: [1, 2] },
    { kind: 'formation', formation: 'topiary_walk', count: [1, 2] },
    { kind: 'lych_gate', count: [0, 1] },
    { kind: 'well', count: [0, 1] },
    { kind: 'lantern_post', count: [2, 4] },
  ],
});

// THE FAMILY PLOT: the estate's dead, kept the way estates keep them — the
// mausoleum court on cleared ground (its door mints the ossuary below),
// stone rows radiating, the iron boundary somewhere off in the trees.
registerComposition({
  id: 'family_plot',
  sites: [{ id: 'plot', radius: [150, 190] }],
  pre: [{ kind: 'clearing', at: 'plot', count: [1, 1], radius: [60, 76] }],
  post: [
    { kind: 'cluster', cluster: 'mausoleum_court', at: 'plot', count: [1, 1] },
    { kind: 'formation', formation: 'gravestone_rows', count: [1, 2] },
    { kind: 'formation', formation: 'iron_boundary', count: [0, 1] },
  ],
});

// --- THE SETTLED BELT ---------------------------------------------------------

// THE HARVEST STEADING: a working farm as ONE idea — the house on its cleared
// yard, the barn off across the track, fences binding the wheat, the well
// where the yard meets the lane. The farmland's signature composition.
registerComposition({
  id: 'harvest_steading',
  sites: [
    { id: 'house', radius: [110, 150], hard: true },
    { id: 'barn', radius: [120, 160] },
  ],
  pre: [{ kind: 'clearing', at: 'house', count: [1, 1], radius: [90, 120] }],
  post: [
    { kind: 'structure', structure: 'cottage', at: 'house', count: [1, 1] },
    { kind: 'structure', structure: 'hay_barn', at: 'barn', count: [0, 1] },
    { kind: 'formation', formation: 'fence_line', count: [1, 2] },
    { kind: 'cluster', cluster: 'wheat_field', count: [1, 2] },
    { kind: 'hay_bale', count: [1, 3] },
    { kind: 'well', count: [0, 1] },
    { kind: 'scarecrow', count: [0, 1] },
  ],
});

// THE GOBLIN WARREN CAMP: the hovel blueprint re-skinned showing NATIVE — a
// staked hut on trodden ground, the warband's fire and litter, deep-grove
// squatters where the shire's poorest cousin would stand (the reskin
// doctrine's proof: one plan, two countries).
registerComposition({
  id: 'goblin_warren_camp',
  sites: [{ id: 'camp', radius: [140, 180] }],
  pre: [{ kind: 'clearing', at: 'camp', count: [1, 1], radius: [100, 130] }],
  post: [
    { kind: 'structure', structure: 'goblin_hut', at: 'camp', count: [1, 1] },
    { kind: 'structure', structure: 'goblin_hut', count: [0, 1] },
    { kind: 'camp', count: [1, 1] },
    { kind: 'bone_pile', count: [1, 3] },
    { kind: 'banner_post', count: [0, 2] },
  ],
});
