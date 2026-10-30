const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');
app.setPath('userData',path.join(dir,'formations-profile-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/formations-dist');
 const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');fs.createReadStream(f).pipe(res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async(fn,...args)=>{
  const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');
  if(!r.ok)throw Error(r.error);return r.value;
 };
 const shot=async(name)=>{
  const png=await run(()=>document.getElementById('game').toDataURL('image/png'));
  fs.writeFileSync(path.join(dir,'formations-'+name+'.png'),Buffer.from(png.split(',')[1],'base64'));
 };
 const timer=setTimeout(()=>app.exit(1),180000);
 try{

  const url='http://127.0.0.1:'+server.address().port;await win.loadURL(url);
  const natural=await run(async()=>{
   window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[],configurable:true});
   await new Promise(r=>setTimeout(r,200));__game.devStartRun('magician');__game.ui.hideAll();
   const w=__game.world();w.startWorldMass(42);w.landPartyAt({x:-12277.66168867005,y:-3762.7512638410553});
   w.massRuntime.update(w,true);__game.renderer.render(w);
   return {seed:w.massRuntime.generator.run.seed,members:w.actors.filter(a=>a.encounterGroup?.recipe==='spear_net')
     .map(a=>({monster:a.defId,level:a.level,slot:a.encounterGroup.slot,pos:a.pos})),fatal:__game.crash().fatal};
  });
  assert.equal(natural.members.length,4);assert.ok(natural.members.every(a=>a.level===7));
  assert.equal(natural.fatal,null);await shot('country');
  const setup=await run(async()=>{
   window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
   await new Promise(r=>setTimeout(r,200));__game.devStartRun('magician');__game.ui.hideAll();
   const w=__game.world();w.startWorldMass(42);const C=w.massRuntime.constructor,c=JSON.parse(JSON.stringify(w.massRuntime.config));
   const encounters=c.content.find(c=>c.id==='tundra').levels.find(p=>p.level===4).encounters;
   if(!encounters)throw Error('No native tundra formation');encounters.chance=1;
   delete c.settlement;delete c.journey;delete c.ecology;delete c.progression;
   delete c.terrain.patches;
   c.terrain.fields=[];c.terrain.surfaces=[{id:'plain',source:'qa/plain',priority:0,when:[],region:'ground',color:'#424b32',biome:'tundra'}];
   c.terrain.places=[{id:'formation',version:1,content:'formation',period:1200,chance:1,radius:240,jitter:0,priority:1,when:[]}];
   c.content=[{id:'formation',source:'qa/native-goblin',level:4,count:2,table:[{id:'plains_wolf',weight:1}],encounters}];
   c.populationRadius=1000;c.startRadius=0;c.maxPopulation=4;
   new C(42,'formations-client',c).attach(w);
   const crew=w.actors.filter(a=>a.encounterGroup),leader=crew.find(a=>a.squadLeader);
   if(crew.length!==4||!leader)throw Error('Incomplete group');
   const center={x:crew.reduce((n,a)=>n+a.pos.x,0)/4,y:crew.reduce((n,a)=>n+a.pos.y,0)/4};
   w.landPartyAt({x:center.x,y:center.y+200});w.player.invulnerable=true;
   window.__formationQA={crew,leader,hero:w.player,loads:0,casts:[],start:crew.map(a=>({...a.pos}))};
   const load=w.loadZone;w.loadZone=function(...args){__formationQA.loads++;return load.apply(this,args);};
   const use=w.useSkill;w.useSkill=function(a,s,...args){const ok=use.call(this,a,s,...args);
    if(ok&&__formationQA.crew.includes(a))__formationQA.casts.push({monster:a.defId,skill:s.def.id});return ok;};
   __game.renderer.render(w);
   return {members:crew.map(a=>({monster:a.defId,slot:a.encounterGroup.slot,life:a.life,pos:a.pos,leader:a.squadLeader})),
    ids:[...new Set(crew.map(a=>a.squadId))],hero:{...w.player.pos}};
  });
  assert.equal(setup.members.length,4);assert.equal(setup.ids.length,1);await shot('formation');
  await run(()=>__game.devInput(()=>({dx:0,dy:0,aim:{...__formationQA.leader.pos},held:[true],edge:[]})));
  const samples=[];
  for(let i=0;i<24;i++){
   samples.push(await run(()=>{
    __game.step(25);const w=__game.world(),q=__formationQA;
    return {time:w.time,hero:{...w.player.pos},life:w.player.life,projectiles:w.projectiles.length,
      crew:q.crew.map(a=>({monster:a.defId,life:a.life,pos:{...a.pos},dead:a.dead,phase:a.aiPhase}))};
   }));
   if(i===7||i===15||i===23)await shot('combat-'+i);
  }
  const result=await run(()=>{
   const w=__game.world(),q=__formationQA;
   __game.devInput(()=>({dx:0,dy:0,aim:{...q.leader.pos},held:[],edge:[]}));
   // Controlled casualty and wound test, separate from the combat just observed.
   if(!q.leader.dead)w.kill(q.leader,false,w.player);
   const survivor=q.crew.find(a=>!a.dead);if(!survivor)throw Error('No survivor');
   survivor.life=survivor.maxLife()*.41;w.massRuntime.update(w,true);
   __game.renderer.render(w);
   return {casts:q.casts,loads:q.loads,sameHero:w.player===q.hero,
    moved:q.crew.filter((a,i)=>Math.hypot(a.pos.x-q.start[i].x,a.pos.y-q.start[i].y)>5).length,
    checkpoint:w.massRuntime.snapshot(w),fatal:__game.crash().fatal};
  });
  assert.ok(result.casts.length>0);assert.ok(result.moved>0);assert.equal(result.loads,0);
  assert.ok(result.sameHero);assert.equal(result.fatal,null);await shot('survivors');
  await run(async()=>{__game.save();await new Promise(r=>setTimeout(r,250));});
  await win.loadURL(url);
  await run(async()=>{window.requestAnimationFrame=()=>0;await new Promise(r=>setTimeout(r,200));
   for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
   document.querySelector('#sm-continue:not([disabled])').click();__game.ui.hideAll();__game.renderer.render(__game.world());});
  const continued=await run(()=>({checkpoint:__game.world().massRuntime.snapshot(__game.world()),fatal:__game.crash().fatal}));
  const stable=save=>save.enemies.map(e=>({...e,encounterGroup:e.encounterGroup?{...e.encounterGroup,id:0}:undefined}));
  assert.deepEqual(stable(continued.checkpoint),stable(result.checkpoint));
  assert.deepEqual(continued.checkpoint.config,result.checkpoint.config);assert.equal(continued.fatal,null);
  await shot('continued');
  const report={natural,setup,samples,result,continued};
  fs.writeFileSync(path.join(dir,'formations-world-ui.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({casts:result.casts,moved:result.moved,loads:result.loads,survivors:continued.checkpoint.enemies.length,fatal:continued.fatal}));
  console.log('PASS native formation combat, unchanged hero/world, controlled casualties/wounds and exact browser Continue');

  clearTimeout(timer);win.destroy();server.close();app.exit(0);
 }catch(e){console.error(e.stack||e);clearTimeout(timer);win.destroy();server.close();app.exit(1);}
});
