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

import type { LandmarkRoll, PackSpec, StampSpec, StructureRoll, ZoneTheme } from './zones';
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
  /** Optional sub-biome variants; one is rolled per generated zone (its layout
   *  replaces the base). Tilesets without variants behave exactly as before. */
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
}

export const TILESETS: Record<string, TilesetDef> = {

  deepwood: {
    id: 'deepwood',
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
      floor: '#0b110b', grid: '#121d12', border: '#2a452a',
      obstacle: '#223c1c', obstacleEdge: '#3a6030', accent: '#8ed45e',
      mud: '#1b2914', chasm: '#030703', water: '#173a4a', wall: '#46371f',
    },
    sizeW: [2400, 3400], sizeH: [1600, 2400], ellipseChance: 0.25, biome: 'grove',
    layout: [
      { kind: 'trees', count: [14, 20], radius: [14, 28] },
      { kind: 'grove', count: [2, 4] },
      { kind: 'brush', count: [2, 4] },
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
    packs: {
      count: [5, 8], size: [3, 5],
      table: [
        { id: 'spitting_horror', weight: 3 },
        { id: 'dune_stalker', weight: 3 },
        { id: 'blood_mite', weight: 2 },
        { id: 'bone_serpent', weight: 2 },
        { id: 'zombie', weight: 2 },
        { id: 'skeleton_archer', weight: 2 },
        { id: 'gloom_stalker', weight: 2 },
        { id: 'crypt_warden', weight: 2 },
        { id: 'fen_hound', weight: 2 },
        { id: 'gnoll_prowler', weight: 2 },
        { id: 'gnoll_butcher', weight: 1 },
        { id: 'thorn_sprite', weight: 2 },
        { id: 'sylvan_warden', weight: 1 },
        { id: 'briar_beast', weight: 1 },
        { id: 'alpha_stalker', weight: 1 },
        { id: 'hex_weaver', weight: 1 },
        { id: 'warband_chieftain', weight: 1 },
        { id: 'brute', weight: 1 },
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

  tundra: {
    id: 'tundra',
    nameFirst: ['Frostbitten', 'Howling', 'Pale', 'Glacial', 'Whitemourn', 'Rimebound', 'Frostfell', 'Hoarfrost', 'Bitterwind', 'Snowbound', 'Wintermourn', 'Bleakhold', 'Sleetborn', 'Coldcairn', 'Stormriven', 'Frostshard', 'Iceveil', 'Numbing'],
    nameSecond: ['Expanse', 'Steppes', 'Wastes', 'Drifts', 'Pass', 'Fields', 'Tundra', 'Floes', 'Hollow', 'Verge', 'Barrens', 'Plateau', 'Hinterland', 'Snowfields', 'Reach', 'Tarn'],
    theme: {
      ground: { scale: 1.9, strength: 0.9, speckles: 0.7 },
      floor: '#0c1115', grid: '#131c24', border: '#33505f',
      obstacle: '#2a4150', obstacleEdge: '#487086', accent: '#8ed0ec',
      mud: '#93b6c8', chasm: '#03060b', water: '#1c4258', wall: '#3e4c58',
    },
    sizeW: [2600, 3600], sizeH: [1700, 2500], ellipseChance: 0.3, biome: 'tundra',
    layout: [
      { kind: 'rocks', count: [8, 14], radius: [22, 46] },
      { kind: 'ice', count: [2, 4] },
      { kind: 'mud', count: [3, 4] },
      { kind: 'cliff', count: [2, 4] },
      { kind: 'river', count: [0, 1] },
      { kind: 'chasm', count: [0, 1] },
      { kind: 'ruin', count: [0, 1] },
      { kind: 'camp', count: [0, 1] },
    ],
    packs: {
      count: [6, 9], size: [3, 6],
      table: [
        { id: 'frost_witch', weight: 3 },
        { id: 'hex_weaver', weight: 2 },
        { id: 'husk_swarmer', weight: 2 },
        { id: 'javelin_skirmisher', weight: 2 },
        { id: 'brute', weight: 2 },
        { id: 'zombie', weight: 2 },
        { id: 'tundra_behemoth', weight: 1 },
        { id: 'lich_marshal', weight: 1 },
        { id: 'storm_acolyte', weight: 1 },
        { id: 'frost_elemental', weight: 2 },
        { id: 'gale_elemental', weight: 2 },
        { id: 'stone_sentinel', weight: 1 },
        { id: 'fen_hound', weight: 2 },
        { id: 'alpha_stalker', weight: 1 },
        { id: 'troll_mauler', weight: 1 },
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
        { id: 'volatile_zealot', weight: 3 },
        { id: 'magma_worm', weight: 2 },
        { id: 'pyroclast_magus', weight: 2 },
        { id: 'storm_acolyte', weight: 2 },
        { id: 'brute', weight: 2 },
        { id: 'bone_colossus', weight: 1 },
        { id: 'warband_chieftain', weight: 1 },
        { id: 'spitting_horror', weight: 1 },
        { id: 'ember_elemental', weight: 3 },
        { id: 'gale_elemental', weight: 1 },
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
        { kind: 'cliff', count: [0, 1] }, { kind: 'ruin', count: [0, 1] },
        { kind: 'cave', count: [0, 1] },
        { kind: 'structure', count: [0, 1], structure: 'faction_war_camp' },
      ] },
      { name: 'oasis', layout: [
        { kind: 'water', count: [2, 3], radius: [40, 70] }, { kind: 'shallows', count: [2, 3] },
        { kind: 'palm', count: [8, 12] }, { kind: 'sand', count: [4, 6] },
        { kind: 'rocks', count: [2, 4], radius: [20, 44] }, { kind: 'grass', count: [1, 2] },
        { kind: 'cave', count: [0, 1] },
        { kind: 'structure', count: [0, 1], structure: 'faction_war_camp' },
      ] },
    ],
    nameFirst: ['Sunscoured', 'Bone-Dry', 'Wind-Carved', 'Mirage', 'Scorchsand', 'Glasswaste', 'Sunbaked', 'Duneshift', 'Saltcrack', 'Heat-Hazed', 'Witherglass', 'Sandlorn', 'Blistering', 'Dustchoke', 'Goldwaste', 'Suncracked', 'Parched', 'Burnglass'],
    nameSecond: ['Dunes', 'Reach', 'Flats', 'Wastes', 'Hollow', 'Expanse', 'Barrens', 'Drift', 'Sands', 'Erg', 'Scour', 'Pan', 'Basin', 'Sprawl', 'Span', 'Verge'],
    theme: {
      ground: { scale: 2.6, stretchX: 2.1, strength: 1.25, speckles: 0.45 },
      floor: '#1a160d', grid: '#2a2418', border: '#7a6438',
      obstacle: '#5c4a2c', obstacleEdge: '#8a6e40', accent: '#e8c060',
      mud: '#6a5630', water: '#2a6a7a', sand: '#c9a86a',
    },
    sizeW: [2600, 3600], sizeH: [1700, 2400], ellipseChance: 0.2, biome: 'desert',
    layout: [
      { kind: 'sand', count: [4, 7] },
      { kind: 'rocks', count: [6, 10], radius: [22, 52] },
      { kind: 'cliff', count: [1, 2] },
      { kind: 'ruin', count: [0, 2] },
      { kind: 'camp', count: [0, 1] },
      { kind: 'cave', count: [0, 2] },
      { kind: 'structure', count: [0, 1], structure: 'faction_war_camp' },
    ],
    packs: {
      count: [6, 8], size: [3, 5],
      table: [
        { id: 'gnoll_prowler', weight: 4 },
        { id: 'gnoll_longshot', weight: 2 },
        { id: 'gnoll_butcher', weight: 2 },
        { id: 'gnoll_howler', weight: 1 },
        { id: 'dune_stalker', weight: 2 },
        { id: 'alpha_stalker', weight: 1 },
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
      { kind: 'palm', count: [12, 18] },
      { kind: 'vines', count: [3, 6] },
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
        { id: 'thorn_sprite', weight: 4 },
        { id: 'sylvan_warden', weight: 2 },
        { id: 'briar_beast', weight: 2 },
        { id: 'grove_singer', weight: 1 },
        { id: 'spitting_horror', weight: 2 },
        { id: 'fen_hound', weight: 1 },
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
    variants: [
      { name: 'sunken grove', layout: [
        { kind: 'trees', count: [8, 12] }, { kind: 'swamp', count: [3, 5] },
        { kind: 'bog', count: [2, 3] }, { kind: 'water', count: [1, 2] },
        { kind: 'vines', count: [2, 3] }, { kind: 'grove', count: [1, 2] },
        { kind: 'rocks', count: [2, 4], radius: [16, 34] }, { kind: 'cave', count: [0, 1] },
        { kind: 'structure', count: [0, 1], structure: 'pillaged_township' },
      ] },
      { name: 'blackwater', layout: [
        { kind: 'water', count: [3, 5] }, { kind: 'bog', count: [4, 6] },
        { kind: 'swamp', count: [2, 4] }, { kind: 'shallows', count: [1, 2] },
        { kind: 'vines', count: [2, 4] }, { kind: 'trees', count: [3, 5] },
        { kind: 'rocks', count: [2, 3], radius: [16, 30] }, { kind: 'cave', count: [0, 1] },
        { kind: 'structure', count: [0, 1], structure: 'pillaged_township' },
      ] },
    ],
    nameFirst: ['Sunken', 'Rotreek', 'Fenmire', 'Blackwater', 'Drownreed', 'Quagmire', 'Stillwater', 'Murkwallow', 'Reekbrack', 'Sludgewater', 'Greenrot', 'Cessmire', 'Gloomwrack', 'Dankmoor', 'Wetrot', 'Slimewater', 'Foulmere', 'Bogshade'],
    nameSecond: ['Bog', 'Fen', 'Marsh', 'Sloughs', 'Swale', 'Lowland', 'Sump', 'Wetland', 'Quag', 'Reeds', 'Shallows', 'Sink', 'Morass', 'Hollow', 'Reach', 'Mudflat'],
    theme: {
      ground: { scale: 1.35, strength: 1.15 },
      floor: '#10140e', grid: '#18201a', border: '#3a4a38',
      obstacle: '#2a3a2c', obstacleEdge: '#46603e', accent: '#8ab060',
      mud: '#1c2a16', water: '#1a3a30', tree: '#2a4a2a',
    },
    sizeW: [2300, 3200], sizeH: [1600, 2300], ellipseChance: 0.2, biome: 'grave',
    layout: [
      { kind: 'swamp', count: [3, 5] },
      { kind: 'bog', count: [2, 4] },
      { kind: 'water', count: [1, 2] },
      { kind: 'vines', count: [2, 4] },
      { kind: 'trees', count: [5, 9] },
      { kind: 'rocks', count: [3, 6], radius: [16, 34] },
      { kind: 'ruin', count: [1, 2] },
      { kind: 'cave', count: [0, 1] },
      { kind: 'structure', count: [0, 1], structure: 'pillaged_township' },
    ],
    packs: {
      count: [5, 7], size: [3, 5],
      table: [
        { id: 'zombie', weight: 3 },
        { id: 'bone_serpent', weight: 3 },
        { id: 'crypt_warden', weight: 2 },
        { id: 'husk_swarmer', weight: 2 },
        { id: 'fen_hound', weight: 2 },
        { id: 'frost_witch', weight: 1 },
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
    nameFirst: ['Blasted', 'Cindertorn', 'Hellcracked', 'Ruinous', 'Emberblight', 'Scorched', 'Riftburnt', 'Ashbroken', 'Brimstone', 'Sulfurous', 'Cracked', 'Desolate', 'Smouldering', 'Wretched', 'Hateforged', 'Slagheap', 'Damnedmarch', 'Charbroken'],
    nameSecond: ['Waste', 'Barrens', 'Scar', 'Reach', 'Expanse', 'Flats', 'Ruin', 'Sprawl', 'Crackland', 'Wreckage', 'Hollow', 'Desolation', 'Cinders', 'Drift', 'Span', 'Wilds'],
    theme: {
      floor: '#15130f', grid: '#231d16', border: '#5c3a28',
      obstacle: '#47291c', obstacleEdge: '#7a452c', accent: '#ff7a40',
      chasm: '#1b0703', mud: '#2b1d12', lava: '#7a1a08', sand: '#6a5638',
    },
    sizeW: [2500, 3500], sizeH: [1600, 2400], ellipseChance: 0.3, biome: 'rift',
    layout: [
      { kind: 'lava', count: [2, 3] },
      { kind: 'ravine', count: [1, 1] },
      { kind: 'rocks', count: [10, 16], radius: [24, 52] },
      { kind: 'cliff', count: [2, 3] },
      { kind: 'sand', count: [1, 2] },
      { kind: 'ruin', count: [0, 2] },
      { kind: 'camp', count: [1, 2] },
      { kind: 'structure', count: [0, 1], structure: 'fortress_gate' },
    ],
    packs: {
      count: [6, 8], size: [3, 5],
      table: [
        { id: 'imp', weight: 3 },
        { id: 'hellhound', weight: 3 },
        { id: 'cinder_fiend', weight: 2 },
        { id: 'searing_spawn', weight: 2 },
        { id: 'dread_fiend', weight: 1 },
        { id: 'brute', weight: 2 },
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

  // CRYPT — a forsaken graveland of headstones, broken tombs, and the risen.
  crypt: {
    id: 'crypt',
    variants: [
      { name: 'barrows', layout: [
        { kind: 'tombstone', count: [18, 26] }, { kind: 'rocks', count: [8, 12], radius: [16, 30] },
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
      floor: '#0d0d12', grid: '#16161f', border: '#3a3a52',
      obstacle: '#2e2e44', obstacleEdge: '#50506e', accent: '#b090d8',
      mud: '#1a1a24', water: '#1c2030',
    },
    sizeW: [2000, 2900], sizeH: [1500, 2200], ellipseChance: 0.15, biome: 'grave',
    layout: [
      { kind: 'tombstone', count: [14, 22] },
      { kind: 'ruin', count: [2, 3] },
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
        { id: 'zombie', weight: 2 },
        { id: 'crypt_warden', weight: 3 },
        { id: 'bone_serpent', weight: 2 },
        { id: 'lich_marshal', weight: 1 },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [
      { kind: 'clear', weight: 3 },
      { kind: 'spawners', weight: 3 },
      { kind: 'waves', weight: 1 },
    ],
  },

  // BEACH — a sun-bleached coast: sand, wading shallows, palms, scattered wilds.
  beach: {
    id: 'beach',
    nameFirst: ['Sunbleached', 'Saltworn', 'Tide-Carved', 'Driftwood', 'Coral', 'Surf-Beaten', 'Foamcrest', 'Seawind', 'Brinewashed', 'Pearl-Strewn', 'Wracklittered', 'Sandscoured', 'Glittering', 'Spraylashed', 'Shellbound', 'Tidefall', 'Saltgrass', 'Lowtide'],
    nameSecond: ['Shore', 'Coast', 'Strand', 'Shallows', 'Cove', 'Bar', 'Beach', 'Reach', 'Spit', 'Foreshore', 'Tideline', 'Sands', 'Bay', 'Inlet', 'Surf', 'Margin'],
    theme: {
      ground: { scale: 2.0, stretchX: 1.6, strength: 1.1, speckles: 0.6 },
      floor: '#15140e', grid: '#221f16', border: '#7a6e44',
      obstacle: '#5c5230', obstacleEdge: '#8a7a48', accent: '#e8d060',
      sand: '#d8c890', water: '#1d6a8a', tree: '#3a6a2a', mud: '#5a5030',
    },
    sizeW: [2400, 3200], sizeH: [1600, 2200], ellipseChance: 0.3, biome: 'beach',
    layout: [
      { kind: 'sand', count: [5, 8] },
      { kind: 'shallows', count: [2, 4] },
      { kind: 'palm', count: [6, 10] },
      { kind: 'water', count: [1, 2] },
      { kind: 'kelp', count: [2, 5] },
      { kind: 'coral', count: [2, 4], radius: [14, 24] },
      { kind: 'rocks', count: [3, 6], radius: [18, 40] },
      { kind: 'cave', count: [0, 1] },
    ],
    packs: {
      count: [5, 7], size: [3, 5],
      table: [
        { id: 'fen_hound', weight: 3 },
        { id: 'blood_mite', weight: 3 },
        { id: 'dune_stalker', weight: 2 },
        { id: 'gnoll_prowler', weight: 2 },
        // The Deep washes ashore in the shallows (a lighter presence than the abyss).
        { id: 'deep_thresher', weight: 2 },
        { id: 'deep_angler', weight: 1 },
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
    nameFirst: ['Sunlit', 'Wildflower', 'Greenhollow', 'Honeybrook', 'Dappled', 'Springmoor', 'Cloverhill', 'Larksong', 'Daisychain', 'Goldengrass', 'Breezy', 'Sweetgrass', 'Buttercup', 'Gentlebrook', 'Verdant', 'Mossglen', 'Petalfall', 'Hazysun'],
    nameSecond: ['Meadow', 'Glade', 'Pasture', 'Vale', 'Downs', 'Greens', 'Lea', 'Field', 'Heath', 'Commons', 'Bloom', 'Reach', 'Dell', 'Sward', 'Clearing', 'Holt'],
    theme: {
      floor: '#0e130c', grid: '#172013', border: '#3a5a2c',
      obstacle: '#2c4a22', obstacleEdge: '#477534', accent: '#9ed060',
      tree: '#3a7a34', grass: '#4e7a34', mud: '#1d2b16', water: '#1a4a54',
    },
    sizeW: [2300, 3200], sizeH: [1600, 2300], ellipseChance: 0.2, biome: 'grove',
    layout: [
      { kind: 'grass', count: [6, 10] },
      { kind: 'trees', count: [8, 14] },
      { kind: 'grove', count: [2, 3] },
      { kind: 'brush', count: [3, 5] },
      { kind: 'water', count: [0, 1] },
      { kind: 'rocks', count: [3, 6], radius: [16, 32] },
      { kind: 'cave', count: [0, 1] },
      { kind: 'structure', count: [0, 1], structure: 'faction_hall' },
    ],
    packs: {
      count: [5, 7], size: [2, 4],
      table: [
        { id: 'thorn_sprite', weight: 3 },
        { id: 'sylvan_warden', weight: 2 },
        { id: 'briar_beast', weight: 1 },
        { id: 'dune_stalker', weight: 2 },
        { id: 'blood_mite', weight: 2 },
        { id: 'fen_hound', weight: 1 },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [
      { kind: 'clear', weight: 3 },
      { kind: 'escape', weight: 2 },
      { kind: 'waves', weight: 2 },
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
        { id: 'fen_hound', weight: 3 },
        { id: 'blood_mite', weight: 3 },
        { id: 'dune_stalker', weight: 2 },
        // The Deep haunts the surrounding shallows of these lonely isles.
        { id: 'deep_thresher', weight: 2 },
        { id: 'deep_angler', weight: 1 },
        { id: 'deep_tidecaller', weight: 1 },
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
      { kind: 'rocks', count: [14, 22], radius: [20, 46] },
      { kind: 'cliff', count: [3, 5] },
      { kind: 'chasm', count: [0, 2] },
      { kind: 'water', count: [0, 1] },
      { kind: 'lava', count: [0, 1] },
    ],
    packs: {
      count: [3, 5], size: [3, 5],
      table: [
        { id: 'fen_hound', weight: 3 },
        { id: 'blood_mite', weight: 3 },
        { id: 'dune_stalker', weight: 2 },
        { id: 'spitting_horror', weight: 1 },
        { id: 'bone_serpent', weight: 1 },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [
      { kind: 'clear', weight: 1 },
    ],
  },

  // DESCENT — the boundless abyss the Delver's mineshaft drops into. Minted as a
  // BOUNDLESS cave (worldgen.mintCave forces boundless + layoutType 'descent'); the
  // sizeW/H is just the STARTER patch the engine streams outward from. Packs the
  // Depthkin. An alien, near-lightless palette — the claustrophobia is the dark.
  descent: {
    id: 'descent', boundless: true, forceLayout: 'descent',
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
        { id: 'depthkin_lurker', weight: 3 },
        { id: 'depthkin_seer', weight: 2 },
        { id: 'depthkin_brute', weight: 1 },
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

  // ABYSSAL — a lightless void: jagged shards, yawning chasms, grasping tendrils.
  abyssal_rift: {
    id: 'abyssal_rift', frontier: false,
    nameFirst: ['Yawning', 'Sunless', 'Hungering', 'Lightless', 'Riven', 'Devouring', 'Gnashing', 'Voidtorn', 'Maddening', 'Eldergloom', 'Soulrent', 'Unmade', 'Screaming', 'Blacktide', 'Annihilent', 'Coilshadow', 'Abyssborn', 'Witherdark'],
    nameSecond: ['Abyss', 'Maw', 'Deep', 'Descent', 'Hollow', 'Rift', 'Gulf', 'Void', 'Throat', 'Sink', 'Chasm', 'Tear', 'Vortex', 'Wound', 'Pit', 'Nadir'],
    theme: {
      ambientDark: 0.45,
      floor: '#0a0610', grid: '#150b20', border: '#3a2150',
      obstacle: '#281838', obstacleEdge: '#5a3a7a', accent: '#b060e8',
      chasm: '#050108', mud: '#160c1e', water: '#1a0f2c', lava: '#5a1c8a',
    },
    sizeW: [1300, 1700], sizeH: [1000, 1300],
    layout: [
      { kind: 'rocks', count: [14, 20], radius: [18, 46] },
      { kind: 'cliff', count: [3, 5] },
      { kind: 'chasm', count: [2, 4] },
      { kind: 'ravine', count: [1, 2] },
      { kind: 'vines', count: [2, 4] },
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
  leyline_nexus: {
    id: 'leyline_nexus', frontier: false,
    nameFirst: ['Resonant', 'Arcane', 'Shimmering', 'Sundered', 'Humming', 'Crystalline', 'Luminous', 'Etherbright', 'Flux-Wracked', 'Singing', 'Glimmering', 'Spellbound', 'Aether-Charged', 'Pulsing', 'Radiant', 'Star-Threaded', 'Manaforged', 'Coruscant'],
    nameSecond: ['Nexus', 'Confluence', 'Weave', 'Lattice', 'Wellspring', 'Leyline', 'Conflux', 'Skein', 'Junction', 'Spire', 'Wellhead', 'Matrix', 'Vortex', 'Threadwork', 'Font', 'Loom'],
    theme: {
      floor: '#070d15', grid: '#0d1822', border: '#2a5066',
      obstacle: '#1a3a4a', obstacleEdge: '#3a6a8a', accent: '#60d0ff',
      chasm: '#030810', mud: '#0c1a22', water: '#0a2c44',
    },
    sizeW: [1300, 1700], sizeH: [1000, 1300],
    layout: [
      { kind: 'rocks', count: [14, 20], radius: [18, 42] },
      { kind: 'cliff', count: [3, 5] },
      { kind: 'water', count: [2, 4] },
      { kind: 'ice', count: [1, 3] },
      { kind: 'chasm', count: [1, 2] },
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
    nameFirst: ['Sunken', 'Abyssal', 'Drowned', 'Fathomless', 'Tide-Lost', 'Lightless', 'Pressuredark', 'Brineblack', 'Leviathan', 'Pelagic', 'Sunless', 'Cold-Crushed', 'Hadal', 'Stillwater', 'Deepswell', 'Saltgloom', 'Trenchborn', 'Drownward'],
    nameSecond: ['Deep', 'Trench', 'Shelf', 'Reach', 'Sound', 'Gulf', 'Abyss', 'Fathoms', 'Current', 'Depths', 'Hollow', 'Sink', 'Drift', 'Brine', 'Maw', 'Shoals'],
    theme: {
      ground: { scale: 1.8, stretchX: 1.4, strength: 0.9, speckles: 0.6 },
      ambientDark: 0.35,
      floor: '#08151f', grid: '#0d2030', border: '#2a6a8a',
      obstacle: '#163a4e', obstacleEdge: '#2f6a86', accent: '#5ad8e8',
      water: '#0c2740', chasm: '#02060a',
    },
    sizeW: [2200, 3000], sizeH: [1600, 2300], ellipseChance: 0.2,
    // Sea floor decoration (run by underwaterLayout via plainsLayout) — kelp beds,
    // coral heads, rocky outcrops, the odd boulder. Vibrant, alive seabed.
    layout: [
      { kind: 'kelp', count: [4, 8] },
      { kind: 'coral', count: [3, 6], radius: [16, 28] },
      { kind: 'sea_rock', count: [3, 6], radius: [22, 42] },
      { kind: 'rocks', count: [2, 4], radius: [16, 34] },
    ],
    packs: {
      count: [5, 8], size: [3, 5],
      table: [
        { id: 'deep_thresher', weight: 4 }, { id: 'deep_angler', weight: 3 },
        { id: 'deep_tidecaller', weight: 2 }, { id: 'deep_leviathan', weight: 1 },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [{ kind: 'clear', weight: 3 }, { kind: 'escape', weight: 1 }],
  },

  // HIGHLAND — windswept crags (biome 'highland', → rooms layout = a mountain-pass
  // maze of corridors and chambers carved into the rock).
  highland: {
    id: 'highland', biome: 'highland',
    nameFirst: ['Craggy', 'Windswept', 'Stoneback', 'Highreach', 'Granite', 'Cloudbound', 'Rugged', 'Skyworn', 'Bleakcrag', 'Frostcap', 'Eagle-Haunted', 'Hewnstone', 'Loftbound', 'Grey-Peaked', 'Stormcrest', 'Boulderfall', 'Wind-Scoured', 'Stark'],
    nameSecond: ['Pass', 'Crags', 'Bluffs', 'Heights', 'Ridge', 'Tor', 'Summit', 'Escarp', 'Highlands', 'Cairn', 'Peaks', 'Spur', 'Scree', 'Cliffs', 'Saddle', 'Overlook'],
    theme: {
      floor: '#13130f', grid: '#1d1c16', border: '#5a5240',
      obstacle: '#3a3528', obstacleEdge: '#6a6048', accent: '#c8b890',
      wall: '#4a4436', mud: '#3a3428',
    },
    sizeW: [2200, 3000], sizeH: [1600, 2300], ellipseChance: 0,
    layout: [{ kind: 'rocks', count: [4, 8], radius: [20, 42] }],
    packs: {
      count: [6, 9], size: [3, 5],
      table: [
        { id: 'brute', weight: 3 }, { id: 'javelin_skirmisher', weight: 2 },
        { id: 'stone_sentinel', weight: 2 }, { id: 'troll_mauler', weight: 1 },
        { id: 'alpha_stalker', weight: 2 }, { id: 'gale_elemental', weight: 1 },
      ],
    },
    spawnerId: 'rime_stone',
    objectives: [{ kind: 'clear', weight: 3 }, { kind: 'spawners', weight: 2 }],
  },

  // MARSH — fetid wetland (biome 'marsh', → islands layout = boggy islets between
  // sluggish water and mire).
  marsh: {
    id: 'marsh', biome: 'marsh',
    nameFirst: ['Fetid', 'Sunken', 'Miremost', 'Rotbound', 'Stagnant', 'Murkwater', 'Reekwallow', 'Foulreek', 'Dankreed', 'Slumpwater', 'Gnatswarm', 'Greenscum', 'Cloywater', 'Sodden', 'Bogrot', 'Stillreek', 'Mudchurn', 'Drearmoor'],
    nameSecond: ['Marsh', 'Fen', 'Mire', 'Bog', 'Sump', 'Wetland', 'Slough', 'Quag', 'Reeds', 'Morass', 'Lowwater', 'Shallows', 'Mudflat', 'Sink', 'Hollow', 'Mere'],
    theme: {
      ground: { scale: 1.4, strength: 1.15 },
      floor: '#0e140e', grid: '#16201a', border: '#3a5240',
      obstacle: '#2a3a2c', obstacleEdge: '#496a4e', accent: '#8ad08a',
      water: '#1a3a30', mud: '#2a3424', tree: '#3a5a2a',
    },
    sizeW: [2200, 3000], sizeH: [1600, 2300], ellipseChance: 0.25,
    layout: [
      { kind: 'bog', count: [3, 5] }, { kind: 'water', count: [2, 4] },
      { kind: 'swamp', count: [2, 3] }, { kind: 'trees', count: [4, 7] },
      { kind: 'thicket', count: [1, 3] },
    ],
    packs: {
      count: [6, 9], size: [3, 5],
      table: [
        { id: 'fen_hound', weight: 3 }, { id: 'husk_swarmer', weight: 2 },
        { id: 'bone_serpent', weight: 2 }, { id: 'zombie', weight: 2 },
        { id: 'spitting_horror', weight: 1 }, { id: 'hex_weaver', weight: 1 },
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
      floor: '#1a0e12', grid: '#2a141a', border: '#7a3340',
      obstacle: '#5a2230', obstacleEdge: '#8a3848', accent: '#e86a7a', wall: '#5a2230',
    },
    sizeW: [2000, 2800], sizeH: [1500, 2200], ellipseChance: 0,
    // Organic clutter scattered INSIDE the carved chambers (fleshLayout walk-gates it):
    // bulbous pods, bone struts, viscera pools — the "Belly of the Beast" furnishing.
    layout: [
      { kind: 'flesh_pod', count: [3, 6] }, { kind: 'bone', count: [2, 4] },
      { kind: 'gore', count: [2, 4] },
    ],
    packs: {
      count: [6, 9], size: [3, 5],
      table: [
        { id: 'blood_mite', weight: 3 }, { id: 'spitting_horror', weight: 3 },
        { id: 'husk_swarmer', weight: 2 }, { id: 'bone_serpent', weight: 2 }, { id: 'zombie', weight: 2 },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [{ kind: 'clear', weight: 3 }, { kind: 'spawners', weight: 2 }],
  },

  // CRYSTAL — prismatic shard fields (biome:'crystal'). Crystal doodads fire random
  // laser beams (the crystal_beam effect) → a constant-movement dance.
  crystal: {
    id: 'crystal', biome: 'crystal',
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
      { kind: 'cliff', count: [1, 3] },
    ],
    packs: {
      count: [6, 9], size: [3, 5],
      table: [
        { id: 'gale_elemental', weight: 3 }, { id: 'storm_acolyte', weight: 2 },
        { id: 'frost_elemental', weight: 2 }, { id: 'stone_sentinel', weight: 2 }, { id: 'hex_weaver', weight: 1 },
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
    ],
    packs: {
      count: [6, 9], size: [3, 5],
      table: [
        { id: 'magma_worm', weight: 3 }, { id: 'fire_cultist', weight: 2 },
        { id: 'fire_golem', weight: 1 }, { id: 'brute', weight: 2 }, { id: 'spitting_horror', weight: 1 },
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
    nameFirst: ['Sporebound', 'Mycelial', 'Fruiting', 'Rotcap', 'Luminous', 'Creeping', 'Hyphal', 'Glowcap', 'Mouldgrown', 'Spore-Choked', 'Fungal', 'Damprot', 'Capshadow', 'Bloomrot', 'Pulsefungus', 'Veilspore', 'Mushroomed', 'Softrot'],
    nameSecond: ['Bloom', 'Hollow', 'Warren', 'Thicket', 'Grotto', 'Spread', 'Flush', 'Tangle', 'Sprawl', 'Mat', 'Patch', 'Colony', 'Reach', 'Mire', 'Beds', 'Veil'],
    theme: {
      ambientDark: 0.25,
      floor: '#160d1a', grid: '#221432', border: '#6a4a8a',
      obstacle: '#3a2a5a', obstacleEdge: '#7a5aa8', accent: '#8fd06f', wall: '#3a2a5a',
      tree: '#4a6a3a', grass: '#5a7a3a',
    },
    sizeW: [2100, 2900], sizeH: [1500, 2200], ellipseChance: 0,
    // Organic fungal clutter scattered INSIDE the carved grotto chambers (myceliaLayout
    // walk-gates them): towering caps, spore-pods that puff, glow-caps, a hyphal carpet.
    layout: [
      { kind: 'giant_mushroom', count: [3, 6] }, { kind: 'spore_pod', count: [2, 4] },
      { kind: 'glow_cap', count: [4, 7] }, { kind: 'mycelial_mat', count: [3, 5] },
    ],
    packs: {
      count: [6, 9], size: [3, 5],
      table: [
        { id: 'fungal_sporeling', weight: 3 }, { id: 'fungal_puffball', weight: 2 },
        { id: 'fungal_spitter', weight: 3 }, { id: 'fungal_brute', weight: 2 }, { id: 'fungal_tender', weight: 1 },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [{ kind: 'clear', weight: 3 }, { kind: 'spawners', weight: 2 }],
  },

  // FIELD — the open grassland EXPANSE (biome:'field'). The bespoke 'field' layout
  // generator (levelgen) shapes the zone to the contiguous Field heat-map blob and
  // floods it with grass/rock-cluster/mud/brush — NO trees, water, or void. sizeW/H
  // here are only a fallback; World.fieldifyZone overrides the footprint to the region
  // bbox. A wide-open, exploration-leaning hub (objectives favour clear/escape).
  grassland: {
    id: 'grassland', biome: 'field',
    nameFirst: ['Sunlit', 'Windswept', 'Verdant', 'Rolling', 'Emerald', 'Goldengrass', 'Wildflower', 'Open', 'Boundless', 'Whispergrass', 'Far-Reaching', 'Sunwashed', 'Breezy', 'Tallgrass', 'Endless', 'Sweeping', 'Lark-Sung', 'Greenswept'],
    nameSecond: ['Fields', 'Meadows', 'Expanse', 'Greens', 'Pastures', 'Lowlands', 'Reach', 'Plains', 'Prairie', 'Steppe', 'Sprawl', 'Veldt', 'Downs', 'Grasslands', 'Range', 'Heath'],
    theme: {
      floor: '#16260f', grid: '#1f3416', border: '#3f6a28',
      obstacle: '#4a4438', obstacleEdge: '#6e6450', accent: '#bfe878',
      mud: '#3a3320', grass: '#4f8c34', wall: '#1c3312',
    },
    sizeW: [3200, 4600], sizeH: [2400, 3400], ellipseChance: 0,
    layout: [
      { kind: 'grass', count: [10, 16] },
      { kind: 'rocks', count: [5, 9], radius: [18, 40] },
      { kind: 'mud', count: [2, 4] },
      { kind: 'brush', count: [2, 4] },
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
        { id: 'gnoll_prowler', weight: 3 },
        { id: 'fen_hound', weight: 2 },
        { id: 'thorn_sprite', weight: 2 },
        { id: 'briar_beast', weight: 2 },
        { id: 'gnoll_butcher', weight: 1 },
        { id: 'alpha_stalker', weight: 1 },
        { id: 'brute', weight: 1 },
        { id: 'warband_chieftain', weight: 1 },
      ],
    },
    spawnerId: 'bone_altar',
    objectives: [{ kind: 'clear', weight: 3 }, { kind: 'escape', weight: 2 }, { kind: 'spawners', weight: 1 }],
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
