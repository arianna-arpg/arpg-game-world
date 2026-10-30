import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifiedMain } from './verified-main.mjs';

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
test('a seamless completion waits for main verification instead of publishing or failing spuriously', () => {
  for (const conclusion of [null, 'failure']) {
    const result = verifiedMain({ mainSha: 'current',
      runs: [{ ...passing, status: conclusion ? 'completed' : 'in_progress', conclusion }],
      event: { workflow_run: { head_branch: 'codex/seamless-world-foundation', head_sha: 'other' } } });
    assert.equal(result.ready, false);
  }
  assert.throws(() => verifiedMain({ mainSha: 'current', runs: [],
    event: { workflow_run: { head_branch: 'main', head_sha: 'current' } } }), /publication is blocked/);
});
