// Native Sylvan Warden guard in the actual renderer. Controlled mechanical QA.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');app.setPath('userData',path.join(dir,'raised-guard-world-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/raised-guard-dist');
 const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');fs.createReadStream(f).pipe(res);
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async(fn,...args)=>{const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');if(!r.ok)throw Error(r.error);return r.value;};
 const timeout=setTimeout(()=>app.exit(1),120000);
 const capture=async name=>{
  const state=await run(()=>{
   const w=__game.world(),a=raisedWorldQA.warden,r=__game.renderer;
   const snapshot=()=>JSON.stringify([w.player.pos,w.player.life,w.player.mana,a.pos,a.life,a.mana,a.facing,a.casting,a.cooldowns,w.time]);
   const before=snapshot();r.render(w);return {preserved:before===snapshot(),guard:a.casting?.mode??null,shield:a.casting?.shield??null,
    life:a.life,fatal:__game.crash().fatal,png:document.getElementById('game').toDataURL('image/png')};
  });
  fs.writeFileSync(path.join(dir,'raised-guard-world-'+name+'.png'),Buffer.from(state.png.split(',')[1],'base64'));delete state.png;
  assert.ok(state.preserved);assert.equal(state.fatal,null);return state;
 };
 try{
  await win.loadURL('http://127.0.0.1:'+server.address().port);
  await run(async()=>{
   window.requestAnimationFrame=()=>0;await new Promise(r=>setTimeout(r,200));Object.defineProperty(navigator,'getGamepads',{value:()=>[]});__game.devStartRun('magician');__game.ui.hideAll();
   const w=__game.world();w.startWorldMass(42);const m=w.massRuntime,place=m.journey.places.find(p=>p.content==='cinderwatch');
   w.landPartyAt(m.journey.local(place));const p=w.player;
   w.actors=[p];w.projectiles=[];w.texts=[];w.zones=[];
   const a=w.createMonster('sylvan_warden',1,'enemy');a.pos={x:p.pos.x+130,y:p.pos.y-60};a.facing=a.facingPrev=Math.PI;a.aiCooldown=999;w.actors.push(a);
   for(let i=0;i<70;i++){w.time+=1/60;__game.renderer.render(w);}
   const guard=a.skills.find(s=>s?.def.id==='shield_up');if(!w.useSkill(a,guard,p.pos,true))throw Error('Native guard refused');
   window.raisedWorldQA={warden:a,initial:a.casting.shield};
  });
  const intact=await capture('intact');
  const front=await run(()=>{
   const w=__game.world(),a=raisedWorldQA.warden;const before=a.casting.shield,life=a.life;
   const blocked=w.tryGuardBlock(a,w.player,{x:a.pos.x-100,y:a.pos.y},before*.6);
   return {blocked,before,after:a.casting.shield,facing:a.facing,aim:a.casting.aim,lifeBefore:life,lifeAfter:a.life,impact:w.flashes.at(-1)?.defenseCue};
  });
  console.log(JSON.stringify(front));
  assert.ok(front.blocked);assert.ok(Math.abs(front.after-front.before*.4)<1e-6);assert.equal(front.lifeAfter,front.lifeBefore);
  assert.equal(front.impact.kind,'guard');assert.equal(front.impact.event,'impact');
  // Remove the transient hit fragment in this fixture to isolate the persistent worn face.
  await run(()=>{const w=__game.world();w.flashes=[];});
  const worn=await capture('worn');
  const rear=await run(()=>{
   const w=__game.world(),a=raisedWorldQA.warden,before=a.casting.shield;
   const blocked=w.tryGuardBlock(a,w.player,{x:a.pos.x+100,y:a.pos.y},10);
   return {blocked,before,after:a.casting.shield};
  });
  assert.equal(rear.blocked,false);assert.equal(rear.before,rear.after);
  const broken=await run(()=>{
   const w=__game.world(),a=raisedWorldQA.warden,guard=a.casting.inst;
   w.tryGuardBlock(a,w.player,{x:a.pos.x-100,y:a.pos.y},a.casting.shield+1);
   return {guard:a.casting?.mode??null,cooldown:a.cooldowns.get(guard.def.id),event:w.flashes.at(-1)?.defenseCue};
  });
  assert.equal(broken.guard,null);assert.ok(broken.cooldown>0);assert.equal(broken.event.event,'break');
  await run(()=>{__game.world().flashes=[];});const absent=await capture('broken');
  fs.writeFileSync(path.join(dir,'raised-guard-world-ui.json'),JSON.stringify({intact,front,worn,rear,broken,absent},null,2));
  console.log('PASS native Warden raise, frontal absorption, real pool wear, exposed rear, break/cooldown and render-only state preservation');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timeout);win.destroy();server.close();app.exit(process.exitCode||0);}
});
