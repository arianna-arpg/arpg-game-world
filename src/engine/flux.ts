// ---------------------------------------------------------------------------
// THE FLUX FABRIC — living, SHIFTING ground.
//
// The collapse fabric's ground dissolves once and is gone; flux ground COMES
// AND GOES. A zone whose theme carries a FluxSpec is built on cloud-stuff in
// motion: PADS (stepping-stone platforms) gather, stand, fray and disperse on
// seeded rhythms, and CARRIERS (drifting cloud rafts) shuttle along their
// lanes, bearing whoever stands on them — the old-platformer promise, walked:
// the environment moves with or without you, and reading its rhythm IS the
// navigation. Miss the rhythm and the sky lets you go (the collapse fall,
// shared verbatim — the Aetherial's proportional drop to the world below).
//
// EVERYTHING IS DERIVED FROM THE PAINTED GRID. A layout paints three region
// kinds — phasing pads (`cloud_flux`), carrier lanes (`cloud_lane`), and the
// fabric's own void between them (`flux_void`) — and the field discovers its
// pads (connected components), its lanes (component skeletons), and its
// carriers (spaced along each skeleton) with no further authoring. Any
// generator, stamp, formation or composition that can paint cells can build
// flux country; the spec on the theme only sets the TEMPO.
//
// THE LADDER GUARANTEE (the collapse guarantee's sibling): pads the
// entry→goal spine crosses get COORDINATED phase offsets — consecutive rungs
// alternate half a period apart — so a traveler who reads the rhythm always
// has a next step forming ahead; everything off the spine scatters freely.
// Carrier lanes are crossable by waiting (the raft always comes back), exits
// keep solid ground in a portalClear radius (a phased-out door is a
// soft-lock, not a challenge), and the whole drift stands solid for a warmup
// so a fresh arrival reads the zone before it starts to leave.
//
// Seed discipline (the fog contract): everything rolls on a dedicated Rng
// (zoneSeed ^ FLUX_CFG.salt) — never layout/spawn rng. State is TRANSIENT
// (worldstate movers doctrine) and, past the build, a PURE FUNCTION OF THE
// CLOCK: pad phases and carrier positions are computed from t, never
// integrated, so the drift cannot desync from itself.
//
// THE GRID IS THE TRUTH: all mutation goes through fillRegion, so pathing,
// clampPos, castRay and spawn reachability read live ground with no
// flux-specific seams. Writes are QUIET (no dirty-rect push): every kind the
// fabric writes is a `window` visual with no edge — bake-identical pixels —
// so the churn of a dozen drifting carriers never stales a floor chunk nor
// floods the dirty ring. The living cloud itself is drawn by the flux layer
// (render/vis/fluxLayer.ts) from this field's live state — forming, breathing,
// tattering exactly where the walkable truth is.
//
// CONJURED GROUND (the fabric's second half, ConjuredGround below): the seam
// that lets SKILLS call walkable cloud into being over any conjurable void —
// bridging a flux basin, a melted causeway, an authored sky-gap — honestly
// (it frays and lets go like everything else). It annexes cells from whichever
// fabric owns them and returns them on expiry; the World routes consequences.
//
// Pure leaf: structural slice types + leaf config only — no cycles
// (gridSpine is a fellow leaf).
// ---------------------------------------------------------------------------

import type { CollapseActorLike, CollapseFallSpec, CollapseRng } from './collapse';
import { gridBfs, gridSpine } from './gridSpine';
import { WALK_CFG } from '../world/gridWalk';

/** Pad phase states — what a pad IS this instant (renderer + fall logic). */
export const enum FluxPhase { Gone = 0, Forming = 1, Solid = 2, Fraying = 3 }

export type FluxRng = CollapseRng;
export type FluxActorLike = CollapseActorLike;
export type FluxFallSpec = CollapseFallSpec;

/** The walk-grid slice the field drives — the collapse slice plus the QUIET
 *  repaint flag (see header: flux kinds are bake-inert, so the fabric's
 *  steady churn stays out of the dirty ring by contract). */
export interface FluxWalk {
  readonly cols: number;
  readonly rows: number;
  readonly cell: number;
  isWalkable(x: number, y: number): boolean;
  regionAt(x: number, y: number): string;
  fillRegion(x0: number, y0: number, x1: number, y1: number, id: string, quiet?: boolean): void;
  /** LEDGE GRASP: any part of a body disc still over something that holds it
   *  (walkable ground or blocking mass — anything but open void). */
  supportedAt(x: number, y: number, r: number): boolean;
}

/** PAD RHYTHM: the gather→stand→fray→gone cycle every phasing pad walks. */
export interface FluxPhaseSpec {
  /** Seconds per full cycle. */
  period: number;
  /** Share of the period a pad stands walkable (0..1). */
  solidFrac: number;
  /** Seconds of the FORMING ramp closing the gone window (visual gathers;
   *  not yet walkable — stepping early is still a fall). */
  form: number;
  /** Seconds of the FRAYING warning ending the solid window (still walkable,
   *  visibly tattering — the get-off-now read). */
  fray: number;
  /** Off-spine pads scatter their phase across this share of the period
   *  (default FLUX_CFG.padScatter). Spine rungs ignore it (the ladder). */
  scatter?: number;
}

/** CARRIERS: the drifting rafts that shuttle each lane. */
export interface FluxCarrierSpec {
  /** Raft footprint radius roll (world units). */
  radius: [number, number];
  /** Cruise speed roll (units/sec). */
  speed: [number, number];
  /** Seconds a raft rests at each end of its run before turning back. */
  dwell?: number;
  /** One raft per this many units of lane length (min one per lane). */
  per?: number;
}

/** GUSTS: the zone-wide shoves that make even standing still a decision. */
export interface FluxGustSpec {
  /** Seconds between gusts [lo,hi]. */
  every: [number, number];
  /** Warning seconds before the shove (streaks build, the text fires). */
  warn: number;
  /** Seconds the shove lasts. */
  hold: number;
  /** Shove speed (units/sec) while it holds. */
  push: number;
  /** Do fliers get shoved too (default false — wings ride the wind)? */
  liftFliers?: boolean;
}

/** Render tinting for this zone's cloud-stuff (VIS_CFG.flux defaults). */
export interface FluxLookSpec {
  body?: string;
  crest?: string;
  fray?: string;
}

/** The whole mechanic as data, on a ZoneTheme (variants override wholesale). */
export interface FluxSpec {
  /** Region kind flux ground shows while GONE (default 'flux_void' — a
   *  window visual with NO edge; the flux layer draws the living rims). */
  region?: string;
  /** Walkable kind(s) whose painted components become phasing PADS. The
   *  default TRIO (cloud_flux + _b + _c) is the ALTERNATOR idiom: a
   *  generator interleaves A/B down a stepping-stone chain — touching pads
   *  stay SEPARATE platforms (components split per kind) while the chain
   *  stays CONTIGUOUS for the generation reachability invariant — and hangs
   *  satellites off it in C, which fuses with neither chain kind. */
  phases?: string | string[];
  /** Walkable kind whose painted bands become carrier LANES. */
  carries?: string;
  /** Kind protected cells solidify into at build (portal clears, slivers). */
  stable?: string;
  phase?: FluxPhaseSpec;
  carrier?: FluxCarrierSpec;
  gusts?: FluxGustSpec;
  /** What losing the floor MEANS — the collapse fall shape, shared. */
  fall?: FluxFallSpec;
  /** Seconds after entry the whole drift stands solid (default FLUX_CFG). */
  warmup?: number;
  /** The ladder anchor: a doodad KIND to run the spine to (else the exit
   *  farthest from entry — the World resolves and passes it). */
  goal?: { doodad?: string };
  /** Radius around every exit portal locked solid forever (default CFG). */
  portalClear?: number;
  look?: FluxLookSpec;
}

/** Framework constants — knobs shaping EVERY drift, never one zone's. */
export const FLUX_CFG = {
  /** Dedicated rng stream: zoneSeed ^ salt (never moves layout rng). */
  salt: 0xdf17c1,
  /** Default seconds the whole drift stands solid after entry. */
  warmup: 6,
  /** Default coyote seconds before a phased-out cell drops its occupant. */
  fallGrace: 0.4,
  /** Default never-phase radius around every exit portal. */
  portalClear: 95,
  /** Components smaller than this solidify (a two-cell blinker is noise). */
  minPadCells: 4,
  minLaneCells: 8,
  /** Rungs may sit this many cells off the exact spine walk and still join
   *  the ladder (the chain the path brushes, not just the cells it stands on). */
  rungHalo: 1,
  /** Rung phase jitter (share of period) so the ladder breathes, not ticks. */
  ladderJitterFrac: 0.06,
  /** Default off-spine phase scatter (share of period). */
  padScatter: 0.85,
  /** Default carrier spacing (units of lane per raft) and end dwell. */
  carrierPer: 420,
  carrierDwell: 1.4,
  /** Reach beyond a raft's radius that still counts as riding it. */
  rideMargin: 10,
} as const;

/** What one tick of drift did — the World routes the consequences. */
export interface FluxEvents {
  /** Prefiltered actors whose standing cell is gone (grace expired). */
  fell: FluxActorLike[];
  /** Actors riding a carrier this tick — move them by (dx,dy), confined. */
  rode: { a: FluxActorLike; dx: number; dy: number }[];
  /** One-shot: the warmup lapsed this tick — the drift begins. */
  driftBegun: boolean;
  /** One-shot: a gust's WARNING just started (direction already rolled). */
  gustBegan: { x: number; y: number } | null;
  /** Pad centers that dispersed this tick (soft puffs, capped by caller). */
  dispersed: { x: number; y: number }[];
}

interface FluxPad {
  cells: Int32Array;
  /** The pad's own painted kind (alternator pads rewrite as themselves). */
  kind: string;
  cx: number; cy: number;
  /** View-cull bound (center → farthest cell + a cell). */
  bound: number;
  /** Cycle offset (0..1). Rungs alternate 0 / 0.5 (+jitter); the rest scatter. */
  offset: number;
  rung: boolean;
  seed: number;
  /** Precomputed billow layout (render-only; deterministic). */
  lobes: { dx: number; dy: number; r: number; j: number }[];
  /** Cached written walkability (transition detection). */
  walkNow: boolean;
}

interface FluxCarrier {
  x: number; y: number;
  /** Heading unit vector (render lean + wake). */
  hx: number; hy: number;
  r: number;
  speed: number;
  /** Cycle offset (0..1) along the lane's shuttle period. */
  phase: number;
  seed: number;
  lobes: { dx: number; dy: number; r: number; j: number }[];
  occupied: Set<number>;
  /** Normalized progress speed |d(dist)/dt| / speed this tick (render wake). */
  speedFrac: number;
}

interface FluxLane {
  member: Set<number>;
  /** Skeleton polyline (cell centers, simplified) + cumulative lengths. */
  path: { x: number; y: number }[];
  cum: number[];
  len: number;
  laneIdx: number;
  carriers: FluxCarrier[];
}

/** One zone's live drift. Built at loadZone (buildZoneFlux), ticked beside
 *  collapse/fog, read by the flux render layer + AI/debug. */
export class FluxField {
  readonly spec: FluxSpec;
  readonly walk: FluxWalk;
  readonly pads: FluxPad[] = [];
  readonly lanes: FluxLane[] = [];
  /** 1 where flux GOVERNS the ground (pad/lane members): the teeter test and
   *  the walkResolve hold-still guard read this. */
  private readonly owned: Uint8Array;
  /** Cell → pad index (-1) / lane index (-1) — annex release recompute. */
  private readonly cellPad: Int32Array;
  private readonly cellLane: Int32Array;
  /** Cells held by conjured ground — every pad/carrier write skips them. */
  private readonly annexed = new Set<number>();
  private readonly rng: FluxRng;
  clock = 0;
  readonly warmup: number;
  private readonly fallGrace: number;
  /** LEDGE-GRASP fraction of an actor's radius (fall.grasp ?? WALK_CFG). */
  private readonly graspFrac: number;
  private readonly voidKind: string;
  private readonly padKinds: Set<string>;
  private readonly laneKind: string;
  private driftBegunFlag = false;
  private readonly teeter = new WeakMap<FluxActorLike, number>();
  /** Gust machine (rolled on the field's own stream, clock-driven). */
  private gustAt = Infinity;
  private gustDir = { x: 1, y: 0 };
  private gustUntil = 0;
  private gustHoldFrom = 0;

  constructor(spec: FluxSpec, walk: FluxWalk, rng: FluxRng,
    entry: { x: number; y: number }, goal: { x: number; y: number },
    holds: readonly { x: number; y: number }[] = []) {
    this.spec = spec;
    this.walk = walk;
    this.rng = rng;
    this.warmup = spec.warmup ?? FLUX_CFG.warmup;
    this.fallGrace = spec.fall?.grace ?? FLUX_CFG.fallGrace;
    this.graspFrac = spec.fall?.grasp ?? WALK_CFG.ledgeGrasp;
    this.voidKind = spec.region ?? 'flux_void';
    this.padKinds = new Set(Array.isArray(spec.phases) ? spec.phases
      : spec.phases ? [spec.phases] : ['cloud_flux', 'cloud_flux_b', 'cloud_flux_c']);
    this.laneKind = spec.carries ?? 'cloud_lane';
    const stable = spec.stable ?? 'ground';
    const n = walk.cols * walk.rows;
    this.owned = new Uint8Array(n);
    this.cellPad = new Int32Array(n).fill(-1);
    this.cellLane = new Int32Array(n).fill(-1);
    const cell = walk.cell;
    const cx = (i: number): number => (i % walk.cols + 0.5) * cell;
    const cy = (i: number): number => ((i / walk.cols | 0) + 0.5) * cell;

    // --- The lay of the land: which cells the fabric may govern. -----------
    // Portal clears (every hold + the goal landing) SOLIDIFY: honest, visible,
    // baked ground — never an invisible always-on cloud.
    const portalClear = spec.portalClear ?? FLUX_CFG.portalClear;
    const kindAt = (i: number): string => walk.regionAt(cx(i), cy(i));
    const isPad = (i: number): boolean => this.padKinds.has(kindAt(i));
    const isLane = (i: number): boolean => kindAt(i) === this.laneKind;
    const clearPts = [...holds, goal];
    const protectedAt = (i: number): boolean =>
      clearPts.some(p => Math.hypot(cx(i) - p.x, cy(i) - p.y) <= portalClear);
    const solidify: number[] = [];
    for (let i = 0; i < n; i++) {
      if ((isPad(i) || isLane(i)) && protectedAt(i)) solidify.push(i);
    }
    const writeCell = (i: number, id: string, quiet = true): void => {
      const gx = i % walk.cols, gy = i / walk.cols | 0;
      walk.fillRegion(gx * cell + 1, gy * cell + 1, (gx + 1) * cell - 1, (gy + 1) * cell - 1, id, quiet);
    };
    // Build-time rewrites may dirty honestly (one-time, pre-first-bake).
    for (const i of solidify) writeCell(i, stable, false);

    // --- Discover PADS and LANES: connected components of the painted kinds.
    const seen = new Uint8Array(n);
    const flood = (start: number, match: (i: number) => boolean): number[] => {
      const out: number[] = [start];
      seen[start] = 1;
      for (let head = 0; head < out.length; head++) {
        const c = out[head], gx = c % walk.cols, gy = c / walk.cols | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = gx + dx, ny = gy + dy;
          if (nx < 0 || ny < 0 || nx >= walk.cols || ny >= walk.rows) continue;
          const nc = ny * walk.cols + nx;
          if (seen[nc] || !match(nc)) continue;
          seen[nc] = 1; out.push(nc);
        }
      }
      return out;
    };
    const padComps: number[][] = [];
    const laneComps: number[][] = [];
    for (let i = 0; i < n; i++) {
      if (seen[i]) continue;
      if (isPad(i)) {
        // PER-KIND flood — the whole alternator idiom: a component is cells
        // of ONE pad kind, so interleaved A-B chains split into separate
        // platforms exactly where the kinds change hands. (A union flood
        // here fused entire chains into 200-cell mega-pads: the live-QA
        // lesson this comment survives.)
        const k = kindAt(i);
        padComps.push(flood(i, j => kindAt(j) === k));
      } else if (isLane(i)) {
        laneComps.push(flood(i, isLane));
      }
    }
    // Slivers solidify: a two-cell blinker reads as noise, not rhythm.
    const keepPads: number[][] = [];
    for (const comp of padComps) {
      if (comp.length < FLUX_CFG.minPadCells || !spec.phase) {
        if (spec.phase) for (const i of comp) writeCell(i, stable, false);
        continue; // no phase spec = pads stand as painted (permanent cloud)
      }
      keepPads.push(comp);
    }
    const keepLanes: number[][] = [];
    for (const comp of laneComps) {
      if (comp.length < FLUX_CFG.minLaneCells || !spec.carrier) {
        if (spec.carrier) for (const i of comp) writeCell(i, stable, false);
        continue; // no carrier spec = lanes stand as painted (solid bands)
      }
      keepLanes.push(comp);
    }

    // --- THE LADDER: spine rungs get coordinated offsets. -------------------
    const { spine, dGoal } = gridSpine(walk, entry, goal);
    const dSpine = gridBfs(walk, Array.from(spine));
    const rungOf = (comp: number[]): { rung: boolean; rank: number } => {
      let rung = false, rank = Infinity;
      for (const i of comp) {
        if (dSpine[i] >= 0 && dSpine[i] <= FLUX_CFG.rungHalo) rung = true;
        if (dGoal[i] >= 0 && dGoal[i] < rank) rank = dGoal[i];
      }
      return { rung, rank };
    };
    const phase = spec.phase;
    const scatter = phase?.scatter ?? FLUX_CFG.padScatter;
    const pending: { comp: number[]; rung: boolean; rank: number }[] =
      keepPads.map(comp => ({ comp, ...rungOf(comp) }));
    // Entry-first rung order: farthest from the goal alternates first.
    const rungs = pending.filter(p => p.rung).sort((a, b) => b.rank - a.rank);
    rungs.forEach((r, k) => {
      (r as { offset?: number }).offset =
        (k % 2) * 0.5 + this.rng.range(-FLUX_CFG.ladderJitterFrac, FLUX_CFG.ladderJitterFrac);
    });
    for (const p of pending) {
      const comp = p.comp;
      let sx = 0, sy = 0;
      for (const i of comp) { sx += cx(i); sy += cy(i); }
      const pcx = sx / comp.length, pcy = sy / comp.length;
      let bound = 0;
      for (const i of comp) {
        bound = Math.max(bound, Math.hypot(cx(i) - pcx, cy(i) - pcy));
      }
      const off = (p as { offset?: number }).offset;
      const seed = (this.rng.range(0, 1 << 30)) | 0;
      // Billow layout: a handful of lobes spread over the pad's cells.
      const K = Math.max(3, Math.min(10, Math.round(comp.length / 3)));
      const lobes: FluxPad['lobes'] = [];
      for (let k = 0; k < K; k++) {
        const i = comp[Math.floor((k + 0.5) * comp.length / K)];
        lobes.push({
          dx: cx(i) - pcx, dy: cy(i) - pcy,
          r: cell * this.rng.range(1.05, 1.55),
          j: this.rng.range(0, 1),
        });
      }
      const idx = this.pads.length;
      this.pads.push({
        cells: Int32Array.from(comp), kind: kindAt(comp[0]),
        cx: pcx, cy: pcy, bound: bound + cell,
        offset: off !== undefined ? ((off % 1) + 1) % 1 : this.rng.range(0, scatter),
        rung: p.rung, seed, lobes, walkNow: true,
      });
      for (const i of comp) { this.owned[i] = 1; this.cellPad[i] = idx; }
    }

    // --- LANES: skeleton the band, space the carriers along it. -------------
    const carrier = spec.carrier;
    for (const comp of keepLanes) {
      const member = new Set(comp);
      // Farthest-pair skeleton: BFS within the band from an arbitrary cell to
      // its farthest A, then A to its farthest B keeping parents — the long
      // axis walked cell by cell.
      const local = (starts: number[]): { d: Map<number, number>; far: number; parent: Map<number, number> } => {
        const d = new Map<number, number>();
        const parent = new Map<number, number>();
        const q: number[] = [];
        for (const s of starts) { d.set(s, 0); q.push(s); }
        let far = starts[0];
        for (let head = 0; head < q.length; head++) {
          const c = q[head], gx = c % walk.cols, gy = c / walk.cols | 0, nd = d.get(c)! + 1;
          if (d.get(c)! > d.get(far)!) far = c;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = gx + dx, ny = gy + dy;
            if (nx < 0 || ny < 0 || nx >= walk.cols || ny >= walk.rows) continue;
            const nc = ny * walk.cols + nx;
            if (!member.has(nc) || d.has(nc)) continue;
            d.set(nc, nd); parent.set(nc, c); q.push(nc);
          }
        }
        return { d, far, parent };
      };
      const a = local([comp[0]]).far;
      const walkB = local([a]);
      const chain: number[] = [];
      for (let c: number | undefined = walkB.far; c !== undefined; c = walkB.parent.get(c)) chain.push(c);
      chain.reverse(); // A → B
      // Simplify: every other cell keeps the path smooth and cheap.
      const path: { x: number; y: number }[] = [];
      for (let k = 0; k < chain.length; k += 2) path.push({ x: cx(chain[k]), y: cy(chain[k]) });
      if (path.length < 2 || (chain.length - 1) % 2 !== 0) {
        const tail = chain[chain.length - 1];
        path.push({ x: cx(tail), y: cy(tail) });
      }
      const cum: number[] = [0];
      for (let k = 1; k < path.length; k++) {
        cum.push(cum[k - 1] + Math.hypot(path[k].x - path[k - 1].x, path[k].y - path[k - 1].y));
      }
      const len = cum[cum.length - 1];
      if (len <= walk.cell) { for (const i of comp) writeCell(i, stable, false); continue; }
      const laneIdx = this.lanes.length;
      const lane: FluxLane = { member, path, cum, len, laneIdx, carriers: [] };
      const per = carrier!.per ?? FLUX_CFG.carrierPer;
      const count = Math.max(1, Math.round(len / per));
      for (let k = 0; k < count; k++) {
        const r = this.rng.range(carrier!.radius[0], carrier!.radius[1]);
        const speed = this.rng.range(carrier!.speed[0], carrier!.speed[1]);
        const seed = (this.rng.range(0, 1 << 30)) | 0;
        const lobes: FluxCarrier['lobes'] = [{ dx: 0, dy: 0, r: r * 0.98, j: 0 }];
        for (let l = 0; l < 3; l++) {
          const ang = this.rng.range(0, Math.PI * 2);
          lobes.push({
            dx: Math.cos(ang) * r * 0.5, dy: Math.sin(ang) * r * 0.45,
            r: r * this.rng.range(0.5, 0.72), j: this.rng.range(0, 1),
          });
        }
        lane.carriers.push({
          x: path[0].x, y: path[0].y, hx: 1, hy: 0, r, speed,
          phase: (k + this.rng.range(0.1, 0.4)) / count,
          seed, lobes, occupied: new Set(), speedFrac: 0,
        });
      }
      this.lanes.push(lane);
      for (const i of comp) { this.owned[i] = 1; this.cellLane[i] = laneIdx; }
    }

    // First gust never lands inside the warmup.
    if (spec.gusts) this.gustAt = this.warmup + this.rng.range(spec.gusts.every[0], spec.gusts.every[1]);

    // Prime carrier positions so the first tick diffs from the truth.
    for (const lane of this.lanes) {
      for (const c of lane.carriers) {
        const p = this.carrierPosAt(lane, c, 0);
        c.x = p.x; c.y = p.y; c.hx = p.hx; c.hy = p.hy;
      }
    }
  }

  // --- Pure-function-of-clock state ------------------------------------------

  /** A pad's phase + progress (0..1 within that phase) at the field clock.
   *  During warmup everything reads Solid — except a pad whose cycle opens
   *  GONE, which FRAYS through the warmup's last seconds (the drift's first
   *  departure is warned exactly like every later one). */
  padPhase(pad: FluxPad, t = this.clock): { s: FluxPhase; f: number } {
    const ph = this.spec.phase!;
    const P = Math.max(0.5, ph.period);
    const S = Math.min(0.95, Math.max(0.1, ph.solidFrac));
    const fFray = Math.min(S * 0.9, ph.fray / P);
    const fForm = Math.min((1 - S) * 0.9, ph.form / P);
    const uAt = (tt: number): number => (((tt - this.warmup) / P + pad.offset) % 1 + 1) % 1;
    if (t < this.warmup) {
      const u0 = uAt(this.warmup);
      if (u0 >= S && t > this.warmup - ph.fray) {
        return { s: FluxPhase.Fraying, f: Math.min(1, (t - (this.warmup - ph.fray)) / ph.fray) };
      }
      return { s: FluxPhase.Solid, f: 0.5 };
    }
    const u = uAt(t);
    if (u < S) {
      if (u >= S - fFray) return { s: FluxPhase.Fraying, f: (u - (S - fFray)) / fFray };
      return { s: FluxPhase.Solid, f: u / Math.max(0.001, S - fFray) };
    }
    if (u >= 1 - fForm) return { s: FluxPhase.Forming, f: (u - (1 - fForm)) / fForm };
    return { s: FluxPhase.Gone, f: (u - S) / Math.max(0.001, 1 - fForm - S) };
  }

  private padWalkableAt(pad: FluxPad, t = this.clock): boolean {
    if (t < this.warmup) return true;
    const { s } = this.padPhase(pad, t);
    return s === FluxPhase.Solid || s === FluxPhase.Fraying;
  }

  /** A carrier's position/heading along its lane at time t: shuttle with an
   *  end dwell, phase-offset per raft. Pure — never integrated. Rafts hold
   *  still through the warmup (their runs begin when the drift does), so
   *  drift-begin hands each one off with NO teleport. */
  private carrierPosAt(lane: FluxLane, c: FluxCarrier, t: number):
    { x: number; y: number; hx: number; hy: number; moving: boolean } {
    const tt = Math.max(0, t - this.warmup);
    const dwell = this.spec.carrier?.dwell ?? FLUX_CFG.carrierDwell;
    const legT = lane.len / Math.max(1, c.speed);
    const cycle = 2 * (legT + dwell);
    const u = ((tt / cycle + c.phase) % 1 + 1) % 1;
    let dist: number, forward: boolean, moving = true;
    const uu = u * cycle;
    if (uu < legT) { dist = (uu / legT) * lane.len; forward = true; }
    else if (uu < legT + dwell) { dist = lane.len; forward = true; moving = false; }
    else if (uu < legT * 2 + dwell) { dist = lane.len * (1 - (uu - legT - dwell) / legT); forward = false; }
    else { dist = 0; forward = false; moving = false; }
    // Locate dist on the polyline.
    const cum = lane.cum, path = lane.path;
    let k = 1;
    while (k < cum.length - 1 && cum[k] < dist) k++;
    const seg = Math.max(0.001, cum[k] - cum[k - 1]);
    const f = Math.min(1, Math.max(0, (dist - cum[k - 1]) / seg));
    const x = path[k - 1].x + (path[k].x - path[k - 1].x) * f;
    const y = path[k - 1].y + (path[k].y - path[k - 1].y) * f;
    let hx = (path[k].x - path[k - 1].x) / seg, hy = (path[k].y - path[k - 1].y) / seg;
    if (!forward) { hx = -hx; hy = -hy; }
    return { x, y, hx, hy, moving };
  }

  // --- Open predicates --------------------------------------------------------

  /** Does flux govern the ground at this point (pad or lane cell)? */
  ownedAt(x: number, y: number): boolean {
    const i = this.cellIndex(x, y);
    return i >= 0 && this.owned[i] === 1;
  }

  /** Did the floor LEAVE this point (flux-governed and currently gone)? The
   *  walkResolve hold-still guard — the teeter must not be rescue-snapped. */
  voidAt(x: number, y: number): boolean {
    const i = this.cellIndex(x, y);
    return i >= 0 && this.owned[i] === 1 && !this.walk.isWalkable(x, y);
  }

  /** The live gust, if any: unit direction + phase + progress. */
  gustNow(): { x: number; y: number; phase: 'warn' | 'hold'; f: number } | null {
    const g = this.spec.gusts;
    if (!g || this.clock < this.gustHoldFrom - g.warn || this.clock >= this.gustUntil) return null;
    if (this.clock < this.gustHoldFrom) {
      return { ...this.gustDir, phase: 'warn', f: 1 - (this.gustHoldFrom - this.clock) / g.warn };
    }
    return { ...this.gustDir, phase: 'hold', f: (this.gustUntil - this.clock) / Math.max(0.01, g.hold) };
  }

  /** 0..1 through the warmup (1 = the drift is live). HUD/renderer. */
  warmupFrac(): number { return Math.min(1, this.clock / Math.max(0.01, this.warmup)); }

  /** The pad governing a point, if any — the AI steering query (x_ride_flux
   *  hops a walker off its fraying stone the way x_seek_fog chases banks). */
  padAt(x: number, y: number): FluxPad | null {
    const i = this.cellIndex(x, y);
    return i >= 0 && this.cellPad[i] >= 0 ? this.pads[this.cellPad[i]] : null;
  }

  private cellIndex(x: number, y: number): number {
    const gx = Math.floor(x / this.walk.cell), gy = Math.floor(y / this.walk.cell);
    if (gx < 0 || gy < 0 || gx >= this.walk.cols || gy >= this.walk.rows) return -1;
    return gy * this.walk.cols + gx;
  }

  // --- The conjure seam (ConjuredGround annexes; release recomputes truth) ---

  /** Hold a cell out of the drift (conjured ground stands there). True if
   *  flux governs the cell (caller then owes a release). */
  annex(i: number): boolean {
    if (i < 0 || this.owned[i] !== 1) return false;
    this.annexed.add(i);
    return true;
  }

  /** Return an annexed cell and rewrite it to the drift's CURRENT truth. */
  release(i: number): boolean {
    if (!this.annexed.delete(i)) return false;
    const pi = this.cellPad[i];
    if (pi >= 0) {
      this.writeCellKind(i, this.padWalkableAt(this.pads[pi]) ? this.pads[pi].kind : this.voidKind);
      return true;
    }
    const li = this.cellLane[i];
    if (li >= 0) {
      const covered = this.clock < this.warmup
        || this.lanes[li].carriers.some(c => c.occupied.has(i));
      this.writeCellKind(i, covered ? this.laneKind : this.voidKind);
      return true;
    }
    return true;
  }

  private writeCellKind(i: number, id: string): void {
    const cell = this.walk.cell, gx = i % this.walk.cols, gy = i / this.walk.cols | 0;
    this.walk.fillRegion(gx * cell + 1, gy * cell + 1, (gx + 1) * cell - 1, (gy + 1) * cell - 1, id, true);
  }

  // --- The tick ----------------------------------------------------------------

  /** Advance the drift. `actors` are the world-prefiltered occupants
   *  (grounded, fall-eligible). Riders are reported, never moved here —
   *  the World applies deltas through its own confinement (mover contract). */
  update(dt: number, actors: readonly FluxActorLike[]): FluxEvents {
    const prev = this.clock;
    this.clock += dt;
    const events: FluxEvents = { fell: [], rode: [], driftBegun: false, gustBegan: null, dispersed: [] };

    // One-shot: the drift begins (the warmup lapsed this very tick).
    if (!this.driftBegunFlag && this.clock >= this.warmup) {
      this.driftBegunFlag = true;
      if (this.pads.length || this.lanes.length) events.driftBegun = true;
      // Lanes let go of everything but their rafts in one honest burst.
      // Each raft's occupied set primes HERE so the first moving tick diffs
      // against the truth (an unprimed set would orphan ghost-walkable
      // cells at the raft's starting berth forever).
      for (const lane of this.lanes) {
        const keep = new Set<number>();
        for (const c of lane.carriers) {
          c.occupied = this.rasterizeCarrier(lane, c);
          for (const i of c.occupied) keep.add(i);
        }
        for (const i of lane.member) {
          if (keep.has(i) || this.annexed.has(i)) continue;
          this.writeCellKind(i, this.voidKind);
        }
      }
    }

    // --- Pads: write only on walkability transitions. -----------------------
    if (this.spec.phase) {
      for (const pad of this.pads) {
        const walkNow = this.padWalkableAt(pad);
        if (walkNow === pad.walkNow) continue;
        pad.walkNow = walkNow;
        const id = walkNow ? pad.kind : this.voidKind;
        for (const i of pad.cells) {
          if (this.annexed.has(i)) continue;
          this.writeCellKind(i, id);
        }
        if (!walkNow) events.dispersed.push({ x: pad.cx, y: pad.cy });
      }
    }

    // --- Carriers: glide, rasterize, carry. ---------------------------------
    if (this.clock >= this.warmup) {
      for (const lane of this.lanes) {
        for (const c of lane.carriers) {
          const p = this.carrierPosAt(lane, c, this.clock);
          const dx = p.x - c.x, dy = p.y - c.y;
          c.speedFrac = dt > 0 ? Math.min(1, Math.hypot(dx, dy) / (Math.max(1, c.speed) * dt)) : 0;
          if (dx !== 0 || dy !== 0) {
            // Riders picked up at the OLD footprint travel the raft's delta.
            const pick = c.r + FLUX_CFG.rideMargin;
            for (const a of actors) {
              const ax = a.pos.x - c.x, ay = a.pos.y - c.y;
              if (ax * ax + ay * ay <= pick * pick) events.rode.push({ a, dx, dy });
            }
            // Repaint the footprint: adds first (never a gap under a rider).
            const next = this.rasterizeCarrier(lane, { ...c, x: p.x, y: p.y });
            for (const i of next) {
              if (!c.occupied.has(i) && !this.annexed.has(i)) this.writeCellKind(i, this.laneKind);
            }
            for (const i of c.occupied) {
              if (!next.has(i) && !this.annexed.has(i)) this.writeCellKind(i, this.voidKind);
            }
            c.occupied = next;
          }
          c.x = p.x; c.y = p.y; c.hx = p.hx; c.hy = p.hy;
        }
      }
    }

    // --- Gusts: warn, shove, roll the next. ----------------------------------
    const g = this.spec.gusts;
    if (g && this.clock >= this.gustAt && prev < this.gustAt) {
      const ang = this.rng.range(0, Math.PI * 2);
      this.gustDir = { x: Math.cos(ang), y: Math.sin(ang) };
      this.gustHoldFrom = this.gustAt + g.warn;
      this.gustUntil = this.gustHoldFrom + g.hold;
      events.gustBegan = { ...this.gustDir };
    }
    if (g && this.clock >= this.gustUntil && this.gustAt <= this.clock) {
      this.gustAt = this.clock + this.rng.range(g.every[0], g.every[1]);
    }

    // --- The fall test: who is standing on nothing? LEDGE GRASP: a body is
    // supported while any part of its grasp disc still overlaps standing
    // ground — only wholly past the pad's lip does the coyote clock run.
    for (const a of actors) {
      const i = this.cellIndex(a.pos.x, a.pos.y);
      if (i < 0 || this.owned[i] !== 1
        || this.walk.supportedAt(a.pos.x, a.pos.y, a.radius * this.graspFrac)) {
        this.teeter.delete(a);
        continue;
      }
      const t = (this.teeter.get(a) ?? 0) + dt;
      if (t >= this.fallGrace) {
        this.teeter.delete(a);
        events.fell.push(a);
      } else {
        this.teeter.set(a, t);
      }
    }
    return events;
  }

  private rasterizeCarrier(lane: FluxLane, c: { x: number; y: number; r: number }): Set<number> {
    const walk = this.walk, cell = walk.cell;
    const out = new Set<number>();
    const gx0 = Math.max(0, Math.floor((c.x - c.r) / cell));
    const gx1 = Math.min(walk.cols - 1, Math.floor((c.x + c.r) / cell));
    const gy0 = Math.max(0, Math.floor((c.y - c.r) / cell));
    const gy1 = Math.min(walk.rows - 1, Math.floor((c.y + c.r) / cell));
    const r2 = c.r * c.r;
    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        const i = gy * walk.cols + gx;
        if (this.cellLane[i] !== lane.laneIdx) continue;
        const px = (gx + 0.5) * cell - c.x, py = (gy + 0.5) * cell - c.y;
        if (px * px + py * py <= r2) out.add(i);
      }
    }
    return out;
  }
}

/** Stand a zone's drift up, or null when the theme asks for none / the zone
 *  has no walk grid (convex layouts can't shift). `holds` are the solid-
 *  forever anchors — every exit portal. */
export function buildZoneFlux(spec: FluxSpec | undefined, walk: FluxWalk | null,
  rng: FluxRng, entry: { x: number; y: number }, goal: { x: number; y: number } | null,
  holds: readonly { x: number; y: number }[] = []): FluxField | null {
  if (!spec || !walk) return null;
  return new FluxField(spec, walk, rng, entry, goal ?? entry, holds);
}

// ===========================================================================
// CONJURED GROUND — the fabric's second half: walkable cloud CALLED INTO
// BEING. The seam skills ride (World.conjureCloud): a dash that leaves a
// cloud trail, a pad cast at the cursor, a bridge over a melted causeway.
// Honest like everything else — it frays through its last seconds and lets
// go. Cells are annexed from whichever fabric governs them (collapse melt
// schedules and flux pad rhythms both respect the hold) and returned on
// expiry; recently-released cells keep a short teeter grace so the
// walkResolve guard treats "my conjured floor just vanished" exactly like
// every other floor that leaves you.
// ===========================================================================

/** Framework knobs for every conjured cloud (skills scale radius/duration). */
export const CONJURE_CFG = {
  /** The region kind conjured cells become (walkable, window, no edge). */
  kind: 'cloud_conjured',
  /** Total live conjured cells; beyond it the OLDEST release early (no
   *  infinite bridges — the sky forgets what it was asked to hold first). */
  maxCells: 240,
  /** Seconds of tatter-warning before a conjured cell expires. */
  fray: 1.4,
  /** Post-release teeter window (voidAt answers true this long). */
  releaseGrace: 1.0,
} as const;

/** The fabric peers a conjure may annex cells from (structural — the World
 *  wires whichever fields the zone actually stood up). */
export interface ConjurePeers {
  collapse?: { annexCell(i: number): number; releaseCell(i: number, prior: number): void } | null;
  flux?: { annex(i: number): boolean; release(i: number): boolean } | null;
}

interface ConjuredCell {
  until: number;
  /** Region kind to restore when no peer owns the cell. */
  prior: string;
  /** Collapse participation: prior CollapseCell state, or -1. */
  collapsePrior: number;
  fluxOwned: boolean;
}

/** One zone's ledger of player-called ground. Built beside the fields at
 *  loadZone (any grid zone gets one — conjurable kinds gate where it works),
 *  ticked with them, drawn by the flux layer. */
export class ConjuredGround {
  private readonly walk: FluxWalk;
  private readonly canOver: (kindId: string) => boolean;
  private readonly peers: ConjurePeers;
  readonly cells = new Map<number, ConjuredCell>();
  /** Cells released in the last releaseGrace seconds (teeter guard ring). */
  private readonly gone = new Map<number, number>();
  clock = 0;

  constructor(walk: FluxWalk, canOver: (kindId: string) => boolean, peers: ConjurePeers = {}) {
    this.walk = walk;
    this.canOver = canOver;
    this.peers = peers;
  }

  /** Any cloud held right now (renderer early-out)? */
  get live(): boolean { return this.cells.size > 0; }

  /** Call cloud into being: every conjurable cell whose center lies within
   *  `r` of (x,y) stands walkable for `secs`. Already-conjured cells extend.
   *  Returns how many cells now hold (0 = nothing here to stand on). */
  conjure(x: number, y: number, r: number, secs: number): number {
    const walk = this.walk, cell = walk.cell;
    const gx0 = Math.max(0, Math.floor((x - r) / cell));
    const gx1 = Math.min(walk.cols - 1, Math.floor((x + r) / cell));
    const gy0 = Math.max(0, Math.floor((y - r) / cell));
    const gy1 = Math.min(walk.rows - 1, Math.floor((y + r) / cell));
    let placed = 0;
    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        const cx = (gx + 0.5) * cell, cy = (gy + 0.5) * cell;
        if ((cx - x) ** 2 + (cy - y) ** 2 > r * r) continue;
        const i = gy * walk.cols + gx;
        const held = this.cells.get(i);
        if (held) {
          held.until = Math.max(held.until, this.clock + secs);
          placed++;
          continue;
        }
        const kind = walk.regionAt(cx, cy);
        if (!this.canOver(kind)) continue;
        const fluxOwned = this.peers.flux?.annex(i) ?? false;
        const collapsePrior = this.peers.collapse?.annexCell(i) ?? -1;
        walk.fillRegion(gx * cell + 1, gy * cell + 1, (gx + 1) * cell - 1, (gy + 1) * cell - 1,
          CONJURE_CFG.kind, true);
        this.cells.set(i, { until: this.clock + secs, prior: kind, collapsePrior, fluxOwned });
        placed++;
      }
    }
    // The sky forgets oldest-first past the cap.
    while (this.cells.size > CONJURE_CFG.maxCells) {
      const oldest = this.cells.keys().next().value as number;
      this.releaseCell(oldest);
    }
    return placed;
  }

  /** Advance the ledger; expiry releases cells back to their owners. */
  update(dt: number): void {
    this.clock += dt;
    if (this.cells.size) {
      for (const [i, c] of this.cells) {
        if (c.until <= this.clock) this.releaseCell(i);
      }
    }
    if (this.gone.size) {
      for (const [i, at] of this.gone) {
        if (this.clock - at > CONJURE_CFG.releaseGrace) this.gone.delete(i);
      }
    }
  }

  private releaseCell(i: number): void {
    const c = this.cells.get(i);
    if (!c) return;
    this.cells.delete(i);
    if (c.fluxOwned && this.peers.flux?.release(i)) {
      // The drift rewrote its own truth.
    } else {
      const walk = this.walk, cell = walk.cell;
      const gx = i % walk.cols, gy = i / walk.cols | 0;
      walk.fillRegion(gx * cell + 1, gy * cell + 1, (gx + 1) * cell - 1, (gy + 1) * cell - 1,
        c.prior, true);
      if (c.collapsePrior >= 0) this.peers.collapse?.releaseCell(i, c.collapsePrior);
    }
    this.gone.set(i, this.clock);
  }

  /** Did a conjured floor just leave this point (teeter guard)? */
  voidAt(x: number, y: number): boolean {
    const gx = Math.floor(x / this.walk.cell), gy = Math.floor(y / this.walk.cell);
    if (gx < 0 || gy < 0 || gx >= this.walk.cols || gy >= this.walk.rows) return false;
    return this.gone.has(gy * this.walk.cols + gx);
  }

  /** Fray progress (0 fresh … 1 about to expire) for the renderer, per cell. */
  fracOf(c: ConjuredCell): number {
    return Math.min(1, Math.max(0, 1 - (c.until - this.clock) / CONJURE_CFG.fray));
  }
}
