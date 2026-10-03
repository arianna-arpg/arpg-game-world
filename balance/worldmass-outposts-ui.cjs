// Actual native country-garrison/cache integration, separate from leisure review.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),legacy=process.env.HOLLOW_WAKE_QA_LEGACY==='1',tag=legacy?'outposts-before':'outposts';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 let root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/worldmass-outposts-dist');
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
 const start=kind=>run(kind=>{
  __game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);w.player.invulnerable=true;
  const m=w.massRuntime,span=m.config.terrain.addressSpan;let place;
  for(let ring=1;ring<=10&&!place;ring++)for(let y=-ring;y<=ring&&!place;y++)for(let x=-ring;x<=ring&&!place;x++){
   if(Math.max(Math.abs(x),Math.abs(y))!==ring)continue;
   place=m.placesInCell(m.walk.at(x*span,y*span)).find(p=>p.content===kind);
  }
  if(!place)throw Error('No native country place');
  const center={x:(Number(place.center.cx)-Number(m.origin.cx))*span+place.center.x,y:(Number(place.center.cy)-Number(m.origin.cy))*span+place.center.y};
  w.landPartyAt(center);m.update(w,true);const row=m.config.content.find(c=>c.id===kind);
  const ids=Array.from({length:row.count},(_,i)=>JSON.stringify([place.id,i]));
  const guards=ids.map(id=>m.natives.get(id));if(guards.some(a=>!a))throw Error('Incomplete native admission');
  guards[0].life*=.6;
  return {id:place.id,ids,center,kind,source:JSON.stringify([place.id,'cache'])};
 },kind);
 const stable=q=>run(q=>{
  const w=__game.world(),m=w.massRuntime,c=w.chests.find(c=>c.rewardSource===q.source);
  return {seed:m.generator.run.seed,pos:w.player.pos,level:w.player.level,xp:w.meta.xp,cleared:m.siteCleared(q.id),
   activity:m.siteActivity(q.id),cache:{opened:c.opened,remaining:c.lockTime,max:c.maxLock},
   policy:m.config.content.find(c=>c.id===q.kind).site,
   enemies:q.ids.map(id=>{const a=m.natives.get(id);return a?{id,life:a.life,pos:a.pos}:null})};
 },q);
 const checkpoint=async q=>{
  await run(async()=>{__game.ui.hideAll();__game.save();await new Promise(r=>setTimeout(r,220));});
  const before=await stable(q);await win.loadURL(url);await boot();await run(async()=>{
   for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
   document.querySelector('#sm-continue:not([disabled])').click();__game.ui.hideAll();
  });assert.deepEqual(await stable(q),before);return before;
 };
 const timer=setTimeout(()=>app.exit(1),240000),results=[];
 try{
  await win.loadURL(url);await boot();
  for(const kind of ['wayside-camp','pillaged-ruin']){
   const q=await start(kind);const partial=await checkpoint(q);assert.ok(!partial.cleared&&!partial.cache.opened);await shot(kind+'-guarded');
   const cleared=await run(q=>{
    const w=__game.world(),m=w.massRuntime,c=w.chests.find(c=>c.rewardSource===q.source);
    for(const id of q.ids){const a=m.natives.get(id);if(a&&!a.dead)w.kill(a,false,w.player);}
    const xp=w.grantXp,calls=[];w.grantXp=function(value,...rest){calls.push(value);return xp.call(this,value,...rest);};
    try{m.update(w,true);m.update(w,true);}finally{w.grantXp=xp;}
    w.player.invulnerable=true;w.landPartyAt(c.pos);
    for(const a of w.actors)if(a!==w.player&&!a.dead)a.pos={x:50000,y:50000};
    const foe=w.createMonster('zombie',2,'enemy');foe.pos={x:c.pos.x+70,y:c.pos.y};w.actors.push(foe);
    const pressure=m.cacheHoldRate(w,c);foe.pos.x+=3000;
    return {calls,pressure,quiet:m.cacheHoldRate(w,c),cleared:m.siteCleared(q.id),activity:m.siteActivity(q.id),max:c.maxLock};
   },q);
   assert.equal(cleared.pressure,1);assert.equal(cleared.cleared,!legacy);
   assert.equal(cleared.calls.length,legacy?0:1);assert.equal(cleared.quiet,legacy?1:cleared.max/.35);await shot(kind+'-cleared');
   const walk=await run(q=>{
    const w=__game.world(),m=w.massRuntime,c=w.chests.find(c=>c.rewardSource===q.source),p=w.player;
    const approach=[[-100,0],[100,0],[0,-100],[0,100]].map(([x,y])=>({x:c.pos.x+x,y:c.pos.y+y}))
     .find(pos=>w.walk.isWalkable(pos.x,pos.y)&&!w.pointInSolid(pos.x,pos.y,p.radius)&&w.walk.lineWalkable(pos,c.pos));
    if(!approach)throw Error('No clear native cache approach');
    w.landPartyAt(approach);c.lockTime=c.maxLock;
    const hero=p,load=w.loadZone;let loads=0,frames=0;w.loadZone=function(...args){loads++;return load.apply(this,args);};
    try{__game.devInput(()=>({dx:c.pos.x-w.player.pos.x,dy:c.pos.y-w.player.pos.y,aim:c.pos,held:[],edge:[]}));while(!c.opened&&frames<75){__game.step(1);frames++;}}
    finally{__game.devInput(null);w.loadZone=load;}
    return {opened:c.opened,loads,frames,sameHero:w.player===hero,remaining:c.lockTime,activity:m.siteActivity(q.id),fatal:__game.crash().fatal};
   },q);
   assert.equal(walk.fatal,null);assert.equal(walk.loads,0);assert.ok(walk.sameHero);assert.equal(walk.opened,!legacy);
   if(legacy)await run(q=>{const w=__game.world(),c=w.chests.find(c=>c.rewardSource===q.source);w.landPartyAt(c.pos);__game.step(330);},q);
   const complete=await checkpoint(q);assert.ok(complete.cache.opened);await run(()=>__game.ui.openMapTab('map'));await shot(kind+'-searched');
   results.push({kind,partial:{activity:partial.activity,cache:partial.cache},cleared,walk,complete:{activity:complete.activity,cache:complete.cache}});
  }
  if(!legacy){
   // An actual older descriptor remains authoritative in this newer client.
   root=path.resolve(__dirname,'reports/worldmass-maplabels-dist');await win.loadURL(url);await boot();
   const q=await start('pillaged-ruin');await run(async()=>{__game.save();await new Promise(r=>setTimeout(r,220));});
   const old=await stable(q);assert.equal(old.policy.completion,undefined);
   root=current;await win.loadURL(url);await boot();await run(async()=>{
    for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
    document.querySelector('#sm-continue:not([disabled])').click();__game.ui.hideAll();
   });assert.deepEqual(await stable(q),old);results.push({actualPriorClientContinuesUnchanged:true});
  }
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
  console.log(legacy?'PASS previous country sites lack garrison clearance and retain full cache dwell':'PASS two natural country sites, wounded and searched browser checkpoints, native once-only rewards, pressing foe gate, walked quiet-cache opening and actual older descriptor Continue');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
