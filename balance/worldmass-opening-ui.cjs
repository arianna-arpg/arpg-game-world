// Native fresh-account Begin, vessel dwell and Wake. Separate profile; no account grants.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),ordinary=process.env.HOLLOW_WAKE_QA_ORDINARY==='1',label=ordinary?'opening-ordinary':'opening';
app.setPath('userData',path.join(dir,label+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/opening-dist');
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
 try{
  await win.loadURL('http://127.0.0.1:'+server.address().port);
  const opened=await run(async()=>{
   window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
   await new Promise(r=>setTimeout(r,200));
   document.querySelector('#sm-start').click();__game.step(2);
   const w=__game.world();
   return {scene:w.scene?.def.id??null,worldmass:!!w.massRuntime,classId:w.meta.classDef.id,
    awake:w.scene?.state.apps?.filter(a=>a.rank==='awake').map(a=>a.classId)??[],
    characterSaved:Object.keys(localStorage).some(k=>k.includes('arpg_character_v1'))};
  });
  console.log(JSON.stringify({opened}));
  if(ordinary){assert.equal(opened.scene,'prologue');assert.equal(opened.worldmass,false);}
  else{
   assert.equal(opened.scene,'mu','fresh preview Begin must use native vessel selection');
   assert.equal(opened.worldmass,false);assert.equal(opened.characterSaved,false,'Mu is not a saved expedition');
   assert.ok(opened.awake.length>0&&opened.awake.every(id=>['warrior','magician','rogue'].includes(id)));
   const chosen=await run(()=>{
    const w=__game.world(),apps=w.scene.state.apps.filter(a=>a.rank==='awake');
    const app=apps.find(a=>a.classId!=='warrior')??apps[0],body=w.actors.find(a=>a.id===app.id);
    if(!body)throw Error('Visible vessel body missing');
    const target={...body.pos};
    __game.devInput(()=>{const p=__game.world().player.pos,d=Math.hypot(target.x-p.x,target.y-p.y);
     return {dx:d>45?target.x-p.x:0,dy:d>45?target.y-p.y:0,aim:target,held:[],edge:[]};});
    for(let i=0;i<300&&!document.querySelector('#mu-wake');i++)__game.step(1);
    __game.devInput(null);
    const button=document.querySelector('#mu-wake');
    if(!button)throw Error('Native vessel dwell did not open its card');
    const card=document.getElementById('mu-card').textContent;
    button.click();__game.step(2);
    const live=__game.world();
    return {chosen:app.classId,card,classId:live.meta.classDef.id,worldmass:!!live.massRuntime,
     scene:live.scene?.def.id??null,invulnerable:live.player.invulnerable,
     unlocked:[...live.account.unlockedClasses],seed:live.massRuntime?.generator.run.seed};
   });
   assert.equal(chosen.classId,chosen.chosen);assert.ok(chosen.worldmass);assert.equal(chosen.scene,null);assert.equal(chosen.invulnerable,false);
   assert.deepEqual([...chosen.unlocked].sort(),['magician','rogue','warrior']);
   fs.writeFileSync(path.join(dir,label+'-ui.json'),JSON.stringify({opened,chosen},null,2));
   const png=await run(()=>document.getElementById('game').toDataURL('image/png'));
   fs.writeFileSync(path.join(dir,label+'-woken.png'),Buffer.from(png.split(',')[1],'base64'));
  }
  console.log(ordinary?'PASS ordinary fresh Begin retains its authored prologue':'PASS fresh preview Begin uses native unlocked vessel deal, physical dwell and Wake into a normal vulnerable expedition');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
