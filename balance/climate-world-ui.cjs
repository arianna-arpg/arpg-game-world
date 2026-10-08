// Controlled real-client climate travel and persistence; this is not an enjoyment review.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');
app.setPath('userData',path.join(dir,'climate-world-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 let root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/climate-dist');
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
 const shot=async name=>{
  const png=await run(()=>document.getElementById('game').toDataURL('image/png'));
  fs.writeFileSync(path.join(dir,'climate-world-'+name+'.png'),Buffer.from(png.split(',')[1],'base64'));
 };
 const timer=setTimeout(()=>app.exit(1),240000);
 try{
  await win.loadURL(url);
  await run(async()=>{
   window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
   await new Promise(r=>setTimeout(r,200));__game.devStartRun('warrior');__game.ui.hideAll();
   const w=__game.world();w.startWorldMass(42);w.player.invulnerable=true;
  });
  const locations=[];
  for(const [name,x,y] of [['tundra',-24000,-19200],['marsh',-21600,-16800]]){
   const result=await run((name,x,y)=>{
    const w=__game.world(),m=w.massRuntime;w.landPartyAt({x,y});m.update(w,true);
    // Keep native terrain/ecology. These paused renders are not a combat outing.
    for(let i=0;i<70;i++){w.time+=1/60;__game.renderer.render(w);}
    return {name,pos:{...w.player.pos},sample:m.stream.sample(m.walk.at(w.player.pos.x,w.player.pos.y)),
     scenery:w.doodads.filter(d=>Math.hypot(d.pos.x-w.player.pos.x,d.pos.y-w.player.pos.y)<800)
      .reduce((out,d)=>(out[d.kind]=(out[d.kind]||0)+1,out),{}),fatal:__game.crash().fatal};
   },name,x,y);
   assert.equal(result.sample.biome,name);assert.ok(Object.keys(result.scenery).length);assert.equal(result.fatal,null);
   locations.push(result);await shot(name);
  }
  const travel=await run(()=>{
   const w=__game.world(),Constructor=w.massRuntime.constructor,c=JSON.parse(JSON.stringify(w.massRuntime.config));
   delete c.settlement;delete c.journey;delete c.progression;
   delete c.terrain.patches;
   c.terrain.fields=[];c.terrain.places=[];c.content=[];c.populationRadius=0;c.startRadius=0;c.maxPopulation=0;
   c.terrain.surfaces=[{id:'fixture',priority:0,when:[],region:'swamp',biome:'marsh',color:'#30483d'}];
   delete c.ecology;
   const m=new Constructor(42,'climate-walking-fixture',c);m.attach(w);w.player.invulnerable=true;
   // A dry route crossing a real native swamp surface; movement is ordinary
   // simulation input. Only the fixture geography and start position are authored.
   for(let y=-300;y<=300;y+=30)for(let x=-300;x<=0;x+=30)
    m.state.paint({address:m.walk.at(x,y),region:'ground',color:'#62573e',cause:'qa/dry-route'});
   w.landPartyAt({x:-180,y:15});const hero=w.player,load=w.loadZone;let loads=0;
   w.loadZone=function(...args){loads++;return load.apply(this,args);};
   __game.devInput(()=>({dx:1,dy:0,aim:{x:700,y:15},held:[],edge:[]}));
   const start={...hero.pos};__game.step(30);const dry={pos:{...hero.pos},speed:hero.sheet.get('moveSpeed')};
   __game.step(90);const wet={pos:{...hero.pos},speed:hero.sheet.get('moveSpeed'),
    status:hero.statuses.map(s=>s.id),region:m.walk.regionAt(hero.pos.x,hero.pos.y)};
   __game.step(30);const wetEnd={...hero.pos};__game.devInput(null);w.loadZone=load;
   return {start,dry,wet,wetEnd,loads,sameHero:hero===w.player,fatal:__game.crash().fatal};
  });
  assert.equal(travel.loads,0);assert.ok(travel.sameHero);assert.equal(travel.fatal,null);
  assert.ok(travel.wet.status.includes('sodden'));assert.equal(travel.wet.region,'swamp');
  assert.ok(travel.wet.speed<travel.dry.speed*.6);
  assert.ok(travel.wetEnd.x-travel.wet.pos.x<(travel.dry.pos.x-travel.start.x)*.6);
  await shot('dry-to-wet');
  // Save a genuine generated cold-country point, with its live native contents.
  const saved=await run(async()=>{
   const w=__game.world();w.startWorldMass(42);w.player.invulnerable=true;
   w.landPartyAt({x:-24000,y:-19200});w.massRuntime.update(w,true);__game.step(1);
   const m=w.massRuntime;__game.save();await new Promise(r=>setTimeout(r,200));
   return {pos:{...w.player.pos},seed:m.generator.run.seed,config:m.config,
    sample:m.stream.sample(m.walk.at(w.player.pos.x,w.player.pos.y)),
    scenery:w.doodads.filter(d=>Math.hypot(d.pos.x-w.player.pos.x,d.pos.y-w.player.pos.y)<800)
     .map(d=>JSON.stringify([d.kind,d.pos,d.radius,d.rot])).sort()};
  });
  await win.loadURL(url);
  const continued=await run(async()=>{
   window.requestAnimationFrame=()=>0;
   for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
   document.querySelector('#sm-continue:not([disabled])').click();
   const w=__game.world(),m=w.massRuntime;
   return {pos:{...w.player.pos},seed:m.generator.run.seed,config:m.config,
    sample:m.stream.sample(m.walk.at(w.player.pos.x,w.player.pos.y)),
    scenery:w.doodads.filter(d=>Math.hypot(d.pos.x-w.player.pos.x,d.pos.y-w.player.pos.y)<800)
     .map(d=>JSON.stringify([d.kind,d.pos,d.radius,d.rot])).sort(),fatal:__game.crash().fatal};
  });
  assert.equal(continued.fatal,null);delete continued.fatal;assert.deepEqual(continued,saved);
  // Continue an actual pre-climate browser save, not a hand-labelled v5 fixture.
  root=path.resolve(__dirname,'reports','raised-guard-dist');
  await win.loadURL(url);
  const legacy=await run(async()=>{
   window.requestAnimationFrame=()=>0;await new Promise(r=>setTimeout(r,200));
   __game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);
   __game.save();await new Promise(r=>setTimeout(r,200));const m=w.massRuntime;
   return {config:m.config,seed:m.generator.run.seed,pos:{...w.player.pos},
    sample:m.stream.sample(m.walk.at(-24000,-19200))};
  });
  assert.equal(legacy.config.terrain.version,5);
  root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/climate-dist');
  await win.loadURL(url);
  const legacyContinued=await run(async()=>{
   window.requestAnimationFrame=()=>0;
   for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
   document.querySelector('#sm-continue:not([disabled])').click();
   const w=__game.world(),m=w.massRuntime;
   return {config:m.config,seed:m.generator.run.seed,pos:{...w.player.pos},
    sample:m.stream.sample(m.walk.at(-24000,-19200))};
  });
  assert.deepEqual(legacyContinued,legacy);
  fs.writeFileSync(path.join(dir,'climate-world-ui.json'),JSON.stringify({locations,travel,saved,continued,legacy,legacyContinued},null,2));
  console.log('PASS actual prior-version browser save retains its complete configuration, location, seed and terrain on the new build');
  console.log(JSON.stringify({locations,travel}));
  console.log('PASS actual generated climate views, native dry-to-swamp movement without scene swap, and exact browser Continue');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
