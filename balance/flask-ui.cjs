// Run the flask probe (catalog export) and production build first. This window
// never opens visibly and cannot read or write the user's normal save/profile.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const logPath = path.join(dir, 'flask-ui.log'); fs.writeFileSync(logPath, 'START\n');
const log = value => fs.appendFileSync(logPath, typeof value === 'string' ? value + '\n' : JSON.stringify(value) + '\n');
const catalog = JSON.parse(fs.readFileSync(path.join(dir, 'flask-catalog.json'), 'utf8'));
app.setPath('userData', path.join(dir, 'flask-ui-profile-' + process.pid));
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  log('READY');
  setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 55000).unref();
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'flask-ui-saves-' + process.pid) });
  log('SERVER ' + server.url);
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
  win.webContents.on('console-message', (_event, level, message) => { if (level >= 2) log({ console: message }); });
  try {
    log('LOAD'); await win.loadURL(server.url); log('LOADED');
    win.webContents.debugger.attach('1.3');
    await win.webContents.executeJavaScript("Object.defineProperty(navigator,'getGamepads',{value:()=>[]}); void 0;");
    await wait(1000);
    log(await win.webContents.executeJavaScript(`(()=>{
      __game.account().ledger.prologue_lived=1;
      __game.account().ledger.mireille_flasks_filled=1;
      __game.devStartRun('warrior'); __game.ui.hideAll();
      const w=__game.world(); const before=w.player.skills.filter(Boolean).map(s=>s.def.id);
      for(const s of [...w.player.skills]) if(s&&!s.def.tags.includes('flask')) w.unlearnSkill(s.def.id);
      for(const def of ${JSON.stringify(catalog)}) {
        if(!w.meta.knownSkills.has(def.id)) { const item=w.grantSkillGemItem(w.localSeat,{def,level:20,sockets:[null,null],rarity:'magic'},true); if(!item||!w.learnSkill(item.uid)) throw Error('learn '+def.id); }
        w.meta.knownSkills.get(def.id).level=20;
      }
      return {before,flasks:w.player.skills.filter(Boolean).map(s=>s.def.id),controllers:navigator.getGamepads().length};
    })()`));
    for (const [width, height] of [[1400, 1000], [1000, 720]]) {
      win.setContentSize(width, height); await wait(100);
      for (const def of catalog) {
        const result = await win.webContents.executeJavaScript(`(()=>{
          const ui=__game.ui,w=__game.world(); ui.hideAll(); ui.openSkillTree(${JSON.stringify(def.id)}); __game.step(2);
          const pane=document.getElementById('skill-tree-'+${JSON.stringify(def.id)}),r=pane.getBoundingClientRect();
          const nodes=[...pane.querySelectorAll('circle[data-node]')];
          const trunk=nodes.find(n=>n.dataset.node===${JSON.stringify(def.tree.nodes.find(n => n.kind === 'keystone').id)});
          if(!w.meta.knownSkills.get(${JSON.stringify(def.id)}).treeNodes?.length) trunk.dispatchEvent(new MouseEvent('click',{bubbles:true}));
          ui.refreshSkillTree(${JSON.stringify(def.id)});
          return {id:${JSON.stringify(def.id)},width:${width},height:${height},nodes:nodes.length,visible:!pane.classList.contains('hidden'),rect:[r.x,r.y,r.width,r.height],picks:w.meta.knownSkills.get(${JSON.stringify(def.id)}).treeNodes,labels:[...pane.querySelectorAll('.st-label')].map(e=>{const r=e.getBoundingClientRect();return{text:e.textContent,x:r.x,y:r.y,w:r.width,h:r.height}})};
        })()`);
        log(result); assert.equal(result.nodes, 23); assert.equal(result.visible, true); assert.ok(result.picks?.length);
        const [x, y, w, h] = result.rect; assert.ok(x >= -1 && y >= -1 && x + w <= width + 1 && y + h <= height + 1);
        const overlaps = result.labels.flatMap((a, i) => result.labels.slice(i + 1).filter(b => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y).map(b => [a.text, b.text]));
        assert.equal(overlaps.length, 0, 'node labels overlap: ' + JSON.stringify(overlaps));
        assert.ok(result.labels.every(l => l.h >= 10), 'overview labels remain readable');
        await wait(100);
        fs.writeFileSync(path.join(dir, `flask-ui-${def.id}-${width}.png`), (await win.webContents.capturePage()).toPNG());
      }
    }
    log('PASS: six trees at two sizes, real purchase, bounds, labels, no physical controllers');
  } finally { win.destroy(); server.server.close(); app.quit(); }
}).catch(error => { log(error?.stack ?? String(error)); app.exit(1); });
