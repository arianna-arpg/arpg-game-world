// THE RESIDENCY INSTRUMENT's pure half (src/dev/perfResidency.ts) on fixtures: the request validation that refuses before
// any start, the regime read from actual censuses, the visited-order derivation, the least-squares slopes, the heap read
// and the spoken notes. No browser, no world, no launcher. The courses themselves (src/dev/perf.ts --fresh / --ramp /
// --ramp-age-control) run only under the desktop harness; this check pins what they validate and fold. Standalone
// (outside the roster): exit 1 on FAIL.
import { leastSquaresSlope, rampSlopes, rampListFor, heapMB, regimeOf, validateResidencyCourse, RAMP_DEFAULT_STEPS, RAMP_MAX_STEPS, SEED_MAX, RAMP_METRICS, RESIDENCY_COURSE_NOTES } from '../src/dev/perfResidency';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' : ' + detail : ''}`); if (!ok) failed++; };
const near = (a: number | null, b: number, eps = 1e-6): boolean => a !== null && Math.abs(a - b) <= eps;
const faults = (o: Parameters<typeof validateResidencyCourse>[0]): string => validateResidencyCourse(o).join(' | ');

// ---- the request validation: refused before any start ----
check('validate: the original course (no residency option) passes untouched', faults({}) === '' && faults({ course: 'cumulative' }) === '' && faults({ course: undefined, filter: 'mire' }) === '');
check('validate: residency options without an additive course are refused by name', /residency options without an additive course: seed, rampSteps/.test(faults({ seed: 1, rampSteps: 3 })));
check('validate: an unknown course is refused', /unknown course "walk"/.test(faults({ course: 'walk', seed: 1 })));
check('validate: a fresh course with its seed passes; zero is a seed', faults({ course: 'fresh', seed: 20261016 }) === '' && faults({ course: 'fresh', seed: 0 }) === '');
check('validate: an additive course without a seed is refused', /needs its matched start seed/.test(faults({ course: 'fresh' })) && /needs its matched start seed/.test(faults({ course: 'ramp' })));
check('validate: a non-integer, negative, NaN, Infinity or too-large seed is refused', [1.5, -1, Number.NaN, Number.POSITIVE_INFINITY, SEED_MAX + 1, '7'].every(s => /seed must be an integer in \[0, 4294967295\]/.test(faults({ course: 'fresh', seed: s }))));
check('validate: --fresh takes no ramp option', /--fresh takes no ramp option \(rampSteps\)/.test(faults({ course: 'fresh', seed: 1, rampSteps: 3 })) && /\(rampList\)/.test(faults({ course: 'fresh', seed: 1, rampList: ['a'] })) && /\(rampAgeControl\)/.test(faults({ course: 'fresh', seed: 1, rampAgeControl: true })));
check('validate: a ramp with default steps passes, with an explicit count passes, at the ceiling passes', faults({ course: 'ramp', seed: 1 }) === '' && faults({ course: 'ramp', seed: 1, rampSteps: 51 }) === '' && faults({ course: 'ramp', seed: 1, rampSteps: RAMP_MAX_STEPS }) === '');
check('validate: zero, fractional, NaN, Infinity and over-ceiling step counts are refused', [0, 2.5, Number.NaN, Number.POSITIVE_INFINITY, RAMP_MAX_STEPS + 1, '8'].every(n => /rampSteps must be an integer in \[1, 200\]/.test(faults({ course: 'ramp', seed: 1, rampSteps: n }))));
check('validate: the age control with a count passes; with Infinity it is refused, never unbounded', faults({ course: 'ramp', seed: 1, rampAgeControl: true, rampSteps: 8 }) === '' && /rampSteps must be an integer/.test(faults({ course: 'ramp', seed: 1, rampAgeControl: true, rampSteps: Number.POSITIVE_INFINITY })));
check('validate: a non-boolean age control is refused', /rampAgeControl must be boolean/.test(faults({ course: 'ramp', seed: 1, rampAgeControl: 'yes' })));
check('validate: a list passes alone, or with the matching count', faults({ course: 'ramp', seed: 1, rampList: ['jungle', 'sandsea'] }) === '' && faults({ course: 'ramp', seed: 1, rampList: ['jungle', 'sandsea'], rampSteps: 3 }) === '');
check('validate: a list disagreeing with the count is refused', /rampSteps 8 disagrees with the list \(2 visits make 3 steps\)/.test(faults({ course: 'ramp', seed: 1, rampList: ['jungle', 'sandsea'], rampSteps: 8 })));
check('validate: an empty list, a non-string entry, an empty entry and a repeat are refused', /non-empty list/.test(faults({ course: 'ramp', seed: 1, rampList: [] })) && /non-empty list/.test(faults({ course: 'ramp', seed: 1, rampList: [7] })) && /non-empty list/.test(faults({ course: 'ramp', seed: 1, rampList: ['jungle', ' '] })) && /repeats a tileset/.test(faults({ course: 'ramp', seed: 1, rampList: ['jungle', 'jungle'] })));
check('validate: a list with the age control contradicts', /--ramp-list and --ramp-age-control contradict/.test(faults({ course: 'ramp', seed: 1, rampList: ['jungle'], rampAgeControl: true })));
check('validate: a filter on the ramp is undefined and refused; an empty filter is fine', /--filter is undefined for the ramp/.test(faults({ course: 'ramp', seed: 1, filter: 'mire' })) && faults({ course: 'ramp', seed: 1, filter: '' }) === '' && faults({ course: 'fresh', seed: 1, filter: 'mire' }) === '');
check('validate: every fault is reported, not just the first', validateResidencyCourse({ course: 'ramp', rampSteps: 0, rampList: ['a', 'a'], rampAgeControl: true, filter: 'x' }).length === 5);

// ---- the regime ----
check('regime: the expected contrast reads plainly', JSON.stringify(regimeOf({ residentAreas: 1, residentActors: 19 }, { residentAreas: 2, residentActors: 53 })) === JSON.stringify({ regime: 'control 1 area / zone 2 areas', expected: true }));
check('regime: anything else is preserved and marked UNEXPECTED', regimeOf({ residentAreas: 2, residentActors: 40 }, { residentAreas: 3, residentActors: 90 }).regime === 'control 2 areas / zone 3 areas UNEXPECTED (the course expects 1 / 2)' && regimeOf({ residentAreas: 1, residentActors: 19 }, { residentAreas: 1, residentActors: 19 }).expected === false);

// ---- the slope ----
check('slope: a straight line reads its own slope', near(leastSquaresSlope([1, 2, 3, 4], [3, 5, 7, 9]), 2));
check('slope: noise around a line reads the least-squares slope', near(leastSquaresSlope([1, 2, 3], [1, 3, 2]), 0.5));
check('slope: one point has no slope', leastSquaresSlope([1], [5]) === null);
check('slope: every point at one residency has no slope (the age control by construction)', leastSquaresSlope([1, 1, 1], [1, 5, 9]) === null);
check('slope: unequal lengths read the shorter', near(leastSquaresSlope([1, 2, 3, 99], [2, 4, 6]), 2));
check('slope: empty input has no slope', leastSquaresSlope([], []) === null);

// ---- the ramp fold ----
{
  const points = [
    { residentAreas: 1, residentActors: 19, gapP50: 8, gapP99: 20, simP99: 4, taskMax: 30 },
    { residentAreas: 2, residentActors: 53, gapP50: 9, gapP99: 24, simP99: 5, taskMax: 30 },
    { residentAreas: 3, residentActors: 90, gapP50: 10, gapP99: 28, simP99: 6, taskMax: 30 },
  ];
  const s = rampSlopes(points);
  check('fold: one row per metric, in the declared order', s.map(x => x.metric).join(',') === RAMP_METRICS.join(',') && RAMP_METRICS.join(',') === 'gapP50,gapP99,simP99,taskMax');
  check('fold: ms per resident area', s[0].perArea === 1 && s[1].perArea === 4 && s[2].perArea === 1, JSON.stringify(s));
  check('fold: a flat metric reads a zero slope, not null', s[3].perArea === 0 && s[3].perHundredActors === 0);
  check('fold: ms per hundred resident bodies, rounded to a thousandth', s[0].perHundredActors === 2.815 && s[1].perHundredActors === 11.261, JSON.stringify([s[0].perHundredActors, s[1].perHundredActors]));
  check('fold: the point count rides every row', s.every(x => x.points === 3));
  const one = rampSlopes(points.slice(0, 1));
  check('fold: a single step has no slopes and says so with nulls', one.every(x => x.perArea === null && x.perHundredActors === null && x.points === 1));
  check('fold: no steps fold to nulls at zero points', rampSlopes([]).every(x => x.perArea === null && x.points === 0));
  const aged = rampSlopes(points.map(p => ({ ...p, residentAreas: 1, residentActors: 19 })));
  check('fold: the age control (constant residency) has no per-area or per-body slope, by construction', aged.every(x => x.perArea === null && x.perHundredActors === null));
}

// ---- the visited order ----
{
  const matrix = ['field', 'forest', 'jungle', 'marsh', 'sandsea', 'tundra'];
  check('order: pinned heavy faces first in matrix order, then light rows in matrix order', rampListFor(matrix, ['sandsea', 'jungle'], 4).join(',') === 'jungle,sandsea,field,forest');
  check('order: a count covering the matrix is the matrix in sweep order (the reproduction course)', rampListFor(matrix, ['sandsea', 'jungle'], 6).join(',') === matrix.join(',') && rampListFor(matrix, ['jungle'], 51).join(',') === matrix.join(','));
  check('order: a pinned id the matrix lacks is dropped, never minted', rampListFor(matrix, ['sandsea', 'realm_shelf'], 2).join(',') === 'sandsea,field');
  check('order: zero, negative and non-finite counts visit nothing', rampListFor(matrix, [], 0).length === 0 && rampListFor(matrix, [], -3).length === 0 && rampListFor(matrix, [], Number.NaN).length === 0);
  check('order: a fractional count floors', rampListFor(matrix, [], 2.9).join(',') === 'field,forest');
  check('order: a repeated matrix id is visited once', rampListFor(['a', 'b', 'a', 'c'], [], 9).join(',') === 'a,b,c');
  check('order: the default ramp is eight steps, so seven visits', RAMP_DEFAULT_STEPS === 8 && rampListFor(matrix, ['sandsea', 'jungle'], RAMP_DEFAULT_STEPS - 1).length === 6);
  check('order: never mutates its inputs', (() => { const m = [...matrix]; rampListFor(m, ['jungle'], 3); return m.join(',') === matrix.join(','); })());
}

// ---- the heap read ----
check('heap: Chromium heap in MB to a tenth', heapMB({ memory: { usedJSHeapSize: 1048576 * 12.34 } }) === 12.3);
check('heap: missing, non-numeric and non-finite reads are null, never a guess', heapMB({}) === null && heapMB({ memory: {} }) === null && heapMB({ memory: { usedJSHeapSize: 'big' } }) === null && heapMB({ memory: { usedJSHeapSize: Number.POSITIVE_INFINITY } }) === null);

// ---- the spoken notes ----
check('notes: the fresh row names its regime as unmatched, the slope as joint and never subtracted, the age control as a comparison', /unmatched/.test(RESIDENCY_COURSE_NOTES.freshContrast) && /never judged/.test(RESIDENCY_COURSE_NOTES.freshContrast) && /joint age\/residency/.test(RESIDENCY_COURSE_NOTES.slopes) && /no slope here is to be subtracted/.test(RESIDENCY_COURSE_NOTES.slopes) && /not an isolation/.test(RESIDENCY_COURSE_NOTES.ageControl) && !/isolates/.test(RESIDENCY_COURSE_NOTES.ageControl));
check('notes: the save reason names the instrument', /residency instrument/.test(RESIDENCY_COURSE_NOTES.saveReason));

console.log(failed ? `\n${failed} FAIL` : '\nALL PASS');
process.exit(failed ? 1 : 0);
