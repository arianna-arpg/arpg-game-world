// Real browser Continue acceptance for immutable native actor pages.
// Requires the frozen preview build; no Vite/source imports or substituted world.
// Setup uses the established paging fixture's controlled travel and .63 wounds.
// It is not an ordinary-travel, combat-balance or all-history memory benchmark.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const tag=(process.env.RESUME_TAG||'current').replace(/[^a-zA-Z0-9_-]/g,'_');
const reports=path.join(__dirname,'reports');fs.mkdirSync(reports,{recursive:true});
const output=path.join(reports,'native-resume-ui-'+tag+'.json');
fs.copyFileSync(__filename,path.join(reports,'native-resume-ui-'+tag+'.harness.cjs'));
app.setPath('userData',path.join(reports,process.env.RESUME_PROFILE?path.basename(process.env.RESUME_PROFILE):'native-resume-profile-'+process.pid));
app.on('window-all-closed',()=>{});
app.disableHardwareAcceleration();app.commandLine.appendSwitch('enable-precise-memory-info');
const instrumentation=()=>{
 window.requestAnimationFrame=()=>0;
 window.__resumeProbe={phase:'boot',reads:[],parsed:[],factories:[],weakPages:[],errors:[],gate:null};
 const p=window.__resumeProbe,get=IDBObjectStore.prototype.get,parse=JSON.parse,digest=SubtleCrypto.prototype.digest;
 IDBObjectStore.prototype.get=function(key){if(this.name==='pages')p.reads.push({phase:p.phase,key:String(key),at:performance.now()});return get.call(this,key);};
 JSON.parse=function(text,...args){const value=parse.call(this,text,...args);if(value&&value.characterNativePage===1){p.parsed.push({phase:p.phase,page:value.cohort?.page,bytes:typeof text==='string'?text.length:0});p.weakPages.push(new WeakRef(value));}return value;};
 SubtleCrypto.prototype.digest=async function(algorithm,data){
  const gate=p.gate;if(gate&&!gate.seen){const text=new TextDecoder().decode(data);if(text.includes('"characterNativePage":1')&&(!gate.page||text.includes(gate.page))){gate.seen=true;gate.phase=p.phase;await gate.promise;}}
  return digest.call(this,algorithm,data);
 };
 window.addEventListener('error',e=>p.errors.push(String(e.error?.stack||e.message)));
 window.addEventListener('unhandledrejection',e=>p.errors.push(String(e.reason?.stack||e.reason)));
};
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.RESUME_DIST||'dist-preview');
 const index=fs.readFileSync(path.join(root,'index.html'),'utf8'),asset=index.match(/src="([^"]+\.js)"/)?.[1];
 const report={tag,build:asset,bundleHash:asset?crypto.createHash('sha256').update(fs.readFileSync(path.join(root,asset))).digest('hex'):null,
  harnessHash:crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'),seed:99,checks:[],consoleErrors:[],
  methodology:'Production static client and actual Continue button, fresh renderer contexts, real generated native cohorts, durable IndexedDB roots/pages. Setup teleports and direct .63 wounds are disclosed; no provider/Actor/codec replacement. Hero invulnerable only after admission. Page body JSON WeakRefs and factory census are diagnostic; they do not establish constant memory or lazy I/O. All far pages are deliberately read at Continue.'};
 const save=()=>fs.writeFileSync(output,JSON.stringify(report,null,2));
 const mark=(name,data)=>{report.checks.push({name,...data});save();console.log('RESUME '+name+' '+JSON.stringify(data));};
 let win,server;const pageRepairs=[];const timer=setTimeout(()=>{report.error='Harness timeout';save();app.exit(1);},25*60*1000);
 const run=async(fn,...args)=>{const result=await win.webContents.executeJavaScript('(async()=>{try{return{ok:true,value:await('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return{ok:false,error:e.stack||String(e)}}})()');if(!result.ok)throw Error(result.error);return result.value;};
 const wait=async(fn,message,ms=60000)=>{const start=Date.now();for(;;){if(await run(fn))return;if(Date.now()-start>ms)throw Error(message);await new Promise(r=>setTimeout(r,100));}};
 const boot=async()=>{
  const previous=win;
  win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
  win.webContents.on('console-message',e=>{if(e.level==='error')report.consoleErrors.push(e.message);});
  console.log('RESUME_BOOT renderer');await win.loadURL('about:blank');if(previous&&!previous.isDestroyed())previous.destroy();
  win.webContents.debugger.attach('1.3');await win.webContents.debugger.sendCommand('Page.enable');
  await win.webContents.debugger.sendCommand('Page.addScriptToEvaluateOnNewDocument',{source:'('+instrumentation+')()'});
  console.log('RESUME_BOOT instrumented');
  await win.loadURL('http://127.0.0.1:'+server.address().port+'/');
  console.log('RESUME_BOOT loaded');await wait(()=>!!window.__game,'Game unavailable');await run(async()=>{await __game.hydrated();Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
   const p=window.__resumeProbe,w=__game.world(),proto=Object.getPrototypeOf(w),create=proto.createMonster;
   proto.createMonster=function(...args){const a=create.apply(this,args);if(a)p.factories.push({phase:p.phase,monster:a.defId,x:a.pos.x,y:a.pos.y});return a;};
   window.__resumeDB=async(name,store,key,op='read',row)=>{const db=await new Promise((yes,no)=>{const q=indexedDB.open(name,1);q.onsuccess=()=>yes(q.result);q.onerror=()=>no(q.error);});try{return await new Promise((yes,no)=>{const tx=db.transaction(store,op==='read'?'readonly':'readwrite'),s=tx.objectStore(store),q=op==='read'?s.get(key):op==='delete'?s.delete(key):s.put(row);let value;q.onsuccess=()=>value=q.result;tx.oncomplete=()=>yes(value);tx.onabort=()=>no(tx.error);});}finally{db.close();}};
   window.__resumeRoot=()=>window.__resumeDB('preview:seamless-world:arpg_run_snapshots_v1','runs','preview:seamless-world:arpg_character_v1');
   window.__resumePage=(key,op='read',row)=>window.__resumeDB('preview:seamless-world:arpg_native_pages_v1','pages',key,op,row);
   window.__resumeStats=()=>{const w=__game.world(),m=w.massRuntime,p=window.__resumeProbe;return{zone:w.zone.id,charId:w.seats.length?w.meta.charId:null,clock:w.time,pose:w.seats.length?{...w.player.pos}:null,hero:w.seats.length?w.player.id:null,
    mass:m?{...m.nativePagingStats,resumePending:m.resumePending,ids:[...m.natives.keys()],pagedIds:[...m.paged.keys()]}:null,
    errors:p.errors,reads:p.reads,parsed:p.parsed,factories:p.factories,weakPagesAlive:p.weakPages.filter(r=>r.deref()).length,fatal:__game.crash().fatal};};
  });
 };
 const clickContinue=async()=>{await wait(()=>!!document.querySelector('#sm-continue:not([disabled])'),'Continue unavailable');await run(()=>{window.__resumeBefore=__game.world();window.__resumeProbe.phase='continue';document.querySelector('#sm-continue:not([disabled])').click();});};
 const continued=async()=>{await wait(()=>__game.world()!==window.__resumeBefore,'Continue did not publish');return run(()=>{__game.world().player.invulnerable=true;return window.__resumeStats();});};
 const collect=async()=>{await win.webContents.debugger.sendCommand('HeapProfiler.collectGarbage');await new Promise(r=>setTimeout(r,20));return run(()=>window.__resumeStats());};
 const shot=async name=>{await run(()=>{const w=__game.world();if(w.seats.length)__game.renderer.render(w);});win.webContents.invalidate();await new Promise(r=>setTimeout(r,80));const file=path.join(reports,'native-resume-'+tag+'-'+name+'.png');fs.writeFileSync(file,(await win.webContents.capturePage()).toPNG());return file;};
 try{
  server=http.createServer((req,res)=>{if(req.url.startsWith('/__save/')){res.writeHead(404);return res.end();}const pathname=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');fs.createReadStream(file).pipe(res);});await new Promise(r=>server.listen(Number(process.env.RESUME_PORT)||0,'127.0.0.1',r));
  await boot();console.log('RESUME_BOOT hydrated');
  if(!process.env.RESUME_PROFILE)await run(()=>{__game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();w.startWorldMass(99);w.player.invulnerable=true;window.__resumeWounds=new Map();window.__resumeWeak=new Map();window.__resumeTrips=0;window.__resumeProbe.phase='setup';});
  let setup;
  for(let batch=0;!process.env.RESUME_PROFILE&&batch<16;batch++){
   setup=await run(async()=>{const w=__game.world(),m=w.massRuntime;for(let i=0;i<8;i++){
    for(const[id,a]of m.natives)if(!window.__resumeWeak.has(id)){a.life*=.63;window.__resumeWeak.set(id,new WeakRef(a));window.__resumeWounds.set(id,a.life);}
    w.time+=13;w.player.pos={x:5000+window.__resumeTrips*3200,y:4000};m.update(w,true);window.__resumeTrips++;await m.flushNativePaging();await new Promise(r=>setTimeout(r,0));
   }return{...m.nativePagingStats,trips:window.__resumeTrips,total:window.__resumeWeak.size,weakAlive:[...window.__resumeWeak.values()].filter(r=>r.deref()).length};});
   console.log('RESUME_SETUP '+JSON.stringify(setup));if(setup.pages>=5&&setup.paged>=480)break;
  }
  if(process.env.RESUME_PROFILE){setup=await run(async()=>{const e=JSON.parse((await window.__resumeRoot()).current.body);window.__resumeWounds=new Map();return{pages:e.pages.length,paged:e.pages.reduce((n,p)=>n+p.ids.length,0),resident:e.character.world.worldmass.enemies.length,reusedDurableFixture:true};});}
  assert.ok(setup.pages>=5&&setup.paged>=480,'Actual generated history must page at least 480 actors in five cohorts');
  if(!process.env.RESUME_PROFILE){await win.webContents.debugger.sendCommand('HeapProfiler.collectGarbage');
  setup.weakAliveAfterGC=await run(()=>[...window.__resumeWeak.values()].filter(r=>r.deref()).length);
  await run(async()=>{const w=__game.world(),first=[...new Set(w.massRuntime.paged.values())][0];if(!first)throw Error('No natural history to prepare cold near restoration');w.landPartyAt(first.positions[0]);__game.save();await __game.flushRunSave();});}
  const original=await run(async()=>{window.__resumeProbe.phase='fixture-inspection';const row=await window.__resumeRoot(),e=JSON.parse(row.current.body),receipts=e.character.world.worldmass.enemies.map(a=>[a.id,a.monster,a.life,a.birth]);for(const p of e.pages){const data=JSON.parse((await window.__resumePage(p.ref.key)).body);for(const a of data.enemies){const expected=window.__resumeWounds?.get(a.id);if(expected!==undefined&&a.life!==expected)throw Error('Setup wound lost '+a.id);receipts.push([a.id,a.monster,a.life,a.birth]);}}return{row,envelope:e,receipts};});
  const e=original.envelope,mass=e.character.world.worldmass;
  assert.equal(e.characterPages,1);assert.equal(original.receipts.length,new Set(original.receipts.map(r=>r[0])).size);
  mark('real-history',{...setup,totalSaved:original.receipts.length,rootResident:mass.enemies.length,pageCount:e.pages.length,rootBytes:original.row.current.body.length,hero:e.character.charId});
  const far=e.pages.find(p=>p.positions.every(at=>Math.hypot(at.x-mass.player.x,at.y-mass.player.y)>5000));assert.ok(far,'Need a genuinely distant page');
  const farRow=await run(key=>window.__resumePage(key),far.ref.key);pageRepairs.push([far.ref.key,farRow]);
  // A cold renderer sees only the Continue summary, then an authoritative far-page refusal.
  await boot();const menu=await collect();assert.equal(menu.reads.length,0,'Boot summary must not read actor pages');assert.equal(menu.factories.length,0);mark('cold-menu',{pageReads:menu.reads.length,factories:menu.factories.length});
  for(const fault of ['missing','corrupt']){
   await run(async(key,row,fault)=>{window.__resumeProbe.phase='fault-'+fault;if(fault==='missing')await window.__resumePage(key,'delete');else await window.__resumePage(key,'put',{...row,body:row.body.slice(0,-1)+'!'});},far.ref.key,farRow,fault);
   const before=await run(async()=>({root:await window.__resumeRoot(),account:localStorage.getItem('preview:seamless-world:arpg_account_v1')}));
   await clickContinue();await wait(()=>!document.querySelector('#start-menu')?.classList.contains('hidden')&&!!document.querySelector('#sm-continue:not([disabled])')&&/missing|corrupt|invalid|unavailable/i.test(document.querySelector('#start-menu')?.textContent||''),'Fault did not produce a retryable Continue refusal');
   const refused=await run(async()=>({sameWorld:__game.world()===window.__resumeBefore,root:await window.__resumeRoot(),account:localStorage.getItem('preview:seamless-world:arpg_account_v1'),stats:window.__resumeStats(),notice:document.querySelector('#start-menu').textContent}));
   assert.ok(refused.sameWorld);assert.deepEqual(refused.root,before.root);assert.equal(refused.account,before.account);assert.equal(refused.stats.factories.length,0,'Far-page refusal must precede Actor factories');
   mark('refuse-'+fault,{sameWorld:refused.sameWorld,rootUnchanged:true,accountUnchanged:true,factories:refused.stats.factories.length,notice:refused.notice});
   await run((key,row)=>window.__resumePage(key,'put',row),far.ref.key,farRow);
  }
  report.refusalImage=await shot('refused');await run(()=>{const p=window.__resumeProbe;p.reads=[];p.parsed=[];p.factories=[];});await clickContinue();let restored=await continued();
  assert.ok(e.pages.every(p=>restored.reads.some(r=>r.key===p.ref.key)),'Every immutable page must be preflighted');
  const savedIds=new Set(original.receipts.map(r=>r[0])),residentIds=new Set(restored.mass.ids),pagedIds=new Set(restored.mass.pagedIds);
  assert.ok([...savedIds].every(id=>residentIds.has(id)!==pagedIds.has(id)),'Every saved native must have exactly one resident or page owner');
  assert.ok(far.ids.every(id=>pagedIds.has(id)&&!residentIds.has(id)),'Far native graph was eagerly restored');
  const near=e.pages.filter(p=>p.positions.some(at=>Math.hypot(at.x-mass.player.x,at.y-mass.player.y)<=2900));assert.ok(near.length);assert.ok(near.flatMap(p=>p.ids).every(id=>residentIds.has(id)&&!pagedIds.has(id)),'Cold near history must mount before publication');
  assert.ok(restored.factories.length<savedIds.size,'Cold Continue must not instantiate all historical actors');
  const orderExpected=e.order.filter(id=>residentIds.has(id)),orderActual=restored.mass.ids.filter(id=>savedIds.has(id)),creationOrderExact=JSON.stringify(orderExpected)===JSON.stringify(orderActual);if(!tag.startsWith('diagnostic'))assert.ok(creationOrderExact,'Cold near hydration must retain native creation order');
  assert.equal(restored.charId,e.character.charId);assert.equal(restored.mass.resumePending,false);
  assert.deepEqual(restored.pose,{x:mass.player.x,y:mass.player.y});
  restored=await collect();assert.equal(restored.weakPagesAlive,0,'Preflight page roots remain retained after GC');
  mark('cold-continue',{resident:restored.mass.resident,paged:restored.mass.paged,pages:restored.mass.pages,nearHistorical:near.reduce((n,p)=>n+p.ids.length,0),creationOrderExact,reads:restored.reads.length,factories:restored.factories.length,parsed:restored.parsed.length,weakPageRootsAfterGC:restored.weakPagesAlive,pose:restored.pose});
  report.continueImage=await shot('continued');
  // Save immediately without a gameplay tick; historical pages must remain references.
  await run(async()=>{window.__resumeProbe.phase='save';__game.save();await __game.flushRunSave();});
  const saved=await run(async()=>JSON.parse((await window.__resumeRoot()).current.body));
  assert.equal(saved.characterPages,1);assert.ok(saved.pages.some(p=>p.ref.key===far.ref.key));
  mark('immediate-metadata-save',{pages:saved.pages.length,resident:saved.character.world.worldmass.enemies.length,farReferenceKept:true});
  // Delay a genuine page reread at the wake boundary. Whole host clock/input must stop.
  const target=saved.pages[0],targetRow=await run(key=>window.__resumePage(key),target.ref.key),targetData=JSON.parse(targetRow.body);
  await run((page,pos)=>{const p=window.__resumeProbe;p.phase='delayed-wake';let release;p.gate={page,seen:false,promise:new Promise(r=>release=r),release:()=>release()};const w=__game.world();w.landPartyAt(pos);__game.devInput(()=>({dx:1,dy:0,aim:{x:w.player.pos.x+100,y:w.player.pos.y},held:[true],edge:[]}));__game.step(1);},target.ref.page,target.positions[0]);
  await wait(()=>window.__resumeProbe.gate.seen,'Near page digest gate not reached');
  const stopped=await run(()=>{const w=__game.world(),m=w.massRuntime,before={clock:w.time,pose:{...w.player.pos},xp:w.meta.xp,life:w.player.life,required:m.nativeReadiness(w)};__game.step(20);return{before,after:{clock:w.time,pose:{...w.player.pos},xp:w.meta.xp,life:w.player.life,required:m.nativeReadiness(w)},ids:[...m.natives.keys()],paged:[...m.paged.keys()]};});
  assert.deepEqual(stopped.after,stopped.before,'Pending historical owners must stop gameplay input/clock');assert.ok(target.ids.every(id=>stopped.paged.includes(id)&&!stopped.ids.includes(id)));
  await run(()=>{__game.devInput(null);window.__resumeProbe.gate.release();window.__resumeProbe.gate=null;});
  await wait(()=>__game.world().massRuntime.nativeReadiness(__game.world()).status==='ready','Near page did not hydrate');
  const exact=await run(ids=>{const w=__game.world(),m=w.massRuntime;return ids.map(id=>{const a=m.natives.get(id);return{id,monster:a?.defId,life:a?.life,fallen:m.state.claimed('fallen',id),paged:m.paged.has(id)};});},target.ids);
  for(const row of exact){const expected=targetData.enemies.find(a=>a.id===row.id);assert.equal(row.life,expected.life);assert.equal(row.monster,expected.monster);assert.equal(row.fallen,false);assert.equal(row.paged,false);}
  mark('delayed-near-wake',{required:stopped.before.required,framesHeld:20,clockUnchanged:true,exactBodies:exact.length});
  // A missing near page after successful preflight remains an owner while paused.
  const missingNear=await run(()=>{const m=__game.world().massRuntime;return [...new Set(m.paged.values())][0];});assert.ok(missingNear,'Need remaining far history for post-preflight fault');
  const missingRow=await run(key=>window.__resumePage(key),missingNear.ref.key);pageRepairs.push([missingNear.ref.key,missingRow]);
  await run(async entry=>{await window.__resumePage(entry.ref.key,'delete');const w=__game.world();w.landPartyAt(entry.positions[0]);window.__resumeProbe.phase='missing-wake';__game.step(1);},missingNear);
  await wait(()=>__game.world().massRuntime.nativeReadiness(__game.world()).status==='refused','Post-preflight page loss must refuse the wake boundary');
  const heldMissing=await run(async ids=>{const w=__game.world(),m=w.massRuntime,before={time:w.time,pos:{...w.player.pos},xp:w.meta.xp};__game.devInput(()=>({dx:1,dy:0,aim:w.player.pos,held:[true],edge:[]}));__game.step(12);__game.devInput(null);__game.save();await __game.flushRunSave();const envelope=JSON.parse((await window.__resumeRoot()).current.body);return{before,after:{time:w.time,pos:{...w.player.pos},xp:w.meta.xp},claims:ids.map(id=>({id,paged:m.paged.has(id),resident:m.natives.has(id),fallen:m.state.claimed('fallen',id)})),durable:envelope.pages.some(p=>p.ids.includes(ids[0]))};},missingNear.ids);
  assert.deepEqual(heldMissing.after,heldMissing.before);assert.ok(heldMissing.durable);assert.ok(heldMissing.claims.every(r=>r.paged&&!r.resident&&!r.fallen));
  await run(async(key,row)=>{await window.__resumePage(key,'put',row);const w=__game.world();w.massRuntime.retryNativePages(w);},missingNear.ref.key,missingRow);
  await wait(()=>__game.world().massRuntime.nativeReadiness(__game.world()).status==='ready','Repaired immutable near bytes must retry independently of world time');
  const recovered=await run(ids=>{const w=__game.world(),m=w.massRuntime;return ids.map(id=>({id,life:m.natives.get(id)?.life,fallen:m.state.claimed('fallen',id)}));},missingNear.ids),missingData=JSON.parse(missingRow.body);
  for(const row of recovered){assert.equal(row.life,missingData.enemies.find(e=>e.id===row.id).life);assert.equal(row.fallen,false);}
  mark('missing-near-retry',{heldFrames:12,saveWhileRefused:true,claimsKept:heldMissing.claims.length,exactRecovered:recovered.length,worldClockRetry:false});
  // Actual native cellar scene and actual return hook; no invented cave definition.
  const cave=await run(async()=>{const w=__game.world(),m=w.massRuntime,mouth=w.caveEntrances.find(c=>c.kind==='cellar_hatch');if(!mouth)throw Error('Natural home cellar missing');w.landPartyAt(mouth.pos);m.update(w,true);await m.flushNativePaging();const hero=w.player;w.enterSidezone(mouth);if(w.massRuntime||w.player!==hero)throw Error('Native cellar did not preserve hero');__game.save();await __game.flushRunSave();const e=JSON.parse((await window.__resumeRoot()).current.body),c=e.character??e;return{mouth:mouth.pos,pose:{...w.player.pos},zone:w.zone.id,charId:w.meta.charId,sideareas:c.world.massSideareas,pages:e.pages?.length??0};});
  assert.ok(cave.sideareas?.active);assert.ok(cave.pages>0);mark('native-cave-save',cave);
  const caveRoot=await run(()=>window.__resumeRoot());
  await run(async original=>{const changed=structuredClone(original),envelope=JSON.parse(changed.current.body),c=envelope.character??envelope;c.world.massSideareas.active.rungs[0].seed++;const body=JSON.stringify(envelope);let a=2166136261,b=0x9e3779b9;for(let i=0;i<body.length;i++){const x=body.charCodeAt(i);a=Math.imul(a^x,16777619);b=Math.imul(b^x,0x85ebca6b);}changed.current.body=body;changed.current.checksum=body.length+':'+(a>>>0).toString(16)+':'+(b>>>0).toString(16);await window.__resumeDB('preview:seamless-world:arpg_run_snapshots_v1','runs',changed.key,'put',changed);},caveRoot);
  await boot();await clickContinue();await wait(()=>!document.querySelector('#start-menu')?.classList.contains('hidden')&&!!document.querySelector('#sm-continue:not([disabled])')&&/sidearea|cave|invalid/i.test(document.querySelector('#start-menu')?.textContent||''),'Malformed active cave must refuse instead of resuming on surface');
  const caveRefused=await run(()=>({sameWorld:__game.world()===window.__resumeBefore,notice:document.querySelector('#start-menu').textContent}));assert.ok(caveRefused.sameWorld);mark('malformed-cave-refused',caveRefused);
  await run(row=>window.__resumeDB('preview:seamless-world:arpg_run_snapshots_v1','runs',row.key,'put',row),caveRoot);
  await boot();await clickContinue();const caveRestored=await continued();assert.equal(caveRestored.mass,null);assert.equal(caveRestored.zone,cave.zone);assert.deepEqual(caveRestored.pose,cave.pose);assert.equal(caveRestored.charId,cave.charId);
  const returned=await run(async()=>{const w=__game.world(),hero=w.player,exit=w.exits.find(e=>e.to==='worldmass_expedition');if(!exit)throw Error('Real cellar return missing');w.travelThrough(exit);for(let i=0;i<200;i++){const r=w.massRuntime?.nativeReadiness(w);if(r?.status==='ready')break;await new Promise(r=>setTimeout(r,20));}const m=w.massRuntime;if(!m||m.nativeReadiness(w).status!=='ready')throw Error('Surface return remained blocked');return{sameHero:hero===w.player,pose:{...w.player.pos},stats:window.__resumeStats()};});
  assert.ok(returned.sameHero);assert.ok(Math.hypot(returned.pose.x-cave.mouth.x,returned.pose.y-cave.mouth.y)<90);mark('native-cave-continue-return',{sameHero:true,interiorExact:true,returned:returned.pose,mouth:cave.mouth,pages:returned.stats.mass.pages,paged:returned.stats.mass.paged});report.returnImage=await shot('cellar-return');
  // Use the real Options download action to prove the complete portable path.
  await run(async()=>{__game.save();await __game.flushRunSave();});await boot();
  const exportPage=await run(async()=>{const e=JSON.parse((await window.__resumeRoot()).current.body);return e.pages?.[0];});assert.ok(exportPage,'Portable failure proof requires a distant page');const exportPageRow=await run(key=>window.__resumePage(key),exportPage.ref.key);pageRepairs.push([exportPage.ref.key,exportPageRow]);await run(key=>window.__resumePage(key,'delete'),exportPage.ref.key);
  await run(()=>{window.__resumeProbe.phase='portable-export';const create=URL.createObjectURL;URL.createObjectURL=function(blob){blob.text().then(s=>window.__resumePortable=JSON.parse(s));return create.call(this,blob);};const click=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.download)return;return click.call(this);};document.querySelector('#sm-keys').click();document.querySelector('[data-opttab=interface]').click();document.querySelector('#opt-exportsave').click();});
  await wait(()=>/Export failed:/i.test(document.querySelector('#start-menu')?.textContent||''),'Missing page export must report failure');assert.equal(await run(()=>!!window.__resumePortable),false,'Missing page cannot yield shortened portable download');mark('portable-missing-refused',{downloadProduced:false});
  await run(async(key,row)=>{await window.__resumePage(key,'put',row);document.querySelector('#opt-exportsave').click();},exportPage.ref.key,exportPageRow);
  await wait(()=>!!window.__resumePortable,'Portable export did not finish');
  const exported=await run(()=>{const e=window.__resumePortable,c=e.characters['1'];return{kind:e.kind,charId:c.charId,paged:!!c.characterPages,receipts:c.world.worldmass.enemies.map(a=>[a.id,a.monster,a.life,a.birth])};});
  const portableText=await run(()=>JSON.stringify(window.__resumePortable));
  const exportById=new Map(exported.receipts.map(r=>[r[0],r]));for(const row of original.receipts)assert.deepEqual(exportById.get(row[0]),row,'Portable export changed historical birth/wound '+row[0]);assert.equal(exported.paged,false);mark('portable-export',{completeHistorical:original.receipts.length,exported:exported.receipts.length,inline:true});
  // A newer New Run invalidates a suspended genuine Continue before publication.
  await boot();await run(()=>{const p=window.__resumeProbe;let release;p.gate={seen:false,promise:new Promise(r=>release=r),release:()=>release()};});await clickContinue();await wait(()=>window.__resumeProbe.gate.seen,'Resume race did not reach an immutable page');
  const newRun=await run(()=>{const menuVisible=!document.querySelector('#start-menu').classList.contains('hidden'),pendingDisabled=document.querySelector('#sm-continue').disabled;document.querySelector('#sm-start').click();window.__resumeNew=__game.world();const id=window.__resumeNew.meta.charId;window.__resumeProbe.gate.release();window.__resumeProbe.gate=null;return{id,menuVisible,pendingDisabled,scene:window.__resumeNew.scene?.id};});
  await new Promise(r=>setTimeout(r,600));const race=await run(()=>({same:__game.world()===window.__resumeNew,id:__game.world().meta.charId,errors:window.__resumeProbe.errors,fatal:__game.crash().fatal}));
  assert.ok(race.same);assert.equal(race.id,newRun.id);assert.notEqual(race.id,e.character.charId);if(!tag.startsWith('diagnostic')){assert.ok(newRun.menuVisible,'New Run must remain visibly reachable during Continue');assert.ok(newRun.pendingDisabled,'Duplicate Continue must be disabled');}mark('new-run-cancels-delayed-continue',{sameProvisionalWorld:true,provisionalCharacter:newRun.id,menuVisible:newRun.menuVisible,pendingDisabled:newRun.pendingDisabled,scene:newRun.scene,errors:race.errors});
  assert.deepEqual(race.errors,[]);assert.equal(race.fatal,null);
  // The produced portable JSON must survive without the old immutable page DB.
  await boot();await run(async()=>{await new Promise((yes,no)=>{const q=indexedDB.deleteDatabase('preview:seamless-world:arpg_native_pages_v1');q.onsuccess=()=>yes();q.onerror=()=>no(q.error);q.onblocked=()=>no(Error('Test page DB unexpectedly held open'));});});pageRepairs.length=0;
  await run(text=>{const click=HTMLInputElement.prototype.click;HTMLInputElement.prototype.click=function(){if(this.type==='file'){const transfer=new DataTransfer();transfer.items.add(new File([text],'native-resume-portable.json',{type:'application/json'}));this.files=transfer.files;this.dispatchEvent(new Event('change'));return;}return click.call(this);};document.querySelector('#sm-keys').click();document.querySelector('[data-opttab=interface]').click();document.querySelector('#opt-importsave').click();},portableText);
  await wait(()=>!!document.querySelector('#opt-saveport-confirm'),'Produced portable save was refused by the actual importer');
  const reload=new Promise(resolve=>win.webContents.once('did-finish-load',resolve));await run(()=>document.querySelector('#opt-saveport-confirm').click());await reload;
  await boot();const importedRoot=await run(async()=>JSON.parse((await window.__resumeRoot()).current.body));assert.equal(importedRoot.characterPages,undefined);assert.equal(importedRoot.charId,exported.charId);
  await clickContinue();const imported=await continued();assert.equal(imported.charId,exported.charId);assert.equal(imported.mass.paged,0);assert.equal(imported.reads.length,0,'Portable Continue must not require the deleted page DB');
  const importedRows=await run(()=>{const w=__game.world();return w.massRuntime.snapshot(w).enemies.map(a=>[a.id,a.monster,a.life,a.birth]);}),importedById=new Map(importedRows.map(r=>[r[0],r]));for(const row of exported.receipts)assert.deepEqual(importedById.get(row[0]),row,'Portable import changed exact native '+row[0]);
  mark('portable-import-without-old-pages',{oldPageDatabaseDeleted:true,actualFileInputAndConfirmation:true,exactBodies:exported.receipts.length,imported:importedRows.length,pageReads:imported.reads.length,paged:imported.mass.paged});report.importImage=await shot('portable-import');
  assert.deepEqual(report.consoleErrors,[]);
  report.acceptance={actualMenuContinue:true,coldRenderer:true,farHistoryRemainsPaged:true,allPagesPreflight:true,missingAndCorruptRefuseBeforeFactories:true,nearColdRestore:true,missingNearRetry:true,immediateMetadataSave:true,nearWakeHoldsWholeGame:true,exactWounds:true,nativeCaveContinue:true,malformedCaveRefused:true,portableMissingRefused:true,portableExport:true,portableImportWithoutOldPages:true,staleContinueCancelled:true};save();console.log('RESUME_PASS '+output);
 }catch(error){report.error=String(error.stack||error);try{for(const[key,row]of pageRepairs)await run((key,row)=>window.__resumePage(key,'put',row),key,row);report.fixturePageCleanup=true;}catch(cleanup){report.fixturePageCleanup=String(cleanup);}try{report.failure=await run(()=>window.__resumeStats?.());report.failureImage=await shot('failure');}catch{}save();console.error(error);process.exitCode=1;}
 finally{clearTimeout(timer);if(win&&!win.isDestroyed())win.destroy();server?.close();app.exit(process.exitCode||0);}
}).catch(error=>{console.error(error);app.exit(1);});
