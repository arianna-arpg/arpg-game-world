// Prepared native scenes for terrain-light integration. No earned combat or real-time performance claim.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),tag='light-sight';
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
 const state=()=>{const w=__game.world(),m=w.massRuntime,enemies=m.snapshot(w).enemies,groups=new Map();
  for(const e of enemies)if(e.encounterGroup){const id=e.encounterGroup.id;groups.set(id,[...(groups.get(id)||[]),e.id].sort());}
  return {seed:m.generator.run.seed,pos:w.player.pos,life:w.player.life,items:w.meta.items,
   enemies:enemies.map(e=>e.encounterGroup?{...e,encounterGroup:{...e.encounterGroup,id:groups.get(e.encounterGroup.id)}}:e),
   claims:m.state.snapshot().claims,doors:m.snapshot(w).settlement.doors};
 };
 const save=async()=>{await run(async()=>{__game.world().massRuntime.update(__game.world(),true);__game.save();await new Promise(r=>setTimeout(r,250));});return run(state);};
 const resume=async()=>{await win.loadURL(url);await boot();await run(async()=>{
  for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
  const b=document.querySelector('#sm-continue:not([disabled])');if(!b)throw Error('No Continue');b.click();__game.ui.hideAll();
 });return run(state);};
 const prepare=async(move=true)=>run(move=>{
  const w=__game.world(),r=__game.renderer,d=w.doodads.find(d=>d.door?.id.startsWith('waking_house#'));
  if(!d)throw Error('No waking doorway');
  w.zone.theme.ambientDark=.7; // Controlled night-like contrast; no clock/AI advancement.
  if(move)w.landPartyAt({x:d.pos.x,y:d.pos.y-42});r.render(w);
  window.lightQA={door:d,x:d.pos.x,y:d.pos.y-42,r:120,key:{}};
 },move);
 const results=[],inspect=async(name,occluded,takeShot=true)=>{
  const row=await run(()=>{
   const w=__game.world(),r=__game.renderer,c=lightQA,layer=r.lightLayer;
   const before=JSON.stringify(w.massRuntime.snapshot(w));
   // Settle presentation-only room/roof fades without advancing simulation or enemies.
   for(let i=0;i<60;i++){r.lastRenderTime=w.time-1/60;r.render(w);}
   const p=layer.staticPoly(w,c.key,c.x,c.y,c.r),again=layer.staticPoly(w,c.key,c.x,c.y,c.r);
   return {fatal:__game.crash().fatal,poly:p??null,reused:p===again,
    same:before===JSON.stringify(w.massRuntime.snapshot(w)),cell:w.walk.cellSize,revision:w.walk.version,
    lights:layer.lights.length,clipped:layer.lights.filter(l=>l.poly).length,ambient:layer.ambient,
    door:{pos:c.door.pos,open:!!c.door.door.open},width:innerWidth};
  });
  assert.equal(row.fatal,null);assert.ok(row.same&&row.reused);
  assert.equal(!!row.poly,occluded,name+' polygon');assert.ok(row.lights>0);
  if(takeShot)await shot(name);results.push({name,...row});return row;
 };
 const timer=setTimeout(()=>app.exit(1),240000);
 try{
  await win.loadURL(url);await boot();await run(()=>{__game.devStartRun('magician');__game.ui.hideAll();__game.world().startWorldMass(42);});
  await prepare();const saved=await save();
  const prior=await inspect('prior-closed',false);assert.equal(prior.clipped,0,'actual old map-type gate bypasses every native light shadow');
  root=path.join(dir,'light-sight-dist');assert.deepEqual(await resume(),saved);await prepare();
  const closed=await inspect('closed',true);assert.ok(closed.clipped>0);assert.ok(closed.poly[12].y<closed.door.pos.y+20);
  await run(()=>__game.world().setDoorState(lightQA.door.door.id,'open',{silent:true}));
  const open=await inspect('open',true);assert.ok(open.poly[12].y>closed.poly[12].y+30);
  await run(()=>__game.world().resealDoor(lightQA.door.door.id));
  const resealed=await inspect('resealed',true);assert.deepEqual(resealed.poly,closed.poly);
  // The native opening path also drives the actual local hero's moving lamp.
  await run(()=>{const w=__game.world();w.setDoorState(lightQA.door.door.id,'open',{silent:true});
   w.landPartyAt({x:lightQA.x,y:lightQA.door.pos.y+65});});
  await inspect('outside',true);
  await run(()=>{const w=__game.world(),d=w.doodads.find(d=>d.door?.id.startsWith('inn#'));if(!d)throw Error('No inn');
   w.setDoorState(d.door.id,'open',{silent:true});w.landPartyAt(w.findFreeSpot({x:d.pos.x,y:d.pos.y-70},w.player.radius));
   lightQA={door:d,x:w.player.pos.x,y:w.player.pos.y,r:190,key:{}};});
  await inspect('inn',true);
  win.setSize(800,650);await new Promise(r=>setTimeout(r,150));await inspect('narrow',true);
  const continued=await save();assert.deepEqual(await resume(),continued);await prepare(false);await inspect('continued',true);
  root=path.join(dir,'caravan-watch-dist');assert.deepEqual(await resume(),continued);await prepare(false);await inspect('prior-continued',false);
  root=path.join(dir,'light-sight-dist');assert.deepEqual(await resume(),continued);await prepare(false);await inspect('current-again',true);
  // Put a remote wall in durable geography, then open it. Source and key stay fixed.
  await run(()=>{const w=__game.world(),m=w.massRuntime,p={x:-6000,y:-6000},cs=m.config.terrain.terrainCell;
   for(let y=-8;y<=8;y++)for(let x=-8;x<=8;x++)m.state.paint({address:m.walk.at(p.x+x*cs,p.y+y*cs),
    region:x===1?'wall':'ground',color:'#445522',cause:'probe/light-remote'});
   w.landPartyAt({x:p.x+cs/2,y:p.y+cs/2});m.update(w,true);
   lightQA={door:{pos:{...w.player.pos},door:{open:false}},key:{},x:w.player.pos.x,y:w.player.pos.y,r:120};
   w.zone.theme.ambientDark=.7;
  });
  const wall=await inspect('remote-wall',true);
  await run(()=>{const w=__game.world(),m=w.massRuntime;for(let y=-8;y<=8;y++)m.state.paint({
   address:m.walk.at(-5970,-6000+y*30),region:'ground',color:'#445522',cause:'probe/light-remote-open'});});
  await inspect('remote-open',false);assert.ok(wall.poly[0].x<-5940);
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify(results,null,2));
  console.log('PASS prior bypass, actual terrain shadows, native open/reseal, moving hero, inn, narrow view, pure cached reads, exact current/prior/current Continue and remote wall repaint');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
