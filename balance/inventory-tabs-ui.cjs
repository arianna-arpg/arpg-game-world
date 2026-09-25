// Inventory drawer selection through real panels. Run after npm run build:
// npx electron balance/inventory-tabs-ui.cjs
// Hidden window and isolated saves/profile; no changes to the player's run.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports');
fs.mkdirSync(dir, { recursive: true });
app.setPath('userData', path.join(dir, `inventory-tabs-profile-${process.pid}`));
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const timer = setTimeout(() => { console.error('Inventory tabs timed out'); app.exit(1); }, 55000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'),
    savesDir: path.join(dir, `inventory-tabs-saves-${process.pid}`) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  try {
    await win.loadURL(server.url);
    await new Promise(resolve => setTimeout(resolve, 1200));
    const checks = await win.webContents.executeJavaScript(`(() => { try { return (${function () {
      Object.defineProperty(navigator, 'getGamepads', { value: () => [] });
      __game.account().ledger.prologue_lived = 1;
      __game.account().ledger.mireille_flasks_filled = 1;
      __game.devStartRun('warrior');
      const ui = __game.ui, w = __game.world(), checks = [];
      w.update = () => {};
      w.account.features.add('reliquary');
      ui.hideAll(); ui.toggleInventory(); ui.folioSync();
      const bag = document.getElementById('inventory');
      const click = selector => {
        const el = document.querySelector(selector);
        if (!el) throw Error('Missing control: ' + selector);
        el.click(); ui.folioSync();
      };
      const check = (name, ok) => { if (!ok) throw Error(name); checks.push(name); };
      const selected = id => {
        const el = document.getElementById(id === 'skills' ? 'skills-panel' : 'container-panel-reliquary');
        return ui.folio.bookFor(id)?.front === id && el.getBoundingClientRect().width > 0
          && document.querySelector('[data-folio-tab="' + id + '"]')?.getAttribute('aria-selected') === 'true';
      };
      click('[data-containerflap="reliquary"]');
      click('[data-buildflap]');
      check('Reliquary then Skills selects Skills', selected('skills'));
      const closes = {
        toggle: () => ui.toggleInventory(),
        glyph: () => bag.querySelector('[data-panel-x]').click(),
        sweep: () => ui.escapeSweep(w.localSeat.id, []),
        hideAll: () => ui.hideAll(),
      };
      for (const [route, close] of Object.entries(closes)) {
        for (const id of ['skills', 'container:reliquary']) {
          click('[data-folio-tab="' + id + '"]');
          close(); ui.folioSync();
          check(route + ' hides both drawers', !ui.inventoryOpen
            && document.getElementById('skills-panel').getBoundingClientRect().width === 0
            && document.getElementById('container-panel-reliquary').getBoundingClientRect().width === 0);
          ui.toggleInventory(); ui.folioSync();
          check(route + ' restores ' + id, selected(id));
        }
      }
      click('[data-buildflap]'); // bring the shelved Skills drawer forward
      ui.folioCycle(1);
      const cycled = ui.folio.bookFor('skills').front;
      ui.toggleInventory(); ui.folioSync(); ui.toggleInventory(); ui.folioSync();
      check('tab cycling is remembered', selected(cycled));
      click('[data-folio-tab="skills"]');
      ui.toggleInventory(); ui.folioSync();
      ui.menuVerbs()['container:reliquary'].open(); ui.folioSync();
      check('explicit menu choice overrides remembered Skills', selected('container:reliquary'));
      click('[data-passiveflap]');
      ui.toggleInventory(); ui.folioSync(); ui.toggleInventory(); ui.folioSync();
      check('recalled drawers preserve a standing passive tree', ui.folio.bookFor('passives')?.front === 'passives');
      ui.closeTree(); ui.folioSync();
      click('[data-folio-tab="skills"]');
      click('#skills-panel [data-panel-x]');
      ui.toggleInventory(); ui.folioSync(); ui.toggleInventory(); ui.folioSync();
      check('closing a drawer explicitly does not reopen it', !ui.buildFlapOpen
        && ui.folio.bookFor('container:reliquary')?.front === 'container:reliquary');
      ui.hideAll();
      return checks;
    }.toString()})(); } catch (error) { return { error: error.stack }; } })()`);
    if (checks.error) throw Error(checks.error);
    fs.writeFileSync(path.join(dir, 'inventory-tabs-ui.json'), JSON.stringify(checks, null, 2));
    for (const name of checks) console.log('PASS ' + name);
  } finally { clearTimeout(timer); win.destroy(); server.server.close(); app.quit(); }
}).catch(e => { console.error(e?.stack ?? String(e)); app.exit(1); });
