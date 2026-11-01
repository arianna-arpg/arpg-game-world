import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// ci.yml is the full gate. It only runs by dispatch now; 'push' keeps the runs
// from before the commit check split valid for the commits they verified.
const FULL_GATE_EVENTS = new Set(['push', 'workflow_dispatch']);

const passedFullGate = run => run.head_branch === 'main' && FULL_GATE_EVENTS.has(run.event)
  && run.status === 'completed' && run.conclusion === 'success';

/**
 * THE EXACT-COMMIT LAW: publication pins a commit with its own green full gate,
 * never main's head on the strength of an older run. Every caller gets the newest
 * verified commit, even if main has moved on since.
 */
export function verifiedMain({ mainSha, runs }) {
  const newest = runs.filter(passedFullGate).sort((a, b) => (b.id ?? 0) - (a.id ?? 0))[0];
  if (newest) return { ready: true, sha: newest.head_sha };
  throw new Error(`Main has no commit with a green full gate (head is ${mainSha}); publication is blocked.`);
}

function main() {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo || !process.env.GITHUB_OUTPUT) throw new Error('This command requires a GitHub Actions repository and output file.');
  const api = (path, ...args) => JSON.parse(execFileSync('gh', ['api', `repos/${repo}/${path}`, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
  const mainSha = api('branches/main').commit.sha;
  const runs = api('actions/workflows/ci.yml/runs?branch=main&per_page=100',
    '--jq', '[.workflow_runs[] | {id, head_sha, head_branch, event, status, conclusion}]');
  const result = verifiedMain({ mainSha, runs });
  appendFileSync(process.env.GITHUB_OUTPUT, `ready=${result.ready}\nsha=${result.sha}\n`);
  console.log(`Verified main ${result.sha}${result.sha === mainSha ? '' : ` (main is now at ${mainSha})`}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
