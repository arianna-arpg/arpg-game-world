// Controlled field/render/Continue acceptance. Critic profiles remain separate.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');fs.mkdirSync(dir,{recursive:true});
app.setPath('userData',path.join(dir,'fields-profile-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'../dist-preview'),server=http.createServer((req,res)=>{
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
 const shot=async name=>{win.webContents.invalidate();await new Promise(r=>setTimeout(r,250));fs.writeFileSync(path.join(dir,'worldmass-fields-'+name+'.png'),(await win.webContents.capturePage()).toPNG());};
 const timer=setTimeout(()=>app.exit(1),120000),url='http://127.0.0.1:'+server.address().port;
 try{
  await win.loadURL(url);
  const before=await run(()=>{
   window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
   __game.devStartRun('magician');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);
   const m=w.massRuntime,p=m.journey.places.find(p=>p.content==='memorial-grove');
   w.landPartyAt(m.journey.local(p));m.update(w,true);
   const a=w.altars.find(a=>a.massSource);if(!a)throw Error('No geographic field');
   w.player.invulnerable=true;w.landPartyAt({x:a.pos.x,y:a.pos.y+95});
   for(const e of w.actors)if(e.team==='enemy'){e.aiEnabled=false;e.skills=[];}
   __game.step(3);
   return {source:a.massSource,pos:a.pos,level:a.level,name:a.def.name,count:w.altars.filter(a=>a.massSource).length};
  });assert.equal(before.count,1);await shot('approach');
  const pulse=await run(()=>{
   const w=__game.world(),a=w.altars.find(a=>a.massSource);
   const e=w.createMonster('zombie',1,'enemy');e.aiEnabled=false;e.skills=[];e.pos={x:a.pos.x+45,y:a.pos.y};e.life=10;w.actors.push(e);
   w.player.life=20;a.mendTimer=.04;__game.step(3);
   return {hero:w.player.life,enemy:e.life,flash:w.flashes.some(f=>f.color===a.def.color),fatal:__game.crash().fatal};
  });assert.ok(pulse.hero>20&&pulse.enemy>10&&pulse.flash);assert.equal(pulse.fatal,null);await shot('shared-pulse');
  const saved=await run(async()=>{
   const w=__game.world(),a=w.altars.find(a=>a.massSource);a.mendTimer=.71;__game.save();
   await new Promise(r=>setTimeout(r,250));return w.massRuntime.fields.snapshot();
  });
  await win.loadURL(url);
  const continued=await run(async()=>{
   window.requestAnimationFrame=()=>0;
   for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
   document.querySelector('#sm-continue:not([disabled])').click();
   for(let i=0;i<80&&!__game.world().massRuntime;i++)await new Promise(r=>setTimeout(r,100));
   const w=__game.world();return {fields:w.massRuntime.fields.snapshot(),count:w.altars.filter(a=>a.massSource).length,
    nativeSaved:w.massRuntime.snapshot(w).contents.altars,fatal:__game.crash().fatal};
  });
  assert.equal(continued.fatal,null);assert.equal(continued.count,1);assert.deepEqual(continued.fields,saved);
  assert.ok(!continued.nativeSaved.some(a=>a.pos.x===before.pos.x&&a.pos.y===before.pos.y));
  fs.writeFileSync(path.join(dir,'worldmass-fields-ui.json'),JSON.stringify({before,pulse,saved,continued},null,2));
  console.log('PASS native shared field renderer/pulse and actual saved exact-clock Continue without duplication');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
