// Isolated visual check: hidden Electron window, disposable saves and profile.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports');
fs.mkdirSync(dir, { recursive: true });
const log = value => fs.appendFileSync(path.join(dir, 'assault-ui.log'), JSON.stringify(value) + '\n');
app.setPath('userData', path.join(dir, 'assault-ui-profile-' + process.pid));
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 55000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'assault-ui-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const errors = [];
  win.webContents.on('console-message', (_event, level, message) => { if (level >= 3) { errors.push(message); log(message); } });
  try {
    await win.loadURL(server.url);
    await win.webContents.executeJavaScript("Object.defineProperty(navigator,'getGamepads',{value:()=>[]}); void 0;");
    await wait(500);
    await win.webContents.executeJavaScript(`(() => {
      __game.account().ledger.prologue_lived = 1;
      __game.devStartRun('hivecaller'); __game.ui.hideAll();
      const w = __game.world(), inst = w.player.skills.find(s => s?.def.id === 'command_assault');
      inst.level = 20;
      inst.treeNodes = ['killing_signal','rapid_signals','patient_signal'];
      __game.ui.openSkillTree(inst.def.id);
      __game.step(2);
    })()`);
    for (const [width, height] of [[1400, 1000], [1000, 720]]) {
      win.setContentSize(width, height);
      await wait(120);
      const result = await win.webContents.executeJavaScript(`(() => {
        __game.step(2);
        const pane = document.getElementById('skill-tree-command_assault'), r = pane.getBoundingClientRect();
        const labels = [...pane.querySelectorAll('.st-label')].map(e => { const r = e.getBoundingClientRect(); return { text: e.textContent, x:r.x,y:r.y,w:r.width,h:r.height }; });
        return { nodes: pane.querySelectorAll('circle[data-node]').length, rect: [r.x,r.y,r.width,r.height], labels };
      })()`);
      log(result);
      assert.equal(result.nodes, 15);
      assert.ok(result.labels.some(x => x.text.includes('Banked Orders')));
      const [x, y, w, h] = result.rect;
      assert.ok(x >= -1 && y >= -1 && x + w <= width + 1 && y + h <= height + 1);
      const overlaps = result.labels.flatMap((a, i) => result.labels.slice(i + 1).filter(b => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y));
      assert.equal(overlaps.length, 0);
      await wait(500);
      fs.writeFileSync(path.join(dir, `assault-tree-${width}.png`), (await win.webContents.capturePage()).toPNG());
    }
    win.setContentSize(1400, 1000);
    await wait(500);
    const court = await win.webContents.executeJavaScript(`(() => {
      __game.ui.hideAll();
      const w = __game.world(), p = w.player, inst = p.skills.find(s => s?.def.id === 'command_assault');
      p.invulnerable = true;
      inst.treeNodes = ['killing_signal','rapid_signals','patient_signal','sheltered_advance','scattered_advance','renewed_advance','mending_advance'];
      const gnat = p.skills.find(s => s?.def.id === 'raise_gnatveil');
      w.devThrongMint(gnat.def.id, 5); __game.step(2);
      w.assaults.refund(p, inst, 1000); __game.step(2);
      return { hud: p.assaultHud, aura: p.assaultAura };
    })()`);
    log(court); assert.equal(court.hud.hits, 5); assert.ok(court.aura);
    await wait(500);
    fs.writeFileSync(path.join(dir, 'assault-bank-aura.png'), (await win.webContents.capturePage()).toPNG());
    const orbit = await win.webContents.executeJavaScript(`(() => {
      const w = __game.world(), p=w.player, inst=p.skills.find(s=>s?.def.id==='command_assault');
      w.executeSkill(p,inst,{x:p.pos.x+120,y:p.pos.y}); __game.step(2);
      return { bodies:w.actors.filter(a=>a.assaultOrbit).length, bank:p.assaultHud };
    })()`);
    log(orbit); assert.ok(orbit.bodies > 0);
    await wait(500);
    fs.writeFileSync(path.join(dir, 'assault-orbit.png'), (await win.webContents.capturePage()).toPNG());
    assert.deepEqual(errors, []);
    log('PASS: tree bounds at two sizes, bank HUD, ready aura and orbit render without errors');
    console.log('Assault UI PASS');
  } finally {
    clearTimeout(timeout); win.destroy(); server.server.close(); app.quit();
  }
}).catch(error => { log(error.stack ?? String(error)); app.exit(1); });
