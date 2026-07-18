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

import type { BlendSpec, CompositionRoll, HollowRollSpec, LandmarkRoll, PackSpec, SkyExposure, StampSpec, StructureRoll, ZoneTheme } from './zones';
import type { Rng } from '../core/rng';
import { presenceMul, type LevelEnvelope } from '../engine/presence';
import { climateAffinity, type ClimateSpec } from '../world/climate';

/** A tileset-declared BLEND (the blend fabric, engine/blend.ts): zones minted
 *  from this tileset interleave the named partner's theme + kit + packs by
 *  the declared weight field. `chance` (default 1) rolls per mint on a
 *  DEDICATED sub-stream (blendless tilesets stay byte-identical). A variant
 *  may override (its own roll) or suppress (null) the tileset's declaration. */
export type BlendRoll = BlendSpec & { chance?: number };

export interface ObjectiveWeight {
  kind: 'clear' | 'escape' | 'spawners' | 'waves' | 'beacon' | 'circuit' | 'procession' | 'bounty' | 'offering' | 'puzzle';
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
  /** BLEND override for this face: its own roll, or null to SUPPRESS the
   *  tileset-level blend on this face. Absent = the tileset's declaration. */
  blend?: BlendRoll | null;
  /** LAYOUT-KNOB overrides merged over the tileset's layoutParams at mint
   *  (spec still outranks both) — a face can retune its RECIPE the way
   *  theme retunes its colors: the prism face weights its span table
   *  toward rainbows without a sibling tileset. Absent = byte-identical. */
  layoutParams?: Record<string, unknown>;
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
  /** ACTIVITY PUZZLES the biome may stand up per zone (engine/puzzles.ts):
   *  chance rows into the PUZZLES presets (data/puzzles.ts), folded onto
   *  minted ZoneDefs and rolled at LOAD on a salted stream (never moves
   *  layout rng). A 'puzzle' objective row in `objectives` draws its preset
   *  from these same rows — the biome's repertoire is one list. */
  puzzles?: { id: string; chance: number }[];
  /** AMBIENT SCENERY-ACTORS the biome plants per zone (World.bootScenery):
   *  passive object-actor rows — freestanding resonant crystals, future
   *  shrine-bodies — spawned at LOAD on their own salted stream. Folded
   *  onto minted ZoneDefs exactly like `puzzles`. */
  scenery?: { monster: string; count: [number, number] }[];
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
  /** REALM MEMBERSHIP: this tileset belongs to the named DIMENSION's own
   *  biome pools — a realm mint (placeZoneAt with spec.dimension, the gate
   *  mint) resolves it through pickTilesetForBiome's realm parameter even
   *  though `frontier: false` keeps it out of every SURFACE pool. The two
   *  flags carry ONE meaning each: `frontier` gates the surface field,
   *  `realm` grants a dimension's field — without this, a realm whose
   *  palette names only realm-locked tilesets silently minted the fallback
   *  (the wasteland-Firmament defect: heaven wearing hell's face). */
  realm?: string;
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
  /** PIN the layout generator id: caves skip the caveLayouts roll (Descent's
   *  convex streamer), surface mints skip the biome's allowedLayouts roll —
   *  how a multi-face country couples each FACE to its own recipe (the Karst
   *  Reach's chasm maze vs the Petrified Weald's forest). */
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
  /** GEO-LOCKED FACES: a climate envelope (the BiomeInfo.climate vocabulary —
   *  named bands or inline from/to envelopes) weighting THIS face by the
   *  mint coordinate's BAKED climate in pickTilesetForBiome. Because the
   *  climate field is coherent over a whole region, every zone of one
   *  stretch reads the same face — the per-RANGE identity lock (a cold
   *  mountain range crowns in snow on every summit; a warm one never does).
   *  Composes with depthAffinity (stage × place). Omitted = weight 1 at any
   *  climate; mints without a climate sampler treat every envelope as
   *  neutral — existing biomes byte-identical. */
  geoAffinity?: Record<string, ClimateSpec>;
  /** THE UNDERGROUND'S claim: carrying this joins the cave-face pool the
   *  strata fabric picks unforced cave mints from (see CaveFaceSpec). */
  caveFace?: CaveFaceSpec;
  /** SECRET-HOLLOWS budget stamped onto minted zones (the hollows fabric —
   *  ZoneDef.hollows): sealed pockets and through-wall passages behind
   *  brittle seams, GRID layouts only. */
  hollows?: HollowRollSpec;
  /** THE BLEND (engine/blend.ts): zones minted from this tileset interleave a
   *  PARTNER tileset's theme + kit + packs by a weight field — transition
   *  bands, tessellated pockets, patchwork (see BlendFieldSpec). Rolled per
   *  mint (chance, dedicated sub-stream), resolved onto ZoneDef.blend, and
   *  composed there once (layout rows tagged, pack tables merged). Variants
   *  may override or suppress. No partner is special-cased anywhere: this is
   *  a structural tileset-id ref, validated at boot + swept by genqa. */
  blend?: BlendRoll;
  /** DOCKABILITY: this face's weight in a PORT mint's tileset pick (harbors
   *  grow only where a hull can land). A port minting into a biome picks
   *  among that biome's dock-weighted faces — weight × depthAffinity at the
   *  mint's depth (pickDockTileset) — and a biome fielding NO dockable face
   *  cedes the harbor to PORT_MINT.fallbackBiome (world/biomes.ts). Absent
   *  = 0: never a harbor (brine pans and half-drowned ground take no
   *  pilings). A general lever, never a face list. */
  docks?: number;
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
        // The cadenced kin tour the old woods — the duel keeps its own time.
        { id: 'cadence_fencer', weight: 1, presence: { from: 6, fadeIn: 3 } },
        { id: 'cadence_cantor', weight: 1, presence: { from: 8, fadeIn: 4 } },
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

  // THE DOWNS — the massif fabric's home country (engine/massif.ts): rolling
  // bracken heath where LARGE impassable bodies stand in the open — grey tors
  // and scarp bluffs (true walls), drystone folds (parapets you duel across),
  // hedge-lines (blind cover shots thread), barrows crowned with old stones.
  // The MIXTURE archetype: the zone plays OPEN — long sightlines, wide floor —
  // while every crossing negotiates around the bones. Three faces re-mix the
  // same mass vocabulary through variant layoutParams alone: the recipe-tweak
  // doctrine, applied to terrain masses.
  downs: {
    id: 'downs',
    forceLayout: 'massif',
    compositions: [{ composition: 'stone_sanctum', chance: 0.12 }],
    nameFirst: ['Bracken', 'Harrow', 'Greywether', 'Wold', 'Mistle', 'Cairn', 'Whinny', 'Old Meadow', 'Shepherd’s', 'Thorn', 'Fallow', 'Drover’s', 'Weathered', 'Barrowman’s'],
    nameSecond: ['Downs', 'Moor', 'Wolds', 'Leas', 'Heath', 'Fells', 'Commons', 'Folds', 'Acres', 'Pastures', 'Rise', 'Balks'],
    theme: {
      dayLight: 1.12,
      nightDark: 0.8,
      // Heath floor: dry greens over bruised browns, lifted where the open
      // weave runs between the bodies (real meadow light), banks dark at the
      // odd pond margin.
      ground: {
        scale: 1.6, strength: 1.05, speckles: 0.4,
        palette: ['#161c0f', '#232c14', '#31391c', '#3f4826', '#4d5530'], bias: 0.55, alpha: 0.52,
        coast: { reach: 80, shift: -0.3, kinds: ['water', 'bog'] },
        clearing: { reach: 120, lift: 0.24 },
      },
      fog: { banks: [0, 1], kinds: [{ id: 'mist' }] },
      floor: '#11150c', grid: '#1a2112', border: '#6a6a4e',
      obstacle: '#4c473a', obstacleEdge: '#7a7258', accent: '#c8b86a',
      tree: '#3a5a2e', wall: '#3d3a31',
    },
    sizeW: [3200, 4300], sizeH: [2300, 3100], ellipseChance: 0.3, biome: 'downs', sky: 'open',
    layoutParams: {
      // The base face mixes the whole vocabulary; coverage sits at the
      // reference density (country first, bones everywhere).
      massifMasses: [
        { kind: 'tor', weight: 2.5 }, { kind: 'bluff', weight: 2 },
        { kind: 'fold', weight: 1.3 }, { kind: 'barrow', weight: 1.2 },
        { kind: 'hedge', weight: 1 },
      ],
      massifCoverage: [0.15, 0.23],
    },
    layout: [
      { kind: 'grass', count: [5, 8] },
      { kind: 'brush', count: [3, 5] },
      { kind: 'flowers', count: [2, 4] },
      { kind: 'rocks', count: [4, 8], radius: [16, 32] },
      { kind: 'scree', count: [2, 4] },
      { kind: 'standing_stone', count: [1, 3] },
      { kind: 'dead_tree', count: [1, 3] },
      { kind: 'log', count: [1, 3] },
      { kind: 'cave', count: [0, 2] },
      { kind: 'camp', count: [0, 1] },
      { kind: 'formation', count: [0, 1], formation: 'boulder_train' },
      { kind: 'structure', count: [0, 1], structure: 'wayside_camp' },
    ],
    // Whatever face rolls, the downs always carry their bones' litter.
    common: [
      { kind: 'bone_pile', count: [0, 2] },
    ],
    variants: [
      // The stone face: tors and bluffs crowd the heath — cave-mouthed crag
      // country, the walk-around at its most massive.
      { name: 'the grey tors', layout: [
        { kind: 'rocks', count: [6, 10], radius: [18, 38] },
        { kind: 'scree', count: [3, 5] },
        { kind: 'grass', count: [4, 6] },
        { kind: 'standing_stone', count: [1, 2] },
        { kind: 'cave', count: [1, 3] },
        { kind: 'formation', count: [1, 2], formation: 'boulder_train' },
      ], layoutParams: {
        massifMasses: [{ kind: 'tor', weight: 4 }, { kind: 'bluff', weight: 2.5 }, { kind: 'fold', weight: 0.6 }],
        massifCoverage: [0.18, 0.26], massifSizeR: [190, 340],
      } },
      // The settled face: folds, hedge-lines and swallowed steadings — the
      // old walked land, its courts still holding what the owners left.
      { name: 'the old fields', layout: [
        { kind: 'grass', count: [6, 9] },
        { kind: 'flowers', count: [3, 5] },
        { kind: 'brush', count: [3, 5] },
        { kind: 'rocks', count: [3, 5], radius: [14, 26] },
        { kind: 'dead_tree', count: [1, 3] },
        { kind: 'camp', count: [0, 1] },
        { kind: 'structure', count: [0, 1], structure: 'wayside_camp' },
      ], layoutParams: {
        massifMasses: [
          { kind: 'fold', weight: 3 }, { kind: 'hedge', weight: 2.5 },
          { kind: 'ruincourt', weight: 2 }, { kind: 'tor', weight: 0.8 },
        ],
        massifCoverage: [0.14, 0.2],
      } },
      // The burial face: the mounds hold the high ground and the old dead
      // keep their markers — barrow country under a thin mist.
      { name: 'the barrowfield', layout: [
        { kind: 'grass', count: [4, 7] },
        { kind: 'tombstone', count: [3, 6] },
        { kind: 'standing_stone', count: [2, 4] },
        { kind: 'dead_tree', count: [2, 4] },
        { kind: 'scree', count: [2, 3] },
        { kind: 'bone_pile', count: [1, 3] },
      ], layoutParams: {
        massifMasses: [
          { kind: 'barrow', weight: 3.5 }, { kind: 'tor', weight: 1 }, { kind: 'fold', weight: 1 },
        ],
        massifCoverage: [0.14, 0.21],
      } },
    ],
    packs: {
      count: [6, 8], size: [3, 5],
      // The living downs hunt in packs; the barrows lend their dead where
      // presence deepens; the stones themselves watch the deep country.
      table: [
        { id: 'fen_hound', weight: 3, presence: { to: 18, fadeOut: 8 } },
        { id: 'dire_wolf', weight: 3 },
        { id: 'moon_howler', weight: 1, presence: { from: 9, fadeIn: 4 } },
        { id: 'gnoll_prowler', weight: 3 },
        { id: 'gnoll_butcher', weight: 2, presence: { from: 5, fadeIn: 3 } },
        { id: 'brute', weight: 2, presence: { from: 6, fadeIn: 3 } },
        { id: 'warband_chieftain', weight: 1, presence: { from: 12, fadeIn: 5 } },
        { id: 'alpha_stalker', weight: 1, presence: { from: 10, fadeIn: 5 } },
        { id: 'zombie', weight: 2, presence: { to: 20, fadeOut: 10 } },
        { id: 'skeleton_archer', weight: 2 },
        { id: 'crypt_warden', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'hex_weaver', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'basilisk', weight: 1, presence: { from: 7, fadeIn: 3 } },
        { id: 'stone_sentinel', weight: 1, presence: { from: 11, fadeIn: 5 } },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [
      { kind: 'clear', weight: 3 },
      { kind: 'bounty', weight: 2 },
      { kind: 'escape', weight: 1 },
      { kind: 'beacon', weight: 1 },
      { kind: 'spawners', weight: 1 },
      { kind: 'procession', weight: 1 },
    ],
    caveLayouts: { plains: 3, rooms: 2, dungeon: 1 },
    // The bodies themselves hide the finds: cache and ambush hollows carve
    // into tor/bluff wall mass behind brittle seams (grid layout — the
    // hollows fabric's requirement — comes with the recipe).
    hollows: {
      count: [0, 2],
      table: { cache_hollow: 3, ambush_hollow: 2, vein_hollow: 1 },
    },
  },

  // THE FARMLAND — the settled belt's worked half (biome 'farmland', the
  // 'fields' recipe: engine/settled.ts). The layered approach the country
  // stages by FACE: open shires → crop seas (wheat that eats sight — the
  // veil fabric at ankle height) → harvest towns (the village kit, paved
  // and lamplit) → fallow shires where the wild creeps back. Real roads
  // portal-to-portal on every face; the crop fields are veil patches, so
  // the calm is watchful — you cannot read the wheat.
  farmland: {
    id: 'farmland',
    forceLayout: 'fields',
    compositions: [
      { composition: 'harvest_steading', chance: 0.24 },
      { composition: 'orchard_rows', chance: 0.14 },
      { composition: 'drover_waystation', chance: 0.1 },
      { composition: 'witchs_croft', chance: 0.08 },
    ],
    nameFirst: ['Wheatlea', 'Millbrook', 'Barleigh', 'Croftmere', 'Tithe', 'Oxbow', 'Greenlea', 'Fallowdene', 'Hedgeford', 'Drover’s', 'Harrowmill', 'Goodman’s'],
    nameSecond: ['Fields', 'Furlongs', 'Crofts', 'Acres', 'Lanes', 'Commons', 'Holdings', 'Fallows', 'Hedgerows', 'Reach', 'Steading', 'Grange'],
    theme: {
      dayLight: 1.14,
      nightDark: 0.82,
      // Worked earth: green rows ripening to gold, lifted along the open
      // lanes, banked dark at the pond margins.
      ground: {
        scale: 1.5, strength: 1.05, speckles: 0.42,
        palette: ['#1a1c0e', '#293014', '#3b3d1a', '#4d4a22', '#5c552a'], bias: 0.58, alpha: 0.5,
        coast: { reach: 80, shift: -0.28, kinds: ['water', 'bog'] },
        clearing: { reach: 130, lift: 0.22 },
      },
      fog: { banks: [0, 1], kinds: [{ id: 'mist' }] },
      floor: '#12150c', grid: '#1b2112', border: '#6f6a4a',
      obstacle: '#4c473a', obstacleEdge: '#7a7258', accent: '#d8c06a',
      tree: '#3f5c2e', wall: '#4a4438',
    },
    sizeW: [3200, 4400], sizeH: [2300, 3200], ellipseChance: 0.25, biome: 'farmland', sky: 'open',
    layoutParams: {
      massifMasses: [
        { kind: 'hedge', weight: 3 }, { kind: 'croft', weight: 2 }, { kind: 'fold', weight: 1.5 },
      ],
      massifCoverage: [0.09, 0.14],
      roadCount: [1, 2], roadKind: 'road', roadWidth: [15, 20],
    },
    // The base face: the open shires — worked land at its widest.
    layout: [
      { kind: 'grass', count: [5, 8] },
      { kind: 'flowers', count: [2, 4] },
      { kind: 'brush', count: [2, 4] },
      { kind: 'rocks', count: [2, 4], radius: [14, 26] },
      { kind: 'cluster', count: [1, 2], cluster: 'wheat_field' },
      { kind: 'formation', count: [1, 2], formation: 'fence_line' },
      { kind: 'formation', count: [0, 1], formation: 'orchard_walk' },
      { kind: 'hay_bale', count: [1, 3] },
      { kind: 'well', count: [0, 1] },
      { kind: 'cluster', count: [0, 1], cluster: 'village_green' },
      { kind: 'cluster', count: [0, 1], cluster: 'millstead' },
      { kind: 'structure', count: [0, 1], structure: 'hovel' },
      { kind: 'structure', count: [0, 1], structure: 'wayside_camp' },
    ],
    // Whatever face rolls, somebody worked this ground and left in a hurry.
    common: [
      { kind: 'hay_bale', count: [0, 2] },
    ],
    variants: [
      // The deep fields: wheat and corn to every horizon, the road a rumor
      // between the stands — vision is the fight here (Grim Dawn's fields).
      { name: 'the crop seas', layout: [
        { kind: 'cluster', count: [3, 5], cluster: 'wheat_field' },
        { kind: 'formation', count: [2, 4], formation: 'corn_rows' },
        { kind: 'formation', count: [1, 2], formation: 'scarecrow_row' },
        { kind: 'cluster', count: [0, 1], cluster: 'millstead' },
        { kind: 'grass', count: [3, 5] },
        { kind: 'hay_bale', count: [1, 3] },
      ], layoutParams: {
        massifMasses: [{ kind: 'hedge', weight: 3 }, { kind: 'croft', weight: 1 }],
        massifCoverage: [0.05, 0.09],
        roadCount: [1, 1], roadWidth: [14, 18],
      } },
      // The settled face: the village kit proper — cottages, the chapel,
      // trades, the green, and a paved lamplit way through it all.
      { name: 'the harvest towns', layout: [
        { kind: 'cluster', count: [1, 1], cluster: 'village_green' },
        { kind: 'structure', count: [1, 3], structure: 'cottage' },
        { kind: 'structure', count: [0, 1], structure: 'longhouse' },
        { kind: 'structure', count: [0, 1], structure: 'chapel' },
        { kind: 'structure', count: [0, 1], structure: 'hay_barn' },
        { kind: 'structure', count: [0, 1], structure: 'coaching_inn' },
        { kind: 'structure', count: [0, 1], structure: 'skinners_hut' },
        { kind: 'structure', count: [0, 1], structure: 'fletchers_range' },
        { kind: 'structure', count: [0, 2], structure: 'hovel' },
        { kind: 'formation', count: [1, 2], formation: 'fence_line' },
        { kind: 'cluster', count: [1, 2], cluster: 'wheat_field' },
        { kind: 'flowers', count: [2, 4] },
      ], layoutParams: {
        massifMasses: [{ kind: 'croft', weight: 2 }, { kind: 'hedge', weight: 1.5 }],
        massifCoverage: [0.05, 0.09],
        roadCount: [2, 3], roadKind: 'paved_way', roadWidth: [20, 26], wayLamps: 'street_lamp',
      } },
      // The wild rim: the fields nobody bound this year — the hedges gone
      // leggy, the old walls swallowed, the watchers walking their rows.
      { name: 'the fallow shires', layout: [
        { kind: 'grass', count: [6, 9] },
        { kind: 'dead_tree', count: [2, 4] },
        { kind: 'formation', count: [1, 2], formation: 'scarecrow_row' },
        { kind: 'cluster', count: [1, 2], cluster: 'wheat_field' },
        { kind: 'rocks', count: [3, 5], radius: [14, 26] },
        { kind: 'bone_pile', count: [0, 2] },
        { kind: 'structure', count: [0, 1], structure: 'hovel' },
      ], layoutParams: {
        massifMasses: [
          { kind: 'hedge', weight: 2 }, { kind: 'ruincourt', weight: 2 },
          { kind: 'fold', weight: 1.5 }, { kind: 'barrow', weight: 0.5 },
        ],
        massifCoverage: [0.12, 0.17],
        overgrowth: [0.08, 0.2],
      } },
    ],
    packs: {
      count: [5, 7], size: [3, 5],
      // The worked land's own troubles: the Chattel gone wrong, the Carven
      // watching the rows, the roads' bandits — and the boar that owns the
      // headland. Deeper presence brings the harvest court out in force.
      table: [
        { id: 'feral_hen', weight: 2, presence: { to: 8, fadeOut: 4 } },
        { id: 'feral_aurochs', weight: 2 },
        { id: 'shepherds_hound', weight: 2 },
        { id: 'sounder_boar', weight: 2 },
        { id: 'bandit_cutthroat', weight: 2.5 },
        { id: 'bandit_bruiser', weight: 1.5, presence: { from: 4, fadeIn: 3 } },
        { id: 'gourdling', weight: 2, presence: { to: 14, fadeOut: 6 } },
        { id: 'patch_lurker', weight: 1.5 },
        { id: 'scarecrow_watcher', weight: 2 },
        { id: 'lantern_sower', weight: 1, presence: { from: 5, fadeIn: 3 } },
        { id: 'harvest_effigy', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'the_bellwether', weight: 0.5, presence: { from: 9, fadeIn: 4 } },
        { id: 'carven_king', weight: 0.5, presence: { from: 11, fadeIn: 5 } },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [
      { kind: 'clear', weight: 3 },
      { kind: 'bounty', weight: 2.5 },
      { kind: 'procession', weight: 1.5 },
      { kind: 'escape', weight: 1 },
      { kind: 'beacon', weight: 1 },
      { kind: 'offering', weight: 1 },
    ],
    caveLayouts: { plains: 3, rooms: 2 },
  },

  // THE METROPOLIS — the walled city (biome 'metropolis', the 'district'
  // recipe: engine/settled.ts). An ENCLAVE: every crossing into the biome
  // wears the city gate. The faces are DISTRICTS sharing one generator:
  // the warrens' brick massing (alley sight-fights, squats hollowed into
  // the block mass, stairs that climb into minted rooms), the boulevards'
  // planned blocks (real plan structures off a weighted pool, plazas,
  // paved seams), and the high quarter's manor courts (garden walls,
  // fountains, townhouses seated INSIDE the grand courts).
  metropolis: {
    id: 'metropolis',
    forceLayout: 'district',
    compositions: [{ composition: 'hangmans_hill', chance: 0.1 }],
    nameFirst: ['Coppergate', 'Tallow', 'Lantern', 'Cinder', 'Wethervane', 'Guilder’s', 'Old King’s', 'Pauper’s', 'Silverstitch', 'Cordwainer’s', 'Bellfound', 'Ledgerman’s'],
    nameSecond: ['Ward', 'Rows', 'Quarter', 'Walk', 'Shambles', 'Terraces', 'Close', 'Yards', 'Circus', 'Gateside', 'Commons', 'Steps'],
    theme: {
      dayLight: 1.06,
      nightDark: 0.94,
      // Paved greys warmed by lamp gold; the brick mass reads warm against
      // the setts, the manor stone cool against both.
      ground: {
        scale: 1.2, strength: 0.9, speckles: 0.3,
        palette: ['#16130f', '#221d16', '#2e2820', '#3a332a', '#453d31'], bias: 0.52, alpha: 0.5,
        clearing: { reach: 110, lift: 0.18 },
      },
      fog: { banks: [0, 1], kinds: [{ id: 'mist' }] },
      floor: '#131210', grid: '#1c1a16', border: '#6a6456',
      obstacle: '#4a3f33', obstacleEdge: '#7d705c', accent: '#d8c06a',
      tree: '#3a4a2c', wall: '#4a3226',
    },
    sizeW: [3000, 4000], sizeH: [2200, 3000], ellipseChance: 0, biome: 'metropolis', sky: 'open',
    layoutParams: {
      districtMode: 'massing',
      massifMasses: [{ kind: 'tenement', weight: 3 }, { kind: 'manor', weight: 0.8 }],
      massifCoverage: [0.2, 0.28], massifSizeR: [170, 300], massifLaneW: 84,
      boulevards: [1, 2],
      courtKit: [
        { kind: 'market_stall', weight: 2, radius: [20, 26] },
        { kind: 'well', weight: 1, radius: [16, 20] },
        { kind: 'street_lamp', weight: 1.5, radius: [9, 12] },
        { kind: 'broken_cart', weight: 1, radius: [15, 19] },
      ],
    },
    layout: [
      { kind: 'rubble', count: [2, 4] },
      { kind: 'broken_cart', count: [1, 2] },
      { kind: 'market_stall', count: [1, 3] },
      { kind: 'street_lamp', count: [2, 4] },
      { kind: 'banner_post', count: [1, 2] },
      { kind: 'structure', count: [0, 1], structure: 'townhouse' },
    ],
    common: [
      { kind: 'rubble', count: [1, 2] },
    ],
    variants: [
      // The ghetto: brick stacked on brick, the lanes barely a cart wide —
      // line of sight is its own fight off the boulevard, and the blocks
      // themselves hide squats, stashes and stairs (the hollows fabric).
      { name: 'the warrens', layout: [
        { kind: 'rubble', count: [4, 7] },
        { kind: 'broken_cart', count: [1, 2] },
        { kind: 'bone_pile', count: [1, 3] },
        { kind: 'street_lamp', count: [1, 2] },
        { kind: 'web', count: [1, 3] },
      ], layoutParams: {
        massifMasses: [{ kind: 'tenement', weight: 4 }],
        massifCoverage: [0.26, 0.34], massifSizeR: [150, 260], massifLaneW: 64,
        boulevards: [1, 1],
        courtKit: [
          { kind: 'broken_cart', weight: 2, radius: [15, 19] },
          { kind: 'rubble', weight: 2, radius: [14, 22] },
          { kind: 'firewood_pile', weight: 1, radius: [10, 14] },
        ],
      } },
      // The planned city: surveyed blocks off the pool, plazas at the
      // gates, paved seams, corner lamps — the furbished roadscape.
      { name: 'the boulevards', layout: [
        { kind: 'market_stall', count: [2, 4] },
        { kind: 'banner_post', count: [1, 3] },
        { kind: 'street_lamp', count: [2, 4] },
        { kind: 'flowers', count: [1, 3] },
      ], layoutParams: {
        districtMode: 'blocks',
        blockSize: 380, streetWidth: 100, plazaChance: 0.24, paveStreets: true,
        blockPool: [
          { structure: 'metro_house', weight: 3 },
          { structure: 'townhouse', weight: 2 },
          { structure: 'longhouse', weight: 1 },
          { structure: 'market_row', weight: 1 },
          { structure: 'cottage', weight: 0.8 },
          { structure: 'chapel', weight: 0.6 },
        ],
        plazaKit: [
          { kind: 'fountain', weight: 2, radius: [20, 26] },
          { kind: 'market_stall', weight: 2, radius: [20, 26] },
          { kind: 'well', weight: 1, radius: [16, 20] },
        ],
      } },
      // The high quarter: garden courts behind pale stone, fountains and
      // clipped beasts, townhouses seated in the grand yards — and stairs
      // that go UP (the ascension lane's richest ground).
      { name: 'the high quarter', layout: [
        { kind: 'formation', count: [1, 2], formation: 'iron_boundary' },
        { kind: 'formation', count: [1, 2], formation: 'topiary_walk' },
        { kind: 'structure', count: [1, 2], structure: 'townhouse' },
        { kind: 'structure', count: [0, 1], structure: 'chapel' },
        { kind: 'street_lamp', count: [2, 4] },
        { kind: 'flowers', count: [2, 4] },
      ], layoutParams: {
        massifMasses: [{ kind: 'manor', weight: 3.5 }, { kind: 'tenement', weight: 0.6 }],
        massifCoverage: [0.16, 0.22], massifSizeR: [200, 340], massifLaneW: 110,
        boulevards: [1, 2],
        courtKit: [
          { kind: 'fountain', weight: 2, radius: [20, 26] },
          { kind: 'dead_topiary', weight: 2, radius: [14, 20] },
          { kind: 'street_lamp', weight: 2, radius: [9, 12] },
          { kind: 'weathered_statue', weight: 1.5, radius: [12, 16] },
        ],
        courtStructure: { structure: 'townhouse', chance: 0.5 },
        courtStructMinR: 200,
      } },
    ],
    packs: {
      count: [5, 7], size: [3, 5],
      // The city's own food chain: the vermin tide underfoot, the crimp
      // gangs working the lanes, the umbral trades after dark — and the
      // Hollowborn walking the armories the guilds sealed.
      table: [
        { id: 'gutter_shiv', weight: 3, presence: { to: 16, fadeOut: 7 } },
        { id: 'press_ganger', weight: 2, presence: { from: 3, fadeIn: 2 } },
        { id: 'crimp_captain', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'warren_rat', weight: 2.5, presence: { to: 14, fadeOut: 6 } },
        { id: 'fester_rat', weight: 1.5 },
        { id: 'verminkin_skulker', weight: 1.5, presence: { from: 5, fadeIn: 3 } },
        { id: 'verminkin_broodpriest', weight: 1, presence: { from: 7, fadeIn: 3 } },
        { id: 'rat_king', weight: 0.5, presence: { from: 9, fadeIn: 4 } },
        { id: 'bandit_cutthroat', weight: 1.5 },
        { id: 'umbral_footpad', weight: 1, presence: { from: 6, fadeIn: 3 } },
        { id: 'hollow_vanguard', weight: 1.5, presence: { from: 6, fadeIn: 3 } },
        { id: 'blade_swarm', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'shield_anima', weight: 1, presence: { from: 7, fadeIn: 3 } },
        { id: 'the_unworn', weight: 0.5, presence: { from: 12, fadeIn: 5 } },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [
      { kind: 'clear', weight: 3 },
      { kind: 'bounty', weight: 2.5 },
      { kind: 'circuit', weight: 1.5 },
      { kind: 'spawners', weight: 1 },
      { kind: 'waves', weight: 1 },
      { kind: 'offering', weight: 0.5 },
    ],
    caveLayouts: { rooms: 3, dungeon: 2 },
    // The blocks themselves keep secrets: squats and stashes walled into the
    // brick mass, and stairwells that climb into minted rooms (the ascension
    // lane through the hollows fabric).
    hollows: {
      count: [1, 2],
      table: { cache_hollow: 2, ambush_hollow: 2, stairwell_hollow: 2 },
    },
  },

  // THE TOWNHOUSE — the settled belt's interior (frontier:false): the floors
  // the city_stair/garret_stair mints climb into. Procedural rooms on worn
  // boards (every house rolls its own floorplan — the ruin_gate pattern
  // turned vertical); a garret_stair row means some houses climb twice.
  townhouse: {
    id: 'townhouse',
    nameFirst: ['Worn', 'Creaking', 'Panelled', 'Lamplit', 'Dusty', 'Shuttered'],
    nameSecond: ['Rooms', 'Boards', 'Landing', 'Lodgings', 'Halls'],
    theme: {
      ambientDark: 0.22,
      ground: {
        scale: 1.1, strength: 0.8, speckles: 0.2,
        palette: ['#191106', '#241a0c', '#2e2210', '#382a16', '#42321c'], bias: 0.5, alpha: 0.55,
      },
      floor: '#1c130a', grid: '#241a0e', border: '#5c4a32',
      obstacle: '#3a2c1e', obstacleEdge: '#6a5638', accent: '#e8c87a',
      tree: '#3a2c1e', wall: '#3a2c1e',
    },
    sizeW: [1000, 1400], sizeH: [800, 1100], ellipseChance: 0, biome: 'metropolis', sky: 'sheltered',
    frontier: false, perfProbe: true,
    layoutParams: { floorStyle: 'boards', interiorWall: 'tenement_wall', rooms: [3, 6], doorChance: 0.65 },
    layout: [
      { kind: 'garret_stair', count: [0, 1] },
      { kind: 'web', count: [1, 3] },
      { kind: 'dust_sheet', count: [0, 2] },
      { kind: 'candelabra', count: [0, 2] },
    ],
    variants: [
      // The kept rooms: somebody still dusts here — and keeps the stair lit.
      { name: 'the kept rooms', layout: [
        { kind: 'garret_stair', count: [0, 1] },
        { kind: 'candelabra', count: [1, 3] },
        { kind: 'standing_portrait', count: [0, 2] },
        { kind: 'manor_mirror', count: [0, 1] },
      ] },
      // The squat: the door was never locked and everything burnable burned.
      { name: 'the squat', layout: [
        { kind: 'garret_stair', count: [0, 1] },
        { kind: 'web', count: [2, 4] },
        { kind: 'rubble', count: [1, 3] },
        { kind: 'bone_pile', count: [0, 2] },
      ] },
    ],
    packs: {
      count: [2, 3], size: [2, 3],
      table: [
        { id: 'gutter_shiv', weight: 2 },
        { id: 'warren_rat', weight: 2 },
        { id: 'fester_rat', weight: 1 },
        { id: 'umbral_footpad', weight: 1, presence: { from: 5, fadeIn: 3 } },
        { id: 'verminkin_skulker', weight: 1, presence: { from: 6, fadeIn: 3 } },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [{ kind: 'clear', weight: 1 }],
    caveLayouts: { rooms: 1 },
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
    // THE COUNTRY'S HEART. Gloamwood is a three-face country now (the
    // desert/karst model): the HALLOWFIELD rim (feral pumpkin crofts, the
    // Carven Court) gives way to this deep wood, which gives way to the
    // MOURNSTEAD estates (the manor, the family plots) in the deepest gloam.
    // The heart stands aside from the very rim so the country's first face
    // is the harvest — and darkens from there.
    depthAffinity: { from: 0.15, fadeIn: 0.25 },
    compositions: [
      { composition: 'hangmans_hill', chance: 0.35 },
      { composition: 'witchs_croft', chance: 0.35 },
      // The country bleeds through its own middle: a festival ring the
      // Court walked in from the rim, a family plot the estates lost track
      // of under the crooked roof.
      { composition: 'carven_ring', chance: 0.15 },
      { composition: 'family_plot', chance: 0.12 },
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
      // The Court's table, found cold: a halted feast down some verge —
      // the coach where it burned, stakes, the fed-on where they knelt.
      { kind: 'formation', count: [0, 1], formation: 'night_feast' },
      { kind: 'drained_husk', count: [0, 2] },
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
        // The widdershin court's furniture: teal caps that addle brushed
        // feet (rule in data/tracks.ts), the odd bell, the odd warning.
        { kind: 'maddercap', count: [1, 3] },
        { kind: 'witch_bell', count: [0, 1] },
        { kind: 'mazing_stone', count: [0, 2] },
      ] },
    ],
    packs: {
      count: [5, 8], size: [3, 5],
      // Duskwood end to end — and the NIGHT COURT carries the wood now
      // (its patron): the Court's larder shambles the fringe, its hands
      // and knives work the middle depths, its church and carriage roll
      // where the roof seals. The old dead stay on as the kept staff —
      // the Court keeps thralls, and the wood keeps its crows.
      table: [
        { id: 'carrion_crow', weight: 3, presence: { to: 20, fadeOut: 10 } },
        { id: 'gloomling', weight: 2, presence: { to: 16, fadeOut: 8 } },
        { id: 'zombie', weight: 2, presence: { to: 14, fadeOut: 7 } },
        { id: 'hollow_lantern', weight: 2 },
        // The widdershin court: the confusion family's tutors (dust that
        // addles the hand, bells that turn the feet) — early enough to
        // teach the tells, faded before the Court's own heavies own it.
        { id: 'mazer_moth', weight: 2, presence: { to: 24, fadeOut: 10 } },
        { id: 'widdershin_wisp', weight: 1, presence: { from: 5, fadeIn: 3 } },
        { id: 'feeding_thrall', weight: 3, presence: { to: 18, fadeOut: 9 } },
        { id: 'vampire_thrall', weight: 2, presence: { from: 4, fadeIn: 2 } },
        { id: 'crimson_bat', weight: 2, presence: { to: 22, fadeOut: 10 } },
        { id: 'night_hunter', weight: 2, presence: { from: 7, fadeIn: 3 } },
        { id: 'pallbearer', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'blood_cardinal', weight: 1, presence: { from: 10, fadeIn: 4 } },
        { id: 'werewolf', weight: 2, presence: { from: 11, fadeIn: 5 } },
        { id: 'gloom_coach', weight: 1, presence: { from: 14 } },
        { id: 'dire_wolf', weight: 2, presence: { from: 4, fadeIn: 2 } },
        { id: 'moon_howler', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'grave_hag', weight: 1, presence: { from: 6, fadeIn: 3 } },
        { id: 'orb_weaver', weight: 1, presence: { from: 6, fadeIn: 3 } },
        { id: 'widow_matron', weight: 1, presence: { from: 12, fadeIn: 5 } },
        { id: 'poltergeist', weight: 1, presence: { from: 8, fadeIn: 4 } },
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

  // THE HALLOWFIELD (the Gloamwood country's rim): the harvest that no one
  // gathered. Feral crofts at the wood's edge — PARKLAND, not forest
  // (the weald's recipe in living wood): clustered gloam-oak stands with
  // jack-o'-lanterns glowing UNDER the canopies, open stubble between,
  // and the ground itself the ambush — pumpkin patches everywhere, and
  // some of the pumpkins were never pumpkins (patch_lurker), some of the
  // scarecrows were never furniture (scarecrow_watcher). Warm candle-amber
  // dots against the blue-grey gloam: the country's first face is the
  // friendly-shaped one, which is the trick.
  hallowfield: {
    id: 'hallowfield',
    depthAffinity: { to: 0.35, fadeOut: 0.3 },
    // PARKLAND (the weald's patchwork read, in living wood): discrete oak
    // stands — each one a sealed veil pocket with a lantern lit under it —
    // on open field studded with the harvest's furniture. Every mix a dial.
    forceLayout: 'parkland',
    layoutParams: {
      parklandGroves: [6, 9],
      parklandGroveR: [140, 240],
      parklandTrees: [{ kind: 'gloam_oak', weight: 1, radius: [36, 54] }],
      parklandHearts: [{ kind: 'gloam_oak', weight: 1, radius: [52, 64] }],
      // THE ASK, kept: a carved lantern glowing under better than half the
      // stand canopies — the stands read as kept shrines, not wild wood.
      parklandHeartExtra: { kind: 'jack_o_lantern', chance: 0.55, radius: [9, 12] },
      // Field furniture between the stands: the watch the crofts kept.
      // Counts stay modest — scarecrows and totems paint live (the karst
      // spire lesson); the patches are ground and cost nothing.
      parklandFloor: [
        { kind: 'scarecrow', weight: 3, radius: [12, 16] },
        { kind: 'hay_bale', weight: 2, radius: [12, 16] },
        { kind: 'lantern_totem', weight: 2, radius: [12, 16] },
        { kind: 'dead_tree', weight: 2, radius: [14, 22] },
        { kind: 'gourd_pile', weight: 2, radius: [12, 16] },
        { kind: 'wicker_effigy', weight: 1, radius: [22, 28] },
      ],
      parklandFloorN: [22, 36],
    },
    compositions: [
      { composition: 'carven_ring', chance: 0.4 },
      { composition: 'witchs_croft', chance: 0.45 },
    ],
    nameFirst: ['Hallowfield', 'Carven', 'Gourdlit', 'Reapwait', 'Latefallow', 'Cricklane', 'Wickfield', 'Strawmark', 'Allhollow', 'Emberwick', 'Furrowend', 'Tatterfield', 'Grinning', 'Harvestmoon'],
    nameSecond: ['Acres', 'Crofts', 'Furrows', 'Rows', 'Field', 'Fallow', 'Patch', 'Stubble', 'Commons', 'Plots', 'Reach', 'Verge'],
    theme: {
      // Dusk over stubble: a shade lighter than the heart wood — the gloam
      // arriving, not yet arrived — and every warm dot is a carved grin.
      dayLight: 0.6,
      nightDark: 0.84,
      heat: 0.35,
      fog: { banks: [1, 3], kinds: [{ id: 'gloam_shroud', weight: 2 }, { id: 'grave_mist' }] },
      ground: {
        // Harvest umber folded into the gloam greens: leaf-rot and cut
        // stubble; the clearing lift reads as field, never sun.
        palette: ['#12140e', '#1a1c12', '#242416', '#2e2c1a', '#3c3823', '#54482c'],
        bias: 0.44, alpha: 0.5, strength: 1.05,
        clearing: { reach: 150, lift: 0.24 },
      },
      ambientFx: [{ kind: 'motes', color: '#b0a890', intensity: 0.7 }],
      floor: '#0e100a', grid: '#151a10', border: '#2e3a28',
      obstacle: '#333d28', obstacleEdge: '#55663f', accent: '#ffb44a',
      mud: '#1c2014', chasm: '#050704', water: '#16303a', wall: '#3a3226',
      tree: '#2e3a2c', grass: '#44502e',
      road: '#4a4030',
    },
    sizeW: [2800, 3800], sizeH: [2000, 2800], ellipseChance: 0.2, biome: 'gloamwood',
    // Field furniture pooling into whatever the stands leave open: patch
    // ranks, fence lines, the processions of carved light.
    layout: [
      { kind: 'pumpkin_patch', count: [6, 10] },
      { kind: 'jack_o_lantern', count: [6, 12] },
      { kind: 'formation', count: [1, 2], formation: 'pumpkin_rows' },
      { kind: 'formation', count: [1, 2], formation: 'fence_line' },
      { kind: 'formation', count: [0, 1], formation: 'scarecrow_row' },
      { kind: 'formation', count: [0, 1], formation: 'lantern_procession' },
      { kind: 'log', count: [1, 3] }, { kind: 'stump', count: [2, 4] },
      { kind: 'rocks', count: [2, 5], radius: [16, 30] },
      { kind: 'river', count: [0, 1] },
      { kind: 'cave', count: [0, 1] },
      { kind: 'ruin', count: [0, 1] },
    ],
    common: [
      { kind: 'clearing', count: [1, 2], radius: [100, 160] },
      { kind: 'gourd_pile', count: [1, 3] },
      { kind: 'bone_pile', count: [0, 2] },
      { kind: 'briarwood', count: [1, 2] },
      { kind: 'formation', count: [0, 1], formation: 'herbalists_croft' },
    ],
    variants: [
      // The carved acres: patch country proper — ranks on ranks, and the
      // lanterns thick enough to read the rows by.
      { name: 'the carved acres', layout: [
        { kind: 'formation', count: [2, 3], formation: 'pumpkin_rows' },
        { kind: 'pumpkin_patch', count: [4, 8] },
        { kind: 'jack_o_lantern', count: [4, 8] },
        { kind: 'formation', count: [0, 1], formation: 'fence_line' },
        { kind: 'gourd_pile', count: [1, 3] },
      ] },
      // Crow country: the watch rows — crosses pacing the furrow lines,
      // and not all of them furniture.
      { name: 'crow country', layout: [
        { kind: 'formation', count: [1, 2], formation: 'scarecrow_row' },
        { kind: 'scarecrow', count: [2, 4] },
        { kind: 'hay_bale', count: [2, 4] },
        { kind: 'formation', count: [1, 2], formation: 'fence_line' },
        { kind: 'dead_tree', count: [2, 4] },
      ] },
      // The bonfire rows: the Court's festival ground — totems marching,
      // the wicker patrons standing over the walk.
      { name: 'the bonfire rows', layout: [
        { kind: 'formation', count: [1, 2], formation: 'lantern_procession' },
        { kind: 'lantern_totem', count: [2, 4] },
        { kind: 'wicker_effigy', count: [1, 2] },
        { kind: 'jack_o_lantern', count: [3, 6] },
        { kind: 'rocks', count: [2, 4], radius: [16, 28] },
      ] },
    ],
    packs: {
      count: [5, 8], size: [3, 5],
      // The Carven Court holds its own rows — and the wood's crows, the
      // marsh-lights, and the Night Court's foragers all cross them, which
      // is a brawl (carven|nightkin and carven|undead run hostile).
      table: [
        { id: 'gourdling', weight: 4, presence: { to: 14, fadeOut: 7 } },
        { id: 'patch_lurker', weight: 3 },
        { id: 'scarecrow_watcher', weight: 3 },
        { id: 'carrion_crow', weight: 2, presence: { to: 18, fadeOut: 9 } },
        { id: 'will_o_wisp', weight: 1, presence: { to: 12, fadeOut: 6 } },
        { id: 'lantern_sower', weight: 2, presence: { from: 4, fadeIn: 2 } },
        { id: 'harvest_effigy', weight: 1, presence: { from: 7, fadeIn: 3 } },
        { id: 'feeding_thrall', weight: 1, presence: { from: 5, fadeIn: 3 } },
        { id: 'night_hunter', weight: 1, presence: { from: 9, fadeIn: 4 } },
        { id: 'carven_king', weight: 1, presence: { from: 13, fadeIn: 5 } },
      ],
    },
    // Old graves under new furrows (never rolled: no 'spawners' objective
    // here — the field's threats are the field's).
    spawnerId: 'bone_altar',
    objectives: [
      { kind: 'clear', weight: 3 },
      { kind: 'bounty', weight: 2 },
      { kind: 'escape', weight: 2 },
      { kind: 'beacon', weight: 1 },
      { kind: 'waves', weight: 1 },
    ],
    structures: [
      { structure: 'hay_barn', chance: 0.3 },
      { structure: 'garden_gazebo', chance: 0.12 },
    ],
  },

  // THE MOURNSTEAD (the Gloamwood country's deep face): the estate at the
  // wood's heart. The deep dark presses in on grounds somebody once kept —
  // iron boundaries and topiary walks losing to the trees, gas lamps still
  // lit on lanes that go nowhere now, the family plot with its pale sealed
  // door (the mausoleum mints an OSSUARY below), and the MANOR itself:
  // walk in the front door, cross the sheeted rooms, find the grand stair —
  // the house is bigger inside than the map (manor_stair mints the floors).
  mournstead: {
    id: 'mournstead',
    depthAffinity: { from: 0.5, fadeIn: 0.3 },
    compositions: [
      { composition: 'manor_grounds', chance: 0.55 },
      { composition: 'family_plot', chance: 0.5 },
      { composition: 'hangmans_hill', chance: 0.15 },
    ],
    nameFirst: ['Mournstead', 'Widowsworth', 'Blackbanner', 'Gravenholm', 'Ashenhall', 'Vigilkeep', 'Lachrymere', 'Sablecourt', 'Dimhallow', 'Palewick', 'Sorrowseat', 'Duskmanor'],
    nameSecond: ['Estate', 'Grounds', 'Parish', 'Demesne', 'Walk', 'Garden', 'Seat', 'Holding', 'Acre', 'Vigil', 'Rest', 'Keep'],
    theme: {
      // Colder and dimmer than the heart wood: wrought iron, wet slate,
      // moss on marble — the gloam with a pedigree.
      dayLight: 0.5,
      nightDark: 0.88,
      heat: 0.3,
      fog: { banks: [2, 4], kinds: [{ id: 'grave_mist', weight: 2 }, { id: 'gloam_shroud' }, { id: 'river_mist' }] },
      ground: {
        palette: ['#0e1012', '#141618', '#1b1e1f', '#232826', '#2e3430', '#454e44'],
        bias: 0.46, alpha: 0.5, strength: 1.05,
        clearing: { reach: 150, lift: 0.2 },
      },
      ambientFx: [{ kind: 'motes', color: '#98a8b8', intensity: 0.8 }],
      floor: '#0b0d0e', grid: '#121618', border: '#2c3a3a',
      obstacle: '#2c343a', obstacleEdge: '#4a5a5e', accent: '#9fb8c8',
      mud: '#181c1a', chasm: '#040606', water: '#122830', wall: '#3a3630',
      tree: '#28332e', grass: '#38443c',
      road: '#3c3830',
    },
    sizeW: [2400, 3400], sizeH: [1800, 2500], ellipseChance: 0.2, biome: 'gloamwood',
    // The estate's furniture, pooling under the deep wood's roof (the
    // forest recipe rides the biome's own tree mix; clearings run larger
    // here — grounds want lawns).
    layoutParams: {
      forestClearings: [3, 6],
      forestCoverDeep: 0.85,
    },
    layout: [
      { kind: 'dead_tree', count: [3, 6] },
      { kind: 'log', count: [1, 3] }, { kind: 'stump', count: [2, 4] },
      { kind: 'web', count: [2, 4] },
      { kind: 'tombstone', count: [4, 8] },
      { kind: 'weathered_statue', count: [1, 2] },
      { kind: 'lantern_post', count: [1, 3] },
      { kind: 'formation', count: [0, 1], formation: 'iron_boundary' },
      { kind: 'formation', count: [0, 1], formation: 'topiary_walk' },
      { kind: 'rocks', count: [2, 5], radius: [16, 30] },
      { kind: 'river', count: [0, 1] },
      { kind: 'cave', count: [0, 1] },
      { kind: 'ruin', count: [0, 2] },
    ],
    common: [
      { kind: 'clearing', count: [1, 2], radius: [110, 170] },
      { kind: 'jack_o_lantern', count: [0, 2] },
      { kind: 'burial_urn', count: [1, 3] },
      { kind: 'bone_pile', count: [1, 3] },
      { kind: 'briarwood', count: [1, 2] },
      { kind: 'drained_husk', count: [0, 2] },
      { kind: 'formation', count: [0, 1], formation: 'night_feast' },
    ],
    variants: [
      // The lord's wood: the walked lanes — lamps and statuary holding a
      // line the trees stopped honoring.
      { name: "the lord's wood", layout: [
        { kind: 'formation', count: [1, 2], formation: 'topiary_walk' },
        { kind: 'lantern_post', count: [2, 4] },
        { kind: 'weathered_statue', count: [2, 3] },
        { kind: 'dead_tree', count: [3, 5] },
        { kind: 'dead_topiary', count: [2, 4] },
      ] },
      // The drowned garden: the water feature won. Statues to their knees,
      // the fountain still working at nothing.
      { name: 'the drowned garden', layout: [
        { kind: 'river', count: [1, 1] },
        { kind: 'fountain', count: [1, 1] },
        { kind: 'dead_topiary', count: [3, 5] },
        { kind: 'weathered_statue', count: [2, 3] },
        { kind: 'web', count: [1, 3] },
      ] },
      // The kept rows: the parish buried right — stones in ranks behind
      // iron, an obelisk for whoever paid for one.
      { name: 'the kept rows', layout: [
        { kind: 'formation', count: [2, 3], formation: 'gravestone_rows' },
        { kind: 'tombstone', count: [8, 14] },
        { kind: 'formation', count: [1, 2], formation: 'iron_boundary' },
        { kind: 'black_obelisk', count: [0, 1] },
        { kind: 'dead_tree', count: [2, 4] },
      ] },
    ],
    packs: {
      count: [5, 8], size: [3, 5],
      // The household and its keepers: the estate dead walk the grounds,
      // the Night Court keeps its old visiting rights, and Carven raiders
      // cross the fence line after dark (hostile — the brawl is scenery).
      table: [
        { id: 'gloomling', weight: 3, presence: { to: 16, fadeOut: 8 } },
        { id: 'sheeted_haunt', weight: 2 },
        { id: 'zombie', weight: 2, presence: { to: 14, fadeOut: 7 } },
        { id: 'poltergeist', weight: 2, presence: { from: 4, fadeIn: 2 } },
        { id: 'hollow_butler', weight: 1, presence: { from: 5, fadeIn: 2 } },
        { id: 'will_o_wisp', weight: 1, presence: { to: 12, fadeOut: 6 } },
        { id: 'grave_hag', weight: 1, presence: { from: 6, fadeIn: 3 } },
        { id: 'banshee', weight: 1, presence: { from: 10, fadeIn: 5 } },
        { id: 'barrow_wight', weight: 1, presence: { from: 9, fadeIn: 4 } },
        { id: 'scarecrow_watcher', weight: 1, presence: { from: 6, fadeIn: 3 } },
        { id: 'vampire_thrall', weight: 1, presence: { from: 5, fadeIn: 2 } },
        { id: 'pallbearer', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'dusk_rider', weight: 1, presence: { from: 12, fadeIn: 6 } },
        { id: 'gloom_coach', weight: 1, presence: { from: 14 } },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [
      { kind: 'offering', weight: 1 },
      { kind: 'procession', weight: 1 },
      { kind: 'clear', weight: 3 },
      { kind: 'escape', weight: 2 },
      { kind: 'spawners', weight: 1 },
      { kind: 'bounty', weight: 1 },
    ],
    structures: [
      { structure: 'chapel', chance: 0.3 },
      { structure: 'cottage', chance: 0.3 },
      { structure: 'garden_gazebo', chance: 0.35 },
      { structure: 'pillaged_township', chance: 0.1 },
    ],
  },

  // THE GLOAM MANOR (interior, the haunted house's rooms): the face the
  // manor's minted floors wear (data/sidezones.ts borrows theme + packs at
  // mint — ONE source of truth), and a cave-scale identity in its own right
  // for the QA sweeps and any future door. Clarity doctrine indoors: dark
  // parquet, pale sheeted masses, candle anchors — the room reads before
  // the room moves.
  gloam_manor: {
    id: 'gloam_manor',
    frontier: false, perfProbe: true,
    sky: 'sheltered', // rooms — no storm reaches a made bed
    nameFirst: ['Gloam', 'Widowed', 'Shuttered', 'Sable', 'Lachrym', 'Dimlit'],
    nameSecond: ['Manor', 'Rooms', 'Wing', 'Hall', 'Gallery', 'Parlors'],
    theme: {
      ambientDark: 0.32,
      heat: 0.4,
      ground: {
        // Parquet and dust: warm browns under candle-fall.
        palette: ['#1c1712', '#241d16', '#2c241a', '#342a1e', '#3e3222'],
        bias: 0.5, alpha: 0.5, speckles: 0.6,
      },
      ambientFx: [{ kind: 'motes', color: '#b8a888', intensity: 0.5 }],
      floor: '#161210', grid: '#221c14', border: '#4a3a2c',
      obstacle: '#3e3226', obstacleEdge: '#5e4a36', accent: '#ffc860',
      wall: '#4a3a2c',
      tree: '#3a3226',
    },
    sizeW: [1150, 1500], sizeH: [880, 1150], biome: 'manor',
    layout: [
      { kind: 'dust_sheet', count: [3, 6] },
      { kind: 'candelabra', count: [2, 5] },
      { kind: 'web', count: [2, 4] },
      { kind: 'standing_portrait', count: [1, 3] },
      { kind: 'manor_mirror', count: [1, 2] },
      { kind: 'bone_pile', count: [0, 2] },
    ],
    variants: [
      // The shut rooms: the wing they closed first — everything sheeted,
      // everything webbed, and the sheets are why you knock first.
      { name: 'the shut rooms', layout: [
        { kind: 'dust_sheet', count: [5, 8] },
        { kind: 'web', count: [3, 5] },
        { kind: 'candelabra', count: [1, 3] },
      ] },
      // The long gallery: the family, framed, watching the corridor.
      { name: 'the long gallery', layout: [
        { kind: 'standing_portrait', count: [4, 7] },
        { kind: 'candelabra', count: [3, 6] },
        { kind: 'manor_mirror', count: [2, 3] },
      ] },
    ],
    packs: {
      count: [4, 6], size: [2, 4],
      table: [
        { id: 'sheeted_haunt', weight: 3 },
        { id: 'gloomling', weight: 2 },
        { id: 'poltergeist', weight: 2 },
        { id: 'will_o_wisp', weight: 1, presence: { to: 10, fadeOut: 5 } },
        { id: 'hollow_butler', weight: 1, presence: { from: 4, fadeIn: 2 } },
        { id: 'banshee', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'barrow_wight', weight: 1, presence: { from: 9, fadeIn: 4 } },
      ],
    },
    // Cave-scale mints (the QA sweep, any future door) carve real rooms:
    // the interior generators' walls in the house's own timber.
    caveLayouts: { rooms: 2, dungeon: 1 },
    layoutParams: {
      floorStyle: 'boards',
      rooms: [5, 9], doorChance: 0.6,
    },
    // Something under the floorboards, should a mint ever ask (never rolled:
    // no 'spawners' objective in the house).
    spawnerId: 'bone_altar',
    objectives: [
      { kind: 'clear', weight: 3 },
      { kind: 'escape', weight: 1 },
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
        // The Winter Court keeps its wooded march: hounds course the dark
        // stands, the ES-glass dead walk between the trunks, the antlered
        // shaman lays real ice. The giant is a HARD 13 gate (no fadeIn —
        // the wall is never met early).
        { id: 'rime_hound', weight: 2, presence: { to: 18, fadeOut: 8 } },
        { id: 'hoarfrost_wight', weight: 1, presence: { from: 6, fadeIn: 3 } },
        { id: 'glacier_shaman', weight: 1, presence: { from: 9, fadeIn: 4 } },
        { id: 'frost_giant', weight: 1, presence: { from: 13 } },
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
      // Glacial chasms are MOUTHS (the pitfall fabric): fall past a lip and
      // the ice hollows beneath the tundra catch you, one stratum down.
      pitfall: { kind: 'descend' },
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
        // The Winter Court walks its high seat: hound outriders early, the
        // court's true tiers on ramps, and the giant behind a HARD 12 gate
        // (no fadeIn — the shield-wall is a mid-game fact, never a level-3
        // ambush). The King himself NEVER scatters — crown machinery only.
        { id: 'rime_hound', weight: 2, presence: { to: 16, fadeOut: 8 } },
        { id: 'hoarfrost_wight', weight: 2, presence: { from: 5, fadeIn: 3 } },
        { id: 'glacier_shaman', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'winter_herald', weight: 1, presence: { from: 10, fadeIn: 4 } },
        { id: 'frost_giant', weight: 1, presence: { from: 12 } },
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
      // The dynasty interred deeper than the villages ever built — its own
      // biomeDepth gate (0.45) stands most rim mints down anyway.
      { composition: 'sepulcher_site', chance: 0.14 },
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
        // A hive forager strays this far out where the warrens run shallow.
        { id: 'chitin_drone', weight: 1, presence: { from: 8, fadeIn: 4 } },
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
      // The erg heart is the dynasty's own acreage: most descents open here.
      { composition: 'sepulcher_site', chance: 0.24 },
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
        // The Seethe's foragers range the open erg (the fourth face is near).
        { id: 'chitin_drone', weight: 1, presence: { from: 6, fadeIn: 3 } },
        { id: 'chitin_lancer', weight: 1, presence: { from: 8, fadeIn: 4 } },
        // A murmuration crossing the open erg — the flock ranges far past
        // the warren (packSize fields the whole wheel when this rolls).
        { id: 'chitin_skimmer', weight: 1, presence: { from: 7, fadeIn: 3 } },
        // A wrapped soldier far off its post: the erg is riddled with broken
        // tombs, and the dynasty's patrols wander out of them (HARD floor —
        // the family discipline: nothing this old arrives gradually).
        { id: 'sarcophate_legionary', weight: 1, presence: { from: 7 } },
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
      // Glass preserves better than sand: the pan keeps its tomb doors.
      { composition: 'sepulcher_site', chance: 0.16 },
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
        // Glass preserves what sand merely buries: a tomb patrol on the pan
        // (HARD floor — the Sarcophate never arrives gradually).
        { id: 'sarcophate_legionary', weight: 1, presence: { from: 8 } },
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

  // HIVESANDS — the SEETHE: the desert's fourth face, the warren-country
  // under the deep sand. Waxed spires for a skyline, clutches for scrub,
  // and the ground itself pocked with brood throats — the pockets are the
  // point (hive_pocket courts, hive_sink pits, spawner-node floods). Smash
  // the sources or wade the seethe forever.
  hivesands: {
    id: 'hivesands',
    depthAffinity: { from: 0.35, fadeIn: 0.3, mul: 0.85 },
    compositions: [
      { composition: 'hive_pocket', chance: 0.5 },
      { composition: 'caravan_graveyard', chance: 0.15 },
    ],
    layoutParams: {
      duneGap: [440, 640], duneCrestW: [18, 28], dunePans: [2, 4],
      duneCombEvery: 130,
    },
    variants: [
      // The warren's crown country: spire clusters, the seeps between.
      { name: 'seething warren', layout: [
        { kind: 'hive_spire', count: [4, 7] }, { kind: 'egg_clutch', count: [4, 7] },
        { kind: 'resin_node', count: [3, 5] }, { kind: 'rocks', count: [2, 4], radius: [20, 40] },
        { kind: 'heat_shimmer', count: [2, 4] }, { kind: 'cave', count: [0, 2] },
        { kind: 'formation', count: [1, 2], formation: 'resin_seep' },
      ] },
      // Brood ground: clutch fields under a few old towers.
      { name: 'brood ground', layout: [
        { kind: 'hive_spire', count: [2, 4] }, { kind: 'egg_clutch', count: [6, 10] },
        { kind: 'brood_husk', count: [3, 6] }, { kind: 'bone_pile', count: [2, 4] },
        { kind: 'heat_shimmer', count: [2, 4] },
        { kind: 'structure', count: [0, 1], structure: 'faction_war_camp' },
      ] },
      // Husk flats: the molt-fields — the seethe passed this way, and left.
      { name: 'husk flats', layout: [
        { kind: 'brood_husk', count: [6, 10] }, { kind: 'bone_pile', count: [3, 5] },
        { kind: 'rocks', count: [2, 4], radius: [18, 38] }, { kind: 'cactus', count: [0, 2] },
        { kind: 'heat_shimmer', count: [3, 5] }, { kind: 'fulgurite', count: [0, 2] },
      ] },
      // Roost fields: THE MURMURATION's country — mast-stands where the
      // flock settles at rest, molt-husks drifted around their feet. Look
      // up: the sky here is usually already moving.
      { name: 'roost fields', layout: [
        { kind: 'roost_mast', count: [3, 5] }, { kind: 'brood_husk', count: [4, 7] },
        { kind: 'egg_clutch', count: [2, 4] }, { kind: 'rocks', count: [2, 4], radius: [18, 38] },
        { kind: 'heat_shimmer', count: [2, 4] },
        { kind: 'formation', count: [1, 2], formation: 'murmuration_roost' },
      ] },
    ],
    nameFirst: ['Seething', 'Burrowed', 'Thrumming', 'Chittering', 'Brood-Warm', 'Wax-Sealed', 'Resin-Weeping', 'Carapace', 'Hollow-Sung', 'Humming', 'Chitin-Choked', 'Ten-Thousand'],
    nameSecond: ['Warrens', 'Seethe', 'Nests', 'Combs', 'Broodlands', 'Mounds', 'Cradle', 'Undersand', 'Hollows', 'Ground'],
    theme: {
      dayLight: 1.5,
      heat: 0.95,
      swelter: 0.8,
      ambientFx: [{ kind: 'heatHaze', intensity: 0.7 }, { kind: 'sandDrift', intensity: 0.4 }],
      // Trodden rust-sand: darker and less wind-combed than the open erg —
      // ten thousand feet pack a floor (short stretch, heavier grain).
      ground: {
        scale: 2.4, stretchX: 1.6, strength: 1.2, speckles: 0.5,
        palette: ['#241a10', '#3a2a16', '#523a1e', '#6a4c26', '#7e5c30'], bias: 0.52, alpha: 0.55,
      },
      floor: '#1a140c', grid: '#2a2014', border: '#7a5c34',
      obstacle: '#5c3e22', obstacleEdge: '#8a6238', accent: '#e8a84a',
      mud: '#6a5630', water: '#2a6a7a', sand: '#c9a26a',
    },
    sizeW: [3400, 4400], sizeH: [2400, 3200], ellipseChance: 0.12, biome: 'desert',
    layout: [
      { kind: 'hive_spire', count: [3, 5] },
      { kind: 'egg_clutch', count: [3, 6] },
      { kind: 'resin_node', count: [2, 4] },
      { kind: 'brood_husk', count: [2, 4] },
      { kind: 'sand', count: [3, 5] },
      { kind: 'rocks', count: [3, 6], radius: [20, 44] },
      { kind: 'cactus', count: [0, 2] },
      { kind: 'heat_shimmer', count: [2, 4] },
      { kind: 'cave', count: [0, 2] },
      { kind: 'structure', count: [0, 1], structure: 'faction_war_camp' },
    ],
    // What the warren-country always IS: desert bones under hive breath.
    common: [
      { kind: 'formation', count: [0, 1], formation: 'dune_ridges' },
      { kind: 'formation', count: [0, 1], formation: 'resin_seep' },
      { kind: 'bone_pile', count: [1, 3] },
      { kind: 'heat_shimmer', count: [0, 2], where: { field: 'climate', params: { axis: 'temperature' }, min: 0.55 } },
    ],
    landmarks: [
      // The warren's open throats — and the desert's old holes beneath them.
      { landmark: 'hive_sink', chance: 0.4 },
      { landmark: 'maggot_burrow', chance: 0.1 },
      { landmark: 'sinkhole', chance: 0.12 },
      { landmark: 'canyon', chance: 0.1 },
    ],
    packs: {
      count: [7, 9], size: [3, 6],
      // The seethe travels as WEATHER: big swarm musters, the odd lone
      // forager between them.
      archetypes: [
        { weight: 4, size: [6, 10] }, { weight: 4, size: [3, 5] }, { weight: 2, size: [1, 2] },
      ],
      table: [
        { id: 'chitin_drone', weight: 4 },
        { id: 'chitin_lancer', weight: 2, presence: { from: 3, fadeIn: 2 } },
        { id: 'chitin_spitter', weight: 2, presence: { from: 5, fadeIn: 3 } },
        { id: 'chitin_burrower', weight: 1, presence: { from: 7, fadeIn: 4 } },
        { id: 'chitin_broodtender', weight: 1, presence: { from: 9, fadeIn: 4 } },
        // THE MURMURATION — the resident sky (packSize on the defs fields
        // the skimmer as a true flock; the singer binds it, the saltant is
        // the crater in it). Def-level hard floors back these ramps.
        { id: 'chitin_skimmer', weight: 2, presence: { from: 4, fadeIn: 2 } },
        { id: 'chitin_saltant', weight: 1, presence: { from: 6, fadeIn: 3 } },
        { id: 'chitin_stridulant', weight: 1, presence: { from: 8, fadeIn: 3 } },
        // (No sovereign in the daily scatter: the queen holds her throne —
        // meet her at the warlord capital or in the deep war musters.)
        // The desert's other tenants dispute the ground (the turf war's
        // texture): packs raid the rim, the Court walks in like it owns it.
        { id: 'bronze_scarab', weight: 1, presence: { from: 6, fadeIn: 3 } },
        { id: 'sand_wyrm', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'giant_maggot', weight: 1, presence: { to: 12, fadeOut: 6 } },
        { id: 'gnoll_prowler', weight: 1, presence: { to: 10, fadeOut: 5 } },
        { id: 'salt_husk', weight: 1, presence: { from: 8, fadeIn: 4 } },
      ],
    },
    spawnerId: 'hive_node',
    objectives: [
      { kind: 'spawners', weight: 4 },
      { kind: 'clear', weight: 2 },
      { kind: 'bounty', weight: 1 },
      { kind: 'escape', weight: 1 },
      { kind: 'beacon', weight: 1 },
      { kind: 'circuit', weight: 1 },
      { kind: 'waves', weight: 1 },
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

  // SEPULCHER SANDS — the tomb-dynasty's country under the deep desert, and
  // THE FIRST CONSUMER OF THE BLEND FABRIC: every pocket is dune-country
  // washing into bone-country in ONE zone. The tileset's own kit is the
  // desert-tomb end (drifted sand, sun-dried masonry); the OSSUARY tileset
  // arrives as the blend partner — its bone furniture, charnel formations,
  // pale palette and graveland dead all fold in along the weight field, so
  // nothing of the bone kit is duplicated here. Each face rolls its own
  // blend GEOMETRY: the base ramp deepens away from the way home, drifts
  // tessellate, the procession draws a hard front line. Heavily garrisoned
  // by the Sarcophate (the packs' native tally); reached only through the
  // sepulcher_gate sidezone — never the frontier, never the cave pool.
  sepulcher_sands: {
    id: 'sepulcher_sands',
    frontier: false, perfProbe: true,
    sky: 'sheltered', // a tomb keeps its own weather — no swelter reaches down here
    // Dune-country → bone-country, deepening away from the south way home
    // (pockets exit s; axisY reads 0 at the deep north wall, so invert).
    blend: {
      with: 'ossuary',
      field: { kind: 'axisY', params: { from: 0.12, to: 0.88 }, invert: true },
      packs: 0.3, // the graveland cousins co-garrison the bone end (allies)
    },
    caveLayouts: { dungeon: 2, plains: 1.5, labyrinth: 1 },
    layoutParams: {
      interiorWall: 'sunkstone_wall', floorStyle: 'flagstone',
      rooms: [6, 10], doorChance: 0.6, corridorCells: 2,
    },
    // A dynasty inters its secrets: walled stores and processional bypasses.
    hollows: {
      count: [1, 2],
      table: { cache_hollow: 3, ambush_hollow: 1.5, passage_hollow: 2 },
    },
    nameFirst: ['Sepulcher', 'Interred', 'Dune-Sealed', 'Gilded', 'Dynastic', 'Sandlocked', 'Old-Dynasty', 'Wrapped', 'Provisioned', 'Sun-Denied'],
    nameSecond: ['Sands', 'Vaults', 'Galleries', 'Processional', 'Antechambers', 'Reliquary', 'Tomb-Halls', 'Interments', 'Underhalls', 'Court'],
    theme: {
      ground: {
        // The DESERT-TOMB end of the gradient (the ossuary's pale bone
        // palette arrives via the blend): warm buried sandstone.
        palette: ['#1f1810', '#2e2414', '#40321a', '#554422', '#6a5630'],
        bias: 0.54, alpha: 0.55, speckles: 0.6,
      },
      ambientDark: 0.34,
      ambientFx: [{ kind: 'motes', intensity: 0.4 }],
      // The bone end breathes its own air: an occasional grave-mist bank
      // (the fog fabric roams it zone-wide; the blend owns the FLOOR).
      fog: { banks: [0, 1], kinds: [{ id: 'grave_mist' }] },
      floor: '#181206', grid: '#221a0c', border: '#6a583a',
      obstacle: '#5a4826', obstacleEdge: '#8a7040', accent: '#e8c060',
      wall: '#3e3220', sand: '#c9a86a', water: '#2a5a6a', mud: '#241c10', chasm: '#080604',
    },
    sizeW: [1250, 1650], sizeH: [950, 1250], biome: 'sepulcher',
    // The desert-tomb kit (the 'base' blend side — the ossuary brings the
    // bones): drifted sand, dry-village masonry, provisions for the dead.
    common: [
      { kind: 'sand', count: [2, 4] },
      { kind: 'rubble', count: [2, 4] },
      { kind: 'clay_pots', count: [1, 3] },
      { kind: 'burial_urn', count: [2, 4] },
      { kind: 'brazier', count: [1, 3] },
      { kind: 'secret_wall', count: [1, 2] },
    ],
    layout: [
      { kind: 'broken_column', count: [2, 4] },
      { kind: 'ruin_plinth', count: [1, 3] },
      { kind: 'rocks', count: [2, 4], radius: [14, 30] },
    ],
    variants: [
      // Drifts of bone-country THROUGH the dunes: the pockets tessellation.
      { name: 'bone drifts', layout: [
        { kind: 'sand', count: [2, 4] },
        { kind: 'dune_crest', count: [2, 4] },
        { kind: 'broken_column', count: [1, 3] },
        { kind: 'rocks', count: [2, 4], radius: [14, 30] },
      ], blend: {
        with: 'ossuary',
        field: { kind: 'pockets', params: { span: 300, coverage: 0.45 } },
        packs: 0.3,
      } },
      // The PROCESSIONAL: a hard front line mid-zone — sandstone right up to
      // the threshold, then the dynasty's pale halls (band sharpens the ramp).
      { name: 'processional deep', layout: [
        { kind: 'broken_column', count: [3, 5] },
        { kind: 'ruin_plinth', count: [2, 4] },
        { kind: 'brazier', count: [1, 2] },
        // The dynasty's own furniture claims the bone end by name (the
        // 'blend' WHERE field — an authored set-piece, not scatter luck).
        { kind: 'formation', count: [1, 2], formation: 'reliquary_rows',
          where: { field: 'blend', min: 0.6 }, blend: 'any' },
      ], blend: {
        with: 'ossuary',
        field: { kind: 'axisY', params: { from: 0.2, to: 0.8 }, band: [0.35, 0.65], invert: true },
        packs: 0.35,
      } },
      // Sand-choked: the desert is WINNING — bone country survives as lobes.
      { name: 'sand-choked reliquary', layout: [
        { kind: 'sand', count: [3, 6] },
        { kind: 'dune_crest', count: [1, 3] },
        { kind: 'clay_pots', count: [2, 4] },
        { kind: 'rocks', count: [2, 4], radius: [14, 30] },
      ], blend: {
        with: 'ossuary',
        field: { kind: 'noise', params: { scale: 480, coverage: 0.32 } },
        packs: 0.2,
      } },
    ],
    packs: {
      count: [5, 7], size: [3, 5],
      archetypes: [
        { weight: 2, size: [6, 10] }, { weight: 5, size: [3, 5] }, { weight: 2, size: [1, 2] },
      ],
      // The Sarcophate garrison (the native tally) + the vaults' own vermin;
      // the blend folds the ossuary's graveland dead in at the bone end's
      // share. The husk is deliberately ABSENT — it only ever steps out of a
      // cracked case. HARD floors on the deep court, per the family law.
      table: [
        { id: 'tomb_scarab', weight: 4 },
        { id: 'sarcophate_legionary', weight: 4 },
        { id: 'canopic_bearer', weight: 2, presence: { from: 6 } },
        { id: 'sarcophagus_warden', weight: 1, presence: { from: 9 } },
        { id: 'bronze_scarab', weight: 2 },
        { id: 'sand_skitterer', weight: 2, presence: { to: 12, fadeOut: 5 } },
        { id: 'giant_maggot', weight: 1, presence: { to: 14, fadeOut: 6 } },
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
      // THE GORE STAKES (the grab fabric's terrain payoff, data/tracks.ts):
      // the grip kin's sharpened rows ride every face of the green.
      { kind: 'gore_stakes', count: [0, 2], radius: [16, 22] },
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
        // THE GRIP KIN tour the green (the grab fabric): the yoke-mauler
        // pins and drums the Takedown measure; the bloom waits to be fed.
        { id: 'yoke_mauler', weight: 2, presence: { from: 7, fadeIn: 3 } },
        { id: 'gaff_wrangler', weight: 1, presence: { from: 5, fadeIn: 3 } },
        { id: 'maw_bloom', weight: 1, presence: { from: 5, fadeIn: 3 } },
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
      // THE TRAPWORKS (engine/trapworks.ts + the interiorGen trap pass):
      // what tells a sunken hall from a Durance cell — the Durance TORMENTS
      // (racks, cages, hate); the sunken city DEFENDS. Every face fields
      // some of the old machines; the 'toothed halls' variant fields most.
      // Dials sit ABOVE naive intent on purpose: real corridor geometry
      // rejects hard (short legs, portal/door clearances), so authored
      // chance ≠ delivered count — the mint-path repro is the tuning truth.
      trapworks: {
        sawHalls: { chance: 0.7, max: 2 },
        dartWards: { chance: 0.65, max: 2 },
        boulderRuns: { chance: 0.55, max: 1 },
        falseFloors: { chance: 0.6, max: 2 },
        mincerRooms: { chance: 0.45, max: 1 },
      },
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
      // The MACHINES won: the face where the old defenses barely slept —
      // grooves scored into every hall, plinths for the mechanism hearts,
      // and the trap pass dialed to full (the Indiana-Jones face).
      { name: 'toothed halls', layout: [
        { kind: 'ruin_plinth', count: [1, 3] },
        { kind: 'rubble', count: [2, 4] },
        { kind: 'formation', count: [0, 1], formation: 'colossus_wreck' },
      ], layoutParams: {
        trapworks: {
          sawHalls: { chance: 0.9, max: 3 },
          dartWards: { chance: 0.8, max: 2 },
          boulderRuns: { chance: 0.7, max: 1 },
          falseFloors: { chance: 0.7, max: 2 },
          mincerRooms: { chance: 0.65, max: 1 },
        },
      } },
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
        // The city's OWN dead + its standing wardens (the Hollowborn went
        // home to the Durance — that spine is theirs; this crypt fields the
        // civilization that built the machines).
        { id: 'crypt_warden', weight: 1, presence: { from: 6, fadeIn: 3 } },
        { id: 'colossus_shard', weight: 1, presence: { from: 9, fadeIn: 4 } },
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
      // THE GORE STAKES (the grab fabric's terrain payoff, data/tracks.ts):
      // the wranglers' sharpened rows — walk through free, be THROWN
      // through and be shredded. Stand-sized (a needle disc would let a
      // fast body slip between contact samples).
      { kind: 'gore_stakes', count: [1, 3], radius: [16, 22] },
    ],
    packs: {
      count: [5, 7], size: [3, 5],
      table: [
        { id: 'zombie', weight: 3, presence: { to: 20, fadeOut: 10 } },
        { id: 'bone_serpent', weight: 3, presence: { from: 8, fadeIn: 4 } },
        { id: 'crypt_warden', weight: 2, presence: { from: 6, fadeIn: 3 } },
        { id: 'husk_swarmer', weight: 2, presence: { to: 18, fadeOut: 9 } },
        { id: 'fen_hound', weight: 2 },
        // THE GRIP KIN work the fen (the grab fabric's live tutorial):
        // the wrangler gaffs, the gulper swallows, the bloom waits.
        { id: 'gaff_wrangler', weight: 2, presence: { from: 4, fadeIn: 2 } },
        { id: 'gorge_gulper', weight: 2, presence: { from: 6, fadeIn: 3 } },
        { id: 'maw_bloom', weight: 1, presence: { from: 5, fadeIn: 3 } },
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
      // The waste's rents and chasms DROP (the pitfall fabric): the scoured
      // land is a roof over older dark.
      pitfall: { kind: 'descend' },
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
      // Hell's pits go DEEPER into hell (the pitfall fabric): an abyssal
      // rent is a mouth of the marches' own underdark.
      pitfall: { kind: 'descend' },
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
    docks: 1, // the classic harbor coast (PORT_MINT.fallbackBiome's one face)
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
        // Coilborn raiders beach their coracles where the sand runs quiet.
        { id: 'bog_strider', weight: 1, presence: { from: 5 } },
        { id: 'hooded_spitter', weight: 1, presence: { from: 7 } },
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
    variants: [
      // THE EMBERWIND — the smoulder-front demo face (the advancing front
      // fabric's wildfire debut): a lea gone to dry fuel — deep grass,
      // heavy brush, stacked hay and split wood — where a FIRE FRONT
      // breaks in on the wind every couple of minutes and marches, eating
      // the fuel rows and leaving ashfield + charred snags. The meadow's
      // exit roads are the FIREBREAKS (clearway 0): cross the gravel and
      // watch the blaze gutter at the verge.
      {
        name: 'emberwind',
        layout: [
          { kind: 'clearing', count: [1, 2], radius: [100, 170] },
          { kind: 'wayshrine', count: [0, 1] },
          { kind: 'flowers', count: [4, 8], where: { field: 'noise', max: 0.45, params: { scale: 420, seed: 11 } } },
          { kind: 'log', count: [0, 2] },
          { kind: 'grass', count: [9, 14] },
          { kind: 'trees', count: [7, 11] },
          { kind: 'grove', count: [2, 3] },
          { kind: 'brush', count: [6, 10] },
          { kind: 'hay_bale', count: [1, 3] },
          { kind: 'firewood_pile', count: [0, 2] },
          { kind: 'rocks', count: [3, 6], radius: [16, 32] },
          { kind: 'berry_bush', count: [1, 3] },
          { kind: 'water', count: [0, 1] },
          { kind: 'formation', count: [1, 2], formation: 'oak_hedgerow' },
          { kind: 'haven_stone', count: [0, 1] },
        ],
        theme: {
          creep: {
            pockets: [0, 0], kinds: [],
            fronts: [{ id: 'wildfire', line: [3, 4], waves: [80, 120], delay: [10, 18] }],
          },
        },
      },
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
    docks: 1, // an isle-region harbor lands on its own shore, not a foreign beach
    layout: [
      { kind: 'shallows', count: [7, 11] },
      { kind: 'sand', count: [4, 7] },
      { kind: 'palm', count: [8, 14] },
      { kind: 'rocks', count: [4, 7], radius: [18, 38] },
      // Water pours BEFORE the live flora (the ground-before convention):
      // kelp and coral carry habitat now — they bed into the shallows and
      // pools they can see, never the dry heart of the isle.
      { kind: 'water', count: [1, 2] },
      { kind: 'kelp', count: [3, 6] },
      { kind: 'coral', count: [2, 5], radius: [14, 26] },
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

  // --- THE LITTORAL COUNTRY (four faces, one biome tag) ----------------------
  // The mainland's tiered coast: four frontier faces share the 'littoral'
  // biome tag, staged by depthAffinity over biomeDepth — the STRAND holds
  // the walkable rim, the BRINE FLATS blister through the mid-band (the
  // drained seabed tying shore to Deep), the MANGROVE TANGLE floods the
  // inner country (the Coilborn's home water), and the DROWNED MARGIN is
  // the heart: ground already half inside the sea. TIGHT tiers by design
  // (biome spacing 56): the descent must register across a short walk.
  // The archipelago (beach/isle) keeps its own look untouched — this is
  // the coast you WALK into, and the wet ground taxes everyone but its
  // landlords (the Coilborn wade free; you don't).

  // STRAND — the walkable rim: dune-grass beach country, tide pools, the
  // wrack line, palms leaning over the surf. The gentlest face — and the
  // last dry footing the country offers.
  strand: {
    id: 'strand',
    depthAffinity: { to: 0.35, fadeOut: 0.25 },
    nameFirst: ['Longshore', 'Greybeach', 'Tidemark', 'Saltgrass', 'Windshell', 'Dunegrass', 'Palegull', 'Wrackline', 'Foamwhite', 'Lowwater', 'Shellsand', 'Marramgrown', 'Driftwood', 'Slackwater', 'Herongrey', 'Tern-Called'],
    nameSecond: ['Strand', 'Foreshore', 'Shore', 'Sands', 'Tideline', 'Reach', 'Spit', 'Beach', 'Flats', 'Margin', 'Bar', 'Shelf', 'Verge', 'Walk'],
    theme: {
      dayLight: 1.3,
      ground: {
        scale: 2.0, stretchX: 1.7, strength: 1.1, speckles: 0.55,
        palette: ['#2a2416', '#453a22', '#5f5230', '#7a6a40', '#948152'], bias: 0.58, alpha: 0.55,
        coast: { reach: 90, shift: -0.32, kinds: ['water', 'tide_pool'] },
      },
      floor: '#171408', grid: '#242012', border: '#7a7048',
      obstacle: '#5c5432', obstacleEdge: '#8a7c4e', accent: '#e8d888',
      sand: '#d8c890', water: '#1d6a8a', tree: '#3f6a3a', mud: '#5a5038',
      // Rarely, the sea decides: one spanning tidal wall crossing the whole
      // beach, announced, always parted by a clear weave-corridor. The
      // gentlest face keeps it a story, not a fixture (chance 0.22).
      creep: {
        pockets: [0, 0], kinds: [],
        fronts: [
          { id: 'tidalwall', line: 'span', bearing: 'cardinal', spacing: 1.15, chance: 0.22, delay: [40, 80], waves: [120, 200], announce: { text: 'the sea rises!', color: '#bfe8ef' } },
        ],
      },
    },
    sizeW: [2300, 3100], sizeH: [1550, 2150], ellipseChance: 0.25, biome: 'littoral',
    docks: 1, // the country's harbor face: firm ground, open water
    layout: [
      { kind: 'sand', count: [5, 8] },
      { kind: 'shallows', count: [2, 4] },
      { kind: 'water', count: [1, 2] },
      { kind: 'tide_pool', count: [2, 4] },
      { kind: 'palm', count: [4, 7] },
      { kind: 'reeds', count: [2, 4] },
      { kind: 'log', count: [1, 3] },
      { kind: 'kelp', count: [1, 3] },
      { kind: 'rocks', count: [3, 6], radius: [16, 36] },
      { kind: 'sea_rock', count: [1, 3] },
      { kind: 'fishing_rack', count: [0, 1] },
      { kind: 'cave', count: [0, 1] },
    ],
    // What every strand IS: the tide's ledger written along the shore.
    common: [
      { kind: 'kelp_wrack', count: [2, 4],
        where: { field: 'shore', max: 0.5, params: { kinds: ['water', 'tide_pool'], reach: 170 } } },
      { kind: 'formation', count: [1, 2], formation: 'wrack_line',
        where: { field: 'shore', max: 0.5, params: { kinds: ['water'], reach: 190 } } },
      { kind: 'formation', count: [0, 1], formation: 'palm_strand',
        where: { field: 'shore', max: 0.5, params: { kinds: ['water'], reach: 180 } } },
    ],
    variants: [
      // The dune-backed face: marram ridges marching inland from the surf.
      { name: 'dune-backed', layout: [
        { kind: 'sand', count: [6, 9] }, { kind: 'grass', count: [2, 4] },
        { kind: 'tide_pool', count: [1, 3] }, { kind: 'palm', count: [3, 5] },
        { kind: 'reeds', count: [2, 4] }, { kind: 'rocks', count: [3, 5], radius: [16, 34] },
        { kind: 'formation', count: [1, 2], formation: 'dune_ridges',
          where: { field: 'radial', min: 0.45 } },
        { kind: 'cave', count: [0, 1] },
      ] },
      // The wrecker's coast: what the sea threw back, and what waits in it.
      { name: 'wrecker\'s coast', layout: [
        { kind: 'hull_wreck', count: [1, 2] },
        { kind: 'sand', count: [4, 7] }, { kind: 'shallows', count: [3, 5] },
        { kind: 'water', count: [1, 2] }, { kind: 'sea_rock', count: [2, 4] },
        { kind: 'rocks', count: [3, 6], radius: [18, 40] },
        { kind: 'kelp_wrack', count: [3, 5] }, { kind: 'log', count: [2, 4] },
        { kind: 'formation', count: [0, 1], formation: 'kelp_curtain',
          where: { field: 'shore', max: 0.35, params: { kinds: ['water'], reach: 160 } } },
      ] },
    ],
    packs: {
      count: [5, 7], size: [3, 5],
      table: [
        { id: 'tide_skitter', weight: 3, presence: { to: 18, fadeOut: 9 } },
        { id: 'fen_hound', weight: 2, presence: { to: 16, fadeOut: 8 } },
        { id: 'dune_stalker', weight: 2 },
        { id: 'reef_lurcher', weight: 1, presence: { from: 5 } },
        // The Coilborn raid the rim: skirmish parties up out of the tangle.
        { id: 'marsh_adder', weight: 2, presence: { to: 16, fadeOut: 8 } },
        { id: 'bog_strider', weight: 2 },
        { id: 'hooded_spitter', weight: 1, presence: { from: 4 } },
        // The Deep washes ashore in ones and twos this far up the shelf.
        { id: 'deep_thresher', weight: 1 },
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

  // BRINE FLATS — the drained seabed: salt pans in cracked mud, bleached
  // reef heads, desiccated kelp, caustic sinks — the Deep's exposed floor,
  // tying the shore to the drowned heart. The pale face: everything here
  // is what the sea forgot to take with it.
  brine_flats: {
    id: 'brine_flats',
    depthAffinity: { from: 0.18, fadeIn: 0.18, to: 0.62, fadeOut: 0.2, mul: 0.9 },
    nameFirst: ['Saltcrack', 'Palewhite', 'Bittern', 'Dryreef', 'Bonewater', 'Cracklepan', 'Glarewhite', 'Deadwrack', 'Brinemirror', 'Saltrimed', 'Whalefall', 'Lowdrained', 'Crustwalk', 'Stillbrine', 'Ebbforgot', 'Shimmerpan'],
    nameSecond: ['Flats', 'Pans', 'Hardpan', 'Seabed', 'Shelf', 'Basin', 'Lows', 'Barrens', 'Expanse', 'Bed', 'Reach', 'Waste', 'Floor', 'Drain'],
    theme: {
      dayLight: 1.45,
      ambientFx: [{ kind: 'heatHaze', intensity: 0.45 }],
      // The pan must READ as bleached crust: a pale high-bias floor with
      // brine-teal water and grey cracked-mud lows.
      ground: {
        scale: 2.4, stretchX: 1.9, strength: 1.2, speckles: 0.4,
        palette: ['#3a382c', '#5a5644', '#7c775e', '#9c957a', '#bcb496'], bias: 0.62, alpha: 0.6,
        coast: { reach: 80, shift: -0.3, kinds: ['brine_sink', 'water'] },
      },
      floor: '#1c1a12', grid: '#2a281c', border: '#8a8468',
      obstacle: '#6a6450', obstacleEdge: '#9a9276', accent: '#d8f0e0',
      sand: '#ddd2b4', water: '#5a9a8e', mud: '#6a6252', tree: '#7a7458',
      // The pan's own weather, in two registers: quick briny washes that
      // leave DRYING tide pools (the fade wake — the tide's visit written,
      // then unwritten), and the rare TIDAL WALL — the drained seabed
      // remembering what owned it: a spanning wave, cardinal + announced,
      // always parted by one clear corridor.
      creep: {
        pockets: [0, 0], kinds: [],
        fronts: [
          { id: 'brinesurge', line: [2, 3], delay: [12, 24], waves: [40, 70], chance: 0.75 },
          { id: 'tidalwall', line: 'span', bearing: 'cardinal', spacing: 1.15, chance: 0.4, delay: [35, 70], waves: [100, 160], announce: { text: 'the sea returns!', color: '#bfe8ef' } },
        ],
      },
    },
    sizeW: [2500, 3400], sizeH: [1700, 2300], ellipseChance: 0.15, biome: 'littoral',
    // The tide reclaims its floor in patches: drowned-margin pockets welling
    // up through the pans (the blend fabric — the country's own gradient).
    blend: {
      with: 'drowned_margin',
      field: { kind: 'pockets', params: { span: 340, coverage: 0.3, feather: 60 } },
      packs: 0.2,
      chance: 0.35,
    },
    layout: [
      { kind: 'mud', count: [4, 7] },
      { kind: 'sand', count: [3, 5] },
      { kind: 'brine_sink', count: [2, 4] },
      { kind: 'salt_pillar', count: [3, 6] },
      { kind: 'bleached_coral', count: [3, 6] },
      { kind: 'kelp_wrack', count: [3, 5] },
      { kind: 'bone_pile', count: [1, 3] },
      { kind: 'sea_rock', count: [1, 2] },
      { kind: 'heat_shimmer', count: [1, 2] },
      { kind: 'cave', count: [0, 1] },
    ],
    // What every pan IS: the seabed's furniture, dried in place.
    common: [
      { kind: 'formation', count: [1, 2], formation: 'salt_terrace' },
      { kind: 'bone_arch', count: [0, 2] },
      { kind: 'hull_wreck', count: [0, 1] },
    ],
    variants: [
      // The boneyard: where the great bodies settled when the water left.
      { name: 'whalefall boneyard', layout: [
        { kind: 'bone_arch', count: [2, 3] },
        { kind: 'bone_pile', count: [3, 6] },
        { kind: 'bleached_coral', count: [4, 7] },
        { kind: 'mud', count: [3, 5] }, { kind: 'kelp_wrack', count: [3, 5] },
        { kind: 'salt_pillar', count: [2, 4] },
      ] },
      // The glasswater: sinks fused into mirrors — beautiful, caustic.
      { name: 'glasswater', layout: [
        { kind: 'brine_sink', count: [4, 7], radius: [26, 52] },
        { kind: 'tide_pool', count: [2, 4] },
        { kind: 'mud', count: [3, 5] }, { kind: 'salt_pillar', count: [2, 4] },
        { kind: 'kelp_wrack', count: [2, 4] },
        { kind: 'heat_shimmer', count: [2, 3] },
      ],
      // The mirrors ARE the re-flooding: this face runs the blend as a
      // hard tide-line instead of pockets (the processional-deep idiom).
      blend: { with: 'drowned_margin', field: { kind: 'axisX', params: { from: 0.25, to: 0.75 }, band: [0.4, 0.6], warp: { amp: 60, scale: 300 } }, packs: 0.25 } },
    ],
    packs: {
      count: [5, 7], size: [3, 5],
      archetypes: [
        { weight: 2, size: [6, 9] }, { weight: 5, size: [3, 5] }, { weight: 3, size: [1, 2] },
      ],
      table: [
        { id: 'tide_skitter', weight: 2, presence: { to: 16, fadeOut: 8 } },
        { id: 'salt_husk', weight: 2, presence: { from: 6 } },
        { id: 'tidewrack_shambler', weight: 2, presence: { from: 6 } },
        // Coilborn crossing-bands strung between the tangle and the shore.
        { id: 'marsh_adder', weight: 2, presence: { to: 14, fadeOut: 7 } },
        { id: 'bog_strider', weight: 2 },
        { id: 'hooded_spitter', weight: 2, presence: { from: 4 } },
        { id: 'fang_priest', weight: 1, presence: { from: 6 } },
        { id: 'constrictor_knight', weight: 1, presence: { from: 9 } },
        { id: 'deep_thresher', weight: 1 },
      ],
    },
    spawnerId: 'bone_altar',
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

  // MANGROVE TANGLE — the flooded inner country: stilt-root galleries over
  // brackish channels, wading everywhere, the Coilborn's home water. The
  // wet face: the ground itself fights for the landlords.
  mangrove_tangle: {
    id: 'mangrove_tangle',
    depthAffinity: { from: 0.38, fadeIn: 0.22 },
    nameFirst: ['Rootbound', 'Blackwater', 'Stiltwood', 'Tanglebrack', 'Silttide', 'Snagroot', 'Greenveil', 'Lowbranch', 'Eelgrass', 'Mudwalk', 'Proproot', 'Hissreed', 'Slackbrack', 'Drownwood', 'Coilhome', 'Heronshade'],
    nameSecond: ['Tangle', 'Mangrove', 'Backwater', 'Channels', 'Roots', 'Slough', 'Galleries', 'Brack', 'Maze', 'Shallows', 'Warren', 'Weave', 'Stilts', 'Bayou'],
    theme: {
      nightDark: 0.72,
      fog: { banks: [1, 2], kinds: [{ id: 'river_mist', weight: 2 }, { id: 'mist' }] },
      ground: {
        scale: 1.6, strength: 1.15, speckles: 0.4,
        palette: ['#101c14', '#182c1e', '#22402a', '#2e5236', '#3a6442'], bias: 0.52, alpha: 0.55,
        coast: { reach: 95, shift: -0.38, kinds: ['water', 'swamp', 'mud'] },
      },
      floor: '#0d140e', grid: '#16211a', border: '#3f6a52',
      obstacle: '#2a4a34', obstacleEdge: '#4a7a5a', accent: '#8ae8c8',
      water: '#173f3a', mud: '#2c3020', sand: '#8a8058', tree: '#2e5a40',
    },
    sizeW: [2300, 3100], sizeH: [1600, 2200], ellipseChance: 0.2, biome: 'littoral',
    // Pole-and-plank moorings do land among the roots — a lesser harbor
    // weight than the strand's open ground. The flats and the margin carry
    // NO docks on purpose: pans crack under pilings, and the margin is the
    // on-foot way INTO the shallows — cast-off happens on real ground.
    docks: 0.35,
    // The tangle drowns at its deep edge — margin pockets welling up
    // between the roots.
    blend: {
      with: 'drowned_margin',
      field: { kind: 'noise', params: { scale: 460, coverage: 0.28, soft: 0.4 } },
      packs: 0.2,
      chance: 0.3,
    },
    layout: [
      { kind: 'water', count: [3, 5] },
      { kind: 'shallows', count: [2, 4] },
      { kind: 'swamp', count: [2, 4] },
      { kind: 'mud', count: [2, 3] },
      { kind: 'mangrove', count: [10, 16] },
      { kind: 'reeds', count: [4, 7] },
      { kind: 'vines', count: [1, 3] },
      { kind: 'sunken_log', count: [2, 4] },
      { kind: 'strangler_root', count: [0, 2] },
      { kind: 'marsh_wisp', count: [1, 3] },
      { kind: 'gas_pod', count: [0, 2] },
      { kind: 'tide_pool', count: [0, 2] },
      { kind: 'cave', count: [0, 1] },
    ],
    // What the tangle always IS: galleries walling the channels, rushes
    // tracing every waterline, the landlords' shrines where the water bends.
    common: [
      { kind: 'formation', count: [2, 3], formation: 'mangrove_gallery',
        where: { field: 'shore', max: 0.55, params: { kinds: ['water', 'swamp'], reach: 160 } } },
      { kind: 'formation', count: [1, 2], formation: 'reed_shoreline',
        where: { field: 'shore', max: 0.6, params: { kinds: ['water', 'swamp'], reach: 140 } } },
      { kind: 'coil_idol', count: [0, 2],
        where: { field: 'shore', max: 0.5, params: { kinds: ['water', 'swamp'], reach: 150 } } },
    ],
    variants: [
      // The flooded gallery: more channel than land — wade or go around.
      { name: 'flooded gallery', layout: [
        { kind: 'water', count: [5, 7], radius: [40, 90] },
        { kind: 'shallows', count: [4, 6] },
        { kind: 'mangrove', count: [12, 18] },
        { kind: 'reeds', count: [4, 6] },
        { kind: 'sunken_log', count: [2, 4] },
        { kind: 'tide_pool', count: [1, 3] },
      ] },
      // The black lagoon: still water, wisp-light, and the song in the reeds.
      { name: 'black lagoon', layout: [
        { kind: 'swamp', count: [4, 6] },
        { kind: 'water', count: [2, 4] },
        { kind: 'mangrove', count: [8, 12] },
        { kind: 'marsh_wisp', count: [3, 5] },
        { kind: 'reeds', count: [5, 8] },
        { kind: 'gas_pod', count: [1, 3] },
        { kind: 'sunken_log', count: [2, 4] },
      ], theme: { nightDark: 0.78, fog: { banks: [2, 3], kinds: [{ id: 'river_mist', weight: 2 }, { id: 'mist' }] } } },
      // The idol shallows: the Coilborn's shrine-water — their court sits
      // thickest where the ward-lights burn.
      { name: 'idol shallows', layout: [
        { kind: 'coil_idol', count: [2, 3] },
        { kind: 'water', count: [3, 5] },
        { kind: 'shallows', count: [3, 5] },
        { kind: 'mangrove', count: [8, 13] },
        { kind: 'reeds', count: [3, 6] },
        { kind: 'tide_pool', count: [1, 2] },
        { kind: 'sunken_log', count: [1, 3] },
      ] },
    ],
    packs: {
      count: [6, 8], size: [3, 5],
      table: [
        // HOME WATER: the fullest Coilborn garrison in the game.
        { id: 'marsh_adder', weight: 3, presence: { to: 18, fadeOut: 8 } },
        { id: 'bog_strider', weight: 3 },
        { id: 'hooded_spitter', weight: 2, presence: { from: 4 } },
        { id: 'fang_priest', weight: 2, presence: { from: 6 } },
        { id: 'siren_adder', weight: 2, presence: { from: 8 } },
        { id: 'constrictor_knight', weight: 1, presence: { from: 9 } },
        // What else the brack keeps: water with arms, hounds at the rim.
        { id: 'lake_horror', weight: 1, presence: { from: 10 } },
        { id: 'mire_maw', weight: 1, presence: { from: 8 } },
        { id: 'fen_hound', weight: 1, presence: { to: 12, fadeOut: 6 } },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [
      { kind: 'bounty', weight: 1 },
      { kind: 'procession', weight: 1 },
      { kind: 'beacon', weight: 1 },
      { kind: 'clear', weight: 3 },
      { kind: 'escape', weight: 2 },
      { kind: 'spawners', weight: 2 },
      { kind: 'waves', weight: 1 },
    ],
  },

  // DROWNED MARGIN — the country's heart: ground already half inside the
  // sea. Wading bars, kelp forest in the surf, the drowned works of whoever
  // built here before the water rose — and the Deep, ashore in force. The
  // on-foot threshold: this is as far as the land goes.
  drowned_margin: {
    id: 'drowned_margin',
    depthAffinity: { from: 0.66, fadeIn: 0.18 },
    nameFirst: ['Halfsunk', 'Greyswell', 'Undertow', 'Coldwash', 'Deepreach', 'Sunkfield', 'Tidegrave', 'Drownstone', 'Farwade', 'Seaswallow', 'Duskwater', 'Lastland', 'Palebreak', 'Foamgrave', 'Downshelf', 'Brineheart'],
    nameSecond: ['Margin', 'Shallows', 'Drowning', 'Wash', 'Swale', 'Threshold', 'Steps', 'Descent', 'Verge', 'Fathoms', 'Crossing', 'Shoals', 'Brink', 'Ebb'],
    theme: {
      dayLight: 1.15,
      ground: {
        scale: 1.9, stretchX: 1.5, strength: 1.15, speckles: 0.45,
        palette: ['#141c1c', '#20302e', '#2c4442', '#3a5854', '#4a6c66'], bias: 0.5, alpha: 0.58,
        coast: { reach: 110, shift: -0.34, kinds: ['water', 'tide_pool'] },
      },
      floor: '#0e1414', grid: '#1a2424', border: '#4a7a76',
      obstacle: '#2f4a4a', obstacleEdge: '#4f7a76', accent: '#7ec8d8',
      water: '#155a72', sand: '#9a9478', mud: '#3a4038', tree: '#2e5a4a',
      // Half inside the sea already: floodcrest picket waves are the
      // margin's fixture weather, and better than half of visits the sea
      // ITSELF comes — a spanning tidal wall with its guaranteed corridor.
      creep: {
        pockets: [0, 0], kinds: [],
        fronts: [
          { id: 'floodcrest', line: [3, 5], delay: [10, 20], waves: [55, 90] },
          { id: 'tidalwall', line: 'span', bearing: 'cardinal', spacing: 1.15, chance: 0.55, delay: [25, 50], waves: [80, 130], announce: { text: 'the sea rises!', color: '#bfe8ef' } },
        ],
      },
    },
    sizeW: [2200, 3000], sizeH: [1550, 2100], ellipseChance: 0.2, biome: 'littoral',
    layout: [
      { kind: 'water', count: [4, 6], radius: [40, 100] },
      { kind: 'shallows', count: [4, 7] },
      { kind: 'sand', count: [2, 4] },
      { kind: 'kelp', count: [3, 5] },
      { kind: 'giant_kelp', count: [2, 4] },
      { kind: 'coral', count: [2, 4] },
      { kind: 'sea_rock', count: [2, 4] },
      { kind: 'sunken_stone', count: [1, 3] },
      { kind: 'tide_pool', count: [2, 4] },
      { kind: 'rocks', count: [2, 4], radius: [16, 34] },
      { kind: 'cave', count: [0, 1] },
    ],
    // What the margin always IS: the sea's furniture standing in the wade.
    common: [
      { kind: 'formation', count: [1, 2], formation: 'kelp_curtain',
        where: { field: 'shore', max: 0.45, params: { kinds: ['water'], reach: 170 } } },
      { kind: 'hull_wreck', count: [0, 1] },
    ],
    variants: [
      // The drowned causey: a road that now leads into the water — broken
      // columns and rubble where the older coast kept its works.
      { name: 'drowned causey', layout: [
        { kind: 'broken_column', count: [2, 4] },
        { kind: 'rubble', count: [2, 4] },
        { kind: 'sunken_stone', count: [2, 4] },
        { kind: 'water', count: [4, 6], radius: [40, 90] },
        { kind: 'shallows', count: [4, 6] },
        { kind: 'kelp', count: [2, 4] },
        { kind: 'coil_idol', count: [0, 1] },
      ] },
      // The reef shallows: the garden the water kept for itself. The water
      // pours FIRST (the ground-before convention) so the habitat-bearing
      // garden beds into it instead of starving at the gate.
      { name: 'reef shallows', layout: [
        { kind: 'water', count: [3, 5], radius: [36, 80] },
        { kind: 'shallows', count: [5, 8] },
        { kind: 'tide_pool', count: [2, 4] },
        { kind: 'coral', count: [4, 7] },
        { kind: 'kelp', count: [4, 6] },
        { kind: 'giant_kelp', count: [3, 5] },
        { kind: 'sea_rock', count: [2, 4] },
      ] },
    ],
    packs: {
      count: [5, 7], size: [3, 5],
      table: [
        // THE DEEP REACHES ASHORE: the margin belongs to the water's own.
        { id: 'deep_thresher', weight: 3 },
        { id: 'reef_lurcher', weight: 2, presence: { from: 5 } },
        { id: 'deep_angler', weight: 2, presence: { from: 7 } },
        { id: 'tidewrack_shambler', weight: 2, presence: { from: 8 } },
        { id: 'deep_tidecaller', weight: 1, presence: { from: 10 } },
        { id: 'tide_skitter', weight: 2, presence: { to: 16, fadeOut: 8 } },
        // The Coilborn wade out to meet their kin-tide.
        { id: 'marsh_adder', weight: 2, presence: { to: 16, fadeOut: 8 } },
        { id: 'bog_strider', weight: 1 },
        { id: 'siren_adder', weight: 1, presence: { from: 8 } },
        { id: 'fang_priest', weight: 1, presence: { from: 6 } },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [
      { kind: 'bounty', weight: 1 },
      { kind: 'beacon', weight: 1 },
      { kind: 'clear', weight: 3 },
      { kind: 'escape', weight: 2 },
      { kind: 'spawners', weight: 2 },
      { kind: 'waves', weight: 1 },
      { kind: 'offering', weight: 1 },
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
    // Rarely, the dark keeps a CHORD (engine/puzzles.ts): a ringed riddle
    // deep underground — the crystal grotto face's promise, cave-wide odds.
    puzzles: [{ id: 'great_chord', chance: 0.06 }],
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
      // OPT-OUT of the cave default (PIT_CFG.caveFall): the descent abyss
      // owns its own vertical economy — the shaft banks the haul, the
      // darkness meter is the clock, and a rent here bites the classic way
      // instead of minting a free stratum past both.
      pitfall: { kind: 'fall', to: 'edge', damage: { amount: 0, pctMaxLife: 0.18, type: 'physical', canKill: true } },
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
      // What the eldritch ground swallows, its underdark keeps (the pitfall
      // fabric): chasms descend.
      pitfall: { kind: 'descend' },
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
      // The seabed's trenches DROP (the pitfall fabric): below the deep
      // there are hollows still — the drowned strata's own ladder.
      pitfall: { kind: 'descend' },
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

  // SHIP DECK — the Wraithsail's boards (realm-only: the boarding chain mints
  // these, never the frontier). ONE tileset serves every deck; the mint stages
  // each rung via layoutParams.deck ('weather' | 'hold' | 'cabin') and names
  // it outright. Sheltered sky by doctrine — whatever storm the ship rides on
  // the node map, no weather reaches inside the boarding. The crew is the
  // DROWNED COURT at low floors: this is their own ship, and the whole court
  // attends her decks long before it attends open water.
  shipdeck: {
    id: 'shipdeck', biome: 'deepsea', sky: 'sheltered',
    frontier: false, perfProbe: true,
    forceLayout: 'ship_deck',
    nameFirst: ['Ghostlit', 'Wraithlit', 'Brinebound', 'Drowned', 'Pale-Rigged', 'Storm-Kept', 'Saltgrave', 'Lanternlit'],
    nameSecond: ['Deck', 'Boards', 'Hold', 'Gundeck', 'Quarterdeck', 'Forecastle', 'Cabin', 'Berth'],
    theme: {
      ground: { scale: 2.2, stretchX: 0.5, strength: 0.75, speckles: 0.25 },
      ambientDark: 0.28,
      floor: '#241c14', grid: '#2e241a', border: '#3f6a60',
      obstacle: '#3a2c1e', obstacleEdge: '#5a4a34', accent: '#7ad8d8',
      water: '#0c2740', chasm: '#04080c',
    },
    sizeW: [1250, 1450], sizeH: [1750, 2050], ellipseChance: 0,
    layout: [],
    common: [
      { kind: 'cargo_stack', count: [1, 3] },
    ],
    packs: {
      count: [4, 6], size: [2, 4],
      table: [
        // The crew musters on its own boards at LOW floors (hard, per the
        // court's discipline) — an early boarding meets oarsmen; a deep-water
        // interception fields the whole court.
        { id: 'drowned_oarsman', weight: 4 },
        { id: 'barnacle_knight', weight: 2, presence: { from: 6 } },
        { id: 'tide_vicar', weight: 1, presence: { from: 9 } },
        { id: 'sunken_courtier', weight: 1, presence: { from: 9 } },
        { id: 'anchor_wight', weight: 1, presence: { from: 12 } },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [{ kind: 'clear', weight: 1 }],
  },

  // ======================= THE MOUNTAIN COUNTRY =============================
  // ONE high biome ('highland'), the desert model CLIMBED: depthAffinity is
  // the ALTITUDE (deeper into the range = higher up the mountain), and the
  // crown faces are geoAffinity-LOCKED per range by the baked climate — a
  // cold range crowns in SNOW on every summit, a warm 'lowland' range never
  // does. The per-mountain identity rides the coherent climate field; no two
  // ranges need to agree.
  //   foothills (rim, massif recipe): the pinewood foot — tor and bluff
  //     bones among the stands, the gentle approach, one teaching chute.
  //   highland (mid, the KEPT rooms-maze): the mountain pass itself.
  //   overpass (mid-high, the karst recipe re-dialed): broad ledge shelves
  //     over the GORGE threaded by narrow worn corridors — boulder chutes,
  //     landslides, drop-caves. The precarious crossing.
  //   snowcrown / stonecrown (heart, geo-locked): the summit — white or bare.
  //
  // THE PASS — windswept crags (→ rooms layout = a mountain-pass maze of
  // corridors and chambers carved into the rock). The middle of the climb.
  highland: {
    id: 'highland', biome: 'highland',
    depthAffinity: { from: 0.24, fadeIn: 0.2, to: 0.74, fadeOut: 0.18 },
    // THE PASS ROLLS STONES TOO (the delivery repro's verdict: the most
    // common middle-band face fielded ZERO boulders): ambient chutes probe
    // the maze's own straight corridors — and the SPRUNG run is live now
    // (the seam the boulder pass queued): roomsLayout records its corridor
    // truth (ctx.trapGeo) and the interiorGen trap pass meets the dial at
    // the finished-grid tail. One hidden plate deep in a long hall looses
    // the cradled stone — the chutes teach the shape, the plate springs it.
    layoutParams: {
      boulderChutes: { count: [1, 2], minLen: 380, maxLen: 900, rest: 8, bounces: [0, 1] },
      trapworks: { boulderRuns: { chance: 0.55, max: 1 } },
    },
    compositions: [{ composition: 'stone_sanctum', chance: 0.35 }, { composition: 'powder_cache', chance: 0.18 }, { composition: 'war_camp', chance: 0.14 }, { composition: 'fallen_colossus', chance: 0.14 }, { composition: 'cistern_court', chance: 0.1 }, { composition: 'drover_waystation', chance: 0.16 }],
    nameFirst: ['Craggy', 'Windswept', 'Stoneback', 'Highreach', 'Granite', 'Cloudbound', 'Rugged', 'Skyworn', 'Bleakcrag', 'Frostcap', 'Eagle-Haunted', 'Hewnstone', 'Loftbound', 'Grey-Peaked', 'Stormcrest', 'Boulderfall', 'Wind-Scoured', 'Stark'],
    nameSecond: ['Pass', 'Crags', 'Bluffs', 'Heights', 'Ridge', 'Tor', 'Summit', 'Escarp', 'Defile', 'Cairn', 'Peaks', 'Spur', 'Scree', 'Cliffs', 'Saddle', 'Overlook'],
    theme: {
      floor: '#13130f', grid: '#1d1c16', border: '#5a5240',
      obstacle: '#3a3528', obstacleEdge: '#6a6048', accent: '#c8b890',
      wall: '#4a4436', mud: '#3a3428', tree: '#2a4636',
      // Granite mottle underfoot (the country facelift — highland previously
      // ran the bare light/dark derivation).
      ground: {
        scale: 1.7, strength: 1.05, speckles: 0.7,
        palette: ['#15140f', '#23211a', '#312e24', '#403c2e', '#4e4a3a'], bias: 0.5, alpha: 0.5,
      },
      // A light cold tax in the pass — the climb has begun (lee/roofs/fires
      // shed; the rooms-maze walls windbreak generously by construction).
      windchill: 0.35,
    },
    sizeW: [2200, 3000], sizeH: [1600, 2300], ellipseChance: 0,
    layout: [
      { kind: 'rocks', count: [4, 8], radius: [20, 42] },
      { kind: 'boulder_field', count: [1, 2] }, { kind: 'cairn', count: [1, 2] },
      { kind: 'scree', count: [1, 3] },
      // Hardy pines climb into the pass — thinning with the altitude the
      // deeper faces finish (the foothills' stands, remembered).
      { kind: 'conifers', count: [2, 5] },
      { kind: 'formation', count: [0, 1], formation: 'pine_stand' },
      // Cold-range passes wear the first dust of the crown to come.
      { kind: 'snowdrift', count: [0, 2], where: { field: 'climate', params: { axis: 'temperature' }, max: 0.4 } },
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
        // ...and the measured school tours after him — drum, round, and at
        // depth the crown (THE COMBO GRAMMAR's live tutorial; the payoff
        // text over their duels names rules the player can earn).
        { id: 'cadence_fencer', weight: 2, presence: { from: 5, fadeIn: 3 } },
        { id: 'cadence_cantor', weight: 1, presence: { from: 7, fadeIn: 3 } },
        { id: 'cadence_maestro', weight: 1, presence: { from: 12, fadeIn: 5 } },
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

  // THE FOOTHILLS — the pinewood foot of the range (rim face, massif recipe):
  // open walked ground under spread-out pine stands, with the mountain's own
  // bones (tor knuckles, bluff tables) rising through the timber. The gentle
  // approach — no cold tax yet, one teaching chute at most — and on a COLD
  // range the first snow dust already reaches down this far (climate-gated
  // rows: the crown announces itself from the very first zone).
  foothills: {
    id: 'foothills', biome: 'highland',
    depthAffinity: { to: 0.32, fadeOut: 0.26 },
    forceLayout: 'massif',
    layoutParams: {
      massifMasses: [{ kind: 'tor', weight: 3 }, { kind: 'bluff', weight: 2 }, { kind: 'fold', weight: 0.8 }],
      massifCoverage: [0.13, 0.19],
      // Every foothill zone teaches the boulder now (the delivery repro read
      // [0,1] as mostly-nothing); an occasional single carom off a tor.
      boulderChutes: { count: [1, 2], rest: 8, bounces: [0, 1] },
    },
    compositions: [
      { composition: 'drover_waystation', chance: 0.24 },
      { composition: 'war_camp', chance: 0.12 },
      { composition: 'powder_cache', chance: 0.1 },
    ],
    nameFirst: ['Pinebound', 'Whispering', 'Bouldered', 'Green-Shouldered', 'Mistfoot', 'Old-Drove', 'Shadowed', 'Bracken', 'Stonefoot', 'Windbreak', 'Cairnfoot', 'Timberline'],
    nameSecond: ['Foothills', 'Approach', 'Slopes', 'Shoulders', 'Rise', 'Drove', 'Skirts', 'Vale', 'Benches', 'Climb'],
    theme: {
      floor: '#12140e', grid: '#1c1e15', border: '#5a5e46',
      obstacle: '#3a3d2c', obstacleEdge: '#6a6e50', accent: '#b8cc90',
      wall: '#4a4a38', mud: '#3a3828', tree: '#2a4a34',
      ground: {
        scale: 1.5, strength: 1.0, speckles: 0.9,
        palette: ['#141710', '#212619', '#2e3320', '#3c3f28', '#4a4a32'], bias: 0.48, alpha: 0.5,
      },
    },
    sizeW: [2600, 3400], sizeH: [1900, 2600], ellipseChance: 0, sky: 'open',
    layout: [
      { kind: 'conifers', count: [8, 14] },
      { kind: 'formation', count: [2, 4], formation: 'pine_stand' },
      { kind: 'rocks', count: [4, 7], radius: [20, 40] },
      { kind: 'scree', count: [1, 3] },
      { kind: 'boulder_field', count: [0, 1] },
      { kind: 'wayshrine', count: [0, 1] },
      { kind: 'meditation_cairn', count: [0, 1] },
      { kind: 'haven_stone', count: [0, 1] },
      { kind: 'formation', count: [0, 1], formation: 'boulder_train' },
      // A cold range dusts its foot; a warm one never does (the lock, read
      // from the very first zone of the climb).
      { kind: 'snowdrift', count: [0, 3], where: { field: 'climate', params: { axis: 'temperature' }, max: 0.42 } },
      // Crags crowd the HIGH ground (elevation strata — the whole country
      // reads uphill toward its own heart).
      { kind: 'rocks', count: [2, 4], radius: [20, 44],
        where: { field: 'elevation', min: 0.62, params: { scale: 640, dome: 0.35 } } },
    ],
    common: [
      { kind: 'cairn', count: [1, 2] },
      { kind: 'bone_pile', count: [0, 1] },
    ],
    variants: [
      // Denser timber — the stands close ranks under the tors.
      { name: 'the pinewood', layout: [
        { kind: 'conifers', count: [14, 20] },
        { kind: 'formation', count: [3, 5], formation: 'pine_stand' },
        { kind: 'rocks', count: [3, 6], radius: [18, 36] },
        { kind: 'scree', count: [1, 2] },
        { kind: 'haven_stone', count: [0, 1] },
        { kind: 'snowdrift', count: [0, 3], where: { field: 'climate', params: { axis: 'temperature' }, max: 0.42 } },
      ], layoutParams: {
        massifMasses: [{ kind: 'tor', weight: 3 }, { kind: 'bluff', weight: 1.2 }],
        massifCoverage: [0.11, 0.16],
      } },
      // The old drove road country — folds and open benches, thin timber.
      { name: 'the open drove', layout: [
        { kind: 'conifers', count: [4, 8] },
        { kind: 'formation', count: [1, 2], formation: 'pine_stand' },
        { kind: 'rocks', count: [5, 8], radius: [20, 42] },
        { kind: 'scree', count: [2, 4] },
        { kind: 'wayshrine', count: [0, 1] },
        { kind: 'gallows', count: [0, 1] },
        { kind: 'formation', count: [0, 1], formation: 'standing_avenue' },
        { kind: 'snowdrift', count: [0, 2], where: { field: 'climate', params: { axis: 'temperature' }, max: 0.42 } },
      ], layoutParams: {
        massifMasses: [{ kind: 'fold', weight: 2.5 }, { kind: 'tor', weight: 1.5 }, { kind: 'bluff', weight: 1 }],
        massifCoverage: [0.12, 0.17],
      } },
    ],
    packs: {
      count: [6, 9], size: [3, 5],
      table: [
        { id: 'brute', weight: 3 },
        { id: 'javelin_skirmisher', weight: 2, presence: { to: 20, fadeOut: 10 } },
        { id: 'alpha_stalker', weight: 2 },
        { id: 'beastkin_gorer', weight: 3 },
        { id: 'beastkin_impaler', weight: 2, presence: { from: 4, fadeIn: 2 } },
        { id: 'steppe_ronin', weight: 1, presence: { from: 5, fadeIn: 3 } },
        { id: 'cadence_fencer', weight: 1, presence: { from: 5, fadeIn: 3 } },
        // The mountain's own: thermals over the foot, stone on the move.
        { id: 'crag_condor', weight: 2, presence: { from: 3, fadeIn: 2 } },
        { id: 'boulderback', weight: 1, presence: { from: 6, fadeIn: 3 } },
        { id: 'troll_mauler', weight: 1, presence: { from: 9, fadeIn: 5 } },
        { id: 'gale_elemental', weight: 1, presence: { to: 18, fadeOut: 9 } },
      ],
    },
    caveLayouts: { rooms: 2, plains: 1 },
    spawnerId: 'rime_stone',
    objectives: [{ kind: 'clear', weight: 3 }, { kind: 'bounty', weight: 2 }, { kind: 'beacon', weight: 1 }, { kind: 'spawners', weight: 1 }],
  },

  // THE OVERPASS — the precarious crossing (mid-high face, the karst recipe
  // re-dialed): BROAD ledge shelves — pocket radii half again the Reach's —
  // hanging over the GORGE, threaded by NARROW worn corridors. The fall
  // region drops into the mountain's own galleries (pitfall descend — the
  // drop-cave doctrine already governs the farm), boulder chutes cross the
  // big shelves on a cradle cadence (the SM64 gauntlet — leap or weave), and
  // every so often the mountainside itself lets go (the landslide span-front,
  // clear corridor guaranteed by construction). Windchill begins to bite.
  overpass: {
    id: 'overpass', biome: 'highland',
    depthAffinity: { from: 0.34, fadeIn: 0.22, to: 0.88, fadeOut: 0.12 },
    forceLayout: 'karst',
    layoutParams: {
      karstGulf: 'gorge',
      karstPocketR: [150, 260], karstGap: [330, 420], karstCorridorW: [40, 58],
      karstLoops: 0.26, karstCrags: [2, 4], karstWobble: 40, karstRim: [90, 140],
      boulderChutes: { count: [2, 3], rest: 6.5, bounces: [0, 2] },
    },
    compositions: [
      { composition: 'drover_waystation', chance: 0.18 },
      { composition: 'stone_sanctum', chance: 0.14 },
    ],
    nameFirst: ['Sheer', 'Howling', 'Broken', 'Hanging', 'Windcut', 'Scarred', 'Vertiginous', 'Boulder-Run', 'Goat-Track', 'White-Knuckle', 'Cloudworn', 'Slipstone'],
    nameSecond: ['Overpass', 'Ledges', 'Scarps', 'Shelves', 'Traverse', 'Switchbacks', 'Crossing', 'Gorge-Way', 'Cornice', 'Spans'],
    theme: {
      dayLight: 1.15,
      // THE GORGE IS A DOOR (the pitfall fabric): a lost footing drops one
      // stratum into the mountain's galleries — with full shove credit.
      pitfall: { kind: 'descend' },
      windchill: 0.55,
      ambientFx: [{ kind: 'motes', intensity: 0.3, color: '#c8d0da' }],
      ground: {
        scale: 1.8, stretchX: 1.2, strength: 1.1, speckles: 0.5,
        palette: ['#101216', '#1c1f24', '#2a2e34', '#3a3f46', '#4a505a'], bias: 0.5, alpha: 0.5,
      },
      floor: '#0e1013', grid: '#181b20', border: '#9aa2ac',
      obstacle: '#3a3f46', obstacleEdge: '#6a7280', accent: '#c8d0da',
      tree: '#3a5a40', mud: '#2e3238',
      creep: {
        pockets: [0, 0], kinds: [],
        fronts: [{
          id: 'landslide', line: 'span', bearing: 'cardinal',
          gap: { width: 170, count: [1, 2] },
          chance: 0.75, delay: [12, 26], waves: [70, 115],
          announce: { text: 'the mountainside lets go!', color: '#b8ab90' },
        }],
      },
    },
    sizeW: [3400, 4400], sizeH: [2400, 3200], ellipseChance: 0, sky: 'open',
    layout: [
      { kind: 'rocks', count: [6, 10], radius: [20, 44] },
      { kind: 'rock_spire', count: [2, 5] },
      { kind: 'scree', count: [3, 5] },
      { kind: 'conifers', count: [3, 6] },
      { kind: 'cave', count: [1, 3] },
      { kind: 'charged_crystal', count: [0, 2] },
      { kind: 'stormglass_shard', count: [1, 2] },
      { kind: 'formation', count: [1, 2], formation: 'boulder_train' },
      // The cold range's shelf-ice and drift pockets (the lock, mid-climb).
      { kind: 'snowdrift', count: [0, 4], where: { field: 'climate', params: { axis: 'temperature' }, max: 0.42 } },
      { kind: 'ice', count: [0, 2], where: { field: 'climate', params: { axis: 'temperature' }, max: 0.4 } },
      // NO camp row: palisade rects can't seat honestly on pocket-maze
      // ground (the karst lesson) — the Overpass garrisons are its packs.
    ],
    common: [
      { kind: 'cairn', count: [1, 2] },
      { kind: 'bone_pile', count: [1, 2] },
      // Leaning sarsen knobs near the gulfs — the mass fabric's bounce is
      // the whole conversation at a gorge lip.
      { kind: 'sarsen_bumper', count: [1, 2] },
    ],
    variants: [
      // Every shelf seems to hold a way down.
      { name: 'cave-riddled', layout: [
        { kind: 'rocks', count: [5, 8], radius: [20, 40] },
        { kind: 'rock_spire', count: [2, 4] },
        { kind: 'scree', count: [3, 5] },
        { kind: 'conifers', count: [2, 4] },
        { kind: 'cave', count: [2, 4] },
        { kind: 'snowdrift', count: [0, 3], where: { field: 'climate', params: { axis: 'temperature' }, max: 0.42 } },
      ] },
      // The high shelves: vaster benches, meaner ledges between them.
      { name: 'the high shelves', layout: [
        { kind: 'rocks', count: [6, 10], radius: [22, 46] },
        { kind: 'rock_spire', count: [3, 6] },
        { kind: 'scree', count: [2, 4] },
        { kind: 'conifers', count: [2, 5] },
        { kind: 'cave', count: [1, 2] },
        { kind: 'stormglass_shard', count: [1, 3] },
        { kind: 'snowdrift', count: [0, 4], where: { field: 'climate', params: { axis: 'temperature' }, max: 0.42 } },
      ], layoutParams: {
        karstPocketR: [190, 300], karstCorridorW: [36, 50], karstGap: [360, 450],
        // Bounces where the rare crag face allows — but the Overpass's own
        // signature ending is the GORGE: most runs die over the lip (a fall
        // region never caroms; the massif fells are the switchback country).
        boulderChutes: { count: [2, 4], rest: 6, bounces: [1, 3] },
      } },
    ],
    packs: {
      count: [6, 8], size: [3, 5],
      table: [
        { id: 'crag_condor', weight: 3 },
        { id: 'javelin_skirmisher', weight: 3 },
        { id: 'scree_skitter', weight: 2 },
        { id: 'scree_shambler', weight: 2, presence: { from: 5, fadeIn: 3 } },
        { id: 'sarsen_ram', weight: 2, presence: { from: 6, fadeIn: 3 } },
        { id: 'boulderback', weight: 2, presence: { from: 5, fadeIn: 3 } },
        { id: 'beastkin_flayer', weight: 2, presence: { from: 8, fadeIn: 4 } },
        { id: 'beastkin_horncaller', weight: 1, presence: { from: 7, fadeIn: 3 } },
        { id: 'gale_elemental', weight: 2 },
        { id: 'stone_sentinel', weight: 1, presence: { from: 10, fadeIn: 5 } },
        { id: 'pit_mauler', weight: 1, presence: { from: 9, fadeIn: 4 } },
        { id: 'molting_behemoth', weight: 1, presence: { from: 14, fadeIn: 6 } },
      ],
    },
    caveLayouts: { rooms: 2, plains: 1, dungeon: 0.5 },
    // The mountainside hides its finds in the crag rim — and some crevices
    // go DOWN (the drop-cave-richest surface face by design).
    hollows: {
      count: [1, 2],
      table: { cache_hollow: 3, ambush_hollow: 2, crevice_hollow: 2, vein_hollow: 1.5 },
    },
    spawnerId: 'rime_stone',
    objectives: [
      { kind: 'clear', weight: 3 },
      { kind: 'escape', weight: 2 },
      { kind: 'bounty', weight: 2 },
      { kind: 'beacon', weight: 1 },
      { kind: 'circuit', weight: 1 },
    ],
  },

  // THE SNOWCROWN — a COLD range's summit (heart face, geo-LOCKED: only a
  // range whose baked temperature runs cold ever crowns white). Frozen theme
  // heat pins a standing snow floor, snowfall deepens it, auroras walk the
  // night, and the windchill is the whole conversation: hearth to hearth,
  // lee to lee, while the crown sheds avalanches on snow weather. The
  // 'lowland mountain' never mints this face — that is the point.
  snowcrown: {
    id: 'snowcrown', biome: 'highland',
    depthAffinity: { from: 0.66, fadeIn: 0.24 },
    geoAffinity: { temperature: { to: 0.36, fadeOut: 0.08 } },
    forceLayout: 'massif',
    layoutParams: {
      massifMasses: [{ kind: 'tor', weight: 2.5 }, { kind: 'bluff', weight: 1.5 }],
      massifCoverage: [0.1, 0.16],
      boulderChutes: { count: [1, 2], rest: 7.5, bounces: [0, 2] },
    },
    compositions: [
      { composition: 'drover_waystation', chance: 0.16 },
      { composition: 'stone_sanctum', chance: 0.12 },
    ],
    nameFirst: ['Whitecrowned', 'Howling', 'Glacial', 'Snowblind', 'Auroral', 'Icebound', 'Wind-Scoured', 'Frostveiled', 'Silent', 'Cloudpiercing'],
    nameSecond: ['Crown', 'Summit', 'Peak', 'Cap', 'Fields', 'Cornice', 'Heights', 'Roof', 'Shoulder', 'Spire'],
    theme: {
      heat: 0.02,
      windchill: 1,
      dayLight: 1.3,
      nightDark: 0.5,
      pitfall: { kind: 'descend' },
      ambientFx: [{ kind: 'aurora' }],
      fog: { banks: [1, 2], kinds: [{ id: 'mist' }] },
      ground: {
        scale: 1.9, strength: 0.85, speckles: 0.6,
        palette: ['#181d26', '#28303c', '#3a4552', '#556274', '#76859a'], bias: 0.55, alpha: 0.5,
      },
      floor: '#0e1218', grid: '#1a2028', border: '#aab6c2',
      obstacle: '#3a4552', obstacleEdge: '#76859a', accent: '#d8e6f2',
      tree: '#24423a', mud: '#93b6c8',
      creep: {
        pockets: [0, 0], kinds: [],
        fronts: [
          {
            id: 'landslide', line: 'span', bearing: 'cardinal',
            gap: { width: 180, count: [1, 2] },
            chance: 0.55, delay: [18, 34], waves: [85, 135],
            announce: { text: 'the mountainside lets go!', color: '#b8ab90' },
          },
          // Snow weather FEEDS the crown's slides — the avalanche lane waits
          // at the door until the sky says so (FrontCond.weather).
          {
            id: 'landslide', line: 'span', bearing: 'cardinal',
            gap: { width: 170, count: [1, 2] },
            chance: 0.65, delay: [10, 24], waves: [60, 100],
            when: { weather: ['snow', 'blizzard'] },
            announce: { text: 'the crown sheds — avalanche!', color: '#e8f2fa' },
          },
        ],
      },
    },
    sizeW: [2400, 3200], sizeH: [1700, 2400], ellipseChance: 0, sky: 'open',
    layout: [
      { kind: 'snowdrift', count: [8, 14], where: { field: 'noise', max: 0.47, params: { scale: 560, seed: 5 } } },
      { kind: 'ice', count: [2, 4] },
      { kind: 'icicle_cluster', count: [1, 3] },
      { kind: 'conifers', count: [3, 6] },
      { kind: 'formation', count: [0, 2], formation: 'pine_stand' },
      { kind: 'rocks', count: [4, 7], radius: [20, 42] },
      { kind: 'formation', count: [1, 2], formation: 'ice_teeth' },
      { kind: 'haven_stone', count: [0, 1] },
      { kind: 'meditation_cairn', count: [0, 1] },
      { kind: 'stormglass_shard', count: [0, 2] },
      // The crown's own crags ride the high ground (elevation strata).
      { kind: 'rocks', count: [2, 4], radius: [20, 42],
        where: { field: 'elevation', min: 0.62, params: { scale: 640, dome: 0.35 } } },
    ],
    common: [
      { kind: 'cairn', count: [1, 3] },
    ],
    variants: [
      // Drift-buried fields under walking banks of white.
      { name: 'whiteout fields', layout: [
        { kind: 'snowdrift', count: [9, 14], where: { field: 'noise', max: 0.47, params: { scale: 600, seed: 7 } } },
        { kind: 'ice', count: [1, 3] },
        { kind: 'conifers', count: [2, 4] },
        { kind: 'rocks', count: [3, 6], radius: [18, 38] },
        { kind: 'formation', count: [1, 2], formation: 'ice_teeth' },
        { kind: 'haven_stone', count: [0, 1] },
      ], theme: { fog: { banks: [2, 3], kinds: [{ id: 'mist' }] } } },
      // The icefall — sheet ice and hanging teeth, the slickest climb.
      { name: 'the icefall', layout: [
        { kind: 'ice', count: [4, 7] },
        { kind: 'icicle_cluster', count: [2, 4] },
        { kind: 'snowdrift', count: [5, 9], where: { field: 'noise', max: 0.47, params: { scale: 560, seed: 9 } } },
        { kind: 'rocks', count: [4, 7], radius: [20, 40] },
        { kind: 'formation', count: [1, 2], formation: 'ice_teeth' },
        { kind: 'stormglass_shard', count: [1, 2] },
      ] },
    ],
    packs: {
      count: [6, 8], size: [3, 5],
      table: [
        { id: 'snow_swimmer', weight: 3 },
        { id: 'frost_witch', weight: 2, presence: { from: 8, fadeIn: 4 } },
        { id: 'crag_condor', weight: 2 },
        { id: 'boulderback', weight: 2, presence: { from: 6, fadeIn: 3 } },
        { id: 'beastkin_ritualist', weight: 1, presence: { from: 10, fadeIn: 5 } },
        { id: 'beastkin_horncaller', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'gale_elemental', weight: 2 },
        { id: 'stone_sentinel', weight: 1, presence: { from: 11, fadeIn: 5 } },
        { id: 'troll_mauler', weight: 1, presence: { from: 10, fadeIn: 5 } },
        // The cold's own giant walks the white — HARD gate, the tundra law.
        { id: 'frost_giant', weight: 1, presence: { from: 12 } },
      ],
    },
    caveLayouts: { rooms: 2, plains: 1 },
    hollows: {
      count: [0, 2],
      table: { cache_hollow: 3, vein_hollow: 2, ambush_hollow: 1 },
    },
    landmarks: [{ landmark: 'frozen_lake', chance: 0.18 }, { landmark: 'cirque', chance: 0.15 }],
    spawnerId: 'rime_stone',
    objectives: [{ kind: 'clear', weight: 3 }, { kind: 'beacon', weight: 2 }, { kind: 'spawners', weight: 1 }, { kind: 'offering', weight: 1 }],
  },

  // THE STONECROWN — a WARM range's bald summit (heart face, the geo-lock's
  // other pole): no snow, ever — wind-bitten grass, krummholz pine, standing
  // stones and the Horned Tribes' high seats. The gale is the tax here
  // (windchill rides windAt), and the boulder-runs are the tribes' own
  // proving ground. The 'lowlands mountain' the lock promises.
  stonecrown: {
    id: 'stonecrown', biome: 'highland',
    depthAffinity: { from: 0.66, fadeIn: 0.24 },
    geoAffinity: { temperature: { from: 0.42, fadeIn: 0.08 } },
    forceLayout: 'massif',
    layoutParams: {
      massifMasses: [{ kind: 'bluff', weight: 2.5 }, { kind: 'tor', weight: 2 }, { kind: 'fold', weight: 1 }],
      massifCoverage: [0.12, 0.18],
      boulderChutes: { count: [1, 3], rest: 7, bounces: [0, 2] },
    },
    compositions: [
      { composition: 'war_camp', chance: 0.2 },
      { composition: 'drover_waystation', chance: 0.12 },
      { composition: 'fallen_colossus', chance: 0.1 },
    ],
    nameFirst: ['Barecrowned', 'Sunstruck', 'Grey', 'Thornwind', 'Old', 'Wind-Bitten', 'Krummholz', 'Stony', 'Beacon', 'Khan-Held'],
    nameSecond: ['Crown', 'Summit', 'Fell', 'Top', 'Bald', 'Heights', 'Table', 'Dome', 'Seat', 'Plateau'],
    theme: {
      windchill: 0.75,
      dayLight: 1.2,
      pitfall: { kind: 'descend' },
      ground: {
        scale: 1.6, strength: 1.05, speckles: 0.8,
        palette: ['#191a16', '#26271f', '#343428', '#454436', '#565244'], bias: 0.5, alpha: 0.5,
      },
      floor: '#13130e', grid: '#1e1d16', border: '#8a8668',
      obstacle: '#454436', obstacleEdge: '#767252', accent: '#c8b880',
      tree: '#4a5a38', mud: '#3a3828',
      creep: {
        pockets: [0, 0], kinds: [],
        fronts: [{
          id: 'landslide', line: 'span', bearing: 'cardinal',
          gap: { width: 170, count: [1, 2] },
          chance: 0.65, delay: [14, 28], waves: [80, 130],
          announce: { text: 'the mountainside lets go!', color: '#b8ab90' },
        }],
      },
    },
    sizeW: [2400, 3200], sizeH: [1700, 2400], ellipseChance: 0, sky: 'open',
    layout: [
      { kind: 'rocks', count: [6, 10], radius: [20, 44] },
      { kind: 'boulder_field', count: [1, 2] },
      { kind: 'scree', count: [2, 4] },
      { kind: 'conifers', count: [1, 3] },
      { kind: 'charged_crystal', count: [0, 2] },
      { kind: 'stormglass_shard', count: [1, 3] },
      { kind: 'gallows', count: [0, 1] },
      { kind: 'formation', count: [0, 1], formation: 'standing_avenue' },
      { kind: 'formation', count: [0, 1], formation: 'fulgurite_scar' },
      { kind: 'formation', count: [0, 1], formation: 'boulder_train' },
      // Crags crown the HIGH ground here too (the pass's elevation read).
      { kind: 'rocks', count: [2, 4], radius: [20, 44],
        where: { field: 'elevation', min: 0.62, params: { scale: 640, dome: 0.35 } } },
    ],
    common: [
      { kind: 'cairn', count: [2, 4] },
      { kind: 'bone_pile', count: [0, 2] },
    ],
    variants: [
      // The tribes muster on the roof of their world.
      { name: "the khan's seat", layout: [
        { kind: 'rocks', count: [5, 8], radius: [20, 40] },
        { kind: 'scree', count: [2, 3] },
        { kind: 'conifers', count: [0, 2] },
        { kind: 'camp', count: [1, 2] },
        { kind: 'formation', count: [1, 2], formation: 'standing_avenue' },
        { kind: 'gallows', count: [0, 1] },
      ] },
      // Mountain scrub — wind-carded thorn and stunted pine.
      { name: 'thornfell', layout: [
        { kind: 'rocks', count: [5, 8], radius: [18, 38] },
        { kind: 'brush', count: [3, 5] },
        { kind: 'thicket', count: [1, 2] },
        { kind: 'conifers', count: [2, 4] },
        { kind: 'scree', count: [2, 4] },
        { kind: 'formation', count: [0, 1], formation: 'fulgurite_scar' },
      ] },
    ],
    packs: {
      count: [6, 9], size: [3, 5],
      table: [
        { id: 'beastkin_gorer', weight: 3 },
        { id: 'beastkin_impaler', weight: 2, presence: { from: 5, fadeIn: 2 } },
        { id: 'beastkin_flayer', weight: 2, presence: { from: 8, fadeIn: 4 } },
        { id: 'beastkin_ritualist', weight: 1, presence: { from: 10, fadeIn: 5 } },
        { id: 'beastkin_horncaller', weight: 2, presence: { from: 6, fadeIn: 3 } },
        { id: 'beastlord_khan', weight: 1, presence: { from: 15, fadeIn: 5 } },
        { id: 'crag_condor', weight: 3 },
        { id: 'boulderback', weight: 1, presence: { from: 6, fadeIn: 3 } },
        { id: 'steppe_ronin', weight: 1, presence: { from: 6, fadeIn: 3 } },
        { id: 'cadence_maestro', weight: 1, presence: { from: 12, fadeIn: 5 } },
        { id: 'gale_elemental', weight: 1 },
      ],
    },
    caveLayouts: { rooms: 2, plains: 1 },
    hollows: {
      count: [0, 2],
      table: { cache_hollow: 3, ambush_hollow: 2, vein_hollow: 1 },
    },
    landmarks: [{ landmark: 'cirque', chance: 0.12 }],
    spawnerId: 'rime_stone',
    objectives: [{ kind: 'clear', weight: 3 }, { kind: 'bounty', weight: 2 }, { kind: 'beacon', weight: 2 }, { kind: 'spawners', weight: 1 }],
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
    variants: [
      // THE FLOODWAKE — the flood-prone demo face (the advancing front
      // fabric's floodcrest debut): low fen given to sudden water — every
      // couple of minutes a CREST breaks in from the land's edge and rolls
      // the whole ground, swimming-slow and breath-draining inside, an
      // undertow carrying bodies downstream (the deep's kin ride free),
      // a wadeable shallow wake left behind. The exit roads' DECKED
      // stretches stay dry in skin and hit test alike — the causeway
      // fabric is the survival route, exactly as laid.
      {
        name: 'floodwake',
        layout: [
          { kind: 'reeds', count: [4, 7] }, { kind: 'geyser', count: [1, 2] }, { kind: 'dead_tree', count: [2, 4] },
          { kind: 'fern', count: [1, 3] }, { kind: 'fishing_rack', count: [0, 1] },
          { kind: 'bog', count: [3, 5] }, { kind: 'water', count: [2, 4] },
          { kind: 'swamp', count: [2, 3] }, { kind: 'trees', count: [3, 6] },
          { kind: 'thicket', count: [1, 2] },
          { kind: 'gas_pod', count: [0, 2] },
          { kind: 'sunken_log', count: [1, 3] },
          { kind: 'marsh_wisp', count: [2, 4] },
          { kind: 'peat_mound', count: [1, 2] },
          { kind: 'gel_pool', count: [2, 3], radius: [38, 64] },
          { kind: 'sunken_stone', count: [1, 3] },
          { kind: 'hollow_log', count: [0, 2] },
          { kind: 'formation', count: [1, 3], formation: 'reed_shoreline',
            where: { field: 'shore', max: 0.6, params: { kinds: ['water', 'bog', 'swamp'], reach: 140 } } },
        ],
        theme: {
          creep: {
            pockets: [0, 0], kinds: [],
            fronts: [{ id: 'floodcrest', line: [3, 5], waves: [70, 110], delay: [8, 16] }],
          },
        },
      },
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
        // Coilborn hunting parties range up the inland fens from the coast
        // (light presence — the marsh is their border country, not home).
        { id: 'marsh_adder', weight: 2, presence: { to: 16, fadeOut: 8 } },
        { id: 'bog_strider', weight: 1, presence: { from: 5 } },
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
      // "Arteries paying out on the heartbeat" — made literal: stretched
      // crests of blood sweep the galleries on a pump cadence, pooled wake
      // DRAINING behind them (the halls flood and empty like a live
      // vessel). TWO lanes on independent clocks — a gallery crossing runs
      // ~45s, so one lane alone reads as a slow drip; staggered lanes keep
      // a pulse always somewhere mid-stroke, systole chasing diastole.
      creep: {
        pockets: [0, 0], kinds: [],
        fronts: [
          { id: 'sanguine_pulse', line: [1, 2], delay: [5, 9], waves: [6, 12] },
          { id: 'sanguine_pulse', line: [1, 1], delay: [20, 32], waves: [6, 12] },
          // THE BORE: one hard slug of pumped blood that STEERS the
          // galleries (FrontSpec.flow — it hugs the winding walls, rebounds
          // out of blind pockets), elongates as the pump feeds it, and
          // spends itself mid-zone; pale corpuscles ride its crest and
          // spear what it carries. Announced — you hear the vessel take a
          // breath before the wave takes you.
          { id: 'sanguine_bore', line: [1, 1], delay: [10, 18], waves: [14, 24], chance: 0.8,
            announce: { text: 'the vessel surges!', color: '#ff8090' } },
        ],
      },
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

  // ======================= THE KARST COUNTRY ================================
  // ONE rock biome, TWO faces staged by depthAffinity (the desert model),
  // each face PINNING its own recipe via forceLayout — the one country whose
  // identities need different generators (chasm maze vs stone forest).
  //
  // THE KARST REACH (rim, forceLayout 'karst'): an above-ground cavern
  // country whose NEGATIVE SPACE is the maze — branching chasm gulfs (the
  // 'chasm' fall region: bodies walk around, shots and sight sail over, a
  // shove is a kill) between pockets of ground, NO BRIDGES ever. Artillery
  // kin duel you across gaps you must walk around; melee kin hold the
  // pinches. The cave-richest surface face by design — the Reach is where
  // you go hunting ways down (cave counts + crevice hollows in the crag rim).
  karst_reach: {
    id: 'karst_reach',
    depthAffinity: { to: 0.55, fadeOut: 0.3 },
    forceLayout: 'karst',
    compositions: [
      { composition: 'stone_sanctum', chance: 0.16 },
    ],
    nameFirst: ['Riven', 'Sunken', 'Pale', 'Windworn', 'Echoing', 'Yawning', 'Cracked', 'Hollowfoot', 'Stonemazed', 'Gulf-Cut', 'Weathered', 'Karstborn'],
    nameSecond: ['Reach', 'Karst', 'Clefts', 'Gulfs', 'Maze', 'Scars', 'Pavement', 'Rents', 'Crossing', 'Steps'],
    theme: {
      dayLight: 1.25,
      // THE GORGE IS A DOOR (the pitfall fabric): the Reach's chasm maze
      // drops into the karst's own galleries — the cave-richest country
      // finally connects from above.
      pitfall: { kind: 'descend' },
      ambientFx: [{ kind: 'motes', intensity: 0.35, color: '#c8c0a8' }],
      ground: {
        scale: 1.9, stretchX: 1.3, strength: 1.15, speckles: 0.55,
        palette: ['#23201a', '#38342a', '#4c473a', '#5e594a', '#6e6858'], bias: 0.52, alpha: 0.5,
      },
      floor: '#1a1812', grid: '#282418', border: '#8d8672',
      obstacle: '#6e685a', obstacleEdge: '#9a9280', accent: '#d8c88a',
      tree: '#8a857a',
    },
    sizeW: [3400, 4400], sizeH: [2400, 3200], ellipseChance: 0, biome: 'karst', sky: 'open',
    layout: [
      { kind: 'rocks', count: [6, 10], radius: [20, 44] },
      { kind: 'rock_spire', count: [3, 6] },
      { kind: 'scree', count: [3, 5] },
      { kind: 'standing_stone', count: [0, 2] },
      { kind: 'petrified_tree', count: [2, 5] },
      { kind: 'cave', count: [1, 3] },
      { kind: 'formation', count: [1, 2], formation: 'pinnacle_train' },
      // NO camp here: a palisade rect can't seat honestly on pocket-maze
      // ground (its wall ring overhangs the gulfs) — the Reach's garrisons
      // are its packs and its sanctums, not tents.
    ],
    common: [
      { kind: 'formation', count: [0, 1], formation: 'boulder_train' },
      { kind: 'bone_pile', count: [1, 2] },
      { kind: 'watcher_stone', count: [0, 2] },
      // THE SARSEN BUMPERS (the mass fabric): leaning knobs that answer a
      // touch with a weight-scaled fling — near the Reach's gulfs, the
      // bounce is the whole conversation (data/tracks.ts rule).
      { kind: 'sarsen_bumper', count: [1, 3] },
    ],
    variants: [
      // The side-zone hunter's roll: every pocket seems to hold a mouth.
      { name: 'cave-riddled', layout: [
        { kind: 'rocks', count: [5, 8], radius: [20, 40] },
        { kind: 'rock_spire', count: [2, 4] },
        { kind: 'scree', count: [3, 5] },
        { kind: 'cave', count: [2, 4] },
        { kind: 'formation', count: [1, 2], formation: 'pinnacle_train' },
      ] },
      // The weald bleeding over the rim: stone trees among the gulfs.
      { name: 'petrified fringe', layout: [
        { kind: 'petrified_tree', count: [6, 10] },
        { kind: 'petrified_trunk', count: [2, 4] },
        { kind: 'rocks', count: [4, 7], radius: [18, 38] },
        { kind: 'rock_spire', count: [1, 3] },
        { kind: 'scree', count: [2, 4] },
        { kind: 'cave', count: [1, 3] },
        { kind: 'formation', count: [0, 1], formation: 'petrified_grove' },
      ] },
    ],
    packs: {
      count: [6, 8], size: [3, 5],
      archetypes: [
        { weight: 2, size: [5, 8] },
        { weight: 5, size: [3, 5] },
        { weight: 3, size: [1, 2] },
      ],
      table: [
        { id: 'karst_slinger', weight: 4 },
        { id: 'basilisk', weight: 3 },
        { id: 'scree_skitter', weight: 3 },
        { id: 'scree_shambler', weight: 2, presence: { from: 4 } },
        { id: 'rockgrub', weight: 2 },
        { id: 'stalagmite_lurker', weight: 1, presence: { from: 5 } },
        { id: 'petrified_warden', weight: 1, presence: { from: 8 } },
        // The WEIGHT LESSON pair (the mass fabric, engine/mass.ts): the
        // charging avalanche and the knee-high anchor walk their home turf.
        { id: 'sarsen_ram', weight: 2, presence: { from: 5 } },
        { id: 'lode_thrall', weight: 1, presence: { from: 4 } },
        { id: 'shard_spire', weight: 1, presence: { from: 8, fadeIn: 4 } },
        { id: 'stone_sentinel', weight: 1, presence: { from: 10 } },
      ],
    },
    spawnerId: 'grub_clutch',
    objectives: [
      { kind: 'clear', weight: 3 },
      { kind: 'bounty', weight: 2 },
      { kind: 'escape', weight: 2 },
      { kind: 'beacon', weight: 1 },
      { kind: 'spawners', weight: 1 },
      { kind: 'circuit', weight: 1 },
    ],
    // Rooms-heavy under the Reach: hollow wall mass for secret doors, and
    // the crag rim carries hollows of its own (crevice shafts = deeper yet).
    caveLayouts: { plains: 3, rooms: 3, dungeon: 1.5, labyrinth: 1 },
    hollows: {
      count: [1, 2],
      table: { cache_hollow: 3, ambush_hollow: 2, vein_hollow: 2, crevice_hollow: 1.5, passage_hollow: 1 },
    },
  },

  // THE PETRIFIED WEALD (heart, forceLayout 'forest'): the forest recipe
  // planted in STONE — a canopy that never burns and never sways, brittle
  // trees that SHATTER into shard squalls when struck (cover is permanent
  // except where YOU break it), watcher stones building the petrify ladder
  // through the gaze fabric, and every stone TOLLING when hit (resonance):
  // fighting quietly is a build consideration here.
  petrified_weald: {
    id: 'petrified_weald',
    depthAffinity: { from: 0.35, fadeIn: 0.3 },
    // PARKLAND, not forest: the weald is a PATCHWORK — discrete stone STANDS
    // (each a knitted veil pocket and a resonance alarm-unit: shatter your
    // own clump and that stand's ground rings) on open karst pavement
    // studded with lone spires. Deliberately unlike the Forest/Gloamwood
    // sealed roofs — the open floor is the basilisk's dueling ground, the
    // stands are the cover you SPEND.
    forceLayout: 'parkland',
    layoutParams: {
      parklandGroves: [7, 11],
      parklandGroveR: [130, 230],
      // Stands: the BRITTLE trees clump (destructible cover, named by the
      // cracked silhouette); hearts are the unbreakable elders; a watcher
      // stone seeds ~a third of the hearts so deep stands carry the gaze.
      // Both tree kinds BAKE (trunk bakeWhole + stoneCrown in
      // CANOPY_STATIC) — the stands cost what any crowns cost.
      parklandTrees: [{ kind: 'petrified_tree', weight: 1, radius: [30, 46] }],
      parklandHearts: [{ kind: 'petrified_elder', weight: 1, radius: [46, 60] }],
      parklandHeartExtra: { kind: 'watcher_stone', chance: 0.35, radius: [14, 19] },
      // Pavement: the INDESTRUCTIBLE punctuation between the breakable
      // clumps — stalagmite pinnacles (the Shilin stone-forest read), karst
      // spires, old stones, downed boles. Count stays MODEST on purpose:
      // the boulder spire family paints live (the 29.2ms lesson — never
      // plant an unbaked kind at forest density).
      parklandFloor: [
        { kind: 'stalagmite', weight: 3, radius: [16, 30] },
        { kind: 'rock_spire', weight: 2, radius: [14, 24] },
        { kind: 'petrified_trunk', weight: 2, radius: [16, 24] },
        { kind: 'standing_stone', weight: 1, radius: [12, 18] },
        { kind: 'basalt_column', weight: 1, radius: [15, 24] },
      ],
      parklandFloorN: [26, 44],
    },
    compositions: [
      { composition: 'weald_court', chance: 0.35 },
      { composition: 'stone_sanctum', chance: 0.12 },
    ],
    nameFirst: ['Petrified', 'Silent', 'Grey', 'Unfalling', 'Stone-Crowned', 'Lichened', 'Watchful', 'Fossil', 'Breathless', 'Elder', 'Ashen', 'Ringing'],
    nameSecond: ['Weald', 'Wood', 'Stand', 'Grove', 'Forest', 'Boles', 'Crowns', 'Thicket', 'Copse', 'Hall'],
    theme: {
      dayLight: 1.05, nightDark: 0.7,
      ambientFx: [{ kind: 'motes', intensity: 0.4, color: '#b8b0a0' }],
      // THE GAZE, pointed at the Karst ladder: watcher stones build
      // petrifying (slow, stack by stack) toward the brief stone statue.
      // Counterplay is the fabric's own: break line of sight, press inside
      // closeReach (the eye lids shut), or burst the watcher — which TOLLS.
      gaze: { kinds: ['watcher_stone'], reach: 190, closeReach: 70, status: 'petrifying', lureRadius: 600 },
      ground: {
        scale: 1.2, stretchX: 1.0, strength: 1.1, speckles: 0.6, evenness: 0.5,
        palette: ['#1e1c16', '#2e2b22', '#403c30', '#514c3c', '#5f5a48'], bias: 0.5, alpha: 0.5,
        clearing: { reach: 140, lift: 0.3 },
      },
      floor: '#181610', grid: '#262214', border: '#8a8272',
      obstacle: '#68624f', obstacleEdge: '#948c76', accent: '#c8b878',
      tree: '#8a857a',
    },
    sizeW: [3000, 4000], sizeH: [2200, 3000], ellipseChance: 0, biome: 'karst', sky: 'open',
    // FURNITURE ONLY — the forest recipe plants the stone roof itself.
    layout: [
      { kind: 'petrified_trunk', count: [4, 8] },
      { kind: 'watcher_stone', count: [2, 4] },
      { kind: 'rock_spire', count: [2, 5] },
      { kind: 'rocks', count: [3, 6], radius: [18, 38] },
      { kind: 'scree', count: [2, 4] },
      { kind: 'cave', count: [0, 2] },
      { kind: 'formation', count: [1, 2], formation: 'petrified_grove' },
      { kind: 'camp', count: [0, 1] },
    ],
    common: [
      // No reserved glades: parkland ground is ALREADY the open — courts and
      // set-pieces seat themselves between the stands.
      { kind: 'bone_pile', count: [0, 2] },
    ],
    variants: [
      // The court-dense roll: the wood is WATCHING.
      { name: 'watchers', layout: [
        { kind: 'watcher_stone', count: [4, 7] },
        { kind: 'petrified_trunk', count: [3, 6] },
        { kind: 'rocks', count: [2, 4], radius: [16, 34] },
        { kind: 'scree', count: [2, 4] },
        { kind: 'cave', count: [0, 1] },
        { kind: 'formation', count: [1, 2], formation: 'petrified_grove' },
      ] },
      // The storm-toppled roll: half the stand is already down — low cover
      // country, shoot-overs everywhere, shard squalls waiting in the rest.
      { name: 'shattered brake', layout: [
        { kind: 'petrified_trunk', count: [8, 14] },
        { kind: 'watcher_stone', count: [1, 3] },
        { kind: 'scree', count: [4, 6] },
        { kind: 'rocks', count: [3, 5], radius: [16, 34] },
        { kind: 'cave', count: [0, 2] },
      ] },
    ],
    packs: {
      count: [6, 8], size: [3, 5],
      archetypes: [
        { weight: 2, size: [6, 9] },
        { weight: 5, size: [3, 5] },
        { weight: 3, size: [1, 2] },
      ],
      table: [
        { id: 'basilisk', weight: 4 },
        { id: 'petrified_warden', weight: 2, presence: { from: 6 } },
        { id: 'scree_shambler', weight: 2, presence: { from: 4 } },
        { id: 'scree_skitter', weight: 2 },
        { id: 'karst_slinger', weight: 2 },
        { id: 'lumen_wisp', weight: 1, presence: { to: 12, fadeOut: 6 } },
        { id: 'stone_sentinel', weight: 1, presence: { from: 10 } },
      ],
    },
    spawnerId: 'grub_clutch',
    objectives: [
      { kind: 'clear', weight: 3 },
      { kind: 'beacon', weight: 2 },
      { kind: 'bounty', weight: 1 },
      { kind: 'escape', weight: 1 },
      { kind: 'spawners', weight: 1 },
      { kind: 'circuit', weight: 1 },
    ],
    caveLayouts: { plains: 4, rooms: 2.5, dungeon: 1.5 },
  },

  // THE CRYSTAL COUNTRY — prismatic shard fields (biome:'crystal'), the
  // ATTUNEMENT biome. Three fabrics meet here: the old laser dance stays
  // (crystal doodads fire crystal_beam — a place that keeps you moving),
  // freestanding RESONANT CRYSTALS take the color of the blows that land
  // on them and pulse it over friend and foe alike (engine/tuning.ts),
  // and the country poses RIDDLES (engine/puzzles.ts — chords, lattices,
  // refrains) as side-finds or the zone's own ask. Three faces: the open
  // SHARD STEPPES (base — the beam-dance), the enclosed GEODE HOLLOWS
  // (reef walls; the treasure is inside the teeth), and the SINGING
  // SPIRES (a tolling needle country — noise is the tax on violence:
  // every struck spire turns the zone's head, the karst resonance fabric
  // wearing glass).
  crystal: {
    id: 'crystal', biome: 'crystal',
    compositions: [
      { composition: 'energist_cache', chance: 0.25 },
      { composition: 'resonance_court', chance: 0.3 },
    ],
    nameFirst: ['Prismatic', 'Shardbound', 'Glittering', 'Faceted', 'Resonant', 'Lucent', 'Refractive', 'Gleaming', 'Crystalline', 'Spectral', 'Glassgrown', 'Iridescent', 'Singing', 'Brilliant', 'Geodebound', 'Glasswrought', 'Sparkling', 'Light-Riven'],
    nameSecond: ['Geode', 'Spires', 'Lattice', 'Vault', 'Reach', 'Hollow', 'Shards', 'Facets', 'Cluster', 'Prism', 'Spindle', 'Fields', 'Cavern', 'Array', 'Bloom', 'Drift'],
    theme: {
      ambientDark: 0.3,
      // Crystal country cracks DEEP (the pitfall fabric): chasms descend.
      pitfall: { kind: 'descend' },
      floor: '#0e1320', grid: '#16203a', border: '#4a6aa8',
      obstacle: '#2a3a6a', obstacleEdge: '#5a7ad0', accent: '#9fd8ff', water: '#1a3a6a',
      ground: {
        palette: ['#0a0e1a', '#101828', '#182238', '#22304a', '#2c3e5e'],
        bias: 0.46, alpha: 0.5, speckles: 1.5,
      },
      // Light on glass: motes drift like caught refractions and a faint
      // aurora sheets the sky — the country reads prismatic before a
      // single crystal is on screen.
      ambientFx: [
        { kind: 'motes', color: '#9fd8ff' },
        { kind: 'aurora', intensity: 0.45 },
      ],
      // Glass throws thin shadow — crystal bodies shade lighter than stone.
      sightVeil: { doodadMul: 0.75 },
    },
    sizeW: [2200, 3000], sizeH: [1600, 2300], ellipseChance: 0.2,
    // What the country ALWAYS is, whichever face rolls: understory lattice,
    // surfacing veins, the odd split geode, loose stone between.
    common: [
      { kind: 'crystal_cluster', count: [2, 4] },
      { kind: 'crystal_vein', count: [1, 3] },
      { kind: 'geode_shell', count: [1, 2] },
      { kind: 'rocks', count: [2, 4], radius: [18, 34] },
      { kind: 'scree', count: [1, 2] },
    ],
    // Base face — THE SHARD STEPPES: open ground, the laser dance, a lode
    // line breaking the surface, a needle or two on the skyline.
    layout: [
      { kind: 'crystal', count: [5, 8] },
      { kind: 'cliff', count: [1, 3] },
      { kind: 'crystal_spire', count: [1, 3] },
      { kind: 'formation', count: [1, 2], formation: 'crystal_run' },
    ],
    variants: [
      // GEODE HOLLOWS — the country closed over its treasure: reef walls
      // of needle and lattice, geodes tucked in their lee, deeper shadow.
      { name: 'geode hollows',
        theme: { ambientDark: 0.34, accent: '#8fc8f0',
          ground: { palette: ['#090c16', '#0e1422', '#141e30', '#1c2a42', '#263854'], bias: 0.44, alpha: 0.55, speckles: 1.2 } },
        layout: [
          { kind: 'formation', count: [2, 3], formation: 'shard_reef' },
          { kind: 'crystal', count: [3, 6] },
          { kind: 'geode_shell', count: [2, 4] },
          { kind: 'cliff', count: [2, 4] },
          { kind: 'chasm', count: [0, 1] },
        ] },
      // SINGING SPIRES — the needle country: taller, brighter, LOUDER —
      // every strike answered (spire resonance), storm-glass crackling
      // between the verses.
      { name: 'singing spires',
        theme: { accent: '#b8e4ff',
          ambientFx: [{ kind: 'motes', color: '#b8e4ff' }, { kind: 'aurora', intensity: 0.6 }],
          ground: { palette: ['#0b101e', '#121a2c', '#1a2640', '#243452', '#304468'], bias: 0.48, alpha: 0.5, speckles: 1.7 } },
        layout: [
          { kind: 'crystal_spire', count: [6, 10] },
          { kind: 'formation', count: [1, 2], formation: 'spire_chorus' },
          { kind: 'crystal', count: [3, 5] },
          { kind: 'charged_crystal', count: [2, 4] },
          { kind: 'static_bloom', count: [2, 4] },
        ] },
    ],
    // The ambient VOICES (engine/tuning.ts): strike one with an element and
    // the pulse washes friend and foe alike — the fight bends around them.
    scenery: [{ monster: 'resonant_crystal', count: [3, 5] }],
    // The riddle repertoire (engine/puzzles.ts): side-finds, and the pool
    // the 'puzzle' objective draws from.
    puzzles: [
      { id: 'great_chord', chance: 0.3 },
      { id: 'charged_lattice', chance: 0.25 },
      { id: 'singing_refrain', chance: 0.25 },
      { id: 'shatter_chord', chance: 0.12 },
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
        // THE CRYSTALKIN (the attunement pass): the glass court proper —
        // presence rides each def, so the court arrives with level.
        { id: 'facet_stalker', weight: 2 },
        { id: 'chime_haunt', weight: 2 },
        { id: 'geode_shellback', weight: 1 },
        { id: 'discord_siren', weight: 1 },
      ],
    },
    spawnerId: 'resonant_stone',
    objectives: [{ kind: 'clear', weight: 3 }, { kind: 'puzzle', weight: 2 }, { kind: 'spawners', weight: 2 }, { kind: 'beacon', weight: 1 }, { kind: 'bounty', weight: 1 }],
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
      // A volcanic chasm opens onto the country's own underworks (the
      // pitfall fabric — the magma galleries' anchor affinity makes the
      // stratum below likelier to glow).
      pitfall: { kind: 'descend' },
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
    // realm:'aetherial' keeps it IN its own dimension's biome pools — the
    // surface exclusion alone starved the realm palette and every aetherial
    // mint fell back to the inherited hell-corridor tileset.
    frontier: false, realm: 'aetherial',
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
    frontier: false, realm: 'aetherial', // realm tileset (see aether) — launch-gated, melts underfoot
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
    frontier: false, realm: 'aetherial', // realm tileset (see aether) — the torn lattice ejects a blind walker
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

  // THE VESPERLANDS — the Aetherial's cosmos face: firmament-glass isles
  // that hold forever, and everything BETWEEN them answering the sky. The
  // day/night country: sunbridges by light, star-spans by dark, prism-spans
  // under rain, veiled ways for the faithful (engine/spans.ts + the
  // radiance fabric), and COMET LANES streaking the void meadows at night
  // (the cometfall front, radiance-gated). The realm's ephemeral thesis at
  // its purest: the same zone is two different countries by sun and by
  // star, within one visit.
  aether_vesper: {
    id: 'aether_vesper',
    frontier: false, realm: 'aetherial', // realm tileset (see aether) — reached by the realm's own web
    perfProbe: true, // stable arteries hold a blind walker — honest to sweep
    biome: 'aether_vesper',
    nameFirst: ['Vesper', 'Evenfall', 'Starfield', 'Twilight', 'Auroral', 'Midnight', 'Eventide'],
    nameSecond: ['Meadows', 'Reaches', 'Walk', 'Shoals', 'Court', 'Verge', 'Passage'],
    theme: {
      floor: '#d8d8ea', grid: '#bcc0da', border: '#8e94b8',
      obstacle: '#e2e2f0', obstacleEdge: '#a2a8cc', accent: '#cfe0ff',
      wall: '#c8ccdf', water: '#9fd8e8',
      // The day/night swing IS this face's identity: bright noons, deep
      // true-dark nights (the star-spans' own hour).
      dayLight: 1.2, nightDark: 0.72, heat: 0.3,
      ground: {
        palette: ['#a8aac8', '#bcbcd6', '#cfcfe4', '#e0dff0', '#f0eef8'],
        bias: 0.58, alpha: 0.56, scale: 1.55, strength: 0.9, speckles: 0.35, evenness: 0.3,
      },
      ambientFx: [
        { kind: 'motes', color: '#e8eeff', intensity: 0.9 },
        { kind: 'aurora', color: '#a8b8f0', intensity: 0.5 },
      ],
      fog: { banks: [1, 3], kinds: [{ id: 'aether_veil' }] },
      understory: 'cloudsea',
      // THE SPANS (engine/spans.ts): what stands is the sky's decision.
      // Sunbridges die under a true storm (radiance 0.5 < 0.55) and at
      // night; star-spans hold through night AND a starfall's lifted dark
      // (floor 0.32 ≤ 0.35); prisms exist only while the sky weeps. The
      // twilight gap (0.35–0.55) is deliberate: at dusk and dawn only the
      // glass and the veiled ways hold — the crossing thins twice a day.
      spans: [
        { region: 'span_sun', when: { radiance: { from: 0.55 } } },
        { region: 'span_star', when: { radiance: { to: 0.35 } } },
        { region: 'span_prism', when: { weather: ['rain', 'storm'] } },
      ],
      // THE COMET MEADOWS: night lanes of cometfall streaking the voids —
      // no ambient pockets, lanes only, and only while the dark holds.
      creep: {
        pockets: [0, 0],
        kinds: [{ id: 'cometfall' }],
        fronts: [
          { id: 'cometfall', line: [1, 1], delay: [6, 14], waves: [12, 22], when: { radiance: { to: 0.35 } } },
          { id: 'cometfall', line: [1, 2], delay: [18, 30], waves: [16, 28], when: { radiance: { to: 0.2 } } },
        ],
      },
    },
    sizeW: [2300, 3200], sizeH: [1700, 2400], ellipseChance: 0,
    forceLayout: 'aether_vesper',
    layout: [
      // The country's arranged furniture first (clear extents before the
      // scatter fills in): the roads explain themselves at night, and some
      // isle keeps its instruments (data/formations.ts, both siteWalk —
      // the isles are the only ground here).
      { kind: 'formation', formation: 'star_procession', count: [1, 2] },
      { kind: 'formation', formation: 'observatory_ring', count: [0, 1] },
      { kind: 'cloud_billow', count: [5, 8] },
      { kind: 'star_lantern', count: [4, 7] },
      { kind: 'nightbloom_tuft', count: [5, 9] },
      { kind: 'comet_shard', count: [3, 6] },
      { kind: 'moonwell', count: [1, 2] },
      { kind: 'sundial_gnomon', count: [1, 3] },
      { kind: 'orrery_stand', count: [1, 3] },
      { kind: 'aether_crystal', count: [2, 4] },
    ],
    common: [
      { kind: 'clearing', count: [1, 2], radius: [80, 120] },
    ],
    variants: [
      // EVENTIDE SHOALS: the gentle face — long golden light, one lazy
      // comet lane, the observatory left mid-question.
      {
        name: 'eventide shoals',
        layout: [
          // THE observatory face: the ring is the promise the blurb makes.
          // Several attempts: the isles' artery-ribboned interiors shed a
          // poorly seated arc (and occasionally null the site), and the face
          // must not roll instrument-less — extra arcs read as MORE
          // observatory, never as clutter, on isles this sparse.
          { kind: 'formation', formation: 'observatory_ring', count: [2, 3] },
          { kind: 'formation', formation: 'star_procession', count: [1, 2] },
          { kind: 'cloud_billow', count: [6, 9] },
          { kind: 'star_lantern', count: [5, 8] },
          { kind: 'nightbloom_tuft', count: [4, 7] },
          { kind: 'sundial_gnomon', count: [2, 4] },
          { kind: 'orrery_stand', count: [2, 4] },
          { kind: 'moonwell', count: [1, 2] },
          { kind: 'flowers', count: [1, 3] },
        ],
        theme: {
          accent: '#ffd9a0', dayLight: 1.3, nightDark: 0.66,
          creep: {
            pockets: [0, 0],
            kinds: [{ id: 'cometfall' }],
            fronts: [
              { id: 'cometfall', line: [1, 1], delay: [10, 20], waves: [18, 30], when: { radiance: { to: 0.3 } } },
            ],
          },
        },
      },
      // MIDNIGHT MEADOWS: the Frogger face — wide void gaps, three comet
      // lanes, and the dark arriving with teeth. Star country proper.
      {
        name: 'midnight meadows',
        layout: [
          // Star country proper: the processions' own hour (no observatory —
          // this face deliberately carries no instruments).
          { kind: 'formation', formation: 'star_procession', count: [2, 3] },
          { kind: 'cloud_billow', count: [4, 7] },
          { kind: 'star_lantern', count: [5, 9] },
          { kind: 'nightbloom_tuft', count: [7, 12] },
          { kind: 'comet_shard', count: [5, 9] },
          { kind: 'moonwell', count: [1, 3] },
        ],
        theme: {
          accent: '#a8b8f0', dayLight: 1.05, nightDark: 0.78,
          ground: {
            palette: ['#9092b8', '#a4a6c8', '#babadA', '#d0cfe8', '#e4e2f4'],
            bias: 0.54, alpha: 0.58, scale: 1.5, strength: 0.95, speckles: 0.42, evenness: 0.28,
          },
          ambientFx: [
            { kind: 'motes', color: '#dce6ff', intensity: 1.2 },
            { kind: 'aurora', color: '#8fa0e8', intensity: 0.65 },
          ],
          creep: {
            pockets: [0, 0],
            kinds: [{ id: 'cometfall' }],
            fronts: [
              { id: 'cometfall', line: [1, 1], delay: [5, 10], waves: [10, 18], when: { radiance: { to: 0.35 } } },
              { id: 'cometfall', line: [1, 2], delay: [12, 20], waves: [12, 22], when: { radiance: { to: 0.3 } } },
              { id: 'cometfall', line: [2, 2], delay: [24, 36], waves: [16, 26], when: { radiance: { to: 0.15 } } },
            ],
          },
          spans: [
            { region: 'span_sun', when: { radiance: { from: 0.55 } } },
            { region: 'span_star', when: { radiance: { to: 0.4 } } },
            { region: 'span_prism', when: { weather: ['rain', 'storm'] } },
          ],
        },
      },
      // PRISM REACH: the rain-loving face — mist in the basins, span-lace
      // leaning hard toward prisms and veils (the storm is the key).
      {
        name: 'prism reach',
        layout: [
          // The country-wide habit rides every face (the instruments don't —
          // the rain face keeps its wells and glass).
          { kind: 'formation', formation: 'star_procession', count: [1, 2] },
          { kind: 'cloud_billow', count: [6, 9] },
          { kind: 'star_lantern', count: [4, 7] },
          { kind: 'nightbloom_tuft', count: [5, 8] },
          { kind: 'moonwell', count: [2, 3] },
          { kind: 'aether_crystal', count: [3, 6] },
          { kind: 'flowers', count: [1, 2] },
        ],
        layoutParams: {
          spanKinds: [
            { kind: 'span_prism', w: 4 },
            { kind: 'span_veiled', w: 3 },
            { kind: 'span_sun', w: 2 },
            { kind: 'span_star', w: 2 },
          ],
          spanLinks: [3, 5],
        },
        theme: {
          accent: '#b8e0c8', dayLight: 1.12, nightDark: 0.7,
          fog: { banks: [2, 4], kinds: [{ id: 'aether_veil', weight: 2 }, { id: 'mist' }] },
        },
      },
    ],
    // The cosmos kin keep this country; the wind's and the Host's own pass
    // through on their errands (RELATIONS makes vesperkin × zephyrid ground
    // fight itself — the hounds hunt the grazers' cousins).
    packs: {
      count: [3, 5], size: [2, 4],
      archetypes: [
        { weight: 3, size: [4, 7] },  // a swarm of moths / a grazing herd
        { weight: 5, size: [2, 4] },  // the standard constellation
        { weight: 3, size: [1, 2] },  // one heavy body and its shadow
      ],
      table: [
        { id: 'lumen_moth', weight: 4 },
        { id: 'star_grazer', weight: 3 },
        { id: 'comet_hound', weight: 3, presence: { from: 9, fadeIn: 4 } },
        { id: 'void_angler', weight: 2, presence: { from: 10, fadeIn: 4 } },
        { id: 'orrery_keeper', weight: 2, presence: { from: 11, fadeIn: 4 } },
        { id: 'noctarch_of_the_wane', weight: 0.6, presence: { from: 13, fadeIn: 5 } },
        // Guests: the wild sky drifts through the meadows.
        { id: 'cloud_grazer', weight: 1.5, presence: { to: 16, fadeOut: 7 } },
        { id: 'mistwing_shrike', weight: 1, presence: { from: 9, fadeIn: 4 } },
        { id: 'cherub_wisp', weight: 1 },
      ],
    },
    spawnerId: 'bone_altar', // never rolled (no 'spawners' objective up here)
    objectives: [{ kind: 'clear', weight: 3 }, { kind: 'escape', weight: 1 }],
    compositions: [
      { composition: 'choir_ring', chance: 0.2 },
    ],
  },

  // THE FIRMAMENT — the Aetherial's sanctum face: the gate zone's tileset
  // (biome 'aether_sanctum' resolves here). The same lattice run dense and
  // UNBROKEN — wide causeways, no sky-holes, and NO CollapseSpec: this
  // ground holds. The waypoint home the shelves are crossed to reach.
  aether_sanctum: {
    id: 'aether_sanctum',
    frontier: false, realm: 'aetherial', // realm tileset (see aether) — reached by the Ascent, not frontiers
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

/** dimension id → biome id → the REALM tileset ids that wear it (TilesetDef
 *  .realm). A dimension's mints see the UNION of this and the surface pool:
 *  hell keeps riding shared frontier tilesets (its demon-warp zones mint the
 *  same wasteland on the surface), while the Aetherial's launch-gated faces
 *  stay invisible to every surface roll yet field their own country. */
export const REALM_TILESETS_BY_BIOME: Record<string, Record<string, string[]>> = (() => {
  const m: Record<string, Record<string, string[]>> = {};
  for (const t of Object.values(TILESETS)) {
    if (!t.biome || !t.realm) continue;
    ((m[t.realm] ??= {})[t.biome] ??= []).push(t.id);
  }
  return m;
})();

/** A seeded tileset choice for a field biome (so deepwood/jungle/meadow all stay
 *  reachable for 'grove', and the pick is deterministic per the zone's rng).
 *  Undefined when the biome has no frontier tileset (caller falls back).
 *
 *  When the caller knows the mint's biomeDepth AND any candidate declares a
 *  depthAffinity, faces weigh themselves by their envelope at that depth —
 *  the sub-biome staging pick (desert: waste rim → erg heart). A candidate's
 *  geoAffinity folds the mint's BAKED climate the same way (the mountain
 *  country's per-range snow lock). Biomes whose faces declare no envelopes
 *  keep the plain uniform pick, byte-identical. */
export function pickTilesetForBiome(
  biome: string, rng: Rng, depth?: number, realm?: string,
  climate?: Record<string, number>,
): string | undefined {
  // A realm caller (spec.dimension mints, the gate mint) widens the pool with
  // its OWN tilesets (TilesetDef.realm) — the surface pool alone starved any
  // biome whose faces are all realm-locked (the wasteland-Firmament defect).
  const shared = TILESETS_BY_BIOME[biome];
  const owned = realm ? REALM_TILESETS_BY_BIOME[realm]?.[biome] : undefined;
  const c = owned?.length ? (shared?.length ? [...shared, ...owned] : owned) : shared;
  if (!c || !c.length) return undefined;
  const staged = depth !== undefined && c.some(id => TILESETS[id].depthAffinity);
  const geoed = !!climate && c.some(id => TILESETS[id].geoAffinity);
  if (!staged && !geoed) return rng.pick(c);
  const weights = c.map(id => {
    const t = TILESETS[id];
    const dAff = t.depthAffinity && depth !== undefined ? presenceMul(t.depthAffinity, depth) : 1;
    const gAff = t.geoAffinity && climate ? climateAffinity(t.geoAffinity, climate) : 1;
    return dAff * gAff;
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

/** The tileset a PORT mints as, inside `biome`: DOCK-WEIGHTED faces only
 *  (TilesetDef.docks), each weighed docks × depthAffinity at `depth` — so
 *  harbors grow on a country's landward faces and never on ground that
 *  takes no pilings. Undefined when the biome fields no dockable face (the
 *  caller falls back to PORT_MINT.fallbackBiome). Mirrors
 *  pickTilesetForBiome's envelope algebra on the same seeded stream. */
export function pickDockTileset(biome: string, rng: Rng, depth?: number): string | undefined {
  const c = (TILESETS_BY_BIOME[biome] ?? []).filter(id => (TILESETS[id].docks ?? 0) > 0);
  if (!c.length) return undefined;
  const weights = c.map(id => {
    const t = TILESETS[id];
    const aff = t.depthAffinity && depth !== undefined ? presenceMul(t.depthAffinity, depth) : 1;
    return (t.docks ?? 0) * aff;
  });
  let total = 0;
  for (const w of weights) total += w;
  // Degenerate weighting (every envelope zero here) still hosts the harbor.
  if (total <= 0) return rng.pick(c);
  let roll = rng.range(0, total);
  for (let i = 0; i < c.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return c[i];
  }
  return c[c.length - 1];
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
  gloamwood:      { title: 'Gloamwood',         blurb: 'Fog is territory here. Roaming banks feed the things that hunt from within them — bait them into the open, or ride the same murk unseen. The heart of the gloam country: the feral crofts lie back toward the light, the estates deeper in.' },
  hallowfield:    { title: 'The Hallowfield',   blurb: 'The harvest that no one gathered: oak stands with carved lanterns glowing under the canopies, pumpkin patches ranked to the fence lines — and some of the pumpkins were never pumpkins, and some of the scarecrows turn their heads. The Carven Court keeps these rows now.' },
  mournstead:     { title: 'The Mournstead',    blurb: 'The estate at the wood\'s heart. Iron boundaries and topiary walks losing to the trees, lamps lit on lanes that go nowhere, the family plot with its pale sealed door — and the manor itself, which is bigger inside than the map.' },
  gloam_manor:    { title: 'Gloam Manor',       blurb: 'The house put to sleep: sheeted furniture that billows when you cross the room, the family framed and watching, candles nobody snuffs — and the Lady keeping the attic, at the top of a stair that should not fit inside.' },
  taiga:          { title: 'Taiga',             blurb: 'Close, hushed conifer dark — deep drifts, frozen pools, and the firewood caches of travelers who never came back, the aurora breathing overhead.' },
  tundra:         { title: 'Tundra',            blurb: 'A frozen expanse under a permanent floor of snow, where every storm deepens the drifts and the cover never fully melts away.' },
  cinderlands:    { title: 'Cinderlands',       blurb: 'Scorched black flats where fire has already passed — ash, ember and the heat-shimmer of a land still cooling from the burn.' },
  desert:         { title: 'Scoured Waste',     blurb: 'The desert country\'s outskirts, where sand still argues with stone — scrub cactus, split rock, gnoll war-camps, and the first ridge lines marching in from the deep erg.' },
  sandsea:        { title: 'Sand-Sea',          blurb: 'The Great Erg: a sea with a grain. Ridge after wind-combed ridge to the horizon, soft lees that swallow your stride, and an oasis exactly often enough to keep you believing the next shimmer.' },
  saltflat:       { title: 'Glasspan',          blurb: 'A dead lake remembered as a floor — cracked white hardpan, lightning fused to glass, salt pillars for a forest, and no shade anywhere the sun can reach.' },
  hivesands:      { title: 'The Hivesands',     blurb: 'The chitin country: a scouring dune-hive where the seethe works below the sand — hive-spires crowning the ridges, egg clutches and molt-husk flats between them, and a sky that is usually already moving.' },
  jungle:         { title: 'Jungle',            blurb: 'Choked living thicket — walls of growth that block step, shot AND sight, cuttable throats plugged with brush and dens waiting behind them.' },
  karst_reach:    { title: 'The Karst Reach',   blurb: 'An above-ground cavern country: the maze is the NEGATIVE space — branching chasms shots sail over and bodies walk around, no bridge anywhere, and more ways down than any land above ground.' },
  petrified_weald: { title: 'The Petrified Weald', blurb: 'A wood that died standing, in STANDS — clumped stone copses on open karst pavement between lone pinnacles. The clumps are cover that shatters (and RINGS) where you break it; the elders and the spires never fall; the watcher-stones stare from the deep stands.' },
  buried_vault:   { title: 'Buried Vault',      blurb: 'A dead village’s underworks below the erg — dressed sandstone halls the dunes preserved, garrisoned by vermin, the risen, and whatever the urns were keeping.' },
  sepulcher_sands: { title: 'Sepulcher Sands',  blurb: 'The tomb-dynasty’s country under the deep desert: dune-drift washing into bone-country hall by hall, and the Sand Sarcophate standing its eternal watch between them.' },
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
  strand:         { title: 'The Strand',        blurb: 'The littoral country\'s walkable rim: dune-grass, tide pools and the wrack line — the last dry footing before the land starts going under.' },
  brine_flats:    { title: 'Brine Flats',       blurb: 'The drained seabed between shore and Deep: salt pans in cracked mud, bleached reef heads, whale-fall arches — and caustic sinks where the sea still seeps back in.' },
  mangrove_tangle: { title: 'Mangrove Tangle',  blurb: 'The flooded inner coast: stilt-root galleries over brackish channels, wading at every turn — the Coilborn\'s home water, where the ground itself fights for its landlords.' },
  drowned_margin: { title: 'Drowned Margin',    blurb: 'Ground already half inside the sea — wading bars, kelp forest in the surf, drowned works of an older coast, and the Deep ashore in force. As far as the land goes.' },
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
  shipdeck:       { title: 'The Wraithsail',    blurb: 'The ghost ship\'s own boards, boarded at open sea — the Drowned Court musters deck by deck, the hold keeps the Drowned Register, and the Tidebound Regent waits in the great cabin. She goes down with him.' },
  highland:       { title: 'The Mountain Pass', blurb: 'Windswept crags carved into a mountain-pass maze of corridors and chambers threaded between the standing rock — the middle of the climb, where the boulders start finding you.' },
  foothills:      { title: 'The Foothills',     blurb: 'The pinewood foot of the range: open drove country under spread-out stands, the mountain\'s own bones rising through the timber, and the first cold dust on a range that crowns white.' },
  overpass:       { title: 'The Overpass',      blurb: 'The precarious crossing: broad ledge shelves hanging over the gorge, narrow worn corridors between them, boulders on the roll and a mountainside that sometimes lets go entirely.' },
  snowcrown:      { title: 'The Snowcrown',     blurb: 'A cold range\'s summit — standing snow, walking drifts, auroras and avalanche weather. In the open you are freezing or you are warming; the waystation fires are the road.' },
  stonecrown:     { title: 'The Stonecrown',    blurb: 'A warm range\'s bald summit — wind-bitten fell, krummholz pine and standing stones, the Horned Tribes throned on the roof of their world. No snow, ever; the gale is the tax.' },
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
  aether_vesper:  { title: 'The Vesperlands',   blurb: 'The cosmos country: glass isles forever, and everything between them answering the sky — sunbridges by day, star-spans by night, rainbows in the rain, and ways you cross on faith alone.' },
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
