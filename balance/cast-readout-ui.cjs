// Controlled casting presentation; independent ordinary-input reviews judge play.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),legacy=process.env.HOLLOW_WAKE_QA_LEGACY==='1',tag=legacy?'cast-readout-before':'cast-readout';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/cast-readout-dist');
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
 const boot=async cls=>run(cls=>{
  __game.devStartRun(cls);__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);
  const m=w.massRuntime,p=m.journey.places.find(p=>p.content==='cinderwatch');
  w.landPartyAt(m.journey.local(p));m.update(w,true);w.actors=[w.player];w.player.invulnerable=true;
  __game.step(2);w.player.fillResources();
 },cls);
 const capture=async(name,expected,slot)=>{
  const r=await run(()=>{
   const w=__game.world(),p=w.player,r=__game.renderer,ctx=r.ctx,texts=[],rims=[],fills=[];
   const state=()=>JSON.stringify([w.time,p.pos,p.life,p.mana,p.casting&&{id:p.casting.inst.def.id,mode:p.casting.mode,elapsed:p.casting.elapsed,total:p.casting.total},w.projectiles.length]);
   const before=state(),text=ctx.fillText,stroke=ctx.strokeRect,fill=ctx.fillRect;
   ctx.fillText=function(t,x,y,...rest){const m=ctx.getTransform();texts.push({text:t,x,y,screenX:m.a*x+m.c*y+m.e,screenY:m.b*x+m.d*y+m.f,width:ctx.measureText(t).width});return text.call(this,t,x,y,...rest);};
   ctx.strokeRect=function(x,y,width,height){if(ctx.strokeStyle==='#f1ecdd'&&ctx.lineWidth===2)rims.push({x,y,width,height});return stroke.call(this,x,y,width,height);};
   ctx.fillRect=function(x,y,width,height){if(height===5||height===6)fills.push({x,y,width,height,color:ctx.fillStyle});return fill.call(this,x,y,width,height);};
   try{r.render(w);}finally{ctx.fillText=text;ctx.strokeRect=stroke;ctx.fillRect=fill;}
   return {texts,rims,fills,same:before===state(),slots:r.hudSlotRects,fatal:__game.crash().fatal,
    cast:p.casting&&{id:p.casting.inst.def.id,elapsed:p.casting.elapsed,total:p.casting.total,mode:p.casting.mode},
    png:document.getElementById('game').toDataURL()};
  });
  assert.ok(r.same);assert.equal(r.fatal,null);
  const names=r.texts.filter(t=>t.text===expected);
  assert.equal(names.length,expected&&!legacy?1:0);
  assert.equal(r.rims.length,slot>=0&&!legacy?1:0);
  if(slot>=0&&!legacy){
   const s=r.slots[slot];assert.equal(r.rims[0].x,s.x-2);assert.equal(r.rims[0].y,s.y-2);
   assert.ok(names[0].width<=104&&names[0].screenX>0&&names[0].screenX<1280&&names[0].screenY>0&&names[0].screenY<850);
   if(r.cast.mode==='cast')assert.ok(r.fills.some(f=>f.height===6&&Math.abs(f.width-104*r.cast.elapsed/r.cast.total)<.01));
  }
  fs.writeFileSync(path.join(dir,tag+'-'+name+'-canvas.png'),Buffer.from(r.png.split(',')[1],'base64'));delete r.png;
  win.webContents.invalidate();await new Promise(r=>setTimeout(r,120));fs.writeFileSync(path.join(dir,tag+'-'+name+'.png'),(await win.webContents.capturePage()).toPNG());
  results.push({name,...r});
 };
 try{
  await win.loadURL('http://127.0.0.1:'+server.address().port);await run(async()=>{
   window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});await new Promise(r=>setTimeout(r,200));
  });
  await boot('magician');
  const start=await run(()=>{
   const w=__game.world(),p=w.player,aim={x:p.pos.x+200,y:p.pos.y};
   const ok=w.useSkill(p,p.skills[0],aim,true);const pos={...p.pos};
   __game.devInput(()=>({dx:1,dy:0,aim,held:[false,false,true],edge:[]}));__game.step(8);
   return {ok,stillFirst:p.casting?.inst===p.skills[0],moved:Math.hypot(p.pos.x-pos.x,p.pos.y-pos.y),name:p.skills[0].def.name};
  });
  assert.ok(start.ok&&start.stillFirst);assert.equal(start.moved,0);
  await capture('casting',start.name,0);
  const release=await run(()=>{
   const w=__game.world(),p=w.player,pos={...p.pos};let frames=0;
   __game.devInput(()=>({dx:1,dy:0,aim:{x:p.pos.x+200,y:p.pos.y},held:[],edge:[]}));
   while(p.casting&&frames++<180)__game.step(1);
   __game.step(8);__game.devInput(null);
   return {frames,moved:Math.hypot(p.pos.x-pos.x,p.pos.y-pos.y),idle:p.casting===null};
  });
  assert.ok(release.frames<180&&release.moved>5&&release.idle);
  await capture('released','',-1);
  const second=await run(()=>{
   const w=__game.world(),p=w.player;p.fillResources();
   const ok=w.useSkill(p,p.skills[2],{x:p.pos.x+200,y:p.pos.y},true);__game.step(4);
   return {ok,id:p.casting?.inst.def.id,name:p.skills[2].def.name};
  });
  assert.ok(second.ok&&second.id==='chain_lightning');
  await capture('switched',second.name,2);
  await boot('warrior');
  const guard=await run(()=>{
   const w=__game.world(),p=w.player,aim={x:p.pos.x+200,y:p.pos.y};
   const ok=w.useSkill(p,p.skills[1],aim,true);
   __game.devInput(()=>({dx:1,dy:0,aim,held:[false,true],edge:[]}));const pos={...p.pos};__game.step(8);__game.devInput(null);
   return {ok,mode:p.casting?.mode,moved:Math.hypot(p.pos.x-pos.x,p.pos.y-pos.y),name:p.skills[1].def.name};
  });
  assert.ok(guard.ok&&guard.mode==='guard'&&guard.moved>0);
  await capture('guard',guard.name,1);
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify({legacy,start,release,second,guard,results},null,2));
  console.log(JSON.stringify({legacy,start,release,second,guard}));
  console.log('PASS actual cast name and owner slot, exact native clock, queued wish stays unlit, real commitment/release/movement, mobile guard and read-only drawing'+(legacy?' (prior-client absence reproduced)':''));
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
