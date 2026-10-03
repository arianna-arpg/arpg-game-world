// Actual native country-garrison/cache integration, separate from leisure review.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),legacy=process.env.HOLLOW_WAKE_QA_LEGACY==='1',tag=legacy?'status-readout-before':'status-readout';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 let root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/status-readout-dist');
 const current=root;
 const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');fs.createReadStream(f).pipe(res);
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port,win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async(fn,...args)=>{
  const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');
  if(!r.ok)throw Error(r.error);return r.value;
 };
 const shot=async name=>{
  await run(()=>__game.renderer.render(__game.world()));
  const png=await run(()=>document.getElementById('game').toDataURL());fs.writeFileSync(path.join(dir,tag+'-'+name+'-canvas.png'),Buffer.from(png.split(',')[1],'base64'));
  win.webContents.invalidate();await new Promise(r=>setTimeout(r,100));fs.writeFileSync(path.join(dir,tag+'-'+name+'.png'),(await win.webContents.capturePage()).toPNG());
 };
 const boot=async()=>run(async()=>{
  window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});await new Promise(r=>setTimeout(r,200));
 });


 const timer=setTimeout(()=>app.exit(1),180000),results=[];
 const capture=async name=>{
  const r=await run(()=>{
   const w=__game.world(),p=w.player,r=__game.renderer,ctx=r.ctx,texts=[],fills=[];
   const state=()=>JSON.stringify([w.time,p.life,p.mana,p.statuses]);
   const before=state(),text=ctx.fillText,fill=ctx.fillRect;
   ctx.fillText=function(t,x,y,...rest){
    const m=ctx.getTransform(),width=ctx.measureText(t).width,left=x-(ctx.textAlign==='right'?width:ctx.textAlign==='center'?width/2:0);
    texts.push({text:t,x:left,y,width,screenX:m.a*left+m.e,screenY:m.d*y+m.f,screenWidth:width*m.a});return text.call(this,t,x,y,...rest);
   };
   ctx.fillRect=function(x,y,width,height){if(height===31||height===17)fills.push({x,y,width,height});return fill.call(this,x,y,width,height);};
   try{r.render(w);}finally{ctx.fillText=text;ctx.fillRect=fill;}
   return {texts,fills,unchanged:before===state(),statuses:p.statuses.map(s=>({id:s.id,remaining:s.remaining,stacks:s.stacks})),fatal:__game.crash().fatal,width:innerWidth,height:innerHeight};
  });
  assert.ok(r.unchanged);assert.equal(r.fatal,null);
  const labels=r.texts.filter(t=>/^(Stunned|Poisoned|Burning)/.test(t.text));
  if(name==='clean' || legacy)assert.equal(labels.length,0);
  else{
   assert.ok(labels.length>=1);
   for(const t of labels)assert.ok(t.screenX>=0&&t.screenX+t.screenWidth<=r.width&&t.screenY>0&&t.screenY<r.height);
   assert.ok(r.texts.some(t=>/\ds$/.test(t.text)),'actual timer visible');
   if(name==='active'){
    assert.equal(labels.length,3);assert.ok(r.texts.some(t=>t.text==='+2 other effects'));
    assert.ok(r.texts.some(t=>t.text==='Severe damage over time'));
   }
  }
  await shot(name);results.push({name,...r});
 };
 try{
  await win.loadURL(url);await boot();
  await run(()=>{
   __game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);
   const m=w.massRuntime,place=m.journey.places.find(p=>p.content==='cinderwatch');
   w.landPartyAt(m.journey.local(place));m.update(w,true);w.actors=[w.player];
   const p=w.player;p.invulnerable=false;p.statuses=[];p.life=20;p.es=0;p.ward=0;p.absorb=0;
   for(let i=0;i<3;i++)p.applyStatus('poison',8,1,'Marsh adder');
   p.applyStatus('burn',12,1,'Flame');p.applyStatus('stun',0,1,'Impact');
   p.applyStatus('chill',0,1,'Frost');p.applyStatus('shock',0,1,'Spark');
  });
  await capture('active');
  await run(()=>{__game.world().player.fillResources();__game.step(30);});
  await capture('decayed');
  win.setSize(800,600);await new Promise(r=>setTimeout(r,120));await capture('narrow');
  await run(()=>{const p=__game.world().player;for(const s of [...p.statuses])p.endStatus(s.id);});
  await capture('clean');
  console.log(JSON.stringify(results.map(r=>({name:r.name,statuses:r.statuses,labels:r.texts.filter(t=>/^(Stunned|Poisoned|Burning|Severe|Unable|Damage|\+\d+ other)/.test(t.text)).map(t=>t.text),unchanged:r.unchanged,fatal:r.fatal}))));
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify(results,null,2));
  console.log(legacy?'PASS previous client reproduces unnamed HUD status pips':'PASS actual status names, stacks, severity, native countdown, overflow, narrow display, cleanse and read-only draw');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
