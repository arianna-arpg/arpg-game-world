// Controlled native-input regression, separate from independent gameplay review.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),tag='puzzle-rewards';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 let root=path.resolve(__dirname,'reports','puzzle-rewards-dist');
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
  puzzles:m.puzzles?.snapshot(w)??[],contents:m.snapshot(w).contents,rewards:m.rewards.snapshot(),sockets:w.meta.knownSkills.get('firebolt').sockets.map(s=>s?{id:s.def.id,level:s.level}:null),life:w.player.life,xp:w.meta.xp};};
 const save=async()=>{await run(async()=>{__game.save();await new Promise(r=>setTimeout(r,220));});return run(state);};
 const resume=async()=>{await win.loadURL(url);await boot();await run(async()=>{
  for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
  const b=document.querySelector('#sm-continue:not([disabled])');if(!b)throw Error('No native Continue');b.click();__game.ui.hideAll();
 });return run(state);};
 const strike=async i=>run(i=>{
  const w=__game.world(),r=w.puzzles.find(r=>r.spec.kind==='lattice'),n=r.nodes[i],before=JSON.stringify(r.state.lit);
  // Choose a clear firing position within the fixture court; native input owns
  // casting, mana, projectile delivery, collision and the puzzle's knock queue.
  w.landPartyAt({x:n.pos.x+30,y:n.pos.y+30});w.player.invulnerable=true;
  let frames=0;
  try{
   __game.devInput(()=>({dx:0,dy:0,aim:n.pos,held:[true,false,false],edge:[]}));
   while(JSON.stringify(r.state.lit)===before&&frames++<360)__game.step(1);
   __game.devInput(()=>({dx:0,dy:0,aim:n.pos,held:[],edge:[]}));
   __game.step(90); // settle the native cast/projectile and hum before checkpoint
  }finally{__game.devInput(null);}
  return {i,frames,before:JSON.parse(before),after:[...r.state.lit],done:r.done,life:n.life,mana:w.player.mana,fatal:__game.crash().fatal};
 },i);
 try{
  await win.loadURL(url);await boot();await run(()=>{__game.devStartRun('magician');__game.ui.hideAll();__game.world().startWorldMass(42);});
  const entry=await run(()=>{
   const w=__game.world(),m=w.massRuntime,p=m.journey.places.find(p=>p.content==='memorial-grove'),q=m.journey.local(p);
   w.landPartyAt({x:q.x,y:q.y+290});m.update(w,true);w.player.invulnerable=true;
   try{__game.devInput(()=>({dx:0,dy:-1,aim:q,held:[],edge:[]}));__game.step(35);}finally{__game.devInput(null);}
   const r=w.puzzles.find(r=>r.spec.kind==='lattice');if(!r)throw Error('No admitted native lattice');
   return {id:r.id,lit:r.state.lit,positions:r.nodes.map(n=>n.pos),activity:m.siteActivity(p.id),cache:w.chests.some(c=>c.rewardSource===JSON.stringify([p.id,'cache'])),fatal:__game.crash().fatal};
  });
  assert.equal(entry.cache,false);assert.equal(entry.fatal,null);assert.equal(entry.positions.length,9);await shot('arrival');
  const hit=await strike(0);assert.ok(hit.frames<360);assert.notDeepEqual(hit.after,hit.before);assert.equal(hit.fatal,null);
  assert.equal(hit.done,false);await shot('partial');
  const saved=await save();assert.deepEqual(await resume(),saved);results.push({entry,hit,partialContinue:true});
  win.setSize(800,600);await new Promise(r=>setTimeout(r,150));await run(()=>{window.dispatchEvent(new Event('resize'));});await shot('narrow');win.setSize(1280,850);await new Promise(r=>setTimeout(r,150));
  await run(()=>{window.dispatchEvent(new Event('resize'));});
  const solution=await run(()=>{
   const w=__game.world(),r=w.puzzles.find(r=>r.spec.kind==='lattice');
   for(let mask=0;mask<512;mask++){
    const trial=[...r.state.lit];
    for(let i=0;i<9;i++)if(mask&(1<<i)){
     const x=i%3,y=Math.floor(i/3);
     for(const [dx,dy] of [[0,0],[-1,0],[1,0],[0,-1],[0,1]]){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<3&&yy>=0&&yy<3)trial[yy*3+xx]=!trial[yy*3+xx];}
    }
    if(trial.every(Boolean))return Array.from({length:9},(_,i)=>i).filter(i=>mask&(1<<i));
   }throw Error('No legal lattice solution');
  });
  const moves=[];for(const i of solution){const h=await strike(i);assert.ok(h.frames<360);assert.equal(h.fatal,null);moves.push(h);}
  const solved=await run(()=>{
   const w=__game.world(),m=w.massRuntime,r=w.puzzles.find(r=>r.spec.kind==='lattice');
   w.landPartyAt({x:r.at.x,y:r.at.y+160});__game.renderer.render(w);
   return {done:r.done,lit:r.state.lit,activity:m.localSite(w.player.pos).activity,puzzles:m.puzzles.snapshot(w),fatal:__game.crash().fatal};
  });
  assert.equal(solved.done,true);assert.equal(solved.activity.complete,true);assert.equal(solved.fatal,null);await shot('solved');
  
  const pending=await save();assert.equal(pending.rewards.length,1);assert.deepEqual(await resume(),pending);
  const offer=async()=>run(()=>{
   __game.ui.toggleBuildPanel(undefined,'show');__game.ui.refreshInventory();
   const e=document.querySelector('[data-exploration-offer]');if(!e)throw Error('No native reward card');
   e.scrollIntoView({block:'start',behavior:'instant'});const b=e.getBoundingClientRect();
   return {text:e.textContent,inside:b.x>=0&&b.x+b.width<=innerWidth,
     choices:[...e.querySelectorAll('[data-reward-choice]')].map(b=>b.dataset.rewardChoice)};
  });
  const offered=await offer();assert.ok(offered.inside);assert.ok(offered.choices.includes('splitting'));assert.ok(!offered.text.includes("cache's"));await shot('earned-choice');
  win.setSize(800,600);await new Promise(r=>setTimeout(r,150));await run(()=>{__game.ui.folioSync();});
  assert.ok((await offer()).inside);await shot('choice-narrow');
  win.setSize(1280,850);await new Promise(r=>setTimeout(r,150));await run(()=>{__game.ui.folioSync();});
  await offer();await run(()=>{
   const button=document.querySelector('[data-reward-choice="splitting"]');button.click();
   const w=__game.world(),gem=w.meta.items.find(i=>i.gem?.kind==='support'&&i.gem.supportId==='splitting');
   if(!gem)throw Error('Native claim did not deliver gem');
   __game.ui.hideAll();
   // A wandering foe may reach the court during setup. Fit in the native
   // sanctuary rather than bypassing the ordinary field-discipline gate.
   w.landPartyAt(w.massRuntime.settlement.spawn);w.massRuntime.update(w,true);let recovery=0;
   while(w.swapRefusal(w.localSeat,'socket')&&recovery++<30)__game.step(30);
   if(w.swapRefusal(w.localSeat,'socket'))throw Error('Native field recovery refused: '+w.swapRefusal(w.localSeat,'socket'));
   w.requestMeta({t:'socket',uid:gem.uid,skillId:'firebolt'});__game.ui.refreshInventory();
   if(!w.meta.knownSkills.get('firebolt').sockets.some(s=>s?.def.id==='splitting'))throw Error('Native fitting refused');
   __game.ui.hideAll();
  });
  const split=await run(()=>{
   const w=__game.world(),r=w.puzzles.find(r=>r.spec.kind==='lattice');
   w.landPartyAt({x:r.at.x,y:r.at.y+270});let shots=[],frames=0;
   try{__game.devInput(()=>({dx:0,dy:0,aim:{x:w.player.pos.x+800,y:w.player.pos.y+90},held:[true,false,false],edge:[]}));
    while(!shots.length&&frames++<240){__game.step(1);shots=w.projectiles.filter(p=>p.caster===w.player&&p.inst.def.id==='firebolt');}
   }finally{__game.devInput(null);}
   return {frames,shots:shots.map(p=>({dir:p.dir,pos:p.pos})),fatal:__game.crash().fatal};
  });
  assert.equal(split.shots.length,2);assert.notDeepEqual(split.shots[0].dir,split.shots[1].dir);assert.equal(split.fatal,null);await shot('split-cast');await run(()=>__game.step(10));await shot('split-flight');
  await run(()=>__game.step(150));const paid=await save();assert.deepEqual(await resume(),paid);await shot('fitted-continue');
  results.push({offered,split,pendingContinue:true,fittedContinue:true});

  results.push({moves,solved,solvedContinue:true});
  const checkpoint=await run(()=>__game.world().massRuntime.snapshot(__game.world()));assert.equal(checkpoint.schema,7);
  root=path.resolve(__dirname,'reports','broad-doorways-dist');await win.loadURL(url);await boot();
  const refusal=await run(s=>{
   __game.devStartRun('magician');__game.ui.hideAll();const w=__game.world(),before=w.massRuntime;
   try{w.startWorldMass(s.state.run.seed,s);return {refused:false};}
   catch(e){return {refused:/Invalid worldmass (checkpoint|population)/.test(e.message),same:before===w.massRuntime};}
  },checkpoint);assert.deepEqual(refusal,{refused:true,same:true});
  await run(()=>{
   __game.devStartRun('magician');__game.ui.hideAll();const w=__game.world();w.startWorldMass(81);
   const m=w.massRuntime,p=m.journey.places.find(p=>p.content==='memorial-grove');w.landPartyAt(m.journey.local(p));m.update(w,true);
  });

  const old=await save();assert.ok(old.puzzles.length);assert.equal(old.rewards.length,0);
  root=current;assert.deepEqual(await resume(),old);await shot('legacy-continue');
  const oldSolution=await run(()=>{
   const r=__game.world().puzzles.find(r=>r.spec.kind==='lattice');
   for(let mask=0;mask<512;mask++){
    const trial=[...r.state.lit];for(let i=0;i<9;i++)if(mask&(1<<i)){
     const x=i%3,y=Math.floor(i/3);for(const [dx,dy] of [[0,0],[-1,0],[1,0],[0,-1],[0,1]]){
      const xx=x+dx,yy=y+dy;if(xx>=0&&xx<3&&yy>=0&&yy<3)trial[yy*3+xx]=!trial[yy*3+xx];
     }
    }if(trial.every(Boolean))return Array.from({length:9},(_,i)=>i).filter(i=>mask&(1<<i));
   }throw Error('No legacy solution');
  });
  for(const i of oldSolution)await strike(i);
  const legacy=await run(()=>{const w=__game.world();return {done:w.puzzles.find(r=>r.spec.kind==='lattice').done,rewards:w.massRuntime.rewards.snapshot().length,schema:w.massRuntime.snapshot(w).schema};});
  assert.deepEqual(legacy,{done:true,rewards:0,schema:6});await shot('legacy-solved');
  results.push({olderClientRefusedBeforeMutation:true,legacy});
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify({nativeHitFrames:hit.frames,nativeWinningMoves:moves.map(m=>({i:m.i,frames:m.frames})),partialContinue:true,solvedContinue:true,olderClientRefusedBeforeMutation:true,legacy}));
  console.log('PASS native Firebolt solve earns shared reward, actual choice button/native socket, two-projectile cast, pending/fitted Continue, narrow view, actual prior refusal and legacy no-grant');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
