// Additive residency receipt checks. Pure fixtures; no native lifecycle or performance claim.
// UNRUN in the source-only handoff. Run separately from historical assertions.
import assert from 'node:assert/strict';
import { validateResidencyCourse, validateResidencyMatrix, residencyWindowIssues, residencyRowIssues, type PerfResidencyBoundary, type PerfResidencyWindow } from '../src/dev/perfResidency';
const check = (name: string, operation: () => void): void => { operation(); console.log('PASS ' + name); };
const boundary = (extra: Partial<PerfResidencyBoundary> = {}): PerfResidencyBoundary => ({
  wallMs: 100.25, wallAt: '2026-10-16T00:00:00.000Z', campaignSec: 1.5,
  runtime: 1, expectedRuntime: 1, writer: 2, area: 3, zone: 'lastlight',
  ready: true, writerMatchesWorld: true, census: { residentAreas: 1, residentActors: 12 }, ...extra,
});
const window = (extra: Partial<PerfResidencyWindow> = {}): PerfResidencyWindow => {
  const row: PerfResidencyWindow = { index: 0, tileset: '(town)', attempt: 1, phase: 'entry', ingress: boundary(), egress: boundary({ wallMs: 250.75, campaignSec: 1.65 }), held: true, error: null, egressError: null, issues: [], valid: false, ...extra };
  row.issues = residencyWindowIssues(row); row.valid = !row.issues.length; return row;
};
check('effective explicit list includes the baseline in its 200-step ceiling', () => {
  assert.deepEqual(validateResidencyCourse({ course: 'ramp', seed: 0, rampList: Array.from({ length: 199 }, (_, i) => 'id' + i) }), []);
  assert.match(validateResidencyCourse({ course: 'ramp', seed: 0, rampList: Array.from({ length: 200 }, (_, i) => 'id' + i) }).join('|'), /plus baseline exceeds 200/);
});
check('a registered excluded tileset is refused; a deliberate exact matrix admits it', () => {
  const opts = { course: 'ramp', seed: 0, rampList: ['descent'] };
  assert.deepEqual(validateResidencyMatrix(opts, ['forest'], ['forest', 'descent']), ['rampList id is outside the selected matrix: descent']);
  assert.deepEqual(validateResidencyMatrix(opts, ['forest', 'descent'], ['forest', 'descent']), []);
  assert.deepEqual(validateResidencyMatrix({ course: 'cumulative' }, ['not-registered'], []), []);
  assert.match(validateResidencyMatrix({ course: 'fresh' }, ['missing'], ['forest']).join('|'), /not registered/);
  assert.match(validateResidencyMatrix({ course: 'fresh' }, ['forest', 'forest'], ['forest']).join('|'), /repeats/);
});
check('fractional clocks survive; normal actor-count changes do not invent owner drift', () => {
  const row = window({ egress: boundary({ wallMs: 250.75, campaignSec: 1.65, census: { residentAreas: 1, residentActors: 11 } }) });
  assert.equal(row.valid, true); assert.equal(row.ingress.campaignSec, 1.5); assert.equal(row.egress!.campaignSec, 1.65);
  assert.deepEqual(residencyRowIssues([row], 1), []);
});
check('same named area with a different object, writer or runtime stays invalid', () => {
  for (const changed of [{ area: 9 }, { writer: 9 }, { runtime: 9 }, { expectedRuntime: 9 }, { writerMatchesWorld: false }, { ready: false }]) {
    assert.equal(window({ egress: boundary(changed) }).valid, false, JSON.stringify(changed));
  }
  assert.equal(window({ egress: boundary({ campaignSec: 1.4 }) }).valid, false);
});
check('age-control deviation at ingress remains visible even if egress returns to one', () => {
  const row = window({ ingress: boundary({ census: { residentAreas: 2, residentActors: 25 } }) });
  assert.match(residencyRowIssues([row], 1).join('|'), /ingress: expected 1 resident areas, read 2/);
});
check('discarded retry windows and returns stay ordered and keep their raw clocks', () => {
  const discarded = window({ held: false, egress: boundary({ area: 8, zone: 'unexpected', wallMs: 151.125, campaignSec: 1.525 }) });
  const retry = window({ index: 1, phase: 'retry-return', ingress: discarded.egress!, egress: boundary({ wallMs: 159.25, campaignSec: 1.525 }) });
  const final = window({ index: 2, attempt: 2 });
  assert.equal(retry.valid, true); assert.equal(final.valid, true);
  assert.match(residencyRowIssues([discarded, retry, final]).join('|'), /window 0: window not held/);
  assert.equal(retry.egress!.wallMs - retry.ingress.wallMs, 8.125);
});
check('first error and unavailable egress stay separate; no missing boundary is a pass', () => {
  const row = window({ egress: null, held: null, error: { name: 'Error', message: 'first', stack: 'original' }, egressError: { name: 'Error', message: 'retired', stack: null } });
  assert.equal(row.valid, false); assert.equal(row.error!.message, 'first');
  assert.match(row.issues.join('|'), /first.*retired.*missing egress/);
  assert.deepEqual(residencyRowIssues([]), ['no window boundaries']);
});
console.log('ALL PASS: 7 residency boundary controls (pure fixtures only)');
