// Controlled shield-coverage QA. Native defense decides hits; canvas records the visible arc.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),before=process.env.HOLLOW_WAKE_QA_BEFORE==='1',label=before?'guard-coverage-before':'guard-coverage';
app.setPath('userData',path.join(dir,label+'-'+process.pid));app.disableHardwareAcceleration();
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
 const timeout=setTimeout(()=>app.exit(1),120000);
 try{
  await win.loadURL('http://127.0.0.1:'+server.address().port);
  const result=await run(async()=>{
   window.requestAnimationFrame=()=>0;await new Promise(r=>setTimeout(r,200));
   __game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world(),p=w.player;
   w.landPartyAt({x:1200,y:-1400});w.actors=[p];p.facing=p.facingPrev=0;
   p.sheet.setSource('coverage-qa',[{stat:'aoeRadius',kind:'override',value:4}]);
   const guard=p.skills.find(s=>s?.def.id==='shield_up'),aim={x:p.pos.x+100,y:p.pos.y};
   if(!w.useSkill(p,guard,aim,true))throw Error('Native guard refused');
   __game.devInput(()=>({dx:0,dy:0,aim,held:[false,true],edge:[]}));__game.step(24);
   const proto=CanvasRenderingContext2D.prototype,arc=proto.arc,stroke=proto.stroke,paths=new WeakMap(),paint=[];
   proto.arc=function(x,y,r,a,b,...rest){paths.set(this,{r,a,b});return arc.call(this,x,y,r,a,b,...rest);};
   proto.stroke=function(...args){const row=paths.get(this);if(row&&this.lineWidth===5&&Math.abs(row.r-(p.radius+9))<.001)paint.push(row);return stroke.apply(this,args);};
   try{__game.step(1);}finally{proto.arc=arc;proto.stroke=stroke;}
   const foe=w.createMonster('plains_wolf',1,'enemy');foe.pos={x:p.pos.x,y:p.pos.y+60};
   foe.aiCooldown=999;w.actors.push(foe);const life=p.life,shield=p.casting.shield;
   const blocked=w.tryGuardBlock(p,foe,foe.pos,10);
   const postShield=p.casting.shield;
   __game.step(1);__game.devInput(null);
   return {paint,blocked,lifeBefore:life,lifeAfter:p.life,shieldBefore:shield,shieldAfter:postShield,
    actualDegrees:guard.def.guard.arcDeg*Math.sqrt(p.sheet.get('aoeRadius')),fatal:__game.crash().fatal};
  });
  assert.equal(result.fatal,null);assert.ok(result.blocked);assert.ok(result.shieldAfter<result.shieldBefore);
  assert.ok(result.paint.length);const degrees=(result.paint.at(-1).b-result.paint.at(-1).a)*180/Math.PI;
  if(before)assert.ok(Math.abs(degrees-result.actualDegrees/2)<.001);
  else assert.ok(Math.abs(degrees-result.actualDegrees)<.001);
  const png=await run(()=>document.getElementById('game').toDataURL('image/png'));
  fs.writeFileSync(path.join(dir,label+'.png'),Buffer.from(png.split(',')[1],'base64'));
  fs.writeFileSync(path.join(dir,label+'-ui.json'),JSON.stringify({...result,paintedDegrees:degrees},null,2));
  console.log(before?'PASS negative control: native defense blocks at 90 degrees, outside the painted 60-degree half-arc':'PASS scaled shield paint covers exactly the native interception arc');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timeout);win.destroy();server.close();app.exit(process.exitCode||0);}
});
