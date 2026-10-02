// Controlled real-client physical opening; disposable storage, native movement.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),legacy=process.env.HOLLOW_WAKE_QA_LEGACY==='1';
app.setPath('userData',path.join(dir,'door-press-profile-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/door-press-dist');
 const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname,f=path.resolve(root,'.'+(p==='/'?'/index.html':p));
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');fs.createReadStream(f).pipe(res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port;
 const win=new BrowserWindow({show:false,width:1280,height:850,webPreferences:{offscreen:true,backgroundThrottling:false}});
 const run=async(fn,...args)=>{
  const r=await win.webContents.executeJavaScript('(async()=>{try{return {ok:true,value:await ('+fn+')('+args.map(a=>JSON.stringify(a)).join(',')+')}}catch(e){return {ok:false,error:e.stack||String(e)}}})()');
  if(!r.ok)throw Error(r.error);return r.value;
 };
 const shot=async(name)=>{const png=await run(()=>document.getElementById('game').toDataURL('image/png'));
  fs.writeFileSync(path.join(dir,name+'.png'),Buffer.from(png.split(',')[1],'base64'));};
 const timer=setTimeout(()=>app.exit(1),90000);
 try{
  await win.loadURL(url);
  const result=await run(async()=>{
   window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
   await new Promise(r=>setTimeout(r,200));
   __game.devStartRun('warrior');__game.ui.hideAll();__game.step(2);
   const w=__game.world(),d=w.doodads.find(d=>d.door?.id.startsWith('waking_house#'));
   if(!d?.door)throw Error('No waking door');
   const start={...w.player.pos},target={x:d.pos.x,y:d.pos.y+100};
   __game.devInput(()=>{const p=__game.world().player.pos;return {dx:target.x-p.x,dy:target.y-p.y,aim:target,held:[],edge:[]};});
   for(let i=0;i<240;i++)__game.step(1);
   __game.devInput(null);
   return {start,door:{...d.pos},id:d.door.id,open:!!d.door.open,pos:{...w.player.pos},invulnerable:w.player.invulnerable,
    seed:w.massRuntime.generator.run.seed,fatal:__game.crash().fatal};
  });
  assert.equal(result.fatal,null);assert.equal(result.invulnerable,false);
  assert.equal(result.open,!legacy);
  await shot(legacy?'door-press-before':'door-press-after');
  if(!legacy){
   assert.ok(result.pos.y>result.door.y+30,'held movement must cross the opened threshold');
   await run(()=>__game.save());
   await win.loadURL(url);
   const continued=await run(async id=>{
    window.requestAnimationFrame=()=>0;await new Promise(r=>setTimeout(r,250));
    document.querySelector('#sm-continue').click();__game.step(3);
    const w=__game.world();return {open:!!w.doodads.find(d=>d.door?.id===id)?.door.open,
     seed:w.massRuntime?.generator.run.seed,pos:{...w.player.pos},fatal:__game.crash().fatal};
   },result.id);
   assert.equal(continued.fatal,null);assert.ok(continued.open);assert.equal(continued.seed,result.seed);
   assert.ok(Math.hypot(continued.pos.x-result.pos.x,continued.pos.y-result.pos.y)<2);
   console.log(JSON.stringify({result,continued}));
  }else console.log(JSON.stringify(result));
  console.log(legacy?'PASS prior client remains shut under continuous walking':'PASS continuous native walking opens and crosses the door; Save/Continue preserves it');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
