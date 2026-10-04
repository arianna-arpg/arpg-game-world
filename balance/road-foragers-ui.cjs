// Controlled prepared patrol; ordinary native skill input, not an earned playthrough.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),tag='road-foragers';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 let root=path.join(dir,'road-foragers-dist');
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
 const state=()=>{const w=__game.world(),m=w.massRuntime,enemies=m.snapshot(w).enemies;
  const groups=new Map();for(const e of enemies)if(e.encounterGroup){const id=e.encounterGroup.id;groups.set(id,[...(groups.get(id)||[]),e.id].sort());}
  return {seed:m.generator.run.seed,pos:w.player.pos,life:w.player.life,items:w.meta.items,
  enemies:enemies.map(e=>e.encounterGroup?{...e,encounterGroup:{...e.encounterGroup,id:groups.get(e.encounterGroup.id)}}:e),claims:m.state.snapshot().claims};};
 const save=async()=>{await run(async()=>{__game.save();await new Promise(r=>setTimeout(r,250));});return run(state);};
 const resume=async()=>{await win.loadURL(url);await boot();await run(async()=>{
  for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
  const b=document.querySelector('#sm-continue:not([disabled])');if(!b)throw Error('No Continue');b.click();__game.ui.hideAll();
 });return run(state);};
 const prepare=async()=>run(()=>{
  __game.devStartRun('magician');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);
  const m=w.massRuntime,p=m.journey.places.find(p=>p.content==='cinderwatch'),q=m.journey.local(p);
  w.landPartyAt({x:q.x,y:q.y+180});m.update(w,true);w.player.invulnerable=true;
  // Isolated native cohort: prepared foes remain alive beyond the experiment.
  for(const a of w.actors)if(a.team==='enemy'&&!a.passive&&!a.encounterGroup){a.pos={x:q.x+5000,y:q.y+5000};a.aiAnchor={...a.pos};}
  return {site:m.localSite(w.player.pos),group:w.actors.filter(a=>a.encounterGroup?.recipe==='gnoll_road_foragers').map(a=>({def:a.defId,name:a.name,leader:!!a.squadLeader}))};
 });
 const fire=async(leaderOnly)=>run(leaderOnly=>{
  const w=__game.world(),group=w.actors.filter(a=>a.encounterGroup?.recipe==='gnoll_road_foragers'),target=group.find(a=>!a.dead&&(!leaderOnly||a.squadLeader));
  if(!target)throw Error('Missing native target');
  // Prepared shooting position after pursuit/cover; no claim of an earned fight.
  if(!leaderOnly){for(let i=0;i<16;i++){const angle=i*Math.PI/8,p={x:target.pos.x+Math.cos(angle)*140,y:target.pos.y+Math.sin(angle)*140};
   if(w.walk.isWalkable(p.x,p.y)&&!w.pointInSolid(p.x,p.y,w.player.radius)&&w.lineOfSight(p,target.pos)){w.landPartyAt(p);break;}}}
  w.player.invulnerable=true;let frames=0;
  try{__game.devInput(()=>({dx:0,dy:0,aim:target.pos,held:target.defId==='gnoll_bonepicker'?[false,false,true]:[true,false,false],edge:[]}));
   while(!target.dead&&frames<900){__game.step(1);frames++;}
  }finally{__game.devInput(null);}
  return {frames,def:target.defId,dead:target.dead,life:target.life,distance:Math.hypot(target.pos.x-w.player.pos.x,target.pos.y-w.player.pos.y),sight:w.lineOfSight(w.player.pos,target.pos),mana:w.player.mana,group:group.map(a=>({def:a.defId,dead:a.dead,morale:Math.max(0,a.aiMoraleUntil-w.time)})),fatal:__game.crash().fatal};
 },leaderOnly);
 try{
  await win.loadURL(url);await boot();const entry=await prepare();assert.equal(entry.group.length,3);await shot('arrival');
  await run(()=>__game.step(80));await shot('engaged');
  const first=await fire(true);assert.ok(first.dead);assert.equal(first.fatal,null);assert.ok(first.group.some(a=>!a.dead&&a.morale>0));await shot('leader-fallen');
  const partial=await save();assert.deepEqual(await resume(),partial);await shot('wounded-continue');
  const checkpoint=await run(()=>__game.world().massRuntime.snapshot(__game.world()));
  win.setSize(800,600);await new Promise(r=>setTimeout(r,150));await run(()=>__game.ui.folioSync());await shot('narrow');
  win.setSize(1280,850);await new Promise(r=>setTimeout(r,150));await run(()=>__game.ui.folioSync());
  const rest=[];for(let i=0;i<2;i++){const r=await fire(false);if(!r.dead){console.log(JSON.stringify(r));await shot('stalled-'+i);}assert.ok(r.dead);rest.push(r);await shot('survivor-'+i);}
  const cleared=await run(()=>{const w=__game.world(),m=w.massRuntime,p=m.journey.places.find(p=>p.content==='cinderwatch');m.update(w,true);return {cleared:m.siteCleared(p.id),text:m.siteActivity(p.id)?.text,fatal:__game.crash().fatal};});
  assert.ok(cleared.cleared);assert.equal(cleared.fatal,null);
  const paid=await save();assert.deepEqual(await resume(),paid);await shot('cleared-continue');
  root=path.join(dir,'objective-readout-dist');await win.loadURL(url);await boot();
  const refused=await run(s=>{
   __game.devStartRun('magician');__game.ui.hideAll();const w=__game.world(),before=w.massRuntime;
   try{w.startWorldMass(s.state.run.seed,s);return {refused:false};}
   catch(e){return {refused:true,error:e.message,same:before===w.massRuntime};}
  },checkpoint);
  assert.ok(refused.refused&&refused.same);assert.match(refused.error,/formation recipe/);
  await run(()=>{__game.devStartRun('magician');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);const m=w.massRuntime,p=m.journey.places.find(p=>p.content==='cinderwatch');w.landPartyAt(m.journey.local(p));m.update(w,true);});
  const legacy=await save();root=current;assert.deepEqual(await resume(),legacy);
  assert.equal(await run(()=>__game.world().massRuntime.config.content.find(c=>c.id==='cinderwatch').count),2);
  assert.equal(await run(()=>__game.world().actors.some(a=>a.encounterGroup?.recipe==='gnoll_road_foragers')),false);await shot('legacy-continue');
  results.push({entry,first,rest,cleared,refused,currentContinue:true,legacyPreserved:true});
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify(results,null,2));
  console.log('PASS native mixed patrol, ordinary Firebolt/Chain Lightning defeat leader and survivors, visible morale response, wounded/cleared Continue, narrow view, actual prior refusal and unchanged prior camp');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
