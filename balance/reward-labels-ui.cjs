// Prepared native drop fixtures, not an earned gameplay review.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),tag='reward-labels';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 let root=path.join(dir,'reward-labels-dist');
 const current=root,prior=path.join(dir,'skill-preparation-dist'),results=[];
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
  const png=await run(()=>document.getElementById('game').toDataURL());fs.writeFileSync(path.join(dir,tag+'-'+name+'-canvas.png'),Buffer.from(png.split(',')[1],'base64'));
  win.webContents.invalidate();await new Promise(r=>setTimeout(r,100));fs.writeFileSync(path.join(dir,tag+'-'+name+'.png'),(await win.webContents.capturePage()).toPNG());
 };
 const boot=async()=>run(async()=>{
  window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});await new Promise(r=>setTimeout(r,200));
 });
 const state=()=>{const w=__game.world();return {seed:w.massRuntime.generator.run.seed,pos:w.player.pos,life:w.player.life,
  xp:w.meta.xp,items:w.meta.items,skills:w.player.skills.map(s=>s?{id:s.def.id,level:s.level,sockets:s.sockets}:null),
  drops:w.drops,claims:w.massRuntime.state.snapshot().claims};};
 const save=async()=>{await run(async()=>{__game.save();await new Promise(r=>setTimeout(r,250));});return run(state);};
 const resume=async()=>{await win.loadURL(url);await boot();await run(async()=>{
  for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
  const b=document.querySelector('#sm-continue:not([disabled])');if(!b)throw Error('No Continue');b.click();__game.ui.hideAll();
 });return run(state);};
 const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
 const setup=async()=>run(()=>{
  __game.devStartRun('magician');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);
  const m=w.massRuntime,p=m.journey.places.find(p=>p.content==='cinderwatch'),q=m.journey.local(p);
  w.landPartyAt({x:q.x,y:q.y+350});m.update(w,true);w.player.invulnerable=true;
  for(const a of w.actors)if(a.team==='enemy'&&!a.passive){a.pos={x:w.player.pos.x+5000,y:w.player.pos.y+5000};a.aiAnchor={...a.pos};}
  w.drops=[];w.texts=[];w.notices=[];
  window.rewardQA={uids:[99111,99112,99113],at:{x:w.player.pos.x+100,y:w.player.pos.y+60}};
  const names=['Windtrews','Brigandine','Rough Memory'],bases=['legs_evasion_es','chest_armor_evasion','rough_memory'];
  rewardQA.uids.forEach((uid,i)=>{
   const item={uid,baseId:bases[i],ilvl:1,tier:1,rarity:'common',name:names[i],baseRoll:0,implicitRolls:[],affixes:[],
    ...(i===2?{mem:[{d:'chest',s:6412}]}:{})};
   w.dropGearAt(rewardQA.at,item,undefined,true);
   const d=w.drops.find(d=>d.item.kind==='gear'&&d.item.item.uid===uid);d.pos={x:rewardQA.at.x+(i-1)*12,y:rewardQA.at.y};d.bob=0;
  });
  const r=__game.renderer;
  for(let i=0;i<50;i++){r.lastRenderTime=w.time-1/60;r.render(w);}
 });
 const inspect=async(name,legacy=false,take=true)=>{
  const d=await run(()=>{
   const w=__game.world(),r=__game.renderer,ctx=r.ctx,fill=ctx.fillText,rows=[];
   const state=()=>JSON.stringify([w.time,w.drops,w.texts,w.player.pos,w.player.life,w.meta.xp,w.meta.items,w.massRuntime.state.snapshot()]);
   const before=state();
   ctx.fillText=function(t,x,y,...rest){
    if(/Windtrews|Brigandine|Rough Memory|Unrevealed gem|QA independent|LEVEL UP/.test(String(t))) {
     const b=ctx.measureText(t),m=ctx.getTransform();
     rows.push({text:String(t),x:m.a*(x-b.actualBoundingBoxLeft)+m.e,y:m.d*(y-b.actualBoundingBoxAscent)+m.f,
      w:m.a*(b.actualBoundingBoxLeft+b.actualBoundingBoxRight),h:m.d*(b.actualBoundingBoxAscent+b.actualBoundingBoxDescent)});
    }
    return fill.call(this,t,x,y,...rest);
   };
   try{r.render(w);}finally{ctx.fillText=fill;}
   return {rows,pure:before===state(),fatal:__game.crash().fatal,boxes:r.rewardLabels?.footprints??[],
    named:r.namedRewardUids?[...r.namedRewardUids]:[],bounds:{x:r.cam.x,y:r.cam.y,w:r.canvas.width/r.zoom,h:r.canvas.height/r.zoom}};
  });
  assert.ok(d.pure,name+' pure');assert.equal(d.fatal,null);
  if(!legacy){
   for(let i=0;i<d.boxes.length;i++){
    for(let j=0;j<i;j++)assert.ok(!overlap(d.boxes[i],d.boxes[j]),name+' overlapping names');
    const b=d.boxes[i],v=d.bounds;assert.ok(b.x>=v.x&&b.y>=v.y&&b.x+b.w<=v.x+v.w&&b.y+b.h<=v.y+v.h,name+' viewport');
   }
  }
  if(take)await shot(name);results.push({name,...d});return d;
 };
 const timer=setTimeout(()=>app.exit(1),240000);
 try{
  root=prior;await win.loadURL(url);await boot();await setup();
  const old=await inspect('prior-cluster',true);
  assert.equal(old.rows.filter(t=>/!$/.test(t.text)).length,3,'actual prior shows three duplicate announcements');
  assert.ok(old.rows.some((a,i)=>old.rows.some((b,j)=>i<j&&!a.text.endsWith('!')&&!b.text.endsWith('!')&&overlap(a,b))),'prior native ground names overlap');
  root=current;await win.loadURL(url);await boot();await setup();
  const now=await inspect('cluster');assert.equal(now.named.length,3);assert.equal(now.rows.filter(t=>/!$/.test(t.text)).length,0);
  assert.ok(now.rows.some(t=>t.text==='Unrevealed gem'));
  const same=await inspect('stable',false,false);assert.deepEqual(same.boxes,now.boxes);
  await run(()=>{const w=__game.world();w.text(w.player.pos,'QA independent','#fff',14,'drop');w.text(w.player.pos,'Windtrews!','#fff',14,'drop');w.text(w.player.pos,'LEVEL UP!','#ffd700',24,'progression');});
  const independent=await inspect('independent');assert.ok(independent.rows.some(t=>t.text==='QA independent'));
  assert.equal(independent.rows.filter(t=>t.text==='Windtrews!').length,1);assert.ok(independent.rows.some(t=>t.text==='LEVEL UP!'));
  win.setSize(600,600);await new Promise(r=>setTimeout(r,150));await run(()=>__game.renderer.resize());
  const narrow=await inspect('narrow');assert.equal(narrow.named.length,3);
  win.setSize(1280,850);await new Promise(r=>setTimeout(r,150));await run(()=>__game.renderer.resize());
  await run(()=>{
   const w=__game.world(),a=w.createMonster('gnoll_prowler',1,'enemy');a.pos={...rewardQA.at};w.actors.push(a);rewardQA.enemy=a;
  });
  const danger=await inspect('combat');assert.equal(danger.named.length,0,'packing cannot move hushed rewards back into combat');
  const nativeClear=await run(()=>{
   const w=__game.world(),r=__game.renderer;
   return r.rewardLabels.footprints.every(b=>!r.rewardLabelCovered(w,b.x+b.w/2,b.y+b.h/2,b.w,b.h));
  });assert.ok(nativeClear);
  await run(()=>{rewardQA.enemy.dead=true;__game.world().texts=[];});
  const returned=await inspect('cleared');assert.equal(returned.named.length,3);
  // Native pickup remains on the actual ground item, not its shifted label.
  const picked=await run(()=>{
   const w=__game.world(),d=w.drops.find(d=>d.item.kind==='gear'&&d.item.item.uid===99112);
   w.player.pos={...d.pos};w.pickupNearestGear(w.localSeat);w.massRuntime.update(w,true);
   return {items:w.meta.items.map(i=>i.uid),feed:w.pickupFeed.map(p=>p.label)};
  });assert.ok(picked.items.includes(99112));assert.ok(picked.feed.some(s=>s.includes('Brigandine')));
  await inspect('picked');
  const saved=await save();assert.deepEqual(await resume(),saved);await inspect('continued');
  root=prior;assert.deepEqual(await resume(),saved);await inspect('prior-continued',true);
  root=current;assert.deepEqual(await resume(),saved);await inspect('current-again');
  // Look for a genuinely concealed native point; no fake visibility callback.
  const concealed=await run(()=>{
   const w=__game.world(),m=w.massRuntime,r=__game.renderer,p=m.journey.places.find(p=>p.content==='stoneward'),q=m.journey.local(p);
   w.landPartyAt(q);m.update(w,true);r.render(w);let hidden;
   for(const d of [200,300,400])for(let i=0;i<32&&!hidden;i++){
    const p={x:w.player.pos.x+Math.cos(i*Math.PI/16)*d,y:w.player.pos.y+Math.sin(i*Math.PI/16)*d};
    if(r.labelRevealAt(w,p)<.01&&r.sightVeil.occludedAt(p)>.8)hidden=p;
   }
   if(!hidden)throw Error('No native occluded point');
   for(const d of w.drops)if(d.item.kind==='gear'&&[99111,99113].includes(d.item.item.uid))d.pos={...hidden};
   w.texts=[];return {hidden,reveal:r.labelRevealAt(w,hidden)};
  });const hidden=await inspect('concealed');assert.ok(!hidden.named.some(id=>[99111,99113].includes(id)));results.push({concealed});
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify({results,picked,nativeClear,sameSave:true},null,2));
  console.log('PASS native drops, prior overlapping duplicates, bounded stable names, independent announcements, narrow window, native combat clearance, pickup and current/prior/current Continue');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
