// ---------------------------------------------------------------------------
// BIOMES — the land's character as data, tying terrain to a patron faction.
//
// A zone's `biome` tag (set on static zones and copied from a tileset onto
// generated ones) names the KIND of land it is. This table gives each biome a
// map colour (so the world map reads like a terrain map, Minecraft-ish) and a
// PATRON faction — the power that springs from that ground. The patron is the
// loose tie the user asked for: deserts breed gnolls, groves the Sylvan court,
// gravelands the dead — so biome regions and faction territory grow together.
//
// Crucially, several tilesets REUSE the rooted-faction biome tags
// ('grove'/'grave'/'rift') so jungles/mires/crypts/meadows count as genuine
// war-origin ground for sylvan/undead/demon (see traits.ts isWarOrigin). That
// is why this table has only six keys: the reused tags tint as their patron's
// region, which is exactly the "biomes merge by faction" behaviour we want.
//
// Pure leaf: imports only the coord type, takes a structural { biome? } so it
// never pulls in ZoneDef. Mirrors the one-way-leaf discipline of traits.ts.
// ---------------------------------------------------------------------------

import { continentAt, continentSeedFrom } from './continents';
import type { MapCoord } from './coords';

export interface BiomeInfo {
  /** The faction that springs from this land (must exist in FACTIONS). */
  patronFaction: string;
  /** World-map tint for zones of this biome. */
  mapColor: string;
  /** Short label drawn on the map node. */
  label: string;
  /** Which LAYOUT GENERATORS this biome may produce, as id→relative weight (rolled
   *  per generated zone). Omitted = 'plains' only (today's behaviour). Keys must be
   *  registered layout ids (validated at boot). This is how "biome dictates the
   *  type(s) of generation allowed" — the marine biomes lean 'islands', etc. */
  allowedLayouts?: Record<string, number>;
  /** Marine adjacency class: 'coast' = borders land (beaches/islands), 'deep' =
   *  open water (reserved for Phase-3 underwater). Drives adjacency-aware layout. */
  marine?: 'coast' | 'deep';
  /** Per-biome EVENT/FACTION policy (resolved through world/zonePolicy.ts). A deny
   *  list forbids; a non-empty allow list is a whitelist (only those pass). Composed
   *  with the per-layout policy. Static data now; swappable to a run-locked manifest
   *  source later with zero caller churn (every gate goes through the one resolver). */
  denyFactions?: string[];
  allowFactions?: string[];
  denyEvents?: string[];
  allowEvents?: string[];
  /** Node-space SPACING this biome's generated zones keep from their neighbours (the
   *  anti-crowd floor in worldgen.placeZoneAt). Larger = a more SPACIOUS, legible map
   *  (open desert/tundra); smaller = a TIGHTER interwoven web (dense grove/marsh).
   *  Omitted = DEFAULT_NODE_SEP. The user's "forest tight, desert spacious" lever. */
  spacing?: number;
  /** Overlay-EVENT frequency multiplier for this biome's zones (default 1) — the
   *  per-biome lever an overlay reads at its gate (eventDensityFor). >1 makes events
   *  ignite more often here (a Field is a wide-open opportunity hub), <1 suppresses.
   *  Pure data; composed at the gate so adding it is zero caller churn. */
  eventDensityMul?: number;
  /** Structure CHANCES this biome's generated zones roll (merged with the
   *  tileset's at mint; a chance of 0 = bastion-pool-only). Shape matches
   *  data/zones.ts StructureRoll — kept structural so this leaf stays pure. */
  structures?: { structure: string; chance: number; count?: [number, number] }[];
  /** Layout generator knobs (merged tileset ← biome ← spec at mint) — how a
   *  biome flavors a shared recipe (volcanic winding vs spiral vs expanse). */
  layoutParams?: Record<string, unknown>;
  /** Geographic-landmark CHANCES this biome's zones roll (merged with the
   *  tileset's at mint). Structural (matches data/zones.ts LandmarkRoll). */
  landmarks?: { landmark: string; chance: number; count?: [number, number] }[];
  /** A VIRTUAL biome is imposed by a macro layer (the continent field's open
   *  sea), never rolled by the land lattice, never mints zones, and is excluded
   *  from faction-patron biome lists (no event may relocate/warp INTO it). */
  virtual?: boolean;
  /** World-map wash opacity for this biome's field cells (default 0.10 — the
   *  faint land heat-map). The sea paints heavier so it reads as water, not as
   *  a tint over land. */
  washOpacity?: number;
}

export const BIOMES: Record<string, BiomeInfo> = {
  // spacing: a per-biome map-density lever (forest/grave/marsh = tight interwoven web;
  // desert/tundra/highland/volcanic/coast = spacious, legible branching).
  grove:  { patronFaction: 'sylvan', mapColor: '#3f8a3a', label: 'Grove', spacing: 56,
    landmarks: [{ landmark: 'lake', chance: 0.3 }, { landmark: 'secluded_valley', chance: 0.15 }, { landmark: 'great_lake', chance: 0.08 }] },
  // Gravelands raise mausoleum labyrinths (a rare whole-zone hedge-maze bastion)
  // and the odd lone watchtower among the tombs.
  // GRAVELANDS: plains, mausoleum-labyrinth bastions, and RUINED NECROPOLIS
  // metropolises — the sacked city of the dead (ruined 0.85).
  grave:  { patronFaction: 'undead', mapColor: '#6a5a8a', label: 'Graveland', spacing: 60,
    allowedLayouts: { plains: 6, bastion: 1, metropolis: 1 },
    layoutParams: { ruined: 0.85 },
    structures: [{ structure: 'hedge_labyrinth', chance: 0 }, { structure: 'watchtower', chance: 0.2 }],
    landmarks: [{ landmark: 'sinkhole', chance: 0.15 }, { landmark: 'tar_pool', chance: 0.2 }] },
  // RIFT: siege castles + the RIVER OF FLAME (riverland pouring lava, stone
  // causeways spanning it — the D2 Act 4 artery).
  rift:   { patronFaction: 'demon',  mapColor: '#a83a2a', label: 'Rift', spacing: 64,
    allowedLayouts: { plains: 6, bastion: 1, riverland: 1 },
    layoutParams: { riverLiquid: 'lava', causeways: [2, 3] },
    structures: [{ structure: 'siege_castle', chance: 0 }, { structure: 'watchtower', chance: 0.15 }],
    landmarks: [{ landmark: 'lava_coast', chance: 0.18 }, { landmark: 'caldera', chance: 0.12 },
      { landmark: 'demon_pit', chance: 0.2 }, { landmark: 'void_pillars', chance: 0.1 }] },
  desert: { patronFaction: 'gnoll',  mapColor: '#c9a86a', label: 'Desert', spacing: 104,
    structures: [{ structure: 'grand_castle', chance: 0.1 }, { structure: 'watchtower', chance: 0.3, count: [1, 2] }],
    landmarks: [{ landmark: 'oasis', chance: 0.3 }, { landmark: 'canyon', chance: 0.25 }, { landmark: 'sinkhole', chance: 0.12 },
      { landmark: 'maggot_burrow', chance: 0.14 }] },
  // MARINE family — these lean to the 'islands' layout (land lobes + bridges + sea).
  beach:  { patronFaction: 'wild', mapColor: '#d8c890', label: 'Coast', spacing: 84,
    marine: 'coast', allowedLayouts: { plains: 2, islands: 1 },
    landmarks: [
      { landmark: 'cove', chance: 0.3 }, { landmark: 'fjord_coast', chance: 0.15 },
      { landmark: 'coastal_island', chance: 0.18 }, { landmark: 'secluded_cove', chance: 0.1 },
      { landmark: 'tombolo', chance: 0.1 },
    ] },
  isle:   { patronFaction: 'wild', mapColor: '#7ec8e8', label: 'Isle', spacing: 90,
    marine: 'coast', allowedLayouts: { islands: 3, plains: 1 },
    landmarks: [
      { landmark: 'peninsula', chance: 0.2 }, { landmark: 'isthmus', chance: 0.15 },
      { landmark: 'cliff_coast', chance: 0.15 }, { landmark: 'coastal_island', chance: 0.2 },
    ] },
  deepsea: { patronFaction: 'wild', mapColor: '#2f6aa8', label: 'Deep Sea',
    marine: 'deep', allowedLayouts: { underwater: 1 },
    // No land warband braves the open ocean (the user's example). Eldritch is
    // event-driven (contexts gate) so it can still erupt here. Demo of the gate.
    denyFactions: ['goblin', 'gnoll'], denyEvents: ['crusade'] },
  // FIELD — the open grassland EXPANSE. A bespoke 'field' generator shapes the zone
  // to the contiguous Field heat-map blob (a giant expeditionary mega-zone, exits at
  // its corners). Spacious on the map (open country spreads out); event-dense (a wide
  // hub of opportunity). See levelgen fieldLayout + world fieldifyZone.
  field:    { patronFaction: 'wild',   mapColor: '#6fae3f', label: 'Fields', spacing: 132,
    allowedLayouts: { field: 1 }, eventDensityMul: 1.4,
    // Open country: a lone watchtower on the expanse (structures roll layout-
    // agnostically, so the Field's blob rasterizer gets them too).
    structures: [{ structure: 'watchtower', chance: 0.3 }],
    landmarks: [{ landmark: 'great_lake', chance: 0.15 }, { landmark: 'lake', chance: 0.22 }, { landmark: 'lone_mountain', chance: 0.12 }] },
  // Inland biomes — each now LOCKS a distinct generation type so zones differ
  // majorly: tundra = open plains (rich ice/rock decoration), highland = a rooms+
  // tunnels mountain-pass maze, marsh = boggy islets (islands). Pure data.
  // TUNDRA: open plains, wide EXPANSES, and RIVERLAND whose course freezes
  // mid-run (the D2 Act-5 frozen river — freezeAt flips water→ice).
  tundra:   { patronFaction: 'wild',   mapColor: '#bcd0d8', label: 'Tundra', spacing: 96,
    allowedLayouts: { plains: 3, expanse: 1, riverland: 1 },
    layoutParams: { riverLiquid: 'water', freezeAt: 0.45 },
    landmarks: [{ landmark: 'frozen_lake', chance: 0.35 }, { landmark: 'frozen_strand', chance: 0.22 }, { landmark: 'cirque', chance: 0.15 }] },
  // Taiga: the WINTER FOREST — the tundra's dense-canopied sibling: tight
  // conifer stands to slip beneath, standing drifts, frozen pools, the
  // aurora overhead. Wolves and worse den here.
  taiga:    { patronFaction: 'wild',   mapColor: '#9ec4b4', label: 'Taiga', spacing: 62,
    allowedLayouts: { plains: 3, riverland: 1 },
    layoutParams: { riverLiquid: 'water', freezeAt: 0.6 },
    landmarks: [{ landmark: 'frozen_lake', chance: 0.3 }, { landmark: 'secluded_valley', chance: 0.15 }] },
  // Highland: the mountain-pass maze, now with a bastion chance — a full castle
  // or concentric fortress commanding a pass — plus roadside watchtowers.
  // The high crags belong to the Horned Tribes now (the gnolls keep the
  // desert): beastkin war-camps stud the passes, their khan thrones on high.
  highland: { patronFaction: 'beastkin',  mapColor: '#8a8f6a', label: 'Highland', spacing: 88,
    allowedLayouts: { rooms: 3, bastion: 1 },
    structures: [
      { structure: 'grand_castle', chance: 0 }, { structure: 'fortress', chance: 0 },
      { structure: 'watchtower', chance: 0.35, count: [1, 2] },
    ],
    landmarks: [
      { landmark: 'canyon', chance: 0.25 }, { landmark: 'valley', chance: 0.25 },
      { landmark: 'lone_mountain', chance: 0.18 }, { landmark: 'cirque', chance: 0.12 },
    ] },
  marsh:    { patronFaction: 'undead', mapColor: '#4a6a52', label: 'Marsh', spacing: 58,
    allowedLayouts: { islands: 2, plains: 1 },
    landmarks: [{ landmark: 'bog_shore', chance: 0.3 }, { landmark: 'swamp_hill', chance: 0.22 }, { landmark: 'tar_pool', chance: 0.25 }] },
  // Exotic hazard biomes (each is a distinct framework instance):
  //  flesh   — a writhing CIRCLE-chamber layout (organic, pulsing).
  //  crystal — plains scattered with crystal shards that fire random laser beams.
  //  volcanic— plains with lava vents that launch arcing lava orbs.
  // The Flesh gains its true natives: the Glut patronizes its own ground
  // (the undead keep the gravelands).
  flesh:    { patronFaction: 'flesh',   mapColor: '#7a2a38', label: 'Flesh', spacing: 64,
    allowedLayouts: { flesh: 1 } },
  // CAVERN — the biome tag for the underground tilesets (they previously
  // carried none, so cave zones fell back to PLAINS wildlife: hares in the
  // dark). No patron marches from here; the dark keeps its own.
  cavern:   { patronFaction: 'wild', mapColor: '#5a5462', label: 'Cavern', spacing: 72,
    landmarks: [{ landmark: 'maggot_burrow', chance: 0.18 }] },
  crystal:  { patronFaction: 'elemental', mapColor: '#7fd0ff', label: 'Crystal', spacing: 84 },
  // VOLCANIC: one tileset, THREE generations (the recipe-tweak showcase) — a
  // spiral cauldron over a lava sea, a winding lava-tube gut, or open plains;
  // the layoutParams pour lava into whichever recipe rolls.
  volcanic: { patronFaction: 'demon',    mapColor: '#d84a1e', label: 'Volcanic', spacing: 92,
    allowedLayouts: { plains: 2, spiral: 1, winding: 1 },
    layoutParams: { negativeLiquid: 'lava', riverLiquid: 'lava' },
    landmarks: [{ landmark: 'caldera', chance: 0.25 }, { landmark: 'lava_coast', chance: 0.18 }, { landmark: 'crater', chance: 0.2 }] },
  // MYCELIA — a bioluminescent fungal warren (biome:'mycelia' → the carved fungal-grotto
  // layout). The dormant HOME of the Mycelia spore-bloom (its 'fungal' patron springs from
  // the tileset packs). eventDensityMul 0.7 = the quiet home (the bloom suppresses events as
  // it spreads — the tug-of-war; the overlay folds a live per-zone suppression on top).
  mycelia:  { patronFaction: 'fungal',   mapColor: '#8fd06f', label: 'Mycelia', spacing: 64,
    allowedLayouts: { mycelia: 1 }, eventDensityMul: 0.7 },
  // ELDRITCH — never seeded into BIOME_FIELD (no random eldritch regions in normal
  // gen); only an Incursion's biome-warp paints this ground, locking the landing.
  eldritch: { patronFaction: 'eldritch', mapColor: '#587a52', label: 'Blight' },
  // THE OPEN SEA — the landmass layer's OWN biome. Never seeded into
  // BIOME_FIELD (the continent field IMPOSES it in biomeAt), never mints
  // zones, unwarpable, and virtual (no faction claims it as home ground —
  // events cannot relocate into or warp toward the sea). Crossing it is the
  // naval context's job. Painted heavy on the map so it reads as WATER, not
  // a tint over a land heat-map that isn't there.
  ocean: { patronFaction: 'wild', mapColor: '#142e47', label: 'Open Sea',
    virtual: true, washOpacity: 0.62 },
};

/** The imposed sea biome's id (see BIOMES.ocean — virtual, continent-imposed). */
export const OCEAN_BIOME = 'ocean';

/** The biome record for a zone, or null if it carries no (known) biome tag. */
export function biomeOf(zone: { biome?: string }): BiomeInfo | null {
  return zone.biome ? BIOMES[zone.biome] ?? null : null;
}

/** The faction a biome breeds, or null for an untagged / unknown biome. */
export function patronFaction(biome: string | undefined): string | null {
  return biome ? BIOMES[biome]?.patronFaction ?? null : null;
}

/** Default node-space spacing for a biome with no `spacing` override (and the floor
 *  for the untagged/no-biome case). The per-biome map-density lever falls back here. */
export const DEFAULT_NODE_SEP = 70;

/** The anti-crowd node spacing a generated zone of this biome keeps (the map-density
 *  lever — desert spacious, grove tight). Falls back to DEFAULT_NODE_SEP. */
export function biomeSpacing(biome: string | undefined): number {
  return (biome ? BIOMES[biome]?.spacing : undefined) ?? DEFAULT_NODE_SEP;
}

/** The overlay-EVENT frequency multiplier for a biome's zones (the eventDensityMul
 *  lever), default 1 — read at an overlay/encounter gate. A Field hub amplifies (1.4),
 *  a future quiet biome could damp (<1). The seam every spatial event can compose in. */
export function biomeEventDensity(biome: string | undefined): number {
  return (biome ? BIOMES[biome]?.eventDensityMul : undefined) ?? 1;
}

/** The biomes a faction is the PATRON of (the inverse of patronFaction) — so a
 *  faction event can RELOCATE to its own land (sylvan→[grove], demon→[rift,volcanic]).
 *  Empty for a faction no biome breeds (it can only ever WARP the ground).
 *  VIRTUAL biomes (the imposed sea) never count as anyone's home ground. */
export function biomesForFaction(faction: string): string[] {
  return Object.entries(BIOMES)
    .filter(([, info]) => info.patronFaction === faction && !info.virtual)
    .map(([id]) => id);
}

// --- THE BIOME FIELD: a coordinate-space substrate (Minecraft-style regions) ---
//
// biomeAt(coord) is the eventual SOURCE OF TRUTH for "what biome is HERE" — a
// deterministic jittered-Voronoi over the seeded regions below, sampled on a
// lattice. RENDER-ONLY today (the heat-map wash on the world map); a later pass
// has worldgen sample it at mint, and a quest/event can WARP it (a "source of
// heat to the south" shifting the biomes there) via a field MODIFIER the
// BiomeField overlay owns. Adding a region kind = one BIOME_FIELD entry (+ a
// BIOMES entry if new); region frequency = its weight. No engine edit.

export interface BiomeSeedDef {
  /** Must key into BIOMES (validated at boot). */
  biome: string;
  /** Relative frequency of this biome's regions (default 1). */
  weight?: number;
}

/** The palette of biome regions seeded across the world map. */
export const BIOME_FIELD: BiomeSeedDef[] = [
  { biome: 'grove', weight: 1.2 },
  { biome: 'field', weight: 1.1 },
  { biome: 'grave', weight: 1.0 },
  { biome: 'desert', weight: 0.9 },
  { biome: 'beach', weight: 0.7 },
  { biome: 'rift', weight: 0.6 },
  { biome: 'isle', weight: 0.5 },
  { biome: 'deepsea', weight: 0.4 },
  { biome: 'tundra', weight: 0.6 },
  { biome: 'highland', weight: 0.7 },
  { biome: 'marsh', weight: 0.6 },
  { biome: 'flesh', weight: 0.35 },
  { biome: 'crystal', weight: 0.4 },
  { biome: 'volcanic', weight: 0.5 },
  { biome: 'mycelia', weight: 0.4 }, // rare fungal regions — the dormant homes the bloom collapses to
];

/** Tunable thresholds (modular, not scattered literals): the Voronoi cell size,
 *  seed jitter, the heat-map render cell, and the marine DEEP threshold — how far
 *  INTO a marine region (biomeDepth, 1=center) before the true DEEP-SEA zone mints
 *  instead of shallow isles/coast (the user's "deep into the biome → deep sea"). */
export const BIOME_FIELD_CFG = { cellSpan: 260, jitter: 0.45, renderCell: 52, deepThreshold: 0.5 } as const;

/** Marine-depth MINT TARGETS (data, not worldgen literals): past deepThreshold a
 *  marine frontier mints the deep biome; shallower, a coast biome keeps its own
 *  identity while open water mints as isles. */
export const MARINE_MINT = { deepBiome: 'deepsea', openShallowBiome: 'isle' } as const;

/** A local WARP of the field — the HEAT-SOURCE seam. Within `radius` of `center`,
 *  bias the biome toward `biome`. Pushed by quests/world-events in a future pass;
 *  the BiomeField overlay holds the live list (see biomeField.ts). */
export interface BiomeFieldModifier {
  center: MapCoord;
  radius: number;
  biome: string;
  /** 0..1 — how strongly it overrides the base field (1 = full override). */
  strength: number;
  /** Optional stable id so a TRANSIENT warp (a Mycelia bloom that crawls + recedes) can
   *  be replaced/removed by key (setWarp/unwarp). Omitted = a permanent push (Incursion). */
  id?: string;
}

/** Integer hash (Rng's family) → deterministic across host / client / reload. */
function hashCell(a: number, b: number, seed: number): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (a | 0), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (b | 0), 0xc2b2ae35) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f) >>> 0; h ^= h >>> 15;
  return h >>> 0;
}

/** Weighted biome for a cell, driven by its hash (deterministic). */
function cellBiome(h: number): string {
  let total = 0;
  for (const s of BIOME_FIELD) total += s.weight ?? 1;
  let r = (h / 0x100000000) * total;
  for (const s of BIOME_FIELD) { r -= s.weight ?? 1; if (r <= 0) return s.biome; }
  return BIOME_FIELD[0].biome;
}

/** The biome at a node-space coordinate — a jittered Voronoi over the seeded
 *  regions (3×3 lattice neighbourhood, nearest seed point wins). Pure + identical
 *  for a fixed (coord, fieldSeed). */
export function biomeAt(coord: MapCoord, fieldSeed: number): string {
  // THE LANDMASS LAYER SITS ABOVE THE LAND LATTICE: open sea is its own
  // contiguous biome, not an overlay — so every sampler of "what is HERE"
  // (map wash, Field flood-fills, mint decisions, event anchors) agrees the
  // sea is sea. Land and bridges fall through to the land lattice below.
  if (continentAt(coord, continentSeedFrom(fieldSeed)).kind === 'ocean') return OCEAN_BIOME;
  const span = BIOME_FIELD_CFG.cellSpan, jit = BIOME_FIELD_CFG.jitter;
  const cx = Math.floor(coord.x / span), cy = Math.floor(coord.y / span);
  let best = BIOME_FIELD[0].biome, bd = Infinity;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const gx = cx + dx, gy = cy + dy;
      const h = hashCell(gx, gy, fieldSeed);
      const px = (gx + 0.5 + (((h & 0xffff) / 0xffff) - 0.5) * jit) * span;
      const py = (gy + 0.5 + ((((h >>> 16) & 0xffff) / 0xffff) - 0.5) * jit) * span;
      const d = (px - coord.x) ** 2 + (py - coord.y) ** 2;
      if (d < bd) { bd = d; best = cellBiome(hashCell(gx, gy, (fieldSeed ^ 0x5bd1e995) >>> 0)); }
    }
  }
  return best;
}

/** How DEEP into its biome region a coordinate sits: 1 at the region's (jittered)
 *  Voronoi seed/center, →0 at the boundary with a neighbouring region. The same 3×3
 *  search as biomeAt (the winning seed's squared distance, normalized by half a cell).
 *  Pure + deterministic. Drives the marine "edge=shallows / center=deep sea" gradient. */
export function biomeDepth(coord: MapCoord, fieldSeed: number): number {
  const span = BIOME_FIELD_CFG.cellSpan, jit = BIOME_FIELD_CFG.jitter;
  const cx = Math.floor(coord.x / span), cy = Math.floor(coord.y / span);
  let bd = Infinity;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const gx = cx + dx, gy = cy + dy;
      const h = hashCell(gx, gy, fieldSeed);
      const px = (gx + 0.5 + (((h & 0xffff) / 0xffff) - 0.5) * jit) * span;
      const py = (gy + 0.5 + ((((h >>> 16) & 0xffff) / 0xffff) - 0.5) * jit) * span;
      const d = (px - coord.x) ** 2 + (py - coord.y) ** 2;
      if (d < bd) bd = d;
    }
  }
  return Math.max(0, Math.min(1, 1 - Math.sqrt(bd) / (span * 0.5)));
}

/** Deterministic 0..1 noise at a coordinate — the dither a BiomeField modifier
 *  uses to honor its `strength` (a partial-strength heat-source blends rather than
 *  hard-overriding). Same integer-hash family → identical host/client/reload. */
export function fieldNoise(x: number, y: number, seed: number): number {
  return hashCell(Math.round(x), Math.round(y), seed) / 0x100000000;
}

/** Boot validator: every BIOME_FIELD biome must exist in BIOMES (so the heat-map
 *  has a colour + a future generated zone has a backing biome). Returns the bad ids. */
export function validateBiomeField(): string[] {
  return BIOME_FIELD.filter(s => !BIOMES[s.biome]).map(s => s.biome);
}

/** Boot validator: every biome's allowedLayouts must name a REGISTERED layout
 *  generator (else a biome would roll a layout id nothing produces). Pure — takes
 *  the predicate so this leaf never imports the engine. Returns "biome:layout" misses. */
export function validateBiomeLayouts(isRegistered: (id: string) => boolean): string[] {
  const bad: string[] = [];
  for (const [biome, info] of Object.entries(BIOMES)) {
    for (const id of Object.keys(info.allowedLayouts ?? {})) {
      if (!isRegistered(id)) bad.push(`${biome}:${id}`);
    }
  }
  return bad;
}
