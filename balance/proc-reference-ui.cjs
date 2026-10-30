const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),tag='proc-reference';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 let root=path.join(dir,'proc-reference-dist');
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
 const setup=async()=>run(()=>{
  __game.devStartRun('magician');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);
  w.meta.items=[{uid:99001,baseId:'helmet_evasion',ilvl:1,tier:1,rarity:'magic',name:'Static-Laced Hood',baseRoll:.5,implicitRolls:[],affixes:[{id:'proc_stormlit',tier:0,rolls:[.5]}],x:0,y:0}];
 });
 const state=()=>{const w=__game.world();return {items:w.meta.items,pos:w.player.pos,life:w.player.life,seed:w.massRuntime.generator.run.seed};};
 const hover=async(detail='compact')=>run(detail=>{
  const w=__game.world(),before=JSON.stringify([w.meta.items,w.player.pos,w.player.life,w.time]);
  __game.settings().tooltipDetail=detail;__game.ui.hideAll();__game.ui.toggleInventory();__game.ui.refreshInventory();
  const inventory=document.getElementById('inventory'),tip=document.getElementById('tooltip');
  const el=inventory.querySelector('[data-tip="item"][data-item-uid="99001"]');if(!el)throw Error('No native bag cell');
  inventory.dispatchEvent(new MouseEvent('mouseout',{bubbles:true}));el.scrollIntoView({block:'nearest'});const r=el.getBoundingClientRect();
  el.dispatchEvent(new MouseEvent('mouseover',{bubbles:true,clientX:r.x+8,clientY:r.y+8}));
  if(tip.classList.contains('hidden'))throw Error('No native tooltip');
  const b=tip.getBoundingClientRect();
  return {text:tip.textContent,reference:tip.querySelector('[data-proc-reference]')?.textContent??null,
    inside:b.x>=0&&b.y>=0&&b.right<=innerWidth+1&&b.bottom<=innerHeight+1,
    pure:before===JSON.stringify([w.meta.items,w.player.pos,w.player.life,w.time]),fatal:__game.crash().fatal};
 },detail);
 const save=async()=>{await run(async()=>{__game.ui.hideAll();__game.save();await new Promise(r=>setTimeout(r,250));});return run(state);};
 const resume=async()=>{await win.loadURL(url);await boot();await run(async()=>{
  for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
  const b=document.querySelector('#sm-continue:not([disabled])');if(!b)throw Error('No native Continue');b.click();__game.ui.hideAll();
 });return run(state);};
 const current=root,timer=setTimeout(()=>app.exit(1),180000),results=[];
 try{
  await win.loadURL(url);await boot();await setup();
  for(const detail of ['compact','full']){
   const h=await hover(detail);assert.ok(h.reference.includes('50% skill damage (radius 80)'));assert.ok(h.inside&&h.pure);assert.equal(h.fatal,null);results.push({name:detail,...h});await shot(detail);
  }
  await run(()=>{__game.world().meta.items[0].affixes=[{id:'proc_radiant_oath',tier:0,rolls:[.5]}];});
  const gated=await hover();assert.ok(gated.reference.includes('Sanctified Strike'));assert.ok(gated.reference.includes('Simultaneous hits'));assert.ok(gated.inside&&gated.pure);await shot('skill-gated');
  await run(()=>{__game.world().meta.items[0].affixes=[{id:'proc_stormlit',tier:0,rolls:[.5]}];});
  win.setSize(800,600);await new Promise(r=>setTimeout(r,150));await run(()=>__game.ui.folioSync());
  const narrow=await hover();assert.ok(narrow.inside&&narrow.pure);await shot('narrow');results.push({name:'narrow',...narrow});
  win.setSize(1280,850);await new Promise(r=>setTimeout(r,150));await run(()=>__game.ui.folioSync());
  const saved=await save();assert.deepEqual(await resume(),saved);assert.ok((await hover()).reference);await shot('continued');
  root=path.join(dir,'puzzle-rewards-dist');assert.deepEqual(await resume(),saved);
  const prior=await hover();assert.equal(prior.reference,null);assert.ok(prior.text.includes('Thunderstruck'));assert.ok(prior.pure);await shot('prior');
  root=current;assert.deepEqual(await resume(),saved);assert.ok((await hover()).reference);await shot('returned');
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify({results,gated,prior,sameSave:true},null,2));
  console.log('PASS actual item hover in compact/full/narrow, skill-gated reference, pure reads, unchanged save through actual previous client and back');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
