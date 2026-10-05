// Native device walking, actual body blits and isolated flat-world captures.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),role=process.env.HOLLOW_WAKE_QA_CLASS||'magician';
const label=process.env.HOLLOW_WAKE_QA_TAG||'walking-'+role;
app.setPath('userData',path.join(dir,label+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/walking-dist');
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
 const input=async(...events)=>{for(const e of events)win.webContents.sendInputEvent(e);await new Promise(r=>setTimeout(r,40));await run(()=>true);};
 const capture=async name=>{
  const r=await run(()=>{
   const w=__game.world(),p=w.player,r=__game.renderer,ctx=r.ctx;
   const state=()=>JSON.stringify([p.pos,p.vel,p.facing,p.bodyWalk,p.casting?.elapsed,p.life,p.mana,w.time]);
   const before=state(),blit=ctx.drawImage,draw=r.drawActor,rows=[];let active=false;
   r.drawActor=function(a,...rest){active=a===p;try{return draw.call(this,a,...rest);}finally{active=false;}};
   ctx.drawImage=function(...args){
    if(active&&args.length===3){
     let id=walkingQA.images.get(args[0]);if(!id){id=++walkingQA.next;walkingQA.images.set(args[0],id);}
     const m=ctx.getTransform();rows.push({id,x:args[1],y:args[2],a:m.a,b:m.b,c:m.c,d:m.d,e:m.e,f:m.f});
    }return blit.apply(this,args);
   };
   try{r.render(w);}finally{r.drawActor=draw;ctx.drawImage=blit;}
   return {rows,preserved:before===state(),pos:{...p.pos},stamp:p.bodyWalk,casting:p.casting?.inst.def.id??null,
    fatal:__game.crash().fatal,png:document.getElementById('game').toDataURL()};
  });
  assert.ok(r.preserved);assert.equal(r.fatal,null);assert.ok(r.rows.length>=3,'two moving limb sprites plus the shared torso; separate action parts are optional');
  fs.writeFileSync(path.join(dir,label+'-'+name+'.png'),Buffer.from(r.png.split(',')[1],'base64'));delete r.png;return r;
 };
 const step=frames=>run(n=>__game.step(n),frames);
 const timer=setTimeout(()=>app.exit(1),180000);
 try{
  await win.loadURL('http://127.0.0.1:'+server.address().port);win.webContents.focus();
  await run(async role=>{
   window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});await new Promise(r=>setTimeout(r,200));
   __game.devStartRun(role);__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);
   const C=w.massRuntime.constructor,c=JSON.parse(JSON.stringify(w.massRuntime.config));
   delete c.settlement;delete c.journey;delete c.progression;delete c.ecology;
   c.terrain.fields=[];c.terrain.places=[];c.content=[];c.populationRadius=0;c.startRadius=0;c.maxPopulation=0;
   c.terrain.surfaces=[{id:'floor',source:'qa/walk-floor',priority:0,when:[],region:'ground',biome:'downs',color:'#454b32'}];
   new C(42,'walk-paint-client',c).attach(w);w.landPartyAt({x:-4000,y:-4000});__game.step(2);
   window.walkingQA={images:new WeakMap(),next:0};
  },role);
  await input({type:'mouseMove',x:950,y:400});
  const idle=await capture('idle');
  await input({type:'keyDown',keyCode:'D'});
  const frames=[];
  for(let i=0;i<8;i++){await step(4);frames.push(await capture('step-'+i));}
  await input({type:'keyUp',keyCode:'D'});await step(14);const settled=await capture('settled');
  assert.ok(frames.at(-1).pos.x-idle.pos.x>40);
  assert.ok(frames.some(f=>Math.abs(f.rows[0].x-idle.rows[0].x)>.5),'actual walking shifts the foot artwork');
  assert.ok(frames.some(f=>Math.abs(f.rows[0].x-f.rows[1].x)>1),'left and right feet alternate');
  for(const f of frames){
   assert.equal(f.rows[0].id,idle.rows[0].id);assert.equal(f.rows[1].id,idle.rows[1].id);
   assert.ok(Math.abs(f.rows[0].x+f.rows[1].x-idle.rows[0].x-idle.rows[1].x)<1e-8,'opposite phases share the travel direction');
  }
  assert.equal(settled.rows[0].x,idle.rows[0].x);assert.equal(settled.rows[1].x,idle.rows[1].x);
  const redraw=await capture('redraw');assert.deepEqual(redraw.rows,settled.rows,'repeated frame is stable');
  await input({type:'mouseDown',button:'left',x:950,y:400,clickCount:1});await step(2);
  await input({type:'keyDown',keyCode:'D'});await step(10);
  const casting=await capture('casting');assert.ok(casting.casting);assert.deepEqual(casting.pos,settled.pos);
  assert.equal(casting.rows[0].x,idle.rows[0].x);assert.equal(casting.rows[1].x,idle.rows[1].x);
  await input({type:'keyUp',keyCode:'D'},{type:'mouseUp',button:'left',x:950,y:400,clickCount:1});
  fs.writeFileSync(path.join(dir,label+'-ui.json'),JSON.stringify({idle,frames,settled,redraw,casting},null,2));
  console.log('PASS '+role+': native device walk moves cached feet in opposite phases; stop, redraw and committed cast retain stable geometry and simulation');
 }catch(e){console.error(e.stack||e);process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
