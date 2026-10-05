// Controlled renderer work and exact pixels; not an earned or real-time playthrough.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const dir=path.join(__dirname,'reports'),tag=process.argv[3]||'floor-work',candidate=process.argv[2]||'floor-work-dist';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 let root=path.join(dir,'fraying-nerve-dist');
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
 const boot=()=>run(async()=>{window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});await new Promise(r=>setTimeout(r,200));});
 const timer=setTimeout(()=>app.exit(1),240000),results=[];
 const state=()=>{const w=__game.world(),m=w.massRuntime,enemies=m.snapshot(w).enemies,groups=new Map();
  for(const e of enemies)if(e.encounterGroup){const id=e.encounterGroup.id;groups.set(id,[...(groups.get(id)||[]),e.id].sort());}
  return {seed:m.generator.run.seed,pos:w.player.pos,life:w.player.life,items:w.meta.items,
   enemies:enemies.map(e=>e.encounterGroup?{...e,encounterGroup:{...e.encounterGroup,id:groups.get(e.encounterGroup.id)}}:e),state:m.state.snapshot()};
 };
 const save=async()=>{await run(async()=>{__game.save();await new Promise(r=>setTimeout(r,250));});return run(state);};
 const resume=async()=>{await win.loadURL(url);await boot();await run(async()=>{
  for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
  const b=document.querySelector('#sm-continue:not([disabled])');if(!b)throw Error('No Continue');b.click();__game.ui.hideAll();
 });return run(state);};
 const prepare=()=>run(()=>{
  __game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);
  const m=w.massRuntime,p=m.journey.places.find(p=>p.content==='cinderwatch'),q=m.journey.local(p);
  w.landPartyAt(w.findFreeSpot({x:q.x,y:q.y+500},w.player.radius));m.update(w,true);m.stream.step(65536);
  __game.renderer.render(w);
  const Painter=__game.renderer.massPainter.constructor,span=m.config.terrain.addressSpan;
  window.floorQA={Painter,span,left:Math.floor(w.player.pos.x/span)*span,top:Math.floor(w.player.pos.y/span)*span};
 });
 const exercise=()=>run(()=>{
  const m=__game.world().massRuntime,q=floorQA,p=new q.Painter(),span=q.span;
  let bakes=0,steps=0;const bake=p.bake.bind(p);p.bake=(...a)=>{bakes++;return bake(...a);};
  if(p.bakeSteps){const gen=p.bakeSteps.bind(p);p.bakeSteps=function*(...a){const work=gen(...a);for(;;){steps++;const r=work.next();if(r.done)return r.value;yield;}};}
  const c=document.createElement('canvas');c.width=c.height=span;
  const draw=(dx=0,dy=0)=>{const ctx=c.getContext('2d');ctx.setTransform(1,0,0,1,-q.left-dx*span,-q.top-dy*span);ctx.clearRect(q.left+dx*span,q.top+dy*span,span,span);
   p.draw(ctx,m,q.left+dx*span,q.top+dy*span,span-1,span-1);return c.toDataURL();};
  const before=JSON.stringify(m.state.snapshot()),first=draw();let maxWork=0,peak=0;
  for(let i=0;i<160;i++){const n=steps;draw();maxWork=Math.max(maxWork,steps-n);peak=Math.max(peak,p.baked.size+(p.pending?.size??0));}
  const n=bakes,east=draw(1),eastBakes=bakes-n,after=JSON.stringify(m.state.snapshot());
  if(before!==after)throw Error('rendering changed world consequences');
  q.painter=p;q.draw=draw;return {first,east,eastBakes,maxWork,peak,cap:m.stream.config.maxPages,pending:p.pending?.size??0};
 });
 const floorFile=(name,data)=>{fs.writeFileSync(path.join(dir,tag+'-'+name+'-floor.png'),Buffer.from(data.split(',')[1],'base64'));};
 const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
 try{
  await win.loadURL(url);await boot();await prepare();await shot('prior');
  const prior=await exercise();assert.equal(prior.eastBakes,1);floorFile('prior-east',prior.east);
  root=path.join(dir,candidate);await win.loadURL(url);await boot();await prepare();await shot('current');
  const current=await exercise();assert.equal(current.eastBakes,0);assert.equal(current.east,prior.east);assert.equal(current.first,prior.first);
  assert.ok(current.maxWork<=24&&current.maxWork>0);assert.ok(current.peak<=current.cap);floorFile('prepared-east',current.east);
  results.push({priorEastBakes:prior.eastBakes,preparedEastBakes:current.eastBakes,exactPriorPixels:true,maxBackgroundSteps:current.maxWork,peak:current.peak,cap:current.cap,floor:hash(current.east)});
  const changed=await run(()=>{
   const m=__game.world().massRuntime,q=floorQA,span=q.span;
   // Leave a new painter mid-preparation, edit its palette halo, then enter.
   const p=new q.Painter({enabled:true,stepsPerDraw:1,halo:1,maxPending:2}),c=document.createElement('canvas');c.width=c.height=span;
   const draw=(dx,dy)=>{const ctx=c.getContext('2d');ctx.setTransform(1,0,0,1,-q.left-dx*span,-q.top-dy*span);p.draw(ctx,m,q.left+dx*span,q.top+dy*span,span-1,span-1);return c.toDataURL();};
   draw(0,0);draw(0,0);const pending=p.pending.size;if(!pending)throw Error('No partial preparation');
   for(let dy=-2;dy<=2;dy++)m.state.paint({address:m.walk.at(q.left+span,q.top+span/2+dy*30),region:'wall',color:'#887755',cause:'qa/floor-work/edit'});
   const edited=draw(1,0);
   const cold=new q.Painter({enabled:false,stepsPerDraw:0,halo:0,maxPending:0}),ctx=c.getContext('2d');ctx.setTransform(1,0,0,1,-q.left-span,-q.top);
   cold.draw(ctx,m,q.left+span,q.top,span-1,span-1);
   if(edited!==c.toDataURL())throw Error('Edited partial work disagrees with cold reconstruction');
   return {edited,pending};
  });floorFile('edited',changed.edited);await shot('edited');
  const checkpoint=await save();assert.deepEqual(await resume(),checkpoint);await shot('continued');
  root=path.join(dir,'fraying-nerve-dist');assert.deepEqual(await resume(),checkpoint);await shot('prior-continued');
  root=path.join(dir,candidate);assert.deepEqual(await resume(),checkpoint);await shot('current-again');
  win.setSize(800,600);await new Promise(r=>setTimeout(r,150));await run(()=>__game.ui.folioSync());await shot('narrow');
  results.push({changedPartialMatchesCold:true,pendingBeforeEdit:changed.pending,exactCurrentPriorCurrent:true,fatal:await run(()=>__game.crash().fatal)});
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify(results,null,2));
  console.log('PASS actual prior crossing bake, bounded preparation, exact prior pixels, edited partial reconstruction and native current/prior/current Continue');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
