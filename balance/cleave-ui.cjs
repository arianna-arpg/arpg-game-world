// Isolated visual check: hidden Electron window, disposable saves and profile.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports');
fs.mkdirSync(dir, { recursive: true });
const log = value => fs.appendFileSync(path.join(dir, 'cleave-ui.log'), JSON.stringify(value) + '\n');
app.setPath('userData', path.join(dir, 'cleave-ui-profile-' + process.pid));
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 55000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'cleave-ui-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const errors = [];
  win.webContents.on('console-message', (_event, level, message) => { if (level >= 3) { errors.push(message); log(message); } });
  try {
    await win.loadURL(server.url);
    await win.webContents.executeJavaScript("Object.defineProperty(navigator,'getGamepads',{value:()=>[]}); void 0;");
    await wait(500);
    log(await win.webContents.executeJavaScript(`(() => {
      __game.account().ledger.prologue_lived = 1;
      __game.devStartRun('warrior'); __game.ui.hideAll();
      const w = __game.world(), inst = w.player.skills.find(s => s?.def.id === 'cleave');
      // This disposable visual fixture has already unlocked skill investment.
      w.netMemoryAccess = { progression:true, tree:null };
      inst.level = 20;
      inst.treeNodes = ['unbound_cleave','heavy_wave','tempered_wave','razor_horizon'];
      w.meta.knownSkills.set(inst.def.id, inst);
      __game.ui.openSkillTree(inst.def.id);
      __game.step(2);
      return { skill:inst.def.id, known:[...w.meta.knownSkills.keys()], refusal:w.memorySecondaryRefusal(inst.def.id), panes:[...document.querySelectorAll('[id^="skill-tree-"]')].map(e=>e.id) };
    })()`));
    for (const [width, height] of [[1400, 1000], [1000, 720]]) {
      win.setContentSize(width, height);
      await wait(120);
      const result = await win.webContents.executeJavaScript(`(() => {
        __game.step(2);
        const pane = document.getElementById('skill-tree-cleave'), r = pane.getBoundingClientRect();
        const labels = [...pane.querySelectorAll('.st-label')].map(e => { const r = e.getBoundingClientRect(); return { text: e.textContent, x:r.x,y:r.y,w:r.width,h:r.height }; });
        return { nodes: pane.querySelectorAll('circle[data-node]').length, rect: [r.x,r.y,r.width,r.height], labels };
      })()`);
      log(result);
      assert.equal(result.nodes, 15);
      assert.ok(result.labels.some(x => x.text.includes('Readied Cleave')));
      assert.ok(result.labels.find(x => x.text === 'Heavy Wave').x < result.labels.find(x => x.text === 'Serrated Wave').x);
      const [x, y, w, h] = result.rect;
      assert.ok(x >= -1 && y >= -1 && x + w <= width + 1 && y + h <= height + 1);
      const overlaps = result.labels.flatMap((a, i) => result.labels.slice(i + 1).filter(b => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y));
      assert.equal(overlaps.length, 0);
      await wait(500);
      fs.writeFileSync(path.join(dir, `cleave-tree-${width}.png`), (await win.webContents.capturePage()).toPNG());
    }
    win.setContentSize(1400, 1000);
    await win.webContents.executeJavaScript(`(() => {
      __game.ui.hideAll();
      const w = __game.world(), p = w.player, inst = p.skills.find(s => s?.def.id === 'cleave');
      w.zoneMap.qa_cleave = { id:'qa_cleave',name:'Proving Ground',level:6,size:{w:1600,h:1200},seed:23456,
        theme:{floor:'#30343a',grid:'#353940',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#829fc2'},
        layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000} };
      w.loadZone('qa_cleave'); p.pos={x:800,y:600}; __game.step(180);
      const update = w.update.bind(w);
      w.update = () => {}; // freeze only this disposable world's sim while rendering captures
      w.actors = [p]; w.projectiles = []; w.flashes = []; w.doodads = []; w.walk=null; w.markDoodadsChanged();
      const target = w.createMonster('zombie', 1, 'enemy'); target.skills = []; target.brain = undefined;
      target.pos = { x: p.pos.x + 180, y: p.pos.y }; target.tier = p.tier; target.spawnedAt=-1;
      target.sheet.setSource('cleave-ui', [{stat:'life',kind:'flat',value:100000},{stat:'evasion',kind:'override',value:0},{stat:'blockChance',kind:'override',value:0}]); target.fillResources(); w.actors.push(target);
      p.sheet.setSource('cleave-ui', [{stat:'accuracy',kind:'flat',value:100000},{stat:'mana',kind:'flat',value:10000}]); p.fillResources();
      const advance = seconds => { for(let t=0;t<seconds;t+=0.02) {
        w.flashes=w.flashes.filter(f=>(f.life-=0.02)>0); w.time+=0.02; w.attackSequences.update(0.02); w.updateProjectiles(0.02);
      } };
      const walkTo = (at, seconds) => { let nova = false;
        for(let t=0;t<seconds;t+=1/60) {
          w.applyInputs(new Map([[w.localSeat.id,{dx:at.x-p.pos.x,dy:at.y-p.pos.y,aim:target.pos,held:[],edge:[]}]]),1/60);
          update(1/60); nova ||= w.projectiles.some(p=>p.inst.sequenceRole==='payload');
        }
        return nova;
      };
      window.__cleaveQA = { w,p,inst,target,advance,walkTo, start:{...p.pos} };
      inst.treeNodes=['unbound_cleave','long_edge','driving_front'];
      w.executeSkill(p,inst,target.pos); advance(0.7); __game.step(1);
    })()`);
    const bounce = await win.webContents.executeJavaScript(`(() => {
      const {w,p}=__cleaveQA;
      return { glyph:w.actors.some(a=>a.look==='construct_recovery_glyph'), locked:p.skillRecoveryLocks.has('cleave'), axes:w.flashes.some(f=>f.fx==='recoverableAxe'), targetLife:__cleaveQA.target.life, targetMax:__cleaveQA.target.maxLife() };
    })()`);
    log(bounce); assert.ok(bounce.glyph && bounce.locked && bounce.axes);
    await wait(300);
    fs.writeFileSync(path.join(dir, 'cleave-bounce.png'), (await win.webContents.capturePage()).toPNG());
    await win.webContents.executeJavaScript(`(() => { const q=__cleaveQA; q.advance(2.2); q.w.flashes=[]; __game.step(1); })()`);
    const landed = await win.webContents.executeJavaScript(`(() => { const {w,p}=__cleaveQA; return w.actors.some(a=>!a.dead&&a.look==='construct_axe_catch')&&p.skillRecoveryLocks.has('cleave'); })()`);
    assert.ok(landed);
    await wait(300);
    fs.writeFileSync(path.join(dir, 'cleave-fallen-axe.png'), (await win.webContents.capturePage()).toPNG());
    const recovered = await win.webContents.executeJavaScript(`(() => {
      const q=__cleaveQA,{w,p}=q, marker=w.actors.find(a=>!a.dead&&a.look==='construct_axe_catch');
      q.walkTo({...marker.pos},1); __game.step(1);
      return { pickedUp:marker.dead, ready:!p.skillRecoveryLocks.has('cleave')&&!p.cooldowns.has('cleave') };
    })()`);
    log(recovered); assert.ok(recovered.pickedUp && recovered.ready);
    const caught = await win.webContents.executeJavaScript(`(() => {
      const q=__cleaveQA,{w,p,inst,target}=q;
      w.attackSequences.clearAll();w.projectiles=[];w.flashes=[];p.pos={...q.start};p.casting=null;p.useLock=0;p.cooldowns.clear();
      target.pos={x:p.pos.x+180,y:p.pos.y};inst.treeNodes=['unbound_cleave','long_edge','wide_front'];
      w.executeSkill(p,inst,target.pos);q.advance(0.5);
      const marker=w.actors.find(a=>!a.dead&&a.look==='construct_recovery_glyph');
      const nova=q.walkTo({...marker.pos},1);__game.step(1);
      return { caught:marker.dead, nova, buff:[...p.buffs.values()].some(b=>b.def.label==='Caught Rhythm'),ready:!p.skillRecoveryLocks.has('cleave') };
    })()`);
    log(caught); assert.ok(caught.caught && caught.nova && caught.buff && caught.ready);
    for (const reverse of [false, true]) {
      const sweep = await win.webContents.executeJavaScript(`(() => {
        const q=__cleaveQA, {w,p,inst,target}=q;
        w.attackSequences.clearAll(); w.projectiles=[]; w.flashes=[]; p.cooldowns.clear(); p.casting=null; p.useLock=0;
        target.pos={x:p.pos.x+45,y:p.pos.y}; inst.treeNodes=['unbound_cleave','heavy_wave','tempered_wave','razor_horizon'];
        const before=target.life; w.useSkill(p,inst,target.pos,true);
        if (${reverse}) { w.flashes=[]; q.advance(0.3); }
        for(const f of w.flashes) f.life=f.maxLife*0.55;
        __game.step(1);
        return { casting:!!p.casting, damaged:target.life<before, voice:w.flashes.some(f=>f.fx==='${reverse ? 'serratedBackswing' : 'serratedSweep'}') };
      })()`);
      log(sweep); assert.ok(sweep.casting && sweep.damaged && sweep.voice);
      await wait(300);
      fs.writeFileSync(path.join(dir, reverse ? 'cleave-backswing.png' : 'cleave-opening-sweep.png'), (await win.webContents.capturePage()).toPNG());
    }
    assert.deepEqual(errors, []);
    log('PASS: Cleave tree bounds; walking airborne catches and fallen pickups; opposed opening sweeps');
    console.log('Cleave UI PASS');
  } finally {
    clearTimeout(timeout); win.destroy(); server.server.close(); app.quit();
  }
}).catch(error => { log(error.stack ?? String(error)); app.exit(1); });
