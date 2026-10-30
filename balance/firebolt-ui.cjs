// Hidden renderer check; only disposable profiles and saves under balance/reports.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports');
fs.mkdirSync(dir, { recursive: true });
const log = value => fs.appendFileSync(path.join(dir, 'firebolt-ui.log'), JSON.stringify(value) + '\n');
app.setPath('userData', path.join(dir, 'firebolt-ui-profile-' + process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { log('TIMEOUT'); app.exit(1); }, 55000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'firebolt-ui-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const errors = [];
  win.webContents.on('console-message', (_event, level, message) => { if (level >= 3) { errors.push(message); log(message); } });
  const js = code => win.webContents.executeJavaScript(`(() => { ${code} })()`);
  const capture = async name => { await wait(300); fs.writeFileSync(path.join(dir, `firebolt-${name}.png`), (await win.webContents.capturePage()).toPNG()); };
  try {
    await win.loadURL(server.url);
    await js("Object.defineProperty(navigator,'getGamepads',{value:()=>[]});"); await wait(500);
    await js(`
      __game.account().ledger.prologue_lived = 1;
      __game.devStartRun('magician'); __game.ui.hideAll();
      const w = __game.world(), inst = w.player.skills.find(s => s?.def.id === 'firebolt');
      w.netMemoryAccess = { progression:true, tree:null }; inst.level=20;
      inst.treeNodes=['ember_satellites','dense_constellation','passing_embers','broad_embers'];
      w.meta.knownSkills.set(inst.def.id,inst); __game.ui.openSkillTree(inst.def.id); __game.step(2);
    `);
    for (const [width, height] of [[1400,1000],[1000,720]]) {
      win.setContentSize(width,height); await wait(150);
      const r = await js(`
        __game.step(2); const pane=document.getElementById('skill-tree-firebolt'),r=pane.getBoundingClientRect();
        const labels=[...pane.querySelectorAll('.st-label')].map(e=>{const r=e.getBoundingClientRect();return {text:e.textContent,x:r.x,y:r.y,w:r.width,h:r.height};});
        return {nodes:pane.querySelectorAll('circle[data-node]').length,rect:[r.x,r.y,r.width,r.height],labels};
      `);
      log(r); assert.equal(r.nodes,15);
      assert.ok(r.labels.some(l=>l.text==='Kindled Attendants')); assert.ok(r.labels.some(l=>l.text==='Unbound Comet'));
      const [x,y,w,h]=r.rect; assert.ok(x>=-1&&y>=-1&&x+w<=width+1&&y+h<=height+1);
      const overlaps=r.labels.flatMap((a,i)=>r.labels.slice(i+1).filter(b=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y));
      assert.equal(overlaps.length,0); await capture(`tree-${width}`);
    }
    win.setContentSize(1400,1000);
    await js(`
      __game.ui.hideAll(); const w=__game.world(),p=w.player,inst=p.skills.find(s=>s?.def.id==='firebolt');
      w.zoneMap.qa_firebolt={id:'qa_firebolt',name:'Proving Ground',level:6,size:{w:1600,h:1200},seed:23456,
        theme:{floor:'#30343a',grid:'#353940',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#829fc2'},
        layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000}};
      w.loadZone('qa_firebolt'); p.pos={x:800,y:600}; __game.step(180); w.update=()=>{};
      w.actors=[p]; w.projectiles=[]; w.flashes=[]; w.doodads=[]; w.walk=null; w.markDoodadsChanged();
      const mod=(stat,value)=>({stat,kind:'override',value});
      p.sheet.setSource('qa',[mod('accuracy',100000),mod('mana',10000),mod('effectDuration',1),mod('statusChance',1),mod('satelliteCount',2),mod('knockback',0)]); p.fillResources();
      const targets=[];
      for(let i=0;i<6;i++) {
        const target=w.createMonster('zombie',1,'enemy');target.skills=[];target.brain=undefined;
        const a=i*Math.PI/3; target.pos={x:p.pos.x+Math.cos(a)*175,y:p.pos.y+Math.sin(a)*125};target.tier=p.tier;target.spawnedAt=-1;
        target.sheet.setSource('qa',[mod('life',100000+i*10000),mod('evasion',0),mod('blockChance',0)]);target.fillResources();w.actors.push(target);targets.push(target);
      }
      const advance=seconds=>{for(let t=0;t<seconds-1e-8;t+=1/120){
        w.flashes=w.flashes.filter(f=>(f.life-=1/120)>0);w.time+=1/120;w.updateProjectiles(1/120);w.updateZones(1/120);
      }};
      const reset=nodes=>{w.projectileArts.clearAll();w.projectiles=[];w.zones=[];w.flashes=[];inst.treeNodes=nodes;
        targets.forEach((a,i)=>{a.statuses=[];a.fillResources();const angle=i*Math.PI/3;a.pos={x:p.pos.x+Math.cos(angle)*175,y:p.pos.y+Math.sin(angle)*125};});p.casting=null;p.cooldowns.clear();p.useLock=0;};
      window.__fireboltQA={w,p,inst,targets,advance,reset};
      reset(['ember_satellites','dense_constellation','passing_embers','broad_embers','searing_orbit']);
      w.executeSkill(p,inst,targets[0].pos);advance(2.15);__game.step(1);
    `);
    const satellite = await js(`const {w}=__fireboltQA; return {orbs:w.projectiles.filter(p=>p.projectileOrbit).length,shots:w.projectiles.filter(p=>p.inst.projectileRole==='payload').length,nova:w.flashes.some(f=>f.fx==='ember_nova')};`);
    log(satellite); assert.equal(satellite.orbs,4); await capture('satellites');
    const pillar = await js(`
      const {w,p,inst,targets,advance,reset}=__fireboltQA; reset(['cinder_lance','white_heat','focused_flame','incandescent_point']);
      targets[1].applyStatus('burn',20,1,'fixture',{casterId:p.id});
      w.executeSkill(p,inst,targets[0].pos);advance(.65);w.executeSkill(p,inst,targets[0].pos);advance(.65);__game.step(1);
      return {pillars:w.zones.filter(z=>z.skillVisualId==='incandescent_pillar').length,white:targets.some(a=>a.statuses.some(s=>s.visual==='white_heat')),
        targets:targets.map(a=>({life:a.life,at:a.pos,statuses:a.statuses.map(s=>({id:s.id,source:s.sourceKey}))})),
        shots:w.projectiles.map(q=>({at:q.pos,age:q.age,speed:q.speed,hits:[...q.hits.keys()],spec:q.inst.projectileSpec}))};
    `);
    log(pillar); assert.ok(pillar.pillars>0&&pillar.white); await capture('white-pillar');
    const comet = await js(`
      const {w,p,inst,targets,advance,reset}=__fireboltQA;reset(['cinder_lance','slow_combustion','far_flight']);
      w.executeSkill(p,inst,{x:p.pos.x+300,y:p.pos.y+300});advance(3.5);__game.step(1);
      return {live:w.projectiles.length,rebounded:w.projectiles.some(p=>p.mult>1),infinite:w.projectiles.every(p=>p.pierce===Infinity)};
    `);
    log(comet); assert.ok(comet.live&&comet.rebounded&&comet.infinite); await capture('comet');
    assert.deepEqual(errors,[]); log('PASS Firebolt tree and combat visuals'); console.log('Firebolt UI PASS');
  } finally {clearTimeout(timeout);win.destroy();server.server.close();app.quit();}
}).catch(error=>{log(error.stack??String(error));app.exit(1);});
