import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { verifiedMain } from './verified-main.mjs';
import { CLOCK_CFG, dispatchReason, gateDayStart, planClock, previewDue } from './full-gate-clock.mjs';
import { censusProblems, selectRows } from './run-ui-lane.mjs';
import { renderMarkdown, summarize } from './full-gate-report.mjs';

const yaml = createRequire(import.meta.url)('js-yaml');
const workflow = name => yaml.load(fs.readFileSync(`.github/workflows/${name}.yml`, 'utf8'));
// js-yaml reads the bare `on:` key as the boolean true.
const triggers = wf => wf.on ?? wf[true];

const passing = { id: 1, head_sha: 'current', head_branch: 'main', event: 'workflow_dispatch', status: 'completed', conclusion: 'success' };

test('publication requires a green full gate on the exact commit it publishes', () => {
  assert.deepEqual(verifiedMain({ mainSha: 'current', runs: [passing] }), { ready: true, sha: 'current' });
  assert.equal(verifiedMain({ mainSha: 'current', runs: [{ ...passing, event: 'push' }] }).ready, true);
  for (const run of [
    { ...passing, head_branch: 'topic' }, { ...passing, event: 'pull_request' }, { ...passing, status: 'in_progress' },
    { ...passing, conclusion: 'failure' }, { ...passing, conclusion: 'skipped' }, { ...passing, conclusion: 'cancelled' },
  ]) assert.throws(() => verifiedMain({ mainSha: 'current', runs: [run] }), /publication is blocked/);
  assert.throws(() => verifiedMain({ mainSha: 'current', runs: [] }), /publication is blocked/);
});

test('a completion publishes the commit it verified, never a newer unchecked head', () => {
  const run = { ...passing, head_sha: 'verified' };
  const result = verifiedMain({ mainSha: 'newer', runs: [run], event: { workflow_run: { head_branch: 'main', head_sha: 'verified' } } });
  assert.deepEqual(result, { ready: true, sha: 'verified' });
  const red = verifiedMain({ mainSha: 'newer', runs: [{ ...run, conclusion: 'failure' }], event: { workflow_run: { head_branch: 'main', head_sha: 'verified' } } });
  assert.equal(red.ready, false);
});

test('a scheduled caller gets the newest verified commit, not the unverified head', () => {
  const runs = [{ ...passing, id: 5, head_sha: 'older' }, { ...passing, id: 9, head_sha: 'newest-green' }, { ...passing, id: 12, head_sha: 'red', conclusion: 'failure' }];
  assert.deepEqual(verifiedMain({ mainSha: 'head', runs }), { ready: true, sha: 'newest-green' });
});

test('a seamless completion waits for main verification instead of publishing or failing spuriously', () => {
  const seamless = { workflow_run: { head_branch: 'codex/seamless-world-foundation', head_sha: 'other' } };
  for (const conclusion of [null, 'failure']) {
    const result = verifiedMain({ mainSha: 'current', event: seamless,
      runs: [{ ...passing, status: conclusion ? 'completed' : 'in_progress', conclusion }] });
    assert.equal(result.ready, false);
  }
  assert.equal(verifiedMain({ mainSha: 'current', runs: [passing], event: seamless }).sha, 'current');
});

// ---- the clock ------------------------------------------------------------

const at = text => new Date(`${text}Z`);
const run = (over = {}) => ({ id: 1, status: 'completed', conclusion: 'success', head_sha: 'head', created_at: '2026-11-02T08:00:00Z', updated_at: '2026-11-02T08:20:00Z', ...over });
const wake = over => ({ now: at('2026-11-02T10:00:00'), event: 'schedule', head: 'head', headMessage: 'A commit', runs: [run()], ...over });

test('a gate day starts at the anchor hour, and more anchors mean more gate days', () => {
  assert.equal(gateDayStart(at('2026-11-02T10:00:00'), [7]), Date.parse('2026-11-02T07:00:00Z'));
  assert.equal(gateDayStart(at('2026-11-02T06:59:00'), [7]), Date.parse('2026-11-01T07:00:00Z'));
  assert.equal(gateDayStart(at('2026-11-02T20:00:00'), [7, 19]), Date.parse('2026-11-02T19:00:00Z'));
  assert.equal(gateDayStart(at('2026-11-02T03:00:00'), [7, 19]), Date.parse('2026-11-01T19:00:00Z'));
});

test('the first wake of a gate day dispatches the gate even when nothing changed', () => {
  const yesterday = run({ created_at: '2026-11-02T06:00:00Z' });
  assert.match(dispatchReason(wake({ runs: [yesterday] })), /first full gate/);
  assert.match(dispatchReason(wake({ runs: [] })), /first full gate/);
  assert.match(dispatchReason(wake({ runs: [yesterday], event: 'push' })), /first full gate/);
});

test('later wakes of a gate day do nothing, however many fire', () => {
  for (const event of ['schedule', 'push', 'workflow_run', 'workflow_dispatch']) assert.equal(dispatchReason(wake({ event })), null);
  assert.equal(dispatchReason(wake({ head: 'newer', event: 'push' })), null);
});

test('only one full gate runs at a time', () => {
  const yesterday = run({ created_at: '2026-11-01T08:00:00Z' });
  for (const status of ['queued', 'in_progress', 'waiting', 'requested', 'pending']) {
    assert.equal(dispatchReason(wake({ runs: [yesterday, run({ id: 2, status, conclusion: null })] })), null);
  }
});

test('a commit can ask for the full gate when it lands', () => {
  const ask = { event: 'push', head: 'batch', headMessage: 'Land the big batch\n\n[full-gate]' };
  assert.match(dispatchReason(wake(ask)), /asked for it/);
  assert.equal(dispatchReason(wake({ ...ask, runs: [run({ head_sha: 'batch' })] })), null);
  assert.equal(dispatchReason(wake({ ...ask, event: 'schedule' })), null);
});

test('a red gate re-verifies as soon as main moves, and not before', () => {
  const red = run({ conclusion: 'failure' });
  assert.equal(dispatchReason(wake({ runs: [red] })), null);
  assert.match(dispatchReason(wake({ runs: [red], head: 'the-fix', event: 'push' })), /red and main has moved/);
  assert.match(dispatchReason(wake({ runs: [red], head: 'the-fix', event: 'schedule' })), /red and main has moved/);
});

test('a run that ended with no verdict runs again at the next wake', () => {
  for (const conclusion of CLOCK_CFG.noVerdict) assert.match(dispatchReason(wake({ runs: [run({ conclusion })] })), /no verdict/);
});

test('a red run re-runs its failed jobs once, then raises the single alarm', () => {
  const failed = { id: 7, conclusion: 'failure', attempt: 1, sha: 'head' };
  const red = run({ id: 7, conclusion: 'failure' });
  const first = planClock(wake({ event: 'workflow_run', runs: [red], completed: failed }));
  assert.deepEqual({ rerun: first.rerun, alarm: first.alarm, dispatch: first.dispatch }, { rerun: 7, alarm: null, dispatch: null });
  const second = planClock(wake({ event: 'workflow_run', runs: [red], completed: { ...failed, attempt: 2 } }));
  assert.equal(second.rerun, null);
  assert.equal(second.alarm, 'red');
});

test('a retry in flight holds new dispatches, even past a gate-day boundary', () => {
  const failed = { id: 7, conclusion: 'failure', attempt: 1, sha: 'head' };
  const plan = planClock(wake({ now: at('2026-11-03T08:00:00'), event: 'workflow_run', runs: [run({ id: 7, conclusion: 'failure' })], completed: failed }));
  assert.equal(plan.rerun, 7);
  assert.equal(plan.dispatch, null);
});

test('a green run closes the alarm, and cancelled runs raise nothing', () => {
  const green = planClock(wake({ event: 'workflow_run', alarmOpen: true, completed: { id: 7, conclusion: 'success', attempt: 1, sha: 'head' } }));
  assert.equal(green.closeAlarm, true);
  const cancelled = planClock(wake({ event: 'workflow_run', runs: [run({ conclusion: 'cancelled' })], completed: { id: 7, conclusion: 'cancelled', attempt: 1, sha: 'head' } }));
  assert.equal(cancelled.alarm, null);
  assert.equal(cancelled.rerun, null);
  assert.match(cancelled.dispatch, /no verdict/);
});

test('a final red on an old commit also re-verifies a newer main', () => {
  const plan = planClock(wake({ event: 'workflow_run', head: 'newer', runs: [run({ id: 7, conclusion: 'failure' })], completed: { id: 7, conclusion: 'failure', attempt: 2, sha: 'head' } }));
  assert.equal(plan.alarm, 'red');
  assert.match(plan.dispatch, /red and main has moved/);
});

test('an overdue gate is itself an alarm, once', () => {
  const old = run({ created_at: '2026-11-02T07:30:00Z', updated_at: '2026-10-30T07:40:00Z' });
  assert.equal(planClock(wake({ runs: [old] })).alarm, 'stale');
  assert.equal(planClock(wake({ runs: [old], alarmOpen: true })).alarm, null);
  assert.equal(planClock(wake({ runs: [run()] })).alarm, null);
});

test('a preview dispatches its own gate only while its head is unverified', () => {
  const now = at('2026-11-02T10:00:00');
  const old = { id: 1, status: 'completed', conclusion: 'success', head_sha: 'old', created_at: '2026-11-01T08:00:00Z' };
  assert.equal(previewDue({ now, head: 'new', runs: [old] }), true);
  assert.equal(previewDue({ now, head: 'old', runs: [old] }), false);
  assert.equal(previewDue({ now, head: 'new', runs: [{ ...old, created_at: '2026-11-02T08:00:00Z' }] }), false);
  assert.equal(previewDue({ now, head: 'new', runs: [{ ...old, status: 'in_progress', conclusion: null }] }), false);
  assert.equal(previewDue({ now, head: 'old', runs: [{ ...old, conclusion: 'failure' }] }), false);
  assert.equal(previewDue({ now, head: 'old', runs: [{ ...old, conclusion: 'cancelled' }] }), true);
  assert.equal(previewDue({ now, head: null, runs: [] }), false);
});

// ---- the workflows themselves ---------------------------------------------

test('the required status lives only on the commit check, and passes only if every lane did', () => {
  const check = workflow('commit-check');
  assert.ok(check.jobs.check, 'branch protection requires a job named "check"');
  assert.deepEqual(check.jobs.check.needs, ['quick', 'client', 'probes']);
  assert.equal(check.jobs.check.if, 'always()');
  assert.match(check.jobs.check.steps.at(-1).run, /all\(\.\[\]; \.result == "success"\)/);
  for (const file of fs.readdirSync('.github/workflows').filter(f => f.endsWith('.yml') && f !== 'commit-check.yml')) {
    assert.ok(!yaml.load(fs.readFileSync(`.github/workflows/${file}`, 'utf8')).jobs.check, `${file} must not report a "check" status`);
  }
});

test('the commit check runs on every push and pull request', () => {
  const on = triggers(workflow('commit-check'));
  assert.deepEqual(on.push.branches, ['**']);
  assert.ok('pull_request' in on);
});

test('the full gate only runs by dispatch and cannot conclude green without doing its work', () => {
  const gate = workflow('ci');
  assert.deepEqual(Object.keys(triggers(gate)), ['workflow_dispatch']);
  assert.equal(gate.concurrency['cancel-in-progress'], false);
  const verdict = gate.jobs['full-gate'];
  assert.equal(verdict.if, 'always()');
  assert.match(verdict.steps.at(-1).run, /all\(\.\[\]; \.result == "success"\)/);
  const lanes = Object.keys(gate.jobs).filter(job => !['full-gate', 'report'].includes(job));
  assert.deepEqual([...verdict.needs].sort(), [...lanes].sort(), 'every lane must feed the verdict');
  for (const job of lanes) assert.equal(gate.jobs[job].if, undefined, `lane ${job} must not be skippable`);
  assert.equal(gate.jobs.report['continue-on-error'], true, 'a reporting hiccup must not change the verdict');
});

test('the full gate runs everything the commit check does, and more', () => {
  const gate = workflow('ci').jobs;
  const check = workflow('commit-check').jobs;
  for (const lane of ['quick', 'client', 'probes']) assert.equal(gate[lane].uses, check[lane].uses);
  assert.match(check.probes.with.args, /--slow/, 'every push runs the whole green roster');
  assert.match(gate.probes.with.args, /--slow/);
  assert.match(gate.probes.with.args, /--all/);
  assert.match(gate.probes.with.args, /--engine tsx/);
  assert.ok(gate.ui, 'the full gate sweeps the UI harnesses');
});

test('everything that publishes waits on the full gate', () => {
  for (const name of ['pages', 'sync-main']) {
    const wf = workflow(name);
    assert.deepEqual(triggers(wf).workflow_run.workflows, ['ci'], `${name} must follow the full gate`);
    assert.match(wf.jobs.verify.if, /conclusion == 'success'/, `${name} must require success`);
    assert.match(wf.jobs.verify.if, /event == 'workflow_dispatch'/, `${name} must accept the full gate's dispatched runs`);
    assert.ok(wf.jobs.verify.steps.some(step => step.run === 'node scripts/verified-main.mjs'));
  }
  assert.ok(workflow('nightly').jobs.verify.steps.some(step => step.run === 'node scripts/verified-main.mjs'));
  for (const name of ['pages', 'sync-main', 'nightly']) {
    assert.ok(!JSON.stringify(triggers(workflow(name))).includes('commit-check'), `${name} must not follow the commit check`);
  }
});

test('the clock can wake from every source and is the only thing scheduling the gate', () => {
  const on = triggers(workflow('full-gate-clock'));
  assert.ok(on.schedule.length >= 3, 'one cron slot is one dropped run away from a missed day');
  assert.deepEqual(on.push.branches, ['main']);
  assert.deepEqual(on.workflow_run.workflows, ['ci']);
  assert.equal(workflow('full-gate-clock').concurrency['cancel-in-progress'], false);
});

// ---- the UI lane ----------------------------------------------------------

test('the UI roster and the directory agree, and every exclusion says why', () => {
  const { rows } = JSON.parse(fs.readFileSync('balance/uiroster.json', 'utf8'));
  const onDisk = fs.readdirSync('balance').filter(file => /-ui\.cjs$/.test(file)).sort();
  assert.deepEqual(censusProblems(rows, onDisk), []);
  for (const row of rows) for (const probe of row.before ?? []) assert.ok(fs.existsSync(`balance/${probe}`), `${row.harness} needs ${probe}`);
});

test('the UI census names every kind of drift', () => {
  const green = { harness: 'a-ui.cjs', status: 'green' };
  assert.match(censusProblems([], ['a-ui.cjs'])[0], /UNENROLLED/);
  assert.match(censusProblems([green], [])[0], /MISSING/);
  assert.match(censusProblems([green, green], ['a-ui.cjs'])[0], /DUPLICATE/);
  assert.match(censusProblems([{ harness: 'a-ui.cjs', status: 'excluded' }], ['a-ui.cjs'])[0], /NO EXCUSE/);
  assert.match(censusProblems([{ harness: 'a-ui.cjs', status: 'skipped' }], ['a-ui.cjs'])[0], /BAD STATUS/);
});

test('UI shards are disjoint and together total, and excluded rows join only on request', () => {
  const rows = ['d', 'a', 'c', 'b', 'e'].map(name => ({ harness: `${name}-ui.cjs`, status: name === 'e' ? 'excluded' : 'green' }));
  assert.equal(selectRows(rows).length, 4);
  assert.equal(selectRows(rows, { all: true }).length, 5);
  const shards = [1, 2, 3].flatMap(index => selectRows(rows, { all: true, shard: { index, of: 3 } }).map(row => row.harness));
  assert.deepEqual([...shards].sort(), rows.map(row => row.harness).sort());
  assert.equal(new Set(shards).size, rows.length);
  assert.deepEqual(selectRows(rows, { filter: 'e-ui' }).map(row => row.harness), ['e-ui.cjs']);
});

// ---- the report -----------------------------------------------------------

test('the report names failures and calls a failed lane red even without any failed rows', () => {
  const row = { name: 'probe_x.ts', gates: true, verdict: 'fail', sec: 3, failLines: ['FAIL it broke'] };
  const red = renderMarkdown(summarize([{ lane: 'probes', wallSec: 9, results: [row] }]), { needs: { probes: { result: 'failure' } }, sha: 'abcdef1234567' });
  assert.match(red, /RED at `abcdef123`/);
  assert.match(red, /probe_x\.ts/);
  assert.match(red, /FAIL it broke/);
  assert.match(renderMarkdown(summarize([]), { needs: { quick: { result: 'failure' } } }), /RED/);
  assert.match(renderMarkdown(summarize([{ lane: 'probes', wallSec: 1, results: [{ ...row, verdict: 'pass', failLines: [] }] }]), { needs: { probes: { result: 'success' } } }), /green/);
});
