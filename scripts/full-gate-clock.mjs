// ---------------------------------------------------------------------------
// THE FULL-GATE CLOCK: what guarantees the full gate actually runs.
//
// ci.yml is the full gate and only ever runs by dispatch, so every run it has
// is a real one and "success" can never mean "skipped". This decides when to
// dispatch it. GitHub's cron cannot be trusted alone (the 08:37 UTC nightly
// routinely started four to seven hours late), so the clock is woken by several
// cron slots, every push to main, and every full-gate completion, and each wake
// asks the same questions of the same facts. The first wake of a gate day runs
// the gate; every later one finds nothing to do.
//
// It also owns the failure path: one automatic re-run of a red run's failed
// jobs, then the single rolling alarm issue that the owner and the daily
// check-in read. See docs/ai/test-cadence.md.
//
// planClock is pure so scripts/test-ci-policy.mjs can pin every rule.
// ---------------------------------------------------------------------------

import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const CLOCK_CFG = {
  workflow: 'ci.yml',
  branch: 'main',
  /** Gate days start at these UTC hours. One entry means once a day; add more for more. */
  anchorsUtc: [7],
  /** A commit message carrying this asks for the full gate as soon as it lands. */
  batchMarker: /\[full-gate\]/i,
  /** A red run gets this many attempts (the re-run covers failed jobs only). */
  maxAttempts: 2,
  /** No green full gate on main for this long is itself an alarm. */
  staleAfterHours: 36,
  alarmLabel: 'full-gate-red',
  /** Conclusions that say nothing about the code, so a later wake simply runs it again. */
  noVerdict: ['cancelled', 'timed_out', 'startup_failure', 'stale'],
};

const ACTIVE = new Set(['queued', 'in_progress', 'waiting', 'requested', 'pending']);
const created = run => Date.parse(run.created_at);

/** The start of the gate day containing `now`: the most recent anchor hour at or before it. */
export function gateDayStart(now, anchorsUtc = CLOCK_CFG.anchorsUtc) {
  const hours = [...anchorsUtc].sort((a, b) => b - a);
  const day = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  for (const hour of hours) {
    const anchor = day + hour * 3_600_000;
    if (anchor <= now.getTime()) return anchor;
  }
  return day - 86_400_000 + hours[0] * 3_600_000;
}

/** Why the full gate should run now, or null when it should not. */
export function dispatchReason({ now, event, head, headMessage, runs, cfg = CLOCK_CFG }) {
  const newestFirst = [...runs].sort((a, b) => created(b) - created(a));
  if (newestFirst.some(run => ACTIVE.has(run.status))) return null;
  const last = newestFirst[0];
  if (!last || created(last) < gateDayStart(now, cfg.anchorsUtc)) return 'the first full gate of this gate day';
  if (cfg.noVerdict.includes(last.conclusion)) return `the last run ended ${last.conclusion}, with no verdict`;
  if (last.head_sha === head) return null;
  if (event === 'push' && cfg.batchMarker.test(headMessage ?? '')) return 'the commit asked for it';
  if (last.conclusion !== 'success') return 'the last run was red and main has moved on';
  return null;
}

/** A preview follows its own ci.yml, and only needs a dispatch when its head is unverified. */
export function previewDue({ now, head, runs, cfg = CLOCK_CFG }) {
  const newestFirst = [...runs].sort((a, b) => created(b) - created(a));
  if (!head || newestFirst.some(run => ACTIVE.has(run.status))) return false;
  const last = newestFirst[0];
  if (last?.head_sha === head && !cfg.noVerdict.includes(last.conclusion)) return false;
  return !last || created(last) < gateDayStart(now, cfg.anchorsUtc);
}

/** The whole decision for one wake. Pure: facts in, actions out. */
export function planClock({ now, event, head, headMessage, runs, completed = null, alarmOpen = false, cfg = CLOCK_CFG }) {
  const plan = { rerun: null, alarm: null, closeAlarm: false, dispatch: null };

  if (completed) {
    if (completed.conclusion === 'success') plan.closeAlarm = alarmOpen;
    else if (!cfg.noVerdict.includes(completed.conclusion)) {
      if (completed.attempt < cfg.maxAttempts) plan.rerun = completed.id;
      else plan.alarm = 'red';
    }
  }

  // A run being retried is not finished, so nothing else may start around it.
  if (!plan.rerun) plan.dispatch = dispatchReason({ now, event, head, headMessage, runs, cfg });

  if (!plan.alarm && !alarmOpen && !plan.dispatch && !plan.rerun) {
    const greens = runs.filter(run => run.status === 'completed' && run.conclusion === 'success');
    const newestGreen = Math.max(0, ...greens.map(run => Date.parse(run.updated_at ?? run.created_at)));
    if ((now.getTime() - newestGreen) / 3_600_000 > cfg.staleAfterHours) plan.alarm = 'stale';
  }
  return plan;
}

// ---------------------------------------------------------------------------
// The GitHub side. Everything below only gathers facts and carries out the plan.
// ---------------------------------------------------------------------------

const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const api = route => JSON.parse(gh('api', route));

function runsOf(repo, branch, cfg) {
  const query = `branch=${encodeURIComponent(branch)}&per_page=30`;
  return api(`repos/${repo}/actions/workflows/${cfg.workflow}/runs?${query}`).workflow_runs
    .filter(run => run.head_branch === branch);
}

/** The merged report when the run got that far, the failing log lines when it did not. */
function failureBody(repo, runId, runUrl, sha) {
  const fallback = `Run: ${runUrl}\n\nThe run left no merged report. Open the run for the failing job.`;
  try {
    const dir = mkdtempSync(path.join(tmpdir(), 'full-gate-'));
    gh('run', 'download', String(runId), '--repo', repo, '--name', 'full-gate-report', '--dir', dir);
    const report = path.join(dir, 'report.md');
    if (existsSync(report)) return readFileSync(report, 'utf8').slice(0, 60_000);
  } catch { /* the report job never ran: fall through to the job logs */ }
  try {
    const jobs = api(`repos/${repo}/actions/runs/${runId}/jobs?per_page=100`).jobs.filter(job => job.conclusion === 'failure');
    const tail = jobs.flatMap(job => {
      try { return gh('api', `repos/${repo}/actions/jobs/${job.id}/logs`).split('\n'); } catch { return []; }
    }).map(line => line.replace(/^[0-9TZ:.-]+ /, ''))
      .filter(line => /REGRESSED|^FAIL |error TS|##\[error\]/.test(line)).slice(-20);
    return `## Full gate RED at \`${sha.slice(0, 9)}\`\n\nRun: ${runUrl}\n\n\`\`\`\n${tail.join('\n')}\n\`\`\`\n`;
  } catch {
    return fallback;
  }
}

function raiseAlarm(repo, cfg, title, body) {
  gh('label', 'create', cfg.alarmLabel, '--repo', repo, '--color', 'B60205', '--force',
    '--description', 'The full gate is red or overdue, so nothing new can publish');
  const open = JSON.parse(gh('issue', 'list', '--repo', repo, '--label', cfg.alarmLabel, '--state', 'open', '--json', 'number'));
  if (open.length) gh('issue', 'comment', String(open[0].number), '--repo', repo, '--body', body);
  else gh('issue', 'create', '--repo', repo, '--label', cfg.alarmLabel, '--title', title, '--body', body);
}

function closeAlarm(repo, cfg, sha) {
  const open = JSON.parse(gh('issue', 'list', '--repo', repo, '--label', cfg.alarmLabel, '--state', 'open', '--json', 'number'));
  for (const { number } of open) {
    gh('issue', 'close', String(number), '--repo', repo, '--comment', `The full gate is green at \`${sha.slice(0, 9)}\`, and publication has resumed.`);
  }
}

/** Hold this wake until a dispatched run is visible, so the next wake cannot start a twin. */
async function awaitRun(repo, branch, cfg, before) {
  for (let i = 0; i < 12; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    if (runsOf(repo, branch, cfg).some(run => !before.has(run.id))) return;
  }
  console.log('The dispatched run has not appeared yet.');
}

async function dispatch(repo, branch, cfg, before) {
  gh('workflow', 'run', cfg.workflow, '--repo', repo, '--ref', branch);
  await awaitRun(repo, branch, cfg, before);
}

async function main() {
  const cfg = CLOCK_CFG;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) throw new Error('The clock runs inside GitHub Actions.');
  const now = new Date();
  const event = process.env.GITHUB_EVENT_NAME;
  const payload = process.env.GITHUB_EVENT_PATH ? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')) : {};
  const trigger = payload.workflow_run;
  const completed = trigger?.head_branch === cfg.branch
    ? { id: trigger.id, conclusion: trigger.conclusion, attempt: trigger.run_attempt, sha: trigger.head_sha, url: trigger.html_url }
    : null;

  const head = api(`repos/${repo}/branches/${cfg.branch}`).commit;
  const runs = runsOf(repo, cfg.branch, cfg);
  const open = JSON.parse(gh('issue', 'list', '--repo', repo, '--label', cfg.alarmLabel, '--state', 'open', '--json', 'number'));
  const plan = planClock({
    now, event, head: head.sha, headMessage: head.commit.message, runs, completed, alarmOpen: open.length > 0, cfg,
  });
  console.log(`clock: ${event} at ${now.toISOString()}, main ${head.sha.slice(0, 9)}: ${JSON.stringify(plan)}`);

  if (plan.closeAlarm) closeAlarm(repo, cfg, completed.sha);
  let reran = true;
  if (plan.rerun) {
    try {
      gh('run', 'rerun', String(plan.rerun), '--failed', '--repo', repo);
    } catch (error) {
      // A red run that cannot be retried is still a red run, and must not go quiet.
      console.log(`clock: could not re-run ${plan.rerun}: ${String(error).split('\n')[0]}`);
      reran = false;
    }
  }
  if (plan.alarm === 'red' || !reran) {
    raiseAlarm(repo, cfg, 'Full gate red: publication is held at the last green commit',
      failureBody(repo, completed.id, completed.url, completed.sha));
  }
  // The retry's own completion wakes the clock again, and that wake decides.
  if (plan.alarm === 'stale') {
    raiseAlarm(repo, cfg, 'Full gate overdue: publication is held at the last green commit',
      `No green full gate on main for over ${cfg.staleAfterHours} hours. Main is at \`${head.sha.slice(0, 9)}\`. Check [the clock](https://github.com/${repo}/actions/workflows/full-gate-clock.yml) and [the gate](https://github.com/${repo}/actions/workflows/ci.yml).`);
  }
  if (plan.dispatch) {
    console.log(`clock: dispatching the full gate on main because ${plan.dispatch}.`);
    await dispatch(repo, cfg.branch, cfg, new Set(runs.map(run => run.id)));
  }

  // Active preview branches keep their own lanes, so each dispatches its own ci.yml.
  for (const { ref } of JSON.parse(readFileSync('scripts/browser-previews.json', 'utf8'))) {
    try {
      const previewRuns = runsOf(repo, ref, cfg);
      const previewHead = api(`repos/${repo}/branches/${encodeURIComponent(ref)}`).commit.sha;
      if (previewDue({ now, head: previewHead, runs: previewRuns, cfg })) {
        console.log(`clock: dispatching ${ref}'s full gate at ${previewHead.slice(0, 9)}.`);
        await dispatch(repo, ref, cfg, new Set(previewRuns.map(run => run.id)));
      }
    } catch (error) {
      // A preview must never stop main's clock. Its CI failure stays visible on its own run.
      console.log(`clock: could not refresh ${ref}: ${String(error).split('\n')[0]}`);
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
