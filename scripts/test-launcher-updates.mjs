// ---------------------------------------------------------------------------
// THE RELEASE CHANNEL's law rig — `npm run test:launcher` (node --test).
// launcher/updates.cjs is pure on purpose so every law of the update path is
// provable here with no Electron, no window and no network: the selection
// (which release a launcher is offered), the failed-night law (what it must
// never be offered), and the digest law (what it will refuse to run), the
// last against a loopback server. ci.yml and nightly.yml's verify both run
// it; release.yml's packaged `--smoke-test=update` is its in-runtime twin.
// ---------------------------------------------------------------------------
import assert from 'node:assert/strict';
import { test, after, before } from 'node:test';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const U = require('../launcher/updates.cjs');

// ------------------------------------------------------------------ fixtures

const DIGEST = 'sha256:' + 'ab'.repeat(32);
/** A GitHub release object, as the REST API shapes it. */
function rel(ver, o = {}) {
  const names = o.names ?? [`HollowWake-Setup-${ver}.exe`, `HollowWake-Setup-${ver}.exe.blockmap`,
    `HollowWake-${ver}-x86_64.AppImage`, 'latest.yml', 'latest-linux.yml'];
  return {
    tag_name: o.tag ?? `v${ver}`, name: o.name ?? `Hollow Wake v${ver}`, html_url: `https://example.invalid/v${ver}`,
    draft: !!o.draft, prerelease: !!o.prerelease,
    assets: names.map(name => ({
      name, size: 1000, digest: DIGEST, browser_download_url: `https://example.invalid/dl/${name}`,
      state: (o.open ?? []).some(sfx => name.toLowerCase().endsWith(sfx)) ? 'open' : 'uploaded',
    })),
  };
}
const pick = (releases, o) => U.pickUpdate(releases, { platform: 'win32', channel: 'nightly', current: '0.5.0', ...o });

// ------------------------------------------------------------- the registry

test('the channel registry: nightly is the default, stable is the opt-out', () => {
  assert.deepEqual(U.UPDATE_CHANNELS.map(c => c.id), ['nightly', 'stable']);
  assert.equal(U.channelRow(undefined).id, 'nightly', 'a missing channel folds to the default');
  assert.equal(U.channelRow('beta-typo').id, 'nightly', 'an unknown channel folds to the default, never throws');
  assert.equal(U.channelRow('stable').prereleases, false);
  assert.equal(U.channelRow('nightly').prereleases, true);
  for (const c of U.UPDATE_CHANNELS) assert.ok(c.label && c.blurb, `${c.id} carries its picker words`);
});

test('the one dial fold: defaults, clamps and the api root', () => {
  const d = U.resolveUpdateCfg(undefined, undefined);
  assert.equal(d.channel, 'nightly');
  assert.equal(d.scanReleases, U.UPDATE_DEFAULTS.scanReleases);
  assert.equal(d.verifyDigest, true);
  assert.equal(d.api, 'https://api.github.com');
  const c = U.resolveUpdateCfg({ channel: 'stable', scanReleases: 9999, verifyDigest: false, stallSec: 0 }, { api: 'http://127.0.0.1:9/' });
  assert.equal(c.channel, 'stable');
  assert.equal(c.scanReleases, 100, 'the scan window clamps to the API page ceiling');
  assert.equal(c.verifyDigest, false);
  assert.equal(c.stallMs, 5000, 'a zero stall timer clamps up — never an instant abort');
  assert.equal(c.api, 'http://127.0.0.1:9', 'a trailing slash is trimmed');
  assert.equal(U.resolveUpdateCfg({}, { api: 'ftp://nope' }).api, 'https://api.github.com', 'a non-http root is refused');
  assert.equal(d.quiet, true, 'the quiet update is on by default');
  assert.equal(d.quietDelayMs, U.UPDATE_DEFAULTS.quietDelaySec * 1000);
  assert.equal(U.resolveUpdateCfg({ quiet: false }).quiet, false);
  assert.equal(U.resolveUpdateCfg({ quietDelaySec: -5 }).quietDelayMs, 0, 'a negative delay clamps to none');
});

test('probe urls: the list for nightly, /latest for stable', () => {
  const ucfg = U.resolveUpdateCfg({ scanReleases: 7 });
  assert.equal(U.probeUrl('o/r', 'nightly', ucfg), 'https://api.github.com/repos/o/r/releases?per_page=7');
  assert.equal(U.probeUrl('o/r', 'stable', ucfg), 'https://api.github.com/repos/o/r/releases/latest');
});

// ---------------------------------------------------------------- versions

test('versions: tags are strict, installed versions lenient, compare is numeric', () => {
  assert.deepEqual(U.parseTag('v0.5.39'), [0, 5, 39]);
  assert.deepEqual(U.parseTag('0.6.0'), [0, 6, 0]);
  for (const bad of ['v0.6.0-beta.1', 'nightly', 'v1.2', 'tools-v1.2.3', '', null, 'v0.5.39 '.repeat(2)]) {
    assert.equal(U.parseTag(bad), null, `'${bad}' is not a game build's tag`);
  }
  assert.deepEqual(U.parseVer('0.6.0-dev'), [0, 6, 0], 'a local suffix still reads as its base version');
  assert.ok(U.newerVersion([0, 5, 10], [0, 5, 9]), '0.5.10 outranks 0.5.9 (numeric, never lexical)');
  assert.ok(U.newerVersion([0, 6, 0], [0, 5, 39]), 'a hand-cut stable outranks every RC of the old minor');
  assert.ok(!U.newerVersion([0, 5, 39], [0, 5, 39]));
  assert.equal(Math.sign(U.cmpVer([1, 0, 0], [0, 99, 99])), 1);
});

// ------------------------------------------------------------------- assets

test('assets: platform suffix, completeness, and the version-named artifact wins', () => {
  const r = rel('0.5.39');
  assert.equal(U.pickReleaseAsset(r.assets, 'win32', '0.5.39').name, 'HollowWake-Setup-0.5.39.exe', 'never the .blockmap');
  assert.equal(U.pickReleaseAsset(r.assets, 'linux', '0.5.39').name, 'HollowWake-0.5.39-x86_64.AppImage');
  assert.equal(U.pickReleaseAsset(r.assets, 'darwin', '0.5.39'), null, 'no artifact exists for an unsupported platform');
  assert.deepEqual(U.pickReleaseAsset(r.assets, 'win32').digest, { algo: 'sha256', hex: 'ab'.repeat(32) });

  const stray = rel('0.5.39', { names: ['some-tool.exe', 'HollowWake-Setup-0.5.39.exe'] });
  assert.equal(U.pickReleaseAsset(stray.assets, 'win32', '0.5.39').name, 'HollowWake-Setup-0.5.39.exe',
    'a hand-attached stray .exe listed first is never the thing the launcher runs');

  assert.equal(U.pickReleaseAsset(rel('0.5.39', { open: ['.exe'] }).assets, 'win32', '0.5.39'), null, "an 'open' upload is not installable");
  const empty = rel('0.5.39'); empty.assets.forEach(a => { a.size = 0; });
  assert.equal(U.pickReleaseAsset(empty.assets, 'win32', '0.5.39'), null, 'a zero-byte asset is not installable');
  assert.equal(U.pickReleaseAsset(null, 'win32'), null);
  assert.equal(U.parseDigest('md5:abc'), null, 'only digests we verify are carried');
  assert.equal(U.parseDigest(undefined), null);
});

// ------------------------------------------------------------ the selection

test('nightly channel: the newest published build wins, prereleases included', () => {
  const p = pick([rel('0.5.39', { prerelease: true }), rel('0.5.38', { prerelease: true }), rel('0.5.0')], { current: '0.5.37' });
  assert.equal(p.target.tag, 'v0.5.39');
  assert.equal(p.behind, 2);
  assert.deepEqual(p.newer.map(r => r.tag), ['v0.5.39', 'v0.5.38'], 'newest first');
  assert.equal(p.target.prerelease, true);
  assert.equal(p.target.asset.name, 'HollowWake-Setup-0.5.39.exe');
});

test('stable channel: prereleases are off-channel', () => {
  const list = [rel('0.5.39', { prerelease: true }), rel('0.5.0')];
  assert.equal(pick(list, { channel: 'stable', current: '0.4.0' }).target.tag, 'v0.5.0');
  assert.equal(pick(list, { channel: 'stable', current: '0.5.0' }).behind, 0);
});

test('it never downgrades: an install above the channel head is simply up to date', () => {
  const p = pick([rel('0.5.0')], { channel: 'stable', current: '0.5.39' });
  assert.equal(p.behind, 0);
  assert.deepEqual(p.newer, []);
  assert.equal(pick([rel('0.5.39', { prerelease: true })], { current: '0.5.39' }).behind, 0, 'equal is not newer');
});

test('a hand-cut stable outranks the old minor\'s RCs on the nightly channel too', () => {
  const p = pick([rel('0.5.41', { prerelease: true }), rel('0.6.0'), rel('0.5.40', { prerelease: true })], { current: '0.5.40' });
  assert.equal(p.target.tag, 'v0.6.0', 'sorted by version, never by list order');
  assert.deepEqual(p.newer.map(r => r.tag), ['v0.6.0', 'v0.5.41']);
});

test('THE FAILED-NIGHT LAW: a draft is never offered', () => {
  const p = pick([rel('0.5.40', { draft: true, prerelease: true }), rel('0.5.39', { prerelease: true })], { current: '0.5.38' });
  assert.equal(p.target.tag, 'v0.5.39', 'the unpublished night is invisible; the last good night stands');
  assert.equal(p.behind, 1);
  assert.deepEqual(p.skipped, [], 'a draft is not even named — it does not exist to a player');
});

test('THE FAILED-NIGHT LAW: an incomplete release is passed over for the one beneath it', () => {
  const half = rel('0.5.40', { prerelease: true, open: ['.exe'] });
  const p = pick([half, rel('0.5.39', { prerelease: true })], { current: '0.5.38' });
  assert.equal(p.target.tag, 'v0.5.39');
  assert.equal(p.behind, 1);
  assert.equal(p.skipped.length, 1);
  assert.equal(p.skipped[0].tag, 'v0.5.40');
  assert.match(p.skipped[0].why, /never finished uploading/);
  // …and the same release is perfectly good for the OTHER platform.
  assert.equal(pick([half, rel('0.5.39', { prerelease: true })], { platform: 'linux', current: '0.5.38' }).target.tag, 'v0.5.40');

  const bare = rel('0.5.40', { prerelease: true, names: ['latest-linux.yml', 'HollowWake-0.5.40-x86_64.AppImage'] });
  const q = pick([bare], { current: '0.5.38' });
  assert.equal(q.target, null, 'an AppImage-only release offers a Windows install nothing (the v0.2.0 incident)');
  assert.match(q.skipped[0].why, /no Windows installer is attached/);
});

test('non-version tags and junk entries are not game builds', () => {
  const p = pick([rel('9.9.9', { tag: 'tools-latest' }), rel('9.9.8', { tag: 'v9.9.8-beta.1' }), null, 'x', {}, rel('0.5.1', { prerelease: true })]);
  assert.equal(p.target.tag, 'v0.5.1');
  assert.equal(p.scanned, 1);
  assert.equal(pick(undefined).target, null);
  assert.equal(pick([]).behind, 0);
});

test('an unparseable installed version is offered nothing', () => {
  const p = pick([rel('0.5.39', { prerelease: true })], { current: 'dev-build' });
  assert.equal(p.behind, 0, 'we cannot know which way is up, so we do not move');
  assert.equal(p.target.tag, 'v0.5.39', 'the head is still reported');
});

test('capped: only a FULL window of all-newer releases claims "or more"', () => {
  const three = [rel('0.5.3', { prerelease: true }), rel('0.5.2', { prerelease: true }), rel('0.5.1', { prerelease: true })];
  assert.equal(pick(three, { current: '0.5.0', window: 3 }).capped, true);
  assert.equal(pick(three, { current: '0.5.0', window: 10 }).capped, false, 'the repo simply holds three');
  assert.equal(pick(three, { current: '0.5.1', window: 3 }).capped, false, 'the window reached our own version');
});

// ------------------------------------------------- the probe + the download

const payload = Buffer.alloc(200 * 1024);
for (let i = 0; i < payload.length; i++) payload[i] = (i * 17 + (i >> 9)) & 0xff;
const trueDigest = U.parseDigest('sha256:' + createHash('sha256').update(payload).digest('hex'));
const liar = Buffer.from(payload); liar[1234] ^= 0x55;

let origin = '';
let limited = false;
let tmp = '';
const server = createServer((req, res) => {
  const url = String(req.url);
  const json = (code, body, headers = {}) => { res.writeHead(code, { 'content-type': 'application/json', ...headers }); res.end(JSON.stringify(body)); };
  if (limited) return json(403, { message: 'API rate limit exceeded' }, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 1200) });
  if (url.startsWith('/repos/o/r/releases/latest')) return json(200, rel('0.5.0'));
  if (url.startsWith('/repos/o/none/releases/latest')) return json(404, { message: 'Not Found' });
  if (url.startsWith('/repos/o/broken/releases')) return json(500, { message: 'boom' });
  if (url.startsWith('/repos/o/r/releases?per_page=')) return json(200, [rel('0.5.2', { prerelease: true }), rel('0.5.0')]);
  if (url === '/dl/good') { res.writeHead(200, { 'content-length': payload.length }); return res.end(payload); }
  if (url === '/dl/liar') { res.writeHead(200, { 'content-length': liar.length }); return res.end(liar); }
  if (url === '/dl/short') { res.writeHead(200, { 'content-length': payload.length }); res.write(payload.subarray(0, 4096)); return void setTimeout(() => res.destroy(), 30); }
  if (url === '/dl/stall') { res.writeHead(200, { 'content-length': payload.length }); return void res.write(payload.subarray(0, 4096)); }
  if (url === '/dl/missing') { res.writeHead(404); return res.end(); }
  res.writeHead(404); res.end();
});
before(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  origin = `http://127.0.0.1:${server.address().port}`;
  tmp = mkdtempSync(join(tmpdir(), 'hollow-updates-test-'));
});
after(() => {
  server.closeAllConnections?.();
  server.close();
  // Only remove the exact disposable directory this rig created.
  assert.equal(dirname(resolve(tmp)), resolve(tmpdir()));
  assert.ok(basename(tmp).startsWith('hollow-updates-test-'));
  rmSync(tmp, { recursive: true, force: true });
});
const ucfgAt = (o = {}) => U.resolveUpdateCfg({ scanReleases: 5, ...o }, { api: origin });

test('the probe: both channels resolve to an array pickUpdate can read', async () => {
  const nightly = await U.fetchReleases({ gh: 'o/r', channel: 'nightly', ucfg: ucfgAt() });
  assert.deepEqual(nightly.map(r => r.tag_name), ['v0.5.2', 'v0.5.0']);
  assert.equal(pick(nightly, { current: '0.5.0' }).target.tag, 'v0.5.2');
  const stable = await U.fetchReleases({ gh: 'o/r', channel: 'stable', ucfg: ucfgAt() });
  assert.deepEqual(stable.map(r => r.tag_name), ['v0.5.0'], "the single 'latest' object is wrapped");
  assert.deepEqual(await U.fetchReleases({ gh: 'o/none', channel: 'stable', ucfg: ucfgAt() }), [], 'no stable yet = nothing, not an error');
});

test('the probe: a refusal carries words a player can read', async () => {
  await assert.rejects(U.fetchReleases({ gh: 'o/broken', channel: 'nightly', ucfg: ucfgAt() }), (e) => e instanceof U.ProbeError && e.status === 500);
  limited = true;
  try {
    await assert.rejects(U.fetchReleases({ gh: 'o/r', channel: 'nightly', ucfg: ucfgAt() }),
      (e) => e instanceof U.ProbeError && e.status === 403 && /allowance is spent/.test(e.message) && /refills in about \d+ min/.test(e.message));
  } finally { limited = false; }
});

test('THE DIGEST LAW: a true artifact lands verified, byte for byte', async () => {
  const dest = join(tmp, 'good.bin');
  const seen = [];
  const r = await U.downloadAsset({ url: `${origin}/dl/good`, dest, sizeHint: payload.length, digest: trueDigest, onProgress: p => seen.push(p.pct) });
  assert.equal(r.verified, true);
  assert.equal(r.bytes, payload.length);
  assert.equal(r.digest, `sha256:${trueDigest.hex}`);
  assert.ok(readFileSync(dest).equals(payload));
  assert.equal(seen.at(-1), 100);
  assert.deepEqual(seen, [...seen].sort((a, b) => a - b), 'progress only climbs');
});

test('THE DIGEST LAW: a same-length liar is refused AND deleted', async () => {
  const dest = join(tmp, 'liar.bin');
  await assert.rejects(U.downloadAsset({ url: `${origin}/dl/liar`, dest, sizeHint: liar.length, digest: trueDigest }), /failed verification/);
  assert.equal(existsSync(dest), false, 'nothing unverified is left on disk to be run');
});

test('THE DIGEST LAW: the dial and the digest-less release fall back to the byte count', async () => {
  const off = join(tmp, 'off.bin');
  const r = await U.downloadAsset({ url: `${origin}/dl/liar`, dest: off, sizeHint: liar.length, digest: trueDigest, verifyDigest: false });
  assert.equal(r.verified, false, 'verifyDigest=false is honoured, and SAYS it verified nothing');
  assert.equal(statSync(off).size, liar.length);
  const none = join(tmp, 'none.bin');
  assert.equal((await U.downloadAsset({ url: `${origin}/dl/good`, dest: none, sizeHint: payload.length, digest: null })).verified, false);
  await assert.rejects(U.downloadAsset({ url: `${origin}/dl/good`, dest: join(tmp, 'size.bin'), sizeHint: payload.length + 1, digest: null }),
    /the release lists/, 'with no digest, the listed size is the stand-in');
  assert.equal(existsSync(join(tmp, 'size.bin')), false);
});

test('a truncated, stalled or missing download is a named failure that leaves nothing behind', async () => {
  const cut = join(tmp, 'short.bin');
  await assert.rejects(U.downloadAsset({ url: `${origin}/dl/short`, dest: cut, digest: trueDigest }));
  assert.equal(existsSync(cut), false);

  const stuck = join(tmp, 'stall.bin');
  const t0 = Date.now();
  await assert.rejects(U.downloadAsset({ url: `${origin}/dl/stall`, dest: stuck, digest: trueDigest, stallMs: 400 }), /stalled — no data for/);
  assert.ok(Date.now() - t0 < 5000, 'the stall timer fires long before the ceiling');
  assert.equal(existsSync(stuck), false);

  await assert.rejects(U.downloadAsset({ url: `${origin}/dl/stall`, dest: join(tmp, 'ceiling.bin'), digest: trueDigest, stallMs: 60000, ceilingMs: 300 }), /ceiling/);
  await assert.rejects(U.downloadAsset({ url: `${origin}/dl/missing`, dest: join(tmp, 'missing.bin') }), /HTTP 404/);
  assert.equal(existsSync(join(tmp, 'missing.bin')), false);
});

// ------------------------------------------------------------ the in-place swap

const goodDownload = (dest) => U.downloadAsset({ url: `${origin}/dl/good`, dest, sizeHint: payload.length, digest: trueDigest });
const liarDownload = (dest) => U.downloadAsset({ url: `${origin}/dl/liar`, dest, sizeHint: liar.length, digest: trueDigest });
/** A folder shaped like a Deck's: the running AppImage, a leftover from a
 *  session killed mid-download, and files that are none of our business. */
function deckFolder(name) {
  const dir = join(tmp, name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const self = join(dir, 'HollowWake.AppImage');
  writeFileSync(self, 'the build that is running');
  writeFileSync(join(dir, '.HollowWake-0.5.1-x86_64.AppImage.downloading'), 'killed mid-download');
  writeFileSync(join(dir, 'notes.txt'), 'a player file');
  writeFileSync(join(dir, '.hidden-but-not-ours'), 'x');
  return { dir, self };
}

test('THE IN-PLACE SWAP: a verified successor takes the SAME path, and stale staging is swept', async () => {
  const { dir, self } = deckFolder('deck-good');
  const r = await U.swapInPlace({ self, assetName: 'HollowWake-0.5.2-x86_64.AppImage', download: goodDownload });
  assert.ok(readFileSync(self).equals(payload), 'the path now names the verified build');
  assert.deepEqual(r.swept, ['.HollowWake-0.5.1-x86_64.AppImage.downloading']);
  assert.deepEqual(readdirSync(dir).sort(), ['.hidden-but-not-ours', 'HollowWake.AppImage', 'notes.txt'],
    'nothing staged is left, and nothing that is not ours was touched');
});

test('THE IN-PLACE SWAP: a refused download leaves the running file exactly as it was', async () => {
  const { dir, self } = deckFolder('deck-liar');
  await assert.rejects(U.swapInPlace({ self, assetName: 'HollowWake-0.5.2-x86_64.AppImage', download: liarDownload }), /failed verification/);
  assert.equal(readFileSync(self, 'utf8'), 'the build that is running');
  assert.equal(readdirSync(dir).some(n => n.endsWith(U.STAGED_SUFFIX)), false, 'no staging residue');
});

test('THE IN-PLACE SWAP: an unwritable or missing folder refuses BEFORE any download', async () => {
  let called = false;
  await assert.rejects(U.swapInPlace({ self: join(tmp, 'no-such-folder', 'HollowWake.AppImage'), assetName: 'a.AppImage',
    download: async () => { called = true; } }));
  assert.equal(called, false);
  assert.deepEqual(U.sweepStaged(join(tmp, 'no-such-folder')), [], 'sweeping nowhere is nothing, not an error');
});
