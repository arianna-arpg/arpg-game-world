import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { packBuild } from './build-launcher-branch.mjs';
import branches from '../launcher/branches.cjs';
import releases from '../launcher/releases.cjs';
import { identityTags } from './game-identity.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const json = value => JSON.stringify(value).replaceAll('<', '\\u003c');
export const digest = data => 'sha256:' + crypto.createHash('sha256').update(data).digest('hex');
export function identityFor({ branch, commit, version, toolingCommit, storageScope = '', worldmass = false, builtAt = new Date().toISOString() }) {
  if (!branches.isCommit(commit) || !branches.isCommit(toolingCommit)) throw new Error('Build requires pinned source and tooling commits.');
  const identity = { branch, commit, version, toolingCommit, storageScope,
    desktopStorageScope: branch === 'main' ? '' : 'desktop:' + branches.key(branch), worldmass, builtAt };
  return { ...identity, buildId: crypto.createHash('sha256').update(JSON.stringify(identity)).digest('hex').slice(0, 24) };
}
export function stampGame(directory, identity) {
  for (const name of ['index.html', 'showcase.html']) {
    const file = path.join(directory, name);
    if (!fs.existsSync(file)) continue;
    // Coordinated builds suppress the ordinary local Vite identity plugin.
    const html = fs.readFileSync(file, 'utf8');
    if (html.includes('name="hollow-wake-build"')) throw new Error('Game was already stamped; refusing two identities.');
    fs.writeFileSync(file, html.replace('</head>', identityTags(identity) + '\n</head>'));
  }
  fs.writeFileSync(path.join(directory, 'build.json'), JSON.stringify(identity, null, 2) + '\n');
}
export function makeEntry({ site, directory, identity, verification }) {
  const root = path.join(site, 'builds', identity.buildId);
  fs.mkdirSync(root, { recursive: true });
  const game = path.join(root, 'game');
  if (path.resolve(directory) !== path.resolve(game)) fs.cpSync(directory, game, { recursive: true });
  stampGame(game, identity);
  const packed = packBuild({ directory: game, output: root, branch: identity.branch, commit: identity.commit, version: identity.version });
  const data = fs.readFileSync(packed);
  fs.renameSync(packed, path.join(root, 'desktop.json.gz'));
  const entry = { identity, verification, browser: `builds/${identity.buildId}/game/index.html`,
    desktop: { path: `builds/${identity.buildId}/desktop.json.gz`, size: data.length, digest: digest(data) } };
  assertPair(site, entry);
  return entry;
}
export function restorePair(site, entry, data) {
  if (data.length !== entry.desktop.size || digest(data) !== entry.desktop.digest) throw new Error('Previous release download failed verification.');
  const decoded = branches.decodeBundle(data, entry.identity.branch, entry.identity.commit);
  const root = path.join(site, 'builds', entry.identity.buildId);
  for (const file of decoded.files) {
    const dest = path.join(root, 'game', file.name);
    fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, file.data);
  }
  fs.writeFileSync(path.join(root, 'desktop.json.gz'), data);
  assertPair(site, entry);
}
export function assertPair(site, entry) {
  const data = fs.readFileSync(path.join(site, entry.desktop.path));
  if (digest(data) !== entry.desktop.digest || data.length !== entry.desktop.size) throw new Error('Desktop artifact changed after packaging.');
  const bundle = branches.decodeBundle(data, entry.identity.branch, entry.identity.commit);
  const game = path.dirname(path.join(site, entry.browser));
  const listed = new Set(bundle.files.map(f => f.name));
  const walk = (dir, prefix = '') => {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const name = prefix + item.name;
      if (item.isDirectory()) walk(path.join(dir, item.name), name + '/');
      else if (!listed.has(name)) throw new Error('Browser contains a file missing from desktop: ' + name);
    }
  };
  walk(game);
  for (const file of bundle.files) {
    if (!fs.readFileSync(path.join(game, file.name)).equals(file.data)) throw new Error('Browser and desktop differ: ' + file.name);
  }
  const actual = JSON.parse(fs.readFileSync(path.join(game, 'build.json'), 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(entry.identity)) throw new Error('Packaged game identity differs from the release catalog.');
}
export function writeCatalog(site, repository, entries, profiles) {
  const catalog = releases.validateCatalog({ format: 1, repository, entries }, repository);
  for (const entry of entries) assertPair(site, entry);
  const loader = fs.readFileSync(path.join(here, 'release-loader.js'), 'utf8');
  for (const entry of entries) {
    const profile = profiles.find(p => p.ref === entry.identity.branch);
    const destination = entry.identity.branch === 'main' ? 'play' : 'dev/' + profile.id;
    const directory = path.join(site, destination); fs.mkdirSync(directory, { recursive: true });
    const config = { branch: entry.identity.branch, catalog: entry.identity.branch === 'main' ? '../releases.json' : '../../releases.json' };
    fs.writeFileSync(path.join(directory, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><title>Hollow Wake</title></head><body style="background:#101218;color:#ddd;font:16px system-ui"><p id="release-status">Loading the published game…</p><script>window.__HOLLOW_WAKE_RELEASE_LOADER__=${json(config)};</script><script>${loader}</script></body></html>`);
    fs.writeFileSync(path.join(directory, 'build.json'), JSON.stringify(entry.identity, null, 2) + '\n');
  }
  const production = entries.find(e => e.identity.branch === 'main').identity;
  fs.writeFileSync(path.join(site, 'build.json'), JSON.stringify({ production: { ref: 'main', commit: production.commit },
    previews: entries.filter(e => e.identity.branch !== 'main').map(e => ({ ...profiles.find(p => p.ref === e.identity.branch), commit: e.identity.commit, builtAt: e.identity.builtAt })) }, null, 2) + '\n');
  // Last write in staging; the complete directory is promoted in one Pages deployment.
  fs.writeFileSync(path.join(site, 'releases.json'), JSON.stringify(catalog, null, 2) + '\n');
  return catalog;
}
