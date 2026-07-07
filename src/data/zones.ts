// ---------------------------------------------------------------------------
// THE WORLD.
//
// Zones are data: a connected graph of themed areas, each with its own size,
// terrain palette, a LAYOUT of set-piece stamps (rock clusters, cliff runs,
// mud patches, ravines with bridges, ruin rings), monster packs, and an
// OBJECTIVE that decides how the zone plays — clear the packs, survive
// waves, escape a zone that never stops spawning, destroy spawner objects,
// or slay a boss. Monster levels come from the zone, so the graph IS the
// difficulty curve.
//
// Exits with `to: '?'` are FRONTIER portals: stepping through one generates
// a brand-new zone from the named tileset (see data/tilesets.ts) and grafts
// it onto the world graph, one level deeper. The map grows as you explore.
// ---------------------------------------------------------------------------

import type { MonsterRarity } from '../engine/rarity';

export interface PackTableEntry { id: string; weight: number; }

/** A pack SIZE archetype rolled per pack (a weighted spread): lets a zone mix dense
 *  swarms, standard packs, and tiny grazing groups instead of one uniform size band.
 *  The user's "Field = a mixture of tight clusters, grazing pairs, and a smattering." */
export interface PackArchetype { weight: number; size: [number, number]; }

export interface PackSpec {
  /** How many packs the zone seeds, rolled per visit. */
  count: [number, number];
  /** Monsters per pack (the default band when no `archetypes` spread is set). */
  size: [number, number];
  /** Optional weighted SIZE spread — each pack rolls an archetype, so the zone varies
   *  swarm / standard / grazing groups. Absent = every pack uses the flat `size` band. */
  archetypes?: PackArchetype[];
  /** One type is rolled per pack, so packs read as coherent groups. */
  table: PackTableEntry[];
}

/** What the zone asks of you. Locked exits open when the objective is met. */
export type ObjectiveSpec =
  /** A sanctuary: nothing spawns, nothing seals, nothing is asked. */
  | { kind: 'safe' }
  | { kind: 'clear' }
  /** Survive N waves (0 = endless — the original arena mode). */
  | { kind: 'waves'; waves: number }
  /** Enemies trickle in forever; the objective is reaching an exit. */
  | { kind: 'escape'; interval: [number, number] }
  /** Destructible spawner objects seed the zone; destroy them all. */
  | { kind: 'spawners'; spawnerId: string; count: [number, number] }
  | { kind: 'boss'; id: string; levelBonus?: number; uber?: UberPolicy; promote?: BossPromote };

/** OPT-IN difficulty spike: promote the boss to an elite RARITY at spawn, optionally
 *  STACKING it (each stack re-applies the rarity's stat mods, compounding life/damage)
 *  — the lever for cranking a boss harder later WITHOUT touching its base def. Absent
 *  = a plain (un-promoted) boss. */
export interface BossPromote {
  rarity: MonsterRarity;
  /** How many times to apply the rarity's stat mods (default 1). 2+ = a true spike. */
  stacks?: number;
}

/** ONE-SHOT BOSS lifecycle (reusable seam): when set on a boss objective, the kill
 *  is RECORDED and the boss never returns — `scope:'account'` makes it forever-dead
 *  across every character on the account (an account-ledger key); `scope:'world'`
 *  makes it once-per-run/save (rides the persistent completedObjectives set). Absent
 *  = a normal REPEATABLE boss (re-fightable every entry — the Unmade's mode). */
export interface UberPolicy {
  scope: 'account' | 'world';
  /** Ledger key for account scope (defaults to `uber:<bossId>`). */
  key?: string;
}

/** Set-piece stamps the built-in level generator registers out of the box. */
export type KnownStampKind =
  | 'rocks' | 'cliff' | 'mud' | 'chasm' | 'ravine' | 'ruin'
  | 'swamp' | 'bog' | 'water' | 'ice' | 'river' | 'camp'
  | 'trees' | 'grove' | 'grass' | 'brush' | 'structure'
  // Biome-expansion stamps (batch 6)
  | 'sand' | 'vines' | 'thicket' | 'tombstone' | 'palm' | 'lava'
  | 'shallows' | 'cave'
  // Hazard set-pieces (crystal laser shards, volcanic lava vents)
  | 'crystal' | 'lava_vent'
  // Flesh-biome themed clutter (organic pods, bone struts, viscera pools)
  | 'flesh_pod' | 'bone' | 'gore'
  // Volcanic-biome themed clutter (obsidian shards, ash patches, ember vents)
  | 'obsidian' | 'cinder' | 'ember_vent'
  // Marine/deep-sea clutter (kelp beds, coral heads, rocky outcroppings)
  | 'kelp' | 'coral' | 'sea_rock'
  // Mycelia fungal clutter (towering caps, puffing spore-pods, glow-caps, hyphal mats, spires)
  | 'giant_mushroom' | 'spore_pod' | 'glow_cap' | 'mycelial_mat' | 'fruiting_tower'
  // Data-driven composite clusters (engine/levelgen registerCluster).
  | 'cluster'
  // Geographic landmark recipes (engine/levelgen registerLandmark).
  | 'landmark';

/** Open stamp vocabulary: the known kinds keep autocomplete/typo resistance, and a
 *  registered package stamp (registerStamp) rides the same field. Every layout entry
 *  is boot-validated against the live registry (validateStamps), so the safety net
 *  the closed union provided moves to the validator rather than silently vanishing. */
export type StampKind = KnownStampKind | (string & {});

/** Placement checks a stamp may relax (the "rule-breaker" stamp-object). Each entry
 *  names ONE gate findSpot/clearOf/inReserved normally enforces:
 *    'border'      — may hug/overhang the arena border (sample rect widens)
 *    'portalClear' — may sit near the entry/exit portals (portal-clear splice spares it)
 *    'reserved'    — may overlap reserved structure footprints
 *    'solids'      — skips the solid-overlap spacing test entirely
 *    'spacing'     — keeps the test but with zero gap
 *    'walk'        — may land on non-walkable grid cells
 *    'forbid'      — ignores the kind's forbidOn ground list */
export type StampIgnoreRule =
  | 'border' | 'portalClear' | 'reserved' | 'solids' | 'spacing' | 'walk' | 'forbid';

export interface StampRuleOverride {
  ignore?: StampIgnoreRule[];
  /** Override the kind's registry spacing for this stamp only. */
  spacing?: number;
  /** Replace (not merge) the kind's forbidOn ground list for this stamp only. */
  forbidOn?: string[];
}

export interface StampSpec {
  kind: StampKind;
  count: [number, number];
  /** rocks / water / trees: radius range override. */
  radius?: [number, number];
  /** structure stamps: which blueprint to raise (data/structures.ts). */
  structure?: string;
  /** cluster stamps: which registered ClusterDef to scatter (engine/levelgen). */
  cluster?: string;
  /** landmark stamps: which registered LandmarkDef to raise (engine/levelgen). */
  landmark?: string;
  /** Per-stamp placement-rule relaxations (see StampRuleOverride). */
  rules?: StampRuleOverride;
}

/** A structure CHANCE a zone rolls at generation (merged from tileset + biome
 *  data at mint, or authored directly on a ZoneDef). chance 0 = never scatter-
 *  rolled but still in the zone's bastion pool (a bastion-only def). */
export interface StructureRoll {
  structure: string;
  chance: number;
  count?: [number, number];
}

/** A geographic-landmark CHANCE (same merge + roll discipline as structures). */
export interface LandmarkRoll {
  landmark: string;
  chance: number;
  count?: [number, number];
}

export interface ZoneExitDef {
  /** Destination zone id — or '?' for an ungenerated frontier. */
  to: string;
  side: 'n' | 's' | 'e' | 'w';
  /** 0..1 position along that side (default 0.5 = centered). */
  at?: number;
  /** Frontier portals: which tileset the new zone generates from. */
  tileset?: string;
  /** A LOCK id (a Holdfast). While the lock holds, this exit is sealed (isExitLocked)
   *  AND the eager web never charts it (a fortified, opt-in bonus exit you must earn).
   *  Resolved against the lock owner's overlay (HoldfastField). Absent = a normal exit. */
  lock?: string;
  /** Off-axis portal placement OVERRIDE (normalized 0..1 arena fractions), decoupled
   *  from `side` so a non-cardinal locale still draws a sane map road from `side`.
   *  Absent (the norm) = the cardinal side+at placement. (Data seam; phase-2 use.) */
  posFrac?: { fx: number; fy: number };
}

export interface ZoneTheme {
  floor: string;
  grid: string;
  border: string;
  /** Rock / cliff fill and outline. */
  obstacle: string;
  obstacleEdge: string;
  /** Portals, zone-name accents. */
  accent: string;
  /** Slowing terrain (mud, snow drifts, ash). Default engine brown. */
  mud?: string;
  /** Gravel road path (a maintained track). Default packed-grey. */
  road?: string;
  /** Uncrossable void (chasms, lava cracks). Default near-black. */
  chasm?: string;
  /** Rivers, lakes, ponds. Default deep blue. */
  water?: string;
  /** Camp palisades. Default weathered timber. */
  wall?: string;
  /** Tree canopies and brush. Default forest green. */
  tree?: string;
  /** Grass tufts and splotches. */
  grass?: string;
  /** Wind-blown sand (deserts, beaches). Default pale tan. */
  sand?: string;
  /** Molten rock core (wastelands). Default dark ember. */
  lava?: string;
  /** Baseline darkness for the LIGHT LAYER even at noon (0..1) — interiors
   *  (caves, crypts) set this so they read lightless under an open-sky sun;
   *  omitted = open sky, only night darkens. */
  ambientDark?: number;
  /** AMBIENT FX — the zone's standing sensory weather (render/vis/ambientFx):
   *  underwater caustics + bubble splays, desert heat haze, drifting motes.
   *  Screen-space, stateless, data-extensible. */
  ambientFx?: { kind: 'bubbles' | 'caustics' | 'heatHaze' | 'motes'; intensity?: number; color?: string }[];
  /** GROUND STYLE — how this theme's floor textures (all optional; defaults
   *  in VIS_CFG.ground). A desert reads as ROLLING DUNES with scale 2.5 +
   *  stretchX 2; a grove keeps the fine default mottle. */
  ground?: {
    /** Noise feature size multiplier (1 = default grain, 2.5 = dunes). */
    scale?: number;
    /** Directional stretch of features along x (dune ridges > 1). */
    stretchX?: number;
    /** Mottle strength multiplier (contrast of the tone swing). */
    strength?: number;
    /** Speckle count multiplier (0 = bare). */
    speckles?: number;
  };
}

export interface ZoneDef {
  id: string;
  name: string;
  /** Monster level for everything spawned here (waves may ramp beyond it). */
  level: number;
  size: { w: number; h: number };
  theme: ZoneTheme;
  /** Set pieces stamped into the terrain at generation time. */
  layout: StampSpec[];
  /** Which LAYOUT GENERATOR shapes this zone (levelgen LAYOUT_GENERATORS). Open
   *  string id (default 'plains' = the classic additive stamp-scatter over the
   *  convex floor). A biome picks this at mint; stored on the def so Zone Memory
   *  replays the same topology on return. New layout families register their own. */
  layoutType?: string;
  objective: ObjectiveSpec;
  packs?: PackSpec;
  exits: ZoneExitDef[];
  /** Layout position on the world map panel (M). */
  map: { x: number; y: number };
  /** This zone holds a waypoint — attune it once, fast-travel forever. */
  waypoint?: boolean;
  /** Minted UNCHARTED + DISCONNECTED (no road) — a fog-of-war quest target you
   *  must EXPLORE toward; a road forms on approach (cleared then). The inverse of
   *  the demon-invasion force-connect. Absent = normally connected. */
  floating?: boolean;
  /** Minted CONCEALED — hidden from the world map (the fog seam world.visible()
   *  reads) and excluded from its auto-fit, so a far Incursion landing stays
   *  obscured + never zooms the map out. Cleared when the player approaches
   *  (connectFloatingZone) or enters it. Absent = a normal, visible zone. */
  concealed?: boolean;
  /** This zone is the EPICENTER/territory of another world event (a demon rift, a
   *  crusade stronghold/frontier, an incursion epicenter). Set at mint so other
   *  overlays (e.g. Conclave) don't squat their own content on it. Persists (unlike
   *  floating/concealed, which clear on approach). Absent = a plain zone. */
  eventOwned?: boolean;
  /**
   * Fixed layout seed. Static zones leave this unset (terrain reshuffles
   * per visit); generated zones carry one so the place you discovered
   * keeps its shape when you return.
   */
  seed?: number;
  /** Hand-placed structures at exact coordinates (the town's buildings). */
  fixtures?: { structure: string; x: number; y: number }[];
  /** Structure CHANCES rolled at generation (merged from tileset + biome at
   *  mint); also the zone's bastion-layout candidate pool. */
  structures?: StructureRoll[];
  /** Geographic-landmark CHANCES rolled at generation (merged from tileset +
   *  biome at mint) — the fjord/caldera/oasis vocabulary. */
  landmarks?: LandmarkRoll[];
  /** GEOGRAPHIC context baked at mint — how the zone sits in the WORLD's
   *  fields. biomeDepth: 0 = at its biome blob's edge, 1 = deep interior
   *  (a deep-sea zone far inside the deepsea region rolls more void trenches
   *  than a coastal one — generation that reads the world map). */
  geo?: { biomeDepth: number };
  /** A PORT: the land ends here — a harbor zone on a continent's shore. Its
   *  dock opens the Sail menu (naval travel to other discovered ports /
   *  chart-a-course landfalls). Frontiers never mint past a port into open
   *  ocean; the sea itself is the road. */
  port?: boolean;
  /** Which DIMENSION this zone belongs to (default 'surface'). The map shows
   *  one dimension per tab; frontiers inherit their source's dimension. */
  dimension?: string;
  /** CAVE LADDER depth (caves only): 1 = a surface cave, 2 = a cave within a
   *  cave (the Depths flavor), 3 = the bottom — it holds a BREACH.
   *  Presence IS the cave/off-graph discriminator (mintCave is the sole writer):
   *  categorize on `caveDepth != null`, never by sniffing the 'cave_' id prefix —
   *  the prefix survives only as a churn-id namespace for string-only classifiers
   *  over zones that may no longer exist (corpse records, save strips). */
  caveDepth?: number;
  /** This cave holds a BREACH into the Underworld (dwell it to cross). */
  breach?: boolean;
  /** Sea routes sailed FROM this port (port zone ids) — map styling + the
   *  Sail menu's memory of established crossings. */
  searoutes?: string[];
  /** Layout GENERATOR knobs, merged tileset ← biome ← spec at mint — the
   *  "same tileset, tweak its generation" seam: volcanic as a spiral cauldron,
   *  a winding road, or an open expanse is one param, not three tilesets.
   *  Read via levelgen layoutParam(def, key, dflt). */
  layoutParams?: Record<string, unknown>;
  /** Two monster factions at WAR here: they spawn brawling, hate each
   *  other as much as you, and pay you nothing for each other's deaths. */
  factionWar?: [string, string];
  /** Boundary silhouette; omitted = 'rect'. 'ellipse' = inscribed ellipse. */
  shape?: import('../world/shape').ZoneShape;
  /** BOUNDLESS: no outer wall — the player streams forever (the Descent abyss).
   *  clampToBounds skips the perimeter; only doodad collision stops movement, and
   *  the engine streams terrain/enemies around the player. Absent = a normal arena. */
  boundless?: boolean;
  /** Biome tag for faction-traits home matching ('grave' | 'grove' | 'rift'). */
  biome?: string;
  /** Sub-biome variant rolled at generation — a flavour within the biome
   *  (a jungle "clearing" vs "dense floor"). Cosmetic + layout, not faction. */
  variantName?: string;
  /** Suppress waypoints on any OTHER zone minted within this node-unit radius — the
   *  anti-teleport gate around a boss arena (forces a multi-zone trek; survives a
   *  Campfire refresh). Also enforced at fast-travel (travelToWaypoint). */
  wpExclusionRadius?: number;
  /** A hand-authored SPECIAL zone (a boss arena): completely ignores the biome — a
   *  fixed theme, NO ambient packs / faction war / contest, NO overlay events squat
   *  here (demon/crusade/conclave/fracture/hunt/incursion), and the layout stamps no
   *  biome doodads. Only its authored objective (the boss) populates it. */
  special?: boolean;
  /** FIELD mega-zone descriptor (set by World.fieldifyZone at mint when biome==='field').
   *  The zone is shaped to the contiguous Field heat-map blob: the 'field' layout
   *  generator re-samples biomeAt(origin + px/scale, seed) per grid cell to rasterize
   *  the EXACT region silhouette. Stored on the def so revisits / co-op / Zone Memory
   *  replay an identical shape. Absent = a normal zone. */
  field?: FieldRegion;
  /** Multiplier on ambient pack count (default 1) — a per-zone density lever on top of
   *  the automatic sqrt(area) scaling. A Field expanse can be set lush or sparse. */
  packDensity?: number;
  /** Multiplier on the encounter-diamond open chance (default 1) — lets a big zone seed
   *  proportionally more breaches without touching the global cadence. */
  encounterDensity?: number;
}

/** Describes a FIELD mega-zone's mapping from in-zone PIXELS back to world NODE space,
 *  so the layout generator can re-sample the biome heat-map and rasterize the exact
 *  contiguous-Field silhouette. Pure data (serialized with the def). */
export interface FieldRegion {
  /** Node-space coordinate the arena's (0,0) maps to (the padded region bbox top-left). */
  originX: number;
  originY: number;
  /** Pixels per node unit. node = origin + pixel / scale (and arena = nodeExtent * scale). */
  scale: number;
  /** The biome-field seed to re-sample with raw biomeAt (warp-blind, stable per run). */
  seed: number;
  /** Canonical id of the contiguous Field region — the MINT-ONCE-per-region key, so
   *  re-approaching the same expanse from another direction links to the same zone. */
  regionId: string;
  /** Node-space footprint of the region (= arena size / scale) — so the world map draws the
   *  node SPANNING the whole heat-map blob, and the zone's exits project from its BOUNDARY. */
  nodeW: number;
  nodeH: number;
}

export const START_ZONE = 'lastlight';

export const ZONES: Record<string, ZoneDef> = {

  // The town: a SANCTUARY. The run begins here; the waypoint and the
  // sacrificial font are always lit; the road east leads to the war.
  lastlight: {
    id: 'lastlight', name: 'Lastlight',
    level: 0,
    size: { w: 1400, h: 1000 },
    theme: {
      floor: '#141310', grid: '#1e1c16', border: '#4a4434',
      obstacle: '#3e3a2e', obstacleEdge: '#5c563e', accent: '#e8c87a',
      wall: '#6a5638', water: '#1d4254', mud: '#2b261a',
    },
    seed: 1187, // the town keeps its shape — it's home
    layout: [
      { kind: 'trees', count: [10, 10], radius: [13, 20] },
      { kind: 'grass', count: [5, 5] },
      { kind: 'brush', count: [2, 2] },
      { kind: 'river', count: [1, 1] },
    ],
    fixtures: [
      { structure: 'blacksmith', x: 450, y: 320 },
      { structure: 'inn', x: 960, y: 300 },
      { structure: 'house_small', x: 420, y: 700 },
      { structure: 'house_small', x: 640, y: 760 },
      { structure: 'wayside_camp', x: 960, y: 660 },
    ],
    objective: { kind: 'safe' },
    waypoint: true,
    exits: [
      { to: 'crossroads', side: 'e' },
      // Two alternate uncharted routes out of town — wander instead of taking the
      // road to the Crossroads. (Fixed sides/tilesets for now; could be randomized at
      // world-gen later.)
      { to: '?', side: 'n', tileset: 'meadow' },
      { to: '?', side: 's', tileset: 'deepwood' },
    ],
    map: { x: -35, y: 160 },
  },

  crossroads: {
    id: 'crossroads', name: "Wayfarer's Crossroads",
    level: 1,
    size: { w: 1700, h: 1200 },
    theme: {
      floor: '#11130f', grid: '#1c2018', border: '#3e4434',
      obstacle: '#3a3f33', obstacleEdge: '#565e48', accent: '#c8b06b',
    },
    layout: [
      { kind: 'rocks', count: [5, 8], radius: [22, 46] },
      { kind: 'trees', count: [5, 8] },
      { kind: 'grass', count: [3, 5] },
      { kind: 'mud', count: [1, 2] },
      { kind: 'water', count: [0, 1], radius: [26, 40] },
    ],
    objective: { kind: 'clear' },
    packs: {
      count: [3, 4], size: [2, 4],
      table: [
        { id: 'zombie', weight: 3 },
        { id: 'skeleton_warrior', weight: 2 },
        { id: 'blood_mite', weight: 2 },
      ],
    },
    exits: [
      { to: 'lastlight', side: 'w' },
      { to: 'withered_fields', side: 'e' },
      { to: 'the_pit', side: 's', at: 0.65 },
      // The roads from the hub now fork into hostile lands: goblins north,
      // the gnoll dens south — the undead crossroads is pressed on both sides.
      { to: 'goblin_warrens', side: 'n' },
      { to: 'scarred_dens', side: 's', at: 0.35 },
    ],
    waypoint: true,
    map: { x: 50, y: 160 },
  },

  withered_fields: {
    id: 'withered_fields', name: 'Withered Fields',
    level: 2,
    size: { w: 2300, h: 1550 },
    theme: {
      floor: '#13120d', grid: '#201e14', border: '#4a4430',
      obstacle: '#46422e', obstacleEdge: '#665f42', accent: '#c8b06b',
      mud: '#332b1a',
    },
    layout: [
      { kind: 'rocks', count: [10, 14], radius: [20, 50] },
      { kind: 'mud', count: [2, 3] },
      { kind: 'cliff', count: [1, 2] },
      { kind: 'water', count: [1, 1] },
    ],
    objective: { kind: 'clear' },
    packs: {
      count: [5, 7], size: [3, 5],
      table: [
        { id: 'zombie', weight: 3 },
        { id: 'skeleton_warrior', weight: 3 },
        { id: 'skeleton_archer', weight: 2 },
        { id: 'blood_mite', weight: 2 },
        { id: 'husk_swarmer', weight: 2 },
      ],
    },
    exits: [
      { to: 'crossroads', side: 'w', at: 0.65 },
      { to: 'forsaken_graveyard', side: 'n' },
      { to: 'shaded_thicket', side: 'e', at: 0.65 },
      { to: 'goblin_warrens', side: 'w', at: 0.35 },
      { to: '?', side: 's', tileset: 'beach' },
    ],
    map: { x: 175, y: 160 },
  },

  shaded_thicket: {
    id: 'shaded_thicket', name: 'Shaded Thicket',
    level: 3,
    size: { w: 2100, h: 1500 },
    theme: {
      floor: '#0d130d', grid: '#152015', border: '#2e4a2e',
      obstacle: '#26421f', obstacleEdge: '#3f6634', accent: '#7ec850',
      mud: '#1d2b16',
    },
    // Dense growth: the thicket is about weaving through ACTUAL trees now.
    layout: [
      { kind: 'trees', count: [16, 24], radius: [14, 28] },
      { kind: 'grove', count: [2, 3] },
      { kind: 'brush', count: [2, 4] },
      { kind: 'grass', count: [3, 5] },
      { kind: 'rocks', count: [5, 9], radius: [18, 34] },
      { kind: 'cliff', count: [1, 2] },
      { kind: 'bog', count: [1, 2] },
    ],
    objective: { kind: 'clear' },
    packs: {
      count: [6, 8], size: [2, 4],
      table: [
        { id: 'spitting_horror', weight: 3 },
        { id: 'dune_stalker', weight: 3 },
        { id: 'skeleton_archer', weight: 2 },
        { id: 'zombie', weight: 2 },
        { id: 'bone_serpent', weight: 1 },
        { id: 'gloom_stalker', weight: 1 },
      ],
    },
    exits: [
      { to: 'withered_fields', side: 'w', at: 0.65 },
      { to: 'ember_wastes', side: 'e' },
      { to: '?', side: 's', tileset: 'deepwood' },
      { to: 'verdant_hollow', side: 's', at: 0.35 },
    ],
    map: { x: 265, y: 205 },
  },

  forsaken_graveyard: {
    id: 'forsaken_graveyard', name: 'Forsaken Graveyard',
    level: 4,
    size: { w: 2000, h: 1400 },
    biome: 'grave',
    theme: {
      floor: '#0f0f14', grid: '#191926', border: '#3c3c5c',
      obstacle: '#34344a', obstacleEdge: '#54547a', accent: '#b8a0e0',
      mud: '#1e1e2a',
    },
    layout: [
      { kind: 'rocks', count: [8, 12], radius: [16, 32] },
      { kind: 'ruin', count: [2, 3] },
      { kind: 'swamp', count: [1, 2] },
    ],
    objective: { kind: 'boss', id: 'gravecaller' },
    packs: {
      count: [5, 7], size: [3, 5],
      table: [
        { id: 'zombie', weight: 3 },
        { id: 'skeleton_warrior', weight: 3 },
        { id: 'skeleton_archer', weight: 3 },
        { id: 'bone_serpent', weight: 2 },
        { id: 'crypt_warden', weight: 2 },
        { id: 'frost_witch', weight: 1 },
        { id: 'lich_marshal', weight: 1 },
      ],
    },
    exits: [
      { to: 'withered_fields', side: 's' },
      { to: 'frozen_approach', side: 'n' },
      { to: 'the_marches', side: 'w' },
      { to: '?', side: 'e', tileset: 'crypt' },
    ],
    waypoint: true,
    map: { x: 175, y: 90 },
  },

  ember_wastes: {
    id: 'ember_wastes', name: 'Ember Wastes',
    level: 5,
    size: { w: 2400, h: 1500 },
    theme: {
      floor: '#160f0c', grid: '#241712', border: '#5c3a28',
      obstacle: '#4a2e20', obstacleEdge: '#7a4830', accent: '#ff8a4a',
      chasm: '#190603', mud: '#2b1c12',
    },
    // A scorched ravine cuts the wastes; bridges span the glow.
    layout: [
      { kind: 'ravine', count: [1, 1] },
      { kind: 'rocks', count: [10, 16], radius: [24, 52] },
      { kind: 'cliff', count: [1, 2] },
    ],
    objective: { kind: 'clear' },
    packs: {
      count: [6, 8], size: [3, 5],
      table: [
        { id: 'fire_cultist', weight: 3 },
        { id: 'volatile_zealot', weight: 3 },
        { id: 'storm_acolyte', weight: 2 },
        { id: 'brute', weight: 2 },
        { id: 'pyre_acolyte', weight: 2 },
        { id: 'voltaic_shade', weight: 1 },
        { id: 'magma_worm', weight: 1 },
        { id: 'warband_chieftain', weight: 1 },
      ],
    },
    exits: [
      { to: 'shaded_thicket', side: 'w' },
      { to: 'pit_lords_lair', side: 'n' },
      { to: '?', side: 'e', tileset: 'cinderlands' },
      { to: 'infernal_rift', side: 's' },
    ],
    waypoint: true,
    map: { x: 348, y: 205 },
  },

  frozen_approach: {
    id: 'frozen_approach', name: 'Frozen Approach',
    level: 6,
    size: { w: 2200, h: 1450 },
    theme: {
      floor: '#0d1216', grid: '#141e26', border: '#365060',
      obstacle: '#2c4250', obstacleEdge: '#4a6e84', accent: '#7ac8e8',
      mud: '#8fb2c4', chasm: '#04070c',
    },
    // Snow drifts (slowing) between windswept cliff lines.
    layout: [
      { kind: 'rocks', count: [8, 14], radius: [22, 44] },
      { kind: 'ice', count: [2, 3] },
      { kind: 'mud', count: [2, 3] },
      { kind: 'cliff', count: [2, 3] },
      { kind: 'chasm', count: [0, 1] },
    ],
    objective: { kind: 'clear' },
    packs: {
      count: [7, 9], size: [3, 6],
      table: [
        { id: 'frost_witch', weight: 3 },
        { id: 'hex_weaver', weight: 2 },
        { id: 'brute', weight: 2 },
        { id: 'storm_acolyte', weight: 2 },
        { id: 'javelin_skirmisher', weight: 2 },
        { id: 'wraith_piper', weight: 1 },
        { id: 'tundra_behemoth', weight: 1 },
      ],
    },
    exits: [
      { to: 'forsaken_graveyard', side: 's' },
      { to: '?', side: 'n', tileset: 'tundra' },
    ],
    waypoint: true,
    map: { x: 175, y: 25 },
  },

  pit_lords_lair: {
    id: 'pit_lords_lair', name: "Pit Lord's Lair",
    level: 7,
    size: { w: 1800, h: 1300 },
    theme: {
      floor: '#170d0d', grid: '#261414', border: '#6c2c24',
      obstacle: '#522420', obstacleEdge: '#84403a', accent: '#ff5050',
      chasm: '#180404',
    },
    layout: [
      { kind: 'ravine', count: [1, 1] },
      { kind: 'cliff', count: [2, 3] },
      { kind: 'rocks', count: [5, 8], radius: [26, 50] },
    ],
    objective: { kind: 'boss', id: 'pit_lord', levelBonus: 1 },
    packs: {
      count: [3, 4], size: [2, 3],
      table: [
        { id: 'brute', weight: 3 },
        { id: 'fire_cultist', weight: 2 },
        { id: 'bone_colossus', weight: 1 },
        { id: 'volatile_zealot', weight: 1 },
      ],
    },
    exits: [
      { to: 'ember_wastes', side: 's' },
      { to: '?', side: 'e', tileset: 'wasteland' },
    ],
    map: { x: 348, y: 115 },
  },

  // The Hollow Vault (the Unmade's arena) is no longer a static node — it is
  // FLOATING-minted by the level-20 quest Q_UNMADE (see quests/defs.ts), which forces
  // layoutType:'unmade_vault' and seals nearby waypoints. The choreography lives in
  // World.updateBoss; the arena layout in levelgen ('unmade_vault').

  // --- The lands that border the hub: hostile factions a step from town, so
  //     the territory/contest/invasion sim has frontiers to ignite from turn one.

  // North of the crossroads: the warband's home ground.
  goblin_warrens: {
    id: 'goblin_warrens', name: 'The Goblin Warrens',
    level: 2,
    size: { w: 2100, h: 1450 },
    theme: {
      floor: '#15120c', grid: '#241d12', border: '#5c4a28',
      obstacle: '#4a3a20', obstacleEdge: '#6e5630', accent: '#a8c84a',
      mud: '#2b2212', wall: '#6a5638',
    },
    layout: [
      { kind: 'rocks', count: [8, 12], radius: [20, 46] },
      { kind: 'camp', count: [2, 2] },
      { kind: 'mud', count: [1, 2] },
      { kind: 'trees', count: [3, 6] },
    ],
    objective: { kind: 'clear' },
    packs: {
      count: [4, 6], size: [3, 5],
      table: [
        { id: 'goblin_skirmisher', weight: 4 },
        { id: 'goblin_brute', weight: 2 },
        { id: 'goblin_shaman', weight: 2 },
        { id: 'orc_ravager', weight: 2 },
        { id: 'goblin_chief', weight: 1 },
      ],
    },
    waypoint: true,
    exits: [
      { to: 'crossroads', side: 's' },
      { to: 'withered_fields', side: 'e', at: 0.35 },
      { to: 'the_marches', side: 'n' },
      { to: '?', side: 'w', tileset: 'deepwood' },
    ],
    map: { x: 60, y: 78 },
  },

  // Southwest of the hub: the gnoll packs' broken country.
  scarred_dens: {
    id: 'scarred_dens', name: 'The Scarred Dens',
    level: 3,
    size: { w: 2200, h: 1500 },
    theme: {
      floor: '#13110c', grid: '#201c12', border: '#4a4228',
      obstacle: '#463c24', obstacleEdge: '#665a38', accent: '#c89a4a',
      mud: '#2b2414',
    },
    layout: [
      { kind: 'rocks', count: [10, 14], radius: [18, 40] },
      { kind: 'camp', count: [1, 2] },
      { kind: 'cliff', count: [1, 2] },
      { kind: 'brush', count: [2, 3] },
    ],
    objective: { kind: 'clear' },
    packs: {
      count: [5, 7], size: [3, 5],
      table: [
        { id: 'gnoll_prowler', weight: 4 },
        { id: 'gnoll_butcher', weight: 2 },
        { id: 'gnoll_longshot', weight: 2 },
        { id: 'gnoll_howler', weight: 1 },
      ],
    },
    exits: [
      { to: 'crossroads', side: 'n', at: 0.35 },
      { to: 'verdant_hollow', side: 'e' },
      { to: '?', side: 's', tileset: 'deepwood' },
      { to: '?', side: 'w', tileset: 'desert' },
    ],
    map: { x: -40, y: 250 },
  },

  // South: the Sylvan court's grove — hostile to gnoll and goblin alike.
  verdant_hollow: {
    id: 'verdant_hollow', name: 'The Verdant Hollow',
    level: 3,
    size: { w: 2100, h: 1500 },
    shape: 'ellipse', biome: 'grove',
    theme: {
      floor: '#0d130d', grid: '#152015', border: '#2e4a2e',
      obstacle: '#26421f', obstacleEdge: '#3f6634', accent: '#7ec850',
      mud: '#1d2b16',
    },
    layout: [
      { kind: 'trees', count: [14, 20], radius: [14, 26] },
      { kind: 'grove', count: [2, 3] },
      { kind: 'camp', count: [1, 1] },
      { kind: 'grass', count: [3, 5] },
      { kind: 'brush', count: [2, 3] },
    ],
    objective: { kind: 'clear' },
    packs: {
      count: [5, 7], size: [2, 4],
      table: [
        { id: 'thorn_sprite', weight: 4 },
        { id: 'sylvan_warden', weight: 2 },
        { id: 'grove_singer', weight: 1 },
        { id: 'briar_beast', weight: 1 },
      ],
    },
    waypoint: true,
    exits: [
      { to: 'scarred_dens', side: 'w' },
      { to: 'shaded_thicket', side: 'n', at: 0.35 },
      { to: '?', side: 's', tileset: 'deepwood' },
      { to: '?', side: 'e', tileset: 'jungle' },
    ],
    map: { x: 120, y: 285 },
  },

  // A hand-authored war border: goblins and the risen dead already at it.
  the_marches: {
    id: 'the_marches', name: 'The Bloodied Marches',
    level: 4,
    size: { w: 2300, h: 1550 },
    theme: {
      floor: '#13120d', grid: '#201e14', border: '#4a4430',
      obstacle: '#46422e', obstacleEdge: '#665f42', accent: '#c8b06b',
      mud: '#332b1a',
    },
    layout: [
      { kind: 'rocks', count: [8, 12], radius: [20, 46] },
      { kind: 'camp', count: [2, 2] },
      { kind: 'ruin', count: [1, 2] },
      { kind: 'mud', count: [2, 3] },
    ],
    objective: { kind: 'clear' },
    factionWar: ['goblin', 'undead'],
    packs: {
      count: [5, 7], size: [3, 5],
      table: [
        { id: 'goblin_skirmisher', weight: 3 },
        { id: 'goblin_brute', weight: 2 },
        { id: 'skeleton_warrior', weight: 3 },
        { id: 'zombie', weight: 2 },
      ],
    },
    exits: [
      { to: 'goblin_warrens', side: 's' },
      { to: 'forsaken_graveyard', side: 'e' },
      { to: '?', side: 'n', tileset: 'tundra' },
      { to: '?', side: 'w', tileset: 'mire' },
    ],
    map: { x: 120, y: 30 },
  },

  // The demon home: a hellish rift, the Infernal Legion's originating ground.
  // An ellipse arena with the 'rift' biome — the demon warlord seats here, and
  // their events and warbands stem from this ground (see FACTION_TRAITS).
  infernal_rift: {
    id: 'infernal_rift', name: 'The Infernal Rift',
    level: 7,
    size: { w: 2600, h: 2600 },
    shape: 'ellipse', biome: 'rift',
    theme: {
      floor: '#1a0808', grid: '#2a0e0e', border: '#7a2020',
      obstacle: '#3a1414', obstacleEdge: '#a03030', accent: '#ff5a3a',
      chasm: '#0a0202', mud: '#2a1010',
    },
    layout: [
      { kind: 'rocks', count: [6, 10], radius: [18, 36] },
      { kind: 'chasm', count: [2, 3] },
      { kind: 'ruin', count: [1, 2] },
      { kind: 'camp', count: [1, 2] },
    ],
    objective: { kind: 'clear' },
    packs: {
      count: [5, 7], size: [3, 5],
      table: [
        { id: 'imp', weight: 3 },
        { id: 'hellhound', weight: 3 },
        { id: 'cinder_fiend', weight: 2 },
        { id: 'searing_spawn', weight: 2 },
        { id: 'dread_fiend', weight: 1 },
      ],
    },
    waypoint: true,
    exits: [
      { to: 'ember_wastes', side: 'n' },
      { to: '?', side: 'e', tileset: 'cinderlands' },
    ],
    map: { x: 420, y: 280 },
  },

  // The original endless arena survives as a place in the world: a wave
  // gauntlet that scales forever, for when the overworld stops hurting.
  the_pit: {
    id: 'the_pit', name: 'The Pit',
    level: 0, // arena monsters take their level from the wave, not the zone
    size: { w: 2300, h: 1550 },
    theme: {
      floor: '#101016', grid: '#1a1a24', border: '#3a3a52',
      obstacle: '#2e2e40', obstacleEdge: '#4a4a66', accent: '#c8a84b',
    },
    layout: [
      { kind: 'rocks', count: [6, 9], radius: [24, 44] },
    ],
    objective: { kind: 'waves', waves: 0 },
    exits: [
      { to: 'crossroads', side: 'n' },
      { to: '?', side: 'e', tileset: 'meadow' },
      { to: '?', side: 'w', tileset: 'peninsula' },
    ],
    map: { x: 50, y: 250 },
  },
};

export const ZONE_LIST: ZoneDef[] = Object.values(ZONES);
