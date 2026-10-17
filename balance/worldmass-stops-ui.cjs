// Controlled native movement, route access, field membership and browser Continue.
// This fixture is not an independent enjoyment review.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');
app.setPath('userData',path.join(dir,'route-stops-profile-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/route-stops-dist');
 const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');fs.createReadStream(f).pipe(res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port;
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async(fn,...args)=>{
  const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');
  if(!r.ok)throw Error(r.error);return r.value;
 };
 const shot=async(name)=>{
  const png=await run(()=>document.getElementById('game').toDataURL('image/png'));
  fs.writeFileSync(path.join(dir,'route-stops-'+name+'.png'),Buffer.from(png.split(',')[1],'base64'));
 };
 const timer=setTimeout(()=>app.exit(1),180000);
 try{
  await win.loadURL(url);
  await run(async()=>{
   window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
   await new Promise(r=>setTimeout(r,200));__game.devStartRun('warrior');__game.ui.hideAll();
   const w=__game.world();w.startWorldMass(42);w.player.invulnerable=true;
  });
  const arrivals=[];
  for(const content of ['caravan-wreck','windworn-shrine']){
   await run(content=>{
    const w=__game.world(),m=w.massRuntime,p=m.journey.places.find(p=>p.content===content);
    const trail=m.journey.trails.find(t=>t.id===p.id+'/approach');
    w.landPartyAt(trail.points[0]);m.update(w,true);__game.step(3);
   },content);
   await shot(content+'-turnoff');
   const arrival=await run(content=>{
    const w=__game.world(),m=w.massRuntime,p=m.journey.places.find(p=>p.content===content);
    const chest=w.chests.find(c=>c.rewardSource===JSON.stringify([p.id,'cache']));
    if(!chest)throw Error('Native cache not admitted');
    const hero=w.player,load=w.loadZone;let loads=0,frames=0;
    w.loadZone=function(...args){loads++;return load.apply(this,args);};
    const target={...chest.pos};
    __game.devInput(()=>{
     const next=m.walk.pathStep(w.player.pos,target)||target;
     return {dx:next.x-w.player.pos.x,dy:next.y-w.player.pos.y,aim:target,held:[],edge:[]};
    });
    while(Math.hypot(target.x-w.player.pos.x,target.y-w.player.pos.y)>34&&frames++<900)__game.step(1);
    __game.devInput(null);w.loadZone=load;
    if(frames>=900)throw Error('Native walk stalled: '+JSON.stringify({content,pos:w.player.pos,target}));
    __game.step(2);
    return {content,frames,loads,sameHero:hero===w.player,site:m.localSite(w.player.pos),
     pos:{...w.player.pos},native:m.snapshot(w).enemies.filter(e=>e.id.startsWith('['+JSON.stringify(p.id)+',')),
     found:m.sites.discovered.some(s=>s.id===p.id),fatal:__game.crash().fatal};
   },content);
   assert.ok(arrival.frames>10);assert.equal(arrival.loads,0);assert.ok(arrival.sameHero&&arrival.found);
   assert.equal(arrival.site.level,2);assert.equal(arrival.fatal,null);arrivals.push(arrival);
   await shot(content+'-arrived');
  }
  const field=await run(()=>{
   const w=__game.world(),al=w.altars.find(a=>a.def.id==='haste_altar');
   const enemy=w.actors.find(a=>a.defId==='plains_wolf'&&Math.hypot(a.pos.x-al.pos.x,a.pos.y-al.pos.y)<600);
   if(!enemy)throw Error('No native shrine wolf');
   // Controlled membership sample: native updateAltars owns all modifiers.
   const hp={...w.player.pos},ep={...enemy.pos};
   const read=()=>({hero:w.player.sheet.get('moveSpeed'),enemy:enemy.sheet.get('moveSpeed')});
   w.player.pos={x:al.pos.x+400,y:al.pos.y};enemy.pos={x:al.pos.x+450,y:al.pos.y};w.updateAltars(.01);
   const before=read();
   w.player.pos={x:al.pos.x+40,y:al.pos.y};enemy.pos={x:al.pos.x-40,y:al.pos.y};w.updateAltars(.01);
   const inside=read(),members=[al.affected.has(w.player.id),al.affected.has(enemy.id)];
   w.player.pos={x:al.pos.x+400,y:al.pos.y};w.updateAltars(.01);const heroLeft=read();
   enemy.pos={x:al.pos.x+450,y:al.pos.y};w.updateAltars(.01);const outside=read();
   w.player.pos=hp;enemy.pos=ep;w.updateAltars(.01);
   return {before,inside,heroLeft,outside,members};
  });
  assert.ok(field.members.every(Boolean));assert.ok(field.inside.hero>field.before.hero&&field.inside.enemy>field.before.enemy);
  assert.equal(field.heroLeft.hero,field.before.hero);assert.equal(field.heroLeft.enemy,field.inside.enemy);
  assert.deepEqual(field.outside,field.before);
  const saved=await run(async()=>{
   const w=__game.world(),m=w.massRuntime;__game.save();await new Promise(r=>setTimeout(r,200));
   return {pos:{...w.player.pos},seed:m.generator.run.seed,trails:m.journey.trails,fields:m.fields.snapshot(),
    found:m.snapshot(w).sites.found, enemies:m.snapshot(w).enemies};
  });
  await win.loadURL(url);
  const continued=await run(async()=>{
   window.requestAnimationFrame=()=>0;
   for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
   document.querySelector('#sm-continue:not([disabled])').click();
   const w=__game.world(),m=w.massRuntime;
   return {pos:{...w.player.pos},seed:m.generator.run.seed,trails:m.journey.trails,fields:m.fields.snapshot(),
    found:m.snapshot(w).sites.found,enemies:m.snapshot(w).enemies,fatal:__game.crash().fatal};
  });
  assert.equal(continued.fatal,null);delete continued.fatal;assert.deepEqual(continued,saved);
  fs.writeFileSync(path.join(dir,'route-stops-ui.json'),JSON.stringify({arrivals,field,saved,continued},null,2));
  console.log('PASS physical detours with native AI, no scene swaps, shared Haste entry/exit and exact browser Continue');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
