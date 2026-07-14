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
      // Core grow stays ≥ 0: the old -8 inset shrank the pour's lattice
      // cells apart and the one body fragmented into visible circles. The
      // two-tone murk now comes from `heart` wells (union-clipped, jittered).
      core: { color: '#46542c', alpha: 0.5 },
      heart: { color: '#66783c', alpha: 0.3 },
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
  // The JUNGLE WALL you fire through — a woven creeper tangle now, not the
  // old flat disc-in-a-disc: lobed mat, escaping tendril curls, leaf pairs
  // (the thicket wraps its bramble in this mat; mire/jungle roll it alone).
  vines: {
    painter: 'vineMat', order: 30, bakeWhole: 'static',
    params: {
      mat: '#1f3a1c', strand: '#3a6428', leaf: '#4a7a30',
      bloom: { color: '#c8b0e0', chance: 0.1 },
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
  // (fog_bank visuals RETIRED: volumetric fog is the LIVING fog fabric —
  //  render/vis/fogLayer.ts draws roaming banks; no doodad entry.)

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
  // The dune sea's marching combs — recipe-planted along dunefield rails.
  // The duneface REGION beneath is the collision truth; this is the light on
  // it. Ground-order (36): terrain art, never furniture. No contact shadow —
  // a dune does not stand on the sand, it IS the sand.
  dune_crest: {
    painter: 'duneCrest', order: 36, bakeWhole: 'static',
    params: { sand: 'theme:sand|#c9a86a' },
  },
  // --- THE GLASSPAN KIT (saltflat furniture) --------------------------------
  salt_pillar: {
    painter: 'saltPillar', order: 52, shadow: 0.5, longShadow: 0.9,
    params: { salt: 'theme:sand|#e0d4a8' },
  },
  // Lightning-fused pan glass: the fulgurite's shard painter in sea-glass
  // tones, a cold gleam in all that heat (brittle — it sings apart).
  glass_shard: {
    painter: 'shard', order: 51, shadow: 0.4,
    params: { points: 4, color: '#bcd8d4', material: 'crystal', coreGlow: { color: '#e8fff8' } },
  },
  bone_arch: {
    painter: 'boneArch', order: 54, shadow: 0.55, longShadow: 1.1,
    params: { bone: '#d8ccb0' },
  },
  // Walk-under shade (rule.occlude feeds World.isShaded): poles + thrown
  // shadow below, the striped cloth fly above on the canopy pass — LIVE
  // (not CANOPY_STATIC) so cloth and poles share the instance's rotation.
  sun_awning: {
    painter: 'awningPoles', order: 49,
    params: { pole: '#6a5636' },
    canopy: { painter: 'awningCloth', params: { cloth: '#b8683a', stripe: '#e8d8b0' } },
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
  // --- THE UNDERGROWTH KIT (the jungle's cut-your-own-path fabric) ----------
  // The PLUG: a wall of living growth choking a trail — dense true-bush body
  // under a bramble crown, one good cut from opening. Reads DARKER than the
  // walkable brush so "that way is work" lands at a glance.
  jungle_brush: {
    longShadow: 0.5,
    painter: 'brush', order: 51, bakeWhole: 'static',
    params: { color: '#12300f', leaves: 1.35, sprigs: true },
    canopy: { painter: 'bramble', params: { fill: '#1a4416', edge: '#0a2408', spine: '#3f7a26', berries: { chance: 0.15 } } },
    blend: { strength: 0.4, feather: 22, color: '#13260c' },
  },
  // The FACE-CUT: the same growth KNOTTED over the verdure wall — the brighter
  // spine is the tell that this knot pays whoever carves in.
  verdure_face: {
    painter: 'brush', order: 51, bakeWhole: 'static',
    params: { color: '#173a12', leaves: 1.3, sprigs: true },
    canopy: { painter: 'bramble', params: { fill: '#1e4c18', edge: '#0a2408', spine: '#66a238' } },
  },
  // The CURTAIN: a vine mat underfoot, the draped strands riding the canopy
  // pass ABOVE actors — the occlude fade parts them for whoever walks through.
  liana_veil: {
    painter: 'vineMat', order: 47, bakeWhole: 'static',
    params: { mat: '#152a10', strand: '#2f5222', leaf: '#3f6a28', bloom: { color: '#b88ad0', chance: 0.08 } },
    canopy: { painter: 'lianaCurtain', params: { vine: '#2c4a1e', leaf: '#4a7a30', bloom: '#c8a0e0' } },
  },
  // The EMERGENT GIANT: half a glade under one crown; the trunk is a pillar
  // (bodyScale 0.18) you fight around while the roof hides both sides.
  canopy_colossus: {
    longShadow: 1.15,
    painter: 'trunk', order: 50, bakeWhole: 'static', params: { scale: 0.18, roots: 6, color: '#3f3222' },
    canopy: { painter: 'leafCrown', params: { fill: '#1d4418' } },
  },
  strangler_root: {
    longShadow: 0.4, shadow: 0.3,
    painter: 'buttressRoot', order: 50, bakeWhole: 'static',
    params: { bark: '#4a3a24', moss: '#2f5a24' },
  },
  // The gloom lights its own: a swollen luminous bud on the jungle floor.
  jungle_bloom: {
    painter: 'pod', order: 50,
    params: { body: '#1e3318', glow: '#8ff0b8', aspectY: 0.9, glowY: -0.2, glowR: 0.55, pulseRate: 0.5 },
    light: { radius: -3.6, color: '#8ff0b8', intensity: 0.32, flicker: 1.1 },
  },
  // --- THE SUNKEN-RUIN KIT (what the jungle swallowed) -----------------------
  // The gate: a root-split stone descent, its throat lit faintly green — the
  // caveMouth vocabulary in overgrown masonry (the sidezone dwell owns entry).
  ruin_gate: {
    painter: 'caveMouth', order: 55,
    params: {
      color: '#6a705c', edge: '#8a8c74', material: 'stone',
      glow: '#9fd07a', throat: '#0a0f08', teeth: {}, rubble: {},
      vines: { color: 'theme:tree' },
      label: 'the Sunken Ruin',
    },
    light: { radius: -2.2, color: '#9fd07a', intensity: 0.32, flicker: 1.8 },
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
  // The GLOAMWOOD's canopy body: the same knitting oak gone grey-dark — a
  // desaturated blue-green crown over a near-black crooked bole, so the
  // haunted roof reads as its own DEAD mass beside any living wood.
  gloam_oak: {
    longShadow: 0.95,
    painter: 'trunk', order: 50, bakeWhole: 'static', params: { scale: 0.24, roots: 6, color: '#241f1a' },
    canopy: { painter: 'leafCrown', params: { fill: 'theme:tree|#2b3b33' } },
  },
  // The croft kit (paintersGloam.ts): gourd tangles, the lit lone lantern
  // (light spec = the candle), the hanged road's swaying gibbets.
  pumpkin_patch: {
    painter: 'gourds', order: 46,
    blend: { strength: 0.3, feather: 22, color: '#2a2418' },
    params: { color: '#c8681e', stem: '#5a6a30', vine: '#3c4a26' },
  },
  jack_o_lantern: {
    painter: 'gourds', order: 47, shadow: 0.3,
    params: { color: '#d8722a', stem: '#5a6a30', glow: '#ffb44a', lit: true, n: 1 },
    light: { radius: -2.6, color: '#ff9a3a', intensity: 0.28, flicker: 1.3 },
  },
  hanging_cage: {
    painter: 'gibbet', order: 55, shadow: 0.45, longShadow: 1.6,
    params: { wood: '#4c3e2c', iron: '#3a3d44', bone: '#c9bda2' },
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
  // --- The war-camp kit (muster grounds): existing painters, new clothes ----
  battle_standard: {
    painter: 'warBanner', order: 53, shadow: 0.35, longShadow: 1.5,
    params: { cloth: '#a83a2e', pole: '#4a3826', glyph: '#e8d8a0' },
  },
  shield_rack: {
    painter: 'fishingRack', order: 53, shadow: 0.35, longShadow: 0.8,
    // The rail hangs bossed steel, not the day's catch.
    params: { wood: '#5e4a32', fish: '#8a8ea0' },
  },
  sparring_dummy: {
    painter: 'scarecrow', order: 55, shadow: 0.35, longShadow: 1.4,
    params: { coat: '#a89058' },
  },
  war_drum: {
    painter: 'potCluster', order: 53, shadow: 0.5,
    params: { clay: '#7a5638', lid: '#c8a878' },
  },
  // --- The parity-pass wayside kit (existing painters, new clothes) ---------
  chronolith: {
    painter: 'shard', order: 55, shadow: 0.6, longShadow: 1.5,
    params: { points: 4, color: '#3a5a5e', material: 'stone', coreGlow: { color: '#8ae0e0' } },
    light: { radius: -2.4, color: '#8ae0e0', intensity: 0.24, flicker: 9 },
  },
  meditation_cairn: {
    painter: 'cairn', order: 54, shadow: 0.5, longShadow: 0.9,
    params: { color: '#b8b4a8', edge: '#e8e0c8' },
    light: { radius: -1.6, color: '#e8e0c8', intensity: 0.12 },
  },
  rusted_snare: {
    painter: 'finBlade', order: 52, shadow: 0.3,
    params: { color: '#7a6a52', edge: '#a89078' },
  },
  palisade_spikes: {
    painter: 'palisade', order: 52, longShadow: 0.6,
    params: { fill: '#6a5238', edge: '#2c2418', material: 'wood' },
  },
  // --- The cistern-court kit (the conduit pass): old blood-plumbing ---------
  // Existing painters in grave-stone clothes; the faint teal lights are
  // data (the dynamic light layer), not renderer edits — "something still
  // pools here" sold entirely from this file.
  stone_cistern: {
    painter: 'well', order: 54, shadow: 0.55, longShadow: 0.7,
    light: { radius: -2.0, color: '#8ad0c8', intensity: 0.12 },
  },
  votive_basin: {
    painter: 'fountain', order: 53, shadow: 0.45,
    light: { radius: -1.6, color: '#8ad0c8', intensity: 0.12 },
  },
  offering_urns: {
    painter: 'potCluster', order: 53, shadow: 0.5,
    params: { clay: '#5a5248', lid: '#8ad0c8' },
  },
  dry_runnel: {
    painter: 'leyLine', order: 30,
    params: { color: '#4aa89a' },
    light: { radius: -2.2, color: '#4aa89a', intensity: 0.1 },
  },
  // --- The fallen-colossus kit: ruin at landmark scale, stone clothes -------
  colossus_head: {
    painter: 'statue', order: 54, shadow: 0.65, longShadow: 1.2,
    params: { stone: '#9a9488', moss: '#5a6e42' },
  },
  colossus_fist: {
    painter: 'boulder', order: 54, shadow: 0.6, longShadow: 0.8,
    params: { color: '#95907f', edge: '#4a463c', material: 'stone', cracks: 0.7, grain: true },
  },
  broken_column: {
    painter: 'log', order: 52, shadow: 0.5, longShadow: 0.6,
    params: { color: '#8f8a7a', moss: '#5a6e42' },
  },
  ruin_plinth: {
    painter: 'slab', order: 53, shadow: 0.55, longShadow: 0.9,
    params: { shape: 'monolith', fill: '#8a8578', edge: '#45413a' },
  },
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
  // --- Munitions dressing (the powder-cache kit; rules in formations.ts) ---
  // Kegs: dark staved wood under iron lids (the potCluster reskin rule).
  powder_keg: {
    painter: 'potCluster', order: 53, shadow: 0.45,
    params: { clay: '#6a4a2e', lid: '#3e4048' },
  },
  // Bundled charges: stacked round ends, leather-dark (firewoodPile reskin).
  munition_cache: {
    painter: 'firewoodPile', order: 52, shadow: 0.4,
    params: { wood: '#584634' },
  },
  // Pyramided iron shot: the cairn courses read as racked cannonballs.
  shot_stack: {
    painter: 'cairn', order: 54, shadow: 0.55, longShadow: 0.8,
    params: { color: '#41434c', edge: '#16181e' },
  },
  // --- The energist cache (the spell-chamber kit; rules in formations.ts) --
  // Live cells: squat teal vessels with a lit heart — struck, they spill
  // their keeping (brittle orb tradition). The light breathes at parity
  // with every other small emissive.
  charge_cell: {
    painter: 'shard', order: 52, shadow: 0.4,
    params: { points: 4, color: '#2e6a62', material: 'crystal', coreGlow: { color: '#8fe8d8' } },
    light: { radius: -2, color: '#7fd8c8', intensity: 0.22, flicker: 1.2 },
  },
  // Capacitor pylons: worked monoliths with a pulsing gem inset — the
  // battery row's standing bones (solid; the slab's obelisk lane).
  rune_capacitor: {
    painter: 'slab', order: 54, shadow: 0.6, longShadow: 1.3,
    params: { shape: 'monolith', fill: '#3a4450', edge: '#141a22', gem: { color: '#7fd8c8' } },
    light: { radius: -2.6, color: '#7fd8c8', intensity: 0.25 },
  },
  // Spent cells: the same vessel, dead — dark glass, no light, shed clutter.
  spent_cell: {
    painter: 'shard', order: 50, shadow: 0.3,
    params: { points: 4, color: '#2c3236', material: 'crystal' },
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
    // Storm-cool flakes (the painter's defaults are the Light's warm gold).
    params: { fill: '#e8f2ff', edge: '#9fc8ff' },
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
      // Denser than the bog's default: slow-bubbling is the gel's signature,
      // so even a lone habitat pool keeps a live well or two.
      bubbles: { color: '#cfe89a', density: 0.9 },
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
  // THE CAUL KIT (the Giger key): black chitin over pale meat, cold violet
  // light. Same shared heartbeat as the flesh kit — one organism, two moods.
  chitin_fin: {
    painter: 'chitinFin', order: 53, shadow: 0.5, longShadow: 0.9,
    params: { plate: 'theme:obstacle|#2c2136', rim: '#6a5478', material: 'chitin' },
  },
  black_umbilic: {
    painter: 'umbilic', order: 53, shadow: 0.6,
    params: { cord: '#241a2c', rim: '#5a4468', glow: '#8a6ab0' },
    light: { radius: -1.6, color: '#8a6ab0', intensity: 0.14, flicker: 0.7 },
  },
  caul_sac: {
    painter: 'pod', order: 53, shadow: 0.45,
    // Full PodParams contract (aspectY/glowY/glowR/pulseRate are required —
    // a missing one is a NaN gradient and a dead frame, ask the live QA).
    params: {
      body: '#3a2c48', glow: '#9a72c8', veins: '#5a4468',
      aspectY: 1.15, glowY: -0.08, glowR: 0.45, pulseRate: 1.1,
    },
    light: { radius: -1.8, color: '#9a72c8', intensity: 0.12, flicker: 1.1 },
  },
  caul_eyes: {
    painter: 'eyeStalk', order: 53, shadow: 0.5,
    params: { flesh: '#3a2c48', sclera: '#d8cfe0', iris: '#9a72c8' },
  },
  maw_pit: {
    painter: 'mawPit', order: 18,
    blend: { strength: 0.42, feather: 18, color: '#221828' },
  },
  nerve_root: {
    painter: 'veins', order: 29,
    params: { vessel: '#382848', pulse: '#9a72c8', node: '#48305c' },
    light: { radius: -1.5, color: '#8a6ab0', intensity: 0.1, flicker: 1 },
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
  // THE EXTRACTION WELL (the seam's ground fixture — the node BODY stands on
  // it). Living face breathes marrow-light + motes; the spent face is the
  // same pan, drained and cracked (the kind-swap fires when a seam settles).
  // Marrow-pale by default; the light does the "reads as interactable" work.
  marrow_well: {
    painter: 'marrowWell', order: 30,
    params: { color: '#a5e3b4', rim: 'theme:obstacle|#4a5648' },
    light: { radius: -3.0, color: '#a5e3b4', intensity: 0.34, flicker: 1.4 },
  },
  marrow_well_spent: {
    painter: 'marrowWell', order: 30,
    params: { color: '#3a443c', rim: 'theme:obstacle|#4a5648', spent: true },
  },

  // THE LEYLINE KIT (the fracture capstone's confluences — 'leyline_nexus').
  // Everything keys 'theme:accent', so each element FACE (a TilesetVariant
  // theme override) recolors the whole kit with zero extra rows: the pyre
  // face runs ember, the rime face ice — one kit, four currents.
  ley_conduit: {
    painter: 'leyLine', order: 30,
    params: { color: 'theme:accent|#60d0ff' },
    light: { radius: -2.2, color: 'theme:accent|#60d0ff', intensity: 0.14 },
  },
  ley_font: {
    longShadow: 0.6, painter: 'shard', order: 50, shadow: 0.5,
    params: { points: 6, color: 'theme:obstacle|#1a3a4a', material: 'crystal', coreGlow: { color: 'theme:accent|#9fd8ff' } },
    light: { radius: -2.4, color: 'theme:accent|#7fc0f0', intensity: 0.24 },
  },
  // The resonance nodes: one shard body each, tinted to its element (fixed
  // colors — the node IS its element even on a sibling face), pulsing light.
  pyre_node: {
    longShadow: 0.7, painter: 'shard', order: 50, shadow: 0.55,
    params: { points: 5, color: '#3a1408', material: 'crystal', coreGlow: { color: '#ff8a3a' } },
    light: { radius: -3, color: '#ff8a3a', intensity: 0.34, flicker: 2.6 },
  },
  gale_node: {
    longShadow: 0.7, painter: 'shard', order: 50, shadow: 0.55,
    params: { points: 5, color: '#12303a', material: 'crystal', coreGlow: { color: '#8fd8ff' } },
    light: { radius: -3, color: '#8fd8ff', intensity: 0.34, flicker: 3.2 },
  },
  rime_node: {
    longShadow: 0.7, painter: 'shard', order: 50, shadow: 0.55,
    params: { points: 5, color: '#16283a', material: 'crystal', coreGlow: { color: '#b8e8ff' } },
    light: { radius: -3, color: '#b8e8ff', intensity: 0.3, flicker: 1.6 },
  },
  stone_node: {
    longShadow: 0.7, painter: 'shard', order: 50, shadow: 0.55,
    params: { points: 5, color: '#2e2418', material: 'stone', coreGlow: { color: '#d8b06a' } },
    light: { radius: -2.4, color: '#d8b06a', intensity: 0.22, flicker: 1.2 },
  },
  // THE ABYSS KIT ('abyssal_rift', PoE-style): glowing fissures underfoot,
  // riven spikes reefing into jagged cover — all in the faction's violet.
  abyss_crack: {
    painter: 'chasmPit', order: 38,
    params: {
      rim: { color: '#2a1440', alpha: 0.5, grow: 4 },
      core: { color: '#060210' },
      bands: 0,
      cracks: { chance: 0.9, color: 'theme:accent|#b060e8' },
      glow: { color: 'theme:accent|#b060e8', alpha: 0.22 },
    },
    light: { radius: -2.4, color: 'theme:accent|#b060e8', intensity: 0.26, flicker: 1.8 },
  },
  abyss_spine: {
    longShadow: 1.1, painter: 'shard', order: 51, shadow: 0.55,
    params: { points: 4, color: '#140a20', material: 'stone', edgeGlow: { color: 'theme:accent|#b060e8', alpha: 0.45 } },
  },
  // THE GRAND ARENA's crowd: bench-rows of bobbing spectators on the stands
  // (colosseum recipe). Order above the wall band they sit on; the favor they
  // wave catches the theme's accent. They EMPTY (wilt) when the crown falls.
  crowd_row: {
    painter: 'crowdRow', order: 56,
    params: { bench: '#4a3f30', accent: 'theme:accent|#e8c85a' },
  },
  // THE RIVER-OF-FLAME KIT (hell's artery — data/tilesets.ts 'river_of_flame').
  // The forge monument breathes deep ember light (the terminus beacon you
  // steer toward down the whole artery); gibbet cages hold pale soul-wisps
  // (cold light against the river's orange — the two-tone read); the pyres
  // burn the same pale fire; banners carry no light source of their own (the
  // glyph smoulder is painter-side, cheaper than a light).
  hellforge_anvil: {
    painter: 'hellforge', order: 54, shadow: 0.6, longShadow: 1.2,
    params: { iron: 'theme:obstacle|#1c1714', ember: 'theme:accent|#ff6a22' },
    light: { radius: -3.2, color: '#ff7a2a', intensity: 0.8, flicker: 2.4 },
  },
  soul_cage: {
    painter: 'hangingCage', order: 53, shadow: 0.4, longShadow: 1.4,
    params: { iron: '#2a2622', wisp: '#9fd4ff', wood: '#33201a' },
    light: { radius: -2.4, color: '#9fd4ff', intensity: 0.4, flicker: 1.8 },
  },
  demon_banner: {
    painter: 'warBanner', order: 53, shadow: 0.35, longShadow: 1.5,
    params: { cloth: '#6e1418', pole: '#241a14', glyph: 'theme:accent|#ff8a4a' },
  },
  pyre_heap: {
    painter: 'pyre', order: 49, shadow: 0.4,
    params: { flame: '#9fd4ff', bone: '#cfc4ac' },
    light: { radius: -2.6, color: '#a8d0ff', intensity: 0.5, flicker: 2.2 },
  },
  // THE BOUNDARY-GATE + DURANCE KIT: the arch reads in the enclave's own
  // stone (theme-tinted, so every walled biome's gate answers its palette)
  // with a cold under-glow; pylons are coursed monoliths; the citadel's
  // braziers burn hate-green (one campfire param — the flame family retint);
  // racks are low dark furniture; the idol watches with a faint lit gaze.
  gate_arch: {
    painter: 'gateArch', order: 56, shadow: 0.35, longShadow: 1.4,
    params: { stone: 'theme:wall|#211d2b', edge: 'theme:obstacleEdge|#3d3750', glow: 'theme:accent|#7de84a' },
    light: { radius: -1.6, color: '#7de84a', intensity: 0.3, flicker: 1.6 },
  },
  gate_pylon: {
    painter: 'slab', order: 54, shadow: 0.6, longShadow: 1.6,
    params: { shape: 'monolith', fill: 'theme:wall|#211d2b', edge: 'theme:obstacleEdge|#3d3750' },
  },
  // THE TOLL-GATE's timber kit (boundary gate 'toll_gate' — the Holdfast
  // waypost): a lashed-log arch over the barred mouth and squared corner
  // posts. Wood tones stay FIXED (bandit carpentry travels with the crew —
  // it doesn't sample the biome's rock), and the arch's light burns warm:
  // the "somebody keeps this lit" tell against the Durance's cold green.
  toll_arch: {
    painter: 'gateArch', order: 56, shadow: 0.35, longShadow: 1.4,
    params: { stone: '#4a3a22', edge: '#6e5836', glow: '#e8b458' },
    light: { radius: -1.6, color: '#ffbe6a', intensity: 0.26, flicker: 2.2 },
  },
  toll_post: {
    painter: 'slab', order: 54, shadow: 0.6, longShadow: 1.6,
    params: { shape: 'monolith', fill: '#4a3a22', edge: '#6e5836' },
  },
  hate_brazier: {
    painter: 'campfire', order: 53, shadow: 0.5, longShadow: 0.6,
    params: { bowl: true, flame: '#7de84a' },
    light: { radius: -5.5, color: '#7de84a', intensity: 0.5, flicker: 5 },
  },
  torture_rack: {
    painter: 'tortureRack', order: 52, shadow: 0.45, longShadow: 0.8,
    params: { wood: '#2e2118', iron: '#3a3630', stain: '#3a0a12' },
  },
  hate_idol: {
    painter: 'statue', order: 54, shadow: 0.6, longShadow: 1.5,
    params: { stone: 'theme:obstacle|#2a2433', moss: '#4a7a42' },
    light: { radius: -2.0, color: '#7de84a', intensity: 0.18, flicker: 1.2 },
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
  // A REAL crystalline cluster now (what the kind always promised): warm
  // faceted shards, pulsing core, Light motes rising off the facets — the
  // glow itself is the light layer's (flicker at parity with every other
  // emissive), never a painted halo disc.
  light_spot: {
    longShadow: 0.5, painter: 'shard', order: 54, shadow: 0.4,
    params: { points: 6, color: '#c8a84e', material: 'crystal',
      coreGlow: { color: '#fff2c0' }, motes: { color: '#ffe9a8' } },
    light: { radius: -3.4, color: '#ffe08a', intensity: 0.5, flicker: 1.8 },
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
  // WORLD BOSSES (packages/defs/worldboss.ts) — the serpent's coil wall: a
  // scaled hide-mound plugging a sealed pass (rules registered by the package;
  // the engine lays and crumbles them at runtime).
  wyrm_coil: {
    longShadow: 0.8,
    painter: 'boulder', order: 55, shadow: 0.65,
    params: {
      color: '#5c7a4c', edge: '#2c3e24', material: 'chitin', contrast: 1.1,
      cluster: 0.35, grain: true, strata: {},
    },
  },
  // Velketh's throne — the great husk dais the lair sovereign is fused to
  // (ground overlay: the boss STANDS on it; it never blocks).
  husk_throne: {
    painter: 'liquid', order: 26,
    blend: { strength: 0.45, feather: 26, color: '#3a2a48' },
    params: {
      rim: { color: '#7e56ae', alpha: 0.5, grow: 4 },
      core: { color: '#3a2a48', alpha: 0.72 },
      squiggles: { color: '#9a6ad2' },
    },
    light: { radius: -1.6, color: '#9a6ad2', intensity: 0.22, flicker: 1.2 },
  },
  breach: {
    painter: 'breach', order: 58,
    params: { edge: '#d84a2a', label: 'the Breach' },
    light: { radius: -2.4, color: '#d84a2a', intensity: 0.35, flicker: 2.8 },
  },
  isle_beacon: {
    painter: 'beacon', order: 59,
    light: { radius: 120, color: '#7fd0ff', intensity: 0.4 },
  },
  // --- SURVEY SPIRES (the 'beacon' zone objective — data/beacons.ts) --------
  // One painter, two kinds: the engine swaps dormant → lit at full charge (a
  // pure KIND swap, so the bake cache and the light layer both follow the
  // data). The dormant stone barely breathes; the lit one is a landmark lamp.
  survey_spire: {
    painter: 'surveySpire', order: 54, shadow: 0.5, longShadow: 1.6,
    params: { stone: 'theme:obstacle|#646c7a', gem: '#8fd4ff' },
    light: { radius: -2.6, color: '#8fd4ff', intensity: 0.16 },
  },
  survey_spire_lit: {
    painter: 'surveySpire', order: 54, shadow: 0.5, longShadow: 1.6,
    params: { stone: 'theme:obstacle|#646c7a', gem: '#bfe8ff', lit: true },
    light: { radius: -5.0, color: '#9fdcff', intensity: 0.6, flicker: 1.6 },
  },
  // The ATTUNEMENT CIRCUIT's waystones (ObjectiveSpec beacon count 2+): the
  // spire's smaller kin on the same painter — teal-veined, humbler light.
  waystone: {
    painter: 'surveySpire', order: 54, shadow: 0.5, longShadow: 1.3,
    params: { stone: 'theme:obstacle|#5e6a66', gem: '#7fe8c8' },
    light: { radius: -2.4, color: '#7fe8c8', intensity: 0.14 },
  },
  waystone_lit: {
    painter: 'surveySpire', order: 54, shadow: 0.5, longShadow: 1.3,
    params: { stone: 'theme:obstacle|#5e6a66', gem: '#b8ffe4', lit: true },
    light: { radius: -4.4, color: '#8ff0d4', intensity: 0.5, flicker: 1.4 },
  },

  // --- The AETHERIAL kit (vis/paintersAether.ts — the cloud shelves) --------
  cloud_billow: {
    painter: 'cloudBillow', order: 44, shadow: 0.25,
    params: { body: 'theme:obstacle|#e7ecf7', shadow: 'theme:obstacleEdge|#a9b6d4', crown: '#fdfdff' },
  },
  aether_crystal: {
    painter: 'aetherCrystal', order: 50, shadow: 0.3,
    params: { body: '#bcd6ff', deep: '#6c86c8', gleam: '#ffffff' },
    light: { radius: -3.2, color: '#9fc4ff', intensity: 0.4, flicker: 0.8 },
  },
  // A lone icier tine of the same crystal painter — brittle (one blow and it
  // sings apart): the shelves get something to CUT and the lurker gets kin
  // to hide among.
  skyglass_spur: {
    painter: 'aetherCrystal', order: 50, shadow: 0.25,
    params: { body: '#d4ecf8', deep: '#8fb4d8', gleam: '#ffffff' },
    light: { radius: -2.6, color: '#bfe4f8', intensity: 0.3, flicker: 0.5 },
  },
  // The vent painter in sky dress: a breathing rift whose plume QUICKENS
  // (DoodadRule.effect status_wash → windswept) — the speed-pad made ground.
  updraft_vent: {
    painter: 'vent', order: 46,
    params: { rim: '#b8c6de', throat: '#8fa3cc', hot: '#dcecf8', core: '#ffffff' },
    light: { radius: -2.4, color: '#dceafc', intensity: 0.22, flicker: 2.4 },
  },
  // The fountain painter breathing cold vapor instead of votive water.
  mist_font: {
    painter: 'fountain', order: 53, shadow: 0.4,
    light: { radius: -2.0, color: '#bfe0f8', intensity: 0.18 },
  },
  // --- THE WEATHERWORKS KIT (grounded weather, any land biome) -------------
  // The Aetherial dressing's earthbound cousins: same painters, humbler
  // dress — a vapor floor-pool (liquid painter in mist tones), a brittle
  // storm-crystal (aetherCrystal in charged grey-green), and the
  // haven-stone (the waystone's painter wearing the Cloudherd's tint).
  mist_pool: {
    painter: 'liquid', order: 46,
    blend: { strength: 0.28, feather: 20, color: '#cfd8e6' },
    params: {
      core: { color: '#d4deea', alpha: 0.22 },
      tufts: { color: '#c4d2e2', flower: '#eef4fa' },
    },
  },
  stormglass_shard: {
    painter: 'aetherCrystal', order: 50, shadow: 0.25,
    params: { body: '#cfd8b8', deep: '#8a9a6c', gleam: '#fdffe8' },
    light: { radius: -2.6, color: '#e8f0c8', intensity: 0.28, flicker: 1.8 },
  },
  haven_stone: {
    painter: 'surveySpire', order: 54, shadow: 0.5, longShadow: 1.2,
    params: { stone: 'theme:obstacle|#68707e', gem: '#cfeaff' },
    light: { radius: -2.8, color: '#cfeaff', intensity: 0.2, flicker: 0.6 },
  },
  // Pale fleece-grass (the liquid tuft painter in cloud colors) — the
  // grazers' pasture; soft floor the shelves read as LIVED ON.
  cloudwool_tuft: {
    painter: 'liquid', order: 47,
    blend: { strength: 0.3, feather: 18, color: '#e8eff9' },
    params: {
      core: { color: '#e8eff9', alpha: 0.2 },
      tufts: { color: '#dce6f4', flower: '#ffffff' },
    },
  },
  seraph_statue: {
    painter: 'seraphStatue', order: 54, shadow: 0.5, longShadow: 1.4,
    params: { marble: '#e3e2dc', shadow: '#9a9aa4', gold: '#d8b56a' },
  },
  harp_pillar: {
    painter: 'harpPillar', order: 53, shadow: 0.45, longShadow: 1.2,
    params: { marble: '#e6e5df', string: '#ffe9a8', gold: '#d8b56a' },
    light: { radius: -2.2, color: '#ffe9a8', intensity: 0.16 },
  },
  prayer_bell: {
    painter: 'prayerBell', order: 52, shadow: 0.35,
    params: { bronze: '#b9935a', marble: '#e0dfd8', cord: '#c8d4ea' },
  },
  ascendant_gate: {
    painter: 'ascendantGate', order: 58, shadow: 0.4,
    params: { marble: '#e8e7e1', light: 'theme:accent|#ffeeb8', gold: '#d8b56a' },
    light: { radius: -3.6, color: '#ffe9a8', intensity: 0.5, flicker: 0.6 },
  },
  sky_geyser: {
    painter: 'skyGeyser', order: 47, shadow: 0.2,
    params: { stone: '#8a8d96', water: '#7fc4d8', spray: '#eef6fb' },
    light: { radius: -2.6, color: '#9fd8e8', intensity: 0.2 },
  },
  // The High Heavens kit (aether_spires): the monument + the court's fire.
  spire_of_dawn: {
    painter: 'spireOfDawn', order: 56, shadow: 0.55, longShadow: 2.2,
    params: { marble: '#eceade', gold: '#d8b56a', light: 'theme:accent|#fff2c8' },
    light: { radius: -4.2, color: '#ffeeb8', intensity: 0.55, flicker: 0.5 },
  },
  aureate_brazier: {
    painter: 'campfire', order: 53, shadow: 0.4, longShadow: 0.6,
    params: { bowl: true, flame: '#fff2c8' },
    light: { radius: -5, color: '#ffe9a8', intensity: 0.5, flicker: 4 },
  },
  // The Driftways kit (aether_drift): wind furniture — poles, lanterns,
  // chimes, vanes, the sculpted vapor-stone, and the vane-crowned monument.
  zephyr_totem: {
    painter: 'zephyrTotem', order: 52, shadow: 0.4, longShadow: 0.9,
    params: { wood: '#b9c4dc', carve: '#7f8db4', streamer: '#bfe8f4' },
    light: { radius: -3.2, color: '#bfe8f4', intensity: 0.22, flicker: 2 },
  },
  sky_lantern: {
    painter: 'skyLantern', order: 55, shadow: 0.18,
    params: { paper: '#ffe6c0', frame: '#c88a4a', glow: '#ffd27f' },
    light: { radius: -4.2, color: '#ffd9a0', intensity: 0.42, flicker: 3 },
  },
  chime_stand: {
    painter: 'chimeStand', order: 52, shadow: 0.35,
    params: { frame: '#e6e5df', chime: '#d8e8f4', cord: '#8a90a8' },
  },
  gale_vane: {
    painter: 'galeVane', order: 51, shadow: 0.3,
    params: { pole: '#9aa4c0', vane: '#ffd27f', tail: '#dce6f2' },
  },
  cloud_coral: {
    painter: 'cloudCoral', order: 46, shadow: 0.28,
    params: { body: 'theme:obstacle|#e4ebf6', shade: 'theme:obstacleEdge|#a2b2d2', rim: '#fdfdff' },
  },
  spire_of_gales: {
    painter: 'spireOfGales', order: 58, shadow: 0.5, longShadow: 1.6,
    params: { marble: '#e6e5df', gold: '#d8b56a', streamer: '#bfe8f4' },
    light: { radius: -2.6, color: '#bfe8f4', intensity: 0.3 },
  },
};
