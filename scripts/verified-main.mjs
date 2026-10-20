import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function verifiedMain({ mainSha, runs, event }) {
  if (event?.workflow_run?.head_branch === 'main' && event.workflow_run.head_sha !== mainSha) {
    return { ready: false, sha: mainSha, reason: 'A newer main commit superseded this run.' };
  }
  const verified = runs.some(run => run.head_sha === mainSha && run.head_branch === 'main'
    && run.event === 'push' && run.status === 'completed' && run.conclusion === 'success');
  if (!verified) throw new Error(`Main ${mainSha} has no successful push CI run; publication is blocked.`);
  return { ready: true, sha: mainSha };
}

function main() {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo || !process.env.GITHUB_OUTPUT) throw new Error('This command requires a GitHub Actions repository and output file.');
  const api = path => JSON.parse(execFileSync('gh', ['api', `repos/${repo}/${path}`], { encoding: 'utf8' }));
  const mainSha = api('branches/main').commit.sha;
  const runs = api(`actions/workflows/ci.yml/runs?branch=main&head_sha=${mainSha}&event=push&per_page=100`).workflow_runs;
  const event = process.env.GITHUB_EVENT_PATH
    ? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')) : {};
  const result = verifiedMain({ mainSha, runs, event });
  appendFileSync(process.env.GITHUB_OUTPUT, `ready=${result.ready}\nsha=${result.sha}\n`);
  console.log(result.reason ?? `Verified main ${result.sha}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
