// ---------------------------------------------------------------------------
// THE WHAT-IF LANE — numbers changed in memory, measured through the real game.
//
//   runWhatIf     one change: every scenario before and after, at common seeds.
//   runSensitivity which knobs move which metrics: paired elasticities.
//   solveKnob     what value of this knob lands this metric on this target?
//
// All three share one honesty rule. The before and after runs use the SAME seeds,
// the comparison is per-seed, and a verdict comes with it (stats.ts pairedRead):
// `identical` (the knob reached nothing here), `coin_flip`, `inconclusive` or
// `moved`. Nothing here edits a file. A proposal is evidence plus a repro command;
// applying it is a person's decision.
// ---------------------------------------------------------------------------

import { applyKnobs, parseKnob, roundForAuthor, type KnobSpec, type KnobTouch } from './knobs';
import { runEpisode } from './runner';
import { deriveSeed } from './rng';
import { pairedRead, type PairedRead } from './stats';
import type { EpisodeResult, ScenarioDef } from './types';

/** The metrics a what-if reports by default. */
export const WHATIF_METRICS = [
  'dps_out', 'dps_dummy', 'dps_in', 'kills', 'kill_rate', 'ttk_wave_mean',
  'player_deaths', 'life_floor_pct', 'mana_floor_pct',
];

export function seedsFor(baseSeed: number, seeds: number): number[] {
  return Array.from({ length: Math.max(1, seeds) }, (_, i) => deriveSeed(baseSeed, i + 1));
}

export function runBatch(scenario: ScenarioDef, seedList: readonly number[]): EpisodeResult[] {
  return seedList.map(s => runEpisode(scenario, s));
}

const metricAt = (e: EpisodeResult, k: string): number => {
  const v = e.metrics[k];
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
};

const fingerprintOf = (e: EpisodeResult): string => JSON.stringify(e.fingerprint);

export interface WhatIfRow {
  scenarioId: string;
  /** Every seed's fingerprint is byte-identical: the knob reached nothing here. */
  identical: boolean;
  warnings: string[];
  metrics: Record<string, PairedRead>;
}

export interface WhatIfResult {
  knobs: string[];
  touched: KnobTouch[];
  errors: string[];
  seeds: number;
  baseSeed: number;
  rows: WhatIfRow[];
}

function compareRow(
  scenarioId: string, before: EpisodeResult[], after: EpisodeResult[],
  metrics: readonly string[], statSeed: number,
): WhatIfRow {
  const out: Record<string, PairedRead> = {};
  for (const k of metrics) {
    if (!before.some(e => k in e.metrics) && !after.some(e => k in e.metrics)) continue;
    out[k] = pairedRead(before.map(e => metricAt(e, k)), after.map(e => metricAt(e, k)), statSeed);
  }
  return {
    scenarioId,
    identical: before.every((e, i) => fingerprintOf(e) === fingerprintOf(after[i])),
    warnings: [...new Set([...before, ...after].flatMap(e => e.warnings))],
    metrics: out,
  };
}

export function runWhatIf(o: {
  knobs: readonly (KnobSpec | string)[];
  scenarios: readonly ScenarioDef[];
  seeds: number;
  baseSeed: number;
  metrics?: readonly string[];
  onRow?: (r: WhatIfRow) => void;
}): WhatIfResult {
  const knobs = o.knobs.map(k => (typeof k === 'string' ? parseKnob(k) : k));
  const seedList = seedsFor(o.baseSeed, o.seeds);
  const metrics = o.metrics ?? WHATIF_METRICS;
  const before = o.scenarios.map(s => runBatch(s, seedList));
  const applied = applyKnobs(knobs);
  const rows: WhatIfRow[] = [];
  try {
    if (!applied.errors.length) {
      o.scenarios.forEach((s, i) => {
        const row = compareRow(s.id, before[i], runBatch(s, seedList), metrics, deriveSeed(o.baseSeed, 0x7a11 + i));
        rows.push(row);
        o.onRow?.(row);
      });
    }
  } finally {
    applied.restore();
  }
  return {
    knobs: knobs.map(k => k.text), touched: applied.touched, errors: applied.errors,
    seeds: seedList.length, baseSeed: o.baseSeed, rows,
  };
}

// ------------------------------------------------------------- sensitivity --

export interface SensitivityKnob {
  /** A label for reports. */
  id: string;
  /** 'scale' perturbs the path by ×(1±delta); 'step' adds ±step to it. */
  mode: 'scale' | 'step';
  path: string;
  step?: number;
}

export interface SensitivityCell {
  knob: string;
  scenarioId: string;
  metric: string;
  base: number;
  /** %-change in the metric per %-change in the knob (scale), or absolute
   *  change in the metric per step (step). */
  elasticity: number;
  lo: number;
  hi: number;
  moved: boolean;
}

export interface SensitivityResult {
  delta: number;
  seeds: number;
  baseSeed: number;
  knobs: { id: string; path: string; mode: string; touched: number; error?: string; noop: boolean }[];
  cells: SensitivityCell[];
  episodes: number;
}

/** Central differences at common seeds. Costs knobs × scenarios × 2 × seeds. */
export function runSensitivity(o: {
  knobs: readonly SensitivityKnob[];
  scenarios: readonly ScenarioDef[];
  seeds: number;
  baseSeed: number;
  delta?: number;
  metrics?: readonly string[];
  deadlineAt?: number;
  onKnob?: (done: number, total: number) => void;
}): SensitivityResult {
  const delta = o.delta ?? 0.2;
  const seedList = seedsFor(o.baseSeed, o.seeds);
  const metrics = o.metrics ?? WHATIF_METRICS;
  const base = o.scenarios.map(s => runBatch(s, seedList));
  const res: SensitivityResult = {
    delta, seeds: seedList.length, baseSeed: o.baseSeed, knobs: [], cells: [],
    episodes: base.length * seedList.length,
  };
  o.knobs.forEach((knob, ki) => {
    if (o.deadlineAt !== undefined && Date.now() > o.deadlineAt) return;
    const up = knob.mode === 'scale' ? `${knob.path}*${1 + delta}` : `${knob.path}+${knob.step ?? 1}`;
    const down = knob.mode === 'scale' ? `${knob.path}*${1 - delta}` : `${knob.path}+${-(knob.step ?? 1)}`;
    const run = (text: string): { eps: EpisodeResult[][]; touched: number; error?: string } => {
      const applied = applyKnobs([parseKnob(text)]);
      try {
        if (applied.errors.length) return { eps: [], touched: 0, error: applied.errors.join('; ') };
        return { eps: o.scenarios.map(s => runBatch(s, seedList)), touched: applied.touched.length };
      } finally { applied.restore(); }
    };
    const hi = run(up);
    if (hi.error) { res.knobs.push({ id: knob.id, path: knob.path, mode: knob.mode, touched: 0, error: hi.error, noop: true }); return; }
    const lo = run(down);
    res.episodes += (hi.eps.length + lo.eps.length) * seedList.length;
    let noop = true;
    o.scenarios.forEach((s, si) => {
      const same = base[si].every((e, i) => fingerprintOf(e) === fingerprintOf(hi.eps[si][i])
        && fingerprintOf(e) === fingerprintOf(lo.eps[si][i]));
      if (!same) noop = false;
      for (const metric of metrics) {
        if (!base[si].some(e => metric in e.metrics)) continue;
        const b = base[si].map(e => metricAt(e, metric));
        const u = hi.eps[si].map(e => metricAt(e, metric));
        const d = lo.eps[si].map(e => metricAt(e, metric));
        const b0 = b.reduce((a, x) => a + x, 0) / b.length;
        const denom = knob.mode === 'scale' ? 2 * delta * (b0 === 0 ? 1 : Math.abs(b0)) : 2 * (knob.step ?? 1);
        const perSeed = u.map((x, i) => (x - d[i]) / denom);
        const read = pairedRead(d.map(() => 0), perSeed, deriveSeed(o.baseSeed, 0x5e45 + ki * 97 + si));
        res.cells.push({
          knob: knob.id, scenarioId: s.id, metric, base: b0,
          elasticity: read.delta, lo: read.lo, hi: read.hi,
          moved: !same && read.verdict === 'moved',
        });
      }
    });
    res.knobs.push({ id: knob.id, path: knob.path, mode: knob.mode, touched: hi.touched, noop });
    o.onKnob?.(ki + 1, o.knobs.length);
  });
  return res;
}

// ----------------------------------------------------------- the solver --

export interface KnobSolution {
  path: string;
  /** The multiplier on the path that lands the target (author-rounded). */
  factor: number;
  metric: string;
  target: number;
  before: PairedRead;
  /** Measured at the chosen factor, on the same seeds. */
  achieved: number;
  /** Fraction of the way to the target the measured value got (1 = on target). */
  closure: number;
  /** log(metric) per log(factor), from the solver's own measurements. */
  elasticity: number;
  /** The metric hardly responds: no sane number reaches the target, which is
   *  what a flag for a mechanic conversation looks like. */
  unreachable: boolean;
  trials: { factor: number; value: number }[];
  episodes: number;
}

/** Secant in log-log space on real measurements: find the multiplier on `path`
 *  that brings `metric` of `scenario` to `target`, inside [minFactor, maxFactor].
 *  Common seeds throughout, so noise cancels as far as it can. */
export function solveKnob(o: {
  path: string;
  scenario: ScenarioDef;
  metric: string;
  target: number;
  seeds: number;
  baseSeed: number;
  minFactor?: number;
  maxFactor?: number;
  maxTrials?: number;
}): KnobSolution {
  const minF = o.minFactor ?? 0.4, maxF = o.maxFactor ?? 2.5;
  const seedList = seedsFor(o.baseSeed, o.seeds);
  const meanOfMetric = (eps: EpisodeResult[]): number => eps.reduce((s, e) => s + metricAt(e, o.metric), 0) / eps.length;
  const measure = (factor: number): EpisodeResult[] => {
    const applied = applyKnobs([parseKnob(`${o.path}*${factor}`)]);
    try {
      if (applied.errors.length) throw new Error(applied.errors.join('; '));
      return runBatch(o.scenario, seedList);
    } finally { applied.restore(); }
  };
  const baseEps = runBatch(o.scenario, seedList);
  const v0 = meanOfMetric(baseEps);
  let episodes = baseEps.length;
  const trials: { factor: number; value: number }[] = [{ factor: 1, value: v0 }];
  // First step: the proportional guess, as if the metric scaled with the knob.
  let factor = v0 > 0 ? Math.min(maxF, Math.max(minF, o.target / v0)) : maxF;
  let bestEps = baseEps;
  let elasticity = 1;
  for (let t = 0; t < (o.maxTrials ?? 3); t++) {
    factor = roundForAuthor(factor);
    if (trials.some(x => x.factor === factor)) break;
    const eps = measure(factor);
    episodes += eps.length;
    const v = meanOfMetric(eps);
    trials.push({ factor, value: v });
    const best = trials.reduce((a, b) => (Math.abs(b.value - o.target) < Math.abs(a.value - o.target) ? b : a));
    if (best.factor === factor) bestEps = eps;
    const a = trials[trials.length - 2], b = trials[trials.length - 1];
    if (a.value > 0 && b.value > 0 && a.factor !== b.factor) {
      elasticity = Math.log(b.value / a.value) / Math.log(b.factor / a.factor);
    }
    if (Math.abs(v - o.target) <= Math.abs(o.target) * 0.03 || Math.abs(elasticity) < 1e-3 || v <= 0) break;
    factor = Math.min(maxF, Math.max(minF, b.factor * (o.target / b.value) ** (1 / elasticity)));
  }
  const best = trials.reduce((a, b) => (Math.abs(b.value - o.target) < Math.abs(a.value - o.target) ? b : a));
  const closure = v0 !== o.target ? (best.value - v0) / (o.target - v0) : 1;
  // The whole move, base to best: a last step's slope says little near the limit.
  if (best.factor !== 1 && v0 > 0 && best.value > 0) elasticity = Math.log(best.value / v0) / Math.log(best.factor);
  return {
    path: o.path, factor: best.factor, metric: o.metric, target: o.target,
    before: pairedRead(baseEps.map(e => metricAt(e, o.metric)), bestEps.map(e => metricAt(e, o.metric)), deriveSeed(o.baseSeed, 0x501e)),
    achieved: best.value, closure, elasticity,
    unreachable: closure < 0.5 || Math.abs(elasticity) < 0.15,
    trials, episodes,
  };
}
