import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePreviews } from './build-browser-previews.mjs';

export function successfulSourceRuns(runs, repository, branch) {
  return runs.filter(run => run.status === 'completed' && run.conclusion === 'success'
    && /^[a-f0-9]{40}$/.test(run.head_sha) && Number.isSafeInteger(run.id) && run.id > 0
    && run.head_repository?.full_name === repository && run.head_branch === branch
    && (run.event === 'push' || run.event === 'workflow_dispatch'))
    .sort((a, b) => b.id - a.id);
}
export async function verifiedBranch({ api, repository, branch, requiredCommit }) {
  const head = requiredCommit ?? (await api('branches/' + encodeURIComponent(branch))).commit.sha;
  const result = await api('actions/workflows/ci.yml/runs?branch=' + encodeURIComponent(branch) + '&status=success&per_page=100');
  for (const run of successfulSourceRuns(result.workflow_runs, repository, branch)) {
    if (requiredCommit && run.head_sha !== requiredCommit) continue;
    if (run.head_sha !== head) {
      const comparison = await api('compare/' + run.head_sha + '...' + head);
      if (comparison.status !== 'ahead' && comparison.status !== 'identical') continue;
    }
    return { commit: run.head_sha, verification: { runId: run.id, url: `https://github.com/${repository}/actions/runs/${run.id}` } };
  }
  throw new Error('No successful source CI for ' + branch + (requiredCommit ? ' at ' + requiredCommit : ' on its current history'));
}
export async function makePlan({ api, repository, toolingCommit, profiles }) {
  validatePreviews(profiles);
  const main = await verifiedBranch({ api, repository, branch: 'main', requiredCommit: toolingCommit });
  const entries = [{ ref: 'main', storageScope: '', worldmass: false, ...main }];
  for (const profile of profiles) entries.push({ ...profile, ...await verifiedBranch({ api, repository, branch: profile.ref }) });
  return { format: 1, repository, toolingCommit, profiles, entries };
}
export async function requireForwardRelease(api, previous, next) {
  if (!previous || previous === next) return;
  const comparison = await api('compare/' + previous + '...' + next);
  if (comparison.status !== 'ahead') throw new Error('Refusing a release older than, or unrelated to, the published game.');
}
export function githubApi(repository) {
  return async route => {
    const response = await fetch(`https://api.github.com/repos/${repository}/${route}`, {
      headers: { accept: 'application/vnd.github+json', authorization: `Bearer ${process.env.GH_TOKEN}`, 'user-agent': 'hollow-wake-release' },
    });
    if (!response.ok) throw new Error(`GitHub HTTP ${response.status} for ${route}`);
    return response.json();
  };
}
async function main() {
  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository || !process.env.GH_TOKEN) throw new Error('Release planning requires a repository and read token.');
  const toolingCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const profiles = JSON.parse(fs.readFileSync('scripts/browser-previews.json', 'utf8'));
  const plan = await makePlan({ api: githubApi(repository), repository, toolingCommit, profiles });
  fs.writeFileSync('release-plan.json', JSON.stringify(plan, null, 2) + '\n');
  console.log(plan.entries.map(row => row.ref + ' @ ' + row.commit.slice(0, 8)).join('\n'));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
