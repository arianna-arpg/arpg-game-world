// Finite native lifecycle fixture for the residency instrument. UNRUN at handoff.
// Uses real requestAnimationFrame, real devStartRun and retained dispatch. This
// instrumented offscreen fixture is NOT a frame-cost/capacity benchmark.
// Run with Electron only after types/build and explicit serial runtime release.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict'), crypto = require('node:crypto');
const { writeFailedResidencyReport } = require('../launcher/perfresidency.cjs');
const root = path.resolve(__dirname, '..'), dist = path.resolve(root, process.env.RESIDENCY_DIST || 'dist');
const reportRoot = path.join(__dirname, 'reports');
fs.mkdirSync(reportRoot, { recursive: true });
const out = fs.mkdtempSync(path.join(reportRoot, 'native-residency-lifecycle-'));
app.setPath('userData', path.join(out, 'profile'));
app.disableHardwareAcceleration();
app.on('window-all-closed', () => {});
const instrumentation = () => {
  const q = window.__residencyFixture = { active: false, writes: [], beats: [], starts: [], frames: [], observers: [], fakePad: 'unseen' };
  const mark = (kind, detail) => { if (q.active) q.writes.push({ kind, detail, at: performance.now() }); };
  for (const name of ['setItem', 'removeItem', 'clear']) {
    const original = Storage.prototype[name];
    Storage.prototype[name] = function (...args) { mark('storage.' + name, String(args[0])); return Reflect.apply(original, this, args); };
  }
  for (const name of ['put', 'add', 'delete', 'clear']) {
    const original = IDBObjectStore.prototype[name];
    IDBObjectStore.prototype[name] = function (...args) { mark('idb.' + name, this.name); return Reflect.apply(original, this, args); };
  }
  const fetch = window.fetch;
  window.fetch = function (input, init) { const method = init?.method || (input instanceof Request ? input.method : 'GET'); if (!['GET', 'HEAD'].includes(method.toUpperCase())) mark('fetch', method + ' ' + String(input)); return Reflect.apply(fetch, this, [input, init]); };
  const beacon = navigator.sendBeacon;
  navigator.sendBeacon = function (...args) { mark('beacon', String(args[0])); return Reflect.apply(beacon, this, args); };
  const Observer = window.PerformanceObserver;
  window.PerformanceObserver = class extends Observer {
    constructor(...args) { super(...args); this.receipt = { disconnected: false }; q.observers.push(this.receipt); }
    disconnect() { this.receipt.disconnected = true; return super.disconnect(); }
  };
  window.__perfBeat = value => q.beats.push(value);
};
app.whenReady().then(async () => {
  let win, server, firstError, courseActive = false;
  const report = { status: 'running', instrumentation: 'real native starts/frames; observational save and dispatch wrappers; offscreen software renderer; no cost claim', checks: [], owned: { pid: process.pid, windowsDestroyed: false, serverClosed: false }, requestWrites: [] };
  const save = () => fs.writeFileSync(path.join(out, 'REPORT.json'), JSON.stringify(report, null, 2));
  const run = async (fn, ...args) => {
    const result = await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await (' + fn + ')(' + args.map(x => JSON.stringify(x)).join(',') + ')}}catch(error){return {ok:false,error:error.stack||String(error)}}})()');
    if (!result.ok) throw new Error(result.error); return result.value;
  };
  const record = (name, value) => { report.checks.push({ name, value }); save(); console.log('RESIDENCY ' + name); };
  const deadline = setTimeout(() => { report.status = 'timeout'; save(); app.exit(2); }, 240000);
  const boot = async () => {
    courseActive = false;
    if (win && !win.isDestroyed()) { const closed = new Promise(r => win.once('closed', r)); win.destroy(); await closed; }
    win = new BrowserWindow({ show: false, width: 1280, height: 850, webPreferences: { offscreen: true, backgroundThrottling: false } });
    await win.loadURL('about:blank');
    win.webContents.debugger.attach('1.3'); await win.webContents.debugger.sendCommand('Page.enable');
    await win.webContents.debugger.sendCommand('Page.addScriptToEvaluateOnNewDocument', { source: '(' + instrumentation + ')()' });
    await win.loadURL('http://127.0.0.1:' + server.address().port + '/');
    await run(async () => {
      for (let i = 0; !window.__game && i < 200; i++) await new Promise(r => setTimeout(r, 25));
      if (!window.__game) throw new Error('Game did not boot');
      await __game.hydrated(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const q = window.__residencyFixture, original = __game.devStartRun, pad = __game.fakePad;
      q.observers = []; q.active = true;
      __game.fakePad = function (value) { q.fakePad = value === null ? null : 'active'; return Reflect.apply(pad, this, arguments); };
      __game.devStartRun = function (...args) {
        q.calls = (q.calls || 0) + 1;
        if (q.failStart === q.calls) throw q.sentinel;
        const previous = __game.retained(), result = Reflect.apply(original, this, args), next = __game.retained();
        if (!next || !next.ready || next.writer !== __game.world()) throw new Error('Actual fresh owner not ready/current');
        let staleRefused = previous === null || previous === undefined;
        if (previous) { try { void previous.current; } catch { staleRefused = true; } }
        q.starts.push({ ordinal: q.starts.length, previousRetired: !previous || !previous.ready, different: previous !== next, staleRefused, manifestSeed: __game.world().manifest.seed });
        const dispatch = next.dispatch;
        next.dispatch = function (...frameArgs) {
          if (this !== __game.retained() || this.writer !== __game.world()) throw new Error('Frame routed through another owner');
          const result = Reflect.apply(dispatch, this, frameArgs);
          q.frames.push({ start: q.starts.length - 1, zone: this.current.assembly.input.scene.zone.id, ready: this.ready });
          return result;
        };
        return result;
      };
    });
    courseActive = true;
  };
  try {
    const index = fs.readFileSync(path.join(dist, 'index.html'), 'utf8'), asset = index.match(/src="([^"]+\.js)"/)?.[1];
    if (!asset) throw new Error('Frozen build asset not found');
    report.bundleHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(dist, asset))).digest('hex');
    report.harnessHash = crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex');
    server = http.createServer((req, res) => {
      if (!['GET', 'HEAD'].includes(req.method)) report.requestWrites.push({ phase: courseActive ? 'course' : 'boot', method: req.method, url: req.url });
      const pathname = new URL(req.url, 'http://localhost').pathname, file = path.resolve(dist, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!file.startsWith(dist + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end(); }
      res.setHeader('Content-Type', file.endsWith('.js') ? 'application/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html'); fs.createReadStream(file).pipe(res);
    });
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    await boot();
    const refusals = await run(async () => {
      const q = window.__residencyFixture, errors = [];
      for (const opts of [{ course: 'ramp', seed: 0, rampList: ['descent'] }, { course: 'ramp', seed: 0, rampSteps: 201 }]) {
        try { await __game.perfSweep(opts); throw new Error('Malformed course unexpectedly returned'); }
        catch (error) { errors.push(error.message); }
      }
      if (q.calls || q.writes.length) throw new Error('Refusal started or wrote a run');
      return { errors, starts: q.calls || 0, writes: q.writes };
    });
    assert.match(refusals.errors[0], /outside the selected matrix: descent/); assert.match(refusals.errors[1], /rampSteps must be/); record('actual browser pre-start refusals', refusals);
    const normal = await run(async () => {
      const q = window.__residencyFixture;
      const result = await __game.perfSweep({ course: 'fresh', seed: 20261016, tilesets: ['forest', 'sandsea'], mintSeed: 83, seconds: 0.35, settleSeconds: 0.15, weather: 'clear' });
      return { result, starts: q.starts, frames: q.frames, writes: q.writes, observers: q.observers, fakePad: q.fakePad, fatal: __game.crash().fatal };
    });
    assert.equal(normal.result.fresh.length, 2); assert.equal(normal.result.skipped.length, 0); assert.equal(normal.starts.length, 2);
    assert.ok(normal.starts.every(s => s.previousRetired && s.different && s.staleRefused && s.manifestSeed === 20261016));
    assert.ok(normal.starts.every(s => normal.frames.some(f => f.start === s.ordinal && f.ready)));
    assert.ok(normal.result.fresh.every(r => r.valid && r.runtime.startupMs > 0 && r.controlReturnSyncMs >= 0 && 'afterControl' in r.heapMB && !('afterStart' in r.heapMB)));
    assert.ok(normal.result.residencyWindows.every(w => w.valid && w.egress && w.ingress.runtime === w.egress.runtime && w.ingress.writer === w.egress.writer));
    assert.deepEqual(normal.writes, []); assert.equal(normal.fakePad, null); assert.equal(normal.fatal, null); assert.ok(normal.observers.length > 0 && normal.observers.every(o => o.disconnected));
    record('two actual starts and real owned frames with boundary censuses and no writes', normal);
    await boot();
    const age = await run(async () => {
      const q = window.__residencyFixture;
      const result = await __game.perfSweep({ course: 'ramp', rampAgeControl: true, rampSteps: 2, seed: 20261016, seconds: 0.35, settleSeconds: 0.15, weather: 'clear' });
      return { result, writes: q.writes, fakePad: q.fakePad, observers: q.observers };
    });
    assert.equal(age.result.ramp.steps.length, 2); assert.ok(age.result.ramp.steps.every(s => s.valid && s.residentAreas === 1));
    assert.ok(age.result.residencyWindows.every(w => w.ingress.census.residentAreas === 1 && w.egress.census.residentAreas === 1));
    assert.deepEqual(age.writes, []); assert.equal(age.fakePad, null); assert.ok(age.observers.every(o => o.disconnected)); record('actual age-control boundaries', age);
    await boot();
    const failure = await run(async () => {
      const q = window.__residencyFixture; q.failStart = 2; q.sentinel = new Error('injected later native start failure');
      let error, same = false;
      try { await __game.perfSweep({ course: 'fresh', seed: 20261016, tilesets: ['forest', 'sandsea'], mintSeed: 83, seconds: 0.35, settleSeconds: 0.15, weather: 'clear' }); }
      catch (value) { same = value === q.sentinel; error = { name: value.name, message: value.message, stack: value.stack }; }
      const banked = { rows: [], skipped: [], control: null, controlEnd: null, fresh: [], ramp: [], residencyWindows: [] };
      for (const b of q.beats) { if (b.at === 'fresh') banked.fresh.push(b.row); else if (b.at === 'control') banked.control = b.row; else if (b.at === 'residency-window') banked.residencyWindows.push(b.window); else if (b.at === 'skip') banked.skipped.push(b.skip); }
      return { error, same, banked, writes: q.writes, calls: q.calls, fakePad: q.fakePad, observers: q.observers };
    });
    assert.equal(failure.same, true); assert.equal(failure.calls, 2); assert.equal(failure.banked.fresh.length, 1); assert.ok(failure.banked.residencyWindows.length >= 4);
    assert.deepEqual(failure.writes, []); assert.equal(failure.fakePad, null); assert.ok(failure.observers.every(o => o.disconnected));
    const original = Object.assign(new Error(failure.error.message), failure.error);
    const partialDir = writeFailedResidencyReport(out, { course: 'fresh', seed: 20261016 }, failure.banked, original, { fixture: true, bundleHash: report.bundleHash });
    const partial = JSON.parse(fs.readFileSync(path.join(partialDir, 'report.json'), 'utf8'));
    assert.equal(partial.report.validMeasurement, false); assert.deepEqual(partial.report.fresh, failure.banked.fresh); assert.equal(partial.report.failure.stack, failure.error.stack);
    record('actual second-start refusal preserves first error and banked raw partial artifact', { ...failure, partialDir });
    assert.deepEqual(report.requestWrites.filter(row => row.phase === 'course'), []); report.status = 'passed';
  } catch (error) { firstError = error; report.status = 'failed'; report.failure = error.stack || String(error); console.error(report.failure); }
  finally {
    // Keep the bounded deadline armed through actual window/server close.
    try { if (win && !win.isDestroyed()) { const closed = new Promise(r => win.once('closed', r)); win.destroy(); await closed; } report.owned.windowsDestroyed = true; } catch (error) { report.cleanupError = String(error); firstError ||= error; }
    try { if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); report.owned.serverClosed = true; } catch (error) { report.cleanupError = String(error); firstError ||= error; }
    if (firstError) report.status = 'failed'; save(); clearTimeout(deadline); app.exit(firstError ? 1 : 0);
  }
});
