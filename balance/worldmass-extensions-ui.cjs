// Controlled route/collision and Continue check; isolated profile. Independent critic uses ordinary play.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');
app.setPath('userData',path.join(dir,'extension-profile-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/stoneward-dist');
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
 const timer=setTimeout(()=>app.exit(1),180000);
 try{
  await win.loadURL(url);
  const result=await run(async()=>{
   window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
   await new Promise(r=>setTimeout(r,200));__game.devStartRun('warrior');__game.ui.hideAll();__game.step(2);
   const w=__game.world();w.startWorldMass(42);w.player.invulnerable=true;
   const m=w.massRuntime,place=m.journey.places.find(p=>p.content==='stoneward');
   const trail=m.journey.trails.find(t=>t.id===place.id+'/approach');
   w.landPartyAt(trail.points[0]);__game.step(3);
   const hero=w.player,load=w.loadZone;let loads=0,frames=0;
   w.loadZone=function(...args){loads++;return load.apply(this,args);};
   for(const target of trail.points.slice(1)){
    __game.devInput(()=>({dx:target.x-w.player.pos.x,dy:target.y-w.player.pos.y,aim:target,held:[],edge:[]}));
    let spent=0;
    while(Math.hypot(target.x-w.player.pos.x,target.y-w.player.pos.y)>24&&spent++<900){__game.step(1);frames++;}
    if(spent>=900)throw Error('Physical extension stalled: '+JSON.stringify({target,pos:w.player.pos}));
   }
   __game.devInput(null);w.loadZone=load;
   const guard=w.actors.find(a=>a.defId==='stone_sentinel');
   const escort=w.actors.find(a=>a.defId==='karst_slinger');
   __game.step(2);
   window.extensionQA={id:place.id,position:{...w.player.pos}};
   return {frames,loads,sameHero:hero===w.player,site:m.localSite(w.player.pos),guard:guard&&{level:guard.level,
    skills:guard.skills.map(s=>s.def.id),life:guard.life,max:guard.maxLife()},
    escort:escort&&{level:escort.level,skills:escort.skills.map(s=>s.def.id),life:escort.life},
    field:w.altars.filter(a=>a.def.id==='wrath_altar').map(a=>({source:a.massSource,level:a.level})),
    pos:{...w.player.pos},seed:m.generator.run.seed,fatal:__game.crash().fatal};
  });
  assert.equal(result.fatal,null);assert.equal(result.loads,0);assert.ok(result.sameHero);assert.equal(result.guard.level,4);
  assert.equal(result.site.name,'The Stoneward');assert.equal(result.site.level,4);
  assert.equal(result.escort.level,4);assert.ok(result.escort.skills.includes('hurl_debris'));assert.ok(result.escort.life>0);
  assert.equal(result.field.length,1);assert.equal(result.field[0].level,4);await shot('stoneward-arrived');
  const saved=await run(()=>{const w=__game.world(),guard=w.actors.find(a=>a.defId==='stone_sentinel');
   guard.life=Math.min(guard.life,guard.maxLife()*.6);
   const escort=w.actors.find(a=>a.defId==='karst_slinger');escort.life=Math.min(escort.life,escort.maxLife()*.7);
   const home={...guard.aiAnchor};guard.pos={x:home.x+650,y:home.y};__game.ai(guard,w,1/60);
   if(guard.aiPhase!=='leash_home')throw Error('Native guardian did not begin its return');
   guard.pos={x:home.x+400,y:home.y};__game.save();
   return {life:guard.life,skills:guard.skills.map(s=>s.def.id),pos:{...w.player.pos},
    home,guardPos:{...guard.pos},phase:guard.aiPhase,
    escort:{life:escort.life,home:{...escort.aiAnchor},skills:escort.skills.map(s=>s.def.id)}};});
  await win.loadURL(url);
  const continued=await run(async()=>{
   window.requestAnimationFrame=()=>0;await new Promise(r=>setTimeout(r,250));document.querySelector('#sm-continue').click();
   const w=__game.world(),m=w.massRuntime,guard=w.actors.find(a=>a.defId==='stone_sentinel');
   w.player.invulnerable=true;const escort=w.actors.find(a=>a.defId==='karst_slinger');
   return {escort:{life:escort.life,home:{...escort.aiAnchor},skills:escort.skills.map(s=>s.def.id)},pos:{...w.player.pos},seed:m.generator.run.seed,site:m.localSite(w.player.pos),
    life:guard.life,skills:guard.skills.map(s=>s.def.id),field:w.altars.filter(a=>a.def.id==='wrath_altar').length,
    home:guard.aiAnchor,guardPos:{...guard.pos},phase:guard.aiPhase,
    fatal:__game.crash().fatal};
  });
  assert.deepEqual(continued.escort,saved.escort);
  assert.equal(continued.fatal,null);assert.equal(continued.life,saved.life);assert.deepEqual(continued.skills,saved.skills);
  assert.deepEqual(continued.pos,saved.pos);assert.equal(continued.seed,result.seed);assert.equal(continued.field,1);
  assert.deepEqual(continued.home,saved.home);assert.deepEqual(continued.guardPos,saved.guardPos);assert.equal(continued.phase,'leash_home');
  fs.writeFileSync(path.join(dir,'stoneward-ui.json'),JSON.stringify({result,saved,continued},null,2));
  console.log('PASS physical branch with native movement and active AI; no scene swap; fixed guardian and Wrath field survive Continue');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
