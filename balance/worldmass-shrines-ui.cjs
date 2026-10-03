// Controlled native touch/buff and save lifecycle; no ordinary-play verdict is inferred.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');app.setPath('userData',path.join(dir,'worldmass-shrines-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const current=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/worldmass-shrines-dist');let root=current;
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
  const png=await run(()=>document.getElementById('game').toDataURL());fs.writeFileSync(path.join(dir,'worldmass-shrines-'+name+'-canvas.png'),Buffer.from(png.split(',')[1],'base64'));
  win.webContents.invalidate();await new Promise(r=>setTimeout(r,100));fs.writeFileSync(path.join(dir,'worldmass-shrines-'+name+'.png'),(await win.webContents.capturePage()).toPNG());
 };
 const read=()=>{
  const w=__game.world(),m=w.massRuntime;
  return {seed:m.generator.run.seed,pos:{...w.player.pos},shrines:m.shrines?.snapshot()??[],
   config:m.config.content.map(c=>[c.id,c.site?.shrines??null]),
   stands:w.shrines.filter(s=>s.massSource).map(s=>({id:s.massSource,pos:{...s.pos},def:s.def,used:s.used})).sort((a,b)=>a.id.localeCompare(b.id)),
   fatal:__game.crash().fatal};
 };
 const boot=async()=>{await win.loadURL(url);await run(async()=>{
  window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});await new Promise(r=>setTimeout(r,200));
  __game.devStartRun('magician');__game.ui.hideAll();__game.world().startWorldMass(42);__game.world().player.invulnerable=true;
 });};
 const save=async()=>{await run(async()=>{__game.ui.hideAll();__game.save();await new Promise(r=>setTimeout(r,220));});return run(read);};
 const resume=async()=>{await win.loadURL(url);await run(async()=>{
  window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});await new Promise(r=>setTimeout(r,200));
  for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
  const b=document.querySelector('#sm-continue:not([disabled])');if(!b)throw Error('No Continue');b.click();__game.ui.hideAll();
 });return run(read);};
 const timer=setTimeout(()=>app.exit(1),240000),results=[];
 try{
  await boot();
  for(const [site,kind,stat] of [['cinderwatch','swiftness','castSpeed'],['broken-gate','barrage','projectileCount'],['stoneward','stoneskin','armor']]){
   const before=await run((site,kind,stat)=>{
    const w=__game.world(),m=w.massRuntime,p=m.journey.places.find(p=>p.content===site);
    w.player.invulnerable=true;w.player.updateTimers(100);w.landPartyAt(m.journey.local(p));m.update(w,true);
    const s=w.shrines.find(s=>s.massSource&&s.def.id===kind);if(!s)throw Error('Missing placed shrine');
    let start;
    for(let i=0;i<16&&!start;i++){
     const a=i/16*Math.PI*2,point={x:s.pos.x+Math.cos(a)*110,y:s.pos.y+Math.sin(a)*110};
     if(Array.from({length:12},(_,n)=>({x:s.pos.x+(point.x-s.pos.x)*n/11,y:s.pos.y+(point.y-s.pos.y)*n/11}))
      .every(q=>w.walk.isWalkable(q.x,q.y)&&!w.pointInSolid(q.x,q.y,w.player.radius)))start=point;
    }
    if(!start)throw Error('No physical approach');w.landPartyAt(start);__game.step(1);
    return {id:s.massSource,def:s.def,used:s.used,value:w.player.sheet.get(stat),pos:{...s.pos},fatal:__game.crash().fatal};
   },site,kind,stat);
   assert.equal(before.used,false);assert.equal(before.fatal,null);await shot(kind+'-unspent');
   const saved=await save();assert.deepEqual(await resume(),saved);
   const used=await run((id,stat)=>{
    const w=__game.world(),hero=w.player,s=w.shrines.find(s=>s.massSource===id),load=w.loadZone;let frames=0,loads=0;
    w.player.invulnerable=true;w.loadZone=function(...args){loads++;return load.apply(this,args);};
    try{
     __game.devInput(()=>({dx:s.pos.x-w.player.pos.x,dy:s.pos.y-w.player.pos.y,aim:s.pos,held:[],edge:[]}));
     while(!s.used&&frames++<120)__game.step(1);
    }finally{__game.devInput(null);w.loadZone=load;}
    const buff=w.player.buffs.get('shrine_'+s.def.id);
    return {used:s.used,frames,loads,sameHero:w.player===hero,value:w.player.sheet.get(stat),remaining:buff?.remaining,
     duration:s.def.duration,gained:w.texts.some(t=>String(t.text).includes(s.def.name)),fatal:__game.crash().fatal};
   },before.id,stat);
   assert.ok(used.used&&used.sameHero);assert.equal(used.loads,0);assert.ok(used.frames<120);
   assert.ok(used.value>before.value);assert.ok(used.remaining>0&&used.remaining<=used.duration);assert.equal(used.fatal,null);
   await shot(kind+'-consumed');const paid=await save();assert.deepEqual(await resume(),paid);
   const noRefill=await run(id=>{
    const w=__game.world(),s=w.shrines.find(s=>s.massSource===id);w.player.invulnerable=true;
    w.player.updateTimers(s.def.duration+1);__game.step(2);w.massRuntime.update(w,true);
    return {used:s.used,buff:w.player.buffs.has('shrine_'+s.def.id),count:w.shrines.filter(s=>s.massSource===id).length};
   },before.id);
   assert.deepEqual(noRefill,{used:true,buff:false,count:1});results.push({site,kind,stat,before,used,noRefill,pendingContinue:true,usedContinue:true});
  }
  const newer=await run(()=>__game.world().massRuntime.snapshot(__game.world()));
  assert.equal(newer.schema,2);
  root=path.resolve(__dirname,'reports','quest-compass-dist');await win.loadURL(url);
  const refusal=await run(async save=>{
   window.requestAnimationFrame=()=>0;await new Promise(r=>setTimeout(r,200));
   const w=__game.world(),before=w.massRuntime;
   try{w.startWorldMass(save.state.run.seed,save);return {refused:false};}
   catch(e){return {refused:/Invalid worldmass checkpoint/.test(e.message),sameWorld:w.massRuntime===before};}
  },newer);
  assert.deepEqual(refusal,{refused:true,sameWorld:true});results.push({previousClientRefusesNewCheckpoint:true});
  await boot();const legacy=await save();assert.equal(legacy.shrines.length,0);
  root=current;assert.deepEqual(await resume(),legacy);results.push({previousClientContinue:true});
  fs.writeFileSync(path.join(dir,'worldmass-shrines-ui.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results));
  console.log('PASS three native shrine families: actual approach/touch, positive native stats, same hero/zero zone loads, unspent and consumed browser Continue, no second boon and real previous-client omission');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
