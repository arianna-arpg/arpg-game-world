// Hidden real-client verification using disposable saves and an isolated profile.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
const log = value => fs.appendFileSync(path.join(dir, 'shield-up-ui.log'), JSON.stringify(value) + '\n');
app.setPath('userData', path.join(dir, 'shield-up-ui-profile-' + process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 55000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'shield-up-ui-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const errors = []; win.webContents.on('console-message', (_event, level, message) => { if (level >= 3) errors.push(message); });
  const js = code => win.webContents.executeJavaScript(code);
  const capture = async name => { await wait(250); fs.writeFileSync(path.join(dir, name + '.png'), (await win.webContents.capturePage()).toPNG()); };
  try {
    await win.loadURL(server.url); await wait(400);
    await js(`(() => {
      Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
      __game.account().ledger.prologue_lived=1; __game.devStartRun('warrior'); __game.ui.hideAll();
      const w=__game.world(),inst=w.player.skills.find(s=>s?.def.id==='shield_up');
      w.netMemoryAccess={progression:true,tree:null}; inst.level=20;
      inst.treeNodes=['iron_shelter','ready_watch','sheltered_thrust','shield_pump'];
      w.meta.knownSkills.set(inst.def.id,inst); w.recalcPlayer(); __game.ui.openSkillTree(inst.def.id); __game.step(2);
    })()`);
    for (const [width,height] of [[1400,1000],[1000,720]]) {
      win.setContentSize(width,height); await wait(150);
      const view = await js(`(() => { __game.step(2); const p=document.getElementById('skill-tree-shield_up'),r=p.getBoundingClientRect();
        return {count:p.querySelectorAll('circle[data-node]').length,rect:[r.x,r.y,r.width,r.height],labels:[...p.querySelectorAll('.st-label')].map(e=>{const r=e.getBoundingClientRect();return {text:e.textContent,x:r.x,y:r.y,w:r.width,h:r.height};})}; })()`);
      log(view); assert.equal(view.count,15);
      for (const label of ['Iron Shelter','Measured Shelter','Battering March','Last Shelter','Splinter Orbit']) assert.ok(view.labels.some(x=>x.text===label));
      const [x,y,w,h]=view.rect; assert.ok(x>=-1&&y>=-1&&x+w<=width+1&&y+h<=height+1);
      const overlaps=view.labels.flatMap((a,i)=>view.labels.slice(i+1).filter(b=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y));
      assert.equal(overlaps.length,0); await capture('shield-up-tree-'+width);
    }
    win.setContentSize(1400,1000);
    await js(`(() => {
      __game.ui.hideAll();const w=__game.world(),p=w.player,inst=p.skills.find(s=>s?.def.id==='shield_up');
      w.zoneMap.qa_shieldup={id:'qa_shieldup',name:'Proving Ground',level:6,size:{w:1600,h:1200},seed:23456,
        theme:{floor:'#30343a',grid:'#353940',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#829fc2'},layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000}};
      w.loadZone('qa_shieldup');p.pos={x:800,y:600};__game.step(120);w.update=()=>{};
      w.actors=[p];w.projectiles=[];w.flashes=[];w.doodads=[];w.walk=null;w.markDoodadsChanged();
      p.sheet.setSource('shield-up-ui',[{stat:'mana',kind:'flat',value:10000},{stat:'armor',kind:'flat',value:150},{stat:'lifeRegen',kind:'override',value:0}]);p.fillResources();
      const change=nodes=>{w.guardArts.clearAll();p.casting=null;p.useLock=0;p.cooldowns.clear();w.projectiles=[];w.flashes=[];inst.treeNodes=nodes;w.guardArts.sync(p);};
      const advance=seconds=>{for(let t=0;t<seconds;t+=0.02){w.time+=0.02;w.flashes=w.flashes.filter(f=>(f.life-=0.02)>0);w.guardArts.update(0.02);p.updateTimers(0.02);w.refreshSatellites(0.02);w.updateProjectiles(0.02);}};
      window.__shieldQA={w,p,inst,change,advance};
      change(['iron_shelter','reinforced_plate','broad_shelter','shared_shelter']);w.useSkill(p,inst,{x:900,y:600},true);advance(6.1);__game.step(1);
    })()`);
    const held=await js(`(() => {const {w,p,inst}=__shieldQA;return {held:p.casting?.mode==='guard',plate:[...p.buffs.values()].some(b=>b.def.label==='Reinforced Plate (3)'),grafts:inst.grafts?.length??0};})()`);
    log(held);assert.ok(held.held&&held.plate);assert.equal(held.grafts,0);await capture('shield-up-plates');
    await js(`(() => {const q=__shieldQA,{w,p,inst}=q;q.change(['measured_riposte','patient_hand','loaded_bash','punishing_reply']);w.useSkill(p,inst,p.pos,true);q.advance(1.2);__game.step(1);})()`);
    const casting=await js(`(() => {const {w,p}=__shieldQA;return {free:!p.casting,absorb:p.absorbTotal,warnings:w.guardArts.visuals.length};})()`);
    log(casting);assert.ok(casting.free&&casting.absorb>0&&casting.warnings===1);await capture('shield-up-gathering');
    await js(`(() => {const q=__shieldQA;q.advance(5.4);__game.step(1);})()`);
    const satellites=await js(`__shieldQA.w.satellites.visuals.filter(v=>v.family==='shelter_barrier'&&v.armed).length`);
    assert.equal(satellites,1);await capture('shield-up-barrier-orbit');
    await js(`(() => {const q=__shieldQA,{w,p,inst}=q;q.change(['iron_shelter','ready_watch','sheltered_thrust','shield_pump']);w.useSkill(p,inst,{x:1000,y:600},true);q.advance(0.3);__game.step(1);})()`);
    assert.ok(await js(`__shieldQA.w.projectiles.some(p=>p.inst.guardArtsHost===__shieldQA.inst)`));await capture('shield-up-bash-wave');
    assert.deepEqual(errors,[]);log('PASS tree layout, plates, absorb freedom, explosion windup, barrier orbit and bash wave');console.log('Shield Up UI PASS');
  } finally {clearTimeout(timeout);win.destroy();server.server.close();app.quit();}
}).catch(error=>{log(error.stack??String(error));console.error(error);app.exit(1);});
