// Controlled new-run origin selection, ordinary movement and real-client compatibility.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),legacy=process.env.HOLLOW_WAKE_QA_LEGACY==='1',tag=legacy?'continental-start-before':'continental-start';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 let root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/continental-start-dist');
 const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');fs.createReadStream(f).pipe(res);
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port,win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async(fn,...args)=>{
  const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');
  if(!r.ok)throw Error(r.error);return r.value;
 };
 const shot=async name=>{
  await run(()=>__game.renderer.render(__game.world()));
  const png=await run(()=>document.getElementById('game').toDataURL());fs.writeFileSync(path.join(dir,tag+'-'+name+'-canvas.png'),Buffer.from(png.split(',')[1],'base64'));
  win.webContents.invalidate();await new Promise(r=>setTimeout(r,100));fs.writeFileSync(path.join(dir,tag+'-'+name+'.png'),(await win.webContents.capturePage()).toPNG());
 };
 const boot=async()=>run(async()=>{
  window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});await new Promise(r=>setTimeout(r,200));
 });




 const timer=setTimeout(()=>app.exit(1),210000),results=[];
 const current=root,prior=path.resolve(__dirname,'reports','garrison-names-dist');
 const state=()=>{const w=__game.world(),m=w.massRuntime;return {seed:m.generator.run.seed,origin:m.origin,
  pos:w.player.pos,tier:w.player.tier,life:w.player.life,manifest:m.generator.run.manifest,configHash:m.snapshot(w).configHash,
  places:m.journey.places.map(p=>[p.id,p.center]),claims:m.state.snapshot().claims};};
 const save=async()=>{const before=await run(state);await run(async()=>{__game.ui.hideAll();__game.save();await new Promise(r=>setTimeout(r,250));});return before;};
 const resume=async expected=>{await win.loadURL(url);await boot();await run(async()=>{
  for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
  const b=document.querySelector('#sm-continue:not([disabled])');if(!b)throw Error('Continue unavailable');b.click();__game.ui.hideAll();__game.renderer.render(__game.world());
 });assert.ok(JSON.stringify(await run(state))===JSON.stringify(expected),'native Continue keeps the exact origin, hero, manifest, descriptor, routes and claims');};
 const start=async()=>{await win.loadURL(url);await boot();return run(()=>{
  __game.devStartRun('magician');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);w.player.invulnerable=true;
  const m=w.massRuntime,p=m.journey.places.find(p=>p.content==='cinderwatch'),q=m.journey.local(p);
  w.landPartyAt(q);m.update(w,true);__game.step(1);
  let land=0,total=0;for(let y=-2500;y<=4000;y+=500)for(let x=-2000;x<=4500;x+=500){
   land+=+(m.generator.fieldsAt(m.walk.at(x,y)).elevation>=-.16);total++;
  }
  return {origin:m.origin,land,total,fraction:land/total,selected:!!m.config.settlement.location,fatal:__game.crash().fatal};
 });};
 try{
  const selected=await start();assert.ok(selected.selected&&selected.fraction>=.85);assert.notEqual(JSON.stringify(selected.origin),JSON.stringify({dimension:'surface',cx:'0',cy:'0'}));assert.equal(selected.fatal,null);
  await shot('camp');results.push({selected});
  const walked=await run(()=>{
   const w=__game.world(),m=w.massRuntime,p=w.player,q={...p.pos};let start;
   search:for(let y=q.y-700;y<=q.y+700;y+=70)for(let x=q.x-700;x<=q.x+700;x+=70){
    if(m.settlement.reserves(x,y,20)||m.journey.reserves({x,y},20)||m.localSite({x,y}))continue;
    let clear=true;for(let d=0;d<=300;d+=20){const at={x:x+d,y};
     if(!m.walk.isWalkable(at.x,at.y)||w.pointInSolid(at.x,at.y,p.radius)||m.generator.fieldsAt(m.walk.at(at.x,at.y)).elevation<-.16){clear=false;break;}}
    if(clear){start={x,y};break search;}
   }
   if(!start)throw Error('No ordinary dry country lane in sample');
   w.landPartyAt(start);m.update(w,true);
   try{__game.devInput(()=>({dx:1,dy:0,aim:{x:start.x+300,y:start.y},held:[],edge:[]}));__game.step(60);}finally{__game.devInput(null);}
   return {start,end:{...p.pos},distance:Math.hypot(p.pos.x-start.x,p.pos.y-start.y),region:m.walk.regionAt(p.pos.x,p.pos.y),fatal:__game.crash().fatal};
  });
  assert.ok(walked.distance>80);assert.equal(walked.fatal,null);results.push({walked});await shot('offroad');
  await run(()=>__game.ui.toggleMap());await shot('map');await run(()=>__game.ui.hideAll());
  const saved=await save();await resume(saved);await shot('continued');
  root=prior;await resume(saved);await shot('selected-in-prior');results.push({newOriginReadByPrior:true});
  const old=await start();assert.ok(!old.selected&&old.fraction<.2);assert.equal(old.origin.cx,'0');assert.equal(old.origin.cy,'0');await shot('old-camp');
  const oldSave=await save();root=current;await resume(oldSave);await shot('old-in-current');results.push({old,oldOriginRetained:true});
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
  console.log('PASS existing continental terrain chosen without repainting, native off-road movement, current Continue, prior-client chosen-origin Continue and exact legacy-zero-origin Continue');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
