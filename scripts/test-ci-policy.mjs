import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { verifiedMain } from './verified-main.mjs';
import { CLOCK_CFG, dispatchReason, followerDue, gateDayStart, planClock, previewDue, reportsOnly, runClock } from './full-gate-clock.mjs';
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

test('every caller gets the newest verified commit, not the unverified head', () => {
  const runs = [{ ...passing, id: 5, head_sha: 'older' }, { ...passing, id: 9, head_sha: 'newest-green' }, { ...passing, id: 12, head_sha: 'red', conclusion: 'failure' }];
  assert.deepEqual(verifiedMain({ mainSha: 'head', runs }), { ready: true, sha: 'newest-green' });
});

// ---- the clock ------------------------------------------------------------

const at = text => new Date(`${text}Z`);
const run = (over = {}) => ({ id: 1, status: 'completed', conclusion: 'success', run_attempt: 1, head_sha: 'head', created_at: '2026-11-02T08:00:00Z', updated_at: '2026-11-02T08:20:00Z', ...over });
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
  for (const event of ['schedule', 'push', 'workflow_dispatch']) assert.equal(dispatchReason(wake({ event })), null);
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
  const first = planClock(wake({ runs: [run({ id: 7, conclusion: 'failure' })] }));
  assert.deepEqual({ rerun: first.rerun, alarm: first.alarm, dispatch: first.dispatch }, { rerun: 7, alarm: null, dispatch: null });
  const second = planClock(wake({ runs: [run({ id: 7, conclusion: 'failure', run_attempt: 2 })] }));
  assert.equal(second.rerun, null);
  assert.equal(second.alarm, 'red');
});

test('a retry in flight holds new dispatches, even past a gate-day boundary', () => {
  const plan = planClock(wake({ now: at('2026-11-03T08:00:00'), runs: [run({ id: 7, conclusion: 'failure' })] }));
  assert.equal(plan.rerun, 7);
  assert.equal(plan.dispatch, null);
});

test('a green run closes the alarm, and cancelled runs raise nothing', () => {
  assert.equal(planClock(wake({ alarmOpen: true })).closeAlarm, true);
  const cancelled = planClock(wake({ runs: [run({ conclusion: 'cancelled' })] }));
  assert.equal(cancelled.alarm, null);
  assert.equal(cancelled.rerun, null);
  assert.match(cancelled.dispatch, /no verdict/);
});

test('a final red on an old commit also re-verifies a newer main', () => {
  const plan = planClock(wake({ head: 'newer', runs: [run({ id: 7, conclusion: 'failure', run_attempt: 2 })] }));
  assert.equal(plan.alarm, 'red');
  assert.match(plan.dispatch, /red and main has moved/);
});

test('a standing red feeds its alarm once, when the run itself sends the wake', () => {
  const runs = [run({ id: 7, conclusion: 'failure', run_attempt: 2 })];
  assert.equal(planClock(wake({ runs })).alarm, 'red', 'a lost wake must not leave a red run unreported');
  assert.equal(planClock(wake({ runs, alarmOpen: true })).alarm, null, 'scheduled wakes must not repeat themselves');
  assert.equal(planClock(wake({ runs, alarmOpen: true, announced: 7 })).alarm, 'red');
  assert.equal(planClock(wake({ runs, alarmOpen: true, announced: 6 })).alarm, null);
});

test('a gate still running is not read as finished', () => {
  const green = run({ id: 5, created_at: '2026-11-02T07:00:00Z', updated_at: '2026-11-02T07:20:00Z' });
  const older = run({ id: 6, conclusion: 'failure', run_attempt: 2, created_at: '2026-11-02T07:30:00Z' });
  const plan = planClock(wake({ runs: [green, older, run({ id: 7, status: 'in_progress', conclusion: null })] }));
  assert.deepEqual({ rerun: plan.rerun, alarm: plan.alarm, dispatch: plan.dispatch }, { rerun: null, alarm: null, dispatch: null });
  assert.equal(planClock(wake({ alarmOpen: true, runs: [run({ status: 'in_progress', conclusion: null })] })).closeAlarm, false);
});

test('a green gate reaches each follower once, whichever wake notices', () => {
  const green = run();
  const before = { id: 1, created_at: '2026-11-02T08:00:00Z' };
  const after = { id: 2, created_at: '2026-11-02T08:21:00Z' };
  assert.equal(followerDue({ greens: [green], started: [] }), true);
  assert.equal(followerDue({ greens: [green], started: [before] }), true);
  assert.equal(followerDue({ greens: [green], started: [before, after] }), false);
  assert.equal(followerDue({ greens: [], started: [] }), false);
  const plan = planClock(wake({ followers: [
    { workflow: 'pages.yml', greens: [green], started: [before] },
    { workflow: 'sync-main.yml', greens: [green], started: [after] },
  ] }));
  assert.deepEqual(plan.follow, ['pages.yml']);
});

test('an overdue gate is itself an alarm, once', () => {
  const old = run({ created_at: '2026-11-02T07:30:00Z', updated_at: '2026-10-30T07:40:00Z' });
  assert.equal(planClock(wake({ runs: [old] })).alarm, 'stale');
  assert.equal(planClock(wake({ runs: [old], alarmOpen: true })).alarm, null);
  assert.equal(planClock(wake({ runs: [old], alarmOpen: true })).closeAlarm, false, 'a green run too old to count must not close the alarm that says so');
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

// ---- the clock's GitHub side, driven with a fake gh ------------------------

/** A fake `gh`: records every call and answers from the facts it was given. */
function fakeGh({ runs = [], alarms = [], head = 'head-sha', message = 'A commit', logs = '', report = false, failRerun = false, previewRuns = {}, previewHeads = {}, followerRuns = {}, runStatus = () => 'completed' }) {
  const calls = [];
  const gh = (...args) => {
    calls.push(args);
    const [verb, target] = args;
    if (verb === 'api') {
      if (target.includes('/branches/main')) return JSON.stringify({ commit: { sha: head, commit: { message } } });
      if (target.includes('/branches/')) return JSON.stringify({ commit: { sha: previewHeads[decodeURIComponent(target.split('/branches/')[1])] } });
      if (target.includes('/workflows/ci.yml/runs')) {
        const branch = decodeURIComponent(/branch=([^&]+)/.exec(target)[1]);
        const rows = branch === 'main' ? runs : (previewRuns[branch] ?? []);
        return JSON.stringify({ workflow_runs: rows.map(row => ({ head_branch: branch, ...row })) });
      }
      const follower = /\/workflows\/([^/]+)\/runs/.exec(target);
      if (follower) return JSON.stringify({ workflow_runs: (followerRuns[follower[1]] ?? []).map(row => ({ head_branch: 'main', ...row })) });
      if (/\/actions\/runs\/\d+$/.test(target)) return JSON.stringify({ status: runStatus() });
      if (/\/runs\/\d+\/jobs/.test(target)) return JSON.stringify({ jobs: [{ id: 5, conclusion: 'failure' }, { id: 6, conclusion: 'success' }] });
      if (/\/jobs\/\d+\/logs/.test(target)) return logs;
    }
    if (verb === 'issue' && target === 'list') return JSON.stringify(alarms.map(number => ({ number })));
    if (verb === 'run' && target === 'download') {
      if (!report) throw new Error('no artifact');
      fs.writeFileSync(path.join(args[args.indexOf('--dir') + 1], 'report.md'), '## Full gate RED\n\nprobe_broken.ts failed');
      return '';
    }
    if (verb === 'run' && target === 'rerun' && failRerun) throw new Error('workflow is not rerunnable');
    return '';
  };
  return { gh, calls, did: (...prefix) => calls.filter(call => prefix.every((part, i) => call[i] === part)) };
}

const announcing = { inputs: { finished_run: '77' } };
const clock = (fake, over) => runClock({ gh: fake.gh, repo: 'o/r', event: 'workflow_dispatch', now: at('2026-11-02T10:00:00'), pause: async () => {}, ...over });
const greenToday = run({ id: 77, head_sha: 'head-sha' });
const redToday = run({ id: 77, head_sha: 'head-sha', conclusion: 'failure', run_attempt: 2, html_url: 'https://example.test/77' });
const redFirst = { ...redToday, run_attempt: 1 };
// Both followers started after today's gate finished, so they have nothing more to hear.
const reached = { 'pages.yml': [{ id: 50, created_at: '2026-11-02T09:00:00Z' }], 'sync-main.yml': [{ id: 51, created_at: '2026-11-02T09:00:00Z' }] };
const isRead = ([verb, target]) => verb === 'api' || (verb === 'issue' && target === 'list') || (verb === 'run' && target === 'download');

test('a final red opens the alarm with the merged report', async () => {
  const fake = fakeGh({ runs: [redToday], report: true });
  await clock(fake, { payload: announcing });
  const [created] = fake.did('issue', 'create');
  assert.ok(created, 'a red run must open the issue');
  assert.equal(created[created.indexOf('--label') + 1], CLOCK_CFG.alarmLabel);
  assert.match(created[created.indexOf('--body') + 1], /probe_broken\.ts failed/);
  assert.equal(fake.did('label', 'create', CLOCK_CFG.alarmLabel).length, 1);
});

test('a run that died before its report still alarms, with the failing log lines', async () => {
  const logs = '2026-11-02T08:00:00Z ok line\n2026-11-02T08:00:01Z FAIL it broke\n2026-11-02T08:00:02Z ##[error]Process completed with exit code 1.';
  const fake = fakeGh({ runs: [redToday], logs });
  await clock(fake, { payload: announcing });
  const body = fake.did('issue', 'create')[0].at(-1);
  assert.match(body, /FAIL it broke/);
  assert.match(body, /exit code 1/);
  assert.doesNotMatch(body, /ok line/);
  assert.match(body, /example\.test\/77/);
});

test('a further red feeds the one open issue instead of opening another', async () => {
  const fake = fakeGh({ runs: [redToday], alarms: [12], report: true });
  await clock(fake, { payload: announcing });
  assert.equal(fake.did('issue', 'create').length, 0);
  assert.equal(fake.did('issue', 'comment', '12').length, 1);
});

test('a first red re-runs only the failed jobs and raises nothing yet', async () => {
  const fake = fakeGh({ runs: [redFirst] });
  await clock(fake, { payload: announcing });
  assert.deepEqual(fake.did('run', 'rerun')[0], ['run', 'rerun', '77', '--failed', '--repo', 'o/r']);
  assert.equal(fake.did('issue', 'create').length, 0);
});

test('a red run that cannot be re-run alarms at once instead of going quiet', async () => {
  const fake = fakeGh({ runs: [redFirst], failRerun: true, report: true });
  await clock(fake, { payload: announcing });
  assert.equal(fake.did('issue', 'create').length, 1);
});

test('a green completion closes every open alarm', async () => {
  const fake = fakeGh({ runs: [greenToday], alarms: [12], followerRuns: reached });
  await clock(fake, { payload: announcing });
  assert.equal(fake.did('issue', 'close', '12').length, 1);
  assert.equal(fake.did('workflow', 'run').length, 0);
});

test('the first wake of a gate day dispatches the gate on main and waits to see it', async () => {
  const yesterday = run({ id: 1, head_sha: 'head-sha', created_at: '2026-11-01T08:00:00Z', updated_at: '2026-11-01T08:20:00Z' });
  const fake = fakeGh({ runs: [yesterday], followerRuns: reached });
  const realGh = fake.gh;
  let dispatched = false;
  const gh = (...args) => {
    if (args[0] === 'workflow') dispatched = true;
    const out = realGh(...args);
    if (dispatched && args[0] === 'api' && args[1].includes('/runs?')) {
      const parsed = JSON.parse(out);
      parsed.workflow_runs.push({ id: 2, head_branch: 'main', status: 'queued', conclusion: null, created_at: '2026-11-02T10:00:01Z' });
      return JSON.stringify(parsed);
    }
    return out;
  };
  let pauses = 0;
  await clock({ gh }, { event: 'schedule', pause: async () => { pauses++; } });
  assert.deepEqual(fake.did('workflow', 'run')[0], ['workflow', 'run', 'ci.yml', '--repo', 'o/r', '--ref', 'main']);
  assert.equal(pauses, 1, 'the wake must hold until the run is visible');
});

test('an overdue gate raises the alarm', async () => {
  const stale = run({ head_sha: 'head-sha', created_at: '2026-11-02T08:00:00Z', updated_at: '2026-10-30T08:00:00Z' });
  const fake = fakeGh({ runs: [stale], followerRuns: reached });
  await clock(fake, { event: 'schedule' });
  const [created] = fake.did('issue', 'create');
  assert.match(created[created.indexOf('--title') + 1], /overdue/);
});

test('a preview gets its own dispatch, and a broken preview cannot stop the clock', async () => {
  const previews = [{ ref: 'gone' }, { ref: 'seamless/world' }];
  const fake = fakeGh({
    runs: [greenToday],
    previewRuns: { 'seamless/world': [{ id: 9, status: 'completed', conclusion: 'success', head_sha: 'old', created_at: '2026-11-01T08:00:00Z' }] },
    previewHeads: { 'seamless/world': 'new' },
    followerRuns: reached,
  });
  const realGh = fake.gh;
  const gh = (...args) => {
    if (args[0] === 'api' && args[1].includes('branch=gone')) throw new Error('no such branch');
    return realGh(...args);
  };
  await clock({ gh }, { event: 'schedule', previews });
  assert.deepEqual(fake.did('workflow', 'run').map(call => call.at(-1)), ['seamless/world']);
});

test('a green gate starts its followers on main, in order, with or without a wake from it', async () => {
  for (const over of [{ event: 'schedule' }, { payload: announcing }]) {
    const fake = fakeGh({ runs: [greenToday] });
    await clock(fake, over);
    assert.deepEqual(fake.did('workflow', 'run').map(call => [call[2], call.at(-1)]), [['pages.yml', 'main'], ['sync-main.yml', 'main']]);
  }
});

test('a red gate starts nothing that publishes', async () => {
  const fake = fakeGh({ runs: [redToday], report: true });
  await clock(fake, { payload: announcing });
  assert.equal(fake.did('workflow', 'run').length, 0);
});

test('a green preview publishes but merges nothing, and only once main has a verified commit', async () => {
  const previews = [{ ref: 'seamless/world' }];
  const previewRuns = { 'seamless/world': [{ id: 9, status: 'completed', conclusion: 'success', head_sha: 'p', created_at: '2026-11-02T09:30:00Z' }] };
  const previewHeads = { 'seamless/world': 'p' };
  const withMain = fakeGh({ runs: [greenToday], previewRuns, previewHeads, followerRuns: reached });
  await clock(withMain, { event: 'schedule', previews });
  assert.deepEqual(withMain.did('workflow', 'run').map(call => call[2]), ['pages.yml']);
  const withoutMain = fakeGh({ runs: [redToday], previewRuns, previewHeads, followerRuns: reached, report: true });
  await clock(withoutMain, { event: 'schedule', previews });
  assert.equal(withoutMain.did('workflow', 'run').length, 0);
});

test('a broken listing or a failed start cannot stop the rest of a wake', async () => {
  const fake = fakeGh({ runs: [greenToday] });
  const gh = (...args) => {
    if (args[0] === 'workflow' && args[2] === 'pages.yml') { fake.calls.push(args); throw new Error('dispatch refused'); }
    return fake.gh(...args);
  };
  await clock({ gh }, { event: 'schedule' });
  assert.equal(fake.did('workflow', 'run', 'sync-main.yml').length, 1);

  const blind = fakeGh({ runs: [greenToday], alarms: [12], followerRuns: { 'sync-main.yml': reached['sync-main.yml'] } });
  const blindGh = (...args) => {
    if (args[0] === 'api' && args[1].includes('/workflows/pages.yml/')) throw new Error('listing refused');
    return blind.gh(...args);
  };
  await clock({ gh: blindGh }, { event: 'schedule' });
  assert.equal(blind.did('issue', 'close', '12').length, 1);
  assert.equal(blind.did('workflow', 'run').length, 0);
});

test('a wake sent by a finishing gate lets it close before reading it', async () => {
  let polls = 0, pauses = 0;
  const fake = fakeGh({ runs: [greenToday], followerRuns: reached, runStatus: () => (++polls < 3 ? 'in_progress' : 'completed') });
  await clock(fake, { payload: announcing, pause: async () => { pauses++; } });
  assert.equal(pauses, 2);

  let waited = 0;
  const open = fakeGh({ runs: [greenToday], alarms: [12], followerRuns: reached, runStatus: () => 'in_progress' });
  await clock(open, { payload: announcing, pause: async () => { waited++; } });
  assert.equal(waited, CLOCK_CFG.settleTries, 'the wait must be bounded');
  assert.equal(open.did('issue', 'close', '12').length, 1, 'a gate that will not close must not stop the wake');
});

test('only a real run id can make a wake wait', async () => {
  for (const finished_run of ['', 'not-a-run', '77; rm -rf /']) {
    const fake = fakeGh({ runs: [greenToday], followerRuns: reached });
    await clock(fake, { payload: { inputs: { finished_run } } });
    assert.equal(fake.calls.filter(call => call[0] === 'api' && /\/actions\/runs\/\d/.test(call[1])).length, 0);
  }
});

test('only the clock on main acts, so the whole path can be proven on a branch', async () => {
  assert.equal(reportsOnly('main'), false);
  for (const ref of ['claude/topic', 'codex/seamless-world-foundation', undefined]) assert.equal(reportsOnly(ref), true);
  const yesterday = run({ id: 1, head_sha: 'old', created_at: '2026-11-01T08:00:00Z', updated_at: '2026-11-01T08:20:00Z' });
  for (const facts of [
    { runs: [redFirst] }, { runs: [redToday], report: true }, { runs: [greenToday], alarms: [12] }, { runs: [yesterday] },
    { runs: [run({ head_sha: 'head-sha', created_at: '2026-11-02T08:00:00Z', updated_at: '2026-10-30T08:00:00Z' })] },
  ]) {
    const fake = fakeGh(facts);
    await clock(fake, { payload: announcing, reportOnly: true });
    assert.deepEqual(fake.calls.filter(call => !isRead(call)), [], 'a report-only clock must change nothing');
  }
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
  const lanes = Object.keys(gate.jobs).filter(job => !['full-gate', 'report', 'announce'].includes(job));
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
    assert.deepEqual(Object.keys(triggers(wf)), ['workflow_dispatch'], `${name} starts only when asked, and the clock asks after a green gate`);
    assert.ok(wf.jobs.verify.steps.some(step => step.run === 'node scripts/verified-main.mjs'));
    assert.ok(Object.entries(wf.jobs).every(([id, job]) => id === 'verify' || job.needs), `${name} must do nothing before it has verified`);
  }
  assert.ok(workflow('nightly').jobs.verify.steps.some(step => step.run === 'node scripts/verified-main.mjs'));
  for (const name of ['pages', 'sync-main', 'nightly']) {
    assert.ok(!JSON.stringify(triggers(workflow(name))).includes('commit-check'), `${name} must not follow the commit check`);
  }
});

test('the clock can wake from every source and is the only thing scheduling the gate', () => {
  const clockWorkflow = workflow('full-gate-clock');
  const on = triggers(clockWorkflow);
  assert.ok(on.schedule.length >= 3, 'one cron slot is one dropped run away from a missed day');
  assert.deepEqual(on.push.branches, ['main']);
  assert.ok(on.workflow_dispatch.inputs.finished_run, 'a finishing gate says which run it was');
  assert.equal(clockWorkflow.concurrency['cancel-in-progress'], false);
  assert.equal(clockWorkflow.permissions.actions, 'write', 'the clock starts the gate and what follows it');
  assert.equal(clockWorkflow.jobs.clock.steps[0].with.ref, '${{ github.ref }}', 'a dispatch on a branch runs that branch\'s rules, and only reports');
});

// GitHub starts no workflow_run for a run that GITHUB_TOKEN dispatched, and the clock
// dispatches the gate. Such a trigger reads correctly and never fires: for a day, every
// green gate published nothing and no red one was retried or reported.
test('nothing waits on workflow_run, and a finished gate wakes the clock itself', () => {
  for (const file of fs.readdirSync('.github/workflows').filter(f => f.endsWith('.yml'))) {
    const on = triggers(yaml.load(fs.readFileSync(`.github/workflows/${file}`, 'utf8')));
    assert.ok(!JSON.stringify(on).includes('workflow_run'), `${file} would never wake for a gate the clock dispatched`);
  }
  const { announce } = workflow('ci').jobs;
  assert.deepEqual(announce.needs, ['full-gate', 'report'], 'it must speak last, once the verdict and report exist');
  assert.equal(announce.if, '${{ !cancelled() }}', 'it must speak after a red run, and stay quiet after a cancelled one');
  assert.equal(announce['continue-on-error'], true, 'a hiccup here must not change the verdict');
  assert.deepEqual(announce.permissions, { actions: 'write' });
  assert.match(announce.steps.at(-1).run, /gh workflow run full-gate-clock\.yml .*--ref "\$GITHUB_REF_NAME" -f finished_run="\$GITHUB_RUN_ID"/);
  for (const { workflow: file } of CLOCK_CFG.followers) {
    assert.ok('workflow_dispatch' in triggers(workflow(file.replace(/\.yml$/, ''))), `the clock must be able to start ${file}`);
  }
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

test('the harnesses named by the npm test scripts are the ones every push runs', () => {
  const { rows } = JSON.parse(fs.readFileSync('balance/uiroster.json', 'utf8'));
  const { scripts } = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const named = ['test:reliability:ui', 'test:lighting', 'test:layers']
    .flatMap(script => [...scripts[script].matchAll(/electron balance\/(\S+-ui\.cjs)/g)].map(match => match[1]));
  const onCommit = selectRows(rows, { commit: true }).map(row => row.harness);
  assert.deepEqual([...named].sort(), onCommit);
  assert.match(workflow('lane-client').jobs.client.steps.map(step => step.run ?? '').join('\n'), /run-ui-lane\.mjs --commit/);
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
