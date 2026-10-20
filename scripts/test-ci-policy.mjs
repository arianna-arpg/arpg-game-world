import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planLauncherBranches } from './plan-launcher-branches.mjs';
import { verifiedMain } from './verified-main.mjs';

const branches = ['main', 'codex/seamless-world-foundation', 'shard-world', 'topic'].map(
  name => ({ name, commit: { sha: `${name}-sha` } }));
const base = {
  branches, profiles: [{ ref: 'codex/seamless-world-foundation' }], main: 'main',
  assets: [], assetName: (name, sha) => `${name}:${sha}`, key: name => name,
};
test('scheduled launcher delivery includes only active branches', () => {
  assert.deepEqual(planLauncherBranches({ ...base, event: 'schedule' }).map(row => row.branch),
    ['codex/seamless-world-foundation']);
});
test('unrelated branch CI cannot revive archived launcher builds', () => {
  assert.deepEqual(planLauncherBranches({ ...base, event: 'workflow_run', requested: 'shard-world' }), []);
  assert.deepEqual(planLauncherBranches({ ...base, event: 'workflow_run', requested: 'main' }), []);
});
test('explicit manual builds still support any existing experimental branch', () => {
  assert.equal(planLauncherBranches({ ...base, event: 'workflow_dispatch', requested: 'shard-world' })[0].branch, 'shard-world');
  assert.throws(() => planLauncherBranches({ ...base, requested: 'missing' }), /no longer exists/);
});
test('only a complete digest-bearing build of the exact commit is reusable', () => {
  const name = base.assetName(branches[1].name, branches[1].commit.sha);
  for (const asset of [{ name, state: 'uploaded' }, { name, state: 'new', digest: 'sha256:abc' },
    { name: `${name}-old`, state: 'uploaded', digest: 'sha256:abc' }]) {
    assert.equal(planLauncherBranches({ ...base, assets: [asset] }).length, 1);
  }
  assert.deepEqual(planLauncherBranches({ ...base, assets: [{ name, state: 'uploaded', digest: 'sha256:abc' }] }), []);
});

const passing = { head_sha: 'current', head_branch: 'main', event: 'push', status: 'completed', conclusion: 'success' };
test('publication requires successful push CI on the exact main commit', () => {
  assert.deepEqual(verifiedMain({ mainSha: 'current', runs: [passing] }), { ready: true, sha: 'current' });
  for (const run of [
    { ...passing, head_sha: 'old' }, { ...passing, head_branch: 'topic' },
    { ...passing, event: 'pull_request' }, { ...passing, status: 'in_progress' },
    { ...passing, conclusion: 'failure' }, { ...passing, conclusion: 'skipped' },
  ]) assert.throws(() => verifiedMain({ mainSha: 'current', runs: [run] }), /publication is blocked/);
  assert.throws(() => verifiedMain({ mainSha: 'current', runs: [] }), /publication is blocked/);
});
test('a superseded main completion cannot deploy or integrate newer unchecked code', () => {
  const result = verifiedMain({ mainSha: 'new', runs: [], event: { workflow_run: { head_branch: 'main', head_sha: 'old' } } });
  assert.equal(result.ready, false);
});
