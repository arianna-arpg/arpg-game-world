import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

test('a scheduled night decides for itself, and a dispatch can ask for any night', () => {
  assert.ok(workflow.includes("PROFILE: ${{ inputs.profile || 'auto' }}"), 'a schedule has no inputs, so this is what it runs');
  assert.ok(workflow.includes('options: [full, quick, quiet, quietquick]'));
  const plan = workflow.slice(workflow.indexOf('Lay out the night'), workflow.indexOf('upload-artifact', workflow.indexOf('Lay out the night')));
  assert.match(plan, /GH_TOKEN:/, 'the plan compares commits through the API');
});

test('a quiet night leaves the last full digest in place', () => {
  const issue = readFileSync('scripts/balance-farm-issue.mjs', 'utf8');
  assert.match(issue, /status.quiet/);
  assert.ok(issue.indexOf('status.quiet') < issue.indexOf("'issue', 'edit'"), 'it must leave before it can overwrite the rolling digest');
});

test('the workflow shares the repository setup and never claims the required check', () => {
  assert.match(workflow, /uses: \.\/\.github\/actions\/prepare/);
  assert.doesNotMatch(workflow, /actions\/setup-node/, 'setup belongs to the shared action');
  assert.doesNotMatch(workflow, /^ {2}check:/m, 'only commit-check.yml may report the required check');
});

const runFixture = (mode, file) => spawnSync(process.execPath, ['--import', 'tsx', 'balance/farm/watchdog-fixture.ts', mode, file], { encoding: 'utf8', timeout: 90_000 });

test('a hung episode costs one attempt: recorded with its stack, then refused', () => {
  const dir = mkdtempSync(join(tmpdir(), 'farm-watchdog-'));
  try {
    const file = join(dir, 'stalls.jsonl');
    const first = runFixture('hung', file);
    assert.doesNotMatch(first.stdout, /FINISHED/);
    const row = JSON.parse(readFileSync(file, 'utf8').trim());
    assert.equal(row.kind, 'hung');
    assert.equal(row.scenario, 'fixture_hung');
    assert.equal(row.stack[0], 'spinHere', 'the stack is read from the stuck thread');
    const second = runFixture('hung', file);
    assert.match(second.stdout + second.stderr, /EpisodeStalled: hung in spinHere/, 'the same episode now throws instead of running');
    assert.equal(readFileSync(file, 'utf8').trim().split('\n').length, 1, 'and is not recorded twice');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('an episode that keeps ticking past its cap counts as slow, and a healthy one is left alone', () => {
  const dir = mkdtempSync(join(tmpdir(), 'farm-watchdog-'));
  try {
    const file = join(dir, 'stalls.jsonl');
    runFixture('slow', file);
    assert.equal(JSON.parse(readFileSync(file, 'utf8').trim()).kind, 'slow');
    const healthy = join(dir, 'healthy.jsonl');
    assert.match(runFixture('ok', healthy).stdout, /FINISHED/);
    assert.equal(existsSync(healthy), false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the shared harness self-test passes', () => {
  // Node stops at balance/, so the TypeScript half tests itself under tsx.
  const out = execFileSync(process.execPath, ['--import', 'tsx', 'balance/farm/selftest.ts'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  assert.match(out, /SELFTEST OK/);
});
