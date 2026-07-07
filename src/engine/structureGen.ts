// ---------------------------------------------------------------------------
// STRUCTURE GENERATORS — procedural blueprints.
//
// A generator EMITS the same char-plan format authored structures use
// (data/structures.ts STRUCTURE_LEGEND), so one downstream pipeline
// (levelgen placeStructurePlan) raises hand-drawn huts and procedural
// castles alike. Generators are registered under open-string ids and are
// pure functions of (rng, params): seed-deterministic, replayable across
// revisits and co-op clients. A "fortress" is not new code — it is the
// castle generator with `concentric: true` in a def's genParams; every knob
// below is data.
// ---------------------------------------------------------------------------

import type { Rng } from '../core/rng';

export type StructureGenParams = Record<string, number | [number, number] | string | boolean>;
export type StructureGenerator = (rng: Rng, params: StructureGenParams) => string[];

const STRUCTURE_GENERATORS: Record<string, StructureGenerator> = {};

export function registerStructureGen(id: string, gen: StructureGenerator): void {
  if (STRUCTURE_GENERATORS[id]) console.warn(`[structures] re-registering generator '${id}' — overriding`);
  STRUCTURE_GENERATORS[id] = gen;
}

export function hasStructureGen(id: string): boolean { return id in STRUCTURE_GENERATORS; }

export function runStructureGen(id: string, rng: Rng, params: StructureGenParams): string[] | null {
  const gen = STRUCTURE_GENERATORS[id];
  return gen ? gen(rng, params) : null;
}

/** Roll a numeric param: a fixed number passes through, a [lo, hi] pair rolls. */
function roll(rng: Rng, v: number | [number, number] | string | boolean | undefined, dflt: number | [number, number]): number {
  const src = (typeof v === 'number' || Array.isArray(v)) ? v : dflt;
  return typeof src === 'number' ? src : Math.round(rng.range(src[0], src[1]));
}

/** A mutable char grid with row-string export. */
class PlanGrid {
  rows: string[][];
  constructor(public w: number, public h: number) {
    this.rows = Array.from({ length: h }, () => Array.from({ length: w }, () => ' '));
  }
  get(x: number, y: number): string { return this.rows[y]?.[x] ?? ' '; }
  set(x: number, y: number, c: string): void {
    if (x >= 0 && x < this.w && y >= 0 && y < this.h) this.rows[y][x] = c;
  }
  rect(x0: number, y0: number, x1: number, y1: number, c: string): void {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, c);
  }
  ring(x0: number, y0: number, x1: number, y1: number, c: string): void {
    for (let x = x0; x <= x1; x++) { this.set(x, y0, c); this.set(x, y1, c); }
    for (let y = y0; y <= y1; y++) { this.set(x0, y, c); this.set(x1, y, c); }
  }
  out(): string[] { return this.rows.map(r => r.join('')); }
}

// --- CASTLE ------------------------------------------------------------------
// A curtain wall with corner towers (parapet rims + a garrison slot core), a
// gated entrance, arrow-slit windows, a courtyard, and an optional roofed KEEP
// with its own door. `concentric: true` adds a second inner wall ring with an
// offset gate — the fortress. Every knob is a genParam.
registerStructureGen('castle', (rng, p) => {
  const w = roll(rng, p.w, [17, 23]);
  const h = roll(rng, p.h, [13, 17]);
  const g = new PlanGrid(w, h);
  const concentric = p.concentric === true;
  const towers = p.towers !== false;
  const keep = p.keep !== false;
  const gateChar = typeof p.gateChar === 'string' ? p.gateChar : 'X';

  // Courtyard floor first; curtain wall ring over it.
  g.rect(1, 1, w - 2, h - 2, '_');
  g.ring(0, 0, w - 1, h - 1, '#');

  // Corner towers: 3×3 parapet blocks with a garrison-slot core.
  if (towers) {
    for (const [tx, ty] of [[0, 0], [w - 3, 0], [0, h - 3], [w - 3, h - 3]] as const) {
      g.rect(tx, ty, tx + 2, ty + 2, 'P');
      g.set(tx + 1, ty + 1, 'T');
    }
  }

  // Arrow-slit windows along each wall (clear of corners/towers).
  const slitEvery = roll(rng, p.slitEvery, [4, 6]);
  for (let x = 4; x < w - 4; x += slitEvery) { g.set(x, 0, 'W'); g.set(x, h - 1, 'W'); }
  for (let y = 4; y < h - 4; y += slitEvery) { g.set(0, y, 'W'); g.set(w - 1, y, 'W'); }

  // The gate: a 2-cell breach on a rolled side (1-2 gates).
  const sides: ('n' | 's' | 'e' | 'w')[] = ['n', 's', 'e', 'w'];
  const gates = roll(rng, p.gates, [1, 2]);
  const firstSide = sides[rng.int(0, 3)];
  const gateSides = gates >= 2 ? [firstSide, sides[(sides.indexOf(firstSide) + 2) % 4]] : [firstSide];
  for (const side of gateSides) {
    if (side === 'n' || side === 's') {
      const gx = Math.floor(w / 2) + rng.int(-2, 2);
      const gy = side === 'n' ? 0 : h - 1;
      g.set(gx, gy, gateChar); g.set(gx + 1, gy, gateChar);
    } else {
      const gy = Math.floor(h / 2) + rng.int(-2, 2);
      const gx = side === 'w' ? 0 : w - 1;
      g.set(gx, gy, gateChar); g.set(gx, gy + 1, gateChar);
    }
  }

  // Optional concentric inner ring (the fortress): inset 4 — the ring corridor
  // (cols/rows 1..3) stays passable AROUND the 3×3 corner towers, which fill
  // cols 0..2 at each corner (inset 3 would let the towers seal the corridor).
  if (concentric && w >= 17 && h >= 15) {
    g.ring(4, 4, w - 5, h - 5, '#');
    g.rect(5, 5, w - 6, h - 6, '_');
    // Inner gate offset a quarter-turn from the outer, so a breach never lines up.
    const side = gateSides[0];
    if (side === 'n' || side === 's') g.set(4, Math.floor(h / 2), gateChar);
    else g.set(Math.floor(w / 2), 4, gateChar);
  }

  // The keep: a roofed inner hall with a dwell door facing the first gate.
  if (keep) {
    const inset = concentric ? 7 : 4;
    const kx0 = inset, ky0 = inset, kx1 = w - 1 - inset, ky1 = h - 1 - inset;
    if (kx1 - kx0 >= 3 && ky1 - ky0 >= 3) {
      g.ring(kx0, ky0, kx1, ky1, '#');
      g.rect(kx0 + 1, ky0 + 1, kx1 - 1, ky1 - 1, '.');
      const side = gateSides[0];
      const mx = Math.floor((kx0 + kx1) / 2), my = Math.floor((ky0 + ky1) / 2);
      if (side === 'n') g.set(mx, ky0, 'D');
      else if (side === 's') g.set(mx, ky1, 'D');
      else if (side === 'w') g.set(kx0, my, 'D');
      else g.set(kx1, my, 'D');
      // A little garrison furniture inside the hall.
      g.set(kx0 + 1, ky0 + 1, 'B');
      g.set(kx1 - 1, ky1 - 1, 'C');
    }
  }

  // A courtyard campfire, off-center — ONLY on open courtyard ground (both
  // ints always roll, so the rng sequence is stable; a spot that would land
  // on the keep wall / a door / the inner ring simply goes fireless).
  const fx = Math.floor(w / 2) + rng.int(-3, 3);
  const fy = Math.floor(h / 2) + rng.int(-2, 2);
  if (g.get(fx, fy) === '_') g.set(fx, fy, 'F');
  return g.out();
});

// --- LABYRINTH ----------------------------------------------------------------
// A recursive-backtracker maze with a guaranteed ENTRANCE and EXIT on opposite
// sides (doors, so the labyrinth reads as a built place, not scattered rock).
// Corridor width = one plan cell — size the def's cellSize for comfort (60+).
registerStructureGen('labyrinth', (rng, p) => {
  // Odd dimensions so the odd-coordinate room lattice fits.
  const ow = roll(rng, p.w, [13, 19]), oh = roll(rng, p.h, [11, 15]);
  const w = ow % 2 ? ow : ow + 1, h = oh % 2 ? oh : oh + 1;
  const g = new PlanGrid(w, h);
  g.rect(0, 0, w - 1, h - 1, '#');

  // Backtracker over odd cells.
  const stack: [number, number][] = [[1, 1]];
  g.set(1, 1, '.');
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const options: [number, number][] = [];
    for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]] as const) {
      const nx = cx + dx, ny = cy + dy;
      if (nx > 0 && nx < w - 1 && ny > 0 && ny < h - 1 && g.get(nx, ny) === '#') options.push([nx, ny]);
    }
    if (!options.length) { stack.pop(); continue; }
    const [nx, ny] = options[rng.int(0, options.length - 1)];
    g.set(nx, ny, '.');
    g.set(cx + (nx - cx) / 2, cy + (ny - cy) / 2, '.');
    stack.push([nx, ny]);
  }

  // A few extra loops so it isn't a strict tree (choices, not one solution).
  const loops = roll(rng, p.loops, [2, 4]);
  for (let i = 0; i < loops; i++) {
    const x = 1 + rng.int(0, Math.floor((w - 3) / 2)) * 2 + 1;
    const y = 1 + rng.int(0, Math.floor((h - 3) / 2)) * 2;
    if (x > 0 && x < w - 1 && y > 0 && y < h - 1) g.set(x, y, '.');
  }

  // Entrance + exit doors on OPPOSITE sides, aligned to open corridor cells.
  const doorChar = typeof p.doorChar === 'string' ? p.doorChar : 'D';
  const ex = 1 + rng.int(0, Math.floor((w - 3) / 2)) * 2;
  g.set(ex, 0, doorChar);
  g.set(ex, 1, '.');
  const xx = 1 + rng.int(0, Math.floor((w - 3) / 2)) * 2;
  g.set(xx, h - 1, doorChar);
  g.set(xx, h - 2, '.');
  return g.out();
});

// --- COMPOUND -------------------------------------------------------------------
// The ROOM-GRAMMAR COMPOSER: a footprint recursively split into rooms (BSP),
// every partition door-punched so the whole interior is connected, some leaf
// rooms opened to the sky as courtyards, exterior gates + windows, optional
// corner towers, and furniture sprinkled by density. This is the seam future
// DUNGEON and METROPOLIS biomes compose from: one def = one building style,
// and every knob below is a genParam — fixed numbers make it deterministic,
// ranges make it varied, the zone rng makes both replayable.
//
//   w, h                footprint in cells        [14, 22] × [11, 17]
//   minRoom             smallest room span        3
//   splitBias           0..1 preference for cutting the LONG axis   0.75
//   courtyardChance     leaf rooms opened to sky  0.25
//   doorChar / gateChar interior + exterior doors 'D' / 'X'
//   gates               exterior gate count       [1, 2]
//   windows             slit spacing (0 = none)   5
//   towers              corner parapet blocks     false
//   loops               extra interior doors      [1, 3]
//   clutterPer100       B/C per 100 floor cells   [2, 5]
registerStructureGen('compound', (rng, p) => {
  const w = roll(rng, p.w, [14, 22]);
  const h = roll(rng, p.h, [11, 17]);
  const minRoom = roll(rng, p.minRoom, 3);
  const splitBias = typeof p.splitBias === 'number' ? p.splitBias : 0.75;
  const doorChar = typeof p.doorChar === 'string' ? p.doorChar : 'D';
  const gateChar = typeof p.gateChar === 'string' ? p.gateChar : 'X';
  const courtyardChance = typeof p.courtyardChance === 'number' ? p.courtyardChance : 0.25;
  const windows = roll(rng, p.windows, 5);
  const g = new PlanGrid(w, h);

  // Shell: interior floor ringed by the outer wall.
  g.rect(1, 1, w - 2, h - 2, '.');
  g.ring(0, 0, w - 1, h - 1, '#');

  // BSP split: cut regions with interior walls, door-punch every cut.
  interface Region { x0: number; y0: number; x1: number; y1: number }
  const leaves: Region[] = [];
  const split = (rgn: Region, depth: number): void => {
    const rw = rgn.x1 - rgn.x0 + 1, rh = rgn.y1 - rgn.y0 + 1;
    const canV = rw >= minRoom * 2 + 1;
    const canH = rh >= minRoom * 2 + 1;
    if ((!canV && !canH) || depth > 5) { leaves.push(rgn); return; }
    let vertical: boolean;
    if (canV && canH) vertical = rng.chance(rw >= rh ? splitBias : 1 - splitBias);
    else vertical = canV;
    if (vertical) {
      const cx = rgn.x0 + minRoom + rng.int(0, rw - minRoom * 2 - 1);
      for (let y = rgn.y0; y <= rgn.y1; y++) g.set(cx, y, '#');
      g.set(cx, rgn.y0 + rng.int(0, rh - 1), doorChar);
      split({ x0: rgn.x0, y0: rgn.y0, x1: cx - 1, y1: rgn.y1 }, depth + 1);
      split({ x0: cx + 1, y0: rgn.y0, x1: rgn.x1, y1: rgn.y1 }, depth + 1);
    } else {
      const cy = rgn.y0 + minRoom + rng.int(0, rh - minRoom * 2 - 1);
      for (let x = rgn.x0; x <= rgn.x1; x++) g.set(x, cy, '#');
      g.set(rgn.x0 + rng.int(0, rw - 1), cy, doorChar);
      split({ x0: rgn.x0, y0: rgn.y0, x1: rgn.x1, y1: cy - 1 }, depth + 1);
      split({ x0: rgn.x0, y0: cy + 1, x1: rgn.x1, y1: rgn.y1 }, depth + 1);
    }
  };
  split({ x0: 1, y0: 1, x1: w - 2, y1: h - 2 }, 0);

  // Courtyards: open some leaf rooms to the sky (unroofed floor).
  for (const rgn of leaves) {
    if (!rng.chance(courtyardChance)) continue;
    for (let y = rgn.y0; y <= rgn.y1; y++) {
      for (let x = rgn.x0; x <= rgn.x1; x++) if (g.get(x, y) === '.') g.set(x, y, '_');
    }
  }

  // Extra interior doors: loops so rooms offer choices, not one hallway.
  const loops = roll(rng, p.loops, [1, 3]);
  for (let i = 0; i < loops; i++) {
    const x = 1 + rng.int(0, w - 3), y = 1 + rng.int(0, h - 3);
    const horizWall = g.get(x, y) === '#' && g.get(x - 1, y) !== '#' && g.get(x + 1, y) !== '#';
    const vertWall = g.get(x, y) === '#' && g.get(x, y - 1) !== '#' && g.get(x, y + 1) !== '#';
    if (horizWall || vertWall) g.set(x, y, doorChar);
  }

  // Exterior gates on rolled sides, adjacent to real floor.
  const gates = roll(rng, p.gates, [1, 2]);
  for (let i = 0; i < gates; i++) {
    for (let tries = 0; tries < 12; tries++) {
      const side = rng.int(0, 3);
      if (side < 2) {
        const gx = 2 + rng.int(0, w - 5);
        const gy = side === 0 ? 0 : h - 1;
        const iy = side === 0 ? 1 : h - 2;
        if (g.get(gx, iy) !== '#') { g.set(gx, gy, gateChar); break; }
      } else {
        const gy = 2 + rng.int(0, h - 5);
        const gx = side === 2 ? 0 : w - 1;
        const ix = side === 2 ? 1 : w - 2;
        if (g.get(ix, gy) !== '#') { g.set(gx, gy, gateChar); break; }
      }
    }
  }

  // Arrow-slit windows along the shell.
  if (windows > 0) {
    for (let x = 3; x < w - 3; x += windows) {
      if (g.get(x, 0) === '#') g.set(x, 0, 'W');
      if (g.get(x, h - 1) === '#') g.set(x, h - 1, 'W');
    }
    for (let y = 3; y < h - 3; y += windows) {
      if (g.get(0, y) === '#') g.set(0, y, 'W');
      if (g.get(w - 1, y) === '#') g.set(w - 1, y, 'W');
    }
  }

  // Optional corner towers (metropolis keeps, dungeon bastions).
  if (p.towers === true) {
    for (const [tx, ty] of [[0, 0], [w - 3, 0], [0, h - 3], [w - 3, h - 3]] as const) {
      g.rect(tx, ty, tx + 2, ty + 2, 'P');
      g.set(tx + 1, ty + 1, 'T');
    }
  }

  // Furniture: crates/barrels sprinkled over floor cells; a courtyard fire.
  const floors: [number, number][] = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    if (g.get(x, y) === '.' || g.get(x, y) === '_') floors.push([x, y]);
  }
  const clutter = Math.round(floors.length / 100 * roll(rng, p.clutterPer100, [2, 5]));
  for (let i = 0; i < clutter && floors.length; i++) {
    const [cx, cy] = floors[rng.int(0, floors.length - 1)];
    if (g.get(cx, cy) === '.') g.set(cx, cy, rng.chance(0.5) ? 'B' : 'C');
  }
  const court = floors.filter(([x, y]) => g.get(x, y) === '_');
  if (court.length) {
    const [fx, fy] = court[rng.int(0, court.length - 1)];
    g.set(fx, fy, 'F');
  }
  return g.out();
});

// --- WATCHTOWER -----------------------------------------------------------------
// A single free-standing tower: parapet ring, slot core, one door — the minimal
// garrison structure (roadside outposts, siege camps, D2 Arreat-plateau towers).
registerStructureGen('watchtower', (rng, p) => {
  const s = roll(rng, p.size, [5, 5]);
  const g = new PlanGrid(s, s);
  g.rect(1, 1, s - 2, s - 2, '.');
  g.ring(0, 0, s - 1, s - 1, 'P');
  const c = Math.floor(s / 2);
  g.set(c, c, 'T');
  const side = rng.int(0, 3);
  if (side === 0) g.set(c, 0, 'D');
  else if (side === 1) g.set(c, s - 1, 'D');
  else if (side === 2) g.set(0, c, 'D');
  else g.set(s - 1, c, 'D');
  return g.out();
});
