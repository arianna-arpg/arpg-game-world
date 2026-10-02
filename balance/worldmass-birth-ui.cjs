// Controlled native guardian construction and Continue; disposable profile, not a critic playtest.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');
app.setPath('userData',path.join(dir,'birth-profile-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/birth-dist');
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
 const shot=async(name)=>{const png=await run(()=>document.getElementById('game').toDataURL('image/png'));
  fs.writeFileSync(path.join(dir,name+'.png'),Buffer.from(png.split(',')[1],'base64'));};
 const timer=setTimeout(()=>app.exit(1),90000);
 try{
  await win.loadURL(url);
  const result=await run(async()=>{
   window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
   await new Promise(r=>setTimeout(r,200));__game.devStartRun('warrior');__game.ui.hideAll();__game.step(2);
   const w=__game.world(),config=JSON.parse(JSON.stringify(w.massRuntime.config)),Ctor=w.massRuntime.constructor;
   config.terrain.places=[];config.journey.destinations=config.journey.destinations.filter(d=>d.content==='cinderwatch');
   const row=config.content.find(c=>c.id==='cinderwatch');delete row.levels;delete row.magicPack;delete row.limits;
   row.level=8;row.count=4;row.table=[{id:'stone_sentinel',weight:1},{id:'sylvan_warden',weight:1}];
   const m=new Ctor(42,'birth-client',config);m.attach(w);
   w.player.pos=m.journey.local(m.journey.places[0]);m.update(w,true);
   const bodies=[...m.natives.values()].filter(a=>['stone_sentinel','sylvan_warden'].includes(a.defId));
   bodies[0].life*=.41;w.player.pos={...m.settlement.spawn};
   __game.save();
   return {count:bodies.length,invulnerable:w.player.invulnerable,
    bodies:bodies.map(a=>({id:a.defId,life:a.life,max:a.maxLife(),radius:a.radius,skills:a.skills.map(s=>s.def.id),
     boons:a.sheet.sourceNames().filter(s=>s.startsWith('boon:')).map(s=>[s,a.sheet.getSourceMods(s)])})),
    births:m.snapshot(w).enemies.map(e=>e.birth),fatal:__game.crash().fatal};
  });
  assert.equal(result.count,4);assert.equal(result.invulnerable,false);assert.equal(result.fatal,null);
  assert.ok(result.births.every(b=>b&&Number.isSafeInteger(b.seed)));
  await win.loadURL(url);
  const continued=await run(async()=>{
   window.requestAnimationFrame=()=>0;await new Promise(r=>setTimeout(r,250));document.querySelector('#sm-continue').click();
   const w=__game.world(),m=w.massRuntime;
   return {bodies:[...m.natives.values()].filter(a=>['stone_sentinel','sylvan_warden'].includes(a.defId))
    .map(a=>({id:a.defId,life:a.life,max:a.maxLife(),radius:a.radius,skills:a.skills.map(s=>s.def.id),
     boons:a.sheet.sourceNames().filter(s=>s.startsWith('boon:')).map(s=>[s,a.sheet.getSourceMods(s)])})),
    births:m.snapshot(w).enemies.map(e=>e.birth),fatal:__game.crash().fatal};
  });
  assert.equal(continued.fatal,null);assert.deepEqual(continued.bodies,result.bodies);assert.deepEqual(continued.births,result.births);
  fs.writeFileSync(path.join(dir,'birth-ui.json'),JSON.stringify({result,continued},null,2));
  console.log('PASS four native guardian kits, rolled boons and exact wounds survive browser Save/Continue');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
