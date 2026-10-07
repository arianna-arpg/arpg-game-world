// Controlled real-client native firing-lane regression, with a preserved previous-build control.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),legacy=process.env.HOLLOW_WAKE_QA_LEGACY==='1',label=legacy?'firing-lane-before':'firing-lane';
app.setPath('userData',path.join(dir,label+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/firing-lane-dist');
 const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');fs.createReadStream(f).pipe(res);
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async(fn,...args)=>{
  const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');
  if(!r.ok)throw Error(r.error);return r.value;
 };
 const timer=setTimeout(()=>app.exit(1),120000),rows=[];
 const shot=async name=>{
  const row=await run(()=>{
   const w=__game.world(),a=laneQA.actor;__game.renderer.render(w);
   return {pos:{...a.pos},casts:laneQA.casts.slice(),sight:w.lineOfSight(a.pos,w.player.pos,a.tier,w.player.tier),
    fire:w.lineOfFire(a.pos,w.player.pos,a.tier),fatal:__game.crash().fatal,png:document.getElementById('game').toDataURL()};
  });
  fs.writeFileSync(path.join(dir,label+'-'+name+'-canvas.png'),Buffer.from(row.png.split(',')[1],'base64'));delete row.png;
  await new Promise(r=>setTimeout(r,100));fs.writeFileSync(path.join(dir,label+'-'+name+'.png'),(await win.webContents.capturePage()).toPNG());
  assert.equal(row.fatal,null);rows.push({name,...row});return row;
 };
 try{
  await win.loadURL('http://127.0.0.1:'+server.address().port);
  await run(async()=>{
   window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});await new Promise(r=>setTimeout(r,200));
   __game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);
   const C=w.massRuntime.constructor,c=JSON.parse(JSON.stringify(w.massRuntime.config));
   delete c.settlement;delete c.journey;delete c.progression;delete c.ecology;
   delete c.terrain.patches;
   c.terrain.fields=[];c.terrain.places=[];c.content=[];c.populationRadius=0;c.startRadius=0;c.maxPopulation=0;
   c.terrain.surfaces=[{id:'floor',source:'qa/lane',priority:0,when:[],region:'ground',biome:'downs',color:'#454b32'}];
   const m=new C(42,'lane-client',c);m.attach(w);w.landPartyAt({x:-4016,y:-4016});m.update(w,true);w.actors=[w.player];w.player.invulnerable=true;
   m.state.paint({address:m.walk.at(-3910,-4016),region:'arena_stands',color:'#7a6a4c',cause:'qa/cover'});m.update(w,true);
   const a=w.createMonster('karst_slinger',4,'enemy');a.pos={x:-3816,y:-4016};a.facing=Math.PI;a.fillResources();a.alertUntil=99;w.actors.push(a);
   window.laneQA={actor:a,casts:[]};const use=w.useSkill.bind(w);
   w.useSkill=(...args)=>{const ok=use(...args);if(ok&&args[0]===a)laneQA.casts.push({id:args[1].def.id,clear:w.lineOfFire(a.pos,w.player.pos,a.tier)});return ok;};
  });
  const before=await shot('initial');assert.ok(before.sight&&!before.fire);assert.equal(before.casts.length,0);
  await run(()=>__game.step(60));await shot('turning');
  await run(()=>__game.step(420));const after=await shot('firing');
  const travel=Math.hypot(after.pos.x-before.pos.x,after.pos.y-before.pos.y);
  if(legacy){assert.equal(travel,0);assert.equal(after.casts.length,0);assert.equal(after.fire,false);}
  else{assert.ok(travel>20&&after.fire);assert.ok(after.casts.length&&after.casts.every(c=>c.clear));}
  fs.writeFileSync(path.join(dir,label+'-ui.json'),JSON.stringify({legacy,travel,rows},null,2));
  console.log(legacy?'PASS previous client reproduces eight seconds of visible target, blocked shot and stationary native shooter':
   'PASS actual native AI moves around shot-blocking cover and resumes legal attacks over eight seconds');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
