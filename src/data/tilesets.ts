// ---------------------------------------------------------------------------
// TILESETS — the recipes uncharted zones generate from.
//
// A tileset is everything a frontier needs to grow a new place: name parts,
// a terrain palette, a layout of set-piece stamps, a monster pack table, a
// spawner object for siege objectives, and weights over which objective the
// zone rolls. Each frontier portal names its tileset, so the deepwood grows
// past the Shaded Thicket, the tundra past the Frozen Approach, and the
// cinderlands past the Ember Wastes — each line leveling up as it goes.
// ---------------------------------------------------------------------------

import type { CompositionRoll, LandmarkRoll, PackSpec, StampSpec, StructureRoll, ZoneTheme } from './zones';
import type { Rng } from '../core/rng';

export interface ObjectiveWeight {
  kind: 'clear' | 'escape' | 'spawners' | 'waves';
  weight: number;
}

/** A sub-biome flavour within a tileset: a name tag + a full layout override,
 *  rolled per generated zone so two jungles can feel distinct (a "clearing" of
 *  sparse pockets vs a "dense floor" choked with growth). */
export interface TilesetVariant {
  /** Appended to the zone name in parens: "Tangleroot Canopy (clearing)". */
  name: string;
  /** Replaces the tileset's base layout when this variant is rolled. */
  layout: StampSpec[];
  /** THEME overrides merged over the tileset's base theme at mint — a face can
   *  RECOLOR itself (the leyline's pyre/gale/rime/stone elements, a hot-spring
   *  tundra) without a whole sibling tileset. Doodad visuals authored with
   *  'theme:' tokens tint along for free. Absent = the base theme, byte-identical. */
  theme?: Partial<ZoneTheme>;
}

export interface TilesetDef {
  id: string;
  nameFirst: string[];
  nameSecond: string[];
  theme: ZoneTheme;
  sizeW: [number, number];
  sizeH: [number, number];
  layout: StampSpec[];
  packs: PackSpec;
  /** The destructible spawner object 'spawners' objectives place. */
  spawnerId: string;
  objectives: ObjectiveWeight[];
  /** Chance a generated zone from this tileset rolls an ELLIPSE arena (0 = never). */
  ellipseChance?: number;
  /** Biome tag stamped on generated zones — faction-traits home matching. */
  biome?: string;
  /** COMMON rows folded into EVERY rolled layout — base or variant. Variants
   *  say what CHANGES about a zone; common says what the biome always IS
   *  (the brittle-kit lesson: rows wired only into the base layout go dead
   *  the day a tileset grows variants). */
  common?: StampSpec[];
  /** Optional sub-biome variants; one is rolled per generated zone (its layout
   *  replaces the base — common rows ride along regardless). Tilesets without
   *  variants behave exactly as before. */
  variants?: TilesetVariant[];
  /** false = NEVER field-minted at a frontier (realm / cave / incursion-only
   *  tilesets: Fractures capstones, cave mouths, the Eldritch incursion). */
  frontier?: false;
  /** BOUNDLESS arena: the engine streams terrain around the player — no walls,
   *  no perimeter cull (the Descent abyss). */
  boundless?: true;
  /** Force this layout generator id instead of the cave roll (Descent's convex
   *  streamer). */
  forceLayout?: string;
  /** Structure CHANCES zones from this tileset roll (merged with the biome's
   *  at mint; also feeds the bastion-layout candidate pool). */
  structures?: StructureRoll[];
  /** Layout generator knobs (merged with the biome's + the spec's at mint) —
   *  the recipe-tweaking seam (see ZoneDef.layoutParams). */
  layoutParams?: Record<string, unknown>;
  /** Geographic-landmark CHANCES (merged with the biome's at mint). */
  landmarks?: LandmarkRoll[];
  /** Whole-zone COMPOSITION picks (merged with the biome's at mint) —
   *  coordinated clearing/formation/strata bundles (see CompositionRoll). */
  compositions?: CompositionRoll[];
  /** CAVE layout weights: what a cave minted UNDER this tileset rolls for its
   *  generator ('plains' = the classic convex crawl). Absent = the legacy
   *  default (rooms 35% / plains 65%). forceLayout outranks this. */
  caveLayouts?: Record<string, number>;
}

export const TILESETS: Record<string, TilesetDef> = {

  deepwood: {
    id: 'deepwood',
    compositions: [{ composition: 'fairy_court', chance: 0.22 }],
    variants: [
      { name: 'sunlit glade', layout: [
        { kind: 'trees', count: [8, 12] }, { kind: 'grove', count: [3, 4] },
        { kind: 'grass', count: [5, 8] }, { kind: 'brush', count: [3, 5] },
        { kind: 'rocks', count: [3, 6], radius: [18, 34] }, { kind: 'river', count: [0, 1] },
        { kind: 'camp', count: [0, 1] },
        { kind: 'structure', count: [0, 1], structure: 'wayside_camp' },
      ] },
      { name: 'twilight thicket', layout: [
        { kind: 'trees', count: [18, 26] }, { kind: 'grove', count: [3, 5] },
        { kind: 'brush', count: [4, 7] }, { kind: 'thicket', count: [2, 4] },
        { kind: 'vines', count: [1, 3] }, { kind: 'bog', count: [1, 2] },
        { kind: 'swamp', count: [1, 2] }, { kind: 'rocks', count: [4, 8], radius: [18, 34] },
        { kind: 'cliff', count: [2, 3] },
      ] },
    ],
    nameFirst: ['Gloomwood', 'Brierwood', 'Mossdark', 'Thornveil', 'Murkroot', 'Feywild', 'Duskbough', 'Tanglewood', 'Shadowmoss', 'Rootdark', 'Witchwood', 'Nightroot', 'Bramblewick', 'Grimwillow', 'Eldergloom', 'Owlmurk', 'Fenshadow', 'Mistbriar'],
    nameSecond: ['Hollow', 'Reach', 'Warrens', 'Glade', 'Crossing', 'Depths', 'Thicket', 'Tangle', 'Shade', 'Boughs', 'Hush', 'Snarl', 'Covert', 'Verge', 'Stand', 'Underwood'],
    theme: {
      // The GROVE floor flourishes — greens over greens, barely any black
      // (palette + light bias) — while its NIGHTS run forest-deep. The floor
      // SAMPLES BY POSITION too: banks darken wet toward every water/bog
      // margin, and the gaps between crowns glow — real clearings.
      ground: {
        palette: ['#101f0d', '#173015', '#20421c', '#2b5424', '#38662e'], bias: 0.58, alpha: 0.55,
        coast: { reach: 85, shift: -0.35, kinds: ['water', 'deep_water', 'bog', 'swamp'] },
        clearing: { reach: 130, lift: 0.3 },
      },
      nightDark: 0.78,
      // LIVING FOG (engine/fog.ts): roaming banks replace the old static
      // fog_bank doodads — the same veil, but now it moves and you move with it.
      fog: { banks: [1, 2], kinds: [{ id: 'mist' }] },
      floor: '#0d150c', grid: '#142112', border: '#2a452a',
      obstacle: '#223c1c', obstacleEdge: '#3a6030', accent: '#8ed45e',
      mud: '#1b2914', chasm: '#030703', water: '#173a4a', wall: '#46371f',
    },
    sizeW: [2400, 3400], sizeH: [1600, 2400], ellipseChance: 0.25, biome: 'grove',
    layout: [
      { kind: 'log', count: [2, 4] }, { kind: 'stump', count: [1, 3] }, { kind: 'mushroom_ring', count: [0, 1] },
      { kind: 'charcoal_mound', count: [0, 1] },
      { kind: 'conifers', count: [6, 10] }, { kind: 'ancient_tree', count: [1, 3] },
      { kind: 'trees', count: [14, 20], radius: [14, 28] },
      { kind: 'grove', count: [2, 4] },
      { kind: 'brush', count: [2, 4] },
      { kind: 'fern', count: [2, 4] }, { kind: 'berry_bush', count: [0, 2] },
      { kind: 'grass', count: [3, 5] },
      { kind: 'rocks', count: [5, 9], radius: [18, 34] },
      { kind: 'cliff', count: [2, 3] },
      { kind: 'river', count: [0, 1] },
      { kind: 'bog', count: [1, 2] },
      { kind: 'swamp', count: [1, 2] },
      { kind: 'ruin', count: [1, 2] },
      { kind: 'camp', count: [0, 1] },
      { kind: 'structure', count: [0, 1], structure: 'wayside_camp' },
    ],
    // Sunlit or twilit, the deep forest always rots below and thorns always
    // find purchase: the fungal + thorn kit rides every variant.
    common: [
      { kind: 'burst_sac', count: [0, 2] },
      { kind: 'puffcap_cluster', count: [0, 2] },
      { kind: 'briarwood', count: [1, 3] },
    ],
    packs: {
      count: [5, 8], size: [3, 5],
      // Presence-banded end to end: the young wood is mites, shamblers and
      // prowlers; the deep wood sends wardens, chieftains and old hunters.
      table: [
        { id: 'spitting_horror', weight: 3 },
        { id: 'dune_stalker', weight: 3 },
        { id: 'blood_mite', weight: 2, presence: { to: 16, fadeOut: 8 } },
        { id: 'bone_serpent', weight: 2, presence: { from: 10, fadeIn: 4 } },
        { id: 'zombie', weight: 2, presence: { to: 20, fadeOut: 10 } },
        { id: 'skeleton_archer', weight: 2, presence: { to: 24, fadeOut: 12 } },
        { id: 'gloom_stalker', weight: 2, presence: { from: 6, fadeIn: 3 } },
        { id: 'crypt_warden', weight: 2, presence: { from: 8, fadeIn: 4 } },
        { id: 'fen_hound', weight: 2, presence: { to: 16, fadeOut: 8 } },
        { id: 'gnoll_prowler', weight: 2 },
        { id: 'gnoll_butcher', weight: 1, presence: { from: 5, fadeIn: 3 } },
        { id: 'thorn_sprite', weight: 2, presence: { to: 20, fadeOut: 10 } },
        { id: 'sylvan_warden', weight: 1 },
        { id: 'briar_beast', weight: 1, presence: { from: 9, fadeIn: 4 } },
        { id: 'alpha_stalker', weight: 1, presence: { from: 10, fadeIn: 5 } },
        { id: 'hex_weaver', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'warband_chieftain', weight: 1, presence: { from: 12, fadeIn: 5 } },
        { id: 'brute', weight: 1, presence: { from: 6, fadeIn: 3 } },
        // The treant line walks the old woods (presence-banded: saplings in
        // the young reaches, elders only where the forest runs deep).
        { id: 'sylvan_sapling', weight: 2, presence: { to: 12, fadeOut: 5 } },
        { id: 'twig_snarl', weight: 2, presence: { from: 4, fadeIn: 2, to: 22, fadeOut: 9 } },
        { id: 'treant_warden', weight: 2, presence: { from: 11, fadeIn: 5 } },
        { id: 'root_snarl', weight: 1, presence: { from: 9, fadeIn: 4 } },
        { id: 'elder_treant', weight: 1, presence: { from: 20, fadeIn: 8 } },
        // The old wood's own hunters: wolves and the patient silk.
        { id: 'dire_wolf', weight: 2, presence: { from: 8, fadeIn: 4 } },
        { id: 'moon_howler', weight: 1, presence: { from: 10, fadeIn: 5 } },
        { id: 'orb_weaver', weight: 1, presence: { from: 6, fadeIn: 3 } },
        { id: 'widow_matron', weight: 1, presence: { from: 12, fadeIn: 5 } },
        // Some of the trees are wearing something.
        { id: 'root_wraith', weight: 2, presence: { from: 8, fadeIn: 4 } },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [
      { kind: 'clear', weight: 3 },
      { kind: 'escape', weight: 2 },
      { kind: 'spawners', weight: 2 },
      { kind: 'waves', weight: 1 },
    ],
    structures: [
      { structure: 'walled_manor', chance: 0.18 },
    ],
  },

  // THE FOREST — the deep wood proper. Where the deepwood/grove is open
  // woodland you see across, the forest is a CANOPY: the 'forest' layout
  // recipe (biome allowedLayouts) plants veiled walk-under masses whose
  // coverage scales with geo.biomeDepth — a fringe zone breathes, the
  // region's heart is a near-sealed roof you must move UNDER to see into.
  // Trails read as beaten earth (theme.road drives the road kind's color),
  // clearings are the sun-wells where the decoration pools. The tileset's
  // own layout rows are only the FURNITURE — the recipe grows the trees.
  forest: {
    id: 'forest',
    compositions: [{ composition: 'orchard_rows', chance: 0.22 }],
    nameFirst: ['Heartwood', 'Oldgrowth', 'Deepbough', 'Greenholt', 'Oakenshade', 'Wildewood', 'Timberdark', 'Highcanopy', 'Fernbrake', 'Mossmantle', 'Broadleaf', 'Elderbough', 'Longshade', 'Hartswood', 'Boughlock', 'Greenvault'],
    nameSecond: ['Forest', 'Canopy', 'Wilds', 'Fastness', 'Timberland', 'Understory', 'Greenwood', 'Woodland', 'Heart', 'Vaults', 'Eaves', 'Roof'],
    theme: {
      // Brighter, warmer greens than the deepwood's twilight — this wood is
      // ALIVE overhead; the dark comes from the roof, not the floor. Clearing
      // lift runs strong (real sun-wells); banks still darken toward water.
      ground: {
        palette: ['#122408', '#1b3a12', '#26501b', '#357024', '#478c30'], bias: 0.6, alpha: 0.55,
        coast: { reach: 85, shift: -0.35, kinds: ['water', 'deep_water', 'bog', 'swamp'] },
        clearing: { reach: 150, lift: 0.34 },
      },
      nightDark: 0.76,
      fog: { banks: [1, 2], kinds: [{ id: 'mist', weight: 2 }, { id: 'river_mist' }] },
      floor: '#0f1a0c', grid: '#152413', border: '#2c4a28',
      obstacle: '#254220', obstacleEdge: '#3e6a34', accent: '#9ade66',
      mud: '#1d2b15', chasm: '#040804', water: '#1a3e4e', wall: '#4a3a22',
      // Game trails: the road kind reads THIS — beaten forest earth, not gravel.
      road: '#4a3d28',
      // Common crowns ride the theme green; forest_oak keeps its own deeper
      // literal so the sealed roof reads as a distinct mass among the trees.
      tree: '#2b5220',
    },
    sizeW: [2800, 4000], sizeH: [2000, 2800], ellipseChance: 0.2, biome: 'forest',
    // FURNITURE ONLY — the forest recipe plants the canopy/trails/understory;
    // these rows findSpot into whatever the roof leaves open, so rocks, ruins
    // and camps pool in the clearings by themselves.
    layout: [
      { kind: 'log', count: [2, 5] }, { kind: 'stump', count: [2, 4] },
      { kind: 'flowers', count: [1, 3] }, { kind: 'grass', count: [3, 6] },
      { kind: 'mushroom_ring', count: [0, 1] },
      { kind: 'charcoal_mound', count: [0, 1] }, { kind: 'wayshrine', count: [0, 1] },
      { kind: 'rocks', count: [3, 6], radius: [18, 32] },
      { kind: 'river', count: [0, 1] },
      { kind: 'bog', count: [0, 1] },
      { kind: 'ruin', count: [0, 2] },
      { kind: 'camp', count: [0, 1] },
      { kind: 'structure', count: [0, 1], structure: 'wayside_camp' },
    ],
    // Whatever variant rolls, the deep wood always rots below, thorns always
    // find purchase, and something always webs the dark. COMMON is the one
    // list every mint runs (a rolled variant REPLACES the base layout), and
    // it runs FIRST — so the glades reserve before any variant's scatter.
    common: [
      // True GLADES: reserved sun-wells the furniture pools around (the
      // clearing-lift palette already brightens them — now they stay open).
      { kind: 'clearing', count: [1, 2], radius: [110, 180] },
      { kind: 'burst_sac', count: [0, 2] },
      { kind: 'puffcap_cluster', count: [0, 1] },
      { kind: 'briarwood', count: [1, 2] },
      // An old field line the forest swallowed.
      { kind: 'formation', count: [0, 1], formation: 'oak_hedgerow' },
    ],
    variants: [
      // Sun-dappled fringe: more clearing furniture, lighter rot.
      { name: 'sun-dappled', layout: [
        { kind: 'log', count: [2, 4] }, { kind: 'stump', count: [1, 3] },
        { kind: 'flowers', count: [2, 4] }, { kind: 'grass', count: [5, 8] },
        { kind: 'rocks', count: [3, 6], radius: [18, 32] },
        { kind: 'river', count: [0, 1] },
        { kind: 'camp', count: [0, 1] },
        { kind: 'structure', count: [0, 1], structure: 'wayside_camp' },
      ] },
      // Briar-snarled: the understory fights back.
      { name: 'briar-snarled', layout: [
        { kind: 'log', count: [2, 4] }, { kind: 'stump', count: [2, 4] },
        { kind: 'thicket', count: [2, 4] }, { kind: 'vines', count: [1, 3] },
        { kind: 'mushroom_ring', count: [0, 1] },
        { kind: 'rocks', count: [3, 5], radius: [18, 30] },
        { kind: 'bog', count: [0, 1] },
        { kind: 'ruin', count: [0, 1] },
      ] },
    ],
    packs: {
      count: [5, 8], size: [3, 5],
      // The sylvan court's own wood, banded end to end: saplings and sprites
      // in the young fringe; wardens, wolves and the Horned Tribes in the
      // middle depths; elders and the werewolf dark where the roof seals.
      table: [
        { id: 'sylvan_sapling', weight: 3, presence: { to: 12, fadeOut: 5 } },
        { id: 'twig_snarl', weight: 3, presence: { from: 3, fadeIn: 2, to: 24, fadeOut: 9 } },
        { id: 'thorn_sprite', weight: 2, presence: { to: 20, fadeOut: 10 } },
        { id: 'thicket_stalker', weight: 2, presence: { to: 18, fadeOut: 8 } },
        { id: 'will_o_wisp', weight: 1, presence: { to: 14, fadeOut: 6 } },
        { id: 'gloomling', weight: 1, presence: { from: 4, fadeIn: 2, to: 20, fadeOut: 8 } },
        { id: 'sylvan_warden', weight: 2 },
        { id: 'grove_singer', weight: 1, presence: { from: 6, fadeIn: 3 } },
        { id: 'gloom_stalker', weight: 2, presence: { from: 5, fadeIn: 3 } },
        { id: 'dire_wolf', weight: 3, presence: { from: 6, fadeIn: 3 } },
        { id: 'moon_howler', weight: 1, presence: { from: 9, fadeIn: 5 } },
        { id: 'orb_weaver', weight: 1, presence: { from: 6, fadeIn: 3 } },
        { id: 'widow_matron', weight: 1, presence: { from: 12, fadeIn: 5 } },
        { id: 'treant_warden', weight: 2, presence: { from: 10, fadeIn: 5 } },
        { id: 'root_snarl', weight: 2, presence: { from: 8, fadeIn: 4 } },
        { id: 'briar_beast', weight: 1, presence: { from: 9, fadeIn: 4 } },
        { id: 'beastkin_gorer', weight: 2, presence: { from: 8, fadeIn: 4 } },
        { id: 'beastkin_impaler', weight: 1, presence: { from: 10, fadeIn: 4 } },
        { id: 'beastkin_ritualist', weight: 1, presence: { from: 12, fadeIn: 5 } },
        { id: 'alpha_stalker', weight: 1, presence: { from: 10, fadeIn: 5 } },
        { id: 'werewolf', weight: 1, presence: { from: 14, fadeIn: 6 } },
        { id: 'elder_treant', weight: 1, presence: { from: 18, fadeIn: 8 } },
        // The trees are watching. Some of them are walking.
        { id: 'root_wraith', weight: 3, presence: { from: 7, fadeIn: 4 } },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [
      { kind: 'clear', weight: 3 },
      { kind: 'escape', weight: 2 },
      { kind: 'spawners', weight: 1 },
      { kind: 'waves', weight: 1 },
    ],
    structures: [
      { structure: 'walled_manor', chance: 0.12 },
      { structure: 'watchtower', chance: 0.15 },
    ],
  },

  // THE GLOAMWOOD — the HAUNTED forest: the same sealed knitting roof gone
  // grey and crooked, under a sun that never quite arrives (dayLight 0.55 —
  // noon is dusk here; night goes near-black). Its weather is the LIVING
  // FOG: gloam-shrouds swallow whole clearings and the wood's dead drink
  // them (mistfed), so the murk is territory — bait them out, or ride the
  // same banks veiled. Crofts nobody tends, courts where sentences still
  // hang, crows that see you long before you see them.
  gloamwood: {
    id: 'gloamwood',
    compositions: [
      { composition: 'hangmans_hill', chance: 0.35 },
      { composition: 'witchs_croft', chance: 0.35 },
    ],
    nameFirst: ['Gloamwood', 'Duskhollow', 'Ravenmourn', 'Widowshade', 'Hangmans', 'Palegrove', 'Mourning', 'Shrouded', 'Witchlight', 'Hollowmoor', 'Blackbough', 'Grimhallow', 'Candlewake', 'Nightbriar', 'Sorrowfen', 'Cinderveil', 'Wolfsvigil', 'Lanternlost'],
    nameSecond: ['Weald', 'Hollow', 'Thicket', 'Copse', 'Vale', 'Reach', 'Crossing', 'Wood', 'Glen', 'Bourne', 'Shade', 'Warren', 'Mile', 'Parish', 'Vigil', 'Acre'],
    theme: {
      // Perpetual dusk: the noon lift barely arrives; nights sink near-black.
      dayLight: 0.55,
      nightDark: 0.86,
      heat: 0.35,
      // The wood's own weather: tall coiling shrouds the dead drink, grave
      // pools among the stones, river-mist where the water runs.
      fog: { banks: [2, 4], kinds: [{ id: 'gloam_shroud', weight: 2 }, { id: 'grave_mist' }, { id: 'river_mist' }] },
      ground: {
        // Grey-green loam under leaf-rot: desaturated, dark-biased; the
        // clearing lift stays WAN — gaps read as paler gloom, never sun.
        palette: ['#101410', '#161c17', '#1d241c', '#242e24', '#31402f', '#4a5a44'],
        bias: 0.44, alpha: 0.5, strength: 1.05,
        clearing: { reach: 150, lift: 0.22 },
      },
      ambientFx: [{ kind: 'motes', color: '#9ab0a0', intensity: 0.7 }],
      floor: '#0c100c', grid: '#131a14', border: '#2c3a30',
      obstacle: '#2e4030', obstacleEdge: '#4d6a50', accent: '#a8e0b0',
      mud: '#1a2216', chasm: '#040704', water: '#14303a', wall: '#3a3226',
      tree: '#2b3b33', grass: '#3c4a38',
      // Trails read as bare cold earth, not gravel.
      road: '#463c2c',
    },
    sizeW: [2600, 3800], sizeH: [1900, 2700], ellipseChance: 0.2, biome: 'gloamwood',
    // FURNITURE ONLY — the forest recipe plants the crooked roof (the gloam
    // tree mix rides the BIOME's layoutParams); these rows pool into
    // whatever the crowns leave open.
    layout: [
      { kind: 'dead_tree', count: [3, 6] },
      { kind: 'log', count: [2, 4] }, { kind: 'stump', count: [2, 4] },
      { kind: 'web', count: [1, 3] },
      { kind: 'tombstone', count: [3, 7] },
      { kind: 'wayshrine', count: [0, 1] }, { kind: 'signpost', count: [0, 1] },
      { kind: 'rocks', count: [3, 6], radius: [18, 32] },
      { kind: 'river', count: [0, 1] },
      { kind: 'bog', count: [0, 1] },
      { kind: 'ruin', count: [0, 2] },
    ],
    // Whatever face it shows: gloom-glades reserved first, a lantern someone
    // STILL carves, old bones, urns, briars — and somewhere, cages.
    common: [
      { kind: 'clearing', count: [1, 2], radius: [100, 170] },
      { kind: 'jack_o_lantern', count: [1, 3] },
      { kind: 'bone_pile', count: [1, 3] },
      { kind: 'burial_urn', count: [0, 2] },
      { kind: 'briarwood', count: [1, 2] },
      { kind: 'formation', count: [0, 1], formation: 'gibbet_lane' },
    ],
    variants: [
      // The tended dead: rows under the crooked roof — the parish that
      // stayed to keep its yard.
      { name: 'hallowed yard', layout: [
        { kind: 'tombstone', count: [10, 16] },
        { kind: 'formation', count: [2, 3], formation: 'gravestone_rows' },
        { kind: 'weathered_statue', count: [1, 2] },
        { kind: 'black_obelisk', count: [0, 1] },
        { kind: 'dead_tree', count: [2, 4] },
        { kind: 'rocks', count: [2, 4], radius: [16, 28] },
        { kind: 'ruin', count: [0, 1] },
      ] },
      // The sentence mile: the road the wood judges you on.
      { name: "hangman's reach", layout: [
        { kind: 'formation', count: [1, 2], formation: 'gibbet_lane' },
        { kind: 'gallows', count: [0, 1] },
        { kind: 'dead_tree', count: [3, 6] },
        { kind: 'web', count: [1, 3] },
        { kind: 'rocks', count: [2, 5], radius: [16, 30] },
        { kind: 'ruin', count: [0, 1] },
        { kind: 'broken_cart', count: [0, 1] },
      ] },
      // Witchlight: the crofts — the cute face of the wrongness.
      { name: 'witchlight', layout: [
        { kind: 'formation', count: [1, 2], formation: 'pumpkin_rows' },
        { kind: 'jack_o_lantern', count: [2, 5] },
        { kind: 'scarecrow', count: [1, 2] },
        { kind: 'hay_bale', count: [1, 3] },
        { kind: 'mushroom_ring', count: [0, 1] },
        { kind: 'river', count: [0, 1] },
        { kind: 'rocks', count: [2, 4], radius: [16, 28] },
      ] },
    ],
    packs: {
      count: [5, 8], size: [3, 5],
      // Duskwood end to end: crows and shamblers on the fringe; wolves,
      // thralls and hags in the middle depths; weres, wights, the banshee
      // and the Rider where the roof seals.
      table: [
        { id: 'carrion_crow', weight: 3, presence: { to: 20, fadeOut: 10 } },
        { id: 'gloomling', weight: 2, presence: { to: 16, fadeOut: 8 } },
        { id: 'zombie', weight: 2, presence: { to: 18, fadeOut: 9 } },
        { id: 'skeleton_warrior', weight: 1, presence: { to: 20, fadeOut: 10 } },
        { id: 'hollow_lantern', weight: 2 },
        { id: 'dire_wolf', weight: 3, presence: { from: 4, fadeIn: 2 } },
        { id: 'moon_howler', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'grave_hag', weight: 2, presence: { from: 6, fadeIn: 3 } },
        { id: 'vampire_thrall', weight: 1, presence: { from: 9, fadeIn: 4 } },
        { id: 'crimson_bat', weight: 2, presence: { to: 22, fadeOut: 10 } },
        { id: 'orb_weaver', weight: 1, presence: { from: 6, fadeIn: 3 } },
        { id: 'widow_matron', weight: 1, presence: { from: 12, fadeIn: 5 } },
        { id: 'poltergeist', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'werewolf', weight: 2, presence: { from: 11, fadeIn: 5 } },
        { id: 'barrow_wight', weight: 1, presence: { from: 10, fadeIn: 5 } },
        { id: 'banshee', weight: 1, presence: { from: 13, fadeIn: 6 } },
        { id: 'dusk_rider', weight: 1, presence: { from: 12, fadeIn: 6 } },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [
      { kind: 'clear', weight: 3 },
      { kind: 'escape', weight: 2 },
      { kind: 'spawners', weight: 1 },
      { kind: 'waves', weight: 1 },
    ],
    structures: [
      { structure: 'pillaged_township', chance: 0.15 },
      { structure: 'watchtower', chance: 0.1 },
    ],
  },

  // THE TAIGA — the winter FOREST: where the tundra is open and howling,
  // the taiga is close and hushed — dense conifer stands you disappear
  // beneath, standing drifts, frozen pools, firewood caches of travelers
  // who never came back, and the aurora breathing over the dark.
  taiga: {
    id: 'taiga',
    // The frost hollow reads the BAKED climate: it grows where the world map
    // actually runs cold and skips the taiga's warm frontier — the same
    // tileset, different dress by geography.
    compositions: [{ composition: 'frost_hollow', chance: 0.4 }, { composition: 'stone_sanctum', chance: 0.16 }],
    nameFirst: ['Silent', 'Whitewood', 'Frostpine', 'Snowveil', 'Winterdeep', 'Rimewood', 'Palegrove', 'Hoarwood', 'Stillfall', 'Coldbough', 'Evergloam', 'Firshadow', 'Icebough', 'Drifthollow'],
    nameSecond: ['Taiga', 'Firwood', 'Pines', 'Timberland', 'Woods', 'Stands', 'Thickets', 'Wilds', 'Forest', 'Boughs', 'Snowwood', 'Hollow'],
    theme: {
      nightDark: 0.74,
      heat: 0,
      ground: { scale: 1.6, strength: 0.85, speckles: 0.9 },
      ambientFx: [{ kind: 'aurora' }],
      fog: { banks: [1, 2], kinds: [{ id: 'mist' }] },
      floor: '#101820', grid: '#16222c', border: '#2f4a56',
      obstacle: '#263c48', obstacleEdge: '#41667a', accent: '#9adcc8',
      mud: '#8aa8ba', chasm: '#03060b', water: '#1a3e54', wall: '#3a4854',
      tree: '#1c3a30', grass: '#4a6a5c',
    },
    sizeW: [2400, 3400], sizeH: [1600, 2400], ellipseChance: 0.2, biome: 'taiga',
    layout: [
      // NEGATIVE SPACE first: a snow-glade the whole scatter flows around.
      { kind: 'clearing', count: [1, 2], radius: [100, 170] },
      { kind: 'conifers', count: [20, 30] },
      { kind: 'ancient_tree', count: [0, 2] },
      // Drifts bank in wind-combed PATCHES (noise strata), not confetti.
      { kind: 'snowdrift', count: [7, 12], where: { field: 'noise', max: 0.47, params: { scale: 520 } } },
      { kind: 'ice', count: [3, 5] },
      { kind: 'ice_spike', count: [3, 6] },
      // The windbreak line + a frost-heave arc — composed set-pieces.
      { kind: 'formation', count: [1, 2], formation: 'windrow_pines' },
      { kind: 'formation', count: [0, 1], formation: 'ice_teeth' },
      // Extra drift where the WORLD runs cold (the baked climate axis): the
      // taiga's frigid heart banks deeper snow than its mild frontier.
      { kind: 'snowdrift', count: [0, 2], where: { field: 'climate', params: { axis: 'temperature' }, max: 0.42 } },
      { kind: 'dead_tree', count: [1, 3] },
      { kind: 'rocks', count: [6, 10], radius: [20, 40] },
      { kind: 'cairn', count: [0, 2] }, { kind: 'boulder_field', count: [0, 1] },
      { kind: 'scree', count: [1, 2] }, { kind: 'berry_bush', count: [0, 1] },
      { kind: 'brush', count: [2, 4] },
      { kind: 'cliff', count: [1, 3] },
      { kind: 'river', count: [0, 1] },
      { kind: 'firewood_pile', count: [1, 3] },
      { kind: 'signpost', count: [0, 2] },
      { kind: 'snowman', count: [0, 1] },
      { kind: 'ruin', count: [0, 1] },
      { kind: 'camp', count: [0, 1] },
      // Brittle ice fangs — shatter when brushed.
      { kind: 'icicle_cluster', count: [1, 3] },
    ],
    packs: {
      count: [6, 9], size: [3, 6],
      table: [
        { id: 'pain_hound', weight: 3 },
        { id: 'alpha_stalker', weight: 2, presence: { from: 8, fadeIn: 4 } },
        { id: 'gloom_stalker', weight: 2, presence: { from: 5, fadeIn: 3 } },
        { id: 'frost_witch', weight: 2, presence: { from: 6, fadeIn: 3 } },
        { id: 'husk_swarmer', weight: 2, presence: { to: 18, fadeOut: 8 } },
        { id: 'tundra_behemoth', weight: 2, presence: { from: 12, fadeIn: 5 } },
        { id: 'hex_weaver', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'lich_marshal', weight: 1, presence: { from: 15, fadeIn: 6 } },
        // Horned Tribe hunting parties range the winter woods.
        { id: 'beastkin_gorer', weight: 2, presence: { from: 6, fadeIn: 3 } },
        { id: 'beastkin_impaler', weight: 2, presence: { from: 8, fadeIn: 4 } },
        { id: 'beastkin_ritualist', weight: 1, presence: { from: 12, fadeIn: 5 } },
        // The bloodier packs — and what runs with them under a full moon.
        { id: 'dire_wolf', weight: 2, presence: { from: 5, fadeIn: 3 } },
        { id: 'moon_howler', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'werewolf', weight: 1, presence: { from: 12, fadeIn: 5 } },
      ],
    },
    spawnerId: 'rime_stone',
    objectives: [
      { kind: 'clear', weight: 3 },
      { kind: 'spawners', weight: 2 },
      { kind: 'waves', weight: 1 },
    ],
  },

  tundra: {
    id: 'tundra',
    compositions: [{ composition: 'frost_hollow', chance: 0.4 }],
    nameFirst: ['Frostbitten', 'Howling', 'Pale', 'Glacial', 'Whitemourn', 'Rimebound', 'Frostfell', 'Hoarfrost', 'Bitterwind', 'Snowbound', 'Wintermourn', 'Bleakhold', 'Sleetborn', 'Coldcairn', 'Stormriven', 'Frostshard', 'Iceveil', 'Numbing'],
    nameSecond: ['Expanse', 'Steppes', 'Wastes', 'Drifts', 'Pass', 'Fields', 'Tundra', 'Floes', 'Hollow', 'Verge', 'Barrens', 'Plateau', 'Hinterland', 'Snowfields', 'Reach', 'Tarn'],
    theme: {
      dayLight: 1.12,
      heat: 0.05,
      ground: { scale: 1.9, strength: 0.9, speckles: 0.7 },
      fog: { banks: [1, 2], kinds: [{ id: 'mist' }] },
      floor: '#0c1115', grid: '#131c24', border: '#33505f',
      obstacle: '#2a4150', obstacleEdge: '#487086', accent: '#8ed0ec',
      mud: '#93b6c8', chasm: '#03060b', water: '#1c4258', wall: '#3e4c58',
    },
    sizeW: [2600, 3600], sizeH: [1700, 2500], ellipseChance: 0.3, biome: 'tundra',
    layout: [
      { kind: 'snowdrift', count: [5, 9], where: { field: 'noise', max: 0.47, params: { scale: 640, seed: 3 } } },
      { kind: 'geyser', count: [0, 2] }, { kind: 'dead_tree', count: [1, 3] },
      { kind: 'conifers', count: [8, 14] },
      { kind: 'rocks', count: [8, 14], radius: [22, 46] },
      { kind: 'cairn', count: [1, 2] }, { kind: 'scree', count: [1, 3] },
      { kind: 'boulder_field', count: [0, 1] },
      { kind: 'ice', count: [2, 4] },
      { kind: 'mud', count: [3, 4] },
      { kind: 'cliff', count: [2, 4] },
      { kind: 'river', count: [0, 1] },
      // Frozen MARGINS: extra ice hugging whatever channel the river cut
      // (order matters — the shore field reads the water above; a riverless
      // roll leaves the band empty and the base ice entry still delivers).
      { kind: 'ice', count: [1, 2], where: { field: 'shore', max: 0.5, params: { kinds: ['water'] } } },
      { kind: 'chasm', count: [0, 1] },
      // An old rockslide strung downslope + frost-heave teeth.
      { kind: 'formation', count: [0, 1], formation: 'boulder_train' },
      { kind: 'formation', count: [1, 2], formation: 'ice_teeth' },
      { kind: 'ruin', count: [0, 1] },
      { kind: 'camp', count: [0, 1] },
      { kind: 'icicle_cluster', count: [2, 4] },
    ],
    packs: {
      count: [6, 9], size: [3, 6],
      table: [
        { id: 'frost_witch', weight: 3 },
        { id: 'hex_weaver', weight: 2, presence: { from: 8, fadeIn: 4 } },
        { id: 'husk_swarmer', weight: 2, presence: { to: 18, fadeOut: 8 } },
        { id: 'javelin_skirmisher', weight: 2, presence: { to: 22, fadeOut: 10 } },
        { id: 'brute', weight: 2 },
        { id: 'zombie', weight: 2, presence: { to: 16, fadeOut: 8 } },
        { id: 'tundra_behemoth', weight: 1, presence: { from: 12, fadeIn: 5 } },
        { id: 'lich_marshal', weight: 1, presence: { from: 15, fadeIn: 6 } },
        { id: 'storm_acolyte', weight: 1, presence: { from: 6, fadeIn: 3 } },
        { id: 'frost_elemental', weight: 2 },
        { id: 'gale_elemental', weight: 2 },
        // The white wake under the drifts — and the angler in the cracks.
        { id: 'snow_swimmer', weight: 2, presence: { from: 4, fadeIn: 2 } },
        { id: 'void_angler', weight: 1, presence: { from: 8, fadeIn: 4 } },
        // Horned Tribe raiders range even the white wastes.
        { id: 'beastkin_gorer', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'stone_sentinel', weight: 1, presence: { from: 10, fadeIn: 5 } },
        { id: 'fen_hound', weight: 2, presence: { to: 14, fadeOut: 7 } },
        { id: 'alpha_stalker', weight: 1, presence: { from: 10, fadeIn: 5 } },
        { id: 'troll_mauler', weight: 1, presence: { from: 9, fadeIn: 5 } },
      ],
    },
    spawnerId: 'rime_stone',
    objectives: [
      { kind: 'clear', weight: 3 },
      { kind: 'escape', weight: 2 },
      { kind: 'spawners', weight: 2 },
      { kind: 'waves', weight: 1 },
    ],
  },

  cinderlands: {
    id: 'cinderlands',
    nameFirst: ['Cinder', 'Ashen', 'Smoldering', 'Charred', 'Molten', 'Sootveil', 'Emberfall', 'Ashfall', 'Scorchwind', 'Cindergrey', 'Smokeveil', 'Ashmoor', 'Pyreborn', 'Charwood', 'Embergloom', 'Slagborn', 'Sootfall', 'Burning'],
    nameSecond: ['Barrens', 'Flats', 'Scar', 'Caldera', 'Expanse', 'Fields', 'Wastes', 'Ashlands', 'Cinders', 'Smolder', 'Drift', 'Scorch', 'Pyre', 'Hollow', 'Reach', 'Char'],
    theme: {
      heat: 0.95,
      ambientFx: [{ kind: 'heatHaze', intensity: 0.5, color: '#ffd0a0' }],
      ground: { scale: 1.5, stretchX: 1.3, strength: 1.2, speckles: 0.8 },
      floor: '#150e0a', grid: '#221510', border: '#5c3824',
      obstacle: '#47291c', obstacleEdge: '#7a452c', accent: '#ff9650',
      mud: '#2b1d12', chasm: '#1b0703', wall: '#54382a',
    },
    sizeW: [2500, 3500], sizeH: [1600, 2400], ellipseChance: 0.35, biome: 'rift',
    layout: [
      { kind: 'ravine', count: [1, 1] },
      { kind: 'rocks', count: [10, 18], radius: [22, 50] },
      { kind: 'cliff', count: [1, 3] },
      { kind: 'mud', count: [1, 3] },
      { kind: 'ruin', count: [0, 2] },
      { kind: 'camp', count: [1, 2] },
    ],
    packs: {
      count: [6, 8], size: [3, 5],
      table: [
        { id: 'fire_cultist', weight: 3 },
        { id: 'volatile_zealot', weight: 3, presence: { from: 5, fadeIn: 3 } },
        { id: 'magma_worm', weight: 2, presence: { from: 8, fadeIn: 4 } },
        { id: 'pyroclast_magus', weight: 2, presence: { from: 10, fadeIn: 4 } },
        { id: 'storm_acolyte', weight: 2, presence: { to: 20, fadeOut: 10 } },
        { id: 'brute', weight: 2, presence: { to: 18, fadeOut: 9 } },
        { id: 'bone_colossus', weight: 1, presence: { from: 14, fadeIn: 6 } },
        { id: 'warband_chieftain', weight: 1, presence: { from: 12, fadeIn: 5 } },
        { id: 'spitting_horror', weight: 1, presence: { to: 14, fadeOut: 7 } },
        { id: 'ember_elemental', weight: 3 },
        { id: 'gale_elemental', weight: 1, presence: { to: 16, fadeOut: 8 } },
        { id: 'orc_ravager', weight: 2 },
        { id: 'gnoll_longshot', weight: 1 },
        { id: 'gnoll_howler', weight: 1 },
      ],
    },
    spawnerId: 'ember_rift',
    objectives: [
      { kind: 'clear', weight: 2 },
      { kind: 'escape', weight: 2 },
      { kind: 'spawners', weight: 3 },
      { kind: 'waves', weight: 1 },
    ],
  },

  // --- BIOME EXPANSION (batch 6) -------------------------------------------
  // Nine new lands. Tags reuse the rooted-faction biomes ('grove'/'grave'/
  // 'rift') where a faction owns the ground, so jungles/mires/crypts/meadows
  // are genuine war-origin territory; 'desert'/'beach'/'isle' are new tags
  // whose patrons (gnoll/wild) roam, so war-origin doesn't depend on them.
  // Packs are patron-weighted, so faction.tableNative infers the right power.

  // DESERT — sun-scoured gnoll country: dunes of slowing sand, sparse stone.
  desert: {
    id: 'desert',
    variants: [
      { name: 'dunes', layout: [
        { kind: 'sand', count: [8, 12] }, { kind: 'rocks', count: [3, 5], radius: [22, 52] },
        // Wind-combed ridge crescents (the arcs fuse into dune lines).
        { kind: 'formation', count: [2, 4], formation: 'dune_ridges' },
        { kind: 'cliff', count: [0, 1] }, { kind: 'ruin', count: [0, 1] },
        { kind: 'heat_shimmer', count: [3, 6] },
        { kind: 'cave', count: [0, 1] },
        { kind: 'structure', count: [0, 1], structure: 'faction_war_camp' },
      ] },
      { name: 'oasis', layout: [
        { kind: 'water', count: [2, 3], radius: [40, 70] }, { kind: 'shallows', count: [2, 3] },
        { kind: 'palm', count: [8, 12] }, { kind: 'sand', count: [4, 6] },
        { kind: 'rocks', count: [2, 4], radius: [20, 44] }, { kind: 'grass', count: [1, 2] },
        { kind: 'heat_shimmer', count: [1, 3] },
        { kind: 'cave', count: [0, 1] },
        { kind: 'structure', count: [0, 1], structure: 'faction_war_camp' },
        // Shade arcs ringing the pool: the strand centers near the water the
        // rows above poured, its arc sweeping the shoreline.
        { kind: 'formation', count: [1, 2], formation: 'palm_strand',
          where: { field: 'shore', max: 0.4, params: { kinds: ['water'], reach: 220 } } },
      ] },
    ],
    nameFirst: ['Sunscoured', 'Bone-Dry', 'Wind-Carved', 'Mirage', 'Scorchsand', 'Glasswaste', 'Sunbaked', 'Duneshift', 'Saltcrack', 'Heat-Hazed', 'Witherglass', 'Sandlorn', 'Blistering', 'Dustchoke', 'Goldwaste', 'Suncracked', 'Parched', 'Burnglass'],
    nameSecond: ['Dunes', 'Reach', 'Flats', 'Wastes', 'Hollow', 'Expanse', 'Barrens', 'Drift', 'Sands', 'Erg', 'Scour', 'Pan', 'Basin', 'Sprawl', 'Span', 'Verge'],
    theme: {
      dayLight: 1.6,
      heat: 1,
      ambientFx: [{ kind: 'heatHaze', intensity: 0.8 }],
      ground: { scale: 2.6, stretchX: 2.1, strength: 1.25, speckles: 0.45 },
      floor: '#1a160d', grid: '#2a2418', border: '#7a6438',
      obstacle: '#5c4a2c', obstacleEdge: '#8a6e40', accent: '#e8c060',
      mud: '#6a5630', water: '#2a6a7a', sand: '#c9a86a',
    },
    sizeW: [2600, 3600], sizeH: [1700, 2400], ellipseChance: 0.2, biome: 'desert',
    layout: [
      { kind: 'cactus', count: [5, 9] },
      { kind: 'sand', count: [4, 7] },
      { kind: 'rocks', count: [6, 10], radius: [22, 52] },
      { kind: 'rock_spire', count: [1, 3] }, { kind: 'scree', count: [1, 2] },
      { kind: 'cliff', count: [1, 2] },
      { kind: 'ruin', count: [0, 2] },
      { kind: 'heat_shimmer', count: [2, 5] },
      { kind: 'camp', count: [0, 1] },
      { kind: 'cave', count: [0, 2] },
      { kind: 'structure', count: [0, 1], structure: 'faction_war_camp' },
    ],
    // Every desert face is combed by wind and slides — COMMON runs for both
    // variants (a rolled variant REPLACES the base layout above).
    common: [
      { kind: 'formation', count: [1, 2], formation: 'dune_ridges' },
      { kind: 'formation', count: [0, 1], formation: 'boulder_train' },
      // Where lightning kept an appointment with the sand.
      { kind: 'formation', count: [0, 1], formation: 'fulgurite_scar' },
      { kind: 'fulgurite', count: [0, 2] },
      // Shimmer thickens where the WORLD bakes hottest (climate strata).
      { kind: 'heat_shimmer', count: [0, 2], where: { field: 'climate', params: { axis: 'temperature' }, min: 0.55 } },
    ],
    packs: {
      count: [6, 8], size: [3, 5],
      table: [
        { id: 'gnoll_prowler', weight: 4 },
        { id: 'gnoll_longshot', weight: 2, presence: { from: 4, fadeIn: 3 } },
        { id: 'gnoll_butcher', weight: 2, presence: { from: 5, fadeIn: 3 } },
        { id: 'gnoll_howler', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'dune_stalker', weight: 2 },
        { id: 'alpha_stalker', weight: 1, presence: { from: 10, fadeIn: 5 } },
        // The sand's armored vermin.
        { id: 'bronze_scarab', weight: 2, presence: { from: 6, fadeIn: 3 } },
        { id: 'sand_wyrm', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'gnoll_trapper', weight: 1, presence: { from: 6, fadeIn: 3 } },
        { id: 'bombardier_beetle', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'giant_maggot', weight: 2, presence: { to: 14, fadeOut: 7 } },
        { id: 'maggot_queen', weight: 1, presence: { from: 12, fadeIn: 5 } },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [
      { kind: 'clear', weight: 3 },
      { kind: 'escape', weight: 2 },
      { kind: 'spawners', weight: 2 },
      { kind: 'waves', weight: 1 },
    ],
  },

  // JUNGLE — the Sylvan court's deep growth: palms, vines, impassable thickets.
  jungle: {
    id: 'jungle',
    // The heat swells marsh bladders in clearing and dense floor alike.
    common: [
      { kind: 'gas_pod', count: [1, 2] },
      // The canopy drips harder where the WORLD runs wet (climate strata).
      { kind: 'vines', count: [0, 2], where: { field: 'climate', params: { axis: 'moisture' }, min: 0.55 } },
    ],
    variants: [
      { name: 'clearing', layout: [
        { kind: 'trees', count: [8, 12] }, { kind: 'grove', count: [3, 4] },
        { kind: 'grass', count: [4, 6] }, { kind: 'brush', count: [3, 5] },
        { kind: 'palm', count: [4, 7] }, { kind: 'vines', count: [1, 2] },
        { kind: 'thicket', count: [1, 2] }, { kind: 'swamp', count: [1, 2] },
        { kind: 'river', count: [0, 1] }, { kind: 'cave', count: [0, 1] },
        { kind: 'structure', count: [0, 1], structure: 'faction_hall' },
      ] },
      { name: 'dense floor', layout: [
        { kind: 'palm', count: [16, 22] }, { kind: 'vines', count: [5, 8] },
        { kind: 'thicket', count: [5, 7] }, { kind: 'trees', count: [10, 14] },
        { kind: 'brush', count: [4, 6] }, { kind: 'swamp', count: [2, 3] },
        { kind: 'grove', count: [1, 2] }, { kind: 'cave', count: [0, 1] },
        { kind: 'structure', count: [0, 1], structure: 'faction_hall' },
      ] },
    ],
    nameFirst: ['Verdant', 'Tangleroot', 'Emerald', 'Fevered', 'Greenmaw', 'Vinewrought', 'Overgrown', 'Mistleaf', 'Rotbloom', 'Canopied', 'Thornvine', 'Sapheart', 'Fernshade', 'Leafshroud', 'Jadewild', 'Snarlgreen', 'Humid', 'Tanglevein'],
    nameSecond: ['Canopy', 'Snarl', 'Depths', 'Hollow', 'Thicket', 'Wilds', 'Tangle', 'Overgrowth', 'Verge', 'Hush', 'Reach', 'Mire', 'Bower', 'Greens', 'Vinework', 'Floor'],
    theme: {
      floor: '#08140a', grid: '#0e1f10', border: '#2a5a2c',
      obstacle: '#1c4a1e', obstacleEdge: '#357538', accent: '#6ed060',
      tree: '#2f6a34', mud: '#14260f', water: '#16404a', wall: '#3a4a22',
    },
    sizeW: [2400, 3400], sizeH: [1600, 2400], ellipseChance: 0.25, biome: 'grove',
    layout: [
      { kind: 'ancient_tree', count: [1, 2] },
      { kind: 'palm', count: [12, 18] },
      { kind: 'vines', count: [3, 6] },
      { kind: 'fern', count: [2, 5] },
      { kind: 'thicket', count: [3, 5] },
      { kind: 'trees', count: [6, 10] },
      { kind: 'grove', count: [2, 3] },
      { kind: 'brush', count: [3, 5] },
      { kind: 'swamp', count: [1, 2] },
      { kind: 'river', count: [0, 1] },
      { kind: 'cave', count: [0, 1] },
      { kind: 'structure', count: [0, 1], structure: 'faction_hall' },
    ],
    packs: {
      count: [5, 8], size: [3, 5],
      table: [
        { id: 'thorn_sprite', weight: 4, presence: { to: 20, fadeOut: 10 } },
        { id: 'sylvan_warden', weight: 2 },
        { id: 'briar_beast', weight: 2, presence: { from: 9, fadeIn: 4 } },
        { id: 'grove_singer', weight: 1, presence: { from: 6, fadeIn: 3 } },
        { id: 'spitting_horror', weight: 2, presence: { to: 16, fadeOut: 8 } },
        { id: 'fen_hound', weight: 1 },
        // The canopy's anti-dodge answer: it reads the runner's rhythm.
        { id: 'veilstalker', weight: 2, presence: { from: 6, fadeIn: 3 } },
        // The jungle's own green wood, waking.
        { id: 'sylvan_sapling', weight: 2, presence: { to: 12, fadeOut: 5 } },
        { id: 'twig_snarl', weight: 2, presence: { from: 4, fadeIn: 2, to: 22, fadeOut: 9 } },
        { id: 'treant_warden', weight: 1, presence: { from: 12, fadeIn: 5 } },
        { id: 'root_snarl', weight: 1, presence: { from: 10, fadeIn: 4 } },
        // Prayer and silk in the green shade.
        { id: 'emerald_mantis', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'orb_weaver', weight: 2, presence: { from: 5, fadeIn: 3 } },
        { id: 'widow_matron', weight: 1, presence: { from: 12, fadeIn: 5 } },
        { id: 'root_wraith', weight: 2, presence: { from: 8, fadeIn: 4 } },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [
      { kind: 'clear', weight: 3 },
      { kind: 'escape', weight: 2 },
      { kind: 'spawners', weight: 2 },
      { kind: 'waves', weight: 1 },
    ],
  },

  // MIRE — a drowned graveland: standing swamp, poison bog, rotted timber.
  mire: {
    id: 'mire',
    compositions: [{ composition: 'drowned_procession', chance: 0.3 }],
    variants: [
      { name: 'sunken grove', layout: [
        { kind: 'trees', count: [8, 12] }, { kind: 'swamp', count: [3, 5] },
        { kind: 'bog', count: [2, 3] }, { kind: 'water', count: [1, 2] },
        { kind: 'vines', count: [2, 3] }, { kind: 'grove', count: [1, 2] },
        { kind: 'rocks', count: [2, 4], radius: [16, 34] }, { kind: 'cave', count: [0, 1] },
        { kind: 'structure', count: [0, 1], structure: 'pillaged_township' },
        { kind: 'formation', count: [1, 2], formation: 'reed_shoreline',
          where: { field: 'shore', max: 0.6, params: { kinds: ['water', 'swamp', 'bog'], reach: 140 } } },
      ] },
      { name: 'blackwater', layout: [
        { kind: 'water', count: [3, 5] }, { kind: 'bog', count: [4, 6] },
        { kind: 'swamp', count: [2, 4] }, { kind: 'shallows', count: [1, 2] },
        { kind: 'vines', count: [2, 4] }, { kind: 'trees', count: [3, 5] },
        { kind: 'rocks', count: [2, 3], radius: [16, 30] }, { kind: 'cave', count: [0, 1] },
        { kind: 'structure', count: [0, 1], structure: 'pillaged_township' },
        { kind: 'formation', count: [1, 3], formation: 'reed_shoreline',
          where: { field: 'shore', max: 0.6, params: { kinds: ['water', 'swamp', 'bog'], reach: 140 } } },
      ] },
    ],
    nameFirst: ['Sunken', 'Rotreek', 'Fenmire', 'Blackwater', 'Drownreed', 'Quagmire', 'Stillwater', 'Murkwallow', 'Reekbrack', 'Sludgewater', 'Greenrot', 'Cessmire', 'Gloomwrack', 'Dankmoor', 'Wetrot', 'Slimewater', 'Foulmere', 'Bogshade'],
    nameSecond: ['Bog', 'Fen', 'Marsh', 'Sloughs', 'Swale', 'Lowland', 'Sump', 'Wetland', 'Quag', 'Reeds', 'Shallows', 'Sink', 'Morass', 'Hollow', 'Reach', 'Mudflat'],
    theme: {
      ground: { scale: 1.35, strength: 1.15 },
      // The mire's fog ROLLS: river_mist anchors on the blackwater and
      // drifts its banks — walk with it and the veil holds.
      fog: { banks: [2, 4], kinds: [{ id: 'river_mist', weight: 2 }, { id: 'mist' }] },
      floor: '#10140e', grid: '#18201a', border: '#3a4a38',
      obstacle: '#2a3a2c', obstacleEdge: '#46603e', accent: '#8ab060',
      mud: '#1c2a16', water: '#1a3a30', tree: '#2a4a2a',
    },
    sizeW: [2300, 3200], sizeH: [1600, 2300], ellipseChance: 0.2, biome: 'grave',
    layout: [
      { kind: 'dead_tree', count: [4, 8] }, { kind: 'reeds', count: [2, 4] }, { kind: 'web', count: [0, 2] },
      { kind: 'swamp', count: [3, 5] },
      { kind: 'bog', count: [2, 4] },
      { kind: 'water', count: [1, 2] },
      { kind: 'vines', count: [2, 4] },
      { kind: 'trees', count: [5, 9] },
      { kind: 'rocks', count: [3, 6], radius: [16, 34] },
      { kind: 'fern', count: [1, 3] },
      { kind: 'ruin', count: [1, 2] },
      // The graveland set: old burials and the mire's counted dead.
      { kind: 'barrow_mound', count: [1, 2] },
      { kind: 'bone_cairn', count: [1, 2] },
      { kind: 'hollow_log', count: [0, 2] },
      { kind: 'gel_pool', count: [1, 2], radius: [38, 58] },
      { kind: 'cave', count: [0, 1] },
      { kind: 'structure', count: [0, 1], structure: 'pillaged_township' },
    ],
    // Whichever water the mire shows, the gas still pools and the thorns
    // still feed: the hazard kit rides every variant. (Shore-banded reeds
    // live in each VARIANT list — a shore band must FOLLOW its liquids, and
    // common rows run before them.)
    common: [
      { kind: 'gas_pod', count: [2, 4] },
      { kind: 'puffcap_cluster', count: [1, 3] },
      { kind: 'briarwood', count: [1, 2] },
      // The bog set rides every variant too: drowned timber, wisp-light,
      // and the venom blooms whose pops CONTRACT away.
      { kind: 'sunken_log', count: [1, 2] },
      { kind: 'marsh_wisp', count: [1, 3] },
      { kind: 'venom_bloom', count: [1, 2] },
    ],
    packs: {
      count: [5, 7], size: [3, 5],
      table: [
        { id: 'zombie', weight: 3, presence: { to: 20, fadeOut: 10 } },
        { id: 'bone_serpent', weight: 3, presence: { from: 8, fadeIn: 4 } },
        { id: 'crypt_warden', weight: 2, presence: { from: 6, fadeIn: 3 } },
        { id: 'husk_swarmer', weight: 2, presence: { to: 18, fadeOut: 9 } },
        { id: 'fen_hound', weight: 2 },
        { id: 'frost_witch', weight: 1, presence: { from: 8, fadeIn: 4 } },
        // Grave-lights and the drowned court's wailers haunt the mire.
        { id: 'gloomling', weight: 2, presence: { to: 16, fadeOut: 8 } },
        { id: 'banshee', weight: 1, presence: { from: 14, fadeIn: 6 } },
        { id: 'giant_maggot', weight: 2, presence: { to: 18, fadeOut: 8 } },
        { id: 'mire_maw', weight: 2, presence: { from: 8, fadeIn: 4 } },
        { id: 'lake_horror', weight: 1, presence: { from: 12, fadeIn: 5 } },
        { id: 'mire_burrower', weight: 2, presence: { from: 7, fadeIn: 3 } },
        { id: 'bog_dweller', weight: 2, presence: { from: 6, fadeIn: 3 } },
        { id: 'tide_whelk', weight: 1, presence: { from: 5, fadeIn: 3 } },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [
      { kind: 'clear', weight: 3 },
      { kind: 'escape', weight: 2 },
      { kind: 'spawners', weight: 2 },
      { kind: 'waves', weight: 1 },
    ],
  },

  // WASTELAND — the demon rift's scorched fringe: lava flows and broken stone.
  wasteland: {
    id: 'wasteland',
    // War-land keeps its ordnance: abandoned powder dumps that answer stray
    // fire — and the muster grounds the war was drilled in.
    compositions: [{ composition: 'powder_cache', chance: 0.28 }, { composition: 'war_camp', chance: 0.16 }, { composition: 'fallen_colossus', chance: 0.12 }, { composition: 'cistern_court', chance: 0.12 }],
    nameFirst: ['Blasted', 'Cindertorn', 'Hellcracked', 'Ruinous', 'Emberblight', 'Scorched', 'Riftburnt', 'Ashbroken', 'Brimstone', 'Sulfurous', 'Cracked', 'Desolate', 'Smouldering', 'Wretched', 'Hateforged', 'Slagheap', 'Damnedmarch', 'Charbroken'],
    nameSecond: ['Waste', 'Barrens', 'Scar', 'Reach', 'Expanse', 'Flats', 'Ruin', 'Sprawl', 'Crackland', 'Wreckage', 'Hollow', 'Desolation', 'Cinders', 'Drift', 'Span', 'Wilds'],
    theme: {
      floor: '#15130f', grid: '#231d16', border: '#5c3a28',
      obstacle: '#47291c', obstacleEdge: '#7a452c', accent: '#ff7a40',
      chasm: '#1b0703', mud: '#2b1d12', lava: '#7a1a08', sand: '#6a5638',
    },
    sizeW: [2500, 3500], sizeH: [1600, 2400], ellipseChance: 0.3, biome: 'rift',
    layout: [
      { kind: 'dead_tree', count: [3, 6] }, { kind: 'bone_pile', count: [1, 3] },
      { kind: 'gallows', count: [0, 1] },
      { kind: 'lava', count: [2, 3] },
      { kind: 'chasm', count: [0, 1] },
      { kind: 'ravine', count: [1, 1] },
      { kind: 'rocks', count: [10, 16], radius: [24, 52] },
      { kind: 'rock_spire', count: [1, 2] }, { kind: 'scree', count: [1, 3] },
      { kind: 'cliff', count: [2, 3] },
      { kind: 'sand', count: [1, 2] },
      { kind: 'ruin', count: [0, 2] },
      { kind: 'camp', count: [1, 2] },
      { kind: 'structure', count: [0, 1], structure: 'fortress_gate' },
    ],
    packs: {
      count: [6, 8], size: [3, 5],
      table: [
        { id: 'imp', weight: 3, presence: { to: 22, fadeOut: 12 } },
        { id: 'fulgur_imp', weight: 2, presence: { from: 4, fadeIn: 2 } },
        { id: 'hellhound', weight: 3 },
        { id: 'cinder_fiend', weight: 2, presence: { from: 6, fadeIn: 3 } },
        { id: 'searing_spawn', weight: 2, presence: { from: 8, fadeIn: 4 } },
        { id: 'dread_fiend', weight: 1, presence: { from: 12, fadeIn: 5 } },
        { id: 'brute', weight: 2, presence: { to: 16, fadeOut: 8 } },
        // The deep-war Legion walks its own wastes.
        { id: 'bloodgorger', weight: 1, presence: { from: 18, fadeIn: 5 } },
        { id: 'chained_tormentor', weight: 1, presence: { from: 20, fadeIn: 6 } },
        // The gather elite and the lava-lane burrower.
        { id: 'ruin_chanter', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'magma_swimmer', weight: 1, presence: { from: 6, fadeIn: 3 } },
        { id: 'magma_lurker', weight: 1, presence: { from: 7, fadeIn: 3 } },
        { id: 'void_angler', weight: 1, presence: { from: 10, fadeIn: 4 } },
      ],
    },
    spawnerId: 'ember_rift',
    objectives: [
      { kind: 'clear', weight: 2 },
      { kind: 'escape', weight: 2 },
      { kind: 'spawners', weight: 3 },
      { kind: 'waves', weight: 1 },
    ],
  },

  // THE OUTER STEPPES — the Underworld's scorched marches (biome:'steppes').
  // Open umber plains cut by the angular wall-runs of abandoned hellworks (the
  // 'steppes' recipe: true walls with breaches — navigate AROUND them), abyssal
  // maws and rents burning through the crust, horn-blade fins and the legions'
  // impaled warnings between them — and, where the gate terrace rolls, a
  // flagstone ledge whose switchback stair is the only way down onto the
  // steppe: the descent out of the fortress.
  hell_steppes: {
    id: 'hell_steppes', biome: 'steppes',
    nameFirst: ['Outer', 'Sundered', 'Screaming', 'Forsaken', 'Chainscarred', 'Ashen', 'Howling', 'Nailed', 'Godless', 'Smoldering', 'Harrowed', 'Iron-Staked', 'Cindered', 'Abyssal', 'Unhallowed', 'Flayed', 'Embertorn', 'Wailing'],
    nameSecond: ['Steppes', 'Marches', 'Plains', 'Reaches', 'Waste', 'Approach', 'Threshold', 'Expanse', 'Scarlands', 'Fields', 'Verge', 'Descent', 'Flats', 'Outlands', 'Span', 'Steps'],
    theme: {
      heat: 0.9, dayLight: 0.92, nightDark: 0.8, ambientDark: 0.18,
      // Standing embers on the wind + a breath of heat-shimmer: hell's air.
      ambientFx: [
        { kind: 'motes', intensity: 0.4, color: '#ff9a4a' },
        { kind: 'heatHaze', intensity: 0.25, color: '#ffc9a0' },
      ],
      ground: {
        palette: ['#1e1109', '#2a180c', '#35200e', '#402a12', '#4c3416'],
        bias: 0.46, alpha: 0.52, stretchX: 1.5, speckles: 0.9, strength: 1.15,
      },
      floor: '#1a0f08', grid: '#271609', border: '#5c3018',
      obstacle: '#33191b', obstacleEdge: '#6e3a24', accent: '#ff8a4a',
      // Wall = the ruined hellwork runs: wine-dark obsidian masonry. Kept a
      // full luminance step above the floor (gap > 0.09) so the ground
      // baker's contrast guard never washes it to neutral grey.
      wall: '#452330', chasm: '#120507', mud: '#2e1c10', sand: '#66513a',
    },
    sizeW: [2600, 3600], sizeH: [1700, 2400], ellipseChance: 0.15,
    // The tileset leans harder on its recipe than the biome default does:
    // more wall-runs, a near-certain gate terrace (spec ▷ tileset ▷ biome).
    layoutParams: { ridges: [3, 6], gateTerrace: { chance: 0.8 } },
    layout: [
      // Ground scars first, so the solids placed after honour their forbidOn.
      { kind: 'cinder', count: [1, 3] },
      { kind: 'abyssal_rent', count: [1, 3] },
      { kind: 'ember_fissure', count: [2, 4] },
      // The steppes' skyline: horn-blades, the legions' warnings, titan chains.
      { kind: 'hell_fin', count: [4, 8] },
      { kind: 'impaler_stake', count: [2, 5] },
      { kind: 'hell_chain', count: [2, 4] },
      { kind: 'rib_arch', count: [0, 2] },
      { kind: 'black_obelisk', count: [0, 1] },
      { kind: 'bone_pile', count: [2, 4] },
      { kind: 'dead_tree', count: [1, 3] },
      { kind: 'rocks', count: [7, 12], radius: [22, 46] },
      { kind: 'rock_spire', count: [1, 2] },
      { kind: 'scree', count: [1, 3] },
      { kind: 'formation', count: [1, 2], formation: 'fin_procession' },
      { kind: 'formation', count: [0, 1], formation: 'stake_line' },
      { kind: 'ruin', count: [0, 1] },
    ],
    variants: [
      // PLAINS OF DESPAIR: the stake-fields past the walls — sparser skyline,
      // thicker warnings, the ground more torn. (A variant REPLACES the base
      // layout; rows both faces need would belong in `common`.)
      {
        name: 'Despair',
        layout: [
          { kind: 'cinder', count: [2, 4] },
          { kind: 'abyssal_rent', count: [2, 4] },
          { kind: 'ember_fissure', count: [3, 5] },
          { kind: 'impaler_stake', count: [5, 9] },
          { kind: 'hell_chain', count: [3, 5] },
          { kind: 'hell_fin', count: [2, 4] },
          { kind: 'bone_pile', count: [3, 6] },
          { kind: 'gallows', count: [0, 1] },
          { kind: 'rocks', count: [6, 10], radius: [22, 44] },
          { kind: 'formation', count: [1, 2], formation: 'stake_line' },
          { kind: 'formation', count: [0, 1], formation: 'fin_procession' },
        ],
      },
    ],
    compositions: [{ composition: 'impaler_court', chance: 0.4 }],
    packs: {
      count: [6, 8], size: [3, 5],
      table: [
        { id: 'imp', weight: 3, presence: { to: 22, fadeOut: 12 } },
        { id: 'hellhound', weight: 3 },
        { id: 'cinder_fiend', weight: 2, presence: { from: 6, fadeIn: 3 } },
        { id: 'searing_spawn', weight: 2, presence: { from: 8, fadeIn: 4 } },
        // The steppes are dread country: the heavy Legion walks earlier here.
        { id: 'dread_fiend', weight: 2, presence: { from: 12, fadeIn: 5 } },
        { id: 'chained_tormentor', weight: 2, presence: { from: 16, fadeIn: 5 } },
        { id: 'bloodgorger', weight: 1, presence: { from: 18, fadeIn: 5 } },
        // The pit country's angler — the maws are its hunting ground.
        { id: 'void_angler', weight: 2, presence: { from: 8, fadeIn: 3 } },
        { id: 'ruin_chanter', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'brute', weight: 2, presence: { to: 15, fadeOut: 8 } },
      ],
    },
    spawnerId: 'ember_rift',
    objectives: [
      { kind: 'clear', weight: 3 },
      { kind: 'escape', weight: 1 },
      { kind: 'spawners', weight: 2 },
      { kind: 'waves', weight: 1 },
    ],
  },

  // THE RIVER OF FLAME — hell's artery (biome 'flame': COURSE-ONLY, painted
  // along the Underworld's declared throughline, never rolled by a palette).
  // Every zone is a riverland pouring lava, oriented by the course's
  // riverSides so consecutive zones read as ONE continuous flow; the banks
  // carry the demons' own works — gibbet galleries, banner roads, pale
  // pyres — and the Hellforge waits where the water... where the FIRE ends.
  river_of_flame: {
    id: 'river_of_flame', biome: 'flame',
    nameFirst: ['Molten', 'Burning', 'Weeping', 'Sunless', 'Blistered', 'Chained', 'Slagbound', 'Scalding', 'Dolorous', 'Smokewreathed', 'Cindershot', 'Seething', 'Forgelit', 'Wailing', 'Cauterized', 'Tolling'],
    nameSecond: ['Banks', 'Reach', 'Meander', 'Course', 'Shallows', 'Crossing', 'Strand', 'Bend', 'Confluence', 'Channel', 'Run', 'Narrows', 'Fords', 'Verge', 'Toll'],
    theme: {
      heat: 1, dayLight: 0.9, nightDark: 0.82, ambientDark: 0.22,
      // The river lights itself: heavier embers on the wind, deeper shimmer.
      ambientFx: [
        { kind: 'motes', intensity: 0.55, color: '#ff9a4a' },
        { kind: 'heatHaze', intensity: 0.35, color: '#ffc9a0' },
      ],
      ground: {
        // Charred basalt banks — near-black, warming toward the old flows.
        palette: ['#140b08', '#1d1009', '#27150a', '#301a0c', '#3a200e'],
        bias: 0.44, alpha: 0.5, stretchX: 1.4, speckles: 0.8, strength: 1.1,
      },
      floor: '#150c07', grid: '#22120a', border: '#5c2c14',
      obstacle: '#2e1714', obstacleEdge: '#6a3520', accent: '#ff7a2a',
      // Wall stays a luminance step above the floor (the contrast guard).
      wall: '#3c2028', lava: '#801c08', chasm: '#100406', mud: '#2e1c10', sand: '#66513a',
    },
    // Long zones, always rectangular: the river wants a run, not a bowl.
    sizeW: [2600, 3400], sizeH: [1600, 2200], ellipseChance: 0,
    // The tileset leans harder than the biome default: a wider flood, isles
    // in the flow (spec ▷ tileset ▷ biome; the course's riverSides ride the
    // same merge one layer up).
    layoutParams: { riverWidth: [120, 180], causeways: [2, 3], isles: [1, 3] },
    // What EVERY face of the river keeps: torn ground first (solids honour
    // their forbidOn), the live vents of the flow, and the toll galleries
    // hung out over the fire (the shore band measures the poured river).
    common: [
      { kind: 'cinder', count: [1, 3] },
      { kind: 'ember_fissure', count: [2, 4] },
      { kind: 'lava_vent', count: [1, 2], where: { field: 'shore', max: 0.55, params: { kinds: ['lava'], reach: 170 } } },
      { kind: 'ember_vent', count: [1, 3], where: { field: 'shore', max: 0.6, params: { kinds: ['lava'], reach: 190 } } },
      { kind: 'formation', count: [1, 1], formation: 'soul_gallery', where: { field: 'shore', max: 0.5, params: { kinds: ['lava'], reach: 150 } } },
    ],
    layout: [
      // THE BANKS: the open face — obsidian levees, the legion's road dress.
      { kind: 'obsidian', count: [3, 6] },
      { kind: 'bone_pile', count: [2, 4] },
      { kind: 'soul_cage', count: [1, 3] },
      { kind: 'demon_banner', count: [1, 3] },
      { kind: 'pyre_heap', count: [1, 2] },
      { kind: 'hell_chain', count: [1, 3] },
      { kind: 'rocks', count: [6, 10], radius: [22, 44] },
      { kind: 'rock_spire', count: [1, 2] },
      { kind: 'scree', count: [1, 3] },
      { kind: 'formation', count: [0, 1], formation: 'banner_row' },
      { kind: 'formation', count: [0, 1], formation: 'cinder_vein' },
    ],
    variants: [
      // CHARNEL FORDS: the crossing country — the toll paid in bone. (A
      // variant REPLACES the base layout; the common rows above ride along.)
      {
        name: 'Charnel Fords',
        layout: [
          { kind: 'bone_pile', count: [4, 7] },
          { kind: 'rib_arch', count: [1, 3] },
          { kind: 'pyre_heap', count: [2, 4] },
          { kind: 'soul_cage', count: [2, 4] },
          { kind: 'obsidian', count: [2, 4] },
          { kind: 'rocks', count: [5, 9], radius: [22, 40] },
          { kind: 'formation', count: [1, 1], formation: 'pyre_watch' },
          { kind: 'formation', count: [0, 1], formation: 'bone_trail' },
        ],
      },
      // FORGE APPROACH: the worked reach — chain runs, banner roads, the
      // smoke of industry; obelisks marking the way to the landing.
      {
        name: 'Forge Approach',
        layout: [
          { kind: 'hell_chain', count: [3, 5] },
          { kind: 'demon_banner', count: [2, 5] },
          { kind: 'brazier', count: [1, 3] },
          { kind: 'charcoal_mound', count: [1, 3] },
          { kind: 'black_obelisk', count: [1, 2] },
          { kind: 'obsidian', count: [2, 5] },
          { kind: 'rocks', count: [5, 8], radius: [22, 40] },
          { kind: 'formation', count: [1, 2], formation: 'banner_row' },
        ],
      },
    ],
    // The landing rolls rare OFF-terminus too (the course's terminus zone
    // forces it at chance 1 through the extraCompositions seam).
    compositions: [{ composition: 'hellforge_landing', chance: 0.06 }],
    packs: {
      count: [6, 8], size: [3, 5],
      table: [
        { id: 'imp', weight: 3, presence: { to: 24, fadeOut: 12 } },
        { id: 'hellhound', weight: 2 },
        { id: 'cinder_fiend', weight: 2, presence: { from: 6, fadeIn: 3 } },
        { id: 'searing_spawn', weight: 2, presence: { from: 8, fadeIn: 4 } },
        // The river's own: swimmers in the flow, the lurker under the fords.
        { id: 'magma_swimmer', weight: 3, presence: { from: 6, fadeIn: 3 } },
        { id: 'magma_lurker', weight: 2, presence: { from: 10, fadeIn: 4 } },
        { id: 'ember_elemental', weight: 2, presence: { from: 8, fadeIn: 4 } },
        { id: 'dread_fiend', weight: 2, presence: { from: 12, fadeIn: 5 } },
        { id: 'chained_tormentor', weight: 2, presence: { from: 16, fadeIn: 5 } },
        { id: 'ruin_chanter', weight: 1, presence: { from: 8, fadeIn: 4 } },
      ],
    },
    spawnerId: 'ember_rift',
    objectives: [
      { kind: 'clear', weight: 3 },
      { kind: 'escape', weight: 1 },
      { kind: 'spawners', weight: 2 },
      { kind: 'waves', weight: 1 },
    ],
  },

  // THE DURANCE — the hate-citadel's interior (biome 'durance': hell's first
  // ENCLAVE — every crossing into or out of it wears the durance boundary
  // gate). Black coursed masonry on the dungeon/edifice room-graphs, tiled
  // floors, cold green light, the instruments left mid-use. The first fully
  // INDOOR biome: ambientDark carries the gloom, the braziers and the idol's
  // gaze carry the light, and the gore underfoot carries the story.
  durance: {
    id: 'durance', biome: 'durance',
    nameFirst: ['Durance', 'Halls', 'Oubliettes', 'Galleries', 'Vaults', 'Cloisters', 'Cells', 'Depths', 'Courts', 'Chambers', 'Warrens', 'Reliquaries'],
    nameSecond: ['of Hate', 'of Anguish', 'of the Flayed', 'of Chains', 'of the Silent', 'of Sorrow', 'of the Council', 'of Penance', 'of the Hooded', 'of Wailing', 'of the Kept', 'of Spite'],
    theme: {
      // Deep interior dark — the citadel lights its own halls (hate-green
      // braziers, the idol's gaze); day never reaches here.
      heat: 0.4, dayLight: 0.85, nightDark: 0.85, ambientDark: 0.45,
      ambientFx: [
        { kind: 'spores', intensity: 0.3, color: '#7de84a' },
        { kind: 'motes', intensity: 0.18, color: '#5aa44a' },
      ],
      ground: {
        // Cold flag-black with a breath of green — the halls' tiled murk.
        palette: ['#0c0d11', '#12131a', '#181a22', '#1e2027', '#242730'],
        bias: 0.4, alpha: 0.5, scale: 0.9, speckles: 0.5, strength: 1.0,
      },
      floor: '#0d0d12', grid: '#16161e', border: '#2c3a30',
      obstacle: '#242030', obstacleEdge: '#44405c', accent: '#7de84a',
      // Theme wall a full luminance step over the floor (the contrast guard);
      // the interior negative space itself is the durance_wall REGION (its
      // own coursed-masonry fill + green rim — world/regions.ts).
      wall: '#232030', chasm: '#07070c', mud: '#1c1418', sand: '#3a3630',
    },
    // Halls, not country: the smallest frontier footprints in hell, never
    // elliptical (architecture is rectangular).
    sizeW: [1900, 2600], sizeH: [1400, 1900], ellipseChance: 0,
    // The tileset leans harder than the biome default: heavier doors, a
    // touch more breakable (the halls are old), same black-stone knobs.
    layoutParams: {
      interiorWall: 'durance_wall', floorStyle: 'tile',
      corridorCells: 2.2, doorChance: 0.55, doorBreakChance: 0.35,
    },
    // What EVERY hall keeps: the stains, the webs of long custody, its own
    // cold lights, and the bones of the kept.
    common: [
      { kind: 'gore', count: [1, 3] },
      { kind: 'web', count: [2, 4] },
      { kind: 'hate_brazier', count: [2, 4] },
      { kind: 'bone_pile', count: [1, 3] },
    ],
    layout: [
      // THE HALLS: the working face — the instruments, the toll, the watch.
      { kind: 'torture_rack', count: [2, 4] },
      { kind: 'soul_cage', count: [1, 3] },
      { kind: 'hate_idol', count: [1, 2] },
      { kind: 'burial_urn', count: [2, 4] },
      { kind: 'clay_pots', count: [1, 3] },
      { kind: 'hell_chain', count: [1, 2] },
      { kind: 'rib_arch', count: [0, 1] },
    ],
    variants: [
      // HALLS OF ANGUISH: the working wing — racks in ranks, the cages full,
      // the gallows waiting. (A variant REPLACES the base; common rides.)
      {
        name: 'Anguish',
        layout: [
          { kind: 'torture_rack', count: [4, 7] },
          { kind: 'soul_cage', count: [2, 4] },
          { kind: 'gallows', count: [0, 1] },
          { kind: 'gore', count: [2, 4] },
          { kind: 'hate_idol', count: [1, 2] },
          { kind: 'burial_urn', count: [1, 3] },
        ],
      },
      // THE BLOOD COURT: the audience wing — the floors run, the idols
      // multiply, and the braziers burn taller for the watching.
      {
        name: 'Blood Court',
        layout: [
          { kind: 'gore', count: [4, 8], radius: [30, 52] },
          { kind: 'hate_idol', count: [2, 3] },
          { kind: 'hate_brazier', count: [2, 3] },
          { kind: 'torture_rack', count: [1, 2] },
          { kind: 'soul_cage', count: [1, 2] },
          { kind: 'hell_chain', count: [1, 3] },
        ],
      },
    ],
    packs: {
      count: [5, 7], size: [3, 5],
      table: [
        { id: 'blood_mite', weight: 3, presence: { to: 18, fadeOut: 8 } },
        // The citadel's toys: stitched marionettes that die loudly.
        { id: 'stygian_doll', weight: 3, presence: { from: 8, fadeIn: 3 } },
        { id: 'ruin_chanter', weight: 2, presence: { from: 8, fadeIn: 4 } },
        { id: 'blood_golem', weight: 2, presence: { from: 10, fadeIn: 4 } },
        { id: 'chained_tormentor', weight: 2, presence: { from: 12, fadeIn: 5 } },
        { id: 'bloodgorger', weight: 2, presence: { from: 14, fadeIn: 5 } },
        { id: 'dread_fiend', weight: 2, presence: { from: 16, fadeIn: 5 } },
        { id: 'flesh_amalgam', weight: 1, presence: { from: 14, fadeIn: 6 } },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [
      { kind: 'clear', weight: 3 },
      { kind: 'spawners', weight: 2 },
      { kind: 'waves', weight: 1 },
    ],
  },

  // CRYPT — a forsaken graveland of headstones, broken tombs, and the risen.
  crypt: {
    id: 'crypt',
    compositions: [{ composition: 'boneyard_court', chance: 0.4 }, { composition: 'cistern_court', chance: 0.2 }],
    // What a graveland always keeps, whichever face it shows: burial goods
    // underfoot, a wall that hides more than bones, sealed urns and their
    // tenants, grave mold, the odd briar grown fat on the soil.
    common: [
      { kind: 'clay_pots', count: [2, 4] },
      { kind: 'secret_wall', count: [1, 2] },
      { kind: 'burial_urn', count: [2, 4] },
      { kind: 'puffcap_cluster', count: [0, 2] },
      { kind: 'briarwood', count: [0, 2] },
      // Rows someone once kept + the drag-path of whatever keeps the bones —
      // COMMON so every graveland face composes (a variant REPLACES the base
      // layout; barrows stacks its own extra rows on top).
      { kind: 'formation', count: [2, 3], formation: 'gravestone_rows' },
      { kind: 'formation', count: [0, 1], formation: 'bone_trail' },
    ],
    variants: [
      { name: 'barrows', layout: [
        { kind: 'tombstone', count: [18, 26] }, { kind: 'rocks', count: [8, 12], radius: [16, 30] },
        // The tended half of the boneyard: headstones in ROWS.
        { kind: 'formation', count: [2, 4], formation: 'gravestone_rows' },
        { kind: 'ruin', count: [1, 2] }, { kind: 'cliff', count: [2, 3] },
        { kind: 'mud', count: [1, 2] }, { kind: 'cave', count: [0, 1] },
        { kind: 'structure', count: [0, 1], structure: 'pillaged_township' },
      ] },
      { name: 'plague pit', layout: [
        { kind: 'tombstone', count: [12, 18] }, { kind: 'swamp', count: [3, 5] },
        { kind: 'bog', count: [2, 3] }, { kind: 'ruin', count: [2, 3] },
        { kind: 'rocks', count: [4, 7], radius: [16, 30] }, { kind: 'vines', count: [1, 2] },
        { kind: 'cave', count: [0, 1] },
        { kind: 'structure', count: [0, 1], structure: 'pillaged_township' },
      ] },
    ],
    nameFirst: ['Forsaken', 'Mouldering', 'Sepulchral', 'Grave-Still', 'Ossuary', 'Tombshadow', 'Gravecold', 'Bonewreathed', 'Restless', 'Coffinwood', 'Palewatch', 'Sunkengrave', 'Gloomtomb', 'Ash-Interred', 'Mortwood', 'Wraithgrey', 'Cryptgloom', 'Deathwatch'],
    nameSecond: ['Crypt', 'Necropolis', 'Barrows', 'Catacomb', 'Tombs', 'Restless Field', 'Sepulchre', 'Graveyard', 'Mausoleum', 'Vaults', 'Boneyard', 'Reliquary', 'Charnel', 'Hollow', 'Tomb-Row', 'Gravefield'],
    theme: {
      // Grave-mist pools among the headstones and FEEDS the dead (mistfed).
      fog: { banks: [1, 2], kinds: [{ id: 'grave_mist' }] },
      floor: '#0d0d12', grid: '#16161f', border: '#3a3a52',
      obstacle: '#2e2e44', obstacleEdge: '#50506e', accent: '#b090d8',
      mud: '#1a1a24', water: '#1c2030',
    },
    sizeW: [2000, 2900], sizeH: [1500, 2200], ellipseChance: 0.15, biome: 'grave',
    layout: [
      { kind: 'bone_pile', count: [3, 6] }, { kind: 'brazier', count: [1, 3] }, { kind: 'web', count: [1, 3] }, { kind: 'dead_tree', count: [2, 4] },
      { kind: 'weathered_statue', count: [0, 2] }, { kind: 'gallows', count: [0, 1] },
      { kind: 'tombstone', count: [14, 22] },
      { kind: 'ruin', count: [2, 3] },
      // The graveland set: barrows, obelisks, wax-drowned stumps, counted dead.
      { kind: 'barrow_mound', count: [1, 3] },
      { kind: 'black_obelisk', count: [0, 2] },
      { kind: 'tallow_stump', count: [1, 3] },
      { kind: 'bone_cairn', count: [2, 4] },
      { kind: 'rocks', count: [6, 10], radius: [16, 30] },
      { kind: 'swamp', count: [1, 2] },
      { kind: 'cliff', count: [1, 2] },
      { kind: 'cave', count: [0, 1] },
      { kind: 'structure', count: [0, 1], structure: 'pillaged_township' },
    ],
    packs: {
      count: [5, 7], size: [3, 5],
      table: [
        { id: 'skeleton_warrior', weight: 3 },
        { id: 'skeleton_archer', weight: 3 },
        { id: 'zombie', weight: 2, presence: { to: 22, fadeOut: 12 } },
        { id: 'crypt_warden', weight: 3, presence: { from: 6, fadeIn: 3 } },
        { id: 'bone_serpent', weight: 2, presence: { from: 10, fadeIn: 4 } },
        { id: 'lich_marshal', weight: 1, presence: { from: 14, fadeIn: 6 } },
        // The dead march under standards where the host has WOKEN.
        { id: 'hollow_bannerman', weight: 1, presence: { from: 7, fadeIn: 4 } },
        // Bats roost among the barrows (they thin as worthier dead wake).
        { id: 'cave_bat', weight: 1, presence: { to: 14, fadeOut: 6 } },
        // The apparition wing + the Court's thralls, deeper in.
        { id: 'gloomling', weight: 2, presence: { to: 16, fadeOut: 8 } },
        { id: 'poltergeist', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'barrow_wight', weight: 1, presence: { from: 10, fadeIn: 5 } },
        { id: 'banshee', weight: 1, presence: { from: 14, fadeIn: 6 } },
        { id: 'vampire_thrall', weight: 1, presence: { from: 8, fadeIn: 4 } },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [
      { kind: 'clear', weight: 3 },
      { kind: 'spawners', weight: 3 },
      { kind: 'waves', weight: 1 },
    ],
    structures: [
      { structure: 'dungeon_block', chance: 0.3 },
    ],
  },

  // THE OSSUARY — the Necropolis' interior sanctum (realm-only: frontier
  // false; the deadwake uber arena mints it, rolling a variant per seat).
  // Bone IS the ground truth here: pale heaped dead over dark charnel loam —
  // the graveland's purple gloom stays outside. CLARITY doctrine: the floor
  // runs DARK and matte so every pale solid (mounds, shelf-rows, arches)
  // reads at a glance; braziers + niche candle-glow anchor the sightlines;
  // the two variants keep distinct silhouettes (rolling dunes vs ruled rows).
  ossuary: {
    id: 'ossuary', frontier: false,
    nameFirst: ['Ossuary', 'Charnel', 'Bonewrought', 'Marrow', 'Reliquary', 'Skullbound', 'Palebone', 'Sepulchral', 'Hollowbone', 'Gravemarrow', 'Ivory', 'Femur-Laid', 'Knucklebone', 'Sanctified', 'Vaultbone', 'Litany', 'Requiem', 'Cist-Cold'],
    nameSecond: ['Sanctum', 'Vaults', 'Galleries', 'Reliquary', 'Bonefields', 'Cloister', 'Undercroft', 'Chambers', 'Tiers', 'Repository', 'Rotunda', 'Stacks', 'Cists', 'Wells', 'Procession', 'Charnel'],
    theme: {
      ambientDark: 0.22,
      fog: { banks: [1, 2], kinds: [{ id: 'grave_mist' }] },
      floor: '#171310', grid: '#201b16', border: '#5a5142',
      // Obstacle = BONE: the generic rock/cliff stamps reskin into pale
      // knuckle-rubble and bone bluffs with zero painter edits.
      obstacle: '#c9bda2', obstacleEdge: '#7a705c', accent: '#e8dcb0',
      wall: '#b3a88c', mud: '#2e2822', chasm: '#080605',
      // Bone-flecked charnel loam: dark mottle with pale chips surfacing.
      ground: {
        palette: ['#141009', '#1d1812', '#262019', '#332c22', '#4a4234', '#7a6f58'],
        bias: 0.42, alpha: 0.5, speckles: 1.5, strength: 1.1,
      },
    },
    sizeW: [1400, 1800], sizeH: [1050, 1350], biome: 'ossuary',
    caveLayouts: { plains: 1 }, // the open charnel crawl — the STAMPS carry the identity
    compositions: [{ composition: 'charnel_rotunda', chance: 0.5 }],
    // What the sanctum always IS, whichever face it shows: litter drifts,
    // sealed urns and their tenants, marrow-fires, counted-dead markers, the
    // odd overflow pit, a great bone chunk barring a lane.
    common: [
      { kind: 'bone_pile', count: [8, 14] },
      { kind: 'bone', count: [2, 4] },
      { kind: 'burial_urn', count: [3, 6] },
      { kind: 'brazier', count: [2, 4] },
      { kind: 'bone_cairn', count: [2, 4] },
      { kind: 'charnel_pit', count: [1, 2] },
    ],
    layout: [
      { kind: 'bone_mound', count: [3, 5] },
      { kind: 'rib_arch', count: [3, 5] },
      { kind: 'ossuary_niche', count: [2, 4] },
      { kind: 'rocks', count: [4, 6], radius: [14, 26] },
      { kind: 'formation', count: [1, 2], formation: 'charnel_dunes' },
      { kind: 'formation', count: [0, 1], formation: 'reliquary_rows' },
    ],
    variants: [
      // The open face: rolling dunes of the counted dead, pits where the
      // overflow was tipped — silhouette = mounded curves, long sightlines.
      { name: 'bonefields', layout: [
        { kind: 'bone_mound', count: [7, 10] },
        { kind: 'bone_pile', count: [10, 16] },
        { kind: 'charnel_pit', count: [2, 3] },
        { kind: 'formation', count: [2, 3], formation: 'charnel_dunes' },
        { kind: 'rib_arch', count: [2, 4] },
        { kind: 'rocks', count: [2, 4], radius: [14, 26] },
      ] },
      // The kept face: ruled corridor-rows of shelf-walls under candle-glow,
      // a processional colonnade — silhouette = straight lines, tight lanes.
      { name: 'reliquary', layout: [
        { kind: 'formation', count: [3, 5], formation: 'reliquary_rows' },
        { kind: 'formation', count: [1, 2], formation: 'ossuary_colonnade' },
        { kind: 'ossuary_niche', count: [4, 7] },
        { kind: 'burial_urn', count: [3, 5] },
        { kind: 'brazier', count: [2, 3] },
        { kind: 'bone_mound', count: [1, 2] },
      ] },
    ],
    // The sanctum's dead are BONE + SPIRIT — no flesh, no vermin (the crypt
    // keeps its zombies; identity is the roster too).
    packs: {
      count: [4, 6], size: [3, 5],
      table: [
        { id: 'skeleton_warrior', weight: 3 },
        { id: 'skeleton_archer', weight: 3 },
        { id: 'crypt_warden', weight: 3, presence: { from: 6, fadeIn: 3 } },
        { id: 'bone_serpent', weight: 2, presence: { from: 8, fadeIn: 4 } },
        { id: 'barrow_wight', weight: 2, presence: { from: 10, fadeIn: 5 } },
        { id: 'poltergeist', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'banshee', weight: 1, presence: { from: 12, fadeIn: 6 } },
        { id: 'lich_marshal', weight: 1, presence: { from: 14, fadeIn: 6 } },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [
      { kind: 'clear', weight: 3 },
      { kind: 'spawners', weight: 2 },
    ],
  },

  // BEACH — a sun-bleached coast: sand, wading shallows, palms, scattered wilds.
  beach: {
    id: 'beach',
    nameFirst: ['Sunbleached', 'Saltworn', 'Tide-Carved', 'Driftwood', 'Coral', 'Surf-Beaten', 'Foamcrest', 'Seawind', 'Brinewashed', 'Pearl-Strewn', 'Wracklittered', 'Sandscoured', 'Glittering', 'Spraylashed', 'Shellbound', 'Tidefall', 'Saltgrass', 'Lowtide'],
    nameSecond: ['Shore', 'Coast', 'Strand', 'Shallows', 'Cove', 'Bar', 'Beach', 'Reach', 'Spit', 'Foreshore', 'Tideline', 'Sands', 'Bay', 'Inlet', 'Surf', 'Margin'],
    theme: {
      dayLight: 1.35,
      heat: 0.75,
      ground: { scale: 2.0, stretchX: 1.6, strength: 1.1, speckles: 0.6 },
      floor: '#15140e', grid: '#221f16', border: '#7a6e44',
      obstacle: '#5c5230', obstacleEdge: '#8a7a48', accent: '#e8d060',
      sand: '#d8c890', water: '#1d6a8a', tree: '#3a6a2a', mud: '#5a5030',
    },
    sizeW: [2400, 3200], sizeH: [1600, 2200], ellipseChance: 0.3, biome: 'beach',
    layout: [
      { kind: 'log', count: [1, 3] }, { kind: 'reeds', count: [1, 3] },
      { kind: 'fishing_rack', count: [1, 2] },
      { kind: 'sand', count: [5, 8] },
      { kind: 'shallows', count: [2, 4] },
      { kind: 'palm', count: [6, 10] },
      { kind: 'water', count: [1, 2] },
      { kind: 'kelp', count: [2, 5] },
      { kind: 'coral', count: [2, 4], radius: [14, 24] },
      { kind: 'rocks', count: [3, 6], radius: [18, 40] },
      { kind: 'cave', count: [0, 1] },
      // STRATA set-pieces: shade arcs near the waterline the rows above
      // poured, ridge crescents banked toward the zone rim, a kelp wall in
      // the surf itself.
      { kind: 'formation', count: [1, 2], formation: 'palm_strand',
        where: { field: 'shore', max: 0.5, params: { kinds: ['water'], reach: 180 } } },
      { kind: 'formation', count: [1, 2], formation: 'dune_ridges',
        where: { field: 'radial', min: 0.55 } },
      { kind: 'formation', count: [0, 1], formation: 'kelp_curtain',
        where: { field: 'shore', max: 0.35, params: { kinds: ['water'], reach: 160 } } },
    ],
    packs: {
      count: [5, 7], size: [3, 5],
      table: [
        { id: 'fen_hound', weight: 3, presence: { to: 16, fadeOut: 8 } },
        { id: 'blood_mite', weight: 3, presence: { to: 14, fadeOut: 7 } },
        { id: 'dune_stalker', weight: 2 },
        { id: 'gnoll_prowler', weight: 2 },
        // The Deep washes ashore in the shallows (a lighter presence than the abyss).
        { id: 'deep_thresher', weight: 2 },
        { id: 'deep_angler', weight: 1, presence: { from: 7, fadeIn: 3 } },
        { id: 'sand_wyrm', weight: 1, presence: { from: 9, fadeIn: 4 } },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [
      { kind: 'clear', weight: 3 },
      { kind: 'escape', weight: 2 },
      { kind: 'spawners', weight: 2 },
      { kind: 'waves', weight: 1 },
    ],
  },

  // MEADOW — a gentle grove breather: grass, scattered trees, low-threat wilds.
  meadow: {
    id: 'meadow',
    compositions: [{ composition: 'orchard_rows', chance: 0.4 }, { composition: 'war_camp', chance: 0.1 }],
    nameFirst: ['Sunlit', 'Wildflower', 'Greenhollow', 'Honeybrook', 'Dappled', 'Springmoor', 'Cloverhill', 'Larksong', 'Daisychain', 'Goldengrass', 'Breezy', 'Sweetgrass', 'Buttercup', 'Gentlebrook', 'Verdant', 'Mossglen', 'Petalfall', 'Hazysun'],
    nameSecond: ['Meadow', 'Glade', 'Pasture', 'Vale', 'Downs', 'Greens', 'Lea', 'Field', 'Heath', 'Commons', 'Bloom', 'Reach', 'Dell', 'Sward', 'Clearing', 'Holt'],
    theme: {
      // Pond margins darken wet; the sward between scattered crowns lifts
      // sunlit (positional palette sampling — a meadow IS its clearings).
      ground: {
        palette: ['#131f0c', '#1e2f12', '#2a4218', '#3a5522', '#4a682c'], bias: 0.6, alpha: 0.5,
        coast: { reach: 90, shift: -0.38 },
        clearing: { reach: 120, lift: 0.18 },
      },
      dayLight: 1.15, nightDark: 0.6,
      floor: '#0e130c', grid: '#172013', border: '#3a5a2c',
      obstacle: '#2c4a22', obstacleEdge: '#477534', accent: '#9ed060',
      tree: '#3a7a34', grass: '#4e7a34', mud: '#1d2b16', water: '#1a4a54',
    },
    sizeW: [2300, 3200], sizeH: [1600, 2300], ellipseChance: 0.2, biome: 'grove',
    layout: [
      // A kept lawn at the heart of the lea — negative space first.
      { kind: 'clearing', count: [1, 2], radius: [100, 170] },
      { kind: 'wayshrine', count: [0, 1] }, { kind: 'weathered_statue', count: [0, 1] },
      // Wildflowers drift in NOISE patches, the way seed actually falls.
      { kind: 'flowers', count: [4, 8], where: { field: 'noise', max: 0.45, params: { scale: 420, seed: 11 } } },
      { kind: 'log', count: [0, 2] },
      { kind: 'ancient_tree', count: [0, 1] },
      { kind: 'grass', count: [6, 10] },
      { kind: 'trees', count: [8, 14] },
      { kind: 'grove', count: [2, 3] },
      { kind: 'brush', count: [3, 5] },
      { kind: 'water', count: [0, 1] },
      { kind: 'rocks', count: [3, 6], radius: [16, 32] },
      { kind: 'cairn', count: [0, 1] }, { kind: 'berry_bush', count: [1, 2] },
      { kind: 'cave', count: [0, 1] },
      { kind: 'structure', count: [0, 1], structure: 'faction_hall' },
      // Old field lines: hedgerows the pasture grew back around.
      { kind: 'formation', count: [1, 2], formation: 'oak_hedgerow' },
    ],
    packs: {
      count: [5, 7], size: [2, 4],
      table: [
        { id: 'thorn_sprite', weight: 3, presence: { to: 18, fadeOut: 9 } },
        { id: 'sylvan_warden', weight: 2 },
        { id: 'briar_beast', weight: 1, presence: { from: 9, fadeIn: 4 } },
        { id: 'dune_stalker', weight: 2 },
        { id: 'blood_mite', weight: 2, presence: { to: 14, fadeOut: 7 } },
        { id: 'fen_hound', weight: 1 },
        { id: 'sylvan_sapling', weight: 1, presence: { to: 12, fadeOut: 5 } },
        { id: 'twig_snarl', weight: 1, presence: { from: 5, fadeIn: 3, to: 20, fadeOut: 8 } },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [
      { kind: 'clear', weight: 3 },
      { kind: 'escape', weight: 2 },
      { kind: 'waves', weight: 2 },
    ],
    structures: [
      { structure: 'walled_manor', chance: 0.3 },
    ],
  },

  // PENINSULA — a near-round isle ringed by water: always an ellipse, all shore.
  peninsula: {
    id: 'peninsula',
    nameFirst: ['Lonely', 'Storm-Girt', 'Castaway', 'Far-Flung', 'Mistbound', 'Wave-Worn', 'Forsaken', 'Tideringed', 'Solitary', 'Gull-Haunted', 'Windswept', 'Lost', 'Saltcrowned', 'Far-Drifted', 'Brinegirt', 'Sundered', 'Forlorn', 'Sea-Locked'],
    nameSecond: ['Isle', 'Cay', 'Spit', 'Headland', 'Atoll', 'Holm', 'Islet', 'Reef', 'Skerry', 'Promontory', 'Shoal', 'Point', 'Cape', 'Sandbar', 'Ait', 'Eyot'],
    theme: {
      floor: '#16140d', grid: '#221f16', border: '#6a6244',
      obstacle: '#54502e', obstacleEdge: '#7a7044', accent: '#7ec8e8',
      sand: '#d4c084', water: '#14516e', tree: '#3a6a2a',
    },
    sizeW: [2000, 2800], sizeH: [1800, 2600], ellipseChance: 1, biome: 'isle',
    layout: [
      { kind: 'shallows', count: [7, 11] },
      { kind: 'sand', count: [4, 7] },
      { kind: 'palm', count: [8, 14] },
      { kind: 'rocks', count: [4, 7], radius: [18, 38] },
      { kind: 'kelp', count: [3, 6] },
      { kind: 'coral', count: [2, 5], radius: [14, 26] },
      { kind: 'water', count: [1, 2] },
      { kind: 'trees', count: [3, 6] },
    ],
    packs: {
      count: [5, 7], size: [3, 5],
      table: [
        { id: 'fen_hound', weight: 3, presence: { to: 16, fadeOut: 8 } },
        { id: 'blood_mite', weight: 3, presence: { to: 14, fadeOut: 7 } },
        { id: 'dune_stalker', weight: 2 },
        // The Deep haunts the surrounding shallows of these lonely isles.
        { id: 'deep_thresher', weight: 2 },
        { id: 'deep_angler', weight: 1, presence: { from: 6, fadeIn: 3 } },
        { id: 'deep_tidecaller', weight: 1, presence: { from: 10, fadeIn: 4 } },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [
      { kind: 'clear', weight: 3 },
      { kind: 'escape', weight: 2 },
      { kind: 'spawners', weight: 2 },
    ],
  },

  // CAVERN — the underground a cave mouth descends into. Off the world graph:
  // minted by worldgen.mintCave, never reached through a frontier portal. No
  // biome tag (caves don't tint the map — they aren't on it). Tight and rocky.
  cavern: {
    id: 'cavern', frontier: false,
    // What a cave BECOMES underground: the classic convex crawl, the maggot-
    // lair warren, a catacomb dungeon, or a full maze — one seeded roll at
    // mint (mintCave), pure data.
    caveLayouts: { plains: 5.5, rooms: 2, dungeon: 1.5, labyrinth: 1 },
    nameFirst: ['Dripstone', 'Gloom', 'Hollow', 'Sunless', 'Blackrock', 'Echoing', 'Lightless', 'Dampstone', 'Crawlway', 'Stalactite', 'Deepdark', 'Mossgrot', 'Whispering', 'Coldstone', 'Slickrock', 'Veiled', 'Mirefoot', 'Lampless'],
    nameSecond: ['Cave', 'Grotto', 'Burrow', 'Den', 'Tunnels', 'Deep', 'Cavern', 'Warren', 'Crawl', 'Pocket', 'Undercroft', 'Gallery', 'Shaft', 'Vault', 'Maw', 'Reaches'],
    theme: {
      ambientDark: 0.5,
      floor: '#0c0c10', grid: '#15151c', border: '#3a3a4e',
      obstacle: '#26263a', obstacleEdge: '#44445e', accent: '#8a9ac8',
      chasm: '#040406', mud: '#16161e', water: '#12202c', lava: '#5a1606',
    },
    sizeW: [1200, 1700], sizeH: [900, 1300],
    layout: [
      { kind: 'web', count: [1, 3] }, { kind: 'bone_pile', count: [1, 3] }, { kind: 'brazier', count: [0, 2] },
      { kind: 'rocks', count: [14, 22], radius: [20, 46] },
      { kind: 'scree', count: [2, 4] }, { kind: 'rock_spire', count: [0, 2] },
      { kind: 'cliff', count: [3, 5] },
      { kind: 'chasm', count: [0, 2] },
      { kind: 'water', count: [0, 1] },
      { kind: 'lava', count: [0, 1] },
      // The brittle kit: old storage pots, plugs poised to fall, and a wall
      // that isn't one — EVERY cave hides at least one now (rooms-rolled
      // mazes hunt wall-adjacent cells; convex caves tuck it against a
      // cliff flank). Wave 2: gem lattices and seeping gas bladders.
      { kind: 'clay_pots', count: [1, 2] },
      { kind: 'crumbling_wall', count: [1, 3] },
      { kind: 'secret_wall', count: [1, 2] },
      { kind: 'crystal_cluster', count: [1, 3] },
      { kind: 'gas_pod', count: [0, 2] },
    ],
    packs: {
      count: [3, 5], size: [3, 5],
      table: [
        { id: 'fen_hound', weight: 3, presence: { to: 14, fadeOut: 7 } },
        { id: 'blood_mite', weight: 3, presence: { to: 12, fadeOut: 6 } },
        { id: 'dune_stalker', weight: 2 },
        { id: 'spitting_horror', weight: 1, presence: { from: 6, fadeIn: 3 } },
        { id: 'bone_serpent', weight: 1, presence: { from: 8, fadeIn: 4 } },
        // The cavern family: grubs carpet the shallows, the alarm-shriekers
        // and anglers of the dark arrive with depth, and some of the rocks
        // were never rocks.
        { id: 'rockgrub', weight: 3, presence: { to: 16, fadeOut: 8 } },
        { id: 'cave_bat', weight: 2 },
        { id: 'cavern_shrieker', weight: 1, presence: { from: 5, fadeIn: 3 } },
        { id: 'gloom_fisher', weight: 2, presence: { from: 9, fadeIn: 4 } },
        { id: 'stalagmite_lurker', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'grub_clutch', weight: 1 },
        // The soft things the grubs grow from — and what lays them.
        { id: 'giant_maggot', weight: 2, presence: { to: 18, fadeOut: 8 } },
        { id: 'maggot_queen', weight: 1, presence: { from: 10, fadeIn: 5 } },
        { id: 'widow_matron', weight: 1, presence: { from: 12, fadeIn: 5 } },
        { id: 'bulwark_scuttler', weight: 1, presence: { from: 9, fadeIn: 4 } },
      ],
    },
    // The dark's own destructible: clutches, not altars.
    spawnerId: 'grub_clutch',
    biome: 'cavern',
    objectives: [
      { kind: 'clear', weight: 1 },
      { kind: 'spawners', weight: 1 },
    ],
    structures: [
      { structure: 'dungeon_block', chance: 0.22 },
    ],
  },

  // DESCENT — the boundless abyss the Delver's mineshaft drops into. Minted as a
  // BOUNDLESS cave (worldgen.mintCave forces boundless + layoutType 'descent'); the
  // sizeW/H is just the STARTER patch the engine streams outward from. Packs the
  // Depthkin. An alien, near-lightless palette — the claustrophobia is the dark.
  descent: {
    // biome 'cavern': the abyss shares the underground's ambient life (bats,
    // grubs in the dark) — without a biome tag the wildlife table fell back
    // to PLAINS and hares grazed the bottomless dark (the sea had the same
    // leak; see spawnWildlife's special-gate).
    id: 'descent', frontier: false, boundless: true, forceLayout: 'descent', biome: 'cavern',
    nameFirst: ['Sightless', 'Devouring', 'Whispering', 'Yawning', 'Starless', 'Hollowing', 'Bottomless', 'Gnawing', 'Soundless', 'Endless', 'Forsaken', 'Drowning', 'Unlit', 'Cavernous', 'Swallowing', 'Hungering', 'Voidsunk', 'Plummeting'],
    nameSecond: ['Abyss', 'Descent', 'Deep', 'Maw', 'Gulf', 'Pit', 'Plunge', 'Fall', 'Drop', 'Throat', 'Hollow', 'Chasm', 'Sink', 'Void', 'Shaft', 'Reaches'],
    theme: {
      floor: '#070610', grid: '#100e1c', border: '#241f3a',
      obstacle: '#1c1830', obstacleEdge: '#3a3056', accent: '#7fe0d8',
      chasm: '#020205', mud: '#100c1a', water: '#0a1622',
    },
    sizeW: [2400, 2600], sizeH: [2400, 2600],
    layout: [], // the 'descent' layout generator builds terrain (ignores this)
    packs: {
      count: [2, 3], size: [2, 3], // light initial batch — the streamed spawner carries pressure
      table: [
        { id: 'depthkin_crawler', weight: 4 },
        { id: 'depthkin_lurker', weight: 3, presence: { from: 5, fadeIn: 3 } },
        { id: 'depthkin_seer', weight: 2, presence: { from: 8, fadeIn: 4 } },
        { id: 'depthkin_brute', weight: 1, presence: { from: 12, fadeIn: 5 } },
        // Even the Depthkin skirt the oldest lurkers.
        { id: 'stalagmite_lurker', weight: 1, presence: { from: 12, fadeIn: 5 } },
        { id: 'gloom_fisher', weight: 1, presence: { from: 14, fadeIn: 5 } },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [
      { kind: 'clear', weight: 1 },
    ],
  },

  // --- FRACTURE CAPSTONE REALMS: the themed boss chambers a Fracture's reward
  //     rift opens into. Realm-only (no frontier references them); the engine
  //     OVERRIDES their packs with the variant's faction roster on mint, so the
  //     pack tables below are just a sane fallback. Distinct palettes give each
  //     rift its own feel. ---

  // THE GRAND ARENA — a gladiatorial colosseum (Daresso's bones): a bright
  // sand pit under open sky, thick stands FULL OF CROWD (the colosseum
  // recipe seats crowd_row spectators facing the fight), gate mouths where
  // the ways in breach the ring, standards and braziers on the rail. Realm-
  // only: the crusade sanctum fights its Leader here, before his people —
  // who answer his champion-calls, and abandon him when he falls.
  grand_arena: {
    id: 'grand_arena', frontier: false,
    nameFirst: ['Gilded', 'Roaring', 'Sunbleached', 'Crowned', 'Thousand-Eye', 'Bloodsanded', 'Triumphal', 'Laurelled', 'Clamoring', 'Old Victory', 'Banner-Hung', "Champion's", "Gladiator's", 'Oathsworn', 'Spearwall', 'Trumpet-Rung'],
    nameSecond: ['Colosseum', 'Arena', 'Circus', 'Pit', 'Amphitheatre', 'Proving Grounds', 'Ring', 'Cauldron', 'Stands', 'Crucible', 'Bloodfloor', 'Spectacle', 'Court', 'Tourney Field', 'Grand Tier', 'Royal Box'],
    theme: {
      dayLight: 1.1,
      // The pit is BRIGHT sand (clarity: the fight reads against it); the
      // stands run darker stonework; the accent is the crowd's gold.
      floor: '#b89f72', grid: '#a8905f', border: '#6a5a40',
      obstacle: '#8a7a5c', obstacleEdge: '#5a4c38', accent: '#e8c85a',
      wall: '#7a6a4c', mud: '#8a744e', chasm: '#241c12',
      ground: {
        palette: ['#a08a5e', '#ab9367', '#b89f72', '#c2ab80', '#ccb68c'],
        bias: 0.52, alpha: 0.5, speckles: 0.7,
      },
    },
    sizeW: [1250, 1500], sizeH: [980, 1150],
    forceLayout: 'colosseum',
    layoutParams: { standWidth: 130, crowdStep: 56, rimBanners: 10 },
    layout: [], // the recipe IS the set-piece — no scatter competes with the pit
    packs: {
      count: [2, 3], size: [2, 3],
      table: [
        { id: 'bandit_cutthroat', weight: 2 },
        { id: 'bandit_bruiser', weight: 2 },
        { id: 'bandit_keeper', weight: 1 },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [{ kind: 'clear', weight: 1 }],
  },

  // ABYSSAL — a lightless void: jagged shards, yawning chasms, grasping tendrils.
  // THE ABYSSAL RIFT — the fracture capstone's lightless deep, PoE-abyss
  // bones: a near-black crust the abyss GLOWS THROUGH (crack-runs chained
  // underfoot), riven spike-reefs raking the ground into lanes, and true
  // bottomless rents (fall recovery) that make the crossing itself the
  // hazard. The winding cave-gut is its natural shape — narrow ways over
  // the drop. Everything violet: the Abyssal faction's own light.
  abyssal_rift: {
    id: 'abyssal_rift', frontier: false,
    nameFirst: ['Yawning', 'Sunless', 'Hungering', 'Lightless', 'Riven', 'Devouring', 'Gnashing', 'Voidtorn', 'Maddening', 'Eldergloom', 'Soulrent', 'Unmade', 'Screaming', 'Blacktide', 'Annihilent', 'Coilshadow', 'Abyssborn', 'Witherdark'],
    nameSecond: ['Abyss', 'Maw', 'Deep', 'Descent', 'Hollow', 'Rift', 'Gulf', 'Void', 'Throat', 'Sink', 'Chasm', 'Tear', 'Vortex', 'Wound', 'Pit', 'Nadir'],
    theme: {
      ambientDark: 0.5,
      floor: '#070409', grid: '#100a18', border: '#3a2150',
      obstacle: '#221430', obstacleEdge: '#54367a', accent: '#b060e8',
      chasm: '#040108', mud: '#140b1c', water: '#180e2a', lava: '#5a1c8a',
      // The crust: black loam the violet glow bleeds up through.
      ground: {
        palette: ['#050308', '#0a0610', '#100a18', '#181026', '#241638'],
        bias: 0.42, alpha: 0.55, speckles: 0.7,
      },
    },
    sizeW: [1300, 1700], sizeH: [1000, 1300],
    caveLayouts: { winding: 2, plains: 1 }, // narrow ways over the drop
    common: [
      { kind: 'formation', count: [2, 3], formation: 'crack_run' },
      { kind: 'abyss_crack', count: [2, 4] },
      { kind: 'vines', count: [2, 4] },
    ],
    layout: [
      { kind: 'abyssal_rent', count: [2, 3] },
      { kind: 'formation', count: [1, 2], formation: 'spine_reef' },
      { kind: 'abyss_spine', count: [6, 10] },
      { kind: 'rocks', count: [10, 14], radius: [18, 42] },
      { kind: 'cliff', count: [2, 4] },
      { kind: 'ravine', count: [1, 2] },
    ],
    packs: {
      count: [3, 5], size: [3, 5],
      table: [
        { id: 'abyssal_crawler', weight: 3 },
        { id: 'abyssal_wretch', weight: 3 },
        { id: 'abyssal_seer', weight: 2 },
        { id: 'abyssal_render', weight: 2 },
        { id: 'abyssal_vanguard', weight: 1 },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [{ kind: 'clear', weight: 1 }],
    biome: 'rift',
  },

  // LEYLINE — an arcane confluence: crystal nodes, energy pools, rime channels.
  // THE LEYLINE NEXUS — the fracture capstone's elemental confluence. ONE kit
  // (currents underfoot, crystal fonts, resonance nodes), FOUR element FACES:
  // each variant re-THEMES the arena (TilesetVariant.theme — the accent tints
  // every 'theme:'-token doodad free) and swaps in its element's ground truth
  // + its resonance node — the standing hazard that changes how the ground is
  // crossed. Pyre volleys arcing orbs over poured lava; gale lances random
  // beams; rime chills a wash band over frozen pools; stone grinds among
  // dense rubble and drops. The current — the ley_current chains — runs
  // through every face: the leyline IS the place.
  leyline_nexus: {
    id: 'leyline_nexus', frontier: false,
    // Someone farms these leylines: battery rows in swept work-yards.
    compositions: [{ composition: 'energist_cache', chance: 0.45 }],
    nameFirst: ['Resonant', 'Arcane', 'Shimmering', 'Sundered', 'Humming', 'Crystalline', 'Luminous', 'Etherbright', 'Flux-Wracked', 'Singing', 'Glimmering', 'Spellbound', 'Aether-Charged', 'Pulsing', 'Radiant', 'Star-Threaded', 'Manaforged', 'Coruscant'],
    nameSecond: ['Nexus', 'Confluence', 'Weave', 'Lattice', 'Wellspring', 'Leyline', 'Conflux', 'Skein', 'Junction', 'Spire', 'Wellhead', 'Matrix', 'Vortex', 'Threadwork', 'Font', 'Loom'],
    theme: {
      ambientDark: 0.26,
      floor: '#070d15', grid: '#0d1822', border: '#2a5066',
      obstacle: '#1a3a4a', obstacleEdge: '#3a6a8a', accent: '#60d0ff',
      chasm: '#030810', mud: '#0c1a22', water: '#0a2c44',
      ground: {
        palette: ['#05090f', '#0a121c', '#101c2a', '#182a3a', '#22384c'],
        bias: 0.46, alpha: 0.5, speckles: 0.9,
      },
    },
    sizeW: [1300, 1700], sizeH: [1000, 1300],
    caveLayouts: { plains: 2, winding: 1 },
    // The current runs through EVERY face: leyline chains + surfacing fonts.
    common: [
      { kind: 'formation', count: [2, 3], formation: 'ley_current' },
      { kind: 'ley_font', count: [2, 4] },
      { kind: 'rocks', count: [8, 12], radius: [16, 34] },
    ],
    layout: [
      { kind: 'cliff', count: [3, 5] },
      { kind: 'water', count: [2, 4] },
      { kind: 'ice', count: [1, 3] },
      { kind: 'chasm', count: [1, 2] },
    ],
    variants: [
      // PYRE — the current runs molten: ember accent, poured lava, orb-volley nodes.
      { name: 'pyre confluence',
        theme: { accent: '#ff8a3a', border: '#5a2a12', obstacle: '#3a1a10', obstacleEdge: '#7a3a1e',
          mud: '#1e0e08', ground: { palette: ['#0f0705', '#180b06', '#221008', '#30160a', '#42200e'], bias: 0.44, alpha: 0.55, speckles: 1.1 } },
        layout: [
          { kind: 'lava', count: [2, 4] },
          { kind: 'cinder', count: [1, 2] },
          { kind: 'pyre_node', count: [3, 5] },
          { kind: 'cliff', count: [2, 4] },
          { kind: 'chasm', count: [0, 1] },
        ] },
      // GALE — the current crackles: storm accent, charged leavings, beam-lance nodes.
      { name: 'gale confluence',
        theme: { accent: '#8fd8ff', border: '#2a4a66', obstacle: '#14303e', obstacleEdge: '#3a6a8a',
          ground: { palette: ['#060b12', '#0b141e', '#12202c', '#1a2e3e', '#264052'], bias: 0.48, alpha: 0.5, speckles: 1.3 } },
        layout: [
          { kind: 'gale_node', count: [3, 5] },
          { kind: 'charged_crystal', count: [4, 7] },
          { kind: 'static_bloom', count: [3, 5] },
          { kind: 'storm_glass', count: [2, 4] },
          { kind: 'cliff', count: [2, 4] },
        ] },
      // RIME — the current freezes: ice accent, frozen pools, chill-band nodes.
      { name: 'rime confluence',
        theme: { accent: '#b8e8ff', border: '#3a5a76', obstacle: '#1c3448', obstacleEdge: '#4a7294',
          water: '#0e3450', ground: { palette: ['#070d14', '#0d1620', '#14222e', '#1e3242', '#2c4658'], bias: 0.5, alpha: 0.5, speckles: 1.2 } },
        layout: [
          { kind: 'ice', count: [3, 5] },
          { kind: 'water', count: [2, 3] },
          { kind: 'rime_node', count: [3, 5] },
          { kind: 'cliff', count: [2, 4] },
        ] },
      // STONE — the current grinds: earthen accent, dense rubble and drops, grind nodes.
      { name: 'stone confluence',
        theme: { accent: '#d8b06a', border: '#4a3a22', obstacle: '#2e2418', obstacleEdge: '#5e4a2e',
          ground: { palette: ['#0b0906', '#14100a', '#1e1810', '#282016', '#342a1c'], bias: 0.44, alpha: 0.55, speckles: 1.0 } },
        layout: [
          { kind: 'stone_node', count: [3, 5] },
          { kind: 'rocks', count: [10, 14], radius: [20, 44] },
          { kind: 'cliff', count: [3, 5] },
          { kind: 'chasm', count: [2, 3] },
          { kind: 'formation', count: [1, 2], formation: 'boulder_train' },
        ] },
    ],
    packs: {
      count: [3, 5], size: [3, 5],
      table: [
        { id: 'ember_elemental', weight: 3 },
        { id: 'gale_elemental', weight: 3 },
        { id: 'frost_elemental', weight: 2 },
        { id: 'stone_sentinel', weight: 1 },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [{ kind: 'clear', weight: 1 }],
  },

  // HELLION — a riftborn pit: molten cracks, brimstone shards, charred ground.
  hellion_rift: {
    id: 'hellion_rift', frontier: false,
    nameFirst: ['Smouldering', 'Hellforged', 'Ashen', 'Brimstone', 'Charred', 'Molten', 'Infernal', 'Cinderwrought', 'Damned', 'Pyreborn', 'Searing', 'Slagbound', 'Hellcracked', 'Emberlit', 'Scorchfiend', 'Soulforged', 'Magmaheart', 'Wrathkindled'],
    nameSecond: ['Pit', 'Maw', 'Crucible', 'Inferno', 'Foundry', 'Hellmouth', 'Forge', 'Pyre', 'Furnace', 'Cauldron', 'Gehenna', 'Smeltery', 'Cinderpit', 'Hollow', 'Abyss', 'Coals'],
    theme: {
      ambientDark: 0.3,
      floor: '#140706', grid: '#1f0d0a', border: '#5a1f12',
      obstacle: '#3a1408', obstacleEdge: '#7a2c12', accent: '#ff6a2a',
      chasm: '#0a0302', mud: '#1e0e08', water: '#3a1208', lava: '#7a1a08',
    },
    sizeW: [1300, 1700], sizeH: [1000, 1300],
    layout: [
      { kind: 'rocks', count: [12, 18], radius: [18, 46] },
      { kind: 'cliff', count: [3, 5] },
      { kind: 'lava', count: [3, 5] },
      { kind: 'chasm', count: [1, 2] },
    ],
    packs: {
      count: [3, 5], size: [3, 5],
      table: [
        { id: 'imp', weight: 3 },
        { id: 'hellhound', weight: 3 },
        { id: 'cinder_fiend', weight: 2 },
        { id: 'searing_spawn', weight: 2 },
        { id: 'dread_fiend', weight: 1 },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [{ kind: 'clear', weight: 1 }],
    biome: 'rift',
  },

  // ELDRITCH — a blighted, writhing land an Incursion lands + locks (Conclave Pass 2).
  // Minted CONCEALED + floating far off the charted frontier; native to the Eldritch
  // faction. An overgrown, tentacular feel from vines/thicket/bog (adornment-based
  // tentacle mutation lands in Pass 2c). biome 'eldritch' tints it on the heat-map.
  eldritch: {
    id: 'eldritch', frontier: false,
    // Abandoned works: whoever racked these cells did not stay to spend them.
    compositions: [{ composition: 'energist_cache', chance: 0.2 }],
    nameFirst: ['Writhing', 'Unblinking', 'Gibbering', 'Squamous', 'Whispering', 'Fathomless', 'Maddening', 'Coiling', 'Slithering', 'Unknowable', 'Pallid', 'Eyeless', 'Murmuring', 'Tendril-Choked', 'Cyclopean', 'Nameless', 'Aberrant', 'Star-Spawned'],
    nameSecond: ['Reach', 'Maw', 'Hollow', 'Gaze', 'Tangle', 'Verge', 'Coil', 'Tangleweb', 'Sprawl', 'Murmur', 'Whorl', 'Brood', 'Snarl', 'Wound', 'Threshold', 'Tendrils'],
    theme: {
      ambientDark: 0.35,
      floor: '#0a0f0b', grid: '#0f1810', border: '#3a5a44',
      obstacle: '#1c3a2c', obstacleEdge: '#3a6a4e', accent: '#7fce6a',
      chasm: '#040806', mud: '#10180e', water: '#0c2620', tree: '#2a4a36', wall: '#3a3a52',
    },
    sizeW: [2200, 3000], sizeH: [1500, 2200], ellipseChance: 0.3, biome: 'eldritch',
    layout: [
      { kind: 'vines', count: [5, 8] },
      { kind: 'thicket', count: [2, 4] },
      { kind: 'swamp', count: [2, 3] },
      { kind: 'bog', count: [1, 2] },
      { kind: 'rocks', count: [5, 9], radius: [18, 40] },
      { kind: 'chasm', count: [1, 2] },
      { kind: 'cliff', count: [1, 2] },
      { kind: 'water', count: [0, 1] },
      { kind: 'ruin', count: [0, 1] },
    ],
    packs: {
      count: [4, 7], size: [3, 5],
      table: [
        { id: 'conclave_blood_demon', weight: 3 },
        { id: 'conclave_eldritch_horror', weight: 1 },
        // The ward-unsinger stalks where wards matter most.
        { id: 'null_adept', weight: 2 },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [
      { kind: 'clear', weight: 3 },
      { kind: 'spawners', weight: 1 },
    ],
  },

  // DEEP SEA — the open ocean (biome 'deepsea', → underwater layout). Mostly deep
  // water (you swim + your breath drains) dotted with air-pocket bubbles and void
  // trenches; reach the next air pocket before you drown.
  deepsea: {
    id: 'deepsea', biome: 'deepsea',
    compositions: [{ composition: 'kelp_gyre', chance: 0.3 }],
    nameFirst: ['Sunken', 'Abyssal', 'Drowned', 'Fathomless', 'Tide-Lost', 'Lightless', 'Pressuredark', 'Brineblack', 'Leviathan', 'Pelagic', 'Sunless', 'Cold-Crushed', 'Hadal', 'Stillwater', 'Deepswell', 'Saltgloom', 'Trenchborn', 'Drownward'],
    nameSecond: ['Deep', 'Trench', 'Shelf', 'Reach', 'Sound', 'Gulf', 'Abyss', 'Fathoms', 'Current', 'Depths', 'Hollow', 'Sink', 'Drift', 'Brine', 'Maw', 'Shoals'],
    theme: {
      ambientFx: [{ kind: 'caustics' }, { kind: 'bubbles' }],
      ground: { scale: 1.8, stretchX: 1.4, strength: 0.9, speckles: 0.6 },
      ambientDark: 0.35,
      floor: '#08151f', grid: '#0d2030', border: '#2a6a8a',
      obstacle: '#163a4e', obstacleEdge: '#2f6a86', accent: '#5ad8e8',
      water: '#0c2740', chasm: '#02060a',
    },
    sizeW: [2200, 3000], sizeH: [1600, 2300], ellipseChance: 0.2,
    // The seabed everything grows from, whichever face the deep shows.
    common: [
      { kind: 'kelp', count: [3, 6] },
      { kind: 'coral', count: [2, 4], radius: [16, 28] },
      { kind: 'sea_rock', count: [3, 6], radius: [22, 42] },
      { kind: 'rocks', count: [2, 4], radius: [16, 34] },
    ],
    // SUB-BIOME FACES of the deep — the variance allowance the ocean grows
    // on. A thresher kelp forest you can vanish into (layered crowns break
    // sight both ways), a reef garden, an open drift. Future faces — vent
    // fields, abyssal shelves — join as rows here, never as code.
    variants: [
      { name: 'kelp forest', layout: [
        { kind: 'cluster', count: [2, 3], cluster: 'kelp_forest' },
        { kind: 'giant_kelp', count: [3, 6] },
        { kind: 'kelp', count: [4, 8] },
        // Drifting frond WALLS between the stands — corridors of blindness.
        { kind: 'formation', count: [1, 2], formation: 'kelp_curtain' },
        // Current-plaited ropes threading the stands (the braid arranger).
        { kind: 'formation', count: [0, 1], formation: 'kelp_braid' },
      ] },
      { name: 'reef', layout: [
        { kind: 'coral', count: [7, 12], radius: [16, 30] },
        { kind: 'sea_rock', count: [3, 5], radius: [22, 42] },
        { kind: 'crystal_cluster', count: [0, 2] },
      ] },
      { name: 'open drift', layout: [
        { kind: 'chasm', count: [0, 1] },
        { kind: 'kelp', count: [2, 4] },
        { kind: 'boulder_field', count: [0, 1] },
      ] },
    ],
    // Superseded by common + variants for random mints; kept for authored
    // spec paths that read the base directly.
    layout: [],
    packs: {
      count: [5, 8], size: [3, 5],
      table: [
        { id: 'deep_thresher', weight: 4 },
        { id: 'deep_angler', weight: 3, presence: { from: 6, fadeIn: 3 } },
        { id: 'deep_tidecaller', weight: 2, presence: { from: 10, fadeIn: 4 } },
        { id: 'deep_leviathan', weight: 1, presence: { from: 16, fadeIn: 8 } },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [{ kind: 'clear', weight: 3 }, { kind: 'escape', weight: 1 }],
  },

  // HIGHLAND — windswept crags (biome 'highland', → rooms layout = a mountain-pass
  // maze of corridors and chambers carved into the rock).
  highland: {
    id: 'highland', biome: 'highland',
    compositions: [{ composition: 'stone_sanctum', chance: 0.35 }, { composition: 'powder_cache', chance: 0.18 }, { composition: 'war_camp', chance: 0.14 }, { composition: 'fallen_colossus', chance: 0.14 }, { composition: 'cistern_court', chance: 0.1 }],
    nameFirst: ['Craggy', 'Windswept', 'Stoneback', 'Highreach', 'Granite', 'Cloudbound', 'Rugged', 'Skyworn', 'Bleakcrag', 'Frostcap', 'Eagle-Haunted', 'Hewnstone', 'Loftbound', 'Grey-Peaked', 'Stormcrest', 'Boulderfall', 'Wind-Scoured', 'Stark'],
    nameSecond: ['Pass', 'Crags', 'Bluffs', 'Heights', 'Ridge', 'Tor', 'Summit', 'Escarp', 'Highlands', 'Cairn', 'Peaks', 'Spur', 'Scree', 'Cliffs', 'Saddle', 'Overlook'],
    theme: {
      floor: '#13130f', grid: '#1d1c16', border: '#5a5240',
      obstacle: '#3a3528', obstacleEdge: '#6a6048', accent: '#c8b890',
      wall: '#4a4436', mud: '#3a3428',
    },
    sizeW: [2200, 3000], sizeH: [1600, 2300], ellipseChance: 0,
    layout: [
      { kind: 'rocks', count: [4, 8], radius: [20, 42] },
      { kind: 'boulder_field', count: [1, 2] }, { kind: 'cairn', count: [1, 2] },
      { kind: 'scree', count: [1, 3] },
      { kind: 'gallows', count: [0, 1] }, { kind: 'wayshrine', count: [0, 1] },
      // Rockslides strung downslope + a processional the old folk cut.
      { kind: 'formation', count: [1, 2], formation: 'boulder_train' },
      { kind: 'formation', count: [0, 1], formation: 'standing_avenue' },
      // Storm-swept moors remember their strikes.
      { kind: 'formation', count: [0, 1], formation: 'fulgurite_scar' },
      { kind: 'charged_crystal', count: [0, 2] },
      // Crags crown the HIGH ground (elevation strata: coherent height noise
      // domed toward the zone's heart).
      { kind: 'rocks', count: [2, 4], radius: [20, 44],
        where: { field: 'elevation', min: 0.62, params: { scale: 640, dome: 0.35 } } },
    ],
    packs: {
      count: [6, 9], size: [3, 5],
      table: [
        { id: 'brute', weight: 3 },
        { id: 'javelin_skirmisher', weight: 2, presence: { to: 20, fadeOut: 10 } },
        { id: 'stone_sentinel', weight: 2, presence: { from: 10, fadeIn: 5 } },
        { id: 'troll_mauler', weight: 1, presence: { from: 9, fadeIn: 5 } },
        { id: 'alpha_stalker', weight: 2, presence: { from: 10, fadeIn: 5 } },
        // The crag executioner: breaks the bar, then passes The Verdict.
        { id: 'pit_mauler', weight: 1, presence: { from: 8, fadeIn: 4 } },
        // The masterless blade drifts the high passes, practicing.
        { id: 'steppe_ronin', weight: 1, presence: { from: 5, fadeIn: 3 } },
        { id: 'gale_elemental', weight: 1, presence: { to: 18, fadeOut: 9 } },
        // The Horned Tribes' home crags — the full muster, khan at depth.
        { id: 'beastkin_gorer', weight: 3 },
        { id: 'beastkin_impaler', weight: 2, presence: { from: 4, fadeIn: 2 } },
        { id: 'beastkin_flayer', weight: 2, presence: { from: 8, fadeIn: 4 } },
        { id: 'beastkin_ritualist', weight: 1, presence: { from: 10, fadeIn: 5 } },
        { id: 'beastlord_khan', weight: 1, presence: { from: 16, fadeIn: 6 } },
        { id: 'molting_behemoth', weight: 1, presence: { from: 14, fadeIn: 6 } },
        { id: 'bulwark_scuttler', weight: 1, presence: { from: 9, fadeIn: 4 } },
      ],
    },
    spawnerId: 'rime_stone',
    objectives: [{ kind: 'clear', weight: 3 }, { kind: 'spawners', weight: 2 }],
  },

  // MARSH — fetid wetland (biome 'marsh', → islands layout = boggy islets between
  // sluggish water and mire).
  marsh: {
    id: 'marsh', biome: 'marsh',
    compositions: [{ composition: 'drowned_procession', chance: 0.4 }],
    nameFirst: ['Fetid', 'Sunken', 'Miremost', 'Rotbound', 'Stagnant', 'Murkwater', 'Reekwallow', 'Foulreek', 'Dankreed', 'Slumpwater', 'Gnatswarm', 'Greenscum', 'Cloywater', 'Sodden', 'Bogrot', 'Stillreek', 'Mudchurn', 'Drearmoor'],
    nameSecond: ['Marsh', 'Fen', 'Mire', 'Bog', 'Sump', 'Wetland', 'Slough', 'Quag', 'Reeds', 'Morass', 'Lowwater', 'Shallows', 'Mudflat', 'Sink', 'Hollow', 'Mere'],
    theme: {
      nightDark: 0.72,
      fog: { banks: [2, 3], kinds: [{ id: 'river_mist', weight: 2 }, { id: 'mist' }] },
      ground: { scale: 1.4, strength: 1.15 },
      floor: '#0e140e', grid: '#16201a', border: '#3a5240',
      obstacle: '#2a3a2c', obstacleEdge: '#496a4e', accent: '#8ad08a',
      water: '#1a3a30', mud: '#2a3424', tree: '#3a5a2a',
    },
    sizeW: [2200, 3000], sizeH: [1600, 2300], ellipseChance: 0.25,
    layout: [
      { kind: 'reeds', count: [3, 6] }, { kind: 'geyser', count: [1, 3] }, { kind: 'dead_tree', count: [2, 4] },
      { kind: 'fern', count: [1, 3] }, { kind: 'fishing_rack', count: [0, 1] },
      { kind: 'bog', count: [3, 5] }, { kind: 'water', count: [2, 4] },
      { kind: 'swamp', count: [2, 3] }, { kind: 'trees', count: [4, 7] },
      { kind: 'thicket', count: [1, 3] },
      // Marsh gas swells in bladders between the islets.
      { kind: 'gas_pod', count: [1, 3] },
      { kind: 'briarwood', count: [0, 2] },
      // The bog set: drowned timber, wisp-light, peat cover, venom blooms.
      { kind: 'sunken_log', count: [1, 3] },
      { kind: 'marsh_wisp', count: [2, 4] },
      { kind: 'peat_mound', count: [1, 2] },
      { kind: 'venom_bloom', count: [1, 3] },
      // The scavenger-web dressing: gel shallows (the quag gels' habitat
      // ground — radius clears their minRadius), drowned steles, barred logs.
      { kind: 'gel_pool', count: [2, 4], radius: [38, 64] },
      { kind: 'sunken_stone', count: [1, 3] },
      { kind: 'hollow_log', count: [0, 2] },
      // Rushes trace the waterlines the rows above pooled (shore strata).
      { kind: 'formation', count: [1, 3], formation: 'reed_shoreline',
        where: { field: 'shore', max: 0.6, params: { kinds: ['water', 'bog', 'swamp'], reach: 140 } } },
    ],
    packs: {
      count: [6, 9], size: [3, 5],
      table: [
        { id: 'fen_hound', weight: 3, presence: { to: 16, fadeOut: 8 } },
        { id: 'husk_swarmer', weight: 2, presence: { to: 18, fadeOut: 9 } },
        { id: 'bone_serpent', weight: 2, presence: { from: 8, fadeIn: 4 } },
        { id: 'zombie', weight: 2, presence: { to: 18, fadeOut: 9 } },
        { id: 'spitting_horror', weight: 1, presence: { from: 6, fadeIn: 3 } },
        { id: 'hex_weaver', weight: 1, presence: { from: 8, fadeIn: 4 } },
        // The wet rot: oozes in the shallows, the Glut's throwers at depth.
        { id: 'lesser_ooze', weight: 2, presence: { to: 10, fadeOut: 5 } },
        { id: 'viscous_ooze', weight: 1, presence: { from: 6, fadeIn: 3 } },
        { id: 'galvanic_ooze', weight: 1, presence: { from: 7, fadeIn: 3 } },
        { id: 'gutspray_hurler', weight: 1, presence: { from: 10, fadeIn: 4 } },
        // The ground itself: pools with appetites, water with arms.
        { id: 'mire_maw', weight: 2, presence: { from: 8, fadeIn: 4 } },
        { id: 'lake_horror', weight: 1, presence: { from: 10, fadeIn: 4 } },
        { id: 'mire_burrower', weight: 2, presence: { from: 7, fadeIn: 3 } },
        { id: 'bog_dweller', weight: 2, presence: { from: 6, fadeIn: 3 } },
        { id: 'tide_whelk', weight: 2, presence: { from: 5, fadeIn: 3 } },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [{ kind: 'clear', weight: 3 }, { kind: 'spawners', weight: 2 }, { kind: 'waves', weight: 1 }],
  },

  // FLESH — a writhing pulsing-flesh warren (biome:'flesh', → the circular flesh
  // layout). The chambers throb; sparse organic clutter; aberrant swarm.
  flesh: {
    id: 'flesh', biome: 'flesh',
    nameFirst: ['Pulsing', 'Writhing', 'Fleshborn', 'Gorged', 'Throbbing', 'Visceral', 'Sinewed', 'Bilegorged', 'Tumorous', 'Marrow-Deep', 'Quivering', 'Membranous', 'Engorged', 'Pus-Slick', 'Heartbound', 'Glistening', 'Distended', 'Wet-Walled'],
    nameSecond: ['Hollow', 'Womb', 'Gut', 'Maw', 'Warren', 'Tract', 'Gullet', 'Cavity', 'Innards', 'Bowel', 'Chamber', 'Sac', 'Viscera', 'Atrium', 'Sinew', 'Antrum'],
    theme: {
      ambientDark: 0.35,
      nightDark: 0.6,
      floor: '#180a10', grid: '#2a141a', border: '#7a3340',
      obstacle: '#5a2230', obstacleEdge: '#8a3848', accent: '#e86a7a', wall: '#5a2230',
      // RAW MUSCLE underfoot: a meat gradient stretched along the fiber
      // direction, blended smooth — tissue, not terrain.
      ground: {
        scale: 0.95, stretchX: 1.4, strength: 1.2, bias: 0.46, evenness: 0.6, speckles: 0.5,
        palette: ['#10050a', '#1c0910', '#2c0e17', '#3c1420', '#4c1a26'],
      },
      // A faint drift of shed cells catching what light there is.
      ambientFx: [{ kind: 'motes', intensity: 0.5, color: '#e86a7a' }],
    },
    sizeW: [2000, 2800], sizeH: [1500, 2200], ellipseChance: 0,
    // Organic clutter scattered INSIDE the carved chambers (fleshLayout walk-gates it):
    // pods and bone struts, viscera pools, then the flesh kit — membranes and
    // veins throbbing to the warren's ONE heartbeat, eye stalks tracking you,
    // rib arches, and (rarely) a row of teeth. The "Belly of the Beast" furnished.
    layout: [
      { kind: 'flesh_pod', count: [3, 6] }, { kind: 'bone', count: [2, 4] },
      { kind: 'gore', count: [2, 4] },
      { kind: 'flesh_membrane', count: [2, 4] }, { kind: 'vein_cluster', count: [3, 5] },
      { kind: 'eye_stalk', count: [2, 4] }, { kind: 'rib_arch', count: [1, 3] },
      { kind: 'tooth_row', count: [0, 2] },
    ],
    packs: {
      count: [6, 9], size: [3, 5],
      table: [
        { id: 'blood_mite', weight: 3, presence: { to: 14, fadeOut: 7 } },
        { id: 'spitting_horror', weight: 3 },
        { id: 'husk_swarmer', weight: 2, presence: { to: 18, fadeOut: 9 } },
        { id: 'bone_serpent', weight: 2, presence: { from: 8, fadeIn: 4 } },
        { id: 'zombie', weight: 2, presence: { to: 16, fadeOut: 8 } },
        // The Glut at home: the biome's OWN faction now walks its halls.
        { id: 'lesser_ooze', weight: 3, presence: { to: 12, fadeOut: 6 } },
        { id: 'viscous_ooze', weight: 3 },
        { id: 'gutspray_hurler', weight: 2, presence: { from: 6, fadeIn: 3 } },
        { id: 'membrane', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'flesh_amalgam', weight: 1, presence: { from: 14, fadeIn: 6, mul: 2 } },
        { id: 'corpse_bloom', weight: 1 },
        { id: 'spire_of_eyes', weight: 1, presence: { from: 12, fadeIn: 5 } },
      ],
    },
    // The Glut's own spawners-objective destructible: burst the blooms.
    spawnerId: 'corpse_bloom',
    objectives: [{ kind: 'clear', weight: 3 }, { kind: 'spawners', weight: 2 }],
  },

  // CRYSTAL — prismatic shard fields (biome:'crystal'). Crystal doodads fire random
  // laser beams (the crystal_beam effect) → a constant-movement dance.
  crystal: {
    id: 'crystal', biome: 'crystal',
    compositions: [{ composition: 'energist_cache', chance: 0.25 }],
    nameFirst: ['Prismatic', 'Shardbound', 'Glittering', 'Faceted', 'Resonant', 'Lucent', 'Refractive', 'Gleaming', 'Crystalline', 'Spectral', 'Glassgrown', 'Iridescent', 'Singing', 'Brilliant', 'Geodebound', 'Glasswrought', 'Sparkling', 'Light-Riven'],
    nameSecond: ['Geode', 'Spires', 'Lattice', 'Vault', 'Reach', 'Hollow', 'Shards', 'Facets', 'Cluster', 'Prism', 'Spindle', 'Fields', 'Cavern', 'Array', 'Bloom', 'Drift'],
    theme: {
      ambientDark: 0.3,
      floor: '#0e1320', grid: '#16203a', border: '#4a6aa8',
      obstacle: '#2a3a6a', obstacleEdge: '#5a7ad0', accent: '#9fd8ff', water: '#1a3a6a',
    },
    sizeW: [2200, 3000], sizeH: [1600, 2300], ellipseChance: 0.2,
    layout: [
      { kind: 'crystal', count: [5, 9] }, { kind: 'rocks', count: [3, 6], radius: [18, 38] },
      { kind: 'scree', count: [1, 3] },
      { kind: 'cliff', count: [1, 3] },
      // Knee-high lattices — the harvestable understory of the shard fields.
      { kind: 'crystal_cluster', count: [2, 5] },
      // A lode line breaking the surface in a run.
      { kind: 'formation', count: [1, 2], formation: 'crystal_run' },
    ],
    packs: {
      count: [6, 9], size: [3, 5],
      table: [
        { id: 'gale_elemental', weight: 3 },
        { id: 'storm_acolyte', weight: 2, presence: { from: 6, fadeIn: 3 } },
        { id: 'frost_elemental', weight: 2 },
        { id: 'stone_sentinel', weight: 2, presence: { from: 10, fadeIn: 5 } },
        { id: 'hex_weaver', weight: 1, presence: { from: 8, fadeIn: 4 } },
        // The leyline's own batteries.
        { id: 'shard_spire', weight: 2, presence: { from: 8, fadeIn: 4 } },
        // The ES POLE lives here: glimmer-chaff early, the glass wall deeper.
        { id: 'lumen_wisp', weight: 3, presence: { to: 14, fadeOut: 6 } },
        { id: 'glassguard_sentinel', weight: 2, presence: { from: 7, fadeIn: 4 } },
      ],
    },
    spawnerId: 'rime_stone',
    objectives: [{ kind: 'clear', weight: 3 }, { kind: 'spawners', weight: 2 }],
  },

  // VOLCANIC — an erupting caldera (biome:'volcanic'). Lava vents periodically
  // launch arcing lava orbs (the lava_orb effect) that splatter as fire AoE.
  volcanic: {
    id: 'volcanic', biome: 'volcanic',
    nameFirst: ['Erupting', 'Molten', 'Scorched', 'Cinderborn', 'Magmatic', 'Searing', 'Smokebelching', 'Fumarole', 'Ashveiled', 'Pyroclastic', 'Sulfur-Reeked', 'Lavaborn', 'Glowembered', 'Boiling', 'Cracked-Earth', 'Emberspewn', 'Furnace-Hot', 'Blistering'],
    nameSecond: ['Caldera', 'Vents', 'Crucible', 'Flows', 'Furnace', 'Maw', 'Fissure', 'Cinderfield', 'Lavaflats', 'Smokes', 'Pyre', 'Cone', 'Scoria', 'Hollow', 'Burn', 'Vent-Field'],
    theme: {
      dayLight: 1.15,
      heat: 1,
      ground: { scale: 0.75, strength: 1.3 },
      floor: '#160d08', grid: '#241208', border: '#6a3818',
      obstacle: '#48281a', obstacleEdge: '#8a4a26', accent: '#ff7a2a', lava: '#7a1a08', chasm: '#1b0703',
    },
    sizeW: [2400, 3200], sizeH: [1600, 2400], ellipseChance: 0.2,
    // Erupting calderas: a few big vents that volley a ring of orbs, smaller ember
    // vents peppering single orbs, and obsidian/ash/lava furnishing the field. Ground
    // hazards (lava pools, the ravine) are stamped FIRST so the hazard SOLIDS placed
    // after them honour their forbidOn — no vent/shard embedded in a pool or chasm.
    layout: [
      { kind: 'lava', count: [2, 3] }, { kind: 'ravine', count: [0, 1] },
      { kind: 'lava_vent', count: [2, 3] }, { kind: 'ember_vent', count: [2, 4] },
      { kind: 'obsidian', count: [4, 7] }, { kind: 'cinder', count: [2, 4] },
      { kind: 'rock_spire', count: [1, 2] }, { kind: 'scree', count: [1, 2] },
      // Slag levees (impassable — the wall the liquid lava no longer is)
      // and the odd cooled crack for the anglers.
      { kind: 'magma_core', count: [1, 2] },
      { kind: 'chasm', count: [0, 1] },
      // An ash-choked flow line, vents smoking along it (placed after the
      // pools so its vents honour their forbidOn against the ground).
      { kind: 'formation', count: [1, 2], formation: 'cinder_vein' },
    ],
    packs: {
      count: [6, 9], size: [3, 5],
      table: [
        { id: 'magma_worm', weight: 3 },
        { id: 'fire_cultist', weight: 2, presence: { to: 18, fadeOut: 9 } },
        { id: 'fire_golem', weight: 1, presence: { from: 10, fadeIn: 5 } },
        { id: 'brute', weight: 2, presence: { to: 16, fadeOut: 8 } },
        { id: 'spitting_horror', weight: 1, presence: { to: 14, fadeOut: 7 } },
        // The lava-lane burrower and the gather elite hold the deep flows.
        { id: 'magma_swimmer', weight: 2, presence: { from: 5, fadeIn: 3 } },
        { id: 'ruin_chanter', weight: 2, presence: { from: 7, fadeIn: 3 } },
        // The pools themselves have appetites now (lava is a LIQUID — wade
        // in after it), and the deeper cracks hold anglers.
        { id: 'magma_lurker', weight: 2, presence: { from: 6, fadeIn: 3 } },
        { id: 'void_angler', weight: 1, presence: { from: 9, fadeIn: 4 } },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [{ kind: 'clear', weight: 3 }, { kind: 'escape', weight: 2 }],
  },

  // MYCELIA — a bioluminescent fungal warren (biome:'mycelia' → the carved fungal-grotto
  // layout). Towering caps, puffing spore-pods, a glowing hyphal carpet; the slow 'fungal'
  // Bloom dwells here. The bloom's spore-density influence spreads OUT from these regions.
  mycelia: {
    id: 'mycelia', biome: 'mycelia',
    compositions: [{ composition: 'fairy_court', chance: 0.4 }],
    nameFirst: ['Sporebound', 'Mycelial', 'Fruiting', 'Rotcap', 'Luminous', 'Creeping', 'Hyphal', 'Glowcap', 'Mouldgrown', 'Spore-Choked', 'Fungal', 'Damprot', 'Capshadow', 'Bloomrot', 'Pulsefungus', 'Veilspore', 'Mushroomed', 'Softrot'],
    nameSecond: ['Bloom', 'Hollow', 'Warren', 'Thicket', 'Grotto', 'Spread', 'Flush', 'Tangle', 'Sprawl', 'Mat', 'Patch', 'Colony', 'Reach', 'Mire', 'Beds', 'Veil'],
    theme: {
      ambientDark: 0.25,
      nightDark: 0.72,
      floor: '#150c1c', grid: '#221432', border: '#6a4a8a',
      obstacle: '#3a2a5a', obstacleEdge: '#7a5aa8', accent: '#8fd06f', wall: '#3a2a5a',
      tree: '#4a6a3a', grass: '#5a7a3a',
      // Bruised violet LOAM, blended smooth — the dark stage the biome's own
      // bioluminescence (mats, crowns, spores) performs against.
      ground: {
        scale: 1.2, strength: 1.15, bias: 0.44, evenness: 0.55, speckles: 1.4,
        palette: ['#0e0714', '#190f24', '#241536', '#372247', '#4a3358'],
      },
      // Luminous spores adrift on the grotto's own slow convection.
      ambientFx: [{ kind: 'spores', intensity: 0.9, color: '#b8e88f' }],
    },
    sizeW: [2100, 2900], sizeH: [1500, 2200], ellipseChance: 0,
    // Organic fungal clutter scattered INSIDE the carved grotto chambers (myceliaLayout
    // walk-gates them): towering caps, spore-pods that puff, glow-caps, the hyphal
    // network, bracket shelves, fairy rings and their toadstool folk, pale ferns.
    layout: [
      { kind: 'giant_mushroom', count: [3, 6] }, { kind: 'spore_pod', count: [2, 4] },
      { kind: 'glow_cap', count: [4, 7] }, { kind: 'mycelial_mat', count: [3, 5] },
      { kind: 'shelf_fungus', count: [2, 4] }, { kind: 'toadstool', count: [3, 6] },
      { kind: 'mushroom_ring', count: [1, 2] }, { kind: 'fern', count: [1, 3] },
      // Pressure sacs burst when neared (fume); puffballs pop underfoot.
      { kind: 'burst_sac', count: [2, 4] }, { kind: 'puffcap_cluster', count: [1, 3] },
      // Glow-caps filing through the dark — the mycelium's own roads.
      { kind: 'formation', count: [1, 2], formation: 'fungal_procession' },
    ],
    packs: {
      count: [6, 9], size: [3, 5],
      table: [
        { id: 'fungal_sporeling', weight: 3 },
        { id: 'fungal_puffball', weight: 2, presence: { to: 16, fadeOut: 8 } },
        { id: 'fungal_spitter', weight: 3 },
        { id: 'fungal_brute', weight: 2, presence: { from: 8, fadeIn: 4 } },
        { id: 'fungal_tender', weight: 1, presence: { from: 10, fadeIn: 5 } },
        // The CAP-FOLK — the Bloom's solid kin (mushrooms, not clouds):
        // caplings underfoot early, the myconid line by the mid-teens, the
        // Sovereign only where the mycelium runs old and deep.
        { id: 'mushroomling', weight: 3, presence: { to: 14, fadeOut: 5 } },
        { id: 'myconid_warrior', weight: 3, presence: { from: 5, fadeIn: 3 } },
        { id: 'myconid_capcaller', weight: 2, presence: { from: 9, fadeIn: 4 } },
        { id: 'bolete_brute', weight: 2, presence: { from: 13, fadeIn: 5 } },
        { id: 'amanita_sovereign', weight: 1, presence: { from: 22, fadeIn: 8, mul: 2 } },
        { id: 'spore_drifter', weight: 2, presence: { from: 4, fadeIn: 2 } },
        { id: 'spore_sac', weight: 1 },
      ],
    },
    // The Bloom fruits its own spawners-objective destructibles.
    spawnerId: 'spore_sac',
    objectives: [{ kind: 'clear', weight: 3 }, { kind: 'spawners', weight: 2 }],
  },

  // FIELD — the open grassland EXPANSE (biome:'field'). The bespoke 'field' layout
  // generator (levelgen) shapes the zone to the contiguous Field heat-map blob and
  // floods it with grass/rock-cluster/mud/brush — NO trees, water, or void. sizeW/H
  // here are only a fallback; World.fieldifyZone overrides the footprint to the region
  // bbox. A wide-open, exploration-leaning hub (objectives favour clear/escape).
  grassland: {
    id: 'grassland', biome: 'field',
    compositions: [{ composition: 'stone_sanctum', chance: 0.35 }, { composition: 'orchard_rows', chance: 0.25 }, { composition: 'powder_cache', chance: 0.15 }, { composition: 'war_camp', chance: 0.14 }, { composition: 'fallen_colossus', chance: 0.1 }],
    nameFirst: ['Sunlit', 'Windswept', 'Verdant', 'Rolling', 'Emerald', 'Goldengrass', 'Wildflower', 'Open', 'Boundless', 'Whispergrass', 'Far-Reaching', 'Sunwashed', 'Breezy', 'Tallgrass', 'Endless', 'Sweeping', 'Lark-Sung', 'Greenswept'],
    nameSecond: ['Fields', 'Meadows', 'Expanse', 'Greens', 'Pastures', 'Lowlands', 'Reach', 'Plains', 'Prairie', 'Steppe', 'Sprawl', 'Veldt', 'Downs', 'Grasslands', 'Range', 'Heath'],
    theme: {
      floor: '#16260f', grid: '#1f3416', border: '#3f6a28',
      obstacle: '#4a4438', obstacleEdge: '#6e6450', accent: '#bfe878',
      mud: '#3a3320', grass: '#4f8c34', wall: '#1c3312',
    },
    sizeW: [3200, 4600], sizeH: [2400, 3400], ellipseChance: 0,
    layout: [
      { kind: 'flowers', count: [3, 6] }, { kind: 'standing_stone', count: [0, 2] },
      { kind: 'grass', count: [10, 16] },
      { kind: 'rocks', count: [5, 9], radius: [18, 40] },
      { kind: 'boulder_field', count: [0, 2] }, { kind: 'cairn', count: [0, 1] },
      { kind: 'mud', count: [2, 4] },
      { kind: 'brush', count: [2, 4] },
      // A processional the plains folk raised, striding to nowhere now.
      { kind: 'formation', count: [0, 1], formation: 'standing_avenue' },
      // Blooms pool in the LOW folds (elevation strata — the hollows keep
      // their water; the rises keep their grass).
      { kind: 'flowers', count: [1, 3], where: { field: 'elevation', max: 0.4, params: { scale: 700 } } },
    ],
    packs: {
      count: [6, 9], size: [3, 5],
      // A varied field: occasional dense SWARMS, plenty of STANDARD packs, and lots of
      // tiny GRAZING groups dotting the expanse (count scales to the walkable blob area).
      archetypes: [
        { weight: 2, size: [8, 14] }, // swarm — a tight, high-count cluster
        { weight: 4, size: [3, 6] },  // standard pack
        { weight: 6, size: [1, 2] },  // grazing — a lone beast or pair
      ],
      table: [
        { id: 'dune_stalker', weight: 3 },
        { id: 'gnoll_prowler', weight: 3, presence: { to: 18, fadeOut: 9 } },
        { id: 'fen_hound', weight: 2, presence: { to: 16, fadeOut: 8 } },
        { id: 'thorn_sprite', weight: 2, presence: { to: 18, fadeOut: 9 } },
        { id: 'briar_beast', weight: 2, presence: { from: 9, fadeIn: 4 } },
        { id: 'gnoll_butcher', weight: 1, presence: { from: 5, fadeIn: 3 } },
        { id: 'alpha_stalker', weight: 1, presence: { from: 10, fadeIn: 5 } },
        { id: 'brute', weight: 1, presence: { from: 6, fadeIn: 3 } },
        { id: 'warband_chieftain', weight: 1, presence: { from: 12, fadeIn: 5 } },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [{ kind: 'clear', weight: 3 }, { kind: 'escape', weight: 2 }, { kind: 'spawners', weight: 1 }],
    structures: [
      { structure: 'market_row', chance: 0.14 },
    ],
  },
};

// --- BIOME → TILESET resolver (the heat-map-authoritative mint) --------------
// Realm / cave / incursion-only tilesets declare `frontier: false` on their def;
// the exclusion set is DERIVED, so a new realm tileset opts out with one flag.
const NON_FRONTIER_TILESETS = new Set(
  Object.values(TILESETS).filter(t => t.frontier === false).map(t => t.id));

/** biome id → the frontier-eligible tileset ids that wear it. Built once from the
 *  TILESETS table, so a new themed tileset auto-joins its biome's pool. */
export const TILESETS_BY_BIOME: Record<string, string[]> = (() => {
  const m: Record<string, string[]> = {};
  for (const t of Object.values(TILESETS)) {
    if (!t.biome || NON_FRONTIER_TILESETS.has(t.id)) continue;
    (m[t.biome] ??= []).push(t.id);
  }
  return m;
})();

/** A seeded tileset choice for a field biome (so deepwood/jungle/meadow all stay
 *  reachable for 'grove', and the pick is deterministic per the zone's rng).
 *  Undefined when the biome has no frontier tileset (caller falls back). */
export function pickTilesetForBiome(biome: string, rng: Rng): string | undefined {
  const c = TILESETS_BY_BIOME[biome];
  return c && c.length ? rng.pick(c) : undefined;
}

/** Boot check: which BIOME_FIELD biomes have NO frontier tileset (would fall back
 *  to the inherited line — the coverage gap). */
export function biomesWithoutTileset(fieldBiomes: string[]): string[] {
  return fieldBiomes.filter(b => !(TILESETS_BY_BIOME[b]?.length));
}
