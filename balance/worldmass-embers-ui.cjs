// Controlled native-input regression, separate from independent gameplay review.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),tag='worldmass-embers';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 let root=path.resolve(__dirname,'reports','worldmass-embers-dist');
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
 const state=()=>{const w=__game.world(),m=w.massRuntime;return {seed:m.generator.run.seed,pos:w.player.pos,
  puzzles:m.puzzles?.snapshot(w)??[],contents:m.snapshot(w).contents,life:w.player.life,xp:w.meta.xp,origin:m.origin,config:m.configHash,tier:w.player.tier};};
 const save=async()=>{await run(async()=>{__game.save();await new Promise(r=>setTimeout(r,220));});return run(state);};
 const resume=async()=>{await win.loadURL(url);await boot();await run(async()=>{
  for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
  const b=document.querySelector('#sm-continue:not([disabled])');if(!b)throw Error('No native Continue');b.click();__game.ui.hideAll();
 });return run(state);};

 const settle=()=>{const w=__game.world();w.player.invulnerable=true;w.actors=w.actors.filter(a=>a===w.player||a.puzzleNode);};
 try{
  await win.loadURL(url);await boot();await run(()=>{__game.devStartRun('magician');__game.ui.hideAll();__game.world().startWorldMass(42);});
  const entry=await run(()=>{
   const w=__game.world(),m=w.massRuntime,p=m.journey.places.find(p=>p.content==='windworn-shrine'),q=m.journey.local(p);
   w.landPartyAt({x:q.x,y:q.y+160});m.update(w,true);w.player.invulnerable=true;
   w.actors=w.actors.filter(a=>a===w.player||a.puzzleNode);
   const before={...w.player.pos};
   try{__game.devInput(()=>({dx:0,dy:-1,aim:q,held:[],edge:[]}));__game.step(25);}finally{__game.devInput(null);}
   const r=w.puzzles.find(r=>r.spec.kind==='ember');if(!r)throw Error('No native coal ring');
   return {id:r.id,count:r.nodes.length,moved:Math.hypot(w.player.pos.x-before.x,w.player.pos.y-before.y),
    activity:m.siteActivity(p.id),cache:w.chests.some(c=>c.rewardSource===JSON.stringify([p.id,'cache'])),fatal:__game.crash().fatal};
  });
  assert.equal(entry.count,6);assert.equal(entry.cache,false);assert.ok(entry.moved>50);assert.equal(entry.fatal,null);await shot('arrival');
  const hit=await run(()=>{
   const w=__game.world(),r=w.puzzles.find(r=>r.spec.kind==='ember'),n=r.nodes[0];
   w.landPartyAt({...r.at});w.player.fillResources();
   let frames=0;
   try{
    __game.devInput(()=>({dx:0,dy:0,aim:n.pos,held:[true,false,false],edge:[]}));
    while(!r.state.litUntil.some(t=>t>w.time)&&frames++<240)__game.step(1);
    __game.devInput(()=>({dx:0,dy:0,aim:n.pos,held:[],edge:[]}));__game.step(10);
   }finally{__game.devInput(null);}
   return {frames,done:r.done,lit:r.state.litUntil.map(t=>Math.max(0,t-w.time)),fatal:__game.crash().fatal};
  });
  assert.ok(hit.frames<240);assert.equal(hit.done,false);assert.ok(hit.lit.some(t=>t>0));assert.equal(hit.fatal,null);await shot('partial');
  const partial=await save();assert.deepEqual(await resume(),partial);await run(settle);await shot('continued');
  await run(()=>{__game.step(480);});
  const expired=await run(()=>{const w=__game.world(),r=w.puzzles.find(r=>r.spec.kind==='ember');return {done:r.done,lit:r.state.litUntil,fatal:__game.crash().fatal};});
  assert.equal(expired.done,false);assert.ok(expired.lit.every(t=>t===0));assert.equal(expired.fatal,null);await shot('expired');
  win.setSize(800,600);await new Promise(r=>setTimeout(r,150));await run(()=>window.dispatchEvent(new Event('resize')));await shot('narrow');
  win.setSize(1280,850);await new Promise(r=>setTimeout(r,150));await run(()=>window.dispatchEvent(new Event('resize')));
  const solved=await run(()=>{
   const w=__game.world(),r=w.puzzles.find(r=>r.spec.kind==='ember');w.landPartyAt({...r.at});w.player.fillResources();
   let frames=0;
   try{
    __game.devInput(()=>({dx:0,dy:0,aim:{x:r.at.x+100,y:r.at.y},held:[false,true,false],edge:[]}));
    while(!r.done&&frames++<240)__game.step(1);
    __game.devInput(()=>({dx:0,dy:0,aim:r.at,held:[],edge:[]}));__game.step(4);
   }finally{__game.devInput(null);}
   return {frames,done:r.done,puzzles:w.massRuntime.puzzles.snapshot(w),fatal:__game.crash().fatal};
  });
  assert.ok(solved.frames<240);assert.equal(solved.done,true);assert.equal(solved.fatal,null);await shot('solved');
  const paid=await save();assert.deepEqual(await resume(),paid);await shot('solved-continued');
  const checkpoint=await run(()=>__game.world().massRuntime.snapshot(__game.world()));
  root=path.resolve(__dirname,'reports','cast-movement-dist');await win.loadURL(url);await boot();
  const refusal=await run(s=>{
   __game.devStartRun('magician');__game.ui.hideAll();const w=__game.world(),before=w.massRuntime;
   try{w.startWorldMass(s.state.run.seed,s);return {refused:false};}
   catch(e){return {refused:/Unsupported worldmass puzzle/.test(e.message),same:before===w.massRuntime};}
  },checkpoint);assert.deepEqual(refusal,{refused:true,same:true});
  await run(()=>{
   __game.devStartRun('magician');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);
   const m=w.massRuntime,p=m.journey.places.find(p=>p.content==='windworn-shrine');w.landPartyAt(m.journey.local(p));m.update(w,true);
  });
  await shot('prior-shrine');
  const old=await save();assert.equal(old.puzzles.length,0);
  root=current;assert.deepEqual(await resume(),old);await shot('legacy-continue');
  const legacy=await run(()=>{
   const w=__game.world(),m=w.massRuntime,p=m.journey.places.find(p=>p.content==='windworn-shrine');
   return {count:m.config.content.find(c=>c.id===p.content).count,cache:w.chests.some(c=>c.rewardSource===JSON.stringify([p.id,'cache'])),embers:w.puzzles.filter(r=>r.spec.kind==='ember').length};
  });
  assert.deepEqual(legacy,{count:2,cache:true,embers:0});
  results.push({entry,hit,partialContinue:true,expired,solved,solvedContinue:true,priorClientRefusedBeforeMutation:true,legacy});
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify({walking:entry.moved,fireboltFrames:hit.frames,novaFrames:solved.frames,partialContinue:true,expired:true,solvedContinue:true,priorClientRefusedBeforeMutation:true,legacy}));
  console.log('PASS native walking, single-target kindle/expiry, broad spell solve, exact partial/solved Continue, old-client refusal and legacy retention');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
