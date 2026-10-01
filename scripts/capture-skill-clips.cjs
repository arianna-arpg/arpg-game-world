// THE SKILL-CLIP RECORDER: films each skill through THE SKILL-SHOWCASE ENGINE
// (showcase.html, src/showcase/) — the same stages, hands and dials the game's
// live showcases play — and encodes a looping clip per skill for the
// website's Database drawer and theater.
//
//   npm run build   (or pass --root to any built game directory)
//   npx electron scripts/capture-skill-clips.cjs -- --skills glass_lance,frost_nova
//     --skills a,b        these skills (catalog ids)
//     --all               every player skill (monster-only kits excluded)
//     --delivery x,y      filter by delivery type (projectile, nova, melee...)
//     --from <id>         resume a sweep at this skill (catalog order)
//     --limit N           stop after N skills
//     --skip-existing     keep clips already listed in the index
//     --root dist         the built game to boot
//     --out site/media/clips
//     --fps 30 --level 10
//     --sheets <dir>      also write a contact sheet per clip (QA)
//     --report <file>     where the review report goes (balance/reports/skill-clips.json)
//     --list              print the catalog by delivery and cast mode, then exit
//     --catalog <file>    write the catalog (with each skill's staged span) as JSON, then exit
//     --show              show the capture window on screen
//
// The stage itself (framing, dummies, setups, the hand, the ground) is game
// data: src/data/skillShowcase.ts. Output: <out>/<id>.av1.mp4, <id>.h264.mp4,
// <id>.webp poster and <out>/index.json (the list the Database reads); the
// folder is gitignored, and `node scripts/publish-site-media.mjs --pack
// clips` ships it as one archive on the `site-media` release. Each run also
// writes balance/reports/skill-clips.json (casts, damage, activity) for
// review. The engine never saves; the window also uses a temp saves folder
// and a throwaway partition.
//
// Contracts: docs/engine/skill-showcases.md, docs/design/site-cinema.md
const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { startGameServer } = require('../launcher/server.cjs');

const REPO = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const flag = (k) => argv.includes('--' + k);

/** The recorder's own dials (the stage's are SHOWCASE_CFG, read from the engine). */
const CFG = {
  root: path.resolve(REPO, opt('root', 'dist')),
  out: path.resolve(REPO, opt('out', path.join('site', 'media', 'clips'))),
  report: path.resolve(REPO, opt('report', path.join('balance', 'reports', 'skill-clips.json'))),
  sheets: opt('sheets') ? path.resolve(REPO, opt('sheets')) : null,
  fps: Number(opt('fps', '30')),
  level: opt('level') ? Number(opt('level')) : undefined,
  /** The render: a 1080p canvas, encoded down to 720p (supersampled edges). */
  render: { w: 1920, h: 1080 },
  encode: { h: 720, posterW: 640 },
};

// ---------------------------------------------------------------------------
// Encoding: one ffmpeg per clip reads raw RGBA on stdin and writes both files.

function encoderFor(id, w, h, seconds, fade) {
  const TAG = ['-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv'];
  const H = CFG.encode.h;
  const fx = `fade=t=in:st=0:d=${fade.in},fade=t=out:st=${Math.max(0, seconds - fade.out)}:d=${fade.out}`;
  const scale = (fmt) => `scale=-2:${H}:flags=lanczos:out_color_matrix=bt709:out_range=tv,format=${fmt}`;
  const av1 = path.join(CFG.out, `${id}.av1.mp4`), h264 = path.join(CFG.out, `${id}.h264.mp4`);
  const args = ['-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${w}x${h}`, '-framerate', String(CFG.fps), '-i', '-',
    '-filter_complex', `[0:v]${fx},split=2[a][b];[a]${scale('yuv420p10le')}[va];[b]${scale('yuv420p')}[vb]`,
    '-map', '[va]', '-c:v', 'libsvtav1', '-preset', '6', '-crf', '38', '-g', String(CFG.fps * 4), '-svtav1-params', 'tune=0:film-grain=0', ...TAG, '-movflags', '+faststart', '-an', av1,
    '-map', '[vb]', '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', '27', '-profile:v', 'high', '-level', '3.1', '-g', String(CFG.fps * 4), ...TAG, '-movflags', '+faststart', '-an', h264];
  const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = '';
  ff.stderr.on('data', (b) => { err += b; });
  const done = new Promise((resolve, reject) => {
    ff.on('error', reject);
    ff.on('close', (code) => (code === 0 ? resolve({ av1, h264 }) : reject(new Error(`ffmpeg ${code}: ${err.slice(-400)}`))));
  });
  return { ff, done, av1, h264 };
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    ff.stderr.on('data', (b) => { err += b; });
    ff.on('error', reject);
    ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}: ${err.slice(-300)}`))));
  });
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.part';
  fs.writeFileSync(tmp, JSON.stringify(value, null, 1) + '\n');
  fs.renameSync(tmp, file);
}

// ---------------------------------------------------------------------------

async function main() {
  if (!fs.existsSync(path.join(CFG.root, 'showcase.html'))) throw new Error(`no built showcase engine at ${CFG.root} (run npm run build, or pass --root)`);
  fs.mkdirSync(CFG.out, { recursive: true });
  if (CFG.sheets) fs.mkdirSync(CFG.sheets, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hw-clips-'));
  app.setPath('userData', path.join(tmp, 'user'));
  const preload = path.join(tmp, 'clip-preload.cjs');
  fs.writeFileSync(preload, "const { contextBridge, ipcRenderer } = require('electron');\n"
    + "contextBridge.exposeInMainWorld('clipBridge', { frame: (px) => ipcRenderer.invoke('clip-frame', px) });\n");
  const server = await startGameServer({ root: CFG.root, savesDir: path.join(tmp, 'saves') });

  const win = new BrowserWindow({
    show: true, x: flag('show') ? 40 : -4200, y: 40, width: CFG.render.w, height: CFG.render.h, useContentSize: true,
    skipTaskbar: !flag('show'), focusable: flag('show'), frame: flag('show'),
    webPreferences: { partition: 'clip-capture-' + process.pid, backgroundThrottling: false, preload },
  });
  const pageErrors = [];
  win.webContents.on('console-message', (e) => { if (e.level === 'error') pageErrors.push(String(e.message).slice(0, 240)); });
  const js = (code) => win.webContents.executeJavaScript(code);

  // The engine, once: every play stages a fresh world, so no reload between skills.
  await win.loadURL(new URL('showcase.html', server.url).href);
  await js(`(async () => { for (let i = 0; i < 200 && !window.__hwShowcase; i++) await new Promise((r) => setTimeout(r, 50)); await window.__hwShowcase.ready; return true; })()`);
  const engineCfg = await js('window.__hwShowcase.config');
  let rows = await js('window.__hwShowcase.catalog()');
  if (opt('catalog')) {
    writeJson(path.resolve(REPO, opt('catalog')), { skills: rows });
    console.log(`catalog: ${rows.length} skills → ${opt('catalog')}`);
    server.server.close();
    return 0;
  }
  if (flag('list')) {
    const by = {};
    for (const r of rows) (by[r.delivery + '/' + r.castMode] ||= []).push(r.id);
    for (const k of Object.keys(by).sort()) console.log(`${k} (${by[k].length}): ${by[k].join(', ')}`);
    server.server.close();
    return 0;
  }
  const want = opt('skills');
  if (want) { const ids = want.split(','); rows = ids.map((id) => rows.find((r) => r.id === id) || { id, missing: true }); }
  else if (!flag('all')) throw new Error('name --skills a,b or --all');
  const deliveries = opt('delivery') ? opt('delivery').split(',') : null;
  if (deliveries) rows = rows.filter((r) => deliveries.includes(r.delivery));
  const from = opt('from');
  if (from) { const i = rows.findIndex((r) => r.id === from); if (i >= 0) rows = rows.slice(i); }
  rows = rows.slice(0, Number(opt('limit', String(rows.length))));

  const indexFile = path.join(CFG.out, 'index.json');
  const index = readJson(indexFile) || { generated: '', aspect: 16 / 9, clips: {} };
  const report = readJson(CFG.report) || { clips: {} };
  const skipExisting = flag('skip-existing');

  // Frames arrive here from the page.
  let sink = null;
  ipcMain.handle('clip-frame', (_e, px) => sink ? sink(px) : null);
  const dt = 1000 / CFG.fps;
  const grab = `(async () => { const p = window.__hwShowcase; if (!p.frame(${dt})) return false; const c = p.canvas; await window.clipBridge.frame(c.getContext('2d').getImageData(0, 0, c.width, c.height).data); return true; })()`;

  const t0 = Date.now();
  const summary = [];
  for (const row of rows) {
    if (row.missing) { console.log(`✗ ${row.id}: not in the catalog`); summary.push({ id: row.id, ok: false }); continue; }
    if (skipExisting && index.clips[row.id]) { console.log(`· ${row.id}: kept`); continue; }
    if (row.skip) {
      console.log(`· ${row.id}: skipped (${row.skip})`);
      report.clips[row.id] = { skipped: row.skip };
      if (index.clips[row.id]) { delete index.clips[row.id]; writeJson(indexFile, index); }
      continue;
    }
    const started = Date.now();
    pageErrors.length = 0;
    const files = [];
    try {
      const spec = { skillId: row.id, level: CFG.level };
      const info = await js(`window.__hwShowcase.play(${JSON.stringify(spec)}, { pinClock: true, once: true })`);
      if (!info) throw new Error(`no stage (${await js('window.__hwShowcase.why')})`);
      const [W, H] = await js('[window.__hwShowcase.canvas.width, window.__hwShowcase.canvas.height]');
      const seconds = info.cycle;
      const enc = encoderFor(row.id, W, H, seconds, engineCfg.fade);
      files.push(enc.av1, enc.h264);
      const frames = Math.round(seconds * CFG.fps);
      const energy = [];
      const sheetAt = new Set([0.12, 0.3, 0.45, 0.6, 0.75, 0.9].map((f) => Math.round(f * frames)));
      const sheetFrames = [];
      let base = null;
      sink = (px) => {
        const buf = Buffer.from(px.buffer, px.byteOffset, px.byteLength);
        // Activity: how far this frame strays from the calm first frame (a
        // sparse sample), so the poster lands on the busiest beat.
        let e = 0;
        if (!base) base = Buffer.from(buf);
        else for (let i = 0; i < buf.length; i += 4 * 97) e += Math.abs(buf[i] - base[i]) + Math.abs(buf[i + 1] - base[i + 1]) + Math.abs(buf[i + 2] - base[i + 2]);
        energy.push(e);
        if (CFG.sheets && sheetAt.has(energy.length - 1)) sheetFrames.push(Buffer.from(buf));
        return new Promise((resolve) => { if (enc.ff.stdin.write(buf)) resolve(true); else enc.ff.stdin.once('drain', () => resolve(true)); });
      };
      for (let f = 0; f < frames; f++) if (!(await js(grab))) throw new Error(`stage stopped (${await js('window.__hwShowcase.why')})`);
      sink = null;
      enc.ff.stdin.end();
      const res = await js('window.__hwShowcase.report()');
      await enc.done;
      // A clip of nothing happening is worse than no clip.
      if (!res.casts) throw new Error(`no cast (${res.why})`);
      // The poster: the busiest beat of the act.
      const lo = Math.round(engineCfg.lead * CFG.fps), hi = Math.round((seconds - engineCfg.tail * 0.5) * CFG.fps);
      let best = lo;
      for (let i = lo; i < Math.min(hi, energy.length); i++) if (energy[i] > energy[best]) best = i;
      const poster = path.join(CFG.out, `${row.id}.webp`);
      files.push(poster);
      await runFfmpeg(['-ss', (best / CFG.fps).toFixed(3), '-i', enc.h264, '-frames:v', '1', '-vf', `scale=${CFG.encode.posterW}:-2:flags=lanczos`, '-c:v', 'libwebp', '-quality', '82', poster]);
      if (CFG.sheets && sheetFrames.length) {
        const raw = path.join(tmp, 'sheet.rgba');
        fs.writeFileSync(raw, Buffer.concat(sheetFrames));
        await runFfmpeg(['-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-i', raw, '-vf', 'scale=640:-2,tile=3x2', '-frames:v', '1', path.join(CFG.sheets, `${row.id}.png`)]);
      }
      const rel = (f) => 'media/clips/' + path.basename(f);
      const H2 = CFG.encode.h;
      index.clips[row.id] = {
        name: row.name, duration: seconds, poster: rel(poster),
        sources: [
          { family: 'av1', height: H2, src: rel(enc.av1), type: 'video/mp4; codecs="av01.0.05M.10"' },
          { family: 'h264', height: H2, src: rel(enc.h264), type: 'video/mp4; codecs="avc1.64001F"' },
        ],
      };
      index.generated = new Date().toISOString();
      writeJson(indexFile, index);
      const peak = Math.max(0, ...energy) / (W * H / 97);
      const kb = (f) => Math.round(fs.statSync(f).size / 1024);
      const warn = [];
      if (pageErrors.length) warn.push('console: ' + pageErrors.slice(0, 2).join(' | '));
      report.clips[row.id] = {
        delivery: info.delivery, castMode: info.castMode, cls: info.classId, span: Math.round(info.span), casts: res.casts, dealt: res.dealt,
        statuses: res.statuses, actors: res.actors, peak: Math.round(peak * 100) / 100, kb: kb(enc.av1) + kb(enc.h264) + kb(poster), warn,
      };
      console.log(`✓ ${row.id} [${info.delivery}/${info.castMode}, ${info.classId}] casts ${res.casts} dealt ${res.dealt} peak ${peak.toFixed(2)} · av1 ${kb(enc.av1)}K h264 ${kb(enc.h264)}K · ${((Date.now() - started) / 1000).toFixed(1)}s${warn.length ? '  ⚠ ' + warn.join('; ') : ''}`);
      summary.push({ id: row.id, ok: true });
    } catch (e) {
      sink = null;
      for (const f of files) fs.rmSync(f, { force: true });
      if (index.clips[row.id]) { delete index.clips[row.id]; writeJson(indexFile, index); }
      const msg = String(e && e.message || e).split('\n')[0];
      report.clips[row.id] = { error: msg };
      console.log(`✗ ${row.id}: ${msg}`);
      summary.push({ id: row.id, ok: false });
    }
    report.generated = new Date().toISOString();
    writeJson(CFG.report, report);
  }
  const ok = summary.filter((s) => s.ok).length;
  console.log(`\n${ok}/${summary.length} clips in ${((Date.now() - t0) / 1000).toFixed(0)}s → ${path.relative(REPO, CFG.out)}`);
  server.server.close();
  return summary.every((s) => s.ok) ? 0 : 1;
}

app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
app.whenReady().then(main).then((code) => app.exit(code), (e) => { console.error(e && e.stack || e); app.exit(1); });
