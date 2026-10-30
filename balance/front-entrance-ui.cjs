// Actual cold boot, menu refreshes and navigation. Uses disposable profile/saves.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports');
fs.mkdirSync(dir, { recursive: true });
app.setPath('userData', path.join(dir, 'front-entrance-profile-' + process.pid));
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  let stage = 'server';
  const timer = setTimeout(() => { console.error('Front entrance timeout at ' + stage); app.exit(1); }, 90000), checks = [];
  const server = await startGameServer({ root: path.resolve(__dirname, '..', process.env.HOLLOW_WAKE_QA_DIST || 'dist'),
    savesDir: path.join(dir, 'front-entrance-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1600, height: 1000,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  win.webContents.on('console-message', e => { if (e.level === 'error') console.error(e.message); });
  const run = (fn, ...args) => win.webContents.executeJavaScript('(' + fn + ')(' + args.map(a => JSON.stringify(a)).join(',') + ')');
  const check = (name, value) => { assert.ok(value, name); checks.push(name); };
  const media = value => win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',
    { features: [{ name: 'prefers-reduced-motion', value }] });
  try {
    stage = 'initial blank page'; await win.loadURL('about:blank');
    stage = 'debugger';
    win.webContents.debugger.attach('1.3');
    await win.webContents.debugger.sendCommand('Page.enable');
    stage = 'motion preference';
    await media('no-preference');
    // Observe the actual first show and pause only its entrance, before hydration
    // can finish it. The game clock and all other presentation keep running.
    stage = 'cold observer';
    await win.webContents.debugger.sendCommand('Page.addScriptToEvaluateOnNewDocument', { source: `
      const coldObserver = new MutationObserver(() => {
        const root = document.querySelector('#start-menu:not(.hidden):has(> .front-screen)');
        if (!root || !document.documentElement.hasAttribute('data-interface-theme')) return;
        window.frontColdAnimations = [root, document.querySelector('#front-backdrop')].map(el =>
          el?.getAnimations().find(a => a.animationName === 'interface-arrive'));
        frontColdAnimations.forEach(a => { if (a) { a.pause(); a.currentTime = 0; } });
        coldObserver.disconnect();
      });
      coldObserver.observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['class','data-interface-theme'] });
    ` });
    stage = 'load'; await win.loadURL(server.url);
    stage = 'hydration';
    await run(async () => {
      for (let i = 0; !window.__game && i < 200; i++) await new Promise(r => setTimeout(r, 50));
      await __game.hydrated();
      Object.defineProperty(navigator, 'getGamepads', { value: () => [] });
      window.frontEntrance = selector => document.querySelector(selector).getAnimations().find(a => a.animationName === 'interface-arrive');
      window.frontRoot = document.querySelector('#start-menu');
      window.frontBackground = document.querySelector('#front-backdrop');
      window.frontInitial = window.frontColdAnimations?.[0];
      window.frontSceneInitial = window.frontColdAnimations?.[1];
      window.frontReturn = () => { const h = __game.ui.startHandlers; __game.ui.showStartMenu(h.onStart, h.onContinue, h.onCoop, h.onRoster); };
    });
    stage = 'entrance assertions';
    check('Cold boot fades the actual title root and backdrop', await run(() =>
      !!frontInitial && !!frontSceneInitial && !!frontRoot.querySelector('.front-screen') && !frontRoot.classList.contains('hidden')));
    check('Both layers use the shared configurable opacity entrance', await run(() =>
      [frontInitial, frontSceneInitial].every(a => {
        const frames = a.effect.getKeyframes(), duration = a.effect.getTiming().duration;
        const time = getComputedStyle(frontRoot).getPropertyValue('--inv-enter-ms').trim();
        const token = parseFloat(time) * (time.endsWith('ms') ? 1 : 1000);
        a.pause(); a.currentTime = duration / 2;
        const opacity = +getComputedStyle(a.effect.target).opacity;
        return +frames[0].opacity === 0 && +frames.at(-1).opacity === 1 && opacity > 0 && opacity < 1 && duration === token;
      })));
    await run(() => document.querySelector('.front-landscape').decode());
    win.webContents.invalidate(); await new Promise(resolve => setTimeout(resolve, 180));
    fs.writeFileSync(path.join(dir, 'front-entrance-midpoint.png'), (await win.webContents.capturePage()).toPNG());
    check('Hydration and notice refreshes preserve the running entrance', await run(() => {
      const time = frontInitial.currentTime;
      __game.ui.setContinueSave({ classId: 'warrior', name: 'Entrance check', level: 1, modeId: 'mortal' });
      __game.ui.setStartMenuNotice('Entrance check');
      return frontInitial === frontEntrance('#start-menu') && frontSceneInitial === frontEntrance('#front-backdrop') && frontInitial.currentTime === time;
    }));
    await run(() => document.querySelector('#sm-keys').click());
    check('Navigation remains immediate and cancels the old title fade', await run(() =>
      !!document.querySelector('.options-body') && frontInitial.playState === 'idle' && !frontEntrance('#start-menu')));
    check('Moving into Options keeps the same backdrop entrance', await run(() => frontSceneInitial === frontEntrance('#front-backdrop')));
    await run(() => document.querySelector('#start-menu #esc-back').click());
    check('Returning from Options fades the title without restarting the scene', await run(() =>
      !!frontEntrance('#start-menu') && frontEntrance('#start-menu') !== frontInitial && !frontEntrance('#front-backdrop')));
    await run(() => {
      frontEntrance('#start-menu').finish();
      __game.ui.setStartMenuNotice('Updated after the entrance');
    });
    check('A settled menu stays steady during background refreshes', await run(() => !frontEntrance('#start-menu') && !frontEntrance('#front-backdrop')));
    for (const [entry, back] of [['#sm-chronicle','#chron-close'],['#sm-codex','[data-cx-back]']]) {
      await run(s => document.querySelector(s).click(), entry);
      await run(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await run(s => document.querySelector(s).click(), back);
      check(entry + ' returns through the shared title fade with a steady backdrop', await run(() =>
        !!frontEntrance('#start-menu') && !frontEntrance('#front-backdrop')));
      await run(() => frontEntrance('#start-menu').finish());
    }
    await run(() => { __game.ui.hideAll(); getComputedStyle(frontBackground).display; document.documentElement.style.setProperty('--inv-enter-ms', '640ms'); frontReturn(); });
    check('Re-entry fades both layers using the configured duration', await run(() =>
      ['#start-menu','#front-backdrop'].every(s => frontEntrance(s)?.effect.getTiming().duration === 640)));
    await media('reduce');
    check('Reduced motion immediately removes both entrances', await run(() =>
      ['#start-menu','#front-backdrop'].every(s => !frontEntrance(s) && getComputedStyle(document.querySelector(s)).opacity === '1')));
    await run(() => { __game.ui.hideAll(); getComputedStyle(frontBackground).display; frontReturn(); });
    check('Reduced-motion re-entry remains still and usable', await run(() =>
      !frontEntrance('#start-menu') && !frontEntrance('#front-backdrop') && !document.querySelector('#sm-start').disabled));
    check('No fatal game error', await run(() => __game.crash().fatal === null));
    fs.writeFileSync(path.join(dir, 'front-entrance-ui.json'), JSON.stringify({ checks }, null, 2));
    console.log('FRONT ENTRANCE OK: ' + checks.length + ' checks');
  } catch (error) {
    console.error(error);
    console.error(await run(() => ({ coldCaptured: !!window.frontColdAnimations,
      coldAnimations: window.frontColdAnimations?.map(a => a ? a.playState : null),
      roots: ['#start-menu','#front-backdrop'].map(s => {
        const el = document.querySelector(s); if (!el) return { selector:s, missing:true };
        const style = getComputedStyle(el);
        return { selector:s, className:el.className, display:style.display, animation:style.animationName,
          animations:el.getAnimations().map(a => ({ name:a.animationName, state:a.playState })),
          front:!!el.querySelector('.front-screen'), reduced:matchMedia('(prefers-reduced-motion: reduce)').matches };
      }) })).catch(() => null));
    process.exitCode = 1;
  }
  finally { clearTimeout(timer); win.destroy(); server.server.close(); app.exit(process.exitCode || 0); }
});
