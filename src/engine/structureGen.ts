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
