// Controlled quiet court: prepared position and distant live foes in BOTH clients.
// Ordinary native spell solve, reward and fit; not an earned playthrough.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),tag='puzzle-calm';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 let root=path.join(dir,'puzzle-calm-dist');
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
 const current=root,timer=setTimeout(()=>app.exit(1),240000),results=[];
 const state=()=>{const w=__game.world(),m=w.massRuntime;return {seed:m.generator.run.seed,pos:w.player.pos,life:w.player.life,
  puzzles:m.puzzles.snapshot(w),rewards:m.rewards.snapshot(),contents:m.snapshot(w).contents};};
 const save=async()=>{await run(async()=>{__game.save();await new Promise(r=>setTimeout(r,250));});return run(state);};
 const resume=async()=>{await win.loadURL(url);await boot();await run(async()=>{
  for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
  const b=document.querySelector('#sm-continue:not([disabled])');if(!b)throw Error('No Continue');b.click();__game.ui.hideAll();
 });return run(state);};
 const strike=async i=>run(i=>{
  const w=__game.world(),r=w.puzzles.find(r=>r.spec.kind==='accord'),before=JSON.stringify(r.state),node=r.nodes[i];
  w.player.invulnerable=true;let frames=0;
  try{__game.devInput(()=>({dx:0,dy:0,aim:node.pos,held:[true,false,false],edge:[]}));
   while(JSON.stringify(r.state)===before&&frames++<300)__game.step(1);
  }finally{__game.devInput(null);}
  return {i,frames,bound:[...r.state.bound],pending:r.state.pending.map(p=>p?{half:p.half,left:p.until-w.time}:null),done:r.done,fatal:__game.crash().fatal};
 },i);
 try{
 for(const prior of [true,false]){
 root=path.join(dir,prior?'paired-stones-dist':'puzzle-calm-dist');await win.loadURL(url);await boot();
 await run(()=>{__game.devStartRun('magician');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);const m=w.massRuntime,p=m.journey.places.find(p=>p.content==='paired-stones');w.landPartyAt(m.journey.local(p));m.update(w,true);for(const a of w.actors)if(a.team==='enemy'&&!a.passive){a.pos={x:w.player.pos.x+5000+a.id*3,y:w.player.pos.y};a.aiAnchor={...a.pos};}});
 for(const i of [0,2,1,3]){const hit=await strike(i);assert.ok(hit.frames<300);assert.equal(hit.fatal,null);}
 const earned=await run(()=>{const w=__game.world();__game.ui.toggleBuildPanel(undefined,'show');__game.ui.refreshInventory();const b=document.querySelector('[data-reward-choice="splitting"]');if(!b)throw Error('No actual earned choice');b.click();__game.ui.refreshInventory();return {done:w.puzzles.find(r=>r.spec.kind==='accord').done,refusal:w.swapRefusal(w.localSeat,'socket'),remaining:w.swapReadiness(w.localSeat,'socket').remaining,uid:w.meta.items.find(i=>i.gem?.kind==='support'&&i.gem.supportId==='splitting')?.uid};});
 assert.ok(earned.done&&earned.uid);assert.equal(earned.refusal,prior?'the blood is still hot':null);await shot(prior?'prior-recovery':'immediate-choice');results.push({prior,...earned});
 if(!prior){win.setSize(800,600);await new Promise(r=>setTimeout(r,150));await run(()=>__game.ui.folioSync());await shot('narrow');
 const fitted=await run(uid=>{const w=__game.world(),at=w.time;w.requestMeta({t:'socket',uid,skillId:'firebolt'});__game.ui.refreshInventory();return {sameTime:at===w.time,fitted:w.meta.knownSkills.get('firebolt').sockets.some(s=>s?.def.id==='splitting'),refusal:w.swapRefusal(w.localSeat,'socket')};},earned.uid);assert.deepEqual(fitted,{sameTime:true,fitted:true,refusal:null});await shot('fitted');
 win.setSize(1280,850);await new Promise(r=>setTimeout(r,150));await run(()=>{__game.ui.hideAll();__game.ui.folioSync();});
 const kept=await run(()=>{const w=__game.world();return {pos:w.player.pos,life:w.player.life,items:w.meta.items,kit:w.meta.knownSkills.get('firebolt').sockets.map(s=>s?.def.id??null)};});
 const saved=await save();assert.deepEqual(await resume(),saved);assert.deepEqual(await run(()=>{const w=__game.world();return {pos:w.player.pos,life:w.player.life,items:w.meta.items,kit:w.meta.knownSkills.get('firebolt').sockets.map(s=>s?.def.id??null)};}),kept);await shot('continue');
 root=path.join(dir,'paired-stones-dist');assert.deepEqual(await resume(),saved);await shot('prior-continue');root=current;assert.deepEqual(await resume(),saved);await shot('returned');
 }
 }
 fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify(results,null,2));console.log('PASS same native solve and earned Splitting: actual prior recovery, immediate current field fitting without time advance, narrow UI and exact current/prior/current Continue');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
