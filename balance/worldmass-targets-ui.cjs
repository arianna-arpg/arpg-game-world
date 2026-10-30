// Controlled native contract/checkpoint verification. Ordinary-input criticism is separate.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');app.setPath('userData',path.join(dir,'target-contract-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const current=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/target-contract-dist');let root=current;
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
  const png=await run(()=>document.getElementById('game').toDataURL());fs.writeFileSync(path.join(dir,'target-contract-'+name+'-canvas.png'),Buffer.from(png.split(',')[1],'base64'));
  await new Promise(r=>setTimeout(r,100));fs.writeFileSync(path.join(dir,'target-contract-'+name+'.png'),(await win.webContents.capturePage()).toPNG());
 };
 const read=()=> {
  const w=__game.world(),m=w.massRuntime,p=m.journey.places.find(p=>p.recipe==='north-stoneward');
  const body=id=>{const a=m.natives.get(id);return a?{life:a.life,home:a.aiAnchor,skills:a.skills.map(s=>s&&({id:s.def.id,sockets:s.sockets.map(g=>g?.def.id)}))}:null;};
  return {quests:w.activeQuests,completed:[...w.completedQuests],pos:{...w.player.pos},bindings:m.config.settlement.quests?.bindings,
   guard:body(JSON.stringify([p.id,0])),escort:body(JSON.stringify([p.id,'fixture',0])),
   cleared:m.siteCleared(p.id),points:w.meta.passivePoints,xp:w.meta.xp,level:w.player.level,
   seed:m.generator.run.seed,log:w.questLog(),fatal:__game.crash().fatal};
 };
 const save=async()=>{await run(async()=>{__game.ui.hideAll();__game.save();await new Promise(r=>setTimeout(r,220));});return run(read);};
 const resume=async()=>{
  await win.loadURL(url);await run(async()=>{
   window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
   // Drain the already queued boot frame before Continue; overriding rAF alone cannot cancel it.
   await new Promise(r=>setTimeout(r,200));
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
   const w=__game.world(),m=w.massRuntime,npc=w.actors.find(a=>a.defId==='townsfolk_innkeep');
   w.player.invulnerable=true;w.landPartyAt(npc.pos,{tier:npc.tier});__game.step(210);
   if(!w.activeQuests.some(q=>q.questId==='frontier_western_watch'))throw Error('Western contract did not auto-accept');
   const p=m.journey.places.find(p=>p.recipe==='west-camp');w.landPartyAt(m.journey.local(p));m.update(w,true);
   for(let i=0;i<2;i++)w.kill(m.natives.get(JSON.stringify([p.id,i])),false,w.player);
   m.update(w,true);w.landPartyAt(npc.pos,{tier:npc.tier});__game.step(210);
   __game.ui.hideAll();__game.ui.openMapTab('quests');__game.step(1);
   const button=document.querySelector('[data-quest-reward][data-reward-choice="spring"]');
   if(!button)throw Error('Native return choice missing');button.click();__game.step(1);__game.ui.hideAll();
   // Controlled progression sets the later contract's level gate; both deeds
   // still use real native acceptance, return, UI choice and payout.
   for(let i=0;w.player.level<3&&i<100;i++)w.grantXp(10);
   __game.step(210);__game.ui.openMapTab('quests');__game.step(1);
   return {quests:w.activeQuests,completed:[...w.completedQuests],text:document.getElementById('world-map').textContent,fatal:__game.crash().fatal};
  });
  assert.equal(accepted.quests.length,1);assert.equal(accepted.quests[0].questId,'frontier_northern_watch');
  assert.ok(accepted.completed.includes('frontier_western_watch'));assert.match(accepted.text,/Stone Sentinel/);assert.equal(accepted.fatal,null);
  results.accepted=accepted;await shot('journal');
  await run(()=>{__game.ui.openMapTab('map');__game.step(1);});await shot('directions');
  const savedAccepted=await save();assert.deepEqual(await resume(),savedAccepted);
  const arrived=await run(()=>{
   const w=__game.world(),m=w.massRuntime,p=m.journey.places.find(p=>p.recipe==='north-stoneward');
   const trail=m.journey.trails.find(t=>t.id===p.id+'/approach');w.landPartyAt(trail.points[0]);w.player.invulnerable=true;__game.step(3);
   const hero=w.player,load=w.loadZone;let loads=0,frames=0;w.loadZone=function(...args){loads++;return load.apply(this,args);};
   try{for(const target of trail.points.slice(1)){
    __game.devInput(()=>({dx:target.x-w.player.pos.x,dy:target.y-w.player.pos.y,aim:target,held:[],edge:[]}));
    let spent=0;while(Math.hypot(target.x-w.player.pos.x,target.y-w.player.pos.y)>24&&spent++<900){__game.step(1);frames++;}
    if(spent>=900)throw Error('Northern route stalled '+JSON.stringify({target,pos:w.player.pos}));
   }}finally{__game.devInput(null);w.loadZone=load;}
   __game.step(2);return {frames,loads,sameHero:hero===w.player,site:m.localSite(w.player.pos),quest:w.activeQuests[0],fatal:__game.crash().fatal};
  });
  assert.equal(arrived.loads,0);assert.ok(arrived.sameHero);assert.equal(arrived.site.name,'The Stoneward');assert.equal(arrived.quest.fieldDone,false);
  results.arrived=arrived;await shot('arrival');
  await run(()=>{
   const w=__game.world(),m=w.massRuntime,p=m.journey.places.find(p=>p.recipe==='north-stoneward');
   m.natives.get(JSON.stringify([p.id,0])).life*=.6;
   __game.ui.openMapTab('quests');__game.step(1);
  });
  const wounded=await save();assert.ok(wounded.guard.life>0&&wounded.escort.life>0&&!wounded.quests[0].fieldDone);
  assert.deepEqual(await resume(),wounded);
  const ready=await run(()=>{
   const w=__game.world(),m=w.massRuntime,p=m.journey.places.find(p=>p.recipe==='north-stoneward'),beforePoints=w.meta.passivePoints;
   w.kill(m.natives.get(JSON.stringify([p.id,0])),false,w.player);m.update(w,true);
   __game.ui.openMapTab('quests');__game.step(1);
   return {quest:w.activeQuests[0],cleared:m.siteCleared(p.id),escortAlive:!m.natives.get(JSON.stringify([p.id,'fixture',0])).dead,
    pointsUnpaid:beforePoints===w.meta.passivePoints,text:document.getElementById('world-map').textContent};
  });
  assert.ok(ready.quest.fieldDone&&ready.escortAlive&&ready.pointsUnpaid);assert.equal(ready.cleared,false);assert.match(ready.text,/return to Mireille/i);
  results.ready=ready;await shot('return-journal');
  const savedReady=await save();assert.deepEqual(await resume(),savedReady);
  const paid=await run(()=>{
   const w=__game.world(),npc=w.actors.find(a=>a.defId==='townsfolk_innkeep'),pp=w.meta.passivePoints,level=w.player.level;
   w.player.invulnerable=true;w.landPartyAt(npc.pos,{tier:npc.tier});__game.step(210);
   return {before:pp,after:w.meta.passivePoints,levelBefore:level,levelAfter:w.player.level,completed:[...w.completedQuests],active:w.activeQuests};
  });
  assert.ok(paid.after>paid.before);assert.ok(paid.completed.includes('frontier_northern_watch'));assert.equal(paid.active.length,0);
  results.paid=paid;await shot('reward');
  const savedPaid=await save();assert.deepEqual(await resume(),savedPaid);
  // A genuine prior client writes the earlier west-only descriptor.
  root=path.resolve(__dirname,'reports','reward-description-dist');await boot();const legacy=await save();
  assert.equal(legacy.bindings.length,1);assert.equal(legacy.bindings[0].quest,'frontier_western_watch');
  root=current;assert.deepEqual(await resume(),legacy);
  results.persistence={accepted:true,wounded:true,ready:true,paid:true,priorClient:true};
  fs.writeFileSync(path.join(dir,'target-contract-ui.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify({arrived,ready,paid,persistence:results.persistence}));
  console.log('PASS native two-step contract UI, walked northern branch, target/escort distinction, deferred native point, four exact checkpoints and actual prior-client omission');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
