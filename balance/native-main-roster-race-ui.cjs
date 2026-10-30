// Additive actual-browser equivalent of main's PRIMARY roster delayed-read race.
// Runs the installed retained entry path. It never writes to the upstream save
// endpoint: a disposable HTTP save fixture and Electron profile own all data.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict'), crypto = require('node:crypto');
const upstream = process.env.HOLLOW_WAKE_QA_URL || null;
const dist = path.resolve(process.env.HOLLOW_WAKE_QA_DIST || path.join(__dirname, '../dist'));
// Required build: HOLLOW_WAKE_STORAGE_SCOPE='' HOLLOW_WAKE_WORLDMASS='1'.
// A scoped preview intentionally bypasses disk and cannot exercise this course.
const reports = path.resolve(process.env.HOLLOW_WAKE_QA_REPORT || path.join(__dirname, 'reports/native-main-roster-race'));
fs.mkdirSync(reports, { recursive: true });
app.setPath('userData', path.join(reports, 'profile-' + process.pid));
app.disableHardwareAcceleration();
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
app.whenReady().then(async () => {
  const report = { status: 'running', upstream, dist: upstream ? null : dist, checks: [], errors: [], images: [], assets: {}, disk: [] };
  const slots = new Map(); let primarySlot;
  const fixturePath = process.env.HOLLOW_WAKE_QA_FIXTURE;
  const suppliedFixture = fixturePath ? JSON.parse(fs.readFileSync(fixturePath, 'utf8')) : null;
  if (suppliedFixture) {
    slots.set('0', suppliedFixture.accountBody); slots.set(String(suppliedFixture.prepared.slot), suppliedFixture.characterBody); primarySlot = String(suppliedFixture.prepared.slot);
    report.fixtureInput = { file: fixturePath, sha256: digest(fs.readFileSync(fixturePath)) };
  }
  let delayPrimary = false, releasePrimary, heldPrimary = 0, releasedPrimary = 0;
  const save = () => fs.writeFileSync(path.join(reports, 'REPORT.json'), JSON.stringify(report, null, 2) + '\n');
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname.startsWith('/__save/')) {
        const slot = decodeURIComponent(url.pathname.slice('/__save/'.length));
        if (req.method === 'POST') {
          const chunks = []; for await (const chunk of req) chunks.push(chunk);
          const body = Buffer.concat(chunks).toString('utf8'); JSON.parse(body); slots.set(slot, body);
          report.disk.push({ method: 'POST', slot, bytes: Buffer.byteLength(body), sha256: digest(body) });
          res.writeHead(200, { 'content-type': 'application/json' }); res.end('{}'); return;
        }
        assert.equal(req.method, 'GET');
        const body = slots.get(slot) || 'null';
        report.disk.push({ method: 'GET', slot, delayed: slot === primarySlot && delayPrimary, sha256: digest(body) });
        const reply = () => { res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(body); };
        if (slot === primarySlot && delayPrimary) {
          assert.equal(releasePrimary, undefined, 'Only the intended first primary slot read may be held');
          heldPrimary++; releasePrimary = () => { if (releasedPrimary) return; releasedPrimary++; reply(); }; return;
        }
        reply(); return;
      }
      // Only static GETs reach the existing preview; no save, POST, or user data.
      assert.equal(req.method, 'GET');
      let body, status, contentType;
      if (upstream) {
        const response = await fetch(new URL(url.pathname + url.search, upstream));
        body = Buffer.from(await response.arrayBuffer()); status = response.status;
        contentType = response.headers.get('content-type') || 'application/octet-stream';
      } else {
        const file = path.resolve(dist, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
        if (!file.startsWith(dist + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end('Not found'); return; }
        body = fs.readFileSync(file); status = 200;
        contentType = file.endsWith('.js') ? 'application/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.png') ? 'image/png' : file.endsWith('.ico') ? 'image/x-icon' : 'text/html';
      }
      const previous = report.assets[url.pathname];
      const asset = { status, bytes: body.length, sha256: digest(body) };
      if (previous) assert.deepEqual(asset, previous, 'The served build changed during the course');
      report.assets[url.pathname] = asset;
      res.writeHead(status, { 'content-type': contentType, 'cache-control': 'no-store' });
      res.end(body);
    } catch (error) { report.errors.push('HTTP fixture: ' + String(error)); res.writeHead(500); res.end('Fixture failure'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port;
  const win = new BrowserWindow({ show: false, width: 1280, height: 850, webPreferences: { offscreen: true, backgroundThrottling: false } });
  win.webContents.on('console-message', event => { if (event.level === 'error') report.errors.push(event.message); });
  win.webContents.on('render-process-gone', (_, details) => report.errors.push('Renderer gone: ' + JSON.stringify(details)));
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const runOn = async (target, fn, ...args) => {
    const result = await target.executeJavaScript('(async()=>{try{return {ok:true,value:await (' + fn + ')(' + args.map(value => JSON.stringify(value)).join(',') + ')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');
    if (!result.ok) throw Error(result.error); return result.value;
  };
  const run = (fn, ...args) => runOn(win.webContents, fn, ...args);
  const record = (name, value) => { report.checks.push({ name, ...value }); save(); console.log(JSON.stringify({ name, ...value })); };
  const until = async (test, description) => {
    for (let i = 0; i < 240; i++) { const value = await test(); if (value) return value; await pause(25); }
    throw Error('Timed out: ' + description);
  };
  const boot = async () => {
    await run(async () => {
      for (let i = 0; !window.__game && i < 160; i++) await new Promise(resolve => setTimeout(resolve, 50));
      if (!window.__game) throw Error('Game did not boot');
      __game.hold(true); await __game.hydrated(); window.__qaWorldCalls = [];
      const proto = Object.getPrototypeOf(__game.world());
      for (const name of ['createPlayer', 'update', 'applyInputs', 'passInputTime', 'loadZone', 'startWorldMass']) {
        const d = Object.getOwnPropertyDescriptor(proto, name);
        if (!d || typeof d.value !== 'function') throw Error('Missing ordinary World driver ' + name);
        Object.defineProperty(proto, name, { ...d, value: function () { __qaWorldCalls.push(name); throw Error('Retained browser called ordinary World driver ' + name); } });
      }
    });
  };
  const ready = async () => {
    await until(async () => {
      const state = await run(() => ({ fatal: __game.crash().fatal, ready: __game.retained()?.ready === true, scene: __game.world().scene?.def.id ?? null, loading: __game.loading.active }));
      if (state.fatal) throw Error(JSON.stringify(state.fatal));
      if (state.ready && state.loading) await run(() => __game.step(1, 20));
      return state.ready && !state.loading && state.scene === null;
    }, 'actual retained entry and first frame');
  };
  const shot = async name => {
    win.webContents.invalidate(); await pause(120);
    const bitmap = await win.webContents.capturePage();
    const file = path.join(reports, name + '.png'); fs.writeFileSync(file, bitmap.toPNG()); report.images.push(file); save();
  };
  const timer = setTimeout(() => { report.status = 'failed'; report.failure = 'Browser acceptance timeout'; save(); app.exit(1); }, 240000);
  let exitCode = 0;
  try {
    await win.loadURL(url); await boot();
    let prepared, saved;
    if (suppliedFixture) {
      prepared = suppliedFixture.prepared; saved = JSON.parse(suppliedFixture.characterBody);
    } else {
      await run(() => { __game.account().ledger.prologue_lived = 1; __game.saveAccount(); void __game.devStartLoadingRun('tamer'); });
      await ready();
      await run(async () => {
        // The actual main start handler issues a genuine Immortal identity,
        // roster slot, native owner, and bound save envelope. Nothing is cloned
        // to another identity and no guard or serializer is bypassed.
        await __game.ui.startHandlers.onStart(__game.world().meta.classDef, 'immortal', 'Loading QA vessel');
      });
      await ready();
      prepared = await run(async () => {
        const w = __game.world(), row = __game.account().roster.find(entry => entry.charId === w.meta.charId);
        if (!row) throw Error('Actual native creation did not issue its roster card');
        w.meta.essences.coarse = 7; __game.save(); await __game.flushRunSave();
        return { charId: w.meta.charId, modeId: w.meta.modeId, slot: row.slot, classId: w.meta.classDef.id,
          seed: w.manifest.seed, zone: w.zone.id, coarse: w.meta.essences.coarse,
          native: __game.retained()?.ready === true, worldDrivers: __qaWorldCalls };
      });
      assert(Number.isSafeInteger(prepared.slot) && prepared.slot >= 10); assert.equal(prepared.modeId, 'immortal'); primarySlot = String(prepared.slot);
      assert.equal(prepared.native, true); assert.deepEqual(prepared.worldDrivers, []);
      await until(() => slots.has(primarySlot) && JSON.parse(slots.get('0') || '{}').roster?.some(row => row.charId === prepared.charId), 'actual issued character and account disk writes');
      saved = JSON.parse(slots.get(primarySlot));
    }
    assert.equal(saved.charId, prepared.charId); assert.equal(saved.modeId, 'immortal'); assert.equal(String(prepared.slot), primarySlot);
    assert.equal(saved.world.nativeRetained.character.charId, prepared.charId);
    assert.equal(saved.world.nativeRetained.character.modeId, prepared.modeId);
    const body = slots.get(primarySlot);
    const fixture = { prepared, accountBody: slots.get('0'), characterBody: body };
    fs.writeFileSync(path.join(reports, 'genuine-roster-fixture.json'), JSON.stringify(fixture, null, 2) + '\n');
    fs.writeFileSync(path.join(reports, 'primary-roster-slot.json'), body);
    record('genuine native Immortal creation and unchanged issued save', { ...prepared, saveHash: digest(body), reusedFixture: !!suppliedFixture });
    await win.loadURL(url); await boot();
    await run(expected => {
      const entry = __game.account().roster.find(row => row.charId === expected.charId);
      if (!entry || entry.slot !== expected.slot || entry.modeId !== expected.modeId) throw Error('Actual boot roster differs from issued card');
      window.__rosterCharId = expected.charId; window.__rosterSlot = expected.slot;
      window.__beforeContinue = __game.world(); window.__beforeRuntime = __game.retained();
      window.__primaryRead = { selected: 0, fetched: 0, jsonCalls: 0, consumed: 0 };
      const originalFetch = window.fetch; window.__originalFetch = originalFetch;
      window.fetch = function (...args) {
        const primary = String(args[0]) === '/__save/' + __rosterSlot && args[1]?.method === 'GET';
        const first = primary && ++__primaryRead.selected === 1;
        const pending = Reflect.apply(originalFetch, this, args);
        if (!first) return pending;
        return pending.then(response => {
          __primaryRead.fetched++;
          const originalJson = response.json;
          response.json = function (...jsonArgs) {
            __primaryRead.jsonCalls++;
            return Reflect.apply(originalJson, this, jsonArgs).then(value => { __primaryRead.consumed++; return value; });
          };
          return response;
        });
      };
    }, prepared);
    const primaryReadStart = report.disk.length;
    delayPrimary = true;
    const direction = await run(() => {
      document.getElementById('sm-immortals').click();
      document.querySelector('.sm-roster-go[data-cid="' + __rosterCharId + '"]').click();
      return __game.loading.snapshot.direction;
    });
    await until(() => heldPrimary === 1, 'actual disk-first primary roster GET');
    const surface = await until(() => win.webContents.mainFrame.frames.find(frame => frame.url === 'about:srcdoc'), 'isolated loading iframe');
    assert.notEqual(surface.processId, win.webContents.mainFrame.processId, 'The foreground loading surface must remain a separate renderer');
    const isolation = await run(() => {
      const iframe = [...document.querySelectorAll('iframe')].find(frame => frame.getAttribute('srcdoc') !== null);
      if (!iframe) throw Error('No loading surface iframe');
      return { sandbox: iframe.getAttribute('sandbox'), mainHasCancel: !!document.querySelector('#mu-loading-screen button') };
    });
    assert.equal(isolation.mainHasCancel, false); assert(!isolation.sandbox.includes('allow-same-origin'));
    await run(() => {
      if (typeof __game.loading.cancel !== 'function') throw Error('Actual selected LoadingScreen cancel closure missing');
      window.__heldRosterCancel = __game.loading.cancel;
    });
    await shot('primary-roster-read-pending');
    const cancel = await runOn(surface, () => {
      const button = document.querySelector('#mu-loading-screen button');
      if (!button) throw Error('Actual foreground Cancel action missing');
      const text = button.textContent; button.click(); return { text };
    });
    await until(() => run(() => !__game.loading.active), 'foreground cancellation reaches the real owner');
    await run(async () => { window.__newerLease = __game.loading.begin({ kind: 'travel', label: 'Newer preparation' }); await __newerLease.paint(); });
    releasePrimary(); delayPrimary = false;
    await until(() => run(() => __primaryRead.consumed === 1), 'the stale disk response is actually consumed by the renderer');
    // Let the actual diskGet/readResumeSource/main continuations run after the
    // observed JSON promise, rather than assuming an arbitrary network delay.
    await run(async () => { await new Promise(resolve => setTimeout(resolve, 0)); await new Promise(resolve => setTimeout(resolve, 0)); });
    const readConsumed = await run(() => ({ ...__primaryRead }));
    assert.deepEqual(readConsumed, { selected: 1, fetched: 1, jsonCalls: 1, consumed: 1 });
    await run(async () => {
      // Hold the real callback from the canceled primary request. A later
      // loading owner must remain protected even if that exact closure runs.
      Reflect.apply(__heldRosterCancel, undefined, []);
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    const protectedNewer = await run(() => ({
      stale: __game.world() === __beforeContinue && __game.loading.active && __game.loading.snapshot.label === 'Newer preparation',
      sameRuntime: __game.retained() === __beforeRuntime, leaseCurrent: __newerLease.current,
      nativeReady: __game.retained()?.ready === true, fatal: __game.crash().fatal, worldDrivers: __qaWorldCalls,
    }));
    assert.equal(protectedNewer.stale, true); assert.equal(protectedNewer.sameRuntime, true);
    assert.equal(protectedNewer.leaseCurrent, true); assert.equal(protectedNewer.nativeReady, false);
    assert.equal(protectedNewer.fatal, null); assert.deepEqual(protectedNewer.worldDrivers, []);
    assert.equal(heldPrimary, 1); assert.equal(releasedPrimary, 1);
    record('primary delayed read cannot publish or dismiss the newer isolated cover', { direction, cancel, isolation, mainProcess: win.webContents.mainFrame.processId, surfaceProcess: surface.processId, heldPrimary, releasedPrimary, readConsumed, ...protectedNewer });
    await shot('newer-cover-survives-old-read');
    await run(() => __newerLease.finish());
    await until(() => run(() => !__game.loading.active), 'newer cover closes before the real retry');
    const retryMenu = await run(() => {
      const visible = el => !!el && !el.closest('.hidden') && getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0;
      const menu = document.getElementById('start-menu');
      const rosterButton = document.querySelector('.sm-roster-go[data-cid="' + __rosterCharId + '"]');
      const openButton = document.getElementById('sm-immortals');
      return { menuHidden: menu.classList.contains('hidden'), menuText: menu.textContent,
        rosterPresent: !!rosterButton, rosterVisible: visible(rosterButton),
        openPresent: !!openButton, openVisible: visible(openButton),
        loading: __game.loading.active, gameInert: document.getElementById('game').inert,
        worldUnchanged: __game.world() === __beforeContinue, fatal: __game.crash().fatal };
    });
    record('actual post-cancel menu before retry', retryMenu);
    await shot('post-cancel-retry-menu');
    assert.equal(retryMenu.menuHidden, false, 'Cancelling primary roster Continue must restore a visible menu');
    assert(retryMenu.rosterVisible || retryMenu.openVisible, 'An actual primary roster route must remain visible');
    await run(() => {
      const existing = document.querySelector('.sm-roster-go[data-cid="' + __rosterCharId + '"]');
      if (!existing) document.getElementById('sm-immortals').click();
      document.querySelector('.sm-roster-go[data-cid="' + __rosterCharId + '"]').click();
      if (typeof __game.loading.cancel !== 'function') throw Error('Second actual cancel closure missing');
      window.__successfulRosterCancel = __game.loading.cancel;
    });
    await ready();
    const final = await run(() => ({
      active: __game.loading.active, replaced: __game.world() !== __beforeContinue,
      charId: __game.world().meta.charId, modeId: __game.world().meta.modeId, fatal: __game.crash().fatal,
      runtimeReplaced: __game.retained() !== __beforeRuntime, ready: __game.retained()?.ready === true,
      mass: !!__game.world().massRuntime, physicalBorn: __game.retained()?.current.assembly.phase === 'born',
      authorityLocal: __game.retained().current.authority.require(__game.world().player).combat === __game.retained().current.combat, coarse: __game.world().meta.essences.coarse,
      seed: __game.world().manifest.seed, zone: __game.world().zone.id,
      primarySeat: __game.world().localSeat.meta === __game.world().meta,
      worldDrivers: __qaWorldCalls,
    }));
    const roster = { direction, stale: protectedNewer.stale, active: final.active, replaced: final.replaced, charId: final.charId, modeId: final.modeId, fatal: final.fatal };
    // Main's exact identity assertion uses the genuine issued charId here; its
    // fixed synthetic identity cannot replace a retained envelope's binding.
    assert.deepEqual(roster, { direction: 'down', stale: true, active: false, replaced: true, charId: prepared.charId, modeId: 'immortal', fatal: null });
    assert.equal(final.runtimeReplaced, true); assert.equal(final.ready, true); assert.equal(final.mass, false); assert.equal(final.physicalBorn, true); assert.equal(final.authorityLocal, true);
    assert.equal(final.primarySeat, true); assert.equal(final.coarse, prepared.coarse);
    assert.equal(final.seed, prepared.seed); assert.equal(final.zone, prepared.zone); assert.deepEqual(final.worldDrivers, []);
    const primaryReads = report.disk.slice(primaryReadStart).filter(row => row.method === 'GET' && row.slot === primarySlot);
    assert(primaryReads.length >= 2); assert.equal(primaryReads[0].delayed, true);
    assert(primaryReads.slice(1).every(row => !row.delayed && row.sha256 === primaryReads[0].sha256), 'Actual native publish lease rereads must retain the issued body');
    record('main delayed roster cancellation cannot publish or dismiss a newer cover; subsequent roster Continue restores the vessel', { roster, retained: final, primaryReads });
    await run(async () => {
      window.__restoredWorld = __game.world(); window.__restoredRuntime = __game.retained();
      window.__postRetryLease = __game.loading.begin({ kind: 'travel', label: 'After successful roster restore' });
      await __postRetryLease.paint();
      Reflect.apply(__heldRosterCancel, undefined, []);
      Reflect.apply(__successfulRosterCancel, undefined, []);
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    const completedClosures = await run(() => ({
      sameWorld: __game.world() === __restoredWorld, sameRuntime: __game.retained() === __restoredRuntime,
      ready: __game.retained()?.ready === true, menuHidden: document.getElementById('start-menu').classList.contains('hidden'),
      leaseCurrent: __postRetryLease.current, active: __game.loading.active, label: __game.loading.snapshot.label,
      fatal: __game.crash().fatal, worldDrivers: __qaWorldCalls,
    }));
    assert.deepEqual(completedClosures, { sameWorld: true, sameRuntime: true, ready: true, menuHidden: true,
      leaseCurrent: true, active: true, label: 'After successful roster restore', fatal: null, worldDrivers: [] });
    record('both held real cancel closures are inert after successful restore and newer lease', completedClosures);
    await run(() => __postRetryLease.finish());
    await until(() => run(() => !__game.loading.active), 'post-restore cover closes');
    await run(() => __game.renderer.render(__game.world())); await shot('same-vessel-restored');
    const canvas = await run(() => document.getElementById('game').toDataURL('image/png'));
    const canvasFile = path.join(reports, 'same-vessel-canvas.png'); fs.writeFileSync(canvasFile, Buffer.from(canvas.split(',')[1], 'base64')); report.images.push(canvasFile);
    // A separate genuine primary restore pauses only the completion of its
    // actual first Opening-the-world paint. Publication and painting still
    // execute normally; no world, writer, save, or ownership state is faked.
    await run(() => {
      __game.leaveCoop();
      if (document.getElementById('start-menu').classList.contains('hidden')) throw Error('Actual exit did not show menu');
      window.__beforePostPublishWorld = __game.world();
      const selectedBegin = __game.loading.begin;
      window.__restoreLoadingBegin = () => { __game.loading.begin = selectedBegin; };
      let armed = true;
      __game.loading.begin = function (...args) {
        const lease = Reflect.apply(selectedBegin, this, args);
        if (!armed || args[0]?.label !== 'Recalling your vessel') return lease;
        armed = false;
        let opening = false, held = false;
        const selectedUpdate = lease.update, selectedPaint = lease.paint;
        lease.update = function (...updateArgs) {
          const value = Reflect.apply(selectedUpdate, this, updateArgs);
          if (updateArgs[0]?.label === 'Opening the world') opening = true;
          return value;
        };
        lease.paint = function (...paintArgs) {
          const pending = Reflect.apply(selectedPaint, this, paintArgs);
          if (!opening || held) return pending;
          held = true;
          return pending.then(() => new Promise(resolve => {
            window.__postPublishWorld = __game.world(); window.__postPublishRuntime = __game.retained();
            window.__postPublishRelease = resolve; window.__postPublishPaintObserved = true;
          }));
        };
        return lease;
      };
      document.getElementById('sm-immortals').click(); document.querySelector('.sm-roster-go[data-cid="' + __rosterCharId + '"]').click();
    });
    await until(() => run(() => window.__postPublishPaintObserved === true), 'genuine publication and actual first paint');
    const published = await run(() => ({ replaced: __game.world() !== __beforePostPublishWorld,
      ready: __game.retained()?.ready === true, active: __game.loading.active, label: __game.loading.snapshot.label,
      charId: __game.world().meta.charId, menuHidden: document.getElementById('start-menu').classList.contains('hidden'),
      fatal: __game.crash().fatal, worldDrivers: __qaWorldCalls }));
    assert.deepEqual(published, { replaced: true, ready: true, active: true, label: 'Opening the world',
      charId: prepared.charId, menuHidden: true, fatal: null, worldDrivers: [] });
    await shot('published-first-paint-before-cancel');
    await runOn(surface, () => {
      const button = document.querySelector('#mu-loading-screen button');
      if (!button) throw Error('Genuine post-publication Cancel missing'); button.click();
    });
    await until(() => run(() => !__game.loading.active), 'post-publication Cancel returns to menu');
    await run(async () => {
      __postPublishRelease(); __restoreLoadingBegin();
      await new Promise(resolve => setTimeout(resolve, 0)); await new Promise(resolve => setTimeout(resolve, 0));
    });
    const cancelledPublished = await run(() => ({ samePublishedWorld: __game.world() === __postPublishWorld,
      retired: !__postPublishRuntime.ready, menuHidden: document.getElementById('start-menu').classList.contains('hidden'),
      rosterRoute: !!document.getElementById('sm-immortals'), active: __game.loading.active,
      fatal: __game.crash().fatal, worldDrivers: __qaWorldCalls }));
    assert.deepEqual(cancelledPublished, { samePublishedWorld: true, retired: true, menuHidden: false,
      rosterRoute: true, active: false, fatal: null, worldDrivers: [] });
    record('genuine current post-publication Cancel retires owner and restores actual menu', { published, cancelledPublished });
    await shot('published-cancel-menu');
    assert.deepEqual(report.errors, []); report.status = 'passed'; console.log('PASS primary roster retained loading race and held/post-publication cancellation');
  } catch (error) {
    report.status = 'failed'; report.failure = error.stack || String(error); console.error(report.failure); exitCode = 1;
    try { await shot('failure'); } catch (captureError) { report.captureFailure = String(captureError); }
  } finally {
    clearTimeout(timer);
    // Early setup/assertion failures must not leave an owned delayed HTTP read
    // alive while close waits. No shared server or user connection is touched.
    try { releasePrimary?.(); } catch (error) { report.cleanupFailure = String(error); }
    save(); win.destroy();
    const closed = new Promise(resolve => server.close(resolve)); server.closeAllConnections(); await closed; app.exit(exitCode);
  }
});
