// ---------------------------------------------------------------------------
// BIOME MELDS — "there really is a jungle up ahead" as an OPEN REGISTRY.
//
// A meld is a NEIGHBOR biome's edge dressing: when a zone's exit faces a
// DIFFERENT biome that declares one, the band of ground along that whole
// edge grows the foreign kit — ferns and brush pressing through the
// treeline, drifts reaching out of the taiga, sand on the meadow's hem —
// so "do I want to cross into there?" is a question the TERRAIN asks
// before the portal label does. The World resolves WHICH biome lies past
// each exit off the same heat-map prediction seam the portal labels and
// boundary gates ride (resolved neighbors read their real biome; '?'
// frontiers sample the field at the exact coord the mint will use), stamps
// the transient def.exitMelds annotation (index-aligned, re-derived every
// load, stripped at both persistence sites), and generateLayout raises the
// band as ordinary terrain through the stamp machinery under an edge WHERE
// gate (the axisX/axisY gen fields) — every placement rule (walk-gating,
// forbidOn, reservations, spacing) still applies.
//
// Adding a meld = one registerMeld row + `meld: '<id>'` on the biome
// (world/biomes.ts BiomeInfo.meld — a structural string ref, the enclave
// gate idiom, so the pure-leaf biome table never imports this registry).
// Melds draw from a DEDICATED per-exit rng (zone seed ^ exit index), so a
// neighbor resolving differently later never shifts the zone's own layout
// stream — only the band itself re-dresses.
// ---------------------------------------------------------------------------

/** One dressing row: an ordinary stamp row the builder emits inside the
 *  band. Kept structural (kind/count/radius) — validate.ts sweeps these
 *  through the same stamp-registry checks every layout row gets. */
export interface MeldRow {
  kind: string;
  count: [number, number];
  radius?: [number, number];
}

export interface MeldDef {
  id: string;
  /** Band depth in px from the melded edge (default MELD_CFG.band). */
  band?: number;
  /** The foreign kit, emitted inside the band. */
  rows: MeldRow[];
  /** Exit-label suffix worn by the crossing ("· the green presses close"). */
  label?: string;
}

/** Modular defaults — the band depth every meld inherits unless it says
 *  otherwise (tune here, never at a call site). */
export const MELD_CFG = { band: 250 } as const;

export const MELDS: Record<string, MeldDef> = {};

export function registerMeld(def: MeldDef): void {
  if (MELDS[def.id]) console.warn(`[melds] re-registering '${def.id}' — overriding`);
  MELDS[def.id] = def;
}

export function meldOf(id: string | undefined): MeldDef | undefined {
  return id ? MELDS[id] : undefined;
}

// --- THE STOCK ROWS -----------------------------------------------------------

// THE JUNGLE'S REACH — the green does not wait at its border: mats of vine,
// ferns and walkable brush spill across the neighboring edge, a bloom lights
// the growth, and sometimes a full cuttable plug has already taken the lane.
registerMeld({
  id: 'jungle_meld',
  label: 'the green presses close',
  rows: [
    { kind: 'vines', count: [2, 4] },
    { kind: 'fern', count: [2, 4] },
    { kind: 'brush', count: [2, 3] },
    { kind: 'jungle_bloom', count: [1, 2] },
    { kind: 'jungle_brush', count: [0, 2] },
    { kind: 'strangler_root', count: [0, 1] },
  ],
});

// THE MOUNTAINS' REACH — the range announces its stone before its snow:
// scattered rock and scree past the last soft ground, the first hardy pines,
// a cairn somebody stacked to find the way back down.
registerMeld({
  id: 'mountain_meld',
  label: 'the mountains rise ahead',
  rows: [
    { kind: 'rocks', count: [2, 4], radius: [12, 24] },
    { kind: 'scree', count: [1, 3] },
    { kind: 'conifers', count: [1, 2] },
    { kind: 'cairn', count: [0, 1] },
  ],
});

// THE TAIGA'S REACH — the cold comes out to meet you: standing drifts past
// the treeline, the first dark conifers, the odd fang of standing ice.
registerMeld({
  id: 'taiga_meld',
  label: 'the cold reaches here',
  rows: [
    { kind: 'snowdrift', count: [2, 4] },
    { kind: 'conifers', count: [1, 3] },
    { kind: 'ice_spike', count: [0, 2] },
  ],
});

// THE DESERT'S REACH — sand on the wind long before the dunes: pale lobes
// drifted over the grass, a cactus that has no business surviving here —
// and, rarely, the deep faces' litter blown all the way out: a squat salt
// column off the glasspan, a fused pane the lightning left in the pan.
registerMeld({
  id: 'desert_meld',
  label: 'sand on the wind',
  rows: [
    { kind: 'sand', count: [2, 4] },
    { kind: 'cactus', count: [0, 2] },
    { kind: 'rocks', count: [1, 2], radius: [10, 20] },
    { kind: 'salt_pillar', count: [0, 2] },
    { kind: 'glass_shard', count: [0, 1] },
  ],
});

// THE FARMLAND'S REACH — the worked land announces itself: the first wheat
// stands past the treeline, a rail fence somebody still mends, a bale left
// where the cutting stopped.
registerMeld({
  id: 'farmland_meld',
  label: 'the fields begin',
  rows: [
    { kind: 'wheat', count: [2, 4] },
    { kind: 'hay_bale', count: [0, 2] },
    { kind: 'grass', count: [1, 3] },
    { kind: 'flowers', count: [0, 2] },
    { kind: 'scarecrow', count: [0, 1] },
  ],
});

// THE CITY'S REACH — the road grows crowded before the wall does: a lamp
// somebody lights, cast-off cargo, rubble where the verge was quarried.
registerMeld({
  id: 'metropolis_meld',
  label: 'the city rises beyond',
  rows: [
    { kind: 'street_lamp', count: [1, 2] },
    { kind: 'broken_cart', count: [0, 1] },
    { kind: 'rubble', count: [1, 2] },
    { kind: 'hay_bale', count: [0, 1] },
  ],
});

// THE GARDEN'S REACH — the country ahead grows TALLER than country should:
// blade-grass over your head, petals drifted out past the last stand, one
// young bloom stalk scouting the verge like a sapling that got ideas.
registerMeld({
  id: 'garden_meld',
  label: 'the blooms stand tall ahead',
  rows: [
    { kind: 'wildgrass_blade', count: [2, 4] },
    { kind: 'petal_drift', count: [1, 3] },
    { kind: 'bloom_stalk', count: [0, 1], radius: [22, 32] },
    { kind: 'flowers', count: [1, 2] },
    { kind: 'dew_bead', count: [0, 1] },
  ],
});

// The Grove country's edge: green shade pressing close, and — if you cross
// at the right hour — the first few small lights of the wood's night.
registerMeld({
  id: 'grove_meld',
  label: 'small lights drift between the trees ahead',
  rows: [
    { kind: 'trees', count: [1, 2] },
    { kind: 'brush', count: [1, 2] },
    { kind: 'fern', count: [1, 2] },
    { kind: 'glow_cap', count: [1, 2] },
    { kind: 'lantern_bloom', count: [0, 1] },
  ],
});

// --- THE CENSUS ROWS (2026-07-31) ----------------------------------------------
// Every biome with true border adjacency now announces itself (the wildlife-
// expansion precedent: a row or an in-code silence ruling on the BiomeInfo,
// none left ambiguous). Kinds are all registered stamps with inert rules —
// no meld exports an active hazard or a water-habitat kind onto a dry border
// band (the shore rows speak in the tide-LEFT vocabulary on purpose).

// THE FOREST'S REACH — where the grove invites, the forest warns: the first
// knit crowns shade the verge, an elder stands sentinel past the treeline,
// and the light under the boughs already runs a shade too dark.
registerMeld({
  id: 'forest_meld',
  label: 'the old wood closes ahead',
  rows: [
    { kind: 'trees', count: [1, 2] },
    { kind: 'ancient_tree', count: [0, 1] },
    { kind: 'brush', count: [1, 3] },
    { kind: 'fern', count: [1, 2] },
    { kind: 'log', count: [0, 1] },
  ],
});

// THE GLOAMWOOD'S REACH — the haunted wood does not keep to itself: crooked
// grey crowns lean over the border, snags stand where trees gave up, briar
// snarls test the ground — and somewhere a bell swings that no hand rung.
registerMeld({
  id: 'gloamwood_meld',
  label: 'the gloam gathers ahead',
  rows: [
    { kind: 'gloam_oak', count: [1, 2] },
    { kind: 'dead_tree', count: [1, 2] },
    { kind: 'briarwood', count: [0, 2] },
    { kind: 'witch_bell', count: [0, 1] },
  ],
});

// THE GRAVELANDS' REACH — the dead do not stop at their own fence: stray
// markers past the boundary, a snag the mourners left, old bones working
// up through the turf, a wax-drowned stump somebody still keeps lit.
registerMeld({
  id: 'grave_meld',
  label: 'the graves begin',
  rows: [
    { kind: 'tombstone', count: [1, 2] },
    { kind: 'dead_tree', count: [1, 2] },
    { kind: 'bone_pile', count: [0, 2] },
    { kind: 'tallow_stump', count: [0, 1] },
  ],
});

// THE FIELDS' REACH — the expanse announces itself the only way open country
// can: the grass runs longer, the flowers thicken, and one lone tree stands
// where the horizon starts getting serious.
registerMeld({
  id: 'field_meld',
  label: 'the grass runs wide ahead',
  rows: [
    { kind: 'grass', count: [2, 4] },
    { kind: 'flowers', count: [1, 3] },
    { kind: 'trees', count: [0, 1] },
  ],
});

// THE STRAND'S REACH — salt air before the water shows: pale sand worked
// into the soil, a barnacled rock the tide once owned, wrack heaped at the
// old high-water line. SHARED by beach and isle (one shore vocabulary,
// spoken from either side of the water) — and deliberately AMPHIBIOUS:
// deep-sea zones border the archipelago constantly, so every kind here
// reads as honestly on a seabed band as on a dry one (no palms).
registerMeld({
  id: 'strand_meld',
  label: 'salt air ahead',
  rows: [
    { kind: 'sand', count: [2, 4] },
    { kind: 'sea_rock', count: [1, 2] },
    { kind: 'kelp_wrack', count: [1, 2] },
    { kind: 'reeds', count: [0, 2] },
  ],
});

// THE LITTORAL'S REACH — the land starts wading before the border does:
// wrack lines, a pool the tide forgot, rushes closing in, a stilt-rooted
// tide tree scouting up the hem, a dead reef head dried to bone.
registerMeld({
  id: 'littoral_meld',
  label: 'the tide country begins',
  rows: [
    { kind: 'kelp_wrack', count: [1, 3] },
    { kind: 'reeds', count: [1, 2] },
    { kind: 'tide_pool', count: [0, 2] },
    { kind: 'mangrove', count: [0, 1] },
    { kind: 'bleached_coral', count: [0, 1] },
  ],
});

// THE DEEP'S REACH — the ocean sends its dead ahead of it: wrack thrown
// higher than any living tide, coral bleached to bone, rocks the swells
// have been chewing for a thousand years. Past here the water doesn't stop.
registerMeld({
  id: 'deepsea_meld',
  label: 'the deep begins past here',
  rows: [
    { kind: 'kelp_wrack', count: [1, 3] },
    { kind: 'bleached_coral', count: [1, 2] },
    { kind: 'sea_rock', count: [1, 2] },
  ],
});

// THE RIFT'S REACH — the war's wound seeps: ground vitrified to hate-lit
// glass, trees the tearing killed where they stood, masonry nobody will
// reclaim, and the bones of whoever held this far.
registerMeld({
  id: 'rift_meld',
  label: "the war's old wound ahead",
  rows: [
    { kind: 'hate_glass', count: [1, 2] },
    { kind: 'dead_tree', count: [1, 2] },
    { kind: 'rubble', count: [1, 2] },
    { kind: 'bone_pile', count: [0, 1] },
  ],
});

// THE TUNDRA'S REACH — the open cold, distinct from the taiga's wooded one
// (drifts WITHOUT the treeline): bare drifts, scoured stone, one fang of
// standing ice, and the odd vent steaming where the deep heat leaks.
registerMeld({
  id: 'tundra_meld',
  label: 'the white waste opens ahead',
  rows: [
    { kind: 'snowdrift', count: [2, 4] },
    { kind: 'rocks', count: [1, 2], radius: [10, 20] },
    { kind: 'ice_spike', count: [0, 1] },
    { kind: 'geyser', count: [0, 1] },
  ],
});

// THE HIGHLANDS' REACH — the butte country stands up before you reach it:
// the first pinnacle needles, scree fanned off the tables, dry stone and a
// cactus that likes the warm side of thin air.
registerMeld({
  id: 'butteland_meld',
  label: 'the tables stand ahead',
  rows: [
    { kind: 'rock_spire', count: [1, 2] },
    { kind: 'scree', count: [1, 3] },
    { kind: 'rocks', count: [1, 2], radius: [12, 24] },
    { kind: 'cactus', count: [0, 1] },
  ],
});

// THE KARST'S REACH — wind-cut stone creeping out of its country: limestone
// litter, gravel fans, a downed bole gone to rock — and one whole tree the
// gaze caught, still standing, wrong.
registerMeld({
  id: 'karst_meld',
  label: 'wind-cut stone ahead',
  rows: [
    { kind: 'rocks', count: [1, 3], radius: [14, 30] },
    { kind: 'scree', count: [1, 2] },
    { kind: 'petrified_trunk', count: [0, 1] },
    { kind: 'petrified_tree', count: [0, 1] },
  ],
});

// THE DOWNS' REACH — old walked land announcing itself politely: cropped
// grass, grey stone working out of the turf, a raised stone somebody
// meant something by, a barrow that only watches.
registerMeld({
  id: 'downs_meld',
  label: 'the old downs roll ahead',
  rows: [
    { kind: 'grass', count: [1, 3] },
    { kind: 'rocks', count: [1, 2], radius: [12, 26] },
    { kind: 'standing_stone', count: [0, 1] },
    { kind: 'barrow_mound', count: [0, 1] },
  ],
});

// THE MARSH'S REACH — the bog tests the ground ahead of itself: reeds where
// reeds shouldn't pay, the soil going soft and dark, a log half-swallowed,
// cut peat, and a light over the mire that is not a lantern.
registerMeld({
  id: 'marsh_meld',
  label: 'the ground goes soft ahead',
  rows: [
    { kind: 'reeds', count: [2, 4] },
    { kind: 'mud', count: [1, 2] },
    { kind: 'sunken_log', count: [0, 1] },
    { kind: 'peat_mound', count: [0, 1] },
    { kind: 'marsh_wisp', count: [0, 1] },
  ],
});

// THE FLESH'S REACH — the meat country grows past its own border: viscera
// pooled where ground should be, a rib strut heaved through the soil, a
// polyp taking root, vessels webbing out toward whatever feeds them.
registerMeld({
  id: 'flesh_meld',
  label: 'the ground breathes past here',
  rows: [
    { kind: 'gore', count: [1, 2] },
    { kind: 'bone', count: [1, 2] },
    { kind: 'flesh_pod', count: [0, 1] },
    { kind: 'vein_cluster', count: [0, 1] },
  ],
});

// THE CRYSTAL'S REACH — the shard country COATS before it endangers: the
// Fields' grass-hemmed edges answered in glass. A sward of walk-through
// shardgrass runs the band the way the meadow's grass runs its own, a
// composed shard bed or two rise out of it (the resplendence kit's
// reusable clustering — data/clusters.ts), and the old solitaires keep
// their posts: knee-high lattices, a split geode bowl, one tall needle
// that TOLLS when struck — the singing stone, not yet the burning kind.
registerMeld({
  id: 'crystal_meld',
  label: 'the light splinters ahead',
  rows: [
    { kind: 'shardgrass', count: [3, 5] },
    { kind: 'shard_bed', count: [1, 2] },
    { kind: 'rocks', count: [1, 2], radius: [12, 22] },
    { kind: 'crystal_cluster', count: [0, 2] },
    { kind: 'crystal_spire', count: [0, 1] },
    { kind: 'geode_shell', count: [0, 1] },
  ],
});

// THE VOLCANIC'S REACH — ash on the wind, the fire country's calling card:
// cinder drifts greying the ground, black glass heaved out of old flows,
// gravel the mountain spat. The vents themselves stay home.
registerMeld({
  id: 'volcanic_meld',
  label: 'ash on the wind',
  rows: [
    { kind: 'cinder', count: [1, 3] },
    { kind: 'obsidian', count: [1, 2] },
    { kind: 'scree', count: [0, 2] },
  ],
});

// THE MYCELIA'S REACH — the bloom seeds ahead of its own body: speckled
// caps in the leaf-rot, small lights where the spores took, brackets off a
// dying trunk, and one grown tower that means the carpet runs deep.
registerMeld({
  id: 'mycelia_meld',
  label: 'spores drift on the air',
  rows: [
    { kind: 'toadstool', count: [1, 3] },
    { kind: 'glow_cap', count: [1, 2] },
    { kind: 'shelf_fungus', count: [0, 1] },
    { kind: 'giant_mushroom', count: [0, 1] },
  ],
});

// THE COURTLANDS' REACH — the ring-court belt reads as RELIEF from either
// side (the threshold rhythm: open ground is the peril, the rings are the
// rest): palms greening the hem, a stone well-ring that still draws, a
// traveler's shade fly, amphorae cached against the crossing. Water and
// shade promised at the border — the courts' whole argument, one band out.
registerMeld({
  id: 'courtland_meld',
  label: 'the ring-courts stand ahead',
  rows: [
    { kind: 'palm', count: [1, 2] },
    { kind: 'well', count: [0, 1] },
    { kind: 'sun_awning', count: [0, 1] },
    { kind: 'pot_cluster', count: [1, 2] },
  ],
});

// --- HELL'S COUNTRIES ----------------------------------------------------------
// meldFor samples the DIMENSION'S own field for '?' frontiers (world.ts —
// dimensionBiomeFor), so the underworld's palette biomes border each other
// exactly as surface countries do; these rows make hell's crossings read.
// (Surface-seeded rift/volcanic/flesh/grave serve their hell seats free.)

// THE STEPPES' REACH — the scorched marches announce the legions' side of
// the border: basalt horn-blades breaking the crust, a warning stake with
// its warning still on it, a titan chain running toward something below.
registerMeld({
  id: 'steppes_meld',
  label: 'the scorched marches ahead',
  rows: [
    { kind: 'hell_fin', count: [1, 2] },
    { kind: 'impaler_stake', count: [0, 2] },
    { kind: 'hell_chain', count: [0, 1] },
    { kind: 'ember_fissure', count: [0, 1] },
  ],
});

// THE CAUL'S REACH — the organism grows toward you: black blade-plates in
// rows the ground didn't choose, nerve filaments webbing out, an egg-sac
// glowing dimly where no light should keep.
registerMeld({
  id: 'caul_meld',
  label: 'the black membrane presses close',
  rows: [
    { kind: 'chitin_fin', count: [1, 2] },
    { kind: 'nerve_root', count: [1, 2] },
    { kind: 'caul_sac', count: [0, 2] },
  ],
});

// THE WARFRONT'S REACH — the guns walk their barrages past their own line:
// shell-pocks clustered where a battery ranged long, a spent stone ball,
// a burst gabion, and the Grind's standard claiming ground it hasn't won.
registerMeld({
  id: 'warfront_meld',
  label: 'the guns reach even here',
  rows: [
    { kind: 'shell_crater', count: [2, 4] },
    { kind: 'siege_shot', count: [0, 1] },
    { kind: 'gabion', count: [0, 1] },
    { kind: 'war_standard', count: [0, 1] },
  ],
});

// THE FLAME'S REACH — hell's artery is found by its banks before its water:
// cinder washed out over the crust, old glass, a pale bone-pyre the banks
// keep lit, a legion banner marking the tow-path. Follow the glow.
registerMeld({
  id: 'flame_meld',
  label: 'the fire-river glows ahead',
  rows: [
    { kind: 'cinder', count: [1, 2] },
    { kind: 'obsidian', count: [0, 2] },
    { kind: 'pyre_heap', count: [0, 1] },
    { kind: 'demon_banner', count: [0, 1] },
  ],
});

// THE DURANCE'S REACH — the citadel lights its own approach (the metropolis
// precedent: enclave gate AND meld compose — the façade is the door, this
// is the road to it): cold green braziers pacing the way in, a bolted
// chain, masonry the halls shed.
registerMeld({
  id: 'durance_meld',
  label: 'the citadel lights its approach',
  rows: [
    { kind: 'hate_brazier', count: [1, 2] },
    { kind: 'hell_chain', count: [0, 1] },
    { kind: 'rubble', count: [1, 2] },
  ],
});

// THE SOULWAY'S REACH — one ferry-hub per realm (world/soulriver.ts), so
// this band is rare and worth believing: rushes gone pale at a waterline
// that isn't there yet, a mourners' cairn, a statue the flow took back.
// Resolved-neighbor adjacency only (the seat is in no palette, so '?'
// frontiers never predict it) — the banks announce a river already found.
registerMeld({
  id: 'soulway_meld',
  label: 'the pale river glimmers ahead',
  rows: [
    { kind: 'pale_rushes', count: [1, 3] },
    { kind: 'drowned_cairn', count: [0, 1] },
    { kind: 'sunken_statue', count: [0, 1] },
  ],
});

// --- THE PER-FACE VOICES (#50 Part B, 2026-08-01) ------------------------------
// A tileset may override its biome's edge dressing (TilesetDef.meld — the
// precedence read is World.meldFor's: tileset ▷ biome, RESOLVED NEIGHBORS
// ONLY, because a '?' frontier carries just the field's predicted biome and
// no face exists until the mint rolls one). These are the faces whose
// vocabulary genuinely diverges from their biome's generic kit — the deep
// desert's three countries first. Every kind below is a registered stamp
// with an inert rule, the standing meld laws (no hazards, modest counts,
// spacing that fits the band) held.

// THE GLASSPAN'S REACH — the dead lake announces itself in its own minerals:
// squat salt columns for a treeline, panes the lightning fused, a strike
// fork still standing, and the bleach-bone the pan keeps forever. Not one
// grain of the waste's soft sand — this border is hard country's word.
registerMeld({
  id: 'saltflat_meld',
  label: 'salt and glass glitter ahead',
  rows: [
    { kind: 'salt_pillar', count: [2, 4] },
    { kind: 'glass_shard', count: [1, 2] },
    { kind: 'fulgurite', count: [0, 1] },
    { kind: 'bone_pile', count: [0, 1] },
  ],
});

// THE ERG'S REACH — the deep desert's warning is SCALE, not litter: sand
// heaped higher than the waste ever piles it, the air already bending, and
// the bones of whoever mistook the horizon for a destination. (No mirage on
// the hem — mirage_oasis spaces at 520 and mostly refuses a 250 band; the
// erg's lie waits inside, where it belongs.)
registerMeld({
  id: 'sandsea_meld',
  label: 'the dunes swallow the horizon',
  rows: [
    { kind: 'sand', count: [3, 5] },
    { kind: 'heat_shimmer', count: [1, 2] },
    { kind: 'bone_pile', count: [0, 2] },
    { kind: 'rocks', count: [0, 1], radius: [18, 34] },
  ],
});

// THE SEETHE'S REACH — the colony molts where it marches: shed carapace in
// drifts, a clutch set in resin past the warren's rim, an amber seep, one
// young spire scouting the verge. The sand past here is already claimed —
// the threshold rhythm as a WARNING this time, not the courts' relief.
registerMeld({
  id: 'hivesands_meld',
  label: 'chitin litter on the sand',
  rows: [
    { kind: 'brood_husk', count: [1, 3] },
    { kind: 'egg_clutch', count: [0, 2] },
    { kind: 'resin_node', count: [0, 1] },
    { kind: 'hive_spire', count: [0, 1] },
    { kind: 'sand', count: [1, 2] },
  ],
});
