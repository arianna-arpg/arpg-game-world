import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';

const workflow = readFileSync('.github/workflows/balance-farm.yml', 'utf8');

test('the farm blocks nothing and is blocked by nothing', () => {
  assert.doesNotMatch(workflow, /workflow_run/, 'it must not wait on another workflow, so a red test night still gets numbers');
  for (const file of readdirSync('.github/workflows')) {
    if (file === 'balance-farm.yml') continue;
    const other = readFileSync(`.github/workflows/${file}`, 'utf8');
    assert.doesNotMatch(other, /balance-farm/, `${file} must not depend on the farm: it is advisory`);
  }
});

test('the farm stays inside the shared job limit and survives lost shards', () => {
  const parallel = [...workflow.matchAll(/max-parallel:\s*(\d+)/g)].map(m => Number(m[1]));
  assert.ok(parallel.length >= 2);
  assert.ok(Math.max(...parallel) <= 14, 'the account shares about 20 concurrent jobs with commit CI');
  assert.match(workflow, /fail-fast:\s*false/);
  const consolidate = workflow.slice(workflow.indexOf('  consolidate:'));
  assert.match(consolidate.slice(0, 400), /always\(\)/, 'consolidation must run when a shard died');
});

test('scheduled triggers are redundant, because a single cron can run hours late', () => {
  assert.ok([...workflow.matchAll(/cron:\s*'/g)].length >= 3);
  assert.match(workflow, /Tonight already has a run/);
});

test('the shared harness self-test passes', () => {
  // Node stops at balance/, so the TypeScript half tests itself under tsx.
  const out = execFileSync(process.execPath, ['--import', 'tsx', 'balance/farm/selftest.ts'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  assert.match(out, /SELFTEST OK/);
});
