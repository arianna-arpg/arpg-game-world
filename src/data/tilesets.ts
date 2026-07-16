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

import type { CompositionRoll, HollowRollSpec, LandmarkRoll, PackSpec, SkyExposure, StampSpec, StructureRoll, ZoneTheme } from './zones';
import type { Rng } from '../core/rng';
import { presenceMul, type LevelEnvelope } from '../engine/presence';

export interface ObjectiveWeight {
  kind: 'clear' | 'escape' | 'spawners' | 'waves' | 'beacon' | 'circuit' | 'procession' | 'bounty' | 'offering';
  weight: number;
}

/** A CAVE FACE — this tileset's claim on the underground (the strata fabric,
 *  world/strata.ts). Any tileset carrying one joins the pool an UNFORCED cave
 *  mint (the classic cave_entrance) picks from; weight = the strata envelope
 *  evaluated at the mint's caveDepth × the surface ANCHOR biome's affinity.
 *  Both axes answer "why is this cave THIS?": a magma gallery under volcanic
 *  country is the neighbourhood; the same gallery under a meadow means the
 *  ladder has gone deep enough for the world's own heat. Authored gates
 *  (ruin_gate, vault_gate, realm mints) pass explicit tilesets and never
 *  consult the pool. */
export interface CaveFaceSpec {
  /** Presence envelope over CAVE DEPTH (1 = a surface cave; see strata.ts).
   *  Omitted = weight 1 at every depth. */
  strata?: LevelEnvelope;
  /** Anchor-biome affinity multipliers; '*' is the any-biome base (default 1).
   *  The anchor is the SURFACE biome the whole ladder hangs beneath (ZoneDef
   *  .anchor — nested caves inherit it), so provenance survives nesting. */
  biomes?: Record<string, number>;
  /** Chance a face-rolled mint also wears one of the tileset's variants
   *  (default 0 — gates that always roll pass opts.rollVariant instead). */
  variantChance?: number;
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
  /** SKY EXPOSURE baked onto minted zones (ZoneDef.sky → skyOf): 'sheltered'
   *  = an INTERIOR the world's weather must never reach — no fronts, wind,
   *  sky strikes, storm spawn-bias or particles inside. Cave-ladder mints are
   *  sheltered by construction (caveDepth); declare it anyway wherever the
   *  place IS an interior, so a graph-minted use of the tileset stays honest. */
  sky?: SkyExposure;
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
  /** PERF-GATE OPT-IN for non-frontier tilesets: true = this tileset has a
   *  walkable steady state a blind probe can sample (caves, minted interiors),
   *  so `npm run perf` appends it to the sweep matrix AFTER the frontier
   *  rows (append keeps every frontier row's mint seed stable). Leave unset
   *  on tilesets a bare graph-mint cannot honestly sample: melting realm
   *  shelves, boundless streamers, incursion pockets that need package
   *  context. Frontier tilesets are always swept and never need this. */
  perfProbe?: true;
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
  /** SUB-BIOME STAGING: a presence envelope over the mint coord's biomeDepth
   *  (0 = the biome region's rim, 1 = its deep interior) weighting THIS face
   *  in pickTilesetForBiome. The desert's whole gradient is three of these —
   *  the waste holds the rim, the erg claims the heart. Omitted = weight 1
   *  everywhere, so single-face biomes behave exactly as before. */
  depthAffinity?: LevelEnvelope;
  /** THE UNDERGROUND'S claim: carrying this joins the cave-face pool the
   *  strata fabric picks unforced cave mints from (see CaveFaceSpec). */
  caveFace?: CaveFaceSpec;
  /** SECRET-HOLLOWS budget stamped onto minted zones (the hollows fabric —
   *  ZoneDef.hollows): sealed pockets and through-wall passages behind
   *  brittle seams, GRID layouts only. */
  hollows?: HollowRollSpec;
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
      { kind: 'offering', weight: 1 },
      { kind: 'bounty', weight: 1 },
      { kind: 'procession', weight: 1 },
      { kind: 'beacon', weight: 1 },
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
    compositions: [
      { composition: 'orchard_rows', chance: 0.22 },
      { composition: 'beastwardens_steading', chance: 0.14 },
    ],
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
      // Sometimes, a clear upwelling — the wood's own kindness (orbs on a
      // beat; the flask founts drink from terrain here).
      { kind: 'spring_pool', count: [0, 1] },
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
        // The den: a matron who drinks for the whole pack (sympathy), and
        // the whelps who live inside her draught's reach.
        { id: 'den_matron', weight: 1, presence: { from: 5, fadeIn: 3 } },
        { id: 'den_whelp', weight: 2, presence: { to: 14, fadeOut: 6 } },
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
      { kind: 'offering', weight: 1 },
      { kind: 'bounty', weight: 1 },
      { kind: 'procession', weight: 1 },
      { kind: 'beacon', weight: 1 },
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
      // Someone brews out here — a croft of racks and stills (the
      // apothecary kit; the alembics shatter into spilled orbs).
      { kind: 'formation', count: [0, 1], formation: 'herbalists_croft' },
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
        { kind: 'formation', count: [1, 2], formation: 'herbalists_croft' },
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
      { kind: 'offering', weight: 1 },
      { kind: 'bounty', weight: 1 },
      { kind: 'procession', weight: 1 },
      { kind: 'beacon', weight: 1 },
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
      // Cold vapor pooling in the hollows (the Weatherworks kit).
      { kind: 'mist_pool', count: [1, 2] },
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
      { kind: 'bounty', weight: 1 },
      { kind: 'circuit', weight: 1 },
      { kind: 'procession', weight: 1 },
      { kind: 'beacon', weight: 1 },
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
      // Storm-charged glass the white wind seeded (brittle; Weatherworks kit).
      { kind: 'stormglass_shard', count: [1, 2] },
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
      { kind: 'bounty', weight: 1 },
      { kind: 'circuit', weight: 1 },
      { kind: 'beacon', weight: 1 },
      { kind: 'clear', weight: 3 },
      { kind: 'escape', weight: 2 },
      { kind: 'spawners', weight: 2 },
      { kind: 'waves', weight: 1 },
    ],
  },

  // CINDERLANDS — the volcanic country's RIM face (biome re-tagged rift →
  // volcanic in the wound-pass: fire cultists and ember elementals are the
  // cinder country's own, not the Legion's). depthAffinity stages the two
  // faces the desert way: cooled flats at the region's edge, the erupting
  // caldera past the heart — walking inward reads as the burn getting worse.
  cinderlands: {
    id: 'cinderlands',
    depthAffinity: { to: 0.55, fadeOut: 0.3 },
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
    sizeW: [2500, 3500], sizeH: [1600, 2400], ellipseChance: 0.35, biome: 'volcanic',
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
      { kind: 'offering', weight: 1 },
      { kind: 'bounty', weight: 1 },
      { kind: 'beacon', weight: 1 },
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

  // --- THE DESERT COUNTRY (three faces, one biome tag) ----------------------
  // The desert is a COUNTRY, not a tileset: three frontier faces share the
  // 'desert' biome tag and the ONE 'dunefield' recipe (BIOMES.desert
  // allowedLayouts), each tuning it with its own layoutParams. depthAffinity
  // envelopes stage them across the region — the SCOURED WASTE holds the rim
  // where sand still argues with stone, the SAND-SEA erg owns the deep heart,
  // the GLASSPAN salt flat blisters through anywhere past the fringe — so
  // walking inward reads as one land drying out by degrees. Relief (shade,
  // water, stone) is the currency; everything green outside an oasis's reach
  // is deliberately absent. Gnolls keep the patronage and the rim; the deep
  // faces belong to whatever the heat left standing.

  // DESERT — the SCOURED WASTE: the outskirt face. Scrub cactus, split rock,
  // the first marching ridges — the last country a caravan could still argue
  // with. Gnoll war-camps hold the edges of it.
  desert: {
    id: 'desert',
    depthAffinity: { to: 0.5, fadeOut: 0.3 },
    compositions: [
      { composition: 'oasis_haven', chance: 0.25 },
      { composition: 'caravan_graveyard', chance: 0.2 },
      { composition: 'buried_village', chance: 0.18 },
    ],
    layoutParams: {
      duneGap: [360, 520], duneCrestW: [20, 32], dunePans: [1, 2],
      duneCombEvery: 100,
    },
    variants: [
      { name: 'stony scrub', layout: [
        { kind: 'cactus', count: [7, 12] }, { kind: 'rocks', count: [8, 13], radius: [22, 52] },
        { kind: 'rock_spire', count: [2, 4] }, { kind: 'scree', count: [2, 4] },
        { kind: 'cliff', count: [1, 2] }, { kind: 'sand', count: [3, 5] },
        { kind: 'formation', count: [1, 2], formation: 'boulder_train' },
        { kind: 'heat_shimmer', count: [2, 4] },
        { kind: 'camp', count: [0, 1] }, { kind: 'cave', count: [0, 2] },
        { kind: 'structure', count: [0, 1], structure: 'faction_war_camp' },
      ] },
      { name: 'oasis rim', layout: [
        { kind: 'water', count: [2, 3], radius: [40, 70] }, { kind: 'shallows', count: [2, 3] },
        { kind: 'palm', count: [8, 12] }, { kind: 'sand', count: [4, 6] },
        { kind: 'rocks', count: [2, 4], radius: [20, 44] }, { kind: 'grass', count: [1, 2] },
        { kind: 'heat_shimmer', count: [1, 3] },
        { kind: 'sun_awning', count: [1, 2] },
        { kind: 'cave', count: [0, 1] },
        { kind: 'structure', count: [0, 1], structure: 'faction_war_camp' },
        // Shade arcs ringing the pool: the strand centers near the water the
        // rows above poured, its arc sweeping the shoreline.
        { kind: 'formation', count: [1, 2], formation: 'palm_strand',
          where: { field: 'shore', max: 0.4, params: { kinds: ['water'], reach: 220 } } },
      ] },
    ],
    nameFirst: ['Sunscoured', 'Bone-Dry', 'Wind-Carved', 'Scorchsand', 'Sunbaked', 'Duneshift', 'Heat-Hazed', 'Sandlorn', 'Blistering', 'Dustchoke', 'Goldwaste', 'Suncracked', 'Parched', 'Vulture-Watched', 'Cracked-Earth', 'Longshadow'],
    nameSecond: ['Reach', 'Flats', 'Wastes', 'Hollow', 'Barrens', 'Drift', 'Scour', 'Basin', 'Sprawl', 'Span', 'Verge', 'Fringe', 'Steppe', 'Scrub'],
    theme: {
      dayLight: 1.6,
      heat: 1,
      swelter: 0.85,
      ambientFx: [{ kind: 'heatHaze', intensity: 0.8 }, { kind: 'sandDrift', intensity: 0.5 }],
      // Sun-bleached scrub floor: a sand-to-dust gradient with a light bias —
      // the waste must READ as sand at a glance, never night-bog (live QA).
      ground: {
        scale: 2.6, stretchX: 2.1, strength: 1.25, speckles: 0.45,
        palette: ['#201a0e', '#362a16', '#4c3c20', '#63512a', '#7a6434'], bias: 0.56, alpha: 0.55,
      },
      floor: '#1a160d', grid: '#2a2418', border: '#7a6438',
      obstacle: '#5c4a2c', obstacleEdge: '#8a6e40', accent: '#e8c060',
      mud: '#6a5630', water: '#2a6a7a', sand: '#c9a86a',
    },
    sizeW: [3200, 4200], sizeH: [2200, 3000], ellipseChance: 0.15, biome: 'desert',
    layout: [
      { kind: 'cactus', count: [5, 9] },
      { kind: 'sand', count: [3, 5] },
      { kind: 'rocks', count: [6, 10], radius: [22, 52] },
      { kind: 'rock_spire', count: [1, 3] }, { kind: 'scree', count: [1, 2] },
      { kind: 'cliff', count: [1, 2] },
      { kind: 'ruin', count: [0, 1] },
      { kind: 'heat_shimmer', count: [2, 4] },
      { kind: 'camp', count: [0, 1] },
      { kind: 'sun_awning', count: [0, 2] },
      { kind: 'cave', count: [0, 2] },
      { kind: 'structure', count: [0, 1], structure: 'faction_war_camp' },
    ],
    // What every waste face IS: wind-combed ridges, lightning glass, old bones.
    common: [
      { kind: 'formation', count: [1, 2], formation: 'dune_ridges' },
      { kind: 'formation', count: [0, 1], formation: 'boulder_train' },
      // Where lightning kept an appointment with the sand.
      { kind: 'formation', count: [0, 1], formation: 'fulgurite_scar' },
      { kind: 'fulgurite', count: [0, 2] },
      { kind: 'bone_pile', count: [1, 3] },
      { kind: 'mirage_oasis', count: [0, 1], where: { field: 'radial', min: 0.3 } },
      // Shimmer thickens where the WORLD bakes hottest (climate strata).
      { kind: 'heat_shimmer', count: [0, 2], where: { field: 'climate', params: { axis: 'temperature' }, min: 0.55 } },
    ],
    packs: {
      count: [6, 8], size: [3, 5],
      // The waste mixes warbands with lone hunters: most packs standard, the
      // odd swarm-muster, the odd solitary stalker pair (archetype rolls).
      archetypes: [
        { weight: 2, size: [6, 9] }, { weight: 5, size: [3, 5] }, { weight: 3, size: [1, 2] },
      ],
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
        // Court outriders reach the rim where the world runs deep enough.
        { id: 'mirage_dancer', weight: 1, presence: { from: 9, fadeIn: 4 } },
        { id: 'salt_husk', weight: 1, presence: { from: 7, fadeIn: 4 } },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [
      { kind: 'bounty', weight: 1 },
      { kind: 'circuit', weight: 1 },
      { kind: 'procession', weight: 1 },
      { kind: 'beacon', weight: 1 },
      { kind: 'clear', weight: 3 },
      { kind: 'escape', weight: 2 },
      { kind: 'spawners', weight: 2 },
      { kind: 'waves', weight: 1 },
    ],
  },

  // SANDSEA — the GREAT ERG: the desert's deep heart, a sea with a grain.
  // Ridge rails pack close, vegetation forgets itself, and everything alive
  // is either crossing or waiting. The biggest surface zones in the game —
  // the trek IS the content, and the oasis roll is the mercy.
  sandsea: {
    id: 'sandsea',
    depthAffinity: { from: 0.3, fadeIn: 0.3 },
    compositions: [
      { composition: 'oasis_haven', chance: 0.42 },
      { composition: 'caravan_graveyard', chance: 0.3 },
      { composition: 'buried_village', chance: 0.3 },
    ],
    layoutParams: {
      duneGap: [260, 380], duneCrestW: [26, 42], duneLee: 56,
      dunePans: [1, 2], duneCombEvery: 84, duneBow: 0.26,
    },
    variants: [
      // Broad, slow swells — the ground itself stretches longer.
      { name: 'whaleback swell', layout: [
        { kind: 'sand', count: [3, 5] }, { kind: 'rocks', count: [2, 4], radius: [20, 40] },
        { kind: 'cactus', count: [0, 2] }, { kind: 'ruin', count: [0, 1] },
        { kind: 'heat_shimmer', count: [3, 5] }, { kind: 'cave', count: [0, 1] },
      ], theme: { ground: {
        scale: 3.4, stretchX: 2.6, strength: 1.2, speckles: 0.3,
        palette: ['#3a2d16', '#4c3c1e', '#63512a', '#7a6434', '#8f7840'], bias: 0.68, alpha: 0.66, evenness: 0.5,
      } } },
      // Knife-crests: sharp combed lines, the wind's teeth showing.
      { name: 'knife-crested', layout: [
        { kind: 'sand', count: [2, 4] }, { kind: 'rocks', count: [1, 3], radius: [18, 36] },
        { kind: 'formation', count: [1, 2], formation: 'dune_ridges' },
        { kind: 'heat_shimmer', count: [4, 6] }, { kind: 'ruin', count: [0, 1] },
      ], theme: { ground: {
        scale: 2.2, stretchX: 3, strength: 1.35, speckles: 0.25,
        palette: ['#3a2d16', '#4c3c1e', '#63512a', '#7a6434', '#8f7840'], bias: 0.68, alpha: 0.66, evenness: 0.5,
      } } },
      // Storm-combed: the drift never settles here.
      { name: 'storm-combed', layout: [
        { kind: 'sand', count: [4, 7] }, { kind: 'rocks', count: [1, 3], radius: [18, 38] },
        { kind: 'heat_shimmer', count: [2, 4] }, { kind: 'cave', count: [0, 1] },
      ], theme: { ambientFx: [{ kind: 'heatHaze', intensity: 0.7 }, { kind: 'sandDrift', intensity: 1.1 }] } },
    ],
    nameFirst: ['Mirage', 'Glasswaste', 'Witherglass', 'Burnglass', 'Saltcrack', 'Endless', 'Shifting', 'Trackless', 'Sun-Drowned', 'Golden', 'Wandering', 'Thirstlong', 'Duneheart', 'Sandveil', 'Farshimmer', 'Wind-Written'],
    nameSecond: ['Erg', 'Sands', 'Dunes', 'Expanse', 'Sea', 'Swells', 'Leagues', 'Crossing', 'Immensity', 'Deep', 'Waves', 'Horizon'],
    theme: {
      dayLight: 1.65,
      heat: 1.05,
      swelter: 1,
      ambientFx: [{ kind: 'heatHaze', intensity: 0.9 }, { kind: 'sandDrift', intensity: 0.8 }],
      // The open erg is SAND ALL THE WAY DOWN: a pure light-biased dune
      // gradient (evenness ~0.5 lays it on solid — no dark floor bleed).
      ground: {
        scale: 2.8, stretchX: 2.3, strength: 1.3, speckles: 0.3,
        palette: ['#3a2d16', '#4c3c1e', '#63512a', '#7a6434', '#8f7840'], bias: 0.68, alpha: 0.66, evenness: 0.5,
      },
      floor: '#1c170d', grid: '#2c2517', border: '#8a7040',
      obstacle: '#604c2c', obstacleEdge: '#927448', accent: '#f0c870',
      mud: '#6a5630', water: '#2a6a7a', sand: '#d4b070',
    },
    sizeW: [4400, 5600], sizeH: [3000, 4200], ellipseChance: 0, biome: 'desert',
    layout: [
      { kind: 'cactus', count: [1, 3] },
      { kind: 'sand', count: [3, 6] },
      { kind: 'rocks', count: [2, 5], radius: [20, 42] },
      { kind: 'ruin', count: [0, 1] },
      { kind: 'heat_shimmer', count: [3, 6] },
      { kind: 'camp', count: [0, 1] },
      { kind: 'sun_awning', count: [0, 1] },
      { kind: 'cave', count: [0, 1] },
    ],
    common: [
      { kind: 'formation', count: [2, 3], formation: 'dune_ridges' },
      { kind: 'mirage_oasis', count: [0, 2], where: { field: 'radial', min: 0.25 } },
      { kind: 'mirage_bastion', count: [0, 1], where: { field: 'radial', min: 0.4 } },
      { kind: 'formation', count: [0, 1], formation: 'fulgurite_scar' },
      { kind: 'fulgurite', count: [0, 2] },
      { kind: 'bone_pile', count: [1, 3] },
      { kind: 'heat_shimmer', count: [1, 3], where: { field: 'climate', params: { axis: 'temperature' }, min: 0.55 } },
    ],
    landmarks: [
      // The erg's mercy — and its one lie worth believing.
      { landmark: 'oasis', chance: 0.5 },
      { landmark: 'canyon', chance: 0.2 },
      { landmark: 'sinkhole', chance: 0.1 },
      { landmark: 'maggot_burrow', chance: 0.12 },
    ],
    packs: {
      count: [7, 9], size: [3, 5],
      // A sea reads EMPTY between events: lone shapes on the horizon most of
      // the time, then a warband all at once (grazing-heavy archetypes).
      archetypes: [
        { weight: 2, size: [7, 11] }, { weight: 4, size: [3, 5] }, { weight: 6, size: [1, 2] },
      ],
      table: [
        { id: 'gnoll_prowler', weight: 3 },
        { id: 'gnoll_longshot', weight: 1, presence: { from: 5, fadeIn: 3 } },
        { id: 'gnoll_howler', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'dune_stalker', weight: 3 },
        { id: 'alpha_stalker', weight: 1, presence: { from: 10, fadeIn: 5 } },
        { id: 'bronze_scarab', weight: 2, presence: { from: 6, fadeIn: 3 } },
        { id: 'sand_wyrm', weight: 2, presence: { from: 8, fadeIn: 4 } },
        { id: 'bombardier_beetle', weight: 1, presence: { from: 9, fadeIn: 4 } },
        { id: 'maggot_queen', weight: 1, presence: { from: 12, fadeIn: 5 } },
        // The Court: the deep erg answers to older tenants.
        { id: 'mirage_dancer', weight: 2, presence: { from: 6, fadeIn: 3 } },
        { id: 'salt_husk', weight: 2, presence: { from: 5, fadeIn: 3 } },
        { id: 'glass_stalker', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'dust_djinn', weight: 1, presence: { from: 9, fadeIn: 4 } },
        { id: 'sun_priest', weight: 1, presence: { from: 10, fadeIn: 4 } },
        { id: 'sandmaw_burrower', weight: 1, presence: { from: 8, fadeIn: 4 } },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [
      { kind: 'escape', weight: 2 },
      { kind: 'beacon', weight: 2 },
      { kind: 'bounty', weight: 2 },
      { kind: 'circuit', weight: 1 },
      { kind: 'clear', weight: 2 },
      { kind: 'procession', weight: 1 },
      { kind: 'spawners', weight: 1 },
      { kind: 'waves', weight: 1 },
    ],
  },

  // SALTFLAT — the GLASSPAN: a dead lake remembered as a floor. Hardpan
  // country (the dunefield dials all but retire the ridges), lightning glass
  // and salt pillars for a forest, and the heat's honest anvil — nothing
  // here ever offers shade. Fast to cross, expensive to linger.
  saltflat: {
    id: 'saltflat',
    depthAffinity: { from: 0.15, fadeIn: 0.25, mul: 0.7 },
    compositions: [
      { composition: 'caravan_graveyard', chance: 0.25 },
      { composition: 'buried_village', chance: 0.2 },
    ],
    layoutParams: {
      duneGap: [560, 800], duneCrestW: [16, 24], duneLee: 30,
      dunePans: [3, 5], duneCombEvery: 150,
    },
    variants: [
      { name: 'shattered pan', layout: [
        { kind: 'glass_shard', count: [5, 9] }, { kind: 'fulgurite', count: [2, 4] },
        { kind: 'formation', count: [1, 2], formation: 'fulgurite_scar' },
        { kind: 'rocks', count: [1, 3], radius: [18, 36] },
        { kind: 'heat_shimmer', count: [4, 7] },
      ] },
      { name: 'bonepan', layout: [
        { kind: 'bone_arch', count: [2, 4] }, { kind: 'bone_pile', count: [4, 7] },
        { kind: 'formation', count: [1, 2], formation: 'ribcage_run' },
        { kind: 'salt_pillar', count: [2, 4] },
        { kind: 'heat_shimmer', count: [3, 5] }, { kind: 'cave', count: [0, 1] },
      ] },
      { name: 'white blind', layout: [
        { kind: 'salt_pillar', count: [5, 9] },
        { kind: 'formation', count: [1, 2], formation: 'salt_procession' },
        { kind: 'glass_shard', count: [1, 3] },
        { kind: 'heat_shimmer', count: [6, 9] },
      ], theme: { dayLight: 1.9, swelter: 1.35 } },
    ],
    nameFirst: ['Saltcrack', 'Glasswaste', 'Suncracked', 'Burnglass', 'Witherglass', 'Bleachbone', 'Blinding', 'Dead-Lake', 'Shatterpan', 'Whitefire', 'Cracklace', 'Stillheat'],
    nameSecond: ['Pan', 'Flats', 'Glass', 'Mirror', 'Bed', 'Blind', 'Table', 'Waste', 'Floor', 'Shimmer'],
    theme: {
      dayLight: 1.75,
      heat: 1.1,
      swelter: 1.2,
      ambientFx: [{ kind: 'heatHaze', intensity: 1 }, { kind: 'sandDrift', intensity: 0.6 }],
      // A pale cracked floor — pan polygons, not dunes: near-isotropic scale,
      // a bright-biased palette so the flat reads bleached under the sun.
      ground: {
        scale: 3.2, stretchX: 1.15, strength: 1.1, speckles: 0.2,
        palette: ['#2e2818', '#4a4028', '#6a5c3a', '#8a7a4e'], bias: 0.62, alpha: 0.6, evenness: 0.35,
      },
      floor: '#282217', grid: '#3a3222', border: '#8a7a4e',
      obstacle: '#6a5c3e', obstacleEdge: '#9a8a5c', accent: '#f0e0a0',
      mud: '#7a6a44', water: '#3a7a8a', sand: '#e0cf9a',
    },
    sizeW: [3600, 4800], sizeH: [2400, 3200], ellipseChance: 0.1, biome: 'desert',
    layout: [
      { kind: 'salt_pillar', count: [3, 6] },
      { kind: 'glass_shard', count: [2, 5] },
      { kind: 'fulgurite', count: [1, 3] },
      { kind: 'bone_pile', count: [2, 4] },
      { kind: 'rocks', count: [1, 3], radius: [18, 38] },
      { kind: 'cactus', count: [0, 2] },
      { kind: 'heat_shimmer', count: [4, 7] },
      { kind: 'cave', count: [0, 1] },
    ],
    common: [
      { kind: 'formation', count: [0, 2], formation: 'salt_procession' },
      { kind: 'mirage_oasis', count: [1, 2], where: { field: 'radial', min: 0.2 } },
      { kind: 'mirage_caravan', count: [0, 1] },
      { kind: 'formation', count: [0, 1], formation: 'fulgurite_scar' },
      { kind: 'heat_shimmer', count: [1, 3], where: { field: 'climate', params: { axis: 'temperature' }, min: 0.5 } },
    ],
    landmarks: [
      { landmark: 'sinkhole', chance: 0.15 },
      { landmark: 'canyon', chance: 0.15 },
      // Bitumen weeps up through the dead lake's bed.
      { landmark: 'tar_pool', chance: 0.12 },
    ],
    packs: {
      count: [6, 8], size: [3, 5],
      archetypes: [
        { weight: 3, size: [5, 8] }, { weight: 4, size: [3, 5] }, { weight: 4, size: [1, 2] },
      ],
      table: [
        { id: 'bronze_scarab', weight: 3 },
        { id: 'sand_skitterer', weight: 3 },
        { id: 'bombardier_beetle', weight: 2, presence: { from: 6, fadeIn: 3 } },
        { id: 'dune_stalker', weight: 2 },
        { id: 'gnoll_longshot', weight: 1, presence: { from: 5, fadeIn: 3 } },
        { id: 'sand_wyrm', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'broodmother', weight: 1, presence: { from: 10, fadeIn: 5 } },
        { id: 'salt_husk', weight: 3, presence: { from: 4, fadeIn: 2 } },
        { id: 'glass_stalker', weight: 2, presence: { from: 7, fadeIn: 4 } },
        { id: 'mirage_dancer', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'sandmaw_burrower', weight: 1, presence: { from: 9, fadeIn: 4 } },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [
      { kind: 'clear', weight: 3 },
      { kind: 'waves', weight: 2 },
      { kind: 'spawners', weight: 2 },
      { kind: 'bounty', weight: 1 },
      { kind: 'beacon', weight: 1 },
      { kind: 'escape', weight: 1 },
    ],
  },

  // BURIED VAULT — the desert's descent (vault_gate sidezone): a lost
  // village's underworks in dressed sandstone, preserved by the sands that
  // erased its streets. Interior-only (frontier:false); the sunken_ruin
  // contract in sand tones, garrisoned by what the dark kept.
  buried_vault: {
    id: 'buried_vault',
    frontier: false, perfProbe: true,
    sky: 'sheltered', // an underworks preserved BY its roof of sand — no sky reaches it

    caveLayouts: { dungeon: 2, edifice: 1.5, labyrinth: 1 },
    // A buried town keeps buried things (the hollows fabric): walled-up
    // stores and the passages its cellars never admitted to.
    hollows: {
      count: [1, 2],
      table: { cache_hollow: 3, ambush_hollow: 1.5, vein_hollow: 1, passage_hollow: 2 },
    },
    layoutParams: {
      interiorWall: 'sunkstone_wall', floorStyle: 'flagstone',
      rooms: [6, 10], doorChance: 0.6, corridorCells: 2,
    },
    common: [
      { kind: 'burial_urn', count: [2, 5] },
      { kind: 'clay_pots', count: [1, 3] },
      { kind: 'rubble', count: [2, 4] },
      { kind: 'bone_pile', count: [1, 3] },
      { kind: 'brazier', count: [1, 2] },
      { kind: 'secret_wall', count: [1, 2] },
    ],
    variants: [
      // The cistern that outlived its well — dust where the water stood.
      { name: 'dry cistern', layout: [
        { kind: 'sand', count: [1, 3] },
        { kind: 'broken_column', count: [2, 4] },
        { kind: 'ruin_plinth', count: [1, 2] },
      ] },
      // The granary maze: stores looted mid-carry, doors that stopped mattering.
      { name: 'granary maze', layout: [
        { kind: 'clay_pots', count: [2, 4] },
        { kind: 'broken_cart', count: [0, 2] },
        { kind: 'rubble', count: [1, 3] },
      ] },
      // The king's cellar: somebody worth burying, and the fashion to prove it.
      { name: "king's cellar", layout: [
        { kind: 'burial_urn', count: [2, 4] },
        { kind: 'standing_stone', count: [1, 2] },
        { kind: 'ruin_plinth', count: [1, 3] },
        { kind: 'brazier', count: [1, 2] },
      ] },
    ],
    nameFirst: ['Buried', 'Swallowed', 'Sandlocked', 'Forgotten', 'Sunless', 'Drysunk', 'Old', 'Duneheld'],
    nameSecond: ['Vaults', 'Underworks', 'Cellars', 'Granary', 'Cistern', 'Stores', 'Undercroft', 'Reliquary'],
    theme: {
      ground: {
        palette: ['#171208', '#241c0e', '#332a16', '#43371e'],
        bias: 0.52, alpha: 0.55, speckles: 0.7,
      },
      ambientDark: 0.36,
      ambientFx: [{ kind: 'motes', intensity: 0.4 }],
      floor: '#141008', grid: '#1c160c', border: '#5c4c2c',
      obstacle: '#3a2f1a', obstacleEdge: '#6a5834', accent: '#e8c060',
      wall: '#3a2f1a', sand: '#c9a86a', water: '#2a5a6a', mud: '#241c10',
    },
    sizeW: [1150, 1500], sizeH: [880, 1150], biome: 'ruin',
    layout: [
      { kind: 'rubble', count: [1, 3] },
      { kind: 'broken_column', count: [1, 2] },
    ],
    packs: {
      count: [4, 6], size: [3, 5],
      table: [
        { id: 'bronze_scarab', weight: 3 },
        { id: 'giant_maggot', weight: 2 },
        { id: 'sand_skitterer', weight: 2 },
        { id: 'skeleton_warrior', weight: 3 },
        { id: 'skeleton_archer', weight: 2 },
        { id: 'maggot_queen', weight: 1, presence: { from: 10, fadeIn: 5 } },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [
      { kind: 'clear', weight: 3 },
      { kind: 'spawners', weight: 1 },
    ],
  },

  // JUNGLE — the strangling green. Where the FOREST is a ROOF (open floor,
  // canopy overhead), the JUNGLE is a THROAT: one living VERDURE mass carved
  // into narrow game trails and small glades (the 'thicket' recipe owns the
  // topology — walls that block step, shot AND sight), with the growth itself
  // cuttable: brush PLUGS choke the throats, pocket DENS wait behind them,
  // face-cuts pay whoever carves into the mass. Sightlines are measured in
  // strides; everything here is what fills them.
  jungle: {
    id: 'jungle',
    // THE SUNKEN RUINS: courts of the swallowed civilization, each with a
    // root-split gate DOWN into minted halls (the ruin_gate sidezone). The
    // rim keeps modest courts; the temple precinct only grows where the
    // region runs DEEP (the composition's biomeDepth gate) — push toward
    // the heart and the green admits to more of the old city.
    compositions: [
      { composition: 'sunken_ruin_site', chance: 0.34 },
      { composition: 'temple_of_the_green', chance: 0.5 },
    ],
    // The always-kit, on EVERY face: the cuttable fabric + the wet-heat
    // texture. Curtains blind the lanes, blooms light the gloom, bladders
    // swell in the mulch — and the growth CROWDS THE HEART (radial bands:
    // more ferns, more plugs the deeper you push).
    common: [
      { kind: 'liana_veil', count: [3, 6] },
      { kind: 'jungle_bloom', count: [2, 4] },
      { kind: 'gas_pod', count: [1, 3] },
      { kind: 'strangler_root', count: [2, 4] },
      // The canopy drips harder where the WORLD runs wet (climate strata).
      { kind: 'vines', count: [1, 3], where: { field: 'climate', params: { axis: 'moisture' }, min: 0.55 } },
      { kind: 'fern', count: [2, 4], where: { field: 'radial', max: 0.55 } },
      { kind: 'jungle_brush', count: [1, 3], where: { field: 'radial', max: 0.5 } },
    ],
    variants: [
      // The flora face: growth for growth's sake — emergent giants over a
      // floor that never stops moving.
      { name: 'green hell', layout: [
        { kind: 'canopy_colossus', count: [2, 3] },
        { kind: 'palm', count: [6, 10] }, { kind: 'trees', count: [4, 7] },
        { kind: 'fern', count: [3, 5] }, { kind: 'brush', count: [3, 5] },
        { kind: 'thicket', count: [2, 3] }, { kind: 'jungle_bloom', count: [1, 3] },
        { kind: 'swamp', count: [1, 2] }, { kind: 'cave', count: [0, 1] },
        { kind: 'structure', count: [0, 1], structure: 'faction_hall' },
      ] },
      // The swallowed-court face: the green is still digesting somebody's
      // civilization — the fallen-colossus kit in jungle moss, urns old
      // enough to answer back, a collapsed colonnade down the old road.
      { name: 'strangler court', layout: [
        { kind: 'formation', count: [1, 2], formation: 'colossus_wreck' },
        { kind: 'weathered_statue', count: [1, 2] },
        { kind: 'rubble', count: [2, 4] },
        { kind: 'burial_urn', count: [2, 4] },
        { kind: 'liana_veil', count: [2, 4] },
        { kind: 'palm', count: [4, 7] }, { kind: 'trees', count: [3, 5] },
        { kind: 'cave', count: [0, 1] },
      ] },
      // The toxin face: the wet heat ferments — pods, caps and blooms in a
      // floor gone soft; bring your own antidote.
      { name: 'fevered floor', layout: [
        { kind: 'gas_pod', count: [3, 5] },
        { kind: 'puffcap_cluster', count: [2, 4] },
        { kind: 'venom_bloom', count: [2, 3] },
        { kind: 'marsh_wisp', count: [1, 3] },
        { kind: 'swamp', count: [2, 3] }, { kind: 'mud', count: [1, 2] },
        { kind: 'palm', count: [4, 7] }, { kind: 'fern', count: [2, 4] },
        { kind: 'cave', count: [0, 1] },
      ] },
      // The vine face: the mass in charge — coiled organisms slung across
      // the lanes (cut a segment; the body keeps its shape), curtains
      // everywhere, wisp-light where the strands hang thickest.
      { name: 'weeping tangle', layout: [
        // The mass drapes OVER the verdure (walk-gate ignored — see the
        // thicket recipe's vine phase for the doctrine).
        { kind: 'formation', count: [2, 3], formation: 'vine_mass', rules: { ignore: ['walk'] } },
        { kind: 'liana_veil', count: [3, 5] },
        { kind: 'vines', count: [2, 4] },
        { kind: 'jungle_bloom', count: [2, 3] },
        { kind: 'marsh_wisp', count: [1, 2] },
        { kind: 'palm', count: [3, 6] }, { kind: 'fern', count: [2, 4] },
        { kind: 'cave', count: [0, 1] },
      ] },
    ],
    nameFirst: ['Verdant', 'Tangleroot', 'Emerald', 'Fevered', 'Greenmaw', 'Vinewrought', 'Overgrown', 'Mistleaf', 'Rotbloom', 'Canopied', 'Thornvine', 'Sapheart', 'Fernshade', 'Leafshroud', 'Jadewild', 'Snarlgreen', 'Humid', 'Tanglevein'],
    nameSecond: ['Canopy', 'Snarl', 'Depths', 'Hollow', 'Thicket', 'Wilds', 'Tangle', 'Overgrowth', 'Verge', 'Hush', 'Reach', 'Mire', 'Bower', 'Greens', 'Vinework', 'Floor'],
    theme: {
      // Wet green-on-green: the loam reads ALIVE (hue-preserving mottle over
      // a five-stop leaf-litter ramp), dark margins where the water stands,
      // sun-wells where the roof breaks. wall = the verdure's own fill so the
      // walk-mask fallback and the region visual agree (guard gap ≈ .14).
      ground: {
        palette: ['#0d1a0e', '#142a12', '#1c3a18', '#26501e', '#315f28'],
        bias: 0.55, alpha: 0.6, speckles: 1.3,
        coast: { reach: 80, shift: -0.35, kinds: ['water', 'swamp', 'bog'] },
        clearing: { reach: 120, lift: 0.28 },
      },
      fog: { banks: [1, 3], kinds: [{ id: 'mist' }] },
      ambientFx: [{ kind: 'motes', intensity: 0.7 }, { kind: 'heatHaze', intensity: 0.3 }],
      dayLight: 0.9, nightDark: 0.8,
      floor: '#0a140b', grid: '#101f10', border: '#2a5a2c',
      obstacle: '#1c4a1e', obstacleEdge: '#357538', accent: '#6ed060',
      tree: '#2f6a34', mud: '#14260f', water: '#16404a', wall: '#22421a', road: '#3f351f',
    },
    sizeW: [2400, 3400], sizeH: [1600, 2400], ellipseChance: 0.25, biome: 'jungle',
    // The authored/probe default face (generated zones always roll a variant).
    layout: [
      { kind: 'canopy_colossus', count: [1, 2] },
      { kind: 'palm', count: [5, 9] },
      { kind: 'trees', count: [4, 7] },
      { kind: 'fern', count: [2, 5] },
      { kind: 'brush', count: [3, 5] },
      { kind: 'thicket', count: [1, 2] },
      { kind: 'swamp', count: [1, 2] },
      { kind: 'cave', count: [0, 1] },
      { kind: 'structure', count: [0, 1], structure: 'faction_hall' },
    ],
    packs: {
      count: [5, 8], size: [3, 5],
      table: [
        // THE JUNGLEKIN first — the green's own tribes hold their ground.
        { id: 'fern_stalker', weight: 4, presence: { to: 18, fadeOut: 8 } },
        { id: 'blowgun_wretch', weight: 3, presence: { to: 20, fadeOut: 9 } },
        { id: 'spore_caller', weight: 2, presence: { from: 6, fadeIn: 3 } },
        { id: 'strangler_maw', weight: 2, presence: { from: 8, fadeIn: 4 } },
        { id: 'emerald_prowler', weight: 2, presence: { from: 9, fadeIn: 4 } },
        { id: 'saurian_bulwark', weight: 2, presence: { from: 11, fadeIn: 5 } },
        { id: 'verdant_tyrant', weight: 1, presence: { from: 14, fadeIn: 6 } },
        // What was here before them: the canopy's own hunters and the silk.
        { id: 'veilstalker', weight: 2, presence: { from: 6, fadeIn: 3 } },
        { id: 'spitting_horror', weight: 2, presence: { to: 16, fadeOut: 8 } },
        { id: 'emerald_mantis', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'orb_weaver', weight: 2, presence: { from: 5, fadeIn: 3 } },
        { id: 'widow_matron', weight: 1, presence: { from: 12, fadeIn: 5 } },
        { id: 'root_wraith', weight: 1, presence: { from: 8, fadeIn: 4 } },
      ],
    },
    spawnerId: 'bone_altar',
    // No 'procession' here: an escort cart cannot cut brush, and the thicket
    // is proudly full of things that must be cut. The lanes belong to feet.
    objectives: [
      { kind: 'offering', weight: 1 },
      { kind: 'bounty', weight: 1.5 },
      { kind: 'beacon', weight: 1 },
      { kind: 'clear', weight: 3 },
      { kind: 'escape', weight: 2 },
      { kind: 'spawners', weight: 2 },
      { kind: 'waves', weight: 1 },
    ],
  },

  // THE SUNKEN RUIN — the halls under the jungle. A ruin_gate (composition-
  // placed in jungle courts) descends into these minted interiors: root-riven
  // masonry on the room-graph families (dungeon/edifice/labyrinth at cave
  // scale), flagstone gone green at the seams, the old dead in their urns,
  // secret walls that remember which stones were doors — and the growth that
  // followed you down. Realm/pocket-only (frontier: false); every gate rolls
  // its own face. The 'ruin_entered' ledger the sidezone bumps is THE GATEWAY
  // SEAM a future content package can hang off wholesale.
  sunken_ruin: {
    id: 'sunken_ruin',
    frontier: false, perfProbe: true,
    sky: 'sheltered', // swallowed halls under the jungle floor — weather stays above

    caveLayouts: { dungeon: 2, edifice: 1.5, labyrinth: 1, plains: 0.5 },
    // Swallowed halls remember their doors (the hollows fabric) — the walls
    // here were rooms once, and some still are.
    hollows: {
      count: [1, 2],
      table: { cache_hollow: 3, ambush_hollow: 2, passage_hollow: 2, hermit_hollow: 1 },
    },
    layoutParams: {
      interiorWall: 'ruin_wall', floorStyle: 'flagstone',
      rooms: [7, 11], doorChance: 0.6, corridorCells: 2,
    },
    // What EVERY face keeps: the urns and their tenants, pots someone cached,
    // rubble off the old vaults, roots that got here first, the gloom's own
    // lights — and at least one wall that sounds hollow.
    common: [
      { kind: 'burial_urn', count: [2, 4] },
      { kind: 'clay_pots', count: [1, 3] },
      { kind: 'rubble', count: [2, 4] },
      { kind: 'strangler_root', count: [1, 3] },
      { kind: 'jungle_bloom', count: [1, 3] },
      { kind: 'gas_pod', count: [0, 2] },
      { kind: 'secret_wall', count: [1, 2] },
    ],
    variants: [
      // The green won: curtains across the halls, ferns in the floor seams,
      // the colonnade's bones where the roof came down.
      { name: 'overgrown halls', layout: [
        { kind: 'liana_veil', count: [2, 4] },
        { kind: 'fern', count: [2, 4] },
        { kind: 'vines', count: [1, 3] },
        { kind: 'formation', count: [0, 1], formation: 'vine_mass', rules: { ignore: ['walk'] } },
        { kind: 'formation', count: [0, 1], formation: 'colossus_wreck' },
      ] },
      // The water table won: standing pools over the flagstone, drowned
      // steles, wisp-light where the dark pools deepest.
      { name: 'flooded undercroft', layout: [
        { kind: 'water', count: [1, 2] },
        { kind: 'mud', count: [1, 2] },
        { kind: 'sunken_stone', count: [1, 3] },
        { kind: 'marsh_wisp', count: [1, 2] },
        { kind: 'formation', count: [0, 1], formation: 'colossus_wreck' },
      ] },
    ],
    nameFirst: ['Sunken', 'Swallowed', 'Rootbound', 'Verdigris', 'Mosswrit', 'Drowned', 'Forgotten', 'Greenlaid', 'Strangled', 'Old'],
    nameSecond: ['Halls', 'Undercroft', 'Sanctum', 'Vaults', 'Precinct', 'Galleries', 'Cloister', 'Reliquary'],
    theme: {
      ground: {
        palette: ['#141810', '#1b2016', '#232a1c', '#2c3424', '#37402c'],
        bias: 0.5, alpha: 0.5, speckles: 0.9,
      },
      ambientDark: 0.32,
      ambientFx: [{ kind: 'motes', intensity: 0.5 }],
      floor: '#10130d', grid: '#181c14', border: '#3f4636',
      obstacle: '#2c342a', obstacleEdge: '#55684e', accent: '#9fd07a',
      wall: '#2c342a', tree: '#2f6a34', water: '#16404a', mud: '#141f10',
    },
    sizeW: [1150, 1500], sizeH: [880, 1150], biome: 'ruin',
    // The authored/probe default face (minted gates always roll a variant).
    layout: [
      { kind: 'fern', count: [1, 3] },
      { kind: 'vines', count: [1, 2] },
      { kind: 'formation', count: [0, 1], formation: 'colossus_wreck' },
    ],
    packs: {
      count: [4, 6], size: [3, 5],
      table: [
        // The old dead first (the urns are load-bearing fiction), then the
        // wardens the city left, then what crawled in after all of them.
        { id: 'skeleton_warrior', weight: 3 },
        { id: 'skeleton_archer', weight: 2 },
        // The Hollowborn — what the flood interred, the halls still field.
        { id: 'blade_swarm', weight: 2, presence: { from: 6, fadeIn: 3 } },
        { id: 'shield_anima', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'ruin_sentinel', weight: 2, presence: { from: 8, fadeIn: 3 } },
        { id: 'blowgun_wretch', weight: 2, presence: { to: 16, fadeOut: 7 } },
        { id: 'strangler_maw', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'orb_weaver', weight: 2 },
        { id: 'widow_matron', weight: 1, presence: { from: 10, fadeIn: 4 } },
        { id: 'root_wraith', weight: 2 },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [{ kind: 'clear', weight: 1 }],
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
      { kind: 'offering', weight: 1 },
      { kind: 'bounty', weight: 1 },
      { kind: 'procession', weight: 1 },
      { kind: 'beacon', weight: 1 },
      { kind: 'clear', weight: 3 },
      { kind: 'escape', weight: 2 },
      { kind: 'spawners', weight: 2 },
      { kind: 'waves', weight: 1 },
    ],
  },

  // WASTELAND — THE WAR-WOUND: the ground the demon war tore through and
  // never gave back. No lava and no cinder here (fire country belongs to the
  // volcanic biome) — the wound burns the Durance's COLD GREEN: hate-lit
  // rents, vitrified glass, gore where the land still bleeds, and the
  // Legion's road furniture (gibbets, stakes, chains, banners) marking who
  // marched through. The dread pall seeps from the rents and feeds them.
  wasteland: {
    id: 'wasteland',
    // War-land keeps its ordnance: abandoned powder dumps that answer stray
    // fire — and the muster grounds the war was drilled in. And rarest of
    // all, THE SUNDERING: a torn way into the Underworld standing open
    // (0.1 on an already-rare biome — a once-a-run story, not a route).
    compositions: [{ composition: 'powder_cache', chance: 0.28 }, { composition: 'war_camp', chance: 0.16 }, { composition: 'fallen_colossus', chance: 0.12 }, { composition: 'cistern_court', chance: 0.12 }, { composition: 'the_sundering', chance: 0.1 }],
    nameFirst: ['Blasted', 'Hellcracked', 'Ruinous', 'Riftburnt', 'Hateforged', 'Sundered', 'Warshorn', 'Chainscored', 'Godpierced', 'Wretched', 'Desolate', 'Damnedmarch', 'Hatelit', 'Ashbroken', 'Brimstone', 'Cracked', 'Flayed', 'Unhealed'],
    nameSecond: ['Waste', 'Scar', 'Reach', 'Ruin', 'Sprawl', 'Crackland', 'Wreckage', 'Hollow', 'Desolation', 'Span', 'Wound', 'March', 'Rent', 'Verge', 'Fields', 'Toll'],
    theme: {
      // A DIMMER land than the volcanic country's bright eruption light —
      // the wound leeches the day (volcanic runs dayLight 1.15; this is the
      // opposite pole of the same dial).
      dayLight: 0.95, nightDark: 0.85, ambientDark: 0.1,
      // Pale hate-glow adrift in dead air — cold light where fire country
      // wears warm heat-shimmer.
      ambientFx: [{ kind: 'motes', intensity: 0.35, color: '#8fe8b0' }],
      ground: {
        palette: ['#120b0e', '#1a1114', '#24171a', '#2e1d21', '#382329'],
        bias: 0.45, alpha: 0.5, stretchX: 1.35, speckles: 0.7, strength: 1.1,
      },
      floor: '#140d10', grid: '#1f1418', border: '#5c2a34',
      obstacle: '#3a1f26', obstacleEdge: '#6e3a46', accent: '#7de84a',
      // Wall = the hellworks' wine-dark obsidian masonry (the hell-steppes
      // stone — the same war built both). Full luminance step above floor.
      wall: '#452330', chasm: '#0d0408', mud: '#241318',
      // The wound's breath: dread pall seeping from the rents (data/fog.ts).
      fog: { banks: [1, 2], kinds: [{ id: 'dread_pall' }] },
    },
    sizeW: [2500, 3500], sizeH: [1600, 2400], ellipseChance: 0.3, biome: 'rift',
    // What the wound ALWAYS is, whichever face rolls: the ground bleeds, the
    // hate shows through, and the titan chains run toward something below.
    // (Ground scars ride `common` so they stamp FIRST — later solids honour
    // their forbidOn against them.)
    common: [
      { kind: 'gore', count: [1, 2] },
      { kind: 'hate_rent', count: [1, 3] },
      { kind: 'hell_chain', count: [1, 3] },
    ],
    layout: [
      // THE SCAR FIELDS (base face): open war-ground — rents, glass, relics.
      { kind: 'abyssal_rent', count: [0, 1] },
      { kind: 'ravine', count: [1, 1] },
      { kind: 'chasm', count: [0, 1] },
      { kind: 'rocks', count: [8, 14], radius: [24, 50] },
      { kind: 'hate_glass', count: [2, 4] },
      { kind: 'hell_fin', count: [2, 4] },
      { kind: 'impaler_stake', count: [1, 3] },
      { kind: 'rib_arch', count: [0, 1] },
      { kind: 'black_obelisk', count: [0, 1] },
      { kind: 'bone_pile', count: [2, 4] },
      { kind: 'dead_tree', count: [2, 4] },
      { kind: 'gallows', count: [0, 1] },
      { kind: 'cliff', count: [1, 2] },
      { kind: 'rock_spire', count: [1, 2] }, { kind: 'scree', count: [1, 2] },
      { kind: 'ruin', count: [0, 2] },
      { kind: 'camp', count: [1, 2] },
      // The war's little teeth outlived the war.
      { kind: 'rusted_snare', count: [0, 3] },
      { kind: 'formation', count: [1, 2], formation: 'gibbet_road' },
      { kind: 'structure', count: [0, 1], structure: 'fortress_gate' },
    ],
    variants: [
      // BRANDMARCH: the Legion's lit war-road — somebody keeps the braziers
      // burning, and the toll cages along it are not all empty.
      {
        name: 'Brandmarch',
        layout: [
          { kind: 'hate_brazier', count: [3, 6] },
          { kind: 'demon_banner', count: [2, 4] },
          { kind: 'soul_cage', count: [2, 4] },
          { kind: 'impaler_stake', count: [3, 6] },
          { kind: 'torture_rack', count: [1, 2] },
          { kind: 'hate_idol', count: [0, 1] },
          { kind: 'hell_fin', count: [1, 3] },
          { kind: 'rocks', count: [6, 10], radius: [22, 44] },
          { kind: 'dead_tree', count: [1, 3] },
          { kind: 'bone_pile', count: [2, 4] },
          { kind: 'camp', count: [1, 2] },
          { kind: 'formation', count: [1, 2], formation: 'hate_lights' },
          { kind: 'formation', count: [0, 1], formation: 'stake_line' },
          { kind: 'structure', count: [0, 1], structure: 'fortress_gate' },
        ],
      },
      // SUNDERED: the wound laid open — more tear than field, the glass
      // still standing where the crust let go.
      {
        name: 'Sundered',
        layout: [
          { kind: 'gore', count: [1, 2] },
          { kind: 'hate_rent', count: [2, 4] },
          { kind: 'abyssal_rent', count: [1, 3] },
          { kind: 'chasm', count: [1, 2] },
          { kind: 'rocks', count: [6, 10], radius: [22, 44] },
          { kind: 'hate_glass', count: [3, 6] },
          { kind: 'hell_fin', count: [2, 4] },
          { kind: 'rib_arch', count: [0, 2] },
          { kind: 'bone_pile', count: [1, 3] },
          { kind: 'dead_tree', count: [1, 3] },
          { kind: 'ruin', count: [0, 1] },
          { kind: 'formation', count: [1, 2], formation: 'rent_run' },
        ],
      },
    ],
    packs: {
      count: [6, 8], size: [3, 5],
      table: [
        { id: 'imp', weight: 3, presence: { to: 22, fadeOut: 12 } },
        { id: 'fulgur_imp', weight: 2, presence: { from: 4, fadeIn: 2 } },
        { id: 'hellhound', weight: 3 },
        { id: 'cinder_fiend', weight: 2, presence: { from: 6, fadeIn: 3 } },
        { id: 'searing_spawn', weight: 2, presence: { from: 8, fadeIn: 4 } },
        { id: 'dread_fiend', weight: 2, presence: { from: 10, fadeIn: 5 } },
        { id: 'brute', weight: 1, presence: { to: 12, fadeOut: 6 } },
        // The gate-tender: its summons drip whelps until the maw is closed.
        { id: 'hellgate_caller', weight: 1, presence: { from: 12, fadeIn: 5 } },
        // The deep-war Legion walks its own wastes.
        { id: 'bloodgorger', weight: 1, presence: { from: 18, fadeIn: 5 } },
        { id: 'chained_tormentor', weight: 1, presence: { from: 16, fadeIn: 6 } },
        { id: 'ruin_chanter', weight: 1, presence: { from: 8, fadeIn: 4 } },
        // The wound's own: the clerisy that tends the rents, and the
        // branded mule that hauls the war's take (carry — what you see
        // strapped to it is what it drops).
        { id: 'unmaker_acolyte', weight: 2, presence: { from: 9, fadeIn: 4 } },
        { id: 'hatebound_hulk', weight: 1, presence: { from: 11, fadeIn: 5 } },
        // The pit country's angler hunts the rents (the magma fauna stayed
        // in the volcanic country where the lava lanes are).
        { id: 'void_angler', weight: 2, presence: { from: 8, fadeIn: 3 } },
      ],
    },
    spawnerId: 'breach_scar',
    objectives: [
      { kind: 'offering', weight: 1 },
      { kind: 'bounty', weight: 1 },
      { kind: 'circuit', weight: 1 },
      { kind: 'beacon', weight: 1 },
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
      { kind: 'offering', weight: 1 },
      { kind: 'bounty', weight: 1 },
      { kind: 'beacon', weight: 1 },
      { kind: 'clear', weight: 3 },
      { kind: 'escape', weight: 1 },
      { kind: 'spawners', weight: 2 },
      { kind: 'waves', weight: 1 },
    ],
  },

  // THE CAUL — hell-only membrane country (biome 'caul'): the invading
  // organism the Underworld itself is afraid of. Giger's bargain honored in
  // data: black chitin over pale meat, ichor throughlines, egg-light — and
  // the TERRAIN FIGHTS: maw pits reel (doodad-effect lane), sacs erupt
  // (brittle lane), and half the "decor" is caulborn wearing ambush (actor
  // lane). The creep fabric is the biome's ground game — caulflesh pockets
  // ambient, heart-anchored pockets on the monsters, kill the heart to
  // take the floor back. Palette doctrine: near-black bruise violets, the
  // wall a full luminance step above the floor (CONTRAST GUARD clear), and
  // every light source diegetic (sacs, roots, the umbilic's weld-ring).
  caul: {
    id: 'caul', biome: 'caul',
    nameFirst: ['Caulbound', 'Amniotic', 'Blackvein', 'Chrysalid', 'Nerveworn', 'Sunless', 'Weeping', 'Umbilic', 'Pale-Lit', 'Meatgrown'],
    nameSecond: ['Sprawl', 'Warrens', 'Fold', 'Womb', 'Reach', 'Hollows', 'Nave', 'Depths', 'Gullet', 'Cradle'],
    theme: {
      heat: 0.62, dayLight: 0.7, nightDark: 0.85, ambientDark: 0.28,
      ambientFx: [
        { kind: 'motes', intensity: 0.3, color: '#8a6ab0' },
      ],
      ground: {
        palette: ['#0b080e', '#140f18', '#1c1522', '#241a2c', '#2c2136'],
        bias: 0.42, alpha: 0.55, scale: 1.4, speckles: 0.5, strength: 1.1,
      },
      floor: '#0f0b12', grid: '#181020', border: '#3a2c48',
      obstacle: '#241a2e', obstacleEdge: '#5a4468', accent: '#9a72c8',
      // Wall kept a full luminance step above the near-black floor so the
      // baker's CONTRAST GUARD never has to rescue it.
      wall: '#3a2438', chasm: '#060409', mud: '#221828', water: '#1a2430',
      // The living fog + the living skin: the biome's two breaths.
      fog: { banks: [1, 2], kinds: [{ id: 'caul_murk' }] },
      creep: { pockets: [2, 4], kinds: [{ id: 'caulflesh' }] },
    },
    sizeW: [2400, 3400], sizeH: [1700, 2400], ellipseChance: 0.2,
    layoutParams: { ridges: [2, 4], gateTerrace: { chance: 0.5 } },
    layout: [
      // Ground scars and pools FIRST (forbidOn honored by later solids).
      { kind: 'gore', count: [1, 3], radius: [36, 70] },
      { kind: 'maw_pit', count: [1, 2], radius: [26, 36] },
      { kind: 'nerve_root', count: [2, 4], radius: [20, 30] },
      // The skeleton showing through: fins, arches, the one great cable.
      { kind: 'chitin_fin', count: [4, 8], radius: [16, 30] },
      { kind: 'rib_arch', count: [1, 3] },
      { kind: 'black_umbilic', count: [0, 1], radius: [22, 30] },
      // The soft tissue: sacs, eyes, honest stone the organism grew over.
      { kind: 'caul_sac', count: [3, 6], radius: [12, 20] },
      { kind: 'caul_eyes', count: [2, 4], radius: [12, 18] },
      { kind: 'bone_pile', count: [1, 3] },
      { kind: 'rocks', count: [5, 9], radius: [20, 40] },
      { kind: 'rock_spire', count: [0, 2] },
      { kind: 'formation', count: [1, 2], formation: 'fin_ridge' },
      { kind: 'formation', count: [0, 1], formation: 'sac_clutch' },
    ],
    variants: [
      // THE NURSERY: the clutch-dense mood — more sacs, more eyes, more
      // regret for area builds that like popping things.
      { name: 'Nursery', layout: [
        { kind: 'gore', count: [1, 2], radius: [30, 56] },
        { kind: 'maw_pit', count: [0, 1], radius: [24, 32] },
        { kind: 'nerve_root', count: [3, 5], radius: [20, 30] },
        { kind: 'caul_sac', count: [7, 12], radius: [12, 22] },
        { kind: 'caul_eyes', count: [3, 6], radius: [12, 18] },
        { kind: 'chitin_fin', count: [2, 4], radius: [14, 24] },
        { kind: 'rib_arch', count: [1, 2] },
        { kind: 'rocks', count: [4, 7], radius: [20, 36] },
        { kind: 'formation', count: [1, 2], formation: 'sac_clutch' },
      ] },
      // THE OSSIFIED MARCH: the chitin mood — the organism's armor country,
      // fins in processional ridges, barely any soft tissue to pop.
      { name: 'Ossified', layout: [
        { kind: 'chitin_fin', count: [7, 12], radius: [18, 34] },
        { kind: 'rib_arch', count: [2, 4] },
        { kind: 'black_umbilic', count: [0, 1], radius: [22, 30] },
        { kind: 'nerve_root', count: [1, 3], radius: [18, 26] },
        { kind: 'bone_pile', count: [2, 4] },
        { kind: 'rocks', count: [6, 10], radius: [22, 42] },
        { kind: 'rock_spire', count: [1, 2] },
        { kind: 'formation', count: [2, 3], formation: 'fin_ridge' },
      ] },
    ],
    packs: {
      count: [6, 8], size: [3, 5],
      table: [
        { id: 'caul_tick', weight: 3, presence: { to: 20, fadeOut: 9 } },
        { id: 'amnion_creeper', weight: 2 },
        { id: 'caul_lasher', weight: 2 },
        { id: 'nerve_weaver', weight: 2, presence: { from: 8, fadeIn: 4 } },
        { id: 'vor_maw', weight: 1, presence: { from: 10, fadeIn: 4 } },
        { id: 'chrysalid_broodmother', weight: 1, presence: { from: 12, fadeIn: 5 } },
        { id: 'caul_heart', weight: 1, presence: { from: 9, fadeIn: 4 } },
        // Kin from the far side of the membrane: the eldritch recognize
        // their vanguard (RELATIONS ally) — a thin late-band seasoning.
        { id: 'flesh_amalgam', weight: 1, presence: { from: 16, fadeIn: 6 } },
      ],
    },
    spawnerId: 'birthing_pod',
    objectives: [
      { kind: 'offering', weight: 1 },
      { kind: 'bounty', weight: 1 },
      { kind: 'beacon', weight: 1 },
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
    sky: 'sheltered', // the first fully INDOOR biome — the citadel owns its own sky

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
        // The Hollowborn — the citadel's armory never agreed to the surrender.
        { id: 'hollow_vanguard', weight: 2, presence: { from: 8, fadeIn: 4 } },
        { id: 'shield_anima', weight: 2, presence: { from: 9, fadeIn: 4 } },
        { id: 'the_unworn', weight: 1, presence: { from: 14, fadeIn: 6 } },
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
      { kind: 'offering', weight: 1 },
      { kind: 'bounty', weight: 1 },
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
      // The dead-cart's round never finished: fresh mounds, and sometimes the
      // stalled cart itself — strike either and the corpse economy pays out.
      { kind: 'shallow_grave', count: [1, 3] },
      { kind: 'formation', count: [0, 1], formation: 'charnel_waystop' },
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
        // The rival customer: it eats the bodies your detonations wanted.
        { id: 'charnel_ghoul', weight: 2 },
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
      { kind: 'offering', weight: 1 },
      { kind: 'bounty', weight: 1 },
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
    id: 'ossuary', frontier: false, perfProbe: true,
    sky: 'sheltered', // the Necropolis' interior sanctum — bone vaults under stone

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
        // The Hollowborn — the galleries' interred iron walks its own rounds.
        { id: 'hollow_vanguard', weight: 2, presence: { from: 5, fadeIn: 3 } },
        { id: 'blade_swarm', weight: 1, presence: { from: 6, fadeIn: 3 } },
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
      { kind: 'offering', weight: 1 },
      { kind: 'bounty', weight: 1 },
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
        // The tideline's own: skitter swarms in the wrack, lurchers in the reef.
        { id: 'tide_skitter', weight: 3, presence: { to: 18, fadeOut: 9 } },
        { id: 'reef_lurcher', weight: 1, presence: { from: 5, fadeIn: 3 } },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [
      { kind: 'bounty', weight: 1 },
      { kind: 'circuit', weight: 1 },
      { kind: 'procession', weight: 1 },
      { kind: 'beacon', weight: 1 },
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
      // Morning weather that never quite burns off (the Weatherworks kit).
      { kind: 'mist_pool', count: [1, 3] },
      { kind: 'haven_stone', count: [0, 1] },
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
      { kind: 'bounty', weight: 1 },
      { kind: 'circuit', weight: 1 },
      { kind: 'procession', weight: 1 },
      { kind: 'beacon', weight: 1 },
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
        // The isle's own tideline fauna + what the storms wreck ashore.
        { id: 'tide_skitter', weight: 3, presence: { to: 18, fadeOut: 9 } },
        { id: 'reef_lurcher', weight: 2, presence: { from: 4, fadeIn: 2 } },
        { id: 'tidewrack_shambler', weight: 1, presence: { from: 8, fadeIn: 4 } },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [
      { kind: 'bounty', weight: 1 },
      { kind: 'circuit', weight: 1 },
      { kind: 'procession', weight: 1 },
      { kind: 'beacon', weight: 1 },
      { kind: 'clear', weight: 3 },
      { kind: 'escape', weight: 2 },
      { kind: 'spawners', weight: 2 },
    ],
  },

  // CAVERN — the underground a cave mouth descends into. Off the world graph:
  // minted by worldgen.mintCave, never reached through a frontier portal. No
  // biome tag (caves don't tint the map — they aren't on it). Tight and rocky.
  cavern: {
    id: 'cavern', frontier: false, perfProbe: true,
    sky: 'sheltered', // underground by definition (mintCave also stamps caveDepth)

    // THE GENERALIST FACE: every biome's near-dark default (the mul keeps the
    // classic crawl dominant in the Galleries), fading as the ladder leaves
    // them — by the Depths the specialist faces (depths/magma/rime/fungal)
    // own the pool. variantChance keeps the base mixed crawl common while
    // the dressed variants stay a real find.
    caveFace: { strata: { to: 2, fadeOut: 2, mul: 1.6 }, variantChance: 0.55 },
    // What a cave BECOMES underground: the classic convex crawl, the maggot-
    // lair warren, a catacomb dungeon, or a full maze — one seeded roll at
    // mint (mintCave), pure data. The grid layouts carry the SECRETS (the
    // hollows fabric hunts wall mass), so they weigh a little heavier now.
    caveLayouts: { plains: 4.5, rooms: 2.5, dungeon: 2, labyrinth: 1 },
    // What the walls are hiding (grid layouts): mostly honest treasure and
    // trouble; sometimes a passage the map never admitted to; rarely, the
    // lid on a whole further cave.
    hollows: {
      count: [1, 2],
      table: {
        cache_hollow: 3, ambush_hollow: 2, vein_hollow: 2,
        hermit_hollow: 1, passage_hollow: 1.5, crevice_hollow: 1.2,
      },
    },
    nameFirst: ['Dripstone', 'Gloom', 'Hollow', 'Sunless', 'Blackrock', 'Echoing', 'Lightless', 'Dampstone', 'Crawlway', 'Stalactite', 'Deepdark', 'Mossgrot', 'Whispering', 'Coldstone', 'Slickrock', 'Veiled', 'Mirefoot', 'Lampless'],
    nameSecond: ['Cave', 'Grotto', 'Burrow', 'Den', 'Tunnels', 'Deep', 'Cavern', 'Warren', 'Crawl', 'Pocket', 'Undercroft', 'Gallery', 'Shaft', 'Vault', 'Maw', 'Reaches'],
    theme: {
      ambientDark: 0.5,
      floor: '#0c0c10', grid: '#15151c', border: '#3a3a4e',
      obstacle: '#26263a', obstacleEdge: '#44445e', accent: '#8a9ac8',
      chasm: '#040406', mud: '#16161e', water: '#12202c', lava: '#5a1606',
    },
    sizeW: [1200, 1700], sizeH: [900, 1300],
    // What a cave ALWAYS is, whichever face or variant rolls (the brittle-kit
    // doctrine): webs and old bones, storage pots, plugs poised to fall, a
    // wall that isn't one — EVERY cave hides at least one (rooms-rolled mazes
    // hunt wall-adjacent cells; convex caves tuck it against a cliff flank) —
    // gem lattices, gas bladders, a mineral vein to strike and, sometimes,
    // the kit of whoever came spelunking before you.
    common: [
      { kind: 'web', count: [1, 3] }, { kind: 'bone_pile', count: [1, 3] },
      { kind: 'clay_pots', count: [1, 2] },
      { kind: 'crumbling_wall', count: [1, 3] },
      { kind: 'secret_wall', count: [1, 2] },
      { kind: 'crystal_cluster', count: [1, 3] },
      { kind: 'gas_pod', count: [0, 2] },
      { kind: 'crystal_vein', count: [0, 2] },
      { kind: 'spelunker_pack', count: [0, 1] },
    ],
    layout: [
      { kind: 'brazier', count: [0, 2] },
      { kind: 'rocks', count: [14, 22], radius: [20, 46] },
      { kind: 'scree', count: [2, 4] }, { kind: 'rock_spire', count: [0, 2] },
      { kind: 'stalagmite', count: [2, 5] },
      { kind: 'flowstone', count: [1, 3] },
      { kind: 'cliff', count: [3, 5] },
      { kind: 'chasm', count: [0, 2] },
      { kind: 'water', count: [0, 1] },
      { kind: 'lava', count: [0, 1] },
      { kind: 'guano_heap', count: [0, 2] },
      { kind: 'formation', count: [0, 1], formation: 'stalagmite_run' },
    ],
    // The cave's FACES within the face: what the water was doing down here.
    // Rolled per mint by the strata fabric (caveFace.variantChance) — the
    // base mixed crawl stays common; a dressed gallery is a find.
    variants: [
      {
        name: 'dripstone gallery',
        layout: [
          { kind: 'rocks', count: [8, 14], radius: [20, 42] },
          { kind: 'stalagmite', count: [5, 9] },
          { kind: 'dripstone_column', count: [2, 4] },
          { kind: 'flowstone', count: [2, 4] },
          { kind: 'rimstone_pool', count: [1, 3] },
          { kind: 'cliff', count: [2, 4] },
          { kind: 'water', count: [0, 1] },
          { kind: 'formation', count: [1, 2], formation: 'stalagmite_run' },
          { kind: 'formation', count: [0, 1], formation: 'dripstone_colonnade' },
        ],
      },
      {
        name: 'crystal grotto',
        layout: [
          { kind: 'rocks', count: [8, 14], radius: [18, 40] },
          { kind: 'crystal', count: [3, 6] },
          { kind: 'crystal_cluster', count: [2, 4] },
          { kind: 'crystal_vein', count: [1, 3] },
          { kind: 'scree', count: [1, 3] },
          { kind: 'cliff', count: [2, 4] },
          { kind: 'chasm', count: [0, 1] },
          { kind: 'formation', count: [1, 1], formation: 'crystal_garden' },
        ],
        theme: { accent: '#9fd8ff', obstacleEdge: '#5a6a9a' },
      },
      {
        name: 'flooded gallery',
        layout: [
          { kind: 'water', count: [3, 5] },
          { kind: 'mud', count: [2, 4] },
          { kind: 'rimstone_pool', count: [2, 4] },
          { kind: 'flowstone', count: [1, 3] },
          { kind: 'rocks', count: [10, 16], radius: [18, 40] },
          { kind: 'glowworm_veil', count: [1, 3] },
          { kind: 'cliff', count: [2, 4] },
          { kind: 'stalagmite', count: [1, 3] },
        ],
        theme: { water: '#164050', accent: '#7fc8d8' },
      },
      {
        name: 'bat hollow',
        layout: [
          { kind: 'guano_heap', count: [3, 6] },
          { kind: 'web', count: [2, 4] },
          { kind: 'bone_pile', count: [2, 4] },
          { kind: 'rocks', count: [10, 16], radius: [18, 42] },
          { kind: 'stalagmite', count: [2, 4] },
          { kind: 'cliff', count: [3, 5] },
          { kind: 'chasm', count: [1, 2] },
        ],
      },
    ],
    compositions: [
      { composition: 'dripstone_cathedral', chance: 0.16 },
      { composition: 'glowworm_grotto', chance: 0.14 },
      { composition: 'hermits_camp', chance: 0.12 },
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

  // THE DEPTHS — the sunless band's own face (strata band 3–4, world/strata
  // .ts): Depthkin country, glowworm light, water that has never seen rain.
  // The same country the Delver's boundless abyss belongs to — reached the
  // slow way, by delving cave through cave through cave.
  depths: {
    id: 'depths', frontier: false, perfProbe: true,
    sky: 'sheltered',
    // The band's OWN face leads its band (the mul): the specialists flavor
    // the Depths; the Depths are still, first, the Depths.
    caveFace: { strata: { from: 3, fadeIn: 1, mul: 1.5 }, variantChance: 0.45 },
    caveLayouts: { plains: 3, rooms: 2.5, dungeon: 2, labyrinth: 1.5 },
    // The Depths keep more secrets, and meaner ones — and the deep's hollows
    // lean toward the way DOWN.
    hollows: {
      count: [1, 3],
      table: {
        cache_hollow: 2.5, ambush_hollow: 2.5, vein_hollow: 2,
        hermit_hollow: 1, passage_hollow: 1.5, crevice_hollow: 1.8,
      },
    },
    nameFirst: ['Sunless', 'Echoless', 'Hushed', 'Chasmveiled', 'Blindstone', 'Yawning', 'Sightless', 'Aphotic', 'Stonelocked', 'Soundless', 'Unlit', 'Gulfborn', 'Everdark', 'Starving', 'Forgotten', 'Depthbound'],
    nameSecond: ['Depths', 'Gulf', 'Hollows', 'Reaches', 'Galleries', 'Abysm', 'Fathoms', 'Silence', 'Vault', 'Warrens', 'Dark', 'Under'],
    theme: {
      ambientDark: 0.6,
      floor: '#08060e', grid: '#110d1c', border: '#3a3452',
      obstacle: '#221d38', obstacleEdge: '#453e66', accent: '#7fe0d8',
      chasm: '#020204', water: '#0e1e2c', mud: '#120f1c', wall: '#241f3c',
      ground: {
        scale: 1.1, strength: 1.1, bias: 0.4,
        palette: ['#060410', '#0c0918', '#141024', '#1c1730', '#26203e'],
      },
      ambientFx: [{ kind: 'motes', color: '#7fe0d8', intensity: 0.25 }],
    },
    sizeW: [1400, 2000], sizeH: [1050, 1500],
    common: [
      { kind: 'web', count: [1, 3] }, { kind: 'bone_pile', count: [1, 3] },
      { kind: 'crumbling_wall', count: [1, 2] },
      { kind: 'secret_wall', count: [1, 2] },
      { kind: 'crystal_vein', count: [1, 3] },
      { kind: 'gas_pod', count: [0, 2] },
      { kind: 'spelunker_pack', count: [0, 1] },
    ],
    layout: [
      { kind: 'rocks', count: [12, 20], radius: [22, 48] },
      { kind: 'stalagmite', count: [4, 8] },
      { kind: 'dripstone_column', count: [1, 3] },
      { kind: 'glowworm_veil', count: [3, 6] },
      { kind: 'rimstone_pool', count: [1, 3] },
      { kind: 'flowstone', count: [1, 3] },
      { kind: 'cliff', count: [3, 5] },
      { kind: 'chasm', count: [1, 3] },
      { kind: 'water', count: [0, 2] },
      { kind: 'formation', count: [0, 1], formation: 'stalagmite_run' },
    ],
    variants: [
      {
        name: 'glowworm deeps',
        layout: [
          { kind: 'glowworm_veil', count: [6, 10] },
          { kind: 'rimstone_pool', count: [2, 4] },
          { kind: 'water', count: [1, 3] },
          { kind: 'rocks', count: [10, 16], radius: [20, 44] },
          { kind: 'stalagmite', count: [2, 5] },
          { kind: 'cliff', count: [2, 4] },
          { kind: 'formation', count: [1, 1], formation: 'glowworm_court' },
        ],
        theme: { accent: '#8fe8c8' },
      },
      {
        name: 'riven dark',
        layout: [
          { kind: 'chasm', count: [3, 5] },
          { kind: 'rock_spire', count: [2, 4] },
          { kind: 'scree', count: [2, 4] },
          { kind: 'rocks', count: [12, 18], radius: [22, 48] },
          { kind: 'stalagmite', count: [3, 6] },
          { kind: 'cliff', count: [3, 5] },
          { kind: 'glowworm_veil', count: [1, 3] },
        ],
      },
    ],
    compositions: [
      { composition: 'glowworm_grotto', chance: 0.35 },
      { composition: 'dripstone_cathedral', chance: 0.22 },
      { composition: 'hermits_camp', chance: 0.12 },
    ],
    packs: {
      count: [4, 6], size: [3, 5],
      table: [
        // The Depthkin: born down here, no idea of the sky (the Descent's
        // overlay faction — the ladder's Depths band is their home ground).
        { id: 'depthkin_crawler', weight: 3 },
        { id: 'depthkin_lurker', weight: 2, presence: { from: 6, fadeIn: 3 } },
        { id: 'depthkin_seer', weight: 2, presence: { from: 6, fadeIn: 3 } },
        { id: 'depthkin_brute', weight: 1, presence: { from: 9, fadeIn: 4 } },
        // The dark's own anglers and alarms, denser than the galleries above.
        { id: 'gloom_fisher', weight: 2 },
        { id: 'stalagmite_lurker', weight: 2 },
        { id: 'cavern_shrieker', weight: 1 },
        { id: 'gloomling', weight: 2 },
        { id: 'gloom_stalker', weight: 1, presence: { from: 12, fadeIn: 5 } },
        { id: 'widow_matron', weight: 1, presence: { from: 10, fadeIn: 4 } },
        { id: 'bulwark_scuttler', weight: 1, presence: { from: 8, fadeIn: 4 } },
      ],
    },
    spawnerId: 'grub_clutch',
    biome: 'cavern',
    objectives: [
      { kind: 'clear', weight: 1 },
      { kind: 'spawners', weight: 1 },
    ],
    structures: [
      { structure: 'dungeon_block', chance: 0.18 },
    ],
  },

  // MAGMA GALLERY — the underground remembering it is a volcano. Under
  // volcanic country it's the neighbourhood (caveFace.biomes); anywhere else
  // you have simply delved deep enough for the world's own heat — the strata
  // envelope answers "why is the lava pit HERE?" both ways.
  magma_gallery: {
    id: 'magma_gallery', frontier: false, perfProbe: true,
    sky: 'sheltered',
    caveFace: {
      strata: { stops: [[1, 0.1], [2, 0.22], [3, 0.55], [4, 1]] },
      biomes: { volcanic: 8, flame: 6, steppes: 2.5, rift: 2.5, desert: 1.5, '*': 1 },
      variantChance: 0.35,
    },
    caveLayouts: { plains: 4, winding: 2, rooms: 2 },
    hollows: {
      count: [1, 2],
      table: {
        cache_hollow: 2, ambush_hollow: 2, vein_hollow: 3,
        passage_hollow: 1.5, crevice_hollow: 1.2,
      },
    },
    nameFirst: ['Smoldering', 'Emberlit', 'Slagbound', 'Moltenveined', 'Cindershot', 'Basaltbound', 'Scorchhollow', 'Ashchoked', 'Magmascarred', 'Furnacedeep', 'Firegut', 'Glowering'],
    nameSecond: ['Gallery', 'Forgeways', 'Flowcaves', 'Undercroft', 'Slagworks', 'Emberdeep', 'Crucible', 'Ventworks', 'Firehollow', 'Scoria'],
    theme: {
      ambientDark: 0.42,
      heat: 0.85,
      floor: '#140b08', grid: '#1f1009', border: '#5a3018',
      obstacle: '#3a2014', obstacleEdge: '#7a4222', accent: '#ff8a3a',
      lava: '#7a1a08', chasm: '#160502', wall: '#2e1a10',
      ambientFx: [{ kind: 'heatHaze', intensity: 0.35, color: '#ffb070' }],
    },
    sizeW: [1150, 1600], sizeH: [880, 1250],
    common: [
      { kind: 'crumbling_wall', count: [1, 2] },
      { kind: 'secret_wall', count: [1, 1] },
      { kind: 'cinder', count: [1, 3] },
      { kind: 'crystal_vein', count: [0, 2] },
      { kind: 'spelunker_pack', count: [0, 1] },
    ],
    // The volcanic doctrine: ground hazards (lava, ravine) stamp FIRST so the
    // solids placed after honour their forbidOn.
    layout: [
      { kind: 'lava', count: [1, 3] },
      { kind: 'ravine', count: [0, 1] },
      { kind: 'ember_vent', count: [1, 3] },
      { kind: 'obsidian', count: [3, 6] },
      { kind: 'basalt_column', count: [2, 5] },
      { kind: 'rocks', count: [10, 16], radius: [20, 44] },
      { kind: 'scree', count: [1, 3] },
      { kind: 'magma_core', count: [0, 1] },
      { kind: 'chasm', count: [0, 1] },
      { kind: 'formation', count: [0, 1], formation: 'basalt_procession' },
    ],
    variants: [
      {
        name: 'cooled flows',
        layout: [
          { kind: 'basalt_column', count: [4, 8] },
          { kind: 'obsidian', count: [4, 7] },
          { kind: 'cinder', count: [2, 4] },
          { kind: 'rocks', count: [10, 16], radius: [20, 44] },
          { kind: 'lava', count: [0, 1] },
          { kind: 'chasm', count: [0, 1] },
          { kind: 'formation', count: [1, 2], formation: 'basalt_procession' },
        ],
        theme: { accent: '#d8905a', heat: 0.6 },
      },
      {
        name: 'living forge',
        layout: [
          { kind: 'lava', count: [2, 4] },
          { kind: 'lava_vent', count: [1, 2] },
          { kind: 'ember_vent', count: [2, 4] },
          { kind: 'magma_core', count: [1, 2] },
          { kind: 'obsidian', count: [3, 5] },
          { kind: 'rocks', count: [8, 12], radius: [18, 40] },
          { kind: 'basalt_column', count: [1, 3] },
        ],
        theme: { heat: 1, ambientDark: 0.36 },
      },
    ],
    compositions: [
      { composition: 'hermits_camp', chance: 0.1 },
    ],
    packs: {
      count: [4, 6], size: [3, 5],
      table: [
        { id: 'magma_worm', weight: 3 },
        { id: 'magma_lurker', weight: 2, presence: { from: 6, fadeIn: 3 } },
        { id: 'fire_golem', weight: 1, presence: { from: 10, fadeIn: 5 } },
        { id: 'cinder_hound', weight: 2 },
        { id: 'ashling', weight: 2 },
        { id: 'slag_brute', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'rockgrub', weight: 2, presence: { to: 14, fadeOut: 7 } },
        { id: 'spitting_horror', weight: 1, presence: { to: 14, fadeOut: 7 } },
        { id: 'cave_bat', weight: 1 },
      ],
    },
    spawnerId: 'bone_altar',
    biome: 'cavern',
    objectives: [
      { kind: 'clear', weight: 1 },
      { kind: 'spawners', weight: 1 },
    ],
  },

  // RIME GALLERY — the underground under winter: blue ice, brittle fangs,
  // breath you can see. The neighbourhood under tundra and taiga; a rare
  // cold pocket anywhere else (caveFace.biomes '*' runs low on purpose).
  rime_gallery: {
    id: 'rime_gallery', frontier: false, perfProbe: true,
    sky: 'sheltered',
    caveFace: {
      strata: { stops: [[1, 0.35], [2, 0.6], [3, 0.8]] },
      biomes: { tundra: 8, taiga: 5, highland: 2, '*': 0.22 },
      variantChance: 0.35,
    },
    caveLayouts: { plains: 4, rooms: 2.5, labyrinth: 0.8 },
    hollows: {
      count: [1, 2],
      table: {
        cache_hollow: 3, ambush_hollow: 1.5, vein_hollow: 2.5,
        hermit_hollow: 1.5, passage_hollow: 1.2, crevice_hollow: 1,
      },
    },
    nameFirst: ['Hoarbound', 'Rimelocked', 'Glacierheart', 'Frostveined', 'Icefanged', 'Winterdeep', 'Shiverstone', 'Coldvault', 'Hailborn', 'Glassbound', 'Frozen', 'Snowblind'],
    nameSecond: ['Gallery', 'Icecaves', 'Rimeworks', 'Hollow', 'Frostdeep', 'Undercroft', 'Coldreach', 'Icevault', 'Glacier', 'Hibernal'],
    theme: {
      ambientDark: 0.46,
      floor: '#0d1218', grid: '#141c26', border: '#3c5468',
      obstacle: '#26384a', obstacleEdge: '#4a6a84', accent: '#9fd8f0',
      water: '#123246', chasm: '#04070c', wall: '#22344a',
      ground: {
        scale: 1.3, strength: 1.05, bias: 0.46,
        palette: ['#0a0f16', '#101823', '#182432', '#223243', '#2e4258'],
      },
    },
    sizeW: [1150, 1600], sizeH: [880, 1250],
    common: [
      { kind: 'icicle_cluster', count: [1, 3] },
      { kind: 'crumbling_wall', count: [1, 2] },
      { kind: 'secret_wall', count: [1, 1] },
      { kind: 'crystal_vein', count: [0, 2] },
      { kind: 'spelunker_pack', count: [0, 1] },
    ],
    layout: [
      { kind: 'ice', count: [3, 5] },
      { kind: 'ice_spike', count: [2, 5] },
      { kind: 'snowdrift', count: [2, 4] },
      { kind: 'rocks', count: [10, 16], radius: [20, 44] },
      { kind: 'dripstone_column', count: [1, 3] },
      { kind: 'stalagmite', count: [2, 4] },
      { kind: 'cliff', count: [2, 4] },
      { kind: 'water', count: [0, 1] },
      { kind: 'chasm', count: [0, 1] },
      { kind: 'formation', count: [0, 1], formation: 'ice_teeth' },
    ],
    variants: [
      {
        name: 'crevasse',
        layout: [
          { kind: 'chasm', count: [2, 4] },
          { kind: 'ice', count: [3, 5] },
          { kind: 'ice_spike', count: [3, 6] },
          { kind: 'rocks', count: [8, 14], radius: [20, 44] },
          { kind: 'scree', count: [2, 4] },
          { kind: 'cliff', count: [3, 5] },
          { kind: 'formation', count: [1, 2], formation: 'ice_teeth' },
        ],
      },
      {
        name: 'frozen mere',
        layout: [
          { kind: 'water', count: [2, 3] },
          { kind: 'ice', count: [4, 6] },
          { kind: 'rimstone_pool', count: [1, 3] },
          { kind: 'ice_spike', count: [2, 4] },
          { kind: 'rocks', count: [8, 14], radius: [18, 40] },
          { kind: 'dripstone_column', count: [1, 3] },
          { kind: 'cliff', count: [2, 4] },
        ],
        theme: { water: '#0e3c56', accent: '#bfe8f8' },
      },
    ],
    compositions: [
      { composition: 'hermits_camp', chance: 0.12 },
    ],
    packs: {
      count: [4, 6], size: [3, 5],
      table: [
        { id: 'rime_stone', weight: 2 },
        { id: 'ice_golem', weight: 1, presence: { from: 10, fadeIn: 5 } },
        { id: 'frost_witch', weight: 2 },
        { id: 'husk_swarmer', weight: 2, presence: { to: 18, fadeOut: 8 } },
        { id: 'prism_creeper', weight: 1, presence: { from: 7, fadeIn: 3 } },
        { id: 'cave_bat', weight: 2 },
        { id: 'rockgrub', weight: 2, presence: { to: 16, fadeOut: 8 } },
        { id: 'gloom_fisher', weight: 1, presence: { from: 9, fadeIn: 4 } },
      ],
    },
    spawnerId: 'bone_altar',
    biome: 'cavern',
    objectives: [
      { kind: 'clear', weight: 1 },
      { kind: 'spawners', weight: 1 },
    ],
  },

  // FUNGAL HOLLOW — the mycelium in the dark: the Bloom's underground root,
  // glowcap lanterns, spore-choked air. The neighbourhood under mycelia
  // country; common enough anywhere damp (the '*' base) — rot needs no map.
  fungal_hollow: {
    id: 'fungal_hollow', frontier: false, perfProbe: true,
    sky: 'sheltered',
    caveFace: {
      strata: { stops: [[1, 0.35], [2, 0.8], [3, 1], [5, 0.7]] },
      biomes: { mycelia: 8, grove: 1.6, forest: 1.6, jungle: 2, marsh: 2.5, '*': 0.65 },
      variantChance: 0.4,
    },
    caveLayouts: { mycelia: 3.5, plains: 2.5, rooms: 2 },
    hollows: {
      count: [1, 2],
      table: {
        cache_hollow: 2, ambush_hollow: 3, vein_hollow: 1,
        hermit_hollow: 1.5, passage_hollow: 1.5, crevice_hollow: 1,
      },
    },
    nameFirst: ['Sporelit', 'Mycelial', 'Rotveined', 'Capshadowed', 'Glowfringe', 'Moulddeep', 'Hyphal', 'Damprot', 'Fruiting', 'Veilspore', 'Softglow', 'Puffcap'],
    nameSecond: ['Hollow', 'Undergrove', 'Sporeways', 'Rotcellar', 'Warrens', 'Beds', 'Grotto', 'Bloomdeep', 'Tangle', 'Cellars'],
    theme: {
      ambientDark: 0.5,
      floor: '#100a18', grid: '#1a1228', border: '#5a4a7a',
      obstacle: '#32284e', obstacleEdge: '#66548e', accent: '#8fd06f',
      wall: '#32284e', water: '#12283c', mud: '#181226',
      ground: {
        scale: 1.2, strength: 1.1, bias: 0.42, speckles: 1.2,
        palette: ['#0b0714', '#150e20', '#1f152e', '#2b1e3e', '#38294e'],
      },
      ambientFx: [{ kind: 'spores', intensity: 0.7, color: '#b8e88f' }],
    },
    sizeW: [1200, 1700], sizeH: [900, 1300],
    common: [
      { kind: 'burst_sac', count: [1, 3] },
      { kind: 'puffcap_cluster', count: [1, 2] },
      { kind: 'secret_wall', count: [1, 1] },
      { kind: 'glow_cap', count: [2, 4] },
      { kind: 'spelunker_pack', count: [0, 1] },
    ],
    layout: [
      { kind: 'giant_mushroom', count: [2, 5] },
      { kind: 'spore_pod', count: [1, 3] },
      { kind: 'mycelial_mat', count: [2, 4] },
      { kind: 'shelf_fungus', count: [2, 4] },
      { kind: 'toadstool', count: [2, 5] },
      { kind: 'rocks', count: [8, 14], radius: [18, 40] },
      { kind: 'fern', count: [1, 3] },
      { kind: 'mushroom_ring', count: [0, 1] },
      { kind: 'formation', count: [0, 1], formation: 'fungal_procession' },
    ],
    variants: [
      {
        name: 'glowcap cellars',
        layout: [
          { kind: 'glow_cap', count: [5, 9] },
          { kind: 'giant_mushroom', count: [2, 4] },
          { kind: 'mycelial_mat', count: [3, 5] },
          { kind: 'toadstool', count: [3, 6] },
          { kind: 'rocks', count: [6, 12], radius: [18, 38] },
          { kind: 'formation', count: [1, 2], formation: 'fungal_procession' },
        ],
        theme: { ambientDark: 0.44 },
      },
      {
        name: 'sporefall',
        layout: [
          { kind: 'spore_pod', count: [3, 5] },
          { kind: 'burst_sac', count: [2, 4] },
          { kind: 'puffcap_cluster', count: [2, 4] },
          { kind: 'giant_mushroom', count: [2, 4] },
          { kind: 'mycelial_mat', count: [2, 4] },
          { kind: 'rocks', count: [6, 12], radius: [18, 38] },
          { kind: 'shelf_fungus', count: [1, 3] },
        ],
        theme: { ambientFx: [{ kind: 'spores', intensity: 1.1, color: '#cff09f' }] },
      },
    ],
    compositions: [
      { composition: 'fairy_court', chance: 0.3 },
      { composition: 'glowworm_grotto', chance: 0.15 },
      { composition: 'hermits_camp', chance: 0.1 },
    ],
    packs: {
      count: [4, 6], size: [3, 5],
      table: [
        { id: 'fungal_sporeling', weight: 3 },
        { id: 'fungal_spitter', weight: 2 },
        { id: 'fungal_puffball', weight: 2, presence: { to: 16, fadeOut: 8 } },
        { id: 'fungal_brute', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'fungal_tender', weight: 1, presence: { from: 10, fadeIn: 5 } },
        { id: 'mushroomling', weight: 2, presence: { to: 14, fadeOut: 5 } },
        { id: 'myconid_warrior', weight: 2, presence: { from: 5, fadeIn: 3 } },
        { id: 'myconid_capcaller', weight: 1, presence: { from: 9, fadeIn: 4 } },
        { id: 'spore_drifter', weight: 2, presence: { from: 4, fadeIn: 2 } },
        { id: 'giant_maggot', weight: 2, presence: { to: 18, fadeOut: 8 } },
      ],
    },
    spawnerId: 'spore_sac',
    biome: 'cavern',
    objectives: [
      { kind: 'clear', weight: 1 },
      { kind: 'spawners', weight: 1 },
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
        // The chrono wing: the Seer's understudy and the still monk at the
        // rim — the Chronomancer's and Ascetic's kits on the other side.
        { id: 'abyssal_horologist', weight: 1, presence: { from: 6, fadeIn: 3 } },
        { id: 'rift_ascetic', weight: 1, presence: { from: 8, fadeIn: 4 } },
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
      // Time pools badly near the current: the ley country grows its clocks.
      { kind: 'chronolith', count: [1, 3] },
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
      // The Blight OWNS its epicenter ground now (the creep fabric): ambient
      // blightgrowth pockets — the same skin its in-zone events spread into
      // invaded country, grown thick where the incursion was born.
      creep: { pockets: [2, 4], kinds: [{ id: 'blightgrowth' }] },
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
        // Wrecks walk down here too — and the reefs hold their breath.
        { id: 'tidewrack_shambler', weight: 2, presence: { from: 6, fadeIn: 3 } },
        { id: 'reef_lurcher', weight: 2 },
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
      // High-country stillness — and the poacher's craft left wound in the
      // scree (the snare bills whoever springs it; watch your step).
      { kind: 'meditation_cairn', count: [0, 2] },
      { kind: 'rusted_snare', count: [0, 2] },
      // Rockslides strung downslope + a processional the old folk cut.
      { kind: 'formation', count: [1, 2], formation: 'boulder_train' },
      { kind: 'formation', count: [0, 1], formation: 'standing_avenue' },
      // Storm-swept moors remember their strikes.
      { kind: 'formation', count: [0, 1], formation: 'fulgurite_scar' },
      { kind: 'charged_crystal', count: [0, 2] },
      // What the strikes LEAVE: charged brittle glass + a sheltering stone
      // the drovers camp against (the Weatherworks kit).
      { kind: 'stormglass_shard', count: [1, 3] },
      { kind: 'haven_stone', count: [0, 1] },
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
    objectives: [{ kind: 'clear', weight: 3 }, { kind: 'spawners', weight: 2 }, { kind: 'beacon', weight: 1 }, { kind: 'bounty', weight: 1 }],
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
    objectives: [{ kind: 'clear', weight: 3 }, { kind: 'spawners', weight: 2 }, { kind: 'waves', weight: 1 }, { kind: 'beacon', weight: 1 }, { kind: 'bounty', weight: 1 }, { kind: 'offering', weight: 1 }],
  },

  // --- THE FLESH COUNTRY (four faces, one biome tag) -------------------------
  // The flesh is a BODY, not a tileset: four frontier faces share the 'flesh'
  // biome tag and the ONE circular flesh recipe (fleshLayout), each dialing it
  // through its own layoutParams. depthAffinity envelopes stage them across
  // the region — the WARRENS hold the wound-rim where you enter the meat, the
  // SANGUINE pools through the middle depths, the GUTWORKS coils past it, and
  // the OCULAR waits at the deep heart, already watching — so walking inward
  // reads as one body understood organ by organ. Shared spine: the heartbeat
  // clock, the Glut, corpse-bloom spawners, and the vasovagal/queasy/beheld
  // ladders each face weaponizes its own way.

  // FLESH — the WARRENS: the wound-rim warren (the classic face, staged).
  // The chambers throb; sparse organic clutter; aberrant swarm.
  flesh: {
    id: 'flesh', biome: 'flesh',
    depthAffinity: { to: 0.55, fadeOut: 0.3 },
    nameFirst: ['Pulsing', 'Writhing', 'Fleshborn', 'Gorged', 'Throbbing', 'Visceral', 'Sinewed', 'Bilegorged', 'Tumorous', 'Marrow-Deep', 'Quivering', 'Membranous', 'Engorged', 'Pus-Slick', 'Heartbound', 'Glistening', 'Distended', 'Wet-Walled'],
    nameSecond: ['Hollow', 'Womb', 'Maw', 'Warren', 'Gullet', 'Cavity', 'Innards', 'Chamber', 'Sac', 'Viscera', 'Atrium', 'Sinew', 'Antrum'],
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
    // What the warren ALWAYS is, whichever face of it a variant shows.
    common: [
      { kind: 'flesh_membrane', count: [1, 2] },
      { kind: 'vein_cluster', count: [1, 2] },
    ],
    variants: [
      // Skin-deep: stretched membranes and vessels choke the chambers.
      { name: 'membrane-choked', layout: [
        { kind: 'flesh_pod', count: [4, 7] }, { kind: 'flesh_membrane', count: [4, 6] },
        { kind: 'vein_cluster', count: [4, 6] }, { kind: 'eye_stalk', count: [1, 3] },
        { kind: 'gore', count: [2, 4] },
      ] },
      // The body remembers its dead: struts, cages and one long smile.
      { name: 'boneworks gullet', layout: [
        { kind: 'bone', count: [4, 7] }, { kind: 'rib_arch', count: [2, 4] },
        { kind: 'tooth_row', count: [1, 3] }, { kind: 'flesh_pod', count: [2, 4] },
        { kind: 'gore', count: [2, 3] },
      ] },
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
        // The rim tastes the deeper faces before you reach them.
        { id: 'hemophage', weight: 1, presence: { from: 6, fadeIn: 3 } },
        { id: 'bile_retcher', weight: 1, presence: { from: 9, fadeIn: 4 } },
      ],
    },
    // The Glut's own spawners-objective destructible: burst the blooms.
    spawnerId: 'corpse_bloom',
    objectives: [{ kind: 'clear', weight: 3 }, { kind: 'spawners', weight: 2 }, { kind: 'beacon', weight: 1 }, { kind: 'bounty', weight: 1 }, { kind: 'offering', weight: 1 }],
  },

  // SANGUINE — the body's open rivers: blood pooled into galleries and red
  // mirrors, mists that lighten the head (the vasovagal ladder: faintness →
  // swoon, a white-out drag, never a stun), arteries that spurt on the shared
  // beat, and things that live IN the spill. The middle depths of the country.
  sanguine: {
    id: 'sanguine', biome: 'flesh',
    depthAffinity: { from: 0.25, fadeIn: 0.3 },
    // The Sanguine's lost place: the heart the whole country beats for.
    compositions: [{ composition: 'heart_chamber', chance: 0.24 }],
    nameFirst: ['Bleeding', 'Sanguine', 'Arterial', 'Haemal', 'Weeping', 'Splattered', 'Openveined', 'Clotted', 'Exsanguine', 'Red-Running', 'Spilt', 'Wound-Deep', 'Pooling', 'Gushing', 'Crimson-Slick', 'Salt-Sweet'],
    nameSecond: ['Fields', 'Shallows', 'Lakes', 'Banks', 'Basin', 'Fountains', 'Tide', 'Reservoir', 'Spill', 'Font', 'Flow', 'Gallery', 'Wading', 'Redness'],
    layoutParams: {
      // Bigger, opener galleries — the blood needs room to pool.
      fleshChambers: [6, 9], fleshChamberR: [170, 300],
      fleshTubeW: [52, 84], fleshLoops: [3, 5],
    },
    theme: {
      ambientDark: 0.32,
      nightDark: 0.58,
      floor: '#1c060e', grid: '#2e0c18', border: '#8a3644',
      obstacle: '#5e1e2e', obstacleEdge: '#96404e', accent: '#f06a7a', wall: '#5e1e2e',
      // Pooled and re-pooled: a wetter, redder meat with droplet speckle.
      ground: {
        scale: 1.1, stretchX: 1.2, strength: 1.25, bias: 0.5, evenness: 0.55, speckles: 0.65,
        palette: ['#1a060c', '#2c0a14', '#44101e', '#5c1628', '#761c32'],
      },
      ambientFx: [{ kind: 'motes', intensity: 0.4, color: '#f06a7a' }],
      // The red haze: faintness climbs on the grant's own cadence inside it.
      fog: { banks: [1, 3], kinds: [{ id: 'blood_mist' }] },
    },
    sizeW: [2600, 3600], sizeH: [1900, 2600], ellipseChance: 0,
    layout: [
      { kind: 'blood_pool', count: [4, 7] }, { kind: 'gore', count: [3, 5] },
      { kind: 'clot_mound', count: [3, 5] }, { kind: 'artery_stalk', count: [2, 4] },
      { kind: 'flesh_pod', count: [2, 4] }, { kind: 'bone', count: [1, 3] },
      { kind: 'flesh_membrane', count: [1, 3] }, { kind: 'vein_cluster', count: [3, 5] },
    ],
    common: [
      { kind: 'blood_pool', count: [2, 3] },
      { kind: 'vein_cluster', count: [1, 2] },
    ],
    variants: [
      // Severed mains: the walls themselves are still paying out.
      { name: 'open veins', layout: [
        { kind: 'artery_stalk', count: [4, 6] }, { kind: 'blood_pool', count: [5, 8] },
        { kind: 'vein_cluster', count: [5, 7] }, { kind: 'clot_mound', count: [2, 3] },
        { kind: 'gore', count: [2, 4] },
      ] },
      // The spill gone old: crusted banks, standing red, slow flies.
      { name: 'clotted shallows', layout: [
        { kind: 'clot_mound', count: [5, 8] }, { kind: 'blood_pool', count: [6, 9] },
        { kind: 'gore', count: [4, 6] }, { kind: 'bone', count: [2, 4] },
      ], theme: { ground: {
        scale: 1.0, stretchX: 1.1, strength: 1.15, bias: 0.44, evenness: 0.6, speckles: 0.5,
        palette: ['#160509', '#260a10', '#380e18', '#4a1420', '#5a1a28'],
      } } },
      // Still enough to see yourself in — light dances off the standing red.
      { name: 'red mirror', layout: [
        { kind: 'blood_pool', count: [8, 12], radius: [38, 66] },
        { kind: 'artery_stalk', count: [1, 3] }, { kind: 'clot_mound', count: [2, 4] },
      ], theme: { ambientFx: [
        { kind: 'motes', intensity: 0.4, color: '#f06a7a' },
        { kind: 'caustics', intensity: 0.5, color: '#c2404e' },
      ] } },
    ],
    packs: {
      count: [6, 9], size: [3, 5],
      // The spill reads as SWARM country: mites and leeches in numbers, the
      // heavy things arriving alone.
      archetypes: [
        { weight: 3, size: [6, 9] }, { weight: 5, size: [3, 5] }, { weight: 3, size: [1, 2] },
      ],
      table: [
        { id: 'blood_mite', weight: 4, presence: { to: 16, fadeOut: 8 } },
        { id: 'hemophage', weight: 3, presence: { from: 4, fadeIn: 2 } },
        { id: 'clot_shambler', weight: 2, presence: { from: 7, fadeIn: 3 } },
        { id: 'lesser_ooze', weight: 2, presence: { to: 10, fadeOut: 5 } },
        { id: 'viscous_ooze', weight: 2 },
        { id: 'gutspray_hurler', weight: 1, presence: { from: 6, fadeIn: 3 } },
        { id: 'membrane', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'weeping_orb', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'flesh_amalgam', weight: 1, presence: { from: 13, fadeIn: 5, mul: 2 } },
        { id: 'corpse_bloom', weight: 1 },
        // Blood draws demons — the Glut disagrees. Their brawl is the decor.
        { id: 'bloodgorger', weight: 1, presence: { from: 12, fadeIn: 5 } },
      ],
    },
    spawnerId: 'corpse_bloom',
    objectives: [
      { kind: 'clear', weight: 3 },
      { kind: 'spawners', weight: 2 },
      { kind: 'bounty', weight: 2 },
      { kind: 'offering', weight: 2 },
      { kind: 'beacon', weight: 1 },
      { kind: 'escape', weight: 1 },
    ],
  },

  // GUTWORKS — the tract: ONE serpentine gut runs entry → exit (the fleshTract
  // dial), bulb chambers strung on a swallowing corridor, SPHINCTER doors that
  // dilate when you dwell at them — the flesh admits you chamber by chamber.
  // Bile pools digest (the lava doctrine in acid), polyps belch sour, miasma
  // turns the stomach (queasy → retching). Deep-mid country: the way DOWN.
  gutworks: {
    id: 'gutworks', biome: 'flesh',
    depthAffinity: { from: 0.4, fadeIn: 0.3 },
    // The Gutworks' lost place: the weir where the flow banks up.
    compositions: [{ composition: 'chyme_weir', chance: 0.22 }],
    nameFirst: ['Churning', 'Peristaltic', 'Bile-Wet', 'Swallowing', 'Puckered', 'Knotted', 'Coiled', 'Digesting', 'Gurgling', 'Half-Digested', 'Airless', 'Sour', 'Rumbling', 'Clenched', 'Acid-Bright', 'Colicky'],
    nameSecond: ['Tract', 'Coil', 'Passage', 'Winding', 'Churn', 'Gorge', 'Bowels', 'Loop', 'Descent', 'Throat', 'Swallow', 'Gutworks', 'Strait', 'Gullet'],
    layoutParams: {
      fleshTract: { segments: [4, 6], bulbR: [110, 170], tubeW: [44, 62], doorChance: 0.85, doorDwell: 0.45 },
    },
    theme: {
      ambientDark: 0.4,
      nightDark: 0.65,
      floor: '#120d06', grid: '#241a0c', border: '#8a7a34',
      obstacle: '#4e3e1a', obstacleEdge: '#7a6a2e', accent: '#c2cc74', wall: '#4e3e1a',
      mud: '#3a2e10',
      // Bile over meat, grained ALONG the tract (stretchX rides the snake).
      ground: {
        scale: 1.3, stretchX: 2.0, strength: 1.2, bias: 0.44, evenness: 0.62, speckles: 0.4,
        palette: ['#120c06', '#201408', '#2e1e0c', '#3e2c12', '#4e3a18'],
      },
      ambientFx: [
        { kind: 'bubbles', intensity: 0.5, color: '#c2cc74' },
        { kind: 'spores', intensity: 0.35, color: '#a8b86a' },
      ],
      // The sour breath hanging in the tract's low places.
      fog: { banks: [1, 2], kinds: [{ id: 'gut_miasma' }] },
    },
    sizeW: [3200, 4400], sizeH: [1700, 2300], ellipseChance: 0,
    layout: [
      { kind: 'chyme_pool', count: [3, 6] }, { kind: 'villus_bed', count: [3, 6] },
      { kind: 'gas_polyp', count: [3, 5] }, { kind: 'gut_knuckle', count: [2, 4] },
      { kind: 'tooth_row', count: [1, 3] }, { kind: 'rib_arch', count: [1, 2] },
      { kind: 'flesh_pod', count: [1, 3] }, { kind: 'gore', count: [1, 3] },
    ],
    common: [
      { kind: 'villus_bed', count: [1, 2] },
      { kind: 'chyme_pool', count: [1, 2] },
    ],
    variants: [
      // The tract in flood: standing acid, everything half-broken-down.
      { name: 'acid shallows', layout: [
        { kind: 'chyme_pool', count: [6, 9] }, { kind: 'villus_bed', count: [2, 4] },
        { kind: 'gas_polyp', count: [2, 4] }, { kind: 'bone', count: [2, 4] },
      ], theme: { ambientFx: [
        { kind: 'bubbles', intensity: 0.8, color: '#c2cc74' },
      ] } },
      // Clenched: the walls fold in until the way is knuckle after knuckle.
      { name: 'knotted strait', layout: [
        { kind: 'gut_knuckle', count: [4, 7] }, { kind: 'chyme_pool', count: [2, 4] },
        { kind: 'villus_bed', count: [3, 5] }, { kind: 'tooth_row', count: [1, 2] },
      ] },
      // Something laid its clutch here: polyps in rows, air you can chew.
      { name: 'wormworks', layout: [
        { kind: 'gas_polyp', count: [5, 8] }, { kind: 'villus_bed', count: [5, 8] },
        { kind: 'chyme_pool', count: [2, 4] }, { kind: 'gore', count: [2, 4] },
      ], theme: { ambientFx: [
        { kind: 'bubbles', intensity: 0.4, color: '#c2cc74' },
        { kind: 'spores', intensity: 0.7, color: '#a8b86a' },
      ] } },
    ],
    packs: {
      // A tract is LINEAR: fewer, denser stands — every bulb a decision.
      count: [5, 8], size: [3, 5],
      archetypes: [
        { weight: 4, size: [4, 6] }, { weight: 4, size: [2, 3] }, { weight: 2, size: [7, 10] },
      ],
      table: [
        { id: 'bile_retcher', weight: 3, presence: { from: 5, fadeIn: 2 } },
        { id: 'tract_worm', weight: 2, presence: { from: 7, fadeIn: 3 } },
        { id: 'gutspray_hurler', weight: 3 },
        { id: 'membrane', weight: 2, presence: { from: 6, fadeIn: 3 } },
        { id: 'lesser_ooze', weight: 2, presence: { to: 12, fadeOut: 6 } },
        { id: 'viscous_ooze', weight: 2 },
        { id: 'zombie', weight: 1, presence: { to: 12, fadeOut: 6 } },
        { id: 'pyloric_warden', weight: 1, presence: { from: 11, fadeIn: 4, mul: 2 } },
        { id: 'flesh_amalgam', weight: 1, presence: { from: 14, fadeIn: 6, mul: 2 } },
        { id: 'corpse_bloom', weight: 1 },
      ],
    },
    spawnerId: 'corpse_bloom',
    objectives: [
      { kind: 'escape', weight: 3 },
      { kind: 'clear', weight: 2 },
      { kind: 'spawners', weight: 2 },
      { kind: 'bounty', weight: 1 },
      { kind: 'circuit', weight: 1 },
      { kind: 'beacon', weight: 1 },
    ],
  },

  // OCULAR — the watching place: a socketed amphitheater (the fleshRing dial —
  // hub, socket ring, rims studded with eye-knots), stalks that sway as you
  // brush past and flinch shut when pressed, walls whose pupils drearily
  // follow, and THE GAZE lane: linger in an open eye's regard and 'beheld'
  // climbs; tip the ladder and the country tells its own where you are.
  // Counterplay is spatial — press close to shut them, burst the knots, or
  // keep moving. The deep heart: it knew you were coming.
  ocular: {
    id: 'ocular', biome: 'flesh',
    depthAffinity: { from: 0.6, fadeIn: 0.25 },
    nameFirst: ['Lidless', 'Unblinking', 'Staring', 'Watching', 'Weeping', 'Bloodshot', 'Vitreous', 'Wide-Awake', 'Sleepless', 'Glassy', 'Thousand-Eyed', 'Dilated', 'Rheumy', 'Tear-Bright', 'Transfixed', 'Scrying'],
    nameSecond: ['Vigil', 'Gaze', 'Orbit', 'Socket', 'Iris', 'Regard', 'Witness', 'Stare', 'Audience', 'Beholding', 'Scrutiny', 'Panopticon', 'Watch', 'Observatory'],
    layoutParams: {
      fleshRing: {
        satellites: [5, 7], hubR: [220, 280], satR: [110, 160], knots: [2, 4],
        // The watching shell: ocular_wall blotches laid into the chamber
        // rims before the carve — eyes growing within the very walls.
        eyeWalls: { blotches: [2, 4], chance: 0.85 },
      },
    },
    theme: {
      ambientDark: 0.38,
      nightDark: 0.62,
      floor: '#141016', grid: '#241c26', border: '#8a7a4a',
      obstacle: '#4a3a44', obstacleEdge: '#7a6a62', accent: '#d8b04a', wall: '#4a3a44',
      // Vitreous underfoot: pale humors, heavy floater speckle, no grain
      // direction — the place is radial, so the floor refuses a current.
      ground: {
        scale: 1.0, stretchX: 1.0, strength: 1.1, bias: 0.48, evenness: 0.66, speckles: 0.7,
        palette: ['#0e0a10', '#1a1218', '#281c22', '#38282c', '#463438'],
      },
      ambientFx: [{ kind: 'motes', intensity: 0.7, color: '#d8b04a' }],
      // THE GAZE: stalks and knots are the zone's own eyes (World.updateGaze) —
      // and the watching shell counts too (wall eyes never flinch shut).
      gaze: { kinds: ['eye_stalk', 'ocular_knot'], wallKinds: ['ocular_wall'], reach: 180, closeReach: 64, lureRadius: 640 },
    },
    sizeW: [2400, 3200], sizeH: [1800, 2400], ellipseChance: 0,
    layout: [
      { kind: 'eye_stalk', count: [5, 8] }, { kind: 'lash_bed', count: [3, 5] },
      { kind: 'weep_spring', count: [2, 4] }, { kind: 'ocular_knot', count: [2, 4] },
      { kind: 'flesh_pod', count: [1, 3] }, { kind: 'vein_cluster', count: [2, 4] },
      { kind: 'flesh_membrane', count: [1, 2] }, { kind: 'gore', count: [0, 2] },
    ],
    common: [
      { kind: 'eye_stalk', count: [2, 3] },
      { kind: 'lash_bed', count: [1, 2] },
    ],
    variants: [
      // The galleries run wet: tears standing in every socket.
      { name: 'weeping gallery', layout: [
        { kind: 'weep_spring', count: [4, 6] }, { kind: 'lash_bed', count: [4, 6] },
        { kind: 'eye_stalk', count: [3, 5] }, { kind: 'vein_cluster', count: [2, 3] },
      ], theme: { ambientFx: [
        { kind: 'motes', intensity: 0.5, color: '#d8b04a' },
        { kind: 'caustics', intensity: 0.45, color: '#7ab0c0' },
      ] } },
      // No two the same size, and none of them asleep.
      { name: 'a thousand eyes', layout: [
        { kind: 'eye_stalk', count: [8, 12] }, { kind: 'ocular_knot', count: [4, 6] },
        { kind: 'lash_bed', count: [2, 4] },
      ] },
      // A few GREAT eyes instead of many — the long stare.
      { name: 'the long stare', layout: [
        { kind: 'eye_stalk', count: [3, 5], radius: [16, 24] },
        { kind: 'ocular_knot', count: [2, 3] }, { kind: 'weep_spring', count: [2, 3] },
        { kind: 'lash_bed', count: [2, 4] },
      ] },
    ],
    packs: {
      count: [5, 8], size: [3, 5],
      // Lone watchers hanging in the sockets; the retinue arrives together.
      archetypes: [
        { weight: 3, size: [1, 2] }, { weight: 5, size: [3, 5] }, { weight: 2, size: [6, 8] },
      ],
      table: [
        { id: 'lidless_watcher', weight: 3, presence: { from: 6, fadeIn: 3 } },
        { id: 'weeping_orb', weight: 2, presence: { from: 5, fadeIn: 2 } },
        { id: 'stalk_shepherd', weight: 2, presence: { from: 8, fadeIn: 4 } },
        { id: 'spire_of_eyes', weight: 2, presence: { from: 8, fadeIn: 4 } },
        { id: 'blood_mite', weight: 2, presence: { to: 12, fadeOut: 6 } },
        { id: 'hemophage', weight: 1, presence: { from: 6, fadeIn: 3 } },
        { id: 'lesser_ooze', weight: 1, presence: { to: 10, fadeOut: 5 } },
        { id: 'membrane', weight: 1, presence: { from: 9, fadeIn: 4 } },
        { id: 'flesh_amalgam', weight: 1, presence: { from: 15, fadeIn: 6, mul: 2 } },
        { id: 'corpse_bloom', weight: 1 },
      ],
    },
    spawnerId: 'corpse_bloom',
    objectives: [
      { kind: 'beacon', weight: 2 },
      { kind: 'bounty', weight: 2 },
      { kind: 'clear', weight: 2 },
      { kind: 'offering', weight: 1 },
      { kind: 'spawners', weight: 1 },
    ],
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
        // Living lattice: weaving creepers and shardlings that SHATTER.
        { id: 'prism_creeper', weight: 2 },
        { id: 'resonant_shardling', weight: 3, presence: { to: 20, fadeOut: 10 } },
      ],
    },
    spawnerId: 'rime_stone',
    objectives: [{ kind: 'clear', weight: 3 }, { kind: 'spawners', weight: 2 }, { kind: 'beacon', weight: 1 }, { kind: 'bounty', weight: 1 }],
  },

  // VOLCANIC — an erupting caldera (biome:'volcanic'). Lava vents periodically
  // launch arcing lava orbs (the lava_orb effect) that splatter as fire AoE.
  // The country's HEART face (cinderlands keeps the cooled rim — see its
  // depthAffinity note): the deeper into the region, the more the ground is
  // still deciding to be liquid.
  volcanic: {
    id: 'volcanic', biome: 'volcanic',
    depthAffinity: { from: 0.35, fadeIn: 0.3 },
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
        // THE EMBERKIN — the country's native banner (patron faction): the
        // tribe thickens with level as the unaligned fauna thins.
        { id: 'ashling', weight: 3 },
        { id: 'cinder_hound', weight: 2 },
        { id: 'slag_brute', weight: 2, presence: { from: 6, fadeIn: 3 } },
        { id: 'vent_priest', weight: 1, presence: { from: 8, fadeIn: 4 } },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [{ kind: 'clear', weight: 3 }, { kind: 'escape', weight: 2 }, { kind: 'beacon', weight: 1 }, { kind: 'bounty', weight: 1 }, { kind: 'offering', weight: 1 }],
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
    objectives: [{ kind: 'clear', weight: 3 }, { kind: 'spawners', weight: 2 }, { kind: 'beacon', weight: 1 }, { kind: 'bounty', weight: 1 }, { kind: 'offering', weight: 1 }],
  },

  // FIELD — the open grassland EXPANSE (biome:'field'). The bespoke 'field' layout
  // generator (levelgen) shapes the zone to the contiguous Field heat-map blob and
  // floods it with grass/rock-cluster/mud/brush — NO trees, water, or void. sizeW/H
  // here are only a fallback; World.fieldifyZone overrides the footprint to the region
  // bbox. A wide-open, exploration-leaning hub (objectives favour clear/escape).
  grassland: {
    id: 'grassland', biome: 'field',
    compositions: [{ composition: 'stone_sanctum', chance: 0.35 }, { composition: 'orchard_rows', chance: 0.25 }, { composition: 'powder_cache', chance: 0.15 }, { composition: 'war_camp', chance: 0.14 }, { composition: 'fallen_colossus', chance: 0.1 }, { composition: 'beastwardens_steading', chance: 0.16 }],
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
      // The drovers' weather: pooled morning vapor in the same low folds,
      // and a haven-stone to camp against (the Weatherworks kit).
      { kind: 'mist_pool', count: [1, 2], where: { field: 'elevation', max: 0.4, params: { scale: 700 } } },
      { kind: 'haven_stone', count: [0, 1] },
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
        // The Chattel — the field country's own trouble: herds that gore
        // back, hens with opinions, and somewhere a bell.
        { id: 'feral_aurochs', weight: 2 },
        { id: 'feral_hen', weight: 2, presence: { to: 16, fadeOut: 8 } },
        { id: 'shepherds_hound', weight: 2 },
        { id: 'the_bellwether', weight: 1, presence: { from: 8, fadeIn: 4 } },
        // The field country's wolf den — matron and whelps (her swig waters
        // the pack through the sympathy fabric).
        { id: 'den_matron', weight: 1, presence: { from: 4, fadeIn: 3 } },
        { id: 'den_whelp', weight: 2, presence: { to: 12, fadeOut: 6 } },
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
    objectives: [{ kind: 'clear', weight: 3 }, { kind: 'escape', weight: 2 }, { kind: 'spawners', weight: 1 }, { kind: 'beacon', weight: 1 }, { kind: 'circuit', weight: 1 }, { kind: 'procession', weight: 1 }, { kind: 'bounty', weight: 1 }],
    structures: [
      { structure: 'market_row', chance: 0.14 },
    ],
  },

  // =========================================================================
  // THE AETHER — the cloud shelves of the Aetherial (the Ascent's realm).
  // A torn lattice of sunlit cloud isles over open sky: every gap is a
  // WINDOW down onto the world below (the understory — the very zone your
  // geyser erupted from, or the endless cloud sea), and the ground itself
  // DOES NOT LAST: theme.collapse melts it rim-inward while your own
  // footfalls crumble the causeway behind you. Cross to the Ascendant Gate
  // before the sky reclaims the shelf; fall, and the world below catches
  // you where you dropped. The Vigilant Host needs no ground — you do.
  // =========================================================================
  aether: {
    id: 'aether',
    // REALM tileset (the Ascent's dimension — reached by launch gates and
    // geysers, never by surface frontier rolls): frontier:false keeps it out
    // of the field pools AND the perf gate's default matrix. A blind probe
    // walk has no steady state here anyway — the shelf MELTS under the
    // walker, who falls through to a random surface zone mid-sample (the
    // old sweeps' phantom "aether" rows measured whatever zone caught them).
    frontier: false,
    biome: 'aether',
    nameFirst: ['Aether', 'Empyrean', 'Dawnfield', 'Cloudreach', 'Heavenspan', 'Skyshoal', 'Zenith'],
    // 'Crossing' is RESERVED for launch shelves (defs/ascent.ts renames its
    // pockets "<X> Crossing") — web zones must never collide with a shelf's
    // name shape or the map reads as a loop that isn't there.
    nameSecond: ['Shelf', 'Steps', 'Drift', 'Reaches', 'Causeway', 'Shoal', 'Expanse'],
    theme: {
      floor: '#dfe6f4', grid: '#c2cde4', border: '#8fa3cc',
      obstacle: '#e7ecf7', obstacleEdge: '#a9b6d4', accent: '#ffe9a8',
      wall: '#c8d2e8', water: '#9fd8e8',
      dayLight: 1.25, nightDark: 0.5, heat: 0.35,
      // The floor is CLOUD: broad soft features, a bright bias, barely any
      // speckle — form comes from the palette swing, not grit.
      ground: {
        palette: ['#c3cee6', '#d2dbee', '#e1e8f6', '#eef2fa', '#f9fbff'],
        bias: 0.6, alpha: 0.55, scale: 1.7, strength: 0.9, speckles: 0.3, evenness: 0.3,
      },
      ambientFx: [
        { kind: 'motes', color: '#ffffff', intensity: 0.7 },
        { kind: 'aurora', color: '#9fd8ff', intensity: 0.3 },
      ],
      fog: { banks: [2, 4], kinds: [{ id: 'aether_veil' }] },
      // No zone hangs below a frontier shelf (only launch shelves set
      // ZoneDef.below) — the gaps look down on the endless cloud sea.
      understory: 'cloudsea',
      // THE SIGNATURE: the shelf dissolves. Rim flakes inward from ~10s,
      // footfalls crumble the floor ~3.3s behind you, the causeway erodes
      // entry-first once its holdout lapses — and the Gate's platform never
      // melts. Falls drop THROUGH to the zone below (launch shelves) or
      // scramble you to the rim (frontier shelves, no zone beneath).
      collapse: {
        region: 'cloud_void',
        crumble: 1.1,
        contact: { delay: 2.2, radius: 12 },
        ambient: { start: 10, band: 0.9, jitter: 6, holdout: 26, sweep: 55, halo: 2 },
        fall: { kind: 'below', damageFrac: 0.05, grace: 0.4 },
        goal: { doodad: 'ascendant_gate' },
      },
    },
    sizeW: [2200, 3100], sizeH: [1600, 2300], ellipseChance: 0,
    forceLayout: 'aether_lattice',
    layout: [
      { kind: 'cloud_billow', count: [10, 16] },
      { kind: 'aether_crystal', count: [4, 8] },
      { kind: 'harp_pillar', count: [3, 6] },
      { kind: 'prayer_bell', count: [1, 3] },
      { kind: 'seraph_statue', count: [1, 3] },
      { kind: 'flowers', count: [1, 3] },
      // The wild dressing: fleece pasture, singing brittle tines, and the
      // breathing rifts whose plumes quicken a crossing (speed pads).
      { kind: 'cloudwool_tuft', count: [3, 7] },
      { kind: 'skyglass_spur', count: [2, 5] },
      { kind: 'updraft_vent', count: [1, 2] },
    ],
    common: [
      { kind: 'clearing', count: [1, 2], radius: [90, 140] },
    ],
    variants: [
      // DAWNSHELF: the golden hour — warmer light, kinder dissolution.
      {
        name: 'dawnshelf',
        layout: [
          { kind: 'cloud_billow', count: [10, 15] },
          { kind: 'aether_crystal', count: [6, 10] },
          { kind: 'harp_pillar', count: [4, 7] },
          { kind: 'seraph_statue', count: [2, 4] },
          { kind: 'flowers', count: [2, 4] },
          // Golden-hour pasture: the fleece lies thickest at dawn.
          { kind: 'cloudwool_tuft', count: [5, 9] },
          { kind: 'skyglass_spur', count: [1, 3] },
          { kind: 'updraft_vent', count: [0, 2] },
        ],
        theme: {
          accent: '#ffd88a', dayLight: 1.35,
          ground: {
            palette: ['#cfc9dc', '#e0d8e4', '#eee6ee', '#f8f0ea', '#fff8ea'],
            bias: 0.64, alpha: 0.55, scale: 1.7, strength: 0.9, speckles: 0.3, evenness: 0.3,
          },
          collapse: {
            region: 'cloud_void',
            crumble: 1.3,
            contact: { delay: 2.8, radius: 12 },
            ambient: { start: 14, band: 1.05, jitter: 7, holdout: 32, sweep: 62, halo: 2 },
            fall: { kind: 'below', damageFrac: 0.04, grace: 0.45 },
            goal: { doodad: 'ascendant_gate' },
          },
        },
      },
      // DUSKSHOAL: the violet hour — deeper sky, a hastier dissolution.
      {
        name: 'duskshoal',
        layout: [
          { kind: 'cloud_billow', count: [9, 14] },
          { kind: 'aether_crystal', count: [5, 9] },
          { kind: 'prayer_bell', count: [2, 4] },
          { kind: 'seraph_statue', count: [1, 2] },
          // Violet hour: the tines sing loudest at dusk; sparse pasture.
          { kind: 'skyglass_spur', count: [3, 6] },
          { kind: 'cloudwool_tuft', count: [2, 4] },
          { kind: 'updraft_vent', count: [0, 1] },
        ],
        theme: {
          floor: '#c9cfe6', accent: '#c8b8ff', nightDark: 0.62, dayLight: 1.05,
          ground: {
            palette: ['#9aa2c6', '#adb4d4', '#c2c8e2', '#d6daee', '#ebeefa'],
            bias: 0.55, alpha: 0.55, scale: 1.7, strength: 0.95, speckles: 0.3, evenness: 0.3,
          },
          ambientFx: [
            { kind: 'motes', color: '#c8b8ff', intensity: 0.7 },
            { kind: 'aurora', color: '#b09fee', intensity: 0.5 },
          ],
          collapse: {
            region: 'cloud_void',
            crumble: 0.95,
            contact: { delay: 1.9, radius: 12 },
            ambient: { start: 8, band: 0.75, jitter: 5, holdout: 22, sweep: 48, halo: 2 },
            fall: { kind: 'below', damageFrac: 0.06, grace: 0.35 },
            goal: { doodad: 'ascendant_gate' },
          },
        },
      },
      // STORMSHOAL: the grey hour — the deck churns; footfalls barely hold.
      {
        name: 'stormshoal',
        layout: [
          { kind: 'cloud_billow', count: [12, 18] },
          { kind: 'aether_crystal', count: [3, 6] },
          { kind: 'harp_pillar', count: [2, 4] },
          // Storm country: the rifts breathe hardest here — speed-pad runs.
          { kind: 'updraft_vent', count: [1, 3] },
          { kind: 'skyglass_spur', count: [1, 3] },
        ],
        theme: {
          floor: '#cdd3e0', accent: '#9fd8e8', dayLight: 0.95,
          ground: {
            palette: ['#9ba4b8', '#adb5c8', '#c0c7d6', '#d3d9e4', '#e8ecf3'],
            bias: 0.52, alpha: 0.6, scale: 1.5, strength: 1.05, speckles: 0.4, evenness: 0.25,
          },
          ambientFx: [{ kind: 'motes', color: '#d8e4f0', intensity: 1 }],
          fog: { banks: [3, 5], kinds: [{ id: 'aether_veil', weight: 2 }, { id: 'mist' }] },
          collapse: {
            region: 'cloud_void',
            crumble: 0.9,
            contact: { delay: 1.6, radius: 14 },
            ambient: { start: 9, band: 0.85, jitter: 8, holdout: 24, sweep: 50, halo: 2 },
            fall: { kind: 'below', damageFrac: 0.06, grace: 0.35 },
            goal: { doodad: 'ascendant_gate' },
          },
        },
      },
    ],
    packs: {
      count: [4, 6], size: [2, 4],
      archetypes: [
        { weight: 3, size: [4, 7] },  // a choir — wisps in numbers
        { weight: 5, size: [2, 4] },  // a ward — the standard patrol
        { weight: 3, size: [1, 2] },  // a vigil — one warden, watching
      ],
      table: [
        { id: 'cherub_wisp', weight: 4 },
        { id: 'watcher_unblinking', weight: 3 },
        { id: 'virtue_lance', weight: 3 },
        { id: 'power_of_the_bastion', weight: 2.5, presence: { from: 11, fadeIn: 4 } },
        { id: 'ophan_wheel', weight: 2 },
        { id: 'herald_of_the_choir', weight: 2, presence: { from: 12, fadeIn: 4 } },
        { id: 'lampad_of_the_vigil', weight: 2, presence: { from: 11, fadeIn: 4 } },
        { id: 'dominion_scales', weight: 1.5, presence: { from: 13, fadeIn: 5 } },
        { id: 'throne_of_the_law', weight: 1, presence: { from: 13, fadeIn: 5 } },
        { id: 'principality_of_dawn', weight: 0.5, presence: { from: 15, fadeIn: 6 } },
        // The wild layer: the shelf country's own beasts threaded among the
        // wardens (RELATIONS makes zephyrid × galekin ground fight itself).
        { id: 'cloud_grazer', weight: 2, presence: { to: 16, fadeOut: 7 } },
        { id: 'mistwing_shrike', weight: 1.5, presence: { to: 19, fadeOut: 8 } },
        { id: 'skyglass_lurker', weight: 1.2, presence: { from: 8, fadeIn: 4 } },
        { id: 'zephyrid_matron', weight: 0.5, presence: { from: 12, fadeIn: 5 } },
      ],
    },
    spawnerId: 'bone_altar', // never rolled (no 'spawners' objective up here)
    // ESCAPE weighs heaviest by design: the dissolving shelf IS an escape.
    objectives: [{ kind: 'escape', weight: 3 }, { kind: 'clear', weight: 2 }],
    compositions: [
      { composition: 'choir_ring', chance: 0.4 },
      { composition: 'harp_gallery', chance: 0.35 },
    ],
  },

  // THE HIGH SPIRES — the Aetherial's built country (the D3 High Heavens
  // read): great cloudscape bases crowned with AUREATE COURTS — marble
  // floors, the tiered Spire of Dawn, statue rings, braziers — joined by
  // narrow EPHEMERAL SPANS. Two clouds, one honest read: the stable deck
  // wears the plain floor; the FRAIL cloud (base rims, rolled bridges)
  // shimmers dusk-grey — and it alone melts (CollapseSpec.melts), contact-
  // only: no ambient wavefront gnaws the courts, but a fight held on a
  // frail span drops the span. What the Host built does not fall.
  aether_spires: {
    id: 'aether_spires',
    frontier: false, // realm tileset (see aether) — launch-gated, melts underfoot
    biome: 'aether_spires',
    nameFirst: ['Aurelian', 'Empyrean', 'Zenith', 'Highspire', 'Dawnhold', 'Vesperal'],
    nameSecond: ['Courts', 'Spans', 'Gallery', 'Approach', 'Terraces', 'Processional'],
    theme: {
      floor: '#e6e9f4', grid: '#cbd3e8', border: '#9aabce',
      obstacle: '#eef1f9', obstacleEdge: '#b0bcd6', accent: '#ffdf9a',
      wall: '#d2d9ec', water: '#9fd8e8',
      dayLight: 1.3, nightDark: 0.48, heat: 0.4,
      ground: {
        palette: ['#c9d2e8', '#d7def0', '#e4e9f6', '#f0f3fb', '#fbfcff'],
        bias: 0.62, alpha: 0.52, scale: 1.8, strength: 0.85, speckles: 0.3, evenness: 0.32,
      },
      ambientFx: [
        { kind: 'motes', color: '#fff2d8', intensity: 0.7 },
        { kind: 'aurora', color: '#ffdf9a', intensity: 0.3 },
      ],
      fog: { banks: [1, 3], kinds: [{ id: 'aether_veil' }] },
      // The Nether tie usually resolves the true surface below; the deck is
      // the fallback past the charted world's edge.
      understory: 'cloudsea',
      // CONTACT-ONLY, FRAIL-ONLY: the fabric's melts list is the whole
      // doctrine — courts, decks and portals are not in it.
      collapse: {
        region: 'cloud_void',
        melts: ['cloud_frail'],
        crumble: 1.2,
        contact: { delay: 2.0, radius: 12 },
        fall: { kind: 'below', damageFrac: 0.05, grace: 0.4 },
      },
    },
    sizeW: [2400, 3200], sizeH: [1700, 2400], ellipseChance: 0,
    forceLayout: 'aether_spires',
    layout: [
      { kind: 'cloud_billow', count: [6, 10] },
      { kind: 'seraph_statue', count: [2, 4] },
      { kind: 'harp_pillar', count: [4, 8] },
      { kind: 'prayer_bell', count: [2, 4] },
      { kind: 'aether_crystal', count: [3, 6] },
      { kind: 'flowers', count: [1, 3] },
      // Court dressing: vapor fonts on the terraces, singing tines between
      // the spans, a breathing rift where the processions quicken.
      { kind: 'mist_font', count: [1, 3] },
      { kind: 'skyglass_spur', count: [1, 4] },
      { kind: 'updraft_vent', count: [0, 2] },
    ],
    common: [
      { kind: 'clearing', count: [1, 2], radius: [90, 130] },
    ],
    variants: [
      // VESPERAL GALLERY: the violet hour over the courts — frailer spans.
      {
        name: 'vesperal gallery',
        layout: [
          { kind: 'cloud_billow', count: [5, 9] },
          { kind: 'seraph_statue', count: [3, 5] },
          { kind: 'harp_pillar', count: [5, 9] },
          { kind: 'aether_crystal', count: [4, 7] },
          // Evening dressing: fonts steam violet, tines chorus the galleries.
          { kind: 'mist_font', count: [1, 3] },
          { kind: 'skyglass_spur', count: [2, 4] },
        ],
        theme: {
          floor: '#d4d6ea', accent: '#c8b8ff', dayLight: 1.05, nightDark: 0.6,
          ground: {
            palette: ['#a8aecd', '#bac0da', '#ccd1e6', '#dee1f0', '#f0f2fa'],
            bias: 0.56, alpha: 0.52, scale: 1.8, strength: 0.9, speckles: 0.3, evenness: 0.32,
          },
          ambientFx: [
            { kind: 'motes', color: '#d8ccff', intensity: 0.7 },
            { kind: 'aurora', color: '#b09fee', intensity: 0.45 },
          ],
          understory: 'cloudsea',
          collapse: {
            region: 'cloud_void',
            melts: ['cloud_frail'],
            crumble: 1.0,
            contact: { delay: 1.6, radius: 13 },
            fall: { kind: 'below', damageFrac: 0.06, grace: 0.35 },
          },
        },
      },
    ],
    // Where the shelves are crossed, the courts are HELD: the Host's line
    // troops guard the architecture (walkers can hold ground that holds).
    packs: {
      count: [4, 6], size: [2, 4],
      archetypes: [
        { weight: 3, size: [4, 7] },
        { weight: 5, size: [2, 4] },
        { weight: 3, size: [1, 2] },
      ],
      table: [
        { id: 'cherub_wisp', weight: 3 },
        { id: 'power_of_the_bastion', weight: 3, presence: { from: 11, fadeIn: 4 } },
        { id: 'virtue_lance', weight: 2.5 },
        { id: 'lampad_of_the_vigil', weight: 2.5, presence: { from: 11, fadeIn: 4 } },
        { id: 'herald_of_the_choir', weight: 2, presence: { from: 12, fadeIn: 4 } },
        { id: 'dominion_scales', weight: 2, presence: { from: 13, fadeIn: 5 } },
        { id: 'ophan_wheel', weight: 1.5 },
        { id: 'throne_of_the_law', weight: 1.5, presence: { from: 13, fadeIn: 5 } },
        { id: 'watcher_unblinking', weight: 1.5 },
        { id: 'principality_of_dawn', weight: 0.6, presence: { from: 15, fadeIn: 6 } },
        // The wilds between the courts: bulls hold the spans, lurkers keep
        // the frail rims, shrikes stoop from the glare.
        { id: 'stormbrow_bull', weight: 1.5, presence: { from: 10, fadeIn: 5 } },
        { id: 'mistwing_shrike', weight: 1.2, presence: { to: 19, fadeOut: 8 } },
        { id: 'skyglass_lurker', weight: 1, presence: { from: 8, fadeIn: 4 } },
      ],
    },
    spawnerId: 'bone_altar', // never rolled
    // The courts STAND — so the fights are stand-up fights: clear-weighted,
    // with escape as the rarer mood (a processional overrun).
    objectives: [{ kind: 'clear', weight: 3 }, { kind: 'escape', weight: 1 }],
    compositions: [
      { composition: 'choir_ring', chance: 0.45 },
      { composition: 'harp_gallery', chance: 0.4 },
    ],
  },

  // THE DRIFTWAYS — the Aetherial's wind country (the realm's third mood,
  // pooled in its wettest reaches): anchor isles strung across open sky,
  // crossed on the FLUX fabric's own ground. theme.flux is THE signature —
  // stepping-stone pads phase on ladder rhythms, carrier rafts shuttle the
  // long lanes bearing whoever stands on them, and (on the harder faces)
  // GUSTS warn and then shove. Read the rhythm or the sky lets you go: falls
  // drop through to the world below, the same proportional drop the shelves
  // taught. Croc and the plumber both walked so this biome could drift.
  aether_drift: {
    id: 'aether_drift',
    frontier: false, // realm tileset (see aether) — the torn lattice ejects a blind walker
    biome: 'aether_drift',
    nameFirst: ['Drift', 'Zephyr', 'Windward', 'Skysworn', 'Cirrus', 'Gale', 'Aeolian'],
    // 'Crossing' stays RESERVED for launch shelves (defs/ascent.ts).
    nameSecond: ['Ways', 'Steps', 'Passage', 'Shoals', 'Currents', 'Span'],
    theme: {
      floor: '#dce6f2', grid: '#bfcde2', border: '#87a0c8',
      obstacle: '#e4ebf6', obstacleEdge: '#a2b2d2', accent: '#9fe0e8',
      wall: '#c4d0e6', water: '#9fd8e8',
      dayLight: 1.2, nightDark: 0.52, heat: 0.3,
      ground: {
        palette: ['#bccbe2', '#ccd8ea', '#dce4f2', '#eaeff8', '#f7fafe'],
        bias: 0.58, alpha: 0.55, scale: 1.6, strength: 0.9, speckles: 0.3, evenness: 0.3,
      },
      ambientFx: [
        { kind: 'motes', color: '#e8f4ff', intensity: 0.9 },
        { kind: 'aurora', color: '#9fe0e8', intensity: 0.35 },
      ],
      fog: { banks: [1, 3], kinds: [{ id: 'aether_veil' }] },
      understory: 'cloudsea',
      // THE SIGNATURE: the drift. The base face is the temperate one —
      // roomy solid windows, patient rafts, no gusts. Variants swap the
      // whole spec (the collapse precedent: tempo is a face, not a dial).
      flux: {
        phase: { period: 11, solidFrac: 0.62, form: 2.2, fray: 2.6 },
        carrier: { radius: [46, 60], speed: [42, 58], dwell: 1.6, per: 430 },
        fall: { kind: 'below', damageFrac: 0.05, grace: 0.45 },
        warmup: 7,
        look: { body: '#e9eef9', crest: '#ffffff', fray: '#96a2c4' },
      },
    },
    sizeW: [2300, 3200], sizeH: [1700, 2400], ellipseChance: 0,
    forceLayout: 'aether_drift',
    layout: [
      { kind: 'cloud_billow', count: [7, 11] },
      { kind: 'zephyr_totem', count: [3, 6] },
      { kind: 'sky_lantern', count: [3, 6] },
      { kind: 'chime_stand', count: [3, 6] },
      { kind: 'gale_vane', count: [2, 4] },
      { kind: 'cloud_coral', count: [3, 6] },
      { kind: 'aether_crystal', count: [2, 5] },
      { kind: 'flowers', count: [1, 2] },
    ],
    common: [
      { kind: 'clearing', count: [1, 2], radius: [80, 120] },
    ],
    variants: [
      // MORNING DRIFT: the kind face — golden light, long stands, slow rafts.
      {
        name: 'morning drift',
        layout: [
          { kind: 'cloud_billow', count: [8, 12] },
          { kind: 'zephyr_totem', count: [3, 5] },
          { kind: 'sky_lantern', count: [4, 7] },
          { kind: 'chime_stand', count: [4, 7] },
          { kind: 'cloud_coral', count: [4, 7] },
          { kind: 'flowers', count: [2, 4] },
        ],
        theme: {
          accent: '#ffd88a', dayLight: 1.32,
          ground: {
            palette: ['#c6c8dc', '#d6d6e6', '#e6e2ee', '#f2ecf0', '#fcf6ec'],
            bias: 0.62, alpha: 0.55, scale: 1.6, strength: 0.88, speckles: 0.3, evenness: 0.3,
          },
          flux: {
            phase: { period: 12.5, solidFrac: 0.68, form: 2.4, fray: 3.0 },
            carrier: { radius: [50, 64], speed: [38, 50], dwell: 1.8, per: 460 },
            fall: { kind: 'below', damageFrac: 0.04, grace: 0.5 },
            warmup: 8,
            look: { body: '#f2ede9', crest: '#fff8ea', fray: '#a8a4bc' },
          },
        },
      },
      // RACING GALE: the wind has somewhere to be — quick cycles, fast
      // rafts, and the first face where the gusts start shoving.
      {
        name: 'racing gale',
        layout: [
          { kind: 'cloud_billow', count: [6, 10] },
          { kind: 'zephyr_totem', count: [4, 7] },
          { kind: 'gale_vane', count: [3, 6] },
          { kind: 'chime_stand', count: [3, 5] },
          { kind: 'aether_crystal', count: [3, 6] },
        ],
        theme: {
          accent: '#8fe0d8', dayLight: 1.1,
          ambientFx: [
            { kind: 'motes', color: '#e8f4ff', intensity: 1.3 },
            { kind: 'aurora', color: '#8fe0d8', intensity: 0.4 },
          ],
          flux: {
            phase: { period: 8.5, solidFrac: 0.55, form: 1.8, fray: 2.2 },
            carrier: { radius: [44, 56], speed: [62, 82], dwell: 1.0, per: 380 },
            gusts: { every: [22, 34], warn: 1.8, hold: 2.6, push: 115 },
            fall: { kind: 'below', damageFrac: 0.05, grace: 0.4 },
            warmup: 6,
            look: { body: '#e6eef8', crest: '#ffffff', fray: '#8e9cc0' },
          },
        },
      },
      // SHEARWIND CHURN: the violet storm-hour — brief stands, hard shoves,
      // the drift at its least sentimental. The realm's white-knuckle face.
      {
        name: 'shearwind churn',
        layout: [
          { kind: 'cloud_billow', count: [8, 13] },
          { kind: 'zephyr_totem', count: [4, 6] },
          { kind: 'gale_vane', count: [3, 5] },
          { kind: 'cloud_coral', count: [4, 8] },
          { kind: 'aether_crystal', count: [4, 7] },
        ],
        theme: {
          floor: '#c6cce0', accent: '#b8a8f0', dayLight: 0.95, nightDark: 0.62,
          ground: {
            palette: ['#96a0c0', '#a8b0cc', '#bcc2da', '#d0d5e6', '#e6e9f4'],
            bias: 0.52, alpha: 0.58, scale: 1.5, strength: 1.0, speckles: 0.4, evenness: 0.26,
          },
          ambientFx: [
            { kind: 'motes', color: '#d4dcf0', intensity: 1.2 },
            { kind: 'aurora', color: '#b09fee', intensity: 0.5 },
          ],
          fog: { banks: [2, 4], kinds: [{ id: 'aether_veil', weight: 2 }, { id: 'mist' }] },
          flux: {
            phase: { period: 7, solidFrac: 0.5, form: 1.5, fray: 1.8 },
            carrier: { radius: [42, 54], speed: [56, 74], dwell: 0.8, per: 360 },
            gusts: { every: [16, 26], warn: 1.5, hold: 3.2, push: 155 },
            fall: { kind: 'below', damageFrac: 0.06, grace: 0.35 },
            warmup: 6,
            look: { body: '#dde2f2', crest: '#f4f2ff', fray: '#7e88ae' },
          },
        },
      },
    ],
    // The wind favors WINGS: the GALEKIN — the drift's own weather-fauna —
    // float free of the rhythm the intruder must read (the shepherd is the
    // deliberate walker: the ground can claim it, x_ride_flux is how it
    // argues), with Host patrols passing through on their own errands.
    packs: {
      count: [4, 6], size: [2, 4],
      archetypes: [
        { weight: 3, size: [4, 7] },  // a shoal — fingerlings in numbers
        { weight: 5, size: [2, 4] },  // a current — the standard drift
        { weight: 3, size: [1, 2] },  // a weather-front — one big body
      ],
      table: [
        { id: 'cirrus_fingerling', weight: 4 },
        { id: 'drift_ray', weight: 3 },
        { id: 'zephyr_eel', weight: 2.5, presence: { from: 10, fadeIn: 4 } },
        { id: 'gale_djinn', weight: 2, presence: { from: 11, fadeIn: 4 } },
        { id: 'nimbus_shepherd', weight: 1.5, presence: { from: 12, fadeIn: 4 } },
        { id: 'cherub_wisp', weight: 1.5 },
        { id: 'watcher_unblinking', weight: 1 },
        { id: 'virtue_lance', weight: 1 },
        { id: 'thunderhead_tyrant', weight: 0.6, presence: { from: 14, fadeIn: 6 } },
      ],
    },
    spawnerId: 'bone_altar', // never rolled (no 'spawners' objective up here)
    objectives: [{ kind: 'clear', weight: 2 }, { kind: 'escape', weight: 2 }],
    compositions: [
      { composition: 'vane_court', chance: 0.4 },
      { composition: 'chime_gallery', chance: 0.35 },
      { composition: 'choir_ring', chance: 0.15 },
    ],
  },

  // THE FIRMAMENT — the Aetherial's sanctum face: the gate zone's tileset
  // (biome 'aether_sanctum' resolves here). The same lattice run dense and
  // UNBROKEN — wide causeways, no sky-holes, and NO CollapseSpec: this
  // ground holds. The waypoint home the shelves are crossed to reach.
  aether_sanctum: {
    id: 'aether_sanctum',
    frontier: false, // realm tileset (see aether) — reached by the Ascent, not frontiers
    biome: 'aether_sanctum',
    nameFirst: ['Firmament', 'Empyrean', 'Zenith', 'Aurelian'],
    nameSecond: ['Landing', 'Vault', 'Court', 'Rest'],
    theme: {
      floor: '#e4e9f6', grid: '#cbd4e8', border: '#98abd0',
      obstacle: '#ecf0f9', obstacleEdge: '#b2bed8', accent: '#ffe9a8',
      wall: '#d0d8ec', water: '#9fd8e8',
      dayLight: 1.3, nightDark: 0.45, heat: 0.4,
      ground: {
        palette: ['#ccd5ea', '#dae1f1', '#e7ecf7', '#f2f5fb', '#fcfdff'],
        bias: 0.64, alpha: 0.5, scale: 1.8, strength: 0.85, speckles: 0.35, evenness: 0.35,
      },
      ambientFx: [
        { kind: 'motes', color: '#ffffff', intensity: 0.6 },
        { kind: 'aurora', color: '#ffe9a8', intensity: 0.25 },
      ],
      fog: { banks: [1, 2], kinds: [{ id: 'aether_veil' }] },
      understory: 'cloudsea',
    },
    sizeW: [2000, 2600], sizeH: [1500, 1900], ellipseChance: 0,
    forceLayout: 'aether_lattice',
    layoutParams: { isles: [5, 7], isleRadius: [200, 300], causewayWidth: [70, 95], holes: [0, 0] },
    layout: [
      { kind: 'cloud_billow', count: [8, 12] },
      { kind: 'seraph_statue', count: [3, 5] },
      { kind: 'harp_pillar', count: [5, 9] },
      { kind: 'prayer_bell', count: [2, 4] },
      { kind: 'aether_crystal', count: [3, 5] },
      { kind: 'flowers', count: [2, 4] },
    ],
    common: [
      { kind: 'clearing', count: [1, 2], radius: [100, 150] },
    ],
    packs: {
      count: [2, 3], size: [2, 3],
      table: [
        { id: 'cherub_wisp', weight: 3 },
        { id: 'virtue_lance', weight: 2 },
        { id: 'lampad_of_the_vigil', weight: 1.5, presence: { from: 11, fadeIn: 4 } },
        { id: 'power_of_the_bastion', weight: 1.5, presence: { from: 11, fadeIn: 4 } },
        { id: 'dominion_scales', weight: 1, presence: { from: 13, fadeIn: 5 } },
      ],
    },
    spawnerId: 'bone_altar', // never rolled
    objectives: [{ kind: 'clear', weight: 1 }],
    compositions: [
      { composition: 'choir_ring', chance: 0.5 },
      { composition: 'vault_of_dawn', chance: 0.6 },
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
 *  Undefined when the biome has no frontier tileset (caller falls back).
 *
 *  When the caller knows the mint's biomeDepth AND any candidate declares a
 *  depthAffinity, faces weigh themselves by their envelope at that depth —
 *  the sub-biome staging pick (desert: waste rim → erg heart). Biomes whose
 *  faces declare no envelopes keep the plain uniform pick, byte-identical. */
export function pickTilesetForBiome(biome: string, rng: Rng, depth?: number): string | undefined {
  const c = TILESETS_BY_BIOME[biome];
  if (!c || !c.length) return undefined;
  if (depth === undefined || !c.some(id => TILESETS[id].depthAffinity)) return rng.pick(c);
  const weights = c.map(id => {
    const aff = TILESETS[id].depthAffinity;
    return aff ? presenceMul(aff, depth) : 1;
  });
  let total = 0;
  for (const w of weights) total += w;
  // Degenerate staging (every envelope zero here) never starves the biome.
  if (total <= 0) return rng.pick(c);
  let roll = rng.range(0, total);
  for (let i = 0; i < c.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return c[i];
  }
  return c[c.length - 1];
}

/** Boot check: which BIOME_FIELD biomes have NO frontier tileset (would fall back
 *  to the inherited line — the coverage gap). */
export function biomesWithoutTileset(fieldBiomes: string[]): string[] {
  return fieldBiomes.filter(b => !(TILESETS_BY_BIOME[b]?.length));
}

// --- CAVE-FACE resolver (the strata fabric's underground mint) ----------------
/** Tileset ids carrying a caveFace claim — built once, so a new underground
 *  tileset joins the pool with one field (the TILESETS_BY_BIOME doctrine). */
export const CAVE_FACE_IDS: string[] =
  Object.values(TILESETS).filter(t => t.caveFace).map(t => t.id);

/** The face an UNFORCED cave mint wears: every caveFace tileset weighted by
 *  its strata envelope at the mint's caveDepth × its affinity for the surface
 *  ANCHOR biome the ladder hangs beneath. One seeded draw; a degenerate pool
 *  (every weight zero) falls back to the classic cavern so a mouth never
 *  starves. Mirrors pickTilesetForBiome — same envelope algebra, the OTHER
 *  axis (down instead of inward). */
export function pickCaveFace(depth: number, anchorBiome: string | undefined, rng: Rng): string {
  const c = CAVE_FACE_IDS;
  if (!c.length) return 'cavern';
  const weights = c.map(id => {
    const f = TILESETS[id].caveFace!;
    const bio = f.biomes
      ? (anchorBiome !== undefined && f.biomes[anchorBiome] !== undefined
        ? f.biomes[anchorBiome] : f.biomes['*'] ?? 1)
      : 1;
    return presenceMul(f.strata, depth) * bio;
  });
  let total = 0;
  for (const w of weights) total += w;
  if (total <= 0) return TILESETS['cavern'] ? 'cavern' : c[0];
  let roll = rng.range(0, total); // the one contractual draw
  for (let i = 0; i < c.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return c[i];
  }
  return c[c.length - 1];
}

// ---------------------------------------------------------------------------
// BIOME LORE — one display title + one-line blurb per TILESETS entry.
//
// Colocated with the tileset table on purpose: a biome's PROSE lives next to
// its data, so the website's biome showcase reads a real source-of-truth field
// (never hard-coded on the page) and the export's QA can flag any TILESETS id
// missing lore — the same "every id resolves" discipline the packages use.
// The `title` is the human-readable name (the tileset itself only carries the
// procedural nameFirst/nameSecond parts); the `blurb` is what the card's hover
// reveals. Keep every key in sync with TILESETS — BIOME_LORE_GAPS() below is
// the assertion, run by the web export and available to any boot check.
// ---------------------------------------------------------------------------
export interface BiomeLore { title: string; blurb: string; }

export const BIOME_LORE: Record<string, BiomeLore> = {
  deepwood:       { title: 'Deepwood',          blurb: 'Deep old forest, green over green — fungal rot working below, thorns finding purchase above, and elder treants waking where the wood runs deepest.' },
  forest:         { title: 'Forest',            blurb: 'A true canopy: a near-sealed roof of crowns you move UNDER to see into, trails of beaten earth threading between the sun-wells where the light pools.' },
  gloamwood:      { title: 'Gloamwood',         blurb: 'Fog is territory here. Roaming banks feed the things that hunt from within them — bait them into the open, or ride the same murk unseen.' },
  taiga:          { title: 'Taiga',             blurb: 'Close, hushed conifer dark — deep drifts, frozen pools, and the firewood caches of travelers who never came back, the aurora breathing overhead.' },
  tundra:         { title: 'Tundra',            blurb: 'A frozen expanse under a permanent floor of snow, where every storm deepens the drifts and the cover never fully melts away.' },
  cinderlands:    { title: 'Cinderlands',       blurb: 'Scorched black flats where fire has already passed — ash, ember and the heat-shimmer of a land still cooling from the burn.' },
  desert:         { title: 'Scoured Waste',     blurb: 'The desert country\'s outskirts, where sand still argues with stone — scrub cactus, split rock, gnoll war-camps, and the first ridge lines marching in from the deep erg.' },
  sandsea:        { title: 'Sand-Sea',          blurb: 'The Great Erg: a sea with a grain. Ridge after wind-combed ridge to the horizon, soft lees that swallow your stride, and an oasis exactly often enough to keep you believing the next shimmer.' },
  saltflat:       { title: 'Glasspan',          blurb: 'A dead lake remembered as a floor — cracked white hardpan, lightning fused to glass, salt pillars for a forest, and no shade anywhere the sun can reach.' },
  jungle:         { title: 'Jungle',            blurb: 'Choked living thicket — walls of growth that block step, shot AND sight, cuttable throats plugged with brush and dens waiting behind them.' },
  buried_vault:   { title: 'Buried Vault',      blurb: 'A dead village’s underworks below the erg — dressed sandstone halls the dunes preserved, garrisoned by vermin, the risen, and whatever the urns were keeping.' },
  sunken_ruin:    { title: 'Sunken Ruins',      blurb: 'A drowned city that followed you down through a ruin-gate — flooded halls where something old still keeps to its rooms.' },
  mire:           { title: 'The Mire',          blurb: 'A drowned graveland of standing swamp, poison bog and rotted timber — footing that pulls at you and water that hides its teeth.' },
  wasteland:      { title: 'Wasteland',         blurb: "The war-wound: ground the demon war tore through and never gave back — hate-lit rents, vitrified glass, and the Legion's toll-road furniture under a dread pall." },
  hell_steppes:   { title: 'Hell Steppes',      blurb: "The underworld's fortress plateau — impaled warnings staked between the towers, one switchback stair the only way down onto the steppe." },
  caul:           { title: 'The Caul',          blurb: 'A hell-born warren of bruise-violet flesh — sacs, roots and umbilics glowing their own diegetic light while the living ground tries to take you back.' },
  river_of_flame: { title: 'River of Flame',    blurb: 'A continuous river of fire winding past gibbet galleries, banner roads and pale pyres to the Hellforge waiting where the flow finally ends.' },
  durance:        { title: 'The Durance',       blurb: 'The first fully indoor biome — a torture-hold of cold green light, instruments left mid-use, and gore underfoot that carries the whole story.' },
  crypt:          { title: 'The Crypt',         blurb: 'A forsaken graveland of headstones, broken tombs and the risen that simply will not stay buried.' },
  ossuary:        { title: 'The Ossuary',       blurb: 'A dark, matte bone-vault — pale mounds, shelf-rows and arches picked out by braziers and niche-candles down its long sightlines.' },
  beach:          { title: 'Coastline',         blurb: 'A sun-bleached coast of sand and wading shallows, palms leaning over scattered wilds where the open sea meets the edge of the map.' },
  meadow:         { title: 'Meadow',            blurb: 'A gentle grove breather — grass, scattered trees and low-threat wilds, a stretch where the world catches its breath.' },
  peninsula:      { title: 'Peninsula',         blurb: 'A near-round isle ringed entirely by water — all shore, nowhere to fall back to but the sea itself.' },
  cavern:         { title: 'Caverns',           blurb: 'The tight, rocky underground a cave mouth descends into — off the world graph, reached only ever by going down.' },
  depths:         { title: 'The Depths',        blurb: 'The sunless band beneath the galleries — Depthkin country lit only by glowworm colonies, where the ladder starts meaning it. The Brink, and the breach, wait below.' },
  magma_gallery:  { title: 'Magma Gallery',     blurb: 'The underground remembering it is a volcano: basalt colonnades, ember vents, floors still deciding to be liquid. Near volcanic country it is the neighbourhood; elsewhere, you have simply gone deep enough.' },
  rime_gallery:   { title: 'Rime Gallery',      blurb: 'Winter under the world: blue ice, brittle fangs, meres frozen mid-ripple. The cold pockets under tundra and taiga — and a rare deep chill anywhere else.' },
  fungal_hollow:  { title: 'Fungal Hollow',     blurb: 'The mycelium in the dark — glowcap lanterns, spore-choked air, the Bloom’s patient underground root. Rot needs no map; anywhere damp will do.' },
  descent:        { title: 'The Descent',       blurb: "A boundless lightless abyss the Delver's mineshaft drops into — push back the dark, harvest Echoes, and resurface before the deep keeps you." },
  grand_arena:    { title: 'Grand Arena',       blurb: 'A sand pit under open sky ringed with roaring crowd-rows and braziered rails — the colosseum where the ways in breach the very seats.' },
  abyssal_rift:   { title: 'The Abyssal',       blurb: "A winding cave-gut of narrow ways over bottomless rents, everything lit violet by the Abyssal faction's own cold light." },
  leyline_nexus:  { title: 'Leyline Nexus',     blurb: 'A place made of raw current — pyre, gale, rime and stone chained along the ley-lines that run through every face of it. The leyline IS the place.' },
  hellion_rift:   { title: 'Hellion Rift',      blurb: 'A riftborn pit of molten cracks, brimstone shards and charred ground where something worse than demons tore its way through.' },
  eldritch:       { title: 'The Eldritch',      blurb: 'A concealed, tentacular growth floating far off the charted frontier — overgrown wrongness native to the Eldritch, found only by those who wander too far.' },
  deepsea:        { title: 'The Deep Sea',      blurb: 'Open ocean that drowns you — mostly deep water dotted with air-pockets and void trenches; reach the next breath before your own runs out.' },
  highland:       { title: 'Highlands',         blurb: 'Windswept crags carved into a mountain-pass maze of corridors and chambers threaded between the standing rock.' },
  marsh:          { title: 'Marsh',             blurb: 'Fetid wetland of boggy islets strung between sluggish water and sucking mire, every step a negotiation with the ground.' },
  flesh:          { title: 'Flesh Warrens',     blurb: 'The flesh country\'s wound-rim: a writhing, pulsing warren — chambers that throb around you, sparse organic clutter, and an aberrant swarm that belongs to the walls.' },
  sanguine:       { title: 'The Sanguine',      blurb: 'The body\'s open rivers — blood pooled into galleries and red mirrors, arteries paying out on the heartbeat, and a mist that turns heads light. Keep moving or go pale.' },
  gutworks:       { title: 'The Gutworks',      blurb: 'A serpentine tract of bile, villi and puckering sphincter-doors that admit you chamber by chamber — the country digesting its way down, with you inside it.' },
  ocular:         { title: 'The Ocular',        blurb: 'The watching place: a socketed amphitheater of swaying stalks and eye-studded walls, every iris drearily on you. Press close and they flinch shut; linger seen and the country answers.' },
  crystal:        { title: 'Crystal Fields',    blurb: 'Prismatic shard-fields where the crystals themselves fire off random laser beams — a place that keeps you moving or gets you cut.' },
  volcanic:       { title: 'Volcanic Caldera',  blurb: 'An erupting caldera whose vents periodically lob arcing lava-orbs that splatter down into spreading pools of fire.' },
  mycelia:        { title: 'Mycelia',           blurb: 'A bioluminescent fungal warren — towering caps, puffing spore-pods and a glowing hyphal carpet where the slow Bloom makes its home.' },
  grassland:      { title: 'Grasslands',        blurb: 'Wide-open windblown grass — no trees, no water, no void, just an exploration-leaning breadth that rewards running the field.' },
  aether:         { title: 'The Aetherial',     blurb: "The Host's first sky-shelf — cloud ground that dissolves under your feet, the world far below waiting to catch you where you drop." },
  aether_spires:  { title: 'Aetherial Spires',  blurb: 'The built courts among the clouds — solid stone that holds, though a fight carried onto a frail connecting span will still drop the span.' },
  aether_drift:   { title: 'Aetherial Drift',   blurb: 'Drifting cloud-rafts riding the wind — gusts warn and then shove; read the rhythm or the sky simply lets you go, straight down.' },
  aether_sanctum: { title: 'Aetherial Sanctum', blurb: 'The dense, unbroken lattice at the crossing’s end — wide causeways, no sky-holes, ground that finally holds. The waypoint home.' },
};

/** QA seam: TILESETS ids with no BIOME_LORE, and lore keys pointing at no
 *  tileset. The web export fails loud on the first list; keep both empty. */
export function BIOME_LORE_GAPS(): { missingLore: string[]; orphanLore: string[] } {
  const ids = new Set(Object.keys(TILESETS));
  const keys = new Set(Object.keys(BIOME_LORE));
  return {
    missingLore: [...ids].filter(id => !keys.has(id)).sort(),
    orphanLore: [...keys].filter(k => !ids.has(k)).sort(),
  };
}
