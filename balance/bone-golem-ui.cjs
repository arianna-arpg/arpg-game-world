// Hidden client: responsive frame tree, worn forward opening, commanded wave and Reknit dismissal.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {startGameServer}=require('../launcher/server.cjs');
const dir=path.join(__dirname,'reports');fs.mkdirSync(dir,{recursive:true});
app.setPath('userData',path.join(dir,'golem-ui-profile-'+process.pid));app.disableHardwareAcceleration();app.commandLine.appendSwitch('disable-gpu');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
 const timeout=setTimeout(()=>app.exit(1),90000);
 const server=await startGameServer({root:path.resolve(__dirname,'../dist'),savesDir:path.join(dir,'golem-ui-saves-'+process.pid)});
 const win=new BrowserWindow({show:false,width:1400,height:1000,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const errors=[];win.webContents.on('console-message',details=>{if(details.level==='error')errors.push(details.message);});
 const run=code=>win.webContents.executeJavaScript(code);
 const capture=async name=>{await wait(150);fs.writeFileSync(path.join(dir,name+'.png'),(await win.webContents.capturePage()).toPNG());};
 try{
  await win.loadURL(server.url);await wait(500);
  await run("(()=>{__game.account().ledger.prologue_lived=1;__game.devStartRun('necromancer');__game.ui.hideAll();__game.devGrantSkill('summon_bone_golem',20,0);const w=__game.world();w.netMemoryAccess={progression:true,tree:null};__game.ui.openSkillTree('summon_bone_golem');__game.step(2);})()");
  for(const[width,height]of [[1400,1000],[1000,720]]){
   win.setContentSize(width,height);await wait(100);
   const tree=await run("(()=>{__game.step(2);const p=document.getElementById('skill-tree-summon_bone_golem'),r=p.getBoundingClientRect();return {nodes:p.querySelectorAll('circle[data-node]').length,rect:[r.x,r.y,r.width,r.height],labels:[...p.querySelectorAll('.st-label')].map(e=>{const q=e.getBoundingClientRect();return {text:e.textContent,x:q.x,y:q.y,w:q.width,h:q.height};})};})()");
   assert.equal(tree.nodes,15);assert.ok(tree.labels.some(l=>l.text==='Sanctuary of Bone'));assert.ok(tree.labels.some(l=>l.text==='Cataclysmic Impact'));
   const[x,y,w,h]=tree.rect;assert.ok(x>=-1&&y>=-1&&x+w<=width+1&&y+h<=height+1);
   assert.equal(tree.labels.flatMap((a,i)=>tree.labels.slice(i+1).filter(b=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y)).length,0);
   await capture('bone-golem-tree-'+width);
  }
  await run("(()=>{__game.ui.hideAll();const w=__game.world(),p=w.player,inst=w.meta.knownSkills.get('summon_bone_golem');p.skills.fill(null);p.skills[0]=inst;w.zoneMap.qa_golem={id:'qa_golem',name:'The Living Ossuary',level:6,size:{w:1800,h:1300},seed:8642,theme:{floor:'#30343a',grid:'#353940',border:'#444b55',obstacle:'#444',obstacleEdge:'#555',accent:'#c8d8cd'},layout:[],objective:{kind:'safe'},exits:[],map:{x:9000,y:9000}};w.loadZone('qa_golem');p.pos={x:650,y:650};__game.step(180);const update=w.update.bind(w);w.update=()=>{};w.applyInputs=()=>{};w.walk=null;w.doodads=[];w.markDoodadsChanged();w.devIgnoreSkillAttributes=true;p.sheet.setSource('golem-ui',[{stat:'mana',kind:'flat',value:100000},{stat:'life',kind:'flat',value:100000}]);p.fillResources();const advance=seconds=>{for(let t=0;t<seconds;t+=1/60)update(1/60);};const start=nodes=>{w.frameArts.dismissFrame(p,inst);w.frameArts.clear();p.casting=null;p.cooldowns.clear();p.useLock=0;p.fillResources();w.actors=[p];w.projectiles=[];w.zones=[];w.flashes=[];inst.treeNodes=nodes;w.executeSkill(p,inst,p.pos);return w.actors.find(a=>!a.dead&&a.owner===p);};window.__golemQA={w,p,inst,advance,start};const a=start(['keepers_bulwark','close_guard','bone_stand','warding_reach']);p.facing=0;advance(.1);__game.step(1);})()");
  assert.equal(await run("__golemQA.w.actors.find(a=>a.summonShell).shellGuard.side"),'rear');await capture('bone-golem-worn-frame');

  await run("window.__frameAtlas=document.createElement('canvas');__frameAtlas.width=1120;__frameAtlas.height=920;window.__frameInk=__frameAtlas.getContext('2d');__frameInk.fillStyle='#171f25';__frameInk.fillRect(0,0,1120,920);__frameInk.fillStyle='#e6dec8';__frameInk.font='bold 27px sans-serif';__frameInk.fillText('LIVING OSSUARY',30,42);__frameInk.font='16px sans-serif';__frameInk.fillStyle='#a8bbb9';__frameInk.fillText('A bone guardian around its master. The forward opening follows your facing.',30,72);void 0");
  const frameTile=async(index,label)=>{await wait(120);await run("(()=>{const c=document.getElementById('game'),x=30+"+index+"*275;__frameInk.drawImage(c,c.width/2-85,c.height/2-85,170,170,x,108,240,240);__frameInk.fillStyle='#e6dec8';__frameInk.font='16px sans-serif';__frameInk.fillText("+JSON.stringify(label)+",x,378);})()");};
  await frameTile(0,'Forward opening');
  const directions=[];
  for(const angle of [0,-Math.PI/2,Math.PI,Math.PI/2]){
   await run("(()=>{const q=__golemQA,a=q.w.actors.find(a=>a.summonShell);q.p.facing=q.p.facingPrev=a.facing=a.facingPrev="+angle+";__game.step(2);})()");
   directions.push(await run("document.getElementById('game').toDataURL()"));
   if(angle===-Math.PI/2)await frameTile(1,'Turns with you');
  }
  assert.equal(new Set(directions).size,4,'guardian geometry follows all four facings');
  await run("(()=>{const q=__golemQA,a=q.w.actors.find(a=>a.summonShell);q.p.facing=q.p.facingPrev=a.facing=a.facingPrev=0;a.shellGuard.broken=true;a.shellGuard.pool=0;__game.step(2);})()");
  await capture('bone-golem-shell-broken');await frameTile(2,'Shattered bones');
  await run("(()=>{const a=__golemQA.w.actors.find(a=>a.summonShell);a.shellGuard.pool=a.shellGuard.max*a.shellGuard.reformFraction*.85;__game.step(2);})()");
  await frameTile(3,'Bones reassembling');
  await run("(()=>{const a=__golemQA.w.actors.find(a=>a.summonShell);a.shellGuard.broken=false;a.shellGuard.pool=a.shellGuard.max;__game.step(2);})()");
  await run("(()=>{const q=__golemQA;for(let i=0;i<3;i++){const a=q.w.createMonster('skeleton_warrior',1,'player');a.owner=q.p;a.pos={x:q.p.pos.x-60-i*25,y:q.p.pos.y+(i-1)*50};q.w.actors.push(a);}q.w.useMetaSkill(q.p,q.inst,{x:q.p.pos.x+400,y:q.p.pos.y});q.advance(.6);__game.step(1);})()");
  assert.equal(await run("__golemQA.w.actors.filter(a=>a.frameCharging).length"),3);await capture('bone-golem-rampart-wave');

  await run("(()=>{const c=document.getElementById('game');__frameInk.fillStyle='#e6dec8';__frameInk.font='19px sans-serif';__frameInk.fillText('RAMPART WAVE',30,426);__frameInk.font='15px sans-serif';__frameInk.fillStyle='#a8bbb9';__frameInk.fillText('A projected bone vanguard leads the protected melee escort.',30,452);__frameInk.drawImage(c,270,225,650,260,30,470,1040,416);})()");
  fs.writeFileSync(path.join(dir,'bone-golem-visual-study.png'),Buffer.from(await run("__frameAtlas.toDataURL('image/png').split(',')[1]"),'base64'));
  await run("(()=>{const q=__golemQA,a=q.start(['keepers_bulwark','renewing_frame']);a.pos={x:q.p.pos.x+110,y:q.p.pos.y-35};a.life=a.maxLife()*.4;q.w.useSkill(q.p,q.inst,q.p.pos,true);q.advance(.6);__game.step(2);})()");
  assert.equal(await run("__golemQA.w.frameArts.bodyPresentation(__golemQA.w.actors.find(a=>a.frameState)).mode"),'repair');
  await capture('bone-golem-repair');
  await run("(()=>{const q=__golemQA,a=q.start(['keepers_bulwark','renewing_frame','sheltering_bones','adamant_frame']);q.p.life=q.p.maxLife()*.5;q.p.useLock=0;q.w.useSkill(q.p,q.inst,q.p.pos,true);q.advance(1);__game.step(1);__game.ui.openSkillTree('summon_bone_golem');__game.ui.refreshSkillTree('summon_bone_golem');})()");
  assert.equal(await run("__golemQA.w.slotFaceOf(__golemQA.p,__golemQA.inst).id"),'frame_reknit');
  assert.equal(await run("document.querySelectorAll('#skill-tree-summon_bone_golem [data-frame-dismiss]').length"),0);
  await run("document.querySelector('#skill-tree-summon_bone_golem circle[data-node=\"renewing_frame\"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))");
  assert.equal(await run("document.querySelector('.choice-popup').getAttribute('aria-label')"),'Reknitting Frame');
  assert.equal(await run("document.querySelector('[data-st-action=\"dismissFrame\"]').disabled"),false);await capture('bone-golem-reknit-control');
  await run("document.querySelector('[data-st-action=\"dismissFrame\"]').click()");
  assert.equal(await run("__golemQA.p.summonToggles.has(__golemQA.inst.def.id)"),false);
  assert.equal(await run("__golemQA.p.casting"),null);
  await run("document.querySelector('#skill-tree-summon_bone_golem circle[data-node=\"renewing_frame\"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))");
  assert.equal(await run("document.querySelector('[data-st-action=\"dismissFrame\"]').disabled"),true);
  assert.equal(await run("__golemQA.inst.treeNodes.length"),4);

  await run("(()=>{__game.ui.hideAll();const q=__golemQA,a=q.start(['keepers_bulwark','renewing_frame','sheltering_bones','adamant_frame']);a.pos={x:q.p.pos.x+80,y:q.p.pos.y};const e=q.w.createMonster('zombie',1,'enemy');e.pos={x:q.p.pos.x+370,y:q.p.pos.y};q.w.actors.push(e);a.life=0;q.w.kill(a,false,e);q.advance(.15);__game.step(2);})()");
  assert.equal(await run("__golemQA.w.frameArts.bodyPresentation(__golemQA.w.actors.find(a=>a.frameState)).mode"),'terminal');
  await capture('bone-golem-reliquary-charge');

  // Deliberately start turned away, then inspect the rendered charge bearing.
  for(const [label,nodes,heading] of [
   ['bone-golem-rush-facing',['keepers_bulwark','close_guard','warding_reach'],-Math.PI/2],
   ['bone-golem-crush-facing',['osseous_might','great_bones','ossuary_commander','marrow_bruiser'],Math.PI],
  ]){
   const pose=await run("(()=>{const q=__golemQA,a=q.start("+JSON.stringify(nodes)+"),heading="+heading+";a.facing=a.facingPrev=heading-.4;const aim={x:a.pos.x+Math.cos(heading)*400,y:a.pos.y+Math.sin(heading)*400};q.w.useMetaSkill(q.p,q.inst,aim);q.advance(.55);__game.step(1);return {facing:a.facing,charging:!!a.frameCharging||!!a.frameState.order};})()");
   assert.ok(pose.charging);
   assert.ok(Math.abs(Math.atan2(Math.sin(pose.facing-heading),Math.cos(pose.facing-heading)))<.02,label);
   await capture(label);
  }
  assert.deepEqual(errors,[]);console.log('Bone Golem UI PASS: responsive four-point tree, forward opening, articulated guardian, four facings, broken/reforming bones, projected escort, repair, terminal charge and dismissal');
 }finally{clearTimeout(timeout);win.destroy();server.server.close();app.quit();}
}).catch(error=>{console.error(error);app.exit(1);});
