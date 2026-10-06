const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'hollow-wake-native-pages-')));app.disableHardwareAcceleration();app.commandLine.appendSwitch('enable-precise-memory-info');
let server,win;const timeout=setTimeout(()=>{console.error('TIMEOUT native paging');app.exit(1);},240000);
(async()=>{await app.whenReady();const {createServer}=await import('vite');server=await createServer({configFile:false,root:path.resolve(__dirname,'..'),logLevel:'error',
 plugins:[{name:'page-proof',configureServer(s){s.middlewares.use((req,res,next)=>{if(req.url!=='/')return next();res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Native page proof</title>');});}}],server:{host:'127.0.0.1',port:0,watch:null}});await server.listen();
 win=new BrowserWindow({show:false,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});await win.loadURL(server.resolvedUrls.local[0]);
 win.webContents.debugger.attach('1.3');const run=(method,args='')=>win.webContents.executeJavaScript("import('/balance/native-pages-browser-fixture.ts').then(m=>m."+method+'('+args+'))');
 const samples=[];for(let batch=0;batch<6;batch++){await run('travel','10');await win.webContents.debugger.sendCommand('HeapProfiler.collectGarbage');const sample=await run('stats');samples.push(sample);assert.equal(sample.cachedBodyBytes,0);assert.equal(sample.pending,0);assert.ok(sample.peakOwned<=6);assert.ok(sample.weakAlive<=6,'completed cohorts must be garbage collectible, not retained by store/lease');}
 console.log('PASS real Chromium pages '+samples.at(-1).trips*6+' exact native survivors with <=6 owned bodies, <=6 live WeakRefs and zero page-body cache');console.log(JSON.stringify({heapSamples:samples.map(s=>s.heap),pages:samples.at(-1).pages}));
 const back=await run('revisit');assert.equal(back.restored,360);assert.equal(back.root.status,'value');assert.equal(back.root.root.pages.length,60);
 await win.webContents.debugger.sendCommand('HeapProfiler.collectGarbage');assert.ok((await run('stats')).weakAlive<=6);
 console.log('PASS all 360 native wound/resource/typed-state and birth-owner pages hydrate exactly without regenerating claims');
 const faults=await run('faults');assert.equal(faults.failedWritesRetained,6);assert.equal(faults.releaseCalls,0);assert.equal(faults.missingFactories,0);
 console.log('PASS actual IDB page/root aborts retain live actors; previous root recovers complete pages; missing revision refuses factories; tombstones prevent resurrection');
})().then(async()=>{clearTimeout(timeout);win?.destroy();await server?.close();app.exit(0);}).catch(async e=>{console.error(e.stack||String(e));clearTimeout(timeout);win?.destroy();await server?.close();app.exit(1);});
