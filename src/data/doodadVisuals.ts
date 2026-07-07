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
  bog: {
    painter: 'liquid', order: 12,
    params: {
      rim: { color: '#39432a', alpha: 0.6, grow: 3 },
      core: { color: '#5a6e34', alpha: 0.5, grow: -8 },
      squiggles: { color: '#7a8a4a' },
      bubbles: { color: '#a8bc72' },
    },
  },
  swamp: {
    painter: 'liquid', order: 14,
    params: {
      core: { color: '#2e3a2a', alpha: 0.55 },
      scum: { color: '#5c7448' },
    },
  },
  mud: {
    painter: 'liquid', order: 16,
    params: {
      core: { color: 'theme:mud|#2b2518', alpha: 0.4 },
      blotch: { color: '#181209' },
    },
  },
  sand: {
    painter: 'liquid', order: 18,
    params: { core: { color: 'theme:sand|#c9a86a', alpha: 0.4 } },
  },
  road: {
    painter: 'gravelPath', order: 20,
    params: { color: 'theme:road|#574f44' },
  },
  lava: {
    painter: 'liquid', order: 22,
    params: {
      rim: { color: '#ff5a1e', alpha: 0.6, grow: 4 },
      core: { color: 'theme:lava|#7a1a08', alpha: 1, grow: -6 },
      emberPulse: { color: '#ff7a2a' },
      crawl: { color: '#ffb04a' },
      crackle: { color: '#2a0c04' },
    },
    light: { radius: -1.8, color: '#ff6a26', intensity: 0.55 },
  },
  cinder: {
    painter: 'liquid', order: 24,
    params: {
      rim: { color: '#2a1a12', alpha: 0.55, grow: 3 },
      emberPulse: { color: 'theme:lava|#7a1a08' },
      core: { color: '#2a1a12', alpha: 0.25 },
    },
  },
  gore: {
    painter: 'liquid', order: 26,
    params: {
      rim: { color: '#3a0a12', alpha: 0.6, grow: 3 },
      core: { color: '#5a1420', alpha: 0.82 },
      glisten: { color: '#e8a8b0' },
    },
  },
  mycelial_mat: {
    painter: 'liquid', order: 28,
    params: {
      rim: { color: '#2a3a1e', alpha: 0.5, grow: 3 },
      core: { color: '#6fae4a', alpha: 0.36 },
    },
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
    params: {
      rim: { color: '#f0f6fc', alpha: 0.22, grow: 3 },
      core: { color: '#dce8f2', alpha: 0.22 },
    },
  },
  reeds: { painter: 'kelp', order: 48, params: { color: '#5a7a3a' } },
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
    light: { radius: -5.5, color: '#ffb45e', intensity: 0.55, flicker: 5 },
  },
  standing_stone: {
    painter: 'slab', order: 54, shadow: 0.65, longShadow: 1.2,
    params: { shape: 'monolith', fill: 'theme:obstacle', edge: 'theme:obstacleEdge' },
  },
  grass: {
    painter: 'liquid', order: 47,
    params: {
      core: { color: 'theme:grass|#3e5c30', alpha: 0.22 },
      tufts: { color: 'theme:grass|#3e5c30', flower: '#d8c86a' },
    },
  },

  // --- Pits (the void wins over every ground overlay), then spans ---------
  void_chasm: {
    painter: 'liquid', order: 38,
    params: {
      rim: { color: '#3a2a52', alpha: 0.45, grow: 5 },
      core: { color: '#020205', alpha: 1 },
    },
  },
  chasm: {
    painter: 'liquid', order: 40,
    params: {
      rim: { color: 'theme:obstacleEdge', alpha: 0.5, grow: 5 },
      core: { color: 'theme:chasm|#040409', alpha: 1 },
    },
  },
  bridge: { painter: 'plank', order: 44 },
  cliff: {
    painter: 'liquid', order: 46,
    params: {
      rim: { color: 'theme:obstacleEdge', alpha: 1, grow: 3 },
      core: { color: 'theme:obstacle', alpha: 1 },
    },
  },

  // --- Flora + cover -------------------------------------------------------
  sapling: { painter: 'sapling', order: 45, params: { crown: 'theme:tree|#2c4424' } },
  brush: { painter: 'brush', order: 49, params: { color: 'theme:tree|#2c4424' } },
  // WALK-UNDER TREES: the ground pass draws the real TRUNK (the physical
  // body — DoodadRule.bodyScale); the crown rides the canopy pass above,
  // fading when the hero steps beneath. Anyone ELSE under an unfaded crown
  // is simply unseen — the forest ambush, for both sides.
  tree: {
    longShadow: 0.85,
    painter: 'trunk', order: 50, params: { scale: 0.3, roots: 4 },
    canopy: { painter: 'leafCrown', params: { fill: 'theme:tree|#2c4424' } },
  },
  thicket: {
    longShadow: 0.7,
    painter: 'groundShadow', order: 50, params: { scale: 0.5, color: '#101c10' },
    canopy: { painter: 'bramble', params: { fill: '#16401c', edge: '#0a2410', spine: '#2c5a26' } },
  },
  palm: {
    longShadow: 0.8,
    painter: 'trunk', order: 50, params: { scale: 0.26, roots: 3 },
    canopy: { painter: 'palmCrown' },
  },
  conifer: {
    longShadow: 0.9,
    painter: 'trunk', order: 50, params: { scale: 0.26, roots: 3, color: '#4a3826' },
    canopy: { painter: 'pineCrown', params: { fill: 'theme:tree|#1e3a28' } },
  },
  ancient_tree: {
    longShadow: 0.9,
    painter: 'trunk', order: 50, params: { scale: 0.22, roots: 6 },
    canopy: { painter: 'leafCrown', params: { fill: 'theme:tree|#2c4424' } },
  },
  giant_mushroom: {
    longShadow: 0.8,
    painter: 'groundShadow', order: 50, params: { scale: 0.34, color: '#241c2e' },
    canopy: { painter: 'mushroomCrown', params: { caps: 1 } },
    light: { radius: -1.6, color: '#8fd06f', intensity: 0.18 },
  },
  fruiting_tower: {
    longShadow: 0.9,
    painter: 'groundShadow', order: 50, params: { scale: 0.34, color: '#241c2e' },
    canopy: { painter: 'mushroomCrown', params: { caps: 3 } },
    light: { radius: -1.8, color: '#8fd06f', intensity: 0.2 },
  },
  kelp: { painter: 'kelp', order: 48 },
  coral: { painter: 'coral', order: 52, shadow: 0.5 },

  // --- Standing minerals + organics ---------------------------------------
  rock: {
    longShadow: 0.7,
    painter: 'mound', order: 55, shadow: 0.7,
    params: { color: 'theme:obstacle', edge: 'theme:obstacleEdge', material: 'stone', hatch: true },
  },
  sea_rock: {
    painter: 'mound', order: 52, shadow: 0.6,
    params: { color: '#274a52', edge: '#3f7a86', material: 'stone', barnacle: '#5fb0b8' },
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
  market_stall: { painter: 'marketStall', order: 55, shadow: 0.55, longShadow: 0.9 },
  broken_cart: { painter: 'brokenCart', order: 53, shadow: 0.5, longShadow: 0.9 },
  scarecrow: { painter: 'scarecrow', order: 55, shadow: 0.35, longShadow: 1.6 },
  hay_bale: { painter: 'hayBale', order: 53, shadow: 0.55, longShadow: 0.8 },
  pot_cluster: { painter: 'potCluster', order: 53, shadow: 0.5 },
  rubble: { painter: 'rubble', order: 36 },
  banner_post: { painter: 'bannerPost', order: 55, shadow: 0.35, longShadow: 1.5 },
  beehive: {
    painter: 'pod', order: 53, shadow: 0.5,
    params: { body: '#c8a24a', glow: '#e8cf7a', aspectY: 1.15, glowY: -0.2, glowR: 0.34, pulseRate: 1.4 },
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
    params: { body: 'theme:obstacle', glow: 'theme:accent|#e86a7a', aspectY: 0.82, glowY: -0.1, glowR: 0.42, pulseRate: 1.9 },
  },
  spore_pod: {
    painter: 'pod', order: 52, shadow: 0.5,
    params: { body: '#4a5a2a', glow: '#adbf6a', aspectY: 1.1, glowY: -0.3, glowR: 0.5, pulseRate: 2.4 },
  },
  glow_cap: {
    painter: 'dome', order: 52,
    params: { halo: '#c8ffa0', cap: '#8fd06f' },
    light: { radius: -3.2, color: '#c8ffa0', intensity: 0.3 },
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
  wall: { painter: 'palisade', order: 52, longShadow: 0.6, params: { fill: 'theme:wall|#5e4c34', edge: '#2c2418' } },
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
  cave_entrance: {
    painter: 'caveMouth', order: 55,
    params: { glow: '#caa860', label: 'Cave' },
    light: { radius: -2, color: '#caa860', intensity: 0.25, flicker: 2.5 },
  },

  // --- Ritual + event set-pieces -------------------------------------------
  tentacle_field: { painter: 'tentacleField', order: 56 },
  ritual_pentagram: { painter: 'pentagram', order: 57 },
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
