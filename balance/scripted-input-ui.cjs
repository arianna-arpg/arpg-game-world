// Controlled QA-input boundary check. No critic or human profile is opened.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');
app.setPath('userData',path.join(dir,'scripted-input-'+process.pid));app.disableHardwareAcceleration();
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
  fs.writeFileSync(path.join(dir,'scripted-input-'+name+'.png'),Buffer.from(png.split(',')[1],'base64'));
 };
 const timer=setTimeout(()=>app.exit(1),120000);
 try{
  await win.loadURL('http://127.0.0.1:'+server.address().port);
  const result=await run(()=>{
   window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
   __game.devStartRun('magician');__game.ui.hideAll();const w=__game.world();
   w.player.invulnerable=true;w.landPartyAt({x:1200,y:-1400});
   const valid={dx:0,dy:0,aim:{x:w.player.pos.x+200,y:w.player.pos.y},held:[],edge:[]};
   const cases=[undefined,{...valid,aim:undefined},{...valid,aim:{x:NaN,y:0}},
    {...valid,dx:Infinity},{...valid,held:['0']},{...valid,edge:null},{...valid,metaEdge:[1]}];
   const refusals=[];
   for(const intent of cases){
    const before={pos:{...w.player.pos},facing:w.player.facing,mana:w.player.mana,shots:w.projectiles.length};
    __game.devInput(()=>intent);let message='';
    try{__game.step(1);}catch(e){message=String(e);}
    const unchanged=before.pos.x===w.player.pos.x&&before.pos.y===w.player.pos.y
     &&before.facing===w.player.facing&&before.mana===w.player.mana&&before.shots===w.projectiles.length;
    // Each failed source automatically stands down; normal device frames recover.
    let recovered=true;try{__game.step(2);}catch(e){recovered=false;}
    refusals.push({message,unchanged,recovered});
   }
   __game.devInput(()=>{throw Error('QA source failed');});let callbackError='';
   try{__game.step(1);}catch(e){callbackError=String(e);}__game.step(2);
   __game.devInput(()=>null);__game.step(2);
   const sparse=[];sparse[3]=false;__game.devInput(()=>({...valid,held:sparse}));__game.step(2);
   __game.devInput(()=>({...valid,held:[true]}));const mana=w.player.mana,shots=w.projectiles.length;__game.step(6);
   const cast=!!w.player.casting||w.player.mana<mana||w.projectiles.length>shots;
   __game.devInput(null);
   return {refusals,callbackError,cast,skill:w.player.casting?.inst.def.id,
    finite:[w.player.pos.x,w.player.pos.y,w.player.facing].every(Number.isFinite),fatal:__game.crash().fatal};
  });
  for(const row of result.refusals){assert.match(row.message,/Invalid scripted input/);assert.ok(row.unchanged&&row.recovered);}
  assert.match(result.callbackError,/QA source failed/);assert.ok(result.cast&&result.finite);assert.equal(result.fatal,null);
  await shot('valid-cast');
  fs.writeFileSync(path.join(dir,'scripted-input-ui.json'),JSON.stringify(result,null,2));
  console.log('PASS seven malformed scripted intents refused before mutation, failed callback released, null/sparse valid input and native cast recover without a fatal');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
