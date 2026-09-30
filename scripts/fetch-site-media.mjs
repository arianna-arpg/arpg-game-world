#!/usr/bin/env node
// THE FILM FETCH: pulls the website's films from their GitHub Release into
// site/media/, verified by size and SHA-256 against site/media/manifest.json.
// pages.yml runs it on every deploy (the films are served from the site's own
// origin, which the cinema's shatter needs to sample a frame); run it locally
// before previewing the site. Files already present and intact are skipped.
// Zero npm dependencies (Node 20+ fetch).
//
//   node scripts/fetch-site-media.mjs            fetch whatever is missing
//   node scripts/fetch-site-media.mjs --check    verify only; exit 1 if anything is missing
//   node scripts/fetch-site-media.mjs --only announcement
//
// Contract: docs/design/site-cinema.md
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : null; };
const CHECK = argv.includes('--check'), ONLY = opt('only');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MEDIA = path.join(ROOT, 'site', 'media');
const manifest = JSON.parse(fs.readFileSync(path.join(MEDIA, 'manifest.json'), 'utf8'));
const { repo, tag } = manifest.release;

function hashFile(file) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash('sha256');
    fs.createReadStream(file).on('data', (d) => h.update(d)).on('end', () => resolve(h.digest('hex'))).on('error', reject);
  });
}
async function intact(file, want) {
  if (!fs.existsSync(file)) return false;
  if (fs.statSync(file).size !== want.bytes) return false;
  return (await hashFile(file)) === want.sha256;
}
async function download(url, dest, want) {
  const part = dest + '.part';
  const r = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'hollow-wake-site-media' } });
  if (!r.ok || !r.body) throw new Error(`HTTP ${r.status} ${r.statusText}`);
  const h = crypto.createHash('sha256');
  const tap = new Transform({ transform(chunk, _e, cb) { h.update(chunk); cb(null, chunk); } });
  await pipeline(Readable.fromWeb(r.body), tap, fs.createWriteStream(part));
  const size = fs.statSync(part).size, sum = h.digest('hex');
  if (size !== want.bytes || sum !== want.sha256) {
    fs.rmSync(part, { force: true });
    throw new Error(`verification failed (${size} bytes, sha256 ${sum.slice(0, 12)}…; the manifest wants ${want.bytes} bytes, ${want.sha256.slice(0, 12)}…)`);
  }
  fs.renameSync(part, dest);
}

let missing = 0, fetched = 0, present = 0;
for (const [rel, want] of Object.entries(manifest.files)) {
  if (ONLY && !rel.includes(ONLY)) continue;
  const dest = path.join(MEDIA, ...rel.split('/'));
  if (await intact(dest, want)) { present++; continue; }
  if (CHECK) { console.log(`missing  ${rel}`); missing++; continue; }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const asset = want.asset || path.basename(rel);
  const url = `https://github.com/${repo}/releases/download/${encodeURIComponent(tag)}/${encodeURIComponent(asset)}`;
  let lastErr = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const t0 = Date.now();
      await download(url, dest, want);
      console.log(`fetched  ${rel}  ${(want.bytes / 1048576).toFixed(1)} MB  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      fetched++; lastErr = null;
      break;
    } catch (e) {
      lastErr = e;
      if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 1500));
    }
  }
  if (lastErr) { console.error(`FAILED   ${rel} ← ${url}\n         ${lastErr.message}`); missing++; }
}
/* ARCHIVES: a set regenerated whole (the skill clips) travels as ONE release
   asset and unpacks into its folder; the folder is stamped with the archive's
   SHA-256, so an unchanged set is never fetched twice. tar runs from inside
   the folder on a relative path (GNU tar reads "D:" as a remote host). */
for (const [name, want] of Object.entries(manifest.archives || {})) {
  if (ONLY && !name.includes(ONLY)) continue;
  const into = path.join(MEDIA, ...want.into.split('/'));
  const stampFile = path.join(into, '.archive');
  const stamp = fs.existsSync(stampFile) ? fs.readFileSync(stampFile, 'utf8').trim() : '';
  if (stamp === want.sha256) { present++; continue; }
  if (CHECK) { console.log(`missing  archive ${name} → ${want.into}/`); missing++; continue; }
  const url = `https://github.com/${repo}/releases/download/${encodeURIComponent(tag)}/${encodeURIComponent(want.asset)}`;
  const tmp = path.join(MEDIA, '.pack');
  fs.mkdirSync(tmp, { recursive: true });
  const tar = path.join(tmp, want.asset);
  fs.rmSync(tar, { force: true });
  let lastErr = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try { await download(url, tar, want); lastErr = null; break; }
    catch (e) { lastErr = e; if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 1500)); }
  }
  if (lastErr) { console.error(`FAILED   archive ${name} ← ${url}\n         ${lastErr.message}`); missing++; continue; }
  fs.rmSync(into, { recursive: true, force: true });
  fs.mkdirSync(into, { recursive: true });
  execFileSync('tar', ['-xf', path.relative(into, tar).split(path.sep).join('/')], { cwd: into, stdio: 'inherit' });
  fs.writeFileSync(stampFile, want.sha256 + '\n');
  fs.rmSync(tar, { force: true });
  console.log(`unpacked archive ${name} → ${want.into}/  ${(want.bytes / 1048576).toFixed(1)} MB`);
  fetched++;
}

console.log(`site media: ${present} present, ${fetched} fetched, ${missing} ${CHECK ? 'missing' : 'failed'} (release ${repo}@${tag})`);
process.exit(missing ? 1 : 0);
