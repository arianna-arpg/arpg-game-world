// ExplorationPopulation: actual client AI/World travel and durable cold Continue.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const reports=path.join(__dirname,'reports');fs.mkdirSync(reports,{recursive:true});
app.setPath('userData',path.join(reports,'exploration-population-profile-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,process.env.HOLLOW_WAKE_EXPLORATION_DIST??'../.claude/exploration-population.local.work/dist-final');
 const report={errors:[],method:'Fresh default seed99; eight controlled arrivals with 600 real game frames each, no hero attacks; native Save/Continue and return. This verifies lifecycle, not density parity or unlimited complex-controller paging.'};
 const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');fs.createReadStream(file).pipe(res);
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port,win=new BrowserWindow({show:false,width:1440,height:960,webPreferences:{offscreen:true,backgroundThrottling:false}});
 win.webContents.on('console-message',e=>{if(e.level==='error')report.errors.push(e.message);});
 const run=async(fn,...args)=>{const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');if(!r.ok)throw Error(r.error);return r.value;};
 const boot=async()=>{await win.loadURL(url);await run(async()=>{window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});for(let i=0;i<100&&!window.__game;i++)await new Promise(r=>setTimeout(r,100));if(!window.__game)throw Error('Missing game');await new Promise(r=>setTimeout(r,200));});};
 const save=()=>fs.writeFileSync(path.join(reports,'exploration-population-ui.json'),JSON.stringify(report,null,2));
 const shot=async name=>{await run(()=>__game.renderer.render(__game.world()));win.webContents.invalidate();await new Promise(r=>setTimeout(r,120));const file=path.join(reports,'exploration-population-'+name+'.png');fs.writeFileSync(file,(await win.webContents.capturePage()).toPNG());return file;};
 const timer=setTimeout(()=>{save();console.error('ExplorationPopulation client timed out');app.exit(1);},900000);
 try{
  await boot();await run(()=>{__game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();w.startWorldMass(99);w.player.invulnerable=true;w.player.untargetable=true;__game.step(1);document.querySelectorAll('button').forEach(b=>{if(b.textContent.trim()==='Walk on')b.click();});__game.ui.hideAll();__game.devInput(()=>({dx:0,dy:0,aim:w.player.pos,held:[],edge:[]}));});
  report.courses=[];
  for(let step=0;step<8;step++){
   const row=await run(async step=>{const w=__game.world(),m=w.massRuntime;w.landPartyAt({x:5000+step*3200,y:4000});m.update(w,true);
    for(let frame=0;frame<600;frame++){__game.step(1);if(frame%30===0)await new Promise(r=>setTimeout(r,0));}
    await m.flushNativePaging();const snapshot=m.snapshot(w);
    return{step,time:w.time,total:snapshot.enemies.length,active:m.population,free:m.availablePopulation(),sleeping:snapshot.dormancy.sleeping.length,nearby:w.actors.filter(a=>a.team==='enemy'&&!a.dead&&Math.hypot(a.pos.x-w.player.pos.x,a.pos.y-w.player.pos.y)<1300).length,fatal:__game.crash().fatal};
   },step);assert.equal(row.fatal,null);report.courses.push(row);save();console.log(JSON.stringify(row));
  }
  const end=report.courses.at(-1);assert.ok(end.total>60,'travel must exceed the former exhausted budget');assert.ok(end.sleeping>20,'normal game frames must allow native dormancy');assert.ok(end.nearby>0,'distant exploration still admits encounters');
  report.image=await shot('distant-encounters');
  const state=()=>{const w=__game.world(),m=w.massRuntime,s=m.snapshot(w);return{config:s.configHash,origin:m.origin,pos:{...w.player.pos},enemies:s.enemies.map(e=>[e.id,e.monster,e.life,e.birth]).sort((a,b)=>a[0].localeCompare(b[0])),sleeping:s.dormancy.sleeping.slice().sort()};};
  const before=await run(state);await run(async()=>{__game.save();await __game.flushRunSave();});await boot();
  await run(async()=>{for(let i=0;i<100&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));const b=document.querySelector('#sm-continue:not([disabled])');if(!b)throw Error('Continue unavailable');b.click();for(let i=0;i<100&&(!__game.world().massRuntime||__game.world().massRuntime.resumePending);i++)await new Promise(r=>setTimeout(r,100));__game.ui.hideAll();});
  const after=await run(state);
  // Continue may retire additional now-quiet distant bodies during attachment.
  // Residency is scheduling; all existing sleepers and native identity/vitals
  // must persist, without requiring a live body to remain needlessly awake.
  assert.deepEqual({...after,sleeping:undefined},{...before,sleeping:undefined});
  assert.ok(before.sleeping.every(id=>after.sleeping.includes(id)),'saved distant sleepers remain asleep');
  report.continue={identities:after.enemies.length,sleepers:after.sleeping.length,newlyRetired:after.sleeping.length-before.sleeping.length,pos:after.pos};
  report.return=await run(()=>{const w=__game.world(),m=w.massRuntime,s=m.snapshot(w),id=s.dormancy.sleeping[0],e=s.enemies.find(e=>e.id===id);if(!e)throw Error('No saved sleeper');w.landPartyAt({x:e.x,y:e.y});m.update(w,true);const a=m.natives.get(id);if(!a||!w.actors.includes(a)||a.life!==e.life||a.defId!==e.monster)throw Error('Return did not restore the saved survivor');return{id,monster:a.defId,life:a.life,fatal:__game.crash().fatal};});
  assert.equal(report.return.fatal,null);assert.deepEqual(report.errors,[]);save();console.log('PASS actual-client native dormancy, distant encounters, cold Continue and saved-survivor return');clearTimeout(timer);win.destroy();server.close();app.exit(0);
 }catch(error){report.failure=String(error.stack||error);try{report.failureImage=await shot('failure');}catch{}save();console.error(error);clearTimeout(timer);app.exit(1);}
});
