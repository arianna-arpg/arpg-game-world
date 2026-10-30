// Controlled native skill upgrade and stored-socket UI, not an earned playthrough.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),legacy=process.env.HOLLOW_WAKE_QA_LEGACY==='1',tag=legacy?'stored-supports-before':'stored-supports';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 let root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/stored-supports-dist');
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
 const inspect=async(name,expectStored,blocked=false)=>{
  const data=await run(()=>{
   const w=__game.world(),before=JSON.stringify([w.meta.items,w.meta.knownSkills.get('firebolt').sockets,w.time]);
   __game.ui.refreshInventory();
   const buttons=[...document.querySelectorAll('[data-unsocket-bag]')],row=buttons[0];
   row?.scrollIntoView({block:'nearest',behavior:'instant'});
   const b=row?.getBoundingClientRect();
   return {buttons:buttons.map(e=>({text:e.textContent,disabled:e.disabled})),bounds:b?{x:b.x,y:b.y,w:b.width,h:b.height}:null,
    width:innerWidth,height:innerHeight,same:before===JSON.stringify([w.meta.items,w.meta.knownSkills.get('firebolt').sockets,w.time]),
    stored:w.meta.items.filter(i=>i.gem?.kind==='skill'&&i.gem.sockets.some(Boolean)).length,
    fitted:w.meta.knownSkills.get('firebolt').sockets.filter(Boolean).map(s=>s.def.id),fatal:__game.crash().fatal};
  });
  assert.ok(data.same);assert.equal(data.fatal,null);assert.equal(data.stored,expectStored?1:0);
  assert.equal(data.buttons.length,legacy?0:expectStored?1:0);
  if(data.buttons.length)assert.equal(data.buttons[0].disabled,blocked);
  if(data.bounds)assert.ok(data.bounds.x>=0&&data.bounds.x+data.bounds.w<=data.width&&data.bounds.y>=0&&data.bounds.y+data.bounds.h<=data.height);
  results.push({name,...data});await shot(name);
 };
 const summary=()=>{const w=__game.world();return {seed:w.massRuntime.generator.run.seed,pos:w.player.pos,
  bag:w.meta.items.map(i=>({uid:i.uid,gem:i.gem??null,locked:!!i.locked})),bar:w.meta.knownSkills.get('firebolt').sockets.map(s=>s?{id:s.def.id,level:s.level,locked:!!s.locked}:null),
  rarity:w.meta.knownSkills.get('firebolt').rarity};};
 try{
  await win.loadURL(url);await boot();await run(()=>{
   __game.devStartRun('magician');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);
   for(const flag of ['unlock_all_gems','vendor_gems','brandt_sell_supports'])w.account.features.add(flag);
   const native=w.supportDropPool(100).find(s=>s.id==='splitting');if(!native)throw Error('Native Splitting absent');
   const gem=w.grantSupportGemItem(w.localSeat,{def:native,level:2,locked:true});
   if(!w.socketSupport(gem.uid,'firebolt'))throw Error('Native first fit failed');
   const old=w.meta.knownSkills.get('firebolt');
   const upgrade=w.grantSkillGemItem(w.localSeat,{def:old.def,level:1,rarity:'rare',sockets:[null,null,null]});
   if(!w.learnSkill(upgrade.uid))throw Error('Native same-skill upgrade failed');
   const stored=w.meta.items.find(i=>i.gem?.kind==='skill'&&i.gem.skillId==='firebolt');
   if(stored.gem.sockets[0]?.supportId!=='splitting')throw Error('Native swap lost old support');
   window.socketQA={uid:stored.uid,active:w.meta.knownSkills.get('firebolt')};
   const m=w.massRuntime;w.landPartyAt(m.journey.local(m.journey.places.find(p=>p.content==='cinderwatch')));m.update(w,true);
   w.actors=[w.player];w.player.invulnerable=true;
   const foe=w.createMonster('dire_wolf',1,'enemy');foe.pos={x:w.player.pos.x+60,y:w.player.pos.y};w.actors.push(foe);
   w.resolveHit(w.player,w.player.skills[0],foe);foe.dead=true;w.actors=[w.player];
   __game.ui.toggleBuildPanel(undefined,'show');__game.ui.refreshInventory();
  });
  await inspect('hot',true,true);
  if(!legacy)await run(()=>document.querySelector('[data-unsocket-bag]').click());
  await run(()=>{__game.step(330);__game.ui.refreshInventory();});await inspect('ready',true);
  if(!legacy){
   win.setSize(800,600);await new Promise(r=>setTimeout(r,150));await run(()=>{__game.ui.folioSync();__game.ui.refreshInventory();});
   await inspect('narrow',true);
   await run(()=>{
    document.querySelector('[data-unsocket-bag]').click();
    const w=__game.world();if(w.meta.knownSkills.get('firebolt')!==socketQA.active)throw Error('Active instance replaced');
    const support=w.meta.items.find(i=>i.gem?.kind==='support'&&i.gem.supportId==='splitting');
    if(!support||support.gem.level!==2||!support.locked)throw Error('Removed support changed');
    __game.ui.refreshInventory();
   });
   await inspect('removed',false);
   await run(()=>{
    const w=__game.world(),item=w.meta.items.find(i=>i.gem?.kind==='support'&&i.gem.supportId==='splitting');
    w.requestMeta({t:'socket',uid:item.uid,skillId:'firebolt'});__game.ui.refreshInventory();
    const s=w.meta.knownSkills.get('firebolt').sockets[0];
    if(s?.def.id!=='splitting'||s.level!==2||!s.locked)throw Error('Native refit failed');
   });await inspect('fitted',false);
  }
  const saved=await run(summary);await run(async()=>{__game.ui.hideAll();__game.save();await new Promise(r=>setTimeout(r,250));});
  await win.loadURL(url);await boot();await run(async()=>{
   for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
   document.querySelector('#sm-continue:not([disabled])').click();__game.ui.hideAll();__game.ui.toggleBuildPanel(undefined,'show');__game.ui.refreshInventory();
  });assert.deepEqual(await run(summary),saved);
  await inspect('continued',legacy);
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results.map(r=>({name:r.name,buttons:r.buttons,stored:r.stored,fitted:r.fitted,same:r.same,fatal:r.fatal}))));
  console.log(legacy?'PASS prior client preserves cargo but has no direct stored-socket removal':'PASS real upgrade/removal button, native hit gate/expiry, narrow layout, exact locked/level cargo, native refit and Continue');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
