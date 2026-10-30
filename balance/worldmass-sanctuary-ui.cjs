// Controlled regression of an observed native shop attack, separate from ordinary critic play.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),unsafe=process.env.HOLLOW_WAKE_QA_UNSAFE==='1',label=unsafe?'sanctuary-negative':'sanctuary';
app.setPath('userData',path.join(dir,label+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/sanctuary-dist');
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
   const w=__game.world();w.startWorldMass(42);
   const mass=w.massRuntime,site=mass.journey.local(mass.journey.places[0]);
   w.player.pos={...site};mass.update(w,true);
   const foes=[...mass.natives.values()].filter(a=>!a.passive&&a.skills.some(Boolean)).slice(0,3);
   if(foes.length<2)throw Error('Native opening supplied too few real pursuers');
   const smith=w.actors.find(a=>a.defId==='townsfolk_smith');
   const p=w.player;p.pos=w.findFreeSpot({x:smith.pos.x+30,y:smith.pos.y},p.radius);p.tier=smith.tier;p.invulnerable=false;
   p.sheet.setSource('qa-no-regen',[{stat:'lifeRegen',kind:'override',value:0}]);
   for(const [i,a] of foes.entries()){
    a.pos=w.findFreeSpot({x:p.pos.x+25+i*10,y:p.pos.y+25},a.radius);
    a.tier=p.tier;a.aiTargetId=p.id;a.aiAnchor={...a.pos};a.facing=Math.atan2(p.pos.y-a.pos.y,p.pos.x-a.pos.x);
   }
   window.sanctuaryQA={foes,seed:mass.generator.run.seed};
   __game.ui.showVendor();__game.step(1);
   return {life:p.life,near:w.nearSmith(),safe:w.isSafeAt(p.pos),vendor:__game.ui.vendorOpen,foes:foes.map(a=>a.defId),invulnerable:p.invulnerable};
  });
  assert.ok(before.near&&before.safe&&before.vendor);assert.equal(before.invulnerable,false);await shot('before');
  const after=await run(()=>{
   __game.step(360);const w=__game.world();
   return {life:w.player.life,dead:w.player.dead,safe:w.isSafeAt(w.player.pos),vendor:__game.ui.vendorOpen,
    fatal:__game.crash().fatal,foes:sanctuaryQA.foes.map(a=>({id:a.defId,pos:a.pos,casting:!!a.casting,life:a.life}))};
  });
  await shot('after');assert.equal(after.fatal,null);
  if(unsafe)assert.ok(after.life<before.life,'old candidate must reproduce actual shop damage');
  else{
   assert.equal(after.life,before.life,'live vendor remains safe while real pursuers act');
   assert.ok(!after.dead&&after.vendor&&after.safe);
   const saved=await run(async()=>{__game.save();await new Promise(r=>setTimeout(r,250));return {life:__game.world().player.life,pos:{...__game.world().player.pos},seed:sanctuaryQA.seed};});
   await win.loadURL(url);
   const resumed=await run(async()=>{
    window.requestAnimationFrame=()=>0;
    for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
    document.querySelector('#sm-continue:not([disabled])').click();
    for(let i=0;i<80&&!__game.world().massRuntime;i++)await new Promise(r=>setTimeout(r,100));
    __game.ui.hideAll();__game.ui.showVendor();__game.step(240);const w=__game.world();
    return {life:w.player.life,pos:w.player.pos,safe:w.isSafeAt(w.player.pos),seed:w.massRuntime?.generator.run.seed,vendor:__game.ui.vendorOpen,fatal:__game.crash().fatal};
   });
   assert.equal(resumed.fatal,null);assert.equal(resumed.seed,saved.seed);assert.ok(resumed.safe&&resumed.vendor);
   assert.ok(resumed.life>=saved.life,'Continue cannot reopen the saved shop attack');
   after.saved=saved;after.resumed=resumed;await shot('continued');
  }
  fs.writeFileSync(path.join(dir,label+'-ui.json'),JSON.stringify({before,after},null,2));
  console.log(unsafe?'PASS negative control: ordinary native pursuers damage the unprotected shop':'PASS native shop survives pursuing enemies and Continue without invulnerability');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});