// Real menu/portal layout, visibility and settings. Run after npm run build:
// npx electron balance/portal-button-ui.cjs
// Hidden window, isolated saves and browser profile.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports');
fs.mkdirSync(dir, { recursive: true });
app.setPath('userData', path.join(dir, `portal-button-profile-${process.pid}`));
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const timer = setTimeout(() => { console.error('Portal button UI timed out'); app.exit(1); }, 55000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'),
    savesDir: path.join(dir, `portal-button-saves-${process.pid}`) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 900,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  const run = async source => {
    const result = await win.webContents.executeJavaScript(`(() => { try { return { value: (${source})() }; }
      catch (e) { return { error: e.stack }; } })()`);
    if (result.error) throw Error(result.error);
    return result.value;
  };
  try {
    await win.loadURL(server.url);
    await new Promise(resolve => setTimeout(resolve, 1200));
    await run(function () {
      Object.defineProperty(navigator, 'getGamepads', { value: () => [] });
      __game.account().ledger.prologue_lived = 1;
      __game.account().ledger.mireille_flasks_filled = 1;
      __game.devStartRun('warrior'); __game.ui.hideAll();
      __game.world().update = () => {};
      window.portalChecks = [];
      window.checkPortal = (name, ok) => { if (!ok) throw Error(name); portalChecks.push(name); };
      const s = __game.settings();
      checkPortal('fresh defaults: beside bar, beside menu, always visible', s.menuBar.anchor === 'bar'
        && s.portalButton.anchor === 'beside' && s.portalButton.visibility === 'always');
    }.toString());
    for (const [width, height] of [[1400, 900], [1000, 720]]) {
      win.setContentSize(width, height);
      await new Promise(resolve => setTimeout(resolve, 150));
      await run(function () {
        const ui = __game.ui, s = __game.settings(), portal = document.getElementById('town-portal-button');
        const button = document.querySelector('[data-menu-toggle]');
        const sync = () => { ui.menuBarSync(1, true); ui.menuBarSync(0, true); };
        const shown = () => portal.getBoundingClientRect().width > 0;
        const separate = (a, b) => a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
        for (const anchor of ['bar', 'left', 'right']) for (const dock of [false, true]) {
          ui.hideAll(); s.menuBar.anchor = anchor; s.menuBar.dock = dock;
          s.portalButton.anchor = 'beside'; s.portalButton.visibility = 'always'; sync();
          ui.toggleMenu(); sync();
          const p = portal.getBoundingClientRect(), b = button.getBoundingClientRect();
          const label = innerWidth + 'px ' + anchor + (dock ? ' with page icons' : '');
          checkPortal(label + ': portal and Menu are adjacent', separate(p, b)
            && Math.abs(p.bottom - b.bottom) < 2 && (anchor === 'right' ? p.right < b.left : p.left > b.right));
          checkPortal(label + ': portal fits viewport', p.left >= 0 && p.right <= innerWidth && p.top >= 0 && p.bottom <= innerHeight);
          const tray = document.querySelector('.menu-tray').getBoundingClientRect();
          checkPortal(label + ': full menu tray fits viewport', tray.left >= 0 && tray.right <= innerWidth);
          checkPortal(label + ': tray and page icons do not cover portal',
            separate(p, document.querySelector('.menu-tray').getBoundingClientRect())
            && [...document.querySelectorAll('.menu-dock .menu-tile')].every(el => separate(p, el.getBoundingClientRect()))
            && portal.contains(document.elementFromPoint(p.x + p.width / 2, p.y + p.height / 2)));
          ui.menuTrayClose(); ui.toggleInventory(); sync();
          checkPortal(label + ': portal remains visible over inventory', shown());
          s.portalButton.visibility = 'menusClosed'; sync();
          checkPortal(label + ': legacy mode hides with inventory', !shown());
          ui.toggleInventory(); sync();
          checkPortal(label + ': legacy mode returns after closing inventory', shown());
          ui.toggleMenu(); sync();
          checkPortal(label + ': legacy mode hides with menu tray', !shown());
          ui.menuTrayClose(); s.portalButton.visibility = 'hidden'; sync();
          checkPortal(label + ': hidden mode stays hidden without panels', !shown());
          ui.toggleInventory(); sync();
          checkPortal(label + ': hidden mode stays hidden with panels', !shown());
        }
        ui.hideAll(); s.menuBar.anchor = 'bar'; s.menuBar.dock = false;
        s.portalButton.anchor = 'beside'; s.portalButton.visibility = 'always'; sync();
        // A moved bar carries its adjacent control without a second saved seat.
        const root = ui.menuBar.root, oldLeft = root.style.left;
        const before = portal.getBoundingClientRect().left;
        root.style.left = (parseFloat(oldLeft) + 30) + 'px';
        checkPortal(innerWidth + 'px: portal follows a moved menu', Math.abs(portal.getBoundingClientRect().left - before - 30) < 1);
        root.style.left = oldLeft;
        const cluster = ui.menuBar.host.hudCluster;
        ui.menuBar.host.hudCluster = () => null; sync();
        checkPortal(innerWidth + 'px: a veiled HUD keeps its menu and portal on screen',
          button.getBoundingClientRect().left >= 0 && portal.getBoundingClientRect().right <= innerWidth);
        ui.menuBar.host.hudCluster = cluster;
        for (const anchor of ['menu', 'right', 'beside']) {
          s.portalButton.anchor = anchor; sync();
          checkPortal(innerWidth + 'px: alternate portal seat ' + anchor + ' remains visible', shown());
          if (anchor === 'menu') checkPortal('Above the Menu retains its position', portal.getBoundingClientRect().bottom < button.getBoundingClientRect().top);
        }
        // Availability remains the world's shared refusal, independent of visibility.
        checkPortal('town refusal disables a visible button', shown() && portal.disabled && !!__game.world().townPortalRefusal());
        ui.menuBarSync(0, false);
        checkPortal('no live run hides the portal even in Always Show', !shown());
        sync(); ui.toggleMenu(); sync();
      }.toString());
      await new Promise(resolve => setTimeout(resolve, 150));
      fs.writeFileSync(path.join(dir, `portal-button-${width}.png`), (await win.webContents.capturePage()).toPNG());
    }
    await run(function () {
      const ui = __game.ui, s = __game.settings(); ui.hideAll(); ui.showEscapeMenu();
      document.querySelector('#esc-keys').click();
      document.querySelector('[data-opttab="interface"]').click();
      for (const mode of ['menusClosed', 'hidden', 'always']) {
        document.querySelector('#opt-portalvisibility').click();
        checkPortal('Options selects ' + mode, s.portalButton.visibility === mode);
      }
      for (const anchor of ['menu', 'right', 'beside']) {
        document.querySelector('#opt-portalanchor').click();
        checkPortal('Options selects portal seat ' + anchor, s.portalButton.anchor === anchor);
      }
      // Exercise the real scale control; adjacent buttons scale together.
      const slider = document.querySelector('#opt-uiscale');
      slider.value = '150'; slider.dispatchEvent(new Event('input', { bubbles: true }));
      ui.hideEscapeMenu(); ui.menuBarSync(1, true);
      const p = document.getElementById('town-portal-button').getBoundingClientRect();
      const b = document.querySelector('[data-menu-toggle]').getBoundingClientRect();
      checkPortal('150% scale preserves adjacency and scales the portal', Math.abs(p.width - 63) < 1 && p.left > b.right);
      // Save a non-default choice through Options, then verify the disk reload.
      ui.showEscapeMenu(); document.querySelector('#esc-keys').click();
      document.querySelector('[data-opttab="interface"]').click();
      document.querySelector('#opt-portalvisibility').click();
      document.querySelector('#opt-portalvisibility').click();
      document.querySelector('#opt-portalanchor').click();
      __game.saveSettings();
    }.toString());
    const checks = await run(() => portalChecks);
    await new Promise(resolve => setTimeout(resolve, 600));
    await win.reload();
    await new Promise(resolve => setTimeout(resolve, 1400));
    const restored = await run(() => __game.settings().portalButton);
    if (restored.visibility !== 'hidden' || restored.anchor !== 'menu') throw Error('Portal choices did not survive reload');
    checks.push('portal visibility and anchor survive disk reload');
    fs.writeFileSync(path.join(dir, 'portal-button-ui.json'), JSON.stringify(checks, null, 2));
    console.log(`PASS portal button: ${checks.length} checks, two viewports, all menu seats, page icons, visibility modes, options, scaling and reload`);
  } finally { clearTimeout(timer); win.destroy(); server.server.close(); app.quit(); }
}).catch(e => { console.error(e?.stack ?? String(e)); app.exit(1); });
