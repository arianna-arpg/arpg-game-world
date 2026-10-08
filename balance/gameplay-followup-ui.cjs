// Hidden real-client acceptance with isolated saves; no production profile writes.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');fs.mkdirSync(dir,{recursive:true});
app.setPath('userData',path.join(dir,'gameplay-followup-profile-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.join(dir,'gameplay-followup-dist');
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');fs.createReadStream(file).pipe(res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port+'/?worldmass';
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async(fn,...args)=>{
  const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');
  if(!r.ok)throw Error(r.error);return r.value;
 };
 const shot=async name=>{
  const png=await run(()=>{__game.renderer.render(__game.world());return document.getElementById('game').toDataURL();});
  fs.writeFileSync(path.join(dir,'gameplay-followup-'+name+'.png'),Buffer.from(png.split(',')[1],'base64'));
 };

 const pageShot=async name=>{await run(()=>__game.renderer.render(__game.world()));win.webContents.invalidate();await new Promise(r=>setTimeout(r,120));fs.writeFileSync(path.join(dir,'gameplay-followup-'+name+'.png'),(await win.webContents.capturePage()).toPNG());};
 const drag=async(id,slot)=>{
  const points=await run((id,slot)=>{
   const a=document.querySelector('[data-drag="gearItem:'+id+'"]'),b=document.querySelector('[data-drop="rackSeat:'+slot+'"]');
   if(!a||!b)throw Error('No native drag endpoints');
   const point=e=>{const r=e.getBoundingClientRect();if(!r.width||!r.height)throw Error('Hidden drag endpoint');return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)};};return [point(a),point(b)];
  },id,slot);
  win.webContents.sendInputEvent({type:'mouseMove',...points[0]});win.webContents.sendInputEvent({type:'mouseDown',button:'left',clickCount:1,...points[0]});
  for(let i=1;i<=10;i++)win.webContents.sendInputEvent({type:'mouseMove',x:Math.round(points[0].x+(points[1].x-points[0].x)*i/10),y:Math.round(points[0].y+(points[1].y-points[0].y)*i/10),buttons:['left']});
  win.webContents.sendInputEvent({type:'mouseUp',button:'left',clickCount:1,...points[1]});await new Promise(r=>setTimeout(r,150));
 };
 const timer=setTimeout(()=>app.exit(1),240000),results={};
 const state=()=>{const w=__game.world();return {pos:{...w.player.pos},bag:JSON.parse(JSON.stringify(w.meta.items)),bar:w.player.skills.map(s=>s?.def.id??null),lesson:w.mireilleGiftLesson(),ledger:{...w.ledger}};};
 try {
  await win.loadURL('about:blank');win.webContents.debugger.attach('1.3');await win.webContents.debugger.sendCommand('Page.enable');
  await win.webContents.debugger.sendCommand('Page.addScriptToEvaluateOnNewDocument',{source:"window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});"});
  await win.loadURL(url);await run(async()=>{await __game.hydrated();__game.devStartRun('magician');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);
   for(let i=0;i<300&&!w.nativeWorldReady();i++)await new Promise(r=>setTimeout(r,20));
   if(!w.nativeWorldReady())throw Error('Native world not ready');
   const a=w.actors.find(a=>a.defId==='townsfolk_innkeep');w.player.pos={...a.pos};w.player.tier=a.tier;w.player.invulnerable=true;
   for(let i=0;i<130;i++)w.update(1/60);
   __game.ui.openMapTab('quests');
  });
  const before=await run(state);assert.equal(before.lesson,'learn');
  results.guide=await run(()=>{const d=document.querySelector('[data-skill-preparation]');if(!d)throw Error('Missing optional lesson');const closed=!d.open;d.querySelector('summary').click();return {closed,open:d.open,autoButtons:document.querySelectorAll('[data-prepare-skill],[data-exploration-reward],[data-exploration-choose]').length,text:d.textContent};});
  assert.ok(results.guide.closed&&results.guide.open);assert.equal(results.guide.autoButtons,0);assert.deepEqual(await run(state),before);await pageShot('optional-guide');
  await run(()=>{document.querySelector('[data-prepare-inventory]').click();__game.ui.refreshInventory();});
  await pageShot('pack');
  await run(()=>{document.querySelector('[data-buildflap]').click();__game.ui.refreshInventory();});
  const gifts=await run(()=>{const w=__game.world();return ['life_flask','mana_flask'].map(id=>({id,uid:w.meta.items.find(i=>i.gem?.skillId===id).uid}));});
  const seat=await run(()=>__game.world().player.skills.findIndex(s=>!s));
  await drag(gifts[0].uid,seat);assert.equal((await run(state)).bar[seat],'life_flask');
  assert.equal((await run(state)).lesson,'learn');await pageShot('first-flask');
  const seat2=await run(()=>__game.world().player.skills.findIndex(s=>!s));await drag(gifts[1].uid,seat2);
  assert.equal((await run(state)).bar[seat2],'mana_flask');
  await run(()=>{__game.ui.hideAll();for(let i=0;i<10;i++)__game.world().update(1/60);});
  assert.equal((await run(state)).lesson,null);
  await run(async()=>{__game.save();await __game.flushRunSave();await new Promise(r=>setTimeout(r,300));});const saved=await run(state);
  await win.loadURL(url);await run(async()=>{await __game.hydrated();for(let i=0;i<100&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,40));const b=document.querySelector('#sm-continue:not([disabled])');if(!b)throw Error('No Continue');const old=__game.world();b.click();for(let i=0;i<300&&(__game.world()===old||!__game.world().localSeat||!__game.world().massRuntime||__game.world().massRuntime.resumePending);i++)await new Promise(r=>setTimeout(r,40));if(__game.world()===old||!__game.world().localSeat)throw Error('Continue did not publish restored world');__game.ui.hideAll();});
  assert.deepEqual(await run(state),saved);results.continue=true;
  // Show the cave, true descending pit and floor hatch together in native terrain.
  results.caves=await run(()=>{const w=__game.world(),m=w.massRuntime,p=m.journey.places.find(p=>p.content==='memorial-grove'),q=m.journey.local(p);w.landPartyAt({x:q.x,y:q.y+400});m.update(w,true);w.actors=[w.player];
   const at={...w.player.pos};w.doodads=[{kind:'cave_entrance',pos:{x:at.x-160,y:at.y-110},radius:64},{kind:'pit_entrance',pos:{x:at.x+30,y:at.y-110},radius:52},{kind:'cellar_hatch',pos:{x:at.x+200,y:at.y-110},radius:36}];
   w.markDoodadsChanged();w.rebuildClientTerrain();w.time=__game.clipCatalog().noon;w.player.facing=-Math.PI/2;__game.renderer.render(w);return w.doodads.map(d=>({kind:d.kind,pos:d.pos,radius:d.radius}));});
  await shot('entrances');
  results.brush=await run(()=>{const w=__game.world(),r=__game.renderer,p=w.player;w.doodads=[{kind:'brush',pos:{...p.pos},radius:58}];w.markDoodadsChanged();w.rebuildClientTerrain();w.updateTerrainEffects(1/60);
   const c=r.ctx,draw=c.drawImage,alphas=[];c.drawImage=function(...args){alphas.push(this.globalAlpha);return draw.apply(this,args);};try{r.drawActor(p,w);}finally{c.drawImage=draw;}
   return {status:p.statuses.some(s=>s.id==='concealed'),detection:p.sheet.get('detectability'),faded:alphas.some(a=>Math.abs(a-.55)<.001),fatal:__game.crash().fatal};});
  assert.deepEqual(results.brush,{status:true,detection:.5,faded:true,fatal:null});await shot('brush-cover');
  const out=await run(()=>{const w=__game.world(),p=w.player;p.pos.x+=100;for(let i=0;i<60;i++){p.updateTimers(1/60);w.updateTerrainEffects(1/60);}return p.sheet.get('detectability');});assert.equal(out,1);await shot('brush-exit');
  win.setSize(650,700);await new Promise(r=>setTimeout(r,150));await run(()=>{__game.renderer.resize();__game.ui.toggleInventory();__game.ui.refreshInventory();});await pageShot('narrow-pack');
  fs.writeFileSync(path.join(dir,'gameplay-followup-ui.json'),JSON.stringify(results,null,2));
  console.log('PASS optional read-only guide, real pack-to-rack drags, once-only lesson and exact Continue, cave/pit/hatch visuals, native brush detection and visible body fade');
 }catch(e){console.error(e.stack||e);await pageShot('failure').catch(()=>{});process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
