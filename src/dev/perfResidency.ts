// ---------------------------------------------------------------------------
// THE RESIDENCY INSTRUMENT's pure half (docs/design/desktop-residency.md).
//
// The desktop sweep (src/dev/perf.ts) keeps every retained area resident for
// the rest of the run, so its later rows are cumulative-residency numbers.
// Policy D (her ruling 2026-10-16): the original cumulative course, its
// budgets and its gate stay as they are; two ADDITIVE, report-only courses
// measure the residency itself: `--fresh` (one fresh run per matrix row: the
// town at one resident area, the zone at two) and `--ramp` (one run, the town
// re-sampled after each visit while the residency grows), with `--ramp-age-
// control` as the ramp's comparison that visits nothing. This module holds
// the parts that need no browser: the report shapes, the request validation
// (refused before any start), the regime read, the visited-order derivation,
// the least-squares slopes and the heap read. balance/check_perfresidency.ts
// pins them; nothing here gates anything.
// ---------------------------------------------------------------------------

export type PerfCourse = 'cumulative' | 'fresh' | 'ramp';

/** The exact seed and pins a row minted with: the receipt names what was measured. */
export interface PerfMintReceipt { seed: number | null; variant: string | null; layout: string | null }
/** The whole retained census as the sweep reads it after a held window. */
export interface PerfCensus { residentAreas: number; residentActors: number }
/** Which start a sample belongs to: the ordinal of the fresh run (0 = the sweep's
 *  own start), its wall start, its startup cost and the manifest seed its world
 *  was dealt from. */
export interface PerfRuntimeIdentity { ordinal: number; startedAt: string; startupMs: number; manifestSeed: number }

/** One `--fresh` row: a fresh run, its town CONTROL, then the zone, each with the
 *  census actually read after its held window and the synchronous costs that
 *  preceded it. `Z` is the sweep's PerfZoneStats (kept generic so this module
 *  imports nothing from the browser side). */
export interface PerfFreshRow<Z = unknown> {
  tileset: string;
  runtime: PerfRuntimeIdentity;
  control: Z;
  controlCensus: PerfCensus;
  /** Wall ms of the synchronous travel home that preceded the control window (including the actual first return). */
  controlReturnSyncMs: number;
  mint: PerfMintReceipt;
  /** Wall ms of the synchronous mint and load that preceded the zone's entry window. */
  mintSyncMs: number;
  zone: Z;
  zoneCensus: PerfCensus;
  heapMB: { afterControl: number | null; afterZone: number | null };
  valid: boolean;
  issues: string[];
  /** The regime READ from the two censuses ('control 1 area / zone 2 areas'), marked UNEXPECTED when it is not the one the
   *  course expects; the row is preserved either way. */
  regime: string;
  expectedRegime: boolean;
  /** The regime's meaning, spelled out on every row: an UNMATCHED residency contrast. */
  contrast: string;
}

/** One ramp step: what was visited (null at step 0 and on the age control), the
 *  synchronous mint and travel costs, the visit's own entry burst, then the TOWN
 *  sampled with the full window pair, the census read after it, THE AGES and THE
 *  COMPLETED HISTORY beside it. */
export interface PerfRampStep<Z = unknown> {
  step: number;
  visited: string | null;
  mint: PerfMintReceipt | null;
  mintSyncMs: number | null;
  visitEntryWorstGap: number | null;
  visitHeld: boolean | null;
  /** Wall ms of the synchronous travel home that preceded the town window (including the actual initial return). */
  returnSyncMs: number;
  town: Z | null;
  residentAreas: number;
  residentActors: number;
  heapMB: number | null;
  /** THE AGES: wall ms since the sweep's own start and the campaign clock, both read after the town window. */
  wallMs: number;
  campaignSec: number;
  /** THE COMPLETED HISTORY up to and including this step's visit: every tileset visited and every skipped visit. */
  history: { visited: string[]; skipped: string[] };
  valid: boolean;
  issues: string[];
}

export interface PerfRampPoint { residentAreas: number; residentActors: number; gapP50: number; gapP99: number; simP99: number; taskMax: number }
export type PerfRampMetric = 'gapP50' | 'gapP99' | 'simP99' | 'taskMax';
export interface PerfRampSlope { metric: PerfRampMetric; perArea: number | null; perHundredActors: number | null; points: number }

export interface PerfRampReport<Z = unknown> {
  steps: PerfRampStep<Z>[];
  /** THE AGE CONTROL: nothing was visited; the residency stayed at one. */
  ageControl: boolean;
  /** The visited order asked for (steps 1..K-1). */
  list: string[];
  slopes: PerfRampSlope[];
  slopesNote: string;
  /** On the age control: what the comparison is and is not. */
  comparisonNote: string | null;
}

export const RAMP_DEFAULT_STEPS = 8;
/** The ceiling on a ramp's steps: a count past it is refused before any start, never run to the end of time. */
export const RAMP_MAX_STEPS = 200;
/** The largest manifest seed (a 32-bit unsigned integer). */
export const SEED_MAX = 0xffffffff;
export const RAMP_METRICS: readonly PerfRampMetric[] = ['gapP50', 'gapP99', 'simP99', 'taskMax'];

export const RESIDENCY_COURSE_NOTES = Object.freeze({
  saveReason: 'perf: residency instrument - nothing durable is written',
  freshContrast: 'unmatched residency contrast: the control at 1 resident area, the zone at 2; raw values, never judged against the cumulative caps',
  slopes: 'report-only: an observed joint age/residency curve, not the cost of residency alone; no slope here is to be subtracted from another course',
  ageControl: 'a comparison under unmatched ages, not an isolation: the age control omits the visited load, its steps are paced by the town alone and its residency is expected to stay constant (deviations are retained as invalid rows and omitted from slopes); read it beside the ramp by step and by the recorded wall and campaign ages',
});

/** The options an additive course may carry, as the launcher or a caller hands them in (unknown until validated). */
export interface ResidencyCourseOptions { course?: unknown; seed?: unknown; rampSteps?: unknown; rampList?: unknown; rampAgeControl?: unknown; filter?: unknown }

/** THE REQUEST VALIDATION (pure), run before any start: a course without its matched seed, a seed outside [0, SEED_MAX],
 *  a non-integer or unbounded step count, an empty or repeating visit list, a list disagreeing with the step count, and
 *  the contradictions (--fresh with any ramp option, --ramp-list with --ramp-age-control, --filter with the ramp, residency
 *  options without an additive course) are all refused by name. An empty list means the original course exactly. */
export function validateResidencyCourse(o: ResidencyCourseOptions): string[] {
  const e: string[] = [];
  const given = (['seed', 'rampSteps', 'rampList', 'rampAgeControl'] as const).filter(k => o[k] !== undefined);
  if (o.course === undefined || o.course === 'cumulative') {
    if (given.length) e.push(`residency options without an additive course: ${given.join(', ')}`);
    return e;
  }
  if (o.course !== 'fresh' && o.course !== 'ramp') { e.push(`unknown course ${JSON.stringify(o.course)}`); return e; }
  if (o.seed === undefined) e.push('an additive course needs its matched start seed');
  else if (typeof o.seed !== 'number' || !Number.isInteger(o.seed) || o.seed < 0 || o.seed > SEED_MAX) e.push(`seed must be an integer in [0, ${SEED_MAX}] (got ${String(o.seed)})`);
  if (o.course === 'fresh') {
    for (const k of ['rampSteps', 'rampList', 'rampAgeControl'] as const) if (o[k] !== undefined) e.push(`--fresh takes no ramp option (${k})`);
    return e;
  }
  if (typeof o.filter === 'string' && o.filter.trim() !== '') e.push('--filter is undefined for the ramp: its visited order is --ramp-list');
  if (o.rampSteps !== undefined && (typeof o.rampSteps !== 'number' || !Number.isInteger(o.rampSteps) || o.rampSteps < 1 || o.rampSteps > RAMP_MAX_STEPS)) e.push(`rampSteps must be an integer in [1, ${RAMP_MAX_STEPS}] (got ${String(o.rampSteps)})`);
  if (o.rampAgeControl !== undefined && typeof o.rampAgeControl !== 'boolean') e.push('rampAgeControl must be boolean');
  if (o.rampList !== undefined) {
    const l = o.rampList;
    if (!Array.isArray(l) || !l.length || !l.every(x => typeof x === 'string' && x.trim() !== '')) e.push('rampList must be a non-empty list of non-empty tileset ids');
    else if (new Set(l).size !== l.length) e.push('rampList repeats a tileset');
    else if (typeof o.rampSteps === 'number' && o.rampSteps !== l.length + 1) e.push(`rampSteps ${o.rampSteps} disagrees with the list (${l.length} visits make ${l.length + 1} steps)`);
    if (Array.isArray(l) && l.length + 1 > RAMP_MAX_STEPS) e.push(`rampList plus baseline exceeds ${RAMP_MAX_STEPS} steps`);
    if (o.rampAgeControl === true) e.push('--ramp-list and --ramp-age-control contradict: the age control visits nothing');
  }
  return e;
}

/** THE REGIME, read from the censuses actually taken after the two held windows, never assumed. */
export function regimeOf(control: PerfCensus, zone: PerfCensus): { regime: string; expected: boolean } {
  const expected = control.residentAreas === 1 && zone.residentAreas === 2;
  const text = `control ${control.residentAreas} area${control.residentAreas === 1 ? '' : 's'} / zone ${zone.residentAreas} area${zone.residentAreas === 1 ? '' : 's'}`;
  return { regime: expected ? text : `${text} UNEXPECTED (the course expects 1 / 2)`, expected };
}

/** Ordinary least squares slope of y over x; null below two points or when
 *  every x is the same (no slope exists, and none is invented). */
export function leastSquaresSlope(xs: readonly number[], ys: readonly number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return null;
  // Exact equality precedes averaging: a repeated decimal such as 0.19 can
  // otherwise acquire a nonzero variance solely from rounding its mean.
  let distinct = false;
  for (let i = 1; i < n; i++) if (xs[i] !== xs[0]) { distinct = true; break; }
  if (!distinct) return null;
  let sx = 0, sy = 0;
  for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; }
  const mx = sx / n, my = sy / n;
  let sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sxx += (xs[i] - mx) * (xs[i] - mx); sxy += (xs[i] - mx) * (ys[i] - my); }
  if (sxx === 0) return null;
  return sxy / sxx;
}

/** The four town metrics against resident areas and against resident bodies
 *  per hundred, rounded to a thousandth; `points` says how many steps held. */
export function rampSlopes(points: readonly PerfRampPoint[]): PerfRampSlope[] {
  const round = (v: number | null): number | null => (v === null ? null : +v.toFixed(3));
  return RAMP_METRICS.map(metric => ({
    metric,
    perArea: round(leastSquaresSlope(points.map(p => p.residentAreas), points.map(p => p[metric]))),
    perHundredActors: round(leastSquaresSlope(points.map(p => p.residentActors / 100), points.map(p => p[metric]))),
    points: points.length,
  }));
}

/** The ramp's visited order for steps 1..count. When the count covers the
 *  whole matrix, the matrix in SWEEP order (the cumulative walk's own order:
 *  the reproduction course). Otherwise the pinned heavy faces that stand in
 *  the matrix first, in matrix order, then the light rows in matrix order.
 *  Never a repeat, never an id the matrix lacks, never a negative count. */
export function rampListFor(matrix: readonly string[], pinned: readonly string[], count: number): string[] {
  const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  const unique = matrix.filter((id, i) => matrix.indexOf(id) === i);
  if (n >= unique.length) return unique;
  const heavy = unique.filter(id => pinned.includes(id));
  const light = unique.filter(id => !pinned.includes(id));
  return [...heavy, ...light].slice(0, n);
}

/** Chromium's non-standard heap read, in MB to a tenth; null where it is
 *  missing or not a finite number (a value, never a guess). */
export function heapMB(perf: { memory?: { usedJSHeapSize?: unknown } }): number | null {
  const v = perf.memory?.usedJSHeapSize;
  return typeof v === 'number' && Number.isFinite(v) ? +(v / 1048576).toFixed(1) : null;
}


/** Resolve membership against the actual chosen full matrix before a run starts.
 * An explicit matrix can admit a normally excluded registered ID; its exact
 * index stays the mint spread index. The legacy cumulative course is untouched. */
export function validateResidencyMatrix(o: ResidencyCourseOptions, matrix: readonly string[], registered: readonly string[]): string[] {
  if (o.course !== 'fresh' && o.course !== 'ramp') return [];
  const errors: string[] = [];
  if (!matrix.length) errors.push('selected residency matrix is empty');
  if (new Set(matrix).size !== matrix.length) errors.push('selected residency matrix repeats an id');
  for (const id of matrix) if (!registered.includes(id)) errors.push(`selected matrix id is not registered: ${id}`);
  if (Array.isArray(o.rampList)) for (const id of o.rampList) {
    if (typeof id === 'string' && !matrix.includes(id)) errors.push(`rampList id is outside the selected matrix: ${id}`);
  }
  return errors;
}

export interface PerfResidencyBoundary {
  /** Page performance clock and UTC clock; neither is rounded. */
  wallMs: number; wallAt: string; campaignSec: number;
  /** Per-invocation object identities, not claimed persistent gameplay IDs. */
  runtime: number; writer: number; area: number; zone: string;
  expectedRuntime: number; writerMatchesWorld: boolean; ready: boolean;
  census: PerfCensus;
}
export interface PerfResidencyError { name: string; message: string; stack: string | null }
export interface PerfResidencyWindow {
  index: number; tileset: string; attempt: number;
  phase: 'entry' | 'steady' | 'visit-entry' | 'retry-return';
  ingress: PerfResidencyBoundary; egress: PerfResidencyBoundary | null;
  held: boolean | null; error: PerfResidencyError | null;
  egressError: PerfResidencyError | null;
  issues: string[]; valid: boolean;
}
export function residencyError(error: unknown): PerfResidencyError {
  return error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack ?? null }
    : { name: typeof error, message: String(error), stack: null };
}
/** The reads bracket a window; they do not claim to observe every frame inside it.
 * A retry-return may change area, but may never change runtime/writer. Native
 * current/ready checks are performed by the caller before these values exist. */
export function residencyWindowIssues(w: Pick<PerfResidencyWindow, 'phase' | 'ingress' | 'egress' | 'held' | 'error' | 'egressError'>): string[] {
  const issues: string[] = [];
  const a = w.ingress, b = w.egress;
  if (w.error) issues.push(`window error: ${w.error.name}: ${w.error.message}`);
  if (w.egressError) issues.push(`egress unavailable: ${w.egressError.name}: ${w.egressError.message}`);
  if (!b) return [...issues, 'missing egress'];
  if (!a.ready || !b.ready) issues.push('runtime not ready at a boundary');
  if (!a.writerMatchesWorld || !b.writerMatchesWorld) issues.push('writer differs from current world');
  if (a.runtime !== a.expectedRuntime || b.runtime !== b.expectedRuntime || a.expectedRuntime !== b.expectedRuntime || a.runtime !== b.runtime) issues.push('runtime changed or differs from selected start');
  if (a.writer !== b.writer) issues.push('writer changed');
  if (w.phase !== 'retry-return' && (a.area !== b.area || a.zone !== b.zone)) issues.push('current area changed');
  if (![a.wallMs, b.wallMs, a.campaignSec, b.campaignSec].every(Number.isFinite) || b.wallMs < a.wallMs || b.campaignSec < a.campaignSec) issues.push('non-finite or reversed boundary clock');
  if (w.phase !== 'retry-return' && a.census.residentAreas !== b.census.residentAreas) issues.push('resident area census changed across window');
  if (w.held === false) issues.push('window not held');
  for (const c of [a.census, b.census]) if (!Number.isSafeInteger(c.residentAreas) || c.residentAreas < 1 || !Number.isSafeInteger(c.residentActors) || c.residentActors < 0) issues.push('invalid census');
  return issues;
}
/** Read every attempt's censuses. Discarded attempts stay visible and make the
 * measurement invalid for this instrument; a later clean retry does not erase
 * a changed owner, age-control census deviation, or earlier foreign frames. */
export function residencyRowIssues(windows: readonly PerfResidencyWindow[], expectedAreas?: number): string[] {
  const issues = windows.flatMap(w => w.issues.map(issue => `window ${w.index}: ${issue}`));
  if (!windows.length) issues.push('no window boundaries');
  if (expectedAreas !== undefined) for (const w of windows) {
    for (const [side, b] of [['ingress', w.ingress], ['egress', w.egress]] as const) {
      if (b && b.census.residentAreas !== expectedAreas) issues.push(`window ${w.index} ${side}: expected ${expectedAreas} resident areas, read ${b.census.residentAreas}`);
    }
  }
  return issues;
}
