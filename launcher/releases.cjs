// @ts-check
'use strict';
// The Pages deployment is the only publication pointer for BOTH game clients.
// Never infer a released game from a branch HEAD or an independently uploaded asset.
const branches = require('./branches.cjs');
const { isCommit, MAX_BUNDLE } = branches;
const fs = require('node:fs');
const path = require('node:path');
const { parseDigest } = require('./updates.cjs');

/** @typedef {{branch:string,commit:string,version:string,toolingCommit:string,buildId:string,builtAt:string,storageScope:string,desktopStorageScope:string,worldmass:boolean}} Identity */
/** @typedef {{identity:Identity,browser:string,desktop:{path:string,size:number,digest:string},verification:{runId:number,url:string}}} Entry */
/** @typedef {{format:1,repository:string,entries:Entry[]}} Catalog */
/** @param {string} repository */
function catalogUrl(repository) {
  if (!/^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error('Invalid release repository.');
  const [owner, repo] = repository.split('/');
  return `https://${owner.toLowerCase()}.github.io/${repo}/releases.json`;
}
/** @param {unknown} p */
function safePath(p) {
  return typeof p === 'string' && /^[a-zA-Z0-9_./-]+$/.test(p)
    && !p.startsWith('/') && p.split('/').every(part => part && part !== '.' && part !== '..');
}
/** @param {any} value @param {string} repository @returns {Catalog} */
function validateCatalog(value, repository) {
  if (value?.format !== 1 || value.repository !== repository || !Array.isArray(value.entries)
      || !value.entries.length || value.entries.length > 100) throw new Error('Invalid coordinated release catalog.');
  const seen = new Set();
  for (const entry of value.entries) {
    const id = entry?.identity;
    if (!id || typeof id.branch !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_./-]*$/.test(id.branch)
        || id.branch.includes('..') || seen.has(id.branch) || !isCommit(id.commit)
        || !/^[a-f0-9]{24}$/.test(id.buildId) || !isCommit(id.toolingCommit) || typeof id.version !== 'string'
        || typeof id.storageScope !== 'string' || typeof id.desktopStorageScope !== 'string'
        || typeof id.worldmass !== 'boolean' || !Number.isFinite(Date.parse(id.builtAt))) {
      throw new Error('Invalid or duplicate released game identity.');
    }
    seen.add(id.branch);
    const prefix = `builds/${id.buildId}/`;
    if (!safePath(entry.browser) || entry.browser !== prefix + 'game/index.html'
        || !safePath(entry.desktop?.path) || entry.desktop.path !== prefix + 'desktop.json.gz'
        || !Number.isSafeInteger(entry.desktop.size) || entry.desktop.size < 1 || entry.desktop.size > MAX_BUNDLE
        || !/^sha256:[a-f0-9]{64}$/.test(entry.desktop.digest ?? '')
        || !Number.isSafeInteger(entry.verification?.runId) || entry.verification.runId < 1
        || entry.verification.url !== `https://github.com/${repository}/actions/runs/${entry.verification.runId}`) {
      throw new Error('Release must contain a verified browser/desktop pair.');
    }
  }
  if (!seen.has('main')) throw new Error('Release catalog has no Main game.');
  return value;
}
/** @param {{gh:string,url?:string,timeoutMs?:number,fetchImpl?:typeof fetch}} options @returns {Promise<Catalog>} */
async function readCatalog(options) {
  const url = new URL(options.url ?? catalogUrl(options.gh));
  url.searchParams.set('catalog', String(Date.now()));
  const response = await (options.fetchImpl ?? fetch)(url, {
    cache: 'no-store', headers: { accept: 'application/json', 'cache-control': 'no-cache' },
    signal: AbortSignal.timeout(options.timeoutMs ?? 8000),
  });
  if (!response.ok) throw new Error('Release catalog answered HTTP ' + response.status);
  const text = await response.text();
  if (text.length > 256 * 1024) throw new Error('Release catalog is too large.');
  return validateCatalog(JSON.parse(text), options.gh);
}
/** @param {Entry} entry @param {string} url */
function bundleFor(entry, url) {
  return { commit: entry.identity.commit, identity: entry.identity, asset: {
    name: 'desktop.json.gz', url: new URL(entry.desktop.path, url).href,
    size: entry.desktop.size, digest: parseDigest(entry.desktop.digest),
  } };
}
/** @param {string} home @param {string} branch @param {string | null} [fallbackRoot] */
function cachedGame(home, branch, fallbackRoot = null) {
  const cached = branches.installed(home);
  for (const root of [cached?.root, fallbackRoot]) {
    if (!root) continue;
    try {
      const identity = /** @type {Identity} */ (JSON.parse(fs.readFileSync(path.join(root, 'build.json'), 'utf8')));
      if (identity.branch !== branch || !isCommit(identity.commit) || !/^[a-f0-9]{24}$/.test(identity.buildId)
          || !fs.existsSync(path.join(root, 'index.html'))) continue;
      return { branch, commit: identity.commit, version: identity.version, root, identity, digest: root === cached?.root ? cached.digest : undefined };
    } catch { /* A local developer build is not a released offline fallback. */ }
  }
  return null;
}
/** @param {{gh:string,branch:string,home:string,fallbackRoot?:string|null,url?:string,fetchImpl?:typeof fetch,onProgress?:(p:{pct:number,got:number,total:number})=>void}} options */
async function prepareGame(options) {
  try {
    const catalog = await readCatalog(options);
    const entry = catalog.entries.find(e => e.identity.branch === options.branch);
    if (!entry) throw new Error('This branch is not published.');
    let game = cachedGame(options.home, options.branch, options.fallbackRoot);
    if (game?.identity.buildId !== entry.identity.buildId) {
      await branches.downloadBundle({ home: options.home, branch: options.branch,
        bundle: bundleFor(entry, options.url ?? catalogUrl(options.gh)), expectedIdentity: entry.identity,
        fetchImpl: options.fetchImpl, onProgress: options.onProgress });
      game = cachedGame(options.home, options.branch);
    }
    return { game, offline: false, error: '' };
  } catch (error) {
    return { game: cachedGame(options.home, options.branch, options.fallbackRoot), offline: true, error: String(error) };
  }
}
module.exports = { catalogUrl, validateCatalog, readCatalog, bundleFor, safePath, cachedGame, prepareGame };
