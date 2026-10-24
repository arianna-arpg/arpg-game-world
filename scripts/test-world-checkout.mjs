import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { WORLD_BRANCH, resolveWorldCheckout } from './world-checkout.cjs';

function fixture(t, branch = 'main') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'world-checkout-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  init(root, branch);
  return root;
}
function init(root, branch) {
  fs.mkdirSync(root, { recursive: true });
  git(root, ['init', '--initial-branch=' + branch]);
  for (const entry of ['launcher/main.cjs', 'server/shardHost.ts']) {
    fs.mkdirSync(path.dirname(path.join(root, entry)), { recursive: true });
    fs.writeFileSync(path.join(root, entry), '');
  }
}
function git(root, args) {
  return execFileSync('git', ['-C', root, ...args], { stdio: 'pipe', windowsHide: true });
}
const nested = root => path.join(root, '.claude', 'ownership.playable-foundation');

test('play and host select the canonical branch directly or from main', t => {
  const canonical = fixture(t, WORLD_BRANCH);
  assert.equal(resolveWorldCheckout(canonical), canonical);
  const main = fixture(t);
  init(nested(main), WORLD_BRANCH);
  assert.equal(resolveWorldCheckout(main), nested(main));
});

test('missing, copied and wrong-branch candidates refuse instead of launching main', t => {
  const main = fixture(t);
  assert.throws(() => resolveWorldCheckout(main), /Restore/);
  fs.mkdirSync(nested(main), { recursive: true });
  assert.throws(() => resolveWorldCheckout(main), /Restore/);
  init(nested(main), 'historical-experiment');
  assert.throws(() => resolveWorldCheckout(main), /Expected.*historical-experiment/);
});

test('a linked worktree is accepted; detached or incomplete trees refuse', t => {
  const main = fixture(t);
  git(main, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test',
    '-c', 'commit.gpgSign=false', 'commit', '--allow-empty', '-m', 'fixture']);
  git(main, ['worktree', 'add', '-b', WORLD_BRANCH, nested(main)]);
  for (const entry of ['launcher/main.cjs', 'server/shardHost.ts']) {
    fs.mkdirSync(path.dirname(path.join(nested(main), entry)), { recursive: true });
    fs.writeFileSync(path.join(nested(main), entry), '');
  }
  assert.equal(resolveWorldCheckout(main), nested(main));
  fs.unlinkSync(path.join(nested(main), 'server/shardHost.ts'));
  assert.throws(() => resolveWorldCheckout(main), /missing server\/shardHost.ts/);
  git(nested(main), ['checkout', '--detach']);
  assert.throws(() => resolveWorldCheckout(main), /detached HEAD/);
});
