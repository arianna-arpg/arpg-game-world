// Actual native country-garrison/cache integration, separate from leisure review.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),legacy=process.env.HOLLOW_WAKE_QA_LEGACY==='1',tag=legacy?'progression-floats-before':'progression-floats';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 let root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/progression-floats-dist');
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
 const intersects=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
 const measure=()=>run(()=>{
  const w=__game.world(),p=w.player,r=__game.renderer,ctx=r.ctx,rows=[],fill=ctx.fillText;
  const before=JSON.stringify([w.texts,w.meta.xp,w.meta.passivePoints,p.level,p.life]);
  ctx.fillText=function(t,x,y,...rest){if(t==='LEVEL UP!')rows.push({x:x-ctx.measureText(t).width/2,y:y-24,w:ctx.measureText(t).width,h:24});return fill.call(this,t,x,y,...rest);};
  try{r.render(w);}finally{ctx.fillText=fill;}
  return {rows,bodies:w.actors.map(a=>({x:a.pos.x-a.radius-12,y:a.pos.y-a.radius-34,w:(a.radius+12)*2,h:a.radius*2+46})),
   unchanged:before===JSON.stringify([w.texts,w.meta.xp,w.meta.passivePoints,p.level,p.life]),fatal:__game.crash().fatal};
 });
 const stable=()=>run(()=>{const w=__game.world();return {seed:w.massRuntime.generator.run.seed,level:w.player.level,xp:w.meta.xp,points:w.meta.passivePoints};});
 const capture=async name=>{
  const r=await measure();assert.equal(r.fatal,null);assert.ok(r.unchanged);assert.equal(r.rows.length,2);
  const bodyOverlaps=r.rows.reduce((n,row)=>n+r.bodies.filter(b=>intersects(row,b)).length,0);
  if(legacy)assert.ok(bodyOverlaps>0);else{assert.equal(bodyOverlaps,0);assert.ok(!intersects(r.rows[0],r.rows[1]));}
  assert.deepEqual(await measure(),r);await shot(name);results.push({name,...r,bodyOverlaps});
 };
 try{
  await win.loadURL(url);await boot();
  const grant=await run(()=>{
   __game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);
   const m=w.massRuntime,place=m.journey.places.find(p=>p.content==='cinderwatch');w.landPartyAt(m.journey.local(place));m.update(w,true);
   const p=w.player;w.actors=[p];p.invulnerable=true;__game.step(2);w.texts=[];
   for(const x of [-70,70]){const a=w.createMonster('skeleton_warrior',1,'enemy');a.pos={x:p.pos.x+x,y:p.pos.y};w.actors.push(a);}
   const before={level:p.level,points:w.meta.passivePoints};
   for(let i=0;i<2;i++)w.grantXp(w.meta.xpNeeded-w.meta.xp);
   const r=__game.renderer,settings=r.getSettings;
   window.progressionQA={show:true};r.getSettings=()=>{const s=settings?.();return {...s,floatKinds:{...s?.floatKinds,progression:progressionQA.show}};};
   return {before,after:{level:p.level,points:w.meta.passivePoints},kinds:w.texts.filter(t=>t.text==='LEVEL UP!').map(t=>t.kind)};
  });
  assert.equal(grant.after.level-grant.before.level,2);assert.equal(grant.after.points-grant.before.points,2);
  if(!legacy)assert.deepEqual(grant.kinds,['progression','progression']);
  await capture('crowd');win.setSize(800,600);await new Promise(r=>setTimeout(r,120));await capture('narrow');
  await run(()=>progressionQA.show=false);assert.equal((await measure()).rows.length,legacy?2:0);
  await run(()=>progressionQA.show=true);
  const saved=await stable();await run(async()=>{__game.save();await new Promise(r=>setTimeout(r,220));});
  await win.loadURL(url);await boot();await run(async()=>{for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));document.querySelector('#sm-continue:not([disabled])').click();__game.ui.hideAll();});
  assert.deepEqual(await stable(),saved);assert.equal((await measure()).rows.length,0,'ephemeral celebrations do not replay on Continue');
  results.push({grant,continued:saved});fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results));console.log(legacy?'PASS previous native level-up announcements overlap combat bodies':'PASS native level rewards, distinct crowd-safe announcements, narrow view, stable read-only redraw, curation and exact browser Continue');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
