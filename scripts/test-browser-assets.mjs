import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import branches from '../launcher/branches.cjs';
import { identityFor, makeEntry, restorePair, writeCatalog, assertPair, stampGame, digest } from './release-artifacts.mjs';
import { packBuild } from './build-launcher-branch.mjs';
import { historyPath, readAssetHistory } from './browser-assets.mjs';

const repo = 'owner/game', sharedName = 'assets/shared-abcdefgh.js';
const verification = { runId: 1, url: 'https://github.com/owner/game/actions/runs/1' };
function staging(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-assets-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}
function build(root, site, revision, shared = 'shared game code') {
  const commit = revision.repeat(40);
  const input = path.join(root, revision), script = 'assets/main-' + commit.slice(0, 8) + '.js';
  const html = '<html><head><link rel="icon" href="./favicon.ico"><script type="module" src="./' + script
    + '"></script><link rel="modulepreload" href="./' + sharedName + '"></head><body><img srcset="./assets/art-abcdefgh.png 1x"></body></html>';
  fs.mkdirSync(path.join(input, 'assets'), { recursive: true });
  for (const name of ['index.html', 'showcase.html']) fs.writeFileSync(path.join(input, name), html);
  fs.writeFileSync(path.join(input, script), "import './shared-abcdefgh.js'; // " + revision);
  fs.writeFileSync(path.join(input, sharedName), shared);
  fs.writeFileSync(path.join(input, 'assets/art-abcdefgh.png'), 'picture');
  fs.writeFileSync(path.join(input, 'assets/embedded-abcdefgh.html'), '<html><head></head></html>');
  fs.writeFileSync(path.join(input, 'favicon.ico'), 'local icon');
  const identity = identityFor({ branch: 'main', commit, version: '1', toolingCommit: commit });
  return makeEntry({ site, directory: input, identity, verification });
}

test('two complete releases share assets, preserve desktop paths, and restore identical browser pages', t => {
  const root = staging(t), site = path.join(root, 'site');
  const old = build(root, site, 'a'), next = build(root, site, 'b');
  const pool = path.join(site, 'builds/shared-v1/assets');
  assert.deepEqual(fs.readdirSync(pool).sort(), ['art-abcdefgh.png', 'embedded-abcdefgh.html', 'main-aaaaaaaa.js', 'main-bbbbbbbb.js', 'shared-abcdefgh.js']);
  assert.equal(fs.readFileSync(path.join(pool, 'embedded-abcdefgh.html'), 'utf8'), '<html><head></head></html>');
  for (const entry of [old, next]) {
    const archive = fs.readFileSync(path.join(site, entry.desktop.path));
    const files = new Map(branches.decodeBundle(archive, 'main', entry.identity.commit).files.map(f => [f.name, f.data]));
    const web = path.dirname(path.join(site, entry.browser));
    for (const name of ['index.html', 'showcase.html']) {
      const page = fs.readFileSync(path.join(web, name));
      assert.ok(page.equals(files.get('_browser/' + name)));
      assert.match(page.toString(), /href="\.\.\/\.\.\/shared-v1\/assets\/shared-abcdefgh.js"/);
      assert.match(page.toString(), /href="\.\/favicon.ico"/);
      assert.match(page.toString(), /srcset="\.\.\/\.\.\/shared-v1\/assets\/art-abcdefgh.png 1x"/);
      assert.match(files.get(name).toString(), /href="\.\/assets\/shared-abcdefgh.js"/);
    }
    assert.equal(fs.existsSync(path.join(web, sharedName)), false);
    assert.ok(fs.readFileSync(path.join(pool, 'shared-abcdefgh.js')).equals(files.get(sharedName)));
    const restored = path.join(root, 'restored');
    restorePair(restored, entry, archive);
    assertPair(restored, entry);
  }
  const fresh = writeCatalog(site, repo, [next], []);
  const bytes = fs.readFileSync(path.join(site, historyPath(fresh.assetHistory)));
  const history = readAssetHistory(fresh.assetHistory, bytes);
  assert.equal(history.size, 5);
  assert.throws(() => readAssetHistory(fresh.assetHistory, Buffer.from('[]')), /verification/);
  assert.throws(() => build(root, site, 'c', 'different bytes'), /collision/);
  const laterSite = path.join(root, 'new-deployment');
  const later = build(root, laterSite, 'd', 'conflicting retired filename');
  assert.throws(() => writeCatalog(laterSite, repo, [later], [], history), /collision/);
  assert.equal(fs.existsSync(path.join(laterSite, 'releases.json')), false);
});

test('pre-pool releases restore to their original direct links and save scope', t => {
  const root = staging(t), site = path.join(root, 'site'), entry = build(root, site, 'a');
  const directory = path.join(root, 'a');
  stampGame(directory, entry.identity);
  const packed = packBuild({ directory, output: root, branch: 'main', commit: entry.identity.commit, version: '1' });
  const data = fs.readFileSync(packed);
  // A previous archive has no browser documents or layout marker.
  const { assetLayout, ...legacy } = entry;
  legacy.desktop = { ...entry.desktop, size: data.length, digest: digest(data) };
  const dest = path.join(root, 'restored');
  restorePair(dest, legacy, data);
  const game = path.dirname(path.join(dest, legacy.browser));
  assert.match(fs.readFileSync(path.join(game, 'index.html'), 'utf8'), /src="\.\/assets\/main-aaaaaaaa.js"/);
  assert.equal(fs.readFileSync(path.join(game, sharedName), 'utf8'), 'shared game code');
  assert.equal(JSON.parse(fs.readFileSync(path.join(game, 'build.json'))).storageScope, '');
});

test('the worker only reuses immutable GETs and can recover from a stale missing file', async () => {
  const handlers = {}, calls = [];
  const scope = 'https://owner.example/game/', asset = scope + 'builds/shared-v1/' + sharedName;
  let status = 200;
  vm.runInNewContext(fs.readFileSync(new URL('./game-asset-worker.js', import.meta.url), 'utf8'), {
    URL, self: { registration: { scope }, addEventListener: (type, fn) => { handlers[type] = fn; } },
    fetch: async (request, options) => { calls.push([request.url, options.cache]); return { ok: status === 200 || options.cache === 'reload' }; },
  });
  function dispatch(url, init) {
    let result;
    handlers.fetch({ request: new Request(url, init), respondWith: value => { result = value; } });
    return result;
  }
  for (const url of ['releases.json', 'play/', '__save/0', 'builds/shared-v1/history.json', 'builds/abc/game/index.html']) {
    assert.equal(dispatch(scope + url), undefined);
  }
  for (const init of [{ method: 'POST' }, { headers: { Range: 'bytes=0-10' } }, { cache: 'reload' },
    { cache: 'no-store' }, { cache: 'no-cache' }, { headers: { 'Cache-Control': 'no-cache' } }]) {
    assert.equal(dispatch(asset, init), undefined);
  }
  assert.equal(dispatch(asset + '?v=2'), undefined);
  assert.equal(dispatch(asset.replace('owner.example', 'other.example')), undefined);
  assert.equal((await dispatch(asset)).ok, true);
  status = 404;
  assert.equal((await dispatch(asset)).ok, true);
  assert.deepEqual(calls.map(row => row[1]), ['force-cache', 'force-cache', 'reload']);
});
