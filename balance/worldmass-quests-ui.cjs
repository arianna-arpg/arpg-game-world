// Controlled native quest lifecycle and actual UI; this is separate from ordinary-input criticism.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');app.setPath('userData',path.join(dir,'place-quests-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const current=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/place-quests-dist');let root=current;
 const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');fs.createReadStream(f).pipe(res);
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port;
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async(fn,...args)=>{
  const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');
  if(!r.ok)throw Error(r.error);return r.value;
 };
 const shot=async name=>{
  const png=await run(()=>document.getElementById('game').toDataURL());fs.writeFileSync(path.join(dir,'place-quests-'+name+'-canvas.png'),Buffer.from(png.split(',')[1],'base64'));
  await new Promise(r=>setTimeout(r,100));fs.writeFileSync(path.join(dir,'place-quests-'+name+'.png'),(await win.webContents.capturePage()).toPNG());
 };
 const read=()=> {
  const w=__game.world(),m=w.massRuntime;
  return {quests:w.activeQuests,completed:[...w.completedQuests],pos:{...w.player.pos},config:m.config,
   seed:m.generator.run.seed,log:w.questLog(),offers:w.questRewardOffers(),fatal:__game.crash().fatal};
 };
 const save=async()=>{await run(async()=>{__game.ui.hideAll();__game.save();await new Promise(r=>setTimeout(r,220));});return run(read);};
 const resume=async()=>{
  await win.loadURL(url);await run(async()=>{
   window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
   for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
   const b=document.querySelector('#sm-continue:not([disabled])');if(!b)throw Error('No Continue');b.click();__game.ui.hideAll();
  });return run(read);
 };
 const boot=async()=>{await win.loadURL(url);await run(async()=>{
  window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
  await new Promise(r=>setTimeout(r,200));__game.devStartRun('warrior');__game.ui.hideAll();__game.world().startWorldMass(42);
 });};
 const timer=setTimeout(()=>app.exit(1),240000),results={};
 try{
  await boot();
  const accepted=await run(()=>{
   const w=__game.world(),m=w.massRuntime,npc=w.actors.find(a=>a.defId==='townsfolk_innkeep'),zones=Object.keys(w.zoneMap);
   w.landPartyAt(npc.pos,{tier:npc.tier});w.player.invulnerable=true;
   __game.devInput(()=>({dx:0,dy:0,aim:w.player.pos,held:[],edge:[]}));__game.step(210);__game.devInput(null);
   __game.ui.hideAll();__game.ui.openMapTab('map');__game.step(1);
   const panel=document.getElementById('world-map'),directions=panel.querySelector('[data-mass-quest-directions]');
   return {quests:w.activeQuests,zonesUnchanged:JSON.stringify(zones)===JSON.stringify(Object.keys(w.zoneMap)),
    directions:directions?.textContent,placePins:panel.querySelectorAll('[data-mass-quest]').length,
    fatal:__game.crash().fatal};
  });
  assert.equal(accepted.quests.length,1);assert.ok(accepted.quests[0].placeId);assert.ok(accepted.zonesUnchanged);
  assert.match(accepted.directions,/Cinderwatch Camp/);assert.equal(accepted.placePins,1);assert.equal(accepted.fatal,null);
  results.accepted=accepted;await shot('directions');
  const savedAccepted=await save(),continuedAccepted=await resume();assert.deepEqual(continuedAccepted,savedAccepted);
  const partial=await run(()=>{
   const w=__game.world(),m=w.massRuntime,p=m.journey.places.find(p=>p.id===w.activeQuests[0].placeId);
   w.player.invulnerable=true;w.landPartyAt(m.journey.local(p));m.update(w,true);
   w.kill(m.natives.get(JSON.stringify([p.id,0])),false,w.player);m.update(w,true);
   __game.ui.openMapTab('quests');__game.step(1);
   return {quest:w.activeQuests[0],text:document.getElementById('world-map').textContent};
  });
  assert.equal(partial.quest.fieldDone,false);assert.match(partial.text,/Western Watch/);
  results.partial=partial;await shot('partial-journal');
  const savedPartial=await save(),continuedPartial=await resume();assert.deepEqual(continuedPartial,savedPartial);
  const done=await run(()=>{
   const w=__game.world(),m=w.massRuntime,p=m.journey.places.find(p=>p.id===w.activeQuests[0].placeId);
   w.kill(m.natives.get(JSON.stringify([p.id,1])),false,w.player);m.update(w,true);
   __game.ui.openMapTab('map');__game.step(1);
   return {quest:w.activeQuests[0],directions:document.querySelector('[data-mass-quest-directions]')?.textContent,offers:w.questRewardOffers()};
  });
  assert.ok(done.quest.fieldDone);assert.match(done.directions,/Return to Mireille/);assert.equal(done.offers.length,0);
  results.done=done;await shot('return-directions');
  const walk=await run(()=>{
   __game.ui.hideAll();const w=__game.world(),m=w.massRuntime,p=m.journey.places.find(p=>p.id===w.activeQuests[0].placeId);
   const trail=m.journey.trails.find(t=>t.id===p.id+'/approach'),hero=w.player,load=w.loadZone;let loads=0,frames=0;
   w.loadZone=function(...args){loads++;return load.apply(this,args);};w.player.invulnerable=true;
   try{
    for(const target of [...trail.points].reverse()){
     let spent=0;__game.devInput(()=>({dx:target.x-w.player.pos.x,dy:target.y-w.player.pos.y,aim:target,held:[],edge:[]}));
     while(Math.hypot(target.x-w.player.pos.x,target.y-w.player.pos.y)>(target===trail.points[0]?4:20)&&spent++<400){__game.step(1);frames++;}
     if(spent>=400)throw Error('Promised return road stalled '+JSON.stringify({target,pos:w.player.pos}));
    }
   }finally{__game.devInput(null);w.loadZone=load;}
   return {frames,loads,pos:{...w.player.pos},sameHero:w.player===hero,town:m.settlement.contains(w.player.pos.x,w.player.pos.y),quest:w.activeQuests[0]};
  });
  console.log('Return walk',JSON.stringify(walk));
  assert.equal(walk.loads,0);assert.ok(walk.sameHero&&walk.town&&walk.quest.fieldDone);results.walk=walk;
  await run(()=>{
   const w=__game.world(),npc=w.actors.find(a=>a.defId==='townsfolk_innkeep');
   // Controlled counter placement isolates the reward UI; the entire return
   // approach above uses actual native movement with AI and collision active.
   w.landPartyAt(npc.pos,{tier:npc.tier});__game.step(210);__game.ui.hideAll();__game.ui.openMapTab('quests');__game.step(1);
  });
  const choices=await run(()=>({offers:__game.world().questRewardOffers(),buttons:[...document.querySelectorAll('[data-quest-reward]')].map(b=>({id:b.dataset.rewardChoice,text:b.textContent,rect:b.getBoundingClientRect().toJSON()}))}));
  assert.equal(choices.buttons.length,3);assert.ok(choices.buttons.every(b=>b.rect.width>0&&b.rect.y>=0&&b.rect.bottom<=850));
  assert.ok(choices.offers[0].choices.every(c=>c.lines.length));results.choices=choices;await shot('reward-choices');
  const savedReady=await save(),continuedReady=await resume();assert.deepEqual(continuedReady,savedReady);
  const reward=await run(()=>{
   const w=__game.world();__game.ui.openMapTab('quests');__game.step(1);
   const before={mana:w.player.sheet.get('mana'),regen:w.player.sheet.get('manaRegen')};
   document.querySelector('[data-quest-reward][data-reward-choice="spring"]').click();__game.step(1);
   const ring=w.meta.items.find(i=>i.name==='Wellspring Ring');if(!ring)throw Error('Chosen ring missing');
   w.requestMeta({t:'equipItem',uid:ring.uid});__game.step(1);
   __game.ui.hideAll();__game.ui.toggleInventory();__game.step(1);
   return {before,after:{mana:w.player.sheet.get('mana'),regen:w.player.sheet.get('manaRegen')},
    ring,quests:w.activeQuests,completed:[...w.completedQuests],fatal:__game.crash().fatal};
  });
  assert.ok(reward.after.mana>reward.before.mana&&reward.after.regen>reward.before.regen);
  assert.equal(reward.quests.length,0);assert.ok(reward.completed.includes('frontier_western_watch'));assert.equal(reward.fatal,null);
  results.reward=reward;await shot('earned-ring');
  const savedPaid=await save(),continuedPaid=await resume();assert.deepEqual(continuedPaid,savedPaid);
  results.persistence={accepted:true,partial:true,ready:true,paid:true};
  root=path.resolve(__dirname,'reports','ground-palette-dist');await boot();const legacy=await save();
  assert.equal(legacy.config.settlement.quests,undefined);
  root=current;const oldContinued=await resume();assert.deepEqual(oldContinued,legacy);
  results.legacy=true;
  fs.writeFileSync(path.join(dir,'place-quests-ui.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify({accepted:accepted.quests,walk,reward:reward.after,persistence:results.persistence,legacy:true}));
  console.log('PASS native automatic quest acceptance, real journal/map/reward buttons, continuous return walk, earned native ring, four browser checkpoints and actual prior-client omission');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
