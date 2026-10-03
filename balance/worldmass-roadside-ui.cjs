// Native roadside combat and exact Continue, separate from leisure review.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),legacy=process.env.HOLLOW_WAKE_QA_LEGACY==='1',tag=legacy?'worldmass-roadside-before':'worldmass-roadside';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 let root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/worldmass-roadside-dist');
 const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');fs.createReadStream(f).pipe(res);
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port,win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async(fn,...args)=>{
  const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');
  if(!r.ok)throw Error(r.error);return r.value;
 };
 const shot=async name=>{
  await run(()=>__game.renderer.render(__game.world()));
  const png=await run(()=>document.getElementById('game').toDataURL());fs.writeFileSync(path.join(dir,tag+'-'+name+'-canvas.png'),Buffer.from(png.split(',')[1],'base64'));
  win.webContents.invalidate();await new Promise(r=>setTimeout(r,100));fs.writeFileSync(path.join(dir,tag+'-'+name+'.png'),(await win.webContents.capturePage()).toPNG());
 };
 const boot=async()=>run(async()=>{
  window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});await new Promise(r=>setTimeout(r,200));
 });



 const current=root,timer=setTimeout(()=>app.exit(1),240000),results=[];
 const state=()=>{const w=__game.world(),m=w.massRuntime;return {seed:m.generator.run.seed,pos:w.player.pos,
  roads:m.roadside?.places??[],enemies:m.snapshot(w).enemies,fallen:m.state.snapshot().claims.filter(c=>c[0]==='fallen')};};
 const save=async()=>{await run(async()=>{__game.save();await new Promise(r=>setTimeout(r,220));});return run(state);};
 const resume=async()=>{await win.loadURL(url);await boot();await run(async()=>{
  for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
  const b=document.querySelector('#sm-continue:not([disabled])');if(!b)throw Error('No native Continue');b.click();__game.ui.hideAll();
 });return run(state);};
 try{
  await win.loadURL(url);await boot();await run(()=>{__game.devStartRun('magician');__game.ui.hideAll();__game.world().startWorldMass(42);__game.world().player.invulnerable=true;});
  const start=await run(()=>{
   const w=__game.world(),m=w.massRuntime;
   const road=m.roadside.places.find(p=>m.populationFor(p).level<=2)||m.roadside.places[0];if(!road)throw Error('No road encounter');
   const q=m.roadside.local(road);w.landPartyAt(q);m.update(w,true);
   const ids=[0,1].map(i=>JSON.stringify([road.id,i])),actors=ids.map(id=>m.natives.get(id));
   if(actors.some(a=>!a))throw Error('Roadside body missing');
   const target=actors.find(a=>a.team==='enemy'&&!a.dead);if(!target)throw Error('No hostile target in fixed sample');
   const targetId=ids[actors.indexOf(target)],spot=w.findFreeSpot({x:q.x+120,y:q.y},w.player.radius);
   w.landPartyAt(spot);__game.renderer.render(w);
   return {id:road.id,ids,targetId,positions:m.roadside.places.map(p=>({...m.roadside.local(p),content:p.content})),
    target:target.defId,life:target.life,level:target.level,site:m.localSite(q),q,fatal:__game.crash().fatal};
  });
  assert.equal(start.site,null);assert.equal(start.fatal,null);await shot('approach');
  const hit=await run(id=>{
   const w=__game.world(),m=w.massRuntime,a=m.natives.get(id),before=a.life;let frames=0;
   try{__game.devInput(()=>({dx:0,dy:0,aim:a.pos,held:[false,false,true],edge:[]}));
    while(a.life>=before&&!a.dead&&frames++<240)__game.step(1);
   }finally{__game.devInput(null);}
   return {frames,before,after:a.life,dead:a.dead,cast:w.player.casting?.inst.def.id,skills:w.player.skills.map(s=>s?.def.id),mana:w.player.mana,time:w.time,hero:w.player.pos,target:a.pos,paused:w.paused,fatal:__game.crash().fatal};
  },start.targetId);
  assert.equal(hit.fatal,null);assert.ok(hit.frames<240&&hit.after<hit.before&&!hit.dead);await shot('native-hit');
  const saved=await save();assert.deepEqual(await resume(),saved);
  results.push({start,hit,woundedContinue:true});
  const killed=await run(ids=>{
   const w=__game.world(),m=w.massRuntime,before=w.meta.xp;
   for(const id of ids){const a=m.natives.get(id);if(a&&!a.dead)w.kill(a,false,w.player);}
   m.update(w,true);
   return {fallen:ids.every(id=>m.state.claimed('fallen',id)),cache:w.chests.some(c=>c.rewardSource===JSON.stringify([JSON.parse(ids[0])[0],'cache'])),
    xpBefore:before,xpAfter:w.meta.xp,fatal:__game.crash().fatal};
  },start.ids);
  assert.ok(killed.fallen);assert.equal(killed.cache,false);assert.equal(killed.fatal,null);
  await shot('cleared');const dead=await save();assert.deepEqual(await resume(),dead);
  results.push({killed,deadContinue:true});
  const checkpoint=await run(()=>__game.world().massRuntime.snapshot(__game.world()));assert.equal(checkpoint.schema,3);
  root=path.resolve(__dirname,'reports','buff-readout-dist');await win.loadURL(url);await boot();
  const refusal=await run(s=>{
   __game.devStartRun('magician');__game.ui.hideAll();const w=__game.world(),before=w.massRuntime;
   try{w.startWorldMass(s.state.run.seed,s);return {refused:false};}
   catch(e){return {refused:/Invalid worldmass checkpoint/.test(e.message),same:before===w.massRuntime};}
  },checkpoint);assert.deepEqual(refusal,{refused:true,same:true});
  await run(()=>{__game.devStartRun('magician');__game.ui.hideAll();__game.world().startWorldMass(81);});
  assert.equal(await run(()=>__game.world().massRuntime.snapshot(__game.world()).schema),2);
  const legacy=await save();assert.equal(legacy.roads.length,0);root=current;assert.deepEqual(await resume(),legacy);
  await shot('legacy-continue');results.push({olderClientRefusedBeforeMutation:true,legacyContinueWithoutRoads:true});
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({groups:start.positions.length,target:start.target,hit,woundedContinue:true,killed,deadContinue:true,olderClientRefusedBeforeMutation:true,legacyContinueWithoutRoads:true}));
  console.log('PASS actual native road encounter/cast, wound and death Continue, ordinary rewards without site cache, older-client refusal and unchanged actual legacy Continue');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
