// Actual town controls with an isolated profile; fixed or prior-build comparison.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),legacy=process.env.HOLLOW_WAKE_QA_LEGACY==='1';
app.setPath('userData',path.join(dir,'graph-work-profile-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/graph-work-dist');
 const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');fs.createReadStream(f).pipe(res);
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async(fn,...args)=>{
  const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');
  if(!r.ok)throw Error(r.error);return r.value;
 };
 const timer=setTimeout(()=>app.exit(1),120000),url='http://127.0.0.1:'+server.address().port;
 const shot=async name=>{
  await run(()=>__game.step(2));win.webContents.invalidate();await new Promise(r=>setTimeout(r,250));
  fs.writeFileSync(path.join(dir,'graph-work-'+(legacy?'prior-':'')+name+'.png'),(await win.webContents.capturePage()).toPNG());
 };
 const board=()=>run(()=>{
  const w=__game.world();__game.ui.hideAll();
  const a=w.stationAnchor('bounty_board');if(!a)throw Error('No actual town board');
  w.player.pos={...a.pos};w.player.tier=a.tier;w.armBountyBoard();__game.ui.showBounties(undefined,'lastlight');
  const p=document.getElementById('bounty-menu'),r=p.getBoundingClientRect();
  return {text:p.textContent,offers:p.querySelectorAll('[data-bounty-accept]').length,countdown:!!p.querySelector('[data-bounty-countdown]'),
   visible:!p.classList.contains('hidden'),bounds:{top:r.top,bottom:r.bottom,height:innerHeight},fatal:__game.crash().fatal};
 });
 try{
  await win.loadURL(url);
  const smith=await run(async()=>{
   window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});await new Promise(r=>setTimeout(r,200));
   __game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();
   w.account.features.add('bounty_board');w.account.features.add('brandt_magic_wares');w.startWorldMass(42);
   w.player.level=100;w.player.invulnerable=true;
   const s=w.actors.find(a=>a.defId==='townsfolk_smith');w.player.pos={...s.pos};w.player.tier=s.tier;
   const before=Object.keys(w.zoneMap).length;w.updateQuestGiver(4);
   return {quests:w.activeQuests.map(q=>q.questId),minted:Object.keys(w.zoneMap).length-before,prompt:w.questGiverPrompt(),vendor:w.nearSmith()};
  });
  console.log(JSON.stringify({smith,legacy}));assert.ok(smith.vendor);
  if(legacy){assert.ok(smith.quests.includes('brandt_hammer'));assert.ok(smith.minted>0);}
  else {assert.equal(smith.quests.length,0);assert.equal(smith.minted,0);assert.match(smith.prompt,/No hunts are posted/);}
  const first=await board();console.log(JSON.stringify({first}));
  assert.ok(first.visible);assert.equal(first.fatal,null);
  if(legacy){assert.ok(first.offers>0);assert.ok(first.countdown);}
  else {assert.equal(first.offers,0);assert.equal(first.countdown,false);assert.match(first.text,/No hunts are posted/);
   assert.ok(!first.text.includes('Choose a bounty'));assert.ok(first.bounds.top>=0&&first.bounds.bottom<=first.bounds.height);}
  await shot('board');
  if(!legacy){
   await run(async()=>{__game.ui.hideAll();__game.save();await new Promise(r=>setTimeout(r,250));});
   await win.loadURL(url);
   await run(async()=>{
    window.requestAnimationFrame=()=>0;
    for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
    document.querySelector('#sm-continue:not([disabled])').click();
    for(let i=0;i<80&&!__game.world().massRuntime;i++)await new Promise(r=>setTimeout(r,100));
    __game.step(2);
   });
   const continued=await board();assert.equal(continued.offers,0);assert.equal(continued.countdown,false);
   assert.match(continued.text,/No hunts are posted/);assert.equal(continued.fatal,null);await shot('continued');
  }
  console.log(legacy?'PASS prior real client reproduces unreachable Brandt acceptance and bounty offers':
   'PASS native Smith still trades, unavailable graph work stays unoffered, real board copy and browser Continue');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
