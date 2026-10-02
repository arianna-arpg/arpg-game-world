// THE GAMEPLAY RECORDER: films staged shots of REAL play through THE DIRECTOR
// (src/director/) and THE AGENT (src/agent/) in a built game — a fresh run
// per shot, the real zone mint, the real build injector, monsters through the
// ordinary pipeline, the hero driven through the input artery a player uses —
// stepping a held clock frame by frame, so every take is deterministic.
//
//   npm run build   (or pass --root to any built game directory)
//   npx electron scripts/capture-gameplay.cjs -- --shots shots.json
//     --shots f.json      a ShotSpec[] (or { shots: [...] }) — src/director/shot.ts
//     --only a,b          only these shot ids
//     --root dist         the built game to boot
//     --out balance/reports/gameplay   where takes land (one folder per shot)
//     --w 3840 --h 2160   render size (the capture viewport; any size, any window)
//     --format jpg|png    frame files (default jpg, q 2)
//     --preview 1280      also write a small preview.mp4 at this width (0 = none)
//     --sheet             a contact sheet per shot (6 frames)
//     --show              show the capture window on screen
//     --probe '<js>'      after staging each shot, evaluate this expression in
//                         the page and print the result (selectors, state)
//     --dpr 1.3333        device scale for page shots (crisp DOM text: a
//                         1920x1080 page photographs at 2560x1440)
//   Page shots (ShotSpec.capture 'page') photograph the composited page —
//   panels, trees, the map — at ShotSpec.window (CSS px, default 1920x1080).
//
// Output per shot: <out>/<id>/frames/00001.jpg…, meta.json (stage info, per-
// frame camera/hero/foe reads, warnings), preview.mp4, sheet.png. The window
// uses a temp saves folder and a throwaway partition; nothing touches the
// player's saves. Contract: docs/engine/director.md.
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

const CFG = {
  root: path.resolve(REPO, opt('root', 'dist')),
  out: path.resolve(REPO, opt('out', path.join('balance', 'reports', 'gameplay'))),
  shots: opt('shots') ? path.resolve(process.cwd(), opt('shots')) : null,
  only: opt('only') ? opt('only').split(',') : null,
  w: Number(opt('w', '1920')), h: Number(opt('h', '1080')),
  format: opt('format', 'jpg'),
  preview: Number(opt('preview', '1280')),
  sheet: flag('sheet'),
  /** The window: any size works (the capture viewport renders past it). */
  window: { w: 1600, h: 900 },
};

function encoderFor(dir, w, h, fps, pixFmt = 'rgba') {
  fs.mkdirSync(path.join(dir, 'frames'), { recursive: true });
  const img = CFG.format === 'png'
    ? ['-c:v', 'png', path.join(dir, 'frames', '%05d.png')]
    : ['-q:v', '2', path.join(dir, 'frames', '%05d.jpg')];
  const args = ['-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'rawvideo', '-pix_fmt', pixFmt, '-s', `${w}x${h}`, '-framerate', String(fps), '-i', '-'];
  if (CFG.preview > 0) {
    args.push('-filter_complex', `[0:v]split=2[a][b];[b]scale=${CFG.preview}:-2:flags=lanczos,format=yuv420p[p]`,
      '-map', '[a]', ...img,
      '-map', '[p]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-movflags', '+faststart', path.join(dir, 'preview.mp4'));
  } else args.push(...img);
  const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = '';
  ff.stderr.on('data', (b) => { err += b; });
  const done = new Promise((resolve, reject) => {
    ff.on('error', reject);
    ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}: ${err.slice(-400)}`))));
  });
  return { ff, done };
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

async function main() {
  if (!fs.existsSync(path.join(CFG.root, 'index.html'))) throw new Error(`no built game at ${CFG.root} (run npm run build, or pass --root)`);
  if (!CFG.shots) throw new Error('name a shot list: --shots <file.json>');
  const raw = JSON.parse(fs.readFileSync(CFG.shots, 'utf8'));
  let shots = Array.isArray(raw) ? raw : raw.shots;
  if (CFG.only) shots = shots.filter((s) => CFG.only.includes(s.id));
  if (!shots.length) throw new Error('no shots to film');
  fs.mkdirSync(CFG.out, { recursive: true });

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hw-gameplay-'));
  app.setPath('userData', path.join(tmp, 'user'));
  const preload = path.join(tmp, 'preload.cjs');
  fs.writeFileSync(preload, "const { contextBridge, ipcRenderer } = require('electron');\n"
    + "contextBridge.exposeInMainWorld('rec', { frame: (px) => ipcRenderer.invoke('rec-frame', px) });\n");
  const server = await startGameServer({ root: CFG.root, savesDir: path.join(tmp, 'saves') });
  const win = new BrowserWindow({
    show: true, x: flag('show') ? 40 : -4200, y: 40, width: CFG.window.w, height: CFG.window.h, useContentSize: true,
    skipTaskbar: !flag('show'), focusable: flag('show'), frame: flag('show'),
    webPreferences: { partition: 'gameplay-capture-' + process.pid, backgroundThrottling: false, preload },
  });
  const pageErrors = [];
  win.webContents.on('console-message', (e) => { if (e.level === 'error') pageErrors.push(String(e.message).slice(0, 240)); });
  const js = (code) => win.webContents.executeJavaScript(code);
  await win.loadURL(server.url);
  await js(`(async () => { for (let i = 0; i < 400 && !window.__game; i++) await new Promise((r) => setTimeout(r, 50)); await window.__game.hydrated(); return true; })()`);
  // Pin the render scale (the governor would drop it under a slow 4K take).
  await js(`(() => { const s = window.__game.settings(); s.renderScale = 1; return true; })()`);
  await js(`window.__game.director().setViewport(${CFG.w}, ${CFG.h})`);

  let sink = null;
  ipcMain.handle('rec-frame', (_e, px) => (sink ? sink(px) : null));
  const grab = `(async () => { const d = window.__game.director(); const f = d.frame(); const c = d.canvas; await window.rec.frame(c.getContext('2d').getImageData(0, 0, c.width, c.height).data); return f; })()`;

  const t0 = Date.now();
  let ok = 0;
  for (const spec of shots) {
    const started = Date.now();
    const dir = path.join(CFG.out, spec.id);
    fs.rmSync(dir, { recursive: true, force: true });
    pageErrors.length = 0;
    try {
      const page = spec.capture === 'page';
      if (page) {
        const pw = (spec.window && spec.window.w) || 1920, ph = (spec.window && spec.window.h) || 1080;
        win.setContentSize(pw, ph);
        await new Promise((r) => setTimeout(r, 300));
      }
      const info = await js(`window.__game.director().stage(${JSON.stringify(spec)})`);
      if (opt('probe')) console.log(spec.id, 'probe:', JSON.stringify(await js(opt('probe'))).slice(0, 6000));
      // ShotSpec.settle: real seconds for the page's own async painters (the
      // atlas chart, rasters) to finish before the first frame is taken.
      if (spec.settle) await new Promise((r) => setTimeout(r, spec.settle * 1000));
      let w = info.canvas.w, h = info.canvas.h;
      let enc = null;
      const paint = `new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 30))))`;
      if (page) {
        await js(paint);
        const probe = (await win.webContents.capturePage()).getSize();
        w = probe.width; h = probe.height;
        enc = encoderFor(dir, w, h, info.fps, 'bgra');
      } else enc = encoderFor(dir, w, h, info.fps);
      const frames = [];
      const sheetAt = new Set([0.1, 0.28, 0.46, 0.64, 0.82, 0.98].map((f) => Math.min(info.frames - 1, Math.round(f * info.frames))));
      const sheetFrames = [];
      let n = 0;
      sink = (px) => {
        const buf = Buffer.from(px.buffer, px.byteOffset, px.byteLength);
        if (CFG.sheet && sheetAt.has(n)) sheetFrames.push(Buffer.from(buf));
        n++;
        return new Promise((resolve) => { if (enc.ff.stdin.write(buf)) resolve(true); else enc.ff.stdin.once('drain', () => resolve(true)); });
      };
      for (let i = 0; i < info.frames; i++) {
        let f;
        if (page) {
          f = await js('window.__game.director().frame()');
          await js(paint);
          const img = await win.webContents.capturePage();
          const sz = img.getSize();
          let bmp = img.toBitmap();
          if (sz.width !== w || sz.height !== h) bmp = img.resize({ width: w, height: h }).toBitmap();
          await sink(bmp);
        } else f = await js(grab);
        const ev = f.events;
        const row = { t: +f.t.toFixed(4), focus: [Math.round(f.focus.x), Math.round(f.focus.y)], zoom: +f.zoom.toFixed(3), foes: f.foes, life: +f.heroLife.toFixed(3), dead: f.dead };
        if (ev.casts.length) row.casts = ev.casts;
        if (ev.hits) { row.hits = ev.hits; row.peak = ev.hitPeak; if (ev.crits) row.crits = ev.crits; }
        if (ev.hurt) row.hurt = ev.hurt;
        if (ev.kills.length) row.kills = ev.kills;
        if (ev.heroDied) row.heroDied = true;
        if (ev.pointer) row.ptr = ev.pointer;
        if (ev.click) row.click = true;
        frames.push(row);
        if (i % 60 === 0) process.stdout.write(`  ${spec.id} ${i}/${info.frames}\r`);
      }
      sink = null;
      enc.ff.stdin.end();
      await enc.done;
      await js('window.__game.director().end()');
      fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ spec, info, frames, pageErrors: [...pageErrors] }, null, 1));
      if (CFG.sheet && sheetFrames.length) {
        const rawFile = path.join(tmp, 'sheet.rgba');
        fs.writeFileSync(rawFile, Buffer.concat(sheetFrames));
        await runFfmpeg(['-f', 'rawvideo', '-pix_fmt', page ? 'bgra' : 'rgba', '-s', `${w}x${h}`, '-i', rawFile, '-vf', 'scale=640:-2,tile=3x2', '-frames:v', '1', path.join(dir, 'sheet.png')]);
      }
      ok++;
      console.log(`✓ ${spec.id} [${info.tileset} · ${info.zone}] ${info.frames}f @${info.fps} ${w}x${h} foes ${info.foes}${info.warnings.length ? ' ⚠ ' + info.warnings.slice(0, 2).join('; ') : ''}${pageErrors.length ? ' console: ' + pageErrors.slice(0, 2).join(' | ') : ''} · ${((Date.now() - started) / 1000).toFixed(1)}s`);
    } catch (e) {
      sink = null;
      try { await js('window.__game.director().end()'); } catch { /* the page is gone */ }
      console.log(`✗ ${spec.id}: ${String(e && e.message || e).split('\n')[0]}`);
    }
  }
  console.log(`\n${ok}/${shots.length} shots in ${((Date.now() - t0) / 1000).toFixed(0)}s → ${path.relative(REPO, CFG.out)}`);
  server.server.close();
  return ok === shots.length ? 0 : 1;
}

app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
if (opt('dpr')) app.commandLine.appendSwitch('force-device-scale-factor', String(opt('dpr')));
app.whenReady().then(main).then((code) => app.exit(code), (e) => { console.error(e && e.stack || e); app.exit(1); });
