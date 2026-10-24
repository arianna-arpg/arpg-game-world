// Controlled native formation identity, concealment and persistence; not an earned playthrough.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),tag='formation-identity';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 let root=path.join(dir,'formation-identity-dist');
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
 const bind=async()=>run(()=>{
  const w=__game.world(),group=w.actors.filter(a=>a.encounterGroup?.recipe==='gnoll_road_foragers');
  const leader=group.find(a=>a.squadLeader),member=group.find(a=>!a.squadLeader);
  if(!leader||!member)throw Error('Missing native formation');
  window.formationQA={leader,member};
 });
 const inspect=async(name,expected,target='leader',takeShot=true)=>{
  const d=await run(target=>{
   const w=__game.world(),r=__game.renderer,a=formationQA[target],ctx=r.ctx,fill=ctx.fillText,rows=[];
   r.render(w);r.hudMouse=r.toScreen(a.pos);
   const state=()=>JSON.stringify([w.time,w.meta.xp,w.massRuntime.state.snapshot(),w.actors.map(a=>[a.id,a.pos,a.life,a.name,a.encounterGroup,a.squadId,a.squadLeader])]);
   const before=state();
   ctx.fillText=function(t,x,y,...rest){if(/^(Leader|Formation|Garrison) \u00b7 (?!\d)/.test(t))rows.push({text:t,x,y,width:ctx.measureText(t).width});return fill.call(this,t,x,y,...rest);};
   try{r.render(w);}finally{ctx.fillText=fill;}
   const b=r.hoverNameRect,p=b?r.toScreen({x:b.x,y:b.y}):null;
   return {rows,same:before===state(),fatal:__game.crash().fatal,reveal:r.labelRevealAt(w,a.pos),
    bounds:b?{x:p.x,y:p.y,w:b.w*r.zoom,h:b.h*r.zoom}:null,width:innerWidth,height:innerHeight};
  },target);
  assert.ok(d.same);assert.equal(d.fatal,null);
  assert.equal(d.rows.length,expected?1:0,name+': '+JSON.stringify(d.rows));
  if(expected){assert.match(d.rows[0].text,expected);const b=d.bounds;assert.ok(b&&b.x>=0&&b.y>=0&&b.x+b.w<=d.width&&b.y+b.h<=d.height,name+' bounds');}
  if(takeShot)await shot(name);results.push({name,...d});
 };
 try{
  await win.loadURL(url);await boot();await run(()=>{
   __game.devStartRun('magician');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);
   const m=w.massRuntime,p=m.journey.places.find(p=>p.content==='cinderwatch'),q=m.journey.local(p);
   w.landPartyAt(q);m.update(w,true);w.player.invulnerable=true;
   // Preserve the actual cohort and all residents; separate only for label inspection.
   let i=0;for(const a of w.actors)if(a.team==='enemy'&&!a.passive){
    const p=a.encounterGroup?.recipe==='gnoll_road_foragers'?{x:q.x+100,y:q.y+(i++)*120}:{x:q.x+5000,y:q.y+5000};
    a.pos=w.findFreeSpot(p,a.radius);a.aiAnchor={...a.pos};
   }
  });await bind();
  await inspect('leader',/^Leader \u00b7 Garrison \u00b7 Cinder/);
  await inspect('member',/^Garrison \u00b7 Cinderwatch Camp$/,'member');
  await run(()=>{const w=__game.world(),a=formationQA.leader,b=w.createMonster(a.defId,a.level,'enemy');b.pos=w.findFreeSpot({x:w.player.pos.x-150,y:w.player.pos.y},b.radius);w.actors.push(b);formationQA.foreign=b;});
  await inspect('foreign',null,'foreign');
  await run(()=>{formationQA.leader.statuses.push({id:'swallowed',remaining:100,stacks:1});});
  await inspect('concealed',null);await run(()=>{formationQA.leader.statuses=[];});
  for(const [field,value] of [['squadId',999999],['squadLeader',false],['team','player'],['faction','undead']]){
   await run((field,value)=>{formationQA.restore=formationQA.leader[field];formationQA.leader[field]=value;},field,value);
   await inspect('invalid-'+field,['team','owner'].includes(field)?null:/^Garrison \u00b7 Cinderwatch Camp$/, 'leader',false);
   await run(field=>{formationQA.leader[field]=formationQA.restore;},field);
  }
  const covered=await run(()=>{
   const w=__game.world(),m=w.massRuntime,r=__game.renderer,a=formationQA.leader;
   formationQA.savedPlayer={...w.player.pos};formationQA.savedGuard={...a.pos};
   const p=m.journey.places.find(p=>p.content==='stoneward'),center=m.journey.local(p);
   w.landPartyAt(center);m.update(w,true);w.player.pos=w.findFreeSpot({x:center.x+90,y:center.y+140},w.player.radius);
   r.render(w);let found;
   for(const d of [250,350,450])for(let i=0;i<32&&!found;i++){const t=i*Math.PI/16,q=w.findFreeSpot({x:w.player.pos.x+Math.cos(t)*d,y:w.player.pos.y+Math.sin(t)*d},a.radius);
    if(r.labelRevealAt(w,q)<=.02&&r.sightVeil.occludedAt(q)>.8)found=q;}
   if(!found)throw Error('No native occlusion sample');a.pos=found;r.render(w);
   return {reveal:r.labelRevealAt(w,found),occlusion:r.sightVeil.occludedAt(found)};
  });assert.ok(covered.reveal<=.02&&covered.occlusion>.8);await inspect('occluded',null);results.push({covered});
  await run(()=>{const w=__game.world();w.landPartyAt(formationQA.savedPlayer);w.massRuntime.update(w,true);formationQA.leader.pos=formationQA.savedGuard;});
  win.setSize(600,600);await new Promise(r=>setTimeout(r,150));await inspect('narrow',/^Leader \u00b7 Garrison \u00b7 Cinder/);
  const saved=await save();assert.deepEqual(await resume(),saved);await bind();await inspect('continued',/^Leader \u00b7 Garrison \u00b7 Cinder/);
  root=path.join(dir,'road-foragers-dist');assert.deepEqual(await resume(),saved);await bind();await inspect('prior',/^Garrison \u00b7 Cinderwatch Camp$/);
  root=current;assert.deepEqual(await resume(),saved);await bind();await inspect('current-again',/^Leader \u00b7 Garrison \u00b7 Cinder/);
  win.setSize(1280,850);await new Promise(r=>setTimeout(r,150));
  await run(()=>{
   const w=__game.world(),zone=w.zone;let group=[];
   // Prepared native downs context for the ordinary (non-site) spawning seam.
   w.zone={...zone,tileset:'downs',biome:'downs'};
   for(const d of [400,600,800]){const p={x:w.player.pos.x+d,y:w.player.pos.y};group=w.spawnEncounterGroup('gnoll_road_foragers',1,p);if(group.length)break;}
   w.zone=zone;if(group.length!==3)throw Error('No native non-garrison formation');
   const leader=group.find(a=>a.squadLeader),member=group.find(a=>!a.squadLeader);w.landPartyAt({x:leader.pos.x-90,y:leader.pos.y});
   window.formationQA={leader,member};
  });await inspect('field-leader',/^Leader \u00b7 Road Foragers$/);
  await inspect('field-member',/^Formation \u00b7 Road Foragers$/,'member');
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify(results,null,2));
  console.log('PASS actual leader/member captions, foreign and stale enrollment, native concealment/occlusion, narrow bounds, pure draws and exact current/prior/current Continue');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
