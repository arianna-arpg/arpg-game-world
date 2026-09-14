// Real game + DOM regression for live inventory. Run after npm run build:
// npx electron balance/inventory-ui.cjs
// Hidden window, isolated profile and saves; never touches the player's run.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports');
fs.mkdirSync(dir, { recursive: true });
app.setPath('userData', path.join(dir, `inventory-ui-profile-${process.pid}`));
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { console.error('Inventory UI timed out'); app.exit(1); }, 60000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'),
    savesDir: path.join(dir, `inventory-ui-saves-${process.pid}`) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 500,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  try {
    await win.loadURL(server.url);
    // Let the asynchronous disk-save hydration finish before seeding a run.
    await new Promise(resolve => setTimeout(resolve, 1200));
    const results = await win.webContents.executeJavaScript(`(${async function () {
      Object.defineProperty(navigator, 'getGamepads', { value: () => [] });
      const checks = [];
      const check = (name, ok) => { if (!ok) throw Error(name); checks.push(name); };
      const beat = () => new Promise(resolve => setTimeout(resolve, 700));
      __game.account().ledger.prologue_lived = 1;
      __game.account().ledger.mireille_flasks_filled = 1;
      __game.devStartRun('warrior');
      const ui = __game.ui, w = __game.world(), m = w.meta;
      w.account.features.add('salvage_station');
      ui.hideAll(); m.items.length = 0; w.drops.length = 0;
      __game.settings().gearPickup = 'vacuum'; w.gearVacuum = true;
      ui.toggleInventory();
      const root = document.getElementById('inventory');
      const tile = uid => root.querySelector('[data-bag-item][data-item-uid="' + uid + '"]');
      let uid = 800000;
      const item = () => ({ uid: ++uid, baseId: 'ring_mi_gnoll', name: 'Inventory test ring',
        ilvl: 1, tier: 1, rarity: 'common', baseRoll: 0, implicitRolls: [], affixes: [] });
      const drop = it => w.drops.push({ pos: { ...w.player.pos }, tier: w.player.tier,
        bob: 0, item: { kind: 'gear', item: it } });
      const first = item(); drop(first);
      await beat();
      check('automatic pickup appears without a UI action', m.items.includes(first) && !!tile(first.uid));
      const anchor = tile(first.uid), heading = root.querySelector('h2');
      const sort = root.querySelector('[data-bag-sort]'); sort.focus();
      await beat(); await beat();
      check('idle refresh preserves nodes and keyboard focus', tile(first.uid) === anchor
        && root.querySelector('h2') === heading && document.activeElement === sort);

      root.querySelector('[data-buildflap]').click();
      const build = document.getElementById('skills-panel');
      const buildAnchor = build.querySelector('h2');
      const scroller = root.querySelector('.inv-scroll');
      scroller.scrollTop = 42;
      const scrollTop = scroller.scrollTop;
      check('small viewport exercises inventory scrolling', scrollTop > 0);
      const second = item(); drop(second); await beat();
      check('bag changes leave an unchanged skills drawer mounted', !!tile(second.uid)
        && build.querySelector('h2') === buildAnchor);
      check('bag scroll position survives live changes', root.querySelector('.inv-scroll').scrollTop === scrollTop);
      const skill = [...m.knownSkills.values()][0];
      for (const key of Object.keys(m.abilityEssences)) m.abilityEssences[key] = 9999;
      await beat();
      const levelButton = build.querySelector('[data-levelup="' + skill.def.id + '"]');
      check('wallet changes update skill affordability', levelButton && !levelButton.disabled);
      const level = skill.level;
      levelButton.click();
      check('drawer listeners fire once after independent updates', skill.level === level + 1);

      const satchel = root.querySelector('[data-satchel]');
      satchel.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 91, button: 0, buttons: 1 }));
      const third = item(); drop(third); await beat();
      check('automatic changes defer during a pointer press', m.items.includes(third)
        && !tile(third.uid) && satchel.isConnected);
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 91, button: 0 }));
      satchel.click(); await beat();
      check('release catches up and the original button still works', !!tile(third.uid) && ui.satchelOpen);
      const essence = Object.keys(m.essences)[0];
      m.essences[essence] = 4321; await beat();
      check('satchel reflects external wallet changes', root.textContent.includes('4321'));

      const oldPosition = { ...w.player.pos };
      const smith = w.actors.find(a => a.defId === 'townsfolk_smith');
      check('test run has a real vendor', !!smith);
      w.player.pos = { ...smith.pos }; w.player.tier = smith.tier;
      const bought = item(); w.vendorStock = [{ kind: 'item', item: bought }];
      for (const key of Object.keys(m.essences)) m.essences[key] = 100000;
      w.account.features.add('salvage_station');
      check('real vendor purchase succeeds: ' + JSON.stringify({ near: w.nearSmith(),
        features: [...w.account.features], refusal: w.vendorTradeRefusal(), price: w.vendorPrice(w.vendorStock[0]) }), w.buyVendorGem(0));
      w.player.pos = oldPosition;
      await beat();
      check('purchase made outside panel handlers appears', !!tile(bought.uid));
      w.applyAction(w.localSeat, { t: 'equipItem', uid: bought.uid }); await beat();
      check('equipment transfer updates both bag and doll', !tile(bought.uid)
        && !!root.querySelector('[data-doll][data-item-uid="' + bought.uid + '"]'));

      first.locked = true; first.sockets = [null]; await beat();
      check('in-place lock and socket changes appear', tile(first.uid).textContent.includes('🔒')
        && !!tile(first.uid).querySelector('[data-sock]'));
      m.items = m.items.filter(i => i.uid !== second.uid); await beat();
      check('externally replaced bag arrays remove old tiles', !tile(second.uid));

      tile(third.uid).dispatchEvent(new MouseEvent('click', { bubbles: true }));
      check('click-lift starts a carried item', !!document.querySelector('.dnd-ghost'));
      const duringCarry = item(); drop(duringCarry); await beat();
      check('live pickup preserves the carried item', !!tile(duringCarry.uid)
        && !!document.querySelector('.dnd-ghost'));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      check('carry can still cancel after a live refresh', !document.querySelector('.dnd-ghost') && ui.inventoryOpen);

      const pouch = { ...item(), baseId: 'rough_memory', name: 'Rough Memory',
        mem: [{ d: 'found', s: 100 }] };
      drop(pouch); await beat();
      const bagCount = m.items.length;
      drop({ ...pouch, uid: ++uid, mem: [{ d: 'found', s: 101 }] }); await beat();
      check('merged memory stack updates without adding a tile', m.items.length === bagCount
        && pouch.mem.length === 2 && tile(pouch.uid).textContent.trim().endsWith('2'));

      w.account.features.add('reliquary'); await beat();
      const ribbon = root.querySelector('[data-containerflap="reliquary"]');
      check('newly unlocked containers appear on the ribbon', !!ribbon);
      ribbon.click();
      const container = document.getElementById('container-panel-reliquary');
      const containerHeading = container.querySelector('h2'); await beat();
      check('idle container drawer stays mounted', container.querySelector('h2') === containerHeading);
      const relic = { ...item(), baseId: 'relic_charm', name: 'Test charm', rarity: 'magic' };
      drop(relic); await beat();
      w.applyAction(w.localSeat, { t: 'containerPlace', container: 'reliquary', uid: relic.uid }); await beat();
      check('external container placement updates both surfaces', !tile(relic.uid)
        && !!container.querySelector('[data-item-uid="' + relic.uid + '"]'));

      // A seat switch must read the panel owner's wallets on every automatic beat.
      __game.addAlly();
      const guest = w.seats.find(s => s !== w.localSeat);
      check('test has a second seat', !!guest);
      guest.couch = { side: 'left', pad: 1 };
      guest.meta.essences[essence] = 7654;
      ui.toggleInventory(guest.id); await beat();
      check('guest inventory reads its own satchel', root.textContent.includes('7654')
        && !root.textContent.includes('100000'));
      guest.meta.essences[essence] = 7655; await beat();
      check('guest wallet updates while its panel stays open', root.textContent.includes('7655'));
      ui.toggleInventory(guest.id);
      const closedMarkup = root.innerHTML;
      guest.meta.essences[essence]++; await beat();
      check('closed inventory does no DOM work', root.innerHTML === closedMarkup);
      ui.toggleInventory(guest.id);
      await beat();
      check('reopening catches changes made while closed', ui.inventoryOpen
        && !root.classList.contains('hidden') && root.textContent.includes('7656'));
      return checks;
    }.toString()})()`);
    fs.writeFileSync(path.join(dir, 'inventory-ui.json'), JSON.stringify(results, null, 2));
    for (const name of results) console.log('PASS ' + name);
    fs.writeFileSync(path.join(dir, 'inventory-ui.png'), (await win.webContents.capturePage()).toPNG());
  } finally {
    clearTimeout(timeout); win.destroy(); server.server.close(); app.quit();
  }
}).catch(error => { console.error(error?.stack ?? String(error)); app.exit(1); });
