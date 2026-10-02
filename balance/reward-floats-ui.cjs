// Controlled rendering comparison; independent critics use separate fixed builds/profiles.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');fs.mkdirSync(dir,{recursive:true});
app.setPath('userData',path.join(dir,'reward-floats-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/reward-floats-dist');
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
  fs.writeFileSync(path.join(dir,'reward-floats-'+name+'.png'),Buffer.from(png.split(',')[1],'base64'));
 };
 try{
  await win.loadURL('http://127.0.0.1:'+server.address().port);
  await run(()=>{
   window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
   __game.devStartRun('magician');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);
   const site=w.massRuntime.journey.places.find(p=>p.content==='cinderwatch');
   w.landPartyAt(w.massRuntime.journey.local(site));__game.step(2);
   const p=w.player;w.actors=[p];w.texts=[];
   const names=['Coral Ring of the Gambler!','Rough Memory!','Brutal Stalker Garb!','Superior Cowl!','Bastion Boots!'];
   names.forEach((name,i)=>w.text({x:p.pos.x,y:p.pos.y-44},name,i%2?'#b899db':'#80aaff',18,i%2?'drop':'pickup',3));
   const r=__game.renderer,ctx=r.ctx;r.hudMouse={x:-1000,y:-1000};
   window.rewardQA={names,includePickup:true};
   const settings=r.getSettings;
   r.getSettings=()=>{const base=settings?.();return {...base,floatKinds:{...base?.floatKinds,drop:true,pickup:rewardQA.includePickup}};};
   rewardQA.measure=()=>{
    const source=JSON.stringify(w.texts),fill=ctx.fillText,rows=[];
    ctx.fillText=function(text,x,y,...rest){
     if(names.includes(String(text)))rows.push({text:String(text),x:x-ctx.measureText(String(text)).width/2,y:y-18,w:ctx.measureText(String(text)).width,h:18});
     return fill.call(this,text,x,y,...rest);
    };
    try{r.render(w);}finally{ctx.fillText=fill;}
    if(source!==JSON.stringify(w.texts))throw Error('Presentation changed native text values, clocks or positions');
    return rows;
   };
  });
  const rows=await run(()=>rewardQA.measure());
  assert.equal(rows.length,5,'every reward name remains present');
  let overlaps=0;
  for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
   const a=rows[i],b=rows[j];
   if(a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h)overlaps++;
  }
  const legacy=process.env.HOLLOW_WAKE_QA_LEGACY==='1';
  if(legacy)assert.ok(overlaps>0,'prior renderer reproduces overlapping native reward floats');
  else assert.equal(overlaps,0,'whole reward names occupy distinct readable rows');
  assert.deepEqual(await run(()=>rewardQA.measure()),rows,'paused redraw preserves placement');
  await shot(legacy?'legacy-overlap':'separated');
  const curated=await run(()=>{rewardQA.includePickup=false;const rows=rewardQA.measure();rewardQA.includePickup=true;return rows;});
  assert.equal(curated.length,2,'disabling pickup floats retains only the two drop announcements');
  const concealed=await run(()=>{
   const w=__game.world(),p=w.player,a=w.createMonster('skeleton_warrior',1,'enemy');
   a.pos={x:p.pos.x+50,y:p.pos.y};w.actors.push(a);
   for(let i=0;i<10;i++)__game.renderer.render(w);
   return rewardQA.measure();
  });
  assert.equal(concealed.length,0,'reward names still yield to nearby native combat');
  const result={rows,overlaps,curated,concealed,legacy,fatal:await run(()=>__game.crash().fatal)};
  assert.equal(result.fatal,null);
  fs.writeFileSync(path.join(dir,'reward-floats-ui'+(legacy?'-legacy':'')+'.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
  console.log('PASS '+(legacy?'prior reward overlap reproduced':'distinct native reward floats, stable redraw and combat clearance'));
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
}).catch(e=>{console.error(e);app.exit(1);});
