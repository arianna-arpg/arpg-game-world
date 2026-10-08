// Hidden real-client acceptance with isolated saves; no production profile writes.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');fs.mkdirSync(dir,{recursive:true});
app.setPath('userData',path.join(dir,'water-watch-profile-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.join(dir,'water-watch-dist');
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
  fs.writeFileSync(path.join(dir,'water-watch-'+name+'.png'),Buffer.from(png.split(',')[1],'base64'));
 };
 const timer=setTimeout(()=>app.exit(1),240000);
 try{
  await win.loadURL('about:blank');console.log('BOOT blank');
  win.webContents.debugger.attach('1.3'); await win.webContents.debugger.sendCommand('Page.enable');
  await win.webContents.debugger.sendCommand('Page.addScriptToEvaluateOnNewDocument',{source:"window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});"});
  await win.loadURL(url);console.log('BOOT loaded');
  await run(async()=>{await __game.hydrated();});console.log('BOOT hydrated');
  await run(async()=>{
   __game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);
   for(let i=0;i<200&&!w.nativeWorldReady();i++)await new Promise(r=>setTimeout(r,20));
   if(!w.nativeWorldReady())throw Error('Native scene never ready');
   w.player.invulnerable=true;window.waterWatch={};
   window.waterWatchAdvance=async seconds=>{
    const until=__game.world().time+seconds;
    for(let i=0;i<500&&__game.world().time<until;i++){
     __game.step(6);await new Promise(r=>setTimeout(r,5));
    }
    if(__game.world().time<until)throw Error('Simulation did not advance: '+JSON.stringify(__game.world().massRuntime.nativeReadiness(__game.world())));
   };
   await waterWatchAdvance(.25);
  });
  console.log('BOOT native ready');
  const gates=await run(async()=>{
   const w=__game.world(),town=w.massRuntime.settlement,r=__game.renderer;
   const guards=town.defenders;if(guards.length!==8)throw Error('Missing watch');
   const start=w.massRuntime.journey.departurePoints.find(p=>p.y===15);
   w.landPartyAt({x:start.x,y:80});w.time=48;__game.ui.hideAll();
   await waterWatchAdvance(.25);for(let i=0;i<30;i++)r.render(w);
   waterWatch.guards=guards;waterWatch.home={...w.player.pos};
   return {guards:guards.map(a=>({name:a.name,look:a.look,pos:a.pos})),fences:w.doodads.filter(d=>d.kind==='rail_fence').length};
  });
  console.log('GATES rendered');await shot('north-gate');assert.ok(gates.fences>60);
  await run(async()=>{
   const w=__game.world(),r=__game.renderer;w.landPartyAt({x:170,y:900});__game.ui.hideAll();
   for(let i=0;i<30;i++)r.render(w);
  });
  console.log('CREEK rendered');await shot('creek');
  const water=await run(()=>{
   const w=__game.world(),m=w.massRuntime,p=__game.renderer.massPainter;let point;
   search:for(let y=-18000;y<=18000;y+=600)for(let x=-18000;x<=18000;x+=600){
    if([[0,0],[-300,-300],[300,300]].every(([dx,dy])=>m.generator.terrainAt(m.walk.at(x+dx,y+dy)).region==='water')){point={x,y};break search;}
   }
   if(!point)throw Error('No natural water');
   const c=document.createElement('canvas');c.width=600;c.height=400;const ctx=c.getContext('2d');
   const x=point.x-300,y=point.y-200;ctx.translate(-x,-y);
   const draw=time=>{p.draw(ctx,m,x,y,600,400);p.drawWater(ctx,m,x,y,600,400,time);return ctx.getImageData(0,0,600,400).data.slice();};
   const before=JSON.stringify([m.state.snapshot(),w.player.pos,w.player.life]);
   draw(1);let bakes=0;const original=p.bake;p.bake=function(...args){bakes++;return original.apply(this,args);};
   const a=draw(1),first=c.toDataURL(),b=draw(3),second=c.toDataURL();p.bake=original;
   let changed=0;for(let i=0;i<a.length;i+=4)if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2])changed++;
   if(before!==JSON.stringify([m.state.snapshot(),w.player.pos,w.player.life]))throw Error('Painting changed gameplay');
   return {point,changed,bakes,first,second};
  });
  for(const name of ['first','second']){fs.writeFileSync(path.join(dir,'water-watch-lake-'+name+'.png'),Buffer.from(water[name].split(',')[1],'base64'));delete water[name];}
  assert.ok(water.changed>100);assert.equal(water.bakes,0);
  console.log('WATER tested');
  const battle=await run(async()=>{
   const w=__game.world(),guards=waterWatch.guards,g=guards[0];w.landPartyAt(waterWatch.home);__game.ui.hideAll();
   const e=w.createMonster('skeleton_warrior',1,'enemy');e.pos={x:g.pos.x+38,y:g.pos.y};e.aiAnchor={...e.pos};w.actors.push(e);
   for(let i=0;i<200&&!w.nativeWorldReady();i++)await new Promise(r=>setTimeout(r,20));
   const xp=w.meta.xp,kills=w.kills;waterWatch.foe=e;await waterWatchAdvance(6);
   return {time:w.time,paused:w.paused,guard:g.pos,target:g.aiTargetId,skills:g.skills.map(s=>s?.def.id),guardCast:g.casting?.inst.def.id,foe:e.pos,life:e.life,foeTarget:e.aiTargetId,dead:e.dead,xpBefore:xp,xpAfter:w.meta.xp,killsBefore:kills,killsAfter:w.kills,fatal:__game.crash().fatal};
  });
  console.log(JSON.stringify(battle));assert.ok(battle.dead);assert.equal(battle.xpBefore,battle.xpAfter);assert.equal(battle.killsBefore,battle.killsAfter);assert.equal(battle.fatal,null);
  await shot('guard-defense');
  const saved=await run(async()=>{
   const w=__game.world(),g=waterWatch.guards;w.kill(g[1],true);g[0].life=g[0].maxLife()*.4;
   __game.save();await __game.flushRunSave();
   return {seed:w.massRuntime.generator.run.seed,life:g[0].life,dead:g[1].dead,fences:w.doodads.filter(d=>d.kind==='rail_fence').length};
  });
  await win.loadURL(url);
  const continued=await run(async()=>{
   await __game.hydrated();
   for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
   document.querySelector('#sm-continue:not([disabled])').click();
   for(let i=0;i<200&&(!__game.world().massRuntime||__game.world().massRuntime.resumePending);i++)await new Promise(r=>setTimeout(r,50));
   __game.ui.hideAll();const w=__game.world(),g=w.massRuntime.settlement.defenders;
   for(let i=0;i<20;i++)__game.renderer.render(w);
   return {seed:w.massRuntime.generator.run.seed,life:g[0].life,dead:g[1].dead,fences:w.doodads.filter(d=>d.kind==='rail_fence').length};
  });
  assert.deepEqual(continued,saved);await shot('continued');
  fs.writeFileSync(path.join(dir,'water-watch-ui.json'),JSON.stringify({gates,water,battle,saved,continued},null,2));
  console.log('PASS live gate/creek views, moving lake pixels without rebakes, native guard kills without rewards, and browser Continue');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
