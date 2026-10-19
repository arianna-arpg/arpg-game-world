// @ts-check
'use strict';
// Dynamic desktop game builds. No Electron and no runtime dependencies.
// Branch names never become filesystem paths; repository + ref scope each cache.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { downloadAsset, parseDigest } = require('./updates.cjs');

const RELEASE_TAG = 'launcher-builds';
const MAX_BUNDLE = 128 * 1024 * 1024;
const MAX_EXPANDED = 256 * 1024 * 1024;
class ApiError extends Error {
  /** @param {number} status */
  constructor(status) { super('GitHub answered HTTP ' + status + (status === 403 || status === 429 ? ' (request limit or access restriction).' : '.')); this.status = status; }
}
/** @param {string} value */
const key = value => crypto.createHash('sha256').update(value).digest('hex').slice(0, 32);
/** @param {string} branch */
const assetPrefix = branch => 'game-' + key(branch) + '-';
/** @param {string} branch @param {string} commit */
const assetName = (branch, commit) => assetPrefix(branch) + commit + '.json.gz';
/** @param {unknown} v */
const isCommit = v => typeof v === 'string' && /^[a-f0-9]{40}$/.test(v);
/** @param {string} root @param {string} gh @param {string} branch */
const branchDir = (root, gh, branch) => path.join(root, key(gh.toLowerCase()), key(branch));
/** @typedef {{name: string, commit: string}} Branch */
/** @typedef {{branch: string, commit: string, version: string, root: string}} Installed */
/** @typedef {{gh: string, api?: string, timeoutMs?: number, fetchImpl?: typeof fetch}} Api */

/** @param {Api} o @param {string} route */
async function request(o, route) {
  if (!/^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_][A-Za-z0-9_.-]*$/.test(o.gh)) throw new Error('The GitHub repository must be owner/name.');
  const res = await (o.fetchImpl ?? fetch)((o.api ?? 'https://api.github.com') + '/repos/' + o.gh + route, {
    headers: { accept: 'application/vnd.github+json', 'user-agent': 'hollow-wake-launcher' },
    signal: AbortSignal.timeout(o.timeoutMs ?? 8000),
  });
  if (!res.ok) throw new ApiError(res.status);
  return /** @type {any} */ (await res.json());
}

/** Never use a stale disk catalog: a failed/partial listing must fall back to Main.
 * @param {Api} o @returns {Promise<Branch[]>} */
async function listBranches(o) {
  /** @type {Branch[]} */ const rows = [];
  for (let page = 1; page <= 100; page++) {
    const batch = await request(o, '/branches?per_page=100&page=' + page);
    if (!Array.isArray(batch)) throw new Error('GitHub returned an invalid branch list.');
    for (const b of batch) {
      if (typeof b?.name !== 'string' || !b.name || !isCommit(b.commit?.sha)) throw new Error('GitHub returned an invalid branch.');
      rows.push({ name: b.name, commit: b.commit.sha });
    }
    if (batch.length < 100) return [...new Map(rows.map(b => [b.name, b])).values()].sort((a, b) => a.name.localeCompare(b.name));
  }
  throw new Error('The branch list exceeded the supported limit.');
}

/** @param {Branch[]} rows @param {string} selected @param {string} main @param {boolean} online */
function selectAvailable(rows, selected, main, online) {
  return online && rows.some(b => b.name === selected) ? selected : main;
}

/** @param {any[]} assets @param {string} branch */
function pickBundle(assets, branch) {
  const prefix = assetPrefix(branch);
  const hits = assets.filter(a => {
    const commit = typeof a?.name === 'string' ? a.name.slice(prefix.length, -8) : '';
    return a?.name?.startsWith(prefix) && a.name.endsWith('.json.gz') && isCommit(commit)
      && a.state === 'uploaded' && Number.isSafeInteger(a.size) && a.size > 0 && a.size <= MAX_BUNDLE
      && /^https:\/\//.test(a.browser_download_url ?? '') && /^sha256:[a-f0-9]{64}$/.test(a.digest ?? '');
  });
  hits.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)) || Number(b.id) - Number(a.id));
  const a = hits[0];
  return a ? { commit: a.name.slice(prefix.length, -8), asset: {
    name: a.name, url: a.browser_download_url, size: a.size, digest: parseDigest(a.digest),
  }} : null;
}

/** A single non-version release holds all branch builds, keeping the normal release
 * scanner clear. Asset pagination matters once there are many branches.
 * @param {Api} o @param {string} branch */
async function findBundle(o, branch) {
  let rel;
  try { rel = await request(o, '/releases/tags/' + RELEASE_TAG); }
  catch (e) { if (e instanceof ApiError && e.status === 404) return null; throw e; }
  if (rel.draft || !Number.isSafeInteger(rel.id)) throw new Error('Branch downloads are not published yet.');
  /** @type {any[]} */ const assets = [];
  for (let page = 1; page <= 100; page++) {
    const batch = await request(o, '/releases/' + rel.id + '/assets?per_page=100&page=' + page);
    if (!Array.isArray(batch)) throw new Error('GitHub returned an invalid download list.');
    assets.push(...batch);
    if (batch.length < 100) return pickBundle(assets, branch);
  }
  throw new Error('The download list exceeded the supported limit.');
}

/** Reject traversal, aliases on Windows, ADS, reserved devices, and duplicate paths.
 * @param {unknown} value */
function safeFile(value) {
  if (typeof value !== 'string' || value.length > 220 || /[\\\x00-\x1f<>:"|?*]/.test(value)) return false;
  return value.split('/').every(p => p && p !== '.' && p !== '..' && !/[. ]$/.test(p)
    && !/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(p));
}

/** @param {Buffer} compressed @param {string} branch @param {string} commit */
function decodeBundle(compressed, branch, commit) {
  if (compressed.length > MAX_BUNDLE) throw new Error('Branch download is too large.');
  const b = JSON.parse(zlib.gunzipSync(compressed, { maxOutputLength: MAX_EXPANDED }).toString('utf8'));
  if (b.format !== 1 || b.branch !== branch || b.commit !== commit || !isCommit(commit)
      || typeof b.version !== 'string' || !Array.isArray(b.files) || !b.files.length || b.files.length > 10000) {
    throw new Error('The branch download identity or format is invalid.');
  }
  const seen = new Set();
  let bytes = 0;
  /** @type {{name: string, data: Buffer}[]} */ const files = [];
  for (const f of b.files) {
    if (!safeFile(f?.name) || seen.has(f.name.toLowerCase()) || typeof f.data !== 'string'
        || (f.data.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(f.data))) {
      throw new Error('The branch download contains an unsafe or duplicate file.');
    }
    seen.add(f.name.toLowerCase());
    const data = Buffer.from(f.data, 'base64');
    bytes += data.length;
    if (bytes > MAX_EXPANDED) throw new Error('The branch download expands beyond its limit.');
    files.push({ name: f.name, data });
  }
  if (!files.some(f => f.name === 'index.html' && f.data.length)) throw new Error('The branch download has no game entry point.');
  return { version: b.version, files };
}

/** @param {string} home @returns {Installed | null} */
function installed(home) {
  try {
    const row = JSON.parse(fs.readFileSync(path.join(home, 'current.json'), 'utf8'));
    if (!isCommit(row.commit) || typeof row.branch !== 'string') return null;
    const root = path.join(home, row.commit, 'game');
    const info = JSON.parse(fs.readFileSync(path.join(home, row.commit, 'build.json'), 'utf8'));
    if (info.commit !== row.commit || info.branch !== row.branch || !fs.statSync(path.join(root, 'index.html')).isFile()) return null;
    return { branch: row.branch, commit: row.commit, version: String(info.version), root };
  } catch { return null; }
}

/** Stage into a fresh directory and publish the pointer LAST. Interrupted installs
 * cannot damage the previous build or its saves. All removal targets are generated
 * descendants of the resolved cache home, never branch names or archive paths.
 * @param {{home: string, branch: string, commit: string, compressed: Buffer}} o */
function installBundle(o) {
  const decoded = decodeBundle(o.compressed, o.branch, o.commit);
  const home = path.resolve(o.home);
  fs.mkdirSync(home, { recursive: true });
  const stage = fs.mkdtempSync(path.join(home, '.stage-'));
  const final = path.join(home, o.commit);
  const info = { branch: o.branch, commit: o.commit, version: decoded.version };
  try {
    for (const f of decoded.files) {
      const file = path.join(stage, 'game', f.name);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, f.data, { flag: 'wx' });
    }
    fs.writeFileSync(path.join(stage, 'build.json'), JSON.stringify(info));
    // Identical immutable commit builds are reusable. Never replace a running tree.
    if (!fs.existsSync(final)) fs.renameSync(stage, final);
    else {
      const previous = JSON.parse(fs.readFileSync(path.join(final, 'build.json'), 'utf8'));
      if (previous.branch !== o.branch || previous.commit !== o.commit || !fs.statSync(path.join(final, 'game', 'index.html')).isFile()) {
        throw new Error('The existing cached commit is invalid.');
      }
    }
    const pointer = path.join(home, '.current-' + crypto.randomUUID() + '.json');
    try {
      fs.writeFileSync(pointer, JSON.stringify(info), { flag: 'wx' });
      fs.renameSync(pointer, path.join(home, 'current.json'));
    } finally { fs.rmSync(pointer, { force: true }); }
  } finally { fs.rmSync(stage, { recursive: true, force: true }); }
  const result = installed(home);
  if (!result || result.commit !== o.commit || result.branch !== o.branch) throw new Error('The installed branch failed validation.');
  return result;
}

/** @param {{home: string, branch: string, bundle: NonNullable<ReturnType<typeof pickBundle>>, fetchImpl?: typeof fetch, onProgress?: (p: {pct: number, got: number, total: number}) => void}} o */
async function downloadBundle(o) {
  const home = path.resolve(o.home);
  fs.mkdirSync(home, { recursive: true });
  const dest = path.join(home, '.download-' + crypto.randomUUID());
  try {
    await downloadAsset({ ...o.bundle.asset, url: o.bundle.asset.url, dest,
      sizeHint: o.bundle.asset.size, verifyDigest: true, fetchImpl: o.fetchImpl,
      onProgress: o.onProgress, ceilingMs: 10 * 60_000, stallMs: 30_000 });
    return installBundle({ home, branch: o.branch, commit: o.bundle.commit, compressed: fs.readFileSync(dest) });
  } finally { fs.rmSync(dest, { force: true }); }
}

module.exports = { RELEASE_TAG, MAX_BUNDLE, MAX_EXPANDED, key, assetPrefix, assetName, isCommit,
  branchDir, listBranches, selectAvailable, pickBundle, findBundle, safeFile, decodeBundle, installed, installBundle, downloadBundle };

