import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

// The module graph keeps its original sibling filenames (including CSS URLs,
// dynamic imports and workers). Only the entry documents need new asset URLs.
export const assetLayout = 'shared-v1';
const pool = 'builds/' + assetLayout;
const documents = '_browser/';
const fingerprint = /^assets\/(?:[\w.-]+\/)*[\w.-]+[-.][\w-]{8,}\.[a-z\d]+$/i;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

// Local index.html remains the desktop entry. Its small browser counterpart
// travels inside the same verified download, so restoring an old release
// never regenerates its HTML with newer tooling.
export function browserFile(site, entry, name) {
  if (entry.assetLayout !== undefined && entry.assetLayout !== assetLayout) throw Error('Unknown browser asset layout.');
  if (entry.assetLayout && name.endsWith('.html')) {
    if (!name.startsWith(documents)) return null;
    name = name.slice(documents.length);
  }
  if (entry.assetLayout && name.startsWith('assets/')) {
    if (!fingerprint.test(name)) throw Error('Unversioned browser asset: ' + name);
    return path.join(site, pool, name);
  }
  return path.join(site, path.dirname(entry.browser), name);
}

function browserDocument(entry, name, source, files) {
  const page = path.posix.join(path.posix.dirname(entry.browser), name);
  const relativePool = path.posix.relative(path.posix.dirname(page), pool);
  // Vite can emit these URLs in src, href, srcset or an inline CSS url().
  // Preserve the surrounding HTML and any query/fragment on the asset.
  const html = source.replace(/(^|[\s"'(,=])((?:\.\.?\/)*assets\/[\w./-]+\.[a-z\d]+)(?=[\s"'?#),<>]|$)/gi,
    (_, start, ref) => {
      const asset = path.posix.join(path.posix.dirname(name), ref);
      if (!files.has(asset) || !fingerprint.test(asset)) throw Error('Missing or unversioned browser entry asset: ' + ref);
      return start + relativePool + '/' + asset;
    });
  const worker = path.posix.relative(path.posix.dirname(page), 'game-asset-worker.js');
  // Registration is optional. Normal HTTP caching works from the very first
  // visit, including browsers that disable service workers.
  return Buffer.from(html.replace('</head>', '<meta name="hollow-wake-shared-assets" content="1"><script>if ("serviceWorker" in navigator) navigator.serviceWorker.register(new URL("' + worker + '", document.baseURI)).catch(() => {});</script></head>'));
}

export function packBrowserDocuments(game, entry) {
  const names = new Set(fs.readdirSync(game, { recursive: true, encoding: 'utf8' }).map(p => p.split(path.sep).join('/')));
  if (names.has('_browser')) throw Error('Reserved browser document directory in game.');
  for (const name of names) {
    if (!name.endsWith('.html')) continue;
    const destination = path.join(game, documents, name);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, browserDocument(entry, name, fs.readFileSync(path.join(game, name), 'utf8'), names));
  }
}

export function stageBrowserFiles(site, entry, files) {
  for (const file of files) {
    const dest = browserFile(site, entry, file.name);
    if (!dest) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (entry.assetLayout && file.name.startsWith('assets/') && fs.existsSync(dest)) {
      if (!fs.readFileSync(dest).equals(file.data)) throw Error('Browser asset fingerprint collision: ' + file.name);
    } else fs.writeFileSync(dest, file.data);
  }
}

// Remember retired names as well. A returning player's HTTP cache can outlive
// the two published releases. Only the publisher downloads this digest list.
export function historyPath(digest) {
  if (!/^[a-f0-9]{64}$/.test(digest)) throw Error('Invalid browser asset history digest.');
  return pool + '/history-' + digest + '.json';
}
export function readAssetHistory(digest, bytes) {
  if (hash(bytes) !== digest) throw Error('Browser asset history failed verification.');
  const entries = JSON.parse(bytes);
  if (!Array.isArray(entries) || entries.some(row => !Array.isArray(row) || row.length !== 2
    || !fingerprint.test(row[0]) || !/^[a-f0-9]{64}$/.test(row[1]))) throw Error('Invalid browser asset history.');
  return new Map(entries);
}
export function writeAssetHistory(site, previous) {
  const history = new Map(previous);
  const root = path.join(site, pool);
  function visit(dir, prefix) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const name = prefix + item.name, file = path.join(dir, item.name);
      if (item.isDirectory()) { visit(file, name + '/'); continue; }
      const digest = hash(fs.readFileSync(file));
      if (history.has(name) && history.get(name) !== digest) throw Error('Retired browser asset fingerprint collision: ' + name);
      history.set(name, digest);
    }
  }
  if (fs.existsSync(path.join(root, 'assets'))) visit(path.join(root, 'assets'), 'assets/');
  const bytes = Buffer.from(JSON.stringify([...history].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)));
  const digest = hash(bytes);
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(site, historyPath(digest)), bytes);
  return digest;
}
