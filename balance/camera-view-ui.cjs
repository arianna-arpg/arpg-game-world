// Main game scale, ignored legacy zoom, native pointer aim and capture restore in a disposable client.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');app.setPath('userData',path.join(dir,'camera-view-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'dist');
 const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');fs.createReadStream(f).pipe(res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async(fn,...args)=>{
  const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');
  if(!r.ok)throw Error(r.error);return r.value;
 };
 const input=async(...events)=>{for(const e of events)win.webContents.sendInputEvent(e);await new Promise(r=>setTimeout(r,40));await run(()=>true);};
 const shot=async name=>{
  const png=await run(()=>document.getElementById('game').toDataURL());
  fs.writeFileSync(path.join(dir,'camera-view-'+name+'.png'),Buffer.from(png.split(',')[1],'base64'));
 };
 const timer=setTimeout(()=>app.exit(1),180000);
 try{
  await win.loadURL(url);win.webContents.focus();
  await run(async()=>{
   await __game.hydrated();__game.hold(true);Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
   __game.devStartRun('magician');__game.ui.hideAll();
   const w=__game.world();w.startWorldMass(42);const m=w.massRuntime,p=m.journey.places.find(p=>p.content==='cinderwatch');
   w.landPartyAt(m.journey.local(p));__game.settings().renderScale=1;
   for(let i=0;i<70;i++){w.time+=1/60;__game.renderer.render(w);}
  });
  const before=await run(()=>{
   const w=__game.world(),r=__game.renderer,p=w.player;
   return {zoom:__game.settings().cameraZoom,pos:{...p.pos},life:p.life,mana:p.mana,hud:r.hudSlotRects,
    center:r.toScreen(p.pos),offset:r.toScreen({x:p.pos.x+100,y:p.pos.y}),fatal:__game.crash().fatal};
  });
  assert.equal(before.zoom,undefined);assert.ok(Math.abs(before.offset.x-before.center.x-130)<1e-8);assert.equal(before.fatal,null);await shot('classic');
  const option=await run(()=>{
   __game.ui.showEscapeMenu();document.querySelector('#esc-keys').click();
   document.querySelector('[data-opttab="visuals"]').click();
   return {gameZoom:!!document.querySelector('#opt-camerazoom'),cameraMode:!!document.querySelector('#opt-cameramode')};
  });
  assert.equal(option.gameZoom,false);assert.equal(option.cameraMode,true);
  fs.writeFileSync(path.join(dir,'camera-view-options.png'),(await win.webContents.capturePage()).toPNG());
  await run(()=>{__game.ui.hideAll();__game.renderer.render(__game.world());});
  const after=await run(()=>{
   const w=__game.world(),r=__game.renderer,p=w.player;
   return {pos:{...p.pos},life:p.life,mana:p.mana,hud:r.hudSlotRects,
    center:r.toScreen(p.pos),offset:r.toScreen({x:p.pos.x+100,y:p.pos.y})};
  });
  assert.deepEqual(after.pos,before.pos);assert.equal(after.life,before.life);assert.equal(after.mana,before.mana);
  assert.deepEqual(after.hud,before.hud);assert.ok(Math.hypot(after.center.x-before.center.x,after.center.y-before.center.y)<1e-8);
  assert.ok(Math.abs((after.offset.x-after.center.x)/(before.offset.x-before.center.x)-1)<1e-10);
  const capture=await run(()=>{
   const r=__game.renderer,w=__game.world(),p=w.player;
   const span=()=>r.toScreen({x:p.pos.x+100,y:p.pos.y}).x-r.toScreen(p.pos).x;
   r.setBaseZoom(2.1);r.render(w);const staged=span();
   __game.settings().cameraZoom=1.6;r.setBaseZoom(null);r.render(w);
   return {staged,restored:span()};
  });
  assert.ok(Math.abs(capture.staged-210)<1e-8);assert.ok(Math.abs(capture.restored-130)<1e-8);
  const aims=[];
  for(const [zoom,resolution] of [[.85,1],[1.6,1],[1.6,.75]]){
   const aim=await run((zoom,resolution)=>{
    const w=__game.world(),p=w.player,m=w.massRuntime,r=__game.renderer;
    __game.ui.hideAll();w.landPartyAt({x:-4000,y:-4000});
    w.actors=[p];w.doodads=[];w.markDoodadsChanged();w.zones=[];w.projectiles=[];
    for(let y=-4500;y<-3500;y+=30)for(let x=-4500;x<-3500;x+=30)
     m.state.paint({address:m.walk.at(x,y),region:'ground',color:'#454331',cause:'qa/camera-aim'});
    p.casting=null;p.mana=p.maxMana();
    __game.settings().cameraZoom=zoom;__game.settings().renderScale=resolution;
    r.setRenderScale(resolution);__game.step(1);
    const target={x:p.pos.x+180,y:p.pos.y-80},screen=r.toScreen(target);
    return {target,screen:{x:Math.round(screen.x/resolution),y:Math.round(screen.y/resolution)},origin:{...p.pos}};
   },zoom,resolution);
   await input({type:'mouseMove',...aim.screen},{type:'mouseDown',button:'left',clickCount:1,...aim.screen});
   const first=await run(()=>{__game.step(5);const p=__game.world().player;return {aim:p.aimPos,cast:p.casting?.inst.def.id,heldAim:p.casting?.aim};});
   await input({type:'mouseUp',button:'left',clickCount:1,...aim.screen});
   const shotResult=await run(()=>{
    const w=__game.world();let frames=0,projectile=[];
    while(frames++<90&&!projectile.length){__game.step(1);projectile=w.projectiles.filter(p=>p.caster===w.player).map(p=>({dir:p.dir,pos:{...p.pos}}));}
    return {frames,projectile,cast:w.player.casting?.inst.def.id,fatal:__game.crash().fatal};
   });
   console.log(JSON.stringify({zoom,resolution,first,shotResult}));
   assert.equal(first.cast,'firebolt');assert.ok(Math.hypot(first.aim.x-aim.target.x,first.aim.y-aim.target.y)<1.5);
   assert.ok(shotResult.projectile.length);const expected=Math.atan2(aim.target.y-aim.origin.y,aim.target.x-aim.origin.x);
   assert.ok(Math.abs(shotResult.projectile[0].dir-expected)<.012);assert.equal(shotResult.fatal,null);
   aims.push({zoom,resolution,aim,first,shotResult});
   await run(()=>__game.step(90)); // released native cast/cooldown settles before the next case
  }
  await run(async()=>{
   __game.settings().cameraZoom=1.6;__game.settings().renderScale=1;__game.saveSettings();__game.save();
   await new Promise(r=>setTimeout(r,200));
   // Simulate a preference written by the removed version.
   for(const key of Object.keys(localStorage).filter(k=>k.includes('settings'))) {
    const value=JSON.parse(localStorage.getItem(key));value.cameraZoom=1.6;localStorage.setItem(key,JSON.stringify(value));
   }
  });
  await win.loadURL(url);
  const persisted=await run(async()=>{
   await __game.hydrated();__game.hold(true);
   for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
   document.querySelector('#sm-continue:not([disabled])').click();
   return {zoom:__game.settings().cameraZoom,fatal:__game.crash().fatal};
  });
  assert.equal(persisted.zoom,undefined);assert.equal(persisted.fatal,null);
  fs.writeFileSync(path.join(dir,'camera-view-ui.json'),JSON.stringify({before,option,after,capture,aims,persisted},null,2));
  console.log(JSON.stringify({option,aims,persisted}));
  console.log('PASS main game scale, removed zoom option, capture restore, unchanged HUD/vitals, native mouse aim and Firebolt across resolution settings, legacy preference ignored on Continue');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
