const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');
app.setPath('userData',path.join(dir,'territory-profile-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/territory-dist');
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
 const shot=async(name)=>{
  const png=await run(()=>document.getElementById('game').toDataURL('image/png'));
  fs.writeFileSync(path.join(dir,'territory-'+name+'.png'),Buffer.from(png.split(',')[1],'base64'));
 };
 const timer=setTimeout(()=>app.exit(1),180000);
 try{
  const url='http://127.0.0.1:'+server.address().port;await win.loadURL(url);
  const setup=await run(async()=>{
   window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
   await new Promise(r=>setTimeout(r,200));__game.devStartRun('rogue');__game.ui.hideAll();
   const w=__game.world();w.startWorldMass(42);const C=w.massRuntime.constructor,c=JSON.parse(JSON.stringify(w.massRuntime.config));
   delete c.settlement;delete c.journey;delete c.ecology;delete c.progression;
   c.terrain.fields=[];c.terrain.surfaces=[{id:'plain',source:'test/plain',priority:0,when:[],region:'ground',color:'#424b32',biome:'downs'}];
   c.terrain.places=[{id:'wolves',version:1,content:'wolves',period:900,chance:1,radius:150,jitter:0,priority:1,when:[]}];
   c.content=[{id:'wolves',source:'test/wolves',level:1,count:1,table:[{id:'plains_wolf',weight:1}]}];
   c.populationRadius=950;c.startRadius=0;c.maxPopulation=1;
   new C(42,'territory-client',c).attach(w);
   const foe=w.actors.find(a=>a.defId==='plains_wolf');if(!foe)throw Error('No admitted wolf');
   foe.sheet.setBase('lifeRegen',0);foe.life*=.6;w.player.pos={x:foe.pos.x+125,y:foe.pos.y};w.player.invulnerable=true;
   window.__territoryQA={foe,hero:w.player,home:{...foe.aiAnchor},life:foe.life,seen:[],maxReturnStep:0,loads:0};
   const load=w.loadZone;w.loadZone=function(...args){__territoryQA.loads++;return load.apply(this,args);};
   const inst=w.localSeat.meta.knownSkills.get('backstab');
   w.massRuntime.rewards.earn(w,'test/support','QA support');
   // Mint a compatible support only for testing the existing calm gate, not a playtest reward.
   if(!w.claimExplorationReward('test/support','precision'))throw Error('QA support claim refused');
   return {home:__territoryQA.home,life:foe.life,radius:foe.aiTerritory?.radius,skills:!!inst};
  });
  assert.equal(setup.radius,620);assert.ok(setup.skills);
  await run(()=>{__game.devInput(()=>({dx:1,dy:0,aim:{...__territoryQA.foe.pos},held:[],edge:[]}));});
  const advance=async(n)=>run(n=>{
   const w=__game.world(),q=__territoryQA;
   for(let i=0;i<n;i++){
    const before={...q.foe.pos};__game.step(1);
    if(q.foe.aiPhase==='leash_home'){
     q.seen.push({hero:{...w.player.pos},foe:{...q.foe.pos},life:q.foe.life});
     q.maxReturnStep=Math.max(q.maxReturnStep,Math.hypot(q.foe.pos.x-before.x,q.foe.pos.y-before.y));
    }
   }
   return {hero:{...w.player.pos},foe:{...q.foe.pos},phase:q.foe.aiPhase,refusal:w.swapRefusal(w.localSeat,'socket'),life:q.foe.life};
  },n);
  const pursuing=await advance(100);await shot('pursuit');
  const returning=await advance(170);await shot('returning');
  const escaped=await advance(200);
  await run(()=>__game.devInput(()=>({dx:0,dy:0,aim:{...__territoryQA.foe.pos},held:[],edge:[]})));
  const settled=await advance(400);await shot('escaped');
  const result=await run(()=>{
   const w=__game.world(),q=__territoryQA,inst=w.localSeat.meta.knownSkills.get('backstab');
   const item=w.localSeat.meta.items.find(i=>i.gem?.kind==='support'&&i.gem.supportId==='precision');
   const refused=w.swapRefusal(w.localSeat,'socket');
   const installed=!!item&&w.socketSupport(item.uid,'backstab');
   return {sameHero:w.player===q.hero,sameFoe:w.actors.includes(q.foe),loads:q.loads,seen:q.seen.length,
    first:q.seen[0],maxReturnStep:q.maxReturnStep,life:q.foe.life,originalLife:q.life,
    home:q.home,anchor:q.foe.aiAnchor,refused,installed,sockets:inst.sockets.map(s=>s?.def.id),
    snapshot:w.massRuntime.snapshot(w),fatal:__game.crash().fatal};
  });
  assert.ok(result.sameHero&&result.sameFoe);assert.equal(result.loads,0);assert.ok(result.seen>0);
  assert.equal(result.life,result.originalLife);assert.deepEqual(result.anchor,result.home);
  assert.ok(result.maxReturnStep>0&&result.maxReturnStep<10);assert.equal(result.refused,null);
  assert.ok(result.installed);assert.equal(result.fatal,null);
  await run(async()=>{__game.save();await new Promise(r=>setTimeout(r,250));});
  const saved=result.snapshot;delete result.snapshot;
  await win.loadURL(url);
  await run(async()=>{window.requestAnimationFrame=()=>0;await new Promise(r=>setTimeout(r,200));
   for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
   document.querySelector('#sm-continue:not([disabled])').click();__game.ui.hideAll();});
  const continued=await run(()=>{
   const w=__game.world(),m=w.massRuntime;return {snapshot:m.snapshot(w),
    socket:w.localSeat.meta.knownSkills.get('backstab').sockets.map(s=>s?.def.id),fatal:__game.crash().fatal};
  });
  assert.equal(continued.snapshot.state.run.seed,saved.state.run.seed);
  assert.deepEqual(continued.snapshot.config.territory,saved.config.territory);
  assert.deepEqual(continued.snapshot.enemies,saved.enemies);
  assert.ok(continued.socket.includes('precision'));assert.equal(continued.fatal,null);
  await run(()=>__game.renderer.render(__game.world()));await shot('continued');
  const report={setup,pursuing,returning,escaped,settled,result,continued:{seed:continued.snapshot.state.run.seed,enemies:continued.snapshot.enemies,socket:continued.socket,fatal:continued.fatal}};
  fs.writeFileSync(path.join(dir,'territory-world-ui.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));console.log('PASS native pursuit, physical wounded return, calm support socket and browser Continue');
  clearTimeout(timer);win.destroy();server.close();app.exit(0);
 }catch(e){console.error(e.stack||e);clearTimeout(timer);win.destroy();server.close();app.exit(1);}
});
