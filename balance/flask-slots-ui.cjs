// Build first. Exercise live account persistence in a hidden, isolated game.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const logfile = path.join(dir, 'flask-slots-ui.log'); fs.writeFileSync(logfile, 'START\n');
const log = v => fs.appendFileSync(logfile, JSON.stringify(v) + '\n');
app.setPath('userData', path.join(dir, 'flask-slots-profile-' + process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 90000);
  const savesDir = path.join(dir, 'flask-slots-saves-' + process.pid);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  const js = code => win.webContents.executeJavaScript(code);
  try {
    await win.loadURL(server.url);
    const memory = await js(`(() => {
      const account=__game.account();account.ledger.prologue_lived=1;account.ledger.mireille_flasks_filled=1;
      __game.devStartRun('warrior');__game.ui.hideAll();
      const w=__game.world(),bar=w.player.skills,last=bar.length-1;
      if(!w.swapSkillSlots(bar.findIndex(s=>s?.def.id==='life_flask'),last-1))throw Error('Life move refused');
      if(!w.swapSkillSlots(bar.findIndex(s=>s?.def.id==='mana_flask'),last))throw Error('Mana move refused');
      if(!w.unlearnSkill('life_flask')||!w.unlearnSkill('mana_flask'))throw Error('Removal refused');
      __game.step(2);
      return {...account.skillSlotMemory};
    })()`);
    assert.ok(Number.isInteger(memory.life_flask)); assert.equal(memory.mana_flask, memory.life_flask + 1);
    // Wait for the real accountDirty writer, without invoking the manual save hook.
    let persisted = false;
    for (let i = 0; i < 100 && !persisted; i++) {
      persisted = fs.readdirSync(savesDir).filter(name => name.endsWith('.json')).some(name => {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(savesDir, name), 'utf8'));
          return data.skillSlotMemory?.life_flask === memory.life_flask
            && data.skillSlotMemory?.mana_flask === memory.mana_flask;
        } catch { return false; }
      });
      if (!persisted) await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.ok(persisted, 'live slot memory reached disk after both flasks were removed');
    const reloaded = new Promise(resolve => win.webContents.once('did-finish-load', resolve));
    win.reload(); await reloaded;
    const result = await js(`(() => {
      const remembered={...__game.account().skillSlotMemory};
      __game.devStartRun('warrior');__game.ui.hideAll();__game.step(2);
      const w=__game.world();
      return {remembered,flasks:['life_flask','mana_flask'].map(id=>{
        const slot=w.player.skills.findIndex(s=>s?.def.id===id),inst=w.player.skills[slot];
        return {id,slot,charges:inst&&w.player.charges.get(inst.def.chargeCost.charge),
          cap:inst&&w.player.chargeCapFor(inst.def.chargeCost.charge,inst)};
      }),fatal:__game.crash().fatal};
    })()`);
    assert.deepEqual(result.remembered, memory);
    for (const f of result.flasks) { assert.equal(f.slot, memory[f.id]); assert.equal(f.charges, f.cap); }
    assert.equal(result.fatal, null);
    log({ memory, persisted, result });
    fs.writeFileSync(path.join(dir, 'flask-slots-restored.png'), (await win.webContents.capturePage()).toPNG());
    log('PASS: move, remove, automatic account save, reload, new life and full charge banks');
    console.log('PASS: flask slot memory survives removal, disk reload and a new life');
  } finally { clearTimeout(timeout); win.destroy(); server.server.close(); app.quit(); }
}).catch(error => { log(error.stack ?? String(error)); console.error(error); app.exit(1); });
