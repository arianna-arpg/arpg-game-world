import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// ci.yml is the full gate. It only runs by dispatch now; 'push' keeps the runs
// from before the commit check split valid for the commits they verified.
const FULL_GATE_EVENTS = new Set(['push', 'workflow_dispatch']);

const passedFullGate = run => run.head_branch === 'main' && FULL_GATE_EVENTS.has(run.event)
  && run.status === 'completed' && run.conclusion === 'success';

/**
 * THE EXACT-COMMIT LAW: publication pins a commit with its own green full gate,
 * never main's head on the strength of an older run. A completion publishes the
 * commit it verified, even if main has moved on since, and any other caller
 * (the nightly cut, a manual dispatch) gets the newest verified commit.
 */
export function verifiedMain({ mainSha, runs, event }) {
  const passed = runs.filter(passedFullGate);
  const completion = event?.workflow_run;
  if (completion?.head_branch === 'main') {
    return passed.some(run => run.head_sha === completion.head_sha)
      ? { ready: true, sha: completion.head_sha }
      : { ready: false, sha: completion.head_sha, reason: 'This completion did not pass the full gate.' };
  }
  const newest = [...passed].sort((a, b) => (b.id ?? 0) - (a.id ?? 0))[0];
  if (newest) return { ready: true, sha: newest.head_sha };
  // A seamless completion can arrive before main has any verified commit. Do
  // not publish, or report a false deployment failure, while that is so.
  if (completion) return { ready: false, sha: mainSha, reason: 'Waiting for a green full gate on main.' };
  throw new Error(`Main has no commit with a green full gate (head is ${mainSha}); publication is blocked.`);
}

function main() {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo || !process.env.GITHUB_OUTPUT) throw new Error('This command requires a GitHub Actions repository and output file.');
  const api = path => JSON.parse(execFileSync('gh', ['api', `repos/${repo}/${path}`], { encoding: 'utf8' }));
  const mainSha = api('branches/main').commit.sha;
  const runs = api('actions/workflows/ci.yml/runs?branch=main&per_page=100').workflow_runs;
  const event = process.env.GITHUB_EVENT_PATH
    ? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')) : {};
  const result = verifiedMain({ mainSha, runs, event });
  appendFileSync(process.env.GITHUB_OUTPUT, `ready=${result.ready}\nsha=${result.sha}\n`);
  console.log(result.reason ?? `Verified main ${result.sha}${result.sha === mainSha ? '' : ` (main is now at ${mainSha})`}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
