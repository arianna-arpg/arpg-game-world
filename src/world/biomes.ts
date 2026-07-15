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
import { climateAt, climateAffinity, validateClimateSpecs, type ClimateSpec } from './climate';
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
  /** Whole-zone COMPOSITION picks this biome's zones roll (merged with the
   *  tileset's at mint). Structural (matches data/zones.ts CompositionRoll). */
  compositions?: { composition: string; chance: number }[];
  /** A VIRTUAL biome is imposed by a macro layer (the continent field's open
   *  sea), never rolled by the land lattice, never mints zones, and is excluded
   *  from faction-patron biome lists (no event may relocate/warp INTO it). */
  virtual?: boolean;
  /** World-map wash opacity for this biome's field cells (default 0.10 — the
   *  faint land heat-map). The sea paints heavier so it reads as water, not as
   *  a tint over land. */
  washOpacity?: number;
  /** CLIMATE AFFINITY — weight-multiplier envelopes over the climate axes
   *  (world/climate.ts). The biome field multiplies seed weight × affinity per
   *  Voronoi cell, so this is HOW a biome claims its geography: 'desert is hot
   *  + arid' as one data line. Keys are axis ids; values are that axis' band
   *  names or inline envelopes over its 0..1 value. Omitted = at home on any
   *  ground (grave stays unconditioned on purpose — the universal filler that
   *  guarantees every cell keeps a candidate). */
  climate?: Record<string, ClimateSpec>;
  /** An ENCLAVE biome walls itself: every zone edge with exactly one end
   *  inside it wears the named boundary gate (data/boundaryGates.ts) — a
   *  monumental façade + portal treatment, seen from BOTH sides of the
   *  crossing. The whole region reads as ONE structure you enter (the
   *  Durance idiom). Structural string ref — this leaf never imports the
   *  registry; the World resolves it at placeExit, boot validation checks
   *  it names a real gate. */
  enclave?: { gate: string };
  /** BIOME MELD id (data/melds.ts) — this biome's edge dressing: any
   *  NEIGHBORING zone whose exit faces this biome grows a band of this
   *  meld's kit along that edge ("the green presses close" — you can see
   *  the jungle from here). Structural string ref like the enclave gate;
   *  the World resolves it at placeExit off the same heat-map prediction
   *  seam, boot validation checks it names a registered meld. */
  meld?: string;
}

export const BIOMES: Record<string, BiomeInfo> = {
  // spacing: a per-biome map-density lever (forest/grave/marsh = tight interwoven web;
  // desert/tundra/highland/volcanic/coast = spacious, legible branching).
  grove:  { patronFaction: 'sylvan', mapColor: '#3f8a3a', label: 'Grove', spacing: 56,
    climate: { temperature: 'mild', moisture: { from: 0.3, fadeIn: 0.2 } },
    landmarks: [{ landmark: 'lake', chance: 0.3 }, { landmark: 'secluded_valley', chance: 0.15 }, { landmark: 'great_lake', chance: 0.08 }] },
  // The FOREST proper — where the grove is open woodland, the forest is a
  // ROOF: the 'forest' recipe plants veiled canopy masses whose coverage
  // scales with biomeDepth (the region's heart runs near-sealed). Claims the
  // wet half of the mild belt; the grove keeps the drier woods. Tight node
  // web (old roads under old boughs).
  forest: { patronFaction: 'sylvan', mapColor: '#2e7d32', label: 'Forest', spacing: 58,
    climate: { temperature: 'mild', moisture: 'damp' },
    allowedLayouts: { forest: 1 },
    landmarks: [{ landmark: 'lake', chance: 0.25 }, { landmark: 'secluded_valley', chance: 0.15 }] },
  // THE GLOAMWOOD: the HAUNTED forest — the same sealed-roof recipe under a
  // crooked grey-dark tree mix (layoutParams.forestTrees), riverland faces
  // where the mist can roll its banks, winding wood-roads between. Claims
  // the COOL half of the damp woods (the forest keeps the mild half — the
  // taiga/tundra split, applied to woodland; two soft gates so neither belt
  // starves). Its weather is the living fog; its dead drink it.
  gloamwood: { patronFaction: 'undead', mapColor: '#3a4a40', label: 'Gloamwood', spacing: 62,
    climate: { temperature: { to: 0.55, fadeOut: 0.15 }, moisture: { from: 0.42, fadeIn: 0.12 } },
    allowedLayouts: { forest: 3, riverland: 1.5, winding: 1 },
    layoutParams: {
      // The crooked roof: gloam oaks knit the same sealed masses, bare snags
      // break the canopy line, briars snarl the understory edge.
      forestTrees: [
        { kind: 'gloam_oak', weight: 5, radius: [38, 58] },
        { kind: 'dead_tree', weight: 2, radius: [14, 24] },
        { kind: 'tree', weight: 1, radius: [20, 30] },
        { kind: 'briarwood', weight: 1, radius: [18, 26] },
      ],
      forestCoverEdge: 0.4, forestCoverDeep: 0.8,
      forestClearings: [2, 5],
    },
    landmarks: [{ landmark: 'lake', chance: 0.2 }, { landmark: 'secluded_valley', chance: 0.12 }] },
  // THE JUNGLE: the strangling green — the WET half of the WARM belt (the
  // desert's ecological mirror: same heat, opposite water; the forest keeps
  // the mild-damp middle). Its signature 'thicket' recipe carves game trails
  // through one solid verdure mass — claustrophobia as terrain, with the
  // walls themselves cuttable — and the forest recipe is its rarer OPEN face,
  // grown in jungle wood and sealed near-shut at the region's heart. The
  // tightest node web in the game: the green packs against itself.
  jungle: { patronFaction: 'junglekin', mapColor: '#1f7a42', label: 'Jungle', spacing: 54,
    climate: { temperature: 'warm', moisture: 'wet' },
    meld: 'jungle_meld',
    // Four moods, one country: the THROAT (thicket), the CATHEDRAL
    // (gallery — the thicket family's open face), the ROOF (forest in
    // jungle wood), and the RIVER (a fordable jungle waterway).
    allowedLayouts: { thicket: 4, gallery: 1.5, forest: 1, riverland: 1 },
    layoutParams: {
      // The thicket dials — the claustrophobia gradient in one place: lanes
      // tighten toward the heart, plugs and dens thicken with them.
      thicketGlades: [6, 9], thicketGladeR: [70, 130],
      thicketTrailW: [26, 40], thicketCoreTighten: 0.6,
      thicketPlugChance: 0.42, thicketPlugCoreBonus: 0.34, thicketPlugSpacing: 150,
      thicketDens: [2, 4], thicketFaceCuts: [1, 3],
      // The forest face in jungle wood: emergent giants over palms, briars
      // in the snarl — and the roof runs nearly SEALED at the deep heart.
      // The colossus is an EMERGENT (its whole doctrine: "half a glade under
      // one crown") — weight 0.25 keeps it a punctuation mark, ~3% of the
      // roof. At its old weight 2 the sealed heart mass-planted ~700 giant
      // crowns per zone (25% of ~2900 trees at radius 56-84) and the canopy
      // pass drowned: gapP50 33ms — the perf gate's worst committed scene
      // (pinned in balance/perf.config.json mintPins).
      forestTrees: [
        { kind: 'canopy_colossus', weight: 0.25, radius: [56, 84] },
        { kind: 'palm', weight: 3.75, radius: [22, 34] },
        { kind: 'tree', weight: 2, radius: [20, 30] },
        { kind: 'briarwood', weight: 1, radius: [18, 26] },
      ],
      forestCoverEdge: 0.5, forestCoverDeep: 0.9,
      forestClearings: [2, 4],
      // The river face: a warm jungle waterway, forded not frozen.
      riverLiquid: 'water', causeways: [1, 2],
    },
    landmarks: [{ landmark: 'lake', chance: 0.2 }, { landmark: 'secluded_valley', chance: 0.1 }] },
  // Gravelands raise mausoleum labyrinths (a rare whole-zone hedge-maze bastion)
  // and the odd lone watchtower among the tombs.
  // GRAVELANDS: plains, mausoleum-labyrinth bastions, and RUINED NECROPOLIS
  // metropolises — the sacked city of the dead (ruined 0.85).
  grave:  { patronFaction: 'undead', mapColor: '#6a5a8a', label: 'Graveland', spacing: 60,
    // Interior families join the pool: CATACOMB dungeons and mausoleum
    // labyrinths under the open graves, the odd manor EDIFICE still standing.
    allowedLayouts: { plains: 6, bastion: 1, metropolis: 1, dungeon: 1, labyrinth: 0.5, edifice: 0.5 },
    layoutParams: { ruined: 0.85 },
    structures: [{ structure: 'hedge_labyrinth', chance: 0 }, { structure: 'watchtower', chance: 0.2 }],
    landmarks: [{ landmark: 'sinkhole', chance: 0.15 }, { landmark: 'tar_pool', chance: 0.2 }] },
  // THE OSSUARY: the Necropolis' interior sanctum — bone country, not grave
  // country (the graveland keeps its purple gloom and its tombstones; here
  // the dead ARE the terrain). Realm-only today: no climate row, no dimension
  // palette seat — the deadwake arena mints it directly; registering it here
  // gives the tag a HOME (patron, wildlife gate, layout pick) so any future
  // field/palette row is one line.
  ossuary: { patronFaction: 'undead', mapColor: '#cfc4ac', label: 'Ossuary', spacing: 64,
    allowedLayouts: { plains: 1 },
    landmarks: [{ landmark: 'sinkhole', chance: 0.12 }] },
  // THE SUNKEN RUIN: the swallowed civilization under the jungle — realm/
  // pocket-only (no field seat, no climate row): the ruin_gate sidezone mints
  // it (the ossuary pattern). Registering the tag gives it a HOME — patron
  // for rouse/garrison logic, the wildlife gate (no hares in the undercroft)
  // — so any future surface/palette seat is one line. The old dead keep
  // these halls; what the green sends down keeps them company.
  ruin: { patronFaction: 'undead', mapColor: '#5c6a4e', label: 'Sunken Ruin', spacing: 64,
    allowedLayouts: { dungeon: 2, edifice: 1.5, labyrinth: 1, plains: 0.5 } },
  // RIFT: siege castles + the RIVER OF FLAME (riverland pouring lava, stone
  // causeways spanning it — the D2 Act 4 artery).
  rift:   { patronFaction: 'demon',  mapColor: '#a83a2a', label: 'Rift', spacing: 64,
    climate: { wildness: { from: 0.3, fadeIn: 0.2 } },
    allowedLayouts: { plains: 6, bastion: 1, riverland: 1 },
    layoutParams: { riverLiquid: 'lava', causeways: [2, 3] },
    structures: [{ structure: 'siege_castle', chance: 0 }, { structure: 'watchtower', chance: 0.15 }],
    landmarks: [{ landmark: 'lava_coast', chance: 0.18 }, { landmark: 'caldera', chance: 0.12 },
      { landmark: 'demon_pit', chance: 0.2 }, { landmark: 'void_pillars', chance: 0.1 }] },
  // THE RIVER OF FLAME — hell's ARTERY, the first COURSE-ONLY biome: seeded
  // into NO palette (surface or underworld), it exists exclusively where the
  // Underworld's declared course paints it (world/courses.ts, dimensions.ts).
  // A place you find and then FOLLOW — every zone on it carries the river
  // (riverland pouring lava, oriented by the course's riverSides so
  // consecutive zones read as ONE continuous flow), its banks the demons'
  // own works. Tight spacing (the chain hugs its line); a heavy map wash so
  // the artery reads as a winding vein of fire on the hell tab.
  flame: { patronFaction: 'demon', mapColor: '#f0641e', label: 'River of Flame', spacing: 62,
    washOpacity: 0.26,
    allowedLayouts: { riverland: 1 },
    layoutParams: { riverLiquid: 'lava', causeways: [2, 3], riverWidth: [110, 170], isles: [1, 3] },
    landmarks: [
      { landmark: 'demon_pit', chance: 0.16 }, { landmark: 'abyssal_gulf', chance: 0.12 },
      { landmark: 'lava_coast', chance: 0.1 },
    ] },
  // THE DURANCE: the hate-citadel — hell's first ENCLAVE biome. Its Voronoi
  // regions read as ONE structure spanning zones: every edge crossing its
  // boundary wears the durance gate (data/boundaryGates.ts — the monumental
  // façade + throat you walk THROUGH, seen from both sides), and inside,
  // every zone is an INTERIOR — black-masonry torture halls on the dungeon/
  // edifice room-graphs, tiled floors, doors that stay ground, the courts of
  // hate burning cold green. Tight spacing (halls pack against halls); a
  // heavy wash so the citadel reads as a solid block on the hell tab — a
  // KEEP, not country. No climate gate: the citadel stands where it wills.
  durance: { patronFaction: 'demon', mapColor: '#3f5a46', label: 'Durance', spacing: 56,
    washOpacity: 0.24,
    enclave: { gate: 'durance_gate' },
    allowedLayouts: { dungeon: 3, edifice: 1 },
    layoutParams: {
      interiorWall: 'durance_wall', floorStyle: 'tile',
      corridorCells: 2.2, doorChance: 0.5, rooms: [9, 14],
    } },
  // THE OUTER STEPPES: the Underworld's scorched marches — open plains cut by
  // the angular wall-runs of abandoned hellworks (the 'steppes' recipe),
  // abyssal maws burning through the crust, the legions' stakes on the old
  // roads. Claims hell's COOLER ring (volcanic keeps the scorching cores);
  // underworld-palette-only until a surface field entry ever lists it.
  steppes: { patronFaction: 'demon', mapColor: '#8a4526', label: 'Steppes', spacing: 82,
    climate: { temperature: { to: 0.8, fadeOut: 0.14 } },
    allowedLayouts: { steppes: 4, expanse: 1 },
    layoutParams: {
      ridges: [3, 5], ridgeGapChance: 0.55, gateTerrace: { chance: 0.75 },
      bonusLandmarks: [1, 2],
    },
    structures: [{ structure: 'watchtower', chance: 0.12 }],
    landmarks: [
      { landmark: 'abyssal_maw', chance: 0.5 }, { landmark: 'abyssal_gulf', chance: 0.16 },
      { landmark: 'demon_pit', chance: 0.18 }, { landmark: 'sinkhole', chance: 0.1 },
    ] },
  // Warm∧dry (not strictly hot∧arid — the conjunction starved deserts to
  // <1% of land in sweep tests; the true hot/arid hearts still run
  // desert-dominant because every competitor thins there too).
  // THE DESERT COUNTRY: three faces share this tag (tilesets desert/sandsea/
  // saltflat, staged by depthAffinity — waste rim, erg heart, glasspan
  // blisters), all running the 'dunefield' recipe. The WIDEST spacing in the
  // game: its zones are the biggest surface arenas, and committing to the
  // crossing is the point — the map itself asks whether you want the heat.
  desert: { patronFaction: 'gnoll',  mapColor: '#c9a86a', label: 'Desert', spacing: 124,
    climate: { temperature: 'warm', moisture: 'dry' },
    meld: 'desert_meld',
    allowedLayouts: { dunefield: 4, plains: 1 },
    structures: [{ structure: 'grand_castle', chance: 0.1 }, { structure: 'watchtower', chance: 0.3, count: [1, 2] }],
    landmarks: [{ landmark: 'oasis', chance: 0.3 }, { landmark: 'canyon', chance: 0.25 }, { landmark: 'sinkhole', chance: 0.12 },
      { landmark: 'maggot_burrow', chance: 0.14 }] },
  // MARINE family — these lean to the 'islands' layout (land lobes + bridges + sea).
  beach:  { patronFaction: 'wild', mapColor: '#d8c890', label: 'Coast', spacing: 84,
    climate: { maritime: 'shorebound' },
    marine: 'coast', allowedLayouts: { plains: 2, islands: 1 },
    landmarks: [
      { landmark: 'cove', chance: 0.3 }, { landmark: 'fjord_coast', chance: 0.15 },
      { landmark: 'coastal_island', chance: 0.18 }, { landmark: 'secluded_cove', chance: 0.1 },
      { landmark: 'tombolo', chance: 0.1 },
    ] },
  isle:   { patronFaction: 'wild', mapColor: '#7ec8e8', label: 'Isle', spacing: 90,
    climate: { maritime: 'shorebound' },
    marine: 'coast', allowedLayouts: { islands: 3, plains: 1 },
    landmarks: [
      { landmark: 'peninsula', chance: 0.2 }, { landmark: 'isthmus', chance: 0.15 },
      { landmark: 'cliff_coast', chance: 0.15 }, { landmark: 'coastal_island', chance: 0.2 },
    ] },
  deepsea: { patronFaction: 'wild', mapColor: '#2f6aa8', label: 'Deep Sea',
    climate: { maritime: { from: 0.3, fadeIn: 0.2 } },
    marine: 'deep', allowedLayouts: { underwater: 1 },
    // No land warband braves the open ocean (the user's example). Eldritch is
    // event-driven (contexts gate) so it can still erupt here. Demo of the gate.
    denyFactions: ['goblin', 'gnoll'], denyEvents: ['crusade'] },
  // FIELD — the open grassland EXPANSE. A bespoke 'field' generator shapes the zone
  // to the contiguous Field heat-map blob (a giant expeditionary mega-zone, exits at
  // its corners). Spacious on the map (open country spreads out); event-dense (a wide
  // hub of opportunity). See levelgen fieldLayout + world fieldifyZone.
  field:    { patronFaction: 'wild',   mapColor: '#6fae3f', label: 'Fields', spacing: 132,
    climate: { temperature: 'mild', moisture: { to: 0.62, fadeOut: 0.2 } },
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
  // The cold belt splits ecologically: TUNDRA claims the cold-and-dry steppe,
  // the taiga the cold-and-wet forest (frigid-only starved it in sweeps).
  tundra:   { patronFaction: 'wild',   mapColor: '#bcd0d8', label: 'Tundra', spacing: 96,
    climate: { temperature: 'cold', moisture: { to: 0.55, fadeOut: 0.2 } },
    allowedLayouts: { plains: 3, expanse: 1, riverland: 1 },
    layoutParams: { riverLiquid: 'water', freezeAt: 0.45 },
    landmarks: [{ landmark: 'frozen_lake', chance: 0.35 }, { landmark: 'frozen_strand', chance: 0.22 }, { landmark: 'cirque', chance: 0.15 }] },
  // Taiga: the WINTER FOREST — the tundra's dense-canopied sibling: tight
  // conifer stands to slip beneath, standing drifts, frozen pools, the
  // aurora overhead. Wolves and worse den here.
  taiga:    { patronFaction: 'wild',   mapColor: '#9ec4b4', label: 'Taiga', spacing: 62,
    climate: { temperature: 'cold', moisture: { from: 0.32, fadeIn: 0.18 } },
    meld: 'taiga_meld',
    allowedLayouts: { plains: 3, riverland: 1 },
    layoutParams: { riverLiquid: 'water', freezeAt: 0.6 },
    landmarks: [{ landmark: 'frozen_lake', chance: 0.3 }, { landmark: 'secluded_valley', chance: 0.15 }] },
  // Highland: the mountain-pass maze, now with a bastion chance — a full castle
  // or concentric fortress commanding a pass — plus roadside watchtowers.
  // The high crags belong to the Horned Tribes now (the gnolls keep the
  // desert): beastkin war-camps stud the passes, their khan thrones on high.
  highland: { patronFaction: 'beastkin',  mapColor: '#8a8f6a', label: 'Highland', spacing: 88,
    climate: { temperature: { to: 0.55, fadeOut: 0.2 }, moisture: 'dry' },
    // rooms = the mountain-pass maze; labyrinth = the stone warren the old
    // folk cut (a full-zone maze, braided so it fights instead of frustrates).
    allowedLayouts: { rooms: 3, bastion: 1, labyrinth: 0.5 },
    structures: [
      { structure: 'grand_castle', chance: 0 }, { structure: 'fortress', chance: 0 },
      { structure: 'watchtower', chance: 0.35, count: [1, 2] },
    ],
    landmarks: [
      { landmark: 'canyon', chance: 0.25 }, { landmark: 'valley', chance: 0.25 },
      { landmark: 'lone_mountain', chance: 0.18 }, { landmark: 'cirque', chance: 0.12 },
    ] },
  marsh:    { patronFaction: 'undead', mapColor: '#4a6a52', label: 'Marsh', spacing: 58,
    climate: { moisture: 'wet' },
    allowedLayouts: { islands: 2, plains: 1 },
    landmarks: [{ landmark: 'bog_shore', chance: 0.3 }, { landmark: 'swamp_hill', chance: 0.22 }, { landmark: 'tar_pool', chance: 0.25 }] },
  // Exotic hazard biomes (each is a distinct framework instance):
  //  flesh   — a writhing CIRCLE-chamber layout (organic, pulsing).
  //  crystal — plains scattered with crystal shards that fire random laser beams.
  //  volcanic— plains with lava vents that launch arcing lava orbs.
  // The Flesh gains its true natives: the Glut patronizes its own ground
  // (the undead keep the gravelands).
  flesh:    { patronFaction: 'flesh',   mapColor: '#7a2a38', label: 'Flesh', spacing: 64,
    climate: { wildness: 'deepwild' },
    allowedLayouts: { flesh: 1 } },
  // THE CAUL — hell-only (absent from BIOME_FIELD, present only in the
  // underworld dimension's palette): the invading organism's membrane
  // country. Winding gut-corridors with ichor throughlines, open sprawls,
  // and ridge-marches that read as vertebrae once the chitin kit dresses
  // them. Pools where hell runs least arid (the stone sweats there).
  caul:     { patronFaction: 'caulborn', mapColor: '#241a2e', label: 'The Caul', spacing: 76,
    climate: { moisture: { from: 0.22, fadeIn: 0.12 } },
    allowedLayouts: { winding: 2, plains: 1, steppes: 1 },
    layoutParams: { riverLiquid: 'gore', negativeLiquid: 'gore' } },
  // CAVERN — the biome tag for the underground tilesets (they previously
  // carried none, so cave zones fell back to PLAINS wildlife: hares in the
  // dark). No patron marches from here; the dark keeps its own.
  cavern:   { patronFaction: 'wild', mapColor: '#5a5462', label: 'Cavern', spacing: 72,
    landmarks: [{ landmark: 'maggot_burrow', chance: 0.18 }] },
  crystal:  { patronFaction: 'elemental', mapColor: '#7fd0ff', label: 'Crystal', spacing: 84,
    climate: { wildness: 'deepwild' } },
  // VOLCANIC: one tileset, THREE generations (the recipe-tweak showcase) — a
  // spiral cauldron over a lava sea, a winding lava-tube gut, or open plains;
  // the layoutParams pour lava into whichever recipe rolls.
  // (Patron flipped demon→emberkin: the cinder country finally has NATIVES —
  // the Legion remains its invader, not its landlord.)
  volcanic: { patronFaction: 'emberkin', mapColor: '#d84a1e', label: 'Volcanic', spacing: 92,
    climate: { temperature: 'scorching', wildness: { from: 0.25, fadeIn: 0.2 } },
    allowedLayouts: { plains: 2, spiral: 1, winding: 1 },
    layoutParams: { negativeLiquid: 'lava', riverLiquid: 'lava' },
    landmarks: [{ landmark: 'caldera', chance: 0.25 }, { landmark: 'lava_coast', chance: 0.18 }, { landmark: 'crater', chance: 0.2 }] },
  // MYCELIA — a bioluminescent fungal warren (biome:'mycelia' → the carved fungal-grotto
  // layout). The dormant HOME of the Mycelia spore-bloom (its 'fungal' patron springs from
  // the tileset packs). eventDensityMul 0.7 = the quiet home (the bloom suppresses events as
  // it spreads — the tug-of-war; the overlay folds a live per-zone suppression on top).
  mycelia:  { patronFaction: 'fungal',   mapColor: '#8fd06f', label: 'Mycelia', spacing: 64,
    climate: { moisture: 'damp', wildness: { from: 0.35, fadeIn: 0.2 } },
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
  // THE AETHER — the Aetherial dimension's cloud shelves (dimension-palette-
  // only: no climate gate, no surface field entry — the realm above mints it
  // from its own weighted palette, the durance/steppes pattern). Every zone
  // is a torn lattice of cloud isles over open sky whose ground DISSOLVES
  // (the tileset's theme carries the CollapseSpec); the Host keeps events
  // quiet up here — the realm is its own event.
  aether: { patronFaction: 'seraphic', mapColor: '#9fc0e8', label: 'Aether', spacing: 88,
    allowedLayouts: { aether_lattice: 1 },
    eventDensityMul: 0.5,
    denyEvents: ['demon_invasion', 'contagion', 'mycelia'] },
  // THE FIRMAMENT — the Aetherial's SANCTUM face (its gate zone's biome, and
  // one day its cities'): the same lattice recipe run dense and unbroken —
  // no sky-holes, wide causeways, and the tileset that claims this biome
  // carries NO CollapseSpec. Never in the dimension's frontier palette.
  aether_sanctum: { patronFaction: 'seraphic', mapColor: '#c8d8f4', label: 'Firmament', spacing: 88,
    allowedLayouts: { aether_lattice: 1 },
    eventDensityMul: 0.3,
    layoutParams: { isles: [5, 7], isleRadius: [200, 300], causewayWidth: [70, 95], holes: [0, 0] } },
  // THE HIGH SPIRES — the Aetherial's built country (the D3 High Heavens
  // read): great cloud bases crowned with aureate courts and tiered spires,
  // joined by narrow ephemeral spans. The architecture never falls; the
  // FRAY does — base rims and rolled bridges are cloud_frail, the one kind
  // the biome's CollapseSpec melts. In the dimension's frontier palette
  // beside the shelves: the realm's two moods.
  aether_spires: { patronFaction: 'seraphic', mapColor: '#e0d8b8', label: 'High Spires', spacing: 90,
    allowedLayouts: { aether_spires: 1 },
    eventDensityMul: 0.4,
    denyEvents: ['demon_invasion', 'contagion', 'mycelia'] },
  // THE DRIFTWAYS — the Aetherial's wind country (the realm's third mood):
  // anchor isles strung across open sky, crossed on the FLUX fabric's own
  // ground — phasing stepping-stone pads, shuttling carrier rafts, gusts
  // that shove (the tileset's theme carries the FluxSpec). Pools in the
  // realm's WETTEST reaches — the storm shelves the climate axes were
  // waiting for (dimensions.ts foretold them).
  aether_drift: { patronFaction: 'seraphic', mapColor: '#a8dce8', label: 'Driftways', spacing: 92,
    climate: { moisture: { from: 0.26, fadeIn: 0.1 } },
    allowedLayouts: { aether_drift: 1 },
    eventDensityMul: 0.4,
    denyEvents: ['demon_invasion', 'contagion', 'mycelia'] },
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

/** The palette of biome regions seeded across the world map.
 *
 *  WEIGHTS ARE CONDITIONED-EQUILIBRIUM TUNED: each cell's effective weight is
 *  weight × climate affinity (fieldBiomePick), so a biome whose climate gate
 *  holds only over part of the world (desert: hot+arid) carries a HIGHER seed
 *  weight to keep its global share — where its climate holds it DOMINATES
 *  (that's what makes regions read as coherent deserts/tundras instead of
 *  confetti), and it simply doesn't exist elsewhere. Broad-gate biomes keep
 *  modest weights. Grave is the unconditioned filler that can appear anywhere. */
export const BIOME_FIELD: BiomeSeedDef[] = [
  { biome: 'grove', weight: 1.2 },
  { biome: 'forest', weight: 1.3 },
  { biome: 'gloamwood', weight: 1.2 }, // the cool-damp woods: haunted where the forest ends
  { biome: 'jungle', weight: 1.6 },    // warm∧wet gate — high seed weight so its belt reads as one green throat

  { biome: 'field', weight: 1.1 },
  { biome: 'grave', weight: 1.0 },
  // 2.3: the desert COUNTRY reads as broad coherent regions worth committing
  // to (three staged faces need the acreage) — its warm∧dry gate still keeps
  // it out of everyone else's belts.
  { biome: 'desert', weight: 2.3 },
  { biome: 'beach', weight: 1.6 },
  { biome: 'rift', weight: 1.2 },
  { biome: 'isle', weight: 1.2 },
  { biome: 'deepsea', weight: 0.9 },
  { biome: 'tundra', weight: 1.8 },
  { biome: 'taiga', weight: 1.6 },
  { biome: 'highland', weight: 1.5 },
  { biome: 'marsh', weight: 1.5 },
  { biome: 'flesh', weight: 1.1 },
  { biome: 'crystal', weight: 1.2 },
  { biome: 'volcanic', weight: 1.3 },
  { biome: 'mycelia', weight: 1.2 }, // rare fungal regions — the dormant homes the bloom collapses to
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
  /** ATTRIBUTION: what is warping this land ("Mycelia bloom", "Demonic invasion") —
   *  the map's zone-info box and the warped-cell pulse surface it, so the heat map
   *  never appears to change "for no reason". */
  label?: string;
}

/** Integer hash (Rng's family) → deterministic across host / client / reload. */
function hashCell(a: number, b: number, seed: number): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (a | 0), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (b | 0), 0xc2b2ae35) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f) >>> 0; h ^= h >>> 15;
  return h >>> 0;
}

// Cell-pick memo: the pick is pure per (dimension, seed, cell), and floods /
// map washes hammer the same cells thousands of times. Bounded — cleared
// wholesale at the cap (a re-fill is cheap; correctness never depends on it).
const pickMemo = new Map<string, string>();
const PICK_MEMO_CAP = 16384;

/** Drop every memoized cell pick. Called when a NEW world constructs (a fresh
 *  BiomeField) — the seed in the key already isolates worlds, but a hard reset
 *  also kills any stale entries a dev-session module swap (HMR duality) or a
 *  climate-origin change could otherwise carry across runs. */
export function resetFieldPickMemo(): void { pickMemo.clear(); }

/** Weighted biome for a Voronoi cell: seed weight × CLIMATE AFFINITY sampled
 *  at the cell's SITE (one climate reading per blob — regions stay coherent).
 *  THE shared pick for the surface field and every dimension palette. A cell
 *  whose climate zeroes every candidate falls back to the raw weights so the
 *  world never starves (validateBiomeClimate flags authoring instead). */
export function fieldBiomePick(
  table: readonly BiomeSeedDef[], gx: number, gy: number, site: MapCoord,
  fieldSeed: number, dimension = 'surface',
): string {
  const memoKey = `${dimension}|${fieldSeed}|${gx}|${gy}`;
  const hit = pickMemo.get(memoKey);
  if (hit !== undefined) return hit;
  const climate = climateAt(site, fieldSeed, dimension);
  const weights: number[] = new Array(table.length);
  let total = 0;
  for (let i = 0; i < table.length; i++) {
    const s = table[i];
    const w = (s.weight ?? 1) * climateAffinity(BIOMES[s.biome]?.climate, climate);
    weights[i] = w; total += w;
  }
  const h = hashCell(gx, gy, (fieldSeed ^ 0x5bd1e995) >>> 0);
  let picked = table[table.length - 1].biome;
  if (total <= 0) {
    let raw = 0;
    for (const s of table) raw += s.weight ?? 1;
    let r = (h / 0x100000000) * raw;
    for (const s of table) { r -= s.weight ?? 1; if (r <= 0) { picked = s.biome; break; } }
  } else {
    let r = (h / 0x100000000) * total;
    for (let i = 0; i < table.length; i++) {
      r -= weights[i];
      if (r <= 0) { picked = table[i].biome; break; }
    }
  }
  if (pickMemo.size >= PICK_MEMO_CAP) pickMemo.clear();
  pickMemo.set(memoKey, picked);
  return picked;
}

/** The biome at a node-space coordinate — a jittered Voronoi over the seeded
 *  regions (3×3 lattice neighbourhood, nearest seed point wins), each cell's
 *  biome rolled from weight × climate affinity at its site. Pure + identical
 *  for a fixed (coord, fieldSeed). */
export function biomeAt(coord: MapCoord, fieldSeed: number): string {
  // THE LANDMASS LAYER SITS ABOVE THE LAND LATTICE: open sea is its own
  // contiguous biome, not an overlay — so every sampler of "what is HERE"
  // (map wash, Field flood-fills, mint decisions, event anchors) agrees the
  // sea is sea. Land and bridges fall through to the land lattice below.
  if (continentAt(coord, continentSeedFrom(fieldSeed)).kind === 'ocean') return OCEAN_BIOME;
  const span = BIOME_FIELD_CFG.cellSpan, jit = BIOME_FIELD_CFG.jitter;
  const cx = Math.floor(coord.x / span), cy = Math.floor(coord.y / span);
  let bd = Infinity, bestGx = cx, bestGy = cy, bestPx = coord.x, bestPy = coord.y;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const gx = cx + dx, gy = cy + dy;
      const h = hashCell(gx, gy, fieldSeed);
      const px = (gx + 0.5 + (((h & 0xffff) / 0xffff) - 0.5) * jit) * span;
      const py = (gy + 0.5 + ((((h >>> 16) & 0xffff) / 0xffff) - 0.5) * jit) * span;
      const d = (px - coord.x) ** 2 + (py - coord.y) ** 2;
      if (d < bd) { bd = d; bestGx = gx; bestGy = gy; bestPx = px; bestPy = py; }
    }
  }
  return fieldBiomePick(BIOME_FIELD, bestGx, bestGy, { x: bestPx, y: bestPy }, fieldSeed);
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

/** Boot validator: every biome's climate spec must reference registered axes
 *  and (for named specs) registered bands — a typo'd axis would silently read
 *  as always-on. Returns the offending "owner: problem" strings. */
export function validateBiomeClimate(): string[] {
  return validateClimateSpecs(
    Object.entries(BIOMES).map(([id, b]) => [`biome '${id}'`, b.climate]),
  );
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
