// Controlled native sight survey, map presentation and actual prior-client compatibility.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),legacy=process.env.HOLLOW_WAKE_QA_LEGACY==='1',tag=legacy?'sighted-survey-before':'sighted-survey';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 let root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/sighted-survey-final-dist');
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
 const current=root,prior=path.resolve(__dirname,'reports','continental-start-dist');
 const state=()=>{const w=__game.world(),m=w.massRuntime;return {origin:m.origin,pos:w.player.pos,life:w.player.life,
  manifest:m.generator.run.manifest,configHash:m.snapshot(w).configHash,claims:m.state.snapshot().claims};};
 const save=async()=>{const before=await run(state);await run(async()=>{__game.ui.hideAll();__game.save();await new Promise(r=>setTimeout(r,250));});return before;};
 const resume=async expected=>{await win.loadURL(url);await boot();await run(async()=>{
  for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
  const b=document.querySelector('#sm-continue:not([disabled])');if(!b)throw Error('Continue unavailable');b.click();__game.ui.hideAll();
 });assert.deepEqual(await run(state),expected);};
 const start=async()=>{await win.loadURL(url);await boot();return run(()=>{
  __game.devStartRun('magician');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);w.player.invulnerable=true;
  const m=w.massRuntime,p=m.journey.places.find(p=>p.content==='cinderwatch');
  w.landPartyAt(m.journey.local(p));m.update(w,true);__game.step(1);
  return {survey:!!m.config.survey,fatal:__game.crash().fatal};
 });};
 const map=async name=>{await run(()=>__game.ui.toggleMap());await shot(name);await run(()=>__game.ui.hideAll());};
 const fixture=()=>{const w=__game.world(),M=w.massRuntime.constructor,c=JSON.parse(JSON.stringify(w.massRuntime.config));
  delete c.settlement;delete c.journey;delete c.ecology;delete c.progression;
  c.content=[];c.maxPopulation=0;c.terrain.places=[];
  delete c.terrain.patches;
  c.terrain.surfaces=[{id:'plain',source:'qa/plain',priority:0,when:[],region:'ground',color:'#445522',biome:'downs'}];
  const m=new M(42,'survey-browser',c);m.attach(w);w.player.invulnerable=true;
  for(let y=9420;y<=10620;y+=30)m.state.paint({address:m.walk.at(10200,y),region:'wall',color:'#777777',cause:'qa:survey-wall'});
  w.landPartyAt({x:10020,y:10020});m.update(w,true);__game.step(1);
  const known=(x)=>m.survey?m.survey.known(m.walk.at(x,10020)):m.state.claimed('explored',JSON.stringify([m.origin.dimension,m.walk.at(x,10020).cx,m.walk.at(x,10020).cy]));
  return {front:known(10020),behind:known(10380),far:known(10500),visible:w.lineOfSight(w.player.pos,{x:10380,y:10020},w.player.tier),fatal:__game.crash().fatal};
 };
 try{
  const currentStart=await start();assert.ok(currentStart.survey);assert.equal(currentStart.fatal,null);
  const before=await run(state);await map('camp');
  assert.deepEqual(await run(state),before,'opening the map cannot survey ground');
  await run(()=>__game.ui.toggleMap());
  await run(()=>document.querySelector('[data-mass-zoom="out"]').click());await shot('regional');
  await run(()=>__game.ui.hideAll());
  const wall=await run(fixture);assert.ok(wall.front&&!wall.behind&&!wall.far&&!wall.visible);assert.equal(wall.fatal,null);
  results.push({wall});await map('wall');
  const movement=await run(()=>{const w=__game.world(),m=w.massRuntime,start={...w.player.pos};
   try{__game.devInput(()=>({dx:-1,dy:0,aim:{x:start.x-300,y:start.y},held:[],edge:[]}));__game.step(60);}finally{__game.devInput(null);}
   return {distance:Math.hypot(w.player.pos.x-start.x,w.player.pos.y-start.y),behind:m.survey.known(m.walk.at(10380,10020)),fatal:__game.crash().fatal};
  });assert.ok(movement.distance>80&&!movement.behind);assert.equal(movement.fatal,null);results.push({movement});await map('walked');
  const checkpoint=await save();await resume(checkpoint);await map('continued');
  await run(()=>{const w=__game.world(),m=w.massRuntime;
   for(let y=9420;y<=10620;y+=30)m.state.paint({address:m.walk.at(10200,y),region:'ground',color:'#445522',cause:'qa:removed-wall'});
   w.landPartyAt({x:10020,y:10020});m.update(w,true);__game.step(1);
   if(!m.survey.known(m.walk.at(10380,10020)))throw Error('Removed wall did not reveal native terrain');
  });await map('opened');
  win.setSize(800,600);await new Promise(r=>setTimeout(r,150));await map('narrow');win.setSize(1280,850);await new Promise(r=>setTimeout(r,150));
  root=prior;const oldStart=await start();assert.ok(!oldStart.survey);
  const oldWall=await run(fixture);assert.ok(oldWall.front&&oldWall.behind&&!oldWall.visible);await map('prior-wall');
  const oldSaved=await save();root=current;await resume(oldSaved);await map('old-in-current');
  results.push({oldWall,legacyContinue:true});
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
  console.log('PASS native map/zoom, exact current and legacy Continue, native wall concealment/removal, ordinary walking, read-only map and narrow view');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
