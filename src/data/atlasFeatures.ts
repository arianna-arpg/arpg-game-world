// ---------------------------------------------------------------------------
// THE ATLAS's DATA — the MAP FEATURE KINDS (registered into world/atlas.ts)
// and the CHART DRESSING table (which glyph each biome wears on the painted
// world map).
//
// A feature kind is one row: how it is FOUND on the seed's own fields, how
// far it REACHES, what a zone minted within reach INHERITS, what the pane
// READS, and how the chart MARKS it. Adding a kind is adding a row; nothing
// in the engine names 'peak' or 'lode'. Every number here is a DIAL
// (unblessed): spans, chances, reaches, the bounty, the relief lift.
//
//   peak  — SUMMITS: local maxima of the elevation axis on a jittered
//           lattice. A zone under a summit rolls the lone_mountain landmark
//           and lifts + domes its own height field, so its high-ground stamps
//           (crags, cairns, snow teeth) find the heights they ask for.
//   lode  — ORE COUNTRY: a strewn deal gated to the high ground. A zone on a
//           lode ALWAYS stands harvest nodes and stands more of them (the
//           harvest fabric's own rows — the country still says which).
//   lake  — LAKE BASINS: where a traced river dies inland. A zone at the
//           basin rolls the great lake (or a lake) so the water the map shows
//           is the water you wade.
//
// The dressing table is presentation only: a biome without a row wears no
// glyphs (the sea's sparse waves, the desert's dunes, the wood's crowns).
// Colours omitted default to a darkened biome tint.
// ---------------------------------------------------------------------------

import { registerMapFeature } from '../world/atlas';

registerMapFeature({
  id: 'river_citadel', label: 'river citadel', glyph: 'tower', icon: '♜', color: '#d7c39a',
  find: { kind: 'river-sites', minRun: 8, progress: [0.3, 0.65], chance: 0.38, salt: 0xc17ade1 },
  reach: 180, size: 58, destination: { locale: 'river_fortress' },
  names: { first: ['Broken', 'Iron', 'Drowned', 'Silent', 'Hollow'], second: ['Watch', 'Gate', 'Bastion', 'Crown'] },
  read: 'a fortress on the river — approach its walls, seek a crossing, or explore the grotto beyond',
});
registerMapFeature({
  id: 'river_arches', label: 'sundered arches', glyph: 'ruin', icon: '◈', color: '#b7c6bc',
  find: { kind: 'river-sites', minRun: 8, progress: [0.25, 0.7], chance: 0.35, salt: 0xa2c4e5 },
  reach: 170, size: 64, destination: { locale: 'sundered_arches' },
  names: { first: ['Sundered', 'Pale', 'Weeping', 'Forgotten', 'Storm'], second: ['Arches', 'Pillars', 'Sanctuary', 'Steps'] },
  read: 'a river through broken stone — branching trails lead to a sanctuary, an overlook, and a deep grotto',
});

export interface ChartGlyphSpec {
  /** Glyph painter id (ui/atlasPaint.ts registry). */
  glyph: string;
  /** Mean spacing between glyphs, node units (thinned by probability on
   *  the shared lattice; never denser than the px floor). */
  spacing: number;
  /** Glyph size, node units (scaled by the chart's px-per-unit). */
  size: number;
  /** Ink; absent = the biome's tint darkened. */
  color?: string;
  /** An alternate glyph mixed in at `altChance` (a wood with some firs). */
  alt?: string;
  altChance?: number;
}

export const ATLAS_GLYPHS: Record<string, ChartGlyphSpec> = {
  grove: { glyph: 'tree', spacing: 60, size: 24, color: '#1e5b22' },
  forest: { glyph: 'tree', spacing: 44, size: 26, color: '#163d19', alt: 'conifer', altChance: 0.35 },
  gloamwood: { glyph: 'dead_tree', spacing: 52, size: 26, color: '#242f2a', alt: 'tree', altChance: 0.45 },
  jungle: { glyph: 'tree', spacing: 40, size: 26, color: '#0f3d1f' },
  taiga: { glyph: 'conifer', spacing: 48, size: 26, color: '#1e3f34' },
  garden: { glyph: 'tree', spacing: 72, size: 22 },
  isle: { glyph: 'tree', spacing: 84, size: 22 },
  highland: { glyph: 'peak', spacing: 74, size: 34, color: '#6e7260' },
  butteland: { glyph: 'hill', spacing: 80, size: 30, color: '#8a6a48' },
  karst: { glyph: 'spire', spacing: 60, size: 28, color: '#7a7a6a' },
  desert: { glyph: 'dune', spacing: 80, size: 30, color: '#a68a52' },
  beach: { glyph: 'dune', spacing: 90, size: 22, color: '#c9b98a' },
  steppes: { glyph: 'hill', spacing: 96, size: 26 },
  downs: { glyph: 'hill', spacing: 84, size: 30 },
  courtland: { glyph: 'ruin', spacing: 90, size: 24, color: '#9a8a5a' },
  marsh: { glyph: 'reed', spacing: 56, size: 22, color: '#5a7a48' },
  tundra: { glyph: 'snow', spacing: 70, size: 22, color: '#d8e4ec' },
  volcanic: { glyph: 'cone', spacing: 84, size: 30, color: '#4a3230' },
  scald: { glyph: 'cone', spacing: 90, size: 26, color: '#5a4a3a' },
  flame: { glyph: 'flame', spacing: 70, size: 24, color: '#e0662a' },
  rift: { glyph: 'flame', spacing: 84, size: 22 },
  warfront: { glyph: 'flame', spacing: 84, size: 22, color: '#c8502a' },
  field: { glyph: 'hedge', spacing: 70, size: 30 },
  farmland: { glyph: 'hedge', spacing: 56, size: 28 },
  metropolis: { glyph: 'tower', spacing: 52, size: 26, color: '#b8b0a0' },
  manor: { glyph: 'tower', spacing: 88, size: 24 },
  durance: { glyph: 'tower', spacing: 70, size: 24 },
  grave: { glyph: 'cross', spacing: 60, size: 20, color: '#c8c0b0' },
  ossuary: { glyph: 'cross', spacing: 56, size: 20, color: '#d8d0c0' },
  sepulcher: { glyph: 'ruin', spacing: 70, size: 24 },
  ruin: { glyph: 'ruin', spacing: 64, size: 26 },
  crystal: { glyph: 'shard', spacing: 64, size: 26, color: '#c8a8ff' },
  cavern: { glyph: 'shard', spacing: 80, size: 20 },
  eldritch: { glyph: 'shard', spacing: 90, size: 24 },
  mycelia: { glyph: 'mushroom', spacing: 56, size: 22, color: '#b8a0d8' },
  caul: { glyph: 'mushroom', spacing: 66, size: 22 },
  flesh: { glyph: 'reed', spacing: 80, size: 20 },
  soulway: { glyph: 'spire', spacing: 90, size: 24 },
  ocean: { glyph: 'wave', spacing: 120, size: 26, color: '#5d8fb4' },
  deepsea: { glyph: 'wave', spacing: 110, size: 26, color: '#4a7aa0' },
  littoral: { glyph: 'wave', spacing: 90, size: 22, color: '#7fb0cc' },
  aether: { glyph: 'spire', spacing: 90, size: 24 },
  aether_spires: { glyph: 'spire', spacing: 60, size: 28 },
  aether_bastion: { glyph: 'tower', spacing: 70, size: 24 },
  aether_civitas: { glyph: 'tower', spacing: 56, size: 24 },
};

// --- the feature kinds ------------------------------------------------------------

registerMapFeature({
  id: 'peak', label: 'summit', glyph: 'summit', icon: '⛰', color: '#ece8dc',
  find: { kind: 'peaks', span: 520, minElevation: 0.72, salt: 0x9ea4, jitter: 0.6 },
  reach: 240, size: 52,
  names: {
    first: ['Grey', 'Black', 'Broken', 'Cloven', 'Old', 'High', 'Iron', 'Storm', "Widow's", "Crow's", 'Bleak', 'Hoar', 'Red', 'Silent'],
    second: ['Fang', 'Tooth', 'Horn', 'Crown', 'Cairn', 'Spire', 'Knuckle', 'Anvil', 'Watch', 'Peak', 'Helm', 'Throne'],
  },
  read: 'high ground — the summit stands in this country; crags crown the heights',
  inherit: {
    landmarks: [{ landmark: 'lone_mountain', chance: 0.6 }],
    relief: { lift: 0.16, dome: 0.3 },
  },
});

registerMapFeature({
  id: 'lode', label: 'lode', glyph: 'lode', icon: '⛏', color: '#f0c060',
  find: { kind: 'strewn', span: 1300, chance: 0.42, salt: 0x10de, jitter: 0.7, gates: [{ axis: 'elevation', min: 0.5 }] },
  reach: 230, size: 40,
  names: {
    first: ['Red', 'Deep', 'Cold', 'Old', 'Bright', 'Bitter', 'Grey', 'Rich', 'Black', 'Blind'],
    second: ['Lode', 'Seam', 'Vein', 'Delving', 'Gash', 'Adit', 'Reef'],
  },
  read: 'ore country — the harvest always stands here, and stands thick',
  inherit: { harvest: { bonus: [2, 4], always: true } },
});

registerMapFeature({
  id: 'lake', label: 'lake basin', glyph: 'lake', icon: '◉', color: '#5fa6d9',
  find: { kind: 'lakes', minRun: 6, radius: [34, 70] },
  reach: 200,
  names: {
    first: ['Still', 'Black', 'Mirror', 'Cold', 'Long', 'Dead', 'Silver', 'Grey', 'Hollow'],
    second: ['Mere', 'Tarn', 'Water', 'Lake', 'Pool', 'Loch'],
  },
  read: 'a lake basin — the river dies here and the water stands',
  inherit: {
    landmarks: [{ landmark: 'great_lake', chance: 0.75 }, { landmark: 'lake', chance: 0.5 }],
  },
});
