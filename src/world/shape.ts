// ---------------------------------------------------------------------------
// ZONE GEOMETRY — the one home for arena-boundary math.
//
// A zone's playable area is either a RECT (the original) or an inscribed
// ELLIPSE within its w×h box. Every actor/feature placement in the engine
// funnels through clampPos -> clampToBounds, and every random spawn point
// through samplePoint, so making THESE shape-aware makes the whole arena
// shape-aware from one place. Pure — no engine import, trivially testable.
//
// THE COMPOSITE BOUND (the Secrets Charter's Movement I): a zone's bound is a
// UNION of shape pieces — the BASE piece (Bounds' own w/h/shape box at the
// origin, exactly the classic arena) plus zero or more ANNEX pieces
// (BoundsPiece rows: a rect or inscribed-ellipse box at an offset in the
// base's coordinate space). Membership is the union of the base and every
// ACTIVE annex; a DORMANT piece (active false) exists but does not admit —
// sealed ground stays outside the union until a reveal flips it (Movement
// II's fake-wall grammar; World.annexReveal is the runtime seam). A zone with
// no pieces walks the classic single-shape code paths UNCHANGED — one-piece
// zones are byte-identical by construction, and every consumer that reads
// bare w/h/shape keeps reading the BASE piece (centers, scatter envelopes and
// generation stay the base country's; only the wired authorities see the
// union). The enclosing box of the ACTIVE union is hullOf (origin-pinned:
// annexes may protrude east/south and grow the hull; the membership math
// accepts any offsets, but grid-anchored consumers assume the origin — a
// west/north-protruding annex needs an origin-shift seam that is
// deliberately not built until a design asks).
// ---------------------------------------------------------------------------

import { clamp, type Vec2 } from '../core/math';

export type ZoneShape = 'rect' | 'ellipse';

/** One ANNEX piece of a composite arena: a rect or inscribed-ellipse box at
 *  an offset in the base piece's coordinate space. `active` is the union
 *  gate — dormant pieces are invisible to every membership/clamp read.
 *  `seed` is the FOREORDAINED slot: when Movement II mints annex layouts,
 *  the annex's interior exists whole from this seed (the caveSeeds-zip
 *  precedent) — the kernel carries it, nothing reads it yet. */
export interface BoundsPiece {
  id: string;
  x: number; y: number;
  w: number; h: number;
  /** Piece silhouette within its box; omitted = 'rect'. */
  shape?: ZoneShape;
  /** In the union (revealed)? Dormant pieces exist but do not admit. */
  active?: boolean;
  /** The annex layout's own seed slot (Movement II mints from it). */
  seed?: number;
  /** Registered annex kind (data/annexes.ts — Movement II's grammar rider:
   *  face + furnish resolve through it; pure geometry reads never touch it,
   *  so the kernel stays shape-only exactly as with `seed`). */
  kind?: string;
  /** Which way this piece attaches to its host (east or south — the
   *  origin-pinned quadrant): the mint records its own construction so the
   *  face stamp never has to re-derive it from lapped geometry. A grammar
   *  rider like `seed`/`kind` — no shape math reads it. */
  dir?: 'e' | 's';
}

export interface Bounds {
  w: number; h: number; shape: ZoneShape; boundless?: boolean;
  /** ANNEX pieces (the composite bound). Absent/empty = the classic
   *  single-shape arena — every path byte-identical by construction. */
  pieces?: BoundsPiece[];
}

/** The classic single-shape clamp over one piece's box — the exact math the
 *  base arena has always used, offset by the piece's corner. At x0=y0=0 the
 *  arithmetic is bit-identical to the original (0+v is exact in IEEE754),
 *  so the base piece's clamp cannot drift. */
function clampPiece(px: number, py: number, radius: number,
  x0: number, y0: number, w: number, h: number, shape: ZoneShape): Vec2 {
  if (shape !== 'ellipse') {
    return { x: clamp(px, x0 + radius, x0 + w - radius), y: clamp(py, y0 + radius, y0 + h - radius) };
  }
  const cx = x0 + w / 2, cy = y0 + h / 2;
  const rx = Math.max(8, w / 2 - radius), ry = Math.max(8, h / 2 - radius);
  const nx = (px - cx) / rx, ny = (py - cy) / ry;
  const k = nx * nx + ny * ny;
  if (k <= 1) return { x: px, y: py };
  const s = 1 / Math.sqrt(k);
  return { x: cx + (px - cx) * s, y: cy + (py - cy) * s };
}

/** Pull a point inside the arena, leaving a body-radius margin. The rect path
 *  is byte-for-byte the original clamp; the ellipse path projects onto the rim.
 *  A BOUNDLESS zone (the Descent) has NO outer wall — only doodad collision stops
 *  you — so the perimeter clamp is skipped entirely (the player streams forever).
 *  COMPOSITE bounds (annex pieces): a point inside the base OR any ACTIVE
 *  annex is admitted unmoved; anything else pulls to the NEAREST rim across
 *  the active union (each piece clamped by its own shape's law, least
 *  displacement wins — the base's answer breaks ties, so a piece can never
 *  steal a point the base already resolves at equal distance). Dormant
 *  pieces do not admit and do not attract. No pieces = the classic path. */
export function clampToBounds(p: Vec2, radius: number, b: Bounds): Vec2 {
  if (b.boundless) return { x: p.x, y: p.y };
  const base = clampPiece(p.x, p.y, radius, 0, 0, b.w, b.h, b.shape);
  const pcs = b.pieces;
  if (!pcs || pcs.length === 0) return base;           // ONE PIECE: the classic law
  if (base.x === p.x && base.y === p.y) return base;   // inside the base — admitted
  let best = base;
  let bestD = (base.x - p.x) * (base.x - p.x) + (base.y - p.y) * (base.y - p.y);
  for (const pc of pcs) {
    if (!pc.active) continue;                          // DORMANT DOES NOT ADMIT
    const c = clampPiece(p.x, p.y, radius, pc.x, pc.y, pc.w, pc.h, pc.shape ?? 'rect');
    if (c.x === p.x && c.y === p.y) return c;          // inside an open annex — admitted
    const d = (c.x - p.x) * (c.x - p.x) + (c.y - p.y) * (c.y - p.y);
    if (d < bestD) { best = c; bestD = d; }
  }
  return best;
}

/** True when the point (with its body-radius margin) lies inside the arena —
 *  i.e. clampToBounds would return it unmoved. THE SEAT TEST for anything a
 *  body must DWELL (sidezone doors, tier stairs): the rim is a MOVE-TIME
 *  confine, so a fixture seated beyond it draws on ground no body can ever
 *  stand on while its dwell point projects back inside — drawn != dwelled
 *  (the dead-door defect, task_e2243782). */
export function insideBounds(p: Vec2, radius: number, b: Bounds): boolean {
  const c = clampToBounds(p, radius, b);
  return c.x === p.x && c.y === p.y;
}

/** Normalize a shape-optional arena box (GenCtx.arena and kin) to Bounds.
 *  Pieces ride through when present, so a normalized composite keeps its
 *  annexes (generation callers pass bare boxes — base-piece by construction). */
export function boundsOf(a: { w: number; h: number; shape?: ZoneShape; boundless?: boolean; pieces?: BoundsPiece[] }): Bounds {
  return {
    w: a.w, h: a.h, shape: a.shape ?? 'rect',
    ...(a.boundless ? { boundless: true } : {}),
    ...(a.pieces?.length ? { pieces: a.pieces } : {}),
  };
}

/** The enclosing box of the ACTIVE union, origin-pinned: the base box grown
 *  east/south by any active annex that protrudes. Grid-anchored consumers
 *  (the nav rake, the ground-chunk window, the camera spans) size to THIS —
 *  at one piece it is exactly the base box, so nothing moves. Dormant pieces
 *  never grow the hull (a pre-grown hull would let the camera pan over a
 *  secret's void band — the tell the dormant law exists to prevent). */
export function hullOf(b: Bounds): { w: number; h: number } {
  let w = b.w, h = b.h;
  const pcs = b.pieces;
  if (pcs) {
    for (const pc of pcs) {
      if (!pc.active) continue;
      if (pc.x + pc.w > w) w = pc.x + pc.w;
      if (pc.y + pc.h > h) h = pc.y + pc.h;
    }
  }
  return { w, h };
}

/** The enclosing box of EVERY piece, dormant included — the GENERATION span.
 *  A carved zone's walk grid must already hold the cells a future reveal will
 *  carve (the grid never grows at runtime), so grid allocation sizes to THIS
 *  while every drawn/tested authority keeps reading the ACTIVE hull
 *  (hullOf) — a dormant annex costs invisible wall cells and nothing else.
 *  Zero pieces = the base box exactly (the classic law). Origin-pinned like
 *  hullOf: east/south growth only. */
export function gridSpanOf(b: { w: number; h: number; pieces?: readonly BoundsPiece[] }): { w: number; h: number } {
  let w = b.w, h = b.h;
  const pcs = b.pieces;
  if (pcs) {
    for (const pc of pcs) {
      if (pc.x + pc.w > w) w = pc.x + pc.w;
      if (pc.y + pc.h > h) h = pc.y + pc.h;
    }
  }
  return { w, h };
}

/** The union's playable AREA (the pack-budget read): the base piece's area
 *  plus each active annex's own — ellipses at the inscribed π/4, exactly the
 *  arithmetic the pack budget always used at one piece. Overlap-blind on
 *  purpose: an annex laps the base only at its seam, and a budget fed a
 *  seam's sliver twice errs small and smooth. */
export function unionArea(b: Bounds): number {
  const bbox = b.w * b.h;
  let area = b.shape === 'ellipse' ? bbox * (Math.PI / 4) : bbox;
  const pcs = b.pieces;
  if (pcs) {
    for (const pc of pcs) {
      if (!pc.active) continue;
      const a = pc.w * pc.h;
      area += (pc.shape ?? 'rect') === 'ellipse' ? a * (Math.PI / 4) : a;
    }
  }
  return area;
}

/** The ACTIVE pieces, or the shared empty list — render/cache consumers
 *  branch on length, so zero-annex zones allocate nothing per frame. */
const NO_PIECES: readonly BoundsPiece[] = [];
export function activePieces(b: Bounds): readonly BoundsPiece[] {
  const pcs = b.pieces;
  if (!pcs || pcs.length === 0) return NO_PIECES;
  let any = false;
  for (const pc of pcs) if (pc.active) { any = true; break; }
  return any ? pcs.filter(pc => pc.active) : NO_PIECES;
}

/** Cache-key fingerprint of the active union ('' when no pieces exist, so
 *  every standing key string is untouched on classic zones). */
export function activeAnnexKey(b: Bounds): string {
  const pcs = b.pieces;
  if (!pcs || pcs.length === 0) return '';
  let k = '';
  for (const pc of pcs) if (pc.active) k += (k ? ',' : '') + pc.id;
  return k;
}

/** A random point inside the arena, `inset` from the boundary. Ellipse uses a
 *  uniform-area polar sample so spawns aren't bunched at the centre. */
export function samplePoint(b: Bounds, inset: number, rand: (a: number, c: number) => number): Vec2 {
  if (b.shape !== 'ellipse') return { x: rand(inset, b.w - inset), y: rand(inset, b.h - inset) };
  const cx = b.w / 2, cy = b.h / 2, rx = b.w / 2 - inset, ry = b.h / 2 - inset;
  const t = rand(0, Math.PI * 2), r = Math.sqrt(rand(0, 1));
  return { x: cx + Math.cos(t) * rx * r, y: cy + Math.sin(t) * ry * r };
}

/** Pull a rect-edge portal position onto the ellipse rim so it's reachable. */
export function exitInside(p: Vec2, b: Bounds): Vec2 {
  return b.shape === 'ellipse' ? clampToBounds(p, 36, b) : p;
}
