// Controlled rendering comparison; independent critics use separate fixed builds/profiles.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');fs.mkdirSync(dir,{recursive:true});
app.setPath('userData',path.join(dir,'held-priority-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/held-priority-dist');
 const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');fs.createReadStream(f).pipe(res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async(fn,...args)=>{
  const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');
  if(!r.ok)throw Error(r.error);return r.value;
 };
 const timer=setTimeout(()=>app.exit(1),180000);
 const shot=async name=>{
  const png=await run(()=>document.getElementById('game').toDataURL('image/png'));
  fs.writeFileSync(path.join(dir,'held-priority-'+name+'.png'),Buffer.from(png.split(',')[1],'base64'));
 };
 try{
  await win.loadURL('http://127.0.0.1:'+server.address().port);
  await run(()=>{
   window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
   __game.devStartRun('warrior');__game.ui.hideAll();__game.world().startWorldMass(42);
   const w=__game.world();w.actors=[w.player];w.projectiles=[];w.zones=[];__game.step(2);
  });
  win.webContents.focus();
  const input=async(...events)=>{
   for(const event of events)win.webContents.sendInputEvent(event);
   await new Promise(r=>setTimeout(r,40));
   await run(()=>true);
  };
  const step=async frames=>run(n=>{
   __game.step(n);const p=__game.world().player;
   return {skill:p.casting?.inst.def.id??null,elapsed:p.casting?.elapsed??null,
    total:p.casting?.total??null,life:p.life,mana:p.mana};
  },frames);
  await input({type:'mouseMove',x:900,y:400},{type:'mouseDown',button:'left',x:900,y:400,clickCount:1});
  const primary=await step(5);assert.equal(primary.skill,'cleave');
  await input({type:'mouseDown',button:'right',x:900,y:400,clickCount:1});
  const committed=await step(5);
  assert.equal(committed.skill,'cleave');assert.ok(committed.elapsed>primary.elapsed);
  await shot('committed');
  const switched=await step(100);
  const legacy=process.env.HOLLOW_WAKE_QA_LEGACY==='1';
  assert.equal(switched.skill,legacy?'cleave':'shield_up');
  await shot(legacy?'legacy-starved':'new-held-shield');
  await input({type:'mouseUp',button:'right',x:900,y:400,clickCount:1});
  const released=await step(70);assert.equal(released.skill,'cleave');
  await shot('primary-resumed');
  await input({type:'mouseUp',button:'left',x:900,y:400,clickCount:1});
  const idle=await step(70);assert.equal(idle.skill,null);
  const result={primary,committed,switched,released,idle,legacy,fatal:await run(()=>__game.crash().fatal)};
  assert.equal(result.fatal,null);
  fs.writeFileSync(path.join(dir,'held-priority-ui'+(legacy?'-legacy':'')+'.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
  console.log('PASS '+(legacy?'native device input reproduces shield starvation':'native device input keeps current commitment, then raises held shield and restores primary on release'));
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
}).catch(e=>{console.error(e);app.exit(1);});
