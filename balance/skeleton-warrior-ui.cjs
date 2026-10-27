// Hidden client: node choices, coordinated vanguard, spectral heirs and elemental infantry.
const { app, BrowserWindow } = require('electron');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {startGameServer}=require('../launcher/server.cjs');
const dir=path.join(__dirname,'reports');fs.mkdirSync(dir,{recursive:true});
app.setPath('userData',path.join(dir,'warrior-ui-profile-'+process.pid));app.disableHardwareAcceleration();app.commandLine.appendSwitch('disable-gpu');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
app.whenReady().then(async()=>{
 const timeout=setTimeout(()=>app.exit(1),90000);
 const server=await startGameServer({root:path.resolve(__dirname,'../dist'),savesDir:path.join(dir,'warrior-ui-saves-'+process.pid)});
 const win=new BrowserWindow({show:false,width:1400,height:1000,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const errors=[];win.webContents.on('console-message',(_e,level,message)=>{if(level>=3)errors.push(message);});
 const run=code=>win.webContents.executeJavaScript(code);
 const capture=async name=>{await wait(150);fs.writeFileSync(path.join(dir,name+'.png'),(await win.webContents.capturePage()).toPNG());};
 try{
  await win.loadURL(server.url);await wait(500);
  await run("(()=>{__game.account().ledger.prologue_lived=1;__game.devStartRun('necromancer');__game.ui.hideAll();__game.devGrantSkill('summon_skeleton',20,0);const w=__game.world();w.netMemoryAccess={progression:true,tree:null};__game.ui.openSkillTree('summon_skeleton');__game.step(2);})()");
  for(const [width,height]of [[1400,1000],[1000,720]]){
   win.setContentSize(width,height);await wait(100);
   const tree=await run("(()=>{__game.step(2);const pane=document.getElementById('skill-tree-summon_skeleton'),r=pane.getBoundingClientRect();return {nodes:pane.querySelectorAll('circle[data-node]').length,rect:[r.x,r.y,r.width,r.height],labels:[...pane.querySelectorAll('.st-label')].map(e=>{const q=e.getBoundingClientRect();return {text:e.textContent,x:q.x,y:q.y,w:q.width,h:q.height};})};})()");
   assert.equal(tree.nodes,15);assert.ok(tree.labels.some(l=>l.text==='Runebound Blades'));assert.ok(tree.labels.some(l=>l.text==='Ossuary Assassins'));
   const [x,y,w,h]=tree.rect;assert.ok(x>=-1&&y>=-1&&x+w<=width+1&&y+h<=height+1);
   assert.equal(tree.labels.flatMap((a,i)=>tree.labels.slice(i+1).filter(b=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y)).length,0);
   await capture('skeleton-warrior-tree-'+width);
  }
  await run("(()=>{for(const id of ['ossuary_duelists','line_breakers','relentless_footwork']){document.querySelector('#skill-tree-summon_skeleton circle[data-node=\"'+id+'\"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));__game.step(1);}})()");
  const picker=await run("(()=>{const p=document.querySelector('.choice-popup'),r=p.getBoundingClientRect();return {label:p.getAttribute('aria-label'),options:p.querySelectorAll('[data-st-school]').length,rect:[r.x,r.y,r.width,r.height],top:document.querySelectorAll('#skill-tree-summon_skeleton [data-st-school]').length};})()");
  assert.equal(picker.label,'Choose Spellsword elements');assert.equal(picker.options,4);assert.equal(picker.top,0);
  assert.ok(picker.rect[0]>=0&&picker.rect[1]>=0&&picker.rect[0]+picker.rect[2]<=1000&&picker.rect[1]+picker.rect[3]<=720);
  await run("(()=>{for(const b of document.querySelectorAll('[data-st-school]'))b.click();})()");
  assert.equal(await run("document.querySelector('[data-school-apply]').disabled"),true);
  await run("(()=>{document.querySelector('[data-st-school=\"fire\"]').click();document.querySelector('[data-st-school=\"cold\"]').click();document.querySelector('[data-school-apply]').click();__game.step(1);document.querySelector('#skill-tree-summon_skeleton circle[data-node=\"dueling_pairs\"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));__game.step(1);document.querySelector('#skill-tree-summon_skeleton circle[data-node=\"relentless_footwork\"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));})()");
  const chosen=await run("(()=>{const i=__game.world().meta.knownSkills.get('summon_skeleton');return {nodes:i.treeNodes,schools:i.summonSchools,selected:[...document.querySelectorAll('[data-st-school][aria-pressed=\"true\"]')].map(b=>b.dataset.stSchool)};})()");
  assert.equal(chosen.nodes.length,4);assert.deepEqual(chosen.schools,['fire','cold']);assert.deepEqual(chosen.selected,['fire','cold']);await capture('skeleton-warrior-school-picker');
  await run("document.querySelector('.choice-popup').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
  assert.equal(await run("document.querySelector('.choice-popup')===null"),true);
  win.setContentSize(1400,1000);
  await run("(()=>{__game.ui.hideAll();const w=__game.world(),p=w.player,inst=w.meta.knownSkills.get('summon_skeleton');p.skills.fill(null);p.skills[0]=inst;w.zoneMap.qa_warrior={id:'qa_warrior',name:'The Ossuary Vanguard',level:6,size:{w:1800,h:1300},seed:7318,theme:{floor:'#30343a',grid:'#353940',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#829fc2'},layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000}};w.loadZone('qa_warrior');p.pos={x:650,y:650};__game.step(180);const update=w.update.bind(w);w.update=()=>{};w.applyInputs=()=>{};w.walk=null;w.doodads=[];w.markDoodadsChanged();w.devIgnoreSkillAttributes=true;p.sheet.setSource('warrior-ui',[{stat:'mana',kind:'flat',value:100000},{stat:'life',kind:'flat',value:100000}]);p.fillResources();const advance=t=>{for(let n=0;n<t;n+=1/60)update(1/60);};const start=(nodes,count=2)=>{w.cohortArts.clear(p,inst);w.summonArts.clear();p.casting=null;p.cooldowns.clear();p.useLock=0;p.fillResources();w.actors=[p];w.projectiles=[];w.zones=[];w.flashes=[];inst.treeNodes=nodes;delete inst.summonSchools;for(let i=0;i<count;i++)w.executeSkill(p,inst,p.pos);p.cooldowns.clear();p.useLock=0;return w.actors.filter(a=>a.owner===p&&!a.dead);};window.__warQA={w,p,inst,advance,start};const bodies=start(['grave_phalanx','barbed_lattice','oath_banner']);bodies.forEach((a,i)=>a.pos={x:p.pos.x+60,y:p.pos.y+(i-.5)*40});w.useMetaSkill(p,inst,{x:p.pos.x+350,y:p.pos.y});advance(.18);__game.step(1);})()");
  assert.equal(await run("__warQA.w.actors.filter(a=>a.owner===__warQA.p&&a.dash).length"),2);await capture('skeleton-warrior-vanguard-charge');
  await run("__warQA.advance(.6);__game.step(1)");assert.equal(await run("__warQA.w.zones.filter(z=>z.inst.def.id==='court_oath_standard').length"),2);await capture('skeleton-warrior-oath-banners');
  await run("(()=>{const q=__warQA,b=q.start(['grave_phalanx','veteran_watch','last_watch','relief_guard']);b.forEach((a,i)=>a.pos={x:q.p.pos.x+80,y:q.p.pos.y+(i-.5)*100});q.w.kill(b[0],false);q.advance(.15);__game.step(1);})()");
  assert.equal(await run("__warQA.w.actors.filter(a=>!a.dead&&a.spectralVeil).length"),1);await capture('skeleton-warrior-last-watch');
  await run("(()=>{const q=__warQA,b=q.start(['ossuary_duelists','line_breakers','relentless_footwork','dueling_pairs'],4);b.forEach((a,i)=>{a.pos={x:q.p.pos.x+80+(i%2)*70,y:q.p.pos.y-100+Math.floor(i/2)*150};const sk=a.skills.find(s=>s&&s.def.id!=='court_twin_cut');q.w.executeSkill(a,sk,{x:q.p.pos.x+280,y:a.pos.y});});q.advance(.2);__game.step(1);})()");
  const forms=await run("__warQA.w.actors.filter(a=>!a.dead&&a.owner===__warQA.p).map(a=>a.defId)");
  assert.equal(new Set(forms).size,4);assert.ok(forms.every(id=>id.endsWith('_spellsword')));await capture('skeleton-warrior-spellswords');
  await run("(()=>{const q=__warQA,b=q.start(['ossuary_duelists','flensing_edges','merciless_measure']);b.forEach((a,i)=>{a.pos={x:q.p.pos.x+80+i*70,y:q.p.pos.y-40};q.w.executeSkill(a,a.cohortState.kit.find(s=>s.def.id==='court_shadow_cloak'),a.pos);});q.advance(.2);__game.step(1);})()");
  assert.equal(await run("__warQA.w.actors.filter(a=>!a.dead&&a.owner===__warQA.p&&a.sheet.get('invisible')>0).length"),2);await capture('skeleton-warrior-assassin-veils');
  assert.deepEqual(errors,[]);console.log('Skeleton Warrior UI PASS: responsive four-point tree, node choices, vanguard, banners, spectral overlay and four Spellsword schools');
 }finally{clearTimeout(timeout);win.destroy();server.server.close();app.quit();}
}).catch(error=>{console.error(error);app.exit(1);});
