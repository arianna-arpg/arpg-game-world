// Actual character wrapper + generated country persistence in hidden Chromium.
// The test owns a fresh browser profile and serves no disk-save endpoints.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'hollow-wake-character-store-')));
app.disableHardwareAcceleration();app.commandLine.appendSwitch('disable-gpu');
let server,win;const timeout=setTimeout(()=>{console.error('TIMEOUT character store');app.exit(1);},240000);
(async()=>{
 await app.whenReady();const {createServer}=await import('vite');
 server=await createServer({configFile:false,root:path.resolve(__dirname,'..'),logLevel:'error',
  define:{__HOLLOW_WAKE_STORAGE_SCOPE__:JSON.stringify('qa:large-run'),__HOLLOW_WAKE_WORLDMASS__:'true'},
  plugins:[{name:'isolated-run-test-page',configureServer(s){s.middlewares.use((req,res,next)=>{if(req.url!=='/')return next();res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Character store probe</title>');});}}],
  server:{host:'127.0.0.1',port:0,watch:null}});await server.listen();
 const url=server.resolvedUrls.local[0];win=new BrowserWindow({show:false,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
 await win.loadURL(url);
 const first=await win.webContents.executeJavaScript('('+writeCountry.toString()+')()');
 assert.ok(first.bytes>5*1024*1024,'real CharacterSave must exceed ordinary localStorage capacity');assert.ok(first.enemies>96);assert.ok(first.referenceLength<300);
 await win.loadURL(url);
 const second=await win.webContents.executeJavaScript('('+readCountry.toString()+')()');
 assert.deepEqual(second.receipts,first.receipts);assert.equal(second.enemies,first.enemies);assert.equal(second.run,first.run);assert.equal(second.afterContinue,first.receipts);
 console.log('PASS real generated '+first.enemies+'-native CharacterSave ('+first.bytes+' bytes) survives browser reload through async Continue with exact birth/wound receipts');
 const barriers=await win.webContents.executeJavaScript('('+deletionCheck.toString()+')()');assert.ok(barriers.immediate&&barriers.afterFlush&&barriers.newRun);
 console.log('PASS character wrappers enforce immediate deletion, awaited tombstone and explicit new-run replacement');
})().then(async()=>{clearTimeout(timeout);win?.destroy();await server?.close();app.exit(0);}).catch(async e=>{console.error(e.stack||String(e));clearTimeout(timeout);win?.destroy();await server?.close();app.exit(1);});
async function writeCountry(){
 const {makeSimWorld}=await import('/src/sim/arena.ts'),{seedGlobalRandom}=await import('/src/sim/rng.ts');
 const {saveCharacter,serializeCharacter,flushCharacterSaves,charKeyFor}=await import('/src/meta/character.ts');
 const undo=seedGlobalRandom(994422),w=makeSimWorld('warrior',99);w.startWorldMass(99);const m=w.massRuntime;
 let save,bytes=0;
 for(let i=0;i<120;i++){
  w.time+=13;w.player.pos={x:5000+i*3200,y:4000};m.update(w,true);
  if(i%10===9){save=serializeCharacter(w);bytes=new TextEncoder().encode(JSON.stringify(save)).length;if(bytes>5.4*1024*1024)break;}
 }
 save=serializeCharacter(w);bytes=new TextEncoder().encode(JSON.stringify(save)).length;
 const receipts=JSON.stringify(save.world.worldmass.enemies.map(e=>[e.id,e.monster,e.life,e.birth]));
 saveCharacter(w);await flushCharacterSaves();const referenceLength=localStorage.getItem(charKeyFor(1)).length;undo();
 return {bytes,enemies:save.world.worldmass.enemies.length,run:save.world.worldmass.state.run.runId,receipts,referenceLength};
}
async function readCountry(){
 const {makeSimWorld}=await import('/src/sim/arena.ts');
 const {loadCharacterAsync,applySavedCharacter}=await import('/src/meta/character.ts');
 const save=await loadCharacterAsync();if(!save?.world?.worldmass)throw Error('Character wrapper lost large save');
 const receipts=JSON.stringify(save.world.worldmass.enemies.map(e=>[e.id,e.monster,e.life,e.birth]));
 const n=makeSimWorld('warrior',21);if(!applySavedCharacter(n,save)||!n.adoptWorldState(save.world))throw Error('Native Continue refused saved character');
 n.startWorldMass(save.world.worldmass.state.run.seed,save.world.worldmass);
 const afterContinue=JSON.stringify(n.massRuntime.snapshot(n).enemies.map(e=>[e.id,e.monster,e.life,e.birth]));
 return {enemies:save.world.worldmass.enemies.length,run:save.world.worldmass.state.run.runId,receipts,afterContinue};
}
async function deletionCheck(){
 const {loadCharacterAsync,loadCharacter,clearCharacter,flushCharacterSaves,writeCharacterMirrorRaw}=await import('/src/meta/character.ts');
 const original=await loadCharacterAsync();clearCharacter();const immediate=loadCharacter()===null;
 await flushCharacterSaves();const afterFlush=await loadCharacterAsync()===null;
 await writeCharacterMirrorRaw(1,JSON.stringify(original));await flushCharacterSaves();const newRun=!!(await loadCharacterAsync());
 return {immediate,afterFlush,newRun};
}
