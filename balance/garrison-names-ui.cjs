// Controlled discovered garrison identity and concealment; not an earned playthrough.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),legacy=process.env.HOLLOW_WAKE_QA_LEGACY==='1',tag=legacy?'garrison-names-before':'garrison-names';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 let root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/garrison-names-dist');
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
 const inspect=async(name,expected,target='guard')=>{
  const data=await run(target=>{
   const w=__game.world(),m=w.massRuntime,r=__game.renderer,ctx=r.ctx,a=garrisonQA[target],fill=ctx.fillText,rows=[];
   const state=()=>JSON.stringify([w.time,w.meta.xp,m.state.snapshot(),m.sites.discovered,w.actors.map(a=>[a.id,a.pos,a.life,a.name])]);
   r.render(w);r.hudMouse=r.toScreen(a.pos);const before=state();
   ctx.fillText=function(text,x,y,...rest){if(text==='Garrison · Cinderwatch Camp')rows.push({text,x,y,width:ctx.measureText(text).width});return fill.call(this,text,x,y,...rest);};
   try{r.render(w);}finally{ctx.fillText=fill;}
   const b=r.hoverNameRect,p=b?r.toScreen({x:b.x,y:b.y}):null;
   return {rows,same:before===state(),fatal:__game.crash().fatal,reveal:r.labelRevealAt(w,a.pos),
    bounds:b?{x:p.x,y:p.y,w:b.w*r.zoom,h:b.h*r.zoom}:null,width:innerWidth,height:innerHeight};
  },target);
  assert.ok(data.same);assert.equal(data.fatal,null);assert.equal(data.rows.length,legacy?0:expected?1:0,name);
  if(!legacy&&expected){const b=data.bounds;assert.ok(b&&b.x>=0&&b.y>=0&&b.x+b.w<=data.width&&b.y+b.h<=data.height);}
  await shot(name);results.push({name,...data});
 };
 try{
  await win.loadURL(url);await boot();await run(()=>{
   __game.devStartRun('magician');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);
   const m=w.massRuntime,p=m.journey.places.find(p=>p.content==='cinderwatch');
   w.landPartyAt(m.journey.local(p));m.update(w,true);w.player.invulnerable=true;__game.step(2);
  });
  await run(()=>{
   const w=__game.world(),m=w.massRuntime,p=m.journey.places.find(p=>p.content==='cinderwatch');
   const id=[0,1].map(i=>JSON.stringify([p.id,i])).find(id=>m.state.claimed('site-guardian',id)&&m.natives.has(id)),guard=m.natives.get(id);
   guard.pos=w.findFreeSpot({x:w.player.pos.x+100,y:w.player.pos.y},guard.radius);
   const foreign=w.createMonster(guard.defId,guard.level,'enemy');foreign.pos=w.findFreeSpot({x:w.player.pos.x-130,y:w.player.pos.y},foreign.radius);
   w.actors=[w.player,guard,foreign];w.texts=[];window.garrisonQA={guard,foreign,id};
  });
  await inspect('member',true);await inspect('visitor',false,'foreign');
  await run(()=>garrisonQA.guard.statuses.push({id:'swallowed',remaining:100,stacks:1}));await inspect('concealed',false);
  await run(()=>{garrisonQA.guard.statuses=[];});
  const covered=await run(()=>{
   const w=__game.world(),m=w.massRuntime,r=__game.renderer,a=garrisonQA.guard;
   garrisonQA.savedPlayer={...w.player.pos};garrisonQA.savedGuard={...a.pos};
   const p=m.journey.places.find(p=>p.content==='stoneward'),center=m.journey.local(p);
   w.landPartyAt(center);m.update(w,true);w.player.pos=w.findFreeSpot({x:center.x+90,y:center.y+140},w.player.radius);
   w.actors=[w.player,a];r.render(w);let found;
   for(const d of [250,350,450])for(let i=0;i<32&&!found;i++){const t=i*Math.PI/16,q=w.findFreeSpot({x:w.player.pos.x+Math.cos(t)*d,y:w.player.pos.y+Math.sin(t)*d},a.radius);
    if(r.labelRevealAt(w,q)<=.02&&r.sightVeil.occludedAt(q)>.8)found=q;}
   if(!found)throw Error('No native occlusion sample');a.pos=found;r.render(w);
   return {reveal:r.labelRevealAt(w,found),occlusion:r.sightVeil.occludedAt(found)};
  });
  assert.ok(covered.reveal<=.02&&covered.occlusion>.8);await inspect('occluded',false);results.push({covered});
  await run(()=>{const w=__game.world();w.landPartyAt(garrisonQA.savedPlayer);w.massRuntime.update(w,true);garrisonQA.guard.pos=garrisonQA.savedGuard;w.actors=[w.player,garrisonQA.guard,garrisonQA.foreign];});
  win.setSize(800,600);await new Promise(r=>setTimeout(r,150));await inspect('narrow',true);
  const saved=await run(async()=>{const w=__game.world(),a=garrisonQA.guard;__game.save();await new Promise(r=>setTimeout(r,250));return {id:garrisonQA.id,pos:a.pos,life:a.life,seed:w.massRuntime.generator.run.seed};});
  await win.loadURL(url);await boot();await run(async saved=>{
   for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
   document.querySelector('#sm-continue:not([disabled])').click();__game.ui.hideAll();
   const w=__game.world(),a=w.massRuntime.natives.get(saved.id);
   if(!a||a.life!==saved.life||JSON.stringify(a.pos)!==JSON.stringify(saved.pos)||w.massRuntime.generator.run.seed!==saved.seed)throw Error('Native Continue changed guard');
   window.garrisonQA={guard:a};__game.renderer.render(w);
  },saved);
  await inspect('continued',true);
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
  console.log(legacy?'PASS prior client has no garrison caption':'PASS real guard affiliation, foreign exclusion, native concealment and wall veil, narrow bounds and exact guard Continue');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
