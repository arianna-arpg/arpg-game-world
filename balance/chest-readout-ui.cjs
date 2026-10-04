// Controlled casting presentation; independent ordinary-input reviews judge play.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),legacy=process.env.HOLLOW_WAKE_QA_LEGACY==='1',tag=legacy?'chest-readout-before':'chest-readout';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/chest-readout-dist');
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

 const timer=setTimeout(()=>app.exit(1),180000),results=[];
 const frame=async(name,expected)=>{
  const r=await run(()=>{
   const w=__game.world(),ctx=__game.renderer.ctx,fill=ctx.fillText,texts=[];
   const state=()=>JSON.stringify([w.time,w.player.pos,w.player.life,w.chests,w.drops.length]);
   const before=state();
   ctx.fillText=function(t,x,y,...rest){if(t==='Searching…'||t==='Move closer to search'){
    const m=ctx.getTransform();texts.push({text:t,x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f,width:ctx.measureText(t).width});
   }return fill.call(this,t,x,y,...rest);};
   try{__game.renderer.render(w);}finally{ctx.fillText=fill;}
   return {texts,same:before===state(),width:__game.renderer.canvas.width,height:__game.renderer.canvas.height,
    fatal:__game.crash().fatal,png:document.getElementById('game').toDataURL()};
  });
  assert.equal(r.same,true);assert.equal(r.fatal,null);
  assert.deepEqual(r.texts.map(t=>t.text),expected&&!legacy?[expected]:[]);
  for(const t of r.texts)assert.ok(t.width<=150&&t.x>0&&t.x<r.width&&t.y>0&&t.y<r.height);
  fs.writeFileSync(path.join(dir,tag+'-'+name+'-canvas.png'),Buffer.from(r.png.split(',')[1],'base64'));
  win.webContents.invalidate();await new Promise(r=>setTimeout(r,100));
  fs.writeFileSync(path.join(dir,tag+'-'+name+'.png'),(await win.webContents.capturePage()).toPNG());
  results.push({name,texts:r.texts,unchanged:r.same});
 };
 const step=async(toward,frames)=>run((toward,frames)=>{
  const w=__game.world(),c=w.chests.find(c=>c.rewardSource===window.qaChest.source),d=window.qaChest.dir;
  try{__game.devInput(()=>({dx:d.x*toward,dy:d.y*toward,aim:c.pos,held:[],edge:[]}));__game.step(frames);}finally{__game.devInput(null);}
  return {lock:c.lockTime,opened:c.opened,pos:w.player.pos,drops:w.drops.length};
 },toward,frames);
 try{
  await win.loadURL('http://127.0.0.1:'+server.address().port);
  await run(async()=>{window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});await new Promise(r=>setTimeout(r,200));});
  await run(()=>{
   __game.devStartRun('magician');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);
   const m=w.massRuntime,p=m.journey.places.find(p=>p.content==='cinderwatch');w.landPartyAt(m.journey.local(p));m.update(w,true);
   w.actors=[w.player];w.player.invulnerable=true;
   const c=w.chests.find(c=>c.rewardSource===JSON.stringify([p.id,'cache']));
   const dirs=Array.from({length:8},(_,i)=>({x:Math.cos(i*Math.PI/4),y:Math.sin(i*Math.PI/4)}));
   const d=dirs.find(d=>[50,60,70,80,90,100,110,120,130].every(r=>{
    const x=c.pos.x+d.x*r,y=c.pos.y+d.y*r;
    return w.walk.isWalkable(x,y)&&!w.pointInSolid(x,y,w.player.radius);
   }));if(!d)throw Error('No prepared clear approach');
   w.landPartyAt({x:c.pos.x+d.x*110,y:c.pos.y+d.y*110});m.update(w,true);
   window.qaChest={source:c.rewardSource,dir:d};
   __game.renderer.render(w);const screen=__game.renderer.toScreen(c.pos);__game.renderer.hudMouse=screen;
  });
  await frame('approach','Move closer to search');
  await step(-1,16);const searching=await step(0,60);assert.equal(searching.opened,false);assert.ok(searching.lock<4);
  await frame('searching','Searching…');
  const back=await step(1,18);assert.equal(back.opened,false);
  await frame('backed-away','Move closer to search');
  const recovered=await step(0,30);assert.ok(recovered.lock>back.lock);
  await frame('recovering','Move closer to search');
  win.setSize(800,600);await new Promise(r=>setTimeout(r,150));await run(()=>window.dispatchEvent(new Event('resize')));
  await frame('narrow','Move closer to search');
  win.setSize(1280,850);await new Promise(r=>setTimeout(r,150));await run(()=>window.dispatchEvent(new Event('resize')));
  await step(-1,18);const opened=await step(0,250);assert.equal(opened.opened,true);await frame('opened',null);
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify({results,searching,back,recovered,opened},null,2));
  console.log(JSON.stringify({legacy,scenes:results.length,searching:searching.lock,retreat:back.lock,recovered:recovered.lock,opened:opened.opened}));
  console.log('PASS actual approach/search/retreat/recovery/open input, one bounded visible cue, native timing and draw purity');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
