// Controlled terrain edits and real Canvas bakes; not an earned playthrough.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const dir=path.join(__dirname,'reports'),tag='dirty-terrain';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 let root=path.join(dir,'dirty-terrain-dist');
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
 const boot=()=>run(async()=>{
  window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});await new Promise(r=>setTimeout(r,200));
 });
 const current=root,timer=setTimeout(()=>app.exit(1),240000),results=[];
 const state=()=>{const w=__game.world(),m=w.massRuntime,enemies=m.snapshot(w).enemies,groups=new Map();
  for(const e of enemies)if(e.encounterGroup){const id=e.encounterGroup.id;groups.set(id,[...(groups.get(id)||[]),e.id].sort());}
  return {seed:m.generator.run.seed,pos:w.player.pos,life:w.player.life,items:w.meta.items,
   enemies:enemies.map(e=>e.encounterGroup?{...e,encounterGroup:{...e.encounterGroup,id:groups.get(e.encounterGroup.id)}}:e),
   state:m.state.snapshot()};};
 const save=async()=>{await run(async()=>{__game.save();await new Promise(r=>setTimeout(r,250));});return run(state);};
 const resume=async()=>{await win.loadURL(url);await boot();await run(async()=>{
  for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
  const b=document.querySelector('#sm-continue:not([disabled])');if(!b)throw Error('No Continue');b.click();__game.ui.hideAll();
 });return run(state);};
 const prepare=()=>run(()=>{
  __game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);
  const m=w.massRuntime,p=m.journey.places.find(p=>p.content==='cinderwatch'),q=m.journey.local(p);
  w.landPartyAt(w.findFreeSpot({x:q.x,y:q.y+500},w.player.radius));m.update(w,true);
  __game.renderer.render(w);
  const painter=__game.renderer.massPainter,original=painter.bake.bind(painter),span=m.config.terrain.addressSpan;
  window.terrainQA={bakes:0,left:Math.floor(w.player.pos.x/span)*span,top:Math.floor(w.player.pos.y/span)*span,span};
  painter.bake=(...args)=>{terrainQA.bakes++;return original(...args);};
 });
 const floor=async(name,cold=false)=>{
  const result=await run(cold=>{
   const w=__game.world(),m=w.massRuntime,p=__game.renderer.massPainter,q=terrainQA;
   if(cold)p.baked.clear();q.bakes=0;
   const c=document.createElement('canvas');c.width=c.height=q.span;
   const ctx=c.getContext('2d');ctx.translate(-q.left,-q.top);
   p.draw(ctx,m,q.left,q.top,q.span-1,q.span-1);
   return {png:c.toDataURL(),bakes:q.bakes};
  },cold);
  if(name)fs.writeFileSync(path.join(dir,tag+'-'+name+'-floor.png'),Buffer.from(result.png.split(',')[1],'base64'));
  return result;
 };
 const edit=kind=>run(kind=>{
  const m=__game.world().massRuntime,q=terrainQA,cs=m.config.terrain.terrainCell;
  const x=kind==='remote'?q.left+q.span*30:kind==='halo'?q.left-cs:q.left+q.span/2;
  const y=kind==='remote'?q.top-q.span*30:q.top+q.span/2;
  for(let dy=-1;dy<=1;dy++)for(let dx=0;dx<(kind==='local'?3:1);dx++)
   m.state.paint({address:m.walk.at(x+dx*cs,y+dy*cs),region:kind==='local'?'mud':'ground',
    color:kind==='halo'?'#baaf78':'#755848',cause:'qa/terrain-cache/'+kind});
 },kind);
 const hash=r=>crypto.createHash('sha256').update(r.png).digest('hex');
 try{
  root=path.join(dir,'nerve-recovery-dist');await win.loadURL(url);await boot();await prepare();
  const old=await floor();await shot('prior-warm');await edit('remote');
  const oldFar=await floor();assert.ok(oldFar.bakes>0);assert.equal(oldFar.png,old.png);await shot('prior-remote');
  results.push({client:'prior',remoteBakes:oldFar.bakes,pixelsUnchanged:true});
  root=current;await win.loadURL(url);await boot();await prepare();const before=await floor('before');
  await shot('warm');await edit('remote');const remote=await floor();
  assert.equal(remote.bakes,0);assert.equal(remote.png,before.png);await shot('remote');
  await edit('local');const local=await floor('local');assert.ok(local.bakes>0);assert.notEqual(local.png,before.png);
  assert.equal((await floor('',true)).png,local.png,'warm local edit must match full rebuild');await shot('local');
  await edit('halo');const halo=await floor('halo');assert.ok(halo.bakes>0);assert.notEqual(halo.png,local.png);
  assert.equal((await floor('',true)).png,halo.png,'neighboring palette halo must match full rebuild');await shot('halo');
  const checkpoint=await save();assert.deepEqual(await resume(),checkpoint);await shot('continued');
  root=path.join(dir,'nerve-recovery-dist');assert.deepEqual(await resume(),checkpoint);await shot('prior-continued');
  root=current;assert.deepEqual(await resume(),checkpoint);await shot('current-again');
  win.setSize(800,600);await new Promise(r=>setTimeout(r,150));await run(()=>__game.ui.folioSync());await shot('narrow');
  results.push({client:'current',remoteBakes:remote.bakes,localBakes:local.bakes,haloBakes:halo.bakes,
   before:hash(before),local:hash(local),halo:hash(halo),warmMatchesCold:true,exactCurrentPriorCurrent:true,fatal:await run(()=>__game.crash().fatal)});
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify(results,null,2));
  console.log('PASS actual prior remote rebake, current reuse, pixel-exact local/halo invalidation and exact native current/prior/current Continue');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
