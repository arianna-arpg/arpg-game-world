// Controlled native chest opening and actual browser Continue.
// This verifies mechanics and pictures, not leisure enjoyment.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),build=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/cache-opening-dist');
app.setPath('userData',path.join(dir,'cache-opening-profile-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 let root=build;
 const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');fs.createReadStream(f).pipe(res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async(fn,...args)=>{
  const result=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');
  if(!result.ok)throw Error(result.error);return result.value;
 };
 const shot=async name=>{
  const png=await run(()=>document.getElementById('game').toDataURL('image/png'));
  fs.writeFileSync(path.join(dir,'cache-opening-'+name+'.png'),Buffer.from(png.split(',')[1],'base64'));
 };

 const timer=setTimeout(()=>app.exit(1),150000);
 try{
  await win.loadURL(url);
  const pressured=await run(()=>{
   window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
   __game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);w.player.invulnerable=true;
   const m=w.massRuntime,p=m.journey.places.find(p=>p.content==='cinderwatch');w.landPartyAt(m.journey.local(p));m.update(w,true);
   const c=w.chests.find(c=>c.rewardSource===JSON.stringify([p.id,'cache']));
   window.__cacheQA={source:c.rewardSource,place:p};w.landPartyAt(c.pos);__game.step(12);
   return {opened:c.opened,remaining:c.lockTime,max:c.maxLock,rate:m.cacheHoldRate(w,c),pos:c.pos};
  });
  assert.ok(!pressured.opened);assert.equal(pressured.rate,1);
  assert.ok(pressured.remaining>pressured.max-.25);await shot('under-pressure');
  const partial=await run(async()=>{
   const w=__game.world(),m=w.massRuntime,q=window.__cacheQA,c=w.chests.find(c=>c.rewardSource===q.source);
   const content=m.config.content.find(c=>c.id===q.place.content);
   for(let i=0;i<content.count;i++){const a=m.natives.get(JSON.stringify([q.place.id,i]));if(a&&!a.dead)w.kill(a,false,w.player);}
   for(const a of w.actors)if(a!==w.player&&!a.dead)a.pos={x:-20000,y:-20000};
   m.update(w,true);c.lockTime=c.maxLock;__game.step(10);__game.save();await new Promise(r=>setTimeout(r,250));
   return {source:c.rewardSource,opened:c.opened,remaining:c.lockTime,max:c.maxLock,rate:m.cacheHoldRate(w,c),
    cleared:m.siteCleared(q.place.id),loot:w.drops.length,policy:content.site.cache.clearedHoldSeconds};
  });
  assert.ok(partial.cleared&&!partial.opened);assert.equal(partial.policy,.35);
  assert.ok(Math.abs(partial.remaining-(partial.max-10*.0167*partial.rate))<.001);await shot('partial');
  await win.loadURL(url);
  const continued=await run(async(source)=>{
   window.requestAnimationFrame=()=>0;
   for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
   document.querySelector('#sm-continue:not([disabled])').click();__game.ui.hideAll();
   const w=__game.world(),m=w.massRuntime,c=w.chests.find(c=>c.rewardSource===source);
   const before={opened:c.opened,remaining:c.lockTime,rate:m.cacheHoldRate(w,c)};
   __game.step(10);const justBefore=c.opened;__game.step(2);
   const opened=c.opened,drops=w.drops.length,rewards=m.rewards.snapshot();__game.step(10);
   return {before,justBefore,opened,drops,afterDrops:w.drops.length,rewards,afterRewards:m.rewards.snapshot(),fatal:__game.crash().fatal};
  },partial.source);
  assert.equal(continued.fatal,null);assert.equal(continued.before.remaining,partial.remaining);
  assert.equal(continued.before.rate,partial.rate);assert.ok(!continued.justBefore&&continued.opened);
  assert.deepEqual(continued.afterRewards,continued.rewards);await shot('opened');
  fs.writeFileSync(path.join(dir,'cache-opening-ui.json'),JSON.stringify({pressured,partial,continued},null,2));
  console.log(JSON.stringify({pressured,partial,continued}));
  console.log('PASS native pressured dwell, earned quiet partial lock, actual browser Continue and native single opening');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
