// One checkout policy for the desktop player and the continuous host.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const WORLD_BRANCH = 'codex/seamless-world-foundation';
const git = (directory, args) => execFileSync('git', ['-C', directory, ...args],
  { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }).trim();

function resolveWorldCheckout(project) {
  const candidate = git(project, ['branch', '--show-current']) === WORLD_BRANCH
    ? path.resolve(project) : path.join(project, '.claude', 'ownership.playable-foundation');
  // Git also accepts subdirectories of a checkout. A copied folder inside main
  // must never masquerade as the canonical worktree.
  if (!fs.existsSync(path.join(candidate, '.git'))) {
    throw new Error('Restore the ' + WORLD_BRANCH + ' checkout at ' + candidate + '. See PLAYTEST.md.');
  }
  const root = git(candidate, ['rev-parse', '--show-toplevel']);
  const branch = git(candidate, ['branch', '--show-current']);
  if (path.relative(fs.realpathSync(candidate), fs.realpathSync(root)) || branch !== WORLD_BRANCH) {
    throw new Error('Expected the ' + WORLD_BRANCH + ' checkout at ' + candidate + ', found ' +
      (branch || 'detached HEAD') + '. No other build has been opened.');
  }
  for (const entry of ['launcher/main.cjs', 'server/shardHost.ts']) {
    if (!fs.existsSync(path.join(candidate, entry))) throw new Error('World checkout is missing ' + entry + ': ' + candidate);
  }
  return candidate;
}

module.exports = { WORLD_BRANCH, resolveWorldCheckout };
