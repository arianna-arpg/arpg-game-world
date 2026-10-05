// Controlled native approach/presentation fixture; not an earned playthrough.
// Both fixed builds must use HOLLOW_WAKE_STORAGE_SCOPE=preview:seamless-world
// and HOLLOW_WAKE_WORLDMASS=1, matching the published preview.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),tag='speech-approach';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const current=path.join(dir,'speech-approach-dist'),prior=path.join(dir,'floor-yield-dist');let root=prior;
 const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');fs.createReadStream(f).pipe(res);
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port+'/?worldmass',win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async(fn,...args)=>{
  const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');
  if(!r.ok)throw Error(r.error);return r.value;
 };
 const boot=async()=>{await win.loadURL(url);await run(async()=>{window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});await new Promise(r=>setTimeout(r,200));});};
 const state=()=>{const w=__game.world();return {seed:w.massRuntime.generator.run.seed,pos:{...w.player.pos},life:w.player.life,items:w.meta.items,ledger:w.ledger,quests:w.activeQuests};};
 const setup=()=>run(async()=>{
  __game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();w.startWorldMass(451);
  if(Object.keys(localStorage).some(k=>k.startsWith('arpg_')))throw Error('Fixture requires the seamless preview storage profile in both builds');
  const a=w.actors.find(a=>a.defId==='townsfolk_innkeep');w.landPartyAt({x:a.pos.x,y:a.pos.y+45},{tier:a.tier});
  for(let i=0;i<24;i++){w.localSeat.lastActedAt=w.time;__game.step(3);await new Promise(r=>setTimeout(r,40));}
 });
 const rows=[];
 const shot=async(name,expect)=>{
  const r=await run(()=>{
   const w=__game.world(),ctx=CanvasRenderingContext2D.prototype,texts=[],old=ctx.fillText;
   const read=()=>JSON.stringify([w.time,w.ledger,w.activeQuests,w.meta.items,w.player.life,w.speechFocusTarget()]);
   const before=read();ctx.fillText=function(t,...a){texts.push(String(t));return old.call(this,t,...a);};
   try{__game.renderer.render(w);}finally{ctx.fillText=old;}
   return {same:before===read(),width:innerWidth,height:innerHeight,canvasWidth:document.getElementById('game').width,canvasHeight:document.getElementById('game').height,hint:texts.includes('Stand still to talk'),pending:w.speechApproachHint?.()?.text??null,
    dialogue:!document.getElementById('npc-dialogue').hidden,position:w.player.pos,camera:__game.renderer.cam,renderHint:__game.renderer.speechApproach?.text,available:__game.renderer.npcDialogueAvailable(),texts,fatal:__game.crash().fatal,canvas:document.getElementById('game').toDataURL()};
  });
  if(r.hint!==expect)console.log(JSON.stringify({name,...r,canvas:undefined}));
  assert.equal(r.fatal,null);assert.equal(r.canvasWidth,r.width);assert.equal(r.canvasHeight,r.height);
  if(expect)assert.ok(r.same,'pending read changed state');
  fs.writeFileSync(path.join(dir,tag+'-'+name+'-canvas.png'),Buffer.from(r.canvas.split(',')[1],'base64'));
  win.webContents.invalidate();await new Promise(r=>setTimeout(r,100));fs.writeFileSync(path.join(dir,tag+'-'+name+'.png'),(await win.webContents.capturePage()).toPNG());
  delete r.canvas;rows.push({name,...r});console.log('CAPTURE '+name);assert.equal(r.hint,expect,name);return r;
 };
 const save=async()=>{await run(async()=>{__game.ui.hideAll();const w=__game.world();w.massRuntime.update(w,true);__game.save();await new Promise(r=>setTimeout(r,250));});return run(state);};
 const resume=async()=>{await boot();await run(async()=>{
  for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
  const b=document.querySelector('#sm-continue:not([disabled])');if(!b)throw Error('No Continue');b.click();__game.ui.hideAll();
 });return run(state);};
 const timer=setTimeout(()=>app.exit(1),240000);
 try{
  await boot();await setup();await shot('prior-approach',false);
  root=current;await boot();await setup();await shot('current-approach',true);
  await run(()=>__game.step(120));const spoken=await shot('current-conversation',false);assert.ok(spoken.dialogue);
  const saved=await save();root=prior;assert.deepEqual(await resume(),saved);await shot('prior-continued',false);
  root=current;assert.deepEqual(await resume(),saved);
  await run(()=>{const w=__game.world();w.localSeat.lastActedAt=w.time;__game.step(1);});
  await shot('current-continued',true);
  win.setContentSize(800,600);await new Promise(r=>setTimeout(r,150));
  await run(()=>{__game.renderer.resize();const w=__game.world();w.localSeat.lastActedAt=w.time;__game.step(1);});
  await shot('narrow-approach',true);
  await run(()=>{const w=__game.world();const a=w.actors.find(a=>a.defId==='townsfolk_innkeep'),s=w.roofedStructureAt(a.pos);w.landPartyAt({x:a.pos.x,y:s.rect.y-35});__game.step(1);});
  await shot('outside-inn',false);
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify({rows,persistence:true},null,2));
  console.log('PASS actual prior/current cue, native dwell conversation, pure pending read, narrow view, roof gate and exact current/prior/current Continue');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
