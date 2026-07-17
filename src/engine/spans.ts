// ---------------------------------------------------------------------------
// EPHEMERAL SPANS — condition-held ground, as data (docs/engine/spans.md).
//
// A SPAN is a run of walkable cells the layout painted with a registered
// region kind, whose EXISTENCE tracks a RadianceCond (world/radiance.ts):
// a bridge of sunlight stands while the sky is bright and is simply not
// there at night; a star-span is the inverse; a prism-span exists only
// while rain or storm covers the zone. The fabric is the collapse/flux
// sibling with the third temporality — collapse is ONE-WAY (ground dies),
// flux is PERIODIC (ground breathes on its own clock), spans are
// CONDITIONAL (ground answers the sky) — and like both it mutates the walk
// grid ONLY through fillRegion, so pathing, chunk rebakes, LoS and the
// sight veil all follow from the grid's own invalidation.
//
// THE THREE STATES, all worn as region kinds (pure render data — no
// renderer edits per span family):
//   HELD    → row.region        (walkable, the bridge's own look)
//   FADING  → row.fadeRegion    (walkable, the leaving-warning shimmer)
//   GONE    → row.voidRegion    (the sky's own void — unwalkable)
// The fade window is the telegraph: cond drops → the span shimmers for
// `fade` seconds (still standable — RUN) → then the cells void and the
// ordinary support-loss machinery owns whoever lingered. Cond re-held at
// ANY state re-forms the span instantly (bridges are generous coming back).
//
// LAYOUT CONTRACT (the genqa-facing rule): spans are SHORTCUTS AND PRIZES,
// never the only road — every exit keeps a permanent-ground route (the
// recipes reserve arteries exactly as collapse reserves its goal). The
// probe (balance/probe_radiance.ts) re-asserts it with every span forced
// GONE. Falls ride ZoneDef.below / the dimension's `over` tie like every
// other hole in the sky.
// ---------------------------------------------------------------------------

import type { RadianceCond } from '../world/radiance';

/** The walk-grid slice the fabric drives (GridWalkField fits it) — the
 *  CollapseWalk contract, minus what spans never read. */
export interface SpanWalk {
  readonly cols: number;
  readonly rows: number;
  readonly cell: number;
  regionAt(x: number, y: number): string;
  fillRegion(x0: number, y0: number, x1: number, y1: number, id: string): void;
  supportedAt(x: number, y: number, r: number): boolean;
}

export interface SpanActorLike {
  pos: { x: number; y: number };
  radius: number;
}

export interface SpanEvents {
  /** Cell centers that voided this tick (the leaving-flourish hook). */
  voided: { x: number; y: number }[];
  /** Prefiltered actors whose span fell out from under them (grace spent). */
  fell: SpanActorLike[];
}

/** One span family in a zone theme (ZoneTheme.spans[]). */
export interface SpanRowSpec {
  /** The registered region kind the layout painted these cells with. */
  region: string;
  /** The condition under which the span STANDS (world/radiance.ts). */
  when: RadianceCond;
  /** Warning seconds between cond dropping and the cells voiding —
   *  the span shimmers (fadeRegion) and stays walkable. Default SPAN_CFG. */
  fade?: number;
  /** Region kind worn while fading. Default `<region>_fading` — register the
   *  twin beside the base (validate checks both). */
  fadeRegion?: string;
  /** Region kind worn while gone. Default SPAN_CFG.voidRegion — the same
   *  sky-void the zone's holes are made of, so falls and visuals need no
   *  new vocabulary. */
  voidRegion?: string;
}

export const SPAN_CFG = {
  /** Default fade warning (seconds) — long enough to finish a crossing you
   *  already committed to, short enough that dawdling is a choice. */
  fade: 3.2,
  /** Condition re-evaluation cadence (seconds) — radiance moves on the
   *  day-cycle's timescale; per-frame checks buy nothing. Transitions
   *  themselves fire the frame the eval sees them. */
  evalEvery: 0.25,
  /** The default kind gone cells wear (the aetherial's own sky-hole). */
  voidRegion: 'cloud_void',
  /** Support-loss coyote window on a voided span (the collapse grace). */
  fallGrace: 0.4,
  /** Fraction of body radius that must overlap holding ground (ledge grasp
   *  — the collapse/walk convention). */
  graspFrac: 0.9,
};

const enum SpanState { Held, Fading, Gone }

interface SpanRow {
  spec: SpanRowSpec;
  cells: Int32Array;      // grid indices painted with this row's kind
  state: SpanState;
  fadeLeft: number;
}

export class SpanField {
  private readonly rows: SpanRow[] = [];
  private readonly walk: SpanWalk;
  /** Union of every row's cells — the fabric's fall-test jurisdiction (the
   *  boundary/collapse machinery keeps every other void's). */
  private readonly mine = new Set<number>();
  private evalAcc = 0;
  private readonly teeter = new Map<SpanActorLike, number>();

  constructor(specs: readonly SpanRowSpec[], walk: SpanWalk, held: (cond: RadianceCond) => boolean) {
    this.walk = walk;
    const { cols, rows, cell } = walk;
    const byKind = new Map<string, number[]>();
    for (const s of specs) byKind.set(s.region, []);
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const k = walk.regionAt((gx + 0.5) * cell, (gy + 0.5) * cell);
        const list = byKind.get(k);
        if (list) list.push(gy * cols + gx);
      }
    }
    for (const s of specs) {
      const cells = byKind.get(s.region) ?? [];
      if (!cells.length) continue; // the layout painted none of this kind here
      for (const i of cells) this.mine.add(i);
      this.rows.push({ spec: s, cells: Int32Array.from(cells), state: SpanState.Held, fadeLeft: 0 });
    }
    // TRUTH ON ARRIVAL: paint the honest state immediately — entering at
    // night shows no sunbridge (no fade theater for ground you never saw).
    for (const r of this.rows) {
      if (!held(r.spec.when)) { r.state = SpanState.Gone; this.paint(r, this.voidKind(r)); }
    }
  }

  private voidKind(r: SpanRow): string { return r.spec.voidRegion ?? SPAN_CFG.voidRegion; }
  private fadeKind(r: SpanRow): string { return r.spec.fadeRegion ?? `${r.spec.region}_fading`; }

  private paint(r: SpanRow, kind: string): void {
    const { cols, cell } = this.walk;
    for (const i of r.cells) {
      const gx = i % cols, gy = i / cols | 0;
      this.walk.fillRegion(gx * cell + 1, gy * cell + 1, (gx + 1) * cell - 1, (gy + 1) * cell - 1, kind);
    }
  }

  /** Anything here at all? (A theme may declare rows a layout never paints.) */
  get live(): boolean { return this.rows.length > 0; }

  /** Row states for probes / dev overlays: region → 'held'|'fading'|'gone'. */
  states(): Record<string, 'held' | 'fading' | 'gone'> {
    const out: Record<string, 'held' | 'fading' | 'gone'> = {};
    for (const r of this.rows) {
      out[r.spec.region] = r.state === SpanState.Held ? 'held' : r.state === SpanState.Fading ? 'fading' : 'gone';
    }
    return out;
  }

  /** Force a re-eval on the next update (zone-entry, dev toggles). */
  poke(): void { this.evalAcc = SPAN_CFG.evalEvery; }

  /** One tick: re-evaluate conditions on cadence, run transitions, and test
   *  falls for actors standing on THIS fabric's cells. `held` resolves a
   *  RadianceCond against the live sky (World.radianceCondHeld); `actors`
   *  are prefiltered by the World (alive, grounded, not flying/levitating —
   *  the collapse contract). */
  update(dt: number, held: (cond: RadianceCond) => boolean, actors: readonly SpanActorLike[]): SpanEvents {
    const events: SpanEvents = { voided: [], fell: [] };
    this.evalAcc += dt;
    const evalNow = this.evalAcc >= SPAN_CFG.evalEvery;
    if (evalNow) this.evalAcc = 0;
    for (const r of this.rows) {
      if (r.state === SpanState.Fading) {
        r.fadeLeft -= dt;
        if (r.fadeLeft <= 0) {
          r.state = SpanState.Gone;
          this.paint(r, this.voidKind(r));
          const { cols, cell } = this.walk;
          for (const i of r.cells) {
            events.voided.push({ x: ((i % cols) + 0.5) * cell, y: ((i / cols | 0) + 0.5) * cell });
          }
          continue;
        }
      }
      if (!evalNow) continue;
      const on = held(r.spec.when);
      if (on && r.state !== SpanState.Held) {
        r.state = SpanState.Held;
        this.paint(r, r.spec.region);
      } else if (!on && r.state === SpanState.Held) {
        r.state = SpanState.Fading;
        r.fadeLeft = r.spec.fade ?? SPAN_CFG.fade;
        this.paint(r, this.fadeKind(r));
      }
    }
    this.fallTest(dt, actors, events);
    return events;
  }

  /** The collapse fall test, scoped to span cells: a body whose standing
   *  cell is span geometry and whose grasp disc holds NOTHING teeters for
   *  the grace, then falls. Cells outside this fabric stay the boundary
   *  machinery's business — the two never contest a body. */
  private fallTest(dt: number, actors: readonly SpanActorLike[], events: SpanEvents): void {
    if (!this.rows.some(r => r.state !== SpanState.Held)) { this.teeter.clear(); return; }
    const { cols, rows, cell } = this.walk;
    for (const a of actors) {
      const gx = a.pos.x / cell | 0, gy = a.pos.y / cell | 0;
      const inGrid = gx >= 0 && gy >= 0 && gx < cols && gy < rows;
      if (!inGrid || !this.mine.has(gy * cols + gx)
        || this.walk.supportedAt(a.pos.x, a.pos.y, a.radius * SPAN_CFG.graspFrac)) {
        this.teeter.delete(a);
        continue;
      }
      const t = (this.teeter.get(a) ?? 0) + dt;
      if (t >= SPAN_CFG.fallGrace) {
        this.teeter.delete(a);
        events.fell.push(a);
      } else {
        this.teeter.set(a, t);
      }
    }
  }
}

/** Stand a zone's spans up, or null when the theme declares none / the zone
 *  has no walk grid / no declared kind was actually painted. */
export function buildZoneSpans(
  specs: readonly SpanRowSpec[] | undefined, walk: SpanWalk | null,
  held: (cond: RadianceCond) => boolean,
): SpanField | null {
  if (!specs?.length || !walk) return null;
  const f = new SpanField(specs, walk, held);
  return f.live ? f : null;
}
