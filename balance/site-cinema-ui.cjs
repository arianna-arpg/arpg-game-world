// THE SITE CINEMA WALKTHROUGH (hidden harness; not a probe-gate rig).
// Serves site/ over a loopback server (Range-capable, so films seek), opens
// the homepage in an off-screen Electron window under Chrome's own autoplay
// policy, and walks every door of the cinema: the arrival splash (muted
// fallback, captions, the sound pill), the shatter stepped frame by frame,
// the returning visitor, the week away, the banner click (a trusted input
// event), reduced motion, a film that fails to load, and a skill clip opened
// from the Database drawer (a planted clip index, so no generated clips are
// needed).
// Frames land in balance/reports/site-cinema/ (gitignored).
//
// usage: npx electron balance/site-cinema-ui.cjs [--w 1440 --h 810] [--out dir] [--keep]
// Contract: docs/design/site-cinema.md
const { app, BrowserWindow, session } = require('electron');
const http = require('http'), fs = require('fs'), path = require('path');

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(__dirname, '..', 'site');
const OUT = path.resolve(arg('out', path.join(__dirname, 'reports', 'site-cinema')));
const W = Number(arg('w', '1440')), H = Number(arg('h', '810'));
fs.mkdirSync(OUT, { recursive: true });
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.mp4': 'video/mp4', '.vtt': 'text/vtt', '.webp': 'image/webp', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml' };
const missing = [];
/* THE PLANTED CLIP: the Database reads media/clips/index.json; the walkthrough
   answers it with one clip that reuses the announcement's 720p rendition */
const CLIP_INDEX = JSON.stringify({ generated: 'qa', aspect: 16 / 9, clips: { cleave: { name: 'Cleave', duration: 6, sources: [
  { family: 'h264', height: 720, src: 'media/announcement-v2/announcement-v2-720.h264.mp4', type: 'video/mp4; codecs="avc1.64001F"' }] } } });
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/media/clips/index.json') { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); return res.end(CLIP_INDEX); }
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { missing.push(p); res.writeHead(404); return res.end(); }
  const size = fs.statSync(f).size, type = TYPES[path.extname(f)] || 'application/octet-stream';
  const head = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' };
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
  if (m) {
    const a = m[1] ? Number(m[1]) : 0, b = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    res.writeHead(206, { ...head, 'Content-Range': `bytes ${a}-${b}/${size}`, 'Content-Length': b - a + 1 });
    return fs.createReadStream(f, { start: a, end: b }).pipe(res);
  }
  res.writeHead(200, { ...head, 'Content-Length': size });
  fs.createReadStream(f).pipe(res);
});

const results = [];
function check(name, ok, detail) { results.push({ name, ok: !!ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  ' + detail : '')); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

app.whenReady().then(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const part = 'hwcine-qa-' + Date.now();
  const ses = session.fromPartition(part);
  const win = new BrowserWindow({
    show: true, x: -4200, y: 40, width: W, height: H, useContentSize: true, skipTaskbar: true, focusable: false,
    webPreferences: { partition: part, backgroundThrottling: false, autoplayPolicy: 'document-user-activation-required' },
  });
  win.webContents.setAudioMuted(true);   // the walkthrough never sounds on the host
  const logs = [];
  win.webContents.on('console-message', (e) => { if (e.level === 'warning' || e.level === 'error') logs.push(e.level + ': ' + e.message); });
  /* probes carry NO user gesture: only sendInputEvent clicks may unlock sound */
  const js = (code) => win.webContents.executeJavaScript(code);
  const shot = async (name) => { fs.writeFileSync(path.join(OUT, name + '.png'), (await win.webContents.capturePage()).toPNG()); };
  const waitFor = async (code, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { let ok = false; try { ok = !!(await js('!!(' + code + ')')); } catch (e) { ok = false; } if (ok) return true; await sleep(100); } return false; };
  const load = async (q) => { await win.loadURL(base + (q || '')); await js('new Promise(r => document.readyState === "complete" ? r() : addEventListener("load", r))'); };
  const clickAt = async (x, y) => {
    win.webContents.sendInputEvent({ type: 'mouseMove', x, y });
    win.webContents.sendInputEvent({ type: 'mouseDown', x, y, button: 'left', clickCount: 1 });
    win.webContents.sendInputEvent({ type: 'mouseUp', x, y, button: 'left', clickCount: 1 });
  };
  const theater = `((window.HWCinemaTheater && HWCinemaTheater.current) || null)`;

  // ── 1. the first arrival opens with the splash ─────────────────────────────
  await load();
  check('first arrival is due the splash', await js('!!HWCinema.due && HWCinema.due.id === HWCinema.feature()'));
  check('the splash takes the stage', await waitFor(`(${theater}) && ${theater}.state === 'playing'`));
  const s1 = await js(`(() => { const t = ${theater}, v = t.video; return { muted: v.muted, src: v.currentSrc.split('/').pop(), ask: t.audio.classList.contains('ask'), lock: document.documentElement.classList.contains('hwcine-lock'), arming: document.documentElement.classList.contains('hwcine-arming'), rec: HWCinema.record() }; })()`);
  check('autoplay without a gesture falls back to muted', s1.muted, s1.src);
  check('the sound pill asks', s1.ask);
  check('the page is locked and the arrival darkness handed over', s1.lock && !s1.arming);
  check('the showing is recorded', s1.rec.seen[await js('HWCinema.feature()')] >= 1 && s1.rec.last > 0);
  await sleep(2600);
  await shot('01-splash-opening');
  /* a bright moment, captions riding the lower bar while muted */
  await js(`(() => { const v = (${theater}).video; v.currentTime = 22.9; })()`);
  await waitFor(`(${theater}).cap.classList.contains('on')`, 6000);
  check('narration captions show while muted', await js(`(${theater}).cap.classList.contains('on') && (${theater}).capText.textContent.length > 3`), await js(`(${theater}).capText.textContent`));
  await sleep(400);
  await shot('02-splash-captions');
  await js(`(() => { const v = (${theater}).video; v.currentTime = 44.6; })()`);
  await sleep(1200);
  await shot('03-splash-montage');

  /* THE MIND'S EYE: the picture's edge melts into the dark, and the dark moves.
     Sampled off real captures: the picture's own left edge reads black while
     its heart reads the picture; held on one frame, the rim band changes. */
  const grab = async () => { const img = await win.webContents.capturePage(); const sz = img.getSize(); return { b: img.toBitmap(), w: sz.width, h: sz.height }; };
  const lumaIn = (g, r) => {
    const sx = g.w / W, sy = g.h / H; let s = 0, n = 0;
    for (let y = Math.round(r.y * sy); y < Math.round((r.y + r.h) * sy); y++) {
      for (let x = Math.round(r.x * sx); x < Math.round((r.x + r.w) * sx); x++) {
        const i = (y * g.w + x) * 4; s += 0.0722 * g.b[i] + 0.7152 * g.b[i + 1] + 0.2126 * g.b[i + 2]; n++;
      }
    }
    return s / Math.max(1, n);
  };
  const moved = (g1, g2, r) => {
    const sx = g1.w / W, sy = g1.h / H; let s = 0, n = 0;
    for (let y = Math.round(r.y * sy); y < Math.round((r.y + r.h) * sy); y++) {
      for (let x = Math.round(r.x * sx); x < Math.round((r.x + r.w) * sx); x++) {
        const i = (y * g1.w + x) * 4; s += Math.abs(g1.b[i + 1] - g2.b[i + 1]); n++;
      }
    }
    return s / Math.max(1, n);
  };
  const eye = await js(`(() => { const t = ${theater}, r = t.stageRect(), p = (t.f.picture || [0, 0, 1, 1]); return { has: !!t.rim, x: r.x, y: r.y, w: r.w, h: r.h, top: r.y + p[1] * r.h, ph: (p[3] - p[1]) * r.h }; })()`);
  const g1 = await grab();
  const rimEdge = lumaIn(g1, { x: eye.x + 1, y: eye.top + eye.ph * 0.4, w: 5, h: eye.ph * 0.2 });
  const heart = lumaIn(g1, { x: eye.x + eye.w * 0.4, y: eye.top + eye.ph * 0.4, w: eye.w * 0.2, h: eye.ph * 0.2 });
  check('the mind\'s eye melts the picture\'s edge into the dark', eye.has && rimEdge < 10 && heart > rimEdge + 8, `edge ${rimEdge.toFixed(1)} · heart ${heart.toFixed(1)}`);
  await js(`(${theater}).video.pause(); true`);   // hold the picture still (no theater dim): only the dark may move
  await sleep(250);
  const h1g = await grab();
  await sleep(1300);
  const h2g = await grab();
  const band = { x: eye.x + eye.w * 0.2, y: eye.top, w: eye.w * 0.6, h: eye.ph * 0.16 };
  const drift = moved(h1g, h2g, band);
  check('the mind\'s eye creeps and swirls on a held frame', drift > 0.12, 'band change ' + drift.toFixed(2));
  await js(`(() => { const p = (${theater}).video.play(); if (p && p.catch) p.catch(() => {}); return true; })()`);
  await sleep(300);

  // ── 2. the shatter, stepped (the viewer clicks the picture) ────────────────
  const stage = await js(`(() => { const r = (${theater}).stageRect(); return r; })()`);
  const hit = { x: Math.round(stage.x + stage.w * 0.62), y: Math.round(stage.y + stage.h * 0.4) };
  await js('HWCinemaTheater.freeze = 0.0; true');
  await clickAt(hit.x, hit.y);
  check('a click in the picture starts the break', await waitFor(`!!document.querySelector('.hwcine-gl')`, 3000));
  check('the break carries the frozen frame', await js('HWCinemaTheater._last && HWCinemaTheater._last.hasFrame === 1'), JSON.stringify(await js('HWCinemaTheater._last')));
  check('the break bakes the mind\'s eye into that frame', await js('HWCinemaTheater._last && HWCinemaTheater._last.rim === 1'));
  for (const t of [0.0, 0.1, 0.3, 0.5, 0.62, 0.8, 1.05, 1.4, 1.9, 2.4]) {
    await js(`HWCinemaTheater.freeze = ${t}; true`);
    await sleep(160);
    await shot('10-shatter-' + t.toFixed(2).replace('.', '_'));
  }
  await js('HWCinemaTheater.freeze = null; true');
  check('the theater closes and the page returns', await waitFor(`!document.querySelector('.hwcine') && !document.documentElement.classList.contains('hwcine-lock')`, 6000));
  await sleep(300);
  await shot('11-after-shatter');

  // ── 3. the returning visitor rests ─────────────────────────────────────────
  await load();
  check('a reload inside the rest shows no splash', await js('HWCinema.due === null && !document.querySelector(".hwcine")'));

  // ── 4. a week away brings it back ──────────────────────────────────────────
  await js('(() => { const r = HWCinema.record(); r.last -= 8 * 86400; localStorage.setItem("hw.cinema", JSON.stringify(r)); })()');
  await load();
  check('eight days away: the splash returns', await js('!!HWCinema.due'));
  await waitFor(`(${theater}) && ${theater}.state === 'playing'`);
  await js(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
  check('Escape leaves through the break', await waitFor(`!document.querySelector('.hwcine')`, 6000));

  // ── 5. the banner (a trusted click on the wordmark) ────────────────────────
  await load();
  const h1 = await js('(() => { const r = document.querySelector(".hero-lockup h1").getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()');
  await sleep(400);
  await shot('20-page-at-rest');
  await clickAt(h1.x, h1.y);
  check('the banner opens the feature', await waitFor(`(${theater}) && ${theater}.opts.mode === 'click'`, 4000));
  await sleep(350);
  await shot('21-banner-darkness-spills');
  check('a click plays with sound (the gesture unlocks it)', await waitFor(`(${theater}).state === 'playing' && !(${theater}).video.muted`, 8000));
  await sleep(1500);
  await shot('22-banner-playing');
  /* THE LEVEL: the pill's slider sets a level (never just mute or full), a
     drag that ends outside the pill never means "continue", the arrows turn
     it, and the choice is remembered */
  const pill = await js(`(() => { const r = (${theater}).volEl.getBoundingClientRect(), a = (${theater}).audio.getBoundingClientRect(); return { a: { x: Math.round(a.left + 14), y: Math.round(a.top + a.height / 2) } }; })()`);
  win.webContents.sendInputEvent({ type: 'mouseMove', x: pill.a.x, y: pill.a.y });
  await sleep(450);   // the hover opens the slider
  const track = await js(`(() => { const r = (${theater}).volEl.getBoundingClientRect(); return { x0: r.left, x1: r.right, y: Math.round(r.top + r.height / 2) }; })()`);
  await shot('24-volume-open');
  const from = Math.round(track.x0 + (track.x1 - track.x0) * 0.8), to = Math.round(track.x0 + (track.x1 - track.x0) * 0.35);
  win.webContents.sendInputEvent({ type: 'mouseDown', x: from, y: track.y, button: 'left', clickCount: 1 });
  win.webContents.sendInputEvent({ type: 'mouseMove', x: to, y: track.y, button: 'left' });
  win.webContents.sendInputEvent({ type: 'mouseMove', x: to, y: track.y + 90, button: 'left' });   // wander off the pill
  win.webContents.sendInputEvent({ type: 'mouseUp', x: to, y: track.y + 90, button: 'left', clickCount: 1 });
  await sleep(500);
  const lv = await js(`(() => { const t = ${theater}; return { state: t.state, vol: t.video.volume, muted: t.video.muted, kept: HWCinema.record().vol }; })()`);
  check('the slider sets a level between silence and full', !lv.muted && lv.vol > 0.2 && lv.vol < 0.5, JSON.stringify(lv));
  check('a drag that ends off the pill never continues', lv.state === 'playing');
  check('the level is remembered for the next film', Math.abs(lv.kept - lv.vol) < 0.02);
  await js(`(${theater}).el.focus(); true`);
  win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Down' });
  win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Down' });
  await sleep(200);
  check('the down arrow turns the level down', (await js(`(${theater}).video.volume`)) < lv.vol - 0.05);
  /* the natural end: the film runs out and the screen breaks from the eye, with sound */
  const sounded0 = await js('HWCinemaTheater.sounded || 0');
  await js(`(() => { const v = (${theater}).video; v.currentTime = 58.4; })()`);
  check('the film ends and breaks on its own', await waitFor(`!!document.querySelector('.hwcine-gl')`, 6000));
  check('the natural end still speaks (the break has its sound)', (await js('HWCinemaTheater.sounded || 0')) > sounded0);
  for (const t of [0.12, 0.4, 0.6, 0.9]) {
    await js(`HWCinemaTheater.freeze = ${t}; true`);
    await sleep(160);
    await shot('23-end-break-' + t.toFixed(2).replace('.', '_'));
  }
  await js('HWCinemaTheater.freeze = null; true');
  await waitFor(`!document.querySelector('.hwcine')`, 6000);

  /* the break's sound, rendered offline for a listen (never played on the host) */
  const wav = await js(`(async () => {
    const sr = 48000, ctx = new OfflineAudioContext(2, sr * 4, sr);
    HWCinemaTheater.sound(1, ctx);
    const b = await ctx.startRendering(), n = b.length, L = b.getChannelData(0), R = b.getChannelData(1);
    const buf = new ArrayBuffer(44 + n * 4), v = new DataView(buf);
    const wr = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    wr(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); wr(8, 'WAVE'); wr(12, 'fmt '); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, 2, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 4, true);
    v.setUint16(32, 4, true); v.setUint16(34, 16, true); wr(36, 'data'); v.setUint32(40, n * 4, true);
    let peak = 0;
    for (let i = 0, o = 44; i < n; i++, o += 4) {
      peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
      v.setInt16(o, Math.max(-1, Math.min(1, L[i])) * 32767, true); v.setInt16(o + 2, Math.max(-1, Math.min(1, R[i])) * 32767, true);
    }
    let s = ''; const u8 = new Uint8Array(buf);
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return { peak, b64: btoa(s) };
  })()`);
  fs.writeFileSync(path.join(OUT, 'shatter-sound.wav'), Buffer.from(wav.b64, 'base64'));
  check('the break sound renders, loud but unclipped', wav.peak > 0.2 && wav.peak <= 1.0, 'peak ' + wav.peak.toFixed(3));

  // ── 6. reduced motion: no splash, and the exit is a fade ──────────────────
  const dbg = win.webContents.debugger;
  try { dbg.attach('1.3'); } catch (e) { /* attached */ }
  await dbg.sendCommand('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await js('HWCinema.reset(); true');
  await load();
  check('reduced motion: no unprompted splash', await js('HWCinema.due === null'));
  await clickAt(h1.x, h1.y);
  await waitFor(`(${theater}) && (${theater}).state === 'playing'`, 8000);
  check('reduced motion: the mind\'s eye holds still', await js(`(() => { const r = (${theater}).rim; return !!r && r.time() === 23 && r.open() === 1; })()`));
  await js(`(${theater}).exit(null); true`);
  await sleep(120);
  check('reduced motion: the exit fades, nothing breaks', await js(`!document.querySelector('.hwcine-gl') && document.querySelector('.hwcine-fade') !== null`));
  await waitFor(`!document.querySelector('.hwcine')`, 4000);
  await dbg.sendCommand('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });

  // ── 7. a film that cannot load fails quietly and rests a day ──────────────
  await js('HWCinema.reset(); true');
  await load();
  await waitFor(`(${theater}) && (${theater}).state === 'playing'`, 8000);
  await js(`(${theater}).exit(null); true`);
  await waitFor(`!document.querySelector('.hwcine')`, 6000);
  const broke = await js(`(async () => {
    HWCinema.register('qa-missing', { title: 'QA missing film', cut: 1, sources: [{ family: 'h264', height: 720, src: 'media/qa/missing.mp4', type: 'video/mp4' }] });
    const ok = await HWCinema.play('qa-missing', { mode: 'splash' });
    return { ok, gone: !document.querySelector('.hwcine'), fail: HWCinema.record().fail > 0, arming: document.documentElement.classList.contains('hwcine-arming') };
  })()`);
  check('a missing film closes quietly and records the failure', !broke.ok && broke.gone && broke.fail && !broke.arming, JSON.stringify(broke));

  // ── 8. a skill clip: the Database drawer's loop opens in the theater ─────
  await load('database/?type=skill&id=cleave');
  check('the drawer plays the skill clip, muted and looping', await waitFor(`(() => { const v = document.querySelector('.dclip video'); return v && !v.paused && v.muted && v.loop && v.currentTime > 0.2; })()`, 10000));
  const seen0 = await js('JSON.stringify(HWCinema.record())');
  const clipBox = await js(`(() => { const r = document.querySelector('.dclip-v').getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
  await clickAt(clipBox.x, clipBox.y);
  check('a click opens the clip in the theater', await waitFor(`(${theater}) && (${theater}).state === 'playing' && (${theater}).f.loop === true`, 8000));
  const cl = await js(`(() => { const t = ${theater}; return { muted: t.video.muted, loop: t.video.loop, pill: getComputedStyle(t.audio).display, t: t.video.currentTime }; })()`);
  check('a silent clip plays muted with no sound pill', cl.muted && cl.loop && cl.pill === 'none', JSON.stringify(cl));
  await shot('clip-theater');
  await clickAt(Math.round(W / 2), Math.round(H / 2));
  const faded = await waitFor(`!!document.querySelector('.hwcine-fade')`, 3000);
  const broke8 = await js(`!!document.querySelector('.hwcine-gl')`);
  check('the clip leaves by a fade, never a break', faded && !broke8 && await waitFor(`!document.querySelector('.hwcine')`, 6000));
  check('a clip never touches the visitor record', (await js('JSON.stringify(HWCinema.record())')) === seen0);

  // ── the ledger ─────────────────────────────────────────────────────────────
  const media = missing.filter((p) => !/favicon|qa\/missing/.test(p));
  check('no site request 404ed (besides the planted one)', media.length === 0, media.join(', '));
  /* Electron prints its own security banner into every page; it is not the site */
  const bad = logs.filter((l) => !/qa-missing|the film could not load|missing\.mp4|the film did not start|Electron Security Warning/.test(l));
  check('no stray warnings or errors', bad.length === 0, bad.slice(0, 5).join(' | '));
  const failed = results.filter((r) => !r.ok);
  console.log(`\nSITE CINEMA ${failed.length ? 'FAILED' : 'OK'}: ${results.length - failed.length}/${results.length}  frames: ${OUT}`);
  if (!arg('keep')) { server.close(); app.exit(failed.length ? 1 : 0); }
});
