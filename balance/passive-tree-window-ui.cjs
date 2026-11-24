// Run with Electron against a built game. Saves and Chromium state are disposable.
const { app, BrowserWindow } = require('electron');
const { strict: assert } = require('node:assert');
const path = require('node:path');
const { startGameServer } = require('../launcher/server.cjs');
const { makeTempDir } = require('../scripts/temp-dir.cjs');

const scratch = makeTempDir('hollow-passive-window-');
app.setPath('userData', path.join(scratch, 'profile'));
app.disableHardwareAcceleration();

async function review() {
  const game = await startGameServer({
    root: path.resolve(__dirname, '..', process.env.HOLLOW_WAKE_QA_DIST || 'dist'),
    savesDir: path.join(scratch, 'saves'),
  });
  const win = new BrowserWindow({ show: false, width: 1360, height: 800,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  const run = (fn, arg) => win.webContents.executeJavaScript(`(${fn})(${JSON.stringify(arg) ?? ''})`);
  const boot = async () => {
    await win.loadURL(game.url);
    await run(async () => {
      await __game.hydrated();
      Object.defineProperty(navigator, 'getGamepads', { value: () => [] });
      __game.account().ledger.prologue_lived = 1;
      __game.devStartRun('warrior');
      __game.hold(true);
      __game.ui.hideAll();
      window.treeQA = {
        ui: __game.ui, seat: __game.world().localSeat,
        el: document.querySelector('#passive-tree'),
        find: sel => document.querySelector('#passive-tree ' + sel),
        click: sel => document.querySelector('#passive-tree ' + sel).click(),
        key(key) {
          for (const type of ['keydown', 'keyup']) {
            (document.activeElement || window).dispatchEvent(new KeyboardEvent(type, { key, bubbles: true }));
            __game.step();
          }
          __game.ui.folioSync();
        },
        center() {
          const b = document.querySelector('#tree-svg').viewBox.baseVal;
          return [b.x + b.width / 2, b.y + b.height / 2];
        },
        windowControlsPlaced() {
          const rect = selector => this.find(selector).getBoundingClientRect();
          const close = rect('[data-panel-x]'), mode = rect('[data-tree-window]');
          const preference = rect('.tree-window-controls label'), browse = rect('.build-tree-tools');
          return mode.width > 0 && preference.width > 0
            && Math.abs(mode.right - close.right) < close.width / 2
            && Math.min(mode.top, preference.top) >= close.bottom - 1
            && mode.top - close.bottom < close.height
            && preference.right <= mode.left
            && (browse.right <= preference.left || browse.top >= Math.max(mode.bottom, preference.bottom));
        },
      };
    });
  };
  const check = async (name, fn) => {
    assert.equal(await run(fn), true, name);
    console.log('PASS', name);
  };
  try {
    await boot();
    await check('Existing default opens docked with Inventory', () => {
      const { ui, key, find } = treeQA;
      key('p');
      return ui.inventoryOpen && ui.treeOpen && !ui.treeFullWindow && !find('[data-tree-window-default]').checked;
    });
    for (const width of [760, 1360]) {
      win.setContentSize(width, 800);
      await check('Window controls sit below Close in the docked pane at ' + width, async () => {
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        treeQA.ui.folioSync();
        return treeQA.windowControlsPlaced();
      });
    }
    await run(() => {
      const { click, find, center } = treeQA;
      click('[data-tz="in"]');
      const search = find('#tree-search');
      search.value = 'life'; search.dispatchEvent(new Event('input'));
      treeQA.dockedCenter = center();
      treeQA.zoom = find('[data-tz="reset"]').textContent;
      click('[data-tree-window]');
    });
    await check('Maximize keeps the camera, search and zoom, and leaves the saved preference alone', () => {
      const { ui, find, center, dockedCenter, zoom } = treeQA;
      return ui.treeFullWindow && !ui.folio.bookFor('passives') && !find('[data-tree-window-default]').checked
        && center().every((v, i) => Math.abs(v - dockedCenter[i]) < 0.2)
        && find('#tree-search').value === 'life' && find('[data-tz="reset"]').textContent === zoom;
    });
    for (const [width, height, scale] of [[1360, 800, 1], [720, 920, 1.25], [1600, 680, 0.75]]) {
      win.setContentSize(width, height);
      const geometry = await run(async ([width, height, scale]) => {
        document.documentElement.style.setProperty('--ui-scale', String(scale));
        const { el, find, center, dockedCenter } = treeQA;
        const svg = find('#tree-svg');
        // Native window resize and the renderer's ResizeObserver are asynchronous.
        const deadline = performance.now() + 3000;
        do {
          await new Promise(r => requestAnimationFrame(r));
          const s = svg.getBoundingClientRect(), b = svg.viewBox.baseVal;
          if (innerWidth === width && innerHeight === height && Math.abs(b.width / b.height - s.width / s.height) < 0.005) break;
        } while (performance.now() < deadline);
        const r = el.getBoundingClientRect(), s = svg.getBoundingClientRect();
        const b = svg.viewBox.baseVal;
        return { size: innerWidth === width && innerHeight === height,
          fills: Math.abs(r.left) < 1 && Math.abs(r.top) < 1 && Math.abs(r.right - innerWidth) < 1
            && Math.abs(r.bottom - innerHeight) < 1, aspect: Math.abs(b.width / b.height - s.width / s.height) < 0.005,
          canvas: s.width > innerWidth * 0.9 && s.height > innerHeight * 0.7,
          centered: center().every((v, i) => Math.abs(v - dockedCenter[i]) < 0.2),
          windowControls: treeQA.windowControlsPlaced() };
      }, [width, height, scale]);
      assert(Object.values(geometry).every(Boolean), `${width}×${height} at ${scale}: ${JSON.stringify(geometry)}`);
      console.log('PASS viewport, aspect and center', width, height, scale);
    }
    await check('Restore returns the same camera and tools to the selected inventory page', () => {
      const { click, ui, center, dockedCenter, find } = treeQA;
      click('[data-tree-window]');
      return ui.inventoryOpen && ui.folio.bookFor('passives')?.front === 'passives' && !ui.treeFullWindow
        && find('#tree-search').value === 'life' && center().every((v, i) => Math.abs(v - dockedCenter[i]) < 0.2);
    });
    await check('Changing the default leaves the current visit docked', () => {
      treeQA.click('[data-tree-window-default]');
      return __game.settings().passiveTreeFullWindow && !treeQA.ui.treeFullWindow;
    });
    win.setContentSize(1360, 800);
    await boot();
    await check('Saved preference opens the tree alone after reload and gates gameplay input', () => {
      const { key, ui, seat, find } = treeQA;
      key('p');
      return ui.treeFullWindow && !ui.inventoryOpen && !ui.folio.bookFor('passives') && ui.uiBlocking()
        && ui.blockingFor(seat.id) && find('[data-tree-window-default]').checked;
    });
    if (process.env.HOLLOW_WAKE_SMOKE_SHOT) {
      await run(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      const image = await win.webContents.capturePage();
      require('node:fs').writeFileSync(process.env.HOLLOW_WAKE_SMOKE_SHOT, image.toPNG());
    }
    await check('Dragging moves the artwork with the pointer on both axes', () => {
      const { find } = treeQA, svg = find('#tree-svg');
      const before = svg.getScreenCTM(), rect = svg.getBoundingClientRect();
      for (const [type, dx, dy] of [['pointerdown', 0, 0], ['pointermove', 37, 23], ['pointerup', 37, 23]]) {
        svg.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, buttons: type === 'pointerup' ? 0 : 1,
          pointerId: 1, clientX: rect.x + 100 + dx, clientY: rect.y + 100 + dy }));
      }
      const after = svg.getScreenCTM();
      return Math.abs(after.e - before.e - 37) < 1 && Math.abs(after.f - before.f - 23) < 1;
    });
    await check('Allocation hits the displayed node in standalone mode', () => {
      const { seat, ui, find } = treeQA;
      seat.meta.passivePoints = 3;
      ui.refreshTree();
      const svg = find('#tree-svg');
      for (const node of svg.querySelectorAll('.tree-node.available')) {
        const r = node.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2;
        const hit = document.elementFromPoint(x, y);
        if (hit?.closest('.tree-node') !== node) continue;
        hit.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true }));
        if (seat.meta.allocated.has(node.dataset.node)) return true;
      }
      return false;
    });
    await check('Escape returns to play and the menu route opens independently', () => {
      const { key, ui } = treeQA;
      key('Escape');
      if (ui.treeOpen || ui.inventoryOpen || ui.escapeMenuOpen || ui.uiBlocking()) return false;
      ui.menuVerbs().passives.open();
      return ui.treeFullWindow && !ui.inventoryOpen;
    });
    await check('Repeat shortcut closes only the tree, and ribbon close restores the previous page', () => {
      const { key, ui, click } = treeQA;
      key('p');
      if (ui.treeOpen || ui.inventoryOpen) return false;
      ui.toggleBuildPanel();
      document.querySelector('[data-passiveflap]').click();
      if (!ui.treeFullWindow || !ui.inventoryOpen) return false;
      click('[data-panel-x]');
      return ui.inventoryOpen && !ui.treeOpen && ui.folio.bookFor('skills')?.front === 'skills';
    });
    await check('Switching from the full tree to the selected Skills page keeps Inventory open', () => {
      const { key, ui } = treeQA;
      key('p'); ui.toggleBuildPanel();
      return ui.inventoryOpen && !ui.treeFullWindow && ui.folio.bookFor('skills')?.front === 'skills';
    });
    await check('Font opens the independent tree in refund mode', () => {
      const { ui, find } = treeQA, w = __game.world();
      ui.hideAll();
      w.loadZone('lastlight');
      const font = w.fonts[0];
      w.player.pos = { ...font.pos }; w.player.tier = font.tier || 0;
      ui.showFont();
      document.querySelector('[data-fontpassives]').click();
      return ui.treeFullWindow && !ui.inventoryOpen && find('[data-passive-refund-mode]').getAttribute('aria-pressed') === 'true';
    });
    await check('Disabling the default while maximized affects the next visit', () => {
      const { ui, click, key } = treeQA;
      click('[data-tree-window-default]');
      if (!ui.treeFullWindow || __game.settings().passiveTreeFullWindow) return false;
      key('Escape'); key('p');
      const docked = ui.inventoryOpen && !ui.treeFullWindow && ui.folio.bookFor('passives')?.front === 'passives';
      click('[data-tree-window-default]');
      return docked;
    });
    await check('Full-window dismissal and blocking belong to the requesting seat', () => {
      const { ui, seat } = treeQA;
      ui.hideAll(); __game.addAlly();
      const guest = __game.world().seats.find(s => s !== seat);
      guest.couch = { side: 'left', pad: 1 };
      ui.toggleTree(guest.id);
      if (!ui.blockingFor(guest.id) || ui.anyPanelOpenFor(seat.id) || ui.dismissFullWindowTree(seat.id)) return false;
      ui.hideAllFor(guest.id);
      return !ui.treeOpen && !ui.inventoryOpen;
    });
    await check('Tree seal and global clear also apply to the standalone page', () => {
      const { ui, seat } = treeQA, w = __game.world();
      ui.toggleTree(seat.id);
      const old = w.panelSealed;
      w.panelSealed = id => id === 'passives' || old.call(w, id);
      ui.folioSync();
      const sealed = !ui.treeOpen && !ui.inventoryOpen;
      w.panelSealed = old;
      ui.toggleTree(seat.id); ui.hideAll();
      return sealed && !ui.treeOpen && !ui.uiBlocking() && __game.crash().fatal === null;
    });
  } finally {
    win.destroy();
    game.server.close();
  }
}

app.whenReady().then(review).then(() => app.quit(), error => { console.error(error); app.exit(1); });
