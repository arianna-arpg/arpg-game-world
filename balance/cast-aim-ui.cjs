// Prepared native windup comparison; independent playtests judge earned gameplay.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),tag='cast-aim-v2';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 let root=path.join(dir,'hud-contrast-dist');
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
  const r=await run(()=>{
   const w=__game.world(),p=w.player,renderer=__game.renderer,ctx=renderer.ctx,texts=[],fill=ctx.fillText;
   const state=()=>JSON.stringify([w.time,p.pos,p.life,p.mana,p.casting&&{elapsed:p.casting.elapsed,aim:p.casting.aim,total:p.casting.total}]);
   const before=state();ctx.fillText=function(t,...args){texts.push(t);return fill.call(this,t,...args);};
   try{renderer.render(w);}finally{ctx.fillText=fill;}
   return {same:before===state(),texts,fatal:__game.crash().fatal,png:renderer.canvas.toDataURL()};
  });assert.ok(r.same);assert.equal(r.fatal,null);
  fs.writeFileSync(path.join(dir,tag+'-'+name+'-canvas.png'),Buffer.from(r.png.split(',')[1],'base64'));delete r.png;
  win.webContents.invalidate();await new Promise(r=>setTimeout(r,100));fs.writeFileSync(path.join(dir,tag+'-'+name+'.png'),(await win.webContents.capturePage()).toPNG());
  return r;
 };
 const boot=async()=>{await win.loadURL(url);await run(async()=>{
  window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});await new Promise(r=>setTimeout(r,200));
 });};
 const prepare=async()=>run(()=>{
  __game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);
  const m=w.massRuntime,place=m.journey.places.find(p=>p.content==='cinderwatch'),q=m.journey.local(place),p=w.player;
  w.landPartyAt(q);m.update(w,true);w.landPartyAt(w.findFreeSpot({x:q.x+120,y:q.y+520},p.radius));m.update(w,true);
  for(const a of w.actors)if(a.team==='enemy'&&!a.passive){a.dead=true;a.life=0;}
  p.fillResources();__game.step(2);p.fillResources();
  const origin={...p.pos},aim={x:p.pos.x+200,y:p.pos.y};
  if(!w.useSkill(p,p.skills[0],aim,true))throw Error('Cleave refused');
  window.castAimQA={origin,aim,cast:p.casting};
  __game.devInput(()=>({dx:1,dy:0,aim,held:[true],edge:[]}));__game.step(6);
  const redirect={x:p.pos.x,y:p.pos.y-200};castAimQA.redirect=redirect;
  try{__game.devInput(()=>({dx:1,dy:0,aim:redirect,held:[],edge:[]}));__game.step(18);}finally{__game.devInput(null);}
  const cs=p.casting;
  return {same:cs===castAimQA.cast,moved:Math.hypot(p.pos.x-origin.x,p.pos.y-origin.y),aim:cs?.aim,pressed:aim,redirect,
   total:cs?.total,elapsed:cs?.elapsed,locked:w.movementLocked(p),description:p.skills[0].def.description};
 });
 const state=()=>{const w=__game.world(),p=w.player;return {seed:w.massRuntime.generator.run.seed,pos:p.pos,life:p.life,mana:p.mana,
  items:w.meta.items,skills:p.skills.map(i=>i&&{id:i.def.id,level:i.level,sockets:i.sockets})};};
 const resume=async()=>{await boot();await run(async()=>{
  for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
  const b=document.querySelector('#sm-continue:not([disabled])');if(!b)throw Error('No Continue');b.click();__game.ui.hideAll();
 });return run(state);};
 const timer=setTimeout(()=>app.exit(1),180000),results={};
 try{
  await boot();results.prior=await prepare();assert.ok(results.prior.same&&results.prior.locked);assert.equal(results.prior.moved,0);
  assert.deepEqual(results.prior.aim,results.prior.pressed);
  assert.ok((await shot('prior-locked')).texts.includes('Feet planted'));
  root=path.join(dir,'cast-aim-dist');await boot();results.current=await prepare();
  assert.ok(results.current.same&&!results.current.locked&&results.current.moved>10);
  assert.deepEqual(results.current.aim,results.current.redirect);
  assert.equal(results.current.total,results.prior.total);assert.ok(Math.abs(results.current.elapsed-results.prior.elapsed)<1e-9);
  assert.ok(!(await shot('current-turning')).texts.includes('Feet planted'));
  win.setSize(800,600);await new Promise(r=>setTimeout(r,150));await run(()=>__game.ui.folioSync());await shot('narrow');
  win.setSize(1280,850);await new Promise(r=>setTimeout(r,150));
  results.release=await run(()=>{
   const w=__game.world(),p=w.player,cs=p.casting;let frames=0;
   try{
    __game.devInput(()=>({dx:0,dy:0,aim:castAimQA.redirect,held:[],edge:[]}));
    while(p.casting&&frames++<120)__game.step(1);
   }finally{__game.devInput(null);}
   if(cs.aim.x!==castAimQA.redirect.x||cs.aim.y!==castAimQA.redirect.y)throw Error('Completion changed supplied aim');
   return {frames,finished:!p.casting,stamp:p.bodyAction?.at,elapsed:cs.elapsed,total:cs.total,fatal:__game.crash().fatal};
  });assert.ok(results.release.finished&&results.release.elapsed>=results.release.total);assert.equal(results.release.fatal,null);
  await shot('completed');
  await run(async()=>{__game.world().massRuntime.update(__game.world(),true);__game.save();await new Promise(r=>setTimeout(r,250));});
  const saved=await run(state);assert.deepEqual(await resume(),saved);await shot('continued');
  root=path.join(dir,'hud-contrast-dist');assert.deepEqual(await resume(),saved);await shot('prior-continued');
  root=path.join(dir,'cast-aim-dist');assert.deepEqual(await resume(),saved);await shot('current-again');
  results.continuation={checked:['seed','position','life','mana','items','skill ids/levels/sockets'],current:true,prior:true,returned:true};
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify(results,null,2));
  console.log('PASS prior locked/stamped windup, current slow step and live aim, unchanged native clock/commitment, pure narrow painting and checked current/prior/current Continue');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
