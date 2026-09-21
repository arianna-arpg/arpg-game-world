// Real Vault UI, isolated from personal saves. Run after npm run build.
const { app, BrowserWindow } = require('electron');
const path = require('node:path'), fs = require('node:fs'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports');
app.setPath('userData', path.join(dir, `vault-profile-${process.pid}`));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, `vault-saves-${process.pid}`) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const js = source => win.webContents.executeJavaScript(source);
  const open = async () => { await js(`__game.ui.showAccountScreen(); void 0`); await wait(200); };
  // Discovery cards are tested after the first real death reveals the Vault.
  const reload = async () => { await win.loadURL(server.url); await wait(800); await js(`__game.account().ledger.account_deaths ||= 1; void 0`); await open(); };
  try {
    await reload();
    const fresh = await js(`(() => {
      const cards = [...document.querySelectorAll('[data-tip="rumor"]')];
      return cards.map(c => ({ html: c.outerHTML, body: c.querySelector('.ushroud-body').textContent,
        progressed: [...c.querySelectorAll('.uobj i')].some(e => parseFloat(e.style.width) > 0),
        tip: __game.ui.rumorTooltip(Number(c.dataset.rumorI)) }));
    })()`);
    assert(fresh.length > 0, 'fresh account shows mysteries');
    assert(fresh.every(c => !/Strike living enemies|fire, cold|Sorcerer|every vestige|quarter done/i.test(c.html + JSON.stringify(c.tip))), 'no initial recipe or script-mechanics leak');
    const deathRumors = fresh.filter(c => c.progressed);
    assert.equal(deathRumors.length, 1, 'the first real death advances its own discovery');
    assert(fresh.every(c => deathRumors.includes(c) || !/[a-z]/i.test(c.body)), 'untouched discovery prose remains entirely runic');
    assert(deathRumors.every(c => /[\u16a0-\u16ff]/.test(c.body)), 'one death does not fully reveal its discovery');
    await js(`__game.account().ledger['deed:elements_rehearsed']=1; void 0`);
    await open();
    const partial = await js(`(() => {
      const c = [...document.querySelectorAll('[data-tip="rumor"]')].find(c => c.textContent.includes('practice 3 elements:'));
      if (!c) return null;
      return {body:c.querySelector('.ushroud-body').textContent, title:c.querySelector('.uname').textContent,
        tip:__game.ui.rumorTooltip(Number(c.dataset.rumorI)), html:c.outerHTML};
    })()`);
    assert(partial && /[a-z]/i.test(partial.body) && /[\u16a0-\u16ff]/.test(partial.body), 'first credit reveals part of the prose and the qualified objective');
    assert(!/sorcerer/i.test(partial.html + JSON.stringify(partial.tip)), 'partial progress does not name the class');
    assert(partial.tip.description.includes(partial.body), 'card and hover share the same prose');
    fs.writeFileSync(path.join(dir, 'vault-partial.png'), (await win.webContents.capturePage()).toPNG());
    // The repeatable Memory shelf has fewer stock rows. Earn the tab strip
    // through its permanent-ownership path instead of the retired bundle count.
    await js(`__game.account().level=20; for (const flag of ['target_dummy','campfire','tracker']) __game.account().features.add(flag); __game.account().ledger['deed:elements_rehearsed']=3; void 0`);
    await open();
    const ready = await js(`(() => {
      const a=__game.account(), c=document.querySelector('[data-class-unlock="class_sorcerer"]');
      return {pending:a.pendingClassUnlocks.has('sorcerer'), reward:a.unlockedSkills.has('infernal_ray'),
        button:c?.textContent, disabled:c?.disabled, card:c?.parentElement.textContent,
        tab:document.querySelector('[data-vtab="classes"]')?.textContent};
    })()`);
    assert(ready.pending && ready.reward && ready.button === 'Unlock' && !ready.disabled, 'earned reward has an enabled free acknowledgement');
    assert(ready.card.includes('Sorcerer') && !/Mortal Essence|Claim · free/.test(ready.card), 'earned card reveals its identity without a price');
    assert(ready.tab?.includes('Classes'), 'ready card is on the Classes shelf');
    assert(await js(`(() => {
      const ui=__game.ui;
      ui.showMuClassCard('sorcerer', () => {});
      return !ui.muCardOpen;
    })()`), 'pending class cannot open a selectable Mu card');
    assert(await js(`!document.querySelector('[data-invest="slot_tier_4"]')`), 'pending class does not surface a fourth slot');
    fs.writeFileSync(path.join(dir, 'vault-ready.png'), (await win.webContents.capturePage()).toPNG());
    await reload();
    assert(await js(`!!document.querySelector('[data-class-unlock="class_sorcerer"]')`), 'unacknowledged card survives reload');
    // A normal click at zero essence must save and remove only this pending entry.
    const clicked = await js(`(() => {
      const a=__game.account();a.credits=0;
      document.querySelector('[data-class-unlock="class_sorcerer"]').click();
      return {pending:a.pendingClassUnlocks.has('sorcerer'), reward:a.unlockedClasses.has('sorcerer'),
        credits:a.credits, button:!!document.querySelector('[data-class-unlock="class_sorcerer"]')};
    })()`);
    assert(!clicked.pending && clicked.reward && clicked.credits===0 && !clicked.button, 'click acknowledges freely and retains the gameplay reward');
    assert(await js(`!!document.querySelector('[data-invest="slot_tier_4"]')`), 'Vault activation makes a fourth slot useful and purchasable');
    await js(`document.querySelector('[data-vtab="owned"]').click(); void 0`);
    assert(await js(`document.querySelector('[data-unlock-id="class_sorcerer"]')?.textContent.includes('Owned')`), 'acknowledged card moves to Owned');
    await reload();
    assert(await js(`!__game.account().pendingClassUnlocks.has('sorcerer') && __game.account().unlockedClasses.has('sorcerer')`), 'acknowledgement survives reload');
    assert(await js(`(() => {
      const ui=__game.ui;
      ui.showMuClassCard('sorcerer', () => {});
      const open=ui.muCardOpen;
      ui.closeMuClassCard();
      return open;
    })()`), 'activated class opens its Mu card after reload');
    // Ordinary early habits stay banked until both town introductions stand.
    await js(`Object.assign(__game.account().ledger, {'deed:melee_finishes':300, 'deed:cold_hits':90, 'deed:mended_wounds':1200}); void 0`);
    await open();
    assert(await js(`['spellblade','cryomancer','apothecary'].every(id=>!__game.account().unlockedClasses.has(id))`), 'early rewards wait for town');
    await js(`__game.account().features.add('bounty_board'); __game.account().features.add('quest_giver'); void 0`);
    await open();
    const early = await js(`['spellblade','cryomancer','apothecary'].map(id => {
      const c=document.querySelector('[data-class-unlock="class_'+id+'"]');
      return {id, ready:__game.account().pendingClassUnlocks.has(id), button:c?.textContent, disabled:c?.disabled, card:c?.parentElement.textContent};
    })`);
    assert(early.every(c=>c.ready && c.button==='Unlock' && !c.disabled), 'all three town-ready discoveries offer free acknowledgement');
    assert(early.every(c=>!c.card.includes('Mortal Essence')), 'new class cards show no essence price');
    await js(`document.querySelector('[data-class-unlock="class_spellblade"]').scrollIntoView({block:'start'}); void 0`);
    fs.writeFileSync(path.join(dir, 'vault-early-classes.png'), (await win.webContents.capturePage()).toPNG());
    await reload();
    assert(await js(`['spellblade','cryomancer','apothecary'].every(id=>__game.account().unlockedClasses.has(id)&&__game.account().pendingClassUnlocks.has(id))`), 'new classes and pending rewards survive reload');
    console.log('PASS vault discovery UI: hidden / partial / ready / free click / Owned / reload / town-gated early classes');
  } finally { win.destroy(); server.server.close(); app.quit(); }
}).catch(error => { console.error(error?.stack ?? String(error)); app.exit(1); });
