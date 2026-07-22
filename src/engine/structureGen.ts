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
  // A second gate breaches the OPPOSITE wall (storm one face, sally the
  // other). The old `+2 % 4` walked ['n','s','e','w'] — a PAIRED order, not a
  // ring — and always landed on a perpendicular wall instead.
  const OPPOSITE = { n: 's', s: 'n', e: 'w', w: 'e' } as const;
  const gateSides = gates >= 2 ? [firstSide, OPPOSITE[firstSide]] : [firstSide];
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

  // BSP split: cut regions with interior walls, door-punch every cut. Door
  // punches are DEFERRED until the whole recursion lands: a child partition
  // wall spans its region's full width, which reaches the cell flanking a
  // parent's already-punched door — sealing the sole connector and orphaning
  // an entire sub-tree of rooms (unreachable garrison, unenterable rooms).
  // The rng draws stay exactly in place (only the g.set moves), and the
  // post-pass reopens any flank a child wall closed, so every cut's door
  // provably connects its two sides.
  interface Region { x0: number; y0: number; x1: number; y1: number }
  const leaves: Region[] = [];
  const doorOps: { x: number; y: number; vertical: boolean }[] = [];
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
      doorOps.push({ x: cx, y: rgn.y0 + rng.int(0, rh - 1), vertical: true });
      split({ x0: rgn.x0, y0: rgn.y0, x1: cx - 1, y1: rgn.y1 }, depth + 1);
      split({ x0: cx + 1, y0: rgn.y0, x1: rgn.x1, y1: rgn.y1 }, depth + 1);
    } else {
      const cy = rgn.y0 + minRoom + rng.int(0, rh - minRoom * 2 - 1);
      for (let x = rgn.x0; x <= rgn.x1; x++) g.set(x, cy, '#');
      doorOps.push({ x: rgn.x0 + rng.int(0, rw - 1), y: cy, vertical: false });
      split({ x0: rgn.x0, y0: rgn.y0, x1: rgn.x1, y1: cy - 1 }, depth + 1);
      split({ x0: rgn.x0, y0: cy + 1, x1: rgn.x1, y1: rgn.y1 }, depth + 1);
    }
  };
  split({ x0: 1, y0: 1, x1: w - 2, y1: h - 2 }, 0);
  // Punch the doors now that every child wall is down; a flank a child wall
  // sealed reopens to floor (a 1-cell doorway notch in that wall — exactly
  // the connectivity the door promised). Runs before courtyards so reopened
  // flanks join a courtyard conversion like any other floor cell. Draw-free.
  for (const op of doorOps) {
    g.set(op.x, op.y, doorChar);
    const flanks = op.vertical
      ? [[op.x - 1, op.y], [op.x + 1, op.y]] as const
      : [[op.x, op.y - 1], [op.x, op.y + 1]] as const;
    for (const [fx, fy] of flanks) if (g.get(fx, fy) === '#') g.set(fx, fy, '.');
  }

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

// --- CATHEDRAL ------------------------------------------------------------------
// THE GREAT CHURCH COMPOSER — a cruciform basilica rolled whole: narthex →
// columned nave with flanking aisles → crossing + transept arms → choir →
// semicircular apse holding the sanctuary, with side CHAPELS budding off the
// aisles, an optional CLOISTER garth, belfry towers at the west front — and a
// CHAPTER HOUSE that is literally a structure generator inside a structure
// generator: the 'compound' BSP composer runs as a sub-generation and its
// plan is pasted onto this one, sharing a wall, joined by one punched door.
// Every proportion is rolled (or pinned via genParams), so no two Sees mint
// alike; the char vocabulary is the def's own legend (see data/structures.ts
// grand_cathedral) — this emitter stays furniture-blind data like every
// other generator. South (the last rows) is the WEST FRONT by convention:
// the great doors face the approach the recipe lays.
//
//   vesselHalf     nave central-vessel half-width   [3, 4]
//   aisle          flanking aisle width             [2, 3]
//   naveLen        nave length in cells             [11, 16]
//   narthex        entrance-hall depth              [2, 3]
//   transeptW/Ext  arm thickness / reach            [5, 6] / [3, 5]
//   choir          chancel depth                    [3, 4]
//   apse           apse cap depth                   [5, 7]
//   chapels        side chapels per free flank      [1, 3]
//   chapelDepth    chapel bulge                     [3, 4]
//   cloisterChance / cloisterSpan / chapterChance   0.6 / [6, 7] / 0.55
//   towerChance    west belfries                    0.65
//   ambulatoryChance  crystal-floor ring behind the sanctuary  0.75
//   windows / columnEvery / sideDoors               [3, 4] / [2, 3] / [1, 2]
registerStructureGen('cathedral', (rng, p) => {
  // Every die is cast up front — the paint below is pure arithmetic, so the
  // build order can never skew a later roll.
  const vh = roll(rng, p.vesselHalf, [3, 4]);
  const ah = roll(rng, p.aisle, [2, 3]);
  const naveLen = roll(rng, p.naveLen, [11, 16]);
  const narthexH = roll(rng, p.narthex, [2, 3]);
  const transW = roll(rng, p.transeptW, [5, 6]);
  const transExt = roll(rng, p.transeptExt, [3, 5]);
  const choirH = roll(rng, p.choir, [3, 4]);
  const apseD = roll(rng, p.apse, [5, 7]);
  const chD = roll(rng, p.chapelDepth, [3, 4]);
  const chapelN = roll(rng, p.chapels, [1, 3]);
  const cloister = rng.chance(typeof p.cloisterChance === 'number' ? p.cloisterChance : 0.6);
  const cloisterSide = rng.chance(0.5) ? -1 : 1;
  const cloisterW = Math.min(7, roll(rng, p.cloisterSpan, [6, 7]));
  const chapter = cloister && rng.chance(typeof p.chapterChance === 'number' ? p.chapterChance : 0.55);
  const chW = roll(rng, p.chapterW, [8, 10]);
  const chH = roll(rng, p.chapterH, [7, 9]);
  const towers = rng.chance(typeof p.towerChance === 'number' ? p.towerChance : 0.65);
  const ambulatory = rng.chance(typeof p.ambulatoryChance === 'number' ? p.ambulatoryChance : 0.75);
  const organSide = rng.chance(0.5) ? -1 : 1;
  const sideDoors = roll(rng, p.sideDoors, [1, 2]);
  const winStep = roll(rng, p.windows, [3, 4]);
  const colStep = roll(rng, p.columnEvery, [2, 3]);
  const furnish: string[] = [];
  for (let i = 0; i < 6; i++) furnish.push((['R', 'E', 'v', 'z'] as const)[rng.int(0, 3)]);

  const W2 = vh + ah + 1;            // interior half-span: vessel + column line + aisle
  const wallX = W2 + 1;              // outer nave wall offset from the centerline
  const TE = wallX + transExt;       // transept interior half-reach
  const extBase = Math.max(TE + 1, wallX + chD + 1, wallX + 3);
  const extCloi = cloister
    ? Math.max(extBase, wallX + cloisterW + 1 + (chapter ? chW - 1 : 0))
    : extBase;
  const extLeft = cloisterSide < 0 ? extCloi : extBase;
  const extRight = cloisterSide > 0 ? extCloi : extBase;
  const w = extLeft + extRight + 1;
  const h = 1 + apseD + choirH + transW + naveLen + narthexH + 1;
  const cx = extLeft;
  const g = new PlanGrid(w, h);

  // Row bands, accumulated from the south (west-front) edge upward.
  const yS = h - 1;                        // south wall + great doors
  const yNave1 = yS - narthexH - 1;        // southmost nave row (narthex above the wall)
  const yNave0 = yNave1 - naveLen + 1;
  const yTBot = yNave0 - 1;                // transept band
  const yTTop = yTBot - transW + 1;
  const yChoir1 = yTTop - 1;               // chancel band
  const yChoir0 = yChoir1 - choirH + 1;

  // THE BODY: one open vessel from chancel to narthex, walled either side,
  // sealed south with the GREAT WEST DOORS (3 cells — one grand breach).
  g.rect(cx - W2, yChoir0, cx + W2, yS - 1, '.');
  g.rect(cx - wallX, yChoir0, cx - wallX, yS, '#');
  g.rect(cx + wallX, yChoir0, cx + wallX, yS, '#');
  g.rect(cx - wallX, yS, cx + wallX, yS, '#');
  for (const dx of [-1, 0, 1]) g.set(cx + dx, yS, 'D');

  // Narthex furniture: the font of light on the threshold axis, votive banks
  // where the candles meet you before the nave does.
  g.set(cx, yS - 2, 'U');
  g.set(cx - vh, yS - 2, 'v');
  g.set(cx + vh, yS - 2, 'v');

  // NAVE: column lines pacing the vessel/aisle seam, pew rows filling the
  // southern half (the center aisle stays processionally clear), lancet
  // windows pacing the outer walls.
  for (let yy = yNave0; yy <= yNave1; yy++) {
    const k = yNave1 - yy;
    if (k % colStep === 0) { g.set(cx - vh - 1, yy, 'I'); g.set(cx + vh + 1, yy, 'I'); }
    if (yy > yNave0 + Math.floor(naveLen * 0.4) && k % 2 === 0 && k % 8 !== 0) {
      for (let dx = 1; dx <= vh - 1; dx++) { g.set(cx - dx, yy, 'w'); g.set(cx + dx, yy, 'w'); }
    }
    if (k % winStep === 1) {
      if (g.get(cx - wallX, yy) === '#') g.set(cx - wallX, yy, 'W');
      if (g.get(cx + wallX, yy) === '#') g.set(cx + wallX, yy, 'W');
    }
  }

  // TRANSEPT: the arms frame over the nave walls, then the vessel passage is
  // re-opened through the frame — the crossing is one continuous floor.
  g.ring(cx - TE - 1, yTTop - 1, cx + TE + 1, yTBot + 1, '#');
  g.rect(cx - TE, yTTop, cx + TE, yTBot, '.');
  g.rect(cx - W2, yTTop - 1, cx + W2, yTTop - 1, '.');
  g.rect(cx - W2, yTBot + 1, cx + W2, yTBot + 1, '.');
  const tMid = Math.floor((yTTop + yTBot) / 2);
  g.set(cx - TE - 1, tMid, sideDoors >= 1 ? 'd' : 'W');
  g.set(cx + TE + 1, tMid, sideDoors >= 2 ? 'd' : 'W');
  g.set(cx - TE - 1, tMid - 2, 'W'); g.set(cx - TE - 1, tMid + 2, 'W');
  g.set(cx + TE + 1, tMid - 2, 'W'); g.set(cx + TE + 1, tMid + 2, 'W');

  // CHOIR: stalls flank the chancel; the great organ stands against a rolled
  // aisle wall, two cells of it.
  for (let yy = yChoir0; yy <= yChoir1; yy++) {
    if ((yChoir1 - yy) % 2 === 0) { g.set(cx - vh, yy, 'q'); g.set(cx + vh, yy, 'q'); }
  }
  g.set(cx + organSide * (W2 - 1), yChoir0, 'O');
  g.set(cx + organSide * (W2 - 1), yChoir0 + 1, 'O');

  // APSE: an elliptical cap rasterized disc-then-ring (gap-proof at every
  // proportion), holding the sanctuary. The AMBULATORY — the crystal-floor
  // ring behind the altar — is unroofed GLASS: open to heaven above, the
  // cloudsea below your feet (region 'glass_floor' via the 'g' legend char).
  const ery = apseD + 0.4, erx = W2 + 0.6;
  const acy = yChoir0 - 0.5;
  for (let yy = Math.max(0, yChoir0 - apseD - 2); yy < yChoir0; yy++) {
    for (let xx = cx - wallX - 1; xx <= cx + wallX + 1; xx++) {
      const nx = (xx - cx) / erx, ny = (yy - acy) / ery;
      const r2 = nx * nx + ny * ny;
      if (r2 <= 1) {
        const rr = Math.sqrt(r2);
        g.set(xx, yy, ambulatory && rr >= 0.66 && rr <= 0.97 ? 'g' : '.');
      } else if (r2 <= 1.6) {
        g.set(xx, yy, '#');
      }
    }
  }
  // The sanctuary: the high altar at the chancel step, the EMPTY THRONE at
  // the apse focus — the truest seat, kept vacant — flanked by braziers.
  g.set(cx, yChoir0 - 1, 'A');
  const yThrone = yChoir0 - apseD + 2;
  g.set(cx, yThrone, 'Q');
  g.set(cx - 2, yThrone, 'z');
  g.set(cx + 2, yThrone, 'z');

  // SIDE CHAPELS bud off the free flank(s) — each a walled cell with its own
  // door and a rolled devotion (reliquary / effigy / votives / brazier). The
  // cloister's flank keeps its wall for the garth instead.
  const chapelSides = cloister ? [-cloisterSide] : [-1, 1];
  let fi = 0;
  for (const s of chapelSides) {
    // Pitch 5 = a 4-row chapel + the shared ring row: neighbours share ONE
    // wall row instead of carving into each other (an overlapping ring would
    // slice a finished chapel's interior and orphan the far half).
    const nMax = Math.max(0, Math.floor((naveLen - 2) / 5));
    for (let i = 0; i < Math.min(chapelN, nMax); i++) {
      const r0 = yNave0 + 1 + i * 5;
      const r1 = r0 + 3;
      if (r1 + 1 >= yNave1) continue;
      const outerX = cx + s * wallX;
      const farX = cx + s * (wallX + chD + 1);
      g.ring(Math.min(outerX, farX), r0 - 1, Math.max(outerX, farX), r1 + 1, '#');
      g.rect(Math.min(outerX, farX) + 1, r0, Math.max(outerX, farX) - 1, r1, '.');
      const mid = Math.floor((r0 + r1) / 2);
      g.set(outerX, mid, 'd');
      g.set(farX, mid, 'W');
      g.set(cx + s * (wallX + 1 + Math.ceil(chD / 2)), mid, furnish[fi++ % furnish.length]);
    }
  }

  // CLOISTER: a garth off the southern nave — ring walk around open ground,
  // arcade pillars at the corners, one door from the aisle.
  if (cloister) {
    const s = cloisterSide;
    const rC1 = yNave1 - 1;
    const rC0 = Math.max(yNave0 + 1, rC1 - cloisterW + 1);
    const outerX = cx + s * wallX;
    const farX = cx + s * (wallX + cloisterW + 1);
    g.ring(Math.min(outerX, farX), rC0 - 1, Math.max(outerX, farX), rC1 + 1, '#');
    g.rect(Math.min(outerX, farX) + 1, rC0, Math.max(outerX, farX) - 1, rC1, '.');
    const gx0 = Math.min(outerX, farX) + 3, gx1 = Math.max(outerX, farX) - 3;
    const gy0 = rC0 + 2, gy1 = rC1 - 2;
    if (gx1 >= gx0 && gy1 >= gy0) {
      g.rect(gx0, gy0, gx1, gy1, '_');
      g.set(gx0, gy0, 'I'); g.set(gx1, gy0, 'I');
      g.set(gx0, gy1, 'I'); g.set(gx1, gy1, 'I');
    }
    g.set(outerX, Math.floor((rC0 + rC1) / 2), 'd');

    // THE CHAPTER HOUSE — the nested generation: the compound composer rolls
    // a whole sub-building, pasted flush so its wall IS the cloister's far
    // wall, joined by one punched door. Recursion as data, not new grammar.
    if (chapter) {
      const sub = runStructureGen('compound', rng, {
        w: chW, h: chH, gates: 0, doorChar: 'd',
        courtyardChance: 0.1, windows: 4, towers: false,
        clutterPer100: [1, 3], loops: [1, 2],
      });
      if (sub) {
        const px = s > 0 ? farX : farX - chW + 1;
        const py = Math.max(1, Math.floor((rC0 + rC1) / 2) - Math.floor(chH / 2));
        for (let sy = 0; sy < sub.length; sy++) {
          for (let sx = 0; sx < sub[sy].length; sx++) {
            const c = sub[sy][sx];
            if (c !== ' ') g.set(px + sx, py + sy, c);
          }
        }
        // Punch the joining door where BOTH flanks are open floor — the
        // compound's own BSP may have run a partition against the shared
        // wall exactly at mid-height, and a door into a wall cell would
        // orphan the whole chapter house. Scan out from the middle.
        const midRow = py + Math.floor(chH / 2);
        for (let off = 0; off < chH; off++) {
          const cand = midRow + (off % 2 === 0 ? off / 2 : -Math.ceil(off / 2));
          if (cand <= Math.max(rC0 - 1, py) || cand >= Math.min(rC1 + 1, py + chH - 1)) continue;
          const inner = g.get(farX - s, cand);   // cloister-corridor side
          const outer = g.get(farX + s, cand);   // chapter-interior side
          if ((inner === '.' || inner === '_') && (outer === '.' || outer === '_')) {
            g.set(farX, cand, 'd');
            break;
          }
        }
      }
    }
  }

  // WEST BELFRIES: parapet towers seizing the front corners, a garrison
  // perch in each — the skyline the approach reads first.
  if (towers) {
    for (const s of [-1, 1]) {
      const x0 = cx + s * wallX, x1 = cx + s * (wallX + 2);
      g.rect(Math.min(x0, x1), yS - 2, Math.max(x0, x1), yS, 'P');
      g.set(cx + s * (wallX + 1), yS - 1, 'T');
    }
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
