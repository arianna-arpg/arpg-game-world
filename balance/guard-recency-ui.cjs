// Controlled native-hit QA with an allocated passive; independent critic runs use ordinary earned play.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),before=process.env.HOLLOW_WAKE_QA_BEFORE==='1',label=before?'guard-recency-before':'guard-recency';
app.setPath('userData',path.join(dir,label+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/guard-recency-dist');
 const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');fs.createReadStream(f).pipe(res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async fn=>{
  const result=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')()}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');
  if(!result.ok)throw Error(result.error);return result.value;
 };
 const timeout=setTimeout(()=>app.exit(1),120000);
 try{
  await win.loadURL('http://127.0.0.1:'+server.address().port);
  const result=await run(async()=>{
   window.requestAnimationFrame=()=>0;await new Promise(r=>setTimeout(r,200));
   __game.devStartRun('warrior');__game.ui.hideAll();__game.step(2);
   const w=__game.world(),p=w.player,m=w.massRuntime;
   w.landPartyAt(m.journey.local(m.journey.places.find(s=>s.content==='cinderwatch')));
   w.meta.passivePoints=1;
   if(!w.allocateNode('route_str_pursuit_counter'))throw Error('Native passive allocation refused');
   const foe=w.createMonster('plains_wolf',1,'enemy');foe.pos={x:p.pos.x+60,y:p.pos.y};foe.aiCooldown=999;
   w.actors=[p,foe];p.facing=p.facingPrev=0;
   const guard=p.skills.find(s=>s?.def.id==='shield_up');
   if(!w.useSkill(p,guard,foe.pos,true))throw Error('Native Shield Up refused');
   __game.devInput(()=>({dx:0,dy:0,aim:foe.pos,held:[false,true],edge:[]}));__game.step(24);__game.devInput(null);
   p.updateTimers(0);
   const pre={life:p.life,shield:p.casting.shield,damage:p.sheet.get('damage',new Set(['melee'])),recent:p.recently('block'),facing:p.facing,aim:{...p.casting.aim},aimPos:p.aimPos,foe:{...foe.pos},pos:{...p.pos}};
   w.resolveHit(foe,foe.skills[0],p);
   p.updateTimers(0);
   const post={life:p.life,shield:p.casting?.shield,damage:p.sheet.get('damage',new Set(['melee'])),recent:p.recently('block')};
   __game.devInput(()=>({dx:0,dy:0,aim:foe.pos,held:[false,true],edge:[]}));__game.step(1);__game.devInput(null);
   return {pre,post,owned:w.meta.allocated.has('route_str_pursuit_counter'),points:w.meta.passivePoints,fatal:__game.crash().fatal};
  });
  fs.writeFileSync(path.join(dir,label+'-ui.json'),JSON.stringify(result,null,2));
  assert.equal(result.fatal,null);assert.ok(result.owned);assert.equal(result.points,0);
  assert.equal(result.pre.recent,false);assert.equal(result.post.life,result.pre.life);
  assert.ok(result.post.shield<result.pre.shield);
  if(before){assert.equal(result.post.recent,false);assert.equal(result.post.damage,result.pre.damage);}
  else{assert.ok(result.post.recent);assert.ok(Math.abs(result.post.damage-result.pre.damage-.16)<1e-8);}
  const png=await run(()=>document.getElementById('game').toDataURL('image/png'));
  fs.writeFileSync(path.join(dir,label+'.png'),Buffer.from(png.split(',')[1],'base64'));
  console.log(before?'PASS negative control: active shield absorbs the hit but fails to activate the earned passive':'PASS actual native shield hit activates the allocated counterattack passive without changing its value');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timeout);win.destroy();server.close();app.exit(process.exitCode||0);}
});
