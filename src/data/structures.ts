// ---------------------------------------------------------------------------
// STRUCTURE BLUEPRINTS — buildings as data.
//
// A structure is a reusable arrangement: WALL STRIPS (rows of wall posts
// with door gaps left where you omit them), PROPS (any doodad kind),
// BREAKABLES (destructible clutter monsters: barrels, crates), and NPCS
// (friendly scenery folk). All coordinates are relative to the structure's
// center. The same vocabulary that makes a small house makes a blacksmith,
// an inn — and tomorrow a fortress, a castle, a faction hall, a ruin.
// ---------------------------------------------------------------------------

import type { DoodadKind, DoodadEffect } from '../engine/levelgen';
import { mod, type Modifier } from '../engine/stats';

export interface WallStrip {
  /** Start point (relative) and length along an axis. */
  x: number; y: number;
  /** 'h' runs +x, 'v' runs +y. */
  dir: 'h' | 'v';
  length: number;
}

// --- PLAN STRUCTURES ---------------------------------------------------------
// A structure can carry a CHAR-GRID BLUEPRINT (`plan`) instead of wall strips:
// rows of legend characters, each resolving to a CellSpec — a wall region, a
// door, a window, a roof cell, a prop, a garrison slot. The same vocabulary
// covers a hut and a concentric fortress; procedural GENERATORS (castle,
// labyrinth — engine/structureGen.ts) emit the identical plan format, so one
// downstream pipeline (placeStructurePlan) raises everything. Plan structures
// paint the walk GRID (interiors are real carved space), reserve a true RECT
// footprint, and guarantee every perimeter door an open APRON outside it.

/** What one legend character means inside a plan. All fields optional and
 *  composable: a cell can paint a region AND drop a doodad AND be roofed. */
export interface CellSpec {
  /** Paint this walk-grid region (rampart/window/parapet/ground/...). */
  region?: string;
  /** Interior floor: painted walkable and counted for roofs:'auto'. */
  interior?: boolean;
  /** Unroofed interior (courtyards): walkable floor, never roofed. */
  courtyard?: boolean;
  /** Drop a doodad at the cell center (radius defaults to 0.55 × cellSize). */
  doodad?: { kind: DoodadKind; radius?: number; effect?: DoodadEffect };
  /** A DOOR cell: emits a door doodad + a PlacedDoor record. Dwell-openable,
   *  breakable (spawns a passive door-actor), or both; sealed = neither (a
   *  future lock/lever opens it via setDoorState). */
  door?: { mode: 'dwell' | 'breakable' | 'both' | 'sealed'; life?: number; dwell?: number };
  /** A garrison SLOT at the cell center (towers): AI may claim it, gaining the
   *  slot's mods while holding it (see PlacedSlot / the garrison verb). */
  slot?: { kind: string; capacity?: number; mods?: Modifier[]; entry?: 'teleport' | 'walk'; leash?: number };
  /** Spawn a destructible clutter monster here (crate/barrel — data ids). */
  breakable?: string;
  /** Spawn a friendly scenery NPC here. */
  npc?: string;
}

/** An INTERWOVEN GROUND-EFFECT layer stamped over a placed structure — the
 *  fire-laden siege: cinder floors, ember vents, lingering hazards, any doodad
 *  kind + optional DoodadEffect, scattered over the matching cells. */
export interface FxLayerSpec {
  /** Which cells the layer covers: interior floors, the wall perimeter, or
   *  every cell of a specific legend char. */
  where: 'interior' | 'perimeter' | 'char';
  char?: string;
  doodad: { kind: DoodadKind; radius: [number, number]; effect?: DoodadEffect };
  /** Instances per 100 matching cells (rolled). */
  countPer100Cells: [number, number];
}

export interface StructureDef {
  id: string;
  /** Half-extents of the reserved footprint (legacy wall-strip structures; plan
   *  structures derive their true rect from the plan dimensions instead). */
  halfW: number;
  halfH: number;
  walls?: WallStrip[];
  props?: { kind: DoodadKind; x: number; y: number; radius?: number }[];
  breakables?: { id: string; x: number; y: number }[];
  npcs?: { id: string; x: number; y: number }[];
  /** Pre-inhabited: the level generator posts a guard pack of this faction at
   *  the footprint (reuses the walled-camp guard pattern in World.loadZone). */
  garrison?: string;
  /** Garrison pack size override [lo, hi] (default [3, 5]). */
  garrisonSize?: [number, number];
  // --- plan-structure fields (all optional; legacy defs untouched) ----------
  /** Char-grid blueprint rows (see STRUCTURE_LEGEND). Presence routes the def
   *  through placeStructurePlan (grid-painted interiors, rect reservation). */
  plan?: string[];
  /** Per-def legend overrides, merged over the global STRUCTURE_LEGEND. */
  legend?: Record<string, CellSpec>;
  /** World units per plan cell (default: the walk grid cell, 30). */
  cellSize?: number;
  /** Procedural plan source (engine/structureGen registry) — emits plan rows
   *  from the zone rng; mutually exclusive with `plan`. */
  generator?: string;
  /** Knobs forwarded to the generator (sizes, tower counts, wall thickness…). */
  genParams?: Record<string, number | [number, number] | string | boolean>;
  /** Interwoven ground-effect layers stamped after placement. */
  fx?: FxLayerSpec[];
  /** Roof coverage: 'auto' derives roof rects from interior (non-courtyard)
   *  cells; omit for open-air structures. */
  roofs?: 'auto';
  /** ROOF_STYLES id (default 'timber'). */
  roofStyle?: string;
  /** Eligible for the 'bastion' whole-zone layout roll, at this weight. */
  bastion?: { weight: number };
  /** Reserved-rect margin around the footprint (default 1.5 × cellSize). */
  margin?: number;
}

// --- STRUCTURE LEGEND (registry) ----------------------------------------------
// The global char vocabulary plans draw from; a def's `legend` merges over it.
// One registerLegendChar call = a new cell kind every blueprint can use.
const STRUCTURE_LEGEND: Record<string, CellSpec> = {};

export function registerLegendChar(char: string, spec: CellSpec): void {
  if (char.length !== 1) { console.warn(`[structures] legend char '${char}' must be exactly one character`); return; }
  if (STRUCTURE_LEGEND[char]) console.warn(`[structures] re-registering legend char '${char}' — overriding`);
  STRUCTURE_LEGEND[char] = spec;
}

/** Resolve a plan char against a def's legend + the global legend. ' ' (and any
 *  unregistered char) = outside: untouched. */
export function legendCell(char: string, local?: Record<string, CellSpec>): CellSpec | undefined {
  return local?.[char] ?? STRUCTURE_LEGEND[char];
}

export function legendChars(): string[] { return Object.keys(STRUCTURE_LEGEND); }

registerLegendChar('#', { region: 'rampart' });                        // curtain wall
registerLegendChar('.', { interior: true });                           // roofed interior floor
registerLegendChar('_', { courtyard: true });                          // open-air interior floor
registerLegendChar('W', { region: 'window' });                         // arrow-slit
registerLegendChar('P', { region: 'parapet' });                        // battlement rim
registerLegendChar('D', { door: { mode: 'dwell' }, interior: true });  // dwell-open door
registerLegendChar('X', { door: { mode: 'both' }, interior: true });   // breakable door
// Tower slot: the garrison perch. Holding it confers the tower's DEFENSIVE
// bonuses (the slot's mods ride the holder's sheet as the 'garrison' source).
registerLegendChar('T', {
  slot: { kind: 'tower', entry: 'teleport', mods: [mod('armor', 'flat', 40), mod('evasion', 'increased', 0.3)] },
  interior: true,
});
registerLegendChar('F', { doodad: { kind: 'campfire', radius: 14 }, courtyard: true });
registerLegendChar('o', { doodad: { kind: 'rock' }, courtyard: true });
registerLegendChar('~', { doodad: { kind: 'lava' }, courtyard: true }); // molten moat fill
registerLegendChar(',', { doodad: { kind: 'cinder' }, courtyard: true }); // ash floor
registerLegendChar('B', { breakable: 'barrel', interior: true });
registerLegendChar('C', { breakable: 'crate', interior: true });

// --- ROOF STYLES (registry) ----------------------------------------------------
// How a roof rect renders (Batch D drawRoofs consumes): fill + edge + rest alpha.
// The roof FADES when the local hero steps under it — interiors act as a pseudo
// fog of war detached from vision/light, exactly the fake-2D depth ask.
export interface RoofStyle {
  id: string;
  fill: string;
  edge: string;
  /** Opacity while the hero is OUTSIDE (near-opaque hides the interior). */
  alpha: number;
  /** Simple pattern hint for the renderer ('shingles' | 'planks' | 'stone'). */
  pattern?: string;
}

const ROOF_STYLES: Record<string, RoofStyle> = {};

export function registerRoofStyle(def: RoofStyle): void {
  if (ROOF_STYLES[def.id]) console.warn(`[structures] re-registering roof style '${def.id}' — overriding`);
  ROOF_STYLES[def.id] = def;
}

export function roofStyle(id: string | undefined): RoofStyle {
  return (id && ROOF_STYLES[id]) || ROOF_STYLES.timber;
}

export function hasRoofStyle(id: string): boolean { return id in ROOF_STYLES; }

registerRoofStyle({ id: 'timber', fill: '#4a3a28', edge: '#2e2418', alpha: 0.96, pattern: 'planks' });
registerRoofStyle({ id: 'slate', fill: '#39404e', edge: '#232833', alpha: 0.96, pattern: 'shingles' });
registerRoofStyle({ id: 'stone', fill: '#474b52', edge: '#2c2f35', alpha: 0.96, pattern: 'stone' });

export const STRUCTURES: Record<string, StructureDef> = {

  // A one-room cottage: three walls and a south-facing doorway.
  house_small: {
    id: 'house_small', halfW: 70, halfH: 60,
    walls: [
      { x: -70, y: -60, dir: 'h', length: 140 },  // north
      { x: -70, y: -60, dir: 'v', length: 120 },  // west
      { x: 70, y: -60, dir: 'v', length: 120 },   // east
      { x: -70, y: 60, dir: 'h', length: 30 },    // south, left of the WIDE door
      { x: 50, y: 60, dir: 'h', length: 20 },     // south, right of the door
    ],
    breakables: [
      { id: 'crate', x: -45, y: -35 },
      { id: 'barrel', x: 48, y: -38 },
    ],
  },

  // The quartermaster's house: a cottage like house_small, but the quest-giver
  // stands inside. Added to Lastlight only once the Quest Package is bought.
  quest_house: {
    id: 'quest_house', halfW: 70, halfH: 60,
    walls: [
      { x: -70, y: -60, dir: 'h', length: 140 },
      { x: -70, y: -60, dir: 'v', length: 120 },
      { x: 70, y: -60, dir: 'v', length: 120 },
      { x: -70, y: 60, dir: 'h', length: 30 },
      { x: 50, y: 60, dir: 'h', length: 20 },
    ],
    breakables: [
      { id: 'crate', x: -45, y: -35 },
      { id: 'barrel', x: 48, y: -38 },
    ],
    npcs: [{ id: 'townsfolk_questgiver', x: 0, y: 10 }],
  },

  // The Caravan: an open camp (no walls) — a fire, pack-rocks, and stores, with the
  // Caravanner waiting by it. Composed from existing doodad kinds (no wagon kind).
  caravan: {
    id: 'caravan', halfW: 110, halfH: 80,
    props: [
      { kind: 'campfire', x: 0, y: 34, radius: 14 },
      { kind: 'rock', x: -78, y: -8, radius: 13 },
      { kind: 'rock', x: 80, y: -2, radius: 12 },
      { kind: 'tree', x: 60, y: -48, radius: 16 },
    ],
    breakables: [
      { id: 'crate', x: -46, y: 42 },
      { id: 'barrel', x: 48, y: 46 },
      { id: 'crate', x: -8, y: -44 },
    ],
    npcs: [{ id: 'townsfolk_caravanner', x: 0, y: -18 }],
  },

  // The forge: an open-fronted workshop, anvil stone and a roaring fire.
  blacksmith: {
    id: 'blacksmith', halfW: 90, halfH: 70,
    walls: [
      { x: -90, y: -70, dir: 'h', length: 180 },  // north
      { x: -90, y: -70, dir: 'v', length: 140 },  // west
      { x: 90, y: -70, dir: 'v', length: 80 },    // east (half: open front)
    ],
    props: [
      { kind: 'campfire', x: -40, y: -20, radius: 14 }, // the forge
      { kind: 'rock', x: 20, y: -10, radius: 12 },      // the anvil stone
    ],
    breakables: [
      { id: 'crate', x: 55, y: -40 },
      { id: 'barrel', x: -65, y: 30 },
    ],
    npcs: [{ id: 'townsfolk_smith', x: -10, y: 15 }],
  },

  // The inn: a long hall, door on the east, hearth and stacked stores.
  inn: {
    id: 'inn', halfW: 110, halfH: 75,
    walls: [
      { x: -110, y: -75, dir: 'h', length: 220 }, // north
      { x: -110, y: 75, dir: 'h', length: 220 },  // south
      { x: -110, y: -75, dir: 'v', length: 150 }, // west
      { x: 110, y: -75, dir: 'v', length: 35 },   // east above the WIDE door
      { x: 110, y: 50, dir: 'v', length: 25 },    // east below the door
    ],
    props: [
      { kind: 'campfire', x: -70, y: 0, radius: 13 },   // the hearth
    ],
    breakables: [
      { id: 'barrel', x: 60, y: -45 },
      { id: 'barrel', x: 80, y: -45 },
      { id: 'crate', x: 70, y: 45 },
    ],
    npcs: [{ id: 'townsfolk_innkeep', x: -30, y: -30 }],
  },

  // A training yard: a fire, a weapon-rack rock or two — the dummy stands at the
  // centre (spawned by the World as an enemy so you can attack it).
  training_yard: {
    id: 'training_yard', halfW: 96, halfH: 84,
    props: [
      { kind: 'campfire', x: -56, y: -44, radius: 12 },
      { kind: 'rock', x: 58, y: 48, radius: 12 },
      { kind: 'rock', x: -64, y: 52, radius: 10 },
    ],
    breakables: [
      { id: 'crate', x: 60, y: -40 },
      { id: 'barrel', x: -62, y: -8 },
    ],
  },

  // The Salvage Station: a breaker's bench — slab, scrap heaps, tool crates.
  // Dwelling here opens the salvage/craft menu (the World reads proximity to
  // SALVAGE_SITE in townBuild.ts). Placeholder geometry like everything else.
  salvage_bench: {
    id: 'salvage_bench', halfW: 70, halfH: 58,
    props: [
      { kind: 'rock', x: 0, y: -6, radius: 16 },   // the bench slab
      { kind: 'rock', x: -44, y: 22, radius: 9 },  // scrap heap
      { kind: 'rock', x: 46, y: 18, radius: 8 },   // scrap heap
    ],
    breakables: [
      { id: 'crate', x: 40, y: -34 },
      { id: 'barrel', x: -44, y: -28 },
    ],
  },

  // A traveller's campfire: a ring of stones round a fire. Dwelling here REFRESHES
  // the wilds (the World reads the player's proximity to CAMPFIRE_SITE).
  campfire_site: {
    id: 'campfire_site', halfW: 62, halfH: 62,
    props: [
      { kind: 'campfire', x: 0, y: 0, radius: 18 },
      { kind: 'rock', x: -42, y: 30, radius: 10 },
      { kind: 'rock', x: 44, y: 26, radius: 9 },
      { kind: 'rock', x: 6, y: -44, radius: 8 },
      { kind: 'rock', x: -34, y: -30, radius: 7 },
    ],
  },

  // A wayside camp: ring of stones, a fire, supplies. Drops into any biome.
  wayside_camp: {
    id: 'wayside_camp', halfW: 60, halfH: 60,
    props: [
      { kind: 'campfire', x: 0, y: 0, radius: 14 },
      { kind: 'rock', x: -40, y: -25, radius: 12 },
      { kind: 'rock', x: 38, y: -30, radius: 10 },
    ],
    breakables: [
      { id: 'crate', x: 30, y: 30 },
      { id: 'barrel', x: -30, y: 32 },
    ],
  },

  // A HOLDFAST toll-gate: a fortified barricade — two posts and a wall with a central
  // gap straddling the bonus exit — raised by a guardian faction (the Bandit wardens).
  // No `garrison`: the Holdfast runtime spawns its own TAGGED wardens (neutral until
  // roused) so the dwell/pay/kill hooks resolve, and the engine splices these gate
  // walls away on unlock. Stamped live around the portal by World.placeHoldfast.
  toll_gate: {
    id: 'toll_gate', halfW: 130, halfH: 64,
    walls: [
      { x: -130, y: -48, dir: 'v', length: 96 },  // left post
      { x: 130, y: -48, dir: 'v', length: 96 },   // right post
      { x: -130, y: -48, dir: 'h', length: 92 },  // top bar, left of the gate gap
      { x: 40, y: -48, dir: 'h', length: 90 },     // top bar, right of the gate gap
    ],
    props: [
      { kind: 'rock', x: 96, y: 34, radius: 12 }, // a marker stone (the wardens' fire is rolled decor)
    ],
    breakables: [
      { id: 'crate', x: -58, y: 22 },
      { id: 'barrel', x: 72, y: 18 },
    ],
  },

  // --- FACTION POIs (batch 6): pre-inhabited strongholds. Each posts a guard
  //     pack of its garrison faction, so the right structure in the right
  //     biome is itself the biome↔faction tie for points of interest.

  // A war camp: a palisade box with a south gate, fire in the yard. The
  // desert's gnoll packs hold it (goblin's ally — a shared front).
  faction_war_camp: {
    id: 'faction_war_camp', halfW: 150, halfH: 130,
    walls: [
      { x: -150, y: -130, dir: 'h', length: 300 }, // north
      { x: -150, y: 130, dir: 'h', length: 110 },  // south, left of gate
      { x: 90, y: 130, dir: 'h', length: 60 },     // south, right of gate
      { x: -150, y: -130, dir: 'v', length: 260 }, // west
      { x: 150, y: -130, dir: 'v', length: 260 },  // east
    ],
    props: [{ kind: 'campfire', x: 0, y: 0, radius: 15 }],
    breakables: [
      { id: 'crate', x: 50, y: 40 },
      { id: 'barrel', x: -50, y: 40 },
    ],
    garrison: 'gnoll', garrisonSize: [4, 6],
  },

  // A pillaged township: broken walls, rubble, and graves — the dead walk the
  // ruins of what they overran.
  pillaged_township: {
    id: 'pillaged_township', halfW: 170, halfH: 140,
    walls: [
      { x: -170, y: -140, dir: 'h', length: 120 }, // north, broken
      { x: 60, y: -140, dir: 'h', length: 110 },
      { x: -170, y: -140, dir: 'v', length: 90 },  // west stub
    ],
    props: [
      { kind: 'rock', x: -80, y: -50, radius: 18 },
      { kind: 'tombstone', x: 40, y: 20, radius: 13 },
      { kind: 'tombstone', x: -30, y: 50, radius: 12 },
    ],
    breakables: [{ id: 'barrel', x: 0, y: 0 }],
    garrison: 'undead', garrisonSize: [4, 7],
  },

  // A fortress gate: twin towers and a thick wall with a central choke. The
  // wasteland's demon host garrisons the threshold.
  fortress_gate: {
    id: 'fortress_gate', halfW: 190, halfH: 90,
    walls: [
      { x: -190, y: -90, dir: 'h', length: 130 }, // north, left of gate
      { x: 60, y: -90, dir: 'h', length: 130 },   // north, right of gate
      { x: -190, y: -90, dir: 'v', length: 120 }, // left tower
      { x: -190, y: 40, dir: 'v', length: 50 },
      { x: 190, y: -90, dir: 'v', length: 120 },  // right tower
      { x: 190, y: 40, dir: 'v', length: 50 },
    ],
    props: [
      { kind: 'rock', x: -150, y: 0, radius: 16 },
      { kind: 'rock', x: 150, y: 0, radius: 16 },
    ],
    garrison: 'demon', garrisonSize: [5, 7],
  },

  // A faction hall: a long timber hall with an east door, hearth within. The
  // grove's Sylvan wardens keep it.
  faction_hall: {
    id: 'faction_hall', halfW: 130, halfH: 110,
    walls: [
      { x: -130, y: -110, dir: 'h', length: 260 }, // north
      { x: -130, y: 110, dir: 'h', length: 260 },  // south
      { x: -130, y: -110, dir: 'v', length: 220 }, // west
      { x: 130, y: -110, dir: 'v', length: 80 },   // east above door
      { x: 130, y: 50, dir: 'v', length: 60 },     // east below door
    ],
    props: [{ kind: 'campfire', x: -50, y: 0, radius: 14 }],
    breakables: [{ id: 'crate', x: 60, y: -40 }],
    garrison: 'sylvan', garrisonSize: [4, 6],
  },

  // --- CRUSADE WORKS: the structures a Crusade raises as it holds a zone longer.
  //     Stamped into a live arena at load by World per the zone's influence tier
  //     (touched → occupied → entrenched → converted). No `garrison` field: the
  //     Crusade spawns its own tagged forces (a captain / commander / the sanctum
  //     gate) so the kill hooks can resolve the tier. Reused for ANY crusading
  //     faction — these are siege-works, not faction-specific art.

  // TOUCHED — a planted outpost: a brazier and a few sandbag rocks. Few changes.
  crusade_outpost: {
    id: 'crusade_outpost', halfW: 56, halfH: 56,
    props: [
      { kind: 'campfire', x: 0, y: 0, radius: 13 },
      { kind: 'rock', x: -34, y: 18, radius: 11 },
      { kind: 'rock', x: 32, y: 22, radius: 10 },
    ],
  },

  // OCCUPIED — a war camp: a palisade box with a south gate and a muster fire.
  crusade_camp: {
    id: 'crusade_camp', halfW: 150, halfH: 130,
    walls: [
      { x: -150, y: -130, dir: 'h', length: 300 }, // north
      { x: -150, y: 130, dir: 'h', length: 110 },   // south, left of gate
      { x: 90, y: 130, dir: 'h', length: 60 },      // south, right of gate
      { x: -150, y: -130, dir: 'v', length: 260 },  // west
      { x: 150, y: -130, dir: 'v', length: 260 },   // east
    ],
    props: [
      { kind: 'campfire', x: 0, y: -10, radius: 15 },
      { kind: 'rock', x: -90, y: 70, radius: 12 },
      { kind: 'rock', x: 95, y: 60, radius: 12 },
    ],
    breakables: [
      { id: 'crate', x: 55, y: 50 },
      { id: 'barrel', x: -55, y: 55 },
    ],
  },

  // ENTRENCHED — a fortress: thick outer walls, twin gate towers, an inner keep.
  crusade_fortress: {
    id: 'crusade_fortress', halfW: 210, halfH: 180,
    walls: [
      { x: -210, y: -180, dir: 'h', length: 170 }, // north, left of gate
      { x: 40, y: -180, dir: 'h', length: 170 },    // north, right of gate
      { x: -210, y: 180, dir: 'h', length: 420 },   // south
      { x: -210, y: -180, dir: 'v', length: 360 },  // west
      { x: 210, y: -180, dir: 'v', length: 360 },   // east
      // inner keep — a smaller chamber, door to the south
      { x: -70, y: -50, dir: 'h', length: 140 },    // keep north
      { x: -70, y: -50, dir: 'v', length: 90 },     // keep west
      { x: 70, y: -50, dir: 'v', length: 90 },      // keep east
    ],
    props: [
      { kind: 'campfire', x: 0, y: -5, radius: 14 },
      { kind: 'rock', x: -170, y: 0, radius: 16 },  // left tower mass
      { kind: 'rock', x: 170, y: 0, radius: 16 },   // right tower mass
    ],
    breakables: [
      { id: 'crate', x: 120, y: 110 },
      { id: 'barrel', x: -120, y: 115 },
    ],
  },

  // CONVERTED — the bastion: the capital keep at the heart of the faction-city,
  //   a thick double-walled core. The sanctum gate is placed at its centre by the
  //   engine (where the Crusade Leader's realm tears open).
  crusade_bastion: {
    id: 'crusade_bastion', halfW: 180, halfH: 160,
    walls: [
      { x: -180, y: -160, dir: 'h', length: 150 }, // north, left of gate
      { x: 60, y: -160, dir: 'h', length: 120 },    // north, right of gate
      { x: -180, y: 160, dir: 'h', length: 360 },   // south
      { x: -180, y: -160, dir: 'v', length: 320 },  // west
      { x: 180, y: -160, dir: 'v', length: 320 },   // east
      // inner ring around the sanctum focus
      { x: -90, y: -80, dir: 'h', length: 70 },
      { x: 30, y: -80, dir: 'h', length: 60 },
      { x: -90, y: -80, dir: 'v', length: 160 },
      { x: 90, y: -80, dir: 'v', length: 160 },
    ],
    props: [
      { kind: 'campfire', x: -120, y: 110, radius: 13 },
      { kind: 'campfire', x: 120, y: 110, radius: 13 },
    ],
  },

  // CONVERTED filler — a rampart segment scattered across the city arena to make
  //   the converted zone a doodad LABYRINTH (the "traversing a faction city" feel).
  crusade_rampart: {
    id: 'crusade_rampart', halfW: 90, halfH: 64,
    walls: [
      { x: -90, y: -64, dir: 'h', length: 130 },
      { x: 30, y: -64, dir: 'v', length: 128 },
    ],
  },

  // --- PLAN STRUCTURES (generator-emitted blueprints) ------------------------
  // halfW/halfH on plan defs are DOCUMENTATION-grade estimates only — the plan
  // pipeline derives the true rect from the emitted rows × cellSize.

  // A curtain-walled castle: corner towers (garrison slots), arrow-slit windows,
  // a breakable gate, a roofed keep with a dwell door. Rolled in desert country;
  // bastion-eligible everywhere a biome lists it.
  grand_castle: {
    id: 'grand_castle', halfW: 420, halfH: 340,
    generator: 'castle', cellSize: 30, // multiple of the walk cell = exact painting
    genParams: { w: [21, 29], h: [15, 21], gates: [1, 2] },
    roofs: 'auto', roofStyle: 'slate',
    bastion: { weight: 3 },
  },

  // The concentric fortress: a second inner wall with an offset gate — breach
  // the outer ring and the approach to the inner gate is a killing ground.
  fortress: {
    id: 'fortress', halfW: 440, halfH: 360,
    generator: 'castle', cellSize: 30,
    genParams: { w: [23, 31], h: [17, 23], concentric: true, gates: [1, 1] },
    roofs: 'auto', roofStyle: 'stone',
    bastion: { weight: 2 },
  },

  // The fire-laden SIEGE: a castle whose grounds burn — cinder floors, ember
  // vents erupting inside the walls, a demon garrison holding it. The showcase
  // of interwoven ground effects riding a structure def as pure data.
  siege_castle: {
    id: 'siege_castle', halfW: 420, halfH: 340,
    generator: 'castle', cellSize: 30,
    genParams: { w: [21, 27], h: [15, 21], gates: [2, 2], gateChar: 'X' },
    roofs: 'auto', roofStyle: 'stone',
    fx: [
      { where: 'interior', doodad: { kind: 'cinder', radius: [22, 40] }, countPer100Cells: [14, 22] },
      { where: 'interior', doodad: { kind: 'ember_vent', radius: [12, 15],
        effect: { id: 'lava_orb', interval: 3.6, radius: 60, chance: 0.75, power: 6, count: 1, ringRadius: 56, jitter: 28, blast: 60 } },
        countPer100Cells: [3, 6] },
    ],
    garrison: 'demon', garrisonSize: [4, 6],
    bastion: { weight: 2 },
  },

  // A whole-zone hedge maze with entrance + exit doors on opposite sides. Wide
  // cells keep the corridors comfortable; open-air (no roofs) so the run reads.
  hedge_labyrinth: {
    id: 'hedge_labyrinth', halfW: 480, halfH: 400,
    generator: 'labyrinth', cellSize: 60,
    genParams: { w: [13, 17], h: [11, 15], loops: [2, 4] },
    bastion: { weight: 2 },
  },

  // A lone garrison tower: parapet ring (shoot out, walk never), a slot core an
  // AI can teleport into, one dwell door for breaching on foot.
  watchtower: {
    id: 'watchtower', halfW: 90, halfH: 90,
    generator: 'watchtower', cellSize: 30,
    genParams: { size: 5 },
    // A posted guard pack — its longshots claim the tower crown themselves
    // (the garrison rule on their brain; the slot is the data seam).
    garrison: 'gnoll', garrisonSize: [2, 3],
  },

  // A city house for the METROPOLIS layout's intact blocks: one roofed room,
  // a dwell door, window slits — every block is a real enterable interior
  // (roof reveal + all), stamped dozens of times across a sprawl.
  metro_house: {
    id: 'metro_house', halfW: 120, halfH: 90,
    plan: [
      '########',
      '#......#',
      'W......W',
      '#......#',
      '###D####',
    ],
    cellSize: 30,
    roofs: 'auto', roofStyle: 'timber',
  },
};
