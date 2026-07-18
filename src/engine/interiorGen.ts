// ---------------------------------------------------------------------------
// INTERIOR ZONES — zones that are ALL inside: the dungeon (rooms + corridors
// + doors), the labyrinth (a braided maze), the edifice (a building's floor
// plan filling the whole arena). One graph pipeline drives the room family:
//
//   place rooms (scatter or BSP)  →  connect (kNN candidates, an MST spine,
//   loop extras by `loopiness`)   →  carve  →  hang DOORS on the room mouths
//   →  assign room ROLES by graph depth (open registry: the deepest room is
//   a sanctum, dead ends are reliquaries)  →  furnish them with ordinary
//   layout stamps confined to the room (ctx.sampleRect).
//
// Everything is layoutParams DATA (wall/floor region kinds, room counts, door
// chances, loopiness, corridor width), so a crypt catacomb, a cavern warren,
// and a manor interior are parameter sets on two generators — never three
// engines. Doors are REAL DoodadDoor doodads (dwell/breakable, Zone Memory,
// co-op) riding a synthesized PlacedStructure record; their grid cells stay
// GROUND while the doodad does the blocking, so ambient spawns still populate
// the rooms behind them (the D2 promise: open the door, the pack is waiting)
// and every reachability contract holds without special cases.
// ---------------------------------------------------------------------------

import { vec, type Vec2 } from '../core/math';
import type { StampSpec, ZoneDef } from '../data/zones';
import { GridWalkField } from '../world/gridWalk';
import {
  doorSurfaceOf, layoutParam, layTraveledWay, registerLayout, scatterDecoration, stampEntries,
  type DoodadDoor, type GenCtx, type PlacedDoor, type PlacedStructure,
} from './levelgen';
import { ringPath } from './tracks';

const CELL = 30;
/** Interior margin (cells) between the arena border and any carved space. */
const EDGE_CELLS = 2;

// --- ROOM ROLES ---------------------------------------------------------------
// What a room IS once the graph knows where it sits: the registry maps graph
// positions (deepest / dead-end / anywhere) to furnishing + POIs, so "treasure
// waits at the bottom" is data a package can extend or replace.

export interface InteriorRoleDef {
  id: string;
  /** How rooms are picked: 'deepest' = max BFS depth from the entry room,
   *  'deadend' = degree-1 rooms (deep first), 'any' = uniform rng picks. */
  pick: 'deepest' | 'deadend' | 'any';
  /** Rooms per zone wearing this role (default 1). */
  max?: number;
  /** Pin a POI at the room center — spawner objects and gem caches nest at
   *  POIs, so the deepest room pays out with zero bespoke loot code. */
  poi?: boolean;
  /** Ordinary layout stamps scattered INSIDE the room (scoped sampling). */
  furnish?: StampSpec[];
}

const INTERIOR_ROLES: Record<string, InteriorRoleDef> = {};

export function registerInteriorRole(def: InteriorRoleDef): void {
  if (INTERIOR_ROLES[def.id]) console.warn(`[interiors] re-registering role '${def.id}' — overriding`);
  INTERIOR_ROLES[def.id] = def;
}

export function hasInteriorRole(id: string): boolean { return id in INTERIOR_ROLES; }

/** All registered roles (boot validation walks their furnish entries). */
export function interiorRoleDefs(): InteriorRoleDef[] { return Object.values(INTERIOR_ROLES); }

registerInteriorRole({
  id: 'sanctum',
  pick: 'deepest',
  poi: true,
  furnish: [
    { kind: 'brazier', count: [2, 3] },
    { kind: 'burial_urn', count: [2, 4] },
    { kind: 'bone_pile', count: [1, 2] },
  ],
});

registerInteriorRole({
  id: 'reliquary',
  pick: 'deadend',
  max: 2,
  furnish: [
    { kind: 'burial_urn', count: [2, 3] },
    { kind: 'web', count: [1, 2] },
    { kind: 'clay_pots', count: [1, 2] },
  ],
});

// --- THE ROOM-GRAPH GENERATOR ---------------------------------------------------

interface IntRoom {
  x: number; y: number; w: number; h: number; // world px, cell-aligned
  cx: number; cy: number;                     // center (world px)
  portal?: boolean;
}

interface IntDoorRoll { open: boolean; breakable: boolean }

function rectsOverlap(a: IntRoom, b: IntRoom, gap: number): boolean {
  return a.x < b.x + b.w + gap && b.x < a.x + a.w + gap
    && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;
}

function cellRoom(c0: number, r0: number, wC: number, hC: number, portal?: boolean): IntRoom {
  const x = c0 * CELL, y = r0 * CELL, w = wC * CELL, h = hC * CELL;
  return { x, y, w, h, cx: x + w / 2, cy: y + h / 2, ...(portal ? { portal: true } : {}) };
}

/** The dungeon/edifice body. `preset` sits between the def's layoutParams and
 *  the defaults, so 'edifice' is 'dungeon' with different data — one engine. */
function interiorLayout(ctx: GenCtx, def: ZoneDef, preset?: Record<string, unknown>): void {
  const P = <T,>(key: string, dflt: T): T => {
    const v = def.layoutParams?.[key];
    if (v !== undefined) return v as T;
    const p = preset?.[key];
    return p === undefined ? dflt : (p as T);
  };
  const { rng, arena } = ctx;
  const grid = new GridWalkField(arena.w, arena.h, CELL);
  const wallKind = P('interiorWall', 'wall');
  const floorKind = P('interiorFloor', 'ground');
  // A fresh grid is all byte-0 'wall'; only a THEMED wall needs painting.
  if (wallKind !== 'wall') grid.fillRegion(0, 0, arena.w - 0.01, arena.h - 0.01, wallKind);
  const colsTotal = Math.floor(arena.w / CELL), rowsTotal = Math.floor(arena.h / CELL);
  const halfW = Math.max(12, (P('corridorCells', 1.8) as number) * CELL * 0.5 - 0.1);

  // 1) PORTAL CHAMBERS — the entry and every exit gets a small room clamped
  // inside the margin, so portals always open onto connected floor (the rooms
  // join the graph like any other; the spur carve guarantees the exact portal
  // point itself).
  const rooms: IntRoom[] = [];
  for (const pt of [ctx.entry, ...ctx.exits]) {
    const wC = 5, hC = 4;
    const c0 = Math.max(EDGE_CELLS, Math.min(colsTotal - EDGE_CELLS - wC, Math.round(pt.x / CELL) - Math.floor(wC / 2)));
    const r0 = Math.max(EDGE_CELLS, Math.min(rowsTotal - EDGE_CELLS - hC, Math.round(pt.y / CELL) - Math.floor(hC / 2)));
    rooms.push(cellRoom(c0, r0, wC, hC, true));
  }

  // 2) BODY ROOMS — scatter (rejection-placed rect rooms; the organic dungeon)
  // or BSP (recursive splits; the architected floor plan). Draws are seeded and
  // ordered; early-outs never reorder later draws within a seed.
  const minC = P('roomCellsMin', 4), maxC = P('roomCellsMax', 8);
  if (P<string>('arrangement', 'scatter') === 'bsp') {
    const maxLeaf = P('bspLeaf', 10);
    const leaves: { c0: number; r0: number; c1: number; r1: number }[] = [];
    const split = (c0: number, r0: number, c1: number, r1: number, depth: number): void => {
      const wC = c1 - c0 + 1, hC = r1 - r0 + 1;
      if ((wC <= maxLeaf && hC <= maxLeaf) || depth > 7) { leaves.push({ c0, r0, c1, r1 }); return; }
      const splitW = wC === hC ? rng.chance(0.5) : wC > hC;
      const lo = (splitW ? c0 : r0) + minC + 1;
      const hi = (splitW ? c1 : r1) - minC - 1;
      if (lo > hi) { leaves.push({ c0, r0, c1, r1 }); return; }
      const cut = rng.int(lo, hi);
      if (splitW) { split(c0, r0, cut - 1, r1, depth + 1); split(cut + 1, r0, c1, r1, depth + 1); }
      else { split(c0, r0, c1, cut - 1, depth + 1); split(c0, cut + 1, c1, r1, depth + 1); }
    };
    split(EDGE_CELLS, EDGE_CELLS, colsTotal - 1 - EDGE_CELLS, rowsTotal - 1 - EDGE_CELLS, 0);
    for (const lf of leaves) {
      // Shrink each leaf 0-1 cells per side (rolled) so the plan reads built,
      // not milled; skip leaves that would collapse or swallow a portal room.
      const s0 = rng.int(0, 1), s1 = rng.int(0, 1), s2 = rng.int(0, 1), s3 = rng.int(0, 1);
      const c0 = lf.c0 + s0, r0 = lf.r0 + s1, c1 = lf.c1 - s2, r1 = lf.r1 - s3;
      if (c1 - c0 + 1 < minC || r1 - r0 + 1 < minC) continue;
      const room = cellRoom(c0, r0, c1 - c0 + 1, r1 - r0 + 1);
      if (rooms.some(o => o.portal && rectsOverlap(o, room, 0))) continue;
      rooms.push(room);
    }
  } else {
    const roomBand = P('rooms', [8, 13] as [number, number]);
    const target = rng.int(roomBand[0], roomBand[1]);
    const attempts = target * 9;
    let placed = 0;
    for (let i = 0; i < attempts && placed < target; i++) {
      const wC = rng.int(minC, maxC), hC = rng.int(minC, maxC);
      const c0 = rng.int(EDGE_CELLS, Math.max(EDGE_CELLS, colsTotal - EDGE_CELLS - wC));
      const r0 = rng.int(EDGE_CELLS, Math.max(EDGE_CELLS, rowsTotal - EDGE_CELLS - hC));
      const room = cellRoom(c0, r0, wC, hC);
      if (rooms.some(o => rectsOverlap(o, room, CELL))) continue; // 1-cell wall minimum
      rooms.push(room);
      placed++;
    }
  }

  // 3) CONNECT — kNN candidates give local edges, an MST over the complete
  // distance graph guarantees ONE component, and `loopiness` keeps a fraction
  // of the non-tree candidates as loops (shortcuts, flanking routes).
  const n = rooms.length;
  const d2 = (a: number, b: number): number => {
    const dx = rooms[a].cx - rooms[b].cx, dy = rooms[a].cy - rooms[b].cy;
    return dx * dx + dy * dy;
  };
  const candKeys = new Set<string>();
  const cands: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const near = rooms.map((_, j) => j).filter(j => j !== i).sort((a, b) => d2(i, a) - d2(i, b)).slice(0, 3);
    for (const j of near) {
      const key = `${Math.min(i, j)}:${Math.max(i, j)}`;
      if (!candKeys.has(key)) { candKeys.add(key); cands.push([Math.min(i, j), Math.max(i, j)]); }
    }
  }
  const inTree = new Array<boolean>(n).fill(false);
  inTree[0] = true;
  const edges: [number, number][] = [];
  const edgeKeys = new Set<string>();
  for (let added = 1; added < n; added++) {
    let bi = -1, bj = -1, bd = Infinity;
    for (let i = 0; i < n; i++) {
      if (!inTree[i]) continue;
      for (let j = 0; j < n; j++) {
        if (inTree[j]) continue;
        const dd = d2(i, j);
        if (dd < bd) { bd = dd; bi = i; bj = j; }
      }
    }
    if (bj < 0) break;
    inTree[bj] = true;
    edges.push([Math.min(bi, bj), Math.max(bi, bj)]);
    edgeKeys.add(`${Math.min(bi, bj)}:${Math.max(bi, bj)}`);
  }
  const loopiness = P('loopiness', 0.16);
  for (const [i, j] of cands) {
    const keep = rng.chance(loopiness); // roll BEFORE the membership filter
    if (!keep || edgeKeys.has(`${i}:${j}`)) continue;
    edgeKeys.add(`${i}:${j}`);
    edges.push([i, j]);
  }

  // 4) CARVE — rooms as region fills, corridors as L-runs between centers,
  // then the portal spurs (AFTER the corridors, so nothing re-walls a mouth).
  for (const r of rooms) grid.fillRegion(r.x, r.y, r.x + r.w - 0.01, r.y + r.h - 0.01, floorKind);
  for (const [i, j] of edges) {
    const a = rooms[i], b = rooms[j];
    grid.carveCorridor(a.cx, a.cy, b.cx, a.cy, halfW);
    grid.carveCorridor(b.cx, a.cy, b.cx, b.cy, halfW);
  }
  for (let p = 0; p < 1 + ctx.exits.length; p++) {
    const pt = [ctx.entry, ...ctx.exits][p];
    grid.carveCorridor(pt.x, pt.y, rooms[p].cx, rooms[p].cy, Math.max(halfW, 20));
  }

  // 5) DOORS — each corridor end may hang a door at its room's mouth. The
  // door is a REAL DoodadDoor doodad (dwell/breakable; blocks move + shots +
  // sight while closed) whose grid cells stay GROUND: ambient spawns and the
  // reachability invariant see the open topology (rooms behind doors still
  // populate — the pack waits for you), while the doodad does the blocking.
  const doorChance = P('doorChance', 0.55);
  const breakChance = P('doorBreakChance', 0.45);
  const placedDoors: PlacedDoor[] = [];
  const doorCellKeys = new Set<string>();
  const sid = 'interior#0';
  const doorAt = (cells: { x: number; y: number; w: number; h: number }, normal: Vec2, roll: IntDoorRoll): void => {
    if (!roll.open) return;
    if (cells.x < 0 || cells.y < 0 || cells.x + cells.w > arena.w || cells.y + cells.h > arena.h) return;
    const key = `${cells.x}:${cells.y}:${cells.w}:${cells.h}`;
    if (doorCellKeys.has(key)) return;
    doorCellKeys.add(key);
    const pos = vec(cells.x + cells.w / 2, cells.y + cells.h / 2);
    const door: DoodadDoor = {
      id: `${sid}/d${placedDoors.length}`,
      mode: roll.breakable ? 'both' : 'dwell',
      cells,
    };
    ctx.doodads.push({
      pos, radius: Math.max(cells.w, cells.h) / 2,
      kind: 'door', dir: Math.atan2(normal.y, normal.x), door,
      // The slab IS the hitbox (hit-surface fabric): flush with the wall
      // line, thin as the drawn bar — the old breach-spanning circle is what
      // made Durance corridors feel like running into invisible walls.
      hitbox: doorSurfaceOf(cells, normal),
    });
    placedDoors.push({ door, pos, normal });
  };
  const breadth = (center: number): [number, number] => {
    const lo = Math.floor((center - halfW) / CELL), hi = Math.floor((center + halfW) / CELL);
    return [lo * CELL, (hi - lo + 1) * CELL];
  };
  for (const [i, j] of edges) {
    const a = rooms[i], b = rooms[j];
    // Rolls first (both ends), geometry filters after — the draw discipline.
    const rollA: IntDoorRoll = { open: rng.chance(doorChance), breakable: rng.chance(breakChance) };
    const rollB: IntDoorRoll = { open: rng.chance(doorChance), breakable: rng.chance(breakChance) };
    const dx = Math.sign(b.cx - a.cx), dy = Math.sign(b.cy - a.cy);
    // The L runs horizontal at y=a.cy to x=b.cx, then vertical at x=b.cx.
    // A's MOUTH sits on whichever of its edges the L actually crosses: the
    // horizontal leg only leaves A when b.cx clears A's x-span (rooms that
    // overlap in x exit through A's top/bottom on the vertical leg instead —
    // a door on the never-crossed edge would open into blank wall).
    const seg1LeavesA = b.cx < a.x || b.cx > a.x + a.w;
    if (seg1LeavesA && dx !== 0) {
      const col = dx > 0 ? Math.floor((a.x + a.w) / CELL) : Math.floor(a.x / CELL) - 1;
      const [y, h] = breadth(a.cy);
      doorAt({ x: col * CELL, y, w: CELL, h }, vec(dx, 0), rollA);
    } else if (dy !== 0) {
      const row = dy > 0 ? Math.floor((a.y + a.h) / CELL) : Math.floor(a.y / CELL) - 1;
      const [x, w] = breadth(b.cx);
      doorAt({ x, y: row * CELL, w, h: CELL }, vec(0, dy), rollA);
    }
    // B's MOUTH mirrors it: the vertical leg only enters B when a.cy clears
    // B's y-span; otherwise the arrival is horizontal at y=a.cy.
    const seg2EntersB = a.cy < b.y || a.cy > b.y + b.h;
    if (seg2EntersB && dy !== 0) {
      const row = dy > 0 ? Math.floor(b.y / CELL) - 1 : Math.floor((b.y + b.h) / CELL);
      const [x, w] = breadth(b.cx);
      doorAt({ x, y: row * CELL, w, h: CELL }, vec(0, -dy), rollB);
    } else if (dx !== 0) {
      const col = dx > 0 ? Math.floor(b.x / CELL) - 1 : Math.floor((b.x + b.w) / CELL);
      const [y, h] = breadth(a.cy);
      doorAt({ x: col * CELL, y, w: CELL, h }, vec(-dx, 0), rollB);
    }
  }

  // 6) THE STRUCTURE RECORD — doors + optional styled floors ride the one
  // PlacedStructure shape the engine already ships (Zone Memory doorState,
  // co-op ZoneMsg, breakable door-actors, the ambient-spawn reachability
  // gate). rect is deliberately EMPTY (0×0 at the origin): the zone IS the
  // structure, and an honest whole-zone rect would veto every reachability
  // rescue carve (insideStructure) — in an interior, carving through a wall
  // is the correct rescue, not a breach.
  const floorStyle = P('floorStyle', '');
  const placed: PlacedStructure = {
    id: sid, defId: 'interior',
    // Off-map sentinel: even a 0×0 rect AT THE ORIGIN would claim a
    // CARVE_MARGIN halo of the arena's corner in reachability's
    // insideStructure test — park it far outside instead.
    rect: { x: -1e5, y: -1e5, w: 0, h: 0 },
    cellSize: CELL,
    roofs: [], roofStyle: 'stone',
    floors: floorStyle ? rooms.map(r => ({ x: r.x, y: r.y, w: r.w, h: r.h })) : [],
    ...(floorStyle ? { floorStyle } : {}),
    courtyards: [],
    doors: placedDoors,
    slots: [],
  };
  (ctx.structures ??= []).push(placed);

  // 7) ROLES — BFS depth over the FINAL edge set from the entry room, then the
  // registry decides what the deep rooms are and how they dress.
  ctx.walk = grid;
  const adj: number[][] = rooms.map(() => []);
  for (const [i, j] of edges) { adj[i].push(j); adj[j].push(i); }
  const depth = new Array<number>(n).fill(-1);
  depth[0] = 0;
  const queue = [0];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const nx of adj[cur]) if (depth[nx] < 0) { depth[nx] = depth[cur] + 1; queue.push(nx); }
  }
  const assigned = new Set<number>();
  if (P('roles', true)) {
    for (const role of interiorRoleDefs()) {
      const eligible = rooms.map((_, i) => i)
        .filter(i => !rooms[i].portal && !assigned.has(i) && depth[i] >= 0);
      const max = role.max ?? 1;
      let picks: number[] = [];
      if (role.pick === 'deepest') {
        picks = [...eligible].sort((x, y) => depth[y] - depth[x]).slice(0, max);
      } else if (role.pick === 'deadend') {
        picks = eligible.filter(i => adj[i].length === 1).sort((x, y) => depth[y] - depth[x]).slice(0, max);
      } else {
        const pool = [...eligible];
        for (let k = 0; k < max && pool.length; k++) picks.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
      }
      for (const i of picks) {
        assigned.add(i);
        const r = rooms[i];
        if (role.poi) ctx.pois.push(vec(r.cx, r.cy));
        if (role.furnish?.length) {
          const prev = ctx.sampleRect;
          try {
            ctx.sampleRect = {
              x: r.x + CELL, y: r.y + CELL,
              w: Math.max(CELL, r.w - CELL * 2), h: Math.max(CELL, r.h - CELL * 2),
            };
            stampEntries(ctx, role.furnish);
          } finally {
            ctx.sampleRect = prev;
          }
        }
      }
    }
  }

  // 7.5) THE TRAP PASS (the trapworks fabric): the crypt's mechanisms laid
  // WITH the geometry in hand — saw lanes down real corridor stretches,
  // rotor mincers in real chambers, plates wired to volleys/boulders/false
  // floors at real coordinates. Runs BEFORE scatter so every carved groove
  // is clearway-protected against squatting clutter.
  layInteriorTrapworks(ctx, P('trapworks', undefined) as TrapGenSpec | undefined,
    { rooms, adj, assigned, grid, halfW, doors: placedDoors });

  // 8) The tileset's own clutter dresses the carved floor (walk-gated), same
  // as rooms/flesh/mycelia.
  scatterDecoration(ctx, def);
}

// --- THE TRAP PASS -------------------------------------------------------------
// layoutParams.trapworks (TrapGenSpec) dials which mechanism archetypes a
// tileset's interiors field and how hard. All geometry-honest: candidates are
// measured off the ACTUAL carved corridors (grid center-line runs outside
// every room rect) and the ACTUAL rooms, portals and doors keep clearance,
// and every rng draw rides the layout stream — genqa's determinism invariant
// pins the whole pass for free.

/** The tileset dial set (layoutParams.trapworks). Chances roll per attempt
 *  slot (max slots each), so draw shape is fixed per archetype. */
export interface TrapGenSpec {
  /** Always-on buzzsaw lanes shuttling long corridor stretches. */
  sawHalls?: { chance: number; max?: number };
  /** Room-spanning rotor arms wheeling big chambers (the meat mincer). */
  mincerRooms?: { chance: number; max?: number };
  /** A visible plate mid-corridor wired to a dart volley raking across it. */
  dartWards?: { chance: number; max?: number };
  /** A HIDDEN plate deep in a long hall that looses the cradled boulder
   *  down it (single-use; the runway groove is the tell). */
  boulderRuns?: { chance: number; max?: number };
  /** Hidden plates in dead-end chambers whose wrong step drops the floor
   *  into the stratum below (the pitfall fabric's descend). */
  falseFloors?: { chance: number; max?: number };
}

interface TrapGeo {
  rooms: IntRoom[];
  adj: number[][];
  assigned: Set<number>;
  grid: GridWalkField;
  halfW: number;
  doors: PlacedDoor[];
  /** Pre-computed straight candidate legs (the labyrinth hands its lattice
   *  runs over directly — chained collinear links; chambers ride `rooms`).
   *  When present these REPLACE the room-graph edge walk; each leg is still
   *  grid-validated + trimmed through corridorStretch, so a chamber crossing
   *  or a braid knock never fools a lane onto unwalkable ground. */
  runs?: { a: Vec2; b: Vec2 }[];
}

/** A straight corridor stretch: the longest center-line run along one leg of
 *  an L-corridor that is walkable and OUTSIDE every room rect. */
interface TrapStretch { a: Vec2; b: Vec2; len: number; horiz: boolean; used?: boolean }

function corridorStretch(geo: TrapGeo, from: Vec2, to: Vec2): TrapStretch | null {
  const horiz = Math.abs(to.y - from.y) < 0.01;
  const len = Math.hypot(to.x - from.x, to.y - from.y);
  if (len < 60) return null;
  const step = CELL / 2;
  const n = Math.ceil(len / step);
  let best: [number, number] | null = null;
  let runStart = -1;
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const x = from.x + (to.x - from.x) * f, y = from.y + (to.y - from.y) * f;
    const clear = geo.grid.isWalkable(x, y)
      && !geo.rooms.some(r => x > r.x - 2 && x < r.x + r.w + 2 && y > r.y - 2 && y < r.y + r.h + 2);
    if (clear && runStart < 0) runStart = i;
    if ((!clear || i === n) && runStart >= 0) {
      const runEnd = clear ? i : i - 1;
      if (!best || runEnd - runStart > best[1] - best[0]) best = [runStart, runEnd];
      runStart = -1;
    }
  }
  if (!best) return null;
  // Shrink both ends most of a cell so lanes never kiss a room mouth (or its
  // door) — dungeon corridors are SHORT; over-trimming starves every archetype.
  const f0 = Math.min(1, (best[0] * step + CELL * 0.8) / len);
  const f1 = Math.max(0, (best[1] * step - CELL * 0.8) / len);
  if (f1 <= f0) return null;
  const a = vec(from.x + (to.x - from.x) * f0, from.y + (to.y - from.y) * f0);
  const b = vec(from.x + (to.x - from.x) * f1, from.y + (to.y - from.y) * f1);
  const sl = Math.hypot(b.x - a.x, b.y - a.y);
  return sl >= 80 ? { a, b, len: sl, horiz } : null;
}

function layInteriorTrapworks(ctx: GenCtx, spec: TrapGenSpec | undefined, geo: TrapGeo): void {
  if (!spec) return;
  const { rng } = ctx;
  const portalPts = [ctx.entry, ...ctx.exits];
  const clearOfPortals = (p: Vec2, min = 150): boolean =>
    portalPts.every(q => Math.hypot(p.x - q.x, p.y - q.y) >= min);
  const clearOfDoors = (p: Vec2, min = 70): boolean =>
    geo.doors.every(d => Math.hypot(p.x - d.pos.x, p.y - d.pos.y) >= min);
  const lerpAt = (s: TrapStretch, f: number): Vec2 =>
    vec(s.a.x + (s.b.x - s.a.x) * f, s.a.y + (s.b.y - s.a.y) * f);

  // Candidate stretches off the REAL carved corridors, longest first. The
  // room-graph walks its L-legs; a runs-bearing caller (the labyrinth)
  // hands its lattice chains over instead — one validator either way.
  const stretches: TrapStretch[] = [];
  const seen = new Set<string>();
  const legs: [Vec2, Vec2][] = [];
  if (geo.runs) {
    for (const r of geo.runs) legs.push([r.a, r.b]);
  } else {
    for (let i = 0; i < geo.rooms.length; i++) {
      for (const j of geo.adj[i]) {
        if (j <= i) continue;
        const a = geo.rooms[i], b = geo.rooms[j];
        legs.push([vec(a.cx, a.cy), vec(b.cx, a.cy)]);
        legs.push([vec(b.cx, a.cy), vec(b.cx, b.cy)]);
      }
    }
  }
  for (const leg of legs) {
    const s = corridorStretch(geo, leg[0], leg[1]);
    if (!s) continue;
    const key = `${Math.round((s.a.x + s.b.x) / 2)}:${Math.round((s.a.y + s.b.y) / 2)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!clearOfPortals(lerpAt(s, 0.5), 130)) continue;
    stretches.push(s);
  }
  stretches.sort((x, y) => y.len - x.len);
  const takeStretch = (minLen: number): TrapStretch | null => {
    for (const s of stretches) {
      if (!s.used && s.len >= minLen) { s.used = true; return s; }
    }
    return null;
  };

  // --- BOULDER RUNS: the longest halls first (hidden plate deep in, cradle
  // at the head, runway groove the whole way — single-use).
  for (let k = 0; k < (spec.boulderRuns?.max ?? 1); k++) {
    const want = rng.chance(spec.boulderRuns?.chance ?? 0);
    if (!want) continue;
    const s = takeStretch(240);
    if (!s) continue;
    const plate = lerpAt(s, 0.62);
    if (!clearOfDoors(plate)) continue;
    (ctx.trapworks ??= []).push({
      id: `gen_boulder${k}`,
      trigger: { kind: 'plate', at: plate, r: 15 },
      hidden: true,
      effects: [{ kind: 'boulder', from: { x: s.a.x, y: s.a.y }, to: { x: s.b.x, y: s.b.y } }],
      announce: 'stone grinds loose overhead —',
    });
    ctx.doodads.push({ pos: vec(s.a.x, s.a.y), radius: 24, kind: 'boulder_cradle' });
    layTraveledWay(ctx, [s.a, s.b], { kind: 'track_groove', band: [12, 15], step: 26, overgrowth: 0 });
  }

  // --- SAW HALLS: always-on shuttling blades, groove carved, learnable.
  for (let k = 0; k < (spec.sawHalls?.max ?? 1); k++) {
    const want = rng.chance(spec.sawHalls?.chance ?? 0);
    if (!want) continue;
    const s = takeStretch(140);
    if (!s) continue;
    const two = s.len >= 280;
    (ctx.tracks ??= []).push({
      path: [{ x: s.a.x, y: s.a.y }, { x: s.b.x, y: s.b.y }],
      mode: 'pingpong',
      speed: 140,
      riders: two
        ? [{ kind: 'ruin_sawblade', phase: 0 }, { kind: 'ruin_sawblade', phase: 0.5 }]
        : [{ kind: 'ruin_sawblade' }],
      groove: true,
    });
    layTraveledWay(ctx, [s.a, s.b], { kind: 'track_groove', band: [13, 16], step: 26, overgrowth: 0 });
  }

  // --- DART WARDS: a visible plate mid-hall; carved maws on one wall; a
  // volley rakes ACROSS the corridor when pressed (re-arms — a standing ward).
  for (let k = 0; k < (spec.dartWards?.max ?? 1); k++) {
    const want = rng.chance(spec.dartWards?.chance ?? 0);
    if (!want) continue;
    const s = takeStretch(130);
    if (!s) continue;
    const mid = lerpAt(s, 0.5);
    if (!clearOfDoors(mid)) continue;
    const alongX = s.horiz ? 1 : 0, alongY = s.horiz ? 0 : 1;
    const perpX = s.horiz ? 0 : 1, perpY = s.horiz ? 1 : 0;
    const reach = geo.halfW + CELL * 0.9;
    const rays: { a: Vec2; b: Vec2 }[] = [];
    const count = 4;
    for (let i = 0; i < count; i++) {
      const off = (i - (count - 1) / 2) * CELL * 0.9;
      const cx = mid.x + alongX * off, cy = mid.y + alongY * off;
      rays.push({
        a: { x: cx - perpX * reach, y: cy - perpY * reach },
        b: { x: cx + perpX * reach, y: cy + perpY * reach },
      });
      ctx.doodads.push({
        pos: vec(cx - perpX * (reach - 4), cy - perpY * (reach - 4)),
        radius: 12, kind: 'dart_maw',
      });
    }
    (ctx.trapworks ??= []).push({
      id: `gen_dartward${k}`,
      trigger: { kind: 'plate', at: mid, r: 16 },
      rearm: 7,
      effects: [{ kind: 'volley', rays }],
      announce: 'the carved mouths draw breath —',
    });
  }

  // --- MINCER ROOMS: rotor arms wheeling the chamber — the room IS the
  // hazard, and anything that walks it (either side) feeds the blades.
  const bigRooms = geo.rooms
    .map((r, i) => ({ r, i }))
    .filter(({ r, i }) => !r.portal && !geo.assigned.has(i)
      && Math.min(r.w, r.h) >= CELL * 5.2 && clearOfPortals(vec(r.cx, r.cy), 150));
  let mincersLaid = 0;
  for (let k = 0; k < (spec.mincerRooms?.max ?? 1); k++) {
    const want = rng.chance(spec.mincerRooms?.chance ?? 0);
    if (!want) continue;
    const cand = bigRooms[mincersLaid];
    if (!cand) continue;
    mincersLaid++;
    const rm = cand.r;
    // Hub sized so the arm's tip (hub + 62) clears the walls by ≥ 6px — a
    // small room gets a center-pivot ceiling fan, a great hall a wide wheel.
    const hubR = Math.max(8, Math.min(rm.w, rm.h) * 0.5 - 68);
    (ctx.tracks ??= []).push({
      path: ringPath(rm.cx, rm.cy, hubR, 16, rng.range(0, Math.PI * 2)),
      closed: true,
      mode: 'loop',
      speed: 105,
      riders: [{ kind: 'ruin_fanblade', phase: 0 }, { kind: 'ruin_fanblade', phase: 0.5 }],
      groove: false,
    });
  }

  // --- FALSE FLOORS: dead-end chambers where the wrong flagstone is a door
  // to the stratum below (hidden plates; the pitfall fabric owns the drop —
  // in a cave-rung interior the descend default already mints the hollow).
  const deadEnds = geo.rooms
    .map((r, i) => ({ r, i }))
    .filter(({ r, i }) => !r.portal && geo.adj[i].length === 1
      && Math.min(r.w, r.h) >= CELL * 4.6 && clearOfPortals(vec(r.cx, r.cy), 170));
  let floorsLaid = 0;
  for (let k = 0; k < (spec.falseFloors?.max ?? 1); k++) {
    const want = rng.chance(spec.falseFloors?.chance ?? 0);
    if (!want) continue;
    const cand = deadEnds[floorsLaid];
    if (!cand) continue;
    floorsLaid++;
    const rm = cand.r;
    const inX = rm.x + CELL * 1.2, inW = rm.w - CELL * 2.4;
    const inY = rm.y + CELL * 1.2, inH = rm.h - CELL * 2.4;
    for (let p = 0; p < 2; p++) {
      const at = vec(inX + rng.range(0.15, 0.85) * inW, inY + rng.range(0.15, 0.85) * inH);
      if (!clearOfDoors(at)) continue;
      const a2 = rng.range(0, Math.PI * 2);
      (ctx.trapworks ??= []).push({
        id: `gen_floor${k}_${p}`,
        trigger: { kind: 'plate', at, r: 14 },
        hidden: true,
        effects: [{
          kind: 'collapse',
          cells: [
            { x: at.x, y: at.y, r: 26 },
            { x: at.x + Math.cos(a2) * 30, y: at.y + Math.sin(a2) * 30, r: 24 },
            { x: at.x - Math.cos(a2 + 0.9) * 26, y: at.y - Math.sin(a2 + 0.9) * 26, r: 22 },
          ],
        }],
        announce: 'the flags shift underfoot —',
      });
    }
    // The honest whisper: a little rubble where the masons cut corners.
    ctx.doodads.push({ pos: vec(rm.cx + rng.range(-14, 14), rm.cy + rng.range(-14, 14)), radius: 12, kind: 'rubble' });
  }
}

registerLayout('dungeon', (ctx, def) => interiorLayout(ctx, def));

/** The EDIFICE — a building's floor plan filling the zone: the dungeon engine
 *  under architected data (BSP suites, doors on nearly every mouth, styled
 *  floors). A tileset/biome overrides any of it via layoutParams. */
const EDIFICE_PRESET: Record<string, unknown> = {
  arrangement: 'bsp',
  doorChance: 0.85,
  doorBreakChance: 0.2,
  corridorCells: 1.6,
  loopiness: 0.3,
  floorStyle: 'flagstone',
};
registerLayout('edifice', (ctx, def) => interiorLayout(ctx, def, EDIFICE_PRESET));

// --- THE LABYRINTH ---------------------------------------------------------------

/** A whole-zone MAZE: recursive-backtracker passages over a node lattice,
 *  braided (a fraction of dead ends knocked through — loops, not frustration),
 *  with rolled CHAMBERS swelling random junctions and a POI at the deepest
 *  node (the maze pays out at its heart). layoutParams: corridorCells (passage
 *  width, default 2), braid (0..1 dead-end knock-through, default 0.22),
 *  chambers ([lo,hi] count, default [2,4]), chamberR ([lo,hi] px), interiorWall/
 *  interiorFloor region kinds. */
function labyrinthLayout(ctx: GenCtx, def: ZoneDef): void {
  const { rng, arena } = ctx;
  const grid = new GridWalkField(arena.w, arena.h, CELL);
  const wallKind = layoutParam(def, 'interiorWall', 'wall');
  const floorKind = layoutParam(def, 'interiorFloor', 'ground');
  if (wallKind !== 'wall') grid.fillRegion(0, 0, arena.w - 0.01, arena.h - 0.01, wallKind);
  const cc = Math.max(1, layoutParam(def, 'corridorCells', 2));
  const pitch = (cc + 1) * CELL;
  const m = EDGE_CELLS * CELL + (cc * CELL) / 2;
  const nx = Math.max(2, Math.floor((arena.w - m * 2) / pitch) + 1);
  const ny = Math.max(2, Math.floor((arena.h - m * 2) / pitch) + 1);
  const nodeX = (i: number): number => m + i * pitch;
  const nodeY = (j: number): number => m + j * pitch;
  const idx = (i: number, j: number): number => j * nx + i;
  const halfW = (cc * CELL) / 2 - 0.1;
  const links = new Set<string>();
  const linkKey = (a: number, b: number): string => `${Math.min(a, b)}:${Math.max(a, b)}`;
  const carveLink = (i0: number, j0: number, i1: number, j1: number): void => {
    grid.carveCorridor(nodeX(i0), nodeY(j0), nodeX(i1), nodeY(j1), halfW);
    links.add(linkKey(idx(i0, j0), idx(i1, j1)));
  };

  // Recursive backtracker over the lattice — the classic perfect maze.
  const visited = new Array<boolean>(nx * ny).fill(false);
  const stack: [number, number][] = [[0, 0]];
  visited[idx(0, 0)] = true;
  const DIRS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (stack.length) {
    const [ci, cj] = stack[stack.length - 1];
    const open = DIRS
      .map(([di, dj]) => [ci + di, cj + dj] as [number, number])
      .filter(([i, j]) => i >= 0 && j >= 0 && i < nx && j < ny && !visited[idx(i, j)]);
    if (!open.length) { stack.pop(); continue; }
    const [tI, tJ] = open[rng.int(0, open.length - 1)];
    visited[idx(tI, tJ)] = true;
    carveLink(ci, cj, tI, tJ);
    stack.push([tI, tJ]);
  }

  // BRAID: knock a fraction of dead ends through a still-closed wall — loops
  // relieve the backtrack slog without dissolving the maze.
  const braid = layoutParam(def, 'braid', 0.22);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const linked = DIRS.filter(([di, dj]) => {
        const ti = i + di, tj = j + dj;
        return ti >= 0 && tj >= 0 && ti < nx && tj < ny && links.has(linkKey(idx(i, j), idx(ti, tj)));
      });
      if (linked.length !== 1) continue;
      const knock = rng.chance(braid); // roll before the closed-wall filter
      if (!knock) continue;
      const closed = DIRS
        .map(([di, dj]) => [i + di, j + dj] as [number, number])
        .filter(([ti, tj]) => ti >= 0 && tj >= 0 && ti < nx && tj < ny && !links.has(linkKey(idx(i, j), idx(ti, tj))));
      if (!closed.length) continue;
      const [tI, tJ] = closed[rng.int(0, closed.length - 1)];
      carveLink(i, j, tI, tJ);
    }
  }

  // The wall RIND: no carve may open the maze flush onto the raw arena
  // border (rolled radii clamp to the disc center's distance from it —
  // clamped AFTER the roll, so the draw sequence never depends on geometry).
  const rind = EDGE_CELLS * CELL;
  const clampR = (x: number, y: number, r: number): number =>
    Math.max(CELL, Math.min(r, x - rind, arena.w - rind - x, y - rind, arena.h - rind - y));

  // CHAMBERS: swell a few junctions into fight-sized rounds (captured — the
  // trap pass below reads them as its mincer candidates).
  const chamberBand = layoutParam(def, 'chambers', [2, 4] as [number, number]);
  const chamberR = layoutParam(def, 'chamberR', [80, 140] as [number, number]);
  const chambers = rng.int(chamberBand[0], chamberBand[1]);
  const placedChambers: { x: number; y: number; r: number }[] = [];
  for (let k = 0; k < chambers; k++) {
    const i = rng.int(0, nx - 1), j = rng.int(0, ny - 1);
    const r = clampR(nodeX(i), nodeY(j), rng.range(chamberR[0], chamberR[1]));
    grid.fillDisc(nodeX(i), nodeY(j), r, floorKind);
    placedChambers.push({ x: nodeX(i), y: nodeY(j), r });
  }

  // PORTALS: every entry/exit carves a mouth to its nearest lattice node.
  const nearestNode = (p: Vec2): [number, number] => [
    Math.max(0, Math.min(nx - 1, Math.round((p.x - m) / pitch))),
    Math.max(0, Math.min(ny - 1, Math.round((p.y - m) / pitch))),
  ];
  for (const pt of [ctx.entry, ...ctx.exits]) {
    const [i, j] = nearestNode(pt);
    grid.fillDisc(pt.x, pt.y, clampR(pt.x, pt.y, cc * CELL), floorKind);
    grid.carveCorridor(pt.x, pt.y, nodeX(i), nodeY(j), Math.max(halfW, 20));
  }

  // THE HEART: BFS over the carved links from the entry's node — the farthest
  // node gets the POI (gem caches and spawner objectives nest at POIs).
  const [ei, ej] = nearestNode(ctx.entry);
  const dist = new Array<number>(nx * ny).fill(-1);
  dist[idx(ei, ej)] = 0;
  const queue = [[ei, ej] as [number, number]];
  let far: [number, number] = [ei, ej];
  while (queue.length) {
    const [ci, cj] = queue.shift()!;
    if (dist[idx(ci, cj)] > dist[idx(far[0], far[1])]) far = [ci, cj];
    for (const [di, dj] of DIRS) {
      const ti = ci + di, tj = cj + dj;
      if (ti < 0 || tj < 0 || ti >= nx || tj >= ny) continue;
      if (dist[idx(ti, tj)] >= 0 || !links.has(linkKey(idx(ci, cj), idx(ti, tj)))) continue;
      dist[idx(ti, tj)] = dist[idx(ci, cj)] + 1;
      queue.push([ti, tj]);
    }
  }
  ctx.pois.push(vec(nodeX(far[0]), nodeY(far[1])));

  // THE TRAP PASS (trapworks fabric) — the maze is trap country: its lattice
  // chains ARE ready-made lanes (collinear links fused into straight runs —
  // ≥2 links = a run; every run still grid-validated + trimmed through the
  // one corridorStretch validator), its chambers ready-made mincer rounds
  // (inscribed-square rects). Room-graph-only archetypes (false floors want
  // dead-end ROOMS) find no candidates here by construction and skip; their
  // chance draws still burn, so the stream stays seed-stable per layout.
  const runs: { a: Vec2; b: Vec2 }[] = [];
  for (let j = 0; j < ny; j++) {
    let i0 = -1;
    for (let i = 0; i < nx; i++) {
      const linked = i + 1 < nx && links.has(linkKey(idx(i, j), idx(i + 1, j)));
      if (linked && i0 < 0) i0 = i;
      if (!linked && i0 >= 0) {
        if (i - i0 >= 2) runs.push({ a: vec(nodeX(i0), nodeY(j)), b: vec(nodeX(i), nodeY(j)) });
        i0 = -1;
      }
    }
  }
  for (let i = 0; i < nx; i++) {
    let j0 = -1;
    for (let j = 0; j < ny; j++) {
      const linked = j + 1 < ny && links.has(linkKey(idx(i, j), idx(i, j + 1)));
      if (linked && j0 < 0) j0 = j;
      if (!linked && j0 >= 0) {
        if (j - j0 >= 2) runs.push({ a: vec(nodeX(i), nodeY(j0)), b: vec(nodeX(i), nodeY(j)) });
        j0 = -1;
      }
    }
  }
  const chamberRooms: IntRoom[] = placedChambers.map(c => {
    const s = c.r * 1.41;   // the inscribed square — mincer sizing reads w/h
    return { x: c.x - s / 2, y: c.y - s / 2, w: s, h: s, cx: c.x, cy: c.y };
  });
  layInteriorTrapworks(ctx,
    layoutParam(def, 'trapworks', undefined) as TrapGenSpec | undefined, {
      rooms: chamberRooms,
      adj: chamberRooms.map(() => []),
      assigned: new Set(),
      grid, halfW, doors: [], runs,
    });

  ctx.walk = grid;
  scatterDecoration(ctx, def);
}

registerLayout('labyrinth', labyrinthLayout);
