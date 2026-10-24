// Native shrine payload presentation, separate from leisure review.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),legacy=process.env.HOLLOW_WAKE_QA_LEGACY==='1',tag=legacy?'buff-readout-before':'buff-readout';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 let root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/buff-readout-dist');
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



 const timer=setTimeout(()=>app.exit(1),220000),results=[];
 const capture=async(name,id,expected=[])=>{
  const data=await run((id)=>{
   const w=__game.world(),r=__game.renderer,ctx=r.ctx;
   const state=()=>JSON.stringify([w.time,w.player.life,w.player.mana,[...w.player.buffs],w.massRuntime.shrines.snapshot()]);
   const before=state(),pips=[],fill=ctx.fillRect;
   ctx.fillRect=function(x,y,width,height){if(width===10&&height===10&&ctx.fillStyle==='#c8a84b'){
    const m=ctx.getTransform();pips.push({x:m.a*(x+5)+m.e,y:m.d*(y+5)+m.f});}
    return fill.call(this,x,y,width,height);
   };
   try{r.render(w);}finally{ctx.fillRect=fill;}
   const index=[...w.player.buffs.keys()].indexOf(id);if(index>=0)r.hudMouse=pips[index];
   const texts=[],text=ctx.fillText;
   ctx.fillText=function(t,x,y,...rest){const m=ctx.getTransform(),width=ctx.measureText(t).width,left=x-(ctx.textAlign==='center'?width/2:ctx.textAlign==='right'?width:0);
    texts.push({text:String(t),font:ctx.font,x:m.a*left+m.e,y:m.d*y+m.f,width:m.a*width});return text.call(this,t,x,y,...rest);};
   try{r.render(w);}finally{ctx.fillText=text;}
   return {texts,unchanged:before===state(),buff:JSON.parse(JSON.stringify(w.player.buffs.get(id)??null)),fatal:__game.crash().fatal,width:innerWidth,height:innerHeight};
  },id);
  assert.ok(data.unchanged);assert.equal(data.fatal,null);
  const rows=data.texts.filter(t=>t.font==='12px Verdana');
  if(!legacy)for(const line of expected)assert.ok(rows.some(r=>r.text===line),'missing '+line);
  else assert.ok(!rows.some(r=>r.text==='Modifiers'));
  if(!legacy&&data.buff)for(const row of rows)assert.ok(row.x>=0&&row.x+row.width<=data.width&&row.y>0&&row.y<data.height,JSON.stringify(row));
  await shot(name);results.push({name,rows,buff:data.buff,unchanged:data.unchanged,fatal:data.fatal});
 };
 try{
  await win.loadURL(url);await boot();
  await run(()=>{__game.devStartRun('magician');__game.ui.hideAll();__game.world().startWorldMass(42);__game.world().player.invulnerable=true;});
  for(const [site,kind,expected] of [
   ['cinderwatch','swiftness',['30% increased Movement Speed','20% increased Attack Speed','20% increased Cast Speed']],
   ['broken-gate','barrage',['+1 Additional Projectiles','25% increased Projectile Speed']],
   ['stoneward','stoneskin',['+70 Armor','20% less Damage Taken']]]){
   const touched=await run((site,kind)=>{
    const w=__game.world(),m=w.massRuntime,p=m.journey.places.find(p=>p.content===site);
    w.player.updateTimers(100);w.landPartyAt(m.journey.local(p));m.update(w,true);
    const s=w.shrines.find(s=>s.massSource&&s.def.id===kind);if(!s)throw Error('No shrine');
    let start;
    for(let i=0;i<16&&!start;i++){
     const a=i/16*Math.PI*2,q={x:s.pos.x+Math.cos(a)*110,y:s.pos.y+Math.sin(a)*110};
     if(Array.from({length:12},(_,n)=>({x:s.pos.x+(q.x-s.pos.x)*n/11,y:s.pos.y+(q.y-s.pos.y)*n/11}))
      .every(q=>w.walk.isWalkable(q.x,q.y)&&!w.pointInSolid(q.x,q.y,w.player.radius)))start=q;
    }
    if(!start)throw Error('No walkable approach');w.landPartyAt(start);
    let frames=0;try{__game.devInput(()=>({dx:s.pos.x-w.player.pos.x,dy:s.pos.y-w.player.pos.y,aim:s.pos,held:[],edge:[]}));
     while(!s.used&&frames++<120)__game.step(1);
    }finally{__game.devInput(null);}
    return {used:s.used,frames,def:s.def};
   },site,kind);
   assert.ok(touched.used&&touched.frames<120);await capture(kind,'shrine_'+kind,['Modifiers',...expected]);
   if(!legacy)assert.equal(results.at(-1).buff.def.label,touched.def.name);
  }
  win.setSize(800,600);await new Promise(r=>setTimeout(r,120));await capture('narrow','shrine_stoneskin',['Modifiers','+70 Armor','20% less Damage Taken']);
  await run(()=>__game.world().player.updateTimers(21));await capture('expired','shrine_stoneskin');assert.equal(results.at(-1).buff,null);
  const state=()=>{const w=__game.world();return {seed:w.massRuntime.generator.run.seed,pos:w.player.pos,shrines:w.massRuntime.shrines.snapshot()};};
  const saved=await run(state);await run(async()=>{__game.save();await new Promise(r=>setTimeout(r,220));});
  await win.loadURL(url);await boot();await run(async()=>{for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));document.querySelector('#sm-continue:not([disabled])').click();__game.ui.hideAll();});
  assert.deepEqual(await run(state),saved);
  assert.equal(await run(()=>__game.world().player.buffs.has('shrine_stoneskin')),false);
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results.map(r=>({name:r.name,rows:r.rows.map(t=>t.text),remaining:r.buff?.remaining,unchanged:r.unchanged,fatal:r.fatal}))));
  console.log(legacy?'PASS previous client reproduces ID-only blessing hover':'PASS three native shrine touches, live modifier wording and clocks, narrow bounds, read-only redraw, native expiry and spent-shrine Continue');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
