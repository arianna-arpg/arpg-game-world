// Controlled native casts and actual canvas paths, separate from independent play.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');
app.setPath('userData',path.join(dir,'melee-read-profile-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/melee-read-dist');
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
 const timer=setTimeout(()=>app.exit(1),120000);
 const capture=async name=>{
  const result=await run(()=>{
   const w=__game.world(),p=w.player,r=__game.renderer,ctx=r.ctx,rows=[];
   const draw=r.drawActor,arc=ctx.arc;let active=false;
   const state=JSON.stringify([p.pos,p.life,p.mana,p.casting?.elapsed,w.time]);
   r.drawActor=function(a,...rest){active=a===p;try{return draw.call(this,a,...rest);}finally{active=false;}};
   ctx.arc=function(...args){if(active)rows.push(args.slice(0,5));return arc.apply(this,args);};
   try{r.render(w);}finally{r.drawActor=draw;ctx.arc=arc;}
   const q=window.meleeReadQA,reach=p.radius+p.skills[0].def.delivery.range;
   return {rows:rows.filter(a=>Math.abs(a[2]-reach)<1e-6&&Math.abs(a[3]+Math.PI/4)<1e-6&&Math.abs(a[4]-Math.PI/4)<1e-6),
    same:state===JSON.stringify([p.pos,p.life,p.mana,p.casting?.elapsed,w.time]),reach,
    enemyLife:q.enemy.life,cues:w.flashes.filter(f=>f.combatCue?.style==='rear_hit').map(f=>({pos:f.pos,life:f.life,max:f.maxLife})),
    png:document.getElementById('game').toDataURL(),fatal:__game.crash().fatal};
  });
  fs.writeFileSync(path.join(dir,'melee-read-'+name+'.png'),Buffer.from(result.png.split(',')[1],'base64'));delete result.png;
  assert.ok(result.same);assert.equal(result.fatal,null);return result;
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
   c.terrain.surfaces=[{id:'floor',priority:0,when:[],region:'ground',biome:'downs',color:'#454b32'}];
   new C(42,'melee-read-client',c).attach(w);w.landPartyAt({x:-4000,y:-4000});w.actors=[w.player];
   const e=w.createMonster('zombie',1,'enemy');e.pos={x:w.player.pos.x+125,y:w.player.pos.y};e.facing=0;e.passive=true;
   w.actors.push(e);window.meleeReadQA={enemy:e,life:e.life};__game.step(2);
   if(!w.useSkill(w.player,w.player.skills[0],{x:w.player.pos.x+250,y:w.player.pos.y}))throw Error('native cast refused');
   __game.step(15);
  });
  const outside=await capture('outside-reach');assert.ok(outside.rows.length);
  await run(()=>{__game.settings().castTelegraphs=false;});const disabled=await capture('disabled');assert.equal(disabled.rows.length,0);
  await run(()=>{__game.settings().castTelegraphs=true;for(let i=0;i<90;i++)__game.step(1);});
  const miss=await capture('miss');assert.equal(miss.enemyLife,outside.enemyLife);assert.equal(miss.cues.length,0);assert.equal(miss.rows.length,0);
  await run(()=>{
   const w=__game.world(),p=w.player,e=window.meleeReadQA.enemy;e.pos={x:p.pos.x+43,y:p.pos.y};e.facing=0;
   if(!w.useSkill(p,p.skills[0],{x:p.pos.x+250,y:p.pos.y}))throw Error('second native cast refused');__game.step(15);
  });
  const inside=await capture('inside-reach');assert.ok(inside.rows.length);
  await run(()=>{const w=__game.world();let i=0;while(w.player.casting&&i++<90)__game.step(1);__game.step(5);});
  const landed=await capture('rear-hit');assert.ok(landed.enemyLife<inside.enemyLife);assert.equal(landed.cues.length,1);
  assert.equal(landed.rows.length,0);assert.ok(landed.cues[0].life>0&&landed.cues[0].life<landed.cues[0].max);
  fs.writeFileSync(path.join(dir,'melee-read-ui.json'),JSON.stringify({outside,disabled,miss,inside,landed},null,2));
  console.log(JSON.stringify({outside,disabled,miss,inside,landed}));
  console.log('PASS actual native preparation footprint, setting opt-out, out-of-range miss, landed rear-hit and expired preparation; render preserves state');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
