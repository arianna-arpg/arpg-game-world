// Controlled native-cast QA, not earned leisure play.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),legacy=process.env.HOLLOW_WAKE_QA_LEGACY==='1',tag=legacy?'combo-conditions-before':'combo-conditions';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 let root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/combo-conditions-dist');
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
 const capture=async(name,expected)=>{
  const data=await run(()=>{
   const w=__game.world(),p=w.player,r=__game.renderer,ctx=r.ctx,text=ctx.fillText,texts=[];
   const state=()=>JSON.stringify([w.time,p.castRing,p.comboCondLeft,p.comboCondBits,p.life,p.mana,p.sheet.get('damage')]);
   const before=state();
   ctx.fillText=function(t,x,y,...rest){if(String(t).startsWith('Varied casts')||String(t).startsWith('Repeated casts')){
    const m=ctx.getTransform(),width=Math.min(ctx.measureText(t).width,rest[0]??Infinity);
    texts.push({text:String(t),x:m.a*(x-width/2)+m.e,y:m.d*y+m.f,width:m.a*width});
   }return text.call(this,t,x,y,...rest);};
   try{r.render(w);}finally{ctx.fillText=text;}
   return {texts,unchanged:before===state(),condition:p.sheet.hasCondition('comboVaried'),remaining:p.comboCondLeft,
    damage:p.sheet.get('damage'),sequence:p.castRing?.map(c=>c.sid),fatal:__game.crash().fatal,width:innerWidth,height:innerHeight};
  });
  assert.ok(data.unchanged);assert.equal(data.fatal,null);
  if(!legacy){assert.equal(data.texts.length,1);assert.match(data.texts[0].text,new RegExp(expected));
   for(const row of data.texts)assert.ok(row.x>=0&&row.x+row.width<=data.width&&row.y>0&&row.y<data.height);
  }else assert.equal(data.texts.length,0);
  await shot(name);results.push({name,...data});
 };
 const press=async slot=>run(slot=>{
  const w=__game.world(),p=w.player,seq=p.castSeq,aim={x:p.pos.x+220,y:p.pos.y};
  try{
   let frames=0;
   __game.devInput(()=>({dx:0,dy:0,aim,held:p.skills.map((_,i)=>i===slot),edge:[]}));
   while(p.castSeq===seq&&frames++<150)__game.step(1);
   __game.devInput(()=>({dx:0,dy:0,aim,held:[],edge:[]}));__game.step(48);
  }finally{__game.devInput(null);}
  if(p.castSeq!==seq+1)throw Error('Native cast did not record exactly once: '+slot+' '+seq+' '+p.castSeq+' '+JSON.stringify({skill:p.skills[slot]?.def.id,casting:p.casting&&{skill:p.casting.inst?.def.id,phase:p.casting.phase},mana:p.mana,cd:p.skills[slot]?.cooldown,paused:w.paused,skills:p.skills.map(s=>s?.def.id)}));
  return p.skills[slot].def.name;
 },slot);
 try{
  await win.loadURL(url);await boot();
  const setup=await run(()=>{
   __game.devStartRun('magician');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);
   const m=w.massRuntime,p=w.player;w.landPartyAt(m.journey.local(m.journey.places.find(s=>s.content==='cinderwatch')));
   w.actors=[p];p.invulnerable=true;w.meta.passivePoints=1;
   if(!w.allocateNode('route_int_pursuit_weaver'))throw Error('Native passive allocation refused');
   p.updateTimers(0);
   return {skills:p.skills.filter(Boolean).map(s=>s.def.name),owned:w.meta.allocated.has('route_int_pursuit_weaver')};
  });assert.ok(setup.owned);
  await capture('idle','0/3$');
  await press(0);await capture('one','1/3$');
  await press(1);await capture('two','2/3$');
  await press(2);await capture('active','active');
  assert.ok(results.at(-1).condition&&results.at(-1).remaining>4);
  win.setSize(800,600);await new Promise(r=>setTimeout(r,150));await capture('narrow','active');
  await run(()=>__game.step(361));await capture('expired','0/3$');assert.equal(results.at(-1).condition,false);
  assert.ok(Math.abs(results.find(r=>r.name==='active').damage-results.find(r=>r.name==='idle').damage-.14)<1e-8);
  const saved=await run(()=>{const w=__game.world();return {seed:w.massRuntime.generator.run.seed,pos:{...w.player.pos},allocated:[...w.meta.allocated],skills:w.player.skills.map(s=>s?.def.id)};});
  await run(async()=>{__game.save();await new Promise(r=>setTimeout(r,220));});
  await win.loadURL(url);await boot();await run(async()=>{
   for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
   document.querySelector('#sm-continue:not([disabled])').click();__game.ui.hideAll();
  });
  assert.deepEqual(await run(()=>{const w=__game.world();return {seed:w.massRuntime.generator.run.seed,pos:{...w.player.pos},allocated:[...w.meta.allocated],skills:w.player.skills.map(s=>s?.def.id)};}),saved);
  await capture('continue','0/3$');assert.equal(results.at(-1).condition,false);
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify({setup,results},null,2));
  console.log(JSON.stringify(results.map(r=>({name:r.name,texts:r.texts.map(t=>t.text),condition:r.condition,remaining:r.remaining,unchanged:r.unchanged,fatal:r.fatal}))));
  console.log(legacy?'PASS actual previous client lacks conditional readout despite native bonus':'PASS allocated native passive, three real input casts, actual bonus/expiry, narrow bounded labels, read-only redraw and exact native Continue');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
