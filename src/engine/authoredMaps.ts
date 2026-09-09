// ---------------------------------------------------------------------------
// THE AUTHORED-MAP FABRIC — a hand-made zone as pure DATA.
//
// An AuthoredMapDef is a CHAR-GRID of registered REGION KINDS (world/regions
// registerRegion ids — 'ground', 'wall', 'water', 'void', 'rampart', …) on the
// 30px walk lattice every generator already speaks, plus off-lattice DOODADS
// (any registered doodad kind), SPAWN SEATS (a def at a point — rarity, count,
// ambush, duty post), MARKERS (entry / boss / poi / camp / garrison /
// breakable / npc), FIXTURES (plan structures raised at exact coordinates —
// the town's own idiom) and EXIT SEATS (frontier promises on named sides),
// under a ZONE SHEET (name, dress tileset, objective, level, sky, camera,
// pack + dress + spoils policy, an optional bounty EXPEDITION block).
//
// ONE GENERATOR consumes it: 'authored' (registerLayout below) rasterizes the
// grid into the GridWalkField (the fieldLayout precedent: rasterize external
// data, carve stems to wherever the engine seated the portals, guarantee
// connectivity), pushes doodads/spawns/markers straight onto the GenCtx and
// raises fixtures through raiseStructure — so reachability, structure
// plans, zone load, saves, zone memory and the co-op wire all arrive from
// standing law with no edits anywhere. The map is named by
// `layoutParams.authored` (baked at mint, saved verbatim with the def) and
// resolved at GENERATION time against the live registry — edit the map,
// re-enter the zone, see the edit. A missing map degrades to the plains
// scatter with one warning, exactly like any unregistered layout.
//
// THREE LANES mint one: the quest lane (QuestZoneSpec.map → World.acceptQuest
// folds authoredZoneSpec under the quest's own words), the BOUNTY BOARD (the
// 'expedition' kind, data/bountyExpeditions.ts — the zone itself is the
// posting's objective, minted at the take) and the dev lanes
// (World.devMintAuthored / devRemintZone — the Map Forge's "mint & walk"
// loop). All three call World.mintAuthoredZone, the one directed mint.
//
// THE DETERMINISM LAW: the generator draws ZERO rng — every position is
// authored or hashed from authored data — so the same map + the same portals
// produce byte-identical ground on every seat, save, reload and co-op client.
//
// Registration: shipped rows live in data/authoredMaps.ts; editor rows graft
// through THE ATLAS (meta/atlas.ts) under the 'custom_' namespace law.
// Docs: docs/engine/authored-maps.md. Probe: balance/probe_authoredmaps.ts.
// ---------------------------------------------------------------------------

import { vec, type Vec2 } from '../core/math';
import type { LocaleFragment } from '../world/localeFragments';
import {
  ensureGrid, layoutParam, raiseStructure, registerLayout, scatterDecoration,
  hasDoodadRule, structureMaxFootprint, type GenCtx,
} from './levelgen';
import { registerGenPin } from './genPins';
import { hash01 } from './hash';
import { regionKind, regionIds } from '../world/regions';
import { PORTAL_EDGE_INSET, MIN_PORTAL_SEP, type ZoneSpec } from './worldgen';
import { TILESETS } from '../data/tilesets';
import { MONSTERS, FACTIONS, type WildlifeRow } from '../data/monsters';
import { STRUCTURES } from '../data/structures';
import { DOODAD_VISUALS } from '../data/doodadVisuals';
import { RARITY_DEFS } from './rarity';
import type { AmbushSpec } from './actor';
import type { PostSpec } from './brain';
import type { CameraModeId } from '../render/camera';
import type {
  ObjectiveSpec, PackSpec, SkyExposure, ZoneDef, ZoneExitDef, ZoneTheme,
} from '../data/zones';

/** The walk lattice — GEN_CELL / WALK_CELL / DEFAULT_CELL all agree on 30. */
export const MAP_CELL = 30;

/** The layout id the fabric registers. Pinned (engine/genPins.ts) so the
 *  orphan census sees the engine-side reference — no data row names it
 *  (defs carry it in layoutType, minted, never authored). */
export const AUTHORED_LAYOUT = registerGenPin('layout', 'authored', 'the authored-map fabric forces it on every hand-made zone');

/** The fabric's dials — one knob block, no magic literals in the body. */
export const AUTHORED_CFG = {
  /** Region painted over every arena cell the map does not author (and the
   *  legend's ' ' char). A map is always sealed in something. */
  padRegion: 'wall',
  /** The ground disc carved around every portal the engine seated (px). */
  portalClear: 70,
  /** Half-width of a stem corridor from a portal to the nearest authored
   *  ground / from the entry to a stranded exit (px). */
  stemHalfW: 45,
  /** Scatter radius of a multi-body spawn seat (px). */
  spawnSpread: 40,
  /** A legend-cell doodad's default radius as a fraction of the cell. */
  cellDoodadR: 0.45,
  /** The smallest authored map (cells per side) — the worldstate sanitizer
   *  culls zones under 200px, so 7 × 30 = 210 clears it. */
  minCells: 7,
  /** The largest authored map (cells per side) — the editor's ceiling. */
  maxCells: 160,
  /** Legend chars the editor allocates for regions with no authored char,
   *  in this order (the plan legend's own alphabet stays free). */
  charPool: '#~o=+*@%&^!?/\\|<>abcdefghijklmnqrstuvwxyzABCEFGHIJKLMOQRTUVXYZ0123456789',
} as const;

// --- the data -----------------------------------------------------------------

/** What one legend character means. A cell can paint a region AND drop a
 *  doodad — the CellSpec vocabulary (data/structures.ts), map-sized. */
export interface MapCellSpec {
  /** The walk-grid REGION painted at the cell (registerRegion ids). Absent =
   *  'ground'. */
  region?: string;
  /** A doodad dropped at the cell centre (radius default cellDoodadR × cell). */
  doodad?: { kind: string; radius?: number };
  /** Palette label (editor only). */
  label?: string;
}

/** An off-lattice doodad — the gen-time Doodad subset (positions are MAP
 *  pixels: 0..cols×cell, 0..rows×cell). */
export interface MapDoodad {
  kind: string;
  x: number;
  y: number;
  r: number;
  rot?: number;
  dir?: number;
  shallow?: boolean;
  tier?: number;
  /** Portal-clear splice spares it (the town's kept props). */
  keep?: boolean;
}

/** A spawn SEAT — a def at a point. Rides GeneratedLayout.landmarkSpawns (the
 *  pit-dweller lane: spawned raw at the seat, memory-captured like any
 *  resident) with the seat's own tempers. */
export interface MapSpawn {
  id: string;
  x: number;
  y: number;
  /** Bodies at this seat (default 1), scattered within `spread`. */
  count?: number;
  spread?: number;
  /** RARITY_DEFS key; absent/'normal' = the plain body. */
  rarity?: string;
  /** Wait-and-spring (engine/actor.ts AmbushSpec): the penned herd. */
  ambush?: AmbushSpec;
  /** A DUTY POST at the seat (brain.ts PostSpec; true = the default post):
   *  the body walks home when displaced — a sentry at its station. */
  post?: boolean | PostSpec;
  /** Posted facing (radians) — read with `post`. */
  facing?: number;
  /** The story (tier fabric) this seat stands on. */
  tier?: number;
  label?: string;
}

export type MapMarkerKind = 'entry' | 'boss' | 'poi' | 'camp' | 'garrison' | 'breakable' | 'npc';

/** A MARKER — one of the GenCtx's positional channels, authored. */
export interface MapMarker {
  kind: MapMarkerKind;
  x: number;
  y: number;
  /** breakable / npc: the monster id. */
  id?: string;
  /** garrison: the faction whose table posts here + the pack size band. */
  faction?: string;
  size?: [number, number];
  label?: string;
}

/** A plan structure raised at exact map coordinates (ZoneDef.fixtures' idiom). */
export interface MapFixture {
  structure: string;
  x: number;
  y: number;
}

/** A FRONTIER promise on a named side (ZoneExitDef side/at). The way home
 *  is the engine's — it faces the anchor — so a map tolerates a portal on
 *  any side (the generator carves the stem); these are the map's OWN doors
 *  onward. */
export interface MapExit {
  side: 'n' | 's' | 'e' | 'w';
  at: number;
  label?: string;
}

/** The bounty board's EXPEDITION block: posting this map as a charge whose
 *  ground is minted at the take (data/bountyExpeditions.ts). */
export interface ExpeditionSpec {
  /** Slate weight among expedition-bearing maps (default 1). */
  weight?: number;
  /** The player-level band the posting may deal in. */
  level: [number, number];
  title?: string;
  ask?: string;
}

export interface AuthoredMapDef {
  id: string;
  name: string;
  /** The TILESET whose theme dresses the ground (colors, materials, the
   *  meld voice) and whose packs/scatter the policies below may borrow. */
  tileset: string;
  cols: number;
  rows: number;
  /** Cell size in px — a multiple of MAP_CELL (default MAP_CELL). */
  cell?: number;
  /** `rows` strings of `cols` chars; a short row pads with ' '. */
  grid: string[];
  /** Per-map legend over DEFAULT_LEGEND ('.' ground, '#' wall, '~' water,
   *  ' ' the pad region). */
  legend?: Record<string, MapCellSpec>;
  /** The region beyond the authored rect + under ' ' (default AUTHORED_CFG.padRegion). */
  pad?: string;
  doodads?: MapDoodad[];
  spawns?: MapSpawn[];
  markers?: MapMarker[];
  fixtures?: MapFixture[];
  exits?: MapExit[];
  /** Default { kind: 'clear' }. */
  objective?: ObjectiveSpec;
  /** A PINNED monster level; absent = the mint's word (quest level, band,
   *  the player's level at a dev mint). */
  level?: number;
  sky?: SkyExposure;
  camera?: CameraModeId;
  /** Ambient PACK policy: 'none' (default — the authored spawns ARE the
   *  cohort), 'tileset' (the dress tileset's packs roam), or an explicit
   *  PackSpec (an authored roster). */
  packs?: 'none' | 'tileset' | PackSpec;
  /** DRESS policy: 'none' (default — the map is the whole terrain) or
   *  'tileset' (the dress tileset's stamp scatter + rolls run over the
   *  authored ground, routing around solids). */
  dress?: 'none' | 'tileset';
  /** Portal stem radius override (px). */
  portalClear?: number;
  /** Let the world web weave opportunistic roads onto this zone's rim
   *  (default false — a set-piece keeps the doors it authored). */
  weave?: boolean;
  spoils?: 'full' | 'none';
  /** Default true: no rolled faction war on authored ground. */
  noFactionWar?: boolean;
  /** Authored ambient fauna (replaces the biome's wildlife table; [] = none). */
  fauna?: WildlifeRow[];
  scenery?: { monster: string; count: [number, number] }[];
  puzzles?: { id: string; chance: number }[];
  /** The bounty board may post this map as an expedition. */
  bounty?: ExpeditionSpec;
  notes?: string;
  tags?: string[];
}

/** The chars every map understands without a legend of its own. */
export const DEFAULT_LEGEND: Readonly<Record<string, MapCellSpec>> = {
  '.': { region: 'ground', label: 'ground' },
  '#': { region: 'wall', label: 'wall' },
  '~': { region: 'water', label: 'water' },
};

// --- the registry -------------------------------------------------------------

export const AUTHORED_MAPS: Record<string, AuthoredMapDef> = {};

/** Register (or replace by id — HMR/atlas-safe) an authored map. */
export function registerAuthoredMap(def: AuthoredMapDef): void {
  AUTHORED_MAPS[def.id] = def;
}

export function unregisterAuthoredMap(id: string): void {
  delete AUTHORED_MAPS[id];
}

export function authoredMapOf(id: string): AuthoredMapDef | undefined {
  return AUTHORED_MAPS[id];
}

/** Every registered id, sorted (registration-order independent). */
export function authoredMapIds(): string[] {
  return Object.keys(AUTHORED_MAPS).sort();
}

export function authoredMapDefs(): AuthoredMapDef[] {
  return authoredMapIds().map(id => AUTHORED_MAPS[id]);
}

// --- pure reads -----------------------------------------------------------------

/** The map's pixel footprint — the arena size a mint pins. */
export function mapPixelSize(map: AuthoredMapDef): { w: number; h: number } {
  const cell = map.cell ?? MAP_CELL;
  return { w: map.cols * cell, h: map.rows * cell };
}

/** The resolved legend: the map's own chars over the defaults. */
export function mapLegend(map: AuthoredMapDef): Record<string, MapCellSpec> {
  return { ...DEFAULT_LEGEND, ...(map.legend ?? {}) };
}

/** What one grid char paints — ' ' and unknown chars read as the pad. */
export function mapCellRegion(map: AuthoredMapDef, ch: string): string {
  if (ch === ' ') return map.pad ?? AUTHORED_CFG.padRegion;
  const spec = map.legend?.[ch] ?? DEFAULT_LEGEND[ch];
  if (!spec) return map.pad ?? AUTHORED_CFG.padRegion;
  return spec.region ?? 'ground';
}

/** The char at a cell (' ' beyond a short row / outside). */
export function mapCharAt(map: AuthoredMapDef, cx: number, cy: number): string {
  if (cx < 0 || cy < 0 || cx >= map.cols || cy >= map.rows) return ' ';
  return map.grid[cy]?.[cx] ?? ' ';
}

/** Terrain-only extraction: receiving districts/biomes supply props and encounters. */
export function extractTerrainFragment(map: AuthoredMapDef, id: string,
  crop: { x: number; y: number; w: number; h: number }, ports: LocaleFragment['ports']): LocaleFragment {
  if (![crop.x, crop.y, crop.w, crop.h].every(Number.isSafeInteger) || crop.x < 0 || crop.y < 0
    || crop.w < 1 || crop.h < 1 || crop.x + crop.w > map.cols || crop.y + crop.h > map.rows) throw new Error('terrain fragment crop escapes authored map');
  return { id, source: { map: map.id, ...crop }, ports: structuredClone(ports),
    cells: Array.from({ length: crop.h }, (_, y) => Array.from({ length: crop.w }, (_, x) =>
      mapCellRegion(map, mapCharAt(map, crop.x + x, crop.y + y)))) };
}

/** Is the cell WALKABLE by its region's own word? */
export function mapCellWalkable(map: AuthoredMapDef, cx: number, cy: number): boolean {
  return regionKind(mapCellRegion(map, mapCharAt(map, cx, cy)))?.walkable === true;
}

/** Where a portal on `side` at fraction `at` lands on a rect arena of `size`
 *  — placeExit's edge math (worldgen PORTAL_EDGE_INSET), mirrored so the
 *  editor draws the seat the engine will use (drawn == seated). */
export function portalSeat(side: 'n' | 's' | 'e' | 'w', at: number, size: { w: number; h: number }): Vec2 {
  const inset = PORTAL_EDGE_INSET;
  const cl = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
  const { w, h } = size;
  return side === 'n' ? vec(cl(w * at, inset, w - inset), inset)
    : side === 's' ? vec(cl(w * at, inset, w - inset), h - inset)
    : side === 'w' ? vec(inset, cl(h * at, inset, h - inset))
    : vec(w - inset, cl(h * at, inset, h - inset));
}

/** Tiny deterministic string hash (FNV-1a, unsigned) — the fabric's own
 *  seed derivation for spawn scatter (never the layout rng). */
export function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/** Every walkable authored cell centre in MAP pixels (the stem anchors). */
export function mapWalkableCentres(map: AuthoredMapDef): Vec2[] {
  const cell = map.cell ?? MAP_CELL;
  const out: Vec2[] = [];
  for (let cy = 0; cy < map.rows; cy++) {
    for (let cx = 0; cx < map.cols; cx++) {
      if (mapCellWalkable(map, cx, cy)) out.push(vec((cx + 0.5) * cell, (cy + 0.5) * cell));
    }
  }
  return out;
}

// --- the lint -------------------------------------------------------------------

const MARKER_KINDS: readonly MapMarkerKind[] = ['entry', 'boss', 'poi', 'camp', 'garrison', 'breakable', 'npc'];

/** Every authoring mistake a map can carry, as one line each (the content
 *  validator prints them for shipped rows; the Atlas + the editor print
 *  them live). An empty list = the map will mint exactly as drawn. */
export function validateAuthoredMap(map: AuthoredMapDef): string[] {
  const out: string[] = [];
  const say = (s: string): void => { out.push(s); };
  if (!map.id || typeof map.id !== 'string') say('needs an id');
  if (!map.name) say('needs a name');
  if (!TILESETS[map.tileset]) say(`unknown tileset '${map.tileset}'`);
  const cell = map.cell ?? MAP_CELL;
  if (!Number.isFinite(cell) || cell < MAP_CELL || cell % MAP_CELL !== 0) say(`cell ${cell} must be a multiple of ${MAP_CELL}`);
  if (!Number.isInteger(map.cols) || !Number.isInteger(map.rows)) say('cols/rows must be integers');
  else {
    if (map.cols < AUTHORED_CFG.minCells || map.rows < AUTHORED_CFG.minCells) say(`at least ${AUTHORED_CFG.minCells} cells per side (${map.cols}×${map.rows})`);
    if (map.cols > AUTHORED_CFG.maxCells || map.rows > AUTHORED_CFG.maxCells) say(`at most ${AUTHORED_CFG.maxCells} cells per side (${map.cols}×${map.rows})`);
  }
  if (!Array.isArray(map.grid)) say('grid must be an array of row strings');
  else {
    if (map.grid.length !== map.rows) say(`grid has ${map.grid.length} rows, rows says ${map.rows}`);
    const legend = mapLegend(map);
    const unknown = new Set<string>();
    for (const row of map.grid) {
      if (typeof row !== 'string') { say('grid rows must be strings'); break; }
      if (row.length > map.cols) say(`a grid row is ${row.length} chars wide, cols says ${map.cols}`);
      for (const ch of row) if (ch !== ' ' && !legend[ch]) unknown.add(ch);
    }
    if (unknown.size) say(`grid chars with no legend (read as the pad): ${[...unknown].map(c => `'${c}'`).join(' ')}`);
    for (const [ch, spec] of Object.entries(map.legend ?? {})) {
      if (ch.length !== 1) say(`legend key '${ch}' must be one char`);
      if (spec.region && !regionKind(spec.region)) say(`legend '${ch}' names unregistered region '${spec.region}'`);
      if (spec.doodad && !hasDoodadRule(spec.doodad.kind) && !DOODAD_VISUALS[spec.doodad.kind]) say(`legend '${ch}' names unknown doodad kind '${spec.doodad.kind}'`);
    }
    let walkable = 0;
    for (let cy = 0; cy < map.rows; cy++) for (let cx = 0; cx < map.cols; cx++) if (mapCellWalkable(map, cx, cy)) walkable++;
    if (walkable === 0) say('no walkable cell — nowhere to stand');
  }
  if (map.pad && !regionKind(map.pad)) say(`pad names unregistered region '${map.pad}'`);
  const size = mapPixelSize(map);
  const inside = (x: number, y: number): boolean => Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0 && x <= size.w && y <= size.h;
  (map.doodads ?? []).forEach((d, i) => {
    if (!hasDoodadRule(d.kind) && !DOODAD_VISUALS[d.kind]) say(`doodad #${i} '${d.kind}' is not a registered kind`);
    if (!inside(d.x, d.y)) say(`doodad #${i} '${d.kind}' lies outside the map`);
    if (!Number.isFinite(d.r) || d.r <= 0) say(`doodad #${i} '${d.kind}' needs a positive radius`);
  });
  (map.spawns ?? []).forEach((s, i) => {
    if (!MONSTERS[s.id]) say(`spawn #${i} names unknown monster '${s.id}'`);
    if (!inside(s.x, s.y)) say(`spawn #${i} '${s.id}' lies outside the map`);
    if (s.rarity && s.rarity !== 'normal' && !RARITY_DEFS[s.rarity as keyof typeof RARITY_DEFS]) say(`spawn #${i} '${s.id}' names unknown rarity '${s.rarity}'`);
    if (s.count !== undefined && (!Number.isFinite(s.count) || s.count < 1)) say(`spawn #${i} '${s.id}' count must be ≥ 1`);
  });
  let entries = 0;
  (map.markers ?? []).forEach((m, i) => {
    if (!MARKER_KINDS.includes(m.kind)) say(`marker #${i} has unknown kind '${String(m.kind)}'`);
    if (!inside(m.x, m.y)) say(`marker #${i} (${m.kind}) lies outside the map`);
    if (m.kind === 'entry') entries++;
    if ((m.kind === 'breakable' || m.kind === 'npc') && (!m.id || !MONSTERS[m.id])) say(`marker #${i} (${m.kind}) needs a monster id (got '${m.id ?? ''}')`);
    if (m.kind === 'garrison' && (!m.faction || !FACTIONS[m.faction])) say(`marker #${i} (garrison) needs a faction (got '${m.faction ?? ''}')`);
  });
  if (entries > 1) say(`${entries} entry markers — only the last one seats the party`);
  (map.fixtures ?? []).forEach((f, i) => {
    if (!STRUCTURES[f.structure]) say(`fixture #${i} names unknown structure '${f.structure}'`);
    if (!inside(f.x, f.y)) say(`fixture #${i} '${f.structure}' lies outside the map`);
  });
  const seats: Vec2[] = [];
  (map.exits ?? []).forEach((e, i) => {
    if (!['n', 's', 'e', 'w'].includes(e.side)) say(`exit #${i} has unknown side '${String(e.side)}'`);
    if (!Number.isFinite(e.at) || e.at < 0 || e.at > 1) say(`exit #${i} at=${e.at} must be 0..1`);
    else seats.push(portalSeat(e.side, e.at, size));
  });
  for (let a = 0; a < seats.length; a++) for (let b = a + 1; b < seats.length; b++) {
    if (Math.hypot(seats[a].x - seats[b].x, seats[a].y - seats[b].y) < MIN_PORTAL_SEP) say(`exits #${a} and #${b} seat closer than ${MIN_PORTAL_SEP}px`);
  }
  const o = map.objective;
  if (o) {
    if (o.kind === 'boss' && !MONSTERS[o.id]) say(`objective boss '${o.id}' is not a monster`);
    if (o.kind === 'spawners' && !MONSTERS[o.spawnerId]) say(`objective spawner '${o.spawnerId}' is not a monster`);
    if (o.kind === 'waves' && o.bossId && !MONSTERS[o.bossId]) say(`objective wave boss '${o.bossId}' is not a monster`);
  }
  if (typeof map.packs === 'object') {
    for (const e of map.packs.table) if (!MONSTERS[e.id]) say(`packs table names unknown monster '${e.id}'`);
  }
  for (const s of map.scenery ?? []) if (!MONSTERS[s.monster]) say(`scenery names unknown monster '${s.monster}'`);
  for (const f of map.fauna ?? []) if (!MONSTERS[f.id]) say(`fauna names unknown monster '${f.id}'`);
  if (map.bounty) {
    const [lo, hi] = map.bounty.level ?? [NaN, NaN];
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo > hi || lo < 1) say(`bounty level band [${lo}, ${hi}] must be 1 ≤ lo ≤ hi`);
    if (map.bounty.weight !== undefined && !(map.bounty.weight > 0)) say('bounty weight must be positive');
  }
  if (map.level !== undefined && (!Number.isFinite(map.level) || map.level < 1)) say(`level ${map.level} must be ≥ 1`);
  return out;
}

// --- the generator --------------------------------------------------------------

const warnedMissing = new Set<string>();

/** THE AUTHORED LAYOUT — rasterize the map, seat its payloads, carve stems to
 *  the engine's portals. Draws no rng. */
export function authoredLayout(ctx: GenCtx, def: ZoneDef): void {
  const id = layoutParam<string>(def, 'authored', '');
  const map = AUTHORED_MAPS[id];
  if (!map) {
    // A bare 'authored' def with NO map named (genqa's representative-def
    // sweep, a hand-typed layoutType) is just the scatter — silent; a
    // NAMED map nobody registered is an authoring slip — one warning.
    if (id && !warnedMissing.has(id)) {
      warnedMissing.add(id);
      console.warn(`[authored] zone '${def.id}' names no registered authored map ('${id}') — falling back to the tileset scatter`);
    }
    scatterDecoration(ctx, def);
    return;
  }
  const cell = map.cell ?? MAP_CELL;
  const size = mapPixelSize(map);
  const grid = ensureGrid(ctx);
  // THE SEAT: centre the authored rect in the arena, snapped onto the lattice
  // (a pinned mint makes this 0,0; a borrowed arena still reads true).
  const ox = Math.max(0, Math.round((ctx.arena.w - size.w) / 2 / MAP_CELL) * MAP_CELL);
  const oy = Math.max(0, Math.round((ctx.arena.h - size.h) / 2 / MAP_CELL) * MAP_CELL);
  const pad = map.pad ?? AUTHORED_CFG.padRegion;
  grid.fillRegion(0, 0, ctx.arena.w - 1, ctx.arena.h - 1, pad);
  // Cells — one fillRegion per same-region RUN (the fieldLayout idiom), the
  // last pixel of the run inclusive so a 60px cell covers both lattice cells.
  const legend = mapLegend(map);
  for (let cy = 0; cy < map.rows; cy++) {
    const y0 = oy + cy * cell, y1 = oy + (cy + 1) * cell - 1;
    let runStart = -1;
    let runRegion = '';
    const flush = (endExclusive: number): void => {
      if (runStart < 0) return;
      grid.fillRegion(ox + runStart * cell, y0, ox + endExclusive * cell - 1, y1, runRegion);
      runStart = -1;
    };
    for (let cx = 0; cx <= map.cols; cx++) {
      if (cx === map.cols) { flush(cx); break; }
      const ch = mapCharAt(map, cx, cy);
      const region = mapCellRegion(map, ch);
      if (runStart < 0) { runStart = cx; runRegion = region; }
      else if (region !== runRegion) { flush(cx); runStart = cx; runRegion = region; }
      const spec = ch === ' ' ? undefined : legend[ch];
      if (spec?.doodad) {
        ctx.doodads.push({
          pos: vec(ox + (cx + 0.5) * cell, oy + (cy + 0.5) * cell),
          radius: spec.doodad.radius ?? cell * AUTHORED_CFG.cellDoodadR,
          kind: spec.doodad.kind,
        });
      }
    }
  }
  // Off-lattice doodads — the gen-time subset verbatim.
  for (const d of map.doodads ?? []) {
    ctx.doodads.push({
      pos: vec(ox + d.x, oy + d.y), radius: d.r, kind: d.kind,
      ...(d.rot !== undefined ? { rot: d.rot } : {}),
      ...(d.dir !== undefined ? { dir: d.dir } : {}),
      ...(d.shallow ? { shallow: true } : {}),
      ...(d.tier ? { tier: d.tier } : {}),
      ...(d.keep ? { keep: true } : {}),
    });
  }
  // Fixtures — plan structures carve into THIS grid (raised here, after the
  // paint, so no later grid swap can wipe their walls into ghost geometry).
  for (const f of map.fixtures ?? []) raiseStructure(ctx, f.structure, vec(ox + f.x, oy + f.y));
  // Markers — the GenCtx's positional channels, authored.
  for (const m of map.markers ?? []) {
    const p = vec(ox + m.x, oy + m.y);
    switch (m.kind) {
      case 'entry': ctx.spawnAt = p; break;
      case 'boss': ctx.bossSeat = p; break;
      case 'poi': ctx.pois.push(p); break;
      case 'camp': ctx.camps.push(p); break;
      case 'garrison': if (m.faction) ctx.garrisons.push({ pos: p, faction: m.faction, size: m.size ?? [2, 3] }); break;
      case 'breakable': if (m.id) ctx.breakables.push({ id: m.id, pos: p }); break;
      case 'npc': if (m.id) ctx.npcs.push({ id: m.id, pos: p }); break;
    }
  }
  // Spawn seats — landmarkSpawns rows (loadZone spawns them raw at the seat,
  // tempers honored). Multi-body seats scatter on a HASH of the seat, never
  // the layout rng.
  if (!ctx.lite) {
    for (const s of map.spawns ?? []) {
      const n = Math.max(1, Math.round(s.count ?? 1));
      const spread = s.spread ?? AUTHORED_CFG.spawnSpread;
      const salt = hashStr(`${s.id}:${s.x},${s.y}`);
      for (let i = 0; i < n; i++) {
        let p = vec(ox + s.x, oy + s.y);
        if (n > 1) {
          const ang = hash01(i, 1, salt) * Math.PI * 2;
          const dist = spread * (0.35 + 0.65 * hash01(i, 2, salt));
          p = vec(p.x + Math.cos(ang) * dist, p.y + Math.sin(ang) * dist);
        }
        (ctx.landmarkSpawns ??= []).push({
          id: s.id, pos: p,
          ...(s.tier ? { tier: s.tier } : {}),
          ...(s.ambush ? { ambush: s.ambush } : {}),
          ...(s.rarity && s.rarity !== 'normal' ? { rarity: s.rarity } : {}),
          ...(s.post ? { post: s.post } : {}),
          ...(s.facing !== undefined ? { facing: s.facing } : {}),
        });
      }
    }
  }
  // THE ENTRY LAW: a no-back-portal arrival hands the generator the arena's
  // geometric CENTRE as its entry while the party actually lands on the
  // map's entry marker (GeneratedLayout.spawnAt). Carving the centre would
  // gouge whatever the author put there (the cistern), so when the entry
  // IS the centre and a marker stands, the marker becomes the entry every
  // later pass keys on (stems, the portal-clear splice, reachability) —
  // the party's true landing. A portal-side entry (arrival through a back
  // portal) is already the landing and stays untouched.
  const centre = Math.abs(ctx.entry.x - ctx.arena.w / 2) < 0.5 && Math.abs(ctx.entry.y - ctx.arena.h / 2) < 0.5;
  if (centre && ctx.spawnAt) ctx.entry = vec(ctx.spawnAt.x, ctx.spawnAt.y);
  // PORTAL STEMS: every portal the engine seated stands on ground and reaches
  // the authored floor — a clearing, a corridor to the nearest authored
  // walkable cell, and the belt: any exit still cut off gets a straight
  // carve from the entry (fieldLayout's connectivity guarantee).
  const clear = map.portalClear ?? AUTHORED_CFG.portalClear;
  const anchors = mapWalkableCentres(map).map(c => vec(c.x + ox, c.y + oy));
  const nearestAnchor = (p: Vec2): Vec2 | null => {
    let best: Vec2 | null = null, bd = Infinity;
    for (const a of anchors) { const d = Math.hypot(p.x - a.x, p.y - a.y); if (d < bd) { bd = d; best = a; } }
    return best;
  };
  for (const pt of [ctx.entry, ...ctx.exits]) {
    grid.fillDisc(pt.x, pt.y, clear, 'ground');
    const a = nearestAnchor(pt);
    if (a && !grid.reachable(pt, a)) grid.carveCorridor(pt.x, pt.y, a.x, a.y, AUTHORED_CFG.stemHalfW);
  }
  for (const pt of ctx.exits) {
    if (!grid.reachable(ctx.entry, pt)) grid.carveCorridor(ctx.entry.x, ctx.entry.y, pt.x, pt.y, AUTHORED_CFG.stemHalfW);
  }
  // A POI is the engine's seat for spawners/caches/geysers — never leave it
  // with none (the map centre, snapped onto authored ground).
  if (!ctx.pois.length) ctx.pois.push(grid.snapToWalkable(vec(ox + size.w / 2, oy + size.h / 2)));
  // Dress — the tileset's own scatter over the authored ground, if asked.
  if (!ctx.lite && map.dress === 'tileset') scatterDecoration(ctx, def);
}

registerLayout(AUTHORED_LAYOUT, authoredLayout);

// --- the mint side ----------------------------------------------------------------

/** Strip undefined-valued keys — the quest lane's overlay law: a spec word the
 *  caller did not say defers to the map's own (spread order alone cannot,
 *  because an explicit `undefined` would still overwrite). */
export function definedSpec<T extends object>(o: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(o) as (keyof T)[]) if (o[k] !== undefined) out[k] = o[k];
  return out;
}

const EMPTY_PACKS: PackSpec = { count: [0, 0], size: [0, 0], table: [] };

/** The ZoneSpec a directed mint spreads FIRST — the map's own words (dress,
 *  name, exact size, recipe, objective, policies); the caller's `over`
 *  spreads after it and wins (a quest's level, a bounty's seed…). */
export function authoredZoneSpec(map: AuthoredMapDef, over: Partial<ZoneSpec> = {}): ZoneSpec {
  const size = mapPixelSize(map);
  const packs = map.packs ?? 'none';
  return {
    tileset: map.tileset,
    name: map.name,
    layoutType: AUTHORED_LAYOUT,
    layoutParams: { authored: map.id },
    sizeBand: { w: [size.w, size.w], h: [size.h, size.h] },
    shape: 'rect',
    objective: map.objective ?? { kind: 'clear' },
    ...(typeof packs === 'object' ? { packsOverride: packs } : packs === 'none' ? { packsOverride: EMPTY_PACKS } : {}),
    noFactionWar: map.noFactionWar ?? true,
    forceFrontiers: map.exits?.length ?? 0,
    noWeave: !map.weave,
    blend: null,
    ...(map.level !== undefined ? { level: map.level } : {}),
    ...(map.sky ? { sky: map.sky } : {}),
    ...(map.camera ? { camera: map.camera } : {}),
    ...over,
  };
}

/** THE SEAL — what a ZoneSpec cannot say, written onto the minted def (the
 *  lairs' mint-then-mutate idiom): the pack policy's density + cohort, the
 *  dress policy's strip of every tileset roll, fauna/scenery/puzzles/spoils,
 *  and the frontier rows re-seated on the map's own sides. Idempotent. */
export function sealAuthoredZone(def: ZoneDef, map: AuthoredMapDef): ZoneDef {
  const packs = map.packs ?? 'none';
  if (packs === 'none') {
    def.packDensity = 0;
    def.cohort = 'authored';
    def.packs = EMPTY_PACKS;
  } else if (typeof packs === 'object') {
    def.cohort = 'authored';
    def.packs = packs;
  }
  if (map.dress !== 'tileset') {
    def.layout = [];
    delete def.structures;
    delete def.landmarks;
    delete def.compositions;
    delete def.hollows;
    delete def.annexes;
    delete def.blend;
  }
  if (map.fauna) def.fauna = map.fauna;
  else if (packs === 'none') def.fauna = [];
  if (map.scenery) def.scenery = map.scenery; else delete def.scenery;
  if (map.puzzles) def.puzzles = map.puzzles; else delete def.puzzles;
  if (map.spoils) def.spoils = map.spoils;
  if (map.exits?.length) {
    const frontiers = def.exits.filter(e => e.to === '?');
    map.exits.forEach((x, i) => {
      const e = frontiers[i];
      if (e) { e.side = x.side; e.at = x.at; }
    });
  }
  return def;
}

const FALLBACK_THEME: ZoneTheme = {
  floor: '#2a2a2e', grid: '#333', border: '#666', obstacle: '#444', obstacleEdge: '#777', accent: '#aaa',
};

/** A PURE synthetic def for the map — what placeZoneAt would build, minus
 *  the graph (no anchor, no roads): the editor's live preview, genqa and the
 *  probes generate from this. Frontier rows = the map's exits. */
export function authoredZoneDef(map: AuthoredMapDef, opts: {
  id?: string; level?: number; seed?: number; map?: { x: number; y: number };
} = {}): ZoneDef {
  const ts = TILESETS[map.tileset];
  const size = mapPixelSize(map);
  const exits: ZoneExitDef[] = (map.exits ?? []).map(x => ({ to: '?', side: x.side, at: x.at, tileset: map.tileset }));
  const def: ZoneDef = {
    id: opts.id ?? `authored_${map.id}`,
    name: map.name,
    level: opts.level ?? map.level ?? 8,
    size,
    shape: 'rect',
    theme: ts?.theme ?? FALLBACK_THEME,
    tileset: map.tileset,
    layout: map.dress === 'tileset' && ts ? [...(ts.common ?? []), ...ts.layout] : [],
    layoutType: AUTHORED_LAYOUT,
    layoutParams: { authored: map.id },
    objective: map.objective ?? { kind: 'clear' },
    packs: ts?.packs ?? EMPTY_PACKS,
    exits,
    map: opts.map ?? { x: 0, y: 0 },
    seed: opts.seed ?? 1,
    ...(map.sky ? { sky: map.sky } : {}),
    ...(map.camera ? { camera: map.camera } : {}),
  };
  return sealAuthoredZone(def, map);
}

/** The maps the bounty board may post as EXPEDITIONS at a player level. */
export function expeditionMaps(playerLevel: number): AuthoredMapDef[] {
  return authoredMapDefs().filter(m => m.bounty
    && playerLevel >= m.bounty.level[0] && playerLevel <= m.bounty.level[1]);
}

/** The editor's palette: every registered region kind, walkable first. */
export function regionPalette(): { id: string; walkable: boolean; blocks: boolean }[] {
  return regionIds().map(id => {
    const r = regionKind(id)!;
    return { id, walkable: r.walkable, blocks: r.blocks };
  }).sort((a, b) => (a.walkable === b.walkable ? a.id.localeCompare(b.id) : a.walkable ? -1 : 1));
}

/** A structure's worst-case footprint in px (the placement preview). */
export function fixtureFootprint(structure: string): { w: number; h: number } | null {
  return structureMaxFootprint(structure);
}
