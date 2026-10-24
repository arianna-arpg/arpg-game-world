// Built preview smoke: optional URL and PREVIEW_EXPECT_COMMIT / PREVIEW_EXPECT_BUNDLE.
// Durable save completion + fresh renderer Continue; no obsolete localStorage run assertion.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),http=require('node:http');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'balance/reports');
const output=path.join(dir,'browser-preview-ui.json');
let url=process.argv[2];
const report={url,revision:process.env.PREVIEW_EXPECT_COMMIT??null,methodology:'Actual preview client, disposable profile and fresh renderer Continue. Native devStartRun creates an ordinary Warrior, then three manual frames. Saves are flushed through the supported browser save queue and verified in the durable IndexedDB run store. Production localStorage sentinels are untouched. No player profile is accessed.',consoleErrors:[],diskRequests:[]};
report.harnessSha256=crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex');
app.setPath('userData',path.join(dir,'browser-preview-profile-'+process.pid));
app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 let win,server;
 if(!url){
  const assets=path.join(root,'dist-preview');
  server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(assets,'.'+(name==='/'?'/index.html':name));
   if(!file.startsWith(assets+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
   res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');fs.createReadStream(file).pipe(res);
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));url='http://127.0.0.1:'+server.address().port+'/';report.url=url;
 }
 const save=()=>fs.writeFileSync(output,JSON.stringify(report,null,2));
 const timer=setTimeout(()=>{report.error='Public Continue timeout';save();app.exit(1);},90000);
 const run=async(fn,...args)=>{const result=await win.webContents.executeJavaScript('(async()=>{try{return{ok:true,value:await('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return{ok:false,error:{name:e?.name,message:e?.message,stack:e?.stack,text:String(e)}}}})()');if(!result.ok)throw Error(JSON.stringify(result.error));return result.value;};
 const boot=async()=>{
  const old=win;
  win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
  win.webContents.on('console-message',e=>{if(e.level==='error')report.consoleErrors.push(e.message);});
  win.webContents.session.webRequest.onBeforeRequest((details,done)=>{if(new URL(details.url).pathname.startsWith('/__save/'))report.diskRequests.push(details.url);done({cancel:false});});
  await win.loadURL('about:blank');if(old&&!old.isDestroyed())old.destroy();
  win.webContents.debugger.attach('1.3');await win.webContents.debugger.sendCommand('Page.enable');
  await win.webContents.debugger.sendCommand('Page.addScriptToEvaluateOnNewDocument',{source:'window.requestAnimationFrame=()=>0;'});
  await win.loadURL(url);
  await run(async()=>{for(let i=0;i<100&&!window.__game;i++)await new Promise(r=>setTimeout(r,50));if(!window.__game)throw Error('No game boot');await __game.hydrated();});
 };
 const receipt=()=>{const w=__game.world();return{fatal:__game.crash().fatal,worldmass:!!w.massRuntime,seed:w.massRuntime?.generator.run.seed,configHash:w.massRuntime?.configHash,charId:w.meta.charId,pos:{...w.player.pos},time:w.time,xp:w.meta.xp,ordinary:Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.startsWith('arpg_')))};};
 try{
  await boot();
  if(report.revision){report.build=await run(async()=>await(await fetch('./build.json?verify='+Date.now(),{cache:'no-store'})).json());assert.equal(report.build.commit,report.revision);}
  report.bundle=await run(()=>[...document.scripts].map(s=>s.src).find(s=>/\/assets\/index-/.test(s)));
  if(process.env.PREVIEW_EXPECT_BUNDLE)assert.ok(report.bundle.endsWith('/'+process.env.PREVIEW_EXPECT_BUNDLE));
  await run(()=>{for(const key of ['arpg_account_v1','arpg_character_v1','arpg_character_v1_s10','arpg_settings_v1','arpg_workshop_v1','arpg_atlas_v1'])localStorage.setItem(key,'production-sentinel');});
  await boot();
  await run(async()=>{__game.devStartRun('warrior');__game.ui.hideAll();__game.step(3);__game.save();await __game.flushRunSave();});
  report.before=await run(receipt);
  assert.equal(report.before.fatal,null);assert.equal(report.before.worldmass,true);assert.ok(report.before.charId);
  assert.equal(Object.keys(report.before.ordinary).length,6);assert.ok(Object.values(report.before.ordinary).every(v=>v==='production-sentinel'));
  report.durable=await run(async()=>{
   const db=await new Promise((yes,no)=>{const q=indexedDB.open('preview:seamless-world:arpg_run_snapshots_v1',1);q.onsuccess=()=>yes(q.result);q.onerror=()=>no(q.error);});
   try{return await new Promise((yes,no)=>{const tx=db.transaction('runs','readonly'),q=tx.objectStore('runs').get('preview:seamless-world:arpg_character_v1');let row;q.onsuccess=()=>row=q.result;tx.oncomplete=()=>{if(!row?.current?.body)return no(Error('Missing durable run root'));const data=JSON.parse(row.current.body),c=data.character??data;yes({key:row.key,revision:row.current.revision,charId:c.charId,bodyLength:row.current.body.length,pageCount:data.pages?.length??0});};tx.onabort=()=>no(tx.error);});}finally{db.close();}
  });
  assert.equal(report.durable.charId,report.before.charId);assert.ok(report.durable.bodyLength>0);
  await boot();
  await run(async expected=>{
   for(let i=0;i<150&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,50));
   const button=document.querySelector('#sm-continue:not([disabled])');if(!button)throw Error('Continue unavailable');
   const old=__game.world();button.click();
   for(let i=0;i<300&&(__game.world()===old||__game.world().meta.charId!==expected||__game.world().massRuntime?.resumePending);i++)await new Promise(r=>setTimeout(r,50));
   if(__game.world()===old||__game.world().meta.charId!==expected||!__game.world().massRuntime||__game.world().massRuntime.resumePending)throw Error('Continue did not publish the same saved character');
  },report.before.charId);
  report.after=await run(receipt);assert.deepEqual(report.after,report.before);
  assert.deepEqual(report.diskRequests,[]);assert.deepEqual(report.consoleErrors,[]);
  report.acceptance={publishedRevision:!!report.revision,reviewedBundle:!!process.env.PREVIEW_EXPECT_BUNDLE,defaultWorldmass:true,durableIndexedDbSave:true,freshRendererContinue:true,exactCharacterAndWorldReceipt:true,productionStorageUnchanged:true,noSharedDiskEndpoint:true};
  save();console.log('PUBLIC_PREVIEW_PASS '+output);
 }catch(e){report.error=e.stack||String(e);save();console.error(report.error);process.exitCode=1;}
 finally{clearTimeout(timer);if(win&&!win.isDestroyed())win.destroy();server?.close();app.exit(process.exitCode||0);}
}).catch(e=>{console.error(e);app.exit(1);});
