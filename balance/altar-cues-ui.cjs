// Controlled modifier-field visual QA. No critic or human profile is opened.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');
app.setPath('userData',path.join(dir,'altar-cues-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'dist-preview');
 const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');fs.createReadStream(f).pipe(res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async fn=>{
  const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')()}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');
  if(!r.ok)throw Error(r.error);return r.value;
 };
 const shot=async name=>{
  const png=await run(()=>document.querySelector('canvas').toDataURL('image/png'));
  fs.writeFileSync(path.join(dir,'altar-cues-'+name+'.png'),Buffer.from(png.split(',')[1],'base64'));
 };
 const timer=setTimeout(()=>app.exit(1),120000);
 try{
  await win.loadURL('http://127.0.0.1:'+server.address().port);
  const both=await run(()=>{
   window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
   __game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);
   const m=w.massRuntime,p=m.journey.places.find(p=>p.content==='stoneward');
   w.landPartyAt(m.journey.local(p));m.update(w,true);
   const a=w.altars.find(a=>a.def.id==='wrath_altar');if(!a)throw Error('Missing field');
   w.actors=w.actors.filter(a=>a===w.player);w.player.invulnerable=true;
   const foe=w.createMonster('stone_sentinel',4,'enemy');foe.skills=[];w.actors.push(foe);
   w.landPartyAt({x:a.pos.x-65,y:a.pos.y+75});foe.pos={x:a.pos.x+65,y:a.pos.y+75};
   foe.aiAnchor={...foe.pos};foe.facing=foe.facingPrev=Math.PI;
   __game.devInput(()=>({dx:0,dy:0,aim:{...foe.pos},held:[],edge:[]}));__game.step(45);
   window.cueQa={altar:a,foe};
   return {hero:a.affected.has(w.player.id),foe:a.affected.has(foe.id),
    heroDamage:w.player.sheet.get('damage'),foeDamage:foe.sheet.get('damage'),fatal:__game.crash().fatal};
  });
  assert.ok(both.hero&&both.foe);assert.equal(both.fatal,null);await shot('both');
  const outside=await run(()=>{
   const w=__game.world(),{altar:a,foe}=window.cueQa;
   w.landPartyAt({x:a.pos.x-230,y:a.pos.y+75});__game.step(45);
   return {hero:a.affected.has(w.player.id),foe:a.affected.has(foe.id),
    heroDamage:w.player.sheet.get('damage'),foeDamage:foe.sheet.get('damage')};
  });
  assert.ok(!outside.hero&&outside.foe);
  assert.ok(Math.abs(both.heroDamage/outside.heroDamage-1.35)<1e-8);
  assert.equal(both.foeDamage,outside.foeDamage);await shot('hero-outside');
  const neither=await run(()=>{
   const w=__game.world(),{altar:a,foe}=window.cueQa;
   foe.pos={x:a.pos.x-220,y:a.pos.y+5};foe.aiAnchor={...foe.pos};__game.step(3);
   return {hero:a.affected.has(w.player.id),foe:a.affected.has(foe.id),foeDamage:foe.sheet.get('damage'),fatal:__game.crash().fatal};
  });
  assert.ok(!neither.hero&&!neither.foe);assert.equal(neither.fatal,null);
  assert.ok(Math.abs(both.foeDamage/neither.foeDamage-1.35)<1e-8);await shot('both-outside');
  fs.writeFileSync(path.join(dir,'altar-cues-ui.json'),JSON.stringify({both,outside,neither},null,2));
  console.log('PASS actual shared Wrath membership and native damage multiplier enter and leave independently; three canvas states captured');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
