import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import releases from '../launcher/releases.cjs';
import { githubApi, requireForwardRelease } from './plan-coordinated-release.mjs';
import { identityFor, makeEntry, restorePair, writeCatalog } from './release-artifacts.mjs';

const root = process.cwd(), site = path.join(root, 'site');
const plan = JSON.parse(fs.readFileSync('release-plan.json', 'utf8'));
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
if (plan.format !== 1 || plan.toolingCommit !== git(['rev-parse', 'HEAD'])) throw new Error('Tooling does not match the verified release plan.');
const catalogUrl = releases.catalogUrl(plan.repository);
let previous = null;
const prior = await fetch(catalogUrl, { cache: 'no-store' });
if (prior.status !== 404) {
  if (!prior.ok) throw new Error('Cannot read the previous catalog: HTTP ' + prior.status);
  previous = releases.validateCatalog(await prior.json(), plan.repository);
}
// Retain the previous published pair for cached browser loaders and offline clients.
// A failed or corrupt restoration aborts staging; it cannot change the live catalog.
for (const entry of previous?.entries ?? []) {
  const response = await fetch(new URL(entry.desktop.path, catalogUrl));
  if (!response.ok) throw new Error('Cannot retain previous game: HTTP ' + response.status);
  restorePair(site, entry, Buffer.from(await response.arrayBuffer()));
}
const entries = [];
for (const row of plan.entries) {
  const old = previous?.entries.find(e => e.identity.branch === row.ref);
  await requireForwardRelease(githubApi(plan.repository), old?.identity.commit, row.commit);
  if (old?.identity.commit === row.commit && old.identity.toolingCommit === plan.toolingCommit
      && old.identity.storageScope === row.storageScope && old.identity.worldmass === row.worldmass) {
    entries.push(old); continue;
  }
  let source = root;
  let temporary;
  try {
  if (row.ref !== 'main') {
    git(['fetch', '--no-tags', 'origin', row.commit]);
    temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'hollow-release-'));
    source = path.join(temporary, 'source');
    git(['worktree', 'add', '--detach', source, row.commit]);
    if (!fs.existsSync(path.join(source, 'src/buildProfile.ts'))) throw new Error('Preview lacks isolated storage support.');
    // Compilers are dev dependencies, even in a production build environment.
    execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['ci', '--include=dev'], {
      cwd: source, stdio: 'inherit', shell: process.platform === 'win32', env: { ...process.env, NODE_ENV: 'development', ELECTRON_SKIP_BINARY_DOWNLOAD: '1' },
    });
  }
  const version = JSON.parse(fs.readFileSync(path.join(source, 'package.json'), 'utf8')).version;
  const identity = identityFor({ branch: row.ref, commit: row.commit, version, toolingCommit: plan.toolingCommit,
    storageScope: row.storageScope, worldmass: row.worldmass });
  const directory = path.join(site, 'builds', identity.buildId, 'game');
  // A separate process releases native compiler handles before the temporary
  // checkout is removed, including on Windows, and isolates branch toolchains.
  execFileSync(process.execPath, [path.join(root, 'scripts/build-release-game.mjs'), source, directory, row.storageScope, String(row.worldmass)], { stdio: 'inherit' });
  entries.push(makeEntry({ site, directory, identity, verification: row.verification }));
  } finally {
    if (temporary) {
      const container = path.resolve(temporary), checkout = path.resolve(source);
      if (path.dirname(container) !== path.resolve(os.tmpdir()) || !path.basename(container).startsWith('hollow-release-')
          || checkout !== path.join(container, 'source')) throw new Error('Unexpected temporary checkout path.');
      if (fs.existsSync(path.join(checkout, '.git'))) git(['worktree', 'remove', '--force', checkout]);
      fs.rmdirSync(container);
    }
  }
}
writeCatalog(site, plan.repository, entries, plan.profiles);
console.log('Staged matching browser/desktop releases for ' + entries.map(e => e.identity.branch).join(', '));
