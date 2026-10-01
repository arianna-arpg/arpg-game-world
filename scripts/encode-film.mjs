#!/usr/bin/env node
// THE FILM ENCODER: any master video → the site cinema's rendition ladder.
// Writes site/media/<id>/, records the files in site/media/manifest.json
// (for scripts/publish-site-media.mjs) and prints the `sources` block for the
// registry in site/assets/cinema.js. Needs ffmpeg (with libsvtav1, libx265,
// libx264) on PATH; zero npm dependencies.
//
//   node scripts/encode-film.mjs --in master.mp4 --id expansion-release
//     [--audio mix.wav]        a separate, uncompressed mix (else the master's own audio)
//     [--heights 1440,1080,720] the AV1 ladder (never above the master's own height)
//     [--grain 10]             AV1 film-grain synthesis; 0 for clean footage
//                              (game captures, flat-shaded or anime-styled cuts)
//     [--tune film]            x264/x265 tuning: film | animation
//     [--no-hevc] [--no-h264]  skip a fallback family
//     [--jobs 3]               encodes run in parallel
//
// Contract: docs/design/site-cinema.md
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const flag = (k) => argv.includes('--' + k);
const master = opt('in'), id = opt('id');
if (!master || !id || !/^[a-z0-9][a-z0-9-]*$/.test(id)) {
  console.error('usage: node scripts/encode-film.mjs --in <master> --id <film-id> [--audio <wav>] [--heights 1440,1080,720] [--grain 10] [--tune film|animation] [--no-hevc] [--no-h264] [--jobs 3]');
  process.exit(1);
}
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'site', 'media', id);
fs.mkdirSync(OUT, { recursive: true });

const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', master]).toString());
const vs = probe.streams.find((s) => s.codec_type === 'video');
const hasAudio = !!opt('audio') || probe.streams.some((s) => s.codec_type === 'audio');
const srcH = vs.height, dur = Number(probe.format.duration);
const grain = Number(opt('grain', '10')), tune = opt('tune', 'film'), jobs = Number(opt('jobs', '3'));
const heights = opt('heights', '1440,1080,720').split(',').map(Number).filter((h) => h <= srcH);
if (!heights.length) heights.push(srcH);

/* AV1 levels by picture size at 30 fps; the codecs string only has to name
   something a browser can answer canPlayType for */
const av1Level = (h) => (h <= 720 ? '05' : h <= 1080 ? '08' : '12');
const TAG = ['-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv'];
const scale = (h, fmt, extra) => `scale=-2:${h}:flags=lanczos:out_color_matrix=bt709:out_range=tv${extra ? ',' + extra : ''},format=${fmt}`;
const inputs = ['-i', master].concat(opt('audio') ? ['-i', opt('audio')] : []);
const audio = hasAudio
  ? ['-map', opt('audio') ? '1:a:0' : '0:a:0', '-af', `atrim=0:${dur},afade=t=out:st=${Math.max(0, dur - 0.4)}:d=0.4`, '-c:a', 'aac', '-b:a', '192k', '-ac', '2', '-ar', '48000']
  : ['-an'];

const plan = [];
heights.forEach((h) => plan.push({
  family: 'av1', height: h, file: `${id}-${h}.av1.mp4`, type: `video/mp4; codecs="av01.0.${av1Level(h)}M.10"`,
  args: ['-map', '0:v:0', '-vf', scale(h, 'yuv420p10le'), '-c:v', 'libsvtav1', '-preset', '4', '-crf', String(h <= 720 ? 35 : 34), '-g', '240',
    '-svtav1-params', `tune=0:film-grain=${h <= 720 ? Math.round(grain * 0.8) : grain}${grain > 0 ? ':film-grain-denoise=1' : ''}`],
}));
if (!flag('no-hevc')) {
  const h = Math.min(1080, srcH);
  plan.push({
    family: 'hevc', height: h, file: `${id}-${h}.hevc.mp4`, type: 'video/mp4; codecs="hvc1.2.4.L120.B0"',
    /* no grain tune: it keeps the grain at several times the bitrate; the
       psychovisual dials hold texture at a fraction of the cost */
    args: ['-map', '0:v:0', '-vf', scale(h, 'yuv420p10le'), '-c:v', 'libx265', '-preset', 'slow', '-crf', '25', '-tag:v', 'hvc1']
      .concat(tune === 'animation' ? ['-tune', 'animation'] : [])
      .concat(['-x265-params', 'log-level=error:aq-mode=3:psy-rd=2:psy-rdoq=1:keyint=240']),
  });
}
if (!flag('no-h264')) {
  const h = Math.min(720, srcH);
  plan.push({
    family: 'h264', height: h, file: `${id}-${h}.h264.mp4`, type: 'video/mp4; codecs="avc1.64001F"',
    args: ['-map', '0:v:0', '-vf', scale(h, 'yuv420p', grain > 0 ? 'hqdn3d=1.2:1.2:5:5' : ''), '-c:v', 'libx264', '-preset', 'veryslow',
      '-tune', tune === 'animation' ? 'animation' : 'film', '-crf', '23', '-profile:v', 'high', '-level', '3.1', '-g', '240'],
  });
}

function encode(p) {
  return new Promise((resolve, reject) => {
    const dest = path.join(OUT, p.file);
    const args = ['-v', 'error', '-y', ...inputs, '-t', String(dur), ...p.args, ...TAG, ...audio, '-movflags', '+faststart', dest];
    const t0 = Date.now();
    const ff = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    ff.stderr.on('data', (d) => { err += d; });
    ff.on('close', (code) => {
      if (code !== 0) return reject(new Error(p.file + ': ' + err.slice(-800)));
      const mb = fs.statSync(dest).size / 1048576;
      console.log(`  ${p.file.padEnd(34)} ${mb.toFixed(1).padStart(5)} MB  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      resolve();
    });
  });
}

console.log(`encoding ${path.basename(master)} (${vs.width}x${srcH}, ${dur.toFixed(2)}s) → site/media/${id}/`);
const queue = plan.slice();
await Promise.all(Array.from({ length: Math.max(1, jobs) }, async () => { while (queue.length) await encode(queue.shift()); }));

/* the manifest learns the new files (size + SHA-256): the fetch verifies
   against it, the publish uploads from it */
const MANIFEST = path.join(ROOT, 'site', 'media', 'manifest.json');
const man = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
for (const p of plan) {
  const file = path.join(OUT, p.file);
  const sha256 = (await import('node:crypto')).createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  man.files[`${id}/${p.file}`] = { bytes: fs.statSync(file).size, sha256 };
}
fs.writeFileSync(MANIFEST, JSON.stringify(man, null, 2) + '\n');
console.log(`\nrecorded ${plan.length} files in site/media/manifest.json; publish them with:\n  node scripts/publish-site-media.mjs --only ${id}`);

/* the registry block, best codec first, then height */
const order = { av1: 0, hevc: 1, h264: 2 };
const rows = plan.slice().sort((a, b) => order[a.family] - order[b.family] || b.height - a.height)
  .map((p) => `  { family: '${p.family}', height: ${p.height}, src: 'media/${id}/${p.file}', type: '${p.type}' },`);
console.log(`\npaste into the film's sources in site/assets/cinema.js:\n\nsources: [\n${rows.join('\n')}\n],\nduration: ${Math.round(dur * 100) / 100},`);
