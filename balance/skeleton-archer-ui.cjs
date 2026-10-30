// Hidden disposable client: tree bounds, live formations, released payloads and mage art.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports'); fs.mkdirSync(dir, { recursive: true });
app.setPath('userData', path.join(dir, 'archer-ui-profile-' + process.pid));
app.disableHardwareAcceleration(); app.commandLine.appendSwitch('disable-gpu');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  const timeout = setTimeout(() => app.exit(1), 55000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'archer-ui-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const errors = []; win.webContents.on('console-message', (_event, level, message) => { if (level >= 3) errors.push(message); });
  const run = code => win.webContents.executeJavaScript(code);
  const capture = async name => { await wait(150); fs.writeFileSync(path.join(dir, name + '.png'), (await win.webContents.capturePage()).toPNG()); };
  try {
    await win.loadURL(server.url); await wait(500);
    await run(`(() => {
      __game.account().ledger.prologue_lived=1; __game.devStartRun('necromancer'); __game.ui.hideAll();
      __game.devGrantSkill('summon_skeleton_archer',20,0);
      const w=__game.world(); w.netMemoryAccess={progression:true,tree:null};
      __game.ui.openSkillTree('summon_skeleton_archer'); __game.step(2);
    })()`);
    for (const [width,height] of [[1400,1000],[1000,720]]) {
      win.setContentSize(width,height); await wait(100);
      const tree=await run(`(() => { __game.step(2); const pane=document.getElementById('skill-tree-summon_skeleton_archer'), r=pane.getBoundingClientRect();
        const labels=[...pane.querySelectorAll('.st-label')].map(e=>{const r=e.getBoundingClientRect();return {text:e.textContent,x:r.x,y:r.y,w:r.width,h:r.height};});
        return {nodes:pane.querySelectorAll('circle[data-node]').length,rect:[r.x,r.y,r.width,r.height],labels}; })()`);
      assert.equal(tree.nodes,15); assert.ok(tree.labels.some(l=>l.text==='Rising Ranks'));
      const [x,y,w,h]=tree.rect; assert.ok(x>=-1&&y>=-1&&x+w<=width+1&&y+h<=height+1);
      assert.equal(tree.labels.flatMap((a,i)=>tree.labels.slice(i+1).filter(b=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y)).length,0);
      await capture('skeleton-archer-tree-'+width);
    }
    const allocated = await run(`(() => {
      for (const id of ['rattling_bows','ranked_bows','endless_quivers','rain_of_bones']) {
        const node=document.querySelector('#skill-tree-summon_skeleton_archer circle[data-node="'+id+'"]');
        node.dispatchEvent(new MouseEvent('click',{bubbles:true}));__game.step(1);
      }
      return __game.world().player.skills[0].treeNodes;
    })()`);
    assert.deepEqual(allocated,['rattling_bows','ranked_bows','endless_quivers','rain_of_bones']);
    win.setContentSize(1400,1000);
    await run(`(() => {
      __game.ui.hideAll(); const w=__game.world(),p=w.player,inst=p.skills[0];
      w.zoneMap.qa_archer={id:'qa_archer',name:'Bone Drill',level:6,size:{w:1800,h:1300},seed:7331,
        theme:{floor:'#30343a',grid:'#353940',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#829fc2'},
        layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000}};
      w.loadZone('qa_archer');p.pos={x:800,y:650};__game.step(180);
      const update=w.update.bind(w);w.update=()=>{};w.applyInputs=()=>{};w.walk=null;w.doodads=[];w.markDoodadsChanged();w.devIgnoreSkillAttributes=true;
      p.sheet.setSource('archer-ui',[{stat:'mana',kind:'flat',value:100000},{stat:'life',kind:'flat',value:100000}]);p.fillResources();
      const aim={x:p.pos.x+350,y:p.pos.y};
      const advance=seconds=>{for(let t=0;t<seconds;t+=1/60) update(1/60);};
      const start=nodes=>{w.channelFormations.clear();p.casting=null;p.cooldowns.clear();p.useLock=0;p.fillResources();w.actors=[p];w.projectiles=[];w.zones=[];w.flashes=[];inst.treeNodes=nodes;p.facing=0;w.useSkill(p,inst,aim,true);};
      window.__archerQA={w,p,inst,aim,advance,start};
      start(['rattling_bows','ranked_bows','rain_of_bones','endless_quivers']);advance(.9);__game.step(1);
    })()`);
    const recruited=await run(`__archerQA.w.actors.filter(a=>!a.dead&&a.channelFormation).length`);
    assert.equal(recruited,4);
    await run(`__archerQA.advance(.8);__game.step(1);`);
    const squad=await run(`(() => {const {w,p}=__archerQA;return {bodies:w.actors.filter(a=>!a.dead&&a.channelFormation).length,shots:w.projectiles.length,held:p.casting?.mode};})()`);
    assert.equal(squad.bodies,4);assert.ok(squad.shots>0);assert.equal(squad.held,'channel');await capture('skeleton-archer-firing-squad');
    const final=await run(`(() => {const q=__archerQA;q.p.casting.held=false;q.advance(.15);__game.step(1);return {bodies:q.w.actors.filter(a=>!a.dead&&a.channelFormation).length,big:q.w.projectiles.filter(p=>p.radius>=12).length};})()`);
    assert.equal(final.bodies,0);assert.equal(final.big,4);await capture('skeleton-archer-final-volley');
    const mortar=await run(`(() => {const q=__archerQA;q.start(['rattling_bows','ranked_bows','piercing_bones','endless_quivers']);q.advance(2.5);q.p.casting.held=false;q.advance(.12);__game.step(1);return q.w.zones.filter(z=>z.inst.def.id==='skeletal_bombardment'&&z.radius>=130).length;})()`);
    assert.equal(mortar,2);await capture('skeleton-archer-mortar-finale');
    for(const [type,monster] of [['fire','skeletal_pyromancer'],['cold','skeletal_cryomancer'],['lightning','skeletal_stormcaller'],['chaos','skeletal_venomancer']]) {
      await run(`(() => {
        const q=__archerQA,{w,p}=q;w.channelFormations.clear();p.casting=null;w.actors=[p];w.zones=[];w.projectiles=[];w.flashes=[];
        __game.devGrantSkill('skeletal_weather_${type}',20,1);__game.devGrantSkill('skeletal_nova_${type}',20,2);
        const mage=w.createMonster('${monster}',6,'player',p);mage.pos={x:p.pos.x+65,y:p.pos.y+60};mage.skills=[p.skills[1],p.skills[2]];w.actors.push(mage);
        w.useSkill(mage,p.skills[1],{x:p.pos.x+230,y:p.pos.y+20});q.advance(1.1);w.executeSkill(mage,p.skills[2],mage.pos);q.advance(.07);__game.step(1);
      })()`); await capture('skeleton-archer-mage-'+type);
    }
    assert.deepEqual(errors,[]); console.log('Skeleton Archer UI PASS: tree bounds, growing squad, release arrows, mortar landings and four mage schools');
  } finally { clearTimeout(timeout);win.destroy();server.server.close();app.quit(); }
}).catch(error=>{console.error(error);app.exit(1);});
