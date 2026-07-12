// ---------------------------------------------------------------------------
// DOODAD VISUALS — every doodad kind's look, as data. Each entry names a
// painter from the render library (render/vis/painters.ts) plus its params;
// paint ORDER replaces the old hand-sequenced branch chain (liquids under
// pits under bridges under standing objects), `shadow` grants a contact
// shadow, `light` feeds the dynamic light layer, and `canopy` names the crown
// painter for kinds that occlude (drawn above actors, proximity-faded).
//
// Adding a doodad kind = adding one entry here. Colors accept 'theme:<key>'
// (with '|#fallback') so a single entry reskins itself per biome. Kinds with
// no entry draw the warned generic disc — visible first, dressed later.
// ---------------------------------------------------------------------------

import type { DoodadVisualDef } from '../render/vis/painters';

export const DOODAD_VISUALS: Record<string, DoodadVisualDef> = {

  // --- Sailing layer (under everything) -----------------------------------
  landmass: { painter: 'landmass', order: 4 },

  // --- Liquid + ground overlays (merged blob silhouettes) -----------------
  // WATER — one hue family, depth told by tone: fords DERIVE from the deep
  // color and meld in as soft gradients (no second water, no cut line). The
  // surface is STILL until disturbed — rings come only from moving bodies
  // (renderer motion-FX wakes) — with just the slow sheen drifting over the
  // deep. Lily pads grow on true coastline, in randomized clumps.
  water: {
    painter: 'liquid', order: 10,
    params: {
      rim: { color: '#9ab8cc', alpha: 0.5, grow: 4 },
      core: { color: 'theme:water|#1d4264', alpha: 0.85 },
      fords: { lighten: 0.3, alpha: 0.55 },
      sheen: { color: '#d8f0fa' },
      pads: { color: '#6ba036', biomes: ['grove', 'meadow', 'isle'] },
    },
  },
  // TERRAIN BLEND LEVER (DoodadVisualDef.blend): each ground family names how
  // hard it meshes into the land — a bog seeps furthest, grass feathers less,
  // a gravel road beds subtlest. One data field per kind; retune freely.
  bog: {
    painter: 'liquid', order: 12,
    blend: { strength: 0.5, feather: 30, color: '#39432a' },
    params: {
      rim: { color: '#39432a', alpha: 0.6, grow: 3 },
      core: { color: '#5a6e34', alpha: 0.5, grow: -8 },
      squiggles: { color: '#7a8a4a' },
      bubbles: { color: '#a8bc72' },
    },
  },
  swamp: {
    painter: 'liquid', order: 14,
    blend: { strength: 0.48, feather: 28, color: '#2e3a2a' },
    params: {
      core: { color: '#2e3a2a', alpha: 0.55 },
      scum: { color: '#5c7448' },
    },
  },
  mud: {
    painter: 'liquid', order: 16,
    blend: { strength: 0.42, feather: 24, color: 'theme:mud|#2b2518' },
    params: {
      core: { color: 'theme:mud|#2b2518', alpha: 0.4 },
      blotch: { color: '#181209' },
    },
  },
  sand: {
    painter: 'liquid', order: 18,
    blend: { strength: 0.42, feather: 26, color: 'theme:sand|#c9a86a' },
    params: { core: { color: 'theme:sand|#c9a86a', alpha: 0.4 } },
  },
  road: {
    painter: 'gravelPath', order: 20,
    blend: { mode: 'path', strength: 0.3, feather: 12, color: 'theme:road|#574f44' },
    params: { color: 'theme:road|#574f44' },
  },
  // LAVA reads as FIRE UNDER PACK ICE now: hot hearts glow up through the
  // merged flow, dark crust plates ride the surface with melt seams burning
  // at their edges, crawl-glow wanders beneath. One body, like water.
  lava: {
    painter: 'liquid', order: 22,
    params: {
      rim: { color: '#ff5a1e', alpha: 0.6, grow: 4 },
      core: { color: 'theme:lava|#7a1a08', alpha: 1 },
      melt: { hot: '#ff8a3a', crust: '#2a0f06' },
      crawl: { color: '#ffb04a' },
    },
    light: { radius: -1.8, color: '#ff6a26', intensity: 0.55 },
  },
  // MAGMA CORE — the WALL the lava-liquid no longer is: dense slag plates
  // over a furnace heart, rim burning hard so the barrier reads "do not
  // cross" at a glance (the caldera's spiral is built from this).
  magma_core: {
    painter: 'liquid', order: 23,
    params: {
      rim: { color: '#ff7a2a', alpha: 0.85, grow: 5 },
      core: { color: '#3a1206', alpha: 1 },
      melt: { hot: '#ffb04a', crust: '#160a05' },
      crawl: { color: '#ff8a3a' },
    },
    light: { radius: -2.2, color: '#ff7a2a', intensity: 0.65 },
  },
  // CINDER = a cooling coal bed: the merged field carries dense ember
  // glints, each pulsing on its own clock — coals, readable as coals.
  cinder: {
    painter: 'liquid', order: 24,
    params: {
      rim: { color: '#2a1a12', alpha: 0.55, grow: 3 },
      core: { color: '#241610', alpha: 0.5 },
      embers: { color: '#ff7a2a', density: 0.34 },
    },
    light: { radius: -1.2, color: '#ff7a2a', intensity: 0.16, flicker: 1.8 },
  },
  // --- The hell-steppes kit (the Underworld's scorched marches) ------------
  // TITAN CHAINS lie flat on the crust (ground order, under standing objects).
  hell_chain: {
    painter: 'groundChain', order: 36,
    params: { iron: '#3c3a40', rust: '#7a3a1e', plate: '#2c2a30' },
  },
  // ABYSSAL RENTS: the steppes' bottomless tears — the chasmPit drop in hell's
  // palette: warm-black wells, ember mist, a fire-glow breathing from below.
  abyssal_rent: {
    painter: 'chasmPit', order: 38,
    params: {
      rim: { color: '#4a2012', alpha: 0.5, grow: 6 },
      core: { color: '#070204' },
      bands: 2,
      cracks: { chance: 0.6 },
      ledges: {},
      mist: { color: '#c96a3a', alpha: 0.07 },
      glow: { color: '#ff5a1a', alpha: 0.16 },
    },
    light: { radius: -1.4, color: '#ff5a1a', intensity: 0.2, flicker: 1.4 },
  },
  // EMBER FISSURES: small crust-rents all crack and glow — the fire underneath
  // showing through (no shelf terrace at this scale: bands 0).
  ember_fissure: {
    painter: 'chasmPit', order: 39,
    params: {
      rim: { color: '#3a1a10', alpha: 0.5, grow: 4 },
      core: { color: '#120507' },
      bands: 0,
      cracks: { chance: 0.9, color: '#c94a16' },
      glow: { color: '#ff6a1e', alpha: 0.3 },
    },
    light: { radius: -2.2, color: '#ff5a16', intensity: 0.3, flicker: 2.6 },
  },
  // GATE STAIRS: the descent off a gate terrace — fortress stone matching the
  // rampart masonry it leaves, ember light seeping from the riser seams.
  gate_stair: {
    painter: 'stairFlight', order: 42,
    params: {
      stone: '#4a4752', edge: '#16131d',
      glow: { color: '#ff8a3a', alpha: 0.22 },
    },
  },
  hell_fin: {
    painter: 'finBlade', order: 52, shadow: 0.6, longShadow: 1.5,
    params: {
      color: 'theme:obstacle|#2c1a16', material: 'stone',
      emberEdge: { color: 'theme:accent|#ff7a2a', alpha: 0.45 },
    },
  },
  impaler_stake: {
    painter: 'impaler', order: 53, shadow: 0.5, longShadow: 1.6,
    params: { wood: '#382018', husk: '#191013', wrap: '#3a3026' },
  },
  gore: {
    painter: 'liquid', order: 26,
    params: {
      rim: { color: '#3a0a12', alpha: 0.6, grow: 3 },
      core: { color: '#5a1420', alpha: 0.82 },
      glisten: { color: '#e8a8b0' },
    },
  },
  // THE HYPHAL NETWORK: the fungal floor is a living circuit — filaments
  // crawl out of the mat and nutrient pulses travel the strands.
  mycelial_mat: {
    painter: 'hyphae', order: 28,
    params: { base: '#6fae4a', strand: '#9fd47a', pulse: '#d8ffb0' },
    light: { radius: -1.3, color: '#8fd06f', intensity: 0.14 },
  },
  vines: {
    painter: 'liquid', order: 30,
    params: {
      core: { color: '#1f3a1c', alpha: 1, grow: 2 },
      inner: { color: '#000000', alpha: 0.4, grow: -6 },
    },
  },
  ice: {
    painter: 'liquid', order: 32,
    params: {
      rim: { color: '#e8f4fc', alpha: 0.32, grow: 3 },
      core: { color: '#bcd8e8', alpha: 0.28 },
      glassSheen: { color: '#ffffff' },
    },
  },
  heat_shimmer: {
    painter: 'shimmer', order: 34,
    params: { color: '#ffe8c0' },
  },
  /** Volumetric fog: a faint floor wash here; the swirling BILLOWS ride the
   *  canopy pass (fogCloud) so the murk covers whoever stands inside. */
  fog_bank: {
    painter: 'fogFloor', order: 36,
    params: { color: '#aab6c2' },
    canopy: { painter: 'fogCloud', params: { fill: '#aab6c2' } },
  },

  // --- The doodad kingdom (round 4) ----------------------------------------
  flowers: {
    painter: 'liquid', order: 46,
    params: {
      core: { color: '#5c3a5c', alpha: 0.14 },
      tufts: { color: '#d88ab8' },
    },
  },
  snowdrift: {
    painter: 'liquid', order: 21,
    blend: { strength: 0.3, feather: 26, color: '#e6eef6' },
    params: {
      rim: { color: '#f0f6fc', alpha: 0.22, grow: 3 },
      core: { color: '#dce8f2', alpha: 0.22 },
    },
  },
  // Reed beds ride the kelp painter's ribbon blades, standing straighter and
  // thinner, tipped with cattail seed heads.
  // Reeds ride the kelp painter as a WHOLE-SPRITE sway bake (the fern
  // recipe): the blades bake once per variant, the shear supplies the sway —
  // a reed shoreline was 3-5 live-stroked blades per doodad per frame.
  reeds: { painter: 'kelp', order: 48, bakeWhole: 'sway', params: { color: '#5a7a3a', reed: true } },
  web: { painter: 'web', order: 42, params: { color: '#d8d4c8' } },
  cactus: {
    painter: 'cactus', order: 53, shadow: 0.6, longShadow: 0.8,
    params: { color: '#4a7a3c' },
  },
  dead_tree: {
    painter: 'deadTree', order: 54, shadow: 0.55, longShadow: 1.0,
    params: { color: '#4a4038' },
  },
  stump: {
    painter: 'stump', order: 52, shadow: 0.5,
    params: { color: '#8a6e48' },
  },
  log: {
    painter: 'log', order: 52, shadow: 0.55,
    params: { color: '#5e4a32', moss: 'theme:tree|#3c5c2e' },
  },
  geyser: {
    painter: 'vent', order: 50, longShadow: 0.5,
    params: { rim: '#3a4a4e', throat: '#152226', hot: '#7fd0e8', core: '#e8fbff' },
    light: { radius: -2.6, color: '#9fe0f0', intensity: 0.3, flicker: 2.8 },
  },
  bone_pile: { painter: 'bones', order: 51, params: { color: '#d8cdb8' } },
  brazier: {
    painter: 'campfire', order: 53, shadow: 0.5, longShadow: 0.6,
    params: { bowl: true }, // an iron fire-bowl, not a ring of stones
    light: { radius: -5.5, color: '#ffb45e', intensity: 0.55, flicker: 5 },
  },
  standing_stone: {
    painter: 'slab', order: 54, shadow: 0.65, longShadow: 1.2,
    params: { shape: 'monolith', fill: 'theme:obstacle', edge: 'theme:obstacleEdge' },
  },
  // The wayfarer kit — roadside & village-story furniture.
  weathered_statue: {
    painter: 'statue', order: 54, shadow: 0.6, longShadow: 1.5,
    params: { stone: 'theme:obstacle|#8a8578', moss: '#5a6e42' },
  },
  wayshrine: {
    painter: 'wayshrine', order: 55, shadow: 0.45, longShadow: 0.9,
    params: { stone: '#7e7668', roof: '#4e4438', flame: '#ffd890' },
    light: { radius: -4.2, color: '#ffd890', intensity: 0.4, flicker: 3.2 },
  },
  gallows: {
    painter: 'gallows', order: 55, shadow: 0.5, longShadow: 1.8,
    params: { wood: '#5c4a34', rope: '#a89468' },
  },
  fishing_rack: {
    painter: 'fishingRack', order: 53, shadow: 0.35, longShadow: 0.8,
    params: { wood: '#6a5a40', fish: '#b0a284' },
  },
  charcoal_mound: {
    painter: 'kilnMound', order: 50, shadow: 0.4, longShadow: 0.4,
    params: { earth: '#3c342a', ember: '#ff9a48' },
    light: { radius: -2.4, color: '#ff9a48', intensity: 0.3, flicker: 2.2 },
  },
  grass: {
    painter: 'liquid', order: 47,
    blend: { strength: 0.38, feather: 22, color: 'theme:grass|#3e5c30' },
    params: {
      core: { color: 'theme:grass|#3e5c30', alpha: 0.22 },
      tufts: { color: 'theme:grass|#3e5c30', flower: '#d8c86a' },
    },
  },
  // The Field's SOFT BOUNDARY: overlapping tuft mounds straddling the
  // tallgrass rim, blended hard into the land — the raster's right angles
  // disappear under a rolling hedge line.
  hedgerow: {
    painter: 'liquid', order: 46,
    blend: { strength: 0.5, feather: 28, color: '#182c0e' },
    params: {
      core: { color: '#1d3410', alpha: 0.9 },
      tufts: { color: '#5a9038', flower: '#c8d86a' },
    },
  },

  // --- Pits (the void wins over every ground overlay), then spans ---------
  // THE DROP READS AS A DROP: lip stone, a descending shelf, per-well depth
  // gradients, fracture cracks in the ground that failed, overhang slabs,
  // and mist breathing far below. Chains merge into one wound (blob paths).
  void_chasm: {
    painter: 'chasmPit', order: 38,
    params: {
      rim: { color: '#3a2a52', alpha: 0.45, grow: 6 },
      core: { color: '#020205' },
      cracks: { chance: 0.55 },
      ledges: {},
      mist: { color: '#6a5a92', alpha: 0.07 },
      glow: { color: '#7a5ab8', alpha: 0.1 },
    },
  },
  chasm: {
    painter: 'chasmPit', order: 40,
    params: {
      rim: { color: 'theme:obstacleEdge', alpha: 0.5, grow: 6 },
      core: { color: 'theme:chasm|#040409' },
      cracks: {},
      ledges: {},
      mist: {},
    },
  },
  bridge: { painter: 'plank', order: 44 },
  // THE CRAG: the chasm's inverse, drawn RAISED — thrown ground shadow, flank
  // band, inset plateau bevel, sun-keyed rims, chance-rolled accents. A
  // wandering cliff chain reads as ONE ridge (merged blobs).
  cliff: {
    painter: 'cliffMass', order: 46,
    params: {
      color: 'theme:obstacle', edge: 'theme:obstacleEdge', material: 'stone',
      strata: {}, cracks: 1, moss: { color: 'theme:tree' }, skirt: {}, snowCap: {},
    },
  },

  // --- Flora + cover -------------------------------------------------------
  sapling: { painter: 'sapling', order: 45, params: { crown: 'theme:tree|#2c4424' } },
  // FLORA CLARITY: bushes wear DISCRETE LEAVES + sprigs (high-frequency
  // detail), crowns carry broad dapple — clumped together they still read
  // apart. Berry bushes are the same painter saying one more word.
  // Understory clumps bake to whole-doodad sprites (bakeWhole): the brush
  // painter is time-free, the fern's only time input is frond sway (a
  // whole-sprite shear at blit) — a deep forest scatters hundreds of these.
  brush: {
    painter: 'brush', order: 49, bakeWhole: 'static',
    params: { color: 'theme:tree|#2c4424', leaves: 1, sprigs: true },
  },
  berry_bush: {
    painter: 'brush', order: 49, bakeWhole: 'static',
    params: {
      color: 'theme:tree|#2c4424', leaves: 1.2, sprigs: true,
      berries: { color: '#c8425a', chance: 1 },
    },
  },
  fern: { painter: 'fern', order: 48, bakeWhole: 'sway', params: { color: 'theme:tree|#2c4424' } },
  // WALK-UNDER TREES: the ground pass draws the real TRUNK (the physical
  // body — DoodadRule.bodyScale); the crown rides the canopy pass above,
  // fading when the hero steps beneath. Anyone ELSE under an unfaded crown
  // is simply unseen — the forest ambush, for both sides.
  tree: {
    longShadow: 0.85,
    painter: 'trunk', order: 50, bakeWhole: 'static', params: { scale: 0.3, roots: 4 },
    canopy: { painter: 'leafCrown', params: { fill: 'theme:tree|#2c4424' } },
  },
  thicket: {
    longShadow: 0.7,
    // A REAL tangle at ground level (the true-bush painter in bramble darks)
    // — the last of the old gradient discs; the bramble crown rides above.
    painter: 'brush', order: 50, bakeWhole: 'static',
    params: { color: '#14301a', leaves: 1.1 },
    canopy: {
      painter: 'bramble',
      params: { fill: '#16401c', edge: '#0a2410', spine: '#2c5a26', berries: { chance: 0.3 } },
    },
  },
  // The thicket grown into a TREE: gnarled thorn bole, walk-under bramble
  // crown heavy with barbs and dark berries — reads apart from every leafy
  // canopy at a glance.
  briarwood: {
    longShadow: 0.9,
    painter: 'trunk', order: 50, bakeWhole: 'static', params: { scale: 0.3, roots: 5, color: '#3a2c20' },
    canopy: {
      painter: 'bramble',
      params: { fill: '#1e3c1a', edge: '#0c2410', spine: '#4a7034', thorns: true, berries: { chance: 0.5 } },
    },
  },
  palm: {
    longShadow: 0.8,
    painter: 'trunk', order: 50, bakeWhole: 'static', params: { scale: 0.26, roots: 3 },
    canopy: { painter: 'palmCrown' },
  },
  conifer: {
    longShadow: 0.9,
    painter: 'trunk', order: 50, bakeWhole: 'static', params: { scale: 0.26, roots: 3, color: '#4a3826' },
    canopy: { painter: 'pineCrown', params: { fill: 'theme:tree|#1e3a28' } },
  },
  ancient_tree: {
    longShadow: 0.9,
    painter: 'trunk', order: 50, bakeWhole: 'static', params: { scale: 0.22, roots: 6 },
    canopy: { painter: 'leafCrown', params: { fill: 'theme:tree|#2c4424' } },
  },
  // The FOREST's canopy body: a broad-crowned oak, one shade deeper than the
  // common tree so a sealed forest roof reads as ITS OWN mass, not a smear of
  // grove greens. Planted by the forest recipe closer than crowns span — the
  // veil index knits whole stands into single patches.
  forest_oak: {
    longShadow: 0.95,
    painter: 'trunk', order: 50, bakeWhole: 'static', params: { scale: 0.22, roots: 5, color: '#41321f' },
    canopy: { painter: 'leafCrown', params: { fill: '#274f1d' } },
  },
  // Giant fungus wears the WALK-UNDER TREE mechanism now: a real pale-ringed
  // STALK at ground level (the trunk painter, fungal-toned, sized to the
  // bodyScale trunk), the parametric cap riding the canopy pass above.
  giant_mushroom: {
    longShadow: 0.8,
    painter: 'trunk', order: 50, bakeWhole: 'static', params: { scale: 0.3, roots: 3, color: '#5a4a7a' },
    canopy: {
      painter: 'mushroomCrown',
      params: { caps: 1, cap: '#5a8a3a', glow: '#8fd06f', stalk: '#3a2a5a', specks: true },
    },
    light: { radius: -1.6, color: '#8fd06f', intensity: 0.18 },
  },
  fruiting_tower: {
    longShadow: 0.9,
    painter: 'trunk', order: 50, bakeWhole: 'static', params: { scale: 0.26, roots: 4, color: '#4a3a66' },
    canopy: {
      painter: 'mushroomCrown',
      params: { caps: 3, cap: '#5a8a3a', glow: '#8fd06f', stalk: '#3a2a5a', specks: true },
    },
    light: { radius: -1.8, color: '#8fd06f', intensity: 0.2 },
  },
  shelf_fungus: {
    painter: 'shelfFungus', order: 52, shadow: 0.5,
    params: { wood: '#4a3626', shelf: '#c8a05a', ring: '#8a6a3a', glow: '#e8c87f' },
    light: { radius: -1.7, color: '#e8c87f', intensity: 0.12 },
  },
  toadstool: {
    painter: 'toadstools', order: 47,
    params: { cap: '#b8434e', speck: '#f0e6d8' },
  },
  kelp: { painter: 'kelp', order: 48, bakeWhole: 'sway' },
  // The kelp TREE: a thin holdfast stipe at ground level (weave between the
  // stalks), the layered frond crown riding the canopy pass above — fading
  // when you step beneath, hiding everyone who doesn't.
  giant_kelp: {
    painter: 'trunk', order: 50, bakeWhole: 'static', params: { scale: 0.16, roots: 3, color: '#2a5a40' },
    canopy: { painter: 'kelpCrown', params: { color: '#2f7a4a', rib: '#57b06f', bladder: '#8fd0a0' } },
  },
  // Coral form-rolls its colony (staghorn / brain boule / gorgonian fan) in
  // two hue families over a knobby reef base.
  coral: {
    painter: 'coral', order: 52, shadow: 0.5,
    params: { base: '#16323c', branch: '#e87aa0', branch2: '#e8b06a' },
  },

  // --- Standing minerals + organics ---------------------------------------
  // THE ROCK GRAMMAR: every stone rolls its own form (mono/split/outcrop) and
  // chance-rolled accents — same entry, endless variety, tinted per biome.
  rock: {
    longShadow: 0.7,
    painter: 'boulder', order: 55, shadow: 0.7,
    params: {
      color: 'theme:obstacle', edge: 'theme:obstacleEdge', material: 'stone',
      cluster: 0.45, cracks: 1, grain: true, strata: {},
      moss: { color: 'theme:tree' }, lichen: {}, quartz: {}, skirt: {}, snowCap: {},
    },
  },
  sea_rock: {
    painter: 'boulder', order: 52, shadow: 0.6,
    params: {
      color: '#274a52', edge: '#3f7a86', material: 'stone', contrast: 0.75,
      cluster: 0.3, grain: true, barnacle: '#5fb0b8', wet: true, skirt: {},
    },
  },
  cairn: {
    painter: 'cairn', order: 54, shadow: 0.55, longShadow: 1.0,
    params: { color: 'theme:obstacle', edge: 'theme:obstacleEdge' },
  },
  scree: {
    painter: 'scree', order: 37, params: { color: 'theme:obstacle' },
    blend: { strength: 0.32, feather: 14, color: 'theme:obstacle' },
  },
  rock_spire: {
    longShadow: 1.7,
    painter: 'boulder', order: 55, shadow: 0.65,
    params: {
      color: 'theme:obstacle', edge: 'theme:obstacleEdge', material: 'stone',
      spire: true, contrast: 1.25, cracks: 1, grain: true, strata: {}, skirt: {}, snowCap: {},
    },
  },
  crystal: {
    longShadow: 0.8,
    painter: 'shard', order: 50, shadow: 0.55,
    params: { points: 5, color: '#3a6a9a', material: 'crystal', coreGlow: { color: '#9fd8ff' } },
    light: { radius: -2.6, color: '#7fc0f0', intensity: 0.3 },
  },
  ice_spike: {
    painter: 'shard', order: 50, shadow: 0.5, longShadow: 1.3,
    params: { points: 4, color: '#a8ccdf', material: 'ice', coreGlow: { color: '#e8f6ff' } },
    light: { radius: -2, color: '#bfe0f0', intensity: 0.14 },
  },
  snowman: { painter: 'snowman', order: 54, shadow: 0.55, longShadow: 1.1 },
  signpost: { painter: 'signpost', order: 55, shadow: 0.4, longShadow: 1.4 },
  firewood_pile: { painter: 'firewoodPile', order: 53, shadow: 0.55 },

  // --- Settlement + wayside clutter ----------------------------------------
  fountain: {
    painter: 'fountain', order: 54, shadow: 0.5,
    light: { radius: -1.8, color: '#bfe8f4', intensity: 0.14 },
  },
  well: { painter: 'well', order: 54, shadow: 0.55, longShadow: 0.9 },
  lantern_post: {
    painter: 'lanternPost', order: 55, shadow: 0.35, longShadow: 1.5,
    light: { radius: -11, color: '#ffd898', intensity: 0.5, flicker: 4 },
  },
  bench: { painter: 'bench', order: 53, shadow: 0.4 },
  // A mercenary's camp roll: reads as a low log-shaped pad in muted wool
  // tones (spotted as a warned disc-fallback during the settlement QA pass).
  merc_bedroll: {
    painter: 'log', order: 52, shadow: 0.4,
    params: { color: '#6a5a44', moss: '#8a7658' },
  },
  market_stall: { painter: 'marketStall', order: 55, shadow: 0.55, longShadow: 0.9 },
  broken_cart: { painter: 'brokenCart', order: 53, shadow: 0.5, longShadow: 0.9 },
  scarecrow: { painter: 'scarecrow', order: 55, shadow: 0.35, longShadow: 1.6 },
  hay_bale: { painter: 'hayBale', order: 53, shadow: 0.55, longShadow: 0.8 },
  pot_cluster: { painter: 'potCluster', order: 53, shadow: 0.5 },
  // --- The brittle kit (DoodadRule.brittle): lifeless breakables ------------
  clay_pots: { painter: 'potCluster', order: 52, shadow: 0.35 },
  // A fissured plug: the boulder painter with cracks turned all the way up —
  // it LOOKS ready to fall, and it is.
  crumbling_wall: {
    longShadow: 0.8, painter: 'boulder', order: 55, shadow: 0.6,
    params: { color: 'theme:obstacle', edge: 'theme:obstacleEdge', material: 'stone', cracks: 1, grain: true, contrast: 1.15 },
  },
  // The hidden face: SAME stone vocabulary as the biome's own rock — the
  // camouflage IS the design; only the suspiciously clean strata whisper.
  secret_wall: {
    longShadow: 0.8, painter: 'boulder', order: 55, shadow: 0.6,
    params: { color: 'theme:obstacle', edge: 'theme:obstacleEdge', material: 'stone', strata: {}, contrast: 0.95 },
  },
  // --- Brittle wave 2: hazard breakables ------------------------------------
  // A decayed crossing: the plank painter saying 'rot' — missing boards over
  // the dark, a split seam, moss on the rails. Order matches sound bridges.
  rotten_bridge: {
    painter: 'plank', order: 44,
    params: { fill: '#55412b', line: '#332419', rot: true },
  },
  gas_pod: {
    painter: 'pod', order: 52, shadow: 0.45,
    params: { body: '#5a6e34', glow: '#b8d06a', aspectY: 1.08, glowY: -0.15, glowR: 0.46, pulseRate: 1.1 },
    light: { radius: -1.6, color: '#b8d06a', intensity: 0.1, flicker: 1.0 },
  },
  burst_sac: {
    painter: 'pod', order: 52, shadow: 0.45,
    params: { body: '#4a3a66', glow: '#b08ad8', aspectY: 0.9, glowY: -0.2, glowR: 0.5, pulseRate: 2.1 },
    light: { radius: -1.8, color: '#b08ad8', intensity: 0.12, flicker: 1.6 },
  },
  puffcap_cluster: {
    painter: 'toadstools', order: 47,
    params: { cap: '#b7a15c', speck: '#e8dcc0' },
  },
  burial_urn: {
    painter: 'potCluster', order: 52, shadow: 0.4,
    params: { clay: '#8a8074', lid: '#6a6258' },
  },
  crystal_cluster: {
    longShadow: 0.6, painter: 'shard', order: 50, shadow: 0.5,
    params: { points: 7, color: '#4a7aa8', material: 'crystal', coreGlow: { color: '#9fd8ff' } },
    light: { radius: -2.2, color: '#7fc0f0', intensity: 0.22 },
  },
  // The storm-scar kit: lightning's leavings, all inert.
  fulgurite: {
    longShadow: 0.6, painter: 'shard', order: 51, shadow: 0.45,
    params: { points: 3, color: '#c8b088', material: 'crystal', coreGlow: { color: '#f0e4c0' } },
  },
  charged_crystal: {
    longShadow: 0.55, painter: 'shard', order: 50, shadow: 0.5,
    params: { points: 6, color: '#5a7ab0', material: 'crystal', coreGlow: { color: '#9fd8ff' } },
    light: { radius: -3, color: '#8fd0ff', intensity: 0.35, flicker: 6 },
  },
  static_bloom: {
    painter: 'sparkle', order: 47,
    light: { radius: -2.6, color: '#cfe4ff', intensity: 0.25, flicker: 9 },
  },
  storm_glass: {
    painter: 'liquid', order: 27,
    blend: { strength: 0.35, feather: 16, color: '#3a4a52' },
    params: {
      rim: { color: '#7a94a0', alpha: 0.5, grow: 2 },
      core: { color: '#4a6a78', alpha: 0.45 },
      sheen: { color: '#c8e8f0' },
    },
  },
  icicle_cluster: {
    painter: 'shard', order: 50, shadow: 0.45, longShadow: 0.9,
    params: { points: 5, color: '#b6d4e6', material: 'ice', coreGlow: { color: '#eef8ff' } },
    light: { radius: -1.6, color: '#cfe8f4', intensity: 0.1 },
  },
  // --- The bog set: mire dressing + the contracting-fume hazard -------------
  // A waterlogged trunk gone half to moss — the log painter saying 'drowned'.
  sunken_log: {
    painter: 'log', order: 51, shadow: 0.4,
    params: { color: '#413828', moss: '#2f5230' },
  },
  // The will-o-the-mire: barely a body at all — the light IS the doodad.
  marsh_wisp: {
    painter: 'pod', order: 49,
    params: { body: '#1f2e22', glow: '#b8f0a0', aspectY: 0.82, glowY: -0.3, glowR: 0.62, pulseRate: 0.7 },
    light: { radius: -3.4, color: '#a8e890', intensity: 0.34, flicker: 3.4 },
  },
  // Cut peat stacked into a hummock: soft dark cover, tar on the nose.
  peat_mound: {
    painter: 'mound', order: 50, shadow: 0.5,
    params: { color: '#3a3226', edge: '#57492f' },
  },
  // --- The scavenger-web dressing: graveland + mire texture -----------------
  // The quag gels' own ground: a quivering ooze shallows, poured contiguous
  // like every liquid, sheened and slow-bubbling. Their habitat points here.
  gel_pool: {
    painter: 'liquid', order: 28,
    blend: { strength: 0.4, feather: 20, color: '#4a5e2e' },
    params: {
      rim: { color: '#6e8a3c', alpha: 0.55, grow: 3 },
      core: { color: '#55702f', alpha: 0.6 },
      sheen: { color: '#b7d478' },
      bubbles: { color: '#cfe89a' },
    },
  },
  // A drowned stele barely proud of the water — old work, older silence.
  sunken_stone: {
    painter: 'slab', order: 50, shadow: 0.4,
    params: { shape: 'monolith', fill: '#2e3a34', edge: '#54685a' },
  },
  // A basalt needle over old graves; the cold violet at its heart is the
  // light layer's, at parity with every other emissive.
  black_obelisk: {
    painter: 'shard', order: 54, shadow: 0.6, longShadow: 1.6,
    params: { points: 4, color: '#20242e', material: 'stone', coreGlow: { color: '#6a5a9a' } },
    light: { radius: -2.2, color: '#8a74c8', intensity: 0.16 },
  },
  // A stump drowned in decades of candle wax — someone still lights them.
  tallow_stump: {
    painter: 'stump', order: 52, shadow: 0.5,
    params: { color: '#c9bfa4' },
    light: { radius: -3.4, color: '#ffd890', intensity: 0.32, flicker: 3.4 },
  },
  // A turfed burial dome — the dead beneath the grass, the grass unbothered.
  barrow_mound: {
    painter: 'mound', order: 50, shadow: 0.55, longShadow: 0.8,
    params: { color: '#3c4432', edge: '#5a6644' },
  },
  // A rotted trunk big enough to bar the way — cover that used to be a tree.
  hollow_log: {
    painter: 'log', order: 52, shadow: 0.5,
    params: { color: '#4a3c2c', moss: '#41603a' },
  },
  // Stacked bones as a marker: someone counted these dead, and stopped.
  bone_cairn: {
    painter: 'cairn', order: 53, shadow: 0.5, longShadow: 0.9,
    params: { color: '#cfc4ac', edge: '#8a8070' },
  },
  // The mire-flower swollen with venom — its pop mints venom_seep, so the
  // fume CONTRACTS away on the skill's own envelope.
  venom_bloom: {
    painter: 'pod', order: 52, shadow: 0.45,
    params: { body: '#4a5e2c', glow: '#c8e86a', aspectY: 1.05, glowY: -0.12, glowR: 0.5, pulseRate: 1.6 },
    light: { radius: -1.7, color: '#c8e86a', intensity: 0.12, flicker: 1.2 },
  },
  rubble: { painter: 'rubble', order: 36 },
  banner_post: { painter: 'bannerPost', order: 55, shadow: 0.35, longShadow: 1.5 },
  // The mercenary camp's standard (was a warned disc-fallback).
  merc_banner: {
    painter: 'bannerPost', order: 55, shadow: 0.35, longShadow: 1.4,
    params: { cloth: '#8a6a3e' },
  },
  beehive: {
    painter: 'pod', order: 53, shadow: 0.5,
    params: { body: '#c8a24a', glow: '#e8cf7a', aspectY: 1.15, glowY: -0.2, glowR: 0.34, pulseRate: 1.4, bands: 3 },
  },
  obsidian: {
    longShadow: 0.7,
    painter: 'shard', order: 50, shadow: 0.55,
    params: { points: 6, color: '#171015', material: 'stone', edgeGlow: { color: 'theme:accent|#ff7a2a', alpha: 0.5 } },
  },
  lava_vent: {
    painter: 'vent', order: 50,
    params: { rim: '#140805', throat: '#1a0a06', hot: '#ff5a1e', core: '#ffd24a' },
    light: { radius: -3, color: '#ff7a2a', intensity: 0.5, flicker: 3.3 },
  },
  ember_vent: {
    painter: 'vent', order: 50,
    params: { rim: '#140805', throat: '#1a0a06', hot: '#ff5a1e', core: '#ffd24a' },
    light: { radius: -3, color: '#ff7a2a', intensity: 0.45, flicker: 3.3 },
  },
  flesh_pod: {
    painter: 'pod', order: 52, shadow: 0.5,
    params: {
      body: 'theme:obstacle', glow: 'theme:accent|#e86a7a', aspectY: 0.82,
      glowY: -0.1, glowR: 0.42, pulseRate: 1.9, veins: 'theme:accent|#e86a7a',
    },
    light: { radius: -2.2, color: '#e86a7a', intensity: 0.14, flicker: 1.3 },
  },
  // THE FLESH KIT: the warren is one creature — membranes and veins throb to
  // a SHARED heartbeat, the eye stalks watch you cross the room.
  flesh_membrane: {
    painter: 'membrane', order: 27,
    params: { skin: '#7a2a38', rim: '#8a3848', stria: '#4a0f1c' },
  },
  vein_cluster: {
    painter: 'veins', order: 29,
    params: { vessel: '#5a1522', pulse: '#ff7a86', node: '#6a1a28' },
    light: { radius: -1.7, color: '#e86a7a', intensity: 0.12, flicker: 1.1 },
  },
  eye_stalk: {
    painter: 'eyeStalk', order: 53, shadow: 0.5,
    params: { flesh: '#8a3848', sclera: '#e8dcd0', iris: '#d8b04a' },
  },
  rib_arch: {
    painter: 'ribArch', order: 53, shadow: 0.5, longShadow: 0.8,
    params: { bone: '#d8cdb8' },
  },
  // THE OSSUARY KIT (the Necropolis' interior sanctum — data/tilesets.ts
  // 'ossuary'). Bone dunes crowd the bonefields; shelf-walls stack into
  // reliquary rows (their candle-glow is the row's own light, a clarity
  // anchor); the overflow pits open pale-rimmed and dark-hearted.
  bone_mound: {
    painter: 'bonePile', order: 53, shadow: 0.55, longShadow: 0.9,
    params: { bone: '#cfc4a8', dark: '#6a604e', skulls: 3 },
  },
  ossuary_niche: {
    painter: 'boneShelf', order: 54, shadow: 0.55, longShadow: 1.0,
    params: { bone: '#c9bda0', dark: '#57503f', skulls: 4 },
    light: { radius: -1.8, color: '#ffd9a0', intensity: 0.14, flicker: 1.6 },
  },
  charnel_pit: {
    painter: 'chasmPit', order: 39,
    params: {
      rim: { color: '#8a8070', alpha: 0.55, grow: 5 },
      core: { color: '#0a0806' },
      bands: 1,
      cracks: { chance: 0.7, color: '#cfc4a8' },
      glow: { color: '#d8cdb0', alpha: 0.1 },
    },
  },
  tooth_row: {
    painter: 'teethRow', order: 52, shadow: 0.45,
    params: { gum: '#6a1a28', enamel: '#e8e0d0' },
  },
  spore_pod: {
    painter: 'pod', order: 52, shadow: 0.5,
    params: { body: '#4a5a2a', glow: '#adbf6a', aspectY: 1.1, glowY: -0.3, glowR: 0.5, pulseRate: 2.4 },
  },
  // Real little mushrooms lit from within — the light layer carries the
  // ambient pulse (flicker) at parity with every other emissive.
  glow_cap: {
    painter: 'dome', order: 52,
    params: { halo: '#c8ffa0', cap: '#8fd06f' },
    light: { radius: -3.2, color: '#c8ffa0', intensity: 0.3, flicker: 1.4 },
  },
  bone: { painter: 'bones', order: 52, params: { color: '#d8cdb8' } },
  tombstone: {
    longShadow: 0.9,
    painter: 'slab', order: 55, shadow: 0.6,
    params: { shape: 'arch', fill: '#8a8a94', edge: '#4a4a54', engraving: '#5a5a64' },
  },
  ruin_obelisk: {
    longShadow: 1.1,
    painter: 'slab', order: 54, shadow: 0.65,
    params: { shape: 'monolith', fill: '#1c1830', edge: '#7a4fb0', gem: { color: '#a06ad8' } },
    light: { radius: -2.4, color: '#a06ad8', intensity: 0.22 },
  },
  light_spot: {
    painter: 'sparkle', order: 54,
    light: { radius: -3.4, color: '#ffe08a', intensity: 0.5 },
  },
  descent_platform: {
    painter: 'platformRing', order: 54,
    light: { radius: -2.2, color: '#7fe0d8', intensity: 0.3 },
  },

  // --- Built things ---------------------------------------------------------
  // Timber by default; a structure wanting masonry says material:'stone' and
  // the same painter lays running-bond seams instead of grain.
  wall: { painter: 'palisade', order: 52, longShadow: 0.6, params: { fill: 'theme:wall|#5e4c34', edge: '#2c2418', material: 'wood' } },
  window: { painter: 'windowSlit', order: 58 },
  door: { painter: 'door', order: 58 },
  dock: {
    painter: 'dock', order: 58,
    light: { radius: 90, color: '#ffd898', intensity: 0.3, flicker: 2.2 },
  },
  campfire: {
    painter: 'campfire', order: 53,
    light: { radius: -5, color: '#ffae52', intensity: 0.6, flicker: 6 },
  },
  // Geology, not an icon: the mouth form-rolls its portal (browed arch or
  // rockfall ring) from the biome's own stone, with chance-rolled stalactite
  // fangs, threshold rubble, and theme-gated hanging vines.
  cave_entrance: {
    painter: 'caveMouth', order: 55,
    params: {
      color: 'theme:obstacle', edge: 'theme:obstacleEdge', material: 'stone',
      glow: '#caa860', teeth: {}, rubble: {}, vines: { color: 'theme:tree' },
      label: 'Cave',
    },
    light: { radius: -2, color: '#caa860', intensity: 0.25, flicker: 2.5 },
  },
  // A plank trapdoor set flush in a house floor — the quiet way down to the
  // cellar (data/sidezones.ts 'cellar_hatch').
  cellar_hatch: {
    painter: 'hatch', order: 54,
    params: { wood: '#5c4630', seam: '#3a2c1c', frame: '#2e2418', ring: '#8a8578', label: 'Cellar' },
  },
  // The Pit's maw (the pit package's furnish): bottomless dark ringed in
  // tumbled home-stone, torchlight licking up from somewhere far below.
  pit_entrance: {
    painter: 'caveMouth', order: 55,
    params: {
      color: 'theme:obstacle', edge: 'theme:obstacleEdge', material: 'stone',
      glow: '#c8a84b', throat: '#050507', tumble: 1, teeth: {}, rubble: {},
      label: 'The Pit',
    },
    light: { radius: -2, color: '#c8a84b', intensity: 0.4, flicker: 4 },
  },

  // --- Ritual + event set-pieces -------------------------------------------
  tentacle_field: { painter: 'tentacleField', order: 56 },
  ritual_pentagram: { painter: 'pentagram', order: 57 },
  // Arena ward seals (data/arenas.ts): the boss-gating ritual anchors. The
  // live seal burns; its broken face is the same painter, stilled + cracked.
  ward_seal: {
    painter: 'wardSeal', order: 57,
    params: { ring: '#c8763a', sigil: '#ffb066', ember: '#ff9a50' },
    light: { radius: -2.6, color: '#ff9a50', intensity: 0.32, flicker: 2.2 },
  },
  ward_seal_broken: { painter: 'wardSeal', order: 57, params: { broken: true } },
  breach: {
    painter: 'breach', order: 58,
    params: { edge: '#d84a2a', label: 'the Breach' },
    light: { radius: -2.4, color: '#d84a2a', intensity: 0.35, flicker: 2.8 },
  },
  isle_beacon: {
    painter: 'beacon', order: 59,
    light: { radius: 120, color: '#7fd0ff', intensity: 0.4 },
  },
};
