import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const gate = fileURLToPath(new URL('./ownership-gate.mjs', import.meta.url));
const roots = [];
after(() => {
  for (const root of roots) {
    // Only remove the exact disposable repositories created by this test.
    assert.equal(dirname(resolve(root)), resolve(tmpdir()));
    assert.ok(basename(root).startsWith('hollow-ownership-test-'));
    rmSync(root, { recursive: true, force: true });
  }
});
function fixture() {
  const cwd = mkdtempSync(resolve(tmpdir(), 'hollow-ownership-test-'));
  roots.push(cwd);
  const git = (...args) => {
    const r = spawnSync('git', ['-c', 'user.name=Ownership Test', '-c', 'user.email=test@example.invalid',
      '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    return r.stdout.trim();
  };
  const write = (path, data) => writeFileSync(resolve(cwd, path), data);
  const commit = () => { git('add', '.'); git('commit', '-qm', 'fixture'); };
  git('init', '-q', '-b', 'ours');
  write('shared.txt', 'originalLine\n');
  write('numeric.txt', '1\n');
  commit();
  const merge = () => spawnSync('git', ['merge', '--no-ff', '--no-commit', 'incoming'], { cwd, encoding: 'utf8' });
  const check = (...args) => {
    const r = spawnSync(process.execPath, [gate, '--own-file', 'owned.txt', '--json', ...args], { cwd, encoding: 'utf8' });
    return { status: r.status, report: r.stdout ? JSON.parse(r.stdout) : null, stderr: r.stderr };
  };
  return { cwd, git, write, commit, merge, check };
}

test('normal commits still reject foreign and numbers-only edits and accept owned edits', () => {
  const f = fixture();
  f.write('numeric.txt', '2\n'); f.git('add', 'numeric.txt');
  const numeric = f.check();
  assert.equal(numeric.status, 1);
  assert.equal(numeric.report.provenance, null);
  assert.equal(numeric.report.files[0].entries[0].verdict, 'UNATTRIBUTABLE');
  f.git('restore', '--staged', 'numeric.txt');
  f.write('owned.txt', 'ourNewFunction\n'); f.git('add', 'owned.txt');
  assert.equal(f.check().status, 0);
  f.write('foreign.txt', 'anotherSessionFunction\n'); f.git('add', 'foreign.txt');
  assert.equal(f.check().status, 1);
});

test('clean merge attributes parent changes but still rejects an extra foreign staged edit', () => {
  const f = fixture();
  f.git('switch', '-qc', 'incoming'); f.write('incoming.txt', 'theirCommittedWork\n'); f.commit();
  const incoming = f.git('rev-parse', 'HEAD');
  f.git('switch', '-q', 'ours'); f.write('our-parent.txt', 'ourCommittedWork\n'); f.commit();
  const head = f.git('rev-parse', 'HEAD');
  assert.equal(f.merge().status, 0);
  const clean = f.check();
  assert.equal(clean.status, 0, clean.stderr);
  assert.deepEqual(clean.report.provenance.parents, [head, incoming]);
  assert.deepEqual(clean.report.files, []);
  f.write('numeric.txt', '2\n'); f.git('add', 'numeric.txt');
  assert.equal(f.check().status, 1);
  f.git('restore', '--staged', 'numeric.txt');
  f.write('owned.txt', 'ourMergeAddition\n'); f.git('add', 'owned.txt');
  assert.equal(f.check().status, 0);
});

test('conflicts refuse unresolved entries and markers; resolutions need ownership', () => {
  const f = fixture();
  f.git('switch', '-qc', 'incoming'); f.write('shared.txt', 'theirLine\n'); f.commit();
  f.git('switch', '-q', 'ours'); f.write('shared.txt', 'ourLine\n'); f.commit();
  assert.equal(f.merge().status, 1);
  assert.equal(f.check().status, 2);
  assert.match(f.check().stderr, /Unresolved index/);
  f.git('add', 'shared.txt'); // marking conflict text resolved must NOT pass
  assert.equal(f.check('--own-file', 'shared.txt').status, 2);
  assert.match(f.check('--own-file', 'shared.txt').stderr, /Conflict markers/);
  f.write('shared.txt', 'theirLine\n'); f.git('add', 'shared.txt');
  assert.equal(f.check().status, 1, 'even choosing a parent is a resolution to attribute');
  const resolved = f.check('--own-file', 'shared.txt');
  assert.equal(resolved.status, 0, resolved.stderr);
  assert.deepEqual(resolved.report.provenance.conflicts, ['shared.txt']);
});

test('multiple merge parents refuse instead of falling back to an unsafe baseline', () => {
  const f = fixture();
  const hash = f.git('rev-parse', 'HEAD');
  f.write('.git/MERGE_HEAD', `${hash}\n${hash}\n`);
  const r = f.check();
  assert.equal(r.status, 2);
  assert.match(r.stderr, /two-parent merge/);
});

test('file names containing spaces and inherited deletions are preserved', () => {
  const f = fixture();
  f.git('switch', '-qc', 'incoming');
  f.write('a shared file.txt', 'incomingSpaceName\n'); f.git('rm', 'numeric.txt'); f.commit();
  f.git('switch', '-q', 'ours');
  assert.equal(f.merge().status, 0);
  assert.equal(f.check().status, 0);
  f.write('a shared file.txt', 'foreignEditAfterMerge\n'); f.git('add', 'a shared file.txt');
  assert.equal(f.check().status, 1);
  // Refusing does not mutate the staged tree or working file.
  const index = f.git('write-tree'); f.check();
  assert.equal(f.git('write-tree'), index);
  assert.equal(readFileSync(resolve(f.cwd, 'a shared file.txt'), 'utf8'), 'foreignEditAfterMerge\n');
});
