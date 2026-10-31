// ---------------------------------------------------------------------------
// ROBUST STATISTICS — the arithmetic the farm's honesty rules lean on.
//
// Everything here is pure and browser-safe. Bootstraps take an explicit seed, so
// a report's confidence intervals reproduce exactly from its command line.
//
// The readings are chosen for this data's shape: strongly skewed, heavy-tailed
// output numbers with real zeros. Log-scale median and MAD do not get dragged
// by the very outliers they are meant to find, where a mean and SD would.
// ---------------------------------------------------------------------------

import { mulberry32 } from './rng';

export function median(xs: readonly number[]): number {
  if (!xs.length) return NaN;
  const v = [...xs].sort((a, b) => a - b);
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/** Median absolute deviation (unscaled). */
export function mad(xs: readonly number[], center = median(xs)): number {
  return median(xs.map(x => Math.abs(x - center)));
}

export function meanOf(xs: readonly number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
}

export function sdOf(xs: readonly number[], center = meanOf(xs)): number {
  if (xs.length < 2) return 0;
  return Math.sqrt(xs.reduce((s, x) => s + (x - center) ** 2, 0) / (xs.length - 1));
}

/** Iglewicz-Hoaglin modified z: comparable to a normal z under normal data, and
 *  unmoved by the outliers it flags. A zero MAD (over half the cohort identical)
 *  falls back to the mean absolute deviation; a flat cohort reads 0. */
export function robustZ(x: number, center: number, spread: number, meanAbs = 0): number {
  if (spread > 0) return 0.6745 * (x - center) / spread;
  if (meanAbs > 0) return (x - center) / (1.2533 * meanAbs);
  return 0;
}

export interface CohortRead {
  id: string;
  value: number;
  /** Modified z on the log scale. */
  z: number;
  /** value ÷ the cohort median: "how many times the typical row". */
  ratio: number;
}

export interface CohortSummary {
  cohort: string;
  n: number;
  /** Cohort median on the natural scale. */
  median: number;
  p10: number;
  p90: number;
  /** p90 ÷ p10: the spread a balance conversation is about. */
  spread: number;
  rows: CohortRead[];
}

/** Rank one cohort. Only positive values enter the log-scale statistics: zeros
 *  are triage, never outliers (the playbook's rule), and the caller counts them
 *  separately. A cohort of fewer than `minN` rows returns rows with z 0, because
 *  a spread of three is no spread. */
export function readCohort(
  cohort: string, rows: readonly { id: string; value: number }[], minN = 6,
): CohortSummary {
  const live = rows.filter(r => r.value > 0 && Number.isFinite(r.value));
  const logs = live.map(r => Math.log(r.value));
  const center = median(logs);
  const spread = mad(logs, center);
  const meanAbs = logs.length ? logs.reduce((s, x) => s + Math.abs(x - center), 0) / logs.length : 0;
  const med = logs.length ? Math.exp(center) : 0;
  const sorted = live.map(r => r.value).sort((a, b) => a - b);
  const p = (q: number): number => {
    if (!sorted.length) return 0;
    const pos = (sorted.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  };
  return {
    cohort, n: live.length, median: med, p10: p(0.1), p90: p(0.9),
    spread: p(0.1) > 0 ? p(0.9) / p(0.1) : 0,
    rows: live.map(r => ({
      id: r.id, value: r.value,
      z: live.length >= minN ? robustZ(Math.log(r.value), center, spread, meanAbs) : 0,
      ratio: med > 0 ? r.value / med : 0,
    })),
  };
}

/** Percentile bootstrap of the mean, seeded. */
export function bootstrapMeanCI(
  xs: readonly number[], seed: number, resamples = 2000, alpha = 0.05,
): { lo: number; hi: number } {
  if (!xs.length) return { lo: NaN, hi: NaN };
  if (xs.length === 1) return { lo: xs[0], hi: xs[0] };
  const rng = mulberry32(seed);
  const means = new Array<number>(resamples);
  const n = xs.length;
  for (let b = 0; b < resamples; b++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += xs[Math.floor(rng() * n)];
    means[b] = s / n;
  }
  means.sort((a, b) => a - b);
  return {
    lo: means[Math.floor((alpha / 2) * (resamples - 1))],
    hi: means[Math.ceil((1 - alpha / 2) * (resamples - 1))],
  };
}

/** Exact-ish two-sided sign-flip p-value for paired differences. Under "the knob
 *  did nothing" a pair's sign is a coin, so this is the honest test for the
 *  small n a seeded episode batch gives. Exact to 2^12 enumerations, sampled
 *  past that. */
export function signFlipP(diffs: readonly number[], seed: number, samples = 8192): number {
  const d = diffs.filter(x => x !== 0);
  if (!d.length) return 1;
  const obs = Math.abs(d.reduce((a, b) => a + b, 0));
  let extreme = 0, total = 0;
  if (d.length <= 12) {
    const combos = 1 << d.length;
    for (let mask = 0; mask < combos; mask++) {
      let s = 0;
      for (let i = 0; i < d.length; i++) s += mask & (1 << i) ? d[i] : -d[i];
      if (Math.abs(s) >= obs - 1e-12) extreme++;
      total++;
    }
  } else {
    const rng = mulberry32(seed);
    for (let k = 0; k < samples; k++) {
      let s = 0;
      for (let i = 0; i < d.length; i++) s += rng() < 0.5 ? d[i] : -d[i];
      if (Math.abs(s) >= obs - 1e-12) extreme++;
      total++;
    }
  }
  return (extreme + 1) / (total + 1);
}

export type PairedVerdict =
  /** The two runs are byte-identical on every seed. */
  | 'identical'
  /** |Δ| < sd: the playbook's coin flip, whatever the interval says. */
  | 'coin_flip'
  /** The interval straddles zero: add seeds before claiming anything. */
  | 'inconclusive'
  /** Interval clear of zero and |Δ| ≥ sd. */
  | 'moved';

export interface PairedRead {
  n: number;
  before: number;
  after: number;
  delta: number;
  /** delta ÷ |before|; null where before is 0. */
  relative: number | null;
  /** SD of the per-seed differences. */
  sdDiff: number;
  /** SD of the 'before' row across seeds: the playbook's "|Δ| < sd" yardstick. */
  sdBefore: number;
  lo: number;
  hi: number;
  p: number;
  verdict: PairedVerdict;
}

/** Common-random-numbers comparison of one metric across seeds. */
export function pairedRead(
  before: readonly number[], after: readonly number[], seed: number,
): PairedRead {
  const n = Math.min(before.length, after.length);
  const a = before.slice(0, n), b = after.slice(0, n);
  const diffs = a.map((x, i) => b[i] - x);
  const delta = meanOf(diffs);
  const beforeM = meanOf(a), afterM = meanOf(b);
  const sdDiff = sdOf(diffs);
  const sdBefore = sdOf(a);
  const ci = bootstrapMeanCI(diffs, seed);
  const p = signFlipP(diffs, seed ^ 0x5eed);
  const identical = diffs.every(d => d === 0);
  let verdict: PairedVerdict = 'moved';
  if (identical) verdict = 'identical';
  else if (Math.abs(delta) < Math.max(sdBefore, sdDiff / Math.sqrt(Math.max(1, n)))) verdict = 'coin_flip';
  else if (ci.lo <= 0 && ci.hi >= 0) verdict = 'inconclusive';
  return {
    n, before: beforeM, after: afterM, delta,
    relative: beforeM !== 0 ? delta / Math.abs(beforeM) : null,
    sdDiff, sdBefore, lo: ci.lo, hi: ci.hi, p, verdict,
  };
}

/** Benjamini-Hochberg false-discovery control over a family of p-values. Returns
 *  the indices that survive at level q. A night tests thousands of rows; without
 *  this, chance alone would mint a steady supply of "findings". */
export function benjaminiHochberg(ps: readonly number[], q = 0.05): Set<number> {
  const order = ps.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
  let cut = -1;
  for (let k = 0; k < order.length; k++) {
    if (order[k].p <= ((k + 1) / order.length) * q) cut = k;
  }
  return new Set(order.slice(0, cut + 1).map(r => r.i));
}

export interface EffectRow { y: number; factors: readonly string[] }

export interface EffectsFit {
  mu: number;
  /** factor token → additive effect on y, with its row count. */
  effects: Record<string, { effect: number; n: number }>;
  /** Per-row residual, row order. */
  residuals: number[];
  residualMad: number;
}

/** Backfitted additive main effects over sparse categorical factors: "what does
 *  this support (or unique, or class) add on average, across the builds it
 *  appeared in?" Interactions are what the residuals hold, so a large residual
 *  is a combination that behaves unlike the sum of its parts: exactly the shape
 *  a broken combo has. Shrinkage keeps a factor seen twice from claiming a huge
 *  effect. Linear in rows × factors per pass. */
export function fitMainEffects(rows: readonly EffectRow[], passes = 8, shrink = 2): EffectsFit {
  const mu = rows.length ? meanOf(rows.map(r => r.y)) : 0;
  const res = rows.map(r => r.y - mu);
  const index = new Map<string, number[]>();
  rows.forEach((r, i) => { for (const f of r.factors) (index.get(f) ?? index.set(f, []).get(f)!).push(i); });
  const factors = [...index.keys()].sort();
  const effect = new Map<string, number>();
  // Coordinate descent on a ridge objective: one factor at a time against the live
  // residuals. Updating all at once diverges when factors co-occur (a primary skill
  // always appears beside its own skill token); this cannot.
  for (let pass = 0; pass < passes; pass++) {
    for (const f of factors) {
      const at = index.get(f)!;
      const cur = effect.get(f) ?? 0;
      let sum = 0;
      for (const i of at) sum += res[i] + cur;
      const next = sum / (at.length + shrink);
      for (const i of at) res[i] += cur - next;
      effect.set(f, next);
    }
  }
  const effects: EffectsFit['effects'] = {};
  for (const f of factors) effects[f] = { effect: effect.get(f) ?? 0, n: index.get(f)!.length };
  return { mu, effects, residuals: res, residualMad: mad(res) };
}
