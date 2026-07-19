// ---------------------------------------------------------------------------
// THE GARDEN KIT — content for the Garden country (the bug-high biome: an
// enormous tended plot walked at seed scale, where a flower stalk is a tree,
// a planter bed is a rampart, and the Tender — whoever last watered this
// country — is a giant remembered only by the tools they dropped).
//
// Everything here is registry rows on existing fabrics (the massifs.ts
// doctrine): doodad rules + stamps, formations, compositions, one massif
// kind, and the formicary's interior ROLES. No engine edits. Painters live
// in render/vis/paintersGarden.ts (the paintersGloam contract); visuals in
// data/doodadVisuals.ts; the faces in data/tilesets.ts; the colony and the
// bloomkin in data/monsters.ts; the nest doors in data/sidezones.ts.
// ---------------------------------------------------------------------------

import {
  registerCluster, registerComposition, registerDoodadRule, registerFormation,
  registerStamp, stampSingle,
} from '../engine/levelgen';
import { registerMassKind } from '../engine/massif';
import { registerInteriorRole } from '../engine/interiorGen';

// --- THE FLOWER STANDS (the country's trees) ----------------------------------
// A bloom stalk is the garden's oak: a green bole you fight around, a petal
// crown you fight UNDER (the veil law — the canopy hides what it covers),
// and a body the blade can clear (mutable + kindling: the cut contract's
// bright-green promise is kept by palette, the burn by fuel).
registerDoodadRule('bloom_stalk', {
  overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 20,
  occlude: { pad: 10, alpha: 0.3 }, bodyScale: 0.3, veil: { group: 'bloom' },
  mutable: true, fuel: 'kindling',
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp', 'ice'],
});
registerStamp('bloom_stalk', stampSingle('bloom_stalk', [30, 50]));

// The sun disc: the grand stalk — a crown broad as a threshing floor, the
// heart a countable field of seeds. The petalfields' landmark tree.
registerDoodadRule('sun_disc', {
  overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 26,
  occlude: { pad: 12, alpha: 0.32 }, bodyScale: 0.26, veil: { group: 'bloom' },
  mutable: true, fuel: 'kindling',
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp', 'ice'],
});
registerStamp('sun_disc', stampSingle('sun_disc', [46, 62]));

// The bellflower: a mid-rank stand — five notched petals, dusk-blue.
registerDoodadRule('bellflower', {
  overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 18,
  occlude: { pad: 9, alpha: 0.28 }, bodyScale: 0.3, veil: { group: 'bloom' },
  mutable: true, fuel: 'kindling',
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp', 'ice'],
});
registerStamp('bellflower', stampSingle('bellflower', [22, 34]));

// --- THE WILDGRASS (the crop law, gone feral) ---------------------------------
// Blade-grass over a bug's head: walk through freely, SEE nothing past it —
// the wheat contract with the tended gold swapped for garden green. Whole
// runs of the stalkwood floor are this: cover for the mantis, cover for you.
registerDoodadRule('wildgrass_blade', {
  overlap: 'inert', blocksMove: false, blocksShot: false, blocksSight: true,
  spacing: 20, walkOnly: true, spin: true,
  occlude: { pad: 10, alpha: 0.32 },
  veil: { group: 'wildgrass', standStatus: 'canopied' },
  fuel: 'kindling',
  forbidOn: ['water', 'lava', 'chasm', 'bog', 'swamp', 'ice'],
});
registerStamp('wildgrass_blade', stampSingle('wildgrass_blade', [26, 40]));

// --- SMALL WONDERS ------------------------------------------------------------
// Petal drift: fallen petals drifted against whatever stopped them. Ground
// dressing (and the petalfall front's temporary dress — it evaporates when
// the weather lifts). The same painter wears leaf-brown as leaf mulch.
registerDoodadRule('petal_drift', { overlap: 'ground', spacing: 26 });
registerStamp('petal_drift', stampSingle('petal_drift', [18, 30]));
registerDoodadRule('leaf_mulch', { overlap: 'ground', spacing: 26 });
registerStamp('leaf_mulch', stampSingle('leaf_mulch', [22, 36]));

// A seed pod: the year's crop, still holding. Cracks like what it is.
registerDoodadRule('seed_pod', {
  overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 30,
  brittle: { on: ['hit'], text: 'the pod spills its seed', color: '#c8b06a', orbChance: 0.3, gemChance: 0.04 },
});
registerStamp('seed_pod', stampSingle('seed_pod', [12, 18]));

// A bud knot: next spring, wound tight. Pops green when struck.
registerDoodadRule('bud_knot', {
  overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 24,
  brittle: { on: ['hit'], text: 'the bud bursts unripe', color: '#8ac86a', orbChance: 0.2 },
});
registerStamp('bud_knot', stampSingle('bud_knot', [10, 15]));

// A dew bead: one held raindrop, waist-deep to a bug and bright as glass.
// Struck, it simply lets go of its shape.
registerDoodadRule('dew_bead', {
  overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 34,
  sightShadow: { mul: 0.3, softR: 22 },
  brittle: { on: ['hit'], text: 'the dewdrop lets go', color: '#bfe8ff' },
});
registerStamp('dew_bead', stampSingle('dew_bead', [10, 16]));

// --- THE TENDER'S RELICS ------------------------------------------------------
// The giant's dropped kit, each a monument. Solid, rare, and unmistakable —
// the country's scale argument made in ironmongery.
registerDoodadRule('watering_can', {
  overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 220,
  surface: { hw: 1.15, hh: 0.62, orient: 'rot' },
});
registerStamp('watering_can', stampSingle('watering_can', [34, 44]));

// The bell jar: a glass sky over a kept bed. Bodies stop at the glass;
// arrows and eyes pass — a fight around a jar is a fight in the round.
registerDoodadRule('bell_jar', {
  overlap: 'solid', blocksMove: true, blocksShot: false, blocksSight: false,
  spacing: 200,
});
registerStamp('bell_jar', stampSingle('bell_jar', [26, 36]));

// The Tender's idol: what the small lives raised from a guess at their
// giant. A statue's manners — planted, watchful, mute.
registerDoodadRule('tender_idol', {
  overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 180,
  sightShadow: { mul: 0.6, softR: 30 },
});
registerStamp('tender_idol', stampSingle('tender_idol', [16, 22]));

// A rusted trowel, half-dug into its last job. Low iron — eyes read over it.
registerDoodadRule('rusted_trowel', {
  overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 160,
  sightShadow: { mul: 0.35, softR: 26 },
  surface: { hw: 1.2, hh: 0.45, orient: 'rot' },
});
registerStamp('rusted_trowel', stampSingle('rusted_trowel', [22, 30]));

// The trellis: the Tender's lattice standing in rows — a wall to bodies,
// air to arrows and eyes (the drystone conversation, grown not stacked).
registerDoodadRule('trellis_frame', {
  overlap: 'solid', blocksMove: true, blocksShot: false, blocksSight: false,
  spacing: 30, surface: { hw: 1.35, hh: 0.3, orient: 'rot' },
  mutable: true, fuel: 'timber',
});
registerStamp('trellis_frame', stampSingle('trellis_frame', [24, 34]));

// --- THE COLONY'S EARTH -------------------------------------------------------
// Worked soil above the formicary: mounds, vents, and the gate spire the
// nest breathes through. The GATE is the sidezone mouth (data/sidezones.ts
// registers the door; this rule only plants the trigger).
registerDoodadRule('formic_mound', {
  overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 90,
  sightShadow: { mul: 0.7, softR: 34 },
});
registerStamp('formic_mound', stampSingle('formic_mound', [18, 28]));

registerDoodadRule('formic_vent', {
  overlap: 'solid', blocksMove: true, blocksShot: false, spacing: 60,
  sightShadow: { mul: 0.3, softR: 20 },
});
registerStamp('formic_vent', stampSingle('formic_vent', [9, 13]));

registerDoodadRule('mound_gate', { overlap: 'trigger', spacing: 300 });
registerStamp('mound_gate', stampSingle('mound_gate', [26, 34]));

// The brood run: the formicary's own way DOWN — gallery floors lay one per
// rung (the garret_stair pattern pointed the colony's way). The sidezone
// door lives in data/sidezones.ts; this is only the mouth in the floor.
// Spacing stays room-scale (the cellar-hatch band): a carved gallery has no
// 400px-clear floor anywhere, and a stair that can't seat is a nest with no
// bottom.
registerDoodadRule('brood_stair', { overlap: 'trigger', spacing: 40 });
registerStamp('brood_stair', stampSingle('brood_stair', [16, 22]));

// Comb-wax: the colony's cell-work, grown over floor and wall alike. Nest
// dressing — inert, walked over, unmistakably SOMEONE'S work.
registerDoodadRule('comb_wax', { overlap: 'ground', spacing: 30 });
registerStamp('comb_wax', stampSingle('comb_wax', [20, 32]));

// A compost heap: the mulch margin's warm hill — kindling for any fire
// front that finds it, cover for whatever grew up eating it.
registerDoodadRule('compost_heap', {
  overlap: 'solid', blocksMove: true, blocksShot: true, spacing: 80,
  fuel: 'kindling', sightShadow: { mul: 0.7, softR: 36 },
});
registerStamp('compost_heap', stampSingle('compost_heap', [22, 34]));

// --- THE PLANTER BED (massif kind) --------------------------------------------
// The Tender's raised beds at bug height: timber-boarded soil ramparts —
// TRUE walls (region 'bed_wall', world/regions.ts) whose leftover ground is
// the path map, square-shouldered like the tenements because someone BUILT
// them. The crest is the planting: the bed's own crown of blooms, read from
// the path as a hanging garden overhead.
registerMassKind({
  id: 'planter_bed',
  region: 'bed_wall',
  shapes: [{ shape: 'slab', weight: 2.5 }, { shape: 'block', weight: 1.5 }, { shape: 'ridge', weight: 1 }],
  lobe: 0.08, // board-edged, not geological
  skirt: [
    { kind: 'flowers', weight: 2, radius: [12, 18] },
    { kind: 'clay_pots', weight: 1.5, radius: [10, 14] },
    { kind: 'grass', weight: 2, radius: [14, 24] },
    { kind: 'petal_drift', weight: 1, radius: [16, 24] },
  ],
  skirtChance: 0.36,
  skirtSpacing: 50,
  crest: [
    { kind: 'bellflower', weight: 2, radius: [16, 24] },
    { kind: 'bloom_stalk', weight: 1.5, radius: [20, 30] },
    { kind: 'wildgrass_blade', weight: 2, radius: [18, 28] },
  ],
  crestChance: 0.3,
  crestSpacing: 62,
});

// --- FORMATIONS ---------------------------------------------------------------
// A bloom stand: a grove of stalks around one grand disc — the garden's
// copse, veil-crowned, floor drifted with what the crowns let fall.
registerFormation({
  id: 'bloom_stand', arrange: 'orbit', span: [150, 230], step: 56,
  params: { rings: 2, innerFrac: 0.4 },
  pieces: [
    { kind: 'sun_disc', radius: [46, 58], count: [1, 1] },
    { kind: 'bloom_stalk', radius: [28, 44], jitter: 18 },
    { kind: 'bellflower', radius: [20, 30], every: 3, jitter: 14 },
    { kind: 'petal_drift', radius: [16, 26], every: 2, jitter: 26 },
  ],
});

// A wildgrass run: a blade-walled lane of NOT-seeing — the stalkwood's
// corridors are made of these, meandering like wind lay them down.
registerFormation({
  id: 'wildgrass_run', arrange: 'meander', span: [260, 460], step: 40,
  pieces: [
    { kind: 'wildgrass_blade', radius: [26, 38], jitter: 16 },
  ],
});

// The trellis row: lattice panels pacing a line, runner vines between —
// the tended rows' architecture, standing right where the work stopped.
registerFormation({
  id: 'trellis_row', arrange: 'line', span: [240, 420], step: 58,
  pieces: [
    { kind: 'trellis_frame', radius: [24, 32], rot: true },
    { kind: 'flowers', radius: [12, 16], every: 3, jitter: 20 },
  ],
});

// A dew string: the night's leavings caught along one strand of old web —
// three or four glass beads in an arc, bright at dawn, gone by no clock
// this country keeps.
registerFormation({
  id: 'dew_string', arrange: 'arc', span: [120, 200], step: 44,
  pieces: [
    { kind: 'dew_bead', radius: [10, 15], jitter: 8 },
  ],
});

// The colony's earthworks: mounds and vents ringing a worked heart. The
// GATE spire rides the composition (site-pinned), never the loose ring.
registerFormation({
  id: 'mound_warren', arrange: 'orbit', span: [140, 220], step: 52,
  params: { rings: 2, innerFrac: 0.45 },
  pieces: [
    { kind: 'formic_mound', radius: [18, 26], jitter: 14 },
    { kind: 'formic_vent', radius: [9, 13], every: 2, jitter: 12 },
    { kind: 'leaf_mulch', radius: [18, 28], every: 3, jitter: 24 },
  ],
});

// --- SET-PIECE CLUSTERS -------------------------------------------------------
// The composition centerpieces (clusters are the SITE-AWARE stamp for a
// monument + its court — the hellforge-anvil idiom): the centerpiece stands
// INSIDE the swept clearing; the ring pieces start past the clearing's rim
// (the composition ring contract: clearingMax + fattest ring piece).
registerCluster({
  id: 'tender_relic_court',
  anchor: { radius: 40 },
  pieces: [
    { kind: 'watering_can', count: [1, 1], radius: [34, 42], ring: [0, 8], rot: true, centerpiece: true },
    { kind: 'clay_pots', count: [2, 4], radius: [10, 14], ring: [86, 130] },
    { kind: 'rusted_trowel', count: [0, 1], radius: [22, 28], ring: [92, 140], rot: true },
    { kind: 'petal_drift', count: [1, 3], radius: [16, 24], ring: [80, 140] },
  ],
  poi: true,
});
registerCluster({
  id: 'bell_jar_court',
  anchor: { radius: 34 },
  pieces: [
    { kind: 'bell_jar', count: [1, 1], radius: [26, 36], ring: [0, 6], centerpiece: true },
    { kind: 'bellflower', count: [2, 3], radius: [20, 28], ring: [100, 150] },
    { kind: 'dew_bead', count: [1, 3], radius: [10, 15], ring: [84, 140] },
    { kind: 'flowers', count: [1, 2], radius: [12, 16], ring: [86, 140] },
  ],
});
registerCluster({
  id: 'skep_court',
  anchor: { radius: 36 },
  pieces: [
    { kind: 'beehive', count: [1, 1], radius: [11, 13], ring: [0, 8], centerpiece: true },
    { kind: 'beehive', count: [1, 2], radius: [10, 13], ring: [86, 128] },
    { kind: 'flowers', count: [2, 3], radius: [12, 16], ring: [80, 140] },
    { kind: 'dew_bead', count: [0, 2], radius: [10, 14], ring: [84, 132] },
  ],
});
registerCluster({
  id: 'mound_gate_court',
  anchor: { radius: 40 },
  pieces: [
    { kind: 'mound_gate', count: [1, 1], radius: [26, 34], ring: [0, 6], centerpiece: true },
    { kind: 'formic_mound', count: [2, 3], radius: [18, 26], ring: [104, 160] },
    { kind: 'formic_vent', count: [2, 4], radius: [9, 13], ring: [90, 150] },
    { kind: 'leaf_mulch', count: [1, 2], radius: [18, 26], ring: [88, 150] },
  ],
  poi: true,
});

// --- COMPOSITIONS -------------------------------------------------------------
// THE TENDER'S REST: where the giant set things down and never came back —
// the can on its side, pots where they were stacked, a trellis mid-mend.
// The country's scale thesis in one clearing.
registerComposition({
  id: 'tenders_rest',
  sites: [{ id: 'relic', radius: [56, 76], hard: true }],
  pre: [{ kind: 'clearing', at: 'relic', count: [1, 1], radius: [56, 76] }],
  post: [
    { kind: 'cluster', cluster: 'tender_relic_court', at: 'relic', count: [1, 1] },
    { kind: 'formation', formation: 'trellis_row', count: [1, 1] },
    { kind: 'flowers', count: [1, 2] },
    { kind: 'petal_drift', count: [1, 3] },
  ],
});

// THE BELL JAR GARDEN: one glass sky and the bed it kept — blooms grown
// taller inside the ring than anything the wind was allowed to touch.
registerComposition({
  id: 'bell_jar_garden',
  sites: [{ id: 'jar', radius: [52, 72], hard: true }],
  pre: [{ kind: 'clearing', at: 'jar', count: [1, 1], radius: [52, 72] }],
  post: [
    { kind: 'cluster', cluster: 'bell_jar_court', at: 'jar', count: [1, 1] },
    { kind: 'formation', formation: 'dew_string', count: [0, 1] },
  ],
});

// THE SKEP YARD: the Tender's hives still humming — skeps in the clover,
// and the bees that never noticed anyone leave. The bees themselves ride
// the fauna tables (habitat-bound to their hives), never a stamp.
registerComposition({
  id: 'skep_yard',
  sites: [{ id: 'yard', radius: [52, 72] }],
  pre: [{ kind: 'clearing', at: 'yard', count: [1, 1], radius: [52, 72] }],
  post: [
    { kind: 'cluster', cluster: 'skep_court', at: 'yard', count: [1, 1] },
    { kind: 'grass', count: [1, 2] },
  ],
});

// THE FORMIC EARTHWORKS: the colony's surface works — a gate spire in a
// cleared heart, the warren ring around it. Where this lands, the country
// goes DOWN (the mound_gate sidezone mints the formicary).
registerComposition({
  id: 'formic_earthworks',
  sites: [{ id: 'gate', radius: [60, 80], hard: true }],
  pre: [{ kind: 'clearing', at: 'gate', count: [1, 1], radius: [60, 80] }],
  post: [
    { kind: 'cluster', cluster: 'mound_gate_court', at: 'gate', count: [1, 1] },
    { kind: 'formation', formation: 'mound_warren', count: [0, 1] },
    { kind: 'seed_pod', count: [1, 3] },
    { kind: 'leaf_mulch', count: [1, 2] },
  ],
});

// --- THE FORMICARY'S ROOMS (interior roles, pool 'nest') ----------------------
// The nest names its own architecture: the queen's vault at the bottom of
// the BFS ladder (the sanctum contract in colony voice — POI so the deep
// room pays), brood galleries anywhere the tunnels widen, fungus gardens
// and the granary in the dead ends where the traffic isn't. Rooms furnish
// from the same stamp grammar as everything else; the 'nest' pool keeps
// crypt braziers out of the colony and colony eggs out of the crypts.
registerInteriorRole({
  id: 'queen_vault', pool: 'nest',
  pick: 'deepest', poi: true,
  furnish: [
    { kind: 'comb_wax', count: [2, 3] },
    { kind: 'egg_clutch', count: [2, 4] },
    { kind: 'petal_drift', count: [1, 2] },
  ],
});
registerInteriorRole({
  id: 'brood_gallery', pool: 'nest',
  pick: 'any', max: 2,
  furnish: [
    { kind: 'egg_clutch', count: [2, 4] },
    { kind: 'comb_wax', count: [1, 2] },
  ],
});
registerInteriorRole({
  id: 'fungus_garden', pool: 'nest',
  pick: 'deadend', max: 2,
  furnish: [
    { kind: 'toadstool', count: [2, 4] },
    { kind: 'leaf_mulch', count: [1, 2] },
    { kind: 'comb_wax', count: [0, 1] },
  ],
});
registerInteriorRole({
  id: 'granary', pool: 'nest',
  pick: 'deadend', max: 1,
  furnish: [
    { kind: 'seed_pod', count: [2, 4] },
    { kind: 'clay_pots', count: [1, 2] },
  ],
});
