// Diagnostic only: no production imports, replacement providers, actor removal,
// terrain edits, effect ablations or extra renderer passes during measurement.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const tag=process.argv.find(a=>a.startsWith('--tag='))?.slice(6)??'';if(tag&&!/^[a-z0-9-]{1,48}$/.test(tag))throw Error('Invalid attribution report tag');
const prefix='geographic-frame-attribution'+(tag?'-'+tag:'');
const workspace=path.resolve(__dirname,'..'),outDir=process.argv.find(a=>a.startsWith('--out-dir='))?.slice(10)??'dist-preview';
const buildRoot=path.resolve(workspace,outDir),buildRelative=path.relative(workspace,buildRoot);
if(!buildRelative||buildRelative.startsWith('..')||path.isAbsolute(buildRelative))throw Error('Attribution build must be a child of this workspace');
const dir=path.join(__dirname,'reports');fs.mkdirSync(dir,{recursive:true});
app.setPath('userData',path.join(dir,prefix+'-profile-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=buildRoot,report={tag,harnessSha256:crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'),seed:901743,consoleErrors:[],methodology:{
  course:{start:{x:21660,y:13500},end:{x:24660,y:13500},waypointStep:60},
  frameSource:'The real __game.step(1,16.7) input/AI/World/renderer/tail pipeline; rAF disabled only to prevent duplicate hidden-window frames.',
  control:'Existing native sim/render telemetry only; no engine/render method wrappers.',
  attributed:'Inclusive method timings with measured child time removed for exclusive estimates; nested inclusive totals must not be added.',
  aiBoundary:'The gap after World.applyInputs returns and before World.update starts includes main.ts drainMetaActions and its full imported updateAI loop. It is not a direct updateAI wrapper.',
  exception:'Controlled initial teleport and diagnostic player.invulnerable=true in both passes; normal actors, AI, collision, status/effect processing, workers and renderer remain active.',
  pacing:'Synthetic16.7ms simulation steps with4ms asynchronous gaps. Elapsed step cost is not FPS or compositor latency. Native pre/gap telemetry is not used as pacing evidence.',
  observations:'Census/report work runs after the timed step and is measured separately; resulting allocation/GC effects are not assumed zero. Control runs first, so JIT, native ambient RNG and asynchronous worker timing can differ.',
  runtimeCoverage:'Residual pass includes dormancy, field/shrine/puzzle controllers, survey, population/context helpers and site discovery; wrappers are report-only and preserve native calls.',
  bounds:{maxFrames:1800,slowThresholdMs:50,maxSlowFrames:128,maxHooks:768}
 }};
 const files=fs.readdirSync(path.join(root,'assets')).filter(n=>n.endsWith('.js')).sort();
 report.build={root,index:fs.readFileSync(path.join(root,'index.html'),'utf8').match(/assets\/[^"']+\.js/g),assets:files.map(name=>{const b=fs.readFileSync(path.join(root,'assets',name));return{name,bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')};})};
 const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');fs.createReadStream(file).pipe(res);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port;
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 win.webContents.on('console-message',event=>{if(event.level==='error')report.consoleErrors.push(event.message);if(event.message.startsWith('ATTRIBUTION_PROGRESS '))console.log(event.message);});
 const run=async(fn,...args)=>{const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');if(!r.ok)throw Error(r.error);return r.value;};
 const save=()=>fs.writeFileSync(path.join(dir,prefix+'-ui.json'),JSON.stringify(report,null,2));
 const timer=setTimeout(()=>{save();console.error('attribution browser timed out');app.exit(1);},420000);
 const shot=async label=>{const canvas=await run(()=>__game.renderer.canvas.toDataURL('image/png'));const canvasFile=path.join(dir,prefix+'-'+label+'.canvas.png');fs.writeFileSync(canvasFile,Buffer.from(canvas.split(',')[1],'base64'));win.webContents.invalidate();await new Promise(r=>setTimeout(r,100));const pageFile=path.join(dir,prefix+'-'+label+'.page.png');fs.writeFileSync(pageFile,(await win.webContents.capturePage()).toPNG());return{canvas:canvasFile,page:pageFile};};
 try{
  await win.loadURL(url);await run(async()=>{window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});for(let i=0;i<100&&!window.__game;i++)await new Promise(r=>setTimeout(r,100));if(!window.__game)throw Error('Game bootstrap unavailable');await __game.hydrated();await new Promise(r=>setTimeout(r,250));});
  for(const instrumented of [false,true]){
   const name=instrumented?'attributed':'control';
   report[name]=await run(async instrumented=>{
    __game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();w.startWorldMass(901743);w.player.invulnerable=true;__game.step(1);document.querySelectorAll('button').forEach(b=>{if(b.textContent.trim()==='Walk on')b.click();});__game.ui.hideAll();
    const m=w.massRuntime,r=__game.renderer,span=m.config.terrain.addressSpan;
    if(!m.geography?.warm||!m.nativeWarm)throw Error('This attribution requires the actual production preparation workers');
    const route=Array.from({length:51},(_,i)=>({x:21660+60*i-Number(BigInt(m.origin.cx))*span,y:13500-Number(BigInt(m.origin.cy))*span}));
    w.landPartyAt(route[0]);m.update(w,true);const hero=w.player,start={...hero.pos},startTime=w.time;
    const size=v=>v instanceof Map||v instanceof Set?v.size:Array.isArray(v)?v.length:0;
    const census=()=>{
     const live=w.actors.filter(a=>!a.dead),byKind={};let near=0,statuses=0,casting=0,enemy=0,maxDistance=0;
     for(const a of live){const d=Math.hypot(a.pos.x-hero.pos.x,a.pos.y-hero.pos.y);if(d<1200)near++;maxDistance=Math.max(maxDistance,d);statuses+=a.statuses?.length??0;if(a.casting)casting++;if(a.team==='enemy')enemy++;const key=a.defId??a.kind??'unknown';byKind[key]=(byKind[key]??0)+1;}
     const effects={};for(const key of ['projectiles','zones','flashes','texts','notices','pickupFeed','dissolves','emergences','drops','orbs','remnants','corpses','pendingSummons','pendingRespawns','pendingFollowUps','deathBursts','tethers','encounters','tracks','trapworks'])effects[key]=size(w[key]);
     const native=m.nativeFeatures?.stats;
     return{actors:{total:w.actors.length,live:live.length,enemies:enemy,near1200:near,maxDistance,statuses,casting,byKind},effects,
      scene:{doodads:w.doodads.length,structures:w.structures.length,grounds:size(w.grounds),bridges:size(w.bridges),caveEntrances:size(w.caveEntrances),chests:w.chests.length},
      terrain:{stream:m.stream.stats,floorBaked:size(r.massPainter?.baked),floorPending:size(r.massPainter?.pending),walkRegions:size(m.walk.regions),walkPaths:size(m.walk.cache),walkSearches:m.walk.searches,revision:m.walk.version,generatorPlacePages:size(m.generator.placePages),generatorCandidates:size(m.generator.candidates),generatorDecisions:size(m.generator.decisions)},
      ownership:{classicNatives:size(m.natives),sleeping:size(m.dormancy?.asleep),frozen:size(m.dormancy?.frozen),fields:m.fields?.residentCount,shrines:m.shrines?.residentCount,puzzles:m.puzzles?.residentCount,discovered:size(m.sites?.discovered)},
      native,geographic:{cached:m.geography.accessStats.cachedPlans,adopted:m.geography.warmStats.adopted,used:m.geography.warmStats.used,validating:m.geography.warmStats.validating},
      player:{life:hero.life,mana:hero.mana,dead:hero.dead,statuses:(hero.statuses??[]).map(s=>s.id??s.def?.id??s.kind??'unknown'),tier:hero.tier??0},
      canvas:{width:r.canvas.width,height:r.canvas.height,pixelScale:r.pixelScale,zoom:r.zoom,falterArmed:r.falterArmed,falterHolding:performance.now()<r.falterHoldUntil}};
    };
    const original=[],rows=[],seen=new WeakMap(),MAX=768;
    const calls=new Uint32Array(MAX),inclusive=new Float64Array(MAX),exclusive=new Float64Array(MAX),maxCall=new Float64Array(MAX);
    const stackIds=new Int32Array(128),stackStart=new Float64Array(128),stackChildren=new Float64Array(128);
    let active=false,depth=0,marks={},hookCalls=0;
    const bind=(owner,key,label,mode='time',boundary)=>{
     if(!owner||typeof owner[key]!=='function')return false;let known=seen.get(owner);if(!known){known=new Set();seen.set(owner,known);}if(known.has(key))return false;known.add(key);
     if(rows.length>=MAX)throw Error('Diagnostic hook budget exceeded');const id=rows.length,fn=owner[key],own=Object.prototype.hasOwnProperty.call(owner,key),row={name:label,mode,calls:0,inclusiveMs:0,exclusiveMs:0,maxCallMs:0,maxFrameMs:0};rows.push(row);original.push({owner,key,fn,own});
     owner[key]=function(...args){
      if(!active)return fn.apply(this,args);calls[id]++;hookCalls++;
      if(mode==='count')return fn.apply(this,args);
      const d=depth++,before=performance.now();if(d>=128)throw Error('Diagnostic nesting budget exceeded');stackIds[d]=id;stackStart[d]=before;stackChildren[d]=0;
      if(boundary)marks[boundary+'Start']=before;
      try{return fn.apply(this,args);}finally{
       const end=performance.now(),elapsed=end-stackStart[d];if(boundary)marks[boundary+'End']=end;
       depth--;inclusive[id]+=elapsed;exclusive[id]+=Math.max(0,elapsed-stackChildren[d]);maxCall[id]=Math.max(maxCall[id],elapsed);if(d)stackChildren[d-1]+=elapsed;
      }
     };return true;
    };
    const protoNames=o=>{const names=new Set();for(let p=o;p&&p!==Object.prototype;p=Object.getPrototypeOf(p))for(const n of Object.getOwnPropertyNames(p))if(typeof Object.getOwnPropertyDescriptor(p,n)?.value==='function')names.add(n);return [...names];};
    let calibration=null;
    if(instrumented){
     const bench={run:x=>x+1},fn=bench.run;bind(bench,'run','__calibration');let sum=0;const samples=[];
     for(let j=0;j<3;j++){active=false;let t=performance.now();for(let i=0;i<20000;i++)sum+=fn(i);const directMs=performance.now()-t;active=true;t=performance.now();for(let i=0;i<20000;i++)sum+=bench.run(i);samples.push({directMs,wrappedMs:performance.now()-t,calls:20000});active=false;}
     calibration={samples,checksum:sum,estimateMsPerCall:[...samples.map(s=>Math.max(0,s.wrappedMs-s.directMs)/s.calls)].sort((a,b)=>a-b)[1],caveat:'No-op clock/bookkeeping calibration only; JIT/GC/cache perturbation is not corrected away.'};
     bind(w,'applyInputs','World.applyInputs','time','inputs');bind(w,'update','World.update','time','world');bind(r,'render','Renderer.render','time','render');
     for(const key of protoNames(w))if(/^(update[A-Z]|refresh[A-Z]|separateActors$)/.test(key))bind(w,key,'World.'+key);
     for(const key of ['moveActor','clampPos','pointInSolid','lineOfSight','ensureDoodadIdx','doodadsNear','actorsNear','rebuildActorGrid','installMassNativeScene','completeMassQuest'])bind(w,key,'World.'+key);
     for(const key of protoNames(r))if(/^(draw[A-Z]|update[A-Z]|cullDoodads$)/.test(key))bind(r,key,'Renderer.'+key);
     for(const [key,names]of [['sightVeil',['update','draw','extractEdges','gatherDoodads','occlusionAt']],['roomVeil',['update','draw']],['lightLayer',['collect','render','staticPoly','bloom']],['massPainter',['draw','prepare','bake','finish','drawSettlement']]])for(const name of names)bind(r[key],name,key+'.'+name);
     for(const name of ['update','prepareNativeCountry','placesInCell','updateOccurrences','populationFor','populationCount','reservedPopulation','siteSearched','siteCleared','locateOwner','nativePlacement'])bind(m,name,'runtime.'+name);
     for(const [object,names]of [['geography',['prepare','advancePreparation','plan','reserves','sync','update']],['nativeFeatures',['ensure','sync','adoptPrepared','obstacleAt','intersects']],['nativeCountry',['near']],['ecology',['sync']],['sites',['sync','discover']],['dormancy',['update','activeCount']],['fields',['sync','canAdmit','admit']],['shrines',['sync','canAdmit','admit','residentOwners']],['puzzles',['sync','canAdmit','admit','missing','residentOwners']],['survey',['observe']],['stream',['step']],['generator',['placesInCell']],['nativeHost',['install','updateOccurrences']]])for(const name of names)bind(m[object],name,object+'.'+name);
     for(const name of ['pathStep','line','snapToWalkable'])bind(m.walk,name,'walk.'+name);
     for(const name of ['regionAt','isWalkable'])bind(m.walk,name,'walk.'+name,'count');bind(m.generator,'terrainAt','generator.terrainAt','count');bind(m.stream,'sample','stream.sample','count');bind(m.nativeFeatures,'regionAt','nativeFeatures.regionAt','count');
     for(const name of ['updateTimers','refreshConditions','tickChronoStatuses'])bind(Object.getPrototypeOf(hero),name,'Actor.'+name);
     for(const name of ['update','tick'])bind(w.sim,name,'WorldSim.'+name);
     for(const name of ['folioSync','menuBarSync','refreshCharSheet','refreshInventory','refreshMap'])bind(__game.ui,name,'UI.'+name);
    }
    calls.fill(0);inclusive.fill(0);exclusive.fill(0);maxCall.fill(0);hookCalls=0;
    const summary=a=>{const s=[...a].sort((a,b)=>a-b);return{count:s.length,mean:s.reduce((n,x)=>n+x,0)/Math.max(1,s.length),median:s[Math.floor(s.length*.5)]??0,p95:s[Math.floor(s.length*.95)]??0,p99:s[Math.floor(s.length*.99)]??0,max:s.at(-1)??0,over50:s.filter(n=>n>50).length};};
    let goal=1,frame=0,observationsMs=0;const frames=[],slowFrames=[],initial=census(),progress=[];
    const input={read(){while(goal<route.length-1&&Math.hypot(route[goal].x-hero.pos.x,route[goal].y-hero.pos.y)<32)goal++;const p=route[goal],dx=p.x-hero.pos.x,dy=p.y-hero.pos.y,d=Math.hypot(dx,dy);let steering={dx,dy};if(d>16)for(const turn of [0,.55,-.55,1.1,-1.1,1.57,-1.57]){const a=Math.atan2(dy,dx)+turn,x=Math.cos(a),y=Math.sin(a);if([12,24,36].every(reach=>{const q={x:hero.pos.x+x*reach,y:hero.pos.y+y*reach};return m.walk.isWalkable(q.x,q.y)&&!w.pointInSolid(q.x,q.y,hero.radius);})){steering={dx:x,dy:y};break;}}return{...steering,aim:p,held:[],edge:[]};}};
    if(instrumented)bind(input,'read','Harness.inputSteering');__game.devInput(()=>input.read());__game.perfFrames(true);
    try{
     for(;frame<1800;frame++){
      calls.fill(0);inclusive.fill(0);exclusive.fill(0);maxCall.fill(0);depth=0;marks={};const timeBefore=w.time;
      active=instrumented;const before=performance.now();__game.step(1,16.7);const stepMs=performance.now()-before;active=false;
      const observationStart=performance.now(),native=__game.perfFrames(true);if(native.pushed!==1)throw Error('Expected one native simulation/render frame per step');
      const simMs=native.sim[0],renderMs=native.ren[0];
      const callRows=[];let frameHookCalls=0;
      for(let i=1;i<rows.length;i++)if(calls[i]){const row=rows[i];row.calls+=calls[i];row.inclusiveMs+=inclusive[i];row.exclusiveMs+=exclusive[i];row.maxCallMs=Math.max(row.maxCallMs,maxCall[i]);row.maxFrameMs=Math.max(row.maxFrameMs,inclusive[i]);frameHookCalls+=calls[i];callRows.push({name:row.name,n:calls[i],ms:inclusive[i],selfMs:exclusive[i],maxCallMs:maxCall[i],mode:row.mode});}
      const gaps=instrumented?{
       inputToWorldMs:Math.max(0,(marks.worldStart??before)-(marks.inputsEnd??before)),
       afterWorldBeforeRenderMs:Math.max(0,(marks.renderStart??before)-(marks.worldEnd??before)),
       beforeInputsMs:Math.max(0,(marks.inputsStart??before)-before),afterRenderMs:Math.max(0,before+stepMs-(marks.renderEnd??before))}:null;
      const row={frame,simTime:w.time,simDelta:w.time-timeBefore,pos:{...hero.pos},goal,stepMs,simMs,renderMs,outsideNativeSlabsMs:Math.max(0,stepMs-simMs-renderMs),gaps,hookCalls:frameHookCalls,...(instrumented?{dormancyMs:callRows.find(c=>c.name==='dormancy.update')?.ms??0}:{})};frames.push(row);
      if(stepMs>50){const timed=callRows.filter(c=>c.mode==='time');slowFrames.push({...row,census:census(),inclusive:[...timed].sort((a,b)=>b.ms-a.ms).slice(0,28),exclusive:[...timed].sort((a,b)=>b.selfMs-a.selfMs).slice(0,20),queryCounts:callRows.filter(c=>c.mode==='count')});if(slowFrames.length>128){slowFrames.sort((a,b)=>b.stepMs-a.stepMs);slowFrames.length=128;}}
      if(frame%300===0){const at={frame,pos:{...hero.pos},goal,actors:w.actors.length,adopted:m.geography.warmStats.adopted};progress.push(at);console.log('ATTRIBUTION_PROGRESS '+JSON.stringify({instrumented,...at}));}
      observationsMs+=performance.now()-observationStart;
      if(__game.crash().fatal)throw Error('Native fatal: '+JSON.stringify(__game.crash().fatal));if(w.massRuntime!==m||w.player!==hero)throw Error('Diagnostic course changed its world/hero');if(hero.dead||w.gameOver)throw Error('Diagnostic invulnerable hero unexpectedly died');
      if(goal===route.length-1&&Math.hypot(route[goal].x-hero.pos.x,route[goal].y-hero.pos.y)<10)break;
      await new Promise(resolve=>setTimeout(resolve,4));
     }
    }finally{active=false;__game.devInput(null);for(const h of original.reverse()){if(h.own)h.owner[h.key]=h.fn;else delete h.owner[h.key];}}
    const result={instrumented,route,start,end:{...hero.pos},goal,reached:goal===route.length-1&&Math.hypot(route[goal].x-hero.pos.x,route[goal].y-hero.pos.y)<10,
     actualWorldSeconds:w.time-startTime,initial,final:census(),progress,calibration,hookCalls,observationsMs,...(instrumented?{scheduledDormancy:summary(frames.filter(f=>f.dormancyMs>0).map(f=>f.dormancyMs))}:{}),hookInventory:rows.slice(1).map(r=>({name:r.name,mode:r.mode})),
     summary:{step:summary(frames.map(f=>f.stepMs)),nativeSim:summary(frames.map(f=>f.simMs)),nativeRender:summary(frames.map(f=>f.renderMs)),outsideNativeSlabs:summary(frames.map(f=>f.outsideNativeSlabsMs)),
      ...(instrumented?{inputToWorld:summary(frames.map(f=>f.gaps.inputToWorldMs)),beforeInputs:summary(frames.map(f=>f.gaps.beforeInputsMs)),afterWorldBeforeRender:summary(frames.map(f=>f.gaps.afterWorldBeforeRenderMs)),afterRender:summary(frames.map(f=>f.gaps.afterRenderMs))}:{})},
     travelSummary:{excludes:'Frame 0 is the first entry frame after controlled initial teleport; excluded here, retained in complete summary/raw frames.',step:summary(frames.slice(1).map(f=>f.stepMs)),nativeSim:summary(frames.slice(1).map(f=>f.simMs)),nativeRender:summary(frames.slice(1).map(f=>f.renderMs))},
     methods:rows.slice(1).filter(r=>r.calls).sort((a,b)=>b.inclusiveMs-a.inclusiveMs),frames,slowFrames:slowFrames.sort((a,b)=>b.stepMs-a.stepMs),crash:__game.crash().fatal};
    if(!result.reached){const next=route[goal],solid=w.pointInSolid(next.x,next.y,hero.radius);result.blocked={next,clamp:w.clampPos(next,hero.radius),solid:solid?{kind:solid.kind,pos:solid.pos,radius:solid.radius}:null,nearbyActors:w.actors.filter(a=>Math.hypot(a.pos.x-hero.pos.x,a.pos.y-hero.pos.y)<120).map(a=>({id:a.id,def:a.defId,team:a.team,pos:a.pos,radius:a.radius}))};}
    return result;
   },instrumented);
   report[name].images=await shot(name);save();assert.equal(report[name].crash,null);assert.ok(report[name].reached,'ordinary route must complete; see blocked body diagnostics');
  }
  assert.deepEqual(report.control.route,report.attributed.route);assert.equal(report.consoleErrors.length,0,'browser console errors');report.comparison={control:report.control.summary,attributed:report.attributed.summary,interpretation:'Instrumented timing is inclusive attribution with observer overhead, not a second uninstrumented performance claim.'};save();
  console.log('PASS ordinary geographic frame attribution, native telemetry control, complete inclusive phase inventory and slow-frame census');clearTimeout(timer);win.destroy();server.close();app.exit(0);
 }catch(error){report.error=String(error.stack||error);try{report.failureImages=await shot('failure');}catch{}save();console.error(error);clearTimeout(timer);app.exit(1);}
});
