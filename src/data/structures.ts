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
   *  future lock/lever opens it via setDoorState). `lesson` names an ACCOUNT
   *  ledger key: the first dwell-open stamps it (tutorial-by-doing), and a
   *  graduated account's copy of the door mints already open — the teaching
   *  latch retires itself account-wide, the flask-lesson pattern. */
  door?: { mode: 'dwell' | 'breakable' | 'both' | 'sealed'; life?: number; dwell?: number; lesson?: string };
  /** WAKE HERE: exports the cell center as the layout's spawn point
   *  (GeneratedLayout.spawnAt). A zone whose plan marks one places arriving
   *  parties there when they enter WITHOUT a back-portal (a fresh run, a
   *  respawn) — the town's bedside wake. Last structure placed wins. */
  spawn?: boolean;
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
  /** INTERIOR CONFINEMENT: while the local hero stands under this structure's
   *  roof, their rendered vision is confined to the room — everything beyond
   *  the roof rects veils dark (render/vis/roomVeil.ts, VIS_CFG.roomVeil).
   *  The Cellar's smallness made LOCAL: a data flag, so a gazebo stays open
   *  and a windowless cottage closes in. Gameplay LoS is untouched — walls
   *  already occlude honestly; this is the drawn horizon of attention.
   *  TRUE = the whole roofed footprint is one volume (the windowless
   *  one-room home). 'rooms' = PER-ROOM: only the ENCLOSED room the hero
   *  stands in confines (PlacedRoom ledger — flood-derived from the plan),
   *  so an open-fronted lean-to (the blacksmith) never wraps, a manor
   *  confines hall by hall, and a walled-but-open yard stays sky. Arrow-slit
   *  windows and parapet rims stay sealed but SPILL sight through. */
  confineVision?: boolean | 'rooms';
  /** Confinement darkness override (0..1 of the veil pass's own peak) — a
   *  lantern-lit undercroft may confine at 0.6 where a windowless cottage
   *  closes at the full dark. */
  confineAlpha?: number;
  /** FLOOR_STYLES id — bakes a real floor (boards, cobble…) under the
   *  plan's interior cells, doorways included. Omitted = bare ground. */
  floorStyle?: string;
  /** FLOOR_STYLES id for COURTYARD cells (a paved work apron, a parade
   *  ground). Omitted = courtyards stay natural ground. */
  courtyardFloorStyle?: string;
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
// FURNITURE — the settlement clutter wave, blueprint-placeable. Any plan
// anywhere can now furnish a room with one character.
registerLegendChar('b', { doodad: { kind: 'bench', radius: 13 }, interior: true });
registerLegendChar('p', { doodad: { kind: 'pot_cluster', radius: 12 }, interior: true });
registerLegendChar('f', { doodad: { kind: 'firewood_pile', radius: 13 }, interior: true });
registerLegendChar('z', { doodad: { kind: 'brazier', radius: 10 }, interior: true });
registerLegendChar('L', { doodad: { kind: 'lantern_post', radius: 10 }, courtyard: true });
registerLegendChar('H', { doodad: { kind: 'hay_bale', radius: 14 }, courtyard: true });
registerLegendChar('M', { doodad: { kind: 'market_stall', radius: 24 }, courtyard: true });
registerLegendChar('G', { doodad: { kind: 'banner_post', radius: 10 }, courtyard: true });
// HOME FURNISHINGS — the hearth-and-bed wave: a lived-in room in five chars.
registerLegendChar('Z', { doodad: { kind: 'bed', radius: 15 }, interior: true });      // a bed (zzz)
registerLegendChar('h', { doodad: { kind: 'hearth', radius: 13 }, interior: true });   // the warm heart
registerLegendChar('s', { doodad: { kind: 'stool', radius: 9 }, interior: true });
registerLegendChar('k', { doodad: { kind: 'shelf', radius: 13 }, interior: true });    // booKshelf
registerLegendChar('r', { doodad: { kind: 'rug', radius: 16 }, interior: true });      // walkable decal
// WAKE HERE — the spawn cell (CellSpec.spawn): plain floor that exports the
// layout's spawn point. Any plan anywhere may claim where newcomers wake.
registerLegendChar('S', { spawn: true, interior: true });

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
// Straw over a home: the same plank painter in cut-hay tones — a roof that
// reads warm from the square (a new pattern would be a renderer verb; a new
// palette is one data row — the cheaper lever wins until thatch needs more).
registerRoofStyle({ id: 'thatch', fill: '#6e5a30', edge: '#463a1e', alpha: 0.96, pattern: 'planks' });

// --- FLOOR STYLES (registry) ---------------------------------------------------
// How a structure's INTERIOR ground renders — townsfolk don't live in the mud.
// Floors bake into the terrain chunks under each placed structure's footprint
// (render/vis/floors.ts painters): boards with staggered butt joints, cobble
// with grout, flagstone slabs, temple tile, packed earth. One registry row +
// `floorStyle` on a def = a floored building; `courtyardFloorStyle` paves the
// open-air cells (a smith's work apron, a keep's parade ground).
export interface FloorStyle {
  id: string;
  /** Base surface tone. */
  fill: string;
  /** Seam/grout tone between units. */
  seam: string;
  /** Pattern the painter renders: 'boards' | 'cobble' | 'flagstone' | 'tile' | 'packed'. */
  pattern: string;
  /** Unit size in world units (plank width / stone diameter / tile edge). */
  unit?: number;
}

const FLOOR_STYLES: Record<string, FloorStyle> = {};

export function registerFloorStyle(def: FloorStyle): void {
  if (FLOOR_STYLES[def.id]) console.warn(`[structures] re-registering floor style '${def.id}' — overriding`);
  FLOOR_STYLES[def.id] = def;
}

export function floorStyleOf(id: string | undefined): FloorStyle | undefined {
  return id ? FLOOR_STYLES[id] : undefined;
}

registerFloorStyle({ id: 'boards', fill: '#5c4630', seam: '#3a2c1c', pattern: 'boards', unit: 11 });
registerFloorStyle({ id: 'cobble', fill: '#565048', seam: '#38332c', pattern: 'cobble', unit: 13 });
registerFloorStyle({ id: 'flagstone', fill: '#4e4a42', seam: '#322f28', pattern: 'flagstone', unit: 24 });
registerFloorStyle({ id: 'tile', fill: '#5a5248', seam: '#3c362e', pattern: 'tile', unit: 16 });
registerFloorStyle({ id: 'packed', fill: '#3a3022', seam: '#2c2418', pattern: 'packed', unit: 20 });

export const STRUCTURES: Record<string, StructureDef> = {

  // A one-room cottage — a PLAN now: boarded floor, a dwell-open door, a
  // hearth-warm interior that reveals as you step beneath the roof.
  house_small: {
    id: 'house_small', halfW: 91, halfH: 65, cellSize: 26,
    plan: [
      '#######',
      '#p...C#',
      '#.....#',
      '#b....#',
      '###D###',
    ],
    confineVision: 'rooms',
    roofs: 'auto', roofStyle: 'timber', floorStyle: 'boards',
  },

  // The cellar-house: the same one-room cottage, but its floorboards hide a
  // HATCH — dwell on it (from inside; the wall gives nobody the cellar) to
  // descend into the town's cellar (data/sidezones.ts 'cellar_hatch'). The
  // hatch sits at the BACK of the room, three rows from the doorway — the
  // door dwell and the hatch dwell can never build from the same spot.
  cellar_house: {
    id: 'cellar_house', halfW: 91, halfH: 65, cellSize: 26,
    plan: [
      '#######',
      '#p.V.C#',
      '#.....#',
      '#b....#',
      '###D###',
    ],
    legend: { V: { doodad: { kind: 'cellar_hatch', radius: 13 }, interior: true } },
    confineVision: 'rooms',
    roofs: 'auto', roofStyle: 'timber', floorStyle: 'boards',
  },

  // THE WAKING HOUSE — where every run opens its eyes. The player wakes at
  // the bedside ('S' beside the bed), inside a room that teaches by BEING a
  // room: vision confined to these four walls (confineVision — navigate
  // before the world exists), a hearth for light, furniture to steer
  // around, and one latched door whose deliberate dwell IS the dwelling
  // lesson (door.lesson graduates the account: veterans wake to it open).
  // Weather never reaches inside — the roof owns its sky.
  waking_house: {
    id: 'waking_house', halfW: 91, halfH: 78, cellSize: 26,
    plan: [
      '#######',
      '#Zk..p#',
      '#S....#',
      '#r..s.#',
      '#h....#',
      '###D###',
    ],
    legend: {
      // The teaching door: a full-second push (default doors swing at 0.45)
      // — long enough that the ring is READ, short enough to never gate a
      // veteran twice (the lesson key mints later copies open).
      D: { door: { mode: 'dwell', dwell: 1.0, lesson: 'waking_door_unlatched' }, interior: true },
    },
    confineVision: true,
    roofs: 'auto', roofStyle: 'thatch', floorStyle: 'boards',
  },

  // The cellar itself: one broad flagstone slab (the blacksmith's stone,
  // underground) with somebody's stores in the corners. No walls — the room's
  // own bounds enclose it; no roof — you're already under the house. Barren
  // until a package digs deeper (The Pit plants its maw here via furnish).
  cellar_room: {
    id: 'cellar_room', halfW: 270, halfH: 180, cellSize: 30,
    plan: [
      '__________________',
      '__________________',
      '_p________________',
      '__________________',
      '_______________C__',
      '__________________',
      '_f________________',
      '__________________',
      '__________________',
      '__________________',
      '__________________',
      '__________________',
    ],
    floorStyle: 'flagstone', courtyardFloorStyle: 'flagstone',
  },

  // The Pit's maw — a broken ring of floor around the drop. Never rolled by
  // any zone: the pit package FURNISHES it into the cellar (furnish spec).
  pit_maw: {
    id: 'pit_maw', halfW: 45, halfH: 45, cellSize: 30,
    plan: [
      '___',
      '_O_',
      '___',
    ],
    legend: { O: { doodad: { kind: 'pit_entrance', radius: 26 }, courtyard: true } },
    courtyardFloorStyle: 'flagstone',
  },

  // The quartermaster's house: the cottage with the quest-giver inside.
  // Added to Lastlight only once the Quest Package is bought.
  quest_house: {
    id: 'quest_house', halfW: 91, halfH: 65, cellSize: 26,
    plan: [
      '#######',
      '#C...p#',
      '#.....#',
      '#....b#',
      '###D###',
    ],
    confineVision: 'rooms',
    roofs: 'auto', roofStyle: 'timber', floorStyle: 'boards',
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

  // The forge — an OPEN YARD, the way a working smithy stands: one L-shaped
  // wall (north + west) cordons the lean-to, the flagstone shop floor runs
  // out into a COBBLED work apron, and the whole east + south face opens
  // onto the square. Brazier roaring, firewood stacked, the anvil stone at
  // the heart, Brandt at her counter.
  blacksmith: {
    id: 'blacksmith', halfW: 104, halfH: 65, cellSize: 26,
    plan: [
      '#######_',
      '#z.f..._',
      '#......_',
      '#B....._',
      '#_______',
    ],
    // 'rooms', deliberately: the lean-to's east+south stand OPEN, so the
    // room ledger derives it UNSEALED and the full veil never wraps the
    // yard — only the L-wall's own sight shadows cordon the back. The day
    // a storeroom is drawn onto this plan, it confines with zero edits.
    confineVision: 'rooms',
    roofs: 'auto', roofStyle: 'slate',
    floorStyle: 'flagstone', courtyardFloorStyle: 'cobble',
    props: [{ kind: 'rock', x: 20, y: -10, radius: 12 }], // the anvil stone
    npcs: [{ id: 'townsfolk_smith', x: -10, y: 15 }],
  },

  // The inn — the long hall as a PLAN: boarded floor, benches down the
  // common room, the hearth-brazier, stores in the corner, a south door
  // opening onto the town square.
  inn: {
    id: 'inn', halfW: 130, halfH: 78, cellSize: 26,
    plan: [
      '##########',
      '#z......B#',
      '#.b....p.#',
      '#........#',
      '#.b....b.#',
      '#####D####',
    ],
    confineVision: 'rooms',
    roofs: 'auto', roofStyle: 'timber', floorStyle: 'boards',
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

  // The Oracle Stone: a ring of leaning monoliths. Dwelling here opens the
  // communion (affix-reroll) menu — the World reads proximity to ORACLE_SITE.
  oracle_site: {
    id: 'oracle_site', halfW: 68, halfH: 68,
    props: [
      { kind: 'tombstone', x: 0, y: -46, radius: 11 },
      { kind: 'tombstone', x: 44, y: -14, radius: 10 },
      { kind: 'tombstone', x: 28, y: 40, radius: 10 },
      { kind: 'tombstone', x: -28, y: 40, radius: 10 },
      { kind: 'tombstone', x: -44, y: -14, radius: 10 },
      { kind: 'rock', x: 0, y: 0, radius: 13 }, // the altar slab
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

  // (The old 'toll_gate' STRUCTURES stamp is retired: a Holdfast's gate is a
  // BOUNDARY-GATE row now — data/boundaryGates.ts 'toll_gate' — raised into
  // the zone's generated terrain by the exitBoundaries annotation, with only
  // the sealed bar + wardens materialized at runtime by World.placeHoldfast.)

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

  // TOUCHED — a planted watch-post: corner stakes, the muster fire, the raised
  // standard. Open-air (no roof) — the lightest footprint on the ladder.
  crusade_outpost: {
    id: 'crusade_outpost', halfW: 91, halfH: 65, cellSize: 26,
    plan: [
      '##___##',
      '#__F__#',
      '___G___',
      '#__H__#',
      '##___##',
    ],
  },

  // OCCUPIED — the war camp: a palisade box, a BREAKABLE south gate, muster
  // fires, the quartermaster's stores. A true plan now: the gate is a real
  // door object and the crates/barrels actually spawn (the old walls/props
  // path silently dropped its breakables).
  crusade_camp: {
    id: 'crusade_camp', halfW: 156, halfH: 78, cellSize: 26,
    plan: [
      '############',
      '#_G______H_#',
      '#___F______#',
      '#B________C#',
      '#_H____F_G_#',
      '#####XX#####',
    ],
  },

  // ENTRENCHED — the fortress: real curtain walls off the castle generator —
  // corner TOWER SLOTS the garrison mans, arrow-slit windows, a breakable gate.
  crusade_fortress: {
    id: 'crusade_fortress', halfW: 225, halfH: 195, cellSize: 30,
    generator: 'castle', genParams: { w: [13, 15], h: [11, 13], gates: [1, 1], gateChar: 'X' },
    confineVision: 'rooms',
    roofs: 'auto', roofStyle: 'stone',
  },

  // CONVERTED — the bastion: the capital keep, CONCENTRIC (breach the outer
  // ring and the approach to the inner gate is a killing ground). The sanctum
  // gate tears open at its heart (engine-placed).
  crusade_bastion: {
    id: 'crusade_bastion', halfW: 240, halfH: 210, cellSize: 30,
    generator: 'castle', genParams: { w: [15, 17], h: [13, 15], concentric: true, gates: [1, 1], gateChar: 'X' },
    confineVision: 'rooms',
    roofs: 'auto', roofStyle: 'stone',
  },

  // CONVERTED filler — a parapet-topped rampart RUN (a real region-painted
  // wall now), scattered so the faction-city traverses as a labyrinth of works.
  crusade_rampart: {
    id: 'crusade_rampart', halfW: 91, halfH: 26, cellSize: 26,
    plan: [
      '#######',
      '__PPP__',
    ],
  },

  // --- THE VILLAGE KIT --------------------------------------------------------
  // Settlement pieces every builder shares: the crusade's converted capitals
  // fill their streets with these (CrusadeTier.cityFill), and a metropolis
  // face can roll them straight. All plan structures — real walls, doors,
  // roofs, floors — speaking the shared legend vocabulary; a new piece is one
  // def, no engine edits.

  // A one-room cottage: hearth-corner stores under a timber roof.
  cottage: {
    id: 'cottage', halfW: 91, halfH: 65, cellSize: 26,
    plan: [
      '#######',
      '#b...p#',
      '#.....#',
      '#f...C#',
      '###D###',
    ],
    confineVision: 'rooms',
    roofs: 'auto', roofStyle: 'timber', floorStyle: 'boards',
  },

  // The longhouse: a hall that sleeps a work-crew — benches down the middle,
  // stores at both gables.
  longhouse: {
    id: 'longhouse', halfW: 143, halfH: 65, cellSize: 26,
    plan: [
      '###########',
      '#p..b...bz#',
      '#.........#',
      '#B..f...bC#',
      '#####D#####',
    ],
    confineVision: 'rooms',
    roofs: 'auto', roofStyle: 'timber', floorStyle: 'boards',
  },

  // The chapel: a slate-roofed nave — braziers at the altar wall, bench rows,
  // flagstone underfoot.
  chapel: {
    id: 'chapel', halfW: 91, halfH: 91, cellSize: 26,
    plan: [
      '#######',
      '#z...z#',
      '#.....#',
      '#b...b#',
      '#.....#',
      '#b...b#',
      '###D###',
    ],
    confineVision: 'rooms',
    roofs: 'auto', roofStyle: 'slate', floorStyle: 'flagstone',
  },

  // The village square: an open cobbled plaza — market stalls facing in,
  // standards and lanterns, the common fire at its heart. No walls: the
  // square is the negative space the streets pour into.
  village_square: {
    id: 'village_square', halfW: 150, halfH: 105, cellSize: 30,
    plan: [
      '__________',
      '_M__G___M_',
      '____L_____',
      '_H___F__H_',
      '_____L____',
      '_M___G__M_',
      '__________',
    ],
    courtyardFloorStyle: 'cobble',
  },

  // --- THE GLOAM ESTATE (the Mournstead kit) --------------------------------
  // The manor you WALK INTO: a slate-roofed pile whose ground floor is real
  // in-zone space — four rooms off a central corridor, vision confined room
  // by room, the household's furniture under dust sheets, and the grand
  // stair at the corridor's head (manor_stair = the sidezone UP; the floors
  // above are minted zones, so the house is bigger inside than the map).
  // The undead garrison is the staff that never gave notice.
  gloam_manor: {
    id: 'gloam_manor', halfW: 180, halfH: 135, cellSize: 30,
    plan: [
      '############',
      '#k.g#Y.#m.i#',
      '#.t.#..#c..#',
      'W.c.D..D..hW',
      '#u..#..#..r#',
      '#####..#####',
      'Wc..D..D..cW',
      '#.u.#..#t.g#',
      '#####DD#####',
    ],
    legend: {
      Y: { doodad: { kind: 'manor_stair', radius: 16 }, interior: true },
      c: { doodad: { kind: 'candelabra', radius: 9 }, interior: true },
      u: { doodad: { kind: 'dust_sheet', radius: 15 }, interior: true },
      t: { doodad: { kind: 'banquet_table', radius: 24 }, interior: true },
      i: { doodad: { kind: 'standing_portrait', radius: 12 }, interior: true },
      g: { doodad: { kind: 'grandfather_clock', radius: 12 }, interior: true },
      m: { doodad: { kind: 'manor_mirror', radius: 12 }, interior: true },
    },
    garrison: 'undead', garrisonSize: [3, 5],
    confineVision: 'rooms',
    roofs: 'auto', roofStyle: 'slate', floorStyle: 'boards',
  },

  // The manor's SECOND STOREY — the plan a minted floor-zone furnishes
  // (never rolled on open ground): two bedrooms off the landing hall, the
  // attic stair at the balustrade, the way back DOWN through the south
  // door to the descent portal. 'S' wakes arrivals at the landing.
  manor_upper: {
    id: 'manor_upper', halfW: 150, halfH: 105, cellSize: 30,
    plan: [
      '##########',
      '#Z.u#m.ic#',
      'W.c.#..Z.W',
      '##D####D##',
      '#..g..t.u#',
      'Wc.S..A.mW',
      '####DD####',
    ],
    legend: {
      A: { doodad: { kind: 'attic_stair', radius: 16 }, interior: true },
      c: { doodad: { kind: 'candelabra', radius: 9 }, interior: true },
      u: { doodad: { kind: 'dust_sheet', radius: 15 }, interior: true },
      t: { doodad: { kind: 'banquet_table', radius: 22 }, interior: true },
      i: { doodad: { kind: 'standing_portrait', radius: 12 }, interior: true },
      g: { doodad: { kind: 'grandfather_clock', radius: 12 }, interior: true },
      m: { doodad: { kind: 'manor_mirror', radius: 12 }, interior: true },
    },
    confineVision: 'rooms',
    roofs: 'auto', roofStyle: 'slate', floorStyle: 'boards',
  },

  // The ATTIC — the top of the house and the end of the climb: one long
  // room under the ridge, the household's kept things, and the twin
  // mirrors nobody covered. Whatever still keeps the house keeps it here.
  manor_attic: {
    id: 'manor_attic', halfW: 120, halfH: 90, cellSize: 30,
    plan: [
      '########',
      '#u.gg.u#',
      '#c.mm.c#',
      '#......#',
      '#..S...#',
      '###DD###',
    ],
    legend: {
      c: { doodad: { kind: 'candelabra', radius: 9 }, interior: true },
      u: { doodad: { kind: 'dust_sheet', radius: 15 }, interior: true },
      g: { doodad: { kind: 'grandfather_clock', radius: 12 }, interior: true },
      m: { doodad: { kind: 'manor_mirror', radius: 12 }, interior: true },
    },
    confineVision: true,
    roofs: 'auto', roofStyle: 'slate', floorStyle: 'boards',
  },

  // A GARDEN GAZEBO: the estate lawn's roofed folly — corner lanterns hold
  // up a timber cap over open sides (an open lean-to: the veil never
  // confines it), benches facing whatever the garden used to be.
  garden_gazebo: {
    id: 'garden_gazebo', halfW: 60, halfH: 60, cellSize: 30,
    plan: [
      'L..L',
      '.b..',
      '..b.',
      'L..L',
    ],
    roofs: 'auto', roofStyle: 'timber', floorStyle: 'boards',
  },

  // A HAY BARN: the harvest rim's working hulk — bales still racked, doors
  // you can put a shoulder (or anything else) through on three sides.
  hay_barn: {
    id: 'hay_barn', halfW: 120, halfH: 90, cellSize: 30,
    plan: [
      '########',
      '#HH...C#',
      'X......#',
      'X....HH#',
      '#C...H.#',
      '###XX###',
    ],
    confineVision: 'rooms',
    roofs: 'auto', roofStyle: 'thatch', floorStyle: 'packed',
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
    confineVision: 'rooms',
    roofs: 'auto', roofStyle: 'slate',
    bastion: { weight: 3 },
  },

  // The concentric fortress: a second inner wall with an offset gate — breach
  // the outer ring and the approach to the inner gate is a killing ground.
  fortress: {
    id: 'fortress', halfW: 440, halfH: 360,
    generator: 'castle', cellSize: 30,
    genParams: { w: [23, 31], h: [17, 23], concentric: true, gates: [1, 1] },
    confineVision: 'rooms',
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
    confineVision: 'rooms',
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
    // Sealed by walls + slits: the room ledger keeps it enclosed and the
    // veil SPILLS sight through each W — a metropolis of real interiors.
    confineVision: 'rooms',
    roofs: 'auto', roofStyle: 'timber',
  },

  // --- COMPOUND SHOWCASES (the room-grammar composer) -------------------------
  // A country manor: BSP-split rooms around open courtyards, timber roofs —
  // wander in, and the roof reveal walks you room to room. The template for
  // every future estate/inn/guildhall: same generator, different knobs.
  walled_manor: {
    id: 'walled_manor', halfW: 300, halfH: 240,
    generator: 'compound', cellSize: 30,
    genParams: { w: [14, 19], h: [11, 15], courtyardChance: 0.3, windows: 5, clutterPer100: [3, 6] },
    // Room-by-room confinement: the veil walks the manor with you exactly
    // the way the roof reveal already does; courtyards stay open sky.
    confineVision: 'rooms',
    roofs: 'auto', roofStyle: 'timber',
    bastion: { weight: 2 },
  },

  // A dungeon block: windowless warren of breakable-door cells under stone —
  // the DUNGEON biome's bread-and-butter building, shipped early so the
  // biome is a layout pass, not an engine pass.
  dungeon_block: {
    id: 'dungeon_block', halfW: 330, halfH: 270,
    generator: 'compound', cellSize: 30,
    genParams: {
      w: [16, 22], h: [13, 17], minRoom: 3, courtyardChance: 0.08,
      windows: 0, doorChar: 'X', gateChar: 'X', loops: [2, 4], clutterPer100: [4, 8],
    },
    confineVision: 'rooms',
    roofs: 'auto', roofStyle: 'stone',
    garrison: 'undead', garrisonSize: [3, 5],
    bastion: { weight: 2 },
  },

  // A market row: long open-court stalls crowded with goods — the METROPOLIS
  // seed alongside metro_house (streets of these + houses = a district).
  market_row: {
    id: 'market_row', halfW: 300, halfH: 180,
    generator: 'compound', cellSize: 30,
    genParams: {
      w: [18, 24], h: [8, 11], minRoom: 3, splitBias: 0.95,
      courtyardChance: 0.55, windows: 0, gates: [2, 3], clutterPer100: [8, 14],
    },
    roofs: 'auto', roofStyle: 'timber',
  },
};
