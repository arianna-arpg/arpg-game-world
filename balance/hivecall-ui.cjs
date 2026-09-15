// Isolated visual check: hidden Electron window, disposable saves and profile.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports');
fs.mkdirSync(dir, { recursive: true });
const log = value => fs.appendFileSync(path.join(dir, 'hivecall-ui.log'), JSON.stringify(value) + '\n');
app.setPath('userData', path.join(dir, 'hivecall-ui-profile-' + process.pid));
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 55000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'hivecall-ui-saves-' + process.pid) });
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
      const w = __game.world(), inst = w.player.skills.find(s => s?.def.id === 'summon_swarmlings');
      inst.level = 20;
      inst.treeNodes = ['royal_guard', 'royal_ferocity', 'regal_execution'];
      inst.state = { hivecall: { meter: 80 } };
      __game.ui.openSkillTree(inst.def.id);
      __game.step(2);
    })()`);
    for (const [width, height] of [[1400, 1000], [1000, 720]]) {
      win.setContentSize(width, height);
      await wait(120);
      const result = await win.webContents.executeJavaScript(`(() => {
        __game.step(2);
        const pane = document.getElementById('skill-tree-summon_swarmlings'), r = pane.getBoundingClientRect();
        const labels = [...pane.querySelectorAll('.st-label')].map(e => { const r = e.getBoundingClientRect(); return { text: e.textContent, x:r.x,y:r.y,w:r.width,h:r.height }; });
        return { nodes: pane.querySelectorAll('circle[data-node]').length, rect: [r.x,r.y,r.width,r.height], labels };
      })()`);
      log(result);
      assert.equal(result.nodes, 15);
      assert.ok(result.labels.some(x => x.text.includes('Swarm Sovereign')));
      const [x, y, w, h] = result.rect;
      assert.ok(x >= -1 && y >= -1 && x + w <= width + 1 && y + h <= height + 1);
      const overlaps = result.labels.flatMap((a, i) => result.labels.slice(i + 1).filter(b => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y));
      assert.equal(overlaps.length, 0);
      await wait(500);
      fs.writeFileSync(path.join(dir, `hivecall-tree-${width}.png`), (await win.webContents.capturePage()).toPNG());
    }
    win.setContentSize(1400, 1000);
    await wait(500);
    const form = await win.webContents.executeJavaScript(`(() => {
      __game.ui.hideAll();
      const w=__game.world(), p=w.player, inst=p.skills.find(s=>s?.def.id==='summon_swarmlings');
      inst.treeNodes=['royal_guard','royal_carapace','royal_ferocity','crushing_mandibles','regal_execution'];
      inst.state = { hivecall: { meter: 100 } };
      p.invulnerable=true;
      try { if (!w.useMetaSkill(p, inst, p.pos)) throw Error('transformation failed'); } catch(e) { return {error: e.stack ?? String(e)}; }
      w.player.invulnerable=true;
      try { __game.step(2); } catch(e) { return {error:e.stack ?? String(e)}; }
      return {name:w.player.name, skills:w.player.skills.filter(Boolean).map(s=>s.def.name), hud:w.player.hivecallHud};
    })()`);
    log(form);
    assert.equal(form.name, 'Swarm Sovereign');
    assert.ok(form.skills.includes('Royal Cataclysm'));
    assert.ok(form.hud.remaining > 0);
    await wait(120);
    fs.writeFileSync(path.join(dir, 'hivecall-sovereign.png'), (await win.webContents.capturePage()).toPNG());
    const home = await win.webContents.executeJavaScript(`(() => {
      const w=__game.world(), form=w.player, host=form.skills.find(s=>s?.def.hivecall);
      if(!w.useMetaSkill(form,host,form.pos)) throw Error('return failed');
      __game.step(2); return {home:!w.localSeat.home, dead:w.player.dead};
    })()`);
    assert.ok(home.home && !home.dead);
    assert.deepEqual(errors, []);
    log('PASS: tree bounds and labels at two sizes, Sovereign kit and HUD, manual return render without errors');
    console.log('Hivecall UI PASS');
  } finally {
    clearTimeout(timeout); win.destroy(); server.server.close(); app.quit();
  }
}).catch(error => { log(error.stack ?? String(error)); app.exit(1); });
