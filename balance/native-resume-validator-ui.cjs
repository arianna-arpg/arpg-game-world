// Real browser Continue acceptance for immutable native actor pages.
// Requires the frozen preview build; no Vite/source imports or substituted world.
// Setup uses the established paging fixture's controlled travel and .63 wounds.
// It is not an ordinary-travel, combat-balance or all-history memory benchmark.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const tag=(process.env.RESUME_TAG||'validator-current').replace(/[^a-zA-Z0-9_-]/g,'_');
const reports=path.join(__dirname,'reports');fs.mkdirSync(reports,{recursive:true});
const output=path.join(reports,'native-resume-validator-ui-'+tag+'.json');
fs.copyFileSync(__filename,path.join(reports,'native-resume-validator-ui-'+tag+'.harness.cjs'));
const sourceProfile=path.resolve(reports,process.env.RESUME_SOURCE_PROFILE||'native-resume-profile-93752');
const testProfile=path.join(reports,'native-resume-validator-profile-'+process.pid);
if(!fs.existsSync(sourceProfile)||fs.existsSync(testProfile))throw Error('Invalid isolated source/target profile');
fs.cpSync(sourceProfile,testProfile,{recursive:true});app.setPath('userData',testProfile);
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
  sourceProfile, testProfile, baselineReport:'native-resume-ui-final-BPfZZMdJ.json', methodology:'Focused validator followup only. Copies genuine586-actor durable portable-import history from prior full browser course; normal runtime re-pages those existing quiet actors. No repeated96trip generation and no provider/Actor/codec replacements. Fault rows are coherently rehashed including page ref/SHA256/bytes/root checksum. Actual UI Continue/export/import. No timing or constant-memory claim.'};
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
  server=http.createServer((req,res)=>{if(req.url.startsWith('/__save/')){res.writeHead(404);return res.end();}const pathname=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');fs.createReadStream(file).pipe(res);});await new Promise(r=>server.listen(Number(process.env.RESUME_PORT)||55091,'127.0.0.1',r));
  await boot();
  const source=await run(async()=>{const row=await window.__resumeRoot();if(!row?.current?.body)throw Error('Retained genuine history missing');const e=JSON.parse(row.current.body),c=e.character??e;return{checksum:row.current.checksum,character:c.charId,inline:!e.characterPages,receipts:c.world.worldmass.enemies.map(a=>[a.id,a.monster,a.life,a.birth])};});
  assert.equal(source.inline,true);assert.ok(source.receipts.length>=583,'Need retained actual browser history');
  await clickContinue();await continued();
  const repaged=await run(async()=>{const w=__game.world(),m=w.massRuntime;window.__resumeProbe.phase='repage';for(let i=0;i<12;i++){w.time+=20;m.update(w,true);await m.flushNativePaging();await new Promise(r=>setTimeout(r,0));if(m.nativePagingStats.pages>=4)break;}if(m.nativePagingStats.pages<2)throw Error('Genuine historical actors did not re-page');const first=[...new Set(m.paged.values())][0];w.landPartyAt(first.positions[0]);__game.save();await __game.flushRunSave();return{...m.nativePagingStats};});
  const fixture=await run(async()=>{const row=await window.__resumeRoot(),e=JSON.parse(row.current.body),pages=[];for(const p of e.pages)pages.push(await window.__resumePage(p.ref.key));return{row,envelope:e,pages};});
  fs.writeFileSync(path.join(reports,'native-resume-validator-'+tag+'-fixture.json'),JSON.stringify(fixture));
  const envelope=fixture.envelope,mass=envelope.character.world.worldmass,receipts=mass.enemies.map(a=>[a.id,a.monster,a.life,a.birth]);
  for(const p of fixture.pages)for(const a of JSON.parse(p.body).enemies)receipts.push([a.id,a.monster,a.life,a.birth]);
  const byId=new Map(receipts.map(r=>[r[0],r]));for(const r of source.receipts)assert.deepEqual(byId.get(r[0]),r,'Normal repaging changed historical receipt');
  assert.equal(receipts.length,byId.size);mark('genuine-history-repaged',{sourceCharacter:source.character,sourceChecksum:source.checksum,sourceActors:source.receipts.length,total:receipts.length,...repaged,originalReceiptsExact:true});
  const far=envelope.pages.find(p=>p.positions.every(at=>Math.hypot(at.x-mass.player.x,at.y-mass.player.y)>5000));assert.ok(far,'Need distant page');const farRow=fixture.pages.find(p=>p.ref.key===far.ref.key);
  const checksum=body=>{let a=2166136261,b=0x9e3779b9;for(let i=0;i<body.length;i++){const x=body.charCodeAt(i);a=Math.imul(a^x,16777619);b=Math.imul(b^x,0x85ebca6b);}return body.length+':'+(a>>>0).toString(16)+':'+(b>>>0).toString(16);};
  for(const fault of ['array-length','typed-array-named-property','unbacked-squad']){
   const page=JSON.parse(farRow.body),cp=page.cohort.checkpoint;
   if(fault==='unbacked-squad'){
    const identity=cp.identities.find(r=>{const e=page.enemies.find(a=>a.id===r.id);return e&&!e.magicPack&&!e.encounterGroup;});assert.ok(identity,'Need actual unformed native');
    identity.squadId=77;const actor=cp.actors.find(a=>a.id===identity.id);actor.squadId=77;
    const node=cp.nodeDictionary[actor.state.nodes[actor.state.root.ref]],index=node.entries.findIndex(i=>cp.dictionary[i][0]==='squadId');
    cp.dictionary.push(['squadId',{squad:77}]);if(index>=0)node.entries[index]=cp.dictionary.length-1;else node.entries.push(cp.dictionary.length-1);
   }else{
    const kind=fault==='array-length'?'array':'float64';const index=cp.actors[0].state.nodes.find(i=>cp.nodeDictionary[i].kind===kind);assert.notEqual(index,undefined,'Missing native '+kind+' node');
    cp.dictionary.push(['length',fault==='array-length'?-1:0]);cp.nodeDictionary[index].entries.push(cp.dictionary.length-1);
   }
   const body=JSON.stringify(page),revision=crypto.randomUUID(),ref={...far.ref,revision,key:JSON.stringify([far.ref.run,far.ref.page,revision]),digest:crypto.createHash('sha256').update(body).digest('hex'),bytes:Buffer.byteLength(body)};
   const badRow={schema:1,ref,body},badRoot=structuredClone(fixture.row),badEnvelope=structuredClone(envelope);badEnvelope.pages.find(p=>p.ref.key===far.ref.key).ref=ref;
   badRoot.current.body=JSON.stringify(badEnvelope);badRoot.current.checksum=checksum(badRoot.current.body);
   await run(async(page,row)=>{await window.__resumePage(page.ref.key,'put',page);await window.__resumeDB('preview:seamless-world:arpg_run_snapshots_v1','runs',row.key,'put',row);},badRow,badRoot);
   await boot();const menu=await collect();assert.equal(menu.reads.length,0);assert.equal(menu.factories.length,0);
   const before=await run(async()=>({root:await window.__resumeRoot(),account:localStorage.getItem('preview:seamless-world:arpg_account_v1')}));
   await clickContinue();await wait(()=>!document.querySelector('#start-menu')?.classList.contains('hidden')&&!!document.querySelector('#sm-continue:not([disabled])')&&/invalid|native|squad|array/i.test(document.querySelector('#start-menu')?.textContent||''),'Malformed codec did not refuse Continue');
   const failed=await run(async()=>({sameWorld:__game.world()===window.__resumeBefore,root:await window.__resumeRoot(),account:localStorage.getItem('preview:seamless-world:arpg_account_v1'),stats:window.__resumeStats(),notice:document.querySelector('#start-menu').textContent}));
   assert.ok(failed.sameWorld);assert.deepEqual(failed.root,before.root);assert.equal(failed.account,before.account);assert.equal(failed.stats.factories.length,0);assert.ok(failed.stats.reads.some(r=>r.key===ref.key));assert.ok(failed.stats.parsed.length>0);assert.deepEqual(failed.stats.errors,[]);assert.equal(failed.stats.fatal,null);
   mark('refuse-'+fault,{coherentPageDigest:true,coherentRootChecksum:true,farPageRead:true,parsedPages:failed.stats.parsed.length,factories:0,sameWorld:true,rootUnchanged:true,accountUnchanged:true,notice:failed.notice});
   report[fault+'Image']=await shot(fault);
   await run(row=>window.__resumeDB('preview:seamless-world:arpg_run_snapshots_v1','runs',row.key,'put',row),fixture.row);
  }
  await boot();await clickContinue();const resumed=await continued(),resident=new Set(resumed.mass.ids),paged=new Set(resumed.mass.pagedIds);
  assert.ok(receipts.every(r=>resident.has(r[0])!==paged.has(r[0])));assert.ok(far.ids.every(id=>paged.has(id)&&!resident.has(id)));assert.equal(resumed.charId,source.character);assert.deepEqual(resumed.pose,{x:mass.player.x,y:mass.player.y});assert.equal(resumed.mass.resumePending,false);
  const history=new Set(receipts.map(r=>r[0]));assert.deepEqual(resumed.mass.ids.filter(id=>history.has(id)),envelope.order.filter(id=>resident.has(id)));
  const active=await run(()=>{const w=__game.world();return w.massRuntime.snapshot(w).enemies.map(a=>[a.id,a.monster,a.life,a.birth]);});for(const row of active)if(byId.has(row[0]))assert.deepEqual(row,byId.get(row[0]));
  mark('positive-paged-continue',{totalHistorical:receipts.length,resident:resumed.mass.resident,paged:resumed.mass.paged,pages:resumed.mass.pages,reads:resumed.reads.length,factories:resumed.factories.length,creationOrderExact:true,pose:resumed.pose});report.continueImage=await shot('validator-continued');
  await run(async()=>{__game.save();await __game.flushRunSave();});await boot();
  await run(()=>{const create=URL.createObjectURL;URL.createObjectURL=function(blob){blob.text().then(s=>window.__resumePortable=JSON.parse(s));return create.call(this,blob);};const click=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.download)return;return click.call(this);};document.querySelector('#sm-keys').click();document.querySelector('[data-opttab=interface]').click();document.querySelector('#opt-exportsave').click();});
  await wait(()=>!!window.__resumePortable,'Real portable export failed');const portableText=await run(()=>JSON.stringify(window.__resumePortable)),portable=JSON.parse(portableText),exported=portable.characters['1'],exportedRows=exported.world.worldmass.enemies.map(a=>[a.id,a.monster,a.life,a.birth]),exportedIds=new Map(exportedRows.map(r=>[r[0],r]));
  for(const r of receipts)assert.deepEqual(exportedIds.get(r[0]),r);assert.equal(exported.characterPages,undefined);mark('positive-complete-export',{historical:receipts.length,exported:exportedRows.length,exactHistorical:true});
  await boot();await run(async()=>{await new Promise((yes,no)=>{const q=indexedDB.deleteDatabase('preview:seamless-world:arpg_native_pages_v1');q.onsuccess=()=>yes();q.onerror=()=>no(q.error);q.onblocked=()=>no(Error('Test page DB unexpectedly held open'));});});
  await run(text=>{const click=HTMLInputElement.prototype.click;HTMLInputElement.prototype.click=function(){if(this.type==='file'){const transfer=new DataTransfer();transfer.items.add(new File([text],'native-resume-validator-portable.json',{type:'application/json'}));this.files=transfer.files;this.dispatchEvent(new Event('change'));return;}return click.call(this);};document.querySelector('#sm-keys').click();document.querySelector('[data-opttab=interface]').click();document.querySelector('#opt-importsave').click();},portableText);
  await wait(()=>!!document.querySelector('#opt-saveport-confirm'),'Actual portable importer refused');const reload=new Promise(resolve=>win.webContents.once('did-finish-load',resolve));await run(()=>document.querySelector('#opt-saveport-confirm').click());await reload;
  await boot();await clickContinue();const imported=await continued();assert.equal(imported.charId,source.character);assert.equal(imported.mass.paged,0);assert.equal(imported.reads.length,0);
  const importedRows=await run(()=>{const w=__game.world();return w.massRuntime.snapshot(w).enemies.map(a=>[a.id,a.monster,a.life,a.birth]);}),importById=new Map(importedRows.map(r=>[r[0],r]));for(const r of exportedRows)assert.deepEqual(importById.get(r[0]),r);
  mark('positive-portable-import-without-pages',{exported:exportedRows.length,imported:importedRows.length,exactBodies:true,actualFileInputAndConfirmation:true,pageReads:imported.reads.length,paged:imported.mass.paged});report.importImage=await shot('validator-import');assert.deepEqual(report.consoleErrors,[]);
  report.acceptance={coherentArrayRefusedBeforeFactories:true,coherentTypedArrayRefusedBeforeFactories:true,coherentUnbackedSquadRefusedBeforeFactories:true,reusedGenuineHistory:true,positivePagedContinue:true,completePortableRoundtrip:true};save();console.log('RESUME_VALIDATOR_PASS '+output);
 }catch(error){report.error=String(error.stack||error);try{report.failure=await run(()=>window.__resumeStats?.());report.failureImage=await shot('validator-failure');}catch{}save();console.error(error);process.exitCode=1;}
 finally{clearTimeout(timer);if(win&&!win.isDestroyed())win.destroy();server?.close();app.exit(process.exitCode||0);}
}).catch(error=>{console.error(error);app.exit(1);});
