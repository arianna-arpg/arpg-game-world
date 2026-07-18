// ---------------------------------------------------------------------------
// THE LITE TIER — hundreds of bodies for the price of none.
//
// A DOTS-style packed pool (struct-of-arrays) for bodies whose whole
// existence is "be a crowd": the wading fodder the hero obliterates, the
// gathered gnat veil trailing its keeper. A lite body is a typed-array ROW —
// position, velocity, kind, plies, phase, owner, team — with no Actor, no
// StatSheet, no statuses, no brain, no skills. It steers by pure math (the
// flight fabric's weave + integer-hash noise — the pool never draws global
// rand, so seeded runs are byte-identical), hurts by POOLED CONTACT (one
// aggregated, mitigated, ply-gated hit per victim per beat), and dies by
// integer (the ply fabric IS its whole defense: one carve, one tear).
//
// THE TIER LAW: a body lives in exactly one tier. PROMOTION crosses into a
// full Actor at the interaction boundaries — the latch (cling kinds reaching
// a victim), the grab (grabSeize over the pool), the conducted order
// (minionCast delegation) — and lite-TIER throng rosters DEMOTE back when a
// promoted body goes quiet. Kind, owner and PLIES SPENT survive the round
// trip; everything richer is deliberately surrendered (a body only demotes
// bare). Everything is data:
//   - MonsterDef.lite?: LiteSpec       — the per-kind opt-in (contact band,
//                                        steering texture; the rest reads
//                                        off the def itself).
//   - ThrongSpec.tier?: 'lite'         — the roster lives in the pool.
//   - ZoneTheme.lite?: ZoneLiteSpec    — ambient pours on a salted stream.
//   - LITE_CFG                         — modular thresholds, never inline.
//
// PURE-LEAF DISCIPLINE (the throng/fog pattern): this module owns the pool
// structure, the config and the pure math; the runtime (boot, steering
// sweep, the pooled bite, carve credit, promotion/demotion) lives in
// world.ts's marked LITE block, and the batch blit in the renderer. Docs:
// docs/engine/lite.md. Probe: balance/probe_lite.ts.
// ---------------------------------------------------------------------------

import type { ActorShape } from './actor';
import type { DamageType } from './stats';
import type { PlySpec } from './plies';

// --- The per-kind opt-in (MonsterDef.lite) ----------------------------------

/** What a full def doesn't already say about its pooled form. Radius, speed,
 *  plies, cling, flier, xp, and the whole render look read off the def. */
export interface LiteSpec {
  /** The pooled bite: per-beat contact vs an opposing actor's rim, scaled by
   *  pressing-body count (capped). Omit for harmless ambience — a cloud that
   *  only exists to be waded through. */
  contact?: {
    damage: number;
    type?: DamageType;
    /** Seconds between bites per victim (default LITE_CFG.contact.beat). */
    beat?: number;
    /** Bodies past this count add nothing to one bite (default
     *  LITE_CFG.contact.countCap) — a cloud, not a stack of knives. */
    countCap?: number;
  };
  /** Steering texture multipliers over LITE_CFG.steer (1 = default). */
  weave?: number;
  erratic?: number;
  separation?: number;
  /** Enemy bodies notice a hostile seat inside this range (default
   *  LITE_CFG.aggro); owned bodies ignore it (the keeper is the goal). */
  aggro?: number;
  /** Pool move speed override (default: the def's base.moveSpeed). */
  speed?: number;
}

// --- Ambient pours (ZoneTheme.lite) -----------------------------------------

/** One pour row: `pockets` clusters of `size` bodies each, seated on the
 *  leftover-POI stream (the scenery/puzzle/throng boot discipline). */
export interface LiteSwarmRow {
  monsterId: string;
  pockets: [number, number];
  size: [number, number];
  /** Whether this zone pours at all (default 1). */
  chance?: number;
  /** Arrival line on the first pour (the wildlife announce idiom). */
  announce?: string;
  announceColor?: string;
}

export interface ZoneLiteSpec { swarms: LiteSwarmRow[] }

// --- Config -----------------------------------------------------------------

/** THE LITE TIER's modular thresholds — tune HERE, never inline. */
export const LITE_CFG = {
  /** Pool capacity (rows). Spawns past it refuse gracefully — never
   *  overwrite. Hundreds with headroom; the arrays are ~50 KB total. */
  capacity: 1536,
  /** Spatial bucket cell size (world units). */
  grid: 48,
  /** Pour-stream salt (distinct from puzzles 0x9c7a11, scenery 0x0f17c5,
   *  throng 0x7a51c3 — the boot lanes never move each other's rolls). */
  salt: 0x11f37e,
  /** Pocket seating: reach off the leftover-POI stream, portal clearance,
   *  scatter radius around a pocket heart (the throng pocket idiom). */
  pour: { reach: 680, portalClear: 220, scatter: 46 },
  /** Steering: velocity chase rate, separation push (px/s at full overlap),
   *  weave figure-eight (rad/s + px amplitude), hash-noise heading wobble
   *  (radians) and its re-roll rate (Hz), per-body speed jitter (±frac). */
  steer: {
    accel: 6,
    sep: 90,
    sepIters: 5,
    weave: 1.7,
    weaveAmp: 22,
    erratic: 0.55,
    wobbleHz: 3,
    speedJitter: 0.18,
  },
  /** The keeper ring an owned, orderless body drifts on (the throng
   *  heel-ring look: id-hashed seat, slow orbit, breathing spread). */
  ring: { dist: 54, spread: 42, spin: 0.24 },
  /** Default notice range for enemy bodies (a seat inside it becomes the
   *  goal; outside it they drift home). */
  aggro: 260,
  /** Home-drift leash: ambient bodies wander this far off their pocket
   *  heart before the drift goal pulls them back. */
  homeLeash: 130,
  /** The pooled bite: default beat per victim, default count cap, reach pad
   *  beyond touching rims, and the per-victim stagger fraction (victims
   *  bite on offset clocks so a crowd never spikes one frame). */
  contact: { beat: 0.55, countCap: 12, pad: 3, stagger: 0.37 },
  /** Promotion budgets: latch promotions per sweep (per whole pool) and the
   *  demote sweep cadence for lite-tier throng bodies gone quiet. */
  promote: { latchPerSweep: 3 },
  demote: { every: 0.5 },
  /** Obliteration feedback: flashes per carve event before the one big ring
   *  takes over, and the '×N' text threshold. */
  fx: { flashes: 5, countTextAt: 3 },
  /** Wire quantization (px) for the co-op `lt` draw list. */
  wire: { round: 1 },
} as const;

// --- Resolved kinds ---------------------------------------------------------

/** The structural slice of MonsterDef the resolver reads (engine leaf — the
 *  data module imports LiteSpec from here, never the reverse). */
export interface LiteHostDef {
  id: string;
  radius: number;
  color: string;
  shape: ActorShape;
  material?: string;
  look?: string;
  base: Record<string, number>;
  xp: number;
  flier?: boolean;
  plies?: PlySpec;
  cling?: unknown;
  lite?: LiteSpec;
}

/** Per-kind scalars resolved ONCE per zone (kindIdx indexes these rows).
 *  Everything a pool body's update/draw/bite needs, flat. */
export interface LiteKind {
  defId: string;
  radius: number;
  speed: number;
  /** Plies a fresh body of this kind carries at the zone's level (min 1 —
   *  a lite body IS its ply count). */
  plies0: number;
  /** Per-body xp at the zone's level (the createMonster formula, stamped by
   *  the world — aggregated and flushed per sweep on credited deaths). */
  xpValue: number;
  aggro: number;
  /** The kind latches (MonsterDef.cling) — reaching a victim's rim is a
   *  PROMOTION boundary (the real cling sweep seats the promoted body). */
  clings: boolean;
  flier: boolean;
  contactDamage: number;
  contactType: DamageType;
  contactBeat: number;
  countCap: number;
  weave: number;
  erratic: number;
  separation: number;
  color: string;
  shape: ActorShape;
  material?: string;
  look?: string;
}

/** Resolve a def's pooled form at `level`. Returns null when the kind never
 *  opted in (MonsterDef.lite is the one gate). `xpScale` is the world's
 *  XP_SCALE — the pool pays the same bounty formula createMonster stamps. */
export function resolveLiteKind(
  def: LiteHostDef, level: number, xpScale: number,
): LiteKind | null {
  const spec = def.lite;
  if (!spec) return null;
  const plies = def.plies
    ? Math.max(1, def.plies.count + Math.floor((def.plies.perLevel ?? 0) * Math.max(0, level - 1)))
    : 1;
  return {
    defId: def.id,
    radius: def.radius,
    speed: spec.speed ?? def.base.moveSpeed ?? 100,
    plies0: Math.min(255, plies),
    xpValue: Math.round(def.xp * xpScale * (1 + 0.15 * level)),
    aggro: spec.aggro ?? LITE_CFG.aggro,
    clings: !!def.cling,
    flier: !!def.flier,
    contactDamage: spec.contact?.damage ?? 0,
    contactType: spec.contact?.type ?? 'physical',
    contactBeat: spec.contact?.beat ?? LITE_CFG.contact.beat,
    countCap: spec.contact?.countCap ?? LITE_CFG.contact.countCap,
    weave: spec.weave ?? 1,
    erratic: spec.erratic ?? 1,
    separation: spec.separation ?? 1,
    color: def.color,
    shape: def.shape,
    material: def.material,
    look: def.look,
  };
}

// --- Pure math --------------------------------------------------------------

/** Deterministic noise in [-1, 1] from a row index and an integer tick —
 *  the pool's whole randomness (no global-rand draws, ever: two seeded runs
 *  produce byte-identical arrays by construction). */
export function liteNoise(i: number, tick: number): number {
  let h = Math.imul(i + 0x9e3779b9, 0x85ebca6b) ^ Math.imul(tick + 0x165667b1, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 15), 0x27d4eb2f);
  h ^= h >>> 13;
  return ((h >>> 0) / 0xffffffff) * 2 - 1;
}

/** Stable per-row hash for seats/phases (spawn-time salt mixes reuse: the
 *  same row index reborn gets a fresh seat). */
export function liteSeatHash(i: number, salt: number): number {
  let h = Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(salt, 0x85ebca77);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return (h ^ (h >>> 16)) >>> 0;
}

/** The keeper ring: an id-hashed seat angle on a slow orbit at a hashed
 *  spread — the throng heel-ring look for bodies that wear no brain. */
export function liteRingOffset(
  seatHash: number, time: number, out: { x: number; y: number },
): void {
  const ang = ((seatHash & 0xffff) / 0xffff) * Math.PI * 2 + time * LITE_CFG.ring.spin;
  const ring = LITE_CFG.ring.dist + ((seatHash >>> 16) / 0xffff) * LITE_CFG.ring.spread;
  out.x = Math.cos(ang) * ring;
  out.y = Math.sin(ang) * ring;
}

// --- The pool ---------------------------------------------------------------

/** Distance² from point to segment (carve sweeps). */
function segDistSq(px: number, py: number, x0: number, y0: number, x1: number, y1: number): number {
  const dx = x1 - x0, dy = y1 - y0;
  const len = dx * dx + dy * dy;
  let t = len > 0 ? ((px - x0) * dx + (py - y0) * dy) / len : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const ex = px - (x0 + dx * t), ey = py - (y0 + dy * t);
  return ex * ex + ey * ey;
}

/** THE PACKED POOL — struct-of-arrays, zone-local, fixed capacity. The world
 *  executor loops the raw arrays directly (the DOTS discipline: no per-body
 *  objects, no per-body closures on the hot path). Rows recycle through a
 *  free list; `used` is the high-water mark iteration sweeps to. */
export class LitePool {
  readonly cap: number;
  /** Parallel columns (public on purpose — the executor and renderer read
   *  them raw; everything else goes through the methods). */
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly vx: Float32Array;
  readonly vy: Float32Array;
  /** Spawn-seeded phase (weave age offset + the draw bob). */
  readonly phase: Float32Array;
  /** Home anchor (pour-pocket heart; owner ring center for owned rows). */
  readonly hx: Float32Array;
  readonly hy: Float32Array;
  readonly kind: Uint16Array;
  readonly plies: Uint8Array;
  /** 0 = enemy, 1 = player (the Team axis, packed). */
  readonly team: Uint8Array;
  /** Owning actor id (0 = unowned ambience). */
  readonly owner: Int32Array;
  /** Per-row seat hash (ring seat + noise lane; re-salted per rebirth). */
  readonly seat: Uint32Array;
  readonly alive: Uint8Array;

  used = 0;
  liveCount = 0;
  private readonly freeList: Int32Array;
  private freeTop = 0;
  private spawnSalt = 0;

  // Uniform-grid buckets (rebuilt per sweep; counting-sort style chains).
  private cols = 0;
  private rows = 0;
  private heads: Int32Array = new Int32Array(0);
  private readonly nexts: Int32Array;

  constructor(cap: number = LITE_CFG.capacity) {
    this.cap = cap;
    this.x = new Float32Array(cap);
    this.y = new Float32Array(cap);
    this.vx = new Float32Array(cap);
    this.vy = new Float32Array(cap);
    this.phase = new Float32Array(cap);
    this.hx = new Float32Array(cap);
    this.hy = new Float32Array(cap);
    this.kind = new Uint16Array(cap);
    this.plies = new Uint8Array(cap);
    this.team = new Uint8Array(cap);
    this.owner = new Int32Array(cap);
    this.seat = new Uint32Array(cap);
    this.alive = new Uint8Array(cap);
    this.freeList = new Int32Array(cap);
    this.nexts = new Int32Array(cap);
  }

  /** Zone boot: size the buckets to the arena and drop every row. Bucket
   *  dims clamp at 512² so a boundless zone (the Descent) never allocates a
   *  monster grid — far-edge cells just share the rim chains. */
  reset(w: number, h: number): void {
    this.cols = Math.min(512, Math.max(1, Math.ceil(w / LITE_CFG.grid)));
    this.rows = Math.min(512, Math.max(1, Math.ceil(h / LITE_CFG.grid)));
    if (this.heads.length < this.cols * this.rows) {
      this.heads = new Int32Array(this.cols * this.rows);
    }
    this.alive.fill(0);
    this.used = 0;
    this.liveCount = 0;
    this.freeTop = 0;
  }

  /** Mint one row. Returns the row index, or -1 at capacity (spawns refuse
   *  gracefully — never overwrite a live body). */
  spawn(kindIdx: number, x: number, y: number, team: 0 | 1, owner: number, plies: number): number {
    let i: number;
    if (this.freeTop > 0) i = this.freeList[--this.freeTop];
    else if (this.used < this.cap) i = this.used++;
    else return -1;
    this.spawnSalt = (this.spawnSalt + 0x632be5ab) >>> 0;
    this.x[i] = x; this.y[i] = y;
    this.vx[i] = 0; this.vy[i] = 0;
    this.hx[i] = x; this.hy[i] = y;
    this.kind[i] = kindIdx;
    this.plies[i] = Math.max(1, Math.min(255, plies));
    this.team[i] = team;
    this.owner[i] = owner;
    this.seat[i] = liteSeatHash(i, this.spawnSalt);
    this.phase[i] = ((this.seat[i] & 0xfff) / 0xfff) * Math.PI * 2;
    this.alive[i] = 1;
    this.liveCount++;
    return i;
  }

  /** Drop a row (death, promotion, disband). FX and credit are the world's
   *  business — the pool only recycles. */
  free(i: number): void {
    if (!this.alive[i]) return;
    this.alive[i] = 0;
    this.liveCount--;
    this.freeList[this.freeTop++] = i;
  }

  /** Rebuild the bucket chains (O(n), once per sweep before queries). */
  rebuildBuckets(): void {
    this.heads.fill(-1, 0, this.cols * this.rows);
    const g = LITE_CFG.grid;
    for (let i = 0; i < this.used; i++) {
      if (!this.alive[i]) continue;
      let cx = (this.x[i] / g) | 0, cy = (this.y[i] / g) | 0;
      if (cx < 0) cx = 0; else if (cx >= this.cols) cx = this.cols - 1;
      if (cy < 0) cy = 0; else if (cy >= this.rows) cy = this.rows - 1;
      const c = cy * this.cols + cx;
      this.nexts[i] = this.heads[c];
      this.heads[c] = i;
    }
  }

  /** Visit live rows whose CENTER lies within `r + pad` of (cx, cy) — the
   *  coarse pass; callers refine with per-kind radii. Buckets must be fresh.
   *  The callback may free rows (chains tolerate it within the sweep). */
  forEachIn(cx: number, cy: number, r: number, pad: number, cb: (i: number) => void): void {
    const g = LITE_CFG.grid;
    const reach = r + pad;
    let x0 = ((cx - reach) / g) | 0, x1 = ((cx + reach) / g) | 0;
    let y0 = ((cy - reach) / g) | 0, y1 = ((cy + reach) / g) | 0;
    if (x0 < 0) x0 = 0; if (y0 < 0) y0 = 0;
    if (x1 >= this.cols) x1 = this.cols - 1;
    if (y1 >= this.rows) y1 = this.rows - 1;
    const rr = reach * reach;
    for (let by = y0; by <= y1; by++) {
      for (let bx = x0; bx <= x1; bx++) {
        for (let i = this.heads[by * this.cols + bx]; i >= 0; i = this.nexts[i]) {
          if (!this.alive[i]) continue;
          const dx = this.x[i] - cx, dy = this.y[i] - cy;
          if (dx * dx + dy * dy <= rr) cb(i);
        }
      }
    }
  }

  /** Visit live rows within `pad` of the segment (projectile sweeps),
   *  ordered by distance along it (the pierce budget spends front-first). */
  forEachAlong(
    x0: number, y0: number, x1: number, y1: number, pad: number,
    cb: (i: number) => boolean | void,
  ): void {
    const g = LITE_CFG.grid;
    let bx0 = ((Math.min(x0, x1) - pad) / g) | 0, bx1 = ((Math.max(x0, x1) + pad) / g) | 0;
    let by0 = ((Math.min(y0, y1) - pad) / g) | 0, by1 = ((Math.max(y0, y1) + pad) / g) | 0;
    if (bx0 < 0) bx0 = 0; if (by0 < 0) by0 = 0;
    if (bx1 >= this.cols) bx1 = this.cols - 1;
    if (by1 >= this.rows) by1 = this.rows - 1;
    const dx = x1 - x0, dy = y1 - y0;
    const len = dx * dx + dy * dy;
    const hits: number[] = this.scratchHits;
    hits.length = 0;
    const pp = pad * pad;
    for (let by = by0; by <= by1; by++) {
      for (let bx = bx0; bx <= bx1; bx++) {
        for (let i = this.heads[by * this.cols + bx]; i >= 0; i = this.nexts[i]) {
          if (!this.alive[i]) continue;
          if (segDistSq(this.x[i], this.y[i], x0, y0, x1, y1) <= pp) hits.push(i);
        }
      }
    }
    if (hits.length > 1 && len > 0) {
      hits.sort((a, b) =>
        ((this.x[a] - x0) * dx + (this.y[a] - y0) * dy)
        - ((this.x[b] - x0) * dx + (this.y[b] - y0) * dy));
    }
    for (const i of hits) { if (cb(i) === true) break; }
  }
  private readonly scratchHits: number[] = [];

  /** Fold a capped separation push for row `i` from its own bucket cell
   *  into `out` (unit-ish vector; caller scales). Own-cell only, at most
   *  `cap` neighbors — dense pockets degrade gracefully instead of going
   *  quadratic. Buckets must be fresh. */
  sepFold(i: number, reach: number, cap: number, out: { x: number; y: number }): void {
    out.x = 0; out.y = 0;
    const g = LITE_CFG.grid;
    let cx = (this.x[i] / g) | 0, cy = (this.y[i] / g) | 0;
    if (cx < 0) cx = 0; else if (cx >= this.cols) cx = this.cols - 1;
    if (cy < 0) cy = 0; else if (cy >= this.rows) cy = this.rows - 1;
    let seen = 0;
    const rr = reach * reach;
    for (let j = this.heads[cy * this.cols + cx]; j >= 0 && seen < cap; j = this.nexts[j]) {
      if (j === i || !this.alive[j]) continue;
      const dx = this.x[i] - this.x[j], dy = this.y[i] - this.y[j];
      const dd = dx * dx + dy * dy;
      if (dd >= rr || dd === 0) continue;
      seen++;
      const d = Math.sqrt(dd);
      const push = (1 - d / reach) / d;
      out.x += dx * push;
      out.y += dy * push;
    }
  }

  /** Live rows for an owner (optionally one kind) — the throng cap census. */
  countOwned(owner: number, kindIdx?: number): number {
    let n = 0;
    for (let i = 0; i < this.used; i++) {
      if (!this.alive[i] || this.owner[i] !== owner) continue;
      if (kindIdx !== undefined && this.kind[i] !== kindIdx) continue;
      n++;
    }
    return n;
  }
}
