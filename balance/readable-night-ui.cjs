// Native combat lighting and concealment, separate from leisure review.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),legacy=process.env.HOLLOW_WAKE_QA_LEGACY==='1',tag=legacy?'readable-night-before':'readable-night';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 let root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/readable-night-dist');
 const current=root;
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
 const inspect=async name=>{
  const result=await run(()=>{
   const w=__game.world(),r=__game.renderer,l=r.lightLayer,layout=r.combatMeters;
   const state=()=>JSON.stringify([w.time,w.player.pos,w.player.life,w.actors.map(a=>[a.id,a.pos,a.life,a.casting?.elapsed]),w.texts]);
   const before=state(),bounds=layout.readabilityBounds;
   r.render(w);const regions=bounds?.call(layout)??[];
   const active=Array.from(l.bctx.getImageData(0,0,l.buf.width,l.buf.height).data);
   const readBodies=[...layout.bodies.keys()].map(a=>a.id);
   layout.readabilityBounds=()=>[];try{r.render(w);}finally{layout.readabilityBounds=bounds;}
   const off=Array.from(l.bctx.getImageData(0,0,l.buf.width,l.buf.height).data);
   const k=r.zoom*l.buf.width/r.canvas.width;let changed=0,outside=0,alphaReduction=0;
   for(let i=3;i<active.length;i+=4)if(active[i]!==off[i]){
    changed++;alphaReduction+=off[i]-active[i];const x=(i-3)/4%l.buf.width,y=Math.floor((i-3)/4/l.buf.width);
    if(!regions.some(b=>x>=(b.x-r.cam.x-20)*k&&x<=(b.x+b.w-r.cam.x+20)*k&&y>=(b.y-r.cam.y-20)*k&&y<=(b.y+b.h-r.cam.y+20)*k))outside++;
   }
   r.render(w);
   return {changed,outside,alphaReduction,dark:l.ambient,readBodies,regions:regions.length,
    hiddenId:nightQA.hidden.id,unchanged:before===state(),fatal:__game.crash().fatal,
    life:w.player.life,enemies:nightQA.enemies.map(a=>({id:a.id,life:a.life,pos:a.pos,cast:a.casting?.inst.def.id}))};
  });
  assert.equal(result.fatal,null);assert.ok(result.unchanged);assert.equal(result.outside,0);
  assert.ok(!result.readBodies.includes(result.hiddenId),'concealed body cannot receive a readability patch');
  if(name==='day'||legacy){assert.equal(result.changed,0);}else{assert.ok(result.changed>0);assert.ok(result.alphaReduction>0);}
  await shot(name);results.push({name,...result});
 };
 try{
  await win.loadURL(url);await boot();await run(()=>{
   __game.devStartRun('magician');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);
   const m=w.massRuntime,p=m.journey.places.find(p=>p.content==='stoneward'),center=m.journey.local(p);
   w.landPartyAt(center);m.update(w,true);w.player.invulnerable=true;__game.step(2);
   w.time=168;w.player.pos=w.findFreeSpot({x:center.x+90,y:center.y+140},w.player.radius);
   const enemies=w.actors.filter(a=>a.team==='enemy'&&!a.dead&&Math.hypot(a.pos.x-center.x,a.pos.y-center.y)<500);
   if(enemies.length<2)throw Error('Expected native mixed Stoneward encounter');
   const hidden=w.createMonster('skeleton_archer',4,'enemy');hidden.pos={x:w.player.pos.x+350,y:w.player.pos.y};
   hidden.statuses.push({id:'swallowed',remaining:100,stacks:1});w.actors.push(hidden);w.texts=[];
   window.nightQA={enemies,hidden};__game.renderer.render(w);
  });
  await inspect('night');
  const covered=await run(()=>{const w=__game.world(),r=__game.renderer,a=nightQA.hidden;
   a.statuses=[];let found;
   for(const distance of [250,350,450])for(let i=0;i<32&&!found;i++){
    const angle=i*Math.PI/16,q=w.findFreeSpot({x:w.player.pos.x+Math.cos(angle)*distance,y:w.player.pos.y+Math.sin(angle)*distance},a.radius);
    if(r.labelRevealAt(w,q)<=.05&&r.sightVeil.occludedAt(q)>.8)found=q;
   }
   if(!found)throw Error('No native occluded sample');a.pos=found;r.render(w);
   return {reveal:r.labelRevealAt(w,found),occlusion:r.sightVeil.occludedAt(found)};
  });assert.ok(covered.reveal<=.05&&covered.occlusion>.8);await inspect('occluded');results.push({covered});
  await run(()=>{const w=__game.world();nightQA.hidden.dead=true;
   __game.devInput(()=>({dx:-.5,dy:0,aim:nightQA.enemies[0].pos,held:[true],edge:[]}));
   try{__game.step(45);}finally{__game.devInput(null);}
  });await inspect('moving');
  win.setSize(800,600);await new Promise(r=>setTimeout(r,120));await inspect('narrow');
  await run(()=>{__game.world().time=48;});await inspect('day');
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
  console.log(legacy?'PASS previous client has unmodified night wash over native combat readouts':'PASS native night/moving/narrow combat light preservation, hidden-body exclusion, daylight identity, outside-mask identity and read-only redraw');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
