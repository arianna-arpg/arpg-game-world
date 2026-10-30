// Prepared native wounded survivor; ordinary pursuit, not an earned playthrough.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),tag='nerve-recovery';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 let root=path.join(dir,'nerve-recovery-dist');
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

 const current=root,timer=setTimeout(()=>app.exit(1),240000),results=[];
 const state=()=>{const w=__game.world(),m=w.massRuntime,enemies=m.snapshot(w).enemies;
  const groups=new Map();for(const e of enemies)if(e.encounterGroup){const id=e.encounterGroup.id;groups.set(id,[...(groups.get(id)||[]),e.id].sort());}
  return {seed:m.generator.run.seed,pos:w.player.pos,life:w.player.life,items:w.meta.items,
  enemies:enemies.map(e=>e.encounterGroup?{...e,encounterGroup:{...e.encounterGroup,id:groups.get(e.encounterGroup.id)}}:e),claims:m.state.snapshot().claims};};
 const save=async()=>{await run(async()=>{__game.save();await new Promise(r=>setTimeout(r,250));});return run(state);};
 const resume=async()=>{await win.loadURL(url);await boot();await run(async()=>{
  for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));
  const b=document.querySelector('#sm-continue:not([disabled])');if(!b)throw Error('No Continue');b.click();__game.ui.hideAll();
 });return run(state);};
 const prepare=async()=>run(()=>{
  __game.devStartRun('magician');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);
  const m=w.massRuntime,p=m.journey.places.find(p=>p.content==='cinderwatch'),q=m.journey.local(p);
  w.landPartyAt(q);m.update(w,true);
  const a=w.actors.find(a=>a.encounterGroup?.recipe==='gnoll_road_foragers'&&a.defId==='gnoll_bonepicker');
  if(!a)throw Error('No native scavenger');
  for(const b of w.actors)if(b.team==='enemy'&&b!==a&&!b.passive){b.dead=true;b.life=0;}
  const target=w.findFreeSpot({x:q.x,y:q.y+520},a.radius);a.pos={...target};a.aiAnchor={...target};a.facing=Math.PI/2;
  const hero=w.findFreeSpot({x:target.x,y:target.y+220},w.player.radius);w.landPartyAt(hero);m.update(w,true);
  if(!w.lineOfSight(a.pos,w.player.pos))throw Error('Prepared participants lack sight');
  a.life=a.maxLife()*.25;
  window.nerveQA={a,casts:[],last:null,trace:[],initialLife:w.player.life};
  return {pos:a.pos,hero:w.player.pos,life:a.life,maxLife:a.maxLife()};
 });
 const advance=async(frames,stopOnCast=false)=>run((frames,stopOnCast)=>{
  const w=__game.world(),s=nerveQA,a=s.a;let stepped=0;
  try{
   __game.devInput(()=>{
    const dx=a.pos.x-w.player.pos.x,dy=a.pos.y-w.player.pos.y,d=Math.hypot(dx,dy),go=d>220;
    return {dx:go?dx/d:0,dy:go?dy/d:0,aim:a.pos,held:[],edge:[]};
   });
   for(let f=0;f<frames;f++){
    __game.step(1);stepped++;
    if(a.aiLastSkill&&a.aiLastSkill.at!==s.last){s.last=a.aiLastSkill.at;s.casts.push({...a.aiLastSkill});}
    if(stopOnCast&&a.casting)break;
   }
  }finally{__game.devInput(null);}
  const out={stepped,time:w.time,casts:s.casts,casting:a.casting?{name:a.casting.inst?.def?.name??'cast'}:null,
   nerve:a.aiNerve,rout:Math.max(0,a.aiMoraleUntil-w.time),broke:a.aiMoraleBroke,life:a.life,
   distance:Math.hypot(a.pos.x-w.player.pos.x,a.pos.y-w.player.pos.y),heroLife:w.player.life,
   sight:w.lineOfSight(a.pos,w.player.pos),fatal:__game.crash().fatal};
  s.trace.push(out);return out;
 },frames,stopOnCast);
 try{
  root=path.join(dir,'forager-commitment-dist');await win.loadURL(url);await boot();
  const oldEntry=await prepare();await advance(120);await shot('prior-panic');
  const old=await advance(300);assert.equal(old.casts.length,0);assert.equal(old.rout,0);assert.ok(old.broke);await shot('prior-cornered');
  root=current;await win.loadURL(url);await boot();const entry=await prepare();
  const panic=await advance(120);assert.equal(panic.casts.length,0);assert.ok(panic.rout>0);await shot('panic');
  const windup=await advance(240,true);assert.ok(windup.casting&&windup.rout===0);await shot('rallied-cast');
  const answer=await advance(150);assert.ok(answer.casts.some(c=>c.id==='hurl_debris'));assert.equal(answer.fatal,null);await shot('answer');
  const wounded=await save();assert.deepEqual(await resume(),wounded);await shot('wounded-continue');
  root=path.join(dir,'forager-commitment-dist');assert.deepEqual(await resume(),wounded);await shot('prior-wounded-continue');
  root=current;assert.deepEqual(await resume(),wounded);await shot('current-again');
  win.setSize(800,600);await new Promise(r=>setTimeout(r,150));await run(()=>__game.ui.folioSync());await shot('narrow');
  results.push({oldEntry,old,entry,panic,windup,answer,currentContinue:true,priorContinue:true});
  fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify(results,null,2));
  console.log('PASS actual prior silent survivor, unchanged native panic, current visible throwing windup/answer and exact wounded current/prior/current Continue');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
