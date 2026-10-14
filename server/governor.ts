// ---------------------------------------------------------------------------
// THE NEIGHBORHOOD GOVERNOR (W1; docs/design/shard-m6-plan.md §3.4,
// docs/design/performance-lane.md §3; her numbers, card 32: the floor 24,
// 40 Hz allowed under the heaviest load, no door). A controller over the
// measured tick that spends the shard's three cost dials, cheapest player
// impact first, so a spread party meets a living world the thread can
// carry:
//   dial 1  THE THINKING EDGE (server/thinkingEdge.ts): ships on; the
//           governor asserts it on under load and never turns it off.
//   dial 2  THE POPULATION BUDGET (the foundation's F1 seam,
//           WorldMassRuntime.setPopulationBudget): down ten percent a second
//           while the 2 s p95 stands above 90 percent of the gate, never
//           below floor × groups; up eight natives a second while the p95
//           stays under 60 percent of the gate for calmSec; at the ceiling
//           (maxPopulation × groups) the budget is withdrawn (null) so
//           today's admission law stands byte for byte. Lowering never
//           retires a body: the runtime's own law.
//   dial 3  THE TICK DIAL: 60 to 40 Hz after lowAfterSec at the floor still
//           over the gate (the wire keeps 20 Hz: round(40/20) = 2), back to
//           the base rate after restoreAfterSec under half the gate.
// The signal is the tick's own measured cost (the host feeds it at the end of every tick): an EWMA and a rolling p95 over
// windowSec of world time, fed per tick by the host. Every dial holds at
// least holdSec before it reverses. Without the seam (an older foundation)
// the governor runs cost-only: the edge and the tick dial alone. The host
// speaks to the runtime through GovernorHooks, so the controller is pure
// and the probe walks it with synthetic ticks.
// ---------------------------------------------------------------------------
import { THINKING_EDGE_CFG } from './thinkingEdge';

export const GOVERNOR_CFG = {
  /** The switch: SHIPS OFF (today's admission law and the base rate stand untouched) until the signal is
   *  tuned to leave a passing course alone (performance-lane.md §8.2: on a clustered course that passed the
   *  gate, warm-up spikes and a wobbling 2 s p95 still thinned the world to the floor and dropped the rate);
   *  the soak's `--govern on` is the A/B. */
  enabled: false,
  /** The tick cost the gate is set at for the BASE rate (balance/soak.config.json tickP95Ms, 1.2 budgets at 60 Hz); it scales with the rate the governor holds (30 ms at 40 Hz). */
  gateMs: 20,
  /** Her floor (card 32): no neighborhood group's limit falls below this many natives. */
  floor: 24,
  /** The signal: an EWMA of tick ms, and a rolling p95 over this many world seconds. */
  ewmaAlpha: 0.1,
  windowSec: 2,
  /** The controller's beat (world seconds between decisions). */
  beatSec: 1,
  /** A dial that moved holds at least this long before it reverses. */
  holdSec: 5,
  budget: {
    /** Down this fraction a beat while the p95 stands above highFrac × gate. */
    downPerBeat: 0.10,
    /** Up this many natives a beat while the p95 stays under lowFrac × gate for calmSec. */
    upPerBeat: 8,
    highFrac: 0.9,
    lowFrac: 0.6,
    calmSec: 5,
  },
  tick: {
    /** The heaviest-load rate (the wire stays 20 Hz at 40 and 60; never 30, which halves it). */
    lowHz: 40,
    /** Seconds at the floor still over the gate before the rate drops. */
    lowAfterSec: 10,
    /** Seconds under restoreFrac × gate before the base rate returns. */
    restoreAfterSec: 30,
    restoreFrac: 0.5,
  },
};

/** What the governor needs of a mass runtime (the F1 seam; detected, never assumed). */
export interface GovernedRuntime {
  setPopulationBudget(budget: { total: number; floor: number } | null): void;
  populationStats(): { total: number; groups: { members: readonly string[]; live: number; limit: number }[] };
  config: { maxPopulation: number };
}

/** The host's seams: the tick rate and the runtime instance of the moment. */
export interface GovernorHooks {
  tickHz(): number;
  setTickHz(hz: number): void;
  /** The keeper's mass runtime, or null (a classic world, or a foundation without the seam). */
  runtime(): GovernedRuntime | null;
}

export type GovernorState = 'calm' | 'thinning' | 'floor' | 'slow' | 'recovering';

export interface GovernorStatus {
  enabled: boolean;
  state: GovernorState;
  ewmaMs: number;
  p95Ms: number;
  ticksInWindow: number;
  edge: boolean;
  /** The standing budget, or null when today's law stands. */
  budget: { total: number; floor: number; groups: number; perGroup: number } | null;
  live: number | null;
  tickHz: number;
  baseHz: number;
  seam: boolean;
  moves: number;
}

const r2 = (n: number): number => Math.round(n * 100) / 100;

/** Detect the F1 seam on whatever the host hands over. */
export function governedRuntime(rt: unknown): GovernedRuntime | null {
  if (!rt || typeof rt !== 'object') return null;
  const r = rt as Partial<GovernedRuntime>;
  return typeof r.setPopulationBudget === 'function' && typeof r.populationStats === 'function' && !!r.config ? (rt as GovernedRuntime) : null;
}

export class Governor {
  private readonly ring: { at: number; ms: number }[] = [];
  private ringAt = 0;
  ewmaMs = 0;
  p95Ms = 0;
  state: GovernorState = 'calm';
  moves = 0;
  /** The budget the governor holds (null = today's law), and the runtime it was applied to. */
  private budgetTotal: number | null = null;
  private appliedTo: GovernedRuntime | null = null;
  private appliedTotal: number | null = null;
  private lastBeatAt = -Infinity;
  private budgetMovedAt = -Infinity;
  private budgetDirection: -1 | 0 | 1 = 0;
  private calmSince: number | null = null;
  private floorSince: number | null = null;
  private restoreSince: number | null = null;
  private tickMovedAt = -Infinity;
  readonly baseHz: number;

  constructor(private readonly hooks: GovernorHooks, private readonly cfg = GOVERNOR_CFG) {
    this.baseHz = hooks.tickHz();
  }

  /** Per tick, from the pump: the tick's cost at world time `now`. */
  observe(ms: number, now: number): void {
    this.ewmaMs = this.ewmaMs === 0 ? ms : this.ewmaMs + this.cfg.ewmaAlpha * (ms - this.ewmaMs);
    this.ring.push({ at: now, ms });
    // Prune the window's tail lazily (the ring is small: a few hundred ticks at most).
    const edge = now - this.cfg.windowSec;
    while (this.ringAt < this.ring.length && this.ring[this.ringAt].at < edge) this.ringAt++;
    if (this.ringAt > 256 && this.ringAt * 2 > this.ring.length) { this.ring.splice(0, this.ringAt); this.ringAt = 0; }
  }

  /** The rolling p95 over the window (0 with no ticks). */
  private windowP95(): { p95: number; n: number } {
    const rows: number[] = [];
    for (let i = this.ringAt; i < this.ring.length; i++) rows.push(this.ring[i].ms);
    if (!rows.length) return { p95: 0, n: 0 };
    rows.sort((a, b) => a - b);
    return { p95: rows[Math.min(rows.length - 1, Math.floor(0.95 * rows.length))], n: rows.length };
  }

  /** Once a beat, from the host's tick at world time `now`: read the signal, move the dials, apply. */
  beat(now: number): void {
    if (now - this.lastBeatAt < this.cfg.beatSec) return;
    this.lastBeatAt = now;
    const { p95 } = this.windowP95();
    this.p95Ms = p95;
    if (!this.cfg.enabled) { this.relax(now); return; }
    // THE GATE SCALES WITH THE RATE: gateMs is set against the base rate's budget (20 ms over 16.7 at
    // 60 Hz); a 40 Hz tick has a 25 ms budget and the same 1.2 budgets of gate, 30 ms. A tick that simulates
    // more time costs more and the dial would otherwise never read its own rate as relief.
    const gate = this.cfg.gateMs * (this.baseHz / Math.max(1, this.hooks.tickHz()));
    const rt = governedRuntime(this.hooks.runtime());
    // Dial 1: the edge, asserted on under any load (it ships on; the governor never turns it off).
    if (p95 > 0.5 * gate && !THINKING_EDGE_CFG.enabled) { THINKING_EDGE_CFG.enabled = true; this.moves++; }
    // Dial 2: the budget.
    const high = p95 > this.cfg.budget.highFrac * gate;
    const low = p95 < this.cfg.budget.lowFrac * gate;
    if (low) this.calmSince ??= now; else this.calmSince = null;
    const stats = rt ? rt.populationStats() : null;
    const groups = Math.max(1, stats?.groups.length ?? 1);
    const ceiling = rt ? rt.config.maxPopulation * groups : 0;
    const floorTotal = rt ? this.cfg.floor * groups : 0;
    // THE RE-BASE: the groups move with the players (a party that spreads out founds more). A budget
    // thinned under fewer groups lifts to the new floor total (the seam's clamp held the per-group floor
    // regardless; this keeps `total` honest and the climb starting from the real floor), and one that
    // stands above the new ceiling is withdrawn.
    if (rt && this.budgetTotal !== null) {
      if (this.budgetTotal < floorTotal) this.budgetTotal = floorTotal;
      else if (this.budgetTotal >= ceiling) this.budgetTotal = null;
    }
    const mayReverse = (dir: -1 | 1): boolean => this.budgetDirection === 0 || this.budgetDirection === dir || now - this.budgetMovedAt >= this.cfg.holdSec;
    if (rt && high && mayReverse(-1)) {
      const cur = this.budgetTotal ?? ceiling;
      const next = Math.max(floorTotal, Math.floor(cur * (1 - this.cfg.budget.downPerBeat)));
      if (next < cur) { this.budgetTotal = next; this.budgetDirection = -1; this.budgetMovedAt = now; this.moves++; }
    } else if (rt && this.budgetTotal !== null && low && this.calmSince !== null && now - this.calmSince >= this.cfg.budget.calmSec && mayReverse(1)) {
      const next = Math.min(ceiling, this.budgetTotal + this.cfg.budget.upPerBeat);
      this.budgetTotal = next >= ceiling ? null : next; // at the ceiling today's law stands again
      this.budgetDirection = 1; this.budgetMovedAt = now; this.moves++;
    }
    const atFloor = rt !== null && this.budgetTotal !== null && this.budgetTotal <= floorTotal;
    // Dial 3: the tick rate. Without the seam the floor is "nothing left to thin": the rate is the only dial.
    const nothingLeft = rt === null || atFloor;
    if (high && nothingLeft) this.floorSince ??= now; else this.floorSince = null;
    const restoreLow = p95 < this.cfg.tick.restoreFrac * gate;
    if (restoreLow) this.restoreSince ??= now; else this.restoreSince = null;
    const hz = this.hooks.tickHz();
    if (hz !== this.cfg.tick.lowHz && this.floorSince !== null && now - this.floorSince >= this.cfg.tick.lowAfterSec && now - this.tickMovedAt >= this.cfg.holdSec) {
      this.hooks.setTickHz(this.cfg.tick.lowHz); this.tickMovedAt = now; this.moves++;
    } else if (hz !== this.baseHz && this.restoreSince !== null && now - this.restoreSince >= this.cfg.tick.restoreAfterSec && now - this.tickMovedAt >= this.cfg.holdSec) {
      this.hooks.setTickHz(this.baseHz); this.tickMovedAt = now; this.moves++;
    }
    this.apply(rt);
    this.state = this.hooks.tickHz() !== this.baseHz ? 'slow' : atFloor ? 'floor' : this.budgetTotal !== null ? (this.budgetDirection === 1 ? 'recovering' : 'thinning') : 'calm';
  }

  /** Write the standing budget to the runtime (re-applied when the instance changes; null restores today's law). */
  private apply(rt: GovernedRuntime | null): void {
    if (!rt) { this.appliedTo = null; this.appliedTotal = null; return; }
    if (this.appliedTo === rt && this.appliedTotal === this.budgetTotal) return;
    // A runtime that never held a budget from this governor has nothing to restore: a calm world
    // is never written to, not even a null (today's law stands untouched by construction).
    if (this.budgetTotal === null && this.appliedTo !== rt) { this.appliedTo = rt; this.appliedTotal = null; return; }
    rt.setPopulationBudget(this.budgetTotal === null ? null : { total: this.budgetTotal, floor: this.cfg.floor });
    this.appliedTo = rt; this.appliedTotal = this.budgetTotal;
  }

  /** Switched off or stopping: today's law and the base rate stand again. */
  relax(now: number): void {
    const rt = governedRuntime(this.hooks.runtime());
    this.budgetTotal = null;
    this.apply(rt);
    if (this.hooks.tickHz() !== this.baseHz) { this.hooks.setTickHz(this.baseHz); this.tickMovedAt = now; }
    this.budgetDirection = 0; this.calmSince = null; this.floorSince = null; this.restoreSince = null;
    this.state = 'calm';
  }

  status(): GovernorStatus {
    const rt = governedRuntime(this.hooks.runtime());
    const stats = rt ? rt.populationStats() : null;
    const groups = Math.max(1, stats?.groups.length ?? 1);
    const { n } = this.windowP95();
    return {
      enabled: this.cfg.enabled, state: this.state, ewmaMs: r2(this.ewmaMs), p95Ms: r2(this.p95Ms), ticksInWindow: n,
      edge: THINKING_EDGE_CFG.enabled,
      budget: this.budgetTotal === null ? null : { total: this.budgetTotal, floor: this.cfg.floor, groups,
        perGroup: rt ? Math.max(this.cfg.floor, Math.min(rt.config.maxPopulation, Math.floor(this.budgetTotal / groups))) : 0 },
      live: stats?.total ?? null,
      tickHz: this.hooks.tickHz(), baseHz: this.baseHz, seam: rt !== null, moves: this.moves,
    };
  }
}
