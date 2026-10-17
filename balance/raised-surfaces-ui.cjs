// Actual native renderer checks for raised solid surfaces; disposable QA profile.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'reports');fs.mkdirSync(dir,{recursive:true});
app.setPath('userData',path.join(dir,'raised-profile-'+process.pid));app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const root=path.resolve(__dirname,'..',process.env.HOLLOW_WAKE_QA_DIST||'dist-preview'),server=http.createServer((req,res)=>{
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
 const shot=async name=>{
  // The frozen offscreen compositor can return its previous frame. Capture the
  // game's actual canvas as well; state checks alone cannot verify a picture.
  const png=await run(()=>document.getElementById('game').toDataURL('image/png'));
  fs.writeFileSync(path.join(dir,'raised-surfaces-'+name+'.png'),Buffer.from(png.split(',')[1],'base64'));
 };
 const timer=setTimeout(()=>app.exit(1),120000),url='http://127.0.0.1:'+server.address().port;
 try{

  await win.loadURL(url);
  await run(()=>{
    window.requestAnimationFrame=()=>0;Object.defineProperty(navigator,'getGamepads',{value:()=>[]});
    __game.devStartRun('magician');__game.ui.hideAll();const w=__game.world();w.startWorldMass(42);
    const m=w.massRuntime,p=m.journey.places.find(p=>p.content==='memorial-grove');
    w.landPartyAt(m.journey.local(p));m.update(w,true);
    const d=w.doodads.filter(d=>d.kind==='weathered_statue').sort((a,b)=>
      Math.hypot(a.pos.x-w.player.pos.x,a.pos.y-w.player.pos.y)-Math.hypot(b.pos.x-w.player.pos.x,b.pos.y-w.player.pos.y))[0];
    w.player.invulnerable=true;w.landPartyAt({x:d.pos.x,y:d.pos.y+205});__game.step(3);
    window.stoneQA={d};
    const r=__game.renderer,original=r.drawRaisedDoodads;
    r.drawRaisedDoodads=function(...args){stoneQA.matrix=this.ctx.getTransform();return original.apply(this,args);};
    r.render(w);
    window.stoneSample=()=>{
      const m=stoneQA.matrix,d=stoneQA.d,ctx=r.ctx,half=Math.round(d.radius*.53*m.a);
      const cx=Math.round(m.a*d.pos.x+m.c*d.pos.y+m.e),cy=Math.round(m.b*d.pos.x+m.d*d.pos.y+m.f);
      const bytes=ctx.getImageData(cx-half,cy-half,half*2,half*2).data;
      let sum=0;for(let i=0;i<bytes.length;i+=4)sum+=(bytes[i]+bytes[i+1]+bytes[i+2])/3;
      return sum/(bytes.length/4);
    };
  });
  const native=await run(()=>{
    const w=__game.world(),r=__game.renderer,d=stoneQA.d;
    const state=JSON.stringify(w.actors.map(a=>[a.id,a.pos,a.life,a.casting]));
    const light=stoneSample(),paint=r.drawRaisedDoodads;
    r.drawRaisedDoodads=()=>{};r.render(w);const dark=stoneSample();
    r.drawRaisedDoodads=paint;r.render(w);
    return {light,dark,reveal:r.sightVeil.raisedSurfaceReveal(d),floor:r.sightVeil.occludedAt({x:d.pos.x,y:d.pos.y-90}),
      unchanged:state===JSON.stringify(w.actors.map(a=>[a.id,a.pos,a.life,a.casting])),fatal:__game.crash().fatal};
  });
  assert.equal(native.fatal,null);assert.ok(native.unchanged);
  assert.ok(native.light>native.dark+20,'raised art must be visibly separated from its own shadow');
  assert.ok(native.reveal>.95);assert.ok(native.floor>.8,'far-side ground remains hidden');
  await shot('near');
  const blocked=await run(()=>{
    const w=__game.world(),r=__game.renderer,d=stoneQA.d;
    stoneQA.blocker={kind:'weathered_statue',pos:{x:d.pos.x,y:d.pos.y+100},radius:38,rot:.2};
    w.doodads.push(stoneQA.blocker);r.render(w);
    return {light:stoneSample(),reveal:r.sightVeil.raisedSurfaceReveal(d)};
  });
  assert.ok(blocked.reveal<.2,'a second actual blocker must veil the first');
  assert.ok(blocked.light<native.light*.7,'the covered monument must visibly dim');
  await shot('covered');
  const revealed=await run(()=>{
    const w=__game.world(),r=__game.renderer;w.doodads.splice(w.doodads.indexOf(stoneQA.blocker),1);r.render(w);
    return {light:stoneSample(),reveal:r.sightVeil.raisedSurfaceReveal(stoneQA.d)};
  });
  assert.equal(revealed.reveal,native.reveal);
  assert.ok(Math.abs(revealed.light-native.light)<2,'removing cover must restore the same surface');
  const mutationPreserved=await run(()=>{
    const w=__game.world(),r=__game.renderer,d=stoneQA.d;d.adorn='tentacles';r.render(w);
    return !r.raisedDoodads.some(row=>row.d===d);
  });
  assert.ok(mutationPreserved,'layered mutations keep their complete native composition');
  fs.writeFileSync(path.join(dir,'raised-surfaces-ui.json'),JSON.stringify({native,blocked,revealed,mutationPreserved},null,2));
  console.log('PASS actual raised-stone pixels, other-object concealment, far-side shadow and unchanged combat state');
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
 finally{clearTimeout(timer);win.destroy();server.close();app.exit(process.exitCode||0);}
});
