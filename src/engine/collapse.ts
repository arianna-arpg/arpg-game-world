// ---------------------------------------------------------------------------
// THE COLLAPSE FABRIC — living, dissolving ground.
//
// A zone whose theme carries a CollapseSpec is built on ground that DOES NOT
// LAST: cells crumble where feet touch them, the rim of the world flakes away
// on a seeded schedule that marches inward, and what remains at the end is one
// lone causeway to the goal — eroding behind the traveler as they run it (the
// Aetherial's cloud shelves; tomorrow a rotting bridge-town or cracking ice
// sheet is a spec on a theme, never an engine edit).
//
// The fabric OWNS the choreography, not the consequences: it melts walk-grid
// cells into the spec's void region (the grid's own version/dirty machinery
// re-bakes floor chunks and re-flows pathing), and it REPORTS who lost the
// ground under their feet. What a fall MEANS — dropping through the clouds to
// the zone below, scrambling out at the rim — belongs to the World (fall
// routing) and the spec (`fall.kind`).
//
// THE GUARANTEE: the dissolution schedule is computed OUTWARD-IN over the
// distance-to-spine field, the spine itself (the entry→goal walk) erodes
// entry-first on its own later clock, and the goal platform NEVER melts — so
// at any moment a runner who kept pace has standing ground ahead of them all
// the way to the exit. Dawdle, and the causeway crumbles under your heels.
//
// Seed discipline (the fog contract): the schedule rolls on a dedicated Rng
// (zoneSeed ^ COLLAPSE_CFG.salt) and never advances layout/spawn rng. State
// is TRANSIENT: leave and return and the ground has re-knit itself whole —
// the dream re-forms (worldstate movers doctrine).
//
// Pure leaf: structural slice types only — no engine imports, no cycles.
// ---------------------------------------------------------------------------

/** Cell states. SOLID ground arms on contact, crumbles visibly, then voids. */
export const enum CollapseCell { Solid = 0, Arming = 1, Crumbling = 2, Void = 3, Immune = 4 }

/** The rng slice the field needs (a seeded Rng fits it). */
export interface CollapseRng { range(lo: number, hi: number): number }

/** The walk-grid slice the field drives (GridWalkField fits it). Mutation goes
 *  ONLY through fillRegion so the grid's own invalidation (version bump, dirty
 *  rects, path/region cache clears) stays the single source of truth. */
export interface CollapseWalk {
  readonly cols: number;
  readonly rows: number;
  readonly cell: number;
  isWalkable(x: number, y: number): boolean;
  regionAt(x: number, y: number): string;
  fillRegion(x0: number, y0: number, x1: number, y1: number, id: string): void;
}

/** The actor slice the field watches. The WORLD prefilters who is eligible
 *  (alive, grounded, not flying/levitating, not mid-traversal) — the field
 *  only reads geometry. */
export interface CollapseActorLike {
  pos: { x: number; y: number };
  radius: number;
}

/** What one tick of dissolution did — the World routes the consequences. */
export interface CollapseEvents {
  /** Cell centers that finished crumbling and fell away this tick. */
  voided: { x: number; y: number }[];
  /** Prefiltered actors whose standing cell is gone (grace expired). */
  fell: CollapseActorLike[];
}

/** CONTACT MELT: ground arms where feet touch it. */
export interface CollapseContactSpec {
  /** Seconds an armed cell holds before it starts crumbling. */
  delay: number;
  /** Reach beyond the actor's radius that arms cells (world units). */
  radius?: number;
  /** Seconds after zone entry before contact starts arming (the landing pad
   *  doesn't fall out from under fresh arrivals). Default COLLAPSE_CFG. */
  warmup?: number;
}

/** AMBIENT DISSOLUTION: the seeded rim-inward schedule + the spine erosion. */
export interface CollapseAmbientSpec {
  /** Seconds after zone entry the rim starts flaking. */
  start: number;
  /** Seconds per distance-to-spine ring — the inward wavefront's pace. */
  band: number;
  /** Per-cell random spread (seconds) — ragged edges, drifting pockets. */
  jitter: number;
  /** Extra seconds the spine + halo hold beyond `start`. */
  holdout: number;
  /** Seconds the spine takes to erode entry→goal once the holdout lapses. */
  sweep: number;
  /** Protected halo around the spine, in cells (erodes with the spine). */
  halo?: number;
}

/** What a lost floor MEANS for whoever stood on it (the World reads this). */
export interface CollapseFallSpec {
  /** 'below' = drop through to the zone under this one (ZoneDef.below);
   *  'eject' = scramble to the nearest standing ground, shaken. */
  kind: 'below' | 'eject';
  /** Fraction of max life the landing costs (default 0 — the clouds are kind). */
  damageFrac?: number;
  /** Coyote seconds standing on nothing before the fall claims you. */
  grace?: number;
}

/** The whole mechanic as data, on a ZoneTheme (variants override wholesale). */
export interface CollapseSpec {
  /** Region kind melted cells become (a `window` visual shows the world
   *  below through them — e.g. 'cloud_void'). */
  region: string;
  /** Which walkable region kinds can melt (default ['ground']). Everything
   *  else — air pockets, roads, structure floors — stands firm. */
  melts?: string[];
  /** Seconds a cell visibly crumbles (shakes, cracks) before voiding. */
  crumble: number;
  contact?: CollapseContactSpec;
  ambient?: CollapseAmbientSpec;
  fall?: CollapseFallSpec;
  /** The goal the spine runs to: a doodad KIND to seek (e.g. the ascendant
   *  gate). Absent = the exit portal farthest from entry. */
  goal?: { doodad?: string };
  /** Radius around the goal that never melts (default COLLAPSE_CFG). */
  goalClear?: number;
  /** Radius around the entry protected from AMBIENT melt for `entryGrace`
   *  seconds (contact still respects only the goal platform). */
  entryClear?: number;
  entryGrace?: number;
}

/** Framework constants — knobs that shape EVERY collapse, not one zone's. */
export const COLLAPSE_CFG = {
  /** Dedicated rng stream: zoneSeed ^ salt (never moves layout rng). */
  salt: 0xc0111a45,
  /** Default contact warmup after zone entry (seconds). */
  contactWarmup: 2.5,
  /** Default reach beyond the actor radius that arms cells. */
  contactRadius: 10,
  /** Default protected radius around the goal / entry (world units). */
  goalClear: 140,
  entryClear: 120,
  entryGrace: 10,
  /** Default coyote seconds before a voided cell drops its occupant. */
  fallGrace: 0.35,
  /** Default spine halo (cells). */
  halo: 2,
  /** Ambient melts released per tick at most — a rim ring arriving all at
   *  once still lands as a stagger of crumbles, not one giant dirty flood. */
  ambientPerTick: 26,
  /** Contact scan cap per tick (actors × cells is tiny, but bounded). */
  contactPerTick: 60,
} as const;

/** One zone's live dissolution. Built at loadZone (buildZoneCollapse), ticked
 *  beside fog/heat, read by the renderer for crumble wobble + by AI/debug. */
export class CollapseField {
  readonly spec: CollapseSpec;
  readonly walk: CollapseWalk;
  /** Per-cell state (CollapseCell). */
  readonly state: Uint8Array;
  /** Per-cell countdown for Arming/Crumbling states. */
  private readonly timer: Float32Array;
  /** Per-cell ambient melt time (seconds since build; Infinity = never). */
  private readonly decayAt: Float32Array;
  /** Cell indices sorted by decayAt — the ambient cursor walks this. */
  private readonly order: Int32Array;
  private cursor = 0;
  /** Live arming/crumbling cells (renderer wobble + timer advance). */
  readonly active = new Set<number>();
  /** Seconds since the field stood up. */
  clock = 0;
  /** True once the spine itself has begun eroding (a one-time world cue). */
  private spineBegun = false;
  private readonly spineStart: number;
  private readonly meltable: Set<string>;
  private readonly contactWarmup: number;
  private readonly fallGrace: number;
  /** Per-actor coyote clocks (keyed by the actor object). */
  private readonly teeter = new WeakMap<CollapseActorLike, number>();
  /** The spine path (cell indices, entry→goal) — renderer/debug may trace it. */
  readonly spine: Int32Array;
  readonly goalPos: { x: number; y: number };

  constructor(spec: CollapseSpec, walk: CollapseWalk, rng: CollapseRng,
    entry: { x: number; y: number }, goal: { x: number; y: number }) {
    this.spec = spec;
    this.walk = walk;
    this.goalPos = { x: goal.x, y: goal.y };
    this.meltable = new Set(spec.melts ?? ['ground']);
    this.contactWarmup = spec.contact?.warmup ?? COLLAPSE_CFG.contactWarmup;
    this.fallGrace = spec.fall?.grace ?? COLLAPSE_CFG.fallGrace;
    const n = walk.cols * walk.rows;
    this.state = new Uint8Array(n);
    this.timer = new Float32Array(n);
    this.decayAt = new Float32Array(n).fill(Infinity);

    // --- The lay of the land: which cells can melt at all. -----------------
    const cell = walk.cell;
    const cx = (i: number): number => (i % walk.cols + 0.5) * cell;
    const cy = (i: number): number => ((i / walk.cols | 0) + 0.5) * cell;
    const canMelt: boolean[] = new Array(n);
    for (let i = 0; i < n; i++) {
      const x = cx(i), y = cy(i);
      canMelt[i] = walk.isWalkable(x, y) && this.meltable.has(walk.regionAt(x, y));
      if (!canMelt[i]) this.state[i] = CollapseCell.Immune;
    }
    // The goal platform never melts; the entry pad holds against the ambient
    // clock for a grace (contact still spares only the goal).
    const goalClear = spec.goalClear ?? COLLAPSE_CFG.goalClear;
    const entryClear = spec.entryClear ?? COLLAPSE_CFG.entryClear;
    const entryGrace = spec.entryGrace ?? COLLAPSE_CFG.entryGrace;
    for (let i = 0; i < n; i++) {
      if (this.state[i] === CollapseCell.Immune) continue;
      if (Math.hypot(cx(i) - goal.x, cy(i) - goal.y) <= goalClear) this.state[i] = CollapseCell.Immune;
    }

    // --- The spine: the entry→goal walk over meltable+walkable ground. -----
    // BFS from the goal cell (4-connected over WALKABLE cells — immune ground
    // like structure floors still carries the path), then gradient-walk from
    // the entry. Distances double as the "along the way" clock for the sweep.
    const walkableAt = (i: number): boolean => walk.isWalkable(cx(i), cy(i));
    const bfs = (seeds: number[]): Int32Array => {
      const d = new Int32Array(n).fill(-1);
      const q: number[] = [];
      for (const s of seeds) if (s >= 0 && s < n && walkableAt(s)) { d[s] = 0; q.push(s); }
      for (let head = 0; head < q.length; head++) {
        const c = q[head], gx = c % walk.cols, gy = c / walk.cols | 0, nd = d[c] + 1;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = gx + dx, ny = gy + dy;
          if (nx < 0 || ny < 0 || nx >= walk.cols || ny >= walk.rows) continue;
          const nc = ny * walk.cols + nx;
          if (d[nc] >= 0 || !walkableAt(nc)) continue;
          d[nc] = nd; q.push(nc);
        }
      }
      return d;
    };
    const cellOf = (p: { x: number; y: number }): number =>
      Math.min(walk.rows - 1, Math.max(0, Math.floor(p.y / cell))) * walk.cols
      + Math.min(walk.cols - 1, Math.max(0, Math.floor(p.x / cell)));
    const goalCell = cellOf(goal);
    const dGoal = bfs([goalCell]);
    // Gradient-walk entry→goal. An entry cut off from the goal (shouldn't
    // happen — generation guarantees reachability) degrades to a goal-only
    // spine: the platform still stands, everything else runs the rim clock.
    const spine: number[] = [];
    let cur = cellOf(entry);
    if (dGoal[cur] < 0) {
      // Snap to the nearest cell that reaches the goal.
      let best = -1, bd = Infinity;
      for (let i = 0; i < n; i++) {
        if (dGoal[i] < 0) continue;
        const dd = (cx(i) - entry.x) ** 2 + (cy(i) - entry.y) ** 2;
        if (dd < bd) { bd = dd; best = i; }
      }
      cur = best >= 0 ? best : goalCell;
    }
    let guard = n + 4;
    while (cur !== goalCell && guard-- > 0) {
      spine.push(cur);
      const gx = cur % walk.cols, gy = cur / walk.cols | 0;
      let next = -1, bd = dGoal[cur];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = gx + dx, ny = gy + dy;
        if (nx < 0 || ny < 0 || nx >= walk.cols || ny >= walk.rows) continue;
        const nc = ny * walk.cols + nx;
        if (dGoal[nc] >= 0 && dGoal[nc] < bd) { bd = dGoal[nc]; next = nc; }
      }
      if (next < 0) break;
      cur = next;
    }
    spine.push(goalCell);
    this.spine = Int32Array.from(spine);
    const dSpine = bfs(spine);

    // --- The schedule: rim-first wavefront + late entry-first spine sweep. --
    const amb = spec.ambient;
    this.spineStart = amb ? amb.start + amb.holdout : Infinity;
    if (amb) {
      const halo = Math.max(0, Math.round(amb.halo ?? COLLAPSE_CFG.halo));
      let dMax = 0;
      for (let i = 0; i < n; i++) if (dSpine[i] > dMax) dMax = dSpine[i];
      const spineLen = Math.max(1, dGoal[this.spine[0]]);
      for (let i = 0; i < n; i++) {
        if (this.state[i] === CollapseCell.Immune || !canMelt[i]) continue;
        const j = rng.range(0, amb.jitter);
        if (dSpine[i] >= 0 && dSpine[i] <= halo) {
          // On the causeway: hold, then erode entry-first toward the goal.
          const along = Math.max(0, Math.min(1, 1 - dGoal[i] / spineLen));
          this.decayAt[i] = amb.start + amb.holdout + along * amb.sweep + j * 0.35;
        } else {
          // Off the causeway: the rim goes first, the wave marches inward.
          const d = dSpine[i] >= 0 ? dSpine[i] : 0; // unreachable pockets flake first
          this.decayAt[i] = amb.start + (dMax - d) * amb.band + j;
        }
        // The entry pad holds its ground for the grace, whatever the wave says.
        if (Math.hypot(cx(i) - entry.x, cy(i) - entry.y) <= entryClear) {
          this.decayAt[i] = Math.max(this.decayAt[i], entryGrace + rng.range(0, 2));
        }
      }
    }
    // The ambient cursor: cells in melt order (Infinity sinks to the tail).
    const idx: number[] = [];
    for (let i = 0; i < n; i++) if (this.decayAt[i] < Infinity) idx.push(i);
    idx.sort((a, b) => this.decayAt[a] - this.decayAt[b]);
    this.order = Int32Array.from(idx);
  }

  /** Crumble progress (0 fresh → 1 about to void) for a live cell, or -1. */
  crumbleFrac(i: number): number {
    if (this.state[i] !== CollapseCell.Crumbling) return -1;
    const c = Math.max(0.01, this.spec.crumble);
    return Math.max(0, Math.min(1, 1 - this.timer[i] / c));
  }

  /** Is the standing ground at a point gone? (Void only — crumbling holds.) */
  voidAt(x: number, y: number): boolean {
    const i = this.cellIndex(x, y);
    return i >= 0 && this.state[i] === CollapseCell.Void;
  }

  private cellIndex(x: number, y: number): number {
    const gx = Math.floor(x / this.walk.cell), gy = Math.floor(y / this.walk.cell);
    if (gx < 0 || gy < 0 || gx >= this.walk.cols || gy >= this.walk.rows) return -1;
    return gy * this.walk.cols + gx;
  }

  /** Share of once-meltable ground already voided (HUD/debug). */
  dissolvedFrac(): number {
    let melt = 0, gone = 0;
    for (let i = 0; i < this.state.length; i++) {
      if (this.state[i] === CollapseCell.Immune) continue;
      melt++;
      if (this.state[i] === CollapseCell.Void) gone++;
    }
    return melt ? gone / melt : 0;
  }

  /** One-time flag flip when the causeway itself begins to erode. */
  spineEroding(): boolean {
    if (this.spineBegun || this.clock < this.spineStart) return this.spineBegun;
    this.spineBegun = true;
    return true;
  }

  /** Advance the dissolution. `actors` are the world-prefiltered occupants
   *  (grounded, fall-eligible); `feet` are the contact-arming subset (usually
   *  the same list — separated so a levitating brood can still FALL-test
   *  differently than it arms, if a future spec wants that). */
  update(dt: number, actors: readonly CollapseActorLike[],
    feet: readonly CollapseActorLike[] = actors): CollapseEvents {
    this.clock += dt;
    const events: CollapseEvents = { voided: [], fell: [] };
    const { walk, spec } = this;
    const cell = walk.cell;

    // --- Ambient releases: walk the sorted cursor up to the clock. ---------
    let released = 0;
    while (this.cursor < this.order.length && released < COLLAPSE_CFG.ambientPerTick) {
      const i = this.order[this.cursor];
      if (this.decayAt[i] > this.clock) break;
      this.cursor++;
      if (this.state[i] !== CollapseCell.Solid && this.state[i] !== CollapseCell.Arming) continue;
      this.state[i] = CollapseCell.Crumbling;
      this.timer[i] = spec.crumble;
      this.active.add(i);
      released++;
    }

    // --- Contact arming: ground remembers every footfall. ------------------
    const contact = spec.contact;
    if (contact && this.clock >= this.contactWarmup) {
      let armed = 0;
      const reach = contact.radius ?? COLLAPSE_CFG.contactRadius;
      for (const a of feet) {
        if (armed >= COLLAPSE_CFG.contactPerTick) break;
        const r = a.radius + reach;
        const gx0 = Math.max(0, Math.floor((a.pos.x - r) / cell));
        const gx1 = Math.min(walk.cols - 1, Math.floor((a.pos.x + r) / cell));
        const gy0 = Math.max(0, Math.floor((a.pos.y - r) / cell));
        const gy1 = Math.min(walk.rows - 1, Math.floor((a.pos.y + r) / cell));
        for (let gy = gy0; gy <= gy1; gy++) {
          for (let gx = gx0; gx <= gx1; gx++) {
            const px = (gx + 0.5) * cell - a.pos.x, py = (gy + 0.5) * cell - a.pos.y;
            if (px * px + py * py > r * r) continue;
            const i = gy * walk.cols + gx;
            if (this.state[i] !== CollapseCell.Solid) continue;
            this.state[i] = CollapseCell.Arming;
            this.timer[i] = contact.delay;
            this.active.add(i);
            armed++;
          }
        }
      }
    }

    // --- Advance live cells: arming → crumbling → void. --------------------
    for (const i of this.active) {
      this.timer[i] -= dt;
      if (this.timer[i] > 0) continue;
      if (this.state[i] === CollapseCell.Arming) {
        this.state[i] = CollapseCell.Crumbling;
        this.timer[i] = spec.crumble;
        continue;
      }
      // Crumbled through: the cell falls away. One fillRegion per cell rides
      // the grid's own dirty-rect machinery (budgeted chunk re-bakes).
      this.state[i] = CollapseCell.Void;
      this.active.delete(i);
      const gx = i % walk.cols, gy = i / walk.cols | 0;
      walk.fillRegion(gx * cell + 1, gy * cell + 1, (gx + 1) * cell - 1, (gy + 1) * cell - 1, spec.region);
      events.voided.push({ x: (gx + 0.5) * cell, y: (gy + 0.5) * cell });
    }

    // --- The fall test: who is standing on nothing? -------------------------
    for (const a of actors) {
      const i = this.cellIndex(a.pos.x, a.pos.y);
      if (i < 0 || this.state[i] !== CollapseCell.Void) {
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
}

/** Stand a zone's collapse up, or null when the theme asks for none / the
 *  zone has no walk grid to melt (convex layouts can't collapse). */
export function buildZoneCollapse(spec: CollapseSpec | undefined,
  walk: CollapseWalk | null, rng: CollapseRng,
  entry: { x: number; y: number }, goal: { x: number; y: number } | null): CollapseField | null {
  if (!spec || !walk) return null;
  return new CollapseField(spec, walk, rng, entry, goal ?? entry);
}
