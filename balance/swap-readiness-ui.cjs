// Controlled native-hit/recovery presentation check, separate from earned play.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),legacy=process.env.HOLLOW_WAKE_QA_LEGACY==='1',tag=legacy?'swap-readiness-before':'swap-readiness';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 let root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/swap-readiness-dist');
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



 const timer=setTimeout(()=>app.exit(1),180000),results=[];
 const capture=async(name)=>{
  const data=await run(()=>{
   __game.ui.refreshInventory(true);
   const w=__game.world(),el=document.querySelector('[data-socket-readiness]')||document.querySelector('[data-socket-refusal]');
   const b=el?.getBoundingClientRect();
   return {text:el?.textContent??null,refusal:w.swapRefusal(w.localSeat,'socket'),
    time:w.time,since:w.time-w.lastCombatAt,rect:b&&{x:b.x,y:b.y,w:b.width,h:b.height},
    screen:{w:innerWidth,h:innerHeight},fatal:__game.crash().fatal};
  });
  assert.equal(data.fatal,null);
  if(data.rect)assert.ok(data.rect.x>=0&&data.rect.x+data.rect.w<=data.screen.w&&data.rect.y>=0&&data.rect.y+data.rect.h<=data.screen.h,JSON.stringify({name,...data}));
  await shot(name);results.push({name,...data});return data;
 };
 try{
  await win.loadURL(url);await boot();
  const started=await run(()=>{
   __game.devStartRun('magician');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);
   const p=w.player,m=w.massRuntime;w.landPartyAt(m.journey.local(m.journey.places.find(s=>s.content==='cinderwatch')));
   w.actors=[p];p.invulnerable=true;
   const foe=w.createMonster('dire_wolf',1,'enemy');foe.pos={x:p.pos.x+75,y:p.pos.y};w.actors.push(foe);
   const before=w.lastCombatAt;w.resolveHit(p,p.skills[0],foe);
   if(w.lastCombatAt!==w.time||before===w.time)throw Error('Native hit did not stamp combat');
   foe.dead=true;w.actors=[p];
   __game.ui.toggleBuildPanel(undefined,'show');__game.ui.refreshInventory();
   window.swapQA={time:w.time,element:document.querySelector('[data-socket-readiness]'),
    skill:document.querySelector('[data-drop="gemSock:firebolt"]')};
   return {time:w.time,stamp:w.lastCombatAt};
  });
  const hot=await capture('hot');assert.equal(hot.refusal,'the blood is still hot');
  if(!legacy)assert.match(hot.text,/5.0s of recovery/);else assert.ok(!hot.text.includes('recovery'));
  await run(()=>__game.step(90));
  const partial=await capture('partial');assert.ok(partial.time-started.time>1.49);
  if(!legacy){
   assert.match(partial.text,/3.5s of recovery/);
   assert.ok(await run(()=>swapQA.element===document.querySelector('[data-socket-readiness]')&&swapQA.skill===document.querySelector('[data-drop="gemSock:firebolt"]')));
  }
  if(!legacy){
   win.setSize(800,600);await new Promise(r=>setTimeout(r,150));await run(()=>{__game.step(2);__game.ui.folioSync();__game.ui.refreshInventory();document.querySelector('[data-socket-readiness]')?.scrollIntoView({block:'nearest',behavior:'instant'});});await capture('narrow');
  }
  await run(()=>__game.step(220));const ready=await capture('ready');
  assert.equal(ready.refusal,null);if(!legacy)assert.equal(ready.text,'Supports can be changed here.');
  if(!legacy){
   await run(()=>{const w=__game.world(),foe=w.createMonster('dire_wolf',1,'enemy');foe.pos={x:w.player.pos.x+100,y:w.player.pos.y};w.actors.push(foe);});
   const foes=await capture('foes');assert.equal(foes.refusal,'foes press too near');assert.ok(!foes.text.includes('recovery'));
  }
  if(!legacy){
   const passive=await run(()=>{
    __game.ui.hideAll();const w=__game.world();w.meta.passivePoints=1;__game.ui.toggleTree();
    const card=document.querySelector('[data-passive-choice="route_int_pursuit_weaver"]');
    if(!card)throw Error('Native passive card missing');
    card.scrollIntoView({block:'center',behavior:'instant'});
    const b=card.getBoundingClientRect();return {text:card.textContent,rect:{x:b.x,y:b.y,w:b.width,h:b.height},height:innerHeight};
   });
   assert.ok(passive.text.includes('3 different skills within 6s'));
   assert.ok(passive.rect.y>=0&&passive.rect.y+passive.rect.h<=passive.height);
   await shot('passive');results.push({name:'passive',text:passive.text});
  }
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results.map(r=>({name:r.name,text:r.text,time:r.time,since:r.since,fatal:r.fatal}))));
  console.log(legacy?'PASS previous client gives no recovery countdown':'PASS native hit, live countdown with Skills open, unchanged control identity, narrow bounds, actual expiry and distinct nearby-threat restriction');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
