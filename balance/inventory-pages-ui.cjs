// Build first. Hidden renderer, isolated saves/profile, real input dispatch.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports');
fs.mkdirSync(dir, { recursive: true });
app.setPath('userData', path.join(dir, `inventory-pages-profile-${process.pid}`));
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const timer = setTimeout(() => { console.error('Inventory pages timed out'); app.exit(1); }, 55000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'),
    savesDir: path.join(dir, `inventory-pages-saves-${process.pid}`) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  const run = async fn => {
    const result = await win.webContents.executeJavaScript(`(() => { try { return (${fn.toString()})(); }
      catch (error) { return { error: error.stack }; } })()`);
    if (result?.error) throw Error(result.error);
    return result;
  };
  try {
    await win.loadURL(server.url);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await run(function () {
      Object.defineProperty(navigator, 'getGamepads', { value: () => [] });
      __game.account().ledger.prologue_lived = 1;
      __game.account().ledger.mireille_flasks_filled = 1;
      __game.devStartRun('warrior');
      const ui = __game.ui, w = __game.world(), s = __game.settings();
      w.update = () => {};
      w.account.features.add('reliquary');
      w.account.ledger.odyssey_stage_2 = 1;
      const skill = [...w.localSeat.meta.knownSkills.values()].find(p => p.def.tree).def.id;
      w.account.memorySecondary.add('skill:' + skill);
      s.keybinds.panelSkills = 'k';
      ui.hideAll(); ui.folioSync();
      const checks = [];
      const check = (name, ok) => { if (!ok) throw Error(name); checks.push(name); };
      const front = id => ui.inventoryOpen && ui.folio.bookFor(id)?.front === id
        && ui.inventoryPages.entries().find(p => p.id === id).el.getBoundingClientRect().width > 0;
      const closed = () => !ui.inventoryOpen && !ui.treeOpen && !ui.skillsOpen
        && ui.inventoryPages.entries().every(p => p.el.classList.contains('hidden')
          && p.el.getBoundingClientRect().width === 0 && !ui.folio.bookFor(p.id));
      const key = value => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true }));
        __game.step();
        window.dispatchEvent(new KeyboardEvent('keyup', { key: value, bubbles: true }));
        __game.step(); ui.folioSync();
      };
      const click = selector => {
        const el = document.querySelector(selector);
        if (!el) throw Error('Missing ' + selector);
        el.click(); ui.folioSync();
      };
      const panelSealed = w.panelSealed;
      w.panelSealed = id => id === 'inventory' ? 'Inventory is sealed for this test' : panelSealed.call(w, id);
      key('p'); check('Page shortcut respects the parent inventory gate', closed());
      key('k'); check('Skills shortcut respects the parent inventory gate', closed());
      ui.openSkillTree(skill); check('Skill handle respects the parent inventory gate', closed());
      check('Unknown page requests are harmless', !ui.inventoryPages.request('missing-page', w.localSeat.id) && closed());
      w.panelSealed = panelSealed;
      key('p'); check('Passive key opens Inventory on Passives', front('passives'));
      key('i'); check('Inventory key hides the whole workspace', closed());
      key('i'); check('Inventory restores Passives', front('passives'));
      key('k'); check('Skills shortcut overrides remembered Passives', front('skills'));
      key('k'); check('Repeating Skills shortcut closes the workspace', closed());
      key('p'); check('Passive shortcut overrides remembered Skills', front('passives'));
      key('p'); check('Repeating Passive shortcut closes the workspace', closed());
      key('i'); check('Generic reopen remembers the latest explicit page', front('passives'));
      click('[data-containerflap="reliquary"]'); check('Reliquary ribbon selects its page', front('container:reliquary'));
      key('k'); key('i'); key('i');
      check('Reliquary then Skills survives Inventory close/reopen', front('skills'));
      ui.menuVerbs().passives.open(); check('Menu switches to the requested page', front('passives'));
      ui.menuVerbs().passives.open(); check('Repeating active menu toggle closes Inventory', closed());
      ui.menuVerbs().skills.open(); check('Skills menu opens its inventory page', front('skills'));
      ui.openSkillTree(skill); check('Skill handle selects a page inside Inventory', front('skilltree:' + skill));
      ui.openSkillTree(skill); check('Repeated skill handle keeps its page open', front('skilltree:' + skill));
      const tree = ui.skillTreePanes.get(skill); tree.zoom = 1.25;
      for (const [route, close] of Object.entries({
        glyph: () => click('#inventory [data-panel-x]'),
        sweep: () => ui.escapeSweep(w.localSeat.id, []),
        owner: () => ui.hideAllFor(w.localSeat.id),
        all: () => ui.hideAll(),
      })) {
        close(); ui.folioSync(); check(route + ' hides every page', closed());
        check(route + ' leaves no gameplay-blocking development window', !ui.anyPanelOpenFor(w.localSeat.id));
        key('i'); check(route + ' restores the selected skill tree', front('skilltree:' + skill));
        check(route + ' preserves tree view state', tree.zoom === 1.25);
      }
      click('#skill-tree-' + skill + ' [data-panel-x]');
      key('i'); key('i');
      check('Page glyph dismisses only its page and forgets membership', ui.inventoryOpen && !ui.inventoryPages.isOpen('skilltree:' + skill));
      ui.openSkillTree(skill); const inst = w.localSeat.meta.knownSkills.get(skill);
      w.localSeat.meta.knownSkills.delete(skill); ui.folioSync();
      check('Unavailable skill tree hides and leaves the folio', tree.el.classList.contains('hidden') && !ui.folio.bookFor('skilltree:' + skill));
      w.localSeat.meta.knownSkills.set(skill, inst);
      ui.toggleBuildPanel();
      __game.addAlly(); const guest = w.seats.find(p => p !== w.localSeat);
      guest.couch = { side: 'left', pad: 1 };
      ui.toggleTree(guest.id); ui.folioSync();
      check('Guest request opens the guest inventory', front('passives') && ui.panelSeat(ui.inventory).id === guest.id);
      check('Guest pages do not block the host', !ui.anyPanelOpenFor(w.localSeat.id) && ui.anyPanelOpenFor(guest.id));
      check('Shared roots do not leave a host book behind', ui.folio.views().every(v => v.owner === guest.id));
      ui.toggleBuildPanel(); ui.folioSync();
      check('Unqualified key action returns to the local player', front('skills') && ui.panelSeat(ui.inventory).id === w.localSeat.id);
      ui.hideAllFor(guest.id); check('Guest clear leaves host Inventory open', front('skills'));
      ui.toggleInventory(guest.id); ui.folioSync();
      check('Guest Inventory restores its own selected page', front('passives'));
      ui.hideAllFor(guest.id); ui.toggleInventory(); ui.folioSync();
      check('Host Inventory restores its own selected page', front('skills'));
      // A descriptor-only extension must inherit the same lifecycle and ownership.
      const el = document.createElement('div'); el.id = 'qa-inventory-page';
      el.className = 'panel'; document.body.appendChild(el);
      let leaves = 0, enters = 0;
      ui.inventoryPages.register({ id: 'qa-page', el, width: 333, title: () => 'QA Page',
        enter: () => enters++, leave: () => leaves++,
        refresh: () => { el.innerHTML = '<button data-panel-x>Close</button><h2>QA Page</h2><p>Extension</p>'; } });
      check('Registration controls initial page visibility', el.classList.contains('hidden'));
      ui.inventoryPages.request('qa-page', w.localSeat.id);
      check('Registered extension inherits selection and rendering', front('qa-page') && enters === 1);
      let duplicateRejected = false;
      try { ui.inventoryPages.register({ id: 'qa-page', el }); } catch { duplicateRejected = true; }
      check('Duplicate page registrations are rejected', duplicateRejected);
      key('i'); check('Registered extension inherits parent close and cleanup', closed() && leaves === 1);
      key('i'); check('Registered extension restores without a separate visibility flag', front('qa-page'));
      click('#qa-inventory-page [data-panel-x]');
      check('Registered extension inherits page close', ui.inventoryOpen && !ui.inventoryPages.isOpen('qa-page') && leaves === 2);
      ui.inventoryPages.request('passives', w.localSeat.id, 'show');
      ui.treeRefundMode = true; key('i');
      check('Parent close clears passive transient refund state', !ui.treeRefundMode && closed());
      key('i');
      ui.escapeSweep(w.localSeat.id, ['inventory']);
      check('Keep-inventory sweep dismisses constituent pages first', ui.inventoryOpen && ui.inventoryPages.entries().every(p => !ui.inventoryPages.isOpen(p.id)));
      ui.escapeSweep(w.localSeat.id, ['inventory']); check('Second keep-inventory sweep closes the bag', closed());
      s.layout.movable = true;
      s.layout.seats['passive-tree'] = { fx: 0.8, fy: 0.8 };
      s.layout.seats.inventory = { fx: 0.65, fy: 0.1 };
      key('p');
      window.inventoryQA = { check, checks, front, closed, key, skill };
    });
    for (const [width, height] of [[1400, 1000], [1000, 720], [1600, 900]]) {
      win.setContentSize(width, height);
      await new Promise(resolve => setTimeout(resolve, 80));
      await run(function () {
        const ui = __game.ui, q = inventoryQA;
        ui.folioSync();
        const bag = document.getElementById('inventory').getBoundingClientRect();
        const el = document.getElementById('passive-tree'), r = el.getBoundingClientRect();
        q.check(innerWidth + 'px: page follows the moved inventory', Math.abs(r.top - bag.top) < 1);
        q.check(innerWidth + 'px: page fits viewport', r.left >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1);
        q.check(innerWidth + 'px: page has no independent move controls', !el.classList.contains('panel-movable') && !el.querySelector('.panel-lock'));
      });
    }
    const checks = await run(function () {
      inventoryQA.check('No fatal renderer error', __game.crash().fatal === null);
      __game.ui.hideAll(); return inventoryQA.checks;
    });
    fs.writeFileSync(path.join(dir, 'inventory-pages-ui.json'), JSON.stringify(checks, null, 2));
    checks.forEach(name => console.log('PASS ' + name));
  } finally { clearTimeout(timer); win.destroy(); server.server.close(); app.quit(); }
}).catch(error => { console.error(error.stack ?? String(error)); app.exit(1); });
