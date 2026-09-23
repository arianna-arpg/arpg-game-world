// Build first, then: npx electron balance/support-tooltips-ui.cjs
// Real delegated hovers, isolated saves/profile, hidden window.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports');
fs.mkdirSync(dir, { recursive: true });
app.setPath('userData', path.join(dir, `support-tooltips-profile-${process.pid}`));
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const timer = setTimeout(() => { console.error('Support tooltip test timed out'); app.exit(1); }, 60000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'),
    savesDir: path.join(dir, `support-tooltips-saves-${process.pid}`) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 900,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  try {
    await win.loadURL(server.url);
    await new Promise(resolve => setTimeout(resolve, 1200));
    const results = await win.webContents.executeJavaScript(`(${async function () {
      Object.defineProperty(navigator, 'getGamepads', { value: () => [] });
      const results = [];
      const check = (name, ok) => { if (!ok) throw Error(name); results.push(name); };
      __game.account().ledger.prologue_lived = 1;
      __game.account().ledger.mireille_flasks_filled = 1;
      __game.devStartRun('warrior');
      await new Promise(resolve => setTimeout(resolve, 700));
      const w = __game.world(), ui = __game.ui, seat = w.localSeat;
      for (const flag of ['unlock_all_gems', 'vendor_gems', 'brandt_sell_supports']) w.account.features.add(flag);
      const skills = w.skillDropPool(100), supports = w.supportDropPool(100);
      const skill = id => { const def = skills.find(s => s.id === id); if (!def) throw Error('Missing skill ' + id); return def; };
      const support = id => { const def = supports.find(s => s.id === id); if (!def) throw Error('Missing support ' + id); return def; };
      const inst = id => ({ def: skill(id), level: 1, rarity: 'magic', sockets: [null, null, null] });
      const cleave = inst('cleave'), firebolt = inst('firebolt'), archer = inst('summon_skeleton_archer');
      const heavy = inst('heavy_strike'), full = inst('fireball'), socketless = inst('frostbolt');
      const splitting = support('splitting');
      full.sockets = [{ def: splitting, level: 1 }]; socketless.sockets = [];
      firebolt.grantedBy = 'Tooltip fixture item';
      const bar = [cleave, null, firebolt, archer, heavy, full, socketless, null];
      const setBar = (owner, bar) => {
        w.seatHero(owner).skills = bar;
        owner.meta.knownSkills = new Map(bar.filter(s => s && !s.grantedBy).map(s => [s.def.id, s]));
        owner.grantedInsts = new Map(bar.filter(s => s?.grantedBy).map(s => [s.def.id, s]));
      };
      setBar(seat, bar);
      const item = w.grantSupportGemItem(seat, { def: splitting, level: 1 });
      check('support fixture fits in the real bag', !!item);
      ui.hideAll(); ui.toggleInventory();
      const inventory = document.getElementById('inventory'), tip = document.getElementById('tooltip');
      const hover = (root, target) => {
        if (!target) throw Error('Missing hover target');
        root.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
        target.scrollIntoView({ block: 'nearest' });
        const r = target.getBoundingClientRect();
        target.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, clientX: r.x + 8, clientY: r.y + 8 }));
        if (tip.classList.contains('hidden')) throw Error('Hover did not open tooltip');
        return [...tip.querySelectorAll('[data-support-fit]')];
      };
      const bagHover = () => hover(inventory, inventory.querySelector('[data-tip="item"][data-item-uid="' + item.uid + '"]'));
      const fits = (rows, slot) => rows.find(r => +r.dataset.skillSlot === slot)?.dataset.supportFit === 'true';
      const snapshot = () => JSON.stringify({ items: seat.meta.items, bar: w.seatHero(seat).skills });
      const before = snapshot();
      for (const detail of ['compact', 'full']) {
        __game.settings().tooltipDetail = detail;
        const rows = bagHover();
        check(detail + ': equipped skills appear in bar order, skipping empty slots', rows.map(r => +r.dataset.skillSlot).join() === '0,2,3,4,5,6');
        check(detail + ': matching projectiles get checks and melee gets a dash', fits(rows, 2) && !fits(rows, 0)
          && rows[1].textContent.includes('✓') && rows[0].textContent.includes('—'));
        check(detail + ': item-granted equipped skill is included', rows[1].textContent.includes(firebolt.def.name));
        check(detail + ': summon compatibility follows the archer crew', fits(rows, 3));
        check(detail + ': a full compatible skill keeps its check and reports capacity', fits(rows, 5) && rows[4].textContent.includes('Sockets full'));
        check(detail + ': zero sockets are distinct from incompatibility', fits(rows, 6) && rows[5].textContent.includes('No sockets'));
      }
      check('hover never changes the bag or loadout', snapshot() === before);
      for (const mode of ['break', 'sell']) {
        const card = document.createElement('div'); card.innerHTML = ui.gemItemTooltip(item, seat, mode).description;
        check(mode + ' card retains the compatibility list', card.querySelectorAll('[data-support-fit]').length === 6);
      }
      item.gem.supportId = 'alacrity';
      check('no cooldown means no Alacrity check', !fits(bagHover(), 2));
      firebolt.sockets[0] = { def: support('austerity'), level: 1 };
      check('a composing support opens compatibility on the next hover', fits(bagHover(), 2));
      firebolt.sockets[0] = null;
      check('removing the enabling support restores incompatibility', !fits(bagHover(), 2));
      item.gem.supportId = 'widening';
      check('unmodified Heavy Strike refuses an area support', !fits(bagHover(), 4));
      heavy.treeNodes = ['fault_wave'];
      check('current skill-tree transformation opens area compatibility', fits(bagHover(), 4));
      heavy.treeNodes = [];
      check('respec removes the former compatibility', !fits(bagHover(), 4));

      // A temporary data extension makes row-specific requirements observable;
      // the live catalog currently rolls the same requirements on every cut.
      const rolledDef = support('multistrike'), originalBase = rolledDef.rollBase;
      rolledDef.rollBase = { axes: [{ id: 'test', rows: [
        { id: 'plain', weight: 1, line: 'plain cut' },
        { id: 'clock', weight: 1, line: 'requires a cooldown', requiresMechanisms: ['cooldown'] },
      ] }] };
      item.gem.supportId = rolledDef.id; item.gem.rolled = { test: 'clock' };
      check('bag card reads this rolled copy rather than the canonical cut', !fits(bagHover(), 0));
      item.gem.rolled.test = 'plain';
      check('another cut of the same support can fit', fits(bagHover(), 0));
      const smith = w.actors.find(a => a.defId === 'townsfolk_smith');
      w.player.pos = { ...smith.pos }; w.player.tier = smith.tier;
      w.vendorStock = [{ kind: 'support', gem: { def: rolledDef, level: 4, rolled: { test: 'clock' } } }];
      ui.showVendor();
      const vendor = document.getElementById('vendor-menu');
      const vendorHover = () => hover(vendor, vendor.querySelector('[data-vgem="brandt:0"]'));
      const vendorRows = vendorHover();
      check('vendor card reads the offered cut and retains its price', !fits(vendorRows, 0) && tip.textContent.includes('click to buy'));
      rolledDef.rollBase = originalBase;
      w.vendorStock = [{ kind: 'support', gem: { def: splitting, level: 1 } }];
      __game.addAlly();
      const guest = w.seats.find(s => s !== seat);
      guest.couch = { side: 'left', pad: 1 }; guest.actor.pos = { ...smith.pos };
      setBar(guest, [inst('cleave')]);
      ui.showVendor(guest.id);
      const guestRows = vendorHover();
      check('vendor ownership follows the guest bar rather than the local player', guestRows.length === 1 && !fits(guestRows, 0));

      ui.hideAll(); ui.toggleInventory();
      item.gem.supportId = 'splitting'; delete item.gem.rolled;
      // Possession changes the controlled body, not the bar being equipped.
      const controlled = seat.actor;
      seat.home = controlled; seat.actor = guest.actor;
      check('possession still reads the original hero equipment bar', bagHover().length === 6);
      seat.actor = controlled; seat.home = undefined;
      setBar(seat, [null, null]);
      check('empty loadout has an explicit empty state', bagHover().length === 0 && tip.textContent.includes('No equipped skills'));
      setBar(seat, [cleave]);
      check('a loadout with no matches still names its incompatible skill', bagHover().length === 1 && !fits(bagHover(), 0));
      setBar(seat, bar);
      // Capture a representative eight-skill card to check its actual layout.
      bar[1] = inst('dash'); bar[7] = inst('life_flask');
      setBar(seat, bar); ui.refreshInventory(); bagHover();
      const r = tip.getBoundingClientRect();
      check('eight-skill card stays inside the viewport', r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight);
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      bagHover();
      return results;
    }.toString()})()`);
    for (const name of results) console.log('PASS ' + name);
    fs.writeFileSync(path.join(dir, 'support-tooltips-ui.json'), JSON.stringify(results, null, 2));
    await new Promise(resolve => setTimeout(resolve, 150));
    fs.writeFileSync(path.join(dir, 'support-tooltips-ui.png'), (await win.webContents.capturePage()).toPNG());
  } finally { clearTimeout(timer); win.destroy(); server.server.close(); app.quit(); }
}).catch(error => { console.error(error?.stack ?? String(error)); app.exit(1); });
