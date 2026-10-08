// Controlled prepared escort/reward; ordinary native skills, not an earned playthrough.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),tag='caravan-watch';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 let root=path.join(dir,'caravan-watch-dist');
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
 const prepare=async(support=false)=>run(support=>{
  __game.devStartRun('magician');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);
  if(support){
   // Prepare a native carried support; the removed reward chooser is not involved.
   w.dropPinnedGem({...w.player.pos}, {...w.player.pos}, {k:'support',id:'arcing',l:1}, .5);
   const prepared=w.drops.pop();if(prepared?.item.kind!=='support')throw Error('No prepared support');
   w.grantSupportGemItem(w.localSeat,prepared.item.gem);
   const item=w.meta.items.find(i=>i.gem?.supportId==='arcing');
   if(!item||!w.socketSupport(item.uid,'firebolt'))throw Error('Cannot fit prepared Arcing');
  }
  const m=w.massRuntime,p=m.journey.places.find(p=>p.content==='caravan-wreck'),q=m.journey.local(p);
  w.landPartyAt(q);m.update(w,true);w.player.invulnerable=true;
  for(const a of w.actors)if(a.team==='enemy'&&!a.passive&&a.encounterGroup?.recipe!=='undead_caravan_watch'){
   // Leave actual older caravan defenders for the prior-layout control.
   if(m.garrisonName(a)==='The Silent Caravan')continue;
   a.pos={x:q.x+5000,y:q.y+5000};a.aiAnchor={...a.pos};
  }
  return {site:m.localSite(w.player.pos),group:w.actors.filter(a=>a.encounterGroup?.recipe==='undead_caravan_watch').map(a=>({def:a.defId,name:a.name,leader:!!a.squadLeader}))};
 },support);
 const castOnce=async()=>run(()=>{
  const w=__game.world(),group=w.actors.filter(a=>a.encounterGroup?.recipe==='undead_caravan_watch'),target=group.find(a=>a.defId==='skeleton_warrior');
  if(!target)throw Error('Missing sword');
  for(let i=0;i<32;i++){const t=i*Math.PI/16,p={x:target.pos.x+Math.cos(t)*145,y:target.pos.y+Math.sin(t)*145};
   if(w.walk.isWalkable(p.x,p.y)&&!w.pointInSolid(p.x,p.y,w.player.radius)&&w.lineOfSight(p,target.pos)){w.landPartyAt(p);break;}}
  const execute=w.executeSkill,resolve=w.resolveHit,hits=new Set();let casts=0;
  w.executeSkill=function(a,s,...args){if(a===w.player&&s.def.id==='firebolt')casts++;return execute.call(this,a,s,...args);};
  w.resolveHit=function(a,s,b,...args){const life=b.life,r=resolve.call(this,a,s,b,...args);if(a===w.player&&s.def.id==='firebolt'&&group.includes(b)&&b.life<life)hits.add(b.defId+':'+b.id);return r;};
  try{__game.devInput(()=>({dx:0,dy:0,aim:target.pos,held:[casts===0],edge:[]}));__game.step(240);}
  finally{__game.devInput(null);w.executeSkill=execute;w.resolveHit=resolve;}
  return {casts,hits:[...hits],fatal:__game.crash().fatal};
 });
 const finish=async()=>run(()=>{
  const w=__game.world(),group=w.actors.filter(a=>a.encounterGroup?.recipe==='undead_caravan_watch'),target=group.find(a=>!a.dead&&a.squadLeader)||group.find(a=>!a.dead);
  if(!target)return null;
  for(let i=0;i<32;i++){const t=i*Math.PI/16,p={x:target.pos.x+Math.cos(t)*120,y:target.pos.y+Math.sin(t)*120};
   if(w.walk.isWalkable(p.x,p.y)&&!w.pointInSolid(p.x,p.y,w.player.radius)&&w.lineOfSight(p,target.pos)){w.landPartyAt(p);break;}}
  w.player.invulnerable=true;let frames=0;
  try{__game.devInput(()=>({dx:0,dy:0,aim:target.pos,held:[false,false,true],edge:[]}));while(!target.dead&&frames<900){__game.step(1);frames++;}}
  finally{__game.devInput(null);}
  return {frames,def:target.defId,dead:target.dead,life:target.life,mana:w.player.mana,fatal:__game.crash().fatal};
 });
 try{
  root=path.join(dir,'formation-identity-dist');await win.loadURL(url);await boot();await prepare();await shot('prior-arrival');
  const old=await save();root=current;assert.deepEqual(await resume(),old);await shot('legacy-continue');
  assert.equal(await run(()=>__game.world().massRuntime.config.content.find(c=>c.id==='caravan-wreck').count),1);
  const entry=await prepare();assert.equal(entry.group.length,4);await shot('arrival');
  const plain=await castOnce();assert.equal(plain.casts,1);assert.equal(plain.hits.length,1);await shot('plain-shot');
  await prepare(true);const supported=await castOnce();assert.equal(supported.casts,1);assert.ok(supported.hits.length>plain.hits.length);await shot('arcing-shot');
  const heal=await run(()=>{
   const w=__game.world(),group=w.actors.filter(a=>!a.dead&&a.encounterGroup?.recipe==='undead_caravan_watch'),sword=group.find(a=>a.defId==='skeleton_warrior'),execute=w.executeSkill;
   sword.life=sword.maxLife()*.35;const before=sword.life;let mends=0;
   w.executeSkill=function(a,s,...args){if(group.includes(a)&&s.def.id==='soothing_touch')mends++;return execute.call(this,a,s,...args);};
   try{__game.step(480);}finally{w.executeSkill=execute;}
   return {before,after:sword.life,mends,fatal:__game.crash().fatal};
  });assert.ok(heal.mends>0&&heal.after>heal.before);await shot('mended');
  win.setSize(800,600);await new Promise(r=>setTimeout(r,150));await shot('narrow');
  win.setSize(1280,850);await new Promise(r=>setTimeout(r,150));
  const first=await finish();assert.ok(first?.dead);await shot('mender-fallen');
  const partial=await save();assert.deepEqual(await resume(),partial);await shot('wounded-continue');
  const checkpoint=await run(()=>__game.world().massRuntime.snapshot(__game.world()));
  const rest=[];for(let i=0;i<3;i++){const r=await finish();if(!r)break;if(!r.dead){console.log(JSON.stringify(r));await shot('stalled');}assert.ok(r.dead);rest.push(r);}
  const clear=await run(()=>{const w=__game.world(),m=w.massRuntime,p=m.journey.places.find(p=>p.content==='caravan-wreck');m.update(w,true);return {cleared:m.siteCleared(p.id),activity:m.siteActivity(p.id),fatal:__game.crash().fatal};});
  assert.ok(clear.cleared);assert.equal(clear.fatal,null);await shot('cleared');
  const paid=await save();assert.deepEqual(await resume(),paid);await shot('cleared-continue');
  root=path.join(dir,'formation-identity-dist');await win.loadURL(url);await boot();
  const refused=await run(s=>{__game.devStartRun('magician');__game.ui.hideAll();const w=__game.world(),before=w.massRuntime;
   try{w.startWorldMass(s.state.run.seed,s);return {refused:false};}catch(e){return {refused:true,error:e.message,same:before===w.massRuntime};}
  },checkpoint);assert.ok(refused.refused&&refused.same);assert.match(refused.error,/formation recipe/);
  results.push({entry,plain,supported,heal,first,rest,clear,refused,legacyPreserved:true,currentContinue:true});
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify(results,null,2));
  console.log('PASS native mixed escort, one-shot Arcing contrast, actual mending and native combat clearance, narrow view, wounded/cleared Continue, actual prior refusal and preserved older caravan');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
