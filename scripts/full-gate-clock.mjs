// ---------------------------------------------------------------------------
// THE FULL-GATE CLOCK: what guarantees the full gate actually runs.
//
// ci.yml is the full gate and only ever runs by dispatch, so every run it has
// is a real one and "success" can never mean "skipped". This decides when to
// dispatch it. GitHub's cron cannot be trusted alone (the 08:37 UTC nightly
// routinely started four to seven hours late), so the clock is woken by several
// cron slots, every push to main, and the last job of every full gate, and each
// wake asks the same questions of the same facts. The first wake of a gate day
// runs the gate; every later one finds nothing to do.
//
// It also owns what follows a finished gate: one automatic re-run of a red run's
// failed jobs, the single rolling alarm issue that the owner and the daily
// check-in read, and starting whatever a green gate sets off. Nothing else can.
// GitHub starts no workflow_run for a run that GITHUB_TOKEN dispatched, and this
// clock dispatches the gate. So no wake carries news: each one reads the runs, and
// a lost wake costs only the time until the next. See docs/ai/test-cadence.md.
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
  /** What a green gate sets off. `previews`: a green preview gate sets it off too. */
  followers: [
    { workflow: 'pages.yml', previews: true },
    { workflow: 'sync-main.yml', previews: false },
  ],
  /** How many pauses a wake waits for the finishing gate that sent it to close. */
  settleTries: 36,
};

const ACTIVE = new Set(['queued', 'in_progress', 'waiting', 'requested', 'pending']);
const created = run => Date.parse(run.created_at);
const finishedAt = run => Date.parse(run.updated_at ?? run.created_at);
const isGreen = run => run.status === 'completed' && run.conclusion === 'success';
const newestOf = runs => [...runs].sort((a, b) => created(b) - created(a))[0];
const hoursSince = (now, run) => (now.getTime() - finishedAt(run)) / 3_600_000;

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

/** A green gate that finished after a follower last started has not reached it yet. */
export function followerDue({ greens, started }) {
  return Math.max(0, ...greens.map(finishedAt)) > Math.max(0, ...started.map(created));
}

/**
 * The whole decision for one wake. Pure: facts in, actions out.
 * `announced` is the run that sent this wake. It only decides whether a further red
 * feeds an alarm that is already open, so scheduled wakes cannot repeat themselves.
 */
export function planClock({ now, event, head, headMessage, runs, announced = null, alarmOpen = false, followers = [], cfg = CLOCK_CFG }) {
  const plan = { rerun: null, alarm: null, closeAlarm: false, dispatch: null, follow: [] };

  const last = newestOf(runs);
  if (last?.status === 'completed') {
    // A green run too old to count must not close the alarm that says so.
    if (isGreen(last)) plan.closeAlarm = alarmOpen && hoursSince(now, last) <= cfg.staleAfterHours;
    else if (!cfg.noVerdict.includes(last.conclusion)) {
      if ((last.run_attempt ?? 1) < cfg.maxAttempts) plan.rerun = last.id;
      else if (!alarmOpen || announced === last.id) plan.alarm = 'red';
    }
  }

  // A run being retried is not finished, so nothing else may start around it.
  if (!plan.rerun) plan.dispatch = dispatchReason({ now, event, head, headMessage, runs, cfg });

  if (!plan.alarm && !alarmOpen && !plan.dispatch && !plan.rerun) {
    const newestGreen = Math.max(0, ...runs.filter(isGreen).map(finishedAt));
    if ((now.getTime() - newestGreen) / 3_600_000 > cfg.staleAfterHours) plan.alarm = 'stale';
  }

  plan.follow = followers.filter(followerDue).map(follower => follower.workflow);
  return plan;
}

// ---------------------------------------------------------------------------
// The GitHub side. It only gathers facts and carries out the plan. `gh` is passed
// in because the red path runs only on a bad day, so the policy test drives all of
// this with a fake rather than finding out on that day that it does not work.
// ---------------------------------------------------------------------------

/** A clock on any other ref reads everything and changes nothing, so the path can be proven on a branch. */
export const reportsOnly = (ref, cfg = CLOCK_CFG) => ref !== cfg.branch;

function reportingOnly(gh) {
  const reads = ([verb, target]) => verb === 'api' || (verb === 'issue' && target === 'list') || (verb === 'run' && target === 'download');
  return (...args) => {
    if (reads(args)) return gh(...args);
    console.log(`clock: report only, would run: gh ${args.slice(0, 3).join(' ')}`);
    return '';
  };
}

function github(gh, repo, cfg, reportOnly) {
  const api = route => JSON.parse(gh('api', route));
  const runsOf = (branch, workflow = cfg.workflow) => api(`repos/${repo}/actions/workflows/${workflow}/runs?branch=${encodeURIComponent(branch)}&per_page=30`)
    .workflow_runs.filter(run => run.head_branch === branch);
  const openAlarms = () => JSON.parse(gh('issue', 'list', '--repo', repo, '--label', cfg.alarmLabel, '--state', 'open', '--json', 'number'));
  return {
    api,
    runsOf,
    openAlarms,

    /** The merged report when the run got that far, the failing log lines when it did not. */
    failureBody(runId, runUrl, sha) {
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
        return `Run: ${runUrl}\n\nThe run left no merged report. Open the run for the failing job.`;
      }
    },

    raiseAlarm(title, body) {
      gh('label', 'create', cfg.alarmLabel, '--repo', repo, '--color', 'B60205', '--force',
        '--description', 'The full gate is red or overdue, so nothing new can publish');
      const open = openAlarms();
      if (open.length) gh('issue', 'comment', String(open[0].number), '--repo', repo, '--body', body);
      else gh('issue', 'create', '--repo', repo, '--label', cfg.alarmLabel, '--title', title, '--body', body);
    },

    closeAlarm(sha) {
      for (const { number } of openAlarms()) {
        gh('issue', 'close', String(number), '--repo', repo, '--comment', `The full gate is green at \`${sha.slice(0, 9)}\`, and publication has resumed.`);
      }
    },

    /** Dispatch, then hold this wake until the run is visible so the next wake cannot start a twin. */
    async dispatch(branch, before, pause, workflow = cfg.workflow) {
      gh('workflow', 'run', workflow, '--repo', repo, '--ref', branch);
      if (reportOnly) return;
      for (let i = 0; i < 12; i++) {
        await pause();
        if (runsOf(branch, workflow).some(run => !before.has(run.id))) return;
      }
      console.log('clock: the dispatched run has not appeared yet.');
    },

    /** A gate sends its wake from its own last job, so give it the moment it needs to close. */
    async settled(id, pause) {
      for (let i = 0; i < cfg.settleTries; i++) {
        if (api(`repos/${repo}/actions/runs/${id}`).status === 'completed') return;
        await pause();
      }
      console.log(`clock: run ${id} is still open, so the next wake will read it.`);
    },
  };
}

export async function runClock({ gh: realGh, repo, event, payload = {}, now = new Date(), previews = [], reportOnly = false, cfg = CLOCK_CFG, pause = () => new Promise(resolve => setTimeout(resolve, 5000)) }) {
  const gh = reportOnly ? reportingOnly(realGh) : realGh;
  const hub = github(gh, repo, cfg, reportOnly);
  const announced = /^\d+$/.test(payload.inputs?.finished_run ?? '') ? Number(payload.inputs.finished_run) : null;
  if (announced) await hub.settled(announced, pause);

  const head = hub.api(`repos/${repo}/branches/${cfg.branch}`).commit;
  const runs = hub.runsOf(cfg.branch);
  const readRuns = (branch, workflow) => {
    // A broken listing must not stop the clock's own work. The next wake reads it again.
    try { return hub.runsOf(branch, workflow); }
    catch (error) {
      console.log(`clock: could not read ${workflow ?? cfg.workflow} on ${branch}: ${String(error).split('\n')[0]}`);
      return null;
    }
  };
  // Previews only count once main itself has something verified to publish.
  const mainGreens = runs.filter(isGreen);
  const previewGreens = mainGreens.length ? previews.flatMap(({ ref }) => readRuns(ref) ?? []).filter(isGreen) : [];
  const followers = cfg.followers.flatMap(({ workflow, previews: withPreviews }) => {
    const started = readRuns(cfg.branch, workflow);
    return started ? [{ workflow, started, greens: withPreviews ? [...mainGreens, ...previewGreens] : mainGreens }] : [];
  });
  const plan = planClock({
    now, event, head: head.sha, headMessage: head.commit.message, runs, announced, alarmOpen: hub.openAlarms().length > 0, followers, cfg,
  });
  console.log(`clock: ${event} at ${now.toISOString()}${reportOnly ? ' (report only)' : ''}, main ${head.sha.slice(0, 9)}: ${JSON.stringify(plan)}`);

  const last = newestOf(runs);
  if (plan.closeAlarm) hub.closeAlarm(last.head_sha);
  let reran = true;
  if (plan.rerun) {
    // The retry's last job wakes the clock again, and that wake decides.
    try {
      gh('run', 'rerun', String(plan.rerun), '--failed', '--repo', repo);
    } catch (error) {
      // A red run that cannot be retried is still a red run, and must not go quiet.
      console.log(`clock: could not re-run ${plan.rerun}: ${String(error).split('\n')[0]}`);
      reran = false;
    }
  }
  if (plan.alarm === 'red' || !reran) {
    hub.raiseAlarm('Full gate red: publication is held at the last green commit',
      hub.failureBody(last.id, last.html_url, last.head_sha));
  }
  if (plan.alarm === 'stale') {
    hub.raiseAlarm('Full gate overdue: publication is held at the last green commit',
      `No green full gate on main for over ${cfg.staleAfterHours} hours. Main is at \`${head.sha.slice(0, 9)}\`. Check [the clock](https://github.com/${repo}/actions/workflows/full-gate-clock.yml) and [the gate](https://github.com/${repo}/actions/workflows/${cfg.workflow}).`);
  }
  if (plan.dispatch) {
    console.log(`clock: dispatching the full gate on main because ${plan.dispatch}.`);
    await hub.dispatch(cfg.branch, new Set(runs.map(run => run.id)), pause);
  }

  for (const workflow of plan.follow) {
    const { started } = followers.find(follower => follower.workflow === workflow);
    console.log(`clock: a green gate has not reached ${workflow} yet, so dispatching it.`);
    try {
      await hub.dispatch(cfg.branch, new Set(started.map(run => run.id)), pause, workflow);
    } catch (error) {
      // One follower must not stop another, or the previews below. The next wake tries again.
      console.log(`clock: could not start ${workflow}: ${String(error).split('\n')[0]}`);
    }
  }

  // Active preview branches keep their own lanes, so each dispatches its own ci.yml.
  for (const { ref } of previews) {
    try {
      const previewRuns = hub.runsOf(ref);
      const previewHead = hub.api(`repos/${repo}/branches/${encodeURIComponent(ref)}`).commit.sha;
      if (previewDue({ now, head: previewHead, runs: previewRuns, cfg })) {
        console.log(`clock: dispatching ${ref}'s full gate at ${previewHead.slice(0, 9)}.`);
        await hub.dispatch(ref, new Set(previewRuns.map(run => run.id)), pause);
      }
    } catch (error) {
      // A preview must never stop main's clock. Its failure stays visible on its own run.
      console.log(`clock: could not refresh ${ref}: ${String(error).split('\n')[0]}`);
    }
  }
  return plan;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.env.GITHUB_REPOSITORY) throw new Error('The clock runs inside GitHub Actions.');
  await runClock({
    gh: (...args) => execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 256 * 1024 * 1024 }),
    repo: process.env.GITHUB_REPOSITORY,
    event: process.env.GITHUB_EVENT_NAME,
    payload: process.env.GITHUB_EVENT_PATH ? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')) : {},
    previews: JSON.parse(readFileSync('scripts/browser-previews.json', 'utf8')),
    reportOnly: reportsOnly(process.env.GITHUB_REF_NAME),
  });
}
