// Real browser occurrence acceptance on an unchanged natural country provider.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');fs.mkdirSync(dir,{recursive:true});
app.setPath('userData',path.join(dir,'native-occurrences-profile-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..','dist-preview'),report={seed:713,consoleErrors:[]};
 const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');fs.createReadStream(file).pipe(res);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}}),url='http://127.0.0.1:'+server.address().port;
 win.webContents.on('console-message',e=>{if(e.level==='error')report.consoleErrors.push(e.message);});
 const run=async(fn,...args)=>{const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');if(!r.ok)throw Error(r.error);return r.value;};
 const boot=async()=>{await win.loadURL(url);await run(async()=>{window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});for(let i=0;i<100&&!window.__game;i++)await new Promise(r=>setTimeout(r,100));if(!window.__game)throw Error('No game bootstrap');await new Promise(r=>setTimeout(r,250));});};
 const shot=async name=>{await run(()=>__game.renderer.render(__game.world()));win.webContents.invalidate();await new Promise(r=>setTimeout(r,100));const file=path.join(dir,'native-occurrences-'+name+'.png');fs.writeFileSync(file,(await win.webContents.capturePage()).toPNG());return file;};
 const snapshot=()=>{const w=__game.world(),m=w.massRuntime,id='["expedition:713","native-country",1,"surface","0","16"]';
  const born=m.nativeFeatures.snapshot(w.time).born.find(b=>b.placement.id===id);if(!born?.changes.native?.occurrences)throw Error('Natural occurrence has no production checkpoint');
  const s=born.changes.native.occurrences;return {id,hash:born.descriptor.hash,source:born.descriptor.source,clock:w.time,hero:{...w.player.pos},xp:w.meta.xp,
   occurrences:s,bodies:s.births.flatMap(b=>b.bodies.map(a=>({key:a.key,monster:a.monster,dead:a.dead,life:a.life,pos:a.pos}))),crash:__game.crash().fatal};};
 const resume=async()=>{await run(async()=>{__game.save();await __game.flushRunSave();});await boot();await run(async()=>{for(let i=0;i<100&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));const b=document.querySelector('#sm-continue:not([disabled])');if(!b)throw Error('Durable Continue unavailable');b.click();for(let i=0;i<100&&!__game.world().massRuntime;i++)await new Promise(r=>setTimeout(r,100));__game.ui.hideAll();__game.world().player.invulnerable=true;});return run(snapshot);};
 const timer=setTimeout(()=>{fs.writeFileSync(path.join(dir,'native-occurrences-ui-error.txt'),'Browser acceptance timed out');app.exit(1);},300000);
 try{
  await boot();
  report.arrival=await run(()=>{__game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();w.startWorldMass(713);w.player.invulnerable=true;
   __game.step(1);document.querySelectorAll('button').forEach(b=>{if(b.textContent.trim()==='Walk on')b.click();});__game.ui.hideAll();
   const m=w.massRuntime,id='["expedition:713","native-country",1,"surface","0","16"]',span=m.config.terrain.addressSpan;
   const origin={dimension:'surface',cx:'2',cy:'92',x:360,y:120};const add=(p,dx,dy)=>{const x=p.x+dx,y=p.y+dy;return {...p,cx:(BigInt(p.cx)+BigInt(Math.floor(x/span))).toString(),cy:(BigInt(p.cy)+BigInt(Math.floor(y/span))).toString(),x:((x%span)+span)%span,y:((y%span)+span)%span};};
   const center=add(origin,900,900),p=m.nativeCountry.near(center,0).find(p=>p.id===id);if(!p)throw Error('Native provider lost natural event placement');
   if(!m.nativeFeatures.intersects(center,0))throw Error('Natural source refused: '+JSON.stringify(m.nativeFeatures.refusals(id)));
   const born=m.nativeFeatures.snapshot(w.time).born.find(b=>b.placement.id===id),site=born.descriptor.sidechannels.occurrences.find(r=>r.site.id==='abyssal_fracture');
   if(!site)throw Error('Natural source lost fracture tenant');const offset={x:Number(BigInt(origin.cx)-BigInt(m.origin.cx))*span+origin.x,y:Number(BigInt(origin.cy)-BigInt(m.origin.cy))*span+origin.y};
   const at={x:offset.x+site.site.x,y:offset.y+site.site.y};w.landPartyAt(at);m.update(w,true);
   const clear=p=>{const q=w.clampPos(p,w.player.radius);return w.walk.isWalkable(p.x,p.y)&&Math.hypot(q.x-p.x,q.y-p.y)<.001&&!w.pointInSolid(p.x,p.y,w.player.radius)&&w.caveEntrances.every(e=>Math.hypot(e.pos.x-p.x,e.pos.y-p.y)>100);};
   let stand;for(const r of [100,115,85])for(let i=0;i<32&&!stand;i++){const a=i*Math.PI/16,p={x:at.x+Math.cos(a)*r,y:at.y+Math.sin(a)*r};if(clear(p))stand=p;}
   if(!stand)throw Error('No body-clear idle stand at naturally generated event');w.landPartyAt(stand);m.update(w,true);window.__occHero=w.player;
   if(!m.nativeHost.occurrences.views().some(v=>v.owner===id))throw Error('Native runtime failed to mount actual event');
   return {id,source:p.request.source,seed:p.request.seed,at,stand,level:born.descriptor.zone.level,definition:site.definition,sameHero:window.__occHero===w.player,crash:__game.crash().fatal};});
  assert.equal(report.arrival.crash,null);report.before=await run(snapshot);
  const advance=async condition=>run(async condition=>{const w=__game.world(),m=w.massRuntime,id='["expedition:713","native-country",1,"surface","0","16"]';let frames=0;const narration=[],texts=w.massRuntime.nativeFeatures.snapshot(w.time).born.find(b=>b.placement.id===id).descriptor.sidechannels.occurrences.flatMap(row=>[row.definition.telegraph?.text,row.definition.spring?.text]).filter(Boolean),nativeText=w.text;
   w.text=function(at,message,...args){if(texts.includes(message))narration.push(message);return nativeText.call(this,at,message,...args);};
   __game.devInput(()=>({dx:0,dy:0,aim:w.player.pos,held:[],edge:[]}));try{for(;frames<2200;frames++){const site=m.nativeHost.occurrences.views().find(v=>v.owner===id);if(!site)throw Error('Event vanished during native idle tick');if(condition==='warning'?site.told:site.state==='sprung')break;__game.step(1);if(frames%30===0)await new Promise(r=>setTimeout(r,0));if(__game.crash().fatal)throw Error('Fatal game tick: '+__game.crash().fatal);}
    if(frames>=2200)throw Error('Native event did not reach '+condition);return {frames,narration,sameWorld:__game.world()===w,sameHero:window.__occHero?window.__occHero===w.player:true,pos:{...w.player.pos},crash:__game.crash().fatal};
   }finally{w.text=nativeText;__game.devInput(null);}},condition);
  report.warningTick=await advance('warning');assert.deepEqual(report.warningTick.narration,[]);report.warning=await run(snapshot);report.warningImage=await shot('warning');
  assert.equal(report.warning.occurrences.sites[0].state,'armed');assert.equal(report.warning.occurrences.sites[0].told,true);assert.equal(report.warning.bodies.length,0);assert.ok(report.warning.occurrences.decor.length>=3);
  report.warningContinue=await resume();assert.deepEqual(report.warningContinue.occurrences.sites,report.warning.occurrences.sites);assert.deepEqual(report.warningContinue.occurrences.decor,report.warning.occurrences.decor);assert.equal(report.warningContinue.hash,report.warning.hash);
  report.springTick=await advance('spring');assert.deepEqual(report.springTick.narration,[]);report.spring=await run(snapshot);report.springImage=await shot('spring');
  assert.equal(report.spring.occurrences.sites[0].state,'sprung');assert.ok(report.spring.bodies.length>=5&&report.spring.bodies.length<=8);assert.ok(report.spring.occurrences.decor.some(d=>d.kind==='abyssal_rent'));
  assert.equal(report.spring.occurrences.sequence,1);assert.equal(report.spring.xp,report.before.xp);
  report.springContinue=await resume();assert.deepEqual(report.springContinue.occurrences.sites,report.spring.occurrences.sites);assert.deepEqual(report.springContinue.occurrences.decor,report.spring.occurrences.decor);assert.deepEqual(report.springContinue.bodies,report.spring.bodies);
  report.continuedImage=await shot('continued-scar');assert.equal(report.springContinue.crash,null);assert.deepEqual(report.consoleErrors,[]);
  fs.writeFileSync(path.join(dir,'native-occurrences-ui.json'),JSON.stringify(report,null,2));fs.rmSync(path.join(dir,'native-occurrences-ui-error.txt'),{force:true});
  console.log('PASS unchanged natural country fracture, real idle ticks, native warning and initial wave, exact durable telegraph/scar/body Continue, no event-completion XP or local narration');clearTimeout(timer);win.destroy();server.close();app.exit(0);
 }catch(error){try{report.failureImage=await shot('failure');}catch{}fs.writeFileSync(path.join(dir,'native-occurrences-ui.json'),JSON.stringify(report,null,2));fs.writeFileSync(path.join(dir,'native-occurrences-ui-error.txt'),String(error.stack||error));console.error(error);clearTimeout(timer);app.exit(1);}
});
