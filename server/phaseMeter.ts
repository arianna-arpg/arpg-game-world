// ---------------------------------------------------------------------------
// THE PHASE METER (docs/design/performance-lane.md §5 step 1; the M6 plan
// docs/design/shard-m6-plan.md §1.3 item 3): where a host tick goes, phase by
// phase and unit by unit, read from the status page and the soak.
//
// The host stamps `performance.now()` around each phase of ShardHost.tick
// (the input poll and drain, and per unit: applyInputs, the meta actions, the
// AI loop, World.update with the mass runtime's share inside it, the near-law
// settle; then the hand-off drain, the desks, the wire's serialize and send,
// the world save) and adds the span here. One sample per tick per phase lands
// in a ring (PHASE_METER_CFG.ring ticks); a phase that did not run in a tick
// holds the ABSENT mark, so percentiles are over the ticks it ran in while the
// share reads both sums over the same window. Counts (the AI loop's bodies,
// the edged ones) ride the same rings under a '#' name. Every mark is two
// clock reads and a map add: nothing here allocates per tick after warm-up.
// ---------------------------------------------------------------------------

export const PHASE_METER_CFG = {
  /** Per-phase ring length in ticks (SHARD_CFG.telemetryTicks' twin: ten seconds at 60 Hz). */
  ring: 600,
};

/** The ring value of a phase that did not run in a tick. */
const ABSENT = -1;

export interface PhaseSummary {
  /** Ticks in the window the phase ran in. */
  calls: number;
  p50: number;
  p95: number;
  max: number;
  /** Mean over the ticks it ran in. */
  meanMs: number;
  /** The phase's share of the window's tick time (its sum over the tick sum, 0..1); counts carry 0. */
  share: number;
}

class Ring {
  readonly values: number[] = [];
  private at = 0;
  /** Sum of the present values in the window (the share's numerator; counts: their mean's). */
  sum = 0;
  present = 0;
  constructor(private readonly size: number) {}
  push(v: number): void {
    if (this.values.length < this.size) this.values.push(v);
    else {
      const old = this.values[this.at];
      if (old !== ABSENT) { this.sum -= old; this.present--; }
      this.values[this.at] = v;
      this.at = (this.at + 1) % this.size;
    }
    if (v !== ABSENT) { this.sum += v; this.present++; }
  }
  summary(tickSum: number, isCount: boolean): PhaseSummary {
    const rows: number[] = [];
    for (const v of this.values) if (v !== ABSENT) rows.push(v);
    rows.sort((a, b) => a - b);
    const q = (p: number): number => rows.length ? rows[Math.min(rows.length - 1, Math.floor(p * rows.length))] : 0;
    const r2 = (n: number): number => Math.round(n * 100) / 100;
    return {
      calls: rows.length,
      p50: r2(q(0.5)), p95: r2(q(0.95)), max: r2(rows[rows.length - 1] ?? 0),
      meanMs: r2(rows.length ? this.sum / rows.length : 0),
      share: isCount || tickSum <= 0 ? 0 : Math.round(this.sum / tickSum * 1e4) / 1e4,
    };
  }
}

/** A count's name (never a share of the tick): `#ai.ran`, `#ai.edged`. */
export const isCountPhase = (name: string): boolean => name.startsWith('#');

export class PhaseMeter {
  private readonly rings = new Map<string, Ring>();
  /** The open tick's accumulation per phase (several units add into one phase). ONE map for the
   *  meter's life: no tick allocates. */
  private readonly acc = new Map<string, number>();
  /** The ended tick's rows: the same map, valid between end() and the next begin() (the soak
   *  reads it right after each tick; read-only). */
  readonly last: ReadonlyMap<string, number> = this.acc;
  /** The last ended tick's own time. */
  lastTickMs = 0;
  ticks = 0;
  constructor(private readonly size = PHASE_METER_CFG.ring) {}

  /** Call at the tick's start. */
  begin(): void { this.acc.clear(); }

  /** Add a span (or a count under a '#' name) to the open tick; a unit key keys a second row `${unit}/${phase}`. */
  add(phase: string, value: number, unit?: string): void {
    this.acc.set(phase, (this.acc.get(phase) ?? 0) + value);
    if (unit !== undefined) {
      const key = unit + '/' + phase;
      this.acc.set(key, (this.acc.get(key) ?? 0) + value);
    }
  }

  /** Call at the tick's end with the tick's own time: every known phase gets one ring sample. */
  end(tickMs: number): void {
    this.ticks++;
    this.lastTickMs = tickMs;
    for (const [name] of this.acc) if (!this.rings.has(name)) this.rings.set(name, new Ring(this.size));
    let tick = this.rings.get('tick');
    if (!tick) this.rings.set('tick', tick = new Ring(this.size));
    for (const [name, ring] of this.rings) {
      if (name === 'tick') ring.push(tickMs);
      else ring.push(this.acc.has(name) ? this.acc.get(name)! : ABSENT);
    }
  }

  /** p50 / p95 / max / mean per phase and each phase's share of the window's tick time. */
  summary(): Record<string, PhaseSummary> {
    const tick = this.rings.get('tick');
    const tickSum = tick?.sum ?? 0;
    const out: Record<string, PhaseSummary> = {};
    for (const name of [...this.rings.keys()].sort()) out[name] = this.rings.get(name)!.summary(tickSum, isCountPhase(name));
    return out;
  }

  /** The phase names seen so far (the soak's columns). */
  phases(): string[] { return [...this.rings.keys()].sort(); }
}

/** THE RUNTIME WRAP: an own-property override of a method on ONE instance (no
 *  source edit: the mass runtime is the foundation's), timing every call into
 *  the meter under `phase` for `unit`. Idempotent per instance. */
const wrapped = new WeakSet<object>();
export function meterMethod<T extends object>(meter: PhaseMeter, target: T, key: keyof T & string, phase: string, unit?: string): void {
  if (wrapped.has(target)) return;
  const original = target[key];
  if (typeof original !== 'function') return;
  wrapped.add(target);
  Object.defineProperty(target, key, {
    configurable: true, writable: true, enumerable: false,
    value: function(this: T, ...args: unknown[]) {
      const t0 = performance.now();
      try { return Reflect.apply(original as (...a: unknown[]) => unknown, this, args); }
      finally { meter.add(phase, performance.now() - t0, unit); }
    },
  });
}
