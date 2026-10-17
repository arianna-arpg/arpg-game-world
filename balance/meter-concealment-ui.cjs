// Controlled rendering comparison; independent critics use separate fixed builds/profiles.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');fs.mkdirSync(dir,{recursive:true});
app.setPath('userData',path.join(dir,'meter-concealment-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/meter-concealment-dist');
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
 const timer=setTimeout(()=>app.exit(1),180000);
 const shot=async name=>{
  const png=await run(()=>document.getElementById('game').toDataURL('image/png'));
  fs.writeFileSync(path.join(dir,'meter-concealment-'+name+'.png'),Buffer.from(png.split(',')[1],'base64'));
 };
 try{
  await win.loadURL('http://127.0.0.1:'+server.address().port);
  await run(()=>{
   window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
   __game.devStartRun('warrior');__game.ui.hideAll();
   const w=__game.world();w.startWorldMass(42);
   const p=w.massRuntime.journey.places.find(p=>p.content==='cinderwatch');
   w.landPartyAt(w.massRuntime.journey.local(p));__game.step(2);
   const h=w.player,m=w.massRuntime;
   for(let y=h.pos.y-650;y<h.pos.y+650;y+=30)for(let x=h.pos.x-750;x<h.pos.x+750;x+=30)
    m.state.paint({address:m.walk.at(x,y),region:'ground',color:'#242722',cause:'qa/meters'});
   w.doodads=[];w.markDoodadsChanged();w.texts=[];w.projectiles=[];w.zones=[];
   const a=w.createMonster('skeleton_warrior',1,'enemy');
   a.pos={x:h.pos.x+170,y:h.pos.y};a.facing=Math.PI;a.life=a.maxLife()*.55;
   w.actors=[h,a];
   if(!w.useSkill(a,a.skills[0],h.pos)||!a.casting)throw Error('Native enemy cast did not start');
   const r=__game.renderer;r.hudMouse={x:-1000,y:-1000};
   window.meterQA={actor:a};
   meterQA.settle=()=>{for(let i=0;i<70;i++){w.time+=1/60;r.render(w);}};
   meterQA.compare=()=>{
    const snapshot=()=>JSON.stringify(w.actors.map(a=>[a.id,a.pos,a.life,a.mana,a.casting?.elapsed,a.statuses]));
    const state=snapshot(),meters=r.combatMeters,add=meters.add;
    r.render(w);
    const normal=r.ctx.getImageData(0,0,r.canvas.width,r.canvas.height).data;
    meters.add=function(key,...args){if(key!==a)return add.call(this,key,...args);};
    let silent;
    try{r.render(w);silent=r.ctx.getImageData(0,0,r.canvas.width,r.canvas.height).data;}
    finally{meters.add=add;}
    let pixels=0,delta=0;
    for(let i=0;i<normal.length;i+=4){
     const d=Math.abs(normal[i]-silent[i])+Math.abs(normal[i+1]-silent[i+1])+Math.abs(normal[i+2]-silent[i+2]);
     if(d>0){pixels++;delta+=d;}
    }
    r.render(w);
    if(state!==snapshot())throw Error('Rendering changed combat state');
    return {pixels,delta,shade:r.sightVeil.occludedAt(a.pos,a.tier),
      bodyShade:r.sightVeil.actorShade(a,0),labelReveal:r.labelRevealAt(w,a.pos),
      life:a.life,maxLife:a.maxLife(),cast:a.casting?.inst.def.id};
   };
   meterQA.wall=region=>{
    for(let y=h.pos.y-180;y<h.pos.y+180;y+=30)for(let x=h.pos.x+60;x<h.pos.x+120;x+=30)
     m.state.paint({address:m.walk.at(x,y),region,color:region==='wall'?'#343834':'#242722',cause:'qa/cover'});
    meterQA.settle();
   };
   meterQA.settle();
  });
  const visible=await run(()=>meterQA.compare());
  assert.ok(visible.pixels>20 && visible.cast,'wounded visible enemy shows its actual health and native cast');
  await shot('visible');
  await run(()=>meterQA.wall('wall'));
  const hidden=await run(()=>meterQA.compare());
  assert.ok(hidden.shade>.95 && hidden.bodyShade>.999 && hidden.labelReveal===0,'wall actually conceals the body and labels');
  if(process.env.HOLLOW_WAKE_QA_LEGACY==='1')assert.ok(hidden.pixels>0,'prior build reproduces meter pixels behind a fully concealing wall');
  else assert.equal(hidden.pixels,0,'no overhead meter pixels reveal a fully concealed enemy');
  await shot('hidden');
  await run(()=>meterQA.wall('ground'));
  const revealed=await run(()=>meterQA.compare());
  assert.ok(revealed.pixels>20 && revealed.labelReveal>.95,'opening the sightline restores native meters');
  assert.equal(revealed.life,visible.life);assert.equal(revealed.cast,visible.cast);
  await shot('revealed');
  const result={visible,hidden,revealed,legacy:process.env.HOLLOW_WAKE_QA_LEGACY==='1',fatal:await run(()=>__game.crash().fatal)};
  assert.equal(result.fatal,null);
  fs.writeFileSync(path.join(dir,'meter-concealment-ui'+(result.legacy?'-legacy':'')+'.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
  console.log('PASS '+(result.legacy?'prior-build meter leakage reproduced':'native meters visible, fully concealed, then revealed with unchanged vitals/cast'));
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
}).catch(e=>{console.error(e);app.exit(1);});
