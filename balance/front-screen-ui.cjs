// Real built-client front-door acceptance. No personal saves or shared profile.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const reports = path.join(__dirname, 'reports');
fs.mkdirSync(reports, { recursive: true });
app.setPath('userData', path.join(reports, 'front-screen-profile-' + process.pid));
app.disableHardwareAcceleration();
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  const server = await startGameServer({
    root: path.resolve(__dirname, '..', process.env.HOLLOW_WAKE_QA_DIST || 'dist'),
    savesDir: path.join(reports, 'front-screen-saves-' + process.pid),
  });
  const win = new BrowserWindow({ show: false, width: 1600, height: 1000,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  const report = { checks: [], errors: [], images: [] };
  win.webContents.on('console-message', e => { if (e.level === 'error') report.errors.push(e.message); });
  const run = (fn, ...args) => win.webContents.executeJavaScript('(' + fn + ')(' + args.map(v => JSON.stringify(v)).join(',') + ')');
  const click = async sel => { await run(s => { document.querySelector(s).click(); }, sel); await pause(100); };
  const shot = async name => {
    await pause(180); win.webContents.invalidate(); await pause(100);
    const file = path.join(reports, 'front-screen-' + name + '.png');
    fs.writeFileSync(file, (await win.webContents.capturePage()).toPNG()); report.images.push(file);
  };
  const save = () => fs.writeFileSync(path.join(reports, 'front-screen-ui.json'), JSON.stringify(report, null, 2));
  const timer = setTimeout(() => { save(); app.exit(1); }, 180000);
  try {
    await win.loadURL(server.url);
    await run(async () => {
      for (let i = 0; !window.__game && i < 200; i++) await new Promise(r => setTimeout(r, 100));
      if (!window.__game) throw Error('Game failed to boot');
      await __game.hydrated();
      Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [] });
      const ui = __game.ui;
      window.__frontQA = { handlers: ui.startHandlers, begin: ui.onBeginRun, account: structuredClone(__game.account()), action: '' };
      ui.onBeginRun = () => { __frontQA.action = 'begin'; };
      window.__frontShow = () => ui.showStartMenu(
        () => { __frontQA.action = 'start'; }, s => { __frontQA.action = 'continue:' + s.name; },
        () => { __frontQA.action = 'coop'; }, e => { __frontQA.action = 'roster:' + e.name; });
      __frontShow();
      const image = new Image();
      image.src = getComputedStyle(document.querySelector('.front-landscape')).backgroundImage.slice(5, -2);
      await image.decode();
    });
    await pause(250);
    assert.deepEqual(await run(() => ({
      begin: document.querySelector('.front-primary').id,
      locked: document.querySelector('#sm-continue').disabled,
      vault: !!document.querySelector('#sm-vault'),
      vessels: !!document.querySelector('#sm-immortals'),
    })), { begin: 'sm-start', locked: true, vault: false, vessels: false });
    await shot('fresh-1600');
    report.checks.push('Fresh account gates and original artwork load');
    // Real keyboard input: skip the disabled Continue and invoke Options with Enter.
    await run(() => document.querySelector('#sm-start').focus());
    win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Tab' });
    win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Tab' });
    await pause(80);
    assert.equal(await run(() => document.activeElement.id), 'sm-chronicle');
    await run(() => document.querySelector('#sm-start').focus());
    for (let i = 0; i < 2; i++) {
      win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Down' });
      win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Down' });
    }
    await pause(80);
    assert.equal(await run(() => document.activeElement.id), 'sm-keys');
    win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Return' });
    win.webContents.sendInputEvent({ type: 'char', keyCode: '\r' });
    win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Return' });
    await pause(150);
    assert(await run(() => !!document.querySelector('#start-menu .options-body')));
    await run(() => __game.ui.setContinueSave({ classId: 'warrior', name: 'Returning soul', level: 12, modeId: 'mortal' }));
    assert(await run(() => !!document.querySelector('#start-menu .options-body')));
    await shot('options');
    await click('#start-menu #esc-back');
    assert.equal(await run(() => document.querySelector('.front-primary').id), 'sm-continue');
    await run(() => {
      document.querySelector('#sm-chronicle').focus();
      __game.ui.setStartMenuNotice('A saved journey was restored.');
    });
    await pause(60);
    assert.equal(await run(() => document.activeElement.id), 'sm-chronicle');
    report.checks.push('Keyboard navigation, activation, Options hydration isolation and focus preservation');
    await click('#front-motion');
    assert.equal(await run(() => getComputedStyle(document.querySelector('.front-haze')).animationPlayState), 'paused');
    await click('#sm-coop');
    assert.equal(await run(() => __frontQA.action), 'coop');
    await click('#sm-continue');
    assert.equal(await run(() => __frontQA.action), 'continue:Returning soul');
    assert.equal(await run(() => getComputedStyle(document.querySelector('#front-backdrop')).display), 'none');
    await run(() => __frontShow());
    assert.equal(await run(() => document.querySelector('#front-motion').getAttribute('aria-pressed')), 'true');
    await click('#sm-start');
    assert.equal(await run(() => __frontQA.action), 'begin');
    report.checks.push('Begin, Continue and co-op dispatch; atmosphere pauses, survives refresh and hides during play');
    await run(() => {
      const a = __game.account(); a.level = 24; a.ledger.prologue_lived = 1; a.ledger.account_deaths = 1;
      a.credits = 120;
      a.roster = [{ charId: 'qa-living', name: 'Aster', classId: 'warrior', level: 18, modeId: 'immortal', stage: 1, slot: 101, savedAt: 0 },
        { charId: 'qa-fallen', name: 'The Fallen', classId: 'warrior', level: 11, modeId: 'immortal', stage: 1, slot: 102, savedAt: 0, fallen: { fee: 60, level: 11, at: 0 } }];
      __game.ui.setContinueSave({ classId: 'warrior', name: 'Aster of the Hollow', level: 18, modeId: 'mortal' });
      __frontShow();
    });
    assert(await run(() => !!document.querySelector('#sm-vault') && document.querySelector('#sm-immortals').textContent.includes('fallen')));
    await shot('returning-1600');
    await click('#sm-immortals');
    await click('[data-cid="qa-fallen"].sm-roster-go');
    assert(await run(() => document.querySelector('#start-menu').textContent.includes('resurrect')));
    await click('[data-cid="qa-living"].sm-roster-go');
    assert.equal(await run(() => __frontQA.action), 'roster:Aster');
    await run(() => __frontShow());
    await click('#sm-vault');
    assert(await run(() => !document.querySelector('#account-screen').classList.contains('hidden')));
    await click('#acct-close');
    if (await run(() => !!document.querySelector('#seal-go'))) await click('#seal-go');
    assert(await run(() => !!document.querySelector('#start-menu:not(.hidden) .front-screen')));
    await click('#sm-chronicle');
    assert(await run(() => !document.querySelector('#account-screen').classList.contains('hidden')));
    await click('#chron-close');
    report.checks.push('Veteran gates, fallen vessel protection, roster resume, Vault and Chronicle routes');

    // Responsive widths AND the existing accessibility scale, with all destinations shown.
    for (const [width, height, scale] of [[1920,1080,1], [1280,720,1], [800,600,1], [390,844,1], [320,568,1], [1280,720,2], [390,844,2], [1280,720,.75]]) {
      win.setContentSize(width, height);
      await run(s => { document.documentElement.style.setProperty('--ui-scale', String(s)); document.querySelector('#start-menu').scrollTop = 0; }, scale);
      await pause(180);
      const bounds = await run(() => {
        const root = document.querySelector('#start-menu'), r = root.getBoundingClientRect();
        return { width: r.width, height: r.height, viewport: innerWidth, horizontal: root.scrollWidth <= root.clientWidth + 1, vertical: root.scrollHeight <= root.clientHeight + 1 };
      });
      if (width >= 800 && height >= 600 && scale === 1) assert(bounds.vertical, 'Standard desktop menu must fit without scrolling: ' + [width, height]);
      assert(bounds.horizontal, JSON.stringify({ width, height, scale, bounds }));
      assert(Math.abs(bounds.width - width) < 2 && Math.abs(bounds.height - height) < 2);
      const reachable = await run(() => {
        const b = document.querySelector('#sm-exit'); b.scrollIntoView({ block: 'nearest' });
        const r = b.getBoundingClientRect();
        return { ok: r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight + 1
          && b.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)),
          rect: r.toJSON(), viewport: [innerWidth,innerHeight],
          covering: document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.outerHTML.slice(0,300) };
      });
      assert(reachable.ok, 'Exit must remain reachable at ' + [width, height, scale] + ': ' + JSON.stringify(reachable));
      await run(() => { document.querySelector('#start-menu').scrollTop = 0; });
      await shot(width + '-' + height + '-scale-' + scale);
    }
    report.checks.push('Responsive layout, reachable actions and no horizontal overflow at eight viewport/scale combinations');
    win.setContentSize(1280,720);
    await run(() => {
      document.documentElement.style.setProperty('--ui-scale', '1');
      const hostile = '<img src=x onerror="window.__injected=1">';
      __game.ui.setContinueSave({ classId:'warrior', name:hostile.repeat(8), level:99 });
      __game.ui.setStartMenuNotice(hostile);
    });
    assert(await run(() => !window.__injected && !document.querySelector('.front-screen img') && document.querySelector('.front-memory').textContent.includes('<img')));
    report.checks.push('Player names and boot notices remain text, including long hostile content');
    // Poll the real controller input and click through the existing virtual pointer.
    const pad = await run(() => {
      __game.fakePad({ axes: [.7,0,0,0], buttons: Array(17).fill(0) }); __game.step(2);
      const pointer=__game.padPointer(), button=document.querySelector('#sm-coop'), r=button.getBoundingClientRect();
      pointer.place(r.x+r.width/2,r.y+r.height/2);
      const buttons=Array(17).fill(0); buttons[0]=1;
      __game.fakePad({ axes:[0,0,0,0], buttons }); __game.step(2);
      __game.fakePad({ axes:[0,0,0,0], buttons:Array(17).fill(0) }); __game.step(2);
      const active=pointer.active; __game.fakePad(null); pointer.retire(); return active;
    });
    assert(pad, 'Controller pointer must activate over the front screen');
    assert.equal(await run(() => __frontQA.action), 'coop');
    report.checks.push('Controller pointer selects the existing co-op action');
    // Browser-close fallback returns to the same menu without a trapped full-screen state.
    await run(() => { window.close = () => {}; });
    await click('#sm-exit');
    assert(await run(() => !!document.querySelector('#sm-exit-back')));
    await click('#sm-exit-back');
    // Electron versions differ in whether the nativeTheme test setter drives media;
    // CDP explicitly emulates the user preference for this regression.
    win.webContents.debugger.attach('1.3');
    await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { features:[{name:'prefers-reduced-motion',value:'reduce'}] });
    await pause(80);
    assert.equal(await run(() => getComputedStyle(document.querySelector('.front-haze')).animationName), 'none');
    assert.equal(await run(() => document.querySelector('#front-motion').disabled), true);
    await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', { features:[{name:'prefers-reduced-motion',value:'no-preference'}] });
    await pause(80);
    assert.equal(await run(() => document.querySelector('#front-motion').disabled), false);
    win.webContents.debugger.detach();
    report.checks.push('Browser exit fallback and operating-system reduced motion');

    // Finally walk the actual first-account entry, not a callback stand-in.
    await run(() => {
      const a = __game.account();
      for (const key of Object.keys(a)) delete a[key];
      Object.assign(a, __frontQA.account);
      const ui = __game.ui, h = __frontQA.handlers;
      ui.onBeginRun = __frontQA.begin; ui.setContinueSave(null);
      ui.showStartMenu(h.onStart, h.onContinue, h.onCoop, h.onRoster);
    });
    await click('#sm-start');
    const entered = await run(async () => {
      for (let i=0; __game.loading.active && i<800; i++) await new Promise(r=>setTimeout(r,25));
      __game.step(2);
      return { hidden: document.querySelector('#start-menu').classList.contains('hidden'),
        scene: __game.world().scene?.def?.id ?? __game.world().scene?.id ?? !!__game.world().scene,
        loading: __game.loading.active, fatal: __game.crash().fatal };
    });
    assert(entered.hidden && entered.scene && !entered.loading && !entered.fatal, JSON.stringify(entered));
    assert.equal(await run(() => getComputedStyle(document.querySelector('#front-backdrop')).display), 'none');
    report.checks.push('Real Begin enters the account tutorial with no front-screen overlay');
    await win.loadURL(server.url + '?dev=forges');
    await run(async () => {
      for(let i=0; !window.__game && i<200; i++) await new Promise(r=>setTimeout(r,100));
      if (!window.__game) throw Error('Developer game failed to boot');
      await __game.hydrated();
    });
    assert(await run(() => !!document.querySelector('.front-dev #sm-forge') && !!document.querySelector('.front-dev #sm-glyph-forge')));
    report.checks.push('Developer forge hooks remain available in their own menu slot');
    assert.deepEqual(report.errors, []);
    console.log('FRONT SCREEN OK:', report.checks.join('; '));
    save(); clearTimeout(timer); server.server.close(); win.destroy(); app.exit(0);
  } catch (error) {
    await shot('failure'); report.errors.push(error.stack || String(error)); save(); console.error(error);
    clearTimeout(timer); server.server.close(); app.exit(1);
  }
});
