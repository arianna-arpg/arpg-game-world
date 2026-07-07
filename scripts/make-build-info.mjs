// ---------------------------------------------------------------------------
// BUILD-INFO STAMPER — a packaged install has no git repo to ask "what am I?",
// so the dist scripts run this right before electron-builder: it snapshots
// version + HEAD into build/build-info.json, which ships as an extraResource
// and becomes the packaged launcher's identity (version line, release-update
// comparisons). Dev keeps asking git live; this file is for packages only.
// ---------------------------------------------------------------------------

import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const git = (args) => {
  try { return execSync(`git ${args}`, { cwd: root, encoding: 'utf-8' }).trim(); }
  catch { return ''; }
};

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
const info = {
  version: pkg.version ?? '0.0.0',
  hash: git('rev-parse --short HEAD'),
  branch: git('rev-parse --abbrev-ref HEAD'),
  subject: git('log -1 --format=%s'),
  date: git('log -1 --format=%ci'),
  dirty: git('status --porcelain').length > 0,
  builtAt: new Date().toISOString(),
};

mkdirSync(join(root, 'build'), { recursive: true });
writeFileSync(join(root, 'build', 'build-info.json'), JSON.stringify(info, null, 2) + '\n');
console.log(`build-info: v${info.version} @ ${info.hash || '?'}${info.dirty ? ' (dirty)' : ''}`);
