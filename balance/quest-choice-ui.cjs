// Controlled native journal input and checkpoint compatibility, not an earned playthrough.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),tag='quest-choice';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const current=path.resolve(__dirname,'reports','quest-choice-dist');let root=current;
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
 const boot=async()=>run(async()=>{window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});await new Promise(r=>setTimeout(r,200));});
 const state=()=>{const w=__game.world(),m=w.massRuntime;return {quests:w.activeQuests,pos:w.player.pos,life:w.player.life,
  policy:m.config.settlement.quests.acceptance??null,hash:m.configHash,seed:m.generator.run.seed,ledger:w.ledger.quests_accepted??0};};
 const shot=async name=>{
  const r=await run(()=>{const w=__game.world(),p=document.getElementById('world-map'),m=w.massRuntime;
   const read=()=>JSON.stringify([m.state.snapshot(),w.activeQuests,w.ledger,w.player.life,w.time]);
   const before=read();__game.ui.refreshMap();__game.renderer.render(w);
   const b=p.getBoundingClientRect(),button=p.querySelector('[data-quest-accept]'),k=button?.getBoundingClientRect();
   return {same:before===read(),fatal:__game.crash().fatal,text:p.innerText,button:button?.dataset.questAccept??null,
    bounds:{x:b.x,right:b.right,top:b.top,bottom:b.bottom},width:innerWidth,height:innerHeight,
    buttonBounds:k?{x:k.x,right:k.right,top:k.top,bottom:k.bottom}:null,png:document.getElementById('game').toDataURL()};
  });
  assert.ok(r.same);assert.equal(r.fatal,null);assert.ok(r.bounds.right<=r.width+.1&&r.bounds.top>=0&&r.bounds.bottom<=r.height+.1);
  if(r.buttonBounds)assert.ok(r.buttonBounds.x>=r.bounds.x&&r.buttonBounds.right<=r.bounds.right+.1);
  fs.writeFileSync(path.join(dir,tag+'-'+name+'-canvas.png'),Buffer.from(r.png.split(',')[1],'base64'));
  win.webContents.invalidate();await new Promise(r=>setTimeout(r,100));fs.writeFileSync(path.join(dir,tag+'-'+name+'.png'),(await win.webContents.capturePage()).toPNG());
  results.push({name,...r,png:undefined});return r;
 };
 const journal=()=>run(()=>{__game.ui.hideAll();__game.ui.openMapTab('quests');});
 const save=async()=>{await run(async()=>{__game.ui.hideAll();__game.save();await new Promise(r=>setTimeout(r,250));});return run(state);};
 const resume=async()=>{
  await win.loadURL(url);await boot();await run(async()=>{
   for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
   const b=document.querySelector('#sm-continue:not([disabled])');if(!b)throw Error('Continue absent');b.click();__game.ui.hideAll();
  });return run(state);
 };
 const stand=()=>{const w=__game.world(),a=w.actors.find(a=>a.defId==='townsfolk_innkeep');w.landPartyAt(a.pos);w.player.tier=a.tier;};
 const timer=setTimeout(()=>app.exit(1),240000),results=[];
 try{
  await win.loadURL(url);await boot();await run(()=>{__game.devStartRun('magician');__game.ui.hideAll();__game.world().startWorldMass(42);});await run(stand);
  await run(()=>{for(let i=0;i<6;i++)__game.world().updateQuestGiver(4);});
  assert.equal((await run(state)).quests.length,0);await journal();assert.ok((await shot('offer')).button);
  await run(()=>document.querySelector('[data-mtab="roads"]').click());assert.equal((await run(state)).quests.length,0);
  await run(()=>document.querySelector('[data-mtab="quests"]').click());
  const waiting=await save();assert.deepEqual(await resume(),waiting);await journal();assert.ok((await shot('waiting-continue')).button);
  await run(()=>{const w=__game.world();window.qaOfferButton=document.querySelector('[data-quest-accept]');
   w.landPartyAt(w.massRuntime.journey.local(w.massRuntime.journey.places.find(p=>p.content==='cinderwatch')));});
  await run(()=>window.qaOfferButton.click());assert.equal((await run(state)).quests.length,0);
  assert.equal((await shot('away-stale-click')).button,null);
  await run(stand);await run(()=>__game.ui.refreshMap());
  win.setSize(800,600);await new Promise(r=>setTimeout(r,180));await run(()=>__game.ui.refreshMap());await shot('narrow');
  win.setSize(1280,850);await new Promise(r=>setTimeout(r,180));await run(()=>__game.ui.refreshMap());
  await run(()=>document.querySelector('[data-quest-accept]').click());
  const accepted=await run(state);assert.equal(accepted.quests.length,1);assert.equal(accepted.ledger,1);
  assert.equal((await shot('accepted')).button,null);
  const held=await save();assert.deepEqual(await resume(),held);await journal();await shot('accepted-continue');
  const checkpoint=await run(()=>__game.world().massRuntime.snapshot(__game.world()));assert.equal(checkpoint.schema,checkpoint.config.settlement?.structurePlans ? 6 : 5);
  root=path.resolve(__dirname,'reports','chest-readout-dist');await win.loadURL(url);await boot();
  const refusal=await run(s=>{
   __game.devStartRun('magician');__game.ui.hideAll();const w=__game.world(),before=w.massRuntime;
   try{w.startWorldMass(s.state.run.seed,s);return {refused:false};}catch(e){return {refused:/Invalid worldmass checkpoint/.test(e.message),same:before===w.massRuntime};}
  },checkpoint);assert.deepEqual(refusal,{refused:true,same:true});
  await run(()=>{__game.devStartRun('magician');__game.ui.hideAll();__game.world().startWorldMass(42);});await run(stand);
  const legacy=await save();assert.equal(legacy.policy,null);root=current;assert.deepEqual(await resume(),legacy);
  await run(()=>__game.world().updateQuestGiver(4));assert.equal((await run(state)).quests.length,1);
  await journal();await shot('legacy-continue');
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify({results,waiting,accepted,refusal,legacy},null,2));
  console.log(JSON.stringify({scenes:results.length,waitingQuests:waiting.quests.length,accepted:accepted.quests.length,refusal,legacyPolicy:legacy.policy}));
  console.log('PASS six native dwells, actual journal buttons, optional Roads detour, stale remote click, narrow cards, waiting/accepted native Continue and real prior-client compatibility');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
