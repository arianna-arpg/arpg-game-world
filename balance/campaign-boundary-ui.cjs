// Actual native country-garrison/cache integration, separate from leisure review.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),legacy=process.env.HOLLOW_WAKE_QA_LEGACY==='1',tag=legacy?'campaign-boundary-before':'campaign-boundary';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 let root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/campaign-boundary-dist');
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

 const timer=setTimeout(()=>app.exit(1),150000);
 const state=()=>run(()=>{const w=__game.world();return {campaign:w.odyssey.snapshot(),seed:w.massRuntime.generator.run.seed,quests:w.activeQuests,completed:[...w.completedQuests],fatal:__game.crash().fatal};});
 const kills=()=>run(()=>{
  const w=__game.world(),before=w.notices.length;
  if(!w.odyssey.state.roster.includes('undead'))throw Error('Fixture seed no longer carries undead');
  let dead=0;
  for(let i=0;i<8;i++){const a=w.createMonster('zombie',1,'enemy');a.pos={...w.player.pos};w.actors.push(a);w.kill(a,false,w.player);if(a.dead)dead++;}
  __game.renderer.render(w);
  return {dead,hints:w.notices.slice(before).filter(n=>n.text.includes('Bearings on your map')).map(n=>n.text),fatal:__game.crash().fatal};
 });
 try{
  await win.loadURL(url);await boot();
  await run(()=>{__game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);w.player.invulnerable=true;w.odyssey.restore(undefined);});
  const before=await state(),first=await kills(),after=await state();
  assert.equal(first.dead,8);assert.equal(first.fatal,null);
  if(legacy){assert.equal(first.hints.length,1);assert.ok(after.campaign.leads.includes('undead'));}
  else {assert.deepEqual(after,before);assert.equal(first.hints.length,0);}
  await shot('killed');
  await run(async()=>{__game.save();await new Promise(r=>setTimeout(r,220));});
  const saved=await state();await win.loadURL(url);await boot();
  await run(async()=>{for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));document.querySelector('#sm-continue:not([disabled])').click();__game.ui.hideAll();});
  assert.deepEqual(await state(),saved);
  const continued=await kills();
  if(!legacy){assert.deepEqual(await state(),saved);assert.equal(continued.hints.length,0);}
  await shot('continued');
  console.log(JSON.stringify({legacy,first,continued,checkpointExact:true}));
  console.log(legacy?'PASS previous client reproduces unreachable faction lead from native kills':
   'PASS native deaths retain dormant campaign receipts without unreachable hints, including exact browser Continue');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
