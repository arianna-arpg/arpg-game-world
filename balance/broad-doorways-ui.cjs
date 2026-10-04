// Controlled doorway approaches through native movement, not an earned playthrough.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),tag='broad-doorways';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const current=path.resolve(__dirname,'reports','broad-doorways-dist');let root=current;
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
 const start=async()=>{await run(()=>{__game.devStartRun('magician');__game.ui.hideAll();__game.world().startWorldMass(42);});};
 const state=()=>{const w=__game.world(),m=w.massRuntime,d=w.doodads.find(d=>d.door?.id.startsWith('inn#'));
  return {pos:w.player.pos,life:w.player.life,tier:w.player.tier,hash:m.configHash,seed:m.generator.run.seed,
   schema:m.snapshot(w).schema,cells:d.door.cells,open:!!d.door.open,keeper:w.actors.find(a=>a.defId==='townsfolk_innkeep').pos,
   invulnerable:w.player.invulnerable,fatal:__game.crash().fatal};};
 const shot=async name=>{
  const png=await run(()=>{__game.renderer.render(__game.world());return document.getElementById('game').toDataURL();});
  fs.writeFileSync(path.join(dir,tag+'-'+name+'-canvas.png'),Buffer.from(png.split(',')[1],'base64'));
  win.webContents.invalidate();await new Promise(r=>setTimeout(r,100));fs.writeFileSync(path.join(dir,tag+'-'+name+'.png'),(await win.webContents.capturePage()).toPNG());
  const s=await run(state);assert.equal(s.fatal,null);assert.equal(s.invulnerable,false);results.push({name,...s});return s;
 };
 const step=async(dy,n)=>run((dy,n)=>{
  try{__game.devInput(()=>({dx:0,dy,aim:__game.world().player.pos,held:[],edge:[]}));__game.step(n);}
  finally{__game.devInput(null);}return __game.world().doorDwellView();
 },dy,n);
 const save=async()=>{await run(async()=>{__game.ui.hideAll();__game.save();await new Promise(r=>setTimeout(r,250));});return run(state);};
 const resume=async()=>{
  await win.loadURL(url);await boot();await run(async()=>{
   for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
   const b=document.querySelector('#sm-continue:not([disabled])');if(!b)throw Error('Continue absent');b.click();__game.ui.hideAll();
  });return run(state);
 };
 const prepare=()=>{const w=__game.world(),d=w.doodads.find(d=>d.door?.id.startsWith('inn#'));
  w.landPartyAt({x:d.pos.x+18,y:d.pos.y+78});return d.pos;};
 const timer=setTimeout(()=>app.exit(1),240000),results=[];
 try{
  await win.loadURL(url);await boot();await start();
  const waking=await run(()=>{
   const w=__game.world(),d=w.doodads.find(d=>d.door?.id.startsWith('waking_house#')),target={x:d.pos.x,y:d.pos.y+100},start={...w.player.pos};
   try{__game.devInput(()=>({dx:target.x-w.player.pos.x,dy:target.y-w.player.pos.y,aim:target,held:[],edge:[]}));__game.step(240);}
   finally{__game.devInput(null);}
   return {start,door:d.pos,width:d.door.cells.w,open:!!d.door.open,pos:w.player.pos,lesson:w.account.ledger.waking_door_unlatched};
  });
  assert.equal(waking.width,60);assert.ok(waking.open&&waking.pos.y>waking.door.y+30);assert.equal(waking.lesson,1);
  await shot('waking-exit');
  const at=await run(prepare);await step(-1,12);await shot('inn-approach');
  let progress=null;for(let i=0;i<36;i++){progress=await step(-1,1);if(progress?.frac>.15)break;}
  assert.ok(progress?.frac>.15&&progress.frac<1);await shot('inn-opening');
  await step(-1,55);const inside=await shot('inn-inside');assert.ok(inside.open&&inside.pos.y<at.y-25);
  win.setSize(800,600);await new Promise(r=>setTimeout(r,180));await run(()=>window.dispatchEvent(new Event('resize')));await shot('narrow-inside');
  win.setSize(1280,850);await new Promise(r=>setTimeout(r,180));await run(()=>window.dispatchEvent(new Event('resize')));
  const held=await save();assert.deepEqual(await resume(),held);await shot('continued-inside');
  const checkpoint=await run(()=>__game.world().massRuntime.snapshot(__game.world()));assert.equal(checkpoint.schema,6);
  root=path.resolve(__dirname,'reports','quest-choice-dist');await win.loadURL(url);await boot();await start();
  const refusal=await run(s=>{const w=__game.world(),before=w.massRuntime;
   try{w.startWorldMass(s.state.run.seed,s);return {refused:false};}catch(e){return {refused:/Invalid worldmass checkpoint/.test(e.message),same:before===w.massRuntime};}
  },checkpoint);assert.deepEqual(refusal,{refused:true,same:true});
  await start();const oldAt=await run(prepare);await step(-1,120);const old=await shot('prior-edge');
  assert.equal(old.cells.w,30);assert.ok(old.pos.y>oldAt.y);assert.equal(old.open,false);
  const contactSave=await save(),priorContact=await resume();
  assert.deepEqual(priorContact.cells,contactSave.cells);assert.equal(priorContact.open,contactSave.open);
  await step(1,12);const legacy=await save();root=current;assert.deepEqual(await resume(),legacy);await shot('legacy-continue');
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify({results,waking,progress,held,refusal,legacy,contactSave,priorContact},null,2));
  console.log(JSON.stringify({scenes:results.length,wakingExit:true,newWidth:held.cells.w,oldWidth:old.cells.w,currentCrossed:true,priorBlocked:true,refusal}));
  console.log('PASS native waking exit and off-center held inn entry, opening progress, narrow interior, exact open-state Continue and actual prior-client refusal/legacy layout retention');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
