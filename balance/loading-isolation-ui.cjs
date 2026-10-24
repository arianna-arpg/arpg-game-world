// Real-process acceptance: prove input and frames DURING blocked game work,
// rather than inferring playability from an animation before/after a load.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const reports = path.join(__dirname, 'reports'); fs.mkdirSync(reports, { recursive: true });
app.setPath('userData', path.join(reports, 'loading-isolation-profile-' + process.pid)); app.disableHardwareAcceleration();
app.whenReady().then(async () => {
 const root = path.resolve(__dirname, '..', process.env.HOLLOW_WAKE_QA_DIST || 'dist');
 const report = { checks: [], errors: [], images: [] };
 const server = http.createServer((req, res) => {
  const name = new URL(req.url, 'http://localhost').pathname, file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', file.endsWith('.js') ? 'application/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html'); fs.createReadStream(file).pipe(res);
 });
 await new Promise(r => server.listen(0, '127.0.0.1', r));
 const win = new BrowserWindow({ show: false, width: 1280, height: 850, webPreferences: { offscreen: true, backgroundThrottling: false } });
 win.webContents.on('console-message', e => { if (e.level === 'error') report.errors.push(e.message); });
 const pause = ms => new Promise(r => setTimeout(r, ms));
 const execute = async (target, fn, ...args) => {
  const result = await target.executeJavaScript('(async()=>{try{return {ok:true,value:await (' + fn + ')(' + args.map(a => JSON.stringify(a)).join(',') + ')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');
  if (!result.ok) throw Error(result.error); return result.value;
 };
 const run = (fn, ...args) => execute(win.webContents, fn, ...args);
 const child = () => win.webContents.mainFrame.frames.find(f => f.url === 'about:srcdoc');
 const toy = (fn, ...args) => execute(child(), fn, ...args);
 const untilClosed = () => run(async () => { for (let i = 0; __game.loading.active && i < 150; i++) await new Promise(r => setTimeout(r, 10)); if (__game.loading.active) throw Error('Crossing did not close'); });
 const shot = async name => { const file = path.join(reports, 'loading-isolation-' + name + '.png'); fs.writeFileSync(file, (await win.webContents.capturePage()).toPNG()); report.images.push(file); };
 const timer = setTimeout(() => { console.error('Loading isolation acceptance timed out'); app.exit(1); }, 180000);
 try {
  await win.loadURL('http://127.0.0.1:' + server.address().port);
  await run(async () => {
   for (let i = 0; !window.__game && i < 100; i++) await new Promise(r => setTimeout(r, 100)); await __game.hydrated(); __game.account().ledger.prologue_lived = 1; __game.saveAccount();
  });
  await toy(() => {
   Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => window.__qaPads || [] });
  });
  await run(async () => {
   window.__qaLease = __game.loading.begin({ kind: 'travel', direction: 'right', label: 'Opening the world', cancel: () => { window.__qaCancelled = (window.__qaCancelled || 0) + 1; window.__qaLease.finish(); } });
   await __qaLease.paint();
  });
  assert.ok(child());
  assert.notEqual(child().processId, win.webContents.mainFrame.processId, 'foreground must have its own renderer process');
  report.checks.push({ distinctProcesses: { game: win.webContents.mainFrame.processId, crossing: child().processId } });
  const permissions = await toy(() => ({ secure: isSecureContext, gamepad: (() => { try { navigator.getGamepads(); return true; } catch { return false; } })() }));
  assert.equal(permissions.gamepad, true); report.checks.push({ permissions });
  await toy(() => { window.__qaFrames = []; function watch() { __qaFrames.push(Date.now()); if (__qaFrames.length > 3000) __qaFrames.shift(); requestAnimationFrame(watch); } requestAnimationFrame(watch); });
  let ended = false;
  const busy = run(() => { const start = Date.now(); while (Date.now() - start < 1800) { Math.sqrt(Math.random()); } return { start, end: Date.now() }; }).then(value => { ended = true; return value; });
  await pause(180);
  const before = await toy(() => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS', bubbles: true })); return __muCrossing.snapshot; });
  await pause(230);
  const keyboard = await toy(() => { window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyS', bubbles: true })); return __muCrossing.snapshot; });
  assert.ok(keyboard.lane > before.lane + 50, 'keyboard steering progresses while parent is blocked'); assert.equal(ended, false);
  await toy(() => { const rect = document.querySelector('canvas').getBoundingClientRect(), scale = Math.min(rect.width / 1000, rect.height / 560);
   document.querySelector('#mu-loading-screen').dispatchEvent(new PointerEvent('pointermove', { clientX: rect.x + rect.width / 2, clientY: rect.y + rect.height / 2 - 110 * scale, bubbles: true })); });
  await pause(280);
  const pointer = await toy(() => __muCrossing.snapshot); assert.ok(pointer.lane < keyboard.lane - 50); assert.equal(ended, false);
  await toy(() => { Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => window.__qaPads || [] });
   window.__qaPads = [{ connected: true, axes: [0, 0.8], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) }]; });
  await pause(220);
  const gamepad = await toy(() => __muCrossing.snapshot); assert.ok(gamepad.lane > pointer.lane + 40); assert.equal(ended, false);
  await toy(() => { window.__qaPads = []; });
  const span = await busy;
  const frames = await toy(() => __qaFrames);
  const during = frames.filter(t => t >= span.start && t <= span.end), gaps = during.slice(1).map((t, i) => t - during[i]);
  assert.ok(during.length >= 35); assert.ok(Math.max(...gaps) < 250, 'no foreground freeze during the sustained game-thread block');
  assert.ok(gamepad.time > before.time + 0.5);
  report.checks.push({ busyInput: { ...span, frames: during.length, maxGapMs: Math.max(...gaps), lanes: [before.lane, keyboard.lane, pointer.lane, gamepad.lane] } });
  await shot('busy');
  // The close acknowledgement carries held keys back before world input resumes.
  await toy(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true })));
  await run(() => window.__qaLease.finish()); await untilClosed();
  const quarantine = await run(() => {
   let leaks = 0; const listener = e => { if (e.code === 'KeyW') leaks++; }; window.addEventListener('keydown', listener);
   window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', repeat: true, bubbles: true })); const held = leaks;
   window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', bubbles: true }));
   window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true }));
   window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', bubbles: true })); window.removeEventListener('keydown', listener);
   return { held, released: leaks, inert: document.getElementById('game').inert };
  });
  assert.deepEqual(quarantine, { held: 0, released: 1, inert: false }); report.checks.push('foreground held-key handshake and focus cleanup');
  await run(async () => {
   const old = __game.loading.begin({ kind: 'entry', label: 'Old crossing' });
   window.__qaLease = __game.loading.begin({ kind: 'travel', direction: 'left', label: 'Current crossing', cancel: () => { window.__qaCancelled = (window.__qaCancelled || 0) + 1; __qaLease.finish(); } });
   old.update({ label: 'Stale update' }); old.fail('Stale failure'); old.finish(); await __qaLease.paint();
  });
  assert.equal((await toy(() => __muCrossing.snapshot)).label, 'Current crossing');
  const cancelling = run(() => { const start = Date.now(); while (Date.now() - start < 900) {} });
  await pause(180);
  const cancelFeedback = await toy(() => { document.querySelector('button').click(); return document.querySelector('.mu-status').textContent; });
  assert.equal(cancelFeedback, 'Leaving the crossing'); await cancelling; await untilClosed();
  assert.equal(await run(() => window.__qaCancelled), 1); report.checks.push('stale leases ignored; Cancel responds during busy work and closes safely at the next game boundary');

  // Exercise both fresh construction and a cold, persisted Continue through
  // their real entry points. The foreground drives its own input during every
  // CPU stage; nothing in the game process pumps its animation or steering.
  const observePreparation = async kind => {
   assert.ok(child());
   assert.notEqual(child().processId, win.webContents.mainFrame.processId);
   await toy(async () => {
    for (let i = 0; !window.__muCrossing && i < 100; i++) await new Promise(r => setTimeout(r, 20));
    if (!window.__muCrossing) throw Error('Foreground did not initialize');
    // A physical controller must not cancel preparation after the cold reload.
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [] });
    window.__qaLive = []; let last = 0;
    function play(now) { const s = __muCrossing.snapshot;
     if (s.active) { __qaLive.push({ at: Date.now(), time: s.time, lane: s.lane });
      if (now - last > 180) { last = now;
       window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD', bubbles: true }));
       window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA', bubbles: true }));
       window.dispatchEvent(new KeyboardEvent('keydown', { code: Math.floor(now / 400) % 2 ? 'KeyD' : 'KeyA', bubbles: true })); } }
     if (__qaLive.length > 6000) __qaLive.shift(); requestAnimationFrame(play);
    } requestAnimationFrame(play);
   });
   const result = await run(async kind => {
    const before = __game.world(), tasks = [];
    const observer = new PerformanceObserver(list => { for (const e of list.getEntries()) tasks.push({ at: performance.timeOrigin + e.startTime, duration: e.duration }); });
    observer.observe({ type: 'longtask' }); const start = Date.now();
    try {
     if (kind === 'entry') await __game.devStartLoadingRun();
     else {
      const button = document.getElementById('sm-continue');
      if (!button || button.disabled) throw Error('Cold Continue is unavailable');
      button.click();
      if (!__game.loading.active) throw Error('Continue did not open its crossing');
     }
     for (let i = 0; __game.loading.active && i < 1200; i++) await new Promise(r => setTimeout(r, 25));
     await new Promise(r => setTimeout(r, 30));
     return { start, end: Date.now(), tasks, mass: !!__game.world().massRuntime, active: __game.loading.active,
      replaced: __game.world() !== before, seed: __game.world().manifest.seed, fatal: __game.crash().fatal };
    } finally { observer.disconnect(); }
   }, kind);
   const live = await toy(() => __qaLive);
   assert.equal(result.mass, true); assert.equal(result.active, false); assert.equal(result.fatal, null); assert.equal(result.replaced, true);
   const largest = [...result.tasks].sort((a, b) => b.duration - a.duration)[0];
   assert.ok(largest?.duration >= 100, kind + ': real preparation exercised a substantial CPU stage');
   const inside = live.filter(s => s.at >= largest.at && s.at <= largest.at + largest.duration);
   const gaps = [inside[0]?.at - largest.at,
    ...inside.slice(1).map((s, i) => s.at - inside[i].at), largest.at + largest.duration - inside.at(-1)?.at];
   assert.ok(inside.length >= largest.duration / 50, kind + ': minigame remains playable during the real heavy stage');
   assert.ok(Math.max(...gaps) < 250, kind + ': no foreground freeze or hidden-frame throttling');
   assert.ok(Math.max(...inside.map(s => s.lane)) - Math.min(...inside.map(s => s.lane)) > 10, kind + ': steering changed during the real heavy stage');
   // Cover the complete observed crossing as well as its longest CPU stage.
   // This catches stalls in other restoration/publication/first-render phases.
   const allGaps = live.slice(1).map((s, i) => s.at - live[i].at);
   const duration = live.at(-1).at - live[0].at;
   assert.ok(live.length >= duration / 50, kind + ': all preparation phases remain playable');
   assert.ok(Math.max(...allGaps) < 250, kind + ': no freeze between loading phases');
   report.checks.push({ [kind === 'entry' ? 'actualEntry' : 'actualContinue']: { ...result,
    longestTaskFrames: inside.length, maxGapMs: Math.max(...gaps), samples: inside,
    wholeCrossing: { duration, frames: live.length, maxGapMs: Math.max(...allGaps) } } });
   return result;
  };
  const entry = await observePreparation('entry');
  await run(async () => { __game.world().player.invulnerable = true; __game.save(); await __game.flushRunSave(); });
  await win.loadURL('http://127.0.0.1:' + server.address().port);
  await run(async () => {
   for (let i = 0; !window.__game && i < 100; i++) await new Promise(r => setTimeout(r, 100));
   await __game.hydrated();
   for (let i = 0; document.getElementById('sm-continue')?.disabled && i < 100; i++) await new Promise(r => setTimeout(r, 25));
  });
  const continued = await observePreparation('continue');
  assert.equal(continued.seed, entry.seed, 'Continue restored the persisted world rather than starting a fresh one');
  const firstFrame = await run(async () => {
   const w = __game.world(), renderer = __game.renderer;
   const lease = __game.loading.begin({ kind: 'entry', label: 'Checking the first frame' });
   await lease.paint(); let pauses = 0, reentryRefused = false;
   const complete = await renderer.renderLoading(w, async () => {
    if (++pauses === 1) {
     try { renderer.render(w); } catch { reentryRefused = true; }
     renderer.resize();
    }
    await lease.paint();
   }, () => lease.current);
   const cancelled = await renderer.renderLoading(w, async () => lease.finish(), () => lease.current);
   for (let i = 0; __game.loading.active && i < 100; i++) await new Promise(r => setTimeout(r, 10));
   renderer.render(w);
   return { complete, pauses, reentryRefused, cancelled, active: __game.loading.active };
  });
  assert.deepEqual(firstFrame, { complete: true, pauses: 2, reentryRefused: true, cancelled: false, active: false });
  report.checks.push('first frame restarts after resize; concurrent rendering refuses; cancellation releases renderer ownership');
  assert.deepEqual(report.errors, []); console.log('PASS isolated loading runtime:', report.checks.length, 'checks');
 } catch (error) { report.failure = error.stack || String(error); console.error(report.failure); process.exitCode = 1; }
 finally { fs.writeFileSync(path.join(reports, 'loading-isolation-ui.json'), JSON.stringify(report, null, 2)); clearTimeout(timer); win.destroy(); server.close(); app.exit(process.exitCode || 0); }
});
