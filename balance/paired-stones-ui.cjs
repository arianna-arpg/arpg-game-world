// Controlled prepared court; ordinary native skill input, not an earned playthrough.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),tag='paired-stones';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 let root=path.join(dir,'paired-stones-dist');
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
  await win.loadURL(url);await boot();await run(()=>{
   __game.devStartRun('magician');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);
   const m=w.massRuntime,p=m.journey.places.find(p=>p.content==='paired-stones'),q=m.journey.local(p);
   w.landPartyAt({x:q.x,y:q.y+280});m.update(w,true);w.player.invulnerable=true;
   try{__game.devInput(()=>({dx:0,dy:-1,aim:q,held:[],edge:[]}));__game.step(35);}finally{__game.devInput(null);}
  });
  const entry=await run(()=>{const w=__game.world(),r=w.puzzles.find(r=>r.spec.kind==='accord');return {count:r.nodes.length,bound:r.state.bound,at:r.at};});
  assert.equal(entry.count,4);assert.deepEqual(entry.bound,[false,false]);await shot('arrival');
  // Prepared central casting position, ordinary native Firebolts thereafter.
  await run(()=>{const w=__game.world();w.landPartyAt(w.puzzles.find(r=>r.spec.kind==='accord').at);});
  const first=await strike(0);assert.ok(first.frames<300);assert.equal(first.pending[0].half,0);assert.equal(first.fatal,null);await shot('first-half');
  const saved=await save();assert.deepEqual(await resume(),saved);await shot('partial-continue');
  const pair=await strike(2);assert.ok(pair.bound[0]);assert.equal(pair.done,false);await shot('bound-pair');
  const next=await strike(1);assert.equal(next.pending[1].half,1);
  await run(()=>__game.step(210));const expired=await run(()=>{const r=__game.world().puzzles.find(r=>r.spec.kind==='accord');return {bound:r.state.bound,pending:r.state.pending};});
  assert.deepEqual(expired,{bound:[true,false],pending:[null,null]});await shot('expired');
  const a=await strike(1);assert.equal(a.pending[1].half,1);const b=await strike(3);assert.equal(b.done,true);await shot('solved');
  const won=await run(()=>{const w=__game.world();return {reward:!!w.massRuntime.snapshot(w).rewards?.some(r=>!r.claimed),done:w.puzzles.find(r=>r.spec.kind==='accord').done};});
  assert.deepEqual(won,{reward:false,done:true});win.setSize(800,600);await new Promise(r=>setTimeout(r,150));await run(()=>__game.ui.folioSync());await shot('narrow');
  win.setSize(1280,850);await new Promise(r=>setTimeout(r,150));await run(()=>__game.ui.folioSync());
  const paid=await save();assert.deepEqual(await resume(),paid);await shot('solved-continue');
  const checkpoint=await run(()=>__game.world().massRuntime.snapshot(__game.world()));
  root=path.join(dir,'memory-purpose-dist');await win.loadURL(url);await boot();
  const refused=await run(s=>{
   __game.devStartRun('magician');__game.ui.hideAll();const w=__game.world(),before=w.massRuntime;
   try{w.startWorldMass(s.state.run.seed,s);return {refused:false};}
   catch(e){return {refused:true,error:e.message,same:before===w.massRuntime};}
  },checkpoint);
  assert.ok(refused.refused&&refused.same);assert.match(refused.error,/Unsupported worldmass puzzle|puzzle count/);
  await run(()=>{__game.devStartRun('magician');__game.ui.hideAll();__game.world().startWorldMass(42);});
  const legacy=await save();root=current;assert.deepEqual(await resume(),legacy);
  assert.equal(await run(()=>__game.world().massRuntime.journey.places.some(p=>p.content==='paired-stones')),false);await shot('legacy-continue');
  results.push({entry,first,pair,next,expired,a,b,won,refused,currentContinue:true,legacyPreserved:true});
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify(results,null,2));
  console.log('PASS ordinary Firebolt pair binding, pending-clock Continue, expiry retaining bound pairs, native solved reward, narrow view, solved Continue, actual prior refusal and unchanged legacy map');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
