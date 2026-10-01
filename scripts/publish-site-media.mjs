#!/usr/bin/env node
// THE FILM PUBLISH: uploads the website's films named in site/media/manifest.json
// to their GitHub Release, where scripts/fetch-site-media.mjs (and so every
// Pages deploy) finds them. Needs the GitHub CLI logged in with push rights.
//
// THE RELEASE IS NOT A GAME BUILD, and three laws keep it that way:
//   • its tag is not vX.Y.Z, so launchers (launcher/updates.cjs parseTag) and
//     the nightly numbering (nightly.yml's vX.Y.Z filter) never see it;
//   • it is a PRERELEASE and never "latest", so /releases/latest keeps naming
//     the game for the stable channel;
//   • it lives in no package and no git history: the executable ships
//     launcher + dist only (electron-builder.yml), and the videos are gitignored.
//
//   node scripts/publish-site-media.mjs            upload what the release lacks
//   node scripts/publish-site-media.mjs --dry      say what would happen
//   node scripts/publish-site-media.mjs --only announcement
//
// Contract: docs/design/site-cinema.md
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : null; };
const DRY = argv.includes('--dry'), ONLY = opt('only'), PACK = opt('pack');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MEDIA = path.join(ROOT, 'site', 'media');
const manifest = JSON.parse(fs.readFileSync(path.join(MEDIA, 'manifest.json'), 'utf8'));
const { repo, tag } = manifest.release;
const gh = (args, opts) => execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...(opts || {}) });

const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

// 0. --pack <name>: a set regenerated whole (the skill clips) travels as ONE
//    archive asset. Tar site/media/<into>/ (sorted, so a set packs the same
//    way twice), name the asset by its content, record it, stamp the folder.
if (PACK) {
  manifest.archives = manifest.archives || {};
  const into = (manifest.archives[PACK] && manifest.archives[PACK].into) || PACK;
  const dir = path.join(MEDIA, ...into.split('/'));
  if (!fs.existsSync(dir)) { console.error(`nothing to pack: site/media/${into}/ does not exist`); process.exit(1); }
  const files = [];
  (function walk(rel) {
    for (const ent of fs.readdirSync(path.join(dir, rel), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const r = rel ? rel + '/' + ent.name : ent.name;
      if (ent.isDirectory()) walk(r); else if (ent.name !== '.archive') files.push(r);
    }
  })('');
  const packDir = path.join(MEDIA, '.pack');
  fs.mkdirSync(packDir, { recursive: true });
  const tmp = path.join(packDir, `${PACK}.building.tar`);
  fs.rmSync(tmp, { force: true });
  /* the names ride a list file (-T): a whole set's names overflow a Windows command line */
  const list = path.join(packDir, `${PACK}.files`);
  fs.writeFileSync(list, files.join('\n') + '\n');
  execFileSync('tar', ['-cf', path.relative(dir, tmp).split(path.sep).join('/'), '-T', path.relative(dir, list).split(path.sep).join('/')], { cwd: dir, stdio: 'inherit' });
  fs.rmSync(list, { force: true });
  const sum = sha(tmp), bytes = fs.statSync(tmp).size;
  const asset = `site-${PACK}-${sum.slice(0, 12)}.tar`;
  fs.renameSync(tmp, path.join(packDir, asset));
  manifest.archives[PACK] = { asset, bytes, sha256: sum, into };
  fs.writeFileSync(path.join(MEDIA, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(path.join(dir, '.archive'), sum + '\n');
  console.log(`packed   ${files.length} files → ${asset}  ${(bytes / 1048576).toFixed(1)} MB (recorded in site/media/manifest.json)`);
}

// 1. every local file must be the one the manifest names (the manifest is the truth)
const plan = [];
for (const [rel, want] of Object.entries(manifest.files)) {
  if (ONLY && !rel.includes(ONLY)) continue;
  const file = path.join(MEDIA, ...rel.split('/'));
  if (!fs.existsSync(file)) { console.error(`absent   ${rel} (encode it first, or fetch it: it may already be published)`); continue; }
  const bytes = fs.statSync(file).size, sum = sha(file);
  if (bytes !== want.bytes || sum !== want.sha256) {
    console.error(`REFUSED  ${rel}: the local file is not the one the manifest names (re-run scripts/encode-film.mjs to record it)`);
    process.exit(1);
  }
  plan.push({ rel, file, asset: want.asset || path.basename(rel), sha256: sum, bytes });
}
for (const [name, want] of Object.entries(manifest.archives || {})) {
  if (ONLY && !name.includes(ONLY) && PACK !== name) continue;
  const file = path.join(MEDIA, '.pack', want.asset);
  if (!fs.existsSync(file)) { console.log(`absent   archive ${name} (${want.asset}): pack it with --pack ${name}, or it is already published`); continue; }
  if (fs.statSync(file).size !== want.bytes || sha(file) !== want.sha256) {
    console.error(`REFUSED  archive ${name}: ${want.asset} is not the one the manifest names`);
    process.exit(1);
  }
  plan.push({ rel: `archive ${name}`, file, asset: want.asset, sha256: want.sha256, bytes: want.bytes });
}

// 2. the release: find it, or found it as a prerelease that is never "latest"
let release = null;
try { release = JSON.parse(gh(['release', 'view', tag, '--repo', repo, '--json', 'tagName,isPrerelease,isDraft,assets'])); } catch (e) { release = null; }
if (!release) {
  const notes = 'The website\'s films (trailers and clips), fetched into the site at every Pages deploy by scripts/fetch-site-media.mjs.\n\n' +
    '**Not a game build.** Launchers only read vX.Y.Z tags, and this prerelease is never marked latest. Download the game from a versioned release instead.';
  console.log(`${DRY ? 'would create' : 'creating'} ${repo}@${tag} (prerelease, not latest)`);
  if (!DRY) gh(['release', 'create', tag, '--repo', repo, '--prerelease', '--latest=false', '--title', 'Website media (not a game build)', '--notes', notes]);
  release = { assets: [] };
} else if (!release.isPrerelease) {
  console.error(`REFUSED  ${repo}@${tag} is not a prerelease; it could be served as "latest" to launchers. Mark it a prerelease first.`);
  process.exit(1);
}

// 3. upload what the release lacks (same name + same digest = already there)
const have = new Map((release.assets || []).map((a) => [a.name, a]));
const todo = plan.filter((p) => {
  const a = have.get(p.asset);
  const digest = a && typeof a.digest === 'string' ? a.digest.replace(/^sha256:/, '') : null;
  if (a && a.size === p.bytes && (!digest || digest === p.sha256)) { console.log(`present  ${p.asset}`); return false; }
  return true;
});
for (const p of todo) {
  console.log(`${DRY ? 'would upload' : 'uploading'} ${p.asset}  ${(p.bytes / 1048576).toFixed(1)} MB`);
  if (!DRY) gh(['release', 'upload', tag, p.file, '--repo', repo, '--clobber'], { stdio: ['ignore', 'pipe', 'inherit'] });
}
console.log(`site media: ${plan.length - todo.length} already published, ${todo.length} ${DRY ? 'to upload' : 'uploaded'} (${repo}@${tag})`);
