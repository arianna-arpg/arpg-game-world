// Browser acceptance for naturally generated native country; never replaces a provider.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const dir=path.join(__dirname,'reports');fs.mkdirSync(dir,{recursive:true});
app.setPath('userData',path.join(dir,'native-generation-profile-'+process.pid));
app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..','dist-preview'),report={seed:713,consoleErrors:[]};
 const server=http.createServer((req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');
  fs.createReadStream(file).pipe(res);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port;
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 win.webContents.on('console-message',event=>{if(event.level==='error')report.consoleErrors.push(event.message);});
 const run=async(fn,...args)=>{
  const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');
  if(!r.ok)throw Error(r.error);return r.value;
 };
 const boot=async()=>{
  await win.loadURL(url);
  await run(async()=>{
   window.requestAnimationFrame=()=>0;
   Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
   for(let i=0;i<100&&!window.__game;i++)await new Promise(r=>setTimeout(r,100));
   if(!window.__game)throw Error('Game bootstrap not available');
   await new Promise(r=>setTimeout(r,250));
  });
 };
 const shot=async name=>{
  await run(()=>__game.renderer.render(__game.world()));win.webContents.invalidate();
  await new Promise(r=>setTimeout(r,100));
  const file=path.join(dir,'native-generation-'+name+'.png');fs.writeFileSync(file,(await win.webContents.capturePage()).toPNG());return file;
 };
 const timer=setTimeout(()=>{fs.writeFileSync(path.join(dir,'native-generation-ui-error.txt'),'Browser acceptance timed out');app.exit(1);},300000);
 try{
  await boot();
  report.search=await run(()=>{
   __game.devStartRun('warrior');__game.ui.hideAll();
   const w=__game.world();w.startWorldMass(713);w.player.invulnerable=true;
   // A new isolated account can queue the native intro for its first frame.
   // Complete the actual UI action before locomotion/performance measurement.
   __game.step(1);document.querySelectorAll('button').forEach(b=>{if(b.textContent.trim()==='Walk on')b.click();});__game.ui.hideAll();
   const m=w.massRuntime,seen=new Set(),mouths=[],structures=[],cold=[];
   const add=(origin,delta)=>{
    const s=m.config.terrain.addressSpan,x=origin.x+delta.x,y=origin.y+delta.y;
    return {dimension:origin.dimension,cx:(BigInt(origin.cx)+BigInt(Math.floor(x/s))).toString(),cy:(BigInt(origin.cy)+BigInt(Math.floor(y/s))).toString(),x:((x%s)+s)%s,y:((y%s)+s)%s};
   };
   for(let r=0;r<=16&&(mouths.length<3||!structures.length);r++)for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){
    if(Math.max(Math.abs(x),Math.abs(y))!==r)continue;
    for(const p of m.nativeCountry.near(m.walk.at(x*5400,y*5400),2700)){
     if(seen.has(p.id))continue;seen.add(p.id);
     if(!(p.request.rockEntrance&&mouths.length<3)&&!(p.request.source.kind==='structure'&&!structures.length))continue;
     const center=add(p.origin,{x:p.request.size.w/2,y:p.request.size.h/2}),t=performance.now();
     const accepted=m.nativeFeatures.intersects(center,0);cold.push({id:p.id,ms:performance.now()-t,accepted,reasons:m.nativeFeatures.refusals(p.id)});
     if(!accepted)continue;
     const born=m.nativeFeatures.snapshot(w.time).born.find(b=>b.placement.id===p.id);if(!born)throw Error('Accepted physical source has no durable native blueprint');
     const d=born.descriptor,mouth=d.entrances.find(e=>e.kind==='cave_entrance'&&e.rockBacked);
     const row={placement:born.placement,hash:d.hash,name:d.zone.name,environment:d.environment,approach:d.approach,mouth,
       pieceCount:d.geometry.layout.doodads.length,structures:d.geometry.layout.structures||[]};
     if(p.request.rockEntrance&&mouth)mouths.push(row);
     if(p.request.source.kind==='structure'&&row.structures.length)structures.push(row);
    }
   }
   if(mouths.length<3||!structures.length)throw Error('Default country lacks accepted natural rockmouth/structure coverage in bounded survey');
   return {seen:seen.size,mouths,structures,cold,stats:m.nativeFeatures.stats};
  });
  assert.equal(report.search.mouths.length,3);assert.ok(report.search.structures.length);
  report.workerAudit=await run(async rows=>{
   const w=__game.world(),m=w.massRuntime,queue=m.nativeWarm;
   if(!queue)throw Error('Production native compiler worker is unavailable');
   const born=m.nativeFeatures.snapshot(w.time).born,results=[];
   for(const row of rows){
    const expected=born.find(b=>b.placement.id===row.placement.id);if(!expected)throw Error('Missing synchronous reference birth');
    queue.offer([row.placement]);const start=performance.now();let previous=start,maxGap=0,beats=0,ready;
    for(let attempt=0;attempt<30000&&!ready;attempt++){
     await new Promise(resolve=>setTimeout(resolve,4));const now=performance.now();maxGap=Math.max(maxGap,now-previous);previous=now;beats++;
     if(queue.stats.error)throw Error(queue.stats.error);
     const next=queue.takeReady();if(next&&next.placement.id===row.placement.id)ready=next;
    }
    if(!ready||!ready.preparation.descriptor)throw Error('Native worker returned no descriptor: '+JSON.stringify(ready&&ready.preparation.failure));
    const d=ready.preparation.descriptor;
    if(JSON.stringify(d)!==JSON.stringify(expected.descriptor))throw Error('Actual browser worker/native sync descriptor mismatch');
    const begin=performance.now(),adoption=m.nativeFeatures.adoptPrepared(row.placement,ready.preparation),adoptMs=performance.now()-begin;
    if(adoption!=='existing')throw Error('Late worker result replaced durable synchronous geography');
    results.push({id:row.placement.id,hash:d.hash,source:d.source,bytes:ready.preparation.bytes,workerCompileMs:ready.preparation.compileMs,
     wallMs:begin-start,heartbeat:{beats,maxGapMs:maxGap},lateAdoption:adoption,adoptMs});
   }
   return{results,stats:queue.stats,native:m.nativeFeatures.stats,crash:__game.crash().fatal};
  },[report.search.mouths[0],report.search.mouths[1],report.search.structures[0]]);
  assert.equal(report.workerAudit.crash,null);assert.equal(report.workerAudit.results.length,3);
  const target=report.search.mouths[0];
  report.approach=await run(target=>{
   __game.ui.hideAll();const w=__game.world(),m=w.massRuntime,s=m.config.terrain.addressSpan;
   const offset={x:Number(BigInt(target.placement.origin.cx)-BigInt(m.origin.cx))*s+target.placement.origin.x,
    y:Number(BigInt(target.placement.origin.cy)-BigInt(m.origin.cy))*s+target.placement.origin.y};
   const mouth={x:offset.x+target.mouth.pos.x,y:offset.y+target.mouth.pos.y};
   w.landPartyAt(mouth);m.update(w,true);
   if(!w.caveEntrances.some(e=>e.massOwner===target.placement.id&&e.seed===target.mouth.seed))throw Error('Natural native mouth was not installed by production host');
   const clear=p=>{const q=w.clampPos(p,w.player.radius);return (!w.walk||w.walk.isWalkable(p.x,p.y))&&Math.hypot(q.x-p.x,q.y-p.y)<.001&&!w.pointInSolid(p.x,p.y,w.player.radius);};
   let start;
   for(const r of [100,85,70])for(let i=0;i<16&&!start;i++){
    const a=i*Math.PI/8,p={x:mouth.x+Math.cos(a)*r,y:mouth.y+Math.sin(a)*r};
    if(Array.from({length:21},(_,n)=>({x:p.x+(mouth.x-p.x)*n/20,y:p.y+(mouth.y-p.y)*n/20})).every(clear))start=p;
   }
   if(!start)throw Error('No real body-clear walking approach to naturally seated rock mouth');
   w.landPartyAt(start);m.update(w,true);window.__nativeHarnessHero=w.player;
   window.__nativeHarnessMouth=mouth;window.__nativeHarnessId=target.placement.id;window.__nativeHarnessQueue=m.nativeWarm;
   const before={...w.player.pos};let frames=0,loads=0,inputCalls=0;const trace=[];
   const load=w.loadZone;w.loadZone=function(...args){loads++;return load.apply(this,args);};
   try{
    __game.devInput(()=>{inputCalls++;const dx=mouth.x-w.player.pos.x,dy=mouth.y-w.player.pos.y,d=Math.hypot(dx,dy);return {dx:d>8?dx:0,dy:d>8?dy:0,aim:mouth,held:[],edge:[]};});
    for(;frames<180&&Math.hypot(w.player.pos.x-mouth.x,w.player.pos.y-mouth.y)>8;frames++){__game.step(1);if(frames%30===0)trace.push({frame:frames,time:w.time,pos:{...w.player.pos},life:w.player.life,clamp:w.clampPos(w.player.pos,w.player.radius),solid:!!w.pointInSolid(w.player.pos.x,w.player.pos.y,w.player.radius)});}
   }finally{__game.devInput(null);w.loadZone=load;}
   if(w.massRuntime!==m)throw Error('Walking alone entered before native idle dwell');
   return {before,after:{...w.player.pos},mouth,frames,loads,sameHero:window.__nativeHarnessHero===w.player,
    inputCalls,trace,distance:Math.hypot(w.player.pos.x-mouth.x,w.player.pos.y-mouth.y),crash:__game.crash().fatal};
  },target);
  assert.equal(report.approach.loads,0);assert.equal(report.approach.sameHero,true);assert.equal(report.approach.crash,null);
  assert.ok(report.approach.distance<=8&&report.approach.frames>0);
  report.surfaceImage=await shot('rock-mouth');
  report.entry=await run(()=>{
   const w=__game.world();let frames=0;__game.devInput(()=>({dx:0,dy:0,aim:w.player.pos,held:[],edge:[]}));
   try{for(;frames<150&&!w.inCave;frames++)__game.step(1);}finally{__game.devInput(null);}
   if(!w.inCave||w.massRuntime)throw Error('Idle walking arrival failed to enter native cave');
   return {frames,zone:w.zone.id,sameHero:window.__nativeHarnessHero===w.player,workerDisposed:window.__nativeHarnessQueue?.stats.disposed,returnPos:w.caveReturn.pos,
    caveSeed:w.currentZoneSeed,pos:{...w.player.pos},tier:w.player.tier||0,lifeRatio:w.player.life/w.player.maxLife(),crash:__game.crash().fatal};
  });
  assert.equal(report.entry.sameHero,true);assert.equal(report.entry.workerDisposed,true);assert.equal(report.entry.crash,null);
  assert.ok(Math.hypot(report.entry.returnPos.x-report.approach.mouth.x,report.entry.returnPos.y-report.approach.mouth.y)<.001);
  report.interiorImage=await shot('native-interior');
  await run(async()=>{__game.ui.hideAll();__game.save();if(typeof __game.flushRunSave!=='function')throw Error('Build does not expose durable save flush');await __game.flushRunSave();});
  await boot();
  await run(async expectedZone=>{
   for(let i=0;i<100&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
   const button=document.querySelector('#sm-continue:not([disabled])');if(!button)throw Error('Native Continue is unavailable after durable interior save');
   button.click();
   for(let i=0;i<100&&(__game.world().zone.id!==expectedZone||!__game.world().inCave);i++)await new Promise(r=>setTimeout(r,100));
   __game.ui.hideAll();const w=__game.world();w.player.invulnerable=true;window.__nativeHarnessHero=w.player;
  },report.entry.zone);
  report.continued=await run(()=>{const w=__game.world();return {zone:w.zone.id,inCave:w.inCave,hasSurface:!!w.massRuntime,
   pos:{...w.player.pos},tier:w.player.tier||0,lifeRatio:w.player.life/w.player.maxLife(),returnPos:w.caveReturn&&w.caveReturn.pos,crash:__game.crash().fatal};});
  assert.equal(report.continued.zone,report.entry.zone);assert.equal(report.continued.inCave,true);assert.equal(report.continued.hasSurface,false);
  assert.deepEqual(report.continued.pos,report.entry.pos);assert.deepEqual(report.continued.returnPos,report.entry.returnPos);assert.equal(report.continued.tier,report.entry.tier);
  assert.ok(Math.abs(report.continued.lifeRatio-report.entry.lifeRatio)<1e-6);assert.equal(report.continued.crash,null);
  report.continuedImage=await shot('continued-interior');
  report.returned=await run(()=>{
   const w=__game.world(),exit=w.exits.find(e=>e.to==='worldmass_expedition');if(!exit)throw Error('Real native cave has no return passage');
   const clear=p=>{const q=w.clampPos(p,w.player.radius);return (!w.walk||w.walk.isWalkable(p.x,p.y))&&Math.hypot(q.x-p.x,q.y-p.y)<.001&&!w.pointInSolid(p.x,p.y,w.player.radius);};
   let start;for(const r of [140,110,90])for(let i=0;i<16&&!start;i++){
    const a=i*Math.PI/8,p={x:exit.pos.x+Math.cos(a)*r,y:exit.pos.y+Math.sin(a)*r};
    if(Array.from({length:21},(_,n)=>({x:p.x+(exit.pos.x-p.x)*n/20,y:p.y+(exit.pos.y-p.y)*n/20})).every(clear))start=p;
   }
   if(!start)throw Error('Native return exit has no direct walking approach');
   w.landPartyAt(start);let frames=0;
   try{
    __game.devInput(()=>{const dx=exit.pos.x-w.player.pos.x,dy=exit.pos.y-w.player.pos.y,d=Math.hypot(dx,dy);return{dx:d>8?dx:0,dy:d>8?dy:0,aim:exit.pos,held:[],edge:[]};});
    for(;frames<240&&w.inCave;frames++)__game.step(1);
   }finally{__game.devInput(null);}
   return {frames,zone:w.zone.id,inCave:w.inCave,pos:{...w.player.pos},sameHero:window.__nativeHarnessHero===w.player,crash:__game.crash().fatal};
  });
  assert.equal(report.returned.zone,'worldmass_expedition');assert.equal(report.returned.inCave,false);assert.equal(report.returned.sameHero,true);assert.equal(report.returned.crash,null);
  assert.ok(Math.hypot(report.returned.pos.x-report.approach.mouth.x,report.returned.pos.y-report.approach.mouth.y)<.001);
  report.roundtrip=await run(target=>{
   const w=__game.world(),m=w.massRuntime,b=m.nativeFeatures.snapshot(w.time).born.find(b=>b.placement.id===target.placement.id);
   return {hash:b&&b.descriptor.hash,source:b&&b.descriptor.source,mouths:w.caveEntrances.filter(e=>e.massOwner===target.placement.id).map(e=>({seed:e.seed,pos:e.pos})),stats:m.nativeFeatures.stats};
  },target);
  assert.equal(report.roundtrip.hash,target.hash);
  report.returnImage=await shot('returned-mouth');
  const visits=[...report.search.mouths.slice(1).map((row,i)=>({row,name:'landform-'+(i+2)})),
   {row:report.search.structures[0],name:'native-structure'}];
  report.visits=[];
  for(const {row,name}of visits){
   const visit=await run(row=>{
    const w=__game.world(),m=w.massRuntime,s=m.config.terrain.addressSpan;
    const offset={x:Number(BigInt(row.placement.origin.cx)-BigInt(m.origin.cx))*s+row.placement.origin.x,
     y:Number(BigInt(row.placement.origin.cy)-BigInt(m.origin.cy))*s+row.placement.origin.y};
    const seat=row.mouth?row.mouth.pos:{x:row.placement.request.size.w/2,y:row.placement.request.size.h/2};
    w.landPartyAt(w.findFreeSpot({x:offset.x+seat.x,y:offset.y+seat.y},w.player.radius));m.update(w,true);
    const saved=m.nativeFeatures.snapshot(w.time).born.find(b=>b.placement.id===row.placement.id);
    return {id:row.placement.id,hash:saved&&saved.descriptor.hash,source:row.placement.request.source,
     pieces:w.doodads.filter(d=>Math.hypot(d.pos.x-w.player.pos.x,d.pos.y-w.player.pos.y)<1100).length,
     structures:w.structures.filter(st=>st.id.startsWith(row.placement.id+'::')).length,crash:__game.crash().fatal};
   },row);
   assert.equal(visit.hash,row.hash);assert.equal(visit.crash,null);if(name==='native-structure')assert.ok(visit.structures>0);
   visit.image=await shot(name);report.visits.push(visit);
  }
  report.frameAudit=await run(async()=>{
   const w=__game.world(),m=w.massRuntime,center={...w.player.pos};let start,goal;
   const clear=p=>{const q=w.clampPos(p,w.player.radius);return Math.hypot(q.x-p.x,q.y-p.y)<.001&&w.walk.isWalkable(p.x,p.y)&&!w.pointInSolid(p.x,p.y,w.player.radius);};
   // The native market centre can be a furnished room. Seat the test on a
   // verified exterior approach, then use real input for every measured frame.
   for(const offset of [0,90,180,270,360])for(let direction=0;direction<16&&!goal;direction++){
    const seat={x:center.x+Math.cos(direction*Math.PI/8)*offset,y:center.y+Math.sin(direction*Math.PI/8)*offset};if(!clear(seat))continue;
    for(const r of [150,120,90])for(let a=0;a<16&&!goal;a++){
     const p={x:seat.x+Math.cos(a*Math.PI/8)*r,y:seat.y+Math.sin(a*Math.PI/8)*r};
     if(Array.from({length:21},(_,i)=>({x:seat.x+(p.x-seat.x)*i/20,y:seat.y+(p.y-seat.y)*i/20})).every(clear)){start=seat;goal=p;}
    }
   }
   if(!goal)throw Error('Native structure has no clear walking course for frame audit');
   w.landPartyAt(start);m.update(w,true);
   const stats=xs=>{const sorted=[...xs].sort((a,b)=>a-b);return{n:xs.length,mean:xs.reduce((a,b)=>a+b,0)/xs.length,p50:sorted[Math.floor(xs.length*.5)],p95:sorted[Math.floor(xs.length*.95)],max:sorted.at(-1),over16:xs.filter(x=>x>16.7).length,over50:xs.filter(x=>x>50).length};};
   let back=false,farthest=0;
   __game.devInput(()=>{const target=back?start:goal,dx=target.x-w.player.pos.x,dy=target.y-w.player.pos.y;if(Math.hypot(dx,dy)<12)back=!back;return{dx,dy,aim:goal,held:[],edge:[]};});
   const before={geography:m.geography?.accessStats,native:m.nativeFeatures.stats,stream:m.stream.stats,doodads:w.doodads.length,actors:w.actors.length},frames=[],calls={};
   const original=[];
   const wrap=(owner,name,label)=>{const fn=owner[name];if(typeof fn!=='function')return;original.push([owner,name,fn]);owner[name]=function(...args){const begin=performance.now();try{return fn.apply(this,args);}finally{const ms=performance.now()-begin,s=calls[label]||(calls[label]={n:0,ms:0,max:0});s.n++;s.ms+=ms;s.max=Math.max(s.max,ms);}};};
   try{
    // First pass is uninstrumented: real simulation, renderer, browser canvas.
    for(let i=0;i<180;i++){const begin=performance.now();__game.step(1);frames.push(performance.now()-begin);farthest=Math.max(farthest,Math.hypot(w.player.pos.x-start.x,w.player.pos.y-start.y));await new Promise(resolve=>setTimeout(resolve,0));}
    // Short second pass attributes inclusive method costs; do not confuse its
    // wrapper overhead with the uninstrumented frame distribution above.
    wrap(w,'update','World.update');wrap(m,'update','runtime.update');
    wrap(__game.renderer,'render','Renderer.render');wrap(__game.renderer,'drawFloor','Renderer.drawFloor');
    for(const name of ['draw','prepare','bake','finish','drawSettlement'])wrap(__game.renderer.massPainter,name,'paint.'+name);
    wrap(m.nativeFeatures,'adoptPrepared','native.adoptPrepared');
    for(const name of ['containing','candidates','ensure','regionAt','obstacleAt','sample','sync','intersects'])wrap(m.nativeFeatures,name,'native.'+name);
    if(m.geography)for(const name of ['plan','reserves','sync'])wrap(m.geography,name,'geography.'+name);
    wrap(m.generator,'placesInCell','generator.placesInCell');
    wrap(m.nativeCountry,'at','country.at');wrap(m.nativeCountry,'near','country.near');wrap(m.stream,'sample','stream.sample');
    const instrumented=[];for(let i=0;i<60;i++){const begin=performance.now();__game.step(1);instrumented.push(performance.now()-begin);await new Promise(resolve=>setTimeout(resolve,0));}
    return{start,goal,farthest,frames:stats(frames),instrumented:stats(instrumented),calls,before,
      after:{geography:m.geography?.accessStats,native:m.nativeFeatures.stats,worker:m.nativeWarm?.stats,stream:m.stream.stats,doodads:w.doodads.length,actors:w.actors.length},crash:__game.crash().fatal};
   }finally{__game.devInput(null);for(const[owner,name,fn]of original)owner[name]=fn;}
  });
  assert.equal(report.frameAudit.crash,null);assert.ok(report.frameAudit.farthest>40,'frame audit includes real locomotion near native architecture');
  fs.writeFileSync(path.join(dir,'native-generation-ui.json'),JSON.stringify(report,null,2));
  fs.rmSync(path.join(dir,'native-generation-ui-error.txt'),{force:true});
  console.log('PASS default-country native rock generation, actual movement and idle cave entry, same hero, durable interior Continue, exact return and native structure frames');
  clearTimeout(timer);win.destroy();server.close();app.exit(0);
 }catch(error){try{report.failureImage=await shot('failure');}catch{}fs.writeFileSync(path.join(dir,'native-generation-ui.json'),JSON.stringify(report,null,2));fs.writeFileSync(path.join(dir,'native-generation-ui-error.txt'),String(error.stack||error));console.error(error);clearTimeout(timer);app.exit(1);}
});
