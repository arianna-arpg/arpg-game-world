// Build first, then: npx electron balance/vendor-tooltips-ui.cjs
// Real hover delegation in an isolated, hidden game window; no personal saves.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports');
fs.mkdirSync(dir, { recursive: true });
app.setPath('userData', path.join(dir, `vendor-tooltips-profile-${process.pid}`));
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const timer = setTimeout(() => { console.error('Vendor tooltip test timed out'); app.exit(1); }, 60000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'),
    savesDir: path.join(dir, `vendor-tooltips-saves-${process.pid}`) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 900,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  try {
    await win.loadURL(server.url);
    await new Promise(resolve => setTimeout(resolve, 1200));
    const result = await win.webContents.executeJavaScript(`(${async function () {
      Object.defineProperty(navigator, 'getGamepads', { value: () => [] });
      const results = [];
      const check = (name, ok) => { if (!ok) throw Error(name); results.push(name); };
      const plain = html => { const el = document.createElement('div'); el.innerHTML = html; return el.textContent; };
      __game.account().ledger.prologue_lived = 1;
      __game.account().ledger.mireille_flasks_filled = 1;
      __game.devStartRun('warrior');
      await new Promise(resolve => setTimeout(resolve, 700));
      const w = __game.world(), ui = __game.ui, account = w.account;
      for (const flag of ['salvage_station', 'unlock_all_gems', 'vendor_gems', 'vendor_commission', 'brandt_sell_supports']) account.features.add(flag);
      const skills = w.skillDropPool(1);
      const skill = skills.find(s => !w.meta.knownSkills.has(s.id) && s.description);
      const otherSupport = w.supportDropPool(100).find(s => !s.rollBase);
      const support = w.supportDropPool(100).find(s => s.rollBase);
      check('fixture uses real unlearned skill and rolled support definitions', !!skill && !!otherSupport && !!support);
      const rolled = Object.fromEntries(support.rollBase.axes.map(a => [a.id, a.rows.at(-1).id]));
      const cutLines = support.rollBase.axes.map(a => a.rows.at(-1).line);
      w.vendorStock = [
        { kind: 'skill', inst: { def: skill, level: 3, rarity: 'magic', sockets: [null] } },
        { kind: 'support', gem: { def: support, level: 4, rolled } },
      ];
      const smith = w.actors.find(a => a.defId === 'townsfolk_smith');
      w.player.pos = { ...smith.pos }; w.player.tier = smith.tier;
      ui.hideAll(); ui.showVendor();
      const vendor = document.getElementById('vendor-menu'), tip = document.getElementById('tooltip');
      const hover = el => {
        check('hover target exists', !!el);
        vendor.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
        el.scrollIntoView({ block: 'nearest' });
        const rect = el.getBoundingClientRect();
        el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, clientX: rect.x + 8, clientY: rect.y + 8 }));
        check('hover opens the rich card', !tip.classList.contains('hidden'));
        return tip.textContent;
      };
      const before = JSON.stringify(w.vendorStock), known = w.meta.knownSkills.size;
      const request = w.requestMeta.bind(w), intents = [];
      w.requestMeta = action => { intents.push(action); return request(action); };
      for (const detail of ['compact', 'full']) {
        __game.settings().tooltipDetail = detail;
        const skillCard = hover(vendor.querySelector('[data-vgem="brandt:0"]'));
        check(detail + ' shelf skill explains its effect and retains requirements/price',
          skillCard.includes(plain(skill.description)) && skillCard.includes('Requires:') && skillCard.includes('click to buy'));
        check(detail + ' shelf skill uses the actual instance level/socket count', skillCard.includes('Lv 3') && skillCard.includes('1 socket'));
        const supportCard = hover(vendor.querySelector('[data-vgem="brandt:1"]'));
        check(detail + ' shelf support explains its effect and actual roll', supportCard.includes(plain(support.description))
          && supportCard.includes('Lv 4') && cutLines.every(line => supportCard.includes(plain(line))));
      }
      check('hovering neither purchases nor changes stock or learned skills', intents.length === 0
        && JSON.stringify(w.vendorStock) === before && w.meta.knownSkills.size === known);

      account.ledger['gemdrop:' + skill.id] = 100;
      account.ledger['gemdrop:' + otherSupport.id] = 1;
      account.ledger['gemdrop:' + support.id] = 100;
      ui.refreshVendor();
      vendor.querySelector('[data-vcomm-open="brandt"]').click();
      const row = (kind, id) => vendor.querySelector('[data-tip="gem-overview"][data-gem-kind="' + kind + '"][data-gem-id="' + id + '"]');
      check('commission skill has its description without owning it', hover(row('skill', skill.id)).includes(plain(skill.description)));
      const supportOverview = hover(row('support', support.id));
      check('commission support describes the definition without inventing a roll', supportOverview.includes(plain(support.description))
        && !cutLines.some(line => supportOverview.includes(plain(line))) && !supportOverview.includes('Lv 4'));
      const otherSupportSearch = vendor.querySelector('[data-vcomm-search]');
      otherSupportSearch.value = otherSupport.name; otherSupportSearch.dispatchEvent(new Event('input', { bubbles: true }));
      const disabled = row('support', otherSupport.id); // Skill awakening is bypassed by the fixture's debug Codex; support counts still gate.
      check('ineligible commission retains hover details', disabled.querySelector('button').disabled
        && hover(disabled.querySelector('span')).includes(plain(otherSupport.description)));
      const search = vendor.querySelector('[data-vcomm-search]');
      search.value = support.name; search.dispatchEvent(new Event('input', { bubbles: true }));
      check('search rebuild preserves commission tooltip wiring', hover(row('support', support.id)).includes(plain(support.description)));

      const hold = w.vendorHolds.brandt ??= { locks: [] };
      hold.commission = { kind: 'support', id: support.id };
      ui.refreshVendor();
      const standing = vendor.querySelector('span[data-tip="gem-overview"]');
      check('standing order name also explains the commissioned gem', hover(standing).includes(plain(support.description)));
      check('commission browsing sends no purchase or order intents', !intents.some(a => a.t === 'vendorCommission' || a.t === 'buyVendorGem'));

      w.vendorStock[0] = w.vendorStock[1]; ui.refreshVendor();
      check('restocked shelf tooltip resolves the current ware', hover(vendor.querySelector('[data-vgem="brandt:0"]')).includes(plain(support.description)));
      const gatedSkill = skills.find(s => Object.values(s.requirements ?? {}).some(n => n > 0));
      check('fixture includes a skill with attribute requirements', !!gatedSkill);
      w.vendorStock[0] = { kind: 'skill', inst: { def: gatedSkill, level: 1, sockets: [] } };
      __game.addAlly();
      const guest = w.seats.find(s => s !== w.localSeat);
      guest.couch = { side: 'left', pad: 1 }; guest.actor.pos = { ...smith.pos };
      for (const attr of Object.keys(gatedSkill.requirements)) { w.meta.attrs[attr] = 0; guest.meta.attrs[attr] = 1000; }
      ui.showVendor(guest.id);
      hover(vendor.querySelector('[data-vgem="brandt:0"]'));
      check('requirements follow the vendor guest rather than the inventory owner', tip.innerHTML.includes('#6fc06f')
        && !tip.textContent.includes('You cannot use this yet'));
      check('unknown catalog references fail closed', ui.gemOverviewTooltip('skill', 'missing-test-gem', w.localSeat) === null);
      w.requestMeta = request;
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      return results;
    }.toString()})()`);
    for (const name of result) console.log('PASS ' + name);
    fs.writeFileSync(path.join(dir, 'vendor-tooltips-ui.json'), JSON.stringify(result, null, 2));
    await new Promise(resolve => setTimeout(resolve, 100));
    fs.writeFileSync(path.join(dir, 'vendor-tooltips-ui.png'), (await win.webContents.capturePage()).toPNG());
  } finally { clearTimeout(timer); win.destroy(); server.server.close(); app.quit(); }
}).catch(error => { console.error(error?.stack ?? String(error)); app.exit(1); });
