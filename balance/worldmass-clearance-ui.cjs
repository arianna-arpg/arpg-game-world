// Controlled native reward/Continue regression; independent critic play uses no grants or kills.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),unsafe=process.env.HOLLOW_WAKE_QA_UNREWARDED==='1',label=unsafe?'clearance-before':'clearance';
app.setPath('userData',path.join(dir,label+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/clearance-dist');
 const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');fs.createReadStream(f).pipe(res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async(fn,...args)=>{
  const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');
  if(!r.ok)throw Error(r.error);return r.value;
 };
 const shot=async name=>{
  await new Promise(r=>setTimeout(r,100));
  fs.writeFileSync(path.join(dir,label+'-'+name+'.png'),(await win.webContents.capturePage()).toPNG());
  const png=await run(()=>document.getElementById('game').toDataURL('image/png'));
  fs.writeFileSync(path.join(dir,label+'-'+name+'-canvas.png'),Buffer.from(png.split(',')[1],'base64'));
 };
 const timer=setTimeout(()=>app.exit(1),180000),url='http://127.0.0.1:'+server.address().port;
 try{
  await win.loadURL(url);
  const before=await run(()=>{
   window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
   __game.devStartRun('warrior');__game.ui.hideAll();
   const w=__game.world();w.startWorldMass(42);const m=w.massRuntime;
   const place=m.journey.places.find(p=>p.content==='cinderwatch');w.player.pos=m.journey.local(place);m.update(w,true);
   const content=m.config.content.find(c=>c.id===place.content), ids=Array.from({length:content.count},(_,i)=>JSON.stringify([place.id,i]));
   window.clearanceQA={place,ids,content,earned:()=>w.meta.xp+Array.from({length:w.player.level-1},(_,i)=>Math.floor(45*Math.pow(i+1,1.55))).reduce((a,b)=>a+b,0)};
   __game.step(1);return {guards:ids.map(id=>m.natives.get(id)?.defId),level:w.player.level,xp:clearanceQA.earned(),invulnerable:w.player.invulnerable};
  });
  assert.equal(before.invulnerable,false);assert.ok(before.guards.length===2&&before.guards.every(Boolean));await shot('before');
  const after=await run(()=>{
   const w=__game.world(),m=w.massRuntime,q=clearanceQA;
   for(const id of q.ids){const a=m.natives.get(id);if(!a)throw Error('Original native guard missing');w.kill(a,false,w.player);}
   const kills=q.earned();m.update(w,true);const total=q.earned();
   __game.ui.toggleMap();__game.step(1);
   return {kills,total,bonus:total-kills,cleared:m.siteCleared?.(q.place.id)??false,
    level:w.player.level,xp:w.meta.xp,passives:w.meta.passivePoints,map:document.getElementById('world-map').textContent,
    invulnerable:w.player.invulnerable,fatal:__game.crash().fatal};
  });
  assert.equal(after.fatal,null);assert.equal(after.invulnerable,false);await shot('map');
  if(unsafe){assert.equal(after.bonus,0);assert.equal(after.cleared,false);}
  else{
   assert.equal(after.bonus,70);assert.ok(after.cleared&&after.map.includes('Cinderwatch Camp · Lv 1 · Cleared'));
   await run(async()=>{__game.ui.hideAll();__game.save();await new Promise(r=>setTimeout(r,250));});
   await win.loadURL(url);
   const resumed=await run(async()=>{
    window.requestAnimationFrame=()=>0;
    for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
    document.querySelector('#sm-continue:not([disabled])').click();
    for(let i=0;i<80&&!__game.world().massRuntime;i++)await new Promise(r=>setTimeout(r,100));
    __game.ui.hideAll();const w=__game.world(),m=w.massRuntime,place=m.journey.places.find(p=>p.content==='cinderwatch');
    m.update(w,true);__game.ui.toggleMap();__game.step(1);
    return {level:w.player.level,xp:w.meta.xp,passives:w.meta.passivePoints,cleared:m.siteCleared(place.id),
     map:document.getElementById('world-map').textContent,fatal:__game.crash().fatal};
   });
   assert.equal(resumed.fatal,null);
   for(const key of ['level','xp','passives','cleared'])assert.equal(resumed[key],after[key],'Continue preserves '+key+' without paying again');
   assert.ok(resumed.map.includes('Cleared'));after.resumed=resumed;await shot('continued');
  }
  fs.writeFileSync(path.join(dir,label+'-ui.json'),JSON.stringify({before,after},null,2));
  console.log(unsafe?'PASS negative control: landmark kills previously supplied no completion reward':'PASS native landmark completion pays once, updates map and restores exact XP/passive budget through browser Continue');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
