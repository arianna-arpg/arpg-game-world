// Real in-game navigation, isolated account/profile. Branding must not alter pause or return flows.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const out = path.join(__dirname, 'reports');
fs.mkdirSync(out, { recursive: true });
app.setPath('userData', path.join(out, 'in-game-brand-profile-' + process.pid));
app.disableHardwareAcceleration();
const pause = ms => new Promise(r => setTimeout(r, ms));
app.whenReady().then(async () => {
  const server = await startGameServer({ root: path.resolve(__dirname, '..', process.env.HOLLOW_WAKE_QA_DIST || 'dist'),
    savesDir: path.join(out, 'in-game-brand-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1280, height: 850, useContentSize: true,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  const run = (fn, ...args) => win.webContents.executeJavaScript('(' + fn + ')(' + args.map(v => JSON.stringify(v)).join(',') + ')');
  const click = sel => run(s => { const el = document.querySelector(s); if (!el) throw Error('Missing ' + s); el.click(); }, sel);
  const shot = async name => { win.webContents.invalidate(); await pause(150); fs.writeFileSync(path.join(out, 'in-game-brand-' + name + '.png'), (await win.webContents.capturePage()).toPNG()); };
  const logo = async (root = '#escape-menu') => {
    const data = await run(async sel => {
      const panel = document.querySelector(sel);
      const images = [...panel.querySelectorAll('.hw-brand')].filter(i => i.getBoundingClientRect().height > 0);
      await Promise.all(images.map(i => i.decode()));
      const image = images[0], r = image?.getBoundingClientRect();
      const h = panel.querySelector('h1');
      return { count: images.length, alt: image?.alt, loaded: !!image?.naturalWidth, src: image?.getAttribute('src'),
        fits: !!r && r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight,
        aboveTitle: !h || r.bottom <= h.getBoundingClientRect().top + 1,
        entranceHidden: getComputedStyle(document.querySelector('#front-backdrop')).display === 'none' };
    }, root);
    assert.equal(data.count, 1, 'one visible shared logo: ' + root);
    assert.equal(data.alt, 'Hollow Wake');
    assert.ok(data.loaded && data.fits && data.aboveTitle && data.entranceHidden, JSON.stringify(data));
    return data.src;
  };
  const reachable = sel => run(s => {
    const el = document.querySelector(s); el.scrollIntoView({ block: 'nearest' });
    const r = el.getBoundingClientRect();
    return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
  }, sel);
  const timer = setTimeout(() => app.exit(1), 150000);
  try {
    await win.loadURL(server.url);
    await run(async () => {
      for (let i = 0; !window.__game && i < 200; i++) await new Promise(r => setTimeout(r, 50));
      await __game.hydrated();
      Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [] });
      window.requestAnimationFrame = () => 0;
      await new Promise(r => setTimeout(r, 100));
      __game.account().ledger.prologue_lived = 1;
      __game.devStartRun('magician'); __game.ui.hideAll(); __game.step(3);
    });
    let source;
    for (const [width, height, scale] of [[1280,850,1], [800,600,1], [390,844,1], [1280,720,2]]) {
      win.setContentSize(width, height); await pause(100);
      await run(s => { document.documentElement.style.setProperty('--ui-scale', String(s)); __game.ui.showEscapeMenu(); document.querySelector('#escape-menu').scrollTop = 0; }, scale);
      const current = await logo(); source ??= current; assert.equal(current, source);
      assert(await run(() => { const w=__game.world(), t=w.time; __game.step(3); return __game.ui.escapeMenuOpen && w.time===t; }), 'solo pause still holds time');
      if (width === 1280 && scale === 1) await shot('pause');
      if (width === 390) await shot('pause-mobile');
      assert(await reachable('#esc-resume'), 'Resume remains reachable');
      await click('#esc-keys');
      for (const tab of ['controls','controller','interface','visuals']) {
        await click('[data-opttab="' + tab + '"]'); assert.equal(await logo(), source);
        assert(await reachable('#esc-back'), 'Options Back remains reachable');
      }
      if (width === 1280 && scale === 1) await shot('options');
      await click('#esc-back'); await logo();
      await run(() => __game.ui.refreshEscapeCouchRow()); await logo();
      await click('#esc-codex'); await logo(); await click('[data-cx-back]'); await logo();
      await click('#esc-resume');
      assert(await run(() => { const w=__game.world(), t=w.time; __game.step(3); return !__game.ui.escapeMenuOpen && w.time>t; }), 'Resume releases the hold');
    }
    win.setContentSize(1280,850);
    await run(() => { document.documentElement.style.setProperty('--ui-scale','1'); __game.ui.showWardrobe(); });
    await logo(); await shot('wardrobe');
    await click('[data-wd-owned]'); await logo();
    await click('[data-wd-back]');
    assert(await run(() => !__game.ui.escapeMenuOpen), 'Wardrobe returns to play');
    await run(() => { __game.ui.showEscapeMenu(); window.close = () => {}; });
    await click('#esc-close'); await logo(); await click('#esc-back2'); await logo(); await click('#esc-resume');
    await run(() => { __game.step(2); __game.ui.toggleMenu(); });
    assert.equal(await logo('.menu-tray'), source); await shot('tray');
    await click('[data-stations-toggle]'); await logo('.menu-tray');
    assert(await reachable('[data-menu-entry="pause"]'), 'Menu tray Pause remains reachable');
    await click('[data-menu-entry="pause"]'); await logo();
    assert(await run(() => document.querySelector('.menu-tray').classList.contains('hidden')), 'Selecting Pause closes the tray');
    await click('#esc-resume');
    console.log('IN-GAME BRAND OK: pause/time/resume, all Options tabs, live pause refresh, Codex return, Wardrobe refresh, close fallback, Menu tray and stations; logo fits across four viewport/scale combinations.');
  } catch (e) { console.error(e.stack || e); await shot('failure'); process.exitCode = 1; }
  finally { clearTimeout(timer); win.destroy(); server.server.close(); app.exit(process.exitCode || 0); }
});
