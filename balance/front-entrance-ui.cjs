// Built-client reveal acceptance with controlled I/O. Never uses player saves.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const reports = path.join(__dirname, 'reports', 'front-entrance');
fs.mkdirSync(reports, { recursive: true });
app.setPath('userData', path.join(reports, 'profile-' + process.pid));
app.disableHardwareAcceleration();
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

app.whenReady().then(async () => {
  const server = await startGameServer({ root: path.resolve(__dirname, '..', process.env.HOLLOW_WAKE_QA_DIST || 'dist'),
    savesDir: path.join(reports, 'saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1280, height: 800,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  const report = { checks: [], images: [] }, held = new Map();
  let holdSaves = true, holdArt = false, failArt = false, closing = false, stage = 'setup', command = '';
  const cdp = (method, params = {}) => { command = method; return win.webContents.debugger.sendCommand(method, params); };
  const progress = name => { stage = name; console.log('Entrance:', name); };
  const run = async (fn, ...args) => {
    const result = await cdp('Runtime.evaluate', { expression: '(' + fn + ')(' + args.map(a => JSON.stringify(a)).join(',') + ')',
      awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const until = async (fn, ms = 10000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) { if (await run(fn)) return; await pause(20); }
    throw Error('Timed out: ' + fn);
  };
  const release = async kind => {
    for (const [id, row] of held) if (row === kind) {
      held.delete(id); await cdp('Fetch.continueRequest', { requestId: id });
    }
  };
  const shot = async name => {
    win.webContents.invalidate(); await pause(80);
    const bitmap = await win.webContents.capturePage();
    const file = path.join(reports, name + '.png'); fs.writeFileSync(file, bitmap.toPNG()); report.images.push(file);
    const data = bitmap.toBitmap(); let light = 0, samples = 0;
    for (let i=0; i<data.length; i+=64) { light += data[i] + data[i+1] + data[i+2]; samples += 3; }
    return light / samples;
  };
  const navigate = name => win.loadURL(server.url + '?entrance-qa=' + name);
  const currentMenu = name => run(n => location.search.includes(n) && !!window.__game && !!document.querySelector('.front-screen'), name);
  const readyMenu = async name => {
    for (let i=0; i<500; i++) {
      try { if (await currentMenu(name)) return; }
      catch (error) { if (!/navigated|context.*destroyed|Cannot find context/i.test(String(error))) throw error; }
      await pause(20);
    }
    throw Error('No menu: ' + name);
  };
  const finishReveal = async () => {
    await run(() => document.querySelector('#front-entrance')?.getAnimations().forEach(a => a.finish()));
    await until(() => !document.querySelector('#front-entrance'));
  };
  const timer = setTimeout(() => { console.error('Entrance acceptance timed out:', stage, command, [...held.values()]); app.exit(1); }, 90000);
  try {
    await win.loadURL('about:blank');
    progress('debugger ready');
    win.webContents.debugger.attach('1.3');
    await cdp('Network.enable');
    await cdp('Network.setCacheDisabled', { cacheDisabled: true });
    win.webContents.debugger.on('message', (_event, method, params) => {
      if (method !== 'Fetch.requestPaused') return;
      const kind = params.request.url.includes('/__save/') ? 'saves' : 'art';
      if (kind === 'saves' ? holdSaves : holdArt) { held.set(params.requestId, kind); return; }
      void cdp(kind === 'art' && failArt ? 'Fetch.failRequest' : 'Fetch.continueRequest', {
        requestId: params.requestId, ...(kind === 'art' && failArt ? { errorReason: 'Failed' } : {}),
      }).catch(error => { if (!closing) console.error(error); });
    });
    await cdp('Fetch.enable', { patterns: [{ urlPattern: '*/__save/*' }, { urlPattern: '*/threshold-*.png' }] });
    progress('waiting for startup data');
    const firstLoad = navigate('slow-saves');
    await readyMenu('slow-saves');
    progress('waiting for artwork while saves are held');
    await until(() => document.querySelector('.front-landscape')?.naturalWidth > 0);
    await pause(150);
    assert(await run(() => {
      const v = document.querySelector('#front-entrance'); window.__entranceVeil = v;
      return v?.dataset.state === 'waiting' && getComputedStyle(v).opacity === '1' && v.getAnimations().length === 0;
    }), 'Decoded art must stay covered while startup saves are pending');
    progress('capturing the waiting frame');
    const black = await shot('01-black-before-ready'); assert(black < 1, 'The waiting frame must be black');
    progress('releasing startup data');
    holdSaves = false; await release('saves'); await firstLoad;
    await until(() => document.querySelector('#front-entrance')?.dataset.state === 'revealing');
    progress('initial reveal');
    const initialDuration = await run(() => {
      const v = document.querySelector('#front-entrance'), a = v.getAnimations()[0];
      a.pause(); a.currentTime = a.effect.getTiming().duration * .35;
      window.__entranceAnimation = a; return a.effect.getTiming().duration;
    });
    assert(initialDuration > 0);
    const middle = await shot('02-mid-reveal'); assert(middle > black, 'The painting and controls must emerge during the fade');
    await run(() => __game.ui.setStartMenuNotice('A journey restored.'));
    assert(await run(() => document.querySelector('#front-entrance') === __entranceVeil && __entranceVeil.getAnimations()[0] === __entranceAnimation),
      'Save and notice refreshes must preserve the same reveal');
    await finishReveal(); const clear = await shot('03-ready-menu'); assert(clear > middle, 'The final menu must be fully revealed');
    await run(() => __game.ui.setStartMenuNotice('Ready to continue.'));
    assert(await run(() => !document.querySelector('#front-entrance')), 'A refresh cannot replay a finished entrance');
    report.checks.push('Startup waits for real save readiness; the entire scene fades; refreshes preserve and never replay the reveal');

    progress('return navigation and input');
    await run(() => document.querySelector('#sm-keys').click());
    await run(() => document.querySelector('#esc-back').click());
    await until(() => document.querySelector('#front-entrance')?.dataset.state === 'revealing');
    const returning = await run(() => {
      const a = document.querySelector('#front-entrance').getAnimations()[0]; a.pause(); return a.effect.getTiming().duration;
    });
    assert(returning > 0 && returning < initialDuration, 'Return navigation uses the shorter configured fade');
    await run(() => document.querySelector('#sm-keys').click());
    assert(await run(() => !document.querySelector('#front-entrance')), 'Leaving the menu cancels a paused reveal');
    await run(() => {
      document.querySelector('#esc-back').click(); const old = document.querySelector('#front-entrance');
      document.querySelector('#sm-keys').click(); document.querySelector('#esc-back').click();
      window.__newEntrance = document.querySelector('#front-entrance');
      if (old.isConnected || old === __newEntrance) throw Error('The old entrance survived navigation');
    });
    await until(() => document.querySelector('#front-entrance')?.dataset.state === 'revealing');
    assert(await run(() => document.querySelector('#front-entrance') === __newEntrance && document.querySelectorAll('#front-entrance').length === 1));
    await run(() => document.querySelector('#sm-start').focus());
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    assert(await run(() => !document.querySelector('#front-entrance') && document.activeElement.id === 'sm-chronicle'));
    await run(() => { document.querySelector('#sm-keys').click(); document.querySelector('#esc-back').click(); document.querySelector('#sm-coop').click(); });
    assert(await run(() => !document.querySelector('#front-entrance')), 'Controller-style click skips the cover even when Co-op leaves the menu mounted');
    await run(() => {
      const title = [...document.querySelectorAll('h2')].find(e => e.textContent === 'Co-op (Beta)');
      [...title.parentElement.querySelectorAll('button')].find(b => b.textContent === 'Close').click();
    });
    report.checks.push('Short return fade; navigation and keyboard/controller input cancel immediately; stale callbacks cannot remove a new reveal');

    await run(() => {
      const ui = __game.ui, begin = ui.onBeginRun, h = ui.startHandlers;
      ui.onBeginRun = () => ui.showStartMenu(h.onStart, h.onContinue, h.onCoop, h.onRoster);
      document.querySelector('#sm-start').click(); ui.onBeginRun = begin;
    });
    assert(await run(() => !!document.querySelector('#front-entrance')), 'An old menu click cannot dismiss a newly opened entrance');
    await until(() => document.querySelector('#front-entrance')?.dataset.state === 'revealing');
    await finishReveal();

    progress('reduced motion');
    await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await navigate('reduced-motion'); await readyMenu('reduced-motion');
    await until(() => !document.querySelector('#front-entrance'), 500);
    assert(await run(() => matchMedia('(prefers-reduced-motion: reduce)').matches && document.querySelector('#front-motion').disabled));
    report.checks.push('Reduced motion reveals the ready menu without a timed fade');
    await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });

    progress('stalled artwork');
    holdArt = true;
    const stalledLoad = navigate('stalled-art'); await readyMenu('stalled-art'); await pause(150);
    assert(await run(() => document.querySelector('#front-entrance')?.dataset.state === 'waiting' && !document.querySelector('.front-landscape').naturalWidth));
    await until(() => !document.querySelector('#front-entrance'), 7500);
    assert(await run(() => !!document.querySelector('.front-primary') && !__game.crash().fatal));
    holdArt = false; await release('art'); await stalledLoad;
    report.checks.push('Artwork readiness is respected; a stalled optional image cannot trap the player behind black');

    progress('failed artwork');
    failArt = true; await navigate('failed-art'); await readyMenu('failed-art');
    await until(() => !document.querySelector('#front-entrance'), 2500);
    assert(await run(() => !document.querySelector('.front-landscape').naturalWidth && !__game.crash().fatal));
    report.checks.push('Failed artwork releases the presentation cover and leaves menu actions available');

    failArt = false; holdArt = true;
    const fatalLoad = navigate('fatal-overlay'); void fatalLoad.catch(() => {});
    await readyMenu('fatal-overlay');
    await run(() => window.dispatchEvent(new ErrorEvent('error', { message: 'Entrance fatal visibility proof', error: new Error('Entrance fatal visibility proof') })));
    assert(await run(() => __game.crash().fatal && __game.crash().suppressed &&
      !!document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.closest('#crash-overlay')),
      'The existing fatal owner and save protection must remain above a waiting reveal');
    report.checks.push('Fatal errors remain visible above the waiting cover and retain save protection');
    console.log('FRONT ENTRANCE OK:', report.checks.join('; '));
  } catch (error) {
    report.error = error.stack || String(error); await shot('failure').catch(() => {}); console.error(error); process.exitCode = 1;
  } finally {
    closing = true; clearTimeout(timer); fs.writeFileSync(path.join(reports, 'report.json'), JSON.stringify(report, null, 2));
    win.destroy(); server.server.close(); app.exit(process.exitCode || 0);
  }
});
