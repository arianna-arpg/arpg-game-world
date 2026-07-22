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
import { climateAt, climateAffinity, registerClimateInvalidation, validateClimateSpecs, type ClimateSpec } from './climate';
import { presenceMul, type LevelEnvelope } from '../engine/presence';
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
    // THE GROVE COUNTRY's edge dressing: neighbors see the green pressing
    // close — and, crossed at the right hour, the first small lights of
    // the wood's night (data/melds.ts).
    meld: 'grove_meld',
    // Mostly the classic open woodland scatter; the odd BOCAGE face (the
    // massif fabric) — grown hedge-lines and a walled fold among the trees,
    // the pastoral mixture archetype in the grove's own green.
    allowedLayouts: { plains: 4, massif: 1 },
    layoutParams: {
      massifMasses: [
        { kind: 'hedge', weight: 3 }, { kind: 'fold', weight: 1.5 }, { kind: 'tor', weight: 1 },
      ],
      massifCoverage: [0.12, 0.19],
    },
    landmarks: [{ landmark: 'lake', chance: 0.3 }, { landmark: 'secluded_valley', chance: 0.15 }, { landmark: 'great_lake', chance: 0.08 }],
    // The warband shows NATIVE here: the hovel blueprint re-skinned as a
    // staked warren camp in the deep green (the reskin doctrine's proof).
    compositions: [{ composition: 'goblin_warren_camp', chance: 0.08 }] },
  // The FOREST proper — where the grove is open woodland, the forest is a
  // ROOF: the 'forest' recipe plants veiled canopy masses whose coverage
  // scales with biomeDepth (the region's heart runs near-sealed). Claims the
  // wet half of the mild belt; the grove keeps the drier woods. Tight node
  // web (old roads under old boughs).
  forest: { patronFaction: 'sylvan', mapColor: '#2e7d32', label: 'Forest', spacing: 58,
    climate: { temperature: 'mild', moisture: 'damp' },
    allowedLayouts: { forest: 1 },
    // OVERGROWTH (the clearway fabric): how much of a trail the wood wins
    // back, [fringe, heart] lerped by biomeDepth — the deep forest's ways
    // run low-rate overgrown ON PURPOSE (swallowed stretches, trees and
    // all), the edges stay walked-clean.
    layoutParams: { overgrowth: [0, 0.18] },
    landmarks: [{ landmark: 'lake', chance: 0.25 }, { landmark: 'secluded_valley', chance: 0.15 }] },
  // THE GLOAMWOOD: the HAUNTED forest — the same sealed-roof recipe under a
  // crooked grey-dark tree mix (layoutParams.forestTrees), riverland faces
  // where the mist can roll its banks, winding wood-roads between. Claims
  // the COOL half of the damp woods (the forest keeps the mild half — the
  // taiga/tundra split, applied to woodland; two soft gates so neither belt
  // starves). Its weather is the living fog; its dead drink it. PATRON: the
  // NIGHT COURT — the wood is the Countess's seat (the dead still walk it,
  // but they walk it as HER servants; the undead keep the graves proper).
  gloamwood: { patronFaction: 'nightkin', mapColor: '#3a4a40', label: 'Gloamwood', spacing: 62,
    climate: { temperature: { to: 0.55, fadeOut: 0.15 }, moisture: { from: 0.42, fadeIn: 0.12 } },
    // Forest + riverland ONLY: riverlands now keep the crooked roof
    // (plantRiverbankRoof reads forestTrees below), but 'winding' carves a
    // treeless rock maze no wood should wake up as — retired until a
    // thicket-lane treatment exists (foliage-walled winding, the verdure
    // idiom in gloam tones).
    allowedLayouts: { forest: 3, riverland: 1.5 },
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
      // The haunted wood keeps its roads worse than the living one does.
      overgrowth: [0.04, 0.26],
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
      // The green strangles its own trails: the strongest overgrowth in the
      // game — a jungle path half-swallowed is the jungle READ.
      overgrowth: [0.12, 0.4],
    },
    landmarks: [{ landmark: 'lake', chance: 0.2 }, { landmark: 'secluded_valley', chance: 0.1 }] },
  // THE GARDEN: the bug-high country — an enormous tended plot walked at
  // seed scale (a flower stalk is a tree, a planter bed is a rampart, a
  // watering can is a monument; the Tender who kept it is a giant nobody
  // has seen since). Claims the mild-warm half of the damp belt, between
  // the gloamwood's cool mists and the jungle's heat: four staged faces
  // (petalfields rim → stalkwood heart → the tended rows → the mulch
  // margin) and its own downstairs (the rootways strata, the formicary).
  // PATRON: the FORMIC COLONY — whoever tended the garden is gone; the
  // colony never stopped working it.
  garden: { patronFaction: 'formic', mapColor: '#5a9a4e', label: 'the Garden', spacing: 58,
    climate: { temperature: { from: 0.35, fadeIn: 0.1, to: 0.72, fadeOut: 0.12 }, moisture: { from: 0.45, fadeIn: 0.12 } },
    meld: 'garden_meld',
    // Un-forced faces fall to open flowerland; the faces themselves pin
    // their recipes (parkland / forest / massif / plains).
    allowedLayouts: { plains: 2.5, forest: 1, massif: 1 },
    // A garden pond is this country's ocean — the sea fabric will class it
    // a pond and quay it accordingly, which is exactly the scale joke.
    landmarks: [{ landmark: 'lake', chance: 0.18 }] },
  // Gravelands raise mausoleum labyrinths (a rare whole-zone hedge-maze bastion)
  // and the odd lone watchtower among the tombs.
  // GRAVELANDS: plains, mausoleum-labyrinth bastions, and RUINED NECROPOLIS
  // metropolises — the sacked city of the dead (ruined 0.85).
  grave:  { patronFaction: 'undead', mapColor: '#6a5a8a', label: 'Graveland', spacing: 60,
    // Interior families join the pool: CATACOMB dungeons and mausoleum
    // labyrinths under the open graves, the odd manor EDIFICE still standing.
    // massif = the SACKED ACRES face (the massif fabric): ruin courts and
    // barrow mounds standing as the interior masses of an open graveland.
    allowedLayouts: { plains: 6, bastion: 1, metropolis: 1, massif: 1.5, dungeon: 1, labyrinth: 0.5, edifice: 0.5 },
    layoutParams: { ruined: 0.85,
      massifMasses: [
        { kind: 'ruincourt', weight: 3 }, { kind: 'barrow', weight: 2 }, { kind: 'hedge', weight: 1 },
      ] },
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
  // THE GLOAM MANOR: the haunted house's rooms — realm/pocket-only (no
  // field seat, no climate row): the manor's grand stair mints its floors
  // (the ossuary pattern). The tag gives the house a HOME — patron for
  // rouse/garrison logic and the wildlife gate (no hares upstairs).
  manor: { patronFaction: 'undead', mapColor: '#4a3a2c', label: 'Gloam Manor', spacing: 64,
    allowedLayouts: { rooms: 1 } },
  // THE SUNKEN RUIN: the swallowed civilization under the jungle — realm/
  // pocket-only (no field seat, no climate row): the ruin_gate sidezone mints
  // it (the ossuary pattern). Registering the tag gives it a HOME — patron
  // for rouse/garrison logic, the wildlife gate (no hares in the undercroft)
  // — so any future surface/palette seat is one line. The old dead keep
  // these halls; what the green sends down keeps them company.
  ruin: { patronFaction: 'undead', mapColor: '#5c6a4e', label: 'Sunken Ruin', spacing: 64,
    allowedLayouts: { dungeon: 2, edifice: 1.5, labyrinth: 1, plains: 0.5 } },
  // THE SEPULCHER: the tomb-dynasty's own country under the deep desert —
  // pocket-only (no field seat, no climate row): the sepulcher_gate sidezone
  // mints it (the ossuary/ruin pattern). Registering the tag seats its
  // PATRON — the Sand Sarcophate garrisons and rouses as the landlord, the
  // wildlife gate keeps surface fauna out of the vaults — so any future
  // surface seat is one line. Dune-country washing into bone-country is the
  // blend fabric's work, not a second tag.
  sepulcher: { patronFaction: 'sarcophate', mapColor: '#c9b078', label: 'Sepulcher', spacing: 64,
    allowedLayouts: { dungeon: 2, plains: 1.5, labyrinth: 1 } },
  // RIFT: the demon war's WOUND — war-scar fields under hate-green light,
  // siege castles, and GORE-veined riverland (the land bleeds where it was
  // cut). Deliberately NO lava and NO caldera/lava_coast rolls: fire country
  // is the volcanic biome's; hell's own lava artery is the 'flame' course.
  rift:   { patronFaction: 'demon',  mapColor: '#7e2740', label: 'Rift', spacing: 64,
    // DEEP-wilds only (from 0.45): the surface rift is a rare far-frontier
    // scar — near the settled lands the war never reached this far through.
    climate: { wildness: { from: 0.45, fadeIn: 0.15 } },
    allowedLayouts: { plains: 5, bastion: 1, riverland: 1 },
    layoutParams: { riverLiquid: 'gore', causeways: [2, 3] },
    structures: [{ structure: 'siege_castle', chance: 0 }, { structure: 'watchtower', chance: 0.15 }],
    landmarks: [{ landmark: 'demon_pit', chance: 0.22 }, { landmark: 'void_pillars', chance: 0.15 },
      { landmark: 'abyssal_gulf', chance: 0.12 }] },
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
  // THE RIVER OF SOULS — the underworld's other artery, and the third mint
  // idiom: not a Voronoi patch, not a course chain, but ONE SEATED PLACE
  // (world/soulriver.ts) — a single ferry-hub MEGAZONE minted mint-once at a
  // hashed seat off the Hellgate when a frontier lands in its catch basin.
  // Seeded into NO palette and NO course: this biome exists exactly once per
  // realm, worn by that zone alone (a course-only biome's stricter cousin —
  // the zone-info attribution and the map label ride the tag).
  soulway: { patronFaction: 'undead', mapColor: '#7fc4e8', label: 'River of Souls', spacing: 200,
    washOpacity: 0.22,
    allowedLayouts: { soulriver: 1 } },
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
  // THE LITTORAL COUNTRY: the mainland's tiered coast — four faces share
  // this tag (tilesets strand/brine_flats/mangrove_tangle/drowned_margin,
  // staged by depthAffinity over biomeDepth: walkable rim → drained seabed
  // → flooded tangle → the half-sunk margin where the Deep walks ashore).
  // The TIGHTEST coastal web in the game: the tiers must register across a
  // short walk (the desert asks commitment; the coast asks attention).
  // Deliberately NOT marine-classed: the marine branch's shallow/deep mint
  // split (worldgen.placeZoneAt) would pre-empt depthAffinity staging — the
  // country stages ITSELF. The archipelago (beach/isle) keeps its own look;
  // this is the coast you walk INTO the sea. Patron: the Coilborn — the
  // serpentfolk the wet margins breed.
  littoral: { patronFaction: 'coilborn', mapColor: '#4a9a86', label: 'Littoral', spacing: 56,
    climate: { maritime: 'shorebound' },
    allowedLayouts: { islands: 3, plains: 1.5, riverland: 1.5 },
    layoutParams: { riverLiquid: 'water', causeways: [1, 2] },
    landmarks: [
      { landmark: 'cove', chance: 0.22 }, { landmark: 'coastal_island', chance: 0.15 },
      { landmark: 'secluded_cove', chance: 0.1 }, { landmark: 'tombolo', chance: 0.1 },
      { landmark: 'bog_shore', chance: 0.15 },
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
  // BOTH now breed the RIMEBOUND — the Winter Court is the cold belt's
  // patron (tundra its high seat, taiga its wooded march); the wild keeps
  // hunting here, it just answers to a crown now.
  tundra:   { patronFaction: 'rimebound', mapColor: '#bcd0d8', label: 'Tundra', spacing: 96,
    climate: { temperature: 'cold', moisture: { to: 0.55, fadeOut: 0.2 } },
    // massif = the SCOURED FELLS face (the massif fabric): wind-bared tors
    // and scarp bluffs standing out of the snow — the reference stone mix.
    allowedLayouts: { plains: 3, expanse: 1, riverland: 1, massif: 1 },
    layoutParams: { riverLiquid: 'water', freezeAt: 0.45 },
    landmarks: [{ landmark: 'frozen_lake', chance: 0.35 }, { landmark: 'frozen_strand', chance: 0.22 }, { landmark: 'cirque', chance: 0.15 }] },
  // Taiga: the WINTER FOREST — the tundra's dense-canopied sibling: tight
  // conifer stands to slip beneath, standing drifts, frozen pools, the
  // aurora overhead. Wolves and worse den here.
  taiga:    { patronFaction: 'rimebound', mapColor: '#9ec4b4', label: 'Taiga', spacing: 62,
    climate: { temperature: 'cold', moisture: { from: 0.32, fadeIn: 0.18 } },
    meld: 'taiga_meld',
    allowedLayouts: { plains: 3, riverland: 1 },
    layoutParams: { riverLiquid: 'water', freezeAt: 0.6 },
    landmarks: [{ landmark: 'frozen_lake', chance: 0.3 }, { landmark: 'secluded_valley', chance: 0.15 }] },
  // Highland: the mountain-pass maze, now with a bastion chance — a full castle
  // or concentric fortress commanding a pass — plus roadside watchtowers.
  // The high crags belong to the Horned Tribes now (the gnolls keep the
  // desert): beastkin war-camps stud the passes, their khan thrones on high.
  // Relabelled 'Mountains' (the country pass): the id stays 'highland' — it
  // is load-bearing across saves, tables and the biome field — but every
  // player-facing read says what the place IS. (The WORD 'Highlands' now
  // belongs to the butte country below.)
  highland: { patronFaction: 'beastkin',  mapColor: '#8a8f6a', label: 'Mountains', spacing: 88,
    meld: 'mountain_meld',
    // ELEVATION-claimed (the relief fabric): the ranges stand where the land
    // actually RISES — ridge spines on the elevation axis — instead of
    // anywhere cold-and-dry rolled. The old moisture 'dry' gate is DROPPED:
    // it cut range chains into fragments wherever a ridge crossed the damp
    // belts (the scattered-patches read). Elevation is the claim now; the
    // cool-half temperature taste keeps the warm dry tables for the
    // Highlands (butteland). Wide fade so foothills seed on the shoulders.
    climate: { temperature: { to: 0.55, fadeOut: 0.2 },
      elevation: { from: 0.6, fadeIn: 0.15 } },
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
  // THE HIGHLANDS — the butte country (the reserved word, spent): warm dry
  // tablelands where the summits are a SECOND LAND (the tier fabric's
  // needles face — Devil's Tower / Thousand Needles). Its OWN biome, lifted
  // out of the Mountains so one country CLIMBS and the other stands in
  // stories — a range should never read as a patchwork of habitats. The
  // wildness gate keeps the tables off the settled belt (the karst idiom,
  // warmed); the Mountains hold the cold half of dry, the Highlands the
  // warm half past the desert's deep-dry claim.
  butteland: { patronFaction: 'wild', mapColor: '#b0854a', label: 'Highlands', spacing: 96,
    // Elevation-claimed like the Mountains (the tables are RAISED land) —
    // gentler floor: mesas stand on the ranges' warm shoulders.
    climate: { temperature: { from: 0.42, fadeIn: 0.12 }, moisture: 'dry', wildness: { from: 0.2, fadeIn: 0.15 },
      elevation: { from: 0.56, fadeIn: 0.15 } },
    allowedLayouts: { needles: 1 },
    landmarks: [{ landmark: 'canyon', chance: 0.2 }, { landmark: 'lone_mountain', chance: 0.1 }] },
  // THE KARST COUNTRY: wind-cut limestone in the wild dry midlands — TWO
  // depth-staged faces share the tag (the desert model): the KARST REACH at
  // the rim (an above-ground cavern country whose chasm gulfs ARE the maze —
  // the 'karst' recipe; no bridges, ever) and the PETRIFIED WEALD in the
  // heart (the forest recipe planted in stone — brittle cover, watcher
  // stones, the petrify gaze). Each face PINS its recipe via forceLayout;
  // allowedLayouts documents the family's two generators for the boot
  // validator (and any future unpinned face). The Unbound Elements patronize
  // the stone — stone_sentinel's crowned family garrisons both faces.
  karst:    { patronFaction: 'elemental', mapColor: '#a8a290', label: 'Karst', spacing: 96,
    climate: { temperature: 'mild', moisture: 'dry', wildness: { from: 0.3, fadeIn: 0.25 } },
    allowedLayouts: { karst: 3, parkland: 1 },
    landmarks: [{ landmark: 'sinkhole', chance: 0.18 }, { landmark: 'canyon', chance: 0.14 }] },
  // THE DOWNS: the settled world's open bones — rolling bracken heath studded
  // with LARGE impassable bodies (THE MASSIF FABRIC's home country, its whole
  // recipe): grey tors and scarp bluffs you walk around, drystone folds you
  // duel across, hedge-lines you fire blind through, barrows that only watch.
  // The MIXTURE archetype as a region: open country that plays open while
  // every crossing is a negotiation. Claims the mild belt's DRIER, SETTLED
  // half (karst keeps the wild stone; the grove keeps the damp woods) —
  // wildness gated LOW so the downs read as old walked land near the
  // settled web, thinning where the true wilds begin.
  downs:   { patronFaction: 'wild', mapColor: '#9aa26a', label: 'Downs', spacing: 92,
    // Temperature taste dropped (the farmland note): the dry settled half is
    // the identity, whatever the origin's weather rolled.
    climate: { moisture: { to: 0.52, fadeOut: 0.16 }, wildness: { to: 0.62, fadeOut: 0.2 } },
    allowedLayouts: { massif: 1 },
    structures: [{ structure: 'watchtower', chance: 0.28 }],
    landmarks: [
      { landmark: 'lake', chance: 0.18 }, { landmark: 'lone_mountain', chance: 0.14 },
      { landmark: 'sinkhole', chance: 0.1 }, { landmark: 'valley', chance: 0.15 },
    ] },
  // THE FARMLAND: the settled belt's WORKED half — crop seas, hedgerow bocage,
  // croft walls, villages under their chapel smoke. Claims the mild belt's
  // FERTILE side (the downs keep the dry sheep country) and gates wildness
  // even lower: this is the land the roads were built FOR, thinning to
  // nothing where the wilds begin. The 'fields' recipe (engine/settled.ts)
  // lays real portal roads; the tileset faces stage outskirts → crop seas →
  // harvest villages.
  farmland: { patronFaction: 'chattel', mapColor: '#b7ac58', label: 'Farmland', spacing: 74,
    // No temperature taste ON PURPOSE (cool shires grow oats): a frigid- or
    // scorched-origin world must never starve the belt. Moisture splits the
    // settled band with the downs (wet half here, dry half theirs). The
    // elevation CAP (relief fabric) keeps crops off true peaks — a
    // mountain-seated capital honestly keeps sheep fells (downs carry no
    // elevation gate) instead of terraced miracle wheat.
    climate: { moisture: { from: 0.38, fadeIn: 0.14 }, wildness: { to: 0.42, fadeOut: 0.16 },
      elevation: { to: 0.68, fadeOut: 0.14 } },
    allowedLayouts: { fields: 1 },
    meld: 'farmland_meld',
    layoutParams: {
      massifMasses: [
        { kind: 'hedge', weight: 3 }, { kind: 'croft', weight: 2 },
        { kind: 'fold', weight: 1.5 }, { kind: 'ruincourt', weight: 0.5 },
      ],
      massifCoverage: [0.09, 0.15],
      overgrowth: [0, 0.1],
    },
    structures: [{ structure: 'watchtower', chance: 0.2 }, { structure: 'wayside_camp', chance: 0.22 }],
    landmarks: [{ landmark: 'lake', chance: 0.18 }, { landmark: 'valley', chance: 0.14 }] },
  // THE METROPOLIS: the walled city — the settled web's dense core, and an
  // ENCLAVE: every zone edge crossing its boundary erects the city gate
  // (the Durance fabric worn in civic stone), so every approach reads as
  // arriving at the capital. District faces ride ONE recipe ('district'):
  // warrens massing, planned blocks, the high quarter's manor courts.
  // Wildness-gated to the innermost ring; no climate taste beyond that — a
  // city stands where the roads cross, whatever the weather.
  metropolis: { patronFaction: 'hollowborn', mapColor: '#8f8f96', label: 'Metropolis', spacing: 58,
    // Wildness-gated to tamed ground — and HEARTH-gated off the doorstep:
    // metropolis carries no temperature/moisture taste, so near home (calm
    // wildness) the global die would otherwise seat it as the filler wherever
    // hostile local climate kills its competitors — the surprise-city-start
    // inundation in dice form. From ~320 units out the die lives again
    // (tamed mid-corridor pockets may grow a walled quarter); the CAPITAL
    // seat never rides this die at all — its single-entry band forces
    // through the all-zero fallback, affinity-proof by design.
    climate: { wildness: { to: 0.28, fadeOut: 0.12 }, hearth: { from: 0.5, fadeIn: 0.25 } },
    allowedLayouts: { district: 1 },
    enclave: { gate: 'city_gate' },
    meld: 'metropolis_meld',
    layoutParams: {
      massifMasses: [{ kind: 'tenement', weight: 3 }, { kind: 'manor', weight: 1 }],
    },
    landmarks: [] },
  marsh:    { patronFaction: 'undead', mapColor: '#4a6a52', label: 'Marsh', spacing: 58,
    // The wet HOLLOWS (the relief fabric): bogs pool where the land lies
    // low — never up a mountainside.
    climate: { moisture: 'wet', elevation: { to: 0.5, fadeOut: 0.14 } },
    allowedLayouts: { islands: 2, plains: 1 },
    landmarks: [{ landmark: 'bog_shore', chance: 0.3 }, { landmark: 'swamp_hill', chance: 0.22 }, { landmark: 'tar_pool', chance: 0.25 }] },
  // Exotic hazard biomes (each is a distinct framework instance):
  //  flesh   — a writhing CIRCLE-chamber layout (organic, pulsing).
  //  crystal — plains scattered with crystal shards that fire random laser beams.
  //  volcanic— plains with lava vents that launch arcing lava orbs.
  // The Flesh gains its true natives: the Glut patronizes its own ground
  // (the undead keep the gravelands).
  // Now a COUNTRY (four depth-staged faces share the tag — warrens rim,
  // sanguine middle, gutworks deep-mid, ocular heart) → a touch more room.
  flesh:    { patronFaction: 'flesh',   mapColor: '#7a2a38', label: 'Flesh', spacing: 76,
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
  // THE RIVER — the relief fabric's course identity (world/relief.ts): worn
  // by NO zone (SURFACE_RIVERS is a non-painting course — a river crosses
  // whatever country it crosses and repaints none of it) and seeded into NO
  // palette. This row exists so the course validates, the map wash has the
  // water's color, and any future attribution names the artery. Virtual:
  // never rolled, never a faction's home ground.
  river: { patronFaction: 'wild', mapColor: '#5b9fd4', label: 'River',
    virtual: true },
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
  // THE VESPERLANDS — the Aetherial's cosmos country (the realm's fourth
  // mood): firmament-glass isles that hold forever, laced by ground that
  // answers the SKY — sunbridges, star-spans, prism walks, veiled ways
  // (the span fabric) — with comet lanes streaking the voids at night.
  // Pools in the realm's COLDEST reaches: the auroral belt the climate
  // axes were waiting for. Patroned by the VESPERKIN, not the Host — the
  // cosmos keeps its own fauna.
  aether_vesper: { patronFaction: 'vesperkin', mapColor: '#b0a8e0', label: 'Vesperlands', spacing: 92,
    climate: { temperature: { to: 0.34, fadeOut: 0.1 } },
    allowedLayouts: { aether_vesper: 1 },
    eventDensityMul: 0.4,
    denyEvents: ['demon_invasion', 'contagion', 'mycelia'] },
  // THE HIGH BASTION — the Aetherial's citadel COUNTRY (the realm's fifth
  // mood, and its first staged one): silver-and-gold massif architecture on
  // rolling cloud, deepening by dimensionBiomeDepth from the bastion rim
  // through the hemicycle Gloria to SERAPHAL, the city of the Aetherial
  // lords (three faces share this biome id — the mountain-country pattern,
  // relocated to the sky). Pools in the realm's WARMEST reaches — the
  // sunlit belt, the vesper cold's counterpart.
  aether_bastion: { patronFaction: 'seraphic', mapColor: '#e8d9a0', label: 'High Bastion', spacing: 92,
    climate: { temperature: { from: 0.38, fadeIn: 0.1 } },
    allowedLayouts: { aether_bastion: 1 },
    eventDensityMul: 0.4,
    denyEvents: ['demon_invasion', 'contagion', 'mycelia'] },
  // THE GALESTREAM — the Aetherial's ARTERY (a course-only biome, the River
  // of Flame idiom above the sky): a jetstream you can find and then FOLLOW,
  // springing at the Firmament's doorstep and meandering the realm — never
  // in the frontier palette; the wind is a place, not patches. Patroned by
  // the GALEKIN: the stream is their highway.
  aether_stream: { patronFaction: 'galekin', mapColor: '#8fe0e8', label: 'The Galestream', spacing: 88,
    allowedLayouts: { aether_drift: 1 },
    eventDensityMul: 0.3,
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
  // 1.55: the GROVE COUNTRY (four staged faces + the gleamhollow den need
  // the acreage) — the starter wood reads as one coherent country now, its
  // mild-dry gate still keeping it out of the forest's damp half.
  { biome: 'grove', weight: 1.55 },
  { biome: 'forest', weight: 1.3 },
  { biome: 'gloamwood', weight: 1.5 }, // the cool-damp woods: haunted where the forest ends — COUNTRY acreage now (three faces: hallowfield rim / heart wood / mournstead estates)
  { biome: 'jungle', weight: 1.6 },    // warm∧wet gate — high seed weight so its belt reads as one green throat
  // 1.7: the GARDEN COUNTRY (four staged faces + a downstairs need the
  // acreage) — its mild-warm∧damp gate contests the woods' belt, and where
  // it wins it should read as one continuous plot, not a window box.
  { biome: 'garden', weight: 1.7 },

  { biome: 'field', weight: 1.1 },
  { biome: 'grave', weight: 1.0 },
  // 2.3: the desert COUNTRY reads as broad coherent regions worth committing
  // to (three staged faces need the acreage) — its warm∧dry gate still keeps
  // it out of everyone else's belts.
  { biome: 'desert', weight: 2.3 },
  { biome: 'beach', weight: 1.6 },
  // 1.7: the littoral COUNTRY needs coherent regions (four staged faces need
  // the acreage), and its shorebound gate already confines it to the coast —
  // inside that band it splits the shoreline with beach/isle roughly evenly.
  { biome: 'littoral', weight: 1.7 },
  // 0.2: the rift is a WOUND, not a country — the demon war tore through in
  // PLACES, and finding one on the surface should read as an event. Probe
  // (balance/probe_biome_share.ts): at 1.2 it was the #1 far-wilds biome
  // (10.4% of land — commoner than forest); 0.2 + the deeper wildness gate
  // lands it ~2%, rarer than volcanic. Hell is untouched — the underworld
  // palette weights rift 4 on its own row (world/dimensions.ts).
  { biome: 'rift', weight: 0.2 },
  { biome: 'isle', weight: 1.2 },
  { biome: 'deepsea', weight: 0.9 },
  { biome: 'tundra', weight: 1.8 },
  { biome: 'taiga', weight: 1.6 },
  // 1.9: the MOUNTAIN COUNTRY (foothills → pass → overpass → geo-locked
  // crowns need the acreage to stage the whole climb — the karst precedent).
  { biome: 'highland', weight: 1.9 },
  // 1.2: the HIGHLANDS (butte country) — a spectacle biome: rarer than the
  // countries it stands between, unmistakable when the tables rise.
  { biome: 'butteland', weight: 1.2 },
  // 1.9: the karst COUNTRY (two staged faces need the acreage) — its
  // mild∧dry∧wild gate is narrow, so where it holds it should read as one
  // coherent stone country, and it simply doesn't exist elsewhere.
  { biome: 'karst', weight: 1.9 },
  // 1.4: the downs claim the mild belt's drier SETTLED half (low-wildness
  // gate — the karst inverse), sharing that band with grove/field/grave:
  // enough seed weight to read as coherent walked country where its gate
  // holds, never crowding the woods out of the damp half.
  { biome: 'downs', weight: 1.4 },
  // 1.6: the FARMLAND claims civilization's fertile half (the downs' damp
  // mirror) — its wildness gate confines it to the tamed hearts (home's calm
  // and the capital's basin), where this weight makes worked country common;
  // the capital's approach ring adds its structural mass (the bands below).
  { biome: 'farmland', weight: 1.6 },
  // 0.9: the METROPOLIS carries the tightest wildness gate in the game, so
  // the global dice can only seat it in the tamed hearts — the odd surprise
  // city neighborhood near home or the capital. Its STRUCTURAL seat is the
  // capital pole's banded seat/core (below): existence never rides this die.
  { biome: 'metropolis', weight: 0.9 },
  { biome: 'marsh', weight: 1.5 },
  { biome: 'flesh', weight: 1.25 }, // a four-faced country deserves the acreage

  { biome: 'crystal', weight: 1.2 },
  { biome: 'volcanic', weight: 1.3 },
  { biome: 'mycelia', weight: 1.2 }, // rare fungal regions — the dormant homes the bloom collapses to
];

// --- CLIMATE-BANDED FIELD TABLES ----------------------------------------------
// THE STRUCTURAL SEAM for band-bound countries. The underlying scarcity: a
// wildness-gated biome's eligible ground is a small disc (a handful of
// Voronoi cells), and under the one global table those few cells are
// contested by every mild-climate biome — so a world could roll NO farmland,
// NO metropolis at all (boom-or-bust the share probes' cross-seed averages
// hid). A FIELD BAND claims a climate stratum: cells whose site value holds
// the band's envelope (presenceMul ≥ 0.5 — first matching band wins) pick
// from the band's candidates instead of the global table ('replace'), or
// from the global table with the band's weights folded in ('tilt'), with
// every biome's own climate affinity still multiplying INSIDE it (a dry
// belt goes to the downs, a wet one to the farmland — the moisture split
// decides who dominates, never whether the belt exists; fieldBiomePick's
// all-zero fallback to raw weights is the guarantee's floor). The capital
// bands below anchor that structure on the PER-SEED pole (world/civics.ts)
// rather than around home — existence guaranteed, address diced. Generic on
// purpose: a future 'maritime' band could claim archipelago rings the same
// way. SURFACE-only (dimension palettes keep their own tables whole).
export interface BiomeFieldBand {
  id: string;
  /** The climate stratum this band claims: an axis + envelope over its 0..1
   *  value at the CELL SITE (bands resolve in registration order). */
  when: { axis: string; env: LevelEnvelope };
  /** 'replace' (default): the band's table IS the cell's candidate list —
   *  structure. 'tilt': the band MULTIPLIES matching global-table weights by
   *  its rows' weights (rows naming absent biomes append as new candidates)
   *  — a thumb on the scales that keeps every start's own climate character
   *  alive: a frigid origin keeps its taiga doorstep, a scorched one its
   *  dunes, the tilted rows are merely LIKELIER. */
  mode?: 'replace' | 'tilt';
  table: BiomeSeedDef[];
}

export const BIOME_FIELD_BANDS: BiomeFieldBand[] = [];

export function registerFieldBand(band: BiomeFieldBand): void {
  if (BIOME_FIELD_BANDS.some(b => b.id === band.id)) {
    console.warn(`[biomes] re-registering field band '${band.id}' — overriding`);
    BIOME_FIELD_BANDS.splice(BIOME_FIELD_BANDS.findIndex(b => b.id === band.id), 1);
  }
  BIOME_FIELD_BANDS.push(band);
}

/** The first band whose stratum holds at this climate reading (surface pick
 *  path only), or null for the global table. */
function bandFor(climate: Record<string, number>): BiomeFieldBand | null {
  for (const b of BIOME_FIELD_BANDS) {
    const v = climate[b.when.axis];
    if (v !== undefined && presenceMul(b.when.env, v) >= 0.5) return b;
  }
  return null;
}

/** Resolve a band against the global table per its mode: 'replace' hands the
 *  band's own table over; 'tilt' multiplies matching global weights by the
 *  band rows' weights (absent biomes append as new candidates). */
function bandCandidates(band: BiomeFieldBand, table: readonly BiomeSeedDef[]): readonly BiomeSeedDef[] {
  if ((band.mode ?? 'replace') === 'replace') return band.table;
  const mul = new Map(band.table.map(r => [r.biome, r.weight ?? 1]));
  const out: BiomeSeedDef[] = table.map(r => {
    const m = mul.get(r.biome);
    if (m === undefined) return r;
    mul.delete(r.biome);
    return { biome: r.biome, weight: (r.weight ?? 1) * m };
  });
  for (const [biome, weight] of mul) out.push({ biome, weight });
  return out;
}

// THE CAPITAL POLE (world/civics.ts): civilization's structure WITHOUT the
// fixed start. The old civic rings forced metropolis/farmland around HOME —
// every run opened walled inside the same city belt. The same layered
// geometry (seat → core → approach ring) now anchors on the PER-SEED capital
// pole, 600–1050 units out at a rolled bearing: the city is a DESTINATION
// approached through its worked country, and the first steps out of town are
// the world's own dice again. Radii are true geometry (the 'civic' axis is
// noise-free, span 640, and reads 1 everywhere until the pole installs — so
// these bands are inert in anchor-less contexts by construction), sized to
// the 260-unit cell pitch: the seat's reach always covers the pole cell's
// jittered site (worst case ~266 units), so EXISTENCE stays a guarantee —
// only the ADDRESS is the dice. The single-entry seat still FORCES via the
// all-zero fallback (affinity-proof): the ONE structural cell per world.
registerFieldBand({
  id: 'capital_seat',
  when: { axis: 'civic', env: { to: 0.42, fadeOut: 0.02 } }, // d ≲ 275 of the pole
  table: [{ biome: 'metropolis', weight: 1 }],
});
// The city's edge past the seat — heavily metro but DICED (a capital with
// worked pockets reads grown, not stamped). The wildness basin keeps the
// metropolis affinity itself alive only ~365 out, so the core stages
// city-center → outskirts on its own: past metro's reach the farmland and
// downs rows win the fade.
registerFieldBand({
  id: 'capital_core',
  when: { axis: 'civic', env: { from: 0.42, fadeIn: 0.02, to: 0.58, fadeOut: 0.03 } }, // ~275..370
  table: [
    { biome: 'metropolis', weight: 2.2 },
    { biome: 'farmland', weight: 1 },
    { biome: 'downs', weight: 0.5 },
    { biome: 'grave', weight: 0.25 },
  ],
});
// THE APPROACH RING: the capital's worked country — farmland-led, the downs
// claiming the dry cells (their own moisture affinities decide: a dry-belt
// capital is honest sheep country, the belt doctrine), thinning into
// whatever the wilds grow past the basin's reach (dead affinities cede to
// the live locals through the fade — no hard edge).
registerFieldBand({
  id: 'capital_ring',
  when: { axis: 'civic', env: { from: 0.58, fadeIn: 0.03, to: 0.8, fadeOut: 0.08 } }, // ~370..510, fading to ~565
  table: [
    { biome: 'farmland', weight: 2.2 },
    { biome: 'downs', weight: 1.1 },
    { biome: 'field', weight: 0.8 },
    { biome: 'grove', weight: 0.6 },
    { biome: 'grave', weight: 0.35 },
    { biome: 'metropolis', weight: 0.3 },
  ],
});
// THE HOME SHIRE — a TILT, not a table: near home every global candidate
// still stands with a mild thumb on the worked-land rows, so old walked
// country is LIKELIER at the door, never the law. Registered AFTER the
// capital bands (first match wins): a near-rolled pole keeps its city where
// the two overlap. This is the whole remaining near-home structure — the
// run's opening ring belongs to the world's dice.
registerFieldBand({
  id: 'home_shire',
  when: { axis: 'hearth', env: { to: 0.55, fadeOut: 0.08 } }, // r ≲ 350 of home
  mode: 'tilt',
  table: [
    { biome: 'farmland', weight: 1.5 },
    { biome: 'downs', weight: 1.35 },
    { biome: 'field', weight: 1.2 },
  ],
});

/** Tunable thresholds (modular, not scattered literals): the Voronoi cell size,
 *  seed jitter, the heat-map render cell, and the marine DEEP threshold — how far
 *  INTO a marine region (biomeDepth, 1=center) before the true DEEP-SEA zone mints
 *  instead of shallow isles/coast (the user's "deep into the biome → deep sea"). */
export const BIOME_FIELD_CFG = {
  cellSpan: 260, jitter: 0.45, renderCell: 52, deepThreshold: 0.5,
  /** HILLSHADE on the map wash (the relief fabric made visible): each land
   *  cell tilts light/dark by the elevation gradient (lit from the NW) plus
   *  a peak brightening above `peakFrom` — ridge chains and river valleys
   *  read as TERRAIN on the map whatever biome sits on them. `max` caps the
   *  overlay's opacity so the biome tint stays legible under the shading. */
  hillshade: { gain: 1.7, peakFrom: 0.62, peakGain: 0.5, max: 0.26 },
  /** Strength lost per second by a RELEASED warp (BiomeField.release) — the
   *  "volcano cooling off" dial: an ended event's wash heals gradually over
   *  ~strength/rate seconds instead of snapping, and a re-push mid-fade
   *  (setWarp) revives it. 0.03 ≈ a full-strength scar fading over half a
   *  minute of map time. */
  warpFadePerSec: 0.03,
} as const;

/** Marine-depth MINT TARGETS (data, not worldgen literals): past deepThreshold a
 *  marine frontier mints the deep biome; shallower, a coast biome keeps its own
 *  identity while open water mints as isles. */
export const MARINE_MINT = { deepBiome: 'deepsea', openShallowBiome: 'isle' } as const;

/** PORT-MINT fallback (data, not a worldgen literal): the biome whose
 *  dock-weighted faces host a harbor when the LOCAL field biome fields no
 *  dockable face (TilesetDef.docks — see pickDockTileset). */
export const PORT_MINT = { fallbackBiome: 'beach' } as const;

/** AQUATIC: this biome's zones are open seabed — the whole arena is
 *  underwater, water ambient rather than poured. THE one classifier both
 *  worldgen (mint) and the QA harnesses stamp ZoneDef.aquatic from, so the
 *  habitat fabric and the exit-road guard read one truth. marine 'deep'
 *  today; a future drowned dimension joins by tagging its BiomeInfo, no
 *  consumer churn. */
export function isAquaticBiome(biome: string | undefined): boolean {
  return !!biome && BIOMES[biome]?.marine === 'deep';
}

/** A local WARP of the field — the HEAT-SOURCE seam. Within `radius` of `center`,
 *  bias the biome toward `biome`. THE TRANSIENCE LAW (docs/engine/transience.md):
 *  every warp is KEYED, OWNED and RECONCILED — its owner re-asserts it while the
 *  event lives (setWarp is replace-by-id) and releases it when the event ends
 *  (release → a gradual fade, unwarp → instant). Warps are PRESENTATION +
 *  ATTRIBUTION only: the world-map heat wash and the zone-info box read them;
 *  the MINT path samples the BASE field, so no temporary event ever bakes its
 *  biome into newly-charted ground. There is no permanent push — a lasting
 *  scar on the world is a deliberate, player-consented act, not a warp. */
export interface BiomeFieldModifier {
  center: MapCoord;
  radius: number;
  biome: string;
  /** 0..1 — how strongly it overrides the base field (1 = full override). */
  strength: number;
  /** Stable id — the reconcile/release key (`<owner>_<instance>` by convention:
   *  `mycelia:<zone>`, `incursion_<epId>`, `crusade_<id>`, `swarm_roost_<id>`). */
  id: string;
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

// A pick bakes the climate GEOMETRY of its moment (bands read the origin +
// anchors through climateAt) — so any re-anchor (the capital pole install,
// an origin move, probes cycling seeds) must flush it, or a re-anchored
// world serves picks computed under the old geometry.
registerClimateInvalidation(resetFieldPickMemo);

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
  // FIELD BANDS (surface only): a claimed climate stratum swaps in (or
  // tilts) the candidate table — the capital's structure. Biome affinities
  // still multiply inside the band; the all-zero fallback below floors it.
  const band = dimension === 'surface' ? bandFor(climate) : null;
  const src = band ? bandCandidates(band, table) : table;
  const weights: number[] = new Array(src.length);
  let total = 0;
  for (let i = 0; i < src.length; i++) {
    const s = src[i];
    const w = (s.weight ?? 1) * climateAffinity(BIOMES[s.biome]?.climate, climate);
    weights[i] = w; total += w;
  }
  const h = hashCell(gx, gy, (fieldSeed ^ 0x5bd1e995) >>> 0);
  let picked = src[src.length - 1].biome;
  if (total <= 0) {
    let raw = 0;
    for (const s of src) raw += s.weight ?? 1;
    let r = (h / 0x100000000) * raw;
    for (const s of src) { r -= s.weight ?? 1; if (r <= 0) { picked = s.biome; break; } }
  } else {
    let r = (h / 0x100000000) * total;
    for (let i = 0; i < src.length; i++) {
      r -= weights[i];
      if (r <= 0) { picked = src[i].biome; break; }
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
  return [
    ...BIOME_FIELD.filter(s => !BIOMES[s.biome]).map(s => s.biome),
    // Band tables walk the same check (an unknown biome in a band would
    // silently pick nothing), plus their stratum axis must be registered.
    ...BIOME_FIELD_BANDS.flatMap(b => [
      ...b.table.filter(s => !BIOMES[s.biome]).map(s => `${b.id}: ${s.biome}`),
      ...(climateAt({ x: 0, y: 0 }, 1)[b.when.axis] === undefined ? [`${b.id}: unknown axis '${b.when.axis}'`] : []),
    ]),
  ];
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
