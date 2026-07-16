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

import { registerDoodadRule, registerFormation, registerStamp, stampSingle } from '../engine/levelgen';

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

// A FIN RIDGE: chitin blade-plates marching in a dorsal line — the Caul's
// spine showing through hell's skin — nerve roots webbing between them.
registerFormation({
  id: 'fin_ridge', arrange: 'meander', span: [300, 560], step: 46,
  params: { wobble: 26 },
  pieces: [
    { kind: 'chitin_fin', radius: [16, 30], jitter: 10, rot: true },
    { kind: 'nerve_root', radius: [18, 26], every: 2, jitter: 24 },
  ],
});

// A SAC CLUTCH: egg-sacs huddled around a maw — the nursery arrangement
// nobody wants to interrupt (and the biome makes you: sacs pop to a press).
registerFormation({
  id: 'sac_clutch', arrange: 'ring', span: [110, 190], step: 40,
  pieces: [
    { kind: 'caul_sac', radius: [12, 20], jitter: 12 },
    { kind: 'caul_eyes', radius: [12, 16], every: 3, jitter: 18 },
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

// A HERBALIST'S CROFT: the brew-yard — racks and stills ringing the work,
// a cauldron or two among them, the day's pots where they were set down.
// The apothecary kit as one reusable arrangement (gloamwood witches, wayside
// healers, any camp a tileset hands it to).
registerFormation({
  id: 'herbalists_croft', arrange: 'ring', span: [120, 190], step: 46,
  pieces: [
    { kind: 'herb_rack', radius: [12, 16], jitter: 10, rot: true },
    { kind: 'alembic', radius: [10, 13], every: 3, jitter: 14 },
    { kind: 'cauldron', radius: [12, 16], every: 5, jitter: 12 },
    { kind: 'clay_pots', radius: [10, 14], every: 4, jitter: 20 },
  ],
});

// --- THE BEASTWARDENS' STEADING (the keeper kit) ------------------------------
// Doodad semantics registered beside their arrangement (the open
// registerDoodadRule seam): huts are honest low cover, troughs and racks
// are waist-high work furniture (oblong hit surfaces — collide as drawn),
// tether posts are walkable clutter you kick through. The yard reads as a
// working kennel — or what the wild left of one (den_matron packs roam the
// same biomes; see beastwardens_steading in compositions.ts).
registerDoodadRule('kennel_hut', {
  overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 64,
  surface: { hw: 0.95, hh: 0.85 },
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
});
registerDoodadRule('feeding_trough', {
  overlap: 'solid', blocksMove: true, spacing: 42,
  surface: { hw: 1.0, hh: 0.42 },
});
registerDoodadRule('tether_post', { overlap: 'inert', spacing: 26 });
registerDoodadRule('pelt_rack', {
  overlap: 'solid', blocksMove: true, spacing: 42,
  surface: { hw: 1.0, hh: 0.3 },
});
registerDoodadRule('whelping_den', {
  overlap: 'solid', blocksMove: true, spacing: 52,
  forbidOn: ['water', 'lava', 'chasm'],
});

// The kennel yard proper: huts ringing the feed, posts and racks between.
registerFormation({
  id: 'wardens_kennels', arrange: 'ring', span: [130, 210], step: 52,
  pieces: [
    { kind: 'kennel_hut', radius: [16, 22], jitter: 8, rot: true },
    { kind: 'tether_post', radius: [7, 9], every: 2, jitter: 16 },
    { kind: 'feeding_trough', radius: [12, 16], every: 3, jitter: 10, rot: true },
    { kind: 'hay_bale', radius: [12, 16], every: 4, jitter: 18 },
    { kind: 'pelt_rack', radius: [12, 15], every: 5, jitter: 12, rot: true },
  ],
});

// The dens out back: strawed mounds and old gnawed bones in a loose arc.
registerFormation({
  id: 'whelping_hollow', arrange: 'arc', span: [90, 150], step: 40,
  pieces: [
    { kind: 'whelping_den', radius: [14, 20], jitter: 12 },
    { kind: 'bone_pile', radius: [10, 14], every: 2, jitter: 20 },
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

// A MANGROVE GALLERY: the tangle's channel wall — stilt trees shoulder to
// shoulder, rush beds at their roots. Ride it with a `where:{field:'shore'}`
// band so the gallery hugs the channels an earlier entry poured.
registerFormation({
  id: 'mangrove_gallery', arrange: 'meander', span: [320, 600], step: 48,
  params: { wobble: 34 },
  pieces: [
    { kind: 'mangrove', radius: [20, 30], jitter: 14 },
    { kind: 'reeds', radius: [14, 24], every: 2, jitter: 20, rot: true },
  ],
});

// A WRACK LINE: the strand's high-tide signature — dried kelp heaped in a
// long drift, driftwood among it (shore-banded like the reed shoreline).
registerFormation({
  id: 'wrack_line', arrange: 'meander', span: [300, 560], step: 44,
  params: { wobble: 26 },
  pieces: [
    { kind: 'kelp_wrack', radius: [16, 28], jitter: 14, rot: true },
    { kind: 'log', radius: [12, 18], every: 3, jitter: 20, rot: true },
  ],
});

// A SALT TERRACE: the pan's eroded court — wind-cut pillars stepping an arc
// over bleached reef heads (the drained seabed remembering itself).
registerFormation({
  id: 'salt_terrace', arrange: 'arc', span: [130, 240], step: 52,
  params: { sweep: 0.5 },
  pieces: [
    { kind: 'salt_pillar', radius: [10, 16], jitter: 10, rot: true },
    { kind: 'bleached_coral', radius: [13, 22], every: 2, jitter: 18, rot: true },
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

// --- THE WAR-WOUND GRAMMAR (the surface rift) ----------------------------------

// A GIBBET ROAD: the toll the Legion posted on its way through — cages and
// stakes pacing a wandering war-road, bones where the toll was paid.
registerFormation({
  id: 'gibbet_road', arrange: 'meander', span: [360, 640], step: 78,
  params: { wobble: 26 },
  pieces: [
    { kind: 'soul_cage', radius: [11, 15], jitter: 10, rot: true },
    { kind: 'impaler_stake', radius: [10, 14], every: 2, jitter: 14, rot: true },
    { kind: 'bone_pile', radius: [12, 18], every: 3, jitter: 22 },
  ],
});

// HATE-LIGHTS: braziers burning cold green down a dead-straight march —
// somebody keeps these lit, and it is nobody you want to meet.
registerFormation({
  id: 'hate_lights', arrange: 'line', span: [320, 560], step: 96,
  pieces: [
    { kind: 'hate_brazier', radius: [8, 11], jitter: 6 },
    { kind: 'demon_banner', radius: [11, 15], every: 3, jitter: 16, rot: true },
  ],
});

// A RENT RUN: the wound showing through — hate-lit ground tears chained into
// a wandering scar, the vitrified glass jutting where the crust let go.
registerFormation({
  id: 'rent_run', arrange: 'meander', span: [360, 620], step: 54,
  params: { wobble: 34 },
  pieces: [
    { kind: 'hate_rent', radius: [16, 26], jitter: 6, rot: 'chain' },
    { kind: 'hate_glass', radius: [14, 24], every: 3, jitter: 20, rot: true },
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

// --- The spelunker kit's set-pieces (strata fabric) -------------------------
// A STALAGMITE RUN: a drip-line of stone teeth marching where the ceiling
// weeps — the cave's own fence, gaps a body can thread.
registerFormation({
  id: 'stalagmite_run', arrange: 'meander', span: [260, 480], step: 46,
  params: { wobble: 26 },
  pieces: [
    { kind: 'stalagmite', radius: [13, 22], jitter: 12 },
    { kind: 'flowstone', radius: [16, 26], every: 3, jitter: 18 },
  ],
});
// A DRIPSTONE COLONNADE: columns where floor met ceiling and fused — a
// gallery's nave, sightlines broken into aisles.
registerFormation({
  id: 'dripstone_colonnade', arrange: 'line', span: [300, 520], step: 88,
  pieces: [
    { kind: 'dripstone_column', radius: [16, 24], jitter: 10 },
    { kind: 'stalagmite', radius: [12, 18], every: 2, jitter: 20 },
  ],
});
// A CRYSTAL GARDEN: lattice rings grown around a seep — the geode the cave
// keeps for itself (orbit numbers follow the menhir contract vs its clearing;
// see data/compositions.ts dripstone_cathedral's note).
registerFormation({
  id: 'crystal_garden', arrange: 'orbit', span: [120, 170], step: 52,
  params: { rings: [1, 2], innerFrac: 0.94 },
  pieces: [
    { kind: 'crystal_cluster', radius: [12, 18], jitter: 8 },
    { kind: 'crystal', radius: [14, 20], every: 3, jitter: 10 },
  ],
});
// A GLOWWORM COURT: lure-light colonies rimming a mineral pool terrace — the
// dark's own commons, lit by the things that fish it.
registerFormation({
  id: 'glowworm_court', arrange: 'ring', span: [110, 160], step: 46,
  pieces: [
    { kind: 'glowworm_veil', radius: [16, 24], jitter: 10 },
    { kind: 'rimstone_pool', radius: [14, 22], every: 2, jitter: 14 },
  ],
});
// A COLUMN RING: dripstone columns ringing a cleared nave — the cathedral's
// bones (orbit vs clearing: 125·0.92−6 = 109 ≥ 72+22 = 94, the menhir contract).
registerFormation({
  id: 'column_ring', arrange: 'orbit', span: [125, 180], step: 58,
  params: { rings: [1, 1], innerFrac: 0.92 },
  pieces: [
    { kind: 'dripstone_column', radius: [15, 22], jitter: 6, rot: true },
    { kind: 'stalagmite', radius: [11, 16], every: 2, jitter: 14 },
  ],
});
// A BASALT PROCESSION: cooled hex columns strung along an old flow line —
// the magma gallery's colonnade (cinder_vein's stone sibling).
registerFormation({
  id: 'basalt_procession', arrange: 'meander', span: [280, 460], step: 64,
  params: { wobble: 20 },
  pieces: [
    { kind: 'basalt_column', radius: [14, 22], jitter: 10 },
    { kind: 'cinder', radius: [18, 28], every: 2, jitter: 16 },
  ],
});
// A HERMIT'S REST: some delver's camp, long quiet — fire ring, stores, and
// the kit nobody came back for (ring pieces double as the loot).
registerFormation({
  id: 'hermits_rest', arrange: 'ring', span: [60, 80], step: 34,
  pieces: [
    { kind: 'campfire', radius: [12, 14], count: [1, 1] },
    { kind: 'spelunker_pack', radius: [10, 13], jitter: 8 },
    { kind: 'clay_pots', radius: [10, 13], every: 2, jitter: 8 },
    { kind: 'firewood_pile', radius: [10, 14], every: 3, jitter: 8 },
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

// A CARAVAN WRECK: the trade that stopped mid-stride — carts keeled over in
// file (rot:'chain' keeps each square to the line of march), cargo urns
// spilled between, and the bones of whatever was pulling. The urns keep the
// brittle contract: looting the dead pays, and sometimes objects.
registerFormation({
  id: 'caravan_wreck', arrange: 'meander', span: [340, 620], step: 74,
  params: { wobble: 22 },
  pieces: [
    { kind: 'broken_cart', radius: [16, 22], jitter: 10, rot: 'chain' },
    { kind: 'burial_urn', radius: [10, 14], every: 2, jitter: 24, rot: true },
    { kind: 'bone_pile', radius: [10, 16], every: 3, jitter: 26 },
  ],
});

// A SALT PROCESSION: eroded pillars filing across the pan — the dead lake's
// congregation, still standing where the water left them.
registerFormation({
  id: 'salt_procession', arrange: 'line', span: [280, 520], step: 54,
  pieces: [
    { kind: 'salt_pillar', radius: [10, 15], jitter: 8, rot: true },
    { kind: 'bone_pile', radius: [10, 16], every: 3, jitter: 20 },
  ],
});

// A RIBCAGE RUN: something the size of weather died here — its ribs arch out
// of the pan in file, knuckle bones scattered between (rot:'chain' keeps
// each arch square to the spine it once hung from).
registerFormation({
  id: 'ribcage_run', arrange: 'meander', span: [300, 540], step: 64,
  params: { wobble: 18 },
  pieces: [
    { kind: 'bone_arch', radius: [18, 28], jitter: 8, rot: 'chain' },
    { kind: 'bone_pile', radius: [10, 16], every: 2, jitter: 22 },
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

// A HIVE RING: the warren shows its crown — waxed spires in a rough circle,
// clutches and seeps set between (pair with hive_pocket's clearing: ring
// inner 125·0.92−6 = 109 ≥ 72 + 22 — the menhir numeric contract).
registerFormation({
  id: 'hive_ring', arrange: 'ring', span: [125, 155], step: 46,
  pieces: [
    { kind: 'hive_spire', radius: [14, 22], jitter: 6, rot: true },
    { kind: 'egg_clutch', radius: [10, 14], every: 2, jitter: 12 },
    { kind: 'resin_node', radius: [10, 13], every: 3, jitter: 10 },
  ],
});

// A RESIN SEEP: the warren weeps a trail — amber nodes filing toward the
// brood ground, molt-husks scattered where the carriers turned.
registerFormation({
  id: 'resin_seep', arrange: 'meander', span: [240, 420], step: 48,
  params: { wobble: 26 },
  pieces: [
    { kind: 'resin_node', radius: [9, 13], jitter: 10 },
    { kind: 'brood_husk', radius: [10, 15], every: 2, jitter: 18 },
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

// --- THE OSSUARY GRAMMAR (the Necropolis' interior — data/tilesets 'ossuary') --

// CHARNEL DUNES: the bonefields' rolling skyline — heaped mounds wandering in
// a drift-line, litter spilling between them (mounds pack among themselves;
// the drift is supposed to knit).
registerFormation({
  id: 'charnel_dunes', arrange: 'meander', span: [340, 620], step: 56,
  params: { wobble: 40 },
  pieces: [
    { kind: 'bone_mound', radius: [26, 44], jitter: 12, rot: true },
    { kind: 'bone_pile', radius: [16, 26], jitter: 30 },
  ],
});

// RELIQUARY ROWS: shelf-walls of stacked dead facing ALONG their line
// (rot:'chain'), sealed urns set at their feet — one row per formation; the
// reliquary variant rolls several for its corridor grid.
registerFormation({
  id: 'reliquary_rows', arrange: 'line', span: [300, 540], step: 46,
  pieces: [
    { kind: 'ossuary_niche', radius: [20, 28], jitter: 4, rot: 'chain' },
    { kind: 'burial_urn', radius: [10, 14], every: 3, jitter: 18 },
  ],
});

// AN OSSUARY COLONNADE: great ribcage arches pacing a processional way,
// litter drifted along it — the sanctum's avenue.
registerFormation({
  id: 'ossuary_colonnade', arrange: 'line', span: [360, 620], step: 84,
  pieces: [
    { kind: 'rib_arch', radius: [18, 30], jitter: 6, rot: 'chain' },
    { kind: 'bone_pile', radius: [12, 18], every: 2, jitter: 24 },
  ],
});

// A RIB ROTUNDA: arches ringing a swept court, each facing the ring's tangent
// — the composition centerpiece. Geometry contract vs its clearing (see
// charnel_rotunda): inner ring 115×0.92−3 ≈ 103 stays outside a reserved
// court of ≤70 + piece 24 = 94 — tune BOTH sides together.
registerFormation({
  id: 'rib_rotunda', arrange: 'orbit', span: [115, 155], step: 44,
  params: { rings: [1, 1], innerFrac: 0.92 },
  pieces: [
    { kind: 'rib_arch', radius: [16, 24], jitter: 3, rot: 'chain' },
    { kind: 'bone_cairn', radius: [11, 15], every: 3, jitter: 10 },
  ],
});

// --- THE MUNITIONS DUMP (the powder-cache kit) -------------------------------
// Doodad semantics registered HERE beside their arrangement (the open
// registerDoodadRule seam — no levelgen edit): the keg is a brittle 'hit'
// BOMB (its fume mints infernal_rift's eruption after a fizzing fuse), the
// bundled charges are lootable and pop smaller, and the shot pyramid is
// honest solid cover. Every fight near the cache is a wager.
registerDoodadRule('powder_keg', {
  overlap: 'inert', spacing: 24,
  brittle: {
    on: ['hit'], text: 'the keg goes up!', color: '#ff8a4a',
    fume: { skillId: 'infernal_rift', radius: 80, linger: 0.8, dmgMult: 2.2, delay: 0.65, color: '#ff8a4a' },
  },
});
registerDoodadRule('munition_cache', {
  overlap: 'inert', spacing: 26,
  brittle: {
    on: ['hit'], orbChance: 0.3, gemChance: 0.12, text: 'the charges split!', color: '#e8b060',
    fume: { skillId: 'infernal_rift', radius: 52, linger: 0.6, dmgMult: 1.1, delay: 0.5, color: '#ff9a5a' },
  },
});
registerDoodadRule('shot_stack', {
  overlap: 'solid', blocksMove: true, spacing: 26,
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
});

// A POWDER CACHE: someone's munitions dump — kegs racked in a tight ring,
// shot pyramided beside them, bundled charges still strapped. One stray
// shot and the whole larder answers.
registerFormation({
  id: 'powder_cache', arrange: 'orbit', span: [70, 105], step: 38,
  params: { rings: [1, 1], innerFrac: 0.9 },
  pieces: [
    { kind: 'powder_keg', radius: [11, 15], jitter: 8, rot: true },
    { kind: 'shot_stack', radius: [12, 16], every: 3, jitter: 10, rot: true },
    { kind: 'munition_cache', radius: [12, 16], every: 4, jitter: 12, rot: true },
  ],
});

// --- THE CHARNEL KIT (the corpse economy's scenery — docs/engine/corpses.md) --
// The plague cart is the Corpse Wagon made scenery: a heaped dray abandoned
// mid-haul — low honest cover until struck, then its LOAD spills as raisable
// bodies (BrittleSpec.corpses). The shallow grave is the quiet sibling: a
// mound that breaks open under a stray blow. Necromancers harvest, ghouls
// dine, everyone else just smells it.
registerDoodadRule('plague_cart', {
  overlap: 'solid', blocksMove: true, spacing: 46,
  forbidOn: ['water', 'lava', 'chasm'],
  brittle: {
    on: ['hit'], orbChance: 0.1, gemChance: 0.06,
    text: 'the cart breaks apart!', color: '#8a7a58',
    corpses: { monster: 'zombie', count: [2, 3], text: 'the load spills out!' },
  },
});
registerDoodadRule('shallow_grave', {
  overlap: 'ground', spacing: 32,
  brittle: {
    on: ['hit'], orbChance: 0.08,
    text: 'the grave breaks open!', color: '#8a7a5e',
    corpses: { monster: 'zombie', count: [1, 2], chance: 0.9, text: 'the earth gives up its dead!' },
  },
});
// Tileset layouts speak in STAMPS — the kit's kinds join the vocabulary.
registerStamp('shallow_grave', stampSingle('shallow_grave', [11, 15]));
registerStamp('plague_cart', stampSingle('plague_cart', [15, 19]));
// The gibbet has always hung over walkable ground (structure dressing, no
// rule) — registering it 'ground' keeps that true while formations may
// now count it as a legal piece.
registerDoodadRule('gibbet', { overlap: 'ground', spacing: 44 });

// A CHARNEL WAYSTOP: the dead-cart never finished its round — the dray
// stalled among the graves it was filling, bone heaped where the digging
// stopped, a gibbet keeping the tally. Fuel depot and ambush larder both.
registerFormation({
  id: 'charnel_waystop', arrange: 'orbit', span: [90, 140], step: 44,
  params: { rings: [1, 1], innerFrac: 0.35 },
  pieces: [
    { kind: 'plague_cart', radius: [16, 20], jitter: 6, rot: true },
    { kind: 'shallow_grave', radius: [12, 16], jitter: 14, rot: true },
    { kind: 'bone_pile', radius: [10, 14], every: 3, jitter: 16, rot: true },
    { kind: 'gibbet', radius: [11, 14], every: 4, jitter: 10, rot: true },
  ],
});

// --- THE RIVER-OF-FLAME GRAMMAR (hell's artery — data/tilesets 'river_of_flame') --

// THE BANNER ROAD: legion war-banners pacing an approach the demons still
// keep, cinders drifting the lane (all inert — the doctrine holds on home
// turf too: no fake-live hazards ride a formation).
registerFormation({
  id: 'banner_row', arrange: 'line', span: [300, 540], step: 84,
  pieces: [
    { kind: 'demon_banner', radius: [11, 15], jitter: 8, rot: true },
    { kind: 'cinder', radius: [20, 30], every: 2, jitter: 26 },
  ],
});

// A SOUL GALLERY: gibbet cages strung down the bank, bone heaped beneath —
// the toll the river collects. Ride it with a `where: {field:'shore',
// kinds:['lava'], …}` band so the meander hangs over the flame it feeds.
registerFormation({
  id: 'soul_gallery', arrange: 'meander', span: [280, 520], step: 56,
  params: { wobble: 32 },
  pieces: [
    { kind: 'soul_cage', radius: [11, 15], jitter: 10, rot: true },
    { kind: 'bone_pile', radius: [12, 18], every: 2, jitter: 20, rot: true },
  ],
});

// A PYRE WATCH: bone-pyres burning pale down the old bank road, banners
// between them — the demons light the river's way for their own.
registerFormation({
  id: 'pyre_watch', arrange: 'meander', span: [300, 560], step: 72,
  params: { wobble: 26 },
  pieces: [
    { kind: 'pyre_heap', radius: [16, 22], jitter: 12, rot: true },
    { kind: 'demon_banner', radius: [11, 14], every: 3, jitter: 16, rot: true },
  ],
});

// --- THE LEYLINE + ABYSS GRAMMAR (fracture capstone arenas) -------------------

// A LEY CURRENT: the leyline itself — conduit segments facing along a
// meandering chain (rot:'chain'), fonts breaking surface where it pools.
// Two or three currents crossing an arena ARE the confluence.
registerFormation({
  id: 'ley_current', arrange: 'meander', span: [420, 720], step: 46,
  params: { wobble: 26 },
  pieces: [
    { kind: 'ley_conduit', radius: [18, 26], jitter: 3, rot: 'chain' },
    { kind: 'ley_font', radius: [13, 20], every: 5, jitter: 16 },
  ],
});

// A CRACK RUN: the abyss showing through — fissures chained into a wandering
// tear, spines jutting where the crust broke.
registerFormation({
  id: 'crack_run', arrange: 'meander', span: [360, 640], step: 50,
  params: { wobble: 38 },
  pieces: [
    { kind: 'abyss_crack', radius: [18, 30], jitter: 4, rot: 'chain' },
    { kind: 'abyss_spine', radius: [11, 18], every: 3, jitter: 20, rot: true },
  ],
});

// A SPINE REEF: the deep's teeth in a raking line — jagged cover that turns
// open ground into lanes.
registerFormation({
  id: 'spine_reef', arrange: 'line', span: [280, 520], step: 40,
  pieces: [
    { kind: 'abyss_spine', radius: [12, 22], jitter: 10, rot: true },
    { kind: 'rock', radius: [12, 20], every: 3, jitter: 18, rot: true },
  ],
});

// --- THE ENERGIST CACHE (the spell-chamber kit) -------------------------------
// The arcane sibling of the powder dump — doodad semantics registered beside
// their arrangement (the open registerDoodadRule seam). Charge cells are
// brittle vessels that SPILL their keeping when struck (the orb tradition);
// capacitors are solid worked monuments; spent cells are dead clutter the
// works shed — the story of a battery row told in three kinds.
registerDoodadRule('charge_cell', {
  overlap: 'inert', spacing: 24,
  brittle: { on: ['hit', 'touch'], orbChance: 0.65, text: 'the cell discharges!', color: '#7fd8c8' },
});
registerDoodadRule('rune_capacitor', {
  overlap: 'solid', blocksMove: true, spacing: 30,
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
  surface: { hw: 0.7, hh: 0.42 }, // the slab painter's monolith base
});
registerDoodadRule('spent_cell', { overlap: 'ground', spacing: 22 });

// A CAPACITOR BANK: worked pylons pacing a line, live cells racked between,
// dead ones shed along it — someone farms the leyline here, or someone did.
registerFormation({
  id: 'capacitor_bank', arrange: 'line', span: [260, 460], step: 58,
  pieces: [
    { kind: 'rune_capacitor', radius: [13, 18], jitter: 6, rot: true },
    { kind: 'charge_cell', radius: [10, 14], every: 2, jitter: 14 },
    { kind: 'spent_cell', radius: [9, 12], every: 3, jitter: 20, rot: true },
  ],
});

// --- THE WAR CAMP (the muster-ground kit) -------------------------------------
// The martial sibling of the powder dump — the taunt-and-guard pass's set
// dressing. Someone drills here: a spiked fence punctuated by standards,
// and inside it the furniture of readiness. All five kinds ride existing
// painters via params (warBanner / fishingRack / scarecrow / potCluster /
// palisade) — zero renderer edits, the visual-fabric contract.
registerDoodadRule('battle_standard', {
  overlap: 'solid', blocksMove: true, spacing: 30, bodyScale: 0.35, // the banner POLE (demon_banner's parity)
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
});
registerDoodadRule('shield_rack', {
  overlap: 'solid', blocksMove: true, spacing: 26, bodyScale: 0.5,
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
  surface: { hw: 2.1, hh: 0.35 }, // the fishing rack's rail line (fracs ride the 0.5 body radius)
  brittle: { on: ['hit'], orbChance: 0.12, text: 'the rack clatters apart!', color: '#c8b088' },
});
registerDoodadRule('sparring_dummy', {
  overlap: 'solid', blocksMove: true, spacing: 24,
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
  surface: { hw: 0.85, hh: 0.35 }, // the scarecrow coat band; the cross-arms stay thin air
  brittle: { on: ['hit'], orbChance: 0.05, text: 'straw flies!', color: '#d8c890' },
});
registerDoodadRule('war_drum', {
  overlap: 'solid', blocksMove: true, spacing: 24,
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
  brittle: { on: ['hit'], text: 'BOOM.', color: '#e8a860' },
});
registerDoodadRule('palisade_spikes', {
  overlap: 'solid', blocksMove: true, spacing: 20,
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
  // The palisade painter draws an UNSPUN ±0.85r square — pin the surface to
  // match ('fixed'); pieces sit apart (the gaps ARE the gates), no run joints.
  surface: { hw: 0.85, hh: 0.85, orient: 'fixed' },
});

// The fence: spiked stakes pacing a wide ring, a standard every few posts.
// Step stays generous — the gaps ARE the gates (reachability by design).
registerFormation({
  id: 'muster_fence', arrange: 'orbit', span: [120, 165], step: 52,
  params: { rings: [1, 1] },
  pieces: [
    { kind: 'palisade_spikes', radius: [10, 14], jitter: 6, rot: true },
    { kind: 'battle_standard', radius: [9, 11], every: 5, jitter: 4, rot: true },
  ],
});

// The camp's business, huddled inside: dummies that burst into straw, racks
// that clatter, a drum, a fire, fodder — struck-surface toys for the mallet
// fabric, cover for the fight that finds the place.
registerFormation({
  id: 'camp_goods', arrange: 'orbit', span: [34, 78], step: 46,
  params: { rings: [1, 2], innerFrac: 0.55 },
  pieces: [
    { kind: 'sparring_dummy', radius: [9, 12], jitter: 10, rot: true },
    { kind: 'shield_rack', radius: [11, 14], every: 3, jitter: 8, rot: true },
    { kind: 'war_drum', radius: [9, 12], every: 4, jitter: 8, rot: true },
    { kind: 'campfire', radius: [10, 12], every: 5, jitter: 6 },
    { kind: 'hay_bale', radius: [10, 13], every: 3, jitter: 10, rot: true },
  ],
});

// --- THE CISTERN COURT (the conduit pass's set dressing) ----------------------
// The old blood-plumbing of barrow country: a stone cistern holding court
// over votive basins and offering urns, and the dry runnels that once fed
// it ringing the yard. Someone built the dead a PUMP. All four kinds ride
// existing painters via params (well / fountain / potCluster / leyLine) —
// zero renderer edits, the visual-fabric contract. The basins and urns are
// brittle strike-toys (terrain that PAYS when grazed, the energist rule).
registerDoodadRule('stone_cistern', {
  overlap: 'solid', blocksMove: true, spacing: 34,
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
});
registerDoodadRule('votive_basin', {
  overlap: 'solid', blocksMove: true, spacing: 26,
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
  brittle: { on: ['hit'], orbChance: 0.1, text: 'the basin cracks — what it held runs out!', color: '#8ad0c8' },
});
registerDoodadRule('offering_urns', {
  overlap: 'solid', blocksMove: true, spacing: 24,
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
  brittle: { on: ['hit'], orbChance: 0.15, text: 'the urns spill their keeping!', color: '#c8b088' },
});
// The runnel is a GLOW UNDERFOOT (inert, walkable — the clay_pots class):
// a gutter that still remembers what it carried.
registerDoodadRule('dry_runnel', { overlap: 'inert', spacing: 12 });

// The court's goods, huddled around the wellhead: the cistern anchoring
// the ring, basins and urns crowding it — brittle cover for the fight
// that finds the place.
registerFormation({
  id: 'cistern_ring', arrange: 'orbit', span: [36, 78], step: 44,
  params: { rings: [1, 2], innerFrac: 0.5 },
  pieces: [
    { kind: 'offering_urns', radius: [9, 12], jitter: 10, rot: true },
    { kind: 'votive_basin', radius: [10, 13], every: 3, jitter: 8, rot: true },
    { kind: 'stone_cistern', radius: [13, 16], every: 4, jitter: 6 },
  ],
});

// The dry plumbing: runnel glows pacing a wide ring around the court —
// inert decals, so the yard stays fully walkable (the gaps aren't even
// needed; the ring is the suggestion of a ring).
registerFormation({
  id: 'runnel_ring', arrange: 'orbit', span: [96, 132], step: 40,
  params: { rings: [1, 1] },
  pieces: [
    { kind: 'dry_runnel', radius: [16, 22], jitter: 4, rot: true },
  ],
});

// --- THE FALLEN COLOSSUS (the ruin-at-landmark-scale kit) ---------------------
// Something vast broke here long before the map had a name. The breaker
// pass's set dressing: everything with a bar breaks, given time. Four kinds,
// all existing painters in stone clothes (statue / boulder / log / slab).
registerDoodadRule('colossus_head', {
  overlap: 'solid', blocksMove: true, spacing: 34,
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
  surface: { hw: 1.0, hh: 1.0 }, // the statue painter's full ±r plinth square
});
registerDoodadRule('colossus_fist', {
  overlap: 'solid', blocksMove: true, spacing: 28,
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
  rockForm: { cluster: 0.45 }, // boulder painter's default roll — knuckles block as rolled
});
registerDoodadRule('broken_column', {
  overlap: 'solid', blocksMove: true, spacing: 24,
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
  surface: { hw: 1.7, hh: 0.62 }, // the log painter's trunk — a fallen drum lies long
});
registerDoodadRule('ruin_plinth', {
  overlap: 'solid', blocksMove: true, spacing: 26,
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp'],
  surface: { hw: 0.7, hh: 0.42 }, // the slab painter's monolith base
  brittle: { on: ['hit'], orbChance: 0.1, text: 'the plinth crumbles!', color: '#a8a08e' },
});

// The collapsed colonnade: column drums down a long line, a fist and the
// odd surviving plinth punctuating the fall.
registerFormation({
  id: 'colossus_wreck', arrange: 'line', span: [190, 320], step: 48,
  pieces: [
    { kind: 'broken_column', radius: [11, 16], jitter: 12, rot: true },
    { kind: 'ruin_plinth', radius: [12, 16], every: 3, jitter: 10, rot: true },
    { kind: 'colossus_fist', radius: [14, 19], every: 4, jitter: 14, rot: true },
    { kind: 'rubble', radius: [9, 13], every: 2, jitter: 18, rot: true },
  ],
});

// --- THE GLOAMWOOD SET (the haunted wood's composed dressings) --------------

// PUMPKIN ROWS: the croft's planted ranks — gourd tangles in rank and file,
// a carved lantern grinning down every fifth plot. Harvest that outlived
// its farmers.
registerFormation({
  id: 'pumpkin_rows', arrange: 'grid', span: [240, 380], step: 56,
  params: { rowGap: 60, aspect: 0.7 },
  pieces: [
    { kind: 'pumpkin_patch', radius: [14, 22], jitter: 10 },
    { kind: 'jack_o_lantern', radius: [9, 12], every: 5, jitter: 14 },
    { kind: 'hay_bale', radius: [12, 16], every: 6, jitter: 18, rot: true },
  ],
});

// THE GALLOWS COURT: gibbets ringing the drop — the wood keeps its
// sentences where everyone must pass them. Pairs with a clearing ≤ 72
// (span×innerFrac 118 ≥ clearR 72 + piece 26 + jitter 10 — the numeric
// clearing/ring contract).
registerFormation({
  id: 'gallows_court', arrange: 'orbit', span: [125, 175], step: 78,
  params: { rings: [1, 1], innerFrac: 0.95 },
  pieces: [
    { kind: 'hanging_cage', radius: [20, 26], jitter: 10, rot: true },
    { kind: 'gallows', radius: [24, 30], every: 4, jitter: 8, rot: true },
  ],
});

// THE HANGED ROAD: cages strung down a bend among dead snags — sparse by
// design; the sway does the talking.
registerFormation({
  id: 'gibbet_lane', arrange: 'meander', span: [320, 560], step: 120,
  params: { wobble: 38 },
  pieces: [
    { kind: 'hanging_cage', radius: [20, 26], jitter: 12, rot: true },
    { kind: 'dead_tree', radius: [14, 22], every: 2, jitter: 28, rot: true },
  ],
});

// --- THE NIGHT FEAST (the Court's table, found cold) -------------------------
// The kit's kinds are UNION members (engine/levelgen: rules + stamps live
// beside broken_cart's), so the arrangement here is pure composition.
// THE FEAST LANE: a halted procession — the coach where it burned, stakes
// strung down the verge, the fed-on folded where they knelt. The Court's
// story told in furniture: it stopped here, it ate, someone made it pay.
registerFormation({
  id: 'night_feast', arrange: 'meander', span: [260, 480], step: 46,
  params: { wobble: 24 },
  pieces: [
    { kind: 'feeding_stake', radius: [9, 12], jitter: 10, rot: true },
    { kind: 'drained_husk', radius: [12, 17], jitter: 22 },
    { kind: 'coach_wreck', radius: [20, 26], every: 5, jitter: 8, rot: 'chain' },
    { kind: 'bone_pile', radius: [12, 16], every: 4, jitter: 24 },
  ],
});

// THE HARP ARCADE (the Aetherial): a paced line of strung pillars — the
// colonnade the wind plays crossing the shelf. Straight and deliberate:
// built things stand in ranks even where the ground beneath them doesn't last.
registerFormation({
  id: 'harp_arcade', arrange: 'line', span: [280, 480], step: 92,
  pieces: [
    { kind: 'harp_pillar', radius: [10, 13], jitter: 6 },
    { kind: 'prayer_bell', radius: [9, 11], every: 4, jitter: 10, rot: true },
  ],
});

// THE CHOIR STATUES (the Aetherial): bowed seraphim ringing a common center
// — whatever they mourn or guard stood (or fell) in the middle. Crystals
// gleam in the gaps between them.
registerFormation({
  id: 'choir_statues', arrange: 'ring', span: [150, 230], step: 88,
  pieces: [
    { kind: 'seraph_statue', radius: [16, 22], jitter: 6, rot: 'chain' },
    { kind: 'aether_crystal', radius: [12, 16], every: 3, jitter: 14 },
  ],
});

// THE TOTEM RING (the Driftways): wind-spirit poles circling a common
// center, a vane posted between them — the drift-folk's compass rose.
registerFormation({
  id: 'totem_ring', arrange: 'ring', span: [130, 200], step: 82,
  pieces: [
    { kind: 'zephyr_totem', radius: [11, 15], jitter: 7 },
    { kind: 'gale_vane', radius: [9, 12], every: 3, jitter: 12, rot: true },
  ],
});

// THE CHIME WALK (the Driftways): a wandering line of aeolian chimes with
// lanterns pacing it — the wind's own colonnade, played not built.
registerFormation({
  id: 'chime_walk', arrange: 'meander', span: [280, 480], step: 76,
  pieces: [
    { kind: 'chime_stand', radius: [10, 13], jitter: 9 },
    { kind: 'sky_lantern', radius: [8, 11], every: 3, jitter: 12 },
  ],
});

// THE VINE MASS (the jungle): ONE organism lying across the ground — a
// serpentine chain of woven coils, every segment individually cuttable
// (vine_coil's brittle rule; bodies stop, arrows snip in passing, EYES
// cross freely). Cut anywhere and the mass yields a path while keeping its
// form everywhere else. rot:'chain' turns the pieces along the meander so
// the elongated coil painter reads as one continuous body; the tight step
// overlaps the segments. Pale blooms ride the length — the gloom's own
// marker lights.
registerFormation({
  id: 'vine_mass', arrange: 'meander', span: [200, 380], step: 30,
  // Site on a LANE-sized clearance, not the span-derived disc: a carved
  // thicket holds no open ground that big, and the pieces walk-gate anyway
  // — the chain drapes through lanes and glades, rejecting into the wall,
  // which is exactly how a draped organism should read.
  siteRadius: 46,
  params: { wobble: 26 },
  pieces: [
    { kind: 'vine_coil', radius: [15, 20], jitter: 3, rot: 'chain' },
    { kind: 'jungle_bloom', radius: [9, 12], every: 6, jitter: 16 },
  ],
});
