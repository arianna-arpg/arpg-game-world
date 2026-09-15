// Isolated visual check: hidden Electron window, disposable saves and profile.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports');
fs.mkdirSync(dir, { recursive: true });
const log = value => fs.appendFileSync(path.join(dir, 'gnatveil-ui.log'), JSON.stringify(value) + '\n');
app.setPath('userData', path.join(dir, 'gnatveil-ui-profile-' + process.pid));
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 55000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'gnatveil-ui-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const errors = [];
  win.webContents.on('console-message', (_event, level, message) => { if (level >= 3) errors.push(message); });
  try {
    await win.loadURL(server.url);
    await win.webContents.executeJavaScript("Object.defineProperty(navigator,'getGamepads',{value:()=>[]}); void 0;");
    await wait(500);
    await win.webContents.executeJavaScript(`(() => {
      __game.account().ledger.prologue_lived = 1;
      __game.devStartRun('hivecaller'); __game.ui.hideAll();
      const w = __game.world(), inst = w.player.skills.find(s => s?.def.id === 'raise_gnatveil');
      inst.level = 20;
      inst.treeNodes = ['battle_hatching', 'walking_conductor', 'tireless_conductor'];
      inst.state = { throngEvolutionGauge: 66, throngMoteAt: 99999 };
      __game.ui.openSkillTree(inst.def.id);
      __game.step(2);
    })()`);
    for (const [width, height] of [[1400, 1000], [1000, 720]]) {
      win.setContentSize(width, height);
      await wait(120);
      const result = await win.webContents.executeJavaScript(`(() => {
        __game.step(2);
        const pane = document.getElementById('skill-tree-raise_gnatveil'), r = pane.getBoundingClientRect();
        const labels = [...pane.querySelectorAll('.st-label')].map(e => { const r = e.getBoundingClientRect(); return { text: e.textContent, x:r.x,y:r.y,w:r.width,h:r.height }; });
        return { nodes: pane.querySelectorAll('circle[data-node]').length, rect: [r.x,r.y,r.width,r.height], labels };
      })()`);
      log(result);
      assert.equal(result.nodes, 15);
      assert.ok(result.labels.some(x => x.text.includes('Battle Brood')));
      const [x, y, w, h] = result.rect;
      assert.ok(x >= -1 && y >= -1 && x + w <= width + 1 && y + h <= height + 1);
      const overlaps = result.labels.flatMap((a, i) => result.labels.slice(i + 1).filter(b => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y));
      assert.equal(overlaps.length, 0);
      await wait(500);
      fs.writeFileSync(path.join(dir, `gnatveil-tree-${width}.png`), (await win.webContents.capturePage()).toPNG());
    }
    win.setContentSize(1400, 1000);
    await win.webContents.executeJavaScript(`(() => {
      __game.ui.hideAll();
      const w=__game.world(), p=w.player, inst=p.skills.find(s=>s?.def.id==='raise_gnatveil');
      inst.treeNodes=['battle_hatching','rich_hatch'];
      inst.state.throngEvolutionGauge=66;
      const egg=w.mintThrongFind(p,inst,{x:p.pos.x+95,y:p.pos.y+35});
      if(!egg?.throngEgg) throw Error('egg missing');
      __game.step(2);
    })()`);
    await wait(120);
    fs.writeFileSync(path.join(dir, 'gnatveil-eggs.png'), (await win.webContents.capturePage()).toPNG());
    const cluster = await win.webContents.executeJavaScript(`(() => {
      const w=__game.world(), p=w.player, inst=p.skills.find(s=>s?.def.id==='raise_gnatveil');
      inst.treeNodes=['patient_condensation','layered_wings','quiet_flutter'];
      w.throngGain(p,inst,24); w.update(1/60); __game.step(2);
      return w.throngBodiesOf(p,inst.def.id).map(b=>({units:b.throngUnits,radius:b.radius}));
    })()`);
    assert.equal(cluster.length, 1); assert.equal(cluster[0].units, 24);
    await wait(120);
    fs.writeFileSync(path.join(dir, 'gnatveil-cluster.png'), (await win.webContents.capturePage()).toPNG());
    assert.deepEqual(errors, []);
    log('PASS: tree bounds and labels at two sizes, eggs, hatch meter and cluster render without errors');
    console.log('Gnatveil UI PASS');
  } finally {
    clearTimeout(timeout); win.destroy(); server.server.close(); app.quit();
  }
}).catch(error => { log(error.stack ?? String(error)); app.exit(1); });
