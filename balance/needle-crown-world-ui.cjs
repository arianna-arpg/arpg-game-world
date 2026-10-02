// Controlled rendering comparison; independent critics use separate fixed builds/profiles.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');fs.mkdirSync(dir,{recursive:true});
app.setPath('userData',path.join(dir,'needle-crown-world-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'balance/reports/needle-crown-dist');
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
  fs.writeFileSync(path.join(dir,'needle-crown-world-'+name+'.png'),Buffer.from(png.split(',')[1],'base64'));
 };

 try{
  await win.loadURL('http://127.0.0.1:'+server.address().port);
  await run(()=>{
   window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
   __game.devStartRun('warrior');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);
   const m=w.massRuntime,p=m.journey.places.find(p=>p.content==='cinderwatch');w.landPartyAt(m.journey.local(p));
   const h=w.player,origin={...h.pos};w.actors=[h];w.texts=[];w.projectiles=[];w.zones=[];
   for(let y=origin.y-650;y<origin.y+650;y+=30)for(let x=origin.x-750;x<origin.x+750;x+=30)
    m.state.paint({address:m.walk.at(x,y),region:'ground',color:'#303928',cause:'qa/needle-crown'});
   w.doodads=[-1,0,1].map((side,i)=>({kind:'conifer',pos:{x:origin.x+side*230,y:origin.y-180},
    radius:60+i*12,rot:0}));
   w.markDoodadsChanged();
   const r=__game.renderer;window.needleWorldQA={origin,trees:w.doodads};
   for(let i=0;i<70;i++){w.time+=1/60;r.render(w);}
  });
  const closed=await run(()=>{
   const w=__game.world(),r=__game.renderer,original=r.drawCanopies,prototype=CanvasRenderingContext2D.prototype;
   const nativeGradient=prototype.createLinearGradient;
   let inside=false,gradients=0;
   r.drawCanopies=function(...args){inside=true;try{return original.apply(this,args);}finally{inside=false;}};
   prototype.createLinearGradient=function(...args){if(inside)gradients++;return nativeGradient.apply(this,args);};
   const before=JSON.stringify({doodads:w.doodads,life:w.player.life,mana:w.player.mana,pos:w.player.pos});
   try{for(let i=0;i<10;i++)r.render(w);}
   finally{r.drawCanopies=original;prototype.createLinearGradient=nativeGradient;}
   return {gradients,unchanged:before===JSON.stringify({doodads:w.doodads,life:w.player.life,mana:w.player.mana,pos:w.player.pos}),
    fades:needleWorldQA.trees.map(t=>r.canopyFade.get(t)),fatal:__game.crash().fatal};
  });
  assert.ok(closed.unchanged);assert.equal(closed.gradients,0);assert.equal(closed.fatal,null);
  await shot('closed');
  const near=await run(()=>{
   const w=__game.world(),r=__game.renderer,t=needleWorldQA.trees[1];
   w.landPartyAt({x:t.pos.x+42,y:t.pos.y+32});
   for(let i=0;i<70;i++){w.time+=1/60;r.render(w);}
   return {fade:r.canopyFade.get(t),blocked:!!w.pointInSolid(t.pos.x,t.pos.y,16),pos:{...w.player.pos}};
  });
  assert.ok(near.fade<closed.fades[1]-.2);assert.ok(near.blocked);await shot('near');
  const restored=await run(()=>{
   const w=__game.world(),r=__game.renderer;w.landPartyAt(needleWorldQA.origin);
   for(let i=0;i<70;i++){w.time+=1/60;r.render(w);}
   return needleWorldQA.trees.map(t=>r.canopyFade.get(t));
  });
  assert.ok(restored.every((n,i)=>Math.abs(n-closed.fades[i])<.01));
  fs.writeFileSync(path.join(dir,'needle-crown-world-ui.json'),JSON.stringify({closed,near,restored},null,2));
  console.log('PASS native world canopy warm-cache reuse, unchanged scenery/vitals, solid trunks and reversible proximity fade');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
