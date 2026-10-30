// Controlled native defender poses in the real client, not a gameplay review.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');app.setPath('userData',path.join(dir,'sentinel-world-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/sentinel-dist');
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
 const timer=setTimeout(()=>app.exit(1),120000),frames=[];
 const capture=async name=>{
  const result=await run(()=>{
   const w=__game.world(),r=__game.renderer,e=sentinelQA.enemy,ctx=r.ctx;
   const state=()=>JSON.stringify([e.pos,e.life,e.mana,e.bodyWalk,e.casting?.elapsed,w.time]),before=state();
   let active=false;const draw=r.drawActor,blit=ctx.drawImage,rows=[];
   r.drawActor=function(a,...args){active=a===e;try{return draw.call(this,a,...args);}finally{active=false;}};
   ctx.drawImage=function(...args){if(active&&args.length===3){const m=ctx.getTransform();rows.push([m.a,m.b,m.c,m.d,m.e,m.f,args[1],args[2]]);}return blit.apply(this,args);};
   try{r.render(w);}finally{r.drawActor=draw;ctx.drawImage=blit;}
   return {same:before===state(),rows,pos:{...e.pos},walk:e.bodyWalk,casting:e.casting?.inst.def.id??null,
    elapsed:e.casting?.elapsed??null,life:e.life,mana:e.mana,fatal:__game.crash().fatal,png:document.getElementById('game').toDataURL()};
  });
  fs.writeFileSync(path.join(dir,'sentinel-'+name+'.png'),Buffer.from(result.png.split(',')[1],'base64'));delete result.png;
  assert.ok(result.same);assert.equal(result.fatal,null);assert.ok(result.rows.length>=5);frames.push({name,...result});return result;
 };
 try{
  await win.loadURL('http://127.0.0.1:'+server.address().port);
  await run(async()=>{
   window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});await new Promise(r=>setTimeout(r,200));
   __game.devStartRun('rogue');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);
   const C=w.massRuntime.constructor,c=JSON.parse(JSON.stringify(w.massRuntime.config));
   delete c.settlement;delete c.journey;delete c.progression;delete c.ecology;
   delete c.terrain.patches;
   c.terrain.fields=[];c.terrain.places=[];c.content=[];c.populationRadius=0;c.startRadius=0;c.maxPopulation=0;
   c.terrain.surfaces=[{id:'floor',source:'qa/sentinel',priority:0,when:[],region:'ground',biome:'downs',color:'#454b32'}];
   new C(42,'sentinel-client',c).attach(w);w.landPartyAt({x:-4000,y:-4000});w.actors=[w.player];w.player.invulnerable=true;
   const e=w.createMonster('stone_sentinel',4,'enemy');e.pos={x:w.player.pos.x+170,y:w.player.pos.y};e.facing=Math.PI;e.fillResources();
   w.actors.push(e);window.sentinelQA={enemy:e};__game.step(2);
  });
  const initial=await capture('approach');
  await run(()=>__game.step(20));const walked=await capture('walking');
  assert.ok(Math.hypot(walked.pos.x-initial.pos.x,walked.pos.y-initial.pos.y)>5,'native defender physically approaches');
  await run(()=>{
   const w=__game.world(),e=sentinelQA.enemy;e.casting=null;e.fillResources();
   e.pos={x:w.player.pos.x+40,y:w.player.pos.y};e.facing=Math.PI;
   const inst=e.skills.find(s=>s.def.id==='heavy_strike');inst.cd=0;
   if(!w.useSkill(e,inst,w.player.pos))throw Error('Native heavy strike refused');
   let i=0;while(e.casting&&e.casting.elapsed/e.casting.total<.7&&i++<120)__game.step(1);
  });
  const windup=await capture('windup');console.log(JSON.stringify({windup}));assert.equal(windup.casting,'heavy_strike');
  assert.ok(Math.abs(windup.rows.at(-3)[0]*windup.rows.at(-2)[1]-windup.rows.at(-3)[1]*windup.rows.at(-2)[0])>.0001,'native preparation rotates the articulated arm relative to its torso');
  await run(()=>{const w=__game.world(),e=sentinelQA.enemy;let i=0;while(e.casting&&i++<120)__game.step(1);});
  const strike=await capture('strike');assert.equal(strike.casting,null);
  const redraw=await capture('redraw');assert.deepEqual(redraw.rows,strike.rows);
  fs.writeFileSync(path.join(dir,'sentinel-world-ui.json'),JSON.stringify(frames,null,2));
  console.log('PASS native defender walking and heavy strike, five articulated sprite layers, stable redraw and unchanged simulation during paint');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
