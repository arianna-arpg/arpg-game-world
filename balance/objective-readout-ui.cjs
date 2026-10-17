// Controlled native objective fixtures verify presentation; not earned gameplay.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports'),tag='objective-readout';
app.setPath('userData',path.join(dir,tag+'-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 let root=path.join(dir,'objective-readout-dist');
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
 const current=root,timer=setTimeout(()=>app.exit(1),180000),results=[];
 const inspect=async()=>run(()=>{const w=__game.world(),r=__game.renderer,ctx=r.ctx,fill=ctx.fillText,text=w.objectiveText(),rows=[],before=JSON.stringify([w.player.pos,w.player.life,w.meta.items,w.massRuntime.puzzles.snapshot(w)]);ctx.fillText=function(s,x,y,...rest){if(x===16&&y>=82&&y<220)rows.push({text:String(s),x,y,width:ctx.measureText(s).width});return fill.call(this,s,x,y,...rest);};try{r.render(w);}finally{ctx.fillText=fill;}return {text,rows,uiWidth:r.uiW,pure:before===JSON.stringify([w.player.pos,w.player.life,w.meta.items,w.massRuntime.puzzles.snapshot(w)]),fatal:__game.crash().fatal};});
 const size=async n=>{win.setSize(n,600);await new Promise(r=>setTimeout(r,150));await run(()=>{window.dispatchEvent(new Event('resize'));__game.ui.folioSync();});};
 try{
 for(const prior of [true,false]){root=path.join(dir,prior?'puzzle-calm-dist':'objective-readout-dist');await win.loadURL(url);await boot();await run(()=>{__game.devStartRun('magician');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);const m=w.massRuntime,p=m.journey.places.find(p=>p.content==='paired-stones');w.landPartyAt(m.journey.local(p));m.update(w,true);w.mireilleXpBuff=65;});
 for(const width of prior?[600]:[1280,800,600]){await size(width);const got=await inspect();assert.ok(got.pure);assert.equal(got.fatal,null);const blessing=got.rows.find(r=>r.text.includes('XP blessing'));assert.ok(blessing);if(prior){assert.ok(got.rows.some(r=>r.x+r.width>got.uiWidth-16));}else{assert.ok(got.rows.every(r=>r.x+r.width<=got.uiWidth-16));const objective=got.rows.filter(r=>r.y<blessing.y);assert.equal(objective.map(r=>r.text).join(' '),got.text.replace(/\s+/g,' ').trim());assert.ok(blessing.y>=objective.at(-1).y+17);}await shot((prior?'prior-':'current-')+width);results.push({prior,width,...got});}
 }
 await run(()=>{window.qaObjective=__game.world().objectiveText;__game.world().objectiveText=()=>('🔥長名'.repeat(2000));});const long=await inspect();assert.ok(long.rows.length<=5);assert.ok(long.rows.every(r=>r.x+r.width<=long.uiWidth-16));assert.ok(long.rows.some(r=>r.text.endsWith('…')));await shot('bounded-mod');await run(()=>{__game.world().objectiveText=qaObjective;});
 const saveState=()=>{const w=__game.world();return {items:w.meta.items,pos:w.player.pos,life:w.player.life,seed:w.massRuntime.generator.run.seed,puzzles:w.massRuntime.puzzles.snapshot(w)};};const saved=await run(saveState);await run(async()=>{__game.save();await new Promise(r=>setTimeout(r,250));});
 for(const prior of [false,true,false]){root=path.join(dir,prior?'puzzle-calm-dist':'objective-readout-dist');await win.loadURL(url);await boot();await run(async()=>{for(let i=0;i<80&&!document.querySelector('#sm-continue:not([disabled])');i++)await new Promise(r=>setTimeout(r,100));const b=document.querySelector('#sm-continue:not([disabled])');if(!b)throw Error('No Continue');b.click();__game.ui.hideAll();});assert.deepEqual(await run(saveState),saved);}await shot('returned');
 fs.writeFileSync(path.join(dir,tag+'-ui.json'),JSON.stringify({results,long,sameSave:true},null,2));console.log('PASS actual prior clipped instruction, complete current hints at 1280/800/600, subsequent buff baseline, bounded Unicode mod text, pure draw and exact current/prior/current Continue');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
