// Hidden real-client acceptance; isolated profile and saves, never player data.
const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict');
const reports = path.join(__dirname, 'reports');
fs.mkdirSync(reports, { recursive: true });
app.setPath('userData', path.join(reports, 'save-exit-profile-' + process.pid));
app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const root = path.resolve(__dirname, '..', process.env.HOLLOW_WAKE_QA_DIST || 'dist');
  const slots = new Map(), held = [], checks = [];
  let holdWrites = false, diskEnabled = false, quitCount = 0;
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost'), name = url.pathname;
    if (name.startsWith('/__save/')) {
      if (!diskEnabled) { req.resume(); res.writeHead(404); res.end(); return; }
      const slot = name.slice('/__save/'.length);
      if (req.method === 'POST') {
        let body = ''; req.setEncoding('utf8'); req.on('data', b => body += b);
        req.on('end', () => {
          const finish = () => { slots.set(slot, body); res.end('{}'); };
          if (holdWrites) held.push(finish); else finish();
        });
      } else { res.writeHead(slots.has(slot) ? 200 : 404); res.end(slots.get(slot) || '{}'); }
      return;
    }
    const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = 'http://127.0.0.1:' + server.address().port;
  const win = new BrowserWindow({ show: false, width: 1100, height: 800,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  const windows = [win];
  const run = (fn, ...args) => win.webContents.executeJavaScript('(' + fn + ')(' + args.map(a => JSON.stringify(a)).join(',') + ')');
  const waitFor = async fn => {
    for (let i = 0; i < 500; i++) { if (await run(fn)) return; await new Promise(r => setTimeout(r, 20)); }
    throw Error('Timed out: ' + fn);
  };
  const menu = () => !__game.ui.escapeMenuOpen && !!document.querySelector('#start-menu:not(.hidden) #sm-continue');
  const timer = setTimeout(() => { console.error('Save/exit acceptance timed out'); app.exit(1); }, 120000);
  try {
    await win.loadURL(address);
    await run(async () => { await __game.hydrated(); __game.hold(true); __game.account().ledger.prologue_lived = 1; __game.saveAccount(); __game.devStartRun('warrior'); __game.ui.hideAll(); });
    const before = await run(() => {
      window.__closeCalls = 0; window.close = () => { __closeCalls++; };
      window.__beforeExit = __game.world();
      __game.ui.showEscapeMenu(); document.querySelector('#esc-close').click();
      return { close: __closeCalls, paused: __game.ui.escapeMenuOpen,
        choices: [...document.querySelectorAll('[data-save-exit]')].map(e => e.textContent) };
    });
    assert.deepEqual(before, { close: 0, paused: true, choices: ['Exit to Main Menu', 'Exit to Desktop'] });
    await run(() => document.querySelector('#esc-back2').click());
    assert.equal(await run(() => !!document.querySelector('#esc-resume') && __game.world() === __beforeExit), true);
    await run(() => { document.querySelector('#esc-close').click(); __game.ui.refreshEscapeCouchRow(); });
    assert.equal(await run(() => !!document.querySelector('[data-save-exit]')), true);
    await run(() => { __game.ui.hideEscapeMenu(); });
    assert.equal(await run(() => __game.ui.escapeMenuOpen), false);
    checks.push('Prompt, Back, dismissal and controller census preserve the live run');

    await run(() => {
      const w = __game.world(); w.meta.name = 'Saved at the Door'; w.player.life = 37;
      __game.ui.showEscapeMenu(); document.querySelector('#esc-close').click();
    });
    fs.writeFileSync(path.join(reports, 'save-exit-prompt.png'), (await win.webContents.capturePage()).toPNG());
    await run(() => document.querySelector('[data-save-exit="main-menu"]').click());
    await waitFor(menu);
    assert.equal(await run(() => __game.ui.escapeMenuOpen), false);
    assert.equal(await run(() => document.querySelector('#sm-continue').disabled), false);
    assert.equal(await run(() => __game.world().gameOver), false);
    assert.equal(await run(() => JSON.parse(localStorage.getItem('arpg_character_v1')).name), 'Saved at the Door');
    await run(() => document.querySelector('#sm-continue').click());
    await waitFor(() => !__game.loading.active && __game.world() !== __beforeExit);
    assert.deepEqual(await run(() => ({ name: __game.world().meta.name, life: __game.world().player.life })), { name: 'Saved at the Door', life: 37 });
    checks.push('Mortal main-menu exit preserves the run; immediate Continue restores the newest snapshot');

    await run(() => { __game.world().meta.name = 'Browser Exit'; __game.ui.showEscapeMenu(); document.querySelector('#esc-close').click(); document.querySelector('[data-save-exit="desktop"]').click(); });
    await waitFor(() => !!document.querySelector('#sm-exit-back'));
    assert.equal(await run(() => __closeCalls), 1);
    assert.equal(await run(() => JSON.parse(localStorage.getItem('arpg_character_v1')).name), 'Browser Exit');
    await run(() => document.querySelector('#sm-exit-back').click());
    assert.equal(await run(() => document.querySelector('#sm-continue').disabled), false);
    checks.push('Blocked browser close still saves immediately and leaves a usable main menu');

    // A scene and a render-only client must never overwrite the saved mortal.
    await run(() => { delete __game.account().ledger.prologue_lived; __game.devStartRun('warrior'); __game.ui.hideAll(); __game.ui.showEscapeMenu(); });
    assert.equal(await run(() => !!__game.world().scene), true);
    assert.equal(await run(() => document.querySelector('#esc-close').textContent), 'Exit Game');
    await run(() => { document.querySelector('#esc-close').click(); document.querySelector('[data-save-exit="main-menu"]').click(); });
    await waitFor(menu);
    assert.equal(await run(() => JSON.parse(localStorage.getItem('arpg_character_v1')).name), 'Browser Exit');
    await run(() => {
      __game.net().isHost = false; __game.world().clientActionHook = () => {};
      __game.ui.showEscapeMenu(); document.querySelector('#esc-close').click();
      document.querySelector('[data-save-exit="main-menu"]').click();
    });
    await waitFor(menu);
    assert.equal(await run(() => JSON.parse(localStorage.getItem('arpg_character_v1')).name), 'Browser Exit');
    assert.equal(await run(() => __game.net().isHost), true);
    checks.push('Scene/client exits retain the mortal save and reset the transport');

    diskEnabled = true;
    await run(() => {
      __game.account().ledger.prologue_lived = 1; __game.devStartRun('warrior'); __game.ui.hideAll();
      const w = __game.world(); w.meta.modeId = 'immortal'; w.meta.charId = 'exit-vessel';
      __game.account().roster.push({ charId: 'exit-vessel', slot: 100, modeId: 'immortal', stage: 0, classId: 'warrior', name: 'Old Vessel', level: 1, savedAt: 0 });
      __game.save();
    });
    await new Promise(r => setTimeout(r, 150));
    holdWrites = true;
    await run(() => { __game.world().meta.name = 'Newest Vessel'; __game.ui.showEscapeMenu(); document.querySelector('#esc-close').click(); document.querySelector('[data-save-exit="main-menu"]').click(); });
    await new Promise(r => setTimeout(r, 150));
    assert.ok(held.length > 0);
    assert.equal(await run(menu), false, 'Do not expose disk-first Continue until the new save lands');
    await run(() => __game.ui.hideEscapeMenu());
    assert.equal(await run(() => __game.ui.escapeMenuOpen), true, 'Pending save cannot be dismissed');
    holdWrites = false; held.splice(0).forEach(f => f());
    await waitFor(menu);
    assert.equal(JSON.parse(slots.get('100')).name, 'Newest Vessel');
    await run(() => { document.querySelector('#sm-immortals').click(); document.querySelector('[data-cid="exit-vessel"]').click(); });
    await waitFor(() => !__game.loading.active && __game.world().meta.name === 'Newest Vessel');
    checks.push('Immortal exit waits for disk and immediately resumes the newest vessel');

    // Real sandboxed preload; intercept its one IPC message so this harness can
    // inspect disk completion instead of ending the test process at the request.
    const native = new BrowserWindow({ show: false, webPreferences: { offscreen: true, sandbox: true, contextIsolation: true,
      preload: path.resolve(__dirname, '../launcher/game-preload.cjs'),
      additionalArguments: ['--hollow-storage-scope=save-exit-test', '--hollow-offline=true'] } });
    windows.push(native);
    ipcMain.on('game:quit', event => { if (event.sender === native.webContents && event.senderFrame === native.webContents.mainFrame) quitCount++; });
    await native.loadURL(address);
    const nativeRun = fn => native.webContents.executeJavaScript('(' + fn + ')()');
    await nativeRun(async () => { await __game.hydrated(); __game.hold(true); __game.account().ledger.prologue_lived = 1; __game.devStartRun('warrior'); __game.ui.hideAll(); });
    await new Promise(r => setTimeout(r, 150));
    holdWrites = true;
    await nativeRun(() => { __game.world().meta.name = 'Desktop Exit'; __game.ui.showEscapeMenu(); document.querySelector('#esc-close').click(); document.querySelector('[data-save-exit="desktop"]').click(); });
    await new Promise(r => setTimeout(r, 150));
    assert.ok(held.length > 0); assert.equal(quitCount, 0);
    holdWrites = false; held.splice(0).forEach(f => f());
    for (let i = 0; quitCount === 0 && i < 100; i++) await new Promise(r => setTimeout(r, 20));
    assert.equal(quitCount, 1);
    assert.equal(JSON.parse(slots.get('1')).name, 'Desktop Exit');
    assert.equal(await nativeRun(() => typeof window.__perfBeat), 'undefined');
    assert.deepEqual(await nativeRun(() => [window.__HOLLOW_WAKE_STORAGE_SCOPE__, window.__HOLLOW_WAKE_OFFLINE__]), ['save-exit-test', true]);
    const perf = new BrowserWindow({ show: false, webPreferences: { offscreen: true, sandbox: true, contextIsolation: true,
      preload: path.resolve(__dirname, '../launcher/game-preload.cjs'), additionalArguments: ['--hollow-wake-perf-beat'] } });
    windows.push(perf); await perf.loadURL('about:blank');
    assert.equal(await perf.webContents.executeJavaScript('typeof window.__perfBeat'), 'function');
    checks.push('Desktop preload requests quit once, after pending saves finish; performance IPC stays absent');
    checks.push('Published storage identity/offline status survive; performance beat remains opt-in');
    console.log('PASS save-exit:', checks.join('\n'));
  } catch (error) { console.error(error.stack || String(error)); process.exitCode = 1; }
  finally {
    fs.writeFileSync(path.join(reports, 'save-exit-ui.json'), JSON.stringify({ checks }, null, 2));
    clearTimeout(timer); for (const window of windows) window.destroy(); server.close(); app.exit(process.exitCode || 0);
  }
});
