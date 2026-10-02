// Controlled native storm QA; isolated profile, separate from independent play.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');fs.mkdirSync(dir,{recursive:true});
app.setPath('userData',path.join(dir,'storm-fields-profile-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'dist-preview');
 const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');
  fs.createReadStream(f).pipe(res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port;
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async fn=>{
  const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')()}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');
  if(!r.ok)throw Error(r.error);return r.value;
 };
 const shot=async name=>{
  const png=await run(()=>document.querySelector('canvas').toDataURL('image/png'));
  fs.writeFileSync(path.join(dir,'storm-fields-'+name+'.png'),Buffer.from(png.split(',')[1],'base64'));
 };
 const timer=setTimeout(()=>app.exit(1),150000);
 try {
  await win.loadURL(url);
  const warning=await run(()=>{
   window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
   __game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);
   const m=w.massRuntime,p=m.journey.places.find(p=>p.content==='fallen-court');
   w.landPartyAt(m.journey.local(p));m.update(w,true);
   const altar=w.altars.find(a=>a.def.id==='storm_altar');if(!altar)throw Error('Missing admitted storm');
   w.actors=[w.player];w.zones=[];w.altars=[altar];w.player.invulnerable=false;
   let strike,direction;
   for(let n=0;n<100;n++){
    w.zones=[];altar.boltTimer=0;w.updateAltars(.001);strike=w.zones[0];
    direction=[{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}].find(d=>
     Array.from({length:12},(_,i)=>({x:strike.pos.x+d.x*i*10,y:strike.pos.y+d.y*i*10}))
      .every(q=>w.walk.isWalkable(q.x,q.y)&&!w.pointInSolid(q.x,q.y,w.player.radius+2)));
    if(direction)break;
   }
   if(!direction)throw Error('No clear controlled evasion line');
   w.landPartyAt(strike.pos);
   const foe=w.createMonster('zombie',altar.level,'enemy');foe.brain=undefined;foe.skills=[];
   foe.pos={...strike.pos};foe.aiAnchor={...foe.pos};w.actors.push(foe);
   window.stormQa={altar,foe,strike,direction,before:[w.player.life,foe.life],source:altar.massSource};
   __game.devInput(()=>({dx:0,dy:0,aim:{...stormQa.strike.pos},held:[],edge:[]}));
   __game.step(1,16.7);
   return {delay:strike.delay,hero:w.player.life,foe:foe.life,level:altar.level,casterLevel:strike.caster.level};
  });
  assert.ok(warning.delay>0);assert.equal(warning.level,warning.casterLevel);await shot('warning');
  const dodged=await run(()=>{
   const w=__game.world(),q=stormQa;
   __game.devInput(()=>({dx:q.direction.x,dy:q.direction.y,aim:{...q.strike.pos},held:[],edge:[]}));
   __game.step(35,16.7);
   __game.devInput(()=>({dx:0,dy:0,aim:{...q.strike.pos},held:[],edge:[]}));
   return {hero:w.player.life,foe:q.foe.life,delay:q.strike.delay,
    distance:Math.hypot(w.player.pos.x-q.strike.pos.x,w.player.pos.y-q.strike.pos.y),
    required:q.strike.radius+w.player.radius};
  });
  assert.equal(dodged.hero,warning.hero);assert.equal(dodged.foe,warning.foe);
  assert.ok(dodged.delay>0&&dodged.distance>dodged.required);await shot('evaded');
  const landed=await run(()=>{
   __game.step(15,16.7);const w=__game.world(),q=stormQa;
   return {hero:w.player.life,foe:q.foe.life,exploded:q.strike.exploded,fatal:__game.crash().fatal};
  });
  assert.equal(landed.hero,warning.hero);assert.ok(landed.foe<warning.foe);assert.ok(landed.exploded);assert.equal(landed.fatal,null);await shot('impact');
  const stood=await run(()=>{
   const w=__game.world(),q=stormQa;let strike;
   for(let n=0;n<100;n++){
    w.zones=[];q.altar.boltTimer=0;w.updateAltars(.001);strike=w.zones[0];
    if(w.walk.isWalkable(strike.pos.x,strike.pos.y)&&!w.pointInSolid(strike.pos.x,strike.pos.y,w.player.radius+8))break;
   }
   w.landPartyAt(strike.pos);
   if(Math.hypot(w.player.pos.x-strike.pos.x,w.player.pos.y-strike.pos.y)>2)
    throw Error('Controlled impact fixture was displaced from its sampled strike');
   __game.devInput(()=>({dx:0,dy:0,aim:{...strike.pos},held:[],edge:[]}));
   const life=w.player.life;__game.step(46,16.7);
   return {before:life,after:w.player.life,exploded:strike.exploded,delay:strike.delay,
    distance:Math.hypot(w.player.pos.x-strike.pos.x,w.player.pos.y-strike.pos.y),radius:strike.radius,
    position:w.player.pos,strikePos:strike.pos,es:w.player.es};
  });
  console.log(JSON.stringify({warning,dodged,landed,stood}));await shot('stood');
  assert.ok(stood.exploded&&stood.after<stood.before);
  const saved=await run(async()=>{
   const w=__game.world();stormQa.altar.boltTimer=.43;
   __game.devInput(null);__game.save();await new Promise(r=>setTimeout(r,250));
   return {source:stormQa.source,level:stormQa.altar.level,seed:w.massRuntime.generator.run.seed};
  });
  await win.loadURL(url);
  const restored=await run(async()=>{
   window.requestAnimationFrame=()=>0;
   for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
   document.querySelector('#sm-continue:not([disabled])').click();
   for(let i=0;i<80&&!__game.world().massRuntime;i++)await new Promise(r=>setTimeout(r,100));
   const w=__game.world(),a=w.altars.find(a=>a.def.id==='storm_altar');
   return {source:a.massSource,level:a.level,timer:a.boltTimer,seed:w.massRuntime.generator.run.seed,fatal:__game.crash().fatal};
  });
  assert.equal(restored.source,saved.source);assert.equal(restored.level,saved.level);assert.equal(restored.seed,saved.seed);
  assert.equal(restored.timer,.43);assert.equal(restored.fatal,null);
  fs.writeFileSync(path.join(dir,'storm-fields-ui.json'),JSON.stringify({warning,dodged,landed,stood,saved,restored},null,2));
  console.log('PASS native storm warning, real movement avoidance, enemy impact, player stand-in impact and browser Continue');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
