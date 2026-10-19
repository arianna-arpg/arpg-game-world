// Pages has one artifact for the whole repository. Build configured branch
// previews beside the main game so neither deployment can erase the other.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function validatePreviews(value) {
  if (!Array.isArray(value)) throw new Error('Preview configuration must be an array');
  const ids = new Set(), scopes = new Set();
  for (const row of value) {
    if (!row || !/^[a-z][a-z0-9-]{0,47}$/.test(row.id ?? '')) throw new Error('Invalid preview id');
    if (ids.has(row.id)) throw new Error('Duplicate preview id');
    if (typeof row.ref !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_./-]*$/.test(row.ref) || row.ref.includes('..')) throw new Error('Invalid preview branch');
    if (typeof row.storageScope !== 'string' || !/^preview:[a-z][a-z0-9-]{0,47}$/.test(row.storageScope)) throw new Error('Preview requires isolated storage');
    if (scopes.has(row.storageScope)) throw new Error('Preview storage scopes must be unique');
    if (typeof row.worldmass !== 'boolean') throw new Error('Preview worldmass must be boolean');
    ids.add(row.id); scopes.add(row.storageScope);
  }
  return value;
}

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
}

export function buildPreviews(root = process.cwd()) {
  const config = validatePreviews(JSON.parse(readFileSync(join(root, 'scripts/browser-previews.json'), 'utf8')));
  const production = { ref: 'main', commit: git(['rev-parse', 'HEAD'], root) };
  const previews = [];
  for (const row of config) {
    git(['check-ref-format', '--branch', row.ref], root);
    git(['fetch', '--no-tags', '--depth=1', 'origin', `refs/heads/${row.ref}`], root);
    const commit = git(['rev-parse', 'FETCH_HEAD'], root);
    // Temporary checkout belongs to this disposable CI runner. It never
    // changes the main checkout or copies its node_modules across branches.
    const source = join(mkdtempSync(join(tmpdir(), 'hollow-preview-')), 'source');
    git(['worktree', 'add', '--detach', source, commit], root);
    if (!existsSync(join(source, 'src/buildProfile.ts'))) throw new Error(`${row.id} lacks the isolated preview build contract`);
    const env = { ...process.env, ELECTRON_SKIP_BINARY_DOWNLOAD: '1',
      HOLLOW_WAKE_STORAGE_SCOPE: row.storageScope, HOLLOW_WAKE_WORLDMASS: row.worldmass ? '1' : '0' };
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const options = { cwd: source, env, stdio: 'inherit', shell: process.platform === 'win32' };
    execFileSync(npm, ['ci'], options);
    execFileSync(npm, ['run', 'check'], options);
    const output = join(root, 'site/dev', row.id);
    execFileSync(process.execPath, [join(source, 'node_modules/vite/bin/vite.js'), 'build', '--base=./', '--outDir', output, '--emptyOutDir'], { cwd: source, env, stdio: 'inherit' });
    const info = { ...row, commit, builtAt: new Date().toISOString() };
    writeFileSync(join(output, 'build.json'), JSON.stringify(info, null, 2) + '\n');
    const html = join(output, 'index.html');
    writeFileSync(html, readFileSync(html, 'utf8').replace(/<title>[^<]*<\/title>/, '<title>Hollow Wake — Development Preview</title>'));
    previews.push(info);
    console.log(`Preview ready: /dev/${row.id}/ from ${row.ref} at ${commit}`);
  }
  mkdirSync(join(root, 'site'), { recursive: true });
  writeFileSync(join(root, 'site/build.json'), JSON.stringify({ production, previews }, null, 2) + '\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) buildPreviews();
