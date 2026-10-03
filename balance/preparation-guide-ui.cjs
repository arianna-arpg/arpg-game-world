// Controlled preparation presentation and native lesson fixture, not an earned playthrough.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),legacy=process.env.HOLLOW_WAKE_QA_LEGACY==='1',tag=legacy?'preparation-guide-before':'preparation-guide';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 let root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/preparation-guide-dist');
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



 const timer=setTimeout(()=>app.exit(1),220000),results=[];
 const capture=async(name,expected)=>{
  const data=await run(()=>{
   const w=__game.world(),r=__game.renderer,ctx=r.ctx,text=ctx.fillText,rows=[];
   const state=()=>JSON.stringify([w.time,w.ledger,w.activeQuests,w.massRuntime.state.snapshot(),w.meta.items.map(i=>i.uid)]);
   const before=state();
   ctx.fillText=function(t,x,y,...rest){if(String(t).includes('Prepare flasks')){
    const m=ctx.getTransform(),width=ctx.measureText(t).width;rows.push({text:String(t),x:m.a*x+m.e,y:m.d*y+m.f,width:m.a*width});
   }return text.call(this,t,x,y,...rest);};
   try{r.render(w);}finally{ctx.fillText=text;}
   return {rows,same:before===state(),complete:w.mireilleLessonLived(),fatal:__game.crash().fatal,width:innerWidth,height:innerHeight};
  });
  assert.ok(data.same);assert.equal(data.fatal,null);assert.equal(data.rows.length,legacy?0:expected?1:0);
  for(const row of data.rows)assert.ok(row.x>=0&&row.x+row.width<=data.width&&row.y>0&&row.y<data.height);
  await shot(name);results.push({name,...data});
 };
 const state=()=>{const w=__game.world();return {seed:w.massRuntime.generator.run.seed,pos:{...w.player.pos},complete:w.mireilleLessonLived(),flasks:w.player.skills.filter(s=>s?.def.tags.includes('flask')).map(s=>s.def.id)};};
 const checkpoint=async()=>{
  const saved=await run(state);await run(async()=>{__game.save();__game.saveAccount();await new Promise(r=>setTimeout(r,250));});
  await win.loadURL(url);await boot();await run(async()=>{
   for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
   document.querySelector('#sm-continue:not([disabled])').click();__game.ui.hideAll();
  });assert.deepEqual(await run(state),saved);
 };
 try{
  await win.loadURL(url);await boot();
  await run(()=>{__game.devStartRun('magician');__game.ui.hideAll();__game.world().startWorldMass(42);__game.world().player.invulnerable=true;});
  await capture('arrival',true);
  await checkpoint();await capture('continue-before',true);
  await run(()=>{
   const w=__game.world(),inn=w.actors.find(a=>a.defId==='townsfolk_innkeep'&&!a.dead);
   w.landPartyAt({x:inn.pos.x+35,y:inn.pos.y});w.player.tier=inn.tier;
   __game.step(100);__game.ui.hideAll();
   if(!w.meta.items.some(i=>i.gem?.kind==='skill'&&i.gem.skillId==='life_flask'))throw Error('Native dwell gift missing');
  });
  await capture('gift',true);
  if(!legacy){win.setSize(800,600);await new Promise(r=>setTimeout(r,150));await capture('narrow',true);}
  const learned=await run(()=>{
   const w=__game.world();__game.ui.toggleInventory();
   for(const id of ['life_flask','mana_flask']){
    const item=w.meta.items.find(i=>i.gem?.kind==='skill'&&i.gem.skillId===id);
    const tile=document.querySelector('[data-bag-item][data-item-uid="'+item.uid+'"]');
    if(!tile)throw Error('Gift tile missing');tile.dispatchEvent(new MouseEvent('dblclick',{bubbles:true,button:0}));
    __game.step(2);
    if(!w.player.skills.some(s=>s?.def.id===id))throw Error('Native double-click failed to learn '+id);
   }
   __game.ui.hideAll();__game.step(2);return {complete:w.mireilleLessonLived(),ids:w.player.skills.filter(s=>s?.def.tags.includes('flask')).map(s=>s.def.id)};
  });assert.ok(learned.complete);assert.deepEqual(learned.ids,['life_flask','mana_flask']);
  await capture('prepared',false);await checkpoint();await capture('continue-prepared',false);
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results.map(r=>({name:r.name,rows:r.rows.map(r=>r.text),complete:r.complete,same:r.same,fatal:r.fatal}))));
  console.log(legacy?'PASS previous client has no persistent preparation bearing':'PASS read-only sanctuary bearing, pending Continue, native dwell gifts and bag double-click learning, narrow bounds, native completion and prepared Continue');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
