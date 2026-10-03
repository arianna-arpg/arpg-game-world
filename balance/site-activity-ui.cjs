// Controlled partial-site HUD and Continue regression; independent critics use ordinary play.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');app.setPath('userData',path.join(dir,'site-activity-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/site-activity-dist');
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
 const timer=setTimeout(()=>app.exit(1),180000),url='http://127.0.0.1:'+server.address().port,results=[];
 const capture=async(name,expected,color)=>{
  const result=await run(()=>{
   const w=__game.world(),m=w.massRuntime,r=__game.renderer,ctx=r.ctx,rows=[];
   const state=()=>JSON.stringify([m.state.snapshot(),m.sites.discovered,w.meta.xp,w.player.life,w.chests.map(c=>[c.rewardSource,c.opened])]),before=state();
   const fill=ctx.fillText;ctx.fillText=function(text,x,y,...rest){if(y===82)rows.push({text,x,y,color:ctx.fillStyle,width:ctx.measureText(text).width});return fill.call(this,text,x,y,...rest);};
   try{r.render(w);}finally{ctx.fillText=fill;}
   return {rows,text:w.objectiveText(),same:before===state(),fatal:__game.crash().fatal,png:document.getElementById('game').toDataURL()};
  });
  assert.equal(result.text,expected);assert.equal(result.fatal,null);assert.ok(result.same);
  assert.ok(result.rows.some(r=>r.text===expected&&r.color===color&&r.x+r.width<600),'native HUD text, color and compact bounds');
  fs.writeFileSync(path.join(dir,'site-activity-'+name+'-canvas.png'),Buffer.from(result.png.split(',')[1],'base64'));delete result.png;
  await new Promise(r=>setTimeout(r,100));fs.writeFileSync(path.join(dir,'site-activity-'+name+'.png'),(await win.webContents.capturePage()).toPNG());
  results.push({name,...result});
 };
 try{
  await win.loadURL(url);
  await run(async()=>{
   window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});await new Promise(r=>setTimeout(r,200));
   __game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);const m=w.massRuntime;
   const p=m.journey.places.find(p=>p.content==='cinderwatch');w.player.pos=m.journey.local(p);m.update(w,true);__game.step(1);
  });
  await capture('arrived','Garrison · 2 remaining · Cache unsearched','#9a96b8');
  await run(()=>{
   const w=__game.world(),m=w.massRuntime,p=m.journey.places.find(p=>p.content==='cinderwatch');
   w.kill(m.natives.get(JSON.stringify([p.id,0])),false,w.player);m.update(w,true);__game.step(1);
  });
  await capture('partial','Garrison · 1 remaining · Cache unsearched','#9a96b8');
  await run(async()=>{__game.save();await new Promise(r=>setTimeout(r,250));});
  await win.loadURL(url);
  await run(async()=>{
   window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
   for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
   document.querySelector('#sm-continue:not([disabled])').click();
   for(let i=0;i<80&&!__game.world().massRuntime;i++)await new Promise(r=>setTimeout(r,100));
   __game.ui.hideAll();__game.step(1);
  });
  await capture('continued','Garrison · 1 remaining · Cache unsearched','#9a96b8');
  await run(()=>{
   const w=__game.world(),m=w.massRuntime,p=m.journey.places.find(p=>p.content==='cinderwatch');
   w.kill(m.natives.get(JSON.stringify([p.id,1])),false,w.player);m.update(w,true);__game.step(1);
  });
  await capture('defeated','Garrison defeated · Cache unsearched','#9a96b8');
  await run(()=>{
   const w=__game.world(),m=w.massRuntime,p=m.journey.places.find(p=>p.content==='cinderwatch');
   w.chests.find(c=>c.rewardSource===JSON.stringify([p.id,'cache'])).opened=true;m.update(w,true);__game.step(1);
  });
  await capture('searched','Garrison defeated · Cache searched','#ffd700');
  const map=await run(()=>{__game.ui.toggleMap();__game.step(1);return document.getElementById('world-map').textContent;});
  assert.ok(map.includes('Cinderwatch Camp · Lv 1 · Garrison defeated · Searched'));
  await run(()=>{__game.ui.hideAll();const w=__game.world();w.player.pos={...w.massRuntime.settlement.spawn};__game.step(1);});
  await capture('town','Sanctuary','#9a96b8');
  fs.writeFileSync(path.join(dir,'site-activity-ui.json'),JSON.stringify(results,null,2));
  console.log('PASS native HUD shows remaining original defenders, partial browser Continue, independent cache state, completed color, unchanged map receipts and town sanctuary; redraw writes nothing');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
