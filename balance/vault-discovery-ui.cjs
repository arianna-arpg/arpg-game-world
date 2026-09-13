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
  const reload = async () => { await win.loadURL(server.url); await wait(800); await open(); };
  try {
    await reload();
    const fresh = await js(`(() => {
      const cards = [...document.querySelectorAll('[data-tip="rumor"]')];
      return cards.map(c => ({ html: c.outerHTML, body: c.querySelector('.ushroud-body').textContent,
        tip: __game.ui.rumorTooltip(Number(c.dataset.rumorI)) }));
    })()`);
    assert(fresh.length > 0, 'fresh account shows mysteries');
    assert(fresh.every(c => !/Strike living enemies|fire, cold|Sorcerer|every vestige|quarter done/i.test(c.html + JSON.stringify(c.tip))), 'no initial recipe or script-mechanics leak');
    assert(fresh.every(c => !/[a-z]/i.test(c.body)), 'fresh discovery prose is entirely runic');
    await js(`__game.account().ledger['deed:elements_landed']=1; void 0`);
    await open();
    const partial = await js(`(() => {
      const c = [...document.querySelectorAll('[data-tip="rumor"]')].find(c => c.textContent.includes('land fire, cold and lightning hits'));
      if (!c) return null;
      return {body:c.querySelector('.ushroud-body').textContent, title:c.querySelector('.uname').textContent,
        tip:__game.ui.rumorTooltip(Number(c.dataset.rumorI)), html:c.outerHTML};
    })()`);
    assert(partial && /[a-z]/i.test(partial.body) && /[\u16a0-\u16ff]/.test(partial.body), 'first credit reveals part of the prose and the qualified objective');
    assert(!/sorcerer/i.test(partial.html + JSON.stringify(partial.tip)), 'partial progress does not name the class');
    assert(partial.tip.description.includes(partial.body), 'card and hover share the same prose');
    fs.writeFileSync(path.join(dir, 'vault-partial.png'), (await win.webContents.capturePage()).toPNG());
    // Raise shelves through the account's normal available-stock census.
    await js(`__game.account().level=20; __game.account().ledger['deed:elements_landed']=3; void 0`);
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
    await js(`document.querySelector('[data-vtab="owned"]').click(); void 0`);
    assert(await js(`document.querySelector('[data-unlock-id="class_sorcerer"]')?.textContent.includes('Owned')`), 'acknowledged card moves to Owned');
    await reload();
    assert(await js(`!__game.account().pendingClassUnlocks.has('sorcerer') && __game.account().unlockedClasses.has('sorcerer')`), 'acknowledgement survives reload');
    console.log('PASS vault discovery UI: hidden / partial / ready / free click / Owned / reload');
  } finally { win.destroy(); server.server.close(); app.quit(); }
}).catch(error => { console.error(error?.stack ?? String(error)); app.exit(1); });
