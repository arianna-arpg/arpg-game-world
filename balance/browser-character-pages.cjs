const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'hollow-wake-character-pages-')));app.disableHardwareAcceleration();app.commandLine.appendSwitch('enable-precise-memory-info');
let server,win;const timeout=setTimeout(()=>{console.error('TIMEOUT character pages');app.exit(1);},480000);
(async()=>{await app.whenReady();const {createServer}=await import('vite');server=await createServer({configFile:false,root:path.resolve(__dirname,'..'),logLevel:'error',
 define:{__HOLLOW_WAKE_STORAGE_SCOPE__:JSON.stringify('qa:character-pages'),__HOLLOW_WAKE_WORLDMASS__:'true'},plugins:[{name:'page-proof',configureServer(s){s.middlewares.use((req,res,next)=>{if(req.url!=='/')return next();res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Native page proof</title><script type="module" src="/@vite/client"></script>');});}}],server:{host:'127.0.0.1',port:0,watch:null}});await server.listen();
 win=new BrowserWindow({show:false,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});await win.loadURL(server.resolvedUrls.local[0]);
 win.webContents.debugger.attach('1.3');const run=(method,args='')=>win.webContents.executeJavaScript("import('/balance/character-pages-browser-fixture.ts').then(m=>m."+method+'('+args+'))');
 const samples=[];for(let i=0;i<Number(process.argv[2]??10);i++){await run('travel','10');await win.webContents.debugger.sendCommand('HeapProfiler.collectGarbage');const sample=await run('stats');samples.push(sample);console.log(JSON.stringify(sample));if(i===2&&sample.paged===0)throw Error("Paging not admitted: "+JSON.stringify(sample));}
 assert.ok(samples.at(-1).paged>96,'actual World must release more than one historical population cap');
 assert.ok(samples.at(-1).resident<=240,'settled native graph retention must remain bounded');
 assert.ok(samples.at(-1).weakAlive<=240,'released native graphs must be collectible in actual runtime');
 console.log('PASS actual generated World pages exact native cohorts, releases Actor/codec ownership and keeps historical native graphs bounded');
 assert.equal(await run('caveRoundtrip'),true);console.log('PASS native cellar suspension/save/return preserves all paged surface owners and exact surface coordinates');
 let first=await run('checkpoint');
 assert.equal(await run('patron'),true);console.log('PASS paged metadata releases only the old New Run merc patron without exposing a partial CharacterSave');assert.ok(first.count>240);assert.ok(first.pages>0);
 assert.equal(await run('missing'),true);console.log('PASS absent immutable page refuses Continue and native factory replay while retaining original guardian identities');
 assert.equal(await run('overlap'),true);console.log('PASS concurrent A hydration while B stages cannot drop either cohort from the authoritative root or release B');
 assert.equal(await run('overlap','true'),true);console.log('PASS root already committed with captured A ref remains complete while A hydrates; stale B release is refused');
 const returned=await run('revisit');assert.ok(returned.restored>0);console.log('PASS physical return hydrates exact native survivors and never claims false kills');
 first=await run('checkpoint');
 // Continue through the final current authoritative paged character checkpoint.
 await win.loadURL(server.resolvedUrls.local[0]);const cold=await run('reload');assert.equal(cold.count,first.count);
 console.log('PASS authoritative CharacterSave manifest survives browser reload, actual Continue and fully inline portable export');
 assert.equal(await run('rootFailure'),true);console.log('PASS actual CharacterSave root abort retains every live native and preserves the prior durable root');
 assert.equal(await run('deathDuringPage'),true);console.log('PASS death during an actual pending page write prevents root resurrection and native release');
 await run('deletion');await win.loadURL(server.resolvedUrls.local[0]);
 assert.equal(await win.webContents.executeJavaScript("import('/src/meta/character.ts').then(m=>m.loadCharacterAsync()).then(v=>v===null)"),true);
 await run('reimport');await win.loadURL(server.resolvedUrls.local[0]);assert.equal(await run('imported'),true);
 console.log('PASS immediate death/reload never resurrects pages; validated inline reimport replaces the old authority without page references');
 const report=path.resolve(__dirname,'reports/native-character-pages-browser.json');fs.mkdirSync(path.dirname(report),{recursive:true});
 fs.writeFileSync(report,JSON.stringify({checkedAt:new Date().toISOString(),command:'npx electron balance/browser-character-pages.cjs',scope:'qa:character-pages',seed:99,samples,checkpoint:first,cold,
  checks:{boundedEligibleNativeGraphs:true,cellarSurfaceOwnership:true,missingPageRefusal:true,pageStageHydrationRace:true,rootInFlightHydrationRace:true,physicalHydration:true,characterContinue:true,inlineExport:true,failedRootRetainsActors:true,deathDuringPage:true,deletionReimport:true,patronMetadata:true},
  limits:['Cold Continue expands all historical pages before native restore.','Native filesystem runs retain inline saves and do not release native cohorts.','Unsupported dependencies remain pinned.','Immutable page revisions and non-actor world history have no disk/history garbage collection.','This functional run does not establish frame-time performance.']},null,2));
 console.log('REPORT '+report);
})().then(async()=>{clearTimeout(timeout);win?.destroy();await server?.close();app.exit(0);}).catch(async e=>{console.error(e.stack||String(e));clearTimeout(timeout);win?.destroy();await server?.close();app.exit(1);});
