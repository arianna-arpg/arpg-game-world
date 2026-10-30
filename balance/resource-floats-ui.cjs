// Native orb and kill rewards share readable placement, separate from leisure review.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),legacy=process.env.HOLLOW_WAKE_QA_LEGACY==='1',tag=legacy?'resource-floats-before':'resource-floats';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 let root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/resource-floats-dist');
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
 const overlaps=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
 const stable=()=>run(()=>{const w=__game.world();return {seed:w.massRuntime.generator.run.seed,life:w.player.life,xp:w.meta.xp,level:w.player.level};});
 const measure=()=>run(()=>{
  const w=__game.world(),r=__game.renderer,ctx=r.ctx,rows=[],fill=ctx.fillText;
  const labels=new Set(w.texts.filter(t=>t.kind==='gains'||t.kind==='xp').map(t=>t.text));
  const before=JSON.stringify([w.texts,w.player.life,w.meta.xp,w.orbs,w.player.gainEvents]);
  ctx.fillText=function(t,x,y,...rest){if(labels.has(t)){
   const size=parseFloat(ctx.font.match(/([\d.]+)px/)[1]);
   rows.push({text:t,x:x-ctx.measureText(t).width/2,y:y-size,w:ctx.measureText(t).width,h:size});
  }return fill.call(this,t,x,y,...rest);};
  try{r.render(w);}finally{ctx.fillText=fill;}
  return {rows,bodies:w.actors.filter(a=>!a.dead).map(a=>({x:a.pos.x-a.radius-12,y:a.pos.y-a.radius-34,w:(a.radius+12)*2,h:a.radius*2+46})),
   unchanged:before===JSON.stringify([w.texts,w.player.life,w.meta.xp,w.orbs,w.player.gainEvents]),fatal:__game.crash().fatal};
 });
 const capture=async name=>{
  const r=await measure();assert.equal(r.fatal,null);assert.ok(r.unchanged);assert.equal(r.rows.length,4);
  const pairs=r.rows.reduce((n,a,i)=>n+r.rows.slice(0,i).filter(b=>overlaps(a,b)).length,0);
  const bodies=r.rows.reduce((n,a)=>n+r.bodies.filter(b=>overlaps(a,b)).length,0);
  if(legacy)assert.ok(pairs>0);else{assert.equal(pairs,0);assert.equal(bodies,0);}
  assert.deepEqual(await measure(),r);await shot(name);results.push({name,pairs,bodies,rows:r.rows});
 };
 try{
  await win.loadURL(url);await boot();
  const earned=await run(()=>{
   __game.devStartRun('magician');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);
   const m=w.massRuntime,place=m.journey.places.find(p=>p.content==='cinderwatch');w.landPartyAt(m.journey.local(place));m.update(w,true);
   const p=w.player;w.actors=[p];p.invulnerable=true;__game.step(2);w.texts=[];w.orbs=[];p.life=10;
   for(const amount of [7,11])w.shedOrb('life',p.pos,{amount});
   __game.step(1);
   const healed=p.life;
   for(let i=0;i<2;i++){const a=w.createMonster('skeleton_warrior',1,'enemy');a.pos={...p.pos};w.actors.push(a);w.kill(a,false,p);}
   const r=__game.renderer,settings=r.getSettings;window.resourceQA={show:true};
   r.getSettings=()=>{const s=settings?.();return {...s,floatKinds:{...s?.floatKinds,gains:resourceQA.show,xp:resourceQA.show}};};
   return {healed,xp:w.meta.xp,labels:w.texts.filter(t=>t.kind==='gains'||t.kind==='xp').map(t=>t.text)};
  });assert.ok(earned.healed>=28&&earned.healed<29);assert.ok(earned.xp>0);assert.equal(earned.labels.length,4);
  await capture('crowd');win.setSize(800,600);await new Promise(r=>setTimeout(r,120));await capture('narrow');
  await run(()=>resourceQA.show=false);assert.equal((await measure()).rows.length,0);await run(()=>resourceQA.show=true);
  const saved=await stable();await run(async()=>{__game.save();await new Promise(r=>setTimeout(r,220));});
  await win.loadURL(url);await boot();await run(async()=>{
   for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
   const b=document.querySelector('#sm-continue:not([disabled])');if(!b)throw Error('No native Continue');b.click();__game.ui.hideAll();
  });
  assert.deepEqual(await stable(),saved);assert.equal((await measure()).rows.length,0);
  results.push({earned,continued:saved});
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
  console.log(legacy?'PASS previous client reproduces overlapping native resource and XP floats':'PASS native healing and XP, separate readable values, normal/narrow placement, read-only stable redraw, curation and exact Continue');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
